/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v18.2 — locks CL182 A1 to D11, on the rendered page at 1512 × 900 and 1280 × 800 with the shell.
 *
 * Each lock was run against the build before the pack (`CL182_BASE=1`, ledger `base-<lock>.json`) and with its named
 * mutation (`CL182_MUTATE=<lock>`, ledger `mut-<lock>.json`) before its green was believed. A page mutation is CSS or
 * script applied in the page; a `src` mutation (named in the report) is a source edit made and undone in the
 * measurement worktree.
 *
 * ⚠️ THE WRITING LOCKS (D2, D5, D6, D8, D9) WORK ON THE BARE FIXTURE `clv181-bare` (seedCl181.mjs) and put the account
 *    back: through the drawer's own Undo where the lock is about Undo, and by re-seeding the fixture after. Every write
 *    is read back from the document.
 * ⚠️ EVERY WORKSPACE PAGE STAYS MOUNTED: every read starts from the visible Contact list.
 */
import { expect, test, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { openContacts16 } from "./cl16Lib";
import { harnessDb } from "./harnessDocs";
import { agentHistory } from "../../src/lib/agentHistory";
import type { Activity, Agent, Query } from "../../src/types";

const DIR = "reports/contact-list-v18-2";
const MUT = process.env.CL182_MUTATE ?? "";
const BASE = process.env.CL182_BASE === "1";
const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
const BARE = "clv181-bare";
const near = (a: unknown, b: number, t: number) => typeof a === "number" && Number.isFinite(a) && Math.abs(a - b) <= t;
const canon = (v: unknown): string => JSON.stringify(v, (_k, x) => (x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, (x as Record<string, unknown>)[k]])) : x));
const diffKeys = (a: Record<string, unknown> | null, b: Record<string, unknown> | null) => [...new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})])].filter((k) => canon((a ?? {})[k]) !== canon((b ?? {})[k]));
const reseed = () => execSync("node tests/e2e/seedCl181.mjs", { encoding: "utf8" });
const flags = (args = "") => execSync(`node tests/e2e/hkFlags.mjs ${args}`, { encoding: "utf8" });

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ lock: this.name, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${BASE ? "base-" : ""}${MUT ? "mut-" : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 30)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/** one named break per lock, in the page. Locks absent here are broken in `src` (the report names each). */
const MUTATIONS: Record<string, { css?: string; js?: string }> = {
  A1: { css: `.cl17-hd .cl17-tr > .cl182-ill { height: 160px !important; }` },
  A2: { css: `.cl17-hd .cl17-card:hover, .cl17-hd .cl17-card:focus-within { z-index: 1 !important; }` },
  A3: { css: `.cl17-hd .cl18-tabs, .ws-app.sheet-wide .cl17-hd .cl18-tabs { height: auto !important; }` },
  A4: { css: `.cl17-card .cl17-hl .cl17-ht b { white-space: normal !important; }` },
  B1: { css: `[data-apc="band"][data-kind="you"] { background: #a2452a !important; } [data-apc="band"][data-kind="querying"] { background: #2d3a50 !important; } [data-apc="band"][data-kind="none"] { background: #5e7189 !important; } [data-apc="band"][data-kind="closed"] { background: #a9a39c !important; }` },
  B2: { css: `.apn .apn-slip[data-kind="notq"] { background: #f4f0eb !important; border: 0 !important; }` },
  B3: { js: `(() => { const fix = () => { const l = document.querySelector('[data-ap-h="list"]'); if (!l || l.dataset.rev) return; l.dataset.rev = "1"; const es = [...l.querySelectorAll(':scope > [data-ap-h="entry"]')]; for (const e of es.reverse()) l.appendChild(e); }; new MutationObserver(fix).observe(document.body, { subtree: true, childList: true }); fix(); })()` },
  C1: { js: `(() => { const fix = () => { for (const b of document.querySelectorAll('button[data-hk8="tile"]')) { const d = document.createElement("div"); for (const a of b.attributes) d.setAttribute(a.name, a.value); d.innerHTML = b.innerHTML; b.replaceWith(d); } }; new MutationObserver(fix).observe(document.body, { subtree: true, childList: true }); fix(); })()` },
  C2: { css: `.hk8-head.hk82 { overflow: hidden !important; }` },
  C3: { css: `.hk82-intro .hk82-iacts { position: static !important; }` },
  C5: { js: `(() => { const fix = () => { const f = document.querySelector('.cl18-lt input'); if (f && !f.parentElement.querySelector('kbd')) { const k = document.createElement("kbd"); k.textContent = "/"; f.after(k); } }; new MutationObserver(fix).observe(document.body, { subtree: true, childList: true }); fix(); })()` },
  D4: { js: `(() => { new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n.dataset && n.dataset.hk8 === "fly" && !n.dataset.twin) { const c = n.cloneNode(true); c.dataset.twin = "1"; c.style.transform = n.style.transform; c.style.opacity = "1"; c.style.transform = getComputedStyle(n).transform; document.body.appendChild(c); setTimeout(() => c.remove(), 1300); } }).observe(document.body, { childList: true }); })()` },
  D7: { js: `(() => { const fix = () => { const c = document.querySelector('[data-hk8="card"]'); if (c && !c.querySelector('[data-hk8="website"]')) { const a = document.createElement("a"); a.dataset.hk8 = "website"; a.textContent = "Open their website ↗"; a.href = "https://example.com"; c.querySelector('.hk8-why')?.after(a); } }; new MutationObserver(fix).observe(document.body, { subtree: true, childList: true }); fix(); })()` },
};
const mutate = async (page: Page, lock: string) => {
  const m = MUT === lock ? MUTATIONS[lock] : null;
  if (!m) return;
  if (m.css) await page.addStyleTag({ content: m.css });
  if (m.js) await page.evaluate(m.js);
  await page.waitForTimeout(200);
};
const open = async (page: Page, vp: { width: number; height: number }, lock: string) => {
  await openContacts16(page, vp);
  await mutate(page, lock);
};

