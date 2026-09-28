/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * pageHeaderV2Lib — the probes, the mock reader and the judges for pageHeaderV2.measure.ts (a plain
 * module, so importing it runs no cases). What they measure: the app-wide bar (sidebar colour, page name, the manuscript switcher, ghost tools),
 * the full header across the column with a centred 920 hero frame, and the Contact list's header.
 * Measured on the signed-in app against design-refs/page-header/contact-list-header-v5.html.
 *
 * ⚠️ EVERY CHECK IS A LEDGER ROW, AND A CASE ASSERTS ONLY AT ITS END — so a first failing claim does
 * not leave the ones below it unproved, and "red before" is a per-lock statement. Each case asserts a
 * population floor too: a probe that finds no subject has failed, not skipped.
 *
 * ⚠️ VERTICAL NUMBERS ARE RELATIVE TO THE BAR. The mock's 10px dark strip stands for dev's beta
 * strip and is not part of this design.
 *
 * ⚠️ READS ONLY on the fixture: the one flow that could write (choosing a book) writes localStorage,
 * never Firestore, and the case puts the original book back.
 */
import { expect, test, type Page } from "@playwright/test";
import { resolve } from "node:path";
import { openRoute } from "./measure";
import { Ledger } from "./shellV3Lib";

export const SIZES = [
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
] as const;

/** Every workspace route the shell renders (routeTiers' WORKSPACE_PATHS). */
export const BAR_ROUTES = [
  "/dashboard", "/queries", "/queries/analytics", "/agents", "/agents/discover",
  "/manuscripts", "/manuscripts/comps", "/manuscripts/packages",
  "/todo", "/todo/calendar", "/todo/noteboard", "/import", "/account/profile", "/plans", "/help",
] as const;

export async function openApp(page: Page, path: string, vp: { width: number; height: number }) {
  await openRoute(page, path, vp);
  await expect(page.locator(".os-skelpage")).toHaveCount(0, { timeout: 15_000 }).catch(() => {});
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForTimeout(500);
}

