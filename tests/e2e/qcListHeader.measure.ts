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

  expect(m.capCount, "there are not three caps — the list's, Tracking's and Notes'").toBe(3);
  /* ⚠️ ONE PAINT ACROSS ALL THREE. A second gradient anywhere shows up here as a second string. */
  expect([...new Set(m.paints)], `the caps are not one treatment: ${[...new Set(m.paints)].join(" ⁄ ")}`).toHaveLength(1);
  expect(m.listCapText, "the cap does not state the count").toMatch(/\d+ quer(y|ies)/);
  expect(m.listCapText, "the cap does not state the awaiting figure").toMatch(/\d+ awaiting/i);
  /* ⚠️ NO RADIUS OF ITS OWN — the panel keeps the radius and clips the fill */
  expect(m.listCapRadius, "the cap grew a radius of its own").toBe("0px");
  expect(parseFloat(m.panelRadius), "the panel gave up its radius").toBeGreaterThan(0);
  expect(m.listCapLeft, "the cap is inset from the panel — its fill must reach the rim").toBe(m.panelLeft + 1);
  expect(m.capAboveSearch, "the cap is not above the search row").toBe(true);
  expect(m.searchRowIntact.filter(Boolean).length, "the search row lost a control").toBe(3);
  /* ⚠️ THE COUNT RENDERS ONCE. It was in the toolbar AND is now in the cap; two would be the
     masthead-versus-column duplication this page has already retired once. */
  expect(m.countsOnPage.length, `the count renders ${m.countsOnPage.length} times: ${m.countsOnPage.join(", ")}`).toBe(1);
});
