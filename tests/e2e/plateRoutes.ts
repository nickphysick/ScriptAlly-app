/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE PLATE REGISTER (4 Oct) — the routes whose full header is a PLATE (`PageHeader plate`), the one
 * place every suite reads it from. A plate route's header geometry belongs to `plateHeader.measure.ts`
 * PH1–PH4; the open-header claims (`pageHeaderV2` §2/§4.4, `livingHeadersV3` LH0/LH4/LH7/LH9) skip it
 * by NAME, with the reason, and assert that what they skipped IS this set — so a page that becomes a
 * plate is exempt everywhere at once or red somewhere for a reason anyone can find (the optedOut law).
 * A plain module: importing a `.measure.ts` would execute its cases in the importer.
 */
export const PLATE_ROUTES: readonly string[] = [];
/**
 * THE BAND REGISTER (Contact list v13, 5 Oct) — the routes whose full header is the anthracite BAND
 * (`PageHeader band`). ⚠️ Query Centre v126 retired the plate on its one route and put the band there,
 * but left `/queries` in PLATE_ROUTES, so every exemption above went on asking a band to be a plate
 * and reported it red (pre-existing on main at 10c53e79). Both band pages are named here; a band
 * route's header geometry belongs to `qcV126` QC126-3 and `contactV13` CL13-1, and the open-header
 * claims skip it by NAME, with the reason, and assert that what they skipped IS this set.
 */
export const BAND_ROUTES: readonly string[] = ["/queries", "/agents"];
/** The plate's text inset — its 38px of horizontal padding, which PH1 measures against the brief. */
export const PLATE_PAD_X = 38;
