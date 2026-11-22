/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * StatusDot — QueryHawk's canonical, permanent query-status glyph. Every visual representation of a
 * QueryStatus anywhere in the app renders through this component (query list rows, the Query
 * Centre's cards, track, header and filter, the dashboard, timelines, the To-do board, import
 * reviews). No render site ever draws its own mark. That law is the one thing about this file that
 * has never changed.
 *
 * ══ THE SET (status marks v3, 17 Nov; design-refs/status-marks-v3.html) ══
 *
 * Every mark is drawn in ink on a 24 viewBox at stroke 2, and the status is carried by its SHAPE:
 *
 *   dashed ring  =  the agent has asked for something (a request, not yet answered)
 *   solid ring   =  you have sent it
 *   half centre  =  a partial          ·  full centre = a full manuscript
 *   no centre    =  nothing material has been asked for or sent yet
 *   a bar        =  closed
 *
 *   Queried            ring                    Full requested     dashed ring + full centre
 *   Partial requested  dashed ring + half      Full sent          ring + full centre
 *   Partial sent       ring + half             Revise & Resubmit  recycle arrows (in a ring at 16px+)
 *   Offer, Signed      the star seal           Closed             ring + a horizontal bar
 *
 * The paths of the three v3 marks (the seal, its outline, the arrows) are the reference's own, copied
 * from its "Path data" block — never redrawn. `statusMarksV3.test.tsx` holds them to it.
 *
 * ⚠️ THE SHAPE CARRIES EVERYTHING; COLOUR CARRIES NOTHING. One ink (or the ghost's grey, or the
 * parent's colour under `tone="inherit"`), no per-status hue. `currentColor` takes the one colour to
 * both the strokes and the fills, so they can never drift apart.
 *
 * ⚠️ `--sd-hue` / `--sd-centre` ARE NOT READ HERE, AND ARE NOT DELETED. The pair is a live theme accent
 * read by the manuscripts plate, the agents page and the dashboard's stat caps.
 *
 * ⚠️ WHERE THE DRAWING COLLAPSES, THE NAME DOES NOT. The accessible name and the tooltip always say
 * which status it is:
 *   · Rejected, Withdrawn and No Response draw the one closed mark.
 *   · Signed draws Offer's seal.
 *   · Resubmitted draws Full Sent's mark (a dashed ring round a full centre would be Full Requested's,
 *     a mark that says the agent is asking when you have answered).
 *
 * ⚠️ REVISE & RESUBMIT HAS TWO FORMS, SWITCHED ON THE RENDERED SIZE `S`: at 16px and over the arrows
 * sit inside the ring; under 16px the ring goes and two larger arrows stand alone, because four
 * strokes inside a ring do not survive 13px.
 *
 * `tone` picks the colour: "ink" (the default), "ghost" (the old `ghost` prop, still honoured: the same
 * mark in neutral grey, opacity left to external CSS) or "inherit" (no colour set, so the mark takes
 * the parent's — the track's own CSS colours its steps). `reached={false}` draws Offer and Signed as
 * the outline seal, for a step not yet reached; every other status ignores it.
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
  { status: QueryStatus.REJECTED, label: "Rejected" },
];

/**
 * The ring's two halves, as the set composes them.
 *
 * `ring` is the outline — solid when you have sent something, dashed while the agent is asking for
 * it. `centre` is what the ask or the send is ABOUT — a half disc for a partial, a full disc for a
 * manuscript, nothing when no material is in play, a bar when the query is closed.
 */
type RingKind = "solid" | "dashed";
type CentreKind = "none" | "half" | "full" | "bar";
interface DotSpec {
  ring: RingKind;
  centre: CentreKind;
  /** Offer and Signed are not a ring at all — they are the star seal. */
  seal?: true;
  /** Revise & Resubmit — the recycle arrows (inside the ring at 16px and over). */
  arrows?: true;
}

