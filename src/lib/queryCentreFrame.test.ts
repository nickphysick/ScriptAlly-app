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

  /* ⚠️ TWO ROUTES NOW — Query Centre and the dashboard. Both are FIXED-VIEWPORT pages that fill
     their slot exactly and scroll internally; the dashboard joined when its own JS height-lock
     was deleted in favour of the flex chain. It stays an OPT-IN list, not a default: every other
     page needs the growing wrapper the sticky frosted bar depends on. */
  it("fixed-viewport routes opt in by name — Query Centre and the dashboard among them", () => {
    const fit = /fit=\{([^}]*)\}/.exec(appShell)?.[1] ?? "";
    expect(fit, "the fit expression must exist").not.toBe("");
    expect(fit).toContain('routeKey === "queries"');
    expect(fit).toContain('routeKey === "dashboard"');
    /* ⚠️ still a NAMED LIST, never a default — every other page needs the growing wrapper the
       sticky frosted bar depends on. Routes may join; `true` may not. */
    expect(fit).toContain("routeKey ===");
    expect(appShell).not.toContain("fit={true}");
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

  /* The frame insets by exactly one --sa-col-gut a side, at EVERY width — the same token the
     header pads by, so the two track each other through the narrow step (where the gutter drops
     to 16px) instead of being kept in step by hand.
     ⚠️ IT MUST NOT CAP. It briefly carried `max-width: var(--sa-col-max)` to align with the
     title, which worked and cost the margin: capped-and-centred, the inset is half the surplus,
     so it read 60px at a 1026px sheet, 87px at 1414 and ~230px at 1700 — browser-measured
     against the built CSS. Alignment holds only while the sheet is under the header's own
     1360px cap (measured deltas: 0 at 1026, 27px at 1414, 170px at 1700). A constant margin was
     the choice; do not reinstate the cap to recover the alignment without re-taking that call. */
  it("insets by one gutter at every width, and never caps", () => {
    const body = rule(f12, ".f12-body");
    expect(body, "the frame is back on its own width system").not.toContain("var(--maxw)");
    expect(body, "a cap makes the margin grow with the window").not.toContain("max-width:");
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
