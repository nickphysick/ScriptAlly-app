/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query card v160 (design-refs/query-card-v160/) — THE CARD'S MOTION WHEN A SAVE OR AN UNDO LANDS. Motion only: no
 * wording, layout, colour or behaviour changes. Every value is a literal or read off the page at the moment it runs, so
 * everything here is the Web Animations API (CLAUDE.md: no var() inside @keyframes, no color-mix()).
 *
 *   bump        the slide-in card's frame (v161.1): pressed in to `scale` 0.985 at the press, then popped from there →
 *               1.03 (42%) → 1 over 620ms when a save lands, or sunk → 0.975 (30%) → 1 when an undo does (v163). With it
 *               (v163) the rim's tint fades and a light runs once round the border. `scale` composes with the
 *               frame's `rotate` (its lean) and `translate` (its slide-in); `transform` is never set on the frame.
 *               A second bump ends the running one at once: they never stack.
 *   settle      a draft bubble becoming its step: the final colour fills from the left (background-size), the dashed
 *               edge fades (outline-color), the bubble eases from scale 1.015 to 1.
 *   fold        an undone step leaving: opacity to 0 (190ms), then its height and top margin close (230ms).
 *   strip/label the band's colour eases (a cross-fade where either end is a gradient), the words fade and rise, the
 *               pill's mark pops.
 *   foot        the footer's new contents fade and rise; its height eases when it changes.
 *   toastOut    the toast leaves: opacity to 0 and 8px down over 220ms.
 *   breathe     (v161.2) while the composer drawer is open, the card's rim breathes — the frame's ::before, which
 *               draws its white rim and shadow: `scale` 1 → 1.01 → 1 over 3.2s (v163), eased, repeating. Nothing inside
 *               the frame moves (the drawer and every button stay still). It rests while the writer types and stops when
 *               the drawer closes; at a save's press the rim eases back as the press-in begins. v163: the rim layer's tint
 *               breathes with it, opacity 0 → 0.72 → 0, in the `rim` colour of the card's current stage.
 *
 * ⚠️ REDUCED MOTION: none of this runs (`reduced()`); every state changes at once, as before v160.
 */
import { STAGE_COLOURS, type Stage } from "../../../lib/stageColours";

export const reduced = (): boolean => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/* Query card v161.1 — the bump is a press and a pop: the frame presses in at the press, holds through the save, and pops
   when the save lands (it replaces v160's 1 → 1.022 → 1). */
export const PRESS = { to: 0.985, ms: 120, backMs: 150, net: 4000, yieldMs: 50 } as const;
/* v163 — the pop (a save) peaks at 1.03 at 42% over 620ms; the sink (an undo) dips to 0.975 at 30% over the same, never
   above 1. One easing over the whole run, as the ref (design-refs/query-card-v163/) animates it. */
export const BUMP = { ms: 620, peak: 1.03, at: 0.42, ease: "cubic-bezier(0.25, 0.8, 0.25, 1)" } as const;
export const SINK = { low: 0.975, at: 0.3 } as const;
/* v163 — the landing light: one lap of the conic, clockwise on a save, mirrored and anticlockwise on an undo */
export const LIGHT = { ms: 1300, ease: "cubic-bezier(0.4, 0.05, 0.25, 1)", from: -40, to: 320, inAt: 0.14, outAt: 0.76 } as const;
const pressed = new WeakMap<Element, { a: Animation; t: number }>();
export const isPressed = (frame: Element | null): boolean => !!frame && pressed.has(frame);
/** Agent card v2.1 — `tint: false`: the press holds no colour (the query card never passes it) */
export interface PressOpts { tint?: boolean }
/** at the press: the frame eases to 0.985 over 120ms and holds there (on the compositor, whatever the page then does).
 *  A second press while one is held does nothing. Never longer than 4s: the safety net eases it back. */
