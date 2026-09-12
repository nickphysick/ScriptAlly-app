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

/* ══ PHASE 3 · THE LANDING STATE ═══════════════════════════════════════════════════════════════
 *
 * ⚠️ THE ACCOUNT CARRIES A STORED VIEW FROM BEFORE THIS ROUND, so the landing state cannot be seen
 * by simply opening the page: `setView` writes the WHOLE view whenever any one field changes, so
 * every account that has ever touched a filter holds the old default as a "choice". This clears the
 * key, measures the first visit, proves a later choice persists, and writes the stored object back
 * exactly — the same restore discipline the Phase 2 test uses, for the same reason.
 */
const OUT3 = "run-artifacts/list-landing.txt";
const FLOOR3 = 8;
const BURG3 = "rgb(124, 58, 42)";

interface Head { label: string; colour: string; rows: { key: string; due: string | null }[] }

async function readHeads(page: Page, scope: string): Promise<Head[]> {
  const raw = await page.evaluate((s: string) => {
    const vis = (e: Element) => e.getBoundingClientRect().height > 0;
    const txt = (e: Element | null | undefined) => (e?.textContent ?? "").trim();
    const out: { label: string; colour: string; rows: { key: string; mon: string; day: string; year: string; none: boolean }[] }[] = [];
    let cur: (typeof out)[number] | null = null;
    const body = [...document.querySelectorAll(s + ".tlc .l-body")].find(vis);
    if (!body) return out;
    for (const el of [...body.children]) {
      if (el.classList.contains("grp")) {
        const lbl = el.querySelector(".g-lbl");
        cur = { label: txt(lbl), colour: lbl ? getComputedStyle(lbl).color : "", rows: [] };
        out.push(cur);
        continue;
      }
      if (el.classList.contains("row") && cur && vis(el)) {
        const chip = el.querySelector(".lchip");
        cur.rows.push({
          key: el.getAttribute("data-rowkey") ?? "",
          mon: txt(el.querySelector(".lchip .m")), day: txt(el.querySelector(".lchip .d")),
          year: txt(el.querySelector(".lchip .y")), none: !!chip?.classList.contains("none"),
        });
      }
    }
    return out;
  }, scope);
  return raw.map((h) => ({
    label: h.label, colour: h.colour,
    rows: h.rows.map((r) => ({
      key: r.key,
      due: r.none ? null : `${r.year || TODAY.slice(0, 4)}-${pad(MON.indexOf(r.mon) + 1)}-${pad(Number(r.day))}`,
    })),
  }));
}

