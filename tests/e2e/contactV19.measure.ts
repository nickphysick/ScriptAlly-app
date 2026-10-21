/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v19 — locks CL19 P1 to I1 (design-refs/contact-list-v19/contact-list-v19.html), on the rendered page
 * at 1512 × 900 and 1280 × 800 with the shell.
 *
 * Each lock was run against the build before the pack (`CL19_BASE=1`, ledger `base-<lock>.json`) and with its named
 * mutation (`CL19_MUTATE=<lock>`, ledger `mut-<lock>.json`) before its green was believed. A page mutation is CSS or
 * script applied in the page (MUTATIONS); a `src` mutation (C2, C3, F1, G1 — named in the report) is a source edit
 * made and undone in this pack's worktree, from a path-derived backup, with `CL19_MUTATE` naming the ledger only.
 *
 * ⚠️ EVERY WORKSPACE PAGE STAYS MOUNTED: every read starts from the visible copy (box height > 0).
 * ⚠️ PINNING TICKS THE GETTING-STARTED GUIDE (todoPrefs.contacts.guide.done.pin): every test records the guide's
 *    state, marks it seen with "pin" done (so no done-note pops over the band), and restores it exactly in `finally`.
 * ⚠️ THE WRITING LOCK PUTS THE ACCOUNT BACK: C1 gives one agent a long email and website so 1280 must stack them,
 *    and writes back exactly what it read (absent means deleted).
 */
