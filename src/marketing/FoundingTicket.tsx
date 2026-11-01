/**
 * FoundingTicket — the founding sign-up at the foot of the landing page on phones (≤760px; waitlist v2,
 * 1 Nov; ref design-refs/landing-mobile-v17.html `.tkt`). It replaces `FoundingClose`'s card.
 *
 * A pass: a blush stub ("Founding writer pass", the next place's number "No. N" over "of 50", the
 * founding-pass bird clipped by the stub's rounded corner), a dashed tear line with a half-circle notch
 * each side, then the body — the heading, the lead, the four gets with their lead phrases in bold, the
 * shared sign-up, the places counter, the note and Privacy.
 *
 * ⚠️ THE NUMBER IS THE STORE'S, LIVE OR ABSENT: the next place is `claimed + 1` from the same reading
 * `HeroPlaces` takes. Unloaded, the stub shows the label alone; with the cap reached it reads "All fifty
 * taken" on two lines, clear of the bird. Never a number that is not the next place.
 * ⚠️ THE BIRD IS WHOLLY INSIDE THE STUB (founding emails v1, phase 2): ~150px, 10px in from the right
 * and 6px up from the bottom, never cut by the stub's rounded corner. EM-5 measures its box.
 * ⚠️ THE FORM IS THE SHARED ONE AND ITS `source` IS UNCHANGED ("sealed-band", the server's value). The
 * small capitals on the stub's label are a ticket's printing, the one place on this page they are used.
 * ⚠️ `FOUNDING_GETS` IS NOT EDITED TO BOLD ITS LEADS: other pages read it. `FOUNDING_GET_LEADS` names
 * each lead and the ticket splits the string there.
 */
import React from "react";
import {
  FOUNDING_GETS, FOUNDING_GET_LEADS, CLOSE_HEADING, CLOSE_LEAD, CLOSE_NOTE, PASS_FULL, PASS_LABEL, passNumber, passOf,
} from "./landingCopy";
import { FoundingSignup } from "./FoundingSignup";
import { HeroPlaces } from "./HeroPlaces";
import { useFounding } from "./foundingStore";
import { Ticks, CLOSE_FORM, v } from "./WaitlistParts";

/** The bird on the stub (supplied flipped). The version is the first eight hex digits of its md5. */
export const PASS_BIRD = { src: "/images/founding-pass-bird.webp", version: "d7ed915b", width: 915, height: 645 };

/** Each get with its lead phrase in bold: the string is split at its lead, never retyped. */
export const ticketGets = () => FOUNDING_GETS.map((g, i) => {
  const lead = FOUNDING_GET_LEADS[i];
  return g.startsWith(lead) ? { b: lead, rest: g.slice(lead.length) } : g;
});

/** The next place's number, or null when there is none to state. */
export const nextPlace = (count: { cap: number; claimed: number } | null | undefined): { n: number; cap: number } | null =>
  count && count.cap > 0 && count.claimed < count.cap ? { n: count.claimed + 1, cap: count.cap } : null;

/** True only when a loaded count says the places are gone. Unloaded is never "full". */
export const placesGone = (count: { cap: number; claimed: number } | null | undefined): boolean =>
  !!count && count.cap > 0 && count.claimed >= count.cap;

export const FoundingTicket: React.FC<{ onNavigate: (tab: string, subPageName?: string) => void }> = ({ onNavigate }) => {
  const { count } = useFounding();
  const place = nextPlace(count);
  const gone = placesGone(count);
  return (
    <section className="mk-close" aria-labelledby="mk-close-h">
      <div className="mk-tkt" id={CLOSE_FORM + "-signup"}>
        <div className="mk-tkt-stub">
          <div className="mk-tkt-st">
            <small>{PASS_LABEL}</small>
            {place && <><b>{passNumber(place.n)}</b><span>{passOf(place.cap)}</span></>}
            {gone && <b className="mk-tkt-full">{PASS_FULL}</b>}
          </div>
          <img src={v(PASS_BIRD)} alt="" width={PASS_BIRD.width} height={PASS_BIRD.height} loading="lazy" />
        </div>
        <div className="mk-tkt-perf" aria-hidden="true" />
        <div className="mk-tkt-body">
          <h2 id="mk-close-h" className="mk-cch2">{CLOSE_HEADING}</h2>
          <p className="mk-cclead">{CLOSE_LEAD}</p>
          <Ticks items={ticketGets()} />
          <FoundingSignup idPrefix={CLOSE_FORM} source="sealed-band" formClass="mk-ccform" onNavigate={onNavigate}
            afterForm={<><HeroPlaces variant="line" /><p className="mk-ccnote">{CLOSE_NOTE}</p></>} />
        </div>
      </div>
    </section>
  );
};
