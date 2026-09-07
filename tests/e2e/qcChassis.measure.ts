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
import { ensureSignedIn, liftMotionSuppression, visiblePage, openFocusedRow } from "./measure";
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
      rows: root.querySelectorAll(".tlc .row, .tkt").length,
      /* the card's own footer, which states a total of its own */
      foot: ((root.querySelector(".tlc .l-foot .c") || {}).textContent || "").trim(),
      /* THE RAIL BADGE — the third surface that names a number of tasks. REPORTED, not asserted:
         it is shell chrome and its derivation (boardFigures(cols).cards) is not this page's to
         change. Reported on every run so the disagreement stays visible rather than being
         rediscovered. Its rib reads like "To-do list29", so the label is stripped off the front. */
      ribs: [...document.querySelectorAll(".ws-ni")].map((e) => (e.textContent || "").trim()),
    };
  })()`) as any;

  /* ⚠️ "ITEMS", NOT "ROWS" (retargeted in Phase 3). The card's BODY is the list's rows in List
     view and the ticket grid in Grid view, and Grid is the default — so a probe pinned to
     `.tlc .row` measured zero on a page full of work and reported the tiles as broken. The claim
     was never about which element the body draws; it is about how many things it shows, which is
     what the tile counted. Counting both is what makes it survive the view. */
  add("P1.0 · the tiles rendered, and so did the card's body", r.row && r.tiles.length > 0 && r.rows > 0,
      "tiles " + r.tiles.length + " · body items " + r.rows);

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
  /* ⚠️ THE TOTAL IS STATED ONCE (corrections 2.1), which is the stronger form of what this used to
     assert. It compared the tile's figure against the card FOOTER's — and it earned its keep, going
     red on 29-beside-27 the day the tiles counted a population the list could not show. 2.1 removed
     the footer strip: the count now has exactly one home, beside the tiles. So the claim becomes
     the structural one — two numbers cannot disagree when there is only one — and it is asserted as
     the ABSENCE of a second, so a footer restating it cannot quietly return. */
  add("P1.2b · the total is stated ONCE — the tiles say it and the content area does not restate it",
      byLabel["All tasks"] > 0 && !Number.isFinite(footN),
      "tile " + byLabel["All tasks"] + " · content-area footer " + JSON.stringify(r.foot)
        + (Number.isFinite(footN) ? "  — a SECOND total is back" : "  (no second total)"));
  /* ⚠️ AND THE RAIL BADGE IS A THIRD SURFACE THAT DOES NOT AGREE — REPORTED, NOT ASSERTED.
     It counts boardFigures(cols).cards, which keeps the snoozed and dismissed the page's own
     scope drops, so it reads 29 beside the page's 27. That predates this round (the page moved
     to the view-excluded total in the drawer round; the badge did not follow) and it contradicts
     ShellSidebar's own comment, which promises the badge "cannot drift from the page counts".
     Not fixed here: it is shell chrome, and what the badge MEANS — every live card, or only the
     ones not deliberately deferred — is a product call rather than a defect to patch in passing.
     Printed every run so it stays visible instead of being rediscovered. */
  /* ⚠️ NOW ASSERTED, NOT REPORTED (corrections). It printed both figures and said "they DISAGREE
     (known, Nick's call)" because what the badge MEANS was a product question and it is shell
     chrome besides. Nick ruled: it counts what the page shows, so a snoozed card — deliberately out
     of sight until a date, and unreachable from the list without changing a filter — is not in it.
     `boardFigures` drops `cols.snoozed`; the two surfaces state one number and this holds them to
     it. */
  add("P1.2c · the rail badge states the SAME number the page does",
      String(badge) === String(byLabel["All tasks"]),
      "rail badge " + JSON.stringify(badge) + " · page " + byLabel["All tasks"]);

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

  /* ⚠️ THE SET, NOT THE COUNT (corrections 2.1). This pinned THREE controls and went red the moment
     a fourth legitimately joined the row — the set-aside door, moving up from the list card, where
     `TaskList`'s own comment had promised Phase 3 would take it. A count cannot tell a new
     instrument from a duplicated one; the labels can, which is what the claim was always about. */
  const btnNames = (r.btns as string[]).map((b) => b.replace(/(Filter|Group|Sort|Set aside).*/, "$1"));
  add("P1.7 · the toolbar's instruments, one of each, in the contract's order",
      btnNames.join("|") === "Filter|Group|Sort|Set aside"
        && new Set(btnNames).size === btnNames.length,
      JSON.stringify(r.btns));

  /* ⚠️ THREE, NOT THE CONTRACT'S TWO — and the third is a stated departure rather than a drift
     (Phase 4). Mounting the board made Grid and Board the only reachable states, which stranded
     the LIST: its dense rows, their action strips, and the five keys the card's own footer teaches
     in every view. A footer teaching `j k ↵ s d` with no rows to reach is the same fault as the
     view switch that changed nothing, which this round fixed one phase earlier.
     The ref draws two because its mockup has no list to strand; the Query Centre's own switch
     offers four. Asserted as the exact three so a fourth cannot arrive unannounced. */
  add("P1.8 · the view switch offers Grid, List and Board, and nothing else",
      r.segs.length === 3 && r.segs[0] === "Grid" && r.segs[1] === "List" && r.segs[2] === "Board",
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
      rows: root.querySelectorAll(".tlc .row, .tkt").length,
      on: [...root.querySelectorAll(".qct .qct-tile--on")]
        .map((t) => ((t.querySelector(".qct-k") || {}).textContent || "").trim()),
    };
  })()`) as { rows: number; on: string[] };

  add("P1.10 · selecting a tile rings it, and only it",
      after.on.length === 1 && after.on[0] === "Housekeeping", JSON.stringify(after.on));
  /* ⚠️ THE LIST SHOWS WHAT THE TILE COUNTED — the same number, not merely fewer rows. A tile that
     narrowed to a different set than it counted is the disagreement this asserts against. */
  add("P1.11 · and the body narrows to exactly the number the tile stated",
      picked !== null && after.rows === picked && after.rows < before,
      "tile said " + picked + " · body items " + before + " -> " + after.rows);

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

  /* ⚠️ THIS PHASE MEASURES THE LIST, SO IT SELECTS THE LIST (added in Phase 7). Grouping draws
     HEADS, and heads are a list concept — the grid has none and the board's columns are the
     categories themselves. Phase 3 made Grid the DEFAULT view, and this probe, written when the
     list was the only body, quietly began reading `.tlc .grp` on a page showing tickets: four of
     its six assertions went red and stayed red across two commits with nothing saying so.

     That is the presumed-vacuous rule from the other end — the phase was green when it landed and
     a LATER phase invalidated it. It is why Phase 7 re-runs every phase rather than trusting the
     report each one wrote about itself. */
  await page.evaluate(`(() => {
    const b = [...__saVisRoot().querySelectorAll(".qvs button")].find((x) => (x.textContent || "").trim() === "List");
    if (b) b.click();
  })()`);
  await page.waitForTimeout(800);

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

