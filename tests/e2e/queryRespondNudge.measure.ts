/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Respond-nudge run · §5 — the three verbs in the desk, measured at 1440 and 1920.
 *
 * ⚠️ PRECONDITION: `node tests/e2e/seedCorrection.mjs` — cor-move-b (Queried, agent's turn) hosts
 * the respond and nudge scenes, cor-move-a (Partial Requested, with-you) the mark-sent scene.
 * The save case COMMITS and presses its own Undo inside the toast's lifetime, with nothing
 * navigating in between (the standing measurement law).
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { mkdirSync, writeFileSync } from "node:fs";

const SHOTS = "reports/query-respond-nudge-shots";
const out: Record<string, unknown> = {};

async function openDrawerOn(page: import("@playwright/test").Page, queryId: string, width: number) {
  await openRoute(page, "/queries", { width, height: 900 });
  await expect(page.locator(".qcc").first()).toBeVisible({ timeout: 30_000 });
  const card = page.locator(`[data-qcc-id="${queryId}"]`);
  await expect(card, `no card for ${queryId} — was seedCorrection run?`).toBeVisible();
  await card.click();
  await expect(page.locator(".qpn[data-on='true']")).toBeVisible();
  await page.locator(".qpn-tab", { hasText: "Tracking" }).click();
  await expect(page.locator(".qpn .tl-ev").first()).toBeVisible({ timeout: 20_000 });
}

/** The notch, measured AGAINST THE BUTTON'S OWN CENTRE — never the arrow's derivation re-run
 *  (the vacuous-assertion trap from query-drawer-2). The pseudo-element's computed `top` is the
 *  cascade's OUTPUT; adding it to the card's rect is reading the page, not re-deriving the input. */
async function notchVsAnchor(page: import("@playwright/test").Page, anchorSel: string) {
  return page.evaluate((sel) => {
    const card = document.querySelector(".qcd-card") as HTMLElement;
    const btn = document.querySelector(sel) as HTMLElement;
    if (!card || !btn) return { missing: true as const };
    const after = getComputedStyle(card, "::after");
    const notchTop = card.getBoundingClientRect().top + parseFloat(after.top);
    const notchCentre = notchTop + parseFloat(after.height) / 2;
    const b = btn.getBoundingClientRect();
    return { missing: false as const, notchCentre, btnCentre: b.top + b.height / 2, notchShown: after.display !== "none" };
  }, anchorSel);
}

for (const width of [1440, 1920] as const) {
  test(`respond: kinds, details + ghost, at ${width}`, async ({ page }) => {
    mkdirSync(SHOTS, { recursive: true });
    await openDrawerOn(page, "cor-move-b", width);

    /* the primary opens the desk; the opener takes the accent ring */
    const primary = page.locator(".qpn-act", { hasText: "Record response" }).first();
    await primary.click();
    await expect(page.locator(".qcd-card .qrd")).toBeVisible();
    const scene1 = await page.evaluate(() => {
      const card = document.querySelector(".qcd-card") as HTMLElement;
      const live = document.querySelector(".qpn-act--live") as HTMLElement | null;
      return {
        deskW: Math.round(card.getBoundingClientRect().width),
        kinds: document.querySelectorAll(".qrd-kind").length,
        liveRing: live ? getComputedStyle(live).boxShadow !== "none" : false,
        ghosts: document.querySelectorAll(".tl-ev--ghost").length,
      };
    });
    out[`kinds-${width}`] = scene1;
    expect(scene1.deskW, "the desk is not 460 wide").toBe(460);
    expect(scene1.kinds, "six kind cards").toBe(6);
    expect(scene1.liveRing, "the opener wears no accent ring").toBe(true);
    expect(scene1.ghosts, "a ghost before any outcome is chosen").toBe(0);
    await page.screenshot({ path: `${SHOTS}/respond-kinds-${width}.png` });

    /* the notch sits at the opener's centre — the card's own anchor, measured */
    const n1 = await notchVsAnchor(page, ".qpn-act--live");
    expect(n1.missing).toBe(false);
    if (!n1.missing) {
      out[`notch-${width}`] = n1;
      expect(n1.notchShown, "the notch is hidden on a bar anchor").toBe(true);
      expect(Math.abs(n1.notchCentre - n1.btnCentre), "notch vs button centre").toBeLessThanOrEqual(2);
    }

    /* choose Partial requested → details + the ghost rung through the ONE builder */
    await page.locator(".qrd-kind", { hasText: "Asked for a partial" }).click();
    await expect(page.locator(".qcd-card .qrd-row").first()).toBeVisible();
    const scene2 = await page.evaluate(() => ({
      ghosts: document.querySelectorAll(".tl-ev--ghost").length,
      ghostText: (document.querySelector(".tl-ev--ghost") as HTMLElement | null)?.textContent ?? "",
      derived: (document.querySelector(".qrd-derived") as HTMLElement | null)?.textContent ?? "",
    }));
    out[`ghost-${width}`] = scene2;
    expect(scene2.ghosts, "exactly one ghost rung").toBe(1);
    /* decision 2's second half: the waiting rung is MOOTED — the rail derives from the proposed
       status (writer's turn), so "Waiting to hear back" / "No reply" leaves the rail */
    const waitGone = await page.evaluate(() =>
      !Array.from(document.querySelectorAll(".qpn .tl-ev")).some((e) =>
        /Waiting to hear back|No reply/.test(e.textContent ?? "")));
    expect(waitGone, "the waiting rung survived the proposal").toBe(true);
    expect(scene2.ghostText.toLowerCase()).toContain("partial");
    expect(scene2.derived).toContain("Partial Requested");
    await page.screenshot({ path: `${SHOTS}/respond-details-ghost-${width}.png` });
  });

  test(`nudge: the desk with the draft, at ${width}`, async ({ page }) => {
    mkdirSync(SHOTS, { recursive: true });
    await openDrawerOn(page, "cor-move-b", width);
    await page.locator(".qpn-act", { hasText: "Nudge" }).first().click();
    await expect(page.locator(".qcd-card .qrd-mail")).toBeVisible();
    const scene = await page.evaluate(() => {
      const mail = document.querySelector(".qrd-mail") as HTMLElement;
      const chips = Array.from(document.querySelectorAll(".qrd-chips button")).map((b) => (b.textContent ?? "").trim());
      const firstWin = document.querySelector(".qrd-chips button") as HTMLElement;
      return {
        draft: mail.textContent ?? "",
        chips,
        firstIsDefault: firstWin.classList.contains("qrd-win") && firstWin.classList.contains("on"),
        derived: (document.querySelector(".qrd-derived") as HTMLElement | null)?.textContent ?? "",
      };
    });
    out[`nudge-${width}`] = { chips: scene.chips, firstIsDefault: scene.firstIsDefault };
    expect(scene.draft, "the letter is nudgeDraft's — it opens Dear …").toContain("Dear ");
    expect(scene.draft).toContain("from your own mail client");
    expect(scene.firstIsDefault, "the default interval chip leads, selected").toBe(true);
    expect(scene.chips.join(" ")).toContain("No more nudges");
    expect(scene.derived).toContain("ScriptAlly never sends");
    await page.screenshot({ path: `${SHOTS}/nudge-desk-${width}.png` });
  });

  test(`mark sent: the with-you desk, at ${width}`, async ({ page }) => {
    mkdirSync(SHOTS, { recursive: true });
    await openDrawerOn(page, "cor-move-a", width);
    await page.locator(".qpn-act", { hasText: "Mark" }).first().click();
    await expect(page.locator(".qcd-card .qrd")).toBeVisible();
    const scene = await page.evaluate(() => ({
      title: (document.querySelector(".qcd-card .qrd h3") as HTMLElement | null)?.textContent ?? "",
      qty: (document.querySelector(".qrd-stepc input") as HTMLInputElement | null)?.value ?? null,
      askedLabel: Array.from(document.querySelectorAll(".qrd-sub")).some((e) => (e.textContent ?? "").includes("as asked")),
      winChip: (document.querySelector(".qrd-chips .qrd-win") as HTMLElement | null)?.textContent ?? "",
      derived: (document.querySelector(".qrd-derived") as HTMLElement | null)?.textContent ?? "",
    }));
    out[`marksent-${width}`] = scene;
    expect(scene.title).toContain("partial");
    /* cor-move-a's request records NO figure — the honest label stays away from a default */
    expect(scene.askedLabel, "'as asked' beside a figure the request never stated").toBe(false);
    expect(scene.derived).toContain("with the agent");
    await page.screenshot({ path: `${SHOTS}/marksent-desk-${width}.png` });
  });
}

/**
 * ⚠️ THE SAVE RECORDS AN R&R, NOT A PARTIAL — a finding, not a preference. The deployed nested
 * allowlist (26 Aug) has no materialsType/materialsQuantity/fullVersionSent/feedbackType, so
 * recordQueryResponse's partial/full/rejected rungs are DENIED on dev (probed field-by-field;
 * pre-existing on main — the record journey is equally affected). R&R carries none of the denied
 * keys, so it proves the desk's save/pulse/undo composition while the rules gap is reported.
 */
test("post-save: one rung lands with the pulse, the toast's Undo takes it back — 1440", async ({ page }) => {
  mkdirSync(SHOTS, { recursive: true });
  await openDrawerOn(page, "cor-move-b", 1440);
  const before = await page.locator(".qpn .tl-ev").count();

  await page.locator(".qpn-act", { hasText: "Record response" }).first().click();
  await page.locator(".qrd-kind", { hasText: "Asked for revisions" }).click();
  await page.locator(".qrd-b--s", { hasText: "Record it" }).click();

  /* the receipt IS the undo — nothing navigates between here and the press */
  const undo = page.locator(".sa-toast-undo:visible, button:visible:has-text('Undo')").first();
  await expect(undo, "no receipt — the save may not have landed (the account has been changed)").toBeVisible({ timeout: 20_000 });

  /* the fresh pulse resolves onto the NEW rung before its own 1.8s timeout clears it */
  const fresh = await page.evaluate(() => document.querySelectorAll(".tl-ev--fresh").length);
  out.postSave = { before, fresh, after: await page.locator(".qpn .tl-ev").count() };
  await page.screenshot({ path: `${SHOTS}/respond-post-save-1440.png` });
  expect((out.postSave as { after: number }).after, "exactly one rung landed").toBe(before + 1);

  await undo.click();
  await expect
    .poll(async () => page.locator(".qpn .tl-ev").count(), { timeout: 15_000 })
    .toBe(before);
  writeFileSync("reports/query-respond-nudge.json", JSON.stringify(out, null, 2));
});
