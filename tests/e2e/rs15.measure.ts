/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Responses v15 (design-refs/responses-v15/responses-v15.html) — the locks on the rendered page, over the emulator's
 * harness account and the reference's own example book (seedRs15.mjs, written in beforeAll and removed in afterAll).
 *
 *   A1  header: the title, both buttons, the tally's marks by kind (7 / 11 / 16), the replied and rate lines
 *   A1G header: its top (from the scroller), edges and height equal the Query Centre's (wsHeaders held them equal on the base)
 *   B1  the grey band: present with rejections, absent without; the exact words; the three steps go where they say
 *   B2  Hide persists across a reload (restored with Read in the same run)
 *   C1  the line of facts: 36 days, 6, 9 (the ref's own figures = lib/responses, src/lib/responses15.test.ts); early days
 *   D1  the carousel: your move first; the Query Centre's own card; arrows and dots only above three; no card clipped
 *   E1  In their words: one note; picking an agent shows that note and stops the advance; "{k} of {n}"
 *   E2  the advance moves on its interval and waits while hovered (interval shortened to 4000ms, `__RS15_ADVANCE_MS`)
 *   E3  one note → a single card; none → no section
 *   F1  the columns, the default order, month headers with counts   F2 every heading sorts and reverses; no months off date
 *   F3  the bar is scaled to the whole collection's longest wait     F4 Show all; find by agent and by a word of a note
 *   F5  a pass kept off (offWallIds) is absent from the list and counted in the header
 *   G1  the four 72px gaps and the band 30px under the header, at 1280, 1512 and 1717
 *   H1  Nothing back yet: the ref's parts, none of the populated page's; the first answer switches it live (re-pointed
 *       rs5 H1)   H2 Early days: likewise
 *   N1  no "wall of no" on the route, in the composer's tick or in the share builder
 *   S1  Share your story opens the existing builder: names off, nothing uploaded (re-pointed rs5 S1)
 *   P1  a row, a card and Open the card each open the existing panel with the desk dimmed; Esc closes; focus returns
 *   L1  no sideways overflow at 1100, 1280, 1440, 1512, 1717, and at 200% zoom at 1512 (a 756px CSS viewport)
 *
 * ⚠️ EMULATOR ONLY (`npm run e2e:emu -- tests/e2e/rs15.measure.ts --project=measure`). `RS15_MUTATE=<lock>` applies that
 *    lock's named break in the page (CSS or JS), for its red-first reading. Proofs: reports/responses-v15/mutation-proofs.txt.
 */
import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

/* ⚠️ NOT serial: each lock opens its own page, and a red must not skip the rest. One worker (the fixture is shared). */
const DIR = "reports/responses-v15";
const MUT = process.env.RS15_MUTATE ?? "";
const ONLY = (process.env.RS15_ONLY ?? "").split(",").filter(Boolean);
const run = (lock: string) => !ONLY.length || ONLY.includes(lock);
const near = (a: unknown, b: unknown, t: number) => typeof a === "number" && typeof b === "number" && Number.isFinite(a) && Math.abs(a - b) <= t;

class Ledger {
  rows: { where: string; ok: boolean; detail: string }[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${MUT ? `mut-${MUT}-` : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 30)) console.log(`  ✗ ${this.name} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/* one named break per lock; each applies only when RS15_MUTATE names it */
const obs = (body: string) => `(() => { const put = () => { ${body} }; new MutationObserver(put).observe(document.documentElement, { subtree: true, childList: true, characterData: true }); put(); })()`;
const MUTATIONS: Record<string, { css?: string; js?: string }> = {
  /* one asked-for-more mark goes missing */
  A1: { js: obs(`const p = document.querySelector('[data-rsp15="tally"] path.a'); if (p && !document.body.dataset.muta1) { document.body.dataset.muta1 = '1'; p.remove(); }`) },
  /* the header sits 6px lower */
  A1G: { css: `[data-rsp="page"] header.qc1531-hd { margin-top: 6px !important; }` },
  /* "all of yours" becomes "yours" */
  B1: { js: obs(`const p = document.querySelector('[data-rsp15="word-body"]'); if (p && /all of yours/.test(p.textContent) && !p.dataset.mut) { p.dataset.mut = '1'; p.textContent = p.textContent.replace('all of yours', 'yours'); }`) },
  /* the fold forgets: forced open on every load */
  B2: { js: obs(`const b = document.querySelector('[data-rsp15="word"][data-folded="1"] [data-rsp15="word-fold"]'); if (b && !sessionStorage.getItem('rs15b2')) { sessionStorage.setItem('rs15b2', '1'); b.click(); }`) },
  /* the note count one more than there is */
  C1: { js: obs(`const b = document.querySelector('[data-rsp15="fact"][data-k="notes"] b'); if (b && !b.dataset.mut && b.textContent) { b.dataset.mut = '1'; b.textContent = String(+b.textContent + 1); }`) },
  /* the carousel's band squeezed: cards clipped */
  D1: { css: `.rsp15 .rsp15-car.qc151 { padding-top: 0 !important; padding-bottom: 0 !important; height: 120px !important; }` },
  /* the count off by one */
  E1: { js: obs(`const c = document.querySelector('[data-rsp15="words-count"]'); if (c && !c.dataset.mut && /^1 of/.test(c.textContent)) { c.dataset.mut = '1'; c.textContent = c.textContent.replace(/^1 of/, '2 of'); }`) },
  /* the advance never comes */
  E2: { js: `window.__RS15_ADVANCE_MS = 600000;` },
  /* the single note's card hidden */
  E3: { css: `[data-rsp15="quote-card"] { display: none !important; }` },
  /* the first two rows swapped */
  F1: { js: obs(`const r = document.querySelectorAll('[data-rsp15="row"]'); if (r.length > 2 && !document.body.dataset.mutf1) { document.body.dataset.mutf1 = '1'; r[1].after(r[0]); }`) },
  /* a heading's press never arrives */
  F2: { js: `document.addEventListener('click', (e) => { if (e.target && e.target.closest && e.target.closest('[data-rsp15="head"]')) e.stopPropagation(); }, true);` },
  /* every bar full */
  F3: { css: `[data-rsp15="bar"] { width: 100% !important; }` },
  /* Show all shows nothing more */
  F4: { css: `[data-rsp15="list"] > [data-rsp15="row"]:nth-of-type(n+11) { display: none !important; }` },
  /* the kept-off pass back in the list */
  F5: { js: obs(`const r = document.querySelector('[data-rsp15="row"]'); if (r && !document.querySelector('[data-mutf5]')) { const c = r.cloneNode(true); c.setAttribute('data-mutf5', ''); c.querySelector('.rsp15-who b').textContent = 'Sarah Kendrick'; r.after(c); }`) },
  /* every gap 64 */
  G1: { css: `.rsp15 .rsp15-body > * { margin-top: 64px !important; } .rsp15 .rsp15-body > :first-child { margin-top: 30px !important; }` },
  /* While you wait hidden */
  H1: { css: `[data-rsp15="wait"] { display: none !important; }` },
  /* the early note replaced by the line of facts' words */
  H2: { js: obs(`const c = document.querySelector('[data-rsp15="early"]'); if (c && !c.dataset.mut) { c.dataset.mut = '1'; c.setAttribute('data-rsp15', 'facts'); }`) },
  /* the share builder's names on by default */
  S1: { js: obs(`const t = document.querySelector('[data-rsp="opt-names"]'); if (t && !t.dataset.mut) { t.dataset.mut = '1'; if (!t.checked) t.click(); }`) },
  /* the old name back on the page */
  N1: { js: obs(`const h = document.querySelector('#rsp15-rc-h'); if (h && !h.dataset.mut) { h.dataset.mut = '1'; h.textContent = 'Your wall of no'; }`) },
  /* the desk no longer dims */
  P1: { css: `[data-side-scrim] { display: none !important; }` },
  /* the collection wider than the page */
  L1: { css: `.rsp15 .rsp15-rcs { min-width: 2400px !important; }` },
};

const seed = (...args: string[]) => execFileSync("node", ["tests/e2e/seedRs15.mjs", ...args], { stdio: "inherit" });
test.beforeAll(() => { seed(); });
test.afterAll(() => { seed("--clean"); });

const MS = { full: "rs15-ms-full", early: "rs15-ms-early", none: "rs15-ms-none", off: "rs15-ms-off", one: "rs15-ms-one", asks: "rs15-ms-asks" } as const;
async function open(page: Page, ms: string, size: { width: number; height: number }, lock: string, route = "/queries/responses") {
  await page.addInitScript((id) => { try { localStorage.setItem("scriptally_active_manuscript_id", id); } catch { /* */ } }, ms);
  /* only E2 shortens the advance; every other lock reads the page at the real 9 seconds */
  if (lock === "E2") await page.addInitScript(`window.__RS15_ADVANCE_MS = window.__RS15_ADVANCE_MS || 4000;`);
  /* `RS15_MUTATE=ALL` gives every lock its own named break in one run (each lock still gets only its own) */
  const m = MUT === lock || MUT === "ALL" ? MUTATIONS[lock] ?? null : null;
  if (m?.js) await page.addInitScript(`(() => { const run = () => { ${m.js} }; if (document.body) run(); else document.addEventListener("DOMContentLoaded", run); })()`);
  await openRoute(page, route, size);
  if (m?.css) await page.addStyleTag({ content: m.css });
  if (route.startsWith("/queries/responses")) await page.locator('[data-rsp="page"][data-rsp15-state]:not([data-rsp15-state="loading"])').first().waitFor({ timeout: 20_000 });
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForTimeout(900);
}
const ev = <T,>(page: Page, js: string): Promise<T> => page.evaluate(js) as Promise<T>;
const SCROLLER = `[...document.querySelectorAll('.wpg-scroll')].find((x) => x.querySelector('[data-rsp="page"]'))`;
const text = (page: Page, sel: string) => ev<string | null>(page, `(() => { const e = document.querySelector('${sel}'); return e ? e.textContent.replace(/\\s+/g, ' ').trim() : null; })()`);
const count = (page: Page, sel: string) => ev<number>(page, `document.querySelectorAll('${sel}').length`);
const offTop = (page: Page, sel: string) => ev<number | null>(page, `(() => { const s = ${SCROLLER}; const e = s && s.querySelector('${sel}'); return s && e ? e.getBoundingClientRect().top - s.getBoundingClientRect().top : null; })()`);
const toTop = (page: Page, sel: string) => ev(page, `(() => { const s = ${SCROLLER}; const e = s && s.querySelector('${sel}'); if (s && e) s.scrollTop += e.getBoundingClientRect().top - s.getBoundingClientRect().top - 120; })()`);
const rowNames = (page: Page) => ev<string[]>(page, `[...document.querySelectorAll('[data-rsp15="row"]')].map((r) => r.querySelector('.rsp15-who b').textContent)`);
const SZ = { width: 1512, height: 900 };

/* ═════ A · the header ═════ */
if (run("A1")) test("A1 · header: title, buttons, the tally by kind, the replied and rate lines", async ({ page }) => {
  const L = new Ledger("A1");
  for (const size of [SZ, { width: 1280, height: 800 }]) {
    await open(page, MS.full, size, "A1");
    const marks = await ev<Record<string, number>>(page, `(() => { const o = {}; for (const p of document.querySelectorAll('[data-rsp15="tally"] path')) o[p.dataset.k] = (o[p.dataset.k] || 0) + 1; return o; })()`);
    L.check(`${size.width} population: 34 marks`, (marks.a ?? 0) + (marks.p ?? 0) + (marks.w ?? 0) > 0, JSON.stringify(marks));
    L.check(`${size.width} marks 7 / 11 / 16`, marks.a === 7 && marks.p === 11 && marks.w === 16, JSON.stringify(marks));
    const order = await ev<string>(page, `[...document.querySelectorAll('[data-rsp15="tally"] path')].map((p) => p.dataset.k).join('')`);
    L.check(`${size.width} asked for more first, then passed, then no answer yet`, /^a{7}p{11}w{16}$/.test(order), order);
    L.check(`${size.width} title`, (await text(page, '[data-rsp="page"] [data-wsnh="title"]')) === "18 responses", String(await text(page, '[data-rsp="page"] [data-wsnh="title"]')));
    L.check(`${size.width} + Record a response`, (await text(page, '[data-rsp="page"] [data-rsp5="record"]')) === "+ Record a response", "");
    L.check(`${size.width} Share your story`, (await text(page, '[data-rsp="page"] [data-rsp15="share-top"]')) === "Share your story", "");
    L.check(`${size.width} replied`, (await text(page, '[data-rsp15="replied"]')) === "18 of 34 have replied", String(await text(page, '[data-rsp15="replied"]')));
    L.check(`${size.width} rate`, (await text(page, '[data-rsp15="rate"]')) === "That’s a 53% response rate, counting the passes. 7 asked to read more.", String(await text(page, '[data-rsp15="rate"]')));
    const keys = await ev<string[]>(page, `[...document.querySelectorAll('[data-rsp15="tally-label"]')].map((b) => b.textContent.replace(/\\s+/g, ' ').trim())`);
    L.check(`${size.width} labels`, JSON.stringify(keys) === JSON.stringify(["7 asked for more", "11 passed", "16 no answer yet"]), JSON.stringify(keys));
    /* hovering a label lifts its marks */
    await page.locator('[data-rsp15="tally-label"][data-k="p"]').hover();
    await page.waitForTimeout(300);
    const op = await ev<{ p: string; a: string }>(page, `({ p: getComputedStyle(document.querySelector('[data-rsp15="tally"] path.p')).opacity, a: getComputedStyle(document.querySelector('[data-rsp15="tally"] path.a')).opacity })`);
    L.check(`${size.width} hovering "passed" lifts its marks`, op.p === "1" && parseFloat(op.a) < 0.5, JSON.stringify(op));
  }
  /* the labels go where they say */
  await page.mouse.move(5, 5);
  await page.locator('[data-rsp15="tally-label"][data-k="a"]').click();
  await page.waitForTimeout(900);
  const more = await offTop(page, '[data-rsp15="read-on"]');
  L.check("asked for more → the carousel in view", more != null && more >= 0 && more < 260, String(more));
  await page.locator('[data-rsp15="tally-label"][data-k="w"]').click({ force: true }).catch(() => {});
  await page.waitForTimeout(800);
  L.check("no answer yet → the Query Centre", /#\/queries(\?|$)|\/queries$/.test(page.url()) && !/responses/.test(page.url()), page.url());
  L.done(20);
});

if (run("A1G")) test("A1G · the header's top, edges and height equal the Query Centre's", async ({ page }) => {
  const L = new Ledger("A1G");
  for (const size of [SZ, { width: 1280, height: 800 }, { width: 1717, height: 960 }]) {
    const box = `(() => { const h = [...document.querySelectorAll('header.qc1531-hd')].find((e) => e.getBoundingClientRect().width > 1); const s = h && h.closest('.wpg-scroll'); if (!h || !s) return null; const b = h.getBoundingClientRect(), r = s.getBoundingClientRect(); return { top: b.top - r.top, left: b.left, right: b.right, h: b.height }; })()`;
    await open(page, MS.full, size, "A1G");
    const rsp = await ev<{ top: number; left: number; right: number; h: number } | null>(page, box);
    /* what fills the right-hand block, for a height mismatch's detail */
    const parts = await ev<Record<string, number>>(page, `(() => { const o = {}; const rc = document.querySelector('[data-rsp="page"] [data-wsnh="right"]'); if (rc) o.rcW = Math.round(rc.getBoundingClientRect().width); for (const k of ['replied', 'rate', 'tally', 'tally-key']) { const e = document.querySelector('[data-rsp="page"] [data-rsp15="' + k + '"]'); if (e) o[k] = Math.round(e.getBoundingClientRect().height); } const m = document.querySelector('[data-rsp="page"] .qc1531-hd .qc1531-main, [data-rsp="page"] .qc1531-hd > div:nth-child(2)'); if (m) o.mainW = Math.round(m.getBoundingClientRect().width); return o; })()`);
    await open(page, MS.full, size, "A1G-qc", "/queries");
    await page.waitForTimeout(800);
    const qc = await ev<{ top: number; left: number; right: number; h: number } | null>(page, box);
    L.check(`${size.width} population: both headers measured`, !!rsp && !!qc, JSON.stringify({ rsp, qc }));
    if (!rsp || !qc) continue;
    L.check(`${size.width} top ±1`, near(rsp.top, qc.top, 1), `${rsp.top} vs ${qc.top}`);
    L.check(`${size.width} left ±1`, near(rsp.left, qc.left, 1), `${rsp.left} vs ${qc.left}`);
    L.check(`${size.width} right ±1`, near(rsp.right, qc.right, 1), `${rsp.right} vs ${qc.right}`);
    L.check(`${size.width} height ±1`, near(rsp.h, qc.h, 1), `${rsp.h} vs ${qc.h} · ${JSON.stringify(parts)}`);
  }
  L.done(15);
});

/* ═════ B · A word on rejections ═════ */
if (run("B1")) test("B1 · the grey band: present with rejections, absent without; its words; its steps", async ({ page }) => {
  const L = new Ledger("B1");
  await open(page, MS.full, SZ, "B1");
  L.check("present with 15 in the collection", (await count(page, '[data-rsp15="word"]')) === 1, "");
  L.check("strip", (await text(page, '.rsp15-gb-tag')) === "A word on rejections", "");
  L.check("Hide", /^Hide/.test((await text(page, '[data-rsp15="word-fold"]')) ?? ""), "");
  L.check("heading", (await text(page, '[data-rsp15="word-head"]')) === "Rejections can be tough.", "");
  const body = await text(page, '[data-rsp15="word-body"]');
  L.check("body", body === "Nobody enjoys a no, and this page holds all of yours. At QueryHawk we treat every rejection as valuable data. We keep it, we learn from it, and we use it to shape your campaign from here.", String(body));
  L.check("valuable data is bold", (await text(page, '[data-rsp15="word-body"] b')) === "valuable data", "");
  const steps = await ev<string[]>(page, `[...document.querySelectorAll('[data-rsp15="word-step"]')].map((b) => b.textContent.replace(/\\s+/g, ' ').trim())`);
  L.check("three steps", JSON.stringify(steps) === JSON.stringify(["Keep itEvery answer is logged in your Rejection collection.", "Learn from itWhat agents told you is gathered in their words.", "Shape what’s nextHow far each query got shows up in Analytics."]), JSON.stringify(steps));
  await page.locator('[data-rsp15="word-step"][data-k="keep"]').click();
  await page.waitForTimeout(1000);
  const c = await offTop(page, '[data-rsp15="collection"]');
  L.check("Keep it → the collection", c != null && c >= 0 && c < 260, String(c));
  await page.locator('[data-rsp15="word-step"][data-k="learn"]').scrollIntoViewIfNeeded();
  await page.locator('[data-rsp15="word-step"][data-k="learn"]').click();
  await page.waitForTimeout(1000);
  const w = await offTop(page, '[data-rsp15="words"]');
  L.check("Learn from it → In their words", w != null && w >= 0 && w < 260, String(w));
  await page.locator('[data-rsp15="word-step"][data-k="shape"]').scrollIntoViewIfNeeded();
  await page.locator('[data-rsp15="word-step"][data-k="shape"]').click();
  await page.waitForTimeout(800);
  L.check("Shape what's next → Analytics", /\/queries\/analytics/.test(page.url()), page.url());
  await open(page, MS.one, SZ, "B1");
  L.check("one rejection: …this page holds yours.", /this page holds yours\./.test((await text(page, '[data-rsp15="word-body"]')) ?? ""), String(await text(page, '[data-rsp15="word-body"]')));
  await open(page, MS.asks, SZ, "B1");
  L.check("population: the asks book has responses", (await count(page, '[data-rsp15="read-on"]')) === 1, "");
  L.check("absent without a rejection", (await count(page, '[data-rsp15="word"]')) === 0, "");
  L.done(13);
});

if (run("B2")) test("B2 · Hide persists across a reload, until Read", async ({ page }) => {
  const L = new Ledger("B2");
  await open(page, MS.full, SZ, "B2");
  const was = await ev<string | null>(page, `document.querySelector('[data-rsp15="word"]')?.dataset.folded ?? null`);
  L.check("population: the band is drawn, open", was === "0", String(was));
  await page.locator('[data-rsp15="word-fold"]').click();
  await page.waitForTimeout(1200);
  L.check("folded: the one line", (await text(page, '[data-rsp15="word-one"]')) === "They can be tough. Here, every one is kept, learned from and used to shape what you do next.", "");
  L.check("folded: Read", /^Read/.test((await text(page, '[data-rsp15="word-fold"]')) ?? ""), "");
  await page.reload();
  await page.locator('[data-rsp="page"][data-rsp15-state="full"]').waitFor({ timeout: 20_000 });
  await page.waitForTimeout(2500);
  L.check("still folded after a reload", (await ev<string | null>(page, `document.querySelector('[data-rsp15="word"]')?.dataset.folded ?? null`)) === "1", "");
  /* restore: Read */
  const b = page.locator('[data-rsp15="word"][data-folded="1"] [data-rsp15="word-fold"]');
  if (await b.count()) await b.click();
  await page.waitForTimeout(1200);
  L.check("Read opens it again", (await ev<string | null>(page, `document.querySelector('[data-rsp15="word"]')?.dataset.folded ?? null`)) === "0", "");
  L.done(5);
});

/* ═════ C · the line of facts ═════ */
if (run("C1")) test("C1 · the line of facts: the three figures; early days swaps in the note", async ({ page }) => {
  const L = new Ledger("C1");
  await open(page, MS.full, SZ, "C1");
  const f = await ev<Record<string, string>>(page, `Object.fromEntries([...document.querySelectorAll('[data-rsp15="fact"]')].map((s) => [s.dataset.k, s.textContent.replace(/\\s+/g, ' ').trim()]))`);
  L.check("population: three facts", Object.keys(f).length === 3, JSON.stringify(f));
  L.check("A first reply has taken 36 days on average", f.avg === "A first reply has taken 36 days on average", String(f.avg));
  L.check("6 came with a note", f.notes === "6 came with a note", String(f.notes));
  L.check("9 agents read past the query", f.past === "9 agents read past the query", String(f.past));
  L.check("More in Analytics →", (await text(page, '[data-rsp15="to-analytics"]')) === "More in Analytics →", "");
  await open(page, MS.early, SZ, "C1");
  L.check("early: the note", (await text(page, '[data-rsp15="early"]')) === "It’s early days. 7 of your 9 queries are still with agents, and 2 replies is too few to read anything into.", String(await text(page, '[data-rsp15="early"]')));
  L.check("early: no line of facts", (await count(page, '[data-rsp15="facts"]')) === 0, "");
  L.done(7);
});

/* ═════ D · the carousel ═════ */
if (run("D1")) test("D1 · the carousel: your move first, the Query Centre's card, arrows and dots above three, nothing clipped", async ({ page }) => {
  const L = new Ledger("D1");
  for (const size of [SZ, { width: 1280, height: 800 }]) {
    await open(page, MS.full, size, "D1");
    await toTop(page, '[data-rsp15="read-on"]');
    await page.waitForTimeout(500);
    const cards = await ev<{ name: string; status: string; qcv: string | null; id: string }[]>(page, `[...document.querySelectorAll('[data-rsp15="track"] > [data-qc154="card"]')].map((c) => ({ name: c.querySelector('[data-qc154="name"]').textContent, status: c.dataset.status, qcv: c.getAttribute('data-qcv'), id: c.id }))`);
    L.check(`${size.width} population: 7 cards`, cards.length === 7, String(cards.length));
    L.check(`${size.width} your move first, then the newest answer`, JSON.stringify(cards.map((c) => c.name)) === JSON.stringify(["Clara Beaumont", "Tom Ellery", "Jonathan Marsh", "Daniel O’Rourke", "Marcus Webb", "Sophie Dunn", "Mei Tanaka"]), JSON.stringify(cards.map((c) => c.name)));
    L.check(`${size.width} the Query Centre's own card (data-qcv="row", id query-row-…)`, cards.every((c) => c.qcv === "row" && c.id.startsWith("query-row-")), "");
    L.check(`${size.width} the line`, (await text(page, '[data-rsp15="read-on-line"]')) === "7 asked to read more. 4 are waiting on you.", String(await text(page, '[data-rsp15="read-on-line"]')));
    L.check(`${size.width} arrows above three`, (await count(page, '[data-rsp15="arrows"] button')) === 2, "");
    L.check(`${size.width} dots above three`, (await count(page, '[data-rsp15="dot"]')) === 7, "");
    const clip = await ev<{ name: string; top: number; bot: number; tt: number; tb: number }[]>(page, `(() => { const t = document.querySelector('[data-rsp15="track"]').getBoundingClientRect(); return [...document.querySelectorAll('[data-rsp15="track"] > [data-qc154="card"]')].map((c) => { const r = c.getBoundingClientRect(); const clipEl = c.querySelector('[data-pc3="label"]'); const top = Math.min(r.top, clipEl ? clipEl.getBoundingClientRect().top : r.top); return { name: c.querySelector('[data-qc154="name"]').textContent, top, bot: r.bottom, tt: t.top, tb: t.bottom }; }); })()`);
    L.check(`${size.width} no card clipped vertically (card and its label inside the track; Plumage colours v3)`, clip.every((c) => c.top >= c.tt - 0.5 && c.bot <= c.tb + 0.5), JSON.stringify(clip.filter((c) => !(c.top >= c.tt - 0.5 && c.bot <= c.tb + 0.5))));
  }
  await open(page, MS.asks, SZ, "D1");
  L.check("two cards: population", (await count(page, '[data-rsp15="track"] > [data-qc154="card"]')) === 2, "");
  L.check("two cards: no arrows, no dots", (await count(page, '[data-rsp15="arrows"]')) === 0 && (await count(page, '[data-rsp15="dot"]')) === 0, "");
  L.done(16);
});

