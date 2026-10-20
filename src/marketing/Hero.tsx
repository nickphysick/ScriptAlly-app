/**
 * Hero — the landing page's opening block (landing hero v3, 20 Oct; ref
 * design-refs/landing-hero-v3.html). "No more winging it." with its sub and two actions on the
 * left, the living query card and its pile on the right, the hawk's shadow cast over both.
 *
 * ⚠️ IT REPLACED THE SHADOW-COLUMN HERO WHOLESALE. "The hunt begins.", the shadow in a column of its
 * own, and the clearance rule that kept the wing off the headline (`--mk-hero-ink`, `--mk-hero-clear`,
 * `--mk-hero-edge`, `--mk-hero-shadow-x`, the `cqw` container) are all retired: the shadow is cast
 * OVER the words now, by design, at .2 and multiplied, and it takes no clicks.
 *
 * ⚠️ THE HERO IS DESIGNED IN A 1280px FRAME AND SCALED TO THE WINDOW, AND `size()` IS THE REF'S.
 * Above 900px the stage is a 1280-wide box scaled by `k = width / 1280`; inside it the hero's height
 * is the window less the nav less 130px (clamped 400–672, in frame units) so the status band always
 * peeks in below; the copy scales with that height (never under 80%) and is centred in it; and the
 * pile scales with it too, its front card's right edge at x = 1075 and its centre on the copy's.
 * ⚠️ ONE DEVIATION, STATED: the nav here is the marketing shell's own and is not scaled, so the hero
 * takes the nav's REAL height (`--mk-nav-h`) off the window before converting to frame units, where
 * the ref — whose nav sits inside its scaled frame — takes 88 frame units. That is what keeps the
 * band peeking in at every width rather than only at 1280.
 *
 * ⚠️ BELOW 900px IT STACKS: the copy in the flow at its own sizes, the pile below it in a box,
 * centred and scaled to fit the width, with its two outermost back cards dropped. The animation
 * still plays. (A default Nick has not ruled on — see the run report.)
 *
 * ⚠️ THE TEXT NEVER ANIMATES. The headline, the sub and both actions are fully present at first
 * paint; only the pile and the shadow move (`HeroCard.tsx`).
 */

import React, { useLayoutEffect, useRef } from "react";
import { HERO_H1_LINES, HERO_SUB_LINES, HERO_SUB_BRAND, HERO_CTA, HERO_LINK } from "./landingCopy";
import { HeroCard } from "./HeroCard";

/* The ref's own numbers, in frame units. */
const FRAME_W = 1280, PEEK = 130, HMAX = 672, HMIN = 400, RIGHT = 1075, NARROW = 900;

