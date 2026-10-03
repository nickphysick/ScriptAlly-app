/**
 * analyticsV13.measure — the Analytics page against design-refs/analytics-v13.html, on the rendered page.
 *
 * ⚠️ HARNESS-FIRST. Written before the page and proved red against `main`; then each lock is proved red
 * on its own by a targeted mutation (reports/analytics-v13/mutation-proofs.jsonl).
 *
 * ⚠️ POPULATIONS BEFORE PROPERTIES: a figure's marks are asserted only once its population is proved
 * non-zero, and every case asserts a floor on how many checks it ran.
 *
 * ⚠️ ONE LEDGER FILE PER WORKER (`ledger/<pid>.json`): a failing case restarts the worker, and a single
 * file would be overwritten by the next worker's rows (found by the v2a mutation run).
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

const ROUTE = "/queries/analytics";
const OUT = "reports/analytics-v13";

type Row = { lock: string; size: string; ok: boolean; detail: string };
const ledger: Row[] = [];
let ran = 0;
function check(lock: string, size: string, ok: boolean, detail: string) {
  ran++;
  ledger.push({ lock, size, ok, detail });
  expect(ok, `${lock} @ ${size}: ${detail}`).toBe(true);
}
test.afterAll(() => {
  mkdirSync(`${OUT}/ledger`, { recursive: true });
  writeFileSync(`${OUT}/ledger/${process.pid}.json`, JSON.stringify({ ran, rows: ledger }, null, 1));
  console.log(`LEDGER analyticsV13: ${ran} checks, ${ledger.filter((r) => !r.ok).length} failed`);
});

const VIS = `[...document.querySelectorAll('[data-a13="page"]')].find((e) => e.getBoundingClientRect().height > 0)`;

async function openPage(page: Page, vp: { width: number; height: number }) {
  await openRoute(page, ROUTE, vp);
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForFunction(`(() => { const p = ${VIS}; return !!p && !p.querySelector('[data-a13="skeleton"]'); })()`, null, { timeout: 20_000 }).catch(() => {});
  /* reveal everything: the scroll reveal is a transition, and the harness suppresses transitions */
  await page.evaluate(`(() => { const p = ${VIS}; p && p.querySelectorAll(".a13-rv").forEach((e) => e.classList.add("in")); })()`);
  await page.waitForTimeout(300);
}

async function scrollTo(page: Page, sec: number) {
  return page.evaluate(([vis, sec]) => {
    const p = (0, eval)(vis as string) as HTMLElement;
    const sc = p.closest(".wpg-scroll") as HTMLElement;
    const t = p.querySelector(`[data-a13="sec"][data-sec="${sec}"]`) as HTMLElement | null;
    if (!t) return { ok: false, top: 0 };
    sc.scrollTop = t.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop;
    return { ok: true, top: sc.scrollTop };
  }, [VIS, sec] as const);
}

async function activeDot(page: Page) {
  return page.evaluate((vis) => {
    const p = (0, eval)(vis) as HTMLElement;
    const dots = [...p.querySelectorAll('[data-a13="nav-dot"]')] as HTMLElement[];
    return dots.findIndex((d) => d.getAttribute("aria-current") === "true");
  }, VIS);
}

