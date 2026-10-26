/**
 * HeroCard — the landing hero's card pile: four blurred cards behind, one living query card in front.
 * Desktop: landing hero v4 (ref design-refs/landing-hero-v4.html). Phones: mobile v3.1 (ref
 * design-refs/landing-hero-mobile-v3-1.html).
 *
 * ⚠️ IT IS A PORT, NOT A REWRITE. The refs' `playShort` (the card's story, Day 1 → 99, on a continuous
 * odometer clock, then dealt away and dealt in again, for ever) and `ENTER` (the cards popping in,
 * the hawk's shadow flying past, pointer depth) are carried across with their structure, their Web
 * Animations calls, their fill rules, their timings and their copy. Where a value looks arbitrary it
 * is the ref's; change it there first.
 *
 * ⚠️ ONE STORY, TWO LAYOUTS (desktop v4, 25 Oct). The desk card plays the SAME `playShort` as the
 * phone. What differs is held in one place (`SHORT`): the stamp's step (the desktop ref returns
 * t+240, the phone's t+340) and what Eleanor asked for (the phone flicks Pages → Words → Chapters;
 * the desk switches to Chapters and presses + twice). The v3 desk story (Day 32, the nudge form, the
 * scrollable end, Watch again) is deleted.
 *
 * ⚠️ THE WHOLE PILE IS DECORATIVE — `aria-hidden` on the root. The hero's accessible content is its
 * headline, its sub and its two actions; nothing here says anything they do not.
 *
 * ⚠️ THE MARKUP IS THE STORY'S END STATE, AND THAT IS WHAT RENDERS WITHOUT SCRIPT: Day 99, "With
 * you", "Full requested", all five lines, the final panel, "Send the full by 5 July". With reduced
 * motion the effect only finishes that state (the odometer and the scrolled feed) and animates
 * nothing at all.
 *
 * ⚠️ THE EFFECT MUTATES ITS OWN SUBTREE AND THE COMPONENT MUST NEVER RE-RENDER. Typing splits the
 * lines into one span per letter and the clock rewrites its own markup, exactly as the ref does; a
 * React re-render over that would fight it. So the component takes no props that change, holds no
 * state, and is memoised. `split()` is idempotent because StrictMode runs the effect twice in dev.
 */

import React, { useEffect, useLayoutEffect, useRef } from "react";
import "./heroCard.css";
import { HERO_PHONE_MS, HERO_PHONE_MS_FRONT, HERO_PHONE_TAGS, PHONE_STORY } from "./landingCopy";

/* The shadow's own facts — unchanged from the previous hero, and a smoke test still reads the PNG's
   header against the size and its md5 against the version. Replace the file, change the version. */
export const HERO_SHADOW = { src: "/images/hawk-shadow.png", version: "24b7a5ea", width: 1400, height: 1197 };
/* The flying shadow (both refs' `.fly img`), pre-rotated in the file — the phone's since v1 and the
   desk's since v4. public/ is not fingerprinted, so the version is the first eight hex digits of the
   file's own md5. */
export const HERO_FLY = { src: "/images/hawk-fly.webp", version: "ebcb32c2", width: 700, height: 317 };

/* ── the ref's glyphs, verbatim ── */
const RING = <svg width="15" height="15" viewBox="0 0 20 20"><circle cx="10" cy="10" r="7.5" fill="none" stroke="#1c130f" strokeWidth="1.6" /></svg>;
const PILL: Record<string, string> = {
  queried: `<svg width="15" height="15" viewBox="0 0 20 20"><circle cx="10" cy="10" r="7.5" fill="none" stroke="#1c130f" stroke-width="1.6"/></svg>Queried`,
  preq: `<svg width="15" height="15" viewBox="0 0 20 20"><circle cx="10" cy="10" r="7.5" fill="none" stroke="#1c130f" stroke-width="1.6" stroke-dasharray="2.2 2.2"/><path d="M10 4.5a5.5 5.5 0 0 1 0 11z" fill="#1c130f"/></svg>Partial requested`,
  psent: `<svg width="15" height="15" viewBox="0 0 20 20"><circle cx="10" cy="10" r="7.5" fill="none" stroke="#1c130f" stroke-width="1.6"/><path d="M10 2.5a7.5 7.5 0 0 1 0 15z" fill="#1c130f"/></svg>Partial sent`,
  freq: `<svg width="15" height="15" viewBox="0 0 20 20"><circle cx="10" cy="10" r="7.5" fill="#1c130f" stroke="#1c130f" stroke-width="1.6" stroke-dasharray="2.2 2.2"/></svg>Full requested`,
};
const AGENT = { bg: "#e2e6e0", fg: "#4d524a", pill: "#e6e9e4", word: "With the agent" };
const YOU = { bg: "#f5e6df", fg: "#7c3a2a", pill: "#f5e6df", word: "With you" };

const DocIcon = () => <svg width="11" height="12" viewBox="0 0 11 12" fill="none" stroke="currentColor" strokeWidth="1.1"><rect x="1" y="1" width="9" height="10" rx=".5" /><path d="M3 4h5M3 6h5M3 8h3" /></svg>;
const SynIcon = () => <svg width="10" height="12" viewBox="0 0 10 12" fill="none" stroke="currentColor" strokeWidth="1.1"><path d="M1 1h5l3 3v7H1z" /><path d="M6 1v3h3" /></svg>;
const PagesIcon = () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.1"><path d="M4 1h7v8H4z" /><path d="M1 3v8h7" /></svg>;
const BellIcon = ({ w = 11, h = 12, sw = 1.8, stroke = "currentColor" }: { w?: number; h?: number; sw?: number; stroke?: string }) =>
  <svg width={w} height={h} viewBox="0 0 20 20" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d="M5.5 14h9l-1.3-1.8V9a3.2 3.2 0 0 0-6.4 0v3.2zM8.6 16.2h2.8" /></svg>;

const BookIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 6.5C10 5 7.5 4.5 4 4.5v13c3.5 0 6 .5 8 2 2-1.5 4.5-2 8-2v-13c-3.5 0-6 .5-8 2z" /><path d="M12 6.5v13" /></svg>;

/* Every card's profile head (the refs' HEAD): a head-and-shoulders silhouette, never initials —
   on the phone since v2, on the desk since v4. */
const Head = ({ w = 22 }: { w?: number }) => <svg viewBox="0 0 24 24" width={w} height={w} aria-hidden="true"><circle cx="12" cy="9" r="4.2" fill="currentColor" /><path d="M4.2 21c.9-4.2 4-6.6 7.8-6.6s6.9 2.4 7.8 6.6z" fill="currentColor" /></svg>;
const Disc: React.FC = () => <span className="mk-lc-disc"><Head /></span>;

/* ── the four cards behind, positions and angles from the ref ── */
const BACKS = [
  { cls: "mk-lc--o", left: 640, top: 90, t: "rotate(-9deg) scale(.82)", band: ["#f5e6df", "#7c3a2a"], word: "With you", day: "Day 21", ini: "GP", name: "Greg Panetta", agency: "Panetta Associates", pillBg: "#f5e6df", pill: "Full requested", chips: ["ADULT", "LITERARY FICTION"] },
  { cls: "", left: 668, top: -10, t: "rotate(-5deg) scale(.8)", band: ["#e4e1db", "#5b524a"], word: "Closed", day: "Day 34", ini: "TR", name: "Tessa Rowe", agency: "Marlowe & Finch", pillBg: "#ece8e3", pill: "Passed", chips: ["ADULT", "94,000 WORDS"] },
  { cls: "mk-lc--o", left: 790, top: 84, t: "rotate(11deg) scale(.82)", band: ["#f7efe3", "#6e5a3a"], word: "With the agent", day: "Day 9", ini: "AK", name: "Amira Khan", agency: "Northlight Agency", pillBg: "#f4ecdd", pill: "Queried", chips: ["ADULT", "LITERARY FICTION"] },
  { cls: "", left: 772, top: -4, t: "rotate(6deg) scale(.8)", band: ["#d7e0e8", "#2f4258"], word: "Offer", day: "Day 128", ini: "TE", name: "Tom Ellery", agency: "Ellery & Finch", pillBg: "#d7e0e8", pill: "Offer", chips: ["ADULT", "LITERARY FICTION"] },
] as const;

