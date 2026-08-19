/**
 * ACCEPTANCE ON THE PAGE — console health and layout across the states this work added.
 *
 * ⚠️ THE DUPLICATE-KEY WARNING IS KNOWN AND OUT OF SCOPE (named in both run reports). It is
 * counted separately rather than tolerated silently, so a NEW error cannot hide behind it.
 */
import { test } from "@playwright/test";
import { ensureSignedIn } from "./measure";
import { writeFileSync } from "node:fs";

const DUP_KEY = /two children with the same key/i;

test("materials acceptance", async ({ page }) => {
  const errs: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  page.on("pageerror", (e) => errs.push(`PAGEERROR ${e.message}`));

  const out: string[] = [];
  for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(vp);
    await ensureSignedIn(page);
    await page.goto("/todo");
    await page.waitForTimeout(6500);

    const list = await page.evaluate(() => ({
      scroll: Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
      grid: !!document.querySelector(".wpg"),
      /* ⚠️ the flex min-height chain: a scroll row holding content must not measure 0 */
      /* ⚠️ SCOPE TO THE PAGE ACTUALLY ON SCREEN. The workspace keeps every page MOUNTED and hides
         the inactive ones at the slot, so `document.querySelectorAll(".wpg-scroll > *")` spans all
         of them — and a child of a hidden ANCESTOR still computes `display: block` while measuring
         zero. That reported six failures on a page with none. `offsetParent === null` is the honest
         test: it is null exactly when an ancestor is display:none. */
      zeroBoxes: (() => {
        const grid = [...document.querySelectorAll(".wpg")].find((g) => (g as HTMLElement).offsetParent !== null);
        if (!grid) return -1;
        return [...grid.querySelectorAll(".wpg-scroll > *")].filter((e) => {
          const el = e as HTMLElement;
          if (el.offsetParent === null) return false;
          return el.offsetHeight === 0 && (el.textContent ?? "").trim().length > 0;
        }).length;
      })(),
      offscreenPages: [...document.querySelectorAll(".wpg")].filter((g) => (g as HTMLElement).offsetParent === null).length,
      bulk: !!document.querySelector(".tdg-row [class*='tdg-t']"),
    }));

    // open the bulk cohort
    await page.evaluate(() => {
      const r = [...document.querySelectorAll(".tdg-row")].find((x) =>
        /no record of what you sent/.test(x.textContent ?? ""));
      (r as HTMLElement | undefined)?.click();
    });
    await page.waitForTimeout(1600);
    const open = await page.evaluate(() => ({
      surface: !!document.querySelector(".prs-fills, .pj-rec"),
      scroll: Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
    }));
    await page.screenshot({ path: `run-artifacts/acceptance-${vp.width}.png` });

    out.push(`── ${vp.width}×${vp.height}
  grid present:            ${list.grid}
  zero-height boxes:       ${list.zeroBoxes}   (MUST be 0 — the flex min-height chain)\n  other pages mounted:     ${list.offscreenPages}   (kept mounted by the workspace, expected)
  full-page scroll, list:  ${list.scroll}px   (MUST be 0)
  materials surface opens: ${open.surface}
  full-page scroll, open:  ${open.scroll}px   (MUST be 0)`);
  }

  const dup = errs.filter((e) => DUP_KEY.test(e)).length;
  const other = errs.filter((e) => !DUP_KEY.test(e));
  out.push(`── console
  known duplicate-key warnings: ${dup}   (out of scope, counted not tolerated)
  ⚠️ OTHER errors:              ${other.length}   (MUST be 0)`);
  other.slice(0, 5).forEach((e) => out.push("   " + e.slice(0, 170)));

  const report = out.join("\n");
  writeFileSync("run-artifacts/materials-acceptance.txt", report);
  console.log("\n" + report + "\n");
});
