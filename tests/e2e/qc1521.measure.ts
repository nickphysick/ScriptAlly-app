/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v152.1 — the QC1521 locks (design-refs/query-centre-v152-1/), on the rendered page at 1280 × 800 and
 * 1512 × 900, over the q152- fixtures (tests/e2e/seedQc152.mjs, seeded and removed in the same run). Each asserts its
 * population first and was red first: against the v152 build it amends (QC1521_BASE=1) and against its named mutation
 * (QC1521_MUTATE=L<n>: a page break here, or a source break in tests/e2e/qc1521Mutate.sh).
 *
 *   §1  L1 queried
 *   §2  L2 events only · L3 colour rule · L4 waits · L5 nudge · L6 quote · L7 collapse · L9 no colour · L10 new steps
 *   §3  L8 footer
 */
import { test, expect, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

test.setTimeout(420_000);
const DIR = "reports/qc-v152-1";
const MUT = process.env.QC1521_MUTATE ?? "";
const BASE = process.env.QC1521_BASE === "1";
const ONLY = process.env.QC1521_ONLY ?? "";
const run = (id: string) => !ONLY || ONLY.split(",").includes(id);
const SIZES = [{ width: 1280, height: 800 }, { width: 1512, height: 900 }] as const;
type VP = { width: number; height: number };

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

/** the named page breaks (source breaks live in qc1521Mutate.sh) */
const PAGE_MUT: Record<string, string> = {
  /* (L1's mutation is a source break: #e6d9c6 put back in STATUS_FILL — qc1521Mutate.sh) */
};

test.beforeAll(() => { execSync("node tests/e2e/seedQc152.mjs", { encoding: "utf8", stdio: "pipe" }); });
test.afterAll(() => { execSync("node tests/e2e/seedQc152.mjs --clean", { encoding: "utf8", stdio: "pipe" }); });

async function open(page: Page, vp: VP, o: { group?: string } = {}) {
  await page.addInitScript((g) => {
    try {
      sessionStorage.removeItem("qh.qc.filters");
      sessionStorage.removeItem("qh.qc.collapsed1511");
      sessionStorage.setItem("qh.qc.view150", "list");
      localStorage.setItem("qh.qc.view", JSON.stringify({ v: 1, group: g, sort: { key: "due", reversed: false }, density: "comfortable" }));
      localStorage.setItem("sa.guide.queries", "1");
      localStorage.setItem("sa.guide.queries-explainer", "1");
      localStorage.removeItem("sa.pinList.queries");
    } catch { /* private mode */ }
  }, o.group ?? "attention");
  await openRoute(page, "/queries", vp);
  await page.locator("[data-qc151='row'][data-id^='q152-']").first().waitFor({ timeout: 30_000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
  await page.mouse.move(5, 5);
  if (PAGE_MUT[MUT]) await page.addStyleTag({ content: PAGE_MUT[MUT] });
}
const click = (page: Page, sel: string) => page.locator(sel).first().click({ timeout: 8000 }).catch(() => {});

/** open a fixture's card by its row, and wait for the panel to settle */
async function openCard(page: Page, key: string) {
  await page.evaluate((id) => {
    const r = document.querySelector<HTMLElement>(`[data-qc151='row'][data-id='${id}']`);
    r?.scrollIntoView({ block: "center" });
    (r?.querySelector<HTMLElement>("[data-qcv='row-first'], td") ?? r)?.click();
  }, `q152-${key}`);
  await page.locator(`[data-qp='panel'] [data-qc152='card'][data-id='q152-${key}']`).waitFor({ timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(900);
}
const CARD = "[data-qp='panel'] [data-qc152='card']";
const OLD_SAND = "rgb(230, 217, 198)";

for (const vp of SIZES) {
  test.describe(`QC1521 §1 @ ${vp.width}`, () => {
    test("L1 · queried: Queried caps #f2ebe0, its status header #f4eee5, its Birds-eye bars #f2ebe0 / #f7f2ea, and #e6d9c6 nowhere", async ({ page }) => {
      test.skip(!run("L1"));
      const L = new Ledger(`L1-${vp.width}`);
      /* the old colour, anywhere on the page: every element's own colours (backgrounds, text, borders, shadows) */
      const sweep = () => page.evaluate((old) => {
        const hits: string[] = [];
        let n = 0;
        for (const el of document.querySelectorAll<HTMLElement>("body *")) {
          const s = getComputedStyle(el); n++;
          const all = [s.backgroundColor, s.backgroundImage, s.color, s.borderTopColor, s.borderBottomColor, s.borderLeftColor, s.borderRightColor, s.boxShadow, s.outlineColor].join(" ");
          if (all.includes(old)) hits.push(`${el.tagName.toLowerCase()}.${(el.className && typeof el.className === "string" ? el.className : "").split(" ")[0]}`);
        }
        return { n, hits };
      }, OLD_SAND);

      /* the list, grouped by who it's with: the row caps */
      await open(page, vp);
      const caps = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-qc151='row']")]
        .filter((r) => r.querySelector("[data-qc1512='cap']") && /Queried/.test(r.querySelector("[data-qc1512='cap']")!.parentElement?.textContent ?? ""))
        .map((r) => getComputedStyle(r.querySelector<HTMLElement>("[data-qc1512='cap']")!).backgroundColor));
      L.check("population: Queried rows with a cap", caps.length >= 4, `${caps.length}`);
      L.check("every Queried row's cap is #f2ebe0", caps.length > 0 && caps.every((c) => c === "rgb(242, 235, 224)"), JSON.stringify([...new Set(caps)]));
      const s1 = await sweep();
      L.check("population: the list page swept", s1.n > 300, `${s1.n}`);
      L.check("no element on the list computes to #e6d9c6", s1.hits.length === 0, JSON.stringify(s1.hits.slice(0, 6)));

      /* the card's pill */
      await openCard(page, "agent");
      const pill = await page.evaluate((c) => { const e = document.querySelector<HTMLElement>(`${c} [data-qc152='pill'] .qc152-cap`); return e ? getComputedStyle(e).backgroundColor : ""; }, CARD);
      L.check("a Queried card's pill cap is #f2ebe0", pill === "rgb(242, 235, 224)", pill);
      const s2 = await sweep();
      L.check("no element with the card open computes to #e6d9c6", s2.hits.length === 0, JSON.stringify(s2.hits.slice(0, 6)));
      await page.keyboard.press("Escape"); await page.waitForTimeout(400);

      /* grouped by status: Queried's header */
      await open(page, vp, { group: "status" });
      const head = await page.evaluate(() => {
        const g = document.querySelector<HTMLElement>("[data-qc1511='group'][data-k='Queried']");
        const td = g?.querySelector<HTMLElement>("[data-qc1511='group-header'] td");
        return td ? getComputedStyle(td).backgroundColor : "";
      });
      L.check("the Queried status group's header is #f4eee5", head === "rgb(244, 238, 229)", head);
      const s3 = await sweep();
      L.check("no element grouped by status computes to #e6d9c6", s3.hits.length === 0, JSON.stringify(s3.hits.slice(0, 6)));

      /* Birds-eye: Queried's current bars */
      await open(page, vp);
      const queried = new Set(await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-qc151='row']")]
        .filter((r) => /Queried/.test(r.querySelector("[data-qc1512='cap']")?.parentElement?.textContent ?? "")).map((r) => r.dataset.id ?? "")));
      await click(page, "[data-qc151='switch'] [data-v='birds']"); await page.waitForTimeout(1500);
      const bars = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-qc150='be-row']")].map((row) => ({
        id: row.dataset.id ?? "", when: row.dataset.when ?? "",
        cur: [...row.querySelectorAll<HTMLElement>("[data-qc150='be-bar']")].map((e) => getComputedStyle(e).backgroundColor)[0] ?? "",
      })));
      const qb = bars.filter((b) => queried.has(b.id) && b.cur);
      L.check("population: Queried bars, watching and not", qb.some((b) => b.when === "watch") && qb.some((b) => b.when !== "watch"), JSON.stringify(qb.map((b) => b.when)));
      L.check("Queried bars are #f2ebe0", qb.filter((b) => b.when !== "watch").every((b) => b.cur === "rgb(242, 235, 224)"), JSON.stringify([...new Set(qb.filter((b) => b.when !== "watch").map((b) => b.cur))]));
      L.check("watch-and-wait Queried bars are #f7f2ea", qb.filter((b) => b.when === "watch").every((b) => b.cur === "rgb(247, 242, 234)"), JSON.stringify([...new Set(qb.filter((b) => b.when === "watch").map((b) => b.cur))]));
      const s4 = await sweep();
      L.check("no element on Birds-eye computes to #e6d9c6", s4.hits.length === 0, JSON.stringify(s4.hits.slice(0, 6)));
      L.done(12);
    });
  });
}
