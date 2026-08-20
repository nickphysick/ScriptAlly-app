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

/** The gate + builder. Self-contained: clears the fixture, builds it back up, restores at the end. */
const GATE = `(() => {
  const root = document.querySelector(".pkg-root");
  if (!root) return { error: "no .pkg-root" };
  const pkgPanel = Array.from(root.querySelectorAll(".pkgo-panel"))
    .find((p) => (p.querySelector(".pkgo-lbl")?.textContent || "").trim() === "Packages");
  const ghost = pkgPanel?.querySelector(".pkgo-ghost");
  const hdr = Array.from(root.querySelectorAll("button")).find((b) => /New package/.test(b.textContent || ""));
  return {
    railNewDisabled: pkgPanel?.querySelector(".pkgo-add")?.disabled ?? null,
    headerNewDisabled: hdr?.disabled ?? null,
    ghostTag: ghost?.tagName ?? null,
    ghostLocked: ghost?.classList.contains("pkgo-ghost--locked") ?? null,
    ghostNext: ghost?.classList.contains("pkgo-ghost--next") ?? null,
    ghostTitle: (ghost?.querySelector(".pkgo-gtitle")?.textContent || "").trim() || null,
    ghostSub: (ghost?.querySelector(".pkgo-gsub")?.textContent || "").trim().slice(0, 200) || null,
    /* nothing clickable inside the locked ghost (D4) */
    clickableInsideGhost: ghost ? ghost.querySelectorAll("button,a,[role=button]").length : null,
    pkgRows: Array.from(pkgPanel?.querySelectorAll(".pkgo-row") ?? []).map((r) => ({
      name: (r.querySelector(".pkgo-name")?.textContent || "").trim(),
      comp: (r.querySelector(".pkgo-comp")?.textContent || "").trim() || null,
      detail: (r.querySelector(".pkgo-detail")?.textContent || "").trim(),
    })),
  };
})()`;

async function addMaterial(page: import("@playwright/test").Page, type: string, name: string, body: string) {
  await page.locator(".pkgo-add", { hasText: "+ ADD" }).first().click();
  await page.locator(".pkgf-typetile", { hasText: type }).click();
  await page.locator("#pkgf-mat-name").fill(name);
  await page.locator(".pkgf-fld textarea").fill(body);
  await page.locator(".pkgf-btn--primary").click();
  await page.waitForTimeout(2500);
}

/**
 * ⚠️ EDITING IS PROVED SEPARATELY FROM CREATING, because only CREATING is Pro-gated. `addPackage`
 * refuses on FREE (see the phase-3 test above, which captures that refusal); `updatePackage` does
 * not. So the edit path is driven against a SEEDED package — the seed writes through the SDK, which
 * the client-side plan check never sees. See F-E.
 */
test("phase 3 — editing a package from its rail row", async ({ page }) => {
  await openRoute(page, ROUTE, { width: 1440, height: 900 });
  await liftMotionSuppression(page);
  const log: Record<string, unknown>[] = [];

  await page.locator(".pkgo-row", { hasText: "Standard UK" }).first().click();
  await page.locator(".pkgf-backdrop").waitFor({ state: "visible", timeout: 10_000 });
  const opened = {
    title: (await page.locator(".pkgf-title").textContent() || "").trim(),
    name: await page.locator("#pkgf-pkg-name").inputValue(),
    letter: await page.locator("#pkgf-pkg-letter").inputValue(),
    synopsis: await page.locator("#pkgf-pkg-synopsis").inputValue(),
    sample: await page.locator("#pkgf-pkg-sample").inputValue(),
    comp: (await page.locator(".pkgf-comp").textContent() || "").trim(),
  };
  log.push({ at: "opened for edit", ...opened });
  await page.screenshot({ path: `${OUT}/p3-edit-package.png` });

  /* change the sample to "Not included" — the optional slot's sentinel path */
  await page.locator("#pkgf-pkg-sample").selectOption("");
  const compAfter = (await page.locator(".pkgf-comp").textContent() || "").trim();
  await page.locator("#pkgf-pkg-name").fill("Standard UK edited");
  await page.locator(".pkgf-btn--primary").click();
  await page.waitForTimeout(2500);
  log.push({ at: "after edit", livePreview: compAfter, gate: await page.evaluate(GATE) });

  /* put it back so the fixture is as found */
  await page.locator(".pkgo-row", { hasText: "Standard UK edited" }).first().click();
  await page.locator(".pkgf-backdrop").waitFor({ state: "visible", timeout: 10_000 });
  await page.locator("#pkgf-pkg-sample").selectOption({ index: 1 });
  await page.locator("#pkgf-pkg-name").fill("Standard UK");
  await page.locator(".pkgf-btn--primary").click();
  await page.waitForTimeout(2500);
  log.push({ at: "restored", gate: await page.evaluate(GATE) });

  writeFileSync(`${ART}/p3-edit-package.txt`, JSON.stringify(log, null, 2) + "\n");
  console.log(JSON.stringify(log, null, 2));
});

