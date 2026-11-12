/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v27 (design-refs/contact-list-v27/contact-list-v27.html) — the CL27 locks, on the rendered page at 1512
 * and 1280 over the harness account's list.
 *
 *   H1  the header: three columns (the bird, the title block, List health), the bird mirrored, on the page's ground
 *   H2  List health: v26's block, its text and hooks (held at unit level against v26's own render: contactV27 tests)
 *   R1  the rail: 268px, beside the list, still in view after 1200px of scroll
 *   R2  every rail control: the rows it leaves are exactly the count it showed (lib/contactV27's counts are the list's own
 *       predicate, `matchesContactFilters` + `inSet`), the population proven first; a tile / genre leaves only its rows
 *   R3  Reset restores the whole list; the band has no Filters button; the column headings stick
 *
 * ⚠️ EVERY READ STARTS FROM THE VISIBLE COPY (every workspace page stays mounted) — `.aglist` is the Contact list's.
 * ⚠️ `CL27_MUTATE=<lock>` applies a named break in the page; a lock that stays green under its own break is unproved.
 */
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openCl26, cssBreak, type VP } from "./cl26Lib";

test.describe.configure({ mode: "serial" });
const SIZES: VP[] = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }];
const VIS = ".aglist";
const MUT = process.env.CL27_MUTATE ?? "";
const T = { timeout: 8000 };
const near = (a: number, b: number, tol = 2) => Math.abs(a - b) <= tol;