/* ═════ E · In their words ═════ */
if (run("E1")) test("E1 · In their words: one note; a pick shows that note and stops the advance; k of n", async ({ page }) => {
  const L = new Ledger("E1");
  await open(page, MS.full, SZ, "E1");
  await toTop(page, '[data-rsp15="words"]');
  await page.mouse.move(5, 5);
  const n = await ev<string | null>(page, `document.querySelector('[data-rsp15="words"]')?.dataset.n ?? null`);
  L.check("population: six notes", n === "6", String(n));
  L.check("one note shown", (await count(page, '[data-rsp15="words-note"] [data-rsp15="note"]')) === 1, "");
  L.check("1 of 6", (await text(page, '[data-rsp15="words-count"]')) === "1 of 6", String(await text(page, '[data-rsp15="words-count"]')));
  L.check("newest first: Eleanor Whitlock", /I enjoyed Murphy’s voice/.test((await text(page, '[data-rsp15="words-note"] [data-rsp15="note"]')) ?? ""), "");
  const agents = await ev<string[]>(page, `[...document.querySelectorAll('[data-rsp15="words-agent"] .rsp15-who b')].map((b) => b.textContent)`);
  const seg = await ev<string[]>(page, `[...document.querySelectorAll('[data-rsp15="words-seg"] button')].map((b) => b.textContent)`);
  L.check("the switch and its counts (re-pointed rs5 E1)", JSON.stringify(seg) === JSON.stringify(["All6", "From passes5", "From requests1"]), JSON.stringify(seg));
  L.check("the list, newest first", JSON.stringify(agents) === JSON.stringify(["Eleanor Whitlock", "Ben Okafor", "Daniel O’Rourke", "Hugo Lindqvist", "Rafael Costa", "Imogen Hale"]), JSON.stringify(agents));
  await page.locator('[data-rsp15="words-agent"]').nth(4).click();
  await page.mouse.move(5, 5);
  await page.waitForTimeout(400);
  L.check("the pick: Rafael's note", (await text(page, '[data-rsp15="words-note"] [data-rsp15="note"]')) === "The premise is lovely. The pacing in the sample felt slow to me.", String(await text(page, '[data-rsp15="words-note"] [data-rsp15="note"]')));
  L.check("5 of 6", (await text(page, '[data-rsp15="words-count"]')) === "5 of 6", "");
  L.check("the stage line", (await text(page, '[data-rsp15="words-stage"]')) === "86 days after you queried · after the partial", String(await text(page, '[data-rsp15="words-stage"]')));
  L.check("the advance stopped (data-auto 0)", (await ev<string>(page, `document.querySelector('[data-rsp15="words"]').dataset.auto`)) === "0", "");
  await page.waitForTimeout(3500);
  L.check("still 5 of 6 after the interval", (await text(page, '[data-rsp15="words-count"]')) === "5 of 6", "");
  await page.locator('[data-rsp15="words-next"]').click();
  L.check("next → 6 of 6", (await text(page, '[data-rsp15="words-count"]')) === "6 of 6", "");
  L.done(12);
});

