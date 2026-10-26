/**
 * FoundingClose — the closing founding card on phones (≤760px; landing on phones v1, 26 Oct; ref
 * design-refs/landing-mobile-v1.html `.close`, `.ccard`). It replaces `FoundingBand` on the landing
 * page at phone width: stacked, the band's pointing hawks pointed at nothing, and a short card that
 * hands on to /founders says the same in a screen. The desktop keeps `FoundingBand`, and so does
 * /founders.
 *
 * A white card fading to blush, the off-the-ground hawks sitting on its top-right corner (over its top
 * edge, as in the ref), the band's own eyebrow as a pill, the heading, the lead, the four bullets
 * (`FOUNDING_GETS` — the one statement of the offer), the shared sign-up, the shared counter, the ask,
 * and a link to /founders.
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
import { FOUNDING_EYEBROW, FOUNDING_GETS, CLOSE_HEADING, CLOSE_LEAD, CLOSE_NOTE, CLOSE_LINK } from "./landingCopy";
import { FoundingSignup } from "./FoundingSignup";
import { HeroPlaces } from "./HeroPlaces";

/** The hawks. The version is the first eight hex digits of the file's md5 (as `/founders` and Auth). */
const ART = { src: "/images/off-the-ground.png", version: "430029d2", width: 1200, height: 1200 };

/** The ref's ring-tick marker, drawn once. */
const Tick: React.FC = () => (
  <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false">
    <circle cx="10" cy="10" r="8" fill="none" stroke="#a2452a" strokeWidth="1.6" />
    <path d="M6.2 10.3 8.8 12.8 13.8 7.6" fill="none" stroke="#a2452a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const FoundingClose: React.FC<{
  onNavigate: (tab: string, subPageName?: string) => void;
}> = ({ onNavigate }) => (
  <section className="mk-close" aria-labelledby="mk-close-h">
    <div className="mk-ccard">
      <img className="mk-ccart" src={ART.src + "?v=" + ART.version} alt="" width={ART.width} height={ART.height} loading="lazy" />
      <span className="mk-ccpill">{FOUNDING_EYEBROW}</span>
      <h2 id="mk-close-h" className="mk-cch2">{CLOSE_HEADING}</h2>
      <p className="mk-cclead">{CLOSE_LEAD}</p>
      <ul className="mk-cclist">
        {FOUNDING_GETS.map((get) => <li key={get}><Tick /><span>{get}</span></li>)}
      </ul>
      <FoundingSignup idPrefix="mk-close" source="sealed-band" formClass="mk-ccform" onNavigate={onNavigate} />
      <HeroPlaces />
      <p className="mk-ccnote">{CLOSE_NOTE}</p>
      <a className="mk-ccmore" href="/founders" onClick={(e) => { e.preventDefault(); onNavigate("founders"); }}>
        {CLOSE_LINK}
      </a>
    </div>
  </section>
);
