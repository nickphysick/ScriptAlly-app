/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query card v160 (design-refs/query-card-v160/) — THE CARD'S MOTION WHEN A SAVE OR AN UNDO LANDS. Motion only: no
 * wording, layout, colour or behaviour changes. Every value is a literal or read off the page at the moment it runs, so
 * everything here is the Web Animations API (CLAUDE.md: no var() inside @keyframes, no color-mix()).
 *
 *   bump        the slide-in card's frame: `scale` 1 → 1.022 (35%) → 1 over 500ms, once. `scale` composes with the
 *               frame's `rotate` (its lean) and `translate` (its slide-in); `transform` is never set on the frame.
 *               A second bump ends the running one at once: they never stack.
 *   settle      a draft bubble becoming its step: the final colour fills from the left (background-size), the dashed
 *               edge fades (outline-color), the bubble eases from scale 1.015 to 1.
 *   fold        an undone step leaving: opacity to 0 (190ms), then its height and top margin close (230ms).
 *   strip/label the band's colour eases (a cross-fade where either end is a gradient), the words fade and rise, the
 *               pill's mark pops.
 *   foot        the footer's new contents fade and rise; its height eases when it changes.
 *   toastOut    the toast leaves: opacity to 0 and 8px down over 220ms.
 *
 * ⚠️ REDUCED MOTION: none of this runs (`reduced()`); every state changes at once, as before v160.
 */
export const reduced = (): boolean => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export const BUMP = { ms: 500, peak: 1.022, at: 0.35, ease: "cubic-bezier(0.2, 0.8, 0.2, 1)" } as const;
export const SETTLE = { ms: 420, ease: "cubic-bezier(0.3, 0.7, 0.2, 1)", lineFrom: 120, lineMs: 300, from: 1.015 } as const;
export const FOLD = { fadeMs: 190, closeMs: 230, ease: "cubic-bezier(0.4, 0, 0.2, 1)" } as const;
export const STRIP = { ms: 450, wordMs: 300, wordAt: 100, wordRise: 5, markMs: 400, markAt: 120, markEase: "cubic-bezier(0.2, 0.9, 0.3, 1.2)" } as const;
export const FOOT = { ms: 320, at: 120, rise: 6 } as const;
export const TOAST_OUT = { ms: 220, drop: 8 } as const;
export const ENTER_FADE = 200;

/** the animations each frame is running for v160, so a new one can end the old ones at once */
const running = new WeakMap<Element, Animation[]>();
const track = (owner: Element, a: Animation): Animation => {
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
  for (const a of running.get(owner) ?? []) { try { a.finish(); } catch { a.cancel(); } }
  running.set(owner, []);
}

const bumps = new WeakMap<Element, Animation>();
/** Phase 1 — the bump, on the card's frame (the panel), never stacking */
export function bump(frame: HTMLElement | null): void {
  if (!frame || reduced()) return;
  bumps.get(frame)?.cancel();
  const a = frame.animate([
    { scale: "1", easing: BUMP.ease },
    { scale: String(BUMP.peak), offset: BUMP.at, easing: BUMP.ease },
    { scale: "1" },
  ], { duration: BUMP.ms });
  a.id = "qc160-bump";
  bumps.set(frame, a);
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
