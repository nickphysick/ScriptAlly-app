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
  /**
   * ⚠️ THE FRAME IS GONE, AND THIS CASE ASSERTED ITS EXISTENCE. It read "is ONE hairline around
   * list and pane together" — a real decision at the time, and the wrong object: the working area
   * is not a thing the writer needs a boundary for. What the border actually did was frame the
   * empty space a FILL page legitimately has when its content is short (measured 373px at
   * 1440×900), turning "page with room below the content" into "broken card". Unframed, the same
   * space is simply page. The height chain is untouched.
   *
   * Asserted ABSENT rather than deleted, because a border re-added here would look like a tidy-up.
   */
  it("draws NOTHING — no border, no radius, no fill, no shadow", () => {
    /* comment-stripped: these rules explain in prose why the properties are absent */
    const code = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, "");
    const body = code(rule(f12, ".f12-body"));
    expect(body, "the .f12-body rule is missing").not.toBe("");
    expect(body, "the frame came back — it framed the empty space rather than any object").not.toContain("border:");
    expect(body, "a radius came back, which only a container has").not.toContain("border-radius");
    expect(body, "the working area must not paint a surface").not.toContain("background:");
    expect(body, "a shadow makes it a card again").not.toContain("box-shadow");
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
    /* ⚠️ NARROWED BY §1, AND IT HAD TO BE. This read `.not.toContain("auto")` across the whole
       rule, which was only ever about `margin: auto` — the seat a width cap comes back into. §1's
       `grid-template-rows: auto minmax(0, 1fr)` contains the same four letters and means something
       entirely unrelated, so the broad match would have failed on a correct row. The property is
       named now rather than the substring, which is what the case was always asserting. */
    expect(body, "an auto margin returned — dead at 100% width, and the seat a cap comes back into")
      .not.toMatch(/margin[a-z-]*:[^;]*auto/);
  });

  /* ⚠️ THE INSET WENT WITH THE FRAME. Its padding was interior space for a border that no longer
     exists, and its margin was the card's own separation from the row. Both gutters are the scroll
     row's — `--content-gutter` and `--content-top-gap`, the same tokens the other nine pages read.
     Restating either here is how this page bought a SECOND gutter twice already. */
  it("states no inset of its own — the scroll row pays both gutters", () => {
    /* comment-stripped: these rules explain in prose why the properties are absent */
    const code = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, "");
    const body = code(rule(f12, ".f12-body"));
    expect(body, "an interior padding came back — there is no hairline left for it to hold off").not.toContain("padding:");
    expect(body, "a margin came back — the row's top gap already separates this from the chrome").not.toContain("margin:");
  });

  /**
   * ⚠️ ONE RULE INSIDE THE WORKING AREA, AND IT IS THE SEAM — added, not kept. The pack said "that
   * seam stays", which assumed one existed; there was none. With the card's border gone the only
   * thing between a list column and a reading pane that scroll and select INDEPENDENTLY would be
   * 12px of air, and two independent regions need a boundary. Everything else in here is gutters
   * and the rules the masthead and toolbar already own.
   *
   * ⚠️ SYMMETRIC BY CONSTRUCTION, not by matched numbers: `--gut` of padding inside the line and
   * the row's `gap: var(--gut)` outside it, so neither side states a figure the other must track.
   */
  /**
   * ⚠️ INVERTED BY FIX PACK 6 §2 — THERE IS NO SEAM, AND THAT IS THE DIVISION WORKING. The line was
   * drawn when the list was a flush wall on a receding ground: two independently scrolling regions
   * with nothing between them but air. The list is a WHITE PANEL now, with its own rim, its own
   * radius and an inset on all four sides, so the seam became a second division doing the job the
   * rim already does. Turned round rather than deleted, so nothing quietly draws it again.
   */
  it("⚠️ ONE DIVISION, AND IT IS THE PANEL'S RIM — no seam", () => {
    const list = rule(f12, ".f12-list");
    expect(rule(f12, ".f12-body::after"), "the seam came back — beside a rimmed panel it is a second line doing one job").toBe("");
    expect(list, "the panel lost the rim that IS the division now").toContain("border: 1px solid var(--line)");
    expect(list, "the panel took a right border of its own — that is the seam by another name")
      .not.toContain("border-right");
    /* ⚠️ THE AIR MOVED TO THE CHILDREN (§1c), because a TINTED column cannot pay its own gutter as
       `padding-right`: the ground would stop short of the hairline and leave a stripe of page
       between the two. The column fills to the seam; its children carry the inset, so the air is
       still there and the tint reaches the line. */
    expect(list, "the column stopped filling to the seam").not.toContain("padding-right: var(--gut)");
    expect(rule(f12, ".f12-list > *"), "the children lost the inset — content would sit on the line")
      .toContain("padding-inline: var(--gut)");
    /* and it is the ONLY one: a border on the body or the pane would be the frame coming back */
    const body = rule(f12, ".f12-body").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(body, "the row drew a border again").not.toContain("border");
  });

  it("the fit chain runs the whole way down", () => {
    expect(rule(f12, ".f12-body")).toContain("min-height: 0");
    expect(rule(f12, ".f12-rows")).toContain("overflow-y: auto");
    expect(rule(f12, ".f12-rows")).toContain("min-height: 0");
  });
});