async function readPage(page: Page) {
  return page.evaluate((vis) => {
    const p = (0, eval)(vis) as HTMLElement | undefined;
    if (!p) return null;
    const box = (e: Element | null) => { if (!e) return null; const r = e.getBoundingClientRect(); return { t: r.top, b: r.bottom, l: r.left, r: r.right, w: r.width, h: r.height }; };
    const sc = p.closest(".wpg-scroll") as HTMLElement;
    const secs = [...p.querySelectorAll('[data-a13="sec"]')] as HTMLElement[];
    const figs = [...p.querySelectorAll('[data-a13="fig"]')].map((f) => {
      const el = f as HTMLElement;
      const marks = [...el.querySelectorAll('[data-a13="mark"]')].filter((m) => { const b = m.getBoundingClientRect(); return b.width > 0 && b.height > 0; }).length;
      return { key: el.dataset.key ?? "", sec: Number((el.closest('[data-a13="sec"]') as HTMLElement | null)?.dataset.sec ?? "-1"), population: Number(el.dataset.population ?? "-1"), marks };
    });
    const isWhite = (s: HTMLElement) => { const cs = getComputedStyle(s); return /rgb\(255, 255, 255\)/.test(cs.backgroundColor) && parseFloat(cs.borderTopLeftRadius) > 0; };
    const kids = [...(p.querySelector('[data-a13="flow"]')?.children ?? [])].filter((k) => k.getBoundingClientRect().height > 0) as HTMLElement[];
    return {
      sent: Number(p.dataset.sent ?? "-1"),
      scroller: box(sc),
      feature: box(p.querySelector('[data-a13="feature"]')),
      button: box(p.querySelector('[data-a13="take-a-look"]')),
      secs: secs.map((s) => ({ sec: Number(s.dataset.sec), white: isWhite(s) })),
      dots: p.querySelectorAll('[data-a13="nav-dot"]').length,
      nav: box(p.querySelector('[data-a13="nav"]')),
      figs,
      lastSec: kids.length ? kids[kids.length - 1].dataset.sec ?? kids[kids.length - 1].className : null,
      livingHeader: p.querySelectorAll(".ph, [data-lh]").length,
    };
  }, VIS);
}

const SIZES = [{ width: 1440, height: 820 }, { width: 1920, height: 1080 }];

