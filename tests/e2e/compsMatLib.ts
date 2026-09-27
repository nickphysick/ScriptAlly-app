/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * compsMatLib — the probes for compsMat.measure.ts (Comparable titles v2, 27 Sep; ref
 * design-refs/materials/comps-v2.html). A plain module, so importing it runs no cases.
 *
 * ⚠️ EVERY CLAIM IS A LEDGER ROW AND A CASE ASSERTS ONLY AT ITS END, so the first failing claim
 * does not leave the ones below it unproved, and "red before" is a per-lock statement. A probe that
 * finds no subject writes a FAILING row — it never skips.
 *
 * ⚠️ THE PAGE IS READ THROUGH ITS OWN `data-cpv` HOOKS, SCOPED TO THE VISIBLE PAGE. Every workspace
 * page stays mounted, so a bare `document.querySelector` answers about whichever copy is first.
 *
 * ⚠️ THE FIXTURE IS CHOSEN THROUGH THE SWITCHER'S OWN KEY, never by clicking a title: both fixture
 * manuscripts carry the mock's title, so the intro wraps where the mock's does.
 */
import { expect, type Page } from "@playwright/test";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { openRoute } from "./measure";
import { mkdirSync, writeFileSync } from "node:fs";
import { COLLAPSE_KEY, Ledger } from "./shellV3Lib";

/** The shell suite's ledger, writing to this run's own folder rather than app-shell-v3's. */
export class CompsLedger extends Ledger {
  write() {
    mkdirSync("reports/comps-v2", { recursive: true });
    writeFileSync(`reports/comps-v2/ledger-${this.name}.json`, JSON.stringify(this.rows, null, 1));
    const byLock: Record<string, { pass: number; fail: number }> = {};
    for (const r of this.rows) { byLock[r.lock] ??= { pass: 0, fail: 0 }; byLock[r.lock][r.ok ? "pass" : "fail"]++; }
    console.log(`LEDGER ${this.name}: ${JSON.stringify(byLock)}`);
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 60)) console.log(`  ✗ ${r.lock} · ${r.route} · ${r.size} · ${r.state} — ${r.detail}`);
  }
}

export const ROUTE = "/manuscripts/comps";
export const FILLED = "seed-ms-comps5";
export const EMPTY = "seed-ms-comps0";
export const KEY = "scriptally_active_manuscript_id";
export const MOCK = "file://" + resolve("design-refs/materials/comps-v2.html");

/** The mock's five comps, in its order — the seeder writes exactly these. */
export const FIXTURE_TITLES = ["The Tidewater Line", "Salt Road", "Nine Miles Out", "Bright Water", "Kestrel Hour"];

export const SIZES = [
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
] as const;

export function seed() { execFileSync("node", ["tests/e2e/seedCompsFixture.mjs"], { stdio: "inherit" }); }
export function restore() { execFileSync("node", ["tests/e2e/seedCompsFixture.mjs", "--restore"], { stdio: "inherit" }); }

/** Open the page on one fixture manuscript, in one sidebar state, with fonts settled. */
export async function openComps(page: Page, ms: string, vp: { width: number; height: number }, collapsed = false) {
  await page.addInitScript(([k, v, ck, cv]) => {
    try { localStorage.setItem(k, v); localStorage.setItem(ck, cv); } catch { /* */ }
  }, [KEY, ms, COLLAPSE_KEY, collapsed ? "1" : "0"]);
  await openRoute(page, ROUTE, vp);
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForTimeout(400);
}

