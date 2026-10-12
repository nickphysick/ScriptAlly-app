/**
 * Comparable titles v27 — a new header, a real empty page, and "how it works" as a pop-up: the V27 locks,
 * measured on the rendered page at 1512 × 900 and 1280 × 800, on the fixture `seedCompsV25.mjs` writes
 * (`cv25-ms`, seven comps; `cv25-ms-empty`, none).
 *
 *   V1 header · V2 empty · V3 card · V4 first · V5 switch · V6 no flash · V7 no band · V8 pop-up ·
 *   V9 picker · V10 one component
 *
 * MUTATIONS. `V27_MUTATE=<lock>` applies that lock's named break. Three are applied in the page (below).
 * Seven are edits to the source and need a rebuilt bundle; `v27Mutations.sh` makes the edit, rebuilds,
 * runs the lock and puts the file back from a copy: V2, V4, V5, V6, V7, V8, V9.
 *
 * ⚠️ V5 WRITES A COMP AND REMOVES IT. It re-seeds first, and the fixture is removed after the run.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { MS_EMPTY, SIZES, type Vp, dump, openComps, pixelAt, seed } from "./cv25Lib";

const DIR = "reports/comps-v27";
const MUT = process.env.V27_MUTATE ?? "";
const near = (a: number, b: number, t = 1) => Math.abs(a - b) <= t;

const TITLE = "Comparable titles";
const SUB = "Build your comps library, add to query letters, and track what’s working.";
const MS_TITLE = "Murphy's Day Out";
const OLD_SUB = "Log the comps each letter names, and see which agents saw them.";
const PAPER = "251,249,245";

const MUTATIONS: Record<string, { css?: string; js?: string; what: string }> = {
  V1: { what: "restore the old subline", js: `(() => { const s = window.__q('[data-cv="panel"] [data-probe="intro"]'); if (s) s.textContent = ${JSON.stringify(OLD_SUB)}; })()` },
  V3: { what: "restore the full-width tint", css: `[data-cv="empty"] { box-shadow: 0 0 0 100vmax #fbf9f5 !important; clip-path: inset(0 -100vmax) !important; }` },
  V10: { what: "copy the steps markup into the pop-up", js: `(() => { const s = document.querySelector('[data-cv="how-pop"] [data-cv="steps"]'); if (!s || s.dataset.mut) return; const c = document.createElement("section"); c.className = "hw"; c.dataset.cv = "steps"; c.dataset.mut = "1"; c.innerHTML = s.innerHTML; s.replaceWith(c); })()` },
};
const SOURCE_MUTATIONS = ["V2", "V4", "V5", "V6", "V7", "V8", "V9"];

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
    if (!MUT && !process.env.V27_REDFIRST) expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
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
/** the empty page: the manuscript with no comps, loaded */
const emptyPage = async (page: Page, vp: Vp) => {
  await openComps(page, vp, { ms: MS_EMPTY });
  await page.waitForFunction(() => { const p = (window as any).__q('[data-cv="panel"]'); return !!p && !p.hasAttribute("data-loading"); }, null, { timeout: 30_000 });
  await page.waitForTimeout(300);
};
const has = (page: Page, sel: string) => page.evaluate((s) => (window as any).__qa(s).filter((e: HTMLElement) => e.getBoundingClientRect().height > 0).length, sel);
/** elements anywhere in the document that are on screen */
const shown = (page: Page, sel: string) => page.evaluate((s) => [...document.querySelectorAll(s)].filter((e) => e.getBoundingClientRect().height > 0).length, sel);
/** what has focus, named by its probe */
const focus = (page: Page) => page.evaluate(() => { const a = document.activeElement as HTMLElement | null; return !a || a === document.body ? "body" : a.getAttribute("data-cv") || a.id || a.tagName; });
const gone = async (page: Page, sel: string) => { await page.waitForSelector(sel, { state: "detached", timeout: 5_000 }).catch(() => {}); await page.waitForTimeout(250); return (await page.locator(sel).count()) === 0; };
const openHow = async (page: Page) => {
  /* with no link there is nothing to press, and a click would wait out the whole timeout */
  if (!(await page.locator(`${P}[data-cv="how-link"]`).count())) return false;
  await page.locator(`${P}[data-cv="how-link"]`).click();
  await page.waitForSelector('[data-cv="how-pop"]', { timeout: 5_000 }).catch(() => {});
  await page.waitForTimeout(450);
  return (await page.locator('[data-cv="how-pop"]').count()) === 1;
};

