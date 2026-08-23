/** §3/§4 · the derived tracking block on the Packages page. */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

test("§3 · the count is derived from the sends, and rows click through", async ({ page }) => {
  test.setTimeout(240000);
  await openRoute(page, "/manuscripts/packages", { width: 1440, height: 900 });
  await page.waitForTimeout(3000);

  const blocks = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".pkgt")).map((b) => ({
      figure: (b.querySelector(".pkgt-figure")?.textContent || "").trim(),
      label: (b.querySelector(".pkgt-label")?.textContent || "").trim(),
      rows: b.querySelectorAll(".pkgt-row").length,
      idle: (b.querySelector(".pkgt-idle")?.textContent || "").trim(),
      attach: !!b.querySelector(".pkgt-attach"),
      topEdge: getComputedStyle(b as Element).borderTopColor,
      figureInk: b.querySelector(".pkgt-figure") ? getComputedStyle(b.querySelector(".pkgt-figure") as Element).color : "",
      mark: !!b.querySelector('[data-art="package-mark"]'),
      sells: /\bpro\b|upgrade|unlock/i.test(b.textContent || ""),
    })));
  console.log(`  tracking blocks: ${JSON.stringify(blocks)}`);
  expect(blocks.length, "no tracking block on the packages page").toBeGreaterThan(0);

  /* §4 · blue is the page's accent here — top edge, mark, derived figure */
  for (const b of blocks) {
    expect(b.topEdge, "the block's top edge is not pastille blue").toBe("rgb(194, 207, 218)");
    /* ⚠️ NO BADGE, NO METER, NO UPSELL — the locked law, even though packages are Pro-gated. */
    expect(b.sells, "the tracking block sells something").toBe(false);
    expect(b.attach, "no Attach-to-a-query affordance").toBe(true);
  }

  const withSends = blocks.find((b) => b.rows > 0);
  if (!withSends) {
    console.log("  ⚠️ every package reads state 3 — no package-attached send in this account");
    expect(blocks.some((b) => /not yet sent/i.test(b.idle)), "state 3 did not render either").toBe(true);
    return;
  }
  console.log(`  "${withSends.figure}" ${withSends.label} · ${withSends.rows} rows · mark ${withSends.mark}`);
  expect(withSends.mark, "the shared package mark is missing").toBe(true);
  expect(withSends.figureInk, "the derived figure is not in the blue ink").toBe("rgb(58, 85, 112)");

  /* ⚠️ SCROLLED INTO VIEW FIRST. The row resolved and the click hung — the card sits inside the
     page's scroll region, so the element existed while nothing could reach it. */
  const row = page.locator(".pkgt-row").first();
  await row.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await row.click({ timeout: 15000 });
  await page.waitForTimeout(2500);
  console.log(`  after clicking a row: ${page.url().replace(/^https?:\/\/[^/]+/, "")}`);
  expect(page.url(), "a tracking row did not open its query").toContain("/queries?q=");
});
