/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list principles v2 (design-refs/contact-list-principles-v2/contact-list-principles-v4.html, its `pp2` layer:
 * fit "by the name", List health "2 · Nudged in", the ring in brand colours) — the CLP15–22 locks, on the rendered page
 * over the emulator's harness account. Every reading is a computed style or a bounding box, never a declaration.
 *
 *   R0    recon (not a lock): the header's geometry and every ring's colours, written to the ledger
 *   CLP15 a row with fit 4: four navy stars and one empty after the name, 12.5px, labelled; and the row follows the card
 *   CLP16 a row with no fit renders no stars (and rated rows do)
 *   CLP17 a long name truncates; all five stars stay inside the row, unclipped
 *   CLP18 at 1440 and 1280 the List health block's right edge sits 32px (±2) inside the list frame's right edge
 *   CLP19 the ring's vertical centre within 2px of the headline block's
 *   CLP20 at least 24px between the headline's text and the ring at 1440, 1280 and 1100
 *   CLP21 the Contact list header's ring: arc #2a3a52, track #ecc0ae, the badge navy on white (the Housekeeping drawer's
 *         ring is out of scope — Nick, 12 Nov — it sits on the drawer's navy header)
 *   CLP22 nothing on the Contact list or in its open card computes to a green (hue 80–170°, saturation > 15%), the
 *         card's saved outline included
 *
 * ⚠️ EVERY READ STARTS FROM THE VISIBLE COPY (every workspace page stays mounted) — `.aglist` is the Contact list's.
 * ⚠️ `CLP_MUTATE=<lock>[,<lock>…]` applies each named break; a lock that stays green under its own break is unproved.
 * ⚠️ CLP15 WRITES (a star on the card) and restores in the same run through the snackbar's Undo, then by the star itself.
 */
import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { openApp } from "./pageHeaderV2Lib";

const DIR = "reports/contact-list-principles-v2";
const MUTS = (process.env.CLP_MUTATE ?? "").split(",").map((x) => x.trim()).filter(Boolean);
const BASE = process.env.CLP_BASE === "1";
const VP = { width: 1440, height: 900 };
const NAVY = "rgb(42, 58, 82)";
const EMPTY = "rgb(211, 201, 187)";
const PINK = "rgb(236, 192, 174)";