/** the header, read whole */
const header = (page: Page) => page.evaluate(() => {
  const w = window as any;
  const p = w.__q('[data-cv="panel"]') as HTMLElement;
  const h1 = p.querySelector("h1[data-page-title]") as HTMLElement;
  const sub = p.querySelector('[data-probe="intro"]') as HTMLElement | null;
  const on = (e: Element) => (e as HTMLElement).getBoundingClientRect().height > 0;
  return {
    h1: h1.getAttribute("aria-label") ?? h1.querySelector("[aria-label]")?.getAttribute("aria-label") ?? h1.textContent ?? "",
    lines: Math.round(h1.getBoundingClientRect().height / parseFloat(getComputedStyle(h1).lineHeight)),
    sub: sub?.textContent ?? "", text: p.textContent ?? "", ms: p.querySelectorAll('[data-cv="panel-ms"]').length,
    buttons: [...p.querySelectorAll("button")].filter(on).map((b) => (b.textContent ?? "").trim()),
    note: (p.querySelector('[data-cv="first-note"]') as HTMLElement | null)?.textContent ?? null,
    link: p.querySelectorAll('[data-cv="how-link"]').length,
  };
});

test.describe.configure({ mode: "serial" });
test.beforeAll(() => { mkdirSync(DIR, { recursive: true }); seed("--empty"); });
test.afterAll(() => { if (!process.env.CV25_KEEP) seed("--restore"); });

