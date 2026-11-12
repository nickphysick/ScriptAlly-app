/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v5, Phase A (design-refs/phone-app-v5/phone-hub-v5.html) — THE ADDRESSES. Below 768px only, except the two
 * desktop lines at the foot, which keep a computer exactly where it was before v5's two new addresses existed.
 *
 * Today is the hub: `/queries` and `/agents` land on Today with that tab chosen, and their full lists are pushed
 * (`/queries/all`, Today's agent list). Packages, letters, versions and comps land on Materials on their own tab. A deep
 * link that names one thing (`?pkg=`, `?version=`, `?view=birds`, `?court=`, `?focus=`, `?q=`, `?build=` …) keeps going
 * to the page that opens it, as before.
 */
import { MATERIALS_PATH, QUERIES_ALL_PATH } from "./phoneV3Nav";
import { QueryStatus } from "../types";
import { stageTint, type BeLine } from "./qc150";
import { MONTHS_SHORT } from "./dates";

export type TodayTab = "queries" | "agents" | "activity";
export const TODAY_TABS: readonly { key: TodayTab; label: string }[] = [
  { key: "queries", label: "Queries" }, { key: "agents", label: "Agents" }, { key: "activity", label: "Activity" },
];
export type MatTab = "packages" | "letters" | "versions" | "comps";
export const MAT_TABS: readonly { key: MatTab; label: string }[] = [
  { key: "packages", label: "Packages" }, { key: "letters", label: "Letters" }, { key: "versions", label: "Versions" }, { key: "comps", label: "Comps" },
];

export const isTodayTab = (x: string | null | undefined): x is TodayTab => !!x && TODAY_TABS.some((t) => t.key === x);
export const isMatTab = (x: string | null | undefined): x is MatTab => !!x && MAT_TABS.some((t) => t.key === x);

/** the tab a page was last left on, for this session (storage refused → the first tab) */
export const TODAY_TAB_KEY = "pa5.today.tab";
export const MAT_TAB_KEY = "pa5.materials.tab";
export function readTab<T extends string>(key: string, ok: (x: string | null) => x is T, first: T): T {
  try { const v = window.sessionStorage.getItem(key); return ok(v) ? v : first; } catch { return first; }
}
export function saveTab(key: string, v: string): void {
  try { window.sessionStorage.setItem(key, v); } catch { /* storage refused: the tab is still chosen for this visit */ }
}

/** `/manuscripts#…` (the v4 book page's sections) → the Materials tab that now holds that section */
const HASH_TAB: Record<string, MatTab> = { materials: "letters", comps: "comps", versions: "versions", packages: "packages" };

/**
 * Where a phone address goes in v5, or null when it renders where it is. `search` and `hash` carry their `?` / `#`.
 * Pure: App.tsx calls it among its early returns and navigates with `replace`.
 */
export function phoneV5Redirect(path: string, search: string, hash: string): string | null {
  const p = path.replace(/\/+$/, "") || "/";
  const q = search && search !== "?" ? search : "";
  if (p === "/queries") return q ? `${QUERIES_ALL_PATH}${q}` : "/dashboard?tab=queries";
  if (p === "/agents") return "/dashboard?tab=agents";
  if (p === "/queries/packages") return q ? null : `${MATERIALS_PATH}?tab=packages`;
  if (p === "/materials/letters") return `${MATERIALS_PATH}?tab=letters`;
  /* with a `?version=` (or anything else) these keep their v4 landing on the book page (PhoneSectionLanding) */
  if (p === "/manuscripts/comps") return q ? null : `${MATERIALS_PATH}?tab=comps`;
  if (p === "/manuscripts/versions") return q ? null : `${MATERIALS_PATH}?tab=versions`;
  if (p === "/manuscripts") {
    const tab = HASH_TAB[hash.replace(/^#/, "")];
    /* `?pkg=` / `?version=` open that item on the book page; `?edit=` / `?newpackage` / `?copy` are PhoneMaterialsHost's */
    return tab && !q ? `${MATERIALS_PATH}?tab=${tab}` : null;
  }
  return null;
}

/** At 768px and up the two v5 addresses keep a computer where it went before they existed */
export function desktopV5Redirect(path: string, search: string): string | null {
  const p = path.replace(/\/+$/, "") || "/";
  if (p === QUERIES_ALL_PATH) return `/queries${search && search !== "?" ? search : ""}`;
  if (p === MATERIALS_PATH) return "/dashboard";
  return null;
}

/* ═══ Phase B — THE BIRDS-EYE BLOCK ON TODAY'S QUERIES TAB (phone-hub-v5.html `beRender`, `btrack`, `mt`, `sumBar`) ═══
   Pure. The rows, bars and dates are the desktop Birds-eye engine's (lib/qc150 `beLine`, through lib/phoneV41
   `phoneGroups`); nothing here dates a stage. What is added is the order the block shows them in, the window the block
   draws, and the words. ⚠️ COPY: never "overdue" or "late". */

const DAY_MS = 86_400_000;
export type BeCourt = "you" | "agent" | "quiet";
export const BE_COURTS: readonly BeCourt[] = ["you", "agent", "quiet"];
/** at most this many rows on Today; the rest are in the full view */
export const BE_MAX = 8;
/** the three figures' words, and the filter's name */
export const BE_COUNT_WORDS: Record<BeCourt, string> = { you: "with you", agent: "with agents", quiet: "gone quiet" };
export const BE_GROUP_NAME: Record<BeCourt, string> = { you: "With you", agent: "With agents", quiet: "Gone quiet" };
export const isBeCourt = (x: string | null | undefined): x is BeCourt => x === "you" || x === "agent" || x === "quiet";

/** nearest their date first: by due date ascending (a passed date is nearest), undated last; ties keep the engine's order */
export function nearestFirst<T extends { dueMs: number | null }>(xs: readonly T[]): T[] {
  return xs.map((x, i) => ({ x, i })).sort((a, b) => {
    const da = a.x.dueMs ?? Infinity, db = b.x.dueMs ?? Infinity;
    return da === db ? a.i - b.i : da - db;
  }).map((p) => p.x);
}
/** the rows on show: the group's (or everyone's), nearest their date, cut to eight; `cut` when some were left out */
export function cutRows<T extends { dueMs: number | null; court: BeCourt }>(all: readonly T[], court: BeCourt | null, n = BE_MAX): { rows: T[]; total: number; cut: boolean } {
  const pool = nearestFirst(court ? all.filter((r) => r.court === court) : all);
  return { rows: pool.slice(0, n), total: pool.length, cut: pool.length > n };
}
/** the line above the rows: "Nearest their date", or the filter's name; a cut group says how many it shows */
export function beLabel(court: BeCourt | null, cut: boolean, shown: number): string {
  if (!court) return "Nearest their date";
  return cut ? `${BE_GROUP_NAME[court]} · the ${shown} nearest their date` : BE_GROUP_NAME[court];
}
/** the footer: "All 26 queries, against their dates"; one query, "Your query, against its date"; a filter names its group */
export function beFooter(n: number, court: BeCourt | null): string {
  if (court) return n === 1 ? `The one ${BE_COUNT_WORDS[court]}, against its date` : `All ${n} ${BE_COUNT_WORDS[court]}, against their dates`;
  return n === 1 ? "Your query, against its date" : `All ${n} queries, against their dates`;
}
/** where the footer goes: the full Birds-eye view, carrying the filter */
export const beViewPath = (court: BeCourt | null): string => `${QUERIES_ALL_PATH}?view=birds${court ? `&court=${court}` : ""}`;
export const BE_FEW_LINE = "Each query you log gets a line here. The bar fills as the days pass.";

/** the surname: the last word of the agent's name (the whole name when it is one word) */
export function surname(name: string): string {
  const w = (name || "").trim().split(/\s+/).filter(Boolean);
  return w.length ? w[w.length - 1] : "";
}

/** the mini track's stage, 0–3: queried · partial · full · offer (QueryPageV4 `trackStage`'s nodes; closed reads 0) */
export function miniStage(status: string): 0 | 1 | 2 | 3 {
  if (status === QueryStatus.OFFER || status === QueryStatus.SIGNED) return 3;
  if (status === QueryStatus.FULL_REQUESTED || status === QueryStatus.FULL_SENT || status === QueryStatus.REVISE_RESUBMIT || status === QueryStatus.RESUBMITTED) return 2;
  if (status === QueryStatus.PARTIAL_REQUESTED || status === QueryStatus.PARTIAL_SENT) return 1;
  return 0;
}
/** the agent has asked for something (a partial, the full, a revision): the current stage is a hollow ring */
export const hasAsked = (status: string): boolean => stageTint(status as QueryStatus) === "r";

/**
 * The window fits the rows on show (ref: BK = clamp(14, 63, maxAgo + 4), FW = clamp(14, 56, maxDue + 5) days): from just
 * before the earliest stage date to just after the latest date, never under two weeks either side of today, never more
 * than nine weeks back or eight ahead.
 */
export const BE_BACK = [14, 63] as const;
export const BE_AHEAD = [14, 56] as const;
const clamp = (lo: number, hi: number, x: number): number => Math.max(lo, Math.min(hi, x));
export function beWindow(lines: readonly Pick<BeLine, "past" | "cur" | "dueMs">[], nowMs: number): { fromMs: number; toMs: number; back: number; ahead: number } {
  let ago = 0, due = 0;
  for (const l of lines) {
    const s = l.past[0]?.fromMs ?? l.cur?.fromMs ?? null;
    if (s != null && Number.isFinite(s)) ago = Math.max(ago, Math.ceil((nowMs - s) / DAY_MS));
    if (l.dueMs != null) due = Math.max(due, Math.ceil((l.dueMs - nowMs) / DAY_MS));
  }
  const back = clamp(BE_BACK[0], BE_BACK[1], ago + 4), ahead = clamp(BE_AHEAD[0], BE_AHEAD[1], due + 5);
  return { fromMs: nowMs - back * DAY_MS, toMs: nowMs + ahead * DAY_MS, back, ahead };
}

/**
 * One row's bar track, in percent of the window (ref `btrack` with beP "B", "the bar carries on"): earlier stages
 * faded; the current stage solid to today and paler to its date, with a notch at the date; past its date the bar carries
 * on from the notch to today in a deeper tone (`deep`). A date beyond the window fades off the right edge, no notch.
 * From the engine's own line: its stage dates and its due date are used as they are.
 */
export interface BeTrack {
  past: { l: number; w: number; status: string }[];
  cur: null | { l: number; solid: number; rem: number; notch: number | null; deep: null | { l: number; w: number }; off: boolean; status: string };
  /** today, in percent */
  t: number;
}
export function beTrack(line: Pick<BeLine, "past" | "cur" | "dueMs" | "row">, win: { fromMs: number; toMs: number }, nowMs: number): BeTrack {
  const span = win.toMs - win.fromMs || 1;
  const p = (ms: number) => clamp(0, 100, ((ms - win.fromMs) / span) * 100);
  const t = p(nowMs);
  const stageOf = new Map(line.row.history.spans.map((s) => [s.startMs, String(s.status)]));
  const past = line.past.map((b) => ({ l: p(b.fromMs), w: Math.max(0, p(b.toMs) - p(b.fromMs)), status: stageOf.get(b.fromMs) ?? String(line.row.status) })).filter((x) => x.w > 0);
  const c = line.cur;
  if (!c) return { past, cur: null, t };
  const l = p(c.fromMs), status = String(line.row.status);
  if (line.dueMs == null) return { past, cur: { l, solid: Math.max(0, t - l), rem: 0, notch: null, deep: null, off: false, status }, t };
  const off = line.dueMs > win.toMs;
  const e = p(line.dueMs);
  return {
    past, t,
    cur: {
      l, status, off,
      rem: Math.max(0, e - l),
      solid: Math.max(0, Math.min(t, e) - l),
      notch: off ? null : e,
      deep: c.overdue && t > e ? { l: e, w: t - e } : null,
    },
  };
}

/** the month labels over the rows (ref): the window's first month when it starts before the 24th, then each 1st, and
 *  none in the last tenth (it would run off the edge). Percent of the window. A window is at least 28 days, so two 1sts
 *  are never closer than 12%; only the window's first label can be crowded, and it gives way. */
export function beMonthLabels(win: { fromMs: number; toMs: number }): { l: number; label: string; ms: number }[] {
  const span = win.toMs - win.fromMs || 1;
  const out: { l: number; label: string; ms: number }[] = [];
  const d0 = new Date(win.fromMs);
  if (d0.getDate() < 24) out.push({ l: 1, label: MONTHS_SHORT[d0.getMonth()], ms: win.fromMs });
  const d = new Date(d0.getFullYear(), d0.getMonth() + 1, 1);
  for (; d.getTime() <= win.toMs; d.setMonth(d.getMonth() + 1)) {
    const l = ((d.getTime() - win.fromMs) / span) * 100;
    if (l >= 90) continue;
    /* the window's own first month gives way to a 1st that would crowd it */
    if (out.length && l - out[out.length - 1].l < 12) out.pop();
    out.push({ l: Math.max(1, l), label: MONTHS_SHORT[d.getMonth()], ms: d.getTime() });
  }
  return out;
}

/* ═══ Phase C — TODAY'S AGENTS TAB: the summary, List health's groups, the gap-filling session ═══
   Pure. The agents' courts are the phone's own query rows (`V3Query.court`, via AgentsV4 `queryByAgent`: each agent's
   latest query, a live one over a closed one); the gaps, their groups and their order are Housekeeping's (`hkModel`,
   through lib/dashList `houseModel`). Nothing here decides a gap or a court. */

export type AgentGroup = "toquery" | "querying" | "closed";
export const AGENT_GROUPS: readonly AgentGroup[] = ["toquery", "querying", "closed"];
export const AGENT_GROUP_WORDS: Record<AgentGroup, string> = { toquery: "to query", querying: "querying", closed: "closed" };
export const AGENT_GROUP_NAME: Record<AgentGroup, string> = { toquery: "To query", querying: "Querying", closed: "Closed" };
export const isAgentGroup = (x: string | null | undefined): x is AgentGroup => x === "toquery" || x === "querying" || x === "closed";

/** one agent's group from their latest query's court: none → to query; closed → closed; any other court → querying */
export const agentGroupOf = (latest: { court: string } | null | undefined): AgentGroup =>
  !latest ? "toquery" : latest.court === "closed" ? "closed" : "querying";

/**
 * The agents on the list, split three ways by ONE source (each agent's latest query, `queryByAgent`). Every agent is in
 * exactly one group, so the three figures always add up to "N agents on your list". A query to an agent no longer on
 * the list counts nowhere. Order within a group is the input's.
 */
export function agentPartition<A extends { id: string }>(agents: readonly A[], latest: ReadonlyMap<string, { court: string }>): Record<AgentGroup, A[]> {
  const out: Record<AgentGroup, A[]> = { toquery: [], querying: [], closed: [] };
  for (const a of agents) out[agentGroupOf(latest.get(a.id))].push(a);
  return out;
}

/** "14 gaps across 9 agents"; "1 gap across 1 agent" */
export function gapsAcross(gaps: number, agents: number): string {
  return `${gaps} ${gaps === 1 ? "gap" : "gaps"} across ${agents} ${agents === 1 ? "agent" : "agents"}`;
}
/** List health shows unless the list is at 100% with nothing left to fill (and there is a list at all) */
export const healthShows = (h: { pct: number; gaps: number } | null): boolean => !!h && !(h.pct >= 100 && h.gaps === 0);

/** each of Housekeeping's four groups (GROUP_ORDER) with how many of the visible gaps fall in it */
export function gapGroupCounts<G extends string>(order: readonly G[], items: readonly { group: G }[]): { group: G; n: number }[] {
  return order.map((group) => ({ group, n: items.filter((i) => i.group === group).length }));
}

/**
 * The session's queue: the visible gaps in Housekeeping's own order (`hkModel`'s items, the order the desktop drawer's
 * "One at a time" runs). Opened from a group's row, that group's gaps come first, in the same order, then the rest.
 */
export function gapQueue<T extends { group: string }>(items: readonly T[], group: string | null): T[] {
  if (!group) return [...items];
  return [...items.filter((i) => i.group === group), ...items.filter((i) => i.group !== group)];
}

export type GapOutcome = "saved" | "later" | "skipped";
/** the progress strip: one segment per gap in the session — filled ones navy ("on"), the current one marked ("cur") */
export function gapStrip(total: number, at: number, outcomes: readonly (GapOutcome | undefined)[]): ("on" | "cur" | "")[] {
  return Array.from({ length: total }, (_, k) => (outcomes[k] === "saved" ? "on" : k === at ? "cur" : ""));
}
/** where the session goes after gap `at`: the next gap still open in the live model, or null when there is none */
export function nextGap(keys: readonly string[], at: number, open: ReadonlySet<string>): number | null {
  for (let k = at + 1; k < keys.length; k += 1) if (open.has(keys[k])) return k;
  return null;
}

/** "queried today" · "queried 4 days ago" · "queried 3 weeks ago" · "queried 2 months ago" */
export function queriedAgo(ms: number, nowMs: number): string {
  const d = Math.floor((nowMs - ms) / DAY_MS);
  if (d < 1) return "queried today";
  if (d < 14) return `queried ${d} ${d === 1 ? "day" : "days"} ago`;
  if (d < 63) return `queried ${Math.round(d / 7)} weeks ago`;
  const m = Math.round(d / 30.44);
  return `queried ${m} ${m === 1 ? "month" : "months"} ago`;
}
