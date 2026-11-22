/**
 * List filters v1 (design-refs/list-filters-v1/) — the Filter panel, Sort, Group, Export and the applied row on the
 * Queries list (/queries) and the Agents list (/agents). Emulator harness on the built app (dist-emu, the bundle's own
 * CSS), at 1280, 1440 and 1717.
 *
 *   SA_PHASE=shots   the reference's eleven states at 1440 into reports/list-filters-v1/ (asserts nothing)
 *   (default)        the locks LF1–LF13, one ledger per lock per width (reports/list-filters-v1/ledger/)
 *
 *   LF1  one panel       both pages render shell/FilterPanel; no Views panel; the head is rgb(42, 58, 82) and reads Filter
 *   LF2  pages differ    /queries: Stage, no splits. /agents: two splits, no Stage, no Your move / Waiting to hear back
 *   LF3  stage colours   each StageLabel's and segment's background = STAGE_COLOURS[stage].band, flat (Plumage colours v1: no sheen)
 *   LF4  nothing arbitrary  /agents: nothing in the panel, bar or applied row on a stage band or tint; both pages: none
 *                        on #e3e8ef / #eef2f7 / #e9eef5; the population is at least 20 elements
 *   LF5  stage writes    Partial → only Partial's statuses in the list, its count, one chip "Partial"; again → cleared
 *   LF6  counts          every control off and not zero: pressing it leaves the list with exactly its count
 *   LF7  ready           Ready to query: both split sides on, one chip; removing the chip clears both
 *   LF8  sort is one state  the menu sets the button (and the heading's aria-sort where the list has headings); a heading
 *                        sets the button; the order switch flips the rows
 *   LF9  no grouping     Queries, Group → No grouping: no heading, one section, "None"; a reload keeps it
 *   LF10 export          no export in the panel; the bar's Export downloads exactly the rows the list shows
 *   LF11 one line        at 1280 with the sidebar open, every bar control on one top (±1) and nothing overflows
 *   LF12 one word        no "Reset", "Reset filters" or "Clear filters"; "Clear all" in the head and the applied row
 *   LF13 reduced motion  with reduced motion, a press lands every count and width within one frame
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { KILL_MOTION_ID, openRoute } from "./measure";
import { STAGE_COLOURS, STAGE_STATUSES, type Stage } from "../../src/lib/stageColours";

const QC = ".qc151.qc153";
const CL = ".clv-group.cl27";
const DIR = "reports/list-filters-v1";
const PHASE = process.env.SA_PHASE === "shots" ? "shots" : "locks";
const SIZES = [{ width: 1280, height: 800 }, { width: 1440, height: 900 }, { width: 1717, height: 1000 }];
const STAGES: Stage[] = ["queried", "partial", "full", "offer", "closed"];
test.setTimeout(900_000);
/* a press that finds nothing fails in 15s with its locator named, instead of waiting out the test */
test.use({ actionTimeout: 15_000 });
mkdirSync(`${DIR}/ledger`, { recursive: true });

