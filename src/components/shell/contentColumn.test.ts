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
  it("takes a contentVariant, wraps children in the capped column, paints the desk in the margins", () => {
    expect(shell).toContain("contentVariant?: \"work\" | \"read\"");
    expect(shell).toContain("sa-content-col sa-content-col--${contentVariant}");
    expect(shell).toContain('background: "var(--desk)"');
  });

  it("nav chrome is OUTSIDE the cap — the rail is retired and the drawer overlays, never wrapped", () => {
    // The persistent rail was retired (overnight nav run): the content column is the flex root's
    // first child, and navigation is the fixed-position NavDrawer overlay — so no nav chrome can
    // inherit the max-width. The cap wrapper lives only inside StagePage.
    expect(shell.includes("<Rail ")).toBe(false); // the in-flow rail is gone
    expect(shell).toContain("<NavDrawer"); // the drawer overlay replaces it
    expect(shell).toContain("flex: 1, minWidth: 0, minHeight: 0, display: \"flex\"");
    expect(shell.slice(0, shell.indexOf("StagePage")).includes("sa-content-col")).toBe(false);
  });
});

describe("route variants — declared once at the mount", () => {
  it("workspace hubs declare their width kind; the F12 pages self-chrome (no cap)", () => {
    // Queries (and, from Stage 4, Agents) render the F12 shell — their own full-bleed header
    // + centred --maxw column — so their slots carry NO contentVariant. Other routes keep theirs.
    expect(app).not.toMatch(/routeKey === "queries"[^>]*contentVariant/s);
    expect(app).toMatch(/routeKey === "manuscripts"[^>]*contentVariant="read"/s);
    expect(app).toContain('<StagePage active contentVariant="read"><ImportCsv');
  });

  it("the dashboard stays exempt (no contentVariant on its slot)", () => {
    const dashSlot = app.slice(app.indexOf('routeKey === "dashboard"'), app.indexOf("</StagePage>", app.indexOf('routeKey === "dashboard"')));
    expect(dashSlot).not.toContain("contentVariant");
  });
});

describe("no competing per-page cap survives (folded into the wrapper)", () => {
  it("manuscripts .msv-wrap no longer sets its own max-width", () => {
    expect(msv).not.toContain(".msv-wrap { max-width: 1150px");
    expect(msv).toContain(".msv-wrap { width: 100%; }");
  });
});
