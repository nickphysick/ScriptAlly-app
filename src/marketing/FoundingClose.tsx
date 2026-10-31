/**
 * FoundingClose — the closing founding card on phones (≤760px; landing on phones v1, 26 Oct; ref
 * design-refs/landing-mobile-v1.html `.close`, `.ccard`). It replaces `FoundingBand` on the landing
 * page at phone width (waitlist v1: design-refs/landing-mobile-v7.html): stacked, the band's pointing hawks pointed at nothing, and a short card that
 * says the same in a screen. The desktop keeps `FoundingBand`, and so does
 * /founders.
 *
 * A white card fading to blush, the off-the-ground hawks sitting on its top-right corner (over its top
 * edge, as in the ref), the heading, the lead, the four bullets (`FOUNDING_GETS` — the one statement of
 * the offer), the shared sign-up, the shared counter under the button, and the ask ending on Privacy.
 *
 * ⚠️ THE FORM AND THE COUNTER ARE THE SHARED ONES, WITH THIS CARD'S CHROME. `FoundingSignup` is the
 * site's one sign-up and `source="sealed-band"` is the landing band's existing value — the contract
 * the server reads; a new value would fold to "unknown". The counter is `HeroPlaces`, the shared
 * "bar + N places left" counter the desktop hero draws: it is the ref's `.ct` exactly, which neither
 * `FoundingCounter` variant is, and both read the one `foundingStore`.
 *
 * ⚠️ `alt=""` ON THE HAWKS: the card states the offer in words; the drawing decorates it.
 */
import React from "react";
import { FOUNDING_GETS, CLOSE_HEADING, CLOSE_LEAD, CLOSE_NOTE } from "./landingCopy";
import { FoundingSignup } from "./FoundingSignup";
import { HeroPlaces } from "./HeroPlaces";
import { Ticks, CLOSE_FORM } from "./WaitlistParts";

/** The hawks. The version is the first eight hex digits of the file's md5 (as `/founders` and Auth). */
const ART = { src: "/images/off-the-ground.png", version: "430029d2", width: 1200, height: 1200 };

/**
 * ⚠️ WAITLIST v1 (31 Oct, ref design-refs/landing-mobile-v7.html `.close`): the "Founding writers" pill and
 * the "How being a founding writer works →" link to /founders are RETIRED — the page links nowhere but
 * Privacy. The places counter sits under the button, and the note under it ends on the privacy link.
 */
export const FoundingClose: React.FC<{
  onNavigate: (tab: string, subPageName?: string) => void;
}> = ({ onNavigate }) => (
  <section className="mk-close" aria-labelledby="mk-close-h">
    <div className="mk-ccard" id={CLOSE_FORM + "-signup"}>
      <img className="mk-ccart" src={ART.src + "?v=" + ART.version} alt="" width={ART.width} height={ART.height} loading="lazy" />
      <h2 id="mk-close-h" className="mk-cch2">{CLOSE_HEADING}</h2>
      <p className="mk-cclead">{CLOSE_LEAD}</p>
      <Ticks items={FOUNDING_GETS} />
      <FoundingSignup idPrefix={CLOSE_FORM} source="sealed-band" formClass="mk-ccform" onNavigate={onNavigate}
        afterForm={<><HeroPlaces variant="line" /><p className="mk-ccnote">{CLOSE_NOTE}</p></>} />
    </div>
  </section>
);
