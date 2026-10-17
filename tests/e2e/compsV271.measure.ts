/**
 * Comparable titles v27.1 — every ✕ is centred: lock X1, measured on the rendered page at 1512 × 900 and 1280 × 800,
 * on the fixture `seedCompsV25.mjs` writes. W1 and W2 retired with comps v28 (the v25 list).
 *
 * MUTATIONS. X1 is an edit to the source and needs a rebuilt bundle: `v271Mutations.sh` makes it, rebuilds, runs
 * the lock and puts the file back from a copy.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { SIZES, type Vp, openComps, scrollTo, seed } from "./cv25Lib";

const DIR = "reports/comps-v27-1";
const MUT = process.env.V271_MUTATE ?? "";
const near = (a: number, b: number, t = 1) => Math.abs(a - b) <= t;

const MUTATIONS: Record<string, { css?: string; js?: string; what: string }> = {};
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

test.describe("Comparable titles v27.1", () => {
  test.beforeAll(() => { seed("--empty"); });
  /* W1 (the library in the column) and W2 (the list's row grid) RETIRED with comps v28: the list they measured is retired
     (tests/e2e/RETIRED-comps-v28.md). X1 stays, its openers re-pointed at the v28 page. */

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
      ["the comp drawer", '[data-hdr="comp"] button[aria-label="Close"]', async () => { await scrollTo(page, '[data-cx="shelf"]', 24); await page.locator(`${P}[data-cx="card"]`).first().click(); await page.waitForSelector('[data-hdr="comp"].is-in'); }, async () => { await page.keyboard.press("Escape"); }],
      ["the add drawer", '[data-hdr="comp"] button[aria-label="Close"]', async () => { await scrollTo(page, '[data-cv="page"]', 0).catch(() => {}); await page.evaluate(() => { ((window as any).__cv().closest(".wpg-scroll") as HTMLElement).scrollTop = 0; }); await page.locator(`${P}[data-cx="add"]`).click(); await page.waitForSelector('[data-hdr="comp"].is-in'); }, async () => { await page.keyboard.press("Escape"); }],
      ["the picker", '[data-cv="picker"] button[aria-label="Close"]', async () => { await scrollTo(page, '[data-cx="shelf"]', 24); await page.locator(`${P}[data-cx="card"][aria-label="Nine Miles Out"] [data-cx="slip-pick"]`).click(); await page.waitForSelector('[data-cv="picker"]'); }, async () => { await page.keyboard.press("Escape"); }],
      ["the Scout drawer", '[data-hdr="scout"] button[aria-label="Close"]', async () => { await page.locator('[data-ftab="scout"]').click(); await page.waitForSelector('[data-hdr="scout"].is-in'); }, async () => { await page.keyboard.press("Escape"); }],
      ["the pop-up", '[data-cv="how-pop"] button[aria-label="Close"]', async () => { await page.evaluate(() => { ((window as any).__cv().closest(".wpg-scroll") as HTMLElement).scrollTop = 0; }); await page.locator(`${P}[data-cx="how-link"]`).click(); await page.waitForSelector('[data-cv="how-pop"]'); }, async () => { await page.keyboard.press("Escape"); }],
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
  expect([...Object.keys(MUTATIONS), ...SOURCE_MUTATIONS].sort()).toEqual(["X1"]);
});
