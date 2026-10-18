/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Discover v1 measurement helpers (design-refs/discover-v1/discover-v1.html). A plain module: importing a `.measure.ts`
 * would execute its cases in the importer.
 *
 * ⚠️ ONE WAY IN: `openDiscover` opens /agents/discover at a size, in a review state (lib/discoverReviewAid) or over
 *    the real account, and waits for the page's own `data-face`. Every probe starts from `window.__dv1()`, which finds
 *    the ONE visible Discover root by measuring it and throws on none or two.
 * ⚠️ THE MOCK IS MEASURED BY THE SAME RULER, OPENED AT THE WINDOW THAT GIVES IT THE APP'S CONTENT WIDTH
 *    (`openMock`), never at the app's own window — the mock's sidebar and sheet are not the app's.
 * ⚠️ EVERY LOCK HAS ITS NAMED BREAK: in-page breaks are `MUTATIONS[lock]`, applied when `DV1_MUTATE=<lock>`; source
 *    breaks are edits made and undone in the measurement worktree. `DV1_BASE=1` names the ledger of a red-first run.
 */
import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";
import { openRoute, liftMotionSuppression, KILL_MOTION } from "./measure";
import { assertLocalBundleIsDev } from "./bundleGuard";

export const DIR = "reports/discover-v1";
export const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
export type VP = { width: number; height: number };
export const MUT = process.env.DV1_MUTATE ?? "";
export const BASE = process.env.DV1_BASE === "1";
export const near = (a: unknown, b: unknown, t: number) =>
  typeof a === "number" && typeof b === "number" && Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= t;

