/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v20 — locks CL20 A1 to G2 (design-refs/contact-list-v20/contact-list-v20.html), on the rendered page at
 * 1512 × 900 and 1280 × 800 with the shell.
 *
 * Each lock is run against the build before the pack (`CL20_BASE=1`, ledger `base-<lock>.json`; the base is
 * `dev/…-qc1411-raam` d4f53c8a, `index-CU6ZOefw.js`), with its named mutation (`CL20_MUTATE=<lock>`, ledger
 * `mut-<lock>.json`), and then green. A page mutation is CSS or script applied in the page (MUTATIONS); a `src` mutation
 * (A1, B3, C1, C2, G1, G2 — named in the report) is a source edit made and undone in this pack's worktree, from a
 * path-derived backup, with `CL20_MUTATE` naming the ledger only.
 *
 * ⚠️ EVERY WORKSPACE PAGE STAYS MOUNTED: every read starts from the visible copy (box height > 0).
 * ⚠️ EVERY LOCK PROVES ITS POPULATION IS NON-ZERO BEFORE IT ASSERTS ANYTHING (a check over nothing passes).
 * ⚠️ E2 COMPARES WITH THE BASE BUILD'S OWN READINGS: `CL20_BASE=1` writes `e2-base.json` (the list after each choice in
 *    v19's menu); the green run reads it and chooses the same things in the strip.
 * ⚠️ FULL SCREEN TICKS THE GUIDE (todoPrefs.contacts.guide.done.pin): the cases that enter it record the guide's state,
 *    mark it seen with "pin" done, and put it back exactly in `finally`. G2 clears "pin" to watch it tick.
 */
