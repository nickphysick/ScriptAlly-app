/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CLEAN-UP PASS, ITEM 4 ON THE BUILT APP (28 Sep): no rendered page says "Sept". Every workspace
 * route (the router's own list), plus an open query's Tracking, is read as text.
 *
 * ⚠️ THE SWEEP PROVES ITS OWN POPULATION: across the run, "Sep" must appear somewhere, or the pages
 * simply held no September dates and a clean result would mean nothing.
 *
 *   SA_E2E_BASE_URL=http://127.0.0.1:<port> npx playwright test tests/e2e/noSept.measure.ts
 */
import { test, expect } from "@playwright/test";
import { collection, getDocs } from "firebase/firestore";
import { ensureSignedIn, openRoute, liftMotionSuppression } from "./measure";
import { harnessDb } from "./harnessDocs";
import { WORKSPACE_PATHS } from "../../src/marketing/routeTiers";

test("no rendered page contains 'Sept'", async ({ page }) => {
  test.setTimeout(900_000);
  await ensureSignedIn(page);
  const { db, uid } = await harnessDb();
  const sept = (await getDocs(collection(db, "users", uid, "queries"))).docs.find((d) => /^\d{4}-09-/.test(String(d.data().dateSent ?? "")));
  const routes = [...WORKSPACE_PATHS, ...(sept ? [`/queries?q=${sept.id}`] : [])];
  const found: string[] = []; let sawSep = 0;
  for (const r of routes) {
    await openRoute(page, r, { width: 1440, height: 900 });
    await liftMotionSuppression(page);
    await page.waitForTimeout(1800);
    const text = await page.evaluate(() => document.body.innerText);
    if (/\bSept\b/i.test(text)) found.push(`${r}: …${text.slice(Math.max(0, text.search(/\bSept\b/i) - 30), text.search(/\bSept\b/i) + 20).replace(/\s+/g, " ")}…`);
    if (/\b\d{1,2} Sep\b/i.test(text)) sawSep++;
  }
  console.log(`NO-SEPT: ${routes.length} routes · ${sawSep} showed a September date`);
  expect(sawSep, "no page showed a September date — the sweep proved nothing").toBeGreaterThan(0);
  expect(found).toEqual([]);
});
