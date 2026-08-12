/**
 * Locks for the content max-width caps (ultrawide; ref maxwidth-ultrawide-v1.html). Artefact-level
 * — jsdom can't lay out (getBoundingClientRect is 0, no cascade), so the true centring/caps are a
 * browser check; these assert the source contract: the tokens, the one wrapper, the route wiring,
 * the rail-outside-the-cap structure, and that no workspace page keeps a competing page-level cap.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(__dirname, "contentColumn.css"), "utf8");
const shell = readFileSync(resolve(__dirname, "AppShell.tsx"), "utf8");
const app = readFileSync(resolve(__dirname, "../../App.tsx"), "utf8");
const msv = readFileSync(resolve(__dirname, "../manuscripts/manuscripts.css"), "utf8");

describe("content-column tokens + wrapper", () => {
  it("defines the two caps as tokens (work 1600 / read 1200)", () => {
    expect(css).toContain("--content-max-work: 1600px");
    expect(css).toContain("--content-max-read: 1200px");
  });

  it("the wrapper caps + true-centres (margin-inline:auto), variants read the tokens", () => {
    expect(css).toMatch(/\.sa-content-col\s*\{[^}]*margin-inline:\s*auto/s);
    expect(css).toContain("max-width: var(--content-max-work)");
    expect(css).toContain("max-width: var(--content-max-read)");
  });

  it("the fill variant passes height through so viewport-locked pages still scroll internally", () => {
    expect(css).toMatch(/\.sa-content-col--fill\s*\{[^}]*height:\s*100%/s);
  });
});

describe("StagePage — the ONE wrapper (not scattered per page)", () => {
  it("takes a contentVariant and wraps children in the capped column — the slot paints NOTHING (canvas scheme 1: the stage owns the ground)", () => {
    expect(shell).toContain("contentVariant?: \"work\" | \"read\"");
    expect(shell).toContain("sa-content-col sa-content-col--${contentVariant}");
    expect(shell.includes('background: "var(--desk)"')).toBe(false);
    /* ⚠️ --shell-canvas → #ffffff (shell-rebuild Phase 3). The old canvas was the third capsule
       of a stepped cream trio; the rebuild's content capsule is white in both mockups
       (`--work:#ffffff`). Still painted ONCE, on the stage — that half of the rule is unchanged,
       and it is the half that matters: no page sets a bespoke ground. */
    /* ⚠️ THE STAGE NO LONGER PAINTS (refinement §4) — it moved into the card, and the CARD is
       white. The rule that mattered was "painted once, never per page", and that still holds:
       ⚠️ RETARGETED (app-shell-v2): the ground is `--ws-ground` on `.ws-app`/`.ws-main` now, and
       the white surface is `.ws-window` — `.ws-card` is retired. The RULE is unchanged and is the
       point of this lock: no page paints its own ground. */
    const wsCss = readFileSync(resolve(__dirname, "./workspaceShell.css"), "utf8");
    expect(wsCss).toMatch(/\.ws-window \{[^}]*background: #ffffff/s);
    expect(shell.includes('background: "var(--shell-canvas)"')).toBe(false);
  });

  it("nav chrome is OUTSIDE the cap — the shell column flanks the content column, never wrapped", () => {
    // Shell-rebuild Phase 3: the one expanding column became the DOUBLE-DECKER, still a sibling
    // of the content column — so no nav chrome can inherit the max-width. The cap wrapper lives
    // only inside StagePage.
    expect(shell.includes("<NavDrawer")).toBe(false); // the drawer is gone
    expect(shell).toContain("<WorkspaceShell");
    expect(shell).not.toContain("<ShellColumn"); // superseded by the double-decker
    expect(shell).not.toContain("<ShellRail");
    expect(shell).not.toContain("<ShellSide");
    expect(shell.slice(0, shell.indexOf("StagePage")).includes("sa-content-col")).toBe(false);
  });
});

