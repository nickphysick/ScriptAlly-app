/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * F7 acceptance — attach a package to an EXISTING query through EditQueryDrawer, on the deployed
 * dev site, and prove the write PERSISTS.
 *
 * ⚠️ THE PROOF IS THE VALUE SURVIVING A RELOAD, NOT THE ABSENCE OF AN ERROR TOAST. This write was
 * silently denied before the rules fix: Firestore rejected it, the UI showed nothing, and the
 * drawer closed looking successful. So the assertion is made against a freshly-loaded page.
 */
import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { mkdirSync, writeFileSync } from "node:fs";

const ART = "run-artifacts/pkg-restructure";
const OUT = "reports/pkg-restructure";
mkdirSync(ART, { recursive: true });
mkdirSync(OUT, { recursive: true });

const ROUTE = "/queries";
/* ⚠️ A MOBILE VIEWPORT, AND THAT IS NOT A SHORTCUT — IT IS WHERE THE CONTROL LIVES. The Edit
   button that opens EditQueryDrawer from Query Centre sits inside `isMobile && mobileDetailOn`
   (Queries.tsx:5545), so it is not rendered on desktop at all. Tracing that is what this walk
   found: on desktop there is NO way into the drawer from this page — see F10 in the report. */
const VP = { width: 390, height: 844 };

/** What the drawer's package select currently shows. */
const readSelect = `(() => {
  const sel = document.querySelector('[aria-label="Submission package"]');
  if (!sel) return { present: false };
  const opts = Array.from(sel.querySelectorAll("option")).map((o) => ({ v: o.value, t: (o.textContent||"").trim() }));
  return { present: true, tag: sel.tagName, value: sel.value ?? null, options: opts };
})()`;

/* ⚠️ SIGN IN AT DESKTOP, THEN SWITCH. `ensureSignedIn` waits for `.ws-panel` to be VISIBLE, and on
   mobile the sidebar is a sheet — hidden at rest — so the shared harness cannot open a mobile
   route directly. Sign in wide, resize, then re-navigate so the load-time device gates re-run. */
async function openMobile(page: import("@playwright/test").Page) {
  await openRoute(page, ROUTE, { width: 1440, height: 900 });
  await page.setViewportSize(VP);
  await page.goto(ROUTE);
  await page.waitForTimeout(2500);
  await liftMotionSuppression(page);
}

/* ⚠️ THE DRAWER'S SAVE HAS NO CLASS AND NO ARIA NAME — it is inline-styled, labelled "Save
   changes", and a SIBLING of `.f11-discard` (Form11Drawer's footer). A by-name lookup for /Save/
   picked the quick-note composer's permanently-disabled `qn-send` button instead and spent four
   minutes retrying it: the wrong-element trap for a third time in this stream. Anchoring on the
   footer's own discard control is structural and cannot drift onto another surface. */
async function saveDrawer(page: import("@playwright/test").Page) {
  const save = page.locator(".f11-discard + button");
  await save.waitFor({ state: "visible", timeout: 15_000 });
  await expect(save, "the drawer's Save is disabled — nothing was marked dirty").toBeEnabled({ timeout: 15_000 });
  await save.click();
}

async function openDrawer(page: import("@playwright/test").Page) {
  /* list → detail (this is what sets mobileDetailOn), then the detail bar's Edit */
  await page.locator("[class*=f12-row]").first().click();
  await page.locator("button.qh-mq", { hasText: /^Edit$/ }).first().waitFor({ state: "visible", timeout: 20_000 });
  await page.locator("button.qh-mq", { hasText: /^Edit$/ }).first().click();
  await page.locator('[aria-label="Submission package"]').first().waitFor({ state: "visible", timeout: 20_000 });
}

test.setTimeout(240_000);
test("F7 — attach then detach a package on an existing query, and it persists", async ({ page }) => {
  const log: Record<string, unknown>[] = [];

  await openMobile(page);
  await openDrawer(page);
  const before = await page.evaluate(readSelect) as { value: string; options: { v: string }[] };
  log.push({ step: "drawer open (before)", value: before.value, options: before.options.map((o) => o.v) });

  /* ⚠️ PICK A VALUE THAT DIFFERS FROM THE ONE ALREADY SET. Selecting the package a query already
     has is not a change: the drawer maps it back to `null` (`setDraftPackageId(v === current ? null
     : v)`), nothing is dirty, and Save stays disabled — which is exactly how the first run of this
     walk failed. It is also the same reason the rules probe had to write a NEW value: an unchanged
     key never appears in affectedKeys, so a write that "succeeds" proves nothing. */
  const target = before.options.map((o) => o.v).find((v) => v !== before.value && v !== "") ?? "";
  const back = before.value;
  log.push({ step: "plan", from: before.value, to: target, thenBackTo: back });
  expect(target, "no alternative package to switch to").not.toBe(before.value);

  await page.selectOption('[aria-label="Submission package"]', target);
  await saveDrawer(page);
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${OUT}/f7-after-attach.png`, fullPage: false });

  // ── PROVE IT PERSISTED: fresh load, reopen, read ────────────────────────────
  await openMobile(page);
  await openDrawer(page);
  const afterAttach = await page.evaluate(readSelect) as { value: string };
  log.push({ step: "after reload (attached?)", value: afterAttach.value });
  expect(afterAttach.value, "packageId did not persist — the write was denied").toBe(target);

  // ── PUT IT BACK ─────────────────────────────────────────────────────────────
  await page.selectOption('[aria-label="Submission package"]', back);
  await saveDrawer(page);
  await page.waitForTimeout(3500);

  await openMobile(page);
  await openDrawer(page);
  const restored = await page.evaluate(readSelect) as { value: string };
  log.push({ step: "after reload (restored?)", value: restored.value });
  expect(restored.value, "the second write did not persist").toBe(back);

  writeFileSync(`${ART}/f7-attach-walk.txt`, JSON.stringify(log, null, 2) + "\n");
  console.log(JSON.stringify(log, null, 2));
});
