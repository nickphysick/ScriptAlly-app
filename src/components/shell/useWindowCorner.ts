/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useWindowCorner — a fixed element's `right`/`bottom` so it sits `inset` px inside the shell
 * window's bottom-right corner (Contact list v13 §6: the Housekeeping tab is "24px from the right and
 * bottom of the main window box"). MEASURED from `.ws-window`, never the viewport: the window is
 * inset from the screen by the shell's gap, and the sidebar collapses. Null until the window has
 * been laid out — never a zero rect.
 *
 * (The Query Centre's Birds-eye tab places itself the same way with its own copy; adopting this hook
 * there is part of the "Query Centre adopts the shared components" follow-up.)
 */
import { useLayoutEffect, useState } from "react";

export function useWindowCorner(inset = 24): { right: number; bottom: number } | null {
  const [p, setP] = useState<{ right: number; bottom: number } | null>(null);
  useLayoutEffect(() => {
    const read = () => {
      const win = document.querySelector(".ws-window") as HTMLElement | null;
      const r = win?.getBoundingClientRect();
      if (!r || r.width <= 0 || r.height <= 0) return;
      const vw = document.documentElement.clientWidth || window.innerWidth;
      const vh = document.documentElement.clientHeight || window.innerHeight;
      const next = { right: Math.round((vw - r.right + inset) * 10) / 10, bottom: Math.round((vh - r.bottom + inset) * 10) / 10 };
      setP((cur) => (cur && cur.right === next.right && cur.bottom === next.bottom ? cur : next));
    };
    read();
    window.addEventListener("resize", read);
    const win = document.querySelector(".ws-window");
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(read) : null;
    if (ro && win) ro.observe(win);
    return () => { window.removeEventListener("resize", read); ro?.disconnect(); };
  }, [inset]);
  return p;
}
