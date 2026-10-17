/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v138.5 — the QC138.5 locks, at 1512 × 900 and 1280 × 800 with the shell.
 *
 * A1 inset · A2 hawk · B1 glyphs · B2 one store · C1 chart height · C2 weeks · D1 lift · E1 filters ·
 * F1 columns · F2 gap · G1 pin · H1 group art.
 *
 * Each lock was run against the pre-pack build (red first) and with its named mutation before its green was believed:
 * `QC1385_MUTATE=<lock>` applies a style or script break in the page; the source breaks (B2, C2, E1, G1) are made in
 * the measurement worktree and rebuilt (tests/e2e/qcV1385Mutate.sh), because they live in compiled code.
 *
 * ⚠️ EVERY READING IS FROM THE VISIBLE PAGE: workspace pages stay mounted, so each query starts from the visible
 *    `.qcv-group[data-v138]` (or, on /agents, `.clv-group`).
 * ⚠️ D1 IS A PAINT CHECK, NOT A HIT TEST: the hawk shadow is `pointer-events: none`, so `elementsFromPoint` cannot see
 *    it. The card is photographed with the shadow shown and with it hidden; at rest the two must differ (the shadow
 *    paints over the card), hovered they must be identical (the card paints over the shadow).
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { decode } from "fast-png";
import { openRoute } from "./measure";

const DIR = "reports/qc-v138-5";
const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
const MUT = process.env.QC1385_MUTATE ?? "";
const near = (a: unknown, b: number, t: number) => typeof a === "number" && Number.isFinite(a) && Math.abs(a - b) <= t;
const G = ".qcv-group[data-v138]";

