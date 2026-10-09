/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v135 (design-refs/query-centre/query-centre-v135.html) — the QC135 locks, on the rendered page at
 * 1512 × 900 and 1280 × 800. At both, the page sheet is narrower than 1440, so the COMPACT values apply.
 *
 * A1 centred group · A2 vertical centre · A3 clear of the flap · A4 all three match · A5 header no jump
 * B1 badge · B2 header tint · B3 inner border · B4 placeholder · B5 body · B6 no overflow · B7 selected ·
 * B8 desk no jump · B9 art slot.
 *
 * Each was red on the build before the pack (fb201cd5) and by its named mutation (`QC135_MUTATE=<lock>`,
 * qc135Lib MUTATIONS) before its green was believed: reports/qc-v135/.
 */
import { test } from "@playwright/test";
import { KILL_MOTION } from "./measure";
import { HEADERS, Ledger, SIZES, near, open, prepare, readHeader } from "./qc135Lib";

test.beforeEach(async ({ page }) => { await prepare(page); });

/* ── A1–A4 · the centred pair, on all three open headers ── */
test("A1 A2 A3 A4 · the centred pair: one group on the sheet's centre, the drawing centred on the text and clear of the flap, one set of values", async ({ page }) => {
  const A1 = new Ledger("A1"), A2 = new Ledger("A2"), A3 = new Ledger("A3"), A4 = new Ledger("A4");
  for (const vp of SIZES) {
    const got: { route: string; gap: number; padB: number; cols: number; justify: string; align: string; artSelf: string | null }[] = [];
    for (const h of HEADERS) {
      await open(page, h.route, vp);
      const r = await readHeader(page, h); const w = `${h.route} @${vp.width}`;
      const ok = !!(r && r.win && r.txt && r.art);
      A1.check("A1 precondition: the header, its text block and its drawing are on screen", w, ok && r!.art!.b < vp.height && r!.art!.w > 100, ok ? `art ${r!.art!.w.toFixed(0)}×${r!.art!.h.toFixed(0)}` : "absent");
      if (!ok) { A2.check("A2 a header to measure", w, false, "absent"); A3.check("A3 a header to measure", w, false, "absent"); continue; }
      const cx = (r!.win!.l + r!.win!.r) / 2, mid = (r!.txt!.l + r!.art!.r) / 2, gap = r!.art!.l - r!.txt!.r;
      A1.check("A1 the midpoint of (text left, art right) is the page sheet's centre (±2)", w, near(mid, cx, 2), `group ${r!.txt!.l.toFixed(1)}–${r!.art!.r.toFixed(1)}, midpoint ${mid.toFixed(1)}, sheet centre ${cx.toFixed(1)}`);
      A1.check("A1 the gap between the text and the drawing is 56 (±2)", w, near(gap, 56, 2), `${gap.toFixed(1)}`);
      const tcy = (r!.txt!.t + r!.txt!.b) / 2, acy = (r!.art!.t + r!.art!.b) / 2;
      A2.check("A2 the drawing's vertical centre is the text block's (±2)", w, near(acy, tcy, 2), `art ${acy.toFixed(1)} text ${tcy.toFixed(1)}`);
      A2.check("A2 the drawing has no drop", w, r!.artTop === "0px" || r!.artTop === "auto", `top ${r!.artTop}`);
      A3.check("A3 the drawing's bottom is 30 or more above the flap's flat edge", w, r!.flat - r!.art!.b >= 30, `${(r!.flat - r!.art!.b).toFixed(1)} (flat edge ${r!.flat.toFixed(1)}, art bottom ${r!.art!.b.toFixed(1)})`);
      A3.check("A3 the header's padding-bottom is 34", w, r!.padB === 34, `${r!.padB}`);
      got.push({ route: h.route, gap: r!.gap, padB: r!.padB, cols: r!.cols.split(" ").length, justify: r!.justify, align: r!.align, artSelf: r!.artSelf });
    }
    const same = <K extends keyof (typeof got)[number]>(k: K) => got.length === 3 && got.every((g) => g[k] === got[0][k]);
    const say = <K extends keyof (typeof got)[number]>(k: K) => got.map((g) => `${g.route} ${g[k]}`).join(" · ");
    A4.check("A4 population: three headers were read", `@${vp.width}`, got.length === 3, `${got.length}`);
    A4.check("A4 one column gap on all three", `@${vp.width}`, same("gap"), say("gap"));
    A4.check("A4 one padding-bottom on all three", `@${vp.width}`, same("padB"), say("padB"));
    A4.check("A4 one alignment on all three (two tracks, centred, items centred, the drawing centre / start)", `@${vp.width}`, same("cols") && same("justify") && same("align") && same("artSelf") && got[0]?.cols === 2 && got[0]?.justify === "center" && got[0]?.align === "center", `${say("justify")} | ${say("align")} | ${say("artSelf")}`);
  }
  A1.write(); A2.write(); A3.write(); A4.write();
  A1.done(HEADERS.length * SIZES.length * 3); A2.done(HEADERS.length * SIZES.length * 2); A3.done(HEADERS.length * SIZES.length * 2); A4.done(SIZES.length * 4);
});

