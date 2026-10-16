/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Analytics v21 §D — REPLIES AGAINST THE STATED WINDOW (design-refs/analytics-v21/analytics-v21.html, `.rw`): a
 * key, then two lists of rows — replied inside their window, replied after it. Each row is the agency and what
 * the reply was, a track, and "{took} wks / said {said} wks · {over} over".
 *
 * ⚠️ THE TRACK, AND WHY THE TOOK BAR IS INSET. The "said" bar is the stated window, 14px. "Took" sits inside it as
 *    an 8px navy bar inset 3px, and its width is `calc(p% − 3px)` so its END is at p% — inside a row it ends before
 *    the said bar's end; after, it ends AT it, and the rust "over" bar starts there with square left corners.
 * ⚠️ ONE SCALE PER COLUMN, with its own axis of week ticks under the track column (a grid row on the rows' own
 *    tracks, so the ticks cannot drift from the bars).
 * ⚠️ A REPLY FROM AN AGENCY THAT STATES NO WINDOW IS NEVER PLACED; the count is said under the columns.
 */
import React from "react";
import type { WindowReplies, WindowReply } from "../../lib/analyticsV21";
import { wksShort } from "../../lib/analyticsV21";
import { STATE_FILL } from "../../lib/analyticsModel";

/** The column's scale in weeks: the longest said-or-took, with a little room, to the next even week (4 at least). */
export function colScale(rows: WindowReply[]): number {
  const m = Math.max(0, ...rows.map((r) => Math.max(r.saidWeeks, r.tookDays / 7)));
  return Math.max(4, Math.ceil((m * 1.08) / 2) * 2);
}
const pc = (v: number, scale: number) => `${Math.min(100, (v / scale) * 100).toFixed(2)}%`;

const Row: React.FC<{ r: WindowReply; scale: number }> = ({ r, scale }) => {
  const took = r.tookDays / 7;
  const tookEnd = Math.min(took, r.saidWeeks);
  return (
    <li className="a21-rwli" data-a21="rw-row" data-inside={r.inside ? "" : undefined}
      title={`${r.agency}: states ${r.saidWeeks} ${r.saidWeeks === 1 ? "week" : "weeks"}, replied after ${wksShort(r.tookDays).replace("wks", "weeks").replace("wk", "week")}. ${r.what}.`}>
      <div className="a21-rwwho"><b>{r.agency}</b><small><i style={{ background: STATE_FILL[r.bucket] }} aria-hidden="true" />{r.what}</small></div>
      <div className="a21-rwtrk" data-a21="rw-track">
        <span className="a21-rwsaid" data-a21="rw-said" style={{ width: pc(r.saidWeeks, scale) }} />
        <span className="a21-rwtook" data-a21="rw-took" style={{ width: `max(0px, calc(${pc(tookEnd, scale)} - 3px))` }} />
        {r.overDays > 0 ? <span className="a21-rwover" data-a21="rw-over" style={{ left: pc(r.saidWeeks, scale), width: `max(2px, ${pc(r.overDays / 7, scale)})` }} /> : null}
      </div>
      <div className="a21-rwlab">
        <b>{wksShort(r.tookDays)}</b>
        <span>said {r.saidWeeks} {r.saidWeeks === 1 ? "wk" : "wks"}{r.overDays > 0 ? <> · <em>{wksShort(r.overDays)} over</em></> : null}</span>
      </div>
    </li>
  );
};

const Col: React.FC<{ title: string; rows: WindowReply[]; tone: "b" | "o"; none: string }> = ({ title, rows, tone, none }) => {
  const scale = colScale(rows);
  const ticks: number[] = [];
  for (let w = 4; w < scale; w += 4) ticks.push(w);
  return (
    <div className="a21-rwcol" data-a21="rw-col" data-k={tone === "b" ? "inside" : "after"}>
      <h4><span className={`a21-rwn${tone === "o" ? " o" : ""}`} data-a21="rw-n">{rows.length === 0 ? "None" : rows.length}</span>{title}</h4>
      {rows.length === 0 ? <p className="a21-rwnone">{none}</p> : (
        <>
          <ul>
            {rows.map((r) => <Row key={r.id} r={r} scale={scale} />)}
            {/* the axis is the list's last row, so its tick column IS the rows' track column (a subgrid) */}
            <li className="a21-rwax" aria-hidden="true"><span /><span className="a21-rwaxt">{ticks.map((w, i) => <i key={w} style={{ left: pc(w, scale) }}>{i === ticks.length - 1 ? `${w} wks` : w}</i>)}</span><span /></li>
          </ul>
        </>
      )}
    </div>
  );
};

export const A21Window: React.FC<{ w: WindowReplies }> = ({ w }) => (
  <div className="a21-rw" data-a21="rw">
    {w.dated === 0 ? (
      <p className="a17-none">No replies against a stated window yet{w.unplaced ? `: ${w.unplaced === 1 ? "the one reply came" : `the ${w.unplaced} replies came`} from agencies that state no window` : ""}.</p>
    ) : (
      <>
        <div className="a21-rwkey" data-a21="rw-key">
          <span><i className="a21-ksaid" />The time the agent says they take</span>
          <span><i className="a21-ktook" />How long they took</span>
          <span><i className="a21-kover" />Time past what they said</span>
        </div>
        <div className="a21-rwcols">
          <Col title="Replied inside their window" rows={w.inside} tone="b" none="No reply has come inside its window yet." />
          <Col title="Replied after their window" rows={w.after} tone="o" none="No reply has come after its window." />
        </div>
        {w.unplaced ? <p className="a21-rwun" data-a21="rw-unplaced">{w.unplaced === 1 ? "One more reply came" : `${w.unplaced} more replies came`} from agencies that state no window, so {w.unplaced === 1 ? "it is" : "they are"} not placed here.</p> : null}
      </>
    )}
  </div>
);
