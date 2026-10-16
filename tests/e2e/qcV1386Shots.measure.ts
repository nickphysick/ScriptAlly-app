/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v138.6 — the report's screenshots: the Query Centre and the Contact list at 1512 × 900 and 1280 × 800,
 * at rest, scrolled 1400, pinned, and pinned and scrolled 1400; and the pin's tooltip. Writes reports/qc-v138-6/shots/.
 * Asserts only that each state was reached.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { openRoute } from "./measure";

const OUT = "reports/qc-v138-6/shots";
const PAGES = [
  { key: "queries", route: "/queries", group: ".qcv-group[data-v138]", pin: '[data-qc138="pin"]' },
  { key: "agents", route: "/agents", group: ".clv-group", pin: '[data-cl16="full"]' },
] as const;

const scrollTo = (page: Page, g: string, y: number) => page.evaluate(([gg, top]) => {
  const grp = [...document.querySelectorAll<HTMLElement>(gg as string)].find((e) => e.getBoundingClientRect().width > 0)!;
  const sc = grp.closest<HTMLElement>(".wpg-scroll")!; sc.style.scrollBehavior = "auto"; sc.scrollTop = top as number;
}, [g, y] as const);
/* pressed on the element: Playwright's own click scrolls a stuck sticky header to its static position first */
const press = (page: Page, sel: string) => page.evaluate((s) => [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().width > 0)!.click(), sel);

test("v138.6 shots", async ({ page }) => {
  test.setTimeout(600_000);
  mkdirSync(OUT, { recursive: true });
  await page.addInitScript(() => { try { for (const k of ["contacts", "queries", "manuscripts"]) localStorage.setItem(`sa.guide.${k}`, "1"); for (const k of ["sa.pinList.queries", "sa.pinList.agents"]) localStorage.removeItem(k); } catch { /* */ } });
  for (const p of PAGES) for (const vp of [{ width: 1512, height: 900 }, { width: 1280, height: 800 }]) {
    const n = `${p.key}-${vp.width}`;
    await openRoute(page, p.route, vp);
    await page.locator(p.group).first().waitFor({ timeout: 30_000 });
    await page.waitForTimeout(1500); await page.mouse.move(5, 5);
    await page.screenshot({ path: `${OUT}/${n}-1-rest.png` });
    await scrollTo(page, p.group, 1400); await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/${n}-2-scrolled.png` });
    await scrollTo(page, p.group, 0); await page.waitForTimeout(300);
    await press(page, `${p.group} ${p.pin}`); await page.waitForTimeout(900); await page.mouse.move(5, 5);
    await expect(page.locator(`${p.group} ${p.pin}`).first()).toHaveAttribute("aria-pressed", "true");
    await page.screenshot({ path: `${OUT}/${n}-3-pinned.png` });
    await scrollTo(page, p.group, 1400); await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/${n}-4-pinned-scrolled.png` });
    if (vp.width === 1512) {
      await page.locator(`${p.group} ${p.pin}`).first().hover(); await page.waitForTimeout(400);
      const b = (await page.locator(`${p.group} ${p.pin}`).first().boundingBox())!;
      await page.screenshot({ path: `${OUT}/${n}-5-tooltip-pinned.png`, clip: { x: b.x - 120, y: b.y - 10, width: 180, height: 110 } });
    }
    await scrollTo(page, p.group, 0); await page.waitForTimeout(300);
    await press(page, `${p.group} ${p.pin}`); await page.waitForTimeout(900);
    if (vp.width === 1512) {
      await page.locator(`${p.group} ${p.pin}`).first().hover(); await page.waitForTimeout(400);
      const b = (await page.locator(`${p.group} ${p.pin}`).first().boundingBox())!;
      await page.screenshot({ path: `${OUT}/${n}-5-tooltip.png`, clip: { x: b.x - 120, y: b.y - 10, width: 180, height: 110 } });
      await page.mouse.move(5, 5);
    }
  }
});