const DIR = "reports/contact-list-v27";
const BASE = process.env.CL27_BASE === "1";
/** the readings, written to the report's ledger (base-/mut- prefixed for a red-before or a mutation run) */
class L27 {
  rows: { where: string; ok: boolean; detail: string }[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${BASE ? "base-" : ""}${MUT ? `mut-${MUT}-` : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ CL27-${this.name} · ${r.where} — ${r.detail}`);
    console.log(`[CL27-${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}

async function mut(page: Page, lock: string) {
  if (MUT !== lock) return;
  switch (lock) {
    case "H1": await cssBreak(page, ".cl27-art img{transform:none !important}"); break;
    case "R1": await cssBreak(page, ".cl27 .qc153-rail{position:static !important}"); break;
    case "R2": await page.evaluate(() => {
      /* the count drifts from what the list shows: every pressable control claims one more row than it leaves */
      for (const b of document.querySelectorAll<HTMLElement>(".aglist [data-cl27='rail'] [data-n]")) b.dataset.n = String(Number(b.dataset.n) + 1);
    }); break;
    case "R3": await cssBreak(page, ".cl26-pin{position:static !important}"); break;
  }
}

const scroller = (page: Page) => page.evaluate(() => {
  const sc = [...document.querySelectorAll<HTMLElement>(".agl-wpg .wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0)!;
  return { top: sc.getBoundingClientRect().top, h: sc.clientHeight };
});
const scrollTo = (page: Page, y: number) => page.evaluate((top) => {
  const sc = [...document.querySelectorAll<HTMLElement>(".agl-wpg .wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0)!;
  sc.scrollTop = top;
  return sc.scrollTop;
}, y);
/** what the list shows: its rows, the band's count, each row's stand and text */
const shown = (page: Page) => page.evaluate(() => {
  const card = [...document.querySelectorAll<HTMLElement>(".aglist [data-cl26='card']")].find((e) => e.getBoundingClientRect().height > 0)!;
  const rows = [...card.querySelectorAll<HTMLElement>("[data-cl26='row']")];
  return {
    n: rows.length, count: Number(card.querySelector<HTMLElement>("[data-cl26='count']")?.dataset.n ?? "-1"),
    stands: [...new Set(rows.map((r) => r.dataset.k ?? ""))], texts: rows.map((r) => (r.textContent ?? "").toLowerCase()),
  };
});

/* ═════════ H1 · the header ═════════ */
test("CL27-H1 · the open header: the mirrored bird, the title block, List health — three columns on the page's ground", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new L27("H1");
  for (const vp of SIZES) {
    await openCl26(page, vp);
    await mut(page, "H1");
    const r = await page.evaluate(() => {
      const hd = [...document.querySelectorAll<HTMLElement>(".aglist [data-cl27='header']")].find((e) => e.getBoundingClientRect().height > 0);
      if (!hd) return null;
      const box = (s: string) => { const e = hd.querySelector<HTMLElement>(s); if (!e) return null; const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom, w: b.width }; };
      const img = hd.querySelector<HTMLImageElement>("[data-cl27='art'] img")!;
      const t = hd.querySelector<HTMLElement>("[data-cl27='title']")!;
      return {
        cols: getComputedStyle(hd).gridTemplateColumns.split(" ").length, bg: getComputedStyle(hd).backgroundColor,
        art: box("[data-cl27='art']"), main: box("[data-cl27='main']"), health: box("[data-cl26='health']"),
        /* re-pointed (principles v2): List health's transform (the nudge, CLP18/CLP20), taken back out for the column order */
        nudge: new DOMMatrixReadOnly(((t) => (t === "none" ? undefined : t))(getComputedStyle(hd.querySelector<HTMLElement>("[data-cl27='health']")!).transform)).m41,
        src: img.getAttribute("src"), transform: getComputedStyle(img).transform, imgW: img.getBoundingClientRect().width,
        title: t.textContent?.trim(), titleFont: getComputedStyle(t).fontFamily, titleSize: getComputedStyle(t).fontSize,
        forLine: hd.querySelector("[data-clh2='sub']")?.textContent?.replace(/\s+/g, " ").trim(),
        add: hd.querySelectorAll("[data-cl26='add'][data-cl24='add'][data-cl17='add']").length,
        disc: hd.querySelectorAll("[data-cl26='discover'][data-cl24='discover']").length,
        addBg: getComputedStyle(hd.querySelector<HTMLElement>("[data-cl26='add']")!).backgroundColor,
      };
    });
    L.check(`${vp.width} header found`, !!r, "no header");
    if (!r) continue;
    L.check(`${vp.width} three columns`, r.cols === 3, String(r.cols));
    L.check(`${vp.width} on the page's ground`, r.bg === "rgba(0, 0, 0, 0)", r.bg);
    L.check(`${vp.width} art | title block | List health, left to right`, !!(r.art && r.main && r.health && r.art.r <= r.main.l && r.main.r <= r.health.l - r.nudge + 1), JSON.stringify([r.art, r.main, r.health, r.nudge]));
    /* re-pointed by Contact list header v2: the drawing is 160 wide */
    L.check(`${vp.width} the binoculars bird`, String(r.src).includes("discover-binoculars-bird.webp") && near(r.imgW, 160, 1), `${r.src} ${r.imgW}`);
    L.check(`${vp.width} mirrored`, r.transform === "matrix(-1, 0, 0, 1, 0, 0)", r.transform);
    /* re-pointed by Contact list principles v1 (CLP2): the live headline in the typewriter at 36px, the count line beneath */
    /* re-pointed by Contact list header v2 (CLH2): the count on file in the typewriter at 36px, the subheader beneath */
    L.check(`${vp.width} title`, /^(?:\d+ agents? on file|\d agents? so far\. (?:Not|Neither|None) queried yet\.)$/.test(String(r.title)) && /Special Elite/.test(r.titleFont) && r.titleSize === "36px", `${r.title} · ${r.titleFont.slice(0, 20)} ${r.titleSize}`);
    L.check(`${vp.width} the subheader`, /^(?:\d+ not yet queried|All of them queried|Already queried)$/.test(String(r.forLine)), String(r.forLine));
    L.check(`${vp.width} one button (header v2), its hooks kept; Add is navy`, r.add === 1 && r.disc === 0 && r.addBg === "rgb(42, 58, 82)", `${r.add}/${r.disc} ${r.addBg}`);
  }
  L.done(18);
});

/* ═════════ R1 · the rail ═════════ */
test("CL27-R1 · the rail: 268px, beside the list, the band has no Filters; still in view after 1200px of scroll", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new L27("R1");
  for (const vp of SIZES) {
    await openCl26(page, vp);
    await mut(page, "R1");
    const at = async () => page.evaluate(() => {
      const rail = [...document.querySelectorAll<HTMLElement>(".aglist [data-cl27='rail']")].find((e) => e.getBoundingClientRect().height > 0);
      const card = [...document.querySelectorAll<HTMLElement>(".aglist [data-cl26='card']")].find((e) => e.getBoundingClientRect().height > 0);
      if (!rail || !card) return null;
      const r = rail.getBoundingClientRect(), c = card.getBoundingClientRect();
      return {
        w: r.width, l: r.left, t: r.top, b: r.bottom, cardL: c.left, gap: c.left - r.right,
        secs: [...rail.querySelectorAll<HTMLElement>("[data-cl27='rail-sec']")].map((s) => s.dataset.k),
        filters: document.querySelectorAll(".aglist [data-cl26='filters']").length,
      };
    });
    const a = await at();
    L.check(`${vp.width} rail found`, !!a, "no rail");
    if (!a) continue;
    L.check(`${vp.width} 268 wide`, near(a.w, 268, 0.5), String(a.w));
    L.check(`${vp.width} the list starts 28 after it`, near(a.gap, 28, 1), String(a.gap));
    /* re-pointed by Contact list principles v1: Where they stand and Submissions sit after Genres, behind More filters */
    L.check(`${vp.width} sections in order`, JSON.stringify(a.secs) === JSON.stringify(["quick", "genres", "where", "subs"]), JSON.stringify(a.secs));
    L.check(`${vp.width} no Filters button in the band`, a.filters === 0, String(a.filters));
    const sc = await scroller(page);
    const y = await scrollTo(page, 1200);
    await page.waitForTimeout(400);
    L.check(`${vp.width} the page scrolled 1200 (precondition)`, y === 1200, String(y));
    const b = await at();
    /* re-pointed by Contact list header v2: scrolled this far the slim pinned row (48px) shows, and the rail sits under it
       (`--pin-cover` 12 + 48, then its own 12) — so within 40px of the row's foot, not of the scroller's top */
    L.check(`${vp.width} still in view after the scroll`, !!b && b.t >= sc.top - 1 && b.t <= sc.top + 48 + 40 && b.b > sc.top + 200, JSON.stringify({ top: b?.t, sc: sc.top }));
  }
  L.done(14);
});

/** principles v1 — Where they stand and Submissions are behind More filters: unfold it before pressing them */
const openMore = async (page: Page) => {
  const m = page.locator(`${VIS} [data-clp='more'][aria-expanded='false']`);
  if (await m.count()) { await m.first().click(T); await page.waitForTimeout(200); }
};

/* ═════════ R2 · every control is the list's own count ═════════ */
type Ctl = { sel: string; k: string; n: number };
test("CL27-R2 · every rail control leaves exactly the rows it counted; tiles and genres leave only theirs; Reset restores the list", async ({ page }) => {
  test.setTimeout(600_000);
  const L = new L27("R2");
  const vp = SIZES[0];
  await openCl26(page, vp);
  const whole = await shown(page);
  L.check("population: the list has rows", whole.n > 10, String(whole.n));
  const ctls = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".aglist [data-cl27='rail'] :is([data-cl27='pick'], [data-cl27='tile'], [data-cl27='genre'], [data-cl27='open-only'])")]
    .filter((b) => !(b as HTMLButtonElement).disabled)
    .map((b) => ({ sel: b.dataset.cl27 ?? "", k: b.dataset.k ?? "", n: Number(b.dataset.n) })));
  L.check("population: pressable controls of every kind", ["pick", "tile", "genre", "open-only"].every((s) => ctls.some((c) => c.sel === s)), JSON.stringify([...new Set(ctls.map((c) => c.sel))]));
  /* no rail to press: report it as a reading, never crash on the first missing control */
  if (!ctls.length) { L.done(2); return; }
  /* every control the account can press, at most eight genres */
  const run: Ctl[] = [...ctls.filter((c) => c.sel !== "genre"), ...ctls.filter((c) => c.sel === "genre").slice(0, 8)];
  for (const c of run) {
    await openCl26(page, vp);
    await openMore(page);
    await mut(page, "R2");
    const sel = `${VIS} [data-cl27='${c.sel}']${c.k ? `[data-k='${c.k}']` : ""}`;
    const claimed = Number(await page.locator(sel).first().getAttribute("data-n"));
    await page.locator(sel).first().click(T);
    await page.waitForTimeout(500);
    const s = await shown(page);
    const label = `${c.sel}${c.k ? `:${c.k}` : ""}`;
    L.check(`${label} rows = its count (${claimed})`, s.n === claimed && s.count === s.n, `${s.n} rows, band ${s.count}, control said ${claimed}`);
    if (c.sel === "tile") L.check(`${label} leaves only its group`, s.stands.every((k) => k === c.k), JSON.stringify(s.stands));
    if (c.sel === "genre") {
      const word = (await page.locator(sel).first().locator(".qc153-tx").textContent())?.replace("✓", "").trim().toLowerCase() ?? "";
      L.check(`${label} every row carries the genre`, s.texts.every((t) => t.includes(word)), word);
    }
    const on = await page.locator(`${VIS} [data-cl27='rail-on']`).textContent().catch(() => "");
    L.check(`${label} the rail says what is on`, /^\d+ on$/.test(String(on).trim()), String(on));
    await page.locator(`${VIS} [data-cl27='rail-reset']`).first().click(T);
    await page.waitForTimeout(500);
    const back = await shown(page);
    L.check(`${label} Reset restores the whole list`, back.n === whole.n && (await page.locator(`${VIS} [data-cl26='applied']`).count()) === 0, `${back.n} vs ${whole.n}`);
  }
  /* a second press on a tile clears it */
  await openCl26(page, vp);
  await openMore(page);
  const t = `${VIS} [data-cl27='tile'][data-k='${(ctls.find((c) => c.sel === "tile") ?? { k: "none" }).k}']`;
  await page.locator(t).first().click(T); await page.waitForTimeout(400);
  await page.locator(t).first().click(T); await page.waitForTimeout(400);
  L.check("a second click on a tile clears it", (await shown(page)).n === whole.n, "the tile is still on");
  L.done(4 + run.length * 3);
  expect(run.length).toBeGreaterThan(8);
});

/* ═════════ R3 · the list's headings still stick ═════════ */
test("CL27-R3 · the column headings stick under the band in the narrower column", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new L27("R3");
  for (const vp of SIZES) {
    await openCl26(page, vp);
    await mut(page, "R3");
    const sc = await scroller(page);
    const y = await scrollTo(page, 1200);
    await page.waitForTimeout(500);
    const r = await page.evaluate(() => {
      const card = [...document.querySelectorAll<HTMLElement>(".aglist [data-cl26='card']")].find((e) => e.getBoundingClientRect().height > 0)!;
      const h = card.querySelector<HTMLElement>("[data-cl26='heads']")!.getBoundingClientRect();
      const band = card.querySelector<HTMLElement>("[data-cl26='band']")!.getBoundingClientRect();
      return { headsTop: h.top, headsH: h.height, bandTop: band.top, cardTop: card.getBoundingClientRect().top };
    });
    L.check(`${vp.width} scrolled (precondition)`, y === 1200 && r.cardTop < sc.top - 200, `${y} · card at ${r.cardTop}`);
    L.check(`${vp.width} the band is held at the scroller's top`, r.bandTop >= sc.top && r.bandTop <= sc.top + 16, `${r.bandTop} vs ${sc.top}`);
    L.check(`${vp.width} the headings are on screen under it`, r.headsTop > r.bandTop && r.headsTop < sc.top + 200 && r.headsH > 20, `${r.headsTop}`);
  }
  L.done(6);
});

/* ═════════ the report's screens ═════════ */
test("CL27 shots — the top of the page, and scrolled with a filter on", async ({ page }) => {
  test.skip(!!MUT, "screens are for an unmutated run");
  test.setTimeout(240_000);
  for (const vp of SIZES) {
    await openCl26(page, vp);
    mkdirSync(`${DIR}/shots`, { recursive: true });
    await page.screenshot({ path: `${DIR}/shots/${vp.width}-top.png` });
    await page.locator(`${VIS} [data-cl27='pick'][data-k='ready']`).first().click(T);
    await page.waitForTimeout(500);
    await scrollTo(page, 700);
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${DIR}/shots/${vp.width}-scrolled-filter.png` });
  }
});