class Ledger {
  rows: { where: string; ok: boolean; detail: string }[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${BASE ? "base-" : ""}${MUTS.includes(this.name) ? "mut-" : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${this.name} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}
type EmuAgent = { id: string; name: string; starRating: number | null };
const agents = (): EmuAgent[] => JSON.parse(execFileSync("node", ["tests/e2e/aa1Emu.mjs", "agents"], { encoding: "utf8" }).trim());
const css = (page: Page, rule: string) => page.addStyleTag({ content: rule });

async function mut(page: Page, lock: string) {
  if (!MUTS.includes(lock)) return;
  switch (lock) {
    /* the stars in the old green, one fewer filled */
    case "CLP15": await css(page, ".cl27 [data-clp2='fit'] i.on{color:#4e7d60 !important}"); break;
    /* an unrated row draws five empty stars */
    case "CLP16": await page.evaluate(() => {
      for (const r of document.querySelectorAll<HTMLElement>(".aglist [data-cl26='row']")) {
        const nm = r.querySelector<HTMLElement>("[data-cl26='name']");
        if (nm && !r.querySelector("[data-clp2='fit']")) nm.insertAdjacentHTML("afterend", "<span data-clp2='fit'><i>★</i><i>★</i><i>★</i><i>★</i><i>★</i></span>");
      }
    }); break;
    /* the stars shrink before the name does */
    case "CLP17": await css(page, ".cl27 [data-clp2='fit']{flex:0 1 auto !important;min-width:0 !important;overflow:hidden !important}"); break;
    case "CLP18": await css(page, ".cl27 .cl27-hd .cl27-rc{transform:none !important}"); break;
    case "CLP19": await css(page, ".cl27 .cl26-health[data-ground='light'] .cl26-ring{margin-top:14px !important}"); break;
    case "CLP20": await css(page, ".cl27 .cl27-hd .cl27-rc{transform:translateX(-200px) !important}"); break;
    case "CLP21": await css(page, ".cl27 [data-cl26='arc']{stroke:#4e7d60 !important} .hk82 [data-hk8='ring-track']{stroke:#d6e4da !important}"); break;
    case "CLP22": await css(page, ".cl27 .cl26-ht{color:#4e7d60 !important}"); break;
  }
}

/** the Contact list, the page guide out of the way; `fig` is the dev aid `__SA_CLP_FIG` (the headline's numbers) */
async function openCl(page: Page, vp = VP, o: { fig?: { n: number; q: number; y: number } } = {}) {
  await page.setViewportSize(vp);
  await page.addInitScript((x) => {
    try {
      for (const k of ["contacts", "queries", "manuscripts", "agents"]) localStorage.setItem(`sa.guide.${k}`, "1");
      for (const k of ["sa.contactList.v3", "sa.contactList.v4", "sa.contactList.v5", "sa.contactBook.sel"]) sessionStorage.removeItem(k);
      localStorage.setItem("qh.cl.view", JSON.stringify({ v: 1, group: "none", sort: "surname", reversed: false, pinned: false, view: "list", group26: "letter" }));
    } catch { /* private mode */ }
    if (x.fig) (window as unknown as { __SA_CLP_FIG?: unknown }).__SA_CLP_FIG = x.fig;
  }, o);
  await openApp(page, "/agents", vp);
  await page.locator(".aglist [data-cl26='row']").first().waitFor({ timeout: 30_000 });
  await page.locator(".aglist [data-cl26='ring'][data-pct]:not([data-pct=''])").first().waitFor({ timeout: 30_000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  await page.mouse.move(3, 3);
}

/** one read of the header: boxes of the block, the ring, the headline block, the headline's text, the list frame */
const readHeader = (page: Page) => page.evaluate(() => {
  const vis = <T extends Element>(s: string) => [...document.querySelectorAll<T>(s)].find((e) => (e as unknown as HTMLElement).offsetHeight > 0) ?? null;
  const box = (e: Element | null) => { if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, cy: (r.top + r.bottom) / 2 }; };
  const hd = vis<HTMLElement>(".aglist [data-cl27='header']");
  const h1 = hd?.querySelector<HTMLElement>("[data-clp='headline']") ?? null;
  let inkR = -Infinity;
  if (h1) { const rg = document.createRange(); rg.selectNodeContents(h1); for (const r of rg.getClientRects()) if (r.width > 0) inkR = Math.max(inkR, r.right); }
  const ring = hd?.querySelector<HTMLElement>("[data-cl26='ring']") ?? null;
  const rc = hd?.querySelector<HTMLElement>("[data-cl27='health']") ?? null;
  return {
    block: box(hd?.querySelector("[data-cl26='health']") ?? null), ring: box(ring), main: box(hd?.querySelector("[data-cl27='main']") ?? null),
    h1: box(h1), inkR, frame: box(vis(".aglist [data-cl26='frame']")), text: (h1?.textContent ?? "").trim(),
    ringMt: ring ? getComputedStyle(ring).marginTop : null, rcTransform: rc ? getComputedStyle(rc).transform : null,
  };
});

/** a ring's colours: arc, track, and (header only) the badge */
const readRing = (page: Page, where: "header" | "drawer") => page.evaluate((w) => {
  const vis = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0) ?? null;
  if (w === "header") {
    const ring = vis(".aglist [data-cl27='header'] [data-cl26='ring']");
    const arc = ring?.querySelector("[data-cl26='arc']"), track = ring?.querySelector("[data-cl26='track']"), pct = ring?.querySelector<HTMLElement>("[data-cl26='pct']");
    const ps = pct ? getComputedStyle(pct) : null;
    return { pct: ring?.dataset.pct ?? null, arc: arc ? getComputedStyle(arc).stroke : null, track: track ? getComputedStyle(track).stroke : null,
      badge: ps ? { bg: ps.backgroundColor, fg: ps.color, sh: ps.boxShadow } : null };
  }
  const ring = vis(".hk82 [data-hk8='ring']");
  const arc = ring?.querySelector("[data-hk8='ring-arc']"), track = ring?.querySelector("[data-hk8='ring-track']");
  const head = ring?.closest<HTMLElement>(".hk82");
  return { pct: ring?.dataset.tone ?? null, arc: arc ? getComputedStyle(arc).stroke : null, track: track ? getComputedStyle(track).stroke : null,
    badge: null, ground: head ? getComputedStyle(head).backgroundColor : null };
}, where);

async function openDrawer(page: Page) {
  await page.locator(".aglist [data-cl27='header'] [data-cl26='fill']:visible").first().click(); /* header v2: Open → Fill the gaps */
  await page.locator(".hk82 [data-hk8='ring']").first().waitFor({ timeout: 15_000 });
  await page.waitForTimeout(900);
}

/** a row's stars: every glyph's colour, the box, the name's box and truncation */
const readStars = (page: Page, id: string) => page.evaluate((rid) => {
  const row = [...document.querySelectorAll<HTMLElement>(`.aglist [data-cl26='row'][data-id='${rid}']`)].find((e) => e.offsetHeight > 0);
  if (!row) return null;
  const nm = row.querySelector<HTMLElement>("[data-cl26='name']")!;
  const f = row.querySelector<HTMLElement>("[data-clp2='fit']");
  const bx = (e: Element) => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom }; };
  const fs = f ? getComputedStyle(f) : null;
  return {
    name: { ...bx(nm), sw: nm.scrollWidth, cw: nm.clientWidth, to: getComputedStyle(nm).textOverflow, text: nm.textContent },
    row: bx(row), cell: bx(row.querySelector("[data-cl26='agent']")!),
    fit: f ? {
      ...bx(f), sw: f.scrollWidth, cw: f.clientWidth, top: fs!.top, size: fs!.fontSize, ls: fs!.letterSpacing, title: f.title, label: f.getAttribute("aria-label"),
      glyphs: [...f.querySelectorAll<HTMLElement>("i")].map((i) => ({ c: getComputedStyle(i).color, t: i.textContent })),
      buttons: f.querySelectorAll("button").length,
    } : null,
  };
}, id);