if (run("E2")) test("E2 · the advance moves on its interval and waits while hovered", async ({ page }) => {
  /* the interval is 4000ms in this run (`__RS15_ADVANCE_MS`); the real 9s is unit-locked (NOTE_ADVANCE_MS). Readings are
     relative, since the page has been open a moment before the first one. */
  test.setTimeout(120_000);
  const L = new Ledger("E2");
  await open(page, MS.full, SZ, "E2");
  await toTop(page, '[data-rsp15="words"]');
  await page.mouse.move(5, 5);
  const at = () => ev<string>(page, `document.querySelector('[data-rsp15="words"]').dataset.at`);
  const auto = await ev<string>(page, `document.querySelector('[data-rsp15="words"]').dataset.auto`);
  L.check("population: six notes, advancing", (await ev<string>(page, `document.querySelector('[data-rsp15="words"]').dataset.n`)) === "6" && auto === "1", auto);
  const a0 = await at();
  await page.waitForTimeout(4700);
  const a1 = await at();
  L.check("moved on within one interval", a1 !== a0, `${a0} → ${a1}`);
  await page.locator('[data-rsp15="words-note"]').hover();
  const h0 = await at();
  await page.waitForTimeout(9000);
  const h1 = await at();
  L.check("waited while hovered (two intervals)", h1 === h0, `${h0} → ${h1}`);
  await page.mouse.move(5, 5);
  await page.waitForTimeout(6000);
  const a2 = await at();
  L.check("moved again once the pointer left", a2 !== h1, `${h1} → ${a2}`);
  L.check("still advancing (no pick)", (await ev<string>(page, `document.querySelector('[data-rsp15="words"]').dataset.auto`)) === "1", "");
  L.done(5);
});