class Ledger {
  rows: { name: string; ok: boolean; got: string }[] = [];
  constructor(public id: string) {}
  check(name: string, ok: boolean, got: string) { this.rows.push({ name, ok, got }); console.log(`${this.id} ${ok ? "✓" : "✗"} ${name} — ${got}`); }
  done(min: number) {
    writeFileSync(`${DIR}/ledger/${this.id}.json`, JSON.stringify(this.rows, null, 1));
    expect.soft(this.rows.length, `${this.id}: assertions run`).toBeGreaterThanOrEqual(min);
    expect.soft(this.rows.filter((r) => !r.ok).map((r) => `${r.name} — ${r.got}`), `${this.id} reds`).toEqual([]);
  }
}
const rgb = (hex: string) => { const n = parseInt(hex.slice(1), 16); return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`; };
const vis = (root: string, sel: string) => `${root} ${sel} >> visible=true`;
const hookOf = (root: string) => (root === QC ? "data-qc156" : "data-clq");
const panelSel = (root: string) => `[${hookOf(root)}='panel']`;
const rowHook = (root: string) => (root === QC ? "data-qc1511" : "data-cl26");

async function open(page: Page, route: string, root: string, vp: { width: number; height: number }) {
  await page.addInitScript(() => { try { for (const k of ["sa.guide.queries", "sa.guide.queries-explainer", "sa.guide.contacts"]) localStorage.setItem(k, "1"); } catch { /* private */ } });
  await openRoute(page, route, vp);
  await expect(page.locator(vis(root, panelSel(root))).first()).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(800);
  await page.evaluate(() => document.fonts.ready);
}
/** the list's count as the bar shows it */
async function showing(page: Page, root: string): Promise<number> {
  if (root === CL) return Number(await page.locator(vis(CL, "[data-clq='count']")).first().getAttribute("data-n"));
  const t = (await page.locator(vis(QC, "[data-qc153='count'] .qc154-tn")).first().textContent()) ?? "";
  return Number(t.match(/\d+/)?.[0] ?? -1);
}
const press = async (page: Page, root: string, sel: string) => { await page.locator(vis(root, sel)).first().click(); await page.waitForTimeout(450); };
/** the page's scroller back to the top: a menu (usePopover) closes on any scroll, so menus open from rest */
const toTop = async (page: Page, root: string) => {
  await page.evaluate((root) => {
    const r = [...document.querySelectorAll<HTMLElement>(root)].find((e) => e.getBoundingClientRect().width > 0);
    r?.closest<HTMLElement>(".wpg-scroll")?.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, root);
  await page.waitForTimeout(500);
};
/** a portalled menu's item (SortChipMenu renders into document.body) */
const pick = async (page: Page, sel: string) => { await page.locator(`${sel} >> visible=true`).first().click(); await page.waitForTimeout(450); };
const clearAll = async (page: Page, root: string) => {
  const b = page.locator(vis(root, `[${hookOf(root)}='clear']`)).first();
  if (await b.isEnabled()) { await b.click(); await page.waitForTimeout(450); }
};
/** every applied chip on the visible page */
const chips = (page: Page, root: string) => page.evaluate(([root, h]) => {
  const r = [...document.querySelectorAll<HTMLElement>(root)].find((e) => e.getBoundingClientRect().width > 0);
  return [...(r?.querySelectorAll<HTMLElement>(`[${h}='applied-chip']`) ?? [])].map((c) => ({ k: c.dataset.k ?? "", t: c.innerText.replace("×", "").trim(), stage: c.dataset.stage ?? null }));
}, [root, rowHook(root)] as const);
/** drop the harness's kill-motion sheet (LF13 measures the app's own motion rules) */
const liveMotion = (page: Page) => page.evaluate((id) => { document.querySelectorAll("style").forEach((s) => { if (s.textContent?.includes(`/*${id}*/`)) s.remove(); }); }, KILL_MOTION_ID);

if (PHASE === "locks") for (const vp of SIZES) {
  const W = vp.width;
  test(`List filters v1 — Queries — ${W}`, async ({ page }) => {
    await open(page, "/queries", QC, vp);
    const total = await showing(page, QC);

    /* LF1 */
    const L1 = new Ledger(`LF1-q-${W}`);
    const head = await page.evaluate((root) => {
      const r = [...document.querySelectorAll<HTMLElement>(root)].find((e) => e.getBoundingClientRect().width > 0)!;
      const hd = r.querySelector<HTMLElement>("[data-qc156='head']");
      return { panels: r.querySelectorAll("[data-qc156='panel']").length, old: document.querySelectorAll(".qc156-views, [data-qc156='views'], [data-clq='views']").length,
        bg: hd ? getComputedStyle(hd).backgroundColor : "", title: r.querySelector("[data-qc156='title']")?.textContent ?? "" };
    }, QC);
    L1.check("one Filter panel on the page", head.panels === 1, `${head.panels}`);
    L1.check("no Views panel anywhere in the document", head.old === 0, `${head.old}`);
    L1.check("the head is navy rgb(42, 58, 82)", head.bg === "rgb(42, 58, 82)", head.bg);
    L1.check("the head reads Filter", head.title === "Filter", head.title);
    L1.done(4);

    /* LF2 */
    const L2 = new Ledger(`LF2-q-${W}`);
    const kinds = await page.locator(vis(QC, panelSel(QC))).first().evaluate((p) => ({
      stage: p.querySelectorAll("[data-qc156='stages']").length, splits: p.querySelectorAll(".fp-split").length,
      tiles: [...p.querySelectorAll<HTMLElement>("[data-qc156='tile'] .fp-tx")].map((e) => e.textContent),
    }));
    L2.check("Queries has the Stage section", kinds.stage === 1, `${kinds.stage}`);
    L2.check("Queries has no splits", kinds.splits === 0, `${kinds.splits}`);
    L2.check("the four quick tiles", JSON.stringify(kinds.tiles) === JSON.stringify(["Your move", "Past their reply date", "Waiting to hear back", "Offers"]), JSON.stringify(kinds.tiles));
    L2.done(3);

    /* LF3 */
    const L3 = new Ledger(`LF3-${W}`);
    const bands = await page.locator(vis(QC, panelSel(QC))).first().evaluate((p) => [...p.querySelectorAll<HTMLElement>(".sf-lab, .sf-seg")].map((e) => {
      const cs = getComputedStyle(e);
      return { kind: e.classList.contains("sf-seg") ? "seg" : "label", stage: e.dataset.stage!, bg: cs.backgroundColor, img: cs.backgroundImage };
    }));
    L3.check("five labels and at least one segment", bands.filter((b) => b.kind === "label").length === 5 && bands.some((b) => b.kind === "seg"), `${bands.length}`);
    for (const b of bands) {
      const want = rgb(STAGE_COLOURS[b.stage as Stage].band);
      const sheen = b.img === "none"; /* Plumage colours v1: every stage flat, the offer too */
      L3.check(`${b.kind} ${b.stage}: background = STAGE_COLOURS.${b.stage}.band`, b.bg === want && sheen, `${b.bg} ${b.img.slice(0, 30)}`);
    }
    L3.done(6);

    /* LF5 */
    const L5 = new Ledger(`LF5-${W}`);
    const lab = `[data-qc156='stage'][data-stage='partial']`;
    const nPartial = Number(await page.locator(vis(QC, lab)).first().getAttribute("data-n"));
    L5.check("the seed has Partial queries", nPartial > 0, `${nPartial}`);
    await press(page, QC, lab);
    const statuses = await page.evaluate((root) => {
      const r = [...document.querySelectorAll<HTMLElement>(root)].find((e) => e.getBoundingClientRect().width > 0)!;
      return [...new Set([...r.querySelectorAll<HTMLElement>("[data-qc154='card']")].map((c) => c.dataset.status))];
    }, QC);
    L5.check("the list shows only Partial's statuses", statuses.length > 0 && statuses.every((s) => (STAGE_STATUSES.partial as readonly string[]).includes(s ?? "")), JSON.stringify(statuses));
    L5.check("the list shows the label's count", (await showing(page, QC)) === nPartial, `${await showing(page, QC)} vs ${nPartial}`);
    const c5 = await chips(page, QC);
    L5.check("the applied row has one chip, \"Partial\", on the Partial band", c5.length === 1 && c5[0].t === "Partial" && c5[0].stage === "partial", JSON.stringify(c5));
    L5.check("the label reads on", (await page.locator(vis(QC, lab)).first().getAttribute("aria-checked")) === "true", "");
    await press(page, QC, lab);
    L5.check("pressed again: cleared, the whole list back, no applied row", (await showing(page, QC)) === total && (await chips(page, QC)).length === 0, `${await showing(page, QC)} of ${total}`);
    L5.done(6);

    /* LF6 (Queries) */
    const L6 = new Ledger(`LF6-q-${W}`);
    await page.locator(vis(QC, "[data-qc156='dates']")).first().click(); await page.waitForTimeout(300);
    const ctrls = await page.locator(vis(QC, panelSel(QC))).first().evaluate((p) => [...p.querySelectorAll<HTMLElement>("[data-qc156='tile'], [data-qc156='stage'], [data-qc156='sent'], [data-qc156='switch']")]
      .filter((e) => !(e as HTMLButtonElement).disabled && e.getAttribute("aria-checked") === "false" && Number(e.dataset.n) > 0)
      .map((e) => ({ probe: e.getAttribute("data-qc156")!, k: e.dataset.k ?? e.dataset.stage!, attr: e.dataset.k ? "data-k" : "data-stage", n: Number(e.dataset.n) })));
    const kinds6 = new Set(ctrls.map((c) => c.probe));
    L6.check("a population: tiles, stage labels and date switches to press (sent pills when the book has packages)", ["tile", "stage", "switch"].every((k) => kinds6.has(k)), ctrls.map((c) => `${c.probe}:${c.k}:${c.n}`).join(" "));
    for (const c of ctrls) {
      const sel = `[data-qc156='${c.probe}'][${c.attr}='${c.k}']`;
      await press(page, QC, sel);
      const got = await showing(page, QC);
      L6.check(`${c.probe} ${c.k}: the list shows its count`, got === c.n, `${got} vs ${c.n}`);
      await press(page, QC, sel);
    }
    L6.check("after each, the whole list is back", (await showing(page, QC)) === total, `${await showing(page, QC)} of ${total}`);
    L6.done(10);

    /* LF8 (Queries: no column headings on its card grid — the menu, the button and the order) */
    const L8 = new Ledger(`LF8-q-${W}`);
    const firstId = () => page.locator(vis(QC, "[data-qc154='card']")).first().getAttribute("data-id");
    await toTop(page, QC); await press(page, QC, "[data-qc153='sort']");
    await pick(page, "[data-qc153='sort-menu'] [data-sc='opt'][data-k='agent']");
    const field = await page.locator(vis(QC, "[data-qc153='sort'] [data-sc='field']")).first().textContent();
    const dir = await page.locator(vis(QC, "[data-qc153='sort'] [data-sc='dir']")).first().getAttribute("title");
    L8.check("the menu's choice is the button's field, in its natural order", field === "Agent" && dir === "A to Z", `${field} · ${dir}`);
    const a = await firstId();
    await pick(page, "[data-qc153='sort-menu'] [data-sc='order-opt'][data-reversed='true']");
    const b = await firstId();
    L8.check("the order switch flips the rows", !!a && !!b && a !== b, `${a} → ${b}`);
    L8.check("the button's arrow follows", (await page.locator(vis(QC, "[data-qc153='sort'] [data-sc='dir']")).first().textContent()) === "↓", "");
    await page.keyboard.press("Escape");
    await toTop(page, QC); await press(page, QC, "[data-qc153='sort']");
    await pick(page, "[data-qc153='sort-menu'] [data-sc='opt'][data-k='due']");
    await page.keyboard.press("Escape");
    L8.done(3);

    /* LF9 */
    const L9 = new Ledger(`LF9-${W}`);
    await step(L9, "Group → No grouping", async () => { await toTop(page, QC); await press(page, QC, "[data-qc153='group']");
      await page.locator("[data-qc151='menu'][data-k='group'] [data-v='none']").click(); await page.waitForTimeout(500); });
    const read9 = () => page.evaluate((root) => {
      const r = [...document.querySelectorAll<HTMLElement>(root)].find((e) => e.getBoundingClientRect().width > 0)!;
      return { heads: r.querySelectorAll("[data-qc153='heading']").length, groups: [...r.querySelectorAll<HTMLElement>("[data-qc1511='group']")].map((g) => g.dataset.k),
        btn: r.querySelector("[data-qc153='group'] b")?.textContent ?? "" };
    }, QC);
    const g1 = await read9();
    L9.check("no group heading, one section, the button reads None", g1.heads === 0 && g1.groups.length === 1 && g1.groups[0] === "all" && g1.btn === "None", JSON.stringify(g1));
    await page.reload(); await expect(page.locator(vis(QC, panelSel(QC))).first()).toBeVisible({ timeout: 60_000 }); await page.waitForTimeout(1500);
    const g2 = await read9();
    L9.check("a reload keeps it", g2.heads === 0 && g2.btn === "None", JSON.stringify(g2));
    await step(L9, "Group → Action", async () => { await toTop(page, QC); await press(page, QC, "[data-qc153='group']");
      await page.locator("[data-qc151='menu'][data-k='group'] [data-v='attention']").click(); await page.waitForTimeout(500); });
    L9.check("Action again: headings back", (await read9()).heads > 0, "");
    L9.done(3);

    /* LF10 (Queries) */
    const L10 = new Ledger(`LF10-q-${W}`);
    L10.check("the panel holds no export", (await page.locator(vis(QC, panelSel(QC))).first().evaluate((p) => [...p.querySelectorAll("button")].filter((b) => /export/i.test(b.textContent ?? "") || /export/i.test(b.getAttribute("aria-label") ?? "")).length)) === 0, "");
    await press(page, QC, "[data-qc156='tile'][data-k='wait']");
    const n10 = await showing(page, QC);
    const dl = page.waitForEvent("download", { timeout: 20_000 });
    await page.locator(vis(QC, "[data-qc153='export']")).first().click();
    const rows10 = csvRows(readFileSync(await (await dl).path()!, "utf8"));
    L10.check("Export downloads exactly the rows the list shows", rows10 === n10, `${rows10} rows vs ${n10} shown`);
    L10.check("its name is the old label", (await page.locator(vis(QC, "[data-qc153='export']")).first().getAttribute("aria-label")) === `Export ${n10} ${n10 === 1 ? "query" : "queries"}`, "");
    await clearAll(page, QC);
    L10.done(3);

    /* LF11 */
    if (W === 1280) await oneLine(page, QC, "q");

    /* LF12 (Queries) */
    const L12 = new Ledger(`LF12-q-${W}`);
    await words(page, QC, L12, "at rest", false);
    await press(page, QC, "[data-qc156='tile'][data-k='you']");
    await words(page, QC, L12, "filtered", true);
    await clearAll(page, QC);
    if (await step(L12, "search for nobody", () => page.locator(vis(QC, "[data-qc151='find'] input")).first().fill("zzqx-nobody"))) {
      await page.waitForTimeout(600);
      await words(page, QC, L12, "nothing matches", true);
      L12.check("nothing matches: its button says Clear all", (await page.locator(vis(QC, "[data-qc151='empty-reset']")).first().textContent()) === "Clear all", "");
      await page.locator(vis(QC, "[data-qc151='empty-reset']")).first().click(); await page.waitForTimeout(500);
    }
    L12.done(8);

    /* LF4 (Queries: no powder) */
    await arbitrary(page, QC, W);

    /* LF13 (Queries) */
    if (W === 1440) await reduced(page, QC, "[data-qc156='tile'][data-k='wait']");
  });

  test(`List filters v1 — Agents — ${W}`, async ({ page }) => {
    await open(page, "/agents", CL, vp);
    const total = await showing(page, CL);

    const L1 = new Ledger(`LF1-a-${W}`);
    const head = await page.evaluate((root) => {
      const r = [...document.querySelectorAll<HTMLElement>(root)].find((e) => e.getBoundingClientRect().width > 0)!;
      const hd = r.querySelector<HTMLElement>("[data-clq='head']");
      return { panels: r.querySelectorAll("[data-clq='panel']").length, old: document.querySelectorAll(".qc156-views, [data-qc156='views'], [data-clq='views']").length,
        bg: hd ? getComputedStyle(hd).backgroundColor : "", title: r.querySelector("[data-clq='title']")?.textContent ?? "" };
    }, CL);
    L1.check("one Filter panel on the page", head.panels === 1, `${head.panels}`);
    L1.check("no Views panel anywhere in the document", head.old === 0, `${head.old}`);
    L1.check("the head is navy rgb(42, 58, 82)", head.bg === "rgb(42, 58, 82)", head.bg);
    L1.check("the head reads Filter", head.title === "Filter", head.title);
    L1.done(4);

    const L2 = new Ledger(`LF2-a-${W}`);
    const kinds = await page.locator(vis(CL, panelSel(CL))).first().evaluate((p) => ({
      stage: p.querySelectorAll(".sf-labs, .sf-bar").length, splits: p.querySelectorAll(".fp-split").length,
      chase: [...p.querySelectorAll("button")].filter((b) => /Your move|Waiting to hear back/.test(b.textContent ?? "")).length,
    }));
    L2.check("Agents has the two splits", kinds.splits === 2, `${kinds.splits}`);
    L2.check("Agents has no Stage section", kinds.stage === 0, `${kinds.stage}`);
    L2.check("no control named Your move or Waiting to hear back", kinds.chase === 0, `${kinds.chase}`);
    L2.done(3);

    /* LF6 (Agents) */
    const L6 = new Ledger(`LF6-a-${W}`);
    const ctrls = await page.locator(vis(CL, panelSel(CL))).first().evaluate((p) => [...p.querySelectorAll<HTMLElement>("[data-clq='tile'], [data-clq='side'], [data-clq='genre']")]
      .filter((e) => !(e as HTMLButtonElement).disabled && e.getAttribute("aria-checked") === "false" && Number(e.dataset.n) > 0)
      .map((e) => ({ probe: e.getAttribute("data-clq")!, k: e.dataset.k!, n: Number(e.dataset.n) })));
    L6.check("a population: tiles, split sides and genres to press", new Set(ctrls.map((c) => c.probe)).size === 3, ctrls.map((c) => `${c.probe}:${c.k}:${c.n}`).join(" "));
    for (const c of ctrls) {
      const sel = `[data-clq='${c.probe}'][data-k='${c.k}']`;
      await press(page, CL, sel);
      const got = await showing(page, CL);
      L6.check(`${c.probe} ${c.k}: the list shows its count`, got === c.n, `${got} vs ${c.n}`);
      await press(page, CL, sel);
    }
    L6.check("after each, the whole list is back", (await showing(page, CL)) === total, `${await showing(page, CL)} of ${total}`);
    L6.done(8);

    /* LF7 */
    const L7 = new Ledger(`LF7-${W}`);
    await press(page, CL, "[data-clq='tile'][data-k='ready']");
    const on7 = await page.locator(vis(CL, panelSel(CL))).first().evaluate((p) => [...p.querySelectorAll<HTMLElement>("[data-clq='side'][aria-checked='true']")].map((e) => e.dataset.k));
    L7.check("Ready to query reads on", (await page.locator(vis(CL, "[data-clq='tile'][data-k='ready']")).first().getAttribute("aria-checked")) === "true", "");
    L7.check("both split sides read on: not yet queried, open to queries", JSON.stringify(on7) === JSON.stringify(["no", "open"]), JSON.stringify(on7));
    const c7 = await chips(page, CL);
    L7.check("the applied row has one chip, Ready to query", c7.length === 1 && c7[0].t === "Ready to query", JSON.stringify(c7));
    if (!(await step(L7, "remove the Ready to query chip", () => page.locator(vis(CL, "[data-cl26='applied-chip'][data-k='ready']")).first().click({ timeout: 5000 })))) await clearAll(page, CL);
    await page.waitForTimeout(450);
    const off7 = await page.locator(vis(CL, panelSel(CL))).first().evaluate((p) => p.querySelectorAll("[data-clq='side'][aria-checked='true']").length);
    L7.check("removing the chip clears both", off7 === 0 && (await showing(page, CL)) === total && (await chips(page, CL)).length === 0, `${off7} sides on, ${await showing(page, CL)} of ${total}`);
    L7.done(4);

    /* LF8 (Agents) */
    const L8 = new Ledger(`LF8-a-${W}`);
    const firstId = () => page.locator(vis(CL, "[data-cl26='row']")).first().getAttribute("data-id");
    const ariaSort = (k: string) => page.locator(vis(CL, `[data-cl26='head'][data-key='${k}']`)).first().evaluate((b) => b.closest("[role='columnheader']")?.getAttribute("aria-sort"));
    await toTop(page, CL); await press(page, CL, "[data-clq='sort']");
    await pick(page, "[data-clq='sort-menu'] [data-sc='opt'][data-k='status']");
    L8.check("the menu's choice sets aria-sort on its heading", (await ariaSort("status")) === "ascending" && (await ariaSort("surname")) === "none", `${await ariaSort("status")} / ${await ariaSort("surname")}`);
    await page.keyboard.press("Escape"); await page.waitForTimeout(200);
    await press(page, CL, "[data-cl26='head'][data-key='surname']");
    const f8 = await page.locator(vis(CL, "[data-clq='sort'] [data-sc='field']")).first().textContent();
    L8.check("a heading press changes the button's field", f8 === "Surname", `${f8}`);
    const a = await firstId();
    await toTop(page, CL); await press(page, CL, "[data-clq='sort']");
    await pick(page, "[data-clq='sort-menu'] [data-sc='order-opt'][data-reversed='true']");
    const b = await firstId();
    L8.check("the order switch flips the rows", !!a && !!b && a !== b, `${a} → ${b}`);
    L8.check("…and the heading's arrow and aria-sort follow", (await ariaSort("surname")) === "descending"
      && (await page.locator(vis(CL, "[data-clq='sort'] [data-sc='dir']")).first().textContent()) === "↓", `${await ariaSort("surname")}`);
    await pick(page, "[data-clq='sort-menu'] [data-sc='order-opt'][data-reversed='false']");
    await page.keyboard.press("Escape");
    L8.done(4);

    /* LF10 (Agents) */
    const L10 = new Ledger(`LF10-a-${W}`);
    L10.check("the panel holds no export", (await page.locator(vis(CL, panelSel(CL))).first().evaluate((p) => [...p.querySelectorAll("button")].filter((b) => /export/i.test(b.textContent ?? "")).length)) === 0, "");
    await press(page, CL, "[data-clq='side'][data-k='no']");
    const n10 = await showing(page, CL);
    const dl = page.waitForEvent("download", { timeout: 20_000 });
    await page.locator(vis(CL, "[data-clq='export']")).first().click();
    const rows10 = csvRows(readFileSync(await (await dl).path()!, "utf8"));
    L10.check("Export downloads exactly the rows the list shows", rows10 === n10, `${rows10} rows vs ${n10} shown`);
    await clearAll(page, CL);
    L10.done(2);

    if (W === 1280) await oneLine(page, CL, "a");

    const L12 = new Ledger(`LF12-a-${W}`);
    await words(page, CL, L12, "at rest", false);
    await press(page, CL, "[data-clq='tile'][data-k='always']");
    await words(page, CL, L12, "filtered", true);
    await arbitrary(page, CL, W);
    await clearAll(page, CL);
    if (await step(L12, "search for nobody", () => page.locator(vis(CL, "[data-cl26='find'] input")).first().fill("zzqx-nobody"))) {
      await page.waitForTimeout(600);
      await words(page, CL, L12, "nothing matches", true);
      L12.check("nothing matches: its button says Clear all", (await page.locator(vis(CL, "[data-cl26='reset']")).first().textContent()) === "Clear all", "");
      await page.locator(vis(CL, "[data-cl26='reset']")).first().click(); await page.waitForTimeout(500);
    }
    L12.done(8);

    if (W === 1440) await reduced(page, CL, "[data-clq='side'][data-k='yes']");
  });
}

/** a step a lock depends on: if it cannot be done (a red build can remove what it presses), the lock records a red and
 *  the test carries on, so every later lock still reports */
async function step(L: Ledger, name: string, fn: () => Promise<unknown>): Promise<boolean> {
  try { await fn(); return true; } catch (e) { L.check(`${name} (could not be done)`, false, String((e as Error).message).split("\n")[0].slice(0, 160)); return false; }
}

/** CSV data rows: records after the header, quoted newlines kept inside their record */
function csvRows(text: string): number {
  let rec = 0, q = false, any = false;
  for (const ch of text.replace(/^﻿/, "")) {
    if (ch === "\"") q = !q;
    if (ch === "\n" && !q) { if (any) rec++; any = false; } else if (ch !== "\r") any = true;
  }
  if (any) rec++;
  return rec - 1;
}

/** LF11 — one line at 1280 with the sidebar open */
async function oneLine(page: Page, root: string, tag: string) {
  const L = new Ledger(`LF11-${tag}`);
  const r = await page.evaluate((root) => {
    const pg = [...document.querySelectorAll<HTMLElement>(root)].find((e) => e.getBoundingClientRect().width > 0)!;
    const bar = pg.querySelector<HTMLElement>(".qc153-bar")!;
    const kids = [...bar.children].filter((e) => (e as HTMLElement).getBoundingClientRect().width > 0) as HTMLElement[];
    const side = document.querySelector<HTMLElement>("#ws-sidebar");
    return { tops: kids.map((k) => Math.round(k.getBoundingClientRect().top * 10) / 10), centres: kids.map((k) => { const b = k.getBoundingClientRect(); return Math.round((b.top + b.height / 2) * 10) / 10; }),
      boxTops: kids.filter((k) => k.getBoundingClientRect().height >= 30).map((k) => Math.round(k.getBoundingClientRect().top * 10) / 10),
      over: bar.scrollWidth - bar.clientWidth, fit: bar.getAttribute("data-fit"), sidebar: side ? Math.round(side.getBoundingClientRect().width) : 0, n: kids.length };
  }, root);
  /* the app's open sidebar is its 80px rail; collapsed (⌘\\) it takes no width */
  L.check("the sidebar is open (its 80px rail drawn)", r.sidebar >= 60, `${r.sidebar}px`);
  L.check("every bar control on one line (centres ±1)", Math.max(...r.centres) - Math.min(...r.centres) <= 1, `${r.centres.join(", ")} (fit: ${r.fit ?? "full"})`);
  L.check("every box control (Find, the chips, Export, the switch) shares one top edge (±1)", r.boxTops.length >= 4 && Math.max(...r.boxTops) - Math.min(...r.boxTops) <= 1, `${r.boxTops.join(", ")}`);
  L.check("nothing overflows the bar", r.over <= 0, `${r.over}px`);
  L.done(4);
}

/** LF12 — the clearing words */
async function words(page: Page, root: string, L: Ledger, state: string, filtered: boolean) {
  const r = await page.evaluate(([root, h, rh]) => {
    const pg = [...document.querySelectorAll<HTMLElement>(root)].find((e) => e.getBoundingClientRect().width > 0)!;
    const zone = [pg.querySelector<HTMLElement>(`[${h}='panel']`), pg.querySelector<HTMLElement>(".qc153-bar"), pg.querySelector<HTMLElement>(`[${rh}='applied']`),
      pg.querySelector<HTMLElement>(".qc153-main")].filter(Boolean) as HTMLElement[];
    const text = zone.map((z) => z.innerText).join("\n");
    return { bad: text.match(/\bReset\b|Reset filters|Clear filters|Clear the filters/g) ?? [], head: pg.querySelector(`[${h}='clear']`)?.textContent ?? "",
      row: pg.querySelector(`[${rh}='applied-clear']`)?.textContent ?? null };
  }, [root, hookOf(root), rowHook(root)] as const);
  L.check(`${state}: no Reset, Reset filters or Clear filters`, r.bad.length === 0, JSON.stringify(r.bad));
  L.check(`${state}: "Clear all" in the head`, r.head === "Clear all", r.head);
  if (filtered) L.check(`${state}: "Clear all" in the applied row`, r.row === "Clear all", `${r.row}`);
}

/** LF4 — no stage colour off a stage, no powder anywhere; the population proved first */
async function arbitrary(page: Page, root: string, W: number) {
  const L = new Ledger(`LF4-${root === QC ? "q" : "a"}-${W}`);
  /* Plumage colours v1: the offer's band IS the app's navy (Nick, 22 Nov), which the panel's own chrome has always used,
     so navy cannot tell a stage here; every other stage band and tint still counts */
  const stageCols = root === CL ? STAGES.flatMap((s) => [rgb(STAGE_COLOURS[s].band), rgb(STAGE_COLOURS[s].tint)]).filter((c) => c !== rgb("#2a3a52")) : [];
  const powder = ["#e3e8ef", "#eef2f7", "#e9eef5"].map(rgb);
  const r = await page.evaluate(([root, h, rh]) => {
    const pg = [...document.querySelectorAll<HTMLElement>(root)].find((e) => e.getBoundingClientRect().width > 0)!;
    const zone = [pg.querySelector(`[${h}='panel']`), pg.querySelector(".qc153-bar"), pg.querySelector(`[${rh}='applied']`)].filter(Boolean) as Element[];
    const els = zone.flatMap((z) => [z, ...z.querySelectorAll("*")]);
    return { n: els.length, applied: !!pg.querySelector(`[${rh}='applied']`), bgs: els.map((e) => ({ bg: getComputedStyle(e).backgroundColor, cls: (e as HTMLElement).className?.toString?.().slice(0, 40) ?? e.tagName })) };
  }, [root, hookOf(root), rowHook(root)] as const);
  L.check("the population: panel, bar (and applied row on Agents) at least 20 elements", r.n >= 20 && (root === QC || r.applied), `${r.n} elements, applied row ${r.applied}`);
  const hitStage = r.bgs.filter((b) => stageCols.includes(b.bg));
  const hitPowder = r.bgs.filter((b) => powder.includes(b.bg));
  if (root === CL) L.check("no stage band or tint on Agents' panel, bar or applied row", hitStage.length === 0, JSON.stringify(hitStage.slice(0, 4)));
  L.check("no powder blue", hitPowder.length === 0, JSON.stringify(hitPowder.slice(0, 4)));
  L.done(2);
}

/** LF13 — reduced motion: every count and width lands within one frame of a press */
async function reduced(page: Page, root: string, sel: string) {
  const L = new Ledger(`LF13-${root === QC ? "q" : "a"}`);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await liveMotion(page);
  await page.waitForTimeout(300);
  const read = () => page.evaluate(([root, h]) => {
    const p = [...document.querySelectorAll<HTMLElement>(`${root} [${h}='panel']`)].find((e) => e.getBoundingClientRect().width > 0)!;
    return { counts: [...p.querySelectorAll<HTMLElement>("b[data-n]")].map((b) => [b.textContent, b.dataset.n]), widths: [...p.querySelectorAll<HTMLElement>(".sf-seg, .fp-sg")].map((e) => Math.round(e.getBoundingClientRect().width * 10) / 10) };
  }, [root, hookOf(root)] as const);
  await page.locator(vis(root, sel)).first().click();
  const frame = await page.evaluate(() => new Promise<void>((res) => requestAnimationFrame(() => requestAnimationFrame(() => res()))));
  void frame;
  const one = await read();
  await page.waitForTimeout(700);
  const settled = await read();
  L.check("every count is its value one frame after the press", one.counts.every(([t, n]) => t === n), JSON.stringify(one.counts.filter(([t, n]) => t !== n).slice(0, 4)));
  L.check("every bar segment and split side is at its width one frame after the press", JSON.stringify(one.widths) === JSON.stringify(settled.widths), `${one.widths.join(",")} → ${settled.widths.join(",")}`);
  await page.locator(vis(root, sel)).first().click(); await page.waitForTimeout(300);
  await page.emulateMedia({ reducedMotion: null });
  L.done(2);
}

/* ── the reference's eleven states at 1440 ── */
if (PHASE === "shots") {
  /* 1440 wide (the reference's width); tall enough that the whole panel, the genres expanded included, is in frame */
  const vp = { width: 1440, height: 1500 };
  const shot = (page: Page, name: string) => page.screenshot({ path: `${DIR}/${name}.png` });
  test("screens — Queries", async ({ page }) => {
    await open(page, "/queries", QC, vp);
    await shot(page, "01-queries-rest");
    await press(page, QC, "[data-qc156='stage'][data-stage='partial']"); await press(page, QC, "[data-qc156='stage'][data-stage='full']");
    await page.waitForTimeout(500); await shot(page, "02-queries-two-stages");
    await clearAll(page, QC);
    await press(page, QC, "[data-qc156='tile'][data-k='over']");
    await page.locator(vis(QC, "[data-qc156='dates']")).first().click(); await page.waitForTimeout(300);
    const sw = page.locator(vis(QC, "[data-qc156='switch']:not([disabled])")).first();
    if (await sw.count()) await sw.click();
    await page.waitForTimeout(500); await shot(page, "03-queries-pick-and-dates");
    await clearAll(page, QC);
    await toTop(page, QC); await press(page, QC, "[data-qc153='sort']"); await page.waitForTimeout(300); await shot(page, "04-queries-sort-menu"); await page.keyboard.press("Escape");
    await toTop(page, QC); await press(page, QC, "[data-qc153='group']"); await page.waitForTimeout(300); await shot(page, "05-queries-group-menu");
    await page.locator("[data-qc151='menu'][data-k='group'] [data-v='none']").click(); await page.waitForTimeout(600);
    await shot(page, "06-queries-no-grouping");
    await toTop(page, QC); await press(page, QC, "[data-qc153='group']"); await page.locator("[data-qc151='menu'][data-k='group'] [data-v='attention']").click(); await page.waitForTimeout(400);
  });
  test("screens — Agents", async ({ page }) => {
    await open(page, "/agents", CL, vp);
    await shot(page, "07-agents-rest");
    await press(page, CL, "[data-clq='tile'][data-k='ready']");
    const g = page.locator(vis(CL, "[data-clq='genre']:not([disabled])")).first();
    if (await g.count()) await g.click();
    await page.waitForTimeout(500); await shot(page, "08-agents-pick-and-genre");
    await clearAll(page, CL);
    await press(page, CL, "[data-clq='side'][data-k='no']"); await press(page, CL, "[data-clq='side'][data-k='open']");
    await page.waitForTimeout(500); await shot(page, "09-agents-splits");
    await clearAll(page, CL);
    const more = page.locator(vis(CL, "[data-clq='genre-more']"));
    if (await more.count()) await more.first().click();
    await page.waitForTimeout(500); await shot(page, "10-agents-all-genres");
    await page.locator(vis(CL, "[data-cl26='find'] input")).first().fill("zzqx-nobody"); await page.waitForTimeout(700);
    await shot(page, "11-agents-nothing-matches");
    await page.locator(vis(CL, "[data-cl26='find'] input")).first().fill("");
  });
}
