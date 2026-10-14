/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v4 — the PK4 locks on the rendered page, at 1512 × 900 and 1280 × 800 with the shell:
 * v4's A1–A3, B1, C1–C3, D1, E1, F1, L1, and v3's drawer locks D1–D6 and E2–E3 (here `V3-D1`…), which v4 keeps.
 * (v3 E1 is a unit lock: src/lib/packageReplies.test.ts.)
 *
 * Each lock was run against the build before v4 (`PK4_BASE=1`, ledger `base-<lock>.json`) and with its named
 * mutation (`PK4_MUTATE=<lock>`, ledger `mut-<lock>.json`) before its green was believed. In-page mutations are the
 * table below; the rest are source edits made and undone in the measurement worktree by `pk4Mutate.mjs`, because
 * what they break is a decision the code makes, not something drawn.
 *
 * FIXTURES. "The Smoke Test" (seed-ms-1) holds every branch the card needs (sent, not sent yet, retired, a put-away
 * letter); `seedPk4.mjs` adds the three states the account cannot show (every package retired, one saved letter and no
 * package, a package in its 2nd edition) and the run removes them in `afterAll`. "The Quiet Second" (seed-ms-2) is
 * the empty page.
 * ⚠️ WRITES ARE PUT BACK IN THE SAME RUN: V3-D4 deletes the letter it parks, V3-D5 undoes both edits from the toast,
 *    F1 deletes the package it creates. A run that cannot put the account back fails loudly.
 */
import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

const DIR = "reports/packages-v4";
const MUT = process.env.PK4_MUTATE ?? "";
const BASE = process.env.PK4_BASE === "1";
const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
const POP = "seed-ms-1", EMPTY = "seed-ms-2", RET = "pk4-ms-ret", LET = "pk4-ms-let";
const near = (a: unknown, b: number, t: number) => typeof a === "number" && Number.isFinite(a) && Math.abs(a - b) <= t;

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ lock: this.name, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${BASE ? "base-" : ""}${MUT ? "mut-" : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 30)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/** one named break per in-page lock (the source ones are pk4Mutate.mjs's) */
const MUTATIONS: Record<string, { css?: string; js?: string }> = {
  /* restore the Archivist in the header */
  A1: { js: `(() => { const put = () => { const h = document.querySelector('[data-pk4="header"]'); if (h && !h.querySelector('[data-mut]')) { const i = document.createElement('img'); i.setAttribute('data-mut', ''); i.src = '/images/packages/packages-header-archivist.png'; i.style.cssText = 'width:120px;height:150px'; h.appendChild(i); } }; new MutationObserver(put).observe(document.body, { subtree: true, childList: true }); put(); })()` },
  /* scroll on press */
  A2: { js: `document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('[data-pk4="card-row"]')) { const s = [...document.querySelectorAll('.wpg-scroll')].find((x) => x.querySelector('[data-pk4="page"]')); if (s) s.scrollTop += 180; } }, true)` },
  /* draw the gap in rust */
  A3: { js: `(() => { const put = () => { for (const svg of document.querySelectorAll('[data-pk4="ring"] svg')) if (!svg.querySelector('[data-mut]')) { const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); c.setAttribute('data-mut', ''); c.setAttribute('cx', '47.5'); c.setAttribute('cy', '47.5'); c.setAttribute('r', '42'); c.setAttribute('fill', 'none'); c.setAttribute('stroke', '#a2452a'); c.setAttribute('stroke-width', '9'); svg.insertBefore(c, svg.firstChild); } }; new MutationObserver(put).observe(document.body, { subtree: true, childList: true }); put(); })()` },
  /* restore a sort pill in the sheet's row */
  C1: { js: `(() => { const put = () => { const t = document.querySelector('[data-pk4="pkg-top"]'); if (t && !t.querySelector('[data-mut]')) { const b = document.createElement('button'); b.setAttribute('data-mut', ''); b.textContent = 'Sort ⌄'; t.appendChild(b); } }; new MutationObserver(put).observe(document.body, { subtree: true, childList: true }); put(); })()` },
  /* open Retired by default */
  C2: { js: `(() => { let done = false; const go = () => { const b = document.querySelector('[data-pk4="band-ret"][aria-expanded="false"]'); if (b && !done) { done = true; b.click(); } }; new MutationObserver(go).observe(document.body, { subtree: true, childList: true }); go(); })()` },
  /* let the foot wrap */
  C3: { css: `.pk4-pcf { grid-template-columns: 1fr !important; }` },
  /* drop the heading strip */
  D1: { css: `.pk4-hdstrip { background: transparent !important; }` },
  /* render the example as a real package */
  F1: { js: `(() => { const put = () => { const e = document.querySelector('[data-pk4="example"]'); if (e && !e.querySelector('[data-mut]')) { const c = document.createElement('div'); c.setAttribute('data-mut', ''); c.setAttribute('data-pk4', 'card'); c.textContent = 'Standard UK'; e.appendChild(c); } }; new MutationObserver(put).observe(document.body, { subtree: true, childList: true }); put(); })()` },
  /* remove the shadow's clip: a shadow far wider than the sheet */
  L1: { css: `.pk4-hd .pk4-shadow { width: 3200px !important; }` },
  /* add the scrim to viewing */
  "V3-D2": { js: `(() => { const put = () => { const d = document.querySelector('[data-pk4="drawer"]:not([data-modal])'); if (d && !document.querySelector('[data-mut-dim]')) { const s = document.createElement('div'); s.setAttribute('data-mut-dim', ''); s.setAttribute('data-hdr', 'dim'); s.style.cssText = 'position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.2)'; d.parentElement.insertBefore(s, d); } }; new MutationObserver(put).observe(document.body, { subtree: true, childList: true }); put(); })()` },
  /* make the own row a button */
  "V3-D3": { js: `(() => { const put = () => { const r = document.querySelector('[data-pk4="srow"][data-own]'); if (r && r.tagName !== 'BUTTON') { const b = document.createElement('button'); b.className = r.className; b.setAttribute('data-pk4', 'srow'); b.setAttribute('data-own', ''); b.innerHTML = r.innerHTML; r.replaceWith(b); } }; new MutationObserver(put).observe(document.body, { subtree: true, childList: true }); put(); })()` },
  /* restore PkgMaterialModal for Edit: a centred dialog opens beside the drawer */
  "V3-D1": { js: `document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('[data-pk4="edit"]')) setTimeout(() => { const m = document.createElement('div'); m.className = 'ppv-modal'; m.setAttribute('role', 'dialog'); m.style.cssText = 'position:fixed;left:50%;top:50%;width:400px;height:300px;transform:translate(-50%,-50%);background:#fff;z-index:99'; document.body.appendChild(m); }, 50); }, true)` },
};

