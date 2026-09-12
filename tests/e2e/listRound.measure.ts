/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE LIST ROUND, MEASURED ON THE RENDERED PAGE — Phase 2, the list view
 * (`design-refs/todo-list-view-contract.html`).
 *
 * ⚠️ THE EXPECTATIONS ARE DERIVED, NEVER TYPED. Each row's real days are rebuilt from the chip it
 * DRAWS (month, day, and the year it states or omits), and the figure beside it must then be the
 * contract's own `unit()` of those days — read out of the contract file and run. So a chip missing a
 * year, a figure off the wrong unit, and a sort by the rounded figure all fail against the page's own
 * output, not against a number this file made up.
 *
 * ⚠️ AND IT PUTS THE ACCOUNT BACK IN THE SAME RUN. It seeds three dated tasks (today, +4, +12 — the
 * account holds no future date, so the ahead and today branches would otherwise never be entered),
 * and the head clicks write the stored list view. Both are restored in `finally`, the view to the
 * exact object read before.
 */
import { test, expect, type Page } from "@playwright/test";
import { ensureSignedIn } from "./measure";
import { gotoTodo, assertCount } from "./todoOpen";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { seedDueDates, cleanDueDates, readListView, restoreListView } from "./seedDueDates.mjs";
test.setTimeout(900_000);

const OUT = "run-artifacts/list-round.txt";
/** the last recorded count — a run producing fewer is red, whatever its cases say */
const FLOOR = 16;

const REF = readFileSync("design-refs/todo-list-view-contract.html", "utf8");
const UNIT_SRC = REF.match(/function unit\(d\)\{[^\n]*\}/)?.[0] ?? "";
const refUnit = new Function(`${UNIT_SRC}; return unit;`)() as (d: number) => [number | string, string];

const BURG = "rgb(124, 58, 42)";
const INK = "rgb(58, 28, 20)";
const MUTED2 = "rgb(138, 122, 108)";
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const pad = (n: number) => String(n).padStart(2, "0");
const now = new Date();
const TODAY = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
const utc = (ymd: string) => { const [y, m, d] = ymd.split("-").map(Number); return Date.UTC(y, m - 1, d); };
/** positive = overdue, 0 = today, negative = ahead — real calendar days */
const daysOver = (ymd: string) => Math.round((utc(TODAY) - utc(ymd)) / 86400000);

interface Row {
  key: string; h: number; group: string; cat: string; task: string;
  chipNone: boolean; chipBorder: string; mon: string; day: string; year: string;
  lovCls: string; lovText: string; fig: string; unit: string; figColor: string; figWeight: string;
}

async function readRows(page: Page, scope: string): Promise<Row[]> {
  return page.evaluate((s: string) => {
    const vis = (e: Element) => e.getBoundingClientRect().height > 0;
    const txt = (e: Element | null | undefined) => (e?.textContent ?? "").trim();
    return [...document.querySelectorAll(s + ".tlc .row")].filter(vis).map((r) => {
      let p = r.previousElementSibling;
      while (p && !p.classList.contains("grp")) p = p.previousElementSibling;
      const chip = r.querySelector(".lchip");
      const lov = r.querySelector(".lov");
      const b = lov?.querySelector("b");
      return {
        key: r.getAttribute("data-rowkey") ?? "",
        h: Math.round(r.getBoundingClientRect().height * 10) / 10,
        group: txt(p?.querySelector(".g-lbl")),
        cat: txt(r.querySelector(".ltask .s")),
        task: txt(r.querySelector(".ltask .h")),
        chipNone: !!chip?.classList.contains("none"),
        chipBorder: chip ? getComputedStyle(chip).borderTopStyle : "",
        mon: txt(r.querySelector(".lchip .m")),
        day: txt(r.querySelector(".lchip .d")),
        year: txt(r.querySelector(".lchip .y")),
        lovCls: lov?.className ?? "",
        lovText: txt(lov),
        fig: txt(b),
        unit: txt(lov?.querySelector(".u")),
        figColor: b ? getComputedStyle(b).color : "",
        figWeight: b ? getComputedStyle(b).fontWeight : "",
      };
    });
  }, scope);
}

/** the row's due day, rebuilt from the chip it draws — the year it states, or this year */
const dueOfRow = (r: Row): string | null => {
  if (r.chipNone) return null;
  const m = MON.indexOf(r.mon);
  if (m < 0 || !r.day) return "unreadable";
  return `${r.year || TODAY.slice(0, 4)}-${pad(m + 1)}-${pad(Number(r.day))}`;
};

