/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Your data — the deletion flow, driven rather than assumed.
 *
 * ⚠️ IT SCHEDULES A REAL DELETION ON THE HARNESS ACCOUNT AND CANCELS IT. Safe by construction:
 * scheduling writes a dated record and removes nothing, and no purge job exists to act on it. The
 * cancel is asserted, not merely attempted, and the account is left clean.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { DELETION_CONFIRM_WORD, DELETION_GRACE_DAYS } from "../../src/lib/accountDeletion";

const OPEN = '#acct-panel button:has-text("Delete account…")';
const CONFIRM = "#del-confirm";
const CONFIRM_BTN = "#del-confirm-btn";

test("the delete button stays disabled until DELETE is typed exactly", async ({ page }) => {
  await openRoute(page, "/account/data", { width: 1440, height: 900 });
  await page.locator(OPEN).click();
  await page.waitForTimeout(500);

  const disabled = async () => page.locator(CONFIRM_BTN).isDisabled();
  expect(await disabled(), "disabled on an empty field").toBe(true);

  for (const near of ["DELET", "delete my account", "yes", "DELETEE", "  "]) {
    await page.fill(CONFIRM, near);
    await page.waitForTimeout(150);
    expect(await disabled(), `still disabled for ${JSON.stringify(near)}`).toBe(true);
  }

  await page.fill(CONFIRM, DELETION_CONFIRM_WORD);
  await page.waitForTimeout(200);
  expect(await disabled(), "armed on the exact word").toBe(false);

  /* Typing away from it disarms again — the gate is the value, not a one-way latch. */
  await page.fill(CONFIRM, "DELET");
  await page.waitForTimeout(200);
  expect(await disabled()).toBe(true);

  await page.keyboard.press("Escape");
});

test("scheduling records a cancellable request, and cancelling clears it", async ({ page }) => {
  await openRoute(page, "/account/data", { width: 1440, height: 900 });
  await page.locator(OPEN).click();
  await page.waitForTimeout(500);
  await page.fill(CONFIRM, DELETION_CONFIRM_WORD);
  await page.locator(CONFIRM_BTN).click();
  await page.waitForTimeout(2200);

  let panel = (await page.locator("#acct-panel").textContent()) ?? "";
  console.log("SCHEDULED:", panel.replace(/\s+/g, " ").match(/due for deletion[^.]*\./)?.[0]);
  expect(panel).toContain("due for deletion");
  expect(panel).toContain("Cancel deletion");
  expect(panel).toContain("Nothing has been removed");
  /* ⚠️ NO PROMISE OF AN AUTOMATIC PURGE — there is no job. */
  expect(panel).not.toContain("will be deleted");
  expect(panel).toContain("isn't automatic yet");
  /* The request control is REPLACED, not duplicated. */
  expect(await page.locator(OPEN).count(), "no second delete button").toBe(0);

  /* It survives a reload — the write reached Firestore through the new allowlist entry. */
  await page.reload();
  await page.waitForTimeout(3500);
  panel = (await page.locator("#acct-panel").textContent()) ?? "";
  expect(panel, "⚠️ a rules denial would show HERE").toContain("due for deletion");

  await page.locator('#acct-panel button:has-text("Cancel deletion")').click();
  await page.waitForTimeout(2200);
  await page.reload();
  await page.waitForTimeout(3500);
  panel = (await page.locator("#acct-panel").textContent()) ?? "";
  expect(panel, "cancelling persists too").not.toContain("due for deletion");
  expect(await page.locator(OPEN).count(), "the request control returns").toBe(1);
});

test("the modal names what goes and states the window", async ({ page }) => {
  await openRoute(page, "/account/data", { width: 1440, height: 900 });
  await page.locator(OPEN).click();
  await page.waitForTimeout(500);
  /* ⚠️ SCOPED BY `aria-labelledby`, NOT BY `[role="dialog"]`. The dashboard's first-run tour card
     is also a dialog and sits in the same document, so the bare role selector is ambiguous
     whenever the tour has not been dismissed — a strict-mode violation on some runs and a silent
     wrong-element read in any code that took `.first()`. */
  const dialog = (await page.locator('[aria-labelledby="del-title"]').textContent()) ?? "";
  console.log(dialog.replace(/\s+/g, " ").slice(0, 320));

  for (const named of ["manuscripts", "agents", "queries"]) {
    expect(dialog.toLowerCase(), named).toContain(named);
  }
  expect(dialog).toContain(`${DELETION_GRACE_DAYS} days`);
  expect(dialog).toContain("Nothing is removed at this point");
  await page.keyboard.press("Escape");
});

test("export is framed as the portability right, and retention is stated", async ({ page }) => {
  await openRoute(page, "/account/data", { width: 1440, height: 900 });
  const panel = (await page.locator("#acct-panel").textContent()) ?? "";
  expect(panel).toContain("A complete copy of everything on your account");
  expect(panel).toContain("another program can read");
  expect(panel).toContain("How long we keep it");
  expect(panel).toContain("kept for as long as your account exists");
  /* No legalese — the right is described, not cited. */
  for (const w of ["Article", "GDPR", "data subject", "pursuant"]) {
    expect(panel, w).not.toContain(w);
  }
});
