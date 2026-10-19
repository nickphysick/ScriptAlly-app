/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v140 §C — THE PINNED BAND (ref design-refs/query-centre-v140/, screens 09–12): navy, 72 tall, the
 * sheet's full width, above the cream toolbar. Left to right:
 *
 *   "{N} queries" · the overdue disc (a button: the Overdue filter) · the heard-back ring · this week · + Log a query
 *
 * and the desk hawk (the hero's drawing) 22 from the sheet's left, running down from the band onto the toolbar.
 *
 * Built from Contact list v19's pinned band (`agents/contact/ContactListHead`, page-local): a lift candidate.
 *
 * ⚠️ THE BAND NEVER REPEATS THE GROUPS: no "your move", "waiting" or "closed" counts. Those live in the jump row and the
 *    Filters menu.
 * ⚠️ THE FIGURES ARE `bandFigures` (lib/qc140) over the rows the list is built from: heard back is `placeOf`'s "more"
 *    and "passed" over every query; overdue is `pastExpected`, the "Past their reply date" filter's own set, and the
 *    disc toggles THAT filter (one state with the Overdue quick pick); this week is lib/qcSentWeeks, the hero chart's.
 * ⚠️ THE DRAWING IS NEVER CLIPPED: it keeps its natural aspect (440 × 405, so 137 × 126), is absolutely placed inside
 *    the sticky stack and lies above the band and the toolbar (z 3) and clear of every control, which start 196 in.
 */
import React from "react";
import { QC_DESK_HAWK } from "./QcHeader138";
import type { BandFigures } from "../../../lib/qc140";
import { queriesWord } from "../../../lib/qcSentWeeks";

/** the ring: r 15 on a 40 box, a 5px stroke; the arc starts at twelve o'clock */
const RING_R = 15;
const RING_C = 2 * Math.PI * RING_R;
const BAR_MAX = 26;
const BAR_MIN = 3;

export const QcBand140: React.FC<{
  fig: BandFigures;
  /** the "Past their reply date" filter is on */
  overdueOn: boolean;
  onOverdue: () => void;
  onLog: () => void;
  loading?: boolean;
}> = ({ fig, overdueOn, onOverdue, onLog, loading = false }) => {
  const arc = (Math.min(100, Math.max(0, fig.heardPct)) / 100) * RING_C;
  const top = Math.max(1, ...fig.weeks.map((w) => w.n));
  const answered = fig.more + fig.passed;
  return (
    <div className="qc140-band" data-qc140="band">
      <img className="qc140-bart" data-qc140="band-art" src={`${QC_DESK_HAWK.src}?v=${QC_DESK_HAWK.version}`} width={QC_DESK_HAWK.w} height={QC_DESK_HAWK.h}
        alt="" aria-hidden="true" draggable={false} />
      <p className="qc140-bn" data-qc140="band-count">
        <b data-qc140="band-figure">{fig.total}</b><span>{queriesWord(fig.total)}</span>
      </p>
      <button type="button" className="qc140-od" data-qc140="band-overdue" data-n={fig.overdue} aria-pressed={overdueOn} disabled={loading}
        title={overdueOn ? "Show every query" : "Show the queries past their reply date"}
        aria-label={`${fig.overdue} overdue${overdueOn ? ", showing only these" : ""}`}
        onClick={onOverdue}>
        <i aria-hidden="true">{fig.overdue}</i><span aria-hidden="true">overdue</span>
      </button>
      <div className="qc140-hb" data-qc140="band-heard" title={`Of ${fig.total} ${queriesWord(fig.total)}, ${answered} ${answered === 1 ? "has" : "have"} had an answer`}>
        <svg className="qc140-ring" data-qc140="band-ring" viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
          <circle cx="20" cy="20" r={RING_R} fill="none" stroke="rgba(244,238,229,.18)" strokeWidth="5" />
          {arc > 0 ? (
            <circle cx="20" cy="20" r={RING_R} fill="none" stroke="#f4eee5" strokeWidth="5" strokeLinecap="round"
              strokeDasharray={`${arc} ${RING_C}`} transform="rotate(-90 20 20)" />
          ) : null}
        </svg>
        <span className="qc140-bt">
          <b data-qc140="band-heard-pct">{fig.heardPct}% heard back</b>
          <small data-qc140="band-more">{fig.more} asked for more</small>
        </span>
      </div>
      <span className="qc140-bsp" />
      <div className="qc140-wk" data-qc140="band-week" title={`${fig.thisWeek} ${queriesWord(fig.thisWeek)} sent this week, ${fig.weekBefore} the week before`}>
        <span className="qc140-bars" aria-hidden="true">
          {fig.weeks.map((w, i) => (
            <i key={w.start} data-cur={i === fig.weeks.length - 1 ? "" : undefined}
              style={{ height: `${w.n > 0 ? Math.max(BAR_MIN, Math.round((w.n / top) * BAR_MAX)) : BAR_MIN}px` }} />
          ))}
        </span>
        <span className="qc140-bt">
          <b data-qc140="band-week-n">{fig.thisWeek} this week</b>
          <small data-qc140="band-week-before">{fig.weekBefore} the week before</small>
        </span>
      </div>
      <span className="qc140-bsp" />
      <button type="button" className="qc140-blog" data-qc140="band-log" onClick={onLog}>+ Log a query</button>
    </div>
  );
};
