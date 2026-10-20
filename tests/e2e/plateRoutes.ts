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
 *
 * Analytics v17 (5 Oct) opens on the same band (`PageHeader band bandFixed`), so it is named here too;
 * its header geometry belongs to `analyticsV17` AN17-2/AN17-3.
 */
/* Analytics v21 (16 Oct): /queries/analytics LEFT the band for the centred light header (page-local, OWN_HEADER_ROUTES);
   AN21 A1 holds it. The register is empty, and the band claims assert what they skipped IS this set. */
export const BAND_ROUTES: readonly string[] = [];
/**
 * THE OWN-HEADER REGISTER (Contact list v15, 8 Oct) — routes whose header is PAGE-LOCAL (`data-own-header`), neither the
 * shared open header, a plate nor a band. The Contact list left the band in v15 for an open header the shared component
 * cannot draw (a 72px typewriter title, no eyebrow, the drawing in the flow beside the text); its geometry belongs to
 * `contactV15` CL15-1/CL15-2. The open-header claims skip it by NAME and assert that what they skipped IS this set.
 *
 * Manuscripts joined on 9 Oct (Manuscripts v21): the book's title as a 72px typewriter title, one line, two buttons,
 * the Archivist in the flow at the column's right edge. Its geometry belongs to `manuscriptsV21` H1/H2.
 */
/* /manuscripts/comps joined with Comparable titles v25 (12 Oct): its title panel is page-local (`data-own-header`), CV25 B1 holds it. */
/* /manuscripts/packages joined with Submission packages v4 (14 Oct): the centred light header is page-local (`data-own-header`),
   and its empty page's navy panel too; PK4 A1 and F1 hold them. */
/* /todo joined with To-do list v5 (15 Oct): the Contact list v17.1 centred light header, page-local (`data-own-header`),
   and its empty page's navy panel; TD5 A1 and G1 hold them (tests/e2e/todoV5.measure.ts). */
/* /queries/analytics joined with Analytics v21 (16 Oct): the centred light header is page-local (`data-own-header`), and
   its empty page's navy panel too; AN21 A1 and I1 hold them. The phone keeps v17's band. */
/* /agents/discover joined with Discover v1 (18 Oct): the light two-state header when live and the navy panel while coming
   soon, both page-local (`data-own-header`); DV1 B1 and E1 hold them (tests/e2e/discoverV1.measure.ts). */
export const OWN_HEADER_ROUTES: readonly string[] = ["/agents", "/queries", "/manuscripts", "/manuscripts/comps", "/manuscripts/packages", "/todo", "/queries/analytics", "/agents/discover"];
/**
 * The band routes whose band is Query Centre v131's COMPACT HERO CARD (`PageHeader band card compact`): a
 * fixed 178px card that centres its text vertically and stacks its pills in a column right of the text. The
 * Query Centre since v131 (the Contact list carried it in v14 and left it in v15). A living-headers lock that exempts
 * the compact card's centring or its pill column reads THIS set, never a route compared by hand.
 */
export const COMPACT_ROUTES: readonly string[] = [];
/** The plate's text inset — its 38px of horizontal padding, which PH1 measures against the brief. */
export const PLATE_PAD_X = 38;
