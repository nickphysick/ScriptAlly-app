/**
 * Query Centre v142 — the QC142 locks (ref design-refs/query-centre-v142/), on the rendered page at 1280 × 800 and
 * 1512 × 900. Each lock proves its population is non-zero before it asserts, writes a ledger to
 * reports/qc-v142/ledger/ (`base-` for a run against the pre-v142 build, `mut-` for a run under its named break), and
 * fails on any red reading.
 *
 *   QC142_BASE=1          a run against the base build (the red-first reading)
 *   QC142_MUTATE=L<n>     apply that lock's named break in the page (L4's is in src: see the report)
 *
 * L1 title row · L2 toolbar · L3 no pin · L4 parity · L5 card format · L6 not covered · L7 strip · L8 landing untouched
 */
import { expect, test, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

const DIR = "reports/qc-v142";
const SIZES = [{ width: 1280, height: 800 }, { width: 1512, height: 900 }] as const;
type VP = { width: number; height: number };
const MUT = process.env.QC142_MUTATE ?? "";
const BASE = process.env.QC142_BASE === "1";
const near = (a: unknown, b: unknown, t: number) => typeof a === "number" && typeof b === "number" && Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= t;

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ lock: this.name, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${BASE ? "base-" : ""}${MUT === this.name ? "mut-" : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 30)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/** the named breaks, in the page (L4's is a source edit: it cannot be made from outside the app) */
const MUTATIONS: Record<string, { css?: string; js?: string }> = {
  L1: { css: `[data-qc142="title-row"] { padding-left: 40px !important; }` },
  L2: { css: `.qcv-group[data-v138]:not([data-full]) .qc138-sheet .qc140-tb { height: 72px !important; }` },
  L3: { js: `(() => { const put = () => { const tb = [...document.querySelectorAll('[data-qc140="toolbar"]')].find((e) => e.getBoundingClientRect().height > 0); if (!tb || tb.querySelector('[data-mut="pin"]')) return; const b = document.createElement("button"); b.type = "button"; b.setAttribute("data-mut", "pin"); b.setAttribute("aria-label", "Pin list"); b.textContent = "Pin list"; tb.appendChild(b); }; put(); new MutationObserver(put).observe(document.body, { childList: true, subtree: true }); })()` },
  L5: { css: `.qc142-lc .mk-lc-in { border-width: 2px !important; }` },
  L6: { css: `.qc142-cards .qc142-rh { top: 125px !important; }` },
  L7: { js: `(() => { const put = () => { const h = document.querySelector('[data-qc142="filter-strip"] header'); if (!h || h.querySelector('[data-mut="clear"]')) return; const b = document.createElement("button"); b.type = "button"; b.setAttribute("data-mut", "clear"); b.textContent = "Clear all"; h.insertBefore(b, h.lastElementChild); }; new MutationObserver(put).observe(document.body, { childList: true, subtree: true }); })()` },
  L8: { css: `.mk-lc { padding: 9px !important; }` },
};
const mutate = async (page: Page, lock: string) => {
  const m = MUT === lock ? MUTATIONS[lock] : null;
  if (!m) return;
  if (m.css) await page.addStyleTag({ content: m.css });
  if (m.js) await page.evaluate(m.js);
  await page.waitForTimeout(250);
};

/* the guide's state is the account's: read before, put back after (as the v141 locks do) */
const flags = (a: string) => execSync(`node tests/e2e/guideFlags.mjs --page queries ${a}`, { encoding: "utf8" }).trim().split("\n").pop()!;
let original = "null";
test.beforeAll(() => { original = flags(""); });
test.afterAll(() => { flags(`--restore '${original}'`); });

type Opt = { view?: "cards" | "list"; group?: string; pinned?: boolean };
async function openQc(page: Page, vp: VP, o: Opt = {}) {
  await page.addInitScript((x: Opt) => {
    try {
      sessionStorage.removeItem("qh.qc.filters");
      sessionStorage.setItem("sa.qc138.folded", "[]");
      const v = { v: 1, group: x.group ?? "status", sort: { key: "due", reversed: false }, density: "comfortable", view: x.view ?? "list" };
      localStorage.setItem("qh.qc.view", JSON.stringify(v));
      localStorage.setItem("sa.guide.queries", "1");
      localStorage.removeItem("sa.pinList.queries");
    } catch { /* private mode */ }
  }, o);
  await openRoute(page, "/queries", vp);
  await page.locator(".qcv-group[data-v138]").first().waitFor({ timeout: 30_000 });
  await page.locator(".qc138-sheet [data-qcv='row'], .qc138-sheet [data-qc142='card']").first().waitFor({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  await page.mouse.move(5, 5);
  if (o.pinned) { await page.keyboard.press("f"); await page.waitForTimeout(1200); }
}
const rect = (page: Page, sel: string) => page.evaluate((s) => {
  const e = [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getBoundingClientRect().height > 0);
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height };
}, sel);
const press = (page: Page, sel: string) => page.evaluate((s) => { const e = [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getBoundingClientRect().height > 0); e?.click(); return !!e; }, sel);
const scrollTo = (page: Page, y: number) => page.evaluate((v) => { const s = [...document.querySelectorAll<HTMLElement>(".wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0); if (s) s.scrollTop = v; return s ? s.scrollTop : null; }, y);

/** wait for a smooth scroll to finish: the scroll position unchanged across three reads 150ms apart (at most 6s) */

/* ── L1 · the title row: placed against its card as the Contact list's is ─────────────────────────────────────────── */
/* RETIRED (navy-bar-address-book v1): QC142-L1 · the title row — retired on both pages: the Query Centre's count and switch moved into the navy bar (navy-bar A1) and the Contact list's Cards / List views became the address book (B1). NB1-L1/L2 hold the new places. */

/* ── L2 · the unpinned toolbar is the Contact list's height ──────────────────────────────────────────────────────── */
test("QC142-L2 toolbar", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("L2");
  for (const vp of SIZES) {
    await openQc(page, vp);
    await mutate(page, "L2");
    const m = await page.evaluate(() => {
      const v = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0);
      const h = (s: string) => v(s)?.getBoundingClientRect().height ?? null;
      /* RE-POINTED (navy-bar v1 A1/A2): Find moved to the pill above the list (NB1-L2 holds its 60) and the jump row is gone;
         the bar's chips are now Filters · Group by · Sort */
      return { tb: h("[data-qc140='toolbar']"), group: h("[data-qc140='group-chip']"), filters: h("[data-qc140='filters-chip']"), sort: h("[data-qc1421='sort-chip']") };
    });
    const at = `${vp.width}`;
    L.check(`${at} · population`, m.tb != null && m.group != null && m.filters != null && m.sort != null, JSON.stringify(m));
    L.check(`${at} · the toolbar is 52 tall`, near(m.tb, 52, 1), `${m.tb}`);
    L.check(`${at} · Group by is 34`, near(m.group, 34, 1), `${m.group}`);
    L.check(`${at} · Filters is 34`, near(m.filters, 34, 1), `${m.filters}`);
    L.check(`${at} · Sort is 34`, near(m.sort, 34, 1), `${m.sort}`);
  }
  L.done(10);
});

/* ── L3 · no Pin on the page; Full screen by button, F and Esc; the toolbar's icon toggle switches views ──────── */
test("QC142-L3 no pin", async ({ page }) => {
  test.setTimeout(360_000);
  const L = new Ledger("L3");
  for (const vp of SIZES) {
    const at = `${vp.width}`;
    await openQc(page, vp);
    await mutate(page, "L3");
    const pins = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".qcv-group[data-v138] button, .qcv-group[data-v138] [role='button']")]
      .filter((e) => e.getBoundingClientRect().height > 0)
      .map((e) => `${e.getAttribute("aria-label") ?? ""}|${(e.textContent ?? "").trim()}`)
      .filter((s) => /\b(Pin|Unpin)\b/.test(s)));
    const buttons = await page.evaluate(() => [...document.querySelectorAll(".qcv-group[data-v138] button")].filter((e) => e.getBoundingClientRect().height > 0).length);
    L.check(`${at} · population: the page's buttons`, buttons > 10, `${buttons}`);
    L.check(`${at} · unpinned: no Pin button`, pins.length === 0, pins.join(" ; ") || "none");
    const full = () => page.evaluate(() => !!document.querySelector(".qcv-group[data-v138][data-full]"));
    const hasFs = await press(page, "[data-qc142='full']");
    await page.waitForTimeout(1200);
    L.check(`${at} · the title row's Full screen enters`, hasFs && (await full()), `pressed ${hasFs}`);
    const exitBtn = await rect(page, "[data-qc142='full-tb']");
    const exitWords = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-qc142='full-tb']")].find((e) => e.getBoundingClientRect().height > 0)?.textContent?.trim() ?? "");
    L.check(`${at} · in full screen the toolbar says Exit full screen`, exitBtn && /Exit full screen/.test(exitWords), exitWords);
    const sw = await rect(page, "[data-qc142='view-tb']");
    L.check(`${at} · in full screen the toolbar carries the icon toggle`, !!sw, JSON.stringify(sw));
    await press(page, "[data-qc142='view-tb'] [data-view='cards']");
    await page.waitForTimeout(700);
    const cards = await page.evaluate(() => !!document.querySelector(".qc138-sheet[data-view='cards'] [data-qc142='card']"));
    await press(page, "[data-qc142='view-tb'] [data-view='list']");
    await page.waitForTimeout(700);
    const list = await page.evaluate(() => !!document.querySelector(".qc138-sheet[data-view='list'] [data-qcv='row']"));
    L.check(`${at} · the icon toggle switches to Cards and back`, cards && list, `cards ${cards} · list ${list}`);
    await press(page, "[data-qc142='full-tb']");
    await page.waitForTimeout(1200);
    L.check(`${at} · Exit full screen leaves`, !(await full()), "pressed");
    await page.keyboard.press("f");
    await page.waitForTimeout(1200);
    L.check(`${at} · F enters`, await full(), "");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(1200);
    L.check(`${at} · Esc leaves`, !(await full()), "");
  }
  L.done(18);
});