/** One read of the page's frame: header, group, main column, rail, scroller child. */
export async function readFrame(page: Page) {
  return page.evaluate(() => {
    const vis = (s: string, root: ParentNode = document) =>
      [...root.querySelectorAll(s)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement | undefined;
    const box = (e?: Element | null) => {
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height };
    };
    const pageEl = vis('[data-cpv="page"]');
    const scroller = pageEl?.closest(".wpg-scroll") as HTMLElement | null;
    /* the scroller's DIRECT child that holds the page — the one element that may pay the gutter */
    let child: HTMLElement | null = pageEl ?? null;
    while (child && child.parentElement && child.parentElement !== scroller) child = child.parentElement;
    const cs = child ? getComputedStyle(child) : null;
    const hd = pageEl ? vis('[data-probe="page-header"]', pageEl) : undefined;
    const title = hd?.querySelector('[data-probe="title"]') as HTMLElement | null;
    const titleLines = title ? new Set([...(() => { const r = document.createRange(); r.selectNodeContents(title); return r.getClientRects(); })()].map((x) => Math.round(x.top))).size : 0;
    const main = pageEl ? vis('[data-cpv="main"]', pageEl) : undefined;
    const firstBox = main ? ([...main.children].find((c) => c.getBoundingClientRect().height > 0) ?? null) : null;
    const rail = pageEl ? vis('[data-cpv="rail"]', pageEl) : undefined;
    const bar = vis('[data-probe="navrow"]');
    const pname = bar?.querySelector('[data-shell="pagename"]');
    const gutter = Math.min(52, Math.max(28, window.innerWidth * 0.032));
    const surf = (e: Element | null) => {
      if (!e) return null;
      const s = getComputedStyle(e);
      return { bg: s.backgroundColor, img: s.backgroundImage, shadow: s.boxShadow, border: s.borderTopWidth };
    };
    return {
      found: !!pageEl,
      scrollerTop: scroller ? scroller.getBoundingClientRect().top : NaN,
      scrollTop: scroller?.scrollTop ?? NaN,
      child: box(child), childPadL: cs ? parseFloat(cs.paddingLeft) : NaN, childPadR: cs ? parseFloat(cs.paddingRight) : NaN,
      childSurf: surf(child), pageSurf: surf(pageEl ?? null),
      pageGround: getComputedStyle(document.querySelector(".ws-main") ?? document.body).backgroundColor,
      gutter,
      header: box(hd), headerSize: hd?.getAttribute("data-size") ?? null, rule: hd ? hd.getBoundingClientRect().bottom - 1 : NaN,
      hasArt: !!hd?.querySelector('[data-probe="art"]'),
      title: box(title), titleFam: title ? getComputedStyle(title).fontFamily : null, titleLines, titleText: title?.textContent ?? null,
      eyebrow: hd?.querySelector('[data-probe="eyebrow"]')?.textContent?.replace(/\s+/g, " ").trim() ?? null,
      intro: hd?.querySelector(".ph-intro")?.textContent?.replace(/\s+/g, " ").trim() ?? null,
      introMs: hd?.querySelector(".ph-intro .ph-ms")?.textContent ?? null,
      introStrong: [...(hd?.querySelectorAll(".ph-intro strong") ?? [])].map((s) => s.textContent),
      primary: hd?.querySelector(".ph-primary")?.textContent?.trim() ?? null,
      main: box(main), first: box(firstBox),
      rail: box(rail), railPos: rail ? getComputedStyle(rail).position : null, railTop: rail ? getComputedStyle(rail).top : null,
      pnameSection: pname?.querySelector(".ws-pname-s")?.textContent?.trim() ?? null,
      pnameName: pname?.querySelector(".ws-pname-n")?.textContent?.trim() ?? null,
    };
  });
}

/** Scroll the page's scroller to `by` (clamped by the page), let sticky settle; report where it got and its maximum. */
export async function scrollPage(page: Page, by: number) {
  const did = await page.evaluate((n) => {
    const el = [...document.querySelectorAll('[data-cpv="page"]')].find((e) => e.getBoundingClientRect().height > 0);
    const s = el?.closest(".wpg-scroll") as HTMLElement | null;
    if (!s) return { did: -1, max: -1 };
    s.scrollTop = n;
    return { did: s.scrollTop, max: s.scrollHeight - s.clientHeight };
  }, by);
  await page.waitForTimeout(250);
  return did;
}

