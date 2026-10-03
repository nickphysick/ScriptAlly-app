/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * §4b — THE PAGE GUIDE: a first-visit card, bottom right, three steps, once per page per writer.
 *
 * ⚠️ ONE COMPONENT, AND EACH PAGE SUPPLIES ITS OWN THREE STEPS. §4b says "the same component serves
 * every page that adopts the living header"; this pack writes the Query Centre's steps and nothing
 * else's, so the steps are a prop rather than a table keyed by route — a table would have to carry
 * five pages' copy before any of it had been written.
 *
 * ⚠️ AND IT NEVER COVERS THE RAIL'S HEADER. The card is `position: fixed` at the foot of the window,
 * and the rail is tall: at a short viewport the two overlap, and what the card would hide is the one
 * thing the third step is about. The clearance is MEASURED — the header's own rect against the
 * card's — rather than assumed from a height, because the rail's top moves with the hero and the
 * desk above it.
 */
import React, { useEffect, useRef, useState } from "react";
import { guideSeen, markGuideSeen, pageGuideToken, registerPageGuide, subscribePageGuide } from "../../lib/pageGuide";
import "./pageGuide.css";

export interface GuideStep {
  title: string;
  /** Two short paragraphs. §4b draws two and the reference draws two. */
  body: readonly [string, string];
}


export const PageGuide: React.FC<{ page: string; steps: readonly GuideStep[] }> = ({ page, steps }) => {
  const [open, setOpen] = useState(() => !guideSeen(page));
  const [i, setI] = useState(0);
  const token = useRef(pageGuideToken());

  /* the page says it has a guide while it is mounted, so the help menu can offer it only here */
  useEffect(() => {
    registerPageGuide(page);
    return () => registerPageGuide(null);
  }, [page]);

  /* …and the help menu's item reopens it, from the first step */
  useEffect(() => subscribePageGuide(() => {
    const t = pageGuideToken();
    if (t !== token.current) { token.current = t; setI(0); setOpen(true); }
  }), []);

  /**
   * ⚠️ §3 (v96.1) · THE CARD IS ANCHORED TO THE VIEWPORT AND MEASURES NOTHING. It used to lift
   * itself clear of the rail's header, and that rule produced the fault it was written to prevent:
   * at 860 tall the card jumped to `bottom: 285px` and sat **over the desk's third section** —
   * measured, `overDesk: true` — which is the one thing §4b's "never covers" was about. At 1040 it
   * stayed put, so the viewport the rule was checked at was the one viewport it was harmless in.
   *
   * At a height too short for both, the card wins and the rail scrolls under it. There is nothing
   * left to collide with and nothing left to measure, which is why the effect is gone rather than
   * corrected: a placement that reads the page is a placement that can be wrong about it.
   */


  if (!open || steps.length === 0) return null;
  const step = steps[Math.min(i, steps.length - 1)];
  const last = i >= steps.length - 1;
  const done = () => { markGuideSeen(page); setOpen(false); };

  return (
    <div className="pgd" data-qcv="guide" role="dialog" aria-label="A quick tour of this page"
>
      <button type="button" className="pgd-x" data-qcv="guide-x" aria-label="Close the guide" onClick={done}>×</button>
      <b className="pgd-t" data-qcv="guide-title">{step.title}</b>
      <p>{step.body[0]}</p>
      <p>{step.body[1]}</p>
      <div className="pgd-f">
        <i aria-hidden="true">{steps.map((s, n) => <em key={s.title} className={n === i ? "on" : undefined} />)}</i>
        <span data-qcv="guide-n">{i + 1} of {steps.length}</span>
        <button type="button" className="pgd-next" data-qcv="guide-next"
          onClick={() => (last ? done() : setI(i + 1))}>{last ? "Done" : "Next ›"}</button>
      </div>
    </div>
  );
};
