/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v39.1 — the locks on the rendered page. FIXTURE: seedPk40.mjs, unchanged (pk40-ms in use; every
 * document it writes, and the package L6 creates, is cleaned in afterAll by manuscript). Every population is asserted
 * non-zero before a claim about it is believed.
 *
 *   L1 Width: the explainer, the labels row, the builder, the band's contents and the results share the header card's
 *      left and right edges (±1) at 1280, 1512 and 1920, and the header card's are the Contact list card's
 *   L2 — RETIRED by v39.2 (pk392.measure.ts L2)
 *   L3 Hero: one status pill reading the right words for sent, ready and draft (the padlock on sent only); no stage
 *      dots; nothing in the open package's header overlaps at 1280; the selected label has no ring and has the bar
 *   L4 Rhythm: explainer → labels 48, BUILD label → cards 24, builder → navy band 96, top three → list panel 96 (±1),
 *      in both results rows; and the status pill's 32 at 1512 (the ref's compact rule makes it 28 at 1280)
 *   L5 Explainer: shows first; ✕ hides it and writes the store once; a reload keeps it hidden. (Its absence on the
 *      brand-new page is materialsPageSmoke.test.tsx: the harness account has materials, so that page cannot be reached
 *      here without deleting the writer's letters.)
 *   L6 Drawer: + New package opens the drawer and no centred dialog is in the DOM; a colour changes the header's
 *      computed background before anything is saved; Create adds a label of that colour and closes; "Note, copy or
 *      delete…" opens the drawer's details form
 *   L7 — RETIRED by v39.2 (pk392.measure.ts L7)
 *
 * Breaks: `PK391_MUTATE=<lock>` applies that lock's named break in the page.
 */
import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

const DIR = "reports/submission-packages-v39-1";
const MUT = process.env.PK391_MUTATE ?? "";
const SIZES = [{ width: 1280, height: 832 }, { width: 1512, height: 982 }, { width: 1920, height: 1080 }] as const;
const seed = (arg?: string) => execFileSync("node", ["tests/e2e/seedPk40.mjs", ...(arg ? [arg] : [])], { stdio: "pipe" }).toString();
const KEY = "sa.guide.packages-explainer";

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ lock: this.name, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${MUT ? `mut-${MUT}-` : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 30)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}

const MUTATIONS: Record<string, { css?: string; js?: string }> = {
  /* L1: the builder goes back to v39's fixed 48 */
  L1: { css: `.p6.p6 > .p9-pb-build { margin-left: 48px !important; margin-right: 48px !important; }` },
  /* L3: the selected label is ringed again */
  L3: { css: `.p9-pkl .p9-pkl-b.p9-on.p9-on.p9-on { box-shadow: 0 0 0 4px rgba(29,75,99,.35) !important; }` },
  /* L4: the explainer sits 20 above the labels */
  L4: { css: `.p6.p6 > .p9-tip { margin-bottom: 20px !important; }` },
  /* L5: the dismissal is forgotten on every load */
  L5: { js: `try { localStorage.removeItem("${KEY}"); } catch (e) {}` },
  /* L6: the drawer's header stops following the chosen colour */
  L6: { css: `[data-pk391="pd-head"].p8-dh.p8-dpk { background: #1d4b63 !important; }` },
};

