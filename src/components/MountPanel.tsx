/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MountPanel — the shared parchment card with a REAL clipping frame (the structure the app already
 * uses correctly on the onboarding "Database populated" card; mirrors scriptally-header-fill-target.html).
 * Three nested layers:
 *   1. panel — the Form 11 parchment surface (+ paper grain), outer radius + shadow, and an even 6px
 *      padding on all four sides → that padding IS the uniform rim.
 *   2. frame — a 1px burgundy border with its own (smaller) radius + overflow:hidden; this is the
 *      clipping context. Its transparent interior lets the panel's grain show through the body.
 *   3. children — header / body laid INSIDE the frame; a band header (no radius/margin of its own) has
 *      its fill stopped at the frame border and clipped to the rounded corners, never reaching the edge.
 *
 * This deliberately does NOT use MountCard: MountCard's frame is an absolute overlay border
 * (pointer-events:none, no overflow:hidden), which can't contain a fill → the band spills at the corners.
 *
 * `fill` makes the panel + frame flex columns that stretch — use it for equal-height cards in a grid
 * (give the panel height:100% and let an inner body flex:1 push a footer/CTA to the bottom).
 */
import React from "react";
import { parchment, PAPER_TEXTURE, mountShadow, insetBorder } from "../lib/designTokens";

export interface MountPanelProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** Stretch panel + frame as flex columns (for equal-height grid cards with a pinned footer). */
  fill?: boolean;
  id?: string;
}

export const MountPanel: React.FC<MountPanelProps> = ({ children, className, style, fill, id }) => (
  <div
    id={id}
    className={className}
    style={{
      background: parchment,
      backgroundImage: PAPER_TEXTURE,
      borderRadius: 14,
      boxShadow: mountShadow,
      padding: 6,
      border: "1px solid rgba(124,58,42,0.10)",
      ...(fill ? { display: "flex", flexDirection: "column" } : {}),
      ...style,
    }}
  >
    <div
      style={{
        border: insetBorder,
        borderRadius: 9,
        overflow: "hidden",
        ...(fill ? { flex: 1, display: "flex", flexDirection: "column", minHeight: 0 } : {}),
      }}
    >
      {children}
    </div>
  </div>
);
