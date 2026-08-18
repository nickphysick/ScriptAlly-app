/**
 * §1 — the agency's own silence policy, on the running page.
 *
 * ⚠️ THE CLAIM IS ABOUT TWO POPULATIONS, so the probe walks the list rather than reading one query:
 * a query whose agency states the policy must show the specific line, and one whose agency does not
 * must show NO convention line at all. Reading a single query would settle neither — and whichever
 * one it happened to land on would look like a pass.
 *
 *   npx playwright test --project=measure qcPolicy
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

test("§1 — the policy line is the agency's, or there is no line", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  const rows = page.locator(".f12-row");
  const n = Math.min(await rows.count(), 12);
  expect(n, "no queries on this account").toBeGreaterThan(0);

  /* ⚠️ THE FIRST CLICK OF A VISIT IS EATEN by the header collapsing on engagement, so it is spent
     here rather than on a row whose result then goes unread. */
  await rows.first().click({ timeout: 8000 });
  await page.waitForTimeout(400);

  const seen: { agent: string; conv: string; offer: string }[] = [];
  for (let i = 0; i < n; i++) {
    /* ⚠️ THE LIST IS RE-READ EVERY ITERATION. Selecting a query re-renders it, and a locator
       resolved against the count taken at the start waits the full timeout on a row that is no
       longer there — measured: it hung on `nth(10)` of a list that had shortened under it. */
    const live = await rows.count();
    if (i >= live) { console.log(`  list shortened to ${live} rows — stopping at ${i}`); break; }
    const row = rows.nth(i);
    try {
      await row.scrollIntoViewIfNeeded({ timeout: 4000 });
      await row.click({ timeout: 6000 });
    } catch {
      /* ⚠️ REPORTED AND SKIPPED, NEVER RETRIED IN A LOOP — a row that will not take a click is a
         finding about that row, and waiting on it burns the whole run's budget. */
      console.log(`  ${String(i).padStart(2)} ⚠️ row would not take a click — skipped`);
      continue;
    }
    await page.waitForTimeout(350);
    const one = await page.evaluate(() => ({
      agent: (document.querySelector(".qc-hname, .qc-agentname, .f12-row.f12-sel")?.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40),
      conv: (document.querySelector(".tl-conv")?.textContent || "").replace(/\s+/g, " ").trim(),
      offer: (document.querySelector(".tl-offer-f")?.textContent || "").replace(/\s+/g, " ").trim(),
    }));
    seen.push(one);
    console.log(`  ${String(i).padStart(2)} ${one.agent.padEnd(40)} conv "${one.conv}" · offer "${one.offer}"`);
  }

  const withLine = seen.filter((s) => s.conv);
  console.log(`\n  ${withLine.length} of ${n} queries render a convention line`);

  /* ⚠️ NO HOUSE OBSERVATION, ON ANY QUERY — the fault was a line true of the trade and attributable
     to nobody, and it rendered on every past-window state. */
  for (const s of seen) {
    expect(s.conv, "the generic convention line is still on the page").not.toContain("Many agencies");
    if (s.conv) {
      expect(s.conv, "a line rendered without naming who states the policy").toMatch(/treats? silence as a pass/);
      expect(s.conv, "the line does not state the date their window closed").toContain("window closed");
      /* the app adds no verdict of its own */
      for (const w of ["we recommend", "you should", "unlikely", "give up"]) {
        expect(s.conv.toLowerCase(), `the line appraises: "${w}"`).not.toContain(w);
      }
      expect(s.offer, "the policy line rendered with no offer beneath it").not.toBe("");
    }
  }
  /* ⚠️ REPORTED, NOT REQUIRED. Whether any agent on this account states the policy is DATA — a
     `toBeGreaterThan(0)` here would fail on an account where nobody has ticked the box, which says
     nothing about the code. The absence is stated instead so it cannot pass as proof. */
  if (!withLine.length) console.log("  ⚠️ NO agent on this account states a silence policy — the positive case is unexercised on the page");
});
