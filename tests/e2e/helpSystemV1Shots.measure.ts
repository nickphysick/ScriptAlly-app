/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Help system v1 — the shots beside design-refs/help-system-v1/screens 01–12, at 1512 × 900 and 1280 × 800 (@2x), on
 * the target named by SA_E2E_BASE_URL (dev, for the report). 13 and 14 are the Help Centre prompt's.
 *
 * ⚠️ THE HARNESS ACCOUNT, NOT NICK'S: a measurement signs in with the harness's own test credentials only.
 * ⚠️ THE GUIDE STATE IS SET AND PUT BACK EXACTLY; the feedback send is answered by a route stub (nothing is written or
 *    emailed).
 */
import { test, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { openRoute } from "./measure";

const OUT = "reports/help-system-v1/shots";
const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
const flags = (args = "") => execSync(`node tests/e2e/guideFlags.mjs --page contacts ${args}`, { encoding: "utf8" }).trim().split("\n").pop()!;
const setGuide = (v: unknown) => flags(`--restore '${JSON.stringify(v)}'`);
const vis = (page: Page, sel: string) => page.locator(sel).filter({ visible: true }).first();

test.use({ deviceScaleFactor: 2 });

const go = async (page: Page, vp: { width: number; height: number }, fresh = false) => {
  await page.goto("about:blank");
  const base = process.env.SA_E2E_BASE_URL === "dev" ? "https://scriptally-dev.web.app" : process.env.SA_E2E_BASE_URL!;
  const token = `t${Date.now()}`;
  await page.context().addCookies([{ name: "hs1s", value: token, url: base }]);
  await page.addInitScript(({ fresh, token }) => {
    if (!document.cookie.split("; ").includes(`hs1s=${token}`) || sessionStorage.getItem("__hs1s") === token) return;
    sessionStorage.setItem("__hs1s", token);
    for (const k of Object.keys(localStorage)) if (/^sa\.guide\..*\.(skipped|last)$/.test(k) || k === "sa.guides.off" || k === "sa.whatsNew.seen") localStorage.removeItem(k);
    if (fresh) sessionStorage.removeItem("sa.guide.autoOpened"); else sessionStorage.setItem("sa.guide.autoOpened", "1");
  }, { fresh, token });
  await openRoute(page, "/agents", vp);
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(5, 600);
};
const shot = (page: Page, name: string, w: number) => page.screenshot({ path: `${OUT}/${name}-${w}@2x.png` });
const typeFind = async (page: Page, s: string) => {
  const input = page.locator("input[aria-label='Find an agent']");
  if (!(await input.evaluateAll((els) => els.some((e) => e.getBoundingClientRect().width > 4)))) await vis(page, "[data-cl19='find-wrap']").click();
  await vis(page, "input[aria-label='Find an agent']").fill(s);
};

test("HS1 shots", async ({ page }) => {
  test.setTimeout(900_000);
  mkdirSync(OUT, { recursive: true });
  await page.route(/sendBetaFeedback/, (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ result: { ok: true, emailed: true } }) }));
  const g0 = flags();
  try {
    for (const vp of SIZES) {
      const w = vp.width;
      /* 01 · the Help menu, the guide live */
      setGuide({ seen: true, done: { pin: true } });
      await go(page, vp);
      await vis(page, ".ws-help").click(); await page.waitForTimeout(500);
      await shot(page, "01-help-menu", w);
      /* 02 · guides switched off */
      await vis(page, "[data-hm='switch']").click(); await page.waitForTimeout(300);
      await page.keyboard.press("Escape"); await page.waitForTimeout(300);
      await vis(page, ".ws-help").click(); await page.waitForTimeout(500);
      await shot(page, "02-help-menu-guides-off", w);
      await vis(page, "[data-hm='restore']").click(); await page.waitForTimeout(600);
      await page.keyboard.press("Escape"); await page.waitForTimeout(600);
      /* 03 · the checklist opening by itself (a fresh session, unseen) */
      setGuide({ done: { pin: true } });
      await go(page, vp, true);
      await page.locator("[data-pck='popover']").waitFor({ timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(500);
      await shot(page, "03-checklist-auto-open", w);
      /* 04 · a spotlight */
      await vis(page, "[data-pck='item'][data-k='search'] > button").click(); await page.waitForTimeout(800);
      await shot(page, "04-spotlight", w);
      await page.keyboard.press("Escape"); await page.waitForTimeout(400);
      /* 05 · the done-note */
      setGuide({ seen: true, done: { pin: true } });
      await go(page, vp);
      await typeFind(page, "ab");
      await page.locator("[data-pck='note']").waitFor({ timeout: 8000 });
      await page.waitForTimeout(1500);
      await shot(page, "05-done-note", w);
      await typeFind(page, ""); await page.keyboard.press("Escape");
      /* 06 · List health's definition */
      await page.mouse.move(5, 600); await page.waitForTimeout(300);
      await vis(page, "[data-term='listHealth']").hover(); await page.waitForTimeout(700);
      await shot(page, "06-definition-health", w);
      /* 07 · a status's definition */
      await page.mouse.move(5, 600); await page.waitForTimeout(400);
      const st = vis(page, ".clv-row [data-cl17='stage'] .qh-term");
      await st.scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
      await st.hover(); await page.waitForTimeout(700);
      await shot(page, "07-definition-status", w);
      await page.mouse.move(5, 600); await page.waitForTimeout(400);
      /* 08–11 · feedback */
      await vis(page, ".ws-fbtn, .ws-fbb, .ws-fbi").click(); await page.waitForTimeout(500);
      await shot(page, "08-feedback-empty", w);
      await page.locator("[data-fb='kind'][data-k=\"Something's broken\"]").click();
      await page.locator("[data-fb='message']").fill("I pinned the list and the page jumped back to the top.");
      await page.locator("[data-fb='severity'] button").nth(1).click(); await page.waitForTimeout(300);
      await shot(page, "09-feedback-broken", w);
      await page.locator("[data-fb='context'] summary").click(); await page.waitForTimeout(300);
      await shot(page, "10-feedback-context", w);
      await page.locator("[data-fb='send']").click();
      await page.locator("[data-fb='sent']").waitFor({ timeout: 10_000 }).catch(() => {});
      await page.waitForTimeout(400);
      await shot(page, "11-feedback-sent", w);
      await page.locator("[data-fb='close2']").click().catch(() => {});
      /* 12 · the guide finished in this visit: the sage pill and the last note */
      setGuide({ seen: true, done: { pin: true, open: true, edit: true, hk: true } });
      await go(page, vp);
      await typeFind(page, "ab");
      await page.locator("[data-pck='note']").waitFor({ timeout: 8000 });
      await page.waitForTimeout(1200);
      await shot(page, "12-guide-finished", w);
      await typeFind(page, "");
    }
  } finally { setGuide(JSON.parse(g0)); }
});
