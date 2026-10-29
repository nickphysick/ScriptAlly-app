/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Queries on a phone v1 — THE ART SLOTS. Since Phone app v2 Part 1A these live in the phone's one art table
 * (`components/phone/phoneArt.ts`); this module keeps the old name so its two readers (QueriesPhone, Queries) are
 * unchanged. Swapping a commissioned piece in is one line THERE.
 *
 * ⚠️ NO SCREEN SHOWS ONE SOURCE TWICE (QM1 L11, now every phone screen).
 */
import { QM1_SLOTS, type PhoneArtSrc } from "../../phone/phoneArt";

export type Qm1Art = PhoneArtSrc;
export const QM1_ART = QM1_SLOTS;
