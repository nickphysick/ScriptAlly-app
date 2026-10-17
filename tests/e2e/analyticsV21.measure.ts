/**
 * Analytics v21 — the AN21 locks that stand in v24 (A1 header, A2 card, L1 overflow). A3 and B1 were rewritten
 * as AN24-A3 and AN24-B1, and C1, D1, E1, F1, G1 and I1 were retired with the sections they measured
 * (tests/e2e/RETIRED-analytics-v24.md; the new locks are tests/e2e/analyticsV24.measure.ts).
 *
 * Analytics v21 — the AN21 locks (design-refs/analytics-v21/analytics-v21.html), measured on the RENDERED page at
 * 1512 × 900 and 1280 × 800 with the shell (and the widths each lock names), phone at 390.
 *
 * ⚠️ A FIGURE IS COMPARED WITH THE MODEL, NOT WITH A LITERAL. The page publishes `window.__SA_AN21` in dev builds
 *    only (gated at the call site); a lock reads what the page DRAWS and what the model SAYS and requires them
 *    equal, so a hard-coded or second-derived figure goes red. The derivations themselves are unit-locked
 *    (src/lib/analyticsV21.test.ts).
 * ⚠️ THE FIXTURE: the harness account's "The Smoke Test" (`seed-ms-1`, 51 queries, an offer, replies inside and
 *    after their window). I1 seeds and removes its own empty manuscript (tests/e2e/seedAn21.mjs).
 * ⚠️ PIXELS ARE READ IN THE PAGE: the screenshot is decoded on a canvas there (this repo has no PNG decoder in
 *    node), at device scale 1.
 * ⚠️ `AN21_MUTATE` is not read here: each lock's named mutation is a SOURCE patch applied, built and reverted by
 *    hand in the measurement worktree (reports/analytics-v21/MUTATIONS.md).
 */
