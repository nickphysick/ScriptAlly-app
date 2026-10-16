/**
 * Analytics v24 — the report's screenshots (not a lock): one beside each reference screen at 1512, 1280 and 390, then
 * the page at 1920 and 1024. AN24_SHOTS=1 to run; AN24_ONLY=<name fragment> to take a few. The empty page and the
 * one-query / one-pass / no-stated-time states are seeded and removed in the same run (tests/e2e/seedAn24.mjs).
 */
import { test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { openAn } from "./an17Lib";

const DIR = process.env.AN24_DIR ?? "reports/analytics-v24/shots";
const ONLY = process.env.AN24_ONLY ?? "";
const VP = (w: number) => (w <= 760 ? { width: w, height: 844 } : w === 1280 ? { width: 1280, height: 800 } : { width: w, height: 900 });
test.skip(!process.env.AN24_SHOTS, "AN24_SHOTS=1 to take the report's screenshots");

export async function openMs(page: Page, w: number, ms: string) {
  await page.addInitScript((id) => { try { localStorage.setItem("scriptally_active_manuscript_id", id); } catch { /* */ } }, ms);
  await openAn(page, VP(w));
}
export async function scrollToSec(page: Page, sel: string, off = 30) {
  await page.evaluate(({ sel, off }) => {
    const p = [...document.querySelectorAll<HTMLElement>('[data-a17="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
    const sc = p.closest(".wpg-scroll") as HTMLElement;
    const t = [...p.querySelectorAll<HTMLElement>(sel)].find((e) => e.getBoundingClientRect().height > 0);
    if (t) sc.scrollTop = t.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - off;
  }, { sel, off });
  await page.waitForTimeout(300);
}

const SECS = [["01-what-happened", 0], ["02-benchmarking", 1], ["03-how-many", 2], ["04-reply-when-said", 3], ["05-still-waiting", 4], ["06-moments", 5], ["07-note", 6]] as const;
const want = (name: string) => !ONLY || ONLY.split(",").some((o) => name.includes(o));

test("populated", async ({ page }) => {
  test.setTimeout(600_000);
  mkdirSync(DIR, { recursive: true });
  for (const w of [1512, 1280, 390]) {
    await openMs(page, w, "seed-ms-1");
    if (want(`00-top-${w}`)) await page.screenshot({ path: `${DIR}/00-top-${w}.png` });
    for (const [name, sec] of SECS) {
      if (!want(`${name}-${w}`)) continue;
      await scrollToSec(page, `[data-a17="sec"][data-sec="${sec}"]`);
      await page.screenshot({ path: `${DIR}/${name}-${w}.png` });
    }
  }
  for (const w of [1920, 1024]) {
    if (!want(`top-${w}`)) continue;
    await openMs(page, w, "seed-ms-1");
    await page.screenshot({ path: `${DIR}/top-${w}.png` });
  }
});
