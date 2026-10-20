/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v141 — the QC141 locks on the rendered Query Centre, at 1280 × 800 and 1512 × 900 with the shell.
 *
 * L1 sum · L2 disjoint · L3 one filter · L4 export · L5 default · L6 glyphs · L7 menu · L8 band fit · L9 header.
 * (L10, no regression, is the QC140 / QC140.1 / HR1 / CL19.x suites run on the same build.)
 *
 * The source breaks are tests/e2e/qcV141Mutate.sh; each names its lock.
 * ⚠️ EVERY CASE PROVES ITS POPULATION FIRST: a count of zero, or a branch nobody entered, is a red, never a pass.
 * ⚠️ L2 AND L3 TAKE THE SETS FROM THE ROWS, NOT FROM THE FILTER: a row's `data-court` and `data-due` say whether it is
 *    with the agent and past its date (`dueOf` is the expected date of a live query), so the sets are derived beside the
 *    page's own `whereItStands`, never by it — a filter cannot be its own witness.
 * ⚠️ EVERY WORKSPACE PAGE STAYS MOUNTED: every query reads the visible copy.
 * ⚠️ THE GUIDE IS MARKED SEEN for every case (its first-visit open covers the list) and put back after.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { openRoute } from "./measure";

const DIR = "reports/qc-v141";
const SIZES = [{ width: 1280, height: 800 }, { width: 1512, height: 900 }] as const;
const MUT = process.env.QC141_MUTATE ?? "";
const KEYS = ["you", "agent", "quiet", "closed"] as const;

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(lock: string, where: string, ok: unknown, detail: string) { this.rows.push({ lock, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${MUT ? `mut-${MUT}-` : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.lock} · ${r.where} — ${r.detail}`)).toEqual([]);
  }
}

const flags = (a: string) => execSync(`node tests/e2e/guideFlags.mjs --page queries ${a}`, { encoding: "utf8" }).trim().split("\n").pop()!;
let original = "null";
test.beforeAll(() => { original = flags(""); });
test.afterAll(() => { flags(`--restore '${original}'`); });

type Opt = { pinned?: boolean; group?: string; keepView?: boolean; view?: string };
async function open(page: Page, vp: { width: number; height: number }, o: Opt = {}) {
  await page.addInitScript((x: Opt) => {
    try {
      sessionStorage.removeItem("qh.qc.filters");
      if (!x.keepView) localStorage.removeItem("qh.qc.view");
      if (x.view) localStorage.setItem("qh.qc.view", x.view);
      localStorage.setItem("sa.guide.queries", "1");
      localStorage.removeItem("sa.pinList.queries");
    } catch { /* */ }
  }, o);
  await openRoute(page, "/queries", vp);
  await page.locator(".qcv-group[data-v138]").first().waitFor({ timeout: 30_000 });
  await page.locator(".qc138-sheet [data-qcv='row']").first().waitFor({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  await page.mouse.move(5, 5);
  if (o.group && o.group !== (await currentGroup(page))) await pickGroup(page, o.group);
  if (o.pinned) await pin(page, true);
}
const G = ".qcv-group[data-v138]";
const press = (page: Page, sel: string) => page.evaluate((s) => { const e = [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getBoundingClientRect().height > 0); e?.click(); return !!e; }, sel);
const isPinned = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-qc140='pin']")].find((e) => e.getBoundingClientRect().height > 0)?.getAttribute("aria-pressed") === "true");
async function pin(page: Page, on: boolean) {
  if (on !== (await isPinned(page))) { await press(page, "[data-qc140='pin']"); await page.waitForTimeout(900); }
}
const currentGroup = (page: Page) => page.evaluate(() => {
  const n = [...document.querySelectorAll<HTMLElement>("[data-qc140='group'] [data-ltb='group-name']")].find((e) => e.getBoundingClientRect().height > 0)?.textContent ?? "";
  return ({ "Status": "status", "Who it’s with": "attention", "Who it's with": "attention", "Next action": "action", "Submission package": "package", "Not grouped": "none" } as Record<string, string>)[n.trim()] ?? n.trim();
});
async function pickGroup(page: Page, g: string) {
  await press(page, `${G} [data-qc140='group']`);
  await page.waitForTimeout(400);
  await press(page, `[data-qc140='group-opt'][data-g='${g}']`);
  await page.waitForTimeout(900);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
}

/** the card's four counts, the hero's total, and which row is pressed */
const card = (page: Page) => page.evaluate(() => {
  const c = [...document.querySelectorAll<HTMLElement>("[data-qc141='card']")].find((e) => e.getBoundingClientRect().height > 0);
  const t = [...document.querySelectorAll<HTMLElement>("[data-qc138='title-n']")].find((e) => e.getBoundingClientRect().height > 0);
  if (!c) return null;
  const n: Record<string, number> = {}; const on: string[] = [];
  for (const r of c.querySelectorAll<HTMLElement>("[data-qc141='card-row']")) { n[r.dataset.k!] = Number(r.dataset.n); if (r.getAttribute("aria-pressed") === "true") on.push(r.dataset.k!); }
  return { n, on, total: t ? Number(t.textContent) : NaN };
});
const band = (page: Page) => page.evaluate(() => {
  const b = [...document.querySelectorAll<HTMLElement>("[data-qc140='band']")].find((e) => e.getBoundingClientRect().height > 0);
  if (!b) return null;
  const n: Record<string, number> = {}; const on: string[] = [];
  for (const r of b.querySelectorAll<HTMLElement>("[data-qc141='band-set']")) { n[r.dataset.k!] = Number(r.dataset.n); if (r.getAttribute("aria-pressed") === "true") on.push(r.dataset.k!); }
  return { n, on, fit: b.dataset.fit };
});
/** every row the list draws, with what the row itself says about its court and its due date */
const rows = (page: Page) => page.evaluate(() => {
  const g = [...document.querySelectorAll<HTMLElement>(".qcv-group[data-v138]")].find((e) => e.getBoundingClientRect().width > 0)!;
  return [...g.querySelectorAll<HTMLElement>(".qc138-sheet [data-qcv='row']")].map((r) => ({ id: r.dataset.qid!, court: r.dataset.court!, status: r.dataset.status!, due: r.dataset.due ? Number(r.dataset.due) : null, from: r.dataset.from ? Number(r.dataset.from) : null }));
});
/** the four sets, derived from the rows beside the page (see the header) */
/* v141.1 — RE-POINTED: v141 had Gone quiet start AT the reply date. On the nudge window (lib/nudgeWindow, stated
   here from the row's own data-due and data-from, never by calling it): an agent-court row past its date by 28 days or
   less is With you; past that, or 84 days in a stage with no date, it is Gone quiet. */
const DAYMS = 86_400_000;
const setOf = (r: { court: string; status: string; due: number | null; from?: number | null }, now: number): string => {
  if (r.court === "you") return "you";
  if (r.court === "closed") return "closed";
  if (r.due != null) return r.due < now ? ((now - r.due) / DAYMS > 28 ? "quiet" : "you") : "agent";
  return r.from != null && (now - r.from) / DAYMS > 84 ? "quiet" : "agent";
};
const chipN = (page: Page) => page.evaluate(() => Number([...document.querySelectorAll<HTMLElement>("[data-qc140='filters']")].find((e) => e.getBoundingClientRect().height > 0)?.dataset.n ?? NaN));
/** an svg's drawing with its data attributes stripped, so a lock compares the marks and not their labels */
const drawing = (svg: string) => svg.replace(/\sdata-[a-z0-9-]+="[^"]*"/g, "").replace(/\sclass="[^"]*"/g, "");
const intersects = (a: DOMRectLike, b: DOMRectLike) => a.width > 0 && b.width > 0 && a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
type DOMRectLike = { left: number; right: number; top: number; bottom: number; width: number; height: number };

test.describe("Query Centre v141", () => {
  test("L1 · sum: the card's four counts sum to the hero total; the band's four equal the card's", async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger("L1");
    for (const vp of SIZES) {
      await open(page, vp);
      const c = await card(page);
      L.check("L1", `${vp.width} population`, c && c.total > 0 && KEYS.every((k) => Number.isFinite(c.n[k])), JSON.stringify(c));
      if (!c) continue;
      const sum = KEYS.reduce((a, k) => a + c.n[k], 0);
      L.check("L1", `${vp.width} card sums to the total`, sum === c.total, `${JSON.stringify(c.n)} = ${sum} vs ${c.total}`);
      const all = await rows(page);
      L.check("L1", `${vp.width} the total is the rows'`, all.length === c.total, `${all.length} rows vs ${c.total}`);
      await pin(page, true);
      const b = await band(page);
      L.check("L1", `${vp.width} band population`, !!b && KEYS.every((k) => Number.isFinite(b.n[k])), JSON.stringify(b));
      L.check("L1", `${vp.width} band equals card`, !!b && KEYS.every((k) => b.n[k] === c.n[k]), `${JSON.stringify(b?.n)} vs ${JSON.stringify(c.n)}`);
      await pin(page, false);
    }
    L.done(10);
  });

  test("L2 · disjoint: every query is in exactly one set, and each set is the rows' own", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("L2");
    for (const vp of SIZES) {
      await open(page, vp);
      const now = Date.now();
      const all = await rows(page);
      const c = await card(page);
      L.check("L2", `${vp.width} population`, all.length > 0 && !!c, `${all.length} rows`);
      const seen = new Map<string, string[]>();
      for (const k of KEYS) {
        await press(page, `[data-qc141='card-row'][data-k='${k}']`);
        await page.waitForTimeout(700);
        const shown = await rows(page);
        for (const r of shown) seen.set(r.id, [...(seen.get(r.id) ?? []), k]);
        const want = all.filter((r) => setOf(r, now) === k).map((r) => r.id).sort();
        L.check("L2", `${vp.width} ${k}: the filter shows exactly the rows' own set`, JSON.stringify(shown.map((r) => r.id).sort()) === JSON.stringify(want),
          `${shown.length} shown vs ${want.length} from the rows`);
        L.check("L2", `${vp.width} ${k}: its count is the card's`, c?.n[k] === want.length, `${c?.n[k]} vs ${want.length}`);
        await press(page, `[data-qc141='card-row'][data-k='${k}']`);
        await page.waitForTimeout(500);
      }
      const multi = [...seen].filter(([, ks]) => ks.length !== 1);
      L.check("L2", `${vp.width} every id in exactly one set`, multi.length === 0 && seen.size === all.length, `${seen.size}/${all.length}; in two or more: ${multi.slice(0, 5).map(([id, ks]) => `${id}:${ks}`).join(" ")}`);
      L.check("L2", `${vp.width} every set entered`, KEYS.filter((k) => (c?.n[k] ?? 0) > 0).length >= 3, JSON.stringify(c?.n));
    }
    L.done(22);
  });

  test("L3 · one filter: the card sets it; the list, the Filters chip and the band read it; Clear all clears all three", async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger("L3");
    for (const vp of SIZES) {
      await open(page, vp);
      const now = Date.now();
      const all = await rows(page);
      const want = all.filter((r) => setOf(r, now) === "quiet").map((r) => r.id).sort();
      L.check("L3", `${vp.width} population`, want.length > 0, `${want.length} gone quiet`);
      await press(page, "[data-qc141='card-row'][data-k='quiet']");
      await page.waitForTimeout(800);
      const shown = (await rows(page)).map((r) => r.id).sort();
      L.check("L3", `${vp.width} (a) the list is exactly that set`, JSON.stringify(shown) === JSON.stringify(want), `${shown.length} vs ${want.length}`);
      L.check("L3", `${vp.width} (b) the Filters chip counts one`, (await chipN(page)) === 1, `${await chipN(page)}`);
      const c1 = await card(page);
      L.check("L3", `${vp.width} the card shows it pressed`, JSON.stringify(c1?.on) === '["quiet"]', JSON.stringify(c1?.on));
      await pin(page, true);
      const b = await band(page);
      L.check("L3", `${vp.width} (c) the band's Gone quiet is selected`, JSON.stringify(b?.on) === '["quiet"]', JSON.stringify(b?.on));
      await press(page, "[data-qc140='applied-clear']");
      await page.waitForTimeout(800);
      const b2 = await band(page);
      L.check("L3", `${vp.width} (d) Clear all: the band`, b2 && b2.on.length === 0, JSON.stringify(b2?.on));
      L.check("L3", `${vp.width} (d) Clear all: the chip`, (await chipN(page)) === 0, `${await chipN(page)}`);
      await pin(page, false);
      const c2 = await card(page);
      L.check("L3", `${vp.width} (d) Clear all: the card`, c2 && c2.on.length === 0, JSON.stringify(c2?.on));
      L.check("L3", `${vp.width} (d) Clear all: the list`, (await rows(page)).length === all.length, `${(await rows(page)).length} vs ${all.length}`);
    }
    L.done(18);
  });

  test("L4 · export: with Gone quiet set, \"Export {v} queries\" has v = the set's count", async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger("L4");
    for (const vp of SIZES) {
      await open(page, vp);
      const c = await card(page);
      L.check("L4", `${vp.width} population`, (c?.n.quiet ?? 0) > 0 && (c?.n.quiet ?? 0) < (c?.total ?? 0), JSON.stringify(c));
      await press(page, "[data-qc141='card-row'][data-k='quiet']");
      await page.waitForTimeout(700);
      await press(page, `${G} [data-qc140='filters']`);
      await page.waitForTimeout(700);
      const label = await page.evaluate(() => document.querySelector<HTMLElement>("[data-qc140='filter-export']")?.textContent ?? "");
      L.check("L4", `${vp.width} the export names the set's count`, label.trim() === `↓ Export ${c?.n.quiet} ${c?.n.quiet === 1 ? "query" : "queries"}`, `"${label}" vs ${c?.n.quiet}`);
      const w = await page.evaluate(() => document.querySelector<HTMLElement>("[data-qc141='where-opt'][data-k='quiet']")?.getAttribute("aria-checked"));
      L.check("L4", `${vp.width} the menu's Where it stands shows it`, w === "true", `${w}`);
      await page.keyboard.press("Escape");
    }
    L.done(6);
  });

  test("L5 · default: first load is grouped by Status with no ✕; a saved Next action is restored", async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger("L5");
    for (const vp of SIZES) {
      await open(page, vp);
      const r = await page.evaluate(() => {
        const chip = [...document.querySelectorAll<HTMLElement>("[data-qc140='group-chip']")].find((e) => e.getBoundingClientRect().height > 0);
        return { name: chip?.querySelector("[data-ltb='group-name']")?.textContent ?? null, x: !!chip?.querySelector("[data-qc140='group-reset']"), on: chip?.hasAttribute("data-on") ?? null,
          bands: [...document.querySelectorAll<HTMLElement>(".qc138-sheet [data-qcv='gband']")].filter((e) => e.getBoundingClientRect().height > 0).length };
      });
      L.check("L5", `${vp.width} population`, r.name !== null && r.bands > 0, JSON.stringify(r));
      L.check("L5", `${vp.width} grouped by Status`, r.name === "Status", `${r.name}`);
      L.check("L5", `${vp.width} no ✕ and no on state`, !r.x && r.on === false, JSON.stringify(r));
      const view = await page.evaluate(() => localStorage.getItem("qh.qc.view"));
      const saved = JSON.stringify({ ...(view ? JSON.parse(view) : { v: 1, sort: { key: "due", reversed: false }, density: "comfortable" }), group: "action" });
      const p2 = await page.context().newPage();
      await open(p2, vp, { keepView: true, view: saved });
      const n2 = await p2.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-qc140='group-chip']")].find((e) => e.getBoundingClientRect().height > 0)?.querySelector("[data-ltb='group-name']")?.textContent ?? null);
      L.check("L5", `${vp.width} a saved Next action is restored`, n2 === "Next action", `${n2}`);
      await p2.close();
    }
    L.done(8);
  });

  test("L6 · glyphs: Status — a glyph and a badge on every button, no two drawings alike; Package — no svg anywhere in the row or its menu", async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger("L6");
    for (const vp of SIZES) {
      await open(page, vp, { group: "status" });
      const s = await page.evaluate(() => {
        const nav = [...document.querySelectorAll<HTMLElement>("[data-qc140='jump']")].find((e) => e.getBoundingClientRect().height > 0)!;
        return { mode: nav.dataset.mode, btns: [...nav.querySelectorAll<HTMLElement>("[data-qc140='jump-btn']")].map((b) => ({ k: b.dataset.gkey, svg: b.querySelector("svg")?.outerHTML ?? "", img: !!b.querySelector("img"), badge: b.querySelector("[data-qc141='jump-badge']")?.textContent ?? "" })) };
      });
      L.check("L6", `${vp.width} population`, s.mode === "glyph" && s.btns.length >= 3, `${s.mode} · ${s.btns.length}`);
      L.check("L6", `${vp.width} Status: every button has a glyph and a badge`, s.btns.every((b) => (b.svg || b.img) && /^\d+$/.test(b.badge)), s.btns.map((b) => `${b.k}:${b.svg ? "svg" : b.img ? "img" : "-"}:${b.badge}`).join(" "));
      const drawings = s.btns.map((b) => drawing(b.svg));
      const dup = drawings.filter((d, i) => drawings.indexOf(d) !== i);
      L.check("L6", `${vp.width} Status: no two glyphs alike`, dup.length === 0, `${dup.length} duplicate(s) among ${s.btns.map((b) => b.k).join(", ")}`);
      L.check("L6", `${vp.width} No response and Passed both drawn`, s.btns.some((b) => b.k === "No Response") && s.btns.some((b) => b.k === "Rejected"), s.btns.map((b) => b.k).join(", "));
      await pickGroup(page, "package");
      const p = await page.evaluate(() => {
        const nav = [...document.querySelectorAll<HTMLElement>("[data-qc140='jump']")].find((e) => e.getBoundingClientRect().height > 0)!;
        return { mode: nav.dataset.mode, n: nav.querySelectorAll("[data-qc140='jump-btn']").length, svgs: [...nav.querySelectorAll<HTMLElement>("[data-qc140='jump-btn']")].reduce((a, b) => a + b.querySelectorAll("svg").length, 0) };
      });
      L.check("L6", `${vp.width} Package population`, p.mode === "name" && p.n > 1, JSON.stringify(p));
      L.check("L6", `${vp.width} Package: no svg in any button`, p.svgs === 0, `${p.svgs}`);
      if (await press(page, `${G} [data-qc140='jump-more']:not([hidden])`)) {
        await page.waitForTimeout(500);
        const m = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-qc140='jump-item']")].map((r) => r.querySelectorAll("svg").length));
        L.check("L6", `${vp.width} Package menu population`, m.length > 0, `${m.length}`);
        L.check("L6", `${vp.width} Package: no svg in any menu row`, m.every((x) => x === 0), JSON.stringify(m));
        await page.keyboard.press("Escape");
      } else L.check("L6", `${vp.width} Package menu population`, false, "no +N more");
    }
    L.done(16);
  });

  test("L7 · menu: in Package and Next action, no row's glyph or badge reaches its name", async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger("L7");
    for (const vp of SIZES) for (const g of ["package", "action"]) {
      await open(page, vp, { group: g });
      const opened = await press(page, `${G} [data-qc140='jump-more']:not([hidden])`);
      await page.waitForTimeout(500);
      const m = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-qc140='jump-item']")].map((r) => {
        const rect = (e: Element | null) => { if (!e) return null; const b = e.getBoundingClientRect(); return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, width: b.width, height: b.height }; };
        const mark = r.querySelector("[data-qc141='menu-mark'] [data-qc140='jump-mark']");
        return { name: rect(r.querySelector("[data-qc141='menu-name']")), mark: rect(mark), badge: rect(r.querySelector("[data-qc141='menu-mark'] .qc140-jbd")), text: r.innerText.replace(/\s+/g, " ") };
      }));
      L.check("L7", `${vp.width} ${g} population`, opened && m.length > 0 && m.every((x) => x.name), `${m.length} rows`);
      if (g === "action") L.check("L7", `${vp.width} action: rows with a glyph and a badge exist`, m.some((x) => x.mark && x.badge), m.map((x) => `${x.text}:${x.mark ? "g" : "-"}${x.badge ? "b" : ""}`).join(" "));
      const bad = m.filter((x) => (x.mark && intersects(x.mark, x.name!)) || (x.badge && intersects(x.badge, x.name!)));
      L.check("L7", `${vp.width} ${g}: no glyph or badge meets its name`, bad.length === 0, bad.map((x) => `${x.text} mark ${Math.round(x.mark?.right ?? 0)}/badge ${Math.round(x.badge?.right ?? 0)} vs name ${Math.round(x.name!.left)}`).join(" ‖ "));
      await page.keyboard.press("Escape");
    }
    L.done(10);
  });

  test("L8 · band fit: pinned, no two of the band's children overlap, and no two of the breakdown's sets", async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger("L8");
    for (const vp of SIZES) {
      await open(page, vp, { pinned: true });
      const r = await page.evaluate(() => {
        const b = [...document.querySelectorAll<HTMLElement>("[data-qc140='band']")].find((e) => e.getBoundingClientRect().height > 0);
        if (!b) return null;
        const rect = (e: Element) => { const x = e.getBoundingClientRect(); return { left: x.left, right: x.right, top: x.top, bottom: x.bottom, width: x.width, height: x.height }; };
        /* a set's 9px side padding is invisible until hovered or pressed and overlaps its neighbour's by design (the
           mock's -9 margin): the sets are measured by their content boxes */
        const ink = (e: HTMLElement) => { const x = rect(e); const cs = getComputedStyle(e); const l = x.left + parseFloat(cs.paddingLeft), rr = x.right - parseFloat(cs.paddingRight); return { ...x, left: l, right: rr, width: rr - l }; };
        return { fit: b.dataset.fit, band: rect(b), kids: [...b.children].map((c) => ({ c: (c as HTMLElement).className.split(" ")[0], r: rect(c) })),
          sets: [...b.querySelectorAll<HTMLElement>("[data-qc141='band-set']")].map((s) => ({ k: s.dataset.k, r: ink(s) })) };
      });
      L.check("L8", `${vp.width} population`, !!r && r.kids.length >= 4 && r.sets.length === 4, JSON.stringify(r?.kids.map((k) => k.c)));
      if (!r) continue;
      const kidHits: string[] = [];
      for (let i = 0; i < r.kids.length; i++) for (let j = i + 1; j < r.kids.length; j++) if (intersects(r.kids[i].r, r.kids[j].r)) kidHits.push(`${r.kids[i].c}×${r.kids[j].c}`);
      L.check("L8", `${vp.width} no two children overlap (fit ${r.fit})`, kidHits.length === 0, kidHits.join(" "));
      L.check("L8", `${vp.width} every child inside the band`, r.kids.every((k) => k.r.right <= r.band.right + 0.5), r.kids.map((k) => `${k.c}:${Math.round(k.r.right)}`).join(" ") + ` / ${Math.round(r.band.right)}`);
      const setHits: string[] = [];
      for (let i = 0; i < r.sets.length; i++) for (let j = i + 1; j < r.sets.length; j++) if (intersects(r.sets[i].r, r.sets[j].r)) setHits.push(`${r.sets[i].k}×${r.sets[j].k}`);
      L.check("L8", `${vp.width} no two sets overlap`, setHits.length === 0, setHits.join(" ") + " " + r.sets.map((s) => `${s.k}[${Math.round(s.r.left)},${Math.round(s.r.right)}]`).join(" "));
      /* a set that runs out of the breakdown lies over Heard back without any two CHILDREN overlapping, so each set is
         also held inside the breakdown's box and clear of every other child */
      const bk = r.kids.find((k) => k.c === "qc141-bk");
      const out = r.sets.filter((x) => !bk || x.r.left < bk.r.left - 0.5 || x.r.right > bk.r.right + 0.5).map((x) => x.k);
      const over = r.sets.flatMap((x) => r.kids.filter((k) => k.c !== "qc141-bk" && intersects(x.r, k.r)).map((k) => `${x.k}×${k.c}`));
      L.check("L8", `${vp.width} every set inside the breakdown, clear of the other children`, !!bk && out.length === 0 && over.length === 0,
        `outside: ${out.join(" ")} · over: ${over.join(" ")} · bk [${Math.round(bk?.r.left ?? 0)},${Math.round(bk?.r.right ?? 0)}]`);
    }
    L.done(10);
  });

  test("L9 · header: the card's width and right inset are the H6 tokens; it is no taller than the stack", async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger("L9");
    for (const vp of SIZES) {
      await open(page, vp);
      const r = await page.evaluate(() => {
        const vis = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0);
        const c = vis("[data-qc141='card']"), row = vis("[data-qc138='header-row']"), stack = vis("[data-qc138='title-block']");
        if (!c || !row || !stack) return null;
        const probe = document.createElement("div");
        probe.style.cssText = "position:absolute;visibility:hidden;width:var(--hero-right-w);height:var(--hero-stack-h)";
        row.appendChild(probe);
        const tok = { w: probe.getBoundingClientRect().width, h: probe.getBoundingClientRect().height };
        probe.remove();
        const cb = c.getBoundingClientRect(), rb = row.getBoundingClientRect(), sb = stack.getBoundingClientRect();
        return { tok, card: { w: cb.width, h: cb.height, right: cb.right, top: cb.top, bottom: cb.bottom }, rowRight: rb.right - parseFloat(getComputedStyle(row).paddingRight), stack: { h: sb.height, top: sb.top, bottom: sb.bottom } };
      });
      L.check("L9", `${vp.width} population`, !!r && r.tok.w > 0 && r.card.h > 0, JSON.stringify(r));
      if (!r) continue;
      L.check("L9", `${vp.width} width = --hero-right-w`, Math.abs(r.card.w - r.tok.w) <= 0.5, `${r.card.w} vs ${r.tok.w}`);
      L.check("L9", `${vp.width} right edge = the row's inset`, Math.abs(r.card.right - r.rowRight) <= 0.5, `${r.card.right} vs ${r.rowRight}`);
      L.check("L9", `${vp.width} no taller than the stack`, r.card.h <= r.stack.h + 0.5 && r.card.h <= r.tok.h + 0.5, `${r.card.h} vs stack ${r.stack.h} / token ${r.tok.h}`);
      L.check("L9", `${vp.width} centred on the stack`, Math.abs((r.card.top + r.card.bottom) / 2 - (r.stack.top + r.stack.bottom) / 2) <= 1, `${(r.card.top + r.card.bottom) / 2} vs ${(r.stack.top + r.stack.bottom) / 2}`);
    }
    L.done(10);
  });
});
