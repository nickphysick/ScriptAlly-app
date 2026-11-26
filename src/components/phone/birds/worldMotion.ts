/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone Birds-eye world v1, phase 3 — MOVEMENT: the ref's pointer, pinch, wheel, double-tap and inertia handlers and
 * its `animateTo` / `zoomAt` (design-refs/phone-birds-eye-world-v1, world.js `wire()`), ported. The view state is a
 * plain object the frame reads; nothing here renders React.
 *   - One finger drags (pan), two pinch (zoom about their midpoint, anchored on the row under them). A drag glides to
 *     a stop (×0.92 a frame). A tap without a drag opens the row's query sheet after 260ms; a second tap inside 300ms
 *     zooms in ×2.2 on that spot instead. Ctrl+wheel (a trackpad pinch) zooms; the wheel pans.
 *   - Reduced motion: no glide, no tweens (every move lands at once).
 *   - A pointer that starts on the controls, the ruler, the line's pill or the header is theirs, never the world's.
 */
import type { BwView, World } from "../../../lib/birdsWorld";

export interface MotionCtx {
  vp: HTMLElement;
  world: () => World | null;
  S: { current: BwView };
  draw: () => void;
  calm: () => boolean;
  /** the first touch of any kind (the hint goes; a replay is skipped) */
  touched: () => void;
  /** a tap on a row */
  openRow: (id: string) => void;
}
export interface Motion { animateTo: (t: BwView, dur?: number) => void; zoomAt: (px: number, py: number, f: number, smooth?: boolean) => void; stop: () => void; dispose: () => void }