async function open(page: Page, size: { width: number; height: number }, route = "/queries/packages") {
  await page.addInitScript(() => { try { localStorage.setItem("scriptally_active_manuscript_id", "pk40-ms"); } catch { /* */ } });
  const m = MUTATIONS[MUT];
  if (m?.js) await page.addInitScript(m.js);
  /* the break is re-applied on every load: L1, L4 and L5 reload the page */
  if (m?.css) await page.addInitScript((css) => document.addEventListener("DOMContentLoaded", () => { const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st); }), m.css);
  await openRoute(page, route, size);
  if (route === "/queries/packages") await page.locator('[data-pk39="labels"]').first().waitFor({ state: "visible", timeout: 30_000 });
  await page.waitForTimeout(1500);
}
const pg = `[data-pk26="page"]`;
const label = (page: Page, id: string) => page.locator(`${pg} [data-pk39="labels"] [data-pkid="${id}"]`).first();
const box = (page: Page, sel: string) => page.evaluate((s) => {
  const e = [...document.querySelectorAll(s)].find((x) => (x as HTMLElement).offsetParent || getComputedStyle(x).position === "fixed");
  if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, top: r.top, bottom: r.bottom, right: r.right };
}, sel);
const hexRgb = (h: string) => `rgb(${parseInt(h.slice(1, 3), 16)}, ${parseInt(h.slice(3, 5), 16)}, ${parseInt(h.slice(5, 7), 16)})`;
const near = (a: number | undefined, b: number | undefined, t: number) => a != null && b != null && Math.abs(a - b) <= t;

test.describe.configure({ mode: "default" });
test.beforeAll(() => { console.log(seed()); });
test.afterAll(() => { console.log(seed("--clean")); });

/* ── L1 · one width ── */
for (const size of SIZES) {
  test(`L1 every block shares the header card's edges, which are the Contact list's, at ${size.width}`, async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger(`L1-${size.width}`);
    await open(page, size, "/agents");
    await page.locator(".cl25-card").first().waitFor({ state: "visible", timeout: 30_000 });
    const cl = await box(page, ".cl25-card");
    await open(page, size);
    await page.evaluate(() => { try { localStorage.removeItem("sa.guide.packages-explainer"); } catch { /* */ } });
    await page.reload(); await page.locator('[data-pk39="labels"]').first().waitFor({ state: "visible", timeout: 30_000 }); await page.waitForTimeout(1200);
    const card = await box(page, `${pg} .pk39-card`);
    L.check("both cards measured", !!cl && !!card && cl.w > 400, JSON.stringify({ cl, card }));
    L.check("the header card's left = the Contact list's (±1)", near(card?.x, cl?.x, 1), `${card?.x} vs ${cl?.x}`);
    L.check("the header card's right = the Contact list's (±1)", near(card?.right, cl?.right, 1), `${card?.right} vs ${cl?.right}`);
    for (const [what, sel] of [["the explainer", ".p6 > .p9-tip"], ["the labels row", ".p6 > .p9-pkl"], ["the builder", ".p6 > .p9-pb-build"], ["the band's contents", ".p6 > .p8-bnr > .p8-bnr-in"], ["the results", ".p6 > .p9-agg3"]] as const) {
      const b = await box(page, `${pg}${sel.slice(3)}`);
      L.check(`${what}: measured`, !!b && b.w > 300, JSON.stringify(b));
      L.check(`${what}: left = the card's (±1)`, near(b?.x, card?.x, 1), `${b?.x} vs ${card?.x}`);
      L.check(`${what}: right = the card's (±1)`, near(b?.right, card?.right, 1), `${b?.right} vs ${card?.right}`);
    }
    const band = await box(page, `${pg} > .p8-bnr`), sheet = await page.evaluate(() => { const r = (document.querySelector('[data-pk26="page"]')!.closest(".ws-window") as HTMLElement).getBoundingClientRect(); return { x: r.x, right: r.right }; });
    L.check("the navy band still runs the full sheet (±1)", near(band?.x, sheet.x, 1) && near(band?.right, sheet.right, 1), `${JSON.stringify(band)} vs ${JSON.stringify(sheet)}`);
    L.done(19);
  });
}

/* L2 — RETIRED by v39.2 (the typewriter is for three headings now); rewritten as pk392.measure.ts L2. See
   tests/e2e/RETIRED-submission-packages-v39-2.md */

