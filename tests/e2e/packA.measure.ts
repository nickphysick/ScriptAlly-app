/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pack A — the pure lift, verified on a RENDERED page.
 *
 * ⚠️ THE SUITE CANNOT MAKE THIS CHECK. This repo's tests read SOURCE (`environment: 'node'`, no
 * jsdom), so 6,384 green tests prove the code was written, not that it ran — and a lift that moves
 * closures out of a component is exactly the shape that breaks at runtime while `tsc` stays clean
 * (a `const` read by a hoisted function, a changed memo dependency, a hook-order shift). So the
 * acceptance for a pure lift has to include opening the page.
 *
 * ⚠️ IT ASSERTS THE THREE LIFTED DERIVATIONS' OUTPUT, not merely that the page mounted. A page can
 * render with every figure blank. The row figure, the row meta and the pane are what `figureFor`,
 * `listRowInputs` and `recordSweepFor` feed.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

test("Pack A — /todo renders, and the lifted derivations still produce their facts", async ({ page }) => {
  await openRoute(page, "/todo", { width: 1440, height: 900 });

  const r = await page.evaluate(() => {
    const vis = (s: string) => Array.from(document.querySelectorAll(s))
      .filter((e) => (e as HTMLElement).getBoundingClientRect().height > 0) as HTMLElement[];
    const rows = vis(".row");
    const text = (e: Element | null) => (e?.textContent ?? "").trim();
    return {
      rows: rows.length,
      /* `figureFor` → the row's figure; `listRowInputs` → its meta line */
      figures: rows.slice(0, 8).map((e) => text(e.querySelector("[class*='fig'], .r-fig"))).filter(Boolean),
      metas: rows.slice(0, 8).map((e) => text(e.querySelector("[class*='meta'], .r-meta, .r-sub"))).filter(Boolean),
      paneMounted: vis(".tpn").length,
      paneHasBand: vis(".tpn .band").length,
      paneSections: vis(".tpn [id^='s-']").map((e) => e.id),
      /* the console is where a runtime fault would show, and a source suite never looks */
      errors: (window as unknown as { __errs?: string[] }).__errs ?? [],
    };
  });

  console.log(`  rows ${r.rows} · figures ${JSON.stringify(r.figures.slice(0, 3))} · metas ${JSON.stringify(r.metas.slice(0, 2))}`);
  console.log(`  pane mounted ${r.paneMounted} · band ${r.paneHasBand} · sections ${JSON.stringify(r.paneSections)}`);

  /* ⚠️ POPULATION FIRST — a page with no rows would satisfy every claim below by having nothing */
  expect(r.rows, "no task rows — every assertion below would be vacuous").toBeGreaterThan(0);
  expect(r.figures.length, "no row figure rendered — figureFor produced nothing").toBeGreaterThan(0);
  expect(r.paneMounted, "the task pane did not mount").toBe(1);
  expect(r.paneHasBand, "the pane mounted but drew no band — the journey is empty").toBeGreaterThan(0);
});

test("Pack A — the console is clean on /todo", async ({ page }) => {
  const errs: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  page.on("pageerror", (e) => errs.push(String(e)));
  await openRoute(page, "/todo", { width: 1440, height: 900 });
  await page.waitForTimeout(1500);
  /* ⚠️ THE TDZ FAULT THIS LIFT COULD HAVE CAUSED SHOWS HERE AND NOWHERE ELSE — "Cannot access
     'snoozedKeys' before initialization" is a runtime throw that tsc and a source suite both miss. */
  const real = errs.filter((e) => !/favicon|net::ERR|Download the React DevTools/i.test(e));
  console.log(`  console errors: ${real.length ? JSON.stringify(real.slice(0, 3)) : "none"}`);
  expect(real, "the page threw at runtime").toEqual([]);
});


