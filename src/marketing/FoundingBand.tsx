/**
 * FoundingBand — the page's closing offer (design ref: design-refs/scriptally-landing-v13.html
 * `.beta`): a parchment letter on a soft-pink band, sealed with wax.
 *
 * It REPLACES `CtaBand`, which restated the hero's "start tracking" three screens later. A page
 * that ends by repeating its own opening CTA is not closing, it is looping.
 *
 * ⚠️ THE SEAL IS THE ONE BURGUNDY FILL AT SCALE ON THIS SITE, and that is an exception worth
 * naming rather than a colour rule being relaxed. Every other burgundy fill in `marketing.css` is
 * a mark under 12px — the Pro tag, the status dot, the pinned-note pin, a few hairlines at half
 * opacity. The exception is about SIZE, not hue, and it does not travel: no button is
 * burgundy-filled, here or anywhere.
 *
 * ⚠️ THE BUTTON IS INK, ON A PINK GROUND, AND THAT CROSSES THE HOUSE GRAMMAR ON PURPOSE. The rule
 * was "ink in the nav, pink for page primaries"; it generalises rather than breaks — primaries are
 * pink on cream and parchment grounds, ink on pink ones. A pink button on this band would have
 * nothing to sit against.
 *
 * ⚠️ THE COUNTER IS LIVE OR ABSENT. There is no bar, no number and no placeholder until a real
 * figure comes back from the endpoint. A fabricated scarcity number on a public page is a factual
 * claim about how many people have signed up, and it is one nobody could check.
 *
 * ⚠️ THE SUBMIT PATH IS WIRED AND WILL FAIL, AND THAT IS THE CORRECT BEHAVIOUR TODAY. There is no
 * `/api/waitlist` rewrite on either app host and the `waitlist` function is deployed on neither
 * project, so every attempt classifies as `down` — "sign-ups are briefly unavailable", form
 * hidden, a real address offered. See `waitlist.ts` for why the status code cannot be trusted to
 * tell us that: a missing route here answers **200 with `text/html`**, so `res.ok` is `true` for a
 * route that does not exist.
 */

import React, { useEffect, useState } from "react";
import { Runs } from "./CopyRuns";
import { isValidEmail } from "../lib/authActions";
import {
  FOUNDING_EYEBROW, FOUNDING_HEADING, FOUNDING_BLURB, FOUNDING_FIELD_LABEL,
  FOUNDING_PLACEHOLDER, FOUNDING_CTA, FOUNDING_INVALID, FOUNDING_SENT, FOUNDING_DUPE,
  FOUNDING_FULL, FOUNDING_ERROR, FOUNDING_DOWN, FOUNDING_NOTE, foundingCounterLabel,
} from "./landingCopy";
import { joinWaitlist, fetchWaitlistCount, WaitlistCount } from "./waitlist";
import sealMark from "../assets/marketing/founding-seal-mark-placeholder.png";

/**
 * ⚠️ `full` IS DECLARED AND CANNOT BE REACHED — see `FOUNDING_FULL`. It is in the union so the
 * renderer is exhaustive over the outcomes the product intends, and so the day the function grows
 * a cap branch the only change is the wiring.
 */
export type FoundingState = "idle" | "sending" | "sent" | "dupe" | "full" | "error" | "down";

/** Which outcomes replace the form, and which leave it there to try again. */
const HIDES_FORM: ReadonlySet<FoundingState> = new Set<FoundingState>(["sent", "dupe", "full", "down"]);

