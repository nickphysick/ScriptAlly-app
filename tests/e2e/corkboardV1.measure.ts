/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CB1 — the Corkboard v1 locks (ref design-refs/corkboard-v4/corkboard-v4.html), measured on the rendered page
 * with the shell at 1512 × 900 and 1280 × 800.
 *
 *   SA_E2E_BASE_URL=http://127.0.0.1:4611 npx playwright test corkboardV1 --project=measure
 *
 * ⚠️ RED FIRST: every lock was run against the build WITHOUT the pack (9fc11a2a) and against its named
 *    mutation; the readings are in reports/corkboard-v1/REDFIRST.md and mutation-proofs.jsonl.
 * ⚠️ THE FIXTURE IS `cbseed-*` (see cbLib). Cases that write preferences snapshot `todoPrefs.noteboard` first
 *    and put it back in the same run; cases that write a document remove it in the same run.
 */
import { test, expect } from "@playwright/test";
import { Ledger, OLD_ROUTE, ROUTE, SIZES, open, only, readableText, sz } from "./cbLib";

test.describe("CB1 · Part A — the name and the route", () => {
  test("A1 name: nothing a writer can read says Noteboard; the sidebar row and the tab read Corkboard and are current", async ({ page }) => {
    const L = new Ledger("A1");
    for (const vp of SIZES) {
      await open(page, ROUTE, vp);
      const where = `${ROUTE} ${sz(vp)}`;
      const text = await readableText(page);
      L.check("A1", where, text.length > 400, `the page rendered words to read (${text.length} chars)`);
      const hit = /note\s?board/i.exec(text);
      L.check("A1", where, !hit, hit ? `a writer can read "${text.slice(Math.max(0, hit.index - 40), hit.index + 50).replace(/\s+/g, " ")}"` : "no Noteboard");
      const nav = await page.evaluate(() => {
        const cur = [...document.querySelectorAll('.ws-nav .ws-ni[aria-current="page"]')].map((e) => e.getAttribute("aria-label"));
        const tab = [...document.querySelectorAll('[data-shell="tab"] [data-page-name]')].filter((e) => (e as HTMLElement).getBoundingClientRect().width > 0).map((e) => (e.textContent || "").trim());
        const rows = [...document.querySelectorAll(".ws-nav .ws-ni")].map((e) => e.getAttribute("aria-label"));
        return { cur, tab, rows };
      });
      L.check("A1", where, nav.cur.length === 1 && nav.cur[0] === "Corkboard", `the current sidebar row is ${JSON.stringify(nav.cur)}`);
      L.check("A1", where, nav.tab.length === 1 && nav.tab[0] === "Corkboard", `the folder tab reads ${JSON.stringify(nav.tab)}`);
      L.check("A1", where, nav.rows.includes("Corkboard") && !nav.rows.some((r) => /noteboard/i.test(r || "")), `sidebar rows ${JSON.stringify(nav.rows)}`);
      L.check("A1", where, new URL(page.url()).pathname === ROUTE, `the address is ${new URL(page.url()).pathname}`);
    }
    /* the To-do list's desk carries the one link to this page */
    await open(page, "/todo", SIZES[0]);
    const todo = await readableText(page);
    const link = await page.locator('[data-todo-v2="noteboard-link"]:visible').first().innerText().catch(() => "");
    L.check("A1", "/todo desk", /Open the Corkboard/.test(link), `the desk's link reads "${link.trim()}"`);
    const hit = /note\s?board/i.exec(todo);
    L.check("A1", "/todo", !hit, hit ? `a writer can read "${todo.slice(Math.max(0, hit.index - 40), hit.index + 50).replace(/\s+/g, " ")}"` : "no Noteboard");
    L.done(14);
  });

  test("A2 route: /todo/noteboard?q=x lands on /todo/corkboard?q=x and renders the board", async ({ page }) => {
    const L = new Ledger("A2");
    await only(page, "cbseed-");
    for (const vp of SIZES) {
      await open(page, `${OLD_ROUTE}?q=x`, vp);
      const where = `${OLD_ROUTE}?q=x ${sz(vp)}`;
      const u = new URL(page.url());
      L.check("A2", where, u.pathname === ROUTE, `landed on ${u.pathname}`);
      L.check("A2", where, u.search === "?q=x", `the query string is "${u.search}"`);
      const seen = await page.evaluate(() => [...document.querySelectorAll(".nb-scope.tdb-wrap")].filter((e) => e.getBoundingClientRect().height > 0).length);
      L.check("A2", where, seen === 1, `${seen} visible board page(s)`);
      const cur = await page.evaluate(() => [...document.querySelectorAll('.ws-nav .ws-ni[aria-current="page"]')].map((e) => e.getAttribute("aria-label")));
      L.check("A2", where, cur.length === 1 && cur[0] === "Corkboard", `the current sidebar row is ${JSON.stringify(cur)}`);
    }
    L.done(8);
  });
});
