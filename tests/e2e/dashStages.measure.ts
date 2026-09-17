/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE DASHBOARD, STAGES 2–3 (17 Sep) — the centred block, the breakdown, the three-card row and the
 * bottom row, measured on a rendered page at the widths Nick named.
 *
 * ⚠️ EVERY CLAIM HERE IS ABOUT BOXES OR ABOUT WHAT WAS DRAWN, so none of it can live in a source lock:
 * that the page sits centred with no gap before the activity column, that five columns are equal,
 * that three cards are one height, that the closed tile's counts sum, that the page's figures
 * reconcile, and that the chart's dots sit on the line it drew. The unit suite proves the rules and
 * the markup were written; this proves the page laid them out.
 *
 * ⚠️ IT REPLACES `dashGrid.measure.ts` AND `dashChart.measure.ts`, both retired with their subjects:
 * the first measured a centre column (retired in v22) and the stat illustrations' blend (retired in
 * stage 1), the second the chart's bands and hover panel (retired in stage 3). The claims that still
 * have a subject — the column bottoms agree, the feed's content never grows the row — are carried here.
 *
 * ⚠️ THE HARNESS FORCES CLASSIC SCROLLBARS, so the page's window has a 15px gutter on each side that the
 * bar above it does not. Where the page measure binds, the two are centred on the same axis and their
 * edges agree exactly; below it they differ by the gutter, and by the toggle's clearance on the left.
 *
 *   SA_E2E_BASE_URL=http://127.0.0.1:<port> npx playwright test tests/e2e/dashStages.measure.ts
 *   optional: SA_DASH_STAGES_OUT=<dir>   SA_DASH_STAGES_MAX=1520 (a second page-measure candidate)
 *             SA_DASH_STAGES_WIDTHS=1920,1440,1280,1100,375
 */
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { KILL_MOTION, KILL_MOTION_ID, openRoute } from "./measure";

const OUT = resolve(process.env.SA_DASH_STAGES_OUT ?? "test-results/dash-stages");
const MAX = process.env.SA_DASH_STAGES_MAX ? Number(process.env.SA_DASH_STAGES_MAX) : null;
const ALL = [
  { w: 1920, h: 1400 },
  { w: 1440, h: 1400 },
  { w: 1280, h: 1400 },
  { w: 1100, h: 1800 },
  { w: 375, h: 3400 },
];
const PICK = (process.env.SA_DASH_STAGES_WIDTHS ?? "").split(",").map((s) => Number(s.trim())).filter(Boolean);
const WIDTHS = PICK.length ? ALL.filter((v) => PICK.includes(v.w)) : ALL;

