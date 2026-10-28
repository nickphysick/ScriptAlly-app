/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v39 — the locks on the rendered page, at 1512 × 982 and 1280 × 832 with the shell. FIXTURE:
 * seedPk40.mjs, unchanged (pk40-ms, pk40-new; see its header for the arithmetic). Every population is asserted
 * non-zero before a claim about it is believed.
 *
 *   L1 Header: the card's and the title's boxes equal the Contact list's (±1) at 1512 and 1280; the highlighter is
 *      #cfe1ea; exactly one element on the page reads "Pro"
 *   L2 Colour: a colour picked in the picker reaches the label, the builder's header, the drawer's header, the showcase
 *      card and the list tile (computed backgrounds = the palette hex); a package without the field renders Harbour.
 *      (The rules' refusal of a key outside the eight is tests/rules, emulator.)
 *   L3 Labels: the row spans the content width (±1); no label under 200; REWRITTEN for v39.1: no label is ringed —
 *      the selected one carries the 3px bar beneath it instead (pk391 L3 owns the bar's geometry)
 *   L4 Builder: the two headers are the same height (±0.5) with equal tops; two separate cards REWRITTEN for v39.1 to
 *      24 ± 1 apart (Part E); no stepper row; exactly one status pill (v39.1 C retired the stage dots)
 *   L5 Rename (rewritten at Nick's ruling, 28 Oct): Enter writes the new name once (stored, and the label shows it),
 *      for a draft AND a sent package; Escape writes nothing; a sent package shows exactly one padlock, in the stage,
 *      and none beside the name
 *   L6 Lists: every package once in Every package; the pieces list shows one type at a time and switching keeps
 *      scrollTop (±1); each row's rate is packageReplies' for the fixture; nothing too early above a ranked row
 *   L7 How it works: opens from both doors, five steps, Escape closes, focus returns to the opener; the old dialog's
 *      markup is absent
 *   L8 Band: the pieces band is painted across the sheet's full width (±1), at 1512 and 1280 (read in pixels)
 *
 * Breaks: `PK39_MUTATE=<lock>` applies that lock's named break in the page.
 */
import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

const DIR = "reports/submission-packages-v39";
const MUT = process.env.PK39_MUTATE ?? "";
const SIZES = [{ width: 1512, height: 982 }, { width: 1280, height: 832 }] as const;
const seed = (arg?: string) => execFileSync("node", ["tests/e2e/seedPk40.mjs", ...(arg ? [arg] : [])], { stdio: "pipe" }).toString();
/** the five fixture packages as stored (seedPk40 --dump) */
const stored = (): Record<string, { packageName?: string; colour?: string } | null> => JSON.parse(seed("--dump").trim().split("\n").pop()!);

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

const watch = (body: string) => `document.addEventListener('DOMContentLoaded', () => { const put = () => { try { ${body} } catch (e) {} }; new MutationObserver(put).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true }); put(); })`;
const MUTATIONS: Record<string, { css?: string; js?: string }> = {
  /* L1: the header card takes the old 20px top and the old highlighter */
  L1: { css: `.p6 > .pk39-hd { margin-top: 44px !important; } .pk39-hd .pk39-card.pk39-card .hl { background: linear-gradient(transparent 50%, #e3e8ef 50%) !important; }` },
  /* L2: every label goes back to Harbour whatever its colour */
  L2: { css: `.p9-pkl .p9-pkl-row .p9-pkl-b.p9-pkl-b.p9-pkl-b { background-color: #1d4b63 !important; }` },
  /* L3: the labels stop sharing the row, and (v39.1) the selected one is ringed again */
  L3: { css: `.p9-pkl .p9-pkl-row .p9-pkl-b.p9-pkl-b { flex: 0 0 150px !important; min-width: 150px !important; } .p9-pkl .p9-pkl-b.p9-on.p9-on.p9-on { box-shadow: 0 0 0 4px rgba(29,75,99,.35) !important; }` },
  /* L4: the cards close up */
  L4: { css: `.p9-pb-grid.p9-v39.p9-v39.p9-v39 { gap: 8px !important; }`, js: watch(`const s = document.querySelector('[data-pk40="open"] [data-pk39="status"]'); if (s && !s.nextElementSibling?.matches('[data-pk39="stage"]')) { const d = document.createElement('span'); d.setAttribute('data-pk39', 'stage'); s.after(d); }`) },
  /* L5: a padlock comes back beside a sent package's name */
  L5: { js: watch(`const h = document.querySelector('[data-pk40="open"][data-stage="out"] .p9-po-tt h3'); if (h && !h.querySelector('.p9-po-lk')) { const s = document.createElement('span'); s.className = 'p9-po-lk'; s.textContent = '🔒'; h.appendChild(s); }`) },
  /* L6: the first package row is listed twice */
  L6: { js: watch(`const r = document.querySelector('[data-pk39="list-pk"] .p9-rl'); if (r && r.querySelectorAll('.p9-rl-r').length === 5) r.appendChild(r.querySelector('.p9-rl-r').cloneNode(true));`) },
  /* L7: the guide loses a step */
  L7: { js: watch(`const d = document.querySelector('.p9-hw2-dots'); if (d && d.children.length === 5) d.lastElementChild.remove();`) },
  /* L8: the pieces band stops at the column */
  L8: { css: `.p9-agg3 div.p9-id-aggMain .p9-ag3-row:not(:first-child) { box-shadow: none !important; }` },
};

async function open(page: Page, size: { width: number; height: number }, ms = "pk40-ms", route = "/queries/packages") {
  await page.addInitScript((id) => { try { localStorage.setItem("scriptally_active_manuscript_id", id); } catch { /* */ } }, ms);
  const m = MUTATIONS[MUT];
  if (m?.js) await page.addInitScript(m.js);
  await openRoute(page, route, size);
  if (m?.css) await page.addStyleTag({ content: m.css });
  if (route === "/queries/packages") await page.locator('[data-pk39="labels"]').first().waitFor({ state: "visible", timeout: 30_000 });
  await page.waitForTimeout(1500);
}
const pg = `[data-pk26="page"]`;
const label = (page: Page, id: string) => page.locator(`${pg} [data-pk39="labels"] [data-pkid="${id}"]`).first();
const box = (page: Page, sel: string) => page.evaluate((s) => {
  const e = [...document.querySelectorAll(s)].find((x) => (x as HTMLElement).offsetParent || getComputedStyle(x).position === "fixed");
  if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, top: r.top, bottom: r.bottom };
}, sel);
const bg = (page: Page, sel: string) => page.evaluate((s) => { const e = [...document.querySelectorAll(s)].find((x) => (x as HTMLElement).offsetParent || getComputedStyle(x).position === "fixed"); return e ? getComputedStyle(e).backgroundColor : null; }, sel);
const hexRgb = (h: string) => `rgb(${parseInt(h.slice(1, 3), 16)}, ${parseInt(h.slice(3, 5), 16)}, ${parseInt(h.slice(5, 7), 16)})`;
const near = (a: number | undefined, b: number | undefined, t: number) => a != null && b != null && Math.abs(a - b) <= t;

test.describe.configure({ mode: "default" }); /* each lock reports on its own; a failure re-seeds (seedPk40 cleans first) */
test.beforeAll(() => { console.log(seed()); });
test.afterAll(() => { console.log(seed("--clean")); });

/* ── L1 · the header is the Contact list's ── */
for (const size of SIZES) {
  test(`L1 the header card and title equal the Contact list's at ${size.width}; one "Pro"`, async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger(`L1-${size.width}`);
    await open(page, size, "pk40-ms", "/agents");
    await page.locator(".cl25-card").first().waitFor({ state: "visible", timeout: 30_000 });
    const clCard = await box(page, ".cl25-card"), clTitle = await box(page, ".cl25-card h1");
    await open(page, size);
    const card = await box(page, `${pg} .pk39-card`), title = await box(page, `${pg} .pk39-card h1`);
    L.check("both cards measured", !!clCard && !!card && clCard.w > 400, JSON.stringify({ clCard, card }));
    for (const k of ["x", "y", "w", "h"] as const) {
      L.check(`card ${k} = the Contact list's (±1)`, near(card?.[k], clCard?.[k], 1), `${card?.[k]} vs ${clCard?.[k]}`);
      L.check(`title ${k} = the Contact list's (±1)`, near(title?.[k], clTitle?.[k], 1), `${title?.[k]} vs ${clTitle?.[k]}`);
    }
    const hl = await page.evaluate((p) => { const e = document.querySelector(`${p} .pk39-card [data-pk39="hl"]`); return e ? getComputedStyle(e).backgroundImage : ""; }, pg);
    L.check("the highlighter is #cfe1ea", hl.includes("rgb(207, 225, 234)"), hl);
    L.check("the title reads Submission packages", ((await page.locator(`${pg} [data-pk39="title"]`).first().innerText()).replace(/\s+/g, " ").trim()).startsWith("Submission packages"), "title");
    const pro = await page.evaluate((p) => { const root = document.querySelector(p)!; return [...root.querySelectorAll("*")].filter((e) => (e as HTMLElement).offsetParent && [...e.childNodes].some((n) => n.nodeType === 3 && /\bpro\b/i.test(n.textContent ?? ""))).map((e) => `${e.tagName}.${(e as HTMLElement).className}:${(e as HTMLElement).innerText.trim().slice(0, 20)}`); }, pg);
    L.check("exactly one element on the page reads Pro", pro.length === 1, JSON.stringify(pro));
    L.check("…the stamp, titled “Included with your Pro plan”", (await page.locator(`${pg} [data-pk39="pro"][title="Included with your Pro plan"]`).count()) === 1, "stamp");
    L.done(13);
  });
}

/* ── L2 · colour ── */
test("L2 a colour picked reaches the label, both headers, the showcase card and the list tile; no field reads Harbour", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("L2");
  await open(page, SIZES[0]);
  const harbour = hexRgb("#1d4b63"), plum = hexRgb("#583a5a");
  L.check("a package without the field: its label is Harbour", (await bg(page, `${pg} [data-pk39="labels"] [data-pkid="pk40-std"]`)) === harbour, String(await bg(page, `${pg} [data-pk39="labels"] [data-pkid="pk40-std"]`)));
  L.check("…its list tile too", (await bg(page, `${pg} [data-row="pk:pk40-std"] [data-pk39="list-tile"]`)) === harbour, String(await bg(page, `${pg} [data-row="pk:pk40-std"] [data-pk39="list-tile"]`)));
  await label(page, "pk40-draft").click();
  await page.waitForTimeout(400);
  await page.locator(`${pg} [data-pk40="open"] [data-pk39="tile"]`).first().click();
  await page.waitForTimeout(300);
  L.check("the picker opened", (await page.locator('[data-pk39="picker"]').count()) === 1, "picker");
  L.check("…with 12 icons and 8 colours", (await page.locator('[data-pk39="picker"] [data-ic]').count()) === 12 && (await page.locator('[data-pk39="picker"] [data-col]').count()) === 8, "counts");
  await page.locator('[data-pk39="picker"] [data-col="plum"]').click();
  await page.waitForTimeout(1500);
  const where: [string, string][] = [
    ["the label", `${pg} [data-pk39="labels"] [data-pkid="pk40-draft"]`],
    ["the builder's header", `${pg} [data-pk40="open"][data-pkg="pk40-draft"] [data-pk39="pkg-head"]`],
    ["the showcase card's header", `${pg} [data-show="prove:pk40-draft"] .p9-ac-h`],
    ["the list tile", `${pg} [data-row="pk:pk40-draft"] [data-pk39="list-tile"]`],
  ];
  for (const [w, s] of where) { const v = await bg(page, s); L.check(`${w} is Plum`, v === plum, String(v)); }
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  L.check("Escape closes the picker", (await page.locator('[data-pk39="picker"]').count()) === 0, "picker");
  L.check("…and focus returns to the tile", await page.evaluate(() => document.activeElement?.getAttribute("data-pk39") === "tile"), "focus");
  await page.locator(`${pg} [data-pk40="open"] [data-pk38="figures"]`).first().click();
  await page.waitForTimeout(800);
  const d = await bg(page, '[data-pk39="pkd-head"]');
  L.check("the drawer's header is Plum", d === plum, String(d));
  const st = stored();
  L.check("stored as the key, never the hex", st["pk40-draft"]?.colour === "plum", JSON.stringify(st["pk40-draft"]));
  L.check("…and the others still have no colour field (they read as Harbour)", st["pk40-std"]?.colour === undefined, JSON.stringify(st["pk40-std"]?.colour));
  L.done(13);
});

