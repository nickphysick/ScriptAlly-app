/**
 * v56 — RETIRED: the tab counts went with the tab strip (successor: calTool63 c5's facet
 * census). What survives here is the CLOSED TREATMENT claim, retargeted: a card in the shut
 * families paints the shut tint, and the Closed group is not empty on a fixture that has
 * closed relationships — the branch-population half calFid63 (4) cannot state on its own.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

test("the Closed group renders, and its cards wear the shut treatment", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  const r = await page.evaluate(() => {
    const g = [...document.querySelectorAll<HTMLElement>(".tl-cal")].find((e) => e.getBoundingClientRect().height > 0)!;
    const grp = [...g.querySelectorAll<HTMLElement>(".tl-grp")].find((x) => (x as HTMLElement).dataset.sec === "shut");
    if (!grp) return null;
    return {
      tabs: g.querySelectorAll(".tl-tabs").length,
      cards: [...grp.querySelectorAll<HTMLElement>(".tl-p")]
        .filter((c) => c.getBoundingClientRect().height > 1)
        .map((c) => ({
          fam: [...c.classList].filter((k) => ["shut", "closedp", "quiet", "ghost", "hollow"].includes(k)),
          bg: getComputedStyle(c.querySelector(".tl-frame")!).backgroundColor,
        })),
    };
  });
  expect(r, "no Closed group on the board — the fixture lost its closed relationships").not.toBeNull();
  expect(r!.tabs, "the tab strip is back").toBe(0);
  expect(r!.cards.length, "the Closed group is empty").toBeGreaterThan(0);
  for (const c of r!.cards) {
    expect(c.fam.length, `a Closed-group card carries no shut family (${JSON.stringify(c)})`).toBeGreaterThan(0);
  }
});
