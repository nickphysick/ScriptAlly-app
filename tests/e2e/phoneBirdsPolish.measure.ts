/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone Birds-eye polish v1 — BP-1 to BP-8 at 390 × 784 (Chromium phone, the harness's account on the emulator), and the
 * shots beside the ref's (BP_SHOTS=1).
 *
 *   BP_MUTATE=all | <muts…>   each lock red first under its own deliberate breakage (MUTS)
 *   BP_ONLY=<BP-n…>           just those locks (debugging)
 * BP-7 (navigation after every new interaction) extends BW-NAV-1: tests/e2e/phoneBirdsNav.measure.ts.
 * Reads only: nothing here writes to the emulator.
 */
import { expect, test, type Page } from "@playwright/test";
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

const DIR = "reports/phone-birds-eye-polish-v1";
const REF = "design-refs/phone-birds-eye-polish-v1/shots";
const PHONE = { width: 390, height: 784 } as const;
const BIRDS = "/queries/all?view=birds";
const frame = (page: Page, ms = 450) => page.waitForTimeout(ms);
const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };

async function signIn(page: Page) {
  await openRoute(page, "/dashboard", { width: 1440, height: 900 });
  await page.evaluate(() => { try { localStorage.setItem("bw1.hint.seen", "1"); localStorage.setItem("bw3.folded", "[]"); } catch { /* */ } });
  await page.setViewportSize(PHONE);
}
/* polish v1.1: the grow-in plays on every arrival; `null` lets it play, anything else sets the app's DEV-ONLY switch
   (sa.e2e.bw-nolook) so the arrival only fades */
const setDay = (page: Page, v: string | null) => page.evaluate((x) => { try { if (x == null) localStorage.removeItem("sa.e2e.bw-nolook"); else localStorage.setItem("sa.e2e.bw-nolook", "1"); } catch { /* */ } }, v);
async function openBirds(page: Page, first = false) {
  await setDay(page, first ? null : today());
  await page.goto(BIRDS);
  await page.waitForFunction(() => { const l = document.querySelector<HTMLElement>('[data-bw="layer"]'); return !!l && !!l.dataset.look; }, null, { timeout: 30_000, polling: "raf" });
  await page.evaluate(() => document.fonts.ready);
}
async function tapAt(page: Page, sel: string) {
  const b = await page.locator(sel).filter({ visible: true }).first().boundingBox();
  if (b) await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  return !!b;
}
async function levelTo(page: Page, t: "All" | "Months" | "Weeks") {
  await tapAt(page, '[data-bw="level-chip"]'); await frame(page, 300);
  await tapAt(page, `[data-bw="level"][data-t="${t}"]`); await frame(page, 800);
}

test.use({ viewport: PHONE, deviceScaleFactor: 2 });
const MOMENTS: [string, number | null][] = [["01-grow-150ms", 150], ["02-grow-400ms", 400], ["03-grow-700ms", 700], ["04-grow-1000ms", 1000], ["05-grow-1400ms", 1400], ["06-grow-done", null]];

