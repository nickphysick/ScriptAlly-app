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

import { Task, Query, Agent, Manuscript, UserTask, SurfaceOffset, TaskFlag, QueryStatus, Activity, ActivityType } from "../types";
import { OFFER_RECEIVED_DESC_RE } from "./activityUtils";
import { queryAmbientStatus } from "./queryAmbient";
import { agentDataQualityNeeds } from "./agentDataQuality";
import { agentPrimary, agentInitials } from "./agentDisplay";
import { flagMatchesTask, isFlagSuppressing } from "./taskFlags";
import { clearedTodayItems } from "./clearedToday";
import { isoWeekStart } from "./dashboardStats";
import { replyTask } from "./taskPrecedence";

/** The stance-store taskType for a note (UserTask) snooze/mute — the quick rail's ⏸ writes a
 *  TaskFlag with this type + the task id in queryId. Notes have no engine task, so the lane filters
 *  them here (the same suppress-while-snoozed rule the engine applies to derived tasks). */
export const USER_TASK_FLAG_TYPE = "user_task";

export type BoardStream = "do" | "hk" | "nt" | "done";

/** Derived task types the board surfaces (querying_unstarted / dream_agent are OUT of scope). */
const DO_NEXT_TYPES: ReadonlySet<string> = new Set(["offer_received", "partial_requested", "full_requested", "revise_resubmit", "nudge_overdue"]);
const HK_TYPES: ReadonlySet<string> = new Set(["data_quality_poor", "no_response_close"]);

/**
 * ⚠️ THE SILENCE ANCHOR — how long an agent has been quiet, in whole days.
 *
 * THE BUG THIS FIXES: the card read the figure off `queryAmbientStatus(q, "agent")`, which picks
 * its send date from the query's STATUS — QUERIED → dateSent, PARTIAL_SENT → partialSentDate,
 * anything else → fullSentDate. A nudge/close task on a query in any other status therefore
 * looked for a `fullSentDate` that was never set, got NaN, fell through to the override branch
 * with `sentMs: null`, and the template printed a bare "SILENT" — dropping a figure `dateSent`
 * could have supplied all along.
 *
 * ⚠️ FIXED HERE RATHER THAN IN queryAmbientStatus, deliberately: that function drives the Queries
 * tracking readout, where "days at THIS stage" is the correct reading. Silence since the writer
 * last sent ANYTHING is a different question, and this is the only place that asks it.
 *
 * Falls back down the chain and returns null only when the query genuinely carries no send date —
 * in which case "SILENT" with no figure is the honest render, not a dropped one.
 */
export function silentDays(
  q: Pick<Query, "status" | "dateSent" | "partialSentDate" | "fullSentDate"> | undefined,
  now: number,
): number | null {
  if (!q) return null;
  const st = q.status as QueryStatus;
  const stageIso = st === QueryStatus.PARTIAL_SENT ? q.partialSentDate
    : st === QueryStatus.FULL_SENT ? q.fullSentDate
    : q.dateSent;
  const iso = stageIso ?? q.dateSent;
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return null;
  return Math.max(0, Math.floor((now - ms) / 86400000));
}

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
  due: string; // mono chip label — the STATUS lane's tabular figures (the tightening P2)
  kind?: string; // the KIND lane's facet tag (OFFER · AGENT WAITING · STALE · …) — pure presentation
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
  quiet?: boolean; // offer cards only (P4): "I need time" set — reduced emphasis until the reminder or reply-by wakes it
  // action wiring
  taskType?: string;
  relatedRecordId?: string;
  /* ⚠️ IDENTITY, not presentation. The card carried the agent's NAME and the query id, so two
     queries to one agent were indistinguishable to any dedupe and identical to the eye. These two
     are what "the same piece of work" actually means here. */
  agentId?: string;
  msTitle?: string;
  userTaskId?: string;
  // notes-and-tasks: the two natures of a user card + the derived task state (user cards only).
  nature?: "note" | "task";
  dueState?: "future" | "today" | "overdue"; // set for a task; drives the due-day promotion
  detail?: string; // the optional detail line
  dueYmd?: string; // the raw dueDate "YYYY-MM-DD"
  surfaceOffset?: SurfaceOffset;
  surfaced?: boolean; // DERIVED — reached its in-app surfacing window (today >= dueDate − lead) → on Today's list
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
  mutedTaskRules?: string[]; // Task Settings — the Sunday CARD reads "sunday_review" here (engine tasks are already mute-filtered upstream)
}

