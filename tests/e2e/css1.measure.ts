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
import { openCl as openClBook } from "./nb1Lib";

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
const press = (page: Page, sel: string) => page.evaluate((s) => { const e = [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getBoundingClientRect().height > 0); e?.click(); return !!e; }, sel);
const textOf = (page: Page, sel: string) => page.evaluate((s) => [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getBoundingClientRect().height > 0)?.textContent?.trim() ?? null, sel);

/* ── L1 · three columns from a 1,100px list card ────────────────────────────────────────────────────────────────── */
/* RETIRED (v149, QC149 L13): it counted the Cards view's grid columns; the page is list-only (Part B). */
test.skip("CSS1-L1 columns", async ({ page }) => {
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

/* ── L3 · RETIRED (navy-bar-address-book v1): it held the Query Centre's List heading to the Contact list's cream ledger.
   Both are gone — the Query Centre's headings are "C · Ruled" in both views (NB1-L4) and the Contact list's list body is
   the address book (NB1-L5, NB1-L9). ── */

/* ── L4 · j walks the cards, Enter opens the one it is on ─────────────────────────────────────────────────────────── */
test("CSS1-L4 keys", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("L4");
  for (const vp of SIZES) {
    const at = `${vp.width}`;
    /* v149 (QC149 L13) — RE-POINTED: the Cards view is gone; the same keys ring the list's rows (the `kf` ring) */
    await openQc(page, vp);
    await page.mouse.click(5, 300);
    const ring = () => page.evaluate(() => { const cs = [...document.querySelectorAll<HTMLElement>(".qc138-sheet [data-qcv='row']")].filter((c) => c.getBoundingClientRect().height > 0 && !c.closest("[data-qc139='practice']")); const i = cs.findIndex((c) => c.classList.contains("kf")); return { i, id: i >= 0 ? cs[i].dataset.id : null, n: cs.length, second: cs[1]?.dataset.id ?? null }; });
    await page.keyboard.press("j"); await page.waitForTimeout(300);
    const r1 = await ring();
    L.check(`${at} · population`, r1.n > 2, `${r1.n} rows`);
    L.check(`${at} · j rings the first row`, r1.i === 0, JSON.stringify(r1));
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
  /* v149 (QC149 L13) — RE-POINTED: list-only, so the remembered view is always the list; the Cards half is retired */
  for (const vp of SIZES) for (const view of ["list"] as const) {
    await openQc(page, vp, { view, hold: 30_000 });
    await page.waitForTimeout(2500);
    const r = await page.evaluate(() => ({ cards: [...document.querySelectorAll("[data-qc142='sk-card']")].filter((e) => e.getBoundingClientRect().height > 0).length, rows: [...document.querySelectorAll("[data-qcv='sk-row']")].filter((e) => e.getBoundingClientRect().height > 0).length }));
    const at = `${vp.width} remembered ${view}`;
    L.check(`${at} · population: a placeholder shows`, r.cards + r.rows > 0, JSON.stringify(r));
    L.check(`${at} · row placeholders and no card placeholders`, r.rows > 0 && r.cards === 0, JSON.stringify(r));
  }
  L.done(4);
});

async function chipPick(page: Page, ns: string, key: string, reversed: boolean) {
  await press(page, `[data-${ns}='sort']`); await page.waitForTimeout(400);
  await press(page, `[data-${ns}='sort-menu'] [data-sc='opt'][data-k='${key}']`); await page.waitForTimeout(400);
  await press(page, `[data-${ns}='sort-menu'] [data-sc='order-opt'][data-reversed='${reversed}']`); await page.waitForTimeout(400);
  await page.keyboard.press("Escape"); await page.waitForTimeout(400);
}
const order = (page: Page, sel: string, attr: string) => page.evaluate(({ s, a }) => [...document.querySelectorAll<HTMLElement>(s)].filter((e) => e.getBoundingClientRect().height > 0 && !e.closest("[data-qc139='practice']")).map((e) => e.getAttribute(a) ?? ""), { s: sel, a: attr });

/* ── L6 · one sort: the chip is the page's one sort state, and both views draw the same order ──────────────────────
   RE-POINTED (navy-bar-address-book v1): the Query Centre's headings are plain labels now (A1), so the half that read the
   active heading and pressed headings is retired; the Contact list's Cards and List are the address book (its sorts and
   sections are NB1-L9). What survives: a chip pick in Cards orders the List the same way. */
/* RETIRED (v149, QC149 L13): "both views draw the same order" needs two views; the page is list-only. The chip's
   place is CSS1-L7's and its sort is the list's own. */
test.skip("CSS1-L6 one sort", async ({ page }) => {
  test.setTimeout(1_200_000);
  const L = new Ledger("L6");
  const vp = SIZES[1];
  const P = { ns: "qc1421", fields: ["due", "agent", "first", "stage", "sent", "next", "changed"],
    open: (view: "cards" | "list") => openQc(page, vp, { view }), pill: "[data-qc144='view-bar']",
    rows: ".qc138-sheet .qc138-row[data-qcv='row']", cards: ".qc138-sheet [data-qc142='card']", attr: "data-id" };
  await P.open("cards");
  for (const k of P.fields) for (const rev of [false, true]) {
    const at = `Query Centre · chip ${k} ${rev ? "reversed" : "first"}`;
    await chipPick(page, P.ns, k, rev);
    const cardIds = await order(page, P.cards, P.attr);
    await press(page, `${P.pill} [data-view='list']`); await page.waitForTimeout(900);
    const rowIds = await order(page, P.rows, P.attr);
    L.check(`${at} · population`, cardIds.length > 3 && rowIds.length > 3, `cards ${cardIds.length} · rows ${rowIds.length}`);
    L.check(`${at} · the same order in both views`, JSON.stringify(cardIds) === JSON.stringify(rowIds), `first cards ${cardIds.slice(0, 3)} · rows ${rowIds.slice(0, 3)}`);
    await press(page, `${P.pill} [data-view='cards']`); await page.waitForTimeout(900);
  }
  L.done(28);
});

/* ── L7 · the chip's place ────────────────────────────────────────────────────────────────────────────────────────
   RE-POINTED (navy-bar-address-book v1 A1): Sort is in BOTH views now, the last of Filters · Group by · Sort (it was Cards
   only, before Group by). The Contact list's half is retired with its toolbar (the book's Sort is NB1-L9's). */
test("CSS1-L7 chip placement", async ({ page }) => {
  test.setTimeout(900_000);
  const L = new Ledger("L7");
  const probe = () => page.evaluate(() => {
    const vis = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getBoundingClientRect().height > 0) ?? null;
    const el = vis("[data-qc1421='sort-chip']"), grp = vis("[data-qc140='group-chip']");
    let prev = el?.previousElementSibling as HTMLElement | null;
    while (prev && prev.getBoundingClientRect().width === 0) prev = prev.previousElementSibling as HTMLElement | null;
    return { chip: !!el, group: !!grp, afterGroup: !!el && prev === grp, gap: el && grp ? Math.round(el.getBoundingClientRect().left - grp.getBoundingClientRect().right) : null };
  });
  for (const vp of SIZES) for (const full of [false, true]) for (const view of ["cards", "list"] as const) {
    const at = `${vp.width} ${full ? "full screen" : "unpinned"} ${view}`;
    await openQc(page, vp, { view, full });
    const r = await probe();
    L.check(`Query Centre ${at} · Group by, then the chip`, r.chip && r.group && r.afterGroup, JSON.stringify(r));
  }
  L.done(8);
});

/* ── L8 · RETIRED (navy-bar-address-book v1 B1): the Contact list's jump row went with its toolbar. The address book's
   sections follow the sort instead (letters, months, reply bands, statuses) — NB1-L9. ── */

/* ── L9 · the recessed well ───────────────────────────────────────────────────────────────────────────────────────
   RE-POINTED (navy-bar-address-book v1): the Query Centre's unpinned Find is the white pill above the list (NB1-L2), so
   only its full-screen field is read here (white). The Contact list's Find is the address book's, on the navy column in
   both modes: a well at rest, white when focused. */
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
  for (const vp of SIZES) {
    await openQc(page, vp, { view: "list", full: true });
    await mutate(page, "L9");
    const z = await read(".qc138-sheet [data-qc140='find']");
    L.check(`Query Centre ${vp.width} · full screen at rest: white`, z?.bg === WHITE, `${z?.bg}`);
    await openClBook(page, vp);
    await mutate(page, "L9");
    const r = await read("[data-nb1='book'] [data-nb1='find']");
    const at = `Contact list ${vp.width}`;
    L.check(`${at} · population`, !!r, JSON.stringify(r));
    L.check(`${at} · at rest: not white`, r && r.bg !== WHITE && r.bg !== "rgba(0, 0, 0, 0)", `${r?.bg}`);
    L.check(`${at} · at rest: the placeholder is cream`, r && /^rgba\(244, 238, 229, 0\.6\d*\)$/.test(r.ph), `${r?.ph}`);
    await page.evaluate(() => [...document.querySelectorAll<HTMLInputElement>("[data-nb1='book'] [data-nb1='find'] input")][0]?.focus());
    await page.waitForTimeout(400);
    const f = await read("[data-nb1='book'] [data-nb1='find']");
    L.check(`${at} · focused: white`, f?.bg === WHITE, `${f?.bg}`);
  }
  L.done(10);
});