/* ───────────────────────── helpers ───────────────────────── */
const openAgent = async (page: Page, id: string) => {
  const row = page.locator(`.aglist [data-agent-card="${id}"]`).filter({ visible: true }).first();
  await row.scrollIntoViewIfNeeded();
  await row.click();
  await expect(page.locator(`[data-ap="panel"][data-ap-id="${id}"]`)).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(500);
};
const closePanel = async (page: Page) => { await page.keyboard.press("Escape"); await page.waitForTimeout(600); };
/** opens Housekeeping on home (passing the intro and the ways card if they show) */
const openHome = async (page: Page) => {
  await page.keyboard.press("h"); await page.waitForTimeout(1000);
  if (await page.locator('[data-hk8="intro-start"]').count()) { await page.locator('[data-hk8="intro-start"]').click(); await page.waitForTimeout(600); }
  if (await page.locator('[data-hk8="ways-all"]').count()) { await page.locator('[data-hk8="ways-all"]').click(); await page.waitForTimeout(600); }
};
/** focus on one task by key, through its ledger row (By missing detail) */
const focusKey = async (page: Page, key: string) => {
  await openHome(page);
  if (await page.locator('[data-hkv="view"][data-v="detail"]').count()) await page.locator('[data-hkv="view"][data-v="detail"]').click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(300);
  await page.locator(`[data-hk8="ledger-row"][data-key="${key}"]`).first().click({ timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(800);
};
const shot = async (page: Page, name: string) => {
  if (process.env.CL182_SHOTS !== "1") return;
  mkdirSync(`${DIR}/shots`, { recursive: true });
  await page.screenshot({ path: `${DIR}/shots/${name}.png` });
};
const agentDoc = async (id: string) => { const { db, uid } = await harnessDb(); return (await getDoc(doc(db, "users", uid, "agents", id))).data() ?? null; };

/* ───────────────────────── A · the page header ───────────────────────── */
test("A1 · archivist: as tall as the title block, 14 from the sheet, the text 28 past it, clear of strip and card, hidden at 1024", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("A1");
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await open(page, vp, "A1");
    await shot(page, `01-header-${vp.width}`);
    const r = await page.evaluate(() => {
      const hd = [...document.querySelectorAll<HTMLElement>(".cl17-hd")].find((e) => e.getBoundingClientRect().height > 0);
      const b = (s: string) => { const e = hd?.querySelector(s); return e ? e.getBoundingClientRect() : null; };
      const sheet = [...document.querySelectorAll<HTMLElement>(".ws-window")].find((e) => e.getBoundingClientRect().height > 0)!.getBoundingClientRect();
      const ill = b(".cl182-ill"), ey = b(".cl17-ey"), acts = b(".cl17-acts"), tb = b(".cl17-tb"), tabs = b(".cl18-tabs"), card = b(".cl17-card");
      const hit = (a: DOMRect | null, c: DOMRect | null) => !!a && !!c && a.left < c.right - 0.5 && c.left < a.right - 0.5 && a.top < c.bottom - 0.5 && c.top < a.bottom - 0.5;
      return { ill: ill && [ill.left, ill.top, ill.width, ill.height, ill.right], sheetL: sheet.left, ey: ey && ey.top, actsB: acts && acts.bottom, tbL: tb && tb.left, overTabs: hit(ill, tabs), overCard: hit(ill, card), tbCard: hit(tb, card) };
    });
    L.check(`${w} the archivist renders`, !!r.ill && r.ill[3] > 0, JSON.stringify(r.ill));
    if (r.ill && r.ey != null && r.actsB != null) {
      const h = r.actsB - r.ey;
      L.check(`${w} its height is the title block's (eyebrow top to button bottom) ±1`, near(r.ill[3], h, 1), `${r.ill[3].toFixed(1)} vs ${h.toFixed(1)}`);
      L.check(`${w} its top is the eyebrow's ±1`, near(r.ill[1], r.ey, 1), `${r.ill[1].toFixed(1)} vs ${r.ey.toFixed(1)}`);
      L.check(`${w} its width follows 1.123 (±2)`, near(r.ill[2], r.ill[3] * 1.123, 2), `${r.ill[2].toFixed(1)}`);
      L.check(`${w} its left is 14 from the sheet's left ±1`, near(r.ill[0] - r.sheetL, 14, 1), `${(r.ill[0] - r.sheetL).toFixed(1)}`);
      L.check(`${w} the title block starts at its right + 28 ±1`, r.tbL != null && near(r.tbL - r.ill[4], 28, 1), `${r.tbL != null ? (r.tbL - r.ill[4]).toFixed(1) : "?"}`);
    }
    L.check(`${w} no overlap with the letter strip`, !r.overTabs, `${r.overTabs}`);
    L.check(`${w} no overlap with the List health card`, !r.overCard, `${r.overCard}`);
    L.check(`${w} the title block clears the card`, !r.tbCard, `${r.tbCard}`);
  }
  await open(page, { width: 1024, height: 768 }, "A1");
  await shot(page, "x-header-1024");
  const hidden = await page.evaluate(() => { const i = [...document.querySelectorAll<HTMLElement>(".cl182-ill")].find((e) => e.closest(".cl17-hd")!.getBoundingClientRect().height > 0); return !i || getComputedStyle(i).display === "none" || i.getBoundingClientRect().width === 0; });
  L.check("@1024 the archivist is hidden", hidden, `${hidden}`);
  L.done(17);
});

test("A2 · shadow: over the card at .1, above it at rest; the card comes forward and lifts 3px on hover", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("A2");
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await open(page, vp, "A2");
    const read = () => page.evaluate(() => {
      const hd = [...document.querySelectorAll<HTMLElement>(".cl17-hd")].find((e) => e.getBoundingClientRect().height > 0)!;
      const sh = hd.querySelector<HTMLElement>(".cl17-shadow")!, card = hd.querySelector<HTMLElement>(".cl17-card")!;
      const a = sh.getBoundingClientRect(), c = card.getBoundingClientRect();
      const z = (e: Element) => Number(getComputedStyle(e).zIndex) || 0;
      return { overlap: a.left < c.right && c.left < a.right && a.top < c.bottom && c.top < a.bottom, op: getComputedStyle(sh).opacity, zs: z(sh), zc: z(card), tf: getComputedStyle(card).transform };
    });
    const r0 = await read();
    L.check(`${w} the shadow's box overlaps the card's`, r0.overlap, `${r0.overlap}`);
    L.check(`${w} its opacity is .1`, r0.op === "0.1", r0.op);
    L.check(`${w} at rest the card is below the shadow`, r0.zc < r0.zs, `card ${r0.zc} · shadow ${r0.zs}`);
    await page.addStyleTag({ content: `.cl17-hd .cl17-card { transition: none !important; }` });
    const card = page.locator(".cl17-hd .cl17-card").filter({ visible: true }).first();
    await card.hover(); await page.waitForTimeout(300);
    const r1 = await read();
    L.check(`${w} on hover the card is above the shadow`, r1.zc > r1.zs, `card ${r1.zc} · shadow ${r1.zs}`);
    L.check(`${w} on hover it lifts 3px`, r1.tf === "matrix(1, 0, 0, 1, 0, -3)", r1.tf);
    await page.mouse.move(5, 5); await page.waitForTimeout(200);
  }
  L.done(10);
});

test("A3 · tabs: a hovered tab rises inside the strip; nothing below moves", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("A3");
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await open(page, vp, "A3");
    await page.addStyleTag({ content: `.cl18-tabs button { transition: none !important; }` });
    const read = () => page.evaluate(() => {
      const hd = [...document.querySelectorAll<HTMLElement>(".cl17-hd")].find((e) => e.getBoundingClientRect().height > 0)!;
      const strip = hd.querySelector<HTMLElement>(".cl18-tabs")!;
      const below = [hd.querySelector(".cl17-ey"), hd.querySelector(".cl17-card"), hd.querySelector(".cl17-acts"), document.querySelector(".cl18-lh")].filter(Boolean).map((e) => (e as Element).getBoundingClientRect().top);
      return { h: strip.getBoundingClientRect().height, below, wide: !!document.querySelector(".ws-app.sheet-wide") };
    });
    const r0 = await read();
    const btns = page.locator(".cl17-hd .cl18-tabs button:not([disabled]):not([aria-current='true'])").filter({ visible: true });
    const n = await btns.count();
    let moved = 0, worstH = 0, heights: number[] = [];
    for (let i = 0; i < n; i++) {
      await btns.nth(i).hover(); await page.waitForTimeout(60);
      const r = await read();
      if (Math.abs(r.h - r0.h) > 0.01) worstH = Math.max(worstH, Math.abs(r.h - r0.h));
      for (let k = 0; k < r.below.length; k++) if (Math.abs(r.below[k] - r0.below[k]) > 0.01) moved += 1;
      heights.push(await btns.nth(i).evaluate((e) => e.getBoundingClientRect().height));
    }
    L.check(`${w} ${n} enabled tabs hovered`, n >= 10, `${n}`);
    L.check(`${w} the strip's height never changes (0px)`, worstH === 0, `${worstH}`);
    L.check(`${w} nothing below the strip moves (0px)`, moved === 0, `${moved} moves`);
    const want = r0.wide ? 46 : 42;
    L.check(`${w} a hovered tab is ${want} tall`, heights.length > 0 && heights.every((h) => near(h, want, 0.5)), [...new Set(heights.map((h) => h.toFixed(1)))].join(","));
    await page.mouse.move(5, 5);
  }
  L.done(8);
});

