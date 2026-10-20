/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v5 and v5.1 — the report's screenshots, beside each `design-refs/todo-list-v5/screens/*` and
 * `design-refs/todo-list-v5-1/screens/*` at both widths. `TD5_SHOTS=1` writes them; a routine run writes none. Nothing
 * here asserts; the locks are todoV5.measure.ts and todoV51.measure.ts.
 * ⚠️ THE SEEDED SCREENS (15, 16, 20, 23) WRITE TO THE SHARED ACCOUNT AND PUT IT BACK in the same test.
 */
import { test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { openRoute } from "./measure";
import { doc, setDoc, updateDoc } from "firebase/firestore";
import { harnessDb } from "./harnessDocs";
import { rawSet, restoreSet } from "./journeyGuard";
import { flagId, leaveDesk, restoreDocs, snapDocs } from "./td5Lib";

const DIR = "reports/todo-list-v5-1/shots";
const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;

test.describe.configure({ mode: "serial" });
test.setTimeout(240_000);

for (const vp of SIZES) {
  test(`shots ${vp.width}`, async ({ page }) => {
    test.skip(process.env.TD5_SHOTS !== "1", "TD5_SHOTS=1 writes the report's screenshots");
    mkdirSync(DIR, { recursive: true });
    await page.addInitScript(() => { try { for (const k of ["todo", "contacts", "queries"]) localStorage.setItem(`sa.guide.${k}`, "1"); } catch { /* */ } });
    await openRoute(page, "/todo", vp);
    await page.waitForSelector(".td5-root[data-state='list'], .td5-root[data-state='caught'], .td5-root[data-state='nothing']", { timeout: 30_000 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${DIR}/01-top-${vp.width}.png` });
    await page.evaluate(() => {
      const s = [...document.querySelectorAll<HTMLElement>(".td5-root .wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0);
      const sh = document.querySelector<HTMLElement>(".td5-sheet");
      if (s && sh) s.scrollTop = sh.offsetTop - 0 + 2;
    });
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${DIR}/02-tray-and-desk-${vp.width}.png` });
    await page.evaluate(() => { const s = [...document.querySelectorAll<HTMLElement>(".td5-root .wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0); if (s) s.scrollTop += 700; });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${DIR}/02b-scrolled-${vp.width}.png` });
  });
}

for (const st of ["caught", "nothing"] as const) {
  for (const vp of SIZES) {
    test(`shots ${st} ${vp.width}`, async ({ page }) => {
      test.skip(process.env.TD5_SHOTS !== "1", "TD5_SHOTS=1 writes the report's screenshots");
      mkdirSync(DIR, { recursive: true });
      await page.addInitScript((s) => { (window as unknown as { __SA_TD5_STATE?: string }).__SA_TD5_STATE = s; }, st);
      await openRoute(page, "/todo", vp);
      await page.waitForSelector(`.td5-root[data-state='${st}']`, { timeout: 30_000 });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `${DIR}/${st === "caught" ? "07-caught-up" : "08-empty"}-${vp.width}.png` });
      if (st === "nothing") {
        await page.evaluate(() => { const s = [...document.querySelectorAll<HTMLElement>(".td5-root .wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0); if (s) s.scrollTop = 900; });
        await page.waitForTimeout(500);
        await page.screenshot({ path: `${DIR}/09-empty-lower-${vp.width}.png` });
      }
    });
  }
}

for (const vp of SIZES) {
  test(`shots interactions ${vp.width}`, async ({ page }) => {
    test.skip(process.env.TD5_SHOTS !== "1", "TD5_SHOTS=1 writes the report's screenshots");
    mkdirSync(DIR, { recursive: true });
    await page.addInitScript(() => { try { for (const k of ["todo", "contacts", "queries"]) localStorage.setItem(`sa.guide.${k}`, "1"); } catch { /* */ } });
    await openRoute(page, "/todo", vp);
    await page.waitForSelector(".td5-root[data-state='list']", { timeout: 30_000 });
    await page.waitForTimeout(800);
    const sc = () => page.evaluate(() => { const s = [...document.querySelectorAll<HTMLElement>("[data-todo-v5] .wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0); const sh = document.querySelector<HTMLElement>(".td5-sheet"); if (s && sh) s.scrollTop += sh.getBoundingClientRect().top - s.getBoundingClientRect().top + 2; });
    /* 10 · the journey on the desk (untouched, then left: nothing written); 11 · its review */
    await page.locator('[data-todo-v5] [data-td5="row"][data-bucket="send"]').first().click();
    await page.waitForTimeout(300);
    await page.locator('[data-todo-v5] [data-td5="act"]').click();
    await page.locator("[data-td5-slot] [data-qad-drawer]").first().waitFor({ timeout: 10_000 });
    await page.waitForTimeout(1100);
    await page.screenshot({ path: `${DIR}/10-desk-journey-${vp.width}.png` });
    await page.locator("[data-td5-slot] .qad-skip").click().catch(() => {});
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${DIR}/11-journey-review-${vp.width}.png` });
    await leaveDesk(page); await page.waitForTimeout(600);
    /* 05 (the counts card filtered) and 06 (Just the desk) are retired by v5.2 — tests/e2e/RETIRED-todo-list-v5-2.md */
    /* 12 · the compose card, a task; 13 · a note */
    await page.evaluate(() => sessionStorage.removeItem("sa.todoTray.draft"));
    await page.locator('[data-todo-v5] [data-td5="add-row"]').click();
    const card = page.locator('[data-todo-v5] [data-td5="compose"]');
    await card.locator('[data-td5="compose-title"]').fill("Ring the festival office");
    await card.locator('[data-td5="compose-detail"]').fill("Ask about the shortlist date before the long-list goes out.");
    await card.locator('[data-when="this"]').click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${DIR}/12-compose-task-${vp.width}.png` });
    await card.locator('[data-td5="mode-note"]').click();
    await card.locator('[data-td5="compose-title"]').fill("The festival might want a shorter synopsis");
    await card.locator('[data-paper="pink"]').click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${DIR}/13-compose-note-${vp.width}.png` });
    await page.keyboard.press("Escape");
    await page.evaluate(() => sessionStorage.removeItem("sa.todoTray.draft"));
    await page.waitForTimeout(400);
    /* 14 · snooze a nudge; 17 · an offer; 18 · a housekeeping rule; 19 · an own task's Move it */
    for (const [file, sel, key] of [["14-snooze-nudge", '[data-task-type="nudge_overdue"]', "s"], ["17-snooze-offer", '[data-task-type="offer_received"]', "s"],
      ["18-dismiss-rule", "[data-sweep]", "d"], ["19-own-task-move", '[data-bucket="note"]', "s"]] as const) {
      const row = page.locator(`[data-todo-v5] [data-td5="row"]${sel}`).first();
      if (!(await row.count())) continue;
      await row.click(); await page.waitForTimeout(300);
      await page.locator("[data-todo-v5] h1").click().catch(() => {});
      await page.keyboard.press(key);
      await page.locator('[data-td5="aside-pop"]').waitFor({ timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${DIR}/${file}-${vp.width}.png` });
      await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    }
    /* 21 · the Set aside tab; 22 · a switched-off rule */
    await page.locator('[data-todo-v5] [data-td5="tab-aside"]').click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${DIR}/21-set-aside-tab-${vp.width}.png` });
    const rule = page.locator('[data-todo-v5] [data-td5="aside-row"][data-kind="rule"]').first();
    if (await rule.count()) { await rule.click(); await page.waitForTimeout(500); await page.screenshot({ path: `${DIR}/22-set-aside-switched-off-${vp.width}.png` }); }
    await page.locator('[data-todo-v5] [data-td5="tab-tray"]').click();
  });
}

for (const width of [1920, 1024]) {
  test(`shots ${width}`, async ({ page }) => {
    test.skip(process.env.TD5_SHOTS !== "1", "TD5_SHOTS=1 writes the report's screenshots");
    mkdirSync(DIR, { recursive: true });
    await openRoute(page, "/todo", { width, height: 1000 });
    await page.waitForSelector(".td5-root[data-state='list']", { timeout: 30_000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${DIR}/todo-${width}.png` });
    await page.evaluate(() => { const s = [...document.querySelectorAll<HTMLElement>("[data-todo-v5] .wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0); const sh = document.querySelector<HTMLElement>(".td5-sheet"); if (s && sh) s.scrollTop += sh.getBoundingClientRect().top - s.getBoundingClientRect().top + 2; });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${DIR}/todo-${width}-sheet.png` });
  });
}

/* ── v5.1 · the seeded screens: a passed send-by (15), a cap (16), back today (20), snoozed with Undo (23) ── */
for (const vp of SIZES) {
  test(`shots seeded ${vp.width}`, async ({ page }) => {
    test.skip(process.env.TD5_SHOTS !== "1", "TD5_SHOTS=1 writes the report's screenshots");
    mkdirSync(DIR, { recursive: true });
    const { db, uid } = await harnessDb();
    await page.addInitScript(() => { try { for (const k of ["todo", "contacts", "queries"]) localStorage.setItem(`sa.guide.${k}`, "1"); } catch { /* */ } });
    await openRoute(page, "/todo", vp);
    await page.waitForSelector(".td5-root[data-state='list']", { timeout: 30_000 });
    await page.waitForTimeout(800);
    const info = (sel: string) => page.evaluate((sel) => [...document.querySelectorAll<HTMLElement>(`[data-todo-v5] [data-td5="row"]${sel}`)].map((r) => ({ key: r.dataset.td5Row!, q: r.dataset.query! })), sel);
    const sends = await info('[data-bucket="send"]');
    const close = (await info('[data-task-type="no_response_close"]'))[0];
    const ids = [sends[0].q, sends[1].q];
    const before = await rawSet(ids);
    const fp = close ? [`taskFlags/${flagId("no_response_close", close.q)}`] : [];
    const snap = await snapDocs(fp);
    try {
      const at = (n: number) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return d.toISOString(); };
      await updateDoc(doc(db, "users", uid, "queries", sends[0].q), { expectedSendDate: at(-5) });
      await updateDoc(doc(db, "users", uid, "queries", sends[1].q), { expectedSendDate: at(10) });
      if (close) await setDoc(doc(db, "users", uid, "taskFlags", flagId("no_response_close", close.q)), { id: flagId("no_response_close", close.q), userId: uid, taskType: "no_response_close", queryId: close.q, snoozeCount: 1, snoozedUntil: at(0) });
      await page.reload();
      await page.waitForSelector(".td5-root[data-state='list']", { timeout: 30_000 });
      await page.waitForTimeout(1200);
      for (const [file, key] of [["15-snooze-date-passed", sends[0].key], ["16-snooze-capped", sends[1].key]] as const) {
        await page.locator(`[data-todo-v5] [data-td5-row="${key}"]`).click(); await page.waitForTimeout(300);
        await page.locator('[data-todo-v5] [data-td5="desk-aside"]').click();
        await page.locator('[data-td5="aside-pop"]').waitFor({ timeout: 4000 }).catch(() => {});
        await page.waitForTimeout(400);
        await page.screenshot({ path: `${DIR}/${file}-${vp.width}.png` });
        await page.keyboard.press("Escape"); await page.waitForTimeout(300);
      }
      if (close) {
        await page.locator(`[data-todo-v5] [data-td5-row="${close.key}"]`).click().catch(() => {});
        await page.waitForTimeout(500);
        await page.screenshot({ path: `${DIR}/20-back-today-${vp.width}.png` });
      }
      /* 23 · snoozed, with Undo on the toast — then Undo */
      const nudge = page.locator('[data-todo-v5] [data-td5="row"][data-task-type="nudge_overdue"]').first();
      const nq = await nudge.getAttribute("data-query");
      const nsnap = await snapDocs([`taskFlags/${flagId("nudge_overdue", nq!)}`]);
      await nudge.click(); await page.waitForTimeout(300);
      await page.locator('[data-todo-v5] [data-td5="desk-aside"]').click();
      await page.locator('[data-td5="aside-pop"] [data-snz="tom"]').click();
      await page.waitForTimeout(900);
      await page.screenshot({ path: `${DIR}/23-snoozed-undo-${vp.width}.png` });
      await page.locator(".tdb-toast .tdb-toast-act").click().catch(() => {});
      await page.waitForTimeout(800);
      await restoreDocs(nsnap);
    } finally {
      await restoreSet(before, ids);
      await restoreDocs(snap);
    }
  });
}
