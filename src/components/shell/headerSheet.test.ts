/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * App shell v2 — the source half of the header sheet's locks. What a file can state: which routes
 * have a sheet, that the tokens are declared once at the pack's values, and that every reader names
 * the token rather than a literal. Where anything ENDS UP is tests/e2e/shellV2.measure.ts (SH2).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { hasHeaderSheet, NO_HEADER_SHEET_ROUTES } from "./headerSheetRoutes";

const read = (p: string) => readFileSync(p, "utf8");
const decls = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "");

describe("which routes have a header sheet", () => {
  it("every page-header route has one; the dashboard, the settings chassis and the band header do not", () => {
    for (const r of ["/queries", "/agents", "/agents/discover", "/manuscripts", "/manuscripts/comps", "/manuscripts/packages", "/todo", "/todo/calendar", "/todo/noteboard", "/import", "/plans", "/help"]) expect(hasHeaderSheet(r), r).toBe(true);
    for (const r of ["/dashboard", "/account", "/account/profile", "/account/security", "/queries/analytics"]) expect(hasHeaderSheet(r), r).toBe(false);
  });
  it("a listed route excludes its sub-routes and nothing that merely starts with its letters", () => {
    expect(NO_HEADER_SHEET_ROUTES).toEqual(["/dashboard", "/account", "/queries/analytics"]);
    expect(hasHeaderSheet("/accounting")).toBe(true);
  });
});

describe("the tokens", () => {
  const idx = decls(read("src/index.css"));
  it("oat, the sheet and the band are declared once, at the pack's values", () => {
    expect(idx.match(/--ws-page-rgb:\s*242, 238, 232;/g)?.length).toBe(1);
    expect(idx.match(/--ws-sheet:\s*#fbf9f5;/g)?.length).toBe(1);
    expect(idx.match(/--ws-band:\s*#fbf9f5;/g)?.length).toBe(1);
  });
  it("the route-level redeclaration states the same page colour", () => {
    expect(decls(read("src/components/shell/workspaceShell.css"))).toMatch(/\.dash-mode \.ws-main, \.ground-mode \.ws-main \{ --ws-page-rgb: 242, 238, 232;/);
  });
  it("the tab and its fillet read --ink-tab, which is the sheet's colour only in sheet-mode", () => {
    const ink = decls(read("src/components/shell/inkShell.css"));
    expect(ink).toMatch(/\.ws-main \{ --ink-tab: var\(--ink-sheet\); \}/);
    expect(ink).toMatch(/\.ws-app\.sheet-mode \.ws-main \{ --ink-tab: var\(--ws-sheet\); \}/);
    expect(ink).toMatch(/\.ws-ftab \{[^}]*background: var\(--ink-tab\);/);
    expect(ink).toMatch(/\.ws-ftfl \{[^}]*fill: var\(--ink-tab\);/);
    /* the page sheet itself is still the page's colour */
    expect(ink).toMatch(/\.ws-window \{[^}]*background: var\(--ink-sheet\);/);
  });
});

describe("the sheet's own stylesheet", () => {
  const css = decls(read("src/components/shell/headerSheet.css"));
  it("every --hsheet token it or a banner reads is declared in it", () => {
    const sheets = [css, ...["src/components/agents/contact/contactV15.css", "src/components/queries/centre/qcvBand134.css", "src/components/manuscripts/v12/msv21.css"].map((p) => decls(read(p)))];
    const readTokens = new Set(sheets.flatMap((s) => [...s.matchAll(/var\((--hsheet-[a-z-]+)/g)].map((m) => m[1])));
    expect(readTokens.size).toBeGreaterThanOrEqual(3);
    for (const t of readTokens) expect(css, t).toMatch(new RegExp(`${t}:`));
  });
  it("the shadow is a filter on the outer element and the clip is on the inner one", () => {
    expect(css).toMatch(/\.hsheet \{[^}]*filter: drop-shadow\(0 12px 12px rgba\(28, 19, 15, 0\.12\)\);/);
    expect(css).toMatch(/\.hsheet > i \{[^}]*clip-path: var\(--hsheet-clip\);/);
    expect(css).not.toMatch(/\.hsheet > i \{[^}]*filter:/);
  });
});

describe("bands and banners read the tokens", () => {
  const files = ["src/components/agents/contact/contactV14.css", "src/components/agents/contact/contactV15.css", "src/components/queries/centre/qcvBand134.css", "src/components/manuscripts/v12/msv21.css"];
  it("no band states #e9e6e0 and no banner keeps an arrow", () => {
    for (const f of files) {
      const s = decls(read(f));
      expect(s, f).not.toMatch(/#e9e6e0/i);
      expect(s, f).not.toMatch(/-ban::after/);
    }
  });
  it("each banner's tint layer is the page sheet's width, clipped to the flap, with no shadow of its own", () => {
    for (const [f, sel] of [[files[1], ".cl15-ban::before"], [files[2], ".qc134-ban::before"], [files[3], ".ms21-ban::before"]] as const) {
      const s = decls(read(f)); const i = s.indexOf(`${sel} {`);
      expect(i, `${f}: ${sel}`).toBeGreaterThan(-1);
      const rule = s.slice(i, s.indexOf("}", i));
      expect(rule, sel).toContain("width: var(--hsheet-w)");
      expect(rule, sel).toContain("clip-path: var(--hsheet-clip)");
      expect(rule, sel).not.toMatch(/box-shadow|filter/);
    }
  });
});
