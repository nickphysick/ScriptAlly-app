/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QcBirdsEye — the rail's view (v65.3 §3): head, focus toggle, rows, legend.
 *
 * ⚠️ THE DUE LINE IS GONE, AND WITH IT THE SHIFTED BARS (v65.3 decision 1). Every row used to be
 * offset so its own expected date sat on one shared vertical line — which made the gap between a
 * bar's end and the line mean the same thing on every row, and cost a second coordinate system
 * inside a 340px rail. A progress bar states the same fact without one: `eyeProgress` answers how
 * far through the window a query is, and this file places what it is given and derives nothing.
 */
import React, { useState } from "react";
import { StatusDot } from "../../StatusDot";
import { EYE_FOCUS, eyeFaded, eyeGroups, type EyeFocus, type EyeGroup, type EyeRow } from "../../../lib/qcBirdsEye";
import { attentionCounts } from "../../../lib/qcCalView";
import { BE_HAWK_HEAD } from "./qcArt";
import type { QcRow } from "../../../lib/qcSummary";
import "./qcvBirdsEye.css";

/**
 * §3.2 — THE PROGRESS BAR. Three parts in one track: the white ALLOWANCE (the window the agency
 * asked for), the coloured FILL (how much of it has gone) and, past the date, the ink OVERRUN with
 * a white NOTCH at the join marking the date itself.
 *
 * ⚠️ IT PLACES WHAT IT IS GIVEN AND DERIVES NOTHING. Every share comes from `eyeProgress`, so the
 * expanded view and this rail cannot disagree about how far through a window a query is — and the
 * arithmetic is checkable without a browser.
 *
 * ⚠️ AND THE FILL IS THE STATUS'S OWN COLOUR, NEVER A DEEPENED ONE (decision 2). `--state-queried`
 * and its four siblings are the app's one status palette; `--state-*-deep` is a different family
 * for a different job, and a rail that quietly used it would be the only surface in the app where
 * "the colour of a Partial Sent" meant something else.
 */
const Bar: React.FC<{ r: EyeRow }> = ({ r }) => {
  const p = r.prog;
  const pc = (n: number) => `${Math.max(0, Math.min(100, n * 100))}%`;
  return (
    <span className="qcv-be-pg" data-qcv="be-prog" data-dated={p.dated ? "yes" : "no"}>
      <i
        className={`qcv-be-track${p.dated ? "" : " qcv-be-track--none"}${r.court === "you" ? " qcv-be-track--you" : ""}`}
        data-qcv="be-track"
        data-status={r.row.status}
        style={{ ["--qcv-state" as string]: `var(--state-${r.row.state})` }}
      >
        {p.dated && (
          <>
            <i className="qcv-be-allow" data-qcv="be-allow" style={{ width: pc(p.allowance) }} />
            <b className="qcv-be-fill" data-qcv="be-fill" style={{ width: pc(p.fill) }} />
            {p.over > 0 && (
              <>
                <u className="qcv-be-over" data-qcv="be-over" style={{ left: pc(p.allowance), width: pc(p.over) }} />
                {/* the date itself, standing proud of the track so it reads as a mark rather than a seam */}
                <s className="qcv-be-notch" data-qcv="be-notch" style={{ left: pc(p.allowance) }} />
              </>
            )}
          </>
        )}
      </i>
    </span>
  );
};

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

      <div className="qcv-be-scroll" data-qcv="be-scroll">
        {groups.length === 0 ? (
          <p className="qcv-be-none">{loading ? "" : "Nothing is out with an agent."}</p>
        ) : groups.map((g) => (
          <section key={g.key} className={`qcv-be-grp qcv-be-grp--${g.key}`} data-qcv="be-group" data-group={g.key}>
            <h3 className="qcv-be-gh" data-qcv="be-heading">{g.label}<span data-qcv="be-gcount">{g.count}</span></h3>
            <div className="qcv-be-rows" data-qcv="be-rows">
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
