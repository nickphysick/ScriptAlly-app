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
import { QueryStatus, type CompTitle, type ManuscriptVersion, type Query, type SubmissionPackage } from "../types";
import { isSlotFilled, packageMetrics, rankPackagesByRequests, strongestPackage, type RateStat } from "./packageMetrics";
import { factsOf, queriesWithPiece, type Facts, type PieceContext } from "./packagesV40";
import type { AnalyticsRow } from "./analytics";
import type { V2Version } from "./bookVersions";
import { versionsUnlocked, type Entitlement } from "./entitlements";
import { stageTint, type BeLine } from "./qc150";
import { MONTHS_SHORT } from "./dates";
import { canSend, composeFor, type ComposeKey } from "./foundingCard";
import type { FeedbackKind } from "./beta";

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
 * on from the notch to today in a deeper tone (`deep`). A date beyond the window fades off the right edge, no notch; a
 * date before its start has no notch and the deeper segment runs in from the left edge.
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
      /* a date before the window's start has no notch either: clamped to the left edge it would mark a day it is not
         (PA5-6, Phase H) — the deeper segment simply runs in from the edge to today */
      notch: off || line.dueMs < win.fromMs ? null : e,
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

/* ═══ Phase D — TO DO, THE UP NEXT CARD (phone-hub-v5.html `todoPh`, `cardHTML`; phone-upnext-v1.html's script) ═══
   Pure. The tasks are the To-do workspace's own (`useV3().ordered`, the dock badge's array); nothing here records
   anything. What is added: today's local order ("Not now" sends a card to the back, for today only), the swipe's axis
   and threshold, the card's date chips and the stamp's word. ⚠️ COPY: never "overdue" or "late". */

/** "Not now" for today: the keys sent to the back, in the order they were sent. Another day starts empty. */
export interface TodoOrder { day: string; back: string[] }
export const TODO_ORDER_KEY = "pa5.todo.order";

/** the saved order if it is today's, else today's empty one (a malformed value is treated as none) */
export function orderForDay(saved: unknown, todayYmd: string): TodoOrder {
  const o = saved as Partial<TodoOrder> | null;
  if (!o || typeof o !== "object" || o.day !== todayYmd || !Array.isArray(o.back)) return { day: todayYmd, back: [] };
  return { day: todayYmd, back: o.back.filter((k): k is string => typeof k === "string") };
}
/** the card to the back of today's pile: out of wherever it was, onto the end */
export function sendToBack(o: TodoOrder, key: string, todayYmd: string): TodoOrder {
  const base = o.day === todayYmd ? o.back : [];
  return { day: todayYmd, back: [...base.filter((k) => k !== key), key] };
}
/**
 * The pile, top first: any key brought back to the front (an Undo restored its task) first, then the workspace's own
 * order without the ones sent back, then those, in the order they were sent. Only keys still in `keys` appear: a task
 * that left the list leaves the pile, and a new one takes its place in the workspace's order.
 */
export function deckOrder(keys: readonly string[], back: readonly string[], front: readonly string[] = []): string[] {
  const live = new Set(keys);
  const f = front.filter((k, i) => live.has(k) && front.indexOf(k) === i);
  const b = back.filter((k, i) => live.has(k) && !f.includes(k) && back.indexOf(k) === i);
  const lead = new Set([...f, ...b]);
  return [...f, ...keys.filter((k) => !lead.has(k)), ...b];
}
export function readTodoOrder(todayYmd: string): TodoOrder {
  try { const raw = window.localStorage.getItem(TODO_ORDER_KEY); return orderForDay(raw ? JSON.parse(raw) : null, todayYmd); }
  catch { return { day: todayYmd, back: [] }; }
}
export function saveTodoOrder(o: TodoOrder): void {
  try { window.localStorage.setItem(TODO_ORDER_KEY, JSON.stringify(o)); } catch { /* storage refused: the order holds for this visit */ }
}

