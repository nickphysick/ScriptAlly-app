/**
 * analyticsV17.measure — AN17-1…18, the Analytics page against design-refs/analytics-v17.html, on the
 * rendered page at 1280 / 1440 / 1512 / 1920 (desktop) and 390 / 414 / 760 (phone) unless a lock says
 * otherwise. Every lock also asserts no horizontal overflow of the scroller.
 *
 * ⚠️ RED FIRST. Each lock was run against the unchanged build before the page was rebuilt, and its named
 * mutation was applied afterwards (reports/analytics-v17/REDFIRST.md). Locks the old page passes by
 * accident (the shell, the Query Centre's band, overflow) are proved by their mutation only.
 *
 * ⚠️ POPULATIONS BEFORE PROPERTIES. A filter over an empty set passes vacuously, so every mark-level
 * claim first asserts the set it ranges over is non-empty; and each case asserts a floor on how many
 * readings it took (`Ledger.done`).
 *
 * ⚠️ AN17-16 CUTS THE FIXTURE WITHOUT TOUCHING THE SEED: `window.__SA_AN_LIMIT` is read by the page's
 * dev-only review aid (`lib/analyticsReviewAid`, gated at the call site so production carries none of it).
 */
import { test, type Page } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { openApp } from "./pageHeaderV2Lib";
import {
  ANTH, AT_1512, DESKTOP, DIR, FILLS, Ledger, PHONE, ROUTE, RUST, STATE_RGB, checkOverflow, near, openAn, pixel,
  readDesk, sameRgb, scrollToSec,
} from "./an17Lib";
import { retired } from "./inkRetired";

test.describe.configure({ timeout: Number(process.env.AN17_TIMEOUT ?? 900_000) });
const rgb = (s: string | null) => (s?.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
const isGreenOrRed = (c: string) => {
  const [r, g, b] = rgb(c);
  if (![r, g, b].every(Number.isFinite)) return false;
  /* a saturated green or red: one channel well clear of the other two */
  return (g - Math.max(r, b) > 40) || (r - Math.max(g, b) > 90 && g < 120);
};

/* ── AN17-1 · the shell on this route ── */
test("AN17-1 · shell", async ({ page }) => {
  test.skip(true, retired("the light shell around Analytics (bar ground, sidebar ground, bar rule)", "INK1"));
  const L = new Ledger("an17-1");
  for (const vp of DESKTOP) {
    await openAn(page, vp);
    const w = `${vp.width}`;
    const c = await page.evaluate(() => {
      const vis = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0) ?? null;
      const p = vis('[data-a17="page"]');
      const sc = p?.closest(".wpg-scroll") ?? null;
      const main = vis(".ws-main"), side = vis(".ws-panel"), bar = vis('[data-probe="navrow"]');
      return {
        page: !!p, main: main ? getComputedStyle(main).backgroundColor : null,
        scroller: sc ? getComputedStyle(sc).backgroundColor : null,
        side: side ? getComputedStyle(side).backgroundColor : null, bar: bar ? getComputedStyle(bar).backgroundColor : null,
        barRule: bar ? getComputedStyle(bar, "::after").backgroundColor : null, barRuleOp: bar ? getComputedStyle(bar, "::after").opacity : null,
      };
    });
    L.check("AN17-1 the v17 page is on the route", w, c.page, `${c.page}`);
    L.check("AN17-1 main ground", w, c.main === "rgb(243, 242, 240)", `${c.main}`);
    /* the page's own ground: transparent (showing the main) or the same greige — never cream */
    L.check("AN17-1 page ground", w, c.scroller === "rgba(0, 0, 0, 0)" || c.scroller === "rgb(243, 242, 240)", `${c.scroller}`);
    L.check("AN17-1 sidebar", w, c.side === "rgb(230, 228, 224)", `${c.side}`);
    L.check("AN17-1 top bar on the page colour", w, c.bar === "rgb(243, 242, 240)", `${c.bar}`);
    L.check("AN17-1 top-bar rule", w, c.barRule === "rgba(28, 19, 15, 0.1)" && c.barRuleOp === "1", `${c.barRule} op ${c.barRuleOp}`);
    /* ⚠️ A PIXEL, BECAUSE A COMPUTED BACKGROUND CANNOT SEE A SURFACE PAINTED OVER IT (the brief's
       mutation paints the page cream): sample the ground between the strip and the first banner. */
    const d = await readDesk(page);
    if (d?.glance && d.secs[0]?.ban) {
      /* ⚠️ THE PRECONDITION FIRST: the gap must be ON SCREEN, or the screenshot clip is outside the image
         (measured at 1280). Scroll the strip's foot to the middle of the scrollport, then re-read. */
      await page.evaluate(() => { const g = [...document.querySelectorAll<HTMLElement>('[data-a17="glance"]')].find((e) => e.getBoundingClientRect().height > 0); g?.scrollIntoView({ block: "center" }); });
      await page.waitForTimeout(200);
      const d2 = (await readDesk(page))!;
      const y = (d2.strip!.b + d2.secs[0].box!.t) / 2;
      L.check("AN17-1 the sampled gap is on screen", w, y > 0 && y < vp.height, `${y.toFixed(1)}`);
      const px = await pixel(page, d2.col.l + 4, y);
      L.check("AN17-1 the page ground is greige (pixel)", w, sameRgb(px, [243, 242, 240], 2), `${px}`);
    } else L.check("AN17-1 the page ground is greige (pixel)", w, false, "no strip / first banner to sample between");
    await checkOverflow(page, L, w);
  }
  L.done(32);
});

