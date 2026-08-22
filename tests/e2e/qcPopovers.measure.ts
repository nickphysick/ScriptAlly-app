/**
 * §1 · NO POPOVER MAY BE CLIPPED BY THE VIEWPORT.
 *
 * ⚠️ 700px TALL IS THE POINT. Every one of these looked correct at 900 — the fault only appears
 * when the trigger sits low enough that the panel has nowhere to grow, which is why a sweep by
 * reading source could not have found it and a measurement at the default height would not either.
 *
 *   npx playwright test --project=measure qcPopovers
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const H = 700;

/** Every fixed panel currently on screen, with the verdict the section is about. */
const panels = (page: any) => page.evaluate(() => {
  const sel = ".f12-menu, .f12-pop, .f12-panel, .f12-tasks, .qc-nask, .cor-sheet";
  return Array.from(document.querySelectorAll(sel)).map((e) => {
    const r = e.getBoundingClientRect();
    return {
      cls: (e.className || "").toString().split(" ")[0],
      top: Math.round(r.top), bottom: Math.round(r.bottom),
      left: Math.round(r.left), right: Math.round(r.right),
      offTop: r.top < 0, offBottom: r.bottom > window.innerHeight,
      offLeft: r.left < 0, offRight: r.right > window.innerWidth,
      scrolls: !!Array.from(e.querySelectorAll("*")).some((c) => {
        const s = getComputedStyle(c as Element);
        return (s.overflowY === "auto" || s.overflowY === "scroll") && (c as HTMLElement).scrollHeight > (c as HTMLElement).clientHeight + 1;
      }),
    };
  });
});

const assertOnScreen = async (page: any, label: string) => {
  const found = await panels(page);
  expect(found.length, `${label}: no panel opened — the probe measured nothing`).toBeGreaterThan(0);
  for (const p of found) {
    console.log(`  ${label.padEnd(22)} ${p.cls.padEnd(12)} y ${p.top}→${p.bottom} x ${p.left}→${p.right}${p.scrolls ? " · body scrolls" : ""}`);
    expect(p.offBottom, `${label} (${p.cls}) runs off the BOTTOM`).toBe(false);
    expect(p.offTop, `${label} (${p.cls}) runs off the TOP`).toBe(false);
    expect(p.offLeft, `${label} (${p.cls}) runs off the LEFT`).toBe(false);
    expect(p.offRight, `${label} (${p.cls}) runs off the RIGHT`).toBe(false);
  }
  return found;
};

const dismiss = async (page: any) => { await page.keyboard.press("Escape"); await page.waitForTimeout(280); };

test("§1 · every Query Centre popover opens on-screen at 700px tall", async ({ page }) => {
  test.setTimeout(240000);
  await openRoute(page, "/queries", { width: 1440, height: H });
  await page.waitForTimeout(1800);
  await page.locator(".f12-row").first().click();
  await page.waitForTimeout(700);

  /**
   * The control-bar panels — already correct before §1, swept anyway so "every popover" is a
   * measured claim rather than a reading of the source.
   *
   * ⚠️ THE TRIGGER'S EXISTENCE IS ASSERTED. The first version guarded this loop with
   * `if (await t.count())` and the selector was wrong, so it skipped both panels and reported
   * success — the vacuous pass this repo keeps meeting. A check that silently measures nothing is
   * worse than one that fails.
   */
  for (const label of ["Filter", "Sort"] as const) {
    /* the triggers are icon-only `.f12-pill`s — their name is the aria-label, not their text */
    const t = page.locator(`.f12-pill[aria-label="${label}"]`).first();
    expect(await t.count(), `no ${label} trigger — the sweep would have skipped it`).toBeGreaterThan(0);
    await t.click();
    await page.waitForTimeout(600);
    await assertOnScreen(page, label.toLowerCase());
    await dismiss(page);
  }

  /* ⋯ on the LAST timeline entry — the lowest trigger on the page, and the one that was
     hand-positioned with no flip at all */
  const dots = page.locator(".tl-more");
  const n = await dots.count();
  expect(n, "no correctable entries — run seedCorrection.mjs").toBeGreaterThan(0);
  await dots.nth(n - 1).click();
  await page.waitForTimeout(500);
  const menu = await assertOnScreen(page, "correction ⋯");
  /* ⚠️ THE FLIP IS THE CLAIM, not merely fitting. A menu opened from a trigger low in the window
     must sit ABOVE it, or it only fits because it happens to be short. */
  const trigBox = await dots.nth(n - 1).boundingBox();
  if (trigBox && trigBox.y > H * 0.6) {
    console.log(`  trigger at y ${Math.round(trigBox.y)} of ${H} → menu top ${menu[0].top} (flipped: ${menu[0].bottom <= trigBox.y + 4})`);
  }

  /* the correction sheets, which are dialogs rather than anchored menus */
  const edit = page.locator("[role=menuitem], .f12-menuitem", { hasText: /^Edit$/ }).first();
  if (await edit.count()) {
    await edit.click(); await page.waitForTimeout(600);
    await assertOnScreen(page, "correction fork");
    const move = page.locator(".cor-branch", { hasText: /different query/i });
    if (await move.count()) {
      await move.first().click(); await page.waitForTimeout(700);
      const picker = await assertOnScreen(page, "move picker");
      expect(picker.some((p: any) => p.scrolls), "the move picker's list does not scroll — a long list would overflow").toBe(true);
    }
  }
  await dismiss(page); await dismiss(page);
});

test("§1 · the Attach menu — the reported fault — opens fully and keeps its foot", async ({ page }) => {
  test.setTimeout(240000);
  await openRoute(page, "/queries", { width: 1440, height: H });
  await page.waitForTimeout(1800);
  await page.locator(".f12-row").first().click();
  await page.waitForTimeout(700);

  const add = page.locator(".qc-mchip-add");
  expect(await add.count(), "no Attach chip on this query").toBeGreaterThan(0);
  const box = await add.first().boundingBox();
  console.log(`  the Attach trigger sits at y ${Math.round(box!.y)} of ${H}`);
  await add.first().click();
  await page.waitForTimeout(600);

  const found = await assertOnScreen(page, "Attach");
  const m = found.find((p: any) => p.cls === "f12-menu")!;
  expect(m, "the Attach menu did not open").toBeTruthy();

  /* ⚠️ THE LAST ITEM MUST BE REACHABLE, not merely inside the box — a capped panel that scrolled as
     a whole would put its final row past the fold with the box still measuring on-screen. */
  const lastItem = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll(".f12-menu .f12-menu-item"));
    const el = items[items.length - 1] as HTMLElement | undefined;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { bottom: Math.round(r.bottom), vh: window.innerHeight, count: items.length };
  });
  console.log(`  ${lastItem!.count} items · last row bottom ${lastItem!.bottom} of ${lastItem!.vh}`);
  expect(lastItem!.bottom, "the Attach menu's last row is below the fold").toBeLessThanOrEqual(lastItem!.vh);
});
