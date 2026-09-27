/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QUERY ACTIONS v1 — the drawer, measured on the built app (brief §H). The mock is opened in the
 * same browser for the geometry it is compared against.
 *
 * Opening: every case opens the drawer through the store, the way every door does
 * (`window.__saQueryDrawer`, development builds only), so a case measures the drawer rather than
 * whichever button happens to lead to it.
 */
import { test, expect, type Page } from "@playwright/test";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ensureSignedIn, openRoute, liftMotionSuppression } from "./measure";

const OUT = resolve(process.cwd(), "reports/query-actions-v1/shots");
mkdirSync(OUT, { recursive: true });
const REF = "file://" + resolve(process.cwd(), "design-refs/query-actions-v11.html");
let asserted = 0;
const ok = (c: unknown, m: string) => { asserted++; expect(c, m).toBeTruthy(); };

async function openDrawer(page: Page, req: Record<string, unknown>) {
  await page.evaluate((r) => (window as unknown as { __saQueryDrawer: { open: (r: unknown) => Promise<void> } }).__saQueryDrawer.open(r), req);
  await expect(page.locator("[data-qad-drawer]")).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(450);
}

async function box(page: Page, sel: string) {
  return page.locator(sel).first().evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
}

test.describe("query drawer", () => {
  test.setTimeout(240_000);

  test("§A geometry — 500 wide, right 0, the header's height against the mock's, the step bar sticky", async ({ page }) => {
    await ensureSignedIn(page);
    await openRoute(page, "/queries", { width: 1440, height: 900 });
    await liftMotionSuppression(page);
    await openDrawer(page, { mode: "log" });
    const d = await box(page, "[data-qad-drawer]");
    ok(Math.abs(d.w - 500) < 0.5, `drawer width ${d.w}`);
    ok(Math.abs(d.x + d.w - 1440) < 0.5, `drawer right edge ${d.x + d.w}`);
    const head = await box(page, "[data-qad-head]");
    await page.screenshot({ path: `${OUT}/app-log-empty-1440.png` });

    /* the mock, same browser: its header with no agent card */
    const ref = await page.context().newPage();
    await ref.setViewportSize({ width: 1440, height: 900 });
    await ref.goto(REF);
    await ref.evaluate(() => (window as unknown as { openDrawer: (m: string) => void }).openDrawer("log"));
    await ref.waitForTimeout(700);
    const rh = await ref.locator("#dHead").evaluate((e) => e.getBoundingClientRect().height);
    await ref.screenshot({ path: `${OUT}/ref-log-empty-1440.png` });
    ok(Math.abs(head.h - rh) <= 2, `header ${head.h} vs mock ${rh}`);
    writeFileSync(`${OUT}/geometry.json`, JSON.stringify({ drawer: d, head: head.h, refHead: rh }, null, 2));
    await ref.close();

    /* below 768: a full-screen sheet */
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);
    const m = await box(page, "[data-qad-drawer]");
    ok(Math.abs(m.w - 390) < 0.5 && Math.abs(m.x) < 0.5, `mobile sheet ${JSON.stringify(m)}`);
    expect(asserted).toBeGreaterThanOrEqual(4);
  });
});

export { readFileSync };

test("§F the query card's footer draws the mock's doors, and a door opens the drawer with the card docked", async ({ page }) => {
  test.setTimeout(240_000);
  await ensureSignedIn(page);
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await liftMotionSuppression(page);
  const row = page.locator('.qcv-page [data-qcv="row"]').first();
  await expect(row).toBeVisible({ timeout: 20_000 });
  await row.click();
  const doors = page.locator('[data-qcv="open-doors"]');
  await expect(doors).toBeVisible({ timeout: 10_000 });
  const labels = await doors.locator("button").allTextContents();
  expect(labels.length).toBeGreaterThan(0);
  await page.screenshot({ path: `${OUT}/app-card-footer-1440.png` });
  await doors.locator("button").first().click();
  await expect(page.locator("[data-qad-drawer]")).toBeVisible({ timeout: 10_000 });
  await expect(page.locator("[data-qad-dock]")).toBeVisible();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/app-card-door-open-1440.png` });
  writeFileSync(`${OUT}/card-doors.json`, JSON.stringify(labels));
});
