/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v138.4 (design-refs/query-centre-v138-4/query-centre-v138-4.html) — the QC138.4 locks, on the rendered
 * page at 1512 × 900 and 1280 × 800 with the shell (C1 also at 1100 and 1024: no label may be cut off or overlap at any
 * width from 1024 up). The five acceptance cases are forced through the dev-only peek lab, each against 8 Oct 2026.
 *
 * A1 scale · A2 height · B1 past colour · C1 lanes · D1 type.
 *
 * Each was run with its named mutation before its green was believed: `QC1384_MUTATE=<lock>` applies it in the page.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";
import { CASES_1384 } from "./qc1384Cases";

const DIR = "reports/qc-v138-4";
const SIZES = [{ width: 1512, height: 1000 }, { width: 1280, height: 1000 }] as const;
type VP = { width: number; height: number };
const MUT = process.env.QC1384_MUTATE ?? "";
const near = (a: unknown, b: number, t: number) => typeof a === "number" && Number.isFinite(a) && Math.abs(a - b) <= t;

const MUTATIONS: Record<string, { css?: string; js?: string }> = {
  /* the markers in a flex row: evenly spaced, whatever their dates */
  A1: { js: `document.querySelectorAll('[data-qc138="peek-case"] [data-qcv="peek-chain"]').forEach((c) => { const m = [...c.querySelectorAll('[data-qcv="peek-stop"]')]; const W = c.clientWidth; m.forEach((e, i) => { e.style.left = (14 + i * (W - 28) / Math.max(1, m.length - 1)) + "px"; }); })` },
  A2: { css: `.qc138-sheet .qc138-peek { height: auto !important; } .qc138-sheet .qc138-chain { position: static !important; } .qc138-sheet .qc138-t4l { position: static !important; }` },
  B1: { css: `.qc138-sheet .qc138-t4b.past { background: #b0603e !important; } .qc138-sheet .qc138-mk.past .qc138-mk-svg { color: #1c130f !important; }` },
  /* one lane: every upper label moved into the lower lane */
  C1: { js: `document.querySelectorAll('[data-qcv="peek-label"][data-lane="up"]').forEach((l) => { l.style.bottom = "auto"; l.style.top = "74px"; })` },
  D1: { css: `.qc138-sheet .qc138-t4l b { font: 600 12.5px/1.25 var(--sp-serif) !important; }` },
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
async function openLab(page: Page, vp: VP, lock: string) {
  await page.addInitScript(() => { try { for (const k of ["contacts", "queries", "manuscripts"]) localStorage.setItem(`sa.guide.${k}`, "1"); } catch { /* */ } });
  await page.addInitScript((c) => { (window as unknown as { __SA_QC138_PEEK_LAB: unknown }).__SA_QC138_PEEK_LAB = c; }, CASES_1384);
  await openRoute(page, "/queries", vp);
  await expect(page.locator('[data-qc138="peek-lab"] [data-qcv="peek-chain"]').first()).toBeVisible({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);
  const m = MUT === lock ? MUTATIONS[lock] : null;
  if (m?.css) await page.addStyleTag({ content: m.css });
  if (m?.js) await page.evaluate(m.js);
  await page.waitForTimeout(150);
}
/** every lab case: its peek box, its markers (centre x, kind, glyph colour) and its labels' ink boxes */
const readCases = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-qc138="peek-case"]')].filter((c) => c.getBoundingClientRect().height > 0).map((c) => {
  const pk = c.querySelector<HTMLElement>('[data-qcv="peek"]')!;
  const box = pk.getBoundingClientRect();
  const marks = [...pk.querySelectorAll<HTMLElement>('[data-qcv="peek-stop"]')].map((m) => {
    const r = m.getBoundingClientRect();
    const svg = m.querySelector<SVGElement>(".qc138-mk-svg");
    return { x: r.left - box.left, kind: m.dataset.kind ?? "", tone: m.classList.contains("past") ? "past" : m.classList.contains("last") ? "last" : "", color: svg ? getComputedStyle(svg).color : null };
  });
  /* the ink of a label: the union of its children's boxes (the label's own box is a width, not the text) */
  const labels = [...pk.querySelectorAll<HTMLElement>('[data-qcv="peek-label"]')].map((l) => {
    const rs = [...l.children].map((k) => k.getBoundingClientRect()).filter((r) => r.width > 0);
    const L = Math.min(...rs.map((r) => r.left)), R = Math.max(...rs.map((r) => r.right)), T = Math.min(...rs.map((r) => r.top)), B = Math.max(...rs.map((r) => r.bottom));
    return { text: l.textContent ?? "", L: L - box.left, R: R - box.left, T: T - box.top, B: B - box.top, notes: [...l.querySelectorAll('[data-qcv="peek-note"]')].map((n) => n.textContent ?? ""), cut: [...l.children].some((k) => (k as HTMLElement).scrollWidth > (k as HTMLElement).clientWidth + 1) };
  });
  const bars = [...pk.querySelectorAll<HTMLElement>('[data-qcv="peek-bar"]')].map((b) => { const cs = getComputedStyle(b); return { cls: b.dataset.cls ?? "", bg: cs.backgroundColor, img: cs.backgroundImage }; });
  const names = [...pk.querySelectorAll<HTMLElement>('[data-qcv="peek-name"]')].map((n) => { const cs = getComputedStyle(n); return { fam: cs.fontFamily, size: parseFloat(cs.fontSize) }; });
  return { W: box.width, H: box.height, marks, labels, bars, names };
}));