/* ── L3 · the hero ── */
test("L3 one status pill with the right words; no stage dots; nothing overlaps at 1280; the selected label has the bar", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("L3");
  await open(page, SIZES[0]);
  for (const [id, want, lock] of [["pk40-std", /^Out with agents · 5 sent$/, true], ["pk40-ready", /^Ready to send$/, false], ["pk40-draft", /^Draft · needs /, false]] as const) {
    await label(page, id).click(); await page.waitForTimeout(500);
    const r = await page.evaluate((p) => {
      const o = document.querySelector(`${p} [data-pk40="open"]`)!;
      const pills = [...o.querySelectorAll('[data-pk39="status"]')];
      const head = o.querySelector('[data-pk39="pkg-head"]')!;
      /* every visible leaf in the header: no two may share pixels */
      const leaves = [...head.querySelectorAll("*")].filter((e) => (e as HTMLElement).offsetParent && e.children.length === 0 && e.getBoundingClientRect().width > 0)
        .map((e) => ({ n: `${e.tagName}.${(e as HTMLElement).className}`, r: e.getBoundingClientRect(), anc: e }));
      const hits: string[] = [];
      for (let i = 0; i < leaves.length; i++) for (let j = i + 1; j < leaves.length; j++) {
        const a = leaves[i].r, b = leaves[j].r;
        if (leaves[i].anc.contains(leaves[j].anc) || leaves[j].anc.contains(leaves[i].anc)) continue;
        const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left), oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (ox > 1 && oy > 1) hits.push(`${leaves[i].n} × ${leaves[j].n}`);
      }
      const pill = pills[0] as HTMLElement | undefined;
      return { n: pills.length, text: pill ? pill.innerText.replace(/\s+/g, " ").trim() : "", h: pill?.getBoundingClientRect().height, lock: pill ? pill.querySelectorAll('[data-pk39="stage-lock"]').length : -1,
        dots: o.querySelectorAll('[data-pk39="stage"], .p9-stg').length, leaves: leaves.length, hits };
    }, pg);
    L.check(`${id}: exactly one status pill`, r.n === 1, String(r.n));
    L.check(`${id}: it reads ${want}`, want.test(r.text), r.text);
    /* 28 at 1280: the ref's @container sheet (max-width:1200px) rule; L4 holds the 32 at 1512 */
    L.check(`${id}: it is the compact 28 tall at 1280 (±1)`, near(r.h, 28, 1), String(r.h));
    L.check(`${id}: the padlock ${lock ? "is" : "is not"} in it`, r.lock === (lock ? 1 : 0), String(r.lock));
    L.check(`${id}: no stage dots`, r.dots === 0, String(r.dots));
    L.check(`${id}: the header's parts were read`, r.leaves >= 4, String(r.leaves));
    L.check(`${id}: nothing in the header overlaps at 1280`, r.hits.length === 0, JSON.stringify(r.hits));
  }
  const lb = await page.evaluate((p) => [...document.querySelectorAll(`${p} .p9-pkl-b`)].map((b) => {
    const cs = getComputedStyle(b), be = getComputedStyle(b, "::before"), r = b.getBoundingClientRect();
    return { on: b.getAttribute("aria-pressed") === "true", ring: /0px 0px 0px [2-9]px/.test(cs.boxShadow), bar: be.content !== "none" && be.content !== "" && parseFloat(be.height) === 3, barW: parseFloat(be.width), w: r.width, lift: cs.transform };
  }), pg);
  const sel = lb.filter((x) => x.on);
  L.check("labels read (4)", lb.length === 4, JSON.stringify(lb));
  L.check("exactly one selected", sel.length === 1, JSON.stringify(sel));
  L.check("no label is ringed", lb.every((x) => !x.ring), JSON.stringify(lb));
  L.check("the selected label has the 3px bar, inset 18 each side", sel[0]?.bar === true && near(sel[0]?.barW, (sel[0]?.w ?? 0) - 36, 1), JSON.stringify(sel[0]));
  L.check("…and no lift", sel[0]?.lift === "none", String(sel[0]?.lift));
  L.done(26);
});

