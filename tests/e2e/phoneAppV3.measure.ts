/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v3 — the measurement (design-refs/phone-app-v3/phone-app-v3.html). Phone suites run in the `pixel`
 * (Chromium) project; WebKit (`iphone`) once at the end.
 *
 * PA3_PROBE=1: shots of the paths in PA3_PATHS (comma-separated) into PA3_SHOTS, nothing asserted — a look, not a lock.
 */
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

export const PA3_PHONES = [{ width: 390, height: 844 }, { width: 360, height: 740 }] as const;

export async function openPhone3(page: Page, path: string, vp: { width: number; height: number }) {
  await openRoute(page, "/dashboard", { width: 1440, height: 900 });
  await page.setViewportSize(vp);
  await page.goto(path);
  await page.locator('[data-pa3="header"]').first().waitFor({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
}

test.describe("PA3 probe", () => {
  test.skip(!process.env.PA3_PROBE, "a look, on request");
  test("shots", async ({ page }) => {
    const dir = process.env.PA3_SHOTS ?? "reports/phone-app-v3/probe";
    mkdirSync(dir, { recursive: true });
    const paths = (process.env.PA3_PATHS ?? "/dashboard").split(",");
    let first = true;
    for (const spec of paths) {
      const [p, ...taps] = spec.split("|");
      if (first) { await openPhone3(page, p, PA3_PHONES[0]); first = false; }
      else { await page.goto(p); await page.locator('[data-pa3="header"]').first().waitFor({ timeout: 30_000 }); await page.waitForTimeout(1500); }
      for (const t of taps) { await page.locator(t).filter({ visible: true }).first().click({ timeout: 15_000 }); await page.waitForTimeout(1200); }
      const name = spec.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 60) || "root";
      const chain = await page.evaluate(() => {
        const out: string[] = [];
        let el: Element | null = [...document.querySelectorAll("[data-pa3]")].find((e) => (e as HTMLElement).offsetParent && ["today", "you", "queries", "agents"].includes(e.getAttribute("data-pa3") ?? "")) ?? null;
        while (el) { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); out.push(`${el.tagName.toLowerCase()}.${String((el as HTMLElement).className).slice(0, 60)} x=${Math.round(r.left)} w=${Math.round(r.width)} sw=${(el as HTMLElement).scrollWidth} pad=${cs.paddingLeft}/${cs.paddingRight} minw=${cs.minWidth}`); el = el.parentElement; }
        const wide = [...document.querySelectorAll("body *")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > innerWidth + 1 && (e as HTMLElement).offsetParent; }).slice(0, 15).map((e) => `${e.tagName}.${String((e as HTMLElement).className).slice(0, 50)} right=${Math.round(e.getBoundingClientRect().right)}`);
        return { vw: innerWidth, chain: out, wide };
      });
      writeFileSync(`${dir}/${name}.json`, JSON.stringify(chain, null, 1));
      await page.screenshot({ path: `${dir}/${name}.png`, fullPage: false });
      await page.screenshot({ path: `${dir}/${name}-full.png`, fullPage: true });
      expect(true).toBe(true);
    }
  });
});
