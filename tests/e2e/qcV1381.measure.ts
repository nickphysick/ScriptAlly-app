/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v138.1 (design-refs/query-centre-v138-1/query-centre-v138-1.html) — the QC138.1 locks, on the rendered
 * page at 1512 × 900 and 1280 × 800 unless a lock says otherwise.
 *
 * A1 pinned centre · B1 no key · D1 cards · D2 scale · E1 ring · F1 search. (C1 is not here: Part C stopped on its
 * own condition — see reports/qc-v138-1/REPORT.md.)
 *
 * Each was run with its named mutation before its green was believed: `QC1381_MUTATE=<lock>` applies the in-page
 * mutations below; D2 is a SOURCE mutation (log2 growth), built in this worktree.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute, liftMotionSuppression } from "./measure";
import { paintCovers, pinKids } from "./pinLib";

const DIR = "reports/qc-v138-1";
const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
type VP = { width: number; height: number };
const MUT = process.env.QC1381_MUTATE ?? "";
const near = (a: unknown, b: number, t: number) => typeof a === "number" && Number.isFinite(a) && Math.abs(a - b) <= t;

const MUTATIONS: Record<string, { css?: string; js?: string }> = {
  A1: { css: `.qc138-pin .qc138-pin-in { padding-top: 8px !important; }` },
  B1: { js: `(() => { const g = document.querySelector('[data-qc138="glyphs"]'); if (g && !g.querySelector(".qc138-mut")) { const d = document.createElement("div"); d.className = "qc138-mut"; d.textContent = "Dashed ring: your move · Tap a glyph to filter"; g.appendChild(d); } })()` },
  /* EDITED v138.2: the container is the DRAWER now (the peek sits inside it, on the row's grid) */
  D1: { css: `.qc138-sheet .qc138-drw { background: #eef1f6 !important; }` },
  E1: { css: `.qc138-sheet .qc138-dial.over { background: #a2452a !important; }` },
  F1: { js: `(() => { const f = document.querySelector('[data-qc138="filters"]'); if (f && !f.querySelector("input")) { const l = document.createElement("label"); l.innerHTML = '<input placeholder="Find a query by agent or agency">'; f.prepend(l); } })()` },
};

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(lock: string, where: string, ok: unknown, detail: string) { this.rows.push({ lock, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${MUT ? `mut-${MUT}-` : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.lock} · ${r.where} — ${r.detail}`)).toEqual([]);
  }
}
async function mutate(page: Page, lock: string) {
  const m = MUT === lock ? MUTATIONS[lock] : null;
  if (!m) return;
  if (m.css) await page.addStyleTag({ content: m.css });
  if (m.js) await page.evaluate(m.js);
  await page.waitForTimeout(120);
}
async function openQC(page: Page, vp: VP, lock: string) {
  await page.addInitScript(() => { try { for (const k of ["contacts", "queries", "manuscripts"]) localStorage.setItem(`sa.guide.${k}`, "1"); } catch { /* */ } });
  await openRoute(page, "/queries", vp);
  await expect(page.locator('.qcv-group[data-v138] [data-qcv="row"]').first()).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(600);
  await mutate(page, lock);
}
const scrollTo = (page: Page, y: number) => page.evaluate(async (top) => {
  const sc = [...document.querySelectorAll<HTMLElement>(".wpg-scroll")].find((e) => e.querySelector(".qcv-group[data-v138]") && e.getBoundingClientRect().height > 0)!;
  sc.style.scrollBehavior = "auto"; sc.scrollTop = top;
  await new Promise((r) => setTimeout(r, 400));
}, y);

test.describe("Query Centre v138.1", () => {
  /* EDITED (pinned-row fix, 15 Oct): A1 measured each child against the pinned row's OWN box, and passed while the
     contents sat 6px high — the sheet lip (pointer-events: none, z 19) is painted over the row's top 12px, so the box's
     centre is not the centre of what a reader sees. It now measures as PIN1 P1 does (tests/e2e/pinRow.measure.ts):
     against the VISIBLE area, found by paint, a text-only child by its ink. */
  /* RETIRED (v138.6 §B): the Query Centre's pinned row is deleted; the navy list header is the sticky row. Its
     centring is the header's own layout (PIN1 P1, moved onto the header) and its stack is QC138.6 B1–B3. */
  test.skip("A1 · pinned centre: every child of the pinned row is centred on the visible area (as PIN1 P1)", async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger("A1");
    for (const vp of SIZES) {
      await openQC(page, vp, "A1");
      await scrollTo(page, 1500);
      const rowSel = '[data-qc138="pinned"][data-on]';
      const covers = await paintCovers(page, rowSel);
      const r = await pinKids(page, rowSel);
      const visC = (r.top + Math.max(0, ...covers.map((c) => c.coverPx)) + r.bottom) / 2;
      L.check("A1", `${vp.width} pinned`, r.kids.length >= 4, `${r.kids.length} children`);
      for (const k of r.kids) L.check("A1", `${vp.width} ${k.cls} (${k.how})`, Math.abs(k.c - visC) <= 1, `${(k.c - visC).toFixed(2)}`);
    }
    L.done(10);
  });

  test("B1 · no key: nothing in the header reads 'Dashed ring' or 'Tap a glyph'", async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger("B1");
    for (const vp of SIZES) {
      await openQC(page, vp, "B1");
      const t = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-qc138="header"]')].filter((e) => e.getBoundingClientRect().height > 0).map((e) => e.textContent ?? "").join(" "));
      L.check("B1", `${vp.width} header read`, t.length > 20, `${t.length} chars`);
      L.check("B1", `${vp.width} no key`, !/Dashed ring|Tap a glyph/.test(t), "the key line is there");
    }
    L.done(4);
  });

  test("D1 · markers (EDITED v138.3): no container, each stop a marker, Today a tick with no date, Was due a rust dot", async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger("D1");
    await openQC(page, SIZES[0], "D1");
    const row = page.locator('.qcv-group[data-v138] [data-qcv="row"][data-move="true"][data-court="agent"]').first();
    await row.scrollIntoViewIfNeeded();
    await page.mouse.move(2, 2);
    await row.hover({ position: { x: 300, y: 18 } });
    await expect(row.locator('[data-qcv="peek-chain"]')).toBeVisible({ timeout: 5000 });
    const r = await row.evaluate((el) => {
      const pk = el.querySelector<HTMLElement>('[data-qcv="peek"]')!;
      const drw = el.querySelector<HTMLElement>('[data-qcv="peek-drawer"]');
      const stops = [...pk.querySelectorAll<HTMLElement>('[data-qcv="peek-stop"]')];
      const today = stops.find((s) => s.dataset.kind === "today");
      const was = stops.find((s) => s.dataset.kind === "wasdue");
      const tick = today?.querySelector<HTMLElement>(".qc138-mk-tick");
      const dot = was?.querySelector<HTMLElement>(".qc138-mk-dot");
      return {
        bg: getComputedStyle(pk).backgroundColor, drawerBg: drw ? getComputedStyle(drw).backgroundColor : null, n: stops.length,
        cards: stops.filter((s) => s.classList.contains("qc138-mk") && !s.classList.contains("qc138-card")).length,
        todayBg: tick ? getComputedStyle(tick).backgroundColor : null, todayDate: today ? !!today.querySelector('[data-qcv="peek-date"]') : null,
        wasBg: dot ? getComputedStyle(dot).backgroundColor : null,
      };
    });
    /* EDITED v138.2: "no container background" now means the DRAWER itself (and the peek inside it); the row's tint
       while the peek is open is QC138.2 A1's, so this no longer asks what the row behind them paints */
    L.check("D1", "no container", r.bg === "rgba(0, 0, 0, 0)" && r.drawerBg === "rgba(0, 0, 0, 0)", `${r.bg} · drawer ${r.drawerBg}`);
    /* EDITED v138.3: the cards are gone. Every stop is a marker on the bars; Today is a rust tick with no date; Was due
       is a rust dot. (Bar widths moved to QC138.3 A1.) */
    L.check("D1", "every stop a marker, no card", r.n > 1 && r.cards === r.n, `${r.cards}/${r.n}`);
    L.check("D1", "today a rust tick, no date", r.todayBg === "rgb(162, 69, 42)" && r.todayDate === false, `${r.todayBg} · date ${r.todayDate}`);
    L.check("D1", "was due a rust dot", r.wasBg === "rgb(162, 69, 42)", `${r.wasBg}`);
    L.done(4);
  });

  test("D2 · scale (EDITED v138.3): nothing overlaps, labels in their gaps, no tick key, ticks ≥ 4px", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("D2");
    const D = 86_400_000, now = Date.now(), t = (d: number) => now + d * D;
    /* the five cases of screens/06, relative to today */
    const cases = [
      { events: [{ name: "Queried", ms: t(-195) }, { name: "Full requested", ms: t(-15) }], due: t(7), yours: true },
      { events: [{ name: "Queried", ms: t(-70) }, { name: "Partial sent", ms: t(-35) }], due: t(2), yours: false },
      { events: [{ name: "Queried", ms: t(-3906) }], due: t(-3846), yours: true },
      { events: [{ name: "Queried", ms: t(-9) }, { name: "Partial requested", ms: t(-8) }], due: t(-7), yours: true },
      { events: [{ name: "Queried", ms: t(-2779) }, { name: "Full sent", ms: t(-2) }], due: t(355), yours: false },
    ];
    for (const vp of [{ width: 1512, height: 900 }, { width: 1100, height: 800 }]) {
      await page.addInitScript((c) => { (window as unknown as { __SA_QC138_PEEK_LAB: unknown }).__SA_QC138_PEEK_LAB = c; }, cases);
      await openQC(page, vp, "D2");
      await page.waitForTimeout(400);
      const r = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-qc138="peek-case"]')].filter((c) => c.getBoundingClientRect().height > 0).map((c) => {
        const pk = c.querySelector<HTMLElement>('[data-qcv="peek"]')!;
        const segs = [...pk.querySelectorAll<HTMLElement>('[data-qcv="peek-seg"]')].map((s) => ({ w: s.getBoundingClientRect().width, d: Number(s.dataset.days), floor: Number(s.dataset.floor ?? "44"), l: s.querySelector<HTMLElement>('[data-qcv="peek-seg-label"]')?.getBoundingClientRect() ?? null, b: s.getBoundingClientRect(), step: Number(s.querySelector<HTMLElement>('[data-qcv="peek-ticks"]')?.dataset.step ?? "0") }));
        const cards = [...pk.querySelectorAll<HTMLElement>('[data-qcv="peek-stop"]')].map((s) => s.getBoundingClientRect());
        let overlap = false;
        for (let i = 0; i < cards.length; i += 1) for (let j = i + 1; j < cards.length; j += 1) if (cards[i].left < cards[j].right - 0.5 && cards[j].left < cards[i].right - 0.5 && cards[i].top < cards[j].bottom && cards[j].top < cards[i].bottom) overlap = true;
        const row = pk.getBoundingClientRect();
        return {
          /* EDITED v138.3: the overdue bar carries no label, so only labelled gaps are asked */
          segs: segs.map((s) => ({ w: s.w, d: s.d, floor: s.floor, inside: !s.l || (s.l.left >= s.b.left - 0.5 && s.l.right <= s.b.right + 0.5), step: s.step })),
          overlap, out: [...pk.querySelectorAll<HTMLElement>("*")].filter((e) => !e.classList.contains("qc138-seg-probe")).some((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && (b.left < row.left - 0.5 || b.right > row.right + 0.5); }),
          key: pk.querySelector('[data-qcv="peek-key"]')?.textContent ?? "",
        };
      }));
      const w = `${vp.width}`;
      L.check("D2", `${w} five cases`, r.length === 5, `${r.length}`);
      r.forEach((c, i) => {
        /* EDITED v138.3: the width-follows-days check moved to QC138.3 A1 (bars at true scale); the overlap checks below
           now apply to the markers */
        L.check("D2", `${w} case ${i + 1} no overlap`, !c.overlap, `${c.overlap}`);
        L.check("D2", `${w} case ${i + 1} labels in gaps`, c.segs.every((s) => s.inside), JSON.stringify(c.segs.filter((s) => !s.inside)));
        L.check("D2", `${w} case ${i + 1} nothing leaves the row`, !c.out, `${c.out}`);
        /* the tick-key check is RETIRED by v138.4 (there is no key and no ruler to key) */
        L.check("D2", `${w} case ${i + 1} ticks ≥ 4px`, c.segs.every((s) => s.step === 0 || s.step >= 4), c.segs.map((s) => s.step.toFixed(1)).join(","));
      });
    }
    L.done(42);
  });

  test("E1 · ring: an overdue dial is a complete rust ring on white that breathes; still under reduced motion", async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger("E1");
    await openQC(page, SIZES[0], "");
    await liftMotionSuppression(page);
    await mutate(page, "E1");
    const read = () => page.evaluate(() => {
      const d = [...document.querySelectorAll<HTMLElement>('.qcv-group[data-v138] [data-qcv="row-dial"][data-over]')].filter((e) => e.getBoundingClientRect().height > 0);
      return d.map((e) => {
        const arc = e.querySelector<SVGCircleElement>(".qc138-dial-arc");
        const da = arc?.getAttribute("stroke-dasharray");
        const c = 2 * Math.PI * 22;
        return { bg: getComputedStyle(e).backgroundColor, stroke: arc ? getComputedStyle(arc).stroke : "", full: !!arc && (!da || da === "none" || Math.abs(parseFloat(da) - c) < 0.5), anim: getComputedStyle(e).animationName };
      });
    });
    const r = await read();
    L.check("E1", "overdue dials exist", r.length > 0, `${r.length}`);
    L.check("E1", "white", r.every((d) => d.bg === "rgb(255, 255, 255)"), [...new Set(r.map((d) => d.bg))].join(","));
    L.check("E1", "complete rust arc", r.every((d) => d.full && d.stroke === "rgb(162, 69, 42)"), JSON.stringify(r[0]));
    L.check("E1", "breathes", r.every((d) => d.anim !== "none" && d.anim !== ""), [...new Set(r.map((d) => d.anim))].join(","));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload();
    await expect(page.locator('.qcv-group[data-v138] [data-qcv="row"]').first()).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(500);
    const still = await read();
    L.check("E1", "reduced motion: still", still.length > 0 && still.every((d) => d.anim === "none"), [...new Set(still.map((d) => d.anim))].join(","));
    L.done(5);
  });

  test("F1 · search: in the navy row, 300 (220) at rest and 360 (260) on focus; filters, mirrors, / and Esc", async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger("F1");
    const branches = new Set<boolean>();
    for (const vp of SIZES) {
      await openQC(page, vp, "F1");
      const w = `${vp.width}`;
      const r = await page.evaluate(() => {
        const g = [...document.querySelectorAll<HTMLElement>(".qcv-group[data-v138]")].find((e) => e.getBoundingClientRect().height > 0)!;
        const s = g.querySelector<HTMLElement>('[data-qc138="top"] [data-qc138="search"]');
        return { inFilters: g.querySelectorAll('[data-qc138="filters"] input').length, inTop: g.querySelectorAll('[data-qc138="top"] input').length, w: s?.getBoundingClientRect().width ?? 0, sheet: g.querySelector<HTMLElement>(".qc138-sheet")?.offsetWidth ?? 0 };
      });
      /* the expected width comes from the SHEET's measured width against the column grid's own 1180 line — never from a
         shell class, which is how the first build read 220 at 1512 and this lock agreed with it */
      const wide = r.sheet >= 1180;
      L.check("F1", `${w} sheet measured`, r.sheet > 0, `${r.sheet}`);
      L.check("F1", `${w} none in the filter row`, r.inFilters === 0, `${r.inFilters}`);
      L.check("F1", `${w} one in the navy row`, r.inTop === 1, `${r.inTop}`);
      /* RE-POINTED (Contact list v18.3 §E, the shared toolbar): the search rests at 240 on the full-size sheet and 200
         otherwise — the toolbar's own rule keys on the sheet's size switch, so the expectation does too */
      const full = await page.evaluate(() => !!document.querySelector(".ws-app.sheet-wide"));
      L.check("F1", `${w} rest width`, near(r.w, full ? 240 : 200, 1), `${r.w} · sheet ${r.sheet} · full ${full}`);
      await page.mouse.click(5, 300);
      await page.keyboard.press("/");
      await page.waitForTimeout(400);
      const f = await page.evaluate(() => { const s = [...document.querySelectorAll<HTMLElement>('[data-qc138="search"]')].find((e) => e.getBoundingClientRect().height > 0)!; return { w: s.getBoundingClientRect().width, active: document.activeElement === s.querySelector("input") }; });
      L.check("F1", `${w} / focuses it`, f.active, `${f.active}`);
      /* RE-POINTED (Contact list v18.3 §E, the shared toolbar): the search holds the toolbar's width when focused (240,
         or 200 below the full-size sheet); v138.1's grow-on-focus is retired with it — reported to Nick */
      L.check("F1", `${w} focus width`, near(f.w, full ? 240 : 200, 2), `${f.w} · full ${full}`);
      const rows = page.locator('.qcv-group[data-v138] [data-qcv="row"]');
      const n0 = await rows.count();
      await page.keyboard.type("Reed");
      await page.waitForTimeout(300);
      const n1 = await rows.count();
      const mirror = await page.evaluate(() => (document.querySelector('[data-qc138="pinned-find"] input') as HTMLInputElement | null)?.value);
      L.check("F1", `${w} filters`, n1 > 0 && n1 < n0, `${n0} → ${n1}`);
      /* RETIRED (v138.6 §B): the pinned row and its mirrored search are deleted */
      void mirror;
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
      const after = await page.evaluate(() => ([...document.querySelectorAll<HTMLInputElement>('[data-qc138="search"] input')].find((e) => e.getBoundingClientRect().height > 0)!).value);
      L.check("F1", `${w} Esc clears`, after === "" && (await rows.count()) === n0, `"${after}"`);
      branches.add(wide);
    }
    L.check("F1", "both widths exercised", branches.size === 2, `${[...branches]}`);
    L.done(14);
  });
});
