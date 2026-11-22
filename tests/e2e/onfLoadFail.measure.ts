/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Overnight fixes v1, Part 2 — LF1–LF4: a failed load shows an error, never an empty account. Measured on the rendered
 * page, on the emulator.
 *
 * The fault is the dev-only aid `window.__SA_LF = { fail: ["queries"] }` (lib/db.tsx `forcedReadFault`). It sends the
 * queries listener down the same error path a real listener error takes, with nothing read. `LF_MUTATE=emptyonerror` is
 * the named mutation: the aid then leaves the read "ok" with an empty list, which is the behaviour this part removes.
 * Under it LF1 and LF2 must go red.
 *
 * LF4 empties the harness account's queries, agents and manuscripts (tests/e2e/onfEmptyAccount.mjs), proves the
 * population is zero with the read up, and restores the account in the same run.
 */
import { expect, test, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { openApp } from "./pageHeaderV2Lib";

const VP = { width: 1440, height: 900 };
const MUTATE = process.env.LF_MUTATE === "emptyonerror" ? "emptyonerror" : undefined;
const WORDS = "We couldn’t load your queries. Try again?";

async function arm(page: Page) {
  await page.addInitScript((mutate) => {
    /* armed once per page load until the test lifts it: the flag lives on sessionStorage so a reload keeps the fault */
    try { if (sessionStorage.getItem("onf-lf-lifted") === "1") return; } catch { /* */ }
    (window as unknown as { __SA_LF?: unknown }).__SA_LF = { fail: ["queries"], ...(mutate ? { mutate } : {}) };
  }, MUTATE);
}

/** What the visible page shows: the error, and any day-one or empty state, by their own markers. */
async function readState(page: Page) {
  return page.evaluate(() => {
    const shown = (e: Element) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0.5 && r.height > 0.5 && s.visibility !== "hidden" && s.display !== "none"; };
    const vis = (sel: string) => [...document.querySelectorAll(sel)].filter(shown);
    const err = vis("[data-load-failed]");
    return {
      error: err.map((e) => (e.querySelector("p")?.textContent ?? "").trim()),
      button: err.map((e) => (e.querySelector("button")?.textContent ?? "").trim()),
      errorProbe: err.map((e) => e.getAttribute("data-load-failed")),
      dayOne: {
        qcFirst: vis('[data-qc155="panel"][data-kind="first"]').length,
        dashSetup: vis('[data-d2="setup"]').length,
        dashEmptyFeed: vis('[data-d2="feed"] [data-fv2="empty-feed"], [data-d2="feed"] .fv2-ef').length,
        todoEmpty: vis(".tws-empty").filter((e) => /Nothing to do yet/.test(e.textContent ?? "")).length,
      },
      /* import and set-up entry points anywhere in the DOM, visible or not (every workspace page stays mounted) */
      importAnywhere: [...document.querySelectorAll('a[href^="/import"], [data-qc155="import"], [data-a21="empty-import"], [data-a21="way-import"], [data-cl17="way-import"], [data-d2="setup"], [data-impg="tiles"]')]
        .map((e) => e.getAttribute("data-qc155") ?? e.getAttribute("data-a21") ?? e.getAttribute("data-cl17") ?? e.getAttribute("data-d2") ?? e.getAttribute("data-impg") ?? e.getAttribute("href")),
      title: (vis("h1[data-page-title], h1")[0]?.textContent ?? "").trim(),
    };
  });
}