test("phase 3 — locked with nothing, unlocks at letter+synopsis, builds and edits", async ({ page }) => {
  const log: Record<string, unknown>[] = [];
  await openRoute(page, ROUTE, { width: 1440, height: 900 });
  await liftMotionSuppression(page);

  log.push({ at: "seed-empty (fixture cleared before this run)", gate: await page.evaluate(GATE) });
  await page.screenshot({ path: `${OUT}/p3-locked.png`, fullPage: true });

  await addMaterial(page, "Covering letter", "Flow gate letter", "a letter body");
  log.push({ at: "one letter only", gate: await page.evaluate(GATE) });

  await addMaterial(page, "Synopsis", "Flow gate synopsis", "a synopsis body");
  log.push({ at: "letter + synopsis", gate: await page.evaluate(GATE) });
  await page.screenshot({ path: `${OUT}/p3-unlocked.png`, fullPage: true });

  /* build one */
  await page.locator(".pkgo-add", { hasText: "+ NEW" }).first().click();
  await page.locator(".pkgf-backdrop").waitFor({ state: "visible", timeout: 10_000 });
  const comp = await page.locator(".pkgf-comp").textContent();
  const suggested = await page.locator("#pkgf-pkg-name").inputValue();
  log.push({ at: "builder open", suggestedName: suggested, compPreview: (comp || "").trim() });
  await page.screenshot({ path: `${OUT}/p3-builder.png` });

  await page.locator("#pkgf-pkg-name").fill("Flow gate package");
  await page.locator(".pkgf-btn--primary").click();
  await page.waitForTimeout(2500);
  /* ⚠️ A REFUSAL IS PART OF THE PROOF, NOT A FAILURE OF IT. addPackage is Pro-gated in db.tsx, so on
     a FREE plan the write is declined — and what matters is that the modal SAYS so and keeps the
     draft, rather than closing on a save that never happened. */
  const refusal = await page.locator(".pkgf-error").count()
    ? (await page.locator(".pkgf-error").textContent() || "").trim() : null;
  const stillOpen = await page.locator(".pkgf-backdrop").count() > 0;
  log.push({ at: "after build", refusal, modalStillOpen: stillOpen, gate: await page.evaluate(GATE) });
  if (refusal) {
    await page.screenshot({ path: `${OUT}/p3-refused.png` });
    writeFileSync(`${ART}/p3-gate.txt`, JSON.stringify(log, null, 2) + "\n");
    console.log(JSON.stringify(log, null, 2));
    return;
  }

  /* edit it from its rail row */
  await page.locator(".pkgo-row", { hasText: "Flow gate package" }).click();
  await page.locator(".pkgf-backdrop").waitFor({ state: "visible", timeout: 10_000 });
  const editTitle = await page.locator(".pkgf-title").textContent();
  await page.locator("#pkgf-pkg-name").fill("Flow gate renamed");
  await page.locator(".pkgf-btn--primary").click();
  await page.waitForTimeout(2500);
  log.push({ at: "after edit", editTitle: (editTitle || "").trim(), gate: await page.evaluate(GATE) });

  writeFileSync(`${ART}/p3-gate.txt`, JSON.stringify(log, null, 2) + "\n");
  console.log(JSON.stringify(log, null, 2));
});

/** The working stage: tiles, ghost tile, and the rail index's jump-and-flash. */
const STAGE4 = `(() => {
  const root = document.querySelector(".pkg-root");
  if (!root) return { error: "no .pkg-root" };
  const tiles = Array.from(root.querySelectorAll(".pkgf-tile:not(.pkgf-tile--ghost)"));
  const cs = (el, p) => el ? getComputedStyle(el).getPropertyValue(p).trim() : null;
  return {
    onboardingShown: !!root.querySelector(".pkgo-prob"),
    workHead: (root.querySelector(".pkgf-workhead h2")?.textContent || "").trim() || null,
    workTag: (root.querySelector(".pkgf-worktag")?.textContent || "").trim() || null,
    tileCount: tiles.length,
    ghostTile: !!root.querySelector(".pkgf-tile--ghost"),
    ghostText: (root.querySelector(".pkgf-tile--ghost")?.textContent || "").trim() || null,
    tiles: tiles.map((t) => ({
      name: (t.querySelector("h4")?.textContent || "").trim(),
      slots: Array.from(t.querySelectorAll(".pkgf-slot")).map((s) => ({
        label: (s.querySelector(".pkgf-slt")?.textContent || "").trim(),
        name: (s.querySelector(".pkgf-sln")?.textContent || "").trim(),
        none: !!s.querySelector(".pkgf-sln--none"),
      })),
      foot: (t.querySelector(".pkgf-tfoot")?.textContent || "").trim(),
      /* D7: 3px sage top edge */
      topBorder: cs(t, "border-top-width"),
      topColor: cs(t, "border-top-color"),
    })),
    /* the rail index is slim — name + send state, no composition */
    railHasComposition: !!root.querySelector(".pkgo-panel .pkgo-comp"),
  };
})()`;

