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
      /* THE RAIL BADGE — the third surface that names a number of tasks. REPORTED, not asserted:
         it is shell chrome and its derivation (boardFigures(cols).cards) is not this page's to
         change. Reported on every run so the disagreement stays visible rather than being
         rediscovered. Its rib reads like "To-do list29", so the label is stripped off the front. */
      ribs: [...document.querySelectorAll(".ws-ni")].map((e) => (e.textContent || "").trim()),
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
  /* ⚠️ MATCHED HERE, IN NODE, NOT INSIDE THE EVALUATE TEMPLATE. The first version of this read
     did it in the browser and reported "(not found)" about a rib that was plainly on screen: a
     template literal eats the backslash, so \d became d and the pattern was /^To-do listd+$/.
     The house rule exists for exactly this and I broke it anyway — the evaluate returns raw
     strings now and every pattern lives on this side. */
  const badge = ((r.ribs as string[]) ?? [])
    .map((t) => /^To-do list\s*(\d+)$/.exec(t.replace(/\s+/g, " ").trim()))
    .find(Boolean)?.[1] ?? "(not found)";
  add("P1.2b · the tile's total and the card footer's total are the SAME number",
      Number.isFinite(footN) && footN === byLabel["All tasks"],
      "tile " + byLabel["All tasks"] + " · footer " + JSON.stringify(r.foot) + " -> " + footN);
  /* ⚠️ AND THE RAIL BADGE IS A THIRD SURFACE THAT DOES NOT AGREE — REPORTED, NOT ASSERTED.
     It counts boardFigures(cols).cards, which keeps the snoozed and dismissed the page's own
     scope drops, so it reads 29 beside the page's 27. That predates this round (the page moved
     to the view-excluded total in the drawer round; the badge did not follow) and it contradicts
     ShellSidebar's own comment, which promises the badge "cannot drift from the page counts".
     Not fixed here: it is shell chrome, and what the badge MEANS — every live card, or only the
     ones not deliberately deferred — is a product call rather than a defect to patch in passing.
     Printed every run so it stays visible instead of being rediscovered. */
  add("P1.2c · [REPORTED] the rail badge's figure, beside the page's",
      true, "rail badge " + JSON.stringify(badge) + " · page " + byLabel["All tasks"]
        + (String(badge) === String(byLabel["All tasks"]) ? "  — they now AGREE" : "  — they DISAGREE (known, Nick's call)"));

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

/**
 * Phase 2 — the five categories as a GROUPING, and Gone quiet's two feeders told apart.
 *
 * ⚠️ NO BACKTICKS AND NO REGEX INSIDE ANY page.evaluate TEMPLATE. A backtick terminates the
 * string and the file fails to COLLECT (which reads as "No tests found"); a backslash escape is
 * eaten before the browser sees it. Every pattern below is matched in Node.
 *
 * ⚠️ RUN `node tests/e2e/seedNudgedQuery.mjs` FIRST. Gone quiet has two feeders and this account
 * has only ever held one — without the seed, P2.4's tally reports 5 and 0 and the branch that
 * tells them apart is never entered, while every other assertion here passes.
 *
 * Read-only: it picks a grouping and a tile, and reads. It writes nothing.
 */
