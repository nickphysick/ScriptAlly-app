import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

/**
 * ⚠️ THE FIVE VIEWS AND THE FOUR ARRANGEMENTS (v54, Phase 6).
 *
 * The tabs decide WHICH rows exist; the group modes decide only where they are drawn. That
 * separation is the whole model, and both halves are asserted as identities rather than as counts:
 * a view's row set against its predicate, and two group modes against each other by row key.
 */
const tabs = (page: import("@playwright/test").Page) => page.evaluate(() => {
  const strip = document.querySelector(".tl-tabs") as HTMLElement | null;
  return [...(strip?.children ?? [])].map((b) => {
    const el = b as HTMLElement;
    const n = el.querySelector(".tl-tabn");
    return { label: (el.childNodes[0]?.textContent || "").trim(),
      count: n ? Number(n.textContent) : null, on: el.dataset.on === "true" };
  });
});
const rowKeys = (page: import("@playwright/test").Page) => page.evaluate(() =>
  ([...document.querySelectorAll(".tl-rrow")] as HTMLElement[])
    .filter((e) => e.getBoundingClientRect().width > 0)
    .map((e) => e.getAttribute("data-rowkey") || ""));

const pickGroup = async (page: import("@playwright/test").Page, label: string) => {
  await page.evaluate(() => {
    const b = [...document.querySelectorAll(".tl-menuwrap .tl-mbtn")]
      .find((e) => (e.textContent || "").trim().startsWith("Display")) as HTMLElement | undefined;
    if (!document.querySelector(".tl-pop")) b?.click();
  });
  await page.waitForTimeout(150);
  await page.evaluate((l) => {
    const r = [...document.querySelectorAll(".tl-poprow")]
      .find((x) => (x.querySelector(".tl-popname")?.textContent || "").trim() === "Group");
    if (!r) throw new Error("no Group row in Display");
    const b = [...r.querySelectorAll(".tl-popopts button")]
      .find((e) => (e.textContent || "").trim() === l) as HTMLElement | undefined;
    if (!b) throw new Error(`no Group option ${l} — found `
      + [...r.querySelectorAll(".tl-popopts button")].map((e) => e.textContent).join("/"));
    b.click();
  }, label);
  await page.waitForTimeout(450);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
};

test("five views, and the four counts add up to the fifth", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(900);
  const t = await tabs(page);
  console.log("tabs " + t.map((x) => `${x.label}${x.count == null ? "" : ` ${x.count}`}${x.on ? "*" : ""}`).join(" · "));
  expect(t.map((x) => x.label)).toEqual(["All", "Needs me", "With agents", "Tasks", "Closed"]);
  expect(t[0].on, "the board does not open on All").toBe(true);

  /* ⚠️ THE RECONCILIATION, against the RENDERED row count rather than a number written here — two
     derivations checking each other. Before the Tasks tab existed its two rows were counted inside
     `Needs me`, so a fifth tab would have made 9 + 14 + 2 + 0 = 25 against 23 rendered rows. */
  const rows = (await rowKeys(page)).length;
  const parts = t.slice(1).map((x) => x.count ?? 0);
  console.log(`rendered rows ${rows} · ${parts.join(" + ")} = ${parts.reduce((a, b) => a + b, 0)}`);
  expect(rows, "rows drawn").toBeGreaterThan(8);
  expect(parts.reduce((a, b) => a + b, 0), "the four views do not partition the board").toBe(rows);

  /**
   * ⚠️ AND EACH VIEW'S COUNT IS CHECKED AGAINST WHAT ITS ROWS ARE, not only against the sum.
   *
   * A partition can be satisfied by an EMPTY view: routing task rows back under `Needs me` gives
   * 9 + 14 + 0 + 0 = 23 and passes every arithmetic check while the Tasks tab is a dead control.
   * Proved — that mutation went green. A task row is the one with no query behind it, which the
   * row head draws as a square rather than a `StatusDot`, so the board can be asked directly.
   */
  const tasksOnBoard = await page.evaluate(() =>
    ([...document.querySelectorAll(".tl-rrow")] as HTMLElement[])
      .filter((e) => e.getBoundingClientRect().width > 0)
      .filter((e) => !!e.querySelector(".tl-sd")).length);
  const tasksTab = t.find((x) => x.label === "Tasks")!.count;
  console.log(`task rows on the board ${tasksOnBoard} · the Tasks tab claims ${tasksTab}`);
  expect(tasksOnBoard, "no task row on the board, so the Tasks view is untested").toBeGreaterThan(0);
  expect(tasksTab, "the Tasks tab does not count the board's task rows").toBe(tasksOnBoard);
  /* and `Needs me` must not be counting them as well */
  const needs = t.find((x) => x.label === "Needs me")!.count!;
  expect(needs + tasksOnBoard, "Needs me still includes the task rows").toBeLessThanOrEqual(rows);

  /**
   * ⚠️ `Closed` IS REJECTED OR WITHDRAWN, AND `No Response` IS NOT CLOSED (v55).
   *
   * A relationship that never got a reply has not ended: the writer can still nudge it and can
   * still choose to close it — which is exactly why the board offers it a close. Filing it under
   * `Closed` puts a row they can still act on into the one view that says there is nothing left to
   * do, and takes it out of `With agents`, where they would look for it.
   *
   * ⚠️ THE CLAIM IS A CONDITIONAL AND IS STATED AS ONE. No relationship on this fixture is
   * rejected or withdrawn, so `Closed` reads 0 and that is CORRECT — asserting a non-empty tab
   * would fail on a right board. What is asserted is the implication: where such a row exists, the
   * tab holds it; and the count of such rows is REPORTED, so a fixture that gains one is visible.
   */
  const terminal = await page.evaluate(() => {
    const vis = (e: Element) => (e as HTMLElement).getBoundingClientRect().height > 0;
    return ([...document.querySelectorAll(".tl-rrow")] as HTMLElement[]).filter(vis)
      .filter((r) => /^(Rejected|Withdrawn)$/i.test((r.querySelector(".tl-pill")?.textContent || "").trim()))
      .map((r) => (r.querySelector(".tl-nm2")?.textContent || "").trim());
  });
  const closedTab = t.find((x) => x.label === "Closed")!.count ?? 0;
  console.log(`rejected/withdrawn rows on the board: ${terminal.length}`
    + `${terminal.length ? " → " + terminal.join(", ") : " (so Closed 0 is correct here)"}`
    + ` · Closed tab ${closedTab}`);
  if (terminal.length > 0) {
    expect(closedTab, "a rejected or withdrawn relationship exists and Closed is empty")
      .toBeGreaterThanOrEqual(terminal.length);
  }
  /* ⚠️ AND NOTHING THE WRITER CAN STILL ACT ON MAY BE IN IT. `No Response` is the case that used
     to be, and it is the one the rule turns on. */
  const noResponse = await page.evaluate(() => {
    const vis = (e: Element) => (e as HTMLElement).getBoundingClientRect().height > 0;
    return ([...document.querySelectorAll(".tl-rrow")] as HTMLElement[]).filter(vis)
      .filter((r) => /no response/i.test((r.querySelector(".tl-pill")?.textContent || "").trim())).length;
  });
  console.log(`no-response rows: ${noResponse} (they belong under With agents, not Closed)`);
  expect(closedTab, "Closed counts more rows than are rejected or withdrawn").toBe(terminal.length);
});