async function open(page: Page, ms: string, size: { width: number; height: number }, lock: string) {
  await page.addInitScript((id) => { try { localStorage.setItem("scriptally_active_manuscript_id", id); sessionStorage.removeItem("sa.pk4.retiredOpen"); sessionStorage.removeItem("sa.pk4.repliesBy"); } catch { /* */ } }, ms);
  const m = MUT === lock ? MUTATIONS[lock] : null;
  /* an init script runs before <body> exists: the mutation waits for it, or its observers attach to nothing */
  if (m?.js) await page.addInitScript(`(() => { const run = () => { ${m.js} }; if (document.body) run(); else document.addEventListener("DOMContentLoaded", run); })()`);
  await openRoute(page, "/manuscripts/packages", size);
  if (m?.css) await page.addStyleTag({ content: m.css });
  await page.waitForTimeout(1200);
}
const ev = <T,>(page: Page, js: string): Promise<T> => page.evaluate(js) as Promise<T>;
const SCROLLER = `[...document.querySelectorAll('.wpg-scroll')].find((x) => x.querySelector('[data-pk4="page"]'))`;
const compact = (page: Page) => ev<boolean>(page, `!document.querySelector('.ws-app.sheet-wide')`);
const seed = (arg?: string) => execFileSync("node", ["tests/e2e/seedPk4.mjs", ...(arg ? [arg] : [])], { stdio: "pipe" }).toString();

test.describe.configure({ mode: "default" });
test.beforeAll(() => { if (!BASE) console.log(seed()); });
test.afterAll(() => { if (!BASE) console.log(seed("--clean")); });

