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

/* ⚠️ THE SESSIONS BLOCK IS GONE, and this asserts the absence rather than deleting the test with
   it. It was built, wired to a named stub and honest about being unable to act — and an honest
   dead control is still a dead control. If it comes back it must come back with a server action
   behind it, which is a change this assertion will make someone notice. */
test("there is no sessions control — an honest apology is still a dead control", async ({ page }) => {
  await openRoute(page, "/account/security", { width: 1440, height: 900 });
  const panel = (await page.locator("#acct-panel").textContent()) ?? "";
  expect(await page.locator('#acct-panel button:has-text("Sign out of all other sessions")').count()).toBe(0);
  for (const gone of ["Other sessions", "Ends every other signed-in session", "isn't available yet"]) {
    expect(panel, gone).not.toContain(gone);
  }
  /* Signing out of THIS device is a different control and lives in Your data — untouched. */
  const data = await openRoute(page, "/account/data", { width: 1440, height: 900 })
    .then(() => page.locator("#acct-panel").textContent());
  expect(data ?? "").toContain("Sign out");
});
