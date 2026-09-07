/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE DASHBOARD'S TO-DO PANEL, on a rendered page (dashboard redesign, Phase 5).
 *
 * ⚠️ EVERY CLAIM HERE IS ABOUT A COMPOSITION, WHICH IS THE ONE KIND A SOURCE LOCK CANNOT MAKE.
 * "The bands sum to the whole width", "the badge agrees with the tickets under every filter" and
 * "revealing the legend moves nothing" are each true or false of the ARRANGEMENT, not of any
 * declaration in it — and this repo has measured a source line and a usage line each carrying the
 * right string while the page read "TextIn 1 package", because vertical margin is inert on an
 * inline box. A measurement of the parts is not a measurement of the whole.
 */
import { expect, test } from "@playwright/test";
import { openRoute } from "./measure";

async function openDash(page: import("@playwright/test").Page, width = 1600) {
  await openRoute(page, "/dashboard", { width, height: 1000 });
  await expect(page.locator(".os-tasks").first()).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(1200);
}

/** the badge's figure, and how many tickets are actually on screen */
const readPanel = () => ({
  badge: Number((document.querySelector(".os-tasks .os-tbadge b")?.textContent ?? "").trim()),
  label: (document.querySelector(".os-tasks .os-tbadge")?.textContent ?? "").trim(),
  tickets: document.querySelectorAll(".os-tasks .os-tkgrid .tkt").length,
});

