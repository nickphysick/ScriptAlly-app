/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Onboarding v9 — the words and the small rules of the three set-up steps (design-refs/
 * onboarding-v9). Stated once so the screens, the lab and the locks read one set. Pure: no React.
 */

/* ── Step 1 · the welcome ─────────────────────────────────────────────────────────────────── */
export const WELCOME_EYEBROW = "Welcome";
export const WELCOME_SECOND = "Let's get you on board.";
export const WELCOME_LINE = "To make your set-up as quick as possible, let us know where you are in your querying journey.";
/** The first word of the account's display name, or "" when there is none. */
export const firstNameOf = (name: string | null | undefined): string => (name ?? "").trim().split(/\s+/)[0] ?? "";
/** The heading's two lines. With no name the first line drops it. */
export function welcomeHeading(name: string | null | undefined): [string, string] {
  const first = firstNameOf(name);
  return [first ? `Welcome to QueryHawk, ${first}.` : "Welcome to QueryHawk.", WELCOME_SECOND];
}
