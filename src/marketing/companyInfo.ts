/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Company and contact facts — ONE file, read by every peripheral page.
 *
 * ⚠️ THE BRACKETED VALUES ARE PLACEHOLDERS AND THEY ARE MEANT TO BE READ AS SUCH. They render on
 * the page exactly as written, brackets included, because a legal page that states an invented
 * entity name is worse than one that visibly has not been filled in: nobody chases a page that
 * looks finished. Filling them in is an edit to this file and nothing else — the same reasoning
 * `legalCopy.ts` already applies to the wording.
 *
 * ⚠️ THE SUPPORT ADDRESS IS DEFINED ONCE, HERE. `HelpCentre.tsx` carries a DIFFERENT address
 * (`support@scriptally.com`, on a domain the product does not otherwise use) which predates this
 * file; the two disagree, and which one is real is Nick's call — flagged in the run report rather
 * than silently reconciled, because guessing an inbox that may not exist sends mail nowhere.
 */

/** The address every peripheral surface offers, and the one the legal copy names. */
export const SUPPORT_EMAIL = "hello@scriptally.ink";

/** The public host, stated in the footer base line. */
export const SITE_HOST = "scriptally.ink";

/** Operating entity — pending confirmation; rendered verbatim, brackets and all. */
export const LEGAL_ENTITY_NAME = "[LEGAL ENTITY NAME]";

/** Registered or trading address — pending confirmation; rendered verbatim. */
export const REGISTERED_ADDRESS = "[REGISTERED / TRADING ADDRESS]";

/** ICO registration — pending confirmation; rendered verbatim inside the privacy policy. */
export const ICO_REGISTRATION_NOTE = "[ICO registration number: pending.]";

/** The Firebase region the data sits in — bracketed until confirmed against the live project. */
export const DATA_REGION = "[europe-west2 — London]";

/**
 * Deletion window, in days, as the privacy policy states it.
 *
 * ⚠️ THE POLICY PROMISES THIS AND NO CODE ENFORCES IT. Account deletion ships disabled (see
 * `ACCOUNT_DELETION_ENABLED`), so the thirty days describe an intention rather than a mechanism.
 * Recorded here so the disagreement is visible from both ends.
 */
export const DELETION_WINDOW_DAYS = "[30]";

/** The date both legal documents state at the top of the band. */
export const LEGAL_LAST_UPDATED = "15 Aug 2026";

/** One-line description of the product, used in the footer's brand column. */
export const FOOTER_TAGLINE =
  "Query with confidence. A tracker for fiction writers seeking literary agents.";

/** `mailto:` with a subject pre-filled — the one place a support link is composed. */
export const supportMailto = (subject?: string): string =>
  subject ? `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}` : `mailto:${SUPPORT_EMAIL}`;
