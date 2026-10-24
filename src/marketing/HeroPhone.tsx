/**
 * HeroPhone — the landing hero at and below 760px (23 Oct; ref design-refs/landing-hero-mobile-v1.html,
 * designed in a 390 × 844 frame). The living card sits straight under the header on a navy stage, and
 * the rest of the page is a cream sheet pulled up over it.
 *
 * ⚠️ THE DRAWER IS THE TOP OF THE REST OF THE PAGE. Everything after the hero — the status band, the
 * feature rows, the rest — is rendered INSIDE the sheet (`children`), so swiping up is ordinary
 * scrolling: the stage is sticky behind it, the sheet rises over it, its corners square off as it
 * meets the header (26 → 0 across the travel), the grab handle fades, and the card eases back to .94.
 * In the ref the phone frame is the scroll container; here the window scrolls, and every number below
 * is the ref's read against the window.
 *
 * ⚠️ "No more winging it." IS THE STRAPLINE HERE AND THE DESKTOP H1 IS NOT RENDERED AT ALL — the
 * phrase is on the page exactly once at every width. The drawer's question is the page's one h1.
 *
 * ⚠️ WHEN THE STORY'S FIRST RUN ENDS, AND ONLY IF THE READER HAS NOT SCROLLED, THE DRAWER RISES 128px
 * and the founding sign-up opens inside it — a real `FoundingSignup`, one state machine with every
 * other surface. It grows once: the story then loops on the card (v3) and never shrinks it. The card
 * eases back so its final panel stays in view. Under reduced motion the drawer is already grown.
 */
import React, { useCallback, useLayoutEffect, useRef } from "react";
import { HeroCard, PHONE_BACKS, PHONE_FRONT_ROTATE } from "./HeroCard";
import { FoundingSignup, formIsVisible } from "./FoundingSignup";
import { useFounding } from "./foundingStore";
import { HERO_H1, HERO_LINK, HERO_PHONE_Q, HERO_PHONE_SIGNUP, HERO_PHONE_JOIN } from "./landingCopy";

/* The binocular hawk in the drawer (ref `.bird`). The version is the file's own md5, first 8. */
export const HERO_BIRD = { src: "/images/binocular-hawk.webp", version: "6e3c0031", width: 380, height: 372 };

/* The ref's numbers. */
const REST = 250, GROWN = 378;          // the drawer's resting and grown heights
/* GUTTER 4 (v3): the ref's .73 at 390 × 844 brings the outermost back card within ~5px of the screen's
   edge, so v1's 16px gutter would have forced .69 on the ref's own screen. Nothing is cut off. */
const S_MAX = .73, S_MIN = .45, TOP_MIN = 24, GUTTER = 4;
/**
 * L2 (v3) — the ref's placement at 390 × 844 (S .73, TOP 64) expressed in the CARD's own units: the
 * drawer's resting top sits this far below the card's top, (784 − 250 − 64) / .73. Held at every size,
 * it keeps the footer entirely under the drawer and the reminder and final panel above it — the
 * window between the two is the 12px above the footer's rule, so it scales with the card.
 */
const DRAWER_DEPTH = (784 - REST - 64) / .73;
const K_REST = 1, K_GROWN = .86, K_SCROLLED = .06;
/* The gap kept between the last panel and the grown drawer's top. The ref's own .86 leaves just
   under 3px at 390 × 844 (measured 2.9–3.2), so 2 keeps the derived scale at exactly .86 there. */
const PANEL_CLEAR = 2;

const reduceMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The pile's scale and top (v3, L2). The ref's .73 and 64px at 390 × 844; elsewhere the card keeps the
 * ref's depth below the drawer (`DRAWER_DEPTH`), so the footer is always hidden and the final panel
 * always shows. The scale is smaller only where the width needs it (all five cards inside the
 * screen, 4px clear) or where the card would otherwise rise within 24px of the header — never below .45.
 * The widths are worked from each card's own transform (the ref's numbers), never from a measured
 * rect: the entrance deals the cards in from 720px off to the right, so a rect read now would be
 * the animation's, not the layout's.
 */
