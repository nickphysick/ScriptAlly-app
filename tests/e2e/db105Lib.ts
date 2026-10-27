/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v105 — the helpers shared by the DB105 locks and the report's shots (a spec may not import a spec).
 */
import { expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

export const DIR = "reports/dashboard-v105";
export type VP = { width: number; height: number };
export const tag = (v: VP) => `${v.width}x${v.height}`;
export const MUT = process.env.DB105_MUTATE ?? "";

/** The seven sizes S1 walks (the pack's). */
export const SIZES: VP[] = [
  { width: 1100, height: 800 }, { width: 1280, height: 650 }, { width: 1366, height: 768 }, { width: 1440, height: 900 },
  { width: 1512, height: 900 }, { width: 1920, height: 1080 }, { width: 2560, height: 1440 },
];

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
  "S1-no-steps": `.d105-pv { display: flex !important; } .d105-pvr { display: flex !important; } .d105-photo { display: flex !important; width: 104px !important; height: 116px !important; } .d105-btns { display: flex !important; } .d105-btn { flex-direction: row !important; white-space: nowrap !important; } .d105-fw .d105-note { display: block !important; } .d105-idle { display: flex !important; } .d105-compact { display: none !important; }`,
  "S1-number-under-info": `.d105-fw .d105-no { font-size: 10px !important; letter-spacing: 0.18em !important; }`,
  "S2-green": `.d105-strip { background: #5c8a4f !important; }`,
  "S2-squeeze": `.d105-btns { display: flex !important; width: 210px !important; } .d105-btn { flex: 1 1 0 !important; flex-direction: row !important; white-space: nowrap !important; min-width: 0 !important; overflow: hidden !important; text-overflow: ellipsis !important; }`,
  "B2-all-colour": `.d105-hd.is-future img { filter: none !important; opacity: 1 !important; }`,
  "B4-no-crack": `.d105-hx.is-sent .d105-zz { animation: none !important; }`,
  "D1-dim-inert": `.d105-dim { pointer-events: none !important; }`,
};

/** The stats a lock seeds through the dev-only `window.__SA_FOUNDING_STATS` aid (lib/foundingStats). */
export const STATS: Record<string, Record<string, unknown>> = {
  egg: { contributions: 0, waiting: 0, tier: null, nextTier: "fledgling", toNext: 1, topPct: null, foundingNo: 23 },
  hatching: { contributions: 0, waiting: 1, tier: null, nextTier: "fledgling", toNext: 1, topPct: null, foundingNo: 23 },
  fledgling: { contributions: 1, waiting: 0, tier: "fledgling", nextTier: "archivist", toNext: 2, topPct: null, foundingNo: 23 },
  mentor: { contributions: 16, waiting: 0, tier: "mentor", nextTier: "queryhawk", toNext: 9, topPct: 10, foundingNo: 23 },
  queryhawk: { contributions: 25, waiting: 0, tier: "queryhawk", nextTier: null, toNext: null, topPct: 5, foundingNo: 23 },
  nonumber: { contributions: 0, waiting: 0, tier: null, nextTier: "fledgling", toNext: 1, topPct: null, foundingNo: null },
};

/** The dev aid `window.__SA_FOUNDING_SEEN` overrides the stored seen-rank (lib/foundingCard) — default: everything seen. */
export async function openDash(page: Page, vp: VP, flags: Record<string, unknown> = {}, extraCss = "") {
  await page.addInitScript(([f]) => {
    Object.assign(window, f);
    try { localStorage.setItem("scriptally_active_manuscript_id", "seed-ms-1"); } catch { /* private mode */ }
  }, [flags] as const);
  await openRoute(page, "/dashboard", vp);
  await page.locator('[data-d58="page"][data-loading="0"]').first().waitFor({ timeout: 25_000 }).catch(() => {});
  await page.locator('[data-d105="card"]').first().waitFor({ timeout: 15_000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  if (extraCss) await page.addStyleTag({ content: extraCss });
  if (CSS_MUTATIONS[MUT]) await page.addStyleTag({ content: CSS_MUTATIONS[MUT] });
  await page.mouse.move(2, 2);
  await page.waitForTimeout(500);
}

/** The feedback callable, answered in the page: `ok` resolves, `fail` refuses. Records every payload. */
export async function mockCallable(page: Page, outcome: "ok" | "fail" = "ok"): Promise<Record<string, unknown>[]> {
  const sent: Record<string, unknown>[] = [];
  await page.route("**/sendBetaFeedback", async (route) => {
    if (route.request().method() === "OPTIONS") { await route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "POST" } }); return; }
    try { sent.push((route.request().postDataJSON() as { data: Record<string, unknown> }).data); } catch { /* none */ }
    if (outcome === "ok") await route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify({ result: { ok: true } }) });
    else await route.fulfill({ status: 500, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify({ error: { status: "INTERNAL", message: "refused" } }) });
  });
  return sent;
}

export interface Fit { n: number; card: { w: number; h: number } | null; escapes: string[]; scrolls: string[]; clipped: string[]; overlaps: string[]; leaves: number; state: string }
/**
 * S1 — nothing is cut. Every visible box in the card lies inside its frame; no box scrolls; no text runs past its own box
 * (an ellipsis or a cut line is that). Hidden variants are skipped: only what is displayed is measured.
 */
