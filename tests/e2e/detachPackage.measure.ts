/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ F-O — the attach round trip, driven ═══════════════════════════════════════════════════════
 *
 * `detachPackage` was written and never mounted. This drives the whole loop on a real page: attach,
 * see the packaged strip, remove it from the same menu that attached it, see the send fall through
 * to the floating loose treatment, and — the part a unit test cannot reach — RELOAD and see it stay
 * gone.
 *
 * ⚠️ EVERY LOCATOR IS SCOPED TO `.qc-wpg`. Every workspace page stays mounted, so an unscoped
 * locator can resolve to a hidden page's zero-sized copy; that has already produced a probe which
 * passed while measuring nothing.
 *
 * ⚠️ AND THE PILL `×` IS `display: none` UNTIL ITS CHIP IS HOVERED. A click without a hover fails
 * with no box to aim at — which is exactly how an earlier run concluded the control was broken when
 * it works.
 */
import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { resolve } from "node:path";
import { writeFileSync } from "node:fs";

test.setTimeout(300_000);

const log: string[] = [];
const say = (s: string) => { log.push(s); console.log(s); };
const OUT = (f: string) => resolve(process.cwd(), "reports/detach", f);

/**
 * D5's surface: the three headline counts, replies-by-package, and requests-by-material.
 *
 * ⚠️ A REAL FUNCTION, NOT A SOURCE STRING. `page.evaluate` treats a string as an EXPRESSION, so
 * `evaluate("() => {…}")` evaluates to a function object, fails to serialise, and hands back
 * `undefined` — which then sailed through a `not.toBeNull()` precondition, because `undefined` is
 * not `null`. Two vacuous shapes stacked: a probe that measured nothing and a guard that let it.
 */
function readTracking() {
  const main = document.querySelector(".ws-main") as HTMLElement | null;
  if (!main) return null;
  const t = main.innerText.replace(/\s+/g, " ");
  /**
   * ⚠️ THE LAST NUMBER BEFORE THE LABEL, NOT THE LAST TOKEN. The dashboard renders
   * `7 → QUERIES SENT WITH A PACKAGE`, so "the token before the label" is the ARROW. The first
   * draft captured `→` for all three counts, and `toBeTruthy()` waved it through because an arrow
   * is truthy — so the before/after comparison compared three arrows with three arrows and passed
   * having measured none of the numbers it names.
   */
  const grab = (label: string) => {
    const i = t.indexOf(label);
    if (i < 0) return null;
    const nums = t.slice(Math.max(0, i - 24), i).match(/\d+/g);
    return nums && nums.length ? nums[nums.length - 1] : null;
  };
  const section = (from: string, to: string) => {
    const a = t.indexOf(from); if (a < 0) return null;
    const b = t.indexOf(to, a + 1);
    return t.slice(a, b < 0 ? t.length : b).trim();
  };
  return {
    sent: grab("QUERIES SENT WITH A PACKAGE"),
    replies: grab("REPLIES RECEIVED"),
    requests: grab("REQUESTS FOR MORE"),
    byPackage: section("REPLIES BY PACKAGE", "REQUESTS BY MATERIAL"),
    byMaterial: section("REQUESTS BY MATERIAL", "LATEST ACTIVITY"),
  };
}

async function tracking(page: import("@playwright/test").Page, label: string) {
  await openRoute(page, "/manuscripts/packages", { width: 1920, height: 1000 });
  await liftMotionSuppression(page);
  await page.waitForTimeout(1500);
  const t = await page.evaluate(readTracking);
  /* ⚠️ PRECONDITION, AND IT ASSERTS EVERY FIELD. `not.toBeNull()` is satisfied by `undefined`, and
     two undefined readings compare equal — which would make the whole D5 comparison pass having
     measured nothing at all. */
  expect(t, `${label}: no tracking dashboard on the page`).toBeTruthy();
  for (const k of ["sent", "replies", "requests"] as const) {
    // ⚠️ A NUMBER, not merely truthy — see the note on `grab`.
    expect(t![k], `${label}: "${k}" did not read as a number`).toMatch(/^\d+$/);
  }
  for (const k of ["byPackage", "byMaterial"] as const) {
    expect(t![k], `${label}: section "${k}" did not read`).toBeTruthy();
  }
  say(`\n── D5 ${label} ──`);
  say(`  sent ${t!.sent} · replies ${t!.replies} · requests ${t!.requests}`);
  say(`  ${t!.byPackage}`);
  say(`  ${t!.byMaterial}`);
  return t as Record<string, string>;
}

/** Open the query centre and select a query that carries NO package group. */
async function openCleanQuery(page: import("@playwright/test").Page) {
  await openRoute(page, "/queries", { width: 1920, height: 1000 });
  await liftMotionSuppression(page);
  await page.waitForTimeout(2000);
  const qc = page.locator(".qc-wpg");
  const rows = qc.locator(".f12-row");
  const n = await rows.count();
  expect(n, "no query rows — nothing to drive").toBeGreaterThan(0);
  for (let i = 0; i < Math.min(n, 12); i++) {
    await rows.nth(i).click();
    await page.waitForTimeout(650);
    const packed = await qc.locator(".qc-strip--packed").count();
    const canAttach = await qc.locator(".qc-mchip-add").count();
    if (!packed && canAttach) { say(`  clean query at row ${i}`); return { qc, index: i }; }
  }
  throw new Error("no query without a package group was found");
}

