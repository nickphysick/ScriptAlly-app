/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * StatTooltip — the plain single-line on-brand tooltip (still used by the +N overflow chip and
 * any non-stat-card callers). The show/hide mechanics live in useHoverShow so the richer
 * StatHoverPanel shares them exactly: hover/focus shows, 120ms delay-out prevents flicker,
 * keyboard focus works, reduced-motion drops the fade (CSS side).
 */
import React, { useRef, useState } from "react";

/** Shared hover/focus visibility with delay-out — one timing source for tooltip + panel. */
export const useHoverShow = (delayOutMs = 120) => {
  const [shown, setShown] = useState(false);
  const hideTimer = useRef<number | null>(null);

  const show = () => {
    if (hideTimer.current !== null) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    setShown(true);
  };
  const hide = () => {
    if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setShown(false), delayOutMs);
  };
  return { shown, show, hide };
};

interface StatTooltipProps {
  label: string;
  /** Wrapper display (the bars want a stretching flex child; glyphs an inline-flex). */
  block?: boolean;
  className?: string;
  style?: React.CSSProperties;
  /** Optional — a bare hover/focus slot (the sparkline columns) renders no visible child. */
  children?: React.ReactNode;
}

export const StatTooltip: React.FC<StatTooltipProps> = ({ label, block = false, className, style, children }) => {
  const { shown, show, hide } = useHoverShow();

  return (
    <span
      className={`sa-tipwrap${className ? " " + className : ""}`}
      style={{ display: block ? "flex" : "inline-flex", ...style }}
      tabIndex={0}
      aria-label={label}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      <span className={`sa-tip${shown ? " on" : ""}`} role="presentation" aria-hidden="true">
        {label}
      </span>
    </span>
  );
};