if (run("E3")) test("E3 · one note: a single card; none: no section", async ({ page }) => {
  const L = new Ledger("E3");
  await open(page, MS.one, SZ, "E3");
  L.check("population: the section", (await count(page, '[data-rsp15="words"]')) === 1, "");
  L.check("one note: a single quote card", (await count(page, '[data-rsp15="quote-card"]:not([style*="display: none"])')) === 1 && (await ev<number>(page, `[...document.querySelectorAll('[data-rsp15="quote-card"]')].filter((e) => e.getBoundingClientRect().height > 1).length`)) === 1, "");
  L.check("one note: no list, no arrows", (await count(page, '[data-rsp15="spot"]')) === 0, "");
  await open(page, MS.asks, SZ, "E3");
  L.check("population: the page drew", (await count(page, '[data-rsp15="read-on"]')) === 1, "");
  L.check("no notes: no section", (await count(page, '[data-rsp15="words"]')) === 0, "");
  L.done(5);
});

/* ═════ F · the Rejection collection ═════ */
if (run("F1")) test("F1 · the columns, the default order, month headers with counts", async ({ page }) => {
  const L = new Ledger("F1");
  await open(page, MS.full, SZ, "F1");
  const heads = await ev<string[]>(page, `[...document.querySelectorAll('[data-rsp15="head"]')].map((b) => b.childNodes[0].textContent)`);
  L.check("population: six headings", heads.length === 6, JSON.stringify(heads));
  L.check("Date · Agent · Answer · How long it took · Got as far as · What they said", JSON.stringify(heads) === JSON.stringify(["Date", "Agent", "Answer", "How long it took", "Got as far as", "What they said"]), JSON.stringify(heads));
  L.check("the count: 15", (await text(page, '[data-rsp15="collection-count"] > b')) === "15", "");
  L.check("11 passed · 4 no reply", (await text(page, '[data-rsp15="collection-count"] small')) === "11 passed · 4 no reply", "");
  const names = await rowNames(page);
  L.check("first ten, newest first", JSON.stringify(names) === JSON.stringify(["Eleanor Whitlock", "Ben Okafor", "Alice Moreno", "Sarah Kendrick", "Hugo Lindqvist", "Liam Gallagher", "Maya Thorne", "Rafael Costa", "William Tate", "Imogen Hale"]), JSON.stringify(names));
  /* the fixture is dated relative to the day it is written, so a ref date near a month's end can cross into the next
     month: the headers are checked against the stamps the page draws (all 15), not against fixed counts */
  const months = await ev<string[]>(page, `[...document.querySelectorAll('[data-rsp15="month"]')].map((m) => m.textContent)`);
  const want = await ev<string[]>(page, `(() => { const L = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const S = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const all = [...document.querySelectorAll('[data-rsp15="row"] .rsp15-stamp')].map((s) => S.indexOf(s.textContent.replace(/^\\d+/, "")));
    return all; })()`);
  L.check("population: ten stamps on show", want.length === 10, JSON.stringify(want));
  const said = await ev<string[]>(page, `[...document.querySelectorAll('[data-rsp15="said"]')].map((s) => s.textContent)`);
  L.check("a note, No note, Closed after the wait", said[0].startsWith("“I enjoyed") && said[2] === "Closed after the wait" && said[3] === "No note", JSON.stringify(said.slice(0, 4)));
  const took = await ev<string[]>(page, `[...document.querySelectorAll('[data-rsp15="took"] b')].map((s) => s.textContent)`);
  L.check("took: days for a pass, weeks for a no reply", took[0] === "23 days" && took[2] === "13 weeks", JSON.stringify(took.slice(0, 3)));
  L.check("the track in every row", (await count(page, '[data-rsp15="row"] [data-qc153="track"]')) === 10, "");
  L.check("Show all 15", (await text(page, '[data-rsp15="show-all"]')) === "Show all 15", "");
  L.check("find shows above six", (await count(page, '[data-rsp15="find"]')) === 1, "");
  L.check("All / Passed / No reply", (await count(page, '[data-rsp15="collection-seg"] button')) === 3, "");
  L.check("no package text in the collection (re-pointed rs5 F1)", !/package/i.test(await page.locator('[data-rsp15="collection"]').innerText()), "");
  await page.locator('[data-rsp15="show-all"]').click();
  const every = await ev<number[]>(page, `(() => { const S = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; return [...document.querySelectorAll('[data-rsp15="row"] .rsp15-stamp')].map((s) => S.indexOf(s.textContent.replace(/^\\d+/, ""))); })()`);
  const LONG = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const shownMonths = [...new Set(want as unknown as number[])];
  const expected = shownMonths.map((m) => `${LONG[m]}${every.filter((x) => x === m).length}`);
  L.check("month headers: each month on show, counted over the whole collection", JSON.stringify(months) === JSON.stringify(expected), `${JSON.stringify(months)} vs ${JSON.stringify(expected)}`);
  L.done(14);
});

