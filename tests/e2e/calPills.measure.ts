/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * calPills — the pill grammar, click-through and rolled-forward, measured on a rendered page
 * (pill pack, Phase 5).
 *
 * ⚠️ IT RE-MEASURES `CAL_PIP_H`. The pill's font went 8.5px -> 10px in Phase 2, which moves the
 * height the FOLD divides by. Leaving the constant at its old value is precisely the fault that
 * cost two packs: a cap that promises room the cell does not have.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const ROUTE = "/todo/calendar";

test("calendar — pills, click-through, provenance", async ({ page }) => {
  for (const width of [1000, 1440, 1920]) {
    await openRoute(page, ROUTE, { width, height: 900 });
    const r = await page.evaluate(() => {
      const pips = Array.from(document.querySelectorAll(".cal-cell .cal-pip")) as HTMLElement[];
      const one = pips[0] ? getComputedStyle(pips[0]) : null;
      const lineH = one ? parseFloat(one.lineHeight) : 0;
      const geom = pips.map((p) => {
        const cs = getComputedStyle(p);
        const b = p.getBoundingClientRect();
        return {
          text: (p.textContent ?? "").trim(),
          h: Math.round(b.height * 100) / 100,
          /* the true flow height a stack of these needs: box + its top margin */
          flowH: Math.round((b.height + parseFloat(cs.marginTop)) * 100) / 100,
          radius: cs.borderRadius,
          /* ⚠️ A SINGLE-LINE PILL IS TALLER THAN ONE LINE-HEIGHT — it has padding and a border.
             Dividing height by line-height rounds 23/15 to 2 and calls an unwrapped pill wrapped.
             The honest test is against the box a single line actually occupies. */
          singleLineH: Math.round((parseFloat(cs.lineHeight) + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)
            + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth)) * 100) / 100,
          cls: p.className,
          clipped: p.scrollHeight > p.clientHeight + 1,
        };
      });
      /* the panel's rows keep FULL labels — the grid is the only surface that summarises */
      const panelRows = Array.from(document.querySelectorAll(".cal-focus .cal-fptxt"))
        .map((e) => (e.textContent ?? "").trim());
      const panelRecs = Array.from(document.querySelectorAll(".cal-focus .cal-recname"))
        .map((e) => (e.textContent ?? "").trim());
      const cells = Array.from(document.querySelectorAll(".cal-cell")) as HTMLElement[];
      return {
        n: pips.length,
        lineH,
        /* wrapped == the box is taller than one line's box can be */
        wrapped: geom.filter((g) => g.h > g.singleLineH + 1).map((g) => g.text),
        byClass: geom.map((g) => ({ t: g.text, cls: g.cls })).slice(0, 14),
        anyClipped: geom.some((g) => g.clipped),
        radii: Array.from(new Set(geom.map((g) => g.radius))),
        flowHeights: Array.from(new Set(geom.map((g) => g.flowH))).sort((a, b) => a - b),
        texts: Array.from(new Set(geom.map((g) => g.text))).slice(0, 14),
        panelRows: panelRows.slice(0, 8),
        panelRecs: panelRecs.slice(0, 6),
        rolledText: document.querySelector(".cal-grid")?.textContent?.includes("ROLLED FORWARD") ?? false,
        provenance: Array.from(document.querySelectorAll(".cal-fporig")).map((e) => (e.textContent ?? "").trim()),
        /* the reconciliation, re-run */
        recon: cells.map((c) => ({
          day: (c.querySelector(".cal-dn")?.textContent ?? "").trim(),
          chip: Number(c.querySelector(".cal-c2")?.textContent ?? 0),
          shown: c.querySelectorAll(".cal-pip").length,
          more: Number((c.querySelector(".cal-more2")?.textContent ?? "0").replace(/\D/g, "")),
        })).filter((c) => c.chip > 0),
      };
    });

    console.log(`\n@${width} — ${r.n} pills, line-height ${r.lineH}px`);
    console.log(`  radii            : ${JSON.stringify(r.radii)}`);
    console.log(`  FLOW HEIGHTS     : ${JSON.stringify(r.flowHeights)}   <= CAL_PIP_H must be >= max`);
    console.log(`  wrapped / clipped: ${JSON.stringify(r.wrapped)} / ${r.anyClipped}`);
    console.log(`  pill classes     : ${JSON.stringify(r.byClass)}`);
    console.log(`  pill texts       : ${JSON.stringify(r.texts)}`);
    console.log(`  panel rows       : ${JSON.stringify(r.panelRows)}`);
    console.log(`  panel record rows: ${JSON.stringify(r.panelRecs)}`);
    console.log(`  ROLLED FORWARD   : ${r.rolledText}`);
    console.log(`  provenance lines : ${JSON.stringify(r.provenance)}`);

    /* ── the pill grammar ──────────────────────────────────────────────────────────────────── */
    expect(r.n, `@${width} no pills rendered`).toBeGreaterThan(0);
    expect(r.radii, `@${width} a pill is not a capsule`).toEqual(["999px"]);
    expect(r.wrapped, `@${width} a pill wrapped onto a second line`).toEqual([]);
    expect(r.anyClipped, `@${width} a pill's own text is clipped inside it`).toBe(false);
    /* ⚠️ NO AGENT NAME ON ANY PILL — the grid is a density map. Checked against the names the
       PANEL shows, so it cannot pass by there being no agents in the data. */
    const agents = r.panelRecs.map((t) => t.split("·")[1]?.trim()).filter(Boolean);
    for (const a of agents) {
      for (const t of r.texts) {
        expect(t, `@${width} pill "${t}" carries the agent name "${a}"`).not.toContain(a);
      }
    }
    /* ── the marker is gone ────────────────────────────────────────────────────────────────── */
    expect(r.rolledText, `@${width} ROLLED FORWARD still on the grid`).toBe(false);
    /* ── the reconciliation still holds ────────────────────────────────────────────────────── */
    for (const c of r.recon) {
      expect(c.shown + c.more, `@${width} day ${c.day}: chip ${c.chip} != ${c.shown} + ${c.more}`).toBe(c.chip);
    }
  }
});

