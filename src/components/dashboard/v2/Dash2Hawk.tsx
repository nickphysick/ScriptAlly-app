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
 */
import React, { useEffect, useRef, useState } from "react";
import "./dash2Hawk.css";

export const HAWK_REST = "/images/dash/mentor-leaning.png";
export const HAWK_LOOK = "/images/dash/mentor-leaning-looking.png";
export const HAWK_H = 225;

export const Dash2Hawk: React.FC = () => {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const alpha = useRef<{ data: Uint8ClampedArray; w: number; h: number } | null>(null);
  const [look, setLook] = useState(false);
  const [ratio, setRatio] = useState(0.597);

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
    <div className="d2-perch" data-d2="hawk" data-look={look ? "1" : undefined} aria-hidden="true" style={{ height: HAWK_H, width: Math.round(HAWK_H * ratio) }}>
      <img ref={imgRef} className="d2-p1" src={HAWK_REST} alt="" draggable={false} onLoad={onLoad} />
      <img className="d2-p2" src={HAWK_LOOK} alt="" draggable={false} />
    </div>
  );
};
