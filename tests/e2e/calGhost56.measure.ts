/**
 * v56/58 — RETIRED IN PART: the ghost RING stays dead (the claim that survives), but its v58
 * replacement — the stage CAP — was itself retired by the v61 band, so "caps > 3" was a lock
 * demanding a corpse. What renders past stages NOW is the ghost stage row (`.tl-jc`, v63 §F),
 * and terminal marks (`.tl-tmark`) still stand on closed ends.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

test("the ghost ring is gone, and the ghost STAGE ROWS render in its place", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  const r = await page.evaluate(() => {
    const g = [...document.querySelectorAll<HTMLElement>(".tl-cal")].find((e) => e.getBoundingClientRect().height > 0)!;
    const vis = (e: Element) => (e as HTMLElement).getBoundingClientRect().width > 0;
    return {
      rings: [...g.querySelectorAll(".tl-ghost")].filter(vis).length,
      caps: [...g.querySelectorAll(".tl-cap")].filter(vis).length,
      jcs: [...g.querySelectorAll(".tl-jc")].filter(vis).length,
      marks: [...g.querySelectorAll(".tl-tmark")].filter(vis).length,
    };
  });
  console.log(`rings ${r.rings} · caps ${r.caps} · ghost stage rows ${r.jcs} · terminal marks ${r.marks}`);
  expect(r.rings, "a ghost ring still renders").toBe(0);
  expect(r.caps, "the v58 cap is back — it retired with the v61 band").toBe(0);
  /* the living replacement: past stages as ghost rows */
  expect(r.jcs, "no ghost stage rows — the past has no rendering at all").toBeGreaterThan(0);
});
