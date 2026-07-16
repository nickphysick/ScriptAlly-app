/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * todoBoard — the PURE view-model for the To-do board's four columns. It assembles cards from the
 * existing derived task engine (`tasks` memo → Do next + Housekeeping), the stored `UserTask`
 * collection (Your tasks), and the `clearedToday` union (Cleared today). Nothing here is stored;
 * commit state is READ from where it lives — `UserTask.committedDate` for user tasks,
 * a matching `TaskFlag.committedDate` for derived tasks (taskFlags are stances on derived tasks).
 *
 * Card copy is derived here so the component just renders it; the emphasised agent name is returned
 * separately (`who`) so the view can style it (serif-italic burgundy) without parsing the title.
 * Unit-tested for column membership, commit state, and the cleared union — not the prose.
 */

import { Task, Query, Agent, Manuscript, UserTask, TaskFlag, QueryStatus, Activity } from "../types";
import { queryAmbientStatus } from "./queryAmbient";
import { agentDataQualityNeeds } from "./agentDataQuality";
import { agentPrimary, agentInitials } from "./agentDisplay";
import { flagMatchesTask, isFlagSuppressing } from "./taskFlags";
import { clearedTodayItems } from "./clearedToday";

/** The stance-store taskType for a note (UserTask) snooze/mute — the quick rail's ⏸ writes a
 *  TaskFlag with this type + the task id in queryId. Notes have no engine task, so the lane filters
 *  them here (the same suppress-while-snoozed rule the engine applies to derived tasks). */
export const USER_TASK_FLAG_TYPE = "user_task";

export type BoardStream = "do" | "hk" | "nt" | "done";

/** Derived task types the board surfaces (querying_unstarted / dream_agent are OUT of scope). */
const DO_NEXT_TYPES: ReadonlySet<string> = new Set(["offer_received", "partial_requested", "full_requested", "revise_resubmit", "nudge_overdue"]);
const HK_TYPES: ReadonlySet<string> = new Set(["data_quality_poor", "no_response_close"]);

export function boardStreamForTaskType(taskType: string): "do" | "hk" | null {
  if (DO_NEXT_TYPES.has(taskType)) return "do";
  if (HK_TYPES.has(taskType)) return "hk";
  return null;
}

export interface BoardCard {
  key: string;
  stream: BoardStream;
  title: string;
  who: string; // the emphasised name (agent / subject) inside the title
  subtitle: string;
  due: string; // mono chip label
  warn: boolean;
  snoozes: number;
  status?: QueryStatus; // → StatusDot; absent for housekeeping + user tasks
  hk: boolean; // housekeeping glyph (no status dot)
  initials: string;
  record: string; // meta line — agency / "On {manuscript}"
  committed: boolean; // committedDate === today
  committedDate?: string; // raw "YYYY-MM-DD" — set even when it's a prior day (rollover detection)
  done: boolean;
  whenMs?: number; // cleared-today cards only — the completion instant, for the done-band time + newest-first order
  // action wiring
  taskType?: string;
  relatedRecordId?: string;
  userTaskId?: string;
}

/**
 * Three lanes (do / hk / nt) + the cleared-today union. `cleared` is NOT a lane — the "Cleared today"
 * column was retired; it feeds the Today's-list DONE-BAND (the day's record). Same union as before,
 * just re-projected: one completion → one done item. Sorted newest-first for the band.
 */
export interface AssembledBoard {
  do: BoardCard[];
  hk: BoardCard[];
  nt: BoardCard[];
  cleared: BoardCard[];
}

export interface BoardInput {
  tasks: Task[]; // the engine's derived tasks (already snooze-filtered)
  userTasks: UserTask[];
  queries: Query[];
  agents: Agent[];
  manuscripts: Manuscript[];
  taskFlags: TaskFlag[];
  activities: Activity[];
  today: string; // "YYYY-MM-DD" local
  now: number;
}

const dqLabel = (gap?: string) =>
  gap === "mswl" ? "no wish list" : gap === "materials" ? "no materials listed" : gap === "responseTime" ? "no reply window" : "details to add";
const dqSub = (gap?: string) =>
  gap === "mswl" ? "We can’t tell you what they’re after" : gap === "materials" ? "We don’t know what to tell you to send" : gap === "responseTime" ? "We can’t tell you when a nudge is fair" : "";