test("A4 · label: 'List health' is one line at both widths", async ({ page }) => {
  test.setTimeout(200_000);
  const L = new Ledger("A4");
  for (const vp of SIZES) {
    await open(page, vp, "A4");
    const r = await page.evaluate(() => {
      const b = [...document.querySelectorAll<HTMLElement>('[data-cl17="health-title"]')].find((e) => e.getBoundingClientRect().height > 0)!;
      return { h: b.getBoundingClientRect().height, lh: parseFloat(getComputedStyle(b).lineHeight) || parseFloat(getComputedStyle(b).fontSize) * 1.1, ws: getComputedStyle(b).whiteSpace };
    });
    L.check(`@${vp.width} one line (height under 1.5 line heights)`, r.h < 1.5 * r.lh, `${r.h.toFixed(1)} / ${r.lh.toFixed(1)}`);
    L.check(`@${vp.width} white-space is nowrap`, r.ws === "nowrap", r.ws);
  }
  L.done(4);
});

/* ───────────────────────── B · the agent panel ───────────────────────── */
type Kind = "you" | "waiting" | "notq" | "closed" | "shut";
const findKinds = async (page: Page, want: readonly Kind[]): Promise<Partial<Record<Kind, string>>> => {
  const ids = await page.evaluate(() => {
    const rows = [...document.querySelectorAll<HTMLElement>(".aglist [data-clv='row'][data-agent-card]")].filter((e) => e.getBoundingClientRect().height > 0);
    const by = (d: string) => rows.filter((e) => e.dataset.disc === d).map((e) => e.getAttribute("data-agent-card") ?? "");
    return [...by("live"), ...by("closed"), ...by("none")];
  });
  const out: Partial<Record<Kind, string>> = {};
  for (const id of ids) {
    if (want.every((k) => out[k])) break;
    await openAgent(page, id);
    const k = (await page.locator('[data-ap="card"]').getAttribute("data-slip").catch(() => null)) as Kind | null;
    if (k && !out[k]) out[k] = id;
    await closePanel(page);
  }
  return out;
};

test("B1 · band: always the list header's slate, in every state and on the intro's framed card", async ({ page }) => {
  test.setTimeout(420_000);
  const L = new Ledger("B1");
  await open(page, SIZES[0], "B1");
  const kinds = await findKinds(page, ["you", "waiting", "notq", "closed", "shut"]);
  for (const k of ["you", "waiting", "notq", "closed", "shut"] as const) {
    const id = kinds[k];
    L.check(`a ${k} agent is on the account`, !!id, `${id}`);
    if (!id) continue;
    await openAgent(page, id);
    const bg = await page.locator('[data-ap="card"] [data-apc="band"]').evaluate((e) => getComputedStyle(e).backgroundColor);
    L.check(`${k}: the band is rgb(62, 81, 112)`, bg === "rgb(62, 81, 112)", bg);
    await closePanel(page);
  }
  flags("--clear");
  await page.reload(); await page.waitForTimeout(2500); await mutate(page, "B1");
  await page.keyboard.press("h"); await page.waitForTimeout(1200);
  const framed = await page.locator('[data-hk8="intro"] .apc--framed [data-apc="band"]').evaluate((e) => getComputedStyle(e).backgroundColor).catch(() => null);
  L.check("the intro's framed card's band is rgb(62, 81, 112)", framed === "rgb(62, 81, 112)", `${framed}`);
  await page.locator('[data-hk8="not-now"]').click({ timeout: 4000 }).catch(() => {});
  L.done(11);
});

test("B2 · slip: the state's colours (waiting navy and cream, your move blush, closed grey, not queried dotted)", async ({ page }) => {
  test.setTimeout(420_000);
  const L = new Ledger("B2");
  await open(page, SIZES[0], "B2");
  const kinds = await findKinds(page, ["you", "waiting", "notq", "closed", "shut"]);
  const WANT: Record<Kind, string> = { waiting: "rgb(45, 58, 80)", you: "rgb(251, 238, 232)", closed: "rgb(233, 229, 224)", shut: "rgb(233, 229, 224)", notq: "rgba(0, 0, 0, 0)" };
  for (const k of ["you", "waiting", "notq", "closed", "shut"] as const) {
    const id = kinds[k];
    L.check(`a ${k} agent is on the account`, !!id, `${id}`);
    if (!id) continue;
    await openAgent(page, id);
    await shot(page, `0${k === "waiting" ? 5 : k === "you" ? 6 : k === "notq" ? 7 : 8}-panel-${k}-1512`);
    const r = await page.locator('[data-ap="slip"]').evaluate((e) => {
      const cs = getComputedStyle(e);
      return { bg: cs.backgroundColor, bs: cs.borderTopStyle, bw: cs.borderTopWidth, sh: cs.boxShadow, head: getComputedStyle(e.querySelector('[data-ap="slip-heading"]')!).color };
    });
    L.check(`${k}: the slip is ${WANT[k]}`, r.bg === WANT[k], r.bg);
    if (k === "waiting") L.check("waiting: the headline is cream", r.head === "rgb(244, 238, 229)", r.head);
    /* the 1.5px border is snapped to whole device pixels by the browser at this pixel ratio (1px at DPR 1) */
    if (k === "notq") L.check("not queried: a 1.5px dotted border (device-snapped) and no shadow", r.bs === "dotted" && (r.bw === "1.5px" || r.bw === "1px") && r.sh === "none", `${r.bs} ${r.bw} ${r.sh}`);
    await closePanel(page);
  }
  L.done(12);
});

test("B3 · history: 'History' with no chip; stored events newest first; month dividers; Next only for your move or waiting", async ({ page }) => {
  test.setTimeout(480_000);
  const L = new Ledger("B3");
  await open(page, SIZES[0], "B3");
  const kinds = await findKinds(page, ["you", "waiting", "notq", "closed"]);
  const { db, uid } = await harnessDb();
  const acts = (await getDocs(collection(db, "users", uid, "activities"))).docs.map((d) => d.data() as Activity);
  const mss = new Map((await getDocs(collection(db, "users", uid, "manuscripts"))).docs.map((d) => [d.id, String(d.data().title ?? "")]));
  for (const k of ["you", "waiting", "notq", "closed"] as const) {
    const id = kinds[k];
    if (!id) { L.check(`a ${k} agent is on the account`, false, "none"); continue; }
    await openAgent(page, id);
    const tab = page.locator('[data-ap="card"] [data-ap-tab="queries"]');
    const label = (await tab.textContent())?.trim();
    L.check(`${k}: the tab reads "History", with no chip`, label === "History" && (await tab.locator(".apn-tabn").count()) === 0, `${label}`);
    await tab.click(); await page.waitForTimeout(500);
    await shot(page, `09-history-${k}-1512`);
    const agent = { id, ...(await agentDoc(id)) } as Agent;
    const queries = (await getDocs(query(collection(db, "users", uid, "queries"), where("agentId", "==", id)))).docs.map((d) => ({ id: d.id, ...d.data() }) as Query);
    const notes = (await getDocs(collection(db, "users", uid, "agents", id, "notes"))).docs.map((d) => ({ id: d.id, text: String(d.data().text ?? ""), createdAt: String(d.data().createdAt ?? "") }));
    const nowMs = await page.evaluate(() => Date.now());
    const want = agentHistory({ agent, queries, activities: acts, notes, titleOf: (m) => mss.get(m) || null, nowMs });
    const r = await page.evaluate(() => {
      const l = document.querySelector('[data-ap="history"] [data-ap-h="list"]');
      const kids = l ? [...l.children] as HTMLElement[] : [];
      return {
        seq: kids.map((e) => e.dataset.apH === "month" ? `M:${e.textContent?.trim()}` : e.dataset.apH === "next" ? "NEXT" : `E:${e.querySelector('[data-ap-h="title"]')?.textContent?.trim()}|${e.dataset.dir}|${e.dataset.ms}`),
        empty: !!document.querySelector('[data-ap-h="empty"]'), nextT: document.querySelector('[data-ap-h="next-title"]')?.textContent?.trim() ?? null,
        slipH: null as string | null,
      };
    });
    const got = r.seq.filter((s) => s.startsWith("E:")).map((s) => s.slice(2));
    const exp = want.map((e) => `${e.title}|${e.dir}|${e.ms}`);
    L.check(`${k}: the entries are the stored events, newest first (${exp.length})`, canon(got) === canon(exp), `${got.length} vs ${exp.length}${got[0] !== exp[0] ? ` · first "${got[0]}" vs "${exp[0]}"` : ""}`);
    const ms = got.map((s) => Number(s.split("|").pop()));
    L.check(`${k}: newest first`, ms.every((m, i) => i === 0 || ms[i - 1] >= m), ms.slice(0, 4).join(","));
    let months = 0, ok = true, prev = "";
    for (const s of r.seq) { if (s.startsWith("M:")) { months++; prev = "M"; } else if (s.startsWith("E:")) { if (prev === "") ok = false; prev = "E"; } }
    const distinct = new Set(ms.map((m) => { const d = new Date(m); return `${d.getFullYear()}-${d.getMonth()}`; })).size;
    L.check(`${k}: one divider per month change (${distinct})`, ok && months === distinct, `${months} dividers`);
    const nextFirst = r.seq[0] === "NEXT";
    if (k === "you" || k === "waiting") {
      L.check(`${k}: Next leads`, nextFirst, r.seq[0] ?? "");
      await page.locator('[data-ap="card"] [data-ap-tab="profile"]').click(); await page.waitForTimeout(300);
      const head = (await page.locator('[data-ap="slip-heading"]').textContent())?.trim();
      L.check(`${k}: Next's words are the stand's ("${head}")`, r.nextT === head, `${r.nextT}`);
    } else L.check(`${k}: no Next`, !nextFirst, r.seq[0] ?? "");
    if (queries.length === 0) L.check(`${k}: the empty line shows`, r.empty, `${r.empty}`);
    const dirOk = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-ap="history"] [data-ap-h="entry"]')].every((e) => {
      const lab = e.querySelector('[data-ap-h="dir"]')?.textContent ?? "";
      return e.dataset.dir === "in" ? /→ You$/.test(lab) : e.dataset.dir === "out" ? /^You →/.test(lab) : lab === "";
    }));
    L.check(`${k}: each entry's direction label matches its source`, dirOk, `${dirOk}`);
    await closePanel(page);
  }
  L.done(20);
});

