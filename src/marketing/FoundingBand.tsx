/**
 * FoundingBand — the founding-writers banner that closes the landing page and `/founders`: a
 * full-bleed band carrying the artwork, with the offer on a white card sitting over it.
 *
 * ⚠️ IT REPLACES THE SEALED LETTER WHOLESALE, AND THE WAX WENT WITH THE CARD. The band was a
 * centred parchment letter — a paper fold, an SVG turbulence grain, and a burgundy wax seal
 * breaking its top edge — on a plain blush ground. All of it is deleted: `.mk-betacard` and its
 * two pseudo-elements, `.mk-wax`, `.mk-waxblob`, `.mk-betaeyebrow`, `.mk-betablurb`,
 * `.mk-betaform`, and the whole `.mk-counter` family. `founding-seal-mark-placeholder.png` is
 * deleted with them; it was the last renderer of the retired paper-plane mark, so nothing on the
 * site draws it now.
 *
 * ⚠️ THE SEAL'S EXCEPTION IS RETIRED RATHER THAN RELOCATED. `marketing.css` recorded it as "the
 * one burgundy fill at scale on this site", an exception about SIZE and not hue. There is no
 * burgundy fill at scale here at all, so the exception has no subject and the plain rule stands
 * again: every burgundy on these pages is a mark under 12px, a hairline, or type.
 *
 * ⚠️ THE ARTWORK IS A CSS BACKGROUND, NOT AN `<img>`, AND THAT IS LOAD-BEARING RATHER THAN
 * CONVENIENT. It has to leave entirely below 1000px, and an inline `style` — which is where a
 * version-stamped `src` would have to live to stay in step with the file — BEATS a media query
 * whatever the query says. This repo has paid for that exact inversion twice, in the rail's
 * collapse and in the help FAB's offset. In the stylesheet the breakpoint simply wins.
 *
 * ⚠️ WHICH MEANS THE CACHE-BUSTING VERSION LIVES IN `marketing.css`. Nothing under `public/` is
 * fingerprinted by the build, so a replaced file is served stale for an hour; the `?v=` is the
 * first eight hex digits of the file's md5 and a lock reads the stylesheet against the file on
 * disk. Replace the picture, change the version — in the CSS, not here.
 *
 * ⚠️ THE LEFT COLUMN IS EMPTY AND HAS NO ELEMENT. The card is placed in column 2 and column 1 is
 * simply the track the artwork shows through. An empty `<div>` to hold the space would be a node
 * in the accessibility tree standing in for a background.
 *
 * ⚠️ THE FORM IS `FoundingSignup`, MOUNTED HERE — one component, three places on the site. The
 * chrome is this file's; the field, the states, the announcement and the count are shared, so
 * signing up in this band leaves `/founders` already answered rather than asking a second time.
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

import React from "react";
import {
  FOUNDING_EYEBROW, FOUNDING_HEADING, FOUNDING_GET_LEAD, FOUNDING_GETS, FOUNDING_IN_RETURN,
} from "./landingCopy";
import { FoundingSignup, FoundingCounter } from "./FoundingSignup";

export const FoundingBand: React.FC<{
  onNavigate: (tab: string, subPageName?: string) => void;
}> = ({ onNavigate }) => (
  <section className="mk-claimband" aria-labelledby="mk-band-h">
    <div className="mk-claimgrid">
      <div className="mk-claimcard">
        <p className="mk-claimkicker">{FOUNDING_EYEBROW}</p>
        <h2 id="mk-band-h" className="mk-claimh2">{FOUNDING_HEADING}</h2>

        <p className="mk-claimlead">{FOUNDING_GET_LEAD}</p>
        {/* A real list, so it is announced as four items rather than four sentences. The ring and
            its centre dot are drawn in CSS — a marker is not content. */}
        <ul className="mk-claimlist">
          {FOUNDING_GETS.map((get) => <li key={get}>{get}</li>)}
        </ul>

        {/* The hairline above this is the paragraph's own `border-top`, not an element between
            them: a rule that exists to separate two blocks belongs to one of them. */}
        <p className="mk-claimask">{FOUNDING_IN_RETURN}</p>

        {/* ⚠️ `source` IS A DATA CONTRACT, NOT A CLASS NAME, AND "sealed-band" STAYS. It is written
            into every waitlist document this band produces and into every one it has already
            produced; `WaitlistSource` is the union the server reads, and anything outside it folds
            to `unknown`. Renaming it to match the artwork would silently split one surface's
            history in two, which is a worse fault than a stale word in an enum. Flagged rather
            than changed — it is an analytics migration, not a rename. */}
        <FoundingSignup
          idPrefix="mk-band"
          source="sealed-band"
          formClass="mk-claimform"
          onNavigate={onNavigate}
        />
        <FoundingCounter variant="claim" />
      </div>
    </div>
  </section>
);
