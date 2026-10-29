/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v7 — the page's TODAY card, and the date helpers the slide-out calendar shares.
 *
 * ⚠️ v5.2's CALENDAR CARD (the day panel beside the month, in the header) IS RETIRED BY v7 S1 (29 Oct). Its today figures
 *    became the Today card below; the month lives only in the slide-out drawer (TrayCalDrawer), which reads the
 *    helpers here.
 * ⚠️ EVERY FIGURE IS `lib/trayCalendar`'s. NOTHING HERE WRITES: a count filters the tray; the button opens the drawer.
 */
import React from "react";
import { counted, type CalFilter, type CalItem, type CalKind, type DayBuckets } from "../../../lib/trayCalendar";
import { MONTHS_SHORT } from "../../../lib/dates";

export const WD_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const MON_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const ymdParts = (ymd: string) => { const [y, m, d] = ymd.split("-").map(Number); return { y, m: m - 1, d }; };
export const ymdOf = (y: number, m: number, d: number) => { const x = new Date(Date.UTC(y, m, d)); return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, "0")}-${String(x.getUTCDate()).padStart(2, "0")}`; };
export const plusDays = (ymd: string, n: number) => { const p = ymdParts(ymd); return ymdOf(p.y, p.m, p.d + n); };
export const weekdayOf = (ymd: string) => { const p = ymdParts(ymd); return new Date(Date.UTC(p.y, p.m, p.d)).getUTCDay(); };
/** "15 Oct" */
export const shortDay = (ymd: string) => { const p = ymdParts(ymd); return `${p.d} ${MONTHS_SHORT[p.m]}`; };
/** "Thu 15 Oct" */
export const dayChip = (ymd: string) => `${WD_LONG[weekdayOf(ymd)].slice(0, 3)} ${shortDay(ymd)}`;
/** the six (or five) weeks the month draws, Monday first */
export function monthDays(y: number, m: number): string[] {
  const first = ymdOf(y, m, 1);
  let d = plusDays(first, -((weekdayOf(first) + 6) % 7));
  const out: string[] = [];
  for (let i = 0; i < 42; i++) {
    if (i === 35 && ymdParts(d).m !== m) break;
    out.push(d);
    d = plusDays(d, 1);
  }
  return out;
}

/**
 * To-do list v7 §2 — TODAY: the day panel's today figures, laid out across the page in one white card (the date, then
 * Overdue · Due today · Later, then "Open the calendar"). The month lives only in the slide-out drawer now.
 * ⚠️ THE COUNTS ARE THE SAME CONTROLS AS v5.2's ROWS (`data-td52="cal-row"`, the same filters): a press filters the
 *    tray and sets `aria-pressed`; a second press clears it. Figures from `lib/trayCalendar` (DayBuckets), never retold.
 */
export const TrayToday: React.FC<{
  today: string;
  items: readonly CalItem[];
  buckets: DayBuckets;
  filter: CalFilter | null;
  onFilter: (f: CalFilter | null) => void;
  onOpenDrawer: () => void;
  loading?: boolean;
}> = ({ today, items, buckets: b, filter, onFilter, onOpenDrawer, loading }) => {
  const pressed = (f: CalFilter) => !!filter && filter.k === f.k;
  const press = (f: CalFilter) => onFilter(pressed(f) ? null : f);
  const todayCounted = items.filter((i) => counted(i) && i.ymd === today);
  const todayKinds = new Set(todayCounted.map((i) => i.kind));
  const todayHint = todayCounted.length === 0 ? "" : todayKinds.size === 1
    ? ({ send: "material to send", nudge: "nudge due", close: "consider closing", mine: "your task" } as Record<CalKind, string>)[[...todayKinds][0]]
    : `${todayKinds.size} kinds`;
  const d = ymdParts(today);
  const count = (n: number, label: string, hint: string, f: CalFilter, od?: boolean) => (
    <button type="button" className={`td7-ct${od ? " od" : ""}${n ? "" : " z"}`} data-td52="cal-row" data-td7="count" data-f={f.k}
      aria-pressed={pressed(f)} disabled={loading || !n} onClick={() => press(f)}>
      <span className="td7-ctl">{label}</span>
      <b className="td7-ctn">{loading ? "" : n}</b>
      <span className="td7-cth">{loading ? "" : hint || " "}</span>
    </button>
  );
  return (
    <div className="td7-tcard" data-td7="today-card">
      <div className="td7-date" data-td7="date">
        <span className="td7-num">{d.d}</span>
        <span className="td7-wd">{WD_LONG[weekdayOf(today)]}<small>{MON_LONG[d.m]}</small></span>
      </div>
      {count(b.overdue, "Overdue", b.oldest ? `since ${shortDay(b.oldest)}` : "", { k: "overdue" }, true)}
      {count(b.today, "Due today", todayHint, { k: "today" })}
      {count(b.later, "Later", b.next ? `next ${shortDay(b.next)}` : "", { k: "later" })}
      <button type="button" className="td7-calbtn" data-td7="open-calendar" disabled={loading} onClick={onOpenDrawer}>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><rect x="2" y="3" width="12" height="11" rx="2" /><path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" /></svg>
        Open the calendar
      </button>
    </div>
  );
};
