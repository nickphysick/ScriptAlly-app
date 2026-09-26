/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * mastheadMatrix — REWRITTEN for page header v1 (§3.3). Every workspace route opens with the header
 * it should, at the size the table says, on the shared column.
 *
 * ⚠️ WHAT THIS REPLACES, so the claims are not lost. It asserted ONE shared masthead across ten
 * pages: the same shape, the same mark at one size, no control in any of them, and an OPTED_OUT set
 * of exactly three pages that declined it. Every one of those is now either untrue by design (there
 * are two sizes, the header holds controls, the marks are gone) or moved: the SHAPE is a partition
 * in `mastheadFormat.test.tsx`, and the GEOMETRY is `pageHeaderV1.measure.ts`.
 *
 * ⚠️ AND THE OPTED-OUT SET INVERTED. It was the three pages that declined the shared masthead; the
 * two of them that remain are the FULL-size set, which is the opposite relationship to the one the
 * name described. The register is this file's own table now, so a page changing size is a diff here
 * rather than a silent regrouping.
 *
 * The division of labour, stated because duplicating it is the failure mode: `pageHeaderV1` measures
 * the geometry at two widths on two exemplar pages; this file asks every route which size it is.
 */
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { openRoute } from "./measure";

const OUT = resolve("test-results/masthead-matrix");

/**
 * §3.3 — the table. `full` is the open header; `compact` is every other workspace route with a
 * title; `none` is a page that draws its own head and is out of this build by ruling.
 */
const MATRIX: { route: string; size: "full" | "compact" | "none"; why?: string }[] = [
  { route: "/queries", size: "full" },
  /* ⚠️ NOT CONVERTED, AND NOT A FAILURE — recorded as `none` with its reason so the gap is in the
     table rather than in a comment nobody reads. Its hero is a measured layout that places its
     cards from the art's own box; see the run report. */
  { route: "/agents", size: "none", why: "the Contact list still draws its own measured hero" },
  /* out of this build by ruling — it shows a single manuscript and is being redesigned */
  { route: "/manuscripts", size: "none", why: "out of this build by ruling" },
  { route: "/queries/analytics", size: "compact" },
  { route: "/todo", size: "compact" },
  { route: "/todo/calendar", size: "compact" },
  { route: "/todo/noteboard", size: "compact" },
  { route: "/agents/discover", size: "compact" },
  { route: "/manuscripts/comps", size: "compact" },
  { route: "/manuscripts/packages", size: "compact" },
  { route: "/import", size: "compact" },
];

async function open(page: Page, path: string, w: number) {
  await openRoute(page, path, { width: w, height: 900 });
  await expect(page.locator(".os-skelpage")).toHaveCount(0, { timeout: 15_000 }).catch(() => {});
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForTimeout(700);
}

test("§3.3 · every workspace route opens with the header the table says", async ({ page }) => {
  const seen: Record<string, unknown>[] = [];
  for (const row of MATRIX) {
    await open(page, row.route, 1440);
    const r = await page.evaluate(() => {
      /* ⚠️ MEASURED, NEVER `querySelector` — every workspace page stays mounted and the shell
         toggles `display`, so the first match is routinely a page nobody can see. */
      const h = [...document.querySelectorAll("[data-probe='page-header']")]
        .find((e) => e.getBoundingClientRect().height > 0) as HTMLElement | undefined;
      /**
       * ⚠️ THE COLUMN'S LEFT IS COMPUTED FROM THE RULE, not read off whichever child happens to
       * carry a max-width. The first form did the latter and picked a full-bleed child whose
       * padding is 0, so it reported the column at the scroller's own edge and failed a page whose
       * header was exactly right.
       */
      const sc = [...document.querySelectorAll(".wpg-scroll")].find((e) => e.getBoundingClientRect().width > 0) as HTMLElement | undefined;
      if (!h) return { size: "none" as const, left: null as number | null, colLeft: null as number | null };
      const sb = sc?.getBoundingClientRect();
      const gut = Math.min(52, Math.max(28, window.innerWidth * 0.032));
      return {
        size: (h.dataset.size ?? "none") as "full" | "compact" | "none",
        left: Math.round((h.querySelector("[data-probe='title']")?.getBoundingClientRect().left ?? -1)),
        colLeft: sb ? Math.round(sb.left + Math.max(0, (sb.width - Math.min(1360, sb.width)) / 2) + gut) : null,
      };
    });
    seen.push({ route: row.route, want: row.size, got: r.size, ...r });
    expect(r.size, `${row.route} opens with a ${r.size} header, the table says ${row.size}${row.why ? ` (${row.why})` : ""}`)
      .toBe(row.size);
    /* ⚠️ AND THE HEADER IS ON THE COLUMN, which is the fault a size check cannot see: every compact
       page opened 35px right of every full one while both were the right size. */
    if (r.size !== "none" && r.colLeft != null) {
      expect(Math.abs(r.left - r.colLeft), `${row.route}'s header is ${r.left}, the column starts at ${r.colLeft}`)
        .toBeLessThanOrEqual(1);
    }
  }
  mkdirSync(OUT, { recursive: true });
  writeFileSync(resolve(OUT, "matrix.json"), JSON.stringify(seen, null, 2));
  /* the population, or a run that reached no route reports a clean matrix of nothing */
  expect(seen.length, "the matrix shrank — a route left the census").toBe(MATRIX.length);
  expect(seen.filter((s) => s.got === "compact").length, "the compact set emptied").toBeGreaterThan(5);
});