/** What the story tells its host about its own progress. */
interface StoryHooks {
  /** On a phone, after the FIRST run of the loop only: the drawer may rise to offer the founding sign-up. */
  onGrow?: () => void;
  /** The phone layout: the same short loop, with the phone's stamp step and its popover sequence. */
  phone?: boolean;
}

/**
 * On a phone the four sit tucked behind the front card, all at its place (688, 14), peeking over its
 * top — the mobile ref's exact transforms, in BACKS' order. Numbers rather than strings because
 * `HeroPhone.tsx` fits the whole pile to the screen from them.
 */
export const PHONE_BACKS = [
  { tx: -10, ty: -30, r: -3.5, s: .95 },
  { tx: -4, ty: -18, r: -1.5, s: .97 },
  { tx: 12, ty: -26, r: 3.5, s: .95 },
  { tx: 6, ty: -16, r: 1.8, s: .97 },
] as const;
export const PHONE_FRONT_ROTATE = .8;
const phoneBackTransform = (b: typeof PHONE_BACKS[number]) => `translate(${b.tx}px,${b.ty}px) rotate(${b.r}deg) scale(${b.s})`;

const reduceMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ═════════════ variation 4: one query, start to finish (the ref's V4, ported) ═════════════ */
function makeStory(root: HTMLElement, hooks: StoryHooks = {}) {
  const $ = (k: string) => root.querySelector<HTMLElement>(`[data-hc="${k}"]`)!;
  const ol = $("steps"), tlv = $("tlv"), steps = [...ol.querySelectorAll<HTMLElement>(".mk-lc-step")];
  const band = $("band"), bandT = $("bandt"), day = $("day"), pill = $("pill"), psd = $("psd");
  const ftL = $("ftl"), ftT = $("ftt"), ftA = $("fta");
  const slot = $("slot"), pn = $("pn"), pf = $("pf");

  // letters, for typing — idempotent, because StrictMode runs effects twice in development
  function split(el: HTMLElement): HTMLElement[] {
    const done = el.querySelectorAll<HTMLElement>(".mk-lc-ch");
    if (done.length) return [...done];
    const walk = (n: Node) => {
      [...n.childNodes].forEach((c) => {
        if (c.nodeType === 3) {
          const f = document.createDocumentFragment();
          [...(c.textContent ?? "")].forEach((ch) => {
            const sp = document.createElement("span"); sp.className = "mk-lc-ch"; sp.textContent = ch; f.appendChild(sp);
          });
          (c as ChildNode).replaceWith(f);
        } else if (c.nodeType === 1 && (c as Element).tagName.toLowerCase() !== "svg") walk(c);
      });
    };
    walk(el);
    return [...el.querySelectorAll<HTMLElement>(".mk-lc-ch")];
  }
  const parts = steps.map((st) => ({
    st, g: st.querySelector<SVGElement>("svg.mk-lc-g")!, t: st.querySelector<HTMLElement>(".mk-lc-t")!,
    d: st.querySelector<HTMLElement>(".mk-lc-d")!, chips: [...st.querySelectorAll<HTMLElement>(".mk-lc-att span")],
    em: st.querySelector<HTMLElement>(".mk-lc-att em"), chars: [] as HTMLElement[],
  }));
  parts.forEach((p) => { p.chars = split(p.t); });
  const pnText = split(pn.querySelector<HTMLElement>(".mk-lc-nt")!), pfText = split(pf.querySelector<HTMLElement>(".mk-lc-nt")!);
  const pnIcon = pn.querySelector<SVGElement>("p svg")!, pfIcon = pf.querySelector<SVGElement>("p svg")!;
  const pnBtn = pn.querySelector<HTMLElement>(":scope > b")!, pfBtn = pf.querySelector<HTMLElement>(":scope > b")!;

  const mkWait = () => { const w = document.createElement("span"); w.className = "mk-lc-wait"; w.setAttribute("aria-hidden", "true"); w.innerHTML = "<i></i><i></i><i></i>"; return w; };
  const waits = parts.map((p, i) => { if (!i) return null; const w = mkWait(); p.st.appendChild(w); return w; });
  const slotWait = mkWait(); slot.appendChild(slotWait);

  let anims: Animation[] = [], timers: number[] = [];
  const A = (el: Element, kf: Keyframe[], o: KeyframeAnimationOptions) => {
    const a = el.animate(kf, Object.assign({ fill: "both", easing: "cubic-bezier(.2,.7,.2,1)" }, o)); anims.push(a); return a;
  };
  const later = (fn: () => void, ms: number) => { timers.push(window.setTimeout(fn, ms)); };
  const BOUNCE = "cubic-bezier(.34,1.56,.64,1)";
  const KEY = 30;
  const type = (chars: HTMLElement[], t: number, key = KEY) => {
    chars.forEach((c, k) => A(c, [{ opacity: 0 }, { opacity: 1 }], { duration: 1, delay: t + k * key })); return t + chars.length * key;
  };
  /* ⚠️ WHAT DIFFERS BETWEEN THE TWO LAYOUTS, AND NOTHING ELSE (desktop v4): the stamp's step — the
     desktop ref's `stamp` returns t+240, the phone ref's t+340 — and the popover's sequence. */
  const SHORT = hooks.phone ? { stampStep: 340, pop: "flick" as const, flip: true } : { stampStep: 240, pop: "stepper" as const, flip: false };
  let tilt = 0; const tilts = [-1.4, 1.1, -.6, 1.6, -1, .8];
  function stamp(el: Element, t: number, r?: number | null, fill?: FillMode) {
    r = r != null ? r : tilts[(tilt++) % tilts.length];
    A(el, [{ opacity: 0, transform: `scale(1.35) rotate(${r * 2}deg)` }, { opacity: 1, transform: `scale(.96) rotate(${r}deg)`, offset: .6 }, { opacity: 1, transform: "scale(1.01) rotate(0deg)", offset: .82 }, { opacity: 1, transform: "none" }], { duration: 340, delay: t, fill: fill || "both", easing: "cubic-bezier(.55,0,.75,.2)" });
    return t + SHORT.stampStep;
  }
  const press = (el: Element, t: number) => { A(el, [{ transform: "scale(1)" }, { transform: "scale(.86)", offset: .35 }, { transform: "scale(1.06)", offset: .7 }, { transform: "scale(1)" }], { duration: 380, delay: t, fill: "none" }); return t + 380; };
  // ---- the clock: an odometer that never stops between the first event and the last ----
  let cur = 0;
  let ui: { tw: HTMLElement; ts: HTMLElement; os: HTMLElement } | null = null;
  function build() {
    cur = 0;
    const strip = '<span class="mk-odo-s">' + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d) => "<i>" + d + "</i>").join("") + "</span>";
    day.innerHTML = '<span class="mk-odo-dk">Day</span><span class="mk-odo"><span class="mk-odo-w">' + strip + '</span><span class="mk-odo-w">' + strip + "</span></span>";
    const w = day.querySelectorAll<HTMLElement>(".mk-odo-w");
    ui = { tw: w[0], ts: w[0].firstChild as HTMLElement, os: w[1].firstChild as HTMLElement };
  }
  function show(v: number) {
    // v may be fractional: the odometer's wheels turn continuously, like a real one
    const n = Math.floor(v + 1e-6);
    const ones = v - Math.floor(v / 10) * 10;                 // 0 … <10, continuous
    const carry = Math.max(0, ones - 9);                       // the tens wheel turns during the ones' last tenth
    const tens = Math.floor(v / 10) + carry;
    ui!.tw.classList.toggle("mk-odo-off", v < 9);
    ui!.os.style.transform = `translateY(${-ones * 1.25}em)`;
    ui!.ts.style.transform = `translateY(${-tens * 1.25}em)`;
    if (n !== cur) { cur = n; day.dataset.n = String(n); day.setAttribute("aria-label", "Day " + n); }
  }
  // an event lands on its day: a short swell in the counter
  const land = (t: number) => A(day, [{ transform: "scale(1)" }, { transform: "scale(1.25)", offset: .35 }, { transform: "scale(1)" }], { duration: 520, delay: t, fill: "none", easing: "ease-out" });
  let knots: [number, number][] = [], raf = 0, t0 = 0;
  let slopes: number[] = [];
  function prepClock() { // Fritsch–Carlson monotone cubic: never runs backwards, no sudden changes of pace
    const K = knots, m = K.length, d: number[] = [];
    for (let i = 0; i < m - 1; i++) d.push((K[i + 1][1] - K[i][1]) / (K[i + 1][0] - K[i][0]));
    slopes = [d[0]];
    for (let i = 1; i < m - 1; i++) slopes.push(d[i - 1] * d[i] <= 0 ? 0 : (3 * (d[i - 1] + d[i])) / ((2 * d[i] + d[i - 1]) / d[i - 1] + (d[i] + 2 * d[i - 1]) / d[i]));
    slopes.push(d[m - 2] * 0.4);                              // eases into the final day
  }
  function clockAt(el: number) {
    const K = knots, m = K.length;
    if (el <= K[0][0]) return K[0][1];
    if (el >= K[m - 1][0]) return K[m - 1][1];
    let i = 0; while (el >= K[i + 1][0]) i++;
    const [x0, y0] = K[i], [x1, y1] = K[i + 1], h = x1 - x0, u = (el - x0) / h, u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * y0 + (u3 - 2 * u2 + u) * h * slopes[i] + (-2 * u3 + 3 * u2) * y1 + (u3 - u2) * h * slopes[i + 1];
  }
  function runClock() {
    const el = performance.now() - t0, last = knots[knots.length - 1][0];
    show(Math.min(clockAt(el), knots[knots.length - 1][1]));
    if (el < last) raf = requestAnimationFrame(runClock); else show(knots[knots.length - 1][1]);
  }

  // the card's state: whose move it is, the status pill, the footer
  function court(c: typeof AGENT, t: number) { later(() => { band.style.background = c.bg; band.style.color = c.fg; bandT.textContent = c.word; pill.style.background = c.pill; }, t); }
  function setPill(k: string, t: number) { later(() => { pill.innerHTML = PILL[k]; }, t + 60); stamp(pill, t, -2, "forwards"); }
  function foot(txt: string, act: string, late: boolean, t: number) {
    later(() => { ftT.textContent = txt; ftA.textContent = act; ftL.classList.toggle("mk-late", !!late); }, t);
    A(ftL.parentElement!, [{ opacity: .35 }, { opacity: 1 }], { duration: 400, delay: t, fill: "none" });
  }

  // keep the newest line in view: the timeline glides up as it grows
  let scrolled = 0;
  function reveal(el: HTMLElement, t: number) {
    const want = Math.max(0, el.offsetTop + el.offsetHeight + 8 - tlv.clientHeight);
    if (want > scrolled) { A(ol, [{ transform: `translateY(${-scrolled}px)` }, { transform: `translateY(${-want}px)` }], { duration: 600, delay: t, fill: "forwards", easing: "cubic-bezier(.4,0,.2,1)" }); scrolled = want; }
  }
  function climb(w: HTMLElement, from: number, to: number, t: number) {
    // the dots wait on the next line; the clock reaches this event's day as the dots clear
    /* Both refs: 30ms a day, between 0.45s and 0.95s (S6). */
    const n = to - from, dur = Math.max(450, Math.min(950, n * 30));
    A(w, [{ opacity: 0 }, { opacity: 1 }], { duration: 220, delay: t, fill: "forwards" });
    A(w, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, delay: t + dur, fill: "forwards" });
    knots.push([t + dur, to]);
    land(t + dur);
    return t + dur + 320;
  }
  function step(p: typeof parts[number], t: number) {
    A(p.g, [{ transform: "scale(0)" }, { transform: "scale(1.2)", offset: .7 }, { transform: "scale(1)" }], { duration: 300, delay: t, easing: BOUNCE });
    /* Both refs' `step`: 18ms a letter from +120, then the line pops; the chips stamp close together. */
    t = type(p.chars, t + 120, 18);
    pop(p, t + 40);
    A(p.d, [{ opacity: 0, transform: "translateY(3px)" }, { opacity: 1, transform: "none" }], { duration: 280, delay: t + 120 });
    t += 200;
    if (p.chips.length) { t += 160; p.chips.forEach((c) => { t = stamp(c, t); t += 60; }); }
    if (p.em) { A(p.em, [{ opacity: 0, transform: "translateX(-6px)" }, { opacity: 1, transform: "none" }], { duration: 400, delay: t + 60 }); t += 420; }
    return t;
  }
  // the resting card's tracking feed is the writer's to scroll (the static end state only — v4)
  function scrollable() {
    ol.getAnimations().forEach((a) => a.cancel());
    ol.style.transform = "none";
    tlv.classList.add("mk-lc-tlv--scroll");
    tlv.scrollTop = tlv.scrollHeight;
  }
  function setStatic() { // the resting card: the end of the story
    scrollable();
    band.style.background = YOU.bg; band.style.color = YOU.fg; bandT.textContent = YOU.word; pill.style.background = YOU.pill; pill.innerHTML = PILL.freq;
    build(); show(99); psd.classList.remove("mk-late");
    ftT.textContent = "Send the full by 5 July"; ftA.textContent = "Mark full sent"; ftL.classList.add("mk-late");
  }
  function cancelAll() { anims.forEach((a) => a.cancel()); anims = []; timers.forEach(clearTimeout); timers = []; cancelAnimationFrame(raf); }
  function stop() { cancelAll(); setStatic(); }

  let LEAD = 0;

  /* ═════ the short loop (both refs' `playShort()`, and only what it reaches) ═════ */
  const front = $("front");
  /* The highlighter tone behind each line as it lands, in the steps' order (the ref's `pop`). */
  const WASH = ["rgba(122,154,130,.28)", "rgba(201,120,100,.24)", "rgba(122,154,130,.28)", "rgba(122,154,130,.28)", "rgba(201,120,100,.24)"];
  /** The newest line pops: a quick swell and a highlighter wash behind its words. */
  function pop(p: typeof parts[number], t: number) {
    A(p.t, [{ transform: "scale(1)" }, { transform: "scale(1.07)", offset: .35 }, { transform: "scale(1)" }], { duration: 520, delay: t, fill: "none", easing: "ease-out" });
    A(p.t, [{ backgroundSize: "0% 42%" }, { backgroundSize: "100% 42%", offset: .35 }, { backgroundSize: "100% 42%", offset: .75 }, { backgroundSize: "100% 42%", opacity: 1 }], { duration: 1500, delay: t, fill: "none" });
    p.t.style.setProperty("--mk-wash", WASH[parts.indexOf(p)]);
  }
  const UPI: Record<string, string> = {
    todo: '<rect x="2.5" y="2.5" width="11" height="11" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M5.2 8.2 7.2 10.2 10.8 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
    bell: '<path d="M4.5 11V7.5a3.5 3.5 0 0 1 7 0V11l1 1.2h-9z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M6.8 13.6a1.4 1.4 0 0 0 2.4 0" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  };
  /**
   * v3.1 (C1) — a task chip stamped into the line's own chip row (the ref's on-line `floatTag`): in with
   * the stamp, held, faded over 400ms from +2.6s, removed at +3.2s. The words go in as text.
   */
  function floatTag(p: typeof parts[number], chip: readonly [string, string, string], t: number) {
    const [title, icon, kind] = chip;
    const att = p.st.querySelector(".mk-lc-att"); if (!att) return;
    const c = document.createElement("span"); c.className = "mk-taskchip" + (kind ? " mk-taskchip--" + kind : ""); c.setAttribute("aria-hidden", "true");
    c.innerHTML = `<svg viewBox="0 0 16 16" width="12" height="12">${UPI[icon]}</svg>`;
    c.append(title);
    att.appendChild(c); later(() => c.remove(), t + 3200); stamp(c, t, -1.5);
    A(c, [{ opacity: 1 }, { opacity: 0 }], { duration: 400, delay: t + 2600, fill: "forwards" });
  }

  /* v3.1 (C2) — the sample switch (the ref's `seg`/`segReset`): pages, chapters or words; the number
     changes with the unit. Built on element references, never ids: the card can be mounted twice. */
  type Seg = { sg: HTMLElement; n: HTMLElement };
  function seg(w: Seg, unit: string, val: string, t: number) {
    const opt = w.sg.querySelector<HTMLElement>(`[data-u="${unit}"]`)!;
    press(opt, t);
    later(() => { w.sg.querySelectorAll("span").forEach((x) => x.classList.toggle("mk-on", x === opt)); const th = w.sg.querySelector("i")!; th.style.left = opt.offsetLeft + "px"; th.style.width = opt.offsetWidth + "px"; }, t + 60);
    A(w.n, [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(-6px)" }], { duration: 120, delay: t + 60, fill: "none" });
    later(() => { w.n.textContent = val; }, t + 180);
    A(w.n, [{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: 180, delay: t + 180, fill: "none" });
    return t + 420;
  }
  function segReset(w: Seg, val: string) {
    const opt = w.sg.querySelector<HTMLElement>('[data-u="pages"]')!;
    w.sg.querySelectorAll("span").forEach((x) => x.classList.toggle("mk-on", x === opt));
    const th = w.sg.querySelector<HTMLElement>("i")!; th.style.transition = "none"; th.style.left = opt.offsetLeft + "px"; th.style.width = opt.offsetWidth + "px"; void th.offsetWidth; th.style.transition = "";
    w.n.textContent = val;
  }
  /** The popover under the status pill (the ref's `getPop`): built once on the front card, reused. */
  function getPop(): { pop: HTMLElement; w: Seg; plus: HTMLElement | null } {
    let g = front.querySelector<HTMLElement>(".mk-pillpop");
    if (!g) {
      const Q = PHONE_STORY.asked;
      g = document.createElement("div"); g.className = "mk-pillpop" + (SHORT.pop === "stepper" ? " mk-pillpop--desk" : ""); g.setAttribute("aria-hidden", "true");
      const sm = document.createElement("small"); sm.textContent = Q.label;
      const row = document.createElement("div"); row.className = "mk-smp";
      const f = document.createElement("span"); f.className = "mk-smp-f"; f.textContent = Q.first;
      const n = document.createElement("span"); n.className = "mk-smp-n"; n.textContent = Q.pages;
      const sg = document.createElement("div"); sg.className = "mk-seg"; sg.appendChild(document.createElement("i"));
      for (const [u, label] of Q.units) { const o = document.createElement("span"); o.dataset.u = u; o.textContent = label; if (u === "pages") o.className = "mk-on"; sg.appendChild(o); }
      if (SHORT.pop === "stepper") {
        /* The desk's popover (v4 S2): First [−] [10] [+] — the round steppers are the ref's `.pillpop .pm`. */
        const pm = (ch: string, k: string) => { const b = document.createElement("b"); b.className = "mk-pm"; b.dataset.pm = k; b.textContent = ch; return b; };
        row.append(f, pm(Q.desk.minus, "minus"), n, pm(Q.desk.plus, "plus"), sg);
      } else row.append(f, n, sg);
      g.append(sm, row); front.appendChild(g);
    }
    return { pop: g, w: { sg: g.querySelector<HTMLElement>(".mk-seg")!, n: g.querySelector<HTMLElement>(".mk-smp-n")! }, plus: g.querySelector<HTMLElement>('[data-pm="plus"]') };
  }

  /* v3.2 (F1–F3) — the card flips over to celebrate a request (phones only): a turn about the vertical
     axis away to 90°, the congratulations face swapped in edge-on, the turn back in from −90° with a
     slight overshoot, a hold, then the same two halves back to the card. A small burst of confetti
     fans UP from the disc as the face lands. The ref's `flip()`, with its timings; returns the moment
     the card is face up again. Every animation and timer goes through `A`/`later`, so a loop or an
     unmount cancels it with everything else (F6). */
  const POPPER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20l5.5-14 8.5 8.5z"/><path d="M9.5 6l8.5 8.5"/><path d="M14 4.5c.6 1 .5 2-.2 2.8M19.5 10c-1-.6-2-.5-2.8.2M17 3.5l.4 1.4M20.5 7l-1.4.4M12 2.5v1.2"/></svg>';
  const FX = ["#a2452a", "#2a3a52", "#7f9a83", "#e0b9a8", "#c98a3a"];
  function flip(kind: "partial" | "full", t: number) {
    let g = front.querySelector<HTMLElement>(".mk-cgx");
    if (!g) { g = document.createElement("div"); g.className = "mk-cgx"; g.setAttribute("aria-hidden", "true"); front.appendChild(g); }
    const face = g, d = PHONE_STORY.flip[kind];
    later(() => {
      face.replaceChildren();
      const band = document.createElement("div"); band.className = "mk-cgx-band";
      const tag = document.createElement("span"); tag.textContent = d.tag;
      const day = document.createElement("span"); day.textContent = d.day;
      band.append(tag, day);
      const body = document.createElement("div"); body.className = "mk-cgx-body";
      const disc = document.createElement("div"); disc.className = "mk-cgx-disc"; disc.innerHTML = POPPER;
      const title = document.createElement("div"); title.className = "mk-cgx-t"; title.textContent = d.title;
      const line = document.createElement("div"); line.className = "mk-cgx-l";
      const strong = document.createElement("b"); strong.textContent = d.line[1];
      line.append(d.line[0], strong, d.line[2]);
      body.append(disc, title, line); face.append(band, body);
      /* ⚠️ THE REF'S EXPRESSION, VERBATIM. Its second term mixes the drawer's top in viewport pixels (594)
         with the card's top in stage pixels (64) — 60px apart — so it is not the height visible above the
         drawer and the first term (card height − 44) always wins: the body centres over 661 card units,
         part of it under the drawer. That is the picture that was approved, so it is reproduced. */
      face.style.setProperty("--mk-cgx-h", Math.min(front.offsetHeight - 44, (594 - 64) / 0.73 - 60) + "px");
      for (let i = 0; i < 18; i++) { const f = document.createElement("i"); f.className = "mk-fx"; f.style.background = FX[i % FX.length]; disc.appendChild(f); }
    }, t - 30);
    const base = `rotate(${PHONE_FRONT_ROTATE}deg) perspective(1600px)`, H1 = 260, H2 = 340, HOLD = 1900, ez1 = "cubic-bezier(.5,0,.9,.5)", ez2 = "cubic-bezier(.15,.9,.3,1.15)";
    A(front, [{ transform: base + " rotateY(0deg)" }, { transform: base + " rotateY(90deg)" }], { duration: H1, delay: t, easing: ez1, fill: "none" });
    A(face, [{ opacity: 1 }, { opacity: 1 }], { duration: H2 + HOLD + H1, delay: t + H1, fill: "none" });
    A(front, [{ transform: base + " rotateY(-90deg)" }, { transform: base + " rotateY(0deg)" }], { duration: H2, delay: t + H1, easing: ez2, fill: "none" });
    // a small burst from the disc as it lands
    later(() => {
      face.querySelectorAll<HTMLElement>(".mk-fx").forEach((f, i) => {
        const a = Math.PI * (-1.08 + (i / 17) * 1.16) + (Math.random() - .5) * .12, r = 72 + Math.random() * 58, rot = (Math.random() * 540 - 270) | 0;
        A(f, [
          { opacity: 1, transform: "translate(-50%,-50%) rotate(0deg) scale(.6)" },
          { opacity: 1, transform: `translate(calc(-50% + ${Math.cos(a) * r}px),calc(-50% + ${Math.sin(a) * r}px)) rotate(${rot}deg) scale(1)`, offset: .55 },
          { opacity: 0, transform: `translate(calc(-50% + ${Math.cos(a) * r * 1.15}px),calc(-50% + ${Math.sin(a) * r * 1.15 + 26}px)) rotate(${rot * 1.4}deg) scale(.9)` },
        ], { duration: 1300, easing: "cubic-bezier(.2,.7,.3,1)", fill: "forwards" });
      });
    }, t + H1 + 120);
    const back = t + H1 + H2 + HOLD;
    A(front, [{ transform: base + " rotateY(0deg)" }, { transform: base + " rotateY(-90deg)" }], { duration: H1, delay: back, easing: ez1, fill: "none" });
    A(front, [{ transform: base + " rotateY(90deg)" }, { transform: base + " rotateY(0deg)" }], { duration: H2, delay: back + H1, easing: "cubic-bezier(.2,.8,.3,1)", fill: "none" });
    return back + H1 + H2;
  }

  /**
   * One query, Query sent to Full requested in about 24 seconds, then the card is dealt away to the
   * left, a fresh one comes in from the right, and the story plays again, for ever. On a phone, after
   * the FIRST run only, the drawer is offered its grow (the desk has no `onGrow`).
   */
  let looped = false;
  function playShort(again: boolean) {
    const F = PHONE_STORY.foot;
    tilt = 0; scrolled = 0; ol.style.transform = "none"; tlv.classList.remove("mk-lc-tlv--scroll"); tlv.scrollTop = 0;
    band.style.background = AGENT.bg; band.style.color = AGENT.fg; bandT.textContent = AGENT.word; pill.style.background = AGENT.pill; pill.innerHTML = PILL.queried;
    ftT.textContent = F.sent[0]; ftA.textContent = F.sent[1]; ftL.classList.remove("mk-late"); psd.classList.remove("mk-late");
    A(pf, [{ opacity: 0 }, { opacity: 0 }], { duration: 1, fill: "forwards" });
    root.querySelectorAll(".mk-taskchip").forEach((g) => g.remove());
    let t = (again ? 650 : 450) + LEAD;
    if (again) A(front, [{ translate: "130% 30px", rotate: "10deg", opacity: 0 }, { translate: "0 0", rotate: "0deg", opacity: 1 }], { duration: 620, fill: "both", easing: "cubic-bezier(.16,1,.3,1)" });
    build(); show(1); knots = [[t, 1]]; t0 = performance.now();
    court(AGENT, 0); pill.innerHTML = PILL.queried;
    const hideChips = (p: typeof parts[number]) => p.chips.forEach((c) => A(c, [{ opacity: 0 }, { opacity: 0 }], { duration: 1, fill: "forwards" }));
    const stepNoChips = (p: typeof parts[number], u: number) => { const sv = p.chips; p.chips = []; const e = step(p, u); p.chips = sv; return e; };
    hideChips(parts[0]);
    // Day 1 — the query, and its three materials pop in
    let e = stepNoChips(parts[0], t + 300);
    let m = e + 500; parts[0].chips.forEach((c, k) => stamp(c, m + 150 + k * 380)); m += 150 + parts[0].chips.length * 380;
    // Day 36 — the partial request; its task appears beside it and floats away
    knots.push([m + 900, 1]); reveal(parts[1].st, m + 800);
    const pr = climb(waits[1]!, 1, 36, m + 900) - 320;
    court(YOU, pr); setPill("preq", pr); foot(F.partial[0], F.partial[1], true, pr);
    /* C2 — what Eleanor asked for drops from the pill: Pages 50, flicked to Words 5,000 then Chapters 3,
       tucked back up, and only then does "Partial requested" type in with its chip. The ref's times. */
    {
      /* v3.2 (F1): on a phone the card flips to celebrate first; the popover drops 200ms after it is face up. */
      const Q = PHONE_STORY.asked, { pop, w, plus } = getPop(); let u = SHORT.flip ? flip("partial", pr + 80) + 200 : pr + 250;
      const first = SHORT.pop === "stepper" ? Q.desk.start : Q.pages;
      later(() => { const k = front.getBoundingClientRect().width / front.offsetWidth, pb = pill.getBoundingClientRect(), c = front.getBoundingClientRect(); pop.style.top = ((pb.bottom - c.top) / k + 8) + "px"; segReset(w, first); }, u - 20);
      A(pop, [{ opacity: 0, transform: "translateY(-8px) scale(.9)" }, { opacity: 1, transform: "none" }], { duration: 280, delay: u, fill: "both", easing: "cubic-bezier(.2,.8,.2,1)" });
      if (SHORT.pop === "stepper" && plus) {
        /* The desk (v4 S2): Pages 10 → Chapters 1, then + pressed twice, the number swelling 1 → 2 → 3. */
        u += 500; u = seg(w, "chapters", Q.desk.chapters, u);
        u += 350;
        for (const v of Q.desk.steps) { press(plus, u); later(() => { w.n.textContent = v; }, u + 100); A(w.n, [{ transform: "scale(1)" }, { transform: "scale(1.18)", offset: .4 }, { transform: "scale(1)" }], { duration: 260, delay: u + 100, fill: "none" }); u += 420; }
      } else { u += 500; u = seg(w, "words", Q.words, u); u = seg(w, "chapters", Q.chapters, u + 300); }
      A(pop, [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(-8px) scale(.9)" }], { duration: 240, delay: u + 400, fill: "forwards" });
      e = step(parts[1], u + 500);
    }
    floatTag(parts[1], PHONE_STORY.chips.partial, e + 100);
    // Day 40 — the partial goes
    reveal(parts[2].st, e + 2600); knots.push([e + 2700, 36]);
    const ps = climb(waits[2]!, 36, 40, e + 2700) - 320;
    court(AGENT, ps); setPill("psent", ps); foot(F.partialSent[0], F.partialSent[1], false, ps);
    e = step(parts[2], ps);
    floatTag(parts[2], PHONE_STORY.chips.partialSent, e + 100);
    // Day 86 — it has gone quiet: the reminder, the nudge
    knots.push([e + 500, 40]);
    const L = climb(slotWait, 40, 86, e + 500) - 320;
    court(YOU, L); later(() => psd.classList.add("mk-late"), L); foot(F.partialSent[0], F.partialSent[1], true, L);
    A(psd, [{ transform: "scale(1)" }, { transform: "scale(1.25)", offset: .4 }, { transform: "scale(1)" }], { duration: 500, delay: L, fill: "none" });
    stamp(pn, L + 200, -1.2); A(pnIcon, [{ opacity: 0 }, { opacity: 1 }], { duration: 1, delay: L + 200 }); type(pnText, L + 200, 1); stamp(pnBtn, L + 400, 1.5);
    const np = press(pnBtn, L + 1500);
    knots.push([np + 200, 88]);
    A(pn, [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(.94)" }], { duration: 240, delay: np + 60, fill: "forwards" });
    reveal(parts[3].st, np + 60);
    court(AGENT, np + 60); later(() => psd.classList.remove("mk-late"), np + 60); foot(F.nudged[0], F.nudged[1], false, np + 60);
    e = step(parts[3], np + 200);
    floatTag(parts[3], PHONE_STORY.chips.nudge, e + 300);
    // Day 99 — the full
    reveal(parts[4].st, e + 2600); knots.push([e + 2700, 88]);
    const Fu = climb(waits[4]!, 88, 99, e + 2700) - 320;
    court(YOU, Fu); setPill("freq", Fu); foot(F.full[0], F.full[1], true, Fu);
    /* v3.2 (F1): and again for the full, before its line types in (150ms after it is face up). */
    e = step(parts[4], SHORT.flip ? flip("full", Fu + 80) + 150 : Fu);
    e = stamp(pf, e + 150, -1.2);
    A(pfIcon, [{ opacity: 0, transform: "scale(0) rotate(-90deg)" }, { opacity: 1, transform: "scale(1.3) rotate(10deg)", offset: .7 }, { opacity: 1, transform: "none" }], { duration: 520, delay: e, easing: BOUNCE });
    e = type(pfText, e + 60, 9); stamp(pfBtn, e + 100, 1.5);
    t = e + 1400;
    prepClock(); raf = requestAnimationFrame(runClock);
    if (!looped) later(() => hooks.onGrow?.(), t + 1200);
    // hold, then this card is dealt away and the story starts again
    const out = t + 2600;
    A(front, [{ translate: "0 0", rotate: "0deg", opacity: 1 }, { translate: "-130% -20px", rotate: "-10deg", opacity: 0 }], { duration: 520, delay: out, fill: "forwards", easing: "cubic-bezier(.5,0,.75,0)" });
    later(() => { looped = true; LEAD = 0; cancelAll(); playShort(true); }, out + 540);
  }
  function start(lead: number) { LEAD = lead || 0; stop(); if (reduceMotion()) return; looped = false; playShort(false); }
  /* Unmount: cancel everything and take back the dots this run added, so a second run (StrictMode,
     a remount) starts from the markup rather than from the leftovers of the first. */
  function dispose() { cancelAll(); waits.forEach((w) => w?.remove()); slotWait.remove(); root.querySelectorAll(".mk-taskchip, .mk-pillpop, .mk-cgx").forEach((g) => g.remove()); }
  setStatic();
  return { start, stop, dispose };
}

/* ═════════════ the first impression on the desk (the v4 ref's ENTER: ENTRIES['4'] + hk 'b') ═════════════ */
/* The fly-past's numbers, the ref's: from 300ms, 1250ms along one curve, in a 1280-wide frame. */
const FLY = { at: 300, dur: 1250, frame: 1280 };
/* ⚠️ `host` IS THE REF, READ WHEN NEEDED — never `host.current` captured at mount. This runs in the
   pile's layout effect, which React runs BEFORE it attaches the parent's ref, so `host.current` is
   still null here. v3 captured it, and so its pointer depth never ran at all (the move handler
   returned on a null host); v4 reads it on each move, and builds the fly layer one frame later. */
function enter(root: HTMLElement, hostRef: React.RefObject<HTMLElement | null>) {
  const front = root.querySelector<HTMLElement>('[data-hc="front"]')!;
  const backs = [...root.querySelectorAll<HTMLElement>(".mk-lc--back")];
  const cast = root.querySelector<HTMLElement>(".mk-lc-cast")!;
  const anims: Animation[] = [];
  const E = (el: Element, kf: Keyframe[], o: KeyframeAnimationOptions) => {
    const a = el.animate(kf, Object.assign({ fill: "backwards", easing: "cubic-bezier(.2,.7,.2,1)" }, o)); anims.push(a); return a;
  };
  // the headline, line and actions are all there on load and stay still
  /* E1 — pop: the front card pops in with a little overshoot, solid within its first 30%; the back
     cards a beat later, 70ms apart. No dealing, no rise. */
  const SPR = "cubic-bezier(.34,1.45,.5,1)";
  E(front, [{ opacity: 0, scale: ".86" }, { opacity: 1, offset: .3 }, { opacity: 1, scale: "1" }], { duration: 620, delay: 450, easing: SPR });
  backs.forEach((b, k) => E(b, [{ opacity: 0, scale: ".9" }, { opacity: 1, offset: .3 }, { opacity: 1, scale: "1" }], { duration: 520, delay: 800 + k * 70, easing: SPR }));

  /* H1/H2 — the hawk flies past once, in front of EVERYTHING. ⚠️ IT CANNOT LIVE IN THE HERO: the hero
     wrapper is a stacking context at z-index 2 under the sticky nav (60), and the page's sheet clips
     (`overflow: clip`). So the layer is appended to <body> at z-index 200, laid over the hero in the
     ref's 1280 frame (the wrapper's own box, scaled by width / 1280, the same `k` as `size()`), and
     nothing between it and the root clips it; it may leave by the viewport's edge. */
  let layer: HTMLElement | null = null, flyRaf = 0;
  const born = performance.now();
  const fly = () => {
    const host = hostRef.current; if (!host) return;
    layer = document.createElement("div"); layer.className = "mk-hfly"; layer.setAttribute("aria-hidden", "true");
    const bird = document.createElement("div"); bird.className = "mk-hfly-bird";
    const img = document.createElement("img"); img.src = HERO_FLY.src + "?v=" + HERO_FLY.version; img.alt = ""; img.width = HERO_FLY.width; img.height = HERO_FLY.height;
    bird.appendChild(img); layer.appendChild(bird); document.body.appendChild(layer);
    const r = host.getBoundingClientRect(), k = host.clientWidth / FLY.frame;
    layer.style.left = r.left + window.scrollX + "px"; layer.style.top = r.top + window.scrollY + "px";
    layer.style.width = FLY.frame + "px"; layer.style.height = host.clientHeight / k + "px";
    layer.style.transform = `scale(${k})`;
    /* The delay is counted from mount, so the frame this waited does not push the pass back. */
    const at = FLY.at - (performance.now() - born);
    anims.push(bird.animate([{ opacity: 1, offsetDistance: "0%", scale: .94 }, { opacity: 1, offsetDistance: "100%", scale: 1.06 }], { duration: FLY.dur, delay: at, easing: "linear", fill: "none" }));
    anims.push(img.animate([{ filter: "blur(7px)" }, { filter: "blur(11px)" }], { duration: FLY.dur, delay: at, fill: "none" }));
  };
  flyRaf = requestAnimationFrame(fly);
  /* H3 — then it rests: the cast shadow, hidden at load, fades in once the fly-past is over. */
  E(cast, [{ opacity: 0 }, { opacity: .2 }], { duration: 1400, delay: FLY.at + FLY.dur + 200, easing: "ease-out", fill: "both" });

  /* E3 — a little depth: the cards drift as the pointer moves (pointer devices only). The shadow no
     longer moves with the pointer (v4). */
  let px = 0, py = 0, tx = 0, ty = 0, on = false, raf = 0;
  const fine = !!window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  function drift() {
    px += (tx - px) * .08; py += (ty - py) * .08;
    front.style.translate = `${px * 10}px ${py * 8}px`;
    backs.forEach((b, k) => { b.style.translate = `${px * (4 + k)}px ${py * (3 + k)}px`; });
    if (Math.abs(tx - px) + Math.abs(ty - py) > .002) raf = requestAnimationFrame(drift); else on = false;
  }
  const move = (e: PointerEvent) => {
    const host = hostRef.current;
    if (e.pointerType === "touch" || !host) return;
    const r = host.getBoundingClientRect(); if (!r.width || !r.height) return;
    tx = ((e.clientX - r.left) / r.width - .5); ty = ((e.clientY - r.top) / r.height - .5);
    if (!on) { on = true; raf = requestAnimationFrame(drift); }
  };
  if (fine) window.addEventListener("pointermove", move, { passive: true });
  return () => {
    anims.forEach((a) => a.cancel());
    window.removeEventListener("pointermove", move);
    cancelAnimationFrame(raf); cancelAnimationFrame(flyRaf);
    layer?.remove();
    [front, ...backs].forEach((el) => { el.style.translate = ""; });
  };
}

/** The manuscript block, on every card since v4: a book tile, the title, then the tags. The front
    card's manuscript is "The Taloned Mr Ripley"; the back cards' "Lord of the Wings". */
const Ms: React.FC<{ chips: readonly string[]; front?: boolean }> = ({ chips, front }) => (
  <div className="mk-lc-ms" data-hc={front ? "ms" : undefined}>
    <small aria-hidden="true"><BookIcon /></small>
    <b data-hc={front ? "ms-title" : undefined}>{front ? HERO_PHONE_MS_FRONT : HERO_PHONE_MS}</b>
    <div className="mk-lc-chips">{chips.map((x) => <span key={x}>{x}</span>)}</div>
  </div>
);

/* ═════════════ the first impression on a phone (the mobile ref's ENTER and fly-past) ═════════════ */
function enterPhone(scope: HTMLElement) {
  const front = scope.querySelector<HTMLElement>('[data-hc="front"]')!;
  const backs = [...scope.querySelectorAll<HTMLElement>(".mk-lc--back")];
  const fly = scope.querySelector<HTMLElement>(".mk-hp-fly");
  const anims: Animation[] = [];
  const E = (el: Element, kf: Keyframe[], o: KeyframeAnimationOptions) => {
    const a = el.animate(kf, Object.assign({ fill: "backwards", easing: "cubic-bezier(.16,1,.3,1)" }, o)); anims.push(a); return a;
  };
  // dealt from the side: each back card slides in from the right, spinning down onto the pile; the front lands last
  backs.forEach((b, k) => E(b, [{ opacity: 0, translate: "720px -40px", rotate: "18deg" }, { opacity: 1, offset: .25 }, { opacity: 1, translate: "0 0", rotate: "0deg" }], { duration: 700, delay: 350 + k * 150 }));
  E(front, [{ opacity: 0, translate: "760px -60px", rotate: "16deg" }, { opacity: 1, offset: .25 }, { opacity: 1, translate: "0 0", rotate: "0deg" }], { duration: 800, delay: 350 + 4 * 150 + 60 });
  // the hawk's shadow: one pass, low left to top right along one curve, at a constant speed — at 650ms
  // (v2 P2), while the cards are still being dealt
  if (fly) {
    anims.push(fly.animate([{ opacity: 1, offsetDistance: "0%", scale: .94 }, { opacity: 1, offsetDistance: "100%", scale: 1.06 }], { duration: 1000, delay: 650, easing: "linear", fill: "none" }));
    const img = fly.querySelector("img");
    if (img) anims.push(img.animate([{ filter: "blur(7px)" }, { filter: "blur(10px)" }], { duration: 1000, delay: 650, fill: "none" }));
  }
  return () => { anims.forEach((a) => a.cancel()); };
}

const BackCard: React.FC<{ c: typeof BACKS[number]; phone: boolean; t?: string }> = ({ c, phone, t }) => (
  <div className={"mk-lc mk-lc--back " + c.cls} style={phone ? { left: 688, top: 14, transform: t } : { left: c.left, top: c.top, transform: c.t }}>
    <div className="mk-lc-in">
      <div className="mk-lc-band" style={{ background: c.band[0], color: c.band[1] }}><span>{c.word}</span><span>{c.day}</span></div>
      <div className="mk-lc-agent"><Disc /><div><div className="mk-lc-nm">{c.name}</div><div className="mk-lc-ag">{c.agency}</div></div><span className="mk-lc-pill" style={{ background: c.pillBg }}>{RING}{c.pill}</span></div>
      <Ms chips={c.chips} />
      <div className="mk-lc-tabs"><span>Tracking</span><span>Agent</span><span>Materials</span></div>
      {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className={"mk-lc-line" + (i % 2 ? " mk-lc-line--s" : "")} />)}
    </div>
  </div>
);

/** The living card. */
const FrontCard: React.FC<{ phone: boolean }> = ({ phone }) => (
    <div className="mk-lc" data-hc="front">
      <div className="mk-lc-in">
        <div className="mk-lc-band" data-hc="band" style={{ background: YOU.bg, color: YOU.fg }}>
          <span data-hc="bandt">With you</span>
          <span className="mk-lc-day" data-hc="day" data-n="99">Day 99</span>
        </div>
        <div className="mk-lc-agent" data-hc="agent">
          <Disc />
          <div><div className="mk-lc-nm">Eleanor Whitfield</div><div className="mk-lc-ag">Greenfield Literary</div></div>
          <span className="mk-lc-pill" data-hc="pill" style={{ background: YOU.pill }} dangerouslySetInnerHTML={{ __html: PILL.freq }} />
        </div>
        <Ms front chips={phone ? HERO_PHONE_TAGS : ["ADULT", "LITERARY FICTION", "94,000 WORDS"]} />
        <div className="mk-lc-tabs" data-hc="tabs"><span>Tracking</span><span>Agent</span><span>Materials</span></div>
        <div className="mk-lc-tlv mk-lc-tlv--scroll" data-hc="tlv">
          <ol className="mk-lc-steps" data-hc="steps">
            <i className="mk-lc-rail" aria-hidden="true" />
            <li className="mk-lc-step">
              <svg className="mk-lc-g" width="17" height="17" viewBox="0 0 20 20"><circle cx="10" cy="10" r="7.5" fill="none" stroke="#1c130f" strokeWidth="1.6" /></svg>
              <span className="mk-lc-t">Query sent <i>by email</i></span><span className="mk-lc-d">14 MAR</span>
              <span className="mk-lc-att"><span><DocIcon />Letter v3</span><span><SynIcon />Synopsis</span><span><PagesIcon />15 pages</span></span>
            </li>
            <li className="mk-lc-step">
              <svg className="mk-lc-g" width="17" height="17" viewBox="0 0 20 20"><circle cx="10" cy="10" r="7.5" fill="none" stroke="#1c130f" strokeWidth="1.6" strokeDasharray="2.2 2.2" /><path d="M10 4.5a5.5 5.5 0 0 1 0 11z" fill="#1c130f" /></svg>
              <span className="mk-lc-t">Partial requested</span><span className="mk-lc-d">18 APR</span>
              <span className="mk-lc-att"><span><PagesIcon />First 3 chapters</span></span>
            </li>
            <li className="mk-lc-step">
              <svg className="mk-lc-g" width="17" height="17" viewBox="0 0 20 20"><circle cx="10" cy="10" r="7.5" fill="none" stroke="#1c130f" strokeWidth="1.6" /><path d="M10 2.5a7.5 7.5 0 0 1 0 15z" fill="#1c130f" /></svg>
              <span className="mk-lc-t">Partial sent</span><span className="mk-lc-d" data-hc="psd">22 APR</span>
              <span className="mk-lc-att"><span className="mk-ok"><svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6.5l2.6 2.5L10 3.5" /></svg>First 3 chapters</span></span>
            </li>
            <li className="mk-lc-step">
              <svg className="mk-lc-g" width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="#1c130f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="10" r="7.5" /><path d="M7 12.5h6l-.9-1.2V9a2.1 2.1 0 0 0-4.2 0v2.3zM9.2 14h1.6" /></svg>
              <span className="mk-lc-t">You nudged Eleanor</span><span className="mk-lc-d">14 JUN</span>
              <span className="mk-lc-att"><span><BellIcon />Reminder in 2 weeks</span></span>
            </li>
            <li className="mk-lc-step">
              <svg className="mk-lc-g" width="17" height="17" viewBox="0 0 20 20"><circle cx="10" cy="10" r="7.5" fill="#1c130f" stroke="#1c130f" strokeWidth="1.6" strokeDasharray="2.2 2.2" /></svg>
              <span className="mk-lc-t">Full requested</span><span className="mk-lc-d">21 JUN</span>
              <span className="mk-lc-att"><span><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.1"><path d="M2 1.5h7a1.5 1.5 0 0 1 1.5 1.5v7.5H3.5A1.5 1.5 0 0 1 2 9z" /><path d="M2 9a1.5 1.5 0 0 1 1.5-1.5h7" /></svg>Full manuscript</span></span>
            </li>
          </ol>
        </div>
        <div className="mk-lc-slot" data-hc="slot">
          <div className="mk-lc-panel" data-hc="pn"><p><BellIcon w={16} h={16} sw={1.6} stroke="#7c3a2a" /><span className="mk-lc-nt">Eleanor should’ve replied last week</span></p><b>Nudge</b></div>
          <div className="mk-lc-panel mk-lc-panel--final" data-hc="pf"><p><svg width="17" height="17" viewBox="0 0 20 20" fill="#a2452a"><path d="M10 1.8l1.9 5.3 5.3 1.9-5.3 1.9L10 16.2l-1.9-5.3L2.8 9l5.3-1.9z" /><path d="M16 13.2l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" /></svg><span className="mk-lc-nt">Eleanor wants the full! Send it by 5 July.</span></p><b>Mark sent</b></div>
        </div>
        <div className="mk-lc-ft">
          <span data-hc="ftl" className="mk-late"><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2"><circle cx="6" cy="6" r="5" /><path d="M6 3.2V6l2 1.3" /></svg><em data-hc="ftt">Send the full by 5 July</em></span>
          <span data-hc="fta">Mark full sent</span>
        </div>
  </div>
</div>
);

/**
 * The pile. `host` is the hero element the pointer is measured against; the hero itself places and
 * scales the pile (see `Hero.tsx`'s `size()`, or `HeroPhone.tsx` on a phone), which reads
 * `[data-hc="front"]` for the card's box.
 *
 * ⚠️ ONE STORY, TWO LAYOUTS, FIXED PER MOUNT. Both play the short loop (`playShort`) — Query sent to
 * Full requested, dealt away, dealt in, again, for ever. `variant="phone"` (≤760px) draws the pile
 * under the header with the ref's phone transforms, no blur and no cast shadow, and calls `onGrow`
 * after its first run only. Neither offers Watch again: the story loops by itself (desktop v4).
 * A change of breakpoint remounts the hero rather than re-rendering this.
 */
export const HeroCard: React.FC<{
  host: React.RefObject<HTMLElement | null>;
  variant?: "desk" | "phone";
  onGrow?: () => void;
}> = React.memo(({ host, variant = "desk", onGrow }) => {
  const phone = variant === "phone";
  const root = useRef<HTMLDivElement>(null);
  const scope = useRef<HTMLDivElement>(null);
  /* The latest `onGrow`, read when the story ends — never a dependency, so it cannot restart it. */
  const grow = useRef(onGrow);
  grow.current = onGrow;

  /* ⚠️ A LAYOUT EFFECT, SO THE ENTRANCE IS APPLIED BEFORE THE FIRST PAINT. With `fill: backwards` the
     cards and the shadow hold their first keyframe through their delays — invisible at 0.1s — and a
     plain effect would paint the resting pile for one frame before taking it away. */
  useLayoutEffect(() => {
    if (reduceMotion()) return;
    if (phone) { const el = scope.current; return el ? enterPhone(el) : undefined; }
    const el = root.current; if (!el) return;
    return enter(el, host);
  }, [host, phone]);

  useEffect(() => {
    const el = phone ? scope.current : root.current; if (!el) return;
    const story = makeStory(el, { phone, onGrow: () => grow.current?.() });
    if (reduceMotion()) return () => story.dispose();
    /* The story starts at the ref's lead — but its first act measures
       the timeline's lines, so it waits for the fonts. If they are slower than that, it starts the
       moment they arrive with whatever lead is left, never early. */
    const born = performance.now();
    let live = true;
    /* The refs' leads: `V4.start(1500)` on the desk after the pop (v4 E2), `V4.start(1300)` on a phone. */
    const lead = phone ? 1300 : 1500;
    const go = () => { if (live) story.start(Math.max(0, lead - (performance.now() - born))); };
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (fonts?.ready) fonts.ready.then(go, go); else go();
    return () => { live = false; story.dispose(); };
  }, [phone]);

  if (phone) return (
    <div className="mk-hp-scope" ref={scope}>
      <div className="mk-hp-hero">
        <div className="mk-hc-pile mk-hc-pile--phone" ref={root} aria-hidden="true">
          {BACKS.map((c, k) => <BackCard key={c.ini} c={c} phone t={phoneBackTransform(PHONE_BACKS[k])} />)}
          <FrontCard phone />
        </div>
      </div>
      {/* The hawk's shadow, once: above the pile, below the drawer (the stage is its own stacking
          context, under the sheet), so it never darkens the drawer. */}
      <div className="mk-hp-fly" aria-hidden="true">
        <img src={HERO_FLY.src + "?v=" + HERO_FLY.version} alt="" width={HERO_FLY.width} height={HERO_FLY.height} />
      </div>
    </div>
  );

  return (
    <div className="mk-hc-pile" ref={root} aria-hidden="true">
      {BACKS.map((c) => <BackCard key={c.ini} c={c} phone={false} />)}
      <FrontCard phone={false} />

      {/* ⚠️ THE SHADOW IS CAST OVER THE PILE, not set in a column of its own: multiply, .2, blurred,
          turned −4°, and it never takes a click. */}
      <img
        className="mk-lc-cast"
        src={HERO_SHADOW.src + "?v=" + HERO_SHADOW.version}
        alt=""
        width={HERO_SHADOW.width}
        height={HERO_SHADOW.height}
      />
    </div>
  );
});
HeroCard.displayName = "HeroCard";