/* ── L4 · Cards and List show the same queries, and the title counts them ──────────────────────────────────────── */
const ids = (page: Page) => page.evaluate(() => {
  const sheet = [...document.querySelectorAll<HTMLElement>(".qc138-sheet")].find((e) => e.getBoundingClientRect().height > 0);
  if (!sheet) return null;
  const sel = sheet.getAttribute("data-view") === "cards" ? "[data-qc142='card']" : ".qc138-row[data-qcv='row']";
  const out = [...sheet.querySelectorAll<HTMLElement>(sel)].filter((e) => !e.closest("[data-qc139='practice']")).map((e) => e.dataset.id ?? "");
  /* RE-POINTED (navy-bar v1 A1): the count is the navy bar's */
  const title = [...document.querySelectorAll<HTMLElement>("[data-qc144='count']")].find((e) => e.getBoundingClientRect().height > 0)?.textContent ?? "";
  return { ids: out, title, view: sheet.getAttribute("data-view") };
});
/* "87 queries" or "8 of 87 queries" (the bar's count) */
const titleN = (t: string) => { const m = /^(\d+)(?: of \d+)? quer/.exec(t.trim()); return m ? Number(m[1]) : NaN; };
async function setView(page: Page, v: "cards" | "list") { await press(page, `[data-qc144='view-bar'] [data-view='${v}']`); await page.waitForTimeout(900); }
async function unfold(page: Page) {
  for (let i = 0; i < 12; i += 1) { const any = await press(page, ".qc138-sheet .qc138-grp.shut .qc138-band"); if (!any) break; await page.waitForTimeout(250); }
}
async function filterChip(page: Page, sel: string) {
  await press(page, ".qcv-group[data-v138] [data-qc140='filters']");
  await page.waitForTimeout(700);
  const ok = await press(page, sel);
  await page.waitForTimeout(700);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  return ok;
}
test("QC142-L4 parity", async ({ page }) => {
  test.setTimeout(600_000);
  const L = new Ledger("L4");
  const vp = SIZES[1];
  type Combo = { name: string; group: string; filter?: string; find?: string };
  const COMBOS: Combo[] = [
    { name: "nothing narrows, Status", group: "status" },
    { name: "Gone quiet (Where it stands), Status", group: "status", filter: "[data-qc142='filter-strip'] [data-qc141='where-opt'][data-k='quiet']" },
    { name: "With the agent (Where it stands), Next action", group: "action", filter: "[data-qc142='filter-strip'] [data-qc141='where-opt'][data-k='agent']" },
    { name: "Your move (Most used), Who it's with", group: "attention", filter: "[data-qc142='filter-strip'] [data-qc140='quick'][data-qp='you']" },
    { name: "Queried (Status), Package", group: "package", filter: "[data-qc142='filter-strip'] [data-qc140='stand'][data-k='q']" },
    { name: "search 'ar', No grouping", group: "none", find: "ar" },
    { name: "search 'ar' + Gone quiet, Status", group: "status", find: "ar", filter: "[data-qc142='filter-strip'] [data-qc141='where-opt'][data-k='quiet']" },
  ];
  for (const c of COMBOS) {
    await openQc(page, vp, { view: "list", group: c.group });
    let applied = true;
    if (c.filter) applied = await filterChip(page, c.filter);
    if (c.find) { await page.locator(".qcv-group[data-v138] [data-qc140='find'] input").first().fill(c.find); await page.waitForTimeout(900); }
    await unfold(page);
    const list = await ids(page);
    await setView(page, "cards");
    const cards = await ids(page);
    const a = new Set(list?.ids ?? []), b = new Set(cards?.ids ?? []);
    const onlyList = [...a].filter((x) => !b.has(x)), onlyCards = [...b].filter((x) => !a.has(x));
    L.check(`${c.name} · population`, applied && list && cards && a.size > 0 && list.view === "list" && cards.view === "cards", `applied ${applied} · list ${a.size} · cards ${b.size}`);
    L.check(`${c.name} · the same ids`, onlyList.length === 0 && onlyCards.length === 0 && a.size === b.size, `list ${a.size} · cards ${b.size} · only list ${onlyList.length} · only cards ${onlyCards.length}`);
    L.check(`${c.name} · the title counts them (Cards)`, titleN(cards?.title ?? "") === b.size, `"${cards?.title}" · ${b.size}`);
    L.check(`${c.name} · the title counts them (List)`, titleN(list?.title ?? "") === a.size, `"${list?.title}" · ${a.size}`);
  }
  L.done(28);
});