test.describe("Comparable titles v27", () => {
  test("V1 · header: \"Comparable titles\" and the new subline in both states; no manuscript title in the panel", async ({ page }) => {
    const L = new Ledger("V1");
    for (const vp of SIZES) {
      for (const [state, open] of [["with comps", () => openComps(page, vp)], ["empty", () => emptyPage(page, vp)]] as const) {
        const w = `${vp.width} ${state}:`;
        await open(); await mutate(page, "V1");
        const r = await header(page);
        L.check(`${w} the h1`, r.h1 === TITLE && r.lines === 1, `"${r.h1}" on ${r.lines} line(s)`);
        L.check(`${w} the subline`, r.sub === SUB, `"${r.sub}"`);
        L.check(`${w} no manuscript title in the panel`, r.ms === 0 && !r.text.includes(MS_TITLE), `${r.ms} title element(s)${r.text.includes(MS_TITLE) ? ` · names "${MS_TITLE}"` : ""}`);
      }
    }
    L.done(12);
  });

  test("V2 · empty: one button and the note in the header; no strip, library, Scout tab, link or exhibit", async ({ page }) => {
    const L = new Ledger("V2");
    for (const vp of SIZES) {
      const w = `${vp.width}`;
      await emptyPage(page, vp);
      const r = await header(page);
      L.check(`${w} exactly one button, "+ Add your first comp"`, r.buttons.join("|") === "+ Add your first comp", `[${r.buttons.join(" | ")}]`);
      L.check(`${w} the note beside it`, r.note === "Only the title is needed to start.", `"${r.note}"`);
      const n = { strip: await has(page, '[data-gst="comps"]'), library: (await has(page, '[data-cv="lib-head"]')) + (await has(page, '[data-cv="row"]')), scout: await shown(page, '[data-ftab="scout"], [data-ft="scout"], [data-floating-tab="scout"]'), scoutWord: await shown(page, 'button[aria-label^="Open the Scout"]'), link: r.link, exhibit: (await has(page, '[data-lh="band"]')) + (await has(page, '[data-cpv="comp"]')) };
      L.check(`${w} no strip`, n.strip === 0, `${n.strip}`);
      L.check(`${w} no library`, n.library === 0, `${n.library}`);
      L.check(`${w} no Scout tab`, n.scout + n.scoutWord === 0, `${n.scout + n.scoutWord}`);
      L.check(`${w} no "How comp tracking works" link`, n.link === 0, `${n.link}`);
      L.check(`${w} no exhibit`, n.exhibit === 0, `${n.exhibit} exhibit element(s)`);
      L.check(`${w} the steps card is there`, (await has(page, '[data-cv="empty"] [data-cv="steps"]')) === 1, `${await has(page, '[data-cv="empty"] [data-cv="steps"]')}`);
    }
    L.done(16);
  });

  test("V3 · card: the steps card is the panel's width, and the page shows around it", async ({ page }) => {
    const L = new Ledger("V3");
    for (const vp of SIZES) {
      const w = `${vp.width}`;
      await emptyPage(page, vp); await mutate(page, "V3");
      const r = await page.evaluate(() => { const w2 = window as any; return { card: w2.__box(w2.__q('[data-cv="empty"]')), panel: w2.__box(w2.__q('[data-cv="panel"]')), pick: w2.__qa('[data-cv="empty"] [data-cv="how-pick"]').length, steps: w2.__qa('[data-cv="empty"] [data-cv="how-step"]').length }; });
      L.check(`${w} the card is on the page, with three steps and no "Log" link`, !!r.card && r.steps === 3 && r.pick === 0, `card ${!!r.card} · ${r.steps} steps · ${r.pick} link(s)`);
      if (!r.card) continue;
      L.check(`${w} its left and right edges are the panel's`, near(r.card.x, r.panel.x) && near(r.card.r, r.panel.r), `card ${r.card.x.toFixed(1)}–${r.card.r.toFixed(1)} · panel ${r.panel.x.toFixed(1)}–${r.panel.r.toFixed(1)}`);
      L.check(`${w} it sits 32 below the panel`, near(r.card.y - r.panel.b, 32), `${(r.card.y - r.panel.b).toFixed(1)}`);
      const y = Math.min(r.card.y + 120, vp.height - 20);
      const out = await pixelAt(page, r.card.x - 4, y), ground = await pixelAt(page, r.panel.x - 4, r.panel.y + 60), inside = await pixelAt(page, r.card.x + 12, y);
      L.check(`${w} 4px outside its left edge is the page, not paper`, out === ground && out !== PAPER, `outside ${out} · the page ${ground}`);
      L.check(`${w} inside it is paper`, inside === PAPER, inside);
    }
    L.done(10);
  });

  test("V4 · first: the button opens the drawer titled \"Add your first comp\" with the explainer open", async ({ page }) => {
    const L = new Ledger("V4");
    for (const vp of SIZES) {
      const w = `${vp.width}`;
      await emptyPage(page, vp);
      const label = (await page.locator(`${P}[data-cv="add"]`).textContent()) ?? "";
      L.check(`${w} the button`, label.trim() === "+ Add your first comp", `"${label.trim()}"`);
      await page.locator(`${P}[data-cv="add"]`).click();
      await page.waitForSelector('[data-hdr="comp"].is-in', { timeout: 10_000 }); await page.waitForTimeout(500);
      const r = await page.evaluate(() => { const d = document.querySelector('[data-hdr="comp"]')!; const e = d.querySelector('[data-cf="explain"]') as HTMLElement | null; return { title: d.querySelector('[data-cv="drawer-title"]')?.textContent, explain: !!e && e.getBoundingClientRect().height > 0, points: d.querySelectorAll('[data-cf="explain-point"]').length }; });
      L.check(`${w} the drawer's title`, r.title === "Add your first comp", `"${r.title}"`);
      L.check(`${w} the explainer is open`, r.explain && r.points === 3, `open ${r.explain} · ${r.points} points`);
      await page.keyboard.press("Escape"); await page.waitForTimeout(500);
    }
    L.done(6);
  });

  test("V6 · no flash: from navigation to loaded, a seeded account never draws the empty card", async ({ page }) => {
    const L = new Ledger("V6");
    for (const vp of SIZES) {
      const w = `${vp.width}`;
      /* installed before any of the page's own script runs: every frame's worth of DOM change is seen */
      await page.addInitScript(() => {
        const w2 = window as any; w2.__v6 = { card: 0, loadingSeen: 0, belowWhileLoading: 0 };
        const look = () => {
          const pg = [...document.querySelectorAll('[data-cv="page"]')].find((e) => (e as HTMLElement).getBoundingClientRect().height > 0);
          if (!pg) return;
          if (pg.querySelector('[data-cv="empty"]')) w2.__v6.card++;
          const panel = pg.querySelector('[data-cv="panel"]');
          if (panel?.hasAttribute("data-loading")) {
            w2.__v6.loadingSeen++;
            const group = pg.querySelector('[data-cv="group"]');
            if (group && [...group.children].some((c) => c !== panel && (c as HTMLElement).getBoundingClientRect().height > 0)) w2.__v6.belowWhileLoading++;
          }
        };
        new MutationObserver(look).observe(document, { subtree: true, childList: true, attributes: true });
      });
      await openComps(page, vp, { hold: 1500 });
      await page.waitForFunction(() => (window as any).__qa('[data-cv="row"]').length > 0, null, { timeout: 30_000 });
      await page.waitForTimeout(400);
      const r = await page.evaluate(() => ({ ...(window as any).__v6, rows: (window as any).__qa('[data-cv="row"]').length }));
      /* the precondition: there WAS a loading state to flash in */
      L.check(`${w} a loading state was seen, then seven rows`, r.loadingSeen > 0 && r.rows === 7, `${r.loadingSeen} loading reading(s) · ${r.rows} rows`);
      L.check(`${w} the empty card was never drawn`, r.card === 0, `${r.card} reading(s) with the card`);
      L.check(`${w} nothing below the header while loading`, r.belowWhileLoading === 0, `${r.belowWhileLoading} reading(s) with something below`);
    }
    L.done(6);
  });

  test("V7 · no band: with comps, no steps render until the link is pressed", async ({ page }) => {
    const L = new Ledger("V7");
    for (const vp of SIZES) {
      const w = `${vp.width}`;
      await openComps(page, vp);
      const before = await page.evaluate(() => ({ steps: document.querySelectorAll('[data-cv="steps"], [data-cv="how"], [data-cv="how-step"]').length, strip: (window as any).__box((window as any).__q('[data-gst="comps"]')), panel: (window as any).__box((window as any).__q('[data-cv="panel"]')), wide: !!document.querySelector(".ws-app.sheet-wide") }));
      L.check(`${w} no steps anywhere in the document`, before.steps === 0, `${before.steps} element(s)`);
      L.check(`${w} the strip follows the header at its own spacing`, !!before.strip && near(before.strip.y - before.panel.b, before.wide ? 40 : 34), before.strip ? `${(before.strip.y - before.panel.b).toFixed(1)}` : "no strip");
      const opened = await openHow(page);
      const after = await page.evaluate(() => ({ inPop: document.querySelectorAll('[data-cv="how-pop"] [data-cv="steps"]').length, inPage: document.querySelectorAll('[data-cv="page"] [data-cv="steps"]').length, all: document.querySelectorAll('[data-cv="steps"]').length }));
      L.check(`${w} pressing the link draws them once, in the pop-up`, opened && after.inPop === 1 && after.inPage === 0 && after.all === 1, `opened ${opened} · ${after.inPop} in the pop-up · ${after.inPage} on the page`);
      await page.keyboard.press("Escape"); await page.waitForTimeout(400);
    }
    L.done(6);
  });

  test("V8 · pop-up: a dialog holding the steps; ✕, Escape and the scrim close it; focus goes to ✕ and back to the link", async ({ page }) => {
    const L = new Ledger("V8");
    for (const vp of SIZES) {
      const w = `${vp.width}`;
      await openComps(page, vp);
      const WAYS: [string, () => Promise<void>][] = [
        ["✕", () => page.locator('[data-cv="how-close"]').click()],
        ["Escape", () => page.keyboard.press("Escape")],
        ["a click on the scrim", () => page.mouse.click(6, 6)],
      ];
      for (const [i, [name, close]] of WAYS.entries()) {
        const opened = await openHow(page);
        if (i === 0) {
          const r = await page.evaluate(() => {
            const p = document.querySelector('[data-cv="how-pop"]') as HTMLElement | null; if (!p) return null;
            const by = p.getAttribute("aria-labelledby"); const b = p.getBoundingClientRect(); const dim = document.querySelector('[data-cv="how-dim"]') as HTMLElement | null;
            const x = p.querySelector('[data-cv="how-close"]') as HTMLElement | null; const xb = x?.getBoundingClientRect();
            return { role: p.getAttribute("role"), modal: p.getAttribute("aria-modal"), name: by ? document.getElementById(by)?.textContent ?? null : null, steps: p.querySelectorAll('[data-cv="how-step"]').length, pick: p.querySelector('[data-cv="how-pick"]')?.textContent ?? null, w: b.width, vw: innerWidth, scrim: dim ? getComputedStyle(dim).backgroundColor : null, bg: getComputedStyle(p).backgroundColor, x: xb ? { w: xb.width, top: xb.top - b.top, right: b.right - xb.right } : null };
          });
          L.check(`${w} the link opens a dialog`, opened && !!r && r.role === "dialog" && r.modal === "true", r ? `${r.role} · modal ${r.modal}` : "no dialog");
          if (!r) { L.done(22); return; }
          L.check(`${w} labelled by its heading`, r.name === "How comp tracking works.", `"${r.name}"`);
          L.check(`${w} it holds the three steps and the "Log" link`, r.steps === 3 && r.pick === "Log the comps in a letter", `${r.steps} steps · "${r.pick}"`);
          L.check(`${w} the box`, near(r.w, Math.min(1080, r.vw - 48)) && r.bg === "rgb(251, 249, 245)" && r.scrim === "rgba(27, 36, 51, 0.5)", `${r.w.toFixed(0)} wide of ${r.vw} · ${r.bg} · scrim ${r.scrim}`);
          L.check(`${w} ✕ is 36px, 16 from the top and right`, !!r.x && near(r.x.w, 36) && near(r.x.top, 16) && near(r.x.right, 16), r.x ? `${r.x.w} · ${r.x.top.toFixed(1)} · ${r.x.right.toFixed(1)}` : "none");
        }
        L.check(`${w} on open, focus is on ✕ (before ${name})`, opened && (await focus(page)) === "how-close", `opened ${opened} · focus on ${await focus(page)}`);
        if (!opened) { L.done(22); return; }
        await close();
        const shut = await gone(page, '[data-cv="how-pop"]');
        L.check(`${w} ${name} closes it and returns focus to the link`, shut && (await focus(page)) === "how-link", `closed ${shut} · focus on ${await focus(page)}`);
        if (!shut) { await page.keyboard.press("Escape"); await page.waitForTimeout(300); }
      }
    }
    L.done(22);
  });

  test("V9 · picker: the pop-up's link closes it and opens the picker; one Escape then closes only the picker", async ({ page }) => {
    const L = new Ledger("V9");
    for (const vp of SIZES) {
      const w = `${vp.width}`;
      await openComps(page, vp);
      const opened = await openHow(page);
      L.check(`${w} the pop-up opens`, opened, `${opened}`);
      if (!opened) { L.done(8); return; }
      await page.locator('[data-cv="how-pop"] [data-cv="how-pick"]').click();
      await page.waitForSelector('[data-cv="picker"]', { timeout: 5_000 }).catch(() => {});
      await page.waitForTimeout(400);
      const a = { pop: await page.locator('[data-cv="how-pop"]').count(), picker: await page.locator('[data-cv="picker"]').count(), letter: await page.evaluate(() => (document.querySelector('[data-cv="picker"]') as HTMLElement | null)?.dataset.letter ?? "") };
      L.check(`${w} the link closes the pop-up and opens the picker`, a.pop === 0 && a.picker === 1, `${a.pop} pop-up · ${a.picker} picker`);
      L.check(`${w} the picker is on a letter`, !!a.letter, `"${a.letter}"`);
      await page.keyboard.press("Escape"); await page.waitForTimeout(500);
      const b = { pop: await page.locator('[data-cv="how-pop"]').count(), picker: await page.locator('[data-cv="picker"]').count(), drawer: await page.locator('[data-hdr="comp"]').count(), rows: await has(page, '[data-cv="row"]') };
      L.check(`${w} one Escape closes the picker and nothing is left open`, b.picker === 0 && b.pop === 0 && b.drawer === 0 && b.rows === 7, `${b.picker} picker · ${b.pop} pop-up · ${b.drawer} drawer · ${b.rows} rows`);
      if (b.pop) { await page.keyboard.press("Escape"); await page.waitForTimeout(300); }
    }
    L.done(8);
  });

  test("V10 · one component: the empty card and the pop-up render the same steps", async ({ page }) => {
    const L = new Ledger("V10");
    /* the steps' root, as a signature: its classes and the shape of what it holds, less the optional link */
    const sig = (sel: string) => page.evaluate((s) => {
      const r = document.querySelector(s) as HTMLElement | null; if (!r) return null;
      const shape = (e: Element): string => e.getAttribute("data-cv") === "how-pick" ? "" : `${e.tagName}.${[...e.classList].sort().join(".")}[${[...e.children].map(shape).filter(Boolean).join(",")}]`;
      return { tag: r.tagName, classes: [...r.classList].sort().join(" "), shape: shape(r), heads: [...r.querySelectorAll("h3")].map((h) => h.textContent), h2: r.querySelector("h2")?.textContent ?? null };
    }, sel);
    for (const vp of SIZES) {
      const w = `${vp.width}`;
      await emptyPage(page, vp);
      const card = await sig('[data-cv="page"] [data-cv="empty"] [data-cv="steps"]');
      await openComps(page, vp);
      const opened = await openHow(page); await mutate(page, "V10");
      const pop = await sig('[data-cv="how-pop"] [data-cv="steps"]');
      L.check(`${w} both hosts draw the steps`, !!card && opened && !!pop, `card ${!!card} · pop-up ${!!pop}`);
      if (!card || !pop) continue;
      L.check(`${w} the same root: tag and class set`, card.tag === pop.tag && card.classes === pop.classes && card.classes.length > 0, `card <${card.tag} class="${card.classes}"> · pop-up <${pop.tag} class="${pop.classes}">`);
      L.check(`${w} the same shape inside`, card.shape === pop.shape, card.shape === pop.shape ? `${card.shape.length} characters of shape` : "the shapes differ");
      L.check(`${w} the same words`, card.h2 === "How comp tracking works." && card.h2 === pop.h2 && card.heads.join("|") === pop.heads.join("|") && card.heads.length === 3, `"${card.h2}" · ${card.heads.length} and ${pop.heads.length} step headings`);
      await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    }
    L.done(8);
  });

  /* ── the writing case: it re-seeds first ── */

  test("V5 · switch: saving the first comp shows the strip and library with no reload; removing it brings the empty page back", async ({ page }) => {
    const L = new Ledger("V5");
    for (const vp of SIZES) {
      const w = `${vp.width}`;
      seed("--empty");
      await emptyPage(page, vp);
      /* a mark on the window: a reload would take it away */
      await page.evaluate(() => { (window as any).__v5 = "same document"; });
      const state = () => page.evaluate(() => { const w2 = window as any; const on = (s: string) => w2.__qa(s).filter((e: HTMLElement) => e.getBoundingClientRect().height > 0).length; return { card: on('[data-cv="empty"]'), strip: on('[data-gst="comps"]'), rows: on('[data-cv="row"]'), head: on('[data-cv="lib-head"]'), mark: w2.__v5 ?? null, add: (w2.__q('[data-cv="add"]')?.textContent ?? "").trim() }; });
      const a = await state();
      L.check(`${w} it starts empty`, a.card === 1 && a.strip === 0 && a.rows === 0, `card ${a.card} · strip ${a.strip} · rows ${a.rows}`);
      await page.locator(`${P}[data-cv="add"]`).click();
      await page.waitForSelector('[data-hdr="comp"].is-in', { timeout: 10_000 }); await page.waitForTimeout(400);
      await page.locator(`${D}#cpv-f-title`).fill("Switch Test");
      await page.locator(`${D}[data-cf="save"]`).click();
      await page.waitForFunction(() => (window as any).__qa('[data-cv="row"]').length === 1, null, { timeout: 8_000 }).catch(() => {});
      await page.waitForTimeout(500);
      const b = await state();
      L.check(`${w} saving the first comp shows the strip and the library`, b.card === 0 && b.strip === 1 && b.head === 1 && b.rows === 1, `card ${b.card} · strip ${b.strip} · heading ${b.head} · rows ${b.rows}`);
      L.check(`${w} with no reload`, b.mark === "same document", `${b.mark}`);
      L.check(`${w} and the header's button is "+ Add a comp" again`, b.add === "+ Add a comp", `"${b.add}"`);
      await expect.poll(() => dump().comps.length >= 0, { timeout: 5_000 }).toBe(true);
      /* remove it, from its row's own Edit */
      if (b.rows === 1) {
        const row = page.locator(`${P}[data-cv="row"]`).first();
        await row.hover(); await row.locator('[data-cv="tray-edit"]').click();
        await page.waitForSelector('[data-hdr="comp"].is-in', { timeout: 10_000 }); await page.waitForTimeout(400);
        await page.locator(`${D}[data-cf="remove"]`).click();
        await page.waitForFunction(() => (window as any).__qa('[data-cv="empty"]').length === 1, null, { timeout: 8_000 }).catch(() => {});
        await page.waitForTimeout(500);
      }
      const c = await state();
      L.check(`${w} removing it brings the empty page back`, c.card === 1 && c.strip === 0 && c.rows === 0 && c.add === "+ Add your first comp", `card ${c.card} · strip ${c.strip} · rows ${c.rows} · "${c.add}"`);
      L.check(`${w} still with no reload`, c.mark === "same document", `${c.mark}`);
    }
    L.done(12);
  });
});

test("V27 · every lock has a named mutation", () => {
  expect([...Object.keys(MUTATIONS), ...SOURCE_MUTATIONS].sort()).toEqual(["V1", "V10", "V2", "V3", "V4", "V5", "V6", "V7", "V8", "V9"]);
});
