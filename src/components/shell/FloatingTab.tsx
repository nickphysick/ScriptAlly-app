/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * FloatingTab — the anthracite tab in the window's bottom-right corner that opens a half-screen
 * drawer (Contact list v13 §6, ruling Q1: the v126 Birds-eye tab's construction, lifted). The page
 * supplies the picture, the words and the ring; this owns the place, the shape and the hide.
 *
 * ⚠️ PORTALLED TO `document.body`, SO IT MUST BE TOLD WHETHER ITS PAGE IS ON SCREEN (`routeActive`).
 * Every workspace page stays mounted; a portalled tab without that gate shows on every route — the
 * defect the Birds-eye tab had until Analytics v17.
 *
 * Only the Contact list uses it in this pack; the Query Centre keeps its own tab.
 */
import React from "react";
import { createPortal } from "react-dom";
import { useWindowCorner } from "./useWindowCorner";
import "./floatingTab.css";
import { floatInset } from "./inkTokens";

/** the expand mark — DRAWN, never the ⤢ character, which neither house face carries */
export const EXPAND_MARK = (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
    <path d="M8.5 1.5h4v4M12.5 1.5 8 6M5.5 12.5h-4v-4M1.5 12.5 6 8" />
  </svg>
);

export const FloatingTab: React.FC<{
  probe: string;
  /** the drawer is open: the tab steps out of the way */
  hidden: boolean;
  routeActive: boolean;
  label: string;
  onOpen: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}> = ({ probe, hidden, routeActive, label, onOpen, disabled, children }) => {
  const place = useWindowCorner(floatInset());
  if (typeof document === "undefined" || !routeActive || !place) return null;
  return createPortal(
    <button
      type="button"
      className={`ftab${hidden ? " is-hidden" : ""}`}
      data-ftab={probe}
      style={{ right: place.right, bottom: place.bottom }}
      aria-label={label}
      aria-hidden={hidden || undefined}
      tabIndex={hidden ? -1 : 0}
      disabled={disabled}
      onClick={onOpen}
    >
      {children}
      <span className="ftab-go" aria-hidden="true">{EXPAND_MARK}</span>
    </button>,
    document.body,
  );
};

/** A ring drawn in the tab's cream: the share filled, the percentage in its centre. */
export const TabRing: React.FC<{ share: number; size?: number; r?: number; w?: number }> = ({ share, size = 38, r = 15, w = 3.5 }) => {
  const L = 2 * Math.PI * r;
  const pct = Math.round(Math.max(0, Math.min(1, share)) * 100);
  return (
    <span className="ftab-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(245,241,235,.2)" strokeWidth={w} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f5f1eb" strokeWidth={w} strokeLinecap="round"
          strokeDasharray={L} strokeDashoffset={L * (1 - pct / 100)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <span>{pct}%</span>
    </span>
  );
};
