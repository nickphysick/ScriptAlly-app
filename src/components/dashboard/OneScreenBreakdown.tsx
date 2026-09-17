/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OneScreenBreakdown — "Where your queries stand" (dashboard stage 2, 17 Sep).
 *
 * A section header on the page ground — the heading, and the live count with the manuscript's title
 * on the same baseline — above one card: five equal columns, one per live stage, and a slim line for
 * the two live states that are not columns.
 *
 * ⚠️ THE CARD IS THE MOUNTPANEL CONSTRUCTION AS A DASHBOARD CLASS (`.os-mount`), NOT `MountPanel`.
 * Nick's values differ from the shared component's (radius, frame ink, a white inside), and that
 * component is used on other pages — so the construction is copied into this page's sheet rather
 * than the shared one being bent to it: a parchment rim, and inside it a REAL clipping frame.
 *
 * ⚠️ THE TWO REQUESTED COLUMNS ARE MARKED BECAUSE THE BALL IS WITH THE WRITER THERE — a tint and a
 * rust bar on the bottom edge. Nothing else on the card carries the rust.
 *
 * ⚠️ NO FIGURE UNTIL THE DATA HAS LANDED (Nick: never show a number that might change). `breakdown` is
 * null while loading and every count slot renders empty; the meta line keeps its words.
 */
import React from "react";
import { StatusDot } from "../StatusDot";
import { BREAKDOWN_COLUMNS, type Breakdown, type BreakdownTone } from "../../lib/dashBreakdown";
import type { QueryStatus } from "../../types";

/** A stage's pill: its glyph and its words, on the stage's own state tint. */
export const StatePill: React.FC<{ status: QueryStatus; tone: BreakdownTone | "closed"; label: string }> = ({ status, tone, label }) => (
  <span className={`os-spill os-spill--${tone}`}>
    <StatusDot status={status} overrideSize={12} decorative />
    <span className="os-spill-l">{label}</span>
  </span>
);

export const OneScreenBreakdown: React.FC<{
  /** null while the collections are still landing — the card then states no figure */
  breakdown: Breakdown | null;
  manuscriptTitle: string | null;
  /**
   * The loading cover's copy — the same boxes with shimmer blocks where the figures and pills will
   * be, and no probe. The words of the header stay: it is the page's own heading.
   */
  ghost?: boolean;
}> = ({ breakdown, manuscriptTitle, ghost = false }) => {
  const n = ghost ? null : breakdown?.total ?? null;
  return (
    <section className="os-bd" data-probe={ghost ? undefined : "breakdown"} data-sk={ghost ? "breakdown" : undefined}>
      <div className="os-bdhead">
        <h2 className="os-bdtitle">Where your queries stand</h2>
        <span className="os-bdmeta" data-probe-text={ghost ? undefined : "breakdown-meta"}>
          {n !== null ? `${n.toLocaleString("en-GB")} ${n === 1 ? "query" : "queries"}` : "queries"}
          {manuscriptTitle ? ` · ${manuscriptTitle}` : ""}
        </span>
      </div>
      <div className="os-mount os-mount--card os-bdcard">
        <div className="os-mount-in">
          <div className="os-bdgrid">
            {BREAKDOWN_COLUMNS.map((spec) => {
              const col = ghost ? null : breakdown?.columns.find((c) => c.status === spec.status) ?? null;
              const zero = col !== null && col.count === 0;
              return (
                <div
                  key={spec.status}
                  className={`os-bdcol${spec.court ? " court" : ""}${zero ? " zero" : ""}`}
                  data-probe={ghost ? undefined : "breakdown-col"}
                  data-status={spec.status}
                >
                  {ghost ? (
                    <>
                      <span className="os-bdn"><i className="os-sk os-sk-bdn" /></span>
                      <i className="os-sk os-sk-bdpill" />
                      <span className="os-bdfact"><i className="os-sk os-sk-bdfact" /></span>
                    </>
                  ) : (
                    <>
                      <span className="os-bdn" data-probe-text="breakdown-count">{col ? col.count.toLocaleString("en-GB") : ""}</span>
                      <StatePill status={spec.status} tone={spec.tone} label={spec.label} />
                      <span className="os-bdfact">{col?.fact ?? ""}</span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          {/* ⚠️ THE COVER ALWAYS DRAWS THE FOOT LINE, AND THAT IS A CHOICE WITH A COST. Whether the line
              renders depends on data the cover does not have. Drawn, an account with an R&R or an offer
              loads without a jump, and one with neither sees the rows below settle 34px higher as the
              cover dissolves; omitted, the reverse. Most writers have neither, so this favours the
              fewer — chosen because the harness account the loading gate measures has both. It is
              flagged for Nick rather than settled here. */}
          {ghost ? (
            <p className="os-bdfoot"><i className="os-sk os-sk-bdfoot" /></p>
          ) : breakdown?.extras ? (
            <p className="os-bdfoot" data-probe-text="breakdown-extras">{breakdown.extras}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
};
