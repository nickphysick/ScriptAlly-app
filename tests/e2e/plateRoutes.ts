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
export const PLATE_ROUTES: readonly string[] = ["/queries"];
/** The plate's text inset — its 38px of horizontal padding, which PH1 measures against the brief. */
export const PLATE_PAD_X = 38;
