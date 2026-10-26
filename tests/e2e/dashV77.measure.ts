/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v77 — the DB77 locks, measured on the rendered page (ref design-refs/dashboard-v77/).
 *
 * A1 the chart's row on a tall window · A2 the task card never changes height as it cycles · A3 the
 * columns' bottoms line up and the founding card fills the rest · A4 the width cap · (A5 is the DB71
 * suite, run at the laptop sizes) · C1–C6 the founding writer card · D1 "us", not "Nick".
 *
 * Every lock states its population first: a probe that finds nothing is a red, never a pass.
 * `DB77_MUTATE=<name>` applies a lock's named break in the page.
 *
 * ⚠️ NO REGEX INSIDE `page.evaluate`: strings come back to Node and are matched here.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

const DIR = "reports/dashboard-v77";
type VP = { width: number; height: number };
const tag = (v: VP) => `${v.width}x${v.height}`;
const MUT = process.env.DB77_MUTATE ?? "";

type Row = { lock: string; where: string; ok: boolean; detail: string };
export class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(lock: string, where: string, ok: boolean, detail: string) { this.rows.push({ lock, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${this.name}${MUT ? `.mut-${MUT}` : ""}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.lock} · ${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/** The in-page breaks. Each is the lock's own named mutation. */
const CSS_MUTATIONS: Record<string, string> = {
  "A1-fill": `.d58[data-mode="q"] .d58-left { grid-template-rows: minmax(140px, 1fr) auto !important; }`,
  "A3-fw-fixed": `.d71-fwslot > [data-d58="panel"] { flex: none !important; height: 194px !important; }`,
  "A4-uncapped": `.d58 .d58-page { max-width: none !important; }`,
};

export async function openDash(page: Page, vp: VP, flags: Record<string, unknown> = {}, ms = "seed-ms-1") {
  await page.addInitScript(([f, m]) => {
    Object.assign(window, f);
    try { localStorage.setItem("scriptally_active_manuscript_id", m as string); } catch { /* private mode */ }
  }, [flags, ms] as const);
  await openRoute(page, "/dashboard", vp);
  await page.locator('[data-d58="page"][data-loading="0"]').first().waitFor({ timeout: 25_000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  if (CSS_MUTATIONS[MUT]) await page.addStyleTag({ content: CSS_MUTATIONS[MUT] });
  await page.mouse.move(2, 2);
  await page.waitForTimeout(700);
}

const box = (page: Page, sel: string) => page.evaluate((s) => {
  const e = [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getBoundingClientRect().height > 0);
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height };
}, sel);

const TALL: VP[] = [{ width: 1920, height: 1080 }, { width: 2560, height: 1440 }, { width: 1680, height: 1050 }];

/* ── A1 — the chart's row on a tall window ────────────────────────────────────────────────────── */

test("DB77 A1 — the chart's row is clamp(300, 31% of the body, 540)", async ({ page }) => {
  const L = new Ledger("a1");
  for (const vp of TALL) {
    await openDash(page, vp);
    const r = await page.evaluate(() => {
      const body = document.querySelector<HTMLElement>('[data-d58="body"]');
      const chart = document.querySelector<HTMLElement>('[data-d58="active"]');
      if (!body || !chart) return null;
      const cs = getComputedStyle(body);
      const bodyW = body.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
      return { bodyW, chartH: chart.getBoundingClientRect().height };
    });
    const w = tag(vp);
    L.check("A1", `${w} population: the body and the chart`, !!r && r.bodyW > 0 && r.chartH > 0, JSON.stringify(r));
    if (!r) continue;
    const want = Math.min(540, Math.max(300, 0.31 * r.bodyW));
    L.check("A1", `${w} chart height = clamp(300, 0.31 × ${r.bodyW.toFixed(1)}, 540) = ${want.toFixed(1)} (±2)`, Math.abs(r.chartH - want) <= 2, `chart ${r.chartH.toFixed(1)}`);
  }
  L.done(6);
});

/* ── A2 — the task card never changes height as it cycles ─────────────────────────────────────── */

test("DB77 A2 — the task card is one height for every item", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("a2");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const vp = { width: 1920, height: 1080 };
  await openDash(page, vp);
  const read = () => page.evaluate(() => {
    const c = document.querySelector<HTMLElement>('[data-d71="task"][data-loading="0"]');
    return c ? { h: c.getBoundingClientRect().height, kind: c.dataset.kind ?? "", index: Number(c.dataset.index ?? -1), pos: c.querySelector('[data-d71="pos-text"]')?.textContent ?? "1 OF 1" } : null;
  });
  const first = await read();
  const n = first ? Number(first.pos.split(" OF ")[1] ?? 1) : 0;
  L.check("A2", "population: the task card holds more than one item", !!first && n > 1, JSON.stringify(first));
  const hs: number[] = [];
  const kinds = new Set<string>();
  for (let i = 0; i < n; i++) {
    const r = await read();
    if (r) { hs.push(r.h); kinds.add(r.kind); }
    await page.locator('[data-d71="next"]').click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(80);
  }
  L.check("A2", "every item of one full cycle was read", hs.length === n, `${hs.length} of ${n}`);
  L.check("A2", "at least two kinds were visited", kinds.size >= 2, [...kinds].join(","));
  const spread = hs.length ? Math.max(...hs) - Math.min(...hs) : Infinity;
  L.check("A2", "the card's height is identical (±1) across the cycle", spread <= 1, `${Math.min(...hs).toFixed(1)}–${Math.max(...hs).toFixed(1)} (spread ${spread.toFixed(1)})`);
  L.done(4);
});

/* ── A3 · A4 — the bottoms line up, the founding card fills the rest, the width cap ──────────── */

test("DB77 A3 · A4 — bottoms in line, founding card ≥194, the content capped", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("a3a4");
  for (const vp of [{ width: 1920, height: 1080 }, { width: 2560, height: 1440 }]) {
    await openDash(page, vp);
    const left = await box(page, '[data-d60="hoops"]');
    const fw = await box(page, '[data-d58="panel"]');
    const body = await box(page, '[data-d58="body"]');
    const head = await box(page, '[data-d58="header"]');
    const tab = await box(page, '[data-d58="tab"]');
    const w = tag(vp);
    L.check("A3", `${w} population: the hoops, the founding card, the body`, !!left && !!fw && !!body && !!head, JSON.stringify({ left: !!left, fw: !!fw, body: !!body }));
    if (left && fw) {
      L.check("A3", `${w} the left and right columns end together (±1)`, Math.abs(left.b - fw.b) <= 1, `hoops ${left.b.toFixed(1)} · founding ${fw.b.toFixed(1)}`);
      L.check("A3", `${w} the founding card is at least 194px`, fw.h >= 193.5, `${fw.h.toFixed(1)}`);
    }
    const cap = vp.width >= 2200 ? 1680 : 1440;
    if (body && head) L.check("A4", `${w} the body and the header are ≤ ${cap}px wide`, body.w <= cap + 0.5 && head.w <= cap + 0.5, `body ${body.w.toFixed(1)} · header ${head.w.toFixed(1)}`);
    L.check("A5", `${w} the Activity feed tab is on screen`, !!tab && tab.l >= 0 && tab.r <= vp.width && tab.b <= vp.height + 0.5 && tab.t >= 0, JSON.stringify(tab));
  }
  L.done(10);
});
