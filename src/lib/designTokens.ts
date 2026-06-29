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

/* ── Core surfaces & inks ─────────────────────────────────────────────── */
export const parchment = "#fdfaf5"; // card surface
export const kraft = "#F5F0EA"; // page ground — light sand; matches the Queries/Manuscripts page ground
/** Radial glow layered over the ground at top centre — warm near-white so it reads calm. */
export const kraftGlow = "radial-gradient(ellipse at 50% 0%, rgba(253,250,245,0.6) 0%, transparent 55%)";
/** Full page-ground background shorthand: glow over the sand base. */
export const pageGround = `${kraftGlow}, ${kraft}`;
export const insetBorder = "1px solid rgba(124,58,42,0.28)"; // the signature mount frame

/* ── Query Database desk palette (qdb-batch-edits mockup) ─────────────────
   Surfaces for the Query Database "desk": a soft-pink well, a warm-cream desk
   container framed by a thin sage outline, white list/pane cards on top, with a
   faint-parchment agent masthead. Kept here (not scattered literals) per the brief. */
export const qdbPagePink = "#f8eae3"; // page well / app-shell ground
export const qdbDeskSurface = "#faf7f1"; // desk container fill (warm cream)
export const qdbDeskFrame = "#b8b1a4"; // desk frame — thin grey outline, all sides
export const qdbMasthead = "#ffffff"; // agent masthead — raised white card
export const qdbCardLine = "#ddd4c6"; // list / pane / column / masthead hairline
export const burgundy = "#7c3a2a"; // primary
export const deepBurgundy = "#6b3023"; // hover / darker
export const bodyInk = "#3a1c14";
export const headingInk = "#2e3a2c";
export const mutedInk = "#8a7a6c";
export const labelColor = "#9c8878";
export const hairline = "0.5px solid #ece0d2";

/* ── Bands ────────────────────────────────────────────────────────────── */
export const sageBandGradient = "linear-gradient(135deg, #dce0d9 0%, #d0d6cc 100%)";
export const sageBandRule = "rgba(90,110,88,0.2)"; // 1px rule under a sage band
export const sageAccent = "#8a9e88";
export const sageText = "#5a6e58";
export const pinkBandGradient = "linear-gradient(135deg, #f5e2da 0%, #efd5ca 100%)";
export const pinkBandRule = "rgba(124,58,42,0.15)"; // 1px rule under a pink band
export const amberBandGradient = "linear-gradient(135deg, #efe3d2 0%, #e8d6bd 100%)";
export const amberBandRule = "rgba(185,138,78,0.25)"; // 1px rule under an amber band

/* ── Buttons ──────────────────────────────────────────────────────────── */
export const buttonPinkBg = "#f5e2da";
export const buttonPinkBorder = "#e8c8bc";
export const buttonPinkHoverBg = "#efd5ca";
export const buttonPinkHoverBorder = "#d8a89a";
export const ghostButtonBg = "#ffffff";
export const ghostButtonBorder = "#e0d5c8";
export const ghostButtonText = "#6a5a50";

/* ── Typography (Playfair Display serif/display · Source Sans Pro sans/body · JetBrains Mono labels · Caveat hand) ── */
export const FONT_SERIF = "'Playfair Display', Georgia, serif";
export const FONT_SANS = "'Source Sans Pro', system-ui, sans-serif";
export const FONT_MONO = "'JetBrains Mono', 'Fira Mono', monospace";

/** The label style: mono, 9px, uppercase, wide tracking. Spread into a style object. */
export const labelStyle = {
  fontFamily: FONT_MONO,
  fontSize: 9,
  letterSpacing: "0.17em",
  textTransform: "uppercase" as const,
  fontWeight: 500,
  color: labelColor,
};

/* ── Grain textures (SVG noise data-URIs shared with the Form 11 system) ── */
/** Card grain — the forms' paper-texture (soft, low-frequency). */
export const PAPER_TEXTURE =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 300 300' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.04' numOctaves='5' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3CfeComponentTransfer%3E%3CfeFuncA type='linear' slope='0.03'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23p)'/%3E%3C/svg%3E\")";
/** Fixed page grain — overlay the whole page at 0.25 opacity, pointer-events none. */
export const PAGE_GRAIN =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3CfeComponentTransfer%3E%3CfeFuncA type='linear' slope='0.04'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/** Mount card shadow, tuned for the dark kraft ground. */
export const mountShadow = "0 1px 3px rgba(58,28,20,0.08), 0 8px 26px rgba(58,28,20,0.13)";

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
