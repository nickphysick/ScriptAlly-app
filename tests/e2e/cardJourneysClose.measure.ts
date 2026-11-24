/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Card journeys v1, Phase 3 — CLOSE, on the rendered page at 1440 × 900 (design-refs/card-journeys-v1 screens 12–20):
 *
 *   X1  "Why are you closing it?" with "Queried {date}, {n} days ago." and three rows; "No reply" goes straight to the
 *       review (no When step): the card in the closed colour (No Response), the reminder line, Add a note, active −1 /
 *       closed +1, "Close query"; the finish "Closed." / "{n} queries still out.", "{First}'s query is closed.",
 *       "It's marked as no reply. A reply later reopens it.", stamp "Closed"; Undo restores
 *   X2  "I withdrew it": the track gains When, "When did you withdraw it?"; the card reads Withdrawn; "It's marked as
 *       withdrawn."; Undo restores
 *   X3  "{First} passed" hands over to Record a response in the SAME panel, Passed chosen, at "When did {First} reply?"
 *
 * ⚠️ EMULATOR ONLY: `npm run e2e:emu -- tests/e2e/cardJourneysClose.measure.ts --project=measure`.
 */
import { test, type Page } from "@playwright/test";
import { C, Ledger, cutOff, openCardWithDoor, pressDoor, text, trackOf } from "./cardJourneysLib";

const settle = (page: Page, ms = 500) => page.waitForTimeout(ms);
const head = (page: Page) => text(page, '[data-cj="root"] .flh-t');

async function review(page: Page, L: Ledger, tag: string, status: string) {
  L.check(`${tag} · the review`, (await text(page, C("q"))) === "Ready to close it?", await text(page, C("q")));
  const pv = await page.locator(`${C("preview")} [data-qc154="card"]`).first().getAttribute("data-status");
  L.check(`${tag} · the card as it will be`, pv === status, `preview status ${pv}`);
  const line = await text(page, C("nudge-off"));
  L.check(`${tag} · the reminder line`, /^Any reminder to nudge .+ comes off your to-do list\.$/.test(line), `"${line}"`);
  const counts = await page.locator(C("count")).evaluateAll((els) => els.map((e) => `${e.getAttribute("data-k")}${e.getAttribute("data-d")}`));
  L.check(`${tag} · active −1, closed +1`, counts.join(" ") === "active-1 closed1", counts.join(" "));
  L.check(`${tag} · Add a note, "Close query"`, (await page.locator(C("add-note")).count()) === 1 && (await text(page, C("save"))).startsWith("Close query"), await text(page, C("save")));
  L.check(`${tag} · nothing cut off at 1440 × 900`, (await cutOff(page)).length === 0, JSON.stringify(await cutOff(page)));
}
async function finish(page: Page, L: Ledger, tag: string, line: string) {
  await page.locator(C("save")).click();
  await page.locator('[data-cj="root"][data-step="done"]').waitFor({ timeout: 45_000 });
  await settle(page, 800);
  const h = await head(page);
  L.check(`${tag} · the head`, /^Closed\. ?\d+ quer(y|ies) still out\.$/.test(h), `"${h}"`);
  L.check(`${tag} · the big line`, /^.+’s query is closed\.$/.test(await text(page, C("done-head"))), await text(page, C("done-head")));
  L.check(`${tag} · the sentence`, (await text(page, C("done-line"))) === line, await text(page, C("done-line")));
  L.check(`${tag} · the stamp`, (await text(page, C("stamp"))).startsWith("Closed"), await text(page, C("stamp")));
  await page.locator(C("undo")).click();
  const back = await page.locator('[data-cj="root"][data-step="log"]').waitFor({ timeout: 45_000 }).then(() => true).catch(() => false);
  L.check(`${tag} · Undo brings back the review`, back, `review ${back}`);
}

