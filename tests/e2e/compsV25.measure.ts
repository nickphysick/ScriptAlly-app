/**
 * Comparable titles v25 — the rendered-page locks (CV25). Each is measured on the page the app
 * serves, on the fixture `seedCompsV25.mjs` writes, at 1512 × 900 and 1280 × 800 unless noted.
 *
 *   A1 ids · A3 fixed · B1 header · B2 strip · C1 band · D1 heading · D2 bar · D3 sort · D4 groups
 *   E1 drawer · E2 picker · F1 full · L1 no jump          (A2 and A4 are unit locks)
 *
 * MUTATIONS. `CV25_MUTATE=<lock>` applies that lock's named break. Seven are applied in the page
 * (css / js below). Six are breaks in the source and need a rebuilt bundle; `cv25Mutations.sh` makes
 * the edit, rebuilds, runs the lock and puts the file back: A1, A3, D3, D4, E2, F1.
 *
 * ⚠️ THE WRITING CASES (A1, A3, E2) RE-SEED FIRST AND THE FIXTURE IS REMOVED AFTER THE RUN.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { MS, SIZES, type Vp, dump, openComps, pixelAt, scrollTo, seed } from "./cv25Lib";

const DIR = "reports/comps-v25";
const MUT = process.env.CV25_MUTATE ?? "";
const near = (a: number, b: number, t = 1) => Math.abs(a - b) <= t;
/** JSON with its keys in order: the SDK hands a map's keys back in no fixed order, so two reads of one document can differ as text. */
const stable = (v: unknown): string => JSON.stringify(v, (_k, x) => (x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b))) : x));