test("F-O — attach, detach from the same menu, and survive a reload", async ({ page }) => {
  const before = await tracking(page, "BEFORE");

  const { qc, index } = await openCleanQuery(page);
  const agent = (await qc.locator(".f12-row").nth(index).innerText()).split("\n")[1];
  say(`\n── round trip on: ${agent} ──`);

  // ── attach ──────────────────────────────────────────────────────────────
  await qc.locator(".qc-mchip-add").first().click();
  await page.waitForTimeout(500);
  await page.getByText(/Attach a submission package/i).first().click();
  await page.waitForTimeout(700);
  await page.locator("[role='dialog'] button, .pkgpick-row").filter({ hasNotText: /cancel|close|manage/i }).first().click();
  await page.waitForTimeout(1400);

  const packedAfterAttach = await qc.locator(".qc-strip--packed").count();
  const attachedName = packedAfterAttach ? await qc.locator(".qc-strip-name").first().innerText() : null;
  const attachedChips = await qc.locator(".qc-strip-items .qc-mchiptx").allTextContents();
  say(`  attached → packed strips ${packedAfterAttach}, name "${attachedName}", chips ${JSON.stringify(attachedChips)}`);
  expect(packedAfterAttach, "attach did not produce a packaged strip").toBe(1);
  await page.screenshot({ path: OUT("1-attached.png") });

  const during = await tracking(page, "WITH THE SNAPSHOT ATTACHED");

  // ── detach, from the SAME menu that attached (D1) ───────────────────────
  await openRoute(page, "/queries", { width: 1920, height: 1000 });
  await liftMotionSuppression(page);
  await page.waitForTimeout(1800);
  await qc.locator(".f12-row").nth(index).click();
  await page.waitForTimeout(900);

  await qc.locator(".qc-mchip-add").first().click();
  await page.waitForTimeout(500);
  const removeRow = page.getByText(new RegExp(`Remove ${attachedName}`, "i")).first();
  const hasRemove = await removeRow.count();
  say(`  "Remove ${attachedName}" offered in the attach menu: ${hasRemove}`);
  expect(hasRemove, "the attach menu offers no removal — F-O is not fixed").toBeGreaterThan(0);
  await page.screenshot({ path: OUT("2-menu.png") });

  await removeRow.click();
  await page.waitForTimeout(1400);

  const toast = await page.locator(".sa-toast").first().innerText().catch(() => "");
  say(`  toast: ${JSON.stringify(toast.replace(/\s+/g, " ").trim())}`);
  expect(toast, "no toast, so no undo was offered").toMatch(/Removed/i);
  expect(toast, "the undo control is missing").toMatch(/UNDO/i);

  const afterDetach = await qc.evaluate((r) => ({
    packed: r.querySelectorAll(".qc-strip--packed").length,
    loose: r.querySelectorAll(".qc-loose").length,
    looseChips: [...r.querySelectorAll(".qc-loose .qc-mchiptx")].map((e) => e.textContent),
  }));
  say(`  after detach → packed ${afterDetach.packed}, loose rows ${afterDetach.loose}, chips ${JSON.stringify(afterDetach.looseChips)}`);
  expect(afterDetach.packed, "the packaged strip survived the removal").toBe(0);
  // D4 — the send falls through to the FLOATING treatment, not an empty container.
  expect(afterDetach.loose, "no floating loose row after detach (D4)").toBe(1);
  await page.screenshot({ path: OUT("3-detached.png") });

  // ── the part a unit test cannot reach: a full reload ────────────────────
  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(2600);
  await qc.locator(".f12-row").nth(index).click();
  await page.waitForTimeout(1200);
  const afterReload = await qc.evaluate((r) => ({
    packed: r.querySelectorAll(".qc-strip--packed").length,
    loose: r.querySelectorAll(".qc-loose").length,
    looseChips: [...r.querySelectorAll(".qc-loose .qc-mchiptx")].map((e) => e.textContent),
  }));
  say(`  after RELOAD → packed ${afterReload.packed}, loose rows ${afterReload.loose}, chips ${JSON.stringify(afterReload.looseChips)}`);
  expect(afterReload.packed, "the removal did not persist through a reload").toBe(0);
  expect(afterReload.loose, "the loose row did not survive the reload").toBe(1);
  await page.screenshot({ path: OUT("4-reloaded.png") });

  const after = await tracking(page, "AFTER");

  say(`\n── D5 verdict ──`);
  say(`  sent      ${before.sent} → ${during.sent} → ${after.sent}`);
  say(`  replies   ${before.replies} → ${during.replies} → ${after.replies}`);
  say(`  requests  ${before.requests} → ${during.requests} → ${after.requests}`);
  say(`  byPackage before === after: ${before.byPackage === after.byPackage}`);
  say(`  byMaterial before === after: ${before.byMaterial === after.byMaterial}`);
  /**
   * ⚠️ THE FIGURES MUST RETURN TO WHERE THEY STARTED. They are derived at read time, so a detach
   * cannot leave a stale count behind — and this is what proves it rather than asserting it.
   */
  expect(after.sent).toBe(before.sent);
  expect(after.replies).toBe(before.replies);
  expect(after.requests).toBe(before.requests);
  expect(after.byPackage).toBe(before.byPackage);
  expect(after.byMaterial).toBe(before.byMaterial);
});

test.afterAll(() => {
  writeFileSync(resolve(process.cwd(), "reports/detach/measure.txt"), log.join("\n") + "\n");
});
