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
 * To-do on the phone v1: the doors (`useTodoDoors`), Up next's words (`whyLine`, `upNextVerb`) and the To-do page's use of
 * this model are retired — the To-do list and Home's taps now open the desktop's own task screen (PhoneTaskScreen). Home
 * still reads this model for its short list of what is due.
 */
import React, { useMemo } from "react";
import { useScriptAllyDb } from "../../../lib/db";
import { assembleBoardColumns } from "../../../lib/todoColumns";
import { localYMD } from "../../../lib/shellSidebar";
import { calendarItems, counted, dayBuckets, londonToday, type CalItem } from "../../../lib/trayCalendar";
import { trayItem, type TrayDb, type TrayItem } from "../../../lib/todoTray";
import { overdueLabel } from "../../../lib/trayRows";
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
