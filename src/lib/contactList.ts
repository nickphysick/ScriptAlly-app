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
import { isGenreMatch, matchGenre } from "./genreMatch";

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

/* ── the facts sentence (v11 §3.1) ────────────────────────────────────────────────────────── */

export interface HeroFacts {
  total: number;
  /** The manuscript's title, in the typewriter face — null drops the scope clause. */
  msTitle: string | null;
  /** The genre as the writer recorded it, lowercased for the sentence; null drops the tail. */
  genre: string | null;
  want: number;
  /** Genre matches the writer has never queried for this manuscript — the bold tail. */
  fresh: number;
}

export function heroFacts(
  agents: readonly Agent[],
  standing: ReadonlyMap<string, ContactStanding>,
  ms: Manuscript | null,
): HeroFacts {
  const match = matchGenre(ms?.genre);
  const wanters = match ? agents.filter((a) => (a.genres ?? []).some((g) => isGenreMatch(g, match))) : [];
  return {
    total: agents.length,
    msTitle: ms?.title ?? null,
    genre: ms?.genre && match ? ms.genre.toLowerCase() : null,
    want: wanters.length,
    fresh: wanters.filter((a) => standing.get(a.id)?.kind === "none").length,
  };
}

/* ── the hero's placement (v11 §3.1–3.2) — every number from the hero's own measured width ── */

/** The art file's geometry: 810×375, the drawing ends at x 752, the drawn card's right edge at
 *  x 398 (contact-list-hero-archivist.png — place art from its VISIBLE edge, not the image box). */
export const ART = { w: 810, h: 375, inkRight: 752, drawnCardRight: 398 } as const;
/** The live card's designed width at scale 1 (the mock's `.hart .ac.blank`). */
export const HERO_CARD_W = 300;
/** ⚠️ THE MOCK'S 760 IS A FACT ABOUT THE MOCK'S FRAME, NOT ABOUT THE DESIGN (the ref-breakpoint
 *  law, v65's own lesson). Its column is 804 at a 1440 window; the app's — behind the wider
 *  sidebar and the window's insets — is 758, so carrying 760 across stacked the hero at the
 *  everyday desktop width the design draws side by side. 700 keeps 1440 (758) side by side with
 *  margin and stacks the app's 1280 (~598); the side-by-side chain holds unpinned at 758
 *  (cardLeft 274.6 against a 273 floor) and the pin branch carries it below that. */
export const HERO_STACK_BELOW = 700;

export interface HeroLayout {
  stacked: boolean;
  /** The live card's scale, and the art's. */
  c: number;
  s: number;
  /** Whether the card was pinned to the text column's edge and s re-solved. */
  pinned: boolean;
  textW: number | null;
  cardLeft: number;
  cardTop: number;
  imgLeft: number;
  imgTop: number;
  imgW: number;
  heroH: number;
}

const clamp = (lo: number, v: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * The whole hero from four measured facts: its width, the card's UNSCALED height (offsetHeight —
 * a transform never affects layout), the text column's height, and (stacked) the title row's
 * height. Pure, so the pin branch and the clamps are unit-locked rather than eyeballed.
 */
export function heroLayout(input: { W: number; cardH0: number; textH: number; titleRowH?: number }): HeroLayout {
  const { W, cardH0, textH } = input;
  const stacked = W < HERO_STACK_BELOW;
  const c = stacked ? 0.8 : clamp(0.78, W / 1000, 1);
  const textW = stacked ? null : Math.min(Math.round(W * 0.34), 330);
  const minCardLeft = stacked ? 0 : (textW as number) + Math.round(W * 0.02);
  let s = stacked ? 0.64 : clamp(0.34, (0.56 * W) / 804, 0.72);
  let imgLeft = W - ART.inkRight * s;
  let cardLeft = imgLeft + ART.drawnCardRight * s - 80 * c - HERO_CARD_W * c;
  let pinned = false;
  if (cardLeft < minCardLeft) {
    /* pin the card, solve the art's scale so the peek is kept: s = (W − cardRight − 80c) / 354 */
    pinned = true;
    cardLeft = minCardLeft;
    const cardRight = cardLeft + HERO_CARD_W * c;
    s = Math.max(0.34, (W - cardRight - 80 * c) / (ART.inkRight - ART.drawnCardRight));
    imgLeft = W - ART.inkRight * s;
  }
  const cardTop = stacked ? (input.titleRowH ?? 0) + 9 : 14;
  const imgTop = cardTop + (cardH0 * c - ART.h * s) / 2 + 18 * c;
  const heroH = stacked
    ? cardTop + cardH0 * c + 28
    : Math.max(cardTop + cardH0 * c + 28, textH + 28);
  return { stacked, c, s, pinned, textW, cardLeft, cardTop, imgLeft, imgTop, imgW: ART.w * s, heroH };
}

