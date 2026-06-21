/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * StatusDot — ScriptAlly's canonical, permanent query-status glyph. Every visual
 * representation of a QueryStatus anywhere in the app renders through this component.
 *
 * The artwork is the designed PNG set in /public/status-dots, one image per status, mapped
 * here as the SINGLE SOURCE OF TRUTH (STATUS_DOT_IMAGE). Change a path here and it propagates
 * to every render site — they all go through this component, never their own dot.
 *
 * Closed-family statuses share the Closed image apart from Rejected, which has its own.
 *
 * Rendering rules (per design spec):
 *   · smooth (default) image-rendering — the PNGs are 500×500 so they stay crisp at every
 *     size used in the app (9–22px); never upscaled.
 *   · the artwork is never altered — no tint, filter, opacity shift, border-radius clip, or
 *     object-fit crop; aspect ratio preserved (square source into a square box).
 *   · EXCEPTION: the optional `ghost` "would-be"/skipped treatment has no dedicated artwork,
 *     so it is muted with a grayscale+opacity filter. (Provide ghosted PNGs to drop this.)
 */
import React from "react";
import { QueryStatus } from "../types";
import { normalizeStatus, getStatusLabel } from "./StatusPill";

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

const CLOSED_IMG = "/status-dots/closed.png";

/** SINGLE SOURCE OF TRUTH — QueryStatus → dot image path. The closed family (Withdrawn /
 *  No Response) reuses the Closed image; Rejected has its own. */
const STATUS_DOT_IMAGE: Record<QueryStatus, string> = {
  [QueryStatus.QUERIED]: "/status-dots/queried.png",
  [QueryStatus.PARTIAL_REQUESTED]: "/status-dots/partial-requested.png",
  [QueryStatus.PARTIAL_SENT]: "/status-dots/partial-sent.png",
  [QueryStatus.FULL_REQUESTED]: "/status-dots/full-requested.png",
  [QueryStatus.FULL_SENT]: "/status-dots/full-sent.png",
  [QueryStatus.REVISE_RESUBMIT]: "/status-dots/revise-resubmit.png",
  [QueryStatus.OFFER]: "/status-dots/offer.png",
  [QueryStatus.REJECTED]: "/status-dots/rejected.png",
  [QueryStatus.WITHDRAWN]: CLOSED_IMG,
  [QueryStatus.NO_RESPONSE]: CLOSED_IMG,
};

const warnedUnknownStatuses = new Set<string>();

/** Every status dot renders at this fixed size, everywhere it appears (design requirement).
 *  The per-call `size` prop is accepted for backwards-compatibility but no longer changes the
 *  rendered size — change this one constant to resize all dots app-wide. */
const DOT_SIZE = 30;

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
  /** Muted "would-be"/skipped treatment — the same artwork, drained of colour. Default false. */
  ghost?: boolean;
}

export const StatusDot: React.FC<StatusDotProps> = ({ status, overrideSize, className, ghost = false }) => {
  const S = Math.max(12, overrideSize ?? DOT_SIZE);
  const norm = normalizeStatus(status);
  const known = Object.values(QueryStatus).includes(norm);

  if (!known && !warnedUnknownStatuses.has(String(status))) {
    warnedUnknownStatuses.add(String(status));
    console.warn(`[StatusDot] Unknown query status "${status}" — rendering neutral dot.`);
  }

  const label = known ? getStatusLabel(norm) : String(status);
  const src = known ? STATUS_DOT_IMAGE[norm] : undefined;

  // Unknown/unmapped status — neutral hollow dot so a bad value never crashes or shows nothing.
  if (!src) {
    return (
      <span
        role="img"
        aria-label={label}
        title={label}
        className={className}
        style={{
          width: S,
          height: S,
          flexShrink: 0,
          display: "inline-block",
          verticalAlign: "middle",
          borderRadius: "50%",
          border: `${Math.max(S * 0.15, 1.8)}px solid #c7bfb4`,
          boxSizing: "border-box",
        }}
      />
    );
  }

  return (
    <img
      src={src}
      width={S}
      height={S}
      alt={label}
      className={className}
      style={{
        width: S,
        height: S,
        maxWidth: "none", // resist any global `img{max-width:100%}` reset so it's always exactly 30px
        flexShrink: 0,
        display: "inline-block",
        verticalAlign: "middle",
        // ghost: no dedicated artwork, so drain the same image to grey (the one permitted
        // exception). Opacity is left alone so external CSS (e.g. the hero's .hf-ghost peek/hover
        // reveal) keeps controlling it; ghost sites without that CSS read as muted grey.
        ...(ghost ? { filter: "grayscale(1)" } : null),
      }}
    />
  );
};
