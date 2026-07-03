/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TypeGlyph — the canonical inline-SVG icon for a material type, used everywhere in the Package
 * Builder (type pills, manifest/picker headers, tray & library cards, modal headers, gallery shelf
 * tags, package-card content lines). Paths sampled verbatim from the approved mockup's `.tg` glyphs
 * (design-refs/scriptally-package-builder-cappuccino.html):
 *
 *   Query letter  = question mark (a query is literally a question)
 *   Synopsis      = three horizontal lines
 *   Sample pages  = a page with a second sheet behind it
 *
 * The glyph NEVER hard-codes colour — it strokes/fills with `currentColor`, so the caller's context
 * (a pill's ink colour, or black `--ink` on a tinted band) sets it. Each type carries its own optical
 * stroke weight from the mockup. Full Manuscript is intentionally unmapped — the builder surfaces
 * only the three types; passing it renders nothing.
 */
import React from "react";
import { ComponentType } from "../../types";

interface GlyphSpec {
  sw: number;
  cap?: "round";
  join?: "round";
  paths: React.ReactNode;
}

const GLYPHS: Partial<Record<ComponentType, GlyphSpec>> = {
  [ComponentType.QUERY_LETTER]: {
    sw: 2.4,
    cap: "round",
    paths: (
      <>
        <path d="M8.5 9a3.5 3.5 0 116 2.4c-1 .9-2.5 1.5-2.5 3.1" />
        <circle cx="12" cy="19" r="0.6" fill="currentColor" />
      </>
    ),
  },
  [ComponentType.SYNOPSIS]: {
    sw: 2.2,
    cap: "round",
    paths: <path d="M4 7h16M4 12h16M4 17h10" />,
  },
  [ComponentType.SAMPLE_PAGES]: {
    sw: 2,
    join: "round",
    paths: (
      <>
        <path d="M8 6h9a1 1 0 011 1v13a1 1 0 01-1 1H8a1 1 0 01-1-1V7a1 1 0 011-1z" />
        <path d="M6 17V4a1 1 0 011-1h8" />
      </>
    ),
  },
};

export interface TypeGlyphProps {
  /** Which material type. Full Manuscript is unmapped (renders null). */
  type: ComponentType;
  /** Square px size (viewBox is 24). Default 12 — the mockup's common size. */
  size?: number;
  /** Override the per-type stroke weight (defaults: letter 2.4 · synopsis 2.2 · pages 2). */
  strokeWidth?: number;
  /** Accessible label. When set the glyph is exposed as an image; otherwise it is aria-hidden. */
  title?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const TypeGlyph: React.FC<TypeGlyphProps> = ({ type, size = 12, strokeWidth, title, className, style }) => {
  const g = GLYPHS[type];
  if (!g) return null;
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth ?? g.sw}
      strokeLinecap={g.cap}
      strokeLinejoin={g.join}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      style={{ display: "inline-flex", flexShrink: 0, ...style }}
    >
      {title && <title>{title}</title>}
      {g.paths}
    </svg>
  );
};