import { expect, test, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { collection, deleteField, doc, getDoc, getDocs, updateDoc } from "firebase/firestore";
import { openContacts16, LOADED_ROW16, LIB16, MEMORY_KEYS, VIEW_KEYS } from "./cl16Lib";
import { harnessDb } from "./harnessDocs";
import { courtOf } from "../../src/lib/qcSummary";
import { isYourMove } from "../../src/lib/queryCentreGroups";
import { resolveScopedManuscript } from "../../src/lib/shellSidebar";
import type { Agent, Query, QueryStatus } from "../../src/types";

const DIR = "reports/contact-list-v19";
const MUT = process.env.CL19_MUTATE ?? "";
const BASE = process.env.CL19_BASE === "1";
const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
type VP = { width: number; height: number };
const near = (a: unknown, b: number, t: number) => typeof a === "number" && Number.isFinite(a) && Math.abs(a - b) <= t;
const sh = (c: string) => execSync(c, { encoding: "utf8" });
const guideNow = () => sh("node tests/e2e/guideFlags.mjs").trim().split("\n").pop()!;
const guideSet = (args: string) => sh(`node tests/e2e/guideFlags.mjs ${args}`);
const guideRestore = (json: string) => sh(`node tests/e2e/guideFlags.mjs --restore '${json}'`);

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

/** one named break per lock, in the page. C2, C3, F1 and G1 are broken in `src` (the report names each). */
const MUTATIONS: Record<string, { css?: string; js?: string }> = {
  "CL19-P1": { css: `.cl19-head:not([data-pinned]) .cl19-grp { font-size: 15.5px !important; }` },
  "CL19-P2": { css: `.ws-ftab { background: #2a3a52 !important; color: #fff !important; } .ws-ftab .ws-ftfl { fill: #2a3a52 !important; }` },
  "CL19-P3": { css: `.cl19-head[data-pinned] .cl19-az { transform: translateX(10px) !important; }` },
  "CL19-T1": { css: `.cl19-tb { flex-wrap: wrap !important; height: auto !important; max-height: none !important; overflow: visible !important; } .cl19-tb .cl19-az button { display: inline-flex !important; } .cl19-tb .cl19-jump button[data-cl19="jump-group"] { display: inline-flex !important; } .cl19-tb .cl19-jmore { display: none !important; }` },
  "CL19-C1": { css: `.cl19-em .cl19-et { display: inline-block !important; max-width: 90px !important; overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important; vertical-align: bottom; }` },
  "CL19-D1": { js: `(() => { const fix = () => { for (const r of document.querySelectorAll('.aglist [data-clv="row"][data-cl19-open]')) { if (r.querySelector('[data-mut]')) continue; const d = document.createElement("div"); d.className = "cl183-pk"; d.dataset.mut = "1"; d.innerHTML = '<span data-cl183="peek-pill" data-k="social">@agent.example</span> <a data-cl1833="next" href="#">Send the full</a>'; const s = r.querySelector('[data-cl19="strip"]'); (s || r).appendChild(d); } }; new MutationObserver(fix).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-cl19-open"] }); })()` },
  "CL19-E1": { js: `(() => { window.addEventListener("click", (e) => { const x = e.target && e.target.closest && e.target.closest('[data-cl19="group-stop"]'); if (!x || window.__mutBusy) return; e.stopImmediatePropagation(); e.preventDefault(); window.__mutBusy = true; const g = [...document.querySelectorAll("button.cl19-grp")].find((b) => b.getBoundingClientRect().height > 0); g && g.click(); setTimeout(() => { const o = [...document.querySelectorAll('[data-opt="group:letter"]')].find((b) => b.getBoundingClientRect().height > 0); o && o.click(); window.__mutBusy = false; }, 300); }, true); })()` },
  "CL19-E2": { css: `.cl19-jump button[data-cl19="jump-group"][data-over] { display: inline-flex !important; } .cl19-jump .cl19-jmore { display: none !important; } .cl19-tb .cl19-jump .cl19-jl { display: inline !important; }` },
  "CL19-H1": { js: `(() => { const hide = () => { const l = [...document.querySelectorAll(".aglist .clv-list")].find((e) => e.getBoundingClientRect().height > 0); if (!l) return; const cells = [...l.querySelectorAll(".clv-rq")]; cells.forEach((c) => { c.style.display = "none"; }); requestAnimationFrame(() => requestAnimationFrame(() => cells.forEach((c) => { c.style.display = ""; }))); }; let busy = false; new MutationObserver((ms) => { if (busy) return; if (!ms.some((m) => m.type === "childList" && [...m.addedNodes].some((n) => n.nodeType === 1 && (n.matches && (n.matches(".clv-row, .clv-grp, section") || n.querySelector && n.querySelector(".clv-row")))))) return; busy = true; hide(); setTimeout(() => { busy = false; }, 50); }).observe(document.body, { subtree: true, childList: true }); })()` },
  "CL19-I1": { js: `(() => { const fix = () => { for (const c of document.querySelectorAll('.aglist [data-cl19="card"]')) { if (c.querySelector(':scope > [data-mut]')) continue; const d = document.createElement("div"); d.dataset.mut = "1"; d.className = "clv-end"; d.style.cssText = "height:64px;padding:20px 28px;font-style:italic"; d.textContent = "That's everyone: every agent on file."; c.appendChild(d); } }; fix(); new MutationObserver(fix).observe(document.body, { subtree: true, childList: true }); })()` },
};
const mutate = async (page: Page, lock: string) => {
  const m = MUT === lock ? MUTATIONS[lock] : null;
  if (!m) return;
  if (m.css) await page.addStyleTag({ content: m.css });
  if (m.js) await page.evaluate(m.js);
  await page.waitForTimeout(200);
};
/** every open starts from the defaults: cl16Lib clears the list's memory only on a tab's first load, so a second
 *  open in the same tab clears it here (the view in localStorage, the visit in sessionStorage) */
const open = async (page: Page, vp: VP, lock: string, opts: { motion?: boolean } = {}) => {
  if (/^https?:/.test(page.url())) await page.evaluate(({ m, v }) => { try { for (const k of m) sessionStorage.removeItem(k); for (const k of v) localStorage.removeItem(k); } catch { /* private mode */ } }, { m: MEMORY_KEYS, v: VIEW_KEYS });
  await openContacts16(page, vp, opts);
  /* and proves it: a page that wrote its memory on the way out (a scroll, the pin) is cleared and loaded again */
  const dirty = await page.evaluate(({ m, v }) => { try { return [...m.map((k) => sessionStorage.getItem(k)), ...v.map((k) => localStorage.getItem(k))].some((x) => x != null && /"pinned":true|"group":"(?!none)|"scroll":[1-9]|"search":"[^"]/.test(x)); } catch { return false; } }, { m: MEMORY_KEYS, v: VIEW_KEYS });
  if (dirty) {
    await page.evaluate(({ m, v }) => { for (const k of m) sessionStorage.removeItem(k); for (const k of v) localStorage.removeItem(k); }, { m: MEMORY_KEYS, v: VIEW_KEYS });
    await page.reload(); await expect(page.locator(LOADED_ROW16).first()).toBeVisible({ timeout: 30_000 });
    await page.evaluate(() => document.fonts.ready);
    if (!opts.motion) await page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; animation: none !important; }" });
    await page.waitForTimeout(400);
    await page.evaluate(LIB16);
  }
  await mutate(page, lock);
};
/** the guide: recorded, marked seen with "pin" done, and put back exactly afterwards */
const withGuide = async (fn: () => Promise<void>) => {
  const g0 = guideNow();
  /* the page can still write a tick a moment after the last action, so the restore waits for it */
  try { guideSet("--seen --done pin"); await fn(); } finally { await new Promise((r) => setTimeout(r, 1500)); guideRestore(g0); }
};

/* ───────────────────────── helpers ───────────────────────── */
/** a bounded click: a control that is missing or covered is a RED READING, never a test that dies on a timeout */
const click = async (page: Page, L: Ledger, sel: string, where: string) => {
  try { await page.locator(sel).filter({ visible: true }).first().click({ timeout: 6000 }); return true; }
  catch { L.check(`${where}: "${sel}" could be pressed`, false, "missing, hidden or covered"); return false; }
};
const pinned = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-cl19='pin']")].find((e) => e.getBoundingClientRect().height > 0)?.getAttribute("aria-pressed") === "true");
const setPin = async (page: Page, L: Ledger, on: boolean, where: string) => {
  if ((await pinned(page)) === on) return true;
  const ok = await click(page, L, "[data-cl19='pin']", where);
  await page.waitForTimeout(900);
  return ok && (await pinned(page)) === on;
};
const groupBy = async (page: Page, L: Ledger, key: string, where: string) => {
  if (!(await click(page, L, "button.cl19-grp", where))) return false;
  await page.waitForTimeout(350);
  const ok = await click(page, L, `[data-opt="group:${key}"]`, where);
  await page.waitForTimeout(700);
  return ok;
};
const typeFind = async (page: Page, L: Ledger, text: string, where: string) => {
  if (!(await click(page, L, ".cl19-findw label.cl19-find", where))) return false;
  const inp = page.locator(".cl19-findw input").filter({ visible: true }).first();
  await inp.fill(text); await page.waitForTimeout(700);
  return true;
};
/** the scroller the visible list sits in */
const scrollTo = (page: Page, y: number | "end") => page.evaluate(async (y) => {
  const card = [...document.querySelectorAll<HTMLElement>("[data-cl19='card'], .aglist .clv-group")].find((e) => e.getBoundingClientRect().height > 0);
  const sc = card?.closest<HTMLElement>(".wpg-scroll");
  if (!sc) return null;
  sc.style.scrollBehavior = "auto";
  sc.scrollTop = y === "end" ? sc.scrollHeight : y;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  await new Promise((r) => setTimeout(r, 250));
  return sc.scrollTop;
}, y);
const rowIds = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".aglist [data-clv='row'][data-agent-card]")].filter((e) => e.getBoundingClientRect().height > 0).map((e) => e.dataset.agentCard!));
const activeHeading = (page: Page) => page.evaluate(() => {
  const h = [...document.querySelectorAll<HTMLElement>(".lt-labels.lth [data-lt-col][aria-pressed='true']")].find((e) => e.getBoundingClientRect().height > 0);
  return h ? `${h.dataset.ltCol}${/↑/.test(h.textContent ?? "") ? " ↑" : /↓/.test(h.textContent ?? "") ? " ↓" : ""}` : null;
});

/* ───────────────────────── P · one list, pinned or unpinned ───────────────────────── */
const PARITY_PROPS = ["fontFamily", "fontSize", "color", "borderRadius", "boxShadow"] as const;
const readParity = (page: Page, ids: { mail: string | null; web: string | null; any: string }) => page.evaluate(({ ids, props }) => {
  const vis = (s: string, root: ParentNode = document) => [...root.querySelectorAll<HTMLElement>(s)].filter((e) => e.getBoundingClientRect().height > 0);
  const row = (id: string | null) => (id ? vis(`.aglist [data-clv='row'][data-agent-card="${id}"]`)[0] ?? null : null);
  const any = row(ids.any), mail = row(ids.mail), web = row(ids.web);
  const els: Record<string, HTMLElement | null> = {
    toolbar: vis("[data-cl19='toolbar']")[0] ?? null,
    find: vis(".cl19-findw label.cl19-find")[0] ?? null,
    group: vis("button.cl19-grp")[0] ?? null,
    filters: vis("button.cl19-fil")[0] ?? null,
    /* RETIRED (Contact list v20 §C): "pin" is no longer one control in two positions — unpinned at the top the
       toolbar carries no full-screen control at all (the title row does), so it has no parity to hold. CL20-C1 holds
       where the control is in each state. */
    name: any?.querySelector<HTMLElement>(".clv-rwn b") ?? null,
    agency: any?.querySelector<HTMLElement>(".clv-ragy") ?? null,
    date: any?.querySelector<HTMLElement>("[data-cl19='date']") ?? null,
    website: (web ?? any)?.querySelector<HTMLElement>("[data-cl19='website'], [data-cl19='add-website']") ?? null,
    email: (mail ?? any)?.querySelector<HTMLElement>("[data-cl19='email'], [data-cl19='add-email']") ?? null,
    status: any?.querySelector<HTMLElement>(".clv-rq > *") ?? null,
  };
  vis(".lt-labels.lth > [data-lt-col]").forEach((h, i) => { els[`heading ${i + 1} (${h.dataset.ltCol})`] = h; });
  const list = vis(".aglist [data-cl19-stacked], .aglist .clv-list")[0];
  const fit = [...document.querySelectorAll<HTMLElement>(".aglist [style*='--cl19-fs']")].find((e) => e.getBoundingClientRect().height > 0);
  const out: Record<string, Record<string, string> | null> = { __fit: { fs: fit ? getComputedStyle(fit).getPropertyValue("--cl19-fs").trim() : "", stacked: String(!!vis(".aglist [data-cl19-stacked]").length), list: String(!!list) } };
  for (const [k, e] of Object.entries(els)) {
    if (!e) { out[k] = null; continue; }
    const c = getComputedStyle(e) as unknown as Record<string, string>;
    out[k] = { ...Object.fromEntries(props.map((p) => [p, c[p]])), height: e.getBoundingClientRect().height.toFixed(2), kind: e.dataset.cl19 ?? "" };
  }
  return out;
}, { ids, props: PARITY_PROPS as unknown as string[] });

test("CL19-P1 · parity: the toolbar, its controls, the headings and a row's cells are styled alike pinned and unpinned", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("CL19-P1");
  await withGuide(async () => {
    for (const vp of SIZES) {
      const w = `@${vp.width}`;
      await open(page, vp, "CL19-P1");
      const ids = await page.evaluate(() => {
        const rows = [...document.querySelectorAll<HTMLElement>(".aglist [data-clv='row'][data-agent-card]")].filter((e) => e.getBoundingClientRect().height > 0);
        return {
          mail: rows.find((r) => r.querySelector("[data-cl19='email']"))?.dataset.agentCard ?? null,
          web: rows.find((r) => r.querySelector("[data-cl19='website']"))?.dataset.agentCard ?? null,
          any: rows[0]?.dataset.agentCard ?? "",
        };
      });
      const un = await readParity(page, ids);
      L.check(`${w} unpinned to begin with (precondition)`, !(await pinned(page)), "");
      const ok = await setPin(page, L, true, `${w} pin`);
      L.check(`${w} the list pins (precondition)`, ok, `${ok}`);
      const pi = await readParity(page, ids);
      L.check(`${w} the population: a row with an email`, !!ids.mail, `${ids.mail}`);
      const keys = Object.keys(un).filter((k) => k !== "__fit");
      const heads = (o: typeof un) => Object.keys(o).filter((k) => k.startsWith("heading")).length;
      L.check(`${w} the headings: six side by side, five stacked, in each position`, heads(un) === (un.__fit?.stacked === "true" ? 5 : 6) && heads(pi) === (pi.__fit?.stacked === "true" ? 5 : 6), `${heads(un)} (${un.__fit?.stacked}) · ${heads(pi)} (${pi.__fit?.stacked})`);
      /* ⚠️ THE ONE MEASURED EXCEPTION (reported as a false premise): §C steps the Date added, Website and Email type down
         in 0.5px steps until the row fits, and the unpinned card is 48px narrower, so at 1280 it can step once more
         (14 against 14.5). Their size is held to the position's own measured fit (--cl19-fs), and everything else to
         the other position's. */
      const SCALING = ["date", "website", "email"];
      /* v19.1 §F — the unpinned toolbar is navy by design, so the controls' rings (Find, Group by, Filters) and the Pin's
         colours differ between the positions; the toolbar's own background and the letters' colours are not read here
         (CL191-F1 holds both positions to their values). Everything else stays literal. */
      /* cards-sort-search v1 §C — re-pointed: Find is the recessed well unpinned (cream ink, radius 9) and white on the
         cream toolbar (the controls' ink, radius 8), so its colour and radius now differ by design too */
      const BY_DESIGN: Record<string, string[]> = { find: ["boxShadow", "color", "borderRadius"], group: ["boxShadow"], filters: ["boxShadow"], pin: ["color"] };
      for (const k of keys) {
        const a = un[k], b = pi[k];
        L.check(`${w} ${k}: present in both positions`, !!a && !!b, `${!!a} · ${!!b}`);
        if (!a || !b) continue;
        if (k.startsWith("heading") && heads(un) !== heads(pi)) continue;
        for (const p of [...PARITY_PROPS, "height"]) {
          if (BY_DESIGN[k]?.includes(p)) continue;
          /* v19.1 §A — a missing website or email's "+ Add" link is a fixed 14px in both positions: it does not scale */
          if (SCALING.includes(k) && p === "fontSize" && /^add-/.test(a.kind) && /^add-/.test(b.kind)) {
            L.check(`${w} ${k}: the "+ Add" link is 14px in both positions`, a[p] === "14px" && b[p] === "14px", `${a[p]} unpinned · ${b[p]} pinned`);
            continue;
          }
          if (SCALING.includes(k) && (p === "fontSize" || p === "height") && un.__fit?.fs !== pi.__fit?.fs) {
            if (p === "fontSize") L.check(`${w} ${k}: its size is each position's own fit`, a[p] === `${parseFloat(un.__fit?.fs ?? "")}px` && b[p] === `${parseFloat(pi.__fit?.fs ?? "")}px`, `${a[p]} (fit ${un.__fit?.fs}) unpinned · ${b[p]} (fit ${pi.__fit?.fs}) pinned`);
            continue;
          }
          L.check(`${w} ${k}: ${p} is the same`, a[p] === b[p], `${a[p]} unpinned · ${b[p]} pinned`);
        }
      }
      await setPin(page, L, false, `${w} unpin`);
    }
  });
  L.done(150);
});