test.describe.serial("LF · a failed read", () => {
  test("LF1 · a failed queries read shows the error on the Query Centre, the Dashboard and To-do, and no day-one state", async ({ page }) => {
    test.setTimeout(240_000);
    await arm(page);
    for (const [route, probe] of [["/queries", "queries"], ["/dashboard", "dashboard"], ["/todo", "todo"]] as const) {
      await openApp(page, route, VP);
      await page.waitForTimeout(800);
      const r = await readState(page);
      console.log(`LF1 ${route}: ${JSON.stringify(r)}`);
      expect(r.error, `${route}: the error, in the Your notes words`).toEqual([WORDS]);
      expect(r.errorProbe).toEqual([probe]);
      expect(r.button, `${route}: the Your notes button`).toEqual(["Try again"]);
      expect(r.dayOne, `${route}: no day-one or empty state`).toEqual({ qcFirst: 0, dashSetup: 0, dashEmptyFeed: 0, todoEmpty: 0 });
      expect(r.title, `${route}: the header shows no count (never 0)`).not.toMatch(/^0\b|No queries yet/);
    }
  });

  test("LF2 · no import entry point in the DOM while in error, and /import shows the error", async ({ page }) => {
    test.setTimeout(240_000);
    await arm(page);
    /* visit every page an empty account would offer an import from, so each is mounted */
    for (const route of ["/dashboard", "/queries", "/queries/analytics", "/todo"]) { await openApp(page, route, VP); await page.waitForTimeout(500); }
    const r = await readState(page);
    console.log(`LF2 dom: ${JSON.stringify(r.importAnywhere)}`);
    expect(r.importAnywhere, "no import or set-up entry point anywhere in the DOM").toEqual([]);
    await openApp(page, "/import", VP);
    await page.waitForTimeout(800);
    const i = await readState(page);
    console.log(`LF2 /import: ${JSON.stringify(i)}`);
    expect(i.errorProbe).toEqual(["import"]);
    expect(i.error).toEqual([WORDS]);
    /* the Import page's own subtree (other pages stay mounted and keep their own file inputs, e.g. attachments) */
    expect(await page.locator('.impg [data-impg="tiles"], .impg input[type="file"], .impg [data-impg="flow"]').count(), "no tiles, no flow and no file picker on /import").toBe(0);
    expect(await page.locator('.impg [data-load-failed="import"]').count(), "the error is the Import page's own").toBe(1);
  });

  test("LF3 · Try again after the fault is lifted renders the data", async ({ page }) => {
    test.setTimeout(240_000);
    await arm(page);
    await openApp(page, "/queries", VP);
    await page.waitForTimeout(800);
    expect((await readState(page)).error).toEqual([WORDS]);
    await page.evaluate(() => { (window as unknown as { __SA_LF?: unknown }).__SA_LF = undefined; try { sessionStorage.setItem("onf-lf-lifted", "1"); } catch { /* */ } });
    const btn = page.locator('[data-load-failed="queries"] button', { hasText: "Try again" });
    await btn.click();
    await expect(page.locator('[data-load-failed]:visible')).toHaveCount(0, { timeout: 20_000 });
    await page.waitForTimeout(1500);
    const r = await readState(page);
    const rows = await page.evaluate(() => {
      const h = [...document.querySelectorAll<HTMLElement>('[data-qc151="header"] h1, [data-qc1531="header"] h1')].find((e) => e.getBoundingClientRect().height > 0);
      return { title: (h?.textContent ?? "").trim(), nav: performance.getEntriesByType("navigation").length };
    });
    console.log(`LF3 after: ${JSON.stringify({ r, rows })}`);
    expect(r.dayOne.qcFirst, "the harness account's queries, not day one").toBe(0);
    expect(rows.title, "the header counts the queries that came back").toMatch(/^\d+ quer/);
    expect(rows.nav, "no reload").toBe(1);
  });
});

test.describe.serial("LF4 · a genuinely empty account", () => {
  test.beforeAll(() => { console.log(`LF4 emptied: ${execSync("node tests/e2e/onfEmptyAccount.mjs empty").toString().trim()}`); });
  test.afterAll(() => { console.log(`LF4 restored: ${execSync("node tests/e2e/onfEmptyAccount.mjs restore").toString().trim()}`); });
  test("LF4 · zero documents and a read that succeeded: the day-one states, and no error", async ({ page }) => {
    test.setTimeout(240_000);
    const pop = JSON.parse(execSync("node tests/e2e/onfEmptyAccount.mjs count").toString().trim());
    console.log(`LF4 population: ${JSON.stringify(pop)}`);
    expect(pop, "the population is zero").toEqual({ queries: 0, agents: 0, manuscripts: 0 });
    await openApp(page, "/queries", VP);
    await page.waitForTimeout(1200);
    const q = await readState(page);
    console.log(`LF4 /queries: ${JSON.stringify(q)}`);
    expect(q.error, "no error: the read succeeded").toEqual([]);
    expect(q.dayOne.qcFirst, "the Query Centre's day one").toBe(1);
    await openApp(page, "/dashboard", VP);
    await page.waitForTimeout(1200);
    const d = await readState(page);
    console.log(`LF4 /dashboard: ${JSON.stringify(d)}`);
    expect(d.error).toEqual([]);
    expect(d.dayOne.dashSetup, "the Dashboard's set-up card").toBe(1);
  });
});
