/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ITEM 3 — the fix journey, on the deployed page. Does a housekeeping card open the journey in the
 * pane, and does its step count equal the agent's gap count rather than a padded four?
 *
 * ⚠️ IT STOPS BEFORE THE COMMIT. The write is `updateAgent` against the harness account's real
 * agents, so the primary is measured and never pressed.
 */
import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { resolve } from "node:path";

test.setTimeout(300_000);

test("item 3 — the fix journey's stack is derived", async ({ page }) => {
  await openRoute(page, "/todo", { width: 1920, height: 1000 });
  await liftMotionSuppression(page);

  /* the housekeeping rows — the fix bucket's verb */
  const rows = page.locator(".tdg-row").filter({ hasText: /^Fix/ });
  const n = await rows.count();
  console.log("housekeeping rows on dev:", n);

  const shot = resolve(process.cwd(), "reports/pane/fix-journey.png");
  if (!n) {
    console.log("NO FIX CARD ON DEV — the journey cannot be walked on this account");
    await page.screenshot({ path: shot });
    return;
  }
  await rows.first().click();
  await page.waitForTimeout(500);

  /**
   * ⚠️ DID THE PANE ACTUALLY MOVE? Asked BEFORE anything is measured, because the first version of
   * this harness did not ask and reported the OFFER's journey as the fix's — the hint gave it away
   * ("Three ways to answer this"), and only the step-title assertion caught it. `openDock` refuses
   * a key that is not in `dockable`, so clicking an UNDOCKABLE row leaves the pane exactly where it
   * was and the click looks like it worked. Same fault as the overnight conformance run.
   */
  const sel = await page.evaluate(() => {
    const rows = [...document.querySelectorAll(".tdg-row")];
    const on = rows.find((r) => r.className.includes("sel"));
    return { selected: (on?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 50), isFix: !!on?.textContent?.trim().startsWith("Fix") };
  });
  console.log("SELECTED AFTER CLICK:", JSON.stringify(sel));
  if (!sel.isFix) {
    console.log("⚠️ THE FIX ROW IS NOT DOCKABLE — the pane did not move. This account's only fix card");
    console.log("   is the GROUPED '12 wish lists', which resolves to no single agent, so there is no");
    console.log("   per-agent fix journey to walk here. The derived stack stays unit-locked only.");
    await page.screenshot({ path: shot });
    return;
  }

  /**
   * ⚠️ A GROUPED FIX ROW OPENS THE SWEEP, NOT THE JOURNEY — and that is the right answer, not a
   * miss. The journey asks one agent's questions; a row standing for twelve agents is a cohort, and
   * Item 4 built the surface for it. So the `fix` JOURNEY is still unwalked on this account, but the
   * reason has changed: before, the row docked nothing at all; now it docks the correct thing.
   *
   * ⚠️ AN INDIVIDUAL `fix` CARD IS WHAT THE JOURNEY NEEDS, and this account has none — every
   * data-quality gap here belongs to a group. The report says so rather than implying a walk.
   */
  const surface = await page.evaluate(() => {
    const vis = (e: Element) => e.getBoundingClientRect().height > 0;
    const g = (s: string) => [...document.querySelectorAll(s)].find(vis) as HTMLElement | undefined;
    return {
      sweep: !!g(".psw-foot"),
      journeyPrimary: !!g(".tdk-prime"),
      steps: [...document.querySelectorAll(".pj-step")].filter(vis).length,
    };
  });
  console.log("WHAT THE GROUPED FIX ROW OPENS:", JSON.stringify(surface));
  await page.screenshot({ path: shot });

  if (surface.sweep) {
    console.log("THE SWEEP — correct for a cohort. The per-agent `fix` journey is UNWALKED on this");
    console.log("account: every data-quality gap here is grouped, so no individual fix card exists.");
    expect(surface.steps, "a cohort rendered a per-agent step stack").toBe(0);
    return;
  }

  await page.locator(".tdk-prime").click({ timeout: 10_000 });
  await page.waitForTimeout(600);

  const j = await page.evaluate(() => {
    const vis = (e: Element) => e.getBoundingClientRect().height > 0;
    const g = (s: string) => [...document.querySelectorAll(s)].find(vis) as HTMLElement | undefined;
    const steps = [...document.querySelectorAll(".pj-step")].filter(vis);
    return {
      inPane: !!g(".pj-foot"),
      /* a takeover would put the flow outside the card */
      takeover: !!g(".tdb-ffwrap"),
      steps: steps.map((s) => (s.querySelector("h4")?.textContent ?? "").trim()),
      act: (g(".pj-prime")?.textContent ?? "").trim(),
      hint: (g(".pj-hint")?.textContent ?? "").trim(),
    };
  });
  console.log("JOURNEY:", JSON.stringify(j, null, 2));
  await page.screenshot({ path: shot });

  /* ⚠️ A GROUPED HOUSEKEEPING CARD CORRECTLY GOES TO THE TAKEOVER, and this account has only those:
     its one fix row is "12 wish lists", which resolves to no single agent, so `cardGaps` is empty
     and `paneJourneyKind` withholds the journey by design. That is the withhold rule firing, not a
     failure — but it also means the derived stack is NOT measured here, only unit-locked. */
  if (!j.inPane) console.log("GROUPED FIX CARD → takeover, as designed. The per-agent journey is unmeasured on this account.");

  if (j.inPane) {
    /* ⚠️ THE COUNT IS NOT ASSERTED AGAINST A LITERAL — it is asserted against the SHAPE the model
       allows: between one and three, never four. A literal would encode this account's data. */
    expect(j.steps.length, "the fix journey rendered no steps").toBeGreaterThan(0);
    expect(j.steps.length, "the fix journey was padded past its three possible gaps").toBeLessThanOrEqual(3);
    expect(j.takeover, "the fix bucket still opened the takeover").toBe(false);
    for (const t of j.steps) {
      expect(["How long they take", "What they ask for", "What they are looking for"]).toContain(t);
    }
  }
});
