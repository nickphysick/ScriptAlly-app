/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Log a query v2.2 (design-refs/log-a-query-v2-2/, mock v25) — read off the rendered journey over the mock's own data
 * (tests/e2e/seedLaq2.mjs + seedLaq21.mjs), on the EMULATOR, written in `beforeAll` and removed in `afterAll`. Every
 * write a check makes is undone in the same run.
 *
 *   V22-0  the look (Step 0.6 before any change, and again after: LAQ22_TAG=before|after): the review with three
 *          materials, one, and no reply date; the materials tile's pop-up open; the logged screen. 100% and 150%.
 *          Readings: the stamp's rectangle and every text rectangle it meets; the status label's clear space above and
 *          whether anything cuts it; the pop-up inside the panel, cut by nothing; Escape closes it before the leave
 *          check; the tile's focus ring on a keyboard walk; the card's left edge and width on both screens.
 */
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { ensureSignedIn } from "./measure";

const TAG = process.env.LAQ22_TAG ?? "after";
const OUT = "reports/log-a-query-v2-2";
const SHOTS = `${OUT}/${TAG}`;
const READ: Record<string, unknown> = {};
let checks = 0;
const ok = (cond: boolean, label: string) => { checks++; expect.soft(cond, label).toBe(true); };
const BASE = process.env.SA_E2E_BASE_URL ?? "http://127.0.0.1:4321";
export const state = () => JSON.parse(execSync("node tests/e2e/seedLaq2.mjs --state").toString().trim().split("\n").pop()!) as {
  queries: { id: string; agentId: string; manuscriptId: string; status: string }[];
  added: { id: string; name: string }[]; tasks: { id: string; text: string; agentId: string | null; done?: boolean }[];
};
const R = (p: Page) => p.locator('[data-qls="root"]');
const q = (p: Page, k: string) => p.locator(`[data-qls="${k}"]`);
const panel = (p: Page) => R(p).locator("xpath=ancestor::*[contains(concat(' ',normalize-space(@class),' '),' spanel ')][1]");

async function context(browser: Browser, zoom = 1): Promise<{ c: BrowserContext; p: Page }> {
  const c = await browser.newContext({ baseURL: BASE, viewport: { width: Math.round(1480 / zoom), height: Math.round(900 / zoom) }, deviceScaleFactor: zoom });
  const p = await c.newPage();
  p.on("pageerror", (e) => console.log(`[pageerror] ${e.message.slice(0, 300)}`));
  await p.goto("/dashboard");
  await ensureSignedIn(p);
  return { c, p };
}
async function open(p: Page, ms = "laq2-ms") {
  await p.evaluate((id) => { try { localStorage.setItem("scriptally_active_manuscript_id", id); } catch { /* none */ } }, ms);
  await p.goto("/dashboard");
  await p.waitForTimeout(300);
  const d = p.getByRole("button", { name: /^\+?\s*Log a query$/ }).locator("visible=true").first();
  await d.waitFor({ state: "visible", timeout: 60_000 });
  await d.click();
  await R(p).waitFor({ state: "visible", timeout: 30_000 });
  await p.waitForTimeout(350);
}
async function shot(p: Page, name: string) {
  mkdirSync(SHOTS, { recursive: true });
  await p.waitForTimeout(500);
  await panel(p).screenshot({ path: `${SHOTS}/${name}.png`, animations: "disabled" });
}
async function agent(p: Page, id: string, name: string) {
  const row = p.locator(`[data-qls="agent"][data-id="${id}"]`);
  await q(p, "find").fill(name);
  await row.waitFor({ state: "visible", timeout: 60_000 });
  await row.click();
}
async function sentToday(p: Page) { await p.locator('[data-qls="when-opt"][data-k="today"]').click(); }
async function how(p: Page) { await p.locator('[data-qls="how-opt"]').first().click(); }
async function nudgeOn(p: Page) { await q(p, "nudge-continue").click(); }
async function discard(p: Page) {
  if (!(await R(p).isVisible().catch(() => false))) return;
  await p.locator('[data-qc149f="close"]').first().click();
  await p.waitForTimeout(300);
  if (await q(p, "leave-discard").isVisible().catch(() => false)) await q(p, "leave-discard").click();
  await R(p).waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});
}
/** the three review cases: three materials (Harriet's package), one (Nadia, Small Hours), no reply date (Callum) */
export type Case = "three" | "one" | "nodate";
async function toReview(p: Page, k: Case) {
  if (k === "three") { await open(p); await agent(p, "laq2-hv", "Harriet"); await sentToday(p); await q(p, "use-ask").click(); await how(p); await nudgeOn(p); }
  else if (k === "one") { await open(p, "laq2-ms0"); await agent(p, "laq2-ns", "Nadia"); await sentToday(p); await q(p, "pieces-continue").click(); await how(p); await nudgeOn(p); }
  else {
    await open(p, "laq2-ms0"); await agent(p, "laq2-cr", "Callum"); await sentToday(p);
    await q(p, "pieces").locator('[data-qls="piece"]').nth(1).click().catch(() => {});
    await q(p, "pieces-continue").click(); await how(p);
    await p.locator('[data-qls="nudge-opt"][data-k="none"] > button').click(); await nudgeOn(p);
  }
  await expect(R(p)).toHaveAttribute("data-step", "check");
  await p.waitForTimeout(600);
}

