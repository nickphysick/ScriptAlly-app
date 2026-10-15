/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v18 — locks CL18 A1 to F5, on the rendered page at 1512 × 900 and 1280 × 800 with the shell.
 *
 * Each lock was run against the build before the pack (`CL18_BASE=1`, ledger `base-<lock>.json`) and with its named
 * mutation (`CL18_MUTATE=<lock>`, ledger `mut-<lock>.json`) before its green was believed. Mutations named `src` in
 * the table are source edits made and undone in the measurement worktree (what they break is a decision the code
 * makes, not something drawn); the rest are applied in the page.
 *
 * ⚠️ F1, F2 AND F4 WRITE TO THE HARNESS ACCOUNT AND PUT IT BACK IN THE SAME RUN: a reply time saved and undone, and
 *    the intro's flag cleared and left set (as it was before the run). `tests/e2e/hkFlags.mjs` reads and clears it.
 * ⚠️ EVERY WORKSPACE PAGE STAYS MOUNTED: every read starts from the visible Contact list.
 */
import { expect, test, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { openContacts16, setScroll16 } from "./cl16Lib";
import { liftMotionSuppression } from "./measure";

const DIR = "reports/contact-list-v18";
const MUT = process.env.CL18_MUTATE ?? "";
const BASE = process.env.CL18_BASE === "1";
const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
const near = (a: unknown, b: number, t: number) => typeof a === "number" && Number.isFinite(a) && Math.abs(a - b) <= t;
const flags = (clear = false): { hkIntroSeen: boolean | null; tabDismissedAtGaps: number | null } =>
  JSON.parse(execSync(`node tests/e2e/hkFlags.mjs${clear ? " --clear" : ""}`, { encoding: "utf8" }).trim().split("\n").pop() ?? "{}");

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

/** one named break per lock, in the page; `src` locks are broken in the source (see the header) */
const MUTATIONS: Record<string, { css?: string; js?: string }> = {
  /* the counts read from the unfiltered list: the first reading of every tab is held whatever the filter does */
  A1: { js: `(() => { const held = {}; for (const b of document.querySelectorAll('[data-cl18="tab"]')) held[b.dataset.l] = b.querySelector('[data-cl18="tab-n"]')?.textContent ?? ""; const fix = () => { for (const b of document.querySelectorAll('[data-cl18="tab"]')) { const s = b.querySelector('[data-cl18="tab-n"]'); if (s && s.textContent !== held[b.dataset.l]) { s.textContent = held[b.dataset.l]; b.dataset.n = held[b.dataset.l] || "0"; b.disabled = !held[b.dataset.l]; } } }; new MutationObserver(fix).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["data-n", "disabled"] }); })()` },
  /* an interval that re-sets the pinned row's top */
  A3: { js: `(() => { let n = 0; setInterval(() => { const p = document.querySelector('[data-cl17="pinned"]'); if (p) p.style.top = (n++ % 2 ? 3 : 0) + "px"; }, 120); })()` },
  /* the filter row left in the page header */
  B1: { js: `(() => { const h = [...document.querySelectorAll('.aglist [data-cl17="header"]')].find((e) => e.getBoundingClientRect().height > 0); if (h) { const d = document.createElement("div"); d.setAttribute("data-cl17", "filter-row"); d.style.height = "56px"; h.appendChild(d); } })()` },
  /* the strip inset to the rows */
  C1: { css: `.clv-group .cl16-list .lt-labels { margin-inline: 24px !important; }` },
  /* the cream fill restored */
  C2: { css: `.cl16-list .clv-row .sa-disc.clv-ini[data-disc="none"] { background: #f4eee5 !important; border-style: solid !important; }` },
  /* the frame drawn inside the panel */
  E1: { js: `(() => { const fix = () => { for (const c of document.querySelectorAll('[data-apc="card"][data-variant="plain"]')) if (!c.querySelector(".apc-frame")) { const f = document.createElement("div"); f.className = "apc-frame"; f.style.cssText = "border:1px solid #a5837b;border-radius:13px;height:4px"; c.prepend(f); } }; new MutationObserver(fix).observe(document.body, { subtree: true, childList: true }); fix(); })()` },
  /* the pop appended inside the drawer */
  /* the pop drawn in the drawer's own flow (absolute, inside its body) rather than in the top layer */
  F5: { js: `(() => { new MutationObserver(() => { const d = document.querySelector('.hdr[data-hdr="housekeeping"] .hdr-body'); for (const p of document.querySelectorAll('body > [data-hk8="pop"]')) if (d) { p.style.position = "absolute"; d.appendChild(p); } }).observe(document.body, { childList: true }); })()` },
};
const mutate = async (page: Page, lock: string) => {
  const m = MUT === lock ? MUTATIONS[lock] : null;
  if (!m) return;
  if (m.css) await page.addStyleTag({ content: m.css });
  if (m.js) await page.evaluate(m.js);
  await page.waitForTimeout(200);
};
const open = async (page: Page, vp: { width: number; height: number }, lock: string, opts: { motion?: boolean } = {}) => {
  await openContacts16(page, vp, { motion: opts.motion });
  await mutate(page, lock);
};
const vis = (page: Page, sel: string) => page.locator(sel).filter({ visible: true }).first();
const scrollTo = (page: Page, top: number) => setScroll16(page, top);

/* ───────────────────────── A1 · strip ───────────────────────── */
test("A1 · strip: 26 tabs above the title, none in the list, counts follow the list", async ({ page }) => {
  const L = new Ledger("A1");
  for (const vp of SIZES) {
    await open(page, vp, "A1"); const w = `@${vp.width}`;
    const read = () => page.evaluate(() => {
      const g = [...document.querySelectorAll<HTMLElement>(".aglist .clv-group")].find((e) => e.getBoundingClientRect().height > 0)!;
      const list = g.querySelector<HTMLElement>(".cl16-list");
      const hd = g.querySelector<HTMLElement>('[data-cl17="header"]');
      const tabs = [...(hd?.querySelectorAll<HTMLButtonElement>('[data-cl18="tab"]') ?? [])];
      const rows = [...g.querySelectorAll<HTMLElement>('[data-clv="row"][data-initial]')];
      const by: Record<string, number> = {};
      for (const r of rows) by[r.dataset.initial!] = (by[r.dataset.initial!] ?? 0) + 1;
      const title = hd?.querySelector('[data-cl17="title"]')?.getBoundingClientRect();
      return {
        inList: list ? list.querySelectorAll('.clv-idxwrap, .clv-ixtab, [data-cl18="tab"]').length : -1,
        n: tabs.length, above: tabs.every((t) => title && t.getBoundingClientRect().bottom <= title.top),
        bad: tabs.filter((t) => Number(t.dataset.n) !== (by[t.dataset.l!] ?? 0) || t.disabled !== ((by[t.dataset.l!] ?? 0) === 0)).map((t) => `${t.dataset.l}:${t.dataset.n}/${by[t.dataset.l!] ?? 0}${t.disabled ? "d" : ""}`),
        rows: rows.length,
      };
    });
    const r = await read();
    L.check(`no letter tabs inside the list sheet ${w}`, r.inList === 0, `${r.inList}`);
    L.check(`26 tabs in the header, above the title ${w}`, r.n === 26 && r.above, `${r.n} · above ${r.above}`);
    L.check(`each count is the visible rows for its letter, a letter with none disabled ${w}`, r.bad.length === 0, r.bad.join(" "));
    /* a filter changes the counts: the search narrows the list */
    await vis(page, '.aglist [data-cl18="list-header"] [data-cl13-find="banner"] input').fill("ar"); await page.waitForTimeout(700);
    const f = await read();
    L.check(`filtered (${f.rows} rows): each count is still the visible rows ${w}`, f.rows < r.rows && f.bad.length === 0, `${f.rows} of ${r.rows} · ${f.bad.join(" ")}`);
    await vis(page, '.aglist [data-cl18="list-header"] [data-cl13-find="banner"] input').fill(""); await page.waitForTimeout(400);
  }
  L.done(8);
});

/* ───────────────────────── A2 · jump ───────────────────────── */
const landing = (page: Page, L: string) => page.evaluate((L) => {
  const g = [...document.querySelectorAll<HTMLElement>(".aglist .clv-group")].find((e) => e.getBoundingClientRect().height > 0)!;
  const row = g.querySelector<HTMLElement>(`[data-clv="row"][data-initial="${L}"]`);
  const lab = g.querySelector<HTMLElement>(".lt-panel > .lt-labels");
  const s = g.querySelector('[data-cl18="sentence"]')?.textContent ?? "";
  return { row: row?.getBoundingClientRect().top ?? null, lab: lab?.getBoundingClientRect().bottom ?? null, sentence: s.replace(/\s+/g, " ").trim() };
}, L);
test("A2 · jump: M lands under the headings, and a grouped list switches to A to Z first", async ({ page }) => {
  const L = new Ledger("A2");
  for (const vp of SIZES) {
    await open(page, vp, "A2"); const w = `@${vp.width}`;
    await vis(page, '.aglist [data-cl18="tab"][data-l="M"]').click(); await page.waitForTimeout(1600);
    const a = await landing(page, "M");
    L.check(`M's first row is under the headings (±2) ${w}`, a.row !== null && a.lab !== null && near(a.row, a.lab, 2), `${a.row?.toFixed(1)} vs ${a.lab?.toFixed(1)}`);
    await scrollTo(page, 0); await page.waitForTimeout(300);
    await vis(page, '.aglist [data-cl18="group"]').click(); await page.waitForTimeout(300);
    await page.locator('[data-opt="group:status"]').click(); await page.waitForTimeout(600);
    const g0 = await landing(page, "M");
    L.check(`precondition: grouped by status ${w}`, /grouped by Status/.test(g0.sentence), g0.sentence);
    await vis(page, '.aglist [data-cl18="tab"][data-l="M"]').click(); await page.waitForTimeout(1800);
    const b = await landing(page, "M");
    L.check(`it switched to A to Z, ungrouped ${w}`, /, A to Z/.test(b.sentence), b.sentence);
    L.check(`and M landed the same way (±2) ${w}`, b.row !== null && b.lab !== null && near(b.row, b.lab, 2), `${b.row?.toFixed(1)} vs ${b.lab?.toFixed(1)}`);
  }
  L.done(8);
});

/* ───────────────────────── A3 · spy ───────────────────────── */
test("A3 · spy: stepping 1px over 600px, both strips name the row at the line; the pinned row holds one box", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("A3");
  for (const vp of SIZES) {
    await open(page, vp, "A3"); const w = `@${vp.width}`;
    await scrollTo(page, 900); await page.waitForTimeout(500);
    const r = await page.evaluate(async () => {
      const g = [...document.querySelectorAll<HTMLElement>(".aglist .clv-group")].find((e) => e.getBoundingClientRect().height > 0)!;
      const sc = g.closest<HTMLElement>(".wpg-scroll")!;
      const frame = () => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
      const start = sc.scrollTop; const bad: string[] = []; const boxes = new Set<string>(); let n = 0;
      for (let i = 0; i <= 600; i++) {
        sc.scrollTop = start + i; await frame();
        const lab = g.querySelector<HTMLElement>(".lt-panel > .lt-labels")!;
        const line = sc.getBoundingClientRect().top + (parseFloat(getComputedStyle(lab).top) || 0) + lab.offsetHeight + 2;
        let cur: string | null = null;
        for (const row of g.querySelectorAll<HTMLElement>('[data-clv="row"][data-initial]')) { if (row.getBoundingClientRect().top <= line) cur = row.dataset.initial ?? null; else break; }
        const top = g.querySelector('[data-cl18="tab"][aria-current="true"]')?.getAttribute("data-l") ?? null;
        const pin = document.querySelector('[data-cl18="pin-letter"][aria-current="true"]')?.getAttribute("data-l") ?? null;
        if (top !== cur || pin !== cur) bad.push(`${i}:${cur}/${top}/${pin}`);
        const p = document.querySelector<HTMLElement>('[data-cl17="pinned"][data-on]');
        if (p) { const b = p.getBoundingClientRect(); boxes.add(`${b.left.toFixed(1)},${b.top.toFixed(1)},${b.width.toFixed(1)}`); }
        n++;
      }
      return { n, bad, boxes: [...boxes] };
    });
    L.check(`601 steps read ${w}`, r.n === 601, `${r.n}`);
    L.check(`both strips' current letter is the row at the line at every step ${w}`, r.bad.length === 0, `${r.bad.length} misses: ${r.bad.slice(0, 6).join(" ")}`);
    L.check(`the pinned row takes one box while pinned ${w}`, r.boxes.length === 1, `${r.boxes.length} boxes: ${r.boxes.slice(0, 3).join(" | ")}`);
  }
  L.done(6);
});

