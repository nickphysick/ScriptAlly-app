/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Card journeys v1 — the measurement helpers the journey specs share: find a card whose footer offers an action, press
 * it, and read the card and the journey as stacked.
 */
import { expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openApp } from "./pageHeaderV2Lib";

export const VP = { width: 1440, height: 900 };
const settle = (page: Page, ms = 500) => page.waitForTimeout(ms);

/** the four doors: the statuses whose card offers the action, and the footer's button words */
export const DOORS = {
  send: { statuses: ["Partial Requested", "Full Requested", "Revise & Resubmit"], label: /^Mark (partial |full )?(sent|resubmitted)/ },
  close: { statuses: ["Queried", "Partial Sent", "Full Sent"], label: /^Close it/ },
  offer: { statuses: ["Offer"], label: /^(Answer the offer|Accept or decline)/ },
  reopen: { statuses: ["No Response", "Withdrawn", "Rejected"], label: /^Reopen/ },
} as const;
export type DoorKind = keyof typeof DOORS;

/** open the Queries page, then each candidate card in turn until its footer offers the action; returns its id */
export async function openCardWithDoor(page: Page, k: DoorKind, statuses?: readonly string[]): Promise<string | null> {
  await openApp(page, "/queries", VP);
  const d = DOORS[k];
  const ids: string[] = [];
  /* closed queries sit in a folded section: unfold every fold first */
  for (let i = 0; i < 6; i++) {
    const more = page.locator('[data-qc153="show-all"]').filter({ visible: true });
    if (!(await more.count())) break;
    await more.first().click(); await settle(page, 400);
  }
  for (const st of statuses ?? d.statuses) {
    const cards = page.locator(`[data-qc154="card"][data-status="${st}"]:not([data-preview])`);
    for (const id of await cards.evaluateAll((els) => els.map((e) => e.getAttribute("data-id") ?? ""))) if (id && !id.startsWith("practice")) ids.push(id);
  }
  for (const id of ids.slice(0, 12)) {
    await page.goto(`/queries?q=${encodeURIComponent(id)}`);
    const panel = page.locator(`[data-qp="panel"][data-qp-id="${id}"]`);
    if (!(await panel.waitFor({ timeout: 10_000 }).then(() => true).catch(() => false))) continue;
    await settle(page, 600);
    const btn = panel.locator('[data-qc1522="footer"] button').filter({ hasText: d.label });
    if (await btn.count()) return id;
  }
  return null;
}
export async function pressDoor(page: Page, id: string, k: DoorKind) {
  await page.locator(`[data-qp="panel"][data-qp-id="${id}"] [data-qc1522="footer"] button`).filter({ hasText: DOORS[k].label }).first().click();
  await settle(page, 700);
}
/** the card's panel and the journey, as measured */
export async function readStack(page: Page, id: string) {
  return page.evaluate((qid) => {
    const card = document.querySelector<HTMLElement>(`[data-side-panel][data-qp="panel"][data-qp-id="${CSS.escape(qid)}"]`);
    const j = document.querySelector<HTMLElement>('[data-side-panel][data-rar="panel"]');
    const root = j?.querySelector<HTMLElement>('[data-cj="root"]') ?? null;
    const m = card ? new DOMMatrixReadOnly(getComputedStyle(card).transform === "none" ? undefined : getComputedStyle(card).transform) : null;
    const after = card ? getComputedStyle(card, "::after") : null;
    const head = root?.querySelector<HTMLElement>(".laq-top");
    return {
      card: !!card, under: card?.hasAttribute("data-under") ?? false, inert: card?.inert ?? false,
      scale: m ? Math.round(m.a * 1000) / 1000 : null, dx: m ? Math.round(m.e) : null, dim: after ? parseFloat(after.opacity) : null,
      journey: !!root, kind: root?.getAttribute("data-kind") ?? null, track: !!root?.querySelector('[data-cj="track"]'),
      composer: !!card?.querySelector('[data-qc1522="composer"]'),
      agent: (() => { const a = root?.querySelector('[data-cj="step"][data-k="agent"]'); return a ? { tag: a.tagName, state: a.getAttribute("data-state") } : null; })(),
      art: !!root?.querySelector('[data-cj="art"]'), headBg: head ? getComputedStyle(head).backgroundColor : null,
      path: location.pathname + location.search,
    };
  }, id);
}
/** Tab through the page: does focus ever land inside the card under the journey? */
export async function tabReachesCard(page: Page, id: string, presses = 30): Promise<boolean> {
  for (let i = 0; i < presses; i++) {
    await page.keyboard.press("Tab");
    const inCard = await page.evaluate((qid) => !!document.activeElement?.closest(`[data-qp="panel"][data-qp-id="${CSS.escape(qid)}"]`), id);
    if (inCard) return true;
  }
  return false;
}


const DIR = "reports/card-journeys-v1";
export const C = (k: string) => `[data-cj="root"] [data-cj="${k}"]`;
export class Ledger {
  rows: { where: string; ok: boolean; detail: string }[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ where, ok: !!ok, detail }); this.save(); console.log(`  ${ok ? "✓" : "✗"} ${where} — ${detail}`); }
  save() { mkdirSync(`${DIR}/ledger`, { recursive: true }); writeFileSync(`${DIR}/ledger/${this.name}.json`, JSON.stringify(this.rows, null, 1)); }
  done(floor: number) {
    this.save();
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}
export const text = (page: Page, sel: string) => page.locator(sel).first().innerText().then((t) => t.replace(/\s+/g, " ").trim()).catch(() => "");
export const trackOf = (page: Page) => page.locator(`${C("step")}`).evaluateAll((els) => els.map((e) => `${e.getAttribute("data-k")}:${e.getAttribute("data-state")}`));
/** nothing in the body or foot reaches past the column, and the column itself is inside the window */
export async function cutOff(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const root = document.querySelector<HTMLElement>('[data-cj="root"]');
    const body = root?.querySelector<HTMLElement>('[data-cj="body"]');
    if (!root || !body) return ["no journey"];
    const out: string[] = [];
    const rb = root.getBoundingClientRect();
    if (rb.right > innerWidth + 0.5 || rb.bottom > innerHeight + 0.5 || rb.left < -0.5) out.push(`column ${Math.round(rb.left)}–${Math.round(rb.right)} × ${Math.round(rb.bottom)}`);
    const bb = body.getBoundingClientRect();
    for (const el of body.querySelectorAll<HTMLElement>("b, span, p, h2, button, li")) {
      const r = el.getBoundingClientRect();
      if (r.width < 1) continue;
      if (r.right > bb.right + 1 || r.left < bb.left - 1) out.push(`${el.tagName} "${(el.innerText || "").slice(0, 30)}" ${Math.round(r.left)}–${Math.round(r.right)}`);
      if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).textOverflow === "ellipsis") out.push(`ellipsis "${(el.innerText || "").slice(0, 30)}"`);
    }
    return out.slice(0, 6);
  });
}

