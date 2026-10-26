/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v77 — the measurement helpers shared by the DB77 locks and the report's shots
 * (a spec may not import another spec).
 */
import { expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

export const DIR = "reports/dashboard-v77";
export type VP = { width: number; height: number };
export const tag = (v: VP) => `${v.width}x${v.height}`;
export const MUT = process.env.DB77_MUTATE ?? "";

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
  "A1-body": `.d58[data-mode="q"] .d58-body { container-type: inline-size !important; } .d58[data-mode="q"] .d58-left { grid-template-rows: clamp(300px, 31cqw, 540px) auto !important; }`,
  "A1-fill": `.d58[data-mode="q"] .d58-left { grid-template-rows: minmax(140px, 1fr) auto !important; }`,
  "A3-fw-fixed": `.d71-fwslot > [data-d58="panel"] { flex: none !important; height: 194px !important; }`,
  "C1-no-variant": `.d77-fwframe > .d77-lg { display: none !important; } .d77-fwframe > .d77-sm { display: flex !important; }`,
  "C2-wide-art": `.d77-sm .d77-art { display: block !important; width: 150px !important; }`,
  "C4-green": `.d58 .d77-row.is-read .d77-pill { background: #5c8a4f !important; }`,
  "A4-uncapped": `.d58 .d58-page { max-width: none !important; }`,
};

export async function openDash(page: Page, vp: VP, flags: Record<string, unknown> = {}, ms = "seed-ms-1") {
  await page.addInitScript(([f, m]) => {
    Object.assign(window, f);
    try { localStorage.setItem("scriptally_active_manuscript_id", m as string); } catch { /* private mode */ }
  }, [flags, ms] as const);
  await openRoute(page, "/dashboard", vp);
  await page.locator('[data-d58="page"][data-loading="0"]').first().waitFor({ timeout: 25_000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  if (CSS_MUTATIONS[MUT]) await page.addStyleTag({ content: CSS_MUTATIONS[MUT] });
  await page.mouse.move(2, 2);
  await page.waitForTimeout(700);
}


const D = (iso: string) => Date.parse(iso);
/**
 * THE FIXTURE RECORD, handed to the card through the dev-only `window.__SA_FEEDBACK_ROWS` review aid
 * (lib/feedbackRecord): nothing a client can do creates a `betaFeedback` doc, and the harness account has
 * none. Five docs, so a 380px card can prove four rows render and a shorter one three. The ref's own rows.
 */
export const FIXTURE_ROWS = [
  { id: "fx-1", kind: "An idea", message: "Let me snooze a nudge for a week", title: "Snooze a nudge", status: "built", statusAt: D("2026-10-20T10:00:00Z"), createdAt: D("2026-10-02T10:00:00Z") },
  { id: "fx-2", kind: "Something's broken", message: "Smart Import dropped an agent", title: "Smart Import keeps both agents at one agency", status: "fixed", statusAt: D("2026-10-17T10:00:00Z"), createdAt: D("2026-10-15T10:00:00Z") },
  { id: "fx-3", kind: "Something's confusing", message: "What does gone quiet mean?", title: "Explain what “gone quiet” means", status: "planned", createdAt: D("2026-10-09T10:00:00Z") },
  { id: "fx-4", kind: "Something I liked", message: "The chart is my favourite bit", status: "read", createdAt: D("2026-10-21T10:00:00Z") },
  { id: "fx-5", kind: "An idea", message: "A bulk nudge for everyone who has gone quiet", createdAt: D("2026-10-24T10:00:00Z") },
];

/** ⚠️ THE REAL `sendBetaFeedback` IS DEPLOYED ON DEV AND EMAILS NICK: every DB77 run answers it itself. */
export async function mockSend(page: Page, ok = true): Promise<{ calls: unknown[] }> {
  const calls: unknown[] = [];
  await page.context().route("**/sendBetaFeedback", async (r) => {
    try { calls.push(JSON.parse(r.request().postData() ?? "{}")); } catch { calls.push(null); }
    if (ok) await r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ result: { ok: true } }) });
    else await r.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: { status: "INTERNAL", message: "no" } }) });
  });
  return { calls };
}

export type FwState = "idle" | "write" | "sent";
/** Drive the founding card on the page to a state, through its visible layout. */
export async function driveFw(page: Page, st: FwState, text = "The calendar could show my send dates too.") {
  if (st === "idle") return;
  await page.locator('[data-d77="kind"]:visible').nth(2).click();
  await page.waitForTimeout(150);
  await page.locator('[data-d77="message"]:visible').fill(text);
  if (st === "sent") {
    await page.locator('[data-d77="send"]:visible').click();
    await page.locator('[data-d58="panel"][data-state="sent"]').first().waitFor({ timeout: 8000 });
  }
  await page.waitForTimeout(400);
}
