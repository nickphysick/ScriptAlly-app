/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sign-in & security — measured on the built page.
 *
 * ⚠️ THE HARNESS ACCOUNT IS EMAIL/PASSWORD, so only the `password` branch can be exercised on a
 * real page; the `federated-only` and `both` branches are covered by `accountSecurity.test.ts`
 * against the pure derivation. That split is stated rather than papered over — a measurement of a
 * branch the account cannot reach would be a measurement of nothing.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

test("the password branch renders, and nothing claims a date it does not have", async ({ page }) => {
  await openRoute(page, "/account/security", { width: 1440, height: 900 });
  const panel = (await page.locator("#acct-panel").textContent()) ?? "";
  console.log("SECURITY PANEL:\n" + panel.replace(/\s+/g, " ").slice(0, 600));

  expect(panel).toContain("Password");
  expect(panel).toContain("Change password");
  expect(panel).not.toContain("There's no ScriptAlly password");

  /* ⚠️ THE ABSENCE THAT MATTERS. Firebase exposes no password-changed timestamp; any "Last
     changed" line here would be another date wearing the wrong label. */
  expect(panel.toLowerCase()).not.toContain("last changed");

  /* Out of scope, and absent rather than rendered as coming-soon rows. */
  for (const gone of ["Two-factor", "passkey", "Coming soon"]) {
    expect(panel.toLowerCase(), gone).not.toContain(gone.toLowerCase());
  }
});

test("the email is read-only and carries a verification chip", async ({ page }) => {
  await openRoute(page, "/account/security", { width: 1440, height: 900 });
  const field = await page.evaluate(() => {
    const el = document.querySelector("#account-email") as HTMLInputElement | null;
    return el ? { readOnly: el.readOnly, value: el.value } : null;
  });
  const panel = (await page.locator("#acct-panel").textContent()) ?? "";
  console.log("email:", JSON.stringify(field));
  expect(field!.readOnly).toBe(true);
  expect(field!.value).toContain("@");
  expect(/Verified|Unverified/.test(panel), "a verification chip must be present").toBe(true);
});

test("sign-out-everywhere reports the truth rather than a quiet success", async ({ page }) => {
  await openRoute(page, "/account/security", { width: 1440, height: 900 });
  const btn = page.locator('#acct-panel button:has-text("Sign out of all other sessions")');
  expect(await btn.count()).toBe(1);
  await btn.click();
  await page.waitForTimeout(600);
  const panel = (await page.locator("#acct-panel").textContent()) ?? "";
  console.log("after click:", panel.replace(/\s+/g, " ").match(/isn.t available[^.]*\./)?.[0]);

  expect(panel, "it must say it did not happen").toContain("isn't available yet");
  /* ⚠️ AND IT MUST NOT HAVE SIGNED THIS DEVICE OUT — the helper text promises the opposite. */
  expect(new URL(page.url()).pathname).toBe("/account/security");
});
