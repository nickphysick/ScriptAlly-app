/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone round two v1 — THE TO-DO MODEL AND ITS DOORS, SHARED BY HOME AND THE TO-DO PAGE.
 *
 * To-do left the tab bar (2B) and Home now lists the tasks that are due (`n2`), so two surfaces read one model. It was
 * TodoPhone's own body; it moved here unchanged so the two cannot disagree about what is due or what a tap does.
 *
 * ⚠️ IT DERIVES NOTHING. The board is the tray's own `assembleBoardColumns` → `[...cols.todo, ...cols.today]`, its rows
 * `trayItem`, its days `calendarItems` and its tallies `dayBuckets` — the same calls, in the same order, as the desktop
 * tray and the badge (lib/todoDueTally).
 *
 * ⚠️ A TICK NEVER COMPLETES A TASK THAT NEEDS A FLOW. `act` is the old verb button's handler: a send, a nudge or a close
 * OPENS its journey, a profile gap opens the agent card, and only the writer's own task is ticked off — after asking.
 */
import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useScriptAllyDb } from "../../../lib/db";
import { assembleBoardColumns } from "../../../lib/todoColumns";
import { localYMD } from "../../../lib/shellSidebar";
import { calendarItems, counted, dayBuckets, londonToday, type CalItem } from "../../../lib/trayCalendar";
import { trayItem, SWEEP_NEED, type TrayDb, type TrayItem } from "../../../lib/todoTray";
import { overdueLabel } from "../../../lib/trayRows";
import { dayMonth } from "../../../lib/dates";
import { drawerDoorForTask } from "../../../lib/queryActions/entry";
import { openQueryDrawer, showUndoBar } from "../../../lib/queryActions/drawerStore";
import { dataNeedTarget, openAgentCard } from "../../../lib/agentCardStore";
import { agentDataQualityNeeds } from "../../../lib/agentDataQuality";
import { openPhoneCompose } from "../../../lib/phoneCompose";
import { useTaskCommit } from "../useTaskCommit";
import type { BoardCard } from "../../../lib/todoBoard";
import "./todoCheck.css";

/** Overdue · Today · This week · Later · When you have a moment. "Later" holds a dated task beyond this Sunday, which
 *  "This week" would misstate. */
export type WhenGroup = "earlier" | "today" | "soon" | "later" | "moment";
const sundayOf = (ymd: string): string => {
  const [y, m, d] = ymd.split("-").map(Number);
  const x = new Date(y, m - 1, d, 12);
  x.setDate(x.getDate() + ((7 - x.getDay()) % 7));
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};

export interface TodoPhoneModel {
  items: TrayItem[];
  live: BoardCard[];
  calItems: CalItem[];
  buckets: ReturnType<typeof dayBuckets>;
  today: string;
  /** a card's day: counted (surfaced, not snoozed) items only — dayBuckets' own rule */
  dayOf: Map<string, string>;
  whenOf: (i: TrayItem) => WhenGroup;
  hkGroups: ReturnType<typeof assembleBoardColumns>["hkGroups"];
}

export function useTodoPhoneModel(now: number): TodoPhoneModel {
  const { tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, packages, currentUser } = useScriptAllyDb();
  const { cols, hkGroups } = useMemo(() => assembleBoardColumns({
    tasks, userTasks, queries, agents, manuscripts, taskFlags, activities,
    now, today: localYMD(now), mutedTaskRules: currentUser?.mutedTaskRules,
  }), [tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, now, currentUser?.mutedTaskRules]);
  const live: BoardCard[] = useMemo(() => [...cols.todo, ...cols.today], [cols]);
  const trayDb: TrayDb = useMemo(() => ({ queries, agents, manuscripts, userTasks, activities, packages, taskFlags, hkGroups }),
    [queries, agents, manuscripts, userTasks, activities, packages, taskFlags, hkGroups]);
  const items = useMemo(() => live.map((c) => trayItem(c, trayDb, now)), [live, trayDb, now]);
  const today = londonToday(now);
  const calItems: CalItem[] = useMemo(() => {
    const byKey = new Map(items.map((i) => [i.key, i]));
    return calendarItems({ cards: live, db: trayDb, flags: taskFlags, nowMs: now,
      words: (c) => { const i = byKey.get(c.key); return { deed: i?.deed ?? c.title, who: i?.who ?? c.who }; } });
  }, [live, items, trayDb, taskFlags, now]);
  const buckets = useMemo(() => dayBuckets(calItems, live, today), [calItems, live, today]);
  const dayOf = useMemo(() => new Map(calItems.filter(counted).map((i) => [i.key, i.ymd])), [calItems]);
  const weekEnd = sundayOf(today);
  const whenOf = (i: TrayItem): WhenGroup => { const d = dayOf.get(i.key); return !d ? "moment" : d < today ? "earlier" : d === today ? "today" : d <= weekEnd ? "soon" : "later"; };
  return { items, live, calItems, buckets, today, dayOf, whenOf, hkGroups };
}

