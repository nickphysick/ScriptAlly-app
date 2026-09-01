import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { setRangeTo, RANGE_LABELS } from "./calControls";

/**
 * ⚠️ THE PILL AND THE HEADLINE SHARE ONE LEFT EDGE, ON EVERY CARD (v55, Phase 5).
 *
 * They were a flex ROW, so the headline began after the pill and the pill's width is its text —
 * "Queried" against "Send the revision". Measured on the board: the pill sat at two correct insets
 * and the headline at NINE x values, and no two rows started their sentence in the same place.
 * Nothing was centred; the eye simply had nothing to run down.
 *
 * The ref stacks them in a column inside a positioned clip, so one number sets where every line of
 * every card begins. This is asserted as ONE claim over the whole board, which is what makes a
 * board drawing nine of them fail on sight.
 */
const insets = (page: import("@playwright/test").Page) => page.evaluate(() => {
  const vis = (e: Element) => (e as HTMLElement).getBoundingClientRect().width > 0;
  return ([...document.querySelectorAll(".tl-p")] as HTMLElement[]).filter(vis).map((c) => {
    const b = c.getBoundingClientRect();
    const pill = c.querySelector(".tl-pill") as HTMLElement | null;
    const hl = c.querySelector(".tl-hl") as HTMLElement | null;
    const round = (n: number) => Math.round(n * 10) / 10;
    return {
      rel: c.dataset.rel || "", fadeL: c.classList.contains("fadeL"),
      pill: pill && vis(pill) ? round(pill.getBoundingClientRect().left - b.left) : null,
      hl: hl && vis(hl) ? round(hl.getBoundingClientRect().left - b.left) : null,
    };
  });
});

test("pill and headline begin at one inset, the same on every card", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.addStyleTag({ content: ".tl-p, .tl-p.owed { animation: none !important; }" });
  await page.waitForTimeout(900);
  const pillSet = new Set<string>(), hlSet = new Set<string>();
  const mismatched: string[] = [];
  let n = 0;
  for (let i = 0; i < RANGE_LABELS.length; i++) {
    await setRangeTo(page, i);
    for (const r of await insets(page)) {
      if (r.pill == null || r.hl == null) continue;
      n += 1;
      pillSet.add(`${r.fadeL ? "fadeL" : "flat"}:${r.pill}`);
      hlSet.add(`${r.fadeL ? "fadeL" : "flat"}:${r.hl}`);
      /* ⚠️ THE TWO AGAINST EACH OTHER, PER CARD — the board-wide sets could each hold one value
         and still be two DIFFERENT values, which is the fault wearing a tidy face. */
      if (Math.abs(r.pill - r.hl) > 0.6) {
        mismatched.push(`${RANGE_LABELS[i]} ${r.rel}: pill ${r.pill} vs headline ${r.hl}`);
      }
    }
  }
  console.log(`cards ${n} · pill insets ${[...pillSet].sort().join(" ")} · headline insets ${[...hlSet].sort().join(" ")}`);
  for (const m of mismatched.slice(0, 6)) console.log(`  ${m}`);
  expect(n, "no card carries both a pill and a headline").toBeGreaterThan(8);
  expect(mismatched, "a card's pill and headline start at different x").toEqual([]);
  /* and the whole board draws at exactly the two pinned insets */
  expect([...pillSet].sort(), "the pill is drawn at other than the two pinned insets")
    .toEqual(["fadeL:42", "flat:13"]);
  expect([...hlSet].sort(), "the headline is drawn at other than the two pinned insets")
    .toEqual(["fadeL:42", "flat:13"]);
});

test("⚠️ AND THE WORDS PAINT AT FULL OPACITY ON A CARD CUT AT BOTH ENDS", async ({ page }) => {
  /* the fade masks live on the frame; the content is a sibling of it. A mask on the element that
     CONTAINS the text dissolves the sentence with the fill — 14 of 23 rows, before v54 split them. */
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.addStyleTag({ content: ".tl-p, .tl-p.owed { animation: none !important; }" });
  await page.waitForTimeout(900);
  const got = await page.evaluate(() => {
    const vis = (e: Element) => (e as HTMLElement).getBoundingClientRect().width > 0;
    const maskOf = (e: HTMLElement | null) => {
      if (!e) return "none";
      const cs = getComputedStyle(e);
      const wk = (cs as unknown as Record<string, string>).webkitMaskImage;
      return cs.maskImage !== "none" ? cs.maskImage : (wk && wk !== "none" ? wk : "none");
    };
    const cards = ([...document.querySelectorAll(".tl-p")] as HTMLElement[]).filter(vis);
    return cards.map((c) => ({
      rel: c.dataset.rel || "",
      both: c.classList.contains("fadeL") && c.classList.contains("fadeR"),
      tight: c.hasAttribute("data-tight"),
      cardMask: maskOf(c) !== "none",
      contentMask: maskOf(c.querySelector(".tl-content") as HTMLElement | null) !== "none",
      frameMask: maskOf(c.querySelector(".tl-frame") as HTMLElement | null) !== "none",
      opacity: getComputedStyle(c.querySelector(".tl-cbody") as HTMLElement).opacity,
    }));
  });
  const both = got.filter((g) => g.both);
  console.log(`cards ${got.length} · cut at both ends ${both.length}`
    + ` · frames masked ${got.filter((g) => g.frameMask).length}`
    + ` · cards masked ${got.filter((g) => g.cardMask).length}`
    + ` · contents masked ${got.filter((g) => g.contentMask).length} (tight ${got.filter((g) => g.tight).length})`);
  expect(both.length, "no card is cut at both ends, so nothing was checked").toBeGreaterThan(2);
  expect(got.filter((g) => g.cardMask).map((g) => g.rel),
    "the CARD carries a mask, so it reaches the words it contains").toEqual([]);
  /* ⚠️ A CLIP MASK ON THE CONTENT IS THE TIGHT STATE'S OWN AND IS ALLOWED — it is a soft right
     edge on words that overflow, not a fade of the card. A card that is not tight must carry none. */
  expect(got.filter((g) => g.contentMask && !g.tight).map((g) => g.rel),
    "a card that is not clipped masks its words").toEqual([]);
  expect([...new Set(got.map((g) => g.opacity))], "the words are not at full opacity").toEqual(["1"]);
});