/** One read of the bar, from measured boxes and computed styles. A real function, never a template. */
export async function readBar(page: Page) {
  return page.evaluate(() => {
    const shown = (e: Element | null) => {
      if (!e) return false;
      const r = e.getBoundingClientRect(); const s = getComputedStyle(e);
      return r.width > 0.5 && r.height > 0.5 && s.visibility !== "hidden" && s.display !== "none" && parseFloat(s.opacity) > 0.02;
    };
    const bar = [...document.querySelectorAll('[data-probe="navrow"]')].find(shown) as HTMLElement | undefined;
    const main = [...document.querySelectorAll(".ws-main")].find(shown) as HTMLElement | undefined;
    const side = document.getElementById("ws-sidebar");
    if (!bar || !main || !side) return null;
    const b = bar.getBoundingClientRect(); const m = main.getBoundingClientRect();
    const bs = getComputedStyle(bar); const ss = getComputedStyle(side);
    const box = (e: Element | null) => { if (!e || !shown(e)) return null; const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height }; };
    const toggle = box(bar.querySelector('[aria-controls="ws-sidebar"]'));
    const help = box(bar.querySelector('[aria-label="Help"]'));
    const name = bar.querySelector('[data-shell="pagename"]');
    const nameText = name?.querySelector(".ws-pname-n") ?? null;
    const nameLines = (() => {
      if (!nameText) return 0;
      const range = document.createRange(); range.selectNodeContents(nameText);
      const tops = new Set([...range.getClientRects()].map((r) => Math.round(r.top)));
      return tops.size;
    })();
    /* the bar's items: its toggle, divider, page name, switcher button and each tool */
    const items = [
      ...[...bar.querySelectorAll('[aria-controls="ws-sidebar"], .ws-bvr, [data-shell="pagename"], [data-shell="switcher"] > button, .ws-bright > *, .ws-bright button')],
    ].filter(shown).map((e) => ({ k: (e.className || e.tagName).toString().split(" ")[0], ...box(e)! }));
    const overlaps: string[] = [];
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
      const a = items[i], c = items[j];
      /* a child inside its own wrapper is not an overlap */
      const nested = (a.l <= c.l + 0.5 && a.r >= c.r - 0.5 && a.t <= c.t + 0.5 && a.b >= c.b - 0.5) || (c.l <= a.l + 0.5 && c.r >= a.r - 0.5 && c.t <= a.t + 0.5 && c.b >= a.b - 0.5);
      if (nested) continue;
      if (a.l < c.r - 0.5 && c.l < a.r - 0.5 && a.t < c.b - 0.5 && c.t < a.b - 0.5) overlaps.push(`${a.k}×${c.k}`);
    }
    const sideRule = /inset/.test(ss.boxShadow) && /-1px 0px 0px/.test(ss.boxShadow) || parseFloat(ss.borderRightWidth) === 1;
    const switchers = [...document.querySelectorAll('[data-shell="switcher"], .sv2-scope, .ws-mspill')].filter(shown);
    return {
      barL: b.left, barR: b.right, barT: b.top, barH: b.height, mainL: m.left, winR: window.innerWidth,
      barBg: bs.backgroundColor, sideBg: ss.backgroundColor, groundBg: getComputedStyle(main).backgroundColor,
      nameHidden: !!name && parseFloat(getComputedStyle(name).opacity) === 0 && name.getAttribute("aria-hidden") === "true",
      radii: [bs.borderTopLeftRadius, bs.borderTopRightRadius, bs.borderBottomLeftRadius, bs.borderBottomRightRadius],
      sideRule, sideShadow: ss.boxShadow,
      toggleL: toggle ? toggle.l - b.left : null, helpR: help ? b.right - help.r : null,
      nameShown: shown(name), nameLines, nameText: nameText?.textContent ?? null,
      eyebrow: name?.querySelector(".ws-pname-s")?.textContent ?? null,
      switchers: switchers.length,
      inSidebar: [...side.querySelectorAll('[data-shell="switcher"], .ws-mspill, .ws-phead')].filter(shown).length,
      overlaps, items: items.length,
    };
  });
}

/** Scroll whatever the page scrolls by up to `by`, and read the bar's top before and after. */
export async function scrollAndRead(page: Page, by: number) {
  return page.evaluate((amount) => {
    const bar = [...document.querySelectorAll('[data-probe="navrow"]')].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
    const before = bar.getBoundingClientRect().top;
    const cands = [...document.querySelectorAll(".ws-wbody, .ws-wbody *")]
      .filter((e) => { const s = getComputedStyle(e); return /(auto|scroll)/.test(s.overflowY) && e.scrollHeight - e.clientHeight > 40 && e.getBoundingClientRect().height > 100; }) as HTMLElement[];
    cands.sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight));
    const sc = cands[0];
    if (!sc) return { before, after: before, scrolled: 0 };
    sc.scrollTop = amount;
    const scrolled = sc.scrollTop;
    const after = bar.getBoundingClientRect().top;
    sc.scrollTop = 0;
    return { before, after, scrolled };
  }, by);
}

/* ── §4.5 · the switcher: choosing a book changes it everywhere, outside press and Escape close, and
   "+ Add a manuscript" opens the add flow. Reads only — the choice is localStorage, put back after.

   ⚠️ "THE PAGE FOLLOWS" IS ASSERTED AS: after a switch, the page shows exactly what a FRESH LOAD with
   that book shows. Asserting that the page names the book fails on a correct page — the fixture's
   second book has no comps, so Comparable titles shows its empty state and names nothing — and a page
   that did not follow the switch passes that claim whenever the two books share a word. */
export async function visiblePageText(page: Page) {
  return page.evaluate(() => {
    const w = [...document.querySelectorAll(".ws-wbody > *")].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement | undefined;
    return (w?.innerText ?? "").replace(/\s+/g, " ").slice(0, 600);
  });
}
export const KEY = "scriptally_active_manuscript_id";

