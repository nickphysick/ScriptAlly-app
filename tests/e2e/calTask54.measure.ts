import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { setRangeTo, RANGE_LABELS } from "./calControls";

/**
 * ⚠️ A TASK IS ONE POINT, DRAWN ONCE (v54, Phase 7).
 *
 * It was a pill — the shape this board uses for whose-move-it-is on a card, a state holding over a
 * span — so a task read as a fifth kind of card while carrying no duration to justify one. It is
 * an outlined mark at its day, its name beside it and the day beneath.
 */
test("a task is a point: outlined mark, Playfair name, mono day — and no pill", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(900);
  const got = await page.evaluate(() => {
    const vis = (e: Element) => (e as HTMLElement).getBoundingClientRect().width > 0;
    const chips = ([...document.querySelectorAll(".tl-tchip")] as HTMLElement[]).filter(vis);
    return chips.map((c) => {
      const cs = getComputedStyle(c);
      const mk = c.querySelector(".tl-tmk") as HTMLElement | null;
      const nm = c.querySelector(".tl-tname") as HTMLElement | null;
      const du = c.querySelector(".tl-tdue") as HTMLElement | null;
      const mb = mk?.getBoundingClientRect();
      return { label: (nm?.textContent || "").trim().slice(0, 20),
        chipRadius: cs.borderTopLeftRadius, chipBorder: cs.borderTopWidth,
        chipBg: cs.backgroundColor,
        mark: mb ? `${Math.round(mb.width)}x${Math.round(mb.height)}` : "none",
        markBorder: mk ? getComputedStyle(mk).borderTopWidth : "",
        nameFont: nm ? getComputedStyle(nm).fontFamily.split(",")[0] : "",
        dueFont: du ? getComputedStyle(du).fontFamily.split(",")[0] : "",
        due: (du?.textContent || "").trim() };
    });
  });
  console.log(`task points ${got.length}`);
  for (const g of got) console.log(`  "${g.label}" mark ${g.mark} border ${g.markBorder}`
    + ` · name ${g.nameFont} · day "${g.due}" in ${g.dueFont}`
    + ` · chip radius ${g.chipRadius} border ${g.chipBorder} bg ${g.chipBg}`);
  expect(got.length, "no task on the board, so nothing was checked").toBeGreaterThan(0);
  for (const g of got) {
    /* ⚠️ NEVER A PILL — asserted on the chip's own painted shape rather than on a class name. */
    expect(parseFloat(g.chipRadius), `"${g.label}" is still drawn as a pill`).toBeLessThan(20);
    expect(parseFloat(g.chipBorder), `"${g.label}" still carries a chip border`).toBe(0);
    expect(g.chipBg, `"${g.label}" still carries a chip fill`).toBe("rgba(0, 0, 0, 0)");
    /* the point itself */
    expect(g.mark, `"${g.label}" has no 20px mark`).toBe("20x20");
    /* ⚠️ THE WIDTH IS NOT PINNED HERE. A sub-pixel border's used value rounds at DPR 1 — declared
       1.5px, Chromium reports 1px — so a rendered check can say the mark IS outlined and the
       1.5px is asserted in `calendarTokens.test.ts` where it can be read as written. The same
       split the today line needed. */
    expect(parseFloat(g.markBorder), `"${g.label}"'s mark is not outlined`).toBeGreaterThan(0);
    expect(g.nameFont, `"${g.label}" is not set in Playfair`).toContain("Playfair");
    expect(g.dueFont, `"${g.label}"'s day is not mono`).toContain("JetBrains");
    /* ⚠️ A DAY, NEVER A DURATION — a span is what a card states and a task does not have one. */
    expect(g.due, `"${g.label}" states a duration rather than a day`)
      .not.toMatch(/\b\d+\s*(day|week|month)/i);
    expect(g.due.length, `"${g.label}" states no day`).toBeGreaterThan(2);
  }
});

test("⚠️ AND A TASK IS RENDERED ONCE PER ROW, at every range", async ({ page }) => {
  /* a live chip and its origin ghost rendered identically once and read as one task drawn twice;
     the claim is stronger than "they look different" — the same task may not appear twice on one
     row at all, whatever it looks like. */
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(800);
  let checked = 0;
  for (let i = 0; i < RANGE_LABELS.length; i++) {
    await setRangeTo(page, i);
    const dupes = await page.evaluate(() => {
      const vis = (e: Element) => (e as HTMLElement).getBoundingClientRect().width > 0;
      const seen = new Map<string, number>();
      for (const row of ([...document.querySelectorAll(".tl-rrow")] as HTMLElement[]).filter(vis)) {
        const key = row.getAttribute("data-rowkey") || "";
        for (const c of ([...row.querySelectorAll(".tl-tchip")] as HTMLElement[]).filter(vis)) {
          /* the ghost is a distinct MARK of the same task and is allowed; what is forbidden is the
             same kind of the same task twice on one row */
          const id = `${key}::${(c.querySelector(".tl-tname")?.textContent || "").trim()}::${c.classList.contains("ghost") ? "ghost" : "live"}`;
          seen.set(id, (seen.get(id) ?? 0) + 1);
        }
      }
      return { total: [...seen.values()].reduce((a, b) => a + b, 0),
        twice: [...seen.entries()].filter(([, n]) => n > 1).map(([k]) => k) };
    });
    checked += dupes.total;
    expect(dupes.twice, `[${RANGE_LABELS[i]}] a task is drawn twice on one row`).toEqual([]);
  }
  console.log(`task marks checked across three ranges: ${checked}`);
  expect(checked, "no task marks were checked at any range").toBeGreaterThan(0);
});