test("card journeys v1 · Close: no reply", async ({ page }) => {
  test.setTimeout(240_000);
  page.on("console", (m) => { if (m.type() === "error") console.log(`  [console] ${m.text().slice(0, 300)}`); });
  const L = new Ledger("close-noreply");
  const id = await openCardWithDoor(page, "close");
  L.check("X1 · subject", !!id, id ?? "none");
  if (!id) { L.done(1); return; }
  await pressDoor(page, id, "close");
  L.check("X1 · the head", (await head(page)) === "Closing this one. Let’s log the details.", await head(page));
  L.check("X1 · why", (await text(page, C("q"))) === "Why are you closing it?" && /^Queried \d{1,2} [A-Z][a-z]{2}, \d+ days? ago\.$/.test(await text(page, C("sub"))), `${await text(page, C("q"))} / ${await text(page, C("sub"))}`);
  const rows = await page.locator(C("why")).evaluateAll((els) => els.map((e) => e.getAttribute("data-k")));
  L.check("X1 · three reasons", rows.join(" ") === "noreply withdraw passed", rows.join(" "));
  L.check("X1 · the track", (await trackOf(page)).join(" ") === "agent:done why:now log:todo", (await trackOf(page)).join(" "));
  await page.locator(`${C("why")}[data-k="noreply"]`).click(); await settle(page, 900);
  L.check("X1 · straight to the review", (await page.locator('[data-cj="root"][data-step="log"]').count()) === 1 && (await trackOf(page)).join(" ") === "agent:done why:done log:now", (await trackOf(page)).join(" "));
  await review(page, L, "X1", "No Response");
  await finish(page, L, "X1", "It’s marked as no reply. A reply later reopens it.");
  L.done(16);
});

test("card journeys v1 · Close: I withdrew it", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("close-withdrawn");
  const id = await openCardWithDoor(page, "close");
  L.check("X2 · subject", !!id, id ?? "none");
  if (!id) { L.done(1); return; }
  await pressDoor(page, id, "close");
  await page.locator(`${C("why")}[data-k="withdraw"]`).click(); await settle(page, 900);
  L.check("X2 · the track gains When", (await trackOf(page)).join(" ") === "agent:done why:done when:now log:todo", (await trackOf(page)).join(" "));
  L.check("X2 · when did you withdraw it", (await text(page, C("q"))) === "When did you withdraw it?", await text(page, C("q")));
  await page.locator(`${C("when")}[data-k="today"]`).click(); await settle(page, 900);
  await review(page, L, "X2", "Withdrawn");
  await finish(page, L, "X2", "It’s marked as withdrawn.");
  L.done(14);
});

test("card journeys v1 · Close: {First} passed hands over", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("close-passed");
  const id = await openCardWithDoor(page, "close");
  L.check("X3 · subject", !!id, id ?? "none");
  if (!id) { L.done(1); return; }
  await pressDoor(page, id, "close");
  const panel0 = await page.locator('[data-side-panel][data-rar="panel"]').count();
  await page.locator(`${C("why")}[data-k="passed"]`).click(); await settle(page, 900);
  const st = await page.evaluate(() => ({
    panels: document.querySelectorAll('[data-side-panel][data-rar="panel"]').length,
    journey: document.querySelector('[data-side-panel][data-rar="panel"]')?.getAttribute("data-journey"),
    rar: document.querySelector('[data-rar="root"]')?.getAttribute("data-step") ?? null,
    cj: !!document.querySelector('[data-cj="root"]'),
    reply: document.querySelector('[data-rar="step"][data-k="reply"]')?.textContent ?? "",
    q: document.querySelector('[data-rar="root"] .laq-qh')?.textContent ?? "",
  }));
  L.check("X3 · the same panel, now Record a response", panel0 === 1 && st.panels === 1 && st.journey === "response" && !st.cj, JSON.stringify(st));
  L.check("X3 · at When did {First} reply?, Passed chosen", st.rar === "when" && /^When did .+ reply\?$/.test(st.q) && /Passed/.test(st.reply), `${st.rar} · "${st.q}" · reply step "${st.reply}"`);
  L.done(3);
});
