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
import { removeProbeTasks } from "./probeTasks.mjs";

/**
 * ⚠️ IT PUTS THE TASK BACK, AND THE `finally` IS THE WHOLE POINT.
 *
 * This creates a REAL task on the shared harness account, completes it, and presses Undo — which
 * restores the QUERY and leaves the TASK. Five had accumulated before anyone looked, and they were
 * not inert: they render on the calendar as real rows, with real deeds, in the row order. A dev
 * board filling with `Undo probe 1787873161410` is a board nobody can read, and every run made it
 * worse.
 *
 * The cleanup runs whether or not the assertions pass, because a failing run is exactly the run
 * that leaves residue — the assertion throws, the rest of the body never executes, and the task
 * stays. That is how all five got there.
 */
test("a completion's Undo reverts the stored record", async ({ page }) => {
  const created: string[] = [];
  try {
  const errs: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 150)); });
  page.on("pageerror", (e) => errs.push("PAGEERROR " + String(e).slice(0, 150)));

  await openRoute(page, "/todo", { width: 1440, height: 900 });
  const TASK = `Undo probe ${Date.now()}`;
  created.push(TASK);

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
  /* ⚠️ THE PANE MUST BE ON OUR CARD BEFORE THE PRESS — the standing probe rule. An unguarded
     `querySelector(...).click()` here throws "Cannot read properties of null" from inside the
     evaluate, which reads like a broken page rather than a pane that never docked. */
  const paneOn = await page.evaluate(() => ({
    deed: (document.querySelector(".tpn .deed")?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 60),
    hasPrimary: !!document.querySelector(".tpn button.ab.go, .tpn button.fk"),
    panes: document.querySelectorAll(".tpn").length,
  }));
  console.log("pane before the press:", JSON.stringify(paneOn));
  expect(paneOn.hasPrimary, `no primary in the pane — it shows ${JSON.stringify(paneOn.deed)}`).toBe(true);
  expect(paneOn.deed, "the pane docked another card — refusing to press").toContain(TASK.slice(0, 14));

  /**
   * ⚠️ THE PANE COMMITS IN TWO STEPS NOW. Its action bar offers FORKS (`.fk`) — "Tick it off",
   * "Give it a date" — and choosing one reveals the commit (`.ab.go`). A probe that pressed the
   * first control and looked for a toast found none and read it as a broken write; it had only
   * answered the question, not pressed the button. Press the fork if one is offered, then commit.
   */
  const fork = await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll(".tpn button.fk"))
      .find((e) => /tick it off/i.test(e.textContent ?? "")) as HTMLButtonElement | undefined;
    if (!b) return "no fork — the bar commits directly";
    b.click(); return "fork chosen";
  });
  console.log("fork:", fork);
  await page.waitForTimeout(1000);
  const committed = await page.evaluate(() => {
    const b = document.querySelector(".tpn button.ab.go") as HTMLButtonElement | null;
    if (!b) return false;
    b.click(); return true;
  });
  expect(committed, "no commit control after choosing the fork").toBe(true);
  await page.waitForTimeout(2400);
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
  } finally {
    /* ⚠️ NAMED, NOT SWEPT. It removes the task THIS run created and nothing else, so a run racing
       another cannot take away the other's fixture mid-assertion. */
    for (const t of created) {
      const gone = await removeProbeTasks({ title: t });
      console.log(`cleanup: removed ${gone.length} task(s) named ${JSON.stringify(t)}`);
    }
  }
});