import { expect, test, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { collection, getDocs } from "firebase/firestore";
import { openContacts16, LOADED_ROW16, MEMORY_KEYS, VIEW_KEYS } from "./cl16Lib";
import { harnessDb } from "./harnessDocs";

const DIR = "reports/contact-list-v20";
const MUT = process.env.CL20_MUTATE ?? "";
const BASE = process.env.CL20_BASE === "1";
const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
type VP = { width: number; height: number };
const near = (a: unknown, b: unknown, t: number) => typeof a === "number" && typeof b === "number" && Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= t;
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

/** one named break per lock, in the page. A1, B3, C1, C2, G1 and G2 are broken in `src` (the report names each). */
const MUTATIONS: Record<string, { css?: string; js?: string; init?: string }> = {
  "CL20-A2": { css: `.cl20-tr .cl20-fs { margin-left: auto !important; }` },
  "CL20-A3": { js: `(() => { document.addEventListener("click", (e) => { const v = e.target && e.target.closest && e.target.closest("[data-view]"); if (!v) return; setTimeout(() => { const x = [...document.querySelectorAll('[data-cl19="group-stop"]')].find((b) => b.getBoundingClientRect().height > 0); x && x.click(); }, 50); }, true); })()` },
  "CL20-B1": { css: `.cl20-grid { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)) !important; }` },
  "CL20-B2": { js: `(() => { document.addEventListener("click", (e) => { const a = e.target && e.target.closest && e.target.closest(".cl20-card .apc-add"); if (!a) return; const c = a.closest(".cl20-card"); setTimeout(() => c.dispatchEvent(new MouseEvent("click", { bubbles: true })), 0); }); })()` },
  "CL20-D1": { css: `.clv-group .cl19-card .cl19-gb.cl20-lg { border-top: 2px solid #2a3a52 !important; }` },
  "CL20-D2": { css: `.cl20-rh .cl20-rhr { margin-right: -22px !important; }` },
  "CL20-E1": { css: `.lpop.cl20-fs-strip[data-inset] { left: 0 !important; right: 0 !important; }` },
  /* installed before the page's own scripts (an init script): the app's escape stack listens on window in the capture
     phase and stops the key, so a break registered after it would never see Escape */
  "CL20-E3": { init: `(() => { window.addEventListener("keydown", (e) => { if (e.key !== "Escape") return; if (!document.querySelector("[data-cl20='filter-strip']")) return; const x = [...document.querySelectorAll("[data-cl20='full-tb']")].find((b) => b.getBoundingClientRect().height > 0); if (!x) return; e.stopImmediatePropagation(); e.preventDefault(); x.click(); }, true); })()` },
  /* the shipped rule's own selector, one ancestor stronger, putting the glyphs back to ink (a weaker selector loses to the
     rule and proves nothing — the first run of this mutation stayed green for exactly that reason) */
  "CL20-F1": { css: `html .cl19-head:not([data-pinned]) .cl19-jump button[data-cl19="jump-group"]:not([aria-current="true"]) .cl19-gm svg, html .cl19-head:not([data-pinned]) .cl19-jump button[data-cl19="jump-group"]:not([aria-current="true"]) .cl19-gm { color: #1c130f !important; }` },
  "CL20-F2": { css: `.apc .apc-band { background: #f5e2da !important; }` },
};
const mutate = async (page: Page, lock: string) => {
  const m = MUT === lock ? MUTATIONS[lock] : null;
  if (!m) return;
  if (m.css) await page.addStyleTag({ content: m.css });
  if (m.js) await page.evaluate(m.js);
  await page.waitForTimeout(200);
};
/** every open starts from the defaults (the list's memory cleared, as cl16Lib does on a tab's first load) */
const open = async (page: Page, vp: VP, lock: string) => {
  if (/^https?:/.test(page.url())) await page.evaluate(({ m, v }) => { try { for (const k of m) sessionStorage.removeItem(k); for (const k of v) localStorage.removeItem(k); } catch { /* private mode */ } }, { m: MEMORY_KEYS, v: VIEW_KEYS });
  const m = MUT === lock ? MUTATIONS[lock] : null;
  if (m?.init) await page.addInitScript(m.init);
  await openContacts16(page, vp);
  await mutate(page, lock);
};
const click = async (page: Page, L: Ledger, sel: string, where: string): Promise<boolean> => {
  const loc = page.locator(sel).filter({ visible: true }).first();
  if (!(await loc.count())) { L.check(`${where} — the control exists`, false, `no visible ${sel}`); return false; }
  await loc.click({ timeout: 8000 }).catch(() => undefined);
  return true;
};
const setScroll = (page: Page, y: number) => page.evaluate(async (top) => {
  const { sc } = (window as unknown as { __cl: () => { sc: HTMLElement } }).__cl();
  sc.style.scrollBehavior = "auto"; sc.scrollTop = top;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  await new Promise((r) => setTimeout(r, 120));
  return sc.scrollTop;
}, y);
const setView = async (page: Page, L: Ledger, v: "cards" | "list", where: string) => {
  const done = await page.evaluate((vv) => {
    const b = [...document.querySelectorAll<HTMLElement>(`[data-cl20='view-pill'] [data-view='${vv}'], [data-cl20='view-tb'] [data-view='${vv}']`)].find((e) => e.getBoundingClientRect().height > 0);
    b?.click(); return !!b;
  }, v);
  L.check(`${where} switch to ${v} — a switch exists`, done, "");
  await page.waitForTimeout(700);
};
const groupBy = async (page: Page, L: Ledger, key: string, where: string) => {
  await click(page, L, "button.cl19-grp", `${where} group menu`); await page.waitForTimeout(300);
  await click(page, L, `[data-opt="group:${key}"]`, `${where} group ${key}`); await page.waitForTimeout(800);
};
const pickYourMove = async (page: Page, L: Ledger, where: string) => {
  await click(page, L, "button.cl19-fil", `${where} filters`); await page.waitForTimeout(400);
  await click(page, L, "[data-cl19='quick'][data-qp='you']", `${where} Your move`); await page.waitForTimeout(700);
  await page.keyboard.press("Escape"); await page.waitForTimeout(400);
};
/** the visible list's agents in order (rows in List, cards in Cards) */
const ids = (page: Page, kind: "row" | "card") => page.evaluate((k) => {
  const g = (window as unknown as { __cl: () => { qa: (s: string) => HTMLElement[] } }).__cl();
  return g.qa(k === "row" ? "[data-clv='row'][data-agent-card]" : "[data-clv='card'][data-agent-card]").filter((e) => e.getBoundingClientRect().height > 0).map((e) => e.dataset.agentCard!);
}, kind);
const withGuide = async (fn: () => Promise<void>) => {
  const was = guideNow();
  try { guideSet("--seen"); guideSet("--done pin"); await fn(); } finally { guideRestore(was); }
};
const enterFull = async (page: Page, L: Ledger, where: string) => {
  await page.keyboard.press("f"); await page.waitForTimeout(1100);
  const on = await page.evaluate(() => !!document.querySelector(".aglist .clv-group[data-full]"));
  L.check(`${where} full screen is on (precondition)`, on, `${on}`);
};

test("CL20-A1 · the title: 'All N agents' from the data; 'v of N agents' with Your move on; Special Elite 30", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("CL20-A1");
  const { db, uid } = await harnessDb();
  const N = (await getDocs(collection(db, "users", uid, "agents"))).size;
  L.check("the account has agents (population)", N > 0, `${N}`);
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await open(page, vp, "CL20-A1");
    const r0 = await page.evaluate(() => {
      const t = [...document.querySelectorAll<HTMLElement>("[data-cl20='count']")].find((e) => e.getBoundingClientRect().height > 0);
      if (!t) return null;
      const cs = getComputedStyle(t);
      return { text: (t.textContent ?? "").trim(), font: cs.fontFamily, size: parseFloat(cs.fontSize) };
    });
    L.check(`${w} the count exists`, !!r0, JSON.stringify(r0));
    L.check(`${w} unfiltered: "All ${N} agents"`, r0?.text === `All ${N} agents`, `${r0?.text}`);
    L.check(`${w} Special Elite`, /Special Elite/.test(r0?.font ?? ""), `${r0?.font}`);
    L.check(`${w} 30px ±0.5`, near(r0?.size, 30, 0.5), `${r0?.size}`);
    await pickYourMove(page, L, w);
    const r1 = await page.evaluate(() => {
      const vis = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].filter((e) => e.getBoundingClientRect().height > 0);
      return {
        text: (vis("[data-cl20='count']")[0]?.textContent ?? "").trim(),
        rows: vis(".aglist [data-clv='row'][data-agent-card]").length,
        applied: Number(vis("[data-cl19='applied-count'] b")[0]?.textContent ?? "NaN"),
      };
    });
    L.check(`${w} Your move narrows the list (population)`, r1.rows > 0 && r1.rows < N, `${r1.rows}`);
    L.check(`${w} filtered: "${r1.rows} of ${N} agents"`, r1.text === `${r1.rows} of ${N} agents`, `${r1.text}`);
    L.check(`${w} the count equals the applied row's figure`, r1.applied === r1.rows, `${r1.applied} vs ${r1.rows}`);
  }
  L.done(15);
});

test("CL20-A2 · the row: the count on the toolbar's first control; pill and Full screen on its centre; Full screen 10 after the pill", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("CL20-A2");
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await open(page, vp, "CL20-A2");
    const r = await page.evaluate(() => {
      const vis = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].filter((e) => e.getBoundingClientRect().height > 0);
      const box = (e?: HTMLElement) => (e ? e.getBoundingClientRect() : null);
      const c = box(vis("[data-cl20='count']")[0]), p = box(vis("[data-cl20='view-pill']")[0]), f = box(vis("[data-cl20='full']")[0]);
      const first = box(vis(".aglist [data-cl19='toolbar'] [data-cl19='letter'], .aglist [data-cl19='toolbar'] [data-cl19='jump-group']")[0]);
      /* the count's ink, not its box: a range over its text */
      const t = vis("[data-cl20='count']")[0];
      const rg = document.createRange(); if (t) rg.selectNodeContents(t);
      const ink = t ? rg.getBoundingClientRect() : null;
      const mid = (b: DOMRect | null) => (b ? b.top + b.height / 2 : NaN);
      return { inkL: ink?.left ?? NaN, firstL: first?.left ?? NaN, cMid: mid(c), pMid: mid(p), fMid: mid(f), pR: p?.right ?? NaN, fL: f?.left ?? NaN, n: [c, p, f, first].filter(Boolean).length };
    });
    L.check(`${w} the four boxes exist (population)`, r.n === 4, `${r.n}`);
    L.check(`${w} the count's left is the toolbar's first control's ±1`, near(r.inkL, r.firstL, 1), `${r.inkL} vs ${r.firstL}`);
    L.check(`${w} the pill shares the count's centre ±1`, near(r.pMid, r.cMid, 1), `${r.pMid} vs ${r.cMid}`);
    L.check(`${w} Full screen shares the count's centre ±1`, near(r.fMid, r.cMid, 1), `${r.fMid} vs ${r.cMid}`);
    L.check(`${w} Full screen starts 10 after the pill ±1`, near(r.fL, r.pR + 10, 1), `${r.fL} vs ${r.pR + 10}`);
  }
  L.done(10);
});