/* ── AN17-2 · the band ── */
test("AN17-2 · band", async ({ page }) => {
  const L = new Ledger("an17-2");
  for (const vp of DESKTOP) {
    await openAn(page, vp);
    const w = `${vp.width}`;
    const d = await readDesk(page);
    L.check("AN17-2 the band exists", w, !!d?.band, JSON.stringify(d?.band ?? null));
    if (!d?.band || !d.bar || !d.main) { await checkOverflow(page, L, w); continue; }
    L.check("AN17-2 anthracite", w, d.bandBg === ANTH, `${d.bandBg}`);
    L.check("AN17-2 starts at the top bar's bottom edge", w, near(d.band.t, d.bar.b, 1), `band ${d.band.t} bar ${d.bar.b}`);
    const y = d.band.t + 20;
    /* RE-POINTED (ink shell v1): the main column's last 8px are the ink frame; the band spans the SHEET, whose right is the column's − 8 — INK1 */
    const left = await pixel(page, d.main.l + 3, y), right = await pixel(page, d.main.r - 8 - 3, y);
    L.check("AN17-2 spans the main column (pixel at each edge)", w, sameRgb(left, [42, 58, 82], 3) && sameRgb(right, [42, 58, 82], 3), `left ${left} right ${right}`);
    L.check("AN17-2 the title", w, d.bandTitle === "Less guesswork, better results", `${d.bandTitle}`);
    if (vp.width === 1512) L.check("AN17-2 337px tall at 1512 (±2)", w, near(d.band.h, 337, 2), `${d.band.h}`);
    L.check("AN17-2 the disc is 250px", w, !!d.disc && near(d.disc.w, 250, 1) && near(d.disc.h, 250, 1), `${d.disc?.w}×${d.disc?.h}`);
    if (d.disc && d.bandText) {
      L.check("AN17-2 the disc is right of the text", w, d.disc.l >= d.bandText.r - 0.5, `disc ${d.disc.l} text ${d.bandText.r}`);
      L.check("AN17-2 a 64px gap (±2)", w, near(d.disc.l - d.bandText.r, 64, 2), `${(d.disc.l - d.bandText.r).toFixed(1)}`);
      const mid = (d.bandText.l + d.disc.r) / 2, colMid = (d.col.l + d.col.r) / 2;
      L.check("AN17-2 the pair is centred on the content column (±2)", w, near(mid, colMid, 2), `pair ${mid.toFixed(1)} column ${colMid.toFixed(1)}`);
    } else L.check("AN17-2 text and disc found", w, false, `${!!d.bandText} ${!!d.disc}`);
    await checkOverflow(page, L, w);
  }
  L.done(36);
});

/* ── AN17-3 · the Query Centre's band is unchanged ── */
const QC_BASE = `${DIR}/qc-band-baseline.json`;
async function readQcBand(page: Page) {
  await openApp(page, "/queries", AT_1512);
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; animation: none !important; }" });
  await page.waitForTimeout(600);
  return page.evaluate(() => {
    const band = [...document.querySelectorAll<HTMLElement>('[data-probe="page-header"][data-band]')].find((e) => e.getBoundingClientRect().height > 0);
    const b = (e: Element | null | undefined) => { if (!e) return null; const x = e.getBoundingClientRect(); return { l: x.left, t: x.top, w: x.width, h: x.height }; };
    if (!band) return null;
    return {
      band: b(band), title: b(band.querySelector("h1")), disc: b(band.querySelector('[data-probe="band-disc"]')),
      primary: b(band.querySelector(".ph-primary")), secondary: b(band.querySelector(".ph-secondary")),
    };
  });
}
test("AN17-3 · the Query Centre's band", async ({ page }) => {
  test.skip(true, retired("the Query Centre's band at its v126 box — it became a card in the sheet (fix-ups)", "HC1–HC4"));
  const L = new Ledger("an17-3");
  const now = await readQcBand(page);
  if (process.env.AN17_CAPTURE_QC === "1") {
    mkdirSync(DIR, { recursive: true });
    writeFileSync(QC_BASE, JSON.stringify(now, null, 1));
    console.log(`captured ${QC_BASE}`);
  }
  L.check("AN17-3 a baseline exists", "1512", existsSync(QC_BASE), QC_BASE);
  const was = existsSync(QC_BASE) ? JSON.parse(readFileSync(QC_BASE, "utf8")) : null;
  L.check("AN17-3 the band renders", "1512", !!now, JSON.stringify(now));
  if (now && was) {
    L.check("AN17-3 337px tall", "1512", near(now.band.h, 337, 1), `${now.band.h}`);
    for (const k of ["band", "title", "disc", "primary", "secondary"] as const) {
      const a = now[k], b = was[k];
      const ok = !!a && !!b && (["l", "t", "w", "h"] as const).every((q) => near(a[q], b[q], 1));
      L.check(`AN17-3 ${k} at the same box (±1)`, "1512", ok, `now ${JSON.stringify(a)} was ${JSON.stringify(b)}`);
    }
  }
  L.done(8);
});

/* ── AN17-4 · one 40px rhythm ── */
test("AN17-4 · rhythm", async ({ page }) => {
  const L = new Ledger("an17-4");
  for (const vp of DESKTOP) {
    await openAn(page, vp);
    const w = `${vp.width}`;
    const d = await readDesk(page);
    L.check("AN17-4 band and strip found", w, !!d?.band && !!d?.glance, `${!!d?.band} ${!!d?.glance}`);
    L.check("AN17-4 nine sections", w, d?.secs.length === 9, `${d?.secs.length}`);
    if (d?.band && d.glance) L.check("AN17-4 band → strip 40 (±1)", w, near(d.glance.t - d.band.b, 40, 1), `${(d.glance.t - d.band.b).toFixed(1)}`);
    if (d?.strip && d.secs[0]?.box) L.check("AN17-4 strip → first section 40 (±1)", w, near(d.secs[0].box.t - d.strip.b, 40, 1), `${(d.secs[0].box.t - d.strip.b).toFixed(1)}`);
    for (let i = 1; i < (d?.secs.length ?? 0); i++) {
      const prev = d!.secs[i - 1], cur = d!.secs[i];
      L.check(`AN17-4 section ${prev.sec} frame → section ${cur.sec} 40 (±1)`, w, !!prev.frame && !!cur.box && near(cur.box.t - prev.frame.b, 40, 1),
        `${prev.frame && cur.box ? (cur.box.t - prev.frame.b).toFixed(1) : "—"}`);
    }
    await checkOverflow(page, L, w);
  }
  L.done(48);
});

