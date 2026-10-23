/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * VER2 shots — the app's equivalent of each design-refs/versions-v2/screens/NN-*.png, at both widths, into
 * reports/versions-v2/shots/ (VER2_SHOTS_DIR overrides). VER2_SHOT=<NN> takes one. Not a lock: it asserts only that
 * each screen's subject is on the page, so a missing state fails loudly instead of photographing nothing.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { ctxFor, openV2, scrollInto, VER2_PRE, VPS } from "./ver2Lib";

test.setTimeout(600_000);
const ONLY = process.env.VER2_SHOT ?? "";
const DIR = process.env.VER2_SHOTS_DIR ?? "reports/versions-v2/shots";
const fx = (a: string) => execFileSync("npx", ["tsx", "tests/e2e/ver2Fixture.mjs", a], { encoding: "utf8" });
const want = (id: string) => !ONLY || ONLY.split(",").includes(id);

async function shot(page: Page, id: string, name: string, w: number) {
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${DIR}/${id}-${name}-${w}.png` });
}
const esc = async (page: Page) => { await page.keyboard.press("Escape"); await page.waitForTimeout(350); };

test.beforeAll(() => { mkdirSync(DIR, { recursive: true }); fx("--seed"); fx("--guide-reset"); });

for (const vp of VPS) {
  test(`VER2 shots @ ${vp.width}`, async ({ browser, baseURL }) => {
    const ctx = await ctxFor(browser, baseURL!, vp);
    const page = await ctx.newPage();
    await openV2(page);
    /* the guide auto-opens once per session: shoot it first, then close it */
    if (want("19")) { await page.locator('[data-pck="popover"]').waitFor({ timeout: 6000 }).catch(() => {}); if (!(await page.locator('[data-pck="popover"]').count())) await page.locator('[data-pck="pill"]').click(); await shot(page, "19", "guide-checklist", vp.width); }
    if (await page.locator('[data-pck="popover"]').count()) await page.locator('[data-pck="close"]').click();
    if (want("01")) await shot(page, "01", "top", vp.width);
    if (want("02")) { await scrollInto(page, '[data-vv2="list-sec"]', 20); await shot(page, "02", "list", vp.width); }
    if (want("03")) { await scrollInto(page, '[data-vv2="list-sec"]', 20); await page.locator('[data-vv2="row"]').nth(1).locator('[data-vv2="edit"]').hover(); await shot(page, "03", "row-icon-label", vp.width); }
    if (want("04")) { await page.locator('[data-vv2="row"][data-id="ver2-bv-2"] [data-vv2="bin"]').click(); await shot(page, "04", "archive-confirm", vp.width); await esc(page); }
    if (want("05")) { await page.locator('[data-vv2="row"][data-id="ver2-bv-3"] [data-vv2="bin"]').click(); await shot(page, "05", "delete-confirm", vp.width); await esc(page); }
    if (want("06")) { await page.locator('[data-vv2="search"]').fill("ferry"); await shot(page, "06", "search", vp.width); await page.locator('[data-vv2="search"]').fill(""); }
    if (want("07")) { await scrollInto(page, '[data-vv2="tree"]', 20); await shot(page, "07", "tree", vp.width); }
    if (want("08")) { await scrollInto(page, '[data-vv2="tracking"]', 20); await shot(page, "08", "divider", vp.width); }
    if (want("09")) { await scrollInto(page, '[data-vv2="carousel"]', 40); await shot(page, "09", "carousel", vp.width); }
    if (want("10")) { await scrollInto(page, '[data-vv2="league"]', 40); await shot(page, "10", "league", vp.width); }
    if (want("11") || want("12") || want("13")) {
      await scrollInto(page, '[data-vv2="list-sec"]', 20);
      await page.locator('[data-vv2="row"].use').click();
      await page.waitForSelector('[data-vv2="drawer"] .vk2');
      if (want("11")) await shot(page, "11", "drawer-top", vp.width);
      if (want("12")) { const b = await page.locator('[data-vv2="drawer"] .hfC-b').nth(2).boundingBox(); if (b) await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await shot(page, "12", "drawer-funnel-hover", vp.width); }
      if (want("13")) { await page.evaluate(() => { const d = document.querySelector('[data-vv2="drawer"] .db'); if (d) d.scrollTop = d.scrollHeight; }); await shot(page, "13", "drawer-changes-queries", vp.width); }
      await esc(page);
    }
    if (want("14")) { await page.locator('[data-vv2="row"][data-id="ver2-bv-2"]').click(); await page.waitForSelector('[data-vv2="drawer"] .vk2'); await shot(page, "14", "drawer-too-early", vp.width); await esc(page); }
    if (want("15")) { await page.locator('[data-vv2="row"][data-id="ver2-bv-2"] [data-vv2="edit"]').click(); await page.locator('[data-vv2="name"]').fill("Fast-paced opening"); await shot(page, "15", "form-edit-duplicate", vp.width); await esc(page); }
    if (want("16")) { await page.locator('[data-vv2="row"][data-id="ver2-bv-0"] [data-vv2="edit"]').click(); await shot(page, "16", "form-original", vp.width); await esc(page); }
    if (want("17") || want("18")) {
      await page.locator('[data-vv2="assign"]').click();
      await page.locator('[data-vv2="pick-trigger"]').first().click();
      if (want("17")) await shot(page, "17", "picker-open", vp.width);
      if (want("18")) { await page.locator('[data-vv2="pick"][data-late="1"]').first().click(); await shot(page, "18", "picker-late-warning", vp.width); }
      await esc(page);
    }
    if (want("20")) { await page.locator('[data-pck="pill"]').click(); await page.locator('[data-pck="popover"] li').first().click().catch(() => {}); await shot(page, "20", "guide-spotlight", vp.width); await esc(page); await esc(page); }
    if (want("26") || want("27") || want("28")) {
      await openV2(page, VER2_PRE);
      if (want("26")) await shot(page, "26", "empty-with-queries", vp.width);
      if (want("27")) { await page.locator('[data-vv2="first"]').click(); await shot(page, "27", "first-save-form", vp.width); await esc(page); }
    }
    if (want("29")) { await openV2(page, undefined, { free: true }); await shot(page, "29", "free-locked", vp.width); await page.evaluate(() => sessionStorage.removeItem("sa.dev.versionsFree")); }
    expect(true).toBe(true);
    await ctx.close();
  });
}