/* ── L4 · rhythm ── */
test("L4 explainer → labels 48, BUILD label → cards 24, builder → band 96, top three → list panel 96", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("L4");
  await open(page, SIZES[1]);
  await page.evaluate(() => { try { localStorage.removeItem("sa.guide.packages-explainer"); } catch { /* */ } });
  await page.reload(); await page.locator('[data-pk39="labels"]').first().waitFor({ state: "visible", timeout: 30_000 }); await page.waitForTimeout(1200);
  const g = await page.evaluate((p) => {
    const root = document.querySelector(p)!; const r = (s: string) => root.querySelector(s)?.getBoundingClientRect();
    const tip = r(":scope > .p9-tip"), pkl = r(":scope > .p9-pkl"), k = r(".p9-pb-build .p9-bk-k"), grid = r('[data-pk39="grid"]'), build = r(":scope > .p9-pb-build"), band = r(":scope > .p8-bnr");
    /* the top three are each results row's showcase grid; the list panel is that row's .p9-rlw */
    const pairs = [...root.querySelectorAll(".p9-agg3 .p9-ag3-row")].map((row) => { const t = row.querySelector(":scope > .p9-ag3-g"), l = row.querySelector(":scope > .p9-rlw"); return t && l ? l.getBoundingClientRect().top - t.getBoundingClientRect().bottom : null; });
    const pill = root.querySelector('[data-pk40="open"] [data-pk39="status"]')?.getBoundingClientRect().height ?? null;
    return { tipPkl: tip && pkl ? pkl.top - tip.bottom : null, kGrid: k && grid ? grid.top - k.bottom : null, buildBand: build && band ? band.top - build.bottom : null, pairs, pill };
  }, pg);
  L.check("explainer → labels 48 (±1)", near(g.tipPkl ?? undefined, 48, 1), String(g.tipPkl));
  L.check("BUILD label → cards 24 (±1)", near(g.kGrid ?? undefined, 24, 1), String(g.kGrid));
  L.check("builder → navy band 96 (±1)", near(g.buildBand ?? undefined, 96, 1), String(g.buildBand));
  L.check("both results rows were read (packages and pieces)", g.pairs.length === 2 && g.pairs.every((x) => x != null), JSON.stringify(g.pairs));
  L.check("top three → list panel 96 (±1), in both rows", g.pairs.every((x) => near(x ?? undefined, 96, 1)), JSON.stringify(g.pairs));
  /* the pill's full size (the ref's @container ≤1200 rule makes it 28 at 1280; L3 reads that) */
  L.check("the status pill is 32 tall at 1512 (±1)", near(g.pill ?? undefined, 32, 1), String(g.pill));
  L.done(6);
});

/* ── L5 · the explainer ── */
test("L5 the explainer shows first; ✕ hides it and writes once; a reload keeps it hidden", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("L5");
  await page.addInitScript((k) => {
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (a: string, b: string) { if (a === k) { const w = window as unknown as { __pk391w?: number }; w.__pk391w = (w.__pk391w ?? 0) + 1; } return set.call(this, a, b); };
  }, KEY);
  await open(page, SIZES[1]);
  await page.evaluate((k) => { try { localStorage.removeItem(k); } catch { /* */ } }, KEY);
  await page.reload(); await page.locator('[data-pk39="labels"]').first().waitFor({ state: "visible", timeout: 30_000 }); await page.waitForTimeout(1200);
  L.check("it shows first", (await page.locator(`${pg} [data-pk39="tip"]`).count()) === 1, "tip");
  L.check("…with its sentence", /A package is everything one agent receives/.test(await page.locator(`${pg} [data-pk39="tip"]`).first().innerText()), "text");
  await page.locator(`${pg} [data-pk39="tip-x"]`).first().click(); await page.waitForTimeout(600);
  L.check("✕ hides it", (await page.locator(`${pg} [data-pk39="tip"]`).count()) === 0, "tip");
  const w = await page.evaluate((k) => ({ n: (window as unknown as { __pk391w?: number }).__pk391w ?? 0, v: localStorage.getItem(k) }), KEY);
  L.check("…and writes the store once", w.n === 1 && w.v === "1", JSON.stringify(w));
  await page.reload(); await page.locator('[data-pk39="labels"]').first().waitFor({ state: "visible", timeout: 30_000 }); await page.waitForTimeout(1500);
  L.check("a reload keeps it hidden", (await page.locator(`${pg} [data-pk39="tip"]`).count()) === 0, "tip");
  L.done(5);
});

