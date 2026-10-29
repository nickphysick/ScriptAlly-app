/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v12 — locks L1–L15 on the rendered page (design-refs/todo-list-v12/todo-list-v12.html), at 1512 × 900 and
 * 1280 × 800 (L1 also at 1920) with the shell. Every reading starts from the one visible v5 root (`window.__td5()`,
 * td5Lib), never `document`, except what is portalled to the body (the date menu, the calendar drawer) and the Contact
 * list's card (L1), read on its own page.
 *
 * ⚠️ THE QUIET STATES OPEN ON A FRESH PAGE OF THE SAME CONTEXT. `openTodo`'s review state is an init script, and init
 *    scripts pile up on one page: a "nothing" set once would still be set on the next "list" open (measured on the probe).
 * ⚠️ L3 AND L9 WRITE: each adds an own task for the run and the guard removes it, whatever happened (the house rule).
 * ⚠️ L2 READS THE RULE BACK FROM THE PAGE, IT DOES NOT RESTATE IT: every card and tray row carries its group, task type
 *    and due day, and the expected carousel is `urgentOrder(all.filter(isUrgent))` from lib/todoUrgent itself.
 */
import { expect, test, type Page } from "@playwright/test";
import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import { harnessDb } from "./harnessDocs";
import { mkdirSync, writeFileSync } from "node:fs";
import { canon as canonOf, openTodo as openTodo0, readBadge, restoreDocs, snapDocs, type Snap } from "./td52Lib";
import { openRoute } from "./measure";
import { isUrgent, urgentOrder } from "../../src/lib/todoUrgent";

const BASE = process.env.TD12_BASE === "1";
/* a red-first run on the base build fails at the first missing control; a short timeout keeps that to a minute a case */
test.setTimeout(BASE ? 60_000 : 480_000);
const DIR = "reports/todo-list-v12";
const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
type VP = { width: number; height: number };
type W = { __td5: () => { r: HTMLElement; sc: HTMLElement; q: (s: string) => HTMLElement | null; qa: (s: string) => HTMLElement[] } };

