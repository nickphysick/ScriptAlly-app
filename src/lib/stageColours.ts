/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Plumage colours v1 (design-refs/plumage-colours-v1/plumage-colours-v1.json) — THE ONE TABLE of a query's colours,
 * written once in TypeScript and taken from the mentor hawk's plumage: Queried the paper, the partial his breast, the
 * full his wing, closed its own grey. The offer is the app's navy, flat (Nick's amendment to the pack's gold, 22 Nov).
 *
 * ⚠️ THE BAND IS THE STATUS'S SHADE; AN OUTLINE MEANS IT IS WITH THE WRITER.
 *    Partial and Full each have two shades: lighter while requested, deeper once sent (`statusBand`). A requested band,
 *    and Revise & Resubmit, carry a 3px outline drawn inside the band (`withYouOutline`): the sent shade it is heading
 *    for, or navy for R&R. The outline is for card bands and strips only; bars, bubbles, chips, discs and chart
 *    segments never carry it.
 *
 * THE USES: `band` is the stage's band where only the stage is known — the SENT shade for partial and full
 * (`bandRequested` is the lighter one); `tint` fills a label or a heading wash; `edge` is the 1px line round a
 * band-filled shape; `mark` is a chart's line or dot; `rim` and `rimHi` (Query card v163) are the slide-in card's
 * border only, its breath and its landing light (qcMotion160). A status MARK is never a stage colour: it is ink.
 *
 * ⚠️ The offer is flat navy with paper text and marks (`bandInk`); every other band is ink. No sheen, foil or gradient on any offer surface (stageColours.test.ts sweeps `src/`).
 * ⚠️ Revise & Resubmit and Resubmitted are in the Full stage, on the Full sent band. Offer and Signed share the Offer stage.
 * ⚠️ Where a stylesheet must restate one of these hexes, stageColours.test.ts asserts it equals this table.
 */
import { QueryStatus } from "../types";

export type Stage = "queried" | "partial" | "full" | "offer" | "closed";
export interface StageColour { band: string; bandRequested: string; tint: string; edge: string; mark: string; rim: string; rimHi: string }

export const STAGE_COLOURS: Record<Stage, StageColour> = {
  queried: { band: "#efe6d6", bandRequested: "#efe6d6", tint: "#f8f4ed", edge: "#e0d2bb", mark: "#dccdb3", rim: "#bfa87e", rimHi: "#f3ead9" },
  partial: { band: "#e8c0af", bandRequested: "#f1d9cf", tint: "#f9f0ec", edge: "#e2b09c", mark: "#d1805f", rim: "#d1805f", rimHi: "#f1d9cf" },
  full: { band: "#b5b6c0", bandRequested: "#d4d4da", tint: "#ededef", edge: "#a0a0ae", mark: "#65667c", rim: "#65667c", rimHi: "#d4d4da" },
  /* Nick's amendment (22 Nov): the offer is the app's navy, not the JSON's gold. The band is the navy; tint (18%),
     edge / mark / rim (the navy darkened to 86%) and rimHi (40%) are mixed from it by the JSON's own rules for the beak. */
  offer: { band: "#2a3a52", bandRequested: "#2a3a52", tint: "#d9dce0", edge: "#243247", mark: "#243247", rim: "#243247", rimHi: "#aab0ba" },
  closed: { band: "#eceae6", bandRequested: "#eceae6", tint: "#f6f5f3", edge: "#dedbd5", mark: "#a8a199", rim: "#857e74", rimHi: "#e6e3de" },
};

/** Agent card v2.1 — the agent card's border with no query to follow: slate (the card's band), and its light's bright end.
 *  One entry beside the table; the table itself is unchanged. */
export const NO_QUERY_RIM: Pick<StageColour, "rim" | "rimHi"> = { rim: "#5e7189", rimHi: "#c3cedb" };

/** text and marks on every band but the offer's */
export const STAGE_INK = "#1c130f";
/** text and marks on the offer's navy band: the seals' paper */
export const OFFER_INK = "#f4eee5";
/** the app's navy: the Revise & Resubmit outline */
export const PLUMAGE_NAVY = "#2a3a52";

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

/** the with-you outline: 3px, drawn inside the band, on card bands and strips only */
export const WITH_YOU_OUTLINE_PX = 3;
const OUTLINE: Readonly<Record<string, string>> = {
  [QueryStatus.PARTIAL_REQUESTED]: STAGE_COLOURS.partial.band,
  [QueryStatus.FULL_REQUESTED]: STAGE_COLOURS.full.band,
  [QueryStatus.REVISE_RESUBMIT]: PLUMAGE_NAVY,
};
/** a status's with-you outline colour, or null when the query is not with the writer */
export const withYouOutline = (status: QueryStatus | string | null | undefined): string | null => (status ? OUTLINE[status] ?? null : null);
/** the outline as a `box-shadow` (inset), or "none" */
export const withYouShadow = (status: QueryStatus | string | null | undefined): string => {
  const c = withYouOutline(status);
  return c ? `inset 0 0 0 ${WITH_YOU_OUTLINE_PX}px ${c}` : "none";
};

/** the text and mark colour on a status's band: paper on the offer's navy, ink on every other */
export const bandInk = (status: QueryStatus | string | null | undefined): string => (status && stageOf(status) === "offer" ? OFFER_INK : STAGE_INK);
/** the same, for a surface that only knows the stage */
export const stageInk = (s: Stage): string => (s === "offer" ? OFFER_INK : STAGE_INK);

/** a status's band as a CSS `background`: flat, always */
export const bandBackground = (status: QueryStatus | string | null | undefined): string => statusBand(status);
/** gone quiet: the status's band fading to white (the grid card's v157 stops). A requested query is never quiet, so
 *  quiet never carries an outline; an offer is never quiet. */
export const quietBackground = (status: QueryStatus | string | null | undefined): string => {
  const b = statusBand(status);
  return `linear-gradient(90deg, ${b} 0, ${b} 26%, #fff 82%)`;
};

/** the paperclip tab's and pop-up's ink, on the stage's edge colour (Plumage colours v1 `accentInk`). The offer's is
 *  the paper: the JSON's #6b4a1e was written for the gold, and does not read on the navy's edge. */
export const ACCENT_INK: Readonly<Record<"partial" | "full" | "offer", string>> = { partial: "#7a4532", full: "#524a5e", offer: OFFER_INK };
