/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QcBirdsEye — the rail's view (v65 §6): head, focus toggle, axis, rows, legend.
 *
 * ⚠️ ONE VERTICAL LINE, AND EVERY ROW IS SHIFTED SO ITS OWN EXPECTED DATE SITS ON IT (§6.3). That
 * is what makes a single line readable across rows whose dates are months apart: the gap between a
 * bar's end and the line IS the time left, in the same pixels, on every row. The arithmetic is in
 * `lib/qcBirdsEye`, so this file places what it is given and derives nothing.
 *
 * ⚠️ AND THE LINE RUNS THE HEIGHT OF THE ROWS, NOT OF THE SCROLL BOX (§6.3). A line drawn on the
 * scroller would carry on past the last row into empty space and read as a date the rows below it
 * are measured against — so it is drawn INSIDE the rows' own container, which is exactly as tall as
 * they are.
 */
import React, { useState } from "react";
import { StatusDot } from "../../StatusDot";
import { EYE_FOCUS, eyeFaded, eyeGroups, type EyeFocus, type EyeGroup, type EyeRow } from "../../../lib/qcBirdsEye";
import type { QcRow } from "../../../lib/qcSummary";
import "./qcvBirdsEye.css";

const Bar: React.FC<{ r: EyeRow }> = ({ r }) => (
  <span className="qcv-be-t" data-qcv="be-track">
    <i
      className={`qcv-be-bar${r.bar.cut ? " qcv-be-bar--cut" : ""}${r.bar.dashed ? " qcv-be-bar--dash" : ""}${r.court === "you" ? " qcv-be-bar--you" : ""}`}
      data-qcv="be-bar"
      data-status={r.row.status}
      /* the stage's own colour, set the way `QcList` and `QcTimeline` set it — one vocabulary */
      style={{ left: `${r.bar.left}%`, width: `${r.bar.width}%`, ["--qcv-state" as string]: `var(--state-${r.row.state})` }}
    >
      {/* the overrun rides INSIDE the bar, so nothing can leave it behind when the bar moves */}
      {r.bar.over && (
        <u
          className="qcv-be-over"
          data-qcv="be-over"
          style={{ left: `${((r.bar.over.left - r.bar.left) / Math.max(r.bar.width, 0.0001)) * 100}%`, width: `${(r.bar.over.width / Math.max(r.bar.width, 0.0001)) * 100}%` }}
        />
      )}
    </i>
  </span>
);

export const QcBirdsEye: React.FC<{
  rows: readonly QcRow[];
  nowMs: number;
  loading?: boolean;
  /**
   * Open the expanded view (§6.4). The ⤢ opens it with nothing highlighted; a ROW opens it with
   * that query highlighted — and never opens the card in the rail, which is the one thing a rail
   * row does not do.
   */
  onExpand: (focusId: string | null) => void;
}> = ({ rows, nowMs, loading = false, onExpand }) => {
  const [focus, setFocus] = useState<EyeFocus>("all");
  const groups: EyeGroup[] = loading ? [] : eyeGroups(rows, nowMs);
  const total = groups.reduce((n, g) => n + g.count, 0);

  return (
    <div className="qcv-be" data-qcv="railcal">
      <div className="qcv-be-head" data-qcv="be-head">
        <b className="qcv-be-ttl">Birds-eye view</b>
        {/* ⚠️ THE ⤢ OPENS IT WITH NOTHING HIGHLIGHTED; a ROW opens it with that query highlighted.
            Two doors, one destination, and the difference is what arrives selected. */}
        <button type="button" className="qcv-be-ex" data-qcv="be-expand" aria-label="Open the Birds-eye view" disabled={loading} onClick={() => onExpand(null)}>
          <span aria-hidden="true">⤢</span>
        </button>
      </div>

      {/* ⚠️ THE FOCUS FADES, IT DOES NOT FILTER (§6.1) — the other court's rows stay where they are
          and the counts do not move. A toggle that removed rows would be a second filter beside the
          sentence's, and the two would disagree about how many queries there are. */}
      <div className="qcv-be-focus" role="group" aria-label="Focus" data-qcv="be-focus">
        {EYE_FOCUS.map((f) => (
          <button key={f.key} type="button" aria-pressed={focus === f.key} disabled={loading} onClick={() => setFocus(f.key)} data-f={f.key}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="qcv-be-axis" data-qcv="be-axis" aria-hidden="true">
        <span className="qcv-be-axl">Due date</span>
        {[10, 20, 30, 40, 60, 70, 80, 90].map((x) => <i key={x} style={{ left: `${x}%` }} />)}
      </div>

      <div className="qcv-be-scroll" data-qcv="be-scroll">
        {groups.length === 0 ? (
          <p className="qcv-be-none">{loading ? "" : "Nothing is out with an agent."}</p>
        ) : groups.map((g) => (
          <section key={g.key} className={`qcv-be-grp qcv-be-grp--${g.key}`} data-qcv="be-group" data-group={g.key}>
            <h3 className="qcv-be-gh" data-qcv="be-heading">{g.label}<span>{g.count}</span></h3>
            {/* ⚠️ THE LINE IS THIS ELEMENT'S, so it is exactly as tall as the rows it measures */}
            <div className="qcv-be-rows" data-qcv="be-rows">
              <i className="qcv-be-line" data-qcv="be-line" aria-hidden="true" />
              {g.rows.map((r) => (
                /* ⚠️ A ROW OPENS THE EXPANDED VIEW, NOT THE CARD IN THE RAIL (§6.4) — the rail is
                   where you LOOK at the shape of things; opening a query here would replace the very
                   view you are reading with the thing you were reading it about. */
                <button
                  key={r.id}
                  type="button"
                  className={`qcv-be-row${eyeFaded(r, focus) ? " qcv-be-row--fade" : ""}${r.group === "watch" ? " qcv-be-row--watch" : ""}`}
                  data-qcv="be-row"
                  data-id={r.id}
                  data-court={r.court}
                  title={r.title}
                  onClick={() => onExpand(r.id)}
                >
                  <span className="qcv-be-who">
                    <i className="qcv-be-ini" aria-hidden="true">{r.row.initials}</i>
                    <span className="qcv-be-wtx">
                      <b className="qcv-be-nm">{r.row.agentName}</b>
                      <span className="qcv-be-st"><StatusDot status={r.row.status} overrideSize={11} decorative />{r.stage}</span>
                    </span>
                  </span>
                  <Bar r={r} />
                  <span className={`qcv-be-day${r.day.urgent ? " qcv-be-day--urgent" : ""}`} data-qcv="be-day">{r.day.text}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="qcv-be-key" data-qcv="be-key" aria-hidden="true">
        <i className="qcv-be-k1" /> to the date
        <i className="qcv-be-k2" /> past it
        <i className="qcv-be-k3" /> no date
      </div>
      <span className="qcv-sr-only" data-qcv="be-count">{loading ? "" : `${total} ${total === 1 ? "query" : "queries"} out`}</span>
    </div>
  );
};
