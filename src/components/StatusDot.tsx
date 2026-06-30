/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * StatusDot — ScriptAlly's canonical, permanent query-status glyph. Every visual
 * representation of a QueryStatus anywhere in the app renders through this component
 * (query list rows, sidebar filter rows, the reading-pane masthead, the dashboard,
 * timelines, import reviews). No render site ever draws its own dot.
 *
 * SINGLE SOURCE OF TRUTH — `STATUS_DOT_MAP` below maps each status to { base, glyph, pulse }.
 * Everything is derived from `base`:
 *   · Fill  = base mixed ~20% over parchment (#fdf9f5) — a soft tint of the base.
 *   · Glyph = base mixed ~22% toward ink (#3a322c) — deepened so it stays legible on the fill.
 *   · Border = 1px in the base colour on every dot, so even the palest fills (Queried,
 *     No Response, Withdrawn) keep a clear edge on cream / parchment / a selected row.
 * Change a value in the map and it propagates to every dot everywhere.
 *
 * Rendering is pure CSS + inline SVG (no raster artwork): a tinted disc, a base-colour ring,
 * and a stroked/filled 24×24 glyph. The four "your move" states (Partial Requested,
 * Full Requested, Revise & Resubmit, Offer) get a slow pulsing ring — see statusDot.css,
 * which also handles prefers-reduced-motion.
 *
 * The optional `ghost` "would-be"/skipped treatment renders the same dot drained to a neutral
 * grey (no pulse); opacity is left to external CSS (e.g. the hero's .hf-ghost peek/hover).
 */
import React from "react";
import { QueryStatus } from "../types";
import { normalizeStatus, getStatusLabel } from "./StatusPill";
import "./statusDot.css";

/** Legend source: map over this and render the actual <StatusDot> — never redraw copies. */
export const STATUS_DOT_LEGEND: { status: QueryStatus; label: string }[] = [
  { status: QueryStatus.QUERIED, label: "Queried" },
  { status: QueryStatus.PARTIAL_REQUESTED, label: "Partial Requested" },
  { status: QueryStatus.PARTIAL_SENT, label: "Partial Sent" },
  { status: QueryStatus.FULL_REQUESTED, label: "Full Requested" },
  { status: QueryStatus.FULL_SENT, label: "Full Sent" },
  { status: QueryStatus.REVISE_RESUBMIT, label: "Revise & Resubmit" },
  { status: QueryStatus.OFFER, label: "Offer" },
  { status: QueryStatus.REJECTED, label: "Rejected" },
];

/** Glyph identifiers — paths defined in renderGlyph(). */
type GlyphKey =
  | "plane"
  | "chevron-in-single"
  | "chevron-out-single"
  | "chevron-in-double"
  | "chevron-out-double"
  | "loop"
  | "star"
  | "cross"
  | "dash"
  | "ellipsis";

interface DotSpec {
  /** Base colour — fill, glyph and border are all derived from this. */
  base: string;
  glyph: GlyphKey;
  /** Pulsing ring — true only for the four "your move" states. */
  pulse: boolean;
}

/** SINGLE SOURCE OF TRUTH — QueryStatus → { base colour, glyph, pulse }. */
const STATUS_DOT_MAP: Record<QueryStatus, DotSpec> = {
  [QueryStatus.QUERIED]: { base: "#DCC5BF", glyph: "plane", pulse: false },
  [QueryStatus.PARTIAL_REQUESTED]: { base: "#C98E8A", glyph: "chevron-in-single", pulse: true },
  [QueryStatus.PARTIAL_SENT]: { base: "#AEBE96", glyph: "chevron-out-single", pulse: false },
  [QueryStatus.FULL_REQUESTED]: { base: "#B5736F", glyph: "chevron-in-double", pulse: true },
  [QueryStatus.FULL_SENT]: { base: "#8FA876", glyph: "chevron-out-double", pulse: false },
  [QueryStatus.REVISE_RESUBMIT]: { base: "#C57344", glyph: "loop", pulse: true },
  [QueryStatus.OFFER]: { base: "#5E8049", glyph: "star", pulse: true },
  [QueryStatus.REJECTED]: { base: "#963C36", glyph: "cross", pulse: false },
  [QueryStatus.WITHDRAWN]: { base: "#9B8C7A", glyph: "dash", pulse: false },
  [QueryStatus.NO_RESPONSE]: { base: "#C2B6A4", glyph: "ellipsis", pulse: false },
};

/**
 * Pure, additive classification — NOT a render path. Maps a status to its pipeline *direction*
 * so consumers (e.g. the Query DB list spine) can colour by the same fact the dot already shows,
 * and the two can never disagree. The dot owns the glyph/base; the caller owns the direction hex.
 *   out    — writer-side / outgoing (Queried, Partial Sent, Full Sent, Offer)
 *   in     — agent request / incoming (Partial Requested, Full Requested, Revise & Resubmit)
 *   closed — terminal (Rejected, Withdrawn, No Response, and any unknown)
 */
export const statusDirection = (status: QueryStatus | string): "out" | "in" | "closed" => {
  switch (normalizeStatus(status)) {
    case QueryStatus.QUERIED:
    case QueryStatus.PARTIAL_SENT:
    case QueryStatus.FULL_SENT:
    case QueryStatus.OFFER:
      return "out";
    case QueryStatus.PARTIAL_REQUESTED:
    case QueryStatus.FULL_REQUESTED:
    case QueryStatus.REVISE_RESUBMIT:
      return "in";
    default:
      return "closed";
  }
};

/** Surfaces the base colour is mixed against to derive fill (parchment) and glyph (ink). */
const PARCHMENT = "#fdf9f5";
const INK = "#3a322c";
/** Neutral base for the ghost / skipped treatment. */
const GHOST_BASE = "#a99e90";

const clamp255 = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
const parseHex = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};
const toHex = (rgb: [number, number, number]) =>
  "#" + rgb.map((c) => clamp255(c).toString(16).padStart(2, "0")).join("");

/** Linear sRGB mix: `t` is the fraction of `b` blended into `a`. */
const mix = (a: string, b: string, t: number): string => {
  const [ar, ag, ab] = parseHex(a);
  const [br, bg, bb] = parseHex(b);
  return toHex([ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t]);
};

const fillOf = (base: string) => mix(PARCHMENT, base, 0.2); // soft tint of the base
const glyphColorOf = (base: string) => mix(base, INK, 0.22); // deepened for legibility

const warnedUnknownStatuses = new Set<string>();

/** Every status dot renders at this fixed size, everywhere it appears (design requirement).
 *  The per-call `size` prop is accepted for backwards-compatibility but no longer changes the
 *  rendered size — change this one constant to resize all dots app-wide. */
const DOT_SIZE = 30;

const STROKE_PROPS = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Glyph paths — 24×24 viewBox, `currentColor` so the wrapping <svg> sets the colour. */
const renderGlyph = (key: GlyphKey): React.ReactNode => {
  switch (key) {
    case "plane":
      return (
        <>
          <path d="M21 4 L3 11 L10 13 L12 20 Z" {...STROKE_PROPS} />
          <path d="M21 4 L10 13" {...STROKE_PROPS} />
        </>
      );
    case "chevron-in-single":
      return <path d="M15 6 L9 12 L15 18" {...STROKE_PROPS} />;
    case "chevron-out-single":
      return <path d="M9 6 L15 12 L9 18" {...STROKE_PROPS} />;
    case "chevron-in-double":
      return (
        <>
          <path d="M18 6 L12 12 L18 18" {...STROKE_PROPS} />
          <path d="M11 6 L5 12 L11 18" {...STROKE_PROPS} />
        </>
      );
    case "chevron-out-double":
      return (
        <>
          <path d="M6 6 L12 12 L6 18" {...STROKE_PROPS} />
          <path d="M13 6 L19 12 L13 18" {...STROKE_PROPS} />
        </>
      );
    case "loop":
      return (
        <>
          <path d="M20 11 a8 8 0 1 0 -2.3 6" {...STROKE_PROPS} />
          <path d="M20 5 L20 11 L14 11" {...STROKE_PROPS} />
        </>
      );
    case "star":
      return (
        <path
          d="M12 3 L14.6 9 L21 9.5 L16 13.7 L17.6 20 L12 16.4 L6.4 20 L8 13.7 L3 9.5 L9.4 9 Z"
          fill="currentColor"
          stroke="none"
        />
      );
    case "cross":
      return (
        <>
          <path d="M7 7 L17 17" {...STROKE_PROPS} />
          <path d="M17 7 L7 17" {...STROKE_PROPS} />
        </>
      );
    case "dash":
      return <path d="M7 12 L17 12" {...STROKE_PROPS} />;
    case "ellipsis":
      return (
        <>
          <circle cx={6} cy={12} r={1.3} fill="currentColor" />
          <circle cx={12} cy={12} r={1.3} fill="currentColor" />
          <circle cx={18} cy={12} r={1.3} fill="currentColor" />
        </>
      );
  }
};

export interface StatusDotProps {
  /** Exact QueryStatus enum string (e.g. "Partial Requested" — never camelCase variants). */
  status: QueryStatus | string;
  /** Deprecated/ignored: all dots render at DOT_SIZE (30px) app-wide. Kept so existing call
   *  sites that still pass a size don't need touching. */
  size?: number;
  /** Explicit pixel size that OVERRIDES the app-wide 30px — used only by the dense timelines,
   *  where a full-size dot would be clipped by the compact layout. Min 12. */
  overrideSize?: number;
  className?: string;
  /** Muted "would-be"/skipped treatment — the same dot, drained to neutral grey. Default false. */
  ghost?: boolean;
  /** Decorative: a text status label sits directly beside the dot, so hide it from the
   *  accessibility tree (the label already conveys the status). When false (default) the dot
   *  stands alone and carries an aria-label of the status name. */
  decorative?: boolean;
}

export const StatusDot: React.FC<StatusDotProps> = ({
  status,
  overrideSize,
  className,
  ghost = false,
  decorative = false,
}) => {
  const S = Math.max(12, overrideSize ?? DOT_SIZE);
  const norm = normalizeStatus(status);
  const known = Object.values(QueryStatus).includes(norm);

  if (!known && !warnedUnknownStatuses.has(String(status))) {
    warnedUnknownStatuses.add(String(status));
    console.warn(`[StatusDot] Unknown query status "${status}" — rendering neutral dot.`);
  }

  const label = known ? getStatusLabel(norm) : String(status);
  const spec = known ? STATUS_DOT_MAP[norm] : undefined;

  const a11y: React.HTMLAttributes<HTMLSpanElement> = decorative
    ? { "aria-hidden": true }
    : { role: "img", "aria-label": label, title: label };

  // Unknown/unmapped status — neutral hollow dot so a bad value never crashes or shows nothing.
  if (!spec) {
    return (
      <span
        {...a11y}
        className={className}
        style={{
          width: S,
          height: S,
          flexShrink: 0,
          display: "inline-block",
          verticalAlign: "middle",
          borderRadius: "50%",
          border: "1px solid #c7bfb4",
          boxSizing: "border-box",
        }}
      />
    );
  }

  const base = ghost ? GHOST_BASE : spec.base;
  const fill = fillOf(base);
  const glyphColor = glyphColorOf(base);
  const pulse = spec.pulse && !ghost;
  const glyphSize = Math.round(S * 0.62);

  return (
    <span
      {...a11y}
      className={className}
      style={{
        position: "relative",
        width: S,
        height: S,
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        verticalAlign: "middle",
      }}
    >
      {/* tinted disc + 1px base-colour ring (guarantees an edge on every surface) */}
      <span
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: fill,
          border: `1px solid ${base}`,
          boxSizing: "border-box",
        }}
      />
      {pulse && (
        <span
          className="sa-statusdot__pulse"
          style={{ ["--sa-dot-pulse-color" as string]: base } as React.CSSProperties}
        />
      )}
      <svg
        width={glyphSize}
        height={glyphSize}
        viewBox="0 0 24 24"
        aria-hidden="true"
        style={{ position: "relative", display: "block", color: glyphColor }}
      >
        {renderGlyph(spec.glyph)}
      </svg>
    </span>
  );
};
