/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list header v2 (design-refs/contact-list-header-v2.html) — the CLH2 locks on the rendered page over the
 * emulator's harness account. Every reading is a bounding box, a computed style, a row count or `document.activeElement`.
 *
 *   CLH2-4  "{nq} not yet queried": nq read from the subheader (and proved non-zero), clicked, and the list then renders
 *           exactly nq rows
 *   CLH2-5  the populated header: one button in its action row; neither "need you" nor "Discover agents" inside it
 *   CLH2-6  List health: no image inside the ring; the percentage inside the ring's box; exactly one button beside it,
 *           "Fill the gaps" (the harness has gaps), and clicking it opens Housekeeping
 *   SHOTS   the header at 1512 × 982 and 1728 × 1117 (Phase 2), for the report beside the ref's frame 1
 *   CLH2-8  the slim row at the top of the page: not visible, its controls not focusable (inert, aria-hidden)
 *   CLH2-9  after 600px of scroll: visible, 48px high, its bottom at or above the pinned toolbar's top; the rail's top below it
 *   CLH2-10 back at the top: hidden again, and the toolbar where it was before, to the pixel
 *   CLH2-11 below 768px the row never renders
 *   SHOTS3  scrolled at 1512 × 982 in both subheader states, beside the ref's frame 2
 *
 * The unit halves are CLH2-1 (src/lib/contactPrinciples.test.ts) and CLH2-2/3 (contactHeader27.test.tsx).
 *
 * ⚠️ EVERY READ STARTS FROM THE VISIBLE COPY (every workspace page stays mounted) — `.aglist` is the Contact list's.
 * ⚠️ `CLH2_MUTATE=<lock>[,<lock>…]` applies each named break; a lock that stays green under its own break is unproved.
 */
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openApp } from "./pageHeaderV2Lib";

const DIR = "reports/contact-list-header-v2";
const MUTS = (process.env.CLH2_MUTATE ?? "").split(",").map((x) => x.trim()).filter(Boolean);
const VP = { width: 1512, height: 982 };

class Ledger {
  rows: { where: string; ok: boolean; detail: string }[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${MUTS.includes(this.name) ? "mut-" : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${this.name} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}

async function mut(page: Page, lock: string) {
  if (!MUTS.includes(lock)) return;
  switch (lock) {
    /* the click is swallowed (the filter never applies): the list keeps every row */
    case "CLH2-4": await page.evaluate(() => {
      document.addEventListener("click", (e) => {
        if (!(e.target as HTMLElement).closest("[data-clh2='notq']")) return;
        e.stopImmediatePropagation(); e.preventDefault();
      }, true);
    }); break;
    case "CLH2-6": await page.evaluate(() => {
      const hd = [...document.querySelectorAll<HTMLElement>(".aglist [data-cl27='header']")].find((e) => e.offsetHeight);
      const ring = hd?.querySelector<HTMLElement>("[data-cl26='ring']");
      const img = document.createElement("img"); img.src = "/images/contact-list-archivist.webp"; img.width = 100; ring?.appendChild(img);
      const hb = hd?.querySelector<HTMLElement>(".cl26-hb");
      const b = document.createElement("button"); b.type = "button"; b.textContent = "Open"; hb?.appendChild(b);
    }); break;
    case "CLH2-8": await page.addStyleTag({ content: ".clv-group.cl27 > .clh2-slim{opacity:1 !important;visibility:visible !important;transform:none !important}" });
      await page.evaluate(() => document.querySelectorAll(".clh2-slim").forEach((e) => { e.removeAttribute("inert"); e.removeAttribute("aria-hidden"); })); break;
    case "CLH2-9": await page.addStyleTag({ content: ".cl27 .cl26-pin{top:12px !important} .cl27 .qc153-rail{top:24px !important}" }); break;
    case "CLH2-10": await page.addStyleTag({ content: ".clv-group.cl27 > .clh2-slim{opacity:1 !important;visibility:visible !important;transform:none !important}" }); break;
    case "CLH2-11": await page.evaluate(() => {
      const g = [...document.querySelectorAll<HTMLElement>(".clv-group.cl27")].find((e) => e.offsetHeight) ?? document.body;
      const d = document.createElement("div"); d.className = "clh2-slim"; d.style.height = "48px"; g.prepend(d);
    }); break;
    case "CLH2-5": await page.evaluate(() => {
      const acts = [...document.querySelectorAll<HTMLElement>(".aglist [data-cl27='header'] .qc1531-acts")].find((e) => e.offsetHeight);
      const b = document.createElement("button"); b.type = "button"; b.textContent = "Discover agents"; acts?.appendChild(b);
    }); break;
  }
}

/** the Contact list, the page guide out of the way, no filters remembered */
async function openCl(page: Page, vp = VP, fig?: { n: number; q: number; y: number }) {
  await page.setViewportSize(vp);
  if (fig) await page.addInitScript((f) => { (window as unknown as { __SA_CLP_FIG?: unknown }).__SA_CLP_FIG = f; }, fig);
  await page.addInitScript(() => {
    try {
      for (const k of ["contacts", "queries", "manuscripts", "agents"]) localStorage.setItem(`sa.guide.${k}`, "1");
      for (const k of ["sa.contactList.v3", "sa.contactList.v4", "sa.contactList.v5", "sa.contactBook.sel"]) sessionStorage.removeItem(k);
      localStorage.setItem("qh.cl.view", JSON.stringify({ v: 1, group: "none", sort: "surname", reversed: false, pinned: false, view: "list", group26: "letter" }));
    } catch { /* private mode */ }
  });
  await openApp(page, "/agents", vp);
  await page.locator(".aglist [data-cl26='row']").first().waitFor({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  await page.mouse.move(3, 3);
}
const visibleRows = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".aglist [data-cl26='row']")].filter((e) => e.offsetHeight > 0).length);

/* ═════════ CLH2-4 · the subheader applies the not-queried filter, and the list shows exactly nq ═════════ */
test("CLH2-4 · '{nq} not yet queried' → the list renders exactly nq rows", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("CLH2-4");
  await openCl(page);
  await mut(page, "CLH2-4");
  const before = await visibleRows(page);
  const sub = await page.locator(".aglist [data-cl27='header'] [data-clh2='notq']:visible").first().textContent({ timeout: 10_000 }).catch(() => null);
  const m = /^(\d+) not yet queried$/.exec((sub ?? "").trim());
  const nq = m ? Number(m[1]) : NaN;
  L.check("the subheader reads '{nq} not yet queried'", !!m, String(sub));
  L.check("the population is non-zero (nq > 0, and fewer than every row)", nq > 0 && nq < before, `nq=${nq}, rows before=${before}`);
  await page.locator(".aglist [data-cl27='header'] [data-clh2='notq']:visible").first().click({ timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const after = await visibleRows(page);
  L.check("after the click the list renders exactly nq rows", after === nq, `rows=${after}, nq=${nq}`);
  const notq = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".aglist [data-cl26='row']")].filter((e) => e.offsetHeight > 0 && e.dataset.k !== "none").length);
  L.check("every row shown is not yet queried", notq === 0, `${notq} queried rows shown`);
  L.done(4);
});

