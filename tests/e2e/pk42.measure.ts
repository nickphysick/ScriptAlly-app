/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v42 — the SP42 locks on the rendered page, at 1512 × 982 and 1280 × 832. FIXTURE: seedPk40.mjs
 * (pk40-ms in use: Standard and Standard 2 out with agents, Ready one, Draft one, the retired Old one) and
 * pk41Fixture.mjs (--colours, --no-packages, --retired-only, --one-package, --active), re-seeded per case that changes
 * anything and restored in afterAll.
 *
 *   L1 Retired pieces: no rail, no batch strip, and no colour field or swatch (New and Details drawers, the icon
 *      popover); no horizontal overflow
 *   L2 Tiles: a row between the header and the builder, outside the builder; one tile per live package in the data's
 *      order (newest first); retired ones absent until "Retired (n)" (absent at 0); each ≤ 300 wide and equal ±1; each
 *      foot in its stage's words; exactly one "Current batch", the active package; a click opens that package with no
 *      scroll, and that tile computes the 2px navy ring
 *   L3 Builder: one framed container with a 7 ±1 white rim; the steps band rgb(226,230,224), the preview band
 *      rgb(244,230,214), the sent note rgb(243,226,220); steps and preview side by side (tops ±1); "Use for current
 *      batch" sets the active package through the existing writer and the tag moves; a sent package's buttons sit inside
 *      the preview
 *   L4 Navy icons: every package icon on this page computes rgb(45,58,80) for two packages whose stored colours differ
 *      (Plum and Pine); the Query Centre and the log-a-query journey paint neither stored colour anywhere
 *   L5 Drawers: the New and Details copy and the icon hint, exactly; no colour control
 *   L6 Empty: with no packages, the card's heading and button, no tiles and no builder, and the button opens the New
 *      drawer; with only retired packages, the card and "Retired (1)"
 *   L7 How it works: the title, intro and four station titles exactly; none of v41's guide; reduced motion shows all
 *      four at once; without it station 4 is hidden at 1s and shown by 13s; Play again restarts; Escape closes
 *   L8 No regression: the founding strip (one line), the folder tab's pink, the pinned hawk (fixed, 212 tall, on the
 *      viewport's foot). The v39.3 / v41 locks for picking, linking, the sent lock and Make a copy are pk393 L10–L14,
 *      pk38 L1/L3/L4/L7/L10/L11, pk39 L5 and pk41 L1/L2/L3/L6/L8, re-pointed to the tiles.
 *
 * Breaks: `PK42_MUTATE=<L1…L8>` applies that lock's break in the page.
 */
import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { liftMotionSuppression, openRoute } from "./measure";

const DIR = "reports/submission-packages-v42";
const MUT = process.env.PK42_MUTATE ?? "";
const SIZES = [{ width: 1512, height: 982 }, { width: 1280, height: 832 }] as const;
const node = (file: string, ...args: string[]) => execFileSync("node", [`tests/e2e/${file}`, ...args], { stdio: "pipe" }).toString();
const seed = (...a: string[]) => node("seedPk40.mjs", ...a);
const fix = (...a: string[]) => node("pk41Fixture.mjs", ...a);
const activeStored = () => JSON.parse(fix("--active").trim().split("\n").pop()!).active as string | null;
const pg = `[data-pk41="page"]`;
const NAVY = "rgb(45, 58, 80)";

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

/* Each lock's break, applied in the page. */
const MUTATIONS: Record<string, { css?: string; js?: string }> = {
  L1: { js: `new MutationObserver((_, o) => { const h = document.querySelector('[data-pk41="header"]'); if (h && !h.querySelector('[data-pk41="batch"]')) { const d = document.createElement("div"); d.setAttribute("data-pk41", "batch"); h.appendChild(d); } }).observe(document, { subtree: true, childList: true });` },
  L2: { css: `.p41 .p42-tile { flex: none !important; width: 320px !important; max-width: none !important; }` },
  L3: { css: `.p41 .p41-bld .p93-b { grid-template-columns: minmax(0, 1fr) !important; } .p41 .p42-band-sg { background: #fff !important; }` },
  L4: { css: `.p41 .p41-ic { background: #583a5a !important; } .p41 .p41-bld .p93-bh-ic { background: #2e5641 !important; }` },
  L5: { js: `new MutationObserver(() => { document.querySelectorAll('[data-pk42="icon-hint"]').forEach((e) => { if (!e.textContent.startsWith("Choose")) e.textContent = "Choose an icon and colour."; }); }).observe(document, { subtree: true, childList: true, characterData: true });` },
  L6: { css: `.p41 .p42-emp { display: none !important; }` },
  L7: { css: `.p42-hw .p42-hwb { animation: none !important; }` },
  L8: { css: `.p41-perch { height: 260px !important; right: 140px !important; } .ws-app.ws-app .ws-main { --ink-tab: #fbf9f5 !important; }` },
};

