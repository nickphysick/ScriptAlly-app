/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * VV6 — Versions v6's locks on the rendered page (design-refs/versions-v6), at 1512 × 900 and 1280 × 800, over the
 * emulator's harness account with tests/e2e/vv6Emu.mjs's three books (seeded once, before the run).
 *
 *   H1  the navy header's left / right edges, height and distance from the sheet's top equal the Query Centre's (±1)
 *   H2  past the header the slim bar is shown with the in-use name; at the top it is hidden
 *   H3  the map block opens a dialog whose tree has one node per treeModel node; picking one opens it on the page;
 *       Esc closes it and focus returns to the block; no tree outside the dialog
 *   L1  rows = live versions; the page opens on the in-use one; the selected row matches the open card
 *   L2  "Use for new queries" writes inUseBookVersionId; the tag moves; Undo restores the stored manuscript exactly
 *   O1  the cells and the four counts equal the fixture's facts; no percentage below the minimum
 *   O2  three pieces, each no taller than the one before, heights proportional to the counts (±1)
 *   O3  each row's band matches its status's stage, statuses of different stages draw differently; a row opens its card
 *   C1  each tile names the first card under its measure; clicking reorders the cards to that measure's order
 *   C2  every funnel's top on one y (±1); with Same scale the first piece's height is proportional to sent across cards
 *   C3  a version under the minimum shows minimum − sent dashed squares and no rank; fewer than two ranked → the panel
 *   S1  header→band and band→notice 16 (±1); the gap before the comparison ≥ 56
 *   X1  no horizontal overflow at either width; no card shadow clipped by a parent
 *
 * ⚠️ EXPECTED VALUES COME FROM THE FIXTURE'S OWN ARITHMETIC (`vv6Emu.mjs facts`), never from lib/versionsV2, and every
 *    population is asserted non-zero before anything is asserted over it.
 * ⚠️ `VV6_MUTATE=<lock>[,<lock>…]` (or ALL) applies those locks' named breaks IN THE PAGE (CSS, DOM, or a blocked write channel) after it
 *    renders; nothing in src/ changes, so there is nothing to undo but the env var. A lock green under its break is
 *    unproved. `VV6_SHOTS=1` writes the report's screenshots.
 * ⚠️ EMULATOR ONLY: `npm run e2e:emu -- tests/e2e/versionsV6.measure.ts`. The run imports the committed snapshot and
 *    exports nothing, so the seed and every write die with the run.
 */
import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

/* serial for the green run; under mutation every test runs even when an earlier one is red */
test.describe.configure({ mode: process.env.VV6_MUTATE ? "default" : "serial" });
test.setTimeout(240_000);
const DIR = "reports/versions-v6";
const MUT = process.env.VV6_MUTATE ?? "";
/** `VV6_MUTATE=H1,H2,…` (or ALL) applies those locks' breaks in one run: each touches only its own lock's subject */
const LOCKS = ["H1", "H2", "H3", "L1", "L2", "O1", "O2", "O3", "C1", "C2", "C3", "S1", "X1"];
const MUTS = new Set(MUT === "ALL" ? LOCKS : MUT.split(",").filter(Boolean));
const M = (k: string) => MUTS.has(k);
const SHOTS = process.env.VV6_SHOTS === "1";
const VPS = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }];
const MIN = 5; // MIN_SENT_FOR_RATE, restated here ON PURPOSE: the lock must not read the number it checks
const emu = (...a: string[]): string => execFileSync("node", ["tests/e2e/vv6Emu.mjs", ...a], { encoding: "utf8" }).trim().split("\n").pop()!;
type FV = { id: string; num: number; name: string; original: boolean; archived: boolean; parentId: string | null; sent: number; replied: number; more: number; full: number };
type Facts = Record<string, { inUse: string | null; unrecorded: number; versions: FV[] }>;
let F: Facts;

class Ledger {
  rows: { where: string; ok: boolean; detail: string }[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${MUT ? `mut-${MUT}-` : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok)) console.log(`  ✗ ${this.name} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}${MUT ? ` under ${MUT}` : ""}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    /* soft: a test holding several locks reads every one of them even after one is red; the test still fails */
    expect.soft(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect.soft(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`), `${this.name} is red`).toEqual([]);
  }
}

const css = (page: Page, rule: string) => page.addStyleTag({ content: rule });
const ROOT = '[data-vv2="page"]';
const vis = (s: string) => `${ROOT}:visible ${s}`;