/** The ref's `size()`, against the app's elements. */
function size(wrap: HTMLElement) {
  const copy = wrap.querySelector<HTMLElement>(".mk-herocopy");
  const pile = wrap.querySelector<HTMLElement>(".mk-hc-pile");
  const card = wrap.querySelector<HTMLElement>('[data-hc="front"]');
  const cast = wrap.querySelector<HTMLElement>(".mk-lc-cast");
  const box = wrap.querySelector<HTMLElement>(".mk-herobox");
  if (!copy || !pile || !card || !cast || !box) return;
  const w = wrap.clientWidth, vh = window.innerHeight;
  const nav = parseFloat(getComputedStyle(wrap).getPropertyValue("--mk-nav-h")) || 88;

  if (w < NARROW) {
    /* Stacked: the copy flows, and the pile is scaled to the box's width with the front card centred
       in it. The shadow is re-placed across the box rather than 438 frame units to the card's left,
       where at a phone's scale it would run off the screen. */
    wrap.classList.add("mk-herowrap--narrow");
    wrap.style.removeProperty("--mk-hero-k"); wrap.style.removeProperty("--mk-hero-h");
    copy.style.transform = ""; copy.style.top = "";
    /* Centred on what is VISIBLE — the front card and the two back cards left showing — rather than
       on the front card alone, which put the right-hand back card past a phone's edge. */
    const shown = [...pile.querySelectorAll<HTMLElement>(".mk-lc")].filter((c) => c.offsetParent !== null);
    const left = Math.min(...shown.map((c) => c.offsetLeft));
    const right = Math.max(...shown.map((c) => c.offsetLeft + c.offsetWidth));
    const bw = box.clientWidth, pad = 34;
    const s = Math.min(1, (bw - 32) / (right - left));
    const dx = (bw - (right - left) * s) / 2 - left * s;
    const dy = pad - card.offsetTop * s;
    pile.style.transform = `translate(${dx}px,${dy}px) scale(${s})`;
    box.style.height = Math.round(card.offsetHeight * s + pad * 2) + "px";
    const cw = (bw - 56) / s;
    cast.style.width = cw + "px";
    cast.style.left = (28 - dx) / s + "px";
    cast.style.top = card.offsetTop + (card.offsetHeight - cw * (1197 / 1400)) / 2 + "px";
    return;
  }

  wrap.classList.remove("mk-herowrap--narrow");
  box.style.height = ""; cast.style.width = ""; cast.style.left = ""; cast.style.top = "";
  const k = w / FRAME_W;
  const heroH = Math.round(Math.max(HMIN, Math.min(HMAX, (vh - nav) / k - PEEK)));
  const s = heroH / HMAX;
  wrap.style.setProperty("--mk-hero-k", String(k));
  wrap.style.setProperty("--mk-hero-h", heroH + "px");
  const cs = Math.max(.8, Math.min(1, s + .18));
  copy.style.transform = `scale(${cs})`;
  copy.style.top = Math.max(20, Math.round((heroH - copy.offsetHeight * cs) / 2)) + "px";
  // the pile: its right edge sits in from the frame, and the front card is centred on the copy block
  const cTop = parseFloat(copy.style.top), cMid = cTop + copy.offsetHeight * cs / 2;
  const cardMidY = card.offsetTop + card.offsetHeight / 2, cardRight = card.offsetLeft + card.offsetWidth;
  const dx = RIGHT - cardRight * s, dy = cMid - cardMidY * s;
  pile.style.transform = `translate(${dx}px,${dy}px) scale(${s})`;
}

export const Hero: React.FC<{
  onNavigate: (tab: string, subPageName?: string) => void;
}> = ({ onNavigate }) => {
  const wrap = useRef<HTMLDivElement>(null);

  /* ⚠️ A LAYOUT EFFECT, SO THE FIRST PAINT IS ALREADY SIZED; then again on resize and once the fonts
     arrive, because the copy's height — which centres everything — is a fact about the loaded face. */
  useLayoutEffect(() => {
    const el = wrap.current; if (!el) return;
    let raf = 0, live = true;
    const run = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => size(el)); };
    size(el);
    window.addEventListener("resize", run);
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    fonts?.ready.then(() => { if (live) size(el); }, () => {});
    return () => { live = false; window.removeEventListener("resize", run); cancelAnimationFrame(raf); };
  }, []);

  const [lead, tail] = HERO_SUB_LINES;
  const at = tail.indexOf(HERO_SUB_BRAND);
  return (
    <div className="mk-herowrap" ref={wrap}>
      <section className="mk-hero">
        <div className="mk-herocopy">
          {/* Two blocks, one sentence: the break is the design's. The space between them is real
              text, so the heading's accessible name is the sentence. */}
          <h1 className="mk-herotitle">
            <span className="mk-hl">{HERO_H1_LINES[0]}</span>{" "}<span className="mk-hl">{HERO_H1_LINES[1]}</span>
          </h1>
          <p className="mk-herosub">
            {lead}<br />
            {tail.slice(0, at)}<b>{HERO_SUB_BRAND}</b>{tail.slice(at + HERO_SUB_BRAND.length)}
          </p>
          <div className="mk-heroctas">
            {/* ⚠️ A BUTTON, NOT AN ANCHOR. Marketing routes are driven by `onNavigate`. */}
            <button type="button" className="mk-heropill" onClick={() => onNavigate("founders")}>
              {HERO_CTA}
            </button>
            {/* ⚠️ AN ANCHOR, BECAUSE THIS ONE REALLY IS AN IN-PAGE JUMP — to the status band, whose
                `id="pulse"` and `scroll-margin-top` keep its heading clear of the sticky nav. */}
            <a className="mk-herolink" href="#pulse">{HERO_LINK}</a>
          </div>
        </div>
        <div className="mk-herobox">
          <HeroCard host={wrap} />
        </div>
      </section>
    </div>
  );
};
