/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v5.2 — the report's shots, beside each `design-refs/todo-list-v5-2/screens/*` at 1512 × 900 and 1280 × 800,
 * plus /todo pinned and unpinned at 1920 and 1024. `TD52_SHOTS=1` only. Writes nothing to the account except screen 11,
 * which clears the explainer's stored fact for the shot and puts the user document back (the guard).
 */
import { test } from "@playwright/test";
import { doc, setDoc } from "firebase/firestore";
import { mkdirSync } from "node:fs";
import { harnessDb } from "./harnessDocs";
import { leaveDesk, openTodo, restoreDocs, snapDocs } from "./td52Lib";

const OUT = "reports/todo-list-v5-2/shots";
type W = { __td5: () => { r: HTMLElement; sc: HTMLElement; q: (s: string) => HTMLElement | null; qa: (s: string) => HTMLElement[] } };
test.skip(process.env.TD52_SHOTS !== "1", "TD52_SHOTS=1 writes the report's shots");
test.setTimeout(900_000);

const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }];
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const toTop = (page: import("@playwright/test").Page) => page.evaluate(() => { (window as unknown as W).__td5().sc.scrollTop = 0; });
const toSheet = (page: import("@playwright/test").Page) => page.evaluate(() => { const { sc, q } = (window as unknown as W).__td5(); sc.scrollTop += q(".td5-sheet")!.getBoundingClientRect().top - sc.getBoundingClientRect().top - 10; });
const snap = (page: import("@playwright/test").Page, name: string, w: number) => page.screenshot({ path: `${OUT}/${name}-${w}.png` });
const startSend = async (page: import("@playwright/test").Page) => {
  const k = await page.evaluate(() => ((window as unknown as W).__td5().qa('[data-td5="row"][data-task-type="partial_requested"]')[0] ?? (window as unknown as W).__td5().qa('[data-td5="row"][data-task-type="full_requested"]')[0])?.dataset.td5Row ?? null);
  if (!k) return null;
  await page.locator(`[data-todo-v5] [data-td5-row="${k}"]`).first().click(); await page.waitForTimeout(300);
  await page.locator('[data-todo-v5] [data-td5="act"]').click();
  await page.locator("[data-td5-slot] [data-qad-drawer]").first().waitFor({ timeout: 10_000 });
  return k;
};