/* ══ phase 3 — the list: row facts, the date line, filters, groups and sorts (v11 §4–6) ═════ */
import { STAGE_NAME } from "./qcSummary";
import { countryName } from "./territory";

const DAY = 86_400_000;
const dmy = (ms: number): string =>
  new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

/** The agent's STANDING QUERY — what the row's right column speaks about. The furthest-along
 *  live one (the board's own law), else the latest close, else null. One rule, stated once. */
export function standingQuery(rows: readonly QcRow[]): QcRow | null {
  const open = rows.filter((r) => r.court !== "closed");
  const pool = open.length ? open : rows;
  if (pool.length === 0) return null;
  if (open.length) {
    const order = ["Queried", "Partial Requested", "Partial Sent", "Full Requested", "Full Sent", "Revise & Resubmit", "Offer"];
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

export type StandKey = "you" | "agent" | "none" | "closed";
export const STAND_LABEL: Record<StandKey, string> = {
  you: "Your move", agent: "With the agent", none: "Not yet queried", closed: "Closed",
};

export interface AgentFacts {
  agent: Agent;
  standing: ContactStanding;
  stand: StandKey;
  q: QcRow | null;
  /** any live agent-court row past its date — the row's ink edge */
  pastExpected: boolean;
  /** the location as displayed: city, else the country's name, else null */
  loc: string | null;
  door: "open" | "closed";
  /** the status the filter's Query status section reads (v11 §5.1's seven) */
  statusKey: string;
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
    statusKey,
    rating: typeof a.starRating === "number" ? a.starRating : null,
    genres: a.genres ?? [],
    lastMs: mine.length ? Math.max(...mine.map((r) => r.lastMs)) : null,
  };
}

/* ── the filter (v11 §5.1): six sections, OR within, AND across ── */

export const NOT_RECORDED = "Not recorded";
/** §5.1's seven, verbatim — Full requested and R&R are deliberately not options (the mock's own
 *  list); a live one is reachable through Where-you-stand. Recorded, not smoothed over. */
export const STATUS_OPTIONS = [
  "Queried", "Partial requested", "Partial sent", "Full sent", "Offer", "Closed", "Not queried yet",
] as const;
export type RatingKey = 5 | 4 | 3 | 2 | 0; // 0 = Unrated; the ★★ chip takes 2 AND the folded 1

export interface ContactFilters {
  stand: StandKey[];
  genres: string[];
  door: ("open" | "closed")[];
  locs: string[];
  status: string[];
  rating: RatingKey[];
}
export const emptyContactFilters = (): ContactFilters =>
  ({ stand: [], genres: [], door: [], locs: [], status: [], rating: [] });
export const contactFilterCount = (f: ContactFilters): number =>
  f.stand.length + f.genres.length + f.door.length + f.locs.length + f.status.length + f.rating.length;

const ratingKeyOf = (r: number | null): RatingKey => (r == null ? 0 : r <= 2 ? 2 : (r as RatingKey));

const sectionMatch = {
  stand: (x: AgentFacts, v: string[]) => v.length === 0 || v.includes(x.stand),
  genres: (x: AgentFacts, v: string[]) =>
    v.length === 0 || v.some((g) => (g === NOT_RECORDED ? x.genres.length === 0 : x.genres.includes(g))),
  door: (x: AgentFacts, v: string[]) => v.length === 0 || v.includes(x.door),
  locs: (x: AgentFacts, v: string[]) =>
    v.length === 0 || v.some((l) => (l === NOT_RECORDED ? x.loc == null : x.loc === l)),
  status: (x: AgentFacts, v: string[]) => v.length === 0 || v.includes(x.statusKey),
  rating: (x: AgentFacts, v: RatingKey[]) => v.length === 0 || v.includes(ratingKeyOf(x.rating)),
} as const;
export type FilterSection = keyof typeof sectionMatch;

export const matchesContactFilters = (x: AgentFacts, f: ContactFilters, except?: FilterSection): boolean =>
  (Object.keys(sectionMatch) as FilterSection[]).every((k) =>
    k === except ? true : (sectionMatch[k] as (x: AgentFacts, v: unknown[]) => boolean)(x, f[k] as unknown[]));

/** The options each section offers, from the data (locations and genres present), with counts
 *  FACETED: every option counted under all the OTHER active narrowing (v11 §5.1) — the cards and
 *  Find included, which is what `pool` carries. */
export function facetOptions(
  facts: readonly AgentFacts[],
  f: ContactFilters,
  pool: (x: AgentFacts) => boolean,
): Record<FilterSection, { value: string; n: number }[]> {
  const under = (except: FilterSection) =>
    facts.filter((x) => pool(x) && matchesContactFilters(x, f, except));
  const count = (xs: AgentFacts[], hit: (x: AgentFacts) => boolean) => xs.filter(hit).length;
  const present = (pick: (x: AgentFacts) => string[]) =>
    [...new Set(facts.flatMap(pick))].sort((a, b) => a.localeCompare(b));

  const genresPresent = present((x) => x.genres);
  const locsPresent = present((x) => (x.loc ? [x.loc] : []));

  const standPool = under("stand");
  const genrePool = under("genres");
  const doorPool = under("door");
  const locPool = under("locs");
  const statusPool = under("status");
  const ratingPool = under("rating");

  return {
    stand: (Object.keys(STAND_LABEL) as StandKey[]).map((k) => ({ value: k, n: count(standPool, (x) => x.stand === k) })),
    genres: [...genresPresent.map((g) => ({ value: g, n: count(genrePool, (x) => x.genres.includes(g)) })),
      { value: NOT_RECORDED, n: count(genrePool, (x) => x.genres.length === 0) }],
    door: [
      { value: "open", n: count(doorPool, (x) => x.door === "open") },
      { value: "closed", n: count(doorPool, (x) => x.door === "closed") },
    ],
    locs: [...locsPresent.map((l) => ({ value: l, n: count(locPool, (x) => x.loc === l) })),
      { value: NOT_RECORDED, n: count(locPool, (x) => x.loc == null) }],
    status: STATUS_OPTIONS.map((s) => ({ value: s, n: count(statusPool, (x) => x.statusKey === s) })),
    rating: ([5, 4, 3, 2, 0] as RatingKey[]).map((r) => ({ value: String(r), n: count(ratingPool, (x) => ratingKeyOf(x.rating) === r) })),
  };
}

/* ── grouping (v11 §5.2) — a PARTITION of the already-sorted list ── */

export type GroupKey = "stand" | "door" | "agency" | "loc" | "status" | "none";
export const GROUP_OPTIONS: { key: GroupKey; label: string }[] = [
  { key: "stand", label: "Where you stand" },
  { key: "door", label: "Open to queries" },
  { key: "agency", label: "Agency" },
  { key: "loc", label: "Location" },
  { key: "status", label: "Query status" },
  { key: "none", label: "No grouping" },
];
/** §5.2's status order, with one addition the prompt's table cannot avoid: a live Revise &
 *  resubmit has to land somewhere, and dropping the agent would be worse than naming the stage.
 *  It slots where the journey puts it, between Full sent and Offer. */
const STATUS_GROUP_ORDER = [
  "Offer", "Revise & resubmit", "Full sent", "Full requested", "Partial sent", "Partial requested",
  "Queried", "Not queried yet", "Closed",
];
const deThe = (s: string) => s.replace(/^the\s+/i, "");

export interface ContactGroup { label: string; ids: string[]; extra?: string }

export function contactGroups(key: GroupKey, ordered: readonly AgentFacts[]): ContactGroup[] {
  if (key === "none") return [{ label: "All agents", ids: ordered.map((x) => x.agent.id) }];
  const buckets = new Map<string, string[]>();
  const put = (label: string, id: string) => {
    const l = buckets.get(label);
    if (l) l.push(id); else buckets.set(label, [id]);
  };
  for (const x of ordered) {
    if (key === "stand") put(STAND_LABEL[x.stand], x.agent.id);
    else if (key === "door") put(x.door === "open" ? "Open" : "Closed", x.agent.id);
    else if (key === "agency") put(x.agent.agency.trim() || "No agency", x.agent.id);
    else if (key === "loc") put(x.loc ?? "Location not recorded", x.agent.id);
    else put(x.statusKey === "Revise & resubmit" ? "Revise & resubmit" : x.statusKey, x.agent.id);
  }
  let labels = [...buckets.keys()];
  if (key === "stand") labels = (Object.values(STAND_LABEL)).filter((l) => buckets.has(l));
  else if (key === "door") labels = ["Open", "Closed"].filter((l) => buckets.has(l));
  else if (key === "status") labels = STATUS_GROUP_ORDER.filter((l) => buckets.has(l));
  else if (key === "agency") labels.sort((a, b) => (a === "No agency" ? 1 : b === "No agency" ? -1 : deThe(a).localeCompare(deThe(b))));
  else labels.sort((a, b) => (a === "Location not recorded" ? 1 : b === "Location not recorded" ? -1 : a.localeCompare(b)));
  return labels.map((label) => ({
    label,
    ids: buckets.get(label)!,
    extra: key === "stand" && label === STAND_LABEL.you ? "Offers, requests and nudges" : undefined,
  }));
}

/* ── sorting (v11 §5.3) — within groups when grouped ── */

export type SortKey = "due" | "name" | "agency" | "reply" | "rating" | "activity";
export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "due", label: "Next action due" },
  { key: "name", label: "Name, A to Z" },
  { key: "agency", label: "Agency, A to Z" },
  { key: "reply", label: "Replies fastest" },
  { key: "rating", label: "Your rating, highest" },
  { key: "activity", label: "Latest activity" },
];

