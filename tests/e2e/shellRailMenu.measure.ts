/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shell rail menu v1 (14 Nov; ref design-refs/shell-rail-menu-v1.html) — the rail row's menu, measured in a browser.
 * Report: reports/shell-rail-menu-v1/REPORT.md.
 *
 * Run on the emulators: `npm run e2e:emu -- tests/e2e/shellRailMenu.measure.ts --project=measure --workers=1`.
 *
 * ⚠️ RED-BEFORE IS A MUTANT BUILD, NOT AN IN-PAGE BREAK. Each lock below was run once against a bundle built with its
 * own fix removed (the mutations are listed in the report), and each went red for its own reason.
 *
 * SRM_SHOTS=<dir> writes the Phase 2 screenshots there.
 */
import { test, expect, type Page } from "@playwright/test";
import { openRoute } from "./measure";

const WIDE = { width: 1512, height: 982 };
const SHOTS = process.env.SRM_SHOTS ?? "";
const MENU = '[data-shell="rail-menu"]';
const row = (page: Page, id: string) => page.locator(`.wsr-nav [data-go="${id}"]`);

async function sidebarMode(page: Page, mode: "rail" | "pinned") {
  await page.addInitScript((m) => {
    try {
      localStorage.setItem("scriptally:sidebar-collapsed", m === "rail" ? "1" : "0");
      localStorage.setItem("scriptally:sidebar-pinned", m === "pinned" ? "1" : "0");
    } catch { /* first visit */ }
  }, mode);
}
/** Park the pointer on the page body, well away from the rail. */
async function park(page: Page) { await page.mouse.move(900, 600); await page.waitForTimeout(400); }
async function hoverRow(page: Page, id: string, ms = 400) {
  const b = (await row(page, id).boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForTimeout(ms);
}
const menuCount = (page: Page) => page.locator(MENU).count();

interface Geo { rail: { right: number }; row: { top: number }; menu: { left: number; top: number; width: number; bottom: number } | null; vh: number }
async function readGeo(page: Page, id: string): Promise<Geo> {
  return page.evaluate((id) => {
    const rail = document.querySelector<HTMLElement>(".wsr")!.getBoundingClientRect();
    const r = document.querySelector<HTMLElement>(`.wsr-nav [data-go="${id}"]`)!.getBoundingClientRect();
    const m = document.querySelector<HTMLElement>('[data-shell="rail-menu"]')?.getBoundingClientRect();
    return { rail: { right: rail.right }, row: { top: r.top }, menu: m ? { left: m.left, top: m.top, width: m.width, bottom: m.bottom } : null, vh: innerHeight };
  }, id);
}
/** SRM-E1's rule: 8px right of the rail, top 8px above the row, 224px wide, inside the window. */
function geoProblems(g: Geo, expectTop = true): string[] {
  const out: string[] = [];
  if (!g.menu) return ["no menu"];
  const dl = g.menu.left - g.rail.right, dt = g.row.top - g.menu.top;
  if (Math.abs(dl - 8) > 0.5) out.push(`left edge is ${dl.toFixed(1)}px from the rail, not 8`);
  if (expectTop && Math.abs(dt - 8) > 0.5) out.push(`top is ${dt.toFixed(1)}px above the row, not 8`);
  if (Math.abs(g.menu.width - 224) > 0.5) out.push(`width is ${g.menu.width}, not 224`);
  if (g.menu.bottom > g.vh - 7.5) out.push(`bottom ${g.menu.bottom.toFixed(1)} runs past the window (${g.vh})`);
  if (g.menu.top < 7.5) out.push(`top ${g.menu.top.toFixed(1)} runs above the window`);
  return out;
}
const menuRows = (page: Page) => page.locator(`${MENU} [role="menuitem"]`).evaluateAll((els) =>
  els.map((e) => ({ text: (e.querySelector(".rm-lbl")?.textContent ?? "").trim(), cur: e.getAttribute("aria-current") === "page", cls: e.className })));

test.describe("shell rail menu v1 — the rail's menu, measured", () => {
  test.beforeEach(async ({ page }) => { await sidebarMode(page, "rail"); });

  test("SRM-E1 at 1512×982 hovering Queries shows the menu 8px right of the rail, 8px above the row; Responses goes there and the menu is gone", async ({ page }) => {
    await openRoute(page, "/dashboard", WIDE);
    await park(page);
    await hoverRow(page, "queries");
    const g = await readGeo(page, "queries");
    console.log("[SRM-E1]", JSON.stringify(g));
    expect(geoProblems(g)).toEqual([]);
    const aria = await row(page, "queries").evaluate((e) => ({ pop: e.getAttribute("aria-haspopup"), exp: e.getAttribute("aria-expanded") }));
    expect(aria).toEqual({ pop: "menu", exp: "true" });
    await expect(page.locator(MENU)).toHaveAttribute("aria-label", "Queries pages");
    await page.locator(`${MENU} [role="menuitem"]`, { hasText: "Responses" }).click();
    await page.waitForTimeout(600);
    expect(new URL(page.url()).pathname + new URL(page.url()).hash).toMatch(/\/queries\/responses$/);
    expect(await menuCount(page)).toBe(0);
  });

  test("SRM-E2 on Responses, hovering Queries marks exactly one row current, and it is Responses", async ({ page }) => {
    await openRoute(page, "/queries/responses", WIDE);
    await park(page);
    await hoverRow(page, "queries");
    const rows = await menuRows(page);
    console.log("[SRM-E2]", JSON.stringify(rows));
    expect(rows.map((r) => r.text)).toEqual(["Query Centre", "Responses", "Analytics"]);
    expect(rows.filter((r) => r.cur).map((r) => r.text)).toEqual(["Responses"]);
    expect(rows.filter((r) => /\bcur\b/.test(r.cls)).map((r) => r.text)).toEqual(["Responses"]);
  });

  test("SRM-E3 a straight line from the row into the menu never closes it, even at 250ms a step", async ({ page }) => {
    await openRoute(page, "/dashboard", WIDE);
    await park(page);
    const b = (await row(page, "queries").boundingBox())!;
    const y = b.y + b.height / 2;
    await page.mouse.move(b.x + b.width / 2, y);
    await page.waitForTimeout(400);
    const g = await readGeo(page, "queries");
    expect(g.menu).not.toBeNull();
    const x0 = b.x + b.width / 2, x1 = g.menu!.left + 30;
    const steps: { x: number; open: number }[] = [];
    for (let x = x0; x <= x1; x += 4) {
      await page.mouse.move(x, y);
      /* longer than the 220ms close: a step that lands on a dead gap closes the menu before the next */
      await page.waitForTimeout(250);
      steps.push({ x: Math.round(x), open: await menuCount(page) });
    }
    console.log("[SRM-E3]", JSON.stringify(steps.filter((s) => s.open === 0)), "steps", steps.length);
    expect(steps.filter((s) => s.open === 0).map((s) => s.x)).toEqual([]);
  });

  test("SRM-E4 hovering Dashboard for 500ms opens nothing", async ({ page }) => {
    await openRoute(page, "/queries", WIDE);
    await park(page);
    await hoverRow(page, "workspace", 500);
    expect(await menuCount(page)).toBe(0);
    expect(await row(page, "workspace").getAttribute("aria-haspopup")).toBeNull();
  });

  test("SRM-E5 with the full sidebar pinned, hovering Queries for 500ms opens nothing", async ({ page }) => {
    await sidebarMode(page, "pinned");
    await openRoute(page, "/dashboard", WIDE);
    await park(page);
    expect(await page.locator(".ws-panel").getAttribute("data-sidebar")).toBe("pinned");
    /* the pointer over the place a rail's Queries would be — the pinned sidebar's own Queries row */
    const b = await row(page, "queries").boundingBox();
    if (b) { await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.waitForTimeout(500); }
    expect(await menuCount(page)).toBe(0);
    /* ⚠️ AND THE RAIL ROW ITSELF, which the pinned sidebar covers and `inert` silences: a pointer event delivered to
       it straight still opens nothing, so the menu's own guard is measured, not the cover */
    await row(page, "queries").dispatchEvent("pointerover", { pointerType: "mouse", bubbles: true });
    await page.waitForTimeout(500);
    expect(await menuCount(page)).toBe(0);
  });

  test("SRM-E6 the keyboard: Queries, ArrowRight, ArrowDown, Enter lands on the second page; Escape returns focus to the row", async ({ page }) => {
    await openRoute(page, "/dashboard", WIDE);
    await park(page);
    await row(page, "queries").focus();
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(200);
    expect(await menuCount(page)).toBe(1);
    expect(await page.evaluate(() => document.activeElement?.textContent?.trim())).toBe("Query Centre");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(600);
    expect(new URL(page.url()).pathname + new URL(page.url()).hash).toMatch(/\/queries\/responses$/);
    expect(await menuCount(page)).toBe(0);

    await row(page, "queries").focus();
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(200);
    expect(await menuCount(page)).toBe(1);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    expect(await menuCount(page)).toBe(0);
    expect(await page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.go)).toBe("queries");
    expect(new URL(page.url()).pathname + new URL(page.url()).hash).toMatch(/\/queries\/responses$/);
  });

  test("SRM-E7 with hover: none, a tap on Queries navigates and no menu exists", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 }, isMobile: true, hasTouch: true, storageState: "tests/e2e/.auth/state.json" });
    const page = await ctx.newPage();
    await sidebarMode(page, "rail");
    await openRoute(page, "/dashboard");
    expect(await page.evaluate(() => matchMedia("(hover: none)").matches)).toBe(true);
    /* a touch screen's emulated mouse over the row opens nothing */
    await hoverRow(page, "queries", 500);
    expect(await menuCount(page)).toBe(0);
    await row(page, "queries").tap();
    await page.waitForTimeout(800);
    expect(new URL(page.url()).pathname + new URL(page.url()).hash).toMatch(/\/queries$/);
    expect(await menuCount(page)).toBe(0);
    await ctx.close();
  });

  test("SRM-S screenshots: the ref's three frames at 1512×982, and Tasks at 1280×720", async ({ page }) => {
    test.skip(!SHOTS, "SRM_SHOTS not set");
    const frames: [string, string, string][] = [
      ["/queries/responses", "queries", "frame1-queries-on-responses"],
      ["/manuscripts/comps", "materials", "frame2-materials-on-comps"],
      ["/agents", "agents", "frame3-agents-on-contact-list"],
    ];
    for (const [route, id, name] of frames) {
      await openRoute(page, route, WIDE);
      await park(page);
      await hoverRow(page, id);
      const g = await readGeo(page, id);
      console.log(`[SRM-S ${name}]`, JSON.stringify(g), JSON.stringify(await menuRows(page)));
      expect(geoProblems(g)).toEqual([]);
      await page.screenshot({ path: `${SHOTS}/${name}-1512.png`, clip: { x: 0, y: 0, width: 760, height: 600 } });
    }
    await openRoute(page, "/dashboard", { width: 1280, height: 720 });
    await park(page);
    await hoverRow(page, "tasks");
    const g = await readGeo(page, "tasks");
    console.log("[SRM-S tasks-1280x720]", JSON.stringify(g), JSON.stringify(await menuRows(page)));
    expect(geoProblems(g, false)).toEqual([]);
    await page.screenshot({ path: `${SHOTS}/tasks-1280x720.png` });
  });
});