test("the landing state — Phase 3", async ({ page }) => {
  rmSync(OUT3, { force: true });
  const out: { id: string; ok: boolean; note: string }[] = [];
  const add = (id: string, ok: boolean, note: string) => out.push({ id, ok, note });

  const savedView = await readListView();
  const seeded = await seedDueDates();
  try {
    await ensureSignedIn(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    /* the first visit: no stored view at all */
    await restoreListView(null);
    const scope = await gotoTodo(page, "list");
    await page.waitForTimeout(1200);
    const heads = await readHeads(page, scope);

    expect(heads.length, "the list drew no group heads").toBeGreaterThan(1);
    expect(seeded.length).toBe(3);

    /* ── the four heads, in the contract's order ── */
    const WHEN = ["Overdue", "Due this week", "Coming up", "No date"];
    const labels = heads.map((h) => h.label);
    add("P3.1 · a fresh visit lands grouped by When, in the contract's order",
      labels.every((l) => WHEN.includes(l)) && JSON.stringify(labels) === JSON.stringify(WHEN.filter((w) => labels.includes(w))),
      JSON.stringify(labels));

    /* ── the Overdue head is the one coloured heading ── */
    const over = heads.find((h) => h.label === "Overdue");
    add("P3.2 · the Overdue head is burgundy, and no other head is",
      !!over && over.colour === BURG3 && heads.filter((h) => h.label !== "Overdue").every((h) => h.colour !== BURG3),
      JSON.stringify(heads.map((h) => [h.label, h.colour])));

    /* ── membership: each head holds only the days it names ── */
    const bad: string[] = [];
    for (const h of heads) {
      for (const r of h.rows) {
        const n = r.due ? daysOver(r.due) : null;
        const want = n === null ? "No date" : n > 0 ? "Overdue" : n >= -7 ? "Due this week" : "Coming up";
        if (want !== h.label) bad.push(`${r.key} (${r.due ?? "no date"}) is in ${h.label}, not ${want}`);
      }
    }
    add("P3.3 · every row sits under the head its own date names — Overdue only past, Coming up only beyond the week",
      bad.length === 0,
      heads.map((h) => h.label + " " + h.rows.length).join(" · ") + (bad.length ? " · " + JSON.stringify(bad) : ""));

    /* ── and the order inside each head is longest first ── */
    const dayOf = (r: { due: string | null }) => (r.due ? daysOver(r.due) : -1e9);
    const unsorted = heads.filter((h) => !h.rows.every((r, i) => i === 0 || dayOf(r) <= dayOf(h.rows[i - 1])));
    add("P3.4 · sorted by Overdue by, longest first, inside every head",
      unsorted.length === 0,
      heads.map((h) => h.label + ": " + h.rows.map(dayOf).map((d) => (d === -1e9 ? "·" : d)).join(" ")).join(" | "));

    /* ── the three seeded days land where they belong ── */
    const place = (id: string) => heads.find((h) => h.rows.some((r) => r.key === id))?.label ?? "(absent)";
    add("P3.5 · today is Due this week, four days ahead is Due this week, twelve days ahead is Coming up",
      place("seed-due-today") === "Due this week" && place("seed-due-ahead4") === "Due this week"
      && place("seed-due-ahead12") === "Coming up",
      ["seed-due-today", "seed-due-ahead4", "seed-due-ahead12"].map((k) => k + " → " + place(k)).join(" · "));

    /* ── a writer's own choice wins, and survives a reload ── */
    const pickGrouping = async (word: string) => {
      await page.evaluate((s: string) => {
        const b = [...document.querySelectorAll(s + ".tdb-qtool button")]
          .find((e) => (e.textContent || "").includes("Group")) as HTMLElement | undefined;
        b?.click();
      }, scope);
      await page.waitForTimeout(500);
      const picked = await page.evaluate((w: string) => {
        const o = [...document.querySelectorAll(".tdvp .v-opt")]
          .find((e) => (e.querySelector(".v-body")?.textContent || "").trim().startsWith(w)) as HTMLElement | undefined;
        if (!o) return false;
        o.click();
        return true;
      }, word);
      await page.waitForTimeout(1200);
      return picked;
    };
    const took = await pickGrouping("Category");
    expect(took, "the Group menu offers no Category option").toBe(true);
    const afterPick = (await readHeads(page, scope)).map((h) => h.label);
    await page.reload();
    await page.waitForTimeout(3500);
    const scope2 = await gotoTodo(page, "list");
    await page.waitForTimeout(1200);
    const afterReload = (await readHeads(page, scope2)).map((h) => h.label);
    add("P3.6 · a later choice replaces the landing state",
      afterPick.length > 0 && !afterPick.includes("Overdue") && afterPick.some((l) => l.includes("Agent requests")),
      JSON.stringify(afterPick));
    add("P3.7 · and it persists across a reload — the stored view wins over the default",
      JSON.stringify(afterReload) === JSON.stringify(afterPick),
      JSON.stringify(afterReload));
    const stored = await readListView();
    add("P3.8 · what persisted is the view the menu edited",
      !!stored && (stored as { grouping?: string }).grouping === "category",
      JSON.stringify((stored as { grouping?: string } | null)?.grouping));
  } finally {
    await restoreListView(savedView);
    await cleanDueDates();
  }

  const lines = out.map((r) => (r.ok ? "PASS " : "FAIL ") + r.id + "\n        " + r.note);
  const red = out.filter((r) => !r.ok);
  writeFileSync(OUT3, "list round · Phase 3 · the landing state — 1440×900 · today " + TODAY + "\n\n"
    + lines.join("\n") + "\n\n" + (out.length - red.length) + "/" + out.length + "\n");
  const canon3 = (v: unknown): unknown => Array.isArray(v) ? v.map(canon3)
    : v && typeof v === "object" ? Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, canon3((v as Record<string, unknown>)[k])]))
    : v;
  const back = await readListView();
  expect(JSON.stringify(canon3(back)), "the stored list view was not put back exactly").toBe(JSON.stringify(canon3(savedView)));
  assertCount(out.length, FLOOR3, "listLanding");
  console.log("\nLIST LANDING — " + (out.length - red.length) + "/" + out.length + "\n" + lines.join("\n") + "\n");
  expect(red.map((r) => r.id + " — " + r.note), "the landing state is not what the contract draws").toEqual([]);
});

