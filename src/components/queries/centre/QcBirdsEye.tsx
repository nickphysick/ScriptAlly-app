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
import { attentionCounts } from "../../../lib/qcCalView";
import { BE_HAWK_HEAD } from "./qcArt";
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
  const counts = attentionCounts(loading ? [] : rows, nowMs);

  return (
    <div className="qcv-be" data-qcv="railcal">
      {/**
        * §4 — THE HEAD IS A BLUSH TRAY, AND THE HAWK PEEKS OUT OF ITS BOTTOM EDGE.
        *
        * ⚠️ THE CLIPPING LAYER IS ITS OWN ELEMENT, not `overflow: hidden` on the tray. The toggle
        * sits 10px BELOW the tray and the counts line's own descenders reach its padding, so a tray
        * that clipped would clip them too. One element clips, and it holds nothing but the picture.
        *
        * ⚠️ AND THE PICTURE IS BEHIND THE WORDS BY STACKING ORDER, never by being drawn smaller.
        * The clip layer is `z-index: 0` and every text child is above it; the head is `right: -14px;
        * bottom: -36px` inside it, so the crown, brows, eyes and spectacles show and the rest is cut
        * by the tray's own bottom edge — which is the whole drawing this design wants.
        */}
      <div className="qcv-be-head" data-qcv="be-head">
        <span className="qcv-be-clip" aria-hidden="true">
          <img className="qcv-be-hawk" src={`${BE_HAWK_HEAD.src}?v=${BE_HAWK_HEAD.version}`} width={BE_HAWK_HEAD.width} height={BE_HAWK_HEAD.height} alt="" data-qcv="be-hawk" />
        </span>
        <b className="qcv-be-ttl" data-qcv="be-title">Birds-eye view</b>
        {/**
          * §4 — THE COUNTS LINE IS THE RAIL'S ALONE; the expanded header has none, because its three
          * stat cards ARE the counts and they filter (§1.4). Both read `attentionCounts`, so the two
          * surfaces cannot state different numbers for the same three groups.
          */}
        <span className="qcv-be-counts" data-qcv="be-counts">
          <b>{counts.overdue} overdue</b>{` · ${counts.upcoming} upcoming · ${counts.watch} waiting`}
        </span>
        {/* ⚠️ THE ⤢ OPENS IT WITH NOTHING HIGHLIGHTED; a ROW opens it with that query highlighted.
            Two doors, one destination, and the difference is what arrives selected. */}
        <button type="button" className="qcv-be-ex" data-qcv="be-expand" aria-label="Open the Birds-eye view" disabled={loading} onClick={() => onExpand(null)}>
          {/* ⚠️ DRAWN, NOT TYPED (v65.1). It was the character `⤢` (U+2922), which neither Special
              Elite nor the app's mono face carries, so the browser fell back and rendered a dot —
              a control whose whole meaning is its arrow, showing none. A glyph a font may not have
              is a picture that may not arrive; a path always does. */}
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
            <path d="M7.6 1.4h4v4M11.6 1.4 7.9 5.1M5.4 11.6h-4v-4M1.4 11.6l3.7-3.7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
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

      {/**
        * §5 — THE AXIS SHARES THE ROW'S OWN GRID, so its track cell is the rows' track cell and the
        * DUE pill cannot drift from the line beneath it. Three rules each computing the track is
        * three chances for one of them to be a pixel out, on the one element whose job is to line up.
        *
        * ⚠️ WAITING AND OVERDUE ARE 30px FROM THE LINE, NOT FROM THE PILL. The pill's width is its
        * text's, so measuring from its edges would move both labels the day the word changed.
        */}
      <div className="qcv-be-axis" data-qcv="be-axis" aria-hidden="true">
        <span />
        <span className="qcv-be-axt">
          <u className="qcv-be-axnow">Due</u>
          <em className="qcv-be-axl">Waiting</em>
          <em className="qcv-be-axr">Overdue</em>
          {[10, 20, 30, 40, 60, 70, 80, 90].map((x) => <i key={x} style={{ left: `${x}%` }} />)}
        </span>
        <span />
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
                  className={`qcv-be-row${eyeFaded(r, focus) ? " qcv-be-row--fade" : ""}${r.group === "watch" ? " qcv-be-row--watch" : ""}${r.due.kind === "past" ? " qcv-be-row--late" : ""}`}
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
                  {/**
                    * §5 — THE DATE OVER ITS DISTANCE. Two facts, because either alone leaves the
                    * reader doing arithmetic: "10d over" does not say which day, and "9 Sep" does
                    * not say whether it has gone. `data-due` is what anything else classifies on —
                    * the wording is for a reader, never for a probe.
                    */}
                  <span className={`qcv-be-due${r.due.urgent ? " qcv-be-due--late" : ""}`} data-qcv="be-due" data-due={r.due.kind}>
                    <b data-qcv="be-due-date">{r.due.date}</b>
                    <u data-qcv="be-due-dist">{r.due.distance}</u>
                  </span>
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
