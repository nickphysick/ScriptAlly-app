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
 *   V22-2  notes (screens 03–07): add with the button and with Ctrl + Enter, two notes, edit in place, delete; Escape's
 *          order; words left in the box are kept; saved on Log query as journal entries, gone on Undo; on the query
 *          card's Notes tab afterwards, dated today
 *   V22-3  the 25th query (seedLaq22.mjs: 24 on the book, three undated): the review's "queries sent" 25 and the
 *          logged screen's "Query number 25" agree (D5), and the milestone line shows
 *   V22-4  reduced motion: no confetti, no thump (and no wait for one), the "+1" still, the final state drawn at once
 */
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { ensureSignedIn } from "./measure";
import { pressQuickLogAQuery } from "./laqLib";

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
  journal: { id: string; queryId: string; text: string; createdAt: string }[];
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
  await pressQuickLogAQuery(p); /* the header's door since add-agent v2 (laqLib) */
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

/** the review's stamp is on for 650ms while the stamp thumps and the panel bumps: hold both at their end state (the
 *  stamp's place is unchanged; only the motion goes) so it is read where it lands */
async function holdStill(p: Page) {
  await p.addStyleTag({ content: ".laq .laq-stamp.is-thump, .laq .laq-in.is-bump { animation: none !important; }" });
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
      const cx = cs.overflowX !== "visible", cy = cs.overflowY !== "visible";
      if (!cx && !cy) continue;
      const x = a.getBoundingClientRect();
      /* an ancestor cuts only along the axis it clips (overflow-x: clip leaves the vertical open) */
      if ((cx && (r.left < x.left - 0.5 || r.right > x.right + 0.5)) || (cy && (r.top < x.top - 0.5 || r.bottom > x.bottom + 0.5))) out.push(`${a.tagName.toLowerCase()}.${String(a.className).split(" ")[0]}`);
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
    /* along its middle and its top and bottom edges, clear of the pill's rounded ends */
    const my = (lr.top + lr.bottom) / 2, mx = (lr.left + lr.right) / 2;
    const pts = [[lr.left + 2, my], [mx, my], [lr.right - 2, my], [lr.left + 12, lr.top + 1.5], [lr.right - 12, lr.top + 1.5], [lr.left + 12, lr.bottom - 1.5], [lr.right - 12, lr.bottom - 1.5]];
    return pts.every(([x, y]) => { const e = document.elementFromPoint(x, y); return !!e && (e === label || label!.contains(e)); });
  })();
  /* the pop-up: inside the panel and every clipping ancestor, and on top at its corners */
  const panelR = root.getBoundingClientRect();
  const popR = pop?.getBoundingClientRect() ?? null;
  const popOnTop = popR ? [[popR.left + 16, popR.top + 16], [popR.right - 16, popR.top + 16], [popR.left + 16, popR.bottom - 16], [popR.right - 16, popR.bottom - 16], [popR.left + 2, (popR.top + popR.bottom) / 2], [popR.right - 2, (popR.top + popR.bottom) / 2]]
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
      await holdStill(p);
      await q(p, "log").click();
      /* the stamp lands on the review once the save is in (a stamp is a claim that it landed), for 650ms */
      await q(p, "stamp").waitFor({ state: "attached", timeout: 15_000 }).catch(() => {});
      if ((await R(p).getAttribute("data-step")) === "check" && await q(p, "stamp").count()) { READ[`review-stamp-one${z}`] = await geo(p, false); await panel(p).screenshot({ path: `${SHOTS}/review-stamp-one${z}.png` }); }
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
      await holdStill(p);
      await q(p, "log").click();
      /* the stamp lands on the review once the save is in (a stamp is a claim that it landed), for 650ms */
      await q(p, "stamp").waitFor({ state: "attached", timeout: 15_000 }).catch(() => {});
      if ((await R(p).getAttribute("data-step")) === "check" && await q(p, "stamp").count()) { READ[`review-stamp-${k}${z}`] = await geo(p, false); await panel(p).screenshot({ path: `${SHOTS}/review-stamp-${k}${z}.png` }); }
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
    /* below the tile where the panel has room (100%); at 150% the panel is short and QcMatTile's own rule opens it above */
    if (k.startsWith("pop-")) ok(!!g.pop && g.popOnTop === true && (g.popCut ?? []).length === 0 && g.popInCardWidth === true && !!g.tile && (k.endsWith("@150") || g.pop.t > g.tile.b),
      `${k}: the pop-up below the tile, inside the card's width, cut by nothing (${JSON.stringify({ pop: g.pop, tile: g.tile, on: g.popOnTop, cut: g.popCut, w: g.popInCardWidth })})`);
  }
  ok(["one", "three", "nodate"].every((k) => `review-stamp-${k}@100` in READ), `the stamp read on the review too (${Object.keys(READ).filter((k) => k.startsWith("review-stamp")).join(", ")})`);
  const ek = READ.escapeKeyboard as { popOpenOnFocus: boolean; popAfterFirst: boolean; leaveAfterSecond: boolean } | undefined;
  ok(!!ek && ek.popOpenOnFocus && !ek.popAfterFirst && ek.leaveAfterSecond, `keyboard: Escape closes the pop-up, then the leave check (${JSON.stringify(ek)})`);
  for (const k of ["review-three@100", "review-one@100", "review-nodate@100"]) ok((READ[k] as G).scrolls === false, `${k}: no scroll bar at the ref's panel height`);
});

