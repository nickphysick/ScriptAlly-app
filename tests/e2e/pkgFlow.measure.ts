/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages — the ecosystem flow, driven.
 *
 * ⚠️ EVERY SELECTOR IS SCOPED INSIDE `.pkg-root` (or the modal, which is a page-level overlay).
 * Workspace pages stay mounted and toggle `display`, so a document-wide query on this route returns
 * the hidden Query Centre's elements — proved during the restructure recon, which read a 0x0
 * `.wpg-plate` and the title "Query Centre".
 *
 * Set SA_E2E_BASE_URL to the stream's own dev port for pre-deploy runs.
 */
import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { mkdirSync, writeFileSync } from "node:fs";

const OUT = "reports/pkg-flow";
const ART = "run-artifacts/pkg-flow";
mkdirSync(OUT, { recursive: true });
mkdirSync(ART, { recursive: true });
const ROUTE = "/manuscripts/packages";

/** The register, read off the rendered page. */
export const REGISTER = `(() => {
  const root = document.querySelector(".pkg-root");
  if (!root) return { error: "no .pkg-root" };
  const panel = (label) => Array.from(root.querySelectorAll(".pkgo-panel"))
    .find((p) => (p.querySelector(".pkgo-lbl")?.textContent || "").trim() === label);
  const mats = panel("Materials");
  return {
    chip: (mats?.querySelector(".pkgo-chip")?.textContent || "").trim() || null,
    rows: Array.from(mats?.querySelectorAll(".pkgo-row") ?? []).map((r) => ({
      type: (r.querySelector(".pkgo-type")?.textContent || "").trim(),
      name: (r.querySelector(".pkgo-name")?.textContent || "").trim(),
      detail: (r.querySelector(".pkgo-detail")?.textContent || "").trim(),
    })),
    wellBg: mats ? getComputedStyle(mats.querySelector(".pkgo-body")).backgroundColor : null,
    panelBg: mats ? getComputedStyle(mats).backgroundColor : null,
  };
})()`;

/** The modal's own state. */
const MODAL = `(() => {
  const bd = document.querySelector(".pkgf-backdrop");
  if (!bd) return { open: false };
  const seg = Array.from(bd.querySelectorAll(".pkgf-seg button")).map((b) => ({
    label: (b.textContent || "").trim(), on: b.classList.contains("on"), disabled: b.disabled,
  }));
  const modal = bd.querySelector(".pkgf-modal"), frame = bd.querySelector(".pkgf-frame"),
        band = bd.querySelector(".pkgf-band");
  const cs = (el, p) => el ? getComputedStyle(el).getPropertyValue(p).trim() : null;
  return {
    open: true,
    title: (bd.querySelector(".pkgf-title")?.textContent || "").trim(),
    onTypeStep: !!bd.querySelector(".pkgf-typegrid"),
    tiles: Array.from(bd.querySelectorAll(".pkgf-typetile")).map((t) => ({
      name: (t.querySelector(".pkgf-tname")?.textContent || "").trim(),
      held: (t.querySelector(".pkgf-tcount")?.textContent || "").trim(),
    })),
    nameValue: bd.querySelector("#pkgf-mat-name")?.value ?? null,
    seg,
    saveLabel: (bd.querySelector(".pkgf-btn--primary")?.textContent || "").trim(),
    /* D3's chassis: rim (no border) → frame (hairline) → band inside the frame */
    chassis: {
      modalBorder: cs(modal, "border-top-width"),
      modalPad: cs(modal, "padding-top"),
      frameBorder: cs(frame, "border-top-width"),
      frameOverflow: cs(frame, "overflow"),
      bandInsideFrame: !!(frame && band && frame.contains(band)),
    },
    /* the modal's single filled control */
    filled: Array.from(bd.querySelectorAll("button")).filter((b) => {
      const bg = getComputedStyle(b).backgroundColor;
      return bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent" && bg !== "rgb(255, 255, 255)";
    }).map((b) => (b.textContent || "").trim().slice(0, 24)),
  };
})()`;

