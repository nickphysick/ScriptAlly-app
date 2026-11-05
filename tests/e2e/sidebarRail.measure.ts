/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sidebar rail v1 (5 Nov) — the labelled rail, the open section's card, and the full sidebar that
 * floats or pins. Refs: design-refs/shell/sidebar-rail-v1.css + .js. Report: reports/sidebar-rail-v1/.
 *
 * Run on the emulators: `npm run e2e:emu -- tests/e2e/sidebarRail.measure.ts --project=measure`.
 * SR_MUTATE=<name> applies one named break in the page, so each lock can be watched going red.
 */
import { test, expect, type Page } from "@playwright/test";
import { openRoute } from "./measure";

const MUTATE = process.env.SR_MUTATE ?? "";
const WIDE = { width: 1512, height: 982 };

/** The visible text of the folder tab's sibling links (the measuring copy is aria-hidden and skipped). */
async function tabSiblings(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const row = document.querySelector<HTMLElement>('[data-shell="tab-siblings"]');
    if (!row) return [];
    return [...row.querySelectorAll<HTMLElement>(".ws-ftsib")]
      .filter((b) => !b.classList.contains("ws-ftmore"))
      .map((b) => (b.getAttribute("aria-label") || b.textContent || "").trim());
  });
}

test.describe("sidebar rail v1 — Phase 1, the nav model", () => {
  test("SR1.1 the folder tab follows the new sections", async ({ page }) => {
    await openRoute(page, "/manuscripts", WIDE);
    await expect(page.locator(".ws-ftn")).toHaveText("Manuscripts");
    const ms = await tabSiblings(page);
    console.log("[SR1.1] /manuscripts siblings", JSON.stringify(ms));
    expect(ms).toEqual(["Comparable titles"]);
    await openRoute(page, "/manuscripts/packages", WIDE);
    await expect(page.locator(".ws-ftn")).toHaveText("Submission packages");
    const pk = await tabSiblings(page);
    console.log("[SR1.1] /manuscripts/packages siblings", JSON.stringify(pk));
    expect(pk).toEqual([]);
  });

  test("SR1.2 the palette lists the nav's pages by the nav's names", async ({ page }) => {
    await openRoute(page, "/dashboard", WIDE);
    await page.keyboard.press(process.platform === "darwin" ? "Meta+k" : "Control+k");
    const input = page.locator('.sp-pal [role="combobox"]');
    await expect(input).toBeVisible();
    for (const [term, title] of [["respon", "Responses"], ["analy", "Analytics"], ["submission", "Submission packages"], ["comparable", "Comparable titles"]] as const) {
      await input.fill(term);
      const titles = await page.locator(".sp-res .sp-t1").allTextContents();
      console.log(`[SR1.2] "${term}"`, JSON.stringify(titles.slice(0, 6)));
      expect(titles.map((t) => t.trim()), term).toContain(title);
    }
  });

  test("SR1.3 the phone bar names /queries Query Centre", async ({ page }) => {
    await openRoute(page, "/queries", { width: 390, height: 844 });
    const crumb = (await page.locator(".sv2-crumb b").first().textContent())?.trim();
    console.log("[SR1.3] phone crumb", crumb);
    expect(crumb).toBe("Query Centre");
  });
});