/**
 * Phase 3 — the ticket grid.
 *
 * ⚠️ NO BACKTICKS AND NO REGEX INSIDE ANY page.evaluate TEMPLATE. Patterns are matched in Node.
 *
 * ⚠️ AND THE SWITCH IS DRIVEN, NOT INSPECTED. Phase 1 asserted the view switch OFFERED Grid and
 * Board while `todoView` was read nowhere — a control that looked like a choice and changed
 * nothing, passing a lock that counted options instead of checking that either did anything. P3.0
 * presses it and requires the content to CHANGE.
 */
test("Phase 3 — the ticket grid", async ({ page }) => {
  const out: R[] = [];
  const add = (id: string, ok: boolean, note = "") => out.push({ id, ok, note });
  const OUT = process.env.SA_QC_OUT3 ?? "run-artifacts/qc-chassis-p3.txt";
  rmSync(OUT, { force: true });

  await ensureSignedIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/todo");
  await page.waitForFunction("document.querySelectorAll('.qct-tile').length > 0", null, { timeout: 45_000 }).catch(() => {});
  await liftMotionSuppression(page);
  await visiblePage(page, ".tdb-wrap");
  await page.waitForTimeout(700);

  const read = () => page.evaluate(`(() => {
    const root = __saVisRoot();
    const t = [...root.querySelectorAll(".tkt")];
    const one = t[0];
    return {
      grid: !!root.querySelector(".tkt-grid"),
      list: !!root.querySelector(".tlc .row"),
      n: t.length,
      cards: t.map((x) => ({
        tag: ((x.querySelector(".tag") || {}).textContent || "").trim(),
        title: ((x.querySelector(".ttl") || {}).textContent || "").trim(),
        keys: [...x.querySelectorAll(".cell .k")].map((k) => (k.textContent || "").trim()),
        lates: x.querySelectorAll(".cell .v.late").length,
        dots: x.querySelectorAll(".tfoot svg").length,
        own: !!x.querySelector(".tfoot .n.own"),
        edge: getComputedStyle(x.querySelector(".edge")).backgroundColor,
        edgeW: Math.round(x.querySelector(".edge").getBoundingClientRect().width),
        urgent: x.classList.contains("urgent"),
      })),
      titleFont: one
        ? (() => { const cs = getComputedStyle(one.querySelector(".ttl"));
                   return cs.fontFamily.split(",")[0].replace(/["']/g, "") + "|" + cs.fontSize + "|" + cs.fontWeight; })()
        : "",
    };
  })()`) as Promise<any>;

  const g = await read();
  add("P3.0 · the Grid view renders tickets, and the list is not also on screen",
      g.grid && g.n > 0 && !g.list, "tickets " + g.n + " · list rows present: " + g.list);

  /* ⚠️ THE SWITCH IS PRESSED AND THE CONTENT MUST CHANGE — the claim Phase 1's own P1.8 could not
     make, because it counted the two options and never asked whether either did anything. */
  await page.evaluate(`(() => {
    const root = __saVisRoot();
    const b = [...root.querySelectorAll(".qvs button")].find((x) => (x.textContent || "").trim() === "Board");
    if (b) b.click();
  })()`);
  await page.waitForTimeout(800);
  const onBoard = await read();
  await page.evaluate(`(() => {
    const root = __saVisRoot();
    const b = [...root.querySelectorAll(".qvs button")].find((x) => (x.textContent || "").trim() === "Grid");
    if (b) b.click();
  })()`);
  await page.waitForTimeout(800);
  const back = await read();
  add("P3.1 · pressing the switch CHANGES the content, and Grid comes back",
      g.grid && !onBoard.grid && back.grid,
      "grid on Grid " + g.grid + " · grid on Board " + onBoard.grid + " · grid again " + back.grid);

  /* the carried decision: Inter 600, against the ref's own second declaration of Playfair */
  add("P3.2 · the ticket title is Inter 600 — the brief, not the ref's second `.ttl`",
      back.titleFont.indexOf("Inter") === 0 && back.titleFont.indexOf("|600") > -1,
      back.titleFont);

  const cards: any[] = back.cards;

  /* ⚠️ THE EDGE IS PAINTED AND HAS WIDTH. A colour with no box is a rule that applies and shows
     nothing — the family this repo records against a negative-z child with no stacking context. */
  const noEdge = cards.filter((c) => c.edgeW < 3 || c.edge === "rgba(0, 0, 0, 0)");
  add("P3.3 · every ticket's status edge is painted and has width",
      cards.length > 0 && noEdge.length === 0,
      "tickets " + cards.length + " · unpainted " + noEdge.length
        + " · distinct colours " + JSON.stringify([...new Set(cards.map((c) => c.edge))]));

  /* ⚠️ ONE DOT PER TICKET. The edge and the dot are the same fact; two dots would say it twice,
     and none would leave the foot anonymous. A card with no query has neither, by design. */
  const withAgent = cards.filter((c) => !c.own);
  const badDots = withAgent.filter((c) => c.dots > 1);
  add("P3.4 · a ticket carries at most one status dot, never two",
      badDots.length === 0 && withAgent.length > 0,
      "with an agent " + withAgent.length + " · more than one dot " + badDots.length);

  /* ⚠️ THE LABEL TALLY — the monoculture guard. The fact labels key on the BUCKET, so a fixture
     showing only sends would render one pair everywhere and pass a check that merely asserted the
     labels were non-empty. Keying them on the category was in fact WRONG and the page said so out
     loud: an offer read "Asked on", a claim about something nobody asked for. */
  const pairs = [...new Set(cards.map((c) => c.keys.join(" / ")))];
  add("P3.5 · more than one label pair rendered — the labels track the act, not one shape",
      pairs.length > 1, JSON.stringify(pairs));

  /* ⚠️ BURGUNDY IS THE URGENT LENS, ASSERTED AS AN EQUALITY BETWEEN TWO RENDERED SETS rather than
     a count. `late` calls `isUrgentCard`, so a ticket painting burgundy on a card the Urgent tile
     does not hold would mean the two had come apart. */
  const lateSet = cards.filter((c) => c.lates > 0).map((c) => c.title).sort();
  const urgentSet = cards.filter((c) => c.urgent).map((c) => c.title).sort();
  add("P3.6 · the burgundy figures ARE the urgent cards — the same set, not the same count",
      lateSet.join("|") === urgentSet.join("|"),
      "burgundy " + lateSet.length + " · urgent " + urgentSet.length
        + (lateSet.join("|") === urgentSet.join("|") ? "" : " · " + JSON.stringify({ lateSet, urgentSet })));

  const lines = out.map((x) => (x.ok ? "green  " : "RED    ") + "· " + x.id + (x.note ? "\n         " + x.note : ""));
  const red = out.filter((x) => !x.ok);
  writeFileSync(OUT, "── qc chassis · Phase 3 · " + out.length + " assertions · " + red.length
    + " RED · " + (out.length - red.length) + " green\n" + lines.join("\n") + "\n");
  console.log(lines.join("\n"));
  expect(out.length, "assertion floor").toBeGreaterThanOrEqual(6);
  expect(red.length, red.map((x) => x.id).join(" | ")).toBe(0);
});

