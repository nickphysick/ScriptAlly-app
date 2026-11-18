/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v157 (design-refs/query-centre-v157.html) — THE SLATE LADDER: the one place a stage's colours are
 * written in TypeScript. Sand for Queried, then three blues getting deeper (partial, full, offer); closed its own grey.
 *
 * ⚠️ COLOUR IS THE STAGE AND NOTHING ELSE. Whose move it is never changes a band's colour.
 * ⚠️ Revise & Resubmit and Resubmitted are in the Full stage. Offer and Signed share the Offer stage.
 * ⚠️ The grid card reads `band` only. `tint` and `mark` are recorded for the next pack; nothing reads them yet.
 * ⚠️ Where a stylesheet must restate one of these hexes, stageColours.test.ts asserts it equals this table.
 */
import { QueryStatus } from "../types";

export type Stage = "queried" | "partial" | "full" | "offer" | "closed";
export interface StageColour { band: string; tint: string; mark: string }

export const STAGE_COLOURS: Record<Stage, StageColour> = {
  queried: { band: "#efe6d6", tint: "#f8f4ed", mark: "#dccdb3" },
  partial: { band: "#e4ebf2", tint: "#f3f6f9", mark: "#a9bdd2" },
  full: { band: "#b7c9de", tint: "#dfe7f0", mark: "#7391b3" },
  offer: { band: "#8ea7c6", tint: "#ccd7e5", mark: "#46668f" },
  closed: { band: "#eceae6", tint: "#f6f5f3", mark: "#a8a199" },
};

/** text on every band */
export const STAGE_INK = "#1c130f";

/** every status, in exactly one stage (locked in stageColours.test.ts) */
export const STAGE_STATUSES: Record<Stage, readonly QueryStatus[]> = {
  queried: [QueryStatus.QUERIED],
  partial: [QueryStatus.PARTIAL_REQUESTED, QueryStatus.PARTIAL_SENT],
  full: [QueryStatus.FULL_REQUESTED, QueryStatus.FULL_SENT, QueryStatus.REVISE_RESUBMIT, QueryStatus.RESUBMITTED],
  offer: [QueryStatus.OFFER, QueryStatus.SIGNED],
  closed: [QueryStatus.REJECTED, QueryStatus.NO_RESPONSE, QueryStatus.WITHDRAWN],
};
const BY_STATUS = new Map<string, Stage>(
  (Object.entries(STAGE_STATUSES) as [Stage, readonly QueryStatus[]][]).flatMap(([s, list]) => list.map((st) => [st, s] as [string, Stage])),
);

/** a status's stage; anything unknown reads as Queried, the first stage */
export const stageOf = (status: QueryStatus | string): Stage => BY_STATUS.get(status) ?? "queried";