export function pressIn(frame: HTMLElement | null, o: PressOpts = {}): void {
  if (!frame || reduced() || pressed.has(frame)) return;
  bumps.get(frame)?.cancel();
  /* v161.2 — the breath gives way: the rim eases back to 1 over the press-in's own 120ms; v163 — the tint does not stop:
     it rises to 0.72 from wherever it is and holds through the save (Agent card v2.1: unless the press says it holds no
     colour — a star or Add note with no section open) */
  const was = breaths.has(frame) ? breathEnd(frame) : opacityNow(rimOf(frame).tint);
  if (o.tint !== false) tintHold(frame, was);
  const a = frame.animate([{ scale: "1" }, { scale: String(PRESS.to) }], { duration: PRESS.ms, easing: "ease-out", fill: "forwards" });
  a.id = "qc1611-press";
  pressed.set(frame, { a, t: window.setTimeout(() => pressBack(frame), PRESS.net) });
}
/** nothing landed (the save failed, was refused, or never drew): the frame eases back to 1 over 150ms, with no pop */
export function pressBack(frame: HTMLElement | null): void {
  const p = frame ? pressed.get(frame) : undefined;
  if (!frame || !p) return;
  pressed.delete(frame);
  window.clearTimeout(p.t);
  /* v163 — nothing landed: the tint eases to 0 over 150ms, and no light */
  tintBack(frame);
  const at = parseFloat(getComputedStyle(frame).scale) || PRESS.to;
  p.a.cancel();
  /* v161.2 — the drawer is still open: the breath comes back after a pause */
  breathResume(frame);
  if (reduced() || at === 1) return;
  frame.animate([{ scale: String(at) }, { scale: "1" }], { duration: PRESS.backMs, easing: "ease-out" }).id = "qc1611-back";
}

/* ══ Query card v161.2 — THE CARD BREATHES WHILE THE WRITER IS RECORDING; v163 — IN THE STAGE'S COLOUR ══════════════
   The composer drawer owns it (QcComposer1522): `breatheOpen` at its mount, `breatheType` on a keystroke in one of its
   fields, `breatheClose` at its unmount — so every way in and out of the drawer is covered by the drawer itself. One
   breath per frame at most; the press (`pressIn`) ends it from wherever it is.
   ⚠️ IT ANIMATES THE RIM, NEVER THE FRAME: the frame's ::before (qcv152card.css) draws the white paper and the shadow, and
   only it scales — scaling the frame moved every button in the drawer each frame (Playwright's click never found it
   still, QC1612's ordinary-click check).
   v163 — THE RIM LAYER (`rimOf`): a decorative span over the frame's 7px border, masked to that ring, holding the TINT (the
   ring in one flat colour) and the LIGHT (a 920px conic square that runs round on a landing). The tint breathes with the
   paper, in the `rim` of the card's current stage. ⚠️ PAPER AND TINT MOVE AS ONE: the ring layer takes the paper's own scale
   keyframes, and all three animations (paper, ring, tint) are given one `startTime`, so they share a clock to the
   millisecond rather than merely starting in the same task. */
export const BREATHE = { peak: 1.01, ms: 3200, ease: "cubic-bezier(0.37, 0, 0.63, 1)", enterMs: 320, after: 300, restMs: 180, closeMs: 120, idleMs: 2000 } as const;
/** v163 — the tint's peak opacity (the breath's and the press's), its rise at the press, its fade at the landing, its
 *  fade when nothing lands */
export const RIM163 = { peak: 0.72, holdMs: 280, fadeMs: 700, backMs: 150 } as const;
type Breath = { a: Animation[] | null; rest: Animation[]; t: number | null };
const breaths = new WeakMap<Element, Breath>();
const RIM = "::before";
type Rim = { ring: HTMLElement; tint: HTMLElement; light: HTMLElement };
/** the rim layer, made on first use and kept with the frame (removed with it). aria-hidden, no pointer events, no layout:
 *  appended after the frame's own children, which React owns and never reorders around it. */