export async function switchAndCompare(page: Page, L: Ledger, route: string) {
  const ctx = { route, size: "1440", state: "switcher" };
  await openApp(page, route, { width: 1440, height: 900 });
  const original = await page.evaluate((k) => localStorage.getItem(k), KEY);
  const before = await visiblePageText(page);
  const btn = page.locator('[data-shell="switcher"] > button').first();
  await btn.click();
  const target = page.locator(".ws-ms-it").filter({ hasNot: page.locator(".ws-ms-ck") }).first();
  const targetTitle = ((await target.locator(".ws-ms-t").textContent()) ?? "").trim();
  await target.click();
  await page.waitForTimeout(1200);
  const after = await visiblePageText(page);
  const stored = await page.evaluate((k) => localStorage.getItem(k), KEY);
  const barTitle = ((await page.locator('[data-shell="switcher"] .ws-ms-btn .ws-ms-t').textContent()) ?? "").trim();
  await page.reload();
  await expect(page.locator(".os-skelpage")).toHaveCount(0, { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(2500);
  const fresh = await visiblePageText(page);
  L.check("§4.5 · choosing a book writes the shared key", ctx, !!stored && stored !== original, `${original} → ${stored}`);
  L.check("§4.5 · …the switcher shows the new book", ctx, barTitle === targetTitle, `${barTitle} / ${targetTitle}`);
  L.check("§4.5 · …and the page shows what a fresh load of that book shows", ctx, after === fresh && after !== before,
    `changed ${after !== before} · equals fresh ${after === fresh}`);
  await page.evaluate(([k, v]) => { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); }, [KEY, original] as const);
  return { btn };
}

/* ══ §2 · the full header across the column, with a centred 920 hero frame ══ */
export const MOCK = "file://" + resolve("design-refs/page-header/contact-list-header-v5.html");

/** The drawn box of an `object-fit: contain; object-position: right bottom` image inside its box. */
export const DRAWN = `(img) => {
  const b = img.getBoundingClientRect();
  const ar = (img.naturalWidth || 1) / (img.naturalHeight || 1);
  let w = b.width, h = b.width / ar;
  if (h > b.height) { h = b.height; w = b.height * ar; }
  return { l: b.right - w, r: b.right, t: b.bottom - h, b: b.bottom, w, h };
}`;

/** One read of a full header, its frame, its text and its drawn art, plus the side panel. */
export async function readFull(page: Page, sidePanelSel: string) {
  return page.evaluate(([panelSel, drawnSrc]) => {
    const drawn = new Function("return " + drawnSrc)() as (i: HTMLImageElement) => { l: number; r: number; t: number; b: number; w: number; h: number };
    const vis = (s: string) => [...document.querySelectorAll(s)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement | undefined;
    const hd = vis('[data-probe="page-header"][data-size="full"]');
    const bar = vis('[data-probe="navrow"]');
    if (!hd || !bar) return null;
    /* the content column: the nearest ancestor carrying v1's 1360 cap, measured at its CONTENT box */
    let col: HTMLElement | null = hd.parentElement;
    while (col && getComputedStyle(col).maxWidth !== "1360px") col = col.parentElement;
    const cr = col?.getBoundingClientRect(); const cs = col ? getComputedStyle(col) : null;
    const colL = cr && cs ? cr.left + parseFloat(cs.paddingLeft) : NaN;
    const colR = cr && cs ? cr.right - parseFloat(cs.paddingRight) : NaN;
    const h = hd.getBoundingClientRect(); const b = bar.getBoundingClientRect();
    const frame = hd.querySelector('[data-probe="hero-frame"]')?.getBoundingClientRect() ?? null;
    const text = hd.querySelector(".ph-text") as HTMLElement | null;
    /* the text block's widest LINE, not its box — a box is its max-width whatever the words are.
       ⚠️ TEXT NODES ONLY: a range over an element also returns every block element's own box, which
       is the full 55% whatever the words are — the fault the first version of this probe had. The
       actions are buttons, so their boxes are what counts for them. */
    const lines = text ? (() => {
      const out: DOMRect[] = [];
      const tw = document.createTreeWalker(text, NodeFilter.SHOW_TEXT);
      for (let n = tw.nextNode(); n; n = tw.nextNode()) {
        if (!(n.textContent ?? "").trim()) continue;
        const r = document.createRange(); r.selectNodeContents(n); out.push(...r.getClientRects());
      }
      text.querySelectorAll("button").forEach((b) => out.push(b.getBoundingClientRect()));
      return out;
    })() : [];
    const textR = lines.length ? Math.max(...lines.map((l) => l.right)) : NaN;
    const tb = text?.getBoundingClientRect() ?? null;
    const img = hd.querySelector('[data-probe="art"] img') as HTMLImageElement | null;
    const art = img ? drawn(img) : null;
    const eyebrow = hd.querySelector('[data-probe="eyebrow"]')?.getBoundingClientRect() ?? null;
    const title = hd.querySelector('[data-probe="title"]') as HTMLElement | null;
    const tr = title?.getBoundingClientRect() ?? null;
    const panel = panelSel ? vis(panelSel) : undefined;
    const pr = panel?.getBoundingClientRect() ?? null;
    return {
      colL, colR, colW: colR - colL,
      hdL: h.left, hdR: h.right, hdT: h.top - b.bottom, hdH: h.height, rule: h.bottom - 1, barB: b.bottom,
      frame: frame && { l: frame.left, r: frame.right, w: frame.width },
      textW: tb?.width ?? NaN, textR,
      art, eyebrowT: eyebrow ? eyebrow.top - h.top : NaN, titleT: tr && eyebrow ? tr.top - eyebrow.top : NaN,
      titleFam: title ? getComputedStyle(title).fontFamily : null, titleSize: title ? getComputedStyle(title).fontSize : null,
      panel: pr && { t: pr.top, l: pr.left, r: pr.right, b: pr.bottom, w: pr.width },
      hdBox: { l: h.left, r: h.right, t: h.top, b: h.bottom },
    };
  }, [sidePanelSel, DRAWN] as const);
}

/** The mock's header at the same width, by the same ruler (its own fonts loaded from Google Fonts). */
export async function readMockHeader(page: Page, vp: { width: number; height: number }) {
  await page.setViewportSize(vp);
  await page.goto(MOCK);
  await page.evaluate(async () => { await document.fonts.ready; await new Promise((r) => setTimeout(r, 300)); });
  return page.evaluate((drawnSrc) => {
    const drawn = new Function("return " + drawnSrc)() as (i: HTMLImageElement) => { l: number; r: number; t: number; b: number; w: number; h: number };
    const hd = document.querySelector(".hd")!.getBoundingClientRect();
    const bar = document.querySelector(".bar")!.getBoundingClientRect();
    const hin = document.querySelector(".hin")!.getBoundingClientRect();
    const img = document.querySelector(".art img") as HTMLImageElement;
    const eb = document.querySelector(".eyebrow")!.getBoundingClientRect();
    const t = document.querySelector("h1")!.getBoundingClientRect();
    const rail = document.querySelector(".rail")!.getBoundingClientRect();
    const counts = document.querySelector(".counts")!.getBoundingClientRect();
    return {
      hdT: hd.top - bar.bottom, hdH: hd.height, frame: { l: hin.left, r: hin.right, w: hin.width }, art: drawn(img),
      eyebrowT: eb.top - hd.top, titleT: t.top - eb.top, rule: hd.bottom - 1,
      railT: rail.top - (hd.bottom - 1), rail: { l: rail.left, r: rail.right, w: rail.width }, countsT: counts.top - (hd.bottom - 1),
      fonts: ["Special Elite", "Source Serif 4", "JetBrains Mono"].every((f) => [...document.fonts].some((x) => x.family.replace(/["']/g, "") === f && x.status === "loaded")),
    };
  }, DRAWN);
}

/**
 * ⚠️ `withArt: false` (comps v2) is for a WITHOUT_ART page: the four drawn-art rows become one row
 * asserting there is no art slot at all. Additive — every existing caller passes nothing and is
 * judged exactly as before.
 */
export function judgeFull(L: Ledger, r: NonNullable<Awaited<ReturnType<typeof readFull>>>, ctx: { route: string; size: string; state: string }, mock?: Awaited<ReturnType<typeof readMockHeader>>, opts: { withArt?: boolean } = {}) {
  const withArt = opts.withArt ?? true;
  const n = (a: number, b: number, t: number) => Number.isFinite(a) && Math.abs(a - b) <= t;
  L.check("§4.2 · the header spans the column", ctx, n(r.hdL, r.colL, 1) && n(r.hdR, r.colR, 1), `hd ${r.hdL.toFixed(1)}→${r.hdR.toFixed(1)} col ${r.colL.toFixed(1)}→${r.colR.toFixed(1)}`);
  L.check("§4.2 · its top is the bar's bottom + 18", ctx, n(r.hdT, 18, 1), `${r.hdT.toFixed(1)}`);
  if (r.panel) {
    L.check("§4.2 · the side panel starts at the rule + 24", ctx, r.panel.t >= r.rule + 24 - 1 && n(r.panel.t, r.rule + 24, 1), `panel ${r.panel.t.toFixed(1)} rule ${r.rule.toFixed(1)}`);
    const ov = r.panel.l < r.hdBox.r && r.hdBox.l < r.panel.r && r.panel.t < r.hdBox.b && r.hdBox.t < r.panel.b;
    L.check("§4.2 · the side panel does not overlap the header", ctx, !ov, JSON.stringify(r.panel));
  } else {
    L.check("§4.2 · the side panel was found", ctx, false, "no panel");
  }
  const fw = Math.min(920, r.colW);
  L.check("§4.3 · the frame is min(920, column) wide", ctx, !!r.frame && n(r.frame.w, fw, 1), `frame ${r.frame?.w.toFixed(1)} want ${fw.toFixed(1)}`);
  L.check("§4.3 · …and centred in the column", ctx, !!r.frame && n((r.frame.l + r.frame.r) / 2, (r.colL + r.colR) / 2, 1), `frame ${r.frame?.l.toFixed(1)}→${r.frame?.r.toFixed(1)}`);
  L.check("§4.3 · the text block is ≤ 55% of the frame", ctx, !!r.frame && r.textW <= r.frame.w * 0.55 + 0.5, `text ${r.textW.toFixed(1)} of ${r.frame?.w.toFixed(1)}`);
  if (withArt) {
    L.check("§4.3 · the drawn art's right is the frame's right", ctx, !!r.art && !!r.frame && n(r.art.r, r.frame.r, 1), `art ${r.art?.r.toFixed(1)} frame ${r.frame?.r.toFixed(1)}`);
    L.check("§4.3 · the drawn art's bottom is the rule", ctx, !!r.art && n(r.art.b, r.rule, 1), `art ${r.art?.b.toFixed(1)} rule ${r.rule.toFixed(1)}`);
    L.check("§4.3 · the drawn art clears the text", ctx, !!r.art && r.art.l >= r.textR, `art ${r.art?.l.toFixed(1)} text ${r.textR.toFixed(1)} gap ${r.art ? (r.art.l - r.textR).toFixed(1) : "?"}`);
    L.check("§4.3 · the drawn art clears the bar", ctx, !!r.art && r.art.t >= r.barB - 0.5, `art top ${r.art?.t.toFixed(1)} bar ${r.barB.toFixed(1)}`);
  } else {
    L.check("§4.3 · no art slot on a WITHOUT_ART page", ctx, !r.art, JSON.stringify(r.art));
  }
  L.check("§2 · eyebrow at header + 26, title at eyebrow + 24", ctx, n(r.eyebrowT, 26, 1) && n(r.titleT, 24, 1), `${r.eyebrowT.toFixed(1)} / ${r.titleT.toFixed(1)}`);
  L.check("§2 · the title is Special Elite", ctx, /^"?Special Elite"?/.test(r.titleFam ?? ""), `${r.titleFam}`);
  L.check("§2 · …at 56px (50 at 1360 and below)", ctx, r.titleSize === (Number(ctx.size) <= 1360 ? "50px" : "56px"), `${r.titleSize}`);
  /* ⚠️ BOTH HEADERS ARE HELD TO THE RENDERED MOCK (271.7 / 265.7 at 1440 / 1280). The brief's
     267 / 261 were the same header with v1's eyebrow gap (title at eyebrow + 22); the v5 ref draws
     eyebrow + 24, and the first version of this lock blamed the difference on the intro's Special
     Elite run — measured, the intro's line boxes are identical to the mock's (54.73 both). The
     height is still content: a third intro line would fail this, which is the point. */
  if (mock) {
    L.check("§4.3 · the header's height is the mock's ±2", ctx, n(r.hdH, mock.hdH, 2), `app ${r.hdH.toFixed(1)} mock ${mock.hdH.toFixed(1)}`);
    L.check("§4.3 · the frame sits where the mock's does ±1", ctx, !!r.frame && n(r.frame.l, mock.frame.l, 1) && n(r.frame.r, mock.frame.r, 1), `app ${r.frame?.l.toFixed(1)}→${r.frame?.r.toFixed(1)} mock ${mock.frame.l.toFixed(1)}→${mock.frame.r.toFixed(1)}`);
  }
}


/* ══ §4 · the Contact list ══ */

/** The header's three tops, absolute, for the §4.4 comparison between pages. */
export async function readTops(page: Page) {
  return page.evaluate(() => {
    const vis = (s: string) => [...document.querySelectorAll(s)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement | undefined;
    const hd = vis('[data-probe="page-header"][data-size="full"]');
    const t = (e?: Element | null) => (e ? e.getBoundingClientRect().top : NaN);
    return { header: t(hd), eyebrow: t(hd?.querySelector('[data-probe="eyebrow"]')), title: t(hd?.querySelector('[data-probe="title"]')),
      eyebrowText: hd?.querySelector('[data-probe="eyebrow"]')?.textContent ?? null };
  });
}

/** The quick-add card, the actions row and the count cards, in one read. */
export async function readQuick(page: Page) {
  return page.evaluate(() => {
    const vis = (s: string) => [...document.querySelectorAll(s)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement | undefined;
    const box = (e?: Element | null) => { if (!e) return null; const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height }; };
    const qa = vis('[data-clv="quickadd"]');
    const hd = qa?.querySelector(".clv-qa-hd") as HTMLElement | null;
    const acts = vis('[data-probe="page-header"] [data-probe="actions"]');
    /* what the browser paints across the card — a 5×5 grid of points inside it, each of which must
       hit the card. ⚠️ ONE POINT WAS NOT ENOUGH: the centre falls below the count cards, so a card
       painted UNDER them still answered "on top" there (caught by the z-index mutation). */
    const qb = qa?.getBoundingClientRect();
    let onTopAll = !!qb && qb.bottom <= innerHeight;
    if (qa && qb && onTopAll) for (let i = 1; i <= 5; i++) for (let j = 1; j <= 5; j++) {
      const hit = document.elementFromPoint(qb.left + (qb.width * i) / 6, qb.top + (qb.height * j) / 6);
      if (!hit || !qa.contains(hit)) onTopAll = false;
    }
    return { qa: box(qa), acts: box(acts), tiles: box(vis('[data-clv="tiles"]')), head: hd ? { bg: getComputedStyle(hd).backgroundColor, text: hd.textContent } : null,
      onTop: onTopAll, addCard: !!vis('[data-clv="addcard"]'),
      focused: (document.activeElement as HTMLElement | null)?.getAttribute("data-clv") ?? null };
  });
}
