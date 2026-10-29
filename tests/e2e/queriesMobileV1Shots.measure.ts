/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QUERIES ON A PHONE v1 — the report's shots: each screen at 390 × 844 (2× pixels), and a pair image with the mock's own
 * screen on the left. Reads only; the celebration's shot is taken inside the L10 lock, which writes and undoes.
 */
import { test } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { DIR, chip, openQ } from "./qm1Lib";

test.use({ deviceScaleFactor: 2 });
test.setTimeout(400_000);

const pair = async (page: import("@playwright/test").Page, ref: string, app: Buffer, name: string) => {
  const a = readFileSync(`design-refs/queries-mobile-v1/screens/${ref}.png`).toString("base64");
  const b = app.toString("base64");
  const out = await page.evaluate(async ([x, y]) => {
    const load = (s: string) => new Promise<HTMLImageElement>((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = `data:image/png;base64,${s}`; });
    const [ia, ib] = await Promise.all([load(x), load(y)]);
    const h = 1688, wa = Math.round(ia.width * h / ia.height), wb = Math.round(ib.width * h / ib.height);
    const c = document.createElement("canvas"); c.width = wa + wb + 40; c.height = h;
    const g = c.getContext("2d")!; g.fillStyle = "#2b2722"; g.fillRect(0, 0, c.width, h);
    g.drawImage(ia, 0, 0, wa, h); g.drawImage(ib, wa + 40, 0, wb, h);
    return c.toDataURL("image/png").split(",")[1];
  }, [a, b] as const);
  writeFileSync(`${DIR}/pairs/${name}.png`, Buffer.from(out, "base64"));
};

test("QM1 shots · 390x844", async ({ page, context }) => {
  /* ⚠️ RETIRED 29 OCT (Phone app v2): these were the v1 report's shots; its + and Coming up buttons are gone. The phone's
     shots are taken by the PA2 locks (PA2_SHOTS=1). */
  test.skip(true, "superseded by the Phone app v2 shots");
  mkdirSync(`${DIR}/shots`, { recursive: true });
  mkdirSync(`${DIR}/pairs`, { recursive: true });
  const shot = async (name: string) => { const b = await page.screenshot(); writeFileSync(`${DIR}/shots/${name}.png`, b); return b; };
  await openQ(page, { width: 390, height: 844 });
  const scratch = await context.newPage();
  const go = async (ref: string, name: string) => { const b = await shot(name); await pair(scratch, ref, b, name); };
  await chip(page, "you"); await page.locator('[data-qm1="body"]').evaluate((e) => { e.scrollTop = 0; }); await go("01-your-move", "01-your-move");
  await chip(page, "all"); await page.locator('[data-qm1="body"]').evaluate((e) => { e.scrollTop = 0; }); await go("02-all", "02-all");
  await chip(page, "agent"); await page.locator('[data-qm1="body"]').evaluate((e) => { e.scrollTop = 0; }); await go("03-waiting", "03-waiting");
  await page.locator('[data-qm1="cal-btn"]').click(); await page.waitForTimeout(800); await go("04-coming-up", "04-coming-up");
  await page.locator('[data-qm1="back"]').click(); await page.waitForTimeout(500);
  await chip(page, "quiet");
  await page.locator('[data-qm1="row"] .qm1-in').first().click();
  await page.locator('[data-qm1="query"] [data-qc149c="card"]').waitFor();
  await page.waitForTimeout(800); await go("05-query", "05-query");
  await page.locator('[data-qm1="body"]').evaluate((e) => { e.scrollTop = 560; }); await page.waitForTimeout(300); await go("05-query-scrolled", "05-query-scrolled");
  await page.locator('[data-qm1="back"]').click(); await page.waitForTimeout(500);
  await page.locator('[data-qm1="body"]').evaluate((e) => { e.scrollTop = 0; });
  await page.locator('[data-qm1="plus"]').click(); await page.waitForTimeout(500); await go("06-plus", "06-plus");
  await page.keyboard.press("Escape");
  await chip(page, "quiet"); await page.locator('[data-qm1="body"]').evaluate((e) => { e.scrollTop = 0; }); await shot("08-gone-quiet");
  await chip(page, "closed"); await shot("09-closed");
  await page.setViewportSize({ width: 360, height: 780 }); await chip(page, "you"); await shot("10-your-move-360");
});
