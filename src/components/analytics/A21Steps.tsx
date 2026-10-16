/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Analytics v21 §E — HOW LONG EACH STEP TAKES (design-refs/analytics-v21/analytics-v21.html, `.jr` and `.en`):
 * five StatusDot nodes on one line, with the median days of each gap between them; then "How long until a query
 * ended" in three cells.
 *
 * ⚠️ THE NODES ARE `StatusDot` (the app's own component), never a recreation of its glyphs.
 * ⚠️ A GAP'S COLOUR IS WHOSE TURN IT IS: navy while the agent holds it, rust while you do (asked → you sent).
 *    Under three queries the line is dashed; with none it still shows, carrying "–" and "not yet".
 * ⚠️ EVERY FIGURE IS `stepGaps` / `endings` (lib/analyticsV21). v17's readings under this section are gone.
 */
import React from "react";
import { QueryStatus } from "../../types";
import { StatusDot } from "../StatusDot";
import { STEP_THIN, THIN_SAMPLE, type Endings, type StepGap } from "../../lib/analyticsV21";

const NODES: { status: QueryStatus; name: string }[] = [
  { status: QueryStatus.QUERIED, name: "Queried" },
  { status: QueryStatus.PARTIAL_REQUESTED, name: "Asked for more" },
  { status: QueryStatus.PARTIAL_SENT, name: "You sent it" },
  { status: QueryStatus.FULL_REQUESTED, name: "Full requested" },
  { status: QueryStatus.OFFER, name: "Offer" },
];
const days = (n: number) => `${n === 1 ? "day" : "days"}`;
const weeks = (n: number) => `${n} ${n === 1 ? "week" : "weeks"}`;

const Gap: React.FC<{ g: StepGap }> = ({ g }) => {
  const thin = g.n > 0 && g.n < STEP_THIN;
  return (
    <div className={`a21-jrgap${g.turn === "you" ? " you" : ""}${thin ? " thin" : ""}${g.n === 0 ? " none" : ""}`}
      data-a21="jr-gap" data-key={g.key} data-turn={g.turn} data-n={g.n}
      style={{ flexGrow: g.median === null ? 10 : Math.max(4, g.median) }}>
      <span className="a21-jrbar" data-a21="jr-bar" aria-hidden="true" />
      <div className="a21-jrv" data-a21="jr-v">{g.median === null ? <b>–</b> : <><b>{g.median}</b> {days(g.median)}</>}</div>
      <div className="a21-jrwho">{g.n === 0 ? "not yet" : g.turn === "you" ? "waiting on you" : "waiting on the agent"}</div>
      {g.n > 0 ? (
        <div className="a21-jrrng" data-a21="jr-range">
          {g.n === 1 ? "one query so far" : g.min === g.max ? `all at ${g.min} ${days(g.min as number)}` : `from ${g.min} to ${g.max} ${days(g.max as number)}`}<br />
          {g.n} {g.n === 1 ? g.noun[0] : g.noun[1]}
        </div>
      ) : null}
    </div>
  );
};

/** A cell of "How long until a query ended"; under five of a kind it names its population (thin-sample rule). */
const End: React.FC<{ k: string; value: string; line: string; small: string }> = ({ k, value, line, small }) => (
  <div data-a21="end" data-k={k}><b>{value}</b><span>{line}</span><small>{small}</small></div>
);

export const A21Steps: React.FC<{ steps: StepGap[]; endings: Endings }> = ({ steps, endings: e }) => {
  const range = (lo: number | null, hi: number | null) => (lo !== null && hi !== null && lo !== hi ? ` · from ${lo} to ${hi} weeks` : "");
  const cells: React.ReactNode[] = [];
  if (e.pass.n > 0) cells.push(<End key="pass" k="pass" value={weeks(e.pass.median as number)} line={e.pass.n < THIN_SAMPLE ? `before a pass came back, from ${e.pass.n === 1 ? "one pass" : `${e.pass.n} passes`}` : "usually, before a pass came back"}
    small={`${e.pass.n} ${e.pass.n === 1 ? "pass" : "passes"}${range(e.pass.min, e.pass.max)}`} />);
  if (e.silent.n > 0) cells.push(<End key="silent" k="silent" value={weeks(e.silent.median as number)} line="before you closed a query that had no reply"
    small={`${e.silent.n} closed${range(e.silent.min, e.silent.max)}`} />);
  if (e.offer.n > 0) cells.push(<End key="offer" k="offer" value={weeks(e.offer.median as number)} line="from the query to the offer"
    small={`${e.offer.n} ${e.offer.n === 1 ? "offer" : "offers"}${e.offer.agency ? ` · ${e.offer.agency}` : range(e.offer.min, e.offer.max)}`} />);
  return (
    <div className="a21-jr" data-a21="jr">
      <div className="a21-jrline" data-a21="jr-line">
        {NODES.map((n, i) => (
          <React.Fragment key={n.name}>
            <div className="a21-jrnode" data-a21="jr-node"><StatusDot status={n.status} overrideSize={34} /><b>{n.name}</b></div>
            {i < steps.length ? <Gap g={steps[i]} /> : null}
          </React.Fragment>
        ))}
      </div>
      <div className="a21-en" data-a21="endings">
        <h4>How long until a query ended</h4>
        {cells.length ? <div className="a21-enrow">{cells}</div> : <p className="a17-none">No query has ended yet.</p>}
      </div>
    </div>
  );
};
