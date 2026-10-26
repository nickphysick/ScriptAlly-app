/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v24 (design-refs/contact-list-v24/) — the page's pure model: the four sets the view row, the list's
 * group headings and the full-screen band all count; the banner's figures; the agent card's band, call box and
 * footer links; the genre-fit line (E1) and the same-agency colleagues (E2).
 *
 * ⚠️ THE FOUR SETS ARE `AgentFacts.stand` (you · agent · none · closed), the predicate the address book's avatars,
 *    pills and discs already use, so a chip, a heading and a disc cannot disagree. Not queried includes an agent
 *    closed to queries with no query: `stand` puts them there, and so does the mock (its "Closed to queries" rows sit
 *    under Not queried). Closed is an agent whose queries have all closed.
 * ⚠️ THE CARD'S ACTION IS THE QUERY CENTRE'S OWN NEXT MOVE (`nextDoor`), so the card and the Query Centre open the
 *    same journey for the same query.
 */
import type { Agent } from "../types";
import type { AgentFacts, StandKey } from "./contactList";
import type { HkModel } from "./contactHousekeeping";
import { agentInitials, agentPrimary } from "./agentDisplay";
import { genreKey } from "./genreMatch";
import type { QcRow } from "./qcSummary";
import { nextDoor, type Door } from "./queryActions/entry";
import { MONTHS_SHORT } from "./dates";

/* ── the four sets ───────────────────────────────────────────────────────────────────────────────────────────── */

export type SetKey = StandKey;
/** the order the view row, the group headings and the full-screen band draw them in */
export const SET_ORDER: readonly SetKey[] = ["you", "agent", "none", "closed"];
export const SET_LABEL: Record<SetKey, string> = { you: "Your move", agent: "Querying", none: "Not queried", closed: "Closed" };
/** the agent card's band: whose court it is */
export const SET_BAND: Record<SetKey, string> = { you: "With you", agent: "With the agent", none: "Not queried yet", closed: "Closed" };

export type SetCounts = Record<SetKey, number>;
export function setCounts(facts: readonly Pick<AgentFacts, "stand">[]): SetCounts {
  const c: SetCounts = { you: 0, agent: 0, none: 0, closed: 0 };
  for (const x of facts) c[x.stand] += 1;
  return c;
}
/** v25 B2 — a list of sets too (At a glance's Querying is Your move + With the agent) */
export const inSet = (x: Pick<AgentFacts, "stand">, set: SetKey | readonly SetKey[] | null): boolean =>
  !set || (typeof set === "string" ? x.stand === set : set.length === 0 || set.includes(x.stand));

/** the list's groups: one run per set in SET_ORDER, the agents in the order they were handed (already sorted) */
export interface SetGroup { key: SetKey; label: string; ids: string[] }
export function setGroups(sorted: readonly AgentFacts[]): SetGroup[] {
  return SET_ORDER.map((k) => ({ key: k, label: SET_LABEL[k], ids: sorted.filter((x) => x.stand === k).map((x) => x.agent.id) }))
    .filter((g) => g.ids.length > 0);
}
export const agentsWord = (n: number): string => `${n} ${n === 1 ? "agent" : "agents"}`;

/* ── Cards: how many across ──────────────────────────────────────────────────────────────────────────────────── */

/**
 * Three cards across from a list sheet of 1,100px, else two. The value is the Query Centre's v142.1 one
 * (`CARDS_THREE_FROM`, deleted with its Cards view in v149 and recovered here from ef0490e4), measured from the
 * sheet's width — three at 1512 with the sidebar open, two at 1280.
 */
export const CARDS_THREE_FROM = 1100;
export const cardsAcross = (sheetW: number): number => (sheetW >= CARDS_THREE_FROM ? 3 : 2);

/* ── the banner ──────────────────────────────────────────────────────────────────────────────────────────────── */

export interface BannerFigures {
  /** the details missing: Housekeeping's own gap count (the gaps not put off with Later) */
  gaps: number;
  /** the agents those gaps belong to */
  agents: number;
  /** up to four initials discs, in Housekeeping's task order */
  faces: { key: string; initials: string; title: string }[];
}
export function bannerFigures(m: Pick<HkModel, "items">): BannerFigures {
  const seen = new Set<string>();
  const faces: BannerFigures["faces"] = [];
  for (const it of m.items) {
    if (seen.has(it.agent.id)) continue;
    seen.add(it.agent.id);
    if (faces.length < 4) faces.push({ key: it.agent.id, initials: agentInitials(it.agent).slice(0, 2), title: agentPrimary(it.agent) });
  }
  return { gaps: m.items.length, agents: seen.size, faces };
}
/** "20 details are missing" / "1 detail is missing" */
/* v25 A3 — `missingWords` retired with the banner it worded */

