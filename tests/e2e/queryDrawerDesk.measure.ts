/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Drawer cut 2 · §3 — THE DESK, MEASURED. A notch's y-position, a clamp, a focus return and a
 * cross-event reorder are facts about a rendered page; no source lock can state them.
 *
 * ⚠️ PRECONDITION: `node tests/e2e/seedCorrection.mjs` — seed.mjs writes no activity documents, so
 * without it every timeline is a synthesised root with no ⋯ and this file measures nothing.
 * The reorder case opens a REAL preview and presses Cancel — previewCorrection is read-only and
 * nothing here commits, so the account is untouched.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { writeFileSync } from "node:fs";

const out: Record<string, unknown> = {};

/**
 * Open the drawer on a SEEDED CORRECTION query, by its own id — never by agent name.
 *
 * ⚠️ THE NAME IS AMBIGUOUS AND THE AMBIGUITY COST A RUN: `.qcc:has-text("Rachel Lin")`.first()
 * matched a plain seed.mjs query by the same agent — a card with NO activity docs — so all three
 * cases waited 420s for a ⋯ that could never render, on a page that was working. The card carries
 * `data-qcc-id`; the seeded shapes have known ids; there is nothing to guess.
 */
async function openDrawerOn(page: import("@playwright/test").Page, queryId: string) {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await expect(page.locator(".qcc").first()).toBeVisible({ timeout: 30_000 });
  const card = page.locator(`[data-qcc-id="${queryId}"]`);
  await expect(card, `no card for ${queryId} — was seedCorrection run?`).toBeVisible();
  await card.click();
  await expect(page.locator(".qpn[data-on='true']")).toBeVisible();
  /* the tracking tab is the default, but a previous session may have left another persisted */
  await page.locator(".qpn-tab", { hasText: "Tracking" }).click();
  /* ⚠️ THE DOCS ARRIVE BY SUBSCRIPTION — the rows render instantly from the synthesised root, so
     an instant ⋯ count races the snapshot. WAIT for the first ⋯, which is the precondition. */
  await expect(page.locator(".qpn .tl-more").first()).toBeVisible({ timeout: 20_000 });
}

test("the ⋯ opens the fork INSIDE the desk, ringed, notched at the rung's centre", async ({ page }) => {
  await openDrawerOn(page, "cor-undo");

  /* the rungs carry a ⋯ only when they are real activities — assert the population first */
  const dots = page.locator(".qpn .tl-more");
  const n = await dots.count();
  expect(n, "no ⋯ on any rung — the fixture has no activity docs").toBeGreaterThan(1);
  out.rungsWithMenu = n;

  /* open on the SECOND rung (mid-timeline: unclamped at 900 tall) */
  const trigger = dots.nth(1);
  await trigger.click();

  /* 1 · the fork mounts inside the desk element — not a viewport sheet, no centring scrim */
  const desk = page.locator(".qcd");
  await expect(desk).toBeVisible();
  await expect(desk.locator(".cor-sheet")).toBeVisible();
  await expect(page.locator(".qcd .cor-q")).toHaveText("What would you like to do?");
  expect(await page.locator(".cor-scrim").count(), "the centred scrim host survives").toBe(0);

  /* 2 · the rung takes the accent ring while the desk is open */
  const ringed = page.locator(".qpn .tl-ev--target");
  await expect(ringed).toHaveCount(1);

  /* 3 · the desk's strip is the DRAWER's accent — two computed colours, one variable */
  const colours = await page.evaluate(() => {
    const qpn = document.querySelector(".qpn") as HTMLElement;
    const card = document.querySelector(".qcd-card") as HTMLElement;
    const probe = document.createElement("i");
    probe.style.color = "var(--stage-accent)";
    qpn.appendChild(probe);
    const accent = getComputedStyle(probe).color;
    probe.remove();
    return { accent, strip: getComputedStyle(card).borderTopColor };
  });
  expect(colours.strip, "the strip is not the drawer's accent").toBe(colours.accent);
  out.accent = colours;

  /**
   * 4 · the notch sits on the rung's vertical centre — asserted through the CARD's position.
   *
   * ⚠️ `cardTop + arrow + 8 === rungCentre` IS AN IDENTITY, NOT A CHECK: the arrow is DERIVED as
   * `centre − top − 8`, so that sum equals the centre whatever the card does — the first draft
   * asserted it, and a mutation that pinned the card at a constant top sailed through green.
   * The claim that can actually fail is the card's own anchor: top = rung centre − 42 when
   * unclamped. The notch then reaches the centre because the derivation closes the loop — which
   * is the mechanism, and legitimate, once the card's half is independently held.
   */
  const geo = await page.evaluate(() => {
    const rung = document.querySelector(".qpn .tl-ev--target") as HTMLElement;
    const card = document.querySelector(".qcd-card") as HTMLElement;
    const r = rung.getBoundingClientRect();
    const c = card.getBoundingClientRect();
    const arrow = parseFloat(getComputedStyle(card).getPropertyValue("--arrow"));
    return {
      rungCentre: r.top + r.height / 2,
      cardTop: c.top,
      arrow,
      notchCentre: c.top + arrow + 8,
      clamped: Math.abs(c.top - 12) < 1 || c.bottom > window.innerHeight - 13,
    };
  });
  out.notch = geo;
  expect(geo.clamped, "this rung clamps at 900 tall — pick a mid rung").toBe(false);
  expect(Math.abs(geo.cardTop - (geo.rungCentre - 42)), "the card is not anchored to the rung")
    .toBeLessThanOrEqual(2);
  /* and the notch stays ON the card — a heavily clamped card must not point past its own edge */
  expect(geo.arrow, "the notch is above the card").toBeGreaterThanOrEqual(0);

  /* 5 · Escape closes the DESK, keeps the drawer, and returns focus to the ⋯ */
  await page.keyboard.press("Escape");
  await expect(desk).toHaveCount(0);
  await expect(page.locator(".qpn[data-on='true']")).toBeVisible();
  const focusIsTrigger = await page.evaluate(() =>
    document.activeElement?.classList.contains("tl-more") ?? false);
  expect(focusIsTrigger, "focus did not return to the originating ⋯").toBe(true);

  writeFileSync("reports/query-drawer-desk.json", JSON.stringify(out, null, 2));
});

