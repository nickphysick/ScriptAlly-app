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
import { HERO_AGAIN, HERO_PHONE_MS, HERO_PHONE_TAGS, PHONE_STORY } from "./landingCopy";

/* The shadow's own facts — unchanged from the previous hero, and a smoke test still reads the PNG's
   header against the size and its md5 against the version. Replace the file, change the version. */
export const HERO_SHADOW = { src: "/images/hawk-shadow.png", version: "24b7a5ea", width: 1400, height: 1197 };
/* The phone's flying shadow (ref `.fly img`), pre-rotated in the file. public/ is not fingerprinted,
   so the version is the first eight hex digits of the file's own md5. */
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

const AgainIcon = () => <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="M13 8a5 5 0 1 1-1.6-3.7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /><path d="M13 2.5v3.2H9.8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;

const BookIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 6.5C10 5 7.5 4.5 4 4.5v13c3.5 0 6 .5 8 2 2-1.5 4.5-2 8-2v-13c-3.5 0-6 .5-8 2z" /><path d="M12 6.5v13" /></svg>;

/* The phone cards' profile head (v2 P3, the ref's HEAD): a head-and-shoulders silhouette where the
   desk card prints initials. */
const Head = ({ w = 22 }: { w?: number }) => <svg viewBox="0 0 24 24" width={w} height={w} aria-hidden="true"><circle cx="12" cy="9" r="4.2" fill="currentColor" /><path d="M4.2 21c.9-4.2 4-6.6 7.8-6.6s6.9 2.4 7.8 6.6z" fill="currentColor" /></svg>;
const Disc: React.FC<{ phone: boolean; ini: string }> = ({ phone, ini }) => <span className="mk-lc-disc">{phone ? <Head /> : ini}</span>;

/* ── the four cards behind, positions and angles from the ref ── */
const BACKS = [
  { cls: "mk-lc--o", left: 640, top: 90, t: "rotate(-9deg) scale(.82)", band: ["#f5e6df", "#7c3a2a"], word: "With you", day: "Day 21", ini: "GP", name: "Greg Panetta", agency: "Panetta Associates", pillBg: "#f5e6df", pill: "Full requested", chips: ["ADULT", "LITERARY FICTION"] },
  { cls: "", left: 668, top: -10, t: "rotate(-5deg) scale(.8)", band: ["#e4e1db", "#5b524a"], word: "Closed", day: "Day 34", ini: "TR", name: "Tessa Rowe", agency: "Marlowe & Finch", pillBg: "#ece8e3", pill: "Passed", chips: ["ADULT", "94,000 WORDS"] },
  { cls: "mk-lc--o", left: 790, top: 84, t: "rotate(11deg) scale(.82)", band: ["#f7efe3", "#6e5a3a"], word: "With the agent", day: "Day 9", ini: "AK", name: "Amira Khan", agency: "Northlight Agency", pillBg: "#f4ecdd", pill: "Queried", chips: ["ADULT", "LITERARY FICTION"] },
  { cls: "", left: 772, top: -4, t: "rotate(6deg) scale(.8)", band: ["#d7e0e8", "#2f4258"], word: "Offer", day: "Day 128", ini: "TE", name: "Tom Ellery", agency: "Ellery & Finch", pillBg: "#d7e0e8", pill: "Offer", chips: ["ADULT", "LITERARY FICTION"] },
] as const;

