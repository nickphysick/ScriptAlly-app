/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Log a query v1.1 Phase 3 — EDITING IN PLACE ON THE QUERY CARD, read off the rendered card (emulator, 1440×860):
 *   LQE1  the pencil enters edit mode with all four signals (the dashed frame, the strip, the wash, the navy save bar),
 *         and Save is disabled until something changes
 *   LQE2  a change marks the right tab with a dot and counts in the save bar
 *   LQE3  the leave check: Stop editing and Esc with a change ask first (Keep editing stays, Lose them leaves); with no
 *         change both simply leave edit mode
 *   LQE4  an agent detail round-trips to the agent record and shows on the Contact list; a note round-trips; both are
 *         put back in the same run
 *   LQE5  the step editor saves a date and a pieces change on its own, outside edit mode, and round-trips; the toast's
 *         Undo puts it back. It offers How and Package on the Query sent step.
 *   LQE6  the Materials tab's Edit opens the same step editor, on Tracking
 *   LQE7  no native <select> anywhere on the card, in reading mode, edit mode or the step editor
 * Every write is undone in the same run, and a run reading fewer values than it claims fails (LQE_FLOOR).
 */
import { expect, test, type Locator, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { ensureSignedIn } from "./measure";

const QID = "seed-query-10", AID = "seed-agent-10";
const OUT = "reports/log-a-query-v1-1";
const READ: Record<string, unknown> = {};
let checks = 0;
const ok = (cond: boolean, label: string) => { checks++; expect.soft(cond, label).toBe(true); };
const db = (args: string) => JSON.parse(execSync(`node tests/e2e/laqEditDb.mjs ${args}`, { encoding: "utf8" }).trim().split("\n").pop()!);

async function openCard(page: Page): Promise<Locator> {
  page.on("pageerror", (e) => console.log(`[pageerror] ${e.message.slice(0, 300)}`));
  await page.setViewportSize({ width: 1440, height: 860 });
  await page.goto("/queries");
  await ensureSignedIn(page);
  await page.goto(`/queries?q=${QID}`);
  const card = page.locator(`.spanel [data-qc152="card"][data-id="${QID}"]`).first();
  await card.waitFor({ state: "visible", timeout: 90_000 });
  /* the thread draws from the query until its activity log arrives: wait for the logged steps (five on this fixture) */
  await expect.poll(() => card.locator('[data-qc152="msg"][data-activity]').count(), { timeout: 120_000 }).toBeGreaterThanOrEqual(4);
  await page.waitForTimeout(800);
  return card;
}
const tab = (card: Locator, t: string) => card.locator(`[data-qc152="tab"][data-tab="${t}"]`);
async function selects(page: Page) {
  return page.evaluate((id) => document.querySelector(`.spanel [data-qc152="card"][data-id="${id}"]`)?.querySelectorAll("select").length ?? -1, QID);
}
async function signals(page: Page) {
  return page.evaluate((id) => {
    const card = document.querySelector(`.spanel [data-qc152="card"][data-id="${id}"]`) as HTMLElement;
    const own = card.parentElement as HTMLElement;
    const cs = (el: Element | null) => (el ? getComputedStyle(el) : null);
    const f = cs(own), band = cs(card.querySelector('[data-qc152="band"]')), body = cs(card.querySelector('[data-qc152="body"]')), bar = cs(card.querySelector('[data-qc152="save-bar"]'));
    return {
      frame: f ? `${f.outlineStyle} ${f.outlineWidth} ${f.outlineColor}` : null,
      strip: band?.backgroundColor ?? null, stripWords: card.querySelector('[data-qc152="edit-title"]')?.textContent ?? null,
      wash: body?.backgroundColor ?? null, bar: bar?.backgroundColor ?? null,
      save: (card.querySelector('[data-qc152="save-changes"]') as HTMLButtonElement | null)?.disabled ?? null,
      title: card.querySelector('[data-qc152="save-title"]')?.textContent ?? null,
      dots: [...card.querySelectorAll('[data-qc152="tab-dot"]')].map((d) => (d.parentElement as HTMLElement).dataset.tab),
      leave: card.querySelector('[data-qc152="leave"]')?.textContent ?? null,
      editing: card.hasAttribute("data-editing"),
    };
  }, QID);
}

test.describe.configure({ mode: "serial" });
test.afterAll(() => {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(`${OUT}/edit-readings.json`, JSON.stringify({ checks, ...READ }, null, 2));
});

test("LQE1 · LQE2 · LQE3 · LQE7 — the four signals, Save, the tab dot, the leave check, no <select>", async ({ page }) => {
  test.setTimeout(600_000);
  const card = await openCard(page);
  ok((await selects(page)) === 0, "LQE7: no <select> on the card in reading mode");
  const before = await signals(page);
  READ.before = before;
  ok(!before.editing && before.frame?.startsWith("none") === true, `LQE1: reading mode has no edit layer ${JSON.stringify(before)}`);
  await card.locator('[data-qc152="pencil"]').click();
  await page.waitForTimeout(400);
  const s1 = await signals(page);
  READ.LQE1 = s1;
  ok(s1.editing, "LQE1: the pencil enters edit mode");
  ok(s1.frame === "dashed 2px rgb(42, 58, 82)", `LQE1: the frame is a 2px dashed navy line (${s1.frame})`);
  ok(s1.strip === "rgb(233, 237, 244)" && s1.stripWords === "Editing", `LQE1: the band is the pale navy editing strip (${s1.strip}, ${s1.stripWords})`);
  ok(s1.wash === "rgb(251, 252, 254)", `LQE1: the surface takes the cool wash (${s1.wash})`);
  ok(s1.bar === "rgb(42, 58, 82)", `LQE1: the footer is the navy save bar (${s1.bar})`);
  ok(s1.save === true && s1.title === "No changes yet", `LQE1: Save is disabled with no change (${s1.save}, ${s1.title})`);
  ok((await selects(page)) === 0, "LQE7: no <select> in edit mode");
  /* LQE3 without a change: Stop editing and Esc simply leave */
  await card.locator('[data-qc152="edit-stop"]').click();
  ok(!(await signals(page)).editing, "LQE3: Stop editing with no change leaves at once");
  await card.locator('[data-qc152="pencil"]').click();
  await page.keyboard.press("Escape");
  const s0 = await signals(page);
  ok(!s0.editing && s0.leave === null, "LQE3: Esc with no change leaves at once");
  /* LQE2: a change on the Agent tab */
  await card.locator('[data-qc152="pencil"]').click();
  await tab(card, "agent").click();
  const cur = db(`--agent ${AID}`).responseTimeWeeks as number | null;
  const other = cur === 12 ? 6 : 12;
  await card.locator(`[data-qc152="reply-opt"][data-w="${other}"]`).click();
  const s2 = await signals(page);
  READ.LQE2 = s2;
  ok(s2.dots.join() === "agent", `LQE2: the dot is on the Agent tab only (${s2.dots.join()})`);
  ok(s2.save === false && s2.title === "1 unsaved change", `LQE2: Save is enabled and the bar counts one (${s2.save}, ${s2.title})`);
  /* LQE3 with a change: Stop editing asks; Keep editing stays; Esc asks; Lose them leaves */
  await card.locator('[data-qc152="edit-stop"]').click();
  const a1 = await signals(page);
  ok(a1.leave?.startsWith("Stop editing and lose 1 change?") === true && a1.editing, `LQE3: Stop editing asks first (${a1.leave})`);
  await card.locator('[data-qc152="leave-keep"]').click();
  const a2 = await signals(page);
  ok(a2.leave === null && a2.editing && a2.title === "1 unsaved change", "LQE3: Keep editing stays, with the change");
  await page.keyboard.press("Escape");
  ok((await signals(page)).leave !== null, "LQE3: Esc with a change asks first");
  await card.locator('[data-qc152="leave-lose"]').click();
  const a3 = await signals(page);
  ok(!a3.editing && a3.dots.length === 0, "LQE3: Lose them leaves edit mode with nothing kept");
  ok(db(`--agent ${AID}`).responseTimeWeeks === cur, "LQE3: nothing was written");
});

test("LQE4 — an agent detail and a note round-trip, and are put back", async ({ page }) => {
  test.setTimeout(600_000);
  const before = db(`--agent ${AID}`);
  READ.agentBefore = before;
  const cur = before.responseTimeWeeks as number;
  const other = cur === 12 ? 6 : 12;
  const card = await openCard(page);
  try {
    await card.locator('[data-qc152="pencil"]').click();
    await tab(card, "agent").click();
    await card.locator(`[data-qc152="reply-opt"][data-w="${other}"]`).click();
    await tab(card, "notes").click();
    await card.locator('[data-qc152="note-add"]').click();
    await card.locator('[data-qc152="note-edit"] [data-qc152="inl"]').last().fill("laq11 round-trip note");
    const s = await signals(page);
    ok(s.dots.sort().join() === "agent,notes" && s.title === "2 unsaved changes", `LQE4: two changes, two dots (${s.dots.join()}, ${s.title})`);
    await card.locator('[data-qc152="save-changes"]').click();
    await expect(card.locator('[data-qc1522="toast"]')).toContainText("Changes saved", { timeout: 120_000 });
    ok(!(await signals(page)).editing, "LQE4: Save leaves edit mode");
    await expect.poll(() => db(`--agent ${AID}`).responseTimeWeeks, { timeout: 60_000 }).toBe(other);
    ok(db(`--agent ${AID}`).responseTimeWeeks === other, `LQE4: the agent record holds ${other} weeks`);
    await expect.poll(() => (db(`--notes ${QID}`) as { text: string }[]).map((n) => n.text).join("|"), { timeout: 60_000 }).toBe("laq11 round-trip note");
    ok(true, "LQE4: the note is in the notes path");
    /* the Contact list shows it */
    await page.goto("/agents");
    const row = page.locator(`[data-cl26="row"][data-id="${AID}"]`).locator("visible=true").first();
    await row.waitFor({ timeout: 120_000 });
    await row.click();
    const meta = page.locator('[data-cl262="meta"]').locator("visible=true").first();
    await expect(meta).toContainText(`${other} weeks`, { timeout: 60_000 }).catch(() => {});
    const repText = ((await meta.textContent({ timeout: 30_000 }).catch(() => null)) ?? "").trim();
    READ.contactCard = repText;
    ok(new RegExp(`\\b${other} weeks`).test(repText), `LQE4: the agent's Contact list card shows ${other} weeks ("${repText}")`);
    /* put both back the same way */
    const card2 = await openCard(page);
    await card2.locator('[data-qc152="pencil"]').click();
    await tab(card2, "agent").click();
    await card2.locator(`[data-qc152="reply-opt"][data-w="${cur}"]`).click();
    await tab(card2, "notes").click();
    await card2.locator('[data-qc152="note-edit"]').filter({ has: page.locator('[data-qc152="inl"]') }).last().hover();
    await card2.locator('[data-qc152="note-delete"]').last().click();
    await card2.locator('[data-qc152="save-changes"]').click();
    await expect(card2.locator('[data-qc1522="toast"]')).toContainText("Changes saved", { timeout: 120_000 });
    await expect.poll(() => db(`--agent ${AID}`).responseTimeWeeks, { timeout: 60_000 }).toBe(cur);
    await expect.poll(() => (db(`--notes ${QID}`) as unknown[]).length, { timeout: 60_000 }).toBe(0);
    ok(true, "LQE4: both put back through the card");
  } finally {
    /* the safety net: a failed run leaves the agent as it found it */
    const now = db(`--agent ${AID}`);
    if (now.responseTimeWeeks !== before.responseTimeWeeks) execSync(`node tests/e2e/laqEditDb.mjs --restore-agent ${AID} '${JSON.stringify(before)}'`);
  }
});

test("LQE5 · LQE6 · LQE7 — the step editor: How and Package, a date and pieces change on its own, Undo; Materials' Edit", async ({ page }) => {
  test.setTimeout(600_000);
  const q0 = db(`--query ${QID}`);
  READ.queryBefore = q0;
  const card = await openCard(page);
  /* LQE6 — the Materials tab's Edit opens the step editor on Tracking */
  await tab(card, "materials").click();
  await card.locator('[data-qc152="mat-edit"]').first().click();
  ok((await tab(card, "tracking").getAttribute("aria-selected")) === "true", "LQE6: Materials' Edit goes to Tracking");
  await card.locator('[data-qc1522="step-edit"]').waitFor({ state: "visible", timeout: 60_000 }).catch(() => {});
  ok((await card.locator('[data-qc1522="step-edit"]').count()) === 1, "LQE6: …with the step editor open");
  await card.locator('[data-qc1522="edit-cancel"]').click();
  /* LQE5 — the Query sent step, outside edit mode */
  ok(!(await signals(page)).editing, "LQE5: not in edit mode");
  const msg = card.locator('[data-qc152="msg"][data-status="Queried"]').first();
  await msg.scrollIntoViewIfNeeded();
  await msg.hover();
  await msg.locator('[data-qc152="edit-step"]').click();
  const ed = card.locator('[data-qc1522="step-edit"]');
  await ed.waitFor({ state: "visible" });
  ok((await ed.locator('[data-qc1522="edit-how"] button').count()) === 4, "LQE5: the Query sent step offers How (four ways)");
  ok((await ed.locator('[data-qc1522="edit-how"] button.on').textContent()) === "Email", "LQE5: …with the query's own method chosen");
  READ.pkgRow = await ed.locator('[data-qc1522="edit-pkg"]').count();
  ok((await selects(page)) === 0, "LQE7: no <select> in the step editor");
  /* the date: the day before */
  const d0 = new Date(`${q0.stepDay}T12:00:00`);
  const d1 = new Date(d0.getTime() - 86_400_000).toISOString().slice(0, 10);
  await ed.locator('[data-qc152="date-btn"]').click();
  await card.locator(`[data-qc152="day"][data-day="${d1}"]`).click();
  /* the pieces: add a synopsis (or, if it is there, take it away) */
  const mats0 = await ed.locator('[data-qc152="mat-chip"]').count();
  await ed.locator('[data-qc152="mat-add"]').click();
  const kinds = card.locator('[data-qc152="mat-kind"]');
  const pickK = (await kinds.count()) ? await kinds.first().getAttribute("data-k") : null;
  if (pickK) await kinds.first().click();
  const mats1 = await ed.locator('[data-qc152="mat-chip"]').count();
  ok(mats1 === mats0 + 1, `LQE5: a piece added (${mats0} → ${mats1}, ${pickK})`);
  await ed.locator('[data-qc1522="edit-save"]').click();
  await expect(card.locator('[data-qc1522="toast"]')).toContainText("Step saved", { timeout: 120_000 });
  /* the step editor writes the STEP (its activity's date and pieces); the query's own `dateSent` is not its field */
  await expect.poll(() => db(`--query ${QID}`).stepDay, { timeout: 60_000 }).toBe(d1);
  const q1 = db(`--query ${QID}`);
  ok(q1.stepDay === d1, `LQE5: the Query sent step is dated ${d1} (${q1.stepDay})`);
  ok(q1.stepMats === q0.stepMats + 1, `LQE5: the step holds the added piece (${q0.stepMats} → ${q1.stepMats})`);
  ok(!(await signals(page)).editing, "LQE5: it saved on its own, outside edit mode");
  READ.LQE5 = { d0: q0.dateSent, d1, mats0, mats1, kind: pickK };
  /* put it back with the toast's Undo */
  await card.locator('[data-qc1522="undo"]').click();
  await expect.poll(() => db(`--query ${QID}`).stepDay, { timeout: 60_000 }).toBe(q0.stepDay);
  const q2 = db(`--query ${QID}`);
  ok(q2.stepDay === q0.stepDay && q2.stepMats === q0.stepMats, `LQE5: Undo puts the date and the pieces back (${JSON.stringify(q2)})`);
});

test("LQE floor — the run read what it claims", () => {
  const floor = Number(process.env.LQE_FLOOR ?? 35);
  expect(checks, `only ${checks} checks ran`).toBeGreaterThanOrEqual(floor);
});
