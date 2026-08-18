/**
 * F2 (live surface) — the urgent list's deadline is back.
 *
 * ⚠️ `buildOverToYouRows` IS THE ONE LIVE CONSUMER of the expected date on this page
 * (OneScreenDashboard → OneScreenTasks). The agents stat panel's `RESPOND BY` clause reads the
 * same fact and is NOT rendered — `StatCardFull` is imported by Dashboard.tsx and never mounted —
 * so this probe deliberately measures the list rather than the panel.
 *
 *   npx playwright test --project=measure respondBy
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

test("F2 — the urgent list states its deadline again", async ({ page }) => {
  await openRoute(page, "/dashboard", { width: 1440, height: 900 });
  await page.waitForTimeout(2500);

  const r = await page.evaluate(() => {
    const heads = Array.from(document.querySelectorAll("h1,h2,h3"));
    const h = heads.find((e) => /attention/i.test(e.textContent || ""));
    const card = h?.closest("section, div[class]") as HTMLElement | null;
    const txt = (card?.innerText || "").replace(/\s+/g, " ");
    return {
      cardFound: !!card,
      rows: document.querySelectorAll(".os-trow").length,
      pastWindow: (document.body.innerText.match(/past window/gi) || []).length,
      order: Array.from(document.querySelectorAll(".os-trow")).map((e) => (e.textContent || "").replace(/\s+/g, " ").trim().slice(0, 70)),
      body: txt.slice(0, 200),
    };
  });
  console.log(`  card:${r.cardFound} rows:${r.rows} "past window"×${r.pastWindow}`);
  console.log(`  ${r.body}`);
  (r.order as string[]).forEach((o, i) => console.log(`   ${i + 1}. ${o}`));
  expect(r.cardFound, "the attention card was not found — nothing was measured").toBe(true);
});