/* ── L6 · the drawer ── */
test("L6 New package and Package details open in the drawer; the header follows the colour; Create adds that label", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("L6");
  await open(page, SIZES[1]);
  await page.locator(`${pg} [data-pk38="labels"] .p9-pkl-new`).first().click(); await page.waitForTimeout(700);
  L.check("+ New package opens the drawer", (await page.locator('aside.p6-cx-drw[data-pk391="pd"]').count()) === 1, "drawer");
  L.check("…and no centred dialog is in the DOM", (await page.locator('.p6-pdlg, .p6-pd').count()) === 0, String(await page.locator('.p6-pdlg, .p6-pd').count()));
  L.check("…it reads New package", (await page.locator('[data-pk391="pd-head"] h3').innerText()).trim() === "New package", "title");
  const before = await page.evaluate(() => getComputedStyle(document.querySelector('[data-pk391="pd-head"]')!).backgroundColor);
  await page.locator('[data-pk391="pd"] [data-col="plum"]').click(); await page.waitForTimeout(250);
  const after = await page.evaluate(() => getComputedStyle(document.querySelector('[data-pk391="pd-head"]')!).backgroundColor);
  L.check("the header was another colour before", before !== hexRgb("#583a5a"), before);
  L.check("Plum changes the header's computed background before anything is saved", after === hexRgb("#583a5a"), after);
  await page.locator('[data-pk391="pd"] .pa-id-pdName').fill("Lock three nine one");
  await page.locator('[data-pk391="pd-ok"]').click(); await page.waitForTimeout(2500);
  L.check("Create closes the drawer", (await page.locator('[data-pk391="pd"]').count()) === 0, "drawer");
  const made = await page.evaluate((p) => { const b = [...document.querySelectorAll(`${p} .p9-pkl-b`)].find((x) => /Lock three nine one/.test((x as HTMLElement).innerText)); return b ? getComputedStyle(b).backgroundColor : null; }, pg);
  L.check("…and adds a label of that colour", made === hexRgb("#583a5a"), String(made));
  await label(page, "pk40-ready").click(); await page.waitForTimeout(500);
  await page.locator(`${pg} [data-pk40="open"] [data-pk39="details"]`).first().click(); await page.waitForTimeout(700);
  L.check("“Note, copy or delete…” opens the drawer", (await page.locator('aside.p6-cx-drw[data-pk391="pd"]').count()) === 1, "drawer");
  L.check("…its details form (Ready one, Delete package, Save)", (await page.locator('[data-pk391="pd-head"] h3').innerText()).trim() === "Ready one" && (await page.locator('[data-pk391="pd-del"]').count()) === 1 && (await page.locator('[data-pk391="pd-ok"]').innerText()).trim() === "Save", "details");
  await page.keyboard.press("Escape"); await page.waitForTimeout(500);
  L.check("Escape closes it", (await page.locator('[data-pk391="pd"]').count()) === 0, "drawer");
  L.done(10);
});

/* L7 — RETIRED by v39.2 (Your materials is a folder tab now); rewritten as pk392.measure.ts L7. See
   tests/e2e/RETIRED-submission-packages-v39-2.md */