/** What the story tells its host about its own progress. */
interface StoryHooks {
  /** The last line has landed: the desk host may offer "Watch again" (phones have none: v3 loops). */
  onEnd?: () => void;
  /** On a phone, after the FIRST run of the loop only: the drawer may rise to offer the founding sign-up. */
  onGrow?: () => void;
  /** The phone layout (v3): the short looping story, its own pacing and the tags beside the lines. */
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
  const pnText = split(pn.querySelector<HTMLElement>(".mk-lc-nt")!), pfText = split(pf.querySelector<HTMLElement>(".mk-lc-nt")!), noteText = fNote ? split(fNote) : []; /* the phone has no nudge form (v3): it nudges on the card */
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
    /* ⚠️ 110ms A DAY, CAPPED AT 2.8s (D1, 23 Oct) — the long wait after "Partial sent" used to run
       240ms a day to a 12s ceiling, which was a held breath nobody waited out. Both layouts. */
    /* B7 (v3): the phone's clock runs faster still — 30ms a day between 0.45s and 0.95s. */
    const n = to - from, dur = hooks.phone ? Math.max(450, Math.min(950, n * 30)) : Math.max(900, Math.min(2800, n * 110));
    A(w, [{ opacity: 0 }, { opacity: 1 }], { duration: 220, delay: t, fill: "forwards" });
    A(w, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, delay: t + dur, fill: "forwards" });
    knots.push([t + dur, to]);
    land(t + dur);
    return t + dur + 320;
  }
  function step(p: typeof parts[number], t: number) {
    A(p.g, [{ transform: "scale(0)" }, { transform: "scale(1.2)", offset: .7 }, { transform: "scale(1)" }], { duration: 300, delay: t, easing: BOUNCE });
    /* B7 (v3): the phone types at 18ms a letter, sooner, and stamps its chips closer together. */
    t = hooks.phone ? type(p.chars, t + 120, 18) : type(p.chars, t + 200);
    if (hooks.phone) pop(p, t + 40);
    A(p.d, [{ opacity: 0, transform: "translateY(3px)" }, { opacity: 1, transform: "none" }], { duration: 280, delay: t + 120 });
    t += 200;
    if (p.chips.length) { t += hooks.phone ? 160 : 380; p.chips.forEach((c) => { t = stamp(c, t); t += hooks.phone ? 60 : 160; }); }
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
    A(form, [{ opacity: 0, transform: hooks.phone ? "translateY(48px) scale(.96)" : "translateY(18px) scale(.97)" }, { opacity: 1, transform: "none" }], { duration: hooks.phone ? 460 : 380, delay: t + 60, fill: "forwards", easing: BOUNCE });
    t += 550;
    t = select(fToday, t);
    t = select(f2w, t + 350);
    t = type(noteText, t + 300, 24);
    t = press(fSave, t + 450);
    knots.push([t, 92]);   // saved on Day 92, 14 Jun
    A(form, [{ opacity: 1, transform: "none" }, { opacity: 0, transform: hooks.phone ? "translateY(30px) scale(.98)" : "translateY(10px) scale(.98)" }], { duration: hooks.phone ? 300 : 280, delay: t + 80, fill: "forwards" });
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
    /* The story is over: offer it again (never on its own — it does not loop). */
    later(() => hooks.onEnd?.(), t + 900);
    later(() => hooks.onGrow?.(), t + 1500);
    prepClock(); raf = requestAnimationFrame(runClock);
    later(scrollable, t + 900);
  }

  /* ═════ the phone story, v3 (ref design-refs/landing-hero-mobile-v3.html): one short loop ═════
     The ref's `playShort()` and only what it reaches. v2's dashboard, agent pick, query form, sample
     control, response form, bottom status pills and push-and-highlight are gone with it. */
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
   * B2/B4 — a status pill that appears RIGHT BESIDE the line it belongs to (the ref's `floatTag`):
   * right-aligned 22px in, its top on the line's foot less 6px, in for 340ms, held, then up 46px and
   * gone over 1.1s from +1.7s. The words go in as text, never as markup.
   */
  function floatTag(p: typeof parts[number], tag: readonly [string, string, string], t: number) {
    const [title, detail, icon] = tag;
    const g = document.createElement("div"); g.className = "mk-up mk-up--" + icon + " mk-up--tag"; g.setAttribute("aria-hidden", "true");
    const ic = document.createElement("span"); ic.className = "mk-up-i";
    ic.innerHTML = `<svg viewBox="0 0 16 16" width="15" height="15">${UPI[icon]}</svg>`;
    const tx = document.createElement("span"); tx.className = "mk-up-t";
    const b = document.createElement("b"); b.textContent = title;
    const d = document.createElement("span"); d.textContent = detail;
    tx.append(b, d); g.append(ic, tx);
    root.appendChild(g); later(() => g.remove(), t + 3200);
    later(() => { const r = p.st.getBoundingClientRect(), sr = root.getBoundingClientRect(); g.style.top = (r.top - sr.top + r.height - 6) + "px"; }, t - 20);
    A(g, [{ opacity: 0, translate: "0 10px", scale: .9 }, { opacity: 1, translate: "0 0", scale: 1 }], { duration: 340, delay: t, fill: "both", easing: "cubic-bezier(.2,.8,.2,1)" });
    A(g, [{ opacity: 1, translate: "0 0" }, { opacity: 0, translate: "0 -46px" }], { duration: 1100, delay: t + 1700, fill: "forwards", easing: "cubic-bezier(.4,0,.6,1)" });
  }

  /**
   * B1–B6 — one query, Query sent to Full requested in about 24 seconds, then the card is dealt away to
   * the left, a fresh one comes in from the right, and the story plays again, for ever. After the
   * FIRST run only, the drawer is offered its grow.
   */
  let looped = false;
  function playPhone(again: boolean) {
    const F = PHONE_STORY.foot;
    tilt = 0; scrolled = 0; ol.style.transform = "none"; tlv.classList.remove("mk-lc-tlv--scroll"); tlv.scrollTop = 0;
    band.style.background = AGENT.bg; band.style.color = AGENT.fg; bandT.textContent = AGENT.word; pill.style.background = AGENT.pill; pill.innerHTML = PILL.queried;
    ftT.textContent = F.sent[0]; ftA.textContent = F.sent[1]; ftL.classList.remove("mk-late"); psd.classList.remove("mk-late");
    A(pf, [{ opacity: 0 }, { opacity: 0 }], { duration: 1, fill: "forwards" });
    root.querySelectorAll(".mk-up--tag").forEach((g) => g.remove());
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
    e = step(parts[1], pr);
    floatTag(parts[1], PHONE_STORY.tags.partial, e + 300);
    // Day 40 — the partial goes
    reveal(parts[2].st, e + 2600); knots.push([e + 2700, 36]);
    const ps = climb(waits[2]!, 36, 40, e + 2700) - 320;
    court(AGENT, ps); setPill("psent", ps); foot(F.partialSent[0], F.partialSent[1], false, ps);
    e = step(parts[2], ps);
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
    floatTag(parts[3], PHONE_STORY.tags.nudge, e + 300);
    // Day 99 — the full
    reveal(parts[4].st, e + 2600); knots.push([e + 2700, 88]);
    const Fu = climb(waits[4]!, 88, 99, e + 2700) - 320;
    court(YOU, Fu); setPill("freq", Fu); foot(F.full[0], F.full[1], true, Fu);
    e = step(parts[4], Fu);
    e = stamp(pf, e + 150, -1.2);
    A(pfIcon, [{ opacity: 0, transform: "scale(0) rotate(-90deg)" }, { opacity: 1, transform: "scale(1.3) rotate(10deg)", offset: .7 }, { opacity: 1, transform: "none" }], { duration: 520, delay: e, easing: BOUNCE });
    e = type(pfText, e + 60, 9); stamp(pfBtn, e + 100, 1.5);
    t = e + 1400;
    prepClock(); raf = requestAnimationFrame(runClock);
    if (!looped) later(() => hooks.onGrow?.(), t + 1200);
    // hold, then this card is dealt away and the story starts again
    const out = t + 2600;
    A(front, [{ translate: "0 0", rotate: "0deg", opacity: 1 }, { translate: "-130% -20px", rotate: "-10deg", opacity: 0 }], { duration: 520, delay: out, fill: "forwards", easing: "cubic-bezier(.5,0,.75,0)" });
    later(() => { looped = true; LEAD = 0; cancelAll(); playPhone(true); }, out + 540);
  }
  function start(lead: number) { LEAD = lead || 0; stop(); if (reduceMotion()) return; if (hooks.phone) { looped = false; playPhone(false); } else play(); }
  /* Unmount: cancel everything and take back the dots this run added, so a second run (StrictMode,
     a remount) starts from the markup rather than from the leftovers of the first. */
  function dispose() { cancelAll(); waits.forEach((w) => w?.remove()); slotWait.remove(); root.querySelectorAll(".mk-up--tag").forEach((g) => g.remove()); }
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

/** The manuscript block: "The Salt Road" on the desk, "Your novel" beside a book tile on a phone. */
const Ms: React.FC<{ phone: boolean; chips: readonly string[]; front?: boolean }> = ({ phone, chips, front }) => phone ? (
  <div className="mk-lc-ms" data-hc={front ? "ms" : undefined}>
    <small aria-hidden="true"><BookIcon /></small>
    <b data-hc={front ? "ms-title" : undefined}>{HERO_PHONE_MS}</b>
    <div className="mk-lc-chips">{chips.map((x) => <span key={x}>{x}</span>)}</div>
  </div>
) : (
  <div className="mk-lc-ms"><small>QUERYING</small><b>The Salt Road</b><div className="mk-lc-chips">{chips.map((x) => <span key={x}>{x}</span>)}</div></div>
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
      <div className="mk-lc-agent"><Disc phone={phone} ini={c.ini} /><div><div className="mk-lc-nm">{c.name}</div><div className="mk-lc-ag">{c.agency}</div></div><span className="mk-lc-pill" style={{ background: c.pillBg }}>{RING}{c.pill}</span></div>
      <Ms phone={phone} chips={c.chips} />
      <div className="mk-lc-tabs"><span>Tracking</span><span>Agent</span><span>Materials</span></div>
      {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className={"mk-lc-line" + (i % 2 ? " mk-lc-line--s" : "")} />)}
    </div>
  </div>
);

