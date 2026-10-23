/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Versions v2 — shared helpers for the VER2 locks and shots. The account is v1's ms21-filled harness account; the
 * books are seeded by tests/e2e/ver2Fixture.mjs (`ver2-ms` with versions, `ver2-pre` with queries and no versions).
 */
import type { Page } from "@playwright/test";

export { ctxFor } from "./ver1Lib";

export const VER2_MS = "ver2-ms";
export const VER2_PRE = "ver2-pre";
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
