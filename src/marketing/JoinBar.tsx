/**
 * JoinBar — the founding ask that follows a reader down the landing page on phones (≤760px; landing on
 * phones v2, 26 Oct; ref design-refs/landing-mobile-v2.html `.bbar` and its `upd()`). A rounded navy
 * bar floating 12px above the bottom (plus the safe-area inset) and 10px from each side: "Become a
 * founding writer", a small pink track with "N places left" beneath it, and a pink "Join" on the right.
 * The whole bar is one link to the founding sign-up — the closing card's form, further down this page.
 *
 * ⚠️ WHEN IT SHOWS IS DERIVED FROM WHERE THINGS ARE, READ ON SCROLL (the ref's rule):
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

/** Away while the closing card's top is above this share of the viewport (the ref's .85). */
const CARD_AT = 0.85;

const reduce = () =>
  typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
      const head = document.querySelector(".mk-hp-head");
      const card = document.querySelector(".mk-ccard");
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
  const taken = live && cap > 0 ? (claimed / cap) * 100 : 0;

  const go = (ev: React.MouseEvent<HTMLAnchorElement>) => {
    const field = document.getElementById("mk-close-email");
    const target = field ?? document.querySelector<HTMLElement>(".mk-close");
    if (!target) return; // no card on the page: the href (/founders) does the work
    ev.preventDefault();
    target.scrollIntoView({ behavior: reduce() ? "auto" : "smooth", block: "center" });
    field?.focus({ preventScroll: true });
  };

  if (!host) return null;
  return createPortal(
    <a className={"mk-jbar" + (on ? " mk-on" : "")} href="/founders" onClick={go}
       aria-hidden={on ? undefined : true} tabIndex={on ? undefined : -1} data-live={live ? "1" : undefined}>
      <span className="mk-jbt">
        <b>{HERO_CTA}</b>
        {live && (
          <span className="mk-jbc">
            <i aria-hidden="true"><em style={{ width: `${taken}%` }} /></i>
            {navPlacesLeft(left)}
          </span>
        )}
      </span>
      <span className="mk-jbj">{JOIN_BAR_CTA}</span>
    </a>,
    host,
  );
};