test("CL20-A3 · the switch: aria-selected flips, the grid or rows render, and grouping, sort, filters and search are unchanged", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("CL20-A3");
  const state = (p: Page) => p.evaluate(() => {
    const vis = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].filter((e) => e.getBoundingClientRect().height > 0);
    const inp = [...document.querySelectorAll<HTMLInputElement>(".cl19-findw input")].find((e) => e.closest(".cl19-findw")!.getBoundingClientRect().height > 0);
    let sort: string | null = null;
    try { sort = JSON.stringify(JSON.parse(localStorage.getItem("qh.cl.view") ?? "{}")?.sort ?? null); } catch { sort = null; }
    return {
      group: (vis("[data-ltb='group-name']")[0]?.textContent ?? "").trim() || null,
      sort,
      filters: Number(vis("[data-cl19='filters-n']")[0]?.textContent ?? "0"),
      search: inp?.value ?? null,
      sel: vis("[data-cl20='view-pill'] [aria-selected='true']")[0]?.dataset.view ?? null,
      cards: vis(".aglist [data-clv='card']").length, rows: vis(".aglist [data-clv='row']").length,
    };
  });
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await open(page, vp, "CL20-A3");
    await groupBy(page, L, "status", w);
    await click(page, L, ".lt-labels.lth [data-lt-col='Date added']", `${w} sort by Date added`); await page.waitForTimeout(600);
    await pickYourMove(page, L, w);
    /* Find is a folded icon at 1440 and under: open it, then type */
    await page.locator(".aglist .cl19-find").filter({ visible: true }).first().click({ timeout: 5000 }).catch(() => undefined);
    await page.keyboard.type("a"); await page.waitForTimeout(700);
    await page.keyboard.press("Tab"); await page.waitForTimeout(200);
    await setScroll(page, 0);
    const s0 = await state(page);
    L.check(`${w} set: Status, a sort, one filter, a search, List (precondition)`, s0.group === "Status" && s0.filters === 1 && s0.search === "a" && s0.sel === "list" && s0.rows > 0, JSON.stringify(s0));
    await setView(page, L, "cards", w);
    await setScroll(page, 0);
    const s1 = await state(page);
    L.check(`${w} Cards: aria-selected is Cards`, s1.sel === "cards", `${s1.sel}`);
    L.check(`${w} Cards: the grid renders and the rows do not`, s1.cards > 0 && s1.rows === 0, `${s1.cards} cards, ${s1.rows} rows`);
    L.check(`${w} Cards: grouping, sort, filters and search unchanged`, s1.group === s0.group && s1.sort === s0.sort && s1.filters === s0.filters && s1.search === s0.search, JSON.stringify(s1));
    await setView(page, L, "list", w);
    await setScroll(page, 0);
    const s2 = await state(page);
    L.check(`${w} List: aria-selected is List; the rows render`, s2.sel === "list" && s2.rows > 0 && s2.cards === 0, JSON.stringify(s2));
    L.check(`${w} List: grouping, sort, filters and search unchanged`, s2.group === s0.group && s2.sort === s0.sort && s2.filters === s0.filters && s2.search === s0.search, JSON.stringify(s2));
  }
  L.done(14);
});

test("CL20-B1 · the grid: 3 across at 1512, 2 at 1280, never under 340; the cards' order is the list's, ungrouped, grouped and filtered", async ({ page }) => {
  test.setTimeout(400_000);
  const L = new Ledger("CL20-B1");
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await open(page, vp, "CL20-B1");
    const cmp = async (label: string) => {
      await setView(page, L, "list", `${w} ${label}`);
      const rows = await ids(page, "row");
      await setView(page, L, "cards", `${w} ${label}`);
      const cards = await ids(page, "card");
      L.check(`${w} ${label}: rows to compare (population)`, rows.length > 0, `${rows.length}`);
      L.check(`${w} ${label}: the cards' order is the rows' order`, JSON.stringify(cards) === JSON.stringify(rows), `cards ${cards.length} · rows ${rows.length} · first diff at ${cards.findIndex((c, i) => c !== rows[i])}`);
    };
    await cmp("ungrouped");
    const geo = await page.evaluate(() => {
      const grids = [...document.querySelectorAll<HTMLElement>(".aglist .cl20-grid")].filter((e) => e.getBoundingClientRect().height > 0);
      const g = grids[0];
      const cards = g ? [...g.querySelectorAll<HTMLElement>("[data-clv='card']")] : [];
      const tops = cards.slice(0, 6).map((c) => Math.round(c.getBoundingClientRect().top));
      const cols = tops.length ? tops.filter((t) => t === tops[0]).length : 0;
      return { cols, minW: Math.min(...cards.map((c) => c.getBoundingClientRect().width)), n: cards.length };
    });
    L.check(`${w} cards on screen (population)`, geo.n > 3, `${geo.n}`);
    L.check(`${w} ${vp.width === 1512 ? 3 : 2} across`, geo.cols === (vp.width === 1512 ? 3 : 2), `${geo.cols}`);
    L.check(`${w} every card ≥ 340 wide`, geo.minW >= 340, `${geo.minW}`);
    await setView(page, L, "list", w);
    await groupBy(page, L, "status", w);
    await cmp("grouped by Status");
    await setView(page, L, "list", w);
    await pickYourMove(page, L, w);
    await cmp("grouped and filtered");
  }
  L.done(30);
});