const NB = (p: Page) => p.locator('[data-qls="notes"]');
test("V22-2 — notes: add, two, edit, delete, Escape, kept words; saved on log, gone on undo, on the card's Notes tab", async () => {
  test.setTimeout(400_000);
  const p = page;
  await toReview(p, "three");
  await shot(p, "notes-01-review");
  await q(p, "add-note").click();
  const field = NB(p).locator("[data-qc158='field']");
  await field.waitFor({ state: "visible" });
  ok(await field.evaluate((e) => e === document.activeElement), "opening the box focuses the field");
  ok(await NB(p).locator("[data-qc158='add-note']").isDisabled(), "Add note is disabled while empty");
  ok((await field.getAttribute("placeholder")) === "Add a note about this query", "the Notes tab's placeholder, nothing else");
  await shot(p, "notes-03-box-open");
  /* Escape on an empty box closes it (not the leave check) */
  await p.keyboard.press("Escape"); await p.waitForTimeout(200);
  ok(!(await field.count()) && !(await q(p, "leave-discard").isVisible().catch(() => false)), "Escape closes an empty writing box first");
  await q(p, "add-note").click();
  await field.fill("Met at the Winchester festival. Asked for the opening chapters in person.");
  await shot(p, "notes-04-typed");
  /* the field is not saved on blur */
  await p.locator('[data-qls="body"] h2.laq-qh').click(); await p.waitForTimeout(200);
  ok(!(await NB(p).locator("[data-qc158='note']").count()), "not saved on blur");
  await field.focus();
  await p.keyboard.press("Control+Enter"); await p.waitForTimeout(400);
  ok(await R(p).isVisible() && (await R(p).getAttribute("data-step")) === "check", "Ctrl + Enter in the field saves the note, never the query");
  const notes = NB(p).locator("[data-qc158='note']");
  ok((await notes.count()) === 1, "the note is added");
  ok(!(await field.count()), "the box closes");
  /* the Notes tab's own header: "You · {day}" (its dayLabel names the day; the ref drew "Today") */
  const today = await p.evaluate(() => { const d = new Date(); return `${d.getDate()} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()]}`; });
  const hd = ((await notes.first().locator("header").textContent()) ?? "").replace(/\s+/g, " ").trim();
  ok(new RegExp(`^You ?· ${today}$`).test(hd), `You · ${today} (${hd})`);
  ok((await NB(p).locator('[data-qls="notes-h"]').textContent())?.trim() === "Notes", "under a Notes heading");
  ok((await q(p, "add-note").textContent())?.trim() === "Add another note", "the link says Add another note");
  const acts = await notes.first().locator("[data-qc158='act']").evaluateAll((els) => els.map((e) => `${e.getAttribute("data-act")}:${(e as HTMLElement).offsetHeight > 0}`));
  ok(JSON.stringify(acts) === JSON.stringify(["edit:true", "delete:true"]), `Edit and Delete, always shown, nothing else (${JSON.stringify(acts)})`);
  await shot(p, "notes-05-added");
  /* a second note, by the button; then delete it */
  await q(p, "add-note").click();
  await field.fill("A second thought.");
  await NB(p).locator("[data-qc158='add-note']").click(); await p.waitForTimeout(300);
  ok((await notes.count()) === 2, "two notes");
  ok(JSON.stringify(await notes.locator("p").allTextContents()) === JSON.stringify(["Met at the Winchester festival. Asked for the opening chapters in person.", "A second thought."]), "oldest first");
  await notes.nth(1).locator("[data-act='delete']").click(); await p.waitForTimeout(250);
  ok((await notes.count()) === 1, "Delete removes it at once");
  /* edit in place: Escape cancels; Ctrl + Enter saves */
  await notes.first().locator("[data-act='edit']").click();
  const ef = notes.first().locator("[data-qc158='edit-field']");
  ok(await ef.evaluate((e) => e === document.activeElement), "Edit focuses the words in place");
  await shot(p, "notes-06-editing");
  await ef.fill("Changed, then cancelled");
  await p.keyboard.press("Escape"); await p.waitForTimeout(250);
  ok(!(await ef.count()) && (await notes.first().locator("p").textContent()) === "Met at the Winchester festival. Asked for the opening chapters in person." && await R(p).isVisible() && !(await q(p, "leave-discard").isVisible().catch(() => false)),
    "Escape cancels the edit first, the words unchanged");
  await notes.first().locator("[data-act='edit']").click();
  await ef.fill("Met at the Winchester festival. Asked for the opening chapters.");
  await p.keyboard.press("Control+Enter"); await p.waitForTimeout(250);
  ok((await notes.first().locator("p").textContent()) === "Met at the Winchester festival. Asked for the opening chapters.", "Ctrl + Enter saves the edit");
  /* words left in the box: Escape does not close it (it goes to the leave check) */
  await q(p, "add-note").click();
  await field.fill("Left in the box");
  await p.keyboard.press("Escape"); await p.waitForTimeout(250);
  ok(await field.isVisible() && await q(p, "leave-discard").isVisible().catch(() => false), "a box with words is not closed by Escape: the leave check");
  await q(p, "leave-keep").click();
  await shot(p, "notes-07-two-and-box");
  /* Log query: both saved, the box's words too, in order */
  await q(p, "log").click();
  await q(p, "yay").waitFor({ state: "visible", timeout: 30_000 });
  await p.waitForTimeout(1500);
  const st = state();
  const qid = st.queries.find((x) => x.agentId === "laq2-hv")?.id;
  const j = st.journal.filter((x) => x.queryId === qid).sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((x) => x.text);
  READ.savedNotes = j;
  ok(JSON.stringify(j) === JSON.stringify(["Met at the Winchester festival. Asked for the opening chapters.", "Left in the box"]), `saved on log, as typed, oldest first (${JSON.stringify(j)})`);
  await q(p, "undo").click(); await p.waitForTimeout(2000);
  const after = state();
  ok(!after.queries.some((x) => x.agentId === "laq2-hv") && !after.journal.some((x) => x.queryId === qid), `Undo removes the notes with the query (${JSON.stringify(after.journal)})`);
  await discard(p);
  /* again, then the query's card: the note on its Notes tab, dated today */
  await toReview(p, "three");
  await q(p, "add-note").click();
  await field.fill("On the card afterwards.");
  await p.keyboard.press("Control+Enter");
  await q(p, "log").click();
  await q(p, "yay").waitFor({ state: "visible", timeout: 30_000 });
  await p.waitForTimeout(1200);
  await q(p, "open-card").click();
  const card = p.locator("[data-qp='panel'] [data-qc152='card']").locator("visible=true").first();
  await card.waitFor({ state: "visible", timeout: 30_000 });
  await card.locator("[data-qc152='tab'][data-tab='notes']").first().click();
  await p.waitForTimeout(800);
  const tabNotes = await card.locator("[data-qc158='note']").evaluateAll((els) => els.map((e) => (e.textContent ?? "").replace(/\s+/g, " ").trim()));
  READ.cardNotes = tabNotes;
  const today2 = await p.evaluate(() => { const d = new Date(); return `${d.getDate()} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()]}`; });
  ok(tabNotes.some((t) => new RegExp(`^You ?· ${today2}On the card afterwards\\.`).test(t)), `on the query card's Notes tab, as typed, dated today (${JSON.stringify(tabNotes)})`);
  mkdirSync(SHOTS, { recursive: true });
  await card.screenshot({ path: `${SHOTS}/notes-08-on-the-card.png` });
  await p.keyboard.press("Escape");
});

