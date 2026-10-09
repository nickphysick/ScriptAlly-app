/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v58 — "What's on the list today?"
 *
 * One list, walked in a fixed order: agents are waiting, worth a nudge, gone quiet, housekeeping,
 * ready to query, coming up. The first item is the focus card; the rest is the list beneath it.
 *
 * Every group is an existing derivation, composed here and nowhere re-derived:
 *   1–3  the To-do board's own cards (`assembleBoardColumns` → `todoRows` → `taskCategory`)
 *   4    the Contact list's Housekeeping gaps (`hkModel`)
 *   5    the Contact list's next step (`nextStep().ready`)
 *   6    the Query Centre's clock (`buildQcRows` → `expectedMs`), soonest first
 *
 * Ready to query shows only when 1–4 are all empty; coming up only when 1–5 are.
 */
import { QueryStatus, type Activity, type Agent, type Manuscript, type Query, type User, type UserTask } from "../types";
import type { BoardCard } from "./todoBoard";
import type { TodoRow } from "./dashTodo";
import { nudgeCount } from "./dashTodo";
import { drawerDoorForTask } from "./queryActions/entry";
import type { OpenRequest } from "./queryActions/drawerStore";
import { agentInitials, agentPrimary } from "./agentDisplay";
import { elapsedWhole } from "./elapsed";
import { stateFor, type State } from "./queryCardFacts";
import { buildQcRows, STAGE_NAME, type QcRow } from "./qcSummary";
import { GAP_TARGET, hasPassedOn, hkModel, type GapKey, type HkAgentCtx, type HkItem } from "./contactHousekeeping";
import { contactPrefsOf } from "./contactPrefs";
import { fitsGenre } from "./contactStrip";
import { bookGenres } from "./genreMatch";
import { nextStep } from "./contactNextStep";
import type { AgentCardField, AgentCardTab } from "./agentCardStore";
import { MONTHS_SHORT } from "./dates";
import type { GettingStartedRow } from "./dashEmpty";

export type ListGroupKey = "req" | "nudge" | "quiet" | "house" | "ready" | "coming";

export const LIST_ORDER: readonly ListGroupKey[] = ["req", "nudge", "quiet", "house", "ready", "coming"];

export const LIST_LABEL: Record<ListGroupKey, string> = {
  req: "Agents are waiting",
  nudge: "Worth a nudge",
  quiet: "Gone quiet",
  house: "Housekeeping",
  ready: "Ready to query",
  coming: "Coming up",
};

/** the band and the row's edge: a query's own state colour, or the slate of a contact-list item */
export type ListTone = State | "house";

/** What pressing an item's action does. Data, so the derivation stays pure; the page runs it. */
export type ListAction =
  | { kind: "drawer"; request: OpenRequest }
  | { kind: "agent"; agentId: string; tab: AgentCardTab; focus: AgentCardField; sequence: string[] }
  | { kind: "route"; tab: string; sub?: string };

export interface ListStage { status: QueryStatus; name: string; date: string }

export interface ListItem {
  key: string;
  group: ListGroupKey;
  tone: ListTone;
  /** the sentence, split round the name so the name can be set in 600 */
  pre: string;
  who: string;
  post: string;
  /** the disc: an agent's initials, or the two letters of a housekeeping gap */
  initials: string;
  /** the mono line under the sentence on the focus card */
  fact: string;
  /** the mono line beside the pill in a row */
  agency: string;
  status: QueryStatus | null;
  /** the row's right-hand time */
  when: string;
  /** the focus card's foot, left */
  foot: string;
  /** the focus card's action, and what it opens */
  actLabel: string;
  action: ListAction;
  /** a query that agents are waiting on shows its stages; everything else shows one sentence */
  stages: ListStage[] | null;
  note: string | null;
  /** a coming-up item's date tile */
  date: { dow: string; day: string } | null;
}

export interface ListGroup { key: ListGroupKey; label: string; items: ListItem[] }

export interface ListPlan {
  /** the groups that show, in order — never empty groups */
  groups: ListGroup[];
  /** every item in order; the first is the focus */
  items: ListItem[];
  /** "Then" for work to do, "Also" for the two caught-up states */
  thenLabel: "Then" | "Also";
  /** the link on the right of the "Then" row */
  all: { label: string; tab: string; sub?: string };
}

const DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const DAY = 86_400_000;
const shortDate = (ms: number): string => { const d = new Date(ms); return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`; };
const upper = (s: string) => s.toUpperCase();
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/* ── the fixed order ───────────────────────────────────────────────────────────────────────── */

/**
 * Which groups show. Work to do (1–4) always shows, in order. Ready to query shows only when there
 * is none; coming up only when there is nothing ready either.
 */
export function listPlan(found: Partial<Record<ListGroupKey, ListItem[]>>): ListPlan {
  const has = (k: ListGroupKey) => (found[k]?.length ?? 0) > 0;
  const work = (["req", "nudge", "quiet", "house"] as const).filter(has);
  const keys: ListGroupKey[] = work.length ? [...work] : has("ready") ? ["ready"] : ["coming"];
  const groups = keys.map((key) => ({ key, label: LIST_LABEL[key], items: found[key] ?? [] }));
  const first = keys[0];
  return {
    groups,
    items: groups.flatMap((g) => g.items),
    thenLabel: first === "ready" || first === "coming" ? "Also" : "Then",
    all: first === "ready" ? { label: "Contact list", tab: "agents" }
      : first === "coming" ? { label: "Calendar", tab: "todo", sub: "calendar" }
      : { label: "All", tab: "todo" },
  };
}

/**
 * The focus steps through the FIRST group only. `step` is clamped, so a group that shrinks under
 * the reader never leaves the card pointing past its end.
 */
export function focusOf(plan: ListPlan, step: number): { item: ListItem | null; index: number; of: number; rest: ListGroup[] } {
  const top = plan.groups[0];
  if (!top || top.items.length === 0) return { item: null, index: 0, of: 0, rest: [] };
  const index = Math.min(Math.max(0, step), top.items.length - 1);
  const item = top.items[index];
  const rest = plan.groups
    .map((g, gi) => (gi === 0 ? { ...g, items: g.items.filter((x) => x.key !== item.key) } : g))
    .filter((g) => g.items.length > 0);
  return { item, index, of: top.items.length, rest };
}

/** A group's heading in the list. The focus item's own group reads "Also …" for what is left. */
export const groupHeading = (g: ListGroup, focus: ListItem | null): string =>
  focus && focus.group === g.key
    ? g.key === "req" ? "Also waiting" : `Also ${g.label.charAt(0).toLowerCase()}${g.label.slice(1)}`
    : g.label;

/* ── 1–3: the board's cards ────────────────────────────────────────────────────────────────── */

const STAGE_SHORT: Partial<Record<QueryStatus, string>> = {
  [QueryStatus.PARTIAL_REQUESTED]: "Partial req.",
  [QueryStatus.FULL_REQUESTED]: "Full req.",
  [QueryStatus.REVISE_RESUBMIT]: "R&R",
};

const ACT: Record<string, string> = {
  partial_requested: "Send your partial",
  full_requested: "Send your full",
  revise_resubmit: "Send your revision",
  offer_send_full: "Send your full",
  offer_received: "Offer: next steps",
  offer_tell: "Tell them about your offer",
  nudge_overdue: "Record a nudge",
  no_response_close: "Close this query",
};

const sentSince = (status: QueryStatus | null): string =>
  status === QueryStatus.PARTIAL_SENT ? "since you sent the partial"
    : status === QueryStatus.FULL_SENT || status === QueryStatus.RESUBMITTED ? "since you sent the full"
      : "since you queried";

export interface BoardInput {
  rows: readonly TodoRow[];
  cards: readonly BoardCard[];
  queries: readonly Query[];
  agents: readonly Agent[];
  activities: readonly Activity[];
  qcRows: readonly QcRow[];
}

/** The board's `req`, `nudge` and `quiet` rows as list items, in the board's own order. */
export function boardItems(i: BoardInput): Partial<Record<ListGroupKey, ListItem[]>> {
  const out: Partial<Record<ListGroupKey, ListItem[]>> = { req: [], nudge: [], quiet: [] };
  for (const r of i.rows) {
    if (r.category !== "req" && r.category !== "nudge" && r.category !== "quiet") continue;
    const card = i.cards.find((c) => c.key === r.key);
    const door = drawerDoorForTask(card?.taskType, card?.relatedRecordId, (id) => i.queries.find((x) => x.id === id)?.offerRefQueryId);
    if (!door) continue; // no flow to open → not offered (a button never writes for itself)
    const q = r.queryId ? i.queries.find((x) => x.id === r.queryId) : undefined;
    const agent = q ? i.agents.find((a) => a.id === q.agentId) : undefined;
    const agency = (agent?.agency ?? "").trim();
    const qc = r.queryId ? i.qcRows.find((x) => x.id === r.queryId) : undefined;
    const days = r.days !== null && Number.isFinite(r.days) ? Math.max(0, r.days) : null;
    const span = days === null ? "" : days === 0 ? "today" : elapsedWhole(days);
    const nudges = nudgeCount(r.queryId, i.activities);
    const group = r.category;

    let pre = r.title.pre, who = r.title.who, post = r.title.post;
    if (card?.taskType === "revise_resubmit" && who) { pre = "Send your revision to "; post = ""; }
    if (group === "quiet" && who) { pre = "Consider closing "; post = ""; }

    const stage = r.status ? STAGE_NAME[r.status] : "";
    const stageAt = qc?.stageStartMs != null ? ` ${shortDate(qc.stageStartMs)}` : "";
    const stages: ListStage[] | null = group === "req" && qc && qc.history.spans.length > 0
      ? qc.history.spans.slice(-4).map((s) => ({ status: s.status, name: STAGE_SHORT[s.status] ?? STAGE_NAME[s.status], date: upper(shortDate(s.startMs)) }))
      : null;

    const weeks = agent?.responseTimeWeeks;
    const note = group === "nudge"
      ? `${typeof weeks === "number" && weeks > 0 ? `The stated reply window is ${weeks} ${plural(weeks, "week", "weeks")}` : "The reply window has passed"}${qc?.expectedMs != null ? `. It ended on ${shortDate(qc.expectedMs)}` : ""} and you haven't nudged yet.`
      : group === "quiet"
        ? `${nudges > 0 ? `You have nudged ${nudges === 1 ? "once" : nudges === 2 ? "twice" : `${nudges} times`} and there has been no reply since.` : "The reply window has passed with no reply."} Closing it moves it to your closed queries; a late reply can still be recorded.`
        : stages ? null : `${stage}${stageAt}.`;

    out[group]!.push({
      key: r.key, group,
      tone: r.status ? stateFor(r.status) : "closed",
      pre, who, post,
      initials: r.initials,
      fact: upper([agency, `${stage}${stageAt}`].filter(Boolean).join(" · ")),
      agency: upper(agency),
      status: r.status,
      when: group === "req" ? (days === null ? "" : days === 0 ? "today" : `${span} ago`)
        : group === "quiet" && nudges > 0 ? (span ? `nudged ${span} ago` : "nudged") : span,
      foot: group === "req" ? (days === null ? "Waiting on you" : days === 0 ? "Asked today" : `Asked ${span} ago`)
        : days === null ? "Past the reply window"
          : group === "quiet" && nudges > 0 ? `${span} since your last nudge` : `${span} ${sentSince(r.status)}`,
      actLabel: ACT[card?.taskType ?? ""] ?? "Open",
      action: { kind: "drawer", request: { ...door } },
      stages, note, date: null,
    });
  }
  return out;
}

