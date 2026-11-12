/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list principles v1 (design-refs/contact-list-principles-v1/contact-list-principles-v1.html) — the CLP locks,
 * on the rendered page over the emulator's harness account. Every reading is a computed style, a bounding box or
 * `document.activeElement`, never a declaration.
 *
 *   CLP1  exactly one filled navy button among the header's buttons
 *   CLP2  the headline (re-pointed by header v2): the harness account's own case, and each case through the dev aid
 *   CLP3  the Query Centre's header title: font and text equal the base run's (`CLP_BASE=1` writes them)
 *   CLP4  the agency line: 14px, text-transform none
 *   CLP5  contrast ≥ 4.5:1 for the listed text/ground pairs (composited)
 *   CLP6  More filters folds / unfolds Where they stand and Submissions, and auto-opens with one applied
 *   CLP7  add → new row in view, the postmark, the snackbar with Undo; Undo removes the agent (emulator)
 *   CLP8  a star → saved, the snackbar; Undo restores the old rating (emulator)
 *   CLP9  Tab reaches a row; ↓ moves focus; Enter opens the card; Esc closes it, focus back on the row
 *   CLP10 each Agent fit star's box ≥ 24×24
 *   CLP11 nothing in the card or rows renders uppercase mono text under 12px
 *   CLP12 each state's copy (loading, can't load, day one through the dev aid; no matches through real filters)
 *   CLP13 page content under 1000px: the rail above the list, no sideways scroll, no overlapping boxes
 *   CLP14 reduced motion: no running animations
 *
 * ⚠️ EVERY READ STARTS FROM THE VISIBLE COPY (every workspace page stays mounted) — `.aglist` is the Contact list's.
 * ⚠️ `CLP_MUTATE=<lock>[,<lock>…]` applies each named break; a lock that stays green under its own break is unproved.
 * ⚠️ CLP7 and CLP8 WRITE: each restores in the same run through the Undo it is locking (the emulator is re-imported
 *    by every e2e:emu run in any case).
 */
import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { openApp } from "./pageHeaderV2Lib";
import { KILL_MOTION_ID } from "./measure";

const DIR = "reports/contact-list-principles-v1";
/** one break or several (`CLP_MUTATE=CLP1,CLP4`): each test applies only its own lock's break */
const MUTS = (process.env.CLP_MUTATE ?? "").split(",").map((x) => x.trim()).filter(Boolean);
const BASE = process.env.CLP_BASE === "1";
const VP = { width: 1440, height: 900 };
const RUN = `Clp${Date.now().toString(36).slice(-5)}`;

