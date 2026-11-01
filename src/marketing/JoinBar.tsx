/**
 * JoinBar — the founding ask that follows a reader down the landing page on phones (≤760px; landing on
 * phones v2, 26 Oct; ref design-refs/landing-mobile-v2.html `.bbar` and its `upd()`). A rounded navy
 * bar floating 12px above the bottom (plus the safe-area inset) and 10px from each side: "Become a
 * founding writer", a small pink track with "N places left" beneath it, and a pink "Join" on the right.
 * The whole bar is one button to the founding sign-up — the closing card's form, further down this page.
 *
 * ⚠️ WAITLIST v2 (1 Nov): the founding card is the founding PASS now (`FoundingTicket`, `.mk-tkt`), and the
 * bar watches it.
 * ⚠️ WAITLIST v1 (31 Oct, ref design-refs/landing-mobile-v7.html `.jbar`): it is a BUTTON that scrolls to
 * the founding card's sign-up — never a link to /founders — and the rule below changed with the page:
 *   · up once the hero's sign-up has scrolled under the bar;
 *   · away from the moment the founding card's top reaches 90% of the viewport, and it STAYS away below
 *     that (the card is "in or above view" all the way down), so it can never come back over the footer.
 * Scrolling back up above the card brings it back.
 *
 * ⚠️ (history) WHEN IT SHOWED WAS DERIVED FROM WHERE THINGS WERE, READ ON SCROLL (the v2 ref's rule):
 *   · up once the hero has gone — the drawer's head, which holds its sign-up, has its foot above the
 *     sticky bar's — so it never covers the drawer's own ask;
 *   · away while the closing founding card's top is above 85% of the viewport, so the ask never
 *     appears twice at once; scrolling back up brings it back.
 * It slides (0.35s); under reduced motion it simply shows and hides.
 *
 * ⚠️ THE FIGURE IS THE STORE'S, LIVE OR ABSENT. Until the count arrives the bar shows the words and
 * Join, and no track and no number — never a placeholder.
 *
 * ⚠️ PORTALLED INTO `.mk-scope`, NOT `document.body`: it is `position: fixed` (so it must escape the
 * drawer sheet's stacking), and the tier's tokens and faces are declared on `.mk-scope` — outside it
 * every `var(--mk-…)` would resolve to nothing. Landing page only (`Landing` mounts it on phones).
 */
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useFounding, ensureCount } from "./foundingStore";
import { HERO_CTA, JOIN_BAR_CTA, navPlacesLeft } from "./landingCopy";
import { HERO_FORM, CLOSE_FORM, scrollToForm } from "./WaitlistParts";

/** Away while the closing card's top is above this share of the viewport (the v7 ref's .9). */
export const CARD_AT = 0.9;


export const JoinBar: React.FC = () => {
  useEffect(ensureCount, []);
  const { count, state } = useFounding();
  const live = !!count && state !== "down";
  const [on, setOn] = useState(false);
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => { setHost(document.querySelector<HTMLElement>(".mk-scope")); }, []);

  useEffect(() => {
    let raf = 0;
    const read = () => {
      raf = 0;
      const bar = document.querySelector(".mk-navwrap")?.getBoundingClientRect().bottom ?? 0;
      const head = document.getElementById(HERO_FORM + "-signup");
      const card = document.querySelector(".mk-tkt");
      const past = !!head && head.getBoundingClientRect().bottom < bar;
      const cardIn = !!card && card.getBoundingClientRect().top < window.innerHeight * CARD_AT;
      const next = past && !cardIn;
      setOn((was) => (was === next ? was : next));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(read); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    read();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, []);

  const cap = count?.cap ?? 0, claimed = Math.min(count?.claimed ?? 0, cap);
  const left = Math.max(0, cap - claimed);

  if (!host) return null;
  return createPortal(
    <button type="button" className={"mk-jbar" + (on ? " mk-on" : "")} onClick={() => scrollToForm(CLOSE_FORM)}
       aria-hidden={on ? undefined : true} tabIndex={on ? undefined : -1} data-live={live ? "1" : undefined}>
      <span className="mk-jbt">
        <b>{HERO_CTA}</b>
        {live && <small>{navPlacesLeft(left)}</small>}
      </span>
      <span className="mk-jbj">{JOIN_BAR_CTA}</span>
    </button>,
    host,
  );
};