/* ═════════ R0 · recon ═════════ */
test("R0 · recon: the header's geometry and the rings' colours", async ({ page }) => {
  test.setTimeout(240_000);
  const out: Record<string, unknown> = {};
  for (const vp of [VP, { width: 1280, height: 800 }, { width: 1100, height: 800 }]) {
    await openCl(page, vp);
    out[`header-${vp.width}`] = await readHeader(page);
  }
  await openCl(page);
  out.ringHeader = await readRing(page, "header");
  await openDrawer(page);
  out.ringDrawer = await readRing(page, "drawer");
  const as = agents();
  out.fits = as.reduce<Record<string, number>>((m, a) => { const k = String(a.starRating); m[k] = (m[k] ?? 0) + 1; return m; }, {});
  mkdirSync(DIR, { recursive: true });
  writeFileSync(`${DIR}/R0${BASE ? "-base" : ""}.json`, JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out, null, 1));
});

/* ═════════ CLP15 · fit 4 by the name, and live ═════════ */
test("CLP15 · a row with fit 4: four navy stars and one empty after the name; the row follows the card", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("CLP15");
  await openCl(page);
  await mut(page, "CLP15");
  const as = agents();
  const four = as.find((a) => a.starRating === 4);
  L.check("the harness has an agent rated 4", !!four, JSON.stringify(as.map((a) => a.starRating)));
  if (four) {
    await page.locator(`.aglist [data-cl26='row'][data-id='${four.id}']`).first().scrollIntoViewIfNeeded();
    const s = await readStars(page, four.id);
    const g = s?.fit?.glyphs ?? [];
    L.check("five glyphs", g.length === 5, JSON.stringify(g));
    L.check("four filled navy, then one empty #d3c9bb", g.length === 5 && g.slice(0, 4).every((x) => x.c === NAVY) && g[4].c === EMPTY, JSON.stringify(g.map((x) => x.c)));
    L.check("12.5px, letter-spacing 0.5px", s?.fit?.size === "12.5px" && s?.fit?.ls === "0.5px", `${s?.fit?.size} ${s?.fit?.ls}`);
    L.check("title and aria-label “Agent fit: Great fit”", s?.fit?.title === "Agent fit: Great fit" && s?.fit?.label === "Agent fit: Great fit", `${s?.fit?.title} / ${s?.fit?.label}`);
    L.check("not buttons", s?.fit?.buttons === 0, String(s?.fit?.buttons));
    const gap = s?.fit ? s.fit.l - s.name.r : NaN;
    L.check("10px after the name (±1)", Math.abs(gap - 10) <= 1, gap.toFixed(2));
    const nameMid = s ? (s.name.t + s.name.b) / 2 : NaN, fitMid = s?.fit ? (s.fit.t + s.fit.b) / 2 : NaN;
    /* the prompt's own terms: on the name's line (its baseline), nudged up 3px; the box centres then differ by the two
       fonts' line boxes (≈3.5px at 18px / 12.5px), so the middle is held to ±5 */
    L.check("on the name's line, nudged up 3px, on its middle (±5)", s?.fit ? s.fit.t < s.name.b && s.fit.b > s.name.t && s.fit.top === "-3px" && Math.abs(fitMid - nameMid) <= 5 : false, `name mid ${nameMid.toFixed(1)}, stars mid ${fitMid.toFixed(1)}, top ${s?.fit?.top}`);
  }
  /* live: open the card for a rated agent, press another star, the row follows; Undo, and it follows back */
  if (four) {
    await page.locator(`.aglist [data-cl26='row'][data-id='${four.id}']`).first().click();
    await page.locator("[data-cl262='fit'] [data-star]").first().waitFor({ timeout: 15_000 });
    await page.locator("[data-cl262='fit'] [data-star='2']").first().click();
    await page.waitForTimeout(1500);
    const mid = await readStars(page, four.id);
    L.check("after a 2 on the card the row draws two filled", (mid?.fit?.glyphs ?? []).filter((x) => x.c === NAVY).length === 2 && mid?.fit?.label === "Agent fit: Worth a try", JSON.stringify(mid?.fit?.glyphs.map((x) => x.c)));
    if (await page.locator(".sa-toast .sa-toast-undo").count()) await page.locator(".sa-toast .sa-toast-undo").first().click();
    await page.waitForTimeout(1500);
    let now = agents().find((a) => a.id === four.id)?.starRating ?? null;
    if (now !== 4) { await page.locator("[data-cl262='fit'] [data-star='4']").first().click(); await page.waitForTimeout(1500); now = agents().find((a) => a.id === four.id)?.starRating ?? null; }
    L.check("restored: rated 4 again (emulator)", now === 4, String(now));
    const back = await readStars(page, four.id);
    L.check("…and the row draws four again", (back?.fit?.glyphs ?? []).filter((x) => x.c === NAVY).length === 4, JSON.stringify(back?.fit?.glyphs.map((x) => x.c)));
  }
  L.done(10);
});

