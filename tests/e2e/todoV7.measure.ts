/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v7 — locks L1–L10 and LP, on the rendered page (design-refs/todo-list-v7/todo-list-v7.html), at 1512 × 900 and
 * 1280 × 800 with the shell. Every reading starts from the one visible v5 root (`window.__td5()`, td5Lib), never `document`,
 * except what is portalled to the body (the date menu) and the Contact list's card (L1), which is read on its own page.
 *
 * ⚠️ LP WRITES: it adds an own task for the run and the guard removes it, whatever happened (the house rule).
 * ⚠️ L4 — A CONTROL'S OWN KEY IS NOT A HINT ON THE ROW: the find field's "/" (the ref's find carries the same box) and the
 *    pin's hover tooltip "F" (PinListButton's label; pinRow.measure.ts treats it as part of the control). What S2 removed
 *    are the row's J / K / E hints and "+ Add a task"'s N, and the lock asserts exactly those are gone.
 */
import { expect, test, type Page } from "@playwright/test";
import { doc, setDoc } from "firebase/firestore";
import { harnessDb } from "./harnessDocs";
import { mkdirSync, writeFileSync } from "node:fs";
import { canon as canonOf, openTodo, restoreDocs, snapDocs, type Snap } from "./td52Lib";
import { openRoute } from "./measure";

const BASE = process.env.TD7_BASE === "1";
/* a red-first run on the base build fails at the first missing control; a short timeout keeps that to a minute a case */
test.setTimeout(BASE ? 60_000 : 480_000);
const DIR = "reports/todo-list-v7";
const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
type W = { __td5: () => { r: HTMLElement; sc: HTMLElement; q: (s: string) => HTMLElement | null; qa: (s: string) => HTMLElement[] } };