export const FoundingBand: React.FC<{
  onNavigate: (tab: string, subPageName?: string) => void;
}> = ({ onNavigate }) => {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<FoundingState>("idle");
  const [invalid, setInvalid] = useState(false);
  /** Real figures from the endpoint, or null. Null renders NOTHING — see the docblock. */
  const [count, setCount] = useState<WaitlistCount | null>(null);

  /* ⚠️ A FAILED READ HIDES THE COUNTER AND DOES NOT CONDEMN THE FORM. `fetchWaitlistCount`
     resolves to null for every failure, so there is no branch here to get wrong. */
  useEffect(() => {
    let live = true;
    void fetchWaitlistCount().then((c) => { if (live) setCount(c); });
    return () => { live = false; };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) { setInvalid(true); return; }
    setInvalid(false);
    setState("sending");
    const outcome = await joinWaitlist(email.trim());
    setState(outcome.state);
    /* The join answers with the count too, so a reader who has just claimed a place sees the bar
       including themselves rather than the figure from before they arrived. */
    if ("count" in outcome && outcome.count) setCount(outcome.count);
  };

  const showForm = !HIDES_FORM.has(state);

  return (
    <section className="mk-beta" aria-labelledby="mk-founding-h">
      <div className="mk-betacard">
        {/* The wax seal, breaking the card's top edge. Decorative in full: the blob, the ring and
            the mark say nothing the heading beneath them does not. */}
        <span className="mk-wax" aria-hidden="true">
          <span className="mk-waxblob">
            <svg viewBox="0 0 92 92">
              <path d="M46 3c12 0 20 5 28 12s15 18 15 31-5 22-12 30-18 13-31 13-22-5-30-12S3 59 3 46 8 24 15 16 34 3 46 3z" />
              <circle cx="46" cy="46" r="32" />
            </svg>
          </span>
          <img src={sealMark} alt="" />
        </span>

        <p className="mk-betaeyebrow">{FOUNDING_EYEBROW}</p>
        <h2 id="mk-founding-h">{FOUNDING_HEADING}</h2>
        <p className="mk-betablurb">{FOUNDING_BLURB}</p>

        {showForm && (
          <form className="mk-betaform" onSubmit={(e) => { void submit(e); }} noValidate>
            {/* A real label, visually hidden — the placeholder is an example address, not a name
                for the field, and a placeholder-as-label disappears the moment anyone types. */}
            <label className="mk-sr" htmlFor="mk-founding-email">{FOUNDING_FIELD_LABEL}</label>
            <input
              id="mk-founding-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder={FOUNDING_PLACEHOLDER}
              value={email}
              aria-invalid={invalid || undefined}
              aria-describedby={invalid ? "mk-founding-invalid" : undefined}
              onChange={(ev) => { setEmail(ev.target.value); if (invalid) setInvalid(false); }}
            />
            <button type="submit" className="mk-btn mk-btn--ink" disabled={state === "sending"}>
              {FOUNDING_CTA}
            </button>
          </form>
        )}

        {invalid && (
          <p className="mk-betainvalid" id="mk-founding-invalid">{FOUNDING_INVALID}</p>
        )}

        {/* ⚠️ ONE LIVE REGION, ALWAYS PRESENT. A region mounted at the same moment as its message
            is not reliably announced — the outcome has to arrive INTO a region the reader's
            software is already watching. Empty and silent until there is something to say. */}
        <div className="mk-betamsgwrap" role="status" aria-live="polite">
          {state === "sent" && <p className="mk-betamsg mk-betamsg--ok">{FOUNDING_SENT}</p>}
          {state === "dupe" && <p className="mk-betamsg mk-betamsg--ok">{FOUNDING_DUPE}</p>}
          {state === "full" && <p className="mk-betamsg mk-betamsg--warn">{FOUNDING_FULL}</p>}
          {state === "error" && (
            <p className="mk-betamsg mk-betamsg--warn"><Runs runs={FOUNDING_ERROR} onNavigate={onNavigate} /></p>
          )}
          {state === "down" && (
            <p className="mk-betamsg mk-betamsg--warn"><Runs runs={FOUNDING_DOWN} onNavigate={onNavigate} /></p>
          )}
        </div>

        {/* Live or absent. `count` is null until a real figure comes back, and null renders
            nothing at all — not a zero, not an empty bar, not a dash. */}
        {count && state !== "down" && (
          <div className="mk-counter">
            <div className="mk-counterbar">
              <div
                className="mk-counterfill"
                style={{ width: `${Math.min(100, Math.round((count.claimed / count.cap) * 100))}%` }}
              />
            </div>
            <p className="mk-counterlab">{foundingCounterLabel(count.claimed, count.cap)}</p>
          </div>
        )}

        <p className="mk-betanote"><Runs runs={FOUNDING_NOTE} onNavigate={onNavigate} /></p>
      </div>
    </section>
  );
};
