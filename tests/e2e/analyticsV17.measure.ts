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
/* ⚠️ PINNED (analytics v24): the shared harness account gains manuscripts from other sessions mid-run, and the page opens
   whichever book is active; the AN21 and AN24 locks already pin "The Smoke Test". AN17-18 still switches through the
   bar, which writes the key itself without a reload, so the pin does not undo its switch. */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { try { if (!sessionStorage.getItem("an17-pinned")) { localStorage.setItem("scriptally_active_manuscript_id", "seed-ms-1"); sessionStorage.setItem("an17-pinned", "1"); } } catch { /* */ } });
});
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
    L.check("AN17-1 main ground", w, c.main === "rgb(242, 238, 232)", `${c.main}`);
    /* the page's own ground: transparent (showing the main) or the same greige — never cream */
    L.check("AN17-1 page ground", w, c.scroller === "rgba(0, 0, 0, 0)" || c.scroller === "rgb(242, 238, 232)", `${c.scroller}`);
    L.check("AN17-1 sidebar", w, c.side === "rgb(230, 228, 224)", `${c.side}`);
    L.check("AN17-1 top bar on the page colour", w, c.bar === "rgb(242, 238, 232)", `${c.bar}`);
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
      L.check("AN17-1 the page ground is greige (pixel)", w, sameRgb(px, [242, 238, 232], 2), `${px}`);
    } else L.check("AN17-1 the page ground is greige (pixel)", w, false, "no strip / first banner to sample between");
    await checkOverflow(page, L, w);
  }
  L.done(32);
});

