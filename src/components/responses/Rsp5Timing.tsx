/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Responses v5 Phase 5 (ref `timing`) — HOW LONG AGENTS TOOK: one white well, four bars (within 2 weeks · 2 to 4
 * weeks · 4 to 8 weeks · over 8 weeks), each split by the kind of the agent's FIRST answer, the count printed in each
 * segment and "{n} answers" on the right; a sentence above and the still-waiting line below.
 *
 * ⚠️ THE BARS ARE `waitBrackets` (no-reply closes INCLUDED, so the bars add up to the answered count less any answer
 *    nothing dates; that remainder is stated rather than dropped). The sentence's typical wait is `typicalWait` (no-reply
 *    closes EXCLUDED, D4).
 * ⚠️ "GONE PAST THE REPLY TIME" COUNTS THE QUERY CENTRE'S GONE QUIET (`goneQuiet`, D6) WITH A REPLY DATE. The set
 *    starts at the end of the nudge window, so each one is past its reply date; the gone-quiet queries with NO reply date
 *    (long in the stage) are left out here, because "the reply time the agent gives" is not true of them. The page
 *    passes `quiet` already filtered.
 * ⚠️ A SEGMENT NAMES ITS AGENTS ON HOVER AND ON FOCUS, AND A CLICK DOES NOTHING.
 */
import React, { useState } from "react";
import { busiestBracket, plural, typicalWait, waitBrackets, type FirstKind, type RespItem } from "../../lib/responses";
import type { QcRow } from "../../lib/qcSummary";

type Item = RespItem<QcRow>;
const KINDS: readonly FirstKind[] = ["more", "passed", "noReply"];
const KIND_LABEL: Record<FirstKind, string> = { more: "Asked for more", passed: "Passed", noReply: "No reply" };

export const Rsp5Timing: React.FC<{ items: readonly Item[]; waiting: number; quiet: number }> = ({ items, waiting, quiet }) => {
  const { bars, undated } = waitBrackets(items);
  const max = Math.max(1, ...bars.map((b) => b.total));
  const top = busiestBracket(bars);
  const wait = typicalWait(items);
  const [tip, setTip] = useState<{ bar: string; kind: FirstKind; left: number } | null>(null);
  const show = (bar: string, kind: FirstKind) => (e: React.SyntheticEvent<HTMLElement>) => setTip({ bar, kind, left: e.currentTarget.offsetLeft });
  return (
    <section className="rsp5-sec" data-rsp5="timing" data-rsp5-sec="timing" aria-labelledby="rsp5-timing-h">
      <div className="rsp5-h2row">
        <div className="rsp5-h2">
          <span className="rsp5-art rsp5-art--sm" aria-hidden="true">Art: hawk with a pocket watch</span>
          <div>
            <h2 id="rsp5-timing-h" className="rsp5-h2t">How long agents took</h2>
            <p className="rsp5-sub" data-rsp5="timing-line">
              {top
                ? <>Most of your answers came <b>{top.label.toLowerCase()}</b> after you queried.{wait != null ? <> Your typical wait for a reply is <b>{plural(wait, "day", "days")}</b>.</> : null}</>
                : <>Once agents start answering, you&rsquo;ll see how long they tend to take.</>}
            </p>
          </div>
        </div>
      </div>
      <div className="rsp5-well" data-rsp5="timing-well">
        <div className="rsp5-tkey" aria-hidden="true">
          {KINDS.map((k) => <span key={k}><i className={`rsp5-kq rsp5-kq--${k}`} />{KIND_LABEL[k]}</span>)}
        </div>
        <div className="rsp5-tbars">
          {bars.map((b) => (
            <div key={b.key} className="rsp5-tbar" data-rsp5="tbar" data-k={b.key} data-n={b.total}>
              <span className="rsp5-tl">{b.label}</span>
              <span className="rsp5-ttrack">
                <span className="rsp5-tfill" style={{ width: `${(b.total / max) * 100}%` }}>
                  {KINDS.map((k) => b[k].length ? (
                    <span key={k} className={`rsp5-tseg rsp5-tseg--${k}`} data-rsp5="tseg" data-k={k} data-n={b[k].length} style={{ flex: `${b[k].length} 1 0` }}
                      tabIndex={0} aria-label={`${KIND_LABEL[k]}, ${b.label.toLowerCase()}: ${b[k].map((i) => i.row.agentName).join(", ")}`}
                      onMouseEnter={show(b.key, k)} onFocus={show(b.key, k)} onMouseLeave={() => setTip(null)} onBlur={() => setTip(null)}>
                      {b[k].length}
                    </span>
                  ) : null)}
                </span>
              </span>
              <span className="rsp5-tn">{plural(b.total, "answer", "answers")}</span>
              {tip && tip.bar === b.key ? (
                <span className="rsp5-ttip" role="tooltip" data-rsp5="timing-tip" style={{ left: `calc(130px + 16px + ${tip.left}px)` }}>
                  <b>{KIND_LABEL[tip.kind]}</b>
                  <span>{b[tip.kind].map((i) => i.row.agentName).join(", ")}</span>
                </span>
              ) : null}
            </div>
          ))}
        </div>
        <p className="rsp5-twait" data-rsp5="timing-wait">
          <b>{waiting}</b> still waiting{quiet ? <>, and <b>{quiet}</b> {quiet === 1 ? "has" : "have"} gone past the reply time the agent gives. Their nudge and close dates are on your To-do list.</> : "."}
          {undated ? <> {plural(undated, "answer has", "answers have")} no date recorded, so {undated === 1 ? "it isn’t" : "they aren’t"} in the bars.</> : null}
        </p>
      </div>
    </section>
  );
};
