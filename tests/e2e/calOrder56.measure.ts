import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

/**
 * THE BOARD OPENS SOONEST-FIRST — asserted on the PAINTED board, never on a seeded array.
 *
 * ⚠️ THE ORDER AND ITS KEY ARE READ FROM THE SAME ROWS. Each row publishes `data-pressing`, the
 * key SOONEST sorts on, so this compares the painted sequence against the key the page says it
 * used. A check that re-derived "nearest" here would be a second answer to a settled question,
 * free to disagree with the one the board is actually using — and the disagreement would read as
 * the board being broken.
 */
const painted = (page: import("@playwright/test").Page) => page.evaluate(`(() => {
  const vis = (e) => e.getBoundingClientRect().height > 0;
  return [...document.querySelectorAll(".tl-rrow")].filter(vis).map((r) => ({
    key: r.dataset.rowkey || "", p: r.dataset.pressing || "none",
  }));
})()`) as Promise<{ key: string; p: string }[]>;

const num = (p: string) => (p === "none" ? Infinity : Number(p));

/**
 * ⚠️ THE MONOTONIC-KEY CASE THAT STOOD HERE IS RETIRED INTO `calOrder58`, WHICH SUPERSEDES IT.
 *
 * It required the painted keys to be non-decreasing end to end. v58 orders in TIERS — owed work,
 * then dated waits, then long silences, then closed — and the last tier is placed by what a row IS
 * rather than by its key, so a closed row now sits last while carrying a smaller key than the
 * silences above it. The case went red on a board that had just been made correct: a lock pinned
 * to the shape of one ordering rather than to the rule behind it.
 *
 * `calOrder58` asserts the same claim in the form v58 states it — the tiers never interleave, and
 * inside a tier the keys are non-decreasing — over a board whose three tiers are each proved
 * non-empty first. Nothing was lost; the two cases below are untouched and still live.
 */
test("the first row is the most pressing on the board", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(1000);
  const rows = await painted(page);
  expect(rows.length, "no row painted").toBeGreaterThan(5);
  const min = Math.min(...rows.map((r) => num(r.p)));
  /* ⚠️ AND THE MINIMUM MUST BE A REAL KEY, not the `Infinity` a board of undated rows would give:
     "the first row holds the minimum" is satisfied by every row holding Infinity. */
  expect(min, "no row on the board is pressing at all").toBeLessThan(Infinity);
  console.log(`first row ${rows[0].key} p=${num(rows[0].p)} · board minimum ${min}`);
  expect(num(rows[0].p), `the first row is not the most pressing (${rows[0].key})`).toBe(min);
});

test("⚠️ leaving Soonest and coming back reproduces the load order, by identity", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(1000);
  const atLoad = (await painted(page)).map((r) => r.key);
  expect(atLoad.length, "no row painted at load").toBeGreaterThan(5);

  /* ⚠️ THE ROUND TRIP IS THE CLAIM, AND ASSERTING THE TWO STATES SEPARATELY CANNOT SEE IT. A board
     that is correct at load and correct after a re-selection can still be wrong in between, and
     "the default is applied at load" is exactly a claim about the transition. */
  const pick = async (label: string) => {
    await page.getByRole("button", { name: /DISPLAY/i }).click();
    await page.waitForTimeout(220);
    await page.getByRole("button", { name: new RegExp(`^${label}$`, "i") }).first().click();
    await page.waitForTimeout(320);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(220);
  };
  await pick("Longest waiting");
  const other = (await painted(page)).map((r) => r.key);
  /* the other order must actually differ, or "it came back" is satisfied by nothing having moved */
  expect(other.join("|") === atLoad.join("|"),
    "the other sort paints the same order, so the round trip tests nothing").toBe(false);
  await pick("Soonest");
  const back = (await painted(page)).map((r) => r.key);
  console.log(`load ${atLoad.length} rows · other order differs · returned identical: ${back.join("|") === atLoad.join("|")}`);
  expect(back, "returning to Soonest did not reproduce the load order").toEqual(atLoad);
});
