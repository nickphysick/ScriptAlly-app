/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Card journeys v1 — the four journeys' specs, by kind. Each journey's own file adds its line; a kind with no spec here
 * is never opened (lib/queryActions/cardJourneys `CARD_JOURNEY_LIVE` says the same to the doors).
 */
import type { CardJourneyKind } from "../../../lib/queryPanelStore";
import type { CJSpec } from "./QcCardJourney";

export const CJ_SPECS: Partial<Record<CardJourneyKind, CJSpec<any>>> = { // eslint-disable-line @typescript-eslint/no-explicit-any
};
