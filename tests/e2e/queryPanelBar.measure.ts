/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE PANEL'S TOP BAR, against `query-centre-v5-sticky-hero-cta.html`.
 *
 * ⚠️ THE BAR IS ASSERTED ACROSS EVERY STAGE, not on the one query that happens to open first. Its
 * whole claim is that the ladder tint begins BELOW it — a claim that can only fail on some stages,
 * so checking one proves nothing about the rest.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const REF = "file://" + resolve(process.cwd(), "design-refs/query-centre-v5-sticky-hero-cta.html");

/** role → [ref selector, built selector, properties] */
const PROBE: [string, string, string, string[]][] = [
  ["pbar",  ".panel .pbar",          ".qpn .qpn-bar",        ["backgroundColor", "padding", "borderBottomWidth", "borderBottomStyle", "borderBottomColor", "position", "height", "borderRadius", "overflow"]],
  /* ⚠️ NO `backgroundColor` HERE. The two surfaces open different queries, so their bands are
     different RUNGS — comparing them asserts the fixture, not the rule. That the band carries the
     card's own token is `queryPanel.measure.ts`'s claim, against the card rather than the ref. */
  ["pband", ".panel .pband",         ".qpn .qpn-band",       ["padding", "borderBottomWidth", "borderBottomColor"]],
  ["word",  ".panel .pband .word",   ".qpn .qpn-word",       /* fontFamily is the token's extra fallback — same face, a known deliberate deviation */
      ["fontSize"]],
  ["icb",   ".panel .pbar .icb",     ".qpn .qpn-icb",        ["width", "height", "borderWidth", "borderStyle", "borderColor", "borderRadius", "backgroundColor"]],
  /* ⚠️ `:not(.pink)` ON BOTH SIDES. The first `.act` in either bar IS the pink primary, so the
     plain-button row and the pink row were measuring one element and agreeing with themselves. */
  ["act",   ".panel .pbar .act:not(.pink)", ".qpn .qpn-act:not(.qpn-act--pink)", ["backgroundColor", "borderWidth", "borderColor", "borderRadius", "padding", "fontSize", "letterSpacing", "textTransform"]],
  ["actPink", ".panel .pbar .act.pink", ".qpn .qpn-act--pink", ["backgroundColor", "borderColor"]],
];

async function probe(page: import("@playwright/test").Page, which: 0 | 1) {
  return page.evaluate(({ table, idx }) => {
    const out: Record<string, Record<string, string>> = {};
    for (const row of table) {
      const role = row[0] as string;
      const sel = row[1 + idx] as string;
      const props = row[3] as string[];
      const el = document.querySelector(sel) as HTMLElement | null;
      if (!el) { out[role] = { MISSING: sel }; continue; }
      const cs = getComputedStyle(el);
      const rec: Record<string, string> = {};
      for (const p of props) rec[p] = cs[p as keyof CSSStyleDeclaration] as string;
      const r = el.getBoundingClientRect();
      rec._box = `${Math.round(r.width)}x${Math.round(r.height)}`;
      out[role] = rec;
    }
    return out;
  }, { table: PROBE as unknown as unknown[][], idx: which });
}

test("the panel bar, against the v5 ref", async ({ page }) => {
  const out: Record<string, unknown> = {};

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(REF);
  await page.waitForTimeout(500);
  /* the ref's panel only exists once opened */
  await page.evaluate(() => (document.querySelector(".card") as HTMLElement)?.click());
  await page.waitForTimeout(600);
  const ref = await probe(page, 0);
  out.ref = ref;

  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await expect(page.locator(".qcc").first()).toBeVisible({ timeout: 30_000 });
  await page.locator('.qcc[data-qcc-id^="cor-"]').first().click();
  await expect(page.locator(".qpn[data-on='true']")).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(600);
  const built = await probe(page, 1);
  out.built = built;

  /* ⚠️ WHICH RULE WINS for every property that differs — a value is a symptom, the selector is the
     fault, and without it a mismatch gets "fixed" with an override. */
  const client = await page.context().newCDPSession(page);
  await client.send("DOM.enable");
  await client.send("CSS.enable");
  const { root } = await client.send("DOM.getDocument", { depth: -1, pierce: true }) as { root: { nodeId: number } };
  const sources: Record<string, unknown> = {};
  for (const [role, , sel, props] of PROBE) {
    const bad = props.filter((p) => (built[role]?.[p] ?? "") !== (ref[role]?.[p] ?? ""));
    if (!bad.length) continue;
    try {
      const { nodeId } = await client.send("DOM.querySelector", { nodeId: root.nodeId, selector: sel }) as { nodeId: number };
      if (!nodeId) { sources[role] = "node not found"; continue; }
      const m = await client.send("CSS.getMatchedStylesForNode", { nodeId }) as {
        matchedCSSRules?: { rule: { selectorList: { text: string }; style: { cssProperties: { name: string; value: string }[] } } }[];
      };
      const winners: Record<string, string> = {};
      for (const p of bad) {
        const css = p.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
        for (const entry of [...(m.matchedCSSRules ?? [])].reverse()) {
          const hit = entry.rule.style.cssProperties.find((c) => c.name === css || c.name === css.split("-")[0]);
          if (hit) { winners[p] = `${entry.rule.selectorList.text} { ${hit.name}: ${hit.value} }`; break; }
        }
        if (!winners[p]) winners[p] = "(no rule — initial/inherited default)";
      }
      sources[role] = winners;
    } catch (e) { sources[role] = `probe failed: ${String(e)}`; }
  }
  out.sources = sources;

  /**
   * ⚠️ THE BAR IS PARCHMENT ON EVERY STAGE. The ladder tint begins at the band beneath it; a bar
   * that took the tint would make the panel's chrome change colour with the query it is showing.
   * Stepping through the set is what makes this a claim about the RULE rather than about one card.
   */
  const perStage: Record<string, string> = {};
  for (let i = 0; i < 8; i += 1) {
    const seen = await page.evaluate(() => {
      const p = document.querySelector(".qpn") as HTMLElement | null;
      if (!p) return null;
      return {
        stage: p.getAttribute("data-qpn-stage") ?? "?",
        bar: getComputedStyle(p.querySelector(".qpn-bar") as Element).backgroundColor,
        band: getComputedStyle(p.querySelector(".qpn-band") as Element).backgroundColor,
      };
    });
    if (seen) perStage[seen.stage] = `${seen.bar} | band ${seen.band}`;
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(350);
  }
  out.perStage = perStage;

  mkdirSync("reports", { recursive: true });
  writeFileSync("reports/query-panel-bar.json", JSON.stringify(out, null, 2));

  expect(Object.keys(ref).length, "the ref panel did not open").toBeGreaterThan(4);
  expect(built.pbar?.MISSING, "no built panel bar").toBeUndefined();

  const mismatches: string[] = [];
  for (const [role, , , props] of PROBE) {
    for (const p of props) {
      const a = ref[role]?.[p], b = built[role]?.[p];
      if (a !== b) mismatches.push(`${role}.${p}: ref="${a}" built="${b}"`);
    }
  }
  expect(mismatches, `the panel bar diverges from the ref:\n  ${mismatches.join("\n  ")}`).toEqual([]);

  /* the bar is parchment whatever the stage — asserted over what was actually seen */
  const stagesSeen = Object.keys(perStage);
  expect(stagesSeen.length, "only one stage was visited — the claim is unexercised").toBeGreaterThan(2);
  for (const [stage, v] of Object.entries(perStage)) {
    expect(v.split(" | ")[0], `the bar is tinted on stage ${stage}`).toBe("rgb(253, 250, 245)");
  }
});