/* ═════════ CLH2-5 · one action, no "need you", no Discover ═════════ */
test("CLH2-5 · the populated header: one button in its action row; no 'need you', no 'Discover agents'", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("CLH2-5");
  for (const vp of [VP, { width: 1280, height: 720 }]) {
    await openCl(page, vp);
    await mut(page, "CLH2-5");
    const r = await page.evaluate(() => {
      const hd = [...document.querySelectorAll<HTMLElement>(".aglist [data-cl27='header']")].find((e) => e.offsetHeight)!;
      const acts = hd.querySelector<HTMLElement>(".qc1531-acts")!;
      const bs = [...acts.querySelectorAll<HTMLElement>("button")].filter((b) => b.offsetWidth > 0);
      const main = hd.querySelector<HTMLElement>("[data-cl27='main']")!;
      return { n: bs.length, labels: bs.map((b) => b.textContent?.trim()), text: (main.innerText ?? "").replace(/\s+/g, " ") };
    });
    L.check(`${vp.width} one button, + Add an agent`, r.n === 1 && r.labels[0] === "+ Add an agent", JSON.stringify(r.labels));
    L.check(`${vp.width} no "need you"`, !/needs? you/i.test(r.text), r.text);
    L.check(`${vp.width} no "Discover agents"`, !/Discover agents/.test(r.text), r.text);
  }
  L.done(6);
});

