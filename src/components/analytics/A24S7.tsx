/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Analytics v24 S7 — A NOTE ON THESE NUMBERS. Three paragraphs, the counts from the model.
 *
 * ⚠️ THE SECOND PARAGRAPH SAYS WHAT THE RATES DO WITH A WAITING QUERY, NOT WHAT THE BRIEF SAID. The brief has the
 *    waiting queries "left out of the rates until they close"; every rate on this page is over ALL the queries sent,
 *    so a waiting query is counted, as one that has not (yet) been asked to read more.
 */
import React from "react";
import type { V24 } from "../../lib/analyticsV24";

export const S7Body: React.FC<{ v: V24 }> = ({ v }) => {
  const r = v.tally.all, w = v.outcomes.waiting;
  return (
    <div className="a24-note" data-a24="note">
      <p><b>Small numbers move a lot.</b> With {r === 0 ? "no replies" : `${r} ${r === 1 ? "reply" : "replies"}`}, one more reply shifts the figures noticeably. Treat them as a rough picture, not a precise measure.</p>
      <p><b>No reply is not a no.</b> The {w === 0 ? "rates count every query you have sent" : `${w} ${w === 1 ? "query" : "queries"} still waiting ${w === 1 ? "counts" : "count"} in the rates as not yet asked to read more`}, so the rates can go up or down from here.</p>
      <p><b>The page cannot see inside an agency.</b> How full an agent&rsquo;s list is, whether they are on leave, or when they actually read your letter all affect these numbers, and none of it is recorded here.</p>
    </div>
  );
};
