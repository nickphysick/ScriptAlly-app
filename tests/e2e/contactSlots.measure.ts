/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE DASHED ADD SLOT, on a rendered page.
 *
 * ⚠️ "IDENTICAL IN SHAPE TO THE MATERIAL SLOT" IS A CLAIM ABOUT TWO BOXES, and the unit lock can
 * only compare two declarations. Two rules can state the same width and still paint differently —
 * a padding, a border-box, an inherited font — and this repo has measured that gap more than once.
 * The two boxes are compared here.
 */
import { expect, test } from "@playwright/test";
import { assertLocalBundleIsDev } from "./bundleGuard";

const KILL_MOTION = `*, *::before, *::after { transition: none !important; animation: none !important; }`;

async function openList(page: import("@playwright/test").Page, width = 1600) {
  await assertLocalBundleIsDev();
  await page.setViewportSize({ width, height: 900 });
  await page.goto("/#/contact-lab");
  await page.locator('[data-lab-view="cast"]').click();
  await page.addStyleTag({ content: KILL_MOTION });
  await expect(page.locator('[data-agent-card="fx-long"]')).toBeVisible({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole("button", { name: "List", exact: true }).click();
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

test.describe("the slot", () => {
  test("is the material slot's box, dashed, and one per empty cell", async ({ page }) => {
    await openList(page);

    const r = await page.evaluate(() => {
      const box = (el: Element | null) => {
        if (!el) return null;
        const b = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return { w: +b.width.toFixed(1), h: +b.height.toFixed(1), r: cs.borderTopLeftRadius, style: cs.borderTopStyle, colour: cs.borderTopColor };
      };
      const slots = [...document.querySelectorAll(".aglist [data-add-slot]")] as HTMLElement[];
      return {
        slots: slots.length,
        fields: [...new Set(slots.map((s) => s.getAttribute("data-add-slot")))].sort(),
        slot: box(slots[0]),
        mslot: box(document.querySelector(".aglist .agl-mslot")),
        tags: [...new Set(slots.map((s) => s.tagName))],
        named: slots.every((s) => (s.getAttribute("aria-label") ?? "").startsWith("Add ")),
        /* the sentences must be gone from the table entirely */
        italics: document.querySelectorAll(".aglist .agl-lrow .agl-pnone").length,
        prose: (document.querySelector(".aglist .agl-list") as HTMLElement)?.innerText.includes("Not recorded"),
      };
    });
    // eslint-disable-next-line no-console
    console.log(`[slot] n=${r.slots} fields=${r.fields.join(",")} box=${r.slot?.w}x${r.slot?.h} r=${r.slot?.r} ${r.slot?.style} · mslot=${r.mslot?.w}x${r.mslot?.h} r=${r.mslot?.r} · tags=${r.tags.join("/")} · italics=${r.italics}`);

    expect(r.slots, "no slots rendered — every claim below would be vacuous").toBeGreaterThan(3);
    expect(r.fields, "a field is missing a slot").toEqual(["email", "genres", "location", "website"]);
    expect(r.tags, "a slot is not a button").toEqual(["BUTTON"]);
    expect(r.named, "a slot has no 'Add …' accessible name").toBe(true);

    /* ⚠️ THE TWO BOXES, COMPARED — not two declarations that happen to read the same */
    expect(r.slot!.w, "the slot's width differs from the material slot's").toBe(r.mslot!.w);
    expect(r.slot!.h, "the slot's height differs from the material slot's").toBe(r.mslot!.h);
    expect(r.slot!.r, "the slot's radius differs from the material slot's").toBe(r.mslot!.r);
    /* ⚠️ THE PAIR'S SIZE IS THE BUILD'S, NOT THE MOCKUP'S. It went to 26 for one commit because
       the quick-add ref drew it there; the ref had drifted from the code, and the code is
       authoritative for a design value. The comparison above is the real claim — this only pins
       which of the two they agree ON, so a silent drift in BOTH would still be caught. */
    expect(r.slot!.w, "the pair moved off the build's 28").toBe(28);
    expect(r.slot!.style, "the slot is not dashed — a solid rim reads as a thing they asked for").toBe("dashed");

    /* the italic sentences are gone from the table */
    expect(r.italics, "an italic empty sentence survives in a list cell").toBe(0);
    expect(r.prose, "the table still says 'Not recorded'").toBe(false);
  });

  /* ⚠️ FOUR STATES, AND THE ROW'S HOVER IS THE ONE THAT MATTERS MOST — passing over a row shows
     what is missing without having to hunt for it. Measured as three distinct border colours. */
  test("resting, row-hover and slot-hover are three different treatments", async ({ page }) => {
    await openList(page);
    /* ⚠️ THE ROW THAT ACTUALLY HAS THE SLOT. Reading the first slot in the DOM while hovering the
       first ROW measures two different rows — the top row's cells are all populated, so it has no
       slot at all, and the reading came back as resting whatever the hover did. */
    const row = page.locator(".aglist .agl-lrow").filter({ has: page.locator("[data-add-slot]") }).first();
    const slot = row.locator("[data-add-slot]").first();
    const read = () => page.evaluate(() => {
      const r = [...document.querySelectorAll(".aglist .agl-lrow")].find((x) => x.querySelector("[data-add-slot]"))!;
      const cs = getComputedStyle(r.querySelector("[data-add-slot]") as HTMLElement);
      return { colour: cs.borderTopColor, style: cs.borderTopStyle, bg: cs.backgroundColor };
    });

    await page.mouse.move(5, 5);
    const resting = await read();
    /* hover the ROW, away from the slot itself */
    await row.locator(".agl-lnmtx").hover();
    const rowHover = await read();
    await slot.hover();
    const slotHover = await read();
    // eslint-disable-next-line no-console
    console.log(`[states] rest=${resting.colour}/${resting.style} · row=${rowHover.colour} · slot=${slotHover.colour}/${slotHover.style} bg=${slotHover.bg}`);

    expect(rowHover.colour, "the row's hover does not lift its slots — a reader has to hunt for the gaps").not.toBe(resting.colour);
    expect(slotHover.colour, "the slot's own hover is indistinguishable from the row's").not.toBe(rowHover.colour);
    expect(slotHover.style, "the slot's hover does not go solid").toBe("solid");
    /* ⚠️ AND THE SLOT'S OWN HOVER MUST BEAT THE ROW'S. Hovering a slot also hovers its row; if the
       row's rule wins, the pointer lands on a slot and it takes the muted rim instead of the ink. */
    expect(slotHover.bg, "the slot's hover did not fill white — the row's rule is winning").toBe("rgb(255, 255, 255)");
  });

  /* ⚠️ INERT WHILE THE DRAWER EDITS — two editors on one record is two writers, and the drawer
     already owns the dirty-confirmation logic. Still THERE, though: the gap is a fact. */
  test("stands down while the drawer is editing, without disappearing", async ({ page }) => {
    await openList(page);
    const before = await page.locator(".aglist [data-add-slot]").count();
    await page.locator(".aglist .agl-lrow").first().click();
    await expect(page.locator(".slo")).toBeVisible({ timeout: 4_000 });
    await page.locator(".slo").getByRole("button", { name: /^Edit$/ }).click();
    await expect(page.locator(".slo #agl-city")).toBeVisible({ timeout: 4_000 });

    const r = await page.evaluate(() => {
      const slots = [...document.querySelectorAll(".aglist [data-add-slot]")] as HTMLButtonElement[];
      return { n: slots.length, allDisabled: slots.every((s) => s.disabled) };
    });
    // eslint-disable-next-line no-console
    console.log(`[inert] ${r.n} slots present, all disabled=${r.allDisabled} (was ${before})`);
    expect(r.n, "the slots vanished — the gap is still a fact about the record").toBe(before);
    expect(r.allDisabled, "a slot is live while the drawer is editing — that is two writers on one record").toBe(true);
  });
});
