/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v2 — the DB2 locks, measured on the rendered page (ref design-refs/dashboard-v2/), at 1512 × 982 and
 * 1280 × 800, on the emulator's harness account (`npm run e2e:emu -- tests/e2e/dashV2.measure.ts`).
 *
 * A1 the band · A2 the grid · A3 what is gone · B1 the frame · C1 the chart's fill runs edge to edge · C2 one circle
 * per week, each the derivation's figure · C3 the hover · D1 the founding card · E1 the feed ends level with the
 * founding card and scrolls inside itself · F1 the hawk in the corner. L1 is the earlier suites (see the report).
 *
 * Every lock states its population first. `DB2_MUTATE=<lock>` applies that lock's named break in the page, and the
 * lock must go red under it.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute, liftMotionSuppression } from "./measure";
import { harnessDb } from "./harnessDocs";
import { dash2Weeks, visibleWeeks } from "../../src/lib/dash2";
import { scopeQueries } from "../../src/lib/manuscriptScope";
import { TIERS } from "../../src/lib/foundingStats";
import type { Query } from "../../src/types";

const DIR = "reports/dashboard-v2";
const SIZES = [{ width: 1512, height: 982 }, { width: 1280, height: 800 }] as const;
type VP = { width: number; height: number };
const tag = (v: VP) => `${v.width}x${v.height}`;
const MUT = process.env.DB2_MUTATE ?? "";

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(lock: string, where: string, ok: boolean, detail: string) { this.rows.push({ lock, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${this.name}${MUT ? `.mut-${MUT}` : ""}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.lock} · ${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/** The in-page breaks, each the lock's own named mutation. */
const CSS_MUT: Record<string, string> = {
  A1: ".d2-bandtx { flex-direction: column-reverse !important; }",
  /* the inset's own break: the 6px top padding first shipped, which put the band under the sheet's lip */
  A1i: ".d58[data-mode=\"d2\"] .d58-page { padding-top: 6px !important; }",
  A2: ".d2-mid { order: 3 !important; } .d2-right { order: 2 !important; }",
  B1: ".d58.d2 .os-card { padding: 0 !important; }",
  E1: ".d58.d2 .d2-feed { position: sticky !important; inset: auto !important; top: 0 !important; height: 100vh !important; }",
  /* ⚠️ NOT the brief's bare `position: absolute`: the hawk is portalled to <body> and this app's document never
     scrolls (the page scrolls inside .ws-wbody), so absolute-in-body is identical to fixed and that break is a no-op.
     The fault to guard is the hawk mounted IN the page, absolute — moved there below in openDash. */
  F1: ".d58.d2 { position: relative !important; } .d2 .d2-perch { position: absolute !important; }",
};

async function openDash(page: Page, vp: VP) {
  /* the querying manuscript feed v1's locks use: it carries agents' replies, so every switch has a population */
  await page.addInitScript(() => { try { localStorage.setItem("scriptally_active_manuscript_id", "seed-ms-1"); } catch { /* private mode */ } });
  await openRoute(page, "/dashboard", vp);
  await page.locator('.d2 [data-d58="page"][data-loading="0"]').first().waitFor({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  if (CSS_MUT[MUT]) await page.addStyleTag({ content: CSS_MUT[MUT] });
  if (MUT === "F1") await page.evaluate(() => { const h = document.querySelector('[data-d2="hawk"]'); const root = document.querySelector(".d58.d2"); if (h && root) root.appendChild(h); });
  if (MUT === "A3") await page.evaluate(() => document.querySelector('[data-d2="left"]')?.insertAdjacentHTML("beforeend", '<div data-df1="tip-slot"><h3>Top tip</h3></div>'));
  if (MUT === "C1") await page.evaluate(() => document.querySelector('[data-d2="fill"]')?.setAttribute("transform", "matrix(0.94,0,0,1,12,0)"));
  /* RE-POINTED (Dashboard v2.1) */ if (MUT === "C2") await page.evaluate(() => { const w = [...document.querySelectorAll<HTMLElement>('[data-d2="week"]')]; const t = w.map((x) => x.dataset.total ?? ""); w.forEach((x, i) => { if (i > 0) x.dataset.total = t[i - 1]; }); });
  /* RE-POINTED (Dashboard v2.1) */ if (MUT === "D1") await page.evaluate(() => { const e = document.querySelector('[data-d2="fw-rank"]'); if (e) e.textContent = "Egg"; const c = document.querySelector<HTMLElement>('[data-d2-card="founding"]'); if (c) { c.dataset.done = "0"; c.dataset.needed = "1"; } });
  await page.waitForTimeout(150);
}

const shot = async (page: Page, name: string, full = false) => {
  if (!process.env.DB2_SHOTS) return;
  mkdirSync(`${DIR}/shots`, { recursive: true });
  /* the document never scrolls (the page scrolls inside .ws-wbody), so "full" is a viewport tall enough for the page */
  const vp = page.viewportSize()!;
  if (full) { await page.setViewportSize({ width: vp.width, height: 1900 }); await page.waitForTimeout(500); }
  await page.screenshot({ path: `${DIR}/shots/${name}.png`, animations: "disabled" });
  if (full) { await page.setViewportSize(vp); await page.waitForTimeout(300); }
};

const box = (page: Page, sel: string) => page.evaluate((s) => {
  const e = [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getBoundingClientRect().height > 0);
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height, r: r.right, b: r.bottom };
}, sel);


for (const vp of SIZES) {
  test(`DB2 A · the band, the grid, what is gone · ${tag(vp)}`, async ({ page }) => {
    const L = new Ledger(`A-${tag(vp)}`);
    await openDash(page, vp);
    await shot(page, `01-dashboard-${vp.width}`);
    const r = await page.evaluate(() => {
      const band = document.querySelector<HTMLElement>('.d2 [data-d2="band"]');
      const grid = document.querySelector<HTMLElement>('.d2 [data-d2="grid"]');
      const lines: string[] = [];
      if (band) {
        /* RE-POINTED (Dashboard v2.1) */ /* the weeks-querying tag (v2.1) sits above the title; the title-then-by-line law is about the lines under it */
        const walk = document.createTreeWalker(band.querySelector(".d2-bandtx") ?? band, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentElement?.closest('[data-d2="weeks-tag"]') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
        const seen: { y: number; t: string }[] = [];
        while (walk.nextNode()) {
          const t = walk.currentNode.textContent ?? "";
          if (!t.trim()) continue;
          const rg = document.createRange(); rg.selectNodeContents(walk.currentNode);
          const rc = rg.getBoundingClientRect();
          if (rc.width > 0) seen.push({ y: rc.top, t });
        }
        seen.sort((a, b) => a.y - b.y);
        /* one LINE per row of ink: "by " and the name are two text nodes on one line */
        let lastY = -1e9;
        for (const s of seen) { if (Math.abs(s.y - lastY) <= 4 && lines.length) lines[lines.length - 1] += s.t; else lines.push(s.t); lastY = s.y; }
        for (let i = 0; i < lines.length; i++) lines[i] = lines[i].replace(/\s+/g, " ").trim();
      }
      const order = (col: string, sel: string) => [...document.querySelectorAll<HTMLElement>(`.d2 [data-d2="${col}"] ${sel}`)]
        .filter((e) => e.getBoundingClientRect().height > 0).sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)
        .map((e) => e.getAttribute("aria-label"));
      const cols = ["left", "mid", "right"].map((c) => { const e = document.querySelector<HTMLElement>(`.d2 [data-d2="${c}"]`)!.getBoundingClientRect(); return { x: e.x, w: e.width }; });
      const page = document.querySelector<HTMLElement>('.d2 [data-d58="page"]')!;
      const sheet = band?.closest(".ws-window")?.getBoundingClientRect();
      return {
        inset: sheet && band ? band.getBoundingClientRect().top - sheet.top : -1,
        bandW: band?.getBoundingClientRect().width ?? 0, gridW: grid?.getBoundingClientRect().width ?? 0, gridX: grid?.getBoundingClientRect().x ?? 0, bandX: band?.getBoundingClientRect().x ?? 0,
        /* RE-POINTED (Dashboard v2.1) */ /* the tag is a count, not a status label: the no-status law reads the band without it */
        lines, bandText: (band?.textContent ?? "").replace(band?.querySelector('[data-d2="weeks-tag"]')?.textContent ?? "\u0000", ""),
        title: document.querySelector('.d2 [data-d2="title"]')?.textContent?.trim() ?? "",
        by: document.querySelector('.d2 [data-d2="by"]')?.textContent?.trim() ?? "",
        left: order("left", ".os-card[aria-label]"), mid: order("mid", ".os-card[aria-label]"), cols,
        gone: ["Top tip", 'data-df1="scout', 'data-df1="goal"', 'data-df1="footer-slot"', 'data-df1="tip-slot"', 'data-df1="scout-slot"', "d59-tab", 'data-d58="shadow"']
          .filter((s) => page.outerHTML.includes(s) || document.querySelector('[data-d58="sheet-layer"]') !== null && s === 'data-d58="shadow"'),
      };
    });
    L.check("A1", "population", r.lines.length >= 2 && r.title.length > 0, `lines ${JSON.stringify(r.lines.slice(0, 5))}`);
    L.check("A1", "spans the grid", Math.abs(r.bandW - r.gridW) <= 1 && Math.abs(r.bandX - r.gridX) <= 1, `band ${r.bandW.toFixed(1)}@${r.bandX.toFixed(1)} grid ${r.gridW.toFixed(1)}@${r.gridX.toFixed(1)}`);
    L.check("A1", "28px below the sheet's top, clear of its lip", Math.abs(r.inset - 28) <= 2, `${r.inset.toFixed(1)}px`);
    L.check("A1", "title, then by-line", r.lines[0] === r.title && r.lines[1] === r.by && r.by.startsWith("by "), `${JSON.stringify(r.lines.slice(0, 2))}`);
    L.check("A1", "no status", !/querying|getting ready|between rounds|still writing|in revision/i.test(r.bandText.replace(/Log a query/g, "")), r.bandText.slice(0, 120));
    const want = vp.width >= 1321 ? 400 : 340;
    L.check("A2", "population", r.cols.length === 3 && r.left.length >= 2 && r.mid.length === 2, `left ${JSON.stringify(r.left)} mid ${JSON.stringify(r.mid)}`);
    L.check("A2", "right column width", Math.abs(r.cols[2].w - want) <= 2 && r.cols[2].x > r.cols[1].x && r.cols[1].x > r.cols[0].x, `right ${r.cols[2].w.toFixed(1)} (want ${want}), xs ${r.cols.map((c) => c.x.toFixed(0))}`);
    /* RE-POINTED (Dashboard v2.2): left is Next up then Agents on file; the middle is the chart then Closed queries —
       the founding writer is a band above the grid (DB22 A1) */
    const leftWant = ["Next up", "Agents on file"].filter((n) => r.left.includes(n));
    L.check("A2", "left order", JSON.stringify(r.left.filter((n) => leftWant.includes(n!))) === JSON.stringify(leftWant) && leftWant.length >= 2 && r.left[r.left.length - 1] === "Agents on file", JSON.stringify(r.left));
    L.check("A2", "middle order", JSON.stringify(r.mid) === JSON.stringify(["Active queries", "Closed queries"]), JSON.stringify(r.mid));
    L.check("A3", "removed", r.gone.length === 0, `still present: ${r.gone.join(", ")}`);
    L.done(10);
  });

  test(`DB2 B · the frame on all four cards · ${tag(vp)}`, async ({ page }) => {
    const L = new Ledger(`B-${tag(vp)}`);
    await openDash(page, vp);
    const cards = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".d2 .os-card")].filter((e) => e.getBoundingClientRect().height > 0).map((c) => {
      const cs = getComputedStyle(c);
      const fr = c.querySelector<HTMLElement>(":scope > .os-frame");
      const fs = fr ? getComputedStyle(fr) : null;
      const band = c.querySelector<HTMLElement>(".os-band, .d2-fwtop");
      return { name: c.getAttribute("aria-label"), pad: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map(parseFloat), bg: cs.backgroundColor, border: fs ? `${fs.borderTopWidth} ${fs.borderTopColor}` : "", band: band ? getComputedStyle(band).backgroundColor : "" };
    }));
    const BANDS: Record<string, string> = { "Next up": "rgb(244, 230, 214)", "Agents on file": "rgb(226, 230, 224)", "Closed queries": "rgb(235, 231, 225)", "Active queries": "rgb(45, 58, 80)" };
    /* ⚠️ RE-POINTED (Dashboard v2.2, Part A): the founding card left the columns and is a band under the header (DB22 A1, C1–C4),
       so four framed cards remain. */
    L.check("B1", "population: four cards", cards.length === 4, JSON.stringify(cards.map((c) => c.name)));
    for (const c of cards) {
      L.check("B1", `${c.name} rim`, c.pad.every((p) => Math.abs(p - 7) <= 1) && c.bg === "rgb(255, 255, 255)", `${c.pad} ${c.bg}`);
      L.check("B1", `${c.name} inner frame`, c.border === "1px rgb(227, 213, 201)", c.border);
      if (BANDS[c.name!]) L.check("B1", `${c.name} band`, c.band === BANDS[c.name!], c.band);
    }
    L.done(13);
  });

  test(`DB2 C · the chart, the weeks, the hover · ${tag(vp)}`, async ({ page }) => {
    const L = new Ledger(`C-${tag(vp)}`);
    await openDash(page, vp);
    /* C1: rasterise the chart's own svg and find its painted columns, then compare with the frame's inner edges */
    const c1 = await page.evaluate(async () => {
      const svg = document.querySelector<SVGSVGElement>(".d2 .d2-plotsvg")!;
      const frame = svg.closest(".os-frame") as HTMLElement;
      const card = svg.closest(".os-card") as HTMLElement;
      const sr = svg.getBoundingClientRect(), fr = frame.getBoundingClientRect();
      const inner = { l: fr.left + parseFloat(getComputedStyle(frame).borderLeftWidth), r: fr.right - parseFloat(getComputedStyle(frame).borderRightWidth) };
      const xml = new XMLSerializer().serializeToString(svg);
      const img = new Image();
      await new Promise((ok, no) => { img.onload = ok; img.onerror = no; img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`; });
      const cv = document.createElement("canvas"); cv.width = Math.round(sr.width); cv.height = Math.round(sr.height);
      const ctx = cv.getContext("2d")!; ctx.drawImage(img, 0, 0);
      const y = cv.height - 30; // below every point's lowest reach (BOTTOM 44), above the frame's edge
      const row = ctx.getImageData(0, y, cv.width, 1).data;
      let lo = -1, hi = -1;
      for (let x = 0; x < cv.width; x++) if (row[x * 4 + 3] > 40) { if (lo < 0) lo = x; hi = x; }
      return {
        lo: sr.left + lo, hi: sr.left + hi + 1, inner, h: sr.height,
        pins: card.querySelectorAll('[data-probe="chart-pin"], .os-pin, [data-probe*="pin"]').length,
        statusDots: svg.parentElement!.querySelectorAll("svg.sd, [data-statusdot]").length,
        hawk: card.querySelectorAll('img[src*="hawk"], img[src*="mentor"], img[src*="courier"]').length,
      };
    });
    /* RE-POINTED (Dashboard v2.1, then v2.2) */ /* the chart is 270px tall in v2.2 */
    L.check("C1", "population: a painted fill", c1.lo > 0 && c1.hi > c1.lo + 50 && Math.abs(c1.h - 270) <= 1, `cols ${c1.lo.toFixed(1)}–${c1.hi.toFixed(1)}, h ${c1.h}`);
    L.check("C1", "fill reaches the left inner edge", Math.abs(c1.lo - c1.inner.l) <= 2, `${c1.lo.toFixed(1)} vs ${c1.inner.l.toFixed(1)}`);
    L.check("C1", "fill reaches the right inner edge", Math.abs(c1.hi - c1.inner.r) <= 2, `${c1.hi.toFixed(1)} vs ${c1.inner.r.toFixed(1)}`);
    L.check("C1", "no pins, no hawk in the card", c1.pins === 0 && c1.statusDots === 0 && c1.hawk === 0, `pins ${c1.pins} dots ${c1.statusDots} hawk ${c1.hawk}`);

    /* C2: one circle per visible week, each the ledger's figure (computed here from the same documents) */
    /* the page's own scope (its root publishes the manuscript it shows), through the app's own scoping */
    const ms = await page.evaluate(() => document.querySelector<HTMLElement>(".d2")?.dataset.scope ?? "");
    const { db, uid } = await harnessDb();
    const { collection, getDocs } = await import("firebase/firestore");
    const all = (await getDocs(collection(db, "users", uid, "queries"))).docs.map((d: { id: string; data: () => Record<string, unknown> }) => ({ id: d.id, ...d.data() })) as unknown as Query[];
    const scoped = scopeQueries(all, ms || null);
    const nowMs = await page.evaluate(() => Date.now());
    const plotW = (await box(page, '.d2 [data-d2="plot"]'))!.w;
    /* RE-POINTED (Dashboard v2.1) */ /* v2.1: the points sit 22px in, and a week is a dot with no text — its figure is the button's data-total */
    const expected = visibleWeeks(dash2Weeks(scoped, new Date(nowMs)), plotW, 22).map((w) => w.total);
    const circles = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.d2 [data-d2="week"]')].map((w) => ({ t: Number(w.dataset.total), now: w.classList.contains("is-now"), bg: getComputedStyle(w).backgroundColor })));
    L.check("C2", "population", circles.length >= 3 && expected.length >= 3, `${circles.length} circles, ${expected.length} expected`);
    L.check("C2", "one per week, each the derivation's", JSON.stringify(circles.map((c) => c.t)) === JSON.stringify(expected), `got ${circles.map((c) => c.t)} want ${expected}`);
    L.check("C2", "the last is navy", circles.at(-1)?.now === true && circles.at(-1)?.bg === "rgb(45, 58, 80)" && circles.slice(0, -1).every((c) => !c.now), `${circles.at(-1)?.bg}`);

    /* C3: hover and focus a week k (one with a previous week), the card states its date, total and change; the rows add
       up; the dashed line runs through the circle's centre; leaving hides both */
    await liftMotionSuppression(page);
    const k = Math.max(1, circles.length - 4);
    const wk = page.locator('.d2 [data-d2="week"]').nth(k);
    for (const how of ["hover", "focus"] as const) {
      if (how === "hover") await wk.hover(); else { await page.mouse.move(2, 2); await wk.focus(); }
      await page.waitForTimeout(250);
      /* the break: the card states the PREVIOUS week (the visible circle before the one described) */
      if (MUT === "C3") await page.evaluate((i) => { const d = document.querySelector('[data-d2="wtip-date"]'); const lab = document.querySelectorAll('.d2 [data-d2="week"]')[i - 1]?.getAttribute("aria-label")?.match(/Week of (.*):/)?.[1]; if (d && lab) d.textContent = lab; }, k);
      const t = await page.evaluate((i) => {
        const tip = document.querySelector<HTMLElement>('[data-d2="wtip"]');
        const w = document.querySelectorAll<HTMLElement>('.d2 [data-d2="week"]')[i];
        const vl = document.querySelector<HTMLElement>('.d2 [data-d2="vline"]');
        const wr = w.getBoundingClientRect(), vr = vl?.getBoundingClientRect();
        const lab = w.getAttribute("aria-label")!.match(/Week of (.*): (\d+)/)!;
        return {
          shown: !!tip, date: tip?.querySelector('[data-d2="wtip-date"]')?.textContent ?? "", total: Number(tip?.querySelector('[data-d2="wtip-total"]')?.textContent),
          change: tip?.querySelector('[data-d2="wtip-change"]')?.textContent ?? "",
          rows: [...(tip?.querySelectorAll<HTMLElement>('[data-d2="wtip-row"]') ?? [])].map((r) => Number(r.dataset.n)),
          /* RE-POINTED (Dashboard v2.1) */ wantDate: lab[1], wantTotal: Number(lab[2]), prev: Number(document.querySelectorAll<HTMLElement>('.d2 [data-d2="week"]')[i - 1].dataset.total),
          lineX: vr ? vr.left + vr.width / 2 : -1, cx: wr.left + wr.width / 2, tipOn: tip ? (() => { const b = tip.getBoundingClientRect(); return b.left >= 0 && b.right <= innerWidth && b.top >= 0 && b.bottom <= innerHeight; })() : false,
        };
      }, k);
      const d = t.wantTotal - t.prev;
      const ch = d > 0 ? `+${d} on last week` : d < 0 ? `−${-d} on last week` : "no change";
      L.check("C3", `${how}: shown`, t.shown && t.tipOn, `shown ${t.shown} on screen ${t.tipOn}`);
      L.check("C3", `${how}: date, total, change`, t.date === t.wantDate && t.total === t.wantTotal && t.change === ch, `${t.date}/${t.total}/${t.change} want ${t.wantDate}/${t.wantTotal}/${ch}`);
      L.check("C3", `${how}: rows sum`, t.rows.length >= 1 && t.rows.reduce((a, b) => a + b, 0) === t.total, `${t.rows} → ${t.total}`);
      L.check("C3", `${how}: dashed line through the circle`, Math.abs(t.lineX - t.cx) <= 1, `${t.lineX.toFixed(1)} vs ${t.cx.toFixed(1)}`);
      if (how === "hover") { await shot(page, `03-week-hover-${vp.width}`); await page.mouse.move(2, 2); } else await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      await page.waitForTimeout(150);
      const gone = await page.evaluate(() => !document.querySelector('[data-d2="wtip"]') && !document.querySelector('.d2 [data-d2="vline"]'));
      L.check("C3", `${how}: leaving hides both`, gone, `${gone}`);
    }
    L.done(17);
  });

  test(`DB2 D · the founding card · ${tag(vp)}`, async ({ page }) => {
    const L = new Ledger(`D-${tag(vp)}`);
    /* the dev aid hands the card a stats doc, so a rank past Egg is measured (the snapshot holds none) */
    const STATS = { contributions: 6, waiting: 0, tier: "archivist", nextTier: "scout", toNext: 2, topPct: null, foundingNo: 23 };
    await page.addInitScript((s) => { Object.assign(window, { __SA_FOUNDING_STATS: s }); }, STATS);
    await openDash(page, vp);
    const f = await page.evaluate(() => ({
      tier: document.querySelector<HTMLElement>('.d2 [data-d2-card="founding"]')?.dataset.tier,
      /* RE-POINTED (Dashboard v2.1) */ /* v2.1: no "{done} of {needed} notes" line (the ring draws it; the card carries both as data), the founding number is
         "No. {n} · " beside How it works, and a road step names its rank in its title */
      /* RE-POINTED (Dashboard v2.2): the band — five birds (no Egg marker), the reached ones marked by state, the
         founding number a pill ("No. 23"), the notes counted as the band's data-done; the next rank's notes are TIERS' */
      rank: document.querySelector('.d2 [data-d2="fw-rank"]')?.textContent, count: document.querySelector<HTMLElement>('.d2 [data-d2-card="founding"]')?.dataset.done,
      no: document.querySelector('.d2 [data-d2="fw-no"]')?.textContent,
      on: [...document.querySelectorAll<HTMLElement>('.d2 [data-d2="fw-step"][data-state="reached"]')].map((x) => x.querySelector("b")?.textContent).join(","),
      next: document.querySelector('.d2 [data-d2="fw-step"][data-state="next"] [data-d2="fw-sub"]')?.textContent,
      steps: document.querySelectorAll('.d2 [data-d2="fw-step"]').length,
    }));
    const needed = TIERS.find((t) => t.key === "scout")!.min;
    L.check("D1", "population", f.steps === 5 && !!f.rank, JSON.stringify(f));
    L.check("D1", "rank and count are the stats", f.rank === "Archivist" && f.count === "6" && f.on === "Fledgling,Archivist" && f.next === `${needed} notes` && f.no === "No. 23", JSON.stringify(f));
    await page.locator('.d2 [data-d2="fw-tell"][data-key="like"]').click();
    await page.waitForTimeout(500);
    const chosen = await page.evaluate(() => document.querySelector("[data-fb='kind'][aria-checked='true']")?.getAttribute("data-k") ?? null);
    L.check("D1", "Like opens FeedbackDock with Like chosen", chosen === "Something I liked", `${chosen}`);
    await page.keyboard.press("Escape");
    L.done(3);
  });

  test(`DB2 E · the feed · ${tag(vp)}`, async ({ page }) => {
    const L = new Ledger(`E-${tag(vp)}`);
    await openDash(page, vp);
    await shot(page, `02-dashboard-full-${vp.width}`, true);
    const feed = await box(page, '.d2 [data-d2="feed"]');
    const fw = await box(page, '.d2 [data-d2-card="founding"]');
    const mid = await box(page, '.d2 [data-d2="mid"]');
    L.check("E1", "population", !!feed && !!fw && feed.h > 300, `feed ${feed?.h}`);
    /* RE-POINTED (Dashboard v2.2): the founding writer is above the grid, so the feed ends level with the taller of the
       left and middle columns (their last cards), and the founding band ends above the feed's top */
    const tallest = await page.evaluate(() => Math.max(...['left', 'mid'].map((c) => Math.max(...[...(document.querySelector(`.d2 [data-d2="${c}"]`)?.children ?? [])].map((k) => k.getBoundingClientRect().bottom)))));
    L.check("E1", "ends level with the taller column", !!feed && !!fw && Math.abs(feed.b - tallest) <= 2 && fw.b < feed.y, `feed ${feed?.b.toFixed(1)} tallest ${tallest.toFixed(1)} founding ${fw?.b.toFixed(1)}`);
    L.check("E1", "starts at the grid's top", !!feed && !!mid && Math.abs(feed.y - mid.y) <= 2, `feed ${feed?.y.toFixed(1)} mid ${mid?.y.toFixed(1)}`);
    /* the switch, populations first (feed v1's rule): every filter shows something, and Agents shows only agents' */
    const sw = await page.evaluate(async () => {
      const out: Record<string, { n: number; dirs: string[] }> = {};
      const sc = document.querySelector<HTMLElement>('.d2 [data-df1="fscroll"]')!;
      /* the snapshot's activity is older than the feed's first 7 days: reach back until there is a population that
         overflows the column, as a writer would by pressing "Show earlier" */
      for (let i = 0; i < 12 && sc.scrollHeight <= sc.clientHeight + 40; i++) {
        const more = sc.querySelector<HTMLButtonElement>('[data-df1="earlier"]');
        if (!more) break;
        more.click(); await new Promise((r) => setTimeout(r, 150));
      }
      for (const b of [...document.querySelectorAll<HTMLButtonElement>('.d2 .df1-sw button')]) {
        b.click(); await new Promise((r) => setTimeout(r, 120));
        /* each filter reaches back until it has a population (feed v1's rule: populations non-zero first) */
        for (let i = 0; i < 30 && sc.querySelectorAll('[data-df1="big"], [data-df1="mini"]').length === 0; i++) {
          const more = sc.querySelector<HTMLButtonElement>('[data-df1="earlier"]');
          if (!more) break;
          more.click(); await new Promise((r) => setTimeout(r, 150));
        }
        const items = [...sc.querySelectorAll<HTMLElement>('[data-df1="big"], [data-df1="mini"]')];
        out[b.textContent!.trim()] = { n: items.length, dirs: [...new Set(items.map((i) => i.dataset.dir ?? ""))] };
      }
      (document.querySelector<HTMLButtonElement>('.d2 .df1-sw button'))?.click();
      await new Promise((r) => setTimeout(r, 120));
      /* STRESS: the account's whole history may fit the column, so copies of its entries are added; the column's box
         must not grow, and the list must overflow inside it */
      const feedEl = document.querySelector<HTMLElement>('.d2 [data-d2="feed"]')!;
      const before = feedEl.getBoundingClientRect().height;
      const items = [...sc.querySelectorAll<HTMLElement>('[data-df1="big"], [data-df1="mini"]')];
      for (let k = 0; k < 4; k++) for (const it of items) sc.insertBefore(it.cloneNode(true), sc.lastElementChild);
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const after = feedEl.getBoundingClientRect().height;
      return { out, sh: sc.scrollHeight, ch: sc.clientHeight, oy: getComputedStyle(sc).overflowY, before, after };
    });
    if (process.env.DB2_SHOTS) {
      await page.evaluate(() => { document.querySelectorAll<HTMLElement>(".d2 [data-df1-sw]")[1]?.click(); });
      await page.waitForTimeout(300);
      await shot(page, `05-feed-agents-${vp.width}`);
      await page.evaluate(() => { document.querySelectorAll<HTMLElement>(".d2 [data-df1-sw]")[0]?.click(); });
    }
    L.check("E1", "switch populations", Object.values(sw.out).length === 3 && Object.values(sw.out).every((v) => v.n > 0), JSON.stringify(sw.out));
    L.check("E1", "Agents shows agents' and You shows yours", (sw.out.Agents?.dirs ?? []).every((d) => d === "in") && (sw.out.You?.dirs ?? []).every((d) => d === "out"), JSON.stringify(sw.out));
    L.check("E1", "scrolls inside itself, never growing", sw.oy === "auto" && sw.sh > sw.ch && Math.abs(sw.after - sw.before) <= 1, `${sw.oy} ${sw.sh}/${sw.ch}, box ${sw.before.toFixed(1)} → ${sw.after.toFixed(1)}`);
    L.done(6);
  });

  test(`DB2 F · the hawk · ${tag(vp)}`, async ({ page }) => {
    const L = new Ledger(`F-${tag(vp)}`);
    await openDash(page, vp);
    const read = () => page.evaluate(() => {
      const h = document.querySelector<HTMLElement>('[data-d2="hawk"]');
      if (!h) return null;
      const r = h.getBoundingClientRect();
      return { r: r.right, b: r.bottom, h: r.height, vw: document.documentElement.clientWidth, vh: innerHeight, look: Number(getComputedStyle(h.querySelector(".d2-p2")!).opacity) };
    });
    const a = await read();
    L.check("F1", "population", !!a, JSON.stringify(a));
    if (a) {
      L.check("F1", "corner", a.vw - a.r <= 6 && a.vw - a.r >= 0 && Math.abs(a.vh - a.b) <= 1 && Math.abs(a.h - 225) <= 2, JSON.stringify(a));
      await page.evaluate(() => { const s = document.querySelector('.d2')!.closest<HTMLElement>(".ws-wbody")!; s.scrollTop = 600; });
      await page.waitForTimeout(200);
      const b = await read();
      await shot(page, `06-scrolled-${vp.width}`);
      L.check("F1", "corner after scrolling 600px", !!b && b.vw - b.r <= 6 && Math.abs(b.vh - b.b) <= 1, JSON.stringify(b));
      await liftMotionSuppression(page);
      const hb = await page.evaluate(() => { const r = document.querySelector<HTMLElement>('[data-d2="hawk"] .d2-p1')!.getBoundingClientRect(); return { x: r.left + r.width * 0.55, y: r.top + r.height * 0.45 }; });
      await page.mouse.move(hb.x, hb.y);
      await page.waitForTimeout(350);
      const c = await read();
      L.check("F1", "looks at you on hover", !!c && c.look === 1, `${c?.look}`);
      await shot(page, `04-hawk-hover-${vp.width}`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(400);
    const phone = await page.evaluate(() => { const h = document.querySelector<HTMLElement>('[data-d2="hawk"]'); return !h || h.getBoundingClientRect().width === 0; });
    L.check("F1", "absent at 390", phone, `${phone}`);
    L.done(5);
  });
}