/* ───────────────────────── B1 · header ───────────────────────── */
test("B1 · header: slate, one sentence that follows the filters, the four tools on one line, no filter row above", async ({ page }) => {
  const L = new Ledger("B1");
  for (const vp of SIZES) {
    await open(page, vp, "B1"); const w = `@${vp.width}`;
    const read = () => page.evaluate(() => {
      const g = [...document.querySelectorAll<HTMLElement>(".aglist .clv-group")].find((e) => e.getBoundingClientRect().height > 0)!;
      const lh = g.querySelector<HTMLElement>('[data-cl18="list-header"]');
      const hd = g.querySelector<HTMLElement>('[data-cl17="header"]');
      const s = lh?.querySelector<HTMLElement>('[data-cl18="sentence"]');
      const tools = lh ? ['[data-cl13-find="banner"]', '[data-cl18="filters"]', '[data-cl18="density"]', '[data-cl16="full"]'].map((q) => lh.querySelector<HTMLElement>(q)) : [];
      const tops = tools.map((t) => (t ? t.getBoundingClientRect().top + t.getBoundingClientRect().height / 2 : NaN));
      return {
        bg: lh ? getComputedStyle(lh).backgroundColor : null, sentence: (s?.textContent ?? "").replace(/\s+/g, " ").trim(),
        lines: s ? Math.round(s.getBoundingClientRect().height / parseFloat(getComputedStyle(s).lineHeight)) : null,
        tools: tools.filter(Boolean).length, spread: Math.max(...tops) - Math.min(...tops),
        filterRow: hd ? hd.querySelectorAll('[data-cl17="filter-row"], [data-cl14="frow"], [data-cl17="pill"]').length : -1,
        rows: g.querySelectorAll('[data-clv="row"]').length,
      };
    });
    const r = await read();
    L.check(`the list header is rgb(62, 81, 112) ${w}`, r.bg === "rgb(62, 81, 112)", `${r.bg}`);
    L.check(`"Showing all {N} agents, A to Z" ${w}`, r.sentence === `Showing all ${r.rows} agents, A to Z`, `"${r.sentence}"`);
    L.check(`no filter row in the page header ${w}`, r.filterRow === 0, `${r.filterRow}`);
    L.check(`search, Filters, density and full screen in the header, on one line ${w}`, r.tools === 4 && r.spread < 2 && r.lines === 1, `${r.tools} tools · spread ${r.spread.toFixed(1)} · ${r.lines} line(s)`);
    await vis(page, '.aglist [data-cl18="filters"]').click(); await page.waitForTimeout(300);
    await page.locator('[data-cl18="filters-panel"] [data-opt="open:open"]').click(); await page.waitForTimeout(500);
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    const f = await read();
    L.check(`filtered: "Showing {n} of {N}, A to Z" with Clear all ${w}`, new RegExp(`^Showing ${f.rows} of ${r.rows}, A to Z ?Clear all$`).test(f.sentence), `"${f.sentence}"`);
    await vis(page, '.aglist [data-cl18="list-header"] [data-cl17="clear-all"]').click(); await page.waitForTimeout(400);
  }
  L.done(10);
});