class Ledger {
  rows: { where: string; ok: boolean; detail: string }[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${BASE ? "base-" : ""}${MUTS.includes(this.name) ? "mut-" : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${this.name} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}
const emu = (cmd: string): string => execFileSync("node", ["tests/e2e/aa1Emu.mjs", cmd], { encoding: "utf8" }).trim();
const css = (page: Page, rule: string) => page.addStyleTag({ content: rule });

async function mut(page: Page, lock: string) {
  if (!MUTS.includes(lock)) return;
  switch (lock) {
    case "CLP1": await css(page, ".cl26-health .cl26-open{background:#2a3a52 !important;box-shadow:none !important}"); break;
    case "CLP2": await page.evaluate(() => { const t = [...document.querySelectorAll<HTMLElement>(".aglist [data-clp='headline']")].find((e) => e.offsetHeight); if (t) t.textContent = "5 need you. 41 agents on file"; }); break;
    /* inline !important: a later Query Centre rule (v154's typewriter title) outranks any sheet-level break */
    case "CLP3": await page.evaluate(() => { for (const t of document.querySelectorAll<HTMLElement>(".qc151 .qc1531-hd h1.qc1531-t")) t.style.setProperty("font-size", "36px", "important"); }); break;
    case "CLP4": await css(page, ".cl27 .cl26-whot small{font-size:11px !important;text-transform:uppercase !important}"); break;
    case "CLP5": await css(page, ".cl27 .cl26-q--nq{color:rgba(28,19,15,.5) !important}"); break;
    case "CLP9": await page.evaluate(() => { for (const r of document.querySelectorAll<HTMLElement>(".aglist [data-cl26='row']")) r.addEventListener("keydown", (e) => { if (e.key === "ArrowDown") e.stopImmediatePropagation(); }, true); }); break;
    case "CLP10": await css(page, ".cl262-card .aap-fit--band .aap-stars button{width:auto !important;height:auto !important}"); break;
    case "CLP11": await css(page, ".cl262-card.cl262-card.cl262-card.apc .apc-sec h5{font:500 10px/1.2 'JetBrains Mono',monospace !important;text-transform:uppercase !important}"); break;
    case "CLP12": await css(page, ".cl27 [data-clp='state']{display:none !important}"); break;
    case "CLP13": await css(page, ".cl27 .qc153-cl{grid-template-columns:268px minmax(0,1fr) !important}"); break;
    case "CLP14": await css(page, ".cl27 .clp-sk i{animation:clp-sk 1.2s linear infinite !important}"); break;
  }
}

/** the Contact list, the page guide out of the way; `state` is the dev aid `__SA_CLP_STATE`, `fig` `__SA_CLP_FIG` */
async function openCl(page: Page, vp = VP, o: { state?: string; fig?: { n: number; q: number; y: number } } = {}) {
  await page.setViewportSize(vp);
  await page.addInitScript((x) => {
    try {
      for (const k of ["contacts", "queries", "manuscripts", "agents"]) localStorage.setItem(`sa.guide.${k}`, "1");
      for (const k of ["sa.contactList.v3", "sa.contactList.v4", "sa.contactList.v5", "sa.contactBook.sel"]) sessionStorage.removeItem(k);
      localStorage.setItem("qh.cl.view", JSON.stringify({ v: 1, group: "none", sort: "surname", reversed: false, pinned: false, view: "list", group26: "letter" }));
    } catch { /* private mode */ }
    const w = window as unknown as { __SA_CLP_STATE?: string; __SA_CLP_FIG?: unknown };
    if (x.state) w.__SA_CLP_STATE = x.state;
    if (x.fig) w.__SA_CLP_FIG = x.fig;
  }, o);
  await openApp(page, "/agents", vp);
  if (o.state === "loading" || o.state === "error") await page.locator(`.aglist [data-clp='state'][data-k='${o.state}']`).first().waitFor({ timeout: 30_000 }).catch(() => {});
  else await page.locator(".aglist [data-cl26='row']").first().waitFor({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  await page.mouse.move(3, 3);
}
const fresh = async (page: Page) => { await page.context().clearCookies().catch(() => {}); };

/* ═════════ CLP1 · one filled button ═════════ */
test("CLP1 · exactly one filled navy button among the header's buttons", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("CLP1");
  for (const vp of [VP, { width: 1280, height: 800 }]) {
    await openCl(page, vp);
    await mut(page, "CLP1");
    const r = await page.evaluate(() => {
      const hd = [...document.querySelectorAll<HTMLElement>(".aglist [data-cl27='header']")].find((e) => e.offsetHeight)!;
      const bs = [...hd.querySelectorAll<HTMLElement>("button")].filter((b) => b.offsetWidth > 0 && getComputedStyle(b).visibility !== "hidden");
      const filled = bs.filter((b) => { const c = getComputedStyle(b).backgroundColor; return c === "rgb(42, 58, 82)" || c === "rgb(51, 71, 99)"; });
      const open = hd.querySelector<HTMLElement>("[data-cl26='open']");
      const os = open ? getComputedStyle(open) : null;
      return { n: bs.length, filled: filled.map((b) => b.textContent?.trim()), open: os ? { bg: os.backgroundColor, fg: os.color, sh: os.boxShadow } : null };
    });
    L.check(`${vp.width} one filled, and it is + Add an agent`, r.filled.length === 1 && r.filled[0] === "+ Add an agent", JSON.stringify(r.filled));
    L.check(`${vp.width} Open is an outline: white, navy text, a 1.5px navy inset`, !!r.open && r.open.bg === "rgb(255, 255, 255)" && r.open.fg === "rgb(42, 58, 82)" && /rgb\(42, 58, 82\) 0px 0px 0px 1\.5px inset/.test(r.open.sh), JSON.stringify(r.open));
  }
  L.done(4);
});

/* ═════════ CLP2 · the headline ═════════ */
/* re-pointed by Contact list header v2 (CLH2-1's rendered half): the h1 is "{n} agents on file", the subheader
   "{nq} not yet queried" (a rust button) or "All of them queried" / "Already queried" (plain); day one unchanged */
test("CLP2 · the headline from the writer's own numbers, each case (header v2)", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("CLP2");
  const read = (p: Page) => p.evaluate(() => {
    const hd = [...document.querySelectorAll<HTMLElement>(".aglist [data-cl27='header']")].find((e) => e.offsetHeight)!;
    const t = hd.querySelector<HTMLElement>("[data-clp='headline']")!;
    const sub = hd.querySelector<HTMLElement>("[data-clh2='sub']");
    const nq = hd.querySelector<HTMLElement>("[data-clh2='notq']");
    const rows = [...document.querySelectorAll<HTMLElement>(".aglist [data-cl26='row']")].filter((e) => e.offsetHeight);
    const ts = getComputedStyle(t);
    return {
      text: (t.textContent ?? "").replace(/\s+/g, " ").trim(), font: ts.fontFamily, size: ts.fontSize, colour: ts.color,
      sub: sub ? (sub.textContent ?? "").replace(/\s+/g, " ").trim() : null, link: !!nq, linkColour: nq ? getComputedStyle(nq).color : null,
      subColour: sub ? getComputedStyle(sub).color : null,
      under: (hd.querySelector("[data-cl27='for']")?.textContent ?? "").replace(/\s+/g, " ").trim(),
      n: rows.length, none: rows.filter((r) => r.dataset.k === "none").length,
    };
  });
  await openCl(page);
  await mut(page, "CLP2");
  const r = await read(page);
  L.check("harness: the count on file from the rows", r.text === `${r.n} agents on file`, `${r.text} vs ${r.n} rows`);
  L.check("harness: typewriter, 36px, ink", /Special Elite|Courier|type/i.test(r.font) && r.size === "36px" && r.colour === "rgb(28, 19, 15)", `${r.font.slice(0, 30)} ${r.size} ${r.colour}`);
  L.check("harness: the subheader from the rows' own stands", r.sub === (r.none ? `${r.none} not yet queried` : "All of them queried"), String(r.sub));
  if (r.none) L.check("harness: the subheader is a rust button", r.link && r.linkColour === "rgb(162, 69, 42)", `${r.link} ${r.linkColour}`);
  const cases: { fig: { n: number; q: number; y: number }; text: string; sub: string | null; link: boolean; under?: string }[] = [
    { fig: { n: 17, q: 12, y: 5 }, text: "17 agents on file", sub: "5 not yet queried", link: true },
    { fig: { n: 17, q: 17, y: 1 }, text: "17 agents on file", sub: "All of them queried", link: false },
    { fig: { n: 1, q: 1, y: 0 }, text: "1 agent on file", sub: "Already queried", link: false },
    { fig: { n: 2, q: 0, y: 0 }, text: "2 agents so far. Neither queried yet.", sub: null, link: false, under: "Add a few more and QueryHawk can start suggesting who to query next." },
  ];
  for (const c of cases) {
    const p2 = await page.context().newPage();
    await openCl(p2, VP, { fig: c.fig });
    const x = await read(p2);
    L.check(`case ${JSON.stringify(c.fig)} title`, x.text === c.text, x.text);
    L.check(`case ${JSON.stringify(c.fig)} subheader`, x.sub === c.sub && x.link === c.link, `${x.sub} link=${x.link}`);
    if (c.sub && !c.link) L.check(`case ${JSON.stringify(c.fig)} plain in the quiet brown`, x.subColour === "rgb(91, 79, 71)", String(x.subColour));
    if (c.under) L.check(`case ${JSON.stringify(c.fig)} line beneath`, x.under === c.under, x.under);
    await p2.close();
  }
  L.done(13);
});

/* ═════════ CLP3 · the Query Centre's header is unchanged ═════════ */
test("CLP3 · the Query Centre's header title: font and text as the base run read them", async ({ page }) => {
  test.setTimeout(120_000);
  const L = new Ledger("CLP3");
  await openApp(page, "/queries", VP);
  await page.locator(".qc151 .qc1531-hd h1.qc1531-t").first().waitFor({ timeout: 30_000 });
  await page.waitForTimeout(800);
  await mut(page, "CLP3");
  const r = await page.evaluate(() => {
    const t = [...document.querySelectorAll<HTMLElement>(".qc151 .qc1531-hd h1.qc1531-t")].find((e) => e.offsetHeight)!;
    const s = getComputedStyle(t);
    const f = t.closest(".qc1531-hd")?.querySelector<HTMLElement>(".qc1531-for span");
    return { text: t.textContent?.trim(), font: `${s.fontFamily}|${s.fontSize}|${s.fontWeight}|${s.color}|${s.lineHeight}`, forFont: f ? `${getComputedStyle(f).fontFamily}|${getComputedStyle(f).fontSize}` : null };
  });
  const file = `${DIR}/ledger/qc-header-base.json`;
  if (BASE && !MUTS.length) { mkdirSync(`${DIR}/ledger`, { recursive: true }); writeFileSync(file, JSON.stringify(r, null, 1)); }
  L.check("a base reading exists", existsSync(file), file);
  const b = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
  L.check("title text", r.text === b.text, `${r.text} vs ${b.text}`);
  L.check("title font", r.font === b.font, `${r.font} vs ${b.font}`);
  L.check("the for line's font", r.forFont === b.forFont, `${r.forFont} vs ${b.forFont}`);
  L.done(4);
});

/* ═════════ CLP4 + CLP5 · readable rows ═════════ */
test("CLP4 + CLP5 · the agency line, and contrast on the listed pairs", async ({ page }) => {
  test.setTimeout(180_000);
  const L4 = new Ledger("CLP4");
  const L5 = new Ledger("CLP5");
  await openCl(page);
  await mut(page, "CLP4");
  await mut(page, "CLP5");
  const r = await page.evaluate(() => {
    const card = [...document.querySelectorAll<HTMLElement>(".aglist [data-cl26='card']")].find((e) => e.offsetHeight)!;
    const parse = (c: string) => { const m = c.match(/[\d.]+/g)!.map(Number); return { r: m[0], g: m[1], b: m[2], a: m.length > 3 ? m[3] : 1 }; };
    /** the ground: the nearest opaque background up the tree, compositing any translucent ones on the way */
    const ground = (el: Element): { r: number; g: number; b: number } => {
      const stack: { r: number; g: number; b: number; a: number }[] = [];
      for (let e: Element | null = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c.a > 0) { stack.push(c); if (c.a >= 1) break; } }
      let out = { r: 255, g: 255, b: 255 };
      for (const c of stack.reverse()) out = { r: c.r * c.a + out.r * (1 - c.a), g: c.g * c.a + out.g * (1 - c.a), b: c.b * c.a + out.b * (1 - c.a) };
      return out;
    };
    const opacity = (el: Element) => { let o = 1; for (let e: Element | null = el; e; e = e.parentElement) o *= Number(getComputedStyle(e).opacity); return o; };
    const lum = (c: { r: number; g: number; b: number }) => { const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
    const ratio = (el: HTMLElement) => {
      const bg = ground(el); const fg0 = parse(getComputedStyle(el).color); const a = fg0.a * opacity(el);
      const fg = { r: fg0.r * a + bg.r * (1 - a), g: fg0.g * a + bg.g * (1 - a), b: fg0.b * a + bg.b * (1 - a) };
      const [l1, l2] = [lum(fg), lum(bg)].sort((x, y) => y - x);
      return Math.round(((l1 + 0.05) / (l2 + 0.05)) * 100) / 100;
    };
    const ag = card.querySelector<HTMLElement>("[data-cl26='agency']")!;
    const s = getComputedStyle(ag);
    const pick = (sel: string) => card.querySelector<HTMLElement>(sel);
    const pairs: [string, HTMLElement | null][] = [
      ["agency line", ag],
      ["Not queried status", pick("[data-cl26='row'][data-k='none'] .cl26-q > span")],
      ["closed row's name", pick("[data-cl26='row'][data-k='closed'] [data-cl26='name']")],
      ["closed row's agency", pick("[data-cl26='row'][data-k='closed'] [data-cl26='agency']")],
      ["closed row's status", pick("[data-cl26='row'][data-k='closed'] .cl26-q > span")],
      ["column heading", pick("[data-cl26='heads'] > span[role='columnheader']")],
      ["What they want heading", pick("[data-cl26='head-want']")],
    ];
    return { size: s.fontSize, tt: s.textTransform, ls: s.letterSpacing, font: s.fontFamily, colour: s.color, pairs: pairs.map(([k, e]) => [k, e ? ratio(e) : null] as const) };
  });
  L4.check("agency line 14px", r.size === "14px", r.size);
  L4.check("agency line sentence case (text-transform none)", r.tt === "none", r.tt);
  L4.check("agency line Source Serif, no letter-spacing, #5b4f47", /Source Serif/i.test(r.font) && (r.ls === "normal" || r.ls === "0px") && r.colour === "rgb(91, 79, 71)", `${r.font.slice(0, 24)} ${r.ls} ${r.colour}`);
  for (const [k, v] of r.pairs) L5.check(k, v !== null && v >= 4.5, `${v}:1`);
  const errs: unknown[] = [];
  for (const [l, n] of [[L4, 3], [L5, 7]] as const) { try { l.done(n); } catch (e) { errs.push(e); } }
  if (errs.length) throw errs[0];
});

/* ═════════ CLP6 · More filters ═════════ */
test("CLP6 · More filters folds and unfolds Where they stand and Submissions, and opens itself with one applied", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("CLP6");
  await openCl(page);
  const rail = () => page.evaluate(() => {
    const r = [...document.querySelectorAll<HTMLElement>(".aglist [data-cl27='rail']")].find((e) => e.offsetHeight)!;
    const secs = [...r.querySelectorAll<HTMLElement>("[data-cl27='rail-sec']")].filter((s) => s.offsetHeight > 0).map((s) => s.dataset.k);
    const m = r.querySelector<HTMLElement>("[data-clp='more']");
    return { secs, more: m ? { exp: m.getAttribute("aria-expanded"), text: (m.textContent ?? "").replace(/\s+/g, " ").trim(), w: Math.round(m.getBoundingClientRect().width), rw: Math.round(r.querySelector<HTMLElement>(".qc153-rin")!.getBoundingClientRect().width) } : null };
  });
  const a = await rail();
  L.check("folded: Most used and Genres only", JSON.stringify(a.secs) === JSON.stringify(["quick", "genres"]), JSON.stringify(a.secs));
  L.check("the row: More filters · Where they stand, submissions · collapsed", !!a.more && a.more.exp === "false" && /^More filters\s?Where they stand, submissions/.test(a.more.text), JSON.stringify(a.more));
  L.check("the row is full width", !!a.more && Math.abs(a.more.w - a.more.rw) <= 2, JSON.stringify(a.more));
  if (a.more) {
    await page.locator(".aglist [data-clp='more']:visible").click();
    const b = await rail();
    L.check("unfolded: all four, expanded", JSON.stringify(b.secs) === JSON.stringify(["quick", "genres", "where", "subs"]) && b.more?.exp === "true", JSON.stringify(b));
    /* apply a tile, fold, reload: More filters opens itself */
    await page.locator(".aglist [data-cl27='tile']:not([disabled])").first().click();
    await page.locator(".aglist [data-clp='more']:visible").click();
    const c = await rail();
    L.check("folding with a tile on keeps it applied (n on)", c.secs.length === 2 && (await page.locator(".aglist [data-cl27='rail-on']:visible").count()) === 1, JSON.stringify(c.secs));
    await page.locator(".aglist [data-cl27='rail-reset']:visible").click();
    /* arriving with one applied: the dashboard's Agents-on-file link (`?status=closed` sets the Closed tile) */
    const p2 = await page.context().newPage();
    await p2.setViewportSize(VP);
    await openApp(p2, "/agents?status=closed", VP);
    await p2.locator(".aglist [data-cl26='row']").first().waitFor({ timeout: 30_000 });
    await p2.waitForTimeout(800);
    const d = await p2.evaluate(() => {
      const r = [...document.querySelectorAll<HTMLElement>(".aglist [data-cl27='rail']")].find((e) => e.offsetHeight)!;
      return { exp: r.querySelector("[data-clp='more']")?.getAttribute("aria-expanded"), secs: [...r.querySelectorAll<HTMLElement>("[data-cl27='rail-sec']")].filter((s) => s.offsetHeight > 0).map((s) => s.dataset.k), on: r.querySelector("[data-cl27='tile'][data-k='closed']")?.getAttribute("aria-pressed") };
    });
    L.check("arriving with one applied (?status=closed) opens More filters", d.exp === "true" && d.secs.includes("where") && d.on === "true", JSON.stringify(d));
    await p2.close();
  }
  L.done(6);
});

/* ═════════ CLP7 · add → the row, the postmark, the snackbar, Undo ═════════ */
test("CLP7 · after an add: the row in view, the postmark, the snackbar; Undo removes the agent", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("CLP7");
  emu("pro");
  await openCl(page);
  const name = `Quill ${RUN}`;
  await page.locator(".aglist [data-cl27='add']:visible").first().click();
  await page.locator("[data-aaj='journey']").waitFor({ timeout: 20_000 });
  await page.locator("[data-aaj='name']").fill(name);
  await page.locator("[data-aaj='agency']").fill("Lark Literary");
  await page.locator("[data-aaj='add']").click();
  await page.locator("[data-aaj='done']").waitFor({ timeout: 20_000 });
  await page.locator("[data-aaj='done']").click();
  await page.waitForTimeout(700);
  const r = await page.evaluate((nm) => {
    const sc = [...document.querySelectorAll<HTMLElement>(".agl-wpg .wpg-scroll")].find((e) => e.offsetHeight)!.getBoundingClientRect();
    const row = [...document.querySelectorAll<HTMLElement>(".aglist [data-cl26='row']")].find((e) => e.offsetHeight && e.textContent?.includes(nm));
    const rb = row?.getBoundingClientRect();
    const stamp = [...document.querySelectorAll<HTMLElement>("[data-clp='stamp']")].find((e) => e.getBoundingClientRect().width > 0);
    const toast = [...document.querySelectorAll<HTMLElement>(".sa-toast")].map((t) => ({ text: (t.textContent ?? "").replace(/\s+/g, " ").trim(), undo: !!t.querySelector(".sa-toast-undo") }));
    const host = document.querySelector(".sa-toasts");
    return {
      row: !!row, inView: !!rb && rb.top >= sc.top && rb.bottom <= sc.bottom, tint: row ? row.hasAttribute("data-clp-new") : false,
      stamp: stamp ? [...stamp.querySelectorAll("b, span")].map((x) => (x.textContent ?? "").trim()).join(" ") : null, panel: document.querySelectorAll("[data-aaj='journey'], [data-cl262='panel']").length,
      toast, role: host?.getAttribute("role") ?? null,
    };
  }, name);
  L.check("the panel closed", r.panel === 0, String(r.panel));
  L.check("the new row is in view", r.row && r.inView, JSON.stringify(r));
  L.check("the row is tinted", r.tint, String(r.tint));
  L.check("the rust postmark over it: ADDED and the date", !!r.stamp && /^ADDED \d{1,2} [A-Z]{3}$/.test(r.stamp), String(r.stamp));
  L.check("one snackbar: “{Name} added to your list”, with Undo", r.toast.length === 1 && r.toast[0].text.startsWith(`${name} added to your list`) && r.toast[0].undo, JSON.stringify(r.toast));
  L.check("role=status", r.role === "status", String(r.role));
  if (r.toast.length) {
    await page.locator(".sa-toast .sa-toast-undo").first().click();
    /* the snackbar first (it lives 5s), then the emulator (a node process: slow under load) */
    await page.locator(".sa-toast", { hasText: `${name} removed` }).first().waitFor({ timeout: 4000 }).catch(() => {});
    const t2 = await page.locator(".sa-toast").allTextContents();
    L.check("and says “{Name} removed”", t2.some((t) => t.includes(`${name} removed`)), JSON.stringify(t2));
    const left = JSON.parse(emu("agents")) as { name: string }[];
    L.check("Undo removed the agent (emulator)", !left.some((a) => a.name === name), String(left.filter((a) => a.name === name).length));
  }
  L.done(8);
});

