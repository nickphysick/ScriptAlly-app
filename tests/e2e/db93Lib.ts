/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v93 — the helpers shared by the DB93 locks and the report's shots (a spec may not import a spec).
 */
import { expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

export const DIR = "reports/dashboard-v93";
export type VP = { width: number; height: number };
export const tag = (v: VP) => `${v.width}x${v.height}`;
export const MUT = process.env.DB93_MUTATE ?? "";

type Row = { lock: string; where: string; ok: boolean; detail: string };
export class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(lock: string, where: string, ok: boolean, detail: string) { this.rows.push({ lock, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${this.name}${MUT ? `.mut-${MUT}` : ""}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.lock} · ${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/** The in-page breaks. Each is the lock's own named mutation. */
export const CSS_MUTATIONS: Record<string, string> = {
  "A1-tint": `.d58 .d71-th { background: #e8eef6 !important; }`,
  "A2-tall": `.d58 .d71-th { padding-top: 16px !important; }`,
  "A3-tall-body": `.d71-task .d71-tb { padding-top: 60px !important; }`,
  "C1-no-variant": `.d93-frame > .d93-compact { display: none !important; } .d93-frame > .d93-full { display: flex !important; } .d93-lad { display: grid !important; }`,
  "C2-big-med": `.d93-med { width: 140px !important; height: 140px !important; }`,
  "C3-all-colour": `.d93-hd img { filter: none !important; opacity: 1 !important; }`,
  "C5-dim-inert": `.d93-dim { pointer-events: none !important; }`,
  "C6-fw-194": `.d58[data-mode="q"] .d71-right { grid-template-rows: minmax(0, 1fr) 194px !important; }`,
  "C7-green": `.d93-band { background: #5c8a4f !important; }`,
  "A3-label": `.d71-wlab > .d71-wexp { left: 100% !important; transform: translateX(-50%) !important; visibility: visible !important; }`,
};

/** A 254px task card (the C5 row) — forced for Part A, natural from Part C. */
export const TASK_254 = `.d58[data-mode="q"] .d71-right { grid-template-rows: 254px var(--d71-fw-h, 194px) !important; }`;

export async function openDash(page: Page, vp: VP, flags: Record<string, unknown> = {}, ms = "seed-ms-1", extraCss = "") {
  await page.addInitScript(([f, m]) => {
    Object.assign(window, f);
    try { localStorage.setItem("scriptally_active_manuscript_id", m as string); } catch { /* private mode */ }
  }, [flags, ms] as const);
  await openRoute(page, "/dashboard", vp);
  await page.locator('[data-d58="page"][data-loading="0"]').first().waitFor({ timeout: 25_000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  if (extraCss) await page.addStyleTag({ content: extraCss });
  if (CSS_MUTATIONS[MUT]) await page.addStyleTag({ content: CSS_MUTATIONS[MUT] });
  await page.mouse.move(2, 2);
  await page.waitForTimeout(700);
}

/** Every item of the task card's cycle, by its pager (reduced motion keeps it still). */
export async function eachTask<T>(page: Page, read: () => Promise<T>): Promise<T[]> {
  const pos = (await page.locator('[data-d71="pos-text"]').first().textContent().catch(() => "1 OF 1")) ?? "1 OF 1";
  const n = Number(pos.split(" OF ")[1] ?? 1);
  const out: T[] = [];
  for (let i = 0; i < n; i++) {
    out.push(await read());
    if (n > 1) { await page.locator('[data-d71="next"]').first().click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(90); }
  }
  return out;
}

/** The stats the C locks seed through the dev-only `window.__SA_FOUNDING_STATS` aid (lib/foundingStats). */
export const STATS: Record<string, Record<string, unknown>> = {
  "0": { contributions: 0, waiting: 0, tier: null, nextTier: "fledgling", toNext: 1, topPct: null },
  "1": { contributions: 1, waiting: 0, tier: "fledgling", nextTier: "archivist", toNext: 2, topPct: null },
  "6": { contributions: 6, waiting: 0, tier: "archivist", nextTier: "scout", toNext: 2, topPct: 15 },
  "11": { contributions: 11, waiting: 0, tier: "scout", nextTier: "mentor", toNext: 4, topPct: null },
  "25": { contributions: 25, waiting: 0, tier: "queryhawk", nextTier: null, toNext: null, topPct: 5 },
};
export const withWaiting = (k: string, waiting: number) => ({ ...STATS[k], waiting });

/** The founding card as a reader sees it: which variant is displayed, its words, its ladder, and anything cut. */
export const readFw = (page: Page) => page.evaluate(() => {
  const fw = [...document.querySelectorAll<HTMLElement>('[data-d58="panel"][data-loading="0"]')].find((e) => e.getBoundingClientRect().height > 0);
  if (!fw) return null;
  const shown = (e: Element | null | undefined): e is HTMLElement => !!e && getComputedStyle(e).display !== "none" && (e as HTMLElement).getBoundingClientRect().height > 0;
  const full = fw.querySelector<HTMLElement>('[data-d93="full"]'), compact = fw.querySelector<HTMLElement>('[data-d93="compact"]');
  const ladder = fw.querySelector<HTMLElement>('[data-d93="ladder"]');
  const variant = shown(compact) ? "Compact" : shown(full) ? (shown(ladder) ? "Full" : "Medium") : "none";
  const frame = fw.querySelector<HTMLElement>(".d93-frame")!;
  const fb = frame.getBoundingClientRect();
  const escapes: string[] = []; let n = 0;
  for (const el of fw.querySelectorAll<HTMLElement>("*")) {
    if (!shown(el)) continue;
    n += 1;
    const r = el.getBoundingClientRect();
    if (r.top < fb.top - 0.5 || r.bottom > fb.bottom + 0.5 || r.left < fb.left - 0.5 || r.right > fb.right + 0.5) escapes.push(`${el.className || el.tagName}`);
  }
  const over: string[] = [];
  for (const el of [frame, full, compact, ...fw.querySelectorAll<HTMLElement>(".d93-top, .d93-cline, .d93-band > span, .d93-stat, .d93-ttl")]) {
    if (!shown(el)) continue;
    if (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1) over.push(`${el.className} ${el.scrollWidth}/${el.clientWidth}·${el.scrollHeight}/${el.clientHeight}`);
  }
  const t = (s: string) => { const e = [...fw.querySelectorAll<HTMLElement>(s)].find(shown); return e ? (e.textContent ?? "").replace(/\s+/g, " ").trim() : null; };
  const rungs = [...fw.querySelectorAll<HTMLElement>('[data-d93="rung"]')].map((li) => {
    const img = li.querySelector("img")!; const cs = getComputedStyle(img);
    return { state: li.dataset.state ?? "", colour: cs.filter === "none" && Number(cs.opacity) === 1 };
  });
  const med = fw.querySelector<HTMLElement>('[data-d93="medallion"]');
  const body = shown(full) ? full! : compact;
  const content = shown(full) ? fw.querySelector<HTMLElement>(".d93-top")!.getBoundingClientRect() : null;
  const lad = shown(ladder) ? ladder!.getBoundingClientRect() : null;
  const bb = body?.getBoundingClientRect();
  return {
    h: fw.getBoundingClientRect().height, w: fw.getBoundingClientRect().width, variant, n, escapes: escapes.slice(0, 6), over,
    band: t('[data-d93="band-title"]'), kicker: t('[data-d93="kicker"]'), title: t('[data-d93="title"]'), line: t('[data-d93="line"]'), stat: t('[data-d93="stat"]'), compactLine: t('[data-d93="compact-line"]'),
    how: t('[data-d93="how"] > span'), rungs, medPx: med && shown(med) ? med.getBoundingClientRect().width : 0, ring: med?.dataset.ring ?? "",
    medOpacity: med ? getComputedStyle(med.querySelector("img")!).opacity : "",
    centred: content && bb ? Math.abs(((content.top + (lad ? lad.bottom : content.bottom)) / 2) - (bb.top + bb.bottom) / 2) : null,
    allText: (fw.innerText ?? "") + " " + [...fw.querySelectorAll("*")].flatMap((e) => ["aria-label", "title", "alt"].map((k) => e.getAttribute(k) ?? "")).join(" "),
  };
});
