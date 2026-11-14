/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v43 (design-refs/submission-packages-v43) — the page's words: the navy header's headline, the
 * list's flag, the header's "new queries go out with" block and its Change menu, the collapsed bar and day one.
 * Copy only: every figure is read from the existing model (`usePk26Model`, `packageReplies`), and "the package new
 * queries go out with" is the manuscript's `activePackageId`, set by the model's `makeActive`.
 */

/* ══ the header (Phase 1) ══ */
/** The headline: the live (not retired) packages for the manuscript in scope. */
export const packagesTitle = (n: number) => (n === 1 ? "1 package" : `${n} packages`);
export const DAY_ONE_TITLE = "No packages yet";
export const HAWK_STANDING = "/images/packages/packages-hawk-standing.png";

/* ══ the list (Phase 2) ══ */
export const LIST_TITLE = "Your packages";
/** On the row of the package new queries go out with (replaces v42's "Current batch" tag). */
export const GOING_OUT = "Going out with new queries";
export const NO_NOTE = "No note yet";

/* ══ the header's right block and Change (Phase 3) ══ */
export const GO_OUT_LEAD = "New queries go out with";
export const CHANGE = "Change";
export const CHANGE_NOTE = "A package needs a version and a letter before it can go out.";
/** A line in the Change menu: "5 sent" or "not sent yet". */
export const changeLineSent = (sent: number) => (sent > 0 ? `${sent} sent` : "not sent yet");
/** The builder's button (replaces v42's "Use for current batch"). */
export const USE_FOR_NEW = "Use for new queries";

/* ══ the collapsed bar (Phase 4) ══ */
export const SLIM_GOES_OUT = "goes out with new queries";

/* ══ day one (Phase 5) ══ */
export const DAY_ONE_STEPS: readonly (readonly [string, string])[] = [
  ["Pick the pieces.", "A version of your book, a query letter, and a synopsis if agents ask for one."],
  ["Send it with your queries.", "Choose the package when you log a query, so you know exactly what went."],
  ["See what gets replies.", "Each package shows how many agents asked for more."],
];
