/**
 * THE CONTRACT — all fifteen difference rows, plus the eleven matches as REGRESSION GUARDS.
 *
 * ⚠️ THE GUARDS ARE NOT DECORATION. Eleven things already agreed with
 * `design-refs/todo-materials-contract.html` before this run. If one goes red during the
 * restructure it is a regression THIS RUN introduced, not a pre-existing gap — which is a
 * different thing and gets fixed rather than reported.
 *
 * ⚠️ D1 IS THE ONE THAT WAS SILENTLY GREEN ALL ALONG. "a .rim exists" passes today; the pane has
 * exactly one. It must assert THREE cards, each with its OWN rim, and the workrow a SIBLING of the
 * header card rather than a descendant.
 *
 * Collects rather than throws. Every probe scoped to the visible pane.
 */
import { test, expect } from "@playwright/test";
import { ensureSignedIn } from "./measure";
import { writeFileSync } from "node:fs";

type R = { id: string; ok: boolean; note: string };

const RIM = "rgba(124, 58, 42, 0.28)";
const RIMLINE = "rgba(124, 58, 42, 0.13)";

/** journey → the contract's own DATA row: figure, tiles, timeline. */
const J: { key: string; row: RegExp; enters: boolean; grp: string; fig: boolean; tiles: boolean; tl: boolean }[] = [
  { key: "send",   row: /^Send your full/,                         enters: true,  grp: "urgent",       fig: true,  tiles: true,  tl: true },
  { key: "chase",  row: /^Chase your query/,                       enters: true,  grp: "urgent",       fig: true,  tiles: true,  tl: true },
  { key: "close",  row: /^Log the close/,                          enters: true,  grp: "housekeeping", fig: true,  tiles: true,  tl: true },
  { key: "fix1",   row: /^No record of what you sent/,             enters: true,  grp: "housekeeping", fig: false, tiles: false, tl: true },
  { key: "fixN",   row: /queries have no record of what you sent/, enters: false, grp: "housekeeping", fig: false, tiles: false, tl: false },
  { key: "note",   row: /^Nudge /,                                 enters: false, grp: "yours",        fig: true,  tiles: true,  tl: false },
];

test("contract", async ({ page }) => {
  const out: R[] = [];
  const add = (id: string, ok: boolean, note = "") => out.push({ id, ok, note });

  await page.setViewportSize({ width: 1440, height: 900 });
  await ensureSignedIn(page);

  /* ── D7–D10 · fluid ground: read from the served stylesheet, not from source ─────────────── */
  const css = await page.evaluate(async () => {
    const link = [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => (l as HTMLLinkElement).href);
    const inline = [...document.querySelectorAll("style")].map((s) => s.textContent ?? "").join("\n");
    const fetched = await Promise.all(link.map((h) => fetch(h).then((r) => r.text()).catch(() => "")));
    return inline + "\n" + fetched.join("\n");
  });
  /* ⚠️ COMMENTS STRIPPED FIRST. My own notes say the words "@container" and "tdk-jgrid" while
     explaining their removal, and an unstripped read matches the prose that documents the
     retirement — the source-lock fault this codebase has paid for repeatedly. */
  const bare = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const paneRules = bare.split("}").filter((r) => /tdk-|tdw-|tdg-|pj-/.test(r)).join("}");
  add("D7/D8/D9/D10 · no @container anywhere in the pane's rules",
      !/@container/.test(paneRules),
      (paneRules.match(/@container[^{]*/g) ?? []).slice(0, 6).join(" | ") || "none");
  add("D7 · the rail is fluid, not a fixed px track",
      !/--tdw-rail-w:\s*\d+px/.test(bare),
      (css.match(/--tdw-rail-w:[^;]*/) ?? ["absent"])[0]);
  /* ⚠️ RE-POINTED TO THE GRID (Query Centre match), AND THE WRAPPING ROW IT REPLACES IS WHY. In a
     wrapping row the line's cross size is the tallest item's own content height, so both panes
     measured 1331px inside a 669px split and the PAGE scrolled instead of the panes — measured, and
     invisible to the previous form of this pair, which asked only whether `flex-wrap: wrap` was
     present. The 390px zero-width pane the wrap was added for is fixed in the TRACK now:
     `min(340px, 34%)` has no floor for the grid to honour before `minmax(0, 1fr)` is fed, so the
     pane always keeps two thirds of the measure. Both halves are proven by measurement in
     qcMatch.measure.ts; what is read here is that the served sheet says so. */
  const tight = bare.replace(/\s*([:;{}])\s*/g, "$1").replace(/\s+/g, " ");
  /* ⚠️ RE-POINTED FOR THE DRAWER (round Phase 7): the split has TWO SHAPES now — `100%
     minmax(0,1fr)` at rest, `520px minmax(0,1fr)` open — so the pinned track list went with the
     layout it described. The LAW is unchanged and asserted as tasksViewport states it: no track in
     either shape may be sized by its content, which the name-the-offenders form catches where a
     pinned value cannot. */
  const restCols = (tight.match(/\.tdw-split\{[^}]*grid-template-columns:([^;}]*)/) ?? [null, ""])[1];
  const openCols = (tight.match(/\.tdw-split\.open\{[^}]*grid-template-columns:([^;}]*)/) ?? [null, ""])[1];
  add("D7 · the split's tracks refuse to be sized by their content, in BOTH shapes",
      !!restCols && !!openCols
        && ![restCols, openCols].some((c) => /\b(auto|min-content|max-content|fit-content)\b/.test(c))
        && /\.tdw-split\{[^}]*grid-template-rows:minmax\(0,\s*1fr\)/.test(tight),
      "rest [" + restCols + "] · open [" + openCols + "]");
  add("D7 · neither column carries a flex basis a grid would ignore",
      !/\.tdw-split>\.tdw-(rail|work)\{[^}]*flex:/.test(tight),
      (tight.match(/\.tdw-split>\.tdw-rail\{[^}]*\}/) ?? ["not found"])[0].slice(0, 90));
  /* ⚠️ THE JOURNEY WALK AND THE TILE CASE ARE DELETED, NOT RETARGETED (drawer round, Phase 7) —
     their subjects are two panes gone: `.tdg-row` (the grouped list the TaskList port replaced)
     was the walk's only entrance, and every `.tdk-*` selector below it described the three-card
     dock that Phase 3's sheet retired. Both had been failing as "no card — journey not exercised"
     — an honest red about a dead door. Where each law lives now:
       · click-every-journey-mounts → tests/e2e/paneMounts.measure.ts (the standing canary)
       · the pane is one framed object, its rims and its foot → tests/e2e/sheetSlip.measure.ts
       · the chassis names and their nesting → src/components/todo/taskPanePort.test.tsx
       · the tiles' layout → the slip stacks them (sheetSlip), the auto-fit grid is extinct */

  const red = out.filter((r) => !r.ok);
  const lines = [`── contract · ${out.length} assertions · ${red.length} RED · ${out.length - red.length} green`];
  for (const r of out) lines.push(`  ${r.ok ? "green" : "RED  "}  ${r.id}\n           ${r.note}`);
  const report = lines.join("\n");
  writeFileSync(process.env.SA_CONTRACT_OUT ?? "run-artifacts/contract.txt", report);
  console.log("\n" + report + "\n");
  expect(red, `${red.length} red`).toHaveLength(0);
});