test("V22-3 — the 25th query: the review's count and Query number agree; the milestone", async () => {
  test.setTimeout(300_000);
  execSync("node tests/e2e/seedLaq2.mjs --clean && node tests/e2e/seedLaq2.mjs && node tests/e2e/seedLaq21.mjs && node tests/e2e/seedLaq22.mjs", { stdio: "ignore" });
  try {
    const p = page;
    await toReview(p, "three");
    const sent = await p.locator('[data-qls="count"]').evaluateAll((els) => els.map((e) => (e.textContent ?? "").replace(/\s+/g, " ").trim()));
    READ.milestoneReview = sent;
    ok(sent.some((t) => /^25\s*\+1\s*queries sent$/.test(t)), `the review says 25 queries sent, undated ones counted (${JSON.stringify(sent)})`);
    await q(p, "log").click();
    await q(p, "yay").waitFor({ state: "visible", timeout: 30_000 });
    await p.waitForTimeout(2600);
    const n = await q(p, "odometer").getAttribute("data-n");
    const mile = ((await q(p, "milestone").textContent().catch(() => "")) ?? "").trim();
    READ.milestoneLogged = { n, mile };
    ok(n === "25", `Query number 25 (${n})`);
    ok(mile === "Twenty-five queries. That takes some nerve.", `the milestone (${mile})`);
    await shot(p, "logged-25th");
    await q(p, "undo").click(); await p.waitForTimeout(1500);
    await discard(p);
  } finally {
    execSync("node tests/e2e/seedLaq2.mjs --clean && node tests/e2e/seedLaq2.mjs && node tests/e2e/seedLaq21.mjs", { stdio: "ignore" });
  }
});