async function openBook(page: Page, book: string, vp: { width: number; height: number }) {
  await openRoute(page, "/manuscripts/versions", vp);
  await page.evaluate((id) => localStorage.setItem("scriptally_active_manuscript_id", id), book);
  await page.goto("/manuscripts/versions");
  await page.locator(`${ROOT}:visible:not([data-state="loading"])`).first().waitFor({ timeout: 60_000 });
  /* the facts land after the page: wait for the rows' figures to say what the fixture holds */
  if (F[book].versions.length) await expect(page.locator(vis('[data-vv6="row"]'))).toHaveCount(F[book].versions.filter((v) => !v.archived).length, { timeout: 30_000 });
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForTimeout(800);
}
const scroller = (page: Page, y: number) => page.evaluate((v) => {
  const sc = [...document.querySelectorAll<HTMLElement>(".wpg-scroll")].find((e) => e.offsetHeight > 0 && e.querySelector('[data-vv2="page"]'));
  if (sc) sc.scrollTop = v;
}, y).then(() => page.waitForTimeout(700));
const shot = async (page: Page, name: string, full = true) => { if (SHOTS && !MUT) { mkdirSync(`${DIR}/shots`, { recursive: true }); await page.screenshot({ path: `${DIR}/shots/${name}.png`, fullPage: full }); } };
/** the whole page's height, so a full-page shot can show it (the page scrolls inside .wpg-scroll, not the document) */
async function tall(page: Page, vp: { width: number; height: number }) {
  const h = await page.evaluate(() => { const sc = [...document.querySelectorAll<HTMLElement>(".wpg-scroll")].find((e) => e.offsetHeight > 0); return sc ? sc.scrollHeight + sc.getBoundingClientRect().top + 40 : 0; });
  await page.setViewportSize({ width: vp.width, height: Math.max(vp.height, Math.ceil(h)) });
  await page.waitForTimeout(600);
}

test.beforeAll(() => {
  console.log(emu("seed"));
  console.log(emu("founding", "on"));
  F = JSON.parse(emu("facts"));
  expect(F["vv6-ms"].versions.length, "fixture: the everyday book has versions").toBeGreaterThan(3);
});