/* ── L3 · labels ── */
for (const size of SIZES) {
  test(`L3 the labels row spans the content width; none under 200; none ringed at ${size.width}`, async ({ page }) => {
    test.setTimeout(180_000);
    const L = new Ledger(`L3-${size.width}`);
    await open(page, size);
    const r = await page.evaluate((p) => {
      const root = document.querySelector(p)!;
      const row = root.querySelector(".p9-pkl")!.getBoundingClientRect(), col = root.querySelector('[data-pk39="builder"]')!.getBoundingClientRect();
      const labels = [...root.querySelectorAll(".p9-pkl-b")].map((b) => ({ id: b.getAttribute("data-pkid"), w: b.getBoundingClientRect().width, ring: /0px 0px 0px 4px/.test(getComputedStyle(b).boxShadow), on: b.getAttribute("aria-pressed") === "true" }));
      return { row: { l: row.left, w: row.width }, col: { l: col.left, w: col.width }, labels };
    }, pg);
    L.check("labels are drawn (4 live)", r.labels.length === 4, JSON.stringify(r.labels));
    L.check("the row starts at the content's left (±1)", near(r.row.l, r.col.l, 1), JSON.stringify(r));
    L.check("the row spans the content width (±1)", near(r.row.w, r.col.w, 1), JSON.stringify(r));
    L.check("no label is narrower than 200", r.labels.every((x) => x.w >= 200 - 0.5), JSON.stringify(r.labels.map((x) => x.w)));
    /* v39.1 C: no ring on any label; the selected one is marked by the bar beneath it */
    L.check("no label is ringed", r.labels.every((x) => !x.ring), JSON.stringify(r.labels));
    L.check("exactly one label is selected", r.labels.filter((x) => x.on).length === 1, JSON.stringify(r.labels));
    L.done(6);
  });
}

