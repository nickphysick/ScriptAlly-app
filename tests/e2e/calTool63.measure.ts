/**
 * v63 C → v64 §E — the controls drive the board.
 *
 * ⚠️ RETARGETED WHOLESALE BY v64. The §C toolbar is deleted — Group, Filter and Sort live in the
 * sidebar's Notion panel now, and the row-count line, the badge and Clear-all went with the bar.
 * What this file keeps is its LAW, unchanged: every case drives the control and reads the BOARD,
 * never the control's own state — a panel whose rows tick correctly while the rows below never
 * move is the composed-result fault. Each case takes a BEFORE of the rendered rows, operates,
 * and takes an AFTER; the claim is the difference.
 *
 * ⚠️ AND EACH CASE ASSERTS ITS POPULATION FIRST, and prints the distinct values it saw.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const CAL = "/todo/calendar";

/** the board as it is drawn: every group's name and the row keys under it, in order */
async function boardNow(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const grid = [...document.querySelectorAll<HTMLElement>(".tl-cal")]
      .find((e) => e.getBoundingClientRect().height > 0);
    if (!grid) return null;
    const groups = [...grid.querySelectorAll<HTMLElement>(".tl-grp")].map((g) => ({
      /* ⚠️ THE LABEL IS THE LAST DIRECT SPAN — a status group's mark is the app's `StatusDot`,
         whose own wrapper is a span, so "first span that is not the icon" reads the DOT and
         returns "". The label span always sits between the mark and the count. */
      label: [...g.querySelectorAll(".tl-gdiv .gp > span")]
        .filter((s) => !s.classList.contains("gico") && !s.querySelector("svg"))
        .pop()?.textContent?.trim() ?? "",
      count: Number(g.querySelector(".tl-gdiv .gp b")?.textContent ?? "0"),
      rows: [...g.querySelectorAll<HTMLElement>(".tl-glanes > *")]
        .map((r) => r.getAttribute("data-rowkey") ?? r.textContent?.trim().slice(0, 40) ?? ""),
    }));
    return {
      groups,
      rows: groups.flatMap((g) => g.rows),
      rowTotal: groups.reduce((n, g) => n + g.rows.length, 0),
    };
  });
}

/** click a panel row by its label (Group/Filter/Sort) to toggle its expansion */
async function toggleRow(page: import("@playwright/test").Page, label: string) {
  await page.evaluate((lab) => {
    const rows = [...document.querySelectorAll<HTMLElement>(".tl-axis .tl-pr")];
    const r = rows.find((x) => new RegExp(lab, "i").test(x.textContent ?? ""));
    if (!r) throw new Error(`no ${lab} row`);
    r.click();
  }, label);
  await page.waitForTimeout(120);
}

/** click an option inside an open expansion by its text */
async function pickOption(page: import("@playwright/test").Page, text: string) {
  await page.evaluate((t) => {
    const opts = [...document.querySelectorAll<HTMLElement>(".tl-axis .tl-px button")];
    const o = opts.find((x) => (x.textContent ?? "").trim() === t);
    if (!o) throw new Error(`no option "${t}" — have: ${opts.map((x) => x.textContent?.trim()).join(", ")}`);
    o.click();
  }, text);
  await page.waitForTimeout(200);
}