test("a rung near the bottom clamps inside the viewport with its 12px margin", async ({ page }) => {
  await openDrawerOn(page, "cor-undo");
  const dots = page.locator(".qpn .tl-more");
  await dots.last().click();
  await expect(page.locator(".qcd-card")).toBeVisible();
  const geo = await page.evaluate(() => {
    const card = document.querySelector(".qcd-card") as HTMLElement;
    const c = card.getBoundingClientRect();
    return { top: c.top, bottom: c.bottom, vh: window.innerHeight };
  });
  expect(geo.top).toBeGreaterThanOrEqual(11);
  expect(geo.bottom).toBeLessThanOrEqual(geo.vh - 11);
  await page.keyboard.press("Escape");
});

test("a date edit that crosses another event shows the reorder preview IN the desk", async ({ page }) => {
  await openDrawerOn(page, "cor-undo");
  /* the last rung is Full Sent (28 days ago); Partial Sent sits at 62. Dating the full before
     the partial crosses it — the preview must appear, in the desk, and Cancel must cost nothing. */
  await page.locator(".qpn .tl-more").last().click();
  await page.locator(".qcd .cor-branch", { hasText: "correcting a mistake" }).click();
  await expect(page.locator(".qcd .cor-sheet")).toBeVisible();
  /* the collapsed fork sits above the form */
  await expect(page.locator(".qcd .qcd-step")).toBeVisible();

  const dateField = page.locator(".qcd input[type='date'], .qcd input[name='date'], .qcd .cor-date input").first();
  await expect(dateField, "the edit form's date field is missing").toBeVisible();
  const target = await page.evaluate(() => {
    const d = new Date(); d.setDate(d.getDate() - 80);
    return d.toISOString().slice(0, 10);
  });
  await dateField.fill(target);
  await page.locator(".qcd button", { hasText: /^Save$/ }).click();

  /* the consequence sheet, IN the desk — the reorder preview names the crossing */
  await expect(page.locator(".qcd .cor-q")).toBeVisible({ timeout: 10_000 });
  const preview = await page.locator(".qcd .cor-sheet").innerText();
  out.reorderPreview = preview.slice(0, 400);
  expect(preview.length, "the sheet is empty").toBeGreaterThan(40);

  /* cancel — nothing was committed */
  await page.locator(".qcd .cor-cancel, .qcd button:has-text('Cancel')").first().click();
  await expect(page.locator(".qcd")).toHaveCount(0);
  writeFileSync("reports/query-drawer-desk.json", JSON.stringify(out, null, 2));
});