test.describe("Query Centre v138.4", () => {
  test("A1 · scale: markers at their true dates; Today at its true proportion in Sophie's case", async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger("A1");
    const DAY = 86_400_000;
    for (const vp of SIZES) {
      await openLab(page, vp, "A1");
      const cs = await readCases(page);
      const w = `${vp.width}`;
      L.check("A1", `${w} five cases`, cs.length === 5, `${cs.length}`);
      /* the stops' dates, in order, from the case data (the lab renders them in this order) */
      let pairs = 0;
      cs.forEach((c, k) => {
        const cse = CASES_1384[k];
        const S = (() => {
          const ev: number[] = [];
          for (const e of cse.events) { const d = new Date(e.ms); d.setHours(0, 0, 0, 0); const t = d.getTime(); if (!ev.length || ev[ev.length - 1] !== t) ev.push(t); }
          if (cse.closed) return ev;
          const today = new Date(cse.now); today.setHours(0, 0, 0, 0);
          const due = cse.due != null ? (() => { const d = new Date(cse.due); d.setHours(0, 0, 0, 0); return d.getTime(); })() : null;
          return due != null && due < today.getTime() ? [...ev, due, today.getTime()] : [...ev, today.getTime(), ...(due != null ? [due] : [])];
        })();
        if (S.length !== c.marks.length) { L.check("A1", `${w} ${cse.key} stops`, false, `${c.marks.length} vs ${S.length}`); return; }
        /* markers more than 30px from their neighbours keep the date ratio; a case where the minimum spacing moved
           anything is rescaled as a whole, so only cases with every gap free are asked */
        const free = c.marks.every((m, i) => i === 0 || m.x - c.marks[i - 1].x > 30.5);
        if (!free) return;
        for (let i = 1; i < S.length; i += 1) for (let j = i + 1; j < S.length; j += 1) {
          const a = (c.marks[i].x - c.marks[i - 1].x) / ((S[i] - S[i - 1]) / DAY), b = (c.marks[j].x - c.marks[j - 1].x) / ((S[j] - S[j - 1]) / DAY);
          pairs += 1;
          L.check("A1", `${w} ${cse.key} gaps ${i}/${j} keep the date ratio`, Math.abs(a / b - 1) <= 0.03, `${(a / b).toFixed(3)}`);
        }
      });
      L.check("A1", `${w} precondition: true-scale pairs measured`, pairs >= 3, `${pairs}`);
      /* Sophie: Today between Partial sent (21 Sep) and Reply due (2 Nov), at 17/42 of the way */
      const s = cs[0].marks;
      const ps = s.find((m) => m.kind === "event" && m.tone === "last")!, td = s.find((m) => m.kind === "today")!, due = s.find((m) => m.kind === "due")!;
      const f = (td.x - ps.x) / (due.x - ps.x);
      L.check("A1", `${w} Sophie: Today at its true proportion`, Math.abs(f - 17 / 42) <= 0.03, `${f.toFixed(3)} vs ${(17 / 42).toFixed(3)}`);
    }
    L.done(10);
  });

  test("A2 · height: every open timeline is 120px, in all five cases", async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger("A2");
    for (const vp of SIZES) {
      await openLab(page, vp, "A2");
      const cs = await readCases(page);
      L.check("A2", `${vp.width} five cases`, cs.length === 5, `${cs.length}`);
      cs.forEach((c, k) => L.check("A2", `${vp.width} ${CASES_1384[k].key} 120 ±1`, near(c.H, 120, 1), `${c.H}`));
    }
    L.done(12);
  });

  test("B1 · past colour: no past bar is rust; past glyphs slate, the latest ink", async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger("B1");
    for (const vp of SIZES) {
      await openLab(page, vp, "B1");
      const cs = await readCases(page);
      const w = `${vp.width}`;
      const past = cs.flatMap((c) => c.bars.filter((b) => b.cls === "past"));
      L.check("B1", `${w} past bars measured`, past.length >= 5, `${past.length}`);
      L.check("B1", `${w} no past bar is rust or hatched`, past.every((b) => b.bg !== "rgb(176, 96, 62)" && b.bg !== "rgb(162, 69, 42)" && !/gradient/.test(b.img)), [...new Set(past.map((b) => b.bg))].join(","));
      const pm = cs.flatMap((c) => c.marks.filter((m) => m.tone === "past" && m.color));
      const lm = cs.flatMap((c) => c.marks.filter((m) => m.tone === "last" && m.color));
      L.check("B1", `${w} past glyphs slate`, pm.length > 0 && pm.every((m) => m.color === "rgb(93, 104, 120)"), [...new Set(pm.map((m) => m.color))].join(","));
      L.check("B1", `${w} latest glyph ink`, lm.length === 5 && lm.every((m) => m.color === "rgb(28, 19, 15)"), [...new Set(lm.map((m) => m.color))].join(","));
    }
    L.done(8);
  });

  test("C1 · lanes: no label overlaps another, leaves the timeline, or straddles the track; the notes", async ({ page }) => {
    test.setTimeout(400_000);
    const L = new Ledger("C1");
    for (const vp of [...SIZES, { width: 1100, height: 1400 }, { width: 1024, height: 1400 }]) {
      await openLab(page, vp, "C1");
      const cs = await readCases(page);
      const w = `${vp.width}`;
      L.check("C1", `${w} five cases`, cs.length === 5, `${cs.length}`);
      cs.forEach((c, k) => {
        const key = CASES_1384[k].key;
        let clash = "";
        for (let i = 0; i < c.labels.length; i += 1) for (let j = i + 1; j < c.labels.length; j += 1) {
          const a = c.labels[i], b = c.labels[j];
          if (a.L < b.R && b.L < a.R && a.T < b.B && b.T < a.B) clash = `${a.text} × ${b.text}`;
        }
        L.check("C1", `${w} ${key} no overlap`, !clash, clash);
        const out = c.labels.filter((l) => l.L < -0.5 || l.R > c.W + 0.5 || l.T < -0.5 || l.B > c.H + 0.5);
        L.check("C1", `${w} ${key} inside the timeline`, !out.length, out.map((l) => `${l.text} ${l.L.toFixed(0)}–${l.R.toFixed(0)}`).join(" | "));
        const straddle = c.labels.filter((l) => !(l.B <= 58 || l.T >= 58));
        L.check("C1", `${w} ${key} above or below the track`, !straddle.length, straddle.map((l) => l.text).join(" | "));
        L.check("C1", `${w} ${key} nothing cut off`, c.labels.every((l) => !l.cut), c.labels.filter((l) => l.cut).map((l) => l.text).join(" | "));
      });
      L.check("C1", `${w} Tom: '+1 earlier'`, cs[3].labels.some((l) => l.notes.some((n) => /^\+1 earlier$/i.test(n))), JSON.stringify(cs[3].labels.map((l) => l.notes)));
      L.check("C1", `${w} Sophie: '+1 same day'`, cs[0].labels.some((l) => l.notes.some((n) => /^\+1 same day$/i.test(n))), JSON.stringify(cs[0].labels.map((l) => l.notes)));
    }
    L.done(92);
  });

  test("D1 · type: timeline names in Special Elite at 13.5px", async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger("D1");
    for (const vp of SIZES) {
      await openLab(page, vp, "D1");
      const cs = await readCases(page);
      const names = cs.flatMap((c, k) => c.names.map((n) => ({ ...n, key: CASES_1384[k].key })));
      L.check("D1", `${vp.width} names measured`, names.length >= 10, `${names.length}`);
      L.check("D1", `${vp.width} Special Elite`, names.every((n) => /Special Elite/.test(n.fam)), [...new Set(names.map((n) => n.fam.split(",")[0]))].join(","));
      /* TODAY is 12px by design; every other name 13.5 ±0.5 */
      L.check("D1", `${vp.width} 13.5 ±0.5 (TODAY 12)`, names.every((n) => near(n.size, 13.5, 0.5) || near(n.size, 12, 0.1)) && names.some((n) => near(n.size, 13.5, 0.5)), [...new Set(names.map((n) => n.size))].join(","));
    }
    L.done(6);
  });
});
