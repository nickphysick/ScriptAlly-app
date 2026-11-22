/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v152.1 — the report's screens, beside refs 01–14 (design-refs/query-centre-v152-1/screens), at 1280 × 800
 * and 1512 × 900, over the q152- fixtures (seeded and removed in the same run). Writes nothing.
 *
 *   bash tests/e2e/qc152Run.sh "node scripts/emu-e2e-inner.mjs tests/e2e/qc1521Shots.measure.ts --project=measure --workers=1"
 */
import { test, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { openRoute } from "./measure";

test.setTimeout(600_000);
const OUT = "reports/qc-v152-1/screens";
const SIZES = [{ width: 1280, height: 800 }, { width: 1512, height: 900 }] as const;
const CARD = "[data-qp='panel'] [data-qc152='card']";

test.beforeAll(() => { execSync("node tests/e2e/seedQc152.mjs", { stdio: "pipe" }); });
test.afterAll(() => { execSync("node tests/e2e/seedQc152.mjs --clean", { stdio: "pipe" }); });

async function open(page: Page, vp: { width: number; height: number }, group = "attention") {
  await page.addInitScript((g) => {
    try {
      sessionStorage.removeItem("qh.qc.filters"); sessionStorage.removeItem("qh.qc.collapsed1511"); sessionStorage.setItem("qh.qc.view150", "list");
      localStorage.setItem("qh.qc.view", JSON.stringify({ v: 1, group: g, sort: { key: "due", reversed: false }, density: "comfortable" }));
      localStorage.setItem("sa.guide.queries", "1"); localStorage.setItem("sa.guide.queries-explainer", "1"); localStorage.removeItem("sa.pinList.queries");
    } catch { /* private mode */ }
  }, group);
  await openRoute(page, "/queries", vp);
  await page.locator("[data-qc151='row'][data-id^='q152-']").first().waitFor({ timeout: 30_000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1000);
}
async function card(page: Page, key: string) {
  await page.evaluate((id) => {
    const r = document.querySelector<HTMLElement>(`[data-qc151='row'][data-id='${id}']`);
    r?.scrollIntoView({ block: "center" });
    (r?.querySelector<HTMLElement>("td") ?? r)?.click();
  }, `q152-${key}`);
  await page.locator(`${CARD}[data-id='q152-${key}']`).waitFor({ timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(1100);
  await page.mouse.move(5, 5);
}
const tap = (page: Page, sel: string) => page.locator(sel).first().click({ timeout: 8000 }).catch(() => {});

for (const vp of SIZES) {
  test(`screens @ ${vp.width}`, async ({ page }) => {
    mkdirSync(OUT, { recursive: true });
    const shot = (n: string) => page.screenshot({ path: `${OUT}/${n}-${vp.width}.png` });
    await open(page, vp);
    /* 01 the colour rule on three whole cards: an offer, materials requested, closed */
    await card(page, "offertold"); await shot("01a-colours-offer");
    await card(page, "fullreq"); await shot("01b-colours-materials");
    await card(page, "passed"); await shot("01c-colours-closed");
    /* 02 the footer per state */
    await card(page, "nudgedwait"); await shot("02a-footer-with-the-agent");
    await card(page, "quiet"); await shot("02b-footer-gone-quiet");
    await card(page, "fullreq"); await shot("02c-footer-materials");
    await card(page, "nudge"); await shot("02d-footer-nudge-due");
    await card(page, "offer"); await shot("02e-footer-offer-tell");
    /* 04–12 the thread's cases */
    await card(page, "seven"); await shot("12-collapsed");
    await tap(page, `${CARD} [data-qc152='fold']`); await page.waitForTimeout(400);
    await page.evaluate((c) => document.querySelector(`${c} [data-qc152='msg'][data-kind='nudge']`)?.scrollIntoView({ block: "start" }), CARD);
    await page.waitForTimeout(300); await shot("04-nudge-icon"); await shot("06-several-nudges");
    await card(page, "long"); await shot("05-base");
    await card(page, "rr"); await shot("07-rr");
    await card(page, "passed"); await shot("08-passed");
    await card(page, "withdrew"); await shot("09-withdrew");
    await card(page, "offertold"); await shot("10-offer-told");
    await card(page, "undated"); await shot("11-undated-nomat");
    /* 13 the record form's draft */
    await card(page, "fullreq");
    await tap(page, `${CARD} [data-qc152='reply-btn']`); await page.waitForTimeout(600); await shot("13-draft");
    await page.keyboard.press("Escape"); await page.waitForTimeout(300); await page.keyboard.press("Escape"); await page.waitForTimeout(500);
    /* 14 no colour */
    await card(page, "long");
    await page.evaluate((c) => { const t = document.querySelector<HTMLElement>(`${c} [data-qc152='thread']`); if (t) t.style.filter = "grayscale(1)"; }, CARD);
    await shot("14-no-colour");
    await page.keyboard.press("Escape"); await page.waitForTimeout(500);
    /* 03 the Queried pill and its group header */
    await open(page, vp, "status"); await shot("03-queried-pill");
  });
}
