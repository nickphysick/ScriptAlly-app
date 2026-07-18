/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * journeyArt — the sheet-band illustration manifest (evening run C; contract in
 * design-refs/todo-sheet-restyle-v1.html's header comment). One key per journey; adding future
 * art is a one-line change (drop the file in src/assets/journeys/, point the key). Assets are
 * transparent ink-line drawings shipped SHADOWLESS — the band slot applies the CSS drop-shadow
 * and fit-within sizing. A null key = a quieter band: the slot renders NOTHING (no placeholder,
 * no broken image; the text block enjoys the width).
 */
import sendArt from "../../assets/journeys/send.png";

export type JourneyArtKey =
  | "send" | "nudge" | "offer" | "offerCelebration" | "stale" | "details"
  | "batch" | "note" | "review" | "reviewOpen" | "reviewClose" | "settings";

export const JOURNEY_ART: Record<JourneyArtKey, string | null> = {
  send: sendArt,
  nudge: null,
  offer: null,
  offerCelebration: null,
  stale: null,
  details: null,
  batch: null,
  note: null,
  review: null,
  reviewOpen: null,
  reviewClose: null,
  settings: null,
};
