/**
 * §2 — the ghost rung's own rhythm, on the running page.
 *
 * ⚠️ THE CLAIM IS A DISTANCE, so it is measured and compared to the page's other distances rather
 * than to a number. The fault was the rung fusing to the sentence above it, and the cause was two
 * derivations of "is a reminder scheduled" disagreeing — the row above asked the retired
 * `query.nudgeDate` while the rung asked the task store. A source lock would have found neither.
 *
 * ⚠️ AND IT HAS TO CREATE ITS OWN SUBJECT. No query on the account carries a reminder, so the probe
 * sets one through the card's own "Remind me later", measures, and removes it again.
 *
 *   npx playwright test --project=measure qcGhost
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

test("§2 — the ghost is an event, with the events' gap and its own marker", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  const rows = page.locator(".f12-row");
  await rows.first().click({ timeout: 8000 });
  await page.waitForTimeout(400);

  /* find a query offering "Remind me later" */
  let found = -1;
  const n = Math.min(await rows.count(), 10);
  for (let i = 0; i < n; i++) {
    if (i >= await rows.count()) break;
    await rows.nth(i).click({ timeout: 6000 });
    await page.waitForTimeout(350);
    if (await page.locator(".tl-offer-keep", { hasText: "Remind me later" }).count()) { found = i; break; }
  }
  expect(found, "no query on this account offers a reminder to set").toBeGreaterThan(-1);
  console.log(`  setting a reminder on query ${found}`);

  await page.locator(".tl-offer-keep", { hasText: "Remind me later" }).first().click();
  await page.waitForTimeout(1400);
  /* ⚠️ NO CONFIRM STEP TO CHASE. `Remind me later` calls `addUserTask` directly — a fortnight out,
     with a toast — so the rung is on the page by the time the write lands. A generic
     `button:has-text("Save")` here matched the NOTES COMPOSER's永 always-present Save and waited on a
     disabled button for the full timeout, which is the shape a loose locator always takes. */
  await page.locator(".f12-toast, [role=\"status\"]").first().waitFor({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1200);

  const g = await page.evaluate(() => {
    const evs = [...document.querySelectorAll<HTMLElement>(".tl-ev")];
    const box = (e: HTMLElement) => e.getBoundingClientRect();
    const ghost = evs.find((e) => e.classList.contains("tl-ev--ghost")) || null;
    /* the gap between two events = the top of one mark to the bottom of the previous event's content */
    const gaps = evs.slice(1).map((e, i) => {
      const prev = evs[i];
      const mark = e.querySelector(".tl-evmark, .tl-ghostmark");
      const body = prev.querySelector(".tl-rowbody") || prev;
      return {
        ghost: e.classList.contains("tl-ev--ghost"),
        gap: Math.round((mark ? box(mark as HTMLElement).top : box(e).top) - box(body as HTMLElement).bottom),
      };
    });
    return {
      events: evs.length,
      gaps,
      /* ⚠️ THE STRUCTURAL FIGURE BESIDE THE VISUAL ONE. Every event pays `--tl-gap` as its own
         `padding-bottom`; what the eye then reads also includes whatever slack the event's body
         leaves under its last child, which varies with content. Comparing only the visual distance
         makes a correctly-spaced rung look wrong beside a roomier neighbour. */
      pads: evs.map((e) => ({ ghost: e.classList.contains("tl-ev--ghost"), last: e.classList.contains("tl-ev--last"), pad: getComputedStyle(e).paddingBottom })),
      ghost: ghost ? {
        text: (ghost.textContent || "").replace(/\s+/g, " ").trim(),
        mark: !!ghost.querySelector(".tl-ghostmark"),
        markLeft: ghost.querySelector(".tl-ghostmark") ? Math.round(box(ghost.querySelector(".tl-evmark") as HTMLElement).left) : null,
        railLeft: evs[0].querySelector(".tl-evmark") ? Math.round(box(evs[0].querySelector(".tl-evmark") as HTMLElement).left) : null,
        last: ghost.classList.contains("tl-ev--last"),
        prevLast: ghost.previousElementSibling?.classList.contains("tl-ev--last") ?? null,
      } : null,
    };
  });
  console.log(`  ${g.events} events · gaps ${g.gaps.map((x) => `${x.gap}${x.ghost ? "*" : ""}`).join(" ")}`);
  console.log(`  ghost: ${JSON.stringify(g.ghost)}`);

  expect(g.ghost, "no ghost rung rendered after setting a reminder").not.toBeNull();

  /* ⚠️ ITS OWN MARKER, ON THE SAME RAIL — a trailing line inside the event above would have neither. */
  expect(g.ghost!.mark, "the ghost rung has no marker of its own").toBe(true);
  expect(g.ghost!.markLeft, "the ghost's marker is off the rail").toBe(g.ghost!.railLeft);

  /* ⚠️ THE ROW ABOVE IT IS NOT `--last`. That class zeroes the gap, and it is what fused them. */
  expect(g.ghost!.prevLast, "the event above the ghost is still marked last — the gap is zeroed").toBe(false);

  /* ⚠️ THE SAME GAP AS ANY TWO EVENTS, compared to the page's own spacing rather than to 24. */
  const ghostGap = g.gaps.find((x) => x.ghost)!.gap;
  const others = g.gaps.filter((x) => !x.ghost).map((x) => x.gap);
  console.log(`  ghost gap ${ghostGap} · other event gaps ${others.join(", ")}`);
  console.log(`  paid gaps: ${g.pads.map((p) => `${p.pad}${p.ghost ? " (ghost)" : ""}${p.last ? " [last]" : ""}`).join(" · ")}`);
  expect(others.length, "only one event on the timeline — nothing to compare the gap against").toBeGreaterThan(0);

  /* ⚠️ THE GAP EVERY EVENT PAYS IS ONE FIGURE, and the row above the ghost pays it like any other.
     That is the claim the section makes — the fault was that row paying ZERO, because it was marked
     `--last` off a derivation the ghost does not share. */
  const paying = g.pads.filter((p) => !p.last).map((p) => p.pad);
  expect([...new Set(paying)], `the events pay ${paying.join(", ")} — not one gap`).toHaveLength(1);
  expect(paying.length, "every event is marked last — nothing is paying a gap").toBeGreaterThan(0);
  expect(ghostGap, "the ghost is fused to the event above it").toBeGreaterThan(8);

  expect(g.ghost!.text, "the rung still reads as a fragment").toContain("Nudge reminder set");
  expect(g.ghost!.text, "the rung does not say when").toContain("Scheduled for");
});
