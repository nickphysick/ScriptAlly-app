/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ PACK C PHASE 1 — `/todo` IS UNCHANGED BY THE LIFT ════════════════════════════════════════
 *
 * ⚠️ THE COMMITTER MOVED; THE PAGE MUST NOT HAVE. `commitFromPane`, its eight arms, `quickDone` and
 * `doneToast` now live in `useTaskCommit`, and `/todo` passes the overlay sink it always had. The
 * sink is optional now, so a page that stopped passing one would still compile, still write and
 * still toast — which is exactly the kind of silent loss only a rendered check can catch.
 *
 * ⚠️ AND IT CAUGHT ONE, THOUGH NOT THE EXPECTED ONE: `/todo` draws no card receipt either, and has
 * not since 6 Aug. See the note at the assertions.
 *
 * ⚠️ IT SPENDS NO FIXTURE. The note arm is exercised on a note this file CREATES, and completing
 * your own note consumes nothing — which matters because the dev account cannot currently be
 * restored (`reports/dev-rules-divergence.md`). No Send card is touched.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

test("Pack C Phase 1 — a completion through the pane still writes, and the toast is the receipt", async ({ page }) => {
  const errs: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  page.on("pageerror", (e) => errs.push(String(e)));

  await openRoute(page, "/todo", { width: 1440, height: 900 });

  /**
   * ⚠️ A DATED TASK THIS FILE CREATES, COMPLETED THROUGH THE PANE'S PRIMARY — and every part of
   * that sentence was forced by something.
   *
   * DATED, because `boardEligible` filters a dateless user card out: a NOTE is not a board card, so
   * it can never dock and never reach the pane. The composer agrees — a task's save sits disabled
   * until a date is chosen.
   * THIS FILE CREATES IT, because the dev account cannot currently be restored
   * (`reports/dev-rules-divergence.md`), so spending someone else's fixture would be permanent.
   * THROUGH THE PANE'S PRIMARY, because that is the seam this pack moved: it routes
   * `commit` → the note arm → `quickDone` → the overlay sink and the toast. A row tick would
   * exercise the primitive and not the seam.
   */
  const openC = await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll("button"))
      .filter((e) => (e as HTMLElement).getBoundingClientRect().height > 0)
      .find((e) => (e.textContent || "").trim() === "Add a task") as HTMLElement | undefined;
    if (!b) return false;
    b.scrollIntoView({ block: "center" }); b.click(); return true;
  });
  expect(openC, "no `Add a task` control — this check would create nothing").toBe(true);
  await page.waitForTimeout(700);

  const NOTE = `Pack C overlay probe ${Date.now()}`;
  const field = await page.$(".tdb-nc-ttl");
  expect(field, "the composer did not open").not.toBeNull();
  await field!.click();
  await page.keyboard.type(NOTE);
  await page.waitForTimeout(300);

  /* the date, without which the save stays disabled */
  await page.evaluate(() => {
    const nc = document.querySelector(".tdb-nc") as HTMLElement;
    (Array.from(nc.querySelectorAll("button, div, span"))
      .find((e) => (e.textContent || "").trim() === "Add a date") as HTMLElement)?.click();
  });
  await page.waitForTimeout(600);
  const dayPicked = await page.evaluate(() => {
    const nc = document.querySelector(".tdb-nc") as HTMLElement;
    const today = String(new Date().getDate());
    const cell = Array.from(nc.querySelectorAll("button, td, div, span"))
      .filter((e) => (e.textContent || "").trim() === today && e.children.length === 0)
      .pop() as HTMLElement | undefined;
    if (!cell) return false;
    cell.click(); return true;
  });
  console.log("date chosen:", dayPicked);
  expect(dayPicked, "no day cell for today in the composer's calendar").toBe(true);
  await page.waitForTimeout(500);

  const saved = await page.evaluate(() => {
    const b = document.querySelector(".tdb-nc-save") as HTMLButtonElement | null;
    if (!b) return "no save control";
    if (b.disabled) return "save is still disabled — the task is not valid";
    b.click(); return "clicked";
  });
  console.log("save:", saved);
  expect(saved, "the task could not be saved").toBe("clicked");
  await page.waitForTimeout(2500);

  const made = await page.evaluate((t) => document.body.innerText.includes(t), NOTE);
  console.log("task created and on the page:", made);
  expect(made, "the task was not created — nothing to complete").toBe(true);

  /* dock it, then press the PANE's primary — the seam: commit → note arm → quickDone → sink+toast */
  const dockedIt = await page.evaluate((t) => {
    const row = Array.from(document.querySelectorAll(".row"))
      .filter((e) => (e as HTMLElement).getBoundingClientRect().height > 0)
      .find((e) => (e.textContent ?? "").includes(t)) as HTMLElement | undefined;
    if (!row) return null;
    row.scrollIntoView({ block: "center" });
    const r = row.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  }, NOTE);
  expect(dockedIt, "the new note has no row to dock").not.toBeNull();
  await page.waitForTimeout(300);
  await page.mouse.click(dockedIt!.x, dockedIt!.y);
  await page.waitForTimeout(800);

  const paneOn = await page.evaluate((t) => {
    const pane = Array.from(document.querySelectorAll(".tpn"))
      .filter((e) => (e as HTMLElement).getBoundingClientRect().height > 0)[0] as HTMLElement | undefined;
    if (!pane) return null;
    return { deed: (pane.querySelector(".deed")?.textContent ?? "").replace(/\s+/g," ").trim().slice(0,60),
             primary: (pane.querySelector("button.ab.go")?.textContent ?? "").trim(),
             isOurs: (pane.textContent ?? "").includes(t) };
  }, NOTE);
  console.log("pane docked on:", JSON.stringify(paneOn));
  expect(paneOn, "no visible pane after clicking the note's row").not.toBeNull();
  expect(paneOn!.isOurs, "the pane docked a different card — this would complete the wrong thing").toBe(true);

  await page.evaluate(() => {
    const pane = Array.from(document.querySelectorAll(".tpn"))
      .filter((e) => (e as HTMLElement).getBoundingClientRect().height > 0)[0] as HTMLElement;
    (pane.querySelector("button.ab.go") as HTMLButtonElement).click();
  });
  await page.waitForTimeout(2500);

  const after = await page.evaluate(() => ({
    toast: (document.querySelector(".sa-toast, [class*=toast]")?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 80),
    undo: !!document.querySelector(".sa-toast-undo, [class*=toast] button"),
    /* the card receipt `setOverlay` builds — `.tdb-tile.receipt`, its real class */
    receiptTiles: document.querySelectorAll(".tdb-tile.receipt").length,
  }));
  console.log("after the completion:", JSON.stringify(after));

  /**
   * ⚠️ THE TOAST IS THE RECEIPT, ON BOTH SURFACES — AND THAT WAS ALREADY TRUE BEFORE THIS PACK.
   *
   * This pack was built on the ruling that `/todo`'s card overlay is *additional* to the toast and
   * the calendar simply goes without it. **Measured here, `/todo` draws no receipt tile either.**
   * `overlayCards` — the only reader of the `overlays` state and the only thing that renders
   * `.tdb-tile.receipt` — LOST ITS LAST CALLER on 6 Aug in `72f6138c`, the commit that turned the
   * board into a grouped list. `setOverlay` has been writing into state nothing renders ever since.
   *
   * So the sink is a vestige, not a divergence: the two surfaces already agree, and the toast is
   * the sole receipt on both. Asserting "a completion still draws its card overlay" would fail on a
   * page that is behaving exactly as it did before the lift — which is why this states the fact
   * instead. Reported for Nick; removing the dead machinery is a separate decision.
   */
  expect(after.receiptTiles, "a receipt tile appeared — `overlayCards` has a caller again, and this note is stale").toBe(0);

  expect(after.toast.length, "no toast — the completion produced no receipt at all").toBeGreaterThan(0);
  expect(after.toast, "the toast did not name the completed task").toContain(NOTE.slice(0, 20));
  /* ⚠️ THE LABEL IS `.toUpperCase()`d BY CSS, so this targets the control, not the string. */
  expect(after.undo, "the toast carried no Undo control — the one thing that makes it a receipt").toBe(true);
  console.log("console errors:", errs.length ? JSON.stringify(errs.slice(0, 4)) : "none");
  expect(errs).toEqual([]);
});
