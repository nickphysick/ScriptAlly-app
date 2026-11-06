/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v50 — THE TASK WORKSPACE's model (design-refs/todo-list-v50/todo-list-v50.html). Pure: no React, no IO.
 *
 * The page is a tray of tasks on the left and a desk on the right where the selected task is done. This file turns
 * the board's cards (already shaped by `lib/todoTray`) into the workspace's tasks: their kind, their group, the
 * title the tray and the desk read, the day count, the page header's priority line and the Mentor's lines.
 *
 * ⚠️ A HOUSEKEEPING SWEEP CARD IS EXPANDED INTO ONE ROW PER AGENT. The board folds every agent with a missing reply
 *    time into one card ("3 reply times"); the workspace asks one agent one question at a time, so each member is a
 *    row. Every member still writes through its own agent's flag (`data_quality_poor` + agentId).
 * ⚠️ NOTES TO SELF NEVER REACH THE TRAY. A user task without a due date is a note (`isNoteTask`); only dated tasks
 *    are tasks. The board already keeps notes off its columns; `wsTasks` checks again so a note can never arrive here.
 */
import { QueryStatus, type Agent, type Query, type UserTask } from "../types";
import type { TrayItem } from "./todoTray";
import type { AgentDataNeed } from "./agentDataQuality";

const DAY = 86400000;
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export type WsKind = "offer" | "send" | "rr" | "nudge" | "quiet" | "fix" | "own" | "other";
export type WsGroupId = "wait" | "nudge" | "quiet" | "house" | "yours";
export type WsType = "Send" | "Decide" | "Nudge" | "Close" | "Fill in";
export type WsWhen = "Overdue" | "Due this week" | "Coming up" | "No date";

export interface WsTask {
  /** the card's key, or `${card key}|${agentId}` for one member of a housekeeping sweep */
  key: string;
  item: TrayItem;
  kind: WsKind;
  group: WsGroupId;
  title: string;
  /** the agent's first name ("The agent" where none is stored) */
  first: string;
  agentName: string;
  agency: string;
  query?: Query;
  agent?: Agent;
  userTask?: UserTask;
  /** a housekeeping row's gap */
  need?: AgentDataNeed;
  /** whole days until the due date (negative: past it); null where the task has no date */
  dueDays: number | null;
  /** Gone quiet: days since the last thing was sent */
  quietDays: number | null;
  type: WsType | null;
  /** search haystack */
  hay: string;
}

export const WS_GROUPS: readonly { id: WsGroupId; name: string }[] = [
  { id: "wait", name: "Agents are waiting" },
  { id: "nudge", name: "Nudges" },
  { id: "quiet", name: "Gone quiet" },
  { id: "house", name: "Housekeeping" },
  { id: "yours", name: "Your tasks" },
];

const GROUP_OF: Record<string, WsGroupId> = { you: "wait", chase: "nudge", quiet: "quiet", tidy: "house", mine: "yours" };

const firstOf = (a?: Agent | null): string => {
  const n = (a?.name ?? "").trim();
  if (n) return n.split(/\s+/)[0];
  return (a?.agency ?? "").trim() || "The agent";
};
const poss = (n: string): string => (/s$/i.test(n) ? `${n}’` : `${n}’s`);

const ymdMs = (ymd: string): number => Date.parse(`${ymd}T12:00:00`);
const localYmd = (t: number): string => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const daysBetweenYmd = (a: string, b: string): number => Math.round((ymdMs(b) - ymdMs(a)) / DAY);

/** a dateless own task is a note (the board's own law, `isNoteTask`) */
const isNote = (t?: UserTask): boolean => !!t && !t.dueDate;

const NEED_TITLE: Record<AgentDataNeed, (f: string) => string> = {
  responseTime: (f) => `How long does ${f} take to reply?`,
  mswl: (f) => `Add ${poss(f)} wishlist`,
  materials: (f) => `What does ${f} want sent?`,
};

function kindOf(i: TrayItem, need?: AgentDataNeed): WsKind {
  if (i.userTask || i.bucket === "note") return "own";
  switch (i.bucket) {
    case "send": return "send";
    case "decide": return i.card.taskType === "revise_resubmit" ? "rr" : "offer";
    case "chase": return "nudge";
    case "close": return "quiet";
    default: return need ? "fix" : "other";
  }
}

const TYPE_OF: Record<WsKind, WsType | null> = { send: "Send", rr: "Send", own: "Send", offer: "Decide", nudge: "Nudge", quiet: "Close", fix: "Fill in", other: null };

