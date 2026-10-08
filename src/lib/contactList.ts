/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v11 — the pure derivations (design authority: design-refs/contact-list-v11.html).
 *
 * ⚠️ THE ROWS COME FROM `buildQcRows` — the Query Centre's OWN derivation — so this page and the
 * QC cannot disagree about a court, an expected date or a past-the-date reading. This module
 * derives the AGENT-major view over those rows and adds exactly one page-local definition:
 *
 * ⚠️ "YOUR MOVE" ON THIS PAGE IS `tileCourt` ∪ (agent's court ∧ past the expected date) — Nick's
 * ruling (a), 25 Sep. The Query Centre's `courtOf` keeps a past-expected query in the agent's
 * court with `pastExpected` as a flag, and it is UNTOUCHED; this page groups by what the writer
 * should act on, which is the same reading the To-do board's nudge task already takes. Offer
 * folds into Your move exactly as `tileCourt` folds it. One function below owns the union.
 */
import type { Agent, Manuscript, Query, QueryStatus } from "../types";
import type { QcRow } from "./qcSummary";
import { isDoorOpen } from "./agentList";
import { bookGenres, genreKey, takesBook } from "./genreMatch";
import { joinGenres } from "./genreNoun";

/** The rail's breathing room from the viewport's edges, and its height clamp (mock: the rail's
 *  JS writes an inline height; CSS carries `position: sticky; top: 16px; max-height: 860px`).
 *  Measured on the rendered mock at 1440×900: load → top 92, height 792; scrolled 600 → top 16,
 *  height 860 (the cap binding — 900 − 16 − 16 = 868 → 860). The brief's bracket "16 → 884" is
 *  the one place its text and the render disagree; the mock wins. */
export const RAIL_TOP_GAP = 16;
export const RAIL_MIN = 360;
export const RAIL_MAX = 860;

/**
 * The rail's height from its own MEASURED top — never `100vh` with a constant offset (the house
 * viewport law: the offset is a guess about everything above the element, and the beta strip,
 * the bar and the hero all sit above this one).
 *
 * ⚠️ RETURNS NULL FOR A READING THAT CANNOT BE A LAYOUT — a zero/negative top with a zero-height
 * window is the page before layout or a container under the loading cover, and writing a height
 * from it publishes a wrong floor (the dashboard's −115 clamp is the standing example). The
 * caller keeps the previous height rather than storing the sentinel.
 */
export function railHeight(top: number, innerHeight: number): number | null {
  if (!Number.isFinite(top) || !Number.isFinite(innerHeight) || innerHeight <= 0) return null;
  const clampedTop = Math.max(RAIL_TOP_GAP, top);
  const room = innerHeight - clampedTop - RAIL_TOP_GAP;
  return Math.max(RAIL_MIN, Math.min(RAIL_MAX, room));
}

/* ── the manuscript in scope ──────────────────────────────────────────────────────────────── */
/* ⚠️ THERE IS NO SCOPE RESOLVER HERE, DELIBERATELY. The page reads the switcher's own —
   `resolveScopedManuscript` (lib/shellSidebar.ts) — because §10 says the manuscript IS the one
   in the switcher, and a second resolver with a different fallback put a null beside a chip
   showing a book. (agentTiles' only-one fallback retired with it.) */

/* ── where you stand, per agent, for the manuscript in scope ─────────────────────────────── */

/** THE page-local union (ruling a): the writer's move on a query. */
export const rowYourMove = (r: Pick<QcRow, "court" | "pastExpected">): boolean =>
  r.court === "you" || r.court === "offer" || (r.court === "agent" && r.pastExpected);

export type ContactStanding =
  | { kind: "none" }
  | { kind: "open"; yourMove: boolean }
  | { kind: "closed"; status: QueryStatus };

/** An agent's rows for the manuscript in scope — null scope means every query (one-manuscript
 *  accounts and unscoped views read the same either way). */
export const agentRows = (rows: readonly QcRow[], agentId: string, msId: string | null): QcRow[] =>
  rows.filter((r) => r.query.agentId === agentId && (msId == null || r.manuscriptId === msId));

/** Where things stand between the writer and this agent, for the manuscript in scope.
 *  Open beats closed; the latest close speaks for a wholly-closed history. */
export function contactStanding(rows: readonly QcRow[]): ContactStanding {
  if (rows.length === 0) return { kind: "none" };
  const open = rows.filter((r) => r.court !== "closed");
  if (open.length) return { kind: "open", yourMove: open.some(rowYourMove) };
  let last = rows[0];
  for (const r of rows.slice(1)) if (r.lastMs > last.lastMs) last = r;
  return { kind: "closed", status: last.status };
}

/* ── the three count cards (v11 §3.3) ─────────────────────────────────────────────────────── */

export type ContactCardKey = "active" | "never" | "closed";

export interface ContactCard {
  key: ContactCardKey;
  name: string;
  count: number;
  /** The mono fact line beneath the name. */
  fact: string;
  /** The fact carries ink 700 (the Active card's "N your move", only while N > 0). */
  urgent: boolean;
}

export interface ContactCensus {
  cards: ContactCard[];
  /** Agent id → standing, computed once — the rows, the bands and the filter all read it. */
  standing: Map<string, ContactStanding>;
}

/**
 * One pass over the agents. Counts are TOTALS over the whole list (the house tile law); the
 * cards' facts split their own population and never read the filtered view.
 */
export function contactCensus(agents: readonly Agent[], rows: readonly QcRow[], msId: string | null): ContactCensus {
  const standing = new Map<string, ContactStanding>();
  for (const a of agents) standing.set(a.id, contactStanding(agentRows(rows, a.id, msId)));

  const of = (k: ContactStanding["kind"]) => agents.filter((a) => standing.get(a.id)!.kind === k);
  const active = of("open");
  const never = of("none");
  const closed = of("closed");

  const yourMove = active.filter((a) => (standing.get(a.id) as { yourMove: boolean }).yourMove).length;
  const openNow = never.filter((a) => isDoorOpen(a)).length;
  /* ⚠️ THE SPLIT NAMES PASSED AND NO-REPLY ONLY (the mock's own line). A withdrawn close is in
     the COUNT — the card is "agents whose query closed" — and deliberately not in the split. */
  const passed = closed.filter((a) => (standing.get(a.id) as { status: QueryStatus }).status === "Rejected").length;
  const noReply = closed.filter((a) => (standing.get(a.id) as { status: QueryStatus }).status === "No Response").length;

  return {
    standing,
    cards: [
      { key: "active", name: "Active queries", count: active.length, fact: `${yourMove} your move`, urgent: yourMove > 0 },
      { key: "never", name: "Never queried", count: never.length, fact: `${openNow} open now · ${never.length - openNow} closed`, urgent: false },
      { key: "closed", name: "Query closed", count: closed.length, fact: `${passed} passed · ${noReply} no reply`, urgent: false },
    ],
  };
}

/** The card selection is a multi-select OR (v11 §3.3): empty set means everyone. */
export const matchesCards = (sel: ReadonlySet<ContactCardKey>, s: ContactStanding): boolean =>
  sel.size === 0 || sel.has(s.kind === "open" ? "active" : s.kind === "none" ? "never" : "closed");

/* ⚠️ RETIRED (Contact list v15 §2): `heroFacts` / `HeroFacts` — the facts sentence's derivation; its one reader was the
   v12–v14 living header, which the open header replaced. */

/* ⚠️ THE HERO'S PLACEMENT CHAIN IS RETIRED (page header v2 §4): `ART`, `HERO_CARD_W`,
   `HERO_STACK_BELOW` and `heroLayout` solved where the blank card sat inside the Archivist's
   drawing. The card is a quick-add panel under the shared header's actions now and the drawing is
   the hawk alone, so there is no chain to solve. Recover at 25cb2cad if ever wanted. */

/* ══ phase 3 — the list: row facts, the date line, filters, groups and sorts (v11 §4–6) ═════ */
import { STAGE_NAME } from "./qcSummary";
import { countryName } from "./territory";
import { formatDate } from "./dates";

const DAY = 86_400_000;
const dmy = (ms: number): string =>
  formatDate(new Date(ms), { day: "numeric", month: "short" });

/** The agent's STANDING QUERY — what the row's right column speaks about. The furthest-along
 *  live one (the board's own law), else the latest close, else null. One rule, stated once. */
export function standingQuery(rows: readonly QcRow[]): QcRow | null {
  const open = rows.filter((r) => r.court !== "closed");
  const pool = open.length ? open : rows;
  if (pool.length === 0) return null;
  if (open.length) {
    const order = ["Queried", "Partial Requested", "Partial Sent", "Full Requested", "Full Sent", "Revise & Resubmit", "Resubmitted", "Offer"];
    let best = pool[0];
    for (const r of pool.slice(1)) if (order.indexOf(r.status) > order.indexOf(best.status)) best = r;
    return best;
  }
  let last = pool[0];
  for (const r of pool.slice(1)) if (r.lastMs > last.lastMs) last = r;
  return last;
}

/** The row's second line (v11 §6.2) — five shapes, every date the engine's own. */
export interface RowDateLine {
  text: string;
  /** ink 700 — a date gone by on the agent's side. */
  over: boolean;
}
export function rowDateLine(q: QcRow, nowMs: number): RowDateLine | null {
  if (q.court === "closed") {
    const when = ` · ${dmy(q.lastMs)}`;
    if (q.closedHow === "passed") {
      const on = q.furthest === "full" ? "Passed on the full" : q.furthest === "partial" ? "Passed on the partial" : "Passed";
      return { text: `${on}${when}`, over: false };
    }
    if (q.closedHow === "noReply") return { text: `Closed with no reply${when}`, over: false };
    return { text: `Withdrawn${when}`, over: false };
  }
  if (q.expectedMs == null) return null;
  const days = Math.max(1, Math.round(Math.abs(q.expectedMs - nowMs) / DAY));
  const past = q.expectedMs < nowMs;
  if (q.court === "offer") return { text: `Answer by ${dmy(q.expectedMs)} · ${days}d left`, over: past };
  if (q.court === "you") {
    return past
      ? { text: `Send by ${dmy(q.expectedMs)} · ${days}d over`, over: true }
      : { text: `Send by ${dmy(q.expectedMs)} · ${days}d left`, over: false };
  }
  /* the agent's court: a future date is a reply coming; a past one is past the expected date —
     the fact, never an appraisal (no "overdue", no "late") */
  return past
    ? { text: `Expected ${dmy(q.expectedMs)} · ${days}d over`, over: true }
    : { text: `Reply by ${dmy(q.expectedMs)} · in ${days}d`, over: false };
}

/* ── the per-agent facts every list mechanism reads (computed once per agent) ── */

/** v13 "Open to queries": the record's own word — Open, Closed, or not stated at all */
export type OpenKey = "open" | "closed" | "unstated";
export const OPEN_LABEL: Record<OpenKey, string> = { open: "Open now", closed: "Closed to queries", unstated: "Not stated" };
export function openKeyOf(a: Pick<Agent, "submissionStatus">): OpenKey {
  const s = String(a.submissionStatus ?? "").trim().toLowerCase();
  if (s === "open") return "open";
  if (s === "closed") return "closed";
  return "unstated";
}

export type StandKey = "you" | "agent" | "none" | "closed";
export const STAND_LABEL: Record<StandKey, string> = {
  you: "Your move", agent: "With the agent", none: "Not yet queried", closed: "Closed",
};

export interface AgentFacts {
  agent: Agent;
  standing: ContactStanding;
  stand: StandKey;
  q: QcRow | null;
  /** any live agent-court row past its date (v13: the row draws it through `stand`, the page's union — this flag is the fixture checks' precondition) */
  pastExpected: boolean;
  /** the location as displayed: city, else the country's name, else null */
  loc: string | null;
  door: "open" | "closed";
  /** v13: the door as the agent's record states it — Open, Closed, or Not stated (an absent or
   *  Unknown status, which `door` reads as open) */
  openKey: OpenKey;
  /** the status the filter's Query status section reads (v11 §5.1's seven) */
  statusKey: string;
  /** v14 §4 (ruling Q6): the agent's query status for this manuscript, as the Status filter and grouping read it */
  status14: StatusKey;
  rating: number | null;
  genres: string[];
  lastMs: number | null;
}

export function agentFacts(a: Agent, rows: readonly QcRow[], msId: string | null): AgentFacts {
  const mine = agentRows(rows, a.id, msId);
  const standing = contactStanding(mine);
  const q = standingQuery(mine);
  const open = mine.filter((r) => r.court !== "closed");
  const stand: StandKey =
    standing.kind === "none" ? "none"
    : standing.kind === "closed" ? "closed"
    : standing.yourMove ? "you" : "agent";
  const statusKey =
    standing.kind === "none" ? "Not queried yet"
    : standing.kind === "closed" ? "Closed"
    : STAGE_NAME[(q as QcRow).status as keyof typeof STAGE_NAME] ?? String((q as QcRow).status);
  return {
    agent: a,
    standing,
    stand,
    q,
    pastExpected: open.some((r) => r.court === "agent" && r.pastExpected),
    loc: (a.city ?? "").trim() || countryName(a.country) || null,
    door: isDoorOpen(a) ? "open" : "closed",
    openKey: openKeyOf(a),
    statusKey,
    status14: status14Of(standing.kind === "none" ? null : q),
    rating: typeof a.starRating === "number" ? a.starRating : null,
    genres: a.genres ?? [],
    lastMs: mine.length ? Math.max(...mine.map((r) => r.lastMs)) : null,
  };
}

/* ══ v14 §4 — FILTERS, GROUPING AND SORT: Nick's set (supersedes v13's ruling Q4) ═══════════════════════════════
 * Filters, on one line: Status (tick several) · Action required (on/off) · Open for submissions · Queried or not ·
 * Missing materials (on/off) · Always responds (on/off) · + Genre tokens (any | all). AND across the controls; OR
 * within Status, and within the genres unless "all". Grouping: Letter (default) · Status · Action required · Country.
 * Sort: Surname · Agency · Response time · Recent activity · Status, each with a direction toggle. */

export const NOT_RECORDED = "Not recorded";

/** Ruling Q6: every status is reachable — eleven choices, this order, Revise & resubmit, Resubmitted and Signed
 *  their own. "Closed" is Rejected, No response and Withdrawn. */
export type StatusKey = "none" | "queried" | "pr" | "ps" | "fr" | "fs" | "rr" | "resub" | "offer" | "signed" | "closed";
export const STATUS_CHOICES: { key: StatusKey; label: string }[] = [
  { key: "none", label: "Not queried" },
  { key: "queried", label: "Queried" },
  { key: "pr", label: "Partial requested" },
  { key: "ps", label: "Partial sent" },
  { key: "fr", label: "Full requested" },
  { key: "fs", label: "Full sent" },
  { key: "rr", label: "Revise & resubmit" },
  { key: "resub", label: "Resubmitted" },
  { key: "offer", label: "Offer" },
  { key: "signed", label: "Signed" },
  { key: "closed", label: "Closed" },
];
export const STATUS_LABEL = Object.fromEntries(STATUS_CHOICES.map((c) => [c.key, c.label])) as Record<StatusKey, string>;
/** grouped by Status: furthest along first, then Not queried, Closed last (ruling Q6) */
export const STATUS_GROUP_ORDER: StatusKey[] = ["signed", "offer", "resub", "rr", "fs", "fr", "ps", "pr", "queried", "none", "closed"];

/** the status of one query, as the filter names it; null (no query for this manuscript) is "none" */
export function status14Of(q: Pick<QcRow, "status"> | null): StatusKey {
  if (!q) return "none";
  switch (String(q.status)) {
    case "Queried": return "queried";
    case "Partial Requested": return "pr";
    case "Partial Sent": return "ps";
    case "Full Requested": return "fr";
    case "Full Sent": return "fs";
    case "Revise & Resubmit": return "rr";
    case "Resubmitted": return "resub";
    case "Offer": return "offer";
    case "Signed": return "signed";
    default: return "closed"; // Rejected, No Response, Withdrawn
  }
}

export type OpenChoice = "either" | "open" | "closed";
export type QueriedChoice = "either" | "yes" | "no";
export type GenreMode = "any" | "all";
export interface ContactFilters {
  status: StatusKey[];
  action: boolean;
  open: OpenChoice;
  queried: QueriedChoice;
  mats: boolean;
  always: boolean;
  /** genre KEYS (`genreKey`) — canonical ids for anything picked from the app's genre list */
  genres: string[];
  genreMode: GenreMode;
}
export const emptyContactFilters = (): ContactFilters =>
  ({ status: [], action: false, open: "either", queried: "either", mats: false, always: false, genres: [], genreMode: "any" });
export const OPEN_CHOICES: { key: OpenChoice; label: string }[] = [
  { key: "either", label: "Either" }, { key: "open", label: "Open now" }, { key: "closed", label: "Closed for now" },
];
export const QUERIED_CHOICES: { key: QueriedChoice; label: string }[] = [
  { key: "either", label: "Either" }, { key: "yes", label: "Queried" }, { key: "no", label: "Not queried yet" },
];
export type FilterSection = "status" | "action" | "open" | "queried" | "mats" | "always" | "genres";
export const FILTER_SECTIONS: FilterSection[] = ["status", "action", "open", "queried", "mats", "always", "genres"];
/** how many controls are on — "Clear all" shows while this is above 0 */
export const contactFilterCount = (f: ContactFilters): number =>
  (f.status.length ? 1 : 0) + (f.action ? 1 : 0) + (f.open !== "either" ? 1 : 0) + (f.queried !== "either" ? 1 : 0)
  + (f.mats ? 1 : 0) + (f.always ? 1 : 0) + (f.genres.length ? 1 : 0);

/* the one-line facts each filter reads */
export const isActionRequired = (x: Pick<AgentFacts, "stand">) => x.stand === "you";
export const isQueried = (x: Pick<AgentFacts, "standing">) => x.standing.kind !== "none";
export const isOpenNow = (x: Pick<AgentFacts, "openKey">) => x.openKey !== "closed";
export const isMissingMaterials = (x: Pick<AgentFacts, "agent">) => (x.agent.materialsWanted ?? []).length === 0;
export const isAlwaysResponds = (x: Pick<AgentFacts, "agent">) => x.agent.noResponseMeansNo === false;

const sectionMatch: Record<FilterSection, (x: AgentFacts, f: ContactFilters) => boolean> = {
  status: (x, f) => f.status.length === 0 || f.status.includes(x.status14),
  action: (x, f) => !f.action || isActionRequired(x),
  open: (x, f) => f.open === "either" || (f.open === "open" ? isOpenNow(x) : !isOpenNow(x)),
  queried: (x, f) => f.queried === "either" || (f.queried === "yes" ? isQueried(x) : !isQueried(x)),
  mats: (x, f) => !f.mats || isMissingMaterials(x),
  always: (x, f) => !f.always || isAlwaysResponds(x),
  genres: (x, f) => {
    if (f.genres.length === 0) return true;
    const mine = new Set(x.genres.map(genreKey));
    return f.genreMode === "all" ? f.genres.every((g) => mine.has(g)) : f.genres.some((g) => mine.has(g));
  },
};
export const matchesContactFilters = (x: AgentFacts, f: ContactFilters, except?: FilterSection): boolean =>
  FILTER_SECTIONS.every((k) => k === except || sectionMatch[k](x, f));

/** each control's count, FACETED — under every OTHER active control and Find (`pool`) */
export function facetCounts(facts: readonly AgentFacts[], f: ContactFilters, pool: (x: AgentFacts) => boolean) {
  const under = (k: FilterSection) => facts.filter((x) => pool(x) && matchesContactFilters(x, f, k));
  const S = under("status");
  return {
    status: Object.fromEntries(STATUS_CHOICES.map((c) => [c.key, S.filter((x) => x.status14 === c.key).length])) as Record<StatusKey, number>,
    action: under("action").filter(isActionRequired).length,
    mats: under("mats").filter(isMissingMaterials).length,
    always: under("always").filter(isAlwaysResponds).length,
    open: { open: under("open").filter(isOpenNow).length, closed: under("open").filter((x) => !isOpenNow(x)).length },
    queried: { yes: under("queried").filter(isQueried).length, no: under("queried").filter((x) => !isQueried(x)).length },
  };
}

/** "N on your list" — how many agents carry each genre key, over the whole list */
export function genreTallies(facts: readonly AgentFacts[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const x of facts) for (const k of new Set(x.genres.map(genreKey))) m.set(k, (m.get(k) ?? 0) + 1);
  return m;
}

/* ── the helpful dead end (v14 §7.8) ─────────────────────────────────────────────────────────────────────────────
   When the filters return nothing, each ACTIVE control (each genre token, and the Find text, counting as their own)
   is offered as one drop: the label names it, the count is how many agents it brings back with everything else
   left on. Up to four, most first; none that help means none is offered and the page says so. */
export interface DropOption { key: string; label: string; n: number; drop: (f: ContactFilters) => ContactFilters; clearsSearch?: boolean }
export function dropOptions(
  facts: readonly AgentFacts[], f: ContactFilters, search: string,
  matchesSearch: (x: AgentFacts, q: string) => boolean, genreLabel: (k: string) => string, limit = 4,
): DropOption[] {
  const cands: Omit<DropOption, "n">[] = [];
  if (f.status.length) cands.push({ key: "status", label: f.status.length === 1 ? STATUS_LABEL[f.status[0]] : "Status", drop: (g) => ({ ...g, status: [] }) });
  if (f.action) cands.push({ key: "action", label: "Action required", drop: (g) => ({ ...g, action: false }) });
  if (f.open !== "either") cands.push({ key: "open", label: OPEN_CHOICES.find((c) => c.key === f.open)!.label, drop: (g) => ({ ...g, open: "either" }) });
  if (f.queried !== "either") cands.push({ key: "queried", label: QUERIED_CHOICES.find((c) => c.key === f.queried)!.label, drop: (g) => ({ ...g, queried: "either" }) });
  if (f.mats) cands.push({ key: "mats", label: "Missing materials", drop: (g) => ({ ...g, mats: false }) });
  if (f.always) cands.push({ key: "always", label: "Always responds", drop: (g) => ({ ...g, always: false }) });
  for (const gk of f.genres) cands.push({ key: `genre:${gk}`, label: genreLabel(gk), drop: (g) => ({ ...g, genres: g.genres.filter((x) => x !== gk) }) });
  const q = search.trim();
  if (q) cands.push({ key: "find", label: `\u201c${q}\u201d`, drop: (g) => g, clearsSearch: true });
  return cands
    .map((c) => {
      const g = c.drop(f), qq = c.clearsSearch ? "" : q;
      return { ...c, n: facts.filter((x) => (!qq || matchesSearch(x, qq)) && matchesContactFilters(x, g)).length };
    })
    .filter((c) => c.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, limit);
}

/* ── grouping (v14 §4) — a PARTITION of the already-sorted list ── */
export type GroupKey = "letter" | "status" | "action" | "country";
export const GROUP_OPTIONS: { key: GroupKey; label: string; line?: string }[] = [
  { key: "letter", label: "Letter", line: "Surname initial, with the A\u2013Z index" },
  { key: "status", label: "Status", line: "Furthest along first; closed last" },
  { key: "action", label: "Action required", line: "What each agent needs from you" },
  { key: "country", label: "Country", line: "Where the agent is based" },
];
/** Action required's groups, in order. Ruling Q6: Revise & resubmit is "Send the revision" (your move);
 *  Resubmitted waits on the agent; Signed has nothing to do. */
export type ActionKey = "offer" | "partial" | "full" | "revision" | "nudge" | "ready" | "waiting" | "shut" | "nothing";
export const ACTION_GROUPS: { key: ActionKey; label: string }[] = [
  { key: "offer", label: "Answer the offer" },
  { key: "partial", label: "Send the partial" },
  { key: "full", label: "Send the full" },
  { key: "revision", label: "Send the revision" },
  { key: "nudge", label: "Nudge due" },
  { key: "ready", label: "Ready to query" },
  { key: "waiting", label: "Waiting on the agent" },
  { key: "shut", label: "Closed to queries for now" },
  { key: "nothing", label: "Nothing to do" },
];
/** what the agent needs from the writer — `takes` is the book-genre fact (ruling Q5) */
export function actionOf(x: AgentFacts, takes: (x: AgentFacts) => boolean): ActionKey {
  const st = x.status14;
  if (st === "offer") return "offer";
  if (st === "pr") return "partial";
  if (st === "fr") return "full";
  if (st === "rr") return "revision";
  if (x.pastExpected) return "nudge";
  if (st === "none") return !isOpenNow(x) ? "shut" : takes(x) ? "ready" : "nothing";
  if (st === "queried" || st === "ps" || st === "fs" || st === "resub") return "waiting";
  return "nothing";
}
/** Country, as the app records it — the country's name (ruling Q3); UK nations are not stored and never guessed */
export const countryOf = (x: Pick<AgentFacts, "agent">): string => countryName(x.agent.country) || NOT_RECORDED;
const deThe = (s: string) => s.replace(/^the\s+/i, "");

/* ── v12: the surname and its initial (the card index's key) ──────────────────────────────
   ⚠️ THE MOCK IS THE RULE: the last word of the primary name, with a leading O' folded to O
   (`sur(c)[0]` in the oracle — O'Brien files under O, apostrophe normalised, NOT under B),
   and NO Mc/Mac handling (McAllister files under M). The agent model has no surname field.
   Diacritics fold to their base letter so Édouard files under E; an initial still outside
   A–Z keeps its own character — the strip simply has no cell to jump to it, which the
   delivered data never produces. */
export function surnameOf(a: Pick<Agent, "name" | "agency">): string {
  const primary = (a.name ?? "").trim() || (a.agency ?? "").trim();
  const last = primary.split(/\s+/).filter(Boolean).pop() ?? "";
  return last.replace(/^O'/i, "O");
}

export function surnameInitial(a: Pick<Agent, "name" | "agency">): string {
  const ch = surnameOf(a).normalize("NFD").replace(/[\u0300-\u036f]/g, "").charAt(0).toUpperCase();
  return ch || "#";
}

/** The strip's per-letter counts over the SAME set the list shows (§9 — a filter moves them). */
export function letterCounts(facts: readonly AgentFacts[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const x of facts) {
    const L = surnameInitial(x.agent);
    m.set(L, (m.get(L) ?? 0) + 1);
  }
  return m;
}


export interface ContactGroup { label: string; ids: string[]; extra?: string; key?: string }

export function contactGroups(
  key: GroupKey, ordered: readonly AgentFacts[], ctx: { takes?: (x: AgentFacts) => boolean } = {},
): ContactGroup[] {
  const buckets = new Map<string, string[]>();
  const put = (k: string, id: string) => { const l = buckets.get(k); if (l) l.push(id); else buckets.set(k, [id]); };
  const takes = ctx.takes ?? (() => false);
  for (const x of ordered) {
    if (key === "letter") put(surnameInitial(x.agent), x.agent.id);
    else if (key === "status") put(x.status14, x.agent.id);
    else if (key === "action") put(actionOf(x, takes), x.agent.id);
    else put(countryOf(x), x.agent.id);
  }
  if (key === "letter") return [...buckets.keys()].sort((a, b) => a.localeCompare(b)).map((k) => ({ label: k, key: k, ids: buckets.get(k)! }));
  if (key === "status") return STATUS_GROUP_ORDER.filter((k) => buckets.has(k)).map((k) => ({ label: STATUS_LABEL[k], key: k, ids: buckets.get(k)! }));
  if (key === "action") return ACTION_GROUPS.filter((g) => buckets.has(g.key)).map((g) => ({ label: g.label, key: g.key, ids: buckets.get(g.key)! }));
  return [...buckets.keys()]
    .sort((a, b) => (a === NOT_RECORDED ? 1 : b === NOT_RECORDED ? -1 : a.localeCompare(b)))
    .map((k) => ({ label: k, key: k, ids: buckets.get(k)! }));
}

/* ── sorting (v14 §4) — within groups when grouped ── */

export type SortKey = "surname" | "agency" | "reply" | "activity" | "status";
/** each with its italic line and the direction toggle's two words */
export const SORT_OPTIONS: { key: SortKey; label: string; line: string; dir: [string, string] }[] = [
  { key: "surname", label: "Surname", line: "By family name", dir: ["A to Z", "Z to A"] },
  { key: "agency", label: "Agency", line: "Agencies by name, \u201cThe\u201d ignored", dir: ["A to Z", "Z to A"] },
  { key: "reply", label: "Response time", line: "Unknown last, either way", dir: ["Fastest first", "Slowest first"] },
  { key: "activity", label: "Recent activity", line: "The latest change to each agent's query", dir: ["Most recent first", "Oldest first"] },
  { key: "status", label: "Status", line: "Furthest along first", dir: ["Furthest along first", "Least far first"] },
];

/**
 * Sort within groups. ⚠️ REVERSED KEEPS THE MISSING LAST (the house law): reversing a list whose tail is
 * "unknown" would otherwise lead with the agents nobody can sort. Names are never missing.
 */
export function sortFacts(facts: readonly AgentFacts[], key: SortKey, reversed = false): AgentFacts[] {
  const by = [...facts];
  const name = (x: AgentFacts) => (x.agent.name.trim() || x.agent.agency).toLowerCase();
  const sur = (a: AgentFacts, b: AgentFacts) => surnameOf(a.agent).localeCompare(surnameOf(b.agent)) || name(a).localeCompare(name(b));
  /* a stated window only — the quick-add stub 0 is "unknown", not "replies at once" */
  const weeks = (x: AgentFacts) => (typeof x.agent.responseTimeWeeks === "number" && x.agent.responseTimeWeeks > 0 ? x.agent.responseTimeWeeks : null);
  const active = (x: AgentFacts) => x.lastMs ?? null;
  const rank = (x: AgentFacts) => STATUS_GROUP_ORDER.indexOf(x.status14);
  const missing: Partial<Record<SortKey, (x: AgentFacts) => boolean>> = {
    reply: (x) => weeks(x) == null, activity: (x) => active(x) == null,
  };
  switch (key) {
    case "surname": by.sort(sur); break;
    case "agency": by.sort((a, b) => deThe(a.agent.agency || "\uffff").toLowerCase().localeCompare(deThe(b.agent.agency || "\uffff").toLowerCase()) || sur(a, b)); break;
    case "reply": by.sort((a, b) => (weeks(a) ?? 999) - (weeks(b) ?? 999) || sur(a, b)); break;
    case "activity": by.sort((a, b) => (active(b) ?? 0) - (active(a) ?? 0) || sur(a, b)); break;
    case "status": by.sort((a, b) => rank(a) - rank(b) || sur(a, b)); break;
  }
  if (!reversed) return by;
  const gone = missing[key];
  if (!gone) return by.reverse();
  return [...by.filter((x) => !gone(x)).reverse(), ...by.filter((x) => gone(x))];
}

/* ── the add card's duplicate check (v11 §8.2) ────────────────────────────────────────────── */

/**
 * The agent already on the list whose NAME matches the typed one — case-insensitive, trimmed —
 * or null. Name only: the prompt asks whether the model could also match on agency, and it
 * could (agency-less agents are valid, so agency+name pairs are not unique keys either way);
 * proposed in the report, deliberately not built.
 */
export function findDuplicateAgent(name: string, agents: readonly Agent[]): Agent | null {
  const typed = name.trim().toLowerCase();
  if (!typed) return null;
  return agents.find((a) => (a.name ?? "").trim().toLowerCase() === typed) ?? null;
}

