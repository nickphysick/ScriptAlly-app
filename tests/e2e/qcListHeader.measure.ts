/**
 * §1 — the count caps the list column, in the same treatment as the reading cards.
 *
 * ⚠️ "THE SAME TREATMENT" IS A COMPUTED-STYLE QUESTION, which is why it is here rather than in a
 * source lock: two rules can name the same tokens and still resolve differently under a theme, and
 * what the pack asks for is that the three caps LOOK like one family.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

test("§1 — one count on the page, in a cap that matches the reading cards", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.locator(".f12-row").first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(200);
  await page.locator(".f12-row").first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(250);

  const m = await page.evaluate(() => {
    const r = (n: number) => Math.round(n * 10) / 10;
    const paint = (e: Element) => { const c = getComputedStyle(e as HTMLElement); return `${c.backgroundImage}|${c.borderBottomWidth} ${c.borderBottomColor}|${c.fontFamily.split(",")[0].replace(/"/g, "")}`; };
    const caps = [...document.querySelectorAll(".f12-chh")];
    const list = document.querySelector(".f12-list") as HTMLElement;
    const lh = list.querySelector(":scope > .f12-chh") as HTMLElement | null;
    const head = list.querySelector(".f12-lhead") as HTMLElement;
    return {
      capCount: caps.length,
      paints: caps.map(paint),
      listCapText: (lh?.textContent ?? "").trim(),
      listCapRadius: lh ? getComputedStyle(lh).borderTopLeftRadius : "—",
      listCapTop: lh ? r(lh.getBoundingClientRect().top) : null,
      listCapLeft: lh ? r(lh.getBoundingClientRect().left) : null,
      panelLeft: r(list.getBoundingClientRect().left),
      panelRadius: getComputedStyle(list).borderTopLeftRadius,
      /* ⚠️ THE CAP MUST BE ABOVE THE SEARCH ROW, which does not move */
      capAboveSearch: lh ? lh.getBoundingClientRect().bottom <= head.getBoundingClientRect().top + 0.5 : false,
      searchRowIntact: [...head.children].map((c) => (c as HTMLElement).className.split(" ")[0]),
      /* the whole page's count of "N queries" statements */
      countsOnPage: (document.body.innerText.match(/\b\d+ quer(y|ies)\b/g) ?? []),
    };
  });
  console.log(JSON.stringify(m, null, 1));

  /**
   * ⚠️ INVERTED BY §3's RESET — THE LIST HAS NO CAP AT ALL NOW. This asserted three sage bands (the
   * list's, Tracking's and Notes') and the wording of the list's own; §3 removes it, so the list
   * opens with the search field and the groups state their own counts.
   *
   * ⚠️ WHAT SURVIVES IS THE CLAUSE UNDERNEATH IT: the page states its count ONCE. That was the
   * reason the cap's wording mattered, and it is the reason its going is an improvement rather than
   * a loss — the masthead says it, and the groups say their own.
   */
  expect(m.capCount, "the list's sage band came back").toBe(2);
  expect(m.listCapText, "the list drew a cap above its search row").toBe("");
  expect(m.countsOnPage.length, `the page states its count ${m.countsOnPage.length} times: ${m.countsOnPage.join(", ")}`).toBeLessThanOrEqual(1);
});