/* ═════════ CLP16 · no fit, no stars ═════════ */
test("CLP16 · a row with no fit renders no stars, and a rated row does", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("CLP16");
  await openCl(page);
  await mut(page, "CLP16");
  const as = agents();
  const r = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".aglist [data-cl26='row']")].filter((e) => e.offsetHeight > 0)
    .map((e) => ({ id: e.dataset.id!, stars: !!e.querySelector("[data-clp2='fit']"), text: (e.querySelector("[data-cl26='agent']")?.textContent ?? "") })));
  const rated = new Map(as.map((a) => [a.id, a.starRating]));
  const un = r.filter((x) => rated.get(x.id) == null), ra = r.filter((x) => rated.get(x.id) != null);
  L.check("the list has unrated rows", un.length > 0, String(un.length));
  L.check("no unrated row draws stars (no ★, no ☆, no “Not set”)", un.every((x) => !x.stars && !/[★☆]|not set/i.test(x.text)), un.filter((x) => x.stars || /[★☆]|not set/i.test(x.text)).map((x) => x.id).join(","));
  L.check("every rated row does", ra.length > 0 && ra.every((x) => x.stars), `${ra.filter((x) => x.stars).length}/${ra.length}`);
  L.done(3);
});

/* ═════════ CLP17 · a long name truncates first ═════════ */
test("CLP17 · a long name truncates and all five stars stay inside the row, unclipped", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("CLP17");
  for (const vp of [VP, { width: 1100, height: 800 }]) {
    await openCl(page, vp);
    await mut(page, "CLP17");
    const id = agents().find((a) => a.starRating != null)?.id;
    L.check(`${vp.width} a rated agent`, !!id, String(id));
    if (!id) continue;
    await page.locator(`.aglist [data-cl26='row'][data-id='${id}']`).first().scrollIntoViewIfNeeded();
    /* display only, never written: the name made long in the DOM */
    await page.evaluate((rid) => {
      const nm = [...document.querySelectorAll<HTMLElement>(`.aglist [data-cl26='row'][data-id='${rid}'] [data-cl26='name']`)].find((e) => e.offsetHeight > 0);
      if (nm) nm.textContent = "Alexandria Wolstenholme-Fitzwilliam-Montgomery-Bartholomew of the Very Long Agency Name";
    }, id);
    await page.waitForTimeout(200);
    const s = await readStars(page, id);
    L.check(`${vp.width} the name truncates with an ellipsis`, !!s && s.name.sw > s.name.cw + 1 && s.name.to === "ellipsis", s ? `${s.name.sw}/${s.name.cw} ${s.name.to}` : "no row");
    L.check(`${vp.width} the stars are drawn`, !!s?.fit && (s.fit.glyphs.length === 5), JSON.stringify(s?.fit?.glyphs.length));
    L.check(`${vp.width} the stars unclipped (scrollWidth ≤ clientWidth)`, !!s?.fit && s.fit.sw <= s.fit.cw + 0.5 && s.fit.r - s.fit.l >= 40, s?.fit ? `${s.fit.sw}/${s.fit.cw} w${(s.fit.r - s.fit.l).toFixed(1)}` : "none");
    L.check(`${vp.width} the stars inside the agent cell and the row`, !!s?.fit && s.fit.r <= s.cell.r + 0.5 && s.fit.r <= s.row.r && s.fit.l >= s.name.r - 0.5, s?.fit ? `stars ${s.fit.l.toFixed(1)}–${s.fit.r.toFixed(1)}, cell ≤${s.cell.r.toFixed(1)}, name ≤${s.name.r.toFixed(1)}` : "none");
  }
  L.done(10);
});

