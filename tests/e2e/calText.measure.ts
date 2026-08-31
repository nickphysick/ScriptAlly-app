/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE BAR'S TWO LINES, AND HOW MANY OF THEM FIT (v37, Phase 6).
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const WIDTHS = [1280, 1440, 1920];
const HEIGHT = 900;
const TAG = `
  const vis = (sel) => [...document.querySelectorAll(sel)]
    .find((e) => e.getBoundingClientRect().height > 0) || null;
`;

const setRangeTo = async (page: import("@playwright/test").Page, i: number) => {
  await page.evaluate(`(() => {
    const all = [...document.querySelectorAll('input[type=range]')]
      .filter((e) => e.getBoundingClientRect().width > 0);
    if (all.length !== 1) throw new Error("expected 1 visible range control, found " + all.length);
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    set.call(all[0], String(${i}));
    all[0].dispatchEvent(new Event("input", { bubbles: true }));
  })()`);
  await page.waitForTimeout(700);
};

/**
 * ⚠️ THE TWO-LINE STACK IS RETIRED, AND ITS CLAIMS ARE NOT LOST (v39).
 *
 * This asserted that a bar carried TWO mono lines and that `barFit` dropped them in a stated
 * order. Both are gone with the object: a card carries ONE line — a Playfair headline, a
 * separator and a mono detail — and text that does not fit scrolls on hover rather than being
 * dropped. Retired rather than rebaselined, because its subject no longer exists; a lock kept
 * alive by loosening it until it passes is worse than no lock.
 *
 * Where each claim went:
 *   the pinned type          → `calCard.measure.ts`, against the card's own values
 *   text stays inside its box → `calLook.measure.ts`, the containment claim
 *   the drop order            → `calendarMarquee.test.ts`, which asserts the cycle instead
 *
 * The two cases below are v37's and are untouched: the hover lift, and ONE LIST.
 */


/**
 * ⚠️ THE HOVER LIFT KEEPS THE BAR WHERE IT IS (v37, Phase 7).
 *
 * `transform` is not additive. A bar is placed at its lane's centre by `translateY(-50%)`, so a
 * hover transform that states only `scale(1.004)` REPLACES that centring and drops the bar half
 * its own height — silently, and only while the pointer is on it, which is the one moment nobody
 * is taking a measurement.
 *
 * ⚠️ BOTH HALVES, BECAUSE EITHER ALONE PASSES ON A BAR THAT MOVED. "The centre is unchanged" is
 * satisfied by a hover rule that does nothing at all; "the shadow differs" is satisfied by a bar
 * that gained a shadow on its way down.
 */
test("hovering a bar lifts it without moving it", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: HEIGHT });
  await page.waitForFunction("document.querySelectorAll('.tl-rrow').length > 3", null, { timeout: 20000 });
  await page.waitForTimeout(600);

  const target = await page.evaluate(TAG + `(() => {
    if (!vis(".tl-board")) return null;
    const b = [...document.querySelectorAll(".tl-p")]
      .filter((e) => { const r = e.getBoundingClientRect();
        return r.width > 80 && r.top > 80 && r.bottom < window.innerHeight - 80; })
      .sort((x, y) => y.getBoundingClientRect().width - x.getBoundingClientRect().width)[0];
    if (!b) return null;
    b.setAttribute("data-hovertarget", "1");
    const r = b.getBoundingClientRect();
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2,
             centre: r.top + r.height / 2, h: r.height, shadow: getComputedStyle(b).boxShadow };
  })()`) as any;
  expect(target, "no bar on screen to hover — nothing was measured").not.toBeNull();

  await page.mouse.move(target.cx, target.cy);
  await page.waitForTimeout(350);

  const hovered = await page.evaluate(`(() => {
    const b = document.querySelector('[data-hovertarget="1"]');
    if (!b) return null;
    const r = b.getBoundingClientRect();
    const cs = getComputedStyle(b);
    return { centre: r.top + r.height / 2, h: r.height, shadow: cs.boxShadow, transform: cs.transform };
  })()`) as any;
  expect(hovered, "the hovered bar vanished").not.toBeNull();
  console.log(`  hover — centre ${target.centre.toFixed(1)} → ${hovered.centre.toFixed(1)}`
    + ` · height ${target.h.toFixed(1)} → ${hovered.h.toFixed(1)} · shadow ${hovered.shadow}`);

  /* ⚠️ THE HOVER MUST ACTUALLY HAVE TAKEN. "Nothing moved" is what a pointer that never landed on
     the bar looks like, and it would satisfy the centre claim perfectly. */
  expect(hovered.shadow, "the bar did not take its hover shadow — the pointer may not have landed")
    .not.toBe(target.shadow);
  expect(hovered.shadow).toMatch(/rgba\(58, 28, 20, 0\.16\)/);
  /* and it did not move */
  expect(Math.abs(hovered.centre - target.centre),
    `the bar's centre moved on hover: ${target.centre.toFixed(1)} → ${hovered.centre.toFixed(1)}`)
    .toBeLessThanOrEqual(1);
  /* the centring survives in the transform itself, so the next edit cannot drop it unnoticed */
  expect(hovered.transform, `the hover transform lost its centring: ${hovered.transform}`)
    .toMatch(/matrix\(1\.004/);
});

/* ══ ONE LIST (v37, Phase 3) ═══════════════════════════════════════════════════════════════ */

/**
 * ⚠️ THE DEFAULT IS THE FLAT LIST, AND GROUPED IS ONE CONTROL AWAY.
 *
 * Three claims, and the third is the one that makes the other two safe: the default carries no
 * heading and no card; the painted order is the key the rows themselves publish; and switching to
 * GROUPED and back returns the IDENTICAL row set by identity — so the mode is an arrangement of
 * one list rather than two derivations that will eventually disagree about what is on the board.
 */
