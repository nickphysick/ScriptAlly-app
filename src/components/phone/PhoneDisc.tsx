/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v2 — a status glyph in a disc of its status fill (ref `disc()`, screens.js; fills `stFill`, data.js).
 * The glyph is the app's own StatusDot ring set — the ref's `glyph()` draws the same marks — at 56% of the disc.
 *
 * The fills, by the ref's rule: an offer is slate; your court (a request, an R&R) is pink; closed is grey; a partial or
 * full SENT is sage; everything else (Queried, and the app's own Resubmitted, which the ref does not draw) is sand.
 * ⚠️ `Signed` is the app's, not the ref's: it takes the offer's slate, as the end of the offer's road. The report says so.
 */
import React from "react";
import { StatusDot } from "../StatusDot";
import { QueryStatus } from "../../types";

export type PhoneFill = "sand" | "sage" | "pink" | "slate" | "grey";
export function phoneFill(status: QueryStatus | string): PhoneFill {
  switch (status) {
    case QueryStatus.OFFER: case QueryStatus.SIGNED: return "slate";
    case QueryStatus.PARTIAL_REQUESTED: case QueryStatus.FULL_REQUESTED: case QueryStatus.REVISE_RESUBMIT: return "pink";
    case QueryStatus.REJECTED: case QueryStatus.NO_RESPONSE: case QueryStatus.WITHDRAWN: return "grey";
    case QueryStatus.PARTIAL_SENT: case QueryStatus.FULL_SENT: return "sage";
    default: return "sand";
  }
}

export const PhoneDisc: React.FC<{ status: QueryStatus | string; size?: number; className?: string }> = ({ status, size = 36, className }) => (
  <span className={`pa-disc pa-fill-${phoneFill(status)}${className ? ` ${className}` : ""}`} style={{ width: size, height: size }} data-pa="disc" data-status={status}>
    <StatusDot status={status} overrideSize={Math.max(12, Math.round(size * 0.56))} />
  </span>
);
