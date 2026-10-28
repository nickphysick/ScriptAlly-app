/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v118.1 — the report's shots. Not a lock: it writes images, with the pointer drawn as a 6px dot.
 */
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { DIR, openDash, slicePoint } from "./db118Lib";

test.setTimeout(600_000);
const OUT = `${DIR}/shots`;
const dot = (page: Page, x: number, y: number) => page.evaluate(([px, py]) => {
  document.getElementById("db118-dot")?.remove();
  const d = document.createElement("div"); d.id = "db118-dot";
  Object.assign(d.style, { position: "fixed", left: `${px - 3}px`, top: `${py - 3}px`, width: "6px", height: "6px", borderRadius: "50%", background: "#e0218a", zIndex: "2147483647", pointerEvents: "none", boxShadow: "0 0 0 1.5px #fff" });
  document.body.appendChild(d);
}, [x, y] as const);
const rowAt = (page: Page, card: string, pick: "first" | "last") => page.evaluate(([c, p]) => {
  const rows = [...document.querySelectorAll<HTMLElement>(`[data-d60="${c}"] [data-d116="key-row"][data-go="1"]`)];
  const r = (p === "first" ? rows[0] : rows[rows.length - 1]).getBoundingClientRect();
  return { x: r.left + r.width * 0.6, y: r.top + r.height / 2 };
}, [card, pick] as const);

test("DB118 shots", async ({ page }) => {
  mkdirSync(OUT, { recursive: true });
  for (const [vp, t, pick] of [[{ width: 1440, height: 900 }, "1440x900", "first"], [{ width: 1280, height: 650 }, "1280x650", "last"]] as const) {
    await openDash(page, vp);
    const p = await rowAt(page, "closed-hoop", pick);
    await page.mouse.move(p.x, p.y, { steps: 3 }); await page.waitForTimeout(500); await dot(page, p.x, p.y);
    await page.screenshot({ path: `${OUT}/closed-row-hover-${t}.png` });
    await page.mouse.move(2, 2); await page.waitForTimeout(300);
    const segKey = await page.evaluate(() => [...document.querySelectorAll<SVGCircleElement>('[data-d60="agents-hoop"] [data-d116="slice"]')].sort((a, b) => parseFloat(String(b.getAttribute("stroke-dasharray"))) - parseFloat(String(a.getAttribute("stroke-dasharray"))))[0]?.dataset.seg ?? "");
    const s = (await slicePoint(page, "agents-hoop", segKey, 0.85))!;
    await page.mouse.move(s.x, s.y, { steps: 3 }); await page.waitForTimeout(500); await dot(page, s.x, s.y);
    await page.screenshot({ path: `${OUT}/agents-slice-hover-${t}.png` });
  }
  /* the "Your move" card */
  await openDash(page, { width: 1440, height: 900 });
  const card = page.locator('[data-d71="task"][data-key]').first();
  await expect(card).toBeVisible();
  await card.screenshot({ path: `${OUT}/your-move-card-1440x900.png` });
  /* the founding card after How it works closes (mouse, ✕) */
  await page.locator('[data-d105="info"]').first().click(); await page.waitForTimeout(500);
  await page.locator('[data-d105h="close"]').first().click(); await page.waitForTimeout(300);
  await page.mouse.move(2, 2); await page.waitForTimeout(500);
  await page.locator(".d105-fw.d116-tilt").first().screenshot({ path: `${OUT}/founding-after-how-1440x900.png` });
  /* click-throughs */
  await page.locator('[data-d60="closed-hoop"] [data-d116="key-row"][data-go="1"]').first().click(); await page.waitForTimeout(3000);
  await page.screenshot({ path: `${OUT}/qc-after-click-1440x900.png` });
  await openDash(page, { width: 1440, height: 900 });
  await page.locator('[data-d60="agents-hoop"] [data-d116="key-row"][data-go="1"]').nth(1).click(); await page.waitForTimeout(3000);
  await page.screenshot({ path: `${OUT}/contact-list-after-click-1440x900.png` });
});