async function openDash(page: Page, w: number, h: number) {
  /* sign in at desktop width, then move — at phone width the first shell element is the hidden sidebar */
  const narrow = w < 1025;
  await openRoute(page, "/dashboard", narrow ? { width: 1440, height: 900 } : { width: w, height: h });
  if (narrow) {
    await page.setViewportSize({ width: w, height: h });
    await page.reload();
    await page.addStyleTag({ content: `/*${KILL_MOTION_ID}*/${KILL_MOTION}` });
  }
  if (MAX) await page.addStyleTag({ content: `.dash-mode .ws-main { --dash-page-max: ${MAX}px !important; }` });
  await expect(page.locator(".os-skelpage"), "the loading cover must leave before anything is read").toHaveCount(0, { timeout: 30_000 });
  await expect(page.locator(".os-root [data-probe='breakdown']").first()).toBeVisible({ timeout: 30_000 });
  /* the data has landed when the breakdown states a figure */
  await expect.poll(() => page.evaluate(() => document.querySelector("[data-probe-text='breakdown-count']")?.textContent ?? ""),
    { timeout: 30_000 }).not.toBe("");
  await page.waitForTimeout(600);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

type Box = { x: number; y: number; w: number; h: number; r: number; b: number };

/** One reading, one frame. A real function — no template literal, so no escape is eaten. */
function read() {
  const root = document.querySelector(".os-root") as HTMLElement;
  const q = (s: string) => root.querySelector(s);
  const qa = (s: string) => [...root.querySelectorAll(s)];
  const rd = (n: number) => Math.round(n * 10) / 10;
  const box = (el: Element | null): Box | null => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: rd(r.x), y: rd(r.y), w: rd(r.width), h: rd(r.height), r: rd(r.right), b: rd(r.bottom) };
  };
  const inner = (el: Element) => {
    const r = el.getBoundingClientRect(), s = getComputedStyle(el);
    return { left: rd(r.x + parseFloat(s.paddingLeft)), right: rd(r.right - parseFloat(s.paddingRight)) };
  };
  const txt = (s: string) => q(`[data-probe-text='${s}']`)?.textContent ?? null;
  const content = q(".os-content[data-probe='main']")!;
  const win = document.querySelector(".ws-window") as HTMLElement | null;
  const bar = document.querySelector(".ws-pagebar") as HTMLElement | null;
  const barKids = bar ? [...bar.children].filter((e) => {
    const b = e.getBoundingClientRect();
    return b.width > 0 && b.height > 0 && getComputedStyle(e).position !== "absolute";
  }) : [];
  const cols = qa("[data-probe='breakdown-col']").map((c) => {
    const pill = c.querySelector(".os-spill");
    return {
      status: c.getAttribute("data-status"), box: box(c)!, court: c.classList.contains("court"), zero: c.classList.contains("zero"),
      bg: getComputedStyle(c).backgroundColor, shadow: getComputedStyle(c).boxShadow,
      count: c.querySelector("[data-probe-text='breakdown-count']")?.textContent ?? "",
      pillOpacity: pill ? getComputedStyle(pill).opacity : null,
      factColor: getComputedStyle(c.querySelector(".os-bdfact")!).color,
    };
  });
  /* the chart's dots against the path it drew */
  const svg = q("[data-probe='plot']") as SVGSVGElement | null;
  const line = svg?.querySelector(".os-acline") as SVGPathElement | null;
  const pts: [number, number][] = [];
  if (line) {
    const L = line.getTotalLength();
    for (let k = 0; k <= 2000; k++) { const p = line.getPointAtLength((L * k) / 2000); pts.push([p.x, p.y]); }
  }
  const near = (x: number, y: number) => {
    let best = Infinity;
    for (let k = 1; k < pts.length; k++) {
      const [ax, ay] = pts[k - 1], [bx, by] = pts[k];
      const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy;
      const t = len ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len)) : 0;
      best = Math.min(best, Math.hypot(ax + t * dx - x, ay + t * dy - y));
    }
    return Math.round(best * 1000) / 1000;
  };
  const at = (c: Element | null) => (c ? [Number(c.getAttribute("cx")), Number(c.getAttribute("cy"))] : null);
  const first = at(svg?.querySelector(".os-acfirst") ?? null), last = at(svg?.querySelector(".os-aclast") ?? null);
  const stage = document.getElementById("app-stage-scroll");
  return {
    viewport: { w: innerWidth, h: innerHeight },
    docOverflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    appW: rd((document.querySelector(".ws-app") as HTMLElement).getBoundingClientRect().width),
    stageOverflow: stage ? Math.round(stage.getBoundingClientRect().right - innerWidth) : null,
    pageMax: getComputedStyle(document.querySelector(".ws-main")!).getPropertyValue("--dash-page-max").trim(),
    content: box(content)!, contentInner: inner(content),
    window: win ? { box: box(win)!, inner: inner(win) } : null,
    scroller: (() => {
      const s = document.querySelector(".ws-wbody") as HTMLElement | null;
      return s ? { clientW: s.clientWidth, offsetW: s.offsetWidth } : null;
    })(),
    barInner: bar ? inner(bar) : null,
    barFirst: box(barKids[0] ?? null),
    barLast: box(barKids[barKids.length - 1] ?? null),
    header: box(q("[data-probe='hero']")),
    breakdown: box(q("[data-probe='breakdown']")),
    row2: box(q("[data-probe='row2']")),
    grid: box(q("[data-probe='grid']")),
    colL: box(q(".os-colL")), colR: box(q(".os-colR")),
    todo: box(q(".os-colL .os-tasks")), actv: box(q(".os-colR .os-actv")), comtile: box(q(".os-colR .os-comtile")),
    cards: qa("[data-probe='row2'] > *").map((c) => ({ probe: c.getAttribute("data-probe"), box: box(c)! })),
    cols,
    headerCounts: txt("header-counts"),
    meta: txt("breakdown-meta"),
    extras: txt("breakdown-extras"),
    chartFigure: txt("chart-figure"),
    closedTotal: txt("closed-total"),
    closedCounts: qa("[data-probe-text='closed-count']").map((e) => e.textContent ?? ""),
    dots: qa("[data-probe='chart-event']").map((g) => {
      const c = g.querySelector("circle")!;
      return { kind: g.getAttribute("data-kind"), dist: near(Number(c.getAttribute("cx")), Number(c.getAttribute("cy"))) };
    }),
    firstGap: first && pts.length ? Math.hypot(first[0] - pts[0][0], first[1] - pts[0][1]) : null,
    lastGap: last && pts.length ? Math.hypot(last[0] - pts[pts.length - 1][0], last[1] - pts[pts.length - 1][1]) : null,
    labels: qa(".os-lead .os-acx span").map((s) => box(s)!),
    headings: ["os-bdtitle", "os-cltitle"].map((c) => getComputedStyle(q(`.${c}`)!).fontFamily),
  };
}