/** the prototype's drag: the axis is decided on the first few pixels; a vertical start is the page's scroll */
export const SWIPE_SLOP = 8;
export function dragAxis(dx: number, dy: number, slop: number = SWIPE_SLOP): "x" | "y" | null {
  if (Math.abs(dx) > slop && Math.abs(dx) > Math.abs(dy)) return "x";
  if (Math.abs(dy) > slop) return "y";
  return null;
}
/** past a third of the card's width it commits: right opens the task's journey, left is "Not now"; short of it, back */
export function swipeOutcome(dx: number, width: number): "do" | "later" | "back" {
  const w = width / 3;
  if (!(w > 0)) return "back";
  if (dx > w) return "do";
  if (dx < -w) return "later";
  return "back";
}
/** the "Do it" / "Later" labels fade in with the drag (the prototype's 110px) */
export const dragLabel = (dx: number): { l: number; r: number } => ({ l: Math.min(1, Math.max(0, -dx / 110)), r: Math.min(1, Math.max(0, dx / 110)) });

const ymdUtc = (ymd: string): number => { const [y, m, d] = ymd.slice(0, 10).split("-").map(Number); return Date.UTC(y, (m || 1) - 1, d || 1); };
const ymdOfMs = (ms: number): string => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const dayDiff = (fromYmd: string, toYmd: string): number => Math.round((ymdUtc(toYmd) - ymdUtc(fromYmd)) / DAY_MS);
/** "8 days", "3 weeks", "2 months" — whole days between two calendar days */
function spanDays(d: number): string {
  if (d < 14) return `${d} ${d === 1 ? "day" : "days"}`;
  if (d < 63) return `${Math.round(d / 7)} weeks`;
  const m = Math.max(1, Math.round(d / 30.44));
  return `${m} ${m === 1 ? "month" : "months"}`;
}
/** "20 Nov", with the year when it is not this year's */
function dayLabel(ymd: string, todayYmd: string): string {
  const [y, m, d] = ymd.slice(0, 10).split("-").map(Number);
  return `${d} ${MONTHS_SHORT[(m || 1) - 1]}${ymd.slice(0, 4) === todayYmd.slice(0, 4) ? "" : ` ${y}`}`;
}
const relWords = (d: number): string => (d === 0 ? "today" : d === 1 ? "tomorrow" : d === -1 ? "yesterday" : d > 0 ? `in ${spanDays(d)}` : `${spanDays(-d)} ago`);

export interface TodoChipIn {
  kind: string;
  /** the task's own date (the workspace's: the tray dial's day, or an own task's due date) */
  dueYmd: string | null;
  /** the query's reply date as the phone reads it (V3Query.replyMs) */
  replyMs: number | null;
  /** Gone quiet: days since the last thing was sent */
  quietDays: number | null;
}
const BY: Record<string, string> = { offer: "Decide by", send: "Send by", rr: "Send by", nudge: "Nudge by", own: "Do by" };
/**
 * The card's two chips: the date in words ("Decide by 20 Nov") and how far off it is ("in 8 days"). A passed date is
 * said plainly ("Reply was due 21 Oct", "3 weeks ago"), never as a verdict. Null where the task has no date to read.
 */
export function todoChips(t: TodoChipIn, nowMs: number): { lead: string; rel: string } | null {
  const today = ymdOfMs(nowMs);
  if (t.kind === "fix" || t.kind === "batch") return null;
  /* gone quiet, or a nudge whose reply date has passed: the reply date, else the last send */
  if (t.kind === "quiet" || t.kind === "nudge") {
    if (t.replyMs != null && Number.isFinite(t.replyMs) && ymdOfMs(t.replyMs) < today) {
      const r = ymdOfMs(t.replyMs);
      return { lead: `Reply was due ${dayLabel(r, today)}`, rel: relWords(dayDiff(today, r)) };
    }
    if (t.kind === "quiet") {
      if (t.quietDays == null || !(t.quietDays >= 0)) return null;
      const s = ymdOfMs(nowMs - t.quietDays * DAY_MS);
      return { lead: `Last sent ${dayLabel(s, today)}`, rel: relWords(dayDiff(today, s)) };
    }
  }
  if (!t.dueYmd || !/^\d{4}-\d{2}-\d{2}/.test(t.dueYmd)) return null;
  const ymd = t.dueYmd.slice(0, 10);
  const d = dayDiff(today, ymd);
  const by = BY[t.kind];
  const lead = d < 0 ? `Was due ${dayLabel(ymd, today)}` : by ? `${by} ${dayLabel(ymd, today)}` : `Due ${dayLabel(ymd, today)}`;
  return { lead, rel: relWords(d) };
}

