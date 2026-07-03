/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * HubHeaderBar — the shared "Queries-Hub" header-bar grammar: a themed `.qhbar` strip (its
 * Cappuccino-only inset burgundy frame comes from `.t-capp .qhbar::after` in index.css) carrying a
 * Playfair title on the left and a right-aligned slot. Extracted so a new page (the Package Builder)
 * reuses it instead of copying the inline markup a third time.
 *
 * Defaults reproduce the Queries Hub bar exactly (Playfair-800 25px title, 13px 22px padding, the
 * standard drop shadow). Callers override per their own mockup via `style` (padding / gap / boxShadow
 * / marginBottom) and `titleStyle` (size / weight / colour). Colours come from theme tokens — the
 * bar is `var(--card)` on a `var(--bdw) solid var(--bd)` border with `var(--chromerad)` corners.
 *
 * NOTE: Queries.tsx still holds two inline copies of this bar. They are NOT swapped to this component
 * yet (that file has unmatched in-flight work overlapping those exact lines) — retire them here once
 * it is clean, which completes the dedup.
 */
import React from "react";
import { FONT_SERIF, FONT_MONO } from "../../lib/designTokens";

export interface HubHeaderBarProps {
  /** Playfair title text. */
  title: string;
  /** Optional inline adornment rendered immediately right of the title (e.g. a Pro pill). */
  titleAfter?: React.ReactNode;
  /** Optional mono sub-line under the title (e.g. "Tracking {manuscript}"). Ellipsises when long. */
  subtitle?: React.ReactNode;
  /** Right-aligned slot — a CTA, a manuscript selector, etc. */
  right?: React.ReactNode;
  /** Merged into the `.qhbar` container to override padding / gap / boxShadow / marginBottom. */
  style?: React.CSSProperties;
  /** Merged into the title element to override fontSize / fontWeight / color. */
  titleStyle?: React.CSSProperties;
}

export const HubHeaderBar: React.FC<HubHeaderBarProps> = ({ title, titleAfter, subtitle, right, style, titleStyle }) => (
  <div
    className="qhbar"
    style={{
      position: "relative",
      display: "flex",
      alignItems: "center",
      gap: 20,
      background: "var(--card)",
      border: "var(--bdw) solid var(--bd)",
      borderRadius: "var(--chromerad)",
      padding: "13px 22px",
      boxShadow: "0 8px 20px rgba(29,23,18,.18)",
      flexShrink: 0,
      ...style,
    }}
  >
    <div style={{ minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ fontFamily: FONT_SERIF, fontWeight: 800, fontSize: 25, color: "#1d1712", lineHeight: 1, ...titleStyle }}>{title}</div>
        {titleAfter}
      </div>
      {subtitle != null && (
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: ".04em", textTransform: "uppercase", color: "#5a6472", marginTop: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {subtitle}
        </div>
      )}
    </div>
    {right != null && <div style={{ marginLeft: "auto", flexShrink: 0 }}>{right}</div>}
  </div>
);