test("the default is one flat list, ordered by what is pressing", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: HEIGHT });
  await page.waitForFunction("document.querySelectorAll('.tl-rrow').length > 3", null, { timeout: 20000 });
  await page.waitForTimeout(600);

  const flat = await page.evaluate(TAG + `(() => {
    if (!vis(".tl-board")) return { fatal: "no board" };
    const rows = [...document.querySelectorAll(".tl-rrow")].filter((r) => r.getBoundingClientRect().height > 0);
    return {
      headings: document.querySelectorAll(".tl-gt").length,
      cards: document.querySelectorAll(".tl-grp").length,
      keys: rows.map((r) => ({
        nm: (r.querySelector(".tl-nm2") || {}).textContent,
        at: (!r.dataset.pressing || r.dataset.pressing === 'none') ? null : Number(r.dataset.pressing),
        top: Math.round(r.getBoundingClientRect().top),
        /* a hairline between rows is what the flat list must not draw */
        border: getComputedStyle(r).borderTopColor,
      })),
      ids: rows.map((r) => r.getAttribute("data-rowkey")),
    };
  })()`) as any;
  expect(flat.fatal, flat.fatal).toBeUndefined();

  expect(flat.keys.length, "no rows — nothing was checked").toBeGreaterThan(6);
  expect(flat.headings, `the flat list drew ${flat.headings} group headings`).toBe(0);
  expect(flat.cards, `the flat list drew ${flat.cards} group cards`).toBe(0);

  /* ⚠️ NO HAIRLINE BETWEEN ROWS. Asserted as PAINT, not as the absence of a declaration: the
     border is still there at zero opacity so the row's box — and every lane's centre against the
     rail's ticks — is unchanged. */
  const ruled = flat.keys.filter((k: any) => !/rgba\(0, 0, 0, 0\)|transparent/.test(k.border));
  expect(ruled.map((k: any) => `${k.nm}: ${k.border}`), "a row draws a hairline").toEqual([]);

  /**
   * ⚠️ THE PAINTED ORDER AGAINST THE PAINTED KEY. Reading the order alone says the rows are in
   * SOME order; reading the key alone says the key exists. Only the two together say the board is
   * ordered by the thing it claims to be ordered by — and rows with no key sink rather than lead,
   * which is what `Infinity` encodes.
   */
  const withKey = flat.keys.filter((k: any) => k.at != null);
  expect(withKey.length, "no row published a pressing key — the order cannot be checked")
    .toBeGreaterThan(4);
  const painted = flat.keys.map((k: any) => k.at ?? Infinity);
  const sorted = [...painted].sort((a: number, b: number) => a - b);
  expect(painted, `the painted order is not the key order: ${JSON.stringify(
    flat.keys.map((k: any) => [k.nm, k.at]))}`).toEqual(sorted);

  /* ⚠️ AND TASKS ARE AMONG THEM, NOT IN A BLOCK. If every task sorted to one end the list would be
     two lists sharing a scrollbar, which is the thing this replaced. */
  const taskAt = flat.ids.map((id: string, i: number) => (id || "").startsWith("task-") ? i : -1)
    .filter((i: number) => i >= 0);
  expect(taskAt.length, "no task rows on the board — the interleaving is unproved").toBeGreaterThan(0);
  console.log(`  one list: ${flat.keys.length} rows, tasks at ${JSON.stringify(taskAt)} of ${flat.keys.length}`);

  /* ══ THE ROUND TRIP ═══════════════════════════════════════════════════════════════════════ */
  const before = flat.ids;
  const press = async (label: string) => {
    await page.evaluate(`(() => {
      const b = [...document.querySelectorAll(".tl-seg2 button")]
        .filter((e) => e.getBoundingClientRect().width > 0)
        .find((e) => (e.textContent || "").trim() === ${JSON.stringify(label)});
      if (!b) throw new Error("no control labelled " + ${JSON.stringify(label)});
      b.click();
    })()`);
    await page.waitForTimeout(450);
  };
  const idsNow = async () => page.evaluate(`(() => [...document.querySelectorAll(".tl-rrow")]
    .filter((r) => r.getBoundingClientRect().height > 0)
    .map((r) => r.getAttribute("data-rowkey")))()`) as Promise<string[]>;

  await press("GROUPED");
  const inGroups = await idsNow();
  const headingsNow = await page.evaluate(`document.querySelectorAll(".tl-gt").length`) as number;
  expect(headingsNow, "GROUPED drew no headings — the control did nothing").toBeGreaterThan(1);

  await press("ONE LIST");
  const back = await idsNow();

  /**
   * ⚠️ GROUPED IS A SUBSET, NOT AN EQUAL SET, AND THE REASON IS A DECISION RATHER THAN A BUG.
   *
   * Two groups — snoozed and closed — are collapsed by default, so their rows are not rendered
   * there. A set-equality claim was written first and went red naming `agent-seed-cal-passed20`;
   * that row is real, on the list, and inside a group nobody has opened. So what GROUPED must be
   * is a subset of the flat list with nothing invented, and the identity claim the brief asks for
   * is the ROUND TRIP below, which is exact.
   */
  const strays = inGroups.filter((id) => !before.includes(id));
  expect(strays, `GROUPED shows rows the flat list does not: ${strays.join(", ")}`).toEqual([]);
  expect(inGroups.length, "GROUPED rendered no rows at all").toBeGreaterThan(3);
  expect(back, "the round trip did not return the identical list, in order").toEqual(before);
});