for (const vp of SIZES) {
  const size = `${vp.width}×${vp.height}`;
  test(`feature, sections, figures and nav @ ${size}`, async ({ page }) => {
    const before = ran;
    await openPage(page, vp);
    const r = await readPage(page);
    check("page-present", size, r !== null, "a visible [data-a13=page] on /queries/analytics");
    if (!r) return;
    check("population", size, r.sent > 0, `the active manuscript has queries (sent=${r.sent})`);

    /* 1 · the feature container fits the scrollport on load, button whole */
    check("feature-present", size, !!r.feature && !!r.button, `feature ${JSON.stringify(r.feature)}`);
    check("feature-fits", size, !!r.feature && !!r.scroller && r.feature.t >= r.scroller.t - 0.5 && r.feature.b <= r.scroller.b + 0.5,
      `feature ${r.feature?.t.toFixed(1)}–${r.feature?.b.toFixed(1)} in scroller ${r.scroller?.t.toFixed(1)}–${r.scroller?.b.toFixed(1)}`);
    check("feature-max-760", size, !!r.feature && r.feature.h <= 760.5, `feature height ${r.feature?.h.toFixed(1)}`);
    /* whole AND clear of the grid's 44px bottom hem, which washes whatever lies under it */
    check("button-visible", size, !!r.button && !!r.scroller && r.button.b <= r.scroller.b - 44 && r.button.t >= r.scroller.t && r.button.h > 20,
      `button ${r.button?.t.toFixed(1)}–${r.button?.b.toFixed(1)} against the hem's top ${(r.scroller ? r.scroller.b - 44 : NaN).toFixed(1)}`);
    check("feature-clear-of-hem", size, !!r.feature && !!r.scroller && r.feature.b <= r.scroller.b - 44 + 0.5,
      `feature bottom ${r.feature?.b.toFixed(1)} against the hem's top ${(r.scroller ? r.scroller.b - 44 : NaN).toFixed(1)}`);
    check("no-living-header", size, r.livingHeader === 0, `${r.livingHeader} living-header/PageHeader elements on the page`);

    /* 2 · seven sections, the three white containers on 1, 3 and 5, and the caveats last */
    check("seven-sections", size, r.secs.map((s) => s.sec).join() === "0,1,2,3,4,5,6", `sections ${r.secs.map((s) => s.sec).join()}`);
    const whites = r.secs.filter((s) => s.white).map((s) => s.sec).join();
    check("white-containers", size, whites === "1,3,5", `white sections: ${whites || "none"}`);
    check("caveats-last", size, r.lastSec === "6", `last element in the flow: ${r.lastSec}`);

    /* 3 · every figure section has a figure with plotted marks, once its population is proved */
    for (const sec of [0, 1, 2, 3, 4, 5]) {
      const fs = r.figs.filter((f) => f.sec === sec);
      check(`figure-${sec}-present`, size, fs.length > 0, `${fs.length} figures in section ${sec}: ${fs.map((f) => f.key).join(",")}`);
      const populated = fs.filter((f) => f.population > 0);
      if (populated.length) {
        check(`figure-${sec}-marks`, size, populated.every((f) => f.marks > 0), fs.map((f) => `${f.key}: pop ${f.population}, ${f.marks} marks`).join("; "));
      } else {
        console.log(`  · section ${sec}: every figure's population is 0 — its empty statement is asserted instead`);
        check(`figure-${sec}-empty-honest`, size, fs.every((f) => f.marks === 0), fs.map((f) => `${f.key}: ${f.marks}`).join("; "));
      }
    }
    const populatedSecs = [0, 1, 2, 3, 4, 5].filter((s) => r.figs.some((f) => f.sec === s && f.population > 0)).length;
    check("figures-populated", size, populatedSecs >= 5, `${populatedSecs} of 6 figure sections populated on this account`);

    /* 4 · the dot nav: seven targets, and it follows the reader */
    check("nav-seven", size, r.dots === 7, `${r.dots} dots`);
    check("nav-on-screen", size, !!r.nav && !!r.scroller && r.nav.r <= r.scroller.r && r.nav.l >= r.scroller.l && r.nav.t >= r.scroller.t && r.nav.b <= r.scroller.b,
      `nav ${JSON.stringify(r.nav)} inside scroller ${JSON.stringify(r.scroller)}`);
    await page.locator(`[data-a13="take-a-look"]:visible`).click();
    await page.waitForTimeout(900);
    const afterButton = await activeDot(page);
    const sc0 = await page.evaluate((vis) => { const p = (0, eval)(vis) as HTMLElement; const s = p.querySelector('[data-a13="sec"][data-sec="0"]')!.getBoundingClientRect(); const sc = (p.closest(".wpg-scroll") as HTMLElement).getBoundingClientRect(); return s.top - sc.top; }, VIS);
    check("take-a-look-scrolls", size, Math.abs(sc0) <= 24, `after the button the first section's top is ${sc0.toFixed(1)}px from the scroller's top`);
    check("nav-tracks-0", size, afterButton === 0, `active dot ${afterButton} after "Take a look"`);
    const moved = await scrollTo(page, 3);
    await page.waitForTimeout(500);
    const at3 = await activeDot(page);
    check("nav-tracks-3", size, moved.ok && at3 === 3, `scrolled to section 3 (top ${moved.top}), active dot ${at3}`);

    /* 5 · every mark has a tooltip: hover one lane and read it */
    await scrollTo(page, 5);
    await page.waitForTimeout(400);
    const lane = page.locator(`[data-a13="fig"][data-key="lanes"] [data-a13="mark"]`).first();
    const laneCount = await page.locator(`[data-a13="fig"][data-key="lanes"] [data-a13="mark"]`).count();
    check("tooltip-population", size, laneCount > 0, `${laneCount} lane marks`);
    if (laneCount > 0) {
      await lane.hover({ force: false });
      await page.waitForTimeout(200);
      const tip = await page.evaluate(() => { const t = document.querySelector('[data-a13="tip"]') as HTMLElement | null; return t ? { on: getComputedStyle(t).opacity !== "0" && t.getBoundingClientRect().width > 0, text: t.innerText } : null; });
      check("tooltip-on-hover", size, !!tip && tip.on && /Queried/.test(tip.text), `tooltip ${JSON.stringify(tip)}`);
    }

    /* 6 · negative space: no burgundy anywhere on the page */
    const neg = await page.evaluate((vis) => {
      const p = (0, eval)(vis) as HTMLElement;
      const all = [p, ...p.querySelectorAll("*")];
      const burg: string[] = [];
      for (const n of all) {
        const cs = getComputedStyle(n);
        for (const k of ["color", "backgroundColor", "borderTopColor", "fill", "stroke"] as const) {
          if (/rgba?\(124,\s*58,\s*42/.test(cs[k])) burg.push(`${(n as HTMLElement).className} ${k}`);
        }
      }
      return { swept: all.length, burg };
    }, VIS);
    check("no-burgundy-population", size, neg.swept > 300, `${neg.swept} elements swept`);
    check("no-burgundy", size, neg.burg.length === 0, `burgundy on: ${neg.burg.slice(0, 4).join("; ") || "nothing"}`);

    expect(ran - before, "assertion floor").toBeGreaterThanOrEqual(30);
  });
}