export function rimOf(frame: HTMLElement): Rim {
  let ring = frame.querySelector<HTMLElement>(":scope > .qc163-rim");
  if (!ring) {
    ring = document.createElement("span");
    ring.className = "qc163-rim";
    ring.setAttribute("aria-hidden", "true");
    ring.setAttribute("data-qc163", "rim");
    const light = document.createElement("i"), tint = document.createElement("b");
    light.setAttribute("data-qc163", "light");
    tint.setAttribute("data-qc163", "tint");
    ring.append(light, tint);
    frame.append(ring);
  }
  return { ring, light: ring.querySelector<HTMLElement>(":scope > i")!, tint: ring.querySelector<HTMLElement>(":scope > b")! };
}
/** Agent card v2.1 — the rim's two colours for a frame: the frame's own `data-qc163-rim` / `data-qc163-rim-hi` when it
 *  names them (the agent card: its query's stage, or slate with no query), else the `rim` of the stage the query card in it
 *  shows now. The query card's frame names none, so it reads exactly as before. */
export function rimColours(frame: HTMLElement): { rim: string; rimHi: string } {
  const rim = frame.dataset?.qc163Rim, rimHi = frame.dataset?.qc163RimHi;
  if (rim && rimHi) return { rim, rimHi };
  return STAGE_COLOURS[stageAt(frame)];
}
/** the stage the card in this frame shows now (QcCard152's `data-qc163-stage`) */
export function stageAt(frame: HTMLElement): Stage {
  const s = frame.querySelector<HTMLElement>("[data-qc152='card']")?.getAttribute("data-qc163-stage");
  return s && s in STAGE_COLOURS ? (s as Stage) : "queried";
}
const scaleNow = (el: Element, pseudo?: string): number => { const v = getComputedStyle(el, pseudo).scale; return v === "none" ? 1 : parseFloat(v) || 1; };
const opacityNow = (el: Element): number => parseFloat(getComputedStyle(el).opacity) || 0;
/** stop the breath (and any easing to rest) where it is; returns the scale it was at, and the tint's opacity if the breath
 *  owned it (never the press's hold) */
function still(frame: HTMLElement, b: Breath): { s: number; o: number } {
  if (b.t != null) { window.clearTimeout(b.t); b.t = null; }
  if (!b.a && !b.rest.length) return { s: 1, o: 0 };
  const at = scaleNow(frame, RIM);
  const o = rimTinted(b) ? opacityNow(rimOf(frame).tint) : 0;
  for (const x of [...(b.a ?? []), ...b.rest]) x.cancel();
  b.a = null; b.rest = [];
  return { s: Math.abs(at - 1) < 0.0001 ? 1 : at, o: o < 0.001 ? 0 : o };
}
const rimTinted = (b: Breath): boolean => [...(b.a ?? []), ...b.rest].some((x) => x.id === "qc163-tint" || x.id === "qc163-tint-rest");
/** ease the paper and the ring from `s` to 1, and the tint from `o` to 0, over `ms` */
function toRest(frame: HTMLElement, b: Breath, from: { s: number; o: number }, ms: number): void {
  const { ring, tint } = rimOf(frame);
  const made: Animation[] = [];
  const t = { duration: ms, easing: "ease-out" };
  if (from.s !== 1) {
    const r = frame.animate([{ scale: String(from.s) }, { scale: "1" }], { ...t, pseudoElement: RIM });
    r.id = "qc1612-rest";
    const g = ring.animate([{ scale: String(from.s) }, { scale: "1" }], t);
    g.id = "qc163-rim-rest";
    made.push(r, g);
  }
  if (from.o !== 0) {
    const o = tint.animate([{ opacity: from.o }, { opacity: 0 }], t);
    o.id = "qc163-tint-rest";
    made.push(o);
  }
  if (!made.length) return;
  b.rest.push(...made);
  for (const a of made) { const clear = () => { b.rest = b.rest.filter((x) => x !== a); }; a.finished.then(clear, clear); }
  sync(made);
}
/** one clock for animations made together */
function sync(list: Animation[]): void {
  const t0 = document.timeline?.currentTime;
  if (t0 == null) return;
  for (const a of list) a.startTime = t0;
}
function breathStart(frame: HTMLElement): void {
  const b = breaths.get(frame);
  if (!b || pressed.has(frame) || bumps.has(frame)) return;
  if (b.t != null) { window.clearTimeout(b.t); b.t = null; }
  if (b.a) return;
  for (const x of b.rest) x.cancel();
  b.rest = [];
  const { ring, tint } = rimOf(frame);
  tint.style.background = rimColours(frame).rim;
  const t = { duration: BREATHE.ms, iterations: Infinity, easing: BREATHE.ease };
  const sk = [{ scale: "1" }, { scale: String(BREATHE.peak) }, { scale: "1" }];
  const paper = frame.animate(sk, { ...t, pseudoElement: RIM });
  paper.id = "qc1612-breath";
  const rim = ring.animate(sk, t);
  rim.id = "qc163-rim-breath";
  const glow = tint.animate([{ opacity: 0 }, { opacity: RIM163.peak }, { opacity: 0 }], t);
  glow.id = "qc163-tint";
  b.a = [paper, rim, glow];
  sync(b.a);
}
const arm = (frame: HTMLElement, b: Breath, ms: number) => {
  if (b.t != null) window.clearTimeout(b.t);
  b.t = window.setTimeout(() => { b.t = null; breathStart(frame); }, ms);
};
/** the drawer opened: the breath starts once the drawer is in and the card has straightened (`breatheIn` brings it
 *  forward to 300ms after the drawer's own entrance ends) */