/* ── L4 · the builder ── */
for (const size of SIZES) {
  test(`L4 two cards, 24 apart, headers level and equal; one status pill and no stepper at ${size.width}`, async ({ page }) => {
    test.setTimeout(180_000);
    const L = new Ledger(`L4-${size.width}`);
    await open(page, size);
    const lib = await box(page, `${pg} [data-pk39="lib"]`), lh = await box(page, `${pg} [data-pk39="lib-head"]`);
    const open1 = await box(page, `${pg} [data-pk40="open"]`), ph = await box(page, `${pg} [data-pk39="pkg-head"]`);
    L.check("both cards measured", !!lib && !!open1 && !!lh && !!ph, JSON.stringify({ lib, open1 }));
    L.check("the headers are the same height (±0.5)", near(lh?.h, ph?.h, 0.5), `${lh?.h} vs ${ph?.h}`);
    L.check("…and level (equal tops)", near(lh?.top, ph?.top, 0.5), `${lh?.top} vs ${ph?.top}`);
    L.check("the cards are 24 ± 1 apart", near((open1?.x ?? 0) - ((lib?.x ?? 0) + (lib?.w ?? 0)), 24, 1), `${(open1?.x ?? 0) - ((lib?.x ?? 0) + (lib?.w ?? 0))}`);
    L.check(`Your materials is ${size.width === 1512 ? 320 : 280} wide`, near(lib?.w, size.width === 1512 ? 320 : 280, 1), `${lib?.w}`);
    const sep = await page.evaluate((p) => { const g = document.querySelector(`${p} [data-pk39="grid"]`)!; const cs = getComputedStyle(g); return { bg: cs.backgroundColor, shadow: cs.boxShadow, kids: [...g.children].length }; }, pg);
    L.check("no outer panel around the two cards", (sep.bg === "rgba(0, 0, 0, 0)" || sep.bg === "transparent") && sep.shadow === "none" && sep.kids === 2, JSON.stringify(sep));
    L.check("no stepper row", (await page.locator(`${pg} .p6-lc, ${pg} .p6-lc-s`).count()) === 0, "stepper");
    L.check("exactly one status pill and no stage", (await page.locator(`${pg} [data-pk39="status"]`).count()) === 1 && (await page.locator(`${pg} [data-pk39="stage"]`).count()) === 0, "status");
    L.done(8);
  });
}

