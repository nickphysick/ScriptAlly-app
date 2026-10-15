/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PinnedRow — THE ONE FRAME EVERY PINNED ROW SITS IN (pinned-row fix, 15 Oct). Query Centre's and the Contact list's
 * rows render their own contents inside it; the frame owns the row's box, its height, its padding and its content row.
 *
 * ⚠️ THE ROW'S TOP IS COVERED, AND THE CONTENT IS CENTRED BELOW THE COVER. The row lies along the page sheet's top edge
 *    (a child of `.ws-window`, `top: 0`), and the sheet's sticky lip (`SheetLip`, 12px, z 19, `pointer-events: none`)
 *    is painted over the row's top strip. Before this frame the contents were centred on the row's own 68px box, so
 *    they sat 6px high in the 56px a reader could see — and a check measured against the row's box passed, because the
 *    box was centred. Now `--pin-cover` is the measured height of the cover, the row is `--pin-cover + 64px` tall,
 *    padded down by `--pin-cover`, and its content is one 64px flex row below the covered strip (pinnedRow.css).
 * ⚠️ ONE WRITER, NO POLLING: `usePinCover` reads the cover on mount, whenever the sheet or a lip resizes (a
 *    ResizeObserver: the sidebar and full screen both resize the sheet) and 340ms after such a change, once the
 *    transition has settled. It writes `--pin-cover` on the sheet, so the row and the page's sticky headings (which
 *    read `--pin-row-h`) take the same value.
 * ⚠️ EVERY WORKSPACE PAGE STAYS MOUNTED: the row is portalled only while its page is on screen (`on`).
 */
import React, { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import "./pinnedRow.css";

/** the cover's height: the lowest bottom edge of the sheet lips lying along the sheet's top edge, else 0 */
export function readPinCover(host: HTMLElement): number {
  const top = host.getBoundingClientRect().top;
  const lips = [...host.querySelectorAll<HTMLElement>("[data-sheet-lip]")]
    .map((l) => l.getBoundingClientRect())
    .filter((r) => r.height > 0 && Math.abs(r.top - top) < 1);
  return lips.length ? Math.max(...lips.map((r) => r.bottom - top)) : 0;
}

export function usePinCover(host: HTMLElement | null): void {
  useLayoutEffect(() => {
    if (!host) return undefined;
    let timer: number | undefined;
    const read = () => host.style.setProperty("--pin-cover", `${Math.round(readPinCover(host) * 100) / 100}px`);
    const later = () => { read(); window.clearTimeout(timer); timer = window.setTimeout(read, 340); };
    read();
    window.addEventListener("resize", later);
    if (typeof ResizeObserver === "undefined") return () => { window.removeEventListener("resize", later); window.clearTimeout(timer); };
    const ro = new ResizeObserver(later);
    ro.observe(host);
    host.querySelectorAll<HTMLElement>("[data-sheet-lip]").forEach((l) => ro.observe(l));
    return () => { ro.disconnect(); window.removeEventListener("resize", later); window.clearTimeout(timer); };
  }, [host]);
}

type DataAttrs = Record<`data-${string}`, string | undefined>;

export const PinnedRow: React.FC<{
  /** any element inside the page: the row is portalled into its page sheet */
  anchor: React.RefObject<HTMLElement | null>;
  /** this page is on screen */
  on: boolean;
  /** the row is showing (the header has scrolled away, or full screen) */
  shown: boolean;
  /** the page's own class for the row, and for its content row */
  className: string;
  innerClassName: string;
  attrs?: DataAttrs;
  innerAttrs?: DataAttrs;
  children: React.ReactNode;
}> = ({ anchor, on, shown, className, innerClassName, attrs, innerAttrs, children }) => {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => { setHost(on ? anchor.current?.closest<HTMLElement>(".ws-window") ?? null : null); }, [anchor, on]);
  usePinCover(on ? host : null);
  if (!on || !host) return null;
  return createPortal(
    <div className={`pin-row ${className}`} data-pin-row="" {...attrs} data-on={shown ? "" : undefined} aria-hidden={shown ? undefined : true} inert={shown ? undefined : true}>
      <div className={`pin-row-in ${innerClassName}`} data-pin-row-in="" {...innerAttrs}>{children}</div>
    </div>,
    host,
  );
};