export function breatheOpen(frame: HTMLElement | null): void {
  if (!frame || reduced()) return;
  const old = breaths.get(frame);
  const b: Breath = { a: null, rest: [], t: null };
  if (old) toRest(frame, b, still(frame, old), BREATHE.closeMs);
  breaths.set(frame, b);
  arm(frame, b, BREATHE.enterMs + BREATHE.after);
}
/** the drawer's entrance has ended */
export function breatheIn(frame: HTMLElement | null): void {
  const b = frame ? breaths.get(frame) : undefined;
  if (frame && b && !b.a && b.t != null) arm(frame, b, BREATHE.after);
}
/** a keystroke in one of the drawer's fields: to rest within 200ms, and again 2s after the last key */
export function breatheType(frame: HTMLElement | null): void {
  const b = frame ? breaths.get(frame) : undefined;
  if (!frame || !b || pressed.has(frame)) return;
  if (b.a) toRest(frame, b, still(frame, b), BREATHE.restMs);
  arm(frame, b, BREATHE.idleMs);
}
/** the drawer closed, by any route: to 1 (and the tint to 0) within 150ms */
export function breatheClose(frame: HTMLElement | null): void {
  const b = frame ? breaths.get(frame) : undefined;
  if (!frame || !b) return;
  breaths.delete(frame);
  toRest(frame, b, still(frame, b), BREATHE.closeMs);
}
/** the press: the breath ends, the paper and the ring easing back to 1 over the press-in's 120ms; the tint is left for
 *  the press's hold to take up from where it was (returned). It does not come back unless the press is given back
 *  (`pressBack`) with the drawer still open. */
function breathEnd(frame: HTMLElement): number {
  const b = breaths.get(frame);
  if (!b) return 0;
  const at = still(frame, b);
  toRest(frame, b, { s: at.s, o: 0 }, PRESS.ms);
  return at.o;
}
/* ══ v163 — THE TINT AT THE PRESS, AND THE LANDING ═════════════════════════════════════════════════════════════════
   At the press the tint rises to 0.72 (280ms, ease-out) and holds, in the `rim` of the stage the card is in then — an
   opacity animation, so the compositor keeps it moving through the app's freeze. At the landing (made through v161's
   hold/release with the rest of it) it fades 0.72 → 0 over 700ms while the light runs once round in the colours of the
   stage the card is in now: the stage moved to on a save, returned to on an undo. */
