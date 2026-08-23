/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Noteboard's empty state — the three-panel workflow (empty-state run, Phase 1;
 * ref design-refs/noteboard-empty-state.html).
 *
 * ⚠️ IT RENDERS AT ZERO NOTES, FULL STOP — and that is a deliberate override of the condition it
 * replaces. `.nb-empty` used to render only when the board was empty AND every example paper had
 * been dismissed: an earlier pass found the panel suppressing the papers entirely, and made the
 * panel yield rather than making the two coexist. Coexistence is what that fix was protecting.
 * The workflow and the papers stack, as the ref draws them; `.nb-empty`'s old content is RETIRED,
 * not demoted, so the page teaches twice at most and never three times.
 *
 * ⚠️ THE COPY IS THE REF'S, VERBATIM, WITH ONE SUBSTITUTION. Panel three's heading is
 * `MAKE_TASK_LABEL` — the constant the kebab renders — not the ref's "Give it a date, if it needs
 * one", whose phrasing was retired with the `give-date` menu id. Its body and aside port
 * unchanged: they describe date-on-note accurately ("stays here on the board. One note, not a
 * copy"), which is the current model.
 */
import React from "react";
import { MAKE_TASK_LABEL } from "../../lib/todoMenu";
import { WriteItDownArt, ColourAndTagArt, DatedNoteArt } from "./noteboardEmptyArt";

export interface NoteboardStep {
  n: string;
  heading: string;
  body: string;
  aside: string;
  Art: React.FC<{ className?: string }>;
}

/** The opening block above the panels. */
export const NOTEBOARD_OPENING = {
  heading: "Your board is empty",
  body: "Querying throws a lot at you at once — an agent’s wishlist heard on a podcast, a line that finally works, a rule you keep forgetting. This is where those live until you need them.",
} as const;

/** The three panels, in the ref's order. */
export const NOTEBOARD_STEPS: readonly NoteboardStep[] = [
  {
    n: "One",
    heading: "Write it down",
    body: "A quote, a comp title, a half-formed pitch. Pin it in a second and get back to what you were doing.",
    aside: "Nothing here goes anywhere else unless you send it.",
    Art: WriteItDownArt,
  },
  {
    n: "Two",
    heading: "Colour and tag it",
    body: "Three papers and a tag of your own wording. Filter to #agents when you’re polishing a letter, or search the lot.",
    aside: "Your tags, your grouping — nothing is prescribed.",
    Art: ColourAndTagArt,
  },
  {
    /* ⚠️ THE ONE SUBSTITUTION — the kebab's constant, not the ref's retired phrase. */
    n: "Three",
    heading: MAKE_TASK_LABEL,
    body: "A note with a date turns up on your to-do list and calendar when it’s due — and stays here on the board. One note, not a copy.",
    aside: "Undated notes stay put. They never chase you.",
    Art: DatedNoteArt,
  },
] as const;

/** The examples' own header block — it replaces the orphaned hint line. */
export const NOTEBOARD_EXHEAD = {
  heading: "What writers keep here",
  body: "Drawn from what querying writers actually hang on to. Keep one to make it yours, or dismiss them — they retire on their own as your board fills.",
} as const;

/** The sanctioned second entry point — the SAME composer the toolbar and the ghost open. */
export const NOTEBOARD_CTA = {
  label: "+ Pin your first note",
  note: "Or keep one of the examples below to start with.",
} as const;

export const NoteboardEmptyState: React.FC<{ onPin: () => void }> = ({ onPin }) => (
  <>
    <div className="nb-opening">
      <h2>{NOTEBOARD_OPENING.heading}</h2>
      <p>{NOTEBOARD_OPENING.body}</p>
    </div>

    <div className="nb-steps">
      {NOTEBOARD_STEPS.map((s) => (
        <div className="nb-step" key={s.n}>
          <div className="nb-step-art">
            <s.Art />
          </div>
          <div className="nb-step-txt">
            <span className="nb-step-n">{s.n}</span>
            <h3>{s.heading}</h3>
            <p>{s.body}</p>
            <p className="nb-step-aside">{s.aside}</p>
          </div>
        </div>
      ))}
    </div>

    {/* ⚠️ THE DUPLICATE CTA IS SANCTIONED — one code path, two entry points. `onPin` is the same
        opener the toolbar button and the ghost tile call; there is no second composer. */}
    <div className="nb-opening-cta">
      <button type="button" className="tdb-addb" onClick={onPin}>{NOTEBOARD_CTA.label}</button>
      <span className="nb-cta-note">{NOTEBOARD_CTA.note}</span>
    </div>
  </>
);
