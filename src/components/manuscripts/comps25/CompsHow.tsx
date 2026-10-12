/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comparable titles v25, Part C: "How comp tracking works." A paper-white band to the sheet's edges,
 * three illustrated steps, and a door into the letter picker.
 *
 * ⚠️ THE THREE DRAWINGS ARE PLACEHOLDERS awaiting commissioned art (the landing page's own three).
 */
import React from "react";

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

export const CompsHow: React.FC<{ onPick: () => void }> = ({ onPick }) => (
  <section className="cv-how" data-cv="how" aria-labelledby="cv-how-h">
    <h2 className="cv-how-h" id="cv-how-h">How comp tracking works.</h2>
    <ol className="cv-how-steps">
      {HOW_STEPS.map((s, i) => (
        <li key={s.art} data-cv="how-step">
          <figure className="cv-how-fig"><img src={`${s.art}?v=${s.v}`} width={s.w} height={s.h} alt="" /></figure>
          <span className="cv-how-n">{i + 1}</span>
          <h3 className="cv-how-t">{s.head}</h3>
          <p>{s.line}</p>
        </li>
      ))}
    </ol>
    <button type="button" className="cv-how-more" data-cv="how-pick" onClick={onPick}>Log the comps in a letter</button>
  </section>
);
