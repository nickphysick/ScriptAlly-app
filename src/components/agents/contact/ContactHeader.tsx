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
/** v14 §3: the hawk at a card-index box — the "Your agents" bar's art (640 × 569, transparent), drawn 160 wide
 *  in a 138 × 72 slot so its head rises above the bar's top edge. */
export const CONTACT_INDEX_HAWK = { src: "/images/contact/contact-index-hawk.webp", version: "1", width: 160, height: 142 };

/** v13 §2: the band's white disc holds the Archivist at the desk — the marketing Contact page's own
 *  drawing (`src/marketing/ContactPage.tsx`), READ from its public path rather than copied, so the
 *  two pages cannot drift. The file is square on white, not pre-cut to a circle (the Query Centre's
 *  disc art is), so the page's `.clv-bdisc` draws the white circle and insets the drawing in it.
 *  ⚠️ It replaces v12's `CONTACT_ARCHIVIST` (the full painting, `contact-list-hero-archivist-full.png`),
 *  whose only reader was the open header this band retires; that PNG is now referenced by nothing. */
export const CONTACT_BAND_DISC = { src: "/images/contact-archivist.png", version: "a603d9cb", width: 800, height: 800 };

/**
 * The intro, in runs from the one derivation — the manuscript's title in the typewriter face and
 * full ink, the counts in the serif at 600. Only the clauses the data has are stated.
 */

/* ⚠️ `ContactIntro` AND `ContactQuickAdd` ARE RETIRED (v12 P1, 3 Oct). The intro sentence moved
   INTO the living subline (the v12 card-index sentence carries want/fresh itself), and the
   quick-add drop went with the "Paste a link" pill: "+ Add an agent" opens the centred add card
   directly, and the link door lives inside that card (the go-ahead's ask 2). Recoverable at
   3a420a1c. */
