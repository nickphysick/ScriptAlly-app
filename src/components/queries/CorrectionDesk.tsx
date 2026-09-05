/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CorrectionDesk — the 440px card to the DRAWER'S LEFT that hosts the correction flow
 * (drawer cut 2, §3). The drawer never leaves; the desk does the work beside it.
 *
 * ⚠️ IT HOSTS, IT DOES NOT IMPLEMENT. CorrectionFork, CorrectionEdit and ConsequenceSheet render
 * inside it verbatim — the desk owns position, the notch, Escape and focus return, and NOTHING
 * about what any step does. The sheet chassis (border, shadow, sage strip) is neutralised by
 * desk-scoped CSS because the desk draws its own card and its own 5px accent strip; the
 * components' markup and copy are untouched.
 *
 * ⚠️ IT CANNOT LIVE INSIDE THE DRAWER. `.qpn` carries a `transform` even at rest, and any
 * transform makes an ancestor the containing block for `position: fixed` — the desk would measure
 * from the drawer's box, not the viewport (the StagePage lesson, one surface along). It mounts
 * beside the drawer and carries the stage class itself so `--stage-accent` resolves.
 *
 * ⚠️ ESCAPE IS CAPTURED. The drawer binds Escape-to-close on the same window; the desk's handler
 * runs on the capture phase and stops propagation, so closing the desk never also closes the
 * drawer behind it — the country-picker precedent, applied one layer up.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import "./correctionDesk.css";

export interface CorrectionDeskProps {
  /** The drawer's stage — `qcc--s-{stage}` goes on the desk root so the accent resolves here. */
  stage: string;
  /** The rung row (`.tl-ev`) the notch points at. Null = no anchor; the card sits at its default. */
  anchor: HTMLElement | null;
  /** The ⋯ (or dotted field) that opened the desk — focus returns here on close. */
  returnTo: HTMLElement | null;
  onClose: () => void;
  children: React.ReactNode;
}

export const CorrectionDesk: React.FC<CorrectionDeskProps> = ({ stage, anchor, returnTo, onClose, children }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; arrow: number | null }>({ top: 92, arrow: null });

  /**
   * The ref's own placement maths, verbatim: card top = rung centre − 42, clamped inside the
   * viewport with a 12px margin; the notch at rung centre − top − 8, so it keeps pointing at the
   * rung even while the clamp holds the card still.
   */
  const place = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    const vh = window.innerHeight;
    const h = card.offsetHeight;
    if (!anchor) { setPos({ top: Math.max(12, Math.min(92, vh - h - 12)), arrow: null }); return; }
    const r = anchor.getBoundingClientRect();
    const centre = r.top + r.height / 2;
    const maxTop = Math.max(12, vh - h - 12);
    const top = Math.max(12, Math.min(centre - 42, maxTop));
    setPos({ top, arrow: centre - top - 8 });
  }, [anchor]);

  /* placed before paint, and re-placed when the card's own height changes (the steps differ),
     the window resizes, or anything scrolls — the rung moves with the drawer's scroller */
  useLayoutEffect(place, [place, children]);
  useEffect(() => {
    const card = cardRef.current;
    const ro = card ? new ResizeObserver(place) : null;
    if (card && ro) ro.observe(card);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [place]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      e.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  /* focus home on unmount — the ⋯ the writer came from, never the page body */
  useEffect(() => () => { returnTo?.focus(); }, [returnTo]);

  return (
    <div className={`qcd qcc--s-${stage}`} role="presentation">
      <div
        ref={cardRef}
        className="qcd-card"
        role="dialog"
        aria-label="Correct this entry"
        data-notch={pos.arrow != null ? "on" : "off"}
        style={{ top: pos.top, "--arrow": pos.arrow != null ? `${pos.arrow}px` : undefined } as React.CSSProperties}
      >
        {children}
      </div>
    </div>
  );
};