/** the stamp's word, from the task's verb (the workspace's own `type`); an own task is "Done" */
export function stampWord(t: { kind: string; type: string | null }): string {
  if (t.kind === "own") return "Done";
  switch (t.type) {
    case "Send": return "Sent";
    case "Decide": return "Answered";
    case "Nudge": return "Nudged";
    case "Close": return "Closed";
    case "Fill in": return "Saved";
    default: return "Done";
  }
}

/** today's cleared acts: the To-do workspace's own `done` (todoCleared `clearedThisWeek`) from London's midnight */
export const doneToday = <T extends { at: number }>(done: readonly T[], dayStartMs: number): T[] => done.filter((a) => a.at >= dayStartMs);

/** the header's line: "7 things need you · 2 done today"; with nothing done, only the first half */
export function todoHeadLine(need: number, done: number): string {
  const first = need > 0 ? `${need} ${need === 1 ? "thing needs" : "things need"} you` : "Nothing needs you";
  return done > 0 ? `${first} · ${done} done today` : first;
}

/* ═══ Phase E — THE FULL BIRDS-EYE VIEW (phone-birds-eye-dense-v1.html's rows; v4.1's engine, replay, pan and expansion)
   Pure. The rows, their groups and their dates are the desktop engine's (`phoneGroups` → `beLine`); a row's bar is the
   block's own `beTrack`, read in days instead of percent so the view can pan and zoom it. Nothing here decides a date. */

/** the three spans (v4.1's zoom chips, renamed): how many days the track shows across its width */
export type BvSpan = "1m" | "3m" | "6m";
export const BV_SPANS: readonly { k: BvSpan; label: string; days: number }[] = [
  { k: "1m", label: "1 month", days: 30 }, { k: "3m", label: "3 months", days: 90 }, { k: "6m", label: "6 months", days: 182 },
];
/** it opens on 3 months the first time; after that on the last span chosen */
export const BV_SPAN_FIRST: BvSpan = "3m";
export const BV_SPAN_KEY = "pa5.birds-view.span";
export const isBvSpan = (x: string | null | undefined): x is BvSpan => x === "1m" || x === "3m" || x === "6m";
export const bvSpanDays = (k: BvSpan): number => (BV_SPANS.find((s) => s.k === k) ?? BV_SPANS[1]).days;
export function readBvSpan(): BvSpan {
  try { const v = window.localStorage.getItem(BV_SPAN_KEY); return isBvSpan(v) ? v : BV_SPAN_FIRST; } catch { return BV_SPAN_FIRST; }
}
export function saveBvSpan(k: BvSpan): void {
  try { window.localStorage.setItem(BV_SPAN_KEY, k); } catch { /* storage refused: the span is this visit's only */ }
}

/** the name column: 116px on a phone held upright (mini track + surname); landscape keeps v4.1's wider 184px (full name) */
export const BV_NAME_W = 116;
export const BV_NAME_W_LAND = 184;

/** a group over five folds to "Show N more" */
export const BV_FOLD_AT = 5;
export function bvFold<T>(rows: readonly T[], shown: boolean, at: number = BV_FOLD_AT): { rows: T[]; more: number } {
  if (shown || rows.length <= at) return { rows: [...rows], more: 0 };
  return { rows: rows.slice(0, at), more: rows.length - at };
}