/* ───────────────────────── C · Housekeeping's frame ───────────────────────── */
test("C1 · header: ink, the ring spans the rows, three tile buttons that never truncate; points opens the key, gaps scrolls All gaps", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("C1");
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await open(page, vp, "C1");
    await openHome(page);
    await shot(page, `16-hk-home-${vp.width}`);
    const r = await page.evaluate(() => {
      const h = document.querySelector<HTMLElement>('[data-hk8="head"]')!;
      const ring = h.querySelector('[data-hk8="ring"]')!.getBoundingClientRect(), tr = h.querySelector('[data-hk8="title-row"]')!.getBoundingClientRect(), bar = h.querySelector('[data-hk8="bar"]')?.getBoundingClientRect();
      const tiles = [...h.querySelectorAll<HTMLElement>('[data-hk8="tile"]')];
      const trunc = tiles.filter((t) => { const s = t.querySelector("small"); if (!s) return true; const b = t.getBoundingClientRect(), x = s.getBoundingClientRect(); return x.right > b.right - 1 || s.scrollWidth > s.clientWidth + 0.5 || t.scrollWidth > t.clientWidth + 0.5; }).length;
      return { bg: getComputedStyle(h).backgroundColor, ringH: ring.height, span: bar ? bar.bottom - tr.top : -1, tags: tiles.map((t) => t.tagName), trunc };
    });
    L.check(`${w} the header is rgb(42, 58, 82)`, r.bg === "rgb(42, 58, 82)", r.bg);
    L.check(`${w} the ring's height ≥ the bar's bottom − row 1's top`, r.span > 0 && r.ringH >= r.span - 0.5, `${r.ringH.toFixed(1)} vs ${r.span.toFixed(1)}`);
    L.check(`${w} three tiles, each a button`, r.tags.length === 3 && r.tags.every((t) => t === "BUTTON"), r.tags.join(","));
    L.check(`${w} no tile label is cut`, r.trunc === 0, `${r.trunc}`);
    await page.locator('[data-hk8="tile"][data-k="points"]').click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(400);
    L.check(`${w} the points tile opens the key`, (await page.locator('[data-hk8="how-pop"]').count()) === 1, `${await page.locator('[data-hk8="how-pop"]').count()}`);
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    await page.locator('[data-hk8="tile"][data-k="gaps"]').click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(1200);
    const g = await page.evaluate(() => { const a = document.querySelector('[data-hk8="all-head"]')?.getBoundingClientRect(); const body = document.querySelector('.hdr[data-hdr="housekeeping"] .hdr-body')?.getBoundingClientRect(); return a && body ? [a.top, body.top, body.bottom] : null; });
    L.check(`${w} the gaps tile brings All gaps into view`, !!g && g[0] >= g[1] - 1 && g[0] < g[2], JSON.stringify(g));
    await page.keyboard.press("Escape"); await page.waitForTimeout(500);
  }
  L.done(12);
});

test("C2 · key: in the viewport, unclipped; closes on a click outside and on Escape, the drawer still open", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("C2");
  await open(page, { width: 1280, height: 800 }, "C2");
  await openHome(page);
  /* RE-POINTED (v18.3 §A): "How points work" is gone; the points tile opens the key */
  await page.locator('[data-hk8="tile"][data-k="points"]').click(); await page.waitForTimeout(400);
  await shot(page, "17-hk-points-key-1280x800");
  const r = await page.evaluate(() => {
    const p = document.querySelector('[data-hk8="how-pop"]'); if (!p) return null;
    const b = p.getBoundingClientRect(); const at = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
    const rowAt = document.elementFromPoint(b.left + b.width / 2, b.bottom - 12);
    return { box: [b.left, b.top, b.right, b.bottom], vw: innerWidth, vh: innerHeight, centre: !!at && p.contains(at), foot: !!rowAt && p.contains(rowAt) };
  });
  L.check("the key opens", !!r, `${!!r}`);
  if (r) {
    L.check("inside the viewport", r.box[0] >= 0 && r.box[1] >= 0 && r.box[2] <= r.vw && r.box[3] <= r.vh, r.box.map((n) => n.toFixed(0)).join(","));
    L.check("its centre is the key (unclipped)", r.centre, `${r.centre}`);
    L.check("its foot is the key (unclipped)", r.foot, `${r.foot}`);
  }
  /* outside the key but inside the drawer (a click outside the drawer closes the drawer, which is not this lock) */
  const inDrawer = await page.evaluate(() => { const b = document.querySelector('.hdr[data-hdr="housekeeping"] .hdr-body')!.getBoundingClientRect(); return [b.left + 24, b.bottom - 40]; });
  await page.mouse.click(inDrawer[0], inDrawer[1]); await page.waitForTimeout(400);
  L.check("an outside click closes it", (await page.locator('[data-hk8="how-pop"]').count()) === 0, "closed");
  L.check("…and the drawer stays open", (await page.locator('[data-hk8="home"]').count()) === 1, "open");
  await page.locator('[data-hk8="tile"][data-k="points"]').click(); await page.waitForTimeout(300);
  await page.keyboard.press("Escape"); await page.waitForTimeout(400);
  L.check("Escape closes it", (await page.locator('[data-hk8="how-pop"]').count()) === 0, "closed");
  L.check("…and the drawer stays open", (await page.locator('[data-hk8="home"]').count()) === 1, "open");
  L.done(8);
});