/* ───────────────────────── B2 · filters ───────────────────────── */
test("B2 · filters: the panel drives v17's filter state; Show n; the button's count; Escape returns focus", async ({ page }) => {
  const L = new Ledger("B2");
  for (const vp of SIZES) {
    await open(page, vp, "B2"); const w = `@${vp.width}`;
    await vis(page, '.aglist [data-cl18="filters"]').click(); await page.waitForTimeout(300);
    await page.locator('[data-cl18="filters-panel"] [data-opt="open:open"]').click(); await page.waitForTimeout(500);
    const r = await page.evaluate(() => {
      const g = [...document.querySelectorAll<HTMLElement>(".aglist .clv-group")].find((e) => e.getBoundingClientRect().height > 0)!;
      const rows = [...g.querySelectorAll<HTMLElement>('[data-clv="row"]')];
      const key = Object.keys(sessionStorage).find((k) => k.startsWith("sa.contactList.v"));
      const mem = key ? JSON.parse(sessionStorage.getItem(key) ?? "{}") : {};
      return {
        rows: rows.length, open: rows.filter((x) => x.dataset.door === "open").length, store: mem?.filters?.open ?? null,
        show: document.querySelector('[data-cl18="filters-show"]')?.textContent?.trim() ?? "",
        n: g.querySelector<HTMLElement>('[data-cl18="filters"]')?.dataset.n ?? null,
      };
    });
    L.check(`the list shows only agents open to queries ${w}`, r.rows > 0 && r.rows === r.open, `${r.open} of ${r.rows}`);
    L.check(`the stored filter state says open (v17's own state) ${w}`, r.store === "open", `${r.store}`);
    L.check(`"Show {n} agents" is the visible rows ${w}`, r.show === `Show ${r.rows} ${r.rows === 1 ? "agent" : "agents"}`, `"${r.show}"`);
    L.check(`the Filters button counts one set filter ${w}`, r.n === "1", `${r.n}`);
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    const focus = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.getAttribute("data-cl18"));
    L.check(`Escape closes it and returns focus to the button ${w}`, focus === "filters" && (await page.locator('[data-cl18="filters-panel"]').count()) === 0, `${focus}`);
    await vis(page, '.aglist [data-cl18="list-header"] [data-cl17="clear-all"]').click(); await page.waitForTimeout(400);
  }
  L.done(10);
});