/* ── L5 · rename in place (Nick's ruling: a sent package is renamed too; the padlock is in the stage) ── */
test("L5 rename writes once (draft and sent), Escape writes nothing, a sent package's one padlock is in the stage", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("L5");
  await open(page, SIZES[0]);
  const toasts: string[] = [];
  await page.exposeFunction("pk39Toast", (t: string) => toasts.push(t));
  await page.evaluate(() => new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) { const t = (n as HTMLElement).innerText ?? ""; if (/Renamed to/.test(t)) (window as unknown as { pk39Toast: (t: string) => void }).pk39Toast(t); } }).observe(document.body, { subtree: true, childList: true }));
  const name = () => page.locator(`${pg} [data-pk40="open"] [data-pk39="name"]`).first();
  for (const [id, from, to] of [["pk40-ready", "Ready one", "Ready renamed"], ["pk40-std", "Standard", "Standard renamed"]] as const) {
    await label(page, id).click(); await page.waitForTimeout(400);
    L.check(`${id}: the name is editable in place`, (await name().getAttribute("contenteditable")) === "plaintext-only", String(await name().getAttribute("contenteditable")));
    /* Escape writes nothing */
    const before = toasts.length;
    await name().click(); await page.keyboard.press("Meta+A"); await page.keyboard.type("Never saved"); await page.keyboard.press("Escape");
    await page.waitForTimeout(900);
    L.check(`${id}: Escape restores the name`, (await name().innerText()).trim() === from, await name().innerText());
    L.check(`${id}: …and writes nothing`, toasts.length === before && stored()[id]?.packageName === from, JSON.stringify({ toasts, stored: stored()[id]?.packageName }));
    /* Enter writes once */
    await name().click(); await page.keyboard.press("Meta+A"); await page.keyboard.type(to); await page.keyboard.press("Enter");
    await page.waitForTimeout(1500);
    L.check(`${id}: one write (one rename receipt)`, toasts.length === before + 1, JSON.stringify(toasts));
    L.check(`${id}: stored`, stored()[id]?.packageName === to, String(stored()[id]?.packageName));
    L.check(`${id}: the label shows it`, ((await label(page, id).locator(".p9-pkl-t b").innerText()).trim()) === to, await label(page, id).locator(".p9-pkl-t b").innerText());
    const locks = await page.evaluate((p) => { const o = document.querySelector(`${p} [data-pk40="open"]`)!; return { stage: o.querySelectorAll('[data-pk39="stage-lock"]').length, name: o.querySelectorAll(".p9-po-tt .p9-po-lk, .p9-po-tt [data-pk39='name-lock']").length }; }, pg);
    if (id === "pk40-std") {
      L.check(`${id} (sent): exactly one padlock, in the stage`, locks.stage === 1, JSON.stringify(locks));
      L.check(`${id} (sent): none beside the name`, locks.name === 0, JSON.stringify(locks));
      L.check(`${id} (sent): the padlock's words`, (await page.locator(`${pg} [data-pk39="stage-lock"]`).first().getAttribute("title")) === "Locked: what each agent got stays as it was. You can still rename it; to change what goes out, make a copy.", "title");
    } else L.check(`${id} (not sent): no padlock`, locks.stage === 0 && locks.name === 0, JSON.stringify(locks));
    /* put it back */
    await name().click(); await page.keyboard.press("Meta+A"); await page.keyboard.type(from); await page.keyboard.press("Enter");
    await page.waitForTimeout(1200);
  }
  L.done(16);
});

