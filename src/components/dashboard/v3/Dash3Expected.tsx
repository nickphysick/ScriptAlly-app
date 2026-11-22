/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v3 · Expected back (Phase 4b; ref design-refs/dashboard-v3.html).
 *
 * The heading sentence ("{n} replies expected this week." / "Nothing due back this week."), up to three rows due
 * soonest — agent, agency, a bar from the last step to the date, "by {day date}" — then "{n} are past their date" with
 * up to two rows, oldest first, "since {date}" and no bar; then "{n} more are within their reply window." and the Query
 * Centre. A row opens that query's slide-out card.
 *
 * ⚠️ THE DATES ARE THE QUERY CENTRE'S CLOCK (`expectedBack` over `buildQcRows` → `expectedFor`) and nothing else.
 * ⚠️ DAY ONE draws a labelled example (no queries exist to read), faded, with the sentence saying where the date comes from.
 */
import React from "react";
import { expectedHeading, moreLine, pastHeading, type ExpectedBack, type ExpectedRow } from "../../../lib/dash3";
import { Frame } from "../v2/Frame";
import { STAGE_COLOURS } from "../../../lib/stageColours";

export const EXPECTED_TITLE = "Expected back";
export const EXAMPLE_TAG = "Example";
export const EXAMPLE_HEAD = "When to expect each reply.";
export const EXAMPLE_LINE = "A query you log takes its date from the agent's stated reply time, so you know when to chase and when to wait.";
const EXAMPLE_ROWS: ExpectedRow[] = [
  { id: "eg-1", agent: "Rosalind Achebe", agency: "Achebe & Lowe", ms: 0, progress: 0.62, when: "by Wed 18 Nov" },
  { id: "eg-2", agent: "Imogen Hartley", agency: "Hartley Literary", ms: 0, progress: 0.35, when: "by Fri 4 Dec" },
];

const Row: React.FC<{ r: ExpectedRow; onOpen?: (id: string) => void; past?: boolean }> = ({ r, onOpen, past = false }) => {
  const inner = (
    <>
      <span className="d3-exw"><b>{r.agent}</b><i>{r.agency}</i></span>
      {past ? <span aria-hidden="true" /> : <span className="d3-pb" aria-hidden="true"><u style={{ width: `${Math.round((r.progress ?? 0) * 100)}%` }} /></span>}
      <span className={`d3-when${past ? " is-past" : ""}`}>{r.when}</span>
    </>
  );
  return onOpen
    ? <li><button type="button" className="d3-ex" data-d3={past ? "ex-past" : "ex-row"} data-id={r.id} onClick={() => onOpen(r.id)}>{inner}</button></li>
    : <li><div className="d3-ex" data-d3="ex-example">{inner}</div></li>;
};

export const Dash3Expected: React.FC<{
  loading: boolean;
  /** null on day one: the example is drawn */
  model: ExpectedBack | null;
  onOpen: (queryId: string) => void;
  onAll: () => void;
}> = ({ loading, model, onOpen, onAll }) => (
  /* Phase 3: Expected back is about queries out with agents — the Queried band */
  <Frame tone="paper" bandStyle={{ background: STAGE_COLOURS.queried.band }} title={EXPECTED_TITLE} label={EXPECTED_TITLE} probe="expected" loading={loading} className="d3-expected">
    <div className="d2-body d3-exbody" data-d3="expected" data-week={model?.thisWeek} data-past={model?.pastCount} data-more={model?.more}>
      {!model ? (
        <>
          <p className="d3-exsay">{EXAMPLE_HEAD}</p>
          <span className="d3-egtag">{EXAMPLE_TAG}</span>
          <ul className="d3-exl is-example" aria-hidden="true">{EXAMPLE_ROWS.map((r) => <Row key={r.id} r={r} />)}</ul>
          <p className="d3-exf">{EXAMPLE_LINE}</p>
        </>
      ) : (
        <>
          <p className="d3-exsay" data-d3="ex-say">{expectedHeading(model)}</p>
          {model.soon.length > 0 && <ul className="d3-exl">{model.soon.map((r) => <Row key={r.id} r={r} onOpen={onOpen} />)}</ul>}
          {model.pastCount > 0 && (
            <>
              <p className="d3-exh" data-d3="ex-past-head">{pastHeading(model.pastCount)}</p>
              <ul className="d3-exl">{model.past.map((r) => <Row key={r.id} r={r} onOpen={onOpen} past />)}</ul>
            </>
          )}
          <p className="d3-exf" data-d3="ex-more">
            {model.more > 0 ? <>{moreLine(model.more)} </> : null}
            <button type="button" className="d2-link" data-d3="ex-qc" onClick={onAll}>See all in the Query Centre →</button>
          </p>
        </>
      )}
    </div>
  </Frame>
);