/* ── AN17-2 · the band ── */
/* RETIRED (header panel v2, 10 Oct): see tests/e2e/RETIRED-header-panel-v2.md. Analytics' header is the panel: no full bleed, no 337px, a 206 (170) disc. HP2 P1, P9. */
test.skip("AN17-2 · band", async ({ page }) => {
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

/* RETIRED (analytics v24): AN17-7 funnel, -8 log, -9 shares, -12 scrub and -13 lanes measured v17 figures that v24 deletes
   (tests/e2e/RETIRED-analytics-v24.md). Their laws live on in AN24-S1, -S3 and -S5. */

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
  /* REWRITTEN (analytics v24): seven question sections; the law — the tab names the section in view — is unchanged */
  const NAMES = ["What happened to your queries?", "Benchmarking", "How many have you sent, and when?", "Do agents reply when they say they will?", "Who are you still waiting on?", "Moments worth remembering", "A note on these numbers"];
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
      for (let i = 0; i < NAMES.length; i++) {
        await scrollToSec(page, i, -40);
        await page.waitForTimeout(350);
        const r = await tabRead(page);
        L.check(`AN17-15 names section ${i + 1} in view`, w, !!r.name && r.name.startsWith(NAMES[i]), `${r.name}`);
      }
      await page.locator('[data-a17="tab-all"]:visible').first().click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(200);
      const m = await tabRead(page);
      L.check("AN17-15 ☰ opens a menu of seven", w, m.menuOpen && m.items === 7, `${m.menuOpen} ${m.items}`);
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
  L.done(40);
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
    /* REWRITTEN (analytics v21): on the desktop the strip is the desk, and the records are v21's */
    /* REWRITTEN (analytics v24): the readings are v24's (`reading-fig`); the funnel and the records are deleted */
    const figs = [...p.querySelectorAll<HTMLElement>('[data-a21="desk-figure"], [data-a21="desk-n"], [data-a24="reading-fig"], [data-a21="card-n"]')]
      .filter((e) => e.getBoundingClientRect().width > 0)
      /* ⚠️ innerText, NOT textContent, for BOTH reads: textContent glues a value to its unit ("0days") and to
         the next line ("None of 1No queries"), so a zero with a unit and a stated population both read wrong
         (measured — the first is how the median-wait mutation went green) */
      .map((e) => ({ kind: e.dataset.a17 ?? e.dataset.a21 ?? e.dataset.a24 ?? "", text: (e.innerText ?? e.textContent ?? "").replace(/\s+/g, " ").trim() /* an SVG <text> has no innerText */, pop: e.dataset.population ?? null, note: (((e.closest("[data-a17-fig]") ?? e.parentElement) as HTMLElement | null)?.innerText ?? "").replace(/\s+/g, " ").trim() }));
    return { sent: Number(p.dataset.sent), figs };
  });
  const all = await read();
  /* RETIRED (analytics v21): the desktop's "Last 90 days" strip state — the strip is not drawn there; the desk states
     the 90-day figures as its own rows, which `all` already reads */
  const r = all;
  L.check("AN17-16 the page is cut to one query", "1512", r?.sent === 1, `${r?.sent}`);
  L.check("AN17-16 figures were found", "1512", (r?.figs.length ?? 0) >= 12, `${r?.figs.length}`);

  const ZERO = /^(0|0%|0\s*[a-z]+|—|-)$/i; /* a unit may sit flush in its own span: "0days" */
  for (const [state, set] of [["all time", all]] as const) {
    for (const f of (set?.figs ?? [])) {
      L.check(`AN17-16 ${f.kind} is not 0 / 0% / a bare dash (${state})`, "1512", !ZERO.test(f.text) && f.text !== "", `"${f.text}"`);
      if (f.pop !== null && Number(f.pop) > 0 && Number(f.pop) < 5) {
        L.check(`AN17-16 ${f.kind} under 5 states its population (${state})`, "1512", /\b\d+\s+(QUER(Y|IES)|quer(y|ies)|repl(y|ies)|REPL(Y|IES))\b/.test(f.note) || /\bof \d+\b/.test(f.note), `"${f.text}" in "${f.note.slice(0, 120)}"`);
      }
    }
  }
  L.done(12);
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
      /* REWRITTEN (analytics v24): the phone draws v24's seven sections; v17's phone figures are deleted */
      const secs = [...p.querySelectorAll<HTMLElement>('section[data-a24="sec"]')].filter(shown);
      const reads = [...p.querySelectorAll<HTMLElement>('[data-a24="readings"]')].filter(shown);
      return {
        secs: secs.length, h2: secs.map((x) => x.querySelector("h2")?.textContent ?? ""),
        oneCol: reads.every((r) => getComputedStyle(r).gridTemplateColumns.split(" ").length === 1), reads: reads.length,
        minSize: sizes.length ? Math.min(...sizes) : NaN, nSizes: sizes.length,
        disc: db ? { w: db.width, h: db.height, top: db.top, right: db.right } : null,
        band: bb ? { top: bb.top, right: bb.right } : null,
        bandPadR: band ? parseFloat(getComputedStyle(p).paddingRight) : NaN,
      };
    });
    L.check("AN17-17 the page renders", w, !!r, `${!!r}`);
    if (!r) continue;
    L.check("AN17-17 the seven sections, on the phone too", w, r.secs === 7 && r.h2[0] === "What happened to your queries?", `${r.secs} ${r.h2[0]}`);
    L.check("AN17-17 the readings are one column", w, r.reads >= 5 && r.oneCol, `${r.reads} ${r.oneCol}`);
    L.check("AN17-17 the disc is 100px", w, !!r.disc && near(r.disc.w, 100, 1) && near(r.disc.h, 100, 1), JSON.stringify(r.disc));
    L.check("AN17-17 the disc is top-right of the band's text", w, !!r.disc && !!r.band && r.disc.top - r.band.top <= 40 && r.band.right - r.disc.right <= r.bandPadR + 2, `${JSON.stringify(r.disc)} band ${JSON.stringify(r.band)}`);
    await checkOverflow(page, L, w);
  }
  L.done(18);
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
      /* REWRITTEN (analytics v24): the funnel is deleted; S1's first pie states the same book's counts */
      funnel: [...(p?.querySelectorAll<SVGElement>('[data-a24="pie-all"] [data-a24="slice"]') ?? [])].map((x) => x.dataset.n).join(",") || null,
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
    L.check("AN17-18 S1's pie changes", "1512", (changed.funnel ?? "").split(",")[0] !== (a.funnel ?? "").split(",")[0], `${a.funnel} → ${changed.funnel}`);
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