/* ═════════ CLP18 + CLP19 + CLP20 · List health nudged in ═════════ */
test("CLP18 · the List health block 32px inside the list frame's right edge at 1440 and 1280", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("CLP18");
  for (const vp of [VP, { width: 1280, height: 800 }]) {
    await openCl(page, vp);
    await mut(page, "CLP18");
    const h = await readHeader(page);
    const inset = h.frame && h.block ? h.frame.r - h.block.r : NaN;
    L.check(`${vp.width} block right edge 32px (±2) inside the frame`, Math.abs(inset - 32) <= 2, `frame ${h.frame?.r.toFixed(1)} − block ${h.block?.r.toFixed(1)} = ${inset.toFixed(2)}`);
  }
  L.done(2);
});

test("CLP19 · the ring's centre within 2px of the headline block's", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("CLP19");
  /* the side-by-side header only: under 1000px of page content (1100 here) the header stacks and the ring has its own row */
  for (const vp of [VP, { width: 1280, height: 800 }]) {
    await openCl(page, vp);
    await mut(page, "CLP19");
    const h = await readHeader(page);
    const d = h.ring && h.main ? h.ring.cy - h.main.cy : NaN;
    L.check(`${vp.width} ring centre − headline block centre within 2px`, Math.abs(d) <= 2, `ring ${h.ring?.cy.toFixed(1)} main ${h.main?.cy.toFixed(1)} Δ ${d.toFixed(2)}`);
  }
  L.done(2);
});

test("CLP20 · at least 24px between the headline and the ring at 1440, 1280 and 1100", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("CLP20");
  /* the harness's own headline, and a long one through the dev aid (its words fill the column) */
  for (const fig of [undefined, { n: 148, q: 117, y: 23 }]) {
    for (const vp of [VP, { width: 1280, height: 800 }, { width: 1100, height: 800 }]) {
      await openCl(page, vp, { fig });
      await mut(page, "CLP20");
      const h = await readHeader(page);
      const gap = h.ring ? h.ring.l - h.inkR : NaN;
      /* stacked (the ring on its own row, under the headline block) is clear of it by construction */
      const ownRow = !!h.ring && !!h.main && h.ring.t >= h.main.b - 0.5;
      L.check(`${vp.width}${fig ? " long" : ""} headline text → ring ≥ 24px${ownRow ? " (stacked)" : ""}`, ownRow || gap >= 24 - 0.5, `“${h.text}” ink ${h.inkR.toFixed(1)} ring ${h.ring?.l.toFixed(1)} gap ${gap.toFixed(2)}`);
    }
  }
  L.done(6);
});

