/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list header v2 (design-refs/contact-list-header-v2.html) — the CLH2 locks on the rendered page over the
 * emulator's harness account. Every reading is a bounding box, a computed style, a row count or `document.activeElement`.
 *
 *   CLH2-4  "{nq} not yet queried": nq read from the subheader (and proved non-zero), clicked, and the list then renders
 *           exactly nq rows
 *   CLH2-5  the populated header: one button in its action row; neither "need you" nor "Discover agents" inside it
 *
 * The unit halves are CLH2-1 (src/lib/contactPrinciples.test.ts) and CLH2-2/3 (contactHeader27.test.tsx).
 *
 * ⚠️ EVERY READ STARTS FROM THE VISIBLE COPY (every workspace page stays mounted) — `.aglist` is the Contact list's.
 * ⚠️ `CLH2_MUTATE=<lock>[,<lock>…]` applies each named break; a lock that stays green under its own break is unproved.
 */
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openApp } from "./pageHeaderV2Lib";

const DIR = "reports/contact-list-header-v2";
const MUTS = (process.env.CLH2_MUTATE ?? "").split(",").map((x) => x.trim()).filter(Boolean);
const VP = { width: 1512, height: 982 };

class Ledger {
  rows: { where: string; ok: boolean; detail: string }[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${MUTS.includes(this.name) ? "mut-" : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${this.name} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}

async function mut(page: Page, lock: string) {
  if (!MUTS.includes(lock)) return;
  switch (lock) {
    /* the click is swallowed (the filter never applies): the list keeps every row */
    case "CLH2-4": await page.evaluate(() => {
      document.addEventListener("click", (e) => {
        if (!(e.target as HTMLElement).closest("[data-clh2='notq']")) return;
        e.stopImmediatePropagation(); e.preventDefault();
      }, true);
    }); break;
    case "CLH2-5": await page.evaluate(() => {
      const acts = [...document.querySelectorAll<HTMLElement>(".aglist [data-cl27='header'] .qc1531-acts")].find((e) => e.offsetHeight);
      const b = document.createElement("button"); b.type = "button"; b.textContent = "Discover agents"; acts?.appendChild(b);
    }); break;
  }
}

/** the Contact list, the page guide out of the way, no filters remembered */
async function openCl(page: Page, vp = VP) {
  await page.setViewportSize(vp);
  await page.addInitScript(() => {
    try {
      for (const k of ["contacts", "queries", "manuscripts", "agents"]) localStorage.setItem(`sa.guide.${k}`, "1");
      for (const k of ["sa.contactList.v3", "sa.contactList.v4", "sa.contactList.v5", "sa.contactBook.sel"]) sessionStorage.removeItem(k);
      localStorage.setItem("qh.cl.view", JSON.stringify({ v: 1, group: "none", sort: "surname", reversed: false, pinned: false, view: "list", group26: "letter" }));
    } catch { /* private mode */ }
  });
  await openApp(page, "/agents", vp);
  await page.locator(".aglist [data-cl26='row']").first().waitFor({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  await page.mouse.move(3, 3);
}
const visibleRows = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".aglist [data-cl26='row']")].filter((e) => e.offsetHeight > 0).length);

/* ═════════ CLH2-4 · the subheader applies the not-queried filter, and the list shows exactly nq ═════════ */
test("CLH2-4 · '{nq} not yet queried' → the list renders exactly nq rows", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("CLH2-4");
  await openCl(page);
  await mut(page, "CLH2-4");
  const before = await visibleRows(page);
  const sub = await page.locator(".aglist [data-cl27='header'] [data-clh2='notq']:visible").first().textContent({ timeout: 10_000 }).catch(() => null);
  const m = /^(\d+) not yet queried$/.exec((sub ?? "").trim());
  const nq = m ? Number(m[1]) : NaN;
  L.check("the subheader reads '{nq} not yet queried'", !!m, String(sub));
  L.check("the population is non-zero (nq > 0, and fewer than every row)", nq > 0 && nq < before, `nq=${nq}, rows before=${before}`);
  await page.locator(".aglist [data-cl27='header'] [data-clh2='notq']:visible").first().click({ timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const after = await visibleRows(page);
  L.check("after the click the list renders exactly nq rows", after === nq, `rows=${after}, nq=${nq}`);
  const notq = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".aglist [data-cl26='row']")].filter((e) => e.offsetHeight > 0 && e.dataset.k !== "none").length);
  L.check("every row shown is not yet queried", notq === 0, `${notq} queried rows shown`);
  L.done(4);
});

/* ═════════ CLH2-5 · one action, no "need you", no Discover ═════════ */
test("CLH2-5 · the populated header: one button in its action row; no 'need you', no 'Discover agents'", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("CLH2-5");
  for (const vp of [VP, { width: 1280, height: 720 }]) {
    await openCl(page, vp);
    await mut(page, "CLH2-5");
    const r = await page.evaluate(() => {
      const hd = [...document.querySelectorAll<HTMLElement>(".aglist [data-cl27='header']")].find((e) => e.offsetHeight)!;
      const acts = hd.querySelector<HTMLElement>(".qc1531-acts")!;
      const bs = [...acts.querySelectorAll<HTMLElement>("button")].filter((b) => b.offsetWidth > 0);
      const main = hd.querySelector<HTMLElement>("[data-cl27='main']")!;
      return { n: bs.length, labels: bs.map((b) => b.textContent?.trim()), text: (main.innerText ?? "").replace(/\s+/g, " ") };
    });
    L.check(`${vp.width} one button, + Add an agent`, r.n === 1 && r.labels[0] === "+ Add an agent", JSON.stringify(r.labels));
    L.check(`${vp.width} no "need you"`, !/needs? you/i.test(r.text), r.text);
    L.check(`${vp.width} no "Discover agents"`, !/Discover agents/.test(r.text), r.text);
  }
  L.done(6);
});