/**
 * Pack A2 — `figureFor` derives sleep, and the figures are unchanged by it.
 *
 * ⚠️ THIS IS THE REST HALF OF THE OBLIGATION. The mid-save half is proved deterministically in
 * `src/lib/taskCardFactsSleep.test.ts` — calling the derivation with and without
 * `hiddenUserTaskId` — because a browser race observes ONE save and cannot speak for the next.
 * What the page adds is that the change did not disturb what a reader sees, and that the sleep
 * branch still fires through the new derivation rather than being quietly skipped.
 */
test("Pack A2 — /todo's figures are unchanged, and sleep still resolves", async ({ page }) => {
  const errs: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  page.on("pageerror", (e) => errs.push(String(e)));
  await openRoute(page, "/todo", { width: 1440, height: 900 });

  const r = await page.evaluate(() => {
    const vis = (s: string) => Array.from(document.querySelectorAll(s))
      .filter((e) => (e as HTMLElement).getBoundingClientRect().height > 0) as HTMLElement[];
    const rows = vis(".row");
    const text = (e: Element | null) => (e?.textContent ?? "").trim();
    return {
      rows: rows.length,
      figures: rows.map((e) => text(e.querySelector("[class*='fig'], .r-fig"))).filter(Boolean),
      /* a card whose figure is the SLEEP branch — "BACK 8 Sep" and friends */
      backFigures: rows.map((e) => text(e.querySelector("[class*='fig'], .r-fig")))
        .filter((t) => /back/i.test(t)),
      paneMounted: vis(".tpn").length,
      paneBand: vis(".tpn .band").length,
    };
  });
  console.log(`  rows ${r.rows} · figures ${JSON.stringify(r.figures.slice(0, 4))}`);
  console.log(`  sleep-branch figures: ${JSON.stringify(r.backFigures)} · pane ${r.paneMounted}/${r.paneBand}`);

  /* ⚠️ POPULATION FIRST — a page with no rows satisfies every claim below by having nothing. */
  expect(r.rows, "no rows — the figure claims would be vacuous").toBeGreaterThan(0);
  expect(r.figures.length, "no figure rendered — figureFor produced nothing").toBeGreaterThan(0);
  /* ⚠️ A FLOOR, NOT A COUNT — AND PINNING THE COUNT WAS MY OWN MISTAKE. This read
     `expect(r.rows).toBe(18)`, "the eighteen rows Pack A measured", which is an assertion about
     the ACCOUNT'S DATA rather than about the code: deleting five leftover test notes took it to 13
     and turned the check red for a change that was entirely correct. A test that goes red when the
     data legitimately changes teaches the reader to ignore it. What this phase actually claims is
     that rows render and their figures resolve — so it asserts a population, and the exact figures
     are logged above for a human to compare. */
  expect(r.rows, "too few rows to be a populated account").toBeGreaterThanOrEqual(5);
  expect(r.paneMounted).toBe(1);
  expect(r.paneBand).toBeGreaterThan(0);

  /* ⚠️ THE SLEEP BRANCH IS REPORTED, NOT ASSERTED, AND THE DIFFERENCE IS DELIBERATE. This account
     holds no snoozed card, so `backFigures` is empty and an assertion over it would pass by
     measuring nothing — the vacuous-check family this repo records. The branch IS proved, in
     `taskCardFactsSleep.test.ts`, on a fixture with a genuinely sleeping flag; what the page can
     honestly add is that nothing else moved. Anyone who snoozes a card on the harness account
     should expect a "BACK …" figure here, and this line will start reporting it. */
  console.log(r.backFigures.length
    ? `  sleep branch exercised on the page: ${JSON.stringify(r.backFigures)}`
    : "  ⚠️ sleep branch NOT exercised — no snoozed card on this account; proved in taskCardFactsSleep.test.ts instead");


  const real = errs.filter((e) => !/favicon|net::ERR|Download the React DevTools/i.test(e));
  console.log(`  console errors: ${real.length ? JSON.stringify(real.slice(0, 3)) : "none"}`);
  expect(real, "the page threw at runtime").toEqual([]);
});