test("V22-4 — reduced motion: no confetti, no thump, the +1 still, the final state drawn", async ({ browser }) => {
  test.setTimeout(300_000);
  const c = await browser.newContext({ baseURL: BASE, viewport: { width: 1480, height: 900 }, reducedMotion: "reduce" });
  const p = await c.newPage();
  await p.goto("/dashboard"); await ensureSignedIn(p);
  await toReview(p, "three");
  const pill = await p.locator(".rvb-n i").first().evaluate((e) => getComputedStyle(e).animationName);
  ok(pill === "none", `the +1 is still (${pill})`);
  await q(p, "log").click();
  /* no thump to wait for: the logged screen comes as soon as the save lands */
  await q(p, "yay").waitFor({ state: "visible", timeout: 30_000 });
  await p.waitForTimeout(120);
  const r = await R(p).evaluate((root) => {
    const st = root.querySelector<HTMLElement>('[data-qls="stamp"]');
    const odo = root.querySelector<HTMLElement>(".laq-odo > span");
    return {
      confetti: !!root.querySelector('[data-qls="confetti"]'),
      stamp: st ? { thump: st.classList.contains("is-thump"), anim: getComputedStyle(st).animationName } : null,
      head: (root.querySelector('[data-qls="yay-head"]')?.textContent ?? "").replace(/\s+/g, " ").trim(),
      odo: odo ? { go: odo.parentElement!.classList.contains("is-go"), tr: getComputedStyle(odo).transitionDuration, tf: getComputedStyle(odo).transform } : null,
      anims: [...root.querySelectorAll<HTMLElement>("*")].filter((e) => getComputedStyle(e).animationName !== "none").map((e) => String(e.className).split(" ")[0]).slice(0, 8),
    };
  });
  READ.reduced = r;
  ok(!r.confetti, "no confetti");
  ok(!!r.stamp && !r.stamp.thump && r.stamp.anim === "none", `the stamp is simply there, no thump (${JSON.stringify(r.stamp)})`);
  ok(r.head === "Off to Harriet.", `the heading drawn whole at once (${r.head})`);
  ok(!!r.odo && r.odo.go && /^0s/.test(r.odo.tr), `the count drawn at its final figure (${JSON.stringify(r.odo)})`);
  ok(r.anims.length === 0, `nothing animates (${JSON.stringify(r.anims)})`);
  mkdirSync(SHOTS, { recursive: true });
  await panel(p).screenshot({ path: `${SHOTS}/logged-reduced-motion.png` });
  await q(p, "undo").click(); await p.waitForTimeout(1500);
  await discard(p);
  await c.close();
});

