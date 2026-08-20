/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The settings layout — variant B, measured.
 *
 * ⚠️ EVERY CLAIM IN THIS REWORK IS A GEOMETRY CLAIM, so none of it can be read out of the source.
 * "The header does not shift" and "the card does not resize" are statements about pixels across
 * six routes; a stylesheet can only say what was declared.
 *
 *   npm run build:dev && npx vite preview --port 4173 &
 *   SA_E2E_BASE_URL=http://localhost:4173 npx playwright test accountLayout
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { ACCOUNT_ROUTES } from "../../src/lib/accountRoutes";

const rect = (page: import("@playwright/test").Page, sel: string) =>
  page.evaluate((s) => {
    const el = document.querySelector(s) as HTMLElement | null;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
  }, sel);

test("the account header is identical in all six sections, to the pixel", async ({ page }) => {
  const seen: Record<string, unknown> = {};
  for (const r of ACCOUNT_ROUTES) {
    await openRoute(page, r.path, { width: 1440, height: 900 });
    seen[r.id] = await rect(page, ".acct-hdr");
  }
  console.log("\nHEADER GEOMETRY\n" + Object.entries(seen).map(([k, v]) => `${k.padEnd(15)} ${JSON.stringify(v)}`).join("\n"));

  const first = JSON.stringify(seen[ACCOUNT_ROUTES[0].id]);
  expect(first, "the header must exist").not.toBe("null");
  for (const r of ACCOUNT_ROUTES) {
    expect(JSON.stringify(seen[r.id]), `${r.id} header`).toBe(first);
  }
});

test("identity appears ONCE — in the header, never in a section card", async ({ page }) => {
  for (const r of ACCOUNT_ROUTES) {
    await openRoute(page, r.path, { width: 1440, height: 900 });
    const counts = await page.evaluate(() => {
      const panel = document.getElementById("acct-panel");
      return {
        headerAvatars: document.querySelectorAll(".acct-hdr-av").length,
        panelAvatars: panel ? panel.querySelectorAll(".acct-hdr-av, .acct-band-disc").length : -1,
        panelHasEmail: panel ? /@/.test(panel.textContent ?? "") : false,
        bandName: document.querySelector("#acct-panel .acct-band-name")?.textContent ?? null,
      };
    });
    expect(counts.headerAvatars, `${r.id}: one monogram, in the header`).toBe(1);
    expect(counts.panelAvatars, `${r.id}: no monogram inside the section card`).toBe(0);
    /* Security legitimately prints the account email — it is the field being described there. */
    if (r.id !== "security") {
      expect(counts.panelHasEmail, `${r.id}: the email is the header's, not the card's`).toBe(false);
    }
    expect(counts.bandName, `${r.id}: the band names the SECTION`).toBeTruthy();
  }
});

test("the page title is gone and the header carries the top edge", async ({ page }) => {
  await openRoute(page, "/account/profile", { width: 1440, height: 900 });
  expect(await page.locator(".acct-title").count(), "no standalone page title").toBe(0);

  const hdr = (await rect(page, ".acct-hdr"))!;
  const grid = (await rect(page, ".acct-grid"))!;
  console.log("header", JSON.stringify(hdr), "grid", JSON.stringify(grid));
  expect(hdr.y, "the header is above the grid").toBeLessThan(grid.y);
  expect(hdr.x, "and shares its left edge").toBe(grid.x);
});

test("the three facts are real values, and an unavailable one is omitted not blanked", async ({ page }) => {
  await openRoute(page, "/account/profile", { width: 1440, height: 900 });
  const facts = await page.evaluate(() =>
    [...document.querySelectorAll(".acct-hdr-fact")].map((f) => ({
      k: f.querySelector(".acct-hdr-k")?.textContent ?? "",
      v: (f.querySelector(".acct-hdr-v")?.textContent ?? "").trim(),
    })));
  console.log("FACTS", JSON.stringify(facts));
  expect(facts.length, "two or three rows — never a blank one").toBeGreaterThanOrEqual(2);
  for (const f of facts) expect(f.v, `${f.k} has a value`).not.toBe("");
  expect(facts.map((f) => f.k)).toContain("Plan");
  expect(facts.map((f) => f.k)).toContain("Querying");
});