for (const vp of VPS) {
  test.describe(`VV6 @ ${vp.width}`, () => {
    test("H1 header geometry = the Query Centre's · H2 slim bar · S1 spacing · X1 overflow", async ({ page }) => {
      const read = (root: string) => page.evaluate((rs) => {
        const r = [...document.querySelectorAll<HTMLElement>(rs)].find((e) => e.getBoundingClientRect().width > 0);
        const hd = r?.querySelector<HTMLElement>("header.qc1531-hd");
        const sc = r?.closest<HTMLElement>(".wpg-scroll");
        if (!hd || !sc) return null;
        const b = hd.getBoundingClientRect(), s = sc.getBoundingClientRect();
        return { left: b.left, right: b.right, height: b.height, top: b.top - s.top };
      }, root);
      await openRoute(page, "/queries", vp);
      await page.locator("[data-qc151='page']:visible header.qc1531-hd").first().waitFor({ timeout: 60_000 });
      await page.evaluate(async () => { await document.fonts.ready; }); await page.waitForTimeout(800);
      const qc = await read("[data-qc151='page']");
      await openBook(page, "vv6-ms", vp);
      if (M("H1")) await css(page, ".vv6 .qc151.qc153.wsnh > .qc1531-hd.wsnh-hd.wsnh-hd.wsnh-hd { margin-top: 50px !important; }");
      if (M("H2")) await css(page, ".vv6 .qc156-slim { display: none !important; }");
      if (M("S1")) await css(page, ".vv6 .qc151.qc153.wsnh > .qc1531-hd.wsnh-hd.wsnh-hd.wsnh-hd { margin-bottom: 40px !important; } .vv6 .v6-top.v6-top { gap: 40px !important; } .vv6 .v6-res.v6-res { margin-top: 40px !important; }");
      if (M("X1")) await css(page, ".vv6 .v6-card.v6-card { width: 300px !important; min-width: 300px !important; } .vv6 .v6-open.v6-open { width: 1400px !important; }");
      await page.waitForTimeout(400);
      const vv = await read(ROOT);

      const H1 = new Ledger(`H1-${vp.width}`);
      H1.check("both headers found", qc && vv, JSON.stringify({ qc, vv }));
      if (qc && vv) for (const k of ["left", "right", "height", "top"] as const) H1.check(k, Math.abs(qc[k] - vv[k]) <= 1, `QC ${qc[k].toFixed(1)} · Versions ${vv[k].toFixed(1)}`);
      H1.done(5);

      const H2 = new Ledger(`H2-${vp.width}`);
      const slim = () => page.evaluate((rs) => {
        const r = [...document.querySelectorAll<HTMLElement>(rs)].find((e) => e.getBoundingClientRect().width > 0)!;
        const s = r.querySelector<HTMLElement>(".qc156-slim");
        if (!s) return { found: false, shown: false, text: "" };
        const b = s.getBoundingClientRect(), cs = getComputedStyle(s);
        return { found: true, shown: s.hasAttribute("data-shown") && b.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && parseFloat(cs.opacity) > 0.5, text: s.innerText.replace(/\s+/g, " ") };
      }, ROOT);
      const inUse = F["vv6-ms"].versions.find((v) => v.id === F["vv6-ms"].inUse)!;
      const top = await slim();
      H2.check("at the top: hidden", top.found && !top.shown, JSON.stringify(top));
      await scroller(page, 700);
      const down = await slim();
      H2.check("past the header: shown", down.shown, JSON.stringify(down));
      H2.check("names the version in use", down.text.includes(inUse.name) && /In use/.test(down.text), down.text);
      await scroller(page, 0);
      H2.done(3);

      const S1 = new Ledger(`S1-${vp.width}`);
      const gaps = await page.evaluate((rs) => {
        const r = [...document.querySelectorAll<HTMLElement>(rs)].find((e) => e.getBoundingClientRect().width > 0)!;
        const b = (s: string) => r.querySelector<HTMLElement>(s)?.getBoundingClientRect() ?? null;
        const hd = b("header.qc1531-hd"), fb = b('[data-vv6="founding"]'), no = b('[data-vv6="notice"]'), dk = b('[data-vv6="desk"]'), cmp = b('[data-vv6="compare"]');
        return { hdFb: hd && fb ? fb.top - hd.bottom : null, fbNo: fb && no ? no.top - fb.bottom : null, noDesk: no && dk ? dk.top - no.bottom : null, deskCmp: dk && cmp ? cmp.top - dk.bottom : null };
      }, ROOT);
      S1.check("all four present", Object.values(gaps).every((x) => x != null), JSON.stringify(gaps));
      S1.check("header → founding band 16", gaps.hdFb != null && Math.abs(gaps.hdFb - 16) <= 1, String(gaps.hdFb));
      S1.check("band → notice 16", gaps.fbNo != null && Math.abs(gaps.fbNo - 16) <= 1, String(gaps.fbNo));
      S1.check("notice → desk 40–56", gaps.noDesk != null && gaps.noDesk >= 39 && gaps.noDesk <= 57, String(gaps.noDesk));
      S1.check("desk → comparison ≥ 56", gaps.deskCmp != null && gaps.deskCmp >= 56, String(gaps.deskCmp));
      S1.done(5);

      const X1 = new Ledger(`X1-${vp.width}`);
      const ov = await page.evaluate((rs) => {
        const r = [...document.querySelectorAll<HTMLElement>(rs)].find((e) => e.getBoundingClientRect().width > 0)!;
        const sc = r.closest<HTMLElement>(".wpg-scroll")!;
        const cards = [...r.querySelectorAll<HTMLElement>(".v6-card, .v6-fb")];
        /* a card's shadow is clipped when a parent between it and the scroller clips overflow and the card touches its
           edge (8px, the shadow's reach) — the fcards strip scrolls sideways on purpose and pads for its cards */
        const clipped = cards.flatMap((c) => {
          const cb = c.getBoundingClientRect();
          for (let p = c.parentElement; p && p !== sc; p = p.parentElement) {
            const cs = getComputedStyle(p);
            if (cs.overflowX !== "visible" || cs.overflowY !== "visible") {
              const pb = p.getBoundingClientRect();
              if (cb.left - pb.left < 7 || pb.right - cb.right < 7) return [`${c.dataset.vv6 ?? c.className} in ${p.className}`];
            }
          }
          return [];
        });
        return { sw: sc.scrollWidth, cw: sc.clientWidth, doc: document.documentElement.scrollWidth - document.documentElement.clientWidth, cards: cards.length, clipped,
          wide: cards.filter((c) => c.getBoundingClientRect().right > sc.getBoundingClientRect().right + 1).map((c) => c.dataset.vv6 ?? c.className) };
      }, ROOT);
      X1.check("cards found", ov.cards >= 5, String(ov.cards));
      X1.check("no horizontal overflow in the scroller", ov.sw <= ov.cw + 1, `${ov.sw} vs ${ov.cw}`);
      X1.check("none in the document", ov.doc <= 1, String(ov.doc));
      X1.check("no card past the scroller's right edge", ov.wide.length === 0, ov.wide.join(", "));
      X1.check("no card shadow clipped", ov.clipped.length === 0, ov.clipped.join("; "));
      X1.done(5);
      await shot(page, `everyday-${vp.width}`, false);
      if (SHOTS && !MUT) { await tall(page, vp); await shot(page, `everyday-full-${vp.width}`); await page.setViewportSize(vp); }
    });

    test("H3 the version map dialog", async ({ page }) => {
      await openBook(page, "vv6-ms", vp);
      if (M("H3")) {
        await page.locator(vis('[data-vv6="map-open"]')).click(); await page.waitForTimeout(600);
        await page.evaluate(() => { const t = document.querySelector('[data-vv2="map"] [data-vv2="tree"]'); const d = document.querySelector('[data-vv2="page"] [data-vv6="desk"]'); if (t && d) d.after(t.cloneNode(true)); });
        await page.keyboard.press("Escape"); await page.waitForTimeout(400);
      }
      const H3 = new Ledger(`H3-${vp.width}`);
      const b = F["vv6-ms"];
      const byId = new Map(b.versions.map((v) => [v.id, v]));
      const keep = new Set<string>();
      for (const v of b.versions.filter((x) => !x.archived)) for (let p = v.parentId ? byId.get(v.parentId) : undefined; p; p = p.parentId ? byId.get(p.parentId) : undefined) keep.add(p.id);
      const expected = b.versions.filter((v) => !v.archived || keep.has(v.id)).length;
      H3.check("population", expected >= 2, String(expected));
      H3.check("no tree on the page", await page.locator(vis('[data-vv2="tree-node"]')).count() === 0, String(await page.locator(vis('[data-vv2="tree-node"]')).count()));
      const opener = page.locator(vis('[data-vv6="map-open"]'));
      await opener.click();
      const dlg = page.locator('[role="dialog"][data-vv2="map"]');
      await dlg.waitFor({ state: "visible", timeout: 10_000 }); await page.waitForTimeout(500);
      H3.check("dialog is titled", (await dlg.getAttribute("aria-labelledby")) === "msTH" && (await page.locator("#msTH").innerText()).includes("How your versions connect"), "");
      const nodes = await dlg.locator('[data-vv2="tree-node"]').count();
      H3.check("one node per treeModel node", nodes === expected, `${nodes} vs ${expected}`);
      if (SHOTS && !MUT) await shot(page, `map-${vp.width}`, false);
      const pick = b.versions.find((v) => !v.original && v.id !== b.inUse && !v.archived)!;
      await dlg.locator(`#tn-${pick.id}`).click(); await page.waitForTimeout(700);
      H3.check("picking closes the dialog", !(await dlg.isVisible()), "");
      H3.check("…and opens that version", (await page.locator(vis('[data-vv6="open-name"]')).innerText()) === pick.name, await page.locator(vis('[data-vv6="open-name"]')).innerText());
      await opener.click(); await dlg.waitFor({ state: "visible" }); await page.waitForTimeout(400);
      await page.keyboard.press("Escape"); await page.waitForTimeout(500);
      H3.check("Esc closes", !(await dlg.isVisible()), "");
      H3.check("focus returns to the block", await page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.vv6 === "map-open"), await page.evaluate(() => (document.activeElement as HTMLElement | null)?.outerHTML.slice(0, 80) ?? "none"));
      await opener.click(); await dlg.waitFor({ state: "visible" }); await page.waitForTimeout(300);
      await page.mouse.click(8, vp.height - 8); await page.waitForTimeout(500);
      H3.check("an outside press closes", !(await dlg.isVisible()), "");
      H3.done(9);
    });

    test("L1 the list · O1 the figures · O2 the funnel · O3 the queries", async ({ page }) => {
      const b = F["vv6-ms"];
      await openBook(page, "vv6-ms", vp);
      if (M("L1")) { await page.locator(vis('[data-vv6="row"]')).first().click(); await page.waitForTimeout(500); }
      const L1 = new Ledger(`L1-${vp.width}`);
      const live = b.versions.filter((v) => !v.archived);
      const rows = await page.locator(vis('[data-vv6="row"]')).evaluateAll((es) => es.map((e) => ({ id: e.getAttribute("data-id"), cur: e.getAttribute("aria-current") })));
      L1.check("population", live.length >= 3, String(live.length));
      L1.check("one row per live version", rows.length === live.length && live.every((v) => rows.some((r) => r.id === v.id)), JSON.stringify(rows.map((r) => r.id)));
      const cur = rows.filter((r) => r.cur === "true");
      L1.check("one selected row, the version in use", cur.length === 1 && cur[0].id === b.inUse, JSON.stringify(cur));
      const inUse = b.versions.find((v) => v.id === b.inUse)!;
      L1.check("the open card is the selected row's", (await page.locator(vis('[data-vv6="open-name"]')).innerText()) === inUse.name, await page.locator(vis('[data-vv6="open-name"]')).innerText());

      /* O1 + O2 over every sent version, then the early book's 3-sent version */
      const O1 = new Ledger(`O1-${vp.width}`), O2 = new Ledger(`O2-${vp.width}`);
      const sent = live.filter((v) => v.sent > 0);
      O1.check("population: sent versions", sent.length >= 3, String(sent.length));
      const readOpen = () => page.evaluate((rs) => {
        const r = [...document.querySelectorAll<HTMLElement>(rs)].find((e) => e.getBoundingClientRect().width > 0)!;
        const t = (s: string) => r.querySelector<HTMLElement>(s)?.innerText.trim() ?? null;
        const svg = r.querySelector<SVGSVGElement>('[data-vv6="open-funnel"]');
        const box = svg?.getBoundingClientRect();
        return { sent: t('[data-vv6="cell-sent"]'), replied: t('[data-vv6="cell-replied"]'), more: t('[data-vv6="cell-more"]'),
          counts: [...r.querySelectorAll<HTMLElement>('[data-vv6="fun-counts"] > div > b')].map((e) => e.innerText.trim()),
          pct: [...r.querySelectorAll<HTMLElement>('[data-vv6="fun-counts"] em')].map((e) => e.innerText.trim()),
          svgH: box?.height ?? 0, pieces: [...(svg?.querySelectorAll<SVGPathElement>("[data-piece]") ?? [])].map((p) => p.getBoundingClientRect().height) };
      }, ROOT);
      const checkOne = async (v: FV, tag: string) => {
        if (M("O1") && v.sent < MIN) await page.evaluate(() => { const c = document.querySelector<HTMLElement>('[data-vv2="page"] [data-vv6="cell-more"]'); if (c) c.textContent = "33%"; });
        if (M("O2")) await page.evaluate(() => { for (const p of document.querySelectorAll<SVGPathElement>('[data-vv6="open-funnel"] [data-piece]')) { const i = +p.dataset.piece!; p.setAttribute("d", `M${i * 133.3} 0H${(i + 1) * 133.3}V120H${i * 133.3}Z`); } });
        const o = await readOpen();
        const pct = v.sent >= MIN ? `${Math.round((v.more / v.sent) * 100)}%` : String(v.more);
        O1.check(`${tag} sent`, o.sent === String(v.sent), `${o.sent} vs ${v.sent}`);
        O1.check(`${tag} replied`, o.replied === String(v.replied), `${o.replied} vs ${v.replied}`);
        O1.check(`${tag} asked for more`, o.more === pct, `${o.more} vs ${pct}`);
        if (v.sent < MIN) O1.check(`${tag} no % below the minimum`, !/%/.test(o.more ?? ""), String(o.more));
        O1.check(`${tag} four counts`, JSON.stringify(o.counts) === JSON.stringify([v.sent, v.replied, v.more, v.full].map(String)), `${o.counts} vs ${[v.sent, v.replied, v.more, v.full]}`);
        O1.check(`${tag} of sent`, JSON.stringify(o.pct.slice(1)) === JSON.stringify([v.replied, v.more, v.full].map((n) => `${Math.round((n / v.sent) * 100)}% of sent`)), o.pct.join(" | "));
        const k = o.svgH / 120;
        const exp = [v.sent, v.replied, v.more, v.full].map((n) => Math.max(4, (n / v.sent) * 114) * k);
        O2.check(`${tag} three pieces`, o.pieces.length === 3, String(o.pieces.length));
        for (let i = 0; i < 3; i++) {
          O2.check(`${tag} piece ${i} ∝ count`, Math.abs(o.pieces[i] - exp[i]) <= 1, `${o.pieces[i]?.toFixed(1)} vs ${exp[i].toFixed(1)}`);
          if (i) O2.check(`${tag} piece ${i} ≤ piece ${i - 1}`, o.pieces[i] <= o.pieces[i - 1] + 0.5, `${o.pieces[i]?.toFixed(1)} / ${o.pieces[i - 1]?.toFixed(1)}`);
        }
      };
      for (const v of sent) {
        await page.locator(vis(`[data-vv6="row"][data-id="${v.id}"]`)).click(); await page.waitForTimeout(400);
        await checkOne(v, v.name);
      }

      /* O3 on the version with the most queries */
      const O3 = new Ledger(`O3-${vp.width}`);
      const big = [...sent].sort((a, c) => c.sent - a.sent)[0];
      await page.locator(vis(`[data-vv6="row"][data-id="${big.id}"]`)).click(); await page.waitForTimeout(400);
      const seeAll = page.locator(vis('[data-vv6="see-all"]'));
      if (await seeAll.count()) await seeAll.click();
      await page.waitForTimeout(300);
      if (M("O3")) await page.evaluate(() => { const qs = [...document.querySelectorAll<HTMLElement>('[data-vv2="page"] [data-vv6="qi"]')]; const h = qs[0]?.innerHTML ?? ""; for (const q of qs) { q.innerHTML = h; q.className = qs[0].className; } });
      const qrows = await page.locator(vis('[data-vv6="qrow"]')).evaluateAll((es) => es.map((e) => ({ id: e.getAttribute("data-id")!, status: e.getAttribute("data-status")!, cls: e.querySelector('[data-vv6="qi"]')!.className, svg: e.querySelector('[data-vv6="qi"] svg')?.outerHTML ?? "" })));
      const BAND: Record<string, string> = { "Queried": "queried", "Partial Requested": "partial", "Partial Sent": "partial", "Full Requested": "full", "Full Sent": "full", "Revise & Resubmit": "full", "Resubmitted": "full", "Offer": "full", "Signed": "full", "Rejected": "closed", "Withdrawn": "closed", "No Response": "closed" };
      O3.check("population: rows", qrows.length === big.sent, `${qrows.length} vs ${big.sent}`);
      const bands = new Set(qrows.map((r) => BAND[r.status]));
      O3.check("population: three stages or more", bands.size >= 3, [...bands].join(","));
      for (const r of qrows) O3.check(`${r.id} band`, r.cls.includes(`v6-qi--${BAND[r.status]}`), `${r.status} → ${r.cls}`);
      const byStatus = new Map<string, string>(); for (const r of qrows) if (!byStatus.has(r.status)) byStatus.set(r.status, r.svg);
      const drawings = [...byStatus.entries()];
      O3.check("different stages draw differently", drawings.every(([s, h], i) => drawings.every(([t, g], j) => i === j || BAND[s] === BAND[t] || h !== g)), drawings.map(([s]) => s).join(","));
      O3.check("one status, one drawing", qrows.every((r) => r.svg === byStatus.get(r.status)), "");
      if (SHOTS && !MUT) { await page.locator(vis('[data-vv6="queries"]')).scrollIntoViewIfNeeded(); }
      await page.locator(vis(`[data-vv6="qrow"][data-id="${qrows[0].id}"]`)).click();
      const panel = page.locator(`[data-qp="panel"][data-qp-id="${qrows[0].id}"]`);
      const opened = await panel.first().waitFor({ state: "visible", timeout: 15_000 }).then(() => true).catch(() => false);
      O3.check("a row opens its query's card", opened, qrows[0].id);
      await page.keyboard.press("Escape"); await page.waitForTimeout(500);

      /* the early book: a 3-sent version, so the minimum is exercised */
      const e = F["vv6-early"];
      const early = e.versions.find((v) => v.sent > 0 && v.sent < MIN)!;
      O1.check("population: a version under the minimum", !!early, "");
      await openBook(page, "vv6-early", vp);
      await page.locator(vis(`[data-vv6="row"][data-id="${early.id}"]`)).click(); await page.waitForTimeout(400);
      await checkOne(early, `early ${early.name}`);
      O1.check("the wait line counts down", (await page.locator(vis('[data-vv6="wait"]')).innerText()).includes(`after ${MIN - early.sent} more`), await page.locator(vis('[data-vv6="wait"]')).innerText());
      if (SHOTS && !MUT) { await tall(page, vp); await shot(page, `just-started-${vp.width}`); await page.setViewportSize(vp); }
      L1.done(4); O1.done(sent.length * 5 + 6); O2.done(sent.length * 6); O3.done(qrows.length + 4);
    });

    test("C1 tiles · C2 card heads and scale · C3 unranked", async ({ page }) => {
      const b = F["vv6-ms"];
      await openBook(page, "vv6-ms", vp);
      await page.locator(vis('[data-vv6="compare"]')).scrollIntoViewIfNeeded(); await page.waitForTimeout(500);
      const live = b.versions.filter((v) => !v.archived);
      const ranked = live.filter((v) => v.sent >= MIN), unranked = live.filter((v) => v.sent < MIN);
      /* the fixture's own orders: leagueOrder's rule restated — sent first, rate / sent desc, avg asc; ties rate then num */
      const rate = (v: FV) => Math.round((v.more / v.sent) * 100);
      const order = (k: "rate" | "sent") => [...ranked].sort((a, c) => (k === "rate" ? rate(c) - rate(a) : c.sent - a.sent) || (rate(c) - rate(a)) || (c.num - a.num)).map((v) => v.id);
      const C1 = new Ledger(`C1-${vp.width}`), C2 = new Ledger(`C2-${vp.width}`), C3 = new Ledger(`C3-${vp.width}`);
      C1.check("population: two ranked or more", ranked.length >= 2, String(ranked.length));
      const cards = () => page.locator(vis('[data-vv6="fcard"]')).evaluateAll((es) => es.map((e) => ({ id: e.getAttribute("data-id")!, rank: e.getAttribute("data-rank") })));
      for (const k of ["rate", "sent"] as const) {
        await page.locator(vis(`[data-vv6="tile"][data-k="${k}"]`)).click(); await page.waitForTimeout(400);
        if (M("C1")) await page.evaluate(() => { const box = document.querySelector('[data-vv2="page"] [data-vv6="fcards"]'); if (box) { const nm = (x: Element) => x.querySelector('[data-vv6="fc-head"] b')?.textContent ?? ""; [...box.children].sort((a, c) => nm(a).localeCompare(nm(c))).forEach((x) => box.appendChild(x)); } });
        const got = (await cards()).filter((c) => c.rank).map((c) => c.id);
        C1.check(`${k}: cards in that measure's order`, JSON.stringify(got) === JSON.stringify(order(k)), `${got} vs ${order(k)}`);
        const lead = await page.locator(vis(`[data-vv6="tile"][data-k="${k}"]`)).getAttribute("data-leader");
        C1.check(`${k}: the tile names the first card`, lead === order(k)[0], `${lead} vs ${order(k)[0]}`);
        C1.check(`${k}: the chosen tile is pressed`, (await page.locator(vis(`[data-vv6="tile"][data-k="${k}"]`)).getAttribute("aria-pressed")) === "true", "");
      }
      await page.locator(vis('[data-vv6="tile"][data-k="rate"]')).click(); await page.waitForTimeout(300);
      C1.done(7);

      if (M("C2")) await css(page, ".vv6 .v6-fc-h.v6-fc-h { height: auto !important; }");
      await page.waitForTimeout(300);
      const tops = () => page.locator(vis('[data-vv6="fcard"]:not(.un) [data-vv6="fc-funnel"]')).evaluateAll((es) => es.map((e) => {
        const p = e.querySelector<SVGPathElement>('[data-piece="0"]')!.getBoundingClientRect();
        return { top: e.getBoundingClientRect().top, h0: p.height, base: +e.getAttribute("data-base")!, sent: +e.getAttribute("data-counts")!.split(",")[0] };
      }));
      const own = await tops();
      C2.check("population: funnels", own.length === ranked.length, `${own.length} vs ${ranked.length}`);
      C2.check("every funnel's top on one y", Math.max(...own.map((t) => t.top)) - Math.min(...own.map((t) => t.top)) <= 1, own.map((t) => t.top.toFixed(1)).join(","));
      C2.check("own scale: every first piece full height", Math.max(...own.map((t) => t.h0)) - Math.min(...own.map((t) => t.h0)) <= 1, own.map((t) => t.h0.toFixed(1)).join(","));
      C2.check("opens on own scale", (await page.locator(vis('[data-vv6="scale"] [data-k="own"]')).getAttribute("aria-pressed")) === "true", "");
      await page.locator(vis('[data-vv6="scale"] [data-k="same"]')).click(); await page.waitForTimeout(400);
      const same = await tops();
      const mx = Math.max(...same.map((t) => t.sent)), full = same.find((t) => t.sent === mx)!.h0;
      for (const t of same) C2.check(`same scale: ${t.sent} sent ∝`, Math.abs(t.h0 - Math.max(4 * full / 82, (t.sent / mx) * full)) <= 1, `${t.h0.toFixed(1)} vs ${((t.sent / mx) * full).toFixed(1)}`);
      if (SHOTS && !MUT) await shot(page, `compare-same-${vp.width}`, false);
      await page.locator(vis('[data-vv6="scale"] [data-k="own"]')).click(); await page.waitForTimeout(300);
      C2.done(4 + same.length);

      C3.check("population: an unranked version", unranked.length >= 1, String(unranked.length));
      if (M("C3")) await page.evaluate(() => { for (const c of document.querySelectorAll<HTMLElement>('[data-vv2="page"] [data-vv6="fcard"].un')) { c.setAttribute("data-rank", "9"); c.querySelectorAll('[data-ghost]').forEach((g) => g.remove()); } });
      for (const v of unranked) {
        const c = page.locator(vis(`[data-vv6="fcard"][data-id="${v.id}"]`));
        const ghosts = await c.locator("[data-ghost]").count();
        C3.check(`${v.name}: ${MIN - v.sent} dashed squares`, ghosts === MIN - v.sent, String(ghosts));
        C3.check(`${v.name}: no rank`, (await c.getAttribute("data-rank")) === "", String(await c.getAttribute("data-rank")));
        C3.check(`${v.name}: ranked after n more`, (await c.innerText()).includes(`Ranked after ${MIN - v.sent} more`), "");
      }
      /* fewer than two ranked: the panel (the early book has one) */
      const e = F["vv6-early"];
      C3.check("population: the early book has one ranked", e.versions.filter((v) => v.sent >= MIN).length === 1, "");
      await openBook(page, "vv6-early", vp);
      if (M("C3")) await page.evaluate(() => document.querySelector('[data-vv2="page"] [data-vv6="not-yet"]')?.remove());
      C3.check("fewer than two ranked: the not-yet panel", await page.locator(vis('[data-vv6="not-yet"]')).count() === 1, "");
      C3.check("…one progress row per version", await page.locator(vis('[data-vv6="prog"]')).count() === e.versions.filter((v) => !v.archived).length, "");
      C3.check("…and no cards", await page.locator(vis('[data-vv6="fcard"]')).count() === 0, "");
      C3.done(5 + unranked.length * 3);
    });

    test("L2 Use for new queries, then Undo, exactly", async ({ page }) => {
      const b = F["vv6-ms"];
      await openBook(page, "vv6-ms", vp);
      const before = emu("ms", "vv6-ms");
      const target = b.versions.find((v) => !v.archived && v.id !== b.inUse && !v.original)!;
      const L2 = new Ledger(`L2-${vp.width}`);
      L2.check("population: a version to switch to", !!target, "");
      if (M("L2")) await page.route(/google\.firestore\.v1\.Firestore\/Write/, (r) => r.abort());
      await page.locator(vis(`[data-vv6="row"][data-id="${target.id}"]`)).click(); await page.waitForTimeout(300);
      await page.locator(vis('[data-vv6="use"]')).click(); await page.waitForTimeout(2500);
      const stored = JSON.parse(emu("ms", "vv6-ms"));
      L2.check("stored: the target is in use", stored.inUseBookVersionId === target.id, String(stored.inUseBookVersionId));
      const tagRow = await page.locator(vis('[data-vv6="row"]')).evaluateAll((es) => es.filter((e) => e.querySelector('[data-vv6="in-use-tag"]')).map((e) => e.getAttribute("data-id")));
      L2.check("the tag moved", tagRow.length === 1 && tagRow[0] === target.id, JSON.stringify(tagRow));
      const toast = await page.locator(".sa-toast").first().innerText().catch(() => "");
      L2.check("the toast says so", toast.includes(`${target.name} is now in use for new queries.`), toast);
      if (SHOTS && !MUT) await shot(page, `in-use-stamp-${vp.width}`, false);
      const undo = page.locator(".sa-toast-undo").first();
      /* under L2's break the Undo would await a write the break blocks: the red is already read above */
      if (!M("L2") && await undo.count()) { await undo.click(); await page.waitForTimeout(2500); }
      const after = emu("ms", "vv6-ms");
      L2.check("Undo restores the stored manuscript exactly", after === before, after === before ? "equal" : `${after.slice(0, 200)} ≠ ${before.slice(0, 200)}`);
      L2.done(5);
      if (M("L2")) await page.unroute(/google\.firestore\.v1\.Firestore\/Write/);
    });

    if (vp.width === 1512) test("shots: archive confirm, new version, day one, Free", async ({ page }) => {
      test.skip(!SHOTS || !!MUT, "shots only");
      const b = F["vv6-ms"];
      await openBook(page, "vv6-ms", vp);
      const arch = b.versions.find((v) => !v.archived && v.id !== b.inUse && !v.original)!;
      await page.locator(vis(`[data-vv6="row"][data-id="${arch.id}"]`)).click(); await page.waitForTimeout(300);
      await page.locator(vis('[data-vv6="archive"]')).click(); await page.waitForTimeout(400);
      await page.locator(vis('[data-vv6="desk"]')).scrollIntoViewIfNeeded(); await shot(page, "archive-1512", false);
      await page.locator(vis('[data-vv6="arch-keep"]')).click();
      await page.locator(vis('[data-vv2="new"]')).first().click(); await page.waitForTimeout(900);
      await shot(page, "new-version-1512", false);
      await openBook(page, "vv6-fresh", vp);
      await shot(page, "day-one-1512", false);
      await page.evaluate(() => sessionStorage.setItem("sa.dev.versionsFree", "1"));
      await openBook(page, "vv6-ms", vp);
      await shot(page, "free-1512", false);
      await page.evaluate(() => sessionStorage.removeItem("sa.dev.versionsFree"));
    });
  });
}