/* ═════════ CLP8 · Agent fit → the snackbar; Undo restores ═════════ */
test("CLP8 · a star saves on the click, the snackbar says so, Undo restores the old rating", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("CLP8");
  await openCl(page);
  await page.locator(".aglist [data-cl26='row']:visible").first().click();
  await page.locator("[data-cl262='fit'] [data-star]").first().waitFor({ timeout: 15_000 });
  const id = await page.locator(".aglist [data-cl26='row'][aria-current='true']").first().getAttribute("data-id");
  const before = (JSON.parse(emu("agents")) as { id: string; starRating: number | null }[]).find((a) => a.id === id)?.starRating ?? null;
  const pick = before === 3 ? 4 : 3;
  const words: Record<number, string> = { 3: "good fit", 4: "great fit" };
  await page.locator(`[data-cl262='fit'] [data-star='${pick}']`).first().click();
  await page.waitForTimeout(1500);
  const saved = (JSON.parse(emu("agents")) as { id: string; starRating: number | null }[]).find((a) => a.id === id)?.starRating ?? null;
  L.check("saved on the click (emulator)", saved === pick, `${before} → ${saved}`);
  const t = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".sa-toast")].map((x) => ({ text: (x.textContent ?? "").replace(/\s+/g, " ").trim(), undo: !!x.querySelector(".sa-toast-undo") })));
  L.check(`one snackbar: “Agent fit: ${words[pick]}”, with Undo`, t.length === 1 && t[0].text.startsWith(`Agent fit: ${words[pick]}`) && t[0].undo, JSON.stringify(t));
  if (t.length) {
    await page.locator(".sa-toast .sa-toast-undo").first().click();
    await page.waitForTimeout(1500);
    const back = (JSON.parse(emu("agents")) as { id: string; starRating: number | null }[]).find((a) => a.id === id)?.starRating ?? null;
    L.check("Undo restored the old rating (emulator)", back === before, `${before} → ${pick} → ${back}`);
  }
  /* a second star while the first's snackbar shows: one snackbar, never two */
  await page.locator(`[data-cl262='fit'] [data-star='${pick}']`).first().click();
  await page.waitForTimeout(400);
  await page.locator(`[data-cl262='fit'] [data-star='${pick === 3 ? 4 : 3}']`).first().click();
  await page.waitForTimeout(900);
  const n2 = await page.locator(".sa-toast").count();
  L.check("never stacks", n2 === 1, String(n2));
  /* restore: the second star's Undo, then — if anything still differs — the star itself (a chosen star pressed again clears) */
  if (await page.locator(".sa-toast .sa-toast-undo").count()) await page.locator(".sa-toast .sa-toast-undo").first().click();
  await page.waitForTimeout(1500);
  const now = (JSON.parse(emu("agents")) as { id: string; starRating: number | null }[]).find((a) => a.id === id)?.starRating ?? null;
  if (now !== before) await page.locator(`[data-cl262='fit'] [data-star='${before ?? now}']`).first().click();
  await page.waitForTimeout(1500);
  const end = (JSON.parse(emu("agents")) as { id: string; starRating: number | null }[]).find((a) => a.id === id)?.starRating ?? null;
  L.check("restored: the agent's rating as it was", end === before, `${before} → ${end}`);
  L.done(5);
});