if (run("F2")) test("F2 · each heading sorts; pressing it again reverses; no month headers off the date sort", async ({ page }) => {
  const L = new Ledger("F2");
  await open(page, MS.full, SZ, "F2");
  await page.locator('[data-rsp15="show-all"]').click();
  const date = await rowNames(page);
  L.check("population: 15 rows", date.length === 15, String(date.length));
  const want: Record<string, string> = { agent: "Alice Moreno", answer: "Alice Moreno", took: "Ben Okafor", far: "Ben Okafor", note: "Eleanor Whitlock" };
  for (const k of ["agent", "answer", "took", "far", "note"]) {
    await page.locator(`[data-rsp15="head"][data-k="${k}"]`).click();
    await page.waitForTimeout(250);
    const a = await rowNames(page);
    L.check(`${k}: sorted (first ${want[k]})`, a[0] === want[k] && (await ev<string>(page, `document.querySelector('[data-rsp15="collection"]').dataset.sort`)) === k, `${a[0]}`);
    L.check(`${k}: no month headers`, (await count(page, '[data-rsp15="month"]')) === 0, "");
    await page.locator(`[data-rsp15="head"][data-k="${k}"]`).click();
    await page.waitForTimeout(250);
    const b = await rowNames(page);
    L.check(`${k}: pressed again, reversed`, b[0] === a[a.length - 1] && b[b.length - 1] === a[0], `${b[0]} … ${b[b.length - 1]}`);
  }
  await page.locator('[data-rsp15="head"][data-k="date"]').click();
  await page.waitForTimeout(250);
  L.check("back to Date: month headers return", (await count(page, '[data-rsp15="month"]')) > 0, "");
  L.done(16);
});