test("C3 · intro: 'Get started →' in view at 1280 × 720, unscrolled; no tiles or bar; each headline line one line", async ({ page }) => {
  test.setTimeout(200_000);
  const L = new Ledger("C3");
  flags("--clear");
  await open(page, { width: 1280, height: 720 }, "C3");
  await page.keyboard.press("h"); await page.waitForTimeout(1200);
  await shot(page, "12-hk-intro-1280x720");
  const r = await page.evaluate(() => {
    const b = document.querySelector('[data-hk8="intro-start"]')?.getBoundingClientRect();
    const body = document.querySelector('.hdr[data-hdr="housekeeping"] .hdr-body') as HTMLElement | null;
    const lines = [...document.querySelectorAll<HTMLElement>('[data-hk8="intro-line"]')].map((e) => [e.getBoundingClientRect().height, parseFloat(getComputedStyle(e).lineHeight)]);
    return { b: b ? [b.top, b.bottom] : null, vh: innerHeight, st: body?.scrollTop ?? -1, text: document.querySelector('[data-hk8="intro-start"]')?.textContent?.trim(), tiles: document.querySelectorAll('[data-hk8="tile"]').length, bar: document.querySelectorAll('[data-hk8="bar"]').length, lines };
  });
  L.check("the button reads 'Get started →'", r.text === "Get started →", `${r.text}`);
  L.check("it is fully in the viewport with the drawer unscrolled", !!r.b && r.st === 0 && r.b[0] >= 0 && r.b[1] <= r.vh, `${JSON.stringify(r.b)} st ${r.st}`);
  L.check("no tiles while the intro shows", r.tiles === 0, `${r.tiles}`);
  L.check("no bar while the intro shows", r.bar === 0, `${r.bar}`);
  L.check("two headline lines, each one line", r.lines.length === 2 && r.lines.every(([h, lh]) => h < 1.5 * lh), JSON.stringify(r.lines));
  await page.locator('[data-hk8="not-now"]').click({ timeout: 4000 }).catch(() => {});
  L.done(5);
});

test("C4 · ways: alone in home after 'Get started', each row lands, 'Just show me everything', not on a second open", async ({ page }) => {
  test.setTimeout(400_000);
  const L = new Ledger("C4");
  const kids = () => page.evaluate(() => { const h = document.querySelector('[data-hk8="home"]'); return h ? [...h.children].filter((e) => getComputedStyle(e).display !== "none").map((e) => (e as HTMLElement).dataset.hk8 ?? e.className) : []; });
  const start = async () => {
    flags("--clear");
    await page.reload(); await page.waitForTimeout(2500); await mutate(page, "C4");
    await page.keyboard.press("h"); await page.waitForTimeout(1200);
    await page.locator('[data-hk8="intro-start"]').click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(700);
  };
  await open(page, SIZES[0], "C4");
  await start();
  await shot(page, "14-hk-ways-1512");
  const k0 = await kids();
  L.check("after Get started, home's only child is the ways card", k0.length === 1 && k0[0] === "ways", k0.join(","));
  await page.locator('[data-hk8="way"][data-w="run"]').click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(700);
  L.check("One at a time lands in Focus", (await page.locator('[data-hk8="focus"]').count()) === 1, "focus");
  const first = await page.locator('[data-hk8="card"]').getAttribute("data-key").catch(() => null);
  await page.keyboard.press("Escape"); await page.waitForTimeout(600);
  await start();
  await page.locator('[data-hk8="way"][data-w="detail"]').click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(1200);
  const d = await page.evaluate(() => ({ view: (document.querySelector('[data-hk8="all"]') as HTMLElement | null)?.dataset.view, inView: (() => { const a = document.querySelector('[data-hk8="all-head"]')?.getBoundingClientRect(); const b = document.querySelector('.hdr[data-hdr="housekeeping"] .hdr-body')?.getBoundingClientRect(); return !!a && !!b && a.top >= b.top - 1 && a.top < b.bottom; })() }));
  L.check("By missing detail: All gaps by detail, in view", d.view === "detail" && d.inView, JSON.stringify(d));
  await page.keyboard.press("Escape"); await page.waitForTimeout(600);
  await start();
  await page.locator('[data-hk8="way"][data-w="agent"]').click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(1200);
  const a = await page.evaluate(() => ({ view: (document.querySelector('[data-hk8="all"]') as HTMLElement | null)?.dataset.view, inView: (() => { const x = document.querySelector('[data-hk8="all-head"]')?.getBoundingClientRect(); const b = document.querySelector('.hdr[data-hdr="housekeeping"] .hdr-body')?.getBoundingClientRect(); return !!x && !!b && x.top >= b.top - 1 && x.top < b.bottom; })() }));
  L.check("By agent: All gaps by agent, in view", a.view === "agent" && a.inView, JSON.stringify(a));
  await page.locator('[data-hkv="view"][data-v="detail"]').click({ timeout: 4000 }).catch(() => {});
  await page.keyboard.press("Escape"); await page.waitForTimeout(600);
  await start();
  await page.locator('[data-hk8="ways-all"]').click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(700);
  const k1 = await kids();
  L.check("'Just show me everything' shows Up next and All gaps", k1.includes("up-next") && k1.includes("all") && !k1.includes("ways"), k1.join(","));
  await page.keyboard.press("Escape"); await page.waitForTimeout(600);
  await page.keyboard.press("h"); await page.waitForTimeout(1200);
  L.check("a second open shows no ways card", (await page.locator('[data-hk8="ways"]').count()) === 0, `${await page.locator('[data-hk8="ways"]').count()}`);
  L.check("…and lands on home", (await page.locator('[data-hk8="up-next"]').count()) === 1, "home");
  L.check("the run's first card was the queue's first", !!first, `${first}`);
  await page.keyboard.press("Escape");
  L.done(8);
});

test("C5 · no keycaps on /agents or in the drawer; the shell's ⌘K stays; / and H still work", async ({ page }) => {
  test.setTimeout(200_000);
  const L = new Ledger("C5");
  await open(page, SIZES[0], "C5");
  const sweep = () => page.evaluate(() => {
    const root = [...document.querySelectorAll<HTMLElement>(".clv-group")].find((e) => e.getBoundingClientRect().height > 0);
    const scopes = [root, document.querySelector(".hdr[data-hdr='housekeeping']"), document.querySelector('[data-ft="housekeeping"], [data-ftab="housekeeping"]')].filter(Boolean) as Element[];
    const kbds = scopes.flatMap((s) => [...s.querySelectorAll("kbd")]).filter((k) => (k as HTMLElement).getBoundingClientRect().width > 0 || getComputedStyle(k).display !== "none");
    const tabTxt = [...document.querySelectorAll("[data-hkv='tab-counts']")].map((e) => e.closest("button,div")?.textContent ?? "").join(" ");
    return { kbds: kbds.map((k) => k.textContent), tab: tabTxt, shell: [...document.querySelectorAll(".ws-pagebar kbd, .ws-pagebar .sp-kbd, .ws-pagebar [class*='kbd']")].map((k) => k.textContent) };
  });
  const r0 = await sweep();
  L.check("no keycap on /agents", r0.kbds.length === 0, r0.kbds.join(","));
  L.check("the shell's ⌘K is still present", r0.shell.some((t) => /K/.test(t ?? "")), r0.shell.join(","));
  await page.keyboard.press("/"); await page.waitForTimeout(400);
  const focused = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.closest(".cl18-lt, .cl17-pin") != null && document.activeElement?.tagName === "INPUT");
  L.check("/ still focuses the search", focused, `${focused}`);
  await page.keyboard.press("Escape"); await page.locator("body").click({ position: { x: 5, y: 300 } }).catch(() => {}); await page.waitForTimeout(300);
  await page.keyboard.press("h"); await page.waitForTimeout(1200);
  L.check("H still opens Housekeeping", (await page.locator(".hdr[data-hdr='housekeeping'] [data-hk8='head']").count()) === 1, "open");
  const r1 = await sweep();
  L.check("no keycap in the drawer", r1.kbds.length === 0, r1.kbds.join(","));
  L.check("no 'Press' or keycap hint in the drawer's text", !/\bPress [A-Z/]\b/.test(await page.locator(".hdr[data-hdr='housekeeping']").innerText()), "none");
  await page.keyboard.press("Escape");
  L.done(6);
});

