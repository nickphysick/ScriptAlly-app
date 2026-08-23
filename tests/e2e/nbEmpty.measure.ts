/**
 * NOTEBOARD EMPTY STATE — the claims only a rendered page can settle.
 *   SA_E2E_BASE_URL=dev …                  (red, against HEAD)
 *   SA_E2E_BASE_URL=http://localhost:4194  (green, against the fix)
 *
 * Requires a board with ZERO notes: node tests/e2e/seedNotes.mjs --clean
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const ROUTE = "/todo/noteboard";
const WIDE = { width: 1440, height: 1400 };

test.describe("Phase 1 — the illustrated empty state", () => {
  test("(e) ⚠️ the three SVGs are PAINTED — a real box AND a fill that computes to a colour", async ({ page }) => {
    await openRoute(page, ROUTE, WIDE);
    const arts = await page.evaluate(() => {
      const svgs = Array.from(document.querySelectorAll<SVGSVGElement>(".nb-step-art svg"));
      return svgs.map((s) => {
        const r = s.getBoundingClientRect();
        /* ⚠️ A PALETTE COLOUR, NOT MERELY "a real colour string". The first draft took the first
           element with any fill and got `rgb(0, 0, 0)` from the desk-line path — SVG's DEFAULT
           fill, which every unpainted shape carries. A probe satisfied by the default is
           satisfied by artwork that was never painted at all. It now requires one of the three
           papers' own fills, which only the ported geometry can produce. */
        const PALETTE = ["rgb(251, 243, 217)", "rgb(245, 226, 218)", "rgb(233, 237, 230)"];
        const filled = Array.from(s.querySelectorAll<SVGElement>("rect,path"))
          .find((el) => PALETTE.includes(getComputedStyle(el).fill));
        return {
          label: s.getAttribute("aria-label"), role: s.getAttribute("role"),
          w: Math.round(r.width), h: Math.round(r.height),
          fill: filled ? getComputedStyle(filled).fill : null,
          /* the flat law, measured rather than grepped */
          gradients: s.querySelectorAll("linearGradient,radialGradient,filter").length,
        };
      });
    });
    expect(arts, "the three illustrations are not on the page").toHaveLength(3);
    for (const a of arts) {
      console.log(`[art] ${String(a.label).slice(0, 34).padEnd(34)} ${a.w}×${a.h} fill=${a.fill} gradients=${a.gradients}`);
      expect(a.role).toBe("img");
      expect(a.label, "an illustration has no label").toBeTruthy();
      expect(a.w, "zero-width SVG").toBeGreaterThan(40);
      expect(a.h, "zero-height SVG").toBeGreaterThan(40);
      /* ⚠️ A REAL COLOUR STRING — not "", not "none", not transparent */
      /* a real colour string AND one of the palette's own — never SVG's default black */
      expect(a.fill, "no PALETTE fill inside the scene — the artwork is unpainted").toMatch(/^rgb\(/);
      expect(a.fill).not.toBe("rgb(0, 0, 0)");
      expect(a.gradients, "a gradient or filter reached the artwork").toBe(0);
    }
    /* three DISTINCT scenes, not one component rendered thrice */
    expect(new Set(arts.map((a) => a.label)).size).toBe(3);
  });

  test("the workflow and the example papers COEXIST at zero notes, in order", async ({ page }) => {
    await openRoute(page, ROUTE, WIDE);
    const d = await page.evaluate(() => {
      const box = (sel: string) => document.querySelector(sel)?.getBoundingClientRect() ?? null;
      const opening = box(".nb-opening"), steps = box(".nb-steps"), cta = box(".nb-opening-cta");
      const exhead = box(".nb-exintro");
      const exs = Array.from(document.querySelectorAll("[data-example]")).map((e) => e.getBoundingClientRect());
      return {
        has: { opening: !!opening, steps: !!steps, cta: !!cta, exhead: !!exhead, exs: exs.length },
        order: opening && steps && cta && exhead && exs.length
          ? opening.bottom <= steps.top + 1 && steps.bottom <= cta.top + 1
            && cta.bottom <= exhead.top + 1 && exs.every((e) => e.top >= exhead.bottom - 1)
          : null,
      };
    });
    console.log(`[coexist] ${JSON.stringify(d.has)} · ordered=${d.order}`);
    expect(d.has.opening && d.has.steps && d.has.cta, "the workflow is missing").toBe(true);
    expect(d.has.exs, "the papers did not survive beside the workflow").toBe(3);
    expect(d.order, "the sections are not stacked in the ref's order on screen").toBe(true);
  });
});

test.describe("Phase 2 — one composer, three entry points", () => {
  test("each opener mounts THE SAME composer, focused — never a lookalike", async ({ page }) => {
    await openRoute(page, ROUTE, WIDE);
    /* ⚠️ IDENTITY, NOT PRESENCE. A second composer that merely looked right would pass a count;
       the class SET and the focused element are what say it is the same component. */
    const openAndRead = async (click: () => Promise<void>) => {
      await click();
      await page.waitForTimeout(350);
      const d = await page.evaluate(() => {
        const all = Array.from(document.querySelectorAll<HTMLElement>(".nb-compose"));
        const c = all[0];
        return c ? {
          count: all.length,
          classes: c.className.split(/\s+/).sort().join(" "),
          focusedIsItsTextarea: document.activeElement === c.querySelector("textarea"),
        } : null;
      });
      await page.locator(".nb-ccancel").click();
      await page.waitForTimeout(250);
      return d;
    };

    const fromCta = await openAndRead(() => page.locator(".nb-opening-cta .tdb-addb").click());
    /* ⚠️ THE VISIBLE ROW. Main pages stay MOUNTED, so `.tpl-tools .tdb-addb` matches the To-do
       list's and the Calendar's buttons too — the default-subject trap, which strict mode caught
       here rather than letting it answer about the wrong page. */
    const fromToolbar = await openAndRead(() =>
      page.locator(".tpl-tools .tdb-addb").filter({ hasText: "Pin a note" }).locator("visible=true").first().click());
    const fromGhost = await openAndRead(() => page.locator(".nb-ghost").click());

    for (const [name, d] of [["cta", fromCta], ["toolbar", fromToolbar], ["ghost", fromGhost]] as const) {
      console.log(`[composer] ${name.padEnd(8)} count=${d?.count} focused=${d?.focusedIsItsTextarea} classes="${d?.classes}"`);
      expect(d, `${name} opened nothing`).toBeTruthy();
      expect(d!.count, `${name} mounted more than one composer`).toBe(1);
      expect(d!.focusedIsItsTextarea, `${name} did not focus the composer's textarea`).toBe(true);
    }
    /* the same component, by its class set — one code path, three doors */
    expect(fromCta!.classes).toBe(fromToolbar!.classes);
    expect(fromCta!.classes).toBe(fromGhost!.classes);
  });
});
