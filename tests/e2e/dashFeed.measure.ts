/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE ACTIVITY FEED AS A CONVERSATION, on a rendered page (dashboard redesign, Phase 6).
 *
 * ⚠️ "ALIGNMENT CARRIES DIRECTION" IS A CLAIM ABOUT WHERE BOXES SIT, and no stylesheet assertion
 * can make it: `flex-direction: row-reverse` is a declaration, and whether the two sides actually
 * land on opposite edges of the column is a fact about the rendered page. The same goes for the
 * fills — the source lock proves `STATE_TOKEN` was READ, this proves a colour was PAINTED.
 */
import { expect, test } from "@playwright/test";
import { openRoute } from "./measure";

async function openDash(page: import("@playwright/test").Page, width = 1600) {
  await openRoute(page, "/dashboard", { width, height: 1000 });
  await expect(page.locator(".os-actv").first()).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(1200);
}

const readBubbles = () => {
  const col = document.querySelector(".os-actv .os-abody") as HTMLElement | null;
  if (!col) return null;
  const cr = col.getBoundingClientRect();
  return {
    left: +cr.left.toFixed(1), right: +cr.right.toFixed(1),
    rows: [...col.querySelectorAll(".os-bub")].map((e) => {
      const b = e.getBoundingClientRect();
      const inner = e.querySelector(".os-bubin") as HTMLElement | null;
      const ir = inner?.getBoundingClientRect();
      const kr = (e.querySelector(".os-knot") as HTMLElement | null)?.getBoundingClientRect();
      return {
        side: e.classList.contains("out") ? "out" : "in",
        desk: e.classList.contains("desk"),
        run: e.classList.contains("run"),
        knots: e.querySelectorAll(".os-knot svg, .os-knot").length,
        fill: inner ? getComputedStyle(inner).backgroundColor : "",
        l: ir ? +(ir.left - cr.left).toFixed(1) : -1,
        r: ir ? +(cr.right - ir.right).toFixed(1) : -1,
        /* the knot's side of the bubble — the claim that holds at ANY bubble width */
        knotLeftOfBody: kr && ir ? kr.left < ir.left : null,
        label: (e.querySelector(".os-bublab")?.textContent ?? "").trim(),
        meta: (e.querySelector(".os-bubmeta")?.textContent ?? "").trim(),
      };
    }),
  };
};

