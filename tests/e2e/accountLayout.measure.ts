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

/* ═══ PHASE 2 — grid, stable height, two-column bodies ═══════════════════════ */

test("the section card never resizes between sections — Plan alone exceeds the floor", async ({ page }) => {
  const h: Record<string, number> = {};
  const w: Record<string, number> = {};
  for (const r of ACCOUNT_ROUTES) {
    await openRoute(page, r.path, { width: 1440, height: 900 });
    const box = (await rect(page, "#acct-panel .acct-card"))!;
    h[r.id] = box.h;
    w[r.id] = box.w;
  }
  console.log("\nSECTION CARD\n" + ACCOUNT_ROUTES.map((r) => `${r.id.padEnd(15)} h=${h[r.id]}  w=${w[r.id]}`).join("\n"));

  /* ⚠️ THE WIDTH MUST NOT MOVE EITHER. It used to be a 500px track widened to 660 for Plan alone,
     so navigating changed the card's width as well as its height. */
  const widths = new Set(ACCOUNT_ROUTES.filter((r) => r.id !== "data").map((r) => w[r.id]));
  expect([...widths], "one work-column width for every section").toHaveLength(1);

  const others = ACCOUNT_ROUTES.filter((r) => r.id !== "plan" && r.id !== "data").map((r) => h[r.id]);
  expect([...new Set(others)], "the short sections all sit on the floor").toHaveLength(1);
  expect(others[0], "and the floor is 520").toBe(520);
  expect(h.plan, "Plan grows past it, which is allowed").toBeGreaterThanOrEqual(520);
});

test("two-column bodies are two columns at 1440 and one at 800", async ({ page }) => {
  const two = ["profile", "security", "notifications", "preferences", "data"];
  for (const id of two) {
    const path = ACCOUNT_ROUTES.find((r) => r.id === id)!.path;
    for (const width of [1440, 800]) {
      await openRoute(page, path, { width, height: 900 });
      const cols = await page.evaluate(() => {
        const el = document.querySelector("#acct-panel .acct-two") as HTMLElement | null;
        if (!el) return null;
        const kids = [...el.children] as HTMLElement[];
        const tops = new Set(kids.map((k) => Math.round(k.getBoundingClientRect().top)));
        return { children: kids.length, distinctTops: tops.size, template: getComputedStyle(el).gridTemplateColumns };
      });
      console.log(`${id.padEnd(14)} @${width}  ${JSON.stringify(cols)}`);
      expect(cols, `${id} must have a two-column body`).not.toBeNull();
      /* Side by side means the cells SHARE a top edge; stacked means they do not. Measured, not
         read off the template — a grid can declare two columns and still wrap. */
      if (width === 1440) expect(cols!.distinctTops, `${id} @1440 side by side`).toBe(1);
      else expect(cols!.distinctTops, `${id} @800 stacked`).toBeGreaterThan(1);
    }
  }
});

test("Plan keeps its comparison full-width, never nested in the two-column body", async ({ page }) => {
  await openRoute(page, "/account/plan", { width: 1440, height: 900 });
  const nested = await page.evaluate(() => !!document.querySelector("#acct-panel .acct-two .plc-grid"));
  const grid = (await rect(page, "#acct-panel .plc-grid"))!;
  const body = (await rect(page, "#acct-panel .acct-cardbody"))!;
  console.log("plc-grid", JSON.stringify(grid), "body", JSON.stringify(body));
  expect(nested, "four 250px columns would be unreadable").toBe(false);
  expect(body.w - grid.w, "the comparison uses the body's full width").toBeLessThanOrEqual(56);
});

test("the plane is still the only scroll region at 1440x900", async ({ page }) => {
  await openRoute(page, "/account/plan", { width: 1440, height: 900 });
  const scroll = await page.evaluate(() => {
    const st = document.getElementById("app-stage-scroll");
    const pg = document.querySelector(".acct-page") as HTMLElement;
    const pl = document.querySelector(".acct-plane") as HTMLElement;
    return {
      stageMax: st ? st.scrollHeight - st.clientHeight : -1,
      pageMax: pg.scrollHeight - pg.clientHeight,
      planeMax: pl.scrollHeight - pl.clientHeight,
    };
  });
  console.log("SCROLL", JSON.stringify(scroll));
  expect(scroll.stageMax, "the stage must not scroll").toBeLessThanOrEqual(0);
  expect(scroll.pageMax, "nor the page box").toBeLessThanOrEqual(1);
});
