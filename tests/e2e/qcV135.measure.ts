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
import { retiredV136 } from "./inkRetired";
import { test } from "@playwright/test";
import { KILL_MOTION } from "./measure";
import { HEADERS, Ledger, SIZES, near, open, prepare, readHeader } from "./qc135Lib";
import { column, sameRgb } from "./sh2Lib";

test.beforeEach(async ({ page }) => { await prepare(page); });

/* ── A1–A4 · the centred pair, on all three open headers ── */
/* RETIRED (header panel v2, 10 Oct): see tests/e2e/RETIRED-header-panel-v2.md. The three open headers are panels now: the centred pair on the header sheet is gone. HP2 P1, P5 and A1 hold the panel. */
test.skip("A1 A2 A3 A4 · the centred pair: one group on the sheet's centre, the drawing centred on the text and clear of the flap, one set of values", async ({ page }) => {
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
/* RETIRED (header panel v2, 10 Oct): see tests/e2e/RETIRED-header-panel-v2.md. HP2 P6 holds no-jump on every workspace route. */
test.skip("A5 · header no jump: each open header is the same box, on the same grid, loading and loaded", async ({ page }) => {
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

/* ════════ B · the Query Centre's badge desk ════════ */
const COURTS = [
  { key: "you", c: "rgb(176, 96, 62)", cl: "rgb(246, 226, 216)", c40: "rgba(176, 96, 62, 0.4)", label: "Talon pointing at you", title: "With you" },
  { key: "agent", c: "rgb(61, 80, 112)", cl: "rgb(226, 231, 239)", c40: "rgba(61, 80, 112, 0.4)", label: "Thumbing at someone else", title: "With agents" },
  { key: "closed", c: "rgb(124, 113, 104)", cl: "rgb(236, 232, 227)", c40: "rgba(124, 113, 104, 0.4)", label: "Talons laced, bad news", title: "Closed" },
] as const;

/** Every card of the desk, read off the page on screen. */
async function readDesk(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const b = (e: Element | null | undefined) => { if (!e) return null; const x = e.getBoundingClientRect(); return { l: x.left, t: x.top, r: x.right, b: x.bottom, w: x.width, h: x.height }; };
    const win = document.querySelector<HTMLElement>(".ws-window");
    const desk = [...document.querySelectorAll<HTMLElement>('[data-qcv="courts"]')].find((e) => e.getBoundingClientRect().height > 0) ?? null;
    const sc = desk?.closest<HTMLElement>(".wpg-scroll") ?? null;
    const cards = [...(desk?.querySelectorAll<HTMLElement>('[data-qcv="court"]') ?? [])].map((card) => {
      const q = (s: string) => card.querySelector<HTMLElement>(s);
      const badge = q('[data-qcv="court-badge"]'), strip = q('[data-qcv="court-strip"]'), title = q('[data-qcv="court-title"]'), art = q('[data-qcv="court-art"]'), img = art?.querySelector("img") ?? null;
      const svg = card.querySelectorAll('[data-qcv="court-trend"]'), mom = q('[data-qcv="court-mom"]'), ch = q('[data-qcv="court-chart"]');
      const bf = getComputedStyle(card, "::before"), ccs = getComputedStyle(card);
      const cb = card.getBoundingClientRect();
      const labels = [...card.querySelectorAll<HTMLElement>('[data-qcv="court-label"]')];
      const inside = [...card.querySelectorAll<HTMLElement>("*")].filter((e) => !e.closest('[data-qcv="court-badge"]')).map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0);
      return {
        key: card.dataset.court ?? "", loading: card.dataset.loading === "true", box: b(card), shadow: ccs.boxShadow, pressed: q('[data-qcv="court-pick"]')?.getAttribute("aria-pressed") ?? null,
        badge: b(badge), badgeShadow: badge ? getComputedStyle(badge).boxShadow : "", badgeBg: badge ? getComputedStyle(badge).backgroundColor : "", count: (q('[data-qcv="court-count"]')?.textContent ?? "").trim(),
        strip: b(strip), stripBg: strip ? getComputedStyle(strip).backgroundColor : "", titleFace: title ? getComputedStyle(title).fontFamily : "", titleColour: title ? getComputedStyle(title).color : "", titleText: title?.textContent ?? "",
        before: { content: bf.content, top: parseFloat(bf.top), left: parseFloat(bf.left), right: parseFloat(bf.right), bottom: parseFloat(bf.bottom), w: parseFloat(bf.borderTopWidth), colour: bf.borderTopColor, display: bf.display, events: bf.pointerEvents },
        art: b(art), artHidden: art?.getAttribute("aria-hidden") ?? null, artText: (art?.textContent ?? "").trim(), artBorder: art ? `${getComputedStyle(art).borderTopStyle} ${parseFloat(getComputedStyle(art).borderTopWidth)}` : "", img: b(img), imgFit: img ? getComputedStyle(img).objectFit : null, imgOk: img ? (img as HTMLImageElement).naturalWidth > 0 : false,
        tiles: card.querySelectorAll('[data-qcv="court-tile"]').length, charts: svg.length, chart: b(svg[0]), chartBox: b(ch),
        mom: b(mom), momLh: mom ? parseFloat(getComputedStyle(mom).lineHeight) : 0, momText: (mom?.textContent ?? "").trim(),
        labels: labels.map((l) => ({ h: l.getBoundingClientRect().height, r: l.getBoundingClientRect().right, lh: parseFloat(getComputedStyle(l).lineHeight) })),
        overflow: card.scrollWidth - card.clientWidth, spill: Math.max(0, ...inside.map((r) => r.right - cb.right)),
      };
    });
    return {
      win: b(win), pageBg: win ? getComputedStyle(win).backgroundColor : "", desk: b(desk), cards,
      overflowX: Math.max(document.documentElement.scrollWidth - document.documentElement.clientWidth, sc ? sc.scrollWidth - sc.clientWidth : 0),
      showing: document.querySelector<HTMLElement>('[data-qcv="showing"]')?.textContent ?? null,
      ru: (document.querySelector<HTMLElement>('[data-qcv="ru"]')?.textContent ?? "").slice(0, 400),
    };
  });
}
async function openDesk(page: import("@playwright/test").Page, vp: { width: number; height: number }) {
  await open(page, "/queries", vp);
  await page.locator('[data-qcv="court"][data-loading="false"]').first().waitFor({ timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(400);
}

test("B1 B2 B3 B4 B5 B6 · the badge, the tinted strip, the inner border, the placeholder, the body, and no overflow", async ({ page }) => {
  test.skip(true, retiredV136("the v135 badge card: its badge, tinted strip, inner border, art placeholder and chart; v136's bands draw none of them", "QC136 B1–B5"));
  const B1 = new Ledger("B1"), B2 = new Ledger("B2"), B3 = new Ledger("B3"), B4 = new Ledger("B4"), B5 = new Ledger("B5"), B6 = new Ledger("B6");
  const all = [B1, B2, B3, B4, B5, B6];
  for (const vp of SIZES) {
    await openDesk(page, vp);
    const r = await readDesk(page);
    for (const L of all) L.check(`${L.name} population: three v135 cards, loaded and on screen`, `@${vp.width}`, r.cards.length === 3 && r.cards.every((c) => !c.loading && !!c.box && !!c.badge && !!c.strip && c.box.b < vp.height), `${r.cards.length} cards · ${r.cards.filter((c) => c.badge).length} badges`);
    for (const c of r.cards) {
      const k = COURTS.find((x) => x.key === c.key); const w = `${c.key} @${vp.width}`;
      if (!k || !c.box || !c.badge || !c.strip) { for (const L of all) L.check(`${L.name} a v135 card to measure`, w, false, "absent"); continue; }
      B1.check("B1 the badge is 64 (±1) and round", w, near(c.badge.w, 64, 1) && near(c.badge.h, 64, 1), `${c.badge.w.toFixed(1)}×${c.badge.h.toFixed(1)}`);
      B1.check("B1 its top is 26 (±1) above the card's top, its left 16 (±1) in", w, near(c.box.t - c.badge.t, 26, 1) && near(c.badge.l - c.box.l, 16, 1), `above ${(c.box.t - c.badge.t).toFixed(1)} left ${(c.badge.l - c.box.l).toFixed(1)}`);
      B1.check("B1 the ring is the court's colour, 4px", w, c.badgeShadow.includes(`${k.c} 0px 0px 0px 4px`), c.badgeShadow.slice(0, 90));
      B1.check("B1 the halo is the colour of what the desk sits on (the page), 9px", w, r.pageBg !== "" && c.badgeShadow.includes(`${r.pageBg} 0px 0px 0px 9px`), `halo in ${c.badgeShadow.slice(0, 110)} · page ${r.pageBg}`);
      /* painted: above the card, 6.5px outside the disc is the halo, and it is the page's own pixel 16px further up */
      const hx = c.badge.l + c.badge.w / 2;
      const col = await column(page, hx, c.badge.t - 14, c.badge.t - 5);
      const halo = col[7], above = col[0], pageRgb = (r.pageBg.match(/\d+/g) ?? []).map(Number);
      B1.check("B1 painted: the halo is the page's colour, and the page just above it is within 3 levels (it clears the flap's shadow)", w, sameRgb(halo, pageRgb, 1) && sameRgb(above, pageRgb, 3), `halo ${halo} · 5px above it ${above} · page ${pageRgb}`);
      B1.check("B1 the badge states the count", w, /^\d+$/.test(c.count), `"${c.count}"`);
      B2.check("B2 the strip's background is the court's tint", w, c.stripBg === k.cl, c.stripBg);
      B2.check("B2 the strip is 64 (±1) tall, at the card's top, the card's width", w, near(c.strip.h, 64, 1) && near(c.strip.t, c.box.t, 0.5) && near(c.strip.w, c.box.w, 0.5), `${c.strip.w.toFixed(1)}×${c.strip.h.toFixed(1)}`);
      B2.check("B2 the title is exact, Special Elite, in the court's colour", w, c.titleText === k.title && /Special Elite/.test(c.titleFace) && c.titleColour === k.c, `"${c.titleText}" ${c.titleFace.slice(0, 20)} ${c.titleColour}`);
      B3.check("B3 the inner border is drawn 6 (±0.5) inside every edge", w, c.before.content !== "none" && c.before.display !== "none" && [c.before.top, c.before.left, c.before.right, c.before.bottom].every((v) => near(v, 6, 0.5)), `${c.before.display} inset ${c.before.top}/${c.before.right}/${c.before.bottom}/${c.before.left}`);
      B3.check("B3 its line is the court's colour at 40%, and it takes no pointer", w, c.before.colour === k.c40 && c.before.w >= 1 && c.before.events === "none", `${c.before.w}px ${c.before.colour} ${c.before.events}`);
      const a = c.art;
      B4.check("B4 the placeholder sits inside the strip, 12 (±1) from its right edge", w, !!a && a.t >= c.strip.t && a.b <= c.strip.b && near(c.strip.r - a.r, 12, 1), a ? `right inset ${(c.strip.r - a.r).toFixed(1)}, ${a.t.toFixed(1)}–${a.b.toFixed(1)} in ${c.strip.t.toFixed(1)}–${c.strip.b.toFixed(1)}` : "absent");
      B4.check("B4 its vertical centre is the strip's (±1)", w, !!a && near((a.t + a.b) / 2, (c.strip.t + c.strip.b) / 2, 1), a ? `${((a.t + a.b) / 2).toFixed(1)} vs ${((c.strip.t + c.strip.b) / 2).toFixed(1)}` : "absent");
      B4.check("B4 it is 60 × 50, dashed, labelled exactly, and aria-hidden", w, !!a && near(a.w, 60, 1) && near(a.h, 50, 1) && /^dashed 1(\.5)?$/.test(c.artBorder) && c.artText === k.label && c.artHidden === "true", a ? `${a.w.toFixed(0)}×${a.h.toFixed(0)} ${c.artBorder} "${c.artText}" hidden ${c.artHidden}` : "absent");
      B5.check("B5 at least one tile, and one chart svg", w, c.tiles >= 1 && c.charts === 1, `${c.tiles} tiles, ${c.charts} charts`);
      B5.check("B5 the chart is 96 × 46 (±1)", w, !!c.chart && near(c.chart.w, 96, 1) && near(c.chart.h, 46, 1), c.chart ? `${c.chart.w.toFixed(1)}×${c.chart.h.toFixed(1)}` : "absent");
      B5.check("B5 the month-on-month line is on one line", w, !!c.mom && c.momText.length > 0 && c.mom.h <= c.momLh + 2, c.mom ? `"${c.momText}" ${c.mom.h.toFixed(1)} tall, line-height ${c.momLh}` : "absent");
      B6.check("B6 nothing in the card runs past its right edge", w, c.overflow <= 0 && c.spill <= 0.5, `scroll ${c.overflow}, spill ${c.spill.toFixed(1)}`);
      /* a label may run into the chart column's empty top corner (the reference's does at 1280); it may not wrap or leave the body */
      B6.check("B6 no tile label wraps, and every label ends inside the card's body", w, c.labels.length > 0 && c.labels.every((l) => l.h <= l.lh + 2 && l.r <= c.box!.r - 22), `${c.labels.map((l) => `${l.h.toFixed(0)}/${l.lh.toFixed(0)} →${l.r.toFixed(0)}`).join(" ")} · body ends ${(c.box.r - 22).toFixed(0)} · chart from ${c.chartBox?.l.toFixed(0)}`);
    }
    B6.check("B6 no sideways overflow on the page", `@${vp.width}`, r.overflowX <= 0, `${r.overflowX}`);
  }
  for (const L of all) L.write();
  B1.done(SIZES.length * 19); B2.done(SIZES.length * 10); B3.done(SIZES.length * 7); B4.done(SIZES.length * 10); B5.done(SIZES.length * 10); B6.done(SIZES.length * 8);
});

test("B7 · selected: a 2px ring in the court's colour, aria-pressed, and it chooses for Recently updated only", async ({ page }) => {
  test.skip(true, retiredV136("the selected badge card's ring in the court's colour; the v136 card's ring is navy", "QC136 B6"));
  const L = new Ledger("B7");
  for (const vp of SIZES) {
    await openDesk(page, vp);
    const before = await readDesk(page);
    for (const k of COURTS) {
      const w = `${k.key} @${vp.width}`;
      await page.locator(`[data-qcv="court"][data-court="${k.key}"] [data-qcv="court-pick"]`).click();
      await page.waitForTimeout(450);
      const r = await readDesk(page); const c = r.cards.find((x) => x.key === k.key);
      L.check("B7 the pressed card says so, and only it", w, c?.pressed === "true" && r.cards.filter((x) => x.pressed === "true").length === 1, `${r.cards.map((x) => `${x.key} ${x.pressed}`).join(" · ")}`);
      L.check("B7 its outer ring is 2px in the court's colour", w, !!c && c.shadow.includes(`${k.c} 0px 0px 0px 2px`) && !/inset/.test(c.shadow), c?.shadow.slice(-80) ?? "absent");
      L.check("B7 the list's count is untouched", w, r.showing !== null && r.showing === before.showing, `"${r.showing}" was "${before.showing}"`);
      await page.locator(`[data-qcv="court"][data-court="${k.key}"] [data-qcv="court-pick"]`).click();
      await page.waitForTimeout(300);
    }
    /* Recently updated answers the choice: with Closed chosen it differs from with With you chosen */
    await page.locator('[data-qcv="court"][data-court="you"] [data-qcv="court-pick"]').click(); await page.waitForTimeout(450);
    const you = (await readDesk(page)).ru;
    await page.locator('[data-qcv="court"][data-court="closed"] [data-qcv="court-pick"]').click(); await page.waitForTimeout(450);
    const closed = (await readDesk(page)).ru;
    L.check("B7 Recently updated answers the choice", `@${vp.width}`, you.length > 20 && closed.length > 20 && you !== closed, `you "${you.slice(0, 60)}…" closed "${closed.slice(0, 60)}…"`);
    await page.locator('[data-qcv="court"][data-court="closed"] [data-qcv="court-pick"]').click();
  }
  L.done(SIZES.length * 10);
});

test("B8 · desk no jump: the cards, the badges, the strips and the chart boxes are the same boxes loading and loaded", async ({ page }) => {
  test.skip(true, retiredV136("the badge desk's loading frames", "QC136 B7"));
  const L = new Ledger("B8");
  await page.addInitScript(({ css }) => {
    (window as unknown as { __SA_QC_HOLD_MS: number }).__SA_QC_HOLD_MS = 6000;
    const put = () => { const s = document.createElement("style"); s.textContent = css; document.documentElement.appendChild(s); };
    if (document.documentElement) put(); else document.addEventListener("readystatechange", put, { once: true });
  }, { css: KILL_MOTION });
  await open(page, "/dashboard", SIZES[0]);
  for (const vp of SIZES) {
    await page.setViewportSize(vp);
    await page.goto("/queries");
    await page.locator('[data-qcv="court"][data-loading="true"]').first().waitFor({ timeout: 20_000 }).catch(() => {});
    const a = await readDesk(page);
    await page.locator('[data-qcv="court"][data-loading="false"]').first().waitFor({ timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(900);
    const b = await readDesk(page);
    L.check("B8 precondition: read loading, then loaded", `@${vp.width}`, a.cards.length === 3 && a.cards.every((c) => c.loading) && b.cards.length === 3 && b.cards.every((c) => !c.loading), `first ${a.cards.map((c) => c.loading).join()} then ${b.cards.map((c) => c.loading).join()}`);
    type Bx = { l: number; t: number; w: number; h: number } | null;
    const same = (x: Bx, y: Bx) => !!x && !!y && near(x.l, y.l, 1) && near(x.t, y.t, 1) && near(x.w, y.w, 1) && near(x.h, y.h, 1);
    const f = (x: Bx) => (x ? `${x.l.toFixed(0)},${x.t.toFixed(0)} ${x.w.toFixed(0)}×${x.h.toFixed(0)}` : "absent");
    for (let i = 0; i < 3; i++) {
      const x = a.cards[i], y = b.cards[i]; const w = `${y?.key ?? i} @${vp.width}`;
      L.check("B8 the card's box (±1)", w, same(x?.box ?? null, y?.box ?? null), `${f(x?.box ?? null)} → ${f(y?.box ?? null)}`);
      L.check("B8 the badge is there while loading, blank, in the same box (±1)", w, same(x?.badge ?? null, y?.badge ?? null) && x?.count === "", `${f(x?.badge ?? null)} → ${f(y?.badge ?? null)} · loading count "${x?.count}"`);
      L.check("B8 the strip and the chart box (±1)", w, same(x?.strip ?? null, y?.strip ?? null) && same(x?.chart ?? null, y?.chart ?? null), `strip ${f(x?.strip ?? null)} → ${f(y?.strip ?? null)} · chart ${f(x?.chart ?? null)} → ${f(y?.chart ?? null)}`);
    }
  }
  L.done(SIZES.length * 10);
});

test("B9 · art slot: with a slot filled, the image is in the placeholder's box and the dashed border is gone", async ({ page }) => {
  test.skip(true, retiredV136("the desk's art slots; the v136 bands have none (the QC_DESK_ART_* slots stay registered and unread)", "nothing: no art is drawn on this desk"));
  const L = new Ledger("B9");
  const vp = SIZES[0];
  await openDesk(page, vp);
  const empty = await readDesk(page);
  await page.addInitScript(() => { (window as unknown as { __SA_QC_DESK_ART: Record<string, string> }).__SA_QC_DESK_ART = { you: "/images/qc/be-hawk-head.png" }; });
  await openDesk(page, vp);
  await page.waitForTimeout(600);
  const r = await readDesk(page);
  const was = empty.cards.find((c) => c.key === "you"), you = r.cards.find((c) => c.key === "you"), other = r.cards.find((c) => c.key === "agent");
  L.check("B9 precondition: the slot was empty and a placeholder was drawn", "you", !!was?.art && !was.img && /^dashed 1(\.5)?$/.test(was.artBorder), `${was?.artBorder} img ${!!was?.img}`);
  L.check("B9 the image is loaded and fills the same box (±1)", "you", !!you?.img && you.imgOk && !!you.art && !!was?.art && near(you.art.l, was.art.l, 1) && near(you.art.t, was.art.t, 1) && near(you.art.w, was.art.w, 1) && near(you.art.h, was.art.h, 1) && near(you.img.w, you.art.w, 1) && near(you.img.h, you.art.h, 1), you?.img && you.art ? `box ${you.art.w.toFixed(0)}×${you.art.h.toFixed(0)} img ${you.img.w.toFixed(0)}×${you.img.h.toFixed(0)} loaded ${you.imgOk}` : "no image");
  L.check("B9 it is contained, with no dashed border and no label", "you", you?.imgFit === "contain" && /^none 0$|^\w+ 0$/.test(you.artBorder) && you.artText === "", `${you?.imgFit} · border ${you?.artBorder} · text "${you?.artText}"`);
  L.check("B9 an empty slot beside it is still a placeholder", "agent", /^dashed 1(\.5)?$/.test(other?.artBorder ?? "") && !other.img, `${other?.artBorder}`);
  L.done(4);
});
