/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Card journeys v1, Phase 6 — THE OTHER DOORS, on the rendered page at 1440 × 900 (design-refs/card-journeys-v1 38):
 *
 *   G1  the Dashboard's Next up lead task (a send, a close or an offer to answer) opens the JOURNEY over the Dashboard:
 *       no query card, the path unchanged; Escape leaves the Dashboard as it was
 *   G2  the To-do desk: a send task's primary button is "Mark sent" (or "Mark resubmitted") and opens the journey over
 *       the To-do page, the path unchanged; the inline send questions are not shown
 *
 * ⚠️ EMULATOR ONLY: `npm run e2e:emu -- tests/e2e/cardJourneysDoors.measure.ts --project=measure`. Nothing here saves.
 */
import { test, type Page } from "@playwright/test";
import { openApp } from "./pageHeaderV2Lib";
import { Ledger, VP } from "./cardJourneysLib";

const settle = (page: Page, ms = 500) => page.waitForTimeout(ms);
const state = (page: Page) => page.evaluate(() => ({
  journey: document.querySelector('[data-cj="root"]')?.getAttribute("data-kind") ?? null,
  rar: !!document.querySelector('[data-rar="root"]'),
  card: !!document.querySelector('[data-side-panel][data-qp="panel"]'),
  drawer: !!document.querySelector('[data-qd="drawer"], .qd-drawer'),
  path: location.pathname + location.search,
}));

test("card journeys v1 · the Dashboard's Next up opens the journey over the page", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("doors-dashboard");
  await openApp(page, "/dashboard", VP);
  const lead = page.locator('[data-d2="next-top"]').filter({ visible: true }).first();
  const kind = await lead.getAttribute("data-kind").catch(() => null);
  const btn = lead.locator('[data-d2="open-task"], [data-d2="open-task-alt"]').first();
  const label = (await btn.innerText().catch(() => "")).trim();
  L.check("G1 · subject", (await btn.count()) === 1, `lead "${kind}", button "${label}"`);
  const before = await state(page);
  await btn.click(); await settle(page, 1200);
  const on = await state(page);
  L.check("G1 · a journey over the Dashboard", !!on.journey && !on.card, JSON.stringify(on));
  L.check("G1 · the path does not change", on.path === before.path, `${before.path} → ${on.path}`);
  await page.keyboard.press("Escape"); await settle(page, 800);
  const off = await state(page);
  L.check("G1 · Escape leaves the Dashboard as it was", !off.journey && !off.card && off.path === before.path, JSON.stringify(off));
  L.done(4);
});

test("card journeys v1 · the To-do desk's send task opens the journey", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("doors-todo");
  await openApp(page, "/todo", VP);
  const row = page.locator('[data-tws-row][data-kind="send"], [data-tws-row][data-kind="rr"]').filter({ visible: true }).first();
  L.check("G2 · subject", (await row.count()) === 1, `${await row.count()} send rows`);
  if (!(await row.count())) { L.done(1); return; }
  await row.click(); await settle(page, 900);
  const primary = page.locator('[data-tws="primary"]').filter({ visible: true }).first();
  const label = (await primary.innerText().catch(() => "")).trim();
  L.check("G2 · the desk's button", /^Mark (sent|resubmitted)$/.test(label), `"${label}"`);
  const before = await state(page);
  await primary.click(); await settle(page, 1200);
  const on = await state(page);
  L.check("G2 · a journey over the To-do page", on.journey === "send" && !on.card, JSON.stringify(on));
  L.check("G2 · the path does not change", on.path === before.path, `${before.path} → ${on.path}`);
  await page.keyboard.press("Escape"); await settle(page, 800);
  L.check("G2 · Escape closes it", !(await state(page)).journey, JSON.stringify(await state(page)));
  L.done(5);
});
