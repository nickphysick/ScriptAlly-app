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
import { BottomTabBar, isMenuPage, tabFor } from "../BottomTabBar";

const css = readFileSync(resolve(__dirname, "./mobileShell.css"), "utf8");
const shellCss = readFileSync(resolve(__dirname, "./shellV2.css"), "utf8");
const appShell = readFileSync(resolve(__dirname, "./AppShell.tsx"), "utf8");
const sheetSrc = readFileSync(resolve(__dirname, "./MobileSheet.tsx"), "utf8");
const barSrc = readFileSync(resolve(__dirname, "../BottomTabBar.tsx"), "utf8");

const phoneShellCss = readFileSync(resolve(__dirname, "../phone/phoneShell.css"), "utf8");
const phoneTokens = readFileSync(resolve(__dirname, "../phone/phoneTokens.css"), "utf8");
const noop = () => {};

/* ⚠️ RE-POINTED 29 OCT (Phone app v2, Part 1B; ref design-refs/phone-app-v2/src/screens.js `tabbar()`). The Queries on
   a phone v1 bar — five equal tabs along the foot (Home · Queries · Agents · Analytics · More) with a Queries Your-move
   badge — is SUPERSEDED: a floating capsule, Home · Queries · [+] · To-do · Agents, the badge on To-do. Analytics moved
   to the menu and More's "you" sheet became the menu behind your initials. The claims below are the new bar's; where an
   old claim still holds (path-driven active, a navy pill with a white icon, no badge at zero, nothing inline) it is
   kept and re-pointed rather than dropped. The rendered measurement is tests/e2e/phoneAppV2Shell.measure.ts S1–S2. */
