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

  /* ⚠️ THE FRAME STATES NO INSET OF ITS OWN, AND THAT REVERSES THIS CASE'S WHOLE PREMISE. It read
     "insets by exactly one --sa-col-gut a side, at EVERY width — the same token the header pads
     by, so the two track each other" — which was true of the token and false of the result. The
     page lives inside `.wpg-scroll`, which already carries `padding-inline: var(--content-gutter)`
     on all ten pages, so a second inset here put Query Centre's working area 80px narrower a side
     than every other page's. Naming the shared token is not the same as sharing the gutter.
     The tracking the old note wanted is now structural: the header row and this frame are children
     of the same padded row, so they share an edge without either stating a number.
     ⚠️ NO CAP, unchanged — a cap makes the margin a share of the surplus (60px at a 1026px sheet,
     ~230px at 1700, browser-measured). And no AUTO MARGINS: at `width: 100%` they resolve to zero,
     so they are merely dead — but a dead auto margin is how a cap returns unnoticed, since the
     centring it needs is already in place. */
  it("fills the scroll row, states no inset of its own, and never caps", () => {
    /* ⚠️ COMMENT-STRIPPED. The rule's own explanatory note NAMES `--sa-col-gut` — it exists to say
       why the token is not read here — and the assertion matched the prose describing the retired
       token. Third time in this repo: `position: sticky` in a shell comment, `closeCreate()`
       quoted in a test, and now this. A rule about code is asserted against code. */
    const code = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, "");
    const body = code(rule(f12, ".f12-body"));
    expect(body, "the frame is back on its own width system").not.toContain("var(--maxw)");
    expect(body, "a cap makes the margin grow with the window").not.toContain("max-width:");
    expect(body, "the frame re-declared a side inset — the scroll row already pays the gutter")
      .not.toContain("--sa-col-gut");
    expect(body, "the frame stopped filling the row").toContain("width: 100%");
    expect(body, "an auto margin returned — dead at 100% width, and the seat a cap comes back into")
      .not.toContain("auto");
  });

  it("the vertical rhythm is untouched by the inset", () => {
    expect(rule(f12, ".f12-body")).toContain("margin: 22px 0 26px");
    expect(rule(f12, ".f12-body")).toContain("padding: 20px 22px");
  });

  it("the fit chain runs the whole way down", () => {
    expect(rule(f12, ".f12-body")).toContain("min-height: 0");
    expect(rule(f12, ".f12-rows")).toContain("overflow-y: auto");
    expect(rule(f12, ".f12-rows")).toContain("min-height: 0");
  });
});
