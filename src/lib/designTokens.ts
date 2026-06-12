/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ScriptAlly design tokens — the single source of truth for the parchment design system.
 *
 * Status colours below are consumed by the canonical StatusDot component as SVG attribute
 * values. IMPORTANT (known footgun): critical colours/borders must be applied as inline
 * styles or SVG attributes — never Tailwind utility classes, which have silently overridden
 * inline-critical styles in this codebase before. Tailwind stays fine for layout/spacing.
 */

/* ── Status glyph colours (StatusDot) ─────────────────────────────────── */
export const statusBurgundy = "#7c3a2a"; // outgoing ring sweep + outgoing marks; offer disc
export const statusPinkFill = "#f8e7dc"; // outgoing centre fill
export const statusSageRing = "#8a9e88"; // incoming ring sweep
export const statusSageFill = "#e9ede6"; // incoming centre fill
export const statusSageMark = "#5a6e58"; // incoming marks (arrow, pencil)
export const statusTrack = "#eee2d2"; // neutral ring track
export const statusClosedRing = "#cfc6bb"; // closed ring
export const statusClosedTrack = "#e4ddd2"; // closed track
export const statusClosedFill = "#efeae2"; // closed centre fill
export const statusClosedMark = "#b3a896"; // closed ×
export const statusParchment = "#fdfaf5"; // offer tick
