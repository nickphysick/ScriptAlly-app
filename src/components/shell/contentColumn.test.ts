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
  it("workspace hubs declare their width kind; the BAND-TIER pages cap their own content instead", () => {
    // Queries (and, from Stage 4, Agents) render the F12 shell — their own full-bleed header
    // + centred --maxw column — so their slots carry NO contentVariant.
    expect(app).not.toMatch(/routeKey === "queries"[^>]*contentVariant/s);
    /* ⚠️ RETARGETED, NOT RELAXED (band-tier full-bleed pass). This previously asserted
       `manuscripts … contentVariant="read"`. The cap did NOT go away — it moved INWARD, off the
       route slot and onto each page's own content column, because a cap on the SLOT wraps the page
       HEADER too and the header is chrome: its rule has to span the window rather than stop at a
       1200px column. The assertion still pins a real invariant, and a stronger one — the slot must
       NOT cap, and the pages MUST, which is what `pageBandBleed.test.ts` enforces on the other side.
       Import keeps its slot cap: it is not band-tier and still mounts the compact header. */
    expect(app).not.toMatch(/routeKey === "manuscripts"[^>]*contentVariant/s);
    expect(app).not.toMatch(/agentsDiscover}\s+layout="fillColumn"[^>]*contentVariant/s);
    expect(app).toContain('<StagePage active contentVariant="read"><ImportCsv');
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
  it("manuscripts .msv-wrap carries the ONE cap — tied to the read token, never the old bespoke 1150", () => {
    expect(msv, "the bespoke 1150px cap came back — it is a third value that agrees with neither the read cap nor the gutter").not.toContain("max-width: 1150px");
    /* ⚠️ RETARGETED AGAIN, AND UP A LEVEL (amendment 9). The cap was on `.msv-wrap`; it is on the
       GRID ROOT now, where it governs the plate, the toolbar and the shelf at once — so the three
       cannot disagree, which capping only the content could never guarantee. Still the same
       expression: the read cap minus this page's own gutter, never a literal. */
    expect(
      msv,
      "the content cap left the grid root — nothing else caps now, and the shelf plus its chrome stretch the full width of an ultrawide monitor",
    ).toMatch(/\.msv-wpg\s*\{[^}]*max-width:\s*calc\(var\(--content-max-read\) - 2 \* var\(--pg-gut\)\)/s);
    expect(msv, "the capped column stopped centring").toMatch(/\.msv-wpg\s*\{[^}]*margin-inline:\s*auto/s);
  });
});