test("phase 4 — the working stage: tiles, ghost tile, rail index jump", async ({ page }) => {
  const log: Record<string, unknown>[] = [];
  await openRoute(page, ROUTE, { width: 1440, height: 900 });
  await liftMotionSuppression(page);

  log.push({ at: "with packages", stage: await page.evaluate(STAGE4) });
  await page.screenshot({ path: `${OUT}/p4-working.png`, fullPage: true });

  /* the rail index jumps to a tile and flashes it — it does NOT open the builder */
  const pkgPanelRow = page.locator(".pkgo-panel", { hasText: "Packages" }).locator(".pkgo-row").first();
  await pkgPanelRow.click();
  await page.waitForTimeout(300);
  const afterJump = await page.evaluate(`(() => {
    const root = document.querySelector(".pkg-root");
    return {
      flashed: !!root.querySelector(".pkgf-tile--flash"),
      flashedName: (root.querySelector(".pkgf-tile--flash h4")?.textContent || "").trim() || null,
      builderOpened: !!document.querySelector(".pkgf-backdrop"),
    };
  })()`);
  log.push({ at: "after clicking a rail package row", ...(afterJump as object) });

  writeFileSync(`${ART}/p4-stage.txt`, JSON.stringify(log, null, 2) + "\n");
  console.log(JSON.stringify(log, null, 2));
});

/** The other half of D6's switch: materials present, no packages → the onboarding stage returns. */
test("phase 4 — onboarding stage returns when the last package goes", async ({ page }) => {
  await openRoute(page, ROUTE, { width: 1440, height: 900 });
  await liftMotionSuppression(page);
  const r = await page.evaluate(STAGE4);
  await page.screenshot({ path: `${OUT}/p4-onboarding.png`, fullPage: true });
  writeFileSync(`${ART}/p4-onboarding.txt`, JSON.stringify(r, null, 2) + "\n");
  console.log(JSON.stringify(r, null, 2));
});

/** The tracking dashboard — pre-sent and populated. */
const DASH = `(() => {
  const root = document.querySelector(".pkg-root");
  if (!root) return { error: "no .pkg-root" };
  const heads = Array.from(root.querySelectorAll(".pkgf-workhead h2")).map((h) => (h.textContent || "").trim());
  const stats = Array.from(root.querySelectorAll(".pkgf-stat")).map((s) => ({
    n: (s.querySelector(".pkgf-statn")?.textContent || "").trim(),
    label: (s.querySelector(".pkgf-statl")?.textContent || "").trim(),
    dirColor: s.querySelector(".pkgf-dir") ? getComputedStyle(s.querySelector(".pkgf-dir")).color : null,
  }));
  const panels = Array.from(root.querySelectorAll(".pkgf-dashgrid .pkgo-panel")).map((p) => ({
    label: (p.querySelector(".pkgo-lbl")?.textContent || "").trim(),
    key: Array.from(p.querySelectorAll(".pkgf-barkey span")).map((k) => (k.textContent || "").trim()),
    rows: Array.from(p.querySelectorAll(".pkgf-dashrows > div")).map((r) => ({
      eyebrow: (r.querySelector(".pkgf-dreyebrow")?.textContent || "").trim() || null,
      name: (r.querySelector(".pkgf-drname")?.textContent || "").trim(),
      meta: (r.querySelector(".pkgf-drmeta")?.textContent || "").trim(),
      sentW: r.querySelector(".pkgf-bsent")?.style.width ?? null,
      inW: r.querySelector(".pkgf-bin")?.style.width ?? null,
    })),
  }));
  return {
    trackingHeadPresent: heads.includes("Tracking"),
    tag: (Array.from(root.querySelectorAll(".pkgf-worktag")).map((t) => (t.textContent || "").trim())
      .find((t) => /reported/i.test(t))) ?? null,
    nudge: (root.querySelector(".pkgf-nudge")?.textContent || "").trim() || null,
    ghostPanels: Array.from(root.querySelectorAll(".pkgf-dashghosts .pkgo-ghost")).map(
      (g) => (g.querySelector(".pkgo-gtitle")?.textContent || "").trim()),
    stats, panels,
    /* the rail is Materials + Packages only (D9) */
    railPanels: Array.from(root.querySelectorAll(".pkgo-rail .pkgo-lbl")).map((l) => (l.textContent || "").trim()),
    /* ⚠️ SCOPED TO THE DASHBOARD. The first version tested root.textContent, which INCLUDES the
       page's inline <style> — so it matched a CSS rule and reported a rate the page does not show.
       The percent-hunt probe confirmed the only match had a STYLE parent. The claim worth making is
       narrower and checkable: nothing the tracking panels RENDER is a percentage. */
    dashPercent: Array.from(root.querySelectorAll(".pkgf-dashgrid, .pkgf-statstrip"))
      .some((el) => /[0-9]\\s*%/.test(el.textContent || "")),
  };
})()`;