/** The interaction half: a pill must land on its row, and actioning must be unchanged. */
test("calendar — a pill lands on its row, and the row still acts", async ({ page }) => {
  await openRoute(page, ROUTE, { width: 1440, height: 900 });
  /* the neutral click first — the plate's collapse-on-engagement moves the tool row otherwise */
  await page.locator(".cal-cell").nth(20).click();
  await page.waitForTimeout(400);

  /* ── a RECORD pill opens its panel row expanded ──────────────────────────────────────────── */
  const recCell = page.locator(".cal-cell", { has: page.locator(".cal-pip.cal-rec") }).first();
  await recCell.locator(".cal-pip.cal-rec").first().click();
  await page.waitForTimeout(500);
  const rec = await page.evaluate(() => ({
    openRows: document.querySelectorAll(".cal-recrow.open").length,
    expanded: document.querySelectorAll('.cal-recmain[aria-expanded="true"]').length,
    hasDetail: !!document.querySelector(".cal-recrow.open .cal-recgrid, .cal-recrow.open .cal-recdet"),
  }));
  console.log(`  record pill -> open rows ${rec.openRows}, aria-expanded ${rec.expanded}, detail ${rec.hasDetail}`);
  expect(rec.openRows, "a record pill did not open its panel row").toBe(1);
  expect(rec.expanded, "the opened row is not announced as expanded").toBe(1);

  /* ── selecting a different day clears the expansion ──────────────────────────────────────── */
  await page.locator(".cal-cell").nth(3).click();
  await page.waitForTimeout(400);
  expect(await page.locator(".cal-recrow.open").count(), "changing day left a row expanded").toBe(0);

  /* ── a CARD pill brings its row into view ────────────────────────────────────────────────── */
  const cardCell = page.locator(".cal-cell", { has: page.locator(".cal-pip:not(.cal-rec)") }).first();
  await cardCell.locator(".cal-pip:not(.cal-rec)").first().click();
  await page.waitForTimeout(600);
  const card = await page.evaluate(() => {
    const body = document.querySelector(".cal-fpbody") as HTMLElement | null;
    const rows = Array.from(document.querySelectorAll(".cal-focus [data-rowkey]")) as HTMLElement[];
    if (!body || !rows.length) return null;
    const br = body.getBoundingClientRect();
    /* at least one row is inside the scroller's viewport — the scroll landed somewhere real */
    const inView = rows.filter((r) => {
      const rr = r.getBoundingClientRect();
      return rr.bottom > br.top && rr.top < br.bottom;
    }).length;
    return { rows: rows.length, inView, rowsHaveKeys: rows.every((r) => !!r.getAttribute("data-rowkey")) };
  });
  console.log(`  card pill   -> ${card?.rows} rows, ${card?.inView} in view`);
  expect(card, "the panel rendered no addressable rows").not.toBeNull();
  expect(card!.rowsHaveKeys, "a panel row has no data-rowkey to scroll to").toBe(true);
  expect(card!.inView, "no panel row is in view after a card pill click").toBeGreaterThan(0);

  /* ── ACTIONING IS UNCHANGED: the row still opens the journey ─────────────────────────────── */
  const before = await page.locator(".tdk-takeover, [class*='takeover'], .cal-focus").count();
  await page.locator(".cal-focus .cal-fprow:not([disabled])").first().click();
  await page.waitForTimeout(700);
  const opened = await page.evaluate(() =>
    !!document.querySelector("[class*='takeover'], [class*='ff-'], [role='dialog']"));
  console.log(`  panel row   -> journey opened: ${opened} (panels before ${before})`);
  expect(opened, "the panel row no longer opens FocusFlow — actioning changed").toBe(true);
});