/* ───────────────────────── C1 · headings ───────────────────────── */
test("C1 · headings: the Query Centre's strip at the sheet's full width, each heading over its column", async ({ page }) => {
  const L = new Ledger("C1");
  for (const vp of SIZES) {
    await open(page, vp, "C1"); const w = `@${vp.width}`;
    const r = await page.evaluate(() => {
      const g = [...document.querySelectorAll<HTMLElement>(".aglist .clv-group")].find((e) => e.getBoundingClientRect().height > 0)!;
      const sheet = g.querySelector<HTMLElement>(".cl16-list")!.getBoundingClientRect();
      const lab = g.querySelector<HTMLElement>(".lt-panel > .lt-labels")!;
      const lr = lab.getBoundingClientRect();
      const heads = [...lab.querySelectorAll<HTMLElement>(".lt-lab")].map((e) => e.getBoundingClientRect());
      const row = g.querySelector<HTMLElement>('[data-clv="row"]')!;
      const cells = ['.clv-rwho', '.clv-rfit', '.clv-rrep', '.clv-rq'].map((q) => row.querySelector<HTMLElement>(q)!.getBoundingClientRect());
      return { bg: getComputedStyle(lab).backgroundColor, l: lr.left, r: lr.right, sl: sheet.left, sr: sheet.right,
        off: heads.map((h, i) => (i === 3 ? h.right - cells[i].right : h.left - cells[i].left)) };
    });
    L.check(`the strip is rgb(233, 237, 243) ${w}`, r.bg === "rgb(233, 237, 243)", `${r.bg}`);
    L.check(`at the sheet's full width (±1) ${w}`, near(r.l, r.sl, 1) && near(r.r, r.sr, 1), `${r.l.toFixed(1)}–${r.r.toFixed(1)} vs ${r.sl.toFixed(1)}–${r.sr.toFixed(1)}`);
    L.check(`each heading within 2px of its column ${w}`, r.off.every((d) => Math.abs(d) <= 2), r.off.map((d) => d.toFixed(1)).join(" · "));
  }
  L.done(6);
});

