/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PHONE APP v2 — the report's pairs: each ref screen (design-refs/phone-app-v2/screens/) on the left, the app at
 * 390 × 844 and 360 × 780 (2×) on the right, written to reports/phone-app-v2/part-N/pairs/. Reads only.
 * PA2_PAIRS=<part> chooses the part's screens (the table below).
 */
import { test, type Page } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { DIR, PHONES, openPhone, tag } from "./pa2Lib";

test.use({ deviceScaleFactor: 2 });
test.setTimeout(600_000);

type Step = (p: Page) => Promise<void>;
const PARTS: Record<string, [string, string, Step][]> = {
  "part-1": [
    ["01-home", "/dashboard", async () => {}],
    ["12-search", "/dashboard", async (p) => { await p.locator('[data-pa="search-btn"]').click(); await p.waitForTimeout(900); }],
    ["13-plus-sheet", "/dashboard", async (p) => { await p.locator('[data-pa="plus"]').click(); await p.waitForTimeout(900); }],
    ["29-menu", "/dashboard", async (p) => { await p.locator('[data-pa="menu-btn"]').click(); await p.waitForTimeout(900); }],
    ["30-book-switcher", "/dashboard", async (p) => { await p.locator('[data-pa="book-chip"]').click(); await p.waitForTimeout(900); }],
    ["31-feedback", "/dashboard", async (p) => { await p.locator('[data-pa="feedback-btn"]').click(); await p.waitForTimeout(900); }],
  ],
  "part-2": [
    ["01-home", "/dashboard", async (p) => { await p.locator('[data-pa="hero-series"][data-k="active"]').click(); await p.locator('[data-pa="hero-range"][data-k="3M"]').click(); await p.waitForTimeout(300); }],
    ["02-home-scrolled", "/dashboard", async (p) => { await p.evaluate(() => { document.querySelector("#app-stage-scroll")!.scrollTop = 620; }); await p.waitForTimeout(700); }],
    /* the ref's 03 shows Replies · All; the app has no replies series, so the nearest is Sent · All */
    ["03-home-hero-replies", "/dashboard", async (p) => { await p.locator('[data-pa="hero-series"][data-k="sent"]').click(); await p.locator('[data-pa="hero-range"][data-k="All"]').click(); await p.waitForTimeout(300); }],
  ],
  "part-3": [
    ["04-queries", "/queries", async (p) => { await p.locator('[data-qm1="chip"][data-key="all"]').click(); await p.waitForTimeout(300); }],
    ["05-queries-filtered", "/queries", async (p) => { await p.locator('[data-qm1="chip"][data-key="you"]').click(); await p.waitForTimeout(300); }],
    ["06-queries-swipe", "/queries", async (p) => {
      await p.locator('[data-qm1="chip"][data-key="all"]').click(); await p.waitForTimeout(300);
      const b = (await p.locator('[data-qm1="row"][data-where="you"] .pa-row').first().boundingBox())!;
      await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await p.mouse.down();
      for (let i = 1; i <= 8; i++) await p.mouse.move(b.x + b.width / 2 + 15 * i, b.y + b.height / 2);
      await p.mouse.up(); await p.waitForTimeout(500);
    }],
    ["07-query-sheet", "/queries", async (p) => { await openOwed(p); }],
    ["08-query-sheet-full", "/queries", async (p) => {
      await openOwed(p);
      const g = (await p.locator('.pa-qsheet [data-pa="grab"]').boundingBox())!, H = p.viewportSize()!.height;
      await p.mouse.move(g.x + g.width / 2, g.y + 10); await p.mouse.down();
      for (let i = 1; i <= 10; i++) await p.mouse.move(g.x + g.width / 2, g.y + 10 - (H * 0.4 * i) / 10);
      await p.mouse.up(); await p.waitForTimeout(700);
    }],
    ["09-query-waiting", "/queries", async (p) => { await p.locator('[data-qm1="chip"][data-key="agent"]').click(); await p.waitForTimeout(300); await p.locator('[data-qm1="row"] .pa-row').first().click(); await p.locator('.pa-qsheet [data-qc149c="card"]').waitFor(); await p.waitForTimeout(900); }],
    ["10-query-more", "/queries", async (p) => { await openOwed(p); await p.locator('.pa-qsheet [data-qc149c="more-btn"]').click(); await p.waitForTimeout(800); }],
    ["11-birds-eye", "/queries", async (p) => { await p.locator('[data-pa="birds-btn"]').click(); await p.waitForTimeout(900); }],
  ],
};

/* a query the writer owes something on: a request, so the sheet's pinned foot is a next step */
const openOwed = async (p: Page) => {
  await p.locator('[data-qm1="chip"][data-key="all"]').click(); await p.waitForTimeout(300);
  await p.locator('[data-qm1="row"][data-status$="Requested"] .pa-row').first().click();
  await p.locator('.pa-qsheet [data-qc149c="card"]').waitFor(); await p.waitForTimeout(900);
};

const pair = async (page: Page, ref: string, app: Buffer, out: string) => {
  const b64 = (b: Buffer) => `data:image/png;base64,${b.toString("base64")}`;
  const refB = readFileSync(`design-refs/phone-app-v2/screens/${ref}.png`);
  const p2 = await page.context().newPage();
  await p2.setViewportSize({ width: 900, height: 900 });
  await p2.setContent(`<body style="margin:0;background:#ebe7df;display:flex;gap:24px;padding:20px;align-items:flex-start;font:13px sans-serif">
    <figure style="margin:0"><img src="${b64(refB)}" style="width:420px"><figcaption>ref ${ref}</figcaption></figure>
    <figure style="margin:0"><img src="${b64(app)}" style="width:390px"><figcaption>app</figcaption></figure></body>`);
  await p2.waitForTimeout(300);
  writeFileSync(out, await p2.screenshot({ fullPage: true }));
  await p2.close();
};

const PART = process.env.PA2_PAIRS ?? "part-1";
for (const vp of PHONES) {
  test(`PA2 pairs · ${PART} · ${tag(vp)}`, async ({ page }) => {
    mkdirSync(`${DIR}/${PART}/pairs`, { recursive: true });
    await openPhone(page, "/dashboard", vp);
    for (const [ref, path, step] of PARTS[PART] ?? []) {
      await page.goto(path); await page.locator('[data-pa="band"]').first().waitFor({ timeout: 20_000 }); await page.waitForTimeout(1800);
      await step(page);
      const app = await page.screenshot();
      writeFileSync(`${DIR}/${PART}/pairs/${ref}-app-${tag(vp)}.png`, app);
      await pair(page, ref, app, `${DIR}/${PART}/pairs/${ref}-pair-${tag(vp)}.png`);
      await page.keyboard.press("Escape"); await page.waitForTimeout(300); await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    }
  });
}