/* ═════════ CLP9 · keyboard ═════════ */
test("CLP9 · Tab reaches a row, ↓ moves, Enter opens the card, Esc closes it and focus is back on the row", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("CLP9");
  await openCl(page);
  await mut(page, "CLP9");
  await page.locator(".aglist [data-cl26='heads'] [data-cl26='head'][data-key='status']").first().focus();
  await page.keyboard.press("Tab");
  const ae = () => page.evaluate(() => { const a = document.activeElement as HTMLElement | null; return { row: a?.dataset.cl26 === "row", id: a?.dataset.id ?? null, ring: a ? getComputedStyle(a).outlineStyle + " " + getComputedStyle(a).outlineWidth + " " + getComputedStyle(a).outlineColor : "" }; });
  const a = await ae();
  L.check("Tab reaches a row", a.row, JSON.stringify(a));
  L.check("a visible 2px navy focus ring", /solid 2px rgb\(42, 58, 82\)/.test(a.ring), a.ring);
  await page.keyboard.press("ArrowDown");
  const b = await ae();
  L.check("↓ moves focus to the next row", b.row && b.id !== a.id, JSON.stringify([a.id, b.id]));
  await page.keyboard.press("ArrowUp");
  const c = await ae();
  L.check("↑ moves it back", c.id === a.id, JSON.stringify([a.id, c.id]));
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await page.locator("[data-cl262='panel']").first().waitFor({ timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(600);
  L.check("Enter opens the card", (await page.locator("[data-cl262='panel']").count()) === 1, "");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(900);
  const d = await ae();
  L.check("Esc closes it", (await page.locator("[data-cl262='panel']").count()) === 0, "");
  L.check("focus is back on its row", d.row && d.id === b.id, JSON.stringify([b.id, d.id]));
  L.done(7);
});

/* ═════════ CLP10 + CLP11 · the card's stars, and no tiny uppercase mono ═════════ */
test("CLP10 + CLP11 · each star ≥ 24×24; nothing in the card or rows renders uppercase mono under 12px", async ({ page }) => {
  test.setTimeout(180_000);
  const L10 = new Ledger("CLP10");
  const L11 = new Ledger("CLP11");
  await openCl(page);
  await page.locator(".aglist [data-cl26='row']:visible").first().click();
  await page.locator("[data-cl262='fit'] [data-star]").first().waitFor({ timeout: 15_000 });
  await page.waitForTimeout(900);
  await mut(page, "CLP10");
  await mut(page, "CLP11");
  const r = await page.evaluate(() => {
    const stars = [...document.querySelectorAll<HTMLElement>("[data-cl262='fit'] [data-star]")].map((s) => { const b = s.getBoundingClientRect(); return [Math.round(b.width * 10) / 10, Math.round(b.height * 10) / 10]; });
    const roots = [...document.querySelectorAll<HTMLElement>(".cl262-card"), ...[...document.querySelectorAll<HTMLElement>(".aglist [data-cl26='card']")].filter((e) => e.offsetHeight)];
    const bad: string[] = [];
    for (const root of roots) {
      for (const el of root.querySelectorAll<HTMLElement>("*")) {
        const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent ?? "").join("").trim();
        if (!own || !/[a-z]/i.test(own) || el.getBoundingClientRect().width === 0) continue;
        const s = getComputedStyle(el);
        const mono = /mono|courier new|ui-monospace|monospace/i.test(s.fontFamily) && !/Special Elite/i.test(s.fontFamily.split(",")[0]);
        const upper = s.textTransform === "uppercase" || (own.length > 1 && own === own.toUpperCase() && /[A-Z]{2}/.test(own));
        if (mono && upper && parseFloat(s.fontSize) < 12) bad.push(`${el.className || el.tagName} “${own.slice(0, 24)}” ${s.fontSize}`);
      }
    }
    return { stars, bad };
  });
  L10.check("five stars", r.stars.length === 5, JSON.stringify(r.stars));
  r.stars.forEach(([w, h], i) => L10.check(`star ${i + 1} ≥ 24×24`, w >= 24 && h >= 24, `${w}×${h}`));
  L11.check("no uppercase mono text under 12px", r.bad.length === 0, r.bad.slice(0, 12).join(" · "));
  /* Enter on a star sets it */
  const errs: unknown[] = [];
  for (const [l, n] of [[L10, 6], [L11, 1]] as const) { try { l.done(n); } catch (e) { errs.push(e); } }
  if (errs.length) throw errs[0];
});

