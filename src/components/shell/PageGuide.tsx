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
  /** One or two short paragraphs. §4b draws two (the Query Centre); Contact list v13 §8 draws one. */
  body: readonly [string] | readonly [string, string];
  /**
   * v13 §8 — the step's SUBJECT: a selector the step scrolls to and rings while it is showing. The
   * first VISIBLE match is used (every workspace page stays mounted, so a bare query can answer about
   * a hidden copy). Absent, the step points at nothing, as the Query Centre's do.
   */
  subject?: string;
}

/** v13 §8's additions, all optional: the Query Centre passes none of them and renders exactly as before. */
export interface GuideDress {
  /** a mono kicker above the title, followed by "· n of N" ("How this page works") */
  kicker?: string;
  /** a Back button from the second step on */
  back?: boolean;
  /** the last step's button ("Got it"; the default is "Done") */
  finish?: string;
  /** a modifier class for the page's own dress and placement */
  className?: string;
  /** placement from the page (e.g. above its floating tab, which is placed from the window's box) */
  style?: React.CSSProperties;
}


export const PageGuide: React.FC<{ page: string; steps: readonly GuideStep[]; dress?: GuideDress }> = ({ page, steps, dress }) => {
  const [open, setOpen] = useState(() => !guideSeen(page));
  const [i, setI] = useState(0);
  const token = useRef(pageGuideToken());

  /* the page says it has a guide while it is mounted, so the help menu can offer it only here */
  useEffect(() => {
    registerPageGuide(page);
    return () => registerPageGuide(null);
  }, [page]);

  /* set once the reader moves the guide on; read by the subject effect below */
  const steered = useRef(false);
  /* …and the help menu's item reopens it, from the first step */
  useEffect(() => subscribePageGuide(() => {
    const t = pageGuideToken();
    if (t !== token.current) { token.current = t; steered.current = true; setI(0); setOpen(true); }
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


  /**
   * v13 §8 — the step's subject: ringed while its step shows, released on any change, and SCROLLED TO
   * only once the reader has steered the guide (Next, Back, or the help menu's reopen), and only when
   * it is not already wholly in view.
   *
   * ⚠️ NEVER ON ARRIVAL. The guide opens by itself on a first visit, so a scroll there moves the page
   * under someone who has not touched anything yet — measured on the first neighbour run: the
   * index strip's marked letter changed under the Contact list's own figure lock at 1280, and the band
   * lock read a page that had moved. The step shown on arrival rings in place.
   */
  const go = (n: number) => { steered.current = true; setI(n); };
  const subject = open ? steps[Math.min(i, steps.length - 1)]?.subject : undefined;
  useEffect(() => {
    if (!subject) return undefined;
    const el = [...document.querySelectorAll<HTMLElement>(subject)].find((x) => x.getBoundingClientRect().height > 0);
    if (!el) return undefined;
    el.classList.add("pgd-ring");
    const r = el.getBoundingClientRect();
    if (steered.current && (r.top < 0 || r.bottom > window.innerHeight)) {
      const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    }
    return () => el.classList.remove("pgd-ring");
  }, [subject, i]);

  if (!open || steps.length === 0) return null;
  const step = steps[Math.min(i, steps.length - 1)];
  const last = i >= steps.length - 1;
  const done = () => { markGuideSeen(page); setOpen(false); };

  if (dress) {
    return (
      <div className={`pgd pgd--dress${dress.className ? ` ${dress.className}` : ""}`} style={dress.style} data-qcv="guide" data-guide={page}
        role="dialog" aria-label="How this page works">
        <button type="button" className="pgd-x" data-qcv="guide-x" aria-label="Close the guide" onClick={done}>×</button>
        {dress.kicker && <span className="pgd-k" data-qcv="guide-n">{dress.kicker} · {i + 1} of {steps.length}</span>}
        <b className="pgd-t" data-qcv="guide-title">{step.title}</b>
        {step.body.map((b, n) => <p key={n}>{b}</p>)}
        <div className="pgd-f">
          <i aria-hidden="true">{steps.map((s, n) => <em key={s.title} className={n === i ? "on" : undefined} />)}</i>
          {dress.back && i > 0 && <button type="button" className="pgd-b" data-qcv="guide-back" onClick={() => go(i - 1)}>Back</button>}
          <button type="button" className="pgd-next" data-qcv="guide-next"
            onClick={() => (last ? done() : go(i + 1))}>{last ? (dress.finish ?? "Done") : "Next"}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="pgd" data-qcv="guide" role="dialog" aria-label="A quick tour of this page"
>
      <button type="button" className="pgd-x" data-qcv="guide-x" aria-label="Close the guide" onClick={done}>×</button>
      <b className="pgd-t" data-qcv="guide-title">{step.title}</b>
      {step.body.map((b, n) => <p key={n}>{b}</p>)}
      <div className="pgd-f">
        <i aria-hidden="true">{steps.map((s, n) => <em key={s.title} className={n === i ? "on" : undefined} />)}</i>
        <span data-qcv="guide-n">{i + 1} of {steps.length}</span>
        <button type="button" className="pgd-next" data-qcv="guide-next"
          onClick={() => (last ? done() : go(i + 1))}>{last ? "Done" : "Next ›"}</button>
      </div>
    </div>
  );
};
