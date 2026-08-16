/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ITEM 6 — the page and the dock hold different cards.
 *
 * ⚠️ REPRODUCED WITHOUT A WRITE. The split was found by reasoning about what happens after a
 * commit, and proving it that way would mean recording a real send against Nick's data. It does not
 * need one: the cause is the HELD CARD LEAVING `dockable`, and a search narrowing does that just as
 * a commit does. The page holds the card (its documented hold rule); the dock recomputes
 * `queue.find(activeKey) ?? queue[0]` and silently falls to the first remaining task.
 */
import { test } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";

test.setTimeout(300_000);

const paneIdentity = async (page: import("@playwright/test").Page) =>
  page.evaluate(() => {
    const vis = (e: Element) => e.getBoundingClientRect().height > 0;
    const g = (s: string) => [...document.querySelectorAll(s)].find(vis) as HTMLElement | undefined;
    const tiles = [...document.querySelectorAll(".tdk-tstat")].filter(vis)
      .map((t) => (t.textContent ?? "").replace(/\s+/g, " ").trim());
    return {
      band: (g(".tdk-name")?.textContent ?? g(".tdk-band")?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 60),
      tiles,
      timeline: [...document.querySelectorAll(".tdk-storyrow, .tdk-ev")].filter(vis)
        .map((r) => (r.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 46)),
    };
  });

test("item 6 — does the dock follow the page's held card?", async ({ page }) => {
  const errs: string[] = [];
  page.on("pageerror", (e) => errs.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 160)); });
  await openRoute(page, "/todo", { width: 1920, height: 1000 });
  await liftMotionSuppression(page);

  /* dock a card deep in the list, so `queue[0]` is demonstrably a different one */
  await page.locator(".tdg-row").nth(6).click();
  await page.waitForTimeout(350);
  const before = await paneIdentity(page);
  console.log("HELD:", JSON.stringify(before, null, 2));

  /* now narrow the rail so the held card is no longer in `dockable` — the same condition a
     commit creates, reached without writing anything */
  await page.locator("input[placeholder*='Search your list']").first().fill("Ana Duarte");
  await page.waitForTimeout(450);

  const after = await paneIdentity(page);
  console.log("AFTER NARROWING:", JSON.stringify(after, null, 2));
  /* ⚠️ AND THE CONTROL: a search matching NOTHING. `ToDoPage` has an explicit branch for that
     (`dockable.length === 0` → HOLD), so if the pane holds here and swaps above, the swap is that
     effect's deliberate narrowing branch rather than either resolver falling through. */
  await page.locator("input[placeholder*='Search your list']").first().fill("zzzz-no-such-agent");
  await page.waitForTimeout(450);
  const empty = await paneIdentity(page);
  console.log("NARROWED TO NOTHING:", JSON.stringify(await page.evaluate(() => {
    const vis = (e: Element) => e.getBoundingClientRect().height > 0;
    return {
      card: !!document.querySelector(".tdk"),
      cardVisible: !![...document.querySelectorAll(".tdk")].find(vis),
      pane: ([...document.querySelectorAll(".tdw-pane, .tdk-none")].find(vis)?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 70),
    };
  })));
  if (errs.length) console.log("PAGE ERRORS:", errs.slice(0, 3));

  console.log(before.band === after.band
    ? "PANE HELD ITS CARD — identity is rooted"
    : `⚠️ SPLIT — the pane swapped from "${before.band}" to "${after.band}" with no user action on the pane`);
});
