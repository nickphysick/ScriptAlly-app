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
import { bandInk, statusBand } from "../../lib/stageColours";
import React from "react";
import { StatusDot } from "../StatusDot";
import { QueryStatus } from "../../types";

/** Plumage colours v1 — a disc is its status's band (lib/stageColours `statusBand`), the mark in ink (the paper on the
 *  offer's navy). A disc never carries the with-you outline. */
export const phoneFill = (status: QueryStatus | string): string => statusBand(status);

export const PhoneDisc: React.FC<{ status: QueryStatus | string; size?: number; className?: string }> = ({ status, size = 36, className }) => (
  <span className={`pa-disc${className ? ` ${className}` : ""}`} style={{ width: size, height: size, background: phoneFill(status), color: bandInk(status) }} data-pa="disc" data-status={status}>
    <StatusDot status={status} overrideSize={Math.max(12, Math.round(size * 0.56))} tone="inherit" />
  </span>
);
