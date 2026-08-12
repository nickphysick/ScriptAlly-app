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

  /* ⚠️ WAIT FOR THE SHELL, NOT FOR A URL. A URL can change before the app has data, and a
     measurement taken then reads a skeleton. `.wpg` or the sidebar means the workspace is up. */
  await expect(page.locator(".ws-panel, .sv2-app, #app-stage-scroll").first()).toBeVisible({ timeout: 30_000 });
  await page.context().storageState({ path: STORAGE_STATE });
});
