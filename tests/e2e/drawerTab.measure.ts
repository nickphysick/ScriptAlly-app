/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE SPINE TAB, ACROSS EVERY DRAWER (Part 1, D3) ═══════════════════════════════════════════
 *
 * ⚠️ THE POINT IS THE TWO THAT ALREADY FITTED. Changing `height` to `minHeight` on a shared
 * primitive is only safe if the consumers that were already correct render identically — and
 * "minHeight ≥ height so nothing moves" is an assumption about a flex box holding vertical text,
 * not a fact. Measured on all four rather than asserted on two.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

/** The tab is the absolutely-positioned box at the panel's left edge, holding vertical mono text. */
const readTab = (page: import("@playwright/test").Page) =>
  page.evaluate(() => {
    const span = [...document.querySelectorAll("span")].find(
      (s) => getComputedStyle(s).writingMode.startsWith("vertical"),
    );
    if (!span) return null;
    const box = span.parentElement!;
    const b = box.getBoundingClientRect();
    const t = span.getBoundingClientRect();
    return {
      label: span.textContent ?? "",
      boxH: Math.round(b.height * 10) / 10,
      inkH: Math.round(t.height * 10) / 10,
      /* ⚠️ CLIPPED IS INK TALLER THAN ITS BOX — the box has no overflow rule, so a long label
         simply runs past it. This is the reading, not a look. */
      clipped: t.height > b.height + 1,
      minHeight: getComputedStyle(box).minHeight,
    };
  });

test("every drawer's spine tab holds its whole label", async ({ page }) => {
  const seen: Record<string, unknown>[] = [];

  /* 1 — the packages explainer, and 2 — the package drawer */
  await openRoute(page, "/manuscripts/packages", { width: 1440, height: 1200 });
  await page.waitForTimeout(900);
  const how = page.getByRole("button", { name: /how it works/i }).first();
  if (await how.isVisible().catch(() => false)) {
    await how.click();
    await page.waitForTimeout(700);
    seen.push({ drawer: "how it works", ...(await readTab(page)) });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(700);
  }
  await page.locator(".pkgb-pkgcard .pkgb-sopen").first().click();
  await page.waitForTimeout(700);
  seen.push({ drawer: "package", ...(await readTab(page)) });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(700);

  /* 3 — the agent drawer, which passes NO label and gets the default. The control that opens it
         differs by page state, so it is found by role rather than by a class guess. */
  await openRoute(page, "/agents", { width: 1440, height: 1200 });
  await page.waitForTimeout(1000);
  const edit = page.getByRole("button", { name: /edit profile|edit agent/i }).first();
  if (await edit.isVisible().catch(() => false)) {
    await edit.click();
    await page.waitForTimeout(800);
    seen.push({ drawer: "agent (default label)", ...(await readTab(page)) });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(600);
  }

  console.log(JSON.stringify(seen, null, 2));

  /* the population floor — a sweep that opened nothing passes having measured nothing */
  expect(seen.length, "no drawer was opened").toBeGreaterThan(1);
  for (const s of seen as Record<string, string | number | boolean>[]) {
    expect(s.label, `${s.drawer} has no tab label`).toBeTruthy();
    expect(s.clipped, `${s.drawer}'s tab clips "${s.label}"`).toBe(false);
    /* and the label is a MODE, not a sentence — short enough to read at 24px wide */
    expect(String(s.label).length, `${s.drawer}'s label is a sentence`).toBeLessThanOrEqual(16);
  }
});
