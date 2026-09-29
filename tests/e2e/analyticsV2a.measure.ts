/**
 * analyticsV2a.measure — the Analytics page against design-refs/analytics-v2a.html, measured on the
 * rendered page (never declarations).
 *
 * ⚠️ HARNESS-FIRST (Phase 2). Written before the page, proved red against `main`, then kept as the
 * page's standing lock. Every assertion goes through `check()`, which also writes a ledger row, and
 * each case asserts a floor on how many checks ran — a case that found nothing to measure has
 * failed, not skipped.
 *
 * ⚠️ POPULATIONS BEFORE PROPERTIES. A chart "has plotted marks" only after the case has proved the
 * data under it is non-zero; a filter over an empty set passes vacuously.
 *
 * ⚠️ THE REF IS OPENED IN THE SAME BROWSER AT EQUAL CONTENT WIDTH. Its column is its window less
 * the 238px sidebar, the group's 48px of padding, the 28px gap and the 340px rail — so it is opened
 * `appColumn + 654` wide, and the two are compared by one ruler.
 */
import { test, expect, type Page } from "@playwright/test";
import { resolve } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

const ROUTE = "/queries/analytics";
const REF = "file://" + resolve("design-refs/analytics-v2a.html");
const OUT = "reports/analytics-v2a";

type Row = { lock: string; size: string; ok: boolean; detail: string };
const ledger: Row[] = [];
let ran = 0;

function check(lock: string, size: string, ok: boolean, detail: string) {
  ran++;
  ledger.push({ lock, size, ok, detail });
  expect(ok, `${lock} @ ${size}: ${detail}`).toBe(true);
}

test.afterAll(() => {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(`${OUT}/measure-ledger.json`, JSON.stringify({ ran, rows: ledger }, null, 1));
  console.log(`LEDGER analyticsV2a: ${ran} checks, ${ledger.filter((r) => !r.ok).length} failed`);
});

async function openPage(page: Page, vp: { width: number; height: number }) {
  await openRoute(page, ROUTE, vp);
  await page.evaluate(async () => { await document.fonts.ready; });
  /* wait for the page itself, not a skeleton */
  await page.waitForFunction(
    `[...document.querySelectorAll('[data-anv="page"]')].some((e) => e.getBoundingClientRect().height > 0 && !e.querySelector('[data-anv="skeleton"]'))`,
    null, { timeout: 20_000 },
  ).catch(() => {});
  await page.waitForTimeout(300);
}

/** Everything the locks read, in one pass, scoped to the one visible page. */
async function readPage(page: Page) {
  return page.evaluate(() => {
    const pageEl = [...document.querySelectorAll('[data-anv="page"]')].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement | undefined;
    const box = (e?: Element | null) => {
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height };
    };
    if (!pageEl) return null;
    const q = (s: string) => pageEl.querySelector(s);
    const qa = (s: string) => [...pageEl.querySelectorAll(s)];
    const scroller = pageEl.closest(".wpg-scroll") as HTMLElement | null;
    const main = q('[data-anv="main"]');
    const rail = q('[data-anv="rail"]');
    const charts = ["reply", "endings", "stages", "volume"].map((k) => {
      const c = q(`[data-anv="chart-${k}"]`);
      const marks = c ? [...c.querySelectorAll('[data-anv="mark"]')].filter((m) => {
        const b = m.getBoundingClientRect();
        return b.width > 0 && b.height > 0;
      }) : [];
      return { key: k, present: !!c, box: box(c), marks: marks.length, population: c ? Number((c as HTMLElement).dataset.population ?? "-1") : -1 };
    });
    const events = qa('[data-anv="event"]').map((e) => ({ kind: (e as HTMLElement).dataset.kind ?? "", at: Number((e as HTMLElement).dataset.at ?? "NaN"), text: e.textContent?.trim() ?? "" }));
    const mainKids = main ? [...main.children].filter((c) => c.getBoundingClientRect().height > 0) : [];
    return {
      scroller: box(scroller),
      scrollerClientW: scroller?.clientWidth ?? 0,
      header: box(q(".ph")),
      headRow: box(q('[data-anv="head"]')),
      group: box(q('[data-anv="group"]')),
      main: box(main),
      rail: box(rail),
      railPos: rail ? getComputedStyle(rail).position : null,
      railBody: box(rail?.querySelector(".sa-prail-body") ?? null),
      journey: box(q('[data-anv="journey"]')),
      stages: qa('[data-anv="stage"]').length,
      stageDots: qa('[data-anv="stage"] [data-probe="status-dot"], [data-anv="stage"] svg').length,
      links: qa('[data-anv="link"]').length,
      stageCounts: qa('[data-anv="stage"] [data-anv="n"]').map((e) => e.textContent?.trim() ?? ""),
      charts,
      events,
      lastMainKid: mainKids.length ? (mainKids[mainKids.length - 1] as HTMLElement).dataset.anv ?? mainKids[mainKids.length - 1].className : null,
      caveats: box(q('[data-anv="caveats"]')),
      sent: Number((pageEl as HTMLElement).dataset.sent ?? "-1"),
      since: Number((pageEl as HTMLElement).dataset.since || "NaN"),
      range: (pageEl as HTMLElement).dataset.range ?? "",
      pressed: [...pageEl.querySelectorAll('[data-anv="range"] button[aria-pressed="true"]')].map((b) => b.textContent?.trim() ?? ""),
    };
  });
}

