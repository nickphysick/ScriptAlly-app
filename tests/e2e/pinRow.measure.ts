/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pinned-row fix — the PIN1 locks, on every page with a pinned row (pinLib's PIN_PAGES), at 1512 × 900 and 1280 × 800
 * with the shell, scrolled 1500px.
 *
 * P1 visible centre · P2 nothing covers content · P3 one frame · P4 headings.
 *
 * ⚠️ P1 MEASURES AGAINST THE VISIBLE AREA, NEVER THE ROW'S OWN BOX. The visible top is found by PAINT (pinLib's
 *    `paintCovers`: each element meeting the row's top strip painted a probe colour in turn), because the cover — the
 *    sheet lip — is `pointer-events: none` and invisible to hit-testing. QC138.1 A1 measured against the box and passed
 *    while the contents sat 6px high. A text-only child (`data-pin-text`) is judged by its ink (cap height to baseline,
 *    Part C), every other child by its box.
 *
 * Each lock was run with its named mutation before its green was believed: `PIN_MUTATE=<lock>`.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";
import { PIN_PAGES, scrollPage, paintCovers, pinKids } from "./pinLib";

const DIR = "reports/pin-row";
const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
const MUT = process.env.PIN_MUTATE ?? "";
const near = (a: unknown, b: number, t: number) => typeof a === "number" && Number.isFinite(a) && Math.abs(a - b) <= t;

const MUTATIONS: Record<string, { css?: string; js?: string }> = {
  P1: { js: `document.querySelectorAll(".ws-window").forEach((w) => w.style.setProperty("--pin-cover", "0px"))` },
  P2: { css: `.pin-row { padding-top: 0 !important; }` },
  P3: { css: `.cl17-pin { padding-top: 0; }` },
  P4: { css: `.qcv-group[data-v138] { --qc138-pin-h: 68px !important; } .clv-group { --cl17-pin-h: 68px !important; }` },
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
async function openPinned(page: Page, vp: { width: number; height: number }, p: (typeof PIN_PAGES)[number], lock: string) {
  await page.addInitScript(() => { try { for (const k of ["contacts", "queries", "manuscripts"]) localStorage.setItem(`sa.guide.${k}`, "1"); } catch { /* */ } });
  await openRoute(page, p.route, vp);
  await page.locator(p.group).first().waitFor({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
  const m = MUT === lock ? MUTATIONS[lock] : null;
  if (m?.css) await page.addStyleTag({ content: m.css });
  if (m?.js) await page.evaluate(m.js);
  await scrollPage(page, p.group, 1500);
  await expect(page.locator(p.row)).toBeVisible({ timeout: 5000 });
}
test.describe("Pinned rows", () => {
  test("P1 · visible centre: every child centred on the area a reader can see", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("P1");
    for (const vp of SIZES) for (const p of PIN_PAGES) {
      await openPinned(page, vp, p, "P1");
      const covers = await paintCovers(page, p.row);
      const r = await pinKids(page, p.row);
      const visTop = r.top + Math.max(0, ...covers.map((c) => c.coverPx));
      const visC = (visTop + r.bottom) / 2;
      const w = `${vp.width} ${p.key}`;
      L.check("P1", `${w} children`, r.kids.length >= 4, `${r.kids.length}`);
      for (const k of r.kids) L.check("P1", `${w} ${k.cls} (${k.how})`, near(k.c, visC, 1), `${(k.c - visC).toFixed(2)}px from the visible centre`);
    }
    L.done(20);
  });

  test("P2 · nothing covers content: no child reaches under the cover", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("P2");
    for (const vp of SIZES) for (const p of PIN_PAGES) {
      await openPinned(page, vp, p, "P2");
      const covers = await paintCovers(page, p.row);
      const r = await pinKids(page, p.row);
      const cover = Math.max(0, ...covers.map((c) => c.coverPx));
      const w = `${vp.width} ${p.key}`;
      L.check("P2", `${w} the cover measured`, cover > 0, `${cover}px (${covers.map((c) => c.sel).join(", ")})`);
      /* the content row itself must start below the cover, and no child above that */
      const inner = await page.evaluate((rs) => document.querySelector<HTMLElement>(rs)!.querySelector<HTMLElement>("[data-pin-row-in]")!.getBoundingClientRect().top, p.row);
      L.check("P2", `${w} the content row starts below the cover`, inner >= r.top + cover - 0.5, `${(inner - r.top).toFixed(1)} vs ${cover}`);
      L.check("P2", `${w} no child under the cover`, r.kids.every((k) => k.top >= r.top + cover - 0.5), r.kids.map((k) => `${k.cls} ${(k.top - r.top).toFixed(1)}`).join(", "));
    }
    L.done(12);
  });

  test("P3 · one frame: every pinned row is PinnedRow's, and no page rule sets its height, padding-top or top", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("P3");
    for (const vp of SIZES) for (const p of PIN_PAGES) {
      await openPinned(page, vp, p, "P3");
      const r = await page.evaluate((rs) => {
        const row = document.querySelector<HTMLElement>(rs)!;
        const bad: string[] = [];
        const walk = (rules: CSSRuleList) => {
          for (const rule of [...rules]) {
            if (rule instanceof CSSStyleRule) {
              let hits = false;
              try { hits = row.matches(rule.selectorText); } catch { /* */ }
              if (!hits) continue;
              const st = rule.style;
              const sets = ["height", "padding-top", "top", "padding"].filter((k) => st.getPropertyValue(k) !== "");
              /* a PAGE rule is one naming the row's own page class or data attribute (a global reset such as preflight's
                 \`*\` matches every element and names neither); the shared frame's rules name only .pin-row */
              const own = [...row.classList].filter((c) => c !== "pin-row").map((c) => `.${c}`).concat([...row.attributes].map((a) => a.name).filter((n) => n.startsWith("data-") && n !== "data-pin-row" && n !== "data-on").map((n) => `[${n}`));
              const names = own.some((t) => rule.selectorText.includes(t));
              if (sets.length && names) bad.push(`${rule.selectorText} { ${sets.join(", ")} }`);
            } else if ("cssRules" in rule) walk((rule as CSSGroupingRule).cssRules);
          }
        };
        for (const sh of [...document.styleSheets]) { try { walk(sh.cssRules); } catch { /* cross-origin */ } }
        return { frame: row.classList.contains("pin-row") && row.hasAttribute("data-pin-row") && !!row.querySelector(":scope > [data-pin-row-in]"), bad };
      }, p.row);
      const w = `${vp.width} ${p.key}`;
      L.check("P3", `${w} renders through PinnedRow`, r.frame, `${r.frame}`);
      L.check("P3", `${w} no page rule sets the frame`, !r.bad.length, r.bad.join(" | "));
    }
    L.done(8);
  });

  test("P4 · headings: directly under the row, and still while scrolling", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("P4");
    for (const vp of SIZES) for (const p of PIN_PAGES) {
      await openPinned(page, vp, p, "P4");
      const w = `${vp.width} ${p.key}`;
      const tops: number[] = [];
      for (const y of [1500, 1530, 1560, 1600, 1680]) {
        await scrollPage(page, p.group, y);
        const r = await page.evaluate(([rs, hs]) => {
          const row = document.querySelector<HTMLElement>(rs as string)!.getBoundingClientRect();
          const h = [...document.querySelectorAll<HTMLElement>(hs as string)].find((e) => e.getBoundingClientRect().height > 0)!.getBoundingClientRect();
          return { rowB: row.bottom, headT: h.top };
        }, [p.row, p.heads] as const);
        L.check("P4", `${w} @${y} headings at the row's bottom`, near(r.headT, r.rowB, 1), `${r.headT.toFixed(1)} vs ${r.rowB.toFixed(1)}`);
        tops.push(r.headT);
      }
      L.check("P4", `${w} headings still while scrolling`, Math.max(...tops) - Math.min(...tops) <= 0.5, tops.map((t) => t.toFixed(1)).join(","));
    }
    L.done(24);
  });
});
