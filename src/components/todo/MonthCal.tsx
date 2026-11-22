/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The inline month calendar and the day label the snooze / dismiss pop-up (SetAsidePop) uses — moved verbatim out of
 * the retired desktop tray's compose card (v5/ComposeCard) when To-do list v51 replaced that page; the phone's To-do
 * still opens the pop-up. Its styles are in setAsidePop.css.
 */
import React, { useState } from "react";
import { MONTHS_SHORT } from "../../lib/dates";

const ymdOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dayOf = (ymd: string) => { const [y, m, d] = ymd.split("-").map(Number); return new Date(y, m - 1, d, 12); };
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const dayLabel = (ymd: string) => { const d = dayOf(ymd); return `${WD[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`; };

/** the inline month calendar: Monday first, past days disabled — and, with `max`, every day after it (a snooze's cap) */
export const MonthCal: React.FC<{ todayYmd: string; value: string | null; onPick: (ymd: string) => void; max?: string | null; min?: string }> = ({ todayYmd, value, onPick, max = null, min }) => {
  const [anchor, setAnchor] = useState(() => { const d = dayOf(value ?? todayYmd); return new Date(d.getFullYear(), d.getMonth(), 1, 12); });
  const first = (anchor.getDay() + 6) % 7;
  const days = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
  const thisMonth = dayOf(todayYmd);
  const atStart = anchor.getFullYear() === thisMonth.getFullYear() && anchor.getMonth() === thisMonth.getMonth();
  const name = anchor.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  return (
    <div className="td5-cal" data-td5="calendar" role="group" aria-label="Pick a date">
      <div className="td5-calm">
        <b>{name}</b>
        <span>
          <button type="button" aria-label="Previous month" disabled={atStart} onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1, 12))}>‹</button>
          <button type="button" aria-label="Next month" onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1, 12))}>›</button>
        </span>
      </div>
      <div className="td5-caldw" aria-hidden="true">{["M", "T", "W", "T", "F", "S", "S"].map((x, i) => <i key={i}>{x}</i>)}</div>
      <div className="td5-calg">
        {Array.from({ length: first }, (_, i) => <i key={`b${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const ymd = ymdOf(new Date(anchor.getFullYear(), anchor.getMonth(), i + 1, 12));
          return (
            <button key={ymd} type="button" data-day={ymd} disabled={ymd < (min ?? todayYmd) || (!!max && ymd > max)} aria-pressed={value === ymd}
              data-today={ymd === todayYmd ? "" : undefined} onClick={() => onPick(ymd)}>{i + 1}</button>
          );
        })}
      </div>
    </div>
  );
};