export async function fit(page: Page): Promise<Fit> {
  return page.evaluate(() => {
    const card = [...document.querySelectorAll<HTMLElement>('[data-d105="card"]')].find((e) => e.getBoundingClientRect().height > 0) ?? null;
    if (!card) return { n: 0, card: null, escapes: [], scrolls: [], clipped: [], overlaps: [], leaves: 0, state: "none" };
    const frame = card.querySelector<HTMLElement>(".d105-frame")!;
    const F = frame.getBoundingClientRect();
    const name = (e: Element) => `${e.tagName.toLowerCase()}.${(e.getAttribute("class") ?? "").split(" ")[0]}${e.getAttribute("data-d105") ? `[${e.getAttribute("data-d105")}]` : ""}`;
    const escapes: string[] = [], scrolls: string[] = [], clipped: string[] = [];
    let n = 0;
    for (const e of frame.querySelectorAll<HTMLElement>("*")) {
      if (e.closest("svg") && e.tagName.toLowerCase() !== "svg") continue;
      if (e.closest(".d105-hx, .d105-phx")) continue; /* an art box is ONE picture: its parts fly and overlap by design, and the box clips them */
      if (e.closest(".d105-sr")) continue; /* the screen-reader label is 1px by design */
      const r = e.getBoundingClientRect();
      if (r.width < 0.5 || r.height < 0.5) continue;
      const cs = getComputedStyle(e);
      if (cs.visibility === "hidden" || cs.opacity === "0") continue;
      n++;
      if (r.left < F.left - 0.5 || r.right > F.right + 0.5 || r.top < F.top - 0.5 || r.bottom > F.bottom + 0.5) escapes.push(`${name(e)} ${r.left.toFixed(1)},${r.top.toFixed(1)}→${r.right.toFixed(1)},${r.bottom.toFixed(1)} vs ${F.right.toFixed(1)},${F.bottom.toFixed(1)}`);
      if (e.tagName.toLowerCase() !== "textarea" && !e.matches(".d105-hx, .d105-phx") && (e.scrollHeight > e.clientHeight + 1 || e.scrollWidth > e.clientWidth + 1) && cs.display !== "inline" && e.clientHeight > 0) {
        if (cs.overflow !== "visible" || cs.textOverflow === "ellipsis") clipped.push(`${name(e)} ${e.scrollWidth}x${e.scrollHeight} in ${e.clientWidth}x${e.clientHeight}`);
        else if (e.scrollWidth > e.clientWidth + 1 && /nowrap/.test(cs.whiteSpace)) clipped.push(`${name(e)} text ${e.scrollWidth} in ${e.clientWidth}`);
      }
    }
    for (const e of [card, frame, ...frame.querySelectorAll<HTMLElement>(".d105-body, .d105-compact")]) {
      if (e.getBoundingClientRect().height > 0 && e.scrollHeight > e.clientHeight + 1) scrolls.push(`${name(e)} ${e.scrollHeight} in ${e.clientHeight}`);
    }
    /* ⚠️ THE NEGATIVE-SPACE CHECK: no two leaves (text runs, images, drawings, controls' icons) share pixels. A box inside
       the frame can still sit on another (the number under the ⓘ did, at 1100 — inside the frame, and invisible to the
       checks above). Leaves only: a parent's box contains its children's by construction. */
    const leaves: { e: Element; r: DOMRect }[] = [];
    /* the art boxes themselves are leaves: one picture each */
    for (const e of frame.querySelectorAll<HTMLElement>(".d105-hx, .d105-phx")) { const r = e.getBoundingClientRect(); if (r.width > 0.5) leaves.push({ e, r }); }
    for (const e of frame.querySelectorAll<HTMLElement | SVGElement>("img, svg, b, em, small, p, i, button, textarea, li")) {
      if (e.closest(".d105-sr, .d105-hx, .d105-phx")) continue;
      if (e.parentElement?.closest("svg")) continue;
      const r = e.getBoundingClientRect();
      if (r.width < 0.5 || r.height < 0.5) continue;
      const cs = getComputedStyle(e);
      if (cs.visibility === "hidden" || cs.opacity === "0") continue;
      const isLeaf = e.tagName.toLowerCase() === "svg" || e.tagName.toLowerCase() === "img" || e.tagName.toLowerCase() === "textarea"
        || ([...e.childNodes].some((c) => c.nodeType === 3 && (c.textContent ?? "").trim()) && !e.querySelector("img, svg, b, em, small, p, i, button, li"));
      if (isLeaf) leaves.push({ e, r });
    }
    const overlaps: string[] = [];
    for (let i = 0; i < leaves.length; i++) for (let j = i + 1; j < leaves.length; j++) {
      const a = leaves[i], b = leaves[j];
      if (a.e.contains(b.e) || b.e.contains(a.e)) continue;
      const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
      if (w > 1 && h > 1) overlaps.push(`${name(a.e)} × ${name(b.e)} (${w.toFixed(1)}×${h.toFixed(1)})`);
    }
    const c = card.getBoundingClientRect();
    return { n, card: { w: c.width, h: c.height }, escapes, scrolls, clipped, overlaps, leaves: leaves.length, state: card.dataset.state ?? "" };
  });
}

export const shot = async (page: Page, path: string) => {
  mkdirSync(`${DIR}/shots`, { recursive: true });
  await page.locator('[data-d105="card"]').first().screenshot({ path: `${DIR}/shots/${path}` });
};