/** The nudge form. The desk card only: it opens OVER the card. A phone nudges on the card itself (v3). */
const NudgeForm: React.FC = () => (
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
);

/** The living card. The nudge form rides inside it on the desk only. */
const FrontCard: React.FC<{ phone: boolean }> = ({ phone }) => (
    <div className="mk-lc" data-hc="front">
      <div className="mk-lc-in">
        <div className="mk-lc-band" data-hc="band" style={{ background: YOU.bg, color: YOU.fg }}>
          <span data-hc="bandt">With you</span>
          <span className="mk-lc-day" data-hc="day" data-n="99">Day 99</span>
        </div>
        <div className="mk-lc-agent" data-hc="agent">
          <Disc phone={phone} ini="EW" />
          <div><div className="mk-lc-nm">Eleanor Whitfield</div><div className="mk-lc-ag">Greenfield Literary</div></div>
          <span className="mk-lc-pill" data-hc="pill" style={{ background: YOU.pill }} dangerouslySetInnerHTML={{ __html: PILL.freq }} />
        </div>
        <Ms phone={phone} front chips={phone ? HERO_PHONE_TAGS : ["ADULT", "LITERARY FICTION", "94,000 WORDS"]} />
        <div className="mk-lc-tabs" data-hc="tabs"><span>Tracking</span><span>Agent</span><span>Materials</span></div>
        <div className="mk-lc-tlv mk-lc-tlv--scroll" data-hc="tlv">
          <ol className="mk-lc-steps" data-hc="steps">
            <i className="mk-lc-rail" aria-hidden="true" />
            <li className="mk-lc-step">
              <svg className="mk-lc-g" width="17" height="17" viewBox="0 0 20 20"><circle cx="10" cy="10" r="7.5" fill="none" stroke="#1c130f" strokeWidth="1.6" /></svg>
              <span className="mk-lc-t">Query sent <i>by email</i></span><span className="mk-lc-d">14 MAR</span>
              <span className="mk-lc-att"><span><DocIcon />Letter v3</span><span><SynIcon />Synopsis</span><span><PagesIcon />{phone ? "15 pages" : "10 pages"}</span></span>
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
        chip names no date, as the ref's does. On a phone it is docked outside the card instead. */}
    {!phone && <NudgeForm />}
  </div>
</div>
);

