/**
 * ⚠️ DOES THE EMPTY STATE EVER APPEAR? A timing question needs an instrument that cannot miss a
 * 60ms window, so this records the DOM from before the app boots rather than sampling it.
 *
 * The last pack's checks passed while the flash was live: they measured the skeleton's stylesheet
 * and the resolved page, and never once asked what was on screen in between.
 *
 *   SA_E2E_BASE_URL=dev npx playwright test --project=measure qcFlash
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

/** Install before any app code runs: every mutation is inspected, nothing is sampled. */
const watch = async (page: any) => {
  await page.addInitScript(() => {
    (window as any).__qcSeen = { firstRun: 0, skeleton: 0, rows: 0, unselected: 0, log: [] as string[] };
    const t0 = Date.now();
    const look = () => {
      const s = (window as any).__qcSeen;
      const txt = document.body?.textContent || "";
      const mark = (k: string, on: boolean) => {
        if (!on) return;
        s[k] += 1;
        if (s[k] === 1) s.log.push(`${k}@${Date.now() - t0}ms`);
      };
      mark("firstRun", /first query starts here|No queries yet/i.test(txt));
      mark("skeleton", !!document.querySelector(".qc-skel"));
      mark("rows", !!document.querySelector(".f12-row:not(.qc-skel-row)"));
      mark("unselected", !!document.querySelector(".qc-unsel"));
    };
    const obs = new MutationObserver(look);
    const start = () => { if (document.body) { obs.observe(document.body, { childList: true, subtree: true, characterData: true }); look(); } else setTimeout(start, 0); };
    start();
  });
};

test("the load never states that the account is empty", async ({ page }) => {
  test.setTimeout(240000);
  await watch(page);
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.waitForTimeout(4000);

  const seen = await page.evaluate(() => (window as any).__qcSeen);
  console.log(`  order of appearance: ${seen.log.join(" → ") || "(nothing recorded)"}`);
  console.log(`  first-run copy seen: ${seen.firstRun > 0} · skeleton seen: ${seen.skeleton > 0} · rows: ${seen.rows > 0}`);
  expect(seen.rows, "no rows ever arrived — the account looks empty for real").toBeGreaterThan(0);
  /* ⚠️ THE WHOLE CLAIM: with queries on file, the words must never appear at any point. */
  expect(seen.firstRun, "THE EMPTY STATE FLASHED during the load").toBe(0);
});

test("the skeleton is what covers the load, in both columns", async ({ page }) => {
  test.setTimeout(240000);
  await page.addInitScript(() => {
    (window as any).__qcCols = { list: 0, pane: 0, listRows: 0, at: [] as string[] };
    const t0 = Date.now();
    const look = () => {
      const c = (window as any).__qcCols;
      const sk = document.querySelector(".qc-skel");
      if (!sk) return;
      const list = sk.querySelector(".f12-list");
      const pane = sk.querySelector(".qc-skel-pane");
      if (list && !c.list) { c.list = 1; c.at.push(`list@${Date.now() - t0}ms`); }
      if (pane && !c.pane) { c.pane = 1; c.at.push(`pane@${Date.now() - t0}ms`); }
      c.listRows = Math.max(c.listRows, sk.querySelectorAll(".qc-skel-row").length);
    };
    const obs = new MutationObserver(look);
    const start = () => { if (document.body) { obs.observe(document.body, { childList: true, subtree: true }); look(); } else setTimeout(start, 0); };
    start();
  });
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.waitForTimeout(4000);
  const c = await page.evaluate(() => (window as any).__qcCols);
  console.log(`  skeleton columns · list ${c.list ? "yes" : "NO"} · pane ${c.pane ? "yes" : "NO"} · skeleton rows ${c.listRows} · ${c.at.join(" ")}`);
  expect(c.list, "the LIST column never skeletoned").toBe(1);
  expect(c.pane, "the PANE column never skeletoned").toBe(1);
  expect(c.listRows, "the list skeleton drew no rows").toBeGreaterThan(0);
});
