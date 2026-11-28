/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone Birds-eye first look v1 §A — THE BARS GROW IN (ref `playLoad("grow2")`), on the world's own drawn frame.
 *
 * The first open of each calendar day plays it in full (about 2s); every other open, and every open with reduced
 * motion, fades the world in over 200ms. It runs on the frame `drawWorld` has just painted, fitted (All):
 *   1. the today line draws top to bottom (420ms, ease-out, from faint); the ruler's dates fade down one after
 *      another (260ms each, 40ms apart);
 *   2. each row starts at 260ms + 28ms a row + 90ms for each group heading above it (a campaign too long for 28ms a
 *      row to finish in two seconds gets a shorter step, so its last row still ends by then: `rowStep`);
 *   3. a row is ONE linear wipe from its first stage to its end over 560ms: each piece grows in turn, its share of the
 *      560ms its width's share of the row (the ref's 90ms floor is dropped: it let a short piece run on past the start
 *      of the next, which BFL-2 forbids);
 *   4. each "!" pops (0 → 1.35 → 1, 340ms) as its row's wipe reaches it;
 *   5. the headings fade up 6px into place, and their counts tick from 0 to the number over 700ms (smoothstep).
 * `finish()` jumps everything to its end state at once (a touch anywhere) and hands back to the caller, who repaints.
 */

/** the day the full first look last played on this device (a local date stamp; `firstTimeToday`'s format) */
export const BW_LOOK_KEY = "bw1.firstLook.day";
/** the full first look's length (ref `dur` for grow2) */
export const LOOK_MS = 2000;
/** every other open: the world fades in */
export const FADE_MS = 200;
export const ROW0 = 260, ROW_STEP = 28, HEAD_STEP = 90, WIPE = 560, LINE_MS = 420, RM_MS = 260, RM_STEP = 40, POP_MS = 340, COUNT_MS = 700, COUNT_AT = 120;
const E = "cubic-bezier(.2,.8,.2,1)";

/** when a row's wipe starts (ms), from its order and the headings above it */
export const rowStart = (i: number, headsAbove: number, step = ROW_STEP): number => ROW0 + i * step + headsAbove * HEAD_STEP;
/** the step between rows: the ref's 28ms, unless that would run the last row's wipe past the two seconds (a long
 *  campaign: the harness's 88 rows would start the last at ~2.97s); then as much as still ends by LOOK_MS */
export const rowStep = (rows: number, headsAboveLast: number): number => rows < 2 ? ROW_STEP
  : Math.max(0, Math.min(ROW_STEP, (LOOK_MS - WIPE - ROW0 - headsAboveLast * HEAD_STEP) / (rows - 1)));
/** one piece of a row's wipe: [delay, duration] from its left and width in the row's span */
export function wipeOf(left: number, width: number, L: number, span: number, d0: number): [number, number] {
  const s = Math.max(1, span);
  return [d0 + ((left - L) / s) * WIPE, Math.max(0, (width / s) * WIPE)];
}
/** a heading's count at t ms after it starts ticking (ref: smoothstep over 700ms) */
export const countAt = (n: number, t: number): number => { const k = Math.max(0, Math.min(1, t / COUNT_MS)); return Math.round(n * k * k * (3 - 2 * k)); };

export interface LookHandle { finish(): void }

/** the 200ms fade (every open but the day's first, and always with reduced motion) */
export function fadeWorld(el: HTMLElement): void {
  try { el.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: FADE_MS }); } catch { /* no Web Animations: it simply shows */ }
}

/** play the grow-in over `layer` (the world's drawn frame); `top0` is the ruler's foot. `onEnd` runs once, at the end
 *  or on `finish()`, after every animation has been dropped (the caller repaints the frame then). */