test("Birds-eye polish v1 — the shots beside the ref's", async ({ page }, info) => {
  test.skip(info.project.name !== "pixel" || !process.env.BP_SHOTS, "BP_SHOTS=1, Chromium phone");
  test.setTimeout(600_000);
  mkdirSync(`${DIR}/shots`, { recursive: true });
  await signIn(page);
  const ONLY = (process.env.BP_SHOTS_ONLY ?? "").split(",").filter(Boolean);
  const want = (n: string) => !ONLY.length || ONLY.some((o) => n.startsWith(o));
  const pairs: string[] = [];
  const shot = async (name: string, el?: string) => {
    if (el) await page.locator(el).filter({ visible: true }).first().screenshot({ path: `${DIR}/shots/${name}-build.png` });
    else await page.screenshot({ path: `${DIR}/shots/${name}-build.png` });
    copyFileSync(`${REF}/${name}.png`, `${DIR}/shots/${name}-ref.png`);
    pairs.push(name);
  };
  for (const [name, t] of MOMENTS) {
    if (!want(name)) continue;
    await openBirds(page, true);
    if (t != null) {
      await page.evaluate(async (ms) => {
        window.requestAnimationFrame = () => 0;
        await new Promise((r) => setTimeout(r, 40));
        for (const a of document.getAnimations()) { if (((a.effect as KeyframeEffect | null)?.target as Element | null)?.closest?.('[data-bw="layer"]')) { a.pause(); a.currentTime = ms; } }
        const k = Math.max(0, Math.min(1, (ms - 120) / 700));
        for (const g of document.querySelectorAll<HTMLElement>('[data-bw="group"]')) { const em = g.querySelector("em"); if (em) em.textContent = String(Math.round(Number(g.dataset.n) * k * k * (3 - 2 * k))); }
      }, t);
    } else await frame(page, 2600);
    await shot(name);
    if (t != null) await frame(page, 2300);
  }
  if (want("07")) { await openBirds(page); await frame(page, 600); await tapAt(page, '[data-bw="filter"]'); await frame(page, 400); await shot("07-filter-menu"); }
  if (want("08")) { await openBirds(page); await frame(page, 600); await tapAt(page, '[data-bw="filter"]'); await frame(page, 300); await tapAt(page, '[data-bw="fpick"][data-k="chase"]'); await frame(page, 900); await shot("08-filter-on"); }
  /* the harness's rows on screen at Months and Weeks may ask for nothing: panned (down, then into the past) to rows with marks */
  const toMarks = async () => {
    for (let i = 0; i < 24; i++) {
      const n = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-bw="evmark"]')].filter((m) => { const b = m.getBoundingClientRect(); return b.left > 30 && b.right < innerWidth - 30 && b.top > 160 && b.bottom < innerHeight - 160; }).length);
      if (n >= 2) return;
      await page.mouse.move(200, 430); await page.mouse.wheel(i % 3 === 2 ? -260 : 0, i % 3 === 2 ? 0 : 260); await frame(page, 250);
    }
  };
  if (want("09")) { await openBirds(page); await frame(page, 600); await levelTo(page, "Months"); await toMarks(); await frame(page, 400); await shot("09-months-marks"); }
  if (want("10")) { await openBirds(page); await frame(page, 600); await levelTo(page, "Weeks"); await toMarks(); await frame(page, 400); await shot("10-weeks-marks"); }
  if (want("11") || want("12")) {
    await page.goto("/dashboard?tab=queries");
    await page.locator('[data-bwq="card"], [data-bwp="card"]').filter({ visible: true }).first().waitFor({ timeout: 30_000 }).catch(() => {});
    await page.evaluate(() => document.fonts.ready); await frame(page, 800);
    if (want("11")) await shot("11-today-my-queries");
    if (want("12")) await shot("12-my-queries-card", '[data-bwq="card"]').catch(() => {});
  }
  writeFileSync(`${DIR}/shots/index.html`, `<!doctype html><meta charset="utf-8"><title>Birds-eye polish v1 — build beside ref</title><style>body{font:14px system-ui;margin:24px;background:#f4f2ee}section{margin:0 0 32px}h2{font-size:16px}div{display:flex;gap:16px;align-items:flex-start}figure{margin:0}img{width:390px;border:1px solid #ccc;background:#fff}figcaption{font-size:12px;color:#555}</style>${pairs.map((p) => `<section><h2>${p}</h2><div><figure><img src="${p}-ref.png"><figcaption>ref</figcaption></figure><figure><img src="${p}-build.png"><figcaption>build</figcaption></figure></div></section>`).join("")}`);
});

