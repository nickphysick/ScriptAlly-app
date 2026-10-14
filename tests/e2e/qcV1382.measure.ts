/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v138.2 (design-refs/query-centre-v138-2/query-centre-v138-2.html) — the QC138.2 locks, on the rendered
 * page at 1512 × 900 and 1280 × 800 with the shell.
 *
 * B1 grid · C1 summary · D1 motion. (A1 tint retired by v138.3: QC138.3 D1.)
 *
 * Each was run with its named mutation before its green was believed: `QC1382_MUTATE=<lock>` applies the in-page
 * mutation below (C1's is a script that re-wires the link's click to bubble).
 */
import { test, expect, type Page, type Locator } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute, liftMotionSuppression } from "./measure";

const DIR = "reports/qc-v138-2";
const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
type VP = { width: number; height: number };
const MUT = process.env.QC1382_MUTATE ?? "";
const near = (a: unknown, b: number, t: number) => typeof a === "number" && Number.isFinite(a) && Math.abs(a - b) <= t;

const MUTATIONS: Record<string, { css?: string; js?: string }> = {
  B1: { css: `.qc138-sheet .qc138-tlw { padding-left: 24px !important; }` },
  /* the link's own click stops propagation; this re-dispatches a plain click on the row after it, as a bubbling link would */
  C1: { js: `document.addEventListener("click", (e) => { const a = e.target && e.target.closest && e.target.closest('[data-qcv="peek-link"]'); if (a) { const row = a.closest('[data-qcv="row"]'); setTimeout(() => row && row.click(), 0); } }, true)` },
  D1: { css: `.qc138-sheet .qc138-drw .qc138-card, .qc138-sheet .qc138-drw .qc138-today { animation-delay: 0s !important; }` },
};

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
async function mutate(page: Page, lock: string) {
  const m = MUT === lock ? MUTATIONS[lock] : null;
  if (!m) return;
  if (m.css) await page.addStyleTag({ content: m.css });
  if (m.js) await page.evaluate(m.js);
  await page.waitForTimeout(120);
}
async function openQC(page: Page, vp: VP, lock: string) {
  /* Closed unfolded, so a closed row can be hovered */
  await page.addInitScript(() => { try { for (const k of ["contacts", "queries", "manuscripts"]) localStorage.setItem(`sa.guide.${k}`, "1"); sessionStorage.setItem("sa.qc138.folded", "[]"); } catch { /* */ } });
  await openRoute(page, "/queries", vp);
  await expect(page.locator('.qcv-group[data-v138] [data-qcv="row"]').first()).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(600);
  await mutate(page, lock);
}

/** a visible row of a tone, from the row's own data (due before today = overdue) */
async function rowOf(page: Page, tone: "over" | "wait" | "closed" | "nodate"): Promise<Locator> {
  const id = await page.evaluate((tn) => {
    const t0 = new Date(); t0.setHours(0, 0, 0, 0);
    const rows = [...document.querySelectorAll<HTMLElement>('.qcv-group[data-v138] [data-qcv="row"]')].filter((r) => r.getBoundingClientRect().height > 0);
    const hit = rows.find((r) => {
      if (tn === "closed") return r.dataset.court === "closed";
      if (r.dataset.court === "closed") return false;
      if (tn === "nodate") return r.dataset.due == null;
      if (r.dataset.due == null) return false;
      const d = new Date(Number(r.dataset.due)); d.setHours(0, 0, 0, 0);
      /* waiting: the agent's court, not yet due (your move not yet due takes the same tint, but is not the case shown) */
      return tn === "over" ? d.getTime() < t0.getTime() : d.getTime() >= t0.getTime() && r.dataset.court === "agent";
    });
    return hit?.dataset.qid ?? null;
  }, tone);
  expect(id, `a ${tone} row on the page`).not.toBeNull();
  return page.locator(`.qcv-group[data-v138] [data-qcv="row"][data-qid="${id}"]`);
}
async function hoverRow(page: Page, row: Locator) {
  await row.scrollIntoViewIfNeeded();
  await page.mouse.move(2, 2);
  await page.waitForTimeout(150);
  const b = (await row.boundingBox())!;
  await page.mouse.move(b.x + 300, b.y + 18);
}
const bg = (row: Locator) => row.evaluate((el) => getComputedStyle(el).backgroundColor);