test.describe("v64 · §E — the panel drives the board", () => {
  test("⚠️ (c1) the toolbar is GONE, and the panel is the one home — no count line, no badge, no Clear all", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const f = await page.evaluate(() => ({
      vtool: document.querySelectorAll(".tl-vtool").length,
      cnt: document.querySelectorAll(".tl-tbcnt").length,
      clear: document.querySelectorAll(".tl-tbclear").length,
      trig: document.querySelectorAll(".tl-tbtrig").length,
      panelRows: [...document.querySelectorAll<HTMLElement>(".tl-axis .tl-pr")]
        .map((r) => (r.textContent ?? "").trim().slice(0, 30)),
    }));
    expect(f.vtool, "the toolbar is back").toBe(0);
    expect(f.cnt, "the count line is back").toBe(0);
    expect(f.clear, "Clear all is back").toBe(0);
    expect(f.trig, "a toolbar trigger survives somewhere").toBe(0);
    /* the replacement is PRESENT: three rows, in the panel */
    expect(f.panelRows.length, `the panel has ${f.panelRows.length} rows`).toBe(3);
  });

  test("⚠️ (c2) Group changes the GROUP SET, and every grouping's counts sum to the rows drawn", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const modes: { pick: string; expectLabels: RegExp }[] = [
      { pick: "Whose move", expectLabels: /^(With you|With the agent|Offer on the table|Closed)$/ },
      { pick: "Status", expectLabels: /Queried|Partial|Full|Revise|Offer|Rejected|Withdrawn|No Response|Closed|Task/ },
      { pick: "None", expectLabels: /^$/ },
      { pick: "Attention", expectLabels: /Urgent|Upcoming|With agents|Tasks|Closed/ },
    ];
    const seen: string[][] = [];
    for (const m of modes) {
      /* Group is open at rest; picking never closes the radio group */
      await pickOption(page, m.pick);
      const b = await boardNow(page);
      expect(b, "no board").not.toBeNull();
      expect(b!.rowTotal, `${m.pick}: no rows drawn`).toBeGreaterThan(3);
      seen.push(b!.groups.map((g) => g.label));
      if (m.pick === "None") {
        expect(b!.groups.length, "None still draws group bars").toBeLessThanOrEqual(1);
      } else {
        expect(b!.groups.length, `${m.pick}: one flat list — the mode did nothing`).toBeGreaterThan(1);
        for (const g of b!.groups) {
          expect(g.label, `${m.pick}: bar "${g.label}"`).toMatch(m.expectLabels);
          expect(g.count, `${m.pick}: ${g.label} says ${g.count} over ${g.rows.length} rows`)
            .toBe(g.rows.length);
        }
      }
    }
    console.log(`groupings seen: ${JSON.stringify(seen)}`);
    /* the sets differ — the control changed the BOARD, not its own tick */
    expect(new Set(seen.map((s) => s.join("|"))).size, "two groupings drew the same set").toBe(4);
  });

  test("⚠️ (c3) Sort changes the ORDER of rows, not their number", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    /* flatten grouping first so order is readable across the whole list */
    await pickOption(page, "None");
    const before = await boardNow(page);
    expect(before!.rowTotal, "no rows").toBeGreaterThan(5);
    await pickOption(page, "Queried date");
    const after = await boardNow(page);
    expect(after!.rowTotal, "a sort changed the row COUNT").toBe(before!.rowTotal);
    expect(after!.rows.join("|"), "Queried date drew the same order as Urgency — the control did nothing")
      .not.toBe(before!.rows.join("|"));
    /* and back — the default restores the original order */
    await pickOption(page, "Urgency");
    const home = await boardNow(page);
    expect(home!.rows.join("|"), "returning to Urgency did not restore the order")
      .toBe(before!.rows.join("|"));
  });

  test("⚠️ (c4) unticking a facet hides ONLY its carriers; the row badges N hidden; Clear restores", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const before = await boardNow(page);
    expect(before!.rowTotal, "no rows").toBeGreaterThan(5);
    await toggleRow(page, "filter");
    /* untick Task under Type — the cleanest facet to census from outside */
    const counts = await page.evaluate(() => {
      const secs = [...document.querySelectorAll<HTMLElement>(".tl-axis .tl-fh2")];
      const type = secs.find((s) => /type/i.test(s.textContent ?? ""));
      if (!type) return null;
      const opts: { label: string; n: number }[] = [];
      for (let e = type.nextElementSibling; e && !e.classList.contains("tl-fh2"); e = e.nextElementSibling) {
        const b = e.querySelector("b");
        if (b) opts.push({ label: (e.textContent ?? "").replace(b.textContent ?? "", "").trim(), n: Number(b.textContent) });
      }
      return opts;
    });
    expect(counts, "no Type section in the filter").not.toBeNull();
    const task = counts!.find((o) => /task/i.test(o.label));
    expect(task, "no Task option").toBeTruthy();
    expect(task!.n, "the fixture has no tasks — the hide claim is unexercised").toBeGreaterThan(0);
    /* the option's text is label + its zero-padded count — match on the label's start */
    await page.evaluate(() => {
      const opts = [...document.querySelectorAll<HTMLElement>(".tl-axis .tl-px button")];
      const o = opts.find((x) => /^task/i.test((x.textContent ?? "").trim()));
      if (!o) throw new Error("no Task option to untick");
      o.click();
    });
    await page.waitForTimeout(250);
    const hidden = await page.evaluate(() =>
      document.querySelector(".tl-axis .tl-prv.act")?.textContent?.trim() ?? null);
    /* ⚠️ THE BADGE COUNTS UNTICKED OPTIONS, NOT HIDDEN ROWS — the ref's own arithmetic
       (`SEC.forEach … if(FACET[..]===false) hidden++`). One untick badges "1 hidden" while three
       task rows leave the board; the first draft of this case asserted rows and was wrong. */
    expect(hidden, "the Filter row does not badge the unticked count").toBe("1 hidden");
    const during = await boardNow(page);
    expect(before!.rowTotal - during!.rowTotal, "unticking Task hid a different number of rows than the census counted")
      .toBe(task!.n);
    /* Clear restores the whole board */
    await page.evaluate(() => {
      const c = document.querySelector<HTMLElement>(".tl-axis .tl-prclr");
      if (!c) throw new Error("no Clear affordance beside the hidden badge");
      c.click();
    });
    await page.waitForTimeout(200);
    const after = await boardNow(page);
    expect(after!.rowTotal, "Clear did not restore the board").toBe(before!.rowTotal);
  });

  test("⚠️ (c5) the facet counts are a census of the board, not of the filtered view", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const before = await boardNow(page);
    await toggleRow(page, "filter");
    const typeCounts = await page.evaluate(() => {
      const secs = [...document.querySelectorAll<HTMLElement>(".tl-axis .tl-fh2")];
      const type = secs.find((s) => /type/i.test(s.textContent ?? ""));
      const opts: number[] = [];
      for (let e = type?.nextElementSibling; e && !e.classList.contains("tl-fh2"); e = e.nextElementSibling) {
        const b = e.querySelector("b"); if (b) opts.push(Number(b.textContent));
      }
      return opts;
    });
    expect(typeCounts.length, "the Type section offers no options").toBeGreaterThan(1);
    const sum = typeCounts.reduce((a, b) => a + b, 0);
    /* ⚠️ THE TYPE FACET PARTITIONS: every row is a query or a task, so the counts SUM to the
       board. A facet that counted the filtered view would change as you clicked it — the fault
       the retired tab strip had, restated on the new surface. */
    expect(sum, `Type counts sum to ${sum} against ${before!.rowTotal} rows drawn`)
      .toBe(before!.rowTotal);
  });
});
