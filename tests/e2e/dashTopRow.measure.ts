/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * dashTopRow — the dashboard's top row and its bar, measured on a rendered page (v33, 18 Sep; the v34
 * mockup, 19 Sep — ref design-refs/dashboard-v34.html, which the comparison now reads).
 *
 * What is here is what no source lock can see: that the three cards are one height, that the row
 * does not creep when the window is dragged wider and back, that the Mentor's claws are on the chart's
 * baseline, that the ring's largest slice is under the Archivist's head, that the two files of each
 * illustration pair land in one box, and that the Mentor's cross-dissolve never lets the card show
 * through him.
 *
 * ⚠️ EVERY ASSERTION ABOUT A PROPERTY, NOT A NUMBER. The ref's pixel positions are REPORTED (card-
 * relative first, because the app's page inset and shell differ from the mockup's by design); what
 * is ASSERTED is the relationship the number stood for.
 *
 * ⚠️ THE HARNESS ACCOUNT'S DATA DECIDES WHICH BRANCHES RUN, so the report states which did: how many
 * pins, whether the minimap is up, which slices are non-zero. A branch that did not run is named as
 * not run rather than passed.
 */
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { liftMotionSuppression, openRoute } from "./measure";
import { readPng } from "./pngPixels";

const OUT = resolve(process.env.SA_DASH_TOPROW_OUT ?? "test-results/dash-toprow");