test("CL19-P2 · unpinned: the hero, no old bars, the cream folder tab with no navy curve, a card rounded at the foot with 22px of page below (v19.1 §F)", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("CL19-P2");
  await withGuide(async () => {
    for (const vp of SIZES) {
      const w = `@${vp.width}`;
      await open(page, vp, "CL19-P2");
      L.check(`${w} unpinned (precondition)`, !(await pinned(page)), "");
      const r = await page.evaluate(() => {
        const vis = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].filter((e) => e.getBoundingClientRect().height > 0);
        const hero = vis(".aglist [data-own-header].cl17-hd")[0];
        const card = vis("[data-cl19='card']")[0];
        const tab = vis(".ws-ftab")[0], fl = tab?.querySelector<SVGElement>(".ws-ftfl");
        const sheet = vis(".ws-window")[0];
        const cs = card ? getComputedStyle(card) : null;
        return {
          hero: !!hero, heroAbove: !!hero && !!card && hero.getBoundingClientRect().bottom <= card.getBoundingClientRect().top + 0.5,
          lh: vis(".aglist .cl18-lh").length, tabs: vis(".aglist .cl18-tabs, .aglist .cl18-pl, [data-cl18='tabs'], [data-cl18='pin-letters']").length,
          tabBg: tab ? getComputedStyle(tab).backgroundColor : null, flFill: fl ? getComputedStyle(fl).fill : null,
          sheetBg: sheet ? getComputedStyle(sheet).backgroundColor : null,
          bl: cs?.borderBottomLeftRadius ?? null, br: cs?.borderBottomRightRadius ?? null,
        };
      });
      L.check(`${w} the hero shows, above the list card`, r.hero && r.heroAbove, `${r.hero} · ${r.heroAbove}`);
      L.check(`${w} no old list bar`, r.lh === 0, `${r.lh}`);
      L.check(`${w} no rolodex tabs`, r.tabs === 0, `${r.tabs}`);
      L.check(`${w} the sheet is the route's cream rgb(242, 238, 232)`, r.sheetBg === "rgb(242, 238, 232)", `${r.sheetBg}`);
      L.check(`${w} the folder tab is the sheet's colour`, !!r.tabBg && r.tabBg === r.sheetBg, `${r.tabBg} vs ${r.sheetBg}`);
      L.check(`${w} no navy inverted corner (the fillet is the sheet's colour)`, !!r.flFill && r.flFill === r.sheetBg, `${r.flFill}`);
      /* v19.1 §F re-points this: unpinned, the card's bottom corners round (18) — CL191-F1 holds all four */
      L.check(`${w} the card's bottom corners are 18px (v19.1 §F)`, r.bl === "18px" && r.br === "18px", `${r.bl} · ${r.br}`);
      /* no condensed sticky bar: scrolled, the only things held at the scroll area's top are the toolbar and the headings */
      await scrollTo(page, 900);
      const s = await page.evaluate(() => {
        const card = [...document.querySelectorAll<HTMLElement>("[data-cl19='card']")].find((e) => e.getBoundingClientRect().height > 0);
        const sc = card?.closest<HTMLElement>(".wpg-scroll");
        if (!sc) return null;
        const top = sc.getBoundingClientRect().top;
        const held = [...sc.querySelectorAll<HTMLElement>("*")].filter((e) => {
          const p = getComputedStyle(e).position; if (p !== "sticky" && p !== "fixed") return false;
          const b = e.getBoundingClientRect(); return b.height > 0 && b.top < top + 150 && b.bottom > top;
        });
        const head = sc.querySelector("[data-cl19='head']"), labels = sc.querySelector(".lt-labels.lth");
        /* the shell's own sheet lip (every page's 12px sticky top edge) is not the page's */
        const lip = sc.querySelector<HTMLElement>(":scope > .sheet-lip");
        const odd = held.filter((e) => e !== lip && !(head?.contains(e) || e.contains(head as Node) || labels?.contains(e) || e === labels)).map((e) => `${e.tagName}.${e.className}`);
        const lipB = lip && lip.getBoundingClientRect().height > 0 ? lip.getBoundingClientRect().bottom - top : 0;
        const headTop = head ? (head as HTMLElement).getBoundingClientRect().top - top : null;
        const tb = sc.querySelector<HTMLElement>("[data-cl19='toolbar']");
        return { odd, held: held.length, headTop, lipB, tbTop: tb ? tb.getBoundingClientRect().top - top : null, labelsGap: labels && tb ? (labels as HTMLElement).getBoundingClientRect().top - tb.getBoundingClientRect().bottom : null,
          heroGone: (() => { const h = sc.querySelector<HTMLElement>("[data-own-header].cl17-hd"); return !!h && h.getBoundingClientRect().bottom <= top; })() };
      });
      L.check(`${w} scrolled: the hero is behind (precondition)`, !!s?.heroGone, `${s?.heroGone}`);
      L.check(`${w} scrolled: the toolbar sticks at the top of the scroll area (under the shell's sheet lip) ±1`, near((s?.tbTop ?? NaN) - (s?.lipB ?? NaN), 0, 1), `${s?.tbTop?.toFixed(1)} vs lip ${s?.lipB?.toFixed(1)}`);
      L.check(`${w} scrolled: the headings stick directly under it ±1`, near(s?.labelsGap, 0, 1), `${s?.labelsGap?.toFixed(1)}`);
      L.check(`${w} scrolled: nothing else is held at the top (no condensed bar)`, !!s && s.odd.length === 0, JSON.stringify(s?.odd));
      /* the list's end: nothing between the last row and the page's foot */
      await scrollTo(page, "end");
      const e = await page.evaluate(() => {
        const card = [...document.querySelectorAll<HTMLElement>("[data-cl19='card']")].find((x) => x.getBoundingClientRect().height > 0);
        const sc = card?.closest<HTMLElement>(".wpg-scroll");
        const rows = card ? [...card.querySelectorAll<HTMLElement>("[data-clv='row'][data-agent-card]")].filter((x) => x.getBoundingClientRect().height > 0) : [];
        const last = rows[rows.length - 1];
        let after = 0; for (let n = card?.nextElementSibling; n; n = n.nextElementSibling) if ((n as HTMLElement).getBoundingClientRect().height > 0) after += 1;
        return { last: last?.getBoundingClientRect().bottom ?? null, card: card?.getBoundingClientRect().bottom ?? null, sc: sc ? sc.getBoundingClientRect().top + sc.clientHeight : null, after };
      });
      L.check(`${w} the last row ends on the card's foot ±1`, near((e.last ?? NaN) - (e.card ?? NaN), 0, 1), `${e.last?.toFixed(1)} vs ${e.card?.toFixed(1)}`);
      /* v19.1 §F re-points this: unpinned, 22px of page lies below the card */
      L.check(`${w} the card ends 22 ±1 above the page's foot (v19.1 §F)`, near((e.sc ?? NaN) - (e.card ?? NaN), 22, 1), `${e.card?.toFixed(1)} vs ${e.sc?.toFixed(1)}`);
      L.check(`${w} nothing beneath the card`, e.after === 0, `${e.after}`);
    }
  });
  L.done(30);
});

test("CL19-P3 · pinned: the band is 66 tall and navy; the toolbar's first letter starts on the count's left", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("CL19-P3");
  await withGuide(async () => {
    for (const vp of SIZES) {
      const w = `@${vp.width}`;
      await open(page, vp, "CL19-P3");
      const ok = await setPin(page, L, true, `${w} pin`);
      L.check(`${w} the list pins (precondition)`, ok, `${ok}`);
      const r = await page.evaluate(() => {
        const vis = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].filter((e) => e.getBoundingClientRect().height > 0);
        const band = vis("[data-cl19='band']")[0], fig = vis("[data-cl19='band-figure']")[0];
        const letter = vis("[data-cl19='letter']")[0];
        const hero = vis(".aglist [data-own-header].cl17-hd").length;
        return { h: band?.getBoundingClientRect().height ?? null, bg: band ? getComputedStyle(band).backgroundColor : null,
          fig: fig?.getBoundingClientRect().left ?? null, letter: letter?.getBoundingClientRect().left ?? null, hero };
      });
      L.check(`${w} the hero goes`, r.hero === 0, `${r.hero}`);
      L.check(`${w} the band is 66 ±1 tall`, near(r.h, 66, 1), `${r.h}`);
      L.check(`${w} the band is rgb(42, 58, 82)`, r.bg === "rgb(42, 58, 82)", `${r.bg}`);
      L.check(`${w} the first letter's left is the count's left ±2`, near((r.letter ?? NaN) - (r.fig ?? NaN), 0, 2), `${r.letter?.toFixed(1)} vs ${r.fig?.toFixed(1)}`);
      await setPin(page, L, false, `${w} unpin`);
    }
  });
  L.done(10);
});

