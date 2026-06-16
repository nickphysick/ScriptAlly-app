/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * StatusDot — ScriptAlly's canonical, permanent query-status glyph. Every visual
 * representation of a QueryStatus anywhere in the app renders through this component.
 *
 * The grammar:
 *   · ring fill = depth into the journey (empty / half / full / solid)
 *   · warm pink centre = your material went out; sage = the agent moved, ball is with you
 *   · the mark is the verb (→ sent, ← received, ✎ revise, ✓ offered, × closed)
 *
 * Closed-family statuses (Rejected / Withdrawn / No Response) all render the Closed glyph.
 * Geometry is the approved reference math — do not tweak locally; sizes 12–28px are vetted.
 * Colours come from the design-token module as SVG attribute values (never Tailwind classes —
 * Tailwind has silently overridden critical colours in this codebase before).
 */
import React from "react";
import { QueryStatus } from "../types";
import { normalizeStatus, getStatusLabel } from "./StatusPill";
import {
  statusBurgundy,
  statusPinkFill,
  statusSageRing,
  statusSageFill,
  statusSageMark,
  statusTrack,
  statusClosedRing,
  statusClosedTrack,
  statusClosedFill,
  statusClosedMark,
  statusParchment,
} from "../lib/designTokens";

/** Legend source: map over this and render the actual <StatusDot> — never redraw copies. */
export const STATUS_DOT_LEGEND: { status: QueryStatus; label: string }[] = [
  { status: QueryStatus.QUERIED, label: "Queried" },
  { status: QueryStatus.PARTIAL_REQUESTED, label: "Partial Requested" },
  { status: QueryStatus.PARTIAL_SENT, label: "Partial Sent" },
  { status: QueryStatus.FULL_REQUESTED, label: "Full Requested" },
  { status: QueryStatus.FULL_SENT, label: "Full Sent" },
  { status: QueryStatus.REVISE_RESUBMIT, label: "Revise & Resubmit" },
  { status: QueryStatus.OFFER, label: "Offer" },
  { status: QueryStatus.REJECTED, label: "Closed" },
];

const CLOSED_FAMILY = new Set<QueryStatus>([
  QueryStatus.REJECTED,
  QueryStatus.WITHDRAWN,
  QueryStatus.NO_RESPONSE,
]);

const warnedUnknownStatuses = new Set<string>();

/** Ring layers: optional centre fill, the track, then a sweep (0 / 0.5 / 1 of the circle). */
const ringLayers = (
  S: number,
  fraction: number,
  sweepColor: string,
  trackColor: string,
  fillColor: string | null
): React.ReactNode => {
  const c = S / 2;
  const r = S / 2 - 2;
  const sw = Math.max(S * 0.15, 1.8);
  const C = 2 * Math.PI * r;
  return (
    <>
      {fillColor && <circle cx={c} cy={c} r={+(r - sw / 2 + 0.4).toFixed(2)} fill={fillColor} />}
      <circle cx={c} cy={c} r={r} fill="none" stroke={trackColor} strokeWidth={sw} />
      {fraction >= 1 && <circle cx={c} cy={c} r={r} fill="none" stroke={sweepColor} strokeWidth={sw} />}
      {fraction > 0 && fraction < 1 && (
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={sweepColor}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={`${(C * fraction).toFixed(2)} ${C.toFixed(2)}`}
          transform={`rotate(-90 ${c} ${c})`}
        />
      )}
    </>
  );
};

/** Solid disc (Offer): filled circle r with a matching stroke of the ring width. */
const solidDisc = (S: number, color: string): React.ReactNode => {
  const c = S / 2;
  const r = S / 2 - 2;
  const sw = Math.max(S * 0.15, 1.8);
  return <circle cx={c} cy={c} r={r} fill={color} stroke={color} strokeWidth={sw} />;
};

