/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * A query's clock, drawn (non-workspace v1, Phase 3; ref: design-refs/settings-v2.html `clock()`): sent today, reply
 * expected, nudge suggested, gone quiet — each segment as long as its weeks — and the caption sentence. It redraws
 * from the clock it is given, so changing a timing moves the picture.
 */
import React from "react";
import type { QueryClock } from "../../lib/queryClock";
import "./clockTimeline.css";

const DAY = 86_400_000;
export const wk = (n: number) => (n === 1 ? "1 week" : `${n} weeks`);
export const clockDate = (from: Date, weeks: number) =>
  new Date(from.getTime() + weeks * 7 * DAY).toLocaleDateString("en-GB", { day: "numeric", month: "long" });

/** The ref's caption. The second sentence appears only when a check-back falls before the query goes quiet. */
export function clockCaption(c: QueryClock, today: Date): string {
  const lead = "A query sent today to an agent who hasn't said how long they take.";
  return c.checkBackWeeks < c.quietWeeks
    ? `${lead} If you nudge and still hear nothing, QueryHawk suggests another on ${clockDate(today, c.replyWeeks + c.nudgeAfterWeeks + c.checkBackWeeks)}.`
    : lead;
}

export const ClockTimeline: React.FC<{ clock: QueryClock; today?: Date }> = ({ clock: c, today = new Date() }) => {
  const a = c.replyWeeks, b = c.nudgeAfterWeeks, q = c.quietWeeks;
  const label = `Sent today, reply expected ${clockDate(today, a)}, nudge suggested ${clockDate(today, a + b)}, gone quiet ${clockDate(today, a + b + q)}`;
  const Node = ({ t, d, end }: { t: string; d: string; end?: boolean }) => (
    <div className={`ct-node${end ? " ct-node--end" : ""}`}><i aria-hidden="true" /><b>{t}</b><small>{d}</small></div>
  );
  const Seg = ({ w, cls }: { w: number; cls: string }) => (
    <div className={`ct-seg ${cls}`} style={{ flexGrow: Math.max(w, 2) }}><span>{wk(w)}</span></div>
  );
  return (
    <div className="ct" data-acct="clock">
      <div className="ct-line" role="img" aria-label={label}>
        <Node t="Sent" d="Today" />
        <Seg w={a} cls="ct-s1" />
        <Node t="Reply expected" d={clockDate(today, a)} />
        {b > 0 && <><Seg w={b} cls="ct-s2" /><Node t="Nudge suggested" d={clockDate(today, a + b)} /></>}
        <Seg w={q} cls="ct-s3" />
        <Node t="Gone quiet" d={clockDate(today, a + b + q)} end />
      </div>
      <p className="ct-cap" data-acct="clock-caption">{clockCaption(c, today)}</p>
    </div>
  );
};