/* ── the locks ── */
const MUTS = ["head140", "dot", "markshift", "thin", "overlap", "colour", "tiny"] as const;
type Mut = (typeof MUTS)[number] | "";
const MUT_LOCK: Record<Exclude<Mut, "">, string> = { head140: "BP-1", dot: "BP-2", markshift: "BP-3", thin: "BP-4", overlap: "BP-5", colour: "BP-6", tiny: "BP-8" };
const CSS_MUT: Partial<Record<Exclude<Mut, "">, string>> = {
  /* BP-1: the header back to two rows' height */
  head140: ".bw-hd.slim { height: 140px !important; }",
  /* BP-2: no dot while filtered */
  dot: ".bw-fdot { display: none !important; }",
  /* BP-3: each mark 20px off its date */
  markshift: ".bw-evmk { margin-left: 12px !important; }",
  /* BP-4: the fitted bars back to 3px */
  thin: '.bw-bar, .bw-ndt { height: 3px !important; }',
  /* BP-6: My queries' bars all one red */
  colour: '[data-bwq="bar"] { background: #c00 !important; }',
  /* BP-8: My queries' foot at 10px */
  tiny: ".bwq-link { font-size: 10px !important; }",
};
const INIT_MUT: Partial<Record<Exclude<Mut, "">, string>> = {
  /* BP-5: each piece's grow 120ms longer, so it runs on into the next */
  overlap: `{ const a = Element.prototype.animate; Element.prototype.animate = function (kf, o) { if (Array.isArray(kf) && kf[0] && kf[0].scale === "0 1" && o && typeof o === "object") o = { ...o, duration: (o.duration || 0) + 120 }; return a.call(this, kf, o); }; }`,
};
type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public mut: Mut) {}
  check(lock: string, where: string, ok: boolean, detail = "") { this.rows.push({ lock, where, ok: !!ok, detail: String(detail).slice(0, 600) }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/locks${this.mut ? `.mut-${this.mut}` : ""}.json`, JSON.stringify(this.rows, null, 1));
    const red = this.rows.filter((r) => !r.ok);
    for (const r of red.slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail.slice(0, 300)}`);
    console.log(`  locks${this.mut ? ` [mut ${this.mut}]` : " [green]"}: ${this.rows.length} readings, ${red.length} red`);
    if (this.mut) {
      const lock = MUT_LOCK[this.mut as Exclude<Mut, "">], own = red.filter((r) => r.lock === lock).length;
      console.log(`  MUTATION ${this.mut} → ${lock}: ${own} red (${red.length - own} elsewhere)`);
      writeFileSync(`${DIR}/ledger/mut-${this.mut}.summary.json`, JSON.stringify({ mut: this.mut, lock, own, other: red.length - own, readings: this.rows.length }, null, 1));
      expect(own, `mutation ${this.mut} must turn ${lock} red`).toBeGreaterThan(0);
      return;
    }
    expect(this.rows.length).toBeGreaterThanOrEqual(floor);
    expect(red.map((r) => `${r.lock} · ${r.where} — ${r.detail.slice(0, 300)}`)).toEqual([]);
  }
}
const until = (page: Page, ms: number) => page.waitForFunction((m) => { const t0 = Number(document.querySelector<HTMLElement>('[data-bw="layer"]')?.dataset.t0); return Number.isFinite(t0) && performance.now() - t0 >= m; }, ms, { polling: "raf", timeout: 10_000 });
const worldAnims = (page: Page) => page.evaluate(() => document.getAnimations().map((a) => {
  const t = (a.effect as KeyframeEffect | null)?.target as HTMLElement | null, tm = a.effect?.getTiming();
  return { inWorld: !!t?.closest('[data-bw="layer"]'), cls: String(t?.className ?? ""), row: t?.dataset.row ?? "", left: parseFloat(t?.style.left ?? "") || 0, delay: Number(tm?.delay ?? 0), dur: Number(tm?.duration ?? 0), scale: JSON.stringify((a.effect as KeyframeEffect | null)?.getKeyframes?.()[0]?.scale ?? null) };
}).filter((a) => a.inWorld));
const textAudit = (page: Page, sel: string) => page.evaluate((s) => {
  const small: string[] = [], words: string[] = [];
  for (const root of document.querySelectorAll<HTMLElement>(s)) {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const t = (n.textContent ?? "").trim(), el = n.parentElement;
      if (!t || !el) continue;
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden" || !el.getClientRects().length) continue;
      if (parseFloat(cs.fontSize) < 11.95) small.push(`${t.slice(0, 30)} ${cs.fontSize}`);
      if (/\boverdue\b|\blate\b/i.test(t)) words.push(t.slice(0, 40));
    }
  }
  return { small, words };
}, sel);

const runs: Mut[] = process.env.BP_MUTATE === "all" ? ["", ...MUTS] : process.env.BP_MUTATE ? (process.env.BP_MUTATE.split(",") as Mut[]) : [""];
const LONLY = (process.env.BP_ONLY ?? "").split(",").filter(Boolean);
const on = (k: string) => !LONLY.length || LONLY.includes(k);

