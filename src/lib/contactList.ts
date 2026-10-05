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
import { genrePluralLower } from "./contactStrip";

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
    /* v13: the lower-case PLURAL ("want thrillers"), the strip's and Housekeeping's own word for it */
    genre: ms?.genre && match ? genrePluralLower(ms.genre) : null,
    want: wanters.length,
    fresh: wanters.filter((a) => standing.get(a.id)?.kind === "none").length,
  };
}

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
  /** any live agent-court row past its date — the row's ink edge */
  pastExpected: boolean;
  /** the location as displayed: city, else the country's name, else null */
  loc: string | null;
  door: "open" | "closed";
  /** v13: the door as the agent's record states it — Open, Closed, or Not stated (an absent or
   *  Unknown status, which `door` reads as open) */
  openKey: OpenKey;
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
    openKey: openKeyOf(a),
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

/* ── v13 §5: the sections, in the panel's order. OR within a section, AND across. Every v12 facet
   is kept (ruling Q4); "Open to queries" replaces the door's two-way and grows "Not stated"; "Where
   you stand" grows Offer; "Fit for the book" and "Profile" are new. ── */
export type WhereKey = StandKey | "offer";
export type FitKey = "takes" | "doesnt";
export type ProfileKey = "gaps";
export interface ContactFilters {
  stand: WhereKey[];
  fit: FitKey[];
  open: OpenKey[];
  status: string[];
  genres: string[];
  locs: string[];
  rating: RatingKey[];
  profile: ProfileKey[];
}
export const emptyContactFilters = (): ContactFilters =>
  ({ stand: [], fit: [], open: [], status: [], genres: [], locs: [], rating: [], profile: [] });
export const contactFilterCount = (f: ContactFilters): number =>
  f.stand.length + f.fit.length + f.open.length + f.status.length + f.genres.length + f.locs.length + f.rating.length + f.profile.length;

/** what a filter needs to know that the facts alone cannot say: the book's genre, and the gaps */
export interface FilterCtx {
  fits: (x: AgentFacts) => boolean;
  gaps: (x: AgentFacts) => boolean;
}
const NO_CTX: FilterCtx = { fits: () => false, gaps: () => false };

export const ratingKeyOf = (r: number | null): RatingKey => (r == null ? 0 : r <= 2 ? 2 : (r as RatingKey));

const sectionMatch = {
  /* "Your move" counts an offer too (the mock's `you`, and v12's union); Offer alone is the offer */
  stand: (x: AgentFacts, v: string[]) => v.length === 0 || v.some((k) => (k === "offer" ? x.q?.court === "offer" : x.stand === k)),
  fit: (x: AgentFacts, v: string[], c: FilterCtx) => v.length === 0 || v.some((k) => (k === "takes" ? c.fits(x) : !c.fits(x))),
  open: (x: AgentFacts, v: string[]) => v.length === 0 || v.includes(x.openKey),
  status: (x: AgentFacts, v: string[]) => v.length === 0 || v.includes(x.statusKey),
  genres: (x: AgentFacts, v: string[]) =>
    v.length === 0 || v.some((g) => (g === NOT_RECORDED ? x.genres.length === 0 : x.genres.includes(g))),
  locs: (x: AgentFacts, v: string[]) =>
    v.length === 0 || v.some((l) => (l === NOT_RECORDED ? x.loc == null : x.loc === l)),
  rating: (x: AgentFacts, v: RatingKey[]) => v.length === 0 || v.includes(ratingKeyOf(x.rating)),
  profile: (x: AgentFacts, v: string[], c: FilterCtx) => v.length === 0 || c.gaps(x),
} as const;
export type FilterSection = keyof typeof sectionMatch;
export const FILTER_SECTIONS: FilterSection[] = ["stand", "fit", "open", "status", "genres", "locs", "rating", "profile"];

export const matchesContactFilters = (x: AgentFacts, f: ContactFilters, except?: FilterSection, ctx: FilterCtx = NO_CTX): boolean =>
  FILTER_SECTIONS.every((k) =>
    k === except ? true : (sectionMatch[k] as (x: AgentFacts, v: unknown[], c: FilterCtx) => boolean)(x, f[k] as unknown[], ctx));

/** The options each section offers, from the data (locations and genres present), with counts
 *  FACETED: every option counted under all the OTHER active narrowing (v11 §5.1) — the cards and
 *  Find included, which is what `pool` carries. */