/* ── AN17-5 · at a glance ── */
test("AN17-5 · glance", async ({ page }) => {
  const L = new Ledger("an17-5");
  for (const vp of DESKTOP) {
    await openAn(page, vp);
    const w = `${vp.width}`;
    const d = await readDesk(page);
    const cells = d?.cells ?? [];
    L.check("AN17-5 five cells", w, cells.length === 5, `${cells.length}`);
    cells.forEach((c, i) => {
      L.check(`AN17-5 cell ${i + 1} has a number`, w, c.v.length > 0, c.v);
      L.check(`AN17-5 cell ${i + 1} has a comparison line`, w, c.cmp.length > 8, c.cmp);
      L.check(`AN17-5 cell ${i + 1} has a sparkline with marks`, w, c.sparkMarks > 0, `${c.sparkMarks}`);
      const gr = c.colours.filter(isGreenOrRed);
      L.check(`AN17-5 cell ${i + 1} has no green or red`, w, gr.length === 0, gr.slice(0, 3).join(" "));
    });
    if (vp.width === 1512) {
      const before = cells.map((c) => c.v);
      await page.locator('[data-a17="range"][data-v="d90"]:visible').first().click({ timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(250);
      const mid = (await readDesk(page))?.cells.map((c) => c.v) ?? [];
      await page.locator('[data-a17="range"][data-v="all"]:visible').first().click({ timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(250);
      const after = (await readDesk(page))?.cells.map((c) => c.v) ?? [];
      L.check("AN17-5 Last 90 days changes at least one big number", w, mid.length === 5 && mid.some((v, i) => v !== before[i]), `${before.join(" | ")} → ${mid.join(" | ")}`);
      L.check("AN17-5 All time restores them", w, after.join("|") === before.join("|") && after.length === 5, `${after.join(" | ")}`);
    }
    await checkOverflow(page, L, w);
  }
  L.done(90);
});

/* ── AN17-6 · the open banner and its perch ── */
test("AN17-6 · banner", async ({ page }) => {
  const L = new Ledger("an17-6");
  for (const vp of DESKTOP) {
    await openAn(page, vp);
    const w = `${vp.width}`;
    const d = await readDesk(page);
    L.check("AN17-6 nine sections", w, d?.secs.length === 9, `${d?.secs.length}`);
    for (const s of d?.secs ?? []) {
      L.check(`AN17-6 §${s.sec} the banner has no background`, w, s.banBg === "rgba(0, 0, 0, 0)" && s.banImg === "none", `${s.banBg} ${s.banImg}`);
      L.check(`AN17-6 §${s.sec} the perch's foot is 14px (±2) below the frame's top`, w, !!s.perch && !!s.frame && near(s.perch.b - s.frame.t, 14, 2),
        `${s.perch && s.frame ? (s.perch.b - s.frame.t).toFixed(1) : "—"}`);
      L.check(`AN17-6 §${s.sec} the perch paints above the frame`, w, s.perchParentZ !== null && s.frameZ !== null && s.perchParentZ > s.frameZ, `banner z ${s.perchParentZ} frame z ${s.frameZ}`);
      if (vp.width === 1512) L.check(`AN17-6 §${s.sec} the title is one line at 1512`, w, s.titleLines === 1, `${s.titleLines} lines (${s.titleH.toFixed(1)}px) "${s.titleText}"`);
    }
    await checkOverflow(page, L, w);
  }
  L.done(120);
});

/* ── AN17-7 · the funnel ── */
test("AN17-7 · funnel", async ({ page }) => {
  const L = new Ledger("an17-7");
  for (const vp of DESKTOP) {
    await openAn(page, vp);
    const w = `${vp.width}`;
    const d = await readDesk(page);
    const bars = d?.fbars ?? [];
    L.check("AN17-7 four bars", w, bars.length === 4, `${bars.length}`);
    L.check("AN17-7 the top bar's population is non-zero", w, (bars[0]?.count ?? 0) > 0, `${bars[0]?.count}`);
    if (bars.length === 4 && bars[0].count > 0) {
      const unit = bars[0].w / bars[0].count;
      /* the drawn floor (the ref's 28 of 1200 viewBox units, scaled) keeps a 1-count bar visible; at or
         above it a bar is to scale within ±2% of the top bar */
      const floor = (28 / 850) * bars[0].w;
      bars.forEach((b, i) => {
        const want = b.count * unit;
        const ok = want <= floor ? near(b.w, floor, 1) : Math.abs(b.w - want) <= bars[0].w * 0.02;
        L.check(`AN17-7 bar ${i + 1} is to scale (${b.count})`, w, ok, `w ${b.w.toFixed(1)} expected ${Math.max(want, floor).toFixed(1)}`);
      });
      const fig = (d?.funnelFig?.counts ?? "").split(",").map(Number);
      L.check("AN17-7 the counts are the model's", w, fig.length === 4 && fig.every((n, i) => n === bars[i].count), `bars ${bars.map((b) => b.count)} model ${fig}`);
    }
    const went = d?.went ?? [];
    L.check("AN17-7 three \"went on\" notes", w, went.length === 3 && went.every((x) => /went on/.test(x.text)), went.map((x) => x.text).join(" | "));
    L.check("AN17-7 the notes are rust", w, went.length === 3 && went.every((x) => x.fill === RUST || x.color === RUST), went.map((x) => x.fill).join(" "));
    await checkOverflow(page, L, w);
  }
  L.done(40);
});

/* ── AN17-8 · the training log ── */
test("AN17-8 · log", async ({ page }) => {
  const L = new Ledger("an17-8");
  for (const vp of DESKTOP) {
    await openAn(page, vp);
    const w = `${vp.width}`;
    const d = await readDesk(page);
    const dots = d?.logdots ?? [], bars = d?.wkbars ?? [];
    L.check("AN17-8 the page has dated queries", w, (d?.dated ?? 0) > 0, `${d?.dated}`);
    L.check("AN17-8 one dot per dated query", w, dots.length === d?.dated, `${dots.length} dots, ${d?.dated} dated`);
    L.check("AN17-8 each dot takes its query's status fill", w, dots.length > 0 && dots.every((x) => x.fill === STATE_RGB[x.bucket]), dots.filter((x) => x.fill !== STATE_RGB[x.bucket]).slice(0, 3).map((x) => `${x.bucket}:${x.fill}`).join(" "));
    L.check("AN17-8 weekly bars present", w, bars.length > 0, `${bars.length}`);
    const rust = bars.filter((x) => x.fill === RUST);
    const max = Math.max(0, ...bars.map((x) => x.count));
    L.check("AN17-8 exactly one rust weekly bar", w, rust.length === 1, `${rust.length}`);
    L.check("AN17-8 the rust bar is the busiest week", w, rust.length === 1 && rust[0].count === max, `rust ${rust[0]?.count} busiest ${max}`);
    L.check("AN17-8 the rest are anthracite", w, bars.filter((x) => x.fill !== RUST).every((x) => x.fill === ANTH), [...new Set(bars.map((x) => x.fill))].join(" "));
    await checkOverflow(page, L, w);
  }
  L.done(32);
});

/* ── AN17-9 · the two share bars ── */
test("AN17-9 · shares", async ({ page }) => {
  const L = new Ledger("an17-9");
  for (const vp of DESKTOP) {
    await openAn(page, vp);
    const w = `${vp.width}`;
    const d = await readDesk(page);
    const shares = d?.shares ?? [];
    L.check("AN17-9 two share bars", w, shares.length === 2, `${shares.length}`);
    shares.forEach((s, i) => {
      L.check(`AN17-9 bar ${i + 1} has segments`, w, s.segs.length > 0, `${s.segs.length}`);
      const sum = s.segs.reduce((a, g) => a + g.count, 0);
      L.check(`AN17-9 bar ${i + 1} segments sum to its total`, w, s.total > 0 && sum === s.total, `${sum} of ${s.total}`);
      L.check(`AN17-9 bar ${i + 1} segments take status fills`, w, s.segs.every((g) => g.fill === STATE_RGB[g.bucket] && FILLS.has(g.fill)), s.segs.map((g) => `${g.bucket}:${g.fill}`).join(" "));
    });
    await checkOverflow(page, L, w);
  }
  L.done(28);
});

/* ── AN17-10 · response window honesty ── */
test("AN17-10 · reply", async ({ page }) => {
  const L = new Ledger("an17-10");
  for (const vp of DESKTOP) {
    await openAn(page, vp);
    const w = `${vp.width}`;
    const d = await readDesk(page);
    const rows = d?.rrows ?? [];
    L.check("AN17-10 rows exist", w, rows.length > 0, `${rows.length}`);
    L.check("AN17-10 one row per replied query with a stated window", w, rows.length === d?.replyPop, `${rows.length} rows, population ${d?.replyPop}`);
    const late = rows.filter((r) => r.late), ontime = rows.filter((r) => !r.late);
    L.check("AN17-10 every late reply has a rust dotted leader", w, late.every((r) => r.leaders === 1 && r.leaderStroke === RUST), `${late.length} late; ${late.filter((r) => r.leaders !== 1).length} without`);
    L.check("AN17-10 no on-time reply has one", w, ontime.every((r) => r.leaders === 0), `${ontime.filter((r) => r.leaders > 0).length} of ${ontime.length} on-time rows carry a leader`);
    L.check("AN17-10 both kinds present, or the absent one reported", w, late.length + ontime.length === rows.length, `late ${late.length} on time ${ontime.length}`);
    L.check("AN17-10 dots take status fills", w, rows.length > 0 && rows.every((r) => !!r.dotFill && FILLS.has(r.dotFill)), rows.map((r) => r.dotFill).slice(0, 4).join(" "));
    await checkOverflow(page, L, w);
  }
  L.done(28);
});

/* ── AN17-11 · records ── */
test("AN17-11 · records", async ({ page }) => {
  const L = new Ledger("an17-11");
  for (const vp of DESKTOP) {
    await openAn(page, vp);
    const w = `${vp.width}`;
    const recs = (await readDesk(page))?.recs ?? [];
    L.check("AN17-11 six records", w, recs.length === 6, recs.map((r) => r.key).join(","));
    for (const key of ["first-request", "first-offer"]) {
      const r = recs.find((x) => x.key === key);
      L.check(`AN17-11 ${key} renders StatusDot (and nothing else)`, w, !!r && r.statusDot === 1 && r.svgs === 1, `${r?.statusDot} StatusDot, ${r?.svgs} svg`);
    }
    for (const r of recs) {
      const bad = /^(0|0%|—|-)$/.test(r.v) || r.v === "";
      L.check(`AN17-11 ${r.key} states a value or "Not yet"`, w, !bad, `"${r.v}"`);
    }
    await checkOverflow(page, L, w);
  }
  L.done(40);
  /* the "Not yet" branch is entered by AN17-16's single-query fixture, where no offer exists */
});

/* ── AN17-12 · scrubbing the campaign over time ── */
async function scrubRead(page: Page) {
  return page.evaluate(() => {
    const p = [...document.querySelectorAll<HTMLElement>('[data-a17="page"]')].find((e) => e.getBoundingClientRect().height > 0);
    const svg = p ? [...p.querySelectorAll<SVGSVGElement>('[data-a17="scrub"]')].find((e) => e.getBoundingClientRect().width > 0) : undefined;
    const guide = svg?.querySelector('[data-a17="guide"]');
    const r = svg?.getBoundingClientRect();
    return {
      found: !!svg, box: r ? { l: r.left, t: r.top, w: r.width, h: r.height } : null,
      date: p?.querySelector('[data-a17="sread-date"]')?.textContent?.trim() ?? null,
      guideX: guide ? Number(guide.getAttribute("x1")) : null,
    };
  });
}
test("AN17-12 · scrub", async ({ page }) => {
  const L = new Ledger("an17-12");
  for (const vp of [AT_1512, { width: 390, height: 844 }]) {
    await openAn(page, vp);
    const w = `${vp.width}`;
    await scrollToSec(page, 6, -40);
    await page.waitForTimeout(300);
    const a = await scrubRead(page);
    L.check("AN17-12 the chart is on screen", w, a.found && !!a.box && a.box.t >= 0 && a.box.t + a.box.h <= vp.height, JSON.stringify(a.box));
    L.check("AN17-12 the readout starts at Today", w, a.date === "Today", `${a.date}`);
    if (!a.box) { L.done(3); return; }
    const x = a.box.l + a.box.w * 0.6, y = a.box.t + a.box.h * 0.5;
    if (vp.width > 760) {
      await page.mouse.move(x, y);
    } else {
      /* a finger drag: pointer events, which the page binds on the phone */
      await page.mouse.move(a.box.l + a.box.w * 0.9, y);
      await page.mouse.down();
      await page.mouse.move(x, y, { steps: 6 });
    }
    await page.waitForTimeout(200);
    const b = await scrubRead(page);
    L.check("AN17-12 moving to 60% changes the date from Today", w, !!b.date && b.date !== "Today", `${b.date}`);
    L.check("AN17-12 the guide moves", w, b.guideX !== null && a.guideX !== null && Math.abs(b.guideX - a.guideX) > 1, `${a.guideX} → ${b.guideX}`);
    if (vp.width > 760) {
      await page.mouse.move(a.box.l + a.box.w / 2, a.box.t - 60);
    } else {
      await page.mouse.up();
      await page.mouse.move(a.box.l + a.box.w / 2, a.box.t - 60);
    }
    await page.waitForTimeout(200);
    const c = await scrubRead(page);
    L.check("AN17-12 leaving restores Today", w, c.date === "Today", `${c.date}`);
    await checkOverflow(page, L, w);
  }
  L.done(12);
});

/* ── AN17-13 · every query against time ── */
test("AN17-13 · lanes", async ({ page }) => {
  const L = new Ledger("an17-13");
  for (const vp of DESKTOP) {
    await openAn(page, vp);
    const w = `${vp.width}`;
    const d = await readDesk(page);
    const lanes = d?.lanes ?? [];
    L.check("AN17-13 lanes present", w, lanes.length > 0, `${lanes.length}`);
    L.check("AN17-13 one line per dated query", w, lanes.length === d?.dated && lanes.length === d?.lanesPop, `${lanes.length} lanes, ${d?.dated} dated, population ${d?.lanesPop}`);
    L.check("AN17-13 each line in a status fill", w, lanes.length > 0 && lanes.every((l) => FILLS.has(l.fill)), [...new Set(lanes.map((l) => l.fill))].join(" "));
    L.check("AN17-13 the today line is rust", w, d?.todayStroke === RUST, `${d?.todayStroke}`);
    L.check("AN17-13 the today line sits at the plot's right edge", w, !!d?.today && !!d?.plot && near(d.today.r, d.plot.r, 2), `today ${d?.today?.r} plot ${d?.plot?.r}`);
    await checkOverflow(page, L, w);
  }
  L.done(24);
});

/* ── AN17-14 · the caveats' workspace and the footer ── */
test("AN17-14 · workspace + footer", async ({ page }) => {
  const L = new Ledger("an17-14");
  for (const vp of DESKTOP) {
    await openAn(page, vp);
    const w = `${vp.width}`;
    const d = await readDesk(page);
    L.check("AN17-14 the workspace is blush", w, d?.wsBg === "rgb(244, 224, 212)", `${d?.wsBg}`);
    L.check("AN17-14 radius 22", w, d?.wsRadius === "22px", `${d?.wsRadius}`);
    L.check("AN17-14 an anthracite band", w, d?.wsBandBg === ANTH, `${d?.wsBandBg}`);
    L.check("AN17-14 four white cards", w, d?.wsCards.length === 4 && d.wsCards.every((c) => c === "rgb(255, 255, 255)"), `${d?.wsCards.join(" ")}`);
    L.check("AN17-14 the footer is mounted", w, !!d?.foot && !!d?.footIn, `${!!d?.foot}`);
    if (d?.footIn) L.check("AN17-14 footer content box = the content column (±1)", w, near(d.footIn.l, d.col.l, 1) && near(d.footIn.r, d.col.r, 1), `${d.footIn.l}–${d.footIn.r} vs ${d.col.l}–${d.col.r}`);
    if (d?.foot && d.main) {
      /* scroll the footer into view, then sample its top rule at both edges of the main column */
      await page.evaluate(() => { const f = [...document.querySelectorAll<HTMLElement>('[data-probe="app-footer"]')].find((e) => e.getBoundingClientRect().height > 0); f?.scrollIntoView({ block: "center" }); });
      await page.waitForTimeout(250);
      const f = await page.evaluate(() => { const f = [...document.querySelectorAll<HTMLElement>('[data-probe="app-footer"]')].find((e) => e.getBoundingClientRect().height > 0)!; const r = f.getBoundingClientRect(); return { t: r.top }; });
      /* ⚠️ A 1px RULE AT A FRACTIONAL y IS BLENDED ACROSS ROWS, so no single pixel has a fixed value. The
         claim is that the rule runs the main column's width: the COLUMN of rows −3…+1 at each edge of the
         scroller's client box (clear of a classic scrollbar, which darkens the last 15px) must equal the same
         column at the centre (±3), and that column must carry a row darker than the page above it (the rule). */
      const f2 = await page.evaluate(() => { const f = [...document.querySelectorAll<HTMLElement>('[data-probe="app-footer"]')].find((e) => e.getBoundingClientRect().height > 0)!; const sc = f.closest(".wpg-scroll") as HTMLElement; const r = sc.getBoundingClientRect(); return { l: r.left, cw: sc.clientWidth }; });
      const column = async (x: number) => { const out: number[] = []; for (let dy = -3; dy <= 1; dy++) out.push((await pixel(page, x, Math.floor(f.t) + dy))[0]); return out; };
      const cl = await column(f2.l + 3), cc = await column(f2.l + f2.cw / 2), cr = await column(f2.l + f2.cw - 3);
      /* compared as PROFILES, each column against its own top row: the window's right edge carries a shade that
         darkens every row there by ~7 (measured, page rows included), which says nothing about the rule */
      const same = (a: number[], b: number[]) => a.every((v, i) => Math.abs((v - a[0]) - (b[i] - b[0])) <= 3);
      const ruled = Math.min(...cc) <= cc[0] - 4;
      L.check("AN17-14 the footer's top rule spans the main column", w, ruled && same(cl, cc) && same(cr, cc), `left ${cl} centre ${cc} right ${cr}`);
    }
    await checkOverflow(page, L, w);
  }
  L.done(32);
});

/* ── AN17-15 · the section tab ── */
async function tabRead(page: Page) {
  return page.evaluate(() => {
    const t = [...document.querySelectorAll<HTMLElement>('[data-a17="tab"]')].find((e) => e.getBoundingClientRect().height > 0) ?? null;
    const win = [...document.querySelectorAll<HTMLElement>(".ws-window")].find((e) => e.getBoundingClientRect().height > 0) ?? null;
    const b = (e: Element | null) => { if (!e) return null; const x = e.getBoundingClientRect(); return { l: x.left, t: x.top, r: x.right, b: x.bottom }; };
    const menu = t?.querySelector('[data-a17="tab-menu"]') as HTMLElement | null;
    return {
      tab: b(t), win: b(win), name: t?.querySelector('[data-a17="tab-name"]')?.textContent?.trim() ?? null,
      menuOpen: !!menu && menu.getBoundingClientRect().height > 0, items: menu ? menu.querySelectorAll('[data-a17="tab-item"]').length : 0,
      position: t ? getComputedStyle(t).position : null,
    };
  });
}
test("AN17-15 · tab", async ({ page }) => {
  const L = new Ledger("an17-15");
  const NAMES = ["Where the", "Queries sent", "Response rate", "Response window honesty", "Wait times by stage", "Firsts and records", "The campaign over time", "How things stand", "Reading the numbers"];
  for (const vp of DESKTOP) {
    await openAn(page, vp);
    const w = `${vp.width}`;
    const a = await tabRead(page);
    L.check("AN17-15 the tab exists", w, !!a.tab, JSON.stringify(a.tab));
    L.check("AN17-15 fixed", w, a.position === "fixed", `${a.position}`);
    /* RE-POINTED (ink shell v1): floating tabs sit 20px in from the sheet's corner — INK17 */
    L.check("AN17-15 20px from the window box's right and bottom (±1)", w, !!a.tab && !!a.win && near(a.win.r - a.tab.r, 20, 1) && near(a.win.b - a.tab.b, 20, 1),
      `${a.tab && a.win ? `${(a.win.r - a.tab.r).toFixed(1)} / ${(a.win.b - a.tab.b).toFixed(1)}` : "—"}`);
    L.check("AN17-15 before the first section it reads Under the hood", w, a.name === "Under the hood", `${a.name}`);
    if (vp.width === 1512) {
      /* ⚠️ THE ANCHOR, NOT THE NUMBER (Phase 9): the window box is flush with the viewport at its right and
         bottom, so "24 from the window" and "24 from the viewport" read the same and the mutation that pins
         the tab to the viewport went green. Pull the window in from both edges and measure again — the
         precondition first, so a perturbation that did nothing cannot pass for one that did. */
      const perturb = await page.addStyleTag({ content: ".ws-window { margin-right: 60px !important; margin-bottom: 40px !important; }" });
      await page.waitForTimeout(300);
      const p = await tabRead(page);
      const vw = await page.evaluate(() => ({ w: document.documentElement.clientWidth, h: document.documentElement.clientHeight }));
      L.check("AN17-15 precondition: the window is pulled in from the viewport", w, !!p.win && vw.w - p.win.r >= 30 && vw.h - p.win.b >= 20, p.win ? `${(vw.w - p.win.r).toFixed(1)} / ${(vw.h - p.win.b).toFixed(1)}` : "—");
      L.check("AN17-15 the tab follows the window, not the viewport (±1)", w, !!p.tab && !!p.win && near(p.win.r - p.tab.r, 20, 1) && near(p.win.b - p.tab.b, 20, 1),
        `${p.tab && p.win ? `${(p.win.r - p.tab.r).toFixed(1)} / ${(p.win.b - p.tab.b).toFixed(1)}` : "—"}`);
      await perturb.evaluate((el) => (el as Element).remove());
      await page.waitForTimeout(300);
    }
    if (vp.width === 1512 || vp.width === 1280) {
      for (let i = 0; i < 9; i++) {
        await scrollToSec(page, i, -40);
        await page.waitForTimeout(350);
        const r = await tabRead(page);
        L.check(`AN17-15 names section ${i + 1} in view`, w, !!r.name && r.name.startsWith(NAMES[i]), `${r.name}`);
      }
      await page.locator('[data-a17="tab-all"]:visible').first().click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(200);
      const m = await tabRead(page);
      L.check("AN17-15 ☰ opens a menu of nine", w, m.menuOpen && m.items === 9, `${m.menuOpen} ${m.items}`);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
      const e = await tabRead(page);
      L.check("AN17-15 Escape closes the menu", w, !e.menuOpen, `${e.menuOpen}`);
      L.check("AN17-15 Escape closes the menu only (the tab stays)", w, !!e.tab, `${!!e.tab}`);
    }
    await checkOverflow(page, L, w);
  }
  for (const vp of PHONE) {
    await openAn(page, vp);
    const a = await tabRead(page);
    L.check("AN17-15 absent at ≤760px", `${vp.width}`, !a.tab, JSON.stringify(a.tab));
  }
  L.done(45);
});

/* ── AN17-16 · the thin-sample rule, on a single query ── */
test("AN17-16 · thin sample", async ({ page }) => {
  const L = new Ledger("an17-16");
  await page.addInitScript(() => { (window as unknown as { __SA_AN_LIMIT?: number }).__SA_AN_LIMIT = 1; });
  await openAn(page, AT_1512);
  /* ⚠️ BOTH STRIP STATES (Phase 9): "Last 90 days" swaps the strip's numbers, and a figure that is empty in
     that window is exactly where a zero can hide — the all-time state alone missed the median-wait
     mutation, because the one query kept has a reply all-time and none in the last 90 days. */
  const read = () => page.evaluate(() => {
    const p = [...document.querySelectorAll<HTMLElement>('[data-a17="page"]')].find((e) => e.getBoundingClientRect().height > 0);
    if (!p) return null;
    /* every FIGURE: the strip's numbers, the readings, the records' values, the funnel counts */
    const figs = [...p.querySelectorAll<HTMLElement>('[data-a17="gv"], [data-a17="read-v"], [data-a17="rec-v"], [data-a17="fcount"]')]
      .filter((e) => e.getBoundingClientRect().width > 0)
      /* ⚠️ innerText, NOT textContent, for BOTH reads: textContent glues a value to its unit ("0days") and to
         the next line ("None of 1No queries"), so a zero with a unit and a stated population both read wrong
         (measured — the first is how the median-wait mutation went green) */
      .map((e) => ({ kind: e.dataset.a17 ?? "", text: (e.innerText ?? e.textContent ?? "").replace(/\s+/g, " ").trim() /* an SVG <text> has no innerText */, pop: e.dataset.population ?? null, note: (((e.closest("[data-a17-fig]") ?? e.parentElement) as HTMLElement | null)?.innerText ?? "").replace(/\s+/g, " ").trim() }));
    return { sent: Number(p.dataset.sent), figs };
  });
  const all = await read();
  await page.locator('[data-a17="range"][data-v="d90"]:visible').first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(250);
  const d90 = await read();
  await page.locator('[data-a17="range"][data-v="all"]:visible').first().click({ timeout: 4000 }).catch(() => {});
  const r = all;
  L.check("AN17-16 the page is cut to one query", "1512", r?.sent === 1, `${r?.sent}`);
  L.check("AN17-16 figures were found", "1512", (r?.figs.length ?? 0) >= 12, `${r?.figs.length}`);
  L.check("AN17-16 the Last 90 days strip was read", "1512", (d90?.figs.filter((f) => f.kind === "gv").length ?? 0) === 5, `${d90?.figs.filter((f) => f.kind === "gv").length}`);
  const ZERO = /^(0|0%|0\s*[a-z]+|—|-)$/i; /* a unit may sit flush in its own span: "0days" */
  for (const [state, set] of [["all time", all], ["last 90 days", d90]] as const) {
    for (const f of (set?.figs ?? []).filter((x) => state === "all time" || x.kind === "gv")) {
      L.check(`AN17-16 ${f.kind} is not 0 / 0% / a bare dash (${state})`, "1512", !ZERO.test(f.text) && f.text !== "", `"${f.text}"`);
      if (f.pop !== null && Number(f.pop) > 0 && Number(f.pop) < 5) {
        L.check(`AN17-16 ${f.kind} under 5 states its population (${state})`, "1512", /\b\d+\s+(QUER(Y|IES)|quer(y|ies)|repl(y|ies)|REPL(Y|IES))\b/.test(f.note) || /\bof \d+\b/.test(f.note), `"${f.text}" in "${f.note.slice(0, 120)}"`);
      }
    }
  }
  L.done(14);
});

/* ── AN17-17 · the phone ── */
test("AN17-17 · phone", async ({ page }) => {
  const L = new Ledger("an17-17");
  for (const vp of PHONE) {
    await openAn(page, vp);
    const w = `${vp.width}`;
    const r = await page.evaluate(() => {
      const p = [...document.querySelectorAll<HTMLElement>('[data-a17="page"]')].find((e) => e.getBoundingClientRect().height > 0);
      if (!p) return null;
      const shown = (e: Element) => { const s = getComputedStyle(e); const x = e.getBoundingClientRect(); return s.display !== "none" && x.width > 0 && x.height > 0; };
      const disc = p.querySelector('[data-probe="band-disc"]');
      const band = p.querySelector('[data-probe="page-header"][data-band]');
      const db = disc?.getBoundingClientRect(), bb = band?.getBoundingClientRect();
      /* every chart label's size, as rendered: an SVG text's px size times the svg's on-screen scale */
      const sizes: number[] = [];
      for (const t of [...p.querySelectorAll<SVGTextElement>(".a17-m svg text")].filter(shown)) {
        const svg = t.ownerSVGElement!;
        const vb = svg.viewBox.baseVal;
        const scale = vb && vb.width ? svg.getBoundingClientRect().width / vb.width : 1;
        sizes.push(parseFloat(getComputedStyle(t).fontSize) * scale);
      }
      for (const e of [...p.querySelectorAll<HTMLElement>(".a17-m *")].filter((e) => shown(e) && e.childNodes.length && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim()))) {
        sizes.push(parseFloat(getComputedStyle(e).fontSize));
      }
      return {
        funRows: [...p.querySelectorAll('[data-a17="m-fun"] [data-a17="m-funrow"]')].filter(shown).length,
        weeks: [...p.querySelectorAll('[data-a17="m-week"]')].filter(shown).length,
        more: [...p.querySelectorAll('[data-a17="m-more"]')].filter(shown).map((e) => e.textContent?.trim() ?? ""),
        stack: [...p.querySelectorAll('[data-a17="m-share"] [data-a17="m-stack"]')].filter(shown).length,
        reply: [...p.querySelectorAll('[data-a17="m-reply"]')].filter(shown).length,
        desktopShown: [...p.querySelectorAll(".a17-d")].filter(shown).length,
        desktopTotal: p.querySelectorAll(".a17-d").length,
        minSize: sizes.length ? Math.min(...sizes) : NaN, nSizes: sizes.length,
        disc: db ? { w: db.width, h: db.height, top: db.top, right: db.right } : null,
        band: bb ? { top: bb.top, right: bb.right } : null,
        bandPadR: band ? parseFloat(getComputedStyle(p).paddingRight) : NaN,
      };
    });
    L.check("AN17-17 the page renders", w, !!r, `${!!r}`);
    if (!r) continue;
    L.check("AN17-17 funnel rows", w, r.funRows === 4, `${r.funRows}`);
    L.check("AN17-17 the log shows 12 weeks (or all, if fewer)", w, r.weeks > 0 && r.weeks <= 12, `${r.weeks}`);
    L.check("AN17-17 the Show all toggle", w, r.more.length === 1 && /^Show all \d+ weeks$/.test(r.more[0]), r.more.join(" | "));
    L.check("AN17-17 the stacked share bar", w, r.stack === 2, `${r.stack}`);
    L.check("AN17-17 the phone reply chart", w, r.reply === 1, `${r.reply}`);
    L.check("AN17-17 desktop figures hidden", w, r.desktopTotal > 0 && r.desktopShown === 0, `${r.desktopShown} of ${r.desktopTotal} shown`);
    L.check("AN17-17 every chart label ≥ 9px", w, r.nSizes > 10 && r.minSize >= 8.99, `min ${r.minSize.toFixed(2)} over ${r.nSizes}`);
    L.check("AN17-17 the disc is 100px", w, !!r.disc && near(r.disc.w, 100, 1) && near(r.disc.h, 100, 1), JSON.stringify(r.disc));
    L.check("AN17-17 the disc is top-right of the band's text", w, !!r.disc && !!r.band && r.disc.top - r.band.top <= 40 && r.band.right - r.disc.right <= r.bandPadR + 2, `${JSON.stringify(r.disc)} band ${JSON.stringify(r.band)}`);
    /* the toggle shows all */
    await page.locator('[data-a17="m-more"]:visible').first().click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(200);
    const all = await page.evaluate(() => [...document.querySelectorAll('[data-a17="m-week"]')].filter((e) => e.getBoundingClientRect().height > 0).length);
    const label = r.more[0]?.match(/\d+/)?.[0];
    L.check("AN17-17 Show all reveals every week", w, !!label && all === Number(label), `${all} of ${label}`);
    await checkOverflow(page, L, w);
  }
  L.done(36);
});

/* ── AN17-18 · the active manuscript ── */
test("AN17-18 · manuscript", async ({ page }) => {
  const L = new Ledger("an17-18");
  await openAn(page, AT_1512);
  const read = async () => page.evaluate(() => {
    const p = [...document.querySelectorAll<HTMLElement>('[data-a17="page"]')].find((e) => e.getBoundingClientRect().height > 0);
    return {
      ms: p?.dataset.ms ?? null, sent: Number(p?.dataset.sent ?? "-1"),
      strip: p?.querySelector('[data-a17="gcell"] [data-a17="gv"]')?.textContent?.trim() ?? null,
      funnel: p?.querySelector('[data-a17="fig"][data-key="funnel"]')?.getAttribute("data-counts") ?? null,
    };
  });
  const a = await read();
  L.check("AN17-18 the page reads a manuscript", "1512", !!a.ms && a.sent > 0, JSON.stringify(a));
  /* pick another manuscript with queries through the bar's own switcher */
  const switcher = page.locator('[aria-haspopup="menu"][aria-label^="Manuscript:"]:visible').first();
  let changed: Awaited<ReturnType<typeof read>> | null = null;
  const loadsBefore = await page.evaluate(() => performance.getEntriesByType("navigation").length);
  for (let i = 0; i < 6 && !changed; i++) {
    await switcher.click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(250);
    const items = page.locator('.ws-ms-menu [role="menuitemradio"][aria-checked="false"]');
    const n = await items.count();
    if (i >= n) break;
    await items.nth(i).click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(900);
    const b = await read();
    if (b.ms && b.ms !== a.ms && b.sent > 0) changed = b;
  }
  L.check("AN17-18 switched to another manuscript with queries", "1512", !!changed, JSON.stringify(changed));
  if (changed) {
    L.check("AN17-18 the strip's first number changes", "1512", changed.strip !== a.strip, `${a.strip} → ${changed.strip}`);
    L.check("AN17-18 the funnel's top count changes", "1512", (changed.funnel ?? "").split(",")[0] !== (a.funnel ?? "").split(",")[0], `${a.funnel} → ${changed.funnel}`);
  }
  const loadsAfter = await page.evaluate(() => performance.getEntriesByType("navigation").length);
  L.check("AN17-18 without a reload", "1512", loadsAfter === loadsBefore, `${loadsBefore} → ${loadsAfter} document loads`);
  /* put the original back */
  if (changed && a.ms) await page.evaluate((id) => localStorage.setItem("scriptally_active_manuscript_id", id), a.ms);
  await checkOverflow(page, L, "1512");
  L.done(5);
});

/* ── screenshots (Phase 9; off unless AN17_SHOTS=1): each state a reference PNG shows, at its size, @2× ── */
test.describe("AN17 shots", () => {
  test.use({ deviceScaleFactor: 2 });
  const ONLY = (process.env.AN17_SHOT_SIZES ?? "1512,390").split(",").map(Number);
  const STATES: { name: string; sec: number | null; menu?: boolean }[] = [
    { name: "01-top", sec: null }, { name: "02-funnel", sec: 0 }, { name: "03-log", sec: 1 }, { name: "04-rate", sec: 2 },
    { name: "05-reply", sec: 3 }, { name: "06-wait", sec: 4 }, { name: "07-records", sec: 5 }, { name: "08-overtime", sec: 6 },
    { name: "09-stand", sec: 7 }, { name: "10-reading", sec: 8 }, { name: "11-section-menu", sec: 2, menu: true },
  ];
  for (const vp of [...DESKTOP, ...PHONE].filter((v) => ONLY.includes(v.width))) {
    test(`shots @ ${vp.width}`, async ({ page }) => {
      test.skip(process.env.AN17_SHOTS !== "1", "screenshots run on request");
      await openAn(page, vp);
      mkdirSync(`${DIR}/shots`, { recursive: true });
      for (const s of STATES) {
        if (vp.width <= 760 && s.menu) continue;
        if (s.sec === null) await page.evaluate(() => { const p = [...document.querySelectorAll<HTMLElement>('[data-a17="page"]')].find((e) => e.getBoundingClientRect().height > 0); (p?.closest(".wpg-scroll") as HTMLElement | null)?.scrollTo(0, 0); });
        else await scrollToSec(page, s.sec, -12);
        if (s.menu) await page.locator('[data-a17="tab-all"]:visible').first().click({ timeout: 3000 }).catch(() => {});
        /* the reveal is 0.7s plus a 0.12s stagger: 350ms photographed it mid-fade */
        await page.waitForTimeout(1100);
        await page.screenshot({ path: `${DIR}/shots/${vp.width}-${s.name}@2x.png` });
        if (s.menu) await page.keyboard.press("Escape");
      }
      await page.evaluate(() => { const f = [...document.querySelectorAll<HTMLElement>('[data-probe="app-footer"]')].find((e) => e.getBoundingClientRect().height > 0); f?.scrollIntoView({ block: "end" }); });
      await page.waitForTimeout(1100);
      await page.screenshot({ path: `${DIR}/shots/${vp.width}-12-footer@2x.png` });
    });
  }
});