/** SINGLE SOURCE OF TRUTH — QueryStatus → the ring it is made of. */
const STATUS_DOT_MAP: Record<QueryStatus, DotSpec> = {
  [QueryStatus.QUERIED]: { ring: "solid", centre: "none" },
  [QueryStatus.PARTIAL_REQUESTED]: { ring: "dashed", centre: "half" },
  [QueryStatus.PARTIAL_SENT]: { ring: "solid", centre: "half" },
  [QueryStatus.FULL_REQUESTED]: { ring: "dashed", centre: "full" },
  [QueryStatus.FULL_SENT]: { ring: "solid", centre: "full" },
  /* v3 — the recycle arrows: the manuscript goes round again */
  [QueryStatus.REVISE_RESUBMIT]: { ring: "solid", centre: "none", arrows: true },
  [QueryStatus.OFFER]: { ring: "solid", centre: "none", seal: true },
  /* ⚠️ ALL THREE CLOSED STATUSES DRAW THE SAME MARK — the drawing collapses, the name does not. */
  [QueryStatus.REJECTED]: { ring: "solid", centre: "bar" },
  [QueryStatus.WITHDRAWN]: { ring: "solid", centre: "bar" },
  [QueryStatus.NO_RESPONSE]: { ring: "solid", centre: "bar" },
  /* ⚠️ QUERY ACTIONS v1 — the two new statuses, built only from the set's existing parts.
     RESUBMITTED draws the SENT family's mark (a full manuscript has gone out, again), the same
     drawing as Full Sent: the brief's "with R&R's ring" composes to a dashed ring round a full
     centre, which IS Full Requested's drawing — a mark that would say the agent is asking when you
     have answered. So the drawing collapses onto Full Sent, exactly as the closed set does, and the
     accessible name and tooltip say which. (reports/query-actions-v1 "Decisions I made".) */
  [QueryStatus.RESUBMITTED]: { ring: "solid", centre: "full" },
  /* v3 — SIGNED draws Offer's seal; the name and the tooltip say "Signed" */
  [QueryStatus.SIGNED]: { ring: "solid", centre: "none", seal: true },
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

/** The one ink the set is drawn in — the app's `--ink`, stated because this is not a themed mark. */
const INK_STROKE = "#1c130f";
/** Neutral drain for the ghost / skipped treatment. */
const GHOST_STROKE = "#a99e90";

const warnedUnknownStatuses = new Set<string>();

/** Every status dot renders at this size unless a caller overrides it. */
const DOT_SIZE = 30;

/**
 * The ring set's parts, on a 24 viewBox.
 *
 * ⚠️ THE STROKE WIDTH IS A CONSTANT 2 ON THE VIEWBOX, NOT ON THE PIXEL. The svg scales, so a mark
 * drawn at 13px carries a proportionally lighter line than one at 30 — which is what keeps the set
 * looking like one family across the eighteen surfaces that draw it at eleven different sizes.
 */
const RING_R = 10;
const CENTRE_R = 6.5;

/* ── the v3 marks: the reference's "Path data", verbatim (design-refs/status-marks-v3.html) ── */
/** Offer and Signed: one filled path, the star cut out of it (fill-rule evenodd). */
const SEAL_SOLID =
  "M12.00 2.40A2.78 2.78 0 0 1 16.80 3.69A2.78 2.78 0 0 1 20.31 7.20A2.78 2.78 0 0 1 21.60 12.00A2.78 2.78 0 0 1 20.31 16.80A2.78 2.78 0 0 1 16.80 20.31A2.78 2.78 0 0 1 12.00 21.60A2.78 2.78 0 0 1 7.20 20.31A2.78 2.78 0 0 1 3.69 16.80A2.78 2.78 0 0 1 2.40 12.00A2.78 2.78 0 0 1 3.69 7.20A2.78 2.78 0 0 1 7.20 3.69A2.78 2.78 0 0 1 12.00 2.40ZM12.00 6.70L13.41 10.36L17.33 10.57L14.28 13.04L15.29 16.83L12.00 14.70L8.71 16.83L9.72 13.04L6.67 10.57L10.59 10.36Z";
/** An Offer step not yet reached: the seal's outline (stroke 2, no fill)… */
const SEAL_OUTLINE =
  "M12.00 3.20A2.55 2.55 0 0 1 16.40 4.38A2.55 2.55 0 0 1 19.62 7.60A2.55 2.55 0 0 1 20.80 12.00A2.55 2.55 0 0 1 19.62 16.40A2.55 2.55 0 0 1 16.40 19.62A2.55 2.55 0 0 1 12.00 20.80A2.55 2.55 0 0 1 7.60 19.62A2.55 2.55 0 0 1 4.38 16.40A2.55 2.55 0 0 1 3.20 12.00A2.55 2.55 0 0 1 4.38 7.60A2.55 2.55 0 0 1 7.60 4.38A2.55 2.55 0 0 1 12.00 3.20Z";
/** …with a small filled star inside it. */
const SEAL_OUTLINE_STAR = "M12.00 7.80L13.12 10.66L16.18 10.84L13.81 12.79L14.59 15.76L12.00 14.10L9.41 15.76L10.19 12.79L7.82 10.84L10.88 10.66Z";
/** Revise & Resubmit at 16px and over: four strokes at 1.8 inside the ring. */
const RR_INNER = ["M7.63 10.6A4.76 4.76 0 0 1 16.2 9.76", "M16.37 7.3V9.87H13.79", "M16.37 13.4A4.76 4.76 0 0 1 7.8 14.24", "M7.63 16.7V14.13H10.21"] as const;
/** Revise & Resubmit under 16px: the two arrows alone, larger, at the set's stroke 2, no ring. */
const RR_SMALL = ["M4.2 9.5A8.5 8.5 0 0 1 19.5 8", "M19.8 3.6V8.2H15.2", "M19.8 14.5A8.5 8.5 0 0 1 4.5 16", "M4.2 20.4V15.8H8.8"] as const;
/** ⚠️ The R&R switch, on the size the mark RENDERS at: 15 draws the small form, 16 the ringed one. */
const RR_RING_FROM = 16;

const renderRing = (spec: DotSpec, size: number, reached: boolean): React.ReactNode => {
  if (spec.seal) {
    if (!reached) {
      return (
        <>
          <path d={SEAL_OUTLINE} strokeLinejoin="round" />
          <path d={SEAL_OUTLINE_STAR} fill="currentColor" stroke="none" />
        </>
      );
    }
    return <path d={SEAL_SOLID} fill="currentColor" fillRule="evenodd" stroke="none" />;
  }
  if (spec.arrows) {
    if (size < RR_RING_FROM) {
      return <>{RR_SMALL.map((d) => <path key={d} d={d} strokeLinecap="round" strokeLinejoin="round" />)}</>;
    }
    return (
      <>
        <circle cx={12} cy={12} r={RING_R} />
        {RR_INNER.map((d) => <path key={d} d={d} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />)}
      </>
    );
  }
  return (
    <>
      <circle cx={12} cy={12} r={RING_R} strokeDasharray={spec.ring === "dashed" ? "6 4" : undefined} />
      {spec.centre === "half" && (
        /* the right half of the centre disc: up to the top, round the arc, back to the middle */
        <path d={`M12 12L12 ${12 - CENTRE_R}A${CENTRE_R} ${CENTRE_R} 0 0 1 12 ${12 + CENTRE_R}Z`} fill="currentColor" stroke="none" />
      )}
      {spec.centre === "full" && <circle cx={12} cy={12} r={CENTRE_R} fill="currentColor" stroke="none" />}
      {spec.centre === "bar" && <path d="M7.5 12h9" strokeLinecap="round" />}
    </>
  );
};

export interface StatusDotProps {
  /** Exact QueryStatus enum string (e.g. "Partial Requested" — never camelCase variants). */
  status: QueryStatus | string;
  /** Deprecated/ignored: all dots render at DOT_SIZE (30px) app-wide. Kept so existing call
   *  sites that still pass a size don't need touching. */
  size?: number;
  /** Explicit pixel size that OVERRIDES the app-wide 30px — used by the dense timelines and by
   *  every surface with a stated mark size. Min 12. */
  overrideSize?: number;
  className?: string;
  /** Muted "would-be"/skipped treatment — the same dot, drained to neutral grey. Default false.
   *  The same as `tone="ghost"`; kept so existing call sites need no change. */
  ghost?: boolean;
  /** The mark's colour: "ink" (default), "ghost" (neutral grey), or "inherit" — no colour set on the
   *  svg, so the mark takes `currentColor` from its parent. An explicit tone wins over `ghost`. */
  tone?: "ink" | "ghost" | "inherit";
  /** Offer and Signed only: `false` draws the outline seal (a step not yet reached). Default true;
   *  every other status ignores it. */
  reached?: boolean;
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
  tone,
  reached = true,
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

  /* ⚠️ ONE COLOUR, AND `currentColor` CARRIES IT TO BOTH THE STROKE AND THE CENTRE. The half and
     full discs are FILLS and the ring is a STROKE; setting `color` once on the svg is what keeps
     them the same ink without the two being stated separately and drifting apart. */
  const t = tone ?? (ghost ? "ghost" : "ink");
  const svgStyle: React.CSSProperties = t === "inherit" ? { display: "block" } : { display: "block", color: t === "ghost" ? GHOST_STROKE : INK_STROKE };

  return (
    <span
      {...a11y}
      className={className}
      style={{
        width: S,
        height: S,
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        verticalAlign: "middle",
      }}
    >
      <svg
        width={S}
        height={S}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
        style={svgStyle}
      >
        {renderRing(spec, S, reached)}
      </svg>
    </span>
  );
};
