/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Analytics v26 §H — day one (no queries): one card, "How it works", three numbered steps over fixed example tiles,
 * the data-only line and a filled "Log your first query".
 *
 * ⚠️ THE EXAMPLE TILES ARE FIXED CONTENT: never counted, never written, never a query. Their marks are key marks
 *    (`A26KeyMark`: aria-hidden, no tip, no press), so no probe that counts query marks can find them.
 * ⚠️ THE STEPS ARE ALSO THE PAGE GUIDE'S (`A26_GUIDE_STEPS`), so "How it works" says the same thing in both places.
 */
import React from "react";
import { QueryStatus } from "../../types";
import { A26KeyMark } from "./A26Bits";

export const A26_GUIDE_STEPS = [
  { title: "Log your queries and record each reply", body: ["Add the queries you send. When an agent answers, record it in a few seconds."] },
  { title: "See what happened to every query", body: ["Who asked to read more, who passed, who hasn't replied, and how long each took."] },
  { title: "See what your own numbers show", body: ["After five replies, the page shows which rounds, agents and nudges got results, with a link to act on each."] },
] as const;

const Q = QueryStatus;
const EXAMPLES: React.ReactNode[] = [
  <div className="a26-ex" key="0" data-a26="example">{[Q.QUERIED, Q.QUERIED, Q.PARTIAL_REQUESTED, Q.REJECTED, Q.QUERIED].map((s, i) => <A26KeyMark key={i} status={s} />)}</div>,
  <div className="a26-ex" key="1" data-a26="example">{[Q.QUERIED, Q.PARTIAL_REQUESTED, Q.FULL_REQUESTED, Q.OFFER].map((s, i) => <A26KeyMark key={i} status={s} />)}</div>,
  <div className="a26-ex" key="2" data-a26="example" aria-hidden="true">
    <div className="a26-cols"><div className="a26-you"><i style={{ height: 70 }} /></div><div className="a26-most"><i style={{ height: 24 }} /></div></div>
  </div>,
];

export const A26DayOne: React.FC<{ onLog: () => void }> = ({ onLog }) => (
  <section className="a26-rc a26-first" data-a26="day-one">
    <div className="a26-rc-in"><div className="a26-first-in">
      <h2>How it works</h2>
      <ol className="a26-steps">
        {A26_GUIDE_STEPS.map((s, i) => (
          <li key={s.title} data-a26="step-card">{EXAMPLES[i]}<b>{s.title}</b>{s.body[0]}</li>
        ))}
      </ol>
      <p>Every figure comes from what you log. Nothing is estimated.</p>
      <button type="button" className="a26-btn" data-a26="day-one-log" onClick={onLog}>Log your first query</button>
    </div></div>
  </section>
);
