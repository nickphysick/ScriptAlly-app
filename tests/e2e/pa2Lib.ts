/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PHONE APP v2 — the helpers every PA2 lock shares (a spec may not import a spec).
 *
 *  - `Ledger`: every reading is written to reports/phone-app-v2/ledger/, and a run producing fewer readings than its
 *    floor fails — a lock that measured nothing is red, not green.
 *  - `openPhone`: signs in at 1440 (the shared `openRoute` cannot open a phone width) and reloads at the phone size,
 *    with motion suppressed on every document and the lock's own CSS mutation applied (`PA2_MUTATE=<name>`).
 *  - The two in-page sweeps every part re-uses: the colour laws (by the NEAREST painted ground, so a white disc inside
 *    the navy band is judged on white) and the image census (no source twice on one screen).
 */
import { expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

export const DIR = "reports/phone-app-v2";
export type VP = { width: number; height: number };
export const tag = (v: VP) => `${v.width}x${v.height}`;
export const MUT = process.env.PA2_MUTATE ?? "";
export const PHONES: VP[] = [{ width: 390, height: 844 }, { width: 360, height: 780 }];
export const MS = "seed-ms-1";

type Row = { lock: string; where: string; ok: boolean; detail: string };
export class Ledger {
  rows: Row[] = [];
  constructor(public part: string, public name: string) {}
  check(lock: string, where: string, ok: boolean, detail: string) { this.rows.push({ lock, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/${this.part}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/${this.part}/ledger/${this.name}${MUT ? `.mut-${MUT}` : ""}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.lock} · ${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/** the in-page breaks: a lock's own named CSS mutation, applied as a stylesheet on every document */
export const CSS_MUTATIONS: Record<string, string> = {
  /* S3 — the band's title in ink */
  "ink-title": ".pa-band .pa-bt { color: #1c130f !important; }",
  /* S7 — the snackbar loses its navy */
  "snack-white": ".pa-snack { background: #ffffff !important; }",
  /* S8 — the + turns rust */
  "plus-rust": ".pa-plus { background: #b4553f !important; }",
  /* S9 — the phone's tab bar shown at every width */
  "desk-bar": ".pa-tabbar { display: flex !important; }",
};

const SUPPRESS = "*, *::before, *::after { transition: none !important; animation: none !important; }";

export async function prime(page: Page, opts: { motion?: boolean } = {}) {
  await page.addInitScript(([ms]) => {
    try { localStorage.setItem("scriptally_active_manuscript_id", ms); } catch { /* private mode */ }
  }, [MS] as const);
  await page.addInitScript(([css]) => {
    const put = () => { const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st); };
    if (document.head) put(); else document.addEventListener("DOMContentLoaded", put);
  }, [`${opts.motion ? "" : SUPPRESS}\n${CSS_MUTATIONS[MUT] ?? ""}`] as const);
}

/** opens a route at a phone size (signing in at 1440 first) */
export async function openPhone(page: Page, path: string, vp: VP, opts: { motion?: boolean } = {}) {
  await prime(page, opts);
  await openRoute(page, "/dashboard", { width: 1440, height: 900 });
  await page.setViewportSize(vp);
  await page.goto(path);
  await page.locator('[data-pa="band"]').first().waitFor({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
}

/**
 * THE COLOUR LAWS, over every visible element on the page and its phone layers: text whose nearest painted ground is
 * navy is white; text on blush or blush wash is ink; no green and no red fill or text anywhere (`allowBurgundy` lets the
 * one celebration stamp through). Returns how many navy and blush grounds it judged, so a sweep over nothing is visible.
 */
export const colourSweep = (page: Page, opts: { allowBurgundy?: boolean; roots?: string } = {}) => page.evaluate((o) => {
  const rgba = (s: string) => (s.match(/[\d.]+/g) ?? []).map(Number);
  const opaque = (s: string) => { const v = rgba(s); return v.length >= 3 && (v[3] ?? 1) > 0.85; };
  const isNavy = (s: string) => /^rgba?\(42, 58, 82/.test(s);
  const isBlush = (s: string) => /^rgba?\((232, 200, 188|245, 230, 223)/.test(s);
  const ink = (s: string) => { const [r, g, b] = rgba(s); return r < 70 && g < 70 && b < 80; };
  const greenOrRed = (s: string) => {
    const [r, g, b, a = 1] = rgba(s);
    if (a < 0.6) return null;
    const burg = r > 100 && r < 140 && g < 70 && b < 60; // #7c3a2a
    if (r > 150 && g < 110 && b < 100 && r - g > 60) return "red";
    if (burg) return o.allowBurgundy ? null : "burgundy";
    if (g > 120 && g - r > 35 && g - b > 25) return "green";
    return null;
  };
  const out = { navy: 0, blush: 0, bad: [] as string[] };
  const name = (e: Element) => `${e.tagName.toLowerCase()}.${String(typeof (e as HTMLElement).className === "string" ? (e as HTMLElement).className : e.getAttribute("class") ?? "").split(" ").slice(0, 2).join(".")}`;
  const ground = (el: Element): string => {
    for (let x: Element | null = el; x; x = x.parentElement) { const bg = getComputedStyle(x).backgroundColor; if (opaque(bg)) return bg; }
    return "rgb(255, 255, 255)";
  };
  const roots = [...document.querySelectorAll<HTMLElement>(o.roots ?? ".ws-wbody, .pa-layer, .pa-tabbar")];
  const seen = new Set<Element>();
  for (const root of roots) for (const el of [root, ...root.querySelectorAll<HTMLElement>("*")]) {
    if (seen.has(el)) continue; seen.add(el);
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.opacity === "0") continue;
    const fillBad = greenOrRed(cs.backgroundColor);
    if (fillBad) out.bad.push(`${fillBad} fill on ${name(el)} (${cs.backgroundColor})`);
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? "").trim());
    if (!hasText) continue;
    const textBad = greenOrRed(cs.color);
    if (textBad) out.bad.push(`${textBad} text on ${name(el)} (${cs.color})`);
    const g = ground(el);
    if (isNavy(g)) { out.navy++; if (cs.color !== "rgb(255, 255, 255)" && !/rgba\(255, 255, 255/.test(cs.color)) out.bad.push(`text on navy is not white: ${name(el)} "${(el.textContent ?? "").trim().slice(0, 20)}" (${cs.color})`); }
    else if (isBlush(g)) { out.blush++; if (!ink(cs.color)) out.bad.push(`text on blush is not ink: ${name(el)} (${cs.color})`); }
  }
  return out;
}, opts);

/** the image sources on screen in each layer (the page when no sheet is open, and each phone layer) */
export const imageSweep = (page: Page) => page.evaluate(() => {
  const vis = (e: Element) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const srcs = (root: Element) => [...root.querySelectorAll<HTMLImageElement>("img")].filter(vis).map((i) => new URL(i.src).pathname);
  const sets: string[][] = [];
  const root = document.getElementById("root");
  if (root && !root.inert) sets.push(srcs(root));
  for (const l of document.querySelectorAll(".pa-sheet-layer")) sets.push(srcs(l));
  return sets;
});

export async function shot(page: Page, part: string, name: string) {
  if (!process.env.PA2_SHOTS) return;
  mkdirSync(`${DIR}/${part}/shots`, { recursive: true });
  writeFileSync(`${DIR}/${part}/shots/${name}.png`, await page.screenshot());
}