describe("route variants — declared once at the mount", () => {
  /**
   * ⚠️ REVERSED: NO GRID ROUTE DECLARES A WIDTH KIND (header spec §1). `contentVariant` puts a cap
   * — `work` 1600 or `read` 1200 — on the route SLOT, which is an ANCESTOR of the page and
   * therefore of the whole grid, so it capped the header, the toolbar and the scroller together
   * and centred the result. Measured at 2400px against the built stylesheet before this changed:
   *
   *     Contact list (no variant)  header 2000  scroller 2400   ← the two tokens, correct
   *     Discover     (`work`)      header 1200  scroller 1600
   *     Manuscripts  (`read`)      header  800  scroller 1200
   *     Analytics    (`read` +30)  header  740  scroller 1140
   *
   * Four regimes across six pages that share two tokens, and the page-CSS width lock passed all
   * four — it reads page stylesheets, and this constraint is in App.tsx.
   *
   * ⚠️ IMPORT KEEPS ITS `read`, and that is not an oversight: it is out of the header spec's scope
   * and still on the compact slab, so its cap is the only thing giving it a column.
   */
  it("no grid route declares a width kind — the caps are the grid's job now", () => {
    for (const route of ['routeKey === "queries"', 'routeKey === "manuscripts"', 'routeKey === "agents"', "active={queriesAnalytics}"]) {
      const at = app.indexOf(route);
      expect(at, `${route} is not mounted here any more — this assertion is vacuous`).toBeGreaterThan(-1);
      const slot = app.slice(at, app.indexOf(">", at));
      expect(slot, `${route} still declares a contentVariant — it caps the header, toolbar and scroller together, from an ancestor no page stylesheet can see`)
        .not.toContain("contentVariant");
    }
    expect(app, "Import lost its cap — it is out of scope for the header spec and the cap is what gives it a column")
      .toContain('<StagePage active contentVariant="read"><ImportCsv');
  });

  it("the dashboard stays exempt (no contentVariant on its slot)", () => {
    const dashSlot = app.slice(app.indexOf('routeKey === "dashboard"'), app.indexOf("</StagePage>", app.indexOf('routeKey === "dashboard"')));
    expect(dashSlot).not.toContain("contentVariant");
  });
});

describe("no competing per-page cap survives (folded into the wrapper)", () => {
  /**
   * ⚠️ RETARGETED, NOT RELAXED, AND IT REVERSES DIRECTION — say so plainly rather than let the diff
   * read as a lock being dropped. This asserted `.msv-wrap { width: 100%; }`: the page's cap had been
   * folded UP into the route slot's `contentVariant`, so a page-level cap would have been a second,
   * competing one. The band-tier full-bleed pass moved the cap back DOWN, because a cap on the slot
   * wraps the page HEADER too and the header is chrome — its rule must span the window.
   *
   * ⚠️ SO THE THING BEING GUARDED IS UNCHANGED: there must be exactly ONE cap. What moved is WHERE
   * the one lives. The old bespoke 1150px must still never come back — that was a THIRD value, and
   * the assertion against it is kept verbatim.
   */
  it("manuscripts states NO cap and NO gutter — both are the grid's now", () => {
    /* ⚠️ THE ONE-CAP RULE IS RETIRED, NOT MOVED AGAIN (header spec §1). This lock has been
       retargeted three times as the single cap travelled — `.msv-wrap` → the route slot → the grid
       root — and each move kept the same premise: that somewhere there is exactly one maximum
       width. There is now none. Content is the window minus `--content-gutter`, stated once on the
       grid's three rows, so a page that names any width at all is the fault.
       ⚠️ THE BESPOKE 1150 ASSERTION IS KEPT VERBATIM. It was a THIRD value agreeing with neither
       the cap nor the gutter, and it is exactly the kind of number that comes back when the rule
       above it changes shape. */
    expect(msv, "the bespoke 1150px cap came back — a page-local width, which is the fault this rule has always been about").not.toContain("max-width: 1150px");
    expect(msv, "manuscripts declared --wpg-cap again — the cap token is retired app-wide").not.toContain("--wpg-cap");
    expect(msv, "manuscripts declared a gutter of its own — the gutter is declared once, on :root").not.toMatch(/--pg-gut:/);
    expect(msv, "the content column took a width again — it must fill the guttered scroll row").toContain(".msv-wrap { width: 100%; }");
  });
});
