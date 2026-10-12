/**
 * Comparable titles v27.1 — the library sits in the page column, and every ✕ is centred: locks W1, W2
 * and X1, measured on the rendered page at 1512 × 900 and 1280 × 800 (W2 also at 1024 and 1920), on
 * the fixture `seedCompsV25.mjs` writes.
 *
 *   W1 column · W2 grid · X1 centred
 *
 * MUTATIONS. `V271_MUTATE=<lock>` applies that lock's named break. W1 and W2 are applied in the page.
 * X1 is an edit to the source and needs a rebuilt bundle: `v271Mutations.sh` makes it, rebuilds, runs
 * the lock and puts the file back from a copy.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { SIZES, type Vp, openComps, scrollTo, seed } from "./cv25Lib";

const DIR = "reports/comps-v27-1";
const MUT = process.env.V271_MUTATE ?? "";
const near = (a: number, b: number, t = 1) => Math.abs(a - b) <= t;

const MUTATIONS: Record<string, { css?: string; js?: string; what: string }> = {
  W1: { what: "restore the break-out in normal view", css: `.cv-page:not(.is-full) .cv-lib { --cv-w: min(1600px, calc(var(--hsheet-w) - 48px)) !important; width: var(--cv-w) !important; max-width: none !important; margin-left: calc(50% - var(--cv-w) / 2) !important; }` },
  W2: { what: "keep the wide grid in the column", css: `.cv-page:not(.is-full) .cv-list { --cv-cols: minmax(0, 1fr) minmax(0, 1fr) 284px 284px !important; }` },
};
const SOURCE_MUTATIONS = ["X1"];

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ lock: this.name, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${MUT ? `mut-${MUT}-` : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    if (!MUT && !process.env.V271_REDFIRST) expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.lock} · ${r.where} — ${r.detail}`)).toEqual([]);
  }
}
async function open(page: Page, vp: Vp, lock: string) {
  await openComps(page, vp);
  if (MUT !== lock) return;
  const m = MUTATIONS[lock];
  if (m?.css) await page.addStyleTag({ content: m.css });
  if (m?.js) await page.evaluate(m.js);
  await page.waitForTimeout(200);
}

const P = '[data-cv="page"] ';
const boxes = (page: Page) => page.evaluate(() => {
  const w = window as any; const b = (s: string) => w.__box(w.__q(s));
  const row = w.__q('[data-cv="row"]') as HTMLElement | null;
  const bar = w.__q('[data-cv="bar"]') as HTMLElement;
  return {
    head: b('[data-cv="lib-head"]'), list: b('[data-cv="list"]'), panel: b('[data-cv="panel"]'), strip: b('[data-gst="comps"]'), sheet: w.__box(document.querySelector(".ws-window")),
    full: w.__cv().dataset.full, cols: row ? getComputedStyle(row).gridTemplateColumns.split(" ").map((x: string) => parseFloat(x)) : [],
    bar: w.__box(bar), sw: bar.scrollWidth, cw: bar.clientWidth, doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    kids: ([...bar.children] as HTMLElement[]).filter((k) => k.getBoundingClientRect().width > 0 && !k.classList.contains("cv-sp")).map((k) => w.__box(k)),
  };
});
const fullOn = async (page: Page) => { await page.locator(`${P}[data-cv="full-btn"]`).click(); await page.waitForTimeout(900); };
const fullOff = async (page: Page) => { await page.keyboard.press("Escape"); await page.waitForTimeout(900); };

test.describe.configure({ mode: "serial" });
test.beforeAll(() => { mkdirSync(DIR, { recursive: true }); seed("--empty"); });
test.afterAll(() => { if (!process.env.CV25_KEEP) seed("--restore"); });

test.describe("Comparable titles v27.1", () => {
  test("W1 · column: in normal view the library's edges are the panel's and the strip's; full screen spans the sheet less 12", async ({ page }) => {
    const L = new Ledger("W1");
    for (const vp of SIZES) {
      const w = `${vp.width}`;
      await open(page, vp, "W1");
      await scrollTo(page, '[data-cv="lib-head"]', 120);
      const a = await boxes(page);
      L.check(`${w} normal: the list's edges are the panel's`, near(a.list.x, a.panel.x) && near(a.list.r, a.panel.r), `list ${a.list.x.toFixed(1)}–${a.list.r.toFixed(1)} · panel ${a.panel.x.toFixed(1)}–${a.panel.r.toFixed(1)}`);
      L.check(`${w} normal: and the strip's`, near(a.list.x, a.strip.x) && near(a.list.r, a.strip.r), `list ${a.list.x.toFixed(1)}–${a.list.r.toFixed(1)} · strip ${a.strip.x.toFixed(1)}–${a.strip.r.toFixed(1)}`);
      L.check(`${w} normal: the heading's edges are the list's`, near(a.head.x, a.list.x) && near(a.head.r, a.list.r), `heading ${a.head.x.toFixed(1)}–${a.head.r.toFixed(1)} · list ${a.list.x.toFixed(1)}–${a.list.r.toFixed(1)}`);
      L.check(`${w} normal: the heading is 16 above the list`, near(a.list.y - a.head.b, 16), `${(a.list.y - a.head.b).toFixed(1)}`);
      await fullOn(page);
      const b = await boxes(page);
      L.check(`${w} full screen: it is on`, b.full === "true", `data-full ${b.full}`);
      L.check(`${w} full screen: the list is the sheet less 12 each side`, near(b.list.x - b.sheet.x, 12, 1.5) && near(b.sheet.r - b.list.r, 12, 1.5), `left ${(b.list.x - b.sheet.x).toFixed(1)} · right ${(b.sheet.r - b.list.r).toFixed(1)}`);
      L.check(`${w} full screen: the heading's edges are the list's`, near(b.head.x, b.list.x) && near(b.head.r, b.list.r), `heading ${b.head.x.toFixed(1)}–${b.head.r.toFixed(1)} · list ${b.list.x.toFixed(1)}–${b.list.r.toFixed(1)}`);
      await fullOff(page);
      const c = await boxes(page);
      L.check(`${w} back in the column after full screen`, near(c.list.x, c.panel.x) && near(c.list.r, c.panel.r), `list ${c.list.x.toFixed(1)}–${c.list.r.toFixed(1)} · panel ${c.panel.x.toFixed(1)}–${c.panel.r.toFixed(1)}`);
    }
    L.done(16);
  });

  test("W2 · grid: the compact row grid in the column; the bar one row with no overflow at 1024, 1280 and 1512", async ({ page }) => {
    const L = new Ledger("W2");
    const compact = (c: number[]) => c.length === 4 && near(c[2], 220) && near(c[3], 200) && near(c[0] / c[1], 1.2, 0.02);
    const wide = (c: number[]) => c.length === 4 && near(c[2], 284) && near(c[3], 284) && near(c[0], c[1], 1.5);
    for (const vp of [{ width: 1024, height: 768 }, ...SIZES, { width: 1920, height: 1080 }]) {
      const w = `${vp.width}`;
      await open(page, vp, "W2");
      const a = await boxes(page);
      /* 1024 leaves the list under 900px, where v25's narrow rule gives the row its own four tracks */
      if (vp.width >= 1280) L.check(`${w} normal: rows use the compact grid`, compact(a.cols), `${a.cols.map((x) => x.toFixed(0)).join(" ")} at a list ${a.list.w.toFixed(0)} wide`);
      if (vp.width <= 1512) {
        L.check(`${w} the bar is one row`, a.bar.h <= 64, `bar ${a.bar.h} tall`);
        L.check(`${w} the bar does not overflow`, a.sw <= a.cw && a.kids.every((k) => k.r <= a.bar.r + 0.5) && a.doc <= 0, `scroll ${a.sw} / ${a.cw} · furthest right ${Math.max(...a.kids.map((k) => k.r)).toFixed(1)} of ${a.bar.r.toFixed(1)}`);
        const sorted = [...a.kids].sort((x, y) => x.x - y.x);
        const clash = sorted.slice(1).filter((k, i) => k.x < sorted[i].r - 0.5).length;
        L.check(`${w} no two controls in the bar overlap`, clash === 0, `${clash} overlap(s)`);
      }
      if (vp.width >= 1512) {
        await fullOn(page);
        const b = await boxes(page);
        const sheetWide = b.sheet.w >= 1440;
        L.check(`${w} full screen: the wide grid only from 1440 of sheet`, sheetWide ? wide(b.cols) : compact(b.cols), `${b.cols.map((x) => x.toFixed(0)).join(" ")} at a sheet ${b.sheet.w.toFixed(0)} wide`);
        await fullOff(page);
      }
    }
    L.done(14);
  });

  test("X1 · centred: each of the five close buttons holds an SVG ✕ at its centre, and is named \"Close\"", async ({ page }) => {
    const L = new Ledger("X1");
    /* the button and its glyph: an svg's own box, or the ink of a text character */
    const read = (sel: string) => page.evaluate((s) => {
      const b = document.querySelector(s) as HTMLElement | null; if (!b) return null;
      const r = b.getBoundingClientRect(); const svg = b.querySelector("svg");
      let g: DOMRect | null = svg ? svg.getBoundingClientRect() : null;
      if (!g) { const range = document.createRange(); range.selectNodeContents(b); g = range.getBoundingClientRect(); }
      return { w: r.width, h: r.height, dx: g.left + g.width / 2 - (r.left + r.width / 2), dy: g.top + g.height / 2 - (r.top + r.height / 2), gw: g.width, gh: g.height, svg: !!svg, text: (b.textContent ?? "").trim(), name: b.getAttribute("aria-label"), stroke: svg ? getComputedStyle(svg).strokeWidth : "", pad: getComputedStyle(b).padding };
    }, sel);
    const settle = () => page.waitForTimeout(700);
    const BUTTONS: [string, string, () => Promise<void>, () => Promise<void>][] = [
      ["the comp drawer", '[data-hdr="comp"] button[aria-label="Close"]', async () => { await scrollTo(page, '[data-cv="lib-head"]', 24); await page.locator(`${P}[data-cv="row"]`).first().click(); await page.waitForSelector('[data-hdr="comp"].is-in'); }, async () => { await page.keyboard.press("Escape"); }],
      ["the add drawer", '[data-hdr="comp"] button[aria-label="Close"]', async () => { await scrollTo(page, '[data-cv="page"]', 0).catch(() => {}); await page.evaluate(() => { ((window as any).__cv().closest(".wpg-scroll") as HTMLElement).scrollTop = 0; }); await page.locator(`${P}[data-cv="add"]`).click(); await page.waitForSelector('[data-hdr="comp"].is-in'); }, async () => { await page.keyboard.press("Escape"); }],
      ["the picker", '[data-cv="picker"] button[aria-label="Close"]', async () => { await scrollTo(page, '[data-cv="lib-head"]', 24); const row = page.locator(`${P}[data-cv="row"]`).nth(2); await row.hover(); await row.locator('[data-cv="tray-act"]').click(); await page.waitForSelector('[data-cv="picker"]'); }, async () => { await page.keyboard.press("Escape"); }],
      ["the Scout drawer", '[data-hdr="scout"] button[aria-label="Close"]', async () => { await page.locator('[data-ftab="scout"]').click(); await page.waitForSelector('[data-hdr="scout"].is-in'); }, async () => { await page.keyboard.press("Escape"); }],
      ["the pop-up", '[data-cv="how-pop"] button[aria-label="Close"]', async () => { await page.evaluate(() => { ((window as any).__cv().closest(".wpg-scroll") as HTMLElement).scrollTop = 0; }); await page.locator(`${P}[data-cv="how-link"]`).click(); await page.waitForSelector('[data-cv="how-pop"]'); }, async () => { await page.keyboard.press("Escape"); }],
    ];
    for (const vp of SIZES) {
      await openComps(page, vp);
      for (const [name, sel, openIt, closeIt] of BUTTONS) {
        const w = `${vp.width} ${name}:`;
        await openIt(); await settle();
        const r = await read(sel);
        L.check(`${w} there is one, named "Close"`, !!r && r.name === "Close" && (await page.locator(sel).count()) === 1, r ? `"${r.name}" · ${await page.locator(sel).count()} button(s)` : "no button");
        if (r) {
          const want = near(r.w, 36, 0.5) ? 14 : 12;
          L.check(`${w} the glyph is an SVG, ${want} × ${want} in ${Math.round(r.w)}`, r.svg && r.text === "" && near(r.gw, want, 0.5) && near(r.gh, want, 0.5) && (near(r.w, 34, 0.5) || near(r.w, 36, 0.5)) && near(r.w, r.h, 0.5), `svg ${r.svg} · text "${r.text}" · glyph ${r.gw.toFixed(1)} × ${r.gh.toFixed(1)} · button ${r.w.toFixed(1)} × ${r.h.toFixed(1)}`);
          L.check(`${w} its centre is the button's (±0.5)`, Math.abs(r.dx) <= 0.5 && Math.abs(r.dy) <= 0.5, `off by ${r.dx.toFixed(2)} across, ${r.dy.toFixed(2)} down`);
        }
        await closeIt(); await settle();
      }
    }
    L.done(30);
  });
});

test("V27.1 · every lock has a named mutation", () => {
  expect([...Object.keys(MUTATIONS), ...SOURCE_MUTATIONS].sort()).toEqual(["W1", "W2", "X1"]);
});