test("CL20-B2 · a card opens the same panel as its row; a card's '+ Add' opens the editor at that field, never the card's own open", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("CL20-B2");
  const panel = (p: Page) => p.evaluate(() => {
    const el = [...document.querySelectorAll<HTMLElement>("[data-ap='panel']")].find((e) => e.getBoundingClientRect().height > 0);
    return el ? { id: el.dataset.apId ?? null, acting: el.dataset.apActing ?? null } : null;
  });
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await open(page, vp, "CL20-B2");
    const target = (await ids(page, "row"))[0];
    L.check(`${w} a first agent (population)`, !!target, `${target}`);
    await page.locator(`.aglist [data-clv='row'][data-agent-card='${target}'] .clv-rwn b`).filter({ visible: true }).first().click();
    await page.waitForTimeout(900);
    const fromRow = await panel(page);
    await page.keyboard.press("Escape"); await page.waitForTimeout(700);
    await setView(page, L, "cards", w);
    await page.locator(`.aglist [data-clv='card'][data-agent-card='${target}'] .apc-nm`).filter({ visible: true }).first().click();
    await page.waitForTimeout(900);
    const fromCard = await panel(page);
    L.check(`${w} the row opens the panel`, fromRow?.id === target, JSON.stringify(fromRow));
    L.check(`${w} the card opens the same panel (same agent)`, fromCard?.id === fromRow?.id && fromCard?.acting == null, JSON.stringify(fromCard));
    await page.keyboard.press("Escape"); await page.waitForTimeout(700);
    /* a card with a "+ Add" (any): its add opens the editor on that agent; the card's own open does not also fire */
    const addCard = await page.evaluate(() => {
      const c = [...document.querySelectorAll<HTMLElement>(".aglist .cl20-card")].find((e) => e.getBoundingClientRect().height > 0 && e.querySelector(".apc-add"));
      return c ? { id: c.dataset.agentCard!, k: c.querySelector<HTMLElement>(".apc-add")!.dataset.k ?? null } : null;
    });
    L.check(`${w} a card with a '+ Add' (population)`, !!addCard, JSON.stringify(addCard));
    if (addCard) {
      await page.locator(`.aglist .cl20-card[data-agent-card='${addCard.id}'] .apc-add`).filter({ visible: true }).first().click();
      await page.waitForTimeout(1100);
      const afterAdd = await panel(page);
      L.check(`${w} '+ Add their ${addCard.k}' opens the editor (not the card's open)`, afterAdd?.id === addCard.id && afterAdd?.acting === "edit", JSON.stringify(afterAdd));
      for (let i = 0; i < 3; i += 1) { await page.keyboard.press("Escape"); await page.waitForTimeout(400); }
    }
  }
  L.done(12);
});

test("CL20-B3 · Cards: a letter lands the first card of that surname letter under the sticky stack; the current letter follows", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("CL20-B3");
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await open(page, vp, "CL20-B3");
    await setView(page, L, "cards", w);
    /* M, else the latest letter that has agents (so the jump has somewhere to travel) */
    const letter = await page.evaluate(() => {
      const b = [...document.querySelectorAll<HTMLElement>(".aglist [data-cl19='letter']:not(:disabled)")].filter((e) => e.getBoundingClientRect().height > 0);
      return (b.find((e) => e.dataset.l === "M") ?? b[b.length - 2])?.dataset.l ?? null;
    });
    L.check(`${w} a letter with agents (population)`, !!letter, `${letter}`);
    await click(page, L, `.aglist [data-cl19='letter'][data-l='${letter}']`, `${w} letter ${letter}`);
    await page.waitForTimeout(1600);
    const r = await page.evaluate((Lt) => {
      const vis = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].filter((e) => e.getBoundingClientRect().height > 0);
      const first = vis(`.aglist [data-clv='card'][data-initial='${Lt}']`)[0];
      const tb = vis(".aglist [data-cl19='toolbar']")[0];
      const cur = vis(".aglist [data-cl19='letter'][aria-current='true']")[0]?.dataset.l ?? null;
      return { top: first?.getBoundingClientRect().top ?? NaN, line: tb?.getBoundingClientRect().bottom ?? NaN, cur };
    }, letter);
    L.check(`${w} the first ${letter} card's top is 2px or less under the stack`, near(r.top, r.line, 2), `${r.top} vs ${r.line}`);
    L.check(`${w} the current letter is ${letter}`, r.cur === letter, `${r.cur}`);
  }
  L.done(6);
});

test("CL20-C1 · toolbar: no pin, switch or full screen while the title row shows; both once it has scrolled away and in full screen; one line", async ({ page }) => {
  test.setTimeout(400_000);
  const L = new Ledger("CL20-C1");
  const tb = (p: Page) => p.evaluate(() => {
    const t = [...document.querySelectorAll<HTMLElement>(".aglist [data-cl19='toolbar']")].find((e) => e.getBoundingClientRect().height > 0);
    if (!t) return null;
    const fs = t.querySelector<HTMLElement>("[data-cl20='full-tb']");
    return {
      h: t.getBoundingClientRect().height, over: t.scrollWidth - t.clientWidth,
      pin: t.querySelectorAll("[data-cl19='pin'], [data-pin-list], .cl19-pin").length,
      sw: t.querySelectorAll("[data-cl20='view-tb'] [role='tab']").length,
      fs: fs?.getAttribute("aria-label") ?? null,
    };
  });
  await withGuide(async () => {
    for (const vp of SIZES) for (const grouped of [false, true]) {
      const w = `@${vp.width}${grouped ? " grouped by Status" : ""}`;
      await open(page, vp, "CL20-C1");
      if (grouped) { await groupBy(page, L, "status", w); await setScroll(page, 0); }
      const a = await tb(page);
      L.check(`${w} top: the toolbar exists (population)`, !!a, JSON.stringify(a));
      L.check(`${w} top: no pin, switch or full screen in the toolbar`, a?.pin === 0 && a?.sw === 0, JSON.stringify(a));
      L.check(`${w} top: one line (52 ±1)`, near(a?.h, 52, 1) && (a?.over ?? 9) <= 1, JSON.stringify(a));
      await setScroll(page, 1400);
      const b = await tb(page);
      L.check(`${w} scrolled 1400: the switch and "Full screen" are in the toolbar`, b?.sw === 2 && b?.fs === "Full screen", JSON.stringify(b));
      L.check(`${w} scrolled 1400: one line (52 ±1)`, near(b?.h, 52, 1) && (b?.over ?? 9) <= 1, JSON.stringify(b));
      await setScroll(page, 0);
      await enterFull(page, L, w);
      const c = await tb(page);
      L.check(`${w} full screen: "Exit full screen" and the switch`, c?.sw === 2 && c?.fs === "Exit full screen", JSON.stringify(c));
      L.check(`${w} full screen: one line (52 ±1)`, near(c?.h, 52, 1) && (c?.over ?? 9) <= 1, JSON.stringify(c));
      await page.keyboard.press("f"); await page.waitForTimeout(900);
    }
  });
  L.done(28);
});

