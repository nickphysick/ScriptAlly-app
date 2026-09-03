import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { setRangeTo, RANGE_LABELS } from "./calControls";

/**
 * ⚠️ THE FADE AUDIT (v55, Phase 2) — the classes a card carries against the classes its DATES
 * require, per the ref's own predicate:
 *
 *     fL = waitFrom < windowStart
 *     fR = (namedEnd === null) || namedEnd > windowEnd
 *
 * ⚠️ ASSERTED FROM THE DATES, NEVER FROM THE CLASSES. A probe that reads `fadeR` and checks
 * `fadeR` is one reading of one fact. The page publishes `data-truefrom`, `data-namedend` and
 * `data-days`; the required classes are computed from those and compared with what is painted.
 *
 * The fault this replaces: `right` read `live`, which means "this piece reaches today" and is true
 * of every non-terminal relationship whatever date it runs to. 22 of 22 cards faded, five of them
 * with named ends 1.5 to 13.5 days INSIDE the window.
 */
const audit = (page: import("@playwright/test").Page) => page.evaluate(() => {
  const vis = (e: Element) => (e as HTMLElement).getBoundingClientRect().width > 0;
  const maskOf = (e: HTMLElement | null) => {
    if (!e) return "none";
    const cs = getComputedStyle(e);
    const wk = (cs as unknown as Record<string, string>).webkitMaskImage;
    return cs.maskImage !== "none" ? cs.maskImage : (wk && wk !== "none" ? wk : "none");
  };
  return ([...document.querySelectorAll(".tl-p")] as HTMLElement[]).filter(vis).map((c) => {
    const row = c.closest(".tl-rrow") as HTMLElement | null;
    const days = Number(c.dataset.days || "0");
    const trueFrom = Number(c.dataset.truefrom || "NaN");
    const ne = c.dataset.namedend === "none" ? null : Number(c.dataset.namedend);
    return {
      name: (row?.querySelector(".tl-nm2")?.textContent || "").trim().slice(0, 18),
      rel: c.dataset.rel || "", trueFrom, namedEnd: ne, days,
      hasL: c.classList.contains("fadeL"), hasR: c.classList.contains("fadeR"),
      wantL: trueFrom < -0.1,
      wantR: ne == null || ne > days + 0.1,
      mask: maskOf(c.querySelector(".tl-frame") as HTMLElement | null) !== "none",
    };
  });
});

test("every card's fades follow its dates — every range", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.addStyleTag({ content: ".tl-p, .tl-p.owed { animation: none !important; }" });
  await page.waitForTimeout(900);
  const shapes = new Set<string>();
  let checked = 0;
  const wrong: string[] = [];
  for (let i = 0; i < RANGE_LABELS.length; i++) {
    await setRangeTo(page, i);
    const rows = await audit(page);
    expect(rows.length, `[${RANGE_LABELS[i]}] no cards`).toBeGreaterThan(8);
    for (const r of rows) {
      checked += 1;
      shapes.add(`${r.wantL ? "L" : "-"}${r.wantR ? "R" : "-"}`);
      if (r.hasL !== r.wantL || r.hasR !== r.wantR) {
        wrong.push(`${RANGE_LABELS[i]} ${r.name}: trueFrom ${r.trueFrom} namedEnd ${r.namedEnd}/${r.days}`
          + ` → carries ${r.hasL ? "L" : "-"}${r.hasR ? "R" : "-"}, requires ${r.wantL ? "L" : "-"}${r.wantR ? "R" : "-"}`);
      }
      /* ⚠️ THE MASK IS THE PAINTED CONSEQUENCE, and it is asserted separately — a class without
         its mask, or a mask without its class, is the fault wearing the other's clothes. */
      const wantMask = r.wantL || r.wantR;
      if (r.mask !== wantMask) {
        wrong.push(`${RANGE_LABELS[i]} ${r.name}: mask=${r.mask} but requires ${wantMask}`);
      }
    }
  }
  console.log(`cards audited ${checked} · shapes present ${[...shapes].sort().join(" ")}`);
  for (const w of wrong.slice(0, 10)) console.log(`  ${w}`);
  /* ⚠️ MORE THAN ONE SHAPE, or the audit is over a board where every card is the same case and
     agreeing with the predicate proves nothing about the others. */
  expect(shapes.size, "every card on the board is the same fade shape").toBeGreaterThan(1);
  expect(wrong, "a card's fades do not follow its dates").toEqual([]);
});

test("⚠️ A CARD ENDING INSIDE THE WINDOW HAS NO MASK — the Dunn/Whitfield case", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.addStyleTag({ content: ".tl-p, .tl-p.owed { animation: none !important; }" });
  await page.waitForTimeout(900);
  /* the widest range gives the most named ends room to fall inside the window */
  /* ⚠️ v58 has ONE window; the index that used to pick a wider range is 0 now. See `setRangeTo`. */
  await setRangeTo(page, 0);
  const rows = await audit(page);
  const inside = rows.filter((r) => r.namedEnd != null && r.namedEnd <= r.days - 0.1 && r.trueFrom >= -0.1);
  const endsInside = rows.filter((r) => r.namedEnd != null && r.namedEnd <= r.days - 0.1);
  console.log(`cards ending inside the window: ${endsInside.length} of ${rows.length}`
    + ` · of those, starting inside too: ${inside.length}`);
  for (const r of endsInside.slice(0, 8)) {
    console.log(`  ${r.name}: end ${r.namedEnd}/${r.days} → R=${r.hasR} mask=${r.mask}`);
  }
  expect(endsInside.length, "no card ends inside the window, so the case is untested").toBeGreaterThan(2);
  expect(endsInside.filter((r) => r.hasR).map((r) => r.name),
    "a card terminating on a date inside the window still fades at its right edge").toEqual([]);
  /* and one that starts inside too carries no mask at all */
  expect(inside.length, "no card lies wholly inside the window").toBeGreaterThan(0);
  expect(inside.filter((r) => r.mask).map((r) => r.name),
    "a card wholly inside the window dissolves an edge").toEqual([]);
});

