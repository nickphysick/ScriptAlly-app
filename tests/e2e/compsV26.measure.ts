/**
 * Comparable titles v26 — the add-and-edit comp drawer and the first-comp explainer: the AD locks,
 * measured on the rendered page at 1512 × 900 and 1280 × 800, on the fixture `seedCompsV25.mjs` writes
 * (`cv25-ms`, seven comps; `cv25-ms-empty`, none).
 *
 *   AD1 one heading · AD2 explainer · AD3 labels · AD4 ready · AD5 foot · AD6 again · AD7 tags ·
 *   AD8 preview · AD10 focus and keys (v26.1) · AD9 retired with comps v27
 *
 * MUTATIONS. `AD_MUTATE=<lock>` applies that lock's named break. Four are applied in the page (below).
 * Five are edits to the source and need a rebuilt bundle; `adMutations.sh` makes the edit, rebuilds,
 * runs the lock and puts the file back from a copy: AD2, AD3, AD4, AD6, AD7, AD10.
 *
 * ⚠️ AD6, AD7 AND AD10 WRITE COMPS. Each re-seeds first, and the fixture is removed after the run.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { MS_EMPTY, SIZES, type Vp, dump, openComps, scrollTo, seed } from "./cv25Lib";

/* v26.1 writes its own ledgers, so the ones committed with v26 are not rewritten by a run */
const DIR = "reports/comps-v26-1";
const MUT = process.env.AD_MUTATE ?? "";
const near = (a: number, b: number, t = 1) => Math.abs(a - b) <= t;