/** Defensive ms from a Timestamp | ISO string | Date (the audit fields are `any`). */
const auditMs = (v: unknown): number | null => {
  if (!v) return null;
  if (typeof v === "string") { const n = Date.parse(v); return Number.isNaN(n) ? null : n; }
  if (v instanceof Date) return v.getTime();
  const d = (v as { toDate?: () => Date }).toDate?.();
  return d instanceof Date ? d.getTime() : null;
};

/** "REQUESTED 12 JUL" from the query's lastStatusChange audit stamp; absent → "" (honest). */
const requestedFigures = (q: Query | undefined): string => {
  const ms = auditMs(q?.lastStatusChange);
  if (ms == null) return "";
  return `REQUESTED ${new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short" }).toUpperCase()}`;
};

const dqLabel = (gap?: string) =>
  gap === "mswl" ? "no wish list" : gap === "materials" ? "no materials listed" : gap === "responseTime" ? "no reply window" : "details to add";
const dqSub = (gap?: string) =>
  gap === "mswl" ? "We can’t tell you what they’re after" : gap === "materials" ? "We don’t know what to tell you to send" : gap === "responseTime" ? "We can’t tell you when a nudge is fair" : "";

/**
 * P4 — the offer card's deadline pill counts down to REPLY-BY (`q.responseDeadline`, the same
 * field the dashboard's deadline chip reads). Unset → the plain OFFER chip (no invented default).
 */
export function offerDue(replyByMs: number | null, nowMs: number): string {
  /* ⚠️ THE RIGHT SLOT NEVER REPEATS THE LEFT (corrections fix 4). This used to return the literal
     "OFFER" with no reply-by, and prefix "OFFER · " when there was one — so the band read
     "OFFER · OFFER", the KIND lane's word printed twice, once in each lane. The left lane already
     says what kind of thing this is; the right lane's only job is WHEN. With no reply-by there is
     no when, so it says nothing rather than echoing. */
  if (replyByMs == null || Number.isNaN(replyByMs)) return "";
  const days = Math.ceil((replyByMs - nowMs) / 86400000);
  if (days <= 0) return "REPLY-BY PASSED";
  return `${days} DAY${days === 1 ? "" : "S"} TO REPLY`;
}

/**
 * P4 — quiet/wake. "I need time" stores the EXISTING snooze flag (no new state); the engine
 * exempts offers from snooze-HIDING, so the flag reaches the board and this derives the render:
 * quiet while the reminder is in the future, woken the moment it passes — or immediately when
 * reply-by arrives first, whichever comes soonest.
 */
export function offerQuiet(snoozedUntil: string | undefined | null, replyByMs: number | null, nowMs: number): boolean {
  if (!snoozedUntil) return false;
  const snoozeMs = Date.parse(snoozedUntil);
  if (Number.isNaN(snoozeMs) || snoozeMs <= nowMs) return false;
  if (replyByMs != null && !Number.isNaN(replyByMs) && replyByMs <= nowMs) return false;
  return true;
}