export function phonePileFit(screenW: number, stageH: number, front: { w: number; h: number }, backH: number): { s: number; top: number } {
  const rad = (d: number) => Math.abs(d) * Math.PI / 180;
  const half = (w: number, h: number, r: number, s: number) => s * (w / 2 * Math.cos(rad(r)) + h / 2 * Math.sin(rad(r)));
  let reach = half(front.w, front.h, PHONE_FRONT_ROTATE, 1);
  for (const b of PHONE_BACKS) reach = Math.max(reach, Math.abs(b.tx) + half(front.w, backH, b.r, b.s));
  const sW = (screenW / 2 - GUTTER) / reach;
  const sH = (stageH - REST - TOP_MIN) / DRAWER_DEPTH;
  const s = Math.max(S_MIN, Math.min(S_MAX, sW, sH));
  return { s, top: Math.max(TOP_MIN, stageH - REST - DRAWER_DEPTH * s) };
}

/** The sign-up inside the drawer: its line, then the shared form. The line goes with the form. */
const DrawerSignup: React.FC<{ onNavigate: (tab: string, subPageName?: string) => void }> = ({ onNavigate }) => {
  const { state } = useFounding();
  return (
    <div className="mk-hp-su">
      {formIsVisible(state) && <p className="mk-hp-suline">{HERO_PHONE_SIGNUP}</p>}
      <FoundingSignup
        idPrefix="mk-drawer"
        formClass="mk-hp-suform"
        ctaLabel={HERO_PHONE_JOIN}
        /* ⚠️ `landing-panel`, NOT A NEW SOURCE: the server's `readSource` accepts a fixed list and
           maps anything else to "unknown", so a new value would need a functions deploy. This is
           the landing page's own sign-up, which is what that source has always meant. */
        source="landing-panel"
        onNavigate={onNavigate}
      />
    </div>
  );
};

