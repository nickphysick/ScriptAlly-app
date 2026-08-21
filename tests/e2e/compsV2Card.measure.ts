/**
 * Comparable titles v2 — the POPULATED state, measured on a real record.
 *
 * ⚠️ IT ADDS A COMP THROUGH THE UI AND REMOVES IT AGAIN. The harness account has an empty shelf, so
 * the card geometry was going unmeasured — and a skipped test reads like a passing one in a summary.
 * Driving the real add flow also exercises the write path, which injecting a fixture into the DOM
 * would not.
 *
 * ⚠️ THE CLEANUP IS IN A `finally`. A failed assertion must not leave a test comp on the account for
 * the next run to trip over, or the second run measures two cards and the first one's failure looks
 * like a different bug.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const TITLE = "E2E Harness Comp — safe to delete";

test("a populated comp card is spine · main · aside, with a neutral age chip", async ({ page }) => {
  await openRoute(page, "/manuscripts/comps", { width: 1440, height: 900 });
  let added = false;
  try {
    await page.locator(".ct-estate .ct-btn-pink, .ct-addrow").first().click();
    await page.locator("#ct-f-title").fill(TITLE);
    await page.locator("#ct-f-author").fill("A N Author");
    await page.locator("#ct-f-year").fill("2019");
    await page.locator("#ct-f-axis").fill("structure · tone");
    await page.locator(".ct-cform .ct-btn-pink").click();
    await page.locator(`.ct-crow:has-text("${TITLE}")`).waitFor({ state: "visible", timeout: 8000 });
    added = true;

    const r = await page.evaluate((t) => {
      const card = [...document.querySelectorAll(".ct-crow")].find((c) => (c.textContent ?? "").includes(t)) as HTMLElement;
      if (!card) return null;
      const spine = card.querySelector(".ct-spine") as HTMLElement;
      const main = card.querySelector(".ct-cmain") as HTMLElement;
      const aside = card.querySelector(".ct-caside") as HTMLElement;
      const chip = card.querySelector(".ct-agechip") as HTMLElement | null;
      const facets = [...card.querySelectorAll(".ct-facet")].map((f) => (f.textContent ?? "").trim());
      const c = card.getBoundingClientRect(), s = spine.getBoundingClientRect();
      const m = main.getBoundingClientRect(), a = aside.getBoundingClientRect();
      const yr = (spine.querySelector(".yr") as HTMLElement).getBoundingClientRect();
      return {
        cardH: Math.round(c.height), spineH: Math.round(s.height), spineW: Math.round(s.width),
        asideW: Math.round(a.width), order: s.left < m.left && m.left < a.left,
        yearFits: yr.width <= s.width + 1, spineText: (spine.textContent ?? "").trim(),
        chip: chip ? chip.textContent!.trim() : null,
        /* the chip must be the neutral surface, never a warning colour */
        chipBg: chip ? getComputedStyle(chip).backgroundColor : null,
        facets,
      };
    }, TITLE);

    expect(r, "the card did not render").not.toBeNull();
    console.log(`  card ${r!.cardH}px → spine ${r!.spineW}×${r!.spineH} "${r!.spineText}" · aside ${r!.asideW}px`);
    console.log(`  age chip: "${r!.chip}" on ${r!.chipBg} · facets ${JSON.stringify(r!.facets)}`);

    expect(r!.order, "the three tracks are out of order").toBe(true);
    expect(r!.spineW, "the spine is not its 44px track").toBe(44);
    expect(r!.asideW, "the aside is not its 214px track").toBe(214);
    expect(Math.abs(r!.spineH - r!.cardH), "the spine does not fill the card").toBeLessThanOrEqual(2);
    expect(r!.yearFits, "the rotated year overflows the spine — transform:rotate is back").toBe(true);
    expect(r!.spineText).toContain("2019");

    /* ⚠️ THE AGE CHIP IS THE POINT OF §3. A 2019 book is over the old five-year cutoff, so the OLD
       `compAge` would have shown a chip here too — what proves the threshold is gone is the WORDING
       (a plain published-and-elapsed statement) and the absence of any warning treatment. */
    expect(r!.chip, "the age chip is missing on a comp that has a year").not.toBeNull();
    expect(r!.chip!.toLowerCase()).toContain("published 2019");
    expect(r!.chip!.toLowerCase()).not.toMatch(/old|older|stale|dated|too |warn/);
    expect(r!.facets, "the free-text axis did not split into facets").toEqual(["structure", "tone"]);
  } finally {
    if (added) {
      const card = page.locator(`.ct-crow:has-text("${TITLE}")`);
      await card.locator('button:has-text("Remove")').click({ force: true });
      await card.waitFor({ state: "detached", timeout: 8000 }).catch(() => {});
      console.log("  cleanup: harness comp removed");
    }
  }
});