/** The derived-task card copy (title/who/subtitle/due/warn/status/hk). */
function derivedCopy(task: Task, q: Query | undefined, ag: Agent | undefined, ms: Manuscript | undefined, now: number) {
  const name = ag ? agentPrimary(ag) : "an agent";
  const msTitle = ms?.title ?? "";
  const agentWait = () => (q ? queryAmbientStatus(q, "agent", undefined, now) : null);
  switch (task.taskType) {
    // the tightening P2 — KIND and STATUS are separate lanes now: `kind` is the facet tag
    // (the same classification the filter chips draw), `due` carries ONLY tabular figures.
    // "REQUESTED {date}" reads the query's own lastStatusChange audit stamp; absent → an
    // empty status cell (honest — never an invented date).
    case "offer_received":
      return { kind: "OFFER", title: `${name} has made an offer`, who: name, subtitle: msTitle || "Respond when you’re ready", due: offerDue(q?.responseDeadline ? Date.parse(q.responseDeadline) : null, now), warn: true, status: q?.status, hk: false };
    case "partial_requested":
      return { kind: "AGENT WAITING", title: `Send your partial to ${name}`, who: name, subtitle: msTitle, due: requestedFigures(q), warn: false, status: q?.status, hk: false };
    case "full_requested":
      return { kind: "AGENT WAITING", title: `Send your full to ${name}`, who: name, subtitle: msTitle, due: requestedFigures(q), warn: true, status: q?.status, hk: false };
    case "revise_resubmit":
      return { kind: "AGENT WAITING", title: `Resubmit your R&R to ${name}`, who: name, subtitle: msTitle, due: requestedFigures(q), warn: false, status: q?.status, hk: false };
    case "nudge_overdue": {
      const days = silentDays(q, now);
      return { kind: "AGENT WAITING", title: `Nudge ${name}`, who: name, subtitle: msTitle, due: days != null ? `${days} DAYS · NO REPLY` : "NO REPLY YET", warn: days != null && days > 84, status: q?.status, hk: false };
    }
    case "no_response_close": {
      const days = silentDays(q, now);
      return { kind: "STALE", title: `${name} silent${days != null ? ` for ${days} days` : ""}`, who: name, subtitle: "No reply — consider closing", due: days != null ? `SILENT ${days} DAYS` : "SILENT", warn: true, status: q?.status, hk: false };
    }
    case "data_quality_poor": {
      const gap = ag ? agentDataQualityNeeds(ag)[0] : undefined;
      const kind = gap === "mswl" ? "WISH LIST" : gap === "materials" ? "MATERIALS" : gap === "responseTime" ? "REPLY WINDOW" : "DETAILS";
      return { kind, title: `${name} has ${dqLabel(gap)}`, who: name, subtitle: dqSub(gap), due: "", warn: false, status: undefined as QueryStatus | undefined, hk: true };
    }
    default:
      return { kind: "", title: task.title, who: "", subtitle: task.context, due: "", warn: false, status: q?.status, hk: false };
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
    // ⚠️ THE DROPPED FACET (workspace P0B) — this was the cause of TWO of the live board's
    // visible faults, and it is one missing line. derivedCopy computes `kind` for every task
    // type (OFFER · AGENT WAITING · STALE · WISH LIST · …); derivedCard never copied it onto
    // the card, so EVERY derived card reached the view with `kind: undefined`. The ledger's
    // KIND lane therefore sat empty on every row, and the card band — whose pill was the one
    // unguarded render in the page — drew a blank badge, or the literal "★ undefined" on an
    // offer. The tag was never missing from the data; it was dropped in transit.
    kind: c.kind,
    warn: c.warn,
    snoozes: flag?.snoozeCount ?? 0,
    status: c.status,
    hk: c.hk,
    initials: ag ? agentInitials(ag) : "•",
    record: ag ? [agentPrimary(ag), ag.agency].filter(Boolean).join(" · ") : "",
    committed: flag?.committedDate === input.today,
    committedDate: flag?.committedDate,
    done: false,
    ...(task.taskType === "offer_received"
      ? { quiet: offerQuiet(flag?.snoozedUntil, q?.responseDeadline ? Date.parse(q.responseDeadline) : null, input.now) }
      : {}),
    taskType: task.taskType,
    relatedRecordId: task.relatedRecordId,
    agentId: ag?.id,
    msTitle: ms?.title || task.manuscriptTitle || undefined,
  };
}

/** "6 Jul" — the note tag's short date (en-GB); empty on an unparsable value. */
const shortDate = (iso?: string): string => {
  if (!iso) return "";
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? "" : new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

/**
 * P2 (approved scope grant) — a LINKED REMINDER's deadline chip: local-day difference to the
 * date-only dueDate (parsed at local noon so the day never shifts). warn inside 3 days.
 */
export function reminderDue(dueYmd: string, nowMs: number): { label: string; warn: boolean } {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dueYmd);
  if (!m) return { label: "REMINDER", warn: false };
  const due = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
  const now = new Date(nowMs);
  const days = Math.round((new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000);
  if (days < 0) return { label: "DEADLINE PASSED", warn: true };
  if (days === 0) return { label: "DEADLINE TODAY", warn: true };
  return { label: `${days} DAY${days === 1 ? "" : "S"} TO DEADLINE`, warn: days <= 3 };
}

/** The three in-app surfacing leads → days early a dated task joins Today's list. */
export const SURFACE_LEAD_DAYS: Record<SurfaceOffset, number> = { "on-day": 0, "day-before": 1, "week-before": 7 };

/** A dated task's state relative to today (date-only string compare — no timezone drift). */
export function taskDueState(dueYmd: string, todayYmd: string): "future" | "today" | "overdue" {
  if (dueYmd === todayYmd) return "today";
  return dueYmd < todayYmd ? "overdue" : "future";
}

/** Has a dated task reached its surfacing window (today >= dueDate − lead days)? → joins Today's list.
 *  Derived at render, never stored; parsed at local noon so the shifted day never drifts. */
export function taskSurfaced(dueYmd: string, offset: SurfaceOffset | undefined, todayYmd: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dueYmd);
  if (!m) return false;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
  d.setDate(d.getDate() - SURFACE_LEAD_DAYS[offset ?? "on-day"]);
  const surfaceFrom = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return todayYmd >= surfaceFrom;
}

