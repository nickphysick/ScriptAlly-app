/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE BOOK PROFILE — Journey ════════════════════════════════════════════════════════════════
 *
 * Reference: `design-refs/manuscripts-book-profile.html`, `#pane-journey`.
 *
 * ⚠️ THE TWO CARDS ANSWER DIFFERENT QUESTIONS AND SAY SO IN THEIR OWN WORDS. The track is where
 * every query stands TODAY; the table is the furthest each one ever reached, open or closed. Both
 * count every query exactly once, and both sums are locked as properties in
 * `manuscriptJourney.test.ts` rather than as fixtures.
 *
 * ⚠️ THE STATION GLYPHS ARE `StatusDot`, IMPORTED — never redrawn. The ref carries inline SVG
 * stand-ins so it renders as a standalone document; they are deleted. That component is the single
 * home for how a status looks, and a legend or a track that draws its own copies goes on being
 * right about a dot that has since changed.
 *
 * ⚠️ CLOSED IS OFF THE RAIL, BEHIND A HAIRLINE, IN GREY. It is not a further station — a closed
 * query is elsewhere rather than further along — and grey is the whole treatment. No red on this
 * page: a colour that encodes a verdict is the app appraising.
 */
import React from "react";
import { StatusDot } from "../StatusDot";
import { SectionHeader } from "../containers/SectionHeader";
import { CappedCard } from "../containers/CappedCard";
import { StandingTrack, FurthestRow } from "../../lib/manuscriptJourney";
import { HoldingRow } from "../../lib/bookVersions";
import { QueryStatus } from "../../types";
import "./bookProfile.css";

/** The station labels — the enum's own words, shortened only where the enum is the long form. */
const STATION_LABEL: Partial<Record<QueryStatus, string>> = {
  [QueryStatus.PARTIAL_REQUESTED]: "Partial requested",
  [QueryStatus.PARTIAL_SENT]: "Partial sent",
  [QueryStatus.FULL_REQUESTED]: "Full requested",
  [QueryStatus.FULL_SENT]: "Full sent",
  [QueryStatus.REVISE_RESUBMIT]: "R&R",
};

export interface JourneyPaneProps {
  track: StandingTrack;
  furthest: FurthestRow[];
  /** The furthest rung anything reached, or null when nothing has. */
  furthestLabel: string | null;
  holders: HoldingRow[];
  queriesSent: number;
  journeyMeta: string;
}

export const JourneyPane: React.FC<JourneyPaneProps> = ({
  track, furthest, furthestLabel, holders, queriesSent, journeyMeta,
}) => {
  /* The rail fills to the furthest OCCUPIED station. Null → no fill drawn at all, rather than a
     zero-width one, which reads as a rendering fault rather than as an empty submission. */
  const fillPct = track.furthestIndex === null
    ? null
    : (track.furthestIndex / (track.stations.length - 1)) * 100;

  return (
    <>
      <div className="msp-blk">
        <SectionHeader title="Where the queries stand" meta={journeyMeta} />
        <CappedCard tint="sage" label="Current standing" right="Today">
          <div className="msp-track">
            <div className="msp-stations">
              <div className="msp-rail" aria-hidden="true" />
              {fillPct !== null && (
                <div className="msp-railfill" style={{ width: `${fillPct}%` }} aria-hidden="true" />
              )}
              {track.stations.map((s) => (
                <div key={s.status} className="msp-station">
                  {/* Decorative: the label directly beneath already names the status. */}
                  <StatusDot status={s.status} overrideSize={26} decorative />
                  <span className="msp-stationn">{s.count}</span>
                  <span className="msp-stationl">{STATION_LABEL[s.status] ?? s.status}</span>
                </div>
              ))}
            </div>

            <div className="msp-closedblock">
              <span className="msp-closeddot" aria-hidden="true" />
              <span className="msp-stationn">{track.closed}</span>
              <span className="msp-stationl">Closed</span>
            </div>
          </div>

          {/* ⚠️ STATED ONLY WHEN IT IS NOT NOUGHT. A permanent "0 unrecognised" row teaches
              nothing; a row that appears the day a status cannot be placed says exactly what
              happened, and stops the total disagreeing with its own stations in silence. */}
          {track.unrecognised > 0 && (
            <p className="msp-footnote">
              <b>{track.unrecognised}</b>{" "}
              {track.unrecognised === 1 ? "query carries a status" : "queries carry a status"} this app
              does not recognise, so {track.unrecognised === 1 ? "it is" : "they are"} counted here and
              placed at no station.
            </p>
          )}

          <div className="msp-journeyfoot">
            <span>Where each query stands today. A query appears once, at its current point.</span>
            {furthestLabel && (
              <span className="msp-reached">Furthest reached so far: <b>{furthestLabel}</b></span>
            )}
          </div>
        </CappedCard>
      </div>

      <div className="msp-blk">
        <div className="msp-duo">
          <CappedCard tint="pink" label="Out with agents now" right={String(holders.length)}>
            {holders.length === 0 ? (
              <p className="msp-empty">Nothing is with an agent right now.</p>
            ) : (
              <table className="msp-table">
                <thead><tr><th>Agent</th><th>Holds</th><th>Sent</th></tr></thead>
                <tbody>
                  {holders.map((h) => (
                    <tr key={h.queryId}>
                      <td>
                        {h.agent}
                        {/* ⚠️ THE ASK AND THE SEND ARE DIFFERENT EVENTS, so an ask with no recorded
                            date states the ask alone rather than borrowing the send's day. */}
                        <span className="msp-sub">{h.askedFor}{h.askedOn ? ` ${h.askedOn}` : ""}</span>
                      </td>
                      <td>{h.holds}</td>
                      <td className={`msp-num${h.sentDay ? "" : " soft"}`}>{h.sentDay ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CappedCard>

          <CappedCard tint="tan" label="How far queries reached" right={`All ${queriesSent}`}>
            <table className="msp-table">
              <thead><tr><th>Furthest point</th><th>Queries</th></tr></thead>
              <tbody>
                {/* ⚠️ THE LADDER'S ORDER, NEVER SORTED BY COUNT — sorting rows by outcome is a
                    ranking, and every rung is listed even at nought because a row that vanishes
                    states nothing at all. */}
                {furthest.map((r) => (
                  <tr key={r.key}>
                    <td className={r.count === 0 ? "soft" : undefined}>{r.label}</td>
                    <td className={`msp-num${r.count === 0 ? " soft" : ""}`}>{r.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="msp-footnote">
              The furthest point each query ever reached, open or closed. A query appears once here too.
            </p>
          </CappedCard>
        </div>
      </div>
    </>
  );
};