export function facetOptions(
  facts: readonly AgentFacts[],
  f: ContactFilters,
  pool: (x: AgentFacts) => boolean,
  ctx: FilterCtx = NO_CTX,
): Record<FilterSection, { value: string; n: number }[]> {
  const under = (except: FilterSection) =>
    facts.filter((x) => pool(x) && matchesContactFilters(x, f, except, ctx));
  const count = (xs: AgentFacts[], hit: (x: AgentFacts) => boolean) => xs.filter(hit).length;
  const present = (pick: (x: AgentFacts) => string[]) =>
    [...new Set(facts.flatMap(pick))].sort((a, b) => a.localeCompare(b));

  const genresPresent = present((x) => x.genres);
  const locsPresent = present((x) => (x.loc ? [x.loc] : []));
  const P = Object.fromEntries(FILTER_SECTIONS.map((k) => [k, under(k)])) as Record<FilterSection, AgentFacts[]>;

  return {
    stand: (["you", "agent", "offer", "none", "closed"] as WhereKey[]).map((k) => ({
      value: k, n: count(P.stand, (x) => (k === "offer" ? x.q?.court === "offer" : x.stand === k)),
    })),
    fit: [
      { value: "takes", n: count(P.fit, (x) => ctx.fits(x)) },
      { value: "doesnt", n: count(P.fit, (x) => !ctx.fits(x)) },
    ],
    open: (["open", "closed", "unstated"] as OpenKey[]).map((k) => ({ value: k, n: count(P.open, (x) => x.openKey === k) })),
    status: STATUS_OPTIONS.map((st) => ({ value: st, n: count(P.status, (x) => x.statusKey === st) })),
    genres: [...genresPresent.map((g) => ({ value: g, n: count(P.genres, (x) => x.genres.includes(g)) })),
      { value: NOT_RECORDED, n: count(P.genres, (x) => x.genres.length === 0) }],
    locs: [...locsPresent.map((l) => ({ value: l, n: count(P.locs, (x) => x.loc === l) })),
      { value: NOT_RECORDED, n: count(P.locs, (x) => x.loc == null) }],
    rating: ([5, 4, 3, 2, 0] as RatingKey[]).map((r) => ({ value: String(r), n: count(P.rating, (x) => ratingKeyOf(x.rating) === r) })),
    profile: [{ value: "gaps", n: count(P.profile, (x) => ctx.gaps(x)) }],
  };
}

/* ── grouping (v11 §5.2) — a PARTITION of the already-sorted list ── */

