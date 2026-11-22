/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Plumage colours v2 (design-refs/plumage-colours-v2/plumage-colours-v2.json, over v1's plumage-colours-v1.json) — THE
 * ONE TABLE of a query's colours, written once in TypeScript and taken from the mentor hawk's plumage: Queried the
 * paper, the partial his breast, the full a slate blue, the offer duck egg, closed its own grey.
 *
 * ⚠️ THE BAND IS THE STATUS'S SHADE. Partial and Full each have two shades: lighter while requested, deeper once sent
 *    (`statusBand`). Revise & Resubmit and Resubmitted sit on the Full sent band. Nothing draws an outline round a band
 *    (v2 removed v1's with-you outline): the grid card names its status on a label instead.
 *
 * THE USES: `band` is the stage's band where only the stage is known — the SENT shade for partial and full
 * (`bandRequested` is the lighter one); `tint` fills a label or a heading wash; `edge` is the 1px line round a
 * band-filled shape; `mark` is a chart's line or dot; `rim` and `rimHi` (Query card v163) are the slide-in card's
 * border only, its breath and its landing light (qcMotion160). A status MARK is never a stage colour: it is ink.
 *
 * ⚠️ Text and marks are ink on every band, the offer's included (`bandInk`).
 * ⚠️ THE OFFER'S STRIPES (`OFFER_STRIPES`, through `bandBackground`) are for two card bands only: the grid card's band
 *    and the slide-in card's strip. Every other offer surface is flat duck egg (`statusBand`). No sheen, foil or
 *    animation on any offer surface (stageColours.test.ts sweeps `src/`).
 * ⚠️ Offer and Signed share the Offer stage.
 * ⚠️ Where a stylesheet must restate one of these hexes, stageColours.test.ts asserts it equals this table.
 */
import { QueryStatus } from "../types";

export type Stage = "queried" | "partial" | "full" | "offer" | "closed";
export interface StageColour { band: string; bandRequested: string; tint: string; edge: string; mark: string; rim: string; rimHi: string }

export const STAGE_COLOURS: Record<Stage, StageColour> = {
  queried: { band: "#efe6d6", bandRequested: "#efe6d6", tint: "#f8f4ed", edge: "#e0d2bb", mark: "#dccdb3", rim: "#bfa87e", rimHi: "#f3ead9" },
  partial: { band: "#e8c0af", bandRequested: "#f1d9cf", tint: "#f9f0ec", edge: "#e2b09c", mark: "#d1805f", rim: "#d1805f", rimHi: "#f1d9cf" },
  full: { band: "#b9c9da", bandRequested: "#dbe4ee", tint: "#eff3f7", edge: "#9fb3c8", mark: "#6f8fb0", rim: "#6f8fb0", rimHi: "#dbe4ee" },
  offer: { band: "#c5e0d8", bandRequested: "#c5e0d8", tint: "#eef6f3", edge: "#a9cdc2", mark: "#7fb3a5", rim: "#7fb3a5", rimHi: "#e2f0ec" },
  closed: { band: "#eceae6", bandRequested: "#eceae6", tint: "#f6f5f3", edge: "#dedbd5", mark: "#a8a199", rim: "#857e74", rimHi: "#e6e3de" },
};

/** Agent card v2.1 — the agent card's border with no query to follow: slate (the card's band), and its light's bright end.
 *  One entry beside the table; the table itself is unchanged. */
export const NO_QUERY_RIM: Pick<StageColour, "rim" | "rimHi"> = { rim: "#5e7189", rimHi: "#c3cedb" };

/** text and marks on every band */
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

/** the statuses whose band is the lighter, requested shade */
const REQUESTED: ReadonlySet<string> = new Set([QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED]);

/** a status's band: the requested shade while partial or full pages are asked for, otherwise its stage's band */
export const statusBand = (status: QueryStatus | string | null | undefined): string => {
  const c = STAGE_COLOURS[stageOf(status ?? QueryStatus.QUERIED)];
  return status && REQUESTED.has(status) ? c.bandRequested : c.band;
};

/** text and marks on a status's band: ink, on every band */
export const bandInk = (_status?: QueryStatus | string | null): string => STAGE_INK;
/** the same, for a surface that only knows the stage */
export const stageInk = (_s?: Stage): string => STAGE_INK;

/** a status's band as a CSS `background`: flat, always */
export const bandBackground = (status: QueryStatus | string | null | undefined): string => statusBand(status);
/** gone quiet: the status's band fading to white (the grid card's v157 stops). A requested query is never quiet;
 *  nor is an offer. */
export const quietBackground = (status: QueryStatus | string | null | undefined): string => {
  const b = statusBand(status);
  return `linear-gradient(90deg, ${b} 0, ${b} 26%, #fff 82%)`;
};

/** the paperclip tab's and pop-up's ink, on the stage's edge colour (plumage-colours-v2.json `accentInk`) */
export const ACCENT_INK: Readonly<Record<"partial" | "full" | "offer", string>> = { partial: "#7a4532", full: "#3d5673", offer: "#2f5a4e" };