/** The ref's journey card and rail, at a window giving it the app's content width. */
async function readRef(page: Page, column: number, height: number) {
  await page.setViewportSize({ width: Math.round(column + 654), height });
  await page.goto(REF);
  await page.evaluate(async () => { await document.fonts.ready; });
  return page.evaluate(() => {
    const cards = [...document.querySelectorAll(".group .card")];
    const j = cards[0].getBoundingClientRect();
    const col = document.querySelector(".group > div")!.getBoundingClientRect();
    const rail = document.querySelector(".rail")!.getBoundingClientRect();
    return { journeyH: j.height, column: col.width, railW: rail.width };
  });
}

const SIZES = [
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];

for (const vp of SIZES) {
  const size = `${vp.width}×${vp.height}`;

  test(`frame, funnel, charts, rail and caveats @ ${size}`, async ({ page }) => {
    const before = ran;
    await openPage(page, vp);
    const r = await readPage(page);
    check("page-present", size, r !== null, "a visible [data-anv=page] is rendered on /queries/analytics");
    if (!r) return;
    check("population", size, r.sent > 0, `the active manuscript has queries in range (sent=${r.sent}) — every lock below depends on it`);

    /* 1 · the header runs the column's full width, with the group beneath it */
    check("header-full-width", size, !!r.header && !!r.group && Math.abs(r.header.w - r.group.w) <= 1,
      `header ${r.header?.w?.toFixed(1)} vs group ${r.group?.w?.toFixed(1)}`);
    check("header-above-group", size, !!r.header && !!r.main && r.header.b <= r.main.t + 0.5 && !!r.rail && r.header.b <= r.rail.t + 0.5,
      `header bottom ${r.header?.b?.toFixed(1)} · main top ${r.main?.t?.toFixed(1)} · rail top ${r.rail?.t?.toFixed(1)}`);

    /* 2 · the group is centred in the scroller and the rail is 340 and sticky */
    const inner = r.scroller ? { l: r.scroller.l, r: r.scroller.l + r.scrollerClientW } : null;
    const gl = r.group && inner ? r.group.l - inner.l : NaN;
    const gr = r.group && inner ? inner.r - r.group.r : NaN;
    check("group-centred", size, Math.abs(gl - gr) <= 2, `left margin ${gl.toFixed(1)} · right margin ${gr.toFixed(1)}`);
    check("group-max-width", size, !!r.group && r.group.w <= 1480.5, `group ${r.group?.w?.toFixed(1)} ≤ 1480`);
    check("rail-340", size, !!r.rail && Math.abs(r.rail.w - 340) <= 0.5, `rail ${r.rail?.w?.toFixed(1)}`);
    check("rail-sticky-declared", size, r.railPos === "sticky", `rail position ${r.railPos}`);
    check("rail-fits-on-load", size, !!r.rail && r.rail.b <= vp.height + 0.5, `rail bottom ${r.rail?.b?.toFixed(1)} ≤ viewport ${vp.height}`);

    /* the rail holds its place when the page scrolls — the measured half of "sticky" */
    const railTop0 = r.rail?.t ?? NaN;
    await page.evaluate(() => {
      const el = [...document.querySelectorAll('[data-anv="page"]')].find((e) => e.getBoundingClientRect().height > 0);
      const sc = el?.closest(".wpg-scroll") as HTMLElement | null;
      if (sc) sc.scrollTop = 700;
    });
    await page.waitForTimeout(250);
    const moved = await page.evaluate(() => {
      const el = [...document.querySelectorAll('[data-anv="page"]')].find((e) => e.getBoundingClientRect().height > 0);
      const sc = el?.closest(".wpg-scroll") as HTMLElement | null;
      const rail = el?.querySelector('[data-anv="rail"]');
      return { scrollTop: sc?.scrollTop ?? 0, scTop: sc?.getBoundingClientRect().top ?? 0, railTop: rail?.getBoundingClientRect().top ?? NaN };
    });
    check("scroll-precondition", size, moved.scrollTop > 100, `the page scrolled (scrollTop=${moved.scrollTop}) — without it the stuck reading proves nothing`);
    check("rail-stuck", size, Math.abs(moved.railTop - (moved.scTop + 16)) <= 1.5,
      `after scrolling ${moved.scrollTop}px the rail's top is ${moved.railTop.toFixed(1)} against the scroller's top + 16 = ${(moved.scTop + 16).toFixed(1)} (was ${railTop0.toFixed(1)})`);
    await page.evaluate(() => {
      const el = [...document.querySelectorAll('[data-anv="page"]')].find((e) => e.getBoundingClientRect().height > 0);
      const sc = el?.closest(".wpg-scroll") as HTMLElement | null;
      if (sc) sc.scrollTop = 0;
    });

    /* 3 · the funnel: four stages, three connectors, a StatusDot each, and the ref's size */
    check("funnel-stages", size, r.stages === 4, `${r.stages} stages`);
    check("funnel-links", size, r.links === 3, `${r.links} connectors`);
    check("funnel-dots", size, r.stageDots >= 4, `${r.stageDots} glyphs in the stages`);
    check("funnel-counts", size, r.stageCounts.length === 4 && r.stageCounts.every((c) => c !== ""), `counts ${JSON.stringify(r.stageCounts)}`);
    /* read BEFORE the ref comparison below navigates the page away to the ref file */
    const neg = await page.evaluate(() => {
      const el = [...document.querySelectorAll('[data-anv="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
      const all = [el, ...el.querySelectorAll("*")];
      const burg: string[] = [];
      for (const n of all) {
        const cs = getComputedStyle(n);
        for (const p of ["color", "backgroundColor", "borderTopColor", "borderLeftColor", "fill", "stroke"] as const) {
          const v = cs[p];
          if (/rgba?\(124,\s*58,\s*42/.test(v)) burg.push(`${(n as HTMLElement).className || n.tagName} ${p}`);
        }
      }
      return { swept: all.length, eyebrow: el.querySelectorAll('[data-probe="eyebrow"]').length, burg };
    });
    const column = r.main?.w ?? 0;
    const ref = await readRef(page, column, vp.height);
    /* the split rows are data — the ref draws two per stage, a live account one to five — so the
       tolerance covers three rows of 17px either way */
    const jh = r.journey?.h ?? 0;
    check("funnel-ref-height", size, Math.abs(jh - ref.journeyH) <= Math.max(60, ref.journeyH * 0.2),
      `journey card ${jh.toFixed(1)} vs ref ${ref.journeyH.toFixed(1)} at column ${column.toFixed(1)} (ref column ${ref.column.toFixed(1)})`);
    check("ref-column-matched", size, Math.abs(ref.column - column) <= 2, `ref column ${ref.column.toFixed(1)} vs app ${column.toFixed(1)}`);

    /* 4 · each chart card exists and — once its population is proved — has plotted marks */
    for (const c of r.charts) {
      check(`chart-${c.key}-present`, size, c.present && !!c.box && c.box.h > 40, `${c.key} card ${c.box?.h?.toFixed(1) ?? "absent"}px`);
      if (c.population > 0) {
        check(`chart-${c.key}-marks`, size, c.marks > 0, `${c.key}: population ${c.population}, ${c.marks} visible marks`);
      } else {
        console.log(`  · ${c.key}: population ${c.population} — the empty state is asserted instead of marks`);
        check(`chart-${c.key}-empty-honest`, size, c.population === 0 && c.marks === 0, `${c.key}: population ${c.population}, ${c.marks} marks`);
      }
    }
    const populated = r.charts.filter((c) => c.population > 0).length;
    check("charts-populated", size, populated >= 2, `${populated} of 4 charts have a non-zero population on this account`);

    /* 5 · the story: events in date order, ending on today */
    check("story-population", size, r.events.length >= 2, `${r.events.length} events`);
    const dated = r.events.filter((e) => e.kind !== "today").map((e) => e.at);
    const sorted = [...dated].sort((a, b) => a - b);
    check("story-date-order", size, dated.length > 0 && dated.every((t, i) => t === sorted[i]), `dates ${JSON.stringify(dated)}`);
    check("story-ends-today", size, r.events.length > 0 && r.events[r.events.length - 1].kind === "today", `last event ${r.events[r.events.length - 1]?.kind}`);

    /* 6 · the caveats close the page */
    check("caveats-last", size, r.lastMainKid === "caveats", `last element in the main column is ${r.lastMainKid}`);


    /* 7 · negative space: no eyebrow in the header, and no burgundy painted anywhere on the page */
    check("no-eyebrow", size, neg.eyebrow === 0, `${neg.eyebrow} eyebrows in the page`);
    check("no-burgundy-population", size, neg.swept > 200, `${neg.swept} elements swept`);
    check("no-burgundy", size, neg.burg.length === 0, `burgundy on: ${neg.burg.slice(0, 5).join("; ") || "nothing"}`);
    expect(ran - before, "assertion floor").toBeGreaterThanOrEqual(27);
  });
}

test("the range control filters the whole page", async ({ page }) => {
  const before = ran;
  const size = "1440×900";
  await openPage(page, { width: 1440, height: 900 });
  const all = await readPage(page);
  check("range-population", size, !!all && all.sent > 0, `sent in all time = ${all?.sent}`);
  if (!all) return;
  const btn = page.locator('[data-anv="page"]:visible [data-anv="range"] button', { hasText: "Last 3 months" });
  check("range-control-present", size, (await btn.count()) === 1, `${await btn.count()} "Last 3 months" buttons`);
  /* ⚠️ THE PRECONDITION THAT MAKES "IT CHANGED" A CLAIM: a query older than three months exists.
     Without it an inert control and a working one both leave the count alone, and `<=` passed both. */
  const older = Number.isFinite(all.since) && all.since < Date.now() - 92 * 86400000;
  check("range-precondition", size, older, `the first query (${new Date(all.since).toISOString().slice(0, 10)}) is older than three months`);
  await btn.click();
  await page.waitForTimeout(300);
  const three = await readPage(page);
  check("range-pressed", size, !!three && three.range === "3m" && three.pressed.join() === "Last 3 months", `range ${three?.range}, pressed ${JSON.stringify(three?.pressed)}`);
  check("range-changes-sent", size, !!three && three.sent < all.sent, `sent ${all.sent} → ${three?.sent}`);
  const a = all.charts.map((c) => c.population).join(",");
  const b = three?.charts.map((c) => c.population).join(",") ?? "";
  check("range-reaches-charts", size, a !== b, `chart populations ${a} → ${b}`);
  check("range-reaches-story", size, !!three && three.events.length > 0 && three.events.length !== all.events.length,
    `events ${all.events.length} → ${three?.events.length}`);
  expect(ran - before, "assertion floor").toBeGreaterThanOrEqual(7);
});