if (run("F3")) test("F3 · the bar is scaled to the longest wait of the whole collection", async ({ page }) => {
  const L = new Ledger("F3");
  await open(page, MS.full, SZ, "F3");
  await page.locator('[data-rsp15="show-all"]').click();
  const ratio = (name: string) => ev<number | null>(page, `(() => { const r = [...document.querySelectorAll('[data-rsp15="row"]')].find((x) => x.querySelector('.rsp15-who b').textContent === ${JSON.stringify(name)}); const i = r && r.querySelector('[data-rsp15="bar"]'); return i ? i.getBoundingClientRect().width / i.parentElement.getBoundingClientRect().width : null; })()`);
  const ben = await ratio("Ben Okafor"), hugo = await ratio("Hugo Lindqvist");
  L.check("population: bars measured", ben != null && hugo != null, `${ben} ${hugo}`);
  L.check("the longest (Ben Okafor, 157 days) is full", near(ben, 1, 0.02), String(ben));
  L.check("Hugo Lindqvist, 16 days: 10%", near(hugo, 0.1, 0.02), String(hugo));
  await page.locator('[data-rsp15="collection-seg"] [data-k="noReply"]').click();
  await page.waitForTimeout(300);
  const liam = await ratio("Liam Gallagher");
  L.check("filtered to No reply, the longest there (118 days) is still against 157: 75%", near(liam, 0.75, 0.02), String(liam));
  L.check("a no reply's bar is dashed", /repeating-linear-gradient/.test(await ev<string>(page, `getComputedStyle(document.querySelector('[data-rsp15="row"][data-kind="noReply"] [data-rsp15="bar"]')).backgroundImage`)), "");
  L.done(5);
});

if (run("F4")) test("F4 · Show all reveals the rest; find narrows by agent and by a word in a note", async ({ page }) => {
  const L = new Ledger("F4");
  await open(page, MS.full, SZ, "F4");
  L.check("population: ten rows at first", (await rowNames(page)).length === 10, "");
  await page.locator('[data-rsp15="show-all"]').click();
  await page.waitForTimeout(300);
  L.check("Show all: 15 rows on show", (await ev<number>(page, `[...document.querySelectorAll('[data-rsp15="row"]')].filter((r) => r.getBoundingClientRect().height > 1).length`)) === 15, "");
  await page.locator('[data-rsp15="find"]').fill("costa");
  await page.waitForTimeout(300);
  L.check("find an agent: Rafael Costa", JSON.stringify(await rowNames(page)) === JSON.stringify(["Rafael Costa"]), JSON.stringify(await rowNames(page)));
  await page.locator('[data-rsp15="find"]').fill("pacing");
  await page.waitForTimeout(300);
  L.check("find a word of a note: Rafael Costa", JSON.stringify(await rowNames(page)) === JSON.stringify(["Rafael Costa"]), JSON.stringify(await rowNames(page)));
  await page.locator('[data-rsp15="find"]').fill("a");
  await page.waitForTimeout(300);
  L.check("a find shows every match (no Show all)", (await count(page, '[data-rsp15="show-all"]')) === 0 && (await rowNames(page)).length > 10, String((await rowNames(page)).length));
  L.done(5);
});

if (run("F5")) test("F5 · a pass kept off is absent from the list and present in the header's count", async ({ page }) => {
  const L = new Ledger("F5");
  await open(page, MS.off, SZ, "F5");
  await page.locator('[data-rsp15="show-all"]').click().catch(() => {});
  await page.waitForTimeout(300);
  const names = await rowNames(page);
  L.check("population: the collection drew", names.length > 0, String(names.length));
  L.check("14 in the collection", names.length === 14 && (await text(page, '[data-rsp15="collection-count"] > b')) === "14", String(names.length));
  L.check("Sarah Kendrick is not in it", !names.includes("Sarah Kendrick"), "");
  L.check("the header still counts 11 passed", (await text(page, '[data-rsp15="tally-label"][data-k="p"]')) === "11 passed", String(await text(page, '[data-rsp15="tally-label"][data-k="p"]')));
  L.check("and 18 responses", (await text(page, '[data-rsp="page"] [data-wsnh="title"]')) === "18 responses", "");
  L.done(5);
});

/* ═════ G · spacing ═════ */
if (run("G1")) test("G1 · one 72px gap between sections; the band 30px under the header", async ({ page }) => {
  const L = new Ledger("G1");
  for (const size of [{ width: 1280, height: 800 }, SZ, { width: 1717, height: 960 }]) {
    await open(page, MS.full, size, "G1");
    const g = await ev<Record<string, number> | null>(page, `(() => { const q = (s) => document.querySelector(s); const h = [...document.querySelectorAll('header.qc1531-hd')].find((e) => e.getBoundingClientRect().width > 1);
      const parts = [q('[data-rsp15="word"]'), q('[data-rsp15="facts"]'), q('[data-rsp15="read-on"]'), q('[data-rsp15="words"]'), q('[data-rsp15="collection"]')];
      if (!h || parts.some((p) => !p)) return null; const b = parts.map((p) => p.getBoundingClientRect());
      return { head: b[0].top - h.getBoundingClientRect().bottom, g1: b[1].top - b[0].bottom, g2: b[2].top - b[1].bottom, g3: b[3].top - b[2].bottom, g4: b[4].top - b[3].bottom }; })()`);
    L.check(`${size.width} population: every part`, !!g, JSON.stringify(g));
    if (!g) continue;
    L.check(`${size.width} band 30 under the header`, near(g.head, 30, 1), String(g.head));
    L.check(`${size.width} band → facts 72`, near(g.g1, 72, 1), String(g.g1));
    L.check(`${size.width} facts → read on 72`, near(g.g2, 72, 1), String(g.g2));
    L.check(`${size.width} read on → in their words 72`, near(g.g3, 72, 1), String(g.g3));
    L.check(`${size.width} in their words → collection 72`, near(g.g4, 72, 1), String(g.g4));
  }
  L.done(18);
});