/**
 * The pile. `host` is the hero element the pointer is measured against; the hero itself places and
 * scales the pile (see `Hero.tsx`'s `size()`, or `HeroPhone.tsx` on a phone), which reads
 * `[data-hc="front"]` for the card's box.
 *
 * ⚠️ TWO STORIES, TWO LAYOUTS, FIXED PER MOUNT. `variant="phone"` (≤760px) draws the pile under the
 * header with the ref's phone transforms, no blur and no cast shadow; the hawk's shadow flies over
 * once instead; and the card plays the v3 short loop (`playPhone`) — Query sent to Full requested,
 * dealt away, dealt in, again — calling `onGrow` after its first run only. No Watch again on a phone.
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
  const again = useRef<HTMLButtonElement>(null);
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
    return enter(el, host.current);
  }, [host, phone]);

  useEffect(() => {
    const el = phone ? scope.current : root.current; if (!el) return;
    const btn = again.current;
    /* ⚠️ THE CLASS IS SET ON THE ELEMENT, NOT THROUGH STATE: this component must never re-render
       (see the docblock), and "Watch again" is the story's own business. */
    const story = makeStory(el, {
      phone,
      onEnd: () => btn?.classList.add("mk-again--on"),
      onGrow: () => grow.current?.(),
    });
    if (reduceMotion()) return () => story.dispose();
    /* Watch again replays the STORY only — the card back to Day 32 and on to the end — and never the
       deal or the shadow, which are the page arriving rather than the query's life. */
    const replay = () => { btn?.classList.remove("mk-again--on"); story.start(0); };
    btn?.addEventListener("click", replay);
    /* The story starts 1.7s after load, as the ref's `V4.start(1700)` — but its first act measures
       the timeline's lines, so it waits for the fonts. If they are slower than that, it starts the
       moment they arrive with whatever lead is left, never early. */
    const born = performance.now();
    let live = true;
    /* The ref's lead: `V4.start(1700)` on the desk, `V4.start(1300)` for the phone's short loop (v3). */
    const lead = phone ? 1300 : 1700;
    const go = () => { if (live) story.start(Math.max(0, lead - (performance.now() - born))); };
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (fonts?.ready) fonts.ready.then(go, go); else go();
    return () => { live = false; btn?.removeEventListener("click", replay); story.dispose(); };
  }, [phone]);

  const againBtn = (
    <button type="button" className={"mk-again" + (phone ? " mk-again--phone" : "")} ref={again}>
      <AgainIcon />{HERO_AGAIN}
    </button>
  );

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
      {/* L5/B4 (v3): no Watch again on a phone (the story loops by itself) and no docked nudge form
          (the nudge happens on the card). */}
    </div>
  );

  return (
    <>
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
    {/* ⚠️ OUTSIDE THE PILE, BECAUSE THE PILE IS `aria-hidden` and a button inside it would be
        focusable but unannounced. `Hero.tsx`'s `size()` places it just above the front card's
        top-right corner, in the pile's own coordinates. Hidden (and inert) until the story ends. */}
    {againBtn}
    </>
  );
});
HeroCard.displayName = "HeroCard";
