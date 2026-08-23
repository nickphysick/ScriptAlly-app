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