/* ═════════ CLH2-6 · List health as the figure ═════════ */
test("CLH2-6 · List health: no image in the ring, the percentage inside it, one 'Fill the gaps' that opens Housekeeping", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("CLH2-6");
  for (const vp of [VP, { width: 1280, height: 720 }]) {
    await openCl(page, vp);
    await mut(page, "CLH2-6");
    const r = await page.evaluate(() => {
      const hd = [...document.querySelectorAll<HTMLElement>(".aglist [data-cl27='header']")].find((e) => e.offsetHeight)!;
      const ring = hd.querySelector<HTMLElement>("[data-cl26='ring']")!;
      const pct = ring.querySelector<HTMLElement>("[data-cl26='pct']");
      const rb = ring.getBoundingClientRect(), pb = pct?.getBoundingClientRect();
      const hw = hd.querySelector<HTMLElement>(".cl26-hw")!;
      const bs = [...hw.querySelectorAll<HTMLElement>("button")].filter((b) => b.offsetWidth > 0);
      return {
        imgs: ring.querySelectorAll("img").length, pct: pct?.textContent?.trim() ?? null, want: `${ring.dataset.pct}%`,
        inside: !!pb && pb.left >= rb.left && pb.right <= rb.right && pb.top >= rb.top && pb.bottom <= rb.bottom,
        size: pct ? getComputedStyle(pct).fontSize : null, ink: pct ? getComputedStyle(pct).color : null,
        missing: (hw.querySelector("[data-cl26='missing']")?.textContent ?? "").replace(/\s+/g, " ").trim(),
        labels: bs.map((b) => b.textContent?.trim()),
      };
    });
    L.check(`${vp.width} no image inside the ring`, r.imgs === 0, String(r.imgs));
    L.check(`${vp.width} the percentage inside the ring's box`, r.inside && r.pct === r.want, `${r.pct} inside=${r.inside}`);
    L.check(`${vp.width} the percentage 28px, ink`, r.size === "28px" && r.ink === "rgb(28, 19, 15)", `${r.size} ${r.ink}`);
    L.check(`${vp.width} the harness has gaps (population)`, /^\d+ details? missing$/.test(r.missing) && !r.missing.startsWith("0 "), r.missing);
    L.check(`${vp.width} exactly one button beside it, 'Fill the gaps'`, JSON.stringify(r.labels) === JSON.stringify(["Fill the gaps"]), JSON.stringify(r.labels));
  }
  await page.locator(".aglist [data-cl27='header'] [data-cl26='fill']:visible").first().click({ timeout: 10_000 }).catch(() => {});
  const opened = await page.locator(".hk82 [data-hk8='ring']").first().waitFor({ timeout: 15_000 }).then(() => true).catch(() => false);
  L.check("Fill the gaps opens Housekeeping", opened, "no drawer");
  L.done(11);
});

/* ═════════ SHOTS · the header beside the ref's frame 1 ═════════ */
test("SHOTS · the header at 1512 × 982 and 1728 × 1117", async ({ page }) => {
  test.setTimeout(180_000);
  mkdirSync(`${DIR}/shots`, { recursive: true });
  for (const vp of [VP, { width: 1728, height: 1117 }]) {
    await openCl(page, vp);
    const hd = page.locator(".aglist [data-cl27='header']:visible").first();
    const b = await hd.boundingBox();
    expect(b, "the header is on screen").not.toBeNull();
    await page.screenshot({ path: `${DIR}/shots/header-${vp.width}.png`, clip: { x: Math.max(0, b!.x - 24), y: Math.max(0, b!.y - 24), width: Math.min(vp.width - Math.max(0, b!.x - 24), b!.width + 48), height: b!.height + 48 } });
    await page.screenshot({ path: `${DIR}/shots/page-${vp.width}.png` });
  }
});