/* ───────────────────────── D · the journey ───────────────────────── */
test("D1 · order: Up next = the queue's first = Start's first card; Coming up, ledgers and By agent groups follow one comparator", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("D1");
  await open(page, SIZES[0], "D1");
  await openHome(page);
  const POINTS: Record<string, number> = { reply: 6, materials: 5, genres: 4, wishlist: 3, reopen: 2 };
  const r = await page.evaluate(() => {
    const up = document.querySelector('[data-hk8="up-next"] [data-hk8="up-start"]');
    const ledgers = [...document.querySelectorAll<HTMLElement>('[data-hk8="detail"]')].map((d) => [...d.querySelectorAll<HTMLElement>('[data-hk8="ledger-row"]')].map((r) => ({ key: r.dataset.key!, live: !!r.querySelector("em"), name: r.querySelector("b")?.textContent?.trim() ?? "" })));
    return { ledgers, upQ: document.querySelector('[data-hk8="up-next"] .hk8-upq b')?.textContent?.trim() };
  });
  const cmp = (x: { key: string; live: boolean; name: string }, y: { key: string; live: boolean; name: string }) =>
    POINTS[y.key.split(":")[1]] - POINTS[x.key.split(":")[1]] || Number(y.live) - Number(x.live) || x.name.toLowerCase().localeCompare(y.name.toLowerCase());
  let ties = 0, ok = true;
  for (const rows of r.ledgers) {
    for (let i = 1; i < rows.length; i++) { const c = cmp(rows[i - 1], rows[i]); if (c > 0) ok = false; if (rows[i - 1].live === rows[i].live) ties++; }
  }
  L.check(`each ledger follows the comparator (${r.ledgers.length} ledgers, ${ties} same-points-same-queried neighbours)`, ok && r.ledgers.length >= 3, `${ok}`);
  L.check("the fixture has ties to order", ties >= 3, `${ties}`);
  /* the queue's first: Start → (whole queue) */
  await page.locator('[data-hk8="fill-all"]').click(); await page.waitForTimeout(700);
  const q0 = await page.locator('[data-hk8="card"]').getAttribute("data-key");
  const coming = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-hk8="coming"] .hk8-li')].map((e) => e.dataset.key!));
  const firstLedger = r.ledgers.find((x) => x.length)?.[0]?.key ?? null;
  L.check("the whole queue's first is the first ledger's first (most points)", q0 === firstLedger, `${q0} vs ${firstLedger}`);
  L.check("Up next's question is the first card's", r.upQ != null && (await page.locator('[data-hk8="question"]').textContent())?.trim() === r.upQ, `${r.upQ}`);
  const all = r.ledgers.flat();
  const order = [...all].sort(cmp).map((x) => x.key);
  const pos = (k: string) => order.indexOf(k);
  L.check("Coming up follows the same order", coming.length >= 3 && coming.every((k, i) => i === 0 || pos(coming[i - 1]) < pos(k)), coming.join(","));
  await page.locator('[data-hk8="back"]').click(); await page.waitForTimeout(500);
  await page.locator('[data-hkv="view"][data-v="agent"]').click(); await page.waitForTimeout(500);
  const g = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-hk8="agent-group"]')].map((grp) => [...grp.querySelectorAll<HTMLElement>('[data-hk8="agent-row"]')].map((r) => [...r.querySelectorAll<HTMLElement>('[data-hk8="gap-chip"]')][0]?.dataset.key ?? "")));
  const gOk = g.every((rows) => rows.every((k, i) => i === 0 || pos(rows[i - 1]) < pos(k)));
  L.check(`each By agent group orders its agents by their first task under the comparator (${g.length} groups)`, g.length >= 1 && gOk, `${gOk}`);
  await page.locator('[data-hkv="view"][data-v="detail"]').click();
  await page.keyboard.press("Escape");
  L.done(6);
});

test("D2 · counter: '2 of k' after Save, unchanged after Skip, '1 of k' after Undo", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("D2");
  reseed();
  await open(page, SIZES[0], "D2");
  await focusKey(page, `${BARE}:wishlist`);
  const c0 = (await page.locator('[data-hk8="counter"]').textContent())?.trim() ?? "";
  const k = c0.split(" of ")[1];
  L.check("the run starts at '1 of k'", /^1 of \d+$/.test(c0) && Number(k) >= 2, c0);
  await page.locator('[data-hk8="wish"]').fill("CL182 D2 probe.");
  await page.locator('[data-hk8="save"]').click(); await page.waitForTimeout(2000);
  const c1 = (await page.locator('[data-hk8="counter"]').textContent())?.trim();
  L.check(`after Save, '2 of ${k}'`, c1 === `2 of ${k}`, `${c1}`);
  await page.locator('[data-hk8="skip"]').click(); await page.waitForTimeout(500);
  const c2 = (await page.locator('[data-hk8="counter"]').textContent())?.trim();
  L.check(`after Skip, still '2 of ${k}'`, c2 === `2 of ${k}`, `${c2}`);
  await page.locator('[data-hkv="undo"]').click(); await page.waitForTimeout(2000);
  const c3 = (await page.locator('[data-hk8="counter"]').textContent())?.trim();
  L.check(`after Undo, '1 of ${k}'`, c3 === `1 of ${k}`, `${c3}`);
  L.check("Undo put the task back at the front", (await page.locator('[data-hk8="card"]').getAttribute("data-key")) === `${BARE}:wishlist`, "front");
  await page.keyboard.press("Escape");
  reseed();
  L.done(5);
});

const figures = (page: Page) => page.evaluate(() => {
  const vis = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0) ?? document.querySelector<HTMLElement>(s);
  const num = (t: string | null | undefined) => { const m = (t ?? "").match(/\d+/); return m ? Number(m[0]) : null; };
  return {
    drawer: num(document.querySelector('[data-hk8="pct"]')?.textContent),
    page: num(vis('[data-cl17="ring-pct"]')?.textContent),
    gapsLine: num(vis('[data-cl17="health-gaps"]')?.textContent),
    /* RE-POINTED (v18.3 §B): the tab is gone; the header's "Fill in the gaps {n}" is the figure's other home */
    fill: num(vis('[data-cl183="fill-n"]')?.textContent),
    drawerGaps: num(document.querySelector('[data-hk8="tile"][data-k="gaps"] b')?.textContent),
  };
});
test("D3 · in step: the drawer, the page ring, its line and the tab show one figure after Save and after Undo", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("D3");
  reseed();
  await open(page, SIZES[0], "D3");
  await focusKey(page, `${BARE}:wishlist`);
  const agree = (f: Awaited<ReturnType<typeof figures>>) => {
    return f.drawer === f.page && f.gapsLine === f.drawerGaps && f.fill === f.drawerGaps;
  };
  const f0 = await figures(page);
  L.check("before: all agree", agree(f0), JSON.stringify(f0));
  await page.locator('[data-hk8="wish"]').fill("CL182 D3 probe.");
  await page.locator('[data-hk8="save"]').click(); await page.waitForTimeout(1500);
  const f1 = await figures(page);
  L.check("after Save: all agree, in one read", agree(f1), JSON.stringify(f1));
  L.check("after Save: the gaps went down by one", f1.drawerGaps === (f0.drawerGaps ?? 0) - 1, `${f0.drawerGaps} → ${f1.drawerGaps}`);
  await page.locator('[data-hkv="undo"]').click(); await page.waitForTimeout(1500);
  const f2 = await figures(page);
  L.check("after Undo: all agree, in one read", agree(f2), JSON.stringify(f2));
  L.check("after Undo: back where they were", canon(f2) === canon(f0), JSON.stringify(f2));
  await page.keyboard.press("Escape");
  reseed();
  L.done(5);
});

