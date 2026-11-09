/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v54 — the report's screenshots (reports/todo-list-v54/shots). Writes nothing to the account.
 * `SA_E2E_BASE_URL=http://127.0.0.1:3000 npx playwright test tests/e2e/todoV54Shots.measure.ts --project=measure --no-deps`
 * against `npm run dev:emu`.
 */
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { openRoute } from "./measure";

const DIR = "reports/todo-list-v54/shots";
mkdirSync(DIR, { recursive: true });
const PG = '[data-tws="page"]:visible';
const ONLY = process.env.TD54_SHOT ?? "";
const want = (n: string) => !ONLY || ONLY.split(",").includes(n);

const seed = (cmd: string, arg: unknown): Record<string, unknown> =>
  JSON.parse(execFileSync("node", ["tests/e2e/seedTd54.mjs", cmd, JSON.stringify(arg)], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim().split("\n").pop()!);
const restore: Record<string, unknown> = {};
test.afterAll(() => { if (Object.keys(restore).length) seed("set", restore); });

async function open(page: Page, vp: { width: number; height: number }, cap = 0) {
  await page.addInitScript((c) => { try { localStorage.removeItem("sa.todoTraySlim"); } catch { /* */ } if (c) (window as unknown as { __SA_TD54_BATCH?: number }).__SA_TD54_BATCH = c; }, cap);
  await openRoute(page, "/todo", vp);
  await expect(page.locator(PG)).toHaveCount(1, { timeout: 30_000 });
  await expect(page.locator(`${PG} [data-tws-row]`).first()).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(700);
}
const scroller = (page: Page) => page.locator(".wpg-scroll:visible").first();

for (const vp of [{ width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 1920, height: 1080 }]) test(`header — top and pinned (${vp.width})`, async ({ page }) => {
  test.skip(!want("header"));
  await open(page, vp);
  await page.screenshot({ path: `${DIR}/header-top-${vp.width}.png` });
  await scroller(page).evaluate((e) => { e.scrollTop = e.scrollHeight; });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${DIR}/pinned-${vp.width}.png` });
});

/** open the "Fill in what you sent" batch from the tray (Housekeeping opened first) */
export async function openBatch(page: Page) {
  const shut = page.locator(`${PG} [data-tws-group="house"] .tws-gb[aria-expanded="false"]`);
  if (await shut.count()) await shut.click();
  const row = page.locator(`${PG} [data-tws-row="materials-batch"]`);
  await row.scrollIntoViewIfNeeded();
  await row.click();
  await expect(page.locator(`${PG} [data-tws54="band"]`)).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(400);
}

test("batch — as it opens (1440)", async ({ page }) => {
  test.skip(!want("batch"));
  await open(page, { width: 1440, height: 900 });
  await openBatch(page);
  const n = await page.locator(`${PG} [data-tws54-seg]`).count();
  console.log("BATCH", n, await page.locator(`${PG} [data-tws54="band-sub"]`).textContent());
  await scroller(page).evaluate((e) => { e.scrollTop = e.scrollHeight; });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${DIR}/batch-open-1440.png` });
});

/* the batch's first agent asks for a query letter, a synopsis and the first 3 chapters; the next agent has none saved */
async function fixture(page: Page) {
  const rows = await page.locator(`${PG} [data-tws54-row]`).evaluateAll((els) => els.map((e) => e.getAttribute("data-tws54-agent") ?? ""));
  const a1 = rows[0], a2 = rows.find((a) => a && a !== a1)!;
  const before = seed("set", { [a1]: ["Query letter", "Synopsis", "First 3 chapters"], [a2]: [] });
  for (const [k, v] of Object.entries(before)) if (!(k in restore)) restore[k] = v;
  await page.reload(); await expect(page.locator(`${PG} [data-tws-row]`).first()).toBeVisible({ timeout: 30_000 });
  await openBatch(page);
}
const pick = async (page: Page, v: "one" | "table") => { const b = page.locator(`${PG} [data-tws54="view-switch"] [data-v="${v}"]`); if ((await b.getAttribute("aria-checked")) !== "true") { await b.click(); await page.waitForTimeout(300); } };
const shot = async (page: Page, name: string) => { await scroller(page).evaluate((e) => { e.scrollTop = e.scrollHeight; }); await page.waitForTimeout(300); await page.screenshot({ path: `${DIR}/${name}.png` }); };

test("batches — 6 and 14, both views, the picker, no guidelines, the same", async ({ page }) => {
  test.skip(!want("batches"));
  test.setTimeout(180_000);
  execFileSync("node", ["tests/e2e/seedTd54.mjs", "view", "null"], { stdio: "ignore" });
  await open(page, { width: 1440, height: 900 }, 6);
  await openBatch(page);
  await pick(page, "table");
  await fixture(page);
  await pick(page, "one");
  await shot(page, "batch6-one-at-a-time");
  /* the sample picker with a section start */
  const step = page.locator(`${PG} [data-tws54="step"]`);
  await step.locator('[data-snt="section"]').check();
  await page.waitForTimeout(200);
  await shot(page, "sample-picker-section");
  await step.locator('[data-snt="section"]').evaluate((e) => (e as HTMLInputElement).closest(".snt")!.querySelector<HTMLInputElement>('input[type="radio"]')!.click());
  /* "Did the same go to anyone else?" */
  await page.locator(`${PG} [data-tws="primary"]`).click();
  await page.waitForTimeout(300);
  await shot(page, "batch6-did-the-same");
  await page.locator(`${PG} [data-tws="back"]`).click();
  /* the no-guidelines state: skip forward to the agent with none saved */
  for (let i = 0; i < 6 && !(await page.locator(`${PG} [data-tws54="no-asks"]`).count()); i++) { await page.locator(`${PG} [data-tws="skip"]`).click(); await page.waitForTimeout(150); }
  await shot(page, "batch6-no-guidelines");
  await pick(page, "table");
  await shot(page, "batch6-all-at-once");
  await page.close();
});

test("batches — 14", async ({ browser }) => {
  test.skip(!want("batches"));
  test.setTimeout(120_000);
  const page = await browser.newPage();
  await open(page, { width: 1440, height: 900 }, 14);
  await openBatch(page);
  await pick(page, "table");
  await shot(page, "batch14-all-at-once");
  await page.locator(`${PG} [data-tws54="sample-cell"]`).first().click();
  const panel = page.locator(`${PG} [data-tws54="sample-panel"]`);
  await panel.locator('[data-snt-unit="pages"] .snt-ul').click();
  await panel.locator('[data-snt="amount"]').fill("37"); await panel.locator('[data-snt="amount"]').press("Enter");
  await panel.locator('[data-snt="section"]').check();
  await panel.locator('[data-snt-from="page"] .snt-ul').click();
  await panel.locator('[data-snt="from"]').fill("40"); await panel.locator('[data-snt="from"]').press("Enter");
  await page.waitForTimeout(200);
  await shot(page, "batch14-sample-panel");
  await pick(page, "one");
  await shot(page, "batch14-one-at-a-time");
  await page.close();
});
