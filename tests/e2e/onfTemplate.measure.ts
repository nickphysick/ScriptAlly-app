/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Overnight fixes v1, Part 1. TS2: the Contact list's and Analytics' empty pages show exactly two ways to start,
 * evenly spaced, at 1440 and 1280. The tiles are measured on the rendered page.
 *
 * - The Contact list's empty page is forced with the dev aid `__SA_LH_COUNT = 0`, as contactV17's F1 does.
 * - The Analytics empty page is a seeded empty manuscript (`seedAn21.mjs empty`), removed in the same run.
 *
 * TS4's rendered half (a headings file imports with no callable request) is twoDoorImport.measure.ts's H2, run
 * beside this one.
 */
import { expect, test, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { openApp } from "./pageHeaderV2Lib";
import { openAn } from "./an17Lib";

const SIZES = [{ width: 1440, height: 900 }, { width: 1280, height: 800 }];
/** `TS_MUTATE=threeways` plants a third tile, as the served tip drew it ("Use our template"), to show the lock goes red. */
const MUTATE = process.env.TS_MUTATE ?? "";
async function mutate(page: Page, rowSel: string, tileSel: string) {
  if (MUTATE !== "threeways") return;
  await page.evaluate(({ rowSel, tileSel }) => {
    const row = [...document.querySelectorAll<HTMLElement>(rowSel)].find((e) => e.getBoundingClientRect().height > 0);
    const first = row?.querySelector<HTMLElement>(tileSel);
    if (!row || !first) return;
    const t = first.cloneNode(true) as HTMLElement;
    t.setAttribute("data-k", "template");
    t.innerHTML = "<h3>Use our template</h3><a download href='/QueryHawk-pipeline-import-template.xlsx'>Download the template</a>";
    row.insertBefore(t, first.nextSibling);
  }, { rowSel, tileSel });
}

/** The ways row, read from boxes: how many tiles, their widths and gaps, and whether any names the template. */
async function readWays(page: Page, rowSel: string, tileSel: string) {
  return page.evaluate(({ rowSel, tileSel }) => {
    const shown = (e: Element) => { const r = e.getBoundingClientRect(); return r.width > 0.5 && r.height > 0.5; };
    const row = [...document.querySelectorAll<HTMLElement>(rowSel)].find(shown);
    if (!row) return null;
    const tiles = [...row.querySelectorAll<HTMLElement>(tileSel)].filter(shown);
    const box = row.getBoundingClientRect();
    const rs = tiles.map((t) => t.getBoundingClientRect());
    return {
      n: tiles.length,
      widths: rs.map((r) => Math.round(r.width * 10) / 10),
      tops: rs.map((r) => Math.round(r.top)),
      gap: rs.length > 1 ? rs[1].left - rs[0].right : null,
      cssGap: parseFloat(getComputedStyle(row).columnGap),
      leftIn: rs.length ? rs[0].left - box.left : null,
      rightIn: rs.length ? box.right - rs[rs.length - 1].right : null,
      template: /template/i.test(row.textContent ?? "") || !!row.querySelector('[data-k="template"], [download]'),
      keys: tiles.map((t) => t.getAttribute("data-k")),
    };
  }, { rowSel, tileSel });
}

function expectTwoEven(r: Awaited<ReturnType<typeof readWays>>, where: string) {
  expect(r, `${where}: the ways row is on the page`).not.toBeNull();
  if (!r) return;
  expect(r.n, `${where}: exactly two ways (${r.keys.join(", ")})`).toBe(2);
  expect(r.template, `${where}: nothing names or downloads the template`).toBe(false);
  expect(Math.abs(r.widths[0] - r.widths[1]), `${where}: equal widths ${r.widths.join(" / ")}`).toBeLessThanOrEqual(1);
  expect(r.tops[0], `${where}: side by side`).toBe(r.tops[1]);
  expect(Math.abs((r.gap ?? 0) - r.cssGap), `${where}: the gap is the row's gap (${r.gap} vs ${r.cssGap})`).toBeLessThanOrEqual(1);
  expect(Math.abs(r.leftIn ?? 9) + Math.abs(r.rightIn ?? 9), `${where}: the two fill the row (${r.leftIn}, ${r.rightIn})`).toBeLessThanOrEqual(1);
}

test("TS2 · the Contact list's empty page offers two ways, evenly spaced", async ({ page }) => {
  test.setTimeout(240_000);
  for (const vp of SIZES) {
    await page.addInitScript(() => { (window as unknown as { __SA_LH_COUNT?: number }).__SA_LH_COUNT = 0; try { localStorage.setItem("sa.guide.contacts", "1"); } catch { /* */ } });
    await openApp(page, "/agents", vp);
    await page.locator('.aglist [data-cl17="ways"]').first().waitFor({ timeout: 30_000 });
    await mutate(page, '.aglist [data-cl17="ways"] .cl17-ways-g', '[data-cl17="way"]');
    const r = await readWays(page, '.aglist [data-cl17="ways"] .cl17-ways-g', '[data-cl17="way"]');
    console.log(`TS2 contacts ${vp.width}: ${JSON.stringify(r)}`);
    expectTwoEven(r, `Contact list ${vp.width}`);
    expect(r?.keys).toEqual(["import", "add"]);
  }
});

test.describe("TS2 · Analytics", () => {
  test.beforeAll(() => { execSync("node tests/e2e/seedAn21.mjs empty", { stdio: "pipe" }); });
  test.afterAll(() => { execSync("node tests/e2e/seedAn21.mjs restore", { stdio: "pipe" }); });
  test("TS2 · the Analytics empty page offers two ways, evenly spaced", async ({ page }) => {
    test.setTimeout(240_000);
    for (const vp of SIZES) {
      await page.addInitScript(() => { try { localStorage.setItem("scriptally_active_manuscript_id", "seed-an21-empty"); } catch { /* */ } });
      await openAn(page, vp);
      await page.locator('[data-a21="ways"]').first().waitFor({ timeout: 30_000 });
      await mutate(page, '[data-a21="ways"]', '[data-a21="way"]');
      const r = await readWays(page, '[data-a21="ways"]', '[data-a21="way"]');
      console.log(`TS2 analytics ${vp.width}: ${JSON.stringify(r)}`);
      expectTwoEven(r, `Analytics ${vp.width}`);
      expect(r?.keys).toEqual(["import", "log"]);
    }
  });
});
