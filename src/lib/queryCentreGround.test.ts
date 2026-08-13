/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre · THE GROUND IS WHITE (ref design-refs/query-centre-final.html).
 *
 * ⚠️ THE PAINTER WAS AN INLINE HEX IN JSX, not a stylesheet rule or a theme token, which is why
 * two passes hunting through CSS and tokens missed it: `background: "#faf5ee"` on
 * #queries-main-panel-container — the wrapper around the header, the frame, the list AND the
 * pane. An inline style matches no token grep and outranks every rule.
 *
 * Verified in a browser against the real shipped CSS with the real class chain: every element
 * from .ws-card down to the frame's children computes to rgb(255,255,255) or rgba(0,0,0,0).
 * The lock below guards the source so it cannot be reintroduced.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const queries = read("../components/Queries.tsx");
const css = read("../components/shell/f12.css");
/** Comments stripped — an assertion about the code must not match the prose explaining it. */
const code = queries.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "");

describe("no container between the sheet and the cards paints a ground", () => {
  it("the main panel container carries NO background", () => {
    const at = code.indexOf('id="queries-main-panel-container"');
    expect(at, "the container is gone — this lock needs re-anchoring").toBeGreaterThan(-1);
    const style = code.slice(code.lastIndexOf("style={{", at), at);
    expect(style, "the cream ground came back").not.toContain("background");
  });

  it("no cream hex survives anywhere in the page's code", () => {
    for (const cream of ["#faf5ee", "#FAF5EE", "#f7f3ec", "#faf6f0"]) {
      expect(code, `a cream ground (${cream}) was reintroduced`).not.toContain(cream);
    }
  });

  /* ⚠️ THE FRAME IS GONE (flatten §1); what this case still protects is the GROUND — nothing
     between the sheet and the cards may paint one, and that now includes the element that used to
     draw the hairline over it. */
  it("nothing is drawn over that white at all", () => {
    const at = css.indexOf("\n.f12-body {");
    const rule = css.slice(at, css.indexOf("}", at)).replace(/\/\*[\s\S]*?\*\//g, "");
    expect(rule, "the frame came back").not.toContain("border:");
    expect(rule, "the working area must never gain a fill").not.toContain("background:");
  });

  it("the page root paints nothing either", () => {
    const at = css.indexOf("\n.f12-root {");
    expect(css.slice(at, css.indexOf("}", at))).not.toContain("background:");
  });
});

describe("the theme system is NOT the painter (checked, not assumed)", () => {
  it("the tinted desk tokens are read nowhere on this page", () => {
    for (const token of ["var(--desk)", "var(--hub-desk)"]) {
      expect(queries, `${token} reaches the Query Centre`).not.toContain(token);
      expect(css, `${token} reaches the Query Centre`).not.toContain(token);
    }
  });

  it("the injected dev-theme block styles legacy utilities only — no container ground", () => {
    const at = code.indexOf(".queries-container-theme");
    expect(at).toBeGreaterThan(-1);
    // every themed selector is an escaped Tailwind arbitrary class, never a layout container
    expect(code, "the theme block started painting a container").not.toMatch(
      /\.queries-container-theme\s*\{[^}]*background/,
    );
  });
});