/** The mono date chip for a task card: the due date, in an OVERDUE form once the day has passed
 *  (the DUE-TODAY promotion is carried by the band tag, not this chip). */
function taskDueChip(dueYmd: string, state: "future" | "today" | "overdue"): string {
  const d = shortDate(dueYmd).toUpperCase();
  return state === "overdue" ? `OVERDUE · ${d}` : d;
}

// notes-and-tasks P3 — THE TWO NATURES, DERIVED FROM dueDate: absent = a NOTE (butter, pinned,
// dateless, no tick, Notes lane only); present = a TASK (sage, ticked, a date chip). A task
// PROMOTES on its due day — pink, DUE TODAY, the Urgent (do) lane — and joins Today's list; a
// task also SURFACES onto Today's list `surfaceOffset` days early. Every one of these is derived
// at render from the date; nothing is a stored status flag. Supersedes the linked-reminder split.
function userCard(t: UserTask, input: BoardInput): BoardCard {
  const rec = t.agentId ? input.agents.find((a) => a.id === t.agentId) : undefined;
  const ms = t.manuscriptId ? input.manuscripts.find((m) => m.id === t.manuscriptId) : undefined;
  const isTask = !!t.dueDate;
  const record = rec ? `On ${agentPrimary(rec)}` : ms ? `On ${ms.title}` : isTask ? "Your task" : "Your note";
  const dueState = isTask ? taskDueState(t.dueDate!, input.today) : undefined;
  const promoted = dueState === "today" || dueState === "overdue"; // due day + overdue → Urgent
  const surfaced = isTask && taskSurfaced(t.dueDate!, t.surfaceOffset, input.today);
  const pinnedDate = shortDate(t.createdAt).toUpperCase();
  return {
    key: t.id,
    stream: promoted ? "do" : "nt",
    title: t.text || (isTask ? "New task" : "New note"),
    who: "",
    subtitle: "",
    due: isTask ? taskDueChip(t.dueDate!, dueState!) : pinnedDate ? `PINNED ${pinnedDate}` : "PINNED",
    warn: promoted,
    snoozes: 0,
    hk: false,
    initials: isTask ? "✓" : "✎",
    record,
    committed: t.committedDate === input.today,
    committedDate: t.committedDate,
    done: false,
    kind: isTask ? "YOUR TASK" : "NOTE", // the tightening P2 — the KIND lane's facet tag
    nature: isTask ? "task" : "note",
    dueState,
    detail: t.detail,
    dueYmd: t.dueDate,
    surfaceOffset: t.surfaceOffset,
    surfaced,
    userTaskId: t.id,
  };
}

/** Do-next ordering: Offer pinned top; then warn-first; stable otherwise. */
function orderDoNext(cards: BoardCard[]): BoardCard[] {
  const rank = (c: BoardCard) => (c.taskType === "offer_received" ? 0 : c.taskType === "weekly_review" ? 1 : c.warn ? 2 : 3);
  return [...cards].sort((a, b) => rank(a) - rank(b));
}

/**
 * ⚠️ THE "MARCUS REED TWICE" FIX, and the cause is NOT duplicate activities.
 *
 * Derived tasks are generated PER QUERY (`task-nudge-${q.id}`, `task-no-res-close-${q.id}`…), and
 * one agent can hold several queries. Two rows for one agent are therefore usually two real pieces
 * of work — but the row's title carries the AGENT ALONE ("Nudge Marcus Reed"), so two legitimate
 * rows render identically and read as a bug. And where two queries share both agent and
 * manuscript, they genuinely ARE one piece of work rendered twice.
 *
 * So this does two things, in that order:
 *   1. COLLAPSE true duplicates — same task type, same agent, same manuscript. The first survives
 *      (the lanes are already ordered by urgency, so the first is the one worth keeping).
 *   2. DISAMBIGUATE the legitimate remainder — where a type+agent pair still has more than one row,
 *      each surviving row must carry its manuscript in the meta line, so two rows for one agent
 *      can never look like the same row twice.
 *
 * ⚠️ IT DEDUPES ON THE DERIVATION, NOT THE RENDER. Hiding the second row would lose real work;
 * what was wrong was a key that ignored the manuscript and a title that dropped it.
 */