function titleOf(kind: WsKind, i: TrayItem, first: string, need?: AgentDataNeed): string {
  switch (kind) {
    case "send": return `Send ${first} your ${i.query?.status === QueryStatus.FULL_REQUESTED ? "full" : "partial"}`;
    case "rr": return `Send ${first} your revision`;
    case "offer": return `Answer ${poss(first)} offer`;
    case "nudge": return `Nudge ${first}`;
    case "quiet": return `${poss(first)} gone quiet`;
    case "fix": return NEED_TITLE[need!](first);
    case "own": return (i.userTask?.text ?? i.deed).trim() || "Your task";
    default: return i.deed;
  }
}

/** One workspace task per tray item, and one per member of a housekeeping sweep. */
export function wsTasks(items: readonly TrayItem[], agents: readonly Agent[], sweepNeed: (i: TrayItem) => AgentDataNeed | null, memberIds: (i: TrayItem) => string[], nowMs: number): WsTask[] {
  const today = localYmd(nowMs);
  const out: WsTask[] = [];
  const make = (i: TrayItem, agent: Agent | undefined, need: AgentDataNeed | undefined, key: string): WsTask => {
    const kind = kindOf(i, need);
    const first = agent ? firstOf(agent) : "";
    const agentName = (agent?.name ?? "").trim() || (agent?.agency ?? "").trim();
    const agency = (agent?.agency ?? "").trim();
    const dueYmd = kind === "own" ? i.userTask?.dueDate ?? null : i.dial.ymd;
    const dueDays = kind === "fix" || kind === "quiet" || !dueYmd ? null : daysBetweenYmd(today, dueYmd.slice(0, 10));
    const quietDays = kind === "quiet" && Number.isFinite(i.anchorMs) ? Math.max(0, Math.round((nowMs - i.anchorMs) / DAY)) : null;
    const title = titleOf(kind, i, first || "the agent", need);
    return {
      key, item: i, kind, group: GROUP_OF[i.group.id] ?? "house", title, first: first || "The agent", agentName, agency,
      query: i.query, agent, userTask: i.userTask, need, dueDays, quietDays, type: TYPE_OF[kind],
      hay: `${title} ${agentName} ${agency}`.toLowerCase(),
    };
  };
  for (const i of items) {
    if (isNote(i.userTask)) continue;
    const need = sweepNeed(i);
    if (i.sweep && need) {
      for (const id of memberIds(i)) {
        const a = agents.find((x) => x.id === id);
        if (a) out.push(make(i, a, need, `${i.key}|${id}`));
      }
      continue;
    }
    out.push(make(i, i.agent, need ?? undefined, i.key));
  }
  return out;
}

/* ── filters, grouping, order ─────────────────────────────────────────────────────────────────── */

export const WS_TYPES: readonly WsType[] = ["Send", "Decide", "Nudge", "Close", "Fill in"];
export const WS_WHENS: readonly WsWhen[] = ["Overdue", "Due this week", "Coming up", "No date"];

export const whenOf = (t: WsTask): WsWhen =>
  t.dueDays == null ? "No date" : t.dueDays < 0 ? "Overdue" : t.dueDays <= 6 ? "Due this week" : "Coming up";

export interface WsFilters { q: string; types: ReadonlySet<WsType>; whens: ReadonlySet<WsWhen> }
export const NO_WS_FILTERS: WsFilters = { q: "", types: new Set(), whens: new Set() };

export function passes(t: WsTask, f: WsFilters): boolean {
  if (f.q.trim() && !t.hay.includes(f.q.trim().toLowerCase())) return false;
  if (f.types.size && !(t.type && f.types.has(t.type))) return false;
  if (f.whens.size && !f.whens.has(whenOf(t))) return false;
  return true;
}

const dueKey = (t: WsTask): number => (t.dueDays == null ? 9999 : t.dueDays);
export const byDue = (a: WsTask, b: WsTask): number => dueKey(a) - dueKey(b) || (b.quietDays ?? 0) - (a.quietDays ?? 0);

export type WsGrouping = "category" | "urgency" | "when" | "agent" | "none";
export const WS_GROUPINGS: readonly { id: WsGrouping; label: string; hint: string }[] = [
  { id: "category", label: "Category", hint: "Agents are waiting · Nudges · Gone quiet · Housekeeping · Yours" },
  { id: "urgency", label: "Urgency", hint: "Needs you now · Housekeeping · Yours" },
  { id: "when", label: "When", hint: "Overdue · Due this week · Coming up · No date" },
  { id: "agent", label: "Agent", hint: "What you owe each person" },
  { id: "none", label: "None", hint: "One flat list" },
];