/** arriving from Today with a filter: only that group's queries, by the phone's own court (`V3Query.court`, the rule the
 *  block's figures count by) */
export function bvFilter<T extends { court: string }>(rows: readonly T[], court: BeCourt | null): T[] {
  return court ? rows.filter((r) => r.court === court) : [...rows];
}
/** the line that says a filter is on: "With agents · 12" */
export const bvFilterLabel = (court: BeCourt, n: number): string => `${BE_GROUP_NAME[court]} · ${n}`;

/**
 * The address after the List | Birds-eye switch (or "Show all"): the view in `view`, the filter in `court` only where
 * that view can show it (the list: any of its chips but "all"; Birds-eye: with you / with agents / gone quiet). A chosen
 * query (`focus`) is dropped; anything else is kept.
 */
export function bvSwitchSearch(search: string, bird: boolean, chip: string): string {
  const p = new URLSearchParams(search);
  p.delete("focus");
  if (bird) p.set("view", "birds"); else p.delete("view");
  const keep = bird ? isBeCourt(chip) : !!chip && chip !== "all";
  if (keep) p.set("court", chip); else p.delete("court");
  const s = p.toString();
  return s ? `?${s}` : "";
}

/** one row's bar in DAYS from the track's start (the block's `beTrack` over the view's whole extent, read in days) */
export interface BvTrack {
  past: { l: number; w: number; status: string }[];
  cur: null | { l: number; solid: number; rem: number; notch: number | null; deep: null | { l: number; w: number }; off: boolean; status: string };
  t: number;
}
export function bvTrackDays(line: Pick<BeLine, "past" | "cur" | "dueMs" | "row">, ext: { fromMs: number; toMs: number }, nowMs: number): BvTrack {
  const k = (ext.toMs - ext.fromMs) / DAY_MS / 100;
  const tk = beTrack(line, ext, nowMs);
  const c = tk.cur;
  return {
    t: tk.t * k,
    past: tk.past.map((b) => ({ l: b.l * k, w: b.w * k, status: b.status })),
    cur: c ? {
      l: c.l * k, solid: c.solid * k, rem: c.rem * k, notch: c.notch == null ? null : c.notch * k,
      deep: c.deep ? { l: c.deep.l * k, w: c.deep.w * k } : null, off: c.off, status: c.status,
    } : null,
  };
}

/* ═══ Phase F — MATERIALS (design-refs/phone-app-v5/phone-materials-v1.html) ═════════════════════════════════════════
   Pure. Nothing here counts a query of its own: a PACKAGE's result is packageMetrics' (`packageMetrics`, ranked by
   `rankPackagesByRequests` / `strongestPackage`, no "best" under MIN_SENDS_FOR_CLAIM); a LETTER's, a SYNOPSIS's and a
   VERSION's are the desktop packages page's per-piece figures (packagesV40 `queriesWithPiece` + `factsOf`, H3: a
   query counts for the piece it recorded, whichever package it went in — so a query sent WITHOUT a package counts on
   its letter only, through its own `sentVersions`, and on no package). What is added is the words and the order. */

/** the result a package card, the header and a package's page show: "3 from 7 asked for more", or "Not sent yet" */
export interface MatResult { sent: number; more: number; big: string; of: string | null; words: string }
export function matResult(sent: number, more: number): MatResult {
  if (!sent) return { sent, more, big: "Not sent yet", of: null, words: "Not sent yet" };
  return { sent, more, big: String(more), of: `from ${sent}`, words: `${more} from ${sent} asked for more` };
}
/** a package's result, from packageMetrics' own stat (queries whose `packageId` is the package) */
export const pkgResult = (s: Pick<RateStat, "sent" | "requests">): MatResult => matResult(s.sent, s.requests);
/** a letter's, synopsis's or version's result, from the desktop's per-piece facts */
export const pieceResult = (f: Pick<Facts, "n" | "more">): MatResult => matResult(f.n, f.more);

