/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "How it works." (comps v28; v27 read "How comp tracking works.") — the heading, three illustrated steps with their arrows, and an optional
 * door into the letter picker (Comparable titles v27).
 *
 * ⚠️ ONE COMPONENT, TWO HOSTS, AND NOTHING ELSE DRAWS THE STEPS: the empty page's card, and the
 * pop-up a page with comps opens from its header. The host sets the padding, the heading's size, the
 * gap and the figures' height (two custom properties, `--cv-hsteps-gap` and `--cv-hsteps-fig`, which the
 * arrows' places are computed from); the words and the markup are here only.
 *
 * `onPick` is the door. The empty page passes none: with no comps there is nothing to log.
 *
 * ⚠️ THE THREE DRAWINGS ARE PLACEHOLDERS awaiting commissioned art (the landing page's own three).
 */
import React from "react";

export const STEPS_HEADING = "How it works.";
/** Comps v28: the steps' foot line, in both hosts. */
export const STEPS_NOTE = "Two or three comps in a letter is usual. Keep more on your shelf to choose from.";
export const STEPS_PICK = "Log the comps in a letter";

export const HOW_STEPS = [
  { art: "/images/get-good-stories-told.png", v: "8baf6c8a", w: 482, h: 440,
    head: "Add titles to your shelf that are comparable to your manuscript.",
    line: "Books, films and shows like yours, each with a line on why it fits." },
  { art: "/images/let-writers-write.png", v: "d481eb31", w: 347, h: 440,
    head: "Record which query letter references which titles.",
    line: "Log the comps each query letter mentions. Once a letter has gone out, that record is fixed." },
  { art: "/images/make-querying-simple.png", v: "be581a5e", w: 456, h: 440,
    head: "Track their success and shape your strategy.",
    line: "Every query a letter goes out with is logged against its comps, so you can see which ones get agents asking for more." },
] as const;

export const CompsSteps: React.FC<{
  /** the heading's id: the host labels itself by it, and two hosts may be mounted at once */
  headingId: string;
  onPick?: () => void;
}> = ({ headingId, onPick }) => (
  <section className="cv-hsteps" data-cv="steps" aria-labelledby={headingId}>
    <h2 className="cv-hsteps-h" id={headingId}>{STEPS_HEADING}</h2>
    <ol className="cv-hsteps-list">
      {HOW_STEPS.map((s, i) => (
        <li key={s.art} data-cv="how-step">
          <figure className="cv-hsteps-fig"><img src={`${s.art}?v=${s.v}`} width={s.w} height={s.h} alt="" /></figure>
          <span className="cv-hsteps-n">{i + 1}</span>
          <h3 className="cv-hsteps-t">{s.head}</h3>
          <p>{s.line}</p>
        </li>
      ))}
    </ol>
    <p className="cv-hsteps-note" data-cv="steps-note">{STEPS_NOTE}</p>
    {onPick ? <button type="button" className="cv-hsteps-more" data-cv="how-pick" onClick={onPick}>{STEPS_PICK}</button> : null}
  </section>
);
