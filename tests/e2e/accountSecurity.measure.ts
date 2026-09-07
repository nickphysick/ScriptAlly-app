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

  /* ⚠️ NARROWED FROM A WORD BAN TO A CONTROL BAN (settings-mode pack, Phase 3) — AND THIS IS THE
     ONE RETARGET IN THIS PACK THAT IS A JUDGEMENT CALL RATHER THAN A CORRECTION. It banned the
     STRINGS "Two-factor", "passkey" and "Coming soon" anywhere in the panel, as a proxy for its
     stated claim: these are "absent rather than rendered as coming-soon ROWS". The claim is about
     controls. A dead control is what this repo has removed four times — the pen name field, the
     author photo, the sessions button, the date format — and every one of them was a thing you
     could click that did nothing.

     The card's foot now carries one sentence saying passkeys and two-step verification come after
     launch. It is not clickable, it is not a row, and it is what the pack asked for. So the ban is
     restated as what it means: no CONTROL may carry those words, and none may be disabled.

     ⚠️ AND THE TENSION IS REAL RATHER THAN RESOLVED. "Coming after launch" is a roadmap promise on
     a settings page, which is the class of sentence this repo is otherwise strict about — copy
     asserts what the code does today. It is reported for a ruling rather than decided here; if the
     answer is that the sentence goes, this case narrows back to the word ban in one line. */
  const advertised = await page.evaluate(() => {
    const words = ["two-factor", "passkey", "coming soon"];
    const controls = [...document.querySelectorAll("#acct-panel button, #acct-panel a, #acct-panel [role='switch']")];
    return controls
      .map((c) => ({ text: (c.textContent ?? "").toLowerCase(), disabled: (c as HTMLButtonElement).disabled || c.getAttribute("aria-disabled") === "true" }))
      .filter((c) => words.some((w) => c.text.includes(w)) || c.disabled)
      .map((c) => c.text.slice(0, 40));
  });
  expect(advertised, "a coming-soon or disabled control is on the security card").toEqual([]);

  /* Population: the sweep must have looked at some controls, or an empty panel passes it. */
  const controlCount = await page.evaluate(() =>
    document.querySelectorAll("#acct-panel button, #acct-panel [role='switch']").length);
  expect(controlCount, "no controls found — the sweep measured nothing").toBeGreaterThan(2);
});

test("the email row states the address, and carries a verification chip", async ({ page }) => {
  await openRoute(page, "/account/security", { width: 1440, height: 900 });
  const panel = (await page.locator("#acct-panel").textContent()) ?? "";

  /* ⚠️ RETARGETED FROM A READ-ONLY `<input>` (settings-mode pack, Phase 2). The address was an
     uneditable field with a lock icon; it is a row VALUE now, because a field you cannot type in is
     a control that spends its whole life saying no — the same rule that removed the Pen name field.
     The CLAIM is unchanged and is the one that matters: the card about your email address states
     what that address is. This phase's own measurement caught the row shipping WITHOUT it, which is
     why it is asserted on the rendered text rather than on any element's shape. */
  expect(panel).toContain("Email address");
  expect(panel, "the card about your address does not say what it is").toMatch(/[^\s@]+@[^\s@]+/);
  expect(/Verified|Unverified/.test(panel), "a verification chip must be present").toBe(true);

  /* ⚠️ AND THE TWO "Change" BUTTONS CARRY THEIR NOUNS. Shortened to the bare verb — which the 280px
     control column first tempted — the page held two buttons with the identical accessible name
     doing different things, which a screen reader and a voice command both read as one control. */
  expect(panel).toContain("Change email");
  expect(panel).toContain("Change password");
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
