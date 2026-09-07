/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ A LOCK THAT READS A CSS RULE MUST ANCHOR THE SELECTOR AT A LINE START.
 *
 * `cssRules.indexOf(sel + " {")` is a SUBSTRING search, so `.os-actv {` is found inside
 * `.os-colR .os-actv {` and `.os-probanner {` inside `.os-colL .os-probanner {`. The moment a
 * stylesheet gains a descendant selector ending in the name being looked for — which is an
 * ordinary, correct thing for a stylesheet to do — every assertion written against the base rule
 * silently repoints at a rule about something else.
 *
 * ⚠️ AND IT REPOINTS AT THE ONE THAT COMES FIRST IN THE FILE, WHICH IS NOT THE ONE THE CASCADE
 * TAKES. So the two readings disagree in both directions at once: the test reads a rule the
 * browser discards, and misses the one it applies.
 *
 * ⚠️ THE FAILURE IS NOT ALWAYS A RED. Paired with a bounded slice it is worse — the dashboard's
 * `sliceBetween(css, ".os-actv {", ".os-ahead {")` began at a descendant rule 840 lines above the
 * real one and swept up every declaration in between, so `not.toContain("max-height")` failed over
 * a property belonging to four other rules. A lock that goes vague is harder to trust afterwards
 * than one that goes red.
 *
 * This is the one correct way to read a CSS rule in a test. It anchors on a line start, it returns
 * EVERY base rule for the selector rather than the first, and it fails loudly when there is none.
 *
 * ⚠️ RETURNING EVERY MATCH IS DELIBERATE. `oneScreen.css` states "one element, one rule" as an
 * invariant and has been bitten twice where it slipped; a reader that silently took the first would
 * make the next slip invisible again. Where a suite wants to ASSERT the invariant rather than read
 * through it, `cssRuleCount` is the same search with the count instead of the text.
 */
import { expect } from "vitest";

/** Every BASE rule for `sel` — anchored at a line start, so a descendant selector cannot match. */
const bodies = (css: string, sel: string): string[] => {
  const re = new RegExp(`(?:^|\\n)[ \\t]*${sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`, "g");
  const out: string[] = [];
  for (let m = re.exec(css); m !== null; m = re.exec(css)) out.push(m[1]);
  return out;
};

/**
 * The declarations of every base rule for `sel`, joined. Fails naming the selector when there is
 * none — a missing rule must never read as an empty body that satisfies every `not.toContain`.
 */
export function cssRule(css: string, sel: string, what = "the stylesheet"): string {
  const found = bodies(css, sel);
  expect(found.length, `${what} must declare a base rule for ${sel}`).toBeGreaterThan(0);
  return found.join("\n");
}

/** How many base rules `sel` has. One is the invariant; this is how a suite states it. */
export function cssRuleCount(css: string, sel: string): number {
  return bodies(css, sel).length;
}
