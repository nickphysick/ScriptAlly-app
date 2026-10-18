/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Discover v1 — the rendered locks (ref design-refs/discover-v1/discover-v1.html). Run against a local build:
 *   SA_E2E_BASE_URL=http://127.0.0.1:<port> npx playwright test tests/e2e/discoverV1.measure.ts
 * `DV1_MUTATE=<lock>` applies that lock's named break in the page (tests/e2e/dv1Lib.ts MUTATIONS) — the lock must go red.
 * Every case writes a ledger to reports/discover-v1/ledger/ and refuses a run with fewer readings than its floor.
 */
import { test } from "@playwright/test";
import { appColumn, Ledger, mutate, near, openDiscover, openMock, SIZES, type VP } from "./dv1Lib";

/* ── B1 · the header against the ref, by one ruler, and loading → loaded moves nothing ── */
const APP: Record<string, string> = {
  hd: '[data-dv1="header"]', eyebrow: '[data-dv1="eyebrow"]', title: '[data-dv1="title"]', byline: '[data-dv1="byline"]',
  tune: '[data-dv1="tune"]', share: '[data-dv1="share"]', how: '[data-dv1="header"] [data-dv1="how"]',
  card: '[data-dv1="card"]', counts: ".dv1-c1", ringCol: ".dv1-c2", ring: '[data-dv1="ring"]',
};
const REF: Record<string, string> = {
  hd: ".lh", eyebrow: ".lh-k", title: ".lh h1", byline: ".lh-by", tune: ".lh-b .p1", share: ".lh-b .p2", how: ".lh .cx-hwl",
  card: ".lh-card", counts: ".lh-c1", ringCol: ".lh-c2", ring: ".lh-c2 .lh-ring",
};
/** boxes relative to the header's own top-left; the title block's WIDTH is copy-bound, so it is read for its x, y, h */
const READ = (sel: Record<string, string>) => `(() => { const o = {}; const H = document.querySelector(${JSON.stringify(sel.hd)}).getBoundingClientRect(); for (const [k, s] of Object.entries(${JSON.stringify(sel)})) { const e = document.querySelector(s); if (!e) { o[k] = null; continue; } const b = e.getBoundingClientRect(); o[k] = { x: b.left - H.left, y: b.top - H.top, w: b.width, h: b.height, fs: parseFloat(getComputedStyle(e).fontSize) }; } return o; })()`;
type Boxes = Record<string, { x: number; y: number; w: number; h: number; fs: number } | null>;

for (const vp of SIZES) {
  test(`B1 · the header against the ref at ${vp.width}`, async ({ page }) => {
    const L = new Ledger(`B1-${vp.width}`);
    await openDiscover(page, vp, "live");
    await mutate(page, "B1");
    const app = (await page.evaluate(READ(APP))) as Boxes;
    const col = await appColumn(page);
    await openMock(page, col, vp.height, "live");
    const ref = (await page.evaluate(READ(REF))) as Boxes;
    for (const k of Object.keys(APP)) {
      const a = app[k], r = ref[k];
      L.check("B1", `${vp.width} ${k} present`, a && r, `${JSON.stringify(a)} vs ${JSON.stringify(r)}`);
      if (!a || !r) continue;
      L.check("B1", `${vp.width} ${k} x`, near(a.x, r.x, 1.5), `${a.x.toFixed(1)} vs ref ${r.x.toFixed(1)}`);
      L.check("B1", `${vp.width} ${k} y`, near(a.y, r.y, 1.5), `${a.y.toFixed(1)} vs ref ${r.y.toFixed(1)}`);
      L.check("B1", `${vp.width} ${k} h`, near(a.h, r.h, 1.5), `${a.h.toFixed(1)} vs ref ${r.h.toFixed(1)}`);
      if (!["title", "byline", "eyebrow", "how"].includes(k)) L.check("B1", `${vp.width} ${k} w`, near(a.w, r.w, 1.5), `${a.w.toFixed(1)} vs ref ${r.w.toFixed(1)}`);
      L.check("B1", `${vp.width} ${k} font size`, near(a.fs, r.fs, 0.1), `${a.fs} vs ref ${r.fs}`);
    }
    L.done(50);
  });

  test(`B1 · loading → loaded moves nothing at ${vp.width}`, async ({ page }) => {
    const L = new Ledger(`B1-load-${vp.width}`);
    await openDiscover(page, vp, "live", { holdMs: 4000 });
    await mutate(page, "B1");
    const loading = await page.evaluate(`(() => { const r = window.__dv1(); return !!r.q('[data-dv1="header"][data-loading]'); })()`);
    L.check("B1", `${vp.width} the loading face was entered`, loading === true, String(loading));
    const KEYS = ["hd", "eyebrow", "title", "byline", "tune", "share", "how", "card", "counts", "ringCol", "ring"];
    const before = (await page.evaluate(READ(APP))) as Boxes;
    await page.waitForFunction(() => !document.querySelector('[data-dv1="header"][data-loading]'), null, { timeout: 15_000 });
    await page.waitForTimeout(250);
    const after = (await page.evaluate(READ(APP))) as Boxes;
    for (const k of KEYS) {
      const a = before[k], b = after[k];
      L.check("B1", `${vp.width} ${k} present in both`, a && b, "");
      if (!a || !b) continue;
      for (const d of ["y", "h"] as const) L.check("B1", `${vp.width} ${k} ${d} held`, near(a[d], b[d], 1), `${a[d].toFixed(1)} → ${b[d].toFixed(1)}`);
      /* the title block's width is copy-bound ("00 agents…" while loading), so its children are read for x only */
      if (!["title", "byline", "eyebrow", "how"].includes(k)) for (const d of ["x", "w"] as const) L.check("B1", `${vp.width} ${k} ${d} held`, near(a[d], b[d], 1), `${a[d].toFixed(1)} → ${b[d].toFixed(1)}`);
    }
    L.done(30);
  });
}