class Ledger {
  rows: { lock: string; where: string; ok: boolean; detail: string }[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail = "") { this.rows.push({ lock: this.name, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${BASE ? "base-" : ""}${process.env.TD12_MUTATE ? `mut-${process.env.TD12_MUTATE}-` : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/* ── red-first by mutation, for the locks the base already satisfies (v7 shipped their rules): `TD12_MUTATE=<lock>` breaks
   exactly the thing that lock guards, in the page, after it opens ── */
const MUTATE = process.env.TD12_MUTATE ?? "";
const MUTATIONS: Record<string, string> = {
  /* a drawing back in every band */
  L7: `document.querySelectorAll('[data-todo-v5] .td5-band').forEach((b) => { const i = document.createElement("img"); i.src = "/images/dash/quill.png"; b.prepend(i); });`,
  /* a ring back in every row's date */
  L8: `document.querySelectorAll('[data-todo-v5] [data-td7="due"]').forEach((d) => d.insertAdjacentHTML("afterbegin", "<svg width='8' height='8'></svg>"));`,
  /* the desk card's labels back in small capitals */
  L10: `document.head.insertAdjacentHTML("beforeend", "<style>[data-todo-v5] .td5-dcard .td5-fl { text-transform: uppercase !important; }</style>");`,
  /* a slip back under Done today */
  L11: `document.querySelectorAll('[data-todo-v5] [data-td5="done"]').forEach((d) => d.insertAdjacentHTML("beforeend", "<div data-td5='slip'>x</div>"));`,
  /* Needs you now left showing while pinned */
  L15: `document.head.insertAdjacentHTML("beforeend", "<style>[data-todo-v5][data-pinned] .td12-now { display: block !important; }</style>");`,
};
async function openTodo(page: Page, vp: VP, opts: Parameters<typeof openTodo0>[2] = {}) {
  await openTodo0(page, vp, opts);
  if (MUTATE && MUTATIONS[MUTATE]) { await page.evaluate(MUTATIONS[MUTATE]); await page.waitForTimeout(200); }
}

const dGuards: Snap[] = [];
test.afterEach(async () => {
  if (dGuards.length) await new Promise((r) => setTimeout(r, 2500));
  while (dGuards.length) { const f = await restoreDocs(dGuards.pop()!); if (f.length) console.log(`[guard] restored docs: ${f.join(", ")}`); }
});

/** a quiet state on a fresh page of this context (init scripts do not carry across pages) */
async function openState(page: Page, vp: VP, st: "list" | "caught" | "nothing"): Promise<Page> {
  if (st === "list") { await openTodo(page, vp); return page; }
  const p = await page.context().newPage();
  await openTodo(p, vp, { state: st });
  return p;
}
const box = (page: Page, sel: string) => page.evaluate((sel) => {
  const { r } = (window as unknown as W).__td5();
  const e = [...r.querySelectorAll<HTMLElement>(sel)].find((x) => x.getBoundingClientRect().height > 0);
  if (!e) return null;
  const b = e.getBoundingClientRect();
  return { x: b.left, y: b.top, w: b.width, h: b.height, b: b.bottom };
}, sel);
const toastText = (page: Page) => page.locator(".tdb-toast").first().textContent({ timeout: 4000 }).catch(() => null);
const pressUndo = async (page: Page) => {
  const b = page.locator(".tdb-toast .tdb-toast-act").first();
  if (!(await b.isVisible().catch(() => false))) return false;
  await b.click(); return true;
};
const toTray = (page: Page) => page.evaluate(() => {
  const { sc, q } = (window as unknown as W).__td5();
  const sheet = q(".td5-sheet");
  if (sc && sheet) sc.scrollTop += sheet.getBoundingClientRect().top - sc.getBoundingClientRect().top - 10;
});
const ymdIn = (n: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(Date.now() + n * 86_400_000));
const addOwnTask = async (id: string, text: string, due: string, surfaceOffset?: "week-before") => {
  const { db, uid } = await harnessDb();
  dGuards.push(await snapDocs([`tasks/${id}`]));
  await setDoc(doc(db, "users", uid, "tasks", id), { id, userId: uid, text, done: false, dueDate: due, ...(surfaceOffset ? { surfaceOffset } : {}), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
};
const NAVY = "rgb(42, 58, 82)";

/* ───────────────────────── L1 · one header, the shared card, in all three states, placed as the Contact list's ───────────────────────── */
test("TD12 L1 — every state renders PageHeaderCard: 'To-do list', data-page-title, the Mentor; its box is the Contact list card's", async ({ page }) => {
  const L = new Ledger("L1");
  for (const vp of [{ width: 1280, height: 800 }, { width: 1512, height: 900 }, { width: 1920, height: 1080 }]) {
    await openRoute(page, "/agents", vp);
    await page.waitForTimeout(800);
    const cl = await page.evaluate(() => { const e = [...document.querySelectorAll<HTMLElement>(".cl25-card.phc")].find((x) => x.getBoundingClientRect().height > 0); const b = e?.getBoundingClientRect(); return b ? { x: b.left, w: b.width, y: b.top } : null; });
    L.check(`${vp.width}: the Contact list card was read`, !!cl, JSON.stringify(cl));
    for (const st of ["list", "caught", "nothing"] as const) {
      const p = await openState(page, vp, st);
      const r = await p.evaluate(() => {
        const { q } = (window as unknown as W).__td5();
        const card = q('[data-td7="header"] .phc');
        const h1 = card?.querySelector("h1");
        const b = card?.getBoundingClientRect();
        return { cls: card?.className ?? "", h1: h1?.textContent?.trim() ?? null, pageTitle: h1?.getAttribute("data-page-title"),
          art: card?.querySelector<HTMLImageElement>(".phc-art img")?.getAttribute("src") ?? null, box: b ? { x: b.left, w: b.width, y: b.top } : null };
      });
      const at = `${vp.width} ${st}`;
      L.check(`${at}: the shared card (.phc)`, /\bphc\b/.test(r.cls), r.cls);
      L.check(`${at}: h1 "To-do list" with data-page-title`, r.h1 === "To-do list" && r.pageTitle != null, `${r.h1} · ${r.pageTitle}`);
      L.check(`${at}: art is MENTOR_ART`, r.art === "/images/dash/mentor-leaning.png", String(r.art));
      if (cl && r.box) for (const k of ["x", "w", "y"] as const) L.check(`${at}: card ${k} equals the Contact list's (±1)`, Math.abs(r.box[k] - cl[k]) <= 1, `${r.box[k].toFixed(1)} vs ${cl[k].toFixed(1)}`);
      else L.check(`${at}: the card's box`, false, "no box");
      if (p !== page) await p.close();
    }
  }
  L.done(57); // 1 + 6 per state × 3 states, at three widths
});

/* ───────────────────────── L2 · Needs you now is exactly the urgent set, in order, and nothing is listed twice ───────────────────────── */
test("TD12 L2 — the carousel is urgentOrder(all.filter(isUrgent)); none of its tasks has a tray row; bands + carousel = the badge", async ({ page }) => {
  const L = new Ledger("L2");
  for (const vp of SIZES) {
    await openTodo(page, vp);
    const r = await page.evaluate(() => {
      const { qa } = (window as unknown as W).__td5();
      const read = (e: HTMLElement, key: string) => ({ key, g: e.dataset.g ?? e.dataset.group ?? "", due: e.dataset.due ?? null, tt: e.dataset.taskType ?? "" });
      const cards = qa("[data-td12-card]").map((e) => read(e, e.dataset.td12Card!));
      const rows = qa('[data-td5="row"]').map((e) => read(e, e.dataset.td5Row!));
      const bands = qa('[data-td5="group-block"]').map((b) => Number(b.querySelector(".td5-bc")?.textContent ?? "NaN"));
      const d = new Date();
      const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return { cards, rows, bands, today, shut: qa('[data-td5="group-block"][data-shut]').length };
    });
    const badge = await readBadge(page);
    const at = String(vp.width);
    const as = (x: { key: string; g: string; due: string | null; tt: string }) => ({ ...x, group: { id: x.g }, dial: { ymd: x.due }, card: { taskType: x.tt } });
    const all = [...r.cards, ...r.rows].map(as);
    type It = (typeof all)[number];
    const want = (urgentOrder(all.filter((i) => isUrgent(i as never, r.today)) as never[]) as unknown as It[]).map((i) => i.key);
    L.check(`${at}: cards are on the page`, r.cards.length > 0, String(r.cards.length));
    L.check(`${at}: the cards are exactly the urgent set, in urgentOrder`, JSON.stringify(r.cards.map((c) => c.key)) === JSON.stringify(want), `${r.cards.length} vs ${want.length}`);
    const rowKeys = new Set(r.rows.map((x) => x.key));
    L.check(`${at}: no carousel task has a tray row`, r.cards.every((c) => !rowKeys.has(c.key)), r.cards.filter((c) => rowKeys.has(c.key)).map((c) => c.key).join(","));
    L.check(`${at}: no tray row is urgent`, r.rows.every((x) => !isUrgent(as(x) as never, r.today)), "");
    const sum = r.bands.reduce((a, b) => a + b, 0);
    L.check(`${at}: the badge was read`, badge != null, String(badge));
    L.check(`${at}: tray band counts + carousel = the badge`, sum + r.cards.length === badge, `${sum} + ${r.cards.length} vs ${badge}`);
    L.check(`${at}: no group folded (so the rows are the bands)`, r.shut === 0, String(r.shut));
    L.check(`${at}: the rows are the bands`, r.rows.length === sum, `${r.rows.length} vs ${sum}`);
    const sub = await page.evaluate(() => (window as unknown as W).__td5().q('[data-td12="summary"]')?.textContent ?? null);
    L.check(`${at}: the summary line counts the cards`, !!sub && sub.startsWith(r.cards.length === 1 ? "One thing to do first: " : `${r.cards.length} things to do first: `), String(sub));
    const rest = await page.evaluate(() => (window as unknown as W).__td5().q('[data-td12="rest"]')?.textContent ?? null);
    L.check(`${at}: Everything else says how many more`, rest === `${sum} more, most urgent first`, String(rest));
  }
  L.done(20);
});

/* ───────────────────────── L3 · a card selects, its button starts the journey; finishing it removes the card ───────────────────────── */
test("TD12 L3 — a card puts its task on the desk; its button starts the journey; finishing it removes the card", async ({ page }) => {
  const L = new Ledger("L3");
  const vp = SIZES[0];
  const id = `zz-td12-now-${Date.now().toString(36)}`;
  await addOwnTask(id, "Zz td12 now probe", ymdIn(0));
  await openTodo(page, vp);
  const key = await page.evaluate((id) => (window as unknown as W).__td5().qa("[data-td12-card]").find((c) => c.dataset.td12Card?.includes(id))?.dataset.td12Card ?? null, id);
  L.check("the probe task (due today) is a Needs you now card", !!key, String(key));
  L.check("…and has no tray row", await page.evaluate((id) => !(window as unknown as W).__td5().qa('[data-td5="row"]').some((r) => r.dataset.td5Row?.includes(id)), id), "");
  if (key) {
    const card = page.locator(`[data-todo-v5] [data-td12-card="${key}"]`);
    await card.scrollIntoViewIfNeeded();
    await card.locator('[data-td12="deed"]').click();
    await page.waitForTimeout(900);
    const d = await page.evaluate(() => { const { q, sc } = (window as unknown as W).__td5(); const c = q('[data-td5="desk-card"]'); const sh = q(".td5-sheet")!; return { key: c?.dataset.key ?? null, pos: q('[data-td5="pos"] > span')?.textContent ?? null, sheetTop: sh.getBoundingClientRect().top - sc.getBoundingClientRect().top }; });
    L.check("pressing the card puts its task on the desk", d.key === key, String(d.key));
    L.check('the desk says "From Needs you now"', d.pos === "From Needs you now", String(d.pos));
    L.check("the page scrolls to the workspace", Math.abs(d.sheetTop) <= 30, d.sheetTop.toFixed(1));
    L.check("the card is marked as the one on the desk", await card.evaluate((e) => e.classList.contains("on")), "");
    await card.locator('[data-td12="go"]').click();
    await page.waitForTimeout(2200);
    L.check("its button finishes it (the own task's journey is the tick): the card leaves", await page.evaluate((k) => !(window as unknown as W).__td5().qa("[data-td12-card]").some((c) => c.dataset.td12Card === k), key), "");
    const t = await toastText(page);
    L.check("the tick's toast, with Undo", !!t, String(t));
    L.check("Undo", await pressUndo(page), "");
    await page.waitForTimeout(1500);
  }
  /* a query task's button opens its journey ON THE DESK */
  await openTodo(page, vp);
  const you = page.locator('[data-todo-v5] [data-td12-card][data-g="you"]').first();
  L.check("a Your move card to press", await you.count() === 1, "");
  if (await you.count()) {
    const k = await you.getAttribute("data-td12-card");
    await you.locator('[data-td12="go"]').click();
    await page.waitForTimeout(1500);
    const w = await page.evaluate(() => { const { q } = (window as unknown as W).__td5(); return { work: !!q('[data-td5="desk-card"][data-work]'), key: q('[data-td5="desk-card"]')?.dataset.key ?? null, row: q('[data-td52="in-progress-row"]')?.textContent ?? null }; });
    L.check("the button starts the journey on the desk card", w.work && w.key === k, JSON.stringify(w));
    L.check('the toolbar says "Task in progress"', !!w.row && w.row.includes("Task in progress"), String(w.row));
    await page.keyboard.press("Escape"); await page.waitForTimeout(400); await page.keyboard.press("Escape"); await page.waitForTimeout(400);
  }
  L.done(12);
});

/* ───────────────────────── L4 · the order, and the page opens at the top ───────────────────────── */
test("TD12 L4 — header, Needs you now, Everything else, the sheet; scrollTop 0 on load", async ({ page }) => {
  const L = new Ledger("L4");
  for (const vp of SIZES) {
    await openTodo(page, vp);
    await page.waitForTimeout(1500);
    const at = String(vp.width);
    const [hd, now, rest, sh] = [await box(page, '[data-td7="header"]'), await box(page, '[data-td12="now"]'), await box(page, '[data-td7="tray-head"]'), await box(page, ".td5-sheet")];
    L.check(`${at}: all four present`, !!(hd && now && rest && sh), JSON.stringify({ hd: !!hd, now: !!now, rest: !!rest, sh: !!sh }));
    if (hd && now && rest && sh) {
      L.check(`${at}: header above Needs you now, 44 apart (±2)`, Math.abs(now.y - hd.b - 44) <= 2, (now.y - hd.b).toFixed(1));
      L.check(`${at}: Needs you now above Everything else`, now.b <= rest.y, `${now.b.toFixed(1)} ≤ ${rest.y.toFixed(1)}`);
      L.check(`${at}: Everything else above the sheet`, rest.b <= sh.y, `${rest.b.toFixed(1)} ≤ ${sh.y.toFixed(1)}`);
    }
    const h2 = await page.evaluate(() => (window as unknown as W).__td5().qa("h2.td7-h2").map((h) => h.textContent));
    L.check(`${at}: the headings read Needs you now, Everything else`, JSON.stringify(h2) === JSON.stringify(["Needs you now", "Everything else"]), JSON.stringify(h2));
    const st = await page.evaluate(() => (window as unknown as W).__td5().sc.scrollTop);
    L.check(`${at}: the page's scrollTop is 0 on load`, st === 0, String(st));
  }
  L.done(12);
});

/* ───────────────────────── L5 · the open toolbar ───────────────────────── */
test("TD12 L5 — a white toolbar: find, Filters, sort, pin; no kbd in the row or the tray; nothing navy in it; Filters toggles the strip", async ({ page }) => {
  const L = new Ledger("L5");
  for (const vp of SIZES) {
    await openTodo(page, vp);
    const r = await page.evaluate((NAVY) => {
      const { r: root, q } = (window as unknown as W).__td5();
      const nav = q('[data-td5="nav"]');
      const navy = nav ? [nav, ...nav.querySelectorAll<HTMLElement>("*")].filter((e) => getComputedStyle(e).backgroundColor === NAVY).map((e) => e.className) : ["no row"];
      return {
        bg: nav ? getComputedStyle(nav).backgroundColor : "", h: nav?.getBoundingClientRect().height ?? 0,
        input: !!nav?.querySelector('[data-td7="nav-find"] input'), filters: !!nav?.querySelector('[data-td7="filters"]'),
        sort: nav?.querySelector('[data-td12="sort"]')?.textContent?.trim() ?? null, pin: !!nav?.querySelector('[data-td52="pin"]'),
        /* ⚠️ THE SHARED PIN BUTTON'S HOVER TOOLTIP ("F", PinListButton's `[data-pin-tip]`) IS PART OF THAT CONTROL, NOT A
           HINT ON THE ROW (v7 L4 drew the same line); the shell's button is out of this run's scope and named in the report */
        kbds: [...root.querySelectorAll("kbd")].filter((k) => (k.closest('[data-td5="nav"]') || k.closest('[data-td5="tray"]')) && !k.closest("[data-pin-tip]")).map((k) => k.textContent),
        say: !!nav?.querySelector('[data-td5="say"]'), navy,
      };
    }, NAVY);
    const at = String(vp.width);
    L.check(`${at}: the row is white`, r.bg === "rgb(255, 255, 255)", r.bg);
    L.check(`${at}: the row is 60 tall (±1)`, Math.abs(r.h - 60) <= 1, r.h.toFixed(1));
    L.check(`${at}: the find input`, r.input, "");
    L.check(`${at}: Filters`, r.filters, "");
    L.check(`${at}: the sort reads "Most urgent first"`, r.sort === "Most urgent first", String(r.sort));
    L.check(`${at}: the pin`, r.pin, "");
    L.check(`${at}: no kbd in the row or the tray`, r.kbds.length === 0, JSON.stringify(r.kbds));
    L.check(`${at}: no sentence in the row`, !r.say, "");
    L.check(`${at}: nothing navy in the row`, r.navy.length === 0, JSON.stringify(r.navy));
  }
  const vp = SIZES[1];
  await openTodo(page, vp);
  await toTray(page);
  const fb = page.locator('[data-todo-v5] [data-td7="filters"]');
  await fb.click(); await page.waitForTimeout(300);
  const open = await page.evaluate(() => { const { q } = (window as unknown as W).__td5(); const s = q('[data-td7="strip"]'); return { strip: !!s && s.getBoundingClientRect().height > 0, pills: s ? s.querySelectorAll("[data-td5-pill]").length : 0, bg: getComputedStyle(q('[data-td7="filters"]')!).backgroundColor }; });
  L.check("Filters opens the strip under the row, with the pills", open.strip && open.pills >= 4, JSON.stringify(open));
  L.check("…and is pink while open", open.bg === "rgb(245, 226, 218)", open.bg);
  await fb.click(); await page.waitForTimeout(300);
  L.check("pressed again, it closes", await page.evaluate(() => !(window as unknown as W).__td5().q('[data-td7="strip"]')), "");
  const s = page.locator('[data-todo-v5] [data-td12="sort"]');
  await s.click(); await page.waitForTimeout(250);
  L.check("the sort opens its menu", await page.locator('[data-todo-v5] .td5-sortmenu [role="menuitemradio"]').count() === 3, "");
  await s.click();
  L.done(22);
});

/* ───────────────────────── L6 · no tab strip; Set aside from the header, back from the row ───────────────────────── */
test("TD12 L6 — no tablist in the tray; the header opens Set aside; its Back button returns", async ({ page }) => {
  const L = new Ledger("L6");
  const vp = SIZES[0];
  await openTodo(page, vp);
  L.check("no role=tablist in the tray", await page.evaluate(() => (window as unknown as W).__td5().qa('[role="tablist"]').length === 0), "");
  await page.locator('[data-todo-v5] [data-td7="header"] [data-td5="aside"]').click();
  await page.waitForTimeout(600);
  const r = await page.evaluate(() => { const { q } = (window as unknown as W).__td5(); const say = q('[data-td7="aside-say"]'); return { say: say?.textContent ?? null, fs: say ? getComputedStyle(say).fontSize : "", back: !!q('[data-td7="back-to-tray"]'), list: !!q('[data-td5="aside-list"]'), find: !!q('[data-td7="nav-find"]') }; });
  L.check("the Set aside view shows", r.list, "");
  L.check('the toolbar reads "Set aside: n tasks waiting to come back"', !!r.say && /^Set aside: \d+ tasks? waiting to come back$/.test(r.say), String(r.say));
  L.check("…at 19px", r.fs === "19px", r.fs);
  L.check("…with Back to your tray, and nothing else on the left", r.back && !r.find, JSON.stringify(r));
  await page.locator('[data-todo-v5] [data-td7="back-to-tray"]').click();
  await page.waitForTimeout(500);
  const t = await page.evaluate(() => { const { q, qa } = (window as unknown as W).__td5(); return { list: !!q('[data-td5="aside-list"]'), rows: qa('[data-td5="row"]').length, say: !!q('[data-td7="aside-say"]') }; });
  L.check("Back returns to the tray", !t.list && !t.say && t.rows > 0, JSON.stringify(t));
  L.done(6);
});

/* ───────────────────────── L7 · plain group headings ───────────────────────── */
test("TD12 L7 — no img in any group band; Your move alone carries the ! mark", async ({ page }) => {
  const L = new Ledger("L7");
  const vp = SIZES[0];
  const read = () => page.evaluate(() => (window as unknown as W).__td5().qa('[data-td5="band"], .td5-band').map((b) => ({
    g: b.closest<HTMLElement>("[data-g]")?.dataset.g ?? "", img: b.querySelectorAll("img").length, bg: getComputedStyle(b).backgroundColor, bang: !!b.querySelector('[data-td7="your-move-mark"]'),
  })));
  await openTodo(page, vp);
  const tray = await read();
  L.check("tray bands found", tray.length >= 2, String(tray.length));
  for (const b of tray) {
    L.check(`${b.g}: no img`, b.img === 0, String(b.img));
    L.check(`${b.g}: the paper band`, b.bg === "rgb(246, 242, 236)", b.bg);
    L.check(`${b.g}: the ! mark only on Your move`, b.bang === (b.g === "you"), String(b.bang));
  }
  await page.locator('[data-todo-v5] [data-td7="header"] [data-td5="aside"]').click();
  await page.waitForTimeout(600);
  const aside = await read();
  L.check("Set aside bands found", aside.length >= 1, String(aside.length));
  for (const b of aside) { L.check(`aside ${b.g}: no img`, b.img === 0); L.check(`aside ${b.g}: the paper band`, b.bg === "rgb(246, 242, 236)", b.bg); L.check(`aside ${b.g}: no ! mark`, !b.bang); }
  L.done(9);
});

/* ───────────────────────── L8 · dates as words ───────────────────────── */
test("TD12 L8 — no SVG ring in a tray row's date; an overdue row reads '26 Jul' with an age ending 'overdue'", async ({ page }) => {
  const L = new Ledger("L8");
  for (const vp of SIZES) {
    await openTodo(page, vp);
    const r = await page.evaluate(() => {
      const rows = (window as unknown as W).__td5().qa('[data-td5="row"]');
      return {
        n: rows.length, svg: rows.filter((x) => x.querySelector('[data-td5="dial"] svg, .td5-dial')).length,
        late: rows.map((x) => x.querySelector<HTMLElement>('[data-td7="due"][data-kind="late"]')).filter(Boolean).map((d) => ({ dt: d!.querySelector('[data-td7="date-words"]')?.textContent ?? "", age: d!.querySelector('[data-td7="age"]')?.textContent ?? "" })),
      };
    });
    const at = String(vp.width);
    L.check(`${at}: rows`, r.n > 0, String(r.n));
    L.check(`${at}: no SVG ring in any row's date`, r.svg === 0, String(r.svg));
    L.check(`${at}: overdue rows to read`, r.late.length > 0, String(r.late.length));
    for (const x of r.late.slice(0, 10)) {
      L.check(`${at}: "${x.dt}" is d Mon`, /^\d{1,2} [A-Z][a-z]{2}$/.test(x.dt), x.dt);
      L.check(`${at}: "${x.age}" ends overdue`, /overdue$/.test(x.age), x.age);
    }
  }
  L.done(10);
});

/* ───────────────────────── L9 · Pick a date moves a task, with Undo; dragging does nothing ───────────────────────── */
test("TD12 L9 — the date menu's Pick a date moves a task with Undo; dragging a row onto the calendar drawer does nothing", async ({ page }) => {
  const L = new Ledger("L9");
  const vp = SIZES[0];
  const id = `zz-td12-pick-${Date.now().toString(36)}`;
  /* three days out and surfacing a week before: in the tray and not urgent (due today it would lead Needs you now, and
     surfacing on its day it would not be on the board yet) */
  await addOwnTask(id, "Zz td12 pick probe", ymdIn(3), "week-before");
  await openTodo(page, vp);
  const key = await page.evaluate((id) => (window as unknown as W).__td5().qa('[data-td5="row"]').find((r) => r.dataset.td5Row?.includes(id))?.dataset.td5Row ?? null, id);
  L.check("the probe task is in the tray", !!key, String(key));
  const before = await snapDocs([`tasks/${id}`]);
  if (key) {
    const row = page.locator(`[data-todo-v5] [data-td5-row="${key}"]`).first();
    /* drag first, onto a day in the open drawer: nothing moves */
    await page.locator('[data-todo-v5] [data-td12="calendar"]').click();
    await page.waitForTimeout(700);
    await toTray(page);
    await row.scrollIntoViewIfNeeded();
    const day = page.locator(`[data-td52="drawer"] [data-td52="dr-day"][data-ymd="${ymdIn(6)}"]`);
    if (await day.count()) await row.dragTo(day, { force: true, timeout: 5000 }).catch(() => undefined);
    await page.waitForTimeout(1200);
    const afterDrag = await snapDocs([`tasks/${id}`]);
    L.check("dragging a row onto the drawer changes nothing", canonOf(afterDrag.get(`tasks/${id}`)) === canonOf(before.get(`tasks/${id}`)), "");
    L.check("no row is draggable", await page.evaluate(() => (window as unknown as W).__td5().qa('[data-td5="row"]').every((r) => r.getAttribute("draggable") !== "true")), "");
    await page.keyboard.press("Escape"); await page.waitForTimeout(500);
    await row.locator('[data-td5="dial"]').click();
    await page.waitForTimeout(400);
    const menu = page.locator('[data-td52="dial-menu"]');
    L.check("the date opens the menu", await menu.count() === 1, "");
    const pick = menu.locator('[data-k="pick"]');
    L.check('"Pick a date" is offered', (await pick.textContent().catch(() => ""))?.startsWith("Pick a date") ?? false, String(await pick.textContent().catch(() => null)));
    await pick.click();
    await page.waitForTimeout(300);
    const days = await page.evaluate(() => [...document.querySelectorAll<HTMLButtonElement>('[data-td52="dial-menu"] [data-day]')].map((b) => ({ d: b.dataset.day!, off: b.disabled })));
    const t = ymdIn(0);
    L.check("the month is in the popover", days.length >= 28, String(days.length));
    L.check("today and the past are refused", days.filter((x) => x.d <= t).every((x) => x.off), "");
    const target = days.find((x) => x.d > ymdIn(3) && !x.off)?.d ?? null;
    L.check("a pickable day", !!target, String(target));
    if (target) {
      await page.locator(`[data-td52="dial-menu"] [data-day="${target}"]`).click();
      await page.waitForTimeout(1300);
      const after = (await snapDocs([`tasks/${id}`])).get(`tasks/${id}`) as { dueDate?: string } | null;
      L.check(`the pick moves dueDate to ${target}`, after?.dueDate?.slice(0, 10) === target, String(after?.dueDate));
      L.check("Undo", await pressUndo(page), "");
      await page.waitForTimeout(1500);
      const back = await snapDocs([`tasks/${id}`]);
      L.check("Undo restores the document byte for byte", canonOf(back.get(`tasks/${id}`)) === canonOf(before.get(`tasks/${id}`)), "");
    }
  }
  L.done(11);
});

/* ───────────────────────── L10 · nothing uppercase in the desk card ───────────────────────── */
test("TD12 L10 — no element inside the desk card (outside the journey shell) is text-transform: uppercase", async ({ page }) => {
  const L = new Ledger("L10");
  for (const vp of SIZES) {
    await openTodo(page, vp);
    const r = await page.evaluate(() => {
      const { q } = (window as unknown as W).__td5();
      const card = q('[data-td5="desk"] .td5-dcard:not(.td5-compose)');
      const upper = card ? [...card.querySelectorAll<HTMLElement>("*")].filter((e) => !e.closest('[data-td5="journey-host"]') && e.getBoundingClientRect().height > 0 && getComputedStyle(e).textTransform === "uppercase").map((e) => `${e.className}:${(e.textContent ?? "").trim().slice(0, 20)}`) : ["no card"];
      return { card: !!card, upper, why: !!card?.querySelector('[data-td5="desk-head"] .td5-why'), dashes: !!q('[data-td5="pos"] .td5-dots') };
    });
    const at = String(vp.width);
    L.check(`${at}: the desk card`, r.card, "");
    L.check(`${at}: nothing uppercase in it`, r.upper.length === 0, JSON.stringify(r.upper));
    L.check(`${at}: no small-capitals tag in its band`, !r.why, "");
    L.check(`${at}: no progress dashes`, !r.dashes, "");
  }
  L.done(8);
});

/* ───────────────────────── L11 · Done today on one line ───────────────────────── */
test("TD12 L11 — Done today shows its heading and no slips", async ({ page }) => {
  const L = new Ledger("L11");
  for (const vp of SIZES) {
    await openTodo(page, vp);
    const r = await page.evaluate(() => { const { q } = (window as unknown as W).__td5(); const d = q('[data-td5="desk"] [data-td5="done"]'); return { line: d?.querySelector('[data-td7="done-line"]')?.textContent ?? null, slips: d ? d.querySelectorAll('[data-td5="slip"]').length : -1 }; });
    const at = String(vp.width);
    L.check(`${at}: the heading line`, !!r.line && /^Done today · /.test(r.line), String(r.line));
    L.check(`${at}: no slips`, r.slips === 0, String(r.slips));
  }
  L.done(4);
});

/* ───────────────────────── L12 · the doodle tile ───────────────────────── */
test("TD12 L12 — the doodle tile is the scroller's background at rest and absent while pinned", async ({ page }) => {
  const L = new Ledger("L12");
  for (const vp of SIZES) {
    await openTodo(page, vp);
    const read = () => page.evaluate(() => { const { sc } = (window as unknown as W).__td5(); const s = getComputedStyle(sc); return { img: s.backgroundImage, size: s.backgroundSize, att: s.backgroundAttachment, col: s.backgroundColor }; });
    const rest = await read();
    const at = String(vp.width);
    L.check(`${at}: the tile at rest`, /\/images\/todo\/doodle-tile\.svg/.test(rest.img), rest.img);
    L.check(`${at}: 340 × 360, local, on #f2eee8`, rest.size === "340px 360px" && rest.att === "local" && rest.col === "rgb(242, 238, 232)", JSON.stringify(rest));
    await page.locator('[data-todo-v5] [data-td52="pin"]').click();
    await page.waitForTimeout(800);
    const pinned = await read();
    L.check(`${at}: no tile while pinned`, !/doodle-tile/.test(pinned.img), pinned.img);
    await page.locator('[data-todo-v5] [data-td52="pin"]').click();
    await page.waitForTimeout(500);
  }
  L.done(6);
});

/* ───────────────────────── L13 · all caught up ───────────────────────── */
test("TD12 L13 — all caught up: the blush band under the header, Coming up with no navy button, no sheet", async ({ page }) => {
  const L = new Ledger("L13");
  for (const vp of SIZES) {
    const p = await openState(page, vp, "caught");
    const r = await p.evaluate((NAVY) => {
      const { q, qa } = (window as unknown as W).__td5();
      const hd = q('[data-td7="header"]'), ack = q('[data-td12="ack"]');
      const next = hd?.nextElementSibling;
      const btns = qa('[data-td12="coming-up"] button');
      return {
        ackH: ack?.querySelector("h2")?.textContent ?? null, bg: ack ? getComputedStyle(ack).backgroundColor : "", next: next === ack,
        gap: hd && ack ? ack.getBoundingClientRect().top - hd.getBoundingClientRect().bottom : -1,
        line: q('[data-td12="ack-line"]')?.textContent ?? null, img: !!ack?.querySelector("img[src*='make-querying-simple']"),
        cards: qa('[data-td12="coming-up"] [data-td12-card]').length, navyBtn: btns.filter((b) => getComputedStyle(b).backgroundColor === NAVY).length,
        sheet: !!q(".td5-sheet"), done: !!q('[data-td5="done"]'), clear: /The desk is clear/.test(document.body.textContent ?? ""),
      };
    }, NAVY);
    const at = String(vp.width);
    L.check(`${at}: "You’re all caught up." in the band`, r.ackH === "You’re all caught up.", String(r.ackH));
    L.check(`${at}: the band is blush`, r.bg === "rgb(245, 226, 218)", r.bg);
    L.check(`${at}: directly under the header, 44 below it (±2)`, r.next && Math.abs(r.gap - 44) <= 2, `${r.next} ${r.gap.toFixed(1)}`);
    L.check(`${at}: the armchair hawk`, r.img, "");
    L.check(`${at}: the line says what is next`, !!r.line && /(Nothing (else )?is due (until .+|yet)\.)$/.test(r.line), String(r.line));
    L.check(`${at}: Coming up has cards`, r.cards > 0 && r.cards <= 3, String(r.cards));
    L.check(`${at}: no navy button in Coming up`, r.navyBtn === 0, String(r.navyBtn));
    L.check(`${at}: no workspace sheet`, !r.sheet, "");
    L.check(`${at}: no Done today and no "desk is clear"`, !r.done && !r.clear, JSON.stringify({ done: r.done, clear: r.clear }));
    await p.close();
  }
  L.done(18);
});

/* ───────────────────────── L14 · nothing yet ───────────────────────── */
test("TD12 L14 — nothing yet: the example column is aria-hidden and not focusable; the explainer's three steps and + Add a task; none of the writer's data", async ({ page }) => {
  const L = new Ledger("L14");
  const { db, uid } = await harnessDb();
  const names = (await getDocs(collection(db, "users", uid, "agents"))).docs.map((d) => String((d.data() as { name?: string }).name ?? "").trim()).filter((n) => n.length > 3);
  for (const vp of SIZES) {
    const p = await openState(page, vp, "nothing");
    const r = await p.evaluate(() => {
      const { q } = (window as unknown as W).__td5();
      const g = q('[data-td12="ghost"]');
      const focusable = g ? [...g.querySelectorAll<HTMLElement>("button, a, input, [tabindex]")].filter((e) => { e.focus(); return document.activeElement === e; }).length : -1;
      return {
        hidden: g?.getAttribute("aria-hidden"), inert: g?.hasAttribute("inert") ?? false, focusable, text: g?.textContent ?? "",
        steps: [...(q('[data-td12="steps"]')?.querySelectorAll("li > b") ?? [])].map((b) => b.textContent),
        add: q('[data-td12="how-add"]')?.textContent ?? null, h: q("#td12-how-h")?.textContent ?? null,
        old: !!q(".td5-np, .td5-how, .td5-feats, .td5-ways"),
      };
    });
    const at = String(vp.width);
    L.check(`${at}: the example column is aria-hidden`, r.hidden === "true", String(r.hidden));
    L.check(`${at}: …and inert`, r.inert, "");
    L.check(`${at}: …nothing in it takes focus`, r.focusable === 0, String(r.focusable));
    L.check(`${at}: "How this page works"`, r.h === "How this page works", String(r.h));
    L.check(`${at}: the three steps`, JSON.stringify(r.steps) === JSON.stringify(["Log a query", "We track the dates", "Tasks appear here"]), JSON.stringify(r.steps));
    L.check(`${at}: "+ Add a task"`, r.add === "+ Add a task", String(r.add));
    const leaked = names.filter((n) => n !== "Iris Callahan" && n !== "Greg Panetta" && r.text.includes(n));
    L.check(`${at}: the example draws none of the writer's agents`, names.length > 0 && leaked.length === 0, `${names.length} names; leaked ${JSON.stringify(leaked)}`);
    L.check(`${at}: the old empty page's parts are gone`, !r.old, "");
    await p.close();
  }
  L.done(16);
});

/* ───────────────────────── L15 · pinned ───────────────────────── */
test("TD12 L15 — pinned: header, Needs you now and Everything else hidden; the toolbar holds find and pin; nothing overflows", async ({ page }) => {
  const L = new Ledger("L15");
  for (const vp of SIZES) {
    await openTodo(page, vp);
    await page.locator('[data-todo-v5] [data-td52="pin"]').click();
    await page.waitForTimeout(900);
    const r = await page.evaluate(() => {
      const { r: root, q } = (window as unknown as W).__td5();
      const nav = q('[data-td5="nav"]');
      const v = (s: string) => { const e = q(s); return !!e && e.getBoundingClientRect().height > 0; };
      return { pinned: root.hasAttribute("data-pinned"), header: v('[data-td7="header"]'), now: v('[data-td12="now"]'), rest: v('[data-td7="tray-head"]'),
        find: !!nav?.querySelector('[data-td7="nav-find"] input'), pin: !!nav?.querySelector('[data-td52="pin"]'), sw: nav?.scrollWidth ?? -1, cw: nav?.clientWidth ?? -1 };
    });
    const at = String(vp.width);
    L.check(`${at}: pinned`, r.pinned, "");
    L.check(`${at}: the header is hidden`, !r.header, "");
    L.check(`${at}: Needs you now is hidden`, !r.now, "");
    L.check(`${at}: Everything else is hidden`, !r.rest, "");
    L.check(`${at}: find in the toolbar`, r.find, "");
    L.check(`${at}: the pin in the toolbar`, r.pin, "");
    L.check(`${at}: the row does not overflow (scrollWidth ≤ clientWidth)`, r.sw >= 0 && r.sw <= r.cw, `${r.sw} / ${r.cw}`);
    await page.locator('[data-todo-v5] [data-td52="pin"]').click();
    await page.waitForTimeout(500);
  }
  L.done(14);
});