test.describe("P6 · the feed", () => {
  test("P6.1 · the two sides land on opposite edges, and housekeeping wears no knot", async ({ page }) => {
    await openDash(page);
    const r = await page.evaluate(readBubbles);
    expect(r, "the feed's scroller must be on screen").not.toBeNull();
    if (r!.rows.length === 0) {
      // eslint-disable-next-line no-console
      console.log("[P6.1] NO BUBBLES — the harness account's feed is empty; this case measured nothing");
      test.skip(true, "the 30-day feed is empty on this account — seed it before trusting P6.1");
      return;
    }
    const ins = r!.rows.filter((x) => x.side === "in");
    const outs = r!.rows.filter((x) => x.side === "out");
    const desks = r!.rows.filter((x) => x.desk);
    // eslint-disable-next-line no-console
    console.log(`[P6.1] ${r!.rows.length} bubbles · in=${ins.length} out=${outs.length} desk=${desks.length} · knots=${r!.rows.filter((x) => x.knotLeftOfBody !== null).length} · fills=${[...new Set(r!.rows.map((x) => x.fill))].join(" ")}`);

    /* ⚠️ THE POPULATION PER SIDE, or a feed that happens to be all one direction reports a clean
       sweep about a claim it never tested. */
    expect(ins.length + outs.length, "no bubbles were classified at all").toBeGreaterThan(0);

    /**
     * ⚠️ THE CLAIM IS THE KNOT'S SIDE, NOT THE BUBBLE'S INSET — and the first version of this case
     * had it wrong in a way only the page could show. `.os-bubin` is capped at 84%, so a LONG
     * message hits the cap and leaves almost the same slack on both sides: measured 50 left against
     * 46.3 right, and `l < r` failed on a bubble that was aligned perfectly correctly. The inset
     * asymmetry is a property of SHORT bubbles; the knot hanging off the outer edge is the property
     * of all of them, and it is what "alignment carries direction" actually means.
     */
    const withKnots = r!.rows.filter((x) => x.knotLeftOfBody !== null);
    for (const b of withKnots.filter((x) => x.side === "in")) {
      expect(b.knotLeftOfBody, "an agent bubble's knot is not on its left").toBe(true);
    }
    for (const b of withKnots.filter((x) => x.side === "out")) {
      expect(b.knotLeftOfBody, "a writer bubble's knot is not on its right").toBe(false);
    }
    /* ⚠️ AND THE POPULATION, or a feed of housekeeping alone would pass this having measured none. */
    expect(withKnots.length, "no bubble carried a knot — the side claim went untested")
      .toBeGreaterThan(0);

    /**
     * ⚠️ AND EVERY BUBBLE OF A SIDE STARTS AT THE SAME EDGE — which is what alignment MEANS, and
     * needs no magic number. The first two versions of this both tried to compare a bubble's own
     * left inset against its right, and both were wrong for the same reason: `.os-bubin` is capped
     * at 84%, so a long message leaves nearly equal slack on both sides (measured 50 against 46.3)
     * while being aligned perfectly correctly. A tolerance would have papered over it; the honest
     * claim is that the side's bubbles share an edge.
     */
    /**
     * ⚠️ AND THE GROUPING IS BY WHETHER THE BUBBLE HAS A KNOT, WHICH THE MEASUREMENT TAUGHT ME.
     * The first version asserted one edge per SIDE and found two on the writer's: 30 and 50. Both
     * are correct — the knot occupies the outer edge, so a bubble carrying one starts ~20px further
     * in than a housekeeping or neutral bubble that does not. Reserving the knot's width on a
     * bubble that will never have one would leave a permanent empty gutter down the desk events,
     * which is worse than two edges. So the property is: every bubble of a side AND a knot-state
     * shares an edge — and the two edges differ by the knot, which is the design saying so.
     */
    const edge = (rows: typeof ins, pick: (x: (typeof ins)[number]) => number) =>
      [...new Set(rows.map((x) => Math.round(pick(x))))];
    for (const [side, rows, pick] of [
      ["agent", ins, (x: (typeof ins)[number]) => x.l],
      ["writer", outs, (x: (typeof ins)[number]) => x.r],
    ] as const) {
      for (const knotted of [true, false]) {
        const grp = rows.filter((x) => (x.knotLeftOfBody !== null) === knotted);
        if (grp.length < 2) continue;
        expect(edge(grp, pick), `${side} bubbles ${knotted ? "with" : "without"} a knot do not share an edge`)
          .toHaveLength(1);
      }
    }

    /* ⚠️ AND THE HOUSEKEEPING RULE, WHICH IS THE ADDENDUM'S OWN — no state, so no dot. */
    for (const b of desks) expect(b.knots, "a housekeeping bubble carries a StatusDot").toBe(0);
  });

  test("P6.2 · the tab counts sum to All and match the filtered sets", async ({ page }) => {
    await openDash(page);
    const tabs = page.locator(".os-actv .os-ftab");
    const n = await tabs.count();
    if (n === 0) { test.skip(true, "the feed is empty on this account"); return; }
    expect(n, "four tabs: All · Agents · You · Desk").toBe(4);

    const read = async () => page.evaluate(() => ({
      counts: [...document.querySelectorAll(".os-actv .os-ftab")].map((t) =>
        Number((t.querySelector(".os-ftabn")?.textContent ?? "0").trim())),
      shown: document.querySelectorAll(".os-actv .os-abody .os-bub").length,
      active: [...document.querySelectorAll(".os-actv .os-ftab")].findIndex((t) => t.classList.contains("on")),
    }));

    const rest = await read();
    const seen = [`All ${rest.counts[0]} = ${rest.counts.slice(1).join("+")} · showing ${rest.shown}`];
    expect(rest.counts[0], "All must equal the three parts summed")
      .toBe(rest.counts[1] + rest.counts[2] + rest.counts[3]);
    expect(rest.shown, "All must show every bubble").toBe(rest.counts[0]);

    let exercised = 0;
    for (let i = 1; i < 4; i++) {
      if (rest.counts[i] === 0) { seen.push(`tab ${i}: empty, skipped`); continue; }
      await tabs.nth(i).click();
      await page.waitForTimeout(150);
      const on = await read();
      seen.push(`tab ${i}: count ${on.counts[i]} · showing ${on.shown}`);
      expect(on.shown, `tab ${i} shows a different number from its count`).toBe(on.counts[i]);
      exercised++;
    }
    // eslint-disable-next-line no-console
    console.log(`[P6.2] ${seen.join("\n        ")}`);
    expect(exercised, "fewer than two tabs were exercised — the feed is too uniform to prove this")
      .toBeGreaterThan(1);
  });

  /* ⚠️ A TIGHT RUN DROPS THE FURNITURE, NEVER THE BUBBLE — measured as "the bubble is still there
     and its label and meta are not", which is the only form of the claim that can tell the two
     apart. */
  test("P6.3 · a tight run keeps its bubbles and drops its label and meta", async ({ page }) => {
    await openDash(page);
    const r = await page.evaluate(readBubbles);
    if (!r || r.rows.length === 0) { test.skip(true, "the feed is empty on this account"); return; }
    const runs = r.rows.filter((x) => x.run);
    const heads = r.rows.filter((x) => !x.run);
    // eslint-disable-next-line no-console
    console.log(`[P6.3] heads=${heads.length} run-members=${runs.length}`);
    expect(heads.length, "every bubble is a run member — nothing kept a head").toBeGreaterThan(0);
    for (const h of heads) expect(h.label, "a run head lost its state label").not.toBe("");
    for (const m of runs) {
      expect(m.label, "a run member kept its label").toBe("");
      expect(m.meta, "a run member kept its meta line").toBe("");
    }
    if (runs.length === 0) {
      // eslint-disable-next-line no-console
      console.log("[P6.3] NO TIGHT RUNS on this account — the drop half of the claim is unexercised");
    }
  });
});
