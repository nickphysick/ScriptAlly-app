/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v140.1 — the QC1401 locks on the rendered Query Centre, at 1512 × 900 and 1280 × 800.
 *
 * A1 export set · A2 states · B1 wording. (C1 is not written: Part C found two query documents, not one drawn twice,
 * so no code changed — see reports/qc-v1401/REPORT.md.)
 *
 * Page-side breaks through `QC1401_MUTATE=<lock>`; the source breaks are listed in the report.
 * ⚠️ EVERY WORKSPACE PAGE STAYS MOUNTED: each query starts from the Query Centre's visible group.
 * ⚠️ THE GUIDE IS MARKED SEEN (its first-visit open covers the list) and put back after; B1 sets its own.
 * ⚠️ A1 READS THE DOWNLOADED FILE, NOT THE BUTTON: the CSV's Query ID and Agent columns, in file order, against the rows
 *    the list draws, in DOM order. The CSV is parsed field by field (a note can hold a quoted newline).
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { openRoute } from "./measure";

const DIR = "reports/qc-v1401";
const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
const MUT = process.env.QC1401_MUTATE ?? "";

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(lock: string, where: string, ok: unknown, detail: string) { this.rows.push({ lock, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${MUT ? `mut-${MUT}-` : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.lock} · ${r.where} — ${r.detail}`)).toEqual([]);
  }
}

const flags = (a: string) => execSync(`node tests/e2e/guideFlags.mjs --page queries ${a}`, { encoding: "utf8" }).trim().split("\n").pop()!;
let original = "null";
test.beforeAll(() => { original = flags(""); });
test.afterAll(() => { flags(`--restore '${original}'`); });

const ALL = { seen: true, done: { log: true, find: true, open: true, pin: true, resp: true, birds: true } };
const MUTATIONS: Record<string, { js?: string }> = {
  /* A2: leave the button enabled at 0 (the page's own disabled attribute, taken away while the menu is open) */
  A2: { js: `setInterval(() => document.querySelectorAll("[data-qc140='filter-export']").forEach((b) => b.removeAttribute("disabled")), 50)` },
};

async function open(page: Page, vp: { width: number; height: number }, lock: string, guide: unknown = ALL) {
  flags(`--restore '${JSON.stringify(guide)}'`);
  await page.addInitScript(() => {
    try { sessionStorage.removeItem("qh.qc.filters"); localStorage.removeItem("qh.qc.view"); localStorage.setItem("sa.guide.queries", "1"); localStorage.removeItem("sa.pinList.queries"); } catch { /* */ }
  });
  await openRoute(page, "/queries", vp);
  await page.locator(".qc138-sheet [data-qcv='row']").first().waitFor({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  await page.mouse.move(5, 5);
  const m = MUT === lock ? MUTATIONS[lock] : null;
  if (m?.js) await page.evaluate(m.js);
}
const G = ".qcv-group[data-v138]";
const press = (page: Page, sel: string) => page.evaluate((s) => { const e = [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getBoundingClientRect().height > 0); e?.click(); return !!e; }, sel);
const text = (page: Page, sel: string) => page.evaluate((s) => [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getBoundingClientRect().height > 0)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
async function openMenu(page: Page) {
  if (!(await page.locator("[data-qc140='filter-menu']").count())) await press(page, `${G} [data-qc140='filters']`);
  await page.waitForTimeout(600);
}
/* the rows the list draws, in DOM order: the visible group's rows, never the practice row */
const listRows = (page: Page) => page.evaluate(() => {
  const g = [...document.querySelectorAll<HTMLElement>(".qcv-group[data-v138]")].find((e) => e.getBoundingClientRect().width > 0)!;
  return [...g.querySelectorAll<HTMLElement>(".qc138-sheet [data-qcv='row']")].filter((r) => !r.closest("[data-qc139='practice']"))
    .map((r) => ({ id: (r.id || r.closest<HTMLElement>("[id^='query-row-']")?.id || "").replace(/^query-row-/, ""), name: r.querySelector<HTMLElement>("[data-qcv='row-name']")?.textContent?.trim() ?? "" }));
});
/* RFC 4180, field by field: quoted fields may hold commas, doubled quotes and newlines */
function parseCsv(s: string): string[][] {
  const out: string[][] = []; let row: string[] = []; let f = ""; let q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === '"') { if (s[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; continue; }
    if (c === '"') q = true; else if (c === ",") { row.push(f); f = ""; } else if (c === "\n") { row.push(f); out.push(row); row = []; f = ""; } else if (c !== "\r") f += c;
  }
  if (f !== "" || row.length) { row.push(f); out.push(row); }
  return out;
}

test.describe("Query Centre v140.1", () => {
  test("A1 · export set: Queried + Waiting — the label's {v} is Show's {v}; the CSV has exactly those rows, in the list's order", async ({ page }) => {
    test.setTimeout(400_000);
    const L = new Ledger("A1");
    for (const vp of SIZES) {
      await open(page, vp, "A1");
      await openMenu(page);
      await press(page, "[data-qc140='stand'][data-k='q']"); await page.waitForTimeout(300);
      await press(page, "[data-qc140='quick'][data-qp='wait']"); await page.waitForTimeout(700);
      /* v142 §E, v142.1 A2 — re-pointed: the export is the strip header's button (right of the count; the applied row's
         copy runs the same handler), and the strip has no Show button; {v} is the strip's own "{v} of {N} showing" */
      const label = await text(page, "[data-qc140='filter-export']");
      const show = await text(page, "[data-qc142='filter-count']");
      const v = show?.match(/^(\d+) of/i)?.[1] ?? null;
      L.check("A1", `${vp.width} the label reads "Export {v} queries"`, !!v && new RegExp(`^↓ Export ${v} quer(y|ies)$`).test(label ?? ""), `${label} · ${show}`);
      L.check("A1", `${vp.width} a narrowed set (fewer than all)`, !!v && Number(v) > 0 && !/all/.test(label ?? ""), `${v}`);
      const dl = page.waitForEvent("download", { timeout: 15_000 });
      await press(page, "[data-qc140='filter-export']");
      const d = await dl;
      const path = `${DIR}/runs/A1-${vp.width}${MUT ? `-mut-${MUT}` : ""}.csv`;
      mkdirSync(`${DIR}/runs`, { recursive: true });
      await d.saveAs(path);
      L.check("A1", `${vp.width} today's file name`, /^QueryHawk_Filtered_Queries_\d{4}-\d{2}-\d{2}\.csv$/.test(d.suggestedFilename()), d.suggestedFilename());
      /* today's exporter opens with a byte-order mark (for Excel); it is not part of the first heading */
      const csv = parseCsv(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
      const head = csv[0] ?? [];
      const data = csv.slice(1).filter((r) => r.some((c) => c !== ""));
      L.check("A1", `${vp.width} today's columns`, head[0] === "Agent" && head[head.length - 1] === "Query ID" && head.length === 16, JSON.stringify(head));
      L.check("A1", `${vp.width} exactly {v} data rows`, data.length === Number(v), `${data.length} vs ${v}`);
      await press(page, "[data-qc140='filter-close']"); await page.waitForTimeout(600);
      const rows = await listRows(page);
      const idCol = head.indexOf("Query ID");
      L.check("A1", `${vp.width} the list shows {v} rows`, rows.length === Number(v), `${rows.length} vs ${v}`);
      L.check("A1", `${vp.width} the CSV's query ids are the list's, in order`, JSON.stringify(data.map((r) => r[idCol])) === JSON.stringify(rows.map((r) => r.id)), `${data.slice(0, 4).map((r) => r[idCol]).join(",")} vs ${rows.slice(0, 4).map((r) => r.id).join(",")}`);
      /* the exporter writes an agent no longer on file as an empty cell, where the list draws "Agent not recorded";
         the export's format is today's, unchanged, so the two are the same reading */
      const named = (n: string) => (n === "Agent not recorded" ? "" : n);
      const at = data.findIndex((r, i) => r[0] !== named(rows[i]?.name ?? "\u0000"));
      L.check("A1", `${vp.width} the CSV's agent names are the list's, in order`, at === -1 && data.length === rows.length, at === -1 ? "" : `first difference at ${at}: "${data[at]?.[0]}" vs "${rows[at]?.name}"`);
    }
    L.done(14);
  });

  test("A2 · states: no filters → 'Export all {N} queries'; a search matching nothing → disabled", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("A2");
    for (const vp of SIZES) {
      await open(page, vp, "A2");
      await openMenu(page);
      /* v142.1 A2 — RESTORED: the strip's header always carries the export, so with nothing narrowing the list it reads
         "Export all {N} queries" ({N} from the strip's own "{v} of {N} showing") */
      const label = await text(page, "[data-qc140='filter-export']");
      const show = await text(page, "[data-qc142='filter-count']");
      const n = show?.match(/^\d+ of (\d+)/i)?.[1];
      L.check("A2", `${vp.width} no filters: "Export all {N} queries"`, !!n && label === `↓ Export all ${n} queries`, `${label} · ${show}`);
      await press(page, "[data-qc140='filter-close']"); await page.waitForTimeout(400);
      await page.locator(`${G} [data-qc140='find'] input`).first().fill("zzqqxx-nothing-matches");
      await page.waitForTimeout(800);
      await openMenu(page);
      await page.waitForTimeout(300);
      const st = await page.evaluate(() => {
        const b = [...document.querySelectorAll<HTMLButtonElement>("[data-qc140='filter-export']")].find((x) => x.getBoundingClientRect().height > 0);
        return b ? { disabled: b.disabled, label: b.innerText.trim(), color: getComputedStyle(b).color } : null;
      });
      L.check("A2", `${vp.width} a search matching nothing: disabled`, st?.disabled === true, JSON.stringify(st));
      L.check("A2", `${vp.width} at 35% ink`, /rgba\(28, 19, 15, 0\.35\)/.test(st?.color ?? ""), `${st?.color}`);
      L.check("A2", `${vp.width} it says 0`, /^↓ Export 0 queries$/.test(st?.label ?? ""), `${st?.label}`);
      await press(page, "[data-qc140='filter-close']");
      await page.locator(`${G} [data-qc140='find'] input`).first().fill("");
    }
    L.done(8);
  });

  /* one test per size: a fresh page each, so no Firestore cache or init script carries over from the other size */
  for (const vp of SIZES) test(`B1 · wording at ${vp.width}: the Pin step says 'pin button' and 'F', never 'Pin list'`, async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger(`B1-${vp.width}`);
    {
      /* the first load can read an all-done guide from Firestore's local cache and write \`finished\`, which hides the pill
         for the rest of that page's life (as v139's shots found): put the five-of-six state back after it, and reload once */
      const FIVE = { seen: true, done: { log: true, find: true, open: true, resp: true, birds: true } };
      await open(page, vp, "B1", FIVE);
      const pillUp = () => page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-pck='pill']")].some((e) => e.getBoundingClientRect().height > 0));
      for (let i = 0; i < 3 && !(await pillUp()); i++) {
        flags(`--restore '${JSON.stringify(FIVE)}'`);
        await page.reload();
        await page.locator(".qc138-sheet [data-qcv='row']").first().waitFor({ timeout: 30_000 });
        await page.waitForTimeout(2000);
      }
      if (!(await pillUp())) console.log("B1 pill down; stored guide:", flags(""));
      L.check("B1", `${vp.width} the guide's pill is up (five of six done)`, await pillUp(), "");
      /* open the checklist and the Pin step, retried: the popover can be mid-transition when first pressed */
      let opened = false;
      for (let i = 0; i < 4 && !opened; i++) {
        const popVisible = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-pck='popover']")].some((e) => e.getBoundingClientRect().height > 0));
        if (!popVisible) { await press(page, "[data-pck='pill']"); await page.waitForTimeout(700); }
        await page.locator("[data-pck='popover'] [data-pck='item'][data-k='pin'] button").first().click({ timeout: 4000 }).catch(() => {});
        opened = await page.waitForFunction(() => { const c = document.querySelector<HTMLElement>("[data-pck='spot'] [data-pck='card']"); return !!c && getComputedStyle(c).visibility !== "hidden" && /Go full screen/.test(c.innerText); }, null, { timeout: 4000 }).then(() => true).catch(() => false);
      }
      L.check("B1", `${vp.width} the Pin step opened from the checklist`, opened, "");
      await page.waitForFunction(() => { const c = document.querySelector<HTMLElement>("[data-pck='spot'] [data-pck='card']"); return !!c && getComputedStyle(c).visibility !== "hidden"; }, null, { timeout: 8000 }).catch(() => {});
      const card = await page.evaluate(() => {
        const c = document.querySelector<HTMLElement>("[data-pck='spot'] [data-pck='card']");
        return c ? { text: c.innerText.replace(/\s+/g, " "), bold: [...c.querySelectorAll("b")].map((b) => b.textContent), kbd: [...c.querySelectorAll("kbd")].map((k) => k.textContent) } : null;
      });
      const t = card?.text ?? "";
      /* v142 §A — re-pointed: the step is "Go full screen", in the Contact list v20's words (plain text, as its own is):
         it names the Full screen button and F */
      L.check("B1", `${vp.width} "Full screen" named`, /Press Full screen\b/.test(t), t.slice(0, 120));
      L.check("B1", `${vp.width} "F" named in the text`, /\bor F\b/.test(t), JSON.stringify(card?.bold));
      L.check("B1", `${vp.width} never "Pin list"`, !/Pin list/.test(t), t.slice(0, 120));
      L.check("B1", `${vp.width} the F key cap is still on the card`, (card?.kbd ?? []).includes("F"), JSON.stringify(card?.kbd));
      await page.mouse.click(5, 400); await page.waitForTimeout(300);
    }
    L.done(6);
  });
});