async function openDash(page: Page, w: number, h: number) {
  await openRoute(page, "/dashboard", { width: w, height: h });
  await expect(page.locator(".os-skelpage"), "the loading cover must leave before anything is read").toHaveCount(0, { timeout: 30_000 });
  await expect(page.locator(".os-root [data-probe='row1']").first()).toBeVisible({ timeout: 30_000 });
  /* the data has landed when the chart's title states a figure — "Active queries" alone is the
     loading title, so polling for a digit or "No" cannot be satisfied by a page still resolving */
  await expect.poll(() => page.evaluate(() => document.querySelector(".os-root [data-probe-text='chart-title']")?.textContent ?? ""),
    { timeout: 30_000 }).toMatch(/^(\d|No )/);
  await settle(page);
}
async function settle(page: Page) {
  await page.waitForTimeout(500);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

/** One reading, one frame. A real function — no template literal, so no escape is eaten. */
function read() {
  const root = document.querySelector(".os-root") as HTMLElement;
  const q = (s: string) => root.querySelector(s) as HTMLElement | null;
  const rd = (n: number) => Math.round(n * 10) / 10;
  const box = (el: Element | null) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: rd(r.x), y: rd(r.y), w: rd(r.width), h: rd(r.height), r: rd(r.right), b: rd(r.bottom) };
  };
  const rel = (el: Element | null, to: Element | null) => {
    const a = box(el), b = box(to);
    return a && b ? { x: rd(a.x - b.x), y: rd(a.y - b.y), w: a.w, h: a.h } : null;
  };
  const cards = { qa: q("[data-probe='quick-actions']"), chart: q("[data-probe='chart-card']"), closed: q("[data-probe='closed-tile']") };
  const chartFrame = q("[data-probe='chart-card-frame']");
  const plotBox = q("[data-probe='plot-box']");
  const svg = q("[data-probe='plot']");
  const mentor = q("[data-probe='mentor']");
  const ground = q(".os-acground");
  const ringbox = q("[data-probe='ringbox']");
  const arch = [...root.querySelectorAll(".os-ringbox .os-arch")] as HTMLElement[];
  const titles = [...root.querySelectorAll(".os-band .os-cardttl")] as HTMLElement[];
  const axis = [...root.querySelectorAll("[data-probe='chart-axis'] span")] as HTMLElement[];
  const mentorImgs = mentor ? [...mentor.querySelectorAll("img")] as HTMLElement[] : [];
  /* the ring: each arc's share and where its centre ends up after the svg's own rotation */
  const ring = q("[data-probe='ring']");
  const rot = ring ? Number((ring.style.transform.match(/rotate\(([-\d.]+)deg\)/) ?? [])[1] ?? 0) : 0;
  const C = 2 * Math.PI * 60;
  const arcs = [...root.querySelectorAll("[data-probe='closed-arc']")].map((a) => {
    const len = Number((a.getAttribute("stroke-dasharray") ?? "0").split(" ")[0]) + 3; /* the dash is the arc less its 3-unit gap */
    const off = -Number(a.getAttribute("stroke-dashoffset") ?? 0);
    const centre = ((off + len / 2) / C) * 360 + rot; /* degrees clockwise from 12 o'clock */
    return { key: a.getAttribute("data-bucket"), share: rd((len / C) * 100), centre: rd(((centre % 360) + 360) % 360) };
  });
  const st = (el: Element | null) => (el ? getComputedStyle(el) : null);
  return {
    vw: window.innerWidth,
    row1: box(q("[data-probe='row1']")),
    cards: { qa: box(cards.qa), chart: box(cards.chart), closed: box(cards.closed) },
    bands: {
      qa: box(q("[data-probe='quick-actions-band']")), chart: box(q("[data-probe='chart-card-band']")),
      closed: box(q("[data-probe='closed-tile-band']")), feed: box(q("[data-probe='activity-card-band']")), todo: box(q("[data-probe='todo-card-band']")),
    },
    bandFills: Object.fromEntries(["quick-actions", "chart-card", "closed-tile", "activity-card", "todo-card"].map((k) => [k, st(q(`[data-probe='${k}-band']`))?.backgroundColor ?? null])),
    rim: { bg: st(cards.chart)?.backgroundColor, radius: st(cards.chart)?.borderRadius, frameBorder: st(chartFrame)?.borderTopColor, frameRadius: st(chartFrame)?.borderRadius },
    titles: titles.map((t) => ({ text: t.textContent, fits: t.scrollWidth <= t.clientWidth + 1, lines: Math.round(t.getBoundingClientRect().height / parseFloat(getComputedStyle(t).lineHeight)), size: getComputedStyle(t).fontSize })),
    plot: box(plotBox), plotInChart: rel(plotBox, cards.chart),
    svg: box(svg), svgPosition: st(svg)?.position, drawPosition: st(q(".os-acdraw"))?.position,
    viewBox: svg?.getAttribute("viewBox") ?? null,
    series: svg?.getAttribute("data-series") ?? null,
    mentor: box(mentor), mentorInChart: rel(mentor, cards.chart),
    mentorImgs: mentorImgs.map((i) => box(i)),
    mentorBlend: mentorImgs.map((i) => ({ blend: getComputedStyle(i).mixBlendMode, transition: getComputedStyle(i).transitionTimingFunction + " " + getComputedStyle(i).transitionDuration })),
    mentorIsolation: st(mentor)?.isolation ?? null,
    groundY: ground ? rd(ground.getBoundingClientRect().top) : null,
    frameInnerRight: chartFrame ? rd(chartFrame.getBoundingClientRect().right - 1) : null,
    ringbox: box(ringbox), ringInClosed: rel(ringbox, cards.closed),
    arch: arch.map((a) => ({ cls: a.className, box: box(a) })), archInClosed: rel(arch[0] ?? null, cards.closed),
    arcs, rot,
    axis: axis.map((s) => ({ text: s.textContent, oneLine: s.getBoundingClientRect().height < 40 })),
    minimap: !!q("[data-probe='minimap']"),
    pins: root.querySelectorAll("[data-probe='chart-pin']").length,
    glyphs: [...root.querySelectorAll(".os-acglyph")].map((g) => box(g)),
    discs: [...root.querySelectorAll(".os-acdisc")].map((g) => box(g)),
    shadow: box(q("[data-probe='greet-shadow'] img")), shadowOpacity: st(q("[data-probe='greet-shadow'] img"))?.opacity ?? null,
    hello: box(q(".os-hello")),
    /* ── the v34 mockup ── */
    qaHero: box(q("[data-probe='qa-hero']")), qaName: cards.qa?.getAttribute("aria-label") ?? null, qaRole: cards.qa?.getAttribute("role") ?? null,
    qaBand: box(q("[data-probe='quick-actions-band']")),
    range: box(q("[data-probe='minimap-track']")), rangeWin: box(q("[data-probe='minimap-window']")),
    rangeName: q("[data-probe='minimap-window']")?.getAttribute("aria-label") ?? null,
    rangeTitle: q("[data-probe='minimap']")?.getAttribute("title") ?? null,
    rangeLabels: root.querySelectorAll(".os-mmlab").length,
    chartFrame: box(chartFrame), chartTitle: box(q("[data-probe-text='chart-title']")),
    bar: box(document.querySelector(".ws-pagebar")),
    barSolid: !!document.querySelector(".ws-pagebar.is-solid"),
    barGround: (() => { const b = document.querySelector(".ws-pagebar"); return b ? getComputedStyle(b, "::before").opacity : null; })(),
    barPosition: st(document.querySelector(".ws-pagebar"))?.position ?? null,
    search: box(document.querySelector("[data-probe='search']")), searchFrame: box(document.querySelector("[data-probe='search'] .sp-search-f")),
    searchFace: st(document.querySelector("[data-probe='search'] .sp-search-l"))?.fontFamily ?? null,
    searchKey: document.querySelector("[data-probe='search'] .sp-search-k")?.textContent ?? null,
    feedback: box(document.querySelector("[data-probe='feedback']")), feedbackText: document.querySelector("[data-probe='feedback']")?.textContent?.trim() ?? null,
    help: box(document.querySelector(".ws-pagebar .ws-help")), toggle: box(document.querySelector(".ws-pagebar .sb-toggle")),
    scrollPad: st(document.querySelector(".ws-wbody"))?.scrollPaddingTop ?? null,
    brand: { mark: box(document.querySelector(".ws-bmark")), word: st(document.querySelector(".ws-bwm"))?.fontSize ?? null, src: document.querySelector(".ws-bmark")?.getAttribute("src") ?? null },
    pageScrollW: document.documentElement.scrollWidth,
  };
}
type Reading = ReturnType<typeof read>;

const report: Record<string, unknown> = {};
test.beforeAll(() => { mkdirSync(OUT, { recursive: true }); });
test.afterAll(() => { writeFileSync(resolve(OUT, "report.json"), JSON.stringify(report, null, 2)); });

const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;

function structuralGlyphs(r: Reading, label: string) {
  const g = r.glyphs.filter(Boolean) as { x: number; y: number; w: number; h: number }[];
  for (let i = 0; i < g.length; i += 1) for (let j = i + 1; j < g.length; j += 1) {
    const d = Math.hypot(g[i].x + g[i].w / 2 - (g[j].x + g[j].w / 2), g[i].y + g[i].h / 2 - (g[j].y + g[j].h / 2));
    expect(d, `${label}: pin glyphs ${i} and ${j} are ${d.toFixed(1)}px apart, centre to centre — two 9.5px discs touch under 19`).toBeGreaterThanOrEqual(19);
  }
}

