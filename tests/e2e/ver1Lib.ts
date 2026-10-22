/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Versions v1 — shared helpers for the VER1 locks and shots: the ms21-filled account (its book carries three
 * versions, an active package and one live query with no version), opened on /manuscripts/versions.
 */
import { expect, type Browser, type Page } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { FILLED_EMAIL, MS_ID } from "./ms21Fixture.mjs";

const pw = () => { for (const l of readFileSync(".env.local", "utf8").split("\n")) { const m = /^\s*SA_E2E_PASSWORD\s*=\s*(.*)$/.exec(l); if (m) return m[1].trim().replace(/^["']|["']$/g, ""); } throw new Error("no pw"); };

export async function ctxFor(browser: Browser, baseURL: string, vp: { width: number; height: number }, scale = 1) {
  const port = new URL(baseURL).port || "443";
  const file = resolve(process.cwd(), `tests/e2e/.auth/${FILLED_EMAIL.split("@")[0]}-${port}.json`);
  if (!existsSync(file)) {
    const c = await browser.newContext({ baseURL, viewport: vp });
    const p = await c.newPage();
    await p.goto("/#/signin");
    await p.locator("#au-email").fill(FILLED_EMAIL);
    await p.locator("#au-pw").fill(pw());
    await p.getByRole("button", { name: /^Sign in$/ }).last().click();
    await expect(p.locator(".ws-work").first()).toBeVisible({ timeout: 30_000 });
    await c.storageState({ path: file, indexedDB: true });
    await c.close();
  }
  return browser.newContext({ storageState: file, viewport: vp, baseURL, deviceScaleFactor: scale });
}

/** Open the page; `free` turns on the dev-only Free review aid first. */
export async function openVersions(page: Page, opts: { free?: boolean } = {}) {
  await page.goto("/manuscripts/versions");
  await page.evaluate(([id, free]) => {
    localStorage.setItem("scriptally_active_manuscript_id", id as string);
    if (free) sessionStorage.setItem("sa.dev.versionsFree", "1"); else sessionStorage.removeItem("sa.dev.versionsFree");
  }, [MS_ID, !!opts.free] as const);
  await page.goto("/manuscripts/versions");
  await page.waitForSelector('[data-ver1="page"]:not([data-state="loading"])', { timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
}

export const VPS = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }];