/* ───────────────────────── T · the toolbar never wraps ───────────────────────── */
const readToolbar = (page: Page) => page.evaluate(() => {
  const vis = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].filter((e) => e.getBoundingClientRect().height > 0);
  /* RE-POINTED (Contact list v20 §C): the toolbar carries no Pin while the title row shows, so "nothing spills out of the
     right" is asserted on its LAST control, whatever that is (Filters at the top; Full screen once scrolled or full
     screen) — the claim was always that the row ends inside the toolbar */
  const tb = vis("[data-cl19='toolbar']")[0], pin = tb ? [...tb.querySelectorAll<HTMLElement>("[data-cl19='tools'] > *")].filter((e) => e.offsetWidth > 0).pop() : undefined;
  const lab = (sel: string) => { const b = vis(sel)[0]; const l = b?.querySelector<HTMLElement>(".cl19-l"); if (!b || !l) return null; const lb = l.getBoundingClientRect(), bb = b.getBoundingClientRect(); return { w: lb.width, clip: l.scrollWidth > l.clientWidth + 1, inside: lb.left >= bb.left - 0.5 && lb.right <= bb.right + 0.5, text: (l.textContent ?? "").trim() }; };
  const sc = tb?.closest<HTMLElement>(".wpg-scroll");
  return {
    h: tb?.getBoundingClientRect().height ?? null, tbR: tb?.getBoundingClientRect().right ?? null, pinR: pin?.getBoundingClientRect().right ?? null,
    tbOver: tb ? tb.scrollWidth - tb.clientWidth : null,
    group: lab("button.cl19-grp"), filters: lab("button.cl19-fil"),
    docOver: document.documentElement.scrollWidth - innerWidth, scOver: sc ? sc.scrollWidth - sc.clientWidth : null,
    n: (vis("[data-cl19='filters-n']")[0]?.textContent ?? "").trim(),
  };
});
const filtersOn = async (page: Page, L: Ledger, w: string) => {
  if (!(await click(page, L, "button.cl19-fil", `${w} open the menu`))) return false;
  await page.waitForTimeout(400);
  await click(page, L, "[data-cl19='quick'][data-qp='open']:not([disabled])", `${w} Open to submissions`);
  await page.waitForTimeout(350);
  await click(page, L, "[data-cl19='stand']:not([disabled]):not(.on)", `${w} a status`);
  await page.waitForTimeout(350);
  await click(page, L, "[data-cl19='genre']:not([disabled]):not(.on)", `${w} a genre`);
  await page.waitForTimeout(350);
  await page.keyboard.press("Escape"); await page.waitForTimeout(400);
  return true;
};
test("CL19-T1 · never wraps: 52 tall, the Pin inside, Group by and Filters whole, no sideways overflow — ungrouped, by Status, filtered", async ({ page }) => {
  test.setTimeout(400_000);
  const L = new Ledger("CL19-T1");
  await withGuide(async () => {
    for (const vp of SIZES) {
      for (const state of ["ungrouped", "status", "filtered", "pinned-filtered"] as const) {
        const w = `@${vp.width} ${state}`;
        await open(page, vp, "CL19-T1");
        if (state === "status") await groupBy(page, L, "status", w);
        if (state === "filtered" || state === "pinned-filtered") {
          if (state === "pinned-filtered") await setPin(page, L, true, `${w} pin`);
          await groupBy(page, L, "status", w);
          await filtersOn(page, L, w);
          await typeFind(page, L, "a", w);
        }
        const r = await readToolbar(page);
        if (state.includes("filtered")) L.check(`${w} three filters on (precondition)`, r.n === "3", `"${r.n}"`);
        L.check(`${w} the toolbar is 52 ±1 tall`, near(r.h, 52, 1), `${r.h}`);
        L.check(`${w} the toolbar's last control's right is inside the toolbar`, (r.pinR ?? Infinity) <= (r.tbR ?? -Infinity) + 0.5, `${r.pinR?.toFixed(1)} vs ${r.tbR?.toFixed(1)}`);
        L.check(`${w} the toolbar's content does not overflow it`, (r.tbOver ?? 99) <= 1, `${r.tbOver}`);
        L.check(`${w} Group by's label is whole and visible`, !!r.group && r.group.w > 0 && !r.group.clip && r.group.inside, JSON.stringify(r.group));
        L.check(`${w} Filters' label is whole and visible`, !!r.filters && r.filters.w > 0 && !r.filters.clip && r.filters.inside, JSON.stringify(r.filters));
        L.check(`${w} the page has no horizontal overflow`, r.docOver <= 0 && (r.scOver ?? 99) <= 0, `${r.docOver} · ${r.scOver}`);
        if (state === "pinned-filtered") await setPin(page, L, false, `${w} unpin`);
      }
    }
  });
  L.done(50);
});

/* ───────────────────────── C · columns, headings and rows ───────────────────────── */
const LONG = "msv12-agent-4";
const LONG_EMAIL = "theo.abara@abaragrantliteraryagency.co.uk", LONG_WEB = "https://www.abaragrantliteraryagency.co.uk";
const withLong = async (fn: () => Promise<void>) => {
  const { db, uid } = await harnessDb();
  const ref = doc(db, "users", uid, "agents", LONG);
  const d = (await getDoc(ref)).data() ?? {};
  const before = { email: d.email, website: d.website };
  try {
    await updateDoc(ref, { email: LONG_EMAIL, website: LONG_WEB });
    await fn();
  } finally {
    await updateDoc(ref, { email: before.email === undefined ? deleteField() : before.email, website: before.website === undefined ? deleteField() : before.website });
  }
};
test("CL19-C1 · columns: Agent, Date added, Website and Email, Replies, Query status; each heading on its column; nothing shortened", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("CL19-C1");
  await withLong(async () => {
    for (const vp of SIZES) {
      const w = `@${vp.width}`;
      await open(page, vp, "CL19-C1");
      const r = await page.evaluate(() => {
        const vis = (s: string, root: ParentNode = document) => [...root.querySelectorAll<HTMLElement>(s)].filter((e) => e.getBoundingClientRect().height > 0);
        const heads = vis(".lt-labels.lth > [data-lt-col]").map((h) => ({ label: h.dataset.ltCol ?? "", l: h.getBoundingClientRect().left }));
        const row = vis(".aglist [data-clv='row'][data-agent-card]")[0];
        let lefts: number[] = [];
        if (row) {
          const cs = getComputedStyle(row), rb = row.getBoundingClientRect();
          const tracks = cs.gridTemplateColumns.split(" ").map(parseFloat), gap = parseFloat(cs.columnGap) || 0;
          let x = rb.left + parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth); for (const t of tracks) { lefts.push(x); x += t + gap; }
          if (lefts.length !== heads.length) lefts = [...row.children].filter((c) => (c as HTMLElement).getBoundingClientRect().height > 0).map((c) => (c as HTMLElement).getBoundingClientRect().left);
        }
        const texts = vis(".aglist [data-cl19='email'] .cl19-et, .aglist [data-cl19='website'] .cl19-wt").map((t) => {
          const cell = t.closest<HTMLElement>(".cl19-c"); const tb = t.getBoundingClientRect(), cb = cell?.getBoundingClientRect();
          return { t: (t.textContent ?? "").trim(), sw: t.scrollWidth, cw: t.clientWidth, out: !!cb && tb.right > cb.right + 1, title: t.closest("[title]")?.getAttribute("title") ?? null };
        });
        return { heads, lefts, texts, stacked: !!vis(".aglist [data-cl19-stacked]").length };
      });
      const order = r.heads.map((h) => h.label);
      const want = r.stacked ? ["Agent", "Date added", "Website and email", "Replies", "Query status"] : ["Agent", "Date added", "Website", "Email", "Replies", "Query status"];
      L.check(`${w} the heading order`, JSON.stringify(order) === JSON.stringify(want), JSON.stringify(order));
      for (const [i, h] of r.heads.entries()) L.check(`${w} "${h.label}" starts on its column's left ±1`, near(h.l - (r.lefts[i] ?? NaN), 0, 1), `${h.l.toFixed(1)} vs ${r.lefts[i]?.toFixed(1)}`);
      L.check(`${w} the population: emails and websites to check, the long ones among them`, r.texts.length >= 10 && r.texts.some((t) => t.t.includes(LONG_EMAIL)) && r.texts.some((t) => t.t.includes("abaragrantliteraryagency.co.uk") && !t.t.includes("@")), `${r.texts.length}`);
      for (const t of r.texts) L.check(`${w} "${t.t}" is whole (scrollWidth ≤ clientWidth, inside its cell)`, t.sw <= t.cw + 0.5 && !t.out, `${t.sw} > ${t.cw} · out ${t.out}`);
      if (vp.width === 1280) L.check(`${w} website and email stack at 1280 (the branch is entered)`, r.stacked, `${r.stacked}`);
    }
  });
  L.done(30);
});