test("CL20-C2 · one state: the toolbar's switch updates the title row's pill, and the pill updates the toolbar's", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("CL20-C2");
  const sel = (p: Page, which: string) => p.evaluate((wh) => [...document.querySelectorAll<HTMLElement>(`[data-cl20='${wh}'] [aria-selected='true']`)].find((e) => e.closest(".aglist"))?.dataset.view ?? null, which);
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await open(page, vp, "CL20-C2");
    await setScroll(page, 1400);
    const tbHere = await page.locator("[data-cl20='view-tb'] [data-view='cards']").filter({ visible: true }).count();
    L.check(`${w} the toolbar's switch shows once scrolled (precondition)`, tbHere > 0, `${tbHere}`);
    await click(page, L, "[data-cl20='view-tb'] [data-view='cards']", `${w} toolbar Cards`); await page.waitForTimeout(700);
    await setScroll(page, 0);
    L.check(`${w} the title row's pill now reads Cards`, (await sel(page, "view-pill")) === "cards", `${await sel(page, "view-pill")}`);
    await click(page, L, "[data-cl20='view-pill'] [data-view='list']", `${w} pill List`); await page.waitForTimeout(700);
    await setScroll(page, 1400);
    L.check(`${w} the toolbar's switch now reads List`, (await sel(page, "view-tb")) === "list", `${await sel(page, "view-tb")}`);
  }
  L.done(6);
});

test("CL20-D1 · List grouped by Status: the cream ledger — #f4f0e9, 54 tall, no rules, glyph on the discs, label on the names", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("CL20-D1");
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await open(page, vp, "CL20-D1");
    await groupBy(page, L, "status", w);
    const hs = await page.evaluate(() => {
      const secs = [...document.querySelectorAll<HTMLElement>(".aglist [data-cl19='group-section']")].filter((e) => e.getBoundingClientRect().height > 0);
      return secs.slice(0, 5).map((s) => {
        const h = s.querySelector<HTMLElement>("[data-clv='band']")!;
        const row = s.querySelector<HTMLElement>("[data-clv='row']");
        const cs = getComputedStyle(h);
        const gm = h.querySelector<HTMLElement>(".cl19-gm")?.getBoundingClientRect();
        const disc = row?.querySelector<HTMLElement>(".clv-ini")?.getBoundingClientRect();
        const lab = h.querySelector<HTMLElement>(".cl19-gbl")!;
        const rg = document.createRange(); rg.selectNodeContents(lab);
        const nm = row?.querySelector<HTMLElement>(".clv-rwn b");
        const rn = document.createRange(); if (nm) rn.selectNodeContents(nm);
        return {
          k: h.dataset.gkey, bg: cs.backgroundColor, h: h.getBoundingClientRect().height,
          bt: parseFloat(cs.borderTopWidth), bb: parseFloat(cs.borderBottomWidth), sh: cs.boxShadow,
          gm: gm ? gm.left + gm.width / 2 : NaN, disc: disc ? disc.left + disc.width / 2 : NaN,
          lab: rg.getBoundingClientRect().left, nm: nm ? rn.getBoundingClientRect().left : NaN,
        };
      });
    });
    L.check(`${w} headings to measure (population)`, hs.length >= 3, `${hs.length}`);
    for (const x of hs) {
      L.check(`${w} ${x.k}: background rgb(244,240,233)`, x.bg === "rgb(244, 240, 233)", x.bg);
      L.check(`${w} ${x.k}: 54 ±1 tall`, near(x.h, 54, 1), `${x.h}`);
      L.check(`${w} ${x.k}: no top or bottom border, no shadow`, x.bt === 0 && x.bb === 0 && x.sh === "none", `${x.bt}/${x.bb}/${x.sh}`);
      L.check(`${w} ${x.k}: the glyph's centre is the disc column's ±1`, near(x.gm, x.disc, 1), `${x.gm} vs ${x.disc}`);
      L.check(`${w} ${x.k}: the label's left is the name's ±1`, near(x.lab, x.nm, 1), `${x.lab} vs ${x.nm}`);
    }
  }
  L.done(20);
});

test("CL20-D2 · Cards grouped by Status: the ruled heading — Special Elite 21, the hairline to the grid's edge, left on the cards", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("CL20-D2");
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await open(page, vp, "CL20-D2");
    await groupBy(page, L, "status", w);
    await setView(page, L, "cards", w);
    await setScroll(page, 0);
    const hs = await page.evaluate(() => {
      const secs = [...document.querySelectorAll<HTMLElement>(".aglist .cl20-gsec")].filter((e) => e.getBoundingClientRect().height > 0);
      return secs.slice(0, 4).map((s) => {
        const h = s.querySelector<HTMLElement>("[data-cl20='ruled']")!;
        const lab = h.querySelector<HTMLElement>("[data-cl20='ruled-label']")!;
        const rule = h.querySelector<HTMLElement>("[data-cl20='ruled-rule']")?.getBoundingClientRect();
        const grid = s.querySelector<HTMLElement>(".cl20-grid")!;
        const card = grid.querySelector<HTMLElement>("[data-clv='card']")?.getBoundingClientRect();
        const gcs = getComputedStyle(grid), lcs = getComputedStyle(lab);
        const g = grid.getBoundingClientRect();
        return { k: h.dataset.gkey, font: lcs.fontFamily, size: parseFloat(lcs.fontSize), ruleR: rule?.right ?? NaN,
          gridR: g.right - (parseFloat(gcs.paddingRight) || 0), hL: h.getBoundingClientRect().left, cardL: card?.left ?? NaN, ruleH: rule?.height ?? NaN };
      });
    });
    L.check(`${w} ruled headings to measure (population)`, hs.length >= 2, `${hs.length}`);
    for (const x of hs) {
      L.check(`${w} ${x.k}: the label is Special Elite 21`, /Special Elite/.test(x.font) && near(x.size, 21, 0.5), `${x.font} ${x.size}`);
      L.check(`${w} ${x.k}: the hairline ends within 2px of the grid's content edge`, near(x.ruleR, x.gridR, 2) && x.ruleH > 0, `${x.ruleR} vs ${x.gridR}`);
      L.check(`${w} ${x.k}: the heading's left is the first card's ±1`, near(x.hL, x.cardL, 1), `${x.hL} vs ${x.cardL}`);
    }
  }
  L.done(10);
});

