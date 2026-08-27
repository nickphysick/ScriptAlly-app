import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

/**
 * Phase 4 — today's mark holds today's label, whatever the range makes of it.
 *
 * ⚠️ THE FAULT WAS A FIXED SIZE MEETING A VARIABLE LABEL. The mark is a 19px round disc, which is
 * exactly right for the thing it was designed around: a one- or two-digit day number. The range
 * control then made that label "25 Aug" at week grain and "Aug" at month grain, and nothing
 * changed the marker wrapping it — so the header rendered a burgundy blob with its text spilling
 * out of both sides. Neither half was wrong on its own, which is why it survived.
 */
const STOPS = ["1 week", "2 weeks", "1 month", "3 months", "6 months"];

test("Phase 4 — today's header shows a date, not a blob", async ({ page }) => {
  const errs: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 140)); });
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(950);
  const slider = page.getByRole("slider", { name: /range/i });

  const heights = new Set<number>();
  for (let i = 0; i < STOPS.length; i++) {
    await slider.fill(String(i));
    await page.waitForTimeout(620);
    const m = await page.evaluate(() => {
      const all = [...document.querySelectorAll(".tl")] as HTMLElement[];
      const tl = all.find((e) => e.getBoundingClientRect().height > 0)!;
      const dd = tl.querySelector<HTMLElement>(".tl-dh.today .tl-dd");
      if (!dd) return null;
      const r = dd.getBoundingClientRect();
      return {
        text: (dd.textContent || "").trim(),
        w: Math.round(r.width), h: Math.round(r.height),
        /* ⚠️ THE INK AGAINST THE BOX. `scrollWidth > clientWidth` is the honest question here:
           the mark is `inline-flex` and centres its text, so an overflowing label spills equally
           out of both sides and looks like a blob rather than like a clipped word. */
        overflows: dd.scrollWidth > dd.clientWidth + 1,
        fill: getComputedStyle(dd).backgroundColor,
      };
    });
    console.log(`  ${STOPS[i].padEnd(9)} "${m?.text}" ${m?.w}×${m?.h}${m?.overflows ? "  ⚠ OVERFLOWS" : ""}`);
    expect(m, `${STOPS[i]}: today is not on the board`).not.toBeNull();
    /* ⚠️ A DATE, NOT AN EMPTY MARK. A blob is what an empty one would also look like. */
    expect(m!.text.length, `${STOPS[i]}: today's mark carries no label`).toBeGreaterThan(0);
    expect(m!.overflows, `${STOPS[i]}: "${m!.text}" spills out of its mark`).toBe(false);
    expect(m!.fill, `${STOPS[i]}: today's mark lost its fill`).toBe("rgb(124, 58, 42)");
    heights.add(m!.h);
  }

  /* ⚠️ AND THE HEIGHT IS CONSTANT, which is what the original fixed disc was protecting: today's
     mark must not change the header's height as the range moves. Widening it kept that. */
  console.log(`  heights across the five ranges: ${[...heights].join(", ")}`);
  expect([...heights], "today's mark changes the header's height between ranges").toHaveLength(1);

  console.log(`console errors: ${errs.length ? errs.join(" | ") : "none"}`);
  expect(errs, "the board threw").toEqual([]);
});