/* ── L5 · the card is the landing page's front card ────────────────────────────────────────────────────────────── */
const fam = (f: string) => f.split(",")[0].replace(/["']/g, "").trim();
test("QC142-L5 card format", async ({ page }) => {
  test.setTimeout(360_000);
  const L = new Ledger("L5");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1512, height: 900 });
  await page.goto("/");
  await page.locator("[data-hc='front']").first().waitFor({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
  const pick = () => page.evaluate(() => {
    const st = (e: Element | null) => { if (!e) return null; const c = getComputedStyle(e); return { pad: c.padding, bw: c.borderTopWidth, bc: c.borderTopColor, br: c.borderTopLeftRadius, fs: c.fontSize, fw: c.fontWeight, ls: c.letterSpacing, tt: c.textTransform, lh: c.lineHeight, ff: c.fontFamily, bg: c.backgroundColor }; };
    const m = document.querySelector("[data-hc='front'], [data-qc142='mat']");
    return { mat: st(m), inner: st(m?.querySelector(".mk-lc-in") ?? null), band: st(m?.querySelector(".mk-lc-band") ?? null), name: st(m?.querySelector(".mk-lc-nm") ?? null) };
  });
  const land = await pick();
  for (const vp of SIZES) {
    const at = `${vp.width}`;
    await openQc(page, vp, { view: "cards" });
    await mutate(page, "L5");
    const qc = await page.evaluate(() => {
      const st = (e: Element | null) => { if (!e) return null; const c = getComputedStyle(e); return { pad: c.padding, bw: c.borderTopWidth, bc: c.borderTopColor, br: c.borderTopLeftRadius, fs: c.fontSize, fw: c.fontWeight, ls: c.letterSpacing, tt: c.textTransform, lh: c.lineHeight, ff: c.fontFamily, bg: c.backgroundColor }; };
      const m = [...document.querySelectorAll("[data-qc142='mat']")].find((e) => e.getBoundingClientRect().height > 0) ?? null;
      return { mat: st(m), inner: st(m?.querySelector(".mk-lc-in") ?? null), band: st(m?.querySelector(".mk-lc-band") ?? null), name: st(m?.querySelector(".mk-lc-nm") ?? null) };
    });
    L.check(`${at} · population`, land.mat && land.inner && land.band && land.name && qc.mat && qc.inner && qc.band && qc.name, `landing ${!!land.mat} · QC ${!!qc.mat}`);
    if (!land.mat || !qc.mat || !land.inner || !qc.inner || !land.band || !qc.band || !land.name || !qc.name) continue;
    L.check(`${at} · the mat's padding`, qc.mat.pad === land.mat.pad, `QC ${qc.mat.pad} · landing ${land.mat.pad}`);
    L.check(`${at} · the inner border`, qc.inner.bw === land.inner.bw && qc.inner.bc === land.inner.bc && qc.inner.br === land.inner.br, `QC ${qc.inner.bw} ${qc.inner.bc} r${qc.inner.br} · landing ${land.inner.bw} ${land.inner.bc} r${land.inner.br}`);
    L.check(`${at} · the band's font`, qc.band.fs === land.band.fs && qc.band.fw === land.band.fw && qc.band.ls === land.band.ls && qc.band.tt === land.band.tt && qc.band.lh === land.band.lh && fam(qc.band.ff) === fam(land.band.ff),
      `QC ${qc.band.fw} ${qc.band.fs}/${qc.band.lh} ${fam(qc.band.ff)} ${qc.band.ls} ${qc.band.tt} · landing ${land.band.fw} ${land.band.fs}/${land.band.lh} ${fam(land.band.ff)} ${land.band.ls} ${land.band.tt}`);
    L.check(`${at} · the agent's name font`, qc.name.fs === land.name.fs && qc.name.fw === land.name.fw && qc.name.ls === land.name.ls && fam(qc.name.ff) === fam(land.name.ff),
      `QC ${qc.name.fw} ${qc.name.fs} ${fam(qc.name.ff)} · landing ${land.name.fw} ${land.name.fs} ${fam(land.name.ff)}`);
    /* the band's word is whereItStands: tallied over every card, it must equal the hero's four counts (the same sets) */
    const t = await page.evaluate(() => {
      const words: Record<string, number> = {};
      const LABEL: Record<string, string> = { you: "With you", agent: "With the agent", quiet: "Gone quiet", closed: "Closed" };
      let agree = 0, disagree = 0;
      for (const c of document.querySelectorAll<HTMLElement>(".qc138-sheet [data-qc142='card']")) {
        if (c.closest("[data-qc139='practice']")) continue;
        const k = c.dataset.where ?? "";
        const w = c.querySelector("[data-qc142='band-word']")?.textContent?.trim() ?? "";
        if (LABEL[k] === w) agree += 1; else disagree += 1;
        words[k] = (words[k] ?? 0) + 1;
      }
      const hero: Record<string, number> = {};
      for (const r of document.querySelectorAll<HTMLElement>("[data-qc141='card-row']")) if (r.getBoundingClientRect().height > 0) hero[r.dataset.k ?? ""] = Number(r.dataset.n);
      return { words, hero, agree, disagree };
    });
    L.check(`${at} · population: cards tallied`, t.agree + t.disagree > 10 && Object.keys(t.hero).length === 4, JSON.stringify(t));
    L.check(`${at} · each band says its set`, t.disagree === 0, `${t.agree} agree · ${t.disagree} disagree`);
    for (const k of ["you", "agent", "quiet", "closed"]) L.check(`${at} · ${k}: cards = the hero's count`, (t.words[k] ?? 0) === t.hero[k], `cards ${t.words[k] ?? 0} · hero ${t.hero[k]}`);
  }
  L.done(22);
});

/* ── L6 · a stuck heading never covers a card ──────────────────────────────────────────────────────────────────── */
test("QC142-L6 not covered", async ({ page }) => {
  test.setTimeout(600_000);
  const L = new Ledger("L6");
  for (const vp of SIZES) {
    for (const pinned of [false, true]) {
      const at = `${vp.width} ${pinned ? "full screen" : "unpinned"}`;
      await openQc(page, vp, { view: "cards", pinned });
      await mutate(page, "L6");
      const read = (gkey: string | null) => page.evaluate((g) => {
        const sheet = [...document.querySelectorAll<HTMLElement>(".qc138-sheet")].find((e) => e.getBoundingClientRect().height > 0)!;
        const stack = sheet.querySelector<HTMLElement>("[data-qc140='stack']")!.getBoundingClientRect();
        const sec = g ? sheet.querySelector<HTMLElement>(`.qc142-gsec[data-group="${CSS.escape(g)}"]`) : sheet.querySelector<HTMLElement>(".qc142-gsec");
        if (!sec) return null;
        const h = sec.querySelector<HTMLElement>(".qc142-rh")!.getBoundingClientRect();
        const c = sec.querySelector<HTMLElement>("[data-qc142='card']")!.getBoundingClientRect();
        const sc = [...document.querySelectorAll<HTMLElement>(".wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0)!;
        return { stackB: stack.bottom, hT: h.top, hB: h.bottom, cT: c.top, atFoot: sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 2, scroll: sc.scrollTop };
      }, gkey);
      const r0 = await read(null);
      L.check(`${at} · population at scroll 0`, !!r0, JSON.stringify(r0));
      if (r0) L.check(`${at} · scroll 0: the first card is 24 or more below its heading`, r0.cT - r0.hB >= 24 - 0.5, `${(r0.cT - r0.hB).toFixed(1)}`);
      /* the stuck heading: scroll a little past the first heading */
      await scrollTo(page, (r0?.scroll ?? 0) + 260);
      await page.waitForTimeout(500);
      const stuck = await page.evaluate(() => {
        const sheet = [...document.querySelectorAll<HTMLElement>(".qc138-sheet")].find((e) => e.getBoundingClientRect().height > 0)!;
        const stack = sheet.querySelector<HTMLElement>("[data-qc140='stack']")!.getBoundingClientRect();
        const hs = [...sheet.querySelectorAll<HTMLElement>(".qc142-rh")].map((h) => h.getBoundingClientRect()).filter((r) => r.bottom > stack.bottom - 1);
        return { stackB: stack.bottom, top: hs.length ? hs[0].top : null };
      });
      L.check(`${at} · the stuck heading's top is the toolbar's bottom`, near(stuck.top, stuck.stackB, 1), `heading ${stuck.top?.toFixed(1)} · toolbar ${stuck.stackB.toFixed(1)}`);
      /* RETIRED (navy-bar v1 A1): the half that pressed each jump-row button — the jump row is gone in both modes */
    }
  }
  L.done(12);
});

/* ── L7 · the strip: under the toolbar, the card's width (inset 24 in full screen), one Clear all, live ─────────── */
test("QC142-L7 strip", async ({ page }) => {
  test.setTimeout(420_000);
  const L = new Ledger("L7");
  for (const vp of SIZES) {
    for (const pinned of [false, true]) {
      const at = `${vp.width} ${pinned ? "full screen" : "unpinned"}`;
      await openQc(page, vp, { view: "cards", pinned });
      await mutate(page, "L7");
      await press(page, ".qcv-group[data-v138] [data-qc140='filters']");
      await page.waitForTimeout(900);
      const g = await page.evaluate(() => {
        const v = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0)?.getBoundingClientRect() ?? null;
        const strip = v("[data-qc142='filter-strip']"), stack = v("[data-qc140='stack']"), sheet = v(".qc138-sheet");
        return strip && stack && sheet ? { sT: strip.top, sL: strip.left, sR: strip.right, stB: stack.bottom, shL: sheet.left, shR: sheet.right } : null;
      });
      L.check(`${at} · population: the strip`, !!g, JSON.stringify(g));
      if (!g) continue;
      L.check(`${at} · it opens below the toolbar`, near(g.sT, g.stB, 1), `strip ${g.sT.toFixed(1)} · toolbar ${g.stB.toFixed(1)}`);
      const inset = pinned ? 24 : 0;
      L.check(`${at} · it spans the list card${pinned ? ", inset 24" : ""}`, near(g.sL - g.shL, inset, 1) && near(g.shR - g.sR, inset, 1), `left ${(g.sL - g.shL).toFixed(1)} · right ${(g.shR - g.sR).toFixed(1)}`);
      const before = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-qc142='count']"), ...document.querySelectorAll<HTMLElement>("[data-qc142='filter-count']")].filter((e) => e.getBoundingClientRect().height > 0).map((e) => e.textContent).join(" | "));
      const hit = await press(page, "[data-qc142='filter-strip'] [data-qc140='quick'][data-qp='you']");
      await page.waitForTimeout(900);
      const after = await page.evaluate(() => ({
        open: !!document.querySelector("[data-qc142='filter-strip']"),
        text: [...document.querySelectorAll<HTMLElement>("[data-qc142='count']"), ...document.querySelectorAll<HTMLElement>("[data-qc142='filter-count']")].filter((e) => e.getBoundingClientRect().height > 0).map((e) => e.textContent).join(" | "),
        show: [...document.querySelectorAll<HTMLElement>("button")].filter((b) => b.getBoundingClientRect().height > 0 && /^Show \d+/.test((b.textContent ?? "").trim())).length,
        clears: [...document.querySelectorAll<HTMLElement>("button")].filter((b) => b.getBoundingClientRect().height > 0 && /^Clear all$/.test((b.textContent ?? "").trim())).length,
        exportIn: !!document.querySelector("[data-qc140='applied'] [data-qc142='export']"),
      }));
      L.check(`${at} · a choice applies at once, the strip still open`, hit && after.open && after.text !== before, `${before} → ${after.text}`);
      L.check(`${at} · no Show button`, after.show === 0, `${after.show}`);
      L.check(`${at} · exactly one Clear all`, after.clears === 1, `${after.clears}`);
      L.check(`${at} · Export is in the applied row`, after.exportIn, `${after.exportIn}`);
    }
  }
  L.done(28);
});

/* ── L8 · the landing page's hero card renders exactly as before ─────────────────────────────────────────────────── */
test("QC142-L8 landing untouched", async ({ page }) => {
  test.setTimeout(240_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1512, height: 900 });
  await page.goto("/");
  const front = page.locator("[data-hc='front']").first();
  await front.waitFor({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2500);
  await mutate(page, "L8");
  expect(await front.boundingBox(), "population: the landing's front card").not.toBeNull();
  const shot = await page.screenshot({ clip: (await front.boundingBox())! });
  mkdirSync(`${DIR}/ledger`, { recursive: true });
  writeFileSync(`${DIR}/ledger/${BASE ? "base-" : ""}${MUT === "L8" ? "mut-" : ""}L8-front.png`, shot);
  expect(shot).toMatchSnapshot("qc142-l8-landing-front.png", { maxDiffPixelRatio: 0.001 });
});