/* ── B2 · the ring's figures are the queue's own counts; "none" draws no arc ── */
const CARD = `(() => {
  const { q, qa } = window.__dv1();
  const n = (k) => Number((q('[data-dv1="row"][data-k="' + k + '"] [data-dv1="n"]')?.textContent ?? "").trim());
  const t = q('[data-dv1="title-n"]');
  return { review: n("review"), added: n("added"), passed: n("passed"), title: t ? Number(t.textContent) : null,
    pct: (q('[data-dv1="ring-pct"]')?.textContent ?? "").trim(), sub: (q('[data-dv1="ring-sub"]')?.textContent ?? "").trim(),
    arcs: qa('[data-dv1="ring-arc"]').length, dash: q('[data-dv1="ring-arc"]')?.getAttribute("stroke-dasharray") ?? null };
})()`;
test("B2 · the ring states the queue's own counts, in every state", async ({ page }) => {
  const L = new Ledger("B2");
  const vp: VP = SIZES[0];
  const seen = new Set<string>();
  for (const state of ["live", "done", "none"] as const) {
    await openDiscover(page, vp, state);
    await mutate(page, "B2");
    const c = (await page.evaluate(CARD)) as { review: number; added: number; passed: number; title: number | null; pct: string; sub: string; arcs: number; dash: string | null };
    const decided = c.added + c.passed, total = c.review + decided;
    seen.add(state);
    L.check("B2", `${state} the rows are numbers`, [c.review, c.added, c.passed].every(Number.isFinite), JSON.stringify(c));
    if (state === "live") L.check("B2", "live title = To review", c.title === c.review, `${c.title} vs ${c.review}`);
    if (total === 0) {
      L.check("B2", `${state} nothing at all: the centre is a dash`, c.pct === "—", c.pct);
      L.check("B2", `${state} nothing at all: no arc is drawn`, c.arcs === 0, `${c.arcs} arc(s), dash ${c.dash}`);
      L.check("B2", `${state} nothing at all: the line says so`, c.sub === "nothing to decide yet", c.sub);
    } else {
      L.check("B2", `${state} the percentage is decided ÷ total`, c.pct === `${Math.round((decided / total) * 100)}%`, `${c.pct} vs ${decided}/${total}`);
      L.check("B2", `${state} the line is "x of y decided"`, c.sub === `${decided} of ${total} decided`, c.sub);
      L.check("B2", `${state} an arc iff something is decided`, (c.arcs === 1) === decided > 0, `${c.arcs} arc(s)`);
    }
  }
  L.check("B2", "every state was entered", seen.size === 3, [...seen].join(","));
  L.done(14);
});