/** "Next action due": past dates first (most over first), then soonest; the dateless after —
 *  open before closed, and genre matches before the rest (v11 §5.3). */
export function compareDue(a: AgentFacts, b: AgentFacts, genreHit: (x: AgentFacts) => boolean, nowMs: number): number {
  const dateOf = (x: AgentFacts) => (x.q && x.q.court !== "closed" ? x.q.expectedMs : null);
  const da = dateOf(a); const db = dateOf(b);
  if (da != null && db != null) return da - db;
  if (da != null) return -1;
  if (db != null) return 1;
  const openA = a.standing.kind === "open" || a.standing.kind === "none" ? 0 : 1;
  const openB = b.standing.kind === "open" || b.standing.kind === "none" ? 0 : 1;
  if (openA !== openB) return openA - openB;
  const gA = genreHit(a) ? 0 : 1; const gB = genreHit(b) ? 0 : 1;
  if (gA !== gB) return gA - gB;
  void nowMs;
  return 0;
}

export function sortFacts(
  facts: readonly AgentFacts[], key: SortKey, genreHit: (x: AgentFacts) => boolean, nowMs: number,
): AgentFacts[] {
  const by = [...facts];
  const name = (x: AgentFacts) => (x.agent.name.trim() || x.agent.agency).toLowerCase();
  switch (key) {
    case "due": by.sort((a, b) => compareDue(a, b, genreHit, nowMs) || name(a).localeCompare(name(b))); break;
    case "name": by.sort((a, b) => name(a).localeCompare(name(b))); break;
    case "agency": by.sort((a, b) => deThe(a.agent.agency || "￿").toLowerCase().localeCompare(deThe(b.agent.agency || "￿").toLowerCase()) || name(a).localeCompare(name(b))); break;
    case "reply": by.sort((a, b) => (a.agent.responseTimeWeeks ?? 999) - (b.agent.responseTimeWeeks ?? 999) || name(a).localeCompare(name(b))); break;
    case "rating": by.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1) || name(a).localeCompare(name(b))); break;
    case "activity": by.sort((a, b) => (b.lastMs ?? Date.parse(b.agent.dateAdded) ?? 0) - (a.lastMs ?? Date.parse(a.agent.dateAdded) ?? 0)); break;
  }
  return by;
}