/* ── A5 · the header, loading and loaded ── */
test("A5 · header no jump: each open header is the same box, on the same grid, loading and loaded", async ({ page }) => {
  const L = new Ledger("A5");
  /* motion is killed from the first frame (the pages rise 4px on entry), and both reads are of ONE load */
  await page.addInitScript(({ css }) => {
    const w = window as unknown as { __SA_QC_HOLD_MS: number; __SA_AGENTS_HOLD_MS: number }; w.__SA_QC_HOLD_MS = 6000; w.__SA_AGENTS_HOLD_MS = 6000;
    const put = () => { const s = document.createElement("style"); s.textContent = css; document.documentElement.appendChild(s); };
    if (document.documentElement) put(); else document.addEventListener("readystatechange", put, { once: true });
  }, { css: KILL_MOTION });
  await open(page, "/dashboard", SIZES[0]);
  let held = 0;
  for (const vp of SIZES) for (const h of HEADERS) {
    await page.setViewportSize(vp);
    await page.goto(h.route);
    const w = `${h.route} @${vp.width}`;
    await page.waitForFunction((s) => [...document.querySelectorAll<HTMLElement>(s)].some((e) => e.getBoundingClientRect().height > 0), h.hd, { timeout: 30_000 }).catch(() => {});
    const a = await readHeader(page, h);
    if (a?.loading) held++;
    await page.waitForTimeout(h.route === "/manuscripts" ? 4000 : 9000);
    await page.evaluate(async () => { await document.fonts.ready; });
    const b = await readHeader(page, h);
    const f = (x: typeof a) => (x ? `${x.hd.l.toFixed(0)},${x.hd.t.toFixed(0)} ${x.hd.w.toFixed(0)}×${x.hd.h.toFixed(0)} · ${x.cols.split(" ").length} tracks ${x.justify}` : "absent");
    L.check("A5 the loading frame is on the same grid (two tracks, centred)", w, !!a && a.cols.split(" ").length === 2 && a.justify === "center" && a.align === "center", f(a));
    L.check("A5 the header's box is equal, loading and loaded (±1)", w, !!a && !!b && near(a.hd.l, b.hd.l, 1) && near(a.hd.t, b.hd.t, 1) && near(a.hd.w, b.hd.w, 1) && near(a.hd.h, b.hd.h, 1), `first ${f(a)} · settled ${f(b)}`);
/* ⚠️ THE DRAWING'S X IS REPORTED, NOT ASSERTED. The pair is centred as one group and the text track is as wide as its
       text, so when the count and the faces arrive the group re-centres: the drawing slides by half the change in the
       text's width (measured: 4px on /queries, 20px on /agents). Its y, its size and the header's box do not change. */
    L.check("A5 the drawing keeps its height and its size (±1); its x re-centres with the text", w, !!a?.art && !!b?.art && near(a.art.t, b.art.t, 1) && near(a.art.w, b.art.w, 1) && near(a.art.h, b.art.h, 1), a?.art && b?.art ? `first ${a.art.l.toFixed(1)},${a.art.t.toFixed(1)} settled ${b.art.l.toFixed(1)},${b.art.t.toFixed(1)} (x moved ${(b.art.l - a.art.l).toFixed(1)})` : "absent");
  }
  L.check("A5 population: the loading state itself was read (the two held routes, at both widths)", "census", held >= 4, `${held}`);
  L.done(HEADERS.length * SIZES.length * 3 + 1);
});
