/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dashboard v2 · the hawk in the corner (Part F; ref design-refs/dashboard-v2, screens/04).
 *
 * The Mentor stands fixed in the bottom-right corner of the screen, 225px tall, and cross-fades over 250ms to the
 * version looking at you while the pointer is on him. Decorative: `aria-hidden`, never focusable.
 *
 * ⚠️ ONLY THE HAWK CATCHES THE POINTER, NEVER A BOX AROUND HIM: the hover is read from the ALPHA of the drawing
 * under the pointer (a canvas copy of the resting image). The wrapper takes pointer events only while that reading
 * is on (`data-look`), so the transparent corners of his box pass clicks through to the feed beneath. ⚠️ Desktop dashboard only: the page mounts him only
 * while /dashboard is on screen, and the sheet hides him under 768px.
 *
 * AFTER AN IMPORT (smart-import-photos-v1.1) he plays one sequence while the dashboard loads: rises
 * from behind the sheet's bottom edge, looks at the writer, goes back to his clipboard
 * (lib/mentorIntro). The loading page's hawk and the loaded dashboard's are two mounts of this one
 * component on one clock, so the sequence carries on across the hand-over and never restarts.
 * Reduced motion: none of it; he is simply there, at rest.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { MENTOR_INTRO as MI, mentorIntroStart, finishMentorIntro, mentorLooking, RISE_FRAMES, clipFrames, MENTOR_INTRO_END_MS } from "../../../lib/mentorIntro";
import "./dash2Hawk.css";

export const HAWK_REST = "/images/dash/mentor-leaning.png";
export const HAWK_LOOK = "/images/dash/mentor-leaning-looking.png";
export const HAWK_H = 225;

export const Dash2Hawk: React.FC = () => {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const alpha = useRef<{ data: Uint8ClampedArray; w: number; h: number } | null>(null);
  const [look, setLook] = useState(false);
  const [ratio, setRatio] = useState(0.597);
  const perchRef = useRef<HTMLDivElement | null>(null);
  const riseRef = useRef<HTMLDivElement | null>(null);
  /* the sequence: whether it is playing on this mount, and whether he is looking at the writer */
  const [intro, setIntro] = useState(false);
  const [introLook, setIntroLook] = useState(false);

  /* A LAYOUT effect, so his starting place below the edge is set before the first paint. */
  useLayoutEffect(() => {
    const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { if (mentorIntroStart() !== null) finishMentorIntro(); return undefined; }
    const t0 = mentorIntroStart();
    const perch = perchRef.current, rise = riseRef.current;
    if (t0 === null || !perch || !rise) return undefined;
    const elapsed = Date.now() - t0;
    setIntro(true);
    setIntroLook(mentorLooking(elapsed));
    const sheet = document.querySelector(".ws-window")?.getBoundingClientRect();
    const gap = sheet && sheet.height > 0 ? Math.round(window.innerHeight - sheet.bottom) : 0;
    const timing: KeyframeAnimationOptions = { duration: MI.RISE_MS, delay: MI.RISE_AT_MS - elapsed, fill: "backwards" };
    const anims = typeof rise.animate === "function"
      ? [rise.animate(RISE_FRAMES, { ...timing, easing: MI.RISE_EASE }), perch.animate(clipFrames(gap), { ...timing, easing: "linear" })]
      : [];
    const at = (ms: number, f: () => void) => window.setTimeout(f, Math.max(0, ms - elapsed));
    const timers = [
      ...(elapsed < MI.LOOK_AT_MS ? [at(MI.LOOK_AT_MS, () => setIntroLook(true))] : []),
      ...(elapsed < MI.BACK_AT_MS ? [at(MI.BACK_AT_MS, () => setIntroLook(false))] : []),
      at(MENTOR_INTRO_END_MS, () => { finishMentorIntro(); setIntro(false); }),
    ];
    /* unmounting (the loading page giving way to the dashboard) does not end the sequence: the next
       mount reads the same clock and carries on */
    return () => { timers.forEach((t) => window.clearTimeout(t)); anims.forEach((a) => a.cancel()); };
  }, []);

  /* the resting drawing's alpha, once loaded: what "on the hawk" means */
  const onLoad = () => {
    const img = imgRef.current;
    if (!img || !img.naturalWidth) return;
    setRatio(img.naturalWidth / img.naturalHeight);
    try {
      const w = Math.min(img.naturalWidth, 400), h = Math.round((w * img.naturalHeight) / img.naturalWidth);
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, w, h);
      alpha.current = { data: ctx.getImageData(0, 0, w, h).data, w, h };
    } catch { alpha.current = null; }
  };

  /* a document listener: the wrapper takes no pointer events, so the hawk's own box cannot be hovered */
  useEffect(() => {
    let frame = 0;
    let last: PointerEvent | null = null;
    const test = () => {
      frame = 0;
      const e = last, img = imgRef.current;
      if (!e || !img) return;
      const r = img.getBoundingClientRect();
      const inBox = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      let on = false;
      if (inBox) {
        const a = alpha.current;
        if (!a) on = true;
        else {
          const x = Math.floor(((e.clientX - r.left) / r.width) * a.w), y = Math.floor(((e.clientY - r.top) / r.height) * a.h);
          on = (a.data[(Math.min(a.h - 1, y) * a.w + Math.min(a.w - 1, x)) * 4 + 3] ?? 0) > 24;
        }
      }
      setLook((o) => (o === on ? o : on));
    };
    const move = (e: PointerEvent) => { last = e; if (!frame) frame = requestAnimationFrame(test); };
    const out = () => { last = null; setLook(false); };
    document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", out);
    return () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", out);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={perchRef} className="d2-perch" data-d2="hawk" data-look={look ? "1" : undefined}
      data-intro={intro ? "1" : undefined} data-intro-look={introLook ? "1" : undefined}
      aria-hidden="true" style={{ height: HAWK_H, width: Math.round(HAWK_H * ratio) }}>
      <div ref={riseRef} className="d2-rise">
        <img ref={imgRef} className="d2-p1" src={HAWK_REST} alt="" draggable={false} onLoad={onLoad} />
        <img className="d2-p2" src={HAWK_LOOK} alt="" draggable={false} />
      </div>
    </div>
  );
};