test("D4 · flight: one '+n' 400ms after Save, from the Save button to the ring; nothing under reduced motion", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("D4");
  reseed();
  await open(page, SIZES[0], "D4");
  await focusKey(page, `${BARE}:wishlist`);
  await page.locator('[data-hk8="wish"]').fill("CL182 D4 probe.");
  const boxes = await page.evaluate(() => {
    const s = document.querySelector('[data-hk8="save"]')!.getBoundingClientRect(), r = document.querySelector('[data-hk8="ring"]')!.getBoundingClientRect();
    return { save: [s.left, s.top, s.right, s.bottom], ring: [r.left + r.width / 2, r.top + r.height / 2] };
  });
  /* the flight's start is read off its first frame */
  const track = page.evaluate(() => new Promise<{ first: number[] | null; last: number[] | null }>((res) => {
    let first: number[] | null = null, last: number[] | null = null;
    const t0 = performance.now();
    const tick = () => {
      const f = document.querySelector<HTMLElement>('body > [data-hk8="fly"]');
      if (f) { const b = f.getBoundingClientRect(); const c = [b.left + b.width / 2, b.top + b.height / 2]; if (!first) first = c; last = c; }
      if (performance.now() - t0 < 1400) requestAnimationFrame(tick); else res({ first, last });
    };
    requestAnimationFrame(tick);
  }));
  await page.locator('[data-hk8="save"]').click();
  await page.waitForTimeout(400);
  await shot(page, "19-hk-save-flight-1512");
  const n400 = await page.evaluate(() => document.querySelectorAll('body > [data-hk8="fly"], body > [data-hk8="pop"]').length);
  L.check("400ms after Save, exactly one '+n' in the top layer", n400 === 1, `${n400}`);
  const tr = await track;
  const [l, t, r, b] = boxes.save;
  L.check("it starts inside the Save button's box", !!tr.first && tr.first[0] >= l - 2 && tr.first[0] <= r + 2 && tr.first[1] >= t - 2 && tr.first[1] <= b + 2, JSON.stringify(tr.first));
  L.check("it ends within 8px of the ring's centre", !!tr.last && Math.hypot(tr.last[0] - boxes.ring[0], tr.last[1] - boxes.ring[1]) <= 8, JSON.stringify(tr.last));
  await page.locator('[data-hkv="undo"]').click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(1500);
  await page.keyboard.press("Escape"); await page.waitForTimeout(500);
  /* reduced motion */
  await page.emulateMedia({ reducedMotion: "reduce" });
  await focusKey(page, `${BARE}:wishlist`);
  await page.locator('[data-hk8="wish"]').fill("CL182 D4 reduced.");
  await page.locator('[data-hk8="save"]').click(); await page.waitForTimeout(400);
  const nr = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('body > [data-hk8="fly"], body > [data-hk8="pop"]')].filter((e) => getComputedStyle(e).opacity !== "0").length);
  L.check("under reduced motion nothing is visible", nr === 0, `${nr}`);
  await page.waitForTimeout(1200);
  await page.locator('[data-hkv="undo"]').click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(1500);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.keyboard.press("Escape");
  reseed();
  L.done(4);
});

test("D5 · undo: the footer reads 'Saved {first}'s {detail}.' with Undo, back by 7.5s; Undo restores agent, score, counter and tally", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("D5");
  reseed();
  await open(page, SIZES[0], "D5");
  const before = await agentDoc(BARE);
  await focusKey(page, `${BARE}:wishlist`);
  const f0 = await figures(page);
  const c0 = (await page.locator('[data-hk8="counter"]').textContent())?.trim();
  await page.locator('[data-hk8="wish"]').fill("CL182 D5 probe.");
  await page.locator('[data-hk8="save"]').click(); await page.waitForTimeout(1500);
  await shot(page, "20-hk-after-save-undo-1512");
  const foot = await page.locator('[data-hkv="foot"]').evaluate((e) => ({ text: e.textContent?.trim(), bg: getComputedStyle(e).backgroundColor }));
  L.check("the footer reads 'Saved Wren’s wishlist.' and Undo", foot.text === "Saved Wren’s wishlist.Undo", `${foot.text}`);
  L.check("the footer is ink", foot.bg === "rgb(42, 58, 82)", foot.bg);
  const saved = await agentDoc(BARE);
  L.check("the save reached the document", saved?.mswlNotes === "CL182 D5 probe.", `${saved?.mswlNotes}`);
  await page.locator('[data-hkv="undo"]').click(); await page.waitForTimeout(2500);
  const after = await agentDoc(BARE);
  L.check("Undo restores the agent (deep-equal)", canon(after) === canon(before), diffKeys(before, after).join(",") || "identical");
  const f1 = await figures(page);
  L.check("Undo restores the score", f1.drawer === f0.drawer && f1.drawerGaps === f0.drawerGaps, `${f0.drawer}/${f0.drawerGaps} → ${f1.drawer}/${f1.drawerGaps}`);
  L.check("Undo restores the counter", (await page.locator('[data-hk8="counter"]').textContent())?.trim() === c0, `${c0}`);
  L.check("Undo restores the tally (gone)", (await page.locator('[data-hk8="tally"]').count()) === 0, "none");
  /* the footer returns to normal by 7.5s after a save (the task must be back on the card for a second save; a missing
     card is a reading, never a crash) */
  const back = (await page.locator('[data-hk8="card"]').getAttribute("data-key", { timeout: 4000 }).catch(() => null)) === `${BARE}:wishlist`;
  L.check("Undo put the task back on the card", back, `${back}`);
  if (back) {
    await page.locator('[data-hk8="wish"]').fill("CL182 D5 second.", { timeout: 4000 }).catch(() => {});
    await page.locator('[data-hk8="save"]').click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(7600);
    L.check("by 7.5s the footer is back to normal", (await page.locator('[data-hkv="undo"]').count()) === 0 && (await page.locator('[data-hkv="foot"][data-saved]').count()) === 0, "normal");
  }
  await page.keyboard.press("Escape");
  reseed();
  L.done(8); /* 9 with the second save */
});

test("D6 · not stated: only a question with a stored 'not stated' value shows the link; using it writes that value and closes the gap", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("D6");
  reseed();
  await open(page, SIZES[0], "D6");
  for (const g of ["materials", "genres", "wishlist"]) {
    await focusKey(page, `${BARE}:${g}`);
    L.check(`${g}: no stored 'not stated' value, so no link`, (await page.locator('[data-hk8="card"] [data-hk8="not-stated"]').count()) === 0, "absent");
    await page.keyboard.press("Escape"); await page.waitForTimeout(500);
  }
  await focusKey(page, `${BARE}:reply`);
  L.check("reply: the link shows", (await page.locator('[data-hk8="not-stated"]').count()) === 1, "present");
  const { db, uid } = await harnessDb();
  const gaps0 = (await figures(page)).drawerGaps;
  await page.locator('[data-hk8="not-stated"]').click(); await page.waitForTimeout(200);
  await page.locator('[data-hk8="save"]').click(); await page.waitForTimeout(2000);
  const u = (await getDoc(doc(db, "users", uid))).data() ?? {};
  const settled: string[] = u?.todoPrefs?.contacts?.settled ?? [];
  L.check("reply: it wrote the settled value through the save path", settled.includes(`${BARE}:reply`), settled.join(","));
  L.check("…and the gap closed", (await figures(page)).drawerGaps === (gaps0 ?? 0) - 1, `${gaps0}`);
  await page.locator('[data-hkv="undo"]').click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(2000);
  flags(`--unsettle ${BARE}`);
  await page.keyboard.press("Escape");
  reseed();
  L.done(6);
});

