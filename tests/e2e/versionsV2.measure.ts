/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * VER2 — Versions v2's locks on the rendered page (design-refs/versions-v2), at 1512 × 982 and 1280 × 832, on the
 * ms21-filled account's seeded books (tests/e2e/ver2Fixture.mjs). Expected values come from the fixture's own
 * Firestore read, never from lib/versionsV2. VER2_ONLY=<id> runs one lock.
 *
 * Written before the page (Step 0.10): against a build without Versions v2 every case fails, because no
 * `[data-vv2="page"]` exists. A suite that cannot find its subject has failed, not skipped.
 */
import { test, expect } from "@playwright/test";
import { ctxFor, openV2, scrollInto, VPS } from "./ver2Lib";

test.setTimeout(300_000);
const ONLY = process.env.VER2_ONLY ?? "";
const run = (id: string) => !ONLY || id.startsWith(ONLY);

for (const vp of VPS) {
  test.describe(`VER2 @ ${vp.width}`, () => {
    test("S02 — the list: the in-use card pinned first in navy, four columns, no Saved column, three labelled icons", async ({ browser, baseURL }) => {
      test.skip(!run("S02"));
      const ctx = await ctxFor(browser, baseURL!, vp);
      const page = await ctx.newPage();
      await openV2(page);
      const r = await page.evaluate(() => {
        const rows = [...document.querySelectorAll<HTMLElement>('[data-vv2="list"] .db-r')];
        const head = [...document.querySelectorAll<HTMLElement>('[data-vv2="list"] .db-h > span')].map((s) => s.textContent?.trim() ?? "");
        const first = rows[0];
        return {
          n: rows.length, head,
          firstUse: first?.classList.contains("use") ?? false,
          firstBg: first ? getComputedStyle(first).backgroundColor : "",
          icons: rows.map((r) => r.querySelectorAll(".db-act .da").length),
          tips: rows.flatMap((r) => [...r.querySelectorAll<HTMLElement>(".db-act .da")].map((b) => b.dataset.tip ?? "")),
        };
      });
      console.log(`S02 ${vp.width}`, JSON.stringify(r));
      expect(r.n, "the list has rows").toBeGreaterThan(2);
      expect(r.head).toEqual(["Version", "What changed", "Words", "Queries sent", ""]);
      expect(r.head.join(" ")).not.toMatch(/Saved/);
      expect(r.firstUse, "the in-use version is pinned first").toBe(true);
      expect(r.firstBg, "the pinned card is navy").toBe("rgb(42, 58, 82)");
      expect(new Set(r.icons)).toEqual(new Set([3]));
      expect(r.tips.every((t) => t.length > 0), "every icon has a label").toBe(true);
      await ctx.close();
    });

    test("S11 — the version drawer: four stat cards and a four-band funnel", async ({ browser, baseURL }) => {
      test.skip(!run("S11"));
      const ctx = await ctxFor(browser, baseURL!, vp);
      const page = await ctx.newPage();
      await openV2(page);
      await page.locator('[data-vv2="list"] .db-r.use').first().click();
      await page.waitForSelector('[data-vv2="drawer"] .vk2', { timeout: 10_000 });
      const r = await page.evaluate(() => ({
        cards: [...document.querySelectorAll('[data-vv2="drawer"] .vk2 > div > span')].map((s) => s.textContent?.trim()),
        bands: document.querySelectorAll('[data-vv2="drawer"] .hfC-b').length,
      }));
      console.log(`S11 ${vp.width}`, JSON.stringify(r));
      expect(r.cards).toEqual(["Sent", "Replied", "Asked for more", "Average reply"]);
      expect(r.bands).toBe(4);
      await ctx.close();
    });

    test("S19 — the guide: the pill reads Versions guide and the checklist holds four steps", async ({ browser, baseURL }) => {
      test.skip(!run("S19"));
      const ctx = await ctxFor(browser, baseURL!, vp);
      const page = await ctx.newPage();
      await openV2(page);
      await scrollInto(page, '[data-vv2="page"]', 0);
      const pill = page.locator(".pck-pill").filter({ hasText: "Versions" }).first();
      await expect(pill).toBeVisible({ timeout: 10_000 });
      if (!(await page.locator(".pck-pop").count())) await pill.click();
      const rows = await page.locator(".pck-pop .pck-r, .pck-pop [data-gs], .pck-pop li").allTextContents();
      console.log(`S19 ${vp.width}`, JSON.stringify(rows));
      expect(rows.join(" | ")).toMatch(/Add a version/);
      expect(rows.join(" | ")).toMatch(/Check how a version is performing/);
      await ctx.close();
    });
  });
}
