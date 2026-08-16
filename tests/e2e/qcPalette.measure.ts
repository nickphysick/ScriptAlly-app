/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE PALETTE FINGERPRINT — §1's "no visual change" claim, as something that can be diffed.
 *
 * ⚠️ A TOKEN REFACTOR'S REAL RISK IS NOT THE VALUE, IT IS THE CASCADE. Proving `--x` equals the
 * literal it replaced is arithmetic anyone can do by eye; what actually breaks a refactor like this
 * is a token declared in a block that does not reach the element, a rule that now loses to one it
 * used to beat, or an inherited colour that used to be overridden. None of those is visible in the
 * source — only a laid-out page shows them. So this walks the rendered page and records every
 * colour every element actually paints.
 *
 * ⚠️ IT RECORDS, IT DOES NOT INTERPRET. §1 had to diff to NOTHING against a baseline taken before
 * the refactor, and did — 461 elements, 0 differences, after it caught two "near enough" token
 * substitutions on the first run. §2 and §3 were SUPPOSED to differ, so the baseline has been
 * retaken against the palette as shipped: from here it guards the neutral scale rather than the
 * refactor, and the next change to this page has to say which of 461 values it means to move.
 *
 * Usage:  SA_BASELINE=1 npx playwright test tests/e2e/qcPalette.measure.ts   → write the baseline
 *         npx playwright test tests/e2e/qcPalette.measure.ts                 → diff against it
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const BASELINE = resolve(new URL(".", import.meta.url).pathname, "__baseline__/qcPalette.json");

/**
 * ⚠️ THE PATH IS STRUCTURAL, NOT TEXTUAL. Keying on an element's own class list would make every
 * row look identical and a diff would not say WHICH one moved; keying on its text would make the
 * fingerprint churn every time the seeded data changed. Tag + child-index from `.f12-root`, with
 * the class list carried alongside as a human-readable label.
 */
const fingerprint = (page: import("@playwright/test").Page) => page.evaluate(() => {
  const root = document.querySelector(".f12-root") as HTMLElement | null;
  if (!root) return null;
  const out: Array<Record<string, string>> = [];
  const walk = (el: HTMLElement, path: string) => {
    const c = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    /* zero-area elements paint nothing, and their presence churns with content */
    if (r.width >= 1 && r.height >= 1) {
      out.push({
        path,
        cls: (typeof el.className === "string" ? el.className : "").slice(0, 60),
        bg: c.backgroundColor,
        fg: c.color,
        bt: c.borderTopColor, br: c.borderRightColor, bb: c.borderBottomColor, bl: c.borderLeftColor,
        bw: `${c.borderTopWidth} ${c.borderRightWidth} ${c.borderBottomWidth} ${c.borderLeftWidth}`,
        sh: c.boxShadow,
        st: c.stroke, fl: c.fill,
        /* the ring is a pseudo-element and carries the card's whole rim */
        af: getComputedStyle(el, "::after").boxShadow,
        bf: getComputedStyle(el, "::before").backgroundColor,
      });
    }
    Array.from(el.children).forEach((k, i) => walk(k as HTMLElement, `${path}/${k.tagName}${i}`));
  };
  walk(root, "ROOT");
  return out;
});

test("§1 — the page paints exactly what it painted before", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  const now = await fingerprint(page);
  expect(now, "the page root is missing — nothing was measured").not.toBeNull();

  if (process.env.SA_BASELINE) {
    mkdirSync(dirname(BASELINE), { recursive: true });
    writeFileSync(BASELINE, JSON.stringify(now, null, 1));
    console.log(`baseline written: ${now!.length} elements → ${BASELINE}`);
    return;
  }

  expect(existsSync(BASELINE), `no baseline at ${BASELINE} — run with SA_BASELINE=1 first`).toBe(true);
  const before = JSON.parse(readFileSync(BASELINE, "utf8")) as Array<Record<string, string>>;

  /* ⚠️ REPORT EVERY DIFFERENCE, THEN FAIL ONCE. Failing on the first mismatch would show one
     element and hide the shape of the change, which is the thing worth reading. */
  const diffs: string[] = [];
  const byPath = new Map(before.map((e) => [e.path, e]));
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
  if (diffs.length > 60) console.log(`  … and ${diffs.length - 60} more`);

  expect(diffs, `${diffs.length} painted values changed — §1 must change none`).toEqual([]);
});
