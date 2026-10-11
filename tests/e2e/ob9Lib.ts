/**
 * Onboarding v9 — what its locks share: the way into `#/onb-lab`, the readings file and the
 * mutation switch. `OB9_MUTATE=<lock>` applies that lock's named break in the page.
 */
import { expect, type Page } from "@playwright/test";
import { appendFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

export const OUT = resolve("reports/onb-v9");
export const MUTATE = process.env.OB9_MUTATE ?? "";
export const SHOTS = !!process.env.OB9_SHOTS;
export const WIDE = { width: 1440, height: 900 };
export const MID = { width: 1280, height: 800 };
export const PHONE = { width: 400, height: 860 };

export function record(lock: string, name: string, value: unknown) {
  mkdirSync(OUT, { recursive: true });
  appendFileSync(resolve(OUT, `readings${MUTATE ? `-mutated-${MUTATE}` : ""}.jsonl`), JSON.stringify({ lock, name, value }) + "\n");
}
export async function shot(page: Page, name: string, fullPage = false) {
  if (!SHOTS) return;
  mkdirSync(resolve(OUT, "shots"), { recursive: true });
  await page.screenshot({ path: resolve(OUT, "shots", `${name}.png`), fullPage });
}

/** Open a lab screen. `motion: "reduce"` asks the browser for reduced motion before the page loads. */
export async function lab(page: Page, q: string, vp = WIDE, opts: { motion?: "reduce" | "no-preference" } = {}) {
  await page.emulateMedia({ reducedMotion: opts.motion ?? "no-preference" });
  await page.setViewportSize(vp);
  await page.goto("/#/onb-lab?" + q, { waitUntil: "load" });
  /* the hash alone does not remount the app when only the query changes */
  await page.reload({ waitUntil: "load" });
  await page.locator(".sf").first().waitFor({ state: "visible", timeout: 20_000 });
  await page.evaluate(() => (document as Document & { fonts: { ready: Promise<unknown> } }).fonts.ready);
}
/** No horizontal overflow: the document is no wider than the window. */
export async function noOverflow(page: Page, where: string) {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(over, `${where}: the page does not scroll sideways`).toBeLessThanOrEqual(1);
}
/** Wait until nothing on the screen is still animating. */
export async function settled(page: Page, ms = 2600) {
  await page.waitForTimeout(ms);
}
