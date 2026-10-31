/**
 * The waiting-list landing page's own pieces (waitlist v1, 31 Oct; refs design-refs/landing-mobile-v7.html,
 * design-refs/landing-desktop-v5.html and design-refs/birdseye-focus-v1.html option 2).
 *
 * ⚠️ EVERYTHING THAT MOVES HERE OBEYS ONE RULE: it starts when it is at least 60% visible, pauses when it
 * is scrolled away, and under `prefers-reduced-motion` shows its finished state with nothing moving.
 *
 * ⚠️ THE TWO BIRDS-EYE PIECES ARE DIFFERENT ON PURPOSE AND ARE NOT TO BE UNIFIED. Phones get the tilted
 * showcase window, whose bars change one at a time with a chip; the desktop gets the focus window, one
 * row lit and the rest ghosted, with a detail card beside it. Their sample data is illustration, typed in
 * `landingCopy.ts`; nothing reads the store or today's date.
 */
import React, { useEffect, useRef, useState } from "react";
import {
  BE_DATES, BE_TITLE, BE_STAGE_NAME, BE_STAGE_RGB, BE_PHONE_START, BE_PHONE_EVENTS,
  BE_DESK_ROWS, BE_FOCUS, REPLAY_LABEL, BeStage,
} from "./landingCopy";
import { HeroCard, HeroCardControl, HeroCardFeature, FEATURE_VISIBLE } from "./HeroCard";
import { StatusGlyph } from "./marketingMarks";

export const reduceMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ── The art, versioned by the first eight hex digits of each file's md5 (nothing in public/ is hashed) ── */
export const BE_HAWK = { src: "/images/qc/be-hawk-head.png", version: "a10c3aa9", width: 300, height: 287 };
export const POINTING_HAWK = { src: "/images/pointing-hawk.png", version: "dd4890ee", width: 408, height: 437 };
export const v = (a: { src: string; version: string }) => a.src + "?v=" + a.version;

/** The refs' ring-tick marker. */
export const Tick: React.FC = () => (
  <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false">
    <circle cx="10" cy="10" r="8" fill="none" stroke="#a2452a" strokeWidth="1.6" />
    <path d="M6.2 10.3 8.8 12.8 13.8 7.6" fill="none" stroke="#a2452a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const Ticks: React.FC<{ items: readonly string[] }> = ({ items }) => (
  <ul className="mk-wl-ticks">{items.map((t) => <li key={t}><Tick /><span>{t}</span></li>)}</ul>
);

/* ── Scrolling to a sign-up: every CTA on the page does this, and none navigates ── */
/** The ids of the page's two sign-ups' fields (the `idPrefix` of each `FoundingSignup`, + "-email"). */
export const HERO_FORM = "mk-hero";
export const CLOSE_FORM = "mk-close";
export const BAND_FORM = "mk-band";
export const scrollToForm = (prefix: string) => {
  const field = document.getElementById(prefix + "-email");
  const target = field ?? document.getElementById(prefix + "-signup");
  if (!target) return;
  target.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "center" });
  field?.focus({ preventScroll: true });
};
/** Phones' Join: the hero's form while it is still ahead, the founding card's once the hero is passed. */
export const joinTarget = (): string => {
  const hero = document.getElementById(HERO_FORM + "-email");
  const bar = document.querySelector(".mk-navwrap")?.getBoundingClientRect().bottom ?? 0;
  return hero && hero.getBoundingClientRect().bottom > bar ? HERO_FORM : CLOSE_FORM;
};

