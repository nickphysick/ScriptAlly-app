/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Analytics v24 S4 — DO AGENTS REPLY WHEN THEY SAY THEY WILL? Two blocks from `replyKeeping`: kept to their time
 * (quickest first) and took longer (the smallest overrun first), each row the said-against-took pair. An empty block
 * is left out. One scale for the section: 0 to the largest said or took, plus 5%.
 */
import React from "react";
import { dShort, diffWords, span, type KeepRow, type V24 } from "../../lib/analyticsV24";
import { Block, type Reading } from "./A24Frame";
import { PairList, PairRow, RUST } from "./A24Pairs";

const ANTHRACITE = "#2a3a52";
export const SAID = "#e8e3da";

export function s4Scale(v: V24): number {
  const rows = [...v.keeping.kept, ...v.keeping.longer];
  return Math.max(1, ...rows.map((r) => Math.max(r.saidWeeks * 7, r.tookDays))) * 1.05;
}

const Row: React.FC<{ r: KeepRow; scale: number; kept: boolean }> = ({ r, scale, kept }) => {
  const zero = Math.round(Math.abs(r.diffDays)) === 0;
  return (
    <PairRow id={r.id} probe="keep-row" state={kept ? "kept" : "longer"} who={r.agency}
      sub={`${r.what} · sent ${r.sentMs === null ? "on an unknown date" : dShort(r.sentMs)}`} scale={scale}
      bars={[
        { kind: "said", label: "They said", days: r.saidWeeks * 7, fill: SAID },
        { kind: "took", label: "They took", days: r.tookDays, fill: kept ? ANTHRACITE : RUST },
      ]}
      verdict={zero ? { big: "On time", small: "the time they said" }
        : { big: diffWords(r.diffDays), small: kept ? "sooner than they said" : "later than they said", late: !kept }}
    />
  );
};

export function s4Readings(v: V24): Reading[] {
  const k = v.keeping;
  const worst = k.longer[k.longer.length - 1];
  return [
    { fig: k.placed === 0 ? "None" : `${k.kept.length === 0 ? "None" : k.kept.length} of ${k.placed}`, line: k.placed === 0 ? "replies from an agency that gives a time" : "replied within the time they gave" },
    worst ? { fig: span(worst.diffDays), line: `the biggest overrun, ${worst.agency}` } : { fig: "None", line: "took longer than they said" },
    k.typical === null ? { fig: "None", line: "replies yet" } : { fig: span(k.typical), line: "your typical wait for a reply" },
  ];
}

export const S4Body: React.FC<{ v: V24 }> = ({ v }) => {
  const k = v.keeping;
  const scale = s4Scale(v);
  if (k.placed === 0) {
    return <Block probe="keep-none"><p className="a24-none">{k.replies === 0 ? "No replies yet." : "None of your replies came from an agency that gives a time, so there is nothing to set them against."}</p></Block>;
  }
  return (
    <>
      {k.kept.length ? (
        <Block title="Kept to their time" aside={`${k.kept.length} of ${k.placed}, quickest first`} probe="kept">
          <PairList probe="kept-list">{k.kept.map((r) => <Row key={r.id} r={r} scale={scale} kept />)}</PairList>
        </Block>
      ) : null}
      {k.longer.length ? (
        <Block title="Took longer than they said" aside={`${k.longer.length} of ${k.placed}, the smallest overrun first`} probe="longer">
          <PairList probe="longer-list">{k.longer.map((r) => <Row key={r.id} r={r} scale={scale} kept={false} />)}</PairList>
        </Block>
      ) : null}
    </>
  );
};