for (const mut of runs) {
  test(`Birds-eye polish v1 — the locks${mut ? ` · mutation ${mut}` : ""}`, async ({ page }, info) => {
    test.skip(info.project.name !== "pixel" || !!process.env.BP_SHOTS, "Chromium phone only");
    test.setTimeout(900_000);
    page.setDefaultTimeout(20_000);
    const L = new Ledger(mut);
    const errs: string[] = [];
    page.on("pageerror", (e) => errs.push(`pageerror: ${String(e).slice(0, 300)}`));
    const init = mut ? INIT_MUT[mut] : undefined;
    if (init) await page.addInitScript(init);
    await signIn(page);
    const css = mut ? CSS_MUT[mut] : undefined;
    const withCss = async () => { if (css) { await page.addStyleTag({ content: css }); await frame(page, 150); } };

    /* ── BP-1 · one header row; the world's top the same at All, Months and Weeks; no pill row ── */
    if (on("BP-1")) {
      await openBirds(page); await frame(page, 700); await withCss();
      const read = () => page.evaluate(() => {
        const hd = document.querySelector<HTMLElement>('[data-bw="head"]')!.getBoundingClientRect();
        const kids = [...document.querySelectorAll<HTMLElement>('[data-bw="head"] .bw-t2 > *')].filter((e) => e.getClientRects().length).map((e) => { const r = e.getBoundingClientRect(); return r.top + r.height / 2; });
        const w = document.querySelector<HTMLElement>('[data-bw="world"]')!;
        return { h: hd.height, spread: Math.max(...kids) - Math.min(...kids), kids: kids.length, top: Number(w.dataset.top), level: w.dataset.level, chips: document.querySelectorAll('[data-bw="chips"], [data-bw="chip"]').length };
      });
      const tops: Record<string, number> = {};
      for (const lv of ["All", "Months", "Weeks"] as const) {
        if (lv !== "All") await levelTo(page, lv);
        const r = await read();
        tops[lv] = r.top;
        L.check("BP-1", `${lv}: the header is one row, 96 high (${r.kids} items within ${r.spread.toFixed(1)}px of one line); no pill row`, Math.abs(r.h - 96) < 0.5 && r.spread < 4 && r.kids >= 6 && r.chips === 0, JSON.stringify(r));
      }
      L.check("BP-1", `the world's top is the same at All, Months and Weeks (${JSON.stringify(tops)})`, tops.All === tops.Months && tops.Months === tops.Weeks && tops.All === 96 + 28, JSON.stringify(tops));
    }

    /* ── BP-2 · the filter menu: the old pills' counts; a pick filters and closes; outside closes unchanged; dot and chip ── */
    if (on("BP-2")) {
      await openBirds(page); await frame(page, 700); await withCss();
      const want = await page.evaluate(() => {
        const rows = [...document.querySelectorAll<HTMLElement>('[data-bw="row"]')].filter((r) => r.dataset.closed !== "1");
        const you = rows.filter((r) => r.dataset.you === "1").length;
        const chase = rows.filter((r) => r.dataset.you !== "1" && r.dataset.dueday !== "" && Number(r.dataset.dueday) < 0).length;
        return { all: rows.length, you, chase, wait: rows.length - you - chase };
      });
      await tapAt(page, '[data-bw="filter"]'); await frame(page, 300);
      const menu = await page.evaluate(() => ({
        exp: document.querySelector<HTMLElement>('[data-bw="filter"]')!.getAttribute("aria-expanded"), on: document.querySelector<HTMLElement>('[data-bw="filter"]')!.classList.contains("on"),
        items: [...document.querySelectorAll<HTMLElement>('[data-bw="fpick"]')].map((b) => ({ k: b.dataset.k!, n: Number(b.querySelector("b")?.textContent), h: b.getBoundingClientRect().height, checked: b.getAttribute("aria-checked") })),
        w: document.querySelector<HTMLElement>('[data-bw="fmenu"]')?.getBoundingClientRect().width ?? 0,
      }));
      const got = Object.fromEntries(menu.items.map((i) => [i.k, i.n]));
      L.check("BP-2", `the menu's counts are the old pills' (All ${want.all} = With you ${want.you} + Needs chasing ${want.chase} + Waiting ${want.wait})`, JSON.stringify(menu.items.map((i) => i.k)) === '["all","you","chase","wait"]' && got.all === want.all && got.you === want.you && got.chase === want.chase && got.wait === want.wait && want.all === want.you + want.chase + want.wait, JSON.stringify({ got, want }));
      L.check("BP-2", "open: 230 wide, four 48px rows, All ticked, the button lit and aria-expanded", Math.abs(menu.w - 230) < 0.5 && menu.items.every((i) => Math.abs(i.h - 48) < 0.5) && menu.items[0]?.checked === "true" && menu.exp === "true" && menu.on, JSON.stringify(menu));
      await tapAt(page, '[data-bw="fpick"][data-k="chase"]'); await frame(page, 800);
      const picked = await page.evaluate(() => { const w = document.querySelector<HTMLElement>('[data-bw="world"]')!; return { f: w.dataset.filter, z: Number(w.dataset.z), menu: !!document.querySelector('[data-bw="fmenu"]'), dot: (() => { const d = document.querySelector<HTMLElement>('[data-bw="fdot"]'); return !!d && d.getClientRects().length > 0 && getComputedStyle(d).display !== "none"; })(), chip: document.querySelector<HTMLElement>('[data-bw="fon"]')?.textContent ?? "", exp: document.querySelector('[data-bw="filter"]')!.getAttribute("aria-expanded") }; });
      L.check("BP-2", "a pick filters (Needs chasing), stays fitted and closes the menu", picked.f === "chase" && Math.abs(picked.z - 1) < 1e-3 && !picked.menu && picked.exp === "false", JSON.stringify(picked));
      L.check("BP-2", "filtered: the dot on the filter button and the chip “Needs chasing ✕”", picked.dot && /Needs chasing/.test(picked.chip) && /✕/.test(picked.chip), JSON.stringify(picked));
      await tapAt(page, '[data-bw="filter"]'); await frame(page, 300);
      await page.mouse.click(40, 500); await frame(page, 400);
      const out = await page.evaluate(() => ({ f: document.querySelector<HTMLElement>('[data-bw="world"]')!.dataset.filter, menu: !!document.querySelector('[data-bw="fmenu"]'), sheet: !!document.querySelector('[data-pqs="sheet"]') }));
      L.check("BP-2", "a tap outside closes it, changing nothing (still Needs chasing, no sheet opened)", out.f === "chase" && !out.menu && !out.sheet, JSON.stringify(out));
      await tapAt(page, '[data-bw="fon"]'); await frame(page, 600);
      const cleared = await page.evaluate(() => ({ f: document.querySelector<HTMLElement>('[data-bw="world"]')!.dataset.filter, dot: !!document.querySelector('[data-bw="fdot"]'), chip: !!document.querySelector('[data-bw="fon"]') }));
      L.check("BP-2", "the chip's ✕ clears it: All, no dot, no chip", cleared.f === "all" && !cleared.dot && !cleared.chip, JSON.stringify(cleared));
    }

    /* ── BP-3 · a mark at each partial or full request and each pass, at its date, at every zoom; names never on a mark ── */
    if (on("BP-3")) {
      await openBirds(page); await frame(page, 700); await withCss();
      /* zoomed in, the rows on screen may ask for nothing: pan (down, then into the past) until marks are in view */
      const findMarks = async () => {
        for (let i = 0; i < 24; i++) {
          const n = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-bw="evmark"]')].filter((m) => { const b = m.getBoundingClientRect(); return b.left > 30 && b.right < innerWidth - 30 && b.top > 140 && b.bottom < innerHeight - 120; }).length);
          if (n >= 2) return;
          await page.mouse.move(200, 430);
          await page.mouse.wheel(i % 3 === 2 ? -260 : 0, i % 3 === 2 ? 0 : 260);
          await frame(page, 250);
        }
      };
      for (const lv of ["All", "Months", "Weeks"] as const) {
        if (lv !== "All") { await levelTo(page, lv); await findMarks(); }
        const r = await page.evaluate(() => {
          const vw = innerWidth;
          const marks = [...document.querySelectorAll<HTMLElement>('[data-bw="evmark"]')].map((m) => { const b = m.getBoundingClientRect(); return { row: m.dataset.row!, day: m.dataset.day!, k: m.dataset.k!, cx: b.left + b.width / 2, cy: b.top + b.height / 2, l: b.left, r: b.right, t: b.top, b: b.bottom, z: Number(getComputedStyle(m).zIndex), col: getComputedStyle(m).color }; });
          const ST: Record<string, string> = { "Partial Requested": "partial", "Full Requested": "full", Rejected: "pass" };
          const bars = [...document.querySelectorAll<HTMLElement>('[data-bw="bar"][data-k="stage"]')].filter((b) => ST[b.dataset.st!]).map((b) => { const x = b.getBoundingClientRect(); return { row: b.dataset.row!, day: b.dataset.day!, k: ST[b.dataset.st!], l: x.left, cy: x.top + x.height / 2 }; }).filter((b) => b.l > -20 && b.l < vw + 20);
          const off: string[] = [], missing: string[] = [];
          let aligned = 0;
          for (const m of marks) { const b = bars.find((x) => x.row === m.row && x.day === m.day && x.k === m.k); if (!b) continue; aligned++; if (Math.abs(m.cx - b.l) > 1.5 || Math.abs(m.cy - b.cy) > 1.5) off.push(`${m.row}@${m.day} ${m.k}: mark ${m.cx.toFixed(1)},${m.cy.toFixed(1)} bar ${b.l.toFixed(1)},${b.cy.toFixed(1)}`); }
          for (const b of bars) if (!marks.some((m) => m.row === b.row && m.day === b.day && m.k === b.k)) missing.push(`${b.row}@${b.day} ${b.k}`);
          const names = [...document.querySelectorAll<HTMLElement>('[data-bw="name"][data-row]')].map((n) => ({ row: n.dataset.row!, b: n.getBoundingClientRect() }));
          const over: string[] = [];
          for (const n of names) for (const m of marks) if (m.row === n.row && n.b.right > m.l + 0.5 && n.b.left < m.r - 0.5 && n.b.bottom > m.t + 0.5 && n.b.top < m.b - 0.5) over.push(`${n.row}: name ${n.b.left.toFixed(0)}–${n.b.right.toFixed(0)} over mark ${m.l.toFixed(0)}–${m.r.toFixed(0)}`);
          const ovdZ = Number(getComputedStyle(document.querySelector('.bw-ovd') ?? document.body).zIndex) || 2;
          const kinds = [...new Set(marks.map((m) => m.k))];
          const cols = Object.fromEntries(kinds.map((k) => [k, marks.find((m) => m.k === k)!.col]));
          return { n: marks.length, aligned, off, missing, names: names.length, over, kinds, cols, zOk: marks.every((m) => m.z < ovdZ && m.z >= 1) };
        });
        L.check("BP-3", `${lv}: every mark at its event's date on its bar (${r.aligned} checked against their bars of ${r.n})`, r.aligned > 0 && r.off.length === 0, r.off.slice(0, 4).join(" | "));
        L.check("BP-3", `${lv}: every partial, full and pass on screen has its mark (kinds ${r.kinds.join(", ")})`, r.missing.length === 0, r.missing.slice(0, 4).join(" | "));
        if (lv !== "All") L.check("BP-3", `${lv}: no name's box overlaps a mark's box (${r.names} names)`, r.names > 0 && r.over.length === 0, r.over.slice(0, 4).join(" | "));
        L.check("BP-3", `${lv}: materials navy, a pass grey; above the bar, below the “!”`, Object.entries(r.cols).every(([k, c]) => (k === "pass" ? c === "rgb(107, 111, 120)" : c === "rgb(42, 58, 82)")) && r.zOk, JSON.stringify(r.cols));
      }
    }

    /* ── BP-4 · fitted, a bar is 0.66 of its row, 4 to 16px, for open and no-date rows ── */
    if (on("BP-4")) {
      await openBirds(page); await frame(page, 700); await withCss();
      const r = await page.evaluate(() => {
        const hits = [...document.querySelectorAll<HTMLElement>('[data-bw="row"]')].filter((h) => h.dataset.closed !== "1");
        const bad: string[] = []; let open = 0, nd = 0;
        for (const h of hits) {
          const rp = h.getBoundingClientRect().height, want = Math.max(4, Math.min(16, rp * 0.66));
          const sel = h.dataset.nodate === "1" ? `[data-bw="bar"][data-k="nodate"][data-row="${CSS.escape(h.dataset.id!)}"]` : `[data-bw="bar"][data-row="${CSS.escape(h.dataset.id!)}"]`;
          for (const b of document.querySelectorAll<HTMLElement>(sel)) { const bh = b.getBoundingClientRect().height; if (h.dataset.nodate === "1") nd++; else open++; if (Math.abs(bh - want) > 0.6) bad.push(`${h.dataset.id}: ${bh.toFixed(2)} vs ${want.toFixed(2)} (row ${rp.toFixed(2)})`); }
        }
        return { open, nd, bad, rp: hits[0]?.getBoundingClientRect().height ?? 0 };
      });
      L.check("BP-4", `fitted open rows' bars are 0.66 of the row, 4–16px (${r.open} bars, rows ${r.rp.toFixed(1)}px)`, r.open > 0 && r.bad.filter((b) => !/nodate/.test(b)).length === 0 && r.bad.length === 0, r.bad.slice(0, 4).join(" | "));
      L.check("BP-4", `and no-date rows' (${r.nd} bars)`, r.nd > 0 && r.bad.length === 0, r.bad.slice(0, 2).join(" | "));
    }

    /* ── BP-5 · the grow-in: an arrival plays in full; within a row each piece waits for the one
          to its left; marks pop with their rows; a touch at 300ms finishes it within a frame; reduced motion fades ── */
    if (on("BP-5")) {
      await openBirds(page, true);
      const how = await page.evaluate(() => document.querySelector<HTMLElement>('[data-bw="layer"]')!.dataset.look);
      L.check("BP-5", "an arrival plays in full", how === "playing", String(how));
      if (how === "playing") {
        await until(page, 60);
        const a = await worldAnims(page);
        const bars = a.filter((x) => x.scale === '"0 1"'), byRow = new Map<string, typeof bars>();
        for (const b of bars) { if (!byRow.has(b.row)) byRow.set(b.row, []); byRow.get(b.row)!.push(b); }
        const bad: string[] = [];
        for (const [rid, list] of byRow) { list.sort((x, y) => x.left - y.left); for (let i = 1; i < list.length; i++) if (list[i].delay < list[i - 1].delay + list[i - 1].dur - 0.5) bad.push(`${rid}: ${i}`); }
        L.check("BP-5", `within each row no piece starts before the one to its left ends (${byRow.size} rows)`, byRow.size > 0 && bad.length === 0, bad.slice(0, 4).join(" · "));
        const pops = a.filter((x) => /bw-evmk/.test(x.cls)).length, total = await page.evaluate(() => document.querySelectorAll('[data-bw="layer"] .bw-evmk').length);
        L.check("BP-5", `every mark pops with its row (${pops} of ${total})`, total > 0 && pops === total, "");
        await until(page, 300);
        const h = await page.locator('[data-bw="head"] .bw-h').first().boundingBox();
        await page.mouse.move((h?.x ?? 150) + 10, (h?.y ?? 60) + 8); await page.mouse.down();
        const fin = await page.evaluate(() => new Promise<{ look: string; n: number }>((res) => requestAnimationFrame(() => res({ look: document.querySelector<HTMLElement>('[data-bw="layer"]')!.dataset.look ?? "", n: document.getAnimations().filter((x) => ((x.effect as KeyframeEffect | null)?.target as Element | null)?.closest?.('[data-bw="layer"]')).length }))));
        await page.mouse.up();
        L.check("BP-5", "a touch at 300ms finishes it within one frame", fin.look === "done" && fin.n === 0, JSON.stringify(fin));
      }
      /* polish v1.1: every arrival plays; the arrival rule is BP-9 */
      await page.emulateMedia({ reducedMotion: "reduce" });
      await openBirds(page, true); await frame(page, 100);
      const rm = await page.evaluate(() => document.querySelector<HTMLElement>('[data-bw="layer"]')!.dataset.look);
      L.check("BP-5", "reduced motion: the fade only, nothing scales", rm === "fade" && (await worldAnims(page)).every((x) => x.scale === "null"), String(rm));
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await setDay(page, today());
    }

    /* ── BP-6 · My queries' counts are Birds-eye's groups; its colours; a tap opens Birds-eye ── */
    if (on("BP-6")) {
      await openBirds(page); await frame(page, 700);
      const groups = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll<HTMLElement>('[data-bw="group"]')].map((g) => [g.dataset.g!, Number(g.dataset.n)])));
      await page.goto("/dashboard?tab=queries");
      await page.locator('[data-bwq="card"]').filter({ visible: true }).first().waitFor({ timeout: 20_000 });
      await frame(page, 600); await withCss();
      const card = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-bwq="row"]')].filter((r) => r.getClientRects().length).map((r) => {
        const bar = r.querySelector<HTMLElement>('[data-bwq="bar"]'), cs = bar ? getComputedStyle(bar) : null;
        return { g: r.dataset.g!, n: Number(r.dataset.n), shown: r.querySelector("b")?.textContent ?? "", bar: !!bar, w: bar?.getBoundingClientRect().width ?? 0, img: cs?.backgroundImage ?? "", col: cs?.backgroundColor ?? "" };
      }));
      const ORDER = ["Needs action", "Within their window", "No reply date yet", "Closed"];
      L.check("BP-6", `My queries' four rows, in Birds-eye's order, count exactly Birds-eye's groups (${JSON.stringify(groups)})`, JSON.stringify(card.map((c) => c.g)) === JSON.stringify(ORDER) && card.every((c) => c.n === (groups[c.g] ?? 0) && c.shown === String(c.n)), JSON.stringify(card.map((c) => [c.g, c.n])));
      const max = Math.max(...card.map((c) => c.n));
      L.check("BP-6", "bars in proportion to the largest (150px at most); a 0 row has no bar", card.every((c) => (c.n === 0 ? !c.bar : c.bar && Math.abs(c.w - (c.n / max) * 150) < 0.6)), JSON.stringify(card.map((c) => [c.g, c.w])));
      const fill = (g: string) => card.find((c) => c.g === g)!;
      const colOk = /repeating-linear-gradient/.test(fill("Needs action").img) && /232, 200, 188/.test(fill("Needs action").img)
        && ["Within their window", "No reply date yet"].every((g) => !fill(g).bar || fill(g).col === "rgb(42, 58, 82)") && (!fill("Closed").bar || fill("Closed").col === "rgb(214, 209, 201)");
      L.check("BP-6", "colours: Needs action striped soft pink, the waiting rows navy, Closed grey", colOk, JSON.stringify(card.map((c) => [c.g, c.img.slice(0, 50), c.col])));
      await tapAt(page, '[data-bwq="card"]');
      const opened = await page.locator('[data-bw="world"]').first().waitFor({ timeout: 15_000 }).then(() => true).catch(() => false);
      L.check("BP-6", "a tap on the card opens Birds-eye", opened && /view=birds/.test(page.url()), page.url());
    }

    /* ── BP-8 · no text under 12px; never "overdue" or "late" (Birds-eye with its menu open; Today's My queries) ── */
    if (on("BP-8")) {
      await openBirds(page); await frame(page, 700); await withCss();
      await tapAt(page, '[data-bw="filter"]'); await frame(page, 300);
      const a = await textAudit(page, '[data-bw="world"]');
      L.check("BP-8", "Birds-eye with the filter menu open: no text under 12px, never “overdue” or “late”", a.small.length === 0 && a.words.length === 0, [...a.small, ...a.words].slice(0, 6).join(" · "));
      await page.mouse.click(40, 500); await frame(page, 300);
      await levelTo(page, "Weeks");
      const b = await textAudit(page, '[data-bw="world"]');
      L.check("BP-8", "Birds-eye at Weeks (names and marks): no text under 12px, never “overdue” or “late”", b.small.length === 0 && b.words.length === 0, [...b.small, ...b.words].slice(0, 6).join(" · "));
      await page.goto("/dashboard?tab=queries");
      await page.locator('[data-bwq="card"]').filter({ visible: true }).first().waitFor({ timeout: 20_000 });
      await frame(page, 500); await withCss();
      const c = await textAudit(page, '[data-bwq="card"]');
      L.check("BP-8", "My queries: no text under 12px, never “overdue” or “late”", c.small.length === 0 && c.words.length === 0, [...c.small, ...c.words].slice(0, 6).join(" · "));
    }
    L.check("BP-8", "no page error", errs.length === 0, errs.slice(0, 3).join(" · "));
    L.done(LONLY.length ? 1 : 24);
  });
}
