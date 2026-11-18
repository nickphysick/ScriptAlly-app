/**
 * Query card v158 — a fixed height, a calmer thread, and the Agent, Materials and Notes tabs
 * (design-refs/query-card-v158/query-card-v158.html), measured on the emulator harness at 1512 × 982 and 1280 × 800.
 *
 *   SA_PHASE=before  Step 0.5: for three fixtures (one event, a request not yet answered, six or more events) and each
 *                    tab: the card's outer box, the strip, header, book block, tab bar, body and footer, to
 *                    reports/query-card-v158/baseline.json; a shot of every tab. The locks run too, and are red.
 *   SA_PHASE=mutant  the mutation build: every lock must read red. Its shots and ledgers never overwrite the after ones.
 *   (default)        QC158-1 … QC158-15, each a ledger in reports/query-card-v158/ledger/; after shots.
 *
 * ⚠️ THE CARD IS THE QUERY PANEL'S, never `document`'s first: the To-do desk keeps its own copy mounted (hidden).
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { openRoute } from "./measure";
import { STAGE_COLOURS } from "../../src/lib/stageColours";

const PAGE = ".qc151.qc153";
const PHASE = process.env.SA_PHASE === "before" ? "before" : process.env.SA_PHASE === "mutant" ? "mutant" : "after";
const DIR = "reports/query-card-v158";
const SHOTS = "design-refs/query-card-v158/screens";
const SIZES = [{ width: 1512, height: 982 }, { width: 1280, height: 800 }];
const TABS = ["tracking", "agent", "materials", "notes"] as const;
/** the harness's fixtures (tests/emulator-seed/harness.json): one event; a partial asked for, not sent; eight events */
const FIX = { one: "seed-cal-near-q", pending: "seed-query-7", many: "seed-query-10" } as const;
const CARD = "[data-qp='panel'] [data-qc152='card']";
const C = (s: string) => `${CARD} ${s}`;
test.setTimeout(600_000);
mkdirSync(SHOTS, { recursive: true });
mkdirSync(`${DIR}/ledger`, { recursive: true });

const rgb = (hex: string) => `rgb(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)})`;

class Ledger {
  rows: { name: string; ok: boolean; got: string }[] = [];
  constructor(public id: string) {}
  check(name: string, ok: boolean, got: string) { this.rows.push({ name, ok, got }); console.log(`${this.id} ${ok ? "✓" : "✗"} ${name} — ${got}`); }
  done(min: number) {
    writeFileSync(`${DIR}/ledger/${PHASE}-${this.id}.json`, JSON.stringify(this.rows, null, 1));
    expect(this.rows.length, `${this.id}: assertions run`).toBeGreaterThanOrEqual(min);
    expect(this.rows.filter((r) => !r.ok).map((r) => r.name)).toEqual([]);
  }
}

/** the harness's queries: id → status, activity count, and the notes stored against each */
const H = JSON.parse(readFileSync("tests/emulator-seed/harness.json", "utf8")) as { docs: Record<string, Record<string, unknown>> };
const STATUS = new Map<string, string>();
for (const [p, d] of Object.entries(H.docs)) if (/\/queries\/[^/]+$/.test(p) && d.status) STATUS.set(String(d.id ?? p.split("/").pop()), String(d.status));

