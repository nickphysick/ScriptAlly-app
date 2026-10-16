/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v138.5 §C — THE WEEKLY CHART: a white card in the header grid's right-hand column. The eyebrow
 * ("SENT · THIS WEEK"), the selected week's number and its noun, and twelve week buttons ending with this week, over
 * an axis ("12 WKS AGO", "{total} IN ALL", "NOW"). No heading, average or legend.
 *
 * ⚠️ THE CARD'S HEIGHT IS THE TITLE BLOCK'S, written by ONE writer (QcHeader138's ResizeObserver on the title block,
 *    `--qc138-bt-h` on the header grid) on load and on every resize of that block. Nothing here measures or polls.
 * ⚠️ THE COUNTS ARE `sentWeeks` (lib/qcSentWeeks): the manuscript's queries by the Monday-start week of their
 *    first-queried date, in the user's own zone.
 * ⚠️ SELECTION IS AN OFFSET FROM THE END, null meaning "this week": a count arriving after the first paint, or the
 *    week turning over, keeps "this week" selected rather than a fixed slot.
 */
import React, { useState } from "react";
import { barShare, queriesWord, weekName, type SentWeek } from "../../../lib/qcSentWeeks";

export const QcWeekChart138: React.FC<{
  /** the twelve weeks, oldest first; null while the page loads */
  weeks: readonly SentWeek[] | null;
}> = ({ weeks }) => {
  const [back, setBack] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const n = weeks?.length ?? 12;
  const sel = n - 1 - (back ?? 0);
  const shown = hover ?? sel;
  const count = weeks ? weeks[shown]?.n ?? 0 : null;
  const total = weeks ? weeks.reduce((s, w) => s + w.n, 0) : null;
  return (
    <div className="qc138-wk" data-qc138="chart" data-loading={weeks ? undefined : ""}>
      <div className="qc138-wk-ey" data-qc138="chart-eyebrow">Sent · {weeks ? weekName(shown, weeks) : "This week"}</div>
      <div className="qc138-wk-big" data-preview={hover !== null && hover !== sel ? "" : undefined}>
        <b data-qc138="chart-n">{count === null ? "" : count}</b>
        <span data-qc138="chart-noun">{queriesWord(count ?? 0)}</span>
      </div>
      <div className="qc138-wk-bz">
        <div className="qc138-wk-bars" role="group" aria-label="Queries sent each week" onPointerLeave={() => setHover(null)}>
          {Array.from({ length: n }, (_, i) => {
            const w = weeks?.[i];
            const v = w?.n ?? 0;
            const on = i === sel;
            return (
              <button key={i} type="button" className="qc138-wk-w" data-qc138="week" data-i={i} data-n={weeks ? v : undefined}
                aria-pressed={on} disabled={!weeks}
                aria-label={weeks ? `${weekName(i, weeks)}: ${v} sent` : undefined}
                onPointerEnter={() => setHover(i)}
                onClick={() => setBack(n - 1 - i === 0 ? null : n - 1 - i)}>
                <i className={v > 0 ? "qc138-wk-b" : "qc138-wk-b qc138-wk-b--z"} data-qc138="week-bar"
                  style={v > 0 && weeks ? { height: `${barShare(v, weeks) * 100}%` } : undefined} />
              </button>
            );
          })}
        </div>
        <div className="qc138-wk-ax" data-qc138="chart-axis" aria-hidden="true">
          <span>12 wks ago</span><span>{total === null ? "" : `${total} in all`}</span><span>Now</span>
        </div>
      </div>
    </div>
  );
};