const MUTATIONS: Record<string, { css?: string; js?: string; what: string }> = {
  B1: { what: "restore the number panel", js: `(() => { const p = window.__q('[data-cv="panel"]'); if (!p || p.dataset.mut) return; p.dataset.mut = "1"; p.setAttribute("data-hp3", "number"); const h = p.querySelector("h1"); const n = document.createElement("span"); n.setAttribute("data-hp3-part", "number"); n.textContent = "7"; h.prepend(n); h.setAttribute("aria-label", "7 comp titles"); h.querySelector("[aria-label]")?.removeAttribute("aria-label"); })()` },
  B2: { what: "scroll on press", js: `(() => { const p = window.__cv(); if (p.dataset.mutb2) return; p.dataset.mutb2 = "1"; p.addEventListener("click", (e) => { if (e.target.closest("[data-gst-cell]")) p.closest(".wpg-scroll").scrollTop += 300; }, true); })()` },
  D1: { what: "leave the heading on the column", css: `.cv-lib .cv-libhead { margin-inline: 24px !important; }` },
  D2: { what: "search flex: 1", css: `.cv-bar .cv-find { flex: 1 1 auto !important; }` },
  E1: { what: "expand the row inline", js: `(() => { const p = window.__cv(); if (p.dataset.mute1) return; p.dataset.mute1 = "1"; p.addEventListener("click", (e) => { const r = e.target.closest('[data-cv="row"]'); if (!r) return; const d = document.createElement("div"); d.className = "cv-inline"; d.textContent = "details"; r.after(d); }, true); })()` },
  /* comps v27: hiding the loading header's link row changes nothing (the drawing sets the panel's height), so the break is the height itself */
  L1: { what: "give the loading header its own height", css: `[data-cv="panel"][data-loading] { padding-bottom: 80px !important; }` },
};
const SOURCE_MUTATIONS = ["A1", "A3", "D3", "D4", "E2", "F1"];

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ lock: this.name, where, ok: !!ok, detail }); }
  /** a reading has already failed: a case that drives the page further on a broken premise would wait out its whole timeout */
  get red() { return this.rows.some((r) => !r.ok); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${MUT ? `mut-${MUT}-` : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.lock} · ${r.where} — ${r.detail}`)).toEqual([]);
  }
}

async function mutate(page: Page, lock: string) {
  if (MUT !== lock) return;
  const m = MUTATIONS[lock];
  if (!m) return;
  if (m.css) await page.addStyleTag({ content: m.css });
  if (m.js) await page.evaluate(m.js);
  await page.waitForTimeout(150);
}
async function open(page: Page, vp: Vp, lock: string, o: Parameters<typeof openComps>[2] = {}) {
  await openComps(page, vp, o);
  await mutate(page, lock);
}
const P = '[data-cv="page"] ';
const W = "(window as any)";
void W;

/* what the fixture holds (seedCompsV25.mjs) */
const FX = {
  comps: 7, books: 5, screen: 2, sent: 14, logged: 9, rate: "64%", mostUsed: 9, notInLetter: 4, needFirst: 1,
  order: ["The Tidewater Line", "Salt Road", "Nine Miles Out", "Bright Water", "Kestrel Hour", "The Ferry at Dusk", "Last Crossing"],
  tideQueries: ["06", "07", "08", "09", "10", "11", "12", "13", "14"].map((n) => `cv25-q-${n}`),
  L1: "cv25-let-1", L2: "cv25-let-2", L3: "cv25-let-3",
};

test.describe.configure({ mode: "serial" });
test.beforeAll(() => { mkdirSync(DIR, { recursive: true }); seed("--empty"); });
test.afterAll(() => { if (!process.env.CV25_KEEP) seed("--restore"); });

test.describe("Comparable titles v25", () => {
  /* comps v27: the h1 is "Comparable titles" on one line, and the subline no longer names the manuscript */
  test("B1 · header: the title panel, no number, the drawing 196 tall", async ({ page }) => {
    const L = new Ledger("B1");
    for (const vp of SIZES) {
      await open(page, vp, "B1");
      const r = await page.evaluate(() => {
        const w = window as any;
        const p = w.__q('[data-cv="panel"]') as HTMLElement;
        const h1 = p.querySelector("h1[data-page-title]") as HTMLElement;
        const art = p.querySelector('[data-hp3-part="art"]') as HTMLElement | null;
        const img = p.querySelector('[data-cv="panel-art"]') as HTMLElement | null;
        return {
          kind: p.getAttribute("data-hp3"), bg: getComputedStyle(p).backgroundColor,
          name: h1.getAttribute("aria-label") ?? h1.querySelector("[aria-label]")?.getAttribute("aria-label") ?? h1.textContent,
          numbers: p.querySelectorAll('[data-hp3-part="number"]').length,
          lines: Math.round(h1.getBoundingClientRect().height / parseFloat(getComputedStyle(h1).lineHeight)),
          face: getComputedStyle(h1).fontFamily, art: w.__box(art), img: w.__box(img), panel: w.__box(p),
          sub: p.querySelector('[data-cv="panel-sub"]')?.textContent ?? "", ms: p.querySelectorAll('[data-cv="panel-ms"]').length,
          add: p.querySelector('[data-cv="add"]')?.textContent, see: p.querySelector('[data-cv="see-all"]')?.textContent,
          wide: !!document.querySelector(".ws-app.sheet-wide"),
        };
      });
      const w = `${vp.width}`;
      L.check(`${w} title panel`, r.kind === "title" && r.bg === "rgb(45, 58, 80)", `${r.kind} · ${r.bg}`);
      L.check(`${w} h1`, r.name === "Comparable titles", `"${r.name}"`);
      L.check(`${w} no number`, r.numbers === 0, `${r.numbers} number part(s)`);
      L.check(`${w} one line, Special Elite`, r.lines === 1 && /Special Elite/.test(r.face), `${r.lines} line(s) · ${r.face}`);
      L.check(`${w} compact sheet`, r.wide === false, `sheet-wide ${r.wide}`);
      L.check(`${w} drawing 196`, !!r.art && near(r.art.h, 196) && !!r.img && near(r.img.h, 196), `slot ${r.art?.h} · image ${r.img?.h}`);
      L.check(`${w} drawing inside the panel`, !!r.img && r.img.y >= r.panel.y && r.img.b <= r.panel.b && r.img.r <= r.panel.r, `image ${r.img?.y}–${r.img?.b} in ${r.panel.y}–${r.panel.b}`);
      L.check(`${w} subline`, r.sub === "Build your comps library, add to query letters, and track what’s working." && r.ms === 0, `"${r.sub}" · ${r.ms} manuscript title(s)`);
      L.check(`${w} buttons`, r.add === "+ Add a comp" && r.see === "See all comps", `${r.add} · ${r.see}`);
    }
    L.done(18);
  });

  test("B2 · strip: four cells equal to their derivations; a cell filters without scrolling", async ({ page }) => {
    const L = new Ledger("B2");
    for (const vp of SIZES) {
      await open(page, vp, "B2");
      const read = () => page.evaluate(() => {
        const w = window as any;
        const cells = w.__qa("[data-gst-cell]") as HTMLElement[];
        return {
          n: cells.length, figs: cells.map((c) => c.querySelector("[data-gst-fig]")!.textContent), lines: cells.map((c) => c.querySelector("[data-gst-line]")!.textContent),
          labels: cells.map((c) => c.querySelector(".gst-lb")!.textContent), pressed: cells.map((c) => c.getAttribute("aria-pressed")),
          bars: w.__qa('[data-cv="rate-bar"]').length, barsOn: w.__qa('[data-cv="rate-bar"][data-on="true"]').length,
          discsAll: w.__qa('[data-cv="discs-all"] [data-cv="disc"]').length + Number((w.__q('[data-cv="discs-all"] [data-cv="disc-more"]')?.textContent ?? "+0").slice(1)),
          discsNone: w.__qa('[data-cv="discs-none"] [data-cv="disc"]').length,
          rank: (w.__qa('[data-cv="rank"] > div') as HTMLElement[]).map((d) => d.textContent),
          tops: cells.map((c) => Math.round(c.getBoundingClientRect().top)), heading: w.__q(".gst-h")?.textContent, tag: w.__q(".gst-k")?.textContent, hint: w.__q(".gst-hint")?.textContent,
          scroll: (w.__cv().closest(".wpg-scroll") as HTMLElement).scrollTop,
          rows: (w.__qa('[data-cv="row"]') as HTMLElement[]).map((r) => r.dataset.where), chipNone: w.__q('[data-cv="chip"][data-f="none"]')?.getAttribute("aria-pressed"),
        };
      });
      const r = await read();
      const w = `${vp.width}`;
      L.check(`${w} four cells in one row`, r.n === 4 && new Set(r.tops).size === 1, `${r.n} cells · tops ${r.tops}`);
      L.check(`${w} heading`, r.heading === "At a glance" && r.tag === "Your comps and your letters" && r.hint === "Choose a card to filter the list", `${r.heading} · ${r.tag} · ${r.hint}`);
      L.check(`${w} labels`, r.labels.join("|") === "Comps on file|Attachment rate|Most used|Not in a letter", r.labels.join("|"));
      L.check(`${w} figures`, r.figs.join("|") === `${FX.comps}|${FX.rate}|${FX.mostUsed}|${FX.notInLetter}`, r.figs.join("|"));
      L.check(`${w} cell 1 line`, r.lines[0] === `${FX.books} books, ${FX.screen} film or TV`, `"${r.lines[0]}"`);
      L.check(`${w} cell 2 line`, r.lines[1] === `${FX.logged} of ${FX.sent} sent queries logged, ${FX.sent - FX.logged} not yet`, `"${r.lines[1]}"`);
      L.check(`${w} cell 3 line`, r.lines[2] === "queries named The Tidewater Line", `"${r.lines[2]}"`);
      L.check(`${w} cell 4 line`, r.lines[3] === `${FX.needFirst} needs a publisher first`, `"${r.lines[3]}"`);
      L.check(`${w} bars = sent queries`, r.bars === FX.sent && r.barsOn === FX.logged, `${r.bars} bars, ${r.barsOn} logged`);
      L.check(`${w} discs`, r.discsAll === FX.comps && r.discsNone === FX.notInLetter, `${r.discsAll} on file · ${r.discsNone} in no letter`);
      L.check(`${w} top three`, r.rank.length === 3 && /^1The Tidewater Line9$/.test(r.rank[0] ?? ""), r.rank.join(" / "));
      L.check(`${w} nothing filtered at rest`, r.rows.length === FX.comps && r.pressed.every((p) => p === "false"), `${r.rows.length} rows · ${r.pressed}`);
      /* the precondition of "without scrolling": the page CAN scroll */
      const can = await page.evaluate(() => { const s = (window as any).__cv().closest(".wpg-scroll") as HTMLElement; return s.scrollHeight - s.clientHeight; });
      L.check(`${w} the page can scroll`, can > 300, `${can}px of scroll`);
      await page.locator(`${P}[data-gst-cell="none"]`).click();
      await page.waitForTimeout(300);
      const a = await read();
      L.check(`${w} press filters to Not in a letter`, a.rows.length === FX.notInLetter && a.rows.every((x) => x === "none") && a.chipNone === "true" && a.pressed[3] === "true", `${a.rows} · chip ${a.chipNone} · cell ${a.pressed[3]}`);
      L.check(`${w} press does not scroll`, a.scroll === r.scroll, `scrollTop ${r.scroll} → ${a.scroll}`);
      await page.locator(`${P}[data-gst-cell="all"]`).click();
      await page.waitForTimeout(200);
      L.check(`${w} cell 1 clears the filter`, (await read()).rows.length === FX.comps, "rows after Comps on file");
    }
    L.done(32);
  });

  /* C1 (the full-width "How comp tracking works" band) RETIRED with comps v27: the band left the page. The steps are held
     by V3 (the empty page's card) and V7 (no steps on a page with comps until the link is pressed) in compsV27.measure.ts. */

  test("D1 · heading: its left and right edges are the list's", async ({ page }) => {
    const L = new Ledger("D1");
    for (const vp of SIZES) {
      await open(page, vp, "D1");
      const r = await page.evaluate(() => { const w = window as any; return { head: w.__box(w.__q('[data-cv="lib-head"]')), list: w.__box(w.__q('[data-cv="list"]')), col: w.__box(w.__q('[data-cv="panel"]')), text: w.__q('[data-cv="lib-head"] h2')?.textContent, tag: w.__q('[data-cv="lib-tag"]')?.textContent }; });
      const w = `${vp.width}`;
      L.check(`${w} left edge`, near(r.head.x, r.list.x), `heading ${r.head.x} · list ${r.list.x}`);
      L.check(`${w} right edge`, near(r.head.r, r.list.r), `heading ${r.head.r} · list ${r.list.r}`);
      L.check(`${w} the list is wider than the column`, r.list.w > r.col.w + 20, `list ${r.list.w} · column ${r.col.w}`);
      L.check(`${w} copy`, r.text === "Your comparable titles library" && r.tag === "7 titles · in your own order", `${r.text} · ${r.tag}`);
    }
    L.done(8);
  });

  test("D2 · bar: one row, no overflow at 1024, 1280 and 1512; the search is 280 / 220 / 170 by width", async ({ page }) => {
    const L = new Ledger("D2");
    const seen = new Set<number>();
    for (const vp of [{ width: 1024, height: 768 }, ...SIZES, { width: 1920, height: 1080 }]) {
      await open(page, vp, "D2");
      const r = await page.evaluate(() => {
        const w = window as any;
        const bar = w.__q('[data-cv="bar"]') as HTMLElement;
        const kids = ([...bar.children] as HTMLElement[]).filter((k) => k.getBoundingClientRect().width > 0 && !k.classList.contains("cv-sp")).map((k) => w.__box(k));
        const chips = (w.__qa('[data-cv="chip"]') as HTMLElement[]).filter((c) => c.getBoundingClientRect().width > 0).map((c) => ({ ...w.__box(c), f: c.dataset.f }));
        return { bar: w.__box(bar), sw: bar.scrollWidth, cw: bar.clientWidth, kids, chips, find: w.__box(w.__q('[data-cv="find"]')), lib: w.__box(w.__q('[data-cv="lib"]')), fs: w.__q('[data-cv="full-btn"]').textContent, bg: getComputedStyle(bar).backgroundColor, doc: document.documentElement.scrollWidth - document.documentElement.clientWidth };
      });
      const w = `${vp.width}`;
      const want = r.lib.w >= 1252 ? 280 : r.lib.w >= 1052 ? 220 : 170;
      seen.add(want);
      L.check(`${w} one row`, r.bar.h <= 64, `bar ${r.bar.h} tall`);
      L.check(`${w} ink`, r.bg === "rgb(27, 36, 51)", r.bg);
      L.check(`${w} no overflow`, r.sw <= r.cw && r.kids.every((k) => k.r <= r.bar.r + 0.5) && r.doc <= 0, `scroll ${r.sw} / ${r.cw} · furthest right ${Math.max(...r.kids.map((k) => k.r))} of ${r.bar.r}`);
      const sorted = [...r.kids].sort((a, b) => a.x - b.x);
      const clash = sorted.slice(1).filter((k, i) => k.x < sorted[i].r - 0.5).length;
      L.check(`${w} no two controls overlap`, clash === 0, `${clash} overlap(s)`);
      L.check(`${w} chips keep to their own boxes`, r.chips.slice(1).every((c, i) => c.x >= r.chips[i].r - 0.5), r.chips.map((c) => `${c.f}:${Math.round(c.x)}–${Math.round(c.r)}`).join(" "));
      L.check(`${w} search ${want}`, near(r.find.w, want), `search ${r.find.w} at a list ${r.lib.w} wide`);
      L.check(`${w} Books and Film and TV by width`, r.chips.some((c) => c.f === "book") === (r.lib.w >= 1252), `${r.chips.map((c) => c.f)} at ${r.lib.w}`);
    }
    /* each of the three widths was entered */
    L.check("all three search widths seen", seen.has(280) && seen.has(220) && seen.has(170), [...seen].join(", "));
    L.done(29);
  });

  test("D3 · sort: Seen by orders by query count, descending, ascending, then the writer's own order", async ({ page }) => {
    const L = new Ledger("D3");
    await open(page, SIZES[0], "D3");
    const read = () => page.evaluate(() => {
      const w = window as any;
      return { titles: (w.__qa('[data-cv="row-title"]') as HTMLElement[]).map((e) => e.textContent), n: (w.__qa('[data-cv="row-seen"]') as HTMLElement[]).map((e) => Number(e.dataset.n)), aria: Object.fromEntries((w.__qa('[data-cv="sort"]') as HTMLElement[]).map((b) => [b.dataset.sort, b.getAttribute("aria-sort")])), tag: w.__q('[data-cv="lib-tag"]').textContent };
    });
    const r0 = await read();
    L.check("own order at rest", r0.titles.join("|") === FX.order.join("|") && Object.values(r0.aria).every((a) => a === "none"), r0.titles.join(" · "));
    /* the fixture can tell the directions apart: the counts are not all equal */
    L.check("the counts differ", new Set(r0.n).size > 1, r0.n.join(","));
    const btn = page.locator(`${P}[data-cv="sort"][data-sort="seen"]`);
    await btn.click(); await page.waitForTimeout(150);
    const r1 = await read();
    L.check("first click: highest first", r1.n.every((v, i) => i === 0 || r1.n[i - 1] >= v) && r1.n[0] > r1.n[r1.n.length - 1], r1.n.join(","));
    L.check("first click: aria-sort descending", r1.aria.seen === "descending" && r1.aria.title === "none", JSON.stringify(r1.aria));
    L.check("first click: ties keep the writer's order", r1.titles.slice(0, 2).join("|") === "The Tidewater Line|Salt Road", r1.titles.join(" · "));
    L.check("first click: the tag says so", r1.tag === "7 titles · sorted by agents who saw it", r1.tag);
    await btn.click(); await page.waitForTimeout(150);
    const r2 = await read();
    L.check("second click: lowest first", r2.n.every((v, i) => i === 0 || r2.n[i - 1] <= v) && r2.aria.seen === "ascending", `${r2.n.join(",")} · ${r2.aria.seen}`);
    await btn.click(); await page.waitForTimeout(150);
    const r3 = await read();
    L.check("third click: the writer's own order", r3.titles.join("|") === FX.order.join("|") && r3.aria.seen === "none" && r3.tag === "7 titles · in your own order", `${r3.titles.join(" · ")} · ${r3.aria.seen}`);
    /* Comp sorts A–Z first, ignoring a leading "The" */
    await page.locator(`${P}[data-cv="sort"][data-sort="title"]`).click(); await page.waitForTimeout(150);
    const r4 = await read();
    L.check("Comp: A–Z ignoring The", r4.titles.join("|") === "Bright Water|The Ferry at Dusk|Kestrel Hour|Last Crossing|Nine Miles Out|Salt Road|The Tidewater Line" && r4.aria.title === "ascending", r4.titles.join(" · "));
    L.done(9);
  });

  test("D4 · groups: opens ungrouped; Query letter draws a band per recorded letter plus Not in a letter", async ({ page }) => {
    const L = new Ledger("D4");
    await open(page, SIZES[0], "D4");
    const read = () => page.evaluate(() => {
      const w = window as any;
      return {
        bands: (w.__qa('[data-cv="grp"]') as HTMLElement[]).map((g) => ({ key: g.dataset.group, name: g.querySelector("b")!.textContent, n: g.querySelectorAll('[data-cv="row"]').length, said: g.querySelector('[data-cv="band-n"]')!.textContent, keys: [...g.querySelectorAll('[data-cv="row"]')].map((r) => (r as HTMLElement).dataset.key) })),
        rows: w.__qa('[data-cv="row"]').length, value: w.__q('[data-cv="group-value"]').textContent,
      };
    });
    const r0 = await read();
    L.check("opens with no bands", r0.bands.length === 0 && r0.rows === FX.comps && r0.value === "None", `${r0.bands.length} bands · ${r0.rows} rows · ${r0.value}`);
    const pick = async (g: string) => { await page.locator(`${P}[data-cv="group-btn"]`).click(); await page.locator(`${P}[data-cv="group-menu"] [data-g="${g}"]`).click(); await page.waitForTimeout(200); };
    await pick("letter");
    const r1 = await read();
    L.check("Query letter: a band per recorded letter, then Not in a letter", r1.bands.map((b) => b.key).join("|") === `letter:${FX.L2}|letter:${FX.L3}|none`, r1.bands.map((b) => `${b.name} (${b.n})`).join(" · "));
    L.check("the unrecorded letter has no band", !r1.bands.some((b) => b.key === `letter:${FX.L1}`), r1.bands.map((b) => b.key).join(","));
    L.check("each band says its own count", r1.bands.every((b) => b.said === `${b.n} ${b.n === 1 ? "comp" : "comps"}`), r1.bands.map((b) => b.said).join(" · "));
    /* a comp two letters name is in both bands, so the bands hold every comp once or more: the DISTINCT comps are the total */
    const distinct = new Set(r1.bands.flatMap((b) => b.keys)).size;
    L.check("every comp is in a band", distinct === FX.comps, `${distinct} distinct of ${FX.comps} (${r1.bands.reduce((s, b) => s + b.n, 0)} rows drawn)`);
    await pick("where");
    const r2 = await read();
    L.check("Where it's used: three bands that add up to the total", r2.bands.map((b) => b.key).join("|") === "sent|unsent|none" && r2.bands.reduce((s, b) => s + b.n, 0) === FX.comps, r2.bands.map((b) => `${b.name} ${b.n}`).join(" · "));
    await pick("media");
    const r3 = await read();
    L.check("Book or screen: two bands that add up to the total", r3.bands.map((b) => `${b.key}:${b.n}`).join("|") === `book:${FX.books}|screen:${FX.screen}`, r3.bands.map((b) => `${b.name} ${b.n}`).join(" · "));
    await pick("none");
    L.check("None: no bands again", (await read()).bands.length === 0, "bands after None");
    L.done(8);
  });

  test("E1 · drawer: a row opens it, inset 8 with 12px corners; nothing expands inline; Escape closes it", async ({ page }) => {
    const L = new Ledger("E1");
    for (const vp of SIZES) {
      await open(page, vp, "E1");
      await scrollTo(page, '[data-cv="lib-head"]', 24);
      await page.locator(`${P}[data-cv="row"]`).first().click();
      await page.waitForSelector('[data-hdr="comp"].is-in', { timeout: 10_000 });
      await page.waitForTimeout(500);
      const r = await page.evaluate(() => {
        const w = window as any;
        const d = document.querySelector('[data-hdr="comp"]') as HTMLElement; const b = w.__box(d);
        const rows = w.__q('[data-cv="rows"]') as HTMLElement;
        return {
          box: b, vw: innerWidth, vh: innerHeight, radius: getComputedStyle(d).borderTopLeftRadius,
          notRows: [...rows.children].filter((c) => (c as HTMLElement).dataset.cv !== "row").length, rowCount: rows.children.length,
          title: d.querySelector('[data-cv="drawer-title"]')?.textContent, qn: d.querySelector('[data-cv="drawer-qn"]')?.textContent,
          queries: [...d.querySelectorAll('[data-cv="drawer-query"]')].map((q) => (q as HTMLElement).dataset.q),
          named: d.querySelector('[data-cv="stat-named"]')?.textContent, seen: d.querySelector('[data-cv="stat-seen"]')?.textContent, asked: d.querySelector('[data-cv="stat-asked"]')?.textContent,
          open: w.__qa('[data-cv="row"].is-open').length, face: getComputedStyle(d.querySelector('[data-cv="drawer-title"]')!).fontFamily,
        };
      });
      const w = `${vp.width}`;
      L.check(`${w} inset 8`, near(r.box.y, 8) && near(r.vw - r.box.r, 8) && near(r.vh - r.box.b, 8), `top ${r.box.y} · right ${r.vw - r.box.r} · bottom ${r.vh - r.box.b}`);
      L.check(`${w} radius 12`, r.radius === "12px", r.radius);
      L.check(`${w} width min(640, 54vw)`, near(r.box.w, Math.min(640, r.vw * 0.54)), `${r.box.w} of ${Math.min(640, r.vw * 0.54)}`);
      L.check(`${w} no inline detail`, r.notRows === 0 && r.rowCount === FX.comps, `${r.notRows} non-row child(ren) among ${r.rowCount}`);
      L.check(`${w} the open row is marked`, r.open === 1, `${r.open} open`);
      L.check(`${w} the comp`, r.title === "The Tidewater Line" && /Special Elite/.test(r.face), `${r.title} · ${r.face}`);
      L.check(`${w} its queries are the usage`, [...r.queries].sort().join("|") === [...FX.tideQueries].sort().join("|") && r.qn === "9", `${r.queries.length} queries · says ${r.qn}`);
      L.check(`${w} the three cells`, r.named === "QL v2, QL v3" && r.seen === "9 agents" && r.asked === "6", `${r.named} · ${r.seen} · ${r.asked}`);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(600);
      const gone = await page.evaluate(() => { const d = document.querySelector('[data-hdr="comp"]'); return !d || !d.classList.contains("is-in"); });
      L.check(`${w} Escape closes it`, gone, gone ? "closed" : "still open");
    }
    L.done(18);
  });

  test("F1 · full screen: hides the panel, strip and band, collapses the sidebar, keeps the heading; Escape restores both and the scroll", async ({ page }) => {
    const L = new Ledger("F1");
    for (const vp of SIZES) {
      await open(page, vp, "F1");
      await scrollTo(page, '[data-cv="lib-head"]', 120);
      const read = () => page.evaluate(() => {
        const w = window as any; const h = (s: string) => { const e = w.__q(s) as HTMLElement | null; return e ? e.getBoundingClientRect().height : -1; };
        const sheet = document.querySelector(".ws-window") as HTMLElement;
        return {
          panel: h('[data-cv="panel"]'), strip: h('[data-gst="comps"]'), how: h('[data-cv="how"]'), foot: h(".af"), head: w.__box(w.__q('[data-cv="lib-head"]')), list: w.__box(w.__q('[data-cv="list"]')), sheet: w.__box(sheet),
          shut: !!document.querySelector(".ws-app.sb-shut"), side: (document.querySelector(".ws-panel") as HTMLElement).getBoundingClientRect().width,
          scroll: (w.__cv().closest(".wpg-scroll") as HTMLElement).scrollTop, url: location.search, btn: w.__q('[data-cv="full-btn"]').getAttribute("aria-pressed"), full: w.__cv().dataset.full, stored: localStorage.getItem("sa.compsFull"),
        };
      });
      const a = await read();
      const w = `${vp.width}`;
      L.check(`${w} before: expanded, scrolled`, !a.shut && a.side > 200 && a.scroll > 200 && a.panel > 0 && a.strip > 0 && a.how > 0, `sidebar ${a.side} · scroll ${a.scroll}`);
      await page.locator(`${P}[data-cv="full-btn"]`).click();
      await page.waitForTimeout(900);
      const b = await read();
      L.check(`${w} on: panel, strip and band hidden`, b.panel === 0 && b.strip === 0 && b.how === 0 && b.foot <= 0, `panel ${b.panel} · strip ${b.strip} · band ${b.how} · footer ${b.foot}`);
      L.check(`${w} on: the heading stays above the list`, b.head.h > 0 && b.head.b <= b.list.y && b.head.y >= b.sheet.y, `heading ${b.head.y}–${b.head.b} · list from ${b.list.y}`);
      L.check(`${w} on: the sidebar is at its icons`, b.shut && b.side < 100, `sb-shut ${b.shut} · ${b.side} wide`);
      L.check(`${w} on: the list is the sheet less 12 each side`, near(b.list.x - b.sheet.x, 12, 1.5) && near(b.sheet.r - b.list.r, 12, 1.5), `left ${b.list.x - b.sheet.x} · right ${b.sheet.r - b.list.r}`);
      L.check(`${w} on: the URL and the device say so`, b.url.includes("full=1") && b.stored === "1" && b.btn === "true" && b.full === "true", `${b.url} · stored ${b.stored} · pressed ${b.btn}`);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(900);
      const c = await read();
      L.check(`${w} Escape: everything is back`, c.panel > 0 && c.strip > 0 && c.how > 0 && c.full === "false" && !c.url.includes("full=1") && c.stored === null, `panel ${c.panel} · ${c.url || "(no query)"} · stored ${c.stored}`);
      L.check(`${w} Escape: the sidebar is what it was`, !c.shut && near(c.side, a.side), `${c.side} of ${a.side}`);
      L.check(`${w} Escape: the scroll position you left from`, near(c.scroll, a.scroll, 2), `${a.scroll} → ${c.scroll}`);
      /* F toggles it, and not while typing */
      await page.keyboard.press("f"); await page.waitForTimeout(700);
      L.check(`${w} F enters`, (await read()).full === "true", "after F");
      await page.locator(`${P}[data-cv="find"] input`).click(); await page.keyboard.type("f"); await page.waitForTimeout(300);
      L.check(`${w} F in the search types`, (await read()).full === "true" && (await page.locator(`${P}[data-cv="find"] input`).inputValue()) === "f", "still full, the field holds f");
      await page.locator(`${P}[data-cv="find"] input`).fill(""); await page.locator(`${P}[data-cv="full-btn"]`).click(); await page.waitForTimeout(700);
      L.check(`${w} the button exits`, (await read()).full === "false", "after Exit full screen");
    }
    L.done(24);
  });

  /* comps v27 REWROTE L1. While comps load the page is its header and nothing below (v27 Part B), so the strip and the
     library heading have no loading box to compare: they arrive with the data. What is still held is the panel. */
  test("L1 · no jump: the panel's loading and loaded boxes are equal, and nothing is drawn below it while loading", async ({ page }) => {
    const L = new Ledger("L1");
    for (const vp of SIZES) {
      await open(page, vp, "L1", { hold: 5000 });
      const read = () => page.evaluate(() => {
        const w = window as any; const panel = w.__q('[data-cv="panel"]') as HTMLElement; const group = w.__q('[data-cv="group"]') as HTMLElement;
        return { loading: panel.hasAttribute("data-loading"), panel: w.__box(panel), below: [...group.children].filter((c) => c !== panel && (c as HTMLElement).getBoundingClientRect().height > 0).length, rows: w.__qa('[data-cv="row"]').length };
      });
      const a = await read();
      const w = `${vp.width}`;
      /* the precondition: this reading WAS the loading state */
      L.check(`${w} held loading`, a.loading && a.rows === 0, `loading ${a.loading} · ${a.rows} rows`);
      L.check(`${w} nothing below the header while loading`, a.below === 0, `${a.below} element(s) below`);
      await page.waitForFunction(() => (window as any).__qa('[data-cv="row"]').length > 0, null, { timeout: 30_000 });
      await page.waitForTimeout(500);
      const b = await read();
      L.check(`${w} then loaded`, !b.loading && b.rows === FX.comps, `loading ${b.loading} · ${b.rows} rows`);
      const x = a.panel, y = b.panel;
      L.check(`${w} panel`, near(x.x, y.x) && near(x.y, y.y) && near(x.w, y.w) && near(x.h, y.h), `${Math.round(x.x)},${Math.round(x.y)} ${Math.round(x.w)}×${x.h.toFixed(1)} → ${Math.round(y.x)},${Math.round(y.y)} ${Math.round(y.w)}×${y.h.toFixed(1)}`);
    }
    L.done(8);
  });

  /* ── the writing cases: each re-seeds first ── */

  test("A1 · ids: every comp the page writes has a unique id, and an id survives an edit, an add and a remove", async ({ page }) => {
    const L = new Ledger("A1");
    seed("--empty");
    const before = dump();
    const had = before.comps.filter((c) => c.id).map((c) => c.id as string);
    L.check("the fixture holds a comp with no id", before.comps.length === FX.comps && had.length === FX.comps - 1, `${had.length} of ${before.comps.length} have ids`);
    await open(page, SIZES[0], "A1");
    await scrollTo(page, '[data-cv="lib-head"]', 24);
    /* edit Salt Road's publisher */
    await page.locator(`${P}[data-cv="row"]`).nth(1).click();
    await page.waitForSelector('[data-hdr="comp"].is-in');
    await page.locator('[data-cv="drawer-edit"]').click();
    await page.locator("#cpv-f-pub").fill("Faber & Faber");
    await page.locator('[data-hdr="comp"] [data-cf="save"]').click(); /* comps v26: the form's buttons are the drawer's pinned foot */
    await expect.poll(() => (dump().comps.find((c) => c.title === "Salt Road") as any)?.publisher, { timeout: 20_000 }).toBe("Faber & Faber");
    const a = dump();
    const ids = a.comps.map((c) => c.id as string | undefined);
    L.check("after an edit: every comp has an id", ids.every((i) => typeof i === "string" && /^cmp_/.test(i)), ids.join(" "));
    L.check("after an edit: the ids are unique", new Set(ids).size === ids.length, `${new Set(ids).size} distinct of ${ids.length}`);
    L.check("after an edit: every id that existed is unchanged, on the same comp", before.comps.every((c, i) => !c.id || a.comps[i].id === c.id), before.comps.map((c, i) => `${c.id ?? "(none)"}→${a.comps[i].id}`).join(" "));
    L.check("after an edit: the order is the writer's", a.comps.map((c) => c.title).join("|") === FX.order.join("|"), a.comps.map((c) => c.title).join(" · "));
    if (L.red) { L.done(8); return; }
    const kestrel = a.comps.find((c) => c.title === "Kestrel Hour")!.id as string;
    await page.keyboard.press("Escape"); await page.waitForTimeout(500);
    /* add a comp: it gets an id of its own; nothing else moves */
    await page.keyboard.press("n");
    await page.waitForSelector('[data-hdr="comp"].is-in');
    await page.locator("#cpv-f-title").fill("Low Water");
    await page.locator("#cpv-f-year").fill("2024");
    await page.locator('[data-hdr="comp"] [data-cf="save"]').click(); /* comps v26: the form's buttons are the drawer's pinned foot */
    await expect.poll(() => dump().comps.length, { timeout: 20_000 }).toBe(FX.comps + 1);
    const b = dump();
    const bid = b.comps.map((c) => c.id as string);
    L.check("after an add: unique ids, the new one its own", new Set(bid).size === bid.length && !ids.includes(bid[bid.length - 1]), bid.join(" "));
    L.check("after an add: every earlier id is unchanged", a.comps.every((c, i) => b.comps[i].id === c.id) && b.comps.find((c) => c.title === "Kestrel Hour")!.id === kestrel, "earlier ids");
    if (L.red) { L.done(8); return; }
    /* remove it through the drawer, then Undo: it comes back with the SAME id */
    const added = bid[bid.length - 1];
    /* comps v26: a plain Add closes the drawer, so the new comp is opened from its row; Remove is in the edit form's foot */
    await page.waitForTimeout(700);
    await page.locator(`${P}[data-cv="row"]`).last().click();
    await page.waitForSelector('[data-hdr="comp"].is-in');
    await page.locator('[data-cv="drawer-edit"]').click();
    await page.locator('[data-hdr="comp"] [data-cf="remove"]').click();
    await expect.poll(() => dump().comps.length, { timeout: 20_000 }).toBe(FX.comps);
    await page.locator(".sa-toast-undo").last().click();
    await expect.poll(() => dump().comps.length, { timeout: 20_000 }).toBe(FX.comps + 1);
    const c = dump();
    L.check("after remove and Undo: the same id comes back", c.comps[c.comps.length - 1].id === added && new Set(c.comps.map((x) => x.id)).size === c.comps.length, `${c.comps[c.comps.length - 1].id} of ${added}`);
    L.done(8);
  });

  test("E2 · picker: Save writes compIds to the chosen letter only; Undo restores it exactly", async ({ page }) => {
    const L = new Ledger("E2");
    seed("--empty");
    const before = dump();
    await open(page, SIZES[0], "E2");
    await scrollTo(page, '[data-cv="lib-head"]', 24);
    /* Nine Miles Out is in no letter: its row's door opens the picker on the CURRENT letter (v3, not sent), ticked */
    await page.locator(`${P}[data-cv="row"]`).nth(2).hover();
    /* everything that changes INSIDE the picker after it is first put in the document. An attribute record carries the
       value it had before, so the first frame's letter is known whenever this callback runs. */
    await page.evaluate(() => {
      const w = window as any; w.__pk = [];
      new MutationObserver((recs) => {
        for (const r of recs) {
          const el = (r.target.nodeType === 1 ? r.target : r.target.parentElement) as HTMLElement | null;
          if (!el || !el.closest('[data-cv="picker"]') || r.type === "childList") continue;
          w.__pk.push({ what: r.type === "attributes" ? r.attributeName : "text", on: el.getAttribute("data-cv") ?? el.tagName, was: r.oldValue });
        }
      }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeOldValue: true, attributeFilter: ["data-letter", "data-fixed", "aria-checked", "aria-pressed"], characterData: true, characterDataOldValue: true });
    });
    await page.locator(`${P}[data-cv="row"]`).nth(2).locator('[data-cv="tray-act"]').click();
    await page.waitForSelector('[data-cv="picker"]');
    /* ⚠️ THE FIRST FRAME (comps v26.1). The picker opens with its letter already chosen: this reads it the moment it
       mounts, with no wait. v26 waited for it to settle, because the picker chose its letter in an effect. */
    const p0 = await page.evaluate(() => { const p = document.querySelector('[data-cv="picker"]') as HTMLElement; return { letter: p.dataset.letter, fixed: p.dataset.fixed, on: [...p.querySelectorAll('[data-cv="picker-comp"][aria-checked="true"]')].map((x) => (x as HTMLElement).dataset.key), count: p.querySelector('[data-cv="picker-count"]')!.textContent, off: [...p.querySelectorAll('[data-cv="picker-comp"][aria-disabled="true"]')].map((x) => x.querySelector("b")!.textContent) }; });
    L.check("opens on the current letter, not fixed", p0.letter === FX.L3 && p0.fixed === "false", `${p0.letter} · fixed ${p0.fixed}`);
    L.check("its record plus the comp the door named", [...p0.on].sort().join("|") === ["cmp_cv25last", "cmp_cv25nine", "cmp_cv25tide"].join("|") && p0.count === "3 logged", `${p0.on} · ${p0.count}`);
    L.check("a comp that is not ready cannot be ticked", p0.off.join("|") === "The Ferry at Dusk", p0.off.join(","));
    await page.waitForTimeout(600);
    const pk = await page.evaluate(() => (window as any).__pk as { what: string; on: string; was: string | null }[]);
    const first = pk.find((x) => x.what === "data-letter" && x.on === "picker");
    L.check("first frame: the letter is chosen when the picker is first drawn", (first ? first.was : p0.letter) === FX.L3, first ? `drawn with "${first.was}", then changed` : `${p0.letter}`);
    L.check("first frame: nothing in the picker changes after it is drawn", pk.length === 0, pk.length ? pk.slice(0, 6).map((x) => `${x.on} ${x.what} was "${x.was}"`).join(" · ") : "0 changes");
    await page.locator('[data-cv="picker-save"]').click();
    await expect.poll(() => (dump().letters[FX.L3]?.compIds ?? []).length, { timeout: 20_000 }).toBe(3);
    const a = dump();
    L.check("the chosen letter has the three", [...(a.letters[FX.L3].compIds ?? [])].sort().join("|") === ["cmp_cv25last", "cmp_cv25nine", "cmp_cv25tide"].join("|"), JSON.stringify(a.letters[FX.L3].compIds));
    L.check("no other letter changed", JSON.stringify(a.letters[FX.L1]) === JSON.stringify(before.letters[FX.L1]) && JSON.stringify(a.letters[FX.L2]) === JSON.stringify(before.letters[FX.L2]) && Object.keys(a.letters).length === 3, JSON.stringify({ l1: a.letters[FX.L1].compIds, l2: a.letters[FX.L2].compIds }));
    L.check("the unrecorded letter is still unrecorded", a.letters[FX.L1].compIds === null, `${JSON.stringify(a.letters[FX.L1].compIds)}`);
    L.check("the comps were not rewritten", stable(a.comps) === stable(before.comps), a.comps.map((c, i) => (stable(c) === stable(before.comps[i]) ? "=" : `${stable(before.comps[i])} → ${stable(c)}`)).join(" "));
    /* the toast IS the undo: nothing navigates before it is pressed */
    const undo = page.locator(".sa-toast-undo").last();
    L.check("Undo is offered", (await undo.count()) > 0, "toast");
    /* with no Undo to press there is nothing more to read, and a click would wait out the whole timeout */
    if (!(await undo.count())) { L.done(11); return; }
    await undo.click();
    await expect.poll(() => JSON.stringify(dump().letters[FX.L3]?.compIds), { timeout: 20_000 }).toBe(JSON.stringify(before.letters[FX.L3].compIds));
    const u = dump();
    L.check("Undo restores every letter exactly", JSON.stringify(u.letters) === JSON.stringify(before.letters), JSON.stringify(u.letters[FX.L3].compIds));
    L.done(11);
  });

  test("A3 · fixed: a sent, recorded letter offers no checkbox and makes a new version; a sent, unrecorded one accepts one save", async ({ page }) => {
    const L = new Ledger("A3");
    seed("--empty");
    const before = dump();
    await open(page, SIZES[0], "A3");
    await scrollTo(page, '[data-cv="lib-head"]', 24);
    const state = () => page.evaluate(() => {
      const p = document.querySelector('[data-cv="picker"]') as HTMLElement;
      const li = [...p.querySelectorAll('[data-cv="picker-comp"]')] as HTMLElement[];
      return { letter: p.dataset.letter, fixed: p.dataset.fixed, can: li.filter((x) => x.getAttribute("aria-disabled") === "false").length, on: li.filter((x) => x.getAttribute("aria-checked") === "true").map((x) => x.dataset.key), save: !!p.querySelector('[data-cv="picker-save"]'), newv: p.querySelector('[data-cv="picker-newv"]')?.textContent ?? null, notice: p.querySelector('[data-cv="picker-notice"]')?.textContent ?? "", locks: [...p.querySelectorAll('[data-cv="picker-letter"]')].map((b) => `${(b as HTMLElement).dataset.letter}:${b.querySelector("svg") ? "lock" : "open"}`) };
    });
    /* the notice's door opens the picker on the unrecorded letter */
    await page.locator(`${P}[data-cv="unrec-log"]`).first().click();
    await page.waitForSelector('[data-cv="picker"]');
    const s1 = await state();
    L.check("v1: sent, nothing recorded, open to one save", s1.letter === FX.L1 && s1.fixed === "false" && s1.save && s1.can === FX.comps - 1 && s1.on.length === 0, `${s1.letter} · fixed ${s1.fixed} · ${s1.can} tickable`);
    L.check("v1: the notice says its queries are tracked too", s1.notice === "QL v1 has already gone out with 5 queries. Log what it mentioned and those queries are tracked too.", s1.notice);
    L.check("sent letters carry a padlock", s1.locks.join("|") === `${FX.L1}:lock|${FX.L2}:lock|${FX.L3}:open`, s1.locks.join(" "));
    /* v2 is fixed */
    await page.locator(`[data-cv="picker-letter"][data-letter="${FX.L2}"]`).click();
    const s2 = await state();
    L.check("v2: fixed, no checkbox", s2.fixed === "true" && s2.can === 0 && !s2.save, `fixed ${s2.fixed} · ${s2.can} tickable · save ${s2.save}`);
    L.check("v2: its record is shown, read-only", [...s2.on].sort().join("|") === "cmp_cv25salt|cmp_cv25tide", s2.on.join(","));
    L.check("v2: the notice and the door", s2.notice === "QL v2 has gone out with 9 queries, so its comps are fixed. To change them, make a new version of the letter." && s2.newv === "New version of QL v2", `${s2.notice} · ${s2.newv}`);
    /* a click on a fixed letter's comp changes nothing */
    /* dispatched on the element: Playwright's own click waits out the whole timeout on an aria-disabled target */
    await page.evaluate(() => (document.querySelectorAll('[data-cv="picker-comp"]')[2] as HTMLElement).click());
    await page.waitForTimeout(150);
    L.check("v2: a click ticks nothing", (await state()).on.length === 2, "ticks after a click");
    if (L.red) { L.done(12); return; }
    await page.locator('[data-cv="picker-newv"]').click();
    await expect.poll(() => Object.keys(dump().letters).length, { timeout: 20_000 }).toBe(4);
    const a = dump();
    const made = Object.entries(a.letters).find(([id]) => !(id in before.letters))!;
    L.check("New version: the next name, the same comps", made[1].name === "Query letter v4" && JSON.stringify(made[1].compIds) === JSON.stringify(before.letters[FX.L2].compIds), `${made[1].name} · ${JSON.stringify(made[1].compIds)}`);
    L.check("New version: v2 is untouched", JSON.stringify(a.letters[FX.L2]) === JSON.stringify(before.letters[FX.L2]), JSON.stringify(a.letters[FX.L2]));
    await page.waitForFunction((id) => (document.querySelector('[data-cv="picker"]') as HTMLElement)?.dataset.letter === id, made[0], { timeout: 15_000 });
    const s3 = await state();
    L.check("New version: the picker moves to it, and it can be edited", s3.fixed === "false" && s3.save && s3.on.length === 2, `fixed ${s3.fixed} · ${s3.on.length} ticked`);
    /* v1 accepts ONE save, and is then fixed */
    await page.locator(`[data-cv="picker-letter"][data-letter="${FX.L1}"]`).click();
    await page.locator('[data-cv="picker-comp"][data-key="cmp_cv25brit"]').click();
    await page.locator('[data-cv="picker-save"]').click();
    await expect.poll(() => JSON.stringify(dump().letters[FX.L1]?.compIds), { timeout: 20_000 }).toBe(JSON.stringify(["cmp_cv25brit"]));
    await page.waitForTimeout(600);
    const rows = await page.evaluate(() => { const w = window as any; const r = (w.__qa('[data-cv="row"]') as HTMLElement[]).find((x) => x.dataset.key === "cmp_cv25brit")!; return { where: r.dataset.where, n: (r.querySelector('[data-cv="row-seen"]') as HTMLElement).dataset.n, unrec: w.__qa('[data-cv="unrec"]').length, rate: w.__q('[data-gst-cell="rate"] [data-gst-fig]').textContent }; });
    L.check("v1 saved once: its five queries are tracked", rows.where === "sent" && rows.n === "5" && rows.unrec === 0 && rows.rate === "100%", JSON.stringify(rows));
    await page.locator(`${P}[data-cv="how-pick"]`).scrollIntoViewIfNeeded();
    await page.locator(`${P}[data-cv="how-pick"]`).click();
    await page.waitForSelector('[data-cv="picker"]');
    await page.locator(`[data-cv="picker-letter"][data-letter="${FX.L1}"]`).click();
    const s4 = await state();
    L.check("v1 is now fixed", s4.fixed === "true" && s4.can === 0 && !s4.save, `fixed ${s4.fixed} · ${s4.can} tickable`);
    L.done(12);
  });
});

test("CV25 · every lock has a named mutation", () => {
  expect([...Object.keys(MUTATIONS), ...SOURCE_MUTATIONS].sort()).toEqual(["A1", "A3", "B1", "B2", "D1", "D2", "D3", "D4", "E1", "E2", "F1", "L1"]);
});