test("CL20-E1 · the strip: the card's width under the toolbar; in full screen inset from the first control to the last; ≤ 300 tall", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("CL20-E1");
  const read = (p: Page) => p.evaluate(() => {
    const vis = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].filter((e) => e.getBoundingClientRect().height > 0);
    const s = vis("[data-cl20='filter-strip']")[0]?.getBoundingClientRect();
    const tbEl = vis(".aglist [data-cl19='toolbar']")[0];
    const tb = tbEl?.getBoundingClientRect();
    const card = vis(".aglist [data-cl19='card']")[0]?.getBoundingClientRect();
    const first = tbEl ? [...tbEl.querySelectorAll<HTMLElement>("[data-cl19='letter'], [data-cl19='jump-group']")].filter((e) => e.offsetWidth > 0)[0]?.getBoundingClientRect() : undefined;
    const tools = tbEl ? [...tbEl.querySelectorAll<HTMLElement>("[data-cl19='tools'] > *")].filter((e) => e.offsetWidth > 0) : [];
    const last = tools[tools.length - 1]?.getBoundingClientRect();
    return s ? { l: s.left, r: s.right, t: s.top, h: s.height, tbB: tb?.bottom ?? NaN, cardL: card?.left ?? NaN, cardR: card?.right ?? NaN, firstL: first?.left ?? NaN, lastR: last?.right ?? NaN } : null;
  });
  await withGuide(async () => {
    for (const vp of SIZES) {
      const w = `@${vp.width}`;
      await open(page, vp, "CL20-E1");
      await click(page, L, "button.cl19-fil", `${w} filters`); await page.waitForTimeout(500);
      const a = await read(page);
      L.check(`${w} the strip opens (population)`, !!a, JSON.stringify(a));
      L.check(`${w} unpinned: left and right are the card's ±1`, near(a?.l, a?.cardL, 1) && near(a?.r, a?.cardR, 1), JSON.stringify(a));
      L.check(`${w} unpinned: its top is the toolbar's bottom ±1`, near(a?.t, a?.tbB, 1), JSON.stringify(a));
      L.check(`${w} unpinned: ≤ 300 tall`, (a?.h ?? 999) <= 300, `${a?.h}`);
      await page.keyboard.press("Escape"); await page.waitForTimeout(400);
      await enterFull(page, L, w);
      await click(page, L, "button.cl19-fil", `${w} full: filters`); await page.waitForTimeout(500);
      const b = await read(page);
      L.check(`${w} full screen: the strip opens (population)`, !!b, JSON.stringify(b));
      L.check(`${w} full screen: left is the toolbar's first visible control ±1`, near(b?.l, b?.firstL, 1), JSON.stringify(b));
      L.check(`${w} full screen: right is the toolbar's last control ±1`, near(b?.r, b?.lastR, 1), JSON.stringify(b));
      L.check(`${w} full screen: ≤ 300 tall`, (b?.h ?? 999) <= 300, `${b?.h}`);
      await page.keyboard.press("Escape"); await page.waitForTimeout(300);
      await page.keyboard.press("f"); await page.waitForTimeout(900);
    }
  });
  L.done(18);
});

/** E2's choices: one per kind, and two across sections (the AND between sections) */
type Choice = { key: string; sel: string[] };
const E2_CHOICES = (genre: string): Choice[] => [
  { key: "quick:you", sel: ["[data-cl19='quick'][data-qp='you']"] },
  { key: "quick:ready", sel: ["[data-cl19='quick'][data-qp='ready']"] },
  { key: "quick:wait", sel: ["[data-cl19='quick'][data-qp='wait']"] },
  { key: "quick:open", sel: ["[data-cl19='quick'][data-qp='open']"] },
  { key: "status:queried", sel: ["[data-cl19='stand'][data-k='queried']"] },
  { key: "open:open", sel: ["[data-opt='open:open']"] },
  { key: "always", sel: ["[data-cl19='toggle'][data-k='always']"] },
  { key: `genre:${genre}`, sel: [`[data-cl19='genre'][data-k='${genre}']`] },
  { key: `status:none+open:open`, sel: ["[data-cl19='stand'][data-k='none']", "[data-opt='open:open']"] },
  { key: `genre:${genre}+status:none`, sel: [`[data-cl19='genre'][data-k='${genre}']`, "[data-cl19='stand'][data-k='none']"] },
];
test("CL20-E2 · the same logic: each choice gives the list v19's menu gave; zero-count choices are disabled", async ({ page }) => {
  test.setTimeout(600_000);
  const L = new Ledger("CL20-E2");
  const file = `${DIR}/ledger/e2-base.json`;
  const vp = SIZES[0];
  await open(page, vp, "CL20-E2");
  const base: { genre: string; lists: Record<string, string[]> } | null = BASE ? null : existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
  if (!BASE) L.check("the base build's readings exist (precondition)", !!base, file);
  /* the genre: the base's, or (recording) the first genre chip the menu offers */
  let genre = base?.genre ?? "";
  if (!genre) {
    await click(page, L, "button.cl19-fil", "genre: filters"); await page.waitForTimeout(500);
    genre = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-cl19='genre']")].find((e) => e.getBoundingClientRect().height > 0 && !(e as HTMLButtonElement).disabled)?.dataset.k ?? "");
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  }
  L.check("a genre to choose (population)", !!genre, genre);
  const lists: Record<string, string[]> = {};
  const choices = E2_CHOICES(genre);
  for (const [ci, c] of choices.entries()) {
    await open(page, vp, "CL20-E2");
    await click(page, L, "button.cl19-fil", `${c.key}: filters`); await page.waitForTimeout(500);
    if (ci === 0) {
      /* zero is disabled: every choice reading 0 that is not on is disabled */
      const z = await page.evaluate(() => {
        const opts = [...document.querySelectorAll<HTMLButtonElement>("[data-cl19='filter-menu'] [data-opt][data-n]")].filter((e) => e.getBoundingClientRect().height > 0);
        const zero = opts.filter((e) => e.dataset.n === "0" && e.getAttribute("aria-pressed") !== "true" && e.getAttribute("aria-checked") !== "true");
        return { n: opts.length, zero: zero.length, bad: zero.filter((e) => !e.disabled).map((e) => e.dataset.opt) };
      });
      L.check("choices with counts (population)", z.n > 5, `${z.n}`);
      L.check("every zero-count choice is disabled", z.bad.length === 0, `${z.zero} zero · enabled: ${z.bad.join(",")}`);
    }
    for (const s of c.sel) { await click(page, L, s, `${c.key}: ${s}`); await page.waitForTimeout(600); }
    await page.keyboard.press("Escape"); await page.waitForTimeout(500);
    lists[c.key] = await ids(page, "row");
    if (BASE) continue;
    const want = base?.lists[c.key];
    L.check(`${c.key}: a base reading (population)`, Array.isArray(want), `${want?.length}`);
    L.check(`${c.key}: the list equals v19's menu's (${want?.length ?? "?"})`, JSON.stringify(lists[c.key]) === JSON.stringify(want), `now ${lists[c.key].length}`);
  }
  if (BASE) { mkdirSync(`${DIR}/ledger`, { recursive: true }); writeFileSync(file, JSON.stringify({ genre, lists }, null, 1)); L.check("the base readings were written", true, file); }
  L.done(BASE ? 5 : 24);
});

