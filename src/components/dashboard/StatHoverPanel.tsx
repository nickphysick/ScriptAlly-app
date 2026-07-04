/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * StatHoverPanel — the rich hover panel for stat-card data points (locked designs S1·A·A·A).
 * Inherits StatTooltip's mechanics via useHoverShow: appears above the hovered/focused point
 * with a small offset and a caret at the origin, pointer-events:none, delay-out against
 * flicker, keyboard focus shows it, reduced-motion drops the fade (CSS). Max width ~300px.
 *
 * Per-theme chrome lives in dashboardV37.css (.sa-hpanel): Cappuccino card + 3px --sd-hue left
 * edge; Bold ink frame + hard offset shadow + pink top sliver; Editorial borderless Soft with a
 * graphite-tint header band. `align` handles the row-edge cases (first/last card) so panels at
 * the extremes never cross the page edge: the panel pins to the point's start/end instead of
 * centring, and the caret stays on the origin.
 */
import React from "react";
import { useHoverShow } from "./StatTooltip";

export type PanelAlign = "center" | "start" | "end";

interface StatHoverPanelProps {
  /** Accessible summary of the panel (the wrapper's aria-label). */
  label: string;
  align?: PanelAlign;
  /** Wrapper display (bar slots stretch; glyphs inline). */
  block?: boolean;
  className?: string;
  style?: React.CSSProperties;
  /** The panel body (header/rows/footer built by the caller from .sa-hp* classes). */
  panel: React.ReactNode;
  children?: React.ReactNode;
}

export const StatHoverPanel: React.FC<StatHoverPanelProps> = ({
  label,
  align = "center",
  block = false,
  className,
  style,
  panel,
  children,
}) => {
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
      <span className={`sa-hpanel sa-hpanel-${align}${shown ? " on" : ""}`} role="presentation" aria-hidden="true">
        {panel}
        <span className="sa-hpanel-caret" aria-hidden="true" />
      </span>
    </span>
  );
};