/* ═════════ CLP21 + CLP22 · the ring in brand colours, no green ═════════ */
test("CLP21 · the header ring: arc navy, track soft pink; the score ink in its centre (header v2)", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("CLP21");
  await openCl(page);
  await mut(page, "CLP21");
  const h = await readRing(page, "header");
  L.check("header ring arc #2a3a52", h.arc === NAVY, String(h.arc));
  L.check("header ring track #ecc0ae", h.track === PINK, String(h.track));
  /* re-pointed by Contact list header v2: no badge — the score sits in the ring's centre, ink on no ground */
  L.check("the score: ink, no badge behind it", !!h.badge && h.badge.bg === "rgba(0, 0, 0, 0)" && h.badge.fg === "rgb(28, 19, 15)" && h.badge.sh === "none", JSON.stringify(h.badge));
  /* that it no longer follows the score (every pct, 0–100) is locked in src/lib/contactPrinciples2.test.ts */
  /* ⚠️ the Housekeeping drawer's ring is out of scope (Nick, 12 Nov: it sits on the drawer's navy header, where a navy arc
     would vanish) — R0 records its colours */
  L.done(3);
});

test("CLP22 · nothing on the Contact list computes to a green, nor the card's saved outline", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("CLP22");
  const sweep = (root: string) => page.evaluate((sel) => {
    const hsl = (s: string): { h: number; s: number; a: number }[] => {
      const out: { h: number; s: number; a: number }[] = [];
      for (const m of s.matchAll(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/g)) {
        const r = +m[1] / 255, g = +m[2] / 255, b = +m[3] / 255, a = m[4] === undefined ? 1 : +m[4];
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, dd = mx - mn;
        if (dd === 0) { out.push({ h: 0, s: 0, a }); continue; }
        const sat = dd / (1 - Math.abs(2 * l - 1));
        let h = mx === r ? ((g - b) / dd) % 6 : mx === g ? (b - r) / dd + 2 : (r - g) / dd + 4;
        h *= 60; if (h < 0) h += 360;
        out.push({ h, s: sat * 100, a });
      }
      return out;
    };
    const roots = [...document.querySelectorAll<HTMLElement>(sel)].filter((e) => e.getBoundingClientRect().height > 0);
    const hits: string[] = [];
    let n = 0;
    for (const root of roots) for (const e of [root, ...root.querySelectorAll<HTMLElement>("*")]) {
      const r = e.getBoundingClientRect(); if (r.width < 0.5 || r.height < 0.5) continue;
      const s = getComputedStyle(e); if (s.visibility === "hidden" || s.display === "none") continue;
      n++;
      for (const [k, v] of [["color", s.color], ["background", s.backgroundColor], ["border", s.borderTopColor + " " + s.borderBottomColor], ["shadow", s.boxShadow], ["stroke", s.stroke], ["fill", s.fill], ["outline", s.outlineStyle !== "none" ? s.outlineColor : ""], ["bgimg", s.backgroundImage]] as const) {
        if (!v) continue;
        if (k === "border" && s.borderTopWidth === "0px" && s.borderBottomWidth === "0px") continue;
        if (hsl(v).some((c) => c.a > 0.02 && c.h >= 80 && c.h <= 170 && c.s > 15)) hits.push(`${e.tagName.toLowerCase()}.${[...e.classList].join(".")} ${k}=${v}`);
      }
    }
    return { n, hits: [...new Set(hits)] };
  }, root);
  await openCl(page);
  await mut(page, "CLP22");
  const a = await sweep(".aglist");
  L.check(`the Contact list (${a.n} elements) has no green`, a.n > 50 && a.hits.length === 0, a.hits.slice(0, 12).join(" | "));
  /* the card's saved outline (a moment after a save) — held on by the class the save sets, read, then let go */
  await page.locator(".aglist [data-cl26='row']:visible").first().click();
  await page.locator(".cl262-panel .cl262-card.apc").first().waitFor({ timeout: 15_000 });
  await page.waitForTimeout(600);
  const saved = await page.evaluate(() => {
    const c = [...document.querySelectorAll<HTMLElement>(".cl262-panel .cl262-card.apc")].find((e) => e.offsetHeight > 0);
    if (!c) return null;
    c.classList.add("is-saved");
    const f = c.querySelector<HTMLElement>(":scope > .apc-frame");
    const sh = f ? getComputedStyle(f).boxShadow : "";
    c.classList.remove("is-saved");
    return sh;
  });
  L.check("the card's saved outline is navy, not green", !!saved && /rgb\(42, 58, 82\)/.test(saved) && !/rgb\(78, 125, 96\)/.test(saved), String(saved));
  const b = await sweep(".cl262-panel");
  L.check(`the open card (${b.n} elements) has no green`, b.n > 10 && b.hits.length === 0, b.hits.slice(0, 12).join(" | "));
  /* ⚠️ the Housekeeping drawer is out of scope (Nick, 12 Nov): it keeps its green ring and its green "+n" points */
  L.done(3);
});
