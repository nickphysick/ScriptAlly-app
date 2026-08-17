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

/**
 * ⚠️ THE ROW, NEVER `document.activeElement` — the vacuous shape this file has to avoid. If a click
 * ever stopped focusing the row, `activeElement` would be `body`, and "no outline, no ring" would
 * pass about the wrong element entirely.
 */
const ringOf = (page: Page, n: number) => page.locator(".f12-row").nth(n).evaluate((el) => {
  const c = getComputedStyle(el);
  return {
    fv: (() => { try { return el.matches(":focus-visible"); } catch { return null; } })(),
    focused: document.activeElement === el,
    outline: `${c.outlineStyle} ${c.outlineWidth} ${c.outlineColor}`,
    shadow: c.boxShadow,
    border: `${c.borderTopStyle} ${c.borderTopWidth} ${c.borderTopColor}`,
  };
});

/** The page's one focus ring, read from the token rather than restated as a hex. */
const ringColour = (page: Page) => page.evaluate(() => {
  const root = document.querySelector(".f12-root") ?? document.documentElement;
  const raw = getComputedStyle(root).getPropertyValue("--qc-ring").trim();
  const probe = document.createElement("span");
  probe.style.color = raw; document.body.appendChild(probe);
  const rgb = getComputedStyle(probe).color; probe.remove();
  return { raw, rgb };
});

/**
 * ⚠️ THE ROW DRAWS NO RING AT ALL — the third and final answer. Selection follows focus, so the
 * focused row is always the selected row and the fill already says where the cursor is. What this
 * has to prove is that the ring is GONE rather than quieter, that the SHELL's ring did not take
 * its place, that buttons still have one, and that the fill is visible enough to carry the job on
 * its own.
 */