export const HeroPhone: React.FC<{
  onNavigate: (tab: string, subPageName?: string) => void;
  children: React.ReactNode;
}> = ({ onNavigate, children }) => {
  const wrap = useRef<HTMLDivElement>(null);
  /* The drawer's state lives in refs and classes, never React state: the sheet holds the whole rest
     of the page, and the card above must never re-render. */
  const st = useRef({ grown: false, k: K_REST, kGrown: K_GROWN, run: 0, stageH: 0 });

  const parts = () => {
    const el = wrap.current;
    return el && {
      stage: el.querySelector<HTMLElement>(".mk-hp-stage")!,
      hero: el.querySelector<HTMLElement>(".mk-hp-hero")!,
      pile: el.querySelector<HTMLElement>(".mk-hc-pile")!,
      front: el.querySelector<HTMLElement>('[data-hc="front"]')!,
      back: el.querySelector<HTMLElement>(".mk-lc--back"),
      sheet: el.querySelector<HTMLElement>(".mk-hp-sheet")!,
      grab: el.querySelector<HTMLElement>(".mk-hp-grab")!,
    };
  };

  /** The sheet follows the scroll across its travel; past it, it is simply the page. */
  const onScroll = useCallback(() => {
    const p0 = parts(); if (!p0) return;
    const s = st.current, p = s.run > 0 ? Math.max(0, Math.min(1, window.scrollY / s.run)) : 0;
    const r = 26 * (1 - p);
    p0.sheet.style.borderRadius = `${r}px ${r}px 0 0`;
    p0.grab.style.opacity = String(1 - p);
    p0.hero.style.transform = `scale(${s.k * (1 - K_SCROLLED * p)})`;
  }, []);

  /** The stage is the window less the header, measured; the pile is fitted into it. */
  const layout = useCallback(() => {
    const p0 = parts(); if (!p0) return;
    const nav = document.querySelector<HTMLElement>(".mk-nav")?.offsetHeight || 60;
    const s = st.current;
    s.stageH = window.innerHeight - nav;
    p0.stage.style.height = s.stageH + "px";
    const f = { w: p0.front.offsetWidth, h: p0.front.offsetHeight };
    const { s: S, top } = phonePileFit(p0.stage.clientWidth, s.stageH, f, p0.back?.offsetHeight || 600);
    const cx = p0.front.offsetLeft + f.w / 2;
    p0.pile.style.transform = `translate(${p0.stage.clientWidth / 2 - cx * S}px,${top - p0.front.offsetTop * S}px) scale(${S})`;
    p0.pile.dataset.scale = S.toFixed(3);
    /* ⚠️ THE GROWN SCALE IS THE REF'S REASON, NOT ITS NUMBER. The ref eases the card to .86 "so its
       final panel stays visible; only its footer is covered" — true at 390 × 844 and false on a short
       phone, where the grown drawer covered the panel by 60px. So the grown scale is the smaller of
       .86 and the scale that keeps the panel PANEL_CLEAR above the grown drawer. At 390 × 844 that is
       .86 exactly; at 375 × 667 it is smaller. The panel's place is worked from offsets (the deal
       has the card 760px off to the right at this moment, so a rect would be the animation's), plus
       the corner the .8° turn carries down. The card scales about the stage's top (origin 50% 0). */
    const slot = p0.front.querySelector<HTMLElement>('[data-hc="slot"]');
    if (slot) {
      let y = slot.offsetHeight;
      for (let n: HTMLElement | null = slot; n && n !== p0.front; n = n.offsetParent as HTMLElement | null) y += n.offsetTop;
      const turn = f.w / 2 * Math.sin(PHONE_FRONT_ROTATE * Math.PI / 180);
      const panelBottom = top + S * (y + turn);
      s.kGrown = Math.min(K_GROWN, (s.stageH - GROWN - PANEL_CLEAR) / panelBottom);
      p0.pile.dataset.kGrown = s.kGrown.toFixed(3);
      if (s.grown) s.k = s.kGrown;
    }
    s.run = s.stageH - (s.grown ? GROWN : REST);
    onScroll();
  }, [onScroll]);

  /** Called by the story 1.5s after it ends — and once only, and only if nobody has scrolled. */
  const grow = useCallback((instant = false) => {
    const p0 = parts(), s = st.current;
    if (!p0 || s.grown) return;
    if (!instant && window.scrollY > 4) return;
    s.grown = true;
    p0.sheet.classList.add("mk-hp-sheet--grown");
    if (!instant) {
      p0.hero.style.transition = "transform .8s cubic-bezier(.2,.8,.2,1)";
      window.setTimeout(() => { p0.hero.style.transition = ""; }, 900);
    }
    s.k = s.kGrown;
    s.run = s.stageH - GROWN;
    onScroll();
  }, [onScroll]);
  const onGrow = useCallback(() => grow(false), [grow]);

  useLayoutEffect(() => {
    layout();
    if (reduceMotion()) grow(true);
    let raf = 0;
    const onResize = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(layout); };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, { passive: true });
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    let live = true;
    fonts?.ready.then(() => { if (live) layout(); }, () => {});
    return () => {
      live = false; cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
    };
  }, [layout, grow, onScroll]);

  /* The grab handle takes the sheet to the header, or back down if it is already there. */
  const toggle = () => {
    const s = st.current;
    window.scrollTo({ top: window.scrollY < s.run - 4 ? s.run : 0, behavior: reduceMotion() ? "auto" : "smooth" });
  };

  return (
    <div className="mk-hp" ref={wrap}>
      <div className="mk-hp-stage">
        <HeroCard host={wrap} variant="phone" onGrow={onGrow} />
      </div>
      <div className="mk-hp-sheet">
        <div className="mk-hp-head">
          {/* A pointer convenience only: the same travel is the page's own scroll. */}
          <span className="mk-hp-grab" aria-hidden="true" onClick={toggle} />
          <h1 className="mk-hp-q">
            <span className="mk-hp-q1">{HERO_PHONE_Q[0]}</span>{" "}
            <span className="mk-hp-q2"><mark>{HERO_PHONE_Q[1]}</mark></span>
          </h1>
          <p className="mk-hp-strap">{HERO_H1}</p>
          <DrawerSignup onNavigate={onNavigate} />
          <div className="mk-hp-row">
            {/* An in-page jump to the status band (`id="pulse"`), as the desktop link is. */}
            <a className="mk-hp-how" href="#pulse">
              {HERO_LINK}
              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M4 6.5 8 10.5 12 6.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
            <img className="mk-hp-bird" src={HERO_BIRD.src + "?v=" + HERO_BIRD.version} alt="" width={HERO_BIRD.width} height={HERO_BIRD.height} />
          </div>
        </div>
        {children}
      </div>
    </div>
  );
};