/** The derived-task card copy (title/who/subtitle/due/warn/status/hk). */
function derivedCopy(task: Task, q: Query | undefined, ag: Agent | undefined, ms: Manuscript | undefined, now: number) {
  const name = ag ? agentPrimary(ag) : "an agent";
  const msTitle = ms?.title ?? "";
  const agentWait = () => (q ? queryAmbientStatus(q, "agent", undefined, now) : null);
  switch (task.taskType) {
    case "offer_received":
      return { title: `${name} has made an offer`, who: name, subtitle: msTitle || "Respond when you’re ready", due: "OFFER", warn: true, status: q?.status, hk: false };
    case "partial_requested":
      return { title: `Send your partial to ${name}`, who: name, subtitle: msTitle, due: "OVER TO YOU", warn: false, status: q?.status, hk: false };
    case "full_requested":
      return { title: `Send your full to ${name}`, who: name, subtitle: msTitle, due: "OVER TO YOU", warn: true, status: q?.status, hk: false };
    case "revise_resubmit":
      return { title: `Resubmit your R&R to ${name}`, who: name, subtitle: msTitle, due: "OVER TO YOU", warn: false, status: q?.status, hk: false };
    case "nudge_overdue": {
      const a = agentWait();
      const days = a && a.sentMs != null ? a.nDays : null;
      return { title: `Nudge ${name}`, who: name, subtitle: msTitle, due: days != null ? `${days} DAYS · NO REPLY` : "NO REPLY YET", warn: days != null && days > 84, status: q?.status, hk: false };
    }
    case "no_response_close": {
      const a = agentWait();
      const days = a && a.sentMs != null ? a.nDays : null;
      return { title: `${name} silent${days != null ? ` for ${days} days` : ""}`, who: name, subtitle: "No reply — consider closing", due: "STALE QUERY", warn: true, status: q?.status, hk: false };
    }
    case "data_quality_poor": {
      const gap = ag ? agentDataQualityNeeds(ag)[0] : undefined;
      return { title: `${name} has ${dqLabel(gap)}`, who: name, subtitle: dqSub(gap), due: "HOUSEKEEPING", warn: false, status: undefined as QueryStatus | undefined, hk: true };
    }
    default:
      return { title: task.title, who: "", subtitle: task.context, due: "", warn: false, status: q?.status, hk: false };
  }
}

function derivedCard(task: Task, input: BoardInput): BoardCard | null {
  const stream = boardStreamForTaskType(task.taskType);
  if (!stream) return null;
  const q = input.queries.find((x) => x.id === task.relatedRecordId);
  const ag = q ? input.agents.find((a) => a.id === q.agentId) : input.agents.find((a) => a.id === task.relatedRecordId);
  const ms = q ? input.manuscripts.find((m) => m.id === q.manuscriptId) : undefined;
  const c = derivedCopy(task, q, ag, ms, input.now);
  const flag = input.taskFlags.find((f) => flagMatchesTask(f, task.taskType, task.relatedRecordId));
  return {
    key: task.id,
    stream,
    title: c.title,
    who: c.who,
    subtitle: c.subtitle,
    due: c.due,
    warn: c.warn,
    snoozes: flag?.snoozeCount ?? 0,
    status: c.status,
    hk: c.hk,
    initials: ag ? agentInitials(ag) : "•",
    record: ag ? [agentPrimary(ag), ag.agency].filter(Boolean).join(" · ") : "",
    committed: flag?.committedDate === input.today,
    committedDate: flag?.committedDate,
    done: false,
    taskType: task.taskType,
    relatedRecordId: task.relatedRecordId,
  };
}

