/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MonthGrid (To-do nudge desk v2, design-refs/todo-nudge-desk-v2/) — A SMALL SHARED MONTH CALENDAR, in the app's tokens:
 * the month and year between two 30px arrows (bounded by `min` and `max`), a Monday-first weekday row, 36px day circles
 * (hover tint; today ringed; the picked day navy; days outside [min, max] faded and not clickable) and an optional
 * footnote. Its rules are lib/monthGrid's. The app's other month calendar (components/todo/MonthCal) looks forward
 * (past days off, Previous stopped at this month) and serves DatePick and the phone's snooze pop-up, so it is not this.
 */
import React from "react";
import { canPick, monthCells, monthNav, WEEKDAYS } from "../../lib/monthGrid";
import "./monthGrid.css";

const PREV = <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3L5 8l5 5" /></svg>;
const NEXT = <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5" /></svg>;

export interface MonthGridProps {
  /** the month on show (any day in it) and its setter */
  month: Date;
  onMonth: (m: Date) => void;
  min: Date;
  max: Date;
  today: Date;
  value: Date | null;
  onPick: (d: Date) => void;
  footnote?: React.ReactNode;
  label?: string;
}

export const MonthGrid: React.FC<MonthGridProps> = ({ month, onMonth, min, max, today, value, onPick, footnote, label = "Pick a day" }) => {
  const { lead, cells } = monthCells(month, { min, max, today, value });
  const nav = monthNav(month, min, max);
  const name = month.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  return (
    <div className="mg" role="group" aria-label={label} data-mg="grid">
      <div className="mg-head">
        <button type="button" className="mg-nav" aria-label="Previous month" data-mg="prev" disabled={!nav.prev}
          onClick={() => onMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>{PREV}</button>
        <b data-mg="month">{name}</b>
        <button type="button" className="mg-nav" aria-label="Next month" data-mg="next" disabled={!nav.next}
          onClick={() => onMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>{NEXT}</button>
      </div>
      <div className="mg-grid">
        {WEEKDAYS.map((w, i) => <span key={`w${i}`} className="mg-wd" aria-hidden="true">{w}</span>)}
        {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} />)}
        {cells.map((c) => (
          <button key={c.day} type="button" className="mg-day" data-mg-day={c.day} disabled={c.disabled}
            data-today={c.today ? "" : undefined} aria-pressed={c.picked} aria-label={c.date.toDateString()}
            onClick={() => { if (canPick(c.date, min, max)) onPick(c.date); }}>{c.day}</button>
        ))}
      </div>
      {footnote ? <p className="mg-foot">{footnote}</p> : null}
    </div>
  );
};