/* ── L6 · the full lists ── */
test("L6 every package once; one piece type at a time; switching keeps scrollTop; rates are packageReplies'; ranked first", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("L6");
  await open(page, SIZES[0]);
  const rows = (sel: string) => page.evaluate((s) => [...document.querySelectorAll(s)].filter((e) => (e as HTMLElement).offsetParent).map((e) => ({ row: e.getAttribute("data-row") ?? "", rate: e.getAttribute("data-rate") ?? "", txt: (e as HTMLElement).innerText.replace(/\s+/g, " ").trim() })), sel);
  const pk = await rows(`${pg} [data-pk39="list-pk"] .p9-rl-r`);
  const ids = pk.map((r) => r.row);
  L.check("Every package lists the fixture's five", pk.length === 5, JSON.stringify(ids));
  L.check("…each exactly once", new Set(ids).size === ids.length && ["pk40-std", "pk40-std2", "pk40-old", "pk40-ready", "pk40-draft"].every((x) => ids.includes(`pk:${x}`)), JSON.stringify(ids));
  const rate = Object.fromEntries(pk.map((r) => [r.row, r.rate]));
  L.check("Standard is ranked at 40% (packageReplies)", rate["pk:pk40-std"] === "40", JSON.stringify(rate));
  L.check("Standard 2 and Old one are too early", rate["pk:pk40-std2"] === "early" && rate["pk:pk40-old"] === "early", JSON.stringify(rate));
  L.check("Ready one and Draft one are not sent", rate["pk:pk40-ready"] === "none" && rate["pk:pk40-draft"] === "none", JSON.stringify(rate));
  const order = (rs: { rate: string }[]) => { const k = rs.map((r) => (r.rate === "none" ? 2 : r.rate === "early" ? 1 : 0)); return k.every((v, i) => i === 0 || v >= k[i - 1]); };
  L.check("Packages: ranked, then too early, then not sent", order(pk), JSON.stringify(pk.map((r) => r.rate)));
  const want: Record<string, Record<string, string>> = { let: { "let:pk40-let-a": "33", "let:pk40-let-b": "early" }, syn: { "syn:pk40-syn": "33" }, ver: { "ver:pk40-v1": "30" } };
  for (const k of ["let", "syn", "ver"] as const) {
    const scroller = await page.evaluate((p) => { const s = [...document.querySelectorAll(".wpg-scroll")].find((x) => x.querySelector(p)) as HTMLElement; const t = s.querySelector('[data-pk39="list-pc"]') as HTMLElement; t.scrollIntoView({ block: "center" }); return s.scrollTop; }, pg);
    await page.waitForTimeout(200);
    const before = await page.evaluate((p) => ([...document.querySelectorAll(".wpg-scroll")].find((x) => x.querySelector(p)) as HTMLElement).scrollTop, pg);
    await page.locator(`${pg} [data-pk39="list-pc"] [data-rlk="${k}"]`).click();
    await page.waitForTimeout(400);
    const after = await page.evaluate((p) => ([...document.querySelectorAll(".wpg-scroll")].find((x) => x.querySelector(p)) as HTMLElement).scrollTop, pg);
    L.check(`${k}: switching keeps scrollTop (±1)`, scroller >= 0 && near(after, before, 1), `${before} → ${after}`);
    const pc = await rows(`${pg} [data-pk39="list-pc"] .p9-rl-r`);
    L.check(`${k}: rows are shown`, pc.length > 0, JSON.stringify(pc));
    L.check(`${k}: every row is of that one type`, pc.every((r) => r.row.startsWith(`${k}:`)), JSON.stringify(pc.map((r) => r.row)));
    for (const [row, r] of Object.entries(want[k])) L.check(`${row}: rate ${r}`, pc.find((x) => x.row === row)?.rate === r, JSON.stringify(pc));
    L.check(`${k}: nothing too early above a ranked row`, order(pc), JSON.stringify(pc.map((r) => r.rate)));
    const sel = await page.evaluate(() => [...document.querySelectorAll('[data-pk39="list-pc"] [role="tab"]')].map((b) => b.getAttribute("aria-selected")));
    L.check(`${k}: one tab selected`, sel.filter((x) => x === "true").length === 1, JSON.stringify(sel));
  }
  /* a showcase and its row agree */
  const best = await page.evaluate(() => (document.querySelector('[data-show="best:pk40-std"] .p9-ag3-d') as HTMLElement | null)?.innerText ?? "");
  L.check("the top three and the list agree for Standard (40%)", best.startsWith("40%") && rate["pk:pk40-std"] === "40", best);
  L.done(25);
});

