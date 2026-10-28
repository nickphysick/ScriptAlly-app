/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v118.1 — the helpers shared by the DB118 locks and the report's shots (a spec may not import a spec).
 */
import { expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openDash as openDash105 } from "./db105Lib";

export const DIR = "reports/dashboard-v118";
export type VP = { width: number; height: number };
export const tag = (v: VP) => `${v.width}x${v.height}`;
export const MUT = process.env.DB118_MUTATE ?? "";

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

/** The in-page breaks: each is a lock's own named mutation, applied as a stylesheet after load. */
export const CSS_MUTATIONS: Record<string, string> = {
  "A1-no-fit": `.d116-stack { translate: 0 0 !important; }`,
  "D1-rust": `.d58 [data-d71="band"] { background: #a2452a !important; }`,
  "C1-focus-within": `.d58 .d105-fw.d116-tilt:focus-within { rotate: 0deg !important; }`,
};

/** Opens the dashboard as v105's locks do (everything seen, the account's own data) and applies a mutation. */
export async function openDash(page: Page, vp: VP, flags: Record<string, unknown> = {}) {
  await openDash105(page, vp, flags, CSS_MUTATIONS[MUT] ?? "");
}

/** The visible stack's placement: its anchor (style left/top), the on-screen shift, and the union of its painted boxes. */
export const stackPlacement = (page: Page) => page.evaluate(() => {
  const st = document.querySelector<HTMLElement>('[data-d116="stack"].is-on');
  if (!st) return null;
  const tr = (st.style.translate || "0px 0px").split(/\s+/).map((v) => parseFloat(v) || 0);
  const kids = [...st.querySelectorAll<HTMLElement>(":scope > .d116-rc, :scope > .d116-more")].map((e) => e.getBoundingClientRect());
  const u = kids.reduce((a, r) => ({ l: Math.min(a.l, r.left), t: Math.min(a.t, r.top), r: Math.max(a.r, r.right), b: Math.max(a.b, r.bottom) }), { l: Infinity, t: Infinity, r: -Infinity, b: -Infinity });
  return { ax: parseFloat(st.style.left), ay: parseFloat(st.style.top), dx: tr[0], dy: tr[1] ?? 0, u, vw: innerWidth, vh: innerHeight, kind: st.dataset.kind, more: Number(st.dataset.more) };
});

/** A point on a ring slice's arc: `frac` along it (0 = its start, 1 = its end), on the ring's own radius. */
export const slicePoint = (page: Page, card: string, seg: string, frac: number) => page.evaluate(([c, s, f]) => {
  const root = document.querySelector(`[data-d60="${c}"]`);
  const hit = root?.querySelector<SVGCircleElement>(`[data-d116="slice"][data-seg="${s}"]`);
  const svg = hit?.ownerSVGElement;
  if (!hit || !svg) return null;
  const b = svg.getBoundingClientRect();
  const len = parseFloat(String(hit.getAttribute("stroke-dasharray")).split(/[\s,]+/)[0]);
  const at = -parseFloat(String(hit.getAttribute("stroke-dashoffset")));
  const u = (at + len * f) / 100; // the arc's fraction of the circle, from 12 o'clock clockwise
  const ang = u * 2 * Math.PI - Math.PI / 2;
  const scale = b.width / 100;
  const x = b.left + (50 + 42 * Math.cos(ang)) * scale, y = b.top + (50 + 42 * Math.sin(ang)) * scale;
  const top = document.elementFromPoint(x, y);
  return { x, y, len, hitIsSlice: top === hit };
}, [card, seg, frac] as const);
