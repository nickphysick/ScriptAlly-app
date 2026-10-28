/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v116 — the hover detail, measured on the rendered page (ref design-refs/dashboard-v116/).
 *
 * A1 the chart's week callout · B1 the stepped stack's geometry and cap · B2 the on-screen rule · C1/C2 the
 * Closed slices, key rows and mini query cards · D1 the Agents stacks · E1 the task card's frame · F1 the
 * founding card's tilt and header swap · K1 the keyboard. Each lock's named break is `DB116_MUTATE=<name>`
 * (db116Lib's CSS_MUTATIONS, or a code break recorded in the report).
 */
import { expect, test, type Page } from "@playwright/test";
import { Ledger, openDash, tag, type VP } from "./db116Lib";

test.describe.configure({ mode: "serial" });

const VP1440: VP = { width: 1440, height: 900 };

/* ── A1 ── */

interface Read { week: string; x: number; count: number; delta: string; kind: string; flip: boolean; left: number; right: number; frameR: number; bars: { g: string; n: number; w: number }[]; rows: { g: string; n: number }[] }
async function readCallout(page: Page): Promise<Read | null> {
  return page.evaluate(() => {
    const c = document.querySelector<HTMLElement>('[data-d116="callout"]');
    if (!c) return null;
    const plot = document.querySelector('[data-probe="plot"]')!.getBoundingClientRect();
    const frame = c.closest(".os-frame")!.getBoundingClientRect();
    const r = c.getBoundingClientRect();
    return {
      week: c.dataset.week ?? "", x: plot.left + Number(c.dataset.x), count: Number(c.querySelector('[data-d116="count"]')!.textContent!.replace(/,/g, "")),
      delta: c.querySelector('[data-d116="delta"]')!.textContent ?? "", kind: (c.querySelector('[data-d116="delta"]') as HTMLElement).dataset.kind ?? "",
      flip: c.dataset.flip === "1", left: r.left, right: r.right, frameR: frame.right,
      bars: [...c.querySelectorAll<HTMLElement>(".d116-wks i")].map((i) => ({ g: i.dataset.g ?? "", n: Number(i.dataset.n), w: i.getBoundingClientRect().width })),
      rows: [...c.querySelectorAll<HTMLElement>(".d116-wkl li")].map((li) => ({ g: li.dataset.g ?? "", n: Number(li.querySelector("b")!.textContent) })),
    };
  });
}

test("DB116 A1 — the chart's week callout", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("A1");
  await openDash(page, VP1440);
  const box = (await page.locator('[data-probe="plot"]').first().boundingBox())!;
  L.check("A1", "population: the plot", !!box && box.width > 200, JSON.stringify(box));
  /* ⚠️ NO CALLOUT AT REST */
  L.check("A1", "no callout at rest", (await page.locator('[data-d116="callout"]').count()) === 0, "");
  /* the old week popup is gone: sweeping the weeks never opens the dash popup */
  const seen = new Map<string, Read>();
  let popupOnWeek = 0;
  for (let x = box.x + 4; x < box.x + box.width - 2; x += 6) {
    await page.mouse.move(x, box.y + 6);
    const r = await readCallout(page);
    const pop = await page.evaluate(() => document.querySelector('[data-probe="dash-popup"].on') !== null);
    if (!r) continue;
    if (pop) popupOnWeek += 1;
    if (!seen.has(r.week)) seen.set(r.week, r);
  }
  const weeks = [...seen.values()].sort((a, b) => a.x - b.x);
  L.check("A1", "population: weeks swept", weeks.length >= 4, `${weeks.length} weeks: ${weeks.map((w) => w.week).join(", ")}`);
  L.check("A1", "the week popup never shows with the callout", popupOnWeek === 0, `${popupOnWeek} readings`);
  const kinds = new Set<string>();
  for (let i = 0; i < weeks.length; i++) {
    const w = weeks[i];
    kinds.add(w.kind);
    const prev = i ? weeks[i - 1].count : w.count;
    const d = w.count - prev;
    const want = d > 0 ? `▲ ${d} on last week` : d < 0 ? `▼ ${-d} on last week` : "no change";
    L.check("A1", `${w.week} delta`, w.delta === want, `${w.delta} vs ${want} (${prev}→${w.count})`);
    const sum = w.rows.reduce((s, r) => s + r.n, 0);
    L.check("A1", `${w.week} rows sum to the count`, sum === w.count && w.rows.slice(0, 3).map((r) => r.g).join() === "queried,partial,full", `${JSON.stringify(w.rows)} vs ${w.count}`);
    const bw = w.bars.reduce((s, b) => s + b.w, 0), bn = w.bars.reduce((s, b) => s + b.n, 0);
    const off = w.bars.map((b) => Math.abs(b.w - (bw * b.n) / bn));
    L.check("A1", `${w.week} bars proportional ±1px`, bn === w.count && off.every((o) => o <= 1), `${JSON.stringify(w.bars)} off ${off.map((o) => o.toFixed(2))}`);
    /* placement: 10px from the guide, on the right unless that crosses the card's right edge */
    const side = w.flip ? Math.abs(w.right - (w.x - 10)) : Math.abs(w.left - (w.x + 10));
    L.check("A1", `${w.week} 10px from the guide`, side <= 1, `${w.flip ? "left" : "right"} gap off by ${side.toFixed(1)}`);
    L.check("A1", `${w.week} inside the card`, w.right <= w.frameR + 0.5 && (w.flip || w.x + 10 + 208 <= w.frameR - 8 + 0.5), `right ${w.right.toFixed(1)} frame ${w.frameR.toFixed(1)}`);
  }
  L.check("A1", "both sides exercised (the last week flips)", weeks.some((w) => w.flip) && weeks.some((w) => !w.flip), weeks.map((w) => `${w.week}:${w.flip ? "L" : "R"}`).join(" "));
  console.log(`  delta kinds seen on the account: ${[...kinds].join(", ")} (all three are held by the unit lock)`);
  /* the guide line is dashed and runs the plot's full height */
  const g = await page.evaluate(() => { const l = document.querySelector('[data-d116="guide"]'); const p = document.querySelector('[data-probe="plot"]')!.getBoundingClientRect(); const r = l?.getBoundingClientRect(); return r ? { top: r.top - p.top, h: r.height, ph: p.height, dash: l!.getAttribute("stroke-dasharray") } : null; });
  L.check("A1", "the guide runs the plot's height, dashed", !!g && Math.abs(g.top) <= 1 && Math.abs(g.h - g.ph) <= 1 && !!g.dash, JSON.stringify(g));
  /* ⚠️ PINS WIN: on a pin's glyph the event popup shows and the callout does not */
  const pin = page.locator(".os-acglyph").first();
  const pb = (await pin.boundingBox())!;
  L.check("A1", "population: a pin", !!pb, "");
  await page.mouse.move(pb.x + pb.width / 2, pb.y + pb.height / 2);
  await page.waitForTimeout(250);
  const won = await page.evaluate(() => ({ pop: !!document.querySelector('[data-probe="dash-popup"].on'), callout: !!document.querySelector('[data-d116="callout"]') }));
  L.check("A1", "a pin's popup wins over the callout", won.pop && !won.callout, JSON.stringify(won));
  L.done(20);
});

void expect; void tag;