/* ══ PHASE 4 · THE CARD SAYS THE AGENT ONCE ════════════════════════════════════════════════════
 *
 * ⚠️ THE CLAIM IS ABOUT THE WHOLE CARD. "The agent is named once" cannot be asked of any element —
 * it is a fact about the card's text — so it is counted over each card's own `textContent`, and the
 * names it counts are the ones the CARDS THEMSELVES print in their feet, never a list typed here.
 */
const OUT4 = "run-artifacts/list-card.txt";
const FLOOR4 = 6;
const QUIET_VERB = "rgb(179, 164, 148)";

test("the grid's card — Phase 4", async ({ page }) => {
  rmSync(OUT4, { force: true });
  const out: { id: string; ok: boolean; note: string }[] = [];
  const add = (id: string, ok: boolean, note: string) => out.push({ id, ok, note });

  await ensureSignedIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  const scope = await gotoTodo(page, "grid");
  await page.waitForTimeout(1200);

  const cards = await page.evaluate((s: string) => {
    const vis = (e: Element) => e.getBoundingClientRect().height > 0;
    const txt = (e: Element | null | undefined) => (e?.textContent ?? "").trim();
    return [...document.querySelectorAll(s + ".tkt-grid .tkt")].filter(vis).map((c) => {
      const foot = c.querySelector(".tfoot");
      const name = foot?.querySelector(".n");
      const small = name?.querySelector("small");
      const go = c.querySelector(".tfoot .go");
      const person = txt(name).replace(txt(small), "");
      /* the agency is BENEATH the name, which is a claim about the DOM and about the box:
         a `<small>` inside `.n`, drawn on a line of its own below it */
      const nr = name?.getBoundingClientRect();
      const sr = small?.getBoundingClientRect();
      return {
        text: txt(c),
        title: txt(c.querySelector(".ttl")),
        person,
        agency: txt(small),
        agencyInName: !!small,
        agencyBelow: !!(nr && sr && sr.top > nr.top + 1),
        tag: txt(c.querySelector(".top .tag")),
        statusInTop: !!c.querySelector(".top .qs"),
        statusInFoot: !!c.querySelector(".tfoot .qs"),
        statusWord: txt(c.querySelector(".top .qs")),
        statusDots: c.querySelectorAll(".top .qs svg").length,
        verb: txt(go),
        verbColour: go ? getComputedStyle(go).color : "",
        ownDisc: !!c.querySelector(".tfoot .av.yours"),
      };
    });
  }, scope);

  expect(cards.length, "the grid drew no cards").toBeGreaterThan(8);
  const people = cards.map((c) => c.person).filter((p) => p && p !== "Your own note");
  expect(people.length, "no card names a person — the fixture cannot answer this").toBeGreaterThan(3);

  /* ── the agent is named ONCE, and the title never names them ── */
  const twice = cards.filter((c) => c.person && c.text.split(c.person).length - 1 > 1);
  add("P4.1 · no card names its agent twice",
    twice.length === 0,
    cards.length + " cards · " + JSON.stringify(twice.map((c) => [c.person, c.title])));
  /* ⚠️ FULL NAMES, NEVER SURNAMES. A writer's own note is the writer's own words — "Chase the
     Blaine partial" is a sentence they typed, and a surname sweep would redden it. The fault this
     guards is the app putting an agent in a headline it generated, and the app has the whole name.
     The cost is stated rather than hidden: a generated title carrying a surname alone would pass. */
  const named = cards.filter((c) => people.some((p) => p && c.title.includes(p)));
  add("P4.2 · no card's title contains any agent's name — the title is the act",
    named.length === 0,
    JSON.stringify([...new Set(cards.map((c) => c.title))].slice(0, 8)));

  /* ── the status is beside the tag, and the person is the foot ── */
  const badStatus = cards.filter((c) => c.statusWord && (!c.statusInTop || c.statusInFoot || c.statusDots === 0));
  add("P4.3 · the status is a dot and its word on the TOP line, never in the foot",
    cards.some((c) => c.statusWord) && badStatus.length === 0,
    cards.filter((c) => c.statusWord).length + " cards state a status · wrong: " + JSON.stringify(badStatus.map((c) => c.title)));
  /* ⚠️ AND IT ASSERTS THE AGENCY, WHICH ITS OWN SENTENCE NAMES. Asserting only that the foot
     names a person restates the population floor five lines above — a card with no name at all
     throws there, so this would have been a claim nothing could redden on its own. The agency is
     the half the floor cannot see: a `<small>` inside `.n`, on a line below the name. */
  /* the writer's own item is excluded: its foot says "Your own note" over the contract's own
     line, which is a different sentence from an agent and their agency. */
  const footed = cards.filter((c) => c.person && c.person !== "Your own note");
  const withAgency = footed.filter((c) => c.agency);
  const misplaced = withAgency.filter((c) => !c.agencyInName || !c.agencyBelow);
  add("P4.4 · the foot names the person, with their agency beneath",
    footed.length > 3 && withAgency.length > 2 && misplaced.length === 0,
    footed.length + " name a person · " + withAgency.length + " state an agency · misplaced "
    + JSON.stringify(misplaced.map((c) => c.person)) + " · "
    + JSON.stringify(footed.slice(0, 4).map((c) => [c.person, c.agency])));

  /* ── the verb ── */
  const verbs = cards.map((c) => c.verb).filter(Boolean);
  const REF4 = readFileSync("design-refs/todo-list-and-card.html", "utf8");
  const strangers = [...new Set(verbs)].filter((v) => !REF4.includes(">" + v + "</button>"));
  add("P4.5 · every card's verb is one the contract prints",
    verbs.length === cards.length && strangers.length === 0,
    verbs.length + " of " + cards.length + " · " + JSON.stringify([...new Set(verbs)]));
  const loud = cards.filter((c) => c.verb && c.verbColour !== QUIET_VERB);
  add("P4.6 · and it is quiet at rest — the pink is the hover's",
    loud.length === 0,
    JSON.stringify([...new Set(cards.map((c) => c.verbColour))]));

  const lines = out.map((r) => (r.ok ? "PASS " : "FAIL ") + r.id + "\n        " + r.note);
  const red = out.filter((r) => !r.ok);
  writeFileSync(OUT4, "list round · Phase 4 · the grid's card — 1440×900\n\n"
    + lines.join("\n") + "\n\n" + (out.length - red.length) + "/" + out.length + "\n");
  assertCount(out.length, FLOOR4, "listCard");
  console.log("\nLIST CARD — " + (out.length - red.length) + "/" + out.length + "\n" + lines.join("\n") + "\n");
  expect(red.map((r) => r.id + " — " + r.note), "the card does not say what its contract says").toEqual([]);
});