/** every package's stat, keyed by id — packageMetrics itself, once per package */
export function pkgStats(pkgs: readonly Pick<SubmissionPackage, "id">[], queries: Query[]): Map<string, RateStat> {
  return new Map(pkgs.map((p) => [p.id, packageMetrics(p.id, queries)]));
}

const COUNT_WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const countWord = (n: number): string => COUNT_WORDS[n] ?? String(n);
/**
 * "Best of your three packages so far." — only when packageMetrics would crown it: `strongestPackage` names this one,
 * at least two packages have cleared MIN_SENDS_FOR_CLAIM (one alone is not "best of"), and it is strictly ahead of the
 * next (a tie crowns nobody). Otherwise null, and the page says nothing.
 */
export function bestClaim(pkgId: string, pkgs: SubmissionPackage[], queries: Query[]): string | null {
  const ranked = rankPackagesByRequests(pkgs, queries).filter((r) => r.ranked && r.stat.requestRate !== null);
  if (ranked.length < 2) return null;
  const top = strongestPackage(pkgs, queries);
  if (!top || top.pkg.id !== pkgId || ranked[0].pkg.id !== pkgId) return null;
  if ((ranked[0].stat.requestRate ?? 0) <= (ranked[1].stat.requestRate ?? 0)) return null;
  return `Best of your ${countWord(ranked.length)} packages so far.`;
}

/** a package's three pieces, in the ref's order: letter, synopsis, the manuscript version. `set` is isSlotFilled. */
export type PieceKey = "let" | "syn" | "ver";
export interface PkgPiece { k: PieceKey; label: string; set: boolean; name: string | null; id: string | null }
export function pkgPieces(
  p: Pick<SubmissionPackage, "queryLetterVersionId" | "synopsisVersionId" | "bookVersionId">,
  materials: readonly Pick<ManuscriptVersion, "id" | "versionName">[],
  bookVersions: readonly Pick<V2Version, "id" | "name">[],
): PkgPiece[] {
  const mat = (id: string | null | undefined) => (isSlotFilled(id) ? materials.find((m) => m.id === id)?.versionName?.trim() || null : null);
  const ver = (id: string | null | undefined) => (isSlotFilled(id) ? bookVersions.find((v) => v.id === id)?.name?.trim() || null : null);
  return [
    { k: "let", label: "Query letter", set: isSlotFilled(p.queryLetterVersionId), name: mat(p.queryLetterVersionId), id: isSlotFilled(p.queryLetterVersionId) ? p.queryLetterVersionId : null },
    { k: "syn", label: "Synopsis", set: isSlotFilled(p.synopsisVersionId), name: mat(p.synopsisVersionId), id: isSlotFilled(p.synopsisVersionId) ? p.synopsisVersionId : null },
    { k: "ver", label: "Manuscript", set: isSlotFilled(p.bookVersionId), name: ver(p.bookVersionId), id: isSlotFilled(p.bookVersionId) ? p.bookVersionId! : null },
  ];
}
/** a piece's chip: its name; a slot left unfilled says so */
export const pieceChip = (x: PkgPiece): string => (x.set ? x.name ?? `${x.label} not found` : `No ${x.label.toLowerCase()}`);