test("phase 5 — the tracking dashboard, populated", async ({ page }) => {
  await openRoute(page, ROUTE, { width: 1440, height: 900 });
  await liftMotionSuppression(page);
  const r = await page.evaluate(DASH);
  await page.screenshot({ path: `${OUT}/p5-dashboard.png`, fullPage: true });
  writeFileSync(`${ART}/p5-dashboard.txt`, JSON.stringify(r, null, 2) + "\n");
  console.log(JSON.stringify(r, null, 2));
});

/** Where exactly does a "%" appear? D8 forbids rates on this dashboard. */
test("probe — percent hunt", async ({ page }) => {
  await openRoute(page, ROUTE, { width: 1440, height: 900 });
  const hits = await page.evaluate(`(() => {
    const root = document.querySelector(".pkg-root");
    const out = [];
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walk.nextNode())) {
      if (/\\d\\s*%/.test(n.textContent || "")) {
        out.push({ text: (n.textContent || "").trim().slice(0, 80),
                   parent: n.parentElement?.className || n.parentElement?.tagName });
      }
    }
    return out;
  })()`);
  console.log("PERCENT_HITS " + JSON.stringify(hits, null, 2));
});

/**
 * The brief's live proof: attach a package to an EXISTING query through EditQueryDrawer — the write
 * F7 unblocked — and watch the dashboard's derived figures move.
 *
 * ⚠️ MOBILE VIEWPORT, because that is where the control lives. The Edit button that opens the drawer
 * from Query Centre sits inside `isMobile && mobileDetailOn`; on desktop there is no route into it
 * at all (F10 in the restructure report).
 */
test("phase 5 — attaching a package moves the derived figures", async ({ page }) => {
  const log: Record<string, unknown>[] = [];
  const VP = { width: 390, height: 844 };

  const readDash = async () => {
    await openRoute(page, ROUTE, { width: 1440, height: 900 });
    await liftMotionSuppression(page);
    return page.evaluate(DASH);
  };

  log.push({ at: "BEFORE — nothing sent", dash: await readDash() });

  /* attach, through the real drawer */
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.setViewportSize(VP);
  await page.goto("/queries");
  await page.waitForTimeout(2500);
  await liftMotionSuppression(page);
  await page.locator("[class*=f12-row]").first().click();
  await page.locator("button.qh-mq", { hasText: /^Edit$/ }).first().waitFor({ state: "visible", timeout: 20_000 });
  await page.locator("button.qh-mq", { hasText: /^Edit$/ }).first().click();
  await page.locator('[aria-label="Submission package"]').first().waitFor({ state: "visible", timeout: 20_000 });
  const before = await page.locator('[aria-label="Submission package"]').inputValue();
  await page.selectOption('[aria-label="Submission package"]', "seed-pkg-1");
  const save = page.locator(".f11-discard + button");
  await expect(save).toBeEnabled({ timeout: 15_000 });
  await save.click();
  await page.waitForTimeout(3500);
  log.push({ at: "attached seed-pkg-1 to a query", packageWas: before });

  log.push({ at: "AFTER — one send", dash: await readDash() });

  await page.screenshot({ path: `${OUT}/p5-after-attach.png`, fullPage: true });
  writeFileSync(`${ART}/p5-live.txt`, JSON.stringify(log, null, 2) + "\n");
  console.log(JSON.stringify(log, null, 2));
});
