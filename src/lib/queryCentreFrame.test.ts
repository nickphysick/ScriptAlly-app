/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre · P1 — the page frame and the strict viewport fit
 * (ref design-refs/query-centre-final.html).
 *
 * jsdom has no layout, so the fit itself is a browser measurement (recorded in the commit): at
 * 1440×800 the page does not scroll, the document does not scroll, and the list rows and column
 * bodies do. What IS testable here is that the mechanism nobody should "simplify" stays intact.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const wsCss = read("../components/shell/workspaceShell.css");
const shell = read("../components/shell/WorkspaceShell.tsx");
const appShell = read("../components/shell/AppShell.tsx");
const f12 = read("../components/shell/f12.css");

const rule = (sheet: string, selector: string): string => {
  const at = sheet.indexOf("\n" + selector + " {");
  return at < 0 ? "" : sheet.slice(at, sheet.indexOf("}", at) + 1);
};

describe("the fit modifier is opt-in and every other page is untouched", () => {
  it("the prop defaults to false, so an absent prop renders the base class alone", () => {
    expect(shell).toContain("fit = false");
    expect(shell).toContain('className={`ws-work${fit ? " ws-work--fit" : ""}`}');
  });

  it("only the Query Centre route asks for it", () => {
    expect(appShell).toContain('fit={routeKey === "queries"}');
  });

  it("the base .ws-work rule is unchanged — the modifier is additive", () => {
    expect(rule(wsCss, ".ws-work")).toContain("flex: 1 0 auto");
  });
});

describe("⚠️ the modifier changes flex, not just min-height — and that is the whole point", () => {
  /* MEASURED at a 720px viewport with a tall page: as-built 2345px, and 2345px AGAIN with
     min-height:0 added — the shell scrolled both times and the page's own regions never did,
     because `flex-shrink: 0` on the base rule means min-height is never consulted. Only the
     definite basis fixed it (634px, page scroll gone, internal scrolling live). */
  it("it sets a definite basis, not min-height alone", () => {
    const fit = rule(wsCss, ".ws-work--fit");
    expect(fit, "the modifier is missing").not.toBe("");
    expect(fit, "min-height alone does nothing here — see the comment above the rule").toContain("flex: 1 1 0");
    expect(fit).toContain("min-height: 0");
  });

  it("the reason is written on the rule, so nobody simplifies it back", () => {
    const at = wsCss.indexOf(".ws-work--fit");
    const comment = wsCss.slice(Math.max(0, at - 900), at);
    expect(comment).toContain("flex-shrink: 0");
    expect(comment).toContain("2345px");
  });
});

describe("the workspace frame", () => {
  it("is ONE hairline around list and pane together — no fill, no shadow", () => {
    const body = rule(f12, ".f12-body");
    expect(body, "the .f12-body rule is missing").not.toBe("");
    expect(body).toContain("border: 1px solid var(--line)");
    expect(body).toContain("border-radius: 18px");
    expect(body, "the frame must not paint a second surface").not.toContain("background:");
    expect(body, "hairline only — a shadow would make it a card inside a card").not.toContain("box-shadow");
  });

  /* The frame's OUTER edge is the header's INNER edge — browser-measured at 1440×800: frame
     left 99 = title left 99, frame right 1339 = buttons right 1339, both deltas 0. It reads the
     header's own column tokens, so the two track each other at every breakpoint (including the
     narrow step where --sa-col-gut drops to 16px) instead of being kept in step by hand. */
  it("aligns to the header grid structurally, not by a matched number", () => {
    const body = rule(f12, ".f12-body");
    expect(body, "the frame is back on its own width system").not.toContain("var(--maxw)");
    expect(body).toContain("max-width: var(--sa-col-max)");
    expect(body).toContain("width: calc(100% - 2 * var(--sa-col-gut))");
  });

  it("the vertical rhythm is untouched by the inset", () => {
    expect(rule(f12, ".f12-body")).toContain("margin: 22px auto 26px");
    expect(rule(f12, ".f12-body")).toContain("padding: 20px 22px");
  });

  it("the fit chain runs the whole way down", () => {
    expect(rule(f12, ".f12-body")).toContain("min-height: 0");
    expect(rule(f12, ".f12-rows")).toContain("overflow-y: auto");
    expect(rule(f12, ".f12-rows")).toContain("min-height: 0");
  });
});
