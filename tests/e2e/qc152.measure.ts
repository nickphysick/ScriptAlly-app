/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v152 — the QC152 locks (design-refs/query-centre-v152/), on the rendered page at 1280 × 800 and
 * 1512 × 900, over the q152- fixtures (tests/e2e/seedQc152.mjs, seeded and removed in the same run). Each asserts its
 * population first and was red first: against the v151.2 build it amends (QC152_BASE=1) and against its named
 * mutation (QC152_MUTATE=L<n>: a page break here, or a source break in tests/e2e/qc152Mutate.sh).
 *
 *   §1  L1 states · L2 colours · L3 filters
 */
import { test, expect, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

test.setTimeout(420_000);
const DIR = "reports/qc-v152";
const MUT = process.env.QC152_MUTATE ?? "";
const BASE = process.env.QC152_BASE === "1";
const ONLY = process.env.QC152_ONLY ?? "";
const run = (id: string) => !ONLY || ONLY.split(",").includes(id);
const SIZES = [{ width: 1280, height: 800 }, { width: 1512, height: 900 }] as const;
type VP = { width: number; height: number };

/** the fixtures and the state each must land in (seedQc152.mjs) */
const EXPECT: Record<string, string> = {
  offer: "offer", materials: "materials", nudge: "nudge", agent: "agent", quiet: "quiet",
  nrmn: "quiet", nudgedquiet: "quiet", nudgedwait: "agent", closed: "closed",
};
const HEAD: Record<string, string> = {
  offer: "rgb(42, 58, 82)", materials: "rgb(42, 58, 82)", nudge: "rgb(197, 208, 221)", agent: "rgb(227, 219, 207)", closed: "rgb(241, 239, 236)",
};

class Ledger {
  rows: { where: string; ok: boolean; detail: string }[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${BASE ? "base-" : MUT ? `mut-${MUT}-` : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${this.name} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/** the named page breaks (source breaks live in qc152Mutate.sh) */
const PAGE_MUT: Record<string, string> = {
  /* Gone quiet made stone */
  L2: `.qc1512-g[data-tone="quiet"] .qc1511-gh td.qc1511-gt.qc1511-gt { background: #e3dbcf !important; }`,
};

test.beforeAll(() => { execSync("node tests/e2e/seedQc152.mjs", { encoding: "utf8", stdio: "pipe" }); });
test.afterAll(() => { execSync("node tests/e2e/seedQc152.mjs --clean", { encoding: "utf8", stdio: "pipe" }); });

async function open(page: Page, vp: VP) {
  await page.addInitScript(() => {
    try {
      sessionStorage.removeItem("qh.qc.filters");
      sessionStorage.removeItem("qh.qc.collapsed1511");
      sessionStorage.setItem("qh.qc.view150", "list");
      localStorage.setItem("qh.qc.view", JSON.stringify({ v: 1, group: "attention", sort: { key: "due", reversed: false }, density: "comfortable" }));
      localStorage.setItem("sa.guide.queries", "1");
      localStorage.setItem("sa.guide.queries-explainer", "1");
      localStorage.removeItem("sa.pinList.queries");
    } catch { /* private mode */ }
  });
  await openRoute(page, "/queries", vp);
  await page.locator("[data-qc151='row'][data-id^='q152-']").first().waitFor({ timeout: 30_000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
  await page.mouse.move(5, 5);
  if (PAGE_MUT[MUT]) await page.addStyleTag({ content: PAGE_MUT[MUT] });
}
/** every q152 row's state and its section */
const readStates = (page: Page) => page.evaluate(() => Object.fromEntries([...document.querySelectorAll<HTMLElement>("[data-qc151='row'][data-id^='q152-']")]
  .map((r) => [r.dataset.id!.slice(5), { state: r.dataset.state ?? "", where: r.dataset.where ?? "", group: r.closest<HTMLElement>("[data-qc1511='group']")?.dataset.k ?? "" }])));

for (const vp of SIZES) {
  test.describe(`QC152 §1 @ ${vp.width}`, () => {
    test("L1 · states: each fixture lands in its state; a 2-week window moves the nudged-within-window query to Gone quiet", async ({ page }) => {
      test.skip(!run("L1"));
      const L = new Ledger(`L1-${vp.width}`);
      await open(page, vp);
      const s = await readStates(page);
      L.check("population: every fixture is on the page", Object.keys(EXPECT).every((k) => s[k]), JSON.stringify(Object.keys(s)));
      for (const [k, want] of Object.entries(EXPECT)) {
        L.check(`${k} is ${want}`, s[k]?.state === want, JSON.stringify(s[k]));
        L.check(`${k} sits in the ${want} group`, s[k]?.group === want, JSON.stringify(s[k]));
      }
      /* the setting: 2 weeks after the nudge */
      const gear = page.locator("[data-qc152='quiet-setting'] button").first();
      L.check("the banner has the quiet-window setting", await gear.count() > 0, "no [data-qc152=quiet-setting]");
      if (await gear.count()) {
        await gear.click();
        await page.locator("[data-qc152='quiet-pop'] [data-weeks='2']").click();
        await page.waitForFunction(() => document.querySelector("[data-id='q152-nudgedwait']")?.getAttribute("data-state") === "quiet", null, { timeout: 15_000 }).catch(() => {});
        const t = await readStates(page);
        L.check("at 2 weeks the nudged-within-window query is Gone quiet", t.nudgedwait?.state === "quiet", JSON.stringify(t.nudgedwait));
        L.check("at 2 weeks Nudge due stays Nudge due (its reply date is a week gone)", t.nudge?.state === "nudge", JSON.stringify(t.nudge));
        await page.locator("[data-qc152='quiet-pop'] [data-weeks='4']").click().catch(() => {});
      }
      L.done(20);
    });

    test("L2 · colours: each state's header; Gone quiet a gradient from stone to white, no dashed or dotted borders", async ({ page }) => {
      test.skip(!run("L2"));
      const L = new Ledger(`L2-${vp.width}`);
      await open(page, vp);
      const r = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll<HTMLElement>("[data-qc1511='group']")].map((g) => {
        const t = g.querySelector<HTMLElement>(".qc1511-gt");
        const lbl = g.querySelector<HTMLElement>(".qc1511-gh td.qc1511-lbl");
        const cs = t ? getComputedStyle(t) : null;
        const dashed = [...g.querySelectorAll<HTMLElement>(".qc1511-gh, .qc1511-gh *")].some((e) => { const c = getComputedStyle(e); return [c.borderTopStyle, c.borderRightStyle, c.borderBottomStyle, c.borderLeftStyle, c.outlineStyle].some((x) => x === "dashed" || x === "dotted"); });
        return [g.dataset.k!, { bg: cs?.backgroundColor ?? "", img: cs?.backgroundImage ?? "", label: lbl ? getComputedStyle(lbl).backgroundColor : "", dashed }];
      })));
      L.check("population: all six groups", ["offer", "materials", "nudge", "agent", "quiet", "closed"].every((k) => r[k]), JSON.stringify(Object.keys(r)));
      for (const [k, want] of Object.entries(HEAD)) L.check(`${k} header ${want}`, r[k]?.bg === want && (r[k]?.img === "none" || !r[k]?.img), JSON.stringify(r[k]));
      const q = r.quiet;
      const stops = q?.img.match(/rgb\([^)]+\)/g) ?? [];
      L.check("Gone quiet's title cell is a gradient starting rgb(227, 219, 207) and ending white", /linear-gradient/.test(q?.img ?? "") && stops[0] === "rgb(227, 219, 207)" && stops[stops.length - 1] === "rgb(255, 255, 255)", q?.img ?? "none");
      L.check("Gone quiet's column labels sit on white", q?.label === "rgb(255, 255, 255)", q?.label ?? "");
      L.check("no dashed or dotted border in a Gone quiet header", q && !q.dashed, String(q?.dashed));
      L.done(9);
    });

    test("L3 · filters: Your move = Offers + Materials requested + Nudge due; filtering shows only those groups, headers kept", async ({ page }) => {
      test.skip(!run("L3"));
      const L = new Ledger(`L3-${vp.width}`);
      await open(page, vp);
      const all = await page.evaluate(() => {
        const n = (k: string) => [...document.querySelectorAll(`[data-qc1511='group'][data-k='${k}'] [data-qc151='row']`)].length;
        const tab = document.querySelector<HTMLElement>(".qc1511-q[data-k='you'] b")?.textContent ?? "";
        return { offer: n("offer"), materials: n("materials"), nudge: n("nudge"), quiet: n("quiet"), tab: Number(tab) };
      });
      L.check("population: rows in all three of Your move's groups, and Gone quiet", all.offer > 0 && all.materials > 0 && all.nudge > 0 && all.quiet > 0, JSON.stringify(all));
      L.check("the Your move count is Offers + Materials requested + Nudge due", all.tab === all.offer + all.materials + all.nudge, JSON.stringify(all));
      await page.locator(".qc1511-q[data-k='you']").first().click();
      await page.waitForTimeout(500);
      const f = await page.evaluate(() => ({
        groups: [...document.querySelectorAll<HTMLElement>("[data-qc1511='group']")].map((g) => g.dataset.k),
        rows: document.querySelectorAll("[data-qc151='row']").length,
        heads: document.querySelectorAll("[data-qc1511='group'] .qc1511-gh").length,
      }));
      L.check("filtered: only Offers, Materials requested and Nudge due", f.groups.length > 0 && f.groups.every((k) => ["offer", "materials", "nudge"].includes(k ?? "")), JSON.stringify(f.groups));
      L.check("filtered: as many rows as the count said", f.rows === all.tab, `${f.rows} vs ${all.tab}`);
      L.check("filtered: the group headers still show", f.heads === f.groups.length && f.heads >= 3, JSON.stringify(f));
      L.done(5);
    });
  });
}
