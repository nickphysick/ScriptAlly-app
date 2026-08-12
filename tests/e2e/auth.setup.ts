/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Log in ONCE, reuse the session.
 *
 * ⚠️ THE PASSWORD IS READ FROM THE ENVIRONMENT AND APPEARS IN NO TRACKED FILE. It lives in
 * `.env.local`, which `.gitignore` has covered since before Playwright existed. If it is missing
 * this fails with an instruction rather than a stack trace — a silent skip would leave every
 * measurement running signed-out, against the marketing landing, reporting confident numbers about
 * the wrong page.
 *
 * ⚠️ AND THE SAVED SESSION IS A CREDENTIAL TOO. `storageState` is a logged-in Firebase session;
 * `tests/e2e/.auth/` is gitignored for the same reason the password is.
 */
import { test as setup, expect } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { STORAGE_STATE } from "../../playwright.config";

const EMAIL = process.env.SA_E2E_EMAIL ?? "harness@scriptally.test";

/** `.env.local` is not loaded by anything in this process, so read it directly. */
function passwordFromEnvLocal(): string | null {
  if (process.env.SA_E2E_PASSWORD) return process.env.SA_E2E_PASSWORD;
  const p = resolve(process.cwd(), ".env.local");
  if (!existsSync(p)) return null;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = /^\s*SA_E2E_PASSWORD\s*=\s*(.*)$/.exec(line);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "") || null;
  }
  return null;
}

setup("authenticate", async ({ page }) => {
  const password = passwordFromEnvLocal();
  if (!password) {
    throw new Error(
      "No password. Put `SA_E2E_PASSWORD=…` in .env.local (gitignored) for " + EMAIL +
      ", or export SA_E2E_PASSWORD. Without it every measurement would run signed-out.",
    );
  }

  await page.goto("/#/signin");
  await page.locator("#au-email").fill(EMAIL);
  await page.locator("#au-pw").fill(password);
  await page.getByRole("button", { name: /^Sign in$/ }).last().click();

  /**
   * ⚠️ A FRESH ACCOUNT LANDS ON THE ONBOARDING GATE, NOT THE SHELL. `App.tsx`'s branch order is
   * load-bearing — `!currentUser → <Auth/>` → the onboarding gate → the AppShell — so signing in
   * is not enough: the first run met "Where are you in your querying journey?" and timed out
   * waiting for a sidebar that the app was correctly not rendering yet.
   *
   * "Skip setup" is Branch C: it marks onboarding complete on the user document and routes to the
   * dashboard. That write is the point — it is a one-off on a provisioned test account, and every
   * later run finds the gate already gone, so this block simply does not fire.
   */
  const shell = page.locator(".ws-panel, .sv2-app, #app-stage-scroll").first();
  for (let step = 0; step < 8; step += 1) {
    if (await shell.count()) break;
    /* ⚠️ THE LABEL IS "Skip this step", NOT "Skip setup" — I took the latter from `chrome.tsx`,
       which is a DIFFERENT onboarding component, and the selector matched nothing while the run
       failed on a timeout that named the shell instead. Reading the buttons off the real page is
       what found it. */
    const skip = page.getByRole("button", { name: /^Skip this step$/ });
    const cont = page.getByRole("button", { name: /^Continue/ });
    const option = page.getByRole("button", { name: /Just getting started/ });
    if (await skip.count()) { await skip.first().click(); }
    else if (await option.count()) { await option.first().click(); await cont.first().click(); }
    else if (await cont.count()) { await cont.first().click(); }
    else break;
    await page.waitForTimeout(1200);
  }

  /* ⚠️ WAIT FOR THE SHELL, NOT FOR A URL. A URL can change before the app has data, and a
     measurement taken then reads a skeleton. The sidebar or the stage means the workspace is up. */
  await expect(page.locator(".ws-panel, .sv2-app, #app-stage-scroll").first()).toBeVisible({ timeout: 30_000 });
  await page.context().storageState({ path: STORAGE_STATE });
});