/** the page-side breaks; the source ones are made by qcV1385Mutate.sh */
const MUTATIONS: Record<string, { css?: string; js?: string }> = {
  A1: { css: `.qc138-hd.phf { --phf-inset: 120px !important; }` },
  A2: { css: `.qc138-hd .qc138-hawk { margin-left: 0 !important; }` },
  B1: { js: `document.querySelectorAll('[data-qc138="glyph-btn"]').forEach((b) => { if (!b.querySelector(".mut")) { const n = document.createElement("b"); n.className = "mut"; n.textContent = b.getAttribute("data-n") || "0"; b.appendChild(n); } })` },
  C1: { css: `.qc138-hd .qc138-wk { height: 150px !important; }` },
  D1: { css: `.qc138-hd .qc138-cc { position: relative; z-index: 1 !important; }` },
  F1: { css: `.qc138-sheet .qc138-pkg { width: 92px !important; }` },
  F2: { css: `.qc138-sheet .qc138-heads, .qc138-sheet .qc138-row { --qc138-cols: minmax(0, 1.3fr) 108px minmax(0, 1fr) 246px minmax(170px, 0.85fr) 60px !important; }` },
  H1: { css: `.qc138-sheet:not([data-density="compact"]) .qc138-gimg--you { width: 46px !important; top: auto !important; bottom: -14px !important; translate: none !important; } .qc138-sheet:not([data-density="compact"]) .qc138-gimg--waiting { width: 54px !important; top: auto !important; bottom: -12px !important; translate: none !important; }` },
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

async function open(page: Page, route: string, vp: { width: number; height: number }, lock: string, group = G) {
  await page.addInitScript(() => { try { for (const k of ["contacts", "queries", "manuscripts"]) localStorage.setItem(`sa.guide.${k}`, "1"); } catch { /* */ } });
  await openRoute(page, route, vp);
  await page.locator(group).first().waitFor({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  const m = MUT === lock ? MUTATIONS[lock] : null;
  if (m?.css) await page.addStyleTag({ content: m.css });
  if (m?.js) await page.evaluate(m.js);
  if (m) await page.waitForTimeout(400);
}
const box = (page: Page, sel: string) => page.evaluate((s) => {
  const e = [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getBoundingClientRect().width > 0);
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height, ow: e.offsetWidth, oh: e.offsetHeight };
}, sel);
const scrollTo = (page: Page, y: number) => page.evaluate((top) => {
  const sc = [...document.querySelectorAll<HTMLElement>(".wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0 && e.querySelector(".qcv-group[data-v138]"));
  if (sc) { sc.style.scrollBehavior = "auto"; sc.scrollTop = top; }
}, y);

test.describe("QC138.5", () => {
  test("A1 · inset: the status row and header grid share the Contact list's edges; the card ends on the grid", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("A1");
    for (const vp of SIZES) {
      await open(page, "/agents", vp, "", ".clv-group");
      const strip = await box(page, ".clv-group .cl18-tabs");
      await open(page, "/queries", vp, "A1");
      const sr = await box(page, `${G} [data-qc138="status-row"]`);
      const hg = await box(page, `${G} [data-qc138="header-row"]`);
      const card = await box(page, `${G} [data-qc138="chart"]`);
      const w = `${vp.width}`;
      L.check("A1", `${w} found`, strip && sr && hg && card, JSON.stringify({ strip: !!strip, sr: !!sr, hg: !!hg, card: !!card }));
      if (!strip || !sr || !hg || !card) continue;
      L.check("A1", `${w} status row left = letter strip left`, near(sr.l, strip.l, 2), `${sr.l.toFixed(1)} vs ${strip.l.toFixed(1)}`);
      L.check("A1", `${w} status row right = letter strip right`, near(sr.r, strip.r, 2), `${sr.r.toFixed(1)} vs ${strip.r.toFixed(1)}`);
      L.check("A1", `${w} header grid left = letter strip left`, near(hg.l, strip.l, 2), `${hg.l.toFixed(1)} vs ${strip.l.toFixed(1)}`);
      L.check("A1", `${w} header grid right = letter strip right`, near(hg.r, strip.r, 2), `${hg.r.toFixed(1)} vs ${strip.r.toFixed(1)}`);
      L.check("A1", `${w} card right = header grid right`, near(card.r, hg.r, 1), `${card.r.toFixed(1)} vs ${hg.r.toFixed(1)}`);
    }
    L.done(10);
  });

  test("A2 · hawk: 250 at 1512, 190 at 1280, hanging into the inset", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("A2");
    for (const vp of SIZES) {
      await open(page, "/queries", vp, "A2");
      const hawk = await box(page, `${G} [data-qc138="hawk"]`);
      const hg = await box(page, `${G} [data-qc138="header-row"]`);
      const hd = await box(page, `${G} [data-qc138="header"]`);
      const w = `${vp.width}`;
      L.check("A2", `${w} found`, hawk && hg && hd, `${!!hawk} ${!!hg} ${!!hd}`);
      if (!hawk || !hg || !hd) continue;
      const want = vp.width === 1512 ? 250 : 190;
      const inset = hg.l - hd.l;
      L.check("A2", `${w} width ${want}`, near(hawk.w, want, 2), `${hawk.w.toFixed(1)}`);
      L.check("A2", `${w} left of the grid by at least the inset less 10`, hg.l - hawk.l >= inset - 10, `${(hg.l - hawk.l).toFixed(1)} vs inset ${inset.toFixed(1)}`);
      L.check("A2", `${w} decorative`, await page.evaluate((s) => { const e = document.querySelector(s); return e?.getAttribute("alt") === "" && e?.getAttribute("aria-hidden") === "true"; }, `${G} [data-qc138="hawk"]`), "alt/aria");
    }
    L.done(8);
  });

  test("B1 · glyphs: seven 62 × 56 buttons, centred, no counts on show, a hover label '{status} · {count}'", async ({ page }) => {
    test.setTimeout(420_000);
    const L = new Ledger("B1");
    for (const vp of SIZES) {
      await open(page, "/queries", vp, "B1");
      const w = `${vp.width}`;
      const r = await page.evaluate((g) => {
        const grp = [...document.querySelectorAll<HTMLElement>(g)].find((e) => e.getBoundingClientRect().width > 0)!;
        const row = grp.querySelector<HTMLElement>('[data-qc138="status-row"]')!.getBoundingClientRect();
        const btns = [...grp.querySelectorAll<HTMLElement>('[data-qc138="glyph-btn"]')];
        const rs = btns.map((b) => b.getBoundingClientRect());
        /* visible digits inside a button, the hover label (opacity 0 at rest) aside */
        const digits = btns.map((b) => [...b.querySelectorAll<HTMLElement>("*")].filter((e) => !e.closest('[data-qc138="glyph-tip"]') && e.children.length === 0
          && /\d/.test(e.textContent ?? "") && getComputedStyle(e).opacity !== "0" && e.getBoundingClientRect().width > 0).length);
        return { n: btns.length, rowC: (row.left + row.right) / 2, glyphC: (rs[0].left + rs[rs.length - 1].right) / 2, sizes: rs.map((x) => [x.width, x.height]), digits,
          keys: btns.map((b) => b.dataset.k), titles: btns.filter((b) => b.hasAttribute("title")).length };
      }, G);
      L.check("B1", `${w} seven buttons`, r.n === 7, `${r.n}`);
      L.check("B1", `${w} centred in the inset`, near(r.glyphC, r.rowC, 2), `${r.glyphC.toFixed(1)} vs ${r.rowC.toFixed(1)}`);
      L.check("B1", `${w} each 62 × 56`, r.sizes.every(([a, b]) => near(a, 62, 0.5) && near(b, 56, 0.5)), JSON.stringify(r.sizes));
      L.check("B1", `${w} no visible count`, r.digits.every((d) => d === 0), JSON.stringify(r.digits));
      L.check("B1", `${w} no native title`, r.titles === 0, `${r.titles}`);
      if (vp.width !== 1512) continue;
      /* each label's count is the rows that glyph's filter shows: an independent reading, the list's own title */
      for (const k of r.keys) {
        const btn = page.locator(`${G} [data-qc138="glyph-btn"][data-k="${k}"]`);
        await btn.hover();
        await page.waitForTimeout(260);
        const tip = await page.evaluate(([g, kk]) => {
          const t = [...document.querySelectorAll<HTMLElement>(`${g} [data-qc138="glyph-btn"][data-k="${kk}"] [data-qc138="glyph-tip"]`)].find((e) => e.offsetParent !== null)!;
          return { text: t.textContent ?? "", op: getComputedStyle(t).opacity, below: t.getBoundingClientRect().top - t.parentElement!.getBoundingClientRect().bottom };
        }, [G, k] as const);
        const m = /^(.+) · (\d+)$/.exec(tip.text);
        L.check("B1", `${w} ${k} label shows on hover`, tip.op === "1", tip.op);
        L.check("B1", `${w} ${k} label 10 below`, near(tip.below, 10, 1), tip.below.toFixed(1));
        L.check("B1", `${w} ${k} label reads '{status} · {count}'`, !!m, tip.text);
        await btn.click();
        await page.waitForTimeout(500);
        const shown = await page.evaluate((g) => {
          const grp = [...document.querySelectorAll<HTMLElement>(g)].find((e) => e.getBoundingClientRect().width > 0)!;
          const s = grp.querySelector('[data-qc138="shown"]');
          return s ? Number(s.textContent) : 0;
        }, G);
        L.check("B1", `${w} ${k} label's count = the rows its filter shows`, m && Number(m[2]) === shown, `${tip.text} vs ${shown} shown`);
        await btn.click();
        await page.waitForTimeout(300);
      }
    }
    L.done(20);
  });

  test("B2 · one store: a glyph sets the Stage filter, and the Stage filter selects the glyph", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("B2");
    const vp = SIZES[0];
    await open(page, "/queries", vp, "B2");
    await page.locator(`${G} [data-qc138="glyph-btn"][data-k="pr"]`).click();
    await page.waitForTimeout(400);
    await page.locator(`${G} [data-qc138="filters-btn"]`).click();
    await page.waitForTimeout(400);
    const pill = await page.evaluate(() => document.querySelector('[data-qc138="filters-panel"] [data-qc138="pill"][data-k="stage"] [data-qc138="pill-label"]')?.textContent ?? null);
    L.check("B2", "glyph → the panel's Stage pill names it", pill === "Partial requested", `${pill}`);
    /* clear, then set Stage in the panel: the glyph is selected */
    await page.locator('[data-qc138="filters-panel"] [data-qc138="filters-clear"]').click();
    await page.waitForTimeout(300);
    await page.locator('[data-qc138="filters-panel"] [data-qc138="pill"][data-k="stage"] .qc138-fp').click();
    await page.waitForTimeout(400);
    await page.locator('[data-opt="stage:Partial Requested"]').click();
    await page.waitForTimeout(400);
    const on = await page.evaluate((g) => [...document.querySelectorAll<HTMLElement>(`${g} [data-qc138="glyph-btn"]`)].filter((b) => b.offsetParent !== null && b.getAttribute("aria-pressed") === "true").map((b) => b.dataset.k), G);
    L.check("B2", "Stage in the panel → the glyph is selected", on.length === 1 && on[0] === "pr", JSON.stringify(on));
    await page.keyboard.press("Escape"); await page.keyboard.press("Escape");
    L.done(2);
  });

  test("C1 · the chart card is the title block's height, at both widths and after a resize", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("C1");
    for (const vp of SIZES) {
      await open(page, "/queries", vp, "C1");
      for (const step of ["load", "resize"]) {
        if (step === "resize") { await page.setViewportSize({ width: vp.width - 90, height: vp.height }); await page.waitForTimeout(500); await page.setViewportSize(vp); await page.waitForTimeout(600); }
        const tb = await box(page, `${G} [data-qc138="title-block"]`);
        const card = await box(page, `${G} [data-qc138="chart"]`);
        L.check("C1", `${vp.width} ${step}`, tb && card && near(card.h, tb.h, 1), `${card?.h.toFixed(1)} vs ${tb?.h.toFixed(1)}`);
      }
      /* the narrower window in between, read too: the writer follows a resize, not only the first paint */
      await page.setViewportSize({ width: vp.width - 90, height: vp.height }); await page.waitForTimeout(600);
      const tb = await box(page, `${G} [data-qc138="title-block"]`);
      const card = await box(page, `${G} [data-qc138="chart"]`);
      L.check("C1", `${vp.width - 90} (resized)`, tb && card && near(card.h, tb.h, 1), `${card?.h.toFixed(1)} vs ${tb?.h.toFixed(1)}`);
    }
    L.done(6);
  });

  test("C2 · weeks: twelve Monday-start weeks of first-queried dates; this week on load; week 11 reads last week", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("C2");
    await open(page, "/queries", SIZES[0], "C2");
    /* every row in scope: unfold any folded band, then read each row's first-queried date */
    await page.evaluate((g) => {
      const grp = [...document.querySelectorAll<HTMLElement>(g)].find((e) => e.getBoundingClientRect().width > 0)!;
      grp.querySelectorAll<HTMLElement>('[data-qcv="gband"][aria-expanded="false"]').forEach((b) => b.click());
    }, G);
    await page.waitForTimeout(600);
    const r = await page.evaluate((g) => {
      const grp = [...document.querySelectorAll<HTMLElement>(g)].find((e) => e.getBoundingClientRect().width > 0)!;
      const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const now = new Date();
      const dates = [...grp.querySelectorAll<HTMLElement>('[data-qcv="row"] .qc138-fqd')].map((e) => (e.textContent ?? "").trim());
      const monday = (d: Date) => { const o = new Date(d.getFullYear(), d.getMonth(), d.getDate()); o.setDate(o.getDate() - ((o.getDay() + 6) % 7)); return o.getTime(); };
      const thisW = monday(now);
      const want = Array(12).fill(0);
      let parsed = 0;
      for (const t of dates) {
        if (t === "Not dated") { parsed++; continue; }
        const m = /^(\d{1,2}) ([A-Z][a-z]{2})(?: (\d{4}))?$/.exec(t);
        if (!m) continue;
        parsed++;
        const d = new Date(m[3] ? +m[3] : now.getFullYear(), MON.indexOf(m[2]), +m[1], 12);
        const idx = 11 - Math.round((thisW - monday(d)) / (7 * 864e5));
        if (idx >= 0 && idx < 12) want[idx]++;
      }
      const weeks = [...grp.querySelectorAll<HTMLElement>('[data-qc138="week"]')];
      return { rows: dates.length, parsed, total: Number(grp.querySelector('[data-qc138="total"]')?.textContent ?? 0), want,
        got: weeks.map((w) => Number(w.dataset.n)), pressed: weeks.map((w) => w.getAttribute("aria-pressed")),
        n: grp.querySelector('[data-qc138="chart-n"]')?.textContent, ey: (grp.querySelector<HTMLElement>('[data-qc138="chart-eyebrow"]')?.innerText ?? "") };
    }, G);
    L.check("C2", "every row read", r.rows === r.total && r.parsed === r.rows, `${r.parsed} parsed of ${r.rows} rows, title says ${r.total}`);
    L.check("C2", "twelve week buttons", r.got.length === 12, `${r.got.length}`);
    L.check("C2", "the counts are the first-queried counts per Monday-start week", JSON.stringify(r.got) === JSON.stringify(r.want), `${JSON.stringify(r.got)} vs ${JSON.stringify(r.want)}`);
    L.check("C2", "the population is not empty", r.want.reduce((s, x) => s + x, 0) > 0, `${r.want.reduce((s, x) => s + x, 0)} in the twelve weeks`);
    L.check("C2", "on load the last week is pressed", r.pressed[11] === "true" && r.pressed.filter((p) => p === "true").length === 1, JSON.stringify(r.pressed));
    L.check("C2", "on load the number is this week's", Number(r.n) === r.want[11], `${r.n} vs ${r.want[11]}`);
    L.check("C2", "on load the eyebrow reads this week", r.ey.toUpperCase() === "SENT · THIS WEEK", r.ey);
    await page.locator(`${G} [data-qc138="week"][data-i="10"]`).click();
    await page.mouse.move(5, 5);
    await page.waitForTimeout(300);
    const after = await page.evaluate((g) => {
      const grp = [...document.querySelectorAll<HTMLElement>(g)].find((e) => e.getBoundingClientRect().width > 0)!;
      return { n: grp.querySelector('[data-qc138="chart-n"]')?.textContent, ey: grp.querySelector<HTMLElement>('[data-qc138="chart-eyebrow"]')!.innerText };
    }, G);
    L.check("C2", "week 11: the number is its count", Number(after.n) === r.want[10], `${after.n} vs ${r.want[10]}`);
    L.check("C2", "week 11: the eyebrow reads last week", after.ey.toUpperCase() === "SENT · LAST WEEK", after.ey);
    L.done(9);
  });

  test("D1 · lift: the hawk shadow paints over the card at rest, and under it while the card is hovered", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("D1");
    for (const vp of SIZES) {
      await open(page, "/queries", vp, "D1");
      const shoot = async (hide: boolean) => {
        await page.evaluate(([g, h]) => { const s = [...document.querySelectorAll<HTMLElement>(`${g} [data-qc138="shadow"]`)].find((e) => e.getBoundingClientRect().width > 0)!; s.style.visibility = h ? "hidden" : ""; }, [G, hide] as const);
        await page.waitForTimeout(80);
        const b = (await box(page, `${G} [data-qc138="chart"]`))!;
        const png = await page.screenshot({ clip: { x: b.l + 2, y: b.t + 2, width: b.w - 4, height: Math.min(60, b.h - 4) } });
        return decode(png);
      };
      const diff = (a: ReturnType<typeof decode>, b: ReturnType<typeof decode>) => {
        let n = 0; const ch = a.channels;
        for (let i = 0; i < a.data.length; i += ch) if (Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]) > 6) n++;
        return n;
      };
      await page.mouse.move(5, 5); await page.waitForTimeout(300);
      const restOn = await shoot(false), restOff = await shoot(true);
      await page.evaluate((g) => { const s = [...document.querySelectorAll<HTMLElement>(`${g} [data-qc138="shadow"]`)].find((e) => e.getBoundingClientRect().width > 0)!; s.style.visibility = ""; }, G);
      const c = (await box(page, `${G} [data-qc138="chart"]`))!;
      await page.mouse.move(c.l + 30, c.t + 20); await page.waitForTimeout(500);
      const hovOn = await shoot(false), hovOff = await shoot(true);
      await page.evaluate((g) => { const s = [...document.querySelectorAll<HTMLElement>(`${g} [data-qc138="shadow"]`)].find((e) => e.getBoundingClientRect().width > 0)!; s.style.visibility = ""; }, G);
      const rest = diff(restOn, restOff), hov = diff(hovOn, hovOff);
      L.check("D1", `${vp.width} at rest the shadow paints over the card`, rest > 50, `${rest} pixels differ`);
      L.check("D1", `${vp.width} hovered the card paints over the shadow`, hov === 0, `${hov} pixels differ`);
      const lift = await page.evaluate((g) => getComputedStyle([...document.querySelectorAll<HTMLElement>(`${g} [data-qc138="chart"]`)].find((e) => e.getBoundingClientRect().width > 0)!).transform, G);
      L.check("D1", `${vp.width} hovered the card is up 3px`, /matrix\(1, 0, 0, 1, 0, -3\)/.test(lift), lift);
      await page.mouse.move(5, 5);
    }
    L.done(6);
  });

  test("E1 · filters: no row under the header; title, search, Filters, density, pin; the badge; Escape", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("E1");
    for (const vp of SIZES) {
      await open(page, "/queries", vp, "E1");
      const w = `${vp.width}`;
      const r = await page.evaluate((g) => {
        const grp = [...document.querySelectorAll<HTMLElement>(g)].find((e) => e.getBoundingClientRect().width > 0)!;
        const hd = grp.querySelector<HTMLElement>('[data-qc138="header"]')!;
        const top = grp.querySelector<HTMLElement>('[data-qc138="top"]')!;
        const x = (s: string) => top.querySelector<HTMLElement>(s)?.getBoundingClientRect().left ?? -1;
        return {
          rowInHeader: hd.querySelectorAll('[data-qc138="filters"], [data-qc138="pill"]').length,
          rowOnPage: [...grp.querySelectorAll<HTMLElement>('[data-qc138="filters"]')].filter((e) => e.getBoundingClientRect().height > 0).length,
          order: [x('[data-qc138="showing"]'), x('[data-qc138="search"]'), x('[data-qc138="filters-btn"]'), x('[data-qcv="ws-density"]'), x('[data-qc138="pin"]')],
        };
      }, G);
      L.check("E1", `${w} no filter row under the header`, r.rowInHeader === 0 && r.rowOnPage === 0, `${r.rowInHeader} in the header, ${r.rowOnPage} on the page`);
      L.check("E1", `${w} title · search · Filters · density · pin`, r.order.every((v) => v >= 0) && r.order.every((v, i) => i === 0 || v > r.order[i - 1]), JSON.stringify(r.order.map((v) => Math.round(v))));
      if (vp.width !== 1512) continue;
      await page.locator(`${G} [data-qc138="filters-btn"]`).click();
      await page.waitForTimeout(400);
      await page.locator('[data-qc138="filters-panel"] [data-qc138="pill"][data-k="offers"] .qc138-fp').click();
      await page.waitForTimeout(400);
      const set = await page.evaluate((g) => {
        const grp = [...document.querySelectorAll<HTMLElement>(g)].find((e) => e.getBoundingClientRect().width > 0)!;
        return { badge: grp.querySelector('[data-qc138="filters-badge"]')?.textContent ?? null, title: (grp.querySelector<HTMLElement>('[data-qc138="showing"]')?.innerText ?? "").replace(/\s+/g, " ") };
      }, G);
      L.check("E1", "one filter set: the badge reads 1", set.badge === "1", `${set.badge}`);
      /* RE-POINTED (Contact list v18.3 §E, shared): the grouping left the title for the chip */
      L.check("E1", "one filter set: the title reads 'Showing {n} of {N} queries'", /^Showing \d+ of \d+ quer(y|ies)\b/.test(set.title) && !/grouped by/i.test(set.title), set.title);
      L.check("E1", "no Clear all in the title", !/Clear all/.test(set.title), set.title);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
      const esc = await page.evaluate(() => ({ open: !!document.querySelector('[data-qc138="filters-panel"]'), focus: (document.activeElement as HTMLElement | null)?.dataset.qc138 ?? null }));
      L.check("E1", "Escape closes the panel", !esc.open, `${esc.open}`);
      L.check("E1", "focus returns to the Filters button", esc.focus === "filters-btn", `${esc.focus}`);
      /* put the account's view back */
      await page.locator(`${G} [data-qc138="filters-btn"]`).click(); await page.waitForTimeout(300);
      await page.locator('[data-qc138="filters-panel"] [data-qc138="filters-clear"]').click(); await page.keyboard.press("Escape");
    }
    L.done(9);
  });

  test("F1 · F2 · columns: one template; no chip truncated at 1512; icons under the chip; no gap after Where it stands", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger(MUT === "F2" ? "F2" : "F1");
    for (const vp of SIZES) {
      await open(page, "/queries", vp, MUT === "F2" ? "F2" : "F1");
      await scrollTo(page, 300);
      await page.waitForTimeout(400);
      const r = await page.evaluate((g) => {
        const grp = [...document.querySelectorAll<HTMLElement>(g)].find((e) => e.getBoundingClientRect().width > 0)!;
        grp.querySelectorAll<HTMLElement>('[data-qcv="gband"][aria-expanded="false"]').forEach((b) => b.click());
        const heads = grp.querySelector<HTMLElement>('[data-qc138="headings"]')!;
        const rows = [...grp.querySelectorAll<HTMLElement>('[data-qcv="row"]')];
        const tpl = (e: HTMLElement) => getComputedStyle(e).gridTemplateColumns;
        const chips = [...grp.querySelectorAll<HTMLElement>('[data-qcv="row-pkg"]')].map((c) => {
          const s = c.querySelector<HTMLElement>("span")!; const cb = c.getBoundingClientRect();
          const ic = c.parentElement!.querySelector<HTMLElement>('[data-qcv="sent-icons"]')!.getBoundingClientRect();
          const col = c.parentElement!.getBoundingClientRect().width;
          return { name: s.textContent ?? "", cut: s.scrollWidth > s.clientWidth + 0.5, full: cb.width >= col - 1, tip: c.dataset.tip ?? "", below: ic.top >= cb.bottom - 0.5 };
        });
        /* F2 — the ink of "Where it stands" (its text, by Range, and its track's marks), not the cell's box: the old gap
           lived INSIDE a wide cell, so a reading from the cell's edge cannot see it. The column hugs its WIDEST content
           (a short status in a 148 column is not a gap the design removes, in the mock or here), so each row's gap is
           measured from the right edge of the widest Where it stands in the list, at that row's column start. */
        const inkW = (st: HTMLElement) => {
          const l = st.getBoundingClientRect().left;
          let right = l;
          const walk = document.createTreeWalker(st, NodeFilter.SHOW_TEXT);
          for (let n = walk.nextNode(); n; n = walk.nextNode()) {
            if (!(n.textContent ?? "").trim()) continue;
            const rg = document.createRange(); rg.selectNodeContents(n);
            for (const rc of rg.getClientRects()) if (rc.width > 0) right = Math.max(right, rc.right);
          }
          st.querySelectorAll<SVGElement>("svg, i").forEach((e) => { const rc = e.getBoundingClientRect(); if (rc.width > 0) right = Math.max(right, rc.right); });
          return right - l;
        };
        const cellsF2 = rows.map((rw) => ({ st: rw.querySelector<HTMLElement>(".qc138-st"), mats: rw.querySelector<HTMLElement>('[data-qcv="sent"]') }))
          .filter((x): x is { st: HTMLElement; mats: HTMLElement } => !!x.st && !!x.mats && x.st.getBoundingClientRect().width > 0);
        const widest = Math.max(0, ...cellsF2.map((x) => inkW(x.st)));
        const gaps = cellsF2.map((x) => x.mats.getBoundingClientRect().left - (x.st.getBoundingClientRect().left + widest));
        return { head: tpl(heads), rows: rows.length, same: rows.filter((rw) => tpl(rw) === tpl(heads)).length, chips, gaps, widest };
      }, G);
      const w = `${vp.width}`;
      if (MUT !== "F2") {
        L.check("F1", `${w} rows found`, r.rows > 10, `${r.rows}`);
        L.check("F1", `${w} headings and every row share one template`, r.same === r.rows, `${r.same} of ${r.rows} · ${r.head}`);
        L.check("F1", `${w} chips found`, r.chips.length > 0, `${r.chips.length}`);
        /* ⚠️ THE HARNESS ACCOUNT CARRIES A NAME NO COLUMN CAN HOLD ("The Complete Autumn Submission Bundle for Literary
           Agents", ~446px at this size: the name that stopped v138.1's Part C). The claim that holds on any fixture is
           the rule itself: a chip truncates only once it is as wide as its column, and then its tooltip has the name. */
        if (vp.width === 1512) {
          L.check("F1", `${w} no chip truncated that fits its column`, r.chips.every((c) => !c.cut || c.full), r.chips.filter((c) => c.cut && !c.full).map((c) => c.name).join(", "));
          L.check("F1", `${w} a truncated chip's tooltip has the full name`, r.chips.every((c) => !c.cut || c.tip.includes(c.name)), r.chips.filter((c) => c.cut && !c.tip.includes(c.name)).map((c) => c.tip).join(", "));
          L.check("F1", `${w} the chips that fit (all but the over-long name) show in full`, r.chips.filter((c) => !c.cut).length > 0, `${r.chips.filter((c) => !c.cut).length} whole, ${r.chips.filter((c) => c.cut).length} truncated: ${[...new Set(r.chips.filter((c) => c.cut).map((c) => c.name))].join(", ")}`);
        }
        L.check("F1", `${w} the icons sit under the chip`, r.chips.every((c) => c.below), `${r.chips.filter((c) => !c.below).length} not below`);
      }
      if (vp.width === 1512 && (MUT === "" || MUT === "F2")) L.check("F2", `${w} Where it stands → chip ≤ 40 on every row`, r.gaps.length > 10 && r.gaps.every((x) => x <= 40), `max ${Math.max(...r.gaps).toFixed(1)} over ${r.gaps.length} rows (widest Where it stands ${r.widest.toFixed(1)})`);
    }
    L.done(MUT === "F2" ? 1 : 10);
  });

  test("G1 · pin: rail, no header, the list 22 under the sheet, no pinned bar; unpin restores the sidebar as it was", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("G1");
    const vp = SIZES[0];
    const read = () => page.evaluate((g) => {
      const grp = [...document.querySelectorAll<HTMLElement>(g)].find((e) => e.getBoundingClientRect().width > 0)!;
      const sheet = [...document.querySelectorAll<HTMLElement>(".ws-window")].find((e) => e.getBoundingClientRect().width > 0)!.getBoundingClientRect();
      const side = document.querySelector<HTMLElement>(".ws-panel")!.getBoundingClientRect();
      const hd = grp.querySelector<HTMLElement>('[data-qc138="header"]')!;
      return { side: side.width, header: hd.getBoundingClientRect().height > 0, top: grp.querySelector<HTMLElement>('[data-qc138="top"]')!.getBoundingClientRect().top - sheet.top,
        bar: document.querySelectorAll('[data-qc138="pinned"][data-on]').length,
        pressed: grp.querySelector('[data-qc138="pin"]')!.getAttribute("aria-pressed") };
    }, G);
    const rail = await page.evaluate(() => 0);
    void rail;
    for (const pre of ["open", "collapsed"] as const) {
      await open(page, "/queries", vp, "G1");
      const collapsedW = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--shell-side-w-collapsed")) || 68);
      if (pre === "collapsed") { await page.locator('[aria-label="Collapse sidebar"]').first().click(); await page.waitForTimeout(600); }
      const before = await read();
      await page.locator(`${G} [data-qc138="pin"]`).click();
      await page.waitForTimeout(800);
      const pinned = await read();
      /* scroll a long way: the old pinned bar would show here if it were not stood down */
      await scrollTo(page, 1500); await page.waitForTimeout(500);
      const scrolled = await read();
      await scrollTo(page, 0); await page.waitForTimeout(300);
      await page.locator(`${G} [data-qc138="pin"]`).click();
      await page.waitForTimeout(800);
      const after = await read();
      const w = `sidebar ${pre}`;
      L.check("G1", `${w} pinned: the rail`, near(pinned.side, collapsedW, 1), `${pinned.side} vs ${collapsedW}`);
      L.check("G1", `${w} pinned: no header`, !pinned.header, `${pinned.header}`);
      L.check("G1", `${w} pinned: navy header 22 under the sheet`, near(pinned.top, 22, 2), `${pinned.top.toFixed(1)}`);
      L.check("G1", `${w} pinned: the old pinned bar not shown, even scrolled`, pinned.bar === 0 && scrolled.bar === 0, `${pinned.bar} ${scrolled.bar}`);
      L.check("G1", `${w} pinned: aria-pressed`, pinned.pressed === "true", `${pinned.pressed}`);
      L.check("G1", `${w} unpinned: the sidebar as it was before`, near(after.side, before.side, 1), `${after.side} vs ${before.side}`);
      L.check("G1", `${w} unpinned: the header back`, after.header, `${after.header}`);
      /* put the writer's own setting back (collapsed, the toggle only shows on hover, so press it directly) */
      if (pre === "collapsed") { await page.evaluate(() => document.querySelector<HTMLElement>('[aria-label="Expand sidebar"]')?.click()); await page.waitForTimeout(500); }
    }
    L.done(14);
  });

  test("H1 · group art: 36 wide and inside its band", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("H1");
    for (const vp of SIZES) {
      await open(page, "/queries", vp, "H1");
      await page.mouse.move(5, 5);
      const r = await page.evaluate((g) => {
        const grp = [...document.querySelectorAll<HTMLElement>(g)].find((e) => e.getBoundingClientRect().width > 0)!;
        return [...grp.querySelectorAll<HTMLElement>('[data-qcv="gband-art"]')].filter((e) => e.offsetParent !== null).map((img) => {
          const band = img.closest<HTMLElement>('[data-qcv="gband"]')!.getBoundingClientRect();
          /* the layout box, before the idle pose (a rotate) and any jab: what the art occupies */
          const was = { t: img.style.transform, a: img.style.animation, s: img.style.scale };
          img.style.animation = "none"; img.style.transform = "none"; img.style.scale = "1"; void img.offsetHeight;
          const b = img.getBoundingClientRect();
          img.style.animation = was.a; img.style.transform = was.t; img.style.scale = was.s;
          return { k: img.className, w: img.offsetWidth, inside: b.left >= band.left - 0.5 && b.right <= band.right + 0.5 && b.top >= band.top - 0.5 && b.bottom <= band.bottom + 0.5,
            centre: (b.top + b.bottom) / 2 - (band.top + band.bottom) / 2, left: b.left - band.left, bt: b.top - band.top, bb: band.bottom - b.bottom };
        });
      }, G);
      L.check("H1", `${vp.width} both arts found`, r.length >= 2, `${r.length}`);
      for (const a of r) {
        L.check("H1", `${vp.width} ${a.k} 36 wide`, near(a.w, 36, 1), `${a.w}`);
        L.check("H1", `${vp.width} ${a.k} inside its band`, a.inside, `top ${a.bt.toFixed(1)} bottom ${a.bb.toFixed(1)}`);
        L.check("H1", `${vp.width} ${a.k} centred, on the left padding`, near(a.centre, 0, 1) && near(a.left, 12, 1), `centre ${a.centre.toFixed(1)} left ${a.left.toFixed(1)}`);
      }
    }
    L.done(14);
  });
});