/** Direction arrow: → (sent) or ← (received). */
const arrowMark = (S: number, right: boolean, color: string): React.ReactNode => {
  const c = S / 2;
  const a = S * 0.17;
  const h = S * 0.13;
  const sw = Math.max(S * 0.1, 1.3);
  const x1 = right ? c - a : c + a;
  const x2 = right ? c + a : c - a;
  const hx = right ? x2 - h : x2 + h;
  return (
    <g stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none">
      <line x1={+x1.toFixed(2)} y1={c} x2={+x2.toFixed(2)} y2={c} />
      <polyline
        points={`${hx.toFixed(2)},${(c - h).toFixed(2)} ${x2.toFixed(2)},${c} ${hx.toFixed(2)},${(c + h).toFixed(2)}`}
      />
    </g>
  );
};

/** Pencil ✎ (Revise & Resubmit): diagonal body + filled nib triangle to the tip. */
const pencilMark = (S: number, color: string): React.ReactNode => {
  const c = S / 2;
  const d = S * 0.155;
  const sw = Math.max(S * 0.1, 1.3);
  const tx = c - d; // tip
  const ty = c + d;
  const bx = c + d; // top of body
  const by = c - d;
  const jx = c - d * 0.38; // where body meets nib
  const jy = c + d * 0.38;
  const px = d * 0.42; // nib half-width (perpendicular)
  return (
    <g stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <line x1={bx.toFixed(2)} y1={by.toFixed(2)} x2={jx.toFixed(2)} y2={jy.toFixed(2)} />
      <path
        d={`M${(jx + px * 0.707).toFixed(2)} ${(jy + px * 0.707).toFixed(2)} L${tx.toFixed(2)} ${ty.toFixed(2)} L${(jx - px * 0.707).toFixed(2)} ${(jy - px * 0.707).toFixed(2)}`}
        fill={color}
        stroke="none"
      />
    </g>
  );
};