export function dedupeAgentCards(cards: BoardCard[]): BoardCard[] {
  const seen = new Set<string>();
  const kept: BoardCard[] = [];
  for (const c of cards) {
    // Cards with no agent (user tasks, manuscript prompts) are never collapsed — they have no
    // agent identity to collide on.
    const id = c.agentId ? `${c.taskType ?? ""}|${c.agentId}|${c.msTitle ?? ""}` : null;
    if (id) {
      if (seen.has(id)) continue;
      seen.add(id);
    }
    kept.push(c);
  }
  // Pass 2: any type+agent pair still holding more than one row must name its manuscript.
  const pairCount = new Map<string, number>();
  for (const c of kept) {
    if (!c.agentId) continue;
    const k = `${c.taskType ?? ""}|${c.agentId}`;
    pairCount.set(k, (pairCount.get(k) ?? 0) + 1);
  }
  return kept.map((c) => {
    if (!c.agentId) return c;
    const k = `${c.taskType ?? ""}|${c.agentId}`;
    if ((pairCount.get(k) ?? 0) < 2) return c;
    const ms = c.msTitle?.trim();
    // Only ever ADDS the distinguishing fact; never replaces a record line that already carries it.
    if (!ms || c.record.includes(ms)) return c;
    return { ...c, record: c.record ? `${c.record} · ${ms}` : `On ${ms}` };
  });
}