test.describe("Query Centre v138.2", () => {
  /* A1 · tint — RETIRED by v138.3: the open row is an outline and a faint wash now, and QC138.3 D1 holds it
     (tests/e2e/qcV1383.measure.ts). Recoverable from 80fb8366. */

  test("B1 · grid: summary under the name, the timeline from First queried to Due, a rule (solid since v138.3)", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("B1");
    for (const vp of SIZES) {
      await openQC(page, vp, "B1");
      for (const tone of ["over", "wait"] as const) {
        const row = await rowOf(page, tone);
        await hoverRow(page, row);
        await expect(row.locator('[data-qcv="peek-chain"]')).toBeVisible({ timeout: 5000 });
        await page.waitForTimeout(500);
        const r = await row.evaluate((el) => {
          const sheet = el.closest<HTMLElement>(".qc138-sheet")!;
          const head = (k: string) => sheet.querySelector<HTMLElement>(`.qc138-h[data-k="${k}"]`)!.getBoundingClientRect();
          const name = el.querySelector<HTMLElement>('[data-qcv="row-name"]')!.getBoundingClientRect();
          const sum = el.querySelector<HTMLElement>('[data-qcv="peek-summary"]')!;
          const sb = sum.getBoundingClientRect();
          const sumLeft = sb.left + parseFloat(getComputedStyle(sum).paddingLeft);
          const stops = [...el.querySelectorAll<HTMLElement>('[data-qcv="peek-stop"]')];
          const drw = getComputedStyle(el.querySelector<HTMLElement>('[data-qcv="peek-drawer"]')!);
          return {
            name: name.left, sum: sumLeft, first: head("first").left, due: head("due").right,
            c0: stops[0]?.getBoundingClientRect().left ?? NaN, cN: stops[stops.length - 1]?.getBoundingClientRect().right ?? NaN,
            rule: `${drw.borderTopWidth} ${drw.borderTopStyle}`, n: stops.length,
          };
        });
        const w = `${vp.width} ${tone}`;
        L.check("B1", `${w} stops`, r.n >= 2, `${r.n}`);
        L.check("B1", `${w} summary under the name`, near(r.sum, r.name, 1), `${r.sum.toFixed(1)} vs ${r.name.toFixed(1)}`);
        L.check("B1", `${w} first card at First queried`, near(r.c0, r.first, 2), `${r.c0.toFixed(1)} vs ${r.first.toFixed(1)}`);
        L.check("B1", `${w} last card at Due`, near(r.cN, r.due, 2), `${r.cN.toFixed(1)} vs ${r.due.toFixed(1)}`);
        /* EDITED v138.3 (not in its edit list, but forced by its §D): the rule between the row and its drawer is SOLID now */
        L.check("B1", `${w} solid rule`, r.rule === "1px solid", r.rule);
      }
    }
    L.done(20);
  });

  test("C1 · summary: 'Out {d}' / 'Closed' in Special Elite 18; the state's line; the link opens the timeline tab, not the row", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("C1");
    const LINE = { over: / past the date$/, wait: / until their reply date$|^their reply date is today$/, closed: /^closed (.+ after you queried|the day you queried|, not dated)$/ } as const;
    for (const vp of SIZES) {
      await openQC(page, vp, "C1");
      for (const tone of ["over", "wait", "closed"] as const) {
        const row = await rowOf(page, tone);
        await hoverRow(page, row);
        await expect(row.locator('[data-qcv="peek-sum-head"]')).toBeVisible({ timeout: 5000 });
        const r = await row.evaluate((el) => {
          const h = el.querySelector<HTMLElement>('[data-qcv="peek-sum-head"]')!, l = el.querySelector<HTMLElement>('[data-qcv="peek-sum-line"]')!;
          const hs = getComputedStyle(h), ls = getComputedStyle(l);
          return { head: h.textContent ?? "", fam: hs.fontFamily, size: parseFloat(hs.fontSize), line: l.textContent ?? "", color: ls.color, style: ls.fontStyle };
        });
        const w = `${vp.width} ${tone}`;
        L.check("C1", `${w} line 1`, tone === "closed" ? r.head === "Closed" : /^Out (\d|today|, not dated)/.test(r.head), r.head);
        L.check("C1", `${w} line 1 face`, /Special Elite/.test(r.fam) && near(r.size, 18, 1), `${r.fam.split(",")[0]} ${r.size}`);
        L.check("C1", `${w} line 2`, LINE[tone].test(r.line), r.line);
        if (tone === "over") L.check("C1", `${w} overdue rust, upright`, r.color === "rgb(162, 69, 42)" && r.style === "normal", `${r.color} ${r.style}`);
      }
    }
    /* the link, at 1512 (the full grid: no summary is tight there) */
    await openQC(page, SIZES[0], "C1");
    for (const tone of ["wait", "over"] as const) {
      await page.evaluate(() => { try { sessionStorage.setItem("sa.qpnTab", "notes"); } catch { /* */ } });
      const row = await rowOf(page, tone);
      const id = await row.getAttribute("data-qid");
      await hoverRow(page, row);
      const link = row.locator('[data-qcv="peek-link"]');
      await expect(link).toBeVisible({ timeout: 5000 });
      const f = await link.evaluate((a) => {
        /* ⚠️ React handles clicks at its root, so a native listener on the ROW sees every click whatever React does.
           React's stopPropagation also stops the native event there, so the honest instrument is a bubble listener on
           the DOCUMENT: a click that would have reached the row's own handler reaches it too. It must stay at 0. */
        const w = window as unknown as { __docClicks: number; __docOn?: boolean };
        w.__docClicks = 0;
        if (!w.__docOn) { w.__docOn = true; document.addEventListener("click", () => { w.__docClicks += 1; }); }
        (a as HTMLElement).focus();
        return { focused: document.activeElement === a, tab: (a as HTMLElement).tabIndex };
      });
      L.check("C1", `link ${tone} focusable while open`, f.focused && f.tab >= 0, `focused ${f.focused} · tabIndex ${f.tab}`);
      await link.click();
      await page.waitForTimeout(900);
      const after = await page.evaluate((qid) => {
        const card = [...document.querySelectorAll<HTMLElement>('[data-qcv="open"]')].find((e) => e.getBoundingClientRect().height > 0);
        return { id: card?.dataset.id ?? null, tab: card?.dataset.tab ?? null, rowClicks: (window as unknown as { __docClicks: number }).__docClicks };
      }, id);
      L.check("C1", `link ${tone} opens the panel`, after.id === id, `${after.id} vs ${id}`);
      L.check("C1", `link ${tone} on the timeline tab`, after.tab === "tracking", `${after.tab}`);
      L.check("C1", `link ${tone} does not open the row`, after.rowClicks === 0, `${after.rowClicks} row click(s)`);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
    }
    L.done(28);
  });

  test("D1 · motion: the cards land one after another; all there by 900ms; nothing moves under reduced motion", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("D1");
    /* reads the stops' opacities at given times after the chain mounts (the moment the peek opens with its cards) */
    const sample = (row: import("@playwright/test").Locator, at: number[]) => row.evaluate((el, times) => new Promise<{ t: number; op: number[] }[]>((done) => {
      const out: { t: number; op: number[] }[] = [];
      let t0 = 0;
      const read = () => [...el.querySelectorAll<HTMLElement>('[data-qcv="peek-stop"]')].map((s) => parseFloat(getComputedStyle(s).opacity));
      const tick = (now: number) => {
        if (!t0) { if (el.querySelector('[data-qcv="peek-chain"]')) t0 = now; else { requestAnimationFrame(tick); return; } }
        const el0 = now - t0;
        while (out.length < times.length && el0 >= times[out.length]) out.push({ t: Math.round(el0), op: read() });
        if (out.length < times.length) requestAnimationFrame(tick); else done(out);
      };
      requestAnimationFrame(tick);
    }), at);
    for (const vp of SIZES) {
      await openQC(page, vp, "D1");
      await liftMotionSuppression(page);
      const row = await rowOf(page, "over");
      await hoverRow(page, row);
      const [a, b] = await sample(row, [100, 900]);
      const w = `${vp.width}`;
      L.check("D1", `${w} stops`, a.op.length >= 3, `${a.op.length}`);
      L.check("D1", `${w} first card < 1 at ${a.t}ms`, a.op[0] < 1, a.op.map((x) => x.toFixed(2)).join(" "));
      L.check("D1", `${w} last card lower at ${a.t}ms`, a.op[a.op.length - 1] < a.op[0], a.op.map((x) => x.toFixed(2)).join(" "));
      L.check("D1", `${w} all 1 by ${b.t}ms`, b.op.every((x) => x === 1), b.op.map((x) => x.toFixed(2)).join(" "));
    }
    /* reduced motion: the peek is simply there */
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const vp of SIZES) {
      await openQC(page, vp, "D1");
      await liftMotionSuppression(page);
      const row = await rowOf(page, "over");
      await hoverRow(page, row);
      const [z] = await sample(row, [0]);
      L.check("D1", `${vp.width} reduced: all 1 at ${z.t}ms`, z.op.length >= 3 && z.op.every((x) => x === 1), z.op.map((x) => x.toFixed(2)).join(" "));
    }
    L.done(10);
  });
});