/* ── E1 · the genre fit ──────────────────────────────────────────────────────────────────────────────────────── */

const joinAnd = (xs: readonly string[]): string =>
  xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;

/**
 * "Wants thriller and suspense, like Murphy’s Day Out" when any of the agent's genres is one of the book's; "Not a
 * genre match for …" when none is; null with no agent genres or no manuscript. Matched by `genreKey`, never by
 * case or spelling.
 */
export function genreFit(
  agentGenres: readonly string[] | null | undefined,
  bookGenres: readonly string[],
  title: string | null,
  label: (raw: string) => string = (s) => s,
): { hit: boolean; text: string } | null {
  const mine = (agentGenres ?? []).filter((g) => String(g ?? "").trim());
  const t = (title ?? "").trim();
  if (!mine.length || !t || !bookGenres.length) return null;
  const keys = new Set(bookGenres.map(genreKey).filter(Boolean));
  const hits = mine.filter((g) => keys.has(genreKey(g)));
  if (!hits.length) return { hit: false, text: `Not a genre match for ${t}` };
  const words = [...new Set(hits.map((g) => (label(g) || g).toLowerCase()))];
  return { hit: true, text: `Wants ${joinAnd(words)}, like ${t}` };
}

/* ── E2 · others at the same agency ─────────────────────────────────────────────────────────────────────────── */

/** the agency as `sameAgent` compares it (lib/importDuplicates: trimmed, case-folded) */
export const agencyKey = (s: string | null | undefined): string => (s ?? "").trim().toLowerCase();
const live = (x: Pick<AgentFacts, "stand">) => x.stand === "you" || x.stand === "agent";

export interface Colleagues {
  agency: string;
  others: AgentFacts[];
  /** a colleague with a live query, when this agent has none: the warning and "Hold off" name them */
  holdFor: AgentFacts | null;
}
export function colleaguesOf(x: AgentFacts, all: readonly AgentFacts[]): Colleagues | null {
  const k = agencyKey(x.agent.agency);
  if (!k) return null;
  const others = all.filter((o) => o.agent.id !== x.agent.id && agencyKey(o.agent.agency) === k);
  if (!others.length) return null;
  const holdFor = live(x) ? null : others.find(live) ?? null;
  return { agency: (x.agent.agency ?? "").trim(), others, holdFor };
}

/* ── the agent card ──────────────────────────────────────────────────────────────────────────────────────────── */