/** Tick ✓ (Offer), drawn in parchment over the solid disc. */
const tickMark = (S: number, color: string): React.ReactNode => {
  const c = S / 2;
  const a = S * 0.16;
  const sw = Math.max(S * 0.11, 1.4);
  return (
    <polyline
      points={`${(c - a).toFixed(2)},${c.toFixed(2)} ${(c - a * 0.25).toFixed(2)},${(c + a * 0.72).toFixed(2)} ${(c + a).toFixed(2)},${(c - a * 0.62).toFixed(2)}`}
      fill="none"
      stroke={color}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
};

/** Cross × (Closed). */
const crossMark = (S: number, color: string): React.ReactNode => {
  const c = S / 2;
  const a = S * 0.13;
  const sw = Math.max(S * 0.1, 1.3);
  return (
    <g stroke={color} strokeWidth={sw} strokeLinecap="round">
      <line x1={c - a} y1={c - a} x2={c + a} y2={c + a} />
      <line x1={c + a} y1={c - a} x2={c - a} y2={c + a} />
    </g>
  );
};

/** The colour set a glyph draws with. Swapped wholesale for the muted `ghost` treatment. */
interface DotPalette {
  burgundy: string;
  pinkFill: string;
  sageRing: string;
  sageFill: string;
  sageMark: string;
  track: string;
  closedRing: string;
  closedTrack: string;
  closedFill: string;
  closedMark: string;
  parchment: string;
}

const REAL_PALETTE: DotPalette = {
  burgundy: statusBurgundy,
  pinkFill: statusPinkFill,
  sageRing: statusSageRing,
  sageFill: statusSageFill,
  sageMark: statusSageMark,
  track: statusTrack,
  closedRing: statusClosedRing,
  closedTrack: statusClosedTrack,
  closedFill: statusClosedFill,
  closedMark: statusClosedMark,
  parchment: statusParchment,
};

/** Greyed "would-be" treatment — same glyph geometry, drained of colour (the pipeline ghost). */
const GHOST_PALETTE: DotPalette = {
  burgundy: "#b0a698",
  pinkFill: "#efe9e1",
  sageRing: "#c7bfb4",
  sageFill: "#efe9e1",
  sageMark: "#b0a698",
  track: "#e4ddd2",
  closedRing: "#c7bfb4",
  closedTrack: "#e4ddd2",
  closedFill: "#efe9e1",
  closedMark: "#b0a698",
  parchment: "#efe9e1",
};

const glyphFor = (status: QueryStatus, S: number, p: DotPalette): React.ReactNode => {
  if (CLOSED_FAMILY.has(status)) {
    return (
      <>
        {ringLayers(S, 1, p.closedRing, p.closedTrack, p.closedFill)}
        {crossMark(S, p.closedMark)}
      </>
    );
  }
  switch (status) {
    case QueryStatus.QUERIED:
      return (
        <>
          {ringLayers(S, 0, p.burgundy, p.track, p.pinkFill)}
          {arrowMark(S, true, p.burgundy)}
        </>
      );
    case QueryStatus.PARTIAL_REQUESTED:
      return (
        <>
          {ringLayers(S, 0.5, p.sageRing, p.track, p.sageFill)}
          {arrowMark(S, false, p.sageMark)}
        </>
      );
    case QueryStatus.PARTIAL_SENT:
      return (
        <>
          {ringLayers(S, 0.5, p.burgundy, p.track, p.pinkFill)}
          {arrowMark(S, true, p.burgundy)}
        </>
      );
    case QueryStatus.FULL_REQUESTED:
      return (
        <>
          {ringLayers(S, 1, p.sageRing, p.track, p.sageFill)}
          {arrowMark(S, false, p.sageMark)}
        </>
      );
    case QueryStatus.FULL_SENT:
      return (
        <>
          {ringLayers(S, 1, p.burgundy, p.track, p.pinkFill)}
          {arrowMark(S, true, p.burgundy)}
        </>
      );
    case QueryStatus.REVISE_RESUBMIT:
      return (
        <>
          {ringLayers(S, 1, p.sageRing, p.track, p.sageFill)}
          {pencilMark(S, p.sageMark)}
        </>
      );
    case QueryStatus.OFFER:
      return (
        <>
          {solidDisc(S, p.burgundy)}
          {tickMark(S, p.parchment)}
        </>
      );
    default:
      return null;
  }
};

export interface StatusDotProps {
  /** Exact QueryStatus enum string (e.g. "Partial Requested" — never camelCase variants). */
  status: QueryStatus | string;
  /** Pixel size. Default 13, hard minimum 12 — never rendered below 12px. */
  size?: number;
  className?: string;
  /** Muted "would-be" treatment — same glyph, drained of colour. Default false (full colour). */
  ghost?: boolean;
}

export const StatusDot: React.FC<StatusDotProps> = ({ status, size = 13, className, ghost = false }) => {
  const S = Math.max(12, size);
  const norm = normalizeStatus(status);
  const known = Object.values(QueryStatus).includes(norm);
  const palette = ghost ? GHOST_PALETTE : REAL_PALETTE;

  if (!known && !warnedUnknownStatuses.has(String(status))) {
    warnedUnknownStatuses.add(String(status));
    console.warn(`[StatusDot] Unknown query status "${status}" — rendering neutral track.`);
  }

  const label = known ? getStatusLabel(norm) : String(status);
  const c = S / 2;
  const r = S / 2 - 2;
  const sw = Math.max(S * 0.15, 1.8);

  return (
    <svg
      width={S}
      height={S}
      viewBox={`0 0 ${S} ${S}`}
      role="img"
      aria-label={label}
      className={className}
      style={{ flexShrink: 0, verticalAlign: "middle", display: "inline-block" }}
    >
      <title>{label}</title>
      {known ? (
        glyphFor(norm, S, palette)
      ) : (
        <circle cx={c} cy={c} r={r} fill="none" stroke={palette.track} strokeWidth={sw} />
      )}
    </svg>
  );
};
