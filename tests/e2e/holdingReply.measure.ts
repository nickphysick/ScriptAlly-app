/**
 * Phase 6 — record a holding reply on a long-silent query and check the four claims.
 *   npx playwright test --project=measure holdingReply
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

test("a holding reply re-bases the tracker and moves nothing else", async ({ page }) => {
  test.setTimeout(150000);
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.waitForTimeout(1500);

  /* pick the query with the longest wait — the two-year-silence case the feature is for */
  const rows = page.locator(".f12-row");
  const n = Math.min(await rows.count(), 20);
  let target = 0, best = -1;
  for (let i = 0; i < n; i++) {
    const t = (await rows.nth(i).textContent()) || "";
    const m = t.match(/(\d+(?:¼|½|¾)?)\s*years?/);
    if (m) { const v = parseFloat(m[1]); if (v > best) { best = v; target = i; } }
  }
  await rows.nth(target).click();
  await page.waitForTimeout(800);

  const before = await page.evaluate(() => {
    const list = document.querySelector(".f12-row.f12-sel");
    return {
      pane: ((document.body.innerText || "").replace(/\s+/g, " ").match(/Waiting to hear back.{0,140}/) || [""])[0],
      listRow: (list?.textContent || "").replace(/\s+/g, " ").slice(0, 120),
      groups: Array.from(document.querySelectorAll(".f12-ghead, .f12-group")).map((e) => (e.textContent || "").trim()).slice(0, 6),
    };
  });
  console.log(`  BEFORE pane: ${before.pane.slice(0, 220)}`);
  console.log(`  BEFORE list row: ${before.listRow}`);

  /* open Record response and take the fourth branch */
  const rec = page.locator("button", { hasText: /^Record response$/ }).first();
  await rec.click({ timeout: 8000 });
  await page.waitForTimeout(900);
  const holding = page.locator(".qr-out-holding");
  await expect(holding, "the fourth branch is not rendered").toHaveCount(1);
  const label = (await holding.textContent()) || "";
  console.log(`  fourth branch: "${label.replace(/\s+/g, " ").trim()}"`);
  /* it sits BELOW a rule, separated from the six that move the query */
  expect(await page.locator(".qr-outrule").count(), "the branch is not separated by a rule").toBe(1);
  await holding.click();
  await page.waitForTimeout(600);

  /* ⚠️ THE SAVE IS `.qc-next`, AND IT IS GATED ON `responseReady` — outcome + date. A probe that
     clicked a disabled control and then reported "nothing saved" would be blaming the feature for
     its own mis-aim, so the state is asserted before the click. */
  /* ⚠️ `.qc-next` IS THE ADVANCE BUTTON UNTIL THE LAST STEP, so the stack is WALKED rather than
     clicked once. A probe that clicked it and reported "nothing saved" would be describing its own
     mis-aim; the walk stops when the control stops saying "Next". */
  const errors: string[] = [];
  page.on("console", (m) => { if (/error|permission|insufficient/i.test(m.text())) errors.push(m.text().slice(0, 140)); });
  const walked: string[] = [];
  for (let step = 0; step < 6; step++) {
    const btn = page.locator(".qc-next").last();
    if (!(await btn.count())) break;
    const t = ((await btn.textContent()) || "").trim();
    walked.push(t);
    await btn.click({ timeout: 8000 });
    await page.waitForTimeout(700);
    if (!/^Next/i.test(t)) break;
  }
  console.log(`  walked: ${walked.join(" → ")}`);
  await page.waitForTimeout(5000);
  if (errors.length) console.log(`  console errors: ${errors.join(" | ")}`);

  const after = await page.evaluate(() => {
    const txt = (document.body.innerText || "").replace(/\s+/g, " ");
    return {
      pane: (txt.match(/Waiting to hear back.{0,140}/) || [""])[0],
      hasRow: /replied\s*—?\s*no decision yet/i.test(document.body.innerText),
      listRow: (document.querySelector(".f12-row.f12-sel")?.textContent || "").replace(/\s+/g, " ").slice(0, 120),
      /* ⚠️ SCOPED TO THE OFFER'S OWN SURFACE. A body-wide regex for "Mark closed" also matches the
         journey menus, which is a probe reporting its own looseness as a finding. */
      closeOffer: !!document.querySelector(".tl-offer"),
      pastWindow: /past the window they stated/i.test(document.body.innerText),
    };
  });
  console.log(`  AFTER pane: ${after.pane.slice(0, 220)}`);
  console.log(`  AFTER list row: ${after.listRow}`);
  console.log(`  timeline row drawn: ${after.hasRow} · close offer showing: ${after.closeOffer} · past-window figure: ${after.pastWindow}`);
  console.log(`  list row unchanged: ${after.listRow === before.listRow}`);
});
