/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v116 — the report's shots, mirroring the ref's 01–11 (plus the 1280×650 states). Not a lock.
 */
import { test, type Page } from "@playwright/test";
import { DIR, openDash, type VP } from "./db116Lib";
import { STATS } from "./db105Lib";

const only = process.env.DB116_SHOT ?? "";
const want = (k: string) => !only || only.split(",").includes(k);
const shot = (page: Page, name: string) => page.screenshot({ path: `${DIR}/shots/${name}` });

async function hoverEl(page: Page, sel: string, dx = 0.5, dy = 0.5) {
  const b = (await page.locator(sel).first().boundingBox())!;
  await page.mouse.move(b.x + b.width * dx, b.y + b.height * dy);
  await page.waitForTimeout(700);
}

test("DB116 shots — 700 tall", async ({ page }) => {
  test.setTimeout(300_000);
  if (!want("11")) return;
  await openDash(page, { width: 1440, height: 700 });
  const card = page.locator('[data-d60="agents-hoop"]').first();
  await card.scrollIntoViewIfNeeded();
  await hoverEl(page, '[data-d60="agents-hoop"] [data-d116="key-row"][data-key="none"]', 0.9, 0.6);
  await shot(page, "11-onscreen-rule-agents-1440x700.png");
});

test("DB116 shots", async ({ page }) => {
  test.setTimeout(600_000);
  const V: VP = { width: 1440, height: 900 };
  await openDash(page, V);
  if (want("01")) {
    const b = (await page.locator('[data-probe="plot"]').first().boundingBox())!;
    await page.mouse.move(b.x + b.width * 0.62, b.y + 8);
    await page.waitForTimeout(400);
    await shot(page, "01-chart-week-1440x900.png");
  }
  const slice = (card: string, seg: string) => hoverEl(page, `[data-d60="${card}"] [data-d116="slice"][data-seg="${seg}"]`, 0.5, 0.5);
  if (want("02")) {
    /* a slice's own stroke: aim at the ring's left edge for a slice that covers it */
    await page.mouse.move(2, 2); await page.waitForTimeout(300);
    const r = (await page.locator('[data-d60="closed-hoop"] [data-d60="hoop"]').first().boundingBox())!;
    await page.mouse.move(r.x + r.width * 0.08, r.y + r.height * 0.5); await page.waitForTimeout(700);
    await shot(page, "02-closed-ring-1440x900.png");
  }
  if (want("03")) { await page.mouse.move(2, 2); await page.waitForTimeout(300); await hoverEl(page, '[data-d60="closed-row"][data-bucket="letter"]', 0.3, 0.5); await shot(page, "03-closed-key-passed-1440x900.png"); }
  if (want("04")) { await page.mouse.move(2, 2); await page.waitForTimeout(300); await hoverEl(page, '[data-d60="closed-row"][data-bucket="partial"]', 0.3, 0.5); await shot(page, "04-closed-key-empty-1440x900.png"); }
  if (want("05")) { /* the ref's "busier campaign": the account's own longest category, Passed on query */
    await page.mouse.move(2, 2); await page.waitForTimeout(300);
    const p = await page.evaluate(() => { const c = document.querySelector<SVGCircleElement>('[data-d60="closed-hoop"] [data-d116="slice"][data-seg="letter"]')!; const len = Number(c.getAttribute("stroke-dasharray")!.split(" ")[0]), at = -Number(c.getAttribute("stroke-dashoffset")); const a = ((at + len / 2) * 3.6 * Math.PI) / 180; const pt = new DOMPoint(50 + 42 * Math.cos(a), 50 + 42 * Math.sin(a)).matrixTransform(c.getScreenCTM()!); return { x: pt.x, y: pt.y }; });
    await page.mouse.move(p.x, p.y); await page.waitForTimeout(700);
    await shot(page, "05-closed-slice-more-1440x900.png");
  }
  const agentSlice = async (seg: string) => {
    await page.mouse.move(2, 2); await page.waitForTimeout(300);
    const p = await page.evaluate((seg) => { const c = document.querySelector<SVGCircleElement>(`[data-d60="agents-hoop"] [data-d116="slice"][data-seg="${seg}"]`)!; const len = Number(c.getAttribute("stroke-dasharray")!.split(" ")[0]), at = -Number(c.getAttribute("stroke-dashoffset")); const a = ((at + len / 2) * 3.6 * Math.PI) / 180; const pt = new DOMPoint(50 + 42 * Math.cos(a), 50 + 42 * Math.sin(a)).matrixTransform(c.getScreenCTM()!); return { x: pt.x, y: pt.y }; }, seg);
    await page.mouse.move(p.x, p.y); await page.waitForTimeout(700);
  };
  if (want("06")) { await agentSlice("querying"); await shot(page, "06-agents-ring-querying-1440x900.png"); }
  if (want("07")) { await agentSlice("closed"); await shot(page, "07-agents-ring-closed-1440x900.png"); }
  if (want("08")) { await page.mouse.move(2, 2); await page.waitForTimeout(300); await hoverEl(page, '[data-d60="agents-hoop"] [data-d116="key-row"][data-key="none"]', 0.3, 0.5); await shot(page, "08-agents-key-notqueried-1440x900.png"); }
  void slice;
});

test("DB116 shots — founding and 1280×650", async ({ page }) => {
  test.setTimeout(400_000);
  const flags = { __SA_FOUNDING_STATS: { ...STATS.fledgling, contributions: 4, tier: "archivist", nextTier: "scout", toNext: 4 } };
  if (want("09") || want("10")) {
    await openDash(page, { width: 1440, height: 900 }, flags);
    if (want("09")) await shot(page, "09-founding-rest-1440x900.png");
    if (want("10")) { await hoverEl(page, '[data-d105="card"]', 0.6, 0.55); await shot(page, "10-founding-hover-1440x900.png"); }
  }
  if (want("1280")) {
    await openDash(page, { width: 1280, height: 650 }, flags);
    await page.locator('[data-d60="closed-hoop"]').first().scrollIntoViewIfNeeded();
    await hoverEl(page, '[data-d60="closed-row"][data-bucket="letter"]', 0.3, 0.5);
    await shot(page, "closed-key-passed-1280x650.png");
    await page.mouse.move(2, 2); await page.waitForTimeout(300);
    await hoverEl(page, '[data-d60="agents-hoop"] [data-d116="key-row"][data-key="none"]', 0.8, 0.6);
    await shot(page, "agents-key-notqueried-1280x650.png");
    await page.mouse.move(2, 2); await page.waitForTimeout(300);
    await page.locator('[data-d105="card"]').first().scrollIntoViewIfNeeded();
    await shot(page, "founding-rest-1280x650.png");
    await hoverEl(page, '[data-d105="card"]', 0.6, 0.5);
    await shot(page, "founding-hover-1280x650.png");
  }
  if (want("task")) {
    await openDash(page, { width: 1440, height: 900 });
    for (let i = 0; i < 30; i++) {
      const k = await page.locator('[data-d71="task"]').first().getAttribute("data-kind");
      if (k === "close") break;
      await page.locator('[data-d71="next"]').first().click(); await page.waitForTimeout(300);
    }
    await page.mouse.move(2, 2); await page.waitForTimeout(400);
    await page.locator('[data-d71="task"]').first().screenshot({ path: `${DIR}/shots/task-close-framed-1440x900.png` });
  }
});