/**
 * Phase 4 — the board.
 *
 * ⚠️ NO BACKTICKS AND NO REGEX INSIDE ANY page.evaluate TEMPLATE. Patterns are matched in Node.
 */
test("Phase 4 — the board's five columns", async ({ page }) => {
  const out: R[] = [];
  const add = (id: string, ok: boolean, note = "") => out.push({ id, ok, note });
  const OUT = process.env.SA_QC_OUT4 ?? "run-artifacts/qc-chassis-p4.txt";
  rmSync(OUT, { force: true });

  await ensureSignedIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/todo");
  await page.waitForFunction("document.querySelectorAll('.qct-tile').length > 0", null, { timeout: 45_000 }).catch(() => {});
  await liftMotionSuppression(page);
  await visiblePage(page, ".tdb-wrap");
  await page.waitForTimeout(600);

  const tiles = await page.evaluate(`(() => {
    const root = __saVisRoot();
    return [...root.querySelectorAll(".qct .qct-tile")].map((t) => ({
      label: ((t.querySelector(".qct-k") || {}).textContent || "").trim(),
      n: Number(((t.querySelector(".qct-n") || {}).textContent || "").trim()),
    }));
  })()`) as { label: string; n: number }[];
  const tileN: Record<string, number> = Object.fromEntries(tiles.map((t) => [t.label, t.n]));

  await page.evaluate(`(() => {
    const root = __saVisRoot();
    const b = [...root.querySelectorAll(".qvs button")].find((x) => (x.textContent || "").trim() === "Board");
    if (b) b.click();
  })()`);
  await page.waitForTimeout(900);

  const b = await page.evaluate(`(() => {
    const root = __saVisRoot();
    const board = root.querySelector(".brd");
    if (!board) return { board: false, cols: [] };
    return {
      board: true,
      /* the card's own foot survives the view — it counts the same array the board walks */
      foot: ((root.querySelector(".tlc .l-foot .c") || {}).textContent || "").trim(),
      cols: [...board.querySelectorAll(".brd-col")].map((c) => ({
        title: ((c.querySelector(".brd-colh .t") || {}).textContent || "").trim(),
        count: Number(((c.querySelector(".brd-colh .c") || {}).textContent || "").trim()),
        caption: ((c.querySelector(".brd-colh .r2") || {}).textContent || "").trim(),
        cards: c.querySelectorAll(".brd-card").length,
        empty: c.querySelectorAll(".brd-empty").length,
        emptyText: ((c.querySelector(".brd-empty") || {}).textContent || "").trim(),
        urgent: c.querySelectorAll(".brd-card.urgent").length,
      })),
      /* a retired sheet declares .tbd-card; nothing here may be wearing it */
      retired: board.querySelectorAll(".tbd-card, .tbd-col, .tbd-empty").length,
    };
  })()`) as any;

  add("P4.0 · the Board view renders, with exactly five columns",
      b.board && b.cols.length === 5,
      "columns " + (b.cols || []).length + " · " + JSON.stringify((b.cols || []).map((c: any) => c.title)));

  const ORDER = ["Agent requests", "Nudges", "Gone quiet", "Housekeeping", "Your tasks"];
  add("P4.1 · they are the five categories, in the tiles' order",
      b.cols.map((c: any) => c.title).join("|") === ORDER.join("|"),
      JSON.stringify(b.cols.map((c: any) => c.title)));

  /* ⚠️ THE PARTITION, AT THE SURFACE WHERE IT BECOMES VISIBLE. Each column's stated count must be
     its tile's, and the five must sum to All — read off the rendered board on every side. This is
     the same law Phase 1 asserted on the tiles, now measured on a second surface that could
     disagree with the first. */
  const mism = b.cols.filter((c: any) => c.count !== tileN[c.title]);
  const sum = b.cols.reduce((n: number, c: any) => n + c.count, 0);
  add("P4.2 · each column's count IS its tile's, and the five sum to All",
      mism.length === 0 && sum === tileN["All tasks"],
      "sum " + sum + " · All " + tileN["All tasks"]
        + (mism.length ? " · disagreeing " + JSON.stringify(mism.map((c: any) => c.title + " " + c.count + " vs " + tileN[c.title])) : ""));

  /* ⚠️ AND THE HEAD'S NUMBER IS THE STACK'S — a column stating a count it does not draw is the
     two-numbers fault at column scale. An empty column draws its words instead, and those are
     counted as zero cards rather than as a card. */
  const liars = b.cols.filter((c: any) => c.cards !== c.count);
  add("P4.3 · every column DRAWS the number it states",
      liars.length === 0,
      liars.length ? JSON.stringify(liars.map((c: any) => c.title + ": says " + c.count + ", draws " + c.cards))
        : b.cols.map((c: any) => c.title + " " + c.cards).join(" · "));

  /* ⚠️ AN EMPTY COLUMN SAYS SO — words, never a hole. The fixture has no empty column at rest, so
     this ENTERS the branch rather than reporting it unexercised: picking one tile narrows the
     board to that category, which empties the other four. The first version of this case did
     report "not exercised" and passed, which is a tally admitting it proved nothing — better than
     a silent vacuous green, and still not a measurement. */
  await page.evaluate(`(() => {
    const root = __saVisRoot();
    const t = [...root.querySelectorAll(".qct .qct-tile")]
      .find((x) => ((x.querySelector(".qct-k") || {}).textContent || "").trim() === "Housekeeping");
    if (t) t.click();
  })()`);
  await page.waitForTimeout(900);
  const narrowed = await page.evaluate(`(() => {
    const root = __saVisRoot();
    return [...root.querySelectorAll(".brd .brd-col")].map((c) => ({
      title: ((c.querySelector(".brd-colh .t") || {}).textContent || "").trim(),
      count: Number(((c.querySelector(".brd-colh .c") || {}).textContent || "").trim()),
      cards: c.querySelectorAll(".brd-card").length,
      empty: c.querySelectorAll(".brd-empty").length,
      emptyText: ((c.querySelector(".brd-empty") || {}).textContent || "").trim(),
    }));
  })()`) as any[];
  const nowEmpty = narrowed.filter((c) => c.count === 0);
  add("P4.4 · every column still renders when narrowed, and an empty one says so in words",
      narrowed.length === 5 && nowEmpty.length === 4
        && nowEmpty.every((c) => c.empty === 1 && c.emptyText.length > 0 && c.cards === 0),
      "columns after narrowing to Housekeeping " + narrowed.length
        + " · empty " + nowEmpty.length + " · "
        + JSON.stringify(narrowed.map((c) => c.title + " " + c.count))
        + (nowEmpty.length ? " · says " + JSON.stringify(nowEmpty[0].emptyText) : ""));

  /* put the board back to All, so nothing below reads a narrowed board */
  await page.evaluate(`(() => {
    const root = __saVisRoot();
    const t = [...root.querySelectorAll(".qct .qct-tile")]
      .find((x) => ((x.querySelector(".qct-k") || {}).textContent || "").trim() === "All tasks");
    if (t) t.click();
  })()`);
  await page.waitForTimeout(700);

  add("P4.5 · every column carries its caption — what the column is FOR",
      b.cols.every((c: any) => c.caption.length > 0),
      JSON.stringify(b.cols.map((c: any) => c.caption)));

  /* ⚠️ NOTHING ON THIS BOARD WEARS THE RETIRED BOARD'S CLASSES. `todoBoard.css` still declares
     `.tbd-col`/`.tbd-card`/`.tbd-empty` for a component mounted nowhere, and that sheet is still
     loaded (PortalMenu imports it) — so a name collision would have dressed this board in a
     retired one's rules silently. */
  add("P4.6 · the board wears none of the retired four-column board's classes",
      b.retired === 0, "elements carrying .tbd-* inside the board: " + b.retired);

  /* ⚠️ URGENT IS A LENS, NOT A COLUMN — asserted as an absence AND as a presence, so it cannot
     pass by the mark simply never rendering. */
  const urgentTotal = b.cols.reduce((n: number, c: any) => n + c.urgent, 0);
  add("P4.7 · Urgent is drawn ON cards, never as a sixth column",
      b.cols.length === 5 && !b.cols.some((c: any) => c.title === "Urgent") && urgentTotal > 0,
      "urgent-marked cards " + urgentTotal + " · Urgent tile " + tileN["Urgent"]);

  /* the card's footer survives the view — the count describes whatever body is showing */
  const footN = Number((/(\d+)\s+tasks/.exec(b.foot ?? "") ?? [])[1] ?? NaN);
  /* ⚠️ AND THE BOARD RESTATES NOTHING EITHER (corrections 2.1) — same claim as P1.2b, on the second
     view. The footer strip that used to close the card is gone from the content area; the tiles
     above are the one place the total lives. */
  add("P4.8 · the board states no second total — the tiles are the one home",
      !Number.isFinite(footN) && tileN["All tasks"] > 0,
      "content-area footer " + JSON.stringify(b.foot) + " · All " + tileN["All tasks"]);

  /* ⚠️ AND THE FOOT STOPS TEACHING THE ROW KEYS WHERE THERE ARE NO ROWS. `j k ↵ s d` move, open,
     snooze and dismiss a focused ROW; the board and the grid have none, so printing the hints
     there would advertise five shortcuts that do nothing — the same fault as the view switch that
     changed nothing. Asserted in BOTH directions, because "absent everywhere" would pass the first
     half while quietly removing a real affordance from the view that has it. */
  const keysOnBoard = await page.evaluate(`(() => __saVisRoot().querySelectorAll(".tlc .l-foot .keys").length)()`) as number;
  await page.evaluate(`(() => {
    const root = __saVisRoot();
    const btn = [...root.querySelectorAll(".qvs button")].find((x) => (x.textContent || "").trim() === "List");
    if (btn) btn.click();
  })()`);
  await page.waitForTimeout(800);
  const keysOnList = await page.evaluate(`(() => ({
    keys: __saVisRoot().querySelectorAll(".tlc .l-foot .keys").length,
    rows: __saVisRoot().querySelectorAll(".tlc .row").length,
  }))()`) as { keys: number; rows: number };
  add("P4.9 · the row keys are taught in List and nowhere else",
      keysOnBoard === 0 && keysOnList.keys === 1 && keysOnList.rows > 0,
      "hints on Board " + keysOnBoard + " · on List " + keysOnList.keys
        + " (with " + keysOnList.rows + " rows)");

  const lines = out.map((x) => (x.ok ? "green  " : "RED    ") + "· " + x.id + (x.note ? "\n         " + x.note : ""));
  const red = out.filter((x) => !x.ok);
  writeFileSync(OUT, "── qc chassis · Phase 4 · " + out.length + " assertions · " + red.length
    + " RED · " + (out.length - red.length) + " green\n" + lines.join("\n") + "\n");
  console.log(lines.join("\n"));
  expect(out.length, "assertion floor").toBeGreaterThanOrEqual(9);
  expect(red.length, red.map((x) => x.id).join(" | ")).toBe(0);
});