describe("the tab bar — a floating capsule, five slots, + in the middle (Phone app v2)", () => {
  it("renders Home · Queries · + · To-do · Agents in that order, path-driven active", () => {
    const html = renderToStaticMarkup(<BottomTabBar pathname="/queries" onGo={noop} onPlus={noop} />);
    expect(html).toContain("pa-tabbar");
    const order = [...html.matchAll(/data-tab="(\w+)"|data-pa="plus"/g)].map((m) => m[1] ?? "plus");
    expect(order).toEqual(["home", "queries", "plus", "todo", "agents"]);
    expect(html).not.toContain("Analytics");
    expect(html).not.toContain(">More<");
    expect(html.match(/aria-current="page"/g)?.length).toBe(1);
    expect(html).toMatch(/data-tab="queries"[^>]*aria-current="page"/);
  });

  it("the four tab routes; everything else is a menu page with no bar", () => {
    expect(tabFor("/dashboard")).toBe("home");
    expect(tabFor("/queries")).toBe("queries");
    expect(tabFor("/todo")).toBe("todo");
    expect(tabFor("/todo/corkboard")).toBe("todo");
    expect(tabFor("/agents/discover")).toBe("agents");
    for (const p of ["/queries/analytics", "/queries/responses", "/queries/packages", "/manuscripts", "/account", "/help", "/import"]) {
      expect(tabFor(p), p).toBeNull();
      expect(isMenuPage(p), p).toBe(true);
    }
    expect(renderToStaticMarkup(<BottomTabBar pathname="/queries" onGo={noop} onPlus={noop} hidden />)).toBe("");
  });

  it("the badge is on To-do, shows the count, and nothing at zero", () => {
    expect(renderToStaticMarkup(<BottomTabBar pathname="/dashboard" onGo={noop} onPlus={noop} badge={4} />))
      .toMatch(/data-tab="todo"[^]*class="pa-tbbadge"[^>]*>4</);
    expect(renderToStaticMarkup(<BottomTabBar pathname="/dashboard" onGo={noop} onPlus={noop} badge={0} />)).not.toContain("pa-tbbadge");
  });

  it("the + says whether its sheet is open, and the bar carries away / plus-open", () => {
    const shut = renderToStaticMarkup(<BottomTabBar pathname="/dashboard" onGo={noop} onPlus={noop} />);
    expect(shut).toMatch(/data-pa="plus"[^>]*aria-expanded="false"/);
    const open = renderToStaticMarkup(<BottomTabBar pathname="/dashboard" onGo={noop} onPlus={noop} plusOpen away />);
    expect(open).toMatch(/data-pa="plus"[^>]*aria-expanded="true"/);
    expect(open).toMatch(/class="pa-tabbar away plus-open"/);
  });

  it("floats: inset 14px, 66 tall, a 33px capsule, over the safe area; hidden at 768 and up", () => {
    const block = phoneShellCss.split("@media (max-width: 767.98px)")[1] ?? "";
    const bar = block.match(/\.pa-tabbar \{([^}]*)\}/s)?.[1] ?? "";
    expect(bar, "the <md .pa-tabbar rule must exist").not.toBe("");
    for (const d of ["left: 14px", "right: 14px", "height: 66px", "border-radius: 33px", "env(safe-area-inset-bottom"]) expect(bar).toContain(d);
    expect(phoneShellCss.split("@media (max-width: 767.98px)")[0]).toContain(".pa-tabbar { display: none; }");
  });

  it("THE COLOUR RULES — the chosen pill is navy with a white icon; the badge and the + are blush with black text", () => {
    const pill = phoneShellCss.match(/\.pa-tb\[aria-current="page"\] \.pa-tbi \{([^}]*)\}/s)?.[1] ?? "";
    expect(pill, "the chosen pill's rule must exist").not.toBe("");
    expect(pill).toContain("background: var(--pa-navy)");
    expect(pill).toContain("color: #fff");
    const bd = phoneShellCss.match(/\.pa-tbbadge \{([^}]*)\}/s)?.[1] ?? "";
    expect(bd).toContain("background: var(--pa-blush)");
    expect(bd).toContain("color: #111");
    expect(phoneTokens).toContain("--pa-blush: #e8c8bc");
    expect(phoneTokens).toContain("--pa-navy: var(--sp-anthracite, #2a3a52)");
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
    /* ⚠️ THE CLASS MOVED WITH THE STAGE (refinement §4): the scroll container is the card's
       ⚠️ RETARGETED (app-shell-v2): the scroller is `.ws-wbody` — the window's body — so the
       clearance class rode there with the id. It is still exactly one element, and dropping it
       puts the floating tab bar over the last 100px of every mobile page. */
    const ws = readFileSync(resolve(__dirname, "./WorkspaceShell.tsx"), "utf8");
    expect(ws).toContain('className="ws-wbody sv2-stagepad"');
    expect(appShell).not.toContain('className="pb-[76px]'); // the old Tailwind clearance is gone from the stage
    const mobileBlock = css.split("@media (max-width: 767.98px)")[1] ?? "";
    expect(mobileBlock, "the <md block must exist").not.toBe("");
    expect(mobileBlock).toContain(".sv2-stagepad { padding-bottom: calc(100px + env(safe-area-inset-bottom)); }");
    // and OUTSIDE the media block the class pads nothing (md+ is pixel-identical)
    const beforeMedia = css.split("@media (max-width: 767.98px)")[0];
    expect(beforeMedia).not.toContain(".sv2-stagepad");
  });

  /**
   * ⚠️ THE VIEWPORT MEASUREMENT MOVED UP TO THE FRAME, AND THE LAW IS UNCHANGED. `.sv2-app` is a
   * ROW — the rail and the workspace are its columns — so anything that must sit above the whole
   * shell cannot be its child. `.sa-shellframe` is the column that holds the strip and the row, and
   * it therefore takes the height: a `100vh` row inside a column that also holds a 42px strip
   * overflows by exactly the strip.
   *
   * ⚠️ AND `flex-direction: row` IS STATED NOW RATHER THAN DEFAULTED. It was the default, and two
   * comments elsewhere in the app described this element as a COLUMN — a third thing was mounted
   * into it on that basis and took 840px of the app's width. A default that two authors guessed
   * wrong is worth one word.
   */
  it("the viewport law: the frame takes 100vh, the row is a row, dvh overrides below md", () => {
    expect(shellCss).toContain(".sv2-app { display: flex; flex-direction: row; height: 100vh; overflow: hidden; }");
    expect(shellCss, "the frame is missing — the strip would be a column of the row again")
      .toContain(".sa-shellframe { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }");
    expect(shellCss, "the row kept its own viewport height inside the frame — it would overflow by the strip")
      .toContain(".sa-shellframe > .sv2-app { height: auto; flex: 1 1 auto; min-height: 0; }");
    const mobileBlock = css.split("@media (max-width: 767.98px)")[1] ?? "";
    expect(mobileBlock, "the dynamic-viewport swap did not follow the height up to the frame")
      .toContain(".sa-shellframe { height: 100vh; height: 100dvh; }");
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
    /* ⚠️ RE-POINTED 29 OCT (Phone app v2, Part 1E): the installed app is the phone app, so its colours are the ink
       navy (the launch screen's ground), and the icons are the hawk on navy in public/pwa/. */
    expect(manifest.theme_color).toBe("#2a3a52");
    expect(manifest.background_color).toBe("#2a3a52");
    expect(manifest.icons.every((i: { src: string }) => i.src.startsWith("/pwa/"))).toBe(true);
    expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(
      expect.arrayContaining(["192x192", "512x512"]),
    );
    const html = readFileSync(resolve(__dirname, "../../../index.html"), "utf8");
    expect(html).toContain('rel="manifest" href="/manifest.webmanifest"');
    expect(html).toContain('name="theme-color" content="#e7e0d5"'); // the browser colour at 768px and up, unchanged
    expect(html).toContain('<meta name="theme-color" content="#2a3a52" media="(max-width: 767.98px)" />');
    expect(html.match(/rel="apple-touch-startup-image"/g)?.length).toBeGreaterThanOrEqual(5);
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

/* ⚠️ RE-POINTED 29 OCT (Phone app v2, Part 1D): the "you" sheet is REPLACED by the menu behind your initials
   (components/phone/PhoneSheets.tsx `PhoneMenu`, ref menuv.js ovMenu MV B). The claim that survives is that nothing it
   offered became unreachable: each of its six rows, and its Upgrade link, has a home. The rendered check is
   tests/e2e/phoneAppV2Shell.measure.ts S6. */
describe("the menu — everything the you-sheet offered is still reachable", () => {
  const sheets = readFileSync(resolve(__dirname, "../phone/PhoneSheets.tsx"), "utf8");
  it("To-do is a tab; packages, import, settings, help, sign out and upgrade are in the menu", () => {
    expect(barSrc).toContain('{ key: "todo", label: "To-do", path: "/todo" }');
    expect(appShell).toContain('goPath("/queries/packages")');
    expect(appShell).toContain('onImport={() => goPath("/import")}');
    expect(appShell).toContain('onSettings={() => goPath("/account")}');
    expect(appShell).toContain('onHelp={() => goPath("/help")}');
    expect(appShell).toContain('onPlan={() => goPath("/plans")}');
    expect(appShell).toContain("onSignOut={logout}");
    for (const w of ["Import queries", "Help centre", "Settings", "Plan &amp; billing", "Sign out"]) expect(sheets).toContain(w);
    expect(appShell).toContain("planLine(currentUser?.plan).label");
    expect(appShell).not.toContain("sa-ymenu-row");
  });
});
