/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v18 — the report's screenshots, beside each `design-refs/contact-list-v18/screens/*` file. Not a lock:
 * it asserts nothing and runs only with `CL18_SHOTS=1` (`CL18_ONLY=<part>` narrows it).
 */
import { test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { openContacts16 } from "./cl16Lib";

const OUT = "reports/contact-list-v18/shots";
const ON = process.env.CL18_SHOTS === "1";
const ONLY = process.env.CL18_ONLY ?? "";
const want = (p: string) => !ONLY || ONLY.split(",").includes(p);
const tab = (page: Page, L: string) => page.locator(`.aglist [data-cl18="tab"][data-l="${L}"]`).filter({ visible: true }).first();

test.describe("Contact list v18 · shots", () => {
  test.skip(!ON, "set CL18_SHOTS=1 to write the report's screenshots");
  test.beforeAll(() => mkdirSync(OUT, { recursive: true }));
  for (const vp of [{ width: 1512, height: 900 }, { width: 1280, height: 800 }]) {
    test(`A · top and pinned · ${vp.width}`, async ({ page }) => {
      test.skip(!want("A"));
      await openContacts16(page, vp);
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${OUT}/01-top-${vp.width}.png` });
      await tab(page, "M").click(); await page.waitForTimeout(1600);
      await page.screenshot({ path: `${OUT}/02-pinned-M-${vp.width}.png` });
    });
  }
  for (const vp of [{ width: 1920, height: 1080 }, { width: 1024, height: 768 }]) {
    test(`top · ${vp.width}`, async ({ page }) => {
      test.skip(!want("wide"));
      await openContacts16(page, vp);
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${OUT}/agents-${vp.width}.png` });
    });
  }
});

test.describe("Contact list v18 · shots B", () => {
  test.skip(!ON || !want("B"), "set CL18_SHOTS=1 CL18_ONLY=B");
  test("B · the Filters panel with two filters set · 1512", async ({ page }) => {
    await openContacts16(page, { width: 1512, height: 900 });
    await page.locator('.aglist [data-cl18="filters"]').filter({ visible: true }).first().click(); await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/03-filters-1512.png` });
    await page.locator('[data-cl18="filters-panel"] [data-opt="open:open"]').click(); await page.waitForTimeout(200);
    await page.locator('[data-cl18="filters-panel"] [data-opt="queried:no"]').click().catch(() => undefined); await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/filters-two-set-1512.png` });
  });
});

test.describe("Contact list v18 · shots D", () => {
  test.skip(!ON || !want("D"), "set CL18_SHOTS=1 CL18_ONLY=D");
  test("D · a peek, and a peek with missing fields · 1512", async ({ page }) => {
    await openContacts16(page, { width: 1512, height: 900 });
    const rows = page.locator('.aglist [data-clv="row"]').filter({ visible: true });
    await rows.nth(0).hover(); await page.waitForTimeout(1000);
    await page.screenshot({ path: `${OUT}/04-peek-1512.png` });
    await page.mouse.move(5, 5); await page.waitForTimeout(400);
    await rows.nth(3).hover(); await page.waitForTimeout(1000);
    await page.screenshot({ path: `${OUT}/peek-missing-1512.png` });
  });
});

test.describe("Contact list v18 · shots E", () => {
  test.skip(!ON || !want("E"), "set CL18_SHOTS=1 CL18_ONLY=E");
  test("E · the panel in each status · 1512", async ({ page }) => {
    await openContacts16(page, { width: 1512, height: 900 });
    for (const [disc, name] of [["live", "querying"], ["none", "not-queried"], ["closed", "closed"]] as const) {
      const row = page.locator(`.aglist [data-clv="row"][data-disc="${disc}"]`).filter({ visible: true }).first();
      if (!(await row.count())) continue;
      await row.click(); await page.waitForTimeout(1200);
      await page.screenshot({ path: `${OUT}/05-panel-${name}-1512.png` });
      await page.keyboard.press("Escape"); await page.waitForTimeout(800);
    }
  });
});

test.describe("Contact list v18 · shots F", () => {
  test.skip(!ON || !want("F"), "set CL18_SHOTS=1 CL18_ONLY=F");
  for (const vp of [{ width: 1512, height: 900 }, { width: 1280, height: 800 }]) {
    test(`F · intro, home and focus · ${vp.width}`, async ({ page }) => {
      await openContacts16(page, vp);
      await page.keyboard.press("h"); await page.waitForTimeout(900);
      if (await page.locator('[data-hk8="intro"]').count()) await page.screenshot({ path: `${OUT}/06-hk-intro-${vp.width}.png` });
      if (await page.locator('[data-hk8="not-now"]').count()) { await page.locator('[data-hk8="not-now"]').click(); await page.waitForTimeout(600); await page.keyboard.press("h"); await page.waitForTimeout(900); }
      await page.locator('[data-hkv="view"][data-v="detail"]').click(); await page.waitForTimeout(400);
      await page.screenshot({ path: `${OUT}/07-hk-home-detail-${vp.width}.png` });
      await page.locator('[data-hkv="view"][data-v="agent"]').click(); await page.waitForTimeout(400);
      await page.screenshot({ path: `${OUT}/08-hk-home-agent-${vp.width}.png` });
      await page.locator('[data-hkv="view"][data-v="detail"]').click(); await page.waitForTimeout(300);
      if (vp.width !== 1512) return;
      await page.locator('[data-hk8="fill-detail"]').first().click(); await page.waitForTimeout(700);
      await page.screenshot({ path: `${OUT}/09-hk-focus-run-1512.png` });
    });
  }
});

test.describe("Contact list v18 · shots F2", () => {
  test.skip(!ON || !want("F2"), "set CL18_SHOTS=1 CL18_ONLY=F2");
  test("F · the intro at 1280, and the pop mid-air at 1512", async ({ page }) => {
    const { execSync } = await import("node:child_process");
    execSync("node tests/e2e/hkFlags.mjs --clear");
    await openContacts16(page, { width: 1280, height: 800 });
    await page.keyboard.press("h"); await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}/06-hk-intro-1280.png` });
    await page.locator('[data-hk8="not-now"]').click(); await page.waitForTimeout(1200);
    await page.setViewportSize({ width: 1512, height: 900 });
    await page.addStyleTag({ content: ".hk8-pop { animation-play-state: running !important; }" });
    await page.evaluate(() => { for (const s of document.querySelectorAll("style")) if (/animation: none !important/.test(s.textContent ?? "")) s.remove(); });
    await page.keyboard.press("h"); await page.waitForTimeout(900);
    await page.locator('[data-hk8="detail"][data-gap="reply"] [data-hk8="ledger-row"]').first().click(); await page.waitForTimeout(600);
    await page.locator('[data-hk8="field"][data-gap="reply"] button[data-d="1"]').click(); await page.waitForTimeout(200);
    await page.locator('[data-hk8="save"]').click();
    await page.locator('[data-hk8="pop"]').first().waitFor({ state: "attached", timeout: 8000 }).catch(() => undefined);
    await page.waitForTimeout(350);
    await page.screenshot({ path: `${OUT}/10-hk-plus-points-1512.png` });
    await page.waitForTimeout(1500);
    await page.locator('[data-hkv="undo"]').click({ timeout: 5000 }).catch(() => undefined); await page.waitForTimeout(2500);
  });
});
