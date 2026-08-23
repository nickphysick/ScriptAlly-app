/**
 * NOTEBOARD WORKFLOW v2 — the claims only a rendered page can settle.
 *   SA_E2E_BASE_URL=dev …                  (red, against HEAD)
 *   SA_E2E_BASE_URL=http://localhost:4195  (green)
 * Board state is the caller's: seedNotes.mjs --clean for the empty cases.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const ROUTE = "/todo/noteboard";
const WIDE = { width: 1440, height: 1400 };

/** Every SVG in the workflow, with its box and a PALETTE fill (never SVG's default black). */
const artReadings = (page: import("@playwright/test").Page) =>
  page.evaluate(() => {
    const PALETTE = ["rgb(251, 243, 217)", "rgb(245, 226, 218)", "rgb(233, 237, 230)"];
    return Array.from(document.querySelectorAll<SVGSVGElement>(".nb-step-art svg")).map((s) => {
      const r = s.getBoundingClientRect();
      const filled = Array.from(s.querySelectorAll<SVGElement>("rect,path"))
        .find((el) => PALETTE.includes(getComputedStyle(el).fill));
      return {
        label: s.getAttribute("aria-label"), role: s.getAttribute("role"),
        w: Math.round(r.width), h: Math.round(r.height),
        fill: filled ? getComputedStyle(filled).fill : null,
        gradients: s.querySelectorAll("linearGradient,radialGradient,filter").length,
      };
    });
  });

const assertArt = (arts: Awaited<ReturnType<typeof artReadings>>, where: string) => {
  expect(arts, `${where}: the three illustrations are not on the page`).toHaveLength(3);
  for (const a of arts) {
    expect(a.role, where).toBe("img");
    expect(a.w, `${where}: zero-width SVG`).toBeGreaterThan(40);
    expect(a.h, `${where}: zero-height SVG`).toBeGreaterThan(40);
    /* ⚠️ A PALETTE COLOUR, not merely "a real colour string" — every unpainted SVG shape carries
       SVG's default black, so a probe satisfied by rgb(0,0,0) is satisfied by artwork that was
       never painted at all. */
    expect(a.fill, `${where}: no PALETTE fill — the artwork is unpainted`).toMatch(/^rgb\(/);
    expect(a.fill, where).not.toBe("rgb(0, 0, 0)");
    expect(a.gradients, `${where}: a gradient reached the artwork`).toBe(0);
  }
  expect(new Set(arts.map((a) => a.label)).size, `${where}: not three distinct scenes`).toBe(3);
};

test.describe("Phase 2 — the two arrangements", () => {
  test("(d) empty board: the panels are PAINTED, and the CTA sits between lede and steps", async ({ page }) => {
    await openRoute(page, ROUTE, WIDE);
    /* ⚠️ THE PRECONDITION, STATED. This case is about the EMPTY arrangement, and the other cases
       in this file pin notes on the same shared harness account — so a stale board turns "the
       arrangement is missing" into the error, which reads like a broken page rather than a dirty
       fixture. Assert what the case needs, and say which it is. */
    const noteCount = await page.locator(".nb-note:not(.nb-example)").count();
    expect(noteCount, `the board holds ${noteCount} note(s) — run seedNotes.mjs --clean first`).toBe(0);
    const boxes = await page.evaluate(() => {
      const b = (sel: string) => document.querySelector(sel)?.getBoundingClientRect() ?? null;
      const h = b(".nb-wf-h"), l = b(".nb-wf-lede"), c = b(".nb-wf-cta"), s = b(".nb-steps");
      return h && l && c && s
        ? { ordered: h.bottom <= l.top + 1 && l.bottom <= c.top + 1 && c.bottom <= s.top + 1, has: true }
        : { ordered: null, has: false };
    });
    expect(boxes.has, "the empty arrangement is not on the page").toBe(true);
    console.log(`[empty] heading·lede·cta·steps ordered on screen = ${boxes.ordered}`);
    expect(boxes.ordered, "the CTA is not between the lede and the panels").toBe(true);
    const arts = await artReadings(page);
    for (const a of arts) console.log(`[empty art] ${String(a.label).slice(0, 30).padEnd(30)} ${a.w}×${a.h} fill=${a.fill}`);
    assertArt(arts, "empty");
  });

  test("(c) ⚠️ the workflow sits BELOW the board — measured at one note and at four", async ({ page }) => {
    /* ⚠️ GEOMETRY, NOT DOM ORDER. The board is a multicol block whose height is whatever the
       columns grew to; "later in the DOM" would not have caught the flow problem that put the
       examples' hint line beside the cards it introduced one run earlier. */
    for (const want of [1, 4]) {
      await openRoute(page, ROUTE, WIDE);
      /* pin through the real composer until the board holds `want` notes */
      while (await page.locator(".nb-note:not(.nb-example)").count() < want) {
        await page.locator(".tpl-tools .tdb-addb").filter({ hasText: "Pin a note" }).locator("visible=true").first().click();
        await page.locator(".nb-compose textarea").fill(`WFNOTE ${await page.locator(".nb-note").count() + 1}`);
        await page.locator(".nb-compose .nb-csave").click();
        await page.waitForTimeout(900);
      }
      const d = await page.evaluate(() => {
        const board = document.querySelector(".nb-board")?.getBoundingClientRect() ?? null;
        const sep = document.querySelector(".nb-wf-sep")?.getBoundingClientRect() ?? null;
        const cta = document.querySelectorAll(".nb-wf-cta").length;
        const heading = (document.querySelector(".nb-wf-h") as HTMLElement | null)?.innerText ?? null;
        return board && sep ? { gap: Math.round(sep.top - board.bottom), cta, heading } : null;
      });
      expect(d, `${want} notes: no board or no separator`).toBeTruthy();
      console.log(`[below ${want}] board.bottom → sep.top gap = ${d!.gap}px · cta rows = ${d!.cta} · heading = ${JSON.stringify(d!.heading)}`);
      expect(d!.gap, "the separator is not below the board").toBeGreaterThan(0);
      expect(d!.cta, "a CTA row rendered beside a board that already has two doors").toBe(0);
      expect(d!.heading).toBe("Write it down for later…");
      assertArt(await artReadings(page), `${want} notes`);
    }
  });
});

test.describe("Phase 1 — the drawer", () => {
  test("(c) Keep this creates a real note, closes the drawer, and posts the receipt", async ({ page }) => {
    await openRoute(page, ROUTE, WIDE);
    await page.getByRole("button", { name: "Examples" }).click();
    await page.waitForTimeout(500);
    const drawer = page.locator(".nb-drawer");
    await expect(drawer, "the drawer did not open").toBeVisible();

    const target = await drawer.locator(".nb-exnote").first().locator(".nb-body").innerText();
    await drawer.locator(".nb-keep").first().click();
    await page.waitForTimeout(1400);

    await expect(drawer, "the drawer stayed open after Keep this").not.toBeVisible();
    /* the board's ORDERED bodies now begin with that example — one comparison of the head */
    const first = await page.locator(".nb-note .nb-body").first().innerText();
    console.log(`[keep] kept "${target.slice(0, 40)}…" · board head "${first.slice(0, 40)}…"`);
    expect(first).toBe(target);
  });
});
