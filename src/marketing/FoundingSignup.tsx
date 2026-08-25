/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * FoundingSignup — the waitlist form itself: a field, a button, the outcome states and the live
 * region that announces them. It carries no chrome of its own.
 *
 * ⚠️ ONE COMPONENT, THREE MOUNTS, ONE LIST. The landing hero's blush panel, the `/founders` hero
 * and the sealed band at the foot of both pages all render THIS, with different wrappers around
 * it. Copying it would give the site three sign-ups that drift apart — three success states,
 * three counters, three sets of error copy to keep in step — and they would disagree in front of
 * a reader long before anyone noticed in the source.
 *
 * ⚠️ `idPrefix` IS REQUIRED AND THAT IS THE POINT. `/founders` renders TWO of these on one page,
 * so a hardcoded `id` would put duplicates in one document: invalid HTML, and `<label for>` /
 * `aria-describedby` resolve to whichever comes first — so the second form's label would silently
 * point at the first form's field. This repo has met that fault before, in the workspace, where
 * every page stays mounted; here it is one page rendering the same component twice.
 *
 * State and count both come from `foundingStore`, never from this component, so all three mounts
 * agree. See that file for why.
 */

import React, { useEffect, useState } from "react";
import { Runs } from "./CopyRuns";
import { isValidEmail } from "../lib/authActions";
import {
  FOUNDING_FIELD_LABEL, FOUNDING_PLACEHOLDER, FOUNDING_CTA, FOUNDING_INVALID,
  FOUNDING_SENT, FOUNDING_DUPE, FOUNDING_FULL, FOUNDING_ERROR, FOUNDING_DOWN,
  foundingCounterLabel,
} from "./landingCopy";
import { useFounding, ensureCount, submitFounding, FoundingState } from "./foundingStore";

/** Which outcomes replace the form, and which leave it there to try again. */
const HIDES_FORM: ReadonlySet<FoundingState> = new Set<FoundingState>(["sent", "dupe", "full", "down"]);

/**
 * ⚠️ EXPORTED SO A WRAPPER CAN ASK THE SAME QUESTION, NOT ANSWER IT ITSELF. The landing panel puts
 * `How it works` inside the form's row and that whole row is replaced on an outcome — so the
 * wrapper has to know whether the form is showing. Re-deriving the rule there would be two lists
 * of states to keep in step, and they would drift the first time a state was added.
 */
export const formIsVisible = (state: FoundingState): boolean => !HIDES_FORM.has(state);

export const FoundingSignup: React.FC<{
  /** Unique per mount. Every `id` this renders is built from it — see the docblock. */
  idPrefix: string;
  /** The button. Defaults to the band's wording so the two band mounts do not restate it. */
  ctaLabel?: string;
  /** The form's own class, so each wrapper owns its own layout. */
  formClass: string;
  /**
   * ⚠️ PER-SURFACE OUTCOME COPY, ONE STATE MACHINE. `foundingStore` decides WHICH state; a wrapper
   * may decide what its surface says in it. Absent, the sealed band's wording is used — which is
   * what both band mounts want, so neither has to restate it.
   * Forking the RENDER instead of passing the copy is how two surfaces come to disagree about
   * what happened to the same submission.
   */
  messages?: Partial<Record<FoundingState, React.ReactNode>>;
  onNavigate: (tab: string, subPageName?: string) => void;
}> = ({ idPrefix, ctaLabel = FOUNDING_CTA, formClass, messages, onNavigate }) => {
  const { state } = useFounding();
  const [email, setEmail] = useState("");
  const [invalid, setInvalid] = useState(false);

  useEffect(ensureCount, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) { setInvalid(true); return; }
    setInvalid(false);
    await submitFounding(email.trim());
  };

  const fieldId = `${idPrefix}-email`;
  const invalidId = `${idPrefix}-invalid`;

  return (
    <>
      {!HIDES_FORM.has(state) && (
        <form className={formClass} onSubmit={(e) => { void submit(e); }} noValidate>
          {/* ⚠️ A LABEL, NOT A PLACEHOLDER STANDING IN FOR ONE. The placeholder is an example
              address and it disappears the moment anyone types; the label has to survive that.
              `.mk-sr` hides it visually and keeps it in the accessibility tree — which is what
              separates it from `.mk-trap`, the contact form's honeypot, which is `aria-hidden`. */}
          <label className="mk-sr" htmlFor={fieldId}>{FOUNDING_FIELD_LABEL}</label>
          <input
            id={fieldId}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={FOUNDING_PLACEHOLDER}
            value={email}
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? invalidId : undefined}
            onChange={(ev) => { setEmail(ev.target.value); if (invalid) setInvalid(false); }}
          />
          <button type="submit" className="mk-btn mk-btn--ink" disabled={state === "sending"}>
            {ctaLabel}
          </button>
        </form>
      )}

      {invalid && <p className="mk-betainvalid" id={invalidId}>{FOUNDING_INVALID}</p>}

      {/* ⚠️ ONE LIVE REGION, ALWAYS PRESENT. A region mounted at the same moment as its message is
          not reliably announced — the outcome has to arrive INTO a region the reader's software is
          already watching. Empty and silent until there is something to say. */}
      <div className="mk-betamsgwrap" role="status" aria-live="polite">
        {messages?.[state] ?? (
          <>
            {state === "sent" && <p className="mk-betamsg mk-betamsg--ok">{FOUNDING_SENT}</p>}
            {state === "dupe" && <p className="mk-betamsg mk-betamsg--ok">{FOUNDING_DUPE}</p>}
            {state === "full" && <p className="mk-betamsg mk-betamsg--warn">{FOUNDING_FULL}</p>}
            {state === "error" && (
              <p className="mk-betamsg mk-betamsg--warn"><Runs runs={FOUNDING_ERROR} onNavigate={onNavigate} /></p>
            )}
            {state === "down" && (
              <p className="mk-betamsg mk-betamsg--warn"><Runs runs={FOUNDING_DOWN} onNavigate={onNavigate} /></p>
            )}
          </>
        )}
      </div>
    </>
  );
};

