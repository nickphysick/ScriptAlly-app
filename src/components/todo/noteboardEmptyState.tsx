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

/**
 * The workflow's second arrangement — beneath a board that already has notes.
 *
 * ⚠️ IT NEVER RETIRES. No threshold, no dismissal: the panels sit below the board at any note
 * count, which is why the heading changes from a statement about the board ("Your board is
 * empty") to one about the practice ("Write it down for later…") and the lede shortens — the
 * writer has already done this once and does not need the long version again.
 */
export const NOTEBOARD_BELOW = {
  separator: "How the board works",
  heading: "Write it down for later…",
  lede: "Querying throws a lot at you at once. Anything you pin here stays put until you need it.",
} as const;

/** The sanctioned second entry point — the SAME composer the toolbar and the ghost open. */
/* ⚠️ THE ASIDE IS RETIRED — it read "Or keep one of the examples below", and the examples are no
   longer below. v2 pairs the primary with a "Browse examples" ghost that opens the drawer, which
   says the same thing and can be acted on. */
export const NOTEBOARD_CTA = { label: "+ Pin your first note" } as const;

/**
 * ⚠️ ONE PANELS COMPONENT, MOUNTED BY BOTH ARRANGEMENTS. Two copies of this JSX would pass every
 * probe about either state and drift the first time one was edited — so the panels are defined
 * once and the arrangements differ only in what surrounds them. `data-nb-steps` is the marker the
 * lock reads to prove both states rendered the same thing.
 */
const NoteboardSteps: React.FC = () => (
  <div className="nb-steps" data-nb-steps="workflow">
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
);

export interface NoteboardWorkflowProps {
  /** True while the board holds no notes — the two arrangements' only input. */
  empty: boolean;
  /** The composer opener, shared with the toolbar button and the ghost tile. */
  onPin: () => void;
  /** Opens the Examples drawer — the examples' only home now. */
  onBrowse: () => void;
}

export const NoteboardWorkflow: React.FC<NoteboardWorkflowProps> = ({ empty, onPin, onBrowse }) =>
  empty ? (
    /* ⚠️ THE CTA SITS BETWEEN THE LEDE AND THE PANELS, not after them — v2's own order, and the
       reason the lock compares a SEQUENCE rather than checking presence. Someone arriving at an
       empty board should be able to act before reading three panels, not after. */
    <div className="nb-wf">
      <h2 className="nb-wf-h">{NOTEBOARD_OPENING.heading}</h2>
      <p className="nb-wf-lede">{NOTEBOARD_OPENING.body}</p>
      <div className="nb-wf-cta">
        <button type="button" className="tdb-addb" onClick={onPin}>{NOTEBOARD_CTA.label}</button>
        <button type="button" className="nb-btn-ghost" onClick={onBrowse}>Browse examples</button>
      </div>
      <NoteboardSteps />
    </div>
  ) : (
    /* ⚠️ NO CTA ROW HERE, DELIBERATELY. The toolbar's button and the ghost tile are both on screen
       already; a third door to the same composer would be one too many. */
    <>
      <div className="nb-wf-sep">
        <hr />
        <span className="nb-wf-sep-label">{NOTEBOARD_BELOW.separator}</span>
      </div>
      <div className="nb-wf nb-wf--below">
        <h2 className="nb-wf-h">{NOTEBOARD_BELOW.heading}</h2>
        <p className="nb-wf-lede">{NOTEBOARD_BELOW.lede}</p>
        <NoteboardSteps />
      </div>
    </>
  );
