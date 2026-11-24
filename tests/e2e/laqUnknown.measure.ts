/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Log a query · Unknown reply time v1 — THE WRITER'S UNKNOWN BEATS THE AGENT'S WEEKS (Nick's ruling, 24 Nov: match
 * Record a response v2.1.1). Over the Log a query fixture (tests/e2e/seedLaq2.mjs, written in `beforeAll`, removed in
 * `afterAll`): Harriet Vance's card says 8 weeks. The writer picks Unknown on the Nudge step.
 *
 *   U1  the review's card: "Reply expected by" / "No date yet", no window bar; the reminder the writer kept (Unknown counts
 *       it from the send) stays as its line, as the card draws it for any query with no date
 *   U2  logged: the logged screen's card says the same
 *   U3  Undo leaves no fixture query behind (seedLaq2 --state)
 *   U4  the control: Harriet with her card's 8 weeks still shows a date (unchanged)
 *
 * Every log is undone in the same run. ⚠️ EMULATOR ONLY:
 * `npm run e2e:emu -- tests/e2e/laqUnknown.measure.ts --project=measure`.
 */
import { expect, test, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { ensureSignedIn } from "./measure";

const OUT = "reports/log-a-query-unknown-v1";
const VP = { width: 1440, height: 900 };
const R = (p: Page) => p.locator('[data-qls="root"]');
const q = (p: Page, k: string) => p.locator(`[data-qls="${k}"]`);
const rows: { where: string; ok: boolean; detail: string }[] = [];
const check = (where: string, ok: unknown, detail: string) => { rows.push({ where, ok: !!ok, detail }); console.log(`  ${ok ? "✓" : "✗"} ${where} — ${detail}`); };

async function open(p: Page) {
  await p.evaluate(() => { try { localStorage.setItem("scriptally_active_manuscript_id", "laq2-ms"); } catch { /* none */ } });
  await p.goto("/dashboard");
  await p.waitForTimeout(300);
  const d = p.getByRole("button", { name: /^\+?\s*Log a query$/ }).locator("visible=true").first();
  await d.waitFor({ state: "visible", timeout: 60_000 });
  await d.click();
  await R(p).waitFor({ state: "visible", timeout: 30_000 });
  await p.waitForTimeout(350);
}
async function toNudge(p: Page) {
  await q(p, "find").fill("Harriet");
  const row = p.locator('[data-qls="agent"][data-id="laq2-hv"]');
  await row.waitFor({ state: "visible", timeout: 60_000 });
  await row.click();
  await p.locator('[data-qls="when-opt"][data-k="today"]').click();
  await q(p, "use-ask").click();
  await p.locator('[data-qls="how-opt"]').first().click();
  await p.waitForTimeout(400);
}
/** the Next box of the card in the panel (the review's or the logged screen's) */
const nextBox = (p: Page) => p.evaluate(() => {
  const root = document.querySelector('[data-qls="root"]');
  const nx = [...(root?.querySelectorAll('[data-qc154="fact"][data-k="next"]') ?? [])].pop();
  const t = (e: Element | null | undefined) => (e?.textContent ?? "").replace(/\s+/g, " ").trim();
  return { label: t(nx?.querySelector(".qc154-fl")), value: t(nx?.querySelector("b")), bar: !!nx?.querySelector('[data-qc154="window"]'),
    nudge: !!nx?.querySelector('[data-qc154="nudge-on"]'), box: t(nx) };
});
const noDate = (b: Awaited<ReturnType<typeof nextBox>>) => b.label === "Reply expected by" && b.value === "No date yet" && !b.bar;

test.use({ viewport: VP });
test.beforeAll(() => { execSync("node tests/e2e/seedLaq2.mjs --clean && node tests/e2e/seedLaq2.mjs", { stdio: "ignore", timeout: 90_000 }); });
test.afterAll(() => {
  execSync("node tests/e2e/seedLaq2.mjs --clean", { stdio: "ignore", timeout: 90_000 });
  mkdirSync(`${OUT}/ledger`, { recursive: true });
  writeFileSync(`${OUT}/ledger/U.json`, JSON.stringify(rows, null, 1));
});

test("U1–U4 · Unknown on the Nudge step beats the agent's weeks", async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto("/dashboard");
  await ensureSignedIn(page);
  /* U4 — the control: the card's 8 weeks, untouched */
  await open(page);
  await toNudge(page);
  await q(page, "nudge-continue").click();
  await R(page).locator('[data-qc154="fact"][data-k="next"]').last().waitFor({ timeout: 15_000 });
  const ctl = await nextBox(page);
  check("U4 the control: the card's weeks still give a date", ctl.label === "Reply expected by" && /\d/.test(ctl.value) && ctl.bar, ctl.box);
  await page.locator('[data-qc149f="close"]').first().click(); await page.waitForTimeout(300);
  if (await q(page, "leave-discard").isVisible().catch(() => false)) await q(page, "leave-discard").click();
  await R(page).waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});
  /* U1 — Unknown */
  await open(page);
  await toNudge(page);
  await page.locator('[data-qls="weeks"] .sa-wk-unkbtn').click();
  await page.waitForTimeout(300);
  const by = ((await q(page, "reply-by").textContent()) ?? "").trim();
  check("U1 the Nudge step says there is no reply date", by.startsWith("No reply date"), by);
  await q(page, "nudge-continue").click();
  await R(page).locator('[data-qc154="fact"][data-k="next"]').last().waitFor({ timeout: 15_000 });
  const rv = await nextBox(page);
  check("U1 the review's card: Reply expected by / No date yet, no bar", noDate(rv), rv.box);
  check("U1 the reminder the writer kept is its line", rv.nudge && /^Nudge on /.test(rv.box.replace(/^Reply expected byNo date yet/, "")), rv.box);
  /* U2 — logged */
  await q(page, "log").click();
  await q(page, "yay").waitFor({ state: "visible", timeout: 30_000 });
  await page.waitForTimeout(1500);
  const lg = await nextBox(page);
  check("U2 the logged screen's card: the same", noDate(lg), lg.box);
  /* U3 — Undo removes the log */
  await q(page, "undo").click();
  await expect(R(page)).toHaveAttribute("data-step", "check", { timeout: 30_000 });
  await page.locator('[data-qc149f="close"]').first().click(); await page.waitForTimeout(300);
  if (await q(page, "leave-discard").isVisible().catch(() => false)) await q(page, "leave-discard").click();
  await page.waitForTimeout(1200);
  const left = (JSON.parse(execSync("node tests/e2e/seedLaq2.mjs --state", { timeout: 60_000 }).toString().trim().split("\n").pop()!) as { queries: unknown[] }).queries.length;
  check("U3 Undo leaves no fixture query behind", left === 0, `${left} left`);
  expect(rows.length).toBeGreaterThanOrEqual(5);
  expect(rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
});