test("CL19-C2 · Date added: the first click puts the newest first, the second the oldest, against the data", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("CL19-C2");
  const { db, uid } = await harnessDb();
  const added = new Map<string, number>();
  for (const d of (await getDocs(collection(db, "users", uid, "agents"))).docs) { const t = Date.parse(String(d.data().dateAdded ?? "")); added.set(d.id, Number.isFinite(t) ? t : NaN); }
  L.check("the agents carry a date added (precondition)", [...added.values()].filter((t) => Number.isFinite(t)).length === added.size && added.size > 10, `${[...added.values()].filter(Number.isFinite).length} of ${added.size}`);
  const dist = new Set([...added.values()].map((t) => new Date(t).toISOString().slice(0, 10)));
  L.check("the data has more than one date (the order is a real claim)", dist.size >= 3, `${dist.size}`);
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await open(page, vp, "CL19-C2");
    for (const [n, dir] of [[1, "newest first"], [2, "oldest first"]] as const) {
      const ok = await click(page, L, ".lt-labels.lth [data-lt-col='Date added']", `${w} click ${n}`);
      await page.waitForTimeout(800);
      const ids = await rowIds(page);
      const ts = ids.map((id) => added.get(id));
      L.check(`${w} click ${n}: every row is an agent on file`, ok && ids.length > 10 && ts.every((t) => typeof t === "number"), `${ids.length}`);
      const bad = ts.findIndex((t, i) => i > 0 && (n === 1 ? (t as number) > (ts[i - 1] as number) : (t as number) < (ts[i - 1] as number)));
      L.check(`${w} click ${n}: ${dir}`, ids.length > 10 && bad === -1, bad === -1 ? "in order" : `row ${bad + 1} (${ids[bad]}) is ${new Date(ts[bad] as number).toISOString().slice(0, 10)} after ${new Date(ts[bad - 1] as number).toISOString().slice(0, 10)}`);
      const ext = n === 1 ? Math.max(...[...added.values()]) : Math.min(...[...added.values()]);
      L.check(`${w} click ${n}: the first row is the ${n === 1 ? "newest" : "oldest"} on file`, ts[0] === ext, `${ts[0] ? new Date(ts[0]).toISOString() : ts[0]} vs ${new Date(ext).toISOString()}`);
      L.check(`${w} click ${n}: the heading says ${n === 1 ? "↓" : "↑"}`, (await activeHeading(page)) === `Date added ${n === 1 ? "↓" : "↑"}`, `${await activeHeading(page)}`);
    }
  }
  L.done(18);
});

test("CL19-C3 · copy: clicking an email copies the full address, '✓ Copied' for 1400 ±200ms, and the card does not open", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("CL19-C3");
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await open(page, vp, "CL19-C3");
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    const id = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".aglist [data-clv='row'][data-agent-card]")].filter((e) => e.getBoundingClientRect().height > 0).find((r) => r.querySelector("[data-cl19='email']"))?.dataset.agentCard ?? null);
    L.check(`${w} a row with an email (precondition)`, !!id, `${id}`);
    if (!id) continue;
    const em = page.locator(`.aglist [data-agent-card="${id}"] [data-cl19='email']`).filter({ visible: true }).first();
    const addr = ((await em.locator(".cl19-et").textContent()) ?? "").trim();
    for (const how of ["click", "Enter"] as const) {
      await page.evaluate(() => navigator.clipboard.writeText("—"));
      await page.mouse.move(5, 5); await page.waitForTimeout(300);
      const t0 = Date.now();
      if (how === "click") await em.click(); else { await em.focus(); await page.keyboard.press("Enter"); }
      await page.waitForTimeout(120);
      const clip = await page.evaluate(() => navigator.clipboard.readText());
      const copied = () => page.evaluate((id) => [...document.querySelectorAll<HTMLElement>(`.aglist [data-agent-card="${id}"] [data-cl19='copied']`)].some((e) => e.getBoundingClientRect().height > 0 && (e.textContent ?? "").trim() === "✓ Copied"), id);
      L.check(`${w} ${how}: the clipboard holds the full address`, clip === addr && addr.includes("@"), `${clip} vs ${addr}`);
      L.check(`${w} ${how}: "✓ Copied" shows in place`, await copied(), "");
      const panels = await page.locator('[data-ap="panel"]').filter({ visible: true }).count();
      L.check(`${w} ${how}: the card does not open`, panels === 0, `${panels}`);
      let gone = NaN;
      while (Date.now() - t0 < 3000) { if (!(await copied())) { gone = Date.now() - t0; break; } await page.waitForTimeout(25); }
      L.check(`${w} ${how}: "✓ Copied" lasts 1400 ±200ms`, near(gone, 1400, 200), `${gone}ms`);
      for (let i = 0; i < 3; i++) { await page.keyboard.press("Escape"); await page.waitForTimeout(200); }
    }
  }
  L.done(14);
});

/* ───────────────────────── D · the open row ───────────────────────── */
test("CL19-D1 · strip: cream (v19.1 §G), genres before the wishlist in Special Elite, no social and no next step, the row's ground unchanged", async ({ page }) => {
  test.setTimeout(400_000);
  const L = new Ledger("CL19-D1");
  /* the population: rows with genres AND a wishlist, from the data, so the order claim is always entered */
  const { db, uid } = await harnessDb();
  const both = new Set((await getDocs(collection(db, "users", uid, "agents"))).docs.filter((d) => (d.data().genres ?? []).length > 0 && String(d.data().mswlNotes ?? "").trim()).map((d) => d.id));
  L.check("agents with genres and a wishlist exist (precondition)", both.size >= 1, `${both.size}`);
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await open(page, vp, "CL19-D1");
    const all = await rowIds(page);
    const ids = [...all.slice(0, 5), ...all.filter((id) => both.has(id)).slice(0, 3)];
    let seen = 0;
    for (const id of ids) {
      const row = page.locator(`.aglist [data-clv='row'][data-agent-card="${id}"]`).filter({ visible: true }).first();
      await row.scrollIntoViewIfNeeded(); await page.mouse.move(5, 5); await page.waitForTimeout(350);
      const b = await row.boundingBox(); if (!b) continue;
      await page.mouse.move(b.x + 60, b.y + 20); await page.waitForTimeout(150);
      const bg0 = await page.evaluate((id) => getComputedStyle([...document.querySelectorAll<HTMLElement>(`.aglist [data-agent-card="${id}"]`)].find((e) => e.getBoundingClientRect().height > 0)!).backgroundColor, id);
      await page.waitForTimeout(900);
      const r = await page.evaluate((id) => {
        const el = [...document.querySelectorAll<HTMLElement>(`.aglist [data-clv='row'][data-agent-card="${id}"]`)].find((e) => e.getBoundingClientRect().height > 0)!;
        const s = el.querySelector<HTMLElement>("[data-cl19='strip']");
        const g = s?.querySelector<HTMLElement>("[data-cl19='genres']"), wl = s?.querySelector<HTMLElement>("[data-cl19='wish']");
        const pills = s ? [...s.querySelectorAll<HTMLElement>(".cl19-pill")] : [];
        return {
          open: el.hasAttribute("data-peek") && !!s, bg: getComputedStyle(el).backgroundColor, sbg: s ? getComputedStyle(s).backgroundColor : null,
          pills: pills.length, wish: !!wl, wishFont: wl ? getComputedStyle(wl).fontFamily : null,
          order: !!g && !!wl && (g.compareDocumentPosition(wl) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0 && g.getBoundingClientRect().right <= wl.getBoundingClientRect().left + 0.5,
          social: el.querySelectorAll("[data-k='social'], [data-cl183='peek-pill'], .cl183-pk").length,
          next: el.querySelectorAll("[data-cl1833='next']").length,
        };
      }, id);
      if (!r.open) { L.check(`${w} ${id}: the row opened on a 450ms hover`, false, "closed"); continue; }
      /* v19.1 §G re-points this: the strip is cream, never the group header's powder (CL191-G1) */
      L.check(`${w} ${id}: the strip is rgb(246, 241, 232) (v19.1 §G)`, r.sbg === "rgb(246, 241, 232)", `${r.sbg}`);
      L.check(`${w} ${id}: no social handle`, r.social === 0, `${r.social}`);
      L.check(`${w} ${id}: no next-step link`, r.next === 0, `${r.next}`);
      L.check(`${w} ${id}: the row's background is unchanged`, r.bg === bg0, `${bg0} → ${r.bg}`);
      if (r.pills > 0 && r.wish) {
        seen += 1;
        L.check(`${w} ${id}: the genres come before the wishlist`, r.order, `${r.order}`);
        L.check(`${w} ${id}: the wishlist is in Special Elite`, /Special Elite/.test(r.wishFont ?? ""), `${r.wishFont}`);
      }
      await page.mouse.move(5, 5); await page.waitForTimeout(300);
    }
    L.check(`${w} rows with genres and a wishlist were opened (the population)`, seen >= 1, `${seen}`);
  }
  L.done(21);
});