test("CL20-E3 · keys: Esc closes the strip and focus is on Filters; the list stays filtered; a second Esc leaves full screen", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("CL20-E3");
  await withGuide(async () => {
    for (const vp of SIZES) {
      const w = `@${vp.width}`;
      await open(page, vp, "CL20-E3");
      await enterFull(page, L, w);
      await click(page, L, "button.cl19-fil", `${w} filters`); await page.waitForTimeout(500);
      await click(page, L, "[data-cl19='quick'][data-qp='you']", `${w} Your move`); await page.waitForTimeout(700);
      const before = await page.evaluate(() => ({ strip: !!document.querySelector("[data-cl20='filter-strip']"), n: Number([...document.querySelectorAll<HTMLElement>("[data-cl19='applied-count'] b")].find((e) => e.getBoundingClientRect().height > 0)?.textContent ?? "NaN") }));
      L.check(`${w} the strip is open with a filter on (precondition)`, before.strip && before.n > 0, JSON.stringify(before));
      await page.keyboard.press("Escape"); await page.waitForTimeout(500);
      const a = await page.evaluate(() => ({
        strip: !!document.querySelector("[data-cl20='filter-strip']"),
        focus: !!document.activeElement?.matches("button.cl19-fil"),
        full: !!document.querySelector(".aglist .clv-group[data-full]"),
        n: Number([...document.querySelectorAll<HTMLElement>("[data-cl19='applied-count'] b")].find((e) => e.getBoundingClientRect().height > 0)?.textContent ?? "NaN"),
      }));
      L.check(`${w} Esc closes the strip`, !a.strip, JSON.stringify(a));
      L.check(`${w} focus is on the Filters chip`, a.focus, JSON.stringify(a));
      L.check(`${w} the list stays filtered and in full screen`, a.n === before.n && a.full, JSON.stringify(a));
      await page.keyboard.press("Escape"); await page.waitForTimeout(900);
      const b = await page.evaluate(() => !!document.querySelector(".aglist .clv-group[data-full]"));
      L.check(`${w} a second Esc leaves full screen`, !b, `${b}`);
    }
  });
  L.done(12);
});

test("CL20-F1 · the navy toolbar's jump row: every non-current glyph is cream", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("CL20-F1");
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await open(page, vp, "CL20-F1");
    await groupBy(page, L, "status", w);
    const cs = await page.evaluate(() => {
      const t = [...document.querySelectorAll<HTMLElement>(".aglist [data-cl19='jump']")].find((e) => e.getBoundingClientRect().height > 0);
      return t ? [...t.querySelectorAll<HTMLElement>("button[data-cl19='jump-group']:not([aria-current='true'])")].filter((b) => b.offsetWidth > 0)
        .map((b) => { const s = b.querySelector(".cl19-gm svg, .cl19-gm"); return s ? getComputedStyle(s).color : "none"; }) : [];
    });
    L.check(`${w} non-current glyphs to measure (population)`, cs.length >= 3, `${cs.length}`);
    L.check(`${w} every one is rgb(244,238,229)`, cs.length > 0 && cs.every((c) => c === "rgb(244, 238, 229)"), cs.join(" · "));
  }
  L.done(4);
});

test("CL20-F2 · Cards: a your-move band is the app's pink with rust words; a waiting card's and the panel's are unchanged", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("CL20-F2");
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await open(page, vp, "CL20-F2");
    await setView(page, L, "cards", w);
    const r = await page.evaluate(() => {
      const band = (c: HTMLElement | undefined) => {
        const b = c?.querySelector<HTMLElement>(".apc-band");
        return b ? { bg: getComputedStyle(b).backgroundColor, chip: getComputedStyle(b.querySelector(".apc-st")!).color } : null;
      };
      const cards = [...document.querySelectorAll<HTMLElement>(".aglist .cl20-card")];
      return { you: band(cards.find((c) => c.dataset.stand === "you")), wait: band(cards.find((c) => c.dataset.stand === "agent")), n: cards.length };
    });
    L.check(`${w} a your-move card and a waiting card (population)`, !!r.you && !!r.wait, JSON.stringify(r));
    L.check(`${w} your move: band rgb(245,226,218)`, r.you?.bg === "rgb(245, 226, 218)", `${r.you?.bg}`);
    L.check(`${w} your move: chip text rgb(138,64,48)`, r.you?.chip === "rgb(138, 64, 48)", `${r.you?.chip}`);
    L.check(`${w} waiting: band unchanged (slate rgb(62,81,112))`, r.wait?.bg === "rgb(62, 81, 112)", `${r.wait?.bg}`);
    const you = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".aglist .cl20-card")].find((c) => c.dataset.stand === "you" && c.getBoundingClientRect().height > 0)?.dataset.agentCard ?? null);
    if (you) {
      await page.locator(`.aglist .cl20-card[data-agent-card='${you}'] .apc-nm`).first().click(); await page.waitForTimeout(900);
      const p = await page.evaluate(() => { const b = [...document.querySelectorAll<HTMLElement>("[data-ap='panel'] .apc-band")].find((e) => e.getBoundingClientRect().height > 0); return b ? getComputedStyle(b).backgroundColor : null; });
      L.check(`${w} the agent panel's band is unchanged (slate)`, p === "rgb(62, 81, 112)", `${p}`);
      await page.keyboard.press("Escape"); await page.waitForTimeout(500);
    } else L.check(`${w} a your-move card on screen to open`, false, "none");
  }
  L.done(10);
});