/* ── L7 · How it works ── */
test("L7 How it works: both doors, five steps, Escape closes, focus back to the opener, the old dialog gone", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("L7");
  for (const [ms, door] of [["pk40-ms", `${pg} [data-pk39="how"]`], ["pk40-new", `${pg} .p6-pb-bt .p6-hd-s`]] as const) {
    await open(page, SIZES[0], ms);
    const b = page.locator(door).first();
    L.check(`${ms}: the door is there`, (await b.count()) === 1, door);
    await b.click(); await page.waitForTimeout(500);
    L.check(`${ms}: the guide opened`, (await page.locator('[data-pk39="hw"]').count()) === 1, "hw");
    L.check(`${ms}: five steps`, (await page.locator('[data-pk39="hw"] .p9-hw2-dots button').count()) === 5, String(await page.locator('[data-pk39="hw"] .p9-hw2-dots button').count()));
    L.check(`${ms}: it opens on step 1 of 5`, (await page.locator('[data-pk39="hw-step"]').innerText()).trim() === "Step 1 of 5", await page.locator('[data-pk39="hw-step"]').innerText());
    L.check(`${ms}: focus is on Next`, await page.evaluate(() => document.activeElement?.getAttribute("data-pk39") === "hw-next"), "focus");
    for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowRight");
    L.check(`${ms}: → reaches step 5, whose button reads Got it`, (await page.locator('[data-pk39="hw-step"]').innerText()).trim() === "Step 5 of 5" && (await page.locator('[data-pk39="hw-next"]').innerText()).trim() === "Got it", "step 5");
    L.check(`${ms}: the old dialog's markup is absent`, (await page.locator('.p6-hwm, [data-pk26="hwm"], [data-pk39="hw"] .p6-an').count()) === 0, "hwm");
    await page.keyboard.press("Escape"); await page.waitForTimeout(400);
    L.check(`${ms}: Escape closes it`, (await page.locator('[data-pk39="hw"]').count()) === 0, "hw");
    L.check(`${ms}: focus returns to the opener`, await b.evaluate((e) => e === document.activeElement), "focus");
  }
  L.done(18);
});