export type GroupKey = "letter" | "stand" | "agency" | "loc" | "door" | "fit" | "status" | "none";
/** v13 §5: the mock's order, plus Query status (kept, ruling Q4). `line` is the option's italic line. */
export const GROUP_OPTIONS: { key: GroupKey; label: string; line?: string }[] = [
  { key: "letter", label: "Letter", line: "Surname initial, with the A\u2013Z strip" },
  { key: "stand", label: "Where you stand" },
  { key: "agency", label: "Agency" },
  { key: "loc", label: "Location" },
  { key: "door", label: "Open to queries" },
  { key: "fit", label: "Fit for your book" },
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


export interface ContactGroup { label: string; ids: string[]; extra?: string }

export function contactGroups(
  key: GroupKey, ordered: readonly AgentFacts[], ctx: { fits?: (x: AgentFacts) => boolean; genreWord?: string | null } = {},
): ContactGroup[] {
  const takes = `Takes ${ctx.genreWord ?? "your genre"}`, doesnt = `Doesn\u2019t list ${ctx.genreWord ?? "your genre"}`;
  if (key === "none") return [{ label: "All agents", ids: ordered.map((x) => x.agent.id) }];
  const buckets = new Map<string, string[]>();
  const put = (label: string, id: string) => {
    const l = buckets.get(label);
    if (l) l.push(id); else buckets.set(label, [id]);
  };
  for (const x of ordered) {
    if (key === "letter") put(surnameInitial(x.agent), x.agent.id);
    else if (key === "stand") put(STAND_LABEL[x.stand], x.agent.id);
    else if (key === "door") put(OPEN_LABEL[x.openKey], x.agent.id);
    else if (key === "fit") put(ctx.fits?.(x) ? takes : doesnt, x.agent.id);
    else if (key === "agency") put(x.agent.agency.trim() || "No agency", x.agent.id);
    else if (key === "loc") put(x.loc ?? "Location not recorded", x.agent.id);
    else put(x.statusKey === "Revise & resubmit" ? "Revise & resubmit" : x.statusKey, x.agent.id);
  }
  let labels = [...buckets.keys()];
  if (key === "letter") labels.sort((a, b) => a.localeCompare(b));
  else if (key === "stand") labels = (Object.values(STAND_LABEL)).filter((l) => buckets.has(l));
  else if (key === "door") labels = [OPEN_LABEL.open, OPEN_LABEL.closed, OPEN_LABEL.unstated].filter((l) => buckets.has(l));
  else if (key === "fit") labels = [takes, doesnt].filter((l) => buckets.has(l));
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

export type SortKey = "surname" | "due" | "name" | "agency" | "reply" | "rating" | "activity";
/** v13 §5: the mock's seven, each with its italic line and the direction toggle's two words */
export const SORT_OPTIONS: { key: SortKey; label: string; line: string; dir: [string, string] }[] = [
  { key: "surname", label: "Surname", line: "A to Z by family name", dir: ["A to Z", "Z to A"] },
  { key: "name", label: "First name", line: "A to Z by first name", dir: ["A to Z", "Z to A"] },
  { key: "agency", label: "Agency", line: "Agencies A to Z, then surname", dir: ["A to Z", "Z to A"] },
  { key: "reply", label: "Replies fastest", line: "Shortest reply time first; unknown last", dir: ["Fastest first", "Slowest first"] },
  { key: "due", label: "Next date", line: "Soonest answer, send-by or reply date first", dir: ["Soonest first", "Latest first"] },
  { key: "rating", label: "Your rating", line: "Highest rated first", dir: ["Highest first", "Lowest first"] },
  { key: "activity", label: "Latest activity", line: "Most recently changed first", dir: ["Most recent first", "Oldest first"] },
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

/**
 * Sort within groups. ⚠️ REVERSED KEEPS THE MISSING LAST (the house law: an undated row sorts last in
 * either direction) — reversing a list whose tail is "no date" would otherwise lead with the agents
 * nobody can sort. Names are never missing, so the three A-to-Z sorts simply reverse.
 */
export function sortFacts(
  facts: readonly AgentFacts[], key: SortKey, genreHit: (x: AgentFacts) => boolean, nowMs: number, reversed = false,
): AgentFacts[] {
  const by = [...facts];
  const name = (x: AgentFacts) => (x.agent.name.trim() || x.agent.agency).toLowerCase();
  /* a stated window only — the quick-add stub 0 is "unknown", not "replies at once" */
  const weeks = (x: AgentFacts) => (typeof x.agent.responseTimeWeeks === "number" && x.agent.responseTimeWeeks > 0 ? x.agent.responseTimeWeeks : null);
  const due = (x: AgentFacts) => (x.q && x.q.court !== "closed" ? x.q.expectedMs : null);
  const active = (x: AgentFacts) => x.lastMs ?? (Date.parse(x.agent.dateAdded) || null);
  const missing: Partial<Record<SortKey, (x: AgentFacts) => boolean>> = {
    reply: (x) => weeks(x) == null, due: (x) => due(x) == null, rating: (x) => x.rating == null, activity: (x) => active(x) == null,
  };
  switch (key) {
    case "surname": by.sort((a, b) => surnameOf(a.agent).localeCompare(surnameOf(b.agent)) || name(a).localeCompare(name(b))); break;
    case "due": by.sort((a, b) => compareDue(a, b, genreHit, nowMs) || name(a).localeCompare(name(b))); break;
    case "name": by.sort((a, b) => name(a).localeCompare(name(b))); break;
    case "agency": by.sort((a, b) => deThe(a.agent.agency || "\uffff").toLowerCase().localeCompare(deThe(b.agent.agency || "\uffff").toLowerCase()) || name(a).localeCompare(name(b))); break;
    case "reply": by.sort((a, b) => (weeks(a) ?? 999) - (weeks(b) ?? 999) || name(a).localeCompare(name(b))); break;
    case "rating": by.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1) || name(a).localeCompare(name(b))); break;
    case "activity": by.sort((a, b) => (active(b) ?? 0) - (active(a) ?? 0) || name(a).localeCompare(name(b))); break;
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

