/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query letters v2.1 (13 Nov; design-refs/query-letters-v2-1) — the Top tip, in the open header's third column where
 * v2's in-use block was. One tip at a time; "Next tip" shows the next and wraps after the fifth. No auto-rotation and no
 * animation beyond a plain swap. The position is kept per browser in localStorage, every access wrapped: with no
 * storage it starts at tip 1.
 *
 * ⚠️ TIPS ARE ABOUT USING THE PAGE, never about how to write a letter, and nothing is labelled as AI. Tip 4's number is
 *    `LETTER_MIN_SENT`, read, never typed.
 */
import React, { useState } from "react";
import { LETTER_MIN_SENT } from "../../lib/queryLetters";

export const TIP_KEY = "scriptally_ql_tip";
const QUILL = "/images/dash/quill.png";

export const TIPS: readonly { title: string; text: string }[] = [
  { title: "Mark what you personalise", text: "Put anything you change per agent in square brackets, like [agent]. QueryHawk lists what's still to fill in before you send." },
  { title: "Don't overwrite, save a version", text: "Changed your letter? Start a new version. Keeping the old one is how you find out which does better." },
  { title: "Pick it when you log", text: "Choose the letter each time you log a query and its replies are counted for you." },
  { title: "Give it time", text: `A letter needs about ${LETTER_MIN_SENT} queries out before its figures mean much. Before that, one reply swings them.` },
  { title: "Copy from here", text: "Copy the text straight into your email or the agent's form, so what you send is what's on record." },
];

const readTip = (): number => {
  try {
    const n = Number(localStorage.getItem(TIP_KEY));
    return Number.isInteger(n) && n >= 0 ? n % TIPS.length : 0;
  } catch { return 0; }
};

export const TopTip: React.FC = () => {
  const [at, setAt] = useState<number>(readTip);
  const next = () => {
    const n = (at + 1) % TIPS.length;
    setAt(n);
    try { localStorage.setItem(TIP_KEY, String(n)); } catch { /* the tip still moves; it just won't be remembered */ }
  };
  const t = TIPS[at];
  return (
    <div className="qlp-wk" data-ql="tip-block">
      <div className="qlp-wkh">
        <span className="qlp-wkt"><b>Top tip</b></span>
        <button type="button" className="qlp-lnk" data-ql="tip-next" onClick={next}>Next tip</button>
      </div>
      <div className="qlp-tip" data-ql="tip" aria-live="polite">
        <img src={QUILL} alt="" />
        <div><b data-ql="tip-title">{t.title}</b><p data-ql="tip-text">{t.text}</p></div>
      </div>
      <div className="qlp-tipd" data-ql="tip-marks" aria-hidden="true">
        {TIPS.map((_, i) => <i key={i} className={i === at ? "on" : undefined} />)}
      </div>
    </div>
  );
};