/* ───────────────────────── E · grouping ───────────────────────── */
test("CL19-E1 · grouping: none at first; by Status 50-tall bands with a 2px navy top and one headings row; ✕ back to ungrouped, the sort kept", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("CL19-E1");
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await open(page, vp, "CL19-E1");
    const bands = () => page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".aglist [data-cl19='gband'], .aglist [data-clv='band']")].filter((e) => e.getBoundingClientRect().height > 0).map((e) => { const c = getComputedStyle(e); return { h: e.getBoundingClientRect().height, bw: c.borderTopWidth, bc: c.borderTopColor }; }));
    const chip = () => page.evaluate(() => { const b = [...document.querySelectorAll<HTMLElement>("button.cl19-grp")].find((e) => e.getBoundingClientRect().height > 0); return b ? (b.textContent ?? "").replace(/\s+/g, " ").trim() : null; });
    const heads = () => page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".aglist .lt-labels.lth")].filter((e) => e.getBoundingClientRect().height > 0).length);
    L.check(`${w} first visit: no bands`, (await bands()).length === 0, `${(await bands()).length}`);
    L.check(`${w} first visit: the chip reads "Group by"`, (await chip()) === "Group by", `${await chip()}`);
    /* a sort that is not the default, so "the sort is unchanged" is a claim about a choice */
    await click(page, L, ".lt-labels.lth [data-lt-col='Replies']", `${w} sort by Replies`);
    await page.waitForTimeout(700);
    const sort0 = await activeHeading(page), ids0 = (await rowIds(page)).slice(0, 20);
    await groupBy(page, L, "status", w);
    const b = await bands();
    L.check(`${w} grouped: bands show`, b.length >= 2, `${b.length}`);
    /* RETIRED (Contact list v20 §D): the 50-tall powder band with a 2px navy top is now the 54-tall cream ledger with no
       rules; CL20-D1 holds the ledger's height, ground, rules and alignment */
    void b;
    L.check(`${w} grouped: the headings appear once`, (await heads()) === 1, `${await heads()}`);
    L.check(`${w} grouped: the chip reads "Grouped by Status"`, /Grouped by\s*Status/.test((await chip()) ?? ""), `${await chip()}`);
    await click(page, L, "[data-cl19='group-stop']", `${w} ✕`);
    await page.waitForTimeout(900);
    L.check(`${w} after ✕: no bands`, (await bands()).length === 0, `${(await bands()).length}`);
    L.check(`${w} after ✕: the chip reads "Group by"`, (await chip()) === "Group by", `${await chip()}`);
    L.check(`${w} after ✕: the sort is unchanged`, (await activeHeading(page)) === sort0 && sort0 === "Replies ↓", `${sort0} → ${await activeHeading(page)}`);
    const ids1 = (await rowIds(page)).slice(0, 20);
    L.check(`${w} after ✕: the rows are in the same order`, JSON.stringify(ids1) === JSON.stringify(ids0), `${ids0.slice(0, 4)} → ${ids1.slice(0, 4)}`);
  }
  /* RE-POINTED (Contact list v20 §D): 18 readings once the band checks moved to CL20-D1 (was 30) */
  L.done(18);
});

test("CL19-E2 · jump row: grouped by Status at 1280, no jump button is cut — each is whole in the row or behind '+N more'", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("CL19-E2");
  const vp = SIZES[1];
  let entered = 0;
  await withGuide(async () => {
  for (const state of ["status", "status-pinned", "status-pinned-filtered"] as const) {
    const w = `@${vp.width} ${state}`;
    await open(page, vp, "CL19-E2");
    /* pinned, the band's drawing drops onto the toolbar and the row starts further in; a Filters chip with its count is
       wider still — so the "+N more" branch is entered */
    if (state !== "status") await setPin(page, L, true, `${w} pin`);
    await groupBy(page, L, "status", w);
    if (state === "status-pinned-filtered") {
      await click(page, L, "button.cl19-fil", `${w} open the menu`); await page.waitForTimeout(400);
      await click(page, L, "[data-cl19='quick'][data-qp='open']:not([disabled])", `${w} Open to submissions`); await page.waitForTimeout(350);
      await page.keyboard.press("Escape"); await page.waitForTimeout(500);
    }
    const r = await page.evaluate(() => {
      const vis = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].filter((e) => e.getBoundingClientRect().height > 0);
      const nav = vis("[data-cl19='jump']")[0], tools = vis("[data-cl19='tools']")[0], tb = vis("[data-cl19='toolbar']")[0];
      const all = nav ? [...nav.querySelectorAll<HTMLElement>("button[data-cl19='jump-group']")] : [];
      const nb = nav?.getBoundingClientRect(), tl = tools?.getBoundingClientRect().left ?? Infinity, tbb = tb?.getBoundingClientRect();
      const shown = all.filter((b) => b.getBoundingClientRect().width > 0).map((b) => { const r = b.getBoundingClientRect(); return { k: b.dataset.gkey, l: r.left, r: r.right, inNav: !!nb && r.left >= nb.left - 0.5 && r.right <= nb.right + 0.5, clearOfTools: r.right <= tl + 0.5, inTb: !!tbb && r.right <= tbb.right + 0.5 }; });
      const more = vis("[data-cl19='jump-more']")[0];
      const bands = vis(".aglist [data-cl19='gband']").length;
      return { total: all.length, shown, hidden: all.length - shown.length, moreN: more ? Number((more.textContent ?? "").replace(/\D+/g, "")) : 0, bands };
    });
    L.check(`${w} one jump button per group (the population)`, r.total > 0 && r.total === r.bands, `${r.total} vs ${r.bands}`);
    for (const s of r.shown) L.check(`${w} "${s.k}" is whole inside the jump row, clear of the tools`, s.inNav && s.clearOfTools && s.inTb, JSON.stringify(s));
    L.check(`${w} the groups not shown are exactly "+N more"`, r.hidden === r.moreN, `${r.hidden} hidden · +${r.moreN}`);
    console.log(`  ${w}: ${r.shown.length} shown, ${r.hidden} behind +N more`);
    if (r.hidden > 0) entered += 1;
    if (state !== "status") await setPin(page, L, false, `${w} unpin`);
  }
  });
  L.check("the \"+N more\" branch was entered in at least one state", entered > 0, `${entered}`);
  L.done(10);
});

