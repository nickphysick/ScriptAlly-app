/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * StatusDot — QueryHawk's canonical, permanent query-status glyph. Every visual representation of a
 * QueryStatus anywhere in the app renders through this component (query list rows, the Query
 * Centre's views, the dashboard, timelines, the To-do board, import reviews). No render site ever
 * draws its own dot. That law is unchanged and is the only thing about this file that is.
 *
 * ══ THE RING SET (v21 §9, 21 Sep) — ONE LAW, REPLACING THE TINTED-DISC SET ══
 *
 * The mark is now a RING, drawn in ink, and the status is carried by what the ring is made of:
 *
 *   dashed ring  =  the agent has asked for something (a request, not yet answered)
 *   solid ring   =  you have sent it
 *   half centre  =  a partial          ·  full centre = a full manuscript
 *   no centre    =  nothing material has been asked for or sent yet
 *   a bar        =  closed
 *
 *   Queried            ring                    Full requested  dashed ring + full centre
 *   Partial requested  dashed ring + half      Full sent       ring + full centre
 *   Partial sent       ring + half             Offer           a document outline
 *                                              Closed          ring + a horizontal bar
 *
 * ⚠️ THE SHAPE CARRIES EVERYTHING; COLOUR CARRIES NOTHING. There is no tinted disc, no per-status
 * base colour, no derived fill and no ring hue — the whole mark is one ink stroke at 2px on a 24
 * viewBox, and the only filled areas are the half and full centres. This is the point of the set:
 * the old spectrum had ten colours doing a job the composition now does, and a reader had to learn
 * the palette to read a row.
 *
 * ⚠️ `--sd-hue` / `--sd-centre` ARE NO LONGER READ HERE, AND ARE NOT DELETED. The pair is a live
 * theme accent read by the manuscripts plate, the agents page and the dashboard's stat caps; this
 * component simply stops being one of its consumers. Removing the tokens because *this* file
 * stopped reading them would silently blank a dozen unrelated surfaces.
 *
 * ⚠️ THE PULSE IS GONE, AND SO IS `badge`. The four "your move" states had an animated ring around
 * the disc; there is no disc and the ref draws no pulse. `badge` (a thick ring and a white centre,
 * for the calendar's 58px mark) described the disc's proportions and had no callers left.
 *
 * ⚠️ TWO PLACES WHERE THE APP HAS MORE STATUSES THAN THE SET HAS GLYPHS. Both are flagged rather
 * than quietly resolved, because mapping a status to its nearest-looking neighbour is how a reader
 * comes to trust a mark that is lying to them:
 *
 *   · **The closed set collapses.** Rejected, Withdrawn and No Response were a cross, a dash and an
 *     ellipsis; all three are now "Closed" — ring + bar. This app treats them as one concept
 *     everywhere else (`statusDirection`, the closed grid, the filter), so the collapse is honest,
 *     but the DRAWING no longer distinguishes them. The accessible name and the tooltip still do.
 *   · **Revise & Resubmit has no row in the set at all.** It takes the one cell the composition
 *     leaves empty — a dashed ring with NO centre — which reads as "the agent has asked for
 *     something" without claiming a partial or a full. Nothing was invented: it is the set's own
 *     two parts in the one combination the seven named statuses do not use. It wants a ruling.
 *
 * The optional `ghost` "would-be"/skipped treatment draws the same ring in neutral grey; opacity is
 * left to external CSS (e.g. the hero's `.hf-ghost` peek/hover).
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
  /** Offer is the one status that is not a ring at all — it is the document itself. */
  document?: true;
}

/** SINGLE SOURCE OF TRUTH — QueryStatus → the ring it is made of. */
const STATUS_DOT_MAP: Record<QueryStatus, DotSpec> = {
  [QueryStatus.QUERIED]: { ring: "solid", centre: "none" },
  [QueryStatus.PARTIAL_REQUESTED]: { ring: "dashed", centre: "half" },
  [QueryStatus.PARTIAL_SENT]: { ring: "solid", centre: "half" },
  [QueryStatus.FULL_REQUESTED]: { ring: "dashed", centre: "full" },
  [QueryStatus.FULL_SENT]: { ring: "solid", centre: "full" },
  /* ⚠️ THE SET'S ONE FREE CELL — see the header. A request (dashed) with no material named. */
  [QueryStatus.REVISE_RESUBMIT]: { ring: "dashed", centre: "none" },
  [QueryStatus.OFFER]: { ring: "solid", centre: "none", document: true },
  /* ⚠️ ALL THREE CLOSED STATUSES DRAW THE SAME MARK — the drawing collapses, the name does not. */
  [QueryStatus.REJECTED]: { ring: "solid", centre: "bar" },
  [QueryStatus.WITHDRAWN]: { ring: "solid", centre: "bar" },
  [QueryStatus.NO_RESPONSE]: { ring: "solid", centre: "bar" },
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

const renderRing = (spec: DotSpec): React.ReactNode => {
  if (spec.document) {
    /* Offer is the document itself — an outline with two lines of writing on it. */
    return (
      <>
        <path d="M7 3.5h7l4 4V20.5H7z" strokeLinejoin="round" />
        <path d="M10 12h5M10 15.5h5" strokeLinecap="round" />
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

  /* ⚠️ ONE COLOUR, AND `currentColor` CARRIES IT TO BOTH THE STROKE AND THE CENTRE. The half and
     full discs are FILLS and the ring is a STROKE; setting `color` once on the svg is what keeps
     them the same ink without the two being stated separately and drifting apart. */
  const ink = ghost ? GHOST_STROKE : INK_STROKE;

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
        style={{ display: "block", color: ink }}
      >
        {renderRing(spec)}
      </svg>
    </span>
  );
};
