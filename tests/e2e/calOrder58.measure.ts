import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

/**
 * v58 LOAD ORDER: owed work first (most overdue first), then dated waits by date, then reminders,
 * then long silences, then closed.
 *
 * ⚠️ ASSERTED AS PROPERTIES OF THE PAINTED BOARD, never against a second sort written here. A
 * check that re-derives the order is a second answer to a settled question and is free to agree
 * with itself while the board is wrong.
 *
 * ⚠️ AND EVERY FILTER PROVES ITS POPULATION FIRST. A board with no closed row satisfies "no closed
 * row is above a live one" by having none, which is the state this account was in until a fixture
 * put a real closure on it.
 */

/* the sink constant the page sorts by — a silence keys above it, a real date below */
const PRESSING_BASE = 8.64e15;

const painted = (page: import("@playwright/test").Page) => page.evaluate(`(() => {
  const vis = (e) => e.getBoundingClientRect().height > 0;
  return [...document.querySelectorAll(".tl-rrow")].filter(vis).map((r) => {
    const c = r.querySelector(".tl-p");
    /* ⚠️ .tl-fchip SINCE v58 — the chip moved inside the card with the rest of the identity.
       The old .tl-pill selector matched nothing, and the population guard below is the only
       reason that surfaced as a failure rather than as a green over an empty set. */
    const pill = c ? c.querySelector(".tl-fchip") : null;
    return {
      key: r.dataset.rowkey || "",
      group: r.dataset.group || "none",
      p: r.dataset.pressing || "none",
      pill: pill ? pill.textContent.trim() : "",
      task: (r.dataset.rowkey || "").indexOf("task-") === 0,
    };
  });
})()`) as Promise<{ key: string; group: string; p: string; pill: string; task: boolean }[]>;

const keyOf = (p: string) => (p === "none" ? Infinity : Number(p));
/* three tiers, in the order v58 states them */
const tierOf = (r: { group: string; p: string }) =>
  (r.group === "closed" ? 2 : keyOf(r.p) >= PRESSING_BASE ? 1 : 0);

test("the board loads owed-first, then dated, then silences, then closed", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(1100);
  const rows = await painted(page);
  const tiers = rows.map(tierOf);
  const census = { dated: 0, silent: 0, closed: 0 };
  for (const t of tiers) { if (t === 0) census.dated++; else if (t === 1) census.silent++; else census.closed++; }
  console.log(`rows ${rows.length} — dated ${census.dated} · silences ${census.silent} · closed ${census.closed}`);
  rows.slice(0, 8).forEach((r, i) =>
    console.log(`  ${String(i).padStart(2)} tier ${tierOf(r)}  ${r.pill.padEnd(19)} ${r.key}`));

  /* ⚠️ ALL THREE TIERS MUST BE PRESENT. "no silence above a dated row" is free on a board with no
     silences, and "closed is last" is free on a board with no closures. */
  expect(census.dated, "no dated row, so the first tier was not tested").toBeGreaterThan(3);
  expect(census.silent, "no long silence on the board, so the silence tier was not tested")
    .toBeGreaterThan(0);
  expect(census.closed, "no closed row — run tests/e2e/seedRejection.mjs, or the tier is untested")
    .toBeGreaterThan(0);

  /* the tiers never interleave */
  const outOfTier: string[] = [];
  for (let i = 1; i < tiers.length; i++) {
    if (tiers[i] < tiers[i - 1]) {
      outOfTier.push(`${rows[i].key} (tier ${tiers[i]}) below ${rows[i - 1].key} (tier ${tiers[i - 1]})`);
    }
  }
  expect(outOfTier, "a row is painted below a row from a later tier").toEqual([]);

  /* and inside a tier, by date */
  const outOfDate: string[] = [];
  for (let i = 1; i < rows.length; i++) {
    if (tiers[i] === tiers[i - 1] && keyOf(rows[i].p) < keyOf(rows[i - 1].p)) {
      outOfDate.push(`${rows[i].key} (${keyOf(rows[i].p)}) after ${rows[i - 1].key} (${keyOf(rows[i - 1].p)})`);
    }
  }
  expect(outOfDate, "within one tier, a row is painted after a more pressing one").toEqual([]);
});

test("⚠️ every writer-owed row is painted above every row still waiting on an agency", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(1100);
  const rows = (await painted(page)).filter((r) => !r.task);
  /* the deeds are the writer's; a status word is the agency's turn */
  const DEEDS = ["Send the partial", "Send the full", "Send the revision", "Answer them", "Nudge due"];
  const owedIdx: number[] = [], waitIdx: number[] = [];
  rows.forEach((r, i) => {
    if (r.group === "closed") return;
    /* owed = the writer holds it AND its date has passed; the board says so by going imperative */
    if (DEEDS.indexOf(r.pill) >= 0 && keyOf(r.p) < Date.now()) owedIdx.push(i);
    else if (DEEDS.indexOf(r.pill) < 0) waitIdx.push(i);
  });
  console.log(`overdue deeds ${owedIdx.length} · rows waiting on an agency ${waitIdx.length}`);
  /* ⚠️ BOTH POPULATIONS, or "the deeds lead" is a statement about an empty set. */
  expect(owedIdx.length, "no overdue deed on the board, so 'owed leads' was not tested")
    .toBeGreaterThan(1);
  expect(waitIdx.length, "no waiting row on the board, so there is nothing for it to lead")
    .toBeGreaterThan(3);
  expect(Math.max(...owedIdx) < Math.min(...waitIdx),
    `an overdue deed is painted below a waiting row (last deed ${Math.max(...owedIdx)}, first wait ${Math.min(...waitIdx)})`)
    .toBe(true);
});

test("the four tab counts sum to All", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(1100);
  const t = await page.evaluate(`(() => {
    const vis = (e) => e.getBoundingClientRect().height > 0;
    const out = {};
    for (const b of [...document.querySelectorAll("button")].filter(vis)) {
      const s = (b.textContent || "").trim();
      const m = /^(All|Needs me|With agents|Tasks|Closed)\\s*([0-9]*)$/.exec(s);
      if (m) out[m[1]] = m[2] === "" ? null : Number(m[2]);
    }
    out.__rows = [...document.querySelectorAll(".tl-rrow")].filter(vis).length;
    return out;
  })()`) as unknown as Record<string, number | null>;
  const rows = t.__rows as number;
  const four = ["Needs me", "With agents", "Tasks", "Closed"].map((k) => (t[k] ?? 0) as number);
  console.log(`tabs — needs ${four[0]} · with ${four[1]} · tasks ${four[2]} · closed ${four[3]} · rows on All ${rows}`);
  /* ⚠️ EVERY BUCKET MUST HAVE BEEN FOUND, or a missing tab reads as a zero and the sum still works */
  for (const k of ["Needs me", "With agents", "Tasks", "Closed"]) {
    expect(t[k], `the ${k} tab was not found on the board`).not.toBeUndefined();
  }
  expect(rows, "no row painted on All").toBeGreaterThan(5);
  expect(four.reduce((a, b) => a + b, 0),
    `the four buckets sum to ${four.reduce((a, b) => a + b, 0)} against ${rows} rows on All`).toBe(rows);
});