/**
 * Phase 5 — the drawer.
 *
 * ⚠️ NO BACKTICKS AND NO REGEX INSIDE ANY page.evaluate TEMPLATE. Patterns are matched in Node.
 *
 * ⚠️ AND MOTION IS LIFTED BEFORE ANYTHING IS DRIVEN. The drawer's whole behaviour is a transform
 * transition, and a suppressed transition reports where it STARTED — so a measurement taken with
 * motion off would read a closed drawer as closed no matter what the click did.
 */
test("Phase 5 — the drawer over the grid, and the split in List", async ({ page }) => {
  const out: R[] = [];
  const add = (id: string, ok: boolean, note = "") => out.push({ id, ok, note });
  const OUT = process.env.SA_QC_OUT5 ?? "run-artifacts/qc-chassis-p5.txt";
  rmSync(OUT, { force: true });

  await ensureSignedIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/todo");
  await page.waitForFunction("document.querySelectorAll('.qct-tile').length > 0", null, { timeout: 45_000 }).catch(() => {});
  await liftMotionSuppression(page);
  await visiblePage(page, ".tdb-wrap");
  await page.waitForTimeout(700);

  const drawerState = () => page.evaluate(`(() => {
    const d = document.querySelector(".slo");
    const sc = document.querySelector(".slo-scrim");
    if (!d) return { present: false };
    const r = d.getBoundingClientRect();
    return {
      present: true,
      on: d.getAttribute("data-on"),
      hidden: d.getAttribute("aria-hidden"),
      /* ⚠️ THE RECT, NOT THE ATTRIBUTE — a data-on that says open over a drawer still translated
         off screen is exactly the fault a computed-style read cannot see. */
      onScreen: r.right > 0 && r.left < window.innerWidth && r.width > 0,
      left: Math.round(r.left),
      label: d.getAttribute("aria-label") || "",
      pane: d.querySelectorAll(".tpn").length,
      scrimOn: sc ? sc.getAttribute("data-on") : null,
      scrimTab: sc ? sc.getAttribute("tabindex") : null,
      /* the split's own pane must NOT also be mounted */
      splitPane: [...document.querySelectorAll(".tdw-work .tpn")].length,
    };
  })()`) as Promise<any>;

  const rest = await drawerState();
  add("P5.0 · in Grid the drawer exists and is closed — off screen, hidden, untabbable",
      rest.present && rest.on === "false" && rest.hidden === "true"
        && !rest.onScreen && rest.scrimTab === "-1",
      "data-on " + rest.on + " · aria-hidden " + rest.hidden + " · onScreen " + rest.onScreen
        + " · left " + rest.left + " · scrim tabindex " + rest.scrimTab);

  /* open a ticket */
  const opened = await page.evaluate(`(() => {
    const t = __saVisRoot().querySelector(".tkt");
    if (!t) return null;
    const title = ((t.querySelector(".ttl") || {}).textContent || "").trim();
    t.click();
    return title;
  })()`) as string | null;
  await page.waitForTimeout(1200);
  const open = await drawerState();

  add("P5.1 · clicking a ticket slides the drawer ON, with the pane inside it",
      open.on === "true" && open.hidden === "false" && open.onScreen
        && open.pane === 1 && open.scrimOn === "true",
      "data-on " + open.on + " · onScreen " + open.onScreen + " · left " + open.left
        + " · panes inside " + open.pane + " · scrim " + open.scrimOn);

  add("P5.2 · the drawer is named for the task it holds",
      !!opened && open.label === opened, "label " + JSON.stringify(open.label)
        + " · ticket " + JSON.stringify(opened));

  /* ⚠️ ONE PANE ON SCREEN, NOT TWO. The split hosts the pane in List view and the drawer hosts it
     everywhere else; rendering both would put two panes on screen for one card, each with its own
     verbs. Asserted where it can actually be seen. */
  add("P5.3 · exactly one pane is mounted — the drawer's, not the split's as well",
      open.pane === 1 && open.splitPane === 0,
      "in the drawer " + open.pane + " · in the split " + open.splitPane);

  /* Escape closes it — and the drawer listens WITHOUT capturing, so the page keeps its own chain */
  await page.keyboard.press("Escape");
  await page.waitForTimeout(900);
  const closed = await drawerState();
  add("P5.4 · Escape closes the drawer",
      closed.on === "false" && !closed.onScreen,
      "data-on " + closed.on + " · onScreen " + closed.onScreen + " · left " + closed.left);

  /* ── and in List view the pane docks in the split instead, with no drawer ── */
  await page.evaluate(`(() => {
    const b = [...__saVisRoot().querySelectorAll(".qvs button")].find((x) => (x.textContent || "").trim() === "List");
    if (b) b.click();
  })()`);
  await page.waitForTimeout(800);
  await page.evaluate(`(() => {
    const r = __saVisRoot().querySelector(".tlc .row");
    if (r) r.click();
  })()`);
  await openFocusedRow(page);
  await page.waitForTimeout(1100);
  const list = await page.evaluate(`(() => ({
    drawer: document.querySelectorAll(".slo").length,
    splitPane: document.querySelectorAll(".tdw-work .tpn").length,
    splitOpen: document.querySelectorAll(".tdw-split.open").length,
  }))()`) as any;
  add("P5.5 · in List the pane docks in the split, and no drawer is mounted at all",
      list.drawer === 0 && list.splitPane === 1 && list.splitOpen === 1,
      "drawers " + list.drawer + " · panes in the split " + list.splitPane
        + " · split open " + list.splitOpen);

  /* ⚠️ THE PRIMITIVE HAS AN ADOPTER, AND THREE NAMED NON-ADOPTERS — the source half, because a
     rendered page cannot show that three other drawers still own private fixed elements. */
  const so = readFileSync(join(process.cwd(), "src/components/shared/SlideOver.tsx"), "utf8");
  add("P5.6 · SlideOver names the three drawers that have not adopted it",
      so.includes("QueryPanel.tsx") && so.includes("QueryLogSheet.tsx") && so.includes("Broadsheet"),
      "named: QueryPanel · QueryLogSheet · packages Broadsheet");

  const lines = out.map((x) => (x.ok ? "green  " : "RED    ") + "· " + x.id + (x.note ? "\n         " + x.note : ""));
  const red = out.filter((x) => !x.ok);
  writeFileSync(OUT, "── qc chassis · Phase 5 · " + out.length + " assertions · " + red.length
    + " RED · " + (out.length - red.length) + " green\n" + lines.join("\n") + "\n");
  console.log(lines.join("\n"));
  expect(out.length, "assertion floor").toBeGreaterThanOrEqual(6);
  expect(red.length, red.map((x) => x.id).join(" | ")).toBe(0);
});

