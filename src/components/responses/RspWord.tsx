/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Responses v15 Phase C (ref `gband`) — "A WORD ON REJECTIONS": the grey band under the header. The founding writer
 * band's construction (`shared/stripBand.css`, lifted from it): the white rim, the striped strip with its Hide / Read
 * button, and the bordered body with the corner wash, in grey.
 *
 *   left   the closed glyph in a ringed badge, "Rejections can be tough." and the paragraph
 *   right  three steps on a line: Keep it → the Rejection collection · Learn from it → In their words ·
 *          Shape what's next → Analytics
 *   folded one line in the strip
 *
 * ⚠️ SHOWN ONLY WHEN THE REJECTION COLLECTION HAS AN ENTRY (the page decides). "…holds yours" with exactly one.
 * ⚠️ HIDE STICKS PER WRITER (`todoPrefs.responses.wordFolded`, lib/responsesPrefs) until they press Read (decision 11);
 *    held locally too, so the click answers at once.
 * ⚠️ NO HEADINGS: brand.tsx forces a face on bare h1–h3; the band's names are spans (as the founding band's).
 */
import React, { useState } from "react";
import { QueryStatus } from "../../types";
import { StatusDot } from "../StatusDot";
import "../shared/stripBand.css";

export type WordStep = "keep" | "learn" | "shape";
export const WORD_TAG = "A word on rejections";
export const WORD_ONE = "They can be tough. Here, every one is kept, learned from and used to shape what you do next.";
export const WORD_HEAD = "Rejections can be tough.";

const ICON: Record<WordStep, React.ReactNode> = {
  keep: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v12H4zM3 4h18v3H3zM10 11h4" /></svg>,
  learn: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H10l-4 4v-4H4z" /><path d="M8 9h8M8 12.5h5" /></svg>,
  shape: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5M4 19h16M8 15l3.5-4 3 2.5L19 8" /><path d="M15.5 8H19v3.5" /></svg>,
};

export const RspWord: React.FC<{
  /** entries in the Rejection collection (≥ 1, or the page draws no band) */
  n: number;
  /** the stored fold */
  folded: boolean;
  onFold?: (folded: boolean) => void | Promise<void>;
  onStep: (s: WordStep) => void;
}> = ({ n, folded, onFold, onStep }) => {
  const [now, setNow] = useState<boolean | null>(null);
  const fold = now ?? folded;
  const toggle = () => { const next = !fold; setNow(next); void onFold?.(next); };
  return (
    <section className={`sband sband--grey rsp15-gb${fold ? " is-folded" : ""}`} data-rsp15="word" data-folded={fold ? "1" : "0"} aria-label={WORD_TAG}>
      <div className="sband-top rsp15-gb-top">
        <span className="rsp15-gb-tag">{WORD_TAG}</span>
        {fold ? <span className="rsp15-gb-one" data-rsp15="word-one">{WORD_ONE}</span> : null}
        <button type="button" className="rsp15-gb-fold" data-rsp15="word-fold" aria-expanded={!fold} onClick={toggle}>
          {fold ? "Read" : "Hide"}<i aria-hidden="true">{"⌃"}</i>
        </button>
      </div>
      {fold ? null : (
        <div className="sband-body rsp15-gb-body">
          <div className="rsp15-gb-me">
            <span className="rsp15-gb-badge" aria-hidden="true"><StatusDot status={QueryStatus.REJECTED} overrideSize={30} decorative /></span>
            <div>
              <span className="rsp15-gb-h" data-rsp15="word-head">{WORD_HEAD}</span>
              <p data-rsp15="word-body">
                Nobody enjoys a no, and this page holds {n === 1 ? "yours" : "all of yours"}. At QueryHawk we treat every rejection as <b>valuable data</b>. We keep it, we learn from it, and we use it to shape your campaign from here.
              </p>
            </div>
          </div>
          <ol className="rsp15-gb-road">
            <li><button type="button" data-rsp15="word-step" data-k="keep" onClick={() => onStep("keep")}>
              <span className="rsp15-gb-n">{ICON.keep}</span><b>Keep it</b><span>Every answer is logged in your <u>Rejection collection</u>.</span>
            </button></li>
            <li><button type="button" data-rsp15="word-step" data-k="learn" onClick={() => onStep("learn")}>
              <span className="rsp15-gb-n">{ICON.learn}</span><b>Learn from it</b><span>What agents told you is gathered <u>in their words</u>.</span>
            </button></li>
            <li><button type="button" data-rsp15="word-step" data-k="shape" onClick={() => onStep("shape")}>
              <span className="rsp15-gb-n">{ICON.shape}</span><b>Shape what{"’"}s next</b><span>How far each query got shows up in <u>Analytics</u>.</span>
            </button></li>
          </ol>
        </div>
      )}
    </section>
  );
};