/* ───────────────────────── C2 · disc ───────────────────────── */
test("C2 · disc: a not-queried disc is a dotted ring with no fill", async ({ page }) => {
  const L = new Ledger("C2");
  for (const vp of SIZES) {
    await open(page, vp, "C2"); const w = `@${vp.width}`;
    const r = await page.evaluate(() => {
      const d = [...document.querySelectorAll<HTMLElement>('.aglist [data-clv="row"][data-disc="none"] .clv-ini')].find((e) => e.getBoundingClientRect().height > 0);
      return d ? { bg: getComputedStyle(d).backgroundColor, style: getComputedStyle(d).borderTopStyle, w: getComputedStyle(d).borderTopWidth } : null;
    });
    L.check(`a transparent fill ${w}`, r?.bg === "rgba(0, 0, 0, 0)", `${r?.bg}`);
    L.check(`a dotted border ${w}`, r?.style === "dotted", `${r?.style} ${r?.w}`);
  }
  L.done(4);
});

/* ───────────────────────── D1 · peek ───────────────────────── */
test("D1 · peek: none at 300ms, open by 900ms; Copy never opens the row; Space toggles; missing fields not drawn", async ({ page }) => {
  const L = new Ledger("D1");
  for (const vp of SIZES) {
    await open(page, vp, "D1"); const w = `@${vp.width}`;
    const row = vis(page, '.aglist [data-clv="row"]');
    await row.hover(); await page.waitForTimeout(300);
    const at300 = await page.locator('[data-cl18="peek"]').count();
    await page.waitForTimeout(600);
    const at900 = await page.locator('[data-cl18="peek"]').count();
    L.check(`no peek at 300ms, one by 900ms ${w}`, at300 === 0 && at900 === 1, `${at300} → ${at900}`);
    const copy = page.locator('[data-cl18="peek"] [data-cl18="peek-copy"]');
    const target = (await copy.count()) ? copy : page.locator('[data-cl18="peek"] [data-cl18="peek-words"] h4');
    await target.first().click(); await page.waitForTimeout(700);
    const panel = await page.locator('[data-ap="panel"]').filter({ visible: true }).count();
    L.check(`a click inside the card does not open the row ${w}`, panel === 0, `${panel} panel(s) · clicked ${(await copy.count()) ? "Copy" : "the card"}`);
    const missing = await page.evaluate(() => {
      const p = document.querySelector('[data-cl18="peek"]');
      return { nft: /Not for them/.test(p?.textContent ?? ""), viaLink: !!p?.querySelector('[data-k="via"] a'), fields: [...(p?.querySelectorAll('[data-cl18="peek-label"]') ?? [])].map((e) => e.textContent).join("|") };
    });
    L.check(`no "Not for them" and no query-via link (neither is stored) ${w}`, !missing.nft && !missing.viaLink && missing.fields === "Email|Website|Social|Query via|Send them|Replies", JSON.stringify(missing));
    await page.mouse.move(2, 2); await page.waitForTimeout(400);
    await row.focus(); await page.keyboard.press(" "); await page.waitForTimeout(300);
    const on = await page.locator('[data-cl18="peek"]').count();
    await page.keyboard.press(" "); await page.waitForTimeout(300);
    const off = await page.locator('[data-cl18="peek"]').count();
    L.check(`Space toggles the peek on a focused row ${w}`, on === 1 && off === 0, `${on} → ${off}`);
  }
  L.done(8);
});

/* ───────────────────────── E1 · card ───────────────────────── */
test("E1 · card: the framed card's frame holds the band; the panel's plain card has neither; the masthead's three colours", async ({ page }) => {
  const L = new Ledger("E1");
  flags(true);
  await open(page, SIZES[0], "E1");
  await page.keyboard.press("h"); await page.waitForTimeout(900);
  const fr = await page.evaluate(() => {
    const c = document.querySelector('[data-apc="card"][data-variant="framed"]');
    const f = c?.querySelector<HTMLElement>(".apc-frame");
    return { frame: f ? getComputedStyle(f).borderTopColor : null, band: !!f?.querySelector(".apc-band") };
  });
  L.check("the framed card's 1px frame is rgb(165, 131, 123)", fr.frame === "rgb(165, 131, 123)", `${fr.frame}`);
  L.check("and the band is inside the frame", fr.band, `${fr.band}`);
  await page.locator('[data-hk8="not-now"]').click(); await page.waitForTimeout(600);
  const want: Record<string, string> = { none: "rgb(94, 113, 137)", live: "rgb(45, 58, 80)", closed: "rgb(169, 163, 156)" };
  for (const disc of ["none", "live", "closed"] as const) {
    const row = page.locator(`.aglist [data-clv="row"][data-disc="${disc}"]`).filter({ visible: true }).first();
    if (!(await row.count())) { L.check(`a ${disc} row to open`, false, "none on the account"); continue; }
    await row.click(); await page.waitForTimeout(1200);
    const r = await page.evaluate(() => {
      const card = document.querySelector('[data-ap="card"]');
      const m = card?.querySelector<HTMLElement>(".qcv-open-mast");
      const plain = card?.querySelector('[data-apc="card"][data-variant="plain"]');
      return { mast: m ? getComputedStyle(m).backgroundColor : null, status: card?.getAttribute("data-ap-status"), plain: !!plain, frame: !!plain?.querySelector(".apc-frame, .apc-band, .apc-head") };
    });
    L.check(`${disc}: the masthead is ${want[disc]}`, r.mast === want[disc] || (disc === "none" && r.status === "closed"), `${r.mast} (${r.status})`);
    L.check(`${disc}: the Profile tab is the plain card, no frame, band or head`, r.plain && !r.frame, `plain ${r.plain} · frame ${r.frame}`);
    await page.keyboard.press("Escape"); await page.waitForTimeout(700);
  }
  L.done(8);
});