const holds = new WeakMap<Element, Animation>();
const landings = new WeakMap<Element, Animation[]>();
function tintHold(frame: HTMLElement, from: number): void {
  const { tint } = rimOf(frame);
  holds.get(frame)?.cancel();
  tint.style.background = rimColours(frame).rim;
  const h = tint.animate([{ opacity: from }, { opacity: RIM163.peak }], { duration: RIM163.holdMs, easing: "ease-out", fill: "forwards" });
  h.id = "qc163-tint-hold";
  holds.set(frame, h);
}
function tintBack(frame: HTMLElement): void {
  const h = holds.get(frame);
  if (!h) return;
  holds.delete(frame);
  const { tint } = rimOf(frame);
  const o = opacityNow(tint);
  h.cancel();
  if (o < 0.001) return;
  tint.animate([{ opacity: o }, { opacity: 0 }], { duration: RIM163.backMs, easing: "ease-out" }).id = "qc163-tint-back";
}
/** the landing's tint and light (`bump` calls it); `owner` holds them with the rest of the landing */
function landRim(frame: HTMLElement, owner: Element | null, kind: "save" | "undo", withLight = true): Animation[] {
  const { tint, light } = rimOf(frame);
  const made: Animation[] = [];
  const h = holds.get(frame);
  holds.delete(frame);
  if (h) {
    const f = tint.animate([{ opacity: RIM163.peak }, { opacity: 0 }], { duration: RIM163.fadeMs, easing: "ease-out", fill: "forwards" });
    f.id = "qc163-tint-fade";
    const end = () => { h.cancel(); f.cancel(); };
    f.finished.then(end, () => h.cancel());
    made.push(park(owner, f));
  }
  /* Agent card v2.1 — a landing with no light (a star, Add note): the held colour just fades */
  if (!withLight) return made;
  const c = rimColours(frame);
  const back = kind === "undo";
  light.style.background = `conic-gradient(from 0deg, transparent 0 58%, ${c.rim} 84%, ${c.rimHi} 93%, transparent 100%)`;
  light.style.scale = back ? "-1 1" : "1 1";
  const turn = (d: number) => `${back ? -d : d}deg`;
  const l = light.animate([
    { rotate: turn(LIGHT.from), opacity: 0 },
    { opacity: 1, offset: LIGHT.inAt },
    { opacity: 1, offset: LIGHT.outAt },
    { rotate: turn(LIGHT.to), opacity: 0 },
  ], { duration: LIGHT.ms, easing: LIGHT.ease });
  l.id = "qc163-light";
  made.push(park(owner, l));
  return made;
}
function breathResume(frame: HTMLElement): void {
  const b = breaths.get(frame);
  if (b && !b.a) arm(frame, b, BREATHE.idleMs);
}
/** At the pointer's press (pointerdown, the press's first handler): press in before the click's own work begins — a
 *  click runs the page's listeners and their render in one task (137ms on Undo at CPU 4×, measured), and an animation
 *  made inside that task cannot reach the compositor until it ends. If no click follows within 700ms (the pointer was
 *  dragged off), the frame eases back. */
const armed = new WeakMap<Element, number>();
export function pressAtPointer(frame: HTMLElement | null, o: PressOpts = {}): void {
  if (!frame || reduced() || pressed.has(frame)) return;
  pressIn(frame, o);
  armed.set(frame, window.setTimeout(() => { armed.delete(frame); pressBack(frame); }, 700));
}
/** at the click (or Enter/Space): press in if the pointer has not already, then save. A save starts at once (Step 0.4:
 *  its long task is ~680ms after the press, 35 frames painted between). Undo waits (`yieldFrames`) for two painted
 *  frames when the press began here, at the click — its own work re-renders the page straight away — and never more
 *  than 50ms. */