class Ledger {
  rows: { lock: string; where: string; ok: boolean; detail: string }[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail = "") { this.rows.push({ lock: this.name, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${BASE ? "base-" : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}

const dGuards: Snap[] = [];
test.afterEach(async () => {
  if (dGuards.length) await new Promise((r) => setTimeout(r, 2500));
  while (dGuards.length) { const f = await restoreDocs(dGuards.pop()!); if (f.length) console.log(`[guard] restored docs: ${f.join(", ")}`); }
});

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

/* ───────────────────────── L1 · the header is the shared card, placed as the Contact list's ───────────────────────── */
test("TD7 L1 — the header is PageHeaderCard: the title, both buttons, the Mentor; its box is the Contact list card's", async ({ page }) => {
  const L = new Ledger("L1");
  for (const vp of [{ width: 1280, height: 800 }, { width: 1512, height: 900 }, { width: 1920, height: 1080 }]) {
    await openRoute(page, "/agents", vp);
    await page.waitForTimeout(800);
    const cl = await page.evaluate(() => { const e = [...document.querySelectorAll<HTMLElement>(".cl25-card.phc")].find((x) => x.getBoundingClientRect().height > 0); const b = e?.getBoundingClientRect(); return b ? { x: b.left, w: b.width, y: b.top } : null; });
    await openTodo(page, vp);
    const r = await page.evaluate(() => {
      const { q } = (window as unknown as W).__td5();
      const card = q('[data-td7="header"] .phc');
      const h1 = card?.querySelector("h1");
      const b = card?.getBoundingClientRect();
      return {
        cls: card?.className ?? "", h1: h1?.textContent?.trim() ?? null, pageTitle: h1?.getAttribute("data-page-title"),
        art: card?.querySelector<HTMLImageElement>(".phc-art img")?.getAttribute("src") ?? null,
        add: card?.querySelector(".phc-p")?.textContent?.trim() ?? null, aside: card?.querySelector(".phc-s")?.textContent?.trim() ?? null,
        box: b ? { x: b.left, w: b.width, y: b.top } : null,
      };
    });
    const at = String(vp.width);
    L.check(`${at}: the shared card (.phc) renders`, /\bphc\b/.test(r.cls), r.cls);
    L.check(`${at}: h1 "To-do list" with data-page-title`, r.h1 === "To-do list" && r.pageTitle != null, `${r.h1} · ${r.pageTitle}`);
    L.check(`${at}: art is MENTOR_ART`, r.art === "/images/dash/mentor-leaning.png", String(r.art));
    L.check(`${at}: "+ Add a task"`, r.add === "+ Add a task", String(r.add));
    L.check(`${at}: "Set aside · n"`, !!r.aside && /^Set aside( · \d+)?$/.test(r.aside), String(r.aside));
    L.check(`${at}: the Contact list card was read`, !!cl, JSON.stringify(cl));
    if (cl && r.box) for (const k of ["x", "w", "y"] as const) L.check(`${at}: card ${k} equals the Contact list's (±1)`, Math.abs(r.box[k] - cl[k]) <= 1, `${r.box[k].toFixed(1)} vs ${cl[k].toFixed(1)}`);
  }
  /* both buttons wired: compose opens; the Set aside view opens */
  const vp = SIZES[0];
  await openTodo(page, vp);
  await page.locator('[data-todo-v5] [data-td7="header"] [data-td5="add"]').click();
  await page.waitForTimeout(600);
  L.check("+ Add a task opens the compose card", await page.locator('[data-todo-v5] [data-td5="compose"]:visible').count() > 0, "");
  await page.keyboard.press("Escape").catch(() => {});
  await openTodo(page, vp);
  await page.locator('[data-todo-v5] [data-td7="header"] [data-td5="aside"]').click();
  await page.waitForTimeout(600);
  L.check("Set aside opens the Set aside view", await page.locator('[data-todo-v5] [data-td5="aside-list"]:visible').count() === 1, "");
  L.done(29); // 9 readings at each of three widths, and the two buttons
});

/* ───────────────────────── L2 · Today: three counts, no month, no mix bar; a count filters; the button opens the drawer ───────────────────────── */
test("TD7 L2 — Today is three count buttons and Open the calendar; no month grid or mix bar on the page", async ({ page }) => {
  const L = new Ledger("L2");
  for (const vp of SIZES) {
    await openTodo(page, vp);
    const r = await page.evaluate(() => {
      const { r: root, qa } = (window as unknown as W).__td5();
      const today = root.querySelector('[data-td7="today"]');
      const page = [...root.querySelectorAll("*")].filter((e) => !e.closest('[data-td52="drawer"]'));
      return {
        today: !!today, counts: today ? [...today.querySelectorAll<HTMLButtonElement>('[data-td7="count"]')].map((b) => b.querySelector(".td7-ctl")?.textContent ?? "") : [],
        month: page.filter((e) => e.matches('[data-td52="month"], [data-td52="day-cell"], [data-td52="cal"]')).length,
        mix: page.filter((e) => e.matches('[data-td52="mix"], [data-td52="mix-seg"]')).length,
        btn: !!today?.querySelector('[data-td7="open-calendar"]'), rows: qa('[data-td5="row"]').length,
      };
    });
    const at = String(vp.width);
    L.check(`${at}: the Today section`, r.today, "");
    L.check(`${at}: three counts, Overdue · Due today · Later`, JSON.stringify(r.counts) === JSON.stringify(["Overdue", "Due today", "Later"]), JSON.stringify(r.counts));
    L.check(`${at}: no month grid on the page`, r.month === 0, String(r.month));
    L.check(`${at}: no mix bar on the page`, r.mix === 0, String(r.mix));
    L.check(`${at}: Open the calendar`, r.btn, "");
  }
  const vp = SIZES[0];
  await openTodo(page, vp);
  const before = await page.evaluate(() => (window as unknown as W).__td5().qa('[data-td5="row"]').length);
  const od = page.locator('[data-todo-v5] [data-td7="count"][data-f="overdue"]');
  L.check("an Overdue figure to press", !(await od.isDisabled()), "");
  await od.click();
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => { const { qa } = (window as unknown as W).__td5(); return { n: qa('[data-td5="row"]').length, late: qa('[data-td5="row"] [data-td7="due"]').every((d) => d.dataset.kind === "late"), pressed: qa('[data-td7="count"][data-f="overdue"]')[0]?.getAttribute("aria-pressed") }; });
  L.check("Overdue sets aria-pressed", after.pressed === "true", String(after.pressed));
  L.check("…and filters the tray to overdue rows", after.n > 0 && after.n <= before && after.late, `${before} → ${after.n}, all late ${after.late}`);
  await od.click();
  await page.waitForTimeout(400);
  const cleared = await page.evaluate(() => { const { qa } = (window as unknown as W).__td5(); return { n: qa('[data-td5="row"]').length, pressed: qa('[data-td7="count"][data-f="overdue"]')[0]?.getAttribute("aria-pressed") }; });
  L.check("a second press clears it", cleared.pressed === "false" && cleared.n === before, JSON.stringify(cleared));
  await page.locator('[data-todo-v5] [data-td7="open-calendar"]').click();
  await page.waitForTimeout(700);
  L.check("Open the calendar opens TrayCalDrawer", await page.evaluate(() => { const d = document.querySelector('[data-td52="drawer"]'); return !!d && d.classList.contains("on"); }), "");
  await page.keyboard.press("Escape");
  L.done(12);
});

/* ───────────────────────── L3 · the order, and the page opens at the top ───────────────────────── */
test("TD7 L3 — header card above Today above Your tray above the sheet; scrollTop 0 on load", async ({ page }) => {
  const L = new Ledger("L3");
  for (const vp of SIZES) {
    await openTodo(page, vp);
    await page.waitForTimeout(1500);
    const at = String(vp.width);
    const [hd, td, tr, sh] = [await box(page, '[data-td7="header"]'), await box(page, '[data-td7="today"]'), await box(page, '[data-td7="tray-head"]'), await box(page, ".td5-sheet")];
    L.check(`${at}: all four present`, !!(hd && td && tr && sh), JSON.stringify({ hd: !!hd, td: !!td, tr: !!tr, sh: !!sh }));
    if (hd && td && tr && sh) {
      L.check(`${at}: header above Today`, hd.b <= td.y, `${hd.b.toFixed(1)} ≤ ${td.y.toFixed(1)}`);
      L.check(`${at}: Today above Your tray`, td.b <= tr.y, `${td.b.toFixed(1)} ≤ ${tr.y.toFixed(1)}`);
      L.check(`${at}: Your tray above the sheet`, tr.b <= sh.y, `${tr.b.toFixed(1)} ≤ ${sh.y.toFixed(1)}`);
    }
    const st = await page.evaluate(() => (window as unknown as W).__td5().sc.scrollTop);
    L.check(`${at}: the page's scrollTop is 0 on load`, st === 0, String(st));
  }
  L.done(10);
});

/* ───────────────────────── L4 · one navy bar ───────────────────────── */
test("TD7 L4 — the navy row holds Find and Filters; no row hints; no filter row outside the sheet; Filters toggles the strip", async ({ page }) => {
  const L = new Ledger("L4");
  for (const vp of SIZES) {
    await openTodo(page, vp);
    const r = await page.evaluate(() => {
      const { r: root, q } = (window as unknown as W).__td5();
      const nav = q('[data-td5="nav"]'), sheet = q(".td5-sheet");
      const kbds = [...root.querySelectorAll("kbd")].filter((k) => (k.closest('[data-td5="nav"]') || k.closest('[data-td5="tray"]')) && !k.closest('[data-td5="find"]') && !k.closest("[data-pin-tip]"));
      return {
        input: !!nav?.querySelector('[data-td7="nav-find"] input'), filters: !!nav?.querySelector('[data-td7="filters"]'),
        kbds: kbds.map((k) => k.textContent), addKbd: !!root.querySelector('[data-td5="add-row"] kbd'),
        outside: [...root.querySelectorAll('[data-td5="filters"], [data-td5="find"]')].filter((e) => !sheet?.contains(e)).length,
      };
    });
    const at = String(vp.width);
    L.check(`${at}: the find input is in the navy row`, r.input, "");
    L.check(`${at}: Filters is in the navy row`, r.filters, "");
    L.check(`${at}: no key hints in the navy row or the tray (the find field's own "/" aside)`, r.kbds.length === 0, JSON.stringify(r.kbds));
    L.check(`${at}: no N on "+ Add a task"`, !r.addKbd, "");
    L.check(`${at}: no find or filter row outside the sheet`, r.outside === 0, String(r.outside));
  }
  const vp = SIZES[1];
  await openTodo(page, vp);
  await toTray(page);
  const fb = page.locator('[data-todo-v5] [data-td7="filters"]');
  await fb.click(); await page.waitForTimeout(300);
  const open = await page.evaluate(() => { const { q } = (window as unknown as W).__td5(); const s = q('[data-td7="strip"]'); return { strip: !!s && s.getBoundingClientRect().height > 0, pills: s ? s.querySelectorAll("[data-td5-pill]").length : 0, exp: q('[data-td7="filters"]')?.getAttribute("aria-expanded"), bg: getComputedStyle(q('[data-td7="filters"]')!).backgroundColor }; });
  L.check("Filters opens the strip under the row, with the pills", open.strip && open.pills >= 4, JSON.stringify(open));
  L.check("…and is pink while open", open.exp === "true" && open.bg === "rgb(245, 226, 218)", `${open.exp} ${open.bg}`);
  await fb.click(); await page.waitForTimeout(300);
  L.check("pressed again, it closes", await page.evaluate(() => !(window as unknown as W).__td5().q('[data-td7="strip"]')), "");
  L.done(13); // 5 readings at each width, and the strip's three
});

/* ───────────────────────── L5 · no tab strip; Set aside from the header, back from the row ───────────────────────── */
test("TD7 L5 — no tablist in the tray; the header opens Set aside; the row names it and leads back", async ({ page }) => {
  const L = new Ledger("L5");
  const vp = SIZES[0];
  await openTodo(page, vp);
  L.check("no role=tablist in the tray", await page.evaluate(() => (window as unknown as W).__td5().qa('[role="tablist"]').length === 0), "");
  await page.locator('[data-todo-v5] [data-td7="header"] [data-td5="aside"]').click();
  await page.waitForTimeout(600);
  const r = await page.evaluate(() => { const { q } = (window as unknown as W).__td5(); return { say: q('[data-td7="aside-say"]')?.textContent ?? null, back: !!q('[data-td7="back-to-tray"]'), list: !!q('[data-td5="aside-list"]') }; });
  L.check("the Set aside view shows", r.list, "");
  L.check('the navy row reads "Set aside: n tasks waiting to come back"', !!r.say && /^Set aside: \d+ tasks? waiting to come back$/.test(r.say), String(r.say));
  L.check("…with Back to your tray", r.back, "");
  await page.locator('[data-todo-v5] [data-td7="back-to-tray"]').click();
  await page.waitForTimeout(500);
  const t = await page.evaluate(() => { const { q, qa } = (window as unknown as W).__td5(); return { list: !!q('[data-td5="aside-list"]'), rows: qa('[data-td5="row"]').length, say: !!q('[data-td7="aside-say"]') }; });
  L.check("Back returns to the tray", !t.list && !t.say && t.rows > 0, JSON.stringify(t));
  L.done(5);
});

/* ───────────────────────── L6 · plain group headings ───────────────────────── */
test("TD7 L6 — bands carry no image, the paper tint; only Your move has the ! mark", async ({ page }) => {
  const L = new Ledger("L6");
  const vp = SIZES[0];
  const read = () => page.evaluate(() => (window as unknown as W).__td5().qa('[data-td5="band"], .td5-band').map((b) => ({
    g: b.closest<HTMLElement>("[data-g]")?.dataset.g ?? "", img: b.querySelectorAll("img").length, bg: getComputedStyle(b).backgroundColor, bang: !!b.querySelector('[data-td7="your-move-mark"]'),
  })));
  await openTodo(page, vp);
  const tray = await read();
  L.check("tray bands found", tray.length >= 2, String(tray.length));
  for (const b of tray) {
    L.check(`${b.g}: no img`, b.img === 0, String(b.img));
    L.check(`${b.g}: the paper tint`, b.bg === "rgb(246, 242, 236)", b.bg);
    L.check(`${b.g}: the ! mark only on Your move`, b.bang === (b.g === "you"), String(b.bang));
  }
  L.check("Your move is among them", tray.some((b) => b.g === "you"), "");
  await page.locator('[data-todo-v5] [data-td7="header"] [data-td5="aside"]').click();
  await page.waitForTimeout(600);
  const aside = await read();
  L.check("Set aside bands found", aside.length >= 1, String(aside.length));
  for (const b of aside) { L.check(`aside ${b.g}: no img`, b.img === 0); L.check(`aside ${b.g}: the paper tint`, b.bg === "rgb(246, 242, 236)", b.bg); L.check(`aside ${b.g}: no ! mark`, !b.bang); }
  L.done(10);
});

/* ───────────────────────── L7 · dates as words ───────────────────────── */
test("TD7 L7 — no ring in any row's date; an overdue date reads '26 Jul' with its age ending 'overdue'", async ({ page }) => {
  const L = new Ledger("L7");
  for (const vp of SIZES) {
    await openTodo(page, vp);
    const r = await page.evaluate(() => {
      const rows = (window as unknown as W).__td5().qa('[data-td5="row"]');
      return {
        n: rows.length, svg: rows.filter((x) => x.querySelector('[data-td5="dial"] svg, .td5-dial')).length,
        late: rows.map((x) => x.querySelector<HTMLElement>('[data-td7="due"][data-kind="late"]')).filter(Boolean).map((d) => ({ dt: d!.querySelector('[data-td7="date-words"]')?.textContent ?? "", age: d!.querySelector('[data-td7="age"]')?.textContent ?? "" })),
        none: rows.map((x) => x.querySelector('[data-td7="due"][data-kind="none"]')).filter(Boolean).map((d) => d!.textContent),
      };
    });
    const at = String(vp.width);
    L.check(`${at}: rows`, r.n > 0, String(r.n));
    L.check(`${at}: no SVG ring in any row's date`, r.svg === 0, String(r.svg));
    L.check(`${at}: overdue rows to read`, r.late.length > 0, String(r.late.length));
    for (const x of r.late.slice(0, 12)) {
      L.check(`${at}: "${x.dt}" is d Mon`, /^\d{1,2} [A-Z][a-z]{2}$/.test(x.dt), x.dt);
      L.check(`${at}: "${x.age}" ends overdue`, /overdue$/.test(x.age), x.age);
    }
    for (const t of r.none) L.check(`${at}: an undated row reads No date`, t === "No date", String(t));
  }
  L.done(12);
});

/* ───────────────────────── L8 · a calmer desk card ───────────────────────── */
test("TD7 L8 — the desk card: no tag or image in its band, no dashes, nothing uppercase", async ({ page }) => {
  const L = new Ledger("L8");
  for (const vp of SIZES) {
    await openTodo(page, vp);
    const r = await page.evaluate(() => {
      const { q } = (window as unknown as W).__td5();
      const card = q('[data-td5="desk"] .td5-dcard:not(.td5-compose)');
      const head = card?.querySelector('[data-td5="desk-head"]');
      const upper = card ? [...card.querySelectorAll<HTMLElement>("*")].filter((e) => e.getBoundingClientRect().height > 0 && getComputedStyle(e).textTransform === "uppercase").map((e) => `${e.className}:${(e.textContent ?? "").trim().slice(0, 20)}`) : ["no card"];
      return { card: !!card, why: !!head?.querySelector(".td5-why"), img: head ? head.querySelectorAll("img").length : -1, dashes: !!q('[data-td5="pos"] .td5-dots'), pos: q('[data-td5="pos"] > span')?.textContent ?? "", upper };
    });
    const at = String(vp.width);
    L.check(`${at}: the desk card`, r.card, "");
    L.check(`${at}: no small-capitals tag in the band`, !r.why, "");
    L.check(`${at}: no img in the band`, r.img === 0, String(r.img));
    L.check(`${at}: no progress dashes`, !r.dashes, "");
    L.check(`${at}: "n of N" stays`, /^\d+ of \d+$/.test(r.pos.trim()), r.pos);
    L.check(`${at}: nothing in the card is text-transform: uppercase`, r.upper.length === 0, JSON.stringify(r.upper));
  }
  L.done(12);
});

/* ───────────────────────── L9 · Done today on one line ───────────────────────── */
test("TD7 L9 — Done today shows its heading line and no slips", async ({ page }) => {
  const L = new Ledger("L9");
  for (const vp of SIZES) {
    await openTodo(page, vp);
    const r = await page.evaluate(() => { const { q } = (window as unknown as W).__td5(); const d = q('[data-td5="desk"] [data-td5="done"]'); return { line: d?.querySelector('[data-td7="done-line"]')?.textContent ?? null, slips: d ? d.querySelectorAll('[data-td5="slip"]').length : -1 }; });
    const at = String(vp.width);
    L.check(`${at}: the heading line`, !!r.line && /^Done today · /.test(r.line), String(r.line));
    L.check(`${at}: no slips`, r.slips === 0, String(r.slips));
  }
  L.done(4);
});

/* ───────────────────────── L10 · pinned ───────────────────────── */
test("TD7 L10 — pinned: header and Today hidden; Find and Filters in the navy row; nothing overflows it", async ({ page }) => {
  const L = new Ledger("L10");
  for (const vp of SIZES) {
    await openTodo(page, vp);
    await page.locator('[data-todo-v5] [data-td52="pin"]').click();
    await page.waitForTimeout(900);
    const r = await page.evaluate(() => {
      const { r: root, q } = (window as unknown as W).__td5();
      const nav = q('[data-td5="nav"]');
      const v = (s: string) => { const e = q(s); return !!e && e.getBoundingClientRect().height > 0; };
      return { pinned: root.closest("[data-pinned]") != null || root.hasAttribute("data-pinned"), header: v('[data-td7="header"]'), today: v('[data-td7="today"]'),
        find: !!nav?.querySelector('[data-td7="nav-find"] input'), filters: !!nav?.querySelector('[data-td7="filters"]'), sw: nav?.scrollWidth ?? -1, cw: nav?.clientWidth ?? -1 };
    });
    const at = String(vp.width);
    L.check(`${at}: pinned`, r.pinned, "");
    L.check(`${at}: the header card is hidden`, !r.header, "");
    L.check(`${at}: Today is hidden`, !r.today, "");
    L.check(`${at}: Find in the navy row`, r.find, "");
    L.check(`${at}: Filters in the navy row`, r.filters, "");
    L.check(`${at}: the row does not overflow (scrollWidth ≤ clientWidth)`, r.sw >= 0 && r.sw <= r.cw, `${r.sw} / ${r.cw}`);
    await page.locator('[data-todo-v5] [data-td52="pin"]').click();
    await page.waitForTimeout(500);
  }
  L.done(12);
});

/* ───────────────────────── LP · "Pick a date" moves a task, with Undo (Nick's ruling: drag is retired) ───────────────────────── */
test("TD7 LP — the date menu's Pick a date moves an own task; today and the past are refused; Undo is exact", async ({ page }) => {
  const L = new Ledger("LP");
  const { db, uid } = await harnessDb();
  const vp = SIZES[0];
  const id = `zz-td7-pick-${Date.now().toString(36)}`;
  dGuards.push(await snapDocs([`tasks/${id}`]));
  await setDoc(doc(db, "users", uid, "tasks", id), { id, userId: uid, text: "Zz td7 pick probe", done: false, dueDate: ymdIn(0), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  await openTodo(page, vp);
  const key = await page.evaluate((id) => (window as unknown as W).__td5().qa('[data-td5="row"]').find((r) => r.dataset.td5Row?.includes(id))?.dataset.td5Row ?? null, id);
  L.check("the probe task is in the tray", !!key, String(key));
  const before = await snapDocs([`tasks/${id}`]);
  if (key) {
    const row = page.locator(`[data-todo-v5] [data-td5-row="${key}"]`).first();
    await row.scrollIntoViewIfNeeded();
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
    L.check("today and the past are refused", days.filter((x) => x.d <= t).every((x) => x.off), JSON.stringify(days.filter((x) => x.d <= t && !x.off)));
    const target = days.find((x) => x.d > t && !x.off)?.d ?? null;
    L.check("a pickable day after today", !!target, String(target));
    if (target) {
      await page.locator(`[data-td52="dial-menu"] [data-day="${target}"]`).click();
      await page.waitForTimeout(1300);
      const after = (await snapDocs([`tasks/${id}`])).get(`tasks/${id}`) as { dueDate?: string } | null;
      L.check(`the pick moves dueDate to ${target}`, after?.dueDate?.slice(0, 10) === target, String(after?.dueDate));
      const tt = await toastText(page);
      L.check("the toast says it moved", !!tt && /Zz td7 pick probe · moved to/.test(tt), String(tt));
      L.check("Undo", await pressUndo(page), "");
      await page.waitForTimeout(1500);
      const back = await snapDocs([`tasks/${id}`]);
      L.check("Undo restores the document byte for byte", canonOf(back.get(`tasks/${id}`)) === canonOf(before.get(`tasks/${id}`)), "");
    }
  }
  L.check("no row is draggable", await page.evaluate(() => (window as unknown as W).__td5().qa('[data-td5="row"]').every((r) => r.getAttribute("draggable") !== "true")), "");
  L.done(10);
});