test.describe("P5 · the to-do panel", () => {
  test("P5.1 · the rule's bands fill the width, and their counts sum to the badge", async ({ page }) => {
    await openDash(page);
    const r = await page.evaluate(() => {
      const rule = document.querySelector(".os-tasks .os-rule") as HTMLElement | null;
      if (!rule) return null;
      const bands = [...rule.querySelectorAll(".os-rb")] as HTMLElement[];
      const rw = rule.getBoundingClientRect().width;
      const gaps = (bands.length - 1) * 2; // the card-coloured separators
      const sum = bands.reduce((n, b) => n + b.getBoundingClientRect().width, 0);
      return {
        n: bands.length,
        pct: +((sum / (rw - gaps)) * 100).toFixed(1),
        counts: bands.map((b) => Number(/,\s*(\d+)$/.exec(b.getAttribute("aria-label") ?? "")?.[1] ?? 0)),
        badge: Number((document.querySelector(".os-tasks .os-tbadge b")?.textContent ?? "").trim()),
        h: +rule.getBoundingClientRect().height.toFixed(1),
      };
    });
    /* ⚠️ AN EMPTY BOARD DRAWS NO RULE, DELIBERATELY — five bands of nothing is a shape promising
       data that does not exist. So a null here is a fixture fact, and it is REPORTED rather than
       passed over in silence: a run that measured nothing must say so. */
    if (r === null) {
      // eslint-disable-next-line no-console
      console.log("[P5.1] NO RULE — the harness account's board is empty; this case measured nothing");
      test.skip(true, "the board is empty on this account — seed it before trusting P5.1");
      return;
    }
    // eslint-disable-next-line no-console
    console.log(`[P5.1] bands=${r.n} fill=${r.pct}% h=${r.h} counts=${r.counts.join("+")}=${r.counts.reduce((a, b) => a + b, 0)} badge=${r.badge}`);
    expect(r.n, "five categories, five bands").toBe(5);
    expect(r.pct, "the bands must fill the rule's width").toBeGreaterThan(99);
    expect(r.pct).toBeLessThan(101);
    expect(r.counts.reduce((a, b) => a + b, 0), "the five band counts must sum to the badge").toBe(r.badge);
    expect(r.h, "the rule is 9px at rest").toBeLessThanOrEqual(10);
  });

  test("P5.2 · the badge states the visible set, under every filter", async ({ page }) => {
    await openDash(page);
    const bands = await page.locator(".os-tasks .os-rb").count();
    if (bands === 0) { test.skip(true, "the board is empty on this account"); return; }

    const seen: string[] = [];
    const rest = await page.evaluate(readPanel);
    seen.push(`rest: badge ${rest.badge} "${rest.label}" · ${rest.tickets} tickets`);
    expect(rest.badge, "at rest the badge is the open total").toBe(rest.tickets);

    for (let i = 0; i < bands; i++) {
      const band = page.locator(".os-tasks .os-rb").nth(i);
      const label = (await band.getAttribute("aria-label")) ?? "";
      const n = Number(/,\s*(\d+)$/.exec(label)?.[1] ?? 0);
      if (n === 0) { seen.push(`${label}: empty, skipped`); continue; }
      await band.click();
      await page.waitForTimeout(150);
      const on = await page.evaluate(readPanel);
      seen.push(`${label}: badge ${on.badge} "${on.label}" · ${on.tickets} tickets`);
      expect(on.badge, `the badge disagrees with the tickets under ${label}`).toBe(on.tickets);
      expect(on.badge, `the badge disagrees with the band's own count under ${label}`).toBe(n);
      await band.click(); // clicking again clears
      await page.waitForTimeout(150);
    }
    // eslint-disable-next-line no-console
    console.log(`[P5.2] ${seen.join("\n        ")}`);
    /* ⚠️ THE POPULATION, PER BRANCH. A board where every category but one is empty would exercise
       one filter and report a clean sweep — the monoculture this repo already records against a
       fixture whose every case was the same case. */
    expect(seen.filter((l) => !l.includes("empty, skipped")).length, "fewer than two filters were exercised")
      .toBeGreaterThan(2);
    const back = await page.evaluate(readPanel);
    expect(back.badge, "clicking a band again must clear the filter").toBe(rest.badge);
  });

  /* ⚠️ THE LEGEND IS AN OVERLAY, AND THE ONLY HONEST TEST IS THE TICKETS' BOXES. A legend that
     reflows the grid makes the thing you were about to click jump out from under the pointer. */
  test("P5.3 · revealing the legend moves no ticket", async ({ page }) => {
    await openDash(page);
    const before = await page.evaluate(() =>
      [...document.querySelectorAll(".os-tasks .os-tkgrid .tkt")].map((e) => {
        const b = e.getBoundingClientRect();
        return [+b.x.toFixed(1), +b.y.toFixed(1), +b.width.toFixed(1), +b.height.toFixed(1)];
      }));
    if (before.length === 0) { test.skip(true, "no tickets on this account"); return; }

    await page.locator(".os-tasks .os-rulezone").hover();
    await page.waitForTimeout(250);
    const legend = await page.evaluate(() => {
      const l = document.querySelector(".os-tasks .os-legend") as HTMLElement | null;
      if (!l || l.hidden) return null;
      const b = l.getBoundingClientRect();
      return { w: +b.width.toFixed(1), h: +b.height.toFixed(1), pos: getComputedStyle(l).position };
    });
    const after = await page.evaluate(() =>
      [...document.querySelectorAll(".os-tasks .os-tkgrid .tkt")].map((e) => {
        const b = e.getBoundingClientRect();
        return [+b.x.toFixed(1), +b.y.toFixed(1), +b.width.toFixed(1), +b.height.toFixed(1)];
      }));
    // eslint-disable-next-line no-console
    console.log(`[P5.3] tickets=${before.length} legend=${legend ? `${legend.w}×${legend.h} ${legend.pos}` : "(never opened)"}`);
    expect(legend, "the legend never opened — this case measured nothing").not.toBeNull();
    expect(legend!.pos, "the legend must be positioned over the tickets").toBe("absolute");
    expect(after, "revealing the legend moved a ticket").toEqual(before);
  });

  /* ⚠️ TWO TINTED REGIONS, FROM TWO DERIVATIONS, AND NEITHER IS THE OTHER'S. The edge is the
     QUERY's state; the tag is the CARD's family. Measured as painted colour, because the source
     lock can only say which function was called. */
  test("P5.4 · each snipped ticket paints exactly two tinted regions", async ({ page }) => {
    await openDash(page);
    const r = await page.evaluate(() => {
      const tks = [...document.querySelectorAll(".os-tasks .os-tkgrid .tkt")] as HTMLElement[];
      const clear = (c: string) => c === "rgba(0, 0, 0, 0)" || c === "transparent";
      return tks.slice(0, 12).map((t) => {
        const tinted = [...t.querySelectorAll("*")].filter((e) => !clear(getComputedStyle(e).backgroundColor));
        return {
          n: tinted.length,
          cls: tinted.map((e) => (e.className || "").toString().split(" ")[0]).join("+"),
          /* the snip: no facts row, no foot, no manuscript caption */
          extras: t.querySelectorAll(".facts, .tfoot, .msc").length,
        };
      });
    });
    if (r.length === 0) { test.skip(true, "no tickets on this account"); return; }
    // eslint-disable-next-line no-console
    console.log(`[P5.4] ${r.length} tickets · regions=${[...new Set(r.map((x) => `${x.n}(${x.cls})`))].join(" ")} extras=${r.reduce((a, x) => a + x.extras, 0)}`);
    for (const t of r) {
      expect(t.n, `a ticket paints ${t.n} tinted regions (${t.cls}), not two`).toBe(2);
      expect(t.extras, "a snipped ticket still renders its facts, foot or manuscript line").toBe(0);
    }
  });
});