/* ───────────────────────── F1 · score ───────────────────────── */
test("F1 · score: the page ring, the tab and the drawer show one number; a reply time adds exactly 6", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("F1");
  await open(page, SIZES[0], "F1");
  const nums = () => page.evaluate(() => ({
    ring: (document.querySelector('.aglist [data-cl17="ring-pct"]')?.textContent ?? "").replace("%", ""),
    tab: (document.querySelector('[data-hkv="tab-counts"]')?.textContent ?? "").match(/(\d+)% list health/)?.[1] ?? null,
    drawer: (document.querySelector('[data-hk8="pct"]')?.textContent ?? "").replace("%", "") || null,
    points: document.querySelector('[data-hk8="points"]')?.textContent ?? "",
  }));
  await page.keyboard.press("h"); await page.waitForTimeout(1000);
  if (await page.locator('[data-hk8="not-now"]').count()) { await page.locator('[data-hk8="not-now"]').click(); await page.waitForTimeout(500); await page.keyboard.press("h"); await page.waitForTimeout(900); }
  const a = await nums();
  L.check("the page ring, the tab and the drawer show one number", !!a.ring && a.ring === a.tab && a.ring === a.drawer, `${a.ring} · ${a.tab} · ${a.drawer}`);
  const held0 = Number(a.points.match(/^(\d+) of (\d+) points/)?.[1]);
  L.check("the drawer states held of possible", Number.isFinite(held0), `"${a.points}"`);
  /* a reply time: Focus on the first reply gap, one step, Save */
  const reply = page.locator('[data-hk8="detail"][data-gap="reply"] [data-hk8="ledger-row"]').first();
  if (!(await reply.count())) { L.check("a reply-time gap to fill", false, "none"); L.done(4); return; }
  await reply.click(); await page.waitForTimeout(600);
  await page.locator('[data-hk8="field"][data-gap="reply"] button[data-d="1"]').click(); await page.waitForTimeout(200);
  await page.locator('[data-hk8="save"]').click(); await page.waitForTimeout(2500);
  const b = await nums();
  const held1 = Number(b.points.match(/^(\d+) of/)?.[1]);
  L.check("saving a reply time adds exactly 6 to held", held1 - held0 === 6, `${held0} → ${held1}`);
  L.check("the three still agree after the save", b.ring === b.tab && b.ring === b.drawer, `${b.ring} · ${b.tab} · ${b.drawer}`);
  /* put the account back */
  await page.locator('[data-hkv="undo"]').click(); await page.waitForTimeout(2500);
  const c = await nums();
  L.check("Undo puts held back", Number(c.points.match(/^(\d+) of/)?.[1]) === held0, `"${c.points}"`);
  L.done(5);
});

/* ───────────────────────── F2 · intro ───────────────────────── */
test("F2 · intro: on the first open only (stored); Not now sets the flag; Start lands in Focus", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("F2");
  flags(true);
  await open(page, SIZES[0], "F2");
  await page.keyboard.press("h"); await page.waitForTimeout(900);
  L.check("the first open shows the intro", (await page.locator('[data-hk8="intro"]').count()) === 1, "intro");
  await page.locator('[data-hk8="not-now"]').click(); await page.waitForTimeout(1500);
  L.check("Not now stores the flag", flags().hkIntroSeen === true, JSON.stringify(flags()));
  await page.keyboard.press("h"); await page.waitForTimeout(900);
  L.check("the next open lands on home", (await page.locator('[data-hk8="home"]').count()) === 1 && (await page.locator('[data-hk8="intro"]').count()) === 0, "home");
  await page.keyboard.press("Escape"); await page.waitForTimeout(500);
  await page.reload(); await page.locator(".clv-group:not([data-loading]) .clv-row").first().waitFor({ timeout: 60_000 }); await page.waitForTimeout(800);
  await page.keyboard.press("h"); await page.waitForTimeout(900);
  L.check("after a reload, still home", (await page.locator('[data-hk8="intro"]').count()) === 0, "no intro");
  await page.keyboard.press("Escape"); await page.waitForTimeout(500);
  flags(true);
  await page.reload(); await page.locator(".clv-group:not([data-loading]) .clv-row").first().waitFor({ timeout: 60_000 }); await page.waitForTimeout(800);
  await page.keyboard.press("h"); await page.waitForTimeout(900);
  await page.locator('[data-hk8="intro-start"]').click(); await page.waitForTimeout(700);
  L.check("Start lands in Focus", (await page.locator('[data-hk8="focus"]').count()) === 1, "focus");
  await page.waitForTimeout(1000);
  L.check("and it set the flag too (left set, as before the run)", flags().hkIntroSeen === true, JSON.stringify(flags()));
  L.done(6);
});

