/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone query sheet v1 — "AN EARLIER DATE" ON THE PHONE: the app's one slider (WeekSlider) counting DAYS, from the query's
 * last event (its left end, never before it) to two days ago (Today and Yesterday are their own rows). Never a calendar
 * and never fixed date pills (brief §C, lock PQS-7). The desktop journeys keep their calendar; only their `phone` mode
 * draws this.
 */
import React from "react";
import { WeekSlider } from "../../forms/WeekSlider";
import { MONTHS_SHORT } from "../../../lib/dates";

const DAY = 86_400_000;
const sod = (ms: number) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const wdmDay = (ms: number): string => { const d = new Date(ms); return `${WD[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`; };

/** the slider's days: from `minMs`'s day to two days before `nowMs` (null when there is no such day) */
export function earlierSpan(minMs: number, nowMs: number): { from: number; to: number; n: number } | null {
  const from = sod(minMs), to = sod(nowMs) - 2 * DAY;
  if (to < from) return null;
  return { from, to, n: Math.round((to - from) / DAY) };
}

export const PhoneDaySlider: React.FC<{ minMs: number; nowMs: number; cur: number | null; onPick: (ms: number) => void; data: string }> = ({ minMs, nowMs, cur, onPick, data }) => {
  const span = earlierSpan(minMs, nowMs);
  if (!span) return <p className="laq-wkx" data-cj="earlier-none">{`Nothing earlier: it can’t go before ${wdmDay(minMs)}.`}</p>;
  const k = cur != null && cur >= span.from && cur <= span.to ? Math.round((cur - span.from) / DAY) : span.n;
  return (
    <div className="laq-wkb pqj-days" data-cj={`${data}-slider`} data-min={span.from} data-max={span.to}>
      <WeekSlider label="An earlier date" hideLabel value={k} min={0} max={Math.max(1, span.n)}
        readout={(n) => wdmDay(span.from + n * DAY)} ends={[wdmDay(span.from), wdmDay(span.to)]}
        onChange={(n) => onPick(span.from + Math.min(span.n, Math.max(0, n ?? 0)) * DAY)} />
    </div>
  );
};
