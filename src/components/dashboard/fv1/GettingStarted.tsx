/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD FIRST VISIT v1 — GETTING STARTED, AS A PAGE OF THE TASK CARD (Part A4; ref pane 01, 05).
 *
 * The body of the task card while its page is "Getting started": a checklist of `gettingStartedRows` in the
 * order the set-up answer chose. A done row is a navy tick and muted words; the FIRST undone row is lit, with
 * its note and an inline link to do it; the rest are an empty circle and plain words.
 *
 * ⚠️ DONE-STATES ARE DERIVED (`gettingStartedRows`), never stored: a row ticks because the record exists.
 * ⚠️ EVERY LINK OPENS THE FLOW THAT DOES THE THING; nothing here writes.
 */
import React from "react";
import type { GettingStartedKey } from "../../../lib/dashEmpty";
import { gsCopy, type GsLink, type StartPath } from "../../../lib/dashFirstVisit";

export interface GsRow { key: GettingStartedKey; done: boolean }

export const gsDone = (rows: readonly GsRow[]): number => rows.filter((r) => r.done).length;

export const GettingStartedList: React.FC<{ rows: readonly GsRow[]; path: StartPath; onGo: (go: GsLink) => void }> = ({ rows, path, onGo }) => {
  const cur = rows.findIndex((r) => !r.done);
  return (
    <ul className="fv1-gs" data-fv1="gs" data-path={path}>
      {rows.map((r, i) => {
        const c = gsCopy(r.key, path);
        const state = r.done ? "done" : i === cur ? "current" : "todo";
        return (
          <li key={r.key} className={`fv1-gsr is-${state}`} data-fv1="gs-row" data-key={r.key} data-state={state}>
            <i aria-hidden="true" />
            {state === "current" ? (
              <div className="fv1-gsc">
                <b>{c.deed}</b>
                <span><span className="fv1-gsnote">{c.note}</span> <button type="button" className="fv1-gsl" data-fv1="gs-link" data-go={c.go} onClick={() => onGo(c.go)}>{c.link} →</button></span>
              </div>
            ) : (
              <span className="fv1-gsd">{c.deed}{r.done && <span className="fv1-sr"> (done)</span>}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
};
