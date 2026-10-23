/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Versions v2 — shared helpers for the VER2 locks and shots. The account is v1's ms21-filled harness account; the
 * books are seeded by tests/e2e/ver2Fixture.mjs (`ver2-ms` with versions, `ver2-pre` with queries and no versions).
 */
import { expect, type Browser, type Page } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { FILLED_EMAIL } from "./ms21Fixture.mjs";

const pw = () => { for (const l of readFileSync(".env.local", "utf8").split("\n")) { const m = /^\s*SA_E2E_PASSWORD\s*=\s*(.*)$/.exec(l); if (m) return m[1].trim().replace(/^["']|["']$/g, ""); } throw new Error("no SA_E2E_PASSWORD in .env.local"); };

/** A signed-in context on the ms21-filled harness account (the session is cached per port, as v1's was). */
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

export const VER2_MS = "ver2-ms";
export const VER2_PRE = "ver2-pre";
export const VER2_MANY = "ver2-many";
export const VER2_FRESH = "ver2-fresh";
export const VER2_WARM = "ver2-warm";
export const VER2_COLD = "ver2-cold";
export const VPS = [{ width: 1512, height: 982 }, { width: 1280, height: 832 }];

/** Open the Versions page on one book; `free` turns on the dev-only Free review aid first. */
export async function openV2(page: Page, msId: string = VER2_MS, opts: { free?: boolean; guideOff?: boolean } = {}) {
  await page.goto("/manuscripts/versions");
  await page.evaluate(([id, free]) => {
    localStorage.setItem("scriptally_active_manuscript_id", id as string);
    if (free) sessionStorage.setItem("sa.dev.versionsFree", "1"); else sessionStorage.removeItem("sa.dev.versionsFree");
  }, [msId, !!opts.free] as const);
  await page.goto("/manuscripts/versions");
  await page.waitForSelector('[data-vv2="page"]:not([data-state="loading"])', { timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
}

/** The visible scroller's top, so a probe can bring an element into view without scrollIntoView's smooth motion. */
export async function scrollInto(page: Page, sel: string, offset = 120) {
  await page.evaluate(([s, o]) => {
    const el = document.querySelector(s as string) as HTMLElement | null;
    const sc = [...document.querySelectorAll<HTMLElement>(".wpg-scroll")].find((e) => e.offsetHeight > 0);
    if (el && sc) sc.scrollTop += el.getBoundingClientRect().top - sc.getBoundingClientRect().top - (o as number);
  }, [sel, offset] as const);
  await page.waitForTimeout(250);
}
