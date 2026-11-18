/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Analytics v26 §F — "How do you compare?": the one part of the page not built from the writer's own data. Three
 * column pairs from v24's `benchmark` exactly as v24 computed them (You in navy, Most in stone), the thin-sample rule
 * unchanged ("Too early to say"), and the caveat that names the outside source.
 *
 * ⚠️ `SHOW_OUTSIDE_COMPARISON` GATES THIS SECTION AND THE HEADER'S THIRD LINE: set it false and both go, in one line.
 */
import React from "react";
import { A26Card, A26Means } from "./A26Bits";
import { cap, oneIn, mostOneIn } from "../../lib/analyticsV26";
import type { Bench, Benchmarks, Outcomes, ExpectedByNow } from "../../lib/analyticsV24";

export const SHOW_OUTSIDE_COMPARISON = true;

const HEADS: Record<Bench["key"], string> = {
  rate: "Agents who asked to read more",
  reply: "Queries that got any reply",
  sent: "Queries sent so far",
};
const TOO_EARLY = "Too early to say";

export const A26Compare: React.FC<{ bench: Bench[]; anchors: Benchmarks; o: Outcomes; e: ExpectedByNow }> = ({ bench, anchors, o, e }) => {
  const M = mostOneIn(anchors.requestRate);
  const rate = bench.find((b) => b.key === "rate");
  const ready = !!rate && rate.verdict !== TOO_EARLY;
  const basis = (b: Bench): string => {
    switch (b.key) {
      case "rate": return `${o.asked} of your ${o.sent}`;
      case "reply": return `${e.replied} of the ${e.past} old enough to judge`;
      case "sent": return `Most writers send about ${anchors.queriesSent}`;
      default: { const unhandled: never = b.key; return unhandled; }
    }
  };
  return (
    <A26Card band="bl" probe="compare" title="How do you compare?" aside="You against outside figures">
      <div className="a26-pad">
        <p className="a26-lede" data-a26="compare-lede">{!ready ? <>Three comparisons with figures from outside QueryHawk.</>
          : o.asked > 0 ? <><b>{cap(oneIn(o.asked, o.sent))}</b> of your queries led to an agent asking for more. For most writers it{"’"}s about 1 in {M}.</>
          : <>None of your queries has led to an agent asking for more yet. For most writers it{"’"}s about 1 in {M}.</>}</p>
        <div className="a26-cmp">
          {bench.map((b) => {
            const show = b.verdict !== TOO_EARLY && b.you !== null;
            const you = b.you ?? 0;
            const mx = Math.max(you, b.typical, 1);
            return (
              <div className="a26-cm" key={b.key} data-a26="bench" data-a26-bench={b.key} data-a26-you={show ? you : ""} data-a26-most={b.typical}>
                <h3>{HEADS[b.key]}</h3>
                <div className="a26-cols" role="img" aria-label={`You ${show ? `${you}${b.unit}` : "not yet known"}, most writers ${b.typical}${b.unit}`}>
                  <div className="a26-you"><b data-a26="you-v">{show ? `${you}${b.unit}` : "–"}</b><i style={{ height: show ? (you / mx) * 104 : 0 }} /></div>
                  <div className="a26-most"><b data-a26="most-v">{b.typical}{b.unit}</b><i style={{ height: (b.typical / mx) * 104 }} /></div>
                </div>
                <div className="a26-cols-l"><span>You</span><span>Most</span></div>
                <p className="a26-cm-v" data-a26="verdict">{b.verdict}</p>
                <p className="a26-cm-n">{show ? basis(b) : "Shown once more replies are in"}</p>
              </div>
            );
          })}
        </div>
        <p className="a26-cav" data-a26="caveat">This is the only part of the page not built from your own data. {"“"}Most writers{"”"} comes from writers who log their queries on QueryTracker, most of them querying US agents.</p>
        {!ready ? (
          <A26Means probe="compare">
            <p>With {o.sent} {o.sent === 1 ? "query" : "queries"} sent it{"’"}s too soon for a fair comparison. The first two charts fill in as replies arrive.</p>
          </A26Means>
        ) : null}
      </div>
    </A26Card>
  );
};