type Row = { lock: string; where: string; ok: boolean; detail: string };
export class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(lock: string, where: string, ok: unknown, detail: string) { this.rows.push({ lock, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${BASE ? "base-" : ""}${MUT ? `mut-${MUT}-` : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.lock} · ${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/** one named break per lock, applied in the page */
export const MUTATIONS: Record<string, { css?: string; js?: string }> = {
  /* the ring's box sized by its content (the loading face has no figure, so it collapses) */
  B1: { css: `.dv1-rg { width: auto !important; height: auto !important; } .dv1-rg svg { width: auto !important; height: auto !important; } .dv1-hd[data-loading] .dv1-rg svg { display: none !important; }` },
  /* a stroke on the empty ring: the "none" state draws an arc anyway */
  B2: { js: `(() => { const fix = () => { for (const svg of document.querySelectorAll('[data-dv1="ring"] svg')) { if (svg.querySelector('[data-dv1="ring-arc"]')) continue; const c = document.createElementNS("http://www.w3.org/2000/svg", "circle"); for (const [k, v] of [["data-dv1", "ring-arc"], ["cx", "42"], ["cy", "42"], ["r", "36"], ["fill", "none"], ["stroke", "#2a3a52"], ["stroke-width", "8"], ["stroke-linecap", "round"], ["stroke-dasharray", "0 226.19"]]) c.setAttribute(k, v); svg.appendChild(c); } }; new MutationObserver(fix).observe(document.body, { subtree: true, childList: true }); fix(); })()` },
  /* the class collision restored: the catalogue section's rules on the lead card's slate band */
  C1T: { css: `.dv1-band { position: relative !important; margin-top: 72px !important; padding: 56px 0 64px !important; }` },
  /* the facts' reflow by viewport instead of the card */
  C1: { css: `@container dv1lead (max-width: 665px) { .dv1-facts { grid-template-columns: 1fr 1.25fr 1fr !important; } .dv1-facts > div:nth-child(2) { grid-column: auto !important; order: 0 !important; } } @media (max-width: 1360px) { .dv1-facts { grid-template-columns: 1fr 1fr !important; } .dv1-facts > div:nth-child(2) { grid-column: 1 / -1 !important; order: 3 !important; } }` },
};
export async function mutate(page: Page, lock: string) {
  const m = MUT === lock ? MUTATIONS[MUT] : null;
  if (!m) return;
  if (m.css) await page.addStyleTag({ content: m.css });
  if (m.js) await page.evaluate(m.js);
  await page.waitForTimeout(250);
}

/** installed in the page: the visible Discover root, its scroller, and a box reader */
export const LIB = `
window.__dv1 = () => {
  const roots = [...document.querySelectorAll('[data-dv1="page"]')].filter((e) => e.getBoundingClientRect().height > 0);
  if (roots.length !== 1) throw new Error("expected one visible Discover root, found " + roots.length);
  const r = roots[0];
  const sc = r.closest(".wpg-scroll");
  return { r, sc, q: (s) => r.querySelector(s), qa: (s) => [...r.querySelectorAll(s)] };
};
window.__box = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height, b: b.bottom, r: b.right }; };
`;

export type DvState = "live" | "done" | "none" | "empty" | "real" | "soon";

/** Open Discover. `state`: a review-aid fixture ("live" | "done" | "none" | "empty"), "real" (the live face over the
 *  account), or "soon" (no aid — the prod gate). `hold` keeps the loading face for that many ms (dev-only). */
export async function openDiscover(page: Page, vp: VP, state: DvState, opts: { motion?: boolean; holdMs?: number } = {}) {
  await page.addInitScript(({ s, h }) => {
    const w = window as unknown as Record<string, unknown>;
    if (s === "real") w.__SA_DV_LIVE = 1;
    else if (s !== "soon") w.__SA_DV_STATE = s;
    if (h) w.__SA_DV_HOLD_MS = h;
  }, { s: state, h: opts.holdMs ?? 0 });
  await openRoute(page, "/agents/discover", vp);
  if (opts.motion) await liftMotionSuppression(page);
  await page.addScriptTag({ content: LIB });
  const face = state === "empty" || state === "soon" ? "soon" : "live";
  await page.waitForFunction(({ f, held }) => {
    const r = [...document.querySelectorAll('[data-dv1="page"]')].find((e) => e.getBoundingClientRect().height > 0);
    if (!r || r.getAttribute("data-face") !== f) return false;
    const loading = !!r.querySelector('[data-dv1="header"][data-loading]');
    return held ? true : !loading;
  }, { f: face, held: !!opts.holdMs }, { timeout: 30_000 });
  await page.waitForTimeout(300);
}

/** The app's content column width (the header's box), to open the mock at the same width. */
export async function appColumn(page: Page): Promise<number> {
  return page.evaluate(() => {
    const { r } = (window as unknown as { __dv1: () => { r: HTMLElement } }).__dv1();
    const first = r.querySelector('[data-dv1="header"], [data-dv1="coming-soon"]') as HTMLElement;
    return first.getBoundingClientRect().width;
  });
}

const MOCK = "file://" + resolve("design-refs/discover-v1/discover-v1.html");

/** Open the mock in a state, at the window whose content column equals `column` (searched, not assumed). */
export async function openMock(page: Page, column: number, height: number, state: "live" | "done" | "none" | "empty") {
  let w = Math.round(column + 345);
  for (let i = 0; i < 6; i++) {
    await page.setViewportSize({ width: w, height });
    await page.goto(MOCK);
    await page.waitForTimeout(200);
    const got = await page.evaluate(() => (document.querySelector(".lh") as HTMLElement).getBoundingClientRect().width);
    if (Math.abs(got - column) < 0.75) break;
    w = Math.round(w + (column - got) / 0.935);
  }
  if (state !== "live") {
    await page.evaluate((s) => (document.querySelector(`.stsw [data-st="${s}"]`) as HTMLElement).click(), state);
    await page.waitForTimeout(200);
  }
  /* ⚠️ MOTION OFF BEFORE ANY READING: the mock's lead card enters with a 0.42s rise, and a box read mid-flight is the
     animation's, not the layout's (it put the ref's lead 1.8px low at 1280) */
  await page.addStyleTag({ content: "*, *::before, *::after { animation: none !important; transition: none !important; }" });
  await page.waitForTimeout(100);
  return w;
}

/* ── the owned Pro account (seedDiscoverV1.mjs) ───────────────────────────── */

export const DV1_EMAIL = "dv1@scriptally.test";
export const DV1_MS = "dv1-ms";
const pw = (): string => {
  if (process.env.SA_E2E_PASSWORD) return process.env.SA_E2E_PASSWORD;
  for (const line of readFileSync(resolve(".env.local"), "utf8").split("\n")) { const m = /^\s*SA_E2E_PASSWORD\s*=\s*(.*)$/.exec(line); if (m) return m[1].trim().replace(/^["']|["']$/g, ""); }
  throw new Error("No SA_E2E_PASSWORD");
};
export const seedOwned = (args = "") => execSync(`node tests/e2e/seedDiscoverV1.mjs ${args}`, { cwd: process.cwd(), stdio: "pipe", timeout: 240_000 }).toString();
/** the account's Discover state, canonical JSON — the last line the seeder prints */
export const dumpOwned = (extra = ""): Record<string, unknown> => JSON.parse(seedOwned(`--dump ${extra}`).trim().split("\n").filter((l) => l.startsWith("{")).pop()!);

/** A context signed in as the owned account, on the real live face (`__SA_DV_LIVE`), with its book active. */
export async function ownedPage(browser: Browser, baseURL: string, vp: VP, face: "live" | "soon" = "live"): Promise<{ ctx: BrowserContext; page: Page }> {
  await assertLocalBundleIsDev();
  /* ⚠️ A FRESH SIGN-IN EVERY TIME: a restored storageState came back signed out (Firebase keeps its session in
     IndexedDB) and read as a page that never rendered — the house harness signs in per run for the same reason */
  const ctx = await browser.newContext({ viewport: vp, baseURL });
  const page: Page | null = await ctx.newPage();
  await page.goto("/#/signin");
  await page.locator("#au-email").fill(DV1_EMAIL);
  await page.locator("#au-pw").fill(pw());
  await page.getByRole("button", { name: /^Sign in$/ }).last().click();
  /* ⚠️ NOT `.ws-window`: since onboarding v5 the sign-in screen wears the shell's own classes, so that check passes on
     the form itself. The sidebar is the workspace's alone, and the URL leaves #/signin once the sign-in lands. */
  await page.waitForURL((u) => !u.hash.includes("signin"), { timeout: 45_000 });
  await expect(page.locator("#ws-sidebar").first()).toBeVisible({ timeout: 45_000 });
  /* ⚠️ THE SHELL SHOWS BEFORE FIREBASE HAS WRITTEN THE SESSION TO IndexedDB — navigate now and the next page loads
     signed out. Wait for the persisted user. */
  await page.waitForFunction(() => new Promise<boolean>((res) => {
    const req = indexedDB.open("firebaseLocalStorageDb");
    req.onerror = () => res(false);
    req.onsuccess = () => {
      try {
        const tx = req.result.transaction("firebaseLocalStorage", "readonly");
        const all = tx.objectStore("firebaseLocalStorage").getAll();
        all.onsuccess = () => res((all.result as { fbase_key?: string }[]).some((r) => String(r.fbase_key).startsWith("firebase:authUser")));
        all.onerror = () => res(false);
      } catch { res(false); }
    };
  }), null, { timeout: 20_000, polling: 250 });
  await page!.addInitScript(({ id, live }) => {
    if (live) (window as unknown as Record<string, unknown>).__SA_DV_LIVE = 1;
    try { localStorage.setItem("scriptally_active_manuscript_id", id); } catch { /* */ }
  }, { id: DV1_MS, live: face === "live" });
  await page!.goto("/agents/discover");
  await page!.addStyleTag({ content: KILL_MOTION });
  await page!.addScriptTag({ content: LIB });
  await page!.waitForFunction((f) => {
    const r = [...document.querySelectorAll('[data-dv1="page"]')].find((e) => e.getBoundingClientRect().height > 0);
    if (!r || r.getAttribute("data-face") !== f) return false;
    return f === "soon" ? !!r.querySelector('[data-dv1="coming-soon"]') : !r.querySelector('[data-dv1="header"][data-loading]') && !!r.querySelector('[data-dv1="picks"]');
  }, face, { timeout: 45_000 });
  await page!.waitForTimeout(400);
  return { ctx: ctx!, page: page! };
}

/** the lead's name, then the queue's, in order */
export const ORDER = `(() => { const { q, qa } = window.__dv1(); return [q('[data-dv1="lead-name"]')?.textContent?.trim() ?? null, ...qa('[data-dv1="queue-row"] .who b').map((b) => b.textContent.trim())]; })()`;