test("Phase 2 — category as a grouping, and Gone quiet's two feeders", async ({ page }) => {
  const out: R[] = [];
  const add = (id: string, ok: boolean, note = "") => out.push({ id, ok, note });
  const OUT = process.env.SA_QC_OUT2 ?? "run-artifacts/qc-chassis-p2.txt";
  rmSync(OUT, { force: true });

  await ensureSignedIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/todo");
  await page.waitForFunction("document.querySelectorAll('.qct-tile').length > 0", null, { timeout: 45_000 }).catch(() => {});
  await liftMotionSuppression(page);
  await visiblePage(page, ".tdb-wrap");

  /* the tiles' figures first — the other surface every claim below is measured against */
  const tiles = await page.evaluate(`(() => {
    const root = __saVisRoot();
    return [...root.querySelectorAll(".qct .qct-tile")].map((t) => ({
      label: ((t.querySelector(".qct-k") || {}).textContent || "").trim(),
      n: Number(((t.querySelector(".qct-n") || {}).textContent || "").trim()),
    }));
  })()`) as { label: string; n: number }[];
  const tileN: Record<string, number> = Object.fromEntries(tiles.map((t) => [t.label, t.n]));

  const openGroup = async () => {
    await page.evaluate(`(() => {
      const root = __saVisRoot();
      const b = [...root.querySelectorAll(".tdb-qtool .qcc-tb-btn")]
        .find((x) => (x.textContent || "").trim().indexOf("Group") === 0);
      if (b) b.click();
      return !!b;
    })()`);
    await page.waitForTimeout(500);
  };
  const pickOption = async (starts: string) => {
    await page.evaluate(`(() => {
      const b = [...document.querySelectorAll(".tdvp .v-opt")]
        .find((x) => ((x.querySelector(".v-body") || x).textContent || "").indexOf(${JSON.stringify(starts)}) === 0);
      if (b) b.click();
    })()`);
    await page.waitForTimeout(700);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  };

  await openGroup();
  const options = await page.evaluate(`(() => [...document.querySelectorAll(".tdvp .v-opt")]
    .map((b) => ((b.querySelector(".v-body") || b).textContent || "").trim()))()`) as string[];
  const catOpt = options.find((o) => o.indexOf("Category") === 0) ?? "";
  add("P2.0 · the Group panel offers Category, and its sub-line names the five it groups by",
      !!catOpt && catOpt.indexOf("Agent requests") > -1 && catOpt.indexOf("Gone quiet") > -1
        && catOpt.indexOf("Housekeeping") > -1,
      "Category option: " + JSON.stringify(catOpt) + " · " + options.length + " options offered");

  await pickOption("Category");

  const heads = await page.evaluate(`(() => {
    const root = __saVisRoot();
    return [...root.querySelectorAll(".tlc .grp")].map((g) => ({
      label: (g.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 40),
      n: Number(((g.querySelector(".g-n") || {}).textContent || "").trim()),
    }));
  })()`) as { label: string; n: number }[];

  const ORDER = ["Agent requests", "Nudges", "Gone quiet", "Housekeeping", "Your tasks"];
  const seen = heads.map((h) => ORDER.find((k) => h.label.indexOf(k) > -1) ?? "?");

  add("P2.1 · grouping by Category draws heads, and every head is one of the five",
      heads.length > 0 && !seen.includes("?"),
      JSON.stringify(heads.map((h, i) => seen[i] + " " + h.n)));

  /* ⚠️ THE TILES' ORDER, NOT THE ALPHABET. The reader has just picked from a row running
     Agent requests → Nudges → Gone quiet → Housekeeping → Your tasks; alphabetical heads would
     make the same five sets read as a different five. */
  const asOrdered = ORDER.filter((k) => seen.includes(k));
  add("P2.2 · the heads run in the tiles' order, not the alphabet",
      seen.length > 0 && seen.join("|") === asOrdered.join("|"), "heads " + JSON.stringify(seen));

  /* ⚠️ THE COMPOSED CLAIM: each head's own count IS its tile's, read off the RENDERED page on both
     sides. A head that counted differently from the tile the reader just clicked is the
     two-numbers-both-called-To-do fault the tile total and the card footer already had once this
     round — the same disease, one surface along. */
  const mism = seen
    .map((k, idx) => ({ k, head: heads[idx].n, tile: tileN[k] }))
    .filter((x) => x.k !== "?" && x.head !== x.tile);
  add("P2.3 · every head's count IS its tile's count",
      seen.length > 0 && mism.length === 0,
      mism.length ? JSON.stringify(mism) : seen.map((k, i) => k + " " + heads[i].n).join(" · "));

  await openGroup();
  await pickOption("Urgency");

  /* ── Gone quiet's two feeders ── */
  await page.evaluate(`(() => {
    const root = __saVisRoot();
    const t = [...root.querySelectorAll(".qct .qct-tile")]
      .find((x) => ((x.querySelector(".qct-k") || {}).textContent || "").trim() === "Gone quiet");
    if (t) t.click();
  })()`);
  await page.waitForTimeout(900);
  const quietRows = await page.evaluate(`(() => {
    const root = __saVisRoot();
    return [...root.querySelectorAll(".tlc .row")].map((r) => (r.textContent || "").replace(/\\s+/g, " ").trim());
  })()`) as string[];

  /* ⚠️ THE TALLY IS THE POINT, NOT THE COUNT. Gone quiet has two feeders — a stale window, and a
     check-in on a query ALREADY nudged — and a fixture holding only the first passes every other
     assertion here while never entering the branch that separates them. Matched in NODE, because
     a pattern written inside the evaluate template loses its escapes before the browser sees it. */
  /* ⚠️ EACH ROW MUST MATCH ONE OF THE TWO KNOWN SHAPES, and an unmatched row is LOUD. A tally that
     counts one pattern and calls the remainder "the other" cannot tell a third shape — or a copy
     change — from the branch it claims to be measuring: everything unrecognised silently swells
     the majority and the tally goes on reporting two feeders. Partitioning explicitly means a row
     the probe does not understand fails instead of being absorbed. */
  /* ⚠️ THE PATTERNS ARE THE ROW'S DEEDS, TAKEN FROM A RENDERED ROW — and getting here cost two
     reds, both from reading source instead. The raise site in `db.tsx` titles the task
     "Nudge due: {name}"; `derivedCopy` re-titles it "Nudge {name}"; and the LIST ROW shows neither,
     because it renders the BUCKET and the DEED ("Chase · Worth a nudge" against "Close · Consider
     closing"). Three layers, three different strings, and only the third is on the page.

     ⚠️ AND `\b` IS USELESS ON A ROW'S textContent. Concatenation drops the whitespace between
     elements, so the deed runs straight into the agent's name — "Worth a nudgeRosalind" — and
     there is no word boundary after "nudge" at all. The second red was entirely that.

     The deeds are also the better discriminator on their own terms: they are what the READER sees,
     and they say the two feeders apart in the only way that matters — chase again, or close. */
  const AFTER_NUDGE = /worth a nudge/i;   // the deed on a query already chased
  const STALE = /consider closing/i;      // the deed on a window that simply lapsed
  const afterNudge = quietRows.filter((t) => AFTER_NUDGE.test(t) && !STALE.test(t)).length;
  const staleWindow = quietRows.filter((t) => STALE.test(t) && !AFTER_NUDGE.test(t)).length;
  /* a row matching BOTH, or neither, is a third shape — loud either way rather than absorbed */
  const unmatched = quietRows.filter((t) => AFTER_NUDGE.test(t) === STALE.test(t));
  add("P2.4 · BOTH of Gone quiet's feeders are present — the tally, not the count",
      quietRows.length > 0 && afterNudge > 0 && staleWindow > 0
        && unmatched.length === 0 && afterNudge + staleWindow === quietRows.length,
      "gone-quiet rows " + quietRows.length + " · after-a-nudge " + afterNudge
        + " · stale-window " + staleWindow
        + (afterNudge === 0 ? "   — RUN node tests/e2e/seedNudgedQuery.mjs" : "")
        + (unmatched.length ? "   — UNRECOGNISED: " + JSON.stringify(unmatched.map((t) => t.slice(0, 60))) : ""));

  /* ⚠️ AND THE REASON IS RECORDED RATHER THAN RE-INFERRED — the source half of Phase 2, and the
     one claim here that belongs in source at all: a rendered page cannot show WHERE a fact came
     from. No surface may reach for `lastNudgeSentDate` to decide a category, because the
     derivation that raises the task already answered and put it on the card. */
  const src = join(process.cwd(), "src");
  const pageSrc = readFileSync(join(src, "components/todo/ToDoPage.tsx"), "utf8");
  const catSrc = readFileSync(join(src, "lib/todoCategory.ts"), "utf8");
  const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const pageDecls = strip(pageSrc);
  const catDecls = strip(catSrc);
  add("P2.5 · the reason travels on the card — no surface re-derives it from the query",
      !pageDecls.includes("lastNudgeSentDate") && !pageDecls.includes("nudgedBefore")
        && !catDecls.includes("lastNudgeSentDate") && catDecls.includes("card.reason"),
      "ToDoPage re-derives: " + (pageDecls.includes("lastNudgeSentDate") || pageDecls.includes("nudgedBefore"))
        + " · todoCategory reads card.reason: " + catDecls.includes("card.reason"));

  const lines = out.map((x) => (x.ok ? "green  " : "RED    ") + "· " + x.id + (x.note ? "\n         " + x.note : ""));
  const red = out.filter((x) => !x.ok);
  writeFileSync(OUT, "── qc chassis · Phase 2 · " + out.length + " assertions · " + red.length
    + " RED · " + (out.length - red.length) + " green\n" + lines.join("\n") + "\n");
  console.log(lines.join("\n"));
  expect(out.length, "assertion floor").toBeGreaterThanOrEqual(6);
  expect(red.length, red.map((x) => x.id).join(" | ")).toBe(0);
});
