/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PRICING ON PHONES — the desktop /pricing must not move above 760px. Captures it before and after
 * the pack and compares the screenshots byte for byte.
 *
 *   PVM_DESK=before  write reports/pricing-v4-mobile/desktop/before-*.png (run against the pre-pack build)
 *   PVM_DESK=after   write after-*.png and compare each with its before-*.png
 *
 * Four captures at 1440 × 900 and one at 761 × 900 (the first width that keeps the desktop tree):
 * the whole page closed, the founding panel open, and case (a)'s result — Getting ready, a novel of
 * 80–110k, I don't know, Not sure yet — with the plan card's tail sentence MASKED, because that
 * sentence is the one thing this pack changes on the desktop page (the 24 Oct extension policy).
 * The clock is pinned and the count is mocked so both runs see the same page.
 *
 *   SA_E2E_BASE_URL=http://127.0.0.1:<port> PVM_DESK=after npx playwright test tests/e2e/pricingMobile.desktop.measure.ts
 */
import { test, expect, type Page } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { assertLocalBundleIsDev } from "./bundleGuard";

const DIR = "reports/pricing-v4-mobile/desktop";
const MODE = process.env.PVM_DESK ?? "after";
const TODAY = "2026-10-24T12:00:00";

test.beforeAll(async () => { await assertLocalBundleIsDev(); });

async function open(page: Page, vp: { width: number; height: number }) {
  await page.setViewportSize(vp);
  await page.clock.setFixedTime(new Date(TODAY));
  await page.route("**/api/waitlist", (route) => route.request().method() === "GET"
    ? route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, count: 37, cap: 100 }) })
    : route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html>" }));
  await page.goto("/pricing", { waitUntil: "load" });
  await page.waitForSelector(".mk-fb .mk-fmcount");
  await page.addStyleTag({ content: "*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent!important}html{scroll-behavior:auto!important}" });
  await settle(page);
}

/**
 * ⚠️ A BYTE-FOR-BYTE COMPARE IS ONLY AS STEADY AS THE PAGE IT PHOTOGRAPHS. The first version waited
 * for fonts alone and differed from itself between runs (a late image, and once a click that landed
 * while the page was still settling, so the panel never opened). Every image decoded, every face
 * loaded, two frames, then the shot.
 */
async function settle(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((i) => (i.complete ? i.decode().catch(() => {}) : new Promise((r) => { i.onload = i.onerror = r; }))));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
  await page.waitForTimeout(300);
}

function keep(name: string, shot: Buffer) {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(`${DIR}/${MODE}-${name}.png`, shot);
  if (MODE !== "after") return;
  const before = `${DIR}/before-${name}.png`;
  expect(existsSync(before), `a before capture exists for ${name}`).toBe(true);
  expect(Buffer.compare(readFileSync(before), shot), `desktop /pricing ${name} differs from its pre-pack capture`).toBe(0);
}

for (const vp of [{ width: 1440, height: 900 }, { width: 761, height: 900 }]) {
  test(`desktop /pricing is unchanged @${vp.width}`, async ({ page }) => {
    test.setTimeout(120_000);
    await open(page, vp);
    /* one h1, and it is the desktop box's */
    expect(await page.locator("h1").count()).toBe(1);
    expect(await page.locator(".mk-fb h1").count()).toBe(1);
    await page.mouse.move(0, 0);
    keep(`closed-${vp.width}`, await page.screenshot({ fullPage: true }));
    await page.click(".mk-fbmore");
    await expect(page.locator(".mk-fbmore")).toHaveAttribute("aria-expanded", "true");
    await page.mouse.move(0, 0);
    await settle(page);
    keep(`open-${vp.width}`, await page.screenshot({ fullPage: true }));
    await page.click(".mk-fbmore");
    await expect(page.locator(".mk-fbmore")).toHaveAttribute("aria-expanded", "false");
    if (vp.width !== 1440) return;
    await page.click(".mk-pv4suit");
    const pick = (t: string) => page.locator(".mk-pv4how button", { hasText: t }).first().click();
    await pick("Getting ready"); await page.click(".mk-jynext");
    await pick("A novel"); await pick("80,000 to 110,000"); await page.click(".mk-jynext");
    await pick("I don't know"); await page.click(".mk-jynext");
    await pick("Not sure yet"); await page.click(".mk-jynext");
    await page.waitForSelector(".mk-jyplan");
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.mouse.move(0, 0);
    await settle(page);
    keep("result-1440", await page.screenshot({ fullPage: true, mask: [page.locator(".mk-jytail")], maskColor: "#ff00ff" }));
  });
}
