/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD FIRST VISIT v2 — GETTING STARTED, AS A SHEET UNDER THE MANUSCRIPT CARD (Part A; ref
 * design-refs/dashboard-first-visit-v2/, screens 01, 11).
 *
 * It hangs in the goal sheet's slot, tucked under the card: "Getting started", "{n} of 5 done" (and " · Hide" once the
 * first query exists), a five-segment bar, and the rows. The goal sheet takes the slot back once the list is hidden or
 * closed.
 *
 * ⚠️ DONE-STATES ARE DERIVED (`gettingStartedRows`), never stored: a row ticks because the record exists.
 * ⚠️ EVERY LINK OPENS THE FLOW THAT DOES THE THING; nothing here writes except Hide, which is a preference.
 */
import React from "react";
import { GettingStartedList, gsDone, type GsRow } from "../fv1/GettingStarted";
import type { GsLink, StartPath } from "../../../lib/dashFirstVisit";

export const GS_SHEET_TITLE = "Getting started";
export const gsDoneText = (done: number, total: number): string => `${done} of ${total} done`;

export const GsSheet: React.FC<{
  loading: boolean;
  rows: readonly GsRow[];
  path: StartPath | null;
  onGo: (go: GsLink) => void;
  /** " · Hide" — offered once the first query exists */
  onHide?: () => void;
  /** Part H: drawn in the rows' place once every row is done */
  finish?: React.ReactNode;
}> = ({ loading, rows, path, onGo, onHide, finish }) => {
  const done = gsDone(rows);
  const total = rows.length;
  return (
    <section className="df1-goal fv2-gs" data-fv2="gs" data-done={done} data-total={total} data-loading={loading ? "1" : "0"} aria-label={GS_SHEET_TITLE}>
      {finish ?? (
        <>
          <div className="fv2-gsh">
            <h2 className="fv2-gst" data-fv2="gs-title">{GS_SHEET_TITLE}</h2>
            <span className="fv2-gsn" data-fv2="gs-count">
              {loading ? " " : gsDoneText(done, total)}
              {onHide && <>{" · "}<button type="button" className="fv2-hide" data-fv2="gs-hide" onClick={onHide}>Hide</button></>}
            </span>
          </div>
          <div className="fv2-gsbar" role="img" aria-label={gsDoneText(done, total)} data-fv2="gs-bar">
            {rows.map((r) => <i key={r.key} className={r.done ? "is-on" : undefined} />)}
          </div>
          {!loading && <GettingStartedList rows={rows} path={path} onGo={onGo} />}
        </>
      )}
    </section>
  );
};
