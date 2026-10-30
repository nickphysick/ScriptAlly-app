/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * HOME BEFORE THE FIRST QUERY (Phone app v2, Part 8A; ref design-refs/phone-app-v2/src/restv.js `homeEmpty` at FRH C).
 * The real Home, with nothing invented:
 *  - the band's hero is drawn faded behind "Let’s start tracking your campaign" and the first-query button;
 *  - "Where they stand" is tagged Example and says what it will show;
 *  - "Getting started" is the dashboard's own steps (`gettingStartedRows`, done from whether each record exists), in Up
 *    next's card shape; an outstanding step opens where it is done (`startingPlan`'s own action for it).
 * ⚠️ NEVER the words "Your campaign chart starts here" (Nick's ruling).
 */
import React from "react";
import type { GettingStartedRow } from "../../../lib/dashEmpty";
import type { ListAction, ListItem } from "../../../lib/dashList";
import { PI } from "../../phone/phoneIcons";

export const FIRST_RUN_HEADLINE = "Let’s start tracking your campaign";

/** the band: the real hero, faded and inert, with the first-query call over it */
export const HeroFirstRun: React.FC<{ hero: React.ReactNode; onLog: () => void; onImport: () => void }> = ({ hero, onLog, onImport }) => (
  <div className="pa-exwrap" data-pa="first-run">
    <div className="pa-exfade" aria-hidden="true" inert>{hero}</div>
    <div className="pa-excta">
      <div className="pa-excta-t" data-pa="first-run-title">{FIRST_RUN_HEADLINE}</div>
      <button type="button" className="pa-btn pink" data-pa="first-log" onClick={onLog}>{PI.plus}Log your first query</button>
      <button type="button" className="pa-exlink" data-pa="first-import" onClick={onImport}>or import a spreadsheet</button>
    </div>
  </div>
);

/** "Where they stand", tagged Example: the split bar faded, and what it will do */
export const StandExample: React.FC = () => (
  <section className="pa-card pa-stand" data-pa="stand-example">
    <div className="pa-standhead"><h2 className="pa-standt">Where they stand</h2><span className="pa-extag">Example</span></div>
    <div className="pa-standbar pa-standbar--ex" aria-hidden="true">
      <i style={{ flex: 2, background: "var(--pa-blush)" }} /><i style={{ flex: 6, background: "var(--pa-navy)" }} /><i style={{ flex: 3, background: "#c9c2b6" }} />
    </div>
    <p className="pa-sub pa-exline">Once you log queries, this splits them into with you, with the agent and gone quiet.</p>
  </section>
);

/** "Getting started" in Up next's shape: every step, done ones ticked and struck; "Log your first query" has Start */
export const GettingStartedCard: React.FC<{ rows: readonly GettingStartedRow[]; items: readonly ListItem[]; onAct: (a: ListAction) => void }> = ({ rows, items, onAct }) => {
  const done = rows.filter((r) => r.done).length;
  const act = (key: string) => items.find((i) => i.key === `start:${key}`)?.action ?? null;
  return (
    <section className="pa-nextc" data-pa="getting-started">
      <div className="pa-nh"><h2 className="pa-nht">Getting started</h2><span className="pa-sub" data-pa="gs-count">{done} of {rows.length}</span></div>
      <div className="pa-gsl">
        {rows.map((r) => {
          const a = r.done ? null : act(r.key);
          const body = (
            <>
              <span className={`pa-gstick${r.done ? " on" : ""}`} aria-hidden="true">{r.done ? PI.check : null}</span>
              <span className="pa-gslt"><b>{r.deed}</b></span>
            </>
          );
          return (
            <div key={r.key} className={`pa-gsrow${r.done ? " done" : ""}`} data-pa="gs-step" data-k={r.key} data-done={r.done ? "1" : "0"}>
              {a && r.key !== "query" ? <button type="button" className="pa-gsgo" onClick={() => onAct(a)} aria-label={`${r.deed}: open ${r.chip}`}>{body}</button> : <span className="pa-gsgo">{body}</span>}
              {a && r.key === "query" ? <button type="button" className="pa-btn pri sm pa-gsstart" data-pa="gs-start" onClick={() => onAct(a)}>Start</button> : null}
            </div>
          );
        })}
      </div>
    </section>
  );
};
