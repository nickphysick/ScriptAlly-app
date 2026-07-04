/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * StatTooltip — the one on-brand hover/focus tooltip used by every stat-card data point
 * (week bars, sparkline slots, agent glyphs, the response track). Anchored above the target
 * (not cursor-following), pointer-events:none, small delay-out so it never flickers. The
 * wrapper is keyboard-focusable and carries the same text as an aria-label, so the tooltip
 * appears on focus too. Surface/border/radius are theme-driven (see .sa-tip in dashboardV37.css);
 * reduced-motion drops the fade.
 */
import React, { useRef, useState } from "react";

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
    // Small delay-out: crossing between adjacent points never blinks the tip.
    hideTimer.current = window.setTimeout(() => setShown(false), 120);
  };

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
