/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v157 (design-refs/query-centre-v157.html) — THE SLATE LADDER: the one place a stage's colours are
 * written in TypeScript. Sand for Queried, two blues getting deeper (partial, full), rose for the offer (Stage colours v1,
 * design-refs/stage-colours-v1/), closed its own grey.
 *
 * THE FOUR USES (Stage colours v1): `band` fills a card band, strip, bubble, bar, disc or segment; `tint` fills a label
 * or a heading wash; `edge` is the 1px line round a band-filled shape; `mark` is a chart's line or dot where a band
 * would be too pale to read. `rim` and `rimHi` (Query card v163) are the slide-in card's border only: its breath and its
 * landing light (qcMotion160) — deeper than `band`, so they read on the white rim. A status MARK is never a stage colour: it is ink (STAGE_INK).
 *
 * ⚠️ COLOUR IS THE STAGE AND NOTHING ELSE. Whose move it is never changes a band's colour.
 * ⚠️ Revise & Resubmit and Resubmitted are in the Full stage. Offer and Signed share the Offer stage.
 * ⚠️ Where a stylesheet must restate one of these hexes, stageColours.test.ts asserts it equals this table.
 */
import { QueryStatus } from "../types";

export type Stage = "queried" | "partial" | "full" | "offer" | "closed";
export interface StageColour { band: string; tint: string; edge: string; mark: string; rim: string; rimHi: string }

export const STAGE_COLOURS: Record<Stage, StageColour> = {
  queried: { band: "#efe6d6", tint: "#f8f4ed", edge: "#e0d2bb", mark: "#dccdb3", rim: "#bfa87e", rimHi: "#f3ead9" },
  partial: { band: "#e4ebf2", tint: "#f3f6f9", edge: "#cbd7e4", mark: "#a9bdd2", rim: "#6f8fb3", rimHi: "#d6e1ee" },
  full: { band: "#b7c9de", tint: "#dfe7f0", edge: "#9db4cf", mark: "#7391b3", rim: "#557aa3", rimHi: "#c5d4e6" },
  offer: { band: "#efcdc9", tint: "#f8e8e5", edge: "#dfb1ac", mark: "#cf9a96", rim: "#c98f8a", rimHi: "#f6dedb" },
  closed: { band: "#eceae6", tint: "#f6f5f3", edge: "#dedbd5", mark: "#a8a199", rim: "#9a9389", rimHi: "#e6e3de" },
};

/** Agent card v2.1 — the agent card's border with no query to follow: slate (the card's band), and its light's bright end.
 *  One entry beside the table; the table itself is unchanged. */
export const NO_QUERY_RIM: Pick<StageColour, "rim" | "rimHi"> = { rim: "#5e7189", rimHi: "#c3cedb" };

/** the white sheen over the offer's band, as one layer (position 30% 0, size 260% 100%) */
export const OFFER_SHEEN_LAYER =
  "linear-gradient(112deg, rgba(255,255,255,0) 22%, rgba(255,255,255,.55) 40%, rgba(255,255,255,.12) 52%, rgba(255,255,255,0) 66%) 30% 0 / 260% 100% no-repeat";
/** an offer band, strip or bubble: the sheen over the rose. Every offer surface draws this, and nothing else does. */
export const OFFER_SHEEN = `${OFFER_SHEEN_LAYER}, ${STAGE_COLOURS.offer.band}`;
/** a stage's band as a CSS `background`: the sheen on an offer, the flat band otherwise */
export const bandBackground = (s: Stage): string => (s === "offer" ? OFFER_SHEEN : STAGE_COLOURS[s].band);
/** gone quiet: the stage's band fading to white (the grid card's v157 stops). An offer is never quiet. */
export const quietBackground = (s: Stage): string => `linear-gradient(90deg, ${STAGE_COLOURS[s].band} 0, ${STAGE_COLOURS[s].band} 26%, #fff 82%)`;

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