/** A checklist row's title: the task, with the agent named when the task's own words do not name them (ref boot2's
 *  "Close your query to Tom Okafor?"). */
export function checkTitle(i: TrayItem): string {
  const name = (i.agent?.name || "").trim();
  if (!name || i.userTask) return i.deed;
  const first = name.split(/\s+/)[0]!;
  return i.deed.includes(first) ? i.deed : `${i.deed} · ${name}`;
}

/** A checklist row's line under the title: when it fell due (if it is late, set apart in the rust ink), then the agency.
 *  Facts only. */
export function checkLine(i: TrayItem, day: string | null, today: string): { text: string; late: string | null } {
  const late = day && day < today ? overdueLabel(day, today) : null;
  const where = i.agent ? (i.agent.agency?.trim() || (checkTitle(i).includes((i.agent.name || "").trim()) ? "" : i.agent.name?.trim() || "")) : i.sub;
  return { text: where || "", late };
}

const DAY = 86_400_000;
const msOf = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const t = typeof v === "object" && v && "toDate" in (v as object) ? (v as { toDate(): Date }).toDate().getTime() : new Date(v as string).getTime();
  return Number.isFinite(t) ? t : null;
};
const weeksWord = (n: number) => (n === 1 ? "a week" : `${n} weeks`);

/**
 * Up next's sentence (ref boot2 `WHY`): THE FACTS ONLY, from the task's own data — when it was asked for, or how long
 * since the query went — and when it fell due. No advice the desktop To-do does not already give; nothing guessed: a
 * fact with no date behind it is left out.
 */
export function whyLine(i: TrayItem, day: string | null, today: string, nowMs: number): string {
  const q = i.query;
  const first = (i.agent?.name || "").trim().split(/\s+/)[0] || (i.agent?.agency || "").trim();
  const parts: string[] = [];
  if (q) {
    const asked = i.bucket === "send" || i.bucket === "decide"
      ? msOf(q.status === "Offer" ? q.offerDate : q.status === "Full Requested" ? q.fullRequestedDate : q.status === "Partial Requested" ? q.partialRequestedDate : null) ?? msOf(q.lastStatusChange)
      : null;
    const sent = msOf(q.dateSent);
    if (asked != null) parts.push(`${first || "The agent"} ${q.status === "Offer" ? "made the offer" : "asked"} on ${dayMonth(asked)}.`);
    else if ((i.bucket === "chase" || i.bucket === "close") && sent != null) {
      const w = Math.floor((nowMs - sent) / (7 * DAY));
      parts.push(w >= 1 ? `${weeksWord(w).replace(/^a/, "A")} since your query.` : `You queried on ${dayMonth(sent)}.`);
      const win = i.agent?.responseTimeWeeks;
      if (win && win > 0 && w >= win) parts.push(`Their stated reply time is ${weeksWord(win)}.`);
    }
  } else if (i.userTask?.detail?.trim()) parts.push(i.userTask.detail.trim());
  if (day && day < today) parts.push(`${overdueLabel(day, today)}.`);
  else if (day === today) parts.push("Due today.");
  return parts.join(" ");
}

/** the primary's words on the Up next card (ref boot2 `VERB`), by the tray's bucket */
export function upNextVerb(i: Pick<TrayItem, "bucket" | "card" | "userTask">): string {
  if (i.userTask) return "Mark done";
  switch (i.bucket) {
    case "send": return "Send it";
    case "decide": return i.card.taskType === "revise_resubmit" ? "Send it" : "Decide";
    case "chase": return "Write the nudge";
    case "close": return "Decide";
    case "fix": return "Add it";
    default: return "Mark done";
  }
}

