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
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { guideSeen, markGuideSeen, pageGuideToken, registerPageGuide, subscribePageGuide } from "../../lib/pageGuide";
import "./pageGuide.css";

export interface GuideStep {
  title: string;
  /** Two short paragraphs. §4b draws two and the reference draws two. */
  body: readonly [string, string];
}

/** The selector of something the card must not sit on top of — the rail's header here. */
const CLEAR_OF = '[data-qcv="be-head"]';
/** The card's resting offset from the window's foot — the sheet's `bottom`. */
const FOOT = 28;

export const PageGuide: React.FC<{ page: string; steps: readonly GuideStep[] }> = ({ page, steps }) => {
  const [open, setOpen] = useState(() => !guideSeen(page));
  const [i, setI] = useState(0);
  const [lift, setLift] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
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
   * ⚠️ THE LIFT IS COMPUTED FROM THE CARD'S HEIGHT, NEVER FROM ITS CURRENT POSITION — and the first
   * version did the latter and CRASHED THE PAGE. It asked whether the card's rect overlapped the
   * rail's header, and the answer moved the card, and moving the card changed the answer: lift set,
   * effect re-runs (lift was a dependency), no longer overlapping, lift cleared, overlapping again.
   * React stops that with "maximum update depth exceeded" and the Query Centre fell into its error
   * boundary at every viewport short enough to overlap — 860 and below, while 1000 was fine, so
   * every gate and every measurement at the usual height passed over a page that did not render.
   *
   * The honest form asks where the card WOULD sit unlifted: its foot is at `bottom: 28`, so its top
   * is `innerHeight - 28 - height`. That does not depend on the lift, so the answer is stable and
   * the effect settles in one pass.
   */
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const card = cardRef.current;
      const head = document.querySelector(CLEAR_OF) as HTMLElement | null;
      if (!card) return;
      const want = (() => {
        if (!head) return 0;
        const h = head.getBoundingClientRect();
        if (h.width === 0 || h.height === 0) return 0;
        const c = card.getBoundingClientRect();
        /* where the card sits with no lift at all */
        const restTop = window.innerHeight - FOOT - c.height;
        const overlaps = restTop < h.bottom && c.right > h.left;
        if (!overlaps) return 0;
        return Math.max(FOOT, Math.round(window.innerHeight - h.top + 14));
      })();
      setLift((was) => (was === want ? was : want));
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open, i]);

  if (!open || steps.length === 0) return null;
  const step = steps[Math.min(i, steps.length - 1)];
  const last = i >= steps.length - 1;
  const done = () => { markGuideSeen(page); setOpen(false); };

  return (
    <div className="pgd" data-qcv="guide" ref={cardRef} role="dialog" aria-label="A quick tour of this page"
      style={lift ? { bottom: lift } : undefined}>
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