/* ═════════ the slim pinned row (Phase 3) ═════════ */
/** one read: the row, the pinned toolbar, the rail, all against the scroller's top */
const readSlim = (page: Page) => page.evaluate(() => {
  const vis = (sel: string) => [...document.querySelectorAll<HTMLElement>(sel)].find((e) => e.getBoundingClientRect().height > 0) ?? null;
  const sc = vis(".agl-wpg .wpg-scroll");
  const row = document.querySelector<HTMLElement>(".aglist .clh2-slim") ?? [...document.querySelectorAll<HTMLElement>(".clh2-slim")].find((e) => e.closest(".aglist")) ?? null;
  const pin = vis(".aglist .cl26-pin"), rail = vis(".aglist .qc153-rail");
  const t0 = sc?.getBoundingClientRect().top ?? 0;
  const rr = row?.getBoundingClientRect();
  const cs = row ? getComputedStyle(row) : null;
  const ctl = row ? [...row.querySelectorAll<HTMLElement>("button")] : [];
  const focusable = ctl.filter((b) => { b.focus(); const ok = document.activeElement === b; b.blur(); return ok; }).length;
  return {
    has: !!row, scrollTop: sc?.scrollTop ?? null,
    visible: !!cs && cs.visibility === "visible" && Number(cs.opacity) > 0.99,
    inert: !!row?.hasAttribute("inert"), hidden: row?.getAttribute("aria-hidden") === "true",
    h: rr?.height ?? null, rowTop: rr ? rr.top - t0 : null, rowBottom: rr ? rr.bottom - t0 : null,
    pinTop: pin ? pin.getBoundingClientRect().top - t0 : null, railTop: rail ? rail.getBoundingClientRect().top - t0 : null,
    controls: ctl.length, focusable,
    text: (row?.querySelector(".clh2-st")?.textContent ?? "").replace(/\s+/g, " ").trim(),
  };
});
const scrollTo = async (page: Page, y: number) => {
  await page.evaluate((top) => { const sc = [...document.querySelectorAll<HTMLElement>(".agl-wpg .wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0); sc?.scrollTo({ top, behavior: "instant" as ScrollBehavior }); }, y);
  await page.waitForTimeout(500);
};

test("CLH2-8/9/10 · the slim row: hidden and inert at the top; shown above the pinned toolbar and rail after 600px; gone again at the top", async ({ page }) => {
  test.setTimeout(240_000);
  const L8 = new Ledger("CLH2-8"), L9 = new Ledger("CLH2-9"), L10 = new Ledger("CLH2-10");
  for (const vp of [VP, { width: 1280, height: 720 }]) {
    await openCl(page, vp);
    for (const k of ["CLH2-8", "CLH2-9", "CLH2-10"]) await mut(page, k);
    const a = await readSlim(page);
    L8.check(`${vp.width} the row is in the page`, a.has && a.controls === 3, `has=${a.has}, ${a.controls} controls`);
    L8.check(`${vp.width} at the top: not visible`, !a.visible, `visible=${a.visible}`);
    L8.check(`${vp.width} at the top: inert and aria-hidden, no control focusable`, a.inert && a.hidden && a.focusable === 0, `inert=${a.inert} hidden=${a.hidden} focusable=${a.focusable}`);
    await scrollTo(page, 600);
    const b = await readSlim(page);
    L9.check(`${vp.width} scrolled 600 (population: the scroller moved)`, b.scrollTop !== null && b.scrollTop >= 590, String(b.scrollTop));
    L9.check(`${vp.width} visible, its controls focusable`, b.visible && !b.inert && b.focusable === 3, `visible=${b.visible} inert=${b.inert} focusable=${b.focusable}`);
    L9.check(`${vp.width} 48px high`, b.h !== null && Math.abs(b.h - 48) < 0.5, String(b.h));
    L9.check(`${vp.width} its bottom at or above the pinned toolbar's top`, b.rowBottom !== null && b.pinTop !== null && b.rowBottom <= b.pinTop + 0.5, `row ${b.rowBottom} toolbar ${b.pinTop}`);
    L9.check(`${vp.width} the filter rail's top below it`, b.rowBottom !== null && b.railTop !== null && b.railTop >= b.rowBottom - 0.5, `row ${b.rowBottom} rail ${b.railTop}`);
    await scrollTo(page, 0);
    const c = await readSlim(page);
    L10.check(`${vp.width} back at the top: hidden and inert`, !c.visible && c.inert && c.focusable === 0, `visible=${c.visible} inert=${c.inert} focusable=${c.focusable}`);
    L10.check(`${vp.width} the toolbar where it was, to the pixel`, a.pinTop !== null && c.pinTop !== null && Math.abs(c.pinTop - a.pinTop) < 0.5, `${a.pinTop} → ${c.pinTop}`);
  }
  /* every ledger is judged (and written) before any one of them throws */
  const errs: unknown[] = [];
  for (const [l, n] of [[L8, 6], [L9, 10], [L10, 4]] as const) { try { l.done(n); } catch (e) { errs.push(e); } }
  if (errs.length) throw errs[0];
});

test("CLH2-11 · below 768px the slim row never renders", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("CLH2-11");
  /* signed in on the desktop page (the population: the row is there at 1512), then the window narrowed under 768 */
  await openCl(page);
  const wide = await page.evaluate(() => document.querySelectorAll(".aglist .clh2-slim").length);
  L.check("1512: the row is in the page (population)", wide === 1, String(wide));
  for (const vp of [{ width: 767, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(vp);
    await page.waitForTimeout(800);
    await mut(page, "CLH2-11");
    const n0 = await page.evaluate(() => document.querySelectorAll(".clh2-slim").length);
    await page.evaluate(() => { for (const sc of document.querySelectorAll<HTMLElement>(".wpg-scroll")) sc.scrollTo({ top: 600 }); window.scrollTo({ top: 600 }); });
    await page.waitForTimeout(600);
    const n1 = await page.evaluate(() => document.querySelectorAll(".clh2-slim").length);
    L.check(`${vp.width} none at the top`, n0 === 0, String(n0));
    L.check(`${vp.width} none after scrolling`, n1 === 0, String(n1));
  }
  L.done(5);
});

test("SHOTS3 · scrolled at 1512 × 982, both subheader states", async ({ page }) => {
  test.setTimeout(180_000);
  mkdirSync(`${DIR}/shots`, { recursive: true });
  for (const [name, fig] of [["some-not-queried", undefined], ["all-queried", { n: 53, q: 53, y: 0 }]] as const) {
    await openCl(page, VP, fig);
    await scrollTo(page, 600);
    const r = await readSlim(page);
    expect(r.visible, "the row shows").toBe(true);
    await page.screenshot({ path: `${DIR}/shots/slim-${name}-1512.png`, clip: { x: 0, y: 0, width: VP.width, height: 420 } });
  }
});
