/**
 * §2 — setting the expected date in place.
 *
 * ⚠️ THIS SECTION IS UNREACHABLE ON THE DEV ACCOUNT, AND THE REASON IS WORTH MORE THAN THE WALK.
 * The offer appears only where the agency has stated no response time; every agent here states one.
 * A first version of this probe tried to make the state — clearing an agent's stated weeks through
 * the agent card's own editor — and the clear did not take: the card's queries still read
 * "advised 8 weeks" afterwards. That is either a denied write or a commit the editor did not make,
 * and it is a finding about the agent editor rather than about this section, so it is reported
 * rather than worked around.
 *
 * ⚠️ IT ALSO SURFACED THE SCHEMA QUESTION IN §2's REPORT: `responseDeadline` is written by
 * `addQuery` from the AGENT's window, so a stored date is not evidence the writer set it.
 *
 * So the probe asserts what it can reach and states plainly what it could not.
 *
 *   npx playwright test --project=measure qcSetWindow
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

test("§2 — the offer and the control, where a query has no stated window", async ({ page }) => {
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

  if (found < 0) {
    console.log("  ⚠️ NO query on this account has an agency that states nothing, so the offer — and");
    console.log("     with it this control and §1's cards 2 and 3 — cannot be reached. Unexercised on");
    console.log("     the page; the control is asserted at source, and the states in unit tests.");
    /* ⚠️ NOT A SILENT PASS: the absence is asserted so the console line above cannot be the only
       record of it, and so this goes red the day the state becomes reachable and something breaks. */
    expect(await page.locator(".tl-setwin").count(), "an editor is open with no offer to have opened it").toBe(0);
    return;
  }

  console.log(`  query ${found} offers a date`);
  await page.locator(".tl-ask-a").click();
  await page.waitForTimeout(400);
  const ed = await page.evaluate(() => {
    const e = document.querySelector<HTMLElement>(".tl-setwin");
    if (!e) return null;
    return {
      eyebrow: (e.querySelector(".tl-setwin-eb")?.textContent || "").trim(),
      value: (e.querySelector(".tl-setwin-val")?.textContent || "").replace(/\s+/g, " ").trim(),
      keys: (e.querySelector(".tl-setwin-k")?.textContent || "").trim(),
      range: !!e.querySelector('input[type="range"]'),
      ticks: [...e.querySelectorAll(".tl-setwin-tk span")].map((s) => (s.textContent || "").trim()),
      offerStillThere: !!document.querySelector(".tl-ask"),
    };
  });
  console.log(`  editor · "${ed?.eyebrow}" · "${ed?.value}" · ticks ${ed?.ticks.join(" ")} · "${ed?.keys}"`);
  expect(ed, "the offer opened nothing").not.toBeNull();
  expect(ed!.range, "the control is not a slider").toBe(true);
  expect(ed!.eyebrow, "the eyebrow does not keep the estimate the writer's").toBe("Your expected response time");
  expect(ed!.value, "the control does not resolve to a date").toMatch(/weeks? · around \w/);
  expect(ed!.keys, "the control does not say how to commit it").toContain("Enter to save");
  /* ⚠️ IT TAKES THE OFFER'S PLACE rather than opening beside it — the offer's whole job was to
     ask a question the control now answers. */
  expect(ed!.offerStillThere, "the control opened beside the offer instead of replacing it").toBe(false);

  await page.keyboard.press("Escape");
});