/** the geometry this pass is about, read off the page in one go */
export const geo = (p: Page, still = true) => R(p).evaluate((root, still) => {
  if (still) root.querySelector<HTMLElement>('[data-qls="preview"]')?.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior });
  const rr = (r: DOMRect) => ({ l: Math.round(r.left * 10) / 10, t: Math.round(r.top * 10) / 10, r: Math.round(r.right * 10) / 10, b: Math.round(r.bottom * 10) / 10 });
  const pv = root.querySelector<HTMLElement>('[data-qls="preview"]');
  const card = pv?.querySelector<HTMLElement>('[data-qc154="card"]') ?? null;
  const label = pv?.querySelector<HTMLElement>('[data-pc3="label"]') ?? null;
  const tile = pv?.querySelector<HTMLElement>('[data-qc1533="tab"]') ?? null;
  const pop = pv?.querySelector<HTMLElement>('[data-qc1533="pop"]') ?? null;
  const stamp = root.querySelector<HTMLElement>('[data-qls="stamp"]');
  const body = root.querySelector<HTMLElement>('[data-qls="body"]')!;
  const scroller = (root.querySelector<HTMLElement>(".laq-yay") ?? body);
  const head = root.querySelector<HTMLElement>("h2.laq-qh, [data-qls='yay-head']");
  /* every text run on the screen, one rectangle per line box, with where it sits */
  const texts: { where: string; s: string; r: ReturnType<typeof rr> }[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const s = (n.textContent ?? "").trim();
    const el = n.parentElement;
    if (!s || !el || el.closest('[data-qls="stamp"]') || el.closest('[aria-hidden="true"]:not([data-pc3="label"])')) continue;
    if (getComputedStyle(el).visibility === "hidden" || !el.getClientRects().length) continue;
    const rg = document.createRange(); rg.selectNodeContents(n);
    for (const x of rg.getClientRects()) if (x.width > 0 && x.height > 0)
      texts.push({ where: el.closest('[data-qls="preview"]') ? (el.closest('[data-pc3="label"]') ? "label" : el.closest('[data-qc1533]') ? "tile" : "card") : "page", s: s.slice(0, 24), r: rr(x) });
  }
  const hit = (a: { l: number; t: number; r: number; b: number }, b: { l: number; t: number; r: number; b: number }) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
  /* the label: what cuts it (every clipping ancestor's box), what is drawn over its middle, and the clear space above it */
  const cutBy = (el: HTMLElement | null) => {
    if (!el) return null;
    const r = el.getBoundingClientRect(); const out: string[] = [];
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (cs.overflowX === "visible" && cs.overflowY === "visible") continue;
      const x = a.getBoundingClientRect();
      if (r.left < x.left - 0.5 || r.top < x.top - 0.5 || r.right > x.right + 0.5 || r.bottom > x.bottom + 0.5) out.push(`${a.tagName.toLowerCase()}.${String(a.className).split(" ")[0]}`);
    }
    return out;
  };
  /* the label and the pop-up take no pointer, so elementFromPoint looks through them: let it see them while reading */
  const pe = [label, pop].filter((e): e is HTMLElement => !!e).map((e) => [e, e.style.pointerEvents] as const);
  for (const [e] of pe) e.style.pointerEvents = "auto";
  const lr = label?.getBoundingClientRect() ?? null;
  const above = lr ? texts.filter((x) => x.where === "page" && (x.r.t + x.r.b) / 2 < (lr.top + lr.bottom) / 2 && x.r.r > lr.left - 400) : [];
  const clearAbove = lr ? Math.round((lr.top - Math.max(...above.map((x) => x.r.b), -1e9)) * 10) / 10 : null;
  const labelOnTop = (() => {
    if (!lr) return null;
    const pts = [[lr.left + 3, lr.top + 3], [lr.right - 3, lr.top + 3], [(lr.left + lr.right) / 2, (lr.top + lr.bottom) / 2], [lr.left + 3, lr.bottom - 3], [lr.right - 3, lr.bottom - 3]];
    return pts.every(([x, y]) => { const e = document.elementFromPoint(x, y); return !!e && (e === label || label!.contains(e)); });
  })();
  /* the pop-up: inside the panel and every clipping ancestor, and on top at its corners */
  const panelR = root.getBoundingClientRect();
  const popR = pop?.getBoundingClientRect() ?? null;
  const popOnTop = popR ? [[popR.left + 4, popR.top + 4], [popR.right - 4, popR.top + 4], [popR.left + 4, popR.bottom - 4], [popR.right - 4, popR.bottom - 4]]
    .every(([x, y]) => { const e = document.elementFromPoint(x, y); return !!e && (e === pop || pop!.contains(e)); }) : null;
  for (const [e, v] of pe) e.style.pointerEvents = v;
  const stR = stamp ? rr(stamp.getBoundingClientRect()) : null;
  const cardR = card ? rr(card.getBoundingClientRect()) : null;
  const cs = getComputedStyle(scroller);
  return {
    card: cardR, label: lr ? rr(lr) : null, labelCut: cutBy(label), labelOnTop, clearAbove,
    tile: tile ? rr(tile.getBoundingClientRect()) : null,
    pop: popR ? rr(popR) : null, popCut: cutBy(pop), popOnTop, popInPanel: popR ? popR.left >= panelR.left && popR.right <= panelR.right && popR.top >= panelR.top && popR.bottom <= panelR.bottom : null,
    popInCardWidth: popR && cardR ? popR.left >= cardR.l - 0.5 && popR.right <= cardR.r + 0.5 : null,
    stamp: stR, stampStyle: stamp ? { bg: getComputedStyle(stamp).backgroundColor, blend: getComputedStyle(stamp).mixBlendMode, tf: getComputedStyle(stamp).transform } : null,
    stampHits: stR ? texts.filter((x) => hit(stR, x.r)).map((x) => `${x.where}:${x.s}`) : [],
    stampToCard: stR && cardR ? { rightIn: Math.round((cardR.r - stR.r) * 10) / 10, hangs: Math.round((stR.b - cardR.b) * 10) / 10 } : null,
    headLeft: head ? Math.round(head.getBoundingClientRect().left * 10) / 10 : null,
    colLeft: Math.round((scroller.getBoundingClientRect().left + parseFloat(cs.paddingLeft)) * 10) / 10,
    colRight: Math.round((scroller.getBoundingClientRect().right - parseFloat(cs.paddingRight)) * 10) / 10,
    scrolls: scroller.scrollHeight > scroller.clientHeight + 1,
  };
}, still);

