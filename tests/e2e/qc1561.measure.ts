/**
 * Query Centre v156.1 — streak-led top right, lined-up card boxes, the arrow chip (design-refs/query-centre-v156-1.html),
 * measured on the emulator harness at 1920 and 1440.
 *
 *   SA_PHASE=before  Step 0: the Sent and Next boxes' top, height and padding on a waiting card with a nudge line and
 *                    a "your move" card; the Next box's fill at rest and hovered; before screens.
 *   (default)        W1 the top-right block in its three situations (dev aid __SA_QC156_GOAL), and the collapsed bar;
 *                    W2 the boxes line up; W3 the chip. Screens to reports/qc-v156-1/.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

const PAGE = ".qc151.qc153";
const SCROLL = ".ws-window .qc-wpg.qc-wpg--v11 > .wpg-scroll";
const PHASE = process.env.SA_PHASE === "before" ? "before" : "after";
const DIR = "reports/qc-v156-1";
const SHOTS = `${DIR}/shots`;
const SIZES = [{ width: 1920, height: 1080 }, { width: 1440, height: 900 }];
test.setTimeout(900_000);
mkdirSync(SHOTS, { recursive: true });
mkdirSync(`${DIR}/ledger`, { recursive: true });

class Ledger {
  rows: { name: string; ok: boolean; got: string }[] = [];
  constructor(public id: string) {}
  check(name: string, ok: boolean, got: string) { this.rows.push({ name, ok, got }); console.log(`${ok ? "✓" : "✗"} ${name} — ${got}`); }
  done(min: number) {
    writeFileSync(`${DIR}/ledger/${this.id}.json`, JSON.stringify(this.rows, null, 1));
    expect(this.rows.length, "assertions run").toBeGreaterThanOrEqual(min);
    expect(this.rows.filter((r) => !r.ok).map((r) => r.name)).toEqual([]);
  }
}

async function openQc(page: Page, vp: { width: number; height: number }, goal?: "streak" | "none" | "met") {
  await page.addInitScript((g) => {
    try { localStorage.setItem("sa.guide.queries", "1"); localStorage.setItem("sa.guide.queries-explainer", "1"); } catch { /* private */ }
    (window as unknown as Record<string, unknown>).__SA_QC156_GOAL = g ?? undefined;
  }, goal ?? null);
  await openRoute(page, "/queries", vp);
  await page.waitForSelector(`${PAGE} [data-qc153="bar"]`, { timeout: 60_000 });
  const b = page.locator(`${PAGE} [data-qc153="bar"] button[data-v="list"]`);
  if ((await b.getAttribute("aria-pressed")) !== "true" && await b.isEnabled()) await b.click();
  await expect(page.locator(`${PAGE} [data-qc154="card"]`).first()).toBeVisible({ timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  await page.mouse.move(2, 2);
}
const scrollTo = async (page: Page, y: number) => {
  await page.evaluate(([sel, v]) => { const s = document.querySelector<HTMLElement>(sel as string); if (s) s.scrollTop = v as number; }, [SCROLL, y]);
  await page.waitForTimeout(450);
};

/** the card ids for a waiting card with a nudge line, and a "your move" (hot) card */
const pickCards = (page: Page) => page.evaluate((sel) => {
  const cards = [...document.querySelectorAll<HTMLElement>(`${sel} [data-qc154="card"]`)];
  const wait = cards.find((c) => c.querySelector("[data-qc154='nudge-on']")) ?? cards.find((c) => c.querySelector("[data-qc154='fact'][data-k='next'][data-state='wait']"));
  const hot = cards.find((c) => c.querySelector("[data-qc154='fact'][data-k='next'][data-hot]"));
  return { wait: wait?.dataset.id ?? null, hot: hot?.dataset.id ?? null, nudgeLines: document.querySelectorAll(`${sel} [data-qc154='nudge-on']`).length, waits: document.querySelectorAll(`${sel} [data-qc154='fact'][data-state='wait']`).length };
}, PAGE);
const boxes = (page: Page, id: string) => page.evaluate(([sel, cid]) => {
  const c = document.querySelector<HTMLElement>(`${sel} [data-qc154="card"][data-id="${cid}"]`)!;
  return [...c.querySelectorAll<HTMLElement>("[data-qc154='fact']")].map((f) => {
    const r = f.getBoundingClientRect(); const cs = getComputedStyle(f);
    return { k: f.dataset.k, top: +r.top.toFixed(2), bottom: +r.bottom.toFixed(2), h: +r.height.toFixed(2), pad: cs.padding, bg: cs.backgroundColor };
  });
}, [PAGE, id]);

test.describe("Query Centre v156.1", () => {
  test("Step 0 — the boxes and the hover today", async ({ page }) => {
    test.skip(PHASE !== "before", "Step 0 only");
    const out: Record<string, unknown> = {};
    for (const vp of SIZES) {
      await openQc(page, vp);
      const ids = await pickCards(page);
      out[`${vp.width}-ids`] = ids;
      for (const [k, id] of Object.entries(ids)) {
        if (typeof id !== "string") continue;
        out[`${vp.width}-${k}`] = await boxes(page, id);
        await page.locator(`${PAGE} [data-qc154="card"][data-id="${id}"]`).scrollIntoViewIfNeeded();
        await page.locator(`${PAGE} [data-qc154="card"][data-id="${id}"]`).hover();
        await page.waitForTimeout(400);
        out[`${vp.width}-${k}-hover-next`] = await page.evaluate(([sel, cid]) => {
          const n = document.querySelector<HTMLElement>(`${sel} [data-qc154="card"][data-id="${cid}"] [data-qc154='act-wrap']`);
          return n ? { bg: getComputedStyle(n).backgroundColor, op: getComputedStyle(n).opacity, label: n.textContent } : null;
        }, [PAGE, id]);
        if (vp.width === 1920) await page.locator(`${PAGE} [data-qc154="card"][data-id="${id}"]`).screenshot({ path: `${SHOTS}/before-${k}-hover-1920.png` });
        await page.mouse.move(2, 2);
      }
      await scrollTo(page, 0);
      if (vp.width === 1920) {
        const hd = await page.locator(`${PAGE} [data-qc1531='header']`).boundingBox();
        if (hd) await page.screenshot({ path: `${SHOTS}/before-header-1920.png`, clip: { x: hd.x - 20, y: hd.y - 20, width: hd.width + 40, height: hd.height + 60 } });
        await page.screenshot({ path: `${SHOTS}/before-page-1920.png` });
      }
    }
    writeFileSync(`${DIR}/step0-readings.json`, JSON.stringify(out, null, 1));
    console.log(JSON.stringify(out, null, 1));
  });
  /* W1 (§1) — the three situations (dev aid: streak = six met weeks and one short, met = this week met too, none = one
     last week and one this week): the flame, the streak, its line, the dot's colour and roundness, the caption; the
     collapsed bar's right side; screens of both. */
  test("W1 — the streak leads the top right", async ({ page }) => {
    test.skip(PHASE === "before", "after only");
    const L = new Ledger("W1");
    const want = {
      streak: { flame: true, st: "6 week streak", sl: "1 more this week to keep it going.", dot: "rgb(221, 116, 70)" },
      met: { flame: true, st: "7 week streak", sl: "You’ve hit your target this week.", dot: "rgb(221, 116, 70)" },
      none: { flame: false, st: "No streak yet", sl: "2 more this week starts one.", dot: "rgb(244, 238, 229)" },
    } as const;
    for (const vp of SIZES) {
      for (const g of ["streak", "met", "none"] as const) {
        await openQc(page, vp, g);
        const r = await page.evaluate((sel) => {
          const q = (x: string) => document.querySelector<HTMLElement>(`${sel} ${x}`);
          const fl = q(".qc1561-fl"), st = q("[data-qc1561='streak']"), sl = q("[data-qc1561='line']"), dot = q(".qc1561-dot");
          const b = (e: Element | null) => e ? e.getBoundingClientRect() : null;
          const fb = b(fl), sb = b(st), lb = b(q(".qc1561-hd")), gb = b(q(".qc1561-gr"));
          return {
            flame: !!fl && (fl as unknown as SVGElement).tagName === "svg", fw: fb?.width, fh: fb?.height, gap: fb && sb ? sb.left - fb.right : null,
            st: st?.textContent, stFont: st ? `${getComputedStyle(st).fontSize} ${getComputedStyle(st).fontFamily.split(",")[0]} ${getComputedStyle(st).color}` : "",
            sl: sl?.textContent, slFont: sl ? `${getComputedStyle(sl).fontSize} ${getComputedStyle(sl).fontStyle} ${getComputedStyle(sl).color}` : "",
            toGraph: lb && gb ? gb.top - lb.bottom : null,
            dot: dot ? getComputedStyle(dot).backgroundColor : null, dotW: b(dot)?.width, dotH: b(dot)?.height,
            cap: q("[data-qc156='caption']")?.textContent, alt: q("[data-qc156='line']")?.getAttribute("aria-label"),
            old: !!q(".qc156-big") || !!q(".qc156-ft"),
          };
        }, PAGE);
        const w = want[g]; const t = `${vp.width} ${g}`;
        L.check(`${t}: ${w.flame ? "the 38 × 48 flame" : "no flame"}`, w.flame ? (r.flame && Math.abs((r.fw ?? 0) - 38) < 0.5 && Math.abs((r.fh ?? 0) - 48) < 0.5 && Math.abs((r.gap ?? 0) - 14) < 1) : !r.flame, `${r.flame} ${r.fw}×${r.fh} gap ${r.gap}`);
        L.check(`${t}: "${w.st}" / "${w.sl}"`, r.st === w.st && r.sl === w.sl, `${r.st} / ${r.sl}`);
        L.check(`${t}: type — streak 32px Special Elite cream, line 15.5px italic`, /^32px "?Special Elite"? rgb\(251, 247, 240\)$/.test(r.stFont) && r.slFont === "15.5px italic rgba(244, 238, 229, 0.88)", `${r.stFont} · ${r.slFont}`);
        L.check(`${t}: 6px to the graph; the dot ${w.dot}, round`, Math.abs((r.toGraph ?? 0) - 6) < 1 && r.dot === w.dot && r.dotW === r.dotH, `${r.toGraph} · ${r.dot} ${r.dotW}×${r.dotH}`);
        L.check(`${t}: caption "your target · 3 a week"; alt names the streak; no v156 headline or footer`, (r.cap ?? "").includes("your target · 3 a week") && (r.alt ?? "").startsWith(`${w.st}. ${w.sl} Queries sent per week`) && !r.old, `${r.cap} · ${r.alt}`);
        if (vp.width === 1920) {
          const hd = await page.locator(`${PAGE} [data-qc1531='header']`).boundingBox();
          if (hd) await page.screenshot({ path: `${SHOTS}/w1-header-${g}-1920.png`, clip: { x: hd.x - 20, y: hd.y - 20, width: hd.width + 40, height: hd.height + 60 } });
        }
        await scrollTo(page, 900);
        const sl = await page.evaluate((sel) => {
          const q = (x: string) => document.querySelector<HTMLElement>(`${sel} ${x}`);
          const fl = q(".qc1561-sfl"); const fb = fl?.getBoundingClientRect();
          return { shown: q("[data-qc156='slim']")?.hasAttribute("data-shown"), flame: !!fl, fw: fb?.width, fh: fb?.height, st: q("[data-qc156='slim-streak']")?.textContent, sl: q("[data-qc156='slim-line']")?.textContent, text: q("[data-qc156='slim']")?.textContent ?? "" };
        }, PAGE);
        L.check(`${t}: collapsed bar — ${w.flame ? "17 × 22 flame, " : "no flame, "}"${w.st}", its line; no "n of goal"`, !!sl.shown && sl.flame === w.flame && (!w.flame || (Math.abs((sl.fw ?? 0) - 17) < 0.5 && Math.abs((sl.fh ?? 0) - 22) < 0.5)) && sl.st === w.st && sl.sl === w.sl && !/\d of \d|this week$/.test(sl.text.replace(w.sl, "")), `${sl.shown} ${sl.flame} ${sl.fw}×${sl.fh} ${sl.st} / ${sl.sl}`);
        if (vp.width === 1920) await page.screenshot({ path: `${SHOTS}/w1-slim-${g}-1920.png`, clip: { x: 80, y: 100, width: 1840, height: 120 } });
      }
    }
    L.done(36);
  });
});