test("CL20-G1 · memory: Cards survives a reload with no list flash; a new device opens in List", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("CL20-G1");
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await open(page, vp, "CL20-G1");
    await setView(page, L, "cards", w);
    /* watch the reload from its first frame: did a list row ever paint inside the Contact list? */
    await page.addInitScript(() => {
      (window as unknown as { __rows: number }).__rows = 0;
      const look = () => {
        const g = document.querySelector(".aglist .clv-group");
        if (g && [...g.querySelectorAll<HTMLElement>(".clv-row")].some((r) => r.getBoundingClientRect().height > 0)) (window as unknown as { __rows: number }).__rows += 1;
        requestAnimationFrame(look);
      };
      requestAnimationFrame(look);
    });
    await page.reload();
    await expect(page.locator(".clv-group:not([data-loading]) .cl20-card").first()).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(800);
    const r = await page.evaluate(() => ({ rows: (window as unknown as { __rows: number }).__rows, cards: document.querySelectorAll(".aglist .cl20-card").length,
      sel: [...document.querySelectorAll<HTMLElement>("[data-cl20='view-pill'] [aria-selected='true']")].find((e) => e.getBoundingClientRect().height > 0)?.dataset.view ?? null }));
    L.check(`${w} after the reload the grid is drawn (population)`, r.cards > 0, `${r.cards}`);
    L.check(`${w} the pill reads Cards`, r.sel === "cards", `${r.sel}`);
    L.check(`${w} no list row painted in any frame of the reload`, r.rows === 0, `${r.rows} frames with rows`);
    /* a new device: the list's memory cleared (the view in localStorage, the visit in sessionStorage), then a reload */
    await page.evaluate(({ m }) => { try { localStorage.removeItem("qh.cl.view"); for (const k of m) sessionStorage.removeItem(k); } catch { /* */ } }, { m: MEMORY_KEYS });
    await page.reload();
    await expect(page.locator(LOADED_ROW16).first()).toBeVisible({ timeout: 30_000 });
    const sel2 = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-cl20='view-pill'] [aria-selected='true']")].find((e) => e.getBoundingClientRect().height > 0)?.dataset.view ?? null);
    L.check(`${w} a new device (cleared storage) opens in List`, sel2 === "list", `${sel2}`);
    await page.evaluate(() => { try { localStorage.removeItem("qh.cl.view"); } catch { /* */ } });
  }
  L.done(8);
});

test("CL20-G2 · words: nothing on the Contact list says Pin or Unpin; the guide's item is 'Go full screen' and ticks when F enters full screen", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("CL20-G2");
  const sweep = (p: Page) => p.evaluate(() => {
    const re = /\b(Pin|Unpin)\b/;
    const roots = [...document.querySelectorAll<HTMLElement>(".aglist, [data-pck], .pck-pop, [role='dialog']")];
    const out: string[] = [];
    let seen = 0;
    for (const root of roots) for (const e of [root, ...root.querySelectorAll<HTMLElement>("*")]) {
      if (!e.getClientRects().length) continue;
      seen += 1;
      const own = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent ?? "").join("");
      for (const v of [own, e.getAttribute("aria-label") ?? "", e.getAttribute("title") ?? ""]) if (re.test(v)) out.push(`${e.tagName}.${e.className}: ${v.slice(0, 60)}`);
    }
    return { seen, out };
  });
  const was = guideNow();
  try {
    guideSet("--seen");
    sh(`node tests/e2e/guideFlags.mjs --restore '${JSON.stringify({ ...(JSON.parse(was) ?? {}), seen: true, hidden: false, done: { ...((JSON.parse(was) ?? {}).done ?? {}), pin: false } })}'`);
    for (const vp of SIZES) {
      const w = `@${vp.width}`;
      await open(page, vp, "CL20-G2");
      const a = await sweep(page);
      L.check(`${w} elements swept (population)`, a.seen > 50, `${a.seen}`);
      L.check(`${w} unpinned: no Pin / Unpin`, a.out.length === 0, a.out.join(" | "));
      await click(page, L, "[data-pck='pill']", `${w} the guide`); await page.waitForTimeout(700);
      const item = await page.evaluate(() => document.body.innerText.includes("Go full screen"));
      L.check(`${w} the guide's item reads "Go full screen"`, item, `${item}`);
      const b = await sweep(page);
      L.check(`${w} guide open: no Pin / Unpin`, b.out.length === 0, b.out.join(" | "));
      await page.keyboard.press("Escape"); await page.waitForTimeout(500);
      await setScroll(page, 1400);
      const c = await sweep(page);
      L.check(`${w} scrolled: no Pin / Unpin`, c.out.length === 0, c.out.join(" | "));
      await setScroll(page, 0);
      await enterFull(page, L, w);
      const d = await sweep(page);
      L.check(`${w} full screen: no Pin / Unpin`, d.out.length === 0, d.out.join(" | "));
      await page.waitForTimeout(1500);
      const flags = JSON.parse(guideNow() || "null");
      L.check(`${w} F ticked the guide's item`, flags?.done?.pin === true, JSON.stringify(flags?.done));
      await page.keyboard.press("f"); await page.waitForTimeout(900);
      sh(`node tests/e2e/guideFlags.mjs --restore '${JSON.stringify({ ...(flags ?? {}), done: { ...(flags?.done ?? {}), pin: false } })}'`);
    }
  } finally { guideRestore(was); }
  L.done(14);
});