/* ═════════ CLP12 · every state ═════════ */
test("CLP12 · each state renders its copy", async ({ page }) => {
  test.setTimeout(400_000);
  const L = new Ledger("CLP12");
  /* a new page in the signed-in context per state: each carries its own init script */
  const ctx = async () => { const p = await page.context().newPage(); return { newPage: async () => p, close: () => p.close() }; };
  const text = (p: Page, sel: string) => p.evaluate((s) => [...document.querySelectorAll<HTMLElement>(s)].filter((e) => e.offsetHeight).map((e) => (e.textContent ?? "").replace(/\s+/g, " ").trim()), sel);
  const count = (p: Page) => p.evaluate(() => [...document.querySelectorAll<HTMLElement>(".aglist [data-cl26='count']")].find((e) => e.offsetHeight)?.textContent?.trim() ?? null);
  for (const k of ["loading", "error", "day1"]) {
    const c = await ctx(); const p = await c.newPage();
    await openCl(p, VP, { state: k });
    await mut(p, "CLP12");
    const st = await text(p, `.aglist [data-clp='state'][data-k='${k}']`);
    const cnt = await count(p);
    if (k === "loading") {
      const sk = await p.evaluate(() => [...document.querySelectorAll<HTMLElement>(".aglist [data-clp='state'][data-k='loading'] .clp-sk")].filter((e) => e.offsetHeight).length);
      const spin = await p.evaluate(() => [...document.querySelectorAll<HTMLElement>(".aglist [class*='spin'], .aglist [role='progressbar']")].filter((e) => e.offsetHeight).length);
      L.check("loading: skeleton rows inside the list's frame", sk >= 5 && st.length === 1, `${sk} rows`);
      L.check("loading: no spinner", spin === 0, String(spin));
      L.check("loading: the bar reads Agents", cnt === "Agents", String(cnt));
    } else if (k === "error") {
      L.check("can't load: the copy", st.length === 1 && st[0].includes("Your agents didn’t load.") && st[0].includes("Nothing’s been lost. It’s usually the connection. Try again, and if it keeps happening, let us know through Give feedback.") && st[0].includes("Try again"), JSON.stringify(st));
      L.check("can't load: the bar reads Agents", cnt === "Agents", String(cnt));
    } else {
      L.check("day one: the panel's copy", st.length === 1 && st[0].includes("Add the agents you’re thinking about querying, even if you’re not ready yet. With a few more on file, your list can show who fits your book and who’s open now.") && st[0].includes("+ Add another agent"), JSON.stringify(st));
      L.check("day one: the rows above it", (await p.locator(".aglist [data-cl26='row']:visible").count()) >= 1, "");
    }
    await c.close();
  }
  /* no matches, through real filters: Find, then a genre */
  const c = await ctx(); const p = await c.newPage();
  await openCl(p, VP);
  await mut(p, "CLP12");
  await p.locator(".aglist [data-cl26='find'] input:visible").fill("zzqx");
  await p.waitForTimeout(500);
  const one = await text(p, ".aglist [data-clp='state'][data-k='none']");
  L.check("one filter: No agents match “zzqx”. and only Clear", one.length === 1 && one[0].startsWith("No agents match “zzqx”.") && one[0].includes("Clear the filters") && !one[0].includes("Just remove"), JSON.stringify(one));
  L.check("the bar: 0 of n agents", /^0 of \d+ agents$/.test(String(await count(p))), String(await count(p)));
  /* a genre first (with Find on, every genre counts 0 and is disabled), then Find again */
  await p.locator(".aglist [data-cl26='find'] input:visible").fill("");
  await p.waitForTimeout(400);
  await p.locator(".aglist [data-cl27='genre']:not([disabled]):visible").first().click({ timeout: 10_000 });
  await p.locator(".aglist [data-cl26='find'] input:visible").fill("zzqx");
  await p.waitForTimeout(500);
  const two = await text(p, ".aglist [data-clp='state'][data-k='none']");
  L.check("two filters: both named, the line, Clear and Just remove", two.length === 1 && /^No agents match “zzqx” and “[^”]+”\./.test(two[0]) && two[0].includes("Two filters together left nobody. Take one off, or clear them both.") && /Just remove “[^”]+”/.test(two[0]), JSON.stringify(two));
  await c.close();
  L.done(10);
});