import { test, expect, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { openAn, near, STATE_RGB, FILLS } from "./an17Lib";

const DIR = "reports/analytics-v21";
const MS = "seed-ms-1";
const VP = (w: number) => (w <= 760 ? { width: w, height: 844 } : w === 1280 ? { width: 1280, height: 800 } : { width: w, height: 900 });
const TINT = "rgb(233, 230, 224)";
const STAND_RGB: Record<string, string> = { waiting: STATE_RGB.queried, reading: STATE_RGB.sent, offer: STATE_RGB.offer, ended: STATE_RGB.closed };
const RUSTS = ["rgb(180, 85, 63)", "rgb(160, 99, 63)", "rgb(138, 74, 60)", "#b4553f", "#a0633f", "#8a4a3c"];

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(lock: string, where: string, ok: boolean, detail: string) { this.rows.push({ lock, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    console.log(`LEDGER ${this.name}: ${this.rows.length} readings, ${this.rows.filter((r) => !r.ok).length} failed`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.lock} · ${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function open(page: Page, w: number, ms = MS) {
  await page.addInitScript((id) => { try { localStorage.setItem("scriptally_active_manuscript_id", id); } catch { /* */ } }, ms);
  await openAn(page, VP(w));
  await page.waitForFunction(() => !!(window as any).__SA_AN21, null, { timeout: 15_000 }).catch(() => {});
}
const model = (page: Page) => page.evaluate(() => (window as any).__SA_AN21 ?? null);
/** Scroll the page's scroller so a section's top sits `off` px below the scroller's top. */
async function toSec(page: Page, sec: number, off = 40) {
  await page.evaluate(({ sec, off }) => {
    const p = [...document.querySelectorAll<HTMLElement>('[data-a17="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
    const sc = p.closest(".wpg-scroll") as HTMLElement;
    const t = p.querySelector<HTMLElement>(`[data-a17="sec"][data-sec="${sec}"]`);
    if (t) sc.scrollTop = t.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - off;
  }, { sec, off });
  await page.waitForTimeout(250);
}
/** RGB at viewport points, decoded from a screenshot on a canvas in the page. */
async function pixels(page: Page, pts: { x: number; y: number }[]): Promise<number[][]> {
  const b64 = (await page.screenshot()).toString("base64");
  return page.evaluate(async ({ b64, pts }) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width; c.height = img.height;
    const g = c.getContext("2d")!;
    g.drawImage(img, 0, 0);
    const k = img.width / window.innerWidth;
    return pts.map((p) => Array.from(g.getImageData(Math.round(p.x * k), Math.round(p.y * k), 1, 1).data.slice(0, 3)));
  }, { b64, pts });
}
const rgbStr = (a: number[]) => `rgb(${a[0]}, ${a[1]}, ${a[2]})`;
const close = (a: number[], b: number[], t = 3) => a.every((v, i) => Math.abs(v - b[i]) <= t);
const parse = (s: string) => (s.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map(Number);
async function overflow(page: Page) {
  return page.evaluate(() => {
    const vis = (sel: string) => [...document.querySelectorAll<HTMLElement>(sel)].find((e) => e.getBoundingClientRect().width > 0) ?? null;
    const d = document.documentElement, sc = vis(".wpg-scroll"), app = vis(".ws-app");
    return {
      doc: [d.scrollWidth, d.clientWidth],
      sc: sc ? [sc.scrollWidth, sc.clientWidth] : null,
      app: app ? [app.scrollWidth, app.clientWidth] : null,
    };
  });
}

/* ════════════ A1 · header ════════════ */
test("AN21-A1 · header", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("an21-a1");
  for (const w of [1920, 1512, 1280, 1180]) {
    await open(page, w);
    const m = await model(page);
    const r = await page.evaluate(() => {
      const h = [...document.querySelectorAll<HTMLElement>('[data-a21="header"]')].find((e) => e.getBoundingClientRect().height > 0);
      if (!h) return null;
      const h1 = h.querySelector<HTMLElement>("h1")!;
      const cs = getComputedStyle(h1);
      const card = h.querySelector<HTMLElement>('[data-a21="card"]')!.getBoundingClientRect();
      const hb = h.getBoundingClientRect();
      const imgs = [...h.querySelectorAll("img")].map((i) => i.getAttribute("data-a21"));
      const bgImgs = [...h.querySelectorAll<HTMLElement>("*")].filter((e) => getComputedStyle(e).backgroundImage !== "none").length;
      return { text: h1.innerText.replace(/\s+/g, " ").trim(), fs: parseFloat(cs.fontSize), ff: cs.fontFamily, hh: h1.getBoundingClientRect().height, lh: parseFloat(cs.lineHeight), cardR: card.right, hR: hb.right, imgs, bgImgs, panel: !!document.querySelector('[data-a17="page"] [data-hpanel]') };
    });
    const ww = `${w}`;
    L.check("A1 the light header renders", ww, !!r, `${!!r}`);
    if (!r || !m) continue;
    /* REWRITTEN (analytics v24.1): a request is a reply — the header counts v24's tally, not the dated first replies */
    const rep = m.v24?.tally?.all ?? m.replies;
    const want = `${m.sent} ${m.sent === 1 ? "query" : "queries"}, ${rep === 0 ? "no" : rep} ${rep === 1 ? "reply" : "replies"}`;
    L.check("A1 no image in the header but the shadow", ww, r.imgs.length === 1 && r.imgs[0] === "shadow" && r.bgImgs === 0, `${JSON.stringify(r.imgs)} bg ${r.bgImgs}`);
    L.check("A1 no panel header on the page", ww, !r.panel, `${r.panel}`);
    L.check("A1 the title is {sent} queries, {replies} replies", ww, r.text === want, `"${r.text}" vs "${want}"`);
    L.check("A1 Special Elite", ww, /Special Elite/i.test(r.ff), r.ff);
    const size = w > 1680 ? 56 : w > 1360 ? 50 : 40;
    L.check(`A1 ${size}px (±1)`, ww, near(r.fs, size, 1), `${r.fs}`);
    L.check("A1 one line", ww, r.hh <= r.lh * 1.3, `${r.hh.toFixed(1)} / lh ${r.lh}`);
    L.check("A1 the card's right edge is inside the header's", ww, r.cardR <= r.hR + 0.5, `${r.cardR.toFixed(1)} ≤ ${r.hR.toFixed(1)}`);
  }
  L.done(30);
});

/* ════════════ A2 · the card ════════════ */
test("AN21-A2 · card", async ({ page }) => {
  const L = new Ledger("an21-a2");
  for (const w of [1512, 1280]) {
    await open(page, w);
    const m = await model(page);
    const r = await page.evaluate(() => {
      const c = [...document.querySelectorAll<HTMLElement>('[data-a21="card"]')].find((e) => e.getBoundingClientRect().height > 0);
      if (!c) return null;
      return {
        rows: [...c.querySelectorAll<HTMLElement>('[data-a21="card-row"]')].map((li) => ({
          k: li.dataset.k, n: Number(li.querySelector('[data-a21="card-n"]')!.textContent), label: li.querySelector('[data-a21="card-label"]')!.textContent,
          sw: getComputedStyle(li.querySelector('[data-a21="card-sw"]')!).backgroundColor,
        })),
        segs: [...c.querySelectorAll<HTMLElement>('[data-a21="card-seg"]')].map((s) => ({ k: s.dataset.k, w: s.getBoundingClientRect().width, bg: getComputedStyle(s).backgroundColor })),
        gap: parseFloat(getComputedStyle(c.querySelector('[data-a21="card-bar"]')!).columnGap) || 0,
      };
    });
    const ww = `${w}`;
    L.check("A2 the card renders", ww, !!r && !!m, `${!!r}`);
    if (!r || !m) continue;
    const st = (m.v21.standing as { key: string; count: number; label: string }[]).filter((s) => s.count > 0);
    L.check("A2 the rows are standing's non-zero buckets, in order", ww, JSON.stringify(r.rows.map((x) => [x.k, x.n, x.label])) === JSON.stringify(st.map((s) => [s.key, s.count, s.label])), `${JSON.stringify(r.rows.map((x) => [x.k, x.n]))} vs ${JSON.stringify(st.map((s) => [s.key, s.count]))}`);
    L.check("A2 the rows sum to the queries sent", ww, r.rows.reduce((a, x) => a + x.n, 0) === m.sent, `${r.rows.reduce((a, x) => a + x.n, 0)} vs ${m.sent}`);
    for (const x of r.rows) L.check(`A2 ${x.k}'s swatch is its status fill`, ww, x.sw === STAND_RGB[x.k as string], `${x.sw}`);
    for (const s of r.segs) L.check(`A2 ${s.k}'s segment is its status fill`, ww, s.bg === STAND_RGB[s.k as string], `${s.bg}`);
    const total = r.segs.reduce((a, s) => a + s.w, 0);
    const sum = st.reduce((a, s) => a + s.count, 0);
    for (const s of r.segs) {
      const n = st.find((x) => x.key === s.k)?.count ?? 0;
      L.check(`A2 ${s.k}'s segment is in proportion (±2px)`, ww, near(s.w, (total * n) / sum, 2), `${s.w.toFixed(1)} vs ${((total * n) / sum).toFixed(1)}`);
    }
  }
  L.done(14);
});

/* ════════════ L1 · overflow ════════════ */
test("AN21-L1 · overflow", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("an21-l1");
  for (const w of [1920, 1512, 1280, 1180, 1024, 390]) {
    await open(page, w);
    /* v24: sections 2, 4 and 5 hold the widest rows (the bench panels and the pair rows) */
    for (const s of [-1, 1, 3, 4]) {
      if (s >= 0) await toSec(page, s);
      const o = await overflow(page);
      const where = `${w}${s >= 0 ? ` @${s + 1}` : ""}`;
      L.check("L1 document", where, o.doc[0] <= o.doc[1], JSON.stringify(o.doc));
      L.check("L1 sheet scroller", where, !!o.sc && o.sc[0] <= o.sc[1], JSON.stringify(o.sc));
      L.check("L1 app frame", where, !o.app || o.app[0] <= o.app[1], JSON.stringify(o.app));
    }
  }
  L.done(70);
});
