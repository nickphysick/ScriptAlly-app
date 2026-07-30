/**
 * Mobile chrome kit locks (Mobile Pass 1, Phase 1; ref design-refs/mobile-concept-v1.html).
 *
 * jsdom does not exist in this repo (node env), so these are structure/source locks in the
 * house idiom: string-render the pure components, and readFileSync the CSS/TSX for the rules a
 * render can't show. Every slice asserts its anchor first (the string-spec slice law). Layout
 * itself — dvh behaviour, safe areas, the sheet's slide — is a phone check, listed in the
 * run report's walk checklist.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { BottomTabBar } from "../BottomTabBar";

const css = readFileSync(resolve(__dirname, "./mobileShell.css"), "utf8");
const shellCss = readFileSync(resolve(__dirname, "./shellV2.css"), "utf8");
const appShell = readFileSync(resolve(__dirname, "./AppShell.tsx"), "utf8");
const sheetSrc = readFileSync(resolve(__dirname, "./MobileSheet.tsx"), "utf8");
const barSrc = readFileSync(resolve(__dirname, "../BottomTabBar.tsx"), "utf8");

describe("the tab bar — a floating capsule with the nav active law", () => {
  it("renders four tabs (Home · Queries · Agents · Scripts), route-driven active", () => {
    const html = renderToStaticMarkup(<BottomTabBar activeTab="queries" onNavigate={() => {}} />);
    expect(html).toContain("sa-mtabbar");
    for (const label of ["Home", "Queries", "Agents", "Scripts"]) expect(html).toContain(`<span>${label}</span>`);
    expect(html).toContain('aria-current="page"');
    // To-do has NO tab (baked decision 2) — reached via the desk line and the you-menu
    expect(html).not.toContain("To-do");
  });

  it("stands down on pushed detail screens, and on off-tab routes lights nothing", () => {
    expect(renderToStaticMarkup(<BottomTabBar activeTab="queries" onNavigate={() => {}} hidden />)).toBe("");
    const offTab = renderToStaticMarkup(<BottomTabBar activeTab="todo" onNavigate={() => {}} />);
    expect(offTab).toContain("sa-mtabbar");
    expect(offTab).not.toContain('aria-current="page"');
  });

  it("floats as its own capsule — inset from the edges, capsule border/radius/shadow, safe area", () => {
    expect(css).toContain(".sa-mtabbar {");
    const bar = css.split("@media (max-width: 767.98px)")[1]?.match(/\.sa-mtabbar \{([^}]*)\}/s)?.[1] ?? "";
    expect(bar, "the <md .sa-mtabbar rule must exist").not.toBe("");
    expect(bar).toContain("left: 12px");
    expect(bar).toContain("right: 12px");
    expect(bar).toContain("bottom: calc(14px + env(safe-area-inset-bottom))");
    expect(bar).toContain("border: var(--shell-cap-border)");
    expect(bar).toContain("border-radius: var(--shell-cap-radius)");
    expect(bar).toContain("box-shadow: var(--shell-cap-shadow)");
    expect(bar).toContain("background: var(--shell-side)");
  });

  it("THE NAV ACTIVE LAW — ground-fill pill, ink text; never burgundy, never pink", () => {
    expect(css).toContain(".sa-mtab.on");
    const on = css.match(/\.sa-mtab\.on \{([^}]*)\}/s)?.[1] ?? "";
    expect(on, "the active rule must exist").not.toBe("");
    expect(on).toContain("background: var(--shell-ground)");
    expect(on).toContain("color: var(--shell-ink)");
    // and the component carries no colour of its own (the old inline pink/burgundy bar is gone)
    expect(barSrc).not.toContain("#f5e2da");
    expect(barSrc).not.toContain("designTokens");
    expect(barSrc).not.toContain("style={{");
  });
});

describe("the sheet chassis — one bottom sheet for every mobile fork", () => {
  it("locks both scroll containers and dismisses on Escape + scrim tap", () => {
    expect(sheetSrc).toContain("lockStageScroll()");
    expect(sheetSrc).toContain('document.body.style.overflow = "hidden"');
    expect(sheetSrc).toContain('e.key === "Escape"');
    expect(sheetSrc).toContain('className="sa-msheet-scrim" onClick={onClose}');
  });

  it("capsule surface: canvas fill, capsule border + top radius token, safe-area foot, dvh cap", () => {
    expect(css).toContain(".sa-msheet {");
    const sheet = css.match(/\n\.sa-msheet \{([^}]*)\}/s)?.[1] ?? "";
    expect(sheet, "the .sa-msheet rule must exist").not.toBe("");
    expect(sheet).toContain("background: var(--shell-canvas)");
    expect(sheet).toContain("border: var(--shell-cap-border)");
    expect(sheet).toContain("border-radius: var(--shell-cap-radius) var(--shell-cap-radius) 0 0");
    expect(sheet).toContain("max-height: calc(100vh - 48px)"); // the fallback precedes…
    expect(sheet).toContain("max-height: calc(100dvh - 48px)"); // …the dvh value (viewport law)
    expect(css).toContain("padding-bottom: calc(24px + env(safe-area-inset-bottom))");
  });

  it("entry is pure CSS and reduced motion turns it off", () => {
    expect(css).toContain("animation: saMsheetUp");
    expect(css).toContain("@keyframes saMsheetUp");
    const rm = css.match(/@media \(prefers-reduced-motion: reduce\) \{([^}]*\}[^}]*)\}/s)?.[1] ?? "";
    expect(rm, "the reduced-motion block must exist").not.toBe("");
    expect(rm).toContain(".sa-msheet");
    expect(rm).toContain("animation: none");
    // no JS timers drive motion — close is an unmount
    expect(sheetSrc).not.toContain("setTimeout");
  });
});

describe("the shell at <md — one bar, one capsule, derived clearance", () => {
  it("the slim Nav is retired; the v2 bar is the only top bar", () => {
    expect(appShell).not.toContain("<Nav ");
    expect(appShell).not.toContain('from "../Nav"');
    expect(appShell).toContain("mobileDetail={activeMobileDetail}");
  });

  it("stage clearance derives from the floating bar (replacing pb-[76px]), <md only", () => {
    expect(appShell).toContain('className="sv2-stagepad"');
    expect(appShell).not.toContain('className="pb-[76px]'); // the old Tailwind clearance is gone from the stage
    const mobileBlock = css.split("@media (max-width: 767.98px)")[1] ?? "";
    expect(mobileBlock, "the <md block must exist").not.toBe("");
    expect(mobileBlock).toContain(".sv2-stagepad { padding-bottom: calc(100px + env(safe-area-inset-bottom)); }");
    // and OUTSIDE the media block the class pads nothing (md+ is pixel-identical)
    const beforeMedia = css.split("@media (max-width: 767.98px)")[0];
    expect(beforeMedia).not.toContain(".sv2-stagepad");
  });

  it("the viewport law: 100vh base moves to the class, dvh overrides below md", () => {
    expect(shellCss).toContain(".sv2-app { display: flex; height: 100vh; overflow: hidden; }");
    const mobileBlock = css.split("@media (max-width: 767.98px)")[1] ?? "";
    expect(mobileBlock).toContain(".sv2-app { height: 100vh; height: 100dvh; }");
    // the locked desktop capsule rule is untouched, byte for byte
    expect(shellCss).toContain(".sv2-app { padding: var(--shell-cap-gap); gap: var(--shell-cap-gap); }");
  });

  it("the content capsule at <md: full-bleed, squared foot, no bottom border", () => {
    const mobileBlock = css.split("@media (max-width: 767.98px)")[1] ?? "";
    const wrap = mobileBlock.match(/\.sv2-pgwrap \{([^}]*)\}/s)?.[1] ?? "";
    expect(wrap, "the <md .sv2-pgwrap rule must exist").not.toBe("");
    expect(wrap).toContain("border-bottom: none");
    expect(wrap).toContain("border-radius: var(--shell-cap-radius) var(--shell-cap-radius) 0 0");
    expect(wrap).toContain("background: var(--shell-canvas)");
  });
});

describe("the app-feel layer (Phase 6)", () => {
  it("the manifest is standalone with the token colours, and index.html links it", () => {
    const manifest = JSON.parse(readFileSync(resolve(__dirname, "../../../public/manifest.webmanifest"), "utf8"));
    expect(manifest.display).toBe("standalone");
    expect(manifest.theme_color).toBe("#e7e0d5"); // --shell-ground
    expect(manifest.background_color).toBe("#fdfbf8"); // --shell-canvas
    expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(
      expect.arrayContaining(["192x192", "512x512"]),
    );
    const html = readFileSync(resolve(__dirname, "../../../index.html"), "utf8");
    expect(html).toContain('rel="manifest" href="/manifest.webmanifest"');
    expect(html).toContain('name="theme-color" content="#e7e0d5"');
    expect(html).toContain("viewport-fit=cover");
  });

  it("the ≥16px input floor and scroll containment are <md-scoped", () => {
    const mobileBlocks = css.split("@media (max-width: 767.98px)");
    expect(mobileBlocks.length, "the <md blocks must exist").toBeGreaterThan(2);
    const appFeel = mobileBlocks[mobileBlocks.length - 1];
    expect(appFeel).toContain("font-size: 16px !important");
    expect(appFeel).toContain("overscroll-behavior: contain");
    expect(appFeel).toContain("#app-stage-scroll");
    expect(appFeel).toContain(".sa-msheet-body");
    expect(css).toContain("-webkit-tap-highlight-color: transparent");
  });
});

describe("the you-menu — demoted destinations behind the avatar", () => {
  it("carries the six rows and the plain-slate plan line (no Pro card)", () => {
    for (const row of ["To-do", "Submission packages", "Import your queries", "Account settings", "Help", "Sign out"]) {
      expect(appShell).toContain(row);
    }
    expect(appShell).toContain("planLine(currentUser.plan).label");
    expect(appShell).toContain("sa-ymenu-uplink");
    // plain slate text — never a pill, never a fill
    expect(css).toContain(".sa-ymenu-plan { font-size: 12px; font-weight: 600; color: var(--slate)");
  });
});