export function pressThen<T>(frame: HTMLElement | null, run: () => T, yieldFrames = false, o: PressOpts = {}): void {
  const a = frame ? armed.get(frame) : undefined;
  if (frame && a != null) { window.clearTimeout(a); armed.delete(frame); run(); return; }
  if (!frame || reduced() || pressed.has(frame) || !yieldFrames) { pressIn(frame, o); run(); return; }
  pressIn(frame, o);
  let done = false;
  const go = () => { if (!done) { done = true; run(); } };
  requestAnimationFrame(() => requestAnimationFrame(() => window.setTimeout(go, 0)));
  window.setTimeout(go, PRESS.yieldMs);
}
export const SETTLE = { ms: 420, ease: "cubic-bezier(0.3, 0.7, 0.2, 1)", lineFrom: 120, lineMs: 300, from: 1.015 } as const;
export const FOLD = { fadeMs: 190, closeMs: 230, ease: "cubic-bezier(0.4, 0, 0.2, 1)" } as const;
export const STRIP = { ms: 450, wordMs: 300, wordAt: 100, wordRise: 5, markMs: 400, markAt: 120, markEase: "cubic-bezier(0.2, 0.9, 0.3, 1.2)" } as const;
export const FOOT = { ms: 320, at: 120, rise: 6 } as const;
export const TOAST_OUT = { ms: 220, drop: 8 } as const;
export const ENTER_FADE = 200;

/* ══ Query card v161, Phase 2 — THE MOTION WAITS FOR THE PAGE ═════════════════════════════════════════════════════
   A save's or an undo's change reaches the card first; the whole page re-renders after it (every workspace page stays
   mounted), a long task that ran underneath v160's motion so nothing visibly moved (Step 0.4: 1268ms at CPU 4×). While a
   landing is HELD, every animation made for it — the bump too — is created paused on its first frame, so the card holds
   still; `release` plays them together on the first quiet frame after the page has finished (QcCard152). */
const held = new WeakMap<Element, Animation[]>();
/** hold this card's motion: what is made for it from now waits for `release` */
export function hold(owner: Element): void { held.set(owner, held.get(owner) ?? []); }
export const isHeld = (owner: Element | null): boolean => !!owner && held.has(owner);
const park = (owner: Element | null, a: Animation): Animation => {
  const h = owner ? held.get(owner) : undefined;
  if (h) { a.pause(); h.push(a); }
  return a;
};
/** play everything held for this card, together */
export function release(owner: Element | null): void {
  if (!owner) return;
  const h = held.get(owner);
  held.delete(owner);
  for (const a of h ?? []) { try { a.play(); } catch { /* removed with its element */ } }
}

/** the animations each frame is running for v160, so a new one can end the old ones at once */
const running = new WeakMap<Element, Animation[]>();
const track = (owner: Element, a: Animation): Animation => {
  park(owner, a);
  const list = running.get(owner) ?? [];
  list.push(a);
  running.set(owner, list);
  const drop = () => { const l = running.get(owner); if (l) running.set(owner, l.filter((x) => x !== a)); };
  a.finished.then(drop, drop);
  return a;
};
/** end every v160 motion on this card at once (a second save, or Undo pressed while the confirm runs) */
export function finishAll(owner: Element | null): void {
  if (!owner) return;
  for (const a of [...(held.get(owner) ?? []), ...(running.get(owner) ?? [])]) { try { a.finish(); } catch { a.cancel(); } }
  held.delete(owner);
  running.set(owner, []);
}

const bumps = new WeakMap<Element, Animation>();
/** Phase 1 — the bump, on the card's frame (the panel), never stacking */
export function bump(frame: HTMLElement | null, owner: Element | null = null, kind: "save" | "undo" = "save", o: { light?: boolean } = {}): void {
  if (!frame || reduced()) return;
  bumps.get(frame)?.cancel();
  /* v163 — a second landing ends the running light and tint at once: they never stack */
  for (const x of landings.get(frame) ?? []) x.cancel();
  /* v161.1 — the pop starts where the press left it (0.985), and the press gives way to it */
  const p = pressed.get(frame);
  const from = p ? PRESS.to : 1;
  if (p) { pressed.delete(frame); window.clearTimeout(p.t); }
  /* v163 — a save pops (1.03 at 42%); an undo sinks (0.975 at 30%) and never rises above 1 */
  const mid = kind === "undo" ? { scale: String(SINK.low), offset: SINK.at } : { scale: String(BUMP.peak), offset: BUMP.at };
  const a = frame.animate([{ scale: String(from) }, mid, { scale: "1" }], { duration: BUMP.ms, easing: BUMP.ease });
  p?.a.cancel();
  a.id = "qc160-bump";
  park(owner, a);
  bumps.set(frame, a);
  landings.set(frame, landRim(frame, owner, kind, o.light !== false));
  const clear = () => { if (bumps.get(frame) === a) bumps.delete(frame); };
  a.finished.then(clear, clear);
}