/** what actually PAINTED — a computed family says what was asked for */
async function drawnFonts(page: Page, selector: string) {
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send("DOM.enable");
    await cdp.send("CSS.enable");
    const { root } = await cdp.send("DOM.getDocument", { depth: -1 });
    const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector });
    if (!nodeId) return null;
    const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
    return fonts.map((f: { familyName: string }) => f.familyName);
  } finally {
    await cdp.detach();
  }
}

const num = (s: string | null) => Number((s ?? "").replace(/,/g, ""));
const spread = (xs: number[]) => (xs.length ? Math.max(...xs) - Math.min(...xs) : 0);

test.describe("the dashboard, stages 2–3", () => {
  test.describe.configure({ mode: "serial" });
  mkdirSync(OUT, { recursive: true });

  for (const { w, h } of WIDTHS) {
    test(`${MAX ? `max ${MAX} · ` : ""}${w}×${h}`, async ({ page }) => {
      await openDash(page, w, h);
      const r = await page.evaluate(read);
      await page.screenshot({ path: resolve(OUT, `stages-${MAX ? `max${MAX}-` : ""}${w}.png`) });
      writeFileSync(resolve(OUT, `stages-${MAX ? `max${MAX}-` : ""}${w}.json`), JSON.stringify(r, null, 2));
      // eslint-disable-next-line no-console
      console.log(`[${w}] content ${JSON.stringify(r.contentInner)} · bar ${JSON.stringify(r.barInner)} · cards ${r.cards.map((c) => `${c.probe} ${c.box.w}×${c.box.h}`).join(" · ")} · dots ${r.dots.length} worst ${Math.max(0, ...r.dots.map((d) => d.dist))}`);

      /* ── the page fits its window — at every width, the phone included ── */
      expect(r.docOverflowX, "nothing overflows the page sideways").toBeLessThanOrEqual(0);
      expect(r.appW, "the shell is the window's width — the page does not hold it open").toBeLessThanOrEqual(r.viewport.w + 0.5);

      /* ── the centred block (Nick: a maximum width, centred, the activity column inside it) ── */
      const measure = Number((MAX ?? 1440));
      const innerW = r.contentInner.right - r.contentInner.left;
      expect(innerW, "the content never runs wider than the page measure").toBeLessThanOrEqual(measure + 0.5);
      if (w >= 1025) {
        expect(r.colR!.r, "no gap between the activity column and the block's edge").toBeCloseTo(r.contentInner.right, 0);
        expect(r.header!.x, "the header spans the block").toBeCloseTo(r.contentInner.left, 0);
        expect(r.breakdown!.r, "the breakdown spans the block").toBeCloseTo(r.contentInner.right, 0);
        expect(r.row2!.w, "the second row spans the block").toBeCloseTo(innerW, 0);
        expect(r.grid!.w, "the bottom row spans the block").toBeCloseTo(innerW, 0);
        expect(r.barLast, "the bar's actions must render").not.toBeNull();
        if (Math.abs(innerW - measure) < 1) {
          /* the measure binds: centred on the window, and the bar sits on the same edges exactly */
          const left = r.contentInner.left - r.window!.box.x, right = r.window!.box.r - r.contentInner.right;
          expect(Math.abs(left - right), `centred: ${left} left, ${right} right`).toBeLessThanOrEqual(1);
          expect(r.barFirst!.x, "the search starts above the block's left edge").toBeCloseTo(r.contentInner.left, 0);
          expect(r.barLast!.r, "the actions end above the block's right edge").toBeCloseTo(r.contentInner.right, 0);
        } else {
          /* the measure does not bind: the page fills its window, less the scrollbar gutters */
          const gutter = r.scroller ? (r.scroller.offsetW - r.scroller.clientW) / 2 : 0;
          expect(Math.abs(r.barLast!.r - r.contentInner.right), "the actions end within a gutter of the block's edge").toBeLessThanOrEqual(gutter + 1);
          expect(r.barFirst!.x, "the search never starts left of the block").toBeGreaterThanOrEqual(r.contentInner.left - 0.5);
        }
      }

      /* ── the breakdown: five equal columns, the two requests marked ── */
      expect(r.cols.map((c) => c.status)).toEqual(["Queried", "Partial Requested", "Partial Sent", "Full Requested", "Full Sent"]);
      const across = w > 900 ? r.cols : r.cols.slice(0, 4);
      expect(spread(across.map((c) => c.box.w)), "the columns are one width").toBeLessThanOrEqual(0.5);
      expect(spread(r.cols.map((c) => c.box.h)), "the columns are one height").toBeLessThanOrEqual(0.5);
      if (w > 900) expect(spread(r.cols.map((c) => c.box.y)), "one row of five").toBeLessThanOrEqual(0.5);
      else expect(r.cols[4].box.w, "the fifth takes its row whole").toBeCloseTo(r.cols[0].box.w * 2 + 1, 0);
      for (const c of r.cols) {
        const court = c.status === "Partial Requested" || c.status === "Full Requested";
        expect(c.court, `${c.status} marked`).toBe(court);
        if (court) {
          expect(c.bg).toBe("rgb(252, 248, 246)");
          expect(c.shadow).toBe("rgb(138, 74, 60) 0px -3px 0px 0px inset");
          if (!c.zero) expect(c.factColor).toBe("rgb(138, 74, 60)");
        } else {
          expect(c.bg).toBe("rgb(255, 255, 255)");
        }
        expect(c.pillOpacity, `${c.status}: a zero column's pill steps back, a live one does not`).toBe(c.zero ? "0.55" : "1");
      }

      /* ── header = meta = columns + the R&R/offer line = the chart's headline ── */
      const header = num((r.headerCounts ?? "").split(" ")[0]);
      const meta = num((r.meta ?? "").split(" ")[0]);
      const colSum = r.cols.reduce((a, c) => a + num(c.count), 0);
      const extra = (r.extras ?? "").replace("Plus ", "").split(" · ").filter(Boolean)
        .reduce((a, p) => a + num(p.split(" ")[0]), 0);
      expect(meta, "the breakdown's count is the header's").toBe(header);
      expect(colSum + extra, "the columns and the R&R/offer line add up to it").toBe(meta);
      expect(num(r.chartFigure), "the chart's headline is the same figure").toBe(meta);

      /* ── the three cards ── */
      const cards = Object.fromEntries(r.cards.map((c) => [c.probe, c.box]));
      expect(Object.keys(cards)).toEqual(["quick-actions", "chart-card", "closed-tile"]);
      if (w >= 1280) {
        expect(spread(r.cards.map((c) => c.box.h)), "the three cards are one height").toBeLessThanOrEqual(0.5);
        expect(spread(r.cards.map((c) => c.box.y)), "on one row").toBeLessThanOrEqual(0.5);
        expect(cards["quick-actions"].w).toBeCloseTo(300, 0);
        expect(cards["closed-tile"].w).toBeCloseTo(300, 0);
      } else if (w > 900) {
        expect(cards["quick-actions"].h, "two cards, one height").toBeCloseTo(cards["chart-card"].h, 0);
        expect(cards["quick-actions"].w, "two columns, one width").toBeCloseTo(cards["chart-card"].w, 0);
        expect(cards["closed-tile"].w, "the closed tile takes a row of its own").toBeCloseTo(r.row2!.w, 0);
        expect(cards["closed-tile"].y).toBeGreaterThan(cards["chart-card"].b);
      } else {
        expect(spread(r.cards.map((c) => c.box.x)), "three stacked cards").toBeLessThanOrEqual(0.5);
        expect(cards["chart-card"].y).toBeGreaterThan(cards["quick-actions"].b);
        expect(cards["closed-tile"].y).toBeGreaterThan(cards["chart-card"].b);
      }

      /* ── the closed tile's counts sum ── */
      expect(r.closedCounts).toHaveLength(4);
      expect(r.closedCounts.reduce((a, c) => a + num(c), 0), "the four buckets are the total").toBe(num(r.closedTotal));

      /* ── the chart's dots sit on the line it drew ── */
      expect(r.dots.length, "a claim about dots needs dots — the harness account's window holds both kinds").toBeGreaterThan(0);
      for (const d of r.dots) expect(d.dist, `a ${d.kind} dot is off the line`).toBeLessThanOrEqual(0.5);
      expect(r.firstGap ?? 99, "the hollow mark is where the line starts").toBeLessThanOrEqual(0.5);
      expect(r.lastGap ?? 99, "the solid mark is where the line ends").toBeLessThanOrEqual(0.5);
      for (let k = 1; k < r.labels.length; k++) {
        expect(r.labels[k].x - r.labels[k - 1].r, `labels ${k - 1} and ${k} overlap`).toBeGreaterThanOrEqual(4);
      }

      /* ── the bottom row ── */
      if (w >= 1025) {
        expect(r.grid!.h, "the bottom row's stated height").toBeCloseTo(600, 0);
        expect(r.colL!.b, "the two columns close on one line").toBeCloseTo(r.colR!.b, 0);
        expect(r.todo!.b).toBeCloseTo(r.grid!.b, 0);
        expect(r.comtile!.b, "the activity column is filled to its foot").toBeCloseTo(r.grid!.b, 0);
      } else {
        expect(r.colR!.y, "stacked: the activity column after the to-do card").toBeGreaterThanOrEqual(r.colL!.b - 0.5);
        expect(r.colR!.x).toBeCloseTo(r.colL!.x, 0);
        expect(r.todo!.h).toBeCloseTo(520, 0);
        expect(r.actv!.h).toBeCloseTo(420, 0);
      }

      /* ── the typewriter headings actually painted in the typewriter face ── */
      for (const f of r.headings) expect(f.startsWith('"Special Elite"'), f).toBe(true);
      if (w === 1920) {
        for (const sel of [".os-root .os-bdtitle", ".os-root .os-cltitle"]) {
          expect((await drawnFonts(page, sel))?.join(" ") ?? "", sel).toContain("Special Elite");
        }
      }
    });
  }

  /* ⚠️ THE FEED FLEXES TO ITS COLUMN AND NEVER SETS IT — carried from `dashGrid.measure.ts`: make the
     feed taller and check the row did not move. A stylesheet can only say the declaration exists. */
  test("the activity feed's content never grows the bottom row", async ({ page }) => {
    await openDash(page, 1920, 1400);
    const bottom = () => page.evaluate(() => (document.querySelector(".os-root [data-probe='grid']") as HTMLElement).getBoundingClientRect().bottom);
    const before = await bottom();
    const grew = await page.evaluate(() => {
      const body = document.querySelector(".os-root .os-actv .os-abody") as HTMLElement | null;
      if (!body) return false;
      for (let i = 0; i < 60; i++) {
        const d = document.createElement("div");
        d.style.height = "40px"; d.dataset.saProbe = "1";
        body.appendChild(d);
      }
      return true;
    });
    expect(grew, "the feed must be findable — this case measures nothing without it").toBe(true);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const after = await bottom();
    await page.evaluate(() => document.querySelectorAll("[data-sa-probe]").forEach((n) => n.remove()));
    // eslint-disable-next-line no-console
    console.log(`[feed] bottom row ${before.toFixed(1)} → ${after.toFixed(1)} after +2400px of feed`);
    expect(Math.abs(after - before), "2400px of feed moved the bottom row").toBeLessThanOrEqual(1);
  });
});