/* ═════════ CLP13 · narrow page ═════════ */
test("CLP13 · page content under 1000px: the rail above the list, no sideways scroll, nothing overlapping", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("CLP13");
  await openCl(page, { width: 1000, height: 900 });
  await mut(page, "CLP13");
  const r = await page.evaluate(() => {
    const vis = <T extends HTMLElement>(s: string) => [...document.querySelectorAll<T>(s)].find((e) => e.offsetHeight) ?? null;
    const box = (e: Element | null) => { if (!e) return null; const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom }; };
    const inner = vis(".aglist .agl-inner");
    const rail = box(vis(".aglist [data-cl27='rail']")), list = box(vis(".aglist [data-cl26='card']"));
    const sc = vis<HTMLElement>(".agl-wpg .wpg-scroll")!;
    const hd = vis(".aglist [data-cl27='header']")!;
    const parts = ["[data-cl27='art']", "[data-cl27='main']", "[data-cl26='health']"].map((s) => box(hd.querySelector(s)));
    const ov = (a: ReturnType<typeof box>, b: ReturnType<typeof box>) => !!a && !!b && a.l < b.r - 1 && b.l < a.r - 1 && a.t < b.b - 1 && b.t < a.b - 1;
    return {
      w: inner ? Math.round(inner.getBoundingClientRect().width) : 0, rail, list,
      sideways: sc.scrollWidth > sc.clientWidth + 1 || document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      railPos: getComputedStyle(vis(".aglist [data-cl27='rail']")!).position,
      overlaps: [ov(parts[0], parts[1]), ov(parts[1], parts[2]), ov(parts[0], parts[2]), ov(rail, list)],
    };
  });
  L.check("the page content is under 1000px", r.w > 0 && r.w < 1000, String(r.w));
  L.check("the rail is above the list", !!r.rail && !!r.list && r.rail.b <= r.list.t + 1, JSON.stringify([r.rail, r.list]));
  L.check("the rail is full width, not sticky", !!r.rail && !!r.list && Math.abs((r.rail.r - r.rail.l) - (r.list.r - r.list.l)) <= 4 && r.railPos !== "sticky", `${r.railPos} ${JSON.stringify([r.rail, r.list])}`);
  L.check("no sideways scroll", !r.sideways, String(r.sideways));
  L.check("no overlapping boxes", r.overlaps.every((x) => !x), JSON.stringify(r.overlaps));
  /* and at 1440 and 1280 the columns stand */
  for (const vp of [VP, { width: 1280, height: 800 }]) {
    await page.setViewportSize(vp);
    await page.waitForTimeout(600);
    const w = await page.evaluate(() => {
      const r = [...document.querySelectorAll<HTMLElement>(".aglist [data-cl27='rail']")].find((e) => e.offsetHeight)!.getBoundingClientRect();
      const l = [...document.querySelectorAll<HTMLElement>(".aglist [data-cl26='card']")].find((e) => e.offsetHeight)!.getBoundingClientRect();
      const inner = [...document.querySelectorAll<HTMLElement>(".aglist .agl-inner")].find((e) => e.offsetHeight)!.getBoundingClientRect().width;
      return { beside: r.right <= l.left, inner: Math.round(inner) };
    });
    L.check(`at ${vp.width} the rail stays beside the list`, w.beside, JSON.stringify(w));
  }
  L.done(7);
});