/** whose clock a row's date is, from the KIND the row states — never from its figure or its class */
const ownerFor = (cat: string, dated: boolean): "owed" | "theirs" | "none" =>
  cat === "Agent request" ? "owed" : !dated ? "none" : (cat === "Nudge" || cat === "Gone quiet") ? "theirs" : "owed";

test("the list view — Phase 2", async ({ page }) => {
  rmSync(OUT, { force: true });
  const out: { id: string; ok: boolean; note: string }[] = [];
  const add = (id: string, ok: boolean, note: string) => out.push({ id, ok, note });
  expect(UNIT_SRC, "the contract no longer carries `function unit(d)`").not.toBe("");

  const savedView = await readListView();
  const seeded = await seedDueDates();
  try {
    await ensureSignedIn(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    const scope = await gotoTodo(page, "list");
    await page.waitForTimeout(1200);
    const rows = await readRows(page, scope);

    /* ── the population first — a sweep of nothing proves nothing ── */
    expect(rows.length, "the list drew no rows").toBeGreaterThan(10);
    for (const s of seeded) {
      expect(rows.some((r) => r.key === s.id), `the seeded ${s.id} is not on the list`).toBe(true);
    }

    /* ── P2.1 · the header: four heads, over their own columns ── */
    const head = await page.evaluate((s: string) => {
      const hd = [...document.querySelectorAll(s + ".tlc .lhd")].find((e) => e.getBoundingClientRect().height > 0);
      const row = [...document.querySelectorAll(s + ".tlc .row")].find((e) => e.getBoundingClientRect().height > 0);
      if (!hd || !row) return null;
      const left = (e: Element | null) => (e ? Math.round(e.getBoundingClientRect().left * 10) / 10 : -1);
      return {
        labels: [...hd.querySelectorAll("button")].map((b) => b.getAttribute("aria-label") ?? ""),
        hdTracks: getComputedStyle(hd).gridTemplateColumns,
        rowTracks: getComputedStyle(row).gridTemplateColumns,
        heads: ["task", "agent", "due", "over"].map((k) => left(hd.querySelector(".h-" + k))),
        cells: [".ltask", ".lag", ".lchip", ".lov"].map((c) => left(row.querySelector(c))),
      };
    }, scope);
    expect(head, "no visible header").not.toBeNull();
    const hd = head!;
    add("P2.1a · the heads are Task · Agent · Due · Overdue by, in that order",
      JSON.stringify(hd.labels) === JSON.stringify(["Sort by Task", "Sort by Agent", "Sort by Due", "Sort by Overdue by"]),
      JSON.stringify(hd.labels));
    add("P2.1b · the header and the row resolve the SAME six tracks",
      hd.hdTracks === hd.rowTracks && hd.rowTracks.split(" ").length === 6,
      "header " + hd.hdTracks + " · row " + hd.rowTracks);
    add("P2.1c · each head sits over its own column, to the pixel",
      hd.heads.every((x, i) => Math.abs(x - hd.cells[i]) <= 1),
      "heads " + JSON.stringify(hd.heads) + " · cells " + JSON.stringify(hd.cells));

    /* ── P2.2 · every row 62 ± 1 ── */
    const off = rows.filter((r) => Math.abs(r.h - 62) > 1);
    add("P2.2 · every row is 62px ± 1", off.length === 0,
      rows.length + " rows · heights " + JSON.stringify([...new Set(rows.map((r) => r.h))]) + (off.length ? " · off: " + off.map((r) => r.key + "=" + r.h).join(", ") : ""));

    /* ── P2.3 · colour is ownership, never magnitude ── */
    const over = rows.filter((r) => /\blov (owed|theirs)\b/.test(r.lovCls));
    const judged = over.map((r) => {
      const due = dueOfRow(r)!;
      const owner = ownerFor(r.cat, true);
      return { r, days: daysOver(due), owner, cls: r.lovCls.includes("owed") ? "owed" : "theirs" };
    });
    const badColour = judged.filter((j) => j.r.figColor !== (j.owner === "owed" ? BURG : INK));
    add("P2.3a · an overdue numeral is burgundy exactly when the writer owes the date, ink otherwise",
      judged.length > 5 && badColour.length === 0,
      judged.length + " overdue rows · wrong: " + JSON.stringify(badColour.map((j) => [j.r.cat, j.r.fig + " " + j.r.unit, j.r.figColor])));
    const badClass = judged.filter((j) => j.cls !== j.owner);
    add("P2.3b · the cell's owner is the one the row's KIND implies — derived, and it reached the class",
      badClass.length === 0,
      "tally " + JSON.stringify(Object.entries(judged.reduce((a, j) => { const k = j.r.cat + " → " + j.cls; a[k] = (a[k] ?? 0) + 1; return a; }, {} as Record<string, number>))));
    const owed = judged.filter((j) => j.owner === "owed").map((j) => j.days);
    const theirs = judged.filter((j) => j.owner === "theirs").map((j) => j.days);
    /* ⚠️ THE RANGES MUST CROSS. If every owed row were older than every theirs row, a rule keyed to
       SIZE would paint this page identically — so the page only proves "ownership, not magnitude"
       when both colours occur on both sides of each other. */
    const crosses = owed.length > 0 && theirs.length > 0
      && Math.max(...theirs) > Math.min(...owed) && Math.max(...owed) > Math.min(...theirs);
    add("P2.3c · both colours occur across the same range of days — so size cannot be what decides",
      crosses, "owed days " + JSON.stringify(owed.sort((a, b) => a - b)) + " · theirs days " + JSON.stringify(theirs.sort((a, b) => a - b)));

    /* ── P2.4 · ahead is muted and says "to go"; today says "Due today" in ink ── */
    const ahead = rows.filter((r) => r.lovCls.split(" ").includes("ahead"));
    const aheadBad = ahead.filter((r) => !r.unit.endsWith(" to go") || r.figColor !== MUTED2 || r.figWeight !== "400");
    add("P2.4a · a row not yet due reads 'N days to go', muted, at 400",
      ahead.length >= 2 && aheadBad.length === 0,
      ahead.length + " ahead · " + JSON.stringify(ahead.map((r) => r.fig + " " + r.unit + " " + r.figColor)));
    const todayRows = rows.filter((r) => r.lovText === "Duetoday" || (r.fig === "Due" && r.unit === "today"));
    add("P2.4b · a row due today reads 'Due today', with no owner's colour",
      todayRows.length >= 1 && todayRows.every((r) => r.lovCls.trim() === "lov" && r.figColor === INK),
      todayRows.length + " today · " + JSON.stringify(todayRows.map((r) => [r.task, r.lovCls, r.figColor])));

    /* ── P2.5 · a null date: the dashed chip, "no date", and no numeral ── */
    const none = rows.filter((r) => r.chipNone);
    const noneBad = none.filter((r) => r.chipBorder !== "dashed" || r.day.toLowerCase() !== "none" || r.lovText.toLowerCase() !== "no date" || r.fig !== "");
    add("P2.5 · a dateless row draws the dashed 'none' chip and no numeral",
      none.length >= 1 && noneBad.length === 0,
      none.length + " dateless · " + JSON.stringify([...new Set(none.map((r) => r.cat))]));

    /* ── P2.6 / P2.7 · the chip's year and the figure — both judged against the contract's unit() ── */
    const years = rows.filter((r) => r.year);
    add("P2.6 · a chip states its year only when the year is not this one",
      years.length >= 1 && years.every((r) => r.year !== TODAY.slice(0, 4)),
      years.length + " chips with a year · " + JSON.stringify([...new Set(years.map((r) => r.year))]));
    const figured = rows.filter((r) => /\blov (owed|theirs|ahead)\b/.test(r.lovCls));
    const figBad = figured.filter((r) => {
      const d = daysOver(dueOfRow(r)!);
      const [v, u] = refUnit(d);
      const unit = d < 0 ? `${u} to go` : u;
      return r.fig !== String(v) || r.unit !== unit;
    });
    add("P2.7 · every figure is the contract's own unit() of the real days its chip names",
      figured.length > 5 && figBad.length === 0,
      figured.length + " figures · wrong: " + JSON.stringify(figBad.map((r) => [r.mon + " " + r.day + " " + r.year, r.fig + " " + r.unit])));

    /* ── P2.8 · the heads sort, by real days ── */
    const clickHead = async (k: string) => {
      await page.evaluate(([s, key]: [string, string]) => {
        const b = [...document.querySelectorAll(s + ".tlc .lhd .h-" + key)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement | undefined;
        b?.click();
      }, [scope, k] as [string, string]);
      await page.waitForTimeout(1500);
    };
    const byGroup = (rs: Row[]) => rs.reduce((a, r) => { (a[r.group] ??= []).push(r); return a; }, {} as Record<string, Row[]>);
    const monotone = (xs: number[], dir: 1 | -1) => xs.every((x, i) => i === 0 || (x - xs[i - 1]) * dir >= 0);
    const overKey = (r: Row) => { const d = dueOfRow(r); return d ? daysOver(d) : -1e9; };

    await clickHead("over");
    const s1 = await readRows(page, scope);
    const g1 = byGroup(s1);
    add("P2.8a · Overdue by: within every group, real days never increase down the list (undated last)",
      s1.length === rows.length && Object.values(g1).every((rs) => monotone(rs.map(overKey), -1)),
      Object.entries(g1).map(([g, rs]) => g + ": " + rs.map(overKey).map((x) => (x === -1e9 ? "·" : x)).join(" ")).join(" | "));
    const arrow1 = await page.evaluate((s: string) => ([...document.querySelectorAll(s + ".tlc .lhd .h-over")]
      .find((e) => e.getBoundingClientRect().height > 0)?.textContent ?? "").trim(), scope);

    await clickHead("over");
    const s2 = await readRows(page, scope);
    const g2 = byGroup(s2);
    const arrow2 = await page.evaluate((s: string) => ([...document.querySelectorAll(s + ".tlc .lhd .h-over")]
      .find((e) => e.getBoundingClientRect().height > 0)?.textContent ?? "").trim(), scope);
    add("P2.8b · the same head again flips it — and the arrow says so",
      Object.values(g2).every((rs) => monotone(rs.map(overKey), 1)) && arrow1.endsWith("▼") && arrow2.endsWith("▲"),
      "arrows " + arrow1 + " → " + arrow2);

    await clickHead("due");
    const s3 = await readRows(page, scope);
    const dueKey = (r: Row) => dueOfRow(r) ?? "9999-99-99";
    add("P2.8c · Due: within every group, the dates run soonest first, undated last",
      Object.values(byGroup(s3)).every((rs) => rs.every((r, i) => i === 0 || dueKey(r) >= dueKey(rs[i - 1]))),
      Object.entries(byGroup(s3)).map(([g, rs]) => g + ": " + rs.map(dueKey).join(" ")).join(" | "));

    /* the stored view moved with each click — the SAME stored view the Sort menu edits */
    const stored = await readListView();
    add("P2.8d · a head click edits the stored view, as the Sort menu does",
      !!stored && (stored as { sort?: string }).sort === "due",
      "stored sort " + JSON.stringify((stored as { sort?: string } | null)?.sort));
  } finally {
    await restoreListView(savedView);
    await cleanDueDates();
  }
  /* ⚠️ THE REPORT IS WRITTEN BEFORE ANY CHECK THAT CAN THROW — the first run's restore check threw
     after every claim had been measured, and the claims were lost with it. */
  const lines = out.map((r) => (r.ok ? "PASS " : "FAIL ") + r.id + "\n        " + r.note);
  const red = out.filter((r) => !r.ok);
  writeFileSync(OUT, "list round · Phase 2 · the list view — 1440×900 · today " + TODAY + "\n\n"
    + lines.join("\n") + "\n\n" + (out.length - red.length) + "/" + out.length + "\n");

  /* ⚠️ COMPARED IN A CANONICAL KEY ORDER. Firestore hands a map back in its own key order, so the
     first form of this — two raw `JSON.stringify`s — reported a byte-for-byte restore as a failure. */
  const canon = (v: unknown): unknown => Array.isArray(v) ? v.map(canon)
    : v && typeof v === "object" ? Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, canon((v as Record<string, unknown>)[k])]))
    : v;
  const back = await readListView();
  expect(JSON.stringify(canon(back)), "the stored list view was not put back exactly").toBe(JSON.stringify(canon(savedView)));
  assertCount(out.length, FLOOR, "listRound");
  console.log("\nLIST ROUND — " + (out.length - red.length) + "/" + out.length + "\n" + lines.join("\n") + "\n");
  expect(red.map((r) => r.id + " — " + r.note), "the list does not make the claims its contract does").toEqual([]);
});
