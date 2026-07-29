/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Queries Hub · create-mode CORRECTIONS ROUND 2
 * (refs design-refs/qdb-create-fixes2.html · design-refs/qdb-draft-row.html).
 *
 * Three fixes, each of which failed in a way the previous round's locks could not see:
 *   P1 the pane names its job in Playfair, and "Sent by" is an inset track (the ringed segment
 *      overflowed its own frame);
 *   P2 the sample quantity is one bordered stepper + the app's menu — never a native <select>;
 *   P3 the draft row is the SAME BOX as every other row.
 *
 * A note on method, because it is the reason P3 was still broken after being "fixed": a
 * string-presence assertion cannot see the cascade. `.f12-drafttag { position: static; ... }` was
 * in the file AND overridden four lines later by a second rule of equal specificity. So the lock
 * below asserts the rule appears exactly ONCE rather than merely appearing.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const pane = read("../components/queries/QueryCreatePane.tsx");
const css = read("../components/shell/f12.css");

/** One CSS rule body, anchored at a line start so a compound selector can't match instead. */
const block = (selector: string): string => {
  const at = css.indexOf("\n" + selector + " {");
  if (at < 0) return "";
  return css.slice(at, css.indexOf("}", at) + 1);
};

/** How many rules in the sheet open with exactly this selector. */
const ruleCount = (selector: string): number =>
  css.split("\n" + selector + " {").length - 1;

describe("P1 · the pane names its job", () => {
  it("a Playfair heading replaces the mono question", () => {
    expect(pane, "the eyebrow came back").not.toContain("Who are you querying?");
    expect(pane).toContain('<h2 className="qc-head">Logging new query</h2>');
    const head = block(".qc-head");
    expect(head, "the .qc-head rule is missing").not.toBe("");
    expect(head, "the heading must be the serif, not the body face").toContain("var(--f12-serif)");
  });

  it("'Agent' is now an ordinary field label, and the search + add-an-agent route survive", () => {
    expect(pane).toContain("<div style={LABEL}>Agent</div>");
    expect(pane, "the picker itself must not be rebuilt").toContain("AgentSearchField");
    expect(pane).toContain("onCreateAgent");
  });
});
