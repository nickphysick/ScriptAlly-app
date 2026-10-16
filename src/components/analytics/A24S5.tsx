/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Analytics v24 S5 — WHO ARE YOU STILL WAITING ON? Two blocks from `stillWaiting`: the queries waiting for a first
 * reply (THEY SAID over YOU HAVE WAITED, the waited bar sand inside the time and rust past it; one bar and "No time
 * given" where the agency states none), then the agents reading more of the book (one bar, SINCE THEY ASKED, in the
 * query's own status fill). One scale for the section: the longest wait or stated time, plus two weeks.
 *
 * ⚠️ NO "THEY SAID" BAR ON A READING ROW. An agency's stated reply time is for the QUERY; nothing states a time for
 *    reading requested material, so the bar counts from the day they asked and is set against nothing. (The v23 mock
 *    measured these rows from the query date against the query window; that was wrong.)
 */
import React from "react";
import { STATE_FILL } from "../../lib/analyticsModel";
import { dShort, diffWords, span, type ReadRow, type V24, type WaitRow } from "../../lib/analyticsV24";
import { Block, type Reading } from "./A24Frame";
import { PairList, PairRow, RUST } from "./A24Pairs";
import { SAID } from "./A24S4";

export function s5Scale(v: V24): number {
  const w = v.waiting;
  const all = [...w.waiting.map((r) => Math.max(r.waitedDays, (r.saidWeeks ?? 0) * 7)), ...w.reading.map((r) => r.sinceDays ?? 0)];
  return Math.max(1, ...all) + 14;
}

const Wait: React.FC<{ r: WaitRow; scale: number }> = ({ r, scale }) => {
  const past = r.pastDays !== null && r.pastDays > 0;
  const waited = { kind: "waited" as const, label: "You have waited", days: r.waitedDays, fill: past ? RUST : "var(--state-queried)" };
  if (r.saidWeeks === null) {
    return <PairRow id={r.id} probe="wait-row" state="none" who={r.agency} sub={`Queried · sent ${dShort(r.sentMs)}`} scale={scale} bars={[waited]} verdict={{ big: "No time given" }} />;
  }
  const left = -(r.pastDays as number);
  return (
    <PairRow id={r.id} probe="wait-row" state={past ? "past" : "inside"} who={r.agency} sub={`Queried · sent ${dShort(r.sentMs)}`} scale={scale}
      bars={[{ kind: "said", label: "They said", days: r.saidWeeks * 7, fill: SAID }, waited]}
      verdict={past ? { big: diffWords(r.pastDays as number), small: "past the time they said", late: true }
        : Math.round(left) === 0 ? { big: "Due now", small: "on their time" }
        : { big: diffWords(left), small: "still to go on their time" }} />
  );
};

const Read: React.FC<{ r: ReadRow; scale: number }> = ({ r, scale }) => (
  <PairRow id={r.id} probe="read-row" state={r.yourMove ? "your-move" : "sent"} who={r.agency}
    sub={`Asked for ${r.asked} ${r.askedMs === null ? "on an unknown date" : `on ${dShort(r.askedMs)}`}`} scale={scale}
    bars={[{ kind: "asked", label: "Since they asked", days: r.sinceDays ?? 0, fill: STATE_FILL[r.bucket] }]}
    verdict={r.yourMove ? { big: "Your move", small: "send it" } : { big: "Sent", small: "with the agent" }} />
);

export function s5Readings(v: V24): Reading[] {
  const w = v.waiting;
  return [
    w.waiting.length ? { fig: `${w.pastCount} of ${w.waiting.length}`, line: "waiting queries are past the time the agent gave" } : { fig: "None", line: "of your queries is waiting for a first reply" },
    w.longest ? { fig: span(w.longest.waitedDays), line: `the longest wait so far, ${w.longest.agency}` } : { fig: "None", line: "waiting" },
    { fig: w.yourMove === 0 ? "None" : String(w.yourMove), line: w.yourMove === 1 ? "is your move: material to send" : "are your move: material to send" },
  ];
}

export const S5Body: React.FC<{ v: V24 }> = ({ v }) => {
  const w = v.waiting;
  const scale = s5Scale(v);
  if (!w.waiting.length && !w.reading.length) return <Block probe="wait-none"><p className="a24-none">Nobody is waiting on a reply or reading more of the book right now.</p></Block>;
  return (
    <>
      {w.waiting.length ? (
        <Block title="Waiting for a first reply" aside={`${w.waiting.length}, longest wait first`} probe="waiting">
          <PairList probe="wait-list">{w.waiting.map((r) => <Wait key={r.id} r={r} scale={scale} />)}</PairList>
        </Block>
      ) : null}
      {w.reading.length ? (
        <Block title="Reading more of the book" aside={`${w.reading.length}, counted from the day they asked`} probe="reading-more">
          <PairList probe="read-list">{w.reading.map((r) => <Read key={r.id} r={r} scale={scale} />)}</PairList>
        </Block>
      ) : null}
    </>
  );
};