test("§2 — a keyboard row and a clicked row are identical, and neither wears a ring", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });

  await page.locator(".f12-row").nth(3).click({ timeout: 4000 });
  await page.waitForTimeout(300);
  const clicked = await ringOf(page, 3);
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(300);
  const kbd = await ringOf(page, 4);
  console.log(`clicked:  fv=${clicked.fv} outline="${clicked.outline}" shadow="${clicked.shadow}" border="${clicked.border}"`);
  console.log(`keyboard: fv=${kbd.fv} outline="${kbd.outline}" shadow="${kbd.shadow}" border="${kbd.border}"`);

  expect(clicked.focused, "the click did not focus the row — the reading would be about nothing").toBe(true);
  expect(kbd.fv, "the keyboard row does not match :focus-visible, so this proves nothing").toBe(true);
  for (const [what, r] of [["clicked", clicked], ["keyboard", kbd]] as const) {
    expect(r.outline, `the ${what} row draws an outline: ${r.outline}`).toContain("none");
    expect(r.shadow, `the ${what} row draws a ring: ${r.shadow}`).toBe("none");
    expect(r.border, `the ${what} row draws a border: ${r.border}`).toContain("0px");
  }
  /* ⚠️ IDENTICAL, NOT MERELY BOTH RINGLESS — the section's actual claim. */
  expect(kbd.outline).toBe(clicked.outline);
  expect(kbd.shadow).toBe(clicked.shadow);

  /* ── the highlight is now the only cursor, so it has to be seen ── */
  const contrast = await page.evaluate(() => {
    const rows = [...document.querySelectorAll<HTMLElement>(".f12-row")];
    const sel = rows.find((r) => r.classList.contains("f12-sel"));
    const other = rows.find((r) => !r.classList.contains("f12-sel"));
    if (!sel || !other) return null;
    /* the painted ground, walking up past any transparent ancestor */
    const ground = (el: HTMLElement | null): string => {
      while (el) {
        const b = getComputedStyle(el).backgroundColor;
        if (b && b !== "rgba(0, 0, 0, 0)" && b !== "transparent") return b;
        el = el.parentElement;
      }
      return "rgb(255, 255, 255)";
    };
    const lum = (c: string) => {
      const [r, g, b] = c.match(/\d+(\.\d+)?/g)!.slice(0, 3).map(Number).map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const a = ground(sel), b = ground(other);
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return { selected: a, unselected: b, ratio: Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100 };
  });
  console.log(`selection fill ${contrast?.selected} against ${contrast?.unselected} → ${contrast?.ratio}:1`);
  expect(contrast, "no selected row to measure").not.toBeNull();
  /**
   * ⚠️ THE 3:1 NON-TEXT BAR (WCAG 1.4.11) IS NOT MET, AND THAT IS STATED RATHER THAN ASSERTED AWAY.
   * Reaching it from white needs roughly #949494 — a mid grey behind every selected row, which is a
   * different page from the one this is. What is asserted instead is what the design commits to:
   * the fill was DEEPENED and must stay deepened (1.26:1 → 1.51:1, `--n3` → `--n5`), and the state
   * carries more than one signal, so the fill is not doing this alone.
   *
   * ⚠️ A FLOOR SET TO WHATEVER WAS JUST MEASURED WOULD ASSERT NOTHING. 1.4 is the previous value
   * rounded UP — it fails if anyone puts the old `--n3` step back, which is the regression this
   * guards, and it is honest about not being the accessibility bar.
   */
  expect(contrast!.ratio, `the selection fill fell back to the old faint step: ${contrast!.ratio}:1`).toBeGreaterThan(1.4);
  expect(contrast!.selected, "the selected row has no fill at all").not.toBe(contrast!.unselected);

  const signals = await page.evaluate(() => {
    const rows = [...document.querySelectorAll<HTMLElement>(".f12-row")];
    const sel = rows.find((r) => r.classList.contains("f12-sel"))!;
    const other = rows.find((r) => !r.classList.contains("f12-sel"))!;
    const read = (r: HTMLElement) => ({
      name: getComputedStyle(r.querySelector(".f12-nm") as HTMLElement).color,
      avatar: getComputedStyle(r.querySelector(".f12-av") as HTMLElement).backgroundColor,
    });
    return { sel: read(sel), other: read(other) };
  });
  console.log(`  name ${signals.other.name} → ${signals.sel.name} · avatar ${signals.other.avatar} → ${signals.sel.avatar}`);
  /**
   * ⚠️ THE FILL IS NOT THE ONLY SIGNAL — the argument for accepting 1.51:1, asserted rather than
   * asserted-about: the monogram inverts from the tinted step to white.
   *
   * ⚠️ AND THE NAME IS NOT A SECOND SIGNAL, WHICH THIS RUN CORRECTED. `.f12-sel .f12-nm { color:
   * var(--ink) }` restates the colour the base row already has — measured rgb(20,20,18) in BOTH
   * states — so it is a guard against drifting muted, not a change. Claiming it as a distinguishing
   * signal would have been a false sentence in a report about accessibility.
   */
  expect(signals.sel.avatar, "the selected row's monogram no longer inverts — the fill is alone").not.toBe(signals.other.avatar);
  expect(signals.sel.name, "the name became a selection signal — the reasoning above needs revisiting").toBe(signals.other.name);
});

test("§2 — buttons keep the page's focus ring", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.locator(".f12-row").first().click({ timeout: 4000 });
  await page.waitForTimeout(300);

  /* ⚠️ REACHED BY TAB, NOT BY `.focus()`. Chromium grants `:focus-visible` on a programmatic focus
     only when the last interaction was a keyboard one — after a click it does not, so a `.focus()`
     here measured a button that had been given focus and no ring, and reported the ring missing. */
  let found: any = null;
  for (let i = 0; i < 14 && !found; i++) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(90);
    found = await page.evaluate(() => {
      const a = document.activeElement as HTMLElement | null;
      if (!a || a.tagName !== "BUTTON" || !a.closest(".qc-wpg")) return null;
      const c = getComputedStyle(a);
      let fv: boolean | null = null;
      try { fv = a.matches(":focus-visible"); } catch { fv = null; }
      return { label: (a.textContent || "").trim().slice(0, 24), cls: String(a.className).slice(0, 40), fv, outline: `${c.outlineStyle} ${c.outlineWidth} ${c.outlineColor}` };
    });
  }
  console.log(`tabbed to "${found?.label}" (${found?.cls}): fv=${found?.fv} outline="${found?.outline}"`);
  expect(found, "Tab never reached a button on the page").not.toBeNull();
  expect(found.fv, "the button is not focus-visible, so its ring was never asked for").toBe(true);
  expect(found.outline, "the page's controls lost their focus ring with the row's").not.toContain("none");
  expect(found.outline, "the button's ring is not the page's sage").toContain("126, 145, 120");
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