/** The doors a task row offers. `ask` is the "tick it off?" confirmation, rendered by `askNode`. */
export function useTodoDoors(model: Pick<TodoPhoneModel, "hkGroups">, active: boolean) {
  const { queries } = useScriptAllyDb();
  const navigate = useNavigate();
  const { quickDone } = useTaskCommit({
    flash: (message, action) => showUndoBar({ message, sub: "", ...(action ? { undo: async () => { await action.fn(); } } : {}) }),
    rememberUndo: () => {},
    confirmAsk: async (msg) => window.confirm(msg),
    openFlow: () => {},
  });
  const [ask, setAsk] = useState<TrayItem | null>(null);
  /** the old verb button's handler: each door OPENS its journey; only the writer's own task is ticked (after asking) */
  const act = (i: TrayItem) => {
    const c = i.card;
    if (i.sweep) {
      const group = model.hkGroups.find((g) => g.rule === (c as BoardCard & { sweepRule?: string }).sweepRule);
      const need = group ? SWEEP_NEED[group.rule] : undefined;
      const first = group?.members[0]?.agentId;
      if (first) openAgentCard(first, { ...(need ? dataNeedTarget([need]) ?? {} : {}), from: "task" });
      return;
    }
    if (c.userTaskId) { setAsk(i); return; }
    if (c.taskType === "data_quality_poor" && i.agent) { openAgentCard(i.agent.id, { ...(dataNeedTarget(agentDataQualityNeeds(i.agent)) ?? {}), from: "task" }); return; }
    const door = drawerDoorForTask(c.taskType, c.relatedRecordId, (id) => queries.find((x) => x.id === id)?.offerRefQueryId);
    if (door) openQueryDrawer(door);
  };
  const openRow = (i: TrayItem) => {
    if (i.query) { navigate({ pathname: "/queries", search: `?q=${encodeURIComponent(i.query.id)}` }); return; }
    if (i.userTask) openPhoneCompose("task", { id: i.userTask.id, text: i.userTask.text ?? "", detail: i.userTask.detail ?? "", due: i.userTask.dueDate ?? null });
  };
  const askNode = ask && active ? createPortal(
    <div className="pa-layer pa-doneask" role="dialog" aria-modal="true" aria-label="Tick it off" data-pa="done-ask">
      <div className="pa-doneask-card">
        <b>Tick off “{ask.deed}”?</b>
        <span>It leaves your list. You can undo it straight after.</span>
        <div>
          <button type="button" className="keep" onClick={() => setAsk(null)}>Not yet</button>
          <button type="button" className="go" data-pa="done-go" onClick={() => { const c = ask.card; setAsk(null); void quickDone(c); }}>Tick it off</button>
        </div>
      </div>
    </div>, document.body) : null;
  return { act, openRow, askNode };
}

/** A checklist row (ref boot2 `.ck`): a 24px round tick, the title and its line, a chevron. The tick runs `onTick` (the
 *  old verb's door); the row runs `onOpen`. */
export const CheckRow: React.FC<{
  i: TrayItem; line: { text: string; late: string | null }; onTick: () => void; onOpen: () => void; style?: React.CSSProperties;
  dataPa?: string; chev: React.ReactNode;
}> = ({ i, line, onTick, onOpen, style, dataPa = "check-row", chev }) => (
  <div className="pa-ck" data-pa={dataPa} data-key={i.key} data-bucket={i.bucket} data-type={i.card.taskType ?? ""} style={style}>
    <button type="button" className="pa-ckbx" data-pa="tick" aria-label={`Do it: ${i.deed}`} onClick={onTick} />
    <button type="button" className="pa-ckt" data-pa="check-open" onClick={onOpen}>
      <span className="t"><b data-pa="check-title">{checkTitle(i)}</b>{line.text || line.late ? (
        <small data-pa="check-line">{line.late ? <span className="late" data-pa="check-late">{line.late}</span> : null}{line.late && line.text ? " · " : ""}{line.text}</small>
      ) : null}</span>
      {chev}
    </button>
  </div>
);