async function open(page: Page, size: { width: number; height: number }, opts: { reduce?: boolean } = {}) {
  if (opts.reduce) await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => { try { localStorage.setItem("scriptally_active_manuscript_id", "pk40-ms"); } catch { /* */ } });
  const m = MUTATIONS[MUT];
  if (m?.js) await page.addInitScript(m.js);
  if (m?.css) await page.addInitScript((css) => document.addEventListener("DOMContentLoaded", () => { const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st); }), m.css);
  await openRoute(page, "/queries/packages", size);
  await page.locator(`${pg} [data-pk41="header"]`).first().waitFor({ state: "visible", timeout: 30_000 });
  await page.waitForTimeout(900);
}
const SC = `[...document.querySelectorAll(".wpg-scroll")].find((x) => x.querySelector('[data-pk41="page"]'))`;
const scrollTop = (page: Page) => page.evaluate((sc) => ((0, eval)(sc) as HTMLElement).scrollTop, SC);
const setScroll = (page: Page, y: number) => page.evaluate(({ sc, y }) => { ((0, eval)(sc) as HTMLElement).scrollTop = y; }, { sc: SC, y }).then(() => page.waitForTimeout(350));
async function scrollTo(page: Page, sel: string, offset = 0) {
  await page.evaluate(({ sel, offset, sc }) => {
    const s = (0, eval)(sc) as HTMLElement; const el = s?.querySelector(sel) as HTMLElement | null;
    if (s && el) s.scrollTop = el.getBoundingClientRect().top - s.getBoundingClientRect().top + s.scrollTop - offset;
  }, { sel, offset, sc: SC });
  await page.waitForTimeout(350);
}
const near = (a: number | undefined | null, b: number, t = 1) => typeof a === "number" && Math.abs(a - b) <= t;
const tile = (page: Page, id: string) => page.locator(`${pg} [data-pk42-tile="${id}"]`).first();
const openPkg = async (page: Page, id: string) => { await tile(page, id).click(); await page.waitForTimeout(600); };
const dump = () => JSON.parse(seed("--dump").trim().split("\n").pop()!) as Record<string, { createdDate?: string; status?: string } | null>;

test.describe.configure({ mode: "default" });
test.beforeAll(() => { seed(); fix("--show-banner"); });
test.afterAll(() => { fix("--show-banner"); seed("--clean"); });