for (const size of SIZES) {
  const at = `${size.width}`;

  test(`A1 header ${at}`, async ({ page }) => {
    test.setTimeout(180_000);
    const L = new Ledger(`A1-${at}`);
    await open(page, POP, size, "A1");
    const r = await ev<{ imgs: string[]; op: number; txt: string; fs: number; h: number; tb: number; hd: number; hw: number; card: number; wide: boolean; live: number } | null>(page, `(() => {
      const h = document.querySelector('[data-pk4="header"]'); if (!h) return null;
      const imgs = [...h.querySelectorAll('img')].map((i) => i.getAttribute('data-pk4') || 'other');
      const sh = h.querySelector('[data-pk4="shadow"]'); const t = h.querySelector('[data-pk4="title"]');
      const tb = h.querySelector('[data-pk4="title-block"]').getBoundingClientRect(); const hr = h.getBoundingClientRect(); const c = h.querySelector('[data-pk4="summary"]').getBoundingClientRect();
      const n = [...document.querySelectorAll('[data-pk4="card-n"]')].slice(0, 2).reduce((a, e) => a + Number(e.textContent), 0);
      return { imgs, op: Number(getComputedStyle(sh).opacity), txt: t.getAttribute('aria-label'), fs: parseFloat(getComputedStyle(t).fontSize), h: t.getBoundingClientRect().height, tb: tb.left, hd: hr.left, hw: hr.width, card: hr.right - c.right, wide: !!document.querySelector('.ws-app.sheet-wide'), live: n };
    })()`);
    L.check("header", r, "the v4 header is on the page");
    if (r) {
      L.check("images", r.imgs.length === 1 && r.imgs[0] === "shadow", `images in the header: ${r.imgs.join(",")}`);
      L.check("shadow", near(r.op, 0.15, 0.01), `shadow opacity ${r.op}`);
      L.check("title words", r.txt === `${r.live} ${r.live === 1 ? "package" : "packages"} in use`, `"${r.txt}" against ${r.live} live`);
      L.check("title size", near(r.fs, r.wide ? 50 : 44, 1), `font-size ${r.fs} (${r.wide ? "full" : "compact"})`);
      L.check("one line", r.h < r.fs * 1.5, `title ${r.h.toFixed(1)} tall at ${r.fs}`);
      const inset = r.hw < 900 ? 0 : r.wide ? Math.max(64, (r.hw - 1080) / 2) : Math.max(40, (r.hw - 900) / 2);
      L.check("title inset", near(r.tb - r.hd, inset, 1), `title block at +${(r.tb - r.hd).toFixed(1)} against ${inset.toFixed(1)}`);
      L.check("card inset", r.hw < 900 || near(r.card, inset, 1), `card ${r.card.toFixed(1)} from the right against ${inset.toFixed(1)}`);
    }
    L.done(1);
  });

  test(`A2 card ${at}`, async ({ page }) => {
    test.setTimeout(180_000);
    const L = new Ledger(`A2-${at}`);
    await open(page, POP, size, "A2");
    const r = await ev<{ n: number[]; segs: number[]; bar: number; total: number } | null>(page, `(() => {
      const c = document.querySelector('[data-pk4="summary"]'); const tot = document.querySelector('[data-pk4="pkg-sheet"] [data-pk4="total"]'); if (!c || !tot) return null;
      return { n: [...c.querySelectorAll('[data-pk4="card-n"]')].map((e) => Number(e.textContent)), segs: [...c.querySelectorAll('[data-pk4="card-seg"]')].map((e) => e.getBoundingClientRect().width), bar: c.querySelector('[data-pk4="card-bar"]').getBoundingClientRect().width, total: Number(tot.textContent) };
    })()`);
    L.check("card", r, "the summary card and the sheet's total are on the page");
    if (r) {
      L.check("sum", r.n.reduce((a, b) => a + b, 0) === r.total, `${r.n.join("+")} against ${r.total} packages`);
      const sum = r.n.reduce((a, b) => a + b, 0), room = r.bar - 3 * (r.n.length - 1);
      r.n.forEach((v, i) => L.check(`segment ${i}`, near(r.segs[i], (room * v) / sum, 2), `${r.segs[i].toFixed(1)} against ${((room * v) / sum).toFixed(1)}`));
      L.check("branches", r.n.every((v) => v > 0), `every status has a package on the fixture: ${r.n.join("/")}`);
      const before = await ev<number>(page, `${SCROLLER}.scrollTop`);
      await page.locator('[data-pk4="card-row"][data-k="sent"]').click();
      await page.waitForTimeout(500);
      const a = await ev<{ pressed: string | null; ops: number[]; pill: string; top: number; cards: number }>(page, `(() => ({
        pressed: document.querySelector('[data-pk4="card-row"][data-k="sent"]').getAttribute('aria-pressed'),
        ops: [...document.querySelectorAll('[data-pk4="card-row"]:not([data-k="sent"])')].map((e) => Number(getComputedStyle(e).opacity)),
        pill: document.querySelector('[data-pk4="pill"][data-k="status"] [data-pk4="pill-label"]').textContent,
        top: ${SCROLLER}.scrollTop,
        cards: document.querySelectorAll('[data-pk4="grid-use"] [data-pk4="card"]').length,
      }))()`);
      L.check("pressed", a.pressed === "true", `aria-pressed ${a.pressed}`);
      a.ops.forEach((o, i) => L.check(`fade ${i}`, near(o, 0.32, 0.02), `opacity ${o}`));
      L.check("pill", a.pill === "Sent", `Status pill reads "${a.pill}"`);
      L.check("no scroll", a.top === before, `scrollTop ${before} → ${a.top}`);
      L.check("filters", a.cards === r.n[0], `${a.cards} cards shown against ${r.n[0]} sent`);
    }
    L.done(6);
  });

  test(`A3 ring ${at}`, async ({ page }) => {
    test.setTimeout(180_000);
    const L = new Ledger(`A3-${at}`);
    await open(page, POP, size, "A3");
    const r = await ev<{ w: number; dash: string | null; sub: string; rust: number; fig: { t: number; b: number }; pc: { t: number; b: number }; wide: boolean } | null>(page, `(() => {
      const g = document.querySelector('[data-pk4="ring"]'); if (!g) return null;
      const arc = g.querySelector('[data-pk4="ring-arc"]'); const fig = g.querySelector('[data-pk4="ring-pct"]'); const i = fig.querySelector('i');
      const rust = [...g.querySelectorAll('circle')].filter((c) => /a2452a|162, 69, 42/i.test(c.getAttribute('stroke') + getComputedStyle(c).stroke)).length;
      const fr = fig.firstChild && fig.firstChild.nodeType === 3 ? (() => { const rg = document.createRange(); rg.selectNodeContents(fig.firstChild); return rg.getBoundingClientRect(); })() : fig.getBoundingClientRect();
      const ir = i ? i.getBoundingClientRect() : fr;
      return { w: g.getBoundingClientRect().width, dash: arc && arc.getAttribute('stroke-dasharray'), sub: document.querySelector('[data-pk4="rate-sub"]').textContent, rust, fig: { t: fr.top, b: fr.bottom }, pc: { t: ir.top, b: ir.bottom }, wide: !!document.querySelector('.ws-app.sheet-wide') };
    })()`);
    L.check("ring", r, "the ring is on the page");
    if (r) {
      L.check("size", near(r.w, r.wide ? 92 : 76, 1), `ring ${r.w} (${r.wide ? "full" : "compact"})`);
      const m = /^(\d+) of (\d+) answered$/.exec(r.sub);
      L.check("answered", m, `sub "${r.sub}"`);
      if (m && r.dash) {
        const want = Number(m[1]) / Number(m[2]), C = 2 * Math.PI * 42, got = parseFloat(r.dash) / C;
        L.check("arc", Math.abs(got - want) <= 0.01, `arc ${(got * 100).toFixed(1)}% against ${(want * 100).toFixed(1)}%`);
      }
      L.check("no rust", r.rust === 0, `${r.rust} rust circles`);
      L.check("one line", r.pc.b > r.fig.t && r.pc.t < r.fig.b, `figure ${r.fig.t.toFixed(1)}–${r.fig.b.toFixed(1)}, % ${r.pc.t.toFixed(1)}–${r.pc.b.toFixed(1)}`);
      await page.locator('[data-pk4="rate"]').click();
      await page.waitForTimeout(1200);
      const top = await ev<number>(page, `document.querySelector('[data-pk4="replies"]').getBoundingClientRect().top`);
      L.check("scrolls", top >= 0 && top < size.height * 0.6, `replies sheet at ${top.toFixed(0)} after the press`);
    }
    L.done(6);
  });

  test(`B1 filters ${at}`, async ({ page }) => {
    test.setTimeout(180_000);
    const L = new Ledger(`B1-${at}`);
    await open(page, POP, size, "B1");
    const pills = await ev<{ k: string; t: string; top: number }[]>(page, `[...document.querySelectorAll('[data-pk4="pill"]')].map((e) => ({ k: e.getAttribute('data-k'), t: e.querySelector('[data-pk4="pill-label"]').textContent, top: e.getBoundingClientRect().top }))`);
    L.check("five", pills.map((p) => p.t).join("|") === "Status|Query letter|Synopsis|Version|More filters", pills.map((p) => p.t).join("|"));
    L.check("one line", pills.length > 0 && pills.every((p) => near(p.top, pills[0].top, 1)), `tops ${pills.map((p) => p.top.toFixed(0)).join(",")}`);
    /* Comps-forward: the CURRENT letter of "Comps-led variant" (retired) and the 1st edition's of "Two editions" */
    await page.locator('[data-pk4-dd="letter"]').click();
    await page.waitForTimeout(300);
    const opt = page.locator('.lpop [data-opt^="letter:"]', { hasText: "Comps-forward" }).first();
    L.check("option", await opt.count(), "Comps-forward is offered");
    if (await opt.count()) {
      await opt.click();
      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
      const r = await ev<{ use: string[]; ret: string[]; retOpen: boolean }>(page, `(() => ({
        use: [...document.querySelectorAll('[data-pk4="grid-use"] [data-pk4="card"]')].map((c) => c.querySelector('[data-pk4="slot"][data-k="letter"] strong')?.textContent ?? ''),
        ret: [...document.querySelectorAll('[data-pk4="grid-ret"] [data-pk4="card"]')].map((c) => c.querySelector('[data-pk4="slot"][data-k="letter"] strong')?.textContent ?? ''),
        retOpen: !!document.querySelector('[data-pk4="grid-ret"]'),
      }))()`);
      L.check("current edition", !r.use.length || r.use.every((t) => t === "Comps-forward"), `In use letters: ${r.use.join(",") || "none"} (Two editions' 1st edition held Comps-forward; its current is Voice-led)`);
      L.check("fixture", await ev<number>(page, `document.querySelectorAll('[data-pk4="card"][data-id="pk4-pkg-ed"]').length`) === 0, "Two editions is not shown for its old letter");
      L.check("retired too", true, `retired letters ${r.ret.join(",") || "(band folded)"}`);
      const label = await ev<string>(page, `document.querySelector('[data-pk4="pill"][data-k="letter"] [data-pk4="pill-label"]').textContent`);
      L.check("pill label", label === "Comps-forward", `pill reads "${label}"`);
    }
    L.done(5);
  });

  test(`C1 sheet ${at}`, async ({ page }) => {
    test.setTimeout(180_000);
    const L = new Ledger(`C1-${at}`);
    await open(page, POP, size, "C1");
    const r = await ev<{ bg: string; btns: string[]; sw: number; sheet: number } | null>(page, `(() => {
      const t = document.querySelector('[data-pk4="pkg-top"]'); if (!t) return null;
      return { bg: getComputedStyle(t).backgroundColor, btns: [...t.querySelectorAll('button')].map((b) => b.getAttribute('data-pk4') || b.textContent), sw: t.querySelector('[data-pk4="search"]').getBoundingClientRect().width, sheet: t.parentElement.getBoundingClientRect().width };
    })()`);
    L.check("top row", r, "the packages sheet's top row is on the page");
    if (r) {
      L.check("navy", r.bg === "rgb(45, 58, 80)", r.bg);
      L.check("no controls", r.btns.length === 0, `buttons in the row: ${r.btns.join(",") || "none"}`);
      L.check("search width", near(r.sw, r.sheet >= 1180 ? 300 : 220, 1), `search ${r.sw} on a ${r.sheet.toFixed(0)} sheet`);
      /* by a package's name, then by a material's name */
      for (const q of ["Prologue", "One-page"]) {
        await page.locator('[data-pk4="search"] input').fill(q);
        await page.waitForTimeout(300);
        const cards = await ev<string[]>(page, `[...document.querySelectorAll('[data-pk4="pkg-sheet"] [data-pk4="card"]')].map((c) => c.textContent)`);
        L.check(`find "${q}"`, cards.length > 0 && cards.every((t) => t.toLowerCase().includes(q.toLowerCase())), `${cards.length} cards, each holding "${q}"`);
      }
      await page.locator('[data-pk4="search"] input').press("Escape");
      L.check("escape clears", (await page.locator('[data-pk4="search"] input').inputValue()) === "", "Escape cleared the search");
    }
    L.done(6);
  });

  test(`C2 bands ${at}`, async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger(`C2-${at}`);
    await open(page, POP, size, "C2");
    const a = await ev<{ use: boolean; exp: string | null; grid: boolean } | null>(page, `(() => { const b = document.querySelector('[data-pk4="band-ret"]'); if (!b) return null; return { use: !!document.querySelector('[data-pk4="band-use"]'), exp: b.getAttribute('aria-expanded'), grid: !!document.querySelector('[data-pk4="grid-ret"]') }; })()`);
    L.check("bands", a, "both bands are on the page");
    if (a) {
      L.check("in use open", a.use, "In use is drawn");
      L.check("retired folded", a.exp === "false" && !a.grid, `Retired aria-expanded ${a.exp}, grid ${a.grid}`);
      await page.locator('[data-pk4="band-ret"]').click();
      await page.waitForTimeout(400);
      const ops = await ev<number[]>(page, `[...document.querySelectorAll('[data-pk4="grid-ret"] [data-pk4="card"]')].map((c) => Number(getComputedStyle(c).opacity))`);
      L.check("retired cards", ops.length > 0 && ops.every((o) => near(o, 0.7, 0.02)), `opacities ${ops.join(",")}`);
    }
    await open(page, RET, size, "C2");
    const b = await ev<{ none: boolean; grid: number; text: string }>(page, `(() => ({ none: !!document.querySelector('[data-pk4="none-live"]'), grid: document.querySelectorAll('[data-pk4="grid-ret"] [data-pk4="card"]').length, text: document.querySelector('[data-pk4="none-live"]')?.textContent ?? '' }))()`);
    L.check("nothing in use", b.none && /Nothing in use right now/.test(b.text), b.text.slice(0, 80));
    L.check("retired open", b.grid === 2, `${b.grid} retired cards shown`);
    L.done(5);
  });

  test(`C3 card ${at}`, async ({ page }) => {
    test.setTimeout(180_000);
    const L = new Ledger(`C3-${at}`);
    await open(page, POP, size, "C3");
    const card = page.locator('[data-pk4="grid-use"] [data-pk4="card"]').first();
    await card.scrollIntoViewIfNeeded();
    await card.hover();
    await page.waitForTimeout(260);
    const h = await card.evaluate((e) => ({ t: getComputedStyle(e).transform, s: getComputedStyle(e).boxShadow }));
    const ty = /matrix\([^,]+,[^,]+,[^,]+,[^,]+,[^,]+,\s*([-\d.]+)\)/.exec(h.t);
    L.check("lift", ty && near(Number(ty[1]), -2, 0.2), `transform ${h.t}`);
    L.check("shadow", /28px/.test(h.s), `box-shadow ${h.s}`);
    const r = await ev<{ use: { bg: string; first: boolean }[]; feet: { ok: boolean; why: string }[] }>(page, `(() => {
      const grid = document.querySelector('[data-pk4="grid-use"]');
      const use = [...document.querySelectorAll('[data-pk4="tag-use"]')].map((t) => ({ bg: getComputedStyle(t).backgroundColor, first: t.closest('[data-pk4="card"]') === grid.querySelector('[data-pk4="card"]') }));
      const feet = [...document.querySelectorAll('[data-pk4="card-foot"]')].map((f) => {
        const kids = [...f.children]; const t0 = kids[0].getBoundingClientRect().top;
        const bs = [...f.querySelectorAll('b')]; const fs = bs.length ? parseFloat(getComputedStyle(bs[0]).fontSize) : 0;
        const sameRow = kids.every((k) => { const r = k.getBoundingClientRect(); return r.top < t0 + 30; });
        const noWrap = bs.every((b) => b.getBoundingClientRect().height < fs * 1.6);
        return { ok: sameRow && noWrap, why: kids.map((k) => k.getBoundingClientRect().top.toFixed(0)).join('/') + ' h' + bs.map((b) => b.getBoundingClientRect().height.toFixed(0)).join('/') };
      });
      return { use, feet };
    })()`);
    L.check("for new queries", r.use.length <= 1, `${r.use.length} FOR NEW QUERIES tags`);
    console.log(`  C3 tally: FOR NEW QUERIES tags on the fixture at rest: ${r.use.length}`);
    /* the fixture uses no package for new queries, so the tag's branch is entered by choosing one and undone from
       the toast in the same run: the tag must be on that package only, lavender, and lead In use */
    if (r.use.length === 0) {
      await page.locator('[data-pk4="card"][data-id="seed-pkg-3"]').click(); await page.waitForTimeout(400);
      await page.locator('[data-pk4="more"]').click();
      await page.locator('[data-pk4="menu"] [data-act="use"]').click(); await page.waitForTimeout(1500);
      const u = await ev<{ n: number; bg: string; id: string | null; first: boolean }>(page, `(() => { const t = [...document.querySelectorAll('[data-pk4="tag-use"]')]; const c = t[0]?.closest('[data-pk4="card"]'); return { n: t.length, bg: t[0] ? getComputedStyle(t[0]).backgroundColor : '', id: c?.getAttribute('data-id') ?? null, first: c === document.querySelector('[data-pk4="grid-use"] [data-pk4="card"]') }; })()`);
      L.check("one tag", u.n === 1 && u.id === "seed-pkg-3", `${u.n} tags, on ${u.id}`);
      L.check("lavender", u.bg === "rgb(236, 230, 246)", u.bg);
      L.check("first", u.first, "the package used for new queries leads In use");
      const undo = page.locator(".sa-toast-undo").first(); await undo.waitFor({ timeout: 5000 }); await undo.click(); await page.waitForTimeout(1500);
      const gone = await ev<number>(page, `document.querySelectorAll('[data-pk4="tag-use"]').length`);
      expect(gone, "C3 could not undo Use for new queries — the account has changed").toBe(0);
    } else {
      for (const u of r.use) { L.check("lavender", u.bg === "rgb(236, 230, 246)", u.bg); L.check("first", u.first, "the active package leads In use"); }
    }
    r.feet.forEach((f, i) => L.check(`foot ${i}`, f.ok, f.why));
    L.done(4);
  });

  test(`D1 materials ${at}`, async ({ page }) => {
    test.setTimeout(180_000);
    const L = new Ledger(`D1-${at}`);
    await open(page, POP, size, "D1");
    const r = await ev<{ w: number; cols: { left: number; bg: string; t: string }[] } | null>(page, `(() => { const s = document.querySelector('[data-pk4="mat-sheet"]'); if (!s) return null; return { w: s.getBoundingClientRect().width, cols: [...s.querySelectorAll('[data-pk4="mat-col"]')].map((c) => ({ left: c.getBoundingClientRect().left, bg: getComputedStyle(c.querySelector('[data-pk4="mat-head"]')).backgroundColor, t: c.querySelector('[data-pk4="mat-head"]').textContent })) }; })()`);
    L.check("sheet", r, "the materials sheet is on the page");
    if (r) {
      L.check("three", r.cols.length === 3, r.cols.map((c) => c.t).join("|"));
      r.cols.forEach((c, i) => L.check(`strip ${i}`, c.bg === "rgb(233, 237, 243)", c.bg));
      const lefts = new Set(r.cols.map((c) => Math.round(c.left))).size;
      L.check("columns", r.w >= 1100 ? lefts === 3 : lefts === 1, `${lefts} column positions on a ${r.w.toFixed(0)} sheet`);
    }
    L.done(5);
  });

  test(`E1 replies ${at}`, async ({ page }) => {
    test.setTimeout(180_000);
    const L = new Ledger(`E1-${at}`);
    await open(page, POP, size, "E1");
    const gap = await ev<number | null>(page, `(() => { const b = document.querySelector('[data-pk4="banner"]'); const s = document.querySelector('[data-pk4="replies"]'); return b && s ? s.getBoundingClientRect().top - b.getBoundingClientRect().bottom : null; })()`);
    L.check("banner gap", near(gap, 28, 2), `banner to sheet ${gap}`);
    const def = await ev<string | null>(page, `document.querySelector('[data-pk4="heading"][data-k="requests"]')?.getAttribute('aria-sort') ?? null`);
    L.check("default sort", def === "descending", `Requests aria-sort ${def}`);
    for (const by of ["letter", "synopsis", "version", "package"]) {
      await page.locator(`[data-pk4="by"] [data-by="${by}"]`).click();
      await page.waitForTimeout(200);
      const got = await ev<string | null>(page, `document.querySelector('[data-pk4="rows"]')?.getAttribute('data-by') ?? null`);
      L.check(`by ${by}`, got === by, `the table shows ${got}`);
    }
    /* every heading, each direction: the rows with 4 or more answered stay first, whatever the key. (On the fixture the
       one qualifying row ties the best under-4 row on rate, so a Rate press alone cannot see the rule broken; a Name
       press can, since it sorts last alphabetically.) */
    const read = () => ev<{ sort: Record<string, string | null>; rows: { q: boolean; rate: number }[] }>(page, `(() => ({ sort: Object.fromEntries([...document.querySelectorAll('[data-pk4="heading"]')].map((h) => [h.getAttribute('data-k'), h.getAttribute('aria-sort')])), rows: [...document.querySelectorAll('[data-pk4="rows"] [data-pk4="row"]')].map((e) => ({ q: e.hasAttribute('data-q'), rate: parseFloat(e.querySelector('[data-pk4="row-rate"]').textContent) || -1 })) }))()`);
    let r = await read();
    for (const k of ["rate", "name", "sent", "replies", "requests"]) {
      for (const press of [1, 2]) {
        await page.locator(`[data-pk4="heading"][data-k="${k}"] button`).click();
        await page.waitForTimeout(150);
        r = await read();
        const want = press === 1 ? (k === "name" ? "ascending" : "descending") : (k === "name" ? "descending" : "ascending");
        L.check(`${k} ${press} aria-sort`, r.sort[k] === want, `${k} aria-sort ${r.sort[k]}`);
        const fu = r.rows.findIndex((x) => !x.q);
        L.check(`${k} ${press} under-4 last`, fu < 0 || r.rows.slice(fu).every((x) => !x.q), `flags ${r.rows.map((x) => (x.q ? "Q" : "-")).join("")}`);
        if (k === "rate" && press === 1) {
          const q = r.rows.filter((x) => x.q).map((x) => x.rate);
          L.check("by rate", q.every((v, i) => i === 0 || v <= q[i - 1]), `qualifying rates ${q.join(",")}`);
        }
      }
    }
    console.log(`  E1 tally: ${r.rows.filter((x) => x.q).length} rows with 4+ answered, ${r.rows.filter((x) => !x.q).length} under`);
    L.done(25);
  });

  test(`F1 empty ${at}`, async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger(`F1-${at}`);
    await open(page, EMPTY, size, "F1");
    const r = await ev<Record<string, boolean | string>>(page, `(() => ({
      summary: !!document.querySelector('[data-pk4="summary"]'), pills: !!document.querySelector('[data-pk4="pill"]'), sheets: !!document.querySelector('.pk4-ws'),
      panel: !!document.querySelector('[data-pk4="empty-panel"]'), art: !!document.querySelector('[data-pk4="empty-art"]'), example: !!document.querySelector('[data-pk4="example"]'),
      ways: document.querySelectorAll('[data-pk4="ways"] .pk4-way').length + '', ready: !!document.querySelector('[data-pk4="way-1"][data-ready]'), cards: document.querySelectorAll('[data-pk4="card"]').length + '',
    }))()`);
    L.check("no populated parts", !r.summary && !r.pills && !r.sheets, `summary ${r.summary}, pills ${r.pills}, sheets ${r.sheets}`);
    L.check("panel and art", r.panel && r.art, `panel ${r.panel}, art ${r.art}`);
    L.check("example", r.example && r.cards === "0", `example ${r.example}, package cards ${r.cards}`);
    L.check("ways", r.ways === "3" && !r.ready, `${r.ways} ways, ready ${r.ready}`);
    await open(page, LET, size, "F1");
    const w = await ev<string>(page, `document.querySelector('[data-pk4="way-1"]')?.textContent ?? ''`);
    L.check("letter ready", /Your letter's ready/.test(w) && /Hook-first, short/.test(w), w.slice(0, 90));
    /* creating the first package switches to the populated page in place, with the drawer on it */
    await page.evaluate(`window.__pk4mark = 1`);
    await page.locator('[data-pk4="way-1-btn"]').click();
    await page.waitForTimeout(500);
    const name = await page.locator('[data-pk4="pname"]').inputValue();
    L.check("name suggested", name.length > 0, `name "${name}"`);
    await page.locator('[data-pk4="save"]').click();
    await page.waitForTimeout(1800);
    const after = await ev<{ mark: unknown; title: string; summary: boolean; empty: boolean }>(page, `(() => ({ mark: window.__pk4mark, title: document.querySelector('[data-pk4="drawer-title"]')?.textContent ?? '', summary: !!document.querySelector('[data-pk4="summary"]'), empty: !!document.querySelector('[data-pk4="empty"]') }))()`);
    L.check("no reload", after.mark === 1, `marker ${String(after.mark)}`);
    L.check("populated", after.summary && !after.empty, `summary ${after.summary}, empty ${after.empty}`);
    L.check("drawer", after.title === name, `drawer shows "${after.title}"`);
    /* put the account back: More → Delete → Delete (nothing has gone out with it) */
    await page.locator('[data-pk4="more"]').click();
    await page.locator('[data-pk4="menu"] [data-act="delete"]').click();
    await page.locator('[data-pk4="confirm-delete"]').click();
    await page.waitForTimeout(1500);
    const back = await ev<boolean>(page, `!!document.querySelector('[data-pk4="empty"]')`);
    expect(back, "F1 could not delete the package it created — the account has changed").toBe(true);
    L.check("restored", back, "the package it created is deleted");
    L.done(10);
  });

  test(`V3-D1 no modal ${at}`, async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger(`V3-D1-${at}`);
    await open(page, POP, size, "V3-D1");
    const geo = async (label: string) => {
      await page.waitForTimeout(500);
      const g = await ev<{ n: number; inset: number[]; radius: string; centred: number } | null>(page, `(() => { const d = document.querySelector('[data-pk4="drawer"]'); if (!d) return null; const r = d.getBoundingClientRect(); const centred = [...document.querySelectorAll('[role="dialog"], .ppv-modal')].filter((x) => x !== d && !x.classList.contains('lpop') && x.getBoundingClientRect().width > 0).length; return { n: 1, inset: [r.top, innerWidth - r.right, innerHeight - r.bottom], radius: getComputedStyle(d).borderTopLeftRadius, centred }; })()`);
      L.check(`${label} drawer`, g, `${label} opens the drawer`);
      if (g) {
        L.check(`${label} inset`, g.inset.every((v) => near(v, 8, 1)), `inset ${g.inset.map((v) => v.toFixed(1)).join("/")}`);
        L.check(`${label} radius`, g.radius === "12px", g.radius);
        L.check(`${label} no dialog`, g.centred === 0, `${g.centred} other dialogs`);
      }
      await page.keyboard.press("Escape"); await page.waitForTimeout(400);
    };
    await page.locator('[data-pk4="new"]').click(); await geo("new package");
    await page.locator('[data-pk4="add-material"]').click(); await geo("add material");
    await page.locator('[data-pk4="grid-use"] [data-pk4="card"]').first().click(); await page.waitForTimeout(400);
    await page.locator('[data-pk4="edit"]').click(); await geo("edit package");
    await page.locator('[data-pk4="mat-row"]').first().click(); await page.waitForTimeout(400);
    const matEdit = page.locator('[data-pk4="edit"], [data-pk4="newver"]').first();
    await matEdit.click(); await geo("material edit");
    L.done(16);
  });

  test(`V3-D2 scrim ${at}`, async ({ page }) => {
    test.setTimeout(180_000);
    const L = new Ledger(`V3-D2-${at}`);
    await open(page, POP, size, "V3-D2");
    await page.locator('[data-pk4="grid-use"] [data-pk4="card"]').first().click();
    await page.waitForTimeout(500);
    const v = await ev<{ dim: number; modal: string | null }>(page, `({ dim: document.querySelectorAll('[data-hdr="dim"]').length, modal: document.querySelector('[data-pk4="drawer"]')?.getAttribute('aria-modal') ?? null })`);
    L.check("viewing no scrim", v.dim === 0, `${v.dim} scrims`);
    L.check("viewing not modal", v.modal === "false", `aria-modal ${v.modal}`);
    const s0 = await ev<number>(page, `${SCROLLER}.scrollTop`);
    await page.mouse.move(300, size.height / 2); await page.mouse.wheel(0, 300); await page.waitForTimeout(500);
    const s1 = await ev<number>(page, `${SCROLLER}.scrollTop`);
    L.check("page scrolls", s1 > s0, `scrollTop ${s0} → ${s1}`);
    await page.locator('[data-pk4="edit"]').click();
    await page.waitForTimeout(500);
    const f = await ev<{ dim: number; modal: string | null }>(page, `({ dim: document.querySelectorAll('[data-hdr="dim"]').length, modal: document.querySelector('[data-pk4="drawer"]')?.getAttribute('aria-modal') ?? null })`);
    L.check("form scrim", f.dim === 1, `${f.dim} scrims`);
    L.check("form modal", f.modal === "true", `aria-modal ${f.modal}`);
    L.done(5);
  });

  test(`V3-D3 tabs ${at}`, async ({ page }) => {
    test.setTimeout(180_000);
    const L = new Ledger(`V3-D3-${at}`);
    await open(page, POP, size, "V3-D3");
    const card = page.locator('[data-pk4="grid-use"] [data-pk4="card"][data-id="seed-pkg-1"]');
    const foot = await card.evaluate((c) => ({ req: c.querySelector('[data-pk4="foot-requests"]')?.textContent, rep: c.querySelector('[data-pk4="foot-replies"]')?.textContent }));
    await card.click(); await page.waitForTimeout(400);
    L.check("two tabs", (await page.locator('[data-pk4="drawer"] [role="tab"]').count()) === 2, "two tabs in the drawer");
    await page.locator('[data-pk4="tab-replies"]').click(); await page.waitForTimeout(400);
    const r = await ev<{ req: string; rate: string; own: string | null; others: number }>(page, `(() => ({ req: document.querySelector('[data-pk4="cell-requests"] b')?.textContent ?? '', rate: document.querySelector('[data-pk4="cell-rate"] small')?.textContent ?? '', own: document.querySelector('[data-pk4="srow"][data-own]')?.tagName ?? null, others: document.querySelectorAll('button[data-pk4="srow"]').length }))()`);
    L.check("requests agree", r.req === foot.req, `drawer ${r.req}, card foot ${foot.req} (both the current edition)`);
    L.check("replies agree", r.rate.startsWith(`${foot.rep} of`), `"${r.rate}" against ${foot.rep} replies`);
    L.check("own row", r.own === "DIV", `own row is a ${r.own}`);
    L.check("other rows", r.others > 0, `${r.others} other rows are buttons`);
    L.done(5);
  });

  test(`V3-D4 park ${at}`, async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger(`V3-D4-${at}`);
    await open(page, POP, size, "V3-D4");
    await page.locator('[data-pk4="new"]').click(); await page.waitForTimeout(400);
    await page.locator('[data-pk4="pname"]').fill("PK4 parking test");
    await page.locator('[data-pk4="park-letter"]').click(); await page.waitForTimeout(400);
    L.check("parked", (await page.locator('[data-pk4="matform"]').count()) === 1, "the material form replaced the package form");
    await page.keyboard.press("Escape"); await page.waitForTimeout(400);
    L.check("escape back", (await page.locator('[data-pk4="pkgform"]').count()) === 1 && (await page.locator('[data-pk4="pname"]').inputValue()) === "PK4 parking test", "Escape went back to the package form, name kept");
    await page.locator('[data-pk4="park-letter"]').click(); await page.waitForTimeout(400);
    const letterName = `PK4 parked letter ${size.width}`;
    await page.locator('[data-pk4="mname"]').fill(letterName);
    await page.locator('[data-pk4="save"]').click(); await page.waitForTimeout(1800);
    const back = await ev<{ form: boolean; name: string; chosen: string }>(page, `(() => ({ form: !!document.querySelector('[data-pk4="pkgform"]'), name: document.querySelector('[data-pk4="pname"]')?.value ?? '', chosen: [...document.querySelectorAll('[data-pk4="pick-letter"] [aria-checked="true"] strong')].map((e) => e.textContent).join(',') }))()`);
    L.check("returns", back.form, "the package form is back");
    L.check("name kept", back.name === "PK4 parking test", `name "${back.name}"`);
    L.check("letter chosen", back.chosen === letterName, `chosen "${back.chosen}"`);
    /* put the account back: cancel the package, then delete the letter from its drawer */
    await page.keyboard.press("Escape"); await page.waitForTimeout(500);
    await page.locator('[data-pk4="mat-row"]', { hasText: letterName }).first().click(); await page.waitForTimeout(500);
    await page.locator('[data-pk4="more"]').click();
    await page.locator('[data-pk4="menu"] [data-act="delete"]').click();
    await page.locator('[data-pk4="confirm-delete"]').click(); await page.waitForTimeout(1500);
    const left = await page.locator('[data-pk4="mat-row"]', { hasText: letterName }).count();
    expect(left, "V3-D4 could not delete the letter it parked — the account has changed").toBe(0);
    L.done(5);
  });

  test(`V3-D5 edition ${at}`, async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger(`V3-D5-${at}`);
    await open(page, POP, size, "V3-D5");
    const sub = () => ev<string>(page, `document.querySelector('[data-pk4="drawer-sub"]')?.textContent ?? ''`);
    const undo = async () => { const u = page.locator(".sa-toast-undo").first(); await u.waitFor({ timeout: 5000 }); await u.click(); await page.waitForTimeout(1500); };
    await page.locator('[data-pk4="card"][data-id="seed-pkg-3"]').click(); await page.waitForTimeout(400);
    const before = await sub();
    L.check("1st", /^1st edition/.test(before), before);
    await page.locator('[data-pk4="edit"]').click(); await page.waitForTimeout(400);
    L.check("notice", (await page.locator('[data-pk4="edition-notice"]').count()) === 1, "the edition notice is shown");
    /* rename alone keeps the edition */
    const nm = page.locator('[data-pk4="pname"]');
    const name0 = await nm.inputValue();
    await nm.fill(`${name0} x`);
    await page.locator('[data-pk4="save"]').click(); await page.waitForTimeout(1500);
    const afterRename = await sub();
    L.check("rename keeps", /^1st edition/.test(afterRename), afterRename);
    await undo();
    L.check("rename undone", (await ev<string>(page, `document.querySelector('[data-pk4="drawer-title"]')?.textContent ?? ''`)) === name0, "the name is back");
    /* a different letter starts the 2nd */
    await page.locator('[data-pk4="edit"]').click(); await page.waitForTimeout(400);
    await page.locator('[data-pk4="pick-letter"] [role="radio"][aria-checked="false"]').first().click();
    await page.locator('[data-pk4="save"]').click(); await page.waitForTimeout(1500);
    const afterLetter = await sub();
    L.check("letter starts 2nd", /^2nd edition/.test(afterLetter), afterLetter);
    await undo();
    const restored = await sub();
    expect(/^1st edition/.test(restored), "V3-D5 could not undo the edition — the account has changed").toBe(true);
    L.check("edition undone", true, restored);
    /* a SENT package with NO version renames too (the v2 page's save threw here, silently: a deleteField() reached the
       edition check, which trims strings) */
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    await page.locator('[data-pk4="card"][data-id="seed-pkg-1"]').click(); await page.waitForTimeout(400);
    const n1 = await ev<string>(page, `document.querySelector('[data-pk4="drawer-title"]')?.textContent ?? ''`);
    await page.locator('[data-pk4="edit"]').click(); await page.waitForTimeout(400);
    await page.locator('[data-pk4="pname"]').fill(`${n1} x`);
    await page.locator('[data-pk4="save"]').click(); await page.waitForTimeout(1500);
    const t1 = await ev<string>(page, `document.querySelector('[data-pk4="drawer-title"]')?.textContent ?? ''`);
    L.check("no-version rename saves", t1 === `${n1} x`, `title "${t1}"`);
    L.check("no-version rename keeps", /^1st edition/.test(await sub()), await sub());
    if (t1 === `${n1} x`) await undo();
    const t2 = await ev<string>(page, `document.querySelector('[data-pk4="drawer-title"]')?.textContent ?? ''`);
    expect(t2, "V3-D5 could not undo the rename — the account has changed").toBe(n1);
    L.done(8);
  });

  test(`V3-D6 duplicate ${at}`, async ({ page }) => {
    test.setTimeout(180_000);
    const L = new Ledger(`V3-D6-${at}`);
    await open(page, POP, size, "V3-D6");
    const count = () => ev<number>(page, `Number(document.querySelector('[data-pk4="pkg-sheet"] [data-pk4="total"]')?.textContent ?? -1)`);
    const n0 = await count();
    await page.locator('[data-pk4="card"][data-id="seed-pkg-1"]').click(); await page.waitForTimeout(400);
    await page.locator('[data-pk4="more"]').click();
    await page.locator('[data-pk4="menu"] [data-act="dup"]').click(); await page.waitForTimeout(1500);
    L.check("notice", (await page.locator('[data-pk4="dup-notice"]').count()) === 1, "the duplicate notice is shown");
    const n1 = await count();
    L.check("nothing written", n1 === n0, `${n0} packages before, ${n1} with the duplicate open`);
    await page.locator('[data-pk4="cancel"]').click(); await page.waitForTimeout(800);
    L.check("cancelled", (await count()) === n0, "still the same count after Cancel");
    L.done(3);
  });

  test(`V3-E2E3 lead and order ${at}`, async ({ page }) => {
    test.setTimeout(180_000);
    const L = new Ledger(`V3-E2E3-${at}`);
    await open(page, POP, size, "V3-E2E3");
    const r = await ev<{ lead: string[]; rows: { name: string; q: boolean; req: number; rate: number; sent: number; segs: number[]; label: string }[] }>(page, `(() => ({
      lead: ['lead-2', 'lead-3'].map((k) => document.querySelector('[data-pk4="' + k + '"] .pk4-lfig')?.textContent ?? ''),
      rows: [...document.querySelectorAll('[data-pk4="rows"] [data-pk4="row"]')].map((e) => ({
        name: e.querySelector('strong').textContent, q: e.hasAttribute('data-q'), req: Number(e.querySelector('[data-pk4="row-requests"]').textContent) || 0,
        rate: parseFloat(e.querySelector('[data-pk4="row-rate"]').textContent) || -1, sent: Number(e.querySelector('[data-pk4="row-sent"]').textContent) || 0,
        segs: [...e.querySelectorAll('[data-pk4="split"] u')].map((u) => parseFloat(u.style.flexGrow || u.style.flex)), label: e.querySelector('[data-pk4="split"]').getAttribute('aria-label') || '',
      })),
    }))()`);
    const def = await ev<string | null>(page, `document.querySelector('[data-pk4="heading"][data-k="requests"]')?.getAttribute('aria-sort') ?? null`);
    L.check("E3 default sort", def === "descending", `Requests aria-sort ${def} — the table opens sorted by requests, high to low`);
    const qual = r.rows.filter((x) => x.q).map((x) => x.name);
    for (const [i, l] of r.lead.entries()) L.check(`lead ${i + 2}`, qual.length ? qual.includes(l) : l === "Not enough yet", `"${l}" against qualifying ${qual.join(",") || "none"}`);
    const fu = r.rows.findIndex((x) => !x.q);
    L.check("E3 under-4 last", fu < 0 || r.rows.slice(fu).every((x) => !x.q), r.rows.map((x) => (x.q ? "Q" : "-")).join(""));
    const ok = r.rows.every((x, i) => i === 0 || x.q !== r.rows[i - 1].q || x.req <= r.rows[i - 1].req);
    L.check("E3 by requests", ok, r.rows.map((x) => `${x.name}:${x.req}`).join(" "));
    for (const x of r.rows.filter((y) => y.sent)) {
      const m = /^(\d+) requests?, (\d+) other repl(?:y|ies), (\d+) still waiting, (\d+) no reply$/.exec(x.label);
      L.check(`label ${x.name}`, m, x.label);
      if (m) L.check(`segments ${x.name}`, JSON.stringify(m.slice(1).map(Number).filter((n) => n > 0)) === JSON.stringify(x.segs), `${x.segs.join(",")} against ${m.slice(1).join(",")}`);
    }
    console.log(`  E2/E3 tally: ${qual.length} qualifying package rows of ${r.rows.length}`);
    L.done(5);
  });

  test(`L1 no overflow ${at}`, async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger(`L1-${at}`);
    for (const w of [1920, 1512, 1280, 1180, 1024]) {
      if (size.width !== 1512 && w !== size.width) continue;
      await open(page, POP, { width: w, height: size.height }, "L1");
      const r = await ev<{ doc: number[]; sc: number[]; app: number[] }>(page, `(() => { const s = ${SCROLLER}; const a = document.querySelector('.ws-app') || document.body; return { doc: [document.documentElement.scrollWidth, document.documentElement.clientWidth], sc: [s.scrollWidth, s.clientWidth], app: [a.scrollWidth, a.clientWidth] }; })()`);
      L.check(`${w} document`, r.doc[0] === r.doc[1], r.doc.join("/"));
      L.check(`${w} scroller`, r.sc[0] === r.sc[1], r.sc.join("/"));
      L.check(`${w} app`, r.app[0] === r.app[1], r.app.join("/"));
    }
    L.done(3);
  });
}
