/**
 * §4 — a response window EXPIRES; a query is CLOSED.
 *
 * ⚠️ THE SWEEP IS MEASURED ON THE RENDERED PAGE, in both directions. A source lock proves the
 * strings were changed where someone looked; only the page proves no surface still spells it the
 * old way — and the second half, that the query STATUS kept the word, is the half a rename gets
 * wrong. It walks the queries and reads every text node containing "clos".
 *
 *   npx playwright test --project=measure qcWords
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

test("§4 — no window says closed, and the query status still does", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  const rows = page.locator(".f12-row");
  await rows.first().click({ timeout: 8000 });
  await page.waitForTimeout(400);

  const hits: string[] = [];
  const n = Math.min(await rows.count(), 10);
  for (let i = 0; i < n; i++) {
    if (i >= await rows.count()) break;
    await rows.nth(i).click({ timeout: 6000 });
    await page.waitForTimeout(350);
    hits.push(...await page.evaluate(() => {
      const out: string[] = [];
      const walk = (node: Node) => {
        if (node.nodeType === 3 && /clos|expir/i.test(node.nodeValue || "")) {
          const el = node.parentElement!;
          out.push(`${(el.className || el.tagName).toString().slice(0, 26)} :: ${(node.nodeValue || "").trim().slice(0, 64)}`);
        }
        node.childNodes.forEach(walk);
      };
      walk(document.querySelector(".qp-cols") || document.body);
      return out;
    }));
  }
  const uniq = [...new Set(hits)];
  uniq.forEach((h) => console.log(`  ${h}`));

  const windowLines = uniq.filter((h) => /window/i.test(h));
  console.log(`\n  ${windowLines.length} window strings · ${uniq.length} lines mentioning closing or expiry`);
  expect(windowLines.length, "no window string rendered on any query — nothing was swept").toBeGreaterThan(0);

  /* ⚠️ NO WINDOW SAYS CLOSED. */
  for (const h of windowLines) {
    expect(h.toLowerCase(), `a window string still says closed: "${h}"`).not.toMatch(/window clos|clos\w* window/);
    expect(h.toLowerCase(), `a window string states neither expiry nor an expectation: "${h}"`).toMatch(/expir|expected/);
  }

  /* ⚠️ AND THE WRITER'S OWN ACT KEEPS THE WORD — the half a rename gets wrong. */
  const status = uniq.filter((h) => /mark closed/i.test(h));
  console.log(`  query-status strings still saying closed: ${status.length ? status.join(" | ") : "(none)"}`);
  expect(status.length, "'Mark closed' was swept away with the windows").toBeGreaterThan(0);
});