test.describe.configure({ mode: "default" });
let ctx: BrowserContext;
let page: Page;
test.beforeAll(async ({ browser }) => {
  test.setTimeout(300_000);
  execSync("node tests/e2e/seedLaq2.mjs --clean && node tests/e2e/seedLaq2.mjs && node tests/e2e/seedLaq21.mjs", { stdio: "ignore" });
  ({ c: ctx, p: page } = await context(browser));
});
test.afterAll(async () => {
  await ctx?.close();
  execSync("node tests/e2e/seedLaq2.mjs --clean", { stdio: "ignore" });
  mkdirSync(OUT, { recursive: true });
  const f = `${OUT}/readings-${TAG}.json`;
  const was = (() => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return {}; } })();
  writeFileSync(f, JSON.stringify({ ...was, checks, ...READ, at: new Date().toISOString() }, null, 2));
});

test("V22-0 — the look: review (three, one, no date), the tile's pop-up, the logged screen; 100% and 150%", async ({ browser }) => {
  test.setTimeout(600_000);
  for (const zoom of [1, 1.5]) {
    const { c, p } = zoom === 1 ? { c: null, p: page } : await context(browser, zoom);
    const z = `@${zoom * 100}`;
    for (const k of ["three", "one", "nodate"] as Case[]) {
      await toReview(p, k);
      READ[`review-${k}${z}`] = await geo(p);
      await shot(p, `review-${k}${z}`);
      if (k === "three") {
        /* the tile's pop-up, by hover */
        const tile = p.locator('[data-qls="preview"] [data-qc1533="tab"]');
        await tile.scrollIntoViewIfNeeded();
        await tile.hover();
        await p.waitForTimeout(500);
        READ[`pop-hover${z}`] = await geo(p, false);
        await shot(p, `review-three-popup${z}`);
        /* Escape closes the pop-up first, then the leave check */
        if (zoom === 1) {
          await p.keyboard.press("Escape");
          await p.waitForTimeout(250);
          const g1 = await geo(p, false);
          const ask1 = await q(p, "leave-discard").isVisible().catch(() => false);
          await p.keyboard.press("Escape");
          await p.waitForTimeout(250);
          const ask2 = await q(p, "leave-discard").isVisible().catch(() => false);
          READ.escape = { popAfterFirst: !!g1.pop, leaveAfterFirst: ask1, leaveAfterSecond: ask2 };
          if (ask2) await q(p, "leave-keep").click();
          await p.mouse.move(2, 2);
          /* the tile's focus ring on a keyboard walk: from the heading, Tab until the tile */
          await p.locator('[data-qls="body"] h2.laq-qh').click();
          let ring: unknown = "never reached";
          for (let i = 0; i < 12; i++) {
            await p.keyboard.press("Tab");
            const r = await p.evaluate(() => {
              const a = document.activeElement as HTMLElement | null;
              if (!a?.matches('[data-qc1533="tab"]')) return null;
              const cs = getComputedStyle(a);
              return { outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`, shadow: cs.boxShadow, ring: (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== "none" };
            });
            if (r) { ring = r; break; }
          }
          READ.tileRing = ring;
          await shot(p, `review-three-tile-focus${z}`);
          /* opened by the keyboard: Escape closes it first, the next Escape is the leave check */
          const k1 = await geo(p, false);
          await p.keyboard.press("Escape"); await p.waitForTimeout(250);
          const k2 = await geo(p, false);
          const kAsk1 = await q(p, "leave-discard").isVisible().catch(() => false);
          await p.keyboard.press("Escape"); await p.waitForTimeout(250);
          const kAsk2 = await q(p, "leave-discard").isVisible().catch(() => false);
          READ.escapeKeyboard = { popOpenOnFocus: !!k1.pop, popAfterFirst: !!k2.pop, leaveAfterFirst: kAsk1, leaveAfterSecond: kAsk2 };
          if (kAsk2) await q(p, "leave-keep").click();
        }
      }
      if (k !== "one") { await discard(p); continue; }
      /* the logged screen (one material), then Undo */
      await q(p, "log").click();
      await p.waitForTimeout(470);
      if (await q(p, "stamp").count()) { READ[`review-stamp-one${z}`] = await geo(p, false); await panel(p).screenshot({ path: `${SHOTS}/review-stamp-one${z}.png` }); }
      await q(p, "yay").waitFor({ state: "visible", timeout: 30_000 });
      await p.waitForTimeout(1800);
      READ[`logged-one${z}`] = await geo(p);
      await shot(p, `logged-one${z}`);
      await q(p, "undo").click();
      await p.waitForTimeout(1500);
      await discard(p);
    }
    /* the logged screen with three materials and with no date */
    for (const k of ["three", "nodate"] as Case[]) {
      await toReview(p, k);
      await q(p, "log").click();
      await p.waitForTimeout(470);
      if (await q(p, "stamp").count()) { READ[`review-stamp-${k}${z}`] = await geo(p, false); await panel(p).screenshot({ path: `${SHOTS}/review-stamp-${k}${z}.png` }); }
      await q(p, "yay").waitFor({ state: "visible", timeout: 30_000 });
      await p.waitForTimeout(1800);
      READ[`logged-${k}${z}`] = await geo(p);
      await shot(p, `logged-${k}${z}`);
      await q(p, "undo").click();
      await p.waitForTimeout(1500);
      await discard(p);
    }
    if (c) await c.close();
  }
  ok(!state().queries.some((x) => ["laq2-hv", "laq2-ns", "laq2-cr"].includes(x.agentId)), "every logged query undone");
  if (TAG !== "after") return;
  type G = Awaited<ReturnType<typeof geo>>;
  for (const [k, v] of Object.entries(READ)) {
    const g = v as G;
    if (!g || typeof g !== "object" || !("card" in g)) continue;
    if (k.startsWith("review-") || k.startsWith("logged-")) {
      if (!k.startsWith("review-stamp")) {
        ok(g.clearAbove != null && g.clearAbove >= 10, `${k}: at least 10px clear above the label (${g.clearAbove})`);
        ok(!!g.labelOnTop && (g.labelCut ?? []).length === 0, `${k}: the label fully visible (${g.labelOnTop}, ${JSON.stringify(g.labelCut)})`);
      }
      ok(!!g.card && Math.abs(g.card.l - g.colLeft) < 0.6 && Math.abs(g.card.r - g.colRight) < 0.6, `${k}: the card on the column's edges (${JSON.stringify(g.card)} vs ${g.colLeft}–${g.colRight})`);
    }
    if (k.startsWith("logged-") || k.startsWith("review-stamp")) {
      ok(!!g.stamp && g.stampHits.length === 0, `${k}: the stamp meets no text (${JSON.stringify(g.stampHits)})`);
      ok(!!g.stampToCard && g.stampToCard.hangs >= 20 && g.stampToCard.hangs <= 40, `${k}: the stamp hangs about 30px below the card (${JSON.stringify(g.stampToCard)})`);
    }
    if (k.startsWith("pop-")) ok(!!g.pop && g.popOnTop === true && (g.popCut ?? []).length === 0 && g.popInCardWidth === true && !!g.tile && g.pop.t > g.tile.b,
      `${k}: the pop-up below the tile, inside the card's width, cut by nothing (${JSON.stringify({ pop: g.pop, tile: g.tile, on: g.popOnTop, cut: g.popCut, w: g.popInCardWidth })})`);
  }
  const ek = READ.escapeKeyboard as { popOpenOnFocus: boolean; popAfterFirst: boolean; leaveAfterSecond: boolean } | undefined;
  ok(!!ek && ek.popOpenOnFocus && !ek.popAfterFirst && ek.leaveAfterSecond, `keyboard: Escape closes the pop-up, then the leave check (${JSON.stringify(ek)})`);
  for (const k of ["review-three@100", "review-one@100", "review-nodate@100"]) ok((READ[k] as G).scrolls === false, `${k}: no scroll bar at the ref's panel height`);
});