test("V22-5 — keyboard only, open → logged with a note added, edited and deleted; rings; nothing under 12px; nothing moves on hover", async () => {
  test.setTimeout(300_000);
  const p = page;
  /* the not-sent screen, for the side-by-side sheet (screen 09) */
  await open(p);
  await agent(p, "laq2-hv", "Harriet");
  await q(p, "not-sent").click();
  await q(p, "not-sent-task").waitFor({ state: "visible", timeout: 10_000 });
  await shot(p, "not-sent@100");
  await q(p, "not-sent-done").click();
  await R(p).waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});
  execSync("node tests/e2e/seedLaq2.mjs --clean && node tests/e2e/seedLaq2.mjs && node tests/e2e/seedLaq21.mjs", { stdio: "ignore" });

  await open(p);
  const noRing: string[] = [];
  const tabTo = async (sel: string, back = false) => {
    for (let i = 0; i < 40; i++) {
      await p.keyboard.press(back ? "Shift+Tab" : "Tab");
      const r = await p.evaluate((s) => {
        const a = document.activeElement as HTMLElement | null;
        if (!a || !a.closest('[data-qls="root"]')) return { hit: false, ring: true, name: "" };
        const cs = getComputedStyle(a);
        const ring = (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== "none";
        return { hit: a.matches(s), ring, name: `${a.tagName.toLowerCase()}[${a.getAttribute("data-qls") ?? a.getAttribute("data-qc158") ?? a.className}]` };
      }, sel);
      if (!r.ring && r.name) noRing.push(r.name);
      if (r.hit) return true;
    }
    return false;
  };
  const small = () => R(p).evaluate((root) => [...root.querySelectorAll<HTMLElement>("*")].filter((e) => {
    if (!e.offsetParent && getComputedStyle(e).position !== "fixed") return false;
    const own = [...e.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? "").trim());
    return own && parseFloat(getComputedStyle(e).fontSize) < 12 && !e.closest('[aria-hidden="true"]');
  }).map((e) => `${e.tagName.toLowerCase()}.${e.className}:${getComputedStyle(e).fontSize}:${(e.textContent ?? "").trim().slice(0, 20)}`));
  await q(p, "find").focus();
  await p.keyboard.type("Harriet"); await p.waitForTimeout(400);
  await p.keyboard.press("Enter");
  await expect(R(p)).toHaveAttribute("data-step", "when");
  ok(await tabTo('[data-qls="when-opt"][data-k="today"]'), "Tab reaches Today"); await p.keyboard.press("Enter");
  ok(await tabTo('[data-qls="use-ask"]'), "Tab reaches I sent what Harriet asks for"); await p.keyboard.press("Enter");
  await expect(R(p)).toHaveAttribute("data-step", "how");
  ok(await tabTo('[data-qls="how-opt"]'), "Tab reaches How"); await p.keyboard.press("Enter");
  ok(await tabTo('[data-qls="nudge-continue"]'), "Tab reaches Continue"); await p.keyboard.press("Enter");
  await expect(R(p)).toHaveAttribute("data-step", "check");
  /* add two notes, edit the first, delete the second — keys only */
  for (const words of ["First, by keyboard.", "Second, to delete."]) {
    ok(await tabTo('[data-qls="add-note"]'), "Tab reaches Add a note"); await p.keyboard.press("Enter");
    await p.waitForTimeout(200);
    ok(await p.evaluate(() => document.activeElement?.getAttribute("data-qc158") === "field"), "the field has the caret");
    await p.keyboard.type(words);
    await p.keyboard.press("Control+Enter"); await p.waitForTimeout(250);
  }
  const notes = NB(p).locator("[data-qc158='note']");
  ok((await notes.count()) === 2, "two notes by keyboard");
  await p.locator('[data-qls="body"] h2.laq-qh').click();
  ok(await tabTo("[data-qc158='note'] [data-act='edit']"), "Tab reaches Edit"); await p.keyboard.press("Enter");
  await p.waitForTimeout(200);
  await p.keyboard.press(process.platform === "darwin" ? "Meta+ArrowDown" : "Control+End"); await p.keyboard.type(" Edited.");
  await p.keyboard.press("Control+Enter"); await p.waitForTimeout(250);
  ok((await notes.first().locator("p").textContent()) === "First, by keyboard. Edited.", "edited by keyboard");
  ok(await tabTo("[data-qc158='note']:nth-child(2) [data-act='delete']"), "Tab reaches the second note's Delete"); await p.keyboard.press("Enter");
  await p.waitForTimeout(250);
  ok((await notes.count()) === 1, "deleted by keyboard");
  const under12 = await small();
  READ.under12 = under12;
  ok(under12.length === 0, `nothing under 12px (${JSON.stringify(under12)})`);
  /* nothing moves on hover, a note's Edit and Delete included */
  const rects = () => R(p).evaluate((root) => [...root.querySelectorAll<HTMLElement>("*")].map((e) => { const r = e.getBoundingClientRect(); return `${e.tagName.toLowerCase()}.${String(e.className).split(" ")[0]}@${Math.round(r.x * 2) / 2},${Math.round(r.y * 2) / 2},${Math.round(r.width * 2) / 2},${Math.round(r.height * 2) / 2}`; }));
  await p.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await p.waitForTimeout(800);
  const moved: string[] = [];
  for (const c of (await R(p).locator('button:visible, [data-qls="went-tile"], [data-qc158="note"]').all()).slice(0, 40)) {
    const name = (await c.getAttribute("data-qls")) ?? (await c.getAttribute("data-act")) ?? (await c.getAttribute("data-qc158")) ?? (await c.getAttribute("data-qc1533")) ?? "?";
    if (name === "tab") continue; /* the materials tile opens its pop-up on hover: a layer over, not a move */
    await p.mouse.move(0, 0); await p.waitForTimeout(160);
    const a = await rects();
    await c.hover().catch(() => {}); await p.waitForTimeout(260);
    const b = await rects();
    await p.mouse.move(0, 0); await p.waitForTimeout(300);
    const after = await rects();
    const hit = a.map((x, i) => (x !== b[i] && x === after[i] ? b[i] : null)).filter((x): x is string => !!x);
    if (hit.length) moved.push(`${name}: ${hit.length} (${hit.slice(0, 3).join(" | ")})`);
  }
  READ.hoverMoves = moved;
  ok(moved.length === 0, `nothing moves on hover (${JSON.stringify(moved)})`);
  await p.locator('[data-qls="body"] h2.laq-qh').click();
  ok(await tabTo('[data-qls="log"]'), "Tab reaches Log query");
  READ.noRing = noRing;
  ok(noRing.length === 0, `a ring on every control met (${JSON.stringify(noRing)})`);
  await p.keyboard.press("Enter");
  await q(p, "yay").waitFor({ state: "visible", timeout: 20_000 }).catch(() => {});
  await p.waitForTimeout(1200);
  const qid = state().queries.find((x) => x.agentId === "laq2-hv")?.id;
  const j = state().journal.filter((x) => x.queryId === qid).map((x) => x.text);
  ok(JSON.stringify(j) === JSON.stringify(["First, by keyboard. Edited."]), `logged by keyboard with the note as edited (${JSON.stringify(j)})`);
  await q(p, "undo").click(); await p.waitForTimeout(1500);
  ok(!state().queries.some((x) => x.agentId === "laq2-hv") && !state().journal.some((x) => x.queryId === qid), "undone, the note with it");
  await discard(p);
});