/** Phase 2 — a draft bubble becomes its step, in place: the same element */
export function settle(owner: Element, msg: HTMLElement, dashed: string): void {
  const bx = msg.querySelector<HTMLElement>(":scope > .qc152-bx");
  if (!bx) return;
  const c = getComputedStyle(bx).backgroundColor;
  const layer = `linear-gradient(${c}, ${c})`;
  const k = (size: string) => ({ backgroundColor: "transparent", backgroundImage: layer, backgroundRepeat: "no-repeat", backgroundPosition: "0 0", backgroundSize: size });
  track(owner, bx.animate([k("0% 100%"), k("100% 100%")], { duration: SETTLE.ms, easing: SETTLE.ease })).id = "qc160-fill";
  const line = (col: string, offset?: number) => ({ outlineStyle: "dashed", outlineWidth: "1.5px", outlineOffset: "-1.5px", outlineColor: col, ...(offset != null ? { offset } : {}) });
  track(owner, bx.animate([line(dashed), line(dashed, SETTLE.lineFrom / (SETTLE.lineFrom + SETTLE.lineMs)), line(clear(dashed))],
    { duration: SETTLE.lineFrom + SETTLE.lineMs, easing: "ease" })).id = "qc160-line";
  track(owner, msg.animate([{ scale: String(SETTLE.from) }, { scale: "1" }], { duration: SETTLE.ms, easing: SETTLE.ease })).id = "qc160-settle";
}
/** a colour at alpha 0, written as the browser writes it */
function clear(col: string): string {
  const m = col.match(/rgba?\(([^)]+)\)/);
  if (m) { const [r, g, b] = m[1].split(",").map((x) => x.trim()); return `rgba(${r}, ${g}, ${b}, 0)`; }
  const h = col.match(/^#([0-9a-f]{6})$/i);
  if (h) { const n = parseInt(h[1], 16); return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, 0)`; }
  return "transparent";
}

/** a line that appeared in one frame (the "x days later" line, the "Logged" mark): fade it in */
export function fadeIn(owner: Element, el: HTMLElement): void {
  track(owner, el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ENTER_FADE, easing: "ease" })).id = "qc160-fadein";
}

/** Phase 3 — an undone step folds away; `done` drops it from the drawing */
export function fold(owner: Element, els: HTMLElement[], done: () => void): void {
  const total = FOLD.fadeMs + FOLD.closeMs, at = FOLD.fadeMs / total;
  const runs = els.map((el) => {
    const h = el.offsetHeight, mt = getComputedStyle(el).marginTop, mb = getComputedStyle(el).marginBottom;
    el.style.pointerEvents = "none";
    const a = el.animate([
      { opacity: 1, height: `${h}px`, marginTop: mt, marginBottom: mb, overflow: "hidden", boxSizing: "border-box" },
      { opacity: 0, height: `${h}px`, marginTop: mt, marginBottom: mb, overflow: "hidden", boxSizing: "border-box", offset: at, easing: FOLD.ease },
      { opacity: 0, height: "0px", marginTop: "0px", marginBottom: "0px", overflow: "hidden", boxSizing: "border-box" },
    ], { duration: total, fill: "forwards" });
    a.id = "qc160-fold";
    return track(owner, a).finished;
  });
  void Promise.allSettled(runs).then(done);
}

/** Phase 2/3 — the strip: its colour eases (a cross-fade where either end is a gradient) */
export function strip(owner: Element, band: HTMLElement, from: { bg: string; img: string }): void {
  const cs = getComputedStyle(band);
  const to = { bg: cs.backgroundColor, img: cs.backgroundImage };
  if (from.bg === to.bg && from.img === to.img) return;
  if (from.img === "none" && to.img === "none") {
    track(owner, band.animate([{ backgroundColor: from.bg }, { backgroundColor: to.bg }], { duration: STRIP.ms, easing: "ease" })).id = "qc160-strip";
    return;
  }
  /* a gradient at either end: the old drawing laid over the new and faded out */
  const o = document.createElement("span");
  o.setAttribute("aria-hidden", "true");
  o.className = "qcm-fade";
  o.style.backgroundColor = from.bg;
  o.style.backgroundImage = from.img;
  band.prepend(o);
  const a = track(owner, o.animate([{ opacity: 1 }, { opacity: 0 }], { duration: STRIP.ms, easing: "ease", fill: "forwards" }));
  a.id = "qc160-strip-x";
  a.finished.then(() => o.remove(), () => o.remove());
}
/** a colour eased from its old value (the pill's) */
export function easeBg(owner: Element, el: HTMLElement, from: string): void {
  const to = getComputedStyle(el).backgroundColor;
  if (!from || from === to) return;
  track(owner, el.animate([{ backgroundColor: from }, { backgroundColor: to }], { duration: STRIP.ms, easing: "ease" })).id = "qc160-pill";
}
/** the strip's and the label's words fade and rise in */
export function words(owner: Element, els: (HTMLElement | null)[]): void {
  for (const el of els) {
    if (!el) continue;
    track(owner, el.animate([{ opacity: 0, translate: `0 ${STRIP.wordRise}px` }, { opacity: 1, translate: "0 0" }],
      { duration: STRIP.wordMs, delay: STRIP.wordAt, easing: "ease", fill: "backwards" })).id = "qc160-word";
  }
}
/** the label's mark pops */
export function markPop(owner: Element, el: HTMLElement | null): void {
  if (!el) return;
  track(owner, el.animate([{ scale: "0.4", opacity: 0 }, { scale: "1.2", opacity: 1, offset: 0.6 }, { scale: "1", opacity: 1 }],
    { duration: STRIP.markMs, delay: STRIP.markAt, easing: STRIP.markEase, fill: "backwards" })).id = "qc160-mark";
}

/** the footer's new contents fade and rise in; its height eases when it changed */
export function foot(owner: Element, el: HTMLElement, fromH: number | null): void {
  track(owner, el.animate([{ opacity: 0, translate: `0 ${FOOT.rise}px` }, { opacity: 1, translate: "0 0" }],
    { duration: FOOT.ms, delay: FOOT.at, easing: "ease", fill: "backwards" })).id = "qc160-foot";
  const h = el.offsetHeight;
  if (fromH != null && fromH > 0 && Math.abs(fromH - h) > 0.5) {
    track(owner, el.animate([{ height: `${fromH}px`, overflow: "hidden", boxSizing: "border-box" }, { height: `${h}px`, overflow: "hidden", boxSizing: "border-box" }],
      { duration: FOOT.ms, easing: "ease" })).id = "qc160-foot-h";
  }
}

/** the toast leaves; `done` drops it */
export function toastOut(el: HTMLElement, done: () => void): void {
  if (reduced()) { done(); return; }
  const a = el.animate([{ opacity: 1, translate: "0 0" }, { opacity: 0, translate: `0 ${TOAST_OUT.drop}px` }], { duration: TOAST_OUT.ms, easing: "ease-in", fill: "forwards" });
  a.id = "qc160-toast-out";
  a.finished.then(done, done);
}

/** Phase 4 — the grid card's band, when its stage changes: the colours to ease between, or null to change at once
 *  (the same stage; either end a gradient — the offer's sheen, gone quiet's fade) */
export function gridEase(was: { band: string; grad: boolean } | null, now: { band: string; grad: boolean }): { from: string; to: string } | null {
  if (!was || was.grad || now.grad || was.band === now.band) return null;
  return { from: was.band, to: now.band };
}
export const GRID = { ms: 500 } as const;
export function gridBand(el: HTMLElement | null, e: { from: string; to: string }): void {
  if (!el || reduced() || getComputedStyle(el).backgroundImage !== "none") return;
  el.animate([{ backgroundColor: e.from }, { backgroundColor: e.to }], { duration: GRID.ms, easing: "ease" }).id = "qc160-grid";
}
