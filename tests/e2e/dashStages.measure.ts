/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE DASHBOARD (v16, 18 Sep) — the centred block, the three-card row and the two-card row, measured
 * on a rendered page at the widths Nick named.
 *
 * ⚠️ EVERY CLAIM HERE IS ABOUT BOXES OR ABOUT WHAT WAS DRAWN, so none of it can live in a source lock:
 * that the page sits centred, that three cards are one height and the closed tile square-ish in its
 * column, that the two bottom cards end on the same line and scroll inside it, that the closed tile's
 * counts sum, that the header's figure and the chart's are one number, and that the chart's dots sit
 * on the line it drew. The unit suite proves the rules and the markup were written; this proves the
 * page laid them out.
 *
 * ⚠️ REWRITTEN FOR v16, AND THE BREAKDOWN'S CASES ARE GONE WITH THE SECTION. Five equal columns, the
 * court marking and the four-way reconciliation had three of their four terms deleted; what survives
 * with a subject is carried, and the row-two height is now the ref's clamp measured from the page's
 * OWN scrollport rather than a stated 600.
 *
 * ⚠️ IT REPLACES `dashGrid.measure.ts` AND `dashChart.measure.ts`, both retired with their subjects:
 * the first measured a centre column (retired in v22) and the stat illustrations' blend (retired in
 * stage 1), the second the chart's bands and hover panel (retired in stage 3). The claims that still
 * have a subject — the two bottom cards close on one line, the feed's content never grows the row —
 * are carried here.
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
  await expect(page.locator(".os-root [data-probe='row1']").first()).toBeVisible({ timeout: 30_000 });
  /* ⚠️ THE DATA HAS LANDED WHEN THE CHART STATES ITS FIGURE. Every figure on this page waits for the
     same board, and the eyebrow is the one that is empty rather than zero while it is out — so
     polling it cannot be satisfied by a page that has resolved to nothing. */
  await expect.poll(() => page.evaluate(() => document.querySelector("[data-probe-text='chart-eyebrow']")?.textContent ?? ""),
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
    row1: box(q("[data-probe='row1']")),
    row2: box(q("[data-probe='row2']")),
    /* the two published measurements the row's clamp reads — reported every run, per Nick */
    portH: getComputedStyle(root).getPropertyValue("--os-port-h").trim(),
    row2Top: getComputedStyle(root).getPropertyValue("--os-row2-top").trim(),
    cards1: qa("[data-probe='row1'] > *").map((c) => ({ probe: c.getAttribute("data-probe"), box: box(c)! })),
    cards2: qa("[data-probe='row2'] > *").map((c) => ({ probe: c.getAttribute("data-probe"), box: box(c)! })),
    /* every scroller in the bottom row: its port against its content */
    scrolls: qa("[data-probe='row2'] .os-scroll").map((sc) => ({
      client: (sc as HTMLElement).clientHeight, scroll: (sc as HTMLElement).scrollHeight,
      overflowY: getComputedStyle(sc).overflowY,
    })),
    feedEntries: qa("[data-probe='feed-entry']").length,
    todoRows: qa("[data-probe='todo-row']").length,
    /* the guessed-window bar, if the account happens to hold one — reported, never required */
    guessedBars: qa(".os-tdbar--guess").length,
    headerCounts: txt("header-counts"),
    chartEyebrow: txt("chart-eyebrow"),
    closedTotal: txt("closed-total"),
    closedCounts: qa("[data-probe-text='closed-count']").map((e) => e.textContent ?? ""),
    dots: qa("[data-probe='chart-event']").map((g) => {
      const c = g.querySelector("circle")!;
      return { kind: g.getAttribute("data-kind"), dist: near(Number(c.getAttribute("cx")), Number(c.getAttribute("cy"))) };
    }),
    firstGap: first && pts.length ? Math.hypot(first[0] - pts[0][0], first[1] - pts[0][1]) : null,
    lastGap: last && pts.length ? Math.hypot(last[0] - pts[pts.length - 1][0], last[1] - pts[pts.length - 1][1]) : null,
    /* ⚠️ THE INK, NOT THE SLOT. Each week is a flex slot with its label centred in it, so the SLOT
       boxes are adjacent by construction and a gap between them is always 0 — the old probe read the
       absolutely-placed labels of the previous axis and reported an overlap on a correct page. A
       `Range` over the text node is what is actually drawn. */
    labels: qa(".os-lead .os-acx span").filter((sp) => (sp.textContent ?? "").trim()).map((sp) => {
      const rg = document.createRange();
      rg.selectNodeContents(sp);
      const rr = rg.getBoundingClientRect();
      return { x: rd(rr.x), y: rd(rr.y), w: rd(rr.width), h: rd(rr.height), r: rd(rr.right), b: rd(rr.bottom) };
    }),
    headings: [...root.querySelectorAll(".os-cardttl"), root.querySelector(".os-hello")!]
      .map((c) => getComputedStyle(c).fontFamily),
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
      console.log(`[${w}] content ${JSON.stringify(r.contentInner)} · bar ${JSON.stringify(r.barInner)} · row1 ${r.cards1.map((c) => `${c.probe} ${c.box.w}×${c.box.h}`).join(" · ")} · row2 ${r.row2!.h} (port ${r.portH} top ${r.row2Top}) · dots ${r.dots.length} worst ${Math.max(0, ...r.dots.map((d) => d.dist))}`);

      /* ── the page fits its window — at every width, the phone included ── */
      expect(r.docOverflowX, "nothing overflows the page sideways").toBeLessThanOrEqual(0);
      expect(r.appW, "the shell is the window's width — the page does not hold it open").toBeLessThanOrEqual(r.viewport.w + 0.5);

      /* ── the centred block (Nick: a maximum width, centred, both rows inside it) ── */
      const measure = Number((MAX ?? 1440));
      const innerW = r.contentInner.right - r.contentInner.left;
      expect(innerW, "the content never runs wider than the page measure").toBeLessThanOrEqual(measure + 0.5);
      if (w >= 1025) {
        expect(r.header!.x, "the header spans the block").toBeCloseTo(r.contentInner.left, 0);
        expect(r.header!.r, "…to its right edge").toBeCloseTo(r.contentInner.right, 0);
        expect(r.row1!.w, "the first row spans the block").toBeCloseTo(innerW, 0);
        expect(r.row2!.w, "the second row spans the block").toBeCloseTo(innerW, 0);
        /* ⚠️ NO GAP AT THE BLOCK'S RIGHT EDGE (Nick: pinned to the window's edge, the feed opened a
           gap beside the content on a wide screen). The last card in each row ends where the block does. */
        expect(r.cards1[r.cards1.length - 1].box.r, "row one closes on the block's edge").toBeCloseTo(r.contentInner.right, 0);
        expect(r.cards2[r.cards2.length - 1].box.r, "row two closes on the block's edge").toBeCloseTo(r.contentInner.right, 0);
        expect(r.barLast, "the bar's actions must render").not.toBeNull();
        /**
         * ⚠️ THE BAR IS ON THE PAGE'S MEASURE, AND THE SEARCH IS AUTO-CENTRED INSIDE IT — measured in
         * the ref at 1440, where its bar and its first card row span the same box to the pixel. So the
         * claim is the BAR'S OWN padding box against the block, never its first child: the field is
         * `margin-inline: auto` and sits wherever the help control and the row's gap leave it, which
         * at 1920 is 200px right of the block's edge and perfectly correct.
         */
        expect(r.barInner, "the bar's measure must be readable").not.toBeNull();
        if (Math.abs(innerW - measure) < 1) {
          /* the measure binds: centred on the window, and the bar sits on the same edges exactly */
          const left = r.contentInner.left - r.window!.box.x, right = r.window!.box.r - r.contentInner.right;
          expect(Math.abs(left - right), `centred: ${left} left, ${right} right`).toBeLessThanOrEqual(1);
          expect(r.barInner!.left, "the bar's ink starts on the block's left edge").toBeCloseTo(r.contentInner.left, 0);
          expect(r.barInner!.right, "and ends on its right edge").toBeCloseTo(r.contentInner.right, 0);
          expect(r.barLast!.r, "the last control ends there too").toBeCloseTo(r.contentInner.right, 0);
        } else {
          /* the measure does not bind: the page fills its window, less the scrollbar gutters */
          const gutter = r.scroller ? (r.scroller.offsetW - r.scroller.clientW) / 2 : 0;
          expect(Math.abs(r.barLast!.r - r.contentInner.right), "the last control ends within a gutter of the block's edge").toBeLessThanOrEqual(gutter + 1);
          expect(r.barInner!.left, "the bar's ink never starts left of the block").toBeGreaterThanOrEqual(r.contentInner.left - gutter - 1);
        }
        /* ⚠️ AND THE FIELD IS CENTRED IN WHAT IS LEFT, NOT ON THE ROW'S MIDLINE — the ref's own
           arithmetic: the space either side of it differs by exactly the help control plus one gap. */
        expect(r.barFirst!.x, "the search sits inside the bar's measure").toBeGreaterThanOrEqual(r.barInner!.left - 0.5);
      }

      /* ── the header's figure is the chart's, read off the page ── */
      const header = num((r.headerCounts ?? "").split(" ")[0]);
      const chart = num((r.chartEyebrow ?? "").split(" ")[0]);
      expect(header, "the page must state a live count — a reconciliation over nothing proves nothing").toBeGreaterThan(0);
      expect(chart, "the chart's headline is the header's figure").toBe(header);

      /* ── row one: three cards, one height, the closed tile at its own width ── */
      const cards1 = Object.fromEntries(r.cards1.map((c) => [c.probe, c.box]));
      expect(Object.keys(cards1)).toEqual(["quick-actions", "chart-card", "closed-tile"]);
      if (w >= 1280) {
        expect(spread(r.cards1.map((c) => c.box.h)), "the three cards are one height").toBeLessThanOrEqual(0.5);
        expect(spread(r.cards1.map((c) => c.box.y)), "on one row").toBeLessThanOrEqual(0.5);
        expect(cards1["closed-tile"].w, "the closed tile's own width").toBeCloseTo(320, 0);
        expect(cards1["quick-actions"].w, "the quick actions keep their floor").toBeGreaterThanOrEqual(269.5);
        expect(cards1["chart-card"].w, "the chart takes the widest share").toBeGreaterThan(cards1["quick-actions"].w);
      } else if (w > 999) {
        /* ⚠️ THE CLOSED TILE DROPS BENEATH THE CHART AT THE MIDDLE COLUMN'S FULL WIDTH (Nick's prose —
           the ref has no media queries and cannot speak for this width). */
        expect(cards1["quick-actions"].h, "two cards, one height").toBeCloseTo(cards1["chart-card"].h, 0);
        expect(cards1["closed-tile"].y, "the tile is below the chart").toBeGreaterThan(cards1["chart-card"].b - 0.5);
        expect(cards1["closed-tile"].x, "…at the chart's own left edge").toBeCloseTo(cards1["chart-card"].x, 0);
        expect(cards1["closed-tile"].w, "…and the chart's own width").toBeCloseTo(cards1["chart-card"].w, 0);
      } else {
        expect(spread(r.cards1.map((c) => c.box.x)), "three stacked cards").toBeLessThanOrEqual(0.5);
        expect(cards1["chart-card"].y).toBeGreaterThan(cards1["quick-actions"].b - 0.5);
        expect(cards1["closed-tile"].y).toBeGreaterThan(cards1["chart-card"].b - 0.5);
      }

      /* ── the closed tile's counts sum ── */
      expect(r.closedCounts).toHaveLength(4);
      expect(r.closedCounts.reduce((a, c) => a + num(c), 0), "the four buckets are the total").toBe(num(r.closedTotal));

      /* ── the chart's dots sit on the line it drew ── */
      expect(r.dots.length, "a claim about dots needs dots — the harness account's window holds both kinds").toBeGreaterThan(0);
      for (const d of r.dots) expect(d.dist, `a ${d.kind} dot is off the line`).toBeLessThanOrEqual(0.5);
      expect(r.firstGap ?? 99, "the hollow mark is where the line starts").toBeLessThanOrEqual(0.5);
      expect(r.lastGap ?? 99, "the solid mark is where the line ends").toBeLessThanOrEqual(0.5);
      /* ⚠️ THE LABELS ARE THINNED BY DERIVATION AND THE TICKS ARE NOT, so what is left must still
         clear its neighbour. Measured on the rendered ink — 4px is the eye's minimum gap. */
      expect(r.labels.length, "a claim about labels needs labels").toBeGreaterThan(1);
      for (let k = 1; k < r.labels.length; k++) {
        expect(r.labels[k].x - r.labels[k - 1].r, `labels ${k - 1} and ${k} overlap`).toBeGreaterThanOrEqual(4);
      }

      /**
       * ── row two: the ref's clamp, measured from the page's own scrollport ──
       *
       * ⚠️ THE REF WRITES `clamp(380px, calc(100vh - 560px), 560px)` AND THIS PAGE MAY NOT SAY `100vh`.
       * It starts under the beta strip, the top bar and the window's inset, so the viewport over-claims
       * by all of it — the house stage law, and the 21px the Tasks chassis lost to the same arithmetic.
       * The claim is therefore the RELATIONSHIP: the row is the clamp applied to what the page actually
       * has, and both inputs are reported every run (Nick asked for the offset).
       */
      const cards2 = Object.fromEntries(r.cards2.map((c) => [c.probe, c.box]));
      expect(Object.keys(cards2)).toEqual(["activity-card", "todo-card"]);
      if (w >= 1025) {
        const port = Number((r.portH ?? "").replace("px", ""));
        const top = Number((r.row2Top ?? "").replace("px", ""));
        expect(port, "the scrollport must have been measured").toBeGreaterThan(0);
        expect(port, "the port is the scroller's box, never the window's").toBeLessThanOrEqual(r.viewport.h);
        const want = Math.min(560, Math.max(380, port - top - 44));
        expect(r.row2!.h, `the row is the clamp over port ${port} and top ${top}`).toBeCloseTo(want, 0);
        expect(cards2["activity-card"].b, "the two cards close on one line").toBeCloseTo(cards2["todo-card"].b, 0);
        expect(cards2["activity-card"].b, "…which is the row's own foot").toBeCloseTo(r.row2!.b, 0);
        expect(cards2["activity-card"].w, "the feed takes the wider share").toBeGreaterThan(cards2["todo-card"].w);
      } else {
        expect(cards2["todo-card"].y, "stacked: the to-do card after the feed").toBeGreaterThan(cards2["activity-card"].b - 0.5);
        expect(cards2["todo-card"].x).toBeCloseTo(cards2["activity-card"].x, 0);
        /* ⚠️ A STACKED CARD STATES ITS OWN HEIGHT, AND THE PHONE STEP SHORTENS IT — 520 below 1000,
           460 below 640, so a card on a phone does not take two thirds of the scroll to itself. The
           claim is the RELATIONSHIP the ref cannot speak for (it draws one width): both cards are the
           same stated height, and it is one of the two the sheet declares. */
        expect(cards2["activity-card"].h, "the two stacked cards are one height").toBeCloseTo(cards2["todo-card"].h, 0);
        expect([460, 520], `a stacked card's height was ${cards2["activity-card"].h}`).toContain(cards2["activity-card"].h);
      }

      /* ⚠️ AND BOTH CARDS SCROLL INSIDE THE ROW RATHER THAN GROWING IT. A card without `min-height: 0`
         in a grid track refuses to shrink below its content, so the scroller never engages — the fault
         that hid behind content in two rebuilds and is invisible to any source lock. */
      expect(r.scrolls.length, "both bottom cards hold a scroller").toBe(2);
      for (const sc of r.scrolls) {
        expect(sc.overflowY).toBe("auto");
        expect(sc.client, "a scroller with no height is a card that refused to shrink").toBeGreaterThan(0);
        if (w >= 1025) expect(sc.client, "the port is bounded by the row").toBeLessThanOrEqual(r.row2!.h);
      }
      /* the fixture must hold enough to be worth bounding — an empty card scrolls trivially */
      expect(r.feedEntries + r.todoRows, "the account must hold rows for this to mean anything").toBeGreaterThan(0);

      /* ── the typewriter headings actually painted in the typewriter face ── */
      expect(r.headings.length, "the page must carry headings to check").toBeGreaterThanOrEqual(5);
      for (const f of r.headings) expect(f.startsWith('"Special Elite"'), f).toBe(true);
      if (w === 1920) {
        /* ⚠️ WHAT PAINTED, NOT WHAT WAS ASKED FOR. A computed family is the declaration; `brand.tsx`
           forces heading families with `!important` at runtime, so the only honest check is the font
           the engine actually used. */
        for (const sel of [".os-root .os-hello", ".os-root .os-cardttl"]) {
          expect((await drawnFonts(page, sel))?.join(" ") ?? "", sel).toContain("Special Elite");
        }
      }
    });
  }

  /* ⚠️ THE FEED FLEXES TO ITS ROW AND NEVER SETS IT — carried from `dashGrid.measure.ts`: make the
     feed taller and check the row did not move. A stylesheet can only say the declaration exists. */
  test("the activity feed's content never grows the bottom row", async ({ page }) => {
    await openDash(page, 1920, 1400);
    const bottom = () => page.evaluate(() => (document.querySelector(".os-root [data-probe='row2']") as HTMLElement).getBoundingClientRect().bottom);
    const before = await bottom();
    const grew = await page.evaluate(() => {
      const body = document.querySelector(".os-root .os-feed .os-scroll") as HTMLElement | null;
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
