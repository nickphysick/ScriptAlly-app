/**
 * cards-sort-search v1 — the CSS1 locks (refs design-refs/cards-sort-search-v1/), on the rendered page at 1280 × 800 and
 * 1512 × 900, on both pages where they apply. Each proves its population before it asserts, writes a ledger to
 * reports/cards-sort-search-v1/ledger/ (`base-` for a run against the pre-pack build, `mut-` under its named break) and
 * fails on any red reading.
 *
 *   CSS1_BASE=1        a run against the base build (the red-first reading)
 *   CSS1_MUTATE=L<n>   that lock's break: in the page for L2, L3, L4 and L9; in src for L1, L5, L6, L7 and L8 (the report
 *                      names each edit; they are made from a path-derived backup and undone)
 *
 * L1 columns · L2 export · L3 headings · L4 keys · L5 skeleton · L6 one sort · L7 chip placement · L8 jump row · L9 well
 */
import { expect, test, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";
import { openContacts16, LOADED_ROW16 } from "./cl16Lib";

const DIR = "reports/cards-sort-search-v1";
const SIZES = [{ width: 1280, height: 800 }, { width: 1512, height: 900 }] as const;
type VP = { width: number; height: number };
const MUT = process.env.CSS1_MUTATE ?? "";
const BASE = process.env.CSS1_BASE === "1";

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ lock: this.name, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${BASE ? "base-" : ""}${MUT === this.name ? "mut-" : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 30)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/** the in-page breaks (L1, L5, L6, L7 and L8's are source edits) */
const MUTATIONS: Record<string, { css?: string; js?: string; init?: string }> = {
  L2: { js: `(() => { const hide = () => document.querySelectorAll('[data-qc1421="strip-export"]').forEach((b) => { if (/Export all/.test(b.textContent || "")) b.style.display = "none"; }); hide(); new MutationObserver(hide).observe(document.body, { childList: true, subtree: true, characterData: true }); })()` },
  L3: { css: `.qc138-sheet .qc138-band.qc142-lg { box-shadow: inset 0 1px 0 rgba(28, 19, 15, 0.07), inset 0 -1px 0 rgba(28, 19, 15, 0.07) !important; }` },
  L4: { init: `(() => { window.addEventListener("keydown", (e) => { if ((e.key === "j" || e.key === "k") && document.querySelector(".qc138-sheet[data-view='cards']")) { e.stopImmediatePropagation(); } }, true); })()` },
  L9: { css: `.fw-well { background: #fff !important; }` },
};
const mutate = async (page: Page, lock: string) => {
  const m = MUT === lock ? MUTATIONS[lock] : null;
  if (!m) return;
  if (m.css) await page.addStyleTag({ content: m.css });
  if (m.js) await page.evaluate(m.js);
  await page.waitForTimeout(250);
};

const flags = (a: string) => execSync(`node tests/e2e/guideFlags.mjs --page queries ${a}`, { encoding: "utf8" }).trim().split("\n").pop()!;
let original = "null";
test.beforeAll(() => { original = flags(""); });
test.afterAll(() => { flags(`--restore '${original}'`); });

type QOpt = { view?: "cards" | "list"; group?: string; full?: boolean; hold?: number; sort?: { key: string; reversed: boolean } };
async function openQc(page: Page, vp: VP, o: QOpt = {}) {
  if (MUT === "L4" && MUTATIONS.L4.init) await page.addInitScript(MUTATIONS.L4.init);
  await page.addInitScript((x: QOpt) => {
    try {
      if (x.hold) (window as unknown as { __SA_QC_HOLD_MS?: number }).__SA_QC_HOLD_MS = x.hold;
      sessionStorage.removeItem("qh.qc.filters");
      sessionStorage.setItem("sa.qc138.folded", "[]");
      localStorage.setItem("qh.qc.view", JSON.stringify({ v: 1, group: x.group ?? "status", sort: x.sort ?? { key: "due", reversed: false }, density: "comfortable", view: x.view ?? "list" }));
      localStorage.setItem("sa.guide.queries", "1");
      localStorage.removeItem("sa.pinList.queries");
    } catch { /* private mode */ }
  }, o);
  await openRoute(page, "/queries", vp);
  if (o.hold) return;
  await page.locator(".qc138-sheet [data-qcv='row'], .qc138-sheet [data-qc142='card']").first().waitFor({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  await page.mouse.move(5, 5);
  if (o.full) { await page.keyboard.press("f"); await page.waitForTimeout(1200); }
}
async function openCl(page: Page, vp: VP, o: { view?: "cards" | "list"; group?: string; full?: boolean } = {}) {
  /* the list remembers its view per device: put the defaults back first, or a second open lands in the last one's view
     (openContacts16 clears the memory only on a tab's first load) */
  if (/^https?:/.test(page.url())) await page.evaluate(() => { try { localStorage.removeItem("qh.cl.view"); sessionStorage.removeItem("__cl16_cleared"); } catch { /* */ } });
  await openContacts16(page, vp);
  await page.evaluate((x) => { localStorage.setItem("qh.cl.view", JSON.stringify({ v: 1, group: x.group ?? "none", sort: "surname", reversed: false, pinned: !!x.full, view: x.view ?? "list" })); }, o);
  await page.reload();
  await page.locator(".clv-group:not([data-loading]) [data-clv='row'], .clv-group:not([data-loading]) [data-clv='card']").first().waitFor({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
}
const press = (page: Page, sel: string) => page.evaluate((s) => { const e = [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getBoundingClientRect().height > 0); e?.click(); return !!e; }, sel);
const textOf = (page: Page, sel: string) => page.evaluate((s) => [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getBoundingClientRect().height > 0)?.textContent?.trim() ?? null, sel);

/* ── L1 · three columns from a 1,100px list card ────────────────────────────────────────────────────────────────── */
test("CSS1-L1 columns", async ({ page }) => {
  test.setTimeout(420_000);
  const L = new Ledger("L1");
  for (const vp of SIZES) for (const full of [false, true]) {
    await openQc(page, vp, { view: "cards", full });
    const r = await page.evaluate(() => {
      const sheet = [...document.querySelectorAll<HTMLElement>(".qc138-sheet")].find((e) => e.getBoundingClientRect().height > 0);
      const grids = [...(sheet?.querySelectorAll<HTMLElement>(".qc142-grid") ?? [])];
      const cols = grids.map((g) => getComputedStyle(g).gridTemplateColumns.split(" ").filter(Boolean).length);
      /* the cards of the fullest grid's first row: those sharing its first card's top */
      const g = grids.sort((a, b) => b.children.length - a.children.length)[0];
      const kids = g ? [...g.children].map((c) => Math.round(c.getBoundingClientRect().top)) : [];
      return { sheetW: sheet?.offsetWidth ?? 0, cols: [...new Set(cols)], firstRow: kids.filter((t) => t === kids[0]).length, cards: kids.length };
    });
    const want = full || vp.width === 1512 ? 3 : 2;
    const at = `${vp.width} ${full ? "full screen" : "unpinned"}`;
    L.check(`${at} · population`, r.cards >= 3, JSON.stringify(r));
    L.check(`${at} · ${want} columns (list card ${r.sheetW}px)`, r.cols.length === 1 && r.cols[0] === want && r.firstRow === want, JSON.stringify(r));
  }
  L.done(8);
});

/* ── L2 · Export is always in the strip's header, and the file is what it says ────────────────────────────────────── */
const csvRows = (path: string) => readFileSync(path, "utf8").replace(/^﻿/, "").split(/\r?\n(?=(?:[^"]*"[^"]*")*[^"]*$)/).slice(1).filter((l) => l.trim() !== "").length;
test("CSS1-L2 export", async ({ page }) => {
  test.setTimeout(420_000);
  const L = new Ledger("L2");
  mkdirSync(`${DIR}/runs`, { recursive: true });
  for (const vp of SIZES) {
    const at = `${vp.width}`;
    await openQc(page, vp, { view: "list" });
    await mutate(page, "L2");
    await press(page, ".qcv-group[data-v138] [data-qc140='filters']");
    await page.waitForTimeout(800);
    const count = await textOf(page, "[data-qc142='filter-count']");
    const m = /^(\d+) of (\d+)/i.exec(count ?? "");
    L.check(`${at} · population: the strip's count`, !!m, `${count}`);
    const label = await textOf(page, "[data-qc1421='strip-export']");
    L.check(`${at} · unfiltered: "Export all {N} queries"`, !!m && label === `↓ Export all ${m[2]} queries`, `${label} · ${count}`);
    if (label) {
      const dl = page.waitForEvent("download", { timeout: 15_000 });
      await press(page, "[data-qc1421='strip-export']");
      const d = await dl; const p = `${DIR}/runs/L2-all-${vp.width}${MUT ? `-mut-${MUT}` : ""}.csv`; await d.saveAs(p);
      L.check(`${at} · unfiltered: the CSV has N rows`, !!m && csvRows(p) === Number(m[2]), `${csvRows(p)} vs ${m?.[2]}`);
    }
    await press(page, "[data-qc142='filter-strip'] [data-qc140='quick'][data-qp='you']");
    await page.waitForTimeout(900);
    const count2 = await textOf(page, "[data-qc142='filter-count']");
    const m2 = /^(\d+) of (\d+)/i.exec(count2 ?? "");
    const label2 = await textOf(page, "[data-qc1421='strip-export']");
    L.check(`${at} · filtered: "Export {v} queries", v the strip's own`, !!m2 && Number(m2[1]) < Number(m2[2]) && label2 === `↓ Export ${m2[1]} ${m2[1] === "1" ? "query" : "queries"}`, `${label2} · ${count2}`);
    if (label2) {
      const dl = page.waitForEvent("download", { timeout: 15_000 });
      await press(page, "[data-qc1421='strip-export']");
      const d = await dl; const p = `${DIR}/runs/L2-v-${vp.width}${MUT ? `-mut-${MUT}` : ""}.csv`; await d.saveAs(p);
      L.check(`${at} · filtered: the CSV has v rows`, !!m2 && csvRows(p) === Number(m2[1]), `${csvRows(p)} vs ${m2?.[1]}`);
    }
  }
  L.done(10);
});

/* ── L3 · the List group heading: no hairlines, and the Contact list's own background, padding and fonts ─────────── */
test("CSS1-L3 headings", async ({ page }) => {
  test.setTimeout(420_000);
  const L = new Ledger("L3");
  const read = (sel: string) => page.evaluate((s) => {
    const b = [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0);
    if (!b) return null;
    const c = getComputedStyle(b);
    const lab = b.querySelector<HTMLElement>(".qc138-gt, .cl19-gbl"); const n = b.querySelector<HTMLElement>(".qc138-gn, .cl19-gbn");
    const f = (e: HTMLElement | null) => { if (!e) return null; const k = getComputedStyle(e); return `${k.fontWeight} ${k.fontSize} ${k.fontFamily.split(",")[0].replace(/"/g, "")} ${k.letterSpacing} ${k.textTransform}`; };
    return { bg: c.backgroundColor, shadow: c.boxShadow, bt: c.borderTopWidth, bb: c.borderBottomWidth, pt: c.paddingTop, pb: c.paddingBottom, h: Math.round(b.getBoundingClientRect().height), label: f(lab), count: f(n) };
  }, sel);
  for (const vp of SIZES) {
    const at = `${vp.width}`;
    await openCl(page, vp, { group: "status" });
    const cl = await read(".clv-group .cl19-card .cl19-gb.cl20-lg");
    await openQc(page, vp, { view: "list" });
    await mutate(page, "L3");
    const qc = await read(".qc138-sheet [data-qc142='ledger']");
    L.check(`${at} · population`, cl && qc, `CL ${!!cl} · QC ${!!qc}`);
    if (!cl || !qc) continue;
    L.check(`${at} · no hairline (shadow, borders)`, qc.shadow === "none" && qc.bt === "0px" && qc.bb === "0px", `${qc.shadow} · ${qc.bt}/${qc.bb}`);
    L.check(`${at} · the background is the Contact list's`, qc.bg === cl.bg, `QC ${qc.bg} · CL ${cl.bg}`);
    L.check(`${at} · the vertical padding and height are the Contact list's`, qc.pt === cl.pt && qc.pb === cl.pb && qc.h === cl.h, `QC ${qc.pt}/${qc.pb} h${qc.h} · CL ${cl.pt}/${cl.pb} h${cl.h}`);
    L.check(`${at} · the name's font is the Contact list's`, qc.label === cl.label, `QC ${qc.label} · CL ${cl.label}`);
    L.check(`${at} · the count's font is the Contact list's`, qc.count === cl.count, `QC ${qc.count} · CL ${cl.count}`);
  }
  L.done(12);
});

/* ── L4 · j walks the cards, Enter opens the one it is on ─────────────────────────────────────────────────────────── */
test("CSS1-L4 keys", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("L4");
  for (const vp of SIZES) {
    const at = `${vp.width}`;
    await openQc(page, vp, { view: "cards" });
    await page.mouse.click(5, 300);
    const ring = () => page.evaluate(() => { const cs = [...document.querySelectorAll<HTMLElement>(".qc138-sheet [data-qc142='card']")]; const i = cs.findIndex((c) => c.classList.contains("kf")); return { i, id: i >= 0 ? cs[i].dataset.id : null, n: cs.length, second: cs[1]?.dataset.id ?? null }; });
    await page.keyboard.press("j"); await page.waitForTimeout(300);
    const r1 = await ring();
    L.check(`${at} · population`, r1.n > 2, `${r1.n} cards`);
    L.check(`${at} · j rings the first card`, r1.i === 0, JSON.stringify(r1));
    await page.keyboard.press("j"); await page.waitForTimeout(300);
    const r2 = await ring();
    L.check(`${at} · j again moves to the next`, r2.i === 1 && r2.id === r1.second, JSON.stringify(r2));
    await page.keyboard.press("Enter"); await page.waitForTimeout(1500);
    const q = new URL(page.url()).searchParams.get("q");
    L.check(`${at} · Enter opens that query`, !!r2.id && q === r2.id, `${q} vs ${r2.id}`);
  }
  L.done(8);
});

/* ── L5 · the loading placeholder follows the remembered view ─────────────────────────────────────────────────────── */
test("CSS1-L5 skeleton", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("L5");
  for (const vp of SIZES) for (const view of ["cards", "list"] as const) {
    await openQc(page, vp, { view, hold: 30_000 });
    await page.waitForTimeout(2500);
    const r = await page.evaluate(() => ({ cards: [...document.querySelectorAll("[data-qc142='sk-card']")].filter((e) => e.getBoundingClientRect().height > 0).length, rows: [...document.querySelectorAll("[data-qcv='sk-row']")].filter((e) => e.getBoundingClientRect().height > 0).length }));
    const at = `${vp.width} remembered ${view}`;
    L.check(`${at} · population: a placeholder shows`, r.cards + r.rows > 0, JSON.stringify(r));
    if (view === "cards") L.check(`${at} · card placeholders and no row placeholders`, r.cards >= 4 && r.rows === 0, JSON.stringify(r));
    else L.check(`${at} · row placeholders and no card placeholders`, r.rows > 0 && r.cards === 0, JSON.stringify(r));
  }
  L.done(8);
});

/* ── L6 · one sort: the chip and the headings are the same state, and both views draw the same order ─────────────── */
const QC_HEAD: Record<string, string | null> = { due: "Due", agent: "Agent", first: "First queried", stage: "Where it stands", sent: "What you sent", next: "Next move", changed: null };
const CL_HEAD: Record<string, string | null> = { surname: "Agent", added: "Date added", reply: "Replies", status: "Query status" };
async function chipPick(page: Page, ns: string, key: string, reversed: boolean) {
  await press(page, `[data-${ns}='sort']`); await page.waitForTimeout(400);
  await press(page, `[data-${ns}='sort-menu'] [data-sc='opt'][data-k='${key}']`); await page.waitForTimeout(400);
  await press(page, `[data-${ns}='sort-menu'] [data-sc='order-opt'][data-reversed='${reversed}']`); await page.waitForTimeout(400);
  await page.keyboard.press("Escape"); await page.waitForTimeout(400);
}
const activeHeading = (page: Page, root: string) => page.evaluate((r) => {
  const hs = [...document.querySelectorAll<HTMLElement>(`${r} [aria-sort]`)].filter((h) => h.getBoundingClientRect().height > 0 && h.getAttribute("aria-sort") !== "none" && h.closest(".lt-labels, .qc138-heads"));
  return hs.map((h) => ({ label: (h.textContent ?? "").replace(/[↑↓↕⇅]/g, "").trim(), sort: h.getAttribute("aria-sort") }));
}, root);
/** a column heading by its words (only the active heading carries aria-sort on the Contact list) */
const clickHeading = (page: Page, root: string, head: string) => page.evaluate(({ r, h }) => {
  const bs = [...document.querySelectorAll<HTMLElement>(`${r} .lt-labels button, ${r} [role='columnheader'] button`)].filter((x) => x.getBoundingClientRect().height > 0);
  const b = bs.find((x) => (x.textContent ?? "").replace(/[↑↓↕⇅]/g, "").trim() === h);
  b?.click();
  return !!b;
}, { r: root, h: head });
const chipState = (page: Page, ns: string) => page.evaluate((n) => {
  const c = [...document.querySelectorAll<HTMLElement>(`[data-${n}='sort']`)].find((e) => e.getBoundingClientRect().height > 0);
  return c ? { field: c.querySelector("[data-sc='field']")?.textContent ?? "", reversed: c.querySelector("[data-sc='dir']")?.getAttribute("data-reversed") } : null;
}, ns);
const order = (page: Page, sel: string, attr: string) => page.evaluate(({ s, a }) => [...document.querySelectorAll<HTMLElement>(s)].filter((e) => e.getBoundingClientRect().height > 0 && !e.closest("[data-qc139='practice']")).map((e) => e.getAttribute(a) ?? ""), { s: sel, a: attr });
test("CSS1-L6 one sort", async ({ page }) => {
  test.setTimeout(1_200_000);
  const L = new Ledger("L6");
  const vp = SIZES[1];
  const pages = [
    { name: "Query Centre", ns: "qc1421", heads: QC_HEAD, fields: ["due", "agent", "first", "stage", "sent", "next", "changed"],
      open: (view: "cards" | "list") => openQc(page, vp, { view }), pill: "[data-qc142='view-pill']", root: ".qc138-sheet",
      rows: ".qc138-sheet .qc138-row[data-qcv='row']", cards: ".qc138-sheet [data-qc142='card']", attr: "data-id",
      label: { due: "Due date", agent: "Agent", first: "First queried", stage: "Where it stands", sent: "What you sent", next: "Next move", changed: "Last changed" } as Record<string, string> },
    { name: "Contact list", ns: "cl21", heads: CL_HEAD, fields: ["surname", "added", "reply", "status"],
      open: (view: "cards" | "list") => openCl(page, vp, { view }), pill: "[data-cl20='view-pill']", root: ".clv-group",
      rows: ".clv-group [data-clv='row']", cards: ".clv-group [data-clv='card']", attr: "data-agent-card",
      label: { surname: "Surname", added: "Date added", reply: "Reply time", status: "Query status" } as Record<string, string> },
  ];
  for (const P of pages) {
    await P.open("cards");
    for (const k of P.fields) for (const rev of [false, true]) {
      const at = `${P.name} · chip ${k} ${rev ? "reversed" : "first"}`;
      await chipPick(page, P.ns, k, rev);
      const cardIds = await order(page, P.cards, P.attr);
      await press(page, `${P.pill} [data-view='list']`); await page.waitForTimeout(900);
      const act = await activeHeading(page, P.root);
      const rowIds = await order(page, P.rows, P.attr);
      L.check(`${at} · population`, cardIds.length > 3 && rowIds.length > 3, `cards ${cardIds.length} · rows ${rowIds.length}`);
      const want = P.heads[k];
      L.check(`${at} · the List heading`, want == null ? act.length === 0 : act.length === 1 && act[0].label === want && act[0].sort === (rev ? "descending" : "ascending"), JSON.stringify(act));
      L.check(`${at} · the same order in both views`, JSON.stringify(cardIds) === JSON.stringify(rowIds), `first cards ${cardIds.slice(0, 3)} · rows ${rowIds.slice(0, 3)}`);
      await press(page, `${P.pill} [data-view='cards']`); await page.waitForTimeout(900);
    }
    /* the reverse: a heading in List, then the chip in Cards */
    await press(page, `${P.pill} [data-view='list']`); await page.waitForTimeout(900);
    for (const k of P.fields.filter((x) => P.heads[x]).slice(0, 3)) {
      const head = P.heads[k]!;
      const clicks = await clickHeading(page, P.root, head);
      await page.waitForTimeout(700);
      const act = await activeHeading(page, P.root);
      await press(page, `${P.pill} [data-view='cards']`); await page.waitForTimeout(900);
      const chip = await chipState(page, P.ns);
      const rev = act[0]?.sort === "descending";
      L.check(`${P.name} · heading ${head} → the chip`, clicks && chip && chip.field === P.label[k] && chip.reversed === String(rev), `${JSON.stringify(act)} → ${JSON.stringify(chip)}`);
      await press(page, `${P.pill} [data-view='list']`); await page.waitForTimeout(900);
    }
  }
  L.done(60);
});

/* ── L7 · the chip shows only in Cards, immediately before Group by ──────────────────────────────────────────────── */
test("CSS1-L7 chip placement", async ({ page }) => {
  test.setTimeout(900_000);
  const L = new Ledger("L7");
  const probe = (chip: string, group: string) => page.evaluate(({ c, g }) => {
    const el = [...document.querySelectorAll<HTMLElement>(c)].find((x) => x.getBoundingClientRect().height > 0);
    const grp = [...document.querySelectorAll<HTMLElement>(g)].find((x) => x.getBoundingClientRect().height > 0);
    let next = el?.nextElementSibling as HTMLElement | null;
    while (next && next.getBoundingClientRect().width === 0) next = next.nextElementSibling as HTMLElement | null;
    return { chip: !!el, group: !!grp, nextIsGroup: !!el && next === grp, gap: el && grp ? Math.round(grp.getBoundingClientRect().left - el.getBoundingClientRect().right) : null };
  }, { c: chip, g: group });
  for (const vp of SIZES) for (const full of [false, true]) {
    const at = `${vp.width} ${full ? "full screen" : "unpinned"}`;
    await openQc(page, vp, { view: "cards", full });
    const qc = await probe("[data-qc1421='sort-chip']", "[data-qc140='group-chip']");
    L.check(`Query Centre ${at} · Cards: the chip, then Group by`, qc.chip && qc.group && qc.nextIsGroup, JSON.stringify(qc));
    await openQc(page, vp, { view: "list", full });
    const qcl = await probe("[data-qc1421='sort-chip']", "[data-qc140='group-chip']");
    L.check(`Query Centre ${at} · List: no chip (Group by present)`, !qcl.chip && qcl.group, JSON.stringify(qcl));
    await openCl(page, vp, { view: "cards", full });
    const cl = await probe("[data-cl21='sort']", "[data-cl19='group-chip']");
    L.check(`Contact list ${at} · Cards: the chip, then Group by`, cl.chip && cl.group && cl.nextIsGroup, JSON.stringify(cl));
    await openCl(page, vp, { view: "list", full });
    const cll = await probe("[data-cl21='sort']", "[data-cl19='group-chip']");
    L.check(`Contact list ${at} · List: no chip (Group by present)`, !cll.chip && cll.group, JSON.stringify(cll));
  }
  L.done(16);
});

/* ── L8 · the Contact list's jump row follows the sort ───────────────────────────────────────────────────────────── */
test("CSS1-L8 jump row", async ({ page }) => {
  test.setTimeout(600_000);
  const L = new Ledger("L8");
  const row = () => page.evaluate(() => {
    const nav = [...document.querySelectorAll<HTMLElement>("[data-cl19='az'], [data-cl19='jump']")].find((e) => e.getBoundingClientRect().height > 0);
    const letters = [...document.querySelectorAll<HTMLElement>("[data-cl19='letter']")].filter((e) => e.getBoundingClientRect().height > 0).length;
    const jumps = [...document.querySelectorAll<HTMLElement>("[data-cl19='jump-group']")].filter((e) => e.getBoundingClientRect().height > 0).map((b) => (b.querySelector(".cl19-jl")?.textContent ?? "").trim());
    return { nav: nav?.getAttribute("data-cl19"), mode: nav?.getAttribute("data-mode") ?? null, letters, jumps };
  });
  const MONTH = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)( ’\d\d)?$/;
  for (const vp of SIZES) for (const view of ["cards", "list"] as const) {
    const at = `${vp.width} ${view}`;
    await openCl(page, vp, { view });
    const a = await row();
    L.check(`${at} · population: Surname shows letters`, a.nav === "az" && a.letters > 10, JSON.stringify(a));
    if (view === "cards") await chipPick(page, "cl21", "added", false);
    else { await clickHeading(page, ".clv-group", "Date added"); await page.waitForTimeout(800); }
    const b = await row();
    L.check(`${at} · Date added shows months`, b.mode === "month" && b.letters === 0 && b.jumps.length > 0 && b.jumps.every((j) => MONTH.test(j)), JSON.stringify(b));
    if (view === "cards") await chipPick(page, "cl21", "surname", false);
    else { await clickHeading(page, ".clv-group", "Agent"); await page.waitForTimeout(800); }
    const c = await row();
    L.check(`${at} · back to Surname shows letters`, c.nav === "az" && c.letters > 10, JSON.stringify(c));
  }
  L.done(12);
});

/* ── L9 · the recessed well ─────────────────────────────────────────────────────────────────────────────────────── */
test("CSS1-L9 well", async ({ page }) => {
  test.setTimeout(600_000);
  const L = new Ledger("L9");
  const WHITE = "rgb(255, 255, 255)";
  const read = (sel: string) => page.evaluate((s) => {
    const f = [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0);
    if (!f) return null;
    const i = f.querySelector("input")!;
    return { bg: getComputedStyle(f).backgroundColor, ph: getComputedStyle(i, "::placeholder").color };
  }, sel);
  const P = [
    { name: "Query Centre", sel: ".qc138-sheet [data-qc140='find']", open: (vp: VP, full: boolean) => openQc(page, vp, { view: "list", full }) },
    { name: "Contact list", sel: ".clv-group [data-cl19='find']", open: (vp: VP, full: boolean) => openCl(page, vp, { full }) },
  ];
  for (const p of P) for (const vp of SIZES) {
    const at = `${p.name} ${vp.width}`;
    await p.open(vp, false);
    await mutate(page, "L9");
    const r = await read(p.sel);
    L.check(`${at} · population`, !!r, JSON.stringify(r));
    L.check(`${at} · at rest: not white`, r && r.bg !== WHITE && r.bg !== "rgba(0, 0, 0, 0)", `${r?.bg}`);
    L.check(`${at} · at rest: the placeholder is cream`, r && /^rgba\(244, 238, 229, 0\.6\d*\)$/.test(r.ph), `${r?.ph}`);
    await page.evaluate((s) => [...document.querySelectorAll<HTMLElement>(`${s} input`)].find((e) => e.getBoundingClientRect().height > 0 || e.closest("label")!.getBoundingClientRect().height > 0)?.focus(), p.sel);
    await page.waitForTimeout(400);
    const f = await read(p.sel);
    L.check(`${at} · focused: white`, f?.bg === WHITE, `${f?.bg}`);
    await p.open(vp, true);
    await mutate(page, "L9");
    const z = await read(p.sel);
    L.check(`${at} · full screen at rest: white`, z?.bg === WHITE, `${z?.bg}`);
  }
  L.done(20);
});
