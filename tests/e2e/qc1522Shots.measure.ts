/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v152.2 — the report's screens, beside refs 01–76 (design-refs/query-centre-v152-2/screens), at 1280 × 800
 * and 1512 × 900, over the q152- fixtures (seeded and removed in the same run). Writes nothing it does not remove.
 *
 *   bash tests/e2e/qc152Run.sh "QC1522_SHOTS=list node scripts/emu-e2e-inner.mjs tests/e2e/qc1522Shots.measure.ts --project=measure --workers=1"
 *   QC1522_SHOTS = list | card | all (default all)
 */
import { test, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { openRoute } from "./measure";

test.setTimeout(900_000);
const OUT = "reports/qc-v152-2/screens";
const SIZES = [{ width: 1280, height: 800 }, { width: 1512, height: 900 }] as const;
const WHICH = process.env.QC1522_SHOTS ?? "all";
export const CARD = "[data-qp='panel'] [data-qc152='card']";

/* the card's journeys save onto the q152- fixtures (and only them), so each viewport starts from a fresh seed */
test.beforeEach(() => { execSync("node tests/e2e/seedQc152.mjs", { stdio: "pipe" }); });
test.afterAll(() => { execSync("node tests/e2e/seedQc152.mjs --clean", { stdio: "pipe" }); });

export async function openQc(page: Page, vp: { width: number; height: number }, group = "attention", plan: "free" | "pro" | null = null) {
  await page.addInitScript(([g, p]) => {
    try {
      sessionStorage.removeItem("qh.qc.filters"); sessionStorage.removeItem("qh.qc.collapsed1511"); sessionStorage.setItem("qh.qc.view150", "list");
      localStorage.setItem("qh.qc.view", JSON.stringify({ v: 1, group: g, sort: { key: "due", reversed: false }, density: "comfortable" }));
      localStorage.setItem("sa.guide.queries", "1"); localStorage.setItem("sa.guide.queries-explainer", "1"); localStorage.removeItem("sa.pinList.queries");
      if (p) (window as unknown as { __SA_QC_PLAN?: string }).__SA_QC_PLAN = p;
    } catch { /* private mode */ }
  }, [group, plan] as const);
  await openRoute(page, "/queries", vp);
  await page.locator("[data-qc151='row'][data-id^='q152-']").first().waitFor({ timeout: 30_000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1000);
}
const scroller = (page: Page, y: number) => page.evaluate((top) => {
  const t = document.querySelector<HTMLElement>("[data-qc151='page']");
  let el: HTMLElement | null = t;
  while (el && !(el.scrollHeight > el.clientHeight && /(auto|scroll)/.test(getComputedStyle(el).overflowY))) el = el.parentElement;
  el?.scrollTo({ top, behavior: "instant" as ScrollBehavior });
}, y);

for (const vp of SIZES) {
  test(`list screens @ ${vp.width}`, async ({ page }) => {
    test.skip(WHICH !== "all" && WHICH !== "list");
    mkdirSync(OUT, { recursive: true });
    const shot = (n: string) => page.screenshot({ path: `${OUT}/${n}-${vp.width}.png` });
    await openQc(page, vp);
    await shot("01-list-top");
    await page.evaluate(() => document.querySelector("[data-qc1522='divider']")?.scrollIntoView({ block: "start" }));
    await page.waitForTimeout(300);
    await shot("02-list-action-groups");
    await page.locator("[data-qc151='group']").first().click();
    await page.waitForTimeout(400);
    await shot("03-group-menu");
    await page.keyboard.press("Escape");
    await openQc(page, vp, "status"); await page.evaluate(() => document.querySelector("[data-qc1522='divider']")?.scrollIntoView({ block: "start" })); await page.waitForTimeout(300);
    await shot("04-grouped-by-status");
    await openQc(page, vp, "package"); await page.evaluate(() => document.querySelector("[data-qc1522='divider']")?.scrollIntoView({ block: "start" })); await page.waitForTimeout(300);
    await shot("05-grouped-by-package");
    await openQc(page, vp, "attention", "free");
    await page.evaluate(() => document.querySelector("[data-qc1522='divider']")?.scrollIntoView({ block: "start" })); await page.waitForTimeout(300);
    await page.locator("[data-qc151='group']").first().click(); await page.waitForTimeout(400);
    await shot("06-group-menu-free");
    await page.keyboard.press("Escape");
    await openQc(page, vp);
    await page.evaluate(() => {
      const t = [...document.querySelectorAll<HTMLElement>("[data-qc1511='group']")][3] ?? document.querySelector<HTMLElement>("[data-qc1511='group']");
      const rows = t?.querySelectorAll<HTMLElement>("[data-qc151='row']");
      (rows && rows.length > 1 ? rows[1] : t)?.scrollIntoView({ block: "start" });
    });
    await page.waitForTimeout(400);
    await shot("07-sticky-header");
    void scroller;
  });
}

async function card(page: Page, key: string) {
  await page.evaluate((id) => {
    const r = document.querySelector<HTMLElement>(`[data-qc151='row'][data-id='${id}']`);
    r?.scrollIntoView({ block: "center" });
    (r?.querySelector<HTMLElement>("td") ?? r)?.click();
  }, `q152-${key}`);
  await page.locator(`${CARD}[data-id='q152-${key}']`).waitFor({ timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(900);
  await page.mouse.move(5, 5);
}
const tap = async (page: Page, sel: string, wait = 450) => { await page.locator(sel).first().click({ timeout: 8000 }).catch(() => {}); await page.waitForTimeout(wait); };
/* a save: wait for the card's toast (the save has landed), then a beat for the bubble's settle */
const saved = async (page: Page) => { await page.locator(C("[data-qc1522='toast']")).waitFor({ timeout: 15_000 }).catch(() => {}); await page.waitForTimeout(600); };
const C = (sel: string) => `${CARD} ${sel}`;

for (const vp of SIZES) {
  test(`card screens @ ${vp.width}`, async ({ page }) => {
    test.skip(WHICH !== "all" && WHICH !== "card");
    mkdirSync(OUT, { recursive: true });
    const shot = (n: string) => page.screenshot({ path: `${OUT}/${n}-${vp.width}.png` });
    await openQc(page, vp);
    /* the offer (on the second manuscript, whose siblings are fixtures) */
    await card(page, "offer2"); await shot("10-offer-card");
    await tap(page, C("[data-qc152='reply-btn']")); await shot("11-offer-choices");
    await tap(page, C("[data-qc1522='offer-choices'] [data-v='time']")); await shot("12-tell-agents");
    await tap(page, C("[data-qc1522='later']"), 100); await saved(page); await shot("13-deciding-todo");
    await page.waitForTimeout(5600); /* the toast goes */
    await tap(page, C("[data-qc152='reply-btn']")); await tap(page, C("[data-qc1522='offer-choices'] [data-v='accept']")); await shot("14-accept");
    await tap(page, C("[data-qc1522='save']"), 100); await saved(page); await shot("15-accepted");
    await card(page, "offer"); await tap(page, C("[data-qc152='reply-btn']")); await tap(page, C("[data-qc1522='offer-choices'] [data-v='decline']")); await shot("16-decline");
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    /* mark sent */
    await card(page, "materials"); await shot("20-requested-card");
    await tap(page, C("[data-qc152='reply-btn']")); await shot("21-mark-sent");
    await tap(page, C("[data-qc1522='when'] [data-v='yesterday']")); await shot("22-mark-sent-yesterday");
    await tap(page, C("[data-qc1522='save']"), 100); await saved(page); await shot("23-sent-undo");
    /* nudge */
    await card(page, "nudge"); await shot("30-nudge-due-card");
    await tap(page, C("[data-qc152='reply-btn']")); await shot("31-nudge");
    await tap(page, C("[data-qc1522='save']"), 100); await saved(page); await shot("32-nudged");
    /* what did they say? */
    await card(page, "agent"); await shot("40-watch-card");
    await tap(page, C("[data-qc152='reply-btn']")); await shot("41-what-did-they-say");
    await tap(page, C("[data-qc1522='reply-types'] [data-v='req']"));
    await page.locator(C("[data-qc1522='their-words']")).fill("Thanks for this. Could you send me the full?").catch(() => {});
    await page.waitForTimeout(300); await shot("42-asked-full");
    await tap(page, C("[data-qc1522='save']"), 100); await saved(page); await shot("43-full-saved");
    await card(page, "nudgedwait"); await tap(page, C("[data-qc152='reply-btn']"));
    await tap(page, C("[data-qc1522='reply-types'] [data-v='passed']")); await shot("44-passed");
    await tap(page, C("[data-qc1522='reply-types'] [data-v='rr']")); await shot("45-rr");
    await tap(page, C("[data-qc1522='reply-types'] [data-v='offer']")); await shot("46-offer");
    await tap(page, C("[data-qc1522='reply-types'] [data-v='more']")); await shot("47-something-else");
    await page.keyboard.press("Escape"); await page.waitForTimeout(300); await tap(page, C("[data-qc1522='discard']"));
    /* close it */
    await card(page, "quiet"); await shot("50-gone-quiet-not-nudged");
    await tap(page, C("[data-qc1522='foot-link']")); await shot("51-close-with-tip");
    await tap(page, C("[data-qc1522='save']"), 100); await saved(page); await shot("52-closed-undo");
    await card(page, "nudgedquiet"); await shot("53-gone-quiet-nudged");
    await tap(page, C("[data-qc152='reply-btn']")); await shot("54-close-nudged");
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    /* reopen */
    await card(page, "passed"); await shot("60-closed-card");
    await tap(page, C("[data-qc152='reply-btn']")); await shot("61-reopen-why");
    await tap(page, C("[data-qc1522='reopen-why'] [data-v='mistake']")); await shot("62-reopen-mistake");
    await tap(page, C("[data-qc1522='back']")); await tap(page, C("[data-qc1522='reopen-why'] [data-v='back']")); await shot("63-reopen-got-back");
    await page.keyboard.press("Escape"); await page.waitForTimeout(300); await tap(page, C("[data-qc1522='discard']"));
    /* edit in place, details, materials */
    await card(page, "undated");
    const m = page.locator(C("[data-qc152='msg'][data-side='me']")).last();
    await m.hover().catch(() => {}); await page.waitForTimeout(400); await shot("70-edit-hover");
    await m.locator("[data-qc152='edit-step']").evaluate((b) => (b as HTMLElement).click()).catch(() => {}); await page.waitForTimeout(500); await shot("71-edit-in-place");
    await tap(page, C("[data-qc1522='delete-step']")); await shot("72-delete-confirm");
    await tap(page, C("[data-qc1522='keep-step']")); await tap(page, C("[data-qc1522='edit-x']"));
    await tap(page, C("[data-qc152='pencil']")); await shot("73-details");
    await tap(page, C("[data-qc1522='composer-x']"));
    await tap(page, C("[data-qc152='tab'][data-tab='materials']")); await shot("74-materials-tab");
    await tap(page, C("[data-qc152='mat-edit']")); await shot("75-materials-edit");
    await tap(page, C("[data-qc152='mat-x']")); await tap(page, C("[data-qc1522='composer-x']")); await shot("76-discard");
  });
}