const MUTATIONS: Record<string, { css?: string; js?: string; what: string }> = {
  AD1: { what: "restore the body's \"Add a comp\" heading", js: `(() => { const b = document.querySelector('[data-hdr="comp"] [data-cf="form"]'); if (!b || b.querySelector("h4.mut")) return; const h = document.createElement("h4"); h.className = "mut"; h.textContent = "Add a comp"; b.prepend(h); })()` },
  AD5: { what: "put the foot inside the scrolling body", js: `(() => { const d = document.querySelector('[data-hdr="comp"]'); const f = d && d.querySelector('[data-hdr="foot"]'); const b = d && d.querySelector('[data-hdr="body"]'); if (f && b && f.parentElement !== b) b.append(f); })()` },
  AD8: { what: "render a hand-built preview", js: `(() => { const p = document.querySelector('[data-hdr="comp"] [data-cf="preview"]'); if (!p || p.dataset.mut) return; p.dataset.mut = "1"; const t = (document.querySelector('[data-hdr="comp"] #cpv-f-title') || {}).value || ""; p.innerHTML = '<div class="aprev-cell"><span class="disc"></span><div><b>' + t + '</b><small></small></div></div><div class="st"><span>Log in a letter</span></div>'; })()` },
};
const SOURCE_MUTATIONS = ["AD2", "AD3", "AD4", "AD6", "AD7", "AD10"];

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ lock: this.name, where, ok: !!ok, detail }); }
  get red() { return this.rows.some((r) => !r.ok); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${MUT ? `mut-${MUT}-` : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    /* under a mutation a case may stop at its first red, so the floor is the green run's */
    if (!MUT) expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
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

const P = '[data-cv="page"] ';
const D = '[data-hdr="comp"] ';
async function openAdd(page: Page) {
  await page.locator(`${P}[data-cv="add"]`).click();
  await page.waitForSelector('[data-hdr="comp"].is-in', { timeout: 10_000 });
  await page.waitForTimeout(500);
}
async function openEdit(page: Page, nth: number) {
  await scrollTo(page, '[data-cv="lib-head"]', 24);
  const row = page.locator(`${P}[data-cv="row"]`).nth(nth);
  await row.hover();
  await row.locator('[data-cv="tray-edit"]').click();
  await page.waitForSelector('[data-hdr="comp"].is-in', { timeout: 10_000 });
  await page.waitForTimeout(500);
}
const closeDrawer = async (page: Page) => { await page.keyboard.press("Escape"); await page.waitForTimeout(600); };
const emptyPage = async (page: Page, vp: Vp) => { await openComps(page, vp, { ms: MS_EMPTY }); await page.waitForSelector('[data-cv="empty"]', { timeout: 30_000 }); };

/** the drawer, read whole */
const drawer = (page: Page) => page.evaluate(() => {
  const d = document.querySelector('[data-hdr="comp"]') as HTMLElement;
  const q = (s: string) => d.querySelector(s) as HTMLElement | null;
  const shown = (e: Element | null) => !!e && (e as HTMLElement).getBoundingClientRect().height > 0;
  const heads = [...d.querySelectorAll("h1,h2,h3,h4,h5,h6,[role=heading]")].filter(shown);
  const body = q('[data-hdr="body"]')!;
  const val = (id: string) => (d.querySelector(id) as HTMLInputElement | null)?.value ?? null;
  const btn = (k: string) => { const b = q(`[data-cf="${k}"]`) as HTMLButtonElement | null; return b ? { text: b.textContent, disabled: b.disabled } : null; };
  return {
    headings: heads.map((h) => ({ text: h.textContent, inBody: body.contains(h), inHead: !!h.closest('[data-hdr="head"]') })),
    title: q('[data-cv="drawer-title"]')?.textContent ?? null, sub: q(".cv-dby")?.textContent ?? null, disc: q('[data-cv="drawer-disc"]')?.getAttribute("data-media") ?? null,
    explain: shown(q('[data-cf="explain"]')), points: d.querySelectorAll('[data-cf="explain-point"]').length, link: shown(q('[data-cf="explain-link"]')), hide: q('[data-cf="explain-hide"]')?.textContent ?? null,
    who: q('[data-cf="label-who"]')?.textContent ?? null, pub: q('[data-cf="label-pub"]')?.textContent ?? null,
    whoEg: (d.querySelector("#cpv-f-author") as HTMLInputElement | null)?.placeholder ?? null, pubEg: (d.querySelector("#cpv-f-pub") as HTMLInputElement | null)?.placeholder ?? null,
    v: { title: val("#cpv-f-title"), who: val("#cpv-f-author"), pub: val("#cpv-f-pub"), year: val("#cpv-f-year"), note: val("#cpv-f-note"), tag: val("#cpv-f-tag") },
    type: (d.querySelector('[data-cf="type"] [aria-checked="true"]') as HTMLElement | null)?.dataset.media ?? null,
    ready: q('[data-cf="ready"]')?.dataset.state ?? null, readyText: q('[data-cf="ready"] span')?.textContent ?? null,
    tags: [...d.querySelectorAll('[data-cf="tag"]')].map((t) => t.firstChild?.textContent ?? ""),
    suggestions: [...d.querySelectorAll('[data-cf="suggestion"]')].map((t) => t.textContent),
    save: btn("save"), again: btn("again"), cancel: btn("cancel"), remove: btn("remove"), footLine: q('[data-cf="foot-line"]')?.textContent ?? null,
    focus: (document.activeElement as HTMLElement | null)?.id ?? "", open: d.classList.contains("is-in"), mode: q('[data-cf="form"]')?.dataset.mode ?? null,
    bodyTop: body.scrollTop,
  };
});

test.describe.configure({ mode: "serial" });
test.beforeAll(() => { mkdirSync(DIR, { recursive: true }); seed("--empty"); });
test.afterAll(() => { if (!process.env.CV25_KEEP) seed("--restore"); });

test.describe("Comparable titles v26", () => {
  test("AD1 · one heading: the drawer's only heading is its title, in add, first-comp and edit", async ({ page }) => {
    const L = new Ledger("AD1");
    for (const vp of SIZES) {
      const w = `${vp.width}`;
      await emptyPage(page, vp); await openAdd(page); await mutate(page, "AD1");
      let r = await drawer(page);
      L.check(`${w} first: one heading`, r.headings.length === 1 && r.headings[0].text === "Add your first comp" && r.headings[0].inHead, JSON.stringify(r.headings));
      L.check(`${w} first: none in the body`, r.headings.every((h) => !h.inBody), `${r.headings.filter((h) => h.inBody).length} in the body`);
      L.check(`${w} first: subline`, r.sub === "A book, film or show your manuscript sits beside.", `${r.sub}`);
      await openComps(page, vp); await openAdd(page); await mutate(page, "AD1");
      r = await drawer(page);
      L.check(`${w} add: one heading`, r.headings.length === 1 && r.headings[0].text === "Add a comp" && r.headings[0].inHead, JSON.stringify(r.headings));
      L.check(`${w} add: none in the body`, r.headings.every((h) => !h.inBody), `${r.headings.filter((h) => h.inBody).length} in the body`);
      await closeDrawer(page); await openEdit(page, 1); await mutate(page, "AD1");
      r = await drawer(page);
      L.check(`${w} edit: one heading`, r.headings.length === 1 && r.headings[0].text === "Edit Salt Road" && r.headings[0].inHead, JSON.stringify(r.headings));
      L.check(`${w} edit: the byline is the subline`, r.sub === "Imogen Hale · Faber · 2023", `${r.sub}`);
      L.check(`${w} edit: buttons`, r.mode === "edit" && r.save?.text === "Save changes" && !!r.remove && !r.again, `${r.save?.text} · remove ${!!r.remove} · again ${!!r.again}`);
    }
    L.done(16);
  });

  test("AD2 · explainer: open with no comps, a link otherwise, and absent in edit", async ({ page }) => {
    const L = new Ledger("AD2");
    for (const vp of SIZES) {
      const w = `${vp.width}`;
      await emptyPage(page, vp); await openAdd(page);
      let r = await drawer(page);
      L.check(`${w} no comps: the card is open`, r.explain && !r.link, `card ${r.explain} · link ${r.link}`);
      L.check(`${w} no comps: three points`, r.points === 3, `${r.points} points`);
      L.check(`${w} no comps: the hide link`, r.hide === "Got it, hide this", `${r.hide}`);
      await page.locator(`${D}[data-cf="explain-hide"]`).click(); await page.waitForTimeout(150);
      r = await drawer(page);
      L.check(`${w} no comps: hiding folds it to the link`, !r.explain && r.link, `card ${r.explain} · link ${r.link}`);
      await openComps(page, vp); await openAdd(page);
      r = await drawer(page);
      L.check(`${w} with comps: only the folded link`, !r.explain && r.link && r.points === 0, `card ${r.explain} · link ${r.link} · ${r.points} points`);
      /* with no link to press, a click would wait out the whole timeout */
      if (L.red) { L.done(14); return; }
      await page.locator(`${D}[data-cf="explain-link"] button`).click(); await page.waitForTimeout(150);
      r = await drawer(page);
      L.check(`${w} with comps: the link opens the card`, r.explain && r.points === 3 && r.hide === "Hide", `card ${r.explain} · ${r.points} points · ${r.hide}`);
      await closeDrawer(page); await openEdit(page, 1);
      r = await drawer(page);
      L.check(`${w} edit: neither shows`, !r.explain && !r.link, `card ${r.explain} · link ${r.link}`);
    }
    L.done(14);
  });

  test("AD3 · labels follow the type, and what is typed survives a type change", async ({ page }) => {
    const L = new Ledger("AD3");
    const WANT: Record<string, [string, string, string, string]> = {
      book: ["Author", "Publisher", "e.g. R. Okafor", "e.g. Faber"], film: ["Director", "Studio or distributor", "e.g. Tom Arden", "e.g. Film4"],
      tv: ["Creator", "Network or channel", "e.g. Tom Arden", "e.g. BBC Two"], other: ["Creator", "Publisher or platform", "e.g. Tom Arden", "e.g. Audible"],
    };
    for (const vp of SIZES) {
      const w = `${vp.width}`;
      await openComps(page, vp); await openAdd(page);
      await page.locator(`${D}#cpv-f-title`).fill("Last Light");
      await page.locator(`${D}#cpv-f-author`).fill("Tom Arden");
      await page.locator(`${D}#cpv-f-pub`).fill("Film4");
      await page.locator(`${D}#cpv-f-year`).fill("2023");
      for (const m of ["film", "tv", "other", "book"]) {
        await page.locator(`${D}[data-cf="type"] [data-media="${m}"]`).click(); await page.waitForTimeout(120);
        const r = await drawer(page);
        const [who, pub, whoEg, pubEg] = WANT[m];
        L.check(`${w} ${m}: labels`, r.type === m && r.who === who && r.pub === pub, `${r.type}: ${r.who} / ${r.pub}`);
        L.check(`${w} ${m}: placeholders`, r.whoEg === whoEg && r.pubEg === pubEg, `${r.whoEg} / ${r.pubEg}`);
        L.check(`${w} ${m}: typed values survive`, r.v.title === "Last Light" && r.v.who === "Tom Arden" && r.v.pub === "Film4" && r.v.year === "2023", JSON.stringify(r.v));
        L.check(`${w} ${m}: the head's disc shows the type`, r.disc === m, `${r.disc}`);
      }
      /* the year takes digits only, at most four */
      await page.locator(`${D}#cpv-f-year`).fill(""); await page.locator(`${D}#cpv-f-year`).pressSequentially("20a2b45");
      L.check(`${w} year: digits only, four at most`, (await drawer(page)).v.year === "2024", `${(await drawer(page)).v.year}`);
      /* arrow keys move the radio group */
      await page.locator(`${D}[data-cf="type"] [data-media="book"]`).focus(); await page.keyboard.press("ArrowRight"); await page.waitForTimeout(100);
      L.check(`${w} arrow keys move between the types`, (await drawer(page)).type === "film", `${(await drawer(page)).type}`);
    }
    L.done(36);
  });

  test("AD4 · ready: the note's state is ready(), and Save is never blocked by it", async ({ page }) => {
    const L = new Ledger("AD4");
    for (const vp of SIZES) {
      const w = `${vp.width}`;
      await openComps(page, vp); await openAdd(page);
      let r = await drawer(page);
      L.check(`${w} no title: idle, Save disabled`, r.ready === "idle" && r.save?.disabled === true && r.again?.disabled === true && r.footLine === "", `${r.ready} · save disabled ${r.save?.disabled} · "${r.footLine}"`);
      /* book without a publisher: ready() is false */
      await page.locator(`${D}#cpv-f-title`).fill("Salt and Iron"); await page.locator(`${D}#cpv-f-year`).fill("2024"); await page.waitForTimeout(120);
      r = await drawer(page);
      L.check(`${w} book, no publisher: needs`, r.ready === "needs" && r.readyText === "A letter can only name it once it has a publisher and year. You can still save it without.", `${r.ready} · ${r.readyText}`);
      L.check(`${w} book, no publisher: Save is enabled`, r.save?.disabled === false && r.again?.disabled === false, `save disabled ${r.save?.disabled}`);
      L.check(`${w} book, no publisher: the foot's line`, r.footLine === "Fill in the rest any time." || (vp.width < 1100 && r.footLine !== null), `"${r.footLine}"`);
      /* book ready */
      await page.locator(`${D}#cpv-f-pub`).fill("Faber"); await page.waitForTimeout(120);
      r = await drawer(page);
      L.check(`${w} book, ready`, r.ready === "ready" && r.readyText === "Ready to log in a query letter." && r.save?.disabled === false && r.footLine === "Ready for a letter.", `${r.ready} · ${r.readyText} · "${r.footLine}"`);
      /* a film with a year and no studio is ready; without the year it needs one */
      await page.locator(`${D}#cpv-f-pub`).fill(""); await page.locator(`${D}[data-cf="type"] [data-media="film"]`).click(); await page.waitForTimeout(120);
      r = await drawer(page);
      L.check(`${w} film with a year: ready`, r.ready === "ready" && r.save?.disabled === false, `${r.ready}`);
      await page.locator(`${D}#cpv-f-year`).fill(""); await page.waitForTimeout(120);
      r = await drawer(page);
      L.check(`${w} film, no year: needs a year`, r.ready === "needs" && r.readyText === "A letter can only name it once it has a year. You can still save it without." && r.save?.disabled === false, `${r.ready} · ${r.readyText} · save disabled ${r.save?.disabled}`);
    }
    L.done(14);
  });

  test("AD5 · foot: pinned to the drawer's bottom with the body scrolled to its end; no horizontal overflow", async ({ page }) => {
    const L = new Ledger("AD5");
    for (const vp of SIZES) {
      const w = `${vp.width}`;
      await emptyPage(page, vp); await openAdd(page); await mutate(page, "AD5");
      const read = () => page.evaluate(() => {
        const d = document.querySelector('[data-hdr="comp"]') as HTMLElement; const b = d.querySelector('[data-hdr="body"]') as HTMLElement; const f = d.querySelector('[data-cf="foot"]') as HTMLElement; const h = d.querySelector('[data-hdr="head"]') as HTMLElement;
        const r = (e: Element) => { const x = e.getBoundingClientRect(); return { y: x.top, b: x.bottom, x: x.left, r: x.right, h: x.height }; };
        return { d: r(d), f: r(f), h: r(h), body: r(b), can: b.scrollHeight - b.clientHeight, top: b.scrollTop, over: Math.max(d.scrollWidth - d.clientWidth, b.scrollWidth - b.clientWidth), vw: innerWidth, vh: innerHeight,
          wide: [...d.querySelectorAll("*")].filter((e) => e.getBoundingClientRect().right > d.getBoundingClientRect().right + 0.5 && e.getBoundingClientRect().width > 0).length };
      });
      const a = await read();
      L.check(`${w} the body scrolls`, a.can > 100, `${a.can}px to scroll`);
      /* ⚠️ AT THE TOP AS WELL AS AT THE END. A foot inside the scrolling body also sits on the drawer's bottom once the
         body is scrolled to its end, so the end alone cannot tell a pinned foot from a scrolled one (the named mutation
         passed green against it). Pinned means: on the drawer's bottom wherever the body is. */
      L.check(`${w} at the top: the foot's bottom is the drawer's bottom`, a.top === 0 && near(a.f.b, a.d.b, 1), `scrollTop ${a.top} · foot ${a.f.b} · drawer ${a.d.b}`);
      await page.evaluate(() => { const b = document.querySelector('[data-hdr="comp"] [data-hdr="body"]') as HTMLElement; b.scrollTop = b.scrollHeight; });
      await page.waitForTimeout(200);
      const z = await read();
      L.check(`${w} scrolled to the end`, near(z.top, z.can, 1), `scrollTop ${z.top} of ${z.can}`);
      L.check(`${w} at the end: the foot's bottom is the drawer's bottom`, near(z.f.b, z.d.b, 1), `foot ${z.f.b} · drawer ${z.d.b}`);
      L.check(`${w} the foot did not move with the scroll`, near(z.f.y, a.f.y, 0.5), `foot top ${a.f.y} → ${z.f.y}`);
      L.check(`${w} the head stays at the drawer's top`, near(z.h.y, z.d.y, 1), `head ${z.h.y} · drawer ${z.d.y}`);
      L.check(`${w} the drawer floats: inset 8, on screen`, near(z.d.y, 8) && near(z.vh - z.d.b, 8) && near(z.vw - z.d.r, 8), `top ${z.d.y} · bottom ${z.vh - z.d.b} · right ${z.vw - z.d.r}`);
      L.check(`${w} no horizontal overflow`, z.over <= 0 && z.wide === 0, `${z.over}px · ${z.wide} element(s) past the edge`);
      const r = await drawer(page);
      L.check(`${w} Add is disabled with an empty title`, r.save?.disabled === true && r.save?.text === "Add comp" && r.again?.text === "Add and add another" && r.cancel?.text === "Cancel", `${r.save?.text} disabled ${r.save?.disabled}`);
    }
    L.done(18);
  });

  test("AD8 · preview: the library row's own comp cell, and its title is the Title input", async ({ page }) => {
    const L = new Ledger("AD8");
    for (const vp of SIZES) {
      const w = `${vp.width}`;
      await openComps(page, vp); await openAdd(page);
      const read = () => page.evaluate(() => {
        const shape = (e: Element | null): unknown => (e ? { tag: e.tagName, cls: [...e.classList].filter((c) => c !== "is-placeholder" && c !== "is-ring" && c !== "cv-addl--words").sort().join(" "), probe: e.getAttribute("data-cv"), kids: [...e.children].filter((k) => k.tagName !== "svg" && k.tagName !== "BUTTON" && !k.classList.contains("cv-addl")).map(shape) } : null);
        const w2 = window as any;
        const rowCell = w2.__q('[data-cv="row"] [data-cv="comp-cell"]');
        const prev = document.querySelector('[data-hdr="comp"] [data-cf="preview"]') as HTMLElement | null;
        const cell = prev?.querySelector('[data-cv="comp-cell"]') ?? prev?.firstElementChild ?? null;
        const nx = prev?.querySelector('[data-cv="row-next"]') ?? null;
        return { row: JSON.stringify(shape(rowCell)), cell: JSON.stringify(shape(cell)), title: prev?.querySelector('[data-cv="row-title"]')?.textContent ?? null, placeholder: prev?.querySelector('[data-cv="row-title"]')?.classList.contains("is-placeholder") ?? null,
          by: prev?.querySelector('[data-cv="row-by"]')?.textContent ?? null, next: nx?.querySelector(".cv-nxt")?.textContent ?? null, nxRow: JSON.stringify(shape(w2.__q('[data-cv="row"] [data-cv="row-next"]'))), nxPrev: JSON.stringify(shape(nx)), tray: !!prev?.querySelector('[data-cv="row-tray"]') };
      });
      await mutate(page, "AD8");
      let r = await read();
      L.check(`${w} empty: the placeholder title`, r.title === "Your comp’s title" && r.placeholder === true, `"${r.title}" · placeholder ${r.placeholder}`);
      await page.locator(`${D}#cpv-f-title`).fill("Salt and Iron"); await page.locator(`${D}#cpv-f-author`).fill("J. Mercer"); await page.locator(`${D}#cpv-f-year`).fill("2024");
      await page.waitForTimeout(150); await mutate(page, "AD8");
      r = await read();
      L.check(`${w} the row's own comp cell exists`, !!r.row && r.row !== "null", `${r.row?.slice(0, 80)}`);
      L.check(`${w} same element type and class set as a row's comp cell`, r.cell === r.row, `preview ${r.cell?.slice(0, 110)} · row ${r.row?.slice(0, 110)}`);
      L.check(`${w} its title is the Title input`, r.title === "Salt and Iron" && r.placeholder === false, `"${r.title}"`);
      L.check(`${w} its byline follows the fields`, r.by === "J. Mercer · add publisher · 2024", `"${r.by}"`);
      L.check(`${w} the next-move cell is the row's own, with no tray`, r.next === "Add a publisher" && !r.tray, `"${r.next}" · tray ${r.tray}`);
    }
    L.done(12);
  });

  /* AD9 (the exhibit draws no query line, no drag handle and no switch) RETIRED with comps v27: the exhibit is deleted.
     Its absence is held by V2 in compsV27.measure.ts. */

  /* ── the writing cases: each re-seeds first ── */

  test("AD6 · again: one comp written, the drawer open on an empty form, Book, focus in Title, the explainer folded", async ({ page }) => {
    const L = new Ledger("AD6");
    for (const vp of SIZES) {
      const w = `${vp.width}`;
      seed("--empty");
      await emptyPage(page, vp); await openAdd(page);
      let r = await drawer(page);
      L.check(`${w} before: the first-comp form, explainer open`, r.title === "Add your first comp" && r.explain, `${r.title} · card ${r.explain}`);
      await page.locator(`${D}[data-cf="type"] [data-media="film"]`).click();
      await page.locator(`${D}#cpv-f-title`).fill("Last Light"); await page.locator(`${D}#cpv-f-author`).fill("Tom Arden"); await page.locator(`${D}#cpv-f-year`).fill("2023");
      await page.locator(`${D}#cpv-f-note`).fill("One crossing, real time.");
      await page.locator(`${D}[data-cf="again"]`).click();
      const stored = () => { try { return (JSON.parse(seed("--dump", "--ms", "cv25-ms-empty").split("\n").pop()!).comps ?? []) as Record<string, unknown>[]; } catch { return []; } };
      await expect.poll(() => stored().length, { timeout: 20_000 }).toBe(1);
      await page.waitForTimeout(500);
      const s = stored();
      L.check(`${w} one comp written`, s.length === 1 && s[0].title === "Last Light" && s[0].media === "film" && s[0].year === 2023 && /^cmp_/.test(String(s[0].id)), JSON.stringify(s).slice(0, 200));
      /* asked on its own: a drawer that closed is gone from the document, and reading it whole would throw */
      const still = await page.evaluate(() => !!document.querySelector('[data-hdr="comp"].is-in [data-cf="form"][data-mode="add"]'));
      L.check(`${w} the drawer stays open, in add mode`, still, still ? "open" : "closed");
      if (L.red) { L.done(18); return; }
      r = await drawer(page);
      L.check(`${w} every field is empty`, Object.values(r.v).every((x) => x === "") && r.tags.length === 0, JSON.stringify(r.v));
      L.check(`${w} the type is back on Book`, r.type === "book" && r.who === "Author" && r.disc === "book", `${r.type} · ${r.who}`);
      L.check(`${w} focus is in Title`, r.focus === "cpv-f-title", `focus "${r.focus}"`);
      L.check(`${w} the explainer is folded, and the title says so`, !r.explain && r.link && r.title === "Add a comp", `card ${r.explain} · link ${r.link} · ${r.title}`);
      L.check(`${w} the body is back at the top`, r.bodyTop === 0, `scrollTop ${r.bodyTop}`);
      /* a plain Add closes the drawer */
      await page.locator(`${D}#cpv-f-title`).fill("Second One"); await page.locator(`${D}[data-cf="save"]`).click();
      await expect.poll(() => stored().length, { timeout: 20_000 }).toBe(2);
      await page.waitForTimeout(700);
      const gone = await page.evaluate(() => { const d = document.querySelector('[data-hdr="comp"]'); return !d || !d.classList.contains("is-in"); });
      L.check(`${w} a plain Add closes it`, gone, gone ? "closed" : "still open");
    }
    L.done(18);
  });

  test("AD7 · tags: saved to matchAxis as today, read back as two chips; a seventh is refused", async ({ page }) => {
    const L = new Ledger("AD7");
    seed("--empty");
    await openComps(page, SIZES[0]); await openAdd(page);
    await page.locator(`${D}#cpv-f-title`).fill("Salt and Iron");
    /* one by a suggestion, one typed with Enter */
    await page.locator(`${D}[data-cf="suggestion"]`, { hasText: "Tone" }).click();
    await page.locator(`${D}#cpv-f-tag`).fill("Coastal"); await page.keyboard.press("Enter"); await page.waitForTimeout(120);
    let r = await drawer(page);
    L.check("two tags in the box", r.tags.join("|") === "Tone|Coastal", r.tags.join("|"));
    L.check("a used suggestion is hidden", !r.suggestions.includes("Tone") && r.suggestions.length === 6, r.suggestions.join(","));
    /* no duplicate, ignoring case; a comma adds; Backspace in the empty input removes the last */
    await page.locator(`${D}#cpv-f-tag`).fill("coastal"); await page.keyboard.press("Enter"); await page.waitForTimeout(100);
    L.check("no duplicate, ignoring case", (await drawer(page)).tags.length === 2, (await drawer(page)).tags.join("|"));
    await page.locator(`${D}#cpv-f-tag`).fill(""); await page.locator(`${D}#cpv-f-tag`).pressSequentially("One,"); await page.waitForTimeout(100);
    L.check("a comma adds a tag", (await drawer(page)).tags.join("|") === "Tone|Coastal|One", (await drawer(page)).tags.join("|"));
    await page.keyboard.press("Backspace"); await page.waitForTimeout(100);
    L.check("Backspace removes the last", (await drawer(page)).tags.join("|") === "Tone|Coastal", (await drawer(page)).tags.join("|"));
    /* a seventh is refused */
    for (const t of ["A", "B", "C", "D"]) { await page.locator(`${D}#cpv-f-tag`).fill(t); await page.keyboard.press("Enter"); }
    await page.waitForTimeout(120);
    r = await drawer(page);
    L.check("six tags are held", r.tags.length === 6, r.tags.join("|"));
    await page.locator(`${D}#cpv-f-tag`).fill("Seventh", { force: true }).catch(() => {});
    await page.keyboard.press("Enter").catch(() => {});
    const sug = page.locator(`${D}[data-cf="suggestion"]`).first();
    if (await sug.count()) await sug.evaluate((e) => (e as HTMLElement).click());
    await page.waitForTimeout(120);
    r = await drawer(page);
    L.check("a seventh is refused", r.tags.length === 6 && !r.tags.includes("Seventh"), r.tags.join("|"));
    /* back to the two, and save */
    for (let i = 0; i < 4; i++) await page.locator(`${D}[data-cf="tag"]`).last().locator("button").click();
    await page.waitForTimeout(120);
    L.check("back to two", (await drawer(page)).tags.join("|") === "Tone|Coastal", (await drawer(page)).tags.join("|"));
    await page.locator(`${D}[data-cf="save"]`).click();
    await expect.poll(() => dump().comps.length, { timeout: 20_000 }).toBe(8);
    const c = dump().comps.find((x) => x.title === "Salt and Iron")!;
    L.check("stored in matchAxis, joined as today", c.matchAxis === "Tone · Coastal", `${JSON.stringify(c.matchAxis)}`);
    const toast = await page.locator(".sa-toast").last().textContent().catch(() => "");
    L.check("the toast, with Undo", /Added Salt and Iron to your library\./.test(toast ?? "") && (await page.locator(".sa-toast-undo").count()) > 0, `${toast}`);
    await page.waitForTimeout(700);
    /* the comp drawer reads them back under "Matches on" */
    await scrollTo(page, '[data-cv="lib-head"]', 24);
    await page.locator(`${P}[data-cv="row"]`).last().click();
    await page.waitForSelector('[data-hdr="comp"].is-in'); await page.waitForTimeout(500);
    const back = await page.evaluate(() => { const d = document.querySelector('[data-hdr="comp"]')!; return { title: d.querySelector('[data-cv="drawer-title"]')?.textContent, label: d.querySelector('[data-cv="drawer-tags-label"]')?.textContent, chips: [...d.querySelectorAll('[data-cv="drawer-tags"] span')].map((s) => s.textContent) }; });
    L.check("\"Matches on\" reads them back as two chips", back.title === "Salt and Iron" && back.label === "Matches on" && back.chips.join("|") === "Tone|Coastal", JSON.stringify(back));
    L.done(10);
  });

  test("AD10 · focus and keys: opening puts focus in Title; ✕, Cancel and Escape return it to the opener; Cmd/Ctrl + Enter saves from the note", async ({ page }) => {
    const L = new Ledger("AD10");
    /* what has focus, named: an id, else its probe */
    const focus = () => page.evaluate(() => { const a = document.activeElement as HTMLElement | null; return !a || a === document.body ? "body" : a.id || a.getAttribute("data-cv") || a.getAttribute("data-cf") || a.tagName; });
    const closed = async () => { await page.waitForSelector('[data-hdr="comp"]', { state: "detached", timeout: 5_000 }).catch(() => {}); await page.waitForTimeout(250); return (await page.locator('[data-hdr="comp"]').count()) === 0; };
    for (const [i, vp] of SIZES.entries()) {
      const w = `${vp.width}`;
      seed("--empty");
      await openComps(page, vp);
      const WAYS: [string, () => Promise<void>][] = [
        ["✕", () => page.locator(`${D}[data-cv="drawer-close"]`).click()],
        ["Cancel", () => page.locator(`${D}[data-cf="cancel"]`).click()],
        ["Escape", () => page.keyboard.press("Escape")],
      ];
      for (const [name, close] of WAYS) {
        await openAdd(page);
        L.check(`${w} add: opening puts focus in Title (before ${name})`, (await focus()) === "cpv-f-title", await focus());
        await close();
        const shut = await closed();
        const back = await page.evaluate((sel) => document.activeElement === document.querySelector(sel), `${P}[data-cv="add"]`);
        L.check(`${w} add: ${name} closes the drawer and returns focus to "Add a comp"`, shut && back, `closed ${shut} · focus on ${await focus()}`);
      }
      /* edit, opened from a row's own Edit */
      await openEdit(page, 1);
      L.check(`${w} edit: opening puts focus in Title`, (await focus()) === "cpv-f-title", await focus());
      await page.keyboard.press("Escape");
      const shut = await closed();
      const back = await page.evaluate((sel) => document.activeElement === document.querySelectorAll(sel)[1]?.querySelector('[data-cv="tray-edit"]'), `${P}[data-cv="row"]`);
      L.check(`${w} edit: Escape returns focus to the row's Edit`, shut && back, `closed ${shut} · focus on ${await focus()}`);
      /* Cmd + Enter at one size, Ctrl + Enter at the other, from the note */
      const key = i === 0 ? "Meta+Enter" : "Control+Enter";
      const n0 = dump().comps.length;
      await scrollTo(page, '[data-cv="page"]', 0).catch(() => {});
      await openAdd(page);
      await page.locator(`${D}#cpv-f-title`).fill("Keyed Save");
      await page.locator(`${D}#cpv-f-note`).fill("Saved from the note.");
      L.check(`${w} the caret is in the note`, (await focus()) === "cpv-f-note", await focus());
      await page.keyboard.press(key);
      await expect.poll(() => dump().comps.length, { timeout: 15_000 }).toBe(n0 + 1).catch(() => {});
      const after = dump().comps;
      const made = after.find((c) => c.title === "Keyed Save");
      L.check(`${w} ${key} from the note saves the comp, once`, after.length === n0 + 1 && made?.note === "Saved from the note.", `${n0} → ${after.length} · note "${made?.note ?? "none"}"`);
      L.check(`${w} and the drawer closes`, await closed(), `drawer count ${await page.locator('[data-hdr="comp"]').count()}`);
    }
    L.done(22);
  });
});

test("AD · every lock has a named mutation", () => {
  expect([...Object.keys(MUTATIONS), ...SOURCE_MUTATIONS].sort()).toEqual(["AD1", "AD10", "AD2", "AD3", "AD4", "AD5", "AD6", "AD7", "AD8"]);
});