/** The library: each card's title, index, switch state, ordinal, age and spine, in DOM order. */
export async function readList(page: Page) {
  return page.evaluate(() => {
    const vis = (s: string) => [...document.querySelectorAll(s)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement | undefined;
    const root = vis('[data-cpv="page"]');
    if (!root) return null;
    const cards = [...root.querySelectorAll('[data-cpv="list"] [data-cpv="comp"]')] as HTMLElement[];
    const ql = root.querySelector('[data-cpv="qline"]') as HTMLElement | null;
    const copy = root.querySelector('[data-cpv="copy"]') as HTMLButtonElement | null;
    return {
      cards: cards.map((c) => {
        const sw = c.querySelector('[data-cpv="inq"]');
        const spine = c.querySelector('[data-cpv="spine"]') as HTMLElement | null;
        return {
          title: c.getAttribute("data-title"),
          on: sw?.getAttribute("aria-checked") === "true",
          role: sw?.getAttribute("role") ?? null,
          pos: c.querySelector('[data-cpv="pos"]')?.textContent?.trim() ?? null,
          age: c.querySelector('[data-cpv="age"]')?.textContent?.trim() ?? null,
          by: c.querySelector('[data-cpv="by"]')?.textContent?.replace(/\s+/g, " ").trim() ?? null,
          facets: [...c.querySelectorAll('[data-cpv="facet"]')].map((f) => f.textContent?.trim()),
          note: c.querySelector('[data-cpv="note"]')?.textContent?.replace(/\s+/g, " ").trim() ?? null,
          addNote: !!c.querySelector('[data-cpv="add-note"]'),
          ringed: getComputedStyle(c).boxShadow.includes("inset"),
          spineText: spine?.textContent?.replace(/\s+/g, " ").trim() ?? null,
          spineBg: spine ? getComputedStyle(spine).backgroundColor : null,
          spineW: spine?.getBoundingClientRect().width ?? NaN, spineH: spine?.getBoundingClientRect().height ?? NaN,
        };
      }),
      line: ql?.textContent?.replace(/\s+/g, " ").trim() ?? null,
      lineKind: ql?.getAttribute("data-kind") ?? null,
      lineItalics: [...(ql?.querySelectorAll("i, em") ?? [])].map((e) => e.textContent),
      copyDisabled: copy ? copy.disabled : null,
      cap: root.querySelector('[data-cpv="qcap"]')?.textContent?.replace(/\s+/g, " ").trim() ?? null,
      libCount: root.querySelector('[data-cpv="lib-count"]')?.textContent?.trim() ?? null,
      libFact: root.querySelector('[data-cpv="lib-fact"]')?.textContent?.replace(/\s+/g, " ").trim() ?? null,
      form: !!root.querySelector('[data-cpv="form"]'),
      focused: (document.activeElement as HTMLElement | null)?.id ?? null,
    };
  });
}

/** The visible page's text, header + main + rail, for the no-appraisal sweep. */
export async function pageText(page: Page) {
  return page.evaluate(() => {
    const root = [...document.querySelectorAll('[data-cpv="page"]')].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement | undefined;
    return root?.innerText ?? "";
  });
}

/** A locator on the visible page. */
export const on = (page: Page, sel: string) => page.locator(`[data-cpv="page"]:visible ${sel}`);

/** Wait until the list shows exactly these titles, in this order (the write has landed). */
export async function waitForOrder(page: Page, titles: string[], ms = 10_000) {
  await expect.poll(async () => (await readList(page))?.cards.map((c) => c.title) ?? null, { timeout: ms }).toEqual(titles);
}

/** Read the mock's frame by the same ruler, at the same viewport, filled or empty. */
export async function readMock(page: Page, vp: { width: number; height: number }, state: "filled" | "empty") {
  await page.setViewportSize(vp);
  await page.goto(MOCK);
  await page.evaluate(async () => { await document.fonts.ready; await new Promise((r) => setTimeout(r, 300)); });
  if (state === "empty") {
    await page.locator('.review [data-v="empty"]').click();
    await page.waitForTimeout(150);
  }
  return page.evaluate(() => {
    const box = (e?: Element | null) => { if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
    const bar = document.querySelector("#bar")!.getBoundingClientRect();
    const ph = document.querySelector(".ph")!;
    const main = document.querySelector(".col");
    const first = [...(document.querySelector("#listArea > div")?.children ?? [])].find((c) => c.getBoundingClientRect().height > 0);
    const rel = (b: ReturnType<typeof box>) => b && { ...b, t: b.t - bar.bottom, b: b.b - bar.bottom };
    return {
      header: rel(box(ph)), rule: ph.getBoundingClientRect().bottom - 1 - bar.bottom,
      main: rel(box(main)), first: rel(box(first ?? null)), rail: rel(box(document.querySelector(".rail"))),
      qcard: rel(box(document.querySelector(".qcard"))), comp: rel(box(document.querySelector("#list .comp"))),
      tray: rel(box(document.querySelector(".tray"))),
      fonts: ["Special Elite", "Source Serif 4", "JetBrains Mono"].every((f) => [...document.fonts].some((x) => x.family.replace(/["']/g, "") === f && x.status === "loaded")),
    };
  });
}
