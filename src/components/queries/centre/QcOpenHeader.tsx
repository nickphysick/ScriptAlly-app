/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v136 — THE OPEN, RULED-CORNER HEADER (design-refs/query-centre/query-centre-v136.html `.ohdr`).
 * The header is on the page, not on a panel: ruled paper fading out from the sheet's left edge, a red margin
 * line 26px left of the content column, ink text, and a hairline along its bottom edge that the courier
 * stands on. "You've sent {N} queries", "for {manuscript}", the stamp, two buttons. No faces: they live in
 * the bands' cards (QcGlance).
 *
 * ⚠️ NOT A PANEL (baked decision 1): no `.hpanel`, no `<HeaderSheet />`, no flap. The other workspace pages
 *    keep their header-panel-v2 panels. With no header sheet on screen the folder tab is the page's colour,
 *    by inkShell.css's own rule — nothing here sets it.
 * ⚠️ {N} IS THE BANDS' OWN TOTAL (with you + with agents + closed), so the title and the two band labels
 *    cannot disagree (QC136 A2). A withdrawn or signed query sits in no court and is in neither.
 * ⚠️ THE RULED CORNER STARTS AT THE SHEET'S EDGE, WHICH IS OUTSIDE THIS ELEMENT. The header is the content
 *    column's width; how far the sheet's left edge lies to its left, and how wide the sheet is, are MEASURED
 *    (`--qcoh-sl`, `--qcoh-sw`) from `.ws-window`, on resize, never restated from a gutter formula.
 * ⚠️ PAGE-LOCAL: `/queries` is in the e2e censuses' OWN_HEADER_ROUTES. Desktop only — below 768px the page
 *    renders the v126 page and its own header.
 * ⚠️ THE TITLE KEEPS `data-page-title`, the hook the shared header gives every page title.
 */
import React, { useLayoutEffect, useRef } from "react";
import { QC_PLATE_FIGURE } from "./qcArt";
import "./qcvOpenHeader.css";

/** what the figure holds while the count settles: its own shape, not drawn */
const PENDING_NUMBER = "00";
/** "queries", or "query" for one */
export const sentWords = (n: number): string => (n === 1 ? "query" : "queries");
/** the h1's accessible name: "You've sent 27 queries" */
export const sentTitle = (n: number): string => `You’ve sent ${n} ${sentWords(n)}`;

export const QcOpenHeader: React.FC<{
  /** the bands' own total: with you + with agents + closed. null while the page settles. */
  sent: number | null;
  /** the current manuscript's title; null when the page is scoped to more than one book */
  msTitle?: string | null;
  loading: boolean;
  onLog: () => void;
  onRecord: () => void;
  logDisabled?: boolean;
  logRef?: React.Ref<HTMLButtonElement>;
  /** the With you court's count. The stamp says it; absent at 0. */
  withYou?: number | null;
}> = ({ sent, msTitle = null, loading, onLog, onRecord, logDisabled = false, logRef, withYou = null }) => {
  const pending = loading || sent === null;
  const n = pending ? 0 : (sent as number);
  const ref = useRef<HTMLElement>(null);
  /* the sheet's left edge and width, as this header sees them: the ruled lines start at the one and fade across the other */
  useLayoutEffect(() => {
    const el = ref.current;
    const sheet = el?.closest<HTMLElement>(".ws-window");
    if (!el || !sheet) return undefined;
    const read = () => {
      const h = el.getBoundingClientRect(), s = sheet.getBoundingClientRect();
      if (h.width <= 0 || s.width <= 0) return;   /* not laid out yet: keep what was there */
      el.style.setProperty("--qcoh-sl", `${(h.left - s.left).toFixed(2)}px`);
      el.style.setProperty("--qcoh-sw", `${s.width.toFixed(2)}px`);
    };
    read();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(read);
    ro.observe(el); ro.observe(sheet);
    return () => ro.disconnect();
  }, []);
  return (
    <header ref={ref} className="qcoh" data-qcv="open-header" data-own-header="" data-loading={pending ? "" : undefined} aria-busy={pending || undefined}>
      {/* the ruled corner: decoration, behind the content, inside the sheet */}
      <span className="qcoh-ruled" data-qcv="oh-ruled" aria-hidden="true" />
      <span className="qcoh-margin" data-qcv="oh-margin" aria-hidden="true" />
      <div className="qcoh-txt" data-qcv="oh-text">
        {/* the title's row: the h1, then the stamp — real text, OUTSIDE the h1, hidden at 0 and while loading */}
        <div className="qcoh-trow">
          <h1 className="qcoh-title" data-probe="title" data-page-title="" aria-label={pending ? undefined : sentTitle(n)}>
            <span className="qcoh-ht" data-qcv="oh-ht">You&rsquo;ve sent</span>
            <span className="qcoh-hn" data-qcv="oh-hn">{pending ? PENDING_NUMBER : n}</span>
            <span className="qcoh-ht" data-qcv="oh-ht2">{sentWords(pending ? 2 : n)}</span>
          </h1>
          {!pending && typeof withYou === "number" && withYou > 0 && <span className="qcoh-stamp" data-qcv="oh-stamp">{withYou} with you</span>}
        </div>
        {msTitle ? <p className="qcoh-sub" data-qcv="oh-sub">for <em>{msTitle}</em></p> : null}
        <div className="qcoh-acts">
          <button ref={logRef} type="button" className="qcoh-b1" data-qcv="oh-log" onClick={onLog} disabled={logDisabled || pending}>+ Log a query</button>
          <button type="button" className="qcoh-b2" data-qcv="oh-record" onClick={onRecord} disabled={pending}>Record a response</button>
        </div>
      </div>
      {/* the courier, figure only, standing on the rule. Swappable by file (qcArt.ts). */}
      <img className="qcoh-art" data-qcv="oh-art" aria-hidden="true" alt=""
        src={`${QC_PLATE_FIGURE.src}?v=${QC_PLATE_FIGURE.version}`} width={QC_PLATE_FIGURE.width} height={QC_PLATE_FIGURE.height} />
    </header>
  );
};