/** the band class a group's header takes (`wait` is navy; the rest are the mock's tints) */
export type WsBand = "wait" | "nudge" | "quiet" | "house" | "yours";
export interface WsSection { id: string; name: string; band: WsBand; tasks: WsTask[] }

export function wsSections(tasks: readonly WsTask[], g: WsGrouping): WsSection[] {
  const sorted = [...tasks].sort(byDue);
  if (g === "category") return WS_GROUPS.map((x) => ({ id: x.id, name: x.name, band: x.id, tasks: sorted.filter((t) => t.group === x.id) }));
  if (g === "urgency") {
    const now = sorted.filter((t) => t.group === "wait" || t.group === "nudge" || t.group === "quiet");
    return [
      { id: "now", name: "Needs you now", band: "wait", tasks: now },
      { id: "house", name: "Housekeeping", band: "house", tasks: sorted.filter((t) => t.group === "house") },
      { id: "yours", name: "Yours", band: "yours", tasks: sorted.filter((t) => t.group === "yours") },
    ];
  }
  if (g === "when") {
    return WS_WHENS.map((w, n) => ({ id: w, name: w, band: (["wait", "nudge", "quiet", "house"] as const)[n], tasks: sorted.filter((t) => whenOf(t) === w) }));
  }
  if (g === "agent") {
    const names = [...new Set(sorted.map((t) => t.agentName || "Yours"))];
    return names.map((n) => ({ id: `a:${n}`, name: n, band: n === "Yours" ? "yours" : "quiet", tasks: sorted.filter((t) => (t.agentName || "Yours") === n) }));
  }
  return [{ id: "all", name: "Everything", band: "quiet", tasks: sorted }];
}

/* ── the page header's priority line ──────────────────────────────────────────────────────────── */

/** "Sending Clara at Harbour Lane your partial" */
export function doingPhrase(t: WsTask): string {
  const who = t.agency && t.agentName && t.agentName !== t.agency ? `${t.first} at ${t.agency}` : t.first;
  switch (t.kind) {
    case "offer": return t.agency && t.agentName !== t.agency ? `Answering ${poss(t.first)} offer from ${t.agency}` : `Answering ${poss(t.first)} offer`;
    case "send": return `Sending ${who} your ${t.query?.status === QueryStatus.FULL_REQUESTED ? "full" : "partial"}`;
    case "rr": return `Sending ${who} your revision`;
    case "nudge": return `Nudging ${who}`;
    case "quiet": return `Deciding what to do about ${who}`;
    case "fix":
      return t.need === "responseTime" ? `Adding how long ${who} takes to reply`
        : t.need === "mswl" ? `Adding ${poss(who)} wishlist` : `Adding what ${who} wants sent`;
    default: return t.title;
  }
}

/**
 * The one task the header names. Urgent: an offer due within a day, else the most overdue dated task (Gone quiet
 * excluded). Otherwise the next best: the soonest dated task, then Gone quiet, then Housekeeping.
 */
export function priorityTask(tasks: readonly WsTask[]): { task: WsTask | null; urgent: boolean } {
  const dated = tasks.filter((t) => t.kind !== "quiet" && t.dueDays != null);
  const offer = dated.filter((t) => t.kind === "offer" && (t.dueDays as number) <= 1).sort(byDue)[0];
  if (offer) return { task: offer, urgent: true };
  const late = dated.filter((t) => (t.dueDays as number) < 0).sort(byDue)[0];
  if (late) return { task: late, urgent: true };
  const next = [...dated].sort(byDue)[0]
    ?? [...tasks].filter((t) => t.kind === "quiet").sort((a, b) => (b.quietDays ?? 0) - (a.quietDays ?? 0))[0]
    ?? tasks.find((t) => t.kind === "fix")
    ?? tasks[0];
  return { task: next ?? null, urgent: false };
}

/* ── the tray row's day count ─────────────────────────────────────────────────────────────────── */

export interface DayBit { big: string | null; small: string; late: boolean }
export function dayBit(t: WsTask): DayBit {
  if (t.kind === "fix" || t.kind === "other" && t.dueDays == null) return { big: null, small: "No date", late: false };
  if (t.kind === "quiet") return { big: t.quietDays != null ? String(t.quietDays) : null, small: t.quietDays != null ? "days in" : "No date", late: false };
  if (t.dueDays == null) return { big: null, small: "No date", late: false };
  if (t.dueDays === 0) return { big: "Today", small: "", late: true };
  if (t.dueDays < 0) return { big: String(-t.dueDays), small: -t.dueDays === 1 ? "day late" : "days late", late: true };
  return { big: String(t.dueDays), small: t.dueDays === 1 ? "day left" : "days left", late: false };
}