export function assembleBoard(input: BoardInput): AssembledBoard {
  const derived = dedupeAgentCards(
    input.tasks.map((t) => derivedCard(t, input)).filter((c): c is BoardCard => c != null),
  );

  // User tasks — open (not done), most-recent first, minus snoozed/muted ones (the quick rail's ⏸
  // writes a `user_task` TaskFlag stance; nothing is deleted). P2: routed by the card's OWN stream
  // — linked reminders join Urgent, everything else stays Notes to self.
  const userCards = input.userTasks
    .filter((t) => !t.done)
    .filter((t) => {
      const flag = input.taskFlags.find((f) => flagMatchesTask(f, USER_TASK_FLAG_TYPE, t.id));
      return !flag || !isFlagSuppressing(flag, input.now);
    })
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))
    .map((t) => userCard(t, input));
  // Polish III P1 — the review is NOT a task: no card enters the lanes; every count derives
  // review-free by construction. The banner/card surface is reviewSurface (below).
  const doCards = orderDoNext([...derived.filter((c) => c.stream === "do"), ...userCards.filter((c) => c.stream === "do")]);
  const hkCards = derived.filter((c) => c.stream === "hk");
  const ntCards = userCards.filter((c) => c.stream === "nt");

  // Cleared today — the union (activities today · user tasks done today · flags resolved today).
  // Retired as a lane; re-projected here (newest-first) for the Today's-list done-band.
  const cleared = clearedTodayItems({ activities: input.activities, userTasks: input.userTasks, taskFlags: input.taskFlags, now: input.now });
  const clearedCards: BoardCard[] = [
    // ⚠️ userTaskId rides the done card (board fixes II P1): the Done column's ⋯ menu offers
    // "Undo — put it back" only where an untick primitive exists, and the id is how it finds it.
    ...cleared.userTasks.map((t) => ({ ...blankDone(`done-task-${t.id}`), title: t.text || "Task", record: "Your task", whenMs: msOf(t.completedAt), userTaskId: t.id })),
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
  // Today's list = explicitly committed today OR a task that has SURFACED (derived, notes-and-tasks
  // P3) — the surfacing lead joins a dated task automatically, without writing committedDate.
  return { committed: laneCards.filter((c) => c.committedDate === today || !!c.surfaced), done: board.cleared };
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




/* ══════════ THE SUNDAY REVIEW (finishing pack P3; ref todo-sunday-review.html) ══════════
   Pure derivations only: the reviewed week (the ISO week containing the most recent Sunday — on
   Monday the review still closes LAST week), the four honest aggregates from the activity log,
   and the derived dismissible entry card. The week number reuses dashboardStats' exported
   isoWeekStart + the same earliest-dateSent anchor as weekOfQuerying; "went quiet" mirrors the
   task engine via the SAME replyTask precedence fn, evaluated at both window edges. */

const DAY_MS = 86400000;
const WEEK_MS = 7 * DAY_MS;

export interface ReviewWeek { key: string; startMs: number; endMs: number; weekNumber: number }

export function reviewWeek(queries: Query[], nowMs: number): ReviewWeek {
  const now = new Date(nowMs);
  // The MOST RECENT COMPLETED week, from any weekday: Sunday (day 0) sits at the END of its ISO
  // week → review THIS week; every other day (Mon–Sat) reviews the week that ended the previous
  // Sunday. (The demotion pack's recon fix — Tue–Sat previously keyed the RUNNING week.)
  const start = now.getDay() === 0 ? isoWeekStart(now).getTime() : isoWeekStart(now).getTime() - WEEK_MS;
  const times = queries.map((q) => (q.dateSent ? Date.parse(q.dateSent) : NaN)).filter((t) => !Number.isNaN(t));
  const earliest = times.length ? isoWeekStart(new Date(Math.min(...times))).getTime() : start;
  const weekNumber = Math.max(1, Math.round((start - earliest) / WEEK_MS) + 1);
  const d = new Date(start);
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { key, startMs: start, endMs: start + WEEK_MS, weekNumber };
}

export interface ReviewRow { label: string; meta: string; badge: string; star?: boolean }
export interface ReviewQuietRow { queryId: string; name: string; agency?: string; daysSilent: number | null; prevStatus: QueryStatus }
export interface ReviewStats { sent: ReviewRow[]; back: ReviewRow[]; offers: number; quiet: ReviewQuietRow[] }

const WEEKDAY = (iso: string): string => new Date(iso).toLocaleDateString("en-GB", { weekday: "long" }).toUpperCase();
const AGENT_RESPONSES: ReadonlySet<QueryStatus> = new Set([
  QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED, QueryStatus.REVISE_RESUBMIT, QueryStatus.OFFER, QueryStatus.REJECTED,
]);

export function weekReviewStats(input: Pick<BoardInput, "activities" | "queries" | "agents">, win: ReviewWeek): ReviewStats {
  const inWin = (iso?: string) => { const t = iso ? Date.parse(iso) : NaN; return !Number.isNaN(t) && t >= win.startMs && t < win.endMs; };
  const agentFor = (a: Activity) => { const q = input.queries.find((x) => x.id === a.queryId); return q ? input.agents.find((x) => x.id === q.agentId) : undefined; };
  const acts = input.activities.filter((a) => inWin(a.date));

  const sent: ReviewRow[] = acts
    .filter((a) => a.activityType === ActivityType.QUERY_SENT || a.activityType === ActivityType.MATERIALS_SENT || a.activityType === ActivityType.NUDGE_SENT)
    .map((a) => {
      const ag = agentFor(a);
      const badge = a.activityType === ActivityType.NUDGE_SENT ? "NUDGE" : a.resultingStatus === QueryStatus.PARTIAL_SENT ? "PARTIAL" : a.activityType === ActivityType.QUERY_SENT ? "QUERY" : "FULL";
      return { label: terseDoneLabel(a, ag ? agentPrimary(ag) : undefined), meta: [ag?.agency?.toUpperCase(), WEEKDAY(a.date)].filter(Boolean).join(" · "), badge };
    });

  const back: ReviewRow[] = acts
    .filter((a) => a.resultingStatus && AGENT_RESPONSES.has(a.resultingStatus as QueryStatus))
    .map((a) => {
      const ag = agentFor(a);
      const who = ag ? agentPrimary(ag) : "An agent";
      const rs = a.resultingStatus as QueryStatus;
      const star = rs === QueryStatus.OFFER;
      const label = star ? `${who} offered representation`
        : rs === QueryStatus.PARTIAL_REQUESTED ? `${who} requested a partial`
        : rs === QueryStatus.FULL_REQUESTED ? `${who} requested the full`
        : rs === QueryStatus.REVISE_RESUBMIT ? `${who} asked for revisions`
        : `${who} passed`;
      const q = input.queries.find((x) => x.id === a.queryId);
      const reply = star && q?.responseDeadline ? ` · REPLY BY ${new Date(q.responseDeadline).toLocaleDateString("en-GB", { day: "numeric", month: "short" }).toUpperCase()}` : "";
      return { label, meta: [ag?.agency?.toUpperCase(), WEEKDAY(a.date)].filter(Boolean).join(" · ") + reply, badge: star ? "★ OFFER" : rs === QueryStatus.REJECTED ? "PASS" : rs === QueryStatus.REVISE_RESUBMIT ? "R&R" : rs === QueryStatus.FULL_REQUESTED ? "FULL REQ" : "PARTIAL REQ", star };
    });

  const quiet: ReviewQuietRow[] = input.queries
    .filter((q) => {
      const ag = input.agents.find((x) => x.id === q.agentId);
      const base = { status: q.status as QueryStatus, dateSent: q.dateSent, responseDeadline: q.responseDeadline, responseTimeWeeks: ag?.responseTimeWeeks, noResponseMeansNo: !!ag?.noResponseMeansNo, lastNudgeSentDate: q.lastNudgeSentDate };
      return replyTask({ ...base, now: win.endMs }) === "close" && replyTask({ ...base, now: win.startMs }) !== "close";
    })
    .map((q) => {
      const ag = input.agents.find((x) => x.id === q.agentId);
      const a = queryAmbientStatus(q, "agent", undefined, win.endMs);
      return { queryId: q.id, name: ag ? agentPrimary(ag) : "An agent", ...(ag?.agency ? { agency: ag.agency } : {}), daysSilent: a && a.sentMs != null ? a.nDays : null, prevStatus: q.status as QueryStatus };
    });

  return { sent, back, offers: back.filter((r) => r.star).length, quiet };
}


export interface SeedCandidate {
  key: string; label: string; meta: string; preTicked: boolean;
  userTaskId?: string; taskType?: string; relatedRecordId?: string;
}

/** Monday's candidates from the live Urgent lane: dated items (the offer reply, linked reminders)
 *  pre-ticked; top undated candidates offered unticked; capped at the Today's-list five. */
export function reviewSeedCandidates(doCards: BoardCard[], queries: Query[], nowMs: number, cap = 5): SeedCandidate[] {
  const dated: SeedCandidate[] = [];
  const undated: SeedCandidate[] = [];
  for (const c of doCards) {
    if (c.taskType === "weekly_review") continue;
    if (c.taskType === "offer_received" && c.relatedRecordId) {
      const q = queries.find((x) => x.id === c.relatedRecordId);
      const days = q?.responseDeadline ? Math.max(0, Math.ceil((Date.parse(q.responseDeadline) - nowMs) / DAY_MS)) : null;
      dated.push({ key: c.key, label: `Reply to ${c.who}’s offer`, meta: days != null ? `${days} DAY${days === 1 ? "" : "S"} LEFT ON THE WINDOW` : "OFFER ON THE TABLE", preTicked: true, taskType: c.taskType, relatedRecordId: c.relatedRecordId });
    } else if (c.userTaskId) {
      // linked reminders reach the do lane only WITH a deadline — dated by construction
      dated.push({ key: c.key, label: c.title, meta: `REMINDER · ${c.due}`, preTicked: true, userTaskId: c.userTaskId });
    } else if (c.taskType && c.relatedRecordId) {
      undated.push({ key: c.key, label: c.title, meta: `${c.due || "NO DATE"}`, preTicked: false, taskType: c.taskType, relatedRecordId: c.relatedRecordId });
    }
  }
  return [...dated, ...undated].slice(0, cap);
}


/**
 * The completion sentinel for a week's review flag — the EXACT `snoozedUntil` finishReview writes
 * on completion (`win.endMs + 2 days`). Single-sourced here so the scrap's read (below) and the
 * write (FocusFlow.finishReview) can never drift: completion is the ONLY handler that writes THIS
 * value; a mere dismissal writes `now + 3d`, which this never equals in practice.
 */
export function reviewCompletionSnooze(win: ReviewWeek): string {
  return new Date(win.endMs + 2 * DAY_MS).toISOString();
}

/* Deck v2 P1: reviewSurface is RETIRED — the banner is a permanent strip resident with one
   derived boolean (the completion sentinel, read in ToDoPage). reviewWeek/weekReviewStats/
   reviewSeedCandidates/reviewCompletionSnooze stay (the mode + the sentinel). */


/**
 * The done band's TERSE grammar (popup-notify-scrim P1): done rows use the committed rows' title
 * vocabulary — "Full sent to {agent}", never a journey's celebration copy. Derived at THE label
 * source (every journey inherits terseness for free), keyed on activityType/resultingStatus with
 * the raw description as the unknown-shape fallback. The old offer path's celebration description
 * maps to "{agent}'s offer — decision pending" via the SAME regex activityUtils strips with.
 */
export function terseDoneLabel(a: Pick<Activity, "activityType" | "description" | "resultingStatus">, agentName?: string): string {
  const who = agentName || "the agent";
  const type = a.activityType;
  if (type === ActivityType.OFFER_ACCEPTED) return `Accepted ${who}’s offer`;
  if (type === ActivityType.OFFER_DECLINED) return `Declined ${who}’s offer`;
  if (type === ActivityType.NUDGE_SENT) return `Nudged ${who}`;
  if (type === ActivityType.QUERY_SENT) return `Query sent to ${who}`;
  if (type === ActivityType.MATERIALS_SENT) {
    if (/resubmit/i.test(a.description || "")) return `Resubmitted to ${who}`;
    return a.resultingStatus === QueryStatus.PARTIAL_SENT ? `Partial sent to ${who}` : `Full sent to ${who}`;
  }
  if (type === ActivityType.STATUS_CHANGED) {
    if (OFFER_RECEIVED_DESC_RE.test(a.description || "") || a.resultingStatus === QueryStatus.OFFER) return `${who}’s offer — decision pending`;
    if (a.resultingStatus === QueryStatus.NO_RESPONSE) return `Closed ${who} — no response`;
    if (a.resultingStatus === QueryStatus.WITHDRAWN) return `Withdrew from ${who}`;
    if (a.resultingStatus) return `${a.resultingStatus} — ${who}`;
  }
  return a.description || String(type);
}

function blankDone(key: string): BoardCard {
  return { key, stream: "done", title: "", who: "", subtitle: "", due: "", warn: false, snoozes: 0, hk: false, initials: "", record: "", committed: false, done: true };
}
function clearedActivityCard(a: Activity, i: number, input: BoardInput): BoardCard {
  const q = input.queries.find((x) => x.id === a.queryId);
  const ag = q ? input.agents.find((x) => x.id === q.agentId) : undefined;
  return { ...blankDone(`done-act-${a.id ?? i}`), title: terseDoneLabel(a, ag ? agentPrimary(ag) : undefined), record: ag ? agentPrimary(ag) : "Query", whenMs: msOf(a.date) };
}
function clearedFlagCard(f: TaskFlag, i: number, input: BoardInput): BoardCard {
  const ag = f.agentId ? input.agents.find((x) => x.id === f.agentId) : undefined;
  const q = f.queryId ? input.queries.find((x) => x.id === f.queryId) : undefined;
  const agent2 = q ? input.agents.find((x) => x.id === q.agentId) : ag;
  return { ...blankDone(`done-flag-${f.id ?? i}`), title: agent2 ? `${agentPrimary(agent2)} — sorted` : "Sorted", record: "Housekeeping", whenMs: msOf(f.resolvedAt) };
}

/* ── THE BRIEFING SLOT (briefing-slot pack — ref design-refs/briefing-slot.html option 1) ─────
   The region between the hero rule and the filter row. Every figure and every line DERIVES from
   the existing review data — nothing is hardcoded, and a figure with no source DROPS its column
   rather than showing a zero. ── */

export interface BriefingFigure { key: "cleared" | "replies" | "focused"; value: string; label: string }

/** Numbers ≤ twelve read as words in prose (the dashboard eyebrow's convention). */
const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const spell = (n: number): string => (n <= 12 ? WORDS[n] : String(n));

/** Tasks the writer ticked off inside the review window (UserTask.completedAt is the stamp). */
export function briefingCleared(userTasks: UserTask[], win: ReviewWeek): number {
  return userTasks.filter((t) => {
    const t0 = t.completedAt ? Date.parse(t.completedAt) : NaN;
    return !Number.isNaN(t0) && t0 >= win.startMs && t0 < win.endMs;
  }).length;
}

/** The three columns, in order — each present ONLY when it has a real figure behind it.
 *  FOCUSED always drops: the app records no time data anywhere, so it can never be honest. */
export function briefingFigures(cleared: number, replies: number): BriefingFigure[] {
  const out: BriefingFigure[] = [];
  if (cleared > 0) out.push({ key: "cleared", value: String(cleared), label: "CLEARED" });
  if (replies > 0) out.push({ key: "replies", value: String(replies), label: "REPLIES" });
  return out;
}

/** The Playfair headline — the week summarised from the same two figures. */
export function briefingHeadline(cleared: number, replies: number): string {
  const parts: string[] = [];
  if (cleared > 0) parts.push(`${spell(cleared)} ${cleared === 1 ? "task" : "tasks"} cleared`);
  if (replies > 0) parts.push(`${spell(replies)} ${replies === 1 ? "agent" : "agents"} replied`);
  if (!parts.length) return "A quiet week on the desk";
  const sentence = parts.join(", ");
  return `${cleared + replies >= 5 ? "A good week" : "Last week"}: ${sentence}`;
}

/** The grey supporting sentence — omitted entirely when nothing is worth saying. */
export function briefingNarrative(stats: ReviewStats): string | null {
  const bits: string[] = [];
  if (stats.offers > 0) bits.push(stats.offers === 1 ? "An offer arrived." : `${spell(stats.offers)} offers arrived.`);
  if (stats.sent.length > 0) bits.push(`${spell(stats.sent.length)} ${stats.sent.length === 1 ? "query" : "queries"} went out.`);
  if (stats.quiet.length > 0) bits.push(`${spell(stats.quiet.length)} ${stats.quiet.length === 1 ? "query has" : "queries have"} gone quiet.`);
  return bits.length ? bits.join(" ") : null;
}
