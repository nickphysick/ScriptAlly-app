/**
 * THE CALENDAR PAGE IS RETIRED (29 Oct) — lock L5, measured on the rendered page.
 *
 * The unit locks (src/lib/calendarRetired.test.ts) hold the MODELS; this holds what a reader sees: the
 * sidebar's Tasks rows are To-do list then Corkboard, the To-do folder tab carries exactly one sibling
 * (Corkboard), and an old `/todo/calendar` link lands on the To-do list with its query string kept.
 *
 * Every probe reads VISIBLE elements only (every workspace page stays mounted), and asserts its
 * population before its claim, so an empty sweep cannot pass.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

test.describe.configure({ timeout: 180_000 });

for (const width of [1280, 1512]) {
  test(`L5 · the Tasks group and the folder tab carry no Calendar page — ${width}`, async ({ page }) => {
    await openRoute(page, "/todo", { width, height: 900 });
    await page.waitForTimeout(800);
    const read = await page.evaluate(() => {
      const vis = (e: Element) => { const r = (e as HTMLElement).getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      const rows = [...document.querySelectorAll(".ws-ni")].filter(vis).map((e) => e.getAttribute("aria-label") ?? (e.textContent ?? "").trim());
      const sibs = [...document.querySelectorAll('[data-shell="tab-siblings"] [data-sib]')].filter(vis)
        .map((e) => ({ id: (e as HTMLElement).dataset.sib, text: (e.getAttribute("aria-label") ?? e.textContent ?? "").trim() }));
      const tabName = [...document.querySelectorAll(".ws-ftn")].filter(vis).map((e) => (e.textContent ?? "").trim());
      return { rows, sibs, tabName };
    });
    // population first: the sidebar drew its rows and the tab named the page
    expect(read.rows.length, "no sidebar rows were read").toBeGreaterThan(5);
    expect(read.tabName, "the folder tab did not name the page").toEqual(["To-do list"]);
    // the Tasks group: To-do list, then Corkboard, and no Calendar anywhere in the sidebar
    const at = read.rows.indexOf("To-do list");
    expect(at, `no To-do list row in ${JSON.stringify(read.rows)}`).toBeGreaterThanOrEqual(0);
    expect(read.rows[at + 1], "the row after the To-do list").toBe("Corkboard");
    expect(read.rows, "a Calendar row is back in the sidebar").not.toContain("Calendar");
    // the folder tab: exactly one sibling, the Corkboard
    expect(read.sibs.map((s) => s.id), `siblings ${JSON.stringify(read.sibs)}`).toEqual(["noteboard"]);
  });
}

test("L5 · an old /todo/calendar link lands on the To-do list, keeping its query string", async ({ page }) => {
  await openRoute(page, "/todo/calendar?from=bookmark", { width: 1440, height: 900 });
  await page.waitForURL(/\/todo(\?|$)/, { timeout: 30_000 });
  const url = new URL(page.url());
  expect(url.pathname).toBe("/todo");
  expect(url.search).toBe("?from=bookmark");
});