/* ───────────────────────── F3 · home ───────────────────────── */
test("F3 · home: Up next is the queue's first; the detail cards in points order sum to the gaps; a run counts within itself", async ({ page }) => {
  const L = new Ledger("F3");
  for (const vp of SIZES) {
    await open(page, vp, "F3"); const w = `@${vp.width}`;
    await page.keyboard.press("h"); await page.waitForTimeout(900);
    if (await page.locator('[data-hk8="not-now"]').count()) { await page.locator('[data-hk8="not-now"]').click(); await page.waitForTimeout(500); await page.keyboard.press("h"); await page.waitForTimeout(900); }
    await page.locator('[data-hkv="view"][data-v="detail"]').click(); await page.waitForTimeout(300);
    const r = await page.evaluate(() => {
      const cards = [...document.querySelectorAll<HTMLElement>('[data-hk8="detail"]')];
      const total = Number(document.querySelector('[data-hk8="up-next"] .hk8-upf b')?.textContent?.match(/\d+/)?.[0]);
      return { home: !!document.querySelector('[data-hk8="home"]'), order: cards.map((c) => c.dataset.gap), rows: cards.reduce((s, c) => s + c.querySelectorAll('[data-hk8="ledger-row"]').length, 0), total };
    });
    const ORDER = ["reply", "materials", "genres", "wishlist", "reopen"];
    L.check(`it opens on home ${w}`, r.home, `${r.home}`);
    L.check(`one card per applicable detail, in points order ${w}`, r.order.length > 0 && r.order.every((g, i) => i === 0 || ORDER.indexOf(g!) > ORDER.indexOf(r.order[i - 1]!)), r.order.join(","));
    L.check(`their rows sum to the gap total ${w}`, r.rows === r.total, `${r.rows} vs ${r.total}`);
    await page.locator('[data-hk8="up-start"]').click(); await page.waitForTimeout(500);
    const k1 = await page.locator('[data-hk8="card"]').getAttribute("data-key");
    const c1 = await page.locator('[data-hk8="counter"]').textContent();
    await page.locator('[data-hk8="back"]').click(); await page.waitForTimeout(300);
    await page.locator('[data-hk8="fill-all"]').click(); await page.waitForTimeout(500);
    const k2 = await page.locator('[data-hk8="card"]').getAttribute("data-key");
    L.check(`Up next is the queue's first task ${w}`, !!k1 && k1 === k2 && c1 === `1 of ${r.total}`, `${k1} vs ${k2} · "${c1}"`);
    await page.locator('[data-hk8="back"]').click(); await page.waitForTimeout(300);
    const run = page.locator('[data-hk8="detail"] [data-hk8="fill-detail"]').first();
    const k = await run.evaluate((b) => b.closest('[data-hk8="detail"]')!.querySelectorAll('[data-hk8="ledger-row"]').length);
    await run.click(); await page.waitForTimeout(500);
    const c = await page.locator('[data-hk8="counter"]').textContent();
    L.check(`"Fill in all" starts a run counted within itself ${w}`, c === `1 of ${k}`, `"${c}" (run of ${k})`);
    await page.keyboard.press("Escape"); await page.waitForTimeout(500);
  }
  L.done(10);
});

/* ───────────────────────── F4 · focus ───────────────────────── */
test("F4 · focus: Save waits for an answer, writes through the save path, Skip goes to the end, Undo restores", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("F4");
  await open(page, SIZES[0], "F4");
  await page.keyboard.press("h"); await page.waitForTimeout(900);
  if (await page.locator('[data-hk8="not-now"]').count()) { await page.locator('[data-hk8="not-now"]').click(); await page.waitForTimeout(500); await page.keyboard.press("h"); await page.waitForTimeout(900); }
  await page.locator('[data-hk8="detail"][data-gap="reply"] [data-hk8="fill-detail"]').click(); await page.waitForTimeout(500);
  const first = await page.locator('[data-hk8="card"]').getAttribute("data-key");
  const counter = await page.locator('[data-hk8="counter"]').textContent();
  L.check("Save is disabled until there is an answer", await page.locator('[data-hk8="save"]').isDisabled(), "disabled");
  await page.locator('[data-hk8="skip"]').click(); await page.waitForTimeout(500);
  const second = await page.locator('[data-hk8="card"]').getAttribute("data-key");
  const coming = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-hk8="coming"] .hk8-li')].map((e) => e.dataset.key));
  /* "Coming up" shows the next five: in a run of six or fewer the skipped task is the last of them; longer, it is past them */
  const runLen = Number((counter ?? "").match(/of (\d+)/)?.[1]);
  L.check("Skip moves the task to the end of the queue", second !== first && (runLen <= 6 ? coming[coming.length - 1] === first : !coming.includes(first ?? "")), `${first} → ${second} · run ${runLen} · coming ${coming.join(",")}`);
  L.check("the counter does not move on a skip", (await page.locator('[data-hk8="counter"]').textContent()) === counter, `${counter}`);
  await page.locator('[data-hk8="field"][data-gap="reply"] button[data-d="1"]').click(); await page.waitForTimeout(200);
  L.check("an answer enables Save", !(await page.locator('[data-hk8="save"]').isDisabled()), "enabled");
  const agentId = (second ?? "").split(":")[0];
  const before = await page.evaluate((id) => document.querySelector(`.aglist [data-agent-card="${id}"] .clv-rrep b`)?.textContent ?? "", agentId);
  await page.locator('[data-hk8="save"]').click(); await page.waitForTimeout(2500);
  const foot = await page.locator('[data-hkv="foot-text"]').textContent().catch(() => null);
  const after = await page.evaluate((id) => document.querySelector(`.aglist [data-agent-card="${id}"] .clv-rrep b`)?.textContent ?? "", agentId);
  L.check("the save went through the page's save path (its saved line and Undo)", !!foot && (await page.locator('[data-hkv="undo"]').count()) === 1, `"${foot}"`);
  L.check("and the agent's row now shows the reply time", before !== after && /wks/.test(after), `${before} → ${after}`);
  if (await page.locator('[data-hkv="undo"]').count()) { await page.locator('[data-hkv="undo"]').click(); await page.waitForTimeout(2500); }
  const undone = await page.evaluate((id) => document.querySelector(`.aglist [data-agent-card="${id}"] .clv-rrep b`)?.textContent ?? "", agentId);
  L.check("Undo restores what the save wrote", undone === before, `${after} → ${undone}`);
  L.done(7);
});

