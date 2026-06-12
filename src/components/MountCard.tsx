/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MountCard — the parchment "mounted print" card of the dashboard design system.
 * Parchment + paper grain, 14px radius, kraft-tuned shadow, and the signature inset
 * burgundy frame (6px inset, 10px radius) drawn at z-index 3: above band/body fills,
 * below interactive content (give interactive children position:relative + zIndex 4).
 * Bands inside the card are inset by the same 6px (margin: "6px 6px 0",
 * borderRadius: "8px 8px 0 0" when edge-to-edge at the top).
 *
 * Critical colours/borders are inline styles on purpose — Tailwind classes have
 * silently overridden them in this codebase before. Tailwind is fine for layout.
 */
import React from "react";
import { parchment, PAPER_TEXTURE, mountShadow, insetBorder } from "../lib/designTokens";

export interface MountCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
}

export const MountCard: React.FC<MountCardProps> = ({ children, className, style, id }) => (
  <div
    id={id}
    className={className}
    style={{
      background: parchment,
      backgroundImage: PAPER_TEXTURE,
      borderRadius: 14,
      boxShadow: mountShadow,
      position: "relative",
      ...style,
    }}
  >
    {children}
    {/* the signature inset mount frame */}
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 6,
        border: insetBorder,
        borderRadius: 10,
        pointerEvents: "none",
        zIndex: 3,
      }}
    />
  </div>
);