/**
 * Phase 6 — the urgent lens's motion.
 *
 * ⚠️ MOTION SUPPRESSION IS LIFTED FIRST, and this phase is the reason the harness has that lever.
 * `liftMotionSuppression` removes the stylesheet that sets `animation: none` on everything; without
 * it every assertion below would read the suppressed value and report a correct page as still.
 *
 * ⚠️ AND REDUCED MOTION IS ASSERTED IN BOTH DIRECTIONS. A check that only proves `animation-name:
 * none` under `reduce` passes just as well on a page where the animation was never declared at
 * all — the vacuous shape this repo already records. So it reads the SAME element twice, under
 * both preferences, and requires them to differ.
 */
test("Phase 6 — the urgent motion, and reduced motion in both directions", async ({ page }) => {
  const out: R[] = [];
  const add = (id: string, ok: boolean, note = "") => out.push({ id, ok, note });
  const OUT = process.env.SA_QC_OUT6 ?? "run-artifacts/qc-chassis-p6.txt";
  rmSync(OUT, { force: true });

  await ensureSignedIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/todo");
  await page.waitForFunction("document.querySelectorAll('.qct-tile').length > 0", null, { timeout: 45_000 }).catch(() => {});
  await liftMotionSuppression(page);
  await visiblePage(page, ".tdb-wrap");
  await page.waitForTimeout(700);

  const readCards = () => page.evaluate(`(() => {
    const root = __saVisRoot();
    const all = [...root.querySelectorAll(".tkt")];
    const urgent = all.filter((c) => c.classList.contains("urgent"));
    const calm = all.filter((c) => !c.classList.contains("urgent"));
    const anim = (el) => {
      const cs = getComputedStyle(el);
      return { name: cs.animationName, dur: cs.animationDuration, delay: cs.animationDelay,
               origin: cs.transformOrigin, border: cs.borderTopColor };
    };
    return {
      total: all.length, urgent: urgent.length, calm: calm.length,
      u: urgent.slice(0, 6).map(anim),
      c: calm.slice(0, 3).map(anim),
    };
  })()`) as Promise<any>;

  const m = await readCards();

  /* ⚠️ THE POPULATION FIRST — an assertion about urgent cards is satisfied by there being none. */
  add("P6.0 · there are urgent cards AND calm ones, so both branches are measurable",
      m.urgent > 0 && m.calm > 0,
      "tickets " + m.total + " · urgent " + m.urgent + " · calm " + m.calm);

  /* ⚠️ THE GLOW ALONE (Nick's ruling, corrections). The contract draws a nudge as well and both
     were built and measured; on a real page six cards rotating every 4.5s is more movement than a
     work surface wants. The glow is what makes an urgent card findable; the rotation was what made
     the page feel restless. Asserted in BOTH directions — the glow present AND no rotation — so
     re-adding the wiggle is a decision rather than a drift. */
  add("P6.1 · every urgent ticket runs the glow, on a 4.5s cycle, and does NOT rotate",
      m.u.length > 0 && m.u.every((a: any) =>
        a.name.indexOf("saUrgentGlow") > -1
        && a.name.indexOf("Wiggle") === -1
        && a.dur.indexOf("4.5s") === 0),
      JSON.stringify(m.u[0]));

  /* ⚠️ AND NOTHING ELSE MOVES. Motion is the URGENT lens; a calm card that animated would make the
     mark meaningless, and it is the kind of thing a stray selector does silently. */
  add("P6.2 · no calm ticket animates — the motion IS the lens",
      m.c.every((a: any) => a.name === "none"),
      "calm animation-names " + JSON.stringify(m.c.map((a: any) => a.name)));

  /* ⚠️ THE STAGGER, AS A SET OF DISTINCT DELAYS. Six cards nudging in unison reads as the page
     twitching; asserted as "more than one phase is in use" rather than as a list of values, so a
     legitimate retune of the delays is not a red. */
  const delays = [...new Set(m.u.map((a: any) => a.delay))];
  add("P6.3 · the urgent cards are staggered — they do not all move together",
      m.urgent < 2 || delays.length > 1,
      "distinct delays across " + m.u.length + " urgent tickets: " + JSON.stringify(delays));

  /* ── reduced motion, both directions, on the same element ── */
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(400);
  const reduced = await readCards();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.waitForTimeout(400);
  const restored = await readCards();

  add("P6.4 · under `reduce` the motion stops — and it comes back without it",
      reduced.u.every((a: any) => a.name === "none")
        && restored.u.every((a: any) => a.name.indexOf("saUrgentGlow") > -1),
      "under reduce " + JSON.stringify(reduced.u.map((a: any) => a.name))
        + " · restored " + JSON.stringify(restored.u.slice(0, 1).map((a: any) => a.name)));

  /* ⚠️ AND THE MARK SURVIVES REDUCED MOTION. Turning the animation off must not turn the urgency
     off: the border is the FACT and the motion is only the emphasis. A reader who asked for no
     movement still needs to see which cards are urgent. */
  add("P6.5 · the urgent border remains under `reduce` — the mark is not the motion",
      reduced.u.length > 0 && reduced.u.every((a: any, i: number) => a.border === m.u[i].border),
      "border under reduce " + JSON.stringify(reduced.u.slice(0, 1).map((a: any) => a.border))
        + " · normally " + JSON.stringify(m.u.slice(0, 1).map((a: any) => a.border)));

  /* ⚠️ THE OVERRIDE MUST FOLLOW ITS TARGET IN THE SHEET. A media query confers no specificity, so
     a reduced-motion block written ABOVE the rules it overrides loses at equal weight — measured
     in this repo once already, on a transition that read 0.5s under `reduce` from a declaration
     that looked perfectly correct. Asserted at the source, because the cascade is a fact about the
     file's order that a single rendered reading cannot distinguish from luck. */
  /* ⚠️ COMMENTS STRIPPED FIRST — the house rule, and this assertion broke it on its first run. The
     file's own header EXPLAINS the ordering ("`prefers-reduced-motion` has to answer in ONE
     place"), so a raw `indexOf` found the prose at character 323 and reported a correctly ordered
     stylesheet as wrong. A source lock that reads prose is reading the wrong artefact. */
  const cssRaw = readFileSync(join(process.cwd(), "src/components/todo/urgentMotion.css"), "utf8");
  const css = cssRaw.replace(/\/\*[\s\S]*?\*\//g, "");
  const overrideAt = css.indexOf("prefers-reduced-motion");
  const lastAnimated = css.lastIndexOf("animation-delay");
  add("P6.6 · the reduced-motion block comes AFTER the rules it overrides",
      overrideAt > -1 && lastAnimated > -1 && overrideAt > lastAnimated,
      "override at " + overrideAt + " · last animated rule at " + lastAnimated
        + " (comments stripped)");

  const lines = out.map((x) => (x.ok ? "green  " : "RED    ") + "· " + x.id + (x.note ? "\n         " + x.note : ""));
  const red = out.filter((x) => !x.ok);
  writeFileSync(OUT, "── qc chassis · Phase 6 · " + out.length + " assertions · " + red.length
    + " RED · " + (out.length - red.length) + " green\n" + lines.join("\n") + "\n");
  console.log(lines.join("\n"));
  expect(out.length, "assertion floor").toBeGreaterThanOrEqual(6);
  expect(red.length, red.map((x) => x.id).join(" | ")).toBe(0);
});