function structural(r: Reading, label: string) {
  const { qa, chart, closed } = r.cards;
  expect(qa && chart && closed, `${label}: the three cards are on the page`).toBeTruthy();
  /* one height, from `align-items: stretch` — asserted against EACH OTHER, never a literal */
  expect(near(qa!.h, chart!.h, 0.6) && near(chart!.h, closed!.h, 0.6), `${label}: the three top cards are one height (${qa!.h} / ${chart!.h} / ${closed!.h})`).toBe(true);
  expect(chart!.w, `${label}: the chart is the widest of the three`).toBeGreaterThan(Math.max(qa!.w, closed!.w));
  expect(r.titles.length, `${label}: four titled bands were found (quick actions has none since the v34 mockup)`).toBe(4);
  for (const t of r.titles) {
    expect(t.fits, `${label}: "${t.text}" fits its band`).toBe(true);
    expect(t.lines, `${label}: "${t.text}" is one line`).toBe(1);
  }
  for (const a of r.axis) expect(a.oneLine, `${label}: the axis label "${a.text}" is on one line`).toBe(true);
  expect(r.ringbox!.w, `${label}: the ring is at most 176px`).toBeLessThanOrEqual(176.5);
  expect(near(r.ringbox!.w, r.ringbox!.h, 0.6), `${label}: the ring box is square`).toBe(true);
  expect(r.pageScrollW, `${label}: nothing runs past the window`).toBeLessThanOrEqual(r.vw + 1);
  /* the negative-space check: whatever the data, no two pin glyphs may occupy the same pixels */
  structuralGlyphs(r, label);
}

/** The mockup, by the same ruler — so the comparison is two measurements, never a number typed in. */
function readRef() {
  const rd = (n: number) => Math.round(n * 10) / 10;
  const box = (sel: string) => { const el = document.querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); return { x: rd(r.x), y: rd(r.y), w: rd(r.width), h: rd(r.height), r: rd(r.right), b: rd(r.bottom) }; };
  const rel = (sel: string, to: string) => { const a = box(sel), b = box(to); return a && b ? { x: rd(a.x - b.x), y: rd(a.y - b.y), w: a.w, h: a.h } : null; };
  const ground = document.querySelector(".activeq .ground");
  return {
    row1: box(".row1"), cards: { qa: box(".qa2"), chart: box(".activeq"), closed: box(".closedq") },
    bands: { qa: null, chart: box(".activeq .hd"), closed: box(".closedq .hd"), feed: box(".feed .hd"), todo: box(".todo .hd") },
    plot: box(".activeq .plot"), plotInChart: rel(".activeq .plot", ".activeq"), svg: box("#aq"),
    mentor: box(".surveyor"), mentorInChart: rel(".surveyor", ".activeq"),
    groundY: ground ? rd(ground.getBoundingClientRect().top) : null,
    ringbox: box(".ringbox"), ringInClosed: rel(".ringbox", ".closedq"),
    arch: box(".arch.back"), archInClosed: rel(".arch.back", ".closedq"),
    shadow: box(".greetshadow img"), hello: box(".hello"),
    range: box(".mini-map.compact .track"), chartFrame: box(".activeq .frame"), chartTitle: box(".activeq .hd h3"),
    qaHero: box(".qa2 .hero"), search: box(".search"), searchFrame: box(".sfr"), feedback: box(".fb"), help: box(".help"), top: box(".top"),
  };
}

