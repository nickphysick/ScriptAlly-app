/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v3 — ONE SOURCE FOR EVERY PHONE FIGURE (ref phone-app-v3.html `info`, `tasks`, `counts`: "everything a
 * screen says about a query comes from here, so screens never disagree").
 *
 * ⚠️ IT DERIVES FROM THE APP'S OWN ENGINES AND RESTATES NONE OF THEIR RULES:
 *    - whose court a query is in: the Query Centre's six states (`queryState`, via `stampRows` over `buildQcRows`),
 *      which honour the writer's Gone-quiet setting (`quietWeeksOf`), folded into four by `quickOf`;
 *    - the task a query creates, its verb and its title: the desktop To-do workspace's own task (`useWsCore` → `wsTasks`),
 *      matched by query id;
 *    - the reply date: the state's own `replyExpectedMs` (a nudged query waits the quiet window from the nudge);
 *    - Today's groups: the workspace's own groups (`WS_GROUPS`), with its offers named apart, as the ref draws them.
 *    What is added here is WORDS: the one short line, the status said once, and the "Your next step" pair.
 *
 * ⚠️ TWO "GONE QUIET"S, AND THEY ARE DIFFERENT QUESTIONS. The court (Queries' chip, Today's hero) is the query's state.
 *    Today's "Gone quiet" task group is the To-do board's close task, which has its own, longer clock. The report says so.
 *
 * ⚠️ COPY: no "Overdue", no "late", no verdict words, no "he"/"she" for an agent (PA3-10).
 */
import { QueryStatus, type Agent } from "../types";
import { STAGE_NAME, type QcRow } from "./qcSummary";
import { quickOf, stampRows, type Ctx, type QueryState, type QuickKey, type Stamped } from "./queryState";
import { span } from "./qcCardStory";
import { dayMonth } from "./dates";
import { anyToMs } from "./qcStages";
import { WS_GROUPS, type WsGroupId, type WsTask } from "./todoWs";

const DAY = 86_400_000;

export type V3Court = QuickKey;
export const V3_COURTS: readonly V3Court[] = ["you", "agent", "quiet", "closed"];
export const COURT_LABEL: Record<V3Court, string> = { you: "With you", agent: "With the agent", quiet: "Gone quiet", closed: "Closed" };

export interface V3Step { title: string; sub: string }

export interface V3Query {
  id: string;
  row: QcRow & Stamped;
  state: QueryState;
  court: V3Court;
  /** the status, said once: the stage's own name, or how it closed */
  status: string;
  /** the one short line after the status (ref `info().short`): "6 days ago", "Reply expected by 3 Dec", "quiet since 10 Jul" */
  short: string;
  /** the To-do workspace's own task for this query, if it has one */
  task: WsTask | null;
  /** the task's verb (the workspace's own: Send · Decide · Nudge · Close · Fill in) */
  verb: string | null;
  taskTitle: string | null;
  /** "Your next step" — none on a closed query */
  step: V3Step | null;
  /** day N since it was queried, and when (null when undated) */
  day: number | null;
  queriedMs: number | null;
  /** the reply date the state reads (a nudge moves it); null when undated or not with the agent */
  replyMs: number | null;
  /** Birds-eye: how far through the reply window (0–1), and the window's start */
  gone: number | null;
}

const firstOf = (name: string): string => (name || "").trim().split(/\s+/)[0] || "The agent";
const startOfDay = (ms: number): number => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
const daysBetween = (a: number, b: number): number => Math.round((startOfDay(b) - startOfDay(a)) / DAY);
/** "today", "yesterday", "5 days ago", "3 weeks ago" */
export function ago(ms: number, nowMs: number): string {
  const d = daysBetween(ms, nowMs);
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  return `${span(ms, nowMs)} ago`;
}
const dm = (ms: number): string => dayMonth(ms);

/** what the agent asked for, said as the ref says it */
function asked(status: QueryStatus | string): string {
  return status === QueryStatus.PARTIAL_REQUESTED ? "the partial" : status === QueryStatus.FULL_REQUESTED ? "the full manuscript" : "a revision";
}

function statusWords(r: QcRow): string {
  return STAGE_NAME[r.status as QueryStatus] ?? String(r.status);
}

function lineAndStep(r: QcRow & Stamped, state: QueryState, nowMs: number, email: string | null): { short: string; step: V3Step | null } {
  const first = firstOf(r.agentName);
  const since = r.stageStartMs ?? r.sentMs;
  switch (state) {
    case "closed":
      return { short: dm(r.lastMs), step: null };
    case "offer":
      return {
        short: since != null ? ago(since, nowMs) : "",
        step: { title: `${first} has offered to represent you.`, sub: "Take the time you need. Record your answer here when you’ve decided." },
      };
    case "materials":
      return {
        short: since != null ? ago(since, nowMs) : "",
        step: { title: `${first} asked for ${asked(r.status)}${since != null ? ` ${ago(since, nowMs)}` : ""}.`, sub: "Send it from your email, then mark it sent here." },
      };
    case "nudge": {
      const weeks = since != null ? Math.max(1, Math.round((nowMs - since) / (7 * DAY))) : null;
      return {
        short: since != null ? ago(since, nowMs) : "",
        step: {
          title: weeks != null ? `It’s been ${weeks} ${weeks === 1 ? "week" : "weeks"} without a reply.` : "No reply yet.",
          sub: `Send ${first} a nudge from your own email, then log it here.${email ? ` It goes to ${email}.` : ""}`,
        },
      };
    }
    case "agent": {
      const by = r.replyMs ?? null;
      return {
        short: by != null ? `Reply expected by ${dm(by)}` : since != null ? `Sent ${dm(since)}` : "Waiting to hear",
        step: { title: "Nothing to do for now.", sub: by != null ? `Reply expected by ${dm(by)}.` : "No reply date is saved for this agent." },
      };
    }
    case "quiet": {
      const nudgedMs = r.nudged ? anyToMs(r.query.lastNudgeSentDate) ?? anyToMs(r.query.nudgeDate) ?? NaN : NaN;
      const weeks = since != null ? Math.max(1, Math.round((nowMs - since) / (7 * DAY))) : null;
      return {
        short: Number.isFinite(nudgedMs) ? `quiet since ${dm(nudgedMs)}` : since != null ? ago(since, nowMs) : "",
        step: {
          title: Number.isFinite(nudgedMs) ? `No reply since you nudged on ${dm(nudgedMs)}.` : weeks != null ? `No reply for ${weeks} ${weeks === 1 ? "week" : "weeks"}.` : "No reply.",
          sub: "Many agents don’t reply to say no. Close it, or leave it open a while longer.",
        },
      };
    }
    default: {
      const unhandled: never = state;
      return unhandled;
    }
  }
}

export interface V3Input {
  rows: readonly QcRow[];
  agents: readonly Agent[];
  /** the To-do workspace's own tasks (`useWsCore(now).all`) */
  tasks: readonly WsTask[];
  quietWeeks: number;
  nowMs: number;
}

/** every query, said once */
export function v3Queries(inp: V3Input): V3Query[] {
  const c: Ctx = { quietWeeks: inp.quietWeeks, nowMs: inp.nowMs };
  const stamped = stampRows(inp.rows as QcRow[], inp.agents, c);
  const taskOf = new Map<string, WsTask>();
  for (const t of inp.tasks) if (t.query && !taskOf.has(t.query.id)) taskOf.set(t.query.id, t);
  const emailOf = new Map(inp.agents.map((a) => [a.id, (a.email ?? "").trim() || null]));
  return stamped.map((r) => {
    const state = r.qs ?? "agent";
    const court = quickOf(state);
    const { short, step } = lineAndStep(r, state, inp.nowMs, emailOf.get(r.query.agentId) ?? null);
    const task = court === "closed" ? null : taskOf.get(r.id) ?? null;
    const start = r.stageStartMs ?? r.sentMs;
    const end = r.replyMs ?? r.expectedMs;
    const gone = state === "agent" || state === "nudge"
      ? (end != null && start != null && end > start ? Math.max(0, Math.min(1.5, (inp.nowMs - start) / (end - start))) : null) : null;
    return {
      id: r.id, row: r, state, court, status: statusWords(r), short, step,
      task, verb: task?.type ?? null, taskTitle: task?.title ?? null,
      day: r.sentMs != null ? Math.max(0, daysBetween(r.sentMs, inp.nowMs)) : null,
      queriedMs: r.sentMs, replyMs: state === "agent" || state === "nudge" ? end ?? null : null, gone,
    };
  });
}

export type V3Counts = Record<V3Court | "all" | "active", number>;
/** the chips' and the hero's figures: one count per court, over the same queries */
export function v3Counts(qs: readonly V3Query[]): V3Counts {
  const out: V3Counts = { you: 0, agent: 0, quiet: 0, closed: 0, all: qs.length, active: 0 };
  for (const q of qs) out[q.court] += 1;
  out.active = out.all - out.closed;
  return out;
}

/** a court's rows, in the ref's order: tasks by kind (offers first), then the newest stage first */
const KIND_ORDER: Record<QueryState, number> = { offer: 0, materials: 1, nudge: 2, quiet: 3, agent: 4, closed: 5 };
export function courtRows(qs: readonly V3Query[], court: V3Court): V3Query[] {
  return qs.filter((q) => q.court === court).sort((a, b) =>
    KIND_ORDER[a.state] - KIND_ORDER[b.state] || (b.row.stageStartMs ?? b.row.lastMs) - (a.row.stageStartMs ?? a.row.lastMs) || a.row.agentName.localeCompare(b.row.agentName));
}

/* ── Today ───────────────────────────────────────────────────────────────────────────────────────────────────── */

export interface TodayGroup { id: string; name: string; tasks: WsTask[]; folded: boolean }

/** the workspace's groups, under the ref's headings where it draws them; the rest under their desktop names, housekeeping folded */
const TODAY_NAME: Partial<Record<WsGroupId, string>> = { wait: "Agents are waiting on you", nudge: "Time for a nudge", quiet: "Gone quiet" };
export function todayGroups(ordered: readonly WsTask[]): TodayGroup[] {
  const out: TodayGroup[] = [];
  const offers = ordered.filter((t) => t.group === "wait" && t.kind === "offer");
  if (offers.length) out.push({ id: "offer", name: "An offer to answer", tasks: offers, folded: false });
  for (const g of WS_GROUPS) {
    const ts = ordered.filter((t) => t.group === g.id && !(g.id === "wait" && t.kind === "offer"));
    if (ts.length) out.push({ id: g.id, name: TODAY_NAME[g.id] ?? g.name, tasks: ts, folded: g.id === "house" });
  }
  return out;
}

/** a task row's line: "agency · short line" (a writer's own task: its due words, where it has them) */
export function taskLine(t: WsTask, q: V3Query | null): string {
  const agency = (t.agency || "").trim();
  const parts = [agency && agency !== "No agency" ? agency : t.agentName && !t.title.includes(firstOf(t.agentName)) ? t.agentName : "", q?.short ?? ""];
  return parts.filter(Boolean).join(" · ");
}

/* ── Phone app v4: the step as a button (added; nothing above changes) ── */

export type V3ActKind = "sent" | "nudge" | "close" | "offer" | "reply";
export interface V3Act { label: string; kind: V3ActKind }
/** the one filled button for a query's next step, and the one link beneath it; null on a closed query. Each opens the
 *  app's existing journey (the query drawer, or v3's reply journey). */
export function nextActs(q: Pick<V3Query, "state" | "row">): { primary: V3Act; second: V3Act | null } | null {
  const first = firstOf(q.row.agentName);
  switch (q.state) {
    case "materials": {
      const what = q.row.status === QueryStatus.PARTIAL_REQUESTED ? "partial" : q.row.status === QueryStatus.FULL_REQUESTED ? "full" : "revision";
      return { primary: { label: `Mark ${what} sent`, kind: "sent" }, second: { label: `${first} replied again`, kind: "reply" } };
    }
    case "offer": return { primary: { label: "Record your answer", kind: "offer" }, second: null };
    case "nudge": return { primary: { label: `I’ve nudged ${first}`, kind: "nudge" }, second: { label: "Close this query", kind: "close" } };
    case "quiet": return { primary: { label: "Close this query", kind: "close" }, second: { label: `I’ve nudged ${first}`, kind: "nudge" } };
    case "agent": return { primary: { label: `Log ${first}’s reply`, kind: "reply" }, second: { label: "Close this query", kind: "close" } };
    case "closed": return null;
    default: { const unhandled: never = q.state; return unhandled; }
  }
}