/** the first line of a letter's wording, for the sheet (blank lines skipped), or null when it has none */
export function firstLine(text: string | null | undefined, max = 90): string | null {
  const line = (text ?? "").split(/\r?\n/).map((l) => l.trim()).find(Boolean);
  if (!line) return null;
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line;
}
/** the letter's paragraphs, to read (blank lines part them) */
export const paragraphs = (text: string | null | undefined): string[] => (text ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

/** how many comps a letter mentions: its `compIds`' length; null when it has not recorded any (compUsage's rule) */
export const letterCompCount = (v: { compIds?: string[] | null }): number | null => (Array.isArray(v.compIds) ? v.compIds.length : null);
export function compsWords(n: number | null): string {
  if (n == null) return "Comps not noted";
  return n === 0 ? "No comps" : `Mentions ${n} ${n === 1 ? "comp" : "comps"}`;
}
/** how many letters mention a comp (by its id) */
export function lettersNaming(comp: Pick<CompTitle, "id">, letters: readonly { compIds?: string[] | null }[]): number {
  if (!comp.id) return 0;
  return letters.filter((l) => Array.isArray(l.compIds) && l.compIds.includes(comp.id!)).length;
}
export const lettersWords = (n: number): string => (n === 0 ? "Not in a letter yet" : `In ${n} ${n === 1 ? "letter" : "letters"}`);
export const packagesWords = (n: number): string => (n === 0 ? "Not in a package" : `In ${n} ${n === 1 ? "package" : "packages"}`);

/**
 * The queries a letter, synopsis or version went out with: EXACTLY the desktop's own `queriesWithPiece` (packagesV40
 * `pieceOf`: what the query recorded it sent first, else its package's slot, else — for a version — versionsV2's
 * resolver). A query sent without a package counts on its letter through its own `sentVersions`, and on no package.
 * ⚠️ Nothing is filled in or widened here: the phone and the desktop read one figure.
 */
export function materialQueries(kind: PieceKey, id: string, queries: Query[], ctx: PieceContext): Query[] {
  return queriesWithPiece(queries, kind, id, ctx);
}
/** a letter's, synopsis's or version's result: the desktop's per-piece facts over those queries */
export function materialFacts(kind: PieceKey, id: string, queries: Query[], ctx: PieceContext, rows: Map<string, AnalyticsRow>): Facts {
  return factsOf(materialQueries(kind, id, queries, ctx), rows);
}

/**
 * The versions as a tree from the Original, drawn growing UP: every version sits above its parent and the Original is
 * last. Pre-order from each root (children oldest first), then reversed. Archived versions are left out unless a live
 * one grew from them (desktop `treeModel`'s rule). A version whose parent is missing is a root.
 */
export interface VerNode { v: V2Version; depth: number; parentId: string | null }
export function versionTree(vs: readonly V2Version[]): VerNode[] {
  const byId = new Map(vs.map((v) => [v.id, v]));
  const parentOf = (v: V2Version) => (v.parentId && v.parentId !== v.id ? byId.get(v.parentId) ?? null : null);
  const keep = new Set<string>();
  for (const v of vs) if (!v.archived) { keep.add(v.id); for (let p = parentOf(v), g = 0; p && g < 60; p = parentOf(p), g++) keep.add(p.id); }
  const nodes = vs.filter((v) => keep.has(v.id));
  const order = (a: V2Version, b: V2Version) => (a.createdDate < b.createdDate ? -1 : a.createdDate > b.createdDate ? 1 : a.num - b.num);
  const kids = new Map<string | null, V2Version[]>();
  for (const v of nodes) { const p = parentOf(v); const k = p && keep.has(p.id) ? p.id : null; (kids.get(k) ?? kids.set(k, []).get(k)!).push(v); }
  for (const l of kids.values()) l.sort(order);
  const out: VerNode[] = [];
  const seen = new Set<string>();
  const walk = (v: V2Version, depth: number, parentId: string | null) => {
    if (seen.has(v.id)) return;
    seen.add(v.id);
    out.push({ v, depth, parentId });
    for (const c of kids.get(v.id) ?? []) walk(c, depth + 1, v.id);
  };
  const roots = (kids.get(null) ?? []).sort((a, b) => Number(b.original) - Number(a.original) || order(a, b));
  for (const r of roots) walk(r, 0, null);
  return out.reverse();
}
export const versionsLine = (n: number): string =>
  n === 0 ? "No versions of your manuscript saved yet." : `${n} ${n === 1 ? "version" : "versions"} of your manuscript saved. New queries go out with the one in use.`;

/**
 * The Versions gate — the desktop's exactly (VersionsV2Page `locked`): the one resolver's entitlement opens it, and the dev
 * review aid `sessionStorage["sa.dev.versionsFree"] = "1"` shows the lock on a dev build (never in production).
 */
export function versionsLocked(e: Entitlement, mode: string, read: () => string | null): boolean {
  let free = false;
  if (mode !== "production") { try { free = read() === "1"; } catch { free = false; } }
  return free || !versionsUnlocked(e);
}
/** ⚠️ THE DESKTOP'S LOCK COPY, VERBATIM (VersionsV2Page's lock card). phoneV5.test.ts asserts every string is in it. */
export const VERSIONS_LOCK = {
  kicker: "Versions · part of Pro",
  head: "Find out which opening gets agents reading on.",
  body: "Save each version of your manuscript as it changes. QueryHawk records which one went out with every query, then shows you which is landing.",
  bullets: [
    ["A league table.", "Every version side by side."],
    ["Every query, by version.", "One timeline of who saw what."],
    ["Fix the record.", "Say which version went, even after it’s sent."],
  ] as const,
  plans: "See plans",
  small: "Plans run only while you’re querying.",
};

/* ═══ Phase G — PROFILE AND FEEDBACK (Profile has no ref; phone-feedback-v1.html section 1 for the sheet) ═══
   Pure. Profile's rows; where a note was written, in plain words; the sheet's three kinds and the callable's own kind
   string for each (COMPOSE's mapping, the desktop panel's and the founding card's). */

/** Profile's rows. What's landing and the materials rows (Packages, Query letters, Synopses and comps) are Materials now. */
export const PROFILE_ROWS: readonly { label: string; path: string }[] = [
  { label: "Responses", path: "/queries/responses" }, { label: "Your book", path: "/manuscripts" },
  { label: "Corkboard", path: "/todo/corkboard" }, { label: "Settings", path: "/account" },
];
/** the writer's notes page (notes/YourNotesPage.tsx; routed in App.tsx) */
export const YOUR_NOTES_PATH = "/your-notes";

/** "About: {screen}" — the screen the sheet was opened over: the tab's name and, on a page with tabs, the tab chosen. */
export function feedbackAbout(pathname: string, tabs: { today?: string | null; materials?: string | null } = {}, fallback?: string | null): string {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (p === "/dashboard") {
    const t = TODAY_TABS.find((x) => x.key === tabs.today);
    return t ? `Today · ${t.label}` : "Today";
  }
  if (p === MATERIALS_PATH) {
    const t = MAT_TABS.find((x) => x.key === tabs.materials);
    return t ? `Materials · ${t.label}` : "Materials";
  }
  if (p === "/todo") return "To do";
  if (p === "/you") return "Profile";
  const f = (fallback ?? "").trim();
  return f || "QueryHawk";
}

/** the sheet's three kinds, in the ref's order and words; it opens on "An idea" unless a door names one */
export const FB_KINDS: readonly { key: ComposeKey; label: string }[] = [
  { key: "like", label: "I like" }, { key: "dont", label: "I don’t like" }, { key: "idea", label: "An idea" },
];
export const FB_FIRST: ComposeKey = "idea";
/** ⚠️ the kind SENT is COMPOSE's (the callable's own string): like → "Something I liked", don't → "Something's broken"
 *  (the panel's default chip; the sheet draws no chips), idea → "An idea" */
export const fbKindFor = (k: ComposeKey): FeedbackKind => composeFor(k).kind;
export const isComposeKey = (x: unknown): x is ComposeKey => x === "like" || x === "dont" || x === "idea";
/** Send is ready with words in the note (within the callable's limit) and nothing already on its way */
export const fbReady = (text: string, sending: boolean): boolean => canSend(text) && !sending;
/** the line under "Thank you.": Your notes shows each note as Not read yet · Read · Planned · Now in the app (BUCKETS) */
export const FB_SENT_LINE = "You’ll see on Your notes when this one has been read, and if it makes it into the app.";