test.describe("dashboard top row — v33", () => {
  test("the ref, by the same ruler — reported beside the page, card-relative first", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 860 });
    await page.goto("file://" + resolve("design-refs/dashboard-v34.html"));
    await page.waitForTimeout(1200);
    await page.evaluate(() => (document as unknown as { fonts: { ready: Promise<unknown> } }).fonts.ready);
    const ref = await page.evaluate(readRef);
    report.ref = ref;
    /* the numbers the brief quotes are the ref's own, or this comparison is against something else */
    expect([ref.cards.qa!.w, ref.cards.chart!.w, ref.cards.closed!.w].map(Math.round)).toEqual([228, 556, 312]);
    /* the v34 mockup's own quoted figures — if these are not the ref's, the comparison is against another file */
    expect([Math.round(ref.range!.w), Math.round(ref.range!.h)], "the range control in the band").toEqual([178, 24]);
    /* 276 in the brief, measured in a desktop browser; headless Chromium lays the ref's web fonts out ~2px shorter */
    expect(Math.abs(ref.plot!.h - 276), `the plot takes the freed height (${ref.plot!.h})`).toBeLessThanOrEqual(3);
    expect(Math.abs(ref.qaHero!.h - 286), `the quick-actions tile (${ref.qaHero!.h})`).toBeLessThanOrEqual(3);
    expect([ref.search!.w, ref.search!.h, ref.searchFrame!.w, ref.searchFrame!.h].map(Math.round)).toEqual([700, 60, 690, 50]);
    expect([Math.round(ref.feedback!.h), Math.round(ref.help!.w), Math.round(ref.help!.h)]).toEqual([50, 50, 50]);
    expect(Math.round(ref.shadow!.w)).toBe(500);
    expect(Math.round(ref.ringbox!.w)).toBe(176);
  });

  test("the reference width: geometry, reported against the ref's own numbers", async ({ page }) => {
    await openDash(page, 1440, 860);
    const r = await page.evaluate(read);
    report["1440x860"] = r;
    structural(r, "1440");

    /* the rim is the card's own white, never parchment; the frame is the burgundy line */
    expect(r.rim.bg).toBe("rgb(255, 255, 255)");
    expect(r.rim.frameBorder).toBe("rgb(124, 58, 42)");
    expect(r.rim.radius).toBe("16px");
    expect(r.rim.frameRadius).toBe("11px");
    /* the bands are coloured by what the card is about — five different fills */
    /* the v34 mockup: quick actions has no band — four bands, four meanings, and one card with a NAME only */
    const fills = Object.entries(r.bandFills).filter(([k]) => k !== "quick-actions").map(([, v]) => v);
    expect(new Set(fills).size, "four bands, four meanings").toBe(4);
    expect(r.qaBand, "the quick-actions header is gone, band and all").toBeNull();
    expect([r.qaRole, r.qaName], "…so the card is named for assistive tech").toEqual(["group", "Quick actions"]);
    expect(near(r.qaHero!.y, r.cards.qa!.y + 6 + 1 + 18, 1), "the tile starts at the top of the frame: rim 6 + line 1 + 18 of padding").toBe(true);
    expect(r.bandFills["chart-card"]).toBe("rgb(42, 58, 82)");

    /* ⚠️ THE DRAWING IS OUT OF THE FLOW — the fault that made the row creep */
    expect(r.drawPosition, "the drawing box is absolute inside the plot").toBe("absolute");
    expect(r.svgPosition).toBe("absolute");
    if (r.svg && r.viewBox) {
      const [, , vw, vh] = r.viewBox.split(" ").map(Number);
      expect(near(vw, r.svg.w, 1) && near(vh, r.svg.h, 1), `the viewBox is the drawn box (${r.viewBox} vs ${r.svg.w}×${r.svg.h})`).toBe(true);
    }

    /* ⚠️ THE MENTOR: back on the frame's inner edge, claws on the baseline */
    expect(r.mentor, "the Mentor is on the populated card").toBeTruthy();
    expect(near(r.mentor!.r, r.frameInnerRight!, 1.5), `his back is flush with the frame's inner right edge (${r.mentor!.r} vs ${r.frameInnerRight})`).toBe(true);
    const floor = r.mentor!.y + r.mentor!.h * 0.9705;
    expect(near(floor, r.groundY!, 1.5), `his claws (97.05% down the drawing: ${floor.toFixed(1)}) rest on the baseline rule (${r.groundY})`).toBe(true);
    expect(near(r.groundY!, r.plot!.y + r.plot!.h * 0.925, 1.5), "the baseline rule is 92.5% down the plot").toBe(true);
    /* the pair registers: two drawings, one box */
    expect(r.mentorImgs.length).toBe(2);
    expect(near(r.mentorImgs[0]!.x, r.mentorImgs[1]!.x, 0.2) && near(r.mentorImgs[0]!.y, r.mentorImgs[1]!.y, 0.2) && near(r.mentorImgs[0]!.w, r.mentorImgs[1]!.w, 0.2) && near(r.mentorImgs[0]!.h, r.mentorImgs[1]!.h, 0.2), "the Mentor's two drawings share one box").toBe(true);
    expect(r.mentorIsolation).toBe("isolate");
    expect(r.mentorBlend[1].blend, "the second drawing blends ADDITIVELY").toBe("plus-lighter");

    /* ⚠️ THE ARCHIVIST: four copies (back, back-looking, front, front-looking), one box */
    expect(r.arch.length).toBe(4);
    for (const a of r.arch) expect(near(a.box!.x, r.arch[0].box!.x, 0.2) && near(a.box!.y, r.arch[0].box!.y, 0.2) && near(a.box!.w, r.arch[0].box!.w, 0.2), `${a.cls} is in the same box as the first`).toBe(true);
    expect(near(r.arch[0].box!.w / r.ringbox!.w, 0.7159, 0.004), "he is 71.59% of the ring box — the size the wedge was computed for").toBe(true);

    /* ⚠️ THE 12 O'CLOCK RULE, AS A PROPERTY: whichever slice is largest, its centre is at the top */
    if (r.arcs.length) {
      const largest = [...r.arcs].sort((a, b) => b.share - a.share)[0];
      const off = Math.min(largest.centre, 360 - largest.centre);
      expect(off, `the largest slice (${largest.key}, ${largest.share}%) is centred at 12 o'clock — it is ${largest.centre}° round`).toBeLessThan(0.6);
    }
    /* ⚠️ NO TWO GLYPHS SHARE PIXELS — asserted over every pair, at every width `structural` runs at */
    /* a glyph sits on its disc */
    r.glyphs.forEach((g, i) => {
      const d = r.discs[i];
      if (!g || !d) return;
      expect(near(g.x + g.w / 2, d.x + d.w / 2, 1) && near(g.y + g.h / 2, d.y + d.h / 2, 1), `glyph ${i} is centred on its white disc`).toBe(true);
    });
    await page.screenshot({ path: resolve(OUT, "1440x860.png") });
  });

  for (const w of [1280, 1512, 1728]) {
    test(`three across at ${w}`, async ({ page }) => {
      await openDash(page, w, 900);
      const r = await page.evaluate(read);
      report[`${w}`] = { row1: r.row1, cards: r.cards, titles: r.titles, ringbox: r.ringbox, mentor: r.mentor, groundY: r.groundY };
      structural(r, String(w));
      const floor = r.mentor!.y + r.mentor!.h * 0.9705;
      expect(near(floor, r.groundY!, 1.5), `${w}: the Mentor's claws are on the baseline`).toBe(true);
      await page.screenshot({ path: resolve(OUT, `${w}.png`) });
    });
  }

  test("the row does not creep: 1280 → 2000 → 1280 without a reload", async ({ page }) => {
    await openDash(page, 1280, 900);
    const stops = [1280, 1440, 1600, 1760, 1920, 2000, 1760, 1512, 1280];
    const heights: { w: number; h: number }[] = [];
    for (const w of stops) {
      await page.setViewportSize({ width: w, height: 900 });
      await settle(page);
      const h = await page.evaluate(() => Math.round(document.querySelector(".os-root [data-probe='row1']")!.getBoundingClientRect().height * 10) / 10);
      heights.push({ w, h });
    }
    report.drag = heights;
    const hs = heights.map((x) => x.h);
    expect(hs[hs.length - 1], `back at 1280 the row is the height it started at (${JSON.stringify(heights)})`).toBe(hs[0]);
    expect(Math.max(...hs) - Math.min(...hs), `the row's height holds across the drag (${JSON.stringify(heights)})`).toBeLessThanOrEqual(12);
  });

  test("the stacked layout at 1180 — reported, and the four things asked", async ({ page }) => {
    await openDash(page, 1180, 1000);
    const r = await page.evaluate(read);
    report["1180"] = { row1: r.row1, cards: r.cards, titles: r.titles, ringbox: r.ringbox, ringInClosed: r.ringInClosed, mentor: r.mentor, groundY: r.groundY, plot: r.plot };
    for (const t of r.titles) expect(t.fits && t.lines === 1, `1180: "${t.text}" fits its band on one line`).toBe(true);
    expect(r.ringbox!.w).toBeLessThanOrEqual(176.5);
    const closed = r.cards.closed!;
    expect(near(r.ringbox!.x + r.ringbox!.w / 2, closed.x + closed.w / 2, 1.5), "1180: the ring is centred in its card").toBe(true);
    const floor = r.mentor!.y + r.mentor!.h * 0.9705;
    expect(near(floor, r.groundY!, 1.5), "1180: the Mentor's claws are on the baseline").toBe(true);
    structuralGlyphs(r, "1180");
    await page.screenshot({ path: resolve(OUT, "1180.png") });
  });

  test("the v34 mockup: the bar's controls, the control in the band, the tile, the brand", async ({ page }) => {
    await openDash(page, 1440, 860);
    const r = await page.evaluate(read);
    report["v34@1440"] = r;
    /* ── the range control: in the navy band, right of the title, never labelled ── */
    expect(r.minimap, "the harness account's campaign is long enough to have the control").toBe(true);
    const band = r.bands.chart!;
    expect(r.range!.y >= band.y && r.range!.b <= band.b, "the control is INSIDE the band").toBe(true);
    expect(near(r.range!.y + r.range!.h / 2, r.chartTitle!.y + r.chartTitle!.h / 2, 3), "…vertically centred on the title").toBe(true);
    expect(r.range!.x, "…to the title's right").toBeGreaterThan(r.chartTitle!.r);
    expect(near(r.range!.h, 24, 0.5)).toBe(true);
    expect(near(band.h, 62, 0.6), `side by side the band is still 62 (${band.h})`).toBe(true);
    expect(r.rangeLabels, "no DEC 2023, no TODAY").toBe(0);
    expect(r.rangeName, "its name states the visible range and that it drags").toMatch(/^Showing \d{1,2} [A-Z][a-z]{2} to \d{1,2} [A-Z][a-z]{2}\. Drag to change the dates\.$/);
    expect(r.rangeTitle).toBe(r.rangeName);
    /* ── the bar and the brand — RETARGETED (app shell v3, 26 Sep) ──
       The v34 bar (a 700px search field, 50px controls, the bar lying over the scroller) is superseded
       by the shell's one bar on every route; its geometry is locked in shellV3.measure (L5, L6, L8), so
       this case keeps only what is the dashboard's own: the greeting starts below the bar, and the brand
       is the v3 mark (30px, x 20 · y 16 of the sidebar) beside a 20px wordmark. */
    expect(r.hello!.y, "the greeting starts below the bar").toBeGreaterThan(r.bar!.b);
    expect([Math.round(r.brand.mark!.w), Math.round(r.brand.mark!.h), r.brand.word]).toEqual([30, 30, "20px"]);
    expect([Math.round(r.brand.mark!.x), Math.round(r.brand.mark!.y - (await page.evaluate(() => document.querySelector(".ws-panel")!.getBoundingClientRect().top)))], "the slot is x 20 · y 16 of the sidebar").toEqual([20, 16]);
    expect(r.brand.src).toContain("/images/app/queryhawk-mark.png?v=");
    await page.screenshot({ path: resolve(OUT, "v34-1440.png") });
  });

  test("the v34 mockup: at 1280 the control wraps INSIDE the band, and the three cards stay one height", async ({ page }) => {
    await openDash(page, 1280, 820);
    const r = await page.evaluate(read);
    report["v34@1280"] = { row1: r.row1, cards: r.cards, band: r.bands.chart, range: r.range, title: r.chartTitle };
    expect(r.cards.chart!.w, "the precondition: the card is 470px or narrower, or this is the side-by-side case again").toBeLessThanOrEqual(470);
    const band = r.bands.chart!;
    expect(r.range!.y, "the control is on its own line beneath the title").toBeGreaterThan(r.chartTitle!.b - 0.5);
    expect(r.range!.y >= band.y && r.range!.b <= band.b, "…still inside the navy band").toBe(true);
    expect(near(band.h, 97, 1), `the band is 97 when wrapped (${band.h})`).toBe(true);
    expect(near(r.range!.w, band.w - 44, 1.5), "…and takes the band's full line").toBe(true);
    structural(r, "1280 wrapped");
    await page.screenshot({ path: resolve(OUT, "v34-1280-wrapped.png") });
  });

  test("the v34 mockup: the window never passes the track, and a window in the past still dissolves", async ({ page }) => {
    await openDash(page, 1440, 860);
    const fill = () => page.evaluate(() => {
      const svg = document.querySelector(".os-root [data-probe='plot']")!;
      const g = svg.querySelector("[data-probe='chart-fill']")!;
      const last = svg.querySelector(".os-aclast")!;
      const d = g.querySelector("path")!.getAttribute("d")!;
      /* the fill's furthest x against the line's last point: a carry runs PAST it */
      const xs = [...d.matchAll(/[ML]\s*([\d.]+)\s+[\d.]+/g)].map((m) => Number(m[1]));
      return { masked: !!g.getAttribute("mask"), grain: !!svg.querySelector("filter feTurbulence"), fillRight: Math.max(...xs), lastX: Number(last.getAttribute("cx")),
        labels: [...document.querySelectorAll(".os-root [data-probe='chart-axis'] span")].map((e) => e.textContent).filter(Boolean) };
    });
    const geom = () => page.evaluate(() => {
      const t = document.querySelector(".os-root [data-probe='minimap-track']")!.getBoundingClientRect();
      const w = document.querySelector(".os-root [data-probe='minimap-window']")!.getBoundingClientRect();
      return { t: { x: t.x, r: t.right }, w: { x: w.x, r: w.right, w: w.width } };
    });
    const before = await fill();
    expect(before.masked && before.grain && before.fillRight > before.lastX + 20, "at today the end dissolves past the last point").toBe(true);
    let g = await geom();
    expect(g.w.r, `at today the window's right edge (${g.w.r}) does not pass the track's (${g.t.r})`).toBeLessThanOrEqual(g.t.r + 0.5);
    expect(g.w.w, "the window keeps its 22px minimum").toBeGreaterThanOrEqual(21.5);

    /* drag it into the past */
    await page.mouse.move(g.w.x + g.w.w / 2, (await page.locator(".os-root [data-probe='minimap-window']").boundingBox())!.y + 12);
    await page.mouse.down();
    await page.mouse.move(g.t.x + (g.t.r - g.t.x) * 0.45, (await page.locator(".os-root [data-probe='minimap-window']").boundingBox())!.y + 12, { steps: 12 });
    await page.mouse.up();
    await settle(page);
    const past = await fill();
    report.past = { before, past };
    expect(past.labels.join(","), "the precondition: the dates showing really changed").not.toBe(before.labels.join(","));
    expect(past.masked && past.grain && past.fillRight > past.lastX + 20, "⚠️ in the past the end STILL dissolves — carried on past the last visible point").toBe(true);
    await page.screenshot({ path: resolve(OUT, "v34-past-window.png") });

    /* and hard against both ends it stays inside */
    for (const to of [-400, 2000]) {
      const b = (await page.locator(".os-root [data-probe='minimap-window']").boundingBox())!;
      await page.mouse.move(b.x + b.width / 2, b.y + 12); await page.mouse.down();
      await page.mouse.move(b.x + to, b.y + 12, { steps: 8 }); await page.mouse.up();
      await settle(page);
      g = await geom();
      expect(g.w.x >= g.t.x - 0.5 && g.w.r <= g.t.r + 0.5, `dragged ${to > 0 ? "right" : "left"} to the stop, the window is inside the track (${JSON.stringify(g)})`).toBe(true);
    }
    /* put the device's remembered window back where it was */
    await page.evaluate(() => window.localStorage.removeItem("sa.dashChartWindowEnd"));
  });

  /* ⚠️ RETIRED (app shell v3, 26 Sep): "the shadow passes behind the bar at rest, and the bar takes the
     ground once scrolled". The dashboard's bar no longer lies over its scroller — it is the shell's one
     bar, in the flow and opaque on every route (D4), so there is no band for the greeting's shadow to
     pass behind and no transparent state to leave. The replacement claims — the bar's background IS the
     page's, and nothing but its one hairline sits between it and the content — are shellV3 L2. */

  /* ⚠️ THE SHARED CONTROLS ARE ONE SIZE ON EVERY PAGE (the v34 mockup — Nick: "a Help button that changes
     size between routes is worse than every page starting 16px lower"). Asserted against the DASHBOARD'S
     own readings, never a literal on both sides, over routes that draw the bar three different ways. */
  /* ⚠️ RETARGETED (app shell v3, 26 Sep): the law is unchanged — one size on every page, asserted
     against the dashboard's own readings — but the controls are v3's: the 34px collapse ring, the 36px
     icon search, the 36px outline feedback button and the 36px help circle, and no bar lies over a
     scroller any more, the dashboard's included. */
  test("the v34 mockup: the bar's shared controls are one size on every page", async ({ page }) => {
    const readBar = () => page.evaluate(() => {
      const rd = (n: number) => Math.round(n * 10) / 10;
      const bar = [...document.querySelectorAll(".ws-pagebar")].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
      const b = (sel: string) => { const el = bar.querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); return r.width ? { x: rd(r.x), y: rd(r.y), w: rd(r.width), h: rd(r.height), cy: rd(r.y + r.height / 2) } : null; };
      return { bar: { h: rd(bar.getBoundingClientRect().height), position: getComputedStyle(bar).position }, toggle: b(".sb-toggle"), help: b(".ws-help"), feedback: b(".ws-fb"),
        pill: b(".ws-search"), crumb: b(".ws-crumb"),
        /* ⚠️ `+ New` IS NOT A SHARED CONTROL ANY MORE — it was deleted from the bar on every route
           (Query Centre v11, phase 3, Nick's call). Its size was measured here as one of the set
           that must agree page to page, so with the button gone the set could never be met. It is
           counted as an ABSENCE below rather than dropped, because a silently missing control is
           how a lock stops meaning anything. */
        neu: bar.querySelectorAll(".ws-nbtn").length };
    });
    await openDash(page, 1440, 860);
    const dash = await readBar();
    expect(dash.bar.position, "the dashboard's bar is in the flow now").not.toBe("absolute");
    expect([dash.toggle!.w, dash.help!.w, dash.help!.h, dash.feedback!.h, dash.pill!.w, dash.pill!.h], "v3: toggle 34 · help 36 · feedback 36 tall · search 36").toEqual([34, 36, 36, 36, 36, 36]);
    const pages: Record<string, Awaited<ReturnType<typeof readBar>>> = { "/dashboard": dash };
    for (const route of ["/queries", "/todo", "/manuscripts", "/account"]) {
      await openRoute(page, route, { width: 1440, height: 860 });
      await settle(page);
      const r = await readBar();
      pages[route] = r;
      for (const k of ["toggle", "help", "feedback"] as const) {
        expect([r[k]!.w, r[k]!.h], `${route}: ${k} is the size it is on the dashboard`).toEqual([dash[k]!.w, dash[k]!.h]);
      }
      if (r.pill) {
        expect([r.pill.w, r.pill.h], `${route}: the search is the 36px icon it is on the dashboard`).toEqual([dash.pill!.w, dash.pill!.h]);
      }
      expect(r.neu, `${route}: + New is back in the bar — it was removed from every route`).toBe(0);
      if (r.crumb) expect(Math.abs(r.crumb.cy - r.help!.cy), `${route}: the breadcrumb is vertically centred in the taller bar`).toBeLessThanOrEqual(3);
      expect(r.bar.position, `${route}: no bar lies over a scroller`).not.toBe("absolute");
    }
    report.barEverywhere = pages;
    /* the population: the loop really met a pill and a crumb somewhere — `+ New` is no longer part
       of the set, so requiring it here would be requiring the thing the line above forbids */
    expect(Object.values(pages).filter((r) => r.pill && r.crumb).length).toBeGreaterThanOrEqual(3);
    await openRoute(page, "/queries", { width: 1440, height: 860 });
    await settle(page);
    await page.screenshot({ path: resolve(OUT, "v34-bar-queries.png"), clip: { x: 0, y: 0, width: 1440, height: 260 } });
    await page.setViewportSize({ width: 1060, height: 860 });
    await settle(page);
    const narrow = await readBar();
    report.barNarrow = narrow;
    expect([narrow.feedback!.w, narrow.feedback!.h], "under 1100 Give feedback is a 36px outline square with the pencil").toEqual([36, 36]);
    await page.screenshot({ path: resolve(OUT, "v34-bar-queries-1060.png"), clip: { x: 0, y: 0, width: 1060, height: 200 } });
  });

  test("hover states, the pin lock, and the Mentor's cross-dissolve", async ({ page }) => {
    await openDash(page, 1440, 860);
    await liftMotionSuppression(page);
    /* read with motion LIFTED — the harness's kill-switch zeroes every transition, so under it this
       reads "ease 0s" about a rule that is perfectly correct */
    const clocks = await page.evaluate(() => [...document.querySelectorAll(".os-root [data-probe='mentor'] img")].map((i) => `${getComputedStyle(i).transitionTimingFunction} ${getComputedStyle(i).transitionDuration}`));
    for (const c of clocks) expect(c, "the Mentor's two drawings fade on one linear 160ms clock").toBe("linear 0.16s");
    const tip = page.locator("[data-probe='dash-popup']");
    const svg = page.locator(".os-root [data-probe='plot']");
    const sb = (await svg.boundingBox())!;
    const states: Record<string, unknown> = {};

    /* week: well away from any pin's hit area, low in the plot */
    await page.mouse.move(sb.x + sb.width * 0.35, sb.y + sb.height * 0.86);
    await expect(tip).toHaveClass(/\bon\b/);
    await page.waitForTimeout(520);
    states.week = await tip.innerText();
    /* ⚠️ THE POPUP IS OUTSIDE `.os-root`, WHERE THE PAGE'S TOKENS DO NOT RESOLVE — so the ones its
       content inherits are carried across the portal, and this is the only place that can see whether
       they arrived: a token that resolves to nothing falls back in silence. */
    const carried = await tip.evaluate((el) => ({
      face: getComputedStyle(el.querySelector(".os-tip-big")!).fontFamily,
      hue: getComputedStyle(el).getPropertyValue("--sd-hue").trim(),
      pageHue: getComputedStyle(document.querySelector(".os-root")!).getPropertyValue("--sd-hue").trim(),
    }));
    states.carried = carried;
    expect(carried.face, "the popup's headline is set in the page's typewriter face").toContain("Special Elite");
    expect(carried.hue, "the popup's status glyphs read the page's own hue").toBe(carried.pageHue);
    expect(states.week as string, "the week popup names its week and states the active count").toMatch(/WEEK OF[\s\S]*active quer/i);
    /* ⚠️ THE ROWS SUM TO THE HEADLINE — read off the rendered popup, the composed result */
    const sum = await tip.evaluate((el) => {
      const head = Number((el.querySelector(".os-tip-big")?.textContent ?? "").replace(/[^\d]/g, ""));
      const rows = [...el.querySelectorAll(".os-tip-st b")].map((b) => Number((b.textContent ?? "").replace(/[^\d]/g, "")));
      return { head, rows, total: rows.reduce((a, b) => a + b, 0) };
    });
    states.weekSum = sum;
    if (sum.head > 0) expect(sum.total, `the breakdown (${sum.rows.join(" + ")}) sums to the headline (${sum.head})`).toBe(sum.head);
    expect(await page.locator(".os-root [data-probe='chart-axis'] span.at").count(), "the hovered week's axis bar is lit").toBe(1);
    await page.screenshot({ path: resolve(OUT, "hover-week.png") });

    /* the popup stays inside its own card */
    const card = (await page.locator(".os-root [data-probe='chart-card']").boundingBox())!;
    const tb = (await tip.boundingBox())!;
    expect(tb.x >= card.x + 5 && tb.x + tb.width <= card.x + card.width - 5 && tb.y >= card.y + 5 && tb.y + tb.height <= card.y + card.height - 5, "the chart's popup is inside the chart's card").toBe(true);

    /* pin: only if the account has a dated response in the window */
    const pins = await page.locator(".os-root [data-probe='chart-pin']").count();
    states.pins = pins;
    if (pins > 0) {
      const g = (await page.locator(".os-root .os-acglyph").first().boundingBox())!;
      await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
      await page.waitForTimeout(520);
      states.pin = await tip.innerText();
      expect(states.pin as string, "a pin's popup is the EVENT and carries no week").not.toMatch(/WEEK OF/i);
      expect(await page.locator(".os-root .os-acglyph.at").count(), "the hovered pin's glyph is scaled").toBe(1);
      await page.screenshot({ path: resolve(OUT, "hover-pin.png") });
      /* 30px off the glyph it is the week again */
      await page.mouse.move(g.x + g.width / 2 + 30, g.y + g.height / 2);
      await page.waitForTimeout(200);
      expect(await tip.innerText(), "30px off a glyph is already back to the week").toMatch(/WEEK OF/i);
    }

    /* slice and key row are one control */
    const arc = page.locator(".os-root [data-probe='closed-arc']").first();
    const hasArc = (await arc.count()) > 0;
    states.slices = await page.locator(".os-root [data-probe='closed-arc']").count();
    if (hasArc) {
      const key = await arc.getAttribute("data-bucket");
      const row = page.locator(`.os-root [data-probe='closed-row'][data-bucket='${key}']`);
      await row.hover();
      await page.waitForTimeout(520);
      states.row = await tip.innerText();
      expect(await page.locator(".os-root [data-probe='closed-arc'].at").count(), "hovering a key row lights its slice").toBe(1);
      expect(await row.evaluate((e) => e.classList.contains("at"))).toBe(true);
      await page.screenshot({ path: resolve(OUT, "hover-row.png") });
      /* the slice itself: a point ON the stroke — the arc's own geometry, mid-way along it */
      const pt = await arc.evaluate((el) => {
        const c = el as SVGCircleElement; const len = Number((c.getAttribute("stroke-dasharray") ?? "0").split(" ")[0]);
        const off = -Number(c.getAttribute("stroke-dashoffset") ?? 0);
        const p = (c as unknown as SVGGeometryElement).getPointAtLength(off + len / 2);
        const m = c.getScreenCTM()!; return { x: p.x * m.a + p.y * m.c + m.e, y: p.x * m.b + p.y * m.d + m.f };
      });
      await page.mouse.move(2, 2);
      await page.waitForTimeout(250);
      await page.mouse.move(pt.x, pt.y);
      await page.waitForTimeout(520);
      states.slice = await tip.innerText();
      await page.screenshot({ path: resolve(OUT, "hover-slice.png") });
      const cc = (await page.locator(".os-root [data-probe='closed-tile']").boundingBox())!;
      const t2 = (await tip.boundingBox())!;
      expect(t2.x >= cc.x + 5 && t2.x + t2.width <= cc.x + cc.width - 5, "the ring's popup is inside the closed card").toBe(true);

      /* pinned: a click pins, the OTHER chart then shows nothing, a click elsewhere releases */
      await row.click();
      await expect(tip).toHaveClass(/pinned/);
      const pinnedText = await tip.innerText();
      await page.mouse.move(sb.x + sb.width * 0.5, sb.y + sb.height * 0.86);
      await page.waitForTimeout(450);
      expect(await tip.innerText(), "while the ring's popup is pinned the chart shows no hover popup at all").toBe(pinnedText);
      await page.screenshot({ path: resolve(OUT, "pinned.png") });
      /* the same click that releases it pins the chart's */
      await page.mouse.click(sb.x + sb.width * 0.5, sb.y + sb.height * 0.86);
      await expect(tip).toHaveClass(/pinned/);
      expect(await tip.getAttribute("data-owner"), "one click: the ring's pin went and the chart's took its place").toBe("chart");
      await page.keyboard.press("Escape");
      await expect(tip).not.toHaveClass(/pinned/);
    }

    /* ⚠️ THE CROSS-DISSOLVE, MEASURED MID-FADE. With two plain fades his chest goes pale halfway
       (the card shows through); additively it holds its colour. Sample his chest at rest, then at
       ~80ms into the hover, and require the two within a small distance. */
    await page.mouse.move(2, 2);
    await page.waitForTimeout(400);
    const mentor = (await page.locator(".os-root [data-probe='mentor']").boundingBox())!;
    const clip = { x: Math.round(mentor.x + mentor.width * 0.5), y: Math.round(mentor.y + mentor.height * 0.5), width: 6, height: 6 };
    const rest = readPng(await page.screenshot({ clip })).at(3, 3);
    /* slow the clock so "mid-fade" is a moment a screenshot can land in */
    await page.addStyleTag({ content: ".os-mentor img { transition-duration: 1.6s !important; }" });
    await page.mouse.move(mentor.x - 120, mentor.y + 40);
    await page.waitForTimeout(800);
    const mid = readPng(await page.screenshot({ clip })).at(3, 3);
    const dist = Math.max(Math.abs(rest[0] - mid[0]), Math.abs(rest[1] - mid[1]), Math.abs(rest[2] - mid[2]));
    states.dissolve = { rest, mid, dist };
    expect(dist, `mid-fade his chest holds its colour (rest ${rest} · mid ${mid}) — a pale mid-point is the card showing through`).toBeLessThanOrEqual(14);
    report.states = states;
  });
});
