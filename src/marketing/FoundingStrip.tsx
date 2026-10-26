/**
 * The founding strip — phones only (≤760px; landing on phones v1, 26 Oct; ref
 * design-refs/landing-mobile-v1.html `.fs.fsC`). A 40px navy band ABOVE the top bar: "Become a
 * founding writer", a track whose pink fill is the share of places TAKEN, and "{left} left". The whole
 * strip is one link to the founding sign-up. It sits in flow, so it scrolls away with the page while
 * the bar below it stays stuck at the top.
 *
 * ⚠️ IT REPLACES `FoundingNavPill`, WHICH IS DELETED RATHER THAN LEFT BESIDE IT. The pill sat inside
 * the bar and looked shoehorned in; the bar is now the logo and the menu and nothing else.
 *
 * ⚠️ THE FIGURES ARE THE STORE'S, NEVER THE REF'S. The ref shows 48 of 50; the cap is `FOUNDING_CAP`
 * (applied once, in `foundingStore`) and the number claimed is the server's. With no count yet, or the
 * store `down`, only the words render — no track, no number, no zero (the live-or-absent rule every
 * founding counter keeps). At 0 places left it simply reads "0 left" over a full track: "full" is the
 * server's to decide on a submission, and no counter on the site decides it from arithmetic.
 *
 * The number counts DOWN from the cap to the places left and the fill grows, ONCE: ease-out over 1.4s,
 * starting 0.6s after mount, or the moment the count arrives if that is later (the retired pill's
 * timing, so every counter on the site moves alike). Under reduced motion the final figures at once.
 *
 * ⚠️ WHERE THE LINK GOES. On the landing page it is the page's own sign-up: the drawer's, if the drawer
 * has grown (it has, a moment after the card's first run — and the strip is only on screen at the top,
 * which is where the drawer is); otherwise the closing card's, further down the same page. Everywhere
 * else it is `/founders`, whose hero is the sign-up. The `href` is `/founders` either way, so the link
 * still goes somewhere useful with no script.
 */
import React, { useEffect, useRef, useState } from "react";
import { useFounding, ensureCount } from "./foundingStore";
import { HERO_CTA, navPlacesLeft, stripPlacesLeft } from "./landingCopy";

const DELAY = 600, DUR = 1400;

const reduce = () =>
  typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The landing page's sign-up field to take the reader to, or null when there is none to show. */
const landingField = (): HTMLElement | null =>
  document.querySelector<HTMLElement>(".mk-hp-sheet--grown #mk-drawer-email") ??
  document.getElementById("mk-close-email");

export const FoundingStrip: React.FC<{
  path: string;
  onNavigate: (tab: string, subPageName?: string) => void;
}> = ({ path, onNavigate }) => {
  useEffect(ensureCount, []);
  const { count, state } = useFounding();
  const born = useRef(typeof performance !== "undefined" ? performance.now() : 0);
  const [e, setE] = useState(() => (reduce() ? 1 : 0));
  const live = !!count && state !== "down";

  useEffect(() => {
    if (!live || reduce()) { if (live) setE(1); return; }
    let raf = 0;
    const t0 = Math.max(born.current + DELAY, performance.now());
    const tick = (now: number) => {
      const p = Math.max(0, Math.min(1, (now - t0) / DUR));
      setE(1 - Math.pow(1 - p, 3));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [live]);

  const cap = count?.cap ?? 0, claimed = Math.min(count?.claimed ?? 0, cap);
  const left = Math.max(0, cap - claimed);
  const taken = live && cap > 0 ? (claimed / cap) * 100 : 0;

  const go = (ev: React.MouseEvent<HTMLAnchorElement>) => {
    ev.preventDefault();
    if (path !== "/") { onNavigate("founders"); return; }
    const field = landingField();
    const target = field ?? document.querySelector<HTMLElement>(".mk-close");
    if (!target) { onNavigate("founders"); return; }
    target.scrollIntoView({ behavior: reduce() ? "auto" : "smooth", block: "center" });
    field?.focus({ preventScroll: true });
  };

  return (
    <a className="mk-fs" href="/founders" onClick={go} data-live={live ? "1" : undefined}>
      <span className="mk-fs-t">{HERO_CTA}</span>
      {live && (
        <>
          <span className="mk-fs-tr" aria-hidden="true">
            <b style={{ width: `${taken * e}%` }} />
          </span>
          {/* The number a reader hears is the final one; the count-down is for the eye. */}
          <span className="mk-fs-n" aria-hidden="true">{stripPlacesLeft(Math.round(cap + (left - cap) * e))}</span>
          <span className="mk-sr">{navPlacesLeft(left)}</span>
        </>
      )}
    </a>
  );
};
