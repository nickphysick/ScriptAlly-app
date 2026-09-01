import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

/**
 * CLOSED — Rejected, Withdrawn, or an agency's own no-means-no policy with its window passed.
 *
 * ⚠️ THIS FILE NEEDS `node tests/e2e/seedRejection.mjs`. Without a recorded rejection on the
 * account the tab reconciles 0 against 0 and every claim here is satisfied by an empty set — which
 * is what it read before this round. The population assertions below fail loudly rather than
 * passing quietly if the fixture is missing.
 */
const board = (page: import("@playwright/test").Page) => page.evaluate(`(() => {
  const vis = (e) => e.getBoundingClientRect().height > 0;
  const tabs = {};
  for (const b of [...document.querySelectorAll("button")].filter(vis)) {
    const t = (b.textContent || "").trim();
    const m = /^(All|Needs me|With agents|Tasks|Closed)\\s*([0-9]*)$/.exec(t);
    if (m) tabs[m[1]] = m[2] === "" ? null : Number(m[2]);
  }
  const rows = [...document.querySelectorAll(".tl-rrow")].filter(vis);
  return {
    tabs: tabs,
    rows: rows.length,
    keys: rows.map((r) => r.dataset.rowkey),
    closeGhosts: [...document.querySelectorAll('.tl-ghost[data-ghost="close"]')]
      .filter((g) => g.getBoundingClientRect().width > 0).map((g) => g.dataset.ghostrel),
    dashedClosed: rows.map((r) => {
      const c = r.querySelector(".tl-p");
      if (!c) return null;
      const f = c.querySelector(".tl-frame") || c;
      return { key: r.dataset.rowkey, closed: c.classList.contains("closedp"),
        style: getComputedStyle(f).borderTopStyle };
    }).filter(Boolean),
  };
})()`) as Promise<any>;

const openTab = (page: import("@playwright/test").Page, label: string) => page.evaluate(
  `(() => { const b = [...document.querySelectorAll("button")]
      .find((x) => new RegExp("^" + ${JSON.stringify(JSON.stringify("LBL"))}.slice(1, -1)).test((x.textContent || "").trim()));
    if (b) b.click(); })()`.replace("LBL", label));

test("the tab counts reconcile, with a Closed count that is not zero", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(1000);
  const b = await board(page);
  console.log(`tabs ${JSON.stringify(b.tabs)} · rows painted ${b.rows}`);
  /* ⚠️ THE FIXTURE IS A PRECONDITION, NOT A NICE-TO-HAVE. 0 = 0 proves nothing about Closed. */
  expect(b.tabs.Closed, "no Closed count on the board").not.toBeNull();
  expect(b.tabs.Closed, "Closed is zero — run tests/e2e/seedRejection.mjs, or this proves nothing")
    .toBeGreaterThan(0);
  const sum = (b.tabs["Needs me"] ?? 0) + (b.tabs["With agents"] ?? 0)
    + (b.tabs.Tasks ?? 0) + (b.tabs.Closed ?? 0);
  expect(sum, `the four views sum to ${sum} against ${b.rows} rows painted on All`).toBe(b.rows);
});

test("⚠️ a row in Closed carries no close ghost — the move has been made", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(1000);
  await openTab(page, "Closed");
  await page.waitForTimeout(600);
  const b = await board(page);
  console.log(`Closed tab — rows ${b.rows} · close ghosts ${b.closeGhosts.length}`);
  for (const d of b.dashedClosed) console.log(`  ${d.key} drawnAsClosedCard=${d.closed} border=${d.style}`);
  /* ⚠️ POPULATION: an empty Closed tab satisfies this trivially, which is what it did before. */
  expect(b.rows, "the Closed tab is empty, so the claim was not tested").toBeGreaterThan(0);
  /* offering a close on a closed row is offering to do the thing that has been done */
  expect(b.closeGhosts, "a closed row offers a close ghost").toEqual([]);
});

/**
 * ⚠️ A RECORDED REJECTION NEVER REACHES THIS BOARD, AND THE CLOSED TAB CANNOT SHOW ONE.
 *
 * `tests/e2e/seedRejection.mjs` puts a real `Rejected` query on the harness account, on the
 * manuscript the board opens on, closed two days ago and well inside `CLOSED_LINGER_DAYS`. It does
 * not render. The mechanism is the survival rule: a row is kept only if it has items, segments or
 * nodes, and `facts` excludes every closed query — so a relationship whose only query is rejected
 * builds no bar, scores `alive === 0`, and is dropped before any tab is consulted.
 *
 * That is why `Closed` read 0 on an account that holds a rejection. The tab's only possible members
 * are rows closed by the AGENCY-POLICY clause, whose queries are still `Queried` and therefore
 * still draw a bar — which is what it now holds.
 *
 * ⚠️ THIS IS ASSERTED, NOT MERELY NOTED, so the day the board starts drawing terminal queries this
 * fails and someone re-reads the paragraph above rather than discovering it again from scratch.
 * It is a REPORTED limitation of the board, not a defect this view-layer pass invented.
 */
test("⚠️ the seeded rejection is stored and is not drawn — a stated limitation", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(1000);
  const seen = await page.evaluate(`(() => {
    const vis = (e) => e.getBoundingClientRect().height > 0;
    const keys = [...document.querySelectorAll(".tl-rrow")].filter(vis).map((r) => r.dataset.rowkey || "");
    return { rows: keys.length, rej: keys.filter((k) => k.indexOf("rej-") >= 0) };
  })()`) as unknown as { rows: number; rej: string[] };
  console.log(`rows ${seen.rows} · rows from the seeded rejection: ${seen.rej.length}`);
  expect(seen.rows, "no row on the board at all").toBeGreaterThan(5);
  expect(seen.rej,
    "the seeded rejection now DRAWS — the board has started showing terminal queries, so the "
    + "Closed tab can hold a real closed card and the dashed-frame rule is testable for the "
    + "first time. Read this test's own note, then assert it.").toEqual([]);
});