test("each view draws exactly its own rows, and no row appears in two", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(900);
  const all = await rowKeys(page);
  const seen = new Map<string, string[]>();
  for (const [i, name] of [[1, "Needs me"], [2, "With agents"], [3, "Tasks"], [4, "Closed"]] as const) {
    /* ⚠️ THE TAB IS FOUND BY ITS LABEL, NOT BY INDEX. An index is a claim about the strip's order
       that the strip does not have to keep, and a click on the wrong one reports the previous
       view's rows against this view's count — which is what "Tasks says 2, board draws 14" was. */
    await page.evaluate((want) => {
      const b = [...document.querySelectorAll(".tl-tabs button")]
        .find((e) => (e.childNodes[0]?.textContent || "").trim() === want) as HTMLElement | undefined;
      if (!b) throw new Error(`no tab labelled ${want}`);
      b.click();
    }, name);
    await page.waitForTimeout(450);
    const keys = await rowKeys(page);
    const t = await tabs(page);
    const mine = t.find((x) => x.label === name)!;
    console.log(`${name}: tab says ${mine.count}, board draws ${keys.length}`);
    expect(mine.on, `${name} did not select`).toBe(true);
    expect(keys.length, `${name} drew a different number of rows than its tab claims`).toBe(mine.count);
    for (const k of keys) seen.set(k, [...(seen.get(k) ?? []), name]);
  }
  /* ⚠️ NO ROW IN TWO VIEWS, and every row of `All` in exactly one — the partition as an identity
     over row keys rather than as four numbers that happen to add up. */
  const twice = [...seen.entries()].filter(([, v]) => v.length > 1).map(([k, v]) => `${k}: ${v.join("+")}`);
  expect(twice, "a row appears in more than one view").toEqual([]);
  const missing = all.filter((k) => !seen.has(k));
  expect(missing, "a row of All appears in no view").toEqual([]);
});

test("⚠️ GROUPING MOVES ROWS, IT NEVER REMOVES THEM", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(900);
  const flat = await rowKeys(page);
  expect(flat.length, "no rows to group").toBeGreaterThan(8);
  const sets: Record<string, string[]> = { "One list": flat };
  for (const mode of ["Whose move", "Status"]) {
    await pickGroup(page, mode);
/* ⚠️ THE COLLAPSED GROUPS ARE OPENED FIRST. Two groups are collapsed at rest by design —
       snoozed and recently closed — so a rendered-row count under a grouping is legitimately lower
       than the flat list's, and comparing those two reports the design as a loss. Opening them
       makes the two sets comparable by IDENTITY, which is the claim. */
    const heads = await page.evaluate(() => {
      const btns = [...document.querySelectorAll(".tl-gtbtn")] as HTMLElement[];
      for (const b of btns) if (/show/i.test(b.textContent || "")) b.click();
      return ([...document.querySelectorAll(".tl-gt")] as HTMLElement[])
        .filter((e) => e.getBoundingClientRect().width > 0).length;
    });
    await page.waitForTimeout(350);
    sets[mode] = await rowKeys(page);
    console.log(`${mode}: ${heads} headings, ${sets[mode].length} rows`);
    expect(heads, `${mode} drew no headings`).toBeGreaterThan(0);
  }
  await pickGroup(page, "One list");
  const back = await rowKeys(page);

  /* ⚠️ BY IDENTITY, NOT BY COUNT. Two modes holding the same NUMBER of rows can hold different
     rows; the claim is that a mode decides where a row is drawn and never whether it is. */
  /* ⚠️ BY IDENTITY, NOT BY COUNT. Two modes holding the same NUMBER of rows can hold different
     rows; the claim is that a mode decides where a row is drawn and never whether it is. */
  for (const [mode, keys] of Object.entries(sets)) {
    expect([...keys].sort(), `${mode} holds a different row set from the flat list`)
      .toEqual([...flat].sort());
  }
  expect(back, "the flat list did not come back the same").toEqual(flat);
});
