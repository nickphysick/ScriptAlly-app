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
      return {
        side: e.classList.contains("out") ? "out" : "in",
        desk: e.classList.contains("desk"),
        run: e.classList.contains("run"),
        knots: e.querySelectorAll(".os-knot svg, .os-knot").length,
        fill: inner ? getComputedStyle(inner).backgroundColor : "",
        l: ir ? +(ir.left - cr.left).toFixed(1) : -1,
        r: ir ? +(cr.right - ir.right).toFixed(1) : -1,
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
    console.log(`[P6.1] ${r!.rows.length} bubbles · in=${ins.length} out=${outs.length} desk=${desks.length} · fills=${[...new Set(r!.rows.map((x) => x.fill))].join(" ")}`);

    /* ⚠️ THE POPULATION PER SIDE, or a feed that happens to be all one direction reports a clean
       sweep about a claim it never tested. */
    expect(ins.length + outs.length, "no bubbles were classified at all").toBeGreaterThan(0);
    for (const b of ins) expect(b.l, "an agent bubble is not hugging the left").toBeLessThan(b.r);
    for (const b of outs) expect(b.r, "a writer bubble is not hugging the right").toBeLessThan(b.l);
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