/* ── L8 · the pieces band, in pixels ── */
for (const size of SIZES) {
  test(`L8 the pieces band is painted across the sheet's full width at ${size.width}`, async ({ page }) => {
    test.setTimeout(180_000);
    const L = new Ledger(`L8-${size.width}`);
    await open(page, size);
    const geo = await page.evaluate((p) => {
      const s = [...document.querySelectorAll(".wpg-scroll")].find((x) => x.querySelector(p)) as HTMLElement;
      const band = s.querySelector('[data-pk39="pieces-band"]') as HTMLElement;
      /* the band is taller than the viewport: its top goes 120 below the sheet's top, and the strip is read 40 into it */
      band.scrollIntoView({ block: "start" }); s.scrollBy(0, -120);
      const sr = s.getBoundingClientRect(), br = band.getBoundingClientRect();
      return { sheetL: sr.left, sheetR: sr.left + s.clientWidth, y: Math.round(br.top + 30), bandL: br.left, bandR: br.right };
    }, pg);
    await page.waitForTimeout(300);
    const y = (await page.evaluate((p) => { const b = [...document.querySelectorAll('[data-pk39="pieces-band"]')].find((x) => (x as HTMLElement).offsetParent) as HTMLElement; return Math.round(b.getBoundingClientRect().top + 40); }, pg));
    const shot = await page.screenshot({ clip: { x: 0, y, width: size.width, height: 1 } });
    const px = await page.evaluate(async ({ b64, xs }) => {
      const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
      const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const g = c.getContext("2d")!; g.drawImage(img, 0, 0);
      return xs.map((x) => Array.from(g.getImageData(Math.round(x), 0, 1, 1).data.slice(0, 3)).join(","));
    }, { b64: shot.toString("base64"), xs: [geo.sheetL + 1, geo.sheetR - 2, (geo.sheetL + geo.bandL) / 2] });
    L.check("the band and the sheet are measured", geo.sheetR - geo.sheetL > 600 && geo.bandL > geo.sheetL, JSON.stringify(geo));
    L.check("the band's ground at the sheet's left edge (±1)", px[0] === "235,229,220", JSON.stringify(px));
    L.check("…at the sheet's right edge (±1)", px[1] === "235,229,220", JSON.stringify(px));
    L.check("…and between the edge and the column", px[2] === "235,229,220", JSON.stringify(px));
    L.done(4);
  });
}
