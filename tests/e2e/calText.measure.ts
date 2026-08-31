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

test("the bar's text is two mono lines, and the fit pass drops them in order", async ({ page }) => {
  const table: string[] = [];
  for (const width of WIDTHS) {
    await openRoute(page, "/todo/calendar", { width, height: HEIGHT });
    await page.waitForFunction("document.querySelectorAll('.tl-rrow').length > 3", null, { timeout: 20000 });

    for (const r of [0, 1, 2]) {
      await setRangeTo(page, r);
      const read = await page.evaluate(TAG + `(() => {
        if (!vis(".tl-board")) return { fatal: "no board" };
        let both = 0, one = 0, bare = 0;
        const type = {};
        const overrun = [];
        for (const b of document.querySelectorAll(".tl-p")) {
          const br = b.getBoundingClientRect();
          if (br.width <= 0) continue;
          const txt = b.querySelector(".tl-txt");
          const t1 = b.querySelector(".tl-t1");
          const t2 = b.querySelector(".tl-t2");
          const shown = (e) => !!e && getComputedStyle(e).display !== "none"
            && e.getBoundingClientRect().width > 0;
          if (!txt || getComputedStyle(txt).display === "none" || !shown(t1)) { bare += 1; continue; }
          if (shown(t2)) both += 1; else one += 1;
          for (const [k, e] of [["t1", t1], ["t2", t2]]) {
            if (!shown(e)) continue;
            const cs = getComputedStyle(e);
            (type[k] = type[k] || {})[[cs.fontSize, cs.fontWeight, cs.letterSpacing,
              cs.textTransform, cs.fontFamily.split(",")[0]].join("|")] = 1;
            /* the text must not run past the bar it sits on */
            const er = e.getBoundingClientRect();
            if (er.right > br.right + 1) overrun.push(k + " by " + Math.round(er.right - br.right) + "px");
          }
        }
        const inset = (() => { const t = vis(".tl-txt"); return t ? getComputedStyle(t).left : null; })();
        return { both, one, bare, type, overrun, inset };
      })()`) as any;
      expect(read.fatal, `${width}px range ${r}: ${read.fatal}`).toBeUndefined();

      /* ⚠️ POPULATION. A board with no bars satisfies every claim below. */
      expect(read.both + read.one + read.bare, `${width}px range ${r}: no bars`).toBeGreaterThan(3);
      table.push(`${width} r${r}: both ${read.both} · line-one-only ${read.one} · bare ${read.bare}`);

      /* the pinned type, as DISTINCT painted sets — one bar drawn wrong disappears into a count */
      if (read.type.t1) {
        expect(Object.keys(read.type.t1), `${width}px r${r}: line one type`)
          .toEqual(['11px|500|0.11px|none|"JetBrains Mono"']);
      }
      if (read.type.t2) {
        expect(Object.keys(read.type.t2), `${width}px r${r}: line two type`)
          .toEqual(['8px|400|1.04px|uppercase|"JetBrains Mono"']);
      }
      expect(read.inset, `${width}px r${r}: the text does not start at the ref's inset`).toBe("14px");
      expect(read.overrun, `${width}px r${r}: text ran past its bar: ${JSON.stringify(read.overrun)}`).toEqual([]);
    }
  }
  for (const t of table) console.log(`  ${t}`);

  /**
   * ⚠️ THE BARE STATE IS REACHED BY MEASUREMENT, NOT BY A RANGE CONDITION.
   *
   * The brief pins this because the two are indistinguishable from a tally: a board that goes bare
   * at six months because the code says "six months" and one that goes bare because its bars are
   * narrow produce the same numbers. So ONE bar is followed by identity — `data-qid`, which
   * survives a re-render — while the VIEWPORT narrows around it. Nothing about the range changes;
   * only the room does.
   *
   * ⚠️ THE FIRST DRAFT SET THE BAR'S OWN WIDTH AND PROVED NOTHING. The fit pass runs on a
   * `ResizeObserver` over the BOARD, so an inline width on one bar never reaches it — and a
   * synthetic window `resize` event does not trip a ResizeObserver either. It reported "both" at
   * 34px and passed, because it was only logged. A walk that cannot change what it is watching is
   * the empty-set fault wearing a graph's clothes.
   */
  /* start from a known state: the widest board and the shortest range, where bars are longest */
  await page.setViewportSize({ width: 1920, height: HEIGHT });
  await setRangeTo(page, 0);
  await page.waitForTimeout(400);
  const qid = await page.evaluate(TAG + `(() => {
    /* ⚠️ THE NARROWEST BAR STILL SHOWING BOTH LINES, not the widest. The widest one keeps both
       lines all the way down to 768 — measured — so a walk over it observes nothing and says so
       loudly. The bar nearest the boundary is the only one whose transition a narrowing viewport
       can actually cross, and crossing it is the whole claim. */
    const shown = (e) => !!e && getComputedStyle(e).display !== "none" && e.getBoundingClientRect().width > 0;
    const b = [...document.querySelectorAll(".tl-p")]
      .filter((e) => e.getBoundingClientRect().width > 0 && shown(e.querySelector(".tl-t2")))
      .sort((x, y) => x.getBoundingClientRect().width - y.getBoundingClientRect().width)[0];
    return b ? b.dataset.qid : null;
  })()`) as string | null;
  expect(qid, "no wide bar carrying two lines to follow — nothing can be walked").not.toBeNull();

  const walk: [number, string][] = [];
  for (const w of [1920, 1440, 1180, 1024, 900, 768]) {
    await page.setViewportSize({ width: w, height: HEIGHT });
    await page.waitForTimeout(450);
    const st = await page.evaluate(`(() => {
      /* ⚠️ A BAR IS CUT INTO PIECES AND EVERY PIECE CARRIES THE SAME qid, so taking the first
         match returns whichever fragment comes first — which is how the first walk followed a 28px
         sliver and reported "bare" at 1920 about a bar showing both lines. The widest piece is the
         one a reader is looking at, and it is the same one at every width.
         (No backticks in here: this is inside an evaluate template and one would close it.) */
      const all = [...document.querySelectorAll('.tl-p')]
        .filter((e) => e.dataset.qid === ${JSON.stringify(qid)} && e.getBoundingClientRect().width > 0)
        .sort((x, y) => y.getBoundingClientRect().width - x.getBoundingClientRect().width);
      const b = all[0];
      if (!b) return "absent";
      const on = (e) => !!e && getComputedStyle(e).display !== "none" && e.getBoundingClientRect().width > 0;
      const txt = b.querySelector(".tl-txt"), t2 = b.querySelector(".tl-t2");
      return !on(txt) ? "bare" : on(t2) ? "both" : "one";
    })()`) as string;
    walk.push([w, st]);
  }
  console.log(`  narrowing the viewport around one bar: ${JSON.stringify(walk)}`);

  /* ⚠️ THE PRECEDENCE, READ OFF THE WALK: once a state is left it is never returned to, and the
     order can only be both → one → bare. A bar that regained line two as it narrowed, or that went
     bare while still showing line two, would break the stated order rather than merely look odd. */
  const RANK: Record<string, number> = { both: 0, one: 1, bare: 2, absent: 2 };
  for (let i = 1; i < walk.length; i++) {
    expect(RANK[walk[i][1]], `the fit went backwards as the board narrowed: ${JSON.stringify(walk)}`)
      .toBeGreaterThanOrEqual(RANK[walk[i - 1][1]]);
  }
  /* and it must actually MOVE, or the walk proved nothing about the precedence */
  expect(new Set(walk.map((w) => w[1])).size,
    `the bar held one state at every width — the walk exercised nothing: ${JSON.stringify(walk)}`)
    .toBeGreaterThan(1);
});

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