/** "6 Jul" — the note tag's short date (en-GB); empty on an unparsable value. */
const shortDate = (iso?: string): string => {
  if (!iso) return "";
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? "" : new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

function userCard(t: UserTask, input: BoardInput): BoardCard {
  const rec = t.agentId
    ? input.agents.find((a) => a.id === t.agentId)
    : undefined;
  const ms = t.manuscriptId ? input.manuscripts.find((m) => m.id === t.manuscriptId) : undefined;
  const record = rec ? `On ${agentPrimary(rec)}` : ms ? `On ${ms.title}` : "Your note";
  // The mockup's note tag: "Note · 6 Jul" — the due date when set, else when it was jotted.
  const noteDate = shortDate(t.dueDate ?? t.createdAt);
  return {
    key: t.id,
    stream: "nt",
    title: t.text || "New task",
    who: "",
    subtitle: "",
    due: noteDate ? `Note · ${noteDate}` : "Note",
    warn: false,
    snoozes: 0,
    hk: false,
    initials: "✎",
    record,
    committed: t.committedDate === input.today,
    committedDate: t.committedDate,
    done: false,
    userTaskId: t.id,
  };
}

/** Do-next ordering: Offer pinned top; then warn-first; stable otherwise. */
function orderDoNext(cards: BoardCard[]): BoardCard[] {
  const rank = (c: BoardCard) => (c.taskType === "offer_received" ? 0 : c.warn ? 1 : 2);
  return [...cards].sort((a, b) => rank(a) - rank(b));
}

export function assembleBoard(input: BoardInput): AssembledBoard {
  const derived = input.tasks.map((t) => derivedCard(t, input)).filter((c): c is BoardCard => c != null);
  const doCards = orderDoNext(derived.filter((c) => c.stream === "do"));
  const hkCards = derived.filter((c) => c.stream === "hk");

  // Notes to self — open (not done) user tasks, most-recent first, minus snoozed/muted ones
  // (the quick rail's ⏸ writes a `user_task` TaskFlag stance; nothing is deleted).
  const ntCards = input.userTasks
    .filter((t) => !t.done)
    .filter((t) => {
      const flag = input.taskFlags.find((f) => flagMatchesTask(f, USER_TASK_FLAG_TYPE, t.id));
      return !flag || !isFlagSuppressing(flag, input.now);
    })
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))
    .map((t) => userCard(t, input));

  // Cleared today — the union (activities today · user tasks done today · flags resolved today).
  // Retired as a lane; re-projected here (newest-first) for the Today's-list done-band.
  const cleared = clearedTodayItems({ activities: input.activities, userTasks: input.userTasks, taskFlags: input.taskFlags, now: input.now });
  const clearedCards: BoardCard[] = [
    ...cleared.userTasks.map((t) => ({ ...blankDone(`done-task-${t.id}`), title: t.text || "Task", record: "Your task", whenMs: msOf(t.completedAt) })),
    ...cleared.activities.map((a, i) => clearedActivityCard(a, i, input)),
    ...cleared.flags.map((f, i) => clearedFlagCard(f, i, input)),
  ].sort((a, b) => (b.whenMs ?? 0) - (a.whenMs ?? 0));

  return { do: doCards, hk: hkCards, nt: ntCards, cleared: clearedCards };
}

const msOf = (iso?: string): number | undefined => {
  if (!iso) return undefined;
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? undefined : ms;
};

/**
 * The Today's-list split, for the corner pop-up's two bands. `committed` = lane cards committed to
 * TODAY (committedDate === today) — the committed band, and the set the 5-cap governs; lane cards are
 * inherently open (a done user task leaves `nt`, an actioned derived task leaves the engine). `done` =
 * the cleared-today union (the done-band, uncapped). Rolled-over items (a prior committedDate) are
 * NOT committed-today — they surface via `rolledOverCards`, not here. The two counts are independent.
 */
export function todaySplit(board: AssembledBoard, today: string): { committed: BoardCard[]; done: BoardCard[] } {
  const laneCards = [...board.do, ...board.hk, ...board.nt];
  return { committed: laneCards.filter((c) => c.committedDate === today), done: board.cleared };
}

/**
 * The ribbon's three metric tiles. Urgent/notes ARE their lane lengths; housekeeping is the GAP
 * count (todoHousekeeping.hkGapCount over the grouped view — the number of fixable gaps, not piles:
 * the mockup's lane badge 25 = 12+9+4), passed in because todoHousekeeping imports BoardCard from
 * here (a direct import back would be circular). The lane headers read the SAME object as the
 * ribbon, so tile ↔ lane equality holds by construction.
 */
export function ribbonTiles(board: AssembledBoard, housekeepingGaps: number): { urgent: number; housekeeping: number; notes: number } {
  return { urgent: board.do.length, housekeeping: housekeepingGaps, notes: board.nt.length };
}

function blankDone(key: string): BoardCard {
  return { key, stream: "done", title: "", who: "", subtitle: "", due: "", warn: false, snoozes: 0, hk: false, initials: "", record: "", committed: false, done: true };
}
function clearedActivityCard(a: Activity, i: number, input: BoardInput): BoardCard {
  const q = input.queries.find((x) => x.id === a.queryId);
  const ag = q ? input.agents.find((x) => x.id === q.agentId) : undefined;
  return { ...blankDone(`done-act-${a.id ?? i}`), title: a.description || a.activityType, record: ag ? agentPrimary(ag) : "Query", whenMs: msOf(a.date) };
}
function clearedFlagCard(f: TaskFlag, i: number, input: BoardInput): BoardCard {
  const ag = f.agentId ? input.agents.find((x) => x.id === f.agentId) : undefined;
  const q = f.queryId ? input.queries.find((x) => x.id === f.queryId) : undefined;
  const agent2 = q ? input.agents.find((x) => x.id === q.agentId) : ag;
  return { ...blankDone(`done-flag-${f.id ?? i}`), title: agent2 ? `${agentPrimary(agent2)} — sorted` : "Sorted", record: "Housekeeping", whenMs: msOf(f.resolvedAt) };
}