/** the desk header's due chip: [figure, words], or null */
export function dueChip(t: WsTask): { b: string; s: string; late: boolean } | null {
  if (t.kind === "fix") return null;
  if (t.kind === "quiet") return t.quietDays != null ? { b: String(t.quietDays), s: "days", late: false } : null;
  if (t.dueDays == null) return null;
  if (t.dueDays === 0) return { b: "Today", s: "", late: true };
  if (t.dueDays < 0) return { b: String(-t.dueDays), s: -t.dueDays === 1 ? "day late" : "days late", late: true };
  return { b: String(t.dueDays), s: t.dueDays === 1 ? "day left" : "days left", late: false };
}

/* ── the Mentor's first line on the desk ─────────────────────────────────────────────────────── */

export interface QuietFacts {
  /** a nudge already logged since the last send */
  nudgedOn: Date | null;
  /** the agency says no reply means no */
  nrmn: boolean;
  /** the agency's stated reply time, in weeks */
  windowWeeks: number | null;
}

export function mentorLine(t: WsTask, facts?: QuietFacts): string {
  const a = t.first;
  switch (t.kind) {
    case "send": return `${a} asked for your ${t.query?.status === QueryStatus.FULL_REQUESTED ? "full manuscript" : "partial"}. Once it’s gone, log it here and I’ll keep an eye out for ${poss(a)} reply.`;
    case "rr": return `${a} asked you to revise and resubmit. Once the new version’s gone, log it here and I’ll keep an eye out for the reply.`;
    case "offer": return `An offer! Take your time. Tell me what you said to ${a} and I’ll sort out what happens next.`;
    case "nudge": return `${a} is past their reply time. A short, friendly nudge is completely normal. Let me know once you’ve sent it.`;
    case "quiet": {
      const weeks = t.quietDays != null ? Math.round(t.quietDays / 7) : null;
      if (facts?.nudgedOn) return `You nudged ${a} on ${facts.nudgedOn.getDate()} ${MONTHS_LONG[facts.nudgedOn.getMonth()]} and still nothing. You can close it, or give ${a} a little longer.`;
      if (facts?.nrmn && facts.windowWeeks && weeks != null) return `${t.agency || a} say no reply after ${facts.windowWeeks} weeks means no, and it’s been ${weeks} weeks. Closing it is reasonable, but it’s your call.`;
      return `${weeks != null ? `It’s been ${weeks} weeks` : "It’s been a long while"} with no word from ${a}. One polite nudge is normal before you give up on it.`;
    }
    case "fix":
      return t.need === "responseTime" ? `A quick one. Knowing how long ${a} takes means I can tell you when a nudge is due.`
        : t.need === "mswl" ? `A quick one. ${poss(a)} wishlist helps you check your book is a fit.`
        : `A quick one. Knowing what ${a} wants sent means you’ll have it ready when you query.`;
    case "own": {
      const steps = t.userTask ? (t.userTask as UserTask & { steps?: unknown[] }).steps : undefined;
      return steps && steps.length ? "This one’s yours. Tick the steps off as you go, then mark it done." : "This one’s yours. Mark it done when it’s finished, or break it into steps if it’s a big one.";
    }
    default: return `This one needs doing from ${t.agentName ? `${poss(a)} card` : "its own page"}. Open it and it comes off your list once it’s done.`;
  }
}

/** "the suggested choice" for Gone quiet */
export type QuietAct = "nudge" | "wait" | "replied" | "close";
export function quietSuggestion(facts: QuietFacts): QuietAct {
  if (facts.nudgedOn) return "close";
  if (facts.nrmn) return "close";
  return "nudge";
}

/* ── the reply-time slider's words ───────────────────────────────────────────────────────────── */

export function replyWords(w: number | null): [string, string] {
  if (!w) return ["Not set yet", "Drag the slider"];
  const months = Math.round((w / 4.345) * 2) / 2;
  const m = w >= 8 ? ` · about ${months % 1 ? `${Math.floor(months)} and a half` : months} months` : "";
  const d = w <= 2 ? "Very quick" : w <= 6 ? "Quicker than most" : w <= 12 ? `About average${m}` : `Slower than most${m}`;
  return [`${w} week${w === 1 ? "" : "s"}`, d];
}

/** "Query letter, synopsis and full manuscript" */
export const andList = (a: readonly string[]): string => (a.length < 2 ? (a[0] ?? "") : `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`);