/**
 * The counter, live or absent.
 *
 * ⚠️ IT RENDERS NOTHING UNTIL A REAL FIGURE COMES BACK — no bar, no number, no dash, no zero. The
 * ref hardcodes "37 of 100 places claimed"; on a public page that is a factual claim about how
 * many people have signed up, made by nobody and checkable by nobody. Each wrapper places this
 * where its own layout wants it; the figure itself comes from the one shared store.
 */
/**
 * ⚠️ TWO VARIANTS, NOT THREE. `line` rendered a bare `.mk-foundcnt` sentence and `/founders` was
 * its only consumer; that hero now uses `tally`, so the branch went with it rather than being
 * left as a shape nothing draws. A replacement is SWAPPED, not added — a third variant surviving
 * its last caller is exactly how this file would grow a form nobody has looked at in a year.
 */
export const FoundingCounter: React.FC<{ variant: "bar" | "tally" }> = ({ variant }) => {
  /* ⚠️ THE COUNTER ASKS FOR ITS OWN FIGURE. It used to rely on a `FoundingSignup` being mounted
     beside it, which held on every surface until the pricing page rendered a counter with no form
     — and the failure is silent, because "no count yet" and "never asked" both render nothing.
     `ensureCount` is idempotent for the life of the module, so a page with both still makes one
     request. */
  useEffect(ensureCount, []);
  const { count, state } = useFounding();
  if (!count || state === "down") return null;
  const pct = Math.min(100, Math.round((count.claimed / count.cap) * 100));
  const label = foundingCounterLabel(count.claimed, count.cap);
  /**
   * ⚠️ `tally` IS A THIRD VARIANT RATHER THAN A RESTYLED `bar`, AND THE REASON IS THE LABEL. The
   * panel's tint differences — a 5px track, a different fill alpha, a transition — are a
   * wrapper-scoped override like the button already uses, and could have been done from outside.
   * The label could not: `37/100 places claimed` with a dimmed `/100` is different MARKUP and
   * different WORDING from the band's `37 of 100 places claimed`, and changing `bar` to suit the
   * panel would reach into the sealed band, which renders on two pages and is not this surface.
   * One branch, same component, same store.
   */
  if (variant === "tally") {
    return (
      <div className="mk-fmcount">
        {/* The bar carries the figure for anyone who cannot see it; the text beneath is then
            decorative to a screen reader and would otherwise be read out twice. */}
        <div className="mk-fmbar" role="img" aria-label={label}>
          <div className="mk-fmfill" style={{ width: `${pct}%` }} />
        </div>
        <p className="mk-fmmeta" aria-hidden="true">
          <span className="mk-fmtally">{count.claimed}<span className="mk-fmof">/{count.cap}</span></span>
          {" places claimed"}
        </p>
      </div>
    );
  }
  return (
    <div className="mk-counter">
      <div className="mk-counterbar"><div className="mk-counterfill" style={{ width: `${pct}%` }} /></div>
      <p className="mk-counterlab">{label}</p>
    </div>
  );
};