const DAY = 86_400_000;
const dm = (ms: number) => { const d = new Date(ms); return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`; };

/** the band's right: "Day {n}" (days since first queried) while a query is live, else "Added {d Mon}", else nothing */
export function bandRight(x: Pick<AgentFacts, "stand" | "q" | "agent">, nowMs: number): { kind: "day"; n: number } | { kind: "added"; text: string } | null {
  if (live(x) && x.q?.sentMs != null) return { kind: "day", n: Math.max(0, Math.floor((nowMs - x.q.sentMs) / DAY)) };
  const t = typeof x.agent.dateAdded === "string" ? Date.parse(x.agent.dateAdded) : NaN;
  return Number.isFinite(t) ? { kind: "added", text: `Added ${dm(t)}` } : null;
}

/** the call box's words for the next move the Query Centre would offer */
const CALL_BUTTON: Record<string, string> = {
  "Mark partial sent": "Send the partial", "Mark full sent": "Send the full", "Mark revision sent": "Send the revision",
  "Record your answer": "Record your answer", "Nudge": "Nudge", "Close query": "Close query",
};

export type CallBox =
  | { kind: "you"; bold: string; sub: string; button: string; door: Door; queryId: string }
  | { kind: "log"; bold: string; sub: string }
  | { kind: "hold"; bold: string; sub: string };

/**
 * Your move: the next step with one button that opens the Query Centre's own journey. Not queried: "You haven't
 * queried {first} yet." with the fit line and Log a query. Not queried while a colleague is live: "Hold off", no
 * button. Querying and Closed: none.
 */
export function callBox(x: AgentFacts, first: string, fit: { text: string } | null, hold: AgentFacts | null, nowMs: number): CallBox | null {
  if (x.stand === "you" && x.q) {
    const door = nextDoor(x.q as QcRow, nowMs);
    if (!door) return null;
    return { kind: "you", bold: callBold(x.q, first, door, nowMs), sub: callSub(x.q, nowMs), button: CALL_BUTTON[door.label] ?? door.label, door, queryId: x.q.id };
  }
  if (x.stand === "none") {
    if (hold) {
      const them = firstOf(hold.agent);
      return { kind: "hold", bold: "Hold off for now.", sub: `Wait for ${them}’s answer before you query ${first}.` };
    }
    if (x.door === "closed") return null;
    return { kind: "log", bold: `You haven’t queried ${first} yet.`, sub: fit ? `${fit.text}.` : "Check the wishlist before you send." };
  }
  return null;
}
const firstOf = (a: Pick<Agent, "name" | "agency">): string => (a.name ?? "").trim().split(/\s+/)[0] || (a.agency ?? "").trim() || "the agent";
function callBold(q: QcRow, first: string, door: Door, nowMs: number): string {
  if (door.label === "Mark partial sent") return `${first} asked for the partial.`;
  if (door.label === "Mark full sent") return `${first} asked for the full.`;
  if (door.label === "Mark revision sent") return `${first} asked for a revision.`;
  if (door.label === "Record your answer") return `${first} made an offer.`;
  if (door.label === "Nudge" || door.label === "Close query") {
    const since = q.stageStartMs ?? q.sentMs;
    const weeks = since != null ? Math.max(1, Math.round((nowMs - since) / (7 * DAY))) : null;
    return weeks ? `No reply in ${weeks} ${weeks === 1 ? "week" : "weeks"}.` : "No reply yet.";
  }
  return `${first} is waiting on you.`;
}
function callSub(q: QcRow, nowMs: number): string {
  if (q.court === "agent") return q.expectedMs != null && q.expectedMs < nowMs ? "A polite nudge is due." : "Nothing is due yet.";
  if (q.expectedMs == null) return q.court === "offer" ? "Answer when you’re ready." : "Send it, then mark it sent.";
  const by = dm(q.expectedMs);
  return q.court === "offer" ? `Reply by ${by}.` : `Send it by ${by}.`;
}

/** the footer's links, by set */
export type FootLink = "record" | "edit" | "open" | "log" | "remove" | "see";
export function footLinks(set: SetKey): FootLink[] {
  if (set === "none") return ["log", "edit", "remove"];
  if (set === "closed") return ["see", "edit", "remove"];
  return ["record", "edit", "open"];
}
export const FOOT_WORD: Record<FootLink, string> = {
  record: "Record a response", edit: "Edit agent", open: "Open query", log: "Log a query", remove: "Remove", see: "See the query",
};

/** the full-screen list row's right: Your move shows its due date ("30 SEP" / "DUE NOW"); querying and closed the dot
 *  only; not queried nothing */
export function rowDue(x: Pick<AgentFacts, "stand" | "q">, nowMs: number): string | null {
  if (x.stand !== "you" || !x.q) return null;
  const q = x.q;
  if (q.court === "agent") return "DUE NOW";
  if (q.expectedMs == null) return null;
  return q.expectedMs < nowMs ? "DUE NOW" : dm(q.expectedMs).toUpperCase();
}

/* ── the List row's "Your query" cell ────────────────────────────────────────────────────────────────────────── */

const ROW_NEXT: Record<string, string> = { ...CALL_BUTTON, "Record your answer": "Decide on offer" };
/**
 * The cell's second line. Your move: the next step and its date, in rust ("Send the partial · 30 Sep", "Nudge ·
 * Due now"). Querying and Closed: "Sent 6 May". Null when there is nothing to say.
 */
export function rowSecond(x: Pick<AgentFacts, "stand" | "q">, nowMs: number): { text: string; due: boolean } | null {
  const q = x.q;
  if (!q) return null;
  if (x.stand === "you") {
    const door = nextDoor(q as QcRow, nowMs);
    const what = door ? ROW_NEXT[door.label] ?? door.label : "Your move";
    /* v25.2 A5 — the date alone after the step ("Send the partial · 30 Sep"); "Due now" once it has passed */
    const when = q.court === "agent" || (q.expectedMs != null && q.expectedMs < nowMs) ? "Due now" : q.expectedMs != null ? dm(q.expectedMs) : null;
    return { text: when ? `${what} · ${when}` : what, due: true };
  }
  return q.sentMs != null ? { text: `Sent ${dm(q.sentMs)}`, due: false } : null;
}

/** the wide card's faint last step: what comes next and when ("Send the partial", "30 SEP"); null once closed or unqueried */
export function wideNext(x: Pick<AgentFacts, "stand" | "q">, nowMs: number): { title: string; date: string; due: boolean } | null {
  const q = x.q;
  if (!q || x.stand === "none" || x.stand === "closed") return null;
  if (x.stand === "you") {
    const door = nextDoor(q as QcRow, nowMs);
    const title = door ? CALL_BUTTON[door.label] ?? door.label : "Your move";
    const date = q.court === "agent" || (q.expectedMs != null && q.expectedMs < nowMs) ? "DUE NOW" : q.expectedMs != null ? dm(q.expectedMs).toUpperCase() : "";
    return { title, date, due: true };
  }
  return { title: "Reply expected", date: q.expectedMs != null ? dm(q.expectedMs).toUpperCase() : "", due: false };
}
