/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v53 — the report's screenshots (reports/todo-list-v53/shots/), at 1440 × 900 on the emulator. Two shots
 * write and put the account back in the same run: "logged" + "snackbar" log a nudge and press Undo; "milestone" sets the
 * own tasks aside through the emulator's admin REST (as TD53 L8 does), finishes one, and restores every one.
 */
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { openRoute } from "./measure";

const OUT = "reports/todo-list-v53/shots";
mkdirSync(OUT, { recursive: true });
const PG = '[data-tws="page"]:visible';
const VP = { width: 1440, height: 900 };
const shot = async (page: Page, name: string): Promise<void> => { await page.screenshot({ path: `${OUT}/${name}.png` }); };
const desk = (page: Page) => page.locator(`${PG} [data-tws="desk"]`);
async function open(page: Page) {
  await page.addInitScript(() => { try { localStorage.removeItem("sa.todoTraySlim"); } catch { /* */ } });
  await openRoute(page, "/todo", VP);
  await expect(page.locator(`${PG} [data-tws-row]`).first()).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(800);
}
async function toCheck(page: Page, kind: string, each?: (i: number) => Promise<void>) {
  await page.locator(`${PG} [data-tws-row][data-kind="${kind}"]`).first().click();
  await page.waitForTimeout(600);
  for (let i = 0; i < 8; i++) {
    const open = desk(page).locator('[data-st="open"]').first();
    if ((await open.getAttribute("data-tws-step")) === "check") break;
    const tile = open.locator(".tws-tile:not(:disabled)").first();
    if (await tile.count()) await tile.click();
    await page.waitForTimeout(250);
    if (each) await each(i);
    await desk(page).locator('[data-tws="primary"][data-next]').click();
    await page.waitForTimeout(400);
  }
}

test("shots: the page, housekeeping folded and open, a send step by step, its check step", async ({ page }) => {
  test.setTimeout(120_000);
  await open(page);
  await shot(page, "01-page-housekeeping-folded");
  await toCheck(page, "send", (i) => shot(page, `02-send-step-${i + 1}`));
  await page.waitForTimeout(500);
  await shot(page, "03-send-check");
  await page.locator(`${PG} [data-tws-group="house"] .tws-gb`).click();
  await page.waitForTimeout(400);
  const list = page.locator(`${PG} [data-tws="list"]`);
  await list.evaluate((l) => { const h = l.querySelector<HTMLElement>('[data-tws-group="house"]'); if (h) l.scrollTop += h.getBoundingClientRect().top - l.getBoundingClientRect().top - 8; });
  await page.waitForTimeout(300);
  await shot(page, "04-housekeeping-open");
});

test("shots: logged, then the snackbar (a nudge, undone)", async ({ page }) => {
  test.setTimeout(120_000);
  await open(page);
  const title = ((await page.locator(`${PG} [data-tws-row][data-kind="nudge"] .tws-tx b`).first().textContent()) ?? "").trim();
  await toCheck(page, "nudge");
  await desk(page).locator('[data-tws="primary"][data-log]').click();
  await expect(desk(page).locator('[data-tws="primary"]')).toHaveText(/Logged/, { timeout: 5000 });
  await shot(page, "05-logged");
  await expect(page.locator('[data-tws="toast"][data-snack]')).toBeVisible({ timeout: 6000 });
  await page.waitForTimeout(500);
  await shot(page, "06-snackbar");
  await page.locator('[data-tws="toast"] [data-tws="undo"]').click();
  await expect(page.locator(`${PG} [data-tws-row]`).filter({ hasText: title })).toHaveCount(1, { timeout: 20_000 });
});

const EMU = "http://127.0.0.1:8085/v1/projects/demo-scriptally/databases/(default)/documents";
const UID = "LS4ymFFCEvhN82advZQJ5zkr7sv2";
type FsDoc = { name: string; fields?: Record<string, { booleanValue?: boolean; stringValue?: string }> };
const setDone = async (d: FsDoc, done: boolean | undefined) => {
  const body = done === undefined ? { fields: {} } : { fields: { done: { booleanValue: done } } };
  await fetch(`http://127.0.0.1:8085/v1/${d.name}?updateMask.fieldPaths=done`, { method: "PATCH", headers: { Authorization: "Bearer owner", "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(15_000) });
};
test("shots: a milestone (Your tasks emptied; the account put back)", async ({ page }) => {
  test.setTimeout(150_000);
  const j = (await (await fetch(`${EMU}/users/${UID}/tasks?pageSize=500`, { headers: { Authorization: "Bearer owner" }, signal: AbortSignal.timeout(15_000) })).json()) as { documents?: FsDoc[] };
  const parked = (j.documents ?? []).filter((d) => !!d.fields?.dueDate?.stringValue && d.fields?.done?.booleanValue !== true);
  const text = `Ring the printer about the proofs`;
  try {
    for (const d of parked) await setDone(d, true);
    await open(page);
    await page.locator(`${PG} .tws-addb`).click();
    await page.locator(`${PG} .tws-newt`).fill(text);
    await page.locator(`${PG} .tws-opts button`).first().click();
    await page.getByRole("button", { name: "Add to your tray →" }).click();
    const row = page.locator(`${PG} [data-tws-row]`).filter({ hasText: text });
    await expect(row).toHaveCount(1, { timeout: 15_000 });
    await row.click();
    await desk(page).locator('[data-tws="primary"]').click();
    await expect(page.locator(`${PG} [data-tws="milestone"]`)).toBeVisible({ timeout: 6000 });
    await page.waitForTimeout(500);
    await shot(page, "07-milestone");
    await page.locator('[data-tws="toast"] [data-tws="undo"]').click();
    await expect(row).toHaveCount(1, { timeout: 15_000 });
    await row.click();
    await desk(page).locator('[data-tws="footer"] button[aria-label="Delete"]').click();
    await page.locator(".tws-pop .tws-po").filter({ hasText: "Delete this task" }).click();
    await page.locator(".tws-pop .tws-go").click();
    await expect(row).toHaveCount(0, { timeout: 15_000 });
  } finally {
    for (const d of parked) await setDone(d, d.fields?.done ? d.fields.done.booleanValue : undefined);
  }
});

test("shots: the Query Centre's card", async ({ page }) => {
  test.setTimeout(120_000);
  await open(page);
  await page.locator(`${PG} [data-tws-row][data-kind="send"]`).first().click();
  await page.waitForTimeout(700);
  await page.locator(`${PG} [data-tws="preview"]`).click();
  await page.waitForTimeout(1800);
  await shot(page, "08-query-centre-card");
});
