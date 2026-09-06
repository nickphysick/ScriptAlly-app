/**
 * ⚠️ THE TO-DO PAGE ON THE QUERY CENTRE'S CHASSIS — QC-chassis round.
 *
 * Phase 1 — header, tiles and toolbar. The claims a stylesheet cannot make: that the tiles are
 * the SAME COMPONENT the Query Centre mounts rather than a copy wearing its classes, that the
 * five category counts partition All, and that one tile narrows both the list and the pane's
 * queue at once.
 *
 * ⚠️ NO BACKTICKS INSIDE ANY page.evaluate TEMPLATE, comments included — one terminates the
 * string and the file fails to COLLECT, which reads as "No tests found".
 *
 * Read-only: it clicks tiles and reads. It presses no primary and writes nothing.
 */
import { test, expect } from "@playwright/test";
import { ensureSignedIn, liftMotionSuppression, visiblePage } from "./measure";
import { writeFileSync, rmSync } from "node:fs";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type R = { id: string; ok: boolean; note: string };

test("Phase 1 — the header, the seven tiles and the toolbar", async ({ page }) => {
  const out: R[] = [];
  const add = (id: string, ok: boolean, note = "") => out.push({ id, ok, note });
  const OUT = process.env.SA_QC_OUT ?? "run-artifacts/qc-chassis-p1.txt";
  rmSync(OUT, { force: true });

  await ensureSignedIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/todo");
  await page.waitForFunction("document.querySelectorAll('.qct-tile').length > 0", null, { timeout: 45_000 }).catch(() => {});
  await liftMotionSuppression(page);

  /* ⚠️ SCOPE TO THE VISIBLE PAGE FIRST, THROUGH THE SHARED HELPER. Every workspace page stays
     MOUNTED and the shell toggles `display`, so `document.querySelector` reaches the Query Centre's
     copy of everything this measures — its five tiles, its masthead, its toolbar. The first run of
     this file read TWELVE tiles (5 + 7) and reported the Query Centre's own title as the To-do
     page's, which is a true reading of the wrong page.
     `visiblePage` finds the one visible root by MEASURING it and THROWS on none or two, so this
     can never quietly degrade to reading the whole document. */
  await visiblePage(page, ".tdb-wrap");
  add("P1.-1 · the visible To-do page was found, so the readings below are about it",
      true, "scoped via visiblePage('.tdb-wrap')");

  const r = await page.evaluate(`(() => {
    const root = __saVisRoot();
    const tiles = [...root.querySelectorAll(".qct .qct-tile")];
    const read = (t) => ({
      label: ((t.querySelector(".qct-k") || {}).textContent || "").trim(),
      n: Number(((t.querySelector(".qct-n") || {}).textContent || "").trim()),
      on: t.classList.contains("qct-tile--on"),
      disc: !!t.querySelector(".qct-ic"),
    });
    const bar = root.querySelector(".tdb-qtool");
    return {
      tiles: tiles.map(read),
      row: !!root.querySelector(".qct"),
      /* the header: one title, the subtitle, the primary, the illustration */
      title: ((root.querySelector(".wsh-title") || {}).textContent || "").trim(),
      sub: ((root.querySelector(".wsh-sub") || {}).textContent || "").trim(),
      cta: ((root.querySelector(".wsh-cta") || {}).textContent || "").trim(),
      illo: !!root.querySelector(".tdb-illo"),
      /* the toolbar: one search, three buttons, the switch */
      searches: bar ? bar.querySelectorAll(".qcc-tb-search").length : -1,
      btns: bar ? [...bar.querySelectorAll(".qcc-tb-btn")].map((b) => (b.textContent || "").trim()) : [],
      segs: bar ? [...bar.querySelectorAll(".qvs button")].map((b) => (b.textContent || "").trim()) : [],
      /* and no second copy of any of them on THIS page */
      pageSearches: root.querySelectorAll(".qcc-tb-search").length,
      cardBar: root.querySelectorAll(".tlc .l-search").length,
      rows: root.querySelectorAll(".tlc .row").length,
      /* the card's own footer, which states a total of its own */
      foot: ((root.querySelector(".tlc .l-foot .c") || {}).textContent || "").trim(),
      /* and the rail badge, the third surface that names a number of tasks */
      badge: ((document.querySelector(".ws-navcount, .ws-nav-count") || {}).textContent || "").trim(),
    };
  })()`) as any;

  add("P1.0 · the tiles rendered, and so did the list", r.row && r.tiles.length > 0 && r.rows > 0,
      "tiles " + r.tiles.length + " · rows " + r.rows);

  add("P1.1 · seven tiles, in the contract's order",
      r.tiles.length === 7
        && r.tiles.map((t: any) => t.label).join("|")
           === "All tasks|Urgent|Agent requests|Nudges|Gone quiet|Housekeeping|Your tasks",
      JSON.stringify(r.tiles.map((t: any) => t.label)));

  /* ⚠️ THE COUNTING LAW AT THE COMPOSED SURFACE: the five categories PARTITION the board, so
     their sum IS All — read off the rendered page on both sides, never from the store. Urgent is
     deliberately excluded: it is a lens over the same set, not a sixth part of it. */
  const byLabel = Object.fromEntries(r.tiles.map((t: any) => [t.label, t.n]));
  const five = ["Agent requests", "Nudges", "Gone quiet", "Housekeeping", "Your tasks"]
    .reduce((a, k) => a + (byLabel[k] ?? 0), 0);
  add("P1.2 · the five categories partition All — their sum IS the All count",
      five === byLabel["All tasks"] && byLabel["All tasks"] > 0,
      "five sum " + five + " · All " + byLabel["All tasks"] + " · " + JSON.stringify(byLabel));

  /* ⚠️ AND THE TILE'S TOTAL MUST AGREE WITH THE CARD'S OWN FOOTER — the two-numbers-both-called-
     To-do fault, which this repo has closed once already and which Phase 1 reintroduced on its own
     surface. Found by LOOKING at the deployed page: the tile read 29 and the footer read 27, both
     correct on their own terms, with nothing on the page saying which one the word means.
     The partition law above cannot see it: the five parts summed to the tile's own total, so it
     was internally consistent and wrong. This reads the OTHER surface. */
  const footN = Number((/(\d+)\s+tasks/.exec(r.foot ?? "") ?? [])[1] ?? NaN);
  add("P1.2b · the tile's total and the card footer's total are the SAME number",
      Number.isFinite(footN) && footN === byLabel["All tasks"],
      "tile " + byLabel["All tasks"] + " · footer " + JSON.stringify(r.foot) + " -> " + footN
        + " · rail badge " + JSON.stringify(r.badge));

  add("P1.3 · Urgent is a LENS, not a sixth part — it is not in that sum",
      typeof byLabel["Urgent"] === "number" && byLabel["Urgent"] <= byLabel["Agent requests"],
      "urgent " + byLabel["Urgent"] + " · agent requests " + byLabel["Agent requests"]);

  add("P1.4 · the header carries the title, the subtitle and one primary",
      r.title === "To-do list"
        && r.sub === "Everything that's yours to do, and everything worth a look."
        && r.cta.includes("Add a task"),
      "title " + JSON.stringify(r.title) + " · sub " + JSON.stringify(r.sub) + " · cta " + JSON.stringify(r.cta));

  add("P1.5 · and the illustration slot", r.illo, "");

  add("P1.6 · one search box on the page, and it is the toolbar's",
      r.searches === 1 && r.pageSearches === 1 && r.cardBar === 0,
      "toolbar " + r.searches + " · page " + r.pageSearches + " · card " + r.cardBar);

  add("P1.7 · three toolbar controls, in the contract's order",
      r.btns.length === 3 && /^Filter/.test(r.btns[0]) && /^Group/.test(r.btns[1]) && /^Sort/.test(r.btns[2]),
      JSON.stringify(r.btns));

  add("P1.8 · the view switch offers Grid and Board, and nothing else",
      r.segs.length === 2 && r.segs[0] === "Grid" && r.segs[1] === "Board",
      JSON.stringify(r.segs));

  /* ⚠️ THE TILES ARE THE QUERY CENTRE'S COMPONENT, ASSERTED AT THE SOURCE AS WELL AS THE MARKUP.
     Matching element structure alone is satisfiable by a copy carrying the same class names,
     which is the fork this round forbids; that both pages IMPORT the same module is the claim
     that cannot be. */
  const here = join(process.cwd(), "src/components");
  const qTiles = readFileSync(join(here, "queries/QueryStatTiles.tsx"), "utf8");
  const todo = readFileSync(join(here, "todo/ToDoPage.tsx"), "utf8");
  const qPage = readFileSync(join(here, "Queries.tsx"), "utf8");
  add("P1.9 · the tiles and the toolbar are SHARED — both pages import the one module",
      qTiles.includes('from "../shared/StatTiles"') && todo.includes('from "../shared/StatTiles"')
        && qPage.includes('from "./shared/ToolbarButton"') && todo.includes('from "../shared/ToolbarButton"'),
      "QueryStatTiles→StatTiles · ToDoPage→StatTiles · Queries→ToolbarButton · ToDoPage→ToolbarButton");

  /* ── selecting a tile narrows the list ── */
  const before = r.rows;
  const picked = await page.evaluate(`(() => {
    const root = __saVisRoot();
    const t = [...root.querySelectorAll(".qct .qct-tile")]
      .find((x) => ((x.querySelector(".qct-k") || {}).textContent || "").trim() === "Housekeeping");
    if (!t) return null;
    const n = Number(((t.querySelector(".qct-n") || {}).textContent || "").trim());
    t.click();
    return n;
  })()`) as number | null;
  await page.waitForTimeout(400);
  const after = await page.evaluate(`(() => {
    const root = __saVisRoot();
    return {
      rows: root.querySelectorAll(".tlc .row").length,
      on: [...root.querySelectorAll(".qct .qct-tile--on")]
        .map((t) => ((t.querySelector(".qct-k") || {}).textContent || "").trim()),
    };
  })()`) as { rows: number; on: string[] };

  add("P1.10 · selecting a tile rings it, and only it",
      after.on.length === 1 && after.on[0] === "Housekeeping", JSON.stringify(after.on));
  /* ⚠️ THE LIST SHOWS WHAT THE TILE COUNTED — the same number, not merely fewer rows. A tile that
     narrowed to a different set than it counted is the disagreement this asserts against. */
  add("P1.11 · and the list narrows to exactly the number the tile stated",
      picked !== null && after.rows === picked && after.rows < before,
      "tile said " + picked + " · rows " + before + " -> " + after.rows);

  const lines = out.map((x) => (x.ok ? "green  " : "RED    ") + "· " + x.id + (x.note ? "\n         " + x.note : ""));
  const red = out.filter((x) => !x.ok);
  writeFileSync(OUT, "── qc chassis · Phase 1 · " + out.length + " assertions · " + red.length
    + " RED · " + (out.length - red.length) + " green\n" + lines.join("\n") + "\n");
  console.log(lines.join("\n"));
  expect(out.length, "assertion floor").toBeGreaterThanOrEqual(12);
  expect(red.length, red.map((x) => x.id).join(" | ")).toBe(0);
});