/**
 * ⚠️ EVERY WAIT HAS AN END, AND EVERY RELATIONSHIP ROW DRAWS A CARD (v55, Phase 3).
 *
 * Rosalind Vale drew nothing: her card was exactly zero days wide and the fit pass's sliver guard
 * hid it. The cause was not an end that failed to resolve — it resolved to the same day the wait
 * STARTED, because on a terminal row the closing event is itself the last status change. A closed
 * relationship's card spans the wait that ENDED: from the status change before the close to the
 * close, which is how long the final wait actually ran.
 */
test("no relationship row is missing its card, and none is zero-width", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.addStyleTag({ content: ".tl-p, .tl-p.owed { animation: none !important; }" });
  await page.waitForTimeout(900);
  for (let i = 0; i < RANGE_LABELS.length; i++) {
    await setRangeTo(page, i);
    const got = await page.evaluate(() => {
      /* ⚠️ UNFILTERED BY VISIBILITY. The recon probe asked which of the VISIBLE cards were
         zero-width, having filtered visibility out first — a predicate that cannot match, and it
         reported this fault as unfounded. */
      const rows = ([...document.querySelectorAll(".tl-rrow")] as HTMLElement[])
        .filter((r) => r.getBoundingClientRect().height > 0);
      const relRows = rows.filter((r) => !r.querySelector(".tl-tchip"));
      return {
        rows: rows.length, relRows: relRows.length,
        noCard: relRows.filter((r) => !r.querySelector(".tl-p"))
          .map((r) => (r.querySelector(".tl-nm2")?.textContent || "").trim()),
        thin: relRows.flatMap((r) => ([...r.querySelectorAll(".tl-p")] as HTMLElement[])
          .filter((c) => c.getBoundingClientRect().width < 2)
          .map((c) => `${(r.querySelector(".tl-nm2")?.textContent || "").trim()} (w=${c.getBoundingClientRect().width.toFixed(1)}, display ${getComputedStyle(c).display})`)),
      };
    });
    console.log(`${RANGE_LABELS[i]}: ${got.relRows} relationship rows of ${got.rows}`
      + ` · no card ${got.noCard.length} · zero-width ${got.thin.length}`);
    expect(got.relRows, `[${RANGE_LABELS[i]}] no relationship rows`).toBeGreaterThan(8);
    expect(got.noCard, `[${RANGE_LABELS[i]}] a relationship row draws no card`).toEqual([]);
    expect(got.thin, `[${RANGE_LABELS[i]}] a card is zero-width`).toEqual([]);
  }
});

test("every card's right edge is its resolved end, or the window's edge", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.addStyleTag({ content: ".tl-p, .tl-p.owed { animation: none !important; }" });
  await page.waitForTimeout(900);
  await setRangeTo(page, 0);
  const got = await page.evaluate(() => {
    const vis = (e: Element) => (e as HTMLElement).getBoundingClientRect().width > 0;
    return ([...document.querySelectorAll(".tl-p")] as HTMLElement[]).filter(vis).map((c) => {
      const lane = c.parentElement!.getBoundingClientRect();
      const b = c.getBoundingClientRect();
      const days = Number(c.dataset.days || "0");
      const ne = c.dataset.namedend === "none" ? null : Number(c.dataset.namedend);
      const fadeR = c.classList.contains("fadeR");
      /* a running card is drawn 34px wider so its dissolve falls past today — that widening is
         not part of the date arithmetic and is subtracted before comparing */
      const pad = fadeR ? 34 : 0;
      const row = c.closest(".tl-rrow") as HTMLElement | null;
      return { name: (row?.querySelector(".tl-nm2")?.textContent || "").trim().slice(0, 16),
        right: b.right - pad, ne, days,
        wantX: ne != null && ne <= days ? lane.left + (ne / days) * lane.width : null,
        laneR: lane.right };
    });
  });
  const dated = got.filter((g) => g.wantX != null);
  console.log(`cards with a resolved end inside the window: ${dated.length} of ${got.length}`);
  for (const g of dated.slice(0, 6)) {
    console.log(`  ${g.name}: right ${g.right.toFixed(1)} vs its end's x ${g.wantX!.toFixed(1)}`
      + ` (diff ${(g.right - g.wantX!).toFixed(1)})`);
  }
  expect(dated.length, "no card has a resolved end inside the window").toBeGreaterThan(2);
  expect(dated.filter((g) => Math.abs(g.right - g.wantX!) > 1)
    .map((g) => `${g.name}: right ${g.right.toFixed(1)} vs end ${g.wantX!.toFixed(1)}`),
    "a card does not terminate on its resolved end").toEqual([]);
});
