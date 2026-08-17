/**
 * §3 — the list's keyboard cursor, driven on the running page.
 *
 * ⚠️ THIS IS A DEFECT IN §4 OF `qc-pairing-toolbar-keyboard.md`, WHICH RAN (`17fe055`). That
 * section's own browser case walked Down through the list and asserted selection followed focus —
 * and it passed, because it never CLICKED between keystrokes. The stale cursor needs the two input
 * modes interleaved, which is exactly the sequence a writer produces and a sweep does not.
 *
 *   SA_E2E_BASE_URL=http://localhost:3000 npx playwright test --project=measure qcCursor
 */
import { test, expect, Page } from "@playwright/test";
import { openRoute } from "./measure";

const at = (page: Page) => page.evaluate(() => {
  const rows = [...document.querySelectorAll(".f12-row")] as HTMLElement[];
  const a = document.activeElement as HTMLElement;
  const m = (q: string) => { try { return !!a?.matches(q); } catch { return false; } };
  const cs = a ? getComputedStyle(a) : null;
  return {
    focus: rows.indexOf(a), sel: rows.findIndex((r) => r.classList.contains("f12-sel")),
    tabStops: rows.filter((r) => r.tabIndex === 0).map((r) => rows.indexOf(r)),
    fv: m(":focus-visible"), outline: `${cs?.outlineStyle} ${cs?.outlineWidth}`, shadow: cs?.boxShadow ?? "",
  };
});

test("§3b — the cursor follows the click, with the keyboard used first", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.locator(".f12-row").first().click({ timeout: 4000 });
  await page.waitForTimeout(250);

  /* use the keyboard, so any stored cursor is set and can go stale */
  for (let i = 0; i < 7; i++) { await page.keyboard.press("ArrowDown"); await page.waitForTimeout(60); }
  const kbd = await at(page);
  console.log(`after 7×Down: focus ${kbd.focus} sel ${kbd.sel} tabStops ${kbd.tabStops}`);
  expect(kbd.focus, "the arrows did not move focus").toBe(7);
  expect(kbd.sel, "selection did not follow focus").toBe(kbd.focus);

  /* ⚠️ THE FAILING SEQUENCE. Measured before the fix: click row 2, press Down, land on row EIGHT. */
  await page.locator(".f12-row").nth(2).click({ timeout: 4000 });
  await page.waitForTimeout(250);
  const clicked = await at(page);
  console.log(`click row2: focus ${clicked.focus} sel ${clicked.sel} tabStops ${clicked.tabStops}`);
  expect(clicked.sel, "the click did not select").toBe(2);
  /* ⚠️ THE TAB STOP IS THE CURSOR MADE VISIBLE — if it is still on row 7 the two have diverged */
  expect(clicked.tabStops, `the cursor is not on the clicked row: stops at ${clicked.tabStops}`).toEqual([2]);

  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(200);
  const after = await at(page);
  console.log(`then Down: focus ${after.focus} sel ${after.sel}`);
  expect(after.focus, `Down from row 2 landed on row ${after.focus}`).toBe(3);
  expect(after.sel, "selection did not follow").toBe(3);

  /* the same again from a different row, so one pass is not a coincidence */
  await page.locator(".f12-row").nth(5).click({ timeout: 4000 });
  await page.waitForTimeout(250);
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(200);
  const second = await at(page);
  console.log(`click row5 then Down: focus ${second.focus}`);
  expect(second.focus, `Down from row 5 landed on row ${second.focus}`).toBe(6);
});

test("§3a — a click leaves no ring; the keyboard shows the page's own", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.locator(".f12-row").nth(3).click({ timeout: 4000 });
  await page.waitForTimeout(300);
  const clicked = await at(page);
  console.log(`clicked: fv=${clicked.fv} outline="${clicked.outline}" shadow="${clicked.shadow}"`);
  expect(clicked.fv, "a clicked row matches :focus-visible").toBe(false);
  expect(clicked.outline, "a clicked row draws an outline").toContain("none");
  expect(clicked.shadow, "a clicked row draws a ring").toBe("none");

  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(250);
  const kbd = await at(page);
  console.log(`keyboard: fv=${kbd.fv} outline="${kbd.outline}" shadow="${kbd.shadow}"`);
  expect(kbd.fv, "a keyboard-focused row draws no ring").toBe(true);
  /* ⚠️ THE PAGE'S OWN TREATMENT, NOT THE SHARED BLACK OUTLINE. `.t-f12 button:focus-visible` is a
     2px `--ink` outline — right for a small control, a hard dark rectangle around a 60px row. */
  expect(kbd.outline, "the row still wears the shared black outline").toContain("none");
  expect(kbd.shadow, "the row has no ring of its own").not.toBe("none");
  expect(kbd.shadow, "the ring is not the page's burgundy halo").toContain("124, 58, 42");
});

test("§3 — Up/Down cross groups, and a filter leaves the cursor on a survivor", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.locator(".f12-row").first().click({ timeout: 4000 });
  await page.waitForTimeout(250);
  const groups: (string | null)[] = [];
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(55);
    groups.push(await page.evaluate(() => (document.activeElement as HTMLElement)?.closest('[role="group"]')?.getAttribute("aria-label") ?? null));
  }
  const crossings = groups.filter((g, i) => i > 0 && g !== groups[i - 1]).length;
  console.log(`walk: ${[...new Set(groups)].join(" → ")} · crossings=${crossings}`);
  expect(groups.every(Boolean), "focus landed outside a group — a heading is a stop").toBe(true);
  expect(crossings, "Down never crossed a group boundary").toBeGreaterThan(0);

  /* narrow the list under the cursor */
  const keep = await page.evaluate(() => ((document.querySelector(".f12-row .f12-nm")?.textContent) ?? "").trim().slice(0, 4));
  await page.locator('input[aria-label="Search queries"]').fill(keep);
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => {
    const rows = [...document.querySelectorAll(".f12-row")] as HTMLElement[];
    return { n: rows.length, stops: rows.filter((r) => r.tabIndex === 0).length, sel: rows.findIndex((r) => r.classList.contains("f12-sel")) };
  });
  console.log(`after filtering: ${after.n} rows, ${after.stops} tab stop, selected ${after.sel}`);
  expect(after.stops, "no row is reachable — the next Tab would restart at the page's first control").toBe(1);
  expect(after.sel, "the cursor reset instead of landing on a survivor").toBeGreaterThanOrEqual(0);
});
