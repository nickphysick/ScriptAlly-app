/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Card journeys v1, Phase 5 — REOPEN, on the rendered page at 1440 × 900 (design-refs/card-journeys-v1 screens 30–37):
 *
 *   R1  "Why reopen it?" / "Closed {date}: {the reason}." — I closed it too soon ("It goes back to {state}, as it was."),
 *       {First} replied after all; "How long will you give {First}?" with "Give it another" (1–26 weeks, No reminder)
 *       and "We'll remind you to nudge on {day}."
 *   R2  the review: the card back at its state before the close (not a closed status), the nudge task, active +1 /
 *       closed −1, "Reopen query"; the finish "Reopened." / "{n} queries are out.", "{First}'s query is open again.",
 *       the nudge sentence, stamp "Reopened"; Undo restores
 *   R3  No reminder: "There's no reminder set." on the step and the finish, no task row
 *   R4  "{First} replied after all" hands over to Record a response in the same panel, at "What did {First} say?"
 *
 * ⚠️ EMULATOR ONLY: `npm run e2e:emu -- tests/e2e/cardJourneysReopen.measure.ts --project=measure`.
 */
import { test, type Page } from "@playwright/test";
import { C, Ledger, cutOff, openCardWithDoor, pressDoor, text, trackOf } from "./cardJourneysLib";

const settle = (page: Page, ms = 500) => page.waitForTimeout(ms);
const head = (page: Page) => text(page, '[data-cj="root"] .flh-t');
const CLOSED = ["Rejected", "No Response", "Withdrawn"];

for (const reminder of [true, false]) {
  test(`card journeys v1 · Reopen: too soon, ${reminder ? "with a reminder" : "no reminder"}`, async ({ page }) => {
    test.setTimeout(240_000);
    page.on("console", (m) => { if (m.type() === "error") console.log(`  [console] ${m.text().slice(0, 300)}`); });
    const L = new Ledger(`reopen-${reminder ? "nudge" : "none"}`);
    const id = await openCardWithDoor(page, "reopen");
    L.check("R1 · subject", !!id, id ?? "none");
    if (!id) { L.done(1); return; }
    await pressDoor(page, id, "reopen");
    L.check("R1 · the head", (await head(page)) === "Opening this one back up. Let’s log the details.", await head(page));
    L.check("R1 · why reopen it", (await text(page, C("q"))) === "Why reopen it?" && /^Closed \d{1,2} [A-Z][a-z]{2}: .+\.$/.test(await text(page, C("sub"))), `${await text(page, C("q"))} / ${await text(page, C("sub"))}`);
    const soon = await text(page, `${C("why")}[data-k="soon"]`);
    L.check("R1 · too soon says where it goes back to", /It goes back to .+, as it was\./.test(soon), soon);
    await page.locator(`${C("why")}[data-k="soon"]`).click(); await settle(page, 900);
    L.check("R1 · how long will you give", /^How long will you give .+\?$/.test(await text(page, C("q"))) && (await text(page, C("sub"))) === "The old reply date has passed, so set a new reminder.", await text(page, C("q")));
    L.check("R1 · the slider", /^We’ll remind you to nudge on .+\.$/.test(await text(page, C("slider-note"))), await text(page, C("slider-note")));
    if (!reminder) {
      await page.locator(`${C("slider")} .sa-wk-unkbtn`).click(); await settle(page);
      L.check("R3 · no reminder on the step", (await text(page, C("slider-note"))) === "There’s no reminder set.", await text(page, C("slider-note")));
    }
    await page.locator(C("go")).click(); await settle(page, 900);
    L.check("R2 · the track", (await trackOf(page)).join(" ") === "agent:done why:done nudge:done log:now", (await trackOf(page)).join(" "));
    L.check("R2 · the review", (await text(page, C("q"))) === "Ready to reopen it?", await text(page, C("q")));
    const pv = await page.locator(`${C("preview")} [data-qc154="card"]`).first().getAttribute("data-status");
    L.check("R2 · the card back where it stood", !!pv && !CLOSED.includes(pv), `preview status ${pv}`);
    L.check(`R2 · ${reminder ? "the nudge task" : "no task"}`, (await page.locator(C("task")).count()) === (reminder ? 1 : 0), `${await page.locator(C("task")).count()} task rows`);
    const counts = await page.locator(C("count")).evaluateAll((els) => els.map((e) => `${e.getAttribute("data-k")}${e.getAttribute("data-d")}`));
    L.check("R2 · active +1, closed −1", counts.join(" ") === "active1 closed-1", counts.join(" "));
    L.check("R2 · Reopen query", (await text(page, C("save"))).startsWith("Reopen query"), await text(page, C("save")));
    L.check("R2 · nothing cut off at 1440 × 900", (await cutOff(page)).length === 0, JSON.stringify(await cutOff(page)));
    await page.locator(C("save")).click();
    await page.locator('[data-cj="root"][data-step="done"]').waitFor({ timeout: 45_000 });
    await settle(page, 800);
    L.check("R2 · the head", /^Reopened\. ?\d+ quer(y is|ies are) out\.$/.test(await head(page)), await head(page));
    L.check("R2 · the big line", /^.+’s query is open again\.$/.test(await text(page, C("done-head"))), await text(page, C("done-head")));
    L.check("R2 · the sentence", reminder ? /^We’ll remind you to nudge on .+\.$/.test(await text(page, C("done-line"))) : (await text(page, C("done-line"))) === "There’s no reminder set.", await text(page, C("done-line")));
    L.check("R2 · the stamp", (await text(page, C("stamp"))).startsWith("Reopened"), await text(page, C("stamp")));
    await page.locator(C("undo")).click();
    const back = await page.locator('[data-cj="root"][data-step="log"]').waitFor({ timeout: 45_000 }).then(() => true).catch(() => false);
    L.check("R2 · Undo brings back the review", back, `review ${back}`);
    L.done(16);
  });
}

test("card journeys v1 · Reopen: {First} replied after all hands over", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("reopen-replied");
  const id = await openCardWithDoor(page, "reopen");
  L.check("R4 · subject", !!id, id ?? "none");
  if (!id) { L.done(1); return; }
  await pressDoor(page, id, "reopen");
  await page.locator(`${C("why")}[data-k="replied"]`).click(); await settle(page, 900);
  const st = await page.evaluate(() => ({
    panels: document.querySelectorAll('[data-side-panel][data-rar="panel"]').length,
    journey: document.querySelector('[data-side-panel][data-rar="panel"]')?.getAttribute("data-journey"),
    rar: document.querySelector('[data-rar="root"]')?.getAttribute("data-step") ?? null,
    cj: !!document.querySelector('[data-cj="root"]'),
    q: document.querySelector('[data-rar="root"] .laq-qh')?.textContent ?? "",
  }));
  L.check("R4 · the same panel, now Record a response", st.panels === 1 && st.journey === "response" && !st.cj, JSON.stringify(st));
  L.check("R4 · at What did {First} say?", st.rar === "reply" && /^What did .+ say\?$/.test(st.q), `${st.rar} · "${st.q}"`);
  L.done(3);
});