/* ───────────────────────── F · filtering ───────────────────────── */
type Facts = { you: Set<string>; ready: Set<string>; wait: Set<string>; open: Set<string> };
const ORDER = ["Queried", "Partial Requested", "Partial Sent", "Full Requested", "Full Sent", "Revise & Resubmit", "Resubmitted", "Offer"];
const directFacts = async (msStored: string | null): Promise<{ facts: Facts; msId: string | null }> => {
  const { db, uid } = await harnessDb();
  const agents = (await getDocs(collection(db, "users", uid, "agents"))).docs.map((d) => ({ ...(d.data() as Agent), id: d.id }));
  const queries = (await getDocs(collection(db, "users", uid, "queries"))).docs.map((d) => ({ ...(d.data() as Query), id: d.id }));
  const mss = (await getDocs(collection(db, "users", uid, "manuscripts"))).docs.map((d) => ({ ...(d.data() as { createdDate?: string }), id: d.id }));
  const msId = resolveScopedManuscript(mss, msStored)?.id ?? null;
  const now = Date.now();
  const facts: Facts = { you: new Set(), ready: new Set(), wait: new Set(), open: new Set() };
  for (const a of agents) {
    const mine = queries.filter((q) => q.agentId === a.id && (msId == null || q.manuscriptId === msId));
    const isOpen = String(a.submissionStatus ?? "").trim().toLowerCase() === "open";
    if (isOpen) facts.open.add(a.id);
    if (!mine.length && isOpen) facts.ready.add(a.id);
    const live = mine.filter((q) => courtOf(q.status as QueryStatus) !== "closed");
    if (live.some((q) => isYourMove(q, a, now))) facts.you.add(a.id);
    if (live.length) {
      let best = live[0]; for (const q of live.slice(1)) if (ORDER.indexOf(q.status) > ORDER.indexOf(best.status)) best = q;
      if (["Queried", "Partial Sent", "Full Sent"].includes(best.status)) facts.wait.add(a.id);
    }
  }
  return { facts, msId };
};
test("CL19-F1 · filters: each quick pick selects its population from the data; zero is disabled; the applied row lists filters and search; Clear all", async ({ page }) => {
  test.setTimeout(400_000);
  const L = new Ledger("CL19-F1");
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await open(page, vp, "CL19-F1");
    const stored = await page.evaluate(() => { try { return localStorage.getItem("scriptally_active_manuscript_id"); } catch { return null; } });
    const { facts, msId } = await directFacts(stored);
    L.check(`${w} the manuscript in scope is known (precondition)`, !!msId, `${msId}`);
    const all = new Set(await rowIds(page));
    for (const key of ["you", "ready", "wait", "open"] as const) {
      if (!(await click(page, L, "button.cl19-fil", `${w} ${key}: open the menu`))) continue;
      await page.waitForTimeout(400);
      const want = facts[key];
      const card = page.locator(`[data-cl19='quick'][data-qp='${key}']`).filter({ visible: true }).first();
      const n0 = Number(await card.getAttribute("data-n").catch(() => "NaN"));
      L.check(`${w} ${key}: the card's count is the data's (${want.size})`, n0 === want.size, `${n0}`);
      if (want.size === 0) { await page.keyboard.press("Escape"); continue; }
      await click(page, L, `[data-cl19='quick'][data-qp='${key}']`, `${w} ${key}`);
      await page.waitForTimeout(700);
      const got = new Set(await rowIds(page));
      const missing = [...want].filter((id) => all.has(id) && !got.has(id)), extra = [...got].filter((id) => !want.has(id));
      L.check(`${w} ${key}: the list is the data's population (${want.size})`, missing.length === 0 && extra.length === 0 && got.size > 0, `missing ${missing.join(",")} · extra ${extra.join(",")}`);
      await click(page, L, `[data-cl19='quick'][data-qp='${key}']`, `${w} ${key} off`);
      await page.waitForTimeout(400);
      await page.keyboard.press("Escape"); await page.waitForTimeout(400);
    }
    /* zero is disabled: with Ready to query on, the queried statuses would all give zero */
    await click(page, L, "button.cl19-fil", `${w} zero: open the menu`); await page.waitForTimeout(400);
    await click(page, L, "[data-cl19='quick'][data-qp='ready']", `${w} zero: Ready to query`); await page.waitForTimeout(600);
    const z = await page.evaluate(() => {
      const m = [...document.querySelectorAll<HTMLElement>("[data-cl19='filter-menu']")].find((e) => e.getBoundingClientRect().height > 0);
      const opts = m ? [...m.querySelectorAll<HTMLButtonElement>("button[data-opt][data-n]")] : [];
      return opts.map((o) => ({ opt: o.dataset.opt, n: Number(o.dataset.n), on: o.getAttribute("aria-pressed") === "true" || o.getAttribute("aria-checked") === "true", dis: o.disabled }));
    });
    const zeros = z.filter((o) => o.n === 0 && !o.on);
    L.check(`${w} zero: choices that would give zero exist (the population)`, zeros.length >= 3, `${zeros.length}`);
    for (const o of zeros) L.check(`${w} zero: ${o.opt} (0) is disabled`, o.dis, `${o.dis}`);
    L.check(`${w} zero: every choice that would give some is enabled`, z.filter((o) => o.n > 0 && o.dis).length === 0, JSON.stringify(z.filter((o) => o.n > 0 && o.dis)));
    await click(page, L, "[data-cl19='quick'][data-qp='ready']", `${w} zero: off`); await page.waitForTimeout(400);
    /* the applied row: two filters and a search */
    await click(page, L, "[data-cl19='quick'][data-qp='open']:not([disabled])", `${w} applied: Open to submissions`); await page.waitForTimeout(400);
    await click(page, L, "[data-cl19='stand']:not([disabled]):not(.on)", `${w} applied: a status`); await page.waitForTimeout(400);
    await page.keyboard.press("Escape"); await page.waitForTimeout(400);
    await typeFind(page, L, "a", w);
    const ap = await page.evaluate(() => {
      const row = [...document.querySelectorAll<HTMLElement>("[data-cl19='applied']")].find((e) => e.getBoundingClientRect().height > 0);
      const chips = row ? [...row.querySelectorAll<HTMLElement>("[data-cl19='applied-chip']")].map((c) => ({ k: c.dataset.k ?? "", t: (c.textContent ?? "").trim(), shown: c.getBoundingClientRect().width > 0 })) : [];
      const more = row?.querySelector<HTMLElement>("[data-cl19='applied-more']");
      const n = [...document.querySelectorAll<HTMLElement>("[data-cl19='filters-n']")].find((e) => e.getBoundingClientRect().height > 0);
      return { row: !!row, chips, more: more && more.getBoundingClientRect().width > 0 ? Number(more.dataset.n ?? "0") : 0, n: n ? Number(n.textContent) : null };
    });
    const search = ap.chips.filter((c) => /search|find/i.test(c.k) || /“a”|"a"/.test(c.t));
    L.check(`${w} applied: the row shows`, ap.row, `${ap.row}`);
    L.check(`${w} applied: one chip per filter and one for the search (3)`, ap.chips.length === 3 && search.length === 1, JSON.stringify(ap.chips));
    L.check(`${w} applied: every chip is shown or behind "+N more"`, ap.chips.filter((c) => !c.shown).length === ap.more, `${ap.chips.filter((c) => !c.shown).length} vs +${ap.more}`);
    L.check(`${w} applied: the chip's count excludes the search (2)`, ap.n === 2, `${ap.n}`);
    await click(page, L, "[data-cl19='applied-clear']", `${w} Clear all`); await page.waitForTimeout(700);
    const cl = await page.evaluate(() => ({
      row: [...document.querySelectorAll<HTMLElement>("[data-cl19='applied']")].some((e) => e.getBoundingClientRect().height > 0),
      search: [...document.querySelectorAll<HTMLInputElement>(".cl19-findw input")].find((e) => e.getBoundingClientRect().height > 0 || e.closest(".cl19-findw")!.getBoundingClientRect().height > 0)?.value ?? null,
      chipOn: [...document.querySelectorAll<HTMLElement>("[data-cl19='filters-chip']")].some((e) => e.getBoundingClientRect().height > 0 && e.hasAttribute("data-on")),
    }));
    L.check(`${w} Clear all: no applied row, no search, no filters`, !cl.row && cl.search === "" && !cl.chipOn, JSON.stringify(cl));
    L.check(`${w} Clear all: every row is back`, (await rowIds(page)).length === all.size, `${(await rowIds(page)).length} vs ${all.size}`);
  }
  L.done(40);
});

/* ───────────────────────── G · memory ───────────────────────── */
test("CL19-G1 · memory: grouping, sort and the pin survive a reload; filters, search and scroll survive the visit only", async ({ page, context }) => {
  test.setTimeout(400_000);
  const L = new Ledger("CL19-G1");
  await withGuide(async () => {
    for (const vp of SIZES) {
      const w = `@${vp.width}`;
      await open(page, vp, "CL19-G1");
      await groupBy(page, L, "status", w);
      await click(page, L, ".lt-labels.lth [data-lt-col='Date added']", `${w} sort by Date added`); await page.waitForTimeout(600);
      await setPin(page, L, true, `${w} pin`);
      const view = async (p: Page) => p.evaluate(() => {
        const vis = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].filter((e) => e.getBoundingClientRect().height > 0);
        const h = vis(".lt-labels.lth [data-lt-col][aria-pressed='true']")[0];
        const card = vis("[data-cl19='card']")[0], sc = card?.closest<HTMLElement>(".wpg-scroll");
        const inp = [...document.querySelectorAll<HTMLInputElement>(".cl19-findw input")].find((e) => e.closest(".cl19-findw")!.getBoundingClientRect().height > 0);
        return {
          group: (vis("[data-ltb='group-name']")[0]?.textContent ?? "").trim() || null,
          sort: h ? `${h.dataset.ltCol}${/↑/.test(h.textContent ?? "") ? " ↑" : " ↓"}` : null,
          pinned: vis("[data-cl19='pin']")[0]?.getAttribute("aria-pressed") === "true",
          filters: vis("[data-cl19='filters-chip']")[0]?.hasAttribute("data-on") ?? null,
          n: Number(vis("[data-cl19='filters-n']")[0]?.textContent ?? "0"),
          search: inp?.value ?? null, scroll: sc?.scrollTop ?? null, open: vis(".aglist [data-clv='row'][data-peek]").length,
        };
      });
      const v0 = await view(page);
      L.check(`${w} set: Status, Date added ↓, pinned (precondition)`, v0.group === "Status" && v0.sort === "Date added ↓" && v0.pinned, JSON.stringify(v0));
      await page.reload(); await expect(page.locator(LOADED_ROW16).first()).toBeVisible({ timeout: 30_000 }); await page.waitForTimeout(1200);
      const v1 = await view(page);
      L.check(`${w} reload: the grouping survives`, v1.group === "Status", `${v1.group}`);
      L.check(`${w} reload: the sort survives`, v1.sort === "Date added ↓", `${v1.sort}`);
      L.check(`${w} reload: the pin survives`, v1.pinned, `${v1.pinned}`);
      /* the visit: a filter, a search and a scroll */
      await click(page, L, "button.cl19-fil", `${w} open the menu`); await page.waitForTimeout(400);
      await click(page, L, "[data-cl19='quick'][data-qp='open']:not([disabled])", `${w} Open to submissions`); await page.waitForTimeout(400);
      await page.keyboard.press("Escape"); await page.waitForTimeout(400);
      await typeFind(page, L, "a", w);
      await page.mouse.move(5, 5);
      const at = await scrollTo(page, 420); await page.waitForTimeout(900);
      const v2 = await view(page);
      L.check(`${w} set: a filter, a search and a scroll (precondition)`, v2.n === 1 && v2.search === "a" && (at ?? 0) > 200, JSON.stringify({ ...v2, at }));
      await page.reload(); await expect(page.locator(LOADED_ROW16).first()).toBeVisible({ timeout: 30_000 }); await page.waitForTimeout(1500);
      const v3 = await view(page);
      L.check(`${w} reload in the visit: the filter survives`, v3.n === 1, `${v3.n}`);
      L.check(`${w} reload in the visit: the search survives`, v3.search === "a", `${v3.search}`);
      L.check(`${w} reload in the visit: the scroll survives ±40`, near((v3.scroll ?? NaN) - (v2.scroll ?? NaN), 0, 40), `${v2.scroll} → ${v3.scroll}`);
      /* a new visit: a new tab shares localStorage and starts its own sessionStorage */
      const p2 = await context.newPage();
      await openContacts16(p2, vp, { keep: true });
      await p2.waitForTimeout(800);
      const v4 = await view(p2);
      L.check(`${w} new visit: the grouping, sort and pin are kept`, v4.group === "Status" && v4.sort === "Date added ↓" && v4.pinned, JSON.stringify(v4));
      L.check(`${w} new visit: unfiltered`, !v4.filters && v4.n === 0, `${v4.filters} · ${v4.n}`);
      L.check(`${w} new visit: no search`, v4.search === "", `${v4.search}`);
      L.check(`${w} new visit: at the top`, near(v4.scroll, 0, 2), `${v4.scroll}`);
      L.check(`${w} new visit: every row closed`, v4.open === 0, `${v4.open}`);
      await p2.close();
      /* back to the defaults for the next size */
      await page.evaluate(() => { try { localStorage.removeItem("qh.cl.view"); sessionStorage.clear(); } catch { /* */ } });
    }
  });
  L.done(26);
});

