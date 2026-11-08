/**
 * Query Centre v153.3 — the rendered page against design-refs/query-centre-v153-3.html (ref: 19px badge, 13px glyph,
 * 5px over the top and right of a 34px node; a 34px tab centred on the seal).
 *
 *   B1  the arrow badge: a 19px disc, a 13px glyph centred, overhanging the current node 5px right and 5px up; nothing
 *       inside it reaches past its edge.
 * Screens to reports/qc-v153-3/.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

test.setTimeout(600_000);
export const DIR = "reports/qc-v153-3";
export const PAGE = ".qc151.qc153";
const SIZES = [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }];

export class Ledger {
  rows: { name: string; ok: boolean; got: string }[] = [];
  constructor(public id: string) {}
  check(name: string, ok: boolean, got: string) { this.rows.push({ name, ok, got }); console.log(`${ok ? "✓" : "✗"} ${name} — ${got}`); }
  done(min: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${this.id}.json`, JSON.stringify(this.rows, null, 1));
    expect(this.rows.length, "assertions run").toBeGreaterThanOrEqual(min);
    expect(this.rows.filter((r) => !r.ok).map((r) => r.name)).toEqual([]);
  }
}

export async function ready(page: Page) {
  await page.waitForSelector(`${PAGE} [data-qc153="bar"]`, { timeout: 60_000 });
  const b = page.locator(`${PAGE} [data-qc153="bar"] button[data-v="list"]`);
  if ((await b.getAttribute("aria-pressed")) !== "true") await b.click();
  await expect(page.locator(`${PAGE} [data-qc153="slip"]`).first()).toBeVisible({ timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready);
}

export async function openQc(page: Page, vp: { width: number; height: number }) {
  await page.addInitScript(() => { try { localStorage.setItem("sa.guide.queries", "1"); localStorage.setItem("sa.guide.queries-explainer", "1"); } catch { /* private */ } });
  await openRoute(page, "/queries", vp);
  await ready(page);
  await page.waitForTimeout(600);
  await page.mouse.move(2, 2);
}

for (const vp of SIZES) {
  test(`v153.3 B1 arrow badge · ${vp.width}`, async ({ page }) => {
    mkdirSync(DIR, { recursive: true });
    const L = new Ledger(`B1-${vp.width}`);
    await openQc(page, vp);
    const b = await page.evaluate((sel) => {
      const r = (e: Element | null) => { if (!e) return null; const x = e.getBoundingClientRect(); return { x: x.x, y: x.y, w: x.width, h: x.height, r: x.right, b: x.bottom }; };
      return [...document.querySelectorAll<HTMLElement>(`${sel} [data-qc153='arrow']`)].filter((a) => a.getBoundingClientRect().width > 0).map((a) => {
        const cs = getComputedStyle(a);
        const p = a.querySelector("path");
        return { dir: a.dataset.dir, badge: r(a), glyph: r(a.querySelector("svg")), path: r(p), node: r(a.parentElement), bg: cs.backgroundColor, shadow: cs.boxShadow, sw: p?.getAttribute("stroke-width") ?? a.querySelector("svg")?.getAttribute("stroke-width") };
      });
    }, PAGE);
    L.check("population: badges on screen", b.length > 3, `${b.length}`);
    const dirs = new Set(b.map((x) => x.dir));
    L.check("both an in and an out badge measured", dirs.has("in") && dirs.has("out"), [...dirs].join(","));
    for (const x of b.slice(0, 12)) {
      const tag = `${x.dir}@${Math.round(x.badge!.y)}`;
      L.check(`${tag} disc 19px`, Math.abs(x.badge!.w - 19) < 0.5 && Math.abs(x.badge!.h - 19) < 0.5, `${x.badge!.w}×${x.badge!.h}`);
      L.check(`${tag} glyph 13px`, Math.abs(x.glyph!.w - 13) < 0.5 && Math.abs(x.glyph!.h - 13) < 0.5, `${x.glyph!.w}×${x.glyph!.h}`);
      const cx = x.glyph!.x + x.glyph!.w / 2 - (x.badge!.x + x.badge!.w / 2), cy = x.glyph!.y + x.glyph!.h / 2 - (x.badge!.y + x.badge!.h / 2);
      L.check(`${tag} glyph centred`, Math.abs(cx) < 0.6 && Math.abs(cy) < 0.6, `${cx.toFixed(2)}, ${cy.toFixed(2)}`);
      L.check(`${tag} overhangs 5 right, 5 up`, Math.abs(x.badge!.r - x.node!.r - 5) < 0.6 && Math.abs(x.node!.y - x.badge!.y - 5) < 0.6, `right +${(x.badge!.r - x.node!.r).toFixed(2)} · up ${(x.node!.y - x.badge!.y).toFixed(2)}`);
      L.check(`${tag} the glyph's ink stays inside the disc`, x.path!.x >= x.badge!.x && x.path!.y >= x.badge!.y && x.path!.r <= x.badge!.r && x.path!.b <= x.badge!.b, JSON.stringify({ path: x.path, badge: x.badge }));
      L.check(`${tag} stroke 2`, x.sw === "2", String(x.sw));
      L.check(`${tag} soft shadow`, x.shadow.includes("rgba(28, 19, 15, 0.25) 0px 1px 3px"), x.shadow);
      if (x.dir === "in") L.check(`${tag} navy disc`, x.bg === "rgb(42, 58, 82)", x.bg);
    }
    writeFileSync(`${DIR}/badges-${vp.width}.json`, JSON.stringify(b, null, 1));
    L.done(20);
  });
}

/* the badge at 4× zoom, for the report */
test.describe("v153.3 badge zoom", () => {
  test.use({ deviceScaleFactor: 4 });
  for (const vp of SIZES) test(`v153.3 B1 badge at 4× · ${vp.width}`, async ({ page }) => {
    await openQc(page, vp);
    const a = page.locator(`${PAGE} [data-qc153='arrow'][data-dir='in']`).first();
    await a.scrollIntoViewIfNeeded();
    const n = (await a.locator("xpath=..").boundingBox())!;
    await page.screenshot({ path: `${DIR}/badge-4x-${vp.width}.png`, clip: { x: n.x - 14, y: n.y - 14, width: 64, height: 64 } });
  });
});