/* ───────────────────────── F5 · pop ───────────────────────── */
test("F5 · pop: '+n' is fixed in the top layer, rises above the drawer, unclipped, gone by 1.5s; none under reduced motion", async ({ page, browser }) => {
  test.setTimeout(240_000);
  const L = new Ledger("F5");
  await open(page, SIZES[0], "F5", { motion: true });
  await liftMotionSuppression(page);
  await page.keyboard.press("h"); await page.waitForTimeout(900);
  if (await page.locator('[data-hk8="not-now"]').count()) { await page.locator('[data-hk8="not-now"]').click(); await page.waitForTimeout(500); await page.keyboard.press("h"); await page.waitForTimeout(900); }
  await page.locator('[data-hk8="detail"][data-gap="reply"] [data-hk8="ledger-row"]').first().click(); await page.waitForTimeout(600);
  await page.locator('[data-hk8="field"][data-gap="reply"] button[data-d="1"]').click(); await page.waitForTimeout(200);
  await page.locator('[data-hk8="save"]').click();
  /* the pops float once the save has landed (the pack's order: write, then "+n"), so the 400ms runs from there */
  await page.locator('[data-hk8="pop"]').first().waitFor({ state: "attached", timeout: 8000 }).catch(() => undefined);
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => {
    const d = document.querySelector('.hdr[data-hdr="housekeeping"]')!.getBoundingClientRect();
    const pops = [...document.querySelectorAll<HTMLElement>('[data-hk8="pop"]')];
    return pops.map((p) => {
      const b = p.getBoundingClientRect(); const pe = p.style.pointerEvents; p.style.pointerEvents = "auto";
      const at = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); p.style.pointerEvents = pe;
      return { fixed: getComputedStyle(p).position, top: b.top, drawerTop: d.top, hit: at === p, big: p.classList.contains("big") };
    });
  });
  L.check("two pops at 400ms", r.length === 2, `${r.length}`);
  const ring = r.find((x) => x.big);
  L.check("a pop is position: fixed", r.every((x) => x.fixed === "fixed"), r.map((x) => x.fixed).join(","));
  L.check("the ring's pop has risen above the drawer's top", !!ring && ring.top < ring.drawerTop, `${ring?.top.toFixed(1)} vs ${ring?.drawerTop.toFixed(1)}`);
  L.check("nothing clips it (elementFromPoint at its centre returns it)", r.length > 0 && r.every((x) => x.hit), r.map((x) => x.hit).join(","));
  await page.waitForTimeout(1000);
  L.check("gone by 1500ms (from the save landing)", (await page.locator('[data-hk8="pop"]').count()) === 0, `${await page.locator('[data-hk8="pop"]').count()}`);
  await page.waitForTimeout(1500);
  await page.locator('[data-hkv="undo"]').click({ timeout: 5000 }).catch(() => undefined); await page.waitForTimeout(2500);
  /* reduced motion: never visible */
  const ctx = await browser.newContext({ reducedMotion: "reduce", storageState: "tests/e2e/.auth/state.json" });
  const p2 = await ctx.newPage();
  await openContacts16(p2, SIZES[0]);
  await p2.keyboard.press("h"); await p2.waitForTimeout(900);
  await p2.locator('[data-hk8="detail"][data-gap="reply"] [data-hk8="ledger-row"]').first().click(); await p2.waitForTimeout(600);
  await p2.locator('[data-hk8="field"][data-gap="reply"] button[data-d="1"]').click(); await p2.waitForTimeout(200);
  await p2.locator('[data-hk8="save"]').click();
  let seen = 0;
  for (let i = 0; i < 12; i++) { seen += await p2.locator('[data-hk8="pop"]').count(); await p2.waitForTimeout(100); }
  L.check("under reduced motion no pop is ever drawn", seen === 0, `${seen}`);
  await p2.waitForTimeout(1500);
  await p2.locator('[data-hkv="undo"]').click({ timeout: 5000 }).catch(() => undefined); await p2.waitForTimeout(2500);
  await ctx.close();
  L.done(6);
});