/** One observer for "at least 60% visible", reporting each change. */
export function useSeen(ref: React.RefObject<HTMLElement | null>, onChange: (seen: boolean) => void) {
  const cb = useRef(onChange); cb.current = onChange;
  useEffect(() => {
    const el = ref.current; if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((es) => es.forEach((e) => cb.current(e.intersectionRatio >= FEATURE_VISIBLE)), { threshold: [0, FEATURE_VISIBLE] });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
}

/** The date row both windows draw (month bands, Monday ticks, the TODAY tag). */
const Dates: React.FC = () => (
  <div className="mk-be-dates">
    {BE_DATES.months.map((m) => <span key={m.name} className="mk-be-mo" style={{ left: m.from + "%", width: (m.to - m.from) + "%" }} />)}
    {BE_DATES.months.map((m) => <span key={m.name + "n"} className="mk-be-mn" style={{ left: `calc(${m.from}% + 8px)` }}>{m.name}</span>)}
    {BE_DATES.ticks.map((t) => <span key={t.label} className="mk-be-tk" style={{ left: t.at + "%" }}>{t.label}</span>)}
    <span className="mk-be-ttag" style={{ left: BE_DATES.today + "%" }}>{BE_DATES.todayLabel}</span>
  </div>
);

/** A bar's fill: solid up to today, the same colour at .42 after it (the refs' gradient). */
const fill = (l: number, w: number, k: BeStage, after = .42) => {
  const cut = Math.max(0, Math.min(100, (BE_DATES.today - l) / w * 100)), [r, g, b] = BE_STAGE_RGB[k];
  return `linear-gradient(90deg,rgb(${r},${g},${b}) ${cut}%,rgba(${r},${g},${b},${after}) ${cut}%)`;
};

/* ═════════════ Phones: the Birds-eye showcase (the v7 ref's `.bew` window, ported) ═════════════ */
/**
 * The tilted window on a blush panel, a card behind it, the hawk's head rising from its ink header. One
 * change at a time with one chip; overdue bars carry a pulsing navy dot. The sequence plays TWICE and
 * then rests (the ref's own fix: anything that moves for more than five seconds needs a way to stop).
 * ⚠️ THE BARS ARE BUILT IMPERATIVELY, AS THE REF BUILDS THEM, INSIDE A NODE REACT NEVER RE-RENDERS —
 * each one is moved by a transition on left/width, and its label measured against its own width.
 */
export const BirdsEyeShowcase: React.FC = () => {
  const win = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const w = win.current; const show = w?.querySelector<HTMLElement>(".mk-bew-show"); if (!w || !show) return;
    type Bar = { el: HTMLElement; l: number; w: number; k: BeStage; say: string; flag: boolean };
    const T = BE_DATES.today;
    const set = (o: Bar, l: number, wd: number, k: BeStage, say: string, instant = false) => {
      o.el.style.transition = instant ? "none" : ""; o.el.style.left = l + "%"; o.el.style.width = wd + "%";
      o.el.querySelector<HTMLElement>(".mk-bew-bc")!.style.background = fill(l, wd, k);
      const lab = o.el.querySelector<HTMLElement>(".mk-bew-lab")!, W = show.clientWidth, bw = wd / 100 * W;
      lab.textContent = say; let out = false;
      if (lab.scrollWidth + 16 > bw) { lab.textContent = BE_STAGE_NAME[k]; if (lab.scrollWidth + 16 > bw) out = true; }
      const fitsRight = (l + wd) / 100 * W + lab.scrollWidth + 12 < W;
      o.el.classList.toggle("mk-out", out && fitsRight); o.el.classList.toggle("mk-outl", out && !fitsRight);
      Object.assign(o, { l, w: wd, k, say }); o.el.classList.toggle("mk-over", o.flag);
    };
    const bars: Bar[] = BE_PHONE_START.map(([l, wd, k, say, flag], i) => {
      const el = document.createElement("div"); el.className = "mk-bew-b"; el.style.top = (i * 34 + 6) + "px";
      el.innerHTML = '<span class="mk-bew-bc"></span><span class="mk-bew-lab"></span><span class="mk-bew-bk"></span>';
      show.append(el); const o: Bar = { el, l, w: wd, k, say, flag }; set(o, l, wd, k, say, true); return o;
    });
    void T;
    /* Labels are measured against their bars, so they are measured again once the faces are in and on resize. */
    const relabel = () => bars.forEach((o) => set(o, o.l, o.w, o.k, o.say, true));
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    let live = true;
    fonts?.ready.then(() => { if (live) relabel(); }, () => {});
    window.addEventListener("resize", relabel);
    const chips: number[] = [];
    const chip = (o: Bar, text: string, blush: boolean) => {
      show.querySelectorAll(".mk-bew-chip").forEach((c) => { c.classList.remove("mk-on"); chips.push(window.setTimeout(() => c.remove(), 300)); });
      const c = document.createElement("span"); c.className = "mk-bew-chip" + (blush ? " mk-blush" : ""); c.textContent = text;
      c.style.left = Math.min(74, Math.max(26, o.l + o.w)) + "%"; c.style.top = (parseFloat(o.el.style.top) - 3) + "px"; show.append(c);
      requestAnimationFrame(() => requestAnimationFrame(() => c.classList.add("mk-on")));
      chips.push(window.setTimeout(() => { c.classList.remove("mk-on"); chips.push(window.setTimeout(() => c.remove(), 400)); }, 2300));
    };
    const cleanup = () => { live = false; window.removeEventListener("resize", relabel); chips.forEach(clearTimeout); show.replaceChildren(); };
    if (reduceMotion()) return cleanup;
    /* Twice through, then rest. Each step waits for the one before; scrolling away clears the next. */
    let i = 0, timer = 0, seen = false;
    const N = BE_PHONE_EVENTS.length * 2;
    const step = () => {
      timer = 0; if (i >= N || !seen) return;
      const [bi, l, wd, k, say, t, bl, fl] = BE_PHONE_EVENTS[i % BE_PHONE_EVENTS.length]; const o = bars[bi];
      if (fl !== undefined) o.flag = !!fl;
      set(o, l, wd, k, say); if (t) chip(o, t, !!bl); i++;
      if (i < N) timer = window.setTimeout(step, t ? 2100 : 650);
    };
    const io = typeof IntersectionObserver !== "undefined" ? new IntersectionObserver((es) => es.forEach((e) => {
      seen = e.intersectionRatio >= FEATURE_VISIBLE;
      if (seen && !timer && i < N) timer = window.setTimeout(step, 600);
      if (!seen && timer) { clearTimeout(timer); timer = 0; }
    }), { threshold: [0, FEATURE_VISIBLE] }) : null;
    io?.observe(w);
    w.dataset.beState = "ready";
    return () => { io?.disconnect(); clearTimeout(timer); cleanup(); };
  }, []);

  return (
    <div className="mk-bew" aria-hidden="true">
      <div className="mk-bew-panel">
        <span className="mk-bew-back" />
        <div className="mk-bew-win" ref={win} data-be="phone">
          <div className="mk-bew-head"><img src={v(BE_HAWK)} alt="" width={BE_HAWK.width} height={BE_HAWK.height} /><b>{BE_TITLE}</b></div>
          <Dates />
          <div className="mk-bew-rows">
            {BE_PHONE_START.map((_, i) => <div key={i} className="mk-bew-row" />)}
            <span className="mk-bew-todaycol" style={{ left: BE_DATES.today + "%" }} />
            <div className="mk-bew-show" />
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═════════════ Desktop: the Birds-eye focus window (birdseye-focus-v1 option 2) ═════════════ */
/**
 * The date row IS the navy header. One row in focus — Eleanor Whitfield, blush, a 3px rust edge, her bar
 * in colour; every other row a grey placeholder with its bar faded but still labelled. The bars draw in
 * once when the window is 60% visible, then the detail card fades in beside Eleanor's row, in front of
 * the today line and over the window's right edge. The hawk's head peeks up from the bottom edge of the
 * navy header, over the names column. Under reduced motion it is drawn finished, with nothing moving.
 */
export const BirdsEyeFocus: React.FC = () => {
  const root = useRef<HTMLDivElement>(null);
  const done = useRef(false);
  useEffect(() => {
    if (reduceMotion()) { root.current?.classList.add("mk-go", "mk-still"); done.current = true; }
  }, []);
  useSeen(root, (seen) => { if (seen && !done.current) { done.current = true; root.current?.classList.add("mk-go"); } });
  return (
    <div className="mk-bef" ref={root} data-be="desk" aria-hidden="true">
      {/* The hawk stands on the navy header's bottom edge, in front of it, his head rising above the
          window (Nick, 31 Oct). Outside the window, which clips. */}
      <img className="mk-bef-hk" src={v(BE_HAWK)} alt="" width={BE_HAWK.width} height={BE_HAWK.height} />
      <div className="mk-bef-win">
        <div className="mk-bef-grid">
          <div className="mk-bef-whohead" />
          <div className="mk-bef-lanehead"><Dates /></div>
        </div>
        <div className="mk-bef-body">
          <span className="mk-bef-tline" style={{ left: `calc(var(--mk-bef-names) + (100% - var(--mk-bef-names)) * ${BE_DATES.today / 100})` }} />
          {BE_DESK_ROWS.map(([l, w, k, say, ghost], i) => (
            <div key={i} className={"mk-bef-rw" + (ghost ? "" : " mk-on")}>
              <div className="mk-bef-who">
                {ghost ? (
                  <><span className="mk-bef-gc" /><span className="mk-bef-gt"><i style={{ width: ghost[0] + "%" }} /><i style={{ width: ghost[1] + "%" }} /></span></>
                ) : (
                  <><span className="mk-bef-gly"><StatusGlyph index={3} /></span><span><b>{BE_FOCUS.name}</b><small>{BE_FOCUS.agency}</small></span></>
                )}
              </div>
              <div className="mk-bef-lane">
                <div className="mk-bef-bar" style={{ left: l + "%", width: w + "%", background: fill(l, w, k, .4) }}><span>{say}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mk-bef-peek">
        <div className="mk-bef-ph"><span className="mk-bef-gly"><StatusGlyph index={3} /></span><b>{BE_FOCUS.name}</b><small>{BE_FOCUS.agency}</small></div>
        <p>{BE_FOCUS.line[0]}<b>{BE_FOCUS.line[1]}</b>{BE_FOCUS.line[2]}</p>
        <span className="mk-bef-btn">{BE_FOCUS.action}</span>
      </div>
    </div>
  );
};

/* ═════════════ "Every query tracked": the real card, played once ═════════════ */
/**
 * Phones: the real `HeroCard`'s single front card on a blush panel, tilted −1.5°, the pointing hawk poking
 * up from the panel's bottom-right edge with his feet cut off by it. Desktop: the hero's own pile, top
 * card animated, in the row illustrations' frame, the hawk standing bottom-right with his feet level with
 * the front card's base. Both: no cast shadow, no fly-past, the story once, then "Play again".
 * ⚠️ THE CARD'S PROPS ARE STABLE REFS, SO THE "PLAY AGAIN" STATE HERE NEVER RE-RENDERS THE CARD.
 */
export const TrackFeature: React.FC<{ layout: "phone" | "desk" }> = ({ layout }) => {
  const host = useRef<HTMLDivElement>(null);
  const control = useRef<HeroCardControl | null>(null);
  const [again, setAgain] = useState(false);
  const feature = useRef<HeroCardFeature>({ backs: layout === "desk", control, onDone: () => setAgain(true) }).current;

  /* Fit the card (phone) or the pile (desk) to the frame, from offsets and static transforms — never a live
     rect, which would be the story's animation. */
  useEffect(() => {
    const el = host.current; if (!el) return;
    const fit = () => {
      const pile = el.querySelector<HTMLElement>(".mk-hc-pile"), front = el.querySelector<HTMLElement>('[data-hc="front"]');
      const hawk = el.querySelector<HTMLElement>(".mk-trk-hawk");
      if (!pile || !front || !hawk) return;
      const W = el.clientWidth, H = el.clientHeight;
      if (layout === "phone") {
        /* The ref's frame is 342 × 458 at 390 wide; the card sits at (12, 18), 278 wide; the hawk at
           (230, 318), 156 wide. Everything scales with the panel's width. */
        const k = W / 342, s = 278 * k / front.offsetWidth;
        pile.style.transform = `translate(${12 * k - front.offsetLeft * s}px,${18 * k - front.offsetTop * s}px) scale(${s})`;
        el.style.height = 458 * k + "px";
        Object.assign(hawk.style, { left: 230 * k + "px", top: 318 * k + "px", width: 156 * k + "px" });
        return;
      }
      let top = Infinity, bottom = -Infinity, left = Infinity, right = -Infinity;
      pile.querySelectorAll<HTMLElement>(".mk-lc").forEach((c) => {
        const cs = getComputedStyle(c).transform, m = new DOMMatrixReadOnly(cs === "none" ? undefined : cs);
        const hx = Math.abs(m.a) * c.offsetWidth / 2 + Math.abs(m.c) * c.offsetHeight / 2, hy = Math.abs(m.b) * c.offsetWidth / 2 + Math.abs(m.d) * c.offsetHeight / 2;
        const cx = c.offsetLeft + c.offsetWidth / 2, cy = c.offsetTop + c.offsetHeight / 2;
        top = Math.min(top, cy - hy); bottom = Math.max(bottom, cy + hy); left = Math.min(left, cx - hx); right = Math.max(right, cx + hx);
      });
      /* The pile fills the frame's height (with a little air) and sits left of centre, leaving the hawk his room. */
      const s = Math.min((H * .96) / (bottom - top), (W * .78) / (right - left));
      const dx = W * .42 - (left + right) / 2 * s, dy = H / 2 - (top + bottom) / 2 * s;
      pile.style.transform = `translate(${dx}px,${dy}px) scale(${s})`;
      const base = dy + (front.offsetTop + front.offsetHeight) * s, fr = dx + (front.offsetLeft + front.offsetWidth) * s;
      const hw = Math.min(W * .3, H * .42);
      Object.assign(hawk.style, { width: hw + "px", left: fr - hw * .32 + "px", top: base - hw * (POINTING_HAWK.height / POINTING_HAWK.width) + "px" });
    };
    fit();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(fit) : null;
    ro?.observe(el);
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    fonts?.ready.then(fit, () => {});
    return () => ro?.disconnect();
  }, [layout]);

  return (
    <div className={layout === "phone" ? "mk-trk" : "mk-trkd mk-rowillo"} ref={host} data-trk={layout}>
      <div className="mk-trk-card"><HeroCard host={host} variant={layout} feature={feature} /></div>
      <img className="mk-trk-hawk" src={v(POINTING_HAWK)} alt="" width={POINTING_HAWK.width} height={POINTING_HAWK.height} />
      <button type="button" className={"mk-trk-again" + (again ? " mk-on" : "")} tabIndex={again ? 0 : -1} aria-hidden={again ? undefined : true}
              onClick={() => { setAgain(false); control.current?.replay(); }}>
        {REPLAY_LABEL}
      </button>
    </div>
  );
};
