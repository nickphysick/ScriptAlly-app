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

  /**
   * ⚠️ A QUERY THAT ALREADY HAS A RUNG IS THE BETTER SUBJECT, and this run takes one where it can.
   * The probe used to set its own reminder every time, which worked exactly until enough of them
   * existed that no query was offering to set another — an offer §3 now suppresses on precisely the
   * queries this was looking at. Use what is there; create one only when there is nothing.
   */
  let found = -1;
  let already = false;
  const n = Math.min(await rows.count(), 10);
  for (let i = 0; i < n; i++) {
    if (i >= await rows.count()) break;
    await rows.nth(i).click({ timeout: 6000 });
    await page.waitForTimeout(350);
    if (await page.locator(".tl-ev--ghost").count()) { found = i; already = true; break; }
    if (found < 0 && await page.locator(".tl-offer-keep", { hasText: "Remind me later" }).count()) found = i;
  }
  expect(found, "no query has a reminder and none offers a way to set one").toBeGreaterThan(-1);

  if (!already) {
    console.log(`  setting a reminder on query ${found}`);
    await rows.nth(found).click({ timeout: 6000 });
    await page.waitForTimeout(350);
    await page.locator(".tl-offer-keep", { hasText: "Remind me later" }).first().click();
    await page.waitForTimeout(1400);
  } else {
    console.log(`  query ${found} already carries a reminder`);
  }
  /* ⚠️ NO CONFIRM STEP TO CHASE. `Remind me later` calls `addUserTask` directly — a fortnight out,
     with a toast — so the rung is on the page by the time the write lands. A generic
     `button:has-text("Save")` here matched the NOTES COMPOSER's永 always-present Save and waited on a
     disabled button for the full timeout, which is the shape a loose locator always takes. */
  if (!already) {
    await page.locator(".f12-toast, [role=\"status\"]").first().waitFor({ timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1200);
  }

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
  /* ⚠️ THE PREFIX IS GONE WITH THE SENTENCE (§3 of the event-grammar pack). "Scheduled for" was a
     word explaining a slot that needs no explaining; the panel states what is set and when. */
  expect(g.ghost!.text, "the retired prefix is back").not.toContain("Scheduled for");
});

/**
 * §3 (event-grammar pack) — the reminder is a dashed pending PANEL, and the only one.
 *
 * ⚠️ THE "ONLY ONE" HALF IS THE HALF WORTH MEASURING. That a dashed panel renders is visible in a
 * screenshot; that nothing ELSE on the timeline has taken the shape is not, and it is what stops
 * "not yet" becoming a decoration. So this counts dashed borders across the whole card.
 */
test("§3 — the ghost is a dashed panel, and the only dashed object", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  const rows = page.locator(".f12-row");
  await rows.first().click({ timeout: 8000 });
  await page.waitForTimeout(400);

  let found = -1;
  const n = Math.min(await rows.count(), 10);
  for (let i = 0; i < n; i++) {
    if (i >= await rows.count()) break;
    await rows.nth(i).click({ timeout: 6000 });
    await page.waitForTimeout(350);
    if (await page.locator(".tl-ghostpanel").count()) { found = i; break; }
  }
  expect(found, "no query on this account carries a scheduled reminder").toBeGreaterThan(-1);

  const g = await page.evaluate(() => {
    const p = document.querySelector<HTMLElement>(".tl-ghostpanel")!;
    const cs = getComputedStyle(p);
    /* every dashed border inside the timeline card, whatever draws it */
    const card = p.closest(".qc-trackscroll") || p.closest(".tl-ev")!.parentElement!;
    /* ⚠️ AN OUTLINE IS A BOX ON ALL FOUR SIDES, and that distinction is the whole of this probe.
       A first pass counted any dashed edge and flagged two things that are not outlines: the
       editable qualifier's dashed UNDERLINE — a rule under a word, the app's "you can change this"
       affordance — and the ghost's own dashed ring, which belongs to the object being asserted.
       Neither is a pending panel, and banning them would be banning a device the card needs. */
    const dashed = [...card.querySelectorAll<HTMLElement>("*")]
      .filter((e) => {
        const c = getComputedStyle(e);
        return ["borderTopStyle", "borderRightStyle", "borderBottomStyle", "borderLeftStyle"]
          .every((k) => (c as unknown as Record<string, string>)[k] === "dashed");
      })
      .filter((e) => !e.closest(".tl-ev--ghost"))
      .map((e) => e.className || e.tagName.toLowerCase());
    return {
      tag: p.tagName,
      text: (p.textContent || "").replace(/\s+/g, " ").trim(),
      border: `${cs.borderTopStyle} ${cs.borderTopWidth}`,
      fill: cs.backgroundColor,
      shadow: cs.boxShadow,
      who: (p.querySelector(".tl-ghostwho")?.textContent || "").trim(),
      when: (p.querySelector(".tl-ghostwhen")?.textContent || "").trim(),
      whenRight: (() => {
        const w = p.querySelector<HTMLElement>(".tl-ghostwhen");
        return w ? Math.round(p.getBoundingClientRect().right - w.getBoundingClientRect().right) : null;
      })(),
      mark: !!document.querySelector(".tl-ghostmark"),
      dashed,
    };
  });
  console.log(`  panel <${g.tag}> "${g.text}" · border ${g.border} · fill ${g.fill} · shadow ${g.shadow}`);
  console.log(`  who "${g.who}" · when "${g.when}" (${g.whenRight}px from the right edge) · dashed objects: ${g.dashed.join(", ")}`);

  /* ⚠️ THE PANEL IS THE LINK, which is what removed the link from the middle of the sentence. */
  expect(g.tag, "the panel is not the link target").toBe("BUTTON");
  expect(g.border, "the panel is not a dashed outline").toMatch(/^dashed 1px$/);
  expect(g.fill, "the panel took a fill — solid is what happened").toBe("rgba(0, 0, 0, 0)");
  expect(g.shadow, "the panel took a shadow").toBe("none");
  expect(g.who, "the panel does not say what is set").toBe("Nudge reminder set");
  expect(g.when, "the panel does not say when").toMatch(/^(MON|TUE|WED|THU|FRI|SAT|SUN)/i);
  expect(g.when, "the date carries a prefix word").not.toMatch(/SCHEDULED|DUE|ON /i);
  expect(g.whenRight, "the date is not against the panel's right edge").toBeLessThan(16);
  expect(g.mark, "the panel lost its dashed marker on the rail").toBe(true);

  /* ⚠️ AND NOTHING ELSE IS DASHED. */
  expect(g.dashed, `something else on the timeline is a dashed outline: ${g.dashed.join(", ")}`).toEqual([]);
});