for (const size of SIZES) {
  const at = `${size.width}`;

  test(`L1 retired pieces · ${at}`, async ({ page }) => {
    test.setTimeout(180_000);
    const L = new Ledger(`L1-${at}`);
    seed();
    await open(page, size);
    const r = await page.evaluate((sc) => {
      const s = (0, eval)(sc) as HTMLElement; const root = document.querySelector('[data-pk41="page"]') as HTMLElement;
      return {
        tiles: root.querySelectorAll("[data-pk42-tile]").length,
        gone: ['[data-pk41="rail"]', '[data-pk41="batch"]', "[data-pk41-row]", '[data-pk41="batch-change"]', '[data-pk41="batch-picker"]', '[data-pk39="dlg-cols"]'].map((q) => [q, document.querySelectorAll(q).length] as const),
        scrollW: s.scrollWidth, clientW: s.clientWidth, docW: document.documentElement.scrollWidth, winW: innerWidth,
      };
    }, SC);
    L.check("population: the tiles", r.tiles > 0, `${r.tiles}`);
    for (const [q, n] of r.gone) L.check(`page: no ${q}`, n === 0, `${n} in the DOM`);
    L.check("no horizontal overflow (scroller)", r.scrollW <= r.clientW, `${r.scrollW} > ${r.clientW}`);
    L.check("no horizontal overflow (document)", r.docW <= r.winW, `${r.docW} > ${r.winW}`);
    const noColour = async (where: string, root: string) => {
      const n = await page.evaluate((root) => {
        const el = document.querySelector(root); if (!el) return null;
        return { col: el.querySelectorAll("[data-col], [data-pk39='dlg-cols']").length, label: [...el.querySelectorAll("span, p, [role=radiogroup]")].filter((e) => /^colour$/i.test((e.getAttribute("aria-label") ?? e.textContent ?? "").trim())).length };
      }, root);
      L.check(`${where}: present`, n !== null, "missing");
      L.check(`${where}: no swatch`, n?.col === 0, `${n?.col}`);
      L.check(`${where}: no Colour field`, n?.label === 0, `${n?.label}`);
    };
    await page.locator(`${pg} [data-pk41="new"]`).click(); await page.waitForTimeout(700);
    await noColour("New drawer", '[data-pk391="pd"]');
    await page.keyboard.press("Escape"); await page.waitForTimeout(500);
    await openPkg(page, "pk40-ready"); await scrollTo(page, '[data-pk41="builder-frame"]', 40);
    await page.locator(`${pg} [data-pk39="details"]`).first().click(); await page.waitForTimeout(700);
    await noColour("Details drawer", '[data-pk391="pd"]');
    await page.keyboard.press("Escape"); await page.waitForTimeout(500);
    await page.locator(`${pg} [data-pk393="tile"]`).first().click(); await page.waitForTimeout(400);
    await noColour("icon popover", '[data-pk39="picker"]');
    L.check("icon popover: the twelve icons", (await page.locator('[data-pk39="picker"] [data-ic]').count()) === 12, String(await page.locator('[data-pk39="picker"] [data-ic]').count()));
    L.done(19);
  });

  test(`L2 tiles · ${at}`, async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger(`L2-${at}`);
    seed();
    const d = dump();
    const live = ["pk40-std", "pk40-std2", "pk40-ready", "pk40-draft"].filter((id) => d[id] && d[id]!.status !== "Retired");
    const want = [...live].sort((a, b) => ((d[a]!.createdDate ?? "") < (d[b]!.createdDate ?? "") ? 1 : (d[a]!.createdDate ?? "") > (d[b]!.createdDate ?? "") ? -1 : 0));
    await open(page, size);
    const g = await page.evaluate(() => {
      const q = (s: string) => document.querySelector(`[data-pk41="page"] ${s}`) as HTMLElement | null;
      const rows = q('[data-pk42="tiles"]'), hd = q('[data-pk41="header"]'), bld = q('[data-pk41="builder"]');
      const r = (e: Element | null) => (e ? e.getBoundingClientRect() : null);
      const tiles = [...document.querySelectorAll('[data-pk41="page"] [data-pk42-tile]')] as HTMLElement[];
      return {
        rows: r(rows) ? { t: r(rows)!.top, b: r(rows)!.bottom } : null, hd: r(hd)?.bottom ?? null, bld: r(bld)?.top ?? null, inside: !!(bld && rows && bld.contains(rows)),
        ids: tiles.map((t) => t.dataset.pk42Tile!), widths: tiles.map((t) => t.getBoundingClientRect().width),
        foot: Object.fromEntries(tiles.map((t) => [t.dataset.pk42Tile!, [t.querySelector(".p42-big")?.textContent ?? "", t.querySelector(".p42-bl")?.textContent ?? ""].join(" ").trim()])),
        cb: tiles.filter((t) => t.querySelector('[data-pk42="current-batch"]')).map((t) => t.dataset.pk42Tile!),
        link: q('[data-pk42="retired-toggle"]')?.textContent ?? null,
      };
    });
    L.check("population: the row, the header and the builder", !!g.rows && g.hd !== null && g.bld !== null, JSON.stringify([g.rows, g.hd, g.bld]));
    L.check("the row is under the header", !!g.rows && g.rows.t >= (g.hd ?? 0) - 0.5, `${g.rows?.t} / ${g.hd}`);
    L.check("the row is above the builder", !!g.rows && g.rows.b <= (g.bld ?? 0) + 0.5, `${g.rows?.b} / ${g.bld}`);
    L.check("the row is outside the builder's box", !g.inside, String(g.inside));
    L.check("one tile per live package, in the data's order", JSON.stringify(g.ids) === JSON.stringify(want), `${JSON.stringify(g.ids)} / ${JSON.stringify(want)}`);
    L.check("the retired package is absent", !g.ids.includes("pk40-old"), JSON.stringify(g.ids));
    L.check("each tile ≤ 300 wide", g.widths.every((w) => w <= 300.5), JSON.stringify(g.widths));
    L.check("the tiles' widths are equal ±1", Math.max(...g.widths) - Math.min(...g.widths) <= 1, JSON.stringify(g.widths));
    const RATE = /^\d+% asked for more$|^\d of 4 answers in$/;
    for (const id of ["pk40-std", "pk40-std2"]) L.check(`${id} (out): its foot`, RATE.test(g.foot[id] ?? ""), `${g.foot[id]}`);
    L.check("pk40-ready: Ready to send", g.foot["pk40-ready"] === "Ready to send", `${g.foot["pk40-ready"]}`);
    L.check("pk40-draft: 0 of 2 pieces in", g.foot["pk40-draft"] === "0 of 2 pieces in", `${g.foot["pk40-draft"]}`);
    const stored = activeStored();
    L.check("exactly one Current batch", g.cb.length === 1, JSON.stringify(g.cb));
    L.check("…and it is the active package", g.cb[0] === stored && !!stored, `${g.cb[0]} / ${stored}`);
    L.check("Retired (1)", g.link === "Retired (1)", `${g.link}`);
    await page.locator(`${pg} [data-pk42="retired-toggle"]`).click(); await page.waitForTimeout(400);
    const op = await page.evaluate(() => { const t = document.querySelector('[data-pk41="page"] [data-pk42-tile="pk40-old"]'); return t ? Number(getComputedStyle(t).opacity) : null; });
    L.check("shown: the retired tile at 65%", near(op, 0.65, 0.02), `${op}`);
    await page.locator(`${pg} [data-pk42="retired-toggle"]`).click(); await page.waitForTimeout(400);
    L.check("hidden again", (await tile(page, "pk40-old").count()) === 0, "still there");
    /* a click opens that package and does not move the page */
    await setScroll(page, 60);
    const before = await scrollTop(page);
    await tile(page, "pk40-ready").click(); await page.waitForTimeout(600);
    const after = await scrollTop(page);
    L.check("population: the page was scrolled", before >= 40, `${before}`);
    L.check("a click does not move the page", near(after, before), `${before} → ${after}`);
    L.check("…and opens that package", (await page.locator(`${pg} [data-pk26="open"]`).first().getAttribute("data-pkg")) === "pk40-ready", "not open");
    const ring = await tile(page, "pk40-ready").evaluate((e) => getComputedStyle(e).boxShadow);
    L.check("the open tile computes the 2px navy ring", ring.startsWith(`${NAVY} 0px 0px 0px 2px`), ring);
    /* no retired package: no link */
    fix("--one-package");
    await page.reload(); await page.locator(`${pg} [data-pk42="tiles"]`).first().waitFor({ state: "visible", timeout: 30_000 }); await page.waitForTimeout(800);
    L.check("no retired: no Retired link", (await page.locator(`${pg} [data-pk42="retired-toggle"]`).count()) === 0, "present");
    L.check("one package: one tile", (await page.locator(`${pg} [data-pk42-tile]`).count()) === 1, String(await page.locator(`${pg} [data-pk42-tile]`).count()));
    seed();
    L.done(23);
  });

  test(`L3 builder · ${at}`, async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger(`L3-${at}`);
    seed();
    await open(page, size);
    await openPkg(page, "pk40-std");
    const b = await page.evaluate(() => {
      const q = (s: string) => document.querySelector(`[data-pk41="page"] ${s}`) as HTMLElement | null;
      const bg = (s: string) => { const e = q(s); return e ? getComputedStyle(e).backgroundColor : null; };
      const fr = q('[data-pk42="builder"]'), sc = q('[data-pk393="steps-col"]'), pv = q('[data-pk393="preview"]');
      const well = pv?.getBoundingClientRect();
      return {
        n: document.querySelectorAll('[data-pk41="page"] [data-pk42="builder"]').length, sh: fr ? getComputedStyle(fr).boxShadow : "", frBg: fr ? getComputedStyle(fr).backgroundColor : null,
        steps: bg('[data-pk42="steps-band"]'), prev: bg('[data-pk42="preview-band"]'), lock: bg('[data-pk393="sent-note"]'),
        st: sc?.getBoundingClientRect().top ?? null, pt: well?.top ?? null, sl: sc?.getBoundingClientRect().right ?? null, pl: well?.left ?? null,
        well: well ? { l: well.left, r: well.right, t: well.top, b: well.bottom } : null,
        btns: [...(pv?.querySelectorAll(".p93-pv-f button") ?? [])].map((x) => { const r = x.getBoundingClientRect(); return { t: (x.textContent ?? "").trim(), l: r.left, r: r.right, top: r.top, b: r.bottom }; }),
      };
    });
    L.check("one framed container", b.n === 1, `${b.n}`);
    L.check("white", b.frBg === "rgb(255, 255, 255)", `${b.frBg}`);
    const rim = b.sh.match(/rgb\(255, 255, 255\) 0px 0px 0px ([\d.]+)px/);
    L.check("a 7 ±1 white rim", !!rim && near(Number(rim[1]), 7), b.sh);
    L.check("the steps band is sage rgb(226, 230, 224)", b.steps === "rgb(226, 230, 224)", `${b.steps}`);
    L.check("the preview band is sand rgb(244, 230, 214)", b.prev === "rgb(244, 230, 214)", `${b.prev}`);
    L.check("the sent note is blush rgb(243, 226, 220)", b.lock === "rgb(243, 226, 220)", `${b.lock}`);
    L.check("steps and preview side by side: tops equal ±1", near(b.st, b.pt ?? -99), `${b.st} / ${b.pt}`);
    L.check("…the preview to the right of the steps", (b.pl ?? 0) >= (b.sl ?? 9999) - 0.5, `${b.sl} / ${b.pl}`);
    L.check("population: the sent package's buttons", b.btns.length >= 3, `${b.btns.length}`);
    for (const x of b.btns) L.check(`“${x.t}” inside the preview`, !!b.well && x.l >= b.well.l - 0.5 && x.r <= b.well.r + 0.5 && x.top >= b.well.t - 0.5 && x.b <= b.well.b + 0.5, `${x.l}–${x.r} / ${b.well?.l}–${b.well?.r}`);
    L.check("the current batch has no Use button", (await page.locator(`${pg} [data-pk42="use-batch"]`).count()) === 0, "present");
    /* Use for current batch: the existing writer, and the tag moves */
    await openPkg(page, "pk40-ready");
    const use = page.locator(`${pg} [data-pk42="use-batch"]`).first();
    L.check("a Ready package offers “Use for current batch”", (await use.count()) === 1 && (await use.textContent())?.trim() === "Use for current batch", "missing");
    await use.click(); await page.waitForTimeout(1800);
    L.check("…which sets the active package", activeStored() === "pk40-ready", `${activeStored()}`);
    const cb = await page.evaluate(() => [...document.querySelectorAll('[data-pk41="page"] [data-pk42-tile]')].filter((t) => t.querySelector('[data-pk42="current-batch"]')).map((t) => (t as HTMLElement).dataset.pk42Tile));
    L.check("…and the tag moves to that tile", JSON.stringify(cb) === JSON.stringify(["pk40-ready"]), JSON.stringify(cb));
    L.check("…and its button goes", (await page.locator(`${pg} [data-pk42="use-batch"]`).count()) === 0, "still there");
    seed();
    L.done(15);
  });

  test(`L4 navy icons · ${at}`, async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger(`L4-${at}`);
    seed(); fix("--colours");
    const d = dump() as Record<string, { colour?: string } | null>;
    L.check("population: two packages with different stored colours", d["pk40-std"]?.colour === "plum" && d["pk40-ready"]?.colour === "pine", `${d["pk40-std"]?.colour} / ${d["pk40-ready"]?.colour}`);
    await open(page, size);
    const icons = async () => page.evaluate(() => [...document.querySelectorAll('[data-pk41="page"] [data-pk42="icon"], [data-pk41="page"] .p93-bh-ic')].filter((e) => (e as HTMLElement).offsetParent).map((e) => getComputedStyle(e).backgroundColor));
    for (const id of ["pk40-std", "pk40-ready"]) {
      await openPkg(page, id);
      const bh = await page.locator(`${pg} [data-pk393="tile"]`).first().evaluate((e) => getComputedStyle(e).backgroundColor);
      L.check(`${id}: the builder's icon tile is navy`, bh === NAVY, bh);
      const t = await tile(page, id).locator('[data-pk42="icon"]').evaluate((e) => getComputedStyle(e).backgroundColor);
      L.check(`${id}: its stat tile's icon is navy`, t === NAVY, t);
    }
    await scrollTo(page, '[data-pk41="results"]', 60); await page.waitForTimeout(400);
    const all = await icons();
    L.check("population: the page's package icons (tiles, builder, results)", all.length >= 6, `${all.length}`);
    L.check("every package icon on the page is navy", all.every((c) => c === NAVY), JSON.stringify([...new Set(all)]));
    const PLUM = "rgb(88, 58, 90)", PINE = "rgb(46, 86, 65)";
    const paints = (root: string) => page.evaluate(({ root, cs }) => {
      const r = document.querySelector(root); if (!r) return null;
      /* every page stays mounted, so only what is on screen counts (a hidden page is not the one being read) */
      return [...r.querySelectorAll("*")].filter((e) => { if (!(e as HTMLElement).getClientRects().length) return false; const s = getComputedStyle(e); return cs.includes(s.backgroundColor) || cs.includes(s.color) || cs.includes(s.borderTopColor); }).length;
    }, { root, cs: [PLUM, PINE] });
    L.check("this page paints neither stored colour", (await paints('[data-pk41="page"]')) === 0, `${await paints('[data-pk41="page"]')}`);
    /* log-a-query: the journey's package list */
    await openPkg(page, "pk40-ready"); await scrollTo(page, '[data-pk41="builder-frame"]', 40);
    await page.locator(`${pg} [data-pk393="primary"]`).first().click(); await page.waitForTimeout(1500);
    /* its package list (several steps in) draws a plain radio dot, never a package icon; the unit lock
       (packagesV42.test, "nothing outside this page reads a package's colour") covers every step */
    const open1 = await page.locator("[data-qad-drawer]").count();
    L.check("population: the log-a-query journey is open", open1 >= 1, `${open1}`);
    const qad = await paints("[data-qad-drawer]");
    L.check("log-a-query paints neither stored colour", qad === 0, `${qad}`);
    await page.keyboard.press("Escape"); await page.waitForTimeout(400);
    /* the Query Centre */
    await page.goto("/queries"); await page.waitForTimeout(3000);
    const qcRows = await page.evaluate(() => document.querySelectorAll('[data-qcv="row"], .qc138-row').length);
    L.check("population: the Query Centre rendered its rows", qcRows > 0, `${qcRows}`);
    const qc = await paints("body");
    L.check("the Query Centre paints neither stored colour", qc === 0, `${qc}`);
    seed();
    L.done(12);
  });

  test(`L5 drawers · ${at}`, async ({ page }) => {
    test.setTimeout(180_000);
    const L = new Ledger(`L5-${at}`);
    seed();
    await open(page, size);
    const HINT = "Pick one you’ll recognise. It shows on the tile, in the Query Centre and in your results.";
    const read = () => page.evaluate(() => {
      const d = document.querySelector('[data-pk391="pd"]');
      return d ? { h: d.querySelector("#p6-pdT")?.textContent ?? null, sub: d.querySelector('[data-pk42="drawer-sub"]')?.textContent ?? null, hint: d.querySelector('[data-pk42="icon-hint"]')?.textContent ?? null, col: d.querySelectorAll("[data-col]").length, icons: d.querySelectorAll('[data-pk391="pd-ics"] [role=radio]').length } : null;
    });
    await page.locator(`${pg} [data-pk41="new"]`).click(); await page.waitForTimeout(700);
    const n = await read();
    L.check("New: open", !!n, "missing");
    L.check("New: the title", n?.h === "Making a new package", `${n?.h}`);
    L.check("New: the line", n?.sub === "Give it a name and an icon you’ll recognise. You’ll pick its pieces on the page.", `${n?.sub}`);
    L.check("New: the icon hint", n?.hint === HINT, `${n?.hint}`);
    L.check("New: the icons, no colour", n?.icons === 12 && n?.col === 0, `${n?.icons} icons · ${n?.col} swatches`);
    await page.keyboard.press("Escape"); await page.waitForTimeout(500);
    await openPkg(page, "pk40-ready"); await scrollTo(page, '[data-pk41="builder-frame"]', 40);
    await page.locator(`${pg} [data-pk39="details"]`).first().click(); await page.waitForTimeout(700);
    const e = await read();
    L.check("Details: the title", e?.h === "Editing Ready one", `${e?.h}`);
    L.check("Details: the line", e?.sub === "Rename it, change its icon, or add a note on who it’s for.", `${e?.sub}`);
    L.check("Details: the icon hint", e?.hint === HINT, `${e?.hint}`);
    L.check("Details: the icons, no colour", e?.icons === 12 && e?.col === 0, `${e?.icons} icons · ${e?.col} swatches`);
    await page.keyboard.press("Escape"); await page.waitForTimeout(500);
    await page.locator(`${pg} [data-pk393="tile"]`).first().click(); await page.waitForTimeout(400);
    const p = await page.evaluate(() => { const k = document.querySelector('[data-pk39="picker"]'); return k ? { hint: k.querySelector('[data-pk42="icon-hint"]')?.textContent ?? null, col: k.querySelectorAll("[data-col]").length } : null; });
    L.check("popover: the icon hint", p?.hint === HINT, `${p?.hint}`);
    L.check("popover: no colour", p?.col === 0, `${p?.col}`);
    L.done(11);
  });

  test(`L6 empty · ${at}`, async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger(`L6-${at}`);
    seed(); fix("--no-packages");
    await open(page, size);
    const read = () => page.evaluate(() => {
      const q = (s: string) => document.querySelector(`[data-pk41="page"] ${s}`) as HTMLElement | null;
      const c = q('[data-pk42="empty"]');
      return { card: !!c && c.getBoundingClientRect().height > 0, h: q('[data-pk42="empty-title"]')?.textContent ?? null, btn: q('[data-pk42="empty-new"]')?.textContent ?? null,
        tiles: document.querySelectorAll('[data-pk41="page"] [data-pk42-tile]').length, builder: document.querySelectorAll('[data-pk41="page"] [data-pk41="builder"]').length, link: q('[data-pk42="retired-toggle"]')?.textContent ?? null };
    });
    const a = await read();
    L.check("no packages: the card", a.card, String(a.card));
    L.check("its heading", a.h === "No packages yet", `${a.h}`);
    L.check("its button", a.btn === "+ New package", `${a.btn}`);
    L.check("no tiles", a.tiles === 0, `${a.tiles}`);
    L.check("no builder", a.builder === 0, `${a.builder}`);
    L.check("no Retired link", a.link === null, `${a.link}`);
    const btn = page.locator(`${pg} [data-pk42="empty-new"]`).first();
    const canPress = (await btn.count()) > 0 && (await btn.isVisible());
    if (canPress) { await btn.click(); await page.waitForTimeout(700); }
    const drw = page.locator('[data-pk391="pd"] #p6-pdT');
    L.check("the button opens the New drawer", canPress && (await drw.count()) > 0 && ((await drw.textContent()) ?? "") === "Making a new package", canPress ? "not open" : "no visible button");
    await page.keyboard.press("Escape"); await page.waitForTimeout(400);
    seed(); fix("--retired-only");
    await page.reload(); await page.locator(`${pg} [data-pk41="header"]`).first().waitFor({ state: "visible", timeout: 30_000 }); await page.waitForTimeout(1200);
    const b = await read();
    L.check("only retired: the card", b.card, String(b.card));
    L.check("only retired: Retired (1)", b.link === "Retired (1)", `${b.link}`);
    L.check("only retired: no builder", b.builder === 0, `${b.builder}`);
    seed();
    L.done(10);
  });

  test(`L7 how it works · ${at}`, async ({ page, browser }) => {
    test.setTimeout(240_000);
    const L = new Ledger(`L7-${at}`);
    await open(page, size);
    await liftMotionSuppression(page);
    const st4 = () => page.evaluate(() => { const e = document.querySelector('[data-pk42-station="4"]'); return e ? Number(getComputedStyle(e).opacity) : null; });
    await page.locator(`${pg} [data-pk41="how"]`).click();
    const t0 = Date.now();
    await page.locator('[data-pk42="hw"]').waitFor({ state: "visible", timeout: 5000 });
    await page.waitForTimeout(Math.max(0, 1000 - (Date.now() - t0)));
    const at1 = await st4();
    L.check("without reduced motion: station 4 is not visible at 1s", at1 !== null && at1 < 0.05, `${at1}`);
    const words = await page.evaluate(() => ({
      t: document.querySelector('[data-pk42="hw-title"]')?.textContent, i: document.querySelector('[data-pk42="hw-intro"]')?.textContent,
      s: [...document.querySelectorAll('[data-pk42="hw-station-title"]')].map((b) => b.childNodes[1]?.textContent ?? ""), all: document.querySelector('[data-pk42="hw"]')?.textContent ?? "",
    }));
    L.check("the title", words.t === "How packages work", `${words.t}`);
    L.check("the intro", words.i === "A package is simply what you send an agent. Put one together once, use it as often as you like, and we’ll show you which ones get the best response.", `${words.i}`);
    L.check("the four station titles", JSON.stringify(words.s) === JSON.stringify(["Choose what goes in", "Give it a name", "Send it with a query", "See what’s working"]), JSON.stringify(words.s));
    for (const old of ["Step 1 of 5", "Set your current batch", "The strip along the bottom of the header"]) L.check(`no “${old}”`, !words.all.includes(old), "still there");
    await page.waitForTimeout(Math.max(0, 13000 - (Date.now() - t0)));
    const at13 = await st4();
    L.check("…and visible by 13s", at13 !== null && at13 >= 0.99, `${at13}`);
    await page.locator('[data-pk42="hw-again"]').click(); await page.waitForTimeout(1000);
    const again = await st4();
    L.check("Play again restarts it (station 4 hidden again at 1s)", again !== null && again < 0.05, `${again}`);
    await page.keyboard.press("Escape"); await page.waitForTimeout(400);
    L.check("Escape closes it", (await page.locator('[data-pk42="hw"]').count()) === 0, "still open");
    /* reduced motion: all four fully visible at open */
    const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: size });
    try {
      const p2 = await ctx.newPage();
      await open(p2, size, { reduce: true });
      await liftMotionSuppression(p2);
      await p2.locator(`${pg} [data-pk41="how"]`).click();
      await p2.locator('[data-pk42="hw"]').waitFor({ state: "visible", timeout: 5000 }); await p2.waitForTimeout(150);
      const ops = await p2.evaluate(() => [1, 2, 3, 4].map((n) => { const e = document.querySelector(`[data-pk42-station="${n}"]`); return e ? Number(getComputedStyle(e).opacity) : null; }));
      L.check("reduced motion: all four stations fully visible at open", ops.every((o) => o === 1), JSON.stringify(ops));
    } finally { await ctx.close(); }
    L.done(11);
  });

  test(`L8 no regression · ${at}`, async ({ page }) => {
    test.setTimeout(180_000);
    const L = new Ledger(`L8-${at}`);
    seed(); fix("--show-banner");
    await open(page, size);
    const r = await page.evaluate(() => {
      const b = document.querySelector('[data-pk41="banner"]') as HTMLElement | null, tx = b?.querySelector('[data-pk41="banner-text"]') as HTMLElement | null;
      const tab = document.querySelector(".ws-ftab") as HTMLElement | null;
      const h = document.querySelector('[data-pk41="hawk"]') as HTMLElement | null, hr = h?.getBoundingClientRect();
      return { tab: tab ? getComputedStyle(tab).backgroundColor : null, b: !!b, bh: b?.getBoundingClientRect().height ?? null, sw: tx?.scrollWidth ?? null, cw: tx?.clientWidth ?? null,
        hawk: !!h, pos: h ? getComputedStyle(h).position : null, hh: hr?.height ?? null, hb: hr?.bottom ?? null, vh: innerHeight };
    });
    L.check("the founding strip is shown", r.b, String(r.b));
    L.check("…on one line (≤ 60 tall)", (r.bh ?? 99) <= 60, `${r.bh}`);
    L.check("…its text not cut", r.sw !== null && r.cw !== null && r.sw <= r.cw, `${r.sw} / ${r.cw}`);
    L.check("the folder tab takes the strip's pink", r.tab === "rgb(251, 239, 233)", `${r.tab}`);
    L.check("the hawk is pinned (fixed)", r.hawk && r.pos === "fixed", `${r.pos}`);
    L.check("…212 ±2 tall", near(r.hh, 212, 2), `${r.hh}`);
    L.check("…on the viewport's foot ±1", near(r.hb, r.vh), `${r.hb} / ${r.vh}`);
    L.done(7);
  });
}