/* ── 4: housekeeping ───────────────────────────────────────────────────────────────────────── */

const GAP_DISC: Record<GapKey, string> = { reply: "RW", materials: "MS", genres: "GE", wishlist: "WL", reopen: "OP" };

const GAP_COPY: Record<GapKey, { one: (n: string) => string; many: (n: number) => [string, string, string?]; why: string; note: string }> = {
  reply: {
    one: (n) => `Add a typical reply time for ${n}`,
    many: (n) => ["Add typical reply times for ", `${n} agents`],
    why: "Helps QueryHawk tell you when to nudge",
    note: "QueryHawk uses reply times to work out when a query is worth a nudge. Without one, a query never shows up as a nudge.",
  },
  materials: {
    one: (n) => `Add what ${n} asks for`,
    many: (n) => ["Add what ", `${n} agents`, " ask for"],
    why: "So your submission package matches",
    note: "Note what each agent asks for, and it is listed for you when you log a query.",
  },
  genres: {
    one: (n) => `Add genres for ${n}`,
    many: (n) => ["Add genres for ", `${n} agents`],
    why: "So we can suggest who to query next",
    note: "Genres are how QueryHawk tells whether an agent takes a book like yours.",
  },
  wishlist: {
    one: (n) => `Add a wishlist for ${n}`,
    many: (n) => ["Add wishlists for ", `${n} agents`],
    why: "So you can check the fit before querying",
    note: "A line or two of what the agent is looking for, in their own words.",
  },
  reopen: {
    one: (n) => `Add when ${n} reopens`,
    many: (n) => ["Add reopening dates for ", `${n} agents`],
    why: "So you are reminded when they reopen",
    note: "Pick a date and a reminder goes on your To-do list.",
  },
};