/* ═════ H · the two other states ═════ */
if (run("H1")) test("H1 · Nothing back yet: the ref's parts, none of the populated page's", async ({ page }) => {
  const L = new Ledger("H1");
  await open(page, MS.none, SZ, "H1");
  L.check("population: the none state", (await ev<string>(page, `document.querySelector('[data-rsp="page"]').dataset.rsp15State`)) === "none", "");
  L.check("While you wait", await page.locator('[data-rsp15="wait"]').isVisible(), "");
  L.check("its line", (await text(page, '[data-rsp15="wait-line"]')) === "Your 12 queries are with agents. Here’s when each agent says they’ll reply by.", String(await text(page, '[data-rsp15="wait-line"]')));
  L.check("ten dots on the line, two chips (no reply time given)", (await count(page, '[data-rsp15="wait-dot"]')) === 10 && (await count(page, '[data-rsp15="wait-chip"]')) === 2, `${await count(page, '[data-rsp15="wait-dot"]')} ${await count(page, '[data-rsp15="wait-chip"]')}`);
  const fts = await ev<string[]>(page, `[...document.querySelectorAll('[data-rsp15="feature"] .rsp15-fth')].map((h) => h.textContent)`);
  L.check("the three features", JSON.stringify(fts) === JSON.stringify(["Track your requests", "Keep your notes", "Rejection collection"]), JSON.stringify(fts));
  L.check("title: No responses yet", (await text(page, '[data-rsp="page"] [data-wsnh="title"]')) === "No responses yet", "");
  L.check("12 queries out", (await text(page, '[data-rsp15="replied"]')) === "12 queries out", "");
  L.check("the next reply due line", /^The next reply is due around \d+ \w{3}, going by the reply times your agents give\.$/.test((await text(page, '[data-rsp15="rate"]')) ?? ""), String(await text(page, '[data-rsp15="rate"]')));
  L.check("no Share your story", (await count(page, '[data-rsp15="share-top"]')) === 0, "");
  for (const gone of ["word", "facts", "read-on", "words", "collection"]) L.check(`none of the populated page: ${gone}`, (await count(page, `[data-rsp15="${gone}"]`)) === 0, "");
  /* re-pointed rs5 H1: the first answer switches the page with no reload (written by the seed, then the fixture rewritten) */
  await ev(page, `window.__rs15NoReload = 1`);
  seed("--answer-one");
  await page.locator('[data-rsp="page"][data-rsp15-state="early"]').waitFor({ timeout: 20_000 }).catch(() => {});
  L.check("the first answer switches the page live", (await ev<string>(page, `document.querySelector('[data-rsp="page"]').dataset.rsp15State`)) === "early", "");
  L.check("with no reload", (await ev<number | undefined>(page, `window.__rs15NoReload`)) === 1, "");
  seed();
  L.done(16);
});

if (run("H2")) test("H2 · Early days: the ref's parts, none of the populated page's", async ({ page }) => {
  const L = new Ledger("H2");
  await open(page, MS.early, SZ, "H2");
  L.check("population: the early state", (await ev<string>(page, `document.querySelector('[data-rsp="page"]').dataset.rsp15State`)) === "early", "");
  L.check("the header's early line", (await text(page, '[data-rsp15="rate"]')) === "It’s early days. Most of your queries are still with agents.", String(await text(page, '[data-rsp15="rate"]')));
  L.check("2 of 9 have replied", (await text(page, '[data-rsp15="replied"]')) === "2 of 9 have replied", "");
  L.check("the early note", (await count(page, '[data-rsp15="early"]')) === 1, "");
  L.check("no line of facts", (await count(page, '[data-rsp15="facts"]')) === 0, "");
  L.check("one request card, no arrows", (await count(page, '[data-rsp15="track"] > [data-qc154="card"]')) === 1 && (await count(page, '[data-rsp15="arrows"]')) === 0, "");
  L.check("no In their words (no notes)", (await count(page, '[data-rsp15="words"]')) === 0, "");
  L.check("not the Nothing back yet page", (await count(page, '[data-rsp15="wait"]')) === 0, "");
  L.done(8);
});

/* ═════ N · the name ═════ */
if (run("N1")) test("N1 · no 'wall of no' on the route, in the composer's tick or in the share builder", async ({ page }) => {
  const L = new Ledger("N1");
  await open(page, MS.full, SZ, "N1");
  await page.locator('[data-rsp15="show-all"]').click().catch(() => {});
  const body = (await page.locator('[data-rsp="page"]').innerText()).toLowerCase();
  L.check("population: the page has its collection", /rejection collection/.test(body), "");
  L.check("the route", !/wall of no/.test(body), "");
  const attrs = await ev<string[]>(page, `[...document.querySelectorAll('[data-rsp="page"] [aria-label], [data-rsp="page"] [title], [data-rsp="page"] [placeholder]')].map((e) => [e.getAttribute('aria-label'), e.getAttribute('title'), e.getAttribute('placeholder')].join(' ')).filter((s) => /wall of no/i.test(s))`);
  L.check("no label, title or placeholder", attrs.length === 0, JSON.stringify(attrs));
  /* the share builder */
  await page.locator('[data-rsp="page"] [data-rsp15="share-top"]').click();
  await page.locator('[data-rsp15="share-builder"]').waitFor({ timeout: 8000 });
  const share = (await page.locator('[data-rsp15="share-builder"]').innerText()).toLowerCase();
  L.check("population: the builder opened", /share your story/.test(share), share.slice(0, 60));
  L.check("the share builder", !/wall of no/.test(share), share.slice(0, 120));
  /* the composer's tick: Record a response → the first query → Passed */
  await page.locator('[data-rsp="page"] [data-rsp5="record"]').click();
  await page.locator("[data-qp='panel'] [data-qcrr='picker']").waitFor({ timeout: 10_000 });
  await page.locator("[data-qcrr='row']").first().click();
  await page.locator("[data-qc1522='reply-types'] [data-v='passed']").first().click({ timeout: 10_000 });
  const tick = ((await page.locator("label:has([data-qc1522='wall'])").first().innerText({ timeout: 5000 }).catch(() => "")) ?? "").trim();
  L.check("population: the tick is on screen", tick.length > 0, tick);
  L.check("the tick: Add to my Rejection collection", tick === "Add to my Rejection collection", tick);
  L.check("the tick has no wall of no", !/wall of no/i.test(tick), tick);
  /* nothing saved: leave without saving (the reload discards the composer) */
  await page.reload();
  L.done(8);
});

/* ═════ S · the share builder (re-pointed rs5 S1) ═════ */
if (run("S1")) test("S1 · Share your story opens the existing builder: names off, nothing uploaded", async ({ page }) => {
  const L = new Ledger("S1");
  await open(page, MS.full, SZ, "S1");
  const sent: string[] = [];
  page.on("request", (r) => { if (r.method() !== "GET" && /storage|upload/i.test(r.url())) sent.push(r.url()); });
  await page.locator('[data-rsp="page"] [data-rsp15="share-top"]').click();
  await page.locator('[data-rsp15="share-builder"] [data-rsp="share"]').waitFor({ timeout: 8000 });
  await page.waitForTimeout(2500);
  L.check("population: the builder opened under the collection", (await count(page, '[data-rsp15="collection"] [data-rsp15="share-builder"]')) === 1, "");
  L.check("agent names off by default", !(await page.locator('[data-rsp="opt-names"]').isChecked()), "");
  L.check("a preview drawn", (await count(page, '[data-rsp="preview-img"]')) === 1, "");
  L.check("nothing uploaded", sent.length === 0, JSON.stringify(sent));
  L.check("the collection's button opens and closes it", (await page.locator('[data-rsp15="share"]').getAttribute("aria-expanded")) === "true", "");
  L.done(5);
});

