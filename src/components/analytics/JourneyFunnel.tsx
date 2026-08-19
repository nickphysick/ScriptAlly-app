/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The journey funnel — four rungs, three transitions, and a strip explaining what each one is
 * conventionally read as.
 *
 * ⚠️ THE DOTS ARE `StatusDot`, AT 56px THROUGH `overrideSize`. It is the app's canonical status
 * glyph and it is locked; drawing a ring-and-tick here to match a mockup would put a second,
 * unversioned status language on the one page whose whole subject is status.
 *
 * ⚠️ THE TRANSITIONS ARE GUARDED, ALL THREE. `safePct` renders a percentage only once the
 * denominator can carry one — below that the label is the fraction itself. A funnel is exactly
 * where an ungurded percentage does most damage: "50% went on" off two queries reads as a rate.
 *
 * ⚠️ AND "READING THE NUMBERS" NEVER LOOKS AT THE WRITER'S FIGURES. It is reference material about
 * what querying convention reads each transition as — the same sentences on an account with two
 * queries and one with two hundred. The moment a line here starts describing THIS writer's rate it
 * has become an appraisal, which this page does not do.
 */
import React from "react";
import { StatusDot } from "../StatusDot";
import { IllustrationSlot } from "./IllustrationSlot";
import {
  AnalyticsRow,
  FUNNEL_REFERENCE_NOTE,
  funnelStages,
  funnelTransitions,
  READING_THE_NUMBERS,
  safePct,
} from "../../lib/analytics";

export const JourneyFunnel: React.FC<{ rows: AnalyticsRow[] }> = ({ rows }) => {
  const stages = funnelStages(rows);
  const transitions = funnelTransitions(stages);

  return (
    <>
      <div className="an-funnelrow">
        <div className="an-funnel">
          {stages.map((s, i) => (
            <React.Fragment key={s.key}>
              <div className="an-fstage">
                <div className="an-fdot">
                  {/* decorative: the stage's own name is the next line down */}
                  <StatusDot status={s.dotStatus} overrideSize={56} decorative />
                </div>
                <div className="an-fnum">{s.count}</div>
                <div className="an-fname">{s.name}</div>
                <div className="an-fdesc">{s.description}</div>
              </div>
              {i < transitions.length ? (
                <div className="an-fconv" aria-hidden="true">
                  {/* the arrow fades along the journey — fewer queries reach each rung */}
                  <svg className="an-arrow" viewBox="0 0 112 18" fill="none">
                    <path d="M6 9 H96" stroke="#7c3a2a" strokeWidth={1} opacity={0.55 - i * 0.12} strokeDasharray="1 4" strokeLinecap="round" />
                    <path d="M96 9 l-7 -4 M96 9 l-7 4" stroke="#7c3a2a" strokeWidth={1} opacity={0.55 - i * 0.12} strokeLinecap="round" />
                  </svg>
                  <div className="an-fpct">{transitions[i].label}</div>
                  <div className="an-fpl">went on</div>
                </div>
              ) : null}
            </React.Fragment>
          ))}
        </div>
        {/* ILLUSTRATION SLOT · journey hero · 168×150 */}
        <IllustrationSlot art="journey" size="hero" />
      </div>

      <div className="an-readnum">
        {READING_THE_NUMBERS.map((r) => (
          <div className="an-rn" key={r.label}>
            <div className="an-rk">
              <StatusDot status={r.dotStatus} overrideSize={13} decorative />
              {r.label}
            </div>
            <div className="an-rt">{r.text}</div>
          </div>
        ))}
      </div>

      <div className="an-ffoot">
        <em>For reference —</em>
        <span>{FUNNEL_REFERENCE_NOTE}</span>
      </div>
    </>
  );
};

/** The band note: how many submissions drew a request. Guarded like every other rate here. */
export const funnelNote = (rows: AnalyticsRow[]): string => {
  const stages = funnelStages(rows);
  return `${stages[1].count} of ${stages[0].count} submissions drew a request for more material`;
};

/** Exported for the share card (Phase 8), so the two state the same figure from one place. */
export const funnelHeadline = (rows: AnalyticsRow[]): string => {
  const stages = funnelStages(rows);
  return `${stages[0].count} ${stages[0].count === 1 ? "query" : "queries"} · ${safePct(stages[1].count, stages[0].count)} drew a request`;
};
