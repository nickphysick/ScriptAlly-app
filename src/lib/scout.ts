/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * scout — the pure derivations behind Discover v1 (the Scout's page). Ref: design-refs/discover-v1/discover-v1.html.
 *
 * Everything the page states comes from here, from three stored things and the catalogue:
 *   · the community catalogue (`communityAgents`, read by every signed-in writer);
 *   · the writer's decisions, `users/{uid}/scoutDecisions/{communityAgentId}` — "added" or "passed";
 *   · the writer's share echoes, `users/{uid}/scoutShares/{sourceAgentId}` (the submissions themselves are
 *     admin-read only, so the echo is the writer's own record of what they sent).
 *
 * ⚠️ A PICK IS A FACT, NEVER A VERDICT. The queue holds verified agents whose genres take the book, ordered by the
 *    writer's chosen lens through `rankEntries`; the reasons name the genre, the wish-list words the shared scorer
 *    matched, and the community signals as counts. No rank word, no score shown.
 * ⚠️ A GENRE FIT IS ENOUGH TO BE PICKED. `buildDiscoverEntries` keeps only scores at or over MATCH_THRESHOLD (42/75),
 *    which a genre-and-age match alone (35) can never reach — so it would leave out every agent the mock describes as
 *    "a genre fit only, so it's a possible rather than a strong one". The queue scores every genre fit instead and
 *    lets the engine's own band say strong or possible.
 * ⚠️ "VERIFIED" IS `lastVerifiedDate` PRESENT AND PARSEABLE — the only verification field the record carries.
 */
import { Agent, CommunityAgent, Manuscript, SubmissionStatus } from "../types";
import { calculateCommunityAgentMatch, totalScore } from "./communityMatch";
import { DiscoverEntry, DiscoverLens, LENS_META, displayTerms, fitTier, isUkIreland, rankEntries } from "./discoverAgents";
import { bookGenreHit, bookGenres, takesBook } from "./genreMatch";
import { agencyKey, nameCompatible } from "./smartImportReviewModel";

export const DAY_MS = 86_400_000;
/** "Not for me" hides an agent for a year. */
export const PASS_DAYS = 365;

/* ── Stored shapes ───────────────────────────────────────────────────────── */

export type ScoutDecisionKind = "added" | "passed";
export interface ScoutDecision {
  /** the community agent's id (the document's id) */
  id: string;
  decision: ScoutDecisionKind;
  at: string;
  manuscriptId: string;
  /** "passed" only: at + 365 days */
  until?: string;
}

export interface DiscoverPrefs {
  lens: DiscoverLens;
  openOnly: boolean;
  notOnList: boolean;
  ukIreland: boolean;
}
export const DISCOVER_PREFS_DEFAULT: DiscoverPrefs = { lens: "best", openOnly: true, notOnList: true, ukIreland: false };

const LENSES = Object.keys(LENS_META) as DiscoverLens[];

/** The stored map read leniently: anything unknown or mistyped reads as its default. */
export function discoverPrefs(raw: unknown): DiscoverPrefs {
  const s = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const b = (k: keyof DiscoverPrefs, d: boolean) => (typeof s[k] === "boolean" ? (s[k] as boolean) : d);
  return {
    lens: LENSES.includes(s.lens as DiscoverLens) ? (s.lens as DiscoverLens) : DISCOVER_PREFS_DEFAULT.lens,
    openOnly: b("openOnly", DISCOVER_PREFS_DEFAULT.openOnly),
    notOnList: b("notOnList", DISCOVER_PREFS_DEFAULT.notOnList),
    ukIreland: b("ukIreland", DISCOVER_PREFS_DEFAULT.ukIreland),
  };
}

/** One leaf per change — never the whole map (Settings and other writers may hold other keys one day). */
export const discoverPrefPath = <K extends keyof DiscoverPrefs>(k: K, v: DiscoverPrefs[K]): Record<string, unknown> => ({ [`discoverPrefs.${k}`]: v });

/** The decision document's fields (without the id). "passed" carries `until`; "added" never does. */
export function decisionDoc(kind: ScoutDecisionKind, nowMs: number, manuscriptId: string): Omit<ScoutDecision, "id"> {
  const at = new Date(nowMs).toISOString();
  return kind === "passed"
    ? { decision: kind, at, manuscriptId, until: new Date(nowMs + PASS_DAYS * DAY_MS).toISOString() }
    : { decision: kind, at, manuscriptId };
}

/* ── Facts about one community agent ─────────────────────────────────────── */

export function isVerified(ca: Pick<CommunityAgent, "lastVerifiedDate">): boolean {
  return Boolean(ca.lastVerifiedDate) && !isNaN(new Date(ca.lastVerifiedDate).getTime());
}

/** A pass hides the agent until its `until`; past it, the pass has expired and the agent can be picked again. */
export function passIsLive(d: ScoutDecision | undefined, nowMs: number): boolean {
  if (!d || d.decision !== "passed") return false;
  const t = d.until ? new Date(d.until).getTime() : NaN;
  return !isNaN(t) && t > nowMs;
}

/**
 * Which community agents the writer already holds: exact name + agency, or the Smart-Import fuzzy match (a near
 * agency and compatible names). Community id → the writer's agent id.
 */
export function heldMap(catalogue: readonly CommunityAgent[], agents: readonly Agent[]): Map<string, string> {
  const held = new Map<string, string>();
  for (const ca of catalogue) {
    const caKey = agencyKey(ca.agency);
    const match = agents.find((a) => {
      const exact = (a.name || "").trim().toLowerCase() === (ca.name || "").trim().toLowerCase()
        && (a.agency || "").trim().toLowerCase() === (ca.agency || "").trim().toLowerCase();
      if (exact) return true;
      return Boolean(ca.agency) && agencyKey(a.agency) === caKey && nameCompatible(a.name, ca.name);
    });
    if (match) held.set(ca.id, match.id);
  }
  return held;
}

/* ── The queue ───────────────────────────────────────────────────────────── */

export interface ScoutInput {
  catalogue: readonly CommunityAgent[];
  agents: readonly Agent[];
  manuscript: Manuscript | null;
  decisions: readonly ScoutDecision[];
  prefs: DiscoverPrefs;
  nowMs: number;
  homeCountry?: string;
}

export interface ScoutPick extends DiscoverEntry {
  /** "strong" from the engine's own band; everything else reads "possible" */
  fit: "strong" | "possible";
}

const decisionsById = (ds: readonly ScoutDecision[]) => new Map(ds.map((d) => [d.id, d]));

/** The book's pool, before the switches: verified agents whose genres take the book. */
export function bookPool(catalogue: readonly CommunityAgent[], manuscript: Manuscript | null): CommunityAgent[] {
  const book = bookGenres(manuscript);
  if (!manuscript || book.length === 0) return [];
  return catalogue.filter((ca) => isVerified(ca) && takesBook(ca.genres, book));
}

/** Is this agent decided as far as the queue is concerned — added (ever) or passed (and the pass still live). */
export function isDecided(d: ScoutDecision | undefined, nowMs: number): boolean {
  return Boolean(d) && (d!.decision === "added" || passIsLive(d, nowMs));
}

export function pickQueue(i: ScoutInput): ScoutPick[] {
  const { manuscript, prefs, nowMs } = i;
  if (!manuscript) return [];
  const byId = decisionsById(i.decisions);
  const held = heldMap(i.catalogue, i.agents);
  const entries: DiscoverEntry[] = bookPool(i.catalogue, manuscript)
    .filter((ca) => !isDecided(byId.get(ca.id), nowMs))
    .filter((ca) => !prefs.notOnList || !held.has(ca.id))
    .filter((ca) => !prefs.openOnly || ca.submissionStatus !== SubmissionStatus.CLOSED)
    .filter((ca) => !prefs.ukIreland || isUkIreland(ca.country))
    .map((agent) => {
      const breakdown = calculateCommunityAgentMatch(agent, manuscript);
      const score = totalScore(breakdown);
      return { agent, score, breakdown, tier: fitTier(score) };
    });
  return rankEntries(entries, prefs.lens, i.homeCountry).map((e) => ({ ...e, fit: e.tier === "strong" ? "strong" : "possible" }));
}

/* ── Why the Scout picked them ───────────────────────────────────────────── */

export interface PickReasons {
  /** the agent's genres that take the book, in the agent's order */
  genreHits: string[];
  /** the book's main genre (the sentence names it) */
  bookGenre: string | null;
  /** the scorer's matched wish-list words, minus the display stop-list */
  words: string[];
  /** "On {n} writers' contact lists here" — null when absent or 0 */
  lists: number | null;
  /** "queried {m} times" — null when absent or 0 */
  queried: number | null;
}

const positive = (n: unknown): number | null => (typeof n === "number" && Number.isFinite(n) && n > 0 ? n : null);

export function pickReasons(p: ScoutPick, manuscript: Manuscript | null): PickReasons {
  const book = bookGenres(manuscript);
  const hit = bookGenreHit(book);
  return {
    genreHits: (p.agent.genres || []).filter(hit),
    bookGenre: book[0] ?? null,
    words: displayTerms(p.breakdown.overlappingWords),
    lists: positive(p.agent.contributedByCount),
    queried: positive(p.agent.communityQueryCount),
  };
}

/** The community line, or null when both figures are absent: "On 23 writers' contact lists here · queried 14 times". */
export function communityLine(r: Pick<PickReasons, "lists" | "queried">): { lists: string | null; queried: string | null } | null {
  if (r.lists == null && r.queried == null) return null;
  return {
    lists: r.lists == null ? null : `${r.lists} ${r.lists === 1 ? "writer’s contact list" : "writers’ contact lists"}`,
    queried: r.queried == null ? null : `queried ${r.queried} ${r.queried === 1 ? "time" : "times"}`,
  };
}

/* ── The header's figures ────────────────────────────────────────────────── */

export interface ScoutTally {
  toReview: number;
  added: number;
  passed: number;
  /** added + passed */
  decided: number;
  /** toReview + decided */
  total: number;
  /** decided / total as a whole percentage; null when there is nothing at all */
  pct: number | null;
}

/** Over the book's pool: the queue's own length, and the decisions about agents in that pool (live passes only). */
export function scoutTally(i: ScoutInput, queue: readonly ScoutPick[]): ScoutTally {
  const pool = new Set(bookPool(i.catalogue, i.manuscript).map((c) => c.id));
  let added = 0;
  let passed = 0;
  for (const d of i.decisions) {
    if (!pool.has(d.id)) continue;
    if (d.decision === "added") added += 1;
    else if (passIsLive(d, i.nowMs)) passed += 1;
  }
  const decided = added + passed;
  const total = queue.length + decided;
  return { toReview: queue.length, added, passed, decided, total, pct: total === 0 ? null : Math.round((decided / total) * 100) };
}

/* ── Passed list ─────────────────────────────────────────────────────────── */

export interface PassedRow { decision: ScoutDecision; agent: CommunityAgent }

/** The live passes, newest first, each resolved to its agent (a pass whose agent left the catalogue is not listed). */
export function passedList(decisions: readonly ScoutDecision[], catalogue: readonly CommunityAgent[], nowMs: number): PassedRow[] {
  const byId = new Map(catalogue.map((c) => [c.id, c]));
  return decisions
    .filter((d) => passIsLive(d, nowMs) && byId.has(d.id))
    .sort((a, b) => b.at.localeCompare(a.at))
    .map((d) => ({ decision: d, agent: byId.get(d.id)! }));
}

/* ── Your part in it ─────────────────────────────────────────────────────── */

export interface YourPart {
  /** agents on the writer's list that are in the catalogue */
  inCatalogue: number;
  /** agents the writer shared that are not (yet) in the catalogue */
  waiting: number;
  /** agents neither in the catalogue nor shared — the share candidates */
  notShared: number;
  candidates: Agent[];
}

/** Every agent on the list falls in exactly one of the three. An agent with neither a name nor an agency is not a
 *  candidate — there is nothing to share — and counts nowhere. */
export function yourPart(catalogue: readonly CommunityAgent[], agents: readonly Agent[], shared: ReadonlySet<string>): YourPart {
  const inCat = new Set(heldMap(catalogue, agents).values());
  let inCatalogue = 0;
  let waiting = 0;
  const candidates: Agent[] = [];
  for (const a of agents) {
    if (!(a.name || "").trim() && !(a.agency || "").trim()) continue;
    if (inCat.has(a.id)) inCatalogue += 1;
    else if (shared.has(a.id)) waiting += 1;
    else candidates.push(a);
  }
  return { inCatalogue, waiting, notShared: candidates.length, candidates };
}

/* ── Sharing — public details only ───────────────────────────────────────── */

/** Exactly the public fields a share sends (decision 2). Never queries, notes, ratings, or anything typed about them. */
export const SHARE_FIELDS = [
  "name", "agency", "website", "city", "country", "genres", "mswlNotes",
  "submissionMethod", "materialsWanted", "responseTimeWeeks", "noResponseMeansNo",
] as const;
export type ShareField = (typeof SHARE_FIELDS)[number];

export interface AgentSubmission {
  userId: string;
  sourceAgentId: string;
  createdAt: string;
  name?: string; agency?: string; website?: string; city?: string; country?: string;
  genres?: string[]; mswlNotes?: string; submissionMethod?: string; materialsWanted?: string[];
  responseTimeWeeks?: number; noResponseMeansNo?: boolean;
}

/** The deterministic id — a second create of the same agent by the same writer is an update the rules deny. */
export const submissionId = (uid: string, sourceAgentId: string): string => `${uid}_${sourceAgentId}`;

/** Build the submission from the writer's agent, keeping only the public fields that carry a value. */
export function buildSubmission(a: Agent, uid: string, nowMs: number): AgentSubmission {
  const out: AgentSubmission = { userId: uid, sourceAgentId: a.id, createdAt: new Date(nowMs).toISOString() };
  const src = a as unknown as Record<string, unknown>;
  for (const k of SHARE_FIELDS) {
    const v = src[k];
    if (v === undefined || v === null) continue;
    if (typeof v === "string") { const t = v.trim(); if (t) (out as unknown as Record<string, unknown>)[k] = t.slice(0, k === "mswlNotes" ? 4000 : 256); continue; }
    if (Array.isArray(v)) {
      const arr = v.map((x) => (typeof x === "string" ? x.trim() : typeof x === "object" && x && "material" in x ? String((x as { material: unknown }).material) : "")).filter(Boolean).slice(0, 32);
      if (arr.length) (out as unknown as Record<string, unknown>)[k] = arr;
      continue;
    }
    if (typeof v === "number" && Number.isFinite(v) && v > 0) { (out as unknown as Record<string, unknown>)[k] = v; continue; }
    if (typeof v === "boolean") (out as unknown as Record<string, unknown>)[k] = v;
  }
  return out;
}

/* ── The catalogue's figures ─────────────────────────────────────────────── */

export interface CatalogueFigures {
  verified: number | null;
  contributed: number | null;
  contributedLists: number | null;
  thisMonth: number | null;
  updated: string | null;
  byGenre: { genre: string; n: number }[] | null;
}

/**
 * ⚠️ THE ONE ACCESSOR, AND EVERY FIGURE IS ABSENT TODAY (decision 8). No client-readable source of catalogue totals
 *    exists (`/counters` is closed to clients and stays so). Wiring a source later is this one function.
 * ⚠️ AND THE CATALOGUE ITSELF IS NOT USED AS ONE, THOUGH IT IS READABLE: `db.tsx` silently falls back to the local
 *    seed list when the read fails or nobody is signed in, so a count taken from it could be the seed's count wearing
 *    a live figure's clothes. Until that fallback is distinguishable, nothing here counts it.
 */
export function catalogueFigures(): CatalogueFigures {
  return { verified: null, contributed: null, contributedLists: null, thisMonth: null, updated: null, byGenre: null };
}

/** True when there is at least one figure to draw. */
export const hasAnyFigure = (f: CatalogueFigures): boolean =>
  f.verified != null || f.contributed != null || f.thisMonth != null || (f.byGenre != null && f.byGenre.length > 0);

/* ── Copy helpers ────────────────────────────────────────────────────────── */

/** "6 agents to consider" / "1 agent to consider" */
export const considerWords = (n: number): string => (n === 1 ? "agent to consider" : "agents to consider");

/** The lens as the section head's sentence reads it: "Ranked by best overall fit". */
export const LENS_PHRASE: Record<DiscoverLens, string> = {
  best: "best overall fit", mswl: "wish-list match", fast: "fast responders", open: "open to queries first", local: "local first",
};

/** The lens radios' second lines, in the Tune drawer. */
export const LENS_NOTE: Record<DiscoverLens, string> = {
  best: "Genre, age category and wish-list overlap together, the wish list breaking ties",
  mswl: "Agents whose wish list names what your book is about",
  fast: "Shortest stated reply windows first",
  open: "Open agencies before fit",
  local: "Agents in your home market first",
};

/** The Tune drawer's lens labels (the mock's wording; `LENS_META` keeps the older captions). */
export const LENS_LABEL: Record<DiscoverLens, string> = {
  best: "Best overall fit", mswl: "Wish-list match", fast: "Fast responders", open: "Open to queries first", local: "Local first",
};