/* ───────────────────────── H · one arrival ───────────────────────── */
test("CL19-H1 · arrival: after a regroup no row's text or box changes between the first painted frame and 1000ms later", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("CL19-H1");
  for (const vp of SIZES) {
    for (const key of ["status", "country"] as const) {
      const w = `@${vp.width} → ${key}`;
      await open(page, vp, "CL19-H1", { motion: true });
      await page.evaluate(() => {
        const snap = () => {
          const card = [...document.querySelectorAll<HTMLElement>("[data-cl19='card']")].find((e) => e.getBoundingClientRect().height > 0);
          const sc = card?.closest<HTMLElement>(".wpg-scroll");
          if (!card || !sc) return [];
          const top = sc.getBoundingClientRect().top, bot = top + sc.clientHeight;
          /* offsets are untouched by transform, so the arrival's own motion is not counted */
          const off = (e: HTMLElement) => { let y = 0; for (let n: HTMLElement | null = e; n && n !== card; n = n.offsetParent as HTMLElement | null) y += n.offsetTop; return y; };
          return [...card.querySelectorAll<HTMLElement>("[data-clv='row'][data-agent-card], [data-cl19='gband']")].filter((e) => { const b = e.getBoundingClientRect(); return b.height > 0 && b.bottom > top && b.top < bot; })
            .map((e) => ({ k: e.dataset.agentCard ?? `band:${e.dataset.gkey}`, y: off(e), h: e.offsetHeight, w: e.offsetWidth, t: e.innerText.replace(/\s+/g, " ").trim(), cols: [...e.children].map((c) => (c as HTMLElement).offsetWidth).join(",") }));
        };
        const w = window as unknown as { __h1: { first?: unknown; later?: unknown; arm: () => void } };
        w.__h1 = { arm: () => {
          let armed = true;
          /* the first mutation that brings rows or bands in, never the chip's own words changing */
          const brings = (n: Node) => n.nodeType === 1 && ((n as Element).matches("[data-clv='row'], [data-cl19='gband'], section") || !!(n as Element).querySelector("[data-clv='row'], [data-cl19='gband']"));
          const mo = new MutationObserver((ms) => {
            if (!armed || !ms.some((m) => [...m.addedNodes].some(brings))) return; armed = false; mo.disconnect();
            requestAnimationFrame(() => { w.__h1.first = snap(); setTimeout(() => { w.__h1.later = snap(); }, 1000); });
          });
          const card = [...document.querySelectorAll<HTMLElement>("[data-cl19='card']")].find((e) => e.getBoundingClientRect().height > 0)!;
          mo.observe(card, { subtree: true, childList: true });
        } };
      });
      if (!(await click(page, L, "button.cl19-grp", `${w} open the menu`))) continue;
      await page.waitForTimeout(400);
      await page.evaluate(() => (window as unknown as { __h1: { arm: () => void } }).__h1.arm());
      await click(page, L, `[data-opt="group:${key}"]`, `${w} regroup`);
      await page.waitForTimeout(1700);
      const r = await page.evaluate(() => (window as unknown as { __h1: { first?: { k: string }[]; later?: { k: string }[] } }).__h1);
      const first = (r.first ?? []) as { k: string; y: number; h: number; w: number; t: string; cols: string }[];
      const later = new Map(((r.later ?? []) as typeof first).map((x) => [x.k, x]));
      L.check(`${w} the first painted frame was caught, with rows and bands on screen`, first.length >= 5 && first.some((x) => x.k.startsWith("band:")), `${first.length}`);
      let diffs = 0;
      for (const a of first) {
        const b = later.get(a.k);
        const same = !!b && a.y === b.y && a.h === b.h && a.w === b.w && a.t === b.t && a.cols === b.cols;
        if (!same) { diffs += 1; if (diffs <= 6) L.check(`${w} ${a.k} is the same at the first frame and 1000ms later`, false, `${JSON.stringify(a)} → ${JSON.stringify(b ?? null)}`); }
      }
      L.check(`${w} nothing changed after the first painted frame`, first.length >= 5 && diffs === 0, `${diffs} of ${first.length} changed`);
    }
  }
  L.done(8);
});

/* ───────────────────────── I · the list's end ───────────────────────── */
test("CL19-I1 · end: no footer in either position; the last row ends on the card's content bottom; a short list's card still runs to the page's foot (22px short unpinned, v19.1 §F)", async ({ page }) => {
  test.setTimeout(400_000);
  const L = new Ledger("CL19-I1");
  const readEnd = (p: Page) => p.evaluate(() => {
    const card = [...document.querySelectorAll<HTMLElement>("[data-cl19='card']")].find((x) => x.getBoundingClientRect().height > 0);
    const sc = card?.closest<HTMLElement>(".wpg-scroll");
    if (!card || !sc) return null;
    const cs = getComputedStyle(card);
    const rows = [...card.querySelectorAll<HTMLElement>("[data-clv='row'][data-agent-card]")].filter((x) => x.getBoundingClientRect().height > 0);
    const foot = [...document.querySelectorAll<HTMLElement>(".aglist footer, .aglist .af-in, .aglist .clv-end, [data-cl19='card'] footer")].filter((e) => e.getBoundingClientRect().height > 0).length
      + [...card.querySelectorAll<HTMLElement>("*")].filter((e) => e.getBoundingClientRect().height > 0 && e.children.length === 0 && /That.s everyone/i.test(e.textContent ?? "")).length;
    const cb = card.getBoundingClientRect();
    return { rows: rows.length, last: rows[rows.length - 1]?.getBoundingClientRect().bottom ?? null,
      content: cb.bottom - parseFloat(cs.borderBottomWidth) - parseFloat(cs.paddingBottom), card: cb.bottom, page: sc.getBoundingClientRect().top + sc.clientHeight, foot };
  });
  await withGuide(async () => {
    for (const vp of SIZES) {
      for (const pos of ["unpinned", "pinned"] as const) {
        const w = `@${vp.width} ${pos}`;
        await open(page, vp, "CL19-I1");
        if (pos === "pinned") L.check(`${w} pinned (precondition)`, await setPin(page, L, true, `${w} pin`), "");
        await scrollTo(page, "end");
        const a = await readEnd(page);
        L.check(`${w} long list: rows (the population)`, (a?.rows ?? 0) > 20, `${a?.rows}`);
        L.check(`${w} no footer element`, a?.foot === 0, `${a?.foot}`);
        L.check(`${w} long list: the last row's bottom is the card's content bottom ±1`, near((a?.last ?? NaN) - (a?.content ?? NaN), 0, 1), `${a?.last?.toFixed(1)} vs ${a?.content.toFixed(1)}`);
        /* v19.1 §F re-points this: unpinned the card stops 22px above the page's foot; pinned it meets it, as v19 */
        const foot = pos === "unpinned" ? 22 : 0;
        L.check(`${w} long list: the card ends ${foot} ±1 above the page's foot`, near((a?.page ?? NaN) - (a?.card ?? NaN), foot, 1), `${a?.card.toFixed(1)} vs ${a?.page.toFixed(1)}`);
        /* a short list: one agent */
        const first = (await rowIds(page))[0];
        const name = await page.evaluate((id) => ([...document.querySelectorAll<HTMLElement>(`.aglist [data-agent-card="${id}"] .clv-rwn b`)].find((e) => e.getBoundingClientRect().height > 0)?.textContent ?? "").trim(), first);
        await scrollTo(page, 0);
        await typeFind(page, L, name, w);
        await scrollTo(page, "end");
        const b = await readEnd(page);
        L.check(`${w} short list: a few rows (the population)`, (b?.rows ?? 0) >= 1 && (b?.rows ?? 99) <= 3, `${b?.rows} for "${name}"`);
        L.check(`${w} short list: no footer element`, b?.foot === 0, `${b?.foot}`);
        L.check(`${w} short list: the card still ends ${foot} ±1 above the page's foot`, near((b?.page ?? NaN) - (b?.card ?? NaN), foot, 1), `${b?.card.toFixed(1)} vs ${b?.page.toFixed(1)}`);
        L.check(`${w} short list: the last row is inside the card`, (b?.last ?? Infinity) <= (b?.content ?? -Infinity) + 1, `${b?.last?.toFixed(1)} vs ${b?.content.toFixed(1)}`);
        if (pos === "pinned") await setPin(page, L, false, `${w} unpin`);
      }
    }
  });
  L.done(30);
});
