/**
 * HeroCard — the landing hero's card pile (landing hero v3, ref design-refs/landing-hero-v3.html):
 * four blurred cards behind, one living query card in front, and the hawk's shadow cast over both.
 *
 * ⚠️ IT IS A PORT, NOT A REWRITE. The ref's two scripts — `V4` (the card's story, Day 32 → 99, on a
 * continuous odometer clock) and `ENTER` (the cards dealing in, the shadow passing over, pointer
 * depth) — are carried across with their structure, their Web Animations calls, their fill rules,
 * their timings and their copy. Where a value looks arbitrary it is the ref's; change it there first.
 * The ref's three retired counter styles (split-flap, day + date, heartbeat) are not ported.
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

/* The shadow's own facts — unchanged from the previous hero, and a smoke test still reads the PNG's
   header against the size and its md5 against the version. Replace the file, change the version. */
export const HERO_SHADOW = { src: "/images/hawk-shadow.png", version: "24b7a5ea", width: 1400, height: 1197 };

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

/* ── the four cards behind, positions and angles from the ref ── */
const BACKS = [
  { cls: "mk-lc--o", left: 640, top: 90, t: "rotate(-9deg) scale(.82)", band: ["#f5e6df", "#7c3a2a"], word: "With you", day: "Day 21", ini: "GP", name: "Greg Panetta", agency: "Panetta Associates", pillBg: "#f5e6df", pill: "Full requested", chips: ["ADULT", "LITERARY FICTION"] },
  { cls: "", left: 668, top: -10, t: "rotate(-5deg) scale(.8)", band: ["#e4e1db", "#5b524a"], word: "Closed", day: "Day 34", ini: "TR", name: "Tessa Rowe", agency: "Marlowe & Finch", pillBg: "#ece8e3", pill: "Passed", chips: ["ADULT", "94,000 WORDS"] },
  { cls: "mk-lc--o", left: 790, top: 84, t: "rotate(11deg) scale(.82)", band: ["#f7efe3", "#6e5a3a"], word: "With the agent", day: "Day 9", ini: "AK", name: "Amira Khan", agency: "Northlight Agency", pillBg: "#f4ecdd", pill: "Queried", chips: ["ADULT", "LITERARY FICTION"] },
  { cls: "", left: 772, top: -4, t: "rotate(6deg) scale(.8)", band: ["#d7e0e8", "#2f4258"], word: "Offer", day: "Day 128", ini: "TE", name: "Tom Ellery", agency: "Ellery & Finch", pillBg: "#d7e0e8", pill: "Offer", chips: ["ADULT", "LITERARY FICTION"] },
] as const;

const reduceMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ═════════════ variation 4: one query, start to finish (the ref's V4, ported) ═════════════ */
function makeStory(root: HTMLElement) {
  const $ = (k: string) => root.querySelector<HTMLElement>(`[data-hc="${k}"]`)!;
  const ol = $("steps"), tlv = $("tlv"), steps = [...ol.querySelectorAll<HTMLElement>(".mk-lc-step")];
  const band = $("band"), bandT = $("bandt"), day = $("day"), pill = $("pill"), psd = $("psd");
  const ftL = $("ftl"), ftT = $("ftt"), ftA = $("fta");
  const slot = $("slot"), pn = $("pn"), pf = $("pf");
  const form = $("lf"), fToday = $("lf-today"), f2w = $("lf-2w"), fNote = $("lf-note"), fSave = $("lf-save");

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
  const pnText = split(pn.querySelector<HTMLElement>(".mk-lc-nt")!), pfText = split(pf.querySelector<HTMLElement>(".mk-lc-nt")!), noteText = split(fNote);
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
  let tilt = 0; const tilts = [-1.4, 1.1, -.6, 1.6, -1, .8];
  function stamp(el: Element, t: number, r?: number | null, fill?: FillMode) {
    r = r != null ? r : tilts[(tilt++) % tilts.length];
    A(el, [{ opacity: 0, transform: `scale(1.35) rotate(${r * 2}deg)` }, { opacity: 1, transform: `scale(.96) rotate(${r}deg)`, offset: .6 }, { opacity: 1, transform: "scale(1.01) rotate(0deg)", offset: .82 }, { opacity: 1, transform: "none" }], { duration: 340, delay: t, fill: fill || "both", easing: "cubic-bezier(.55,0,.75,.2)" });
    return t + 340;
  }
  const press = (el: Element, t: number) => { A(el, [{ transform: "scale(1)" }, { transform: "scale(.86)", offset: .35 }, { transform: "scale(1.06)", offset: .7 }, { transform: "scale(1)" }], { duration: 380, delay: t, fill: "none" }); return t + 380; };
  const select = (el: Element, t: number) => {
    press(el, t);
    A(el, [{ background: "#fff", color: "#1c130f", boxShadow: "inset 0 0 0 1px rgba(28,19,15,.18)" }, { background: "#2a3a52", color: "#fff", boxShadow: "inset 0 0 0 1px #2a3a52" }], { duration: 180, delay: t + 120, fill: "forwards" });
    return t + 380;
  };

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
    const n = to - from, dur = Math.max(900, Math.min(12000, n * 240));
    A(w, [{ opacity: 0 }, { opacity: 1 }], { duration: 220, delay: t, fill: "forwards" });
    A(w, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, delay: t + dur, fill: "forwards" });
    knots.push([t + dur, to]);
    land(t + dur);
    return t + dur + 320;
  }
  function step(p: typeof parts[number], t: number) {
    A(p.g, [{ transform: "scale(0)" }, { transform: "scale(1.2)", offset: .7 }, { transform: "scale(1)" }], { duration: 300, delay: t, easing: BOUNCE });
    t = type(p.chars, t + 200);
    A(p.d, [{ opacity: 0, transform: "translateY(3px)" }, { opacity: 1, transform: "none" }], { duration: 280, delay: t + 120 });
    t += 200;
    if (p.chips.length) { t += 380; p.chips.forEach((c) => { t = stamp(c, t); t += 160; }); }
    if (p.em) { A(p.em, [{ opacity: 0, transform: "translateX(-6px)" }, { opacity: 1, transform: "none" }], { duration: 400, delay: t + 60 }); t += 420; }
    return t;
  }
  // once the story is told, the tracking feed is the writer's to scroll
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
  function play() {
    tilt = 0; scrolled = 0; ol.style.transform = "none"; tlv.classList.remove("mk-lc-tlv--scroll"); tlv.scrollTop = 0;
    band.style.background = AGENT.bg; band.style.color = AGENT.fg; bandT.textContent = AGENT.word; pill.style.background = AGENT.pill; pill.innerHTML = PILL.queried;
    ftT.textContent = "Reply expected by 9 May"; ftA.textContent = "Record a response"; ftL.classList.remove("mk-late"); psd.classList.remove("mk-late");
    A(pf, [{ opacity: 0 }, { opacity: 0 }], { duration: 1, fill: "forwards" });
    let t = 700 + LEAD;
    build(); show(32); knots = [[t, 32]]; t0 = performance.now();
    // the story opens on Day 32: the query went out on 14 Mar and is already on the card
    // Day 36 — she asks for the partial: your move
    reveal(parts[1].st, t);
    t = climb(waits[1]!, 32, 36, t + 300);
    court(YOU, t); setPill("preq", t); foot("Send the partial by 25 April", "Mark partial sent", true, t);
    t = step(parts[1], t);
    // Day 40 — the partial goes, and it matches what she asked for
    reveal(parts[2].st, t + 300);
    t = climb(waits[2]!, 36, 40, t + 500);
    court(AGENT, t); setPill("psent", t); foot("Response expected by 3 June", "Record a response", false, t);
    t = step(parts[2], t);
    // the long wait — past the date she gave
    t = climb(slotWait, 40, 86, t + 600);
    court(YOU, t); later(() => psd.classList.add("mk-late"), t); foot("Response expected by 3 June", "Record a response", true, t);
    A(psd, [{ transform: "scale(1)" }, { transform: "scale(1.25)", offset: .4 }, { transform: "scale(1)" }], { duration: 500, delay: t, fill: "none" });
    t = stamp(pn, t + 200, -1.2);
    A(pnIcon, [{ opacity: 0 }, { opacity: 1 }], { duration: 1, delay: t });
    A(pnIcon, [{ transform: "rotate(0)" }, { transform: "rotate(-20deg)" }, { transform: "rotate(16deg)" }, { transform: "rotate(-8deg)" }, { transform: "rotate(0)" }], { duration: 700, delay: t + 60, fill: "none", easing: "ease-in-out" });
    t = type(pnText, t + 200);
    t = stamp(pnBtn, t + 300, 1.5);
    // the writer presses Nudge, and the form opens
    t = press(pnBtn, t + 600);
    A(form, [{ opacity: 0, transform: "translateY(18px) scale(.97)" }, { opacity: 1, transform: "none" }], { duration: 380, delay: t + 60, fill: "forwards", easing: BOUNCE });
    t += 550;
    t = select(fToday, t);
    t = select(f2w, t + 350);
    t = type(noteText, t + 300, 24);
    t = press(fSave, t + 450);
    knots.push([t, 92]);   // saved on Day 92, 14 Jun
    A(form, [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(10px) scale(.98)" }], { duration: 280, delay: t + 80, fill: "forwards" });
    t += 420;
    // the nudge is logged; it's back with the agent
    A(pn, [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(.94)" }], { duration: 260, delay: t, fill: "forwards" });
    reveal(parts[3].st, t);
    court(AGENT, t); later(() => psd.classList.remove("mk-late"), t); foot("Reminder on 28 June", "Record a response", false, t);
    t = step(parts[3], t + 400);
    // Day 99 — she wants the full
    reveal(parts[4].st, t + 300);
    t = climb(waits[4]!, 92, 99, t + 600);
    court(YOU, t); setPill("freq", t); foot("Send the full by 5 July", "Mark full sent", true, t);
    t = step(parts[4], t);
    t = stamp(pf, t + 500, -1.2);
    A(pfIcon, [{ opacity: 0, transform: "scale(0) rotate(-90deg)" }, { opacity: 1, transform: "scale(1.3) rotate(10deg)", offset: .7 }, { opacity: 1, transform: "none" }], { duration: 520, delay: t, easing: BOUNCE });
    t = type(pfText, t + 300);
    t = stamp(pfBtn, t + 400, 1.5);
    A(pfIcon, [{ transform: "scale(1) rotate(0)" }, { transform: "scale(1.35) rotate(25deg)" }, { transform: "scale(1) rotate(0)" }], { duration: 700, delay: t + 250, fill: "none", easing: "ease-in-out" });
    prepClock(); raf = requestAnimationFrame(runClock);
    later(scrollable, t + 900);
  }
  function start(lead: number) { LEAD = lead || 0; stop(); if (reduceMotion()) return; play(); }
  /* Unmount: cancel everything and take back the dots this run added, so a second run (StrictMode,
     a remount) starts from the markup rather than from the leftovers of the first. */
  function dispose() { cancelAll(); waits.forEach((w) => w?.remove()); slotWait.remove(); }
  setStatic();
  return { start, stop, dispose };
}

/* ═════════════ the first impression (the ref's ENTER, ported) ═════════════ */
function enter(root: HTMLElement, host: HTMLElement | null) {
  const front = root.querySelector<HTMLElement>('[data-hc="front"]')!;
  const backs = [...root.querySelectorAll<HTMLElement>(".mk-lc--back")];
  const cast = root.querySelector<HTMLElement>(".mk-lc-cast")!;
  const anims: Animation[] = [];
  const E = (el: Element, kf: Keyframe[], o: KeyframeAnimationOptions) => {
    const a = el.animate(kf, Object.assign({ fill: "backwards", easing: "cubic-bezier(.2,.7,.2,1)" }, o)); anims.push(a); return a;
  };
  // the headline, line and actions are all there on load and stay still
  // the pile deals itself out: the back cards fan in, then the front card lands
  backs.forEach((b, k) => E(b, [{ opacity: 0, translate: "0 30px" }, { opacity: 1, offset: .3 }, { opacity: 1, translate: "0 0" }], { duration: 650, delay: 900 + k * 110 }));
  E(front, [{ opacity: 0, translate: "0 46px" }, { opacity: 1, translate: "0 0" }], { duration: 800, delay: 1350, easing: "cubic-bezier(.2,.8,.2,1)" });
  // the hawk's shadow passes in over the page and settles
  E(cast, [{ opacity: 0, translate: "-260px -90px" }, { opacity: .2, translate: "0 0" }], { duration: 2600, delay: 500, easing: "cubic-bezier(.25,.6,.25,1)" });

  // a little depth: the card and the shadow drift apart as the pointer moves — pointer devices only
  let px = 0, py = 0, tx = 0, ty = 0, on = false, raf = 0;
  const fine = !!window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  function drift() {
    px += (tx - px) * .08; py += (ty - py) * .08;
    front.style.translate = `${px * 10}px ${py * 8}px`;
    backs.forEach((b, k) => { b.style.translate = `${px * (4 + k)}px ${py * (3 + k)}px`; });
    cast.style.translate = `${-px * 22}px ${-py * 14}px`;
    if (Math.abs(tx - px) + Math.abs(ty - py) > .002) raf = requestAnimationFrame(drift); else on = false;
  }
  const move = (e: PointerEvent) => {
    if (e.pointerType === "touch" || !host) return;
    const r = host.getBoundingClientRect(); if (!r.width || !r.height) return;
    tx = ((e.clientX - r.left) / r.width - .5); ty = ((e.clientY - r.top) / r.height - .5);
    if (!on) { on = true; raf = requestAnimationFrame(drift); }
  };
  if (fine) window.addEventListener("pointermove", move, { passive: true });
  return () => {
    anims.forEach((a) => a.cancel());
    window.removeEventListener("pointermove", move);
    cancelAnimationFrame(raf);
    [front, cast, ...backs].forEach((el) => { el.style.translate = ""; });
  };
}

const BackCard: React.FC<{ c: typeof BACKS[number] }> = ({ c }) => (
  <div className={"mk-lc mk-lc--back " + c.cls} style={{ left: c.left, top: c.top, transform: c.t }}>
    <div className="mk-lc-in">
      <div className="mk-lc-band" style={{ background: c.band[0], color: c.band[1] }}><span>{c.word}</span><span>{c.day}</span></div>
      <div className="mk-lc-agent"><span className="mk-lc-disc">{c.ini}</span><div><div className="mk-lc-nm">{c.name}</div><div className="mk-lc-ag">{c.agency}</div></div><span className="mk-lc-pill" style={{ background: c.pillBg }}>{RING}{c.pill}</span></div>
      <div className="mk-lc-ms"><small>QUERYING</small><b>The Salt Road</b><div className="mk-lc-chips">{c.chips.map((x) => <span key={x}>{x}</span>)}</div></div>
      <div className="mk-lc-tabs"><span>Tracking</span><span>Agent</span><span>Materials</span></div>
      {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className={"mk-lc-line" + (i % 2 ? " mk-lc-line--s" : "")} />)}
    </div>
  </div>
);

/**
 * The pile. `host` is the hero element the pointer is measured against; the hero itself places and
 * scales the pile (see `Hero.tsx`'s `size()`), which reads `[data-hc="front"]` for the card's box.
 */
export const HeroCard: React.FC<{ host: React.RefObject<HTMLElement | null> }> = React.memo(({ host }) => {
  const root = useRef<HTMLDivElement>(null);

  /* ⚠️ A LAYOUT EFFECT, SO THE ENTRANCE IS APPLIED BEFORE THE FIRST PAINT. With `fill: backwards` the
     cards and the shadow hold their first keyframe through their delays — invisible at 0.1s — and a
     plain effect would paint the resting pile for one frame before taking it away. */
  useLayoutEffect(() => {
    const el = root.current; if (!el || reduceMotion()) return;
    return enter(el, host.current);
  }, [host]);

  useEffect(() => {
    const el = root.current; if (!el) return;
    const story = makeStory(el);
    if (reduceMotion()) return () => story.dispose();
    /* The story starts 1.7s after load, as the ref's `V4.start(1700)` — but its first act measures
       the timeline's lines, so it waits for the fonts. If they are slower than that, it starts the
       moment they arrive with whatever lead is left, never early. */
    const born = performance.now();
    let live = true;
    const go = () => { if (live) story.start(Math.max(0, 1700 - (performance.now() - born))); };
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (fonts?.ready) fonts.ready.then(go, go); else go();
    return () => { live = false; story.dispose(); };
  }, []);

  return (
    <div className="mk-hc-pile" ref={root} aria-hidden="true">
      {BACKS.map((c) => <BackCard key={c.ini} c={c} />)}

      <div className="mk-lc" data-hc="front">
        <div className="mk-lc-in">
          <div className="mk-lc-band" data-hc="band" style={{ background: YOU.bg, color: YOU.fg }}>
            <span data-hc="bandt">With you</span>
            <span className="mk-lc-day" data-hc="day" data-n="99">Day 99</span>
          </div>
          <div className="mk-lc-agent">
            <span className="mk-lc-disc">EW</span>
            <div><div className="mk-lc-nm">Eleanor Whitfield</div><div className="mk-lc-ag">Greenfield Literary</div></div>
            <span className="mk-lc-pill" data-hc="pill" style={{ background: YOU.pill }} dangerouslySetInnerHTML={{ __html: PILL.freq }} />
          </div>
          <div className="mk-lc-ms"><small>QUERYING</small><b>The Salt Road</b><div className="mk-lc-chips"><span>ADULT</span><span>LITERARY FICTION</span><span>94,000 WORDS</span></div></div>
          <div className="mk-lc-tabs"><span>Tracking</span><span>Agent</span><span>Materials</span></div>
          <div className="mk-lc-tlv mk-lc-tlv--scroll" data-hc="tlv">
            <ol className="mk-lc-steps" data-hc="steps">
              <i className="mk-lc-rail" aria-hidden="true" />
              <li className="mk-lc-step">
                <svg className="mk-lc-g" width="17" height="17" viewBox="0 0 20 20"><circle cx="10" cy="10" r="7.5" fill="none" stroke="#1c130f" strokeWidth="1.6" /></svg>
                <span className="mk-lc-t">Query sent <i>by email</i></span><span className="mk-lc-d">14 MAR</span>
                <span className="mk-lc-att"><span><DocIcon />Letter v3</span><span><SynIcon />Synopsis</span><span><PagesIcon />10 pages</span></span>
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
          {/* The nudge form opens OVER the card, and nothing darkens the card behind it. The "Today"
              chip names no date, as the ref's does. */}
          <div className="mk-lf" data-hc="lf">
            <div className="mk-lf-in">
              <div className="mk-lf-h"><small>NUDGE</small><b>Nudge Eleanor</b><i>GREENFIELD LITERARY · PARTIAL SENT 22 APR</i></div>
              <div className="mk-lf-b">
                <span className="mk-lf-l">SENT</span>
                <div className="mk-lf-row"><span className="mk-lf-ch" data-hc="lf-today">Today</span><span className="mk-lf-ch">Yesterday</span><span className="mk-lf-ch">Pick a date</span></div>
                <span className="mk-lf-l">REMIND ME AGAIN IN</span>
                <div className="mk-lf-row"><span className="mk-lf-ch">1 week</span><span className="mk-lf-ch" data-hc="lf-2w">2 weeks</span><span className="mk-lf-ch">3 weeks</span></div>
                <span className="mk-lf-l">A NOTE (OPTIONAL)</span>
                <div className="mk-lf-note" data-hc="lf-note">Just checking in on the partial. Hope all’s well!</div>
              </div>
              <div className="mk-lf-f"><b data-hc="lf-save">Save nudge</b><span>Cancel</span></div>
            </div>
          </div>
        </div>
      </div>

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
