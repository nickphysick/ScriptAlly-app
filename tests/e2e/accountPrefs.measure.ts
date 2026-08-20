/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Notifications + Preferences — and above all, THAT THE NEW FIELDS ACTUALLY PERSIST.
 *
 * ⚠️ A FIELD MISSING FROM THE `firestore.rules` ALLOWLIST IS DENIED SILENTLY. The toggle moves,
 * the optimistic local state updates, and nothing anywhere says the write bounced — the failure
 * only shows on the next load, which is exactly the shape a unit test and a screenshot both miss.
 * Every write here is therefore RELOADED and read back.
 *
 *   npm run build:dev && npx vite preview --port 4173 &
 *   SA_E2E_BASE_URL=http://localhost:4173 npx playwright test accountPrefs
 *
 * ⚠️ IT WRITES TO THE HARNESS ACCOUNT and restores every value at the end.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const sw = (name: string) => `#acct-panel [role="switch"][aria-label="${name}"]`;
const isOn = async (page: import("@playwright/test").Page, name: string) =>
  (await page.locator(sw(name)).getAttribute("aria-checked")) === "true";

test("a notification toggle survives a reload — the write reaches Firestore", async ({ page }) => {
  await openRoute(page, "/account/notifications", { width: 1440, height: 900 });
  const before = await isOn(page, "Weekly digest");

  await page.locator(sw("Weekly digest")).click();
  await page.waitForTimeout(1800);
  expect(await isOn(page, "Weekly digest"), "the switch flips locally").toBe(!before);

  await page.reload();
  await page.waitForTimeout(3500);
  const after = await isOn(page, "Weekly digest");
  console.log(`Weekly digest ${before} → toggled → reloaded ${after}`);
  expect(after, "⚠️ a rules denial would show HERE, as the old value coming back").toBe(!before);

  // restore
  await page.locator(sw("Weekly digest")).click();
  await page.waitForTimeout(1800);
  expect(await isOn(page, "Weekly digest")).toBe(before);
});

test("marketing consent defaults OFF and is one click to withdraw", async ({ page }) => {
  await openRoute(page, "/account/notifications", { width: 1440, height: 900 });

  /* ⚠️ THE DEFAULT IS THE ASSERTION THAT MATTERS. PECR wants affirmative consent, so an account
     that has never chosen must read off — and the harness account has never chosen. */
  expect(await isOn(page, "Product news"), "never pre-ticked").toBe(false);

  await page.locator(sw("Product news")).click();
  await page.waitForTimeout(1800);
  await page.reload();
  await page.waitForTimeout(3500);
  expect(await isOn(page, "Product news"), "granting persists").toBe(true);

  /* One click, immediate effect — no confirm, no "are you sure", no second screen. */
  await page.locator(sw("Product news")).click();
  await page.waitForTimeout(1800);
  await page.reload();
  await page.waitForTimeout(3500);
  expect(await isOn(page, "Product news"), "withdrawal persists too").toBe(false);
});

test("the section states what it can and cannot do, and the account-mail carve-out", async ({ page }) => {
  await openRoute(page, "/account/notifications", { width: 1440, height: 900 });
  const panel = (await page.locator("#acct-panel").textContent()) ?? "";
  console.log(panel.replace(/\s+/g, " ").slice(0, 400));

  expect(panel).toContain("About your querying");
  expect(panel).toContain("Marketing");
  expect(panel).toContain("doesn't send these emails yet");
  expect(panel).toContain("are always sent");
  /* No coming-soon rows survive anywhere on this card. */
  expect(panel.toLowerCase()).not.toContain("coming soon");
});

test("the time zone persists, and Preferences ships no control it cannot honour", async ({ page }) => {
  await openRoute(page, "/account/preferences", { width: 1440, height: 900 });
  const sel = "#account-timezone";
  const before = await page.inputValue(sel);
  console.log("timezone before:", before);

  const target = before === "Europe/Paris" ? "Europe/Dublin" : "Europe/Paris";
  await page.selectOption(sel, target);
  await page.waitForTimeout(1800);
  await page.reload();
  await page.waitForTimeout(3500);
  expect(await page.inputValue(sel), "the zone survives a reload").toBe(target);

  await page.selectOption(sel, before);
  await page.waitForTimeout(1800);

  /* ⚠️ DATE FORMAT AND WEEK-START ARE DELIBERATELY ABSENT — they would be display claims against
     93 en-GB call sites. Their absence is asserted so a later pass adds them WITH a formatter. */
  const panel = (await page.locator("#acct-panel").textContent()) ?? "";
  for (const gone of ["Date format", "Week starts", "DD/MM/YYYY"]) {
    expect(panel, gone).not.toContain(gone);
  }
  expect(panel).toContain("Workspace");
  expect(panel).toContain("Tasks");
  expect(panel).toContain("Open task settings");
});