test("phase 2 — the material modal: add by paste, add by name-only, edit each", async ({ page }) => {
  const log: Record<string, unknown>[] = [];
  await openRoute(page, ROUTE, { width: 1440, height: 900 });
  await liftMotionSuppression(page);

  log.push({ at: "landing", register: await page.evaluate(REGISTER) });

  // ── ADD via PASTE ───────────────────────────────────────────────────────────
  await page.locator(".pkgo-add", { hasText: "+ ADD" }).first().click();
  await page.locator(".pkgf-backdrop").waitFor({ state: "visible", timeout: 10_000 });
  log.push({ at: "modal opened (type step)", modal: await page.evaluate(MODAL) });
  await page.screenshot({ path: `${OUT}/p2-modal-type.png` });

  await page.locator(".pkgf-typetile", { hasText: "Covering letter" }).click();
  log.push({ at: "type picked", modal: await page.evaluate(MODAL) });
  await page.screenshot({ path: `${OUT}/p2-modal-form.png` });

  await page.locator("#pkgf-mat-name").fill("Flow paste test");
  await page.locator(".pkgf-fld textarea").fill("one two three four five");
  await page.locator(".pkgf-btn--primary").click();
  await page.waitForTimeout(2500);
  log.push({ at: "after paste save", register: await page.evaluate(REGISTER) });

  // ── ADD via NAME ONLY ───────────────────────────────────────────────────────
  await page.locator(".pkgo-add", { hasText: "+ ADD" }).first().click();
  await page.locator(".pkgf-typetile", { hasText: "Synopsis" }).click();
  await page.locator("#pkgf-mat-name").fill("Flow ref test");
  await page.locator(".pkgf-seg button", { hasText: "NAME ONLY" }).click();
  await page.locator('.pkgf-fld input[aria-label="File name"]').fill("flow-ref.docx");
  await page.locator(".pkgf-btn--primary").click();
  await page.waitForTimeout(2500);
  log.push({ at: "after name-only save", register: await page.evaluate(REGISTER) });
  await page.screenshot({ path: `${OUT}/p2-register.png`, fullPage: true });

  writeFileSync(`${ART}/p2-modal.txt`, JSON.stringify(log, null, 2) + "\n");
  console.log(JSON.stringify(log, null, 2));
});

test("phase 2 — reopening a material restores its mode and values, and edits persist", async ({ page }) => {
  const log: Record<string, unknown>[] = [];
  await openRoute(page, ROUTE, { width: 1440, height: 900 });
  await liftMotionSuppression(page);

  /* ⚠️ SELF-CONTAINED. This test used to reopen the material the ADD test left behind, and so
     mutated the fixture it depended on: run twice, the second run found a ref material already
     switched to paste and timed out looking for a File-name field. `cleanFlowTest.mjs` removes the
     "Flow …" residue and both tests create what they need. */
  await page.locator(".pkgo-add", { hasText: "+ ADD" }).first().click();
  await page.locator(".pkgf-typetile", { hasText: "Covering letter" }).click();
  await page.locator("#pkgf-mat-name").fill("Flow edit paste");
  await page.locator(".pkgf-fld textarea").fill("one two three four five");
  await page.locator(".pkgf-btn--primary").click();
  await page.waitForTimeout(2500);

  await page.locator(".pkgo-add", { hasText: "+ ADD" }).first().click();
  await page.locator(".pkgf-typetile", { hasText: "Synopsis" }).click();
  await page.locator("#pkgf-mat-name").fill("Flow edit ref");
  await page.locator(".pkgf-seg button", { hasText: "NAME ONLY" }).click();
  await page.locator('.pkgf-fld input[aria-label="File name"]').fill("flow-ref.docx");
  await page.locator(".pkgf-btn--primary").click();
  await page.waitForTimeout(2500);

  /* ── the pasted one: opens straight to the form, in paste mode, with its body ── */
  await page.locator(".pkgo-row", { hasText: "Flow edit paste" }).click();
  await page.locator(".pkgf-backdrop").waitFor({ state: "visible", timeout: 10_000 });
  const m1 = await page.evaluate(MODAL) as Record<string, unknown>;
  const body1 = await page.locator(".pkgf-fld textarea").inputValue();
  log.push({ at: "reopened pasted", title: m1.title, onTypeStep: m1.onTypeStep,
             name: m1.nameValue, saveLabel: m1.saveLabel, seg: m1.seg, body: body1 });
  await page.screenshot({ path: `${OUT}/p2-edit-paste.png` });

  /* edit the body — the count must move with it */
  await page.locator(".pkgf-fld textarea").fill("now it has exactly seven words here");
  await page.locator(".pkgf-btn--primary").click();
  await page.waitForTimeout(2500);
  log.push({ at: "after editing the body", register: await page.evaluate(REGISTER) });

  /* ── the name-only one: opens in ref mode with its filename ── */
  await page.locator(".pkgo-row", { hasText: "Flow edit ref" }).click();
  await page.locator(".pkgf-backdrop").waitFor({ state: "visible", timeout: 10_000 });
  const m2 = await page.evaluate(MODAL) as Record<string, unknown>;
  const ref2 = await page.locator('.pkgf-fld input[aria-label="File name"]').inputValue();
  log.push({ at: "reopened name-only", seg: m2.seg, refValue: ref2, name: m2.nameValue });

  /* ⚠️ THE MODE SWITCH IS THE CASE THAT MATTERS: ref → paste must CLEAR the filename, or the
     register goes on naming a file that is no longer what the material is. */
  await page.locator(".pkgf-seg button", { hasText: "PASTE TEXT" }).click();
  await page.locator(".pkgf-fld textarea").fill("switched to text now");
  await page.locator(".pkgf-btn--primary").click();
  await page.waitForTimeout(2500);
  log.push({ at: "after ref→paste switch", register: await page.evaluate(REGISTER) });

  writeFileSync(`${ART}/p2-edit.txt`, JSON.stringify(log, null, 2) + "\n");
  console.log(JSON.stringify(log, null, 2));
});