test("D7 · website: the link only when a website is stored, new tab, noopener", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("D7");
  reseed();
  await open(page, SIZES[0], "D7");
  await focusKey(page, `${BARE}:wishlist`);
  L.check("no website stored: no link", (await page.locator('[data-hk8="card"] [data-hk8="website"]').count()) === 0, "absent");
  await page.keyboard.press("Escape"); await page.waitForTimeout(500);
  /* the account holds no agent with both a website and a gap: the fixture is given one, and re-seeded after */
  const { db, uid } = await harnessDb();
  await updateDoc(doc(db, "users", uid, "agents", BARE), { website: "tallisandmoor.example" });
  await page.waitForTimeout(1500);
  await openHome(page);
  const keys = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-hk8="ledger-row"]')].map((r) => r.dataset.key!));
  const withSite = keys.find((k) => k === `${BARE}:wishlist`);
  L.check("an agent with a stored website has a gap", !!withSite, `${withSite}`);
  if (withSite) {
    await page.locator(`[data-hk8="ledger-row"][data-key="${withSite}"]`).first().click(); await page.waitForTimeout(800);
    const a = page.locator('[data-hk8="card"] [data-hk8="website"]');
    L.check("the link is present", (await a.count()) === 1, `${await a.count()}`);
    L.check("target=_blank", (await a.getAttribute("target")) === "_blank", `${await a.getAttribute("target")}`);
    L.check("rel contains noopener", /noopener/.test((await a.getAttribute("rel")) ?? ""), `${await a.getAttribute("rel")}`);
  }
  await page.keyboard.press("Escape");
  reseed();
  L.done(5);
});

test("D8 · date: a picked date saves through the reopen path with no chip selected, and the reminder is made", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("D8");
  reseed();
  await open(page, SIZES[0], "D8");
  await openHome(page);
  const key = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-hk8="ledger-row"]')].map((r) => r.dataset.key!).find((k) => k.endsWith(":reopen")) ?? null);
  L.check("a reopening gap is on the account", !!key, `${key}`);
  if (key) {
    const id = key.split(":")[0];
    const { db, uid } = await harnessDb();
    const tasks0 = (await getDocs(query(collection(db, "users", uid, "tasks"), where("agentId", "==", id)))).docs.map((d) => d.id);
    await page.locator(`[data-hk8="ledger-row"][data-key="${key}"]`).first().click(); await page.waitForTimeout(800);
    await shot(page, "21-hk-reopen-question-1512");
    await page.locator('[data-hk8="pick"]').click(); await page.waitForTimeout(300);
    const d = new Date(Date.now() + 47 * 86_400_000); const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    await page.locator('[data-hk8="pick-date"]').fill(iso); await page.waitForTimeout(300);
    const chipsOn = await page.locator('[data-hk8="remind-chip"][aria-pressed="true"]').count();
    L.check("no chip is selected", chipsOn === 0, `${chipsOn}`);
    L.check("the date input's minimum is today", (await page.locator('[data-hk8="pick-date"]').getAttribute("min")) != null, `${await page.locator('[data-hk8="pick-date"]').getAttribute("min")}`);
    await page.locator('[data-hk8="save"]').click(); await page.waitForTimeout(2500);
    const tasks1 = (await getDocs(query(collection(db, "users", uid, "tasks"), where("agentId", "==", id)))).docs.map((d) => ({ id: d.id, ...d.data() }) as { id: string; dueDate?: string });
    const made = tasks1.filter((t) => !tasks0.includes(t.id));
    L.check("one reminder was made", made.length === 1, `${made.length}`);
    L.check("for the picked date", made.length === 1 && String(made[0].dueDate ?? "").startsWith(iso), `${made[0]?.dueDate}`);
    await page.locator('[data-hkv="undo"]').click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(2500);
    const tasks2 = (await getDocs(query(collection(db, "users", uid, "tasks"), where("agentId", "==", id)))).docs.map((d) => d.id);
    L.check("Undo takes the reminder away again", canon(tasks2.sort()) === canon(tasks0.sort()), `${tasks2.length} vs ${tasks0.length}`);
  }
  await page.keyboard.press("Escape");
  L.done(6);
});

test("D9 · tally: hidden before the first save; '+11 this session · 2 filled' after 6 and 5; reset on close", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("D9");
  reseed();
  await open(page, SIZES[0], "D9");
  await focusKey(page, `${BARE}:reply`);
  L.check("no tally before the first save", (await page.locator('[data-hk8="tally"]').count()) === 0, "none");
  await page.locator('[data-ae="hk8-weeks"] button[data-d="1"]').click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(200);
  await page.locator('[data-hk8="save"]').click(); await page.waitForTimeout(2000);
  const t1 = await page.locator('[data-hk8="tally"]').count();
  L.check("after a save the tally shows", t1 === 1, `${t1}`);
  await page.keyboard.press("Escape"); await page.waitForTimeout(600);
  await page.keyboard.press("h"); await page.waitForTimeout(800);
  L.check("closing reset the tally", (await page.locator('[data-hk8="tally"]').count()) === 0, `${t1} before close`);
  /* two saves in one opening: reply (6) then materials (5) */
  reseed();
  await page.keyboard.press("Escape"); await page.waitForTimeout(400);
  await page.reload(); await page.waitForTimeout(2500); await mutate(page, "D9");
  await focusKey(page, `${BARE}:reply`);
  await page.locator('[data-ae="hk8-weeks"] button[data-d="1"]').click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(200);
  await page.locator('[data-hk8="save"]').click(); await page.waitForTimeout(2000);
  await page.locator('[data-hk8="back"]').click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(400);
  if (await page.locator('[data-hkv="view"][data-v="detail"]').count()) await page.locator('[data-hkv="view"][data-v="detail"]').click();
  await page.locator(`[data-hk8="ledger-row"][data-key="${BARE}:materials"]`).first().click({ timeout: 6000 }).catch(() => {}); await page.waitForTimeout(800);
  await page.locator('[data-mt="ql"]').click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(200);
  await page.locator('[data-hk8="save"]').click(); await page.waitForTimeout(2000);
  const tally = (await page.locator('[data-hk8="tally"]').textContent().catch(() => null))?.trim();
  L.check("after saves of 6 and 5: '+11 this session · 2 filled'", tally === "+11 this session · 2 filled", `${tally}`);
  await page.keyboard.press("Escape"); await page.waitForTimeout(500);
  await page.keyboard.press("h"); await page.waitForTimeout(800);
  L.check("it resets when the drawer closes", (await page.locator('[data-hk8="tally"]').count()) === 0, "none");
  await page.keyboard.press("Escape");
  reseed();
  L.done(5);
});

test("D11 · minutes: from Focus, the tile lands on home with Up next in view and one flash", async ({ page }) => {
  test.setTimeout(200_000);
  const L = new Ledger("D11");
  await open(page, { width: 1280, height: 800 }, "D11");
  await openHome(page);
  await page.locator('[data-hk8="fill-all"]').click(); await page.waitForTimeout(700);
  L.check("in Focus", (await page.locator('[data-hk8="focus"]').count()) === 1, "focus");
  const anims = page.evaluate(() => new Promise<number>((res) => {
    let n = 0; const t0 = performance.now();
    const tick = () => { const u = document.querySelector('[data-hk8="up-next"]'); if (u && u.getAnimations().length) n = Math.max(n, u.getAnimations().length); if (performance.now() - t0 < 1500) requestAnimationFrame(tick); else res(n); };
    requestAnimationFrame(tick);
  }));
  await page.locator('[data-hk8="tile"][data-k="minutes"]').click();
  const flashes = await anims;
  await shot(page, "23-hk-minutes-to-up-next-1280");
  const r = await page.evaluate(() => { const a = document.querySelector('[data-hk8="up-next"]')?.getBoundingClientRect(); const b = document.querySelector('.hdr[data-hdr="housekeeping"] .hdr-body')?.getBoundingClientRect(); return { home: !!document.querySelector('[data-hk8="home"]'), focus: !!document.querySelector('[data-hk8="focus"]'), inView: !!a && !!b && a.top >= b.top - 1 && a.bottom <= b.bottom + 1 }; });
  L.check("it lands on home", r.home && !r.focus, JSON.stringify(r));
  L.check("Up next is in view", r.inView, `${r.inView}`);
  L.check("one flash", flashes === 1, `${flashes}`);
  await page.keyboard.press("Escape");
  L.done(4);
});