for (const vp of SIZES) test(`shots @${vp.width}`, async ({ page }) => {
  mkdirSync(OUT, { recursive: true });
  const w = vp.width;
  await openTodo(page, vp, { motion: true });
  await page.evaluate(() => document.fonts.ready);
  await snap(page, "01-calendar-today", w);
  const cells = await page.evaluate((t) => { const { qa } = (window as unknown as W).__td5(); const c = qa('[data-td52="day-cell"]');
    return { fut: c.find((x) => x.dataset.ymd! > t && x.querySelector('[data-td52="dot"]:not(.faint)'))?.dataset.ymd, past: c.find((x) => x.dataset.ymd! < t && /\bopen\b/.test(x.className))?.dataset.ymd, clear: c.find((x) => x.dataset.ymd! > t && !x.querySelector('[data-td52="dot"]'))?.dataset.ymd }; }, today());
  for (const [name, ymd] of [["02-calendar-future-day", cells.fut], ["03-calendar-past-day", cells.past], ["04-calendar-clear-day", cells.clear]] as const) {
    if (!ymd) continue;
    await page.locator(`[data-todo-v5] [data-td52="day-cell"][data-ymd="${ymd}"]`).click(); await page.waitForTimeout(500);
    await snap(page, name, w);
    await page.locator('[data-todo-v5] [data-td52="back-today"]').click().catch(() => {}); await page.waitForTimeout(300);
  }
  await page.locator('[data-todo-v5] [data-td52="cal-row"][data-f="overdue"]').click(); await page.waitForTimeout(600);
  await snap(page, "05-overdue-filter", w);
  await page.locator('[data-todo-v5] [data-td52="cal-row"][data-f="overdue"]').click(); await page.waitForTimeout(300);
  await page.locator('[data-todo-v5] [data-td52="open-drawer"]').click(); await page.waitForTimeout(900);
  await snap(page, "06-calendar-drawer", w);
  await page.keyboard.press("Escape"); await page.waitForTimeout(500);
  await toSheet(page); await page.waitForTimeout(500);
  await snap(page, "07-tray", w);
  await page.evaluate(() => (window as unknown as W).__td5().qa('[data-td5="row"][data-task-type="nudge_overdue"] .td52-press')[0]?.click()); await page.waitForTimeout(500);
  await snap(page, "08-dial-reschedule", w);
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  await page.evaluate(() => (window as unknown as W).__td5().q('[data-td5="group-block"][data-g="quiet"]')?.scrollIntoView({ block: "start" })); await page.waitForTimeout(400);
  /* three Gone quiet rows ticked: the checkboxes, the tint, the bar — nothing is written (no Close press) */
  await page.evaluate(() => { const c = (window as unknown as W).__td5().qa('[data-td52="bulk-check"]'); c.slice(0, 3).forEach((x) => x.click()); });
  await page.waitForTimeout(500);
  await snap(page, "09-bulk-close", w);
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  await page.locator('[data-todo-v5] [data-td5="find"] input').first().fill("zzqq nothing like this"); await page.waitForTimeout(600);
  await toSheet(page); await page.waitForTimeout(300);
  await snap(page, "10-empty-filter", w);
  await page.locator('[data-todo-v5] [data-td52="empty-clear"]').click(); await page.waitForTimeout(400);
  /* 11 · the explainer: cleared for the shot, the user document put back after */
  const before = await snapDocs([""]);
  try {
    const { db, uid } = await harnessDb();
    const prefs = (before.get("") as { todoPrefs?: Record<string, unknown> } | null)?.todoPrefs ?? {};
    await setDoc(doc(db, "users", uid), { todoPrefs: { ...prefs, tray: {} } }, { merge: true });
    await page.waitForTimeout(1500);
    await page.evaluate(() => (window as unknown as W).__td5().qa('[data-td5="row"][data-task-type="nudge_overdue"]')[0]?.click()); await page.waitForTimeout(400);
    await page.locator('[data-todo-v5] [data-td5="desk-aside"]').first().click(); await page.waitForTimeout(600);
    await snap(page, "11-set-aside-explainer", w);
    await page.keyboard.press("Escape");
  } finally { await restoreDocs(before); }
  /* 12–13 · pinned, and its drawer */
  await page.keyboard.press("f"); await page.waitForTimeout(900);
  await snap(page, "12-pinned", w);
  await page.locator('[data-todo-v5] [data-td52="pin-day"]').click(); await page.waitForTimeout(900);
  await snap(page, "13-pinned-drawer", w);
  await page.keyboard.press("Escape"); await page.waitForTimeout(500);
  /* 20 · pinned, mid-task */
  if (await startSend(page)) { await page.waitForTimeout(2600); await snap(page, "20-task-pinned", w); await leaveDesk(page); }
  await page.keyboard.press("f"); await page.waitForTimeout(800);
  await page.evaluate(() => { try { localStorage.removeItem("sa.pinList.todo"); } catch { /* */ } });
  /* 16–19 · a task starting, in progress, at step 2, hovering another */
  await openTodo(page, vp, { motion: true });
  await toSheet(page); await page.waitForTimeout(300);
  if (await startSend(page)) {
    await page.waitForTimeout(260); await snap(page, "16-task-starting", w);
    await page.waitForTimeout(2400); await snap(page, "17-task-in-progress", w);
    await page.locator("[data-td5-slot] [data-qad-primary]").first().click(); await page.waitForTimeout(900);
    await snap(page, "18-task-step-2", w);
    await page.locator("[data-td5-slot] .qad-body button", { hasText: /^\+$/ }).first().click().catch(() => {}); await page.waitForTimeout(400);
    const other = await page.evaluate(() => (window as unknown as W).__td5().qa('[data-td5="row"]:not([data-live])').find((r) => r.getBoundingClientRect().top > 300 && r.getBoundingClientRect().bottom < innerHeight)?.dataset.td5Row);
    if (other) { await page.locator(`[data-todo-v5] [data-td5-row="${other}"]`).first().hover(); await page.waitForTimeout(500); await snap(page, "19-task-hover-another", w); }
    await page.mouse.move(5, 5);
    await leaveDesk(page);
    await page.evaluate(() => sessionStorage.removeItem("qh.parkedJourney"));
  }
  await openTodo(page, vp, { state: "caught" }); await snap(page, "14-caught-up", w);
  await openTodo(page, vp, { state: "nothing", want: "nothing" }); await snap(page, "15-empty", w);
});

for (const width of [1920, 1024]) test(`/todo pinned and unpinned @${width}`, async ({ page }) => {
  mkdirSync(OUT, { recursive: true });
  await openTodo(page, { width, height: width === 1920 ? 1080 : 800 });
  await page.evaluate(() => document.fonts.ready);
  await toTop(page); await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/todo-unpinned-${width}.png` });
  await page.keyboard.press("f"); await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/todo-pinned-${width}.png` });
  await page.keyboard.press("f"); await page.waitForTimeout(600);
  await page.evaluate(() => { try { localStorage.removeItem("sa.pinList.todo"); } catch { /* */ } });
});