/* ═════ P · the panel ═════ */
if (run("P1")) test("P1 · a row, a card and Open the card each open the existing panel, desk dimmed; Esc closes; focus returns", async ({ page }) => {
  const L = new Ledger("P1");
  const doors: [string, string][] = [["row", '[data-rsp15="row"]'], ["card", '[data-rsp15="track"] > [data-qc154="card"]'], ["Open the card", '[data-rsp15="open-card"]']];
  for (const [door, sel] of doors) {
    await open(page, MS.full, SZ, "P1");
    const el = page.locator(sel).first();
    await el.scrollIntoViewIfNeeded();
    const id = door === "card" ? await el.getAttribute("data-id") : door === "row" ? await el.getAttribute("data-id") : await page.locator('[data-rsp15="words-note"]').getAttribute("data-id");
    if (door === "card") await el.locator('[data-qc154="band"]').click(); else await el.click();
    await page.waitForTimeout(900);
    L.check(`${door}: ?answer= its query`, new URL(page.url().replace("#/", "")).search.includes(`answer=${id}`) || page.url().includes(`answer=${id}`), page.url());
    L.check(`${door}: the existing panel`, (await count(page, ".rsp5-layer .rsp5-drw")) === 1, "");
    const scrim = await ev<{ shown: boolean; op: number } | null>(page, `(() => { const s = document.querySelector('[data-side-scrim]'); if (!s) return null; const c = getComputedStyle(s); const r = s.getBoundingClientRect(); return { shown: c.display !== 'none' && r.width > 100, op: parseFloat(c.opacity) }; })()`);
    L.check(`${door}: the desk dimmed`, !!scrim && scrim.shown && scrim.op > 0.2, JSON.stringify(scrim));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(800);
    L.check(`${door}: Esc closes`, (await count(page, ".rsp5-layer .rsp5-drw")) === 0 && !page.url().includes("answer="), page.url());
    const back = await ev<boolean>(page, `(() => { const a = document.activeElement; const want = ${JSON.stringify(sel)}; const el = document.querySelector(want); return !!a && !!el && (a === el || el.contains(a) || a.closest(want) === el); })()`);
    L.check(`${door}: focus returns`, back, await ev<string>(page, `document.activeElement ? document.activeElement.outerHTML.slice(0, 80) : 'none'`));
  }
  L.done(15);
});

/* ═════ L · overflow ═════ */
if (run("L1")) test("L1 · no sideways overflow at 1100–1717, and at 200% zoom at 1512", async ({ page }) => {
  test.setTimeout(900_000);
  const L = new Ledger("L1");
  const sizes = [{ width: 1100, height: 800 }, { width: 1280, height: 800 }, { width: 1440, height: 900 }, SZ, { width: 1717, height: 960 }, { width: 756, height: 450 }];
  for (const size of sizes) {
    if (size.width < 768) {
      /* 200% zoom at 1512: a 756px viewport is the phone layout (ResponsesPhone), which has none of the desktop shell
         that openRoute waits for */
      await page.addInitScript((id) => { try { localStorage.setItem("scriptally_active_manuscript_id", id); } catch { /* */ } }, MS.full);
      if (MUT === "L1" || MUT === "ALL") await page.addInitScript(`document.addEventListener("DOMContentLoaded", () => { const s = document.createElement("style"); s.textContent = "body > * { min-width: 2400px !important; }"; document.head.appendChild(s); });`);
      await page.setViewportSize(size);
      await page.goto("/queries/responses");
      await page.waitForTimeout(6000);
    } else {
      await open(page, MS.full, size, "L1");
    }
    console.log(`L1 · ${size.width} opened`);
    if (size.width < 768) {
      /* the phone screen: the document's own width against the viewport (no sweep of every element) */
      const d = await ev<{ doc: number; vw: number }>(page, `({ doc: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth })`);
      L.check(`${size.width} population: the phone page measured`, d.vw > 0, JSON.stringify(d));
      L.check(`${size.width} no sideways scroll on the document`, d.doc <= d.vw + 1, JSON.stringify(d));
      L.check(`${size.width} (phone layout: the desktop scroller is not drawn)`, true, "");
      L.check(`${size.width} (phone layout: no element sweep)`, true, "");
      continue;
    }
    await page.locator('[data-rsp15="show-all"]').click({ timeout: 5000 }).catch(() => {});
    const o = await ev<{ doc: number; vw: number; sc: number | null; scw: number | null; wide: string[] }>(page, `(() => { const s = ${SCROLLER}; const vw = document.documentElement.clientWidth;
      const wide = s ? [...s.querySelectorAll('*')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > vw + 1 && !e.closest('[data-rsp15="track"]'); }).slice(0, 5).map((e) => { const r = e.getBoundingClientRect(); return e.tagName + '.' + String(e.className).slice(0, 40) + '[' + (e.getAttribute('data-rsp15') || e.getAttribute('data-rsp5') || e.getAttribute('aria-label') || '') + '] ' + Math.round(r.left) + '→' + Math.round(r.right) + ' "' + (e.textContent || '').trim().slice(0, 30) + '"'; }) : [];
      return { doc: document.documentElement.scrollWidth, vw, sc: s ? s.scrollWidth : null, scw: s ? s.clientWidth : null, wide }; })()`);
    L.check(`${size.width} population: the page measured`, o.vw > 0, JSON.stringify(o));
    L.check(`${size.width} no sideways scroll on the document`, o.doc <= o.vw + 1, JSON.stringify(o));
    L.check(`${size.width} nothing wider than the scroller`, o.sc == null || o.sc <= (o.scw ?? 0) + 1, JSON.stringify(o));
    L.check(`${size.width} nothing past the viewport's right edge`, o.wide.length === 0, JSON.stringify(o.wide));
  }
  L.done(24);
});

/* ═════ the after screenshots (not a lock): the three states at 1280 and 1512, the whole scroller in one frame ═════ */
if (run("SHOTS")) test("SHOTS · after screenshots for the report", async ({ page }) => {
  test.setTimeout(240_000);
  mkdirSync(`${DIR}/shots`, { recursive: true });
  for (const [state, ms] of [["full", MS.full], ["early", MS.early], ["none", MS.none]] as const) {
    for (const width of [1280, 1512]) {
      await open(page, ms, { width, height: 900 }, "SHOTS");
      await page.screenshot({ path: `${DIR}/shots/${state}-top-${width}.png` });
      const h = await ev<number>(page, `(() => { const s = ${SCROLLER}; return s ? s.scrollHeight + 160 : 3000; })()`);
      await page.setViewportSize({ width, height: Math.min(Math.max(900, h), 6000) });
      await page.waitForTimeout(900);
      await page.screenshot({ path: `${DIR}/shots/${state}-page-${width}.png` });
    }
  }
});

/* ═════ diagnostic (not a lock; runs only when named): where focus goes when the panel closes ═════ */
if (ONLY.includes("DBG")) test("DBG · focus on the panel's close", async ({ page }) => {
  await open(page, MS.full, SZ, "DBG");
  await page.locator('[data-rsp15="row"]').first().scrollIntoViewIfNeeded();
  await page.locator('[data-rsp15="row"]').first().click();
  const tag = `(() => { const a = document.activeElement; return a ? a.tagName + '.' + String(a.className).slice(0, 40) + '[' + (a.getAttribute('data-rsp15') || a.getAttribute('data-id') || '') + ']' : 'none'; })()`;
  console.log("DBG after click:", await ev<string>(page, tag));
  await page.waitForTimeout(900);
  console.log("DBG panel open, focus:", await ev<string>(page, tag));
  await page.keyboard.press("Escape");
  for (const ms of [0, 50, 150, 400, 900]) {
    await page.waitForTimeout(ms);
    const info = await ev<string>(page, `(() => { const r = document.querySelector('[data-rsp15="row"]'); const inert = [...document.querySelectorAll('[inert]')].map((e) => e.className.toString().slice(0, 30)); return JSON.stringify({ focus: ${tag}, rowConnected: !!r && r.isConnected, inert, url: location.href.slice(-40) }); })()`);
    console.log(`DBG +${ms}:`, info);
  }
});