export interface HouseInput {
  agents: readonly Agent[];
  queries: readonly Query[];
  qcRowsAll: readonly QcRow[];
  userTasks: readonly UserTask[];
  manuscript: Manuscript | null;
  user: Pick<User, "todoPrefs"> | null;
  now: Date;
}

/**
 * The Contact list's Housekeeping gaps, one item per KIND of gap. The context each agent is read in
 * is the Contact list's own (`AgentList` builds the same five facts inline; this is that rule,
 * stated here because that file is the Contact list's).
 */
export function houseItems(i: HouseInput): ListItem[] {
  const msId = i.manuscript?.id ?? null;
  const book = bookGenres(i.manuscript);
  const reopen = new Set(i.userTasks.filter((t) => t.agentId && !t.done && (t.dueDate ?? "").trim()).map((t) => t.agentId as string));
  const ctxOf = (a: Agent): HkAgentCtx => ({
    live: i.qcRowsAll.some((r) => r.query.agentId === a.id && r.court !== "closed"),
    fits: fitsGenre(a, book),
    queried: i.queries.some((q) => q.agentId === a.id && (!msId || q.manuscriptId === msId)),
    passedOn: hasPassedOn(a, i.queries as Query[], msId),
    hasReopenTask: reopen.has(a.id),
  });
  const model = hkModel(i.agents, ctxOf, contactPrefsOf(i.user, i.now));
  const byGap = new Map<GapKey, HkItem[]>();
  for (const it of model.items) byGap.set(it.gap, [...(byGap.get(it.gap) ?? []), it]);
  return [...byGap.entries()].map(([gap, items]) => {
    const copy = GAP_COPY[gap];
    const n = items.length;
    const first = items[0].agent;
    const [pre, who, post = ""] = n === 1
      ? (() => { const name = agentPrimary(first); const s = copy.one(name); const at = s.lastIndexOf(name); return [s.slice(0, at), name, s.slice(at + name.length)] as [string, string, string]; })()
      : copy.many(n);
    const target = GAP_TARGET[gap];
    return {
      key: `hk:${gap}`, group: "house" as const, tone: "house" as const,
      pre, who, post,
      initials: GAP_DISC[gap],
      fact: "HOUSEKEEPING · FROM YOUR CONTACT LIST",
      agency: upper(copy.why),
      status: null,
      when: "",
      foot: n === 1 ? "Takes about a minute" : "Takes about a minute each",
      actLabel: "Fill in",
      action: { kind: "agent" as const, agentId: first.id, tab: target.tab, focus: target.focus, sequence: items.map((x) => x.agent.id) },
      stages: null, note: copy.note, date: null,
    };
  });
}

/* ── 5: ready to query ─────────────────────────────────────────────────────────────────────── */

export interface ReadyInput { agents: readonly Agent[]; queries: readonly Query[]; manuscript: Manuscript | null; now: Date }

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function readyItems(i: ReadyInput): ListItem[] {
  const msId = i.manuscript?.id ?? null;
  const step = nextStep({ agents: i.agents, queries: i.queries, msId, book: bookGenres(i.manuscript), todayIso: ymd(i.now) });
  return step.ready.map((a) => {
    const genres = (a.genres ?? []).filter(Boolean);
    const genreLine = genres.length ? genres.slice(0, 2).join(", ") : "Genre not recorded";
    return {
      key: `ready:${a.id}`, group: "ready" as const, tone: "house" as const,
      pre: "Query ", who: agentPrimary(a), post: "",
      initials: agentInitials(a),
      fact: upper([(a.agency ?? "").trim(), "Open to submissions"].filter(Boolean).join(" · ")),
      agency: upper([(a.agency ?? "").trim(), genreLine].filter(Boolean).join(" · ")),
      status: null,
      when: "",
      foot: "Not queried yet",
      actLabel: "Log a query",
      action: { kind: "drawer" as const, request: { mode: "log" as const, agentId: a.id, ...(msId ? { manuscriptId: msId } : {}) } },
      stages: null,
      note: genres.length ? `Takes ${genres.slice(0, 3).join(", ").toLowerCase()}.` : "No genres are recorded for this agent yet.",
      date: null,
    };
  });
}

/* ── 6: coming up ──────────────────────────────────────────────────────────────────────────── */

const startOfDay = (ms: number) => { const d = new Date(ms); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };

/** The next dated events from live queries, soonest first: the Query Centre's own clock. */
export function comingItems(qcRows: readonly QcRow[], nowMs: number): ListItem[] {
  const today = startOfDay(nowMs);
  return qcRows
    .filter((r) => r.court !== "closed" && r.expectedMs != null && startOfDay(r.expectedMs) >= today)
    .sort((a, b) => (a.expectedMs as number) - (b.expectedMs as number))
    .map((r) => {
      const at = r.expectedMs as number;
      const d = new Date(at);
      const inDays = Math.round((startOfDay(at) - today) / DAY);
      const pre = r.expectedKind === "sendBy" ? "Send-by date for "
        : r.expectedKind === "offer" ? "Offer decision date for "
          : r.status === QueryStatus.QUERIED ? "Reply window ends for " : "Response expected from ";
      const stage = `${STAGE_NAME[r.status]}${r.stageStartMs != null ? ` ${shortDate(r.stageStartMs)}` : ""}`;
      return {
        key: `coming:${r.id}`, group: "coming" as const, tone: r.state,
        pre, who: r.agentName, post: "",
        initials: r.initials,
        fact: upper([r.agency, stage].filter(Boolean).join(" · ")),
        agency: upper(stage),
        status: r.status,
        when: "",
        foot: inDays === 0 ? "Today" : inDays === 1 ? "Tomorrow" : `In ${inDays} days`,
        actLabel: "Record a response",
        action: { kind: "drawer" as const, request: { mode: "resp" as const, queryId: r.id } },
        stages: null,
        note: "The next date from your queries. Nothing needs doing before then.",
        date: { dow: DOW[d.getDay()], day: String(d.getDate()) },
      };
    });
}

/* ── the whole list ────────────────────────────────────────────────────────────────────────── */

export interface DashListInput {
  rows: readonly TodoRow[];
  cards: readonly BoardCard[];
  /** every query (lookup), and this manuscript's */
  queries: readonly Query[];
  scopedQueries: readonly Query[];
  agents: readonly Agent[];
  activities: readonly Activity[];
  allActivities: readonly Activity[];
  userTasks: readonly UserTask[];
  manuscript: Manuscript | null;
  user: Pick<User, "todoPrefs"> | null;
  now: Date;
  /** dev review aid only: groups to leave out, so each state can be seen on a real account */
  drop?: readonly ListGroupKey[];
}

export function dashList(i: DashListInput): ListPlan {
  const nowMs = i.now.getTime();
  const qcRows = buildQcRows(i.scopedQueries, i.agents, i.activities as Activity[], nowMs);
  const qcRowsAll = buildQcRows(i.queries, i.agents, i.allActivities as Activity[], nowMs);
  const found: Partial<Record<ListGroupKey, ListItem[]>> = {
    ...boardItems({ rows: i.rows, cards: i.cards, queries: i.queries, agents: i.agents, activities: i.activities, qcRows }),
    house: houseItems({ agents: i.agents, queries: i.queries, qcRowsAll, userTasks: i.userTasks, manuscript: i.manuscript, user: i.user, now: i.now }),
    ready: readyItems({ agents: i.agents, queries: i.queries, manuscript: i.manuscript, now: i.now }),
    coming: comingItems(qcRows, nowMs),
  };
  for (const k of i.drop ?? []) found[k] = [];
  return listPlan(found);
}

/* ── first run ─────────────────────────────────────────────────────────────────────────────── */

export const STARTING_LABEL = "Getting started";

/**
 * A book with no query yet has nothing on the list, so the column carries the getting-started
 * deeds instead (`gettingStartedRows`, the page's own first-run derivation, unchanged). Only what is
 * still to do is listed; each deed opens where it is done.
 */
export function startingPlan(rows: readonly GettingStartedRow[], msId: string | null): ListPlan {
  const items: ListItem[] = rows.filter((r) => !r.done).map((r) => ({
    key: `start:${r.key}`, group: "house", tone: "house",
    pre: r.deed, who: "", post: "",
    initials: String(rows.findIndex((x) => x.key === r.key) + 1),
    fact: upper(STARTING_LABEL),
    agency: upper(r.chip),
    status: null, when: "",
    foot: r.chip,
    actLabel: r.key === "query" ? "Log a query" : `Open ${r.chip}`,
    action: r.key === "query" ? { kind: "drawer", request: { mode: "log", ...(msId ? { manuscriptId: msId } : {}) } }
      : r.key === "manuscript" ? { kind: "route", tab: "manuscripts", sub: "Add a manuscript" }
        : r.key === "agent" ? { kind: "route", tab: "agents", sub: "Add an agent" }
          : { kind: "route", tab: r.tab, sub: r.sub },
    stages: null, note: r.note, date: null,
  }));
  return { groups: items.length ? [{ key: "house", label: STARTING_LABEL, items }] : [], items, thenLabel: "Then", all: { label: "All", tab: "todo" } };
}
