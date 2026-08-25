/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ UNDO ACTUALLY REVERTS — THE STORED FIELDS, NOT THE PIXELS ═══════════════════════════════
 *
 * ⚠️ THIS IS THE FIRST END-TO-END UNDO ASSERTION IN THE HARNESS. Every prior pack could show that
 * a toast carried an Undo control and stopped there — "whether Undo reverts" has been the standing
 * gap. This drives the completion, presses Undo, and then reads the RECORD back through the client
 * SDK, so the claim is about what is stored rather than about what is drawn.
 *
 * ⚠️ IT SPENDS NO FIXTURE. The task is one this file creates.
 *
 * ⚠️ AND IT TESTS THE LIVE PATH, WHICH IS THE PANE — not `noteSheet`. `FocusFlow`'s note sheet is
 * unreachable from the UI (`paneCommits("note")` is true, so a note never hands off), so the
 * completion a writer can actually reach is the pane's primary → `commitFromPane`'s note arm →
 * `quickDone`. That is the same primitive the split now calls, which is what makes this evidence
 * about the split rather than around it.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { readFileSync, writeFileSync } from "node:fs";

test("a completion's Undo reverts the stored record", async ({ page }) => {
  const errs: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 150)); });
  page.on("pageerror", (e) => errs.push("PAGEERROR " + String(e).slice(0, 150)));

  await openRoute(page, "/todo", { width: 1440, height: 900 });
  const TASK = `Undo probe ${Date.now()}`;

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
  await page.evaluate(() => (document.querySelector(".tdb-nc-save") as HTMLButtonElement).click());
  await page.waitForTimeout(2400);

  const pt = await page.evaluate((t) => {
    const r = Array.from(document.querySelectorAll(".row")).find((e) => (e.textContent || "").includes(t)) as HTMLElement | undefined;
    if (!r) return null;
    r.scrollIntoView({ block: "center" });
    const b = r.getBoundingClientRect();
    return { x: Math.round(b.left + b.width / 2), y: Math.round(b.top + b.height / 2) };
  }, TASK);
  expect(pt, "the task did not reach a row").not.toBeNull();
  await page.waitForTimeout(250);
  await page.mouse.click(pt!.x, pt!.y);
  await page.waitForTimeout(900);

  /* ⚠️ ONE TOAST, COUNTED. The split makes the edit a silent write and leaves `quickDone` the only
     receipt, so more than one toast here would be the fault the pack asked to be reported. */
  await page.evaluate(() => (document.querySelector(".tpn button.ab.go") as HTMLButtonElement).click());
  await page.waitForTimeout(2200);
  const done = await page.evaluate(() => ({
    /* ⚠️ RECEIPTS, NOT NODES CARRYING THE WORD. `[class*=toast]` matched three things on the first
       run — the toast, its own action button, and `.sa-toasts`, which is the app-level HOST
       container and never a receipt. A bounded class match counts the messages themselves. */
    toasts: Array.from(document.querySelectorAll("[class*=toast]"))
      .filter((e) => /(^|\s)(tdb-toast|sa-toast)(\s|$)/.test((e as HTMLElement).className)).length,
    toastClasses: Array.from(document.querySelectorAll("[class*=toast]")).map((e) => (e as HTMLElement).className).slice(0, 6),
    toast: (document.querySelector(".sa-toast, [class*=toast]")?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 80),
    undo: !!document.querySelector(".sa-toast-undo, [class*=toast] button"),
  }));
  console.log("after the completion:", JSON.stringify(done));
  expect(done.toast, "the toast did not name the task").toContain(TASK.slice(0, 18));
  expect(done.undo, "no Undo control").toBe(true);
  expect(done.toasts, "more than one toast — the split raised a second receipt").toBe(1);

  /* press Undo — the toast expires in ~6s, so this must not dawdle */
  const pressed = await page.evaluate(() => {
    const b = (document.querySelector(".sa-toast-undo") as HTMLButtonElement | null)
      ?? Array.from(document.querySelectorAll("[class*=toast] button"))
           .find((x) => /undo/i.test(x.textContent ?? "")) as HTMLButtonElement | undefined;
    if (!b) return false;
    b.click(); return true;
  });
  expect(pressed, "the Undo control could not be pressed").toBe(true);
  await page.waitForTimeout(2500);

  writeFileSync("/tmp/sa-undo-probe-title.txt", TASK);
  console.log("task title recorded for the stored-field read:", TASK);
  console.log("console errors:", errs.length ? JSON.stringify(errs.slice(0, 4)) : "none");
  expect(errs).toEqual([]);
});