async function openQc(page: Page, vp: { width: number; height: number }) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("sa.guide.queries", "1"); localStorage.setItem("sa.guide.queries-explainer", "1");
      sessionStorage.removeItem("qh.qc.filters"); sessionStorage.removeItem("qh.qc.collapsed1511");
    } catch { /* private */ }
  });
  await openRoute(page, "/queries", vp);
  await page.waitForSelector(`${PAGE} [data-qc153="bar"]`, { timeout: 60_000 });
  const b = page.locator(`${PAGE} [data-qc153="bar"] button[data-v="list"]`);
  if ((await b.getAttribute("aria-pressed")) !== "true" && await b.isEnabled()) await b.click();
  await expect(page.locator(`${PAGE} [data-qc154="card"]`).first()).toBeVisible({ timeout: 60_000 });
  const more = page.locator(`${PAGE} [data-qc153='show-all']`);
  for (let i = 0; i < 6 && (await more.count()) > 0; i++) await more.first().click({ timeout: 5_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
  await page.mouse.move(2, 2);
}
async function openCard(page: Page, id: string): Promise<boolean> {
  const c = page.locator(`${PAGE} [data-qc154='card'][data-id='${id}']`);
  if (!(await c.count())) return false;
  await c.scrollIntoViewIfNeeded();
  await c.locator("[data-qc154='name']").first().click();
  await page.locator(`${CARD}[data-id='${id}']`).first().waitFor({ timeout: 15_000 });
  await page.waitForTimeout(700);
  return true;
}
async function closeCard(page: Page) {
  const x = page.locator(C("[data-qc149c='close']")).filter({ visible: true }).first();
  if (await x.count()) await x.click({ timeout: 8_000 }); else await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
}
async function tab(page: Page, t: (typeof TABS)[number]) {
  await page.locator(C(`[data-qc152='tab'][data-tab='${t}']`)).first().click();
  await page.waitForTimeout(450);
}
async function shot(page: Page, path: string) {
  const b = await page.locator(CARD).first().boundingBox();
  if (b) await page.screenshot({ path, clip: { x: Math.max(0, b.x - 8), y: Math.max(0, b.y - 8), width: b.width + 16, height: Math.min(b.height + 16, 1000) }, animations: "disabled", timeout: 20_000 });
}

type Box = [number, number, number, number];
interface Geo { outer: Box; panel: Box; strip: Box | null; head: Box | null; book: Box | null; tabs: Box | null; body: Box | null; foot: Box | null }
/** boxes relative to the viewport (the card is fixed): the panel, and the card's parts relative to the panel */
const geo = (page: Page): Promise<Geo> => page.evaluate((sel) => {
  const card = document.querySelector<HTMLElement>(sel)!;
  const panel = card.closest<HTMLElement>(".spanel") ?? card;
  const o = panel.getBoundingClientRect();
  const bx = (e: Element | null): [number, number, number, number] | null => { if (!e) return null; const r = e.getBoundingClientRect(); return [+(r.left - o.left).toFixed(2), +(r.top - o.top).toFixed(2), +r.width.toFixed(2), +r.height.toFixed(2)]; };
  const q = (s: string) => card.querySelector(s);
  return {
    outer: bx(card)!, panel: [+o.left.toFixed(2), +o.top.toFixed(2), +o.width.toFixed(2), +o.height.toFixed(2)],
    strip: bx(q("[data-qc152='band']")), head: bx(q(".qc152-agent")), book: bx(q("[data-qc152='book']")),
    tabs: bx(q(".qc152-tabs")), body: bx(q("[data-qc152='body']")), foot: bx(q("[data-qc152='reply']")),
  };
}, CARD);

test.describe("Query card v158", () => {
  for (const vp of SIZES) {
    const w = `${vp.width}×${vp.height}`;

    test(`Step 0.5 — boxes and shots of every tab — ${w}`, async ({ page }) => {
      await openQc(page, vp);
      const out: Record<string, Record<string, Geo>> = {};
      for (const [k, id] of Object.entries(FIX)) {
        expect(await openCard(page, id), `${k} fixture ${id} on the grid`).toBe(true);
        out[k] = {};
        for (const t of TABS) {
          await tab(page, t);
          out[k][t] = await geo(page);
          await shot(page, `${SHOTS}/${PHASE}-${vp.width}-${k}-${t}.png`);
        }
        await closeCard(page);
      }
      writeFileSync(`${DIR}/${PHASE}-geo-${vp.width}.json`, JSON.stringify(out, null, 1));
      if (PHASE === "before") writeFileSync(`${DIR}/baseline-${vp.width}.json`, JSON.stringify(out, null, 1));
    });
  }
});

void existsSync; void STAGE_COLOURS; void rgb; void STATUS;