export function wireMotion(c: MotionCtx): Motion {
  let anim = 0, inertia = 0;
  const assign = (t: BwView) => { c.S.current = { z: t.z, ox: t.ox, oy: t.oy }; };
  const stop = () => { cancelAnimationFrame(anim); cancelAnimationFrame(inertia); anim = 0; inertia = 0; };
  const animateTo = (t: BwView, dur = 320) => {
    cancelAnimationFrame(anim);
    if (c.calm()) { assign(t); c.draw(); return; }
    const f = { ...c.S.current }, t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      assign({ z: f.z + (t.z - f.z) * e, ox: f.ox + (t.ox - f.ox) * e, oy: f.oy + (t.oy - f.oy) * e }); c.draw();
      if (k < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  };
  const zoomAt = (px: number, py: number, factor: number, smooth = true) => {
    const W = c.world(); if (!W) return;
    const S = c.S.current, z2 = Math.min(W.maxZ, Math.max(1, S.z * factor)), wx = (px - S.ox) / W.SX(S.z), wy = W.yWorld(py - S.oy, S.z);
    const t = W.clamp({ z: z2, ox: px - wx * W.SX(z2), oy: py - W.yOff(wy, z2) });
    if (smooth) animateTo(t); else { assign(t); c.draw(); }
  };

  const vp = c.vp;
  const P = new Map<number, { x: number; y: number }>();
  let pan: { x: number; y: number; sx: number; sy: number; moved: boolean } | null = null;
  let pinch: { d: number; z: number; wx: number; wy: number } | null = null;
  let vel = { x: 0, y: 0 }, lastT = 0, lastTap = 0, tapT: ReturnType<typeof setTimeout> | undefined;
  const ours = (t: EventTarget | null) => !(t instanceof Element && t.closest(".bw-zc, .bw-fit, .bw-ruler, .bw-flab, .bw-hd, .bw-card, .bw-ndl"));

  const down = (e: PointerEvent) => {
    if (!ours(e.target)) return;
    c.touched();
    stop();
    try { vp.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
    P.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const r = vp.getBoundingClientRect(), W = c.world();
    if (P.size === 1) { pan = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false }; lastT = performance.now(); vel = { x: 0, y: 0 }; vp.classList.add("drag"); }
    if (P.size === 2 && W) {
      const [a, b] = [...P.values()], mx = (a.x + b.x) / 2 - r.left, my = (a.y + b.y) / 2 - r.top, S = c.S.current;
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: S.z, wx: (mx - S.ox) / W.SX(S.z), wy: W.yWorld(my - S.oy, S.z) };
      pan = null;
    }
  };
  const move = (e: PointerEvent) => {
    if (!P.has(e.pointerId)) return;
    P.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const r = vp.getBoundingClientRect(), W = c.world();
    if (!W) return;
    if (pinch && P.size >= 2) {
      const [a, b] = [...P.values()], d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2 - r.left, my = (a.y + b.y) / 2 - r.top;
      const z = Math.min(W.maxZ, Math.max(0.9, (pinch.z * d) / pinch.d));
      assign({ z, ox: mx - pinch.wx * W.SX(z), oy: my - W.yOff(pinch.wy, z) }); c.draw();
      return;
    }
    if (pan) {
      const dx = e.clientX - pan.x, dy = e.clientY - pan.y;
      if (Math.hypot(e.clientX - pan.sx, e.clientY - pan.sy) > 6) pan.moved = true;
      if (!pan.moved) return;
      const now = performance.now(), dt = Math.max(1, now - lastT);
      vel = { x: dx / dt, y: dy / dt }; lastT = now;
      const S = c.S.current;
      assign(W.clamp({ z: S.z, ox: S.ox + dx, oy: S.oy + dy })); pan.x = e.clientX; pan.y = e.clientY; c.draw();
    }
  };
  const up = (e: PointerEvent) => {
    if (!P.has(e.pointerId)) return;
    P.delete(e.pointerId); vp.classList.remove("drag");
    const r = vp.getBoundingClientRect(), W = c.world();
    if (pinch) { if (P.size < 2) { pinch = null; if (W) { assign(W.clamp(c.S.current)); c.draw(); } } return; }
    if (pan && !pan.moved) {
      const now = performance.now(), px = e.clientX - r.left, py = e.clientY - r.top;
      if (now - lastTap < 300) { lastTap = 0; clearTimeout(tapT); zoomAt(px, py, 2.2); }
      else {
        lastTap = now;
        const hit = document.elementsFromPoint(e.clientX, e.clientY).find((x) => x.classList?.contains("bw-hit")) as HTMLElement | undefined;
        tapT = setTimeout(() => { if (hit?.dataset.id) c.openRow(hit.dataset.id); }, 260);
      }
    } else if (pan && pan.moved && !c.calm() && W) {
      let v = { ...vel };
      const step = () => {
        v = { x: v.x * 0.92, y: v.y * 0.92 };
        if (Math.hypot(v.x, v.y) < 0.02) return;
        const S = c.S.current;
        assign(W.clamp({ z: S.z, ox: S.ox + v.x * 16, oy: S.oy + v.y * 16 })); c.draw();
        inertia = requestAnimationFrame(step);
      };
      inertia = requestAnimationFrame(step);
    }
    pan = null;
  };
  const wheel = (e: WheelEvent) => {
    if (!ours(e.target)) return;
    e.preventDefault(); c.touched();
    const r = vp.getBoundingClientRect(), W = c.world();
    if (!W) return;
    if (e.ctrlKey) zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.012), false);
    else { const S = c.S.current; assign(W.clamp({ z: S.z, ox: S.ox - e.deltaX, oy: S.oy - e.deltaY })); c.draw(); }
  };
  vp.addEventListener("pointerdown", down);
  vp.addEventListener("pointermove", move);
  vp.addEventListener("pointerup", up);
  vp.addEventListener("pointercancel", up);
  vp.addEventListener("wheel", wheel, { passive: false });
  return {
    animateTo, zoomAt, stop,
    dispose: () => {
      stop(); clearTimeout(tapT);
      vp.removeEventListener("pointerdown", down); vp.removeEventListener("pointermove", move);
      vp.removeEventListener("pointerup", up); vp.removeEventListener("pointercancel", up); vp.removeEventListener("wheel", wheel);
    },
  };
}

/** the hawk's shadow (ref `shadow()`): faint over the overview; zoom in and it grows, softens and fades by z 1.6; pan and
 *  it slides at 0.35× the world's speed */
export function shadowStyle(z: number, ox: number, oy: number, fit: BwView): { opacity: string; filter: string; transform: string } {
  const k = Math.max(0, Math.min(1, (1.6 - z) / 0.6));
  return {
    opacity: (0.1 * k).toFixed(3),
    filter: `blur(${(1.5 + (z - 1) * 6).toFixed(1)}px)`,
    transform: `translate(${((ox - fit.ox) * 0.35).toFixed(1)}px,${((oy - fit.oy) * 0.35).toFixed(1)}px) scale(${(1 + (z - 1) * 0.9).toFixed(3)}) rotate(-8deg) scaleX(-1)`,
  };
}
