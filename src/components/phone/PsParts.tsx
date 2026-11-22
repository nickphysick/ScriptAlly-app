/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone style v1 — THE PARTS THAT CARRY LOGIC (design-refs/phone-style-v1/phone-style-v1.html). The look is
 * phoneStyle.css; these are the few parts whose colour comes from data:
 *   - `PsDisc`: a row's status mark — the existing StatusDot on its stage band (PhoneDisc), at the sheet's 40.
 *   - `leadBackground`: the lead card's stage tint from lib/stageColours; an offer adds the sheen layer over it.
 * No new drawing of a mark, no colour outside the stage table.
 */
import React from "react";
import { OFFER_SHEEN_LAYER, STAGE_COLOURS, stageOf } from "../../lib/stageColours";
import { PhoneDisc } from "./PhoneDisc";
import type { QueryStatus } from "../../types";

export const PS_DISC = 40;

export const PsDisc: React.FC<{ status: QueryStatus | string; className?: string }> = ({ status, className }) => (
  <PhoneDisc status={status} size={PS_DISC} className={`ps-disc${className ? ` ${className}` : ""}`} />
);

/** the lead card's ground: its stage's tint; an offer's carries the sheen (the one sheen, lib/stageColours) */
export const leadBackground = (status: QueryStatus | string): string => {
  const s = stageOf(status);
  return s === "offer" ? `${OFFER_SHEEN_LAYER}, ${STAGE_COLOURS.offer.tint}` : STAGE_COLOURS[s].tint;
};