export function growIn(layer: HTMLElement, top0: number, onEnd: () => void): LookHandle {
  const anims: Animation[] = [];
  let raf = 0, timer: ReturnType<typeof setTimeout> | null = null, ended = false;
  const A = (el: Element, kf: Keyframe[], o: KeyframeAnimationOptions) => { try { const a = (el as HTMLElement).animate?.(kf, o); if (a) anims.push(a); } catch { /* skip */ } };
  const n = (el: HTMLElement, k: "top" | "left" | "width") => parseFloat(el.style[k]) || 0;
  const q = (s: string) => [...layer.querySelectorAll<HTMLElement>(s)];
  if (layer.dataset) { layer.dataset.look = "playing"; layer.dataset.t0 = performance.now().toFixed(1); }

  /* 1 · the today line, and the ruler's dates */
  const fl = layer.querySelector<HTMLElement>(".bw-fline");
  if (fl) { fl.style.transformOrigin = "top"; A(fl, [{ scale: "1 0", opacity: 0.3 }, { scale: "1 1", opacity: 0.85 }], { duration: LINE_MS, easing: E, fill: "backwards" }); }
  q(".bw-rm, .bw-rmon").forEach((m, i) => A(m, [{ opacity: 0, translate: "0 -4px" }, { opacity: 1, translate: "0 0" }], { duration: RM_MS, delay: COUNT_AT + i * RM_STEP, fill: "backwards" }));

  /* 2–4 · the rows: each one continuous wipe, its "!" popping as the wipe reaches it */
  const heads = q(".bw-gh0"), hy = heads.map((h) => n(h, "top"));
  const rows = new Map<string, HTMLElement[]>();
  for (const b of q(".bw-bar, .bw-ndt")) { const k = b.dataset.row ?? `y${Math.round(n(b, "top"))}`; if (!rows.has(k)) rows.set(k, []); rows.get(k)!.push(b); }
  const order = [...rows.entries()].map(([k, els]) => ({ k, els, t: Math.min(...els.map((e) => n(e, "top"))) })).sort((a, b) => a.t - b.t);
  const marks = q(".bw-ovd");
  const step = rowStep(order.length, order.length ? hy.filter((y) => y < order[order.length - 1].t).length : 0);
  if (layer.dataset) layer.dataset.step = step.toFixed(2);
  order.forEach(({ k, els, t }, i) => {
    const d0 = rowStart(i, hy.filter((y) => y < t).length, step);
    const L = Math.min(...els.map((b) => n(b, "left"))), R = Math.max(...els.map((b) => n(b, "left") + n(b, "width"))), span = Math.max(1, R - L);
    els.sort((a, b) => n(a, "left") - n(b, "left")).forEach((b) => {
      const [delay, duration] = wipeOf(n(b, "left"), n(b, "width"), L, span, d0);
      b.style.transformOrigin = "left center";
      b.dataset.g0 = delay.toFixed(1); b.dataset.g1 = (delay + duration).toFixed(1);
      A(b, [{ scale: "0 1" }, { scale: "1 1" }], { duration, delay, easing: "linear", fill: "backwards" });
    });
    for (const e of marks) {
      if ((e.dataset.row ?? "") !== k) continue;
      const [delay] = wipeOf(n(e, "left"), 0, L, span, d0);
      e.dataset.g0 = delay.toFixed(1);
      A(e, [{ scale: 0 }, { scale: 1.35, offset: 0.55 }, { scale: 1 }], { duration: POP_MS, delay, easing: "ease-out", fill: "backwards" });
    }
  });

  /* 5 · the headings fade up into place (ref: 80ms + 0.88ms a pixel down), their counts ticking up */
  heads.forEach((h) => A(h, [{ opacity: 0, translate: "0 6px" }, { opacity: 1, translate: "0 0" }], { duration: 300, delay: 80 + Math.max(0, n(h, "top") - top0) * 1.1 * 0.8, fill: "backwards" }));
  const counts = heads.map((h) => h.querySelector<HTMLElement>("em")).filter((e): e is HTMLElement => !!e).map((em) => ({ em, n: Number(em.textContent) || 0 }));
  const t0 = performance.now() + COUNT_AT;
  const tick = () => {
    const t = performance.now() - t0;
    for (const c of counts) c.em.textContent = String(countAt(c.n, t));
    if (t < COUNT_MS && !ended) raf = requestAnimationFrame(tick);
  };
  for (const c of counts) c.em.textContent = "0";
  raf = requestAnimationFrame(tick);

  const end = () => {
    if (ended) return;
    ended = true;
    cancelAnimationFrame(raf);
    if (timer) clearTimeout(timer);
    for (const a of anims) { try { a.cancel(); } catch { /* gone */ } }
    for (const c of counts) c.em.textContent = String(c.n);
    if (layer.dataset) layer.dataset.look = "done";
    onEnd();
  };
  timer = setTimeout(end, LOOK_MS + 40);
  return { finish: end };
}
