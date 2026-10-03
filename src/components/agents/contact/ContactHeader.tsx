/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Contact list's pieces of the shared full header (page header v2 §4; ref
 * design-refs/page-header/contact-list-header-v5.html): the page's art constants. The header itself is `PageHeader variant="full"` —
 * the same component, the same frame and the same rule as the Query Centre's.
 *
 * ⚠️ THE v11 HERO IS RETIRED WITH ITS PLACEMENT MACHINERY. `ContactHero`, `heroLayout`, `place()`
 * and the blank card drawn over the Archivist's art are gone: the card no longer sits in the
 * drawing, so there is nothing to solve a layout chain for. The drawing is the hawk alone,
 * cropped from the same source (`scripts/crop-contact-hawk.mjs`), standing on the rule.
 */

/** The hawk, cropped from `/images/contact/hero-archivist.png` with the drawn card removed. */
export const CONTACT_HAWK = { src: "/images/contact/contact-hawk.webp", version: "1", width: 389, height: 344 };

/** v12: the whole painting, trimmed to its bounds — the hero art in the shared art box
 *  (`object-fit: contain`, anchored bottom-right by the box). Replaces the hawk-only crop in
 *  the HEADER; the hawk survives as the Housekeeping tray's stand-in and the empty state's
 *  art until P5. */
export const CONTACT_ARCHIVIST = { src: "/images/contact/contact-list-hero-archivist-full.png", version: "1", width: 1141, height: 360 };

/**
 * The intro, in runs from the one derivation — the manuscript's title in the typewriter face and
 * full ink, the counts in the serif at 600. Only the clauses the data has are stated.
 */

/* ⚠️ `ContactIntro` AND `ContactQuickAdd` ARE RETIRED (v12 P1, 3 Oct). The intro sentence moved
   INTO the living subline (the v12 card-index sentence carries want/fresh itself), and the
   quick-add drop went with the "Paste a link" pill: "+ Add an agent" opens the centred add card
   directly, and the link door lives inside that card (the go-ahead's ask 2). Recoverable at
   3a420a1c. */
