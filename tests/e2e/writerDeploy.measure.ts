/**
 * ONE-OFF (holding-reply pack, Step 0) — has the `writerExpectedDate` RULES deploy landed on dev?
 *
 * The check is runtime because nothing else is honest: the rules file in git says what WILL be
 * deployed, and the success line of a deploy never names the database. So: commit a writer date
 * through the card's own control, wait for the server to accept or revert it, and read the card.
 * A denied write is reverted by the listener within a second or two; a landed one survives.
 *
 * Cleans up after itself: the toast's Undo restores the previous state (deleteField), and any
 * agent whose weeks were cleared to reach the offer is restored in a finally.
 *
 *   npx playwright test --project=measure writerDeploy
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

test("writerExpectedDate write is accepted by the deployed dev rules", async ({ page }) => {
  test.setTimeout(120000);
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  const rows = page.locator(".f12-row");
  await rows.first().click({ timeout: 8000 });
  await page.waitForTimeout(400);

  let found = -1;
  const n = Math.min(await rows.count(), 12);
  for (let i = 0; i < n; i++) {
    if (i >= await rows.count()) break;
    await rows.nth(i).click({ timeout: 6000 });
    await page.waitForTimeout(350);
    if (await page.locator(".tl-ask").count()) { found = i; break; }
  }

  let cleared: { agent: string; weeks: string } | null = null;
  try {
    if (found < 0) {
      const agent = await page.evaluate(() => {
        const t = (document.querySelector(".f12-row.f12-sel")?.textContent || "").replace(/\s+/g, " ");
        return (t.match(/[A-Z][a-z]+ [A-Z][a-z]+/) || [""])[0];
      });
      expect(agent, "could not read an agent name to clear").toBeTruthy();
      await openRoute(page, "/agents", { width: 1440, height: 900 });
      await page.waitForTimeout(1500);
      await page.locator(".agl-acard", { hasText: agent }).first().locator(".agl-pencil").click({ timeout: 8000 });
      await page.waitForTimeout(900);
      const weeks = (await page.locator("#agl-weeks").inputValue()).trim();
      await page.locator("#agl-weeks").fill("");
      await page.locator(".agl-done").click({ timeout: 8000 });
      await page.waitForTimeout(2000);
      cleared = { agent, weeks };
      console.log(`  cleared "${agent}"'s stated ${weeks} weeks to reach the offer`);
      await openRoute(page, "/queries", { width: 1440, height: 900 });
      await page.locator(".f12-row", { hasText: agent }).first().click({ timeout: 8000 });
      await page.waitForTimeout(700);
    }

    await page.locator(".tl-ask-a").click({ timeout: 8000 });
    await page.waitForTimeout(400);
    expect(await page.locator(".tl-setwin").count(), "the control did not open").toBe(1);
    const errors: string[] = [];
    page.on("console", (m) => { if (m.type() === "error" || /permission|denied|insufficient/i.test(m.text())) errors.push(m.text().slice(0, 200)); });
    await page.locator(".tl-setwin input[type=range]").focus();
    await page.keyboard.press("Enter"); // commit at the default value
    await page.waitForTimeout(1000);
    const early = await page.evaluate(() => (document.querySelector(".f12-pane")?.textContent || "").replace(/\s+/g, " ").slice(0, 600));
    console.log(`  +1s pane: ${early}`);
    await page.waitForTimeout(2500);    // long enough for a denied write to be reverted

    const after = await page.evaluate(() => {
      const card = document.querySelector(".tl-wait, .tl-track, .f12-pane") || document.body;
      const txt = (card.textContent || "").replace(/\s+/g, " ");
      return {
        youExpect: /you expect(ed)? a reply by/i.test(txt),
        toast: (document.querySelector(".sa-toast")?.textContent || "").replace(/\s+/g, " "),
        undoThere: !!document.querySelector(".sa-toast-undo"),
      };
    });
    console.log(`  after commit+3.5s · attribution says "you expect": ${after.youExpect} · toast "${after.toast}"`);
    const late = await page.evaluate(() => (document.querySelector(".f12-pane")?.textContent || "").replace(/\s+/g, " ").slice(0, 600));
    console.log(`  +3.5s pane: ${late}`);
    console.log(`  console errors: ${errors.length ? errors.join(" | ") : "none"}`);

    // Clean up the date we just set (works only if the write itself was allowed; harmless if not).
    if (after.undoThere) {
      await page.locator(".sa-toast-undo").click();
      await page.waitForTimeout(1500);
      console.log("  undone — writer date restored to its previous state");
    }

    expect(after.youExpect, "the writer-date write did NOT survive — rules deploy has not landed").toBe(true);
  } finally {
    if (cleared) {
      await openRoute(page, "/agents", { width: 1440, height: 900 });
      await page.waitForTimeout(1500);
      await page.locator(".agl-acard", { hasText: cleared.agent }).first().locator(".agl-pencil").click({ timeout: 8000 });
      await page.waitForTimeout(900);
      await page.locator("#agl-weeks").fill(cleared.weeks);
      await page.locator(".agl-done").click({ timeout: 8000 });
      await page.waitForTimeout(1500);
      console.log(`  restored "${cleared.agent}" to ${cleared.weeks} weeks`);
    }
  }
});