/* ═════════ CLP14 · reduced motion ═════════ */
test("CLP14 · reduced motion: no running animations on the page", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("CLP14");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openCl(page, VP, { state: "loading" });
  /* the harness kills motion on every page it opens (measure.ts KILL_MOTION): take it off, or this lock reads nothing */
  const unkill = (p: Page) => p.evaluate((id) => { for (const st of document.querySelectorAll("style")) if ((st.textContent ?? "").startsWith(`/*${id}*/`)) st.remove(); }, KILL_MOTION_ID);
  await unkill(page);
  await mut(page, "CLP14");
  await page.waitForTimeout(500);
  const a = await page.evaluate(() => document.getAnimations().filter((x) => x.playState === "running").map((x) => (x as CSSAnimation).animationName ?? x.constructor.name));
  L.check("loading under reduced motion: nothing running", a.length === 0, JSON.stringify(a.slice(0, 8)));
  const p2 = await page.context().newPage();
  await p2.emulateMedia({ reducedMotion: "reduce" });
  await openCl(p2, VP);
  await unkill(p2);
  await p2.locator(".aglist [data-cl26='row']:visible").first().click();
  await p2.locator("[data-cl262='fit'] [data-star]").first().waitFor({ timeout: 15_000 });
  await p2.waitForTimeout(1200);
  const b = await p2.evaluate(() => document.getAnimations().filter((x) => x.playState === "running").map((x) => (x as CSSAnimation).animationName ?? x.constructor.name));
  L.check("card open under reduced motion: nothing running", b.length === 0, JSON.stringify(b.slice(0, 8)));
  await p2.close();
  void fresh;
  L.done(2);
});
