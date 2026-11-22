/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ COMPLETION PATHS — PHASE 5 ══════════════════════════════════════════════════════════════
 *
 * ⚠️ EVERY COMPLETION HERE IS ON A TASK THIS FILE CREATES. No seeded card is spent.
 *
 * ⚠️ AND TWO OF THE PACK'S ACCEPTANCES CANNOT BE DRIVEN, which is stated rather than worked
 * around: `noteSheet` and `sweepDone` are both unreachable from the UI. See the run report — the
 * short of it is that `paneCommits("note")` is true so a note never hands off, nothing in `src/`
 * sets `mode: "sweep"`, and the weekly review's only entrance lives inside `renderHero`, which has
 * no caller. The route claims are asserted in source instead, and named as such.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

type P = import("@playwright/test").Page;
const WIDTHS = [1000, 1440, 1920];

/** create a dated task on /todo and return its title — the composer needs a date to enable save */
async function makeTask(page: P, label: string) {
  const TASK = `${label} ${Date.now()}`;
  /* ⚠️ WAIT FOR THE CONTROL, DO NOT ASSUME IT. `openRoute` resolves before the board finishes
     rendering, and a `find(...)` that comes back undefined throws "Cannot read properties of null"
     from inside the evaluate — which reads like a broken page rather than an early click. */
  await page.waitForFunction(() => Array.from(document.querySelectorAll("button"))
    .some((e) => (e.textContent || "").trim() === "Add a task"), null, { timeout: 15000 });
  await page.evaluate(() => (Array.from(document.querySelectorAll("button"))
    .find((e) => (e.textContent || "").trim() === "Add a task") as HTMLElement).click());
  await page.waitForTimeout(700);
  await (await page.$(".tdb-nc-ttl"))!.click();
  await page.keyboard.type(TASK);
  await page.waitForTimeout(250);
  await page.evaluate(() => {
    const nc = document.querySelector(".tdb-nc") as HTMLElement;
    (Array.from(nc.querySelectorAll("button, div, span"))
      .find((e) => (e.textContent || "").trim() === "Add a date") as HTMLElement)?.click();
  });
  await page.waitForTimeout(550);
  await page.evaluate(() => {
    const nc = document.querySelector(".tdb-nc") as HTMLElement; const d = String(new Date().getDate());
    (Array.from(nc.querySelectorAll("button, td, div, span"))
      .filter((e) => (e.textContent || "").trim() === d && e.children.length === 0).pop() as HTMLElement)?.click();
  });
  await page.waitForTimeout(400);
  const saved = await page.evaluate(() => {
    const b = document.querySelector(".tdb-nc-save") as HTMLButtonElement | null;
    if (!b || b.disabled) return false; b.click(); return true;
  });
  await page.waitForTimeout(2300);
  return saved ? TASK : null;
}

/** count RECEIPTS, not nodes carrying the word — `.sa-toasts` is the host and never a receipt */
const receipts = (page: P) => page.evaluate(() => ({
  toasts: Array.from(document.querySelectorAll("[class*=toast]"))
    .filter((e) => /(^|\s)(tdb-toast|sa-toast)(\s|$)/.test((e as HTMLElement).className)).length,
  toast: (document.querySelector(".tdb-toast, .sa-toast")?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 80),
  undo: !!document.querySelector(".sa-toast-undo, [class*=toast] button"),
  receiptTiles: document.querySelectorAll(".tdb-tile.receipt").length,
}));

test("Phase 5 — /todo completes with a toast and Undo, at three widths", async ({ page }) => {
  const errs: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 150)); });
  page.on("pageerror", (e) => errs.push("PAGEERROR " + String(e).slice(0, 150)));

  for (const width of WIDTHS) {
    await openRoute(page, "/todo", { width, height: 900 });
    const TASK = await makeTask(page, "P5 todo");
    expect(TASK, `[${width}] could not create a task`).not.toBeNull();

    const pt = await page.evaluate((t) => {
      const r = Array.from(document.querySelectorAll(".row")).find((e) => (e.textContent || "").includes(t)) as HTMLElement | undefined;
      if (!r) return null;
      r.scrollIntoView({ block: "center" });
      const b = r.getBoundingClientRect();
      return { x: Math.round(b.left + b.width / 2), y: Math.round(b.top + b.height / 2) };
    }, TASK!);
    expect(pt, `[${width}] the task did not reach a row`).not.toBeNull();
    await page.waitForTimeout(250);
    await page.mouse.click(pt!.x, pt!.y);
    await page.waitForTimeout(800);

    const primary = await page.evaluate(() => (document.querySelector(".tpn button.ab.go, .tpn button.fk")?.textContent ?? "").trim());
    expect(primary, `[${width}] this task's primary states a gate — pressing would not complete`).not.toMatch(/to answer/i);
    await page.evaluate(() => (document.querySelector(".tpn button.ab.go, .tpn button.fk") as HTMLButtonElement).click());
    await page.waitForTimeout(2200);

    const r = await receipts(page);
    console.log(`[${width}] /todo → ${JSON.stringify(r)}`);
    expect(r.toast, `[${width}] the toast did not name the task`).toContain(TASK!.slice(0, 14));
    expect(r.undo, `[${width}] no Undo control`).toBe(true);
    expect(r.toasts, `[${width}] more than one receipt`).toBe(1);
    expect(r.receiptTiles, `[${width}] a card receipt was attempted`).toBe(0);
  }
  console.log("console errors:", errs.length ? JSON.stringify(errs.slice(0, 4)) : "none");
  expect(errs).toEqual([]);
});

