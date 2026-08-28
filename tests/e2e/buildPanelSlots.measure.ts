/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AN EMPTY SLOT SAYS HOW IT IS FILLED, AND THE PANEL SAYS IT ONCE.
 *
 * ⚠️ A DASHED RECTANGLE IS NOT AN AFFORDANCE. The slot named the part that goes in it and offered
 * nothing — the click target was discoverable only by hovering it, and the drop target not at all.
 *
 * ⚠️ AND THE HEAD MUST NOT REPEAT IT. Its `Drag or click a part in` was the ref's, carried because
 * the ref's slots said nothing; with three slots each stating it, the head was the same instruction
 * a fourth time three inches above three copies of itself.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
test("an empty slot says how it is filled, and says it once", async ({ page }) => {
  await openRoute(page, "/manuscripts/packages?tab=builder", { width: 1600, height: 1000 });
  await page.locator(".bldp").waitFor({ state: "visible", timeout: 25000 });
  await page.waitForTimeout(400);
  const out = await page.evaluate(() => {
    const p = document.querySelector(".bldp") as HTMLElement;
    return {
      slots: [...p.querySelectorAll(".bldp-slot")].map((s) => ({
        label: (s.querySelector(".bldp-phk")?.textContent ?? "").trim(),
        cue: (s.querySelector(".bldp-phc")?.textContent ?? "").trim(),
        /* quieter than the label it sits under — a fact, then an instruction */
        cueSize: parseFloat(getComputedStyle(s.querySelector(".bldp-phc")!).fontSize),
      })),
      /* ⚠️ THE HEAD NO LONGER REPEATS IT. Four copies of one instruction is what the last two passes
         have been removing from the card foot; the panel is not allowed to reintroduce it. */
      headText: (p.querySelector(".bldp-head")?.textContent ?? "").trim(),
    };
  });
  console.log("SLOT " + JSON.stringify(out));
  expect(out.slots.length).toBe(3);
  for (const s of out.slots) {
    expect(s.label, "a slot with no label").not.toBe("");
    expect(s.cue).toBe("Drag a card here, or click one");
    expect(s.cueSize).toBeGreaterThan(0);
  }
  /* three labels, one cue — the slots differ by what goes in them, not by how */
  expect(new Set(out.slots.map((s) => s.label)).size).toBe(3);
  expect(new Set(out.slots.map((s) => s.cue)).size).toBe(1);
  expect(out.headText.toLowerCase(), "the head states the instruction a fourth time").not.toMatch(/drag|click/);
});
