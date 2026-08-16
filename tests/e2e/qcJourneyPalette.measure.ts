/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE JOURNEY FINGERPRINT — the same diffable claim as the page's, for the sheets.
 *
 * ⚠️ THE SHEETS ARE PORTALLED, so the page's fingerprint never saw them: it walks `.f12-root` and
 * they mount at body level. Tokenising them without this would be exactly the "quietly recoloured"
 * outcome the page's own run caught twice.
 *
 * ⚠️ AND THE SHEET IS MEASURED WITH MOTION SUPPRESSED, which is safe HERE and would not be for a
 * teardown. `openRoute` kills animations, so `animationend` never fires and the entrance class stays
 * armed — the sheet is mounted and painted either way, which is all a colour reading needs. Any test
 * that closed a journey would have to lift the suppression first.
 *
 * Usage:  SA_BASELINE=1 npx playwright test tests/e2e/qcJourneyPalette.measure.ts
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const BASELINE = resolve(new URL(".", import.meta.url).pathname, "__baseline__/qcJourneyPalette.json");

const openJourney = async (page: import("@playwright/test").Page) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.getByRole("button", { name: /log query/i }).first().click();
  await page.waitForSelector(".qc-sheet-layer", { timeout: 15_000 });
  await page.waitForTimeout(600);
};

const fingerprint = (page: import("@playwright/test").Page) => page.evaluate(() => {
  const root = document.querySelector(".qc-sheet-layer") as HTMLElement | null;
  if (!root) return null;
  const out: Array<Record<string, string>> = [];
  const walk = (el: HTMLElement, path: string) => {
    const c = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (r.width >= 1 && r.height >= 1) {
      out.push({
        path, cls: (typeof el.className === "string" ? el.className : "").slice(0, 60),
        bg: c.backgroundColor, fg: c.color,
        bt: c.borderTopColor, br: c.borderRightColor, bb: c.borderBottomColor, bl: c.borderLeftColor,
        bw: `${c.borderTopWidth} ${c.borderRightWidth} ${c.borderBottomWidth} ${c.borderLeftWidth}`,
        sh: c.boxShadow, st: c.stroke, fl: c.fill,
        af: getComputedStyle(el, "::after").boxShadow,
        bf: getComputedStyle(el, "::before").backgroundColor,
      });
    }
    Array.from(el.children).forEach((k, i) => walk(k as HTMLElement, `${path}/${k.tagName}${i}`));
  };
  walk(root, "SHEET");
  return out;
});

test("§2 — the journey paints exactly what it painted before", async ({ page }) => {
  await openJourney(page);
  const now = await fingerprint(page);
  expect(now, "no sheet — the journey did not open").not.toBeNull();

  if (process.env.SA_BASELINE) {
    mkdirSync(dirname(BASELINE), { recursive: true });
    writeFileSync(BASELINE, JSON.stringify(now, null, 1));
    console.log(`journey baseline written: ${now!.length} elements`);
    return;
  }
  expect(existsSync(BASELINE), `no baseline — run with SA_BASELINE=1 first`).toBe(true);
  const before = JSON.parse(readFileSync(BASELINE, "utf8")) as Array<Record<string, string>>;
  const byPath = new Map(before.map((e) => [e.path, e]));
  const diffs: string[] = [];
  for (const a of now!) {
    const b = byPath.get(a.path);
    if (!b) { diffs.push(`+ ${a.path} (${a.cls}) is new`); continue; }
    for (const k of Object.keys(a)) {
      if (k === "path" || k === "cls") continue;
      if (a[k] !== b[k]) diffs.push(`~ ${a.path} (${a.cls}) ${k}: ${b[k]}  →  ${a[k]}`);
    }
  }
  for (const b of before) if (!now!.some((a) => a.path === b.path)) diffs.push(`- ${b.path} (${b.cls}) is gone`);
  console.log(`\n${now!.length} elements measured · ${diffs.length} differences`);
  for (const d of diffs.slice(0, 60)) console.log(`  ${d}`);
  expect(diffs, `${diffs.length} painted values changed`).toEqual([]);
});
