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
  /* ⚠️ WAIT FOR THE FIRST ⋯, not the first row — the rows render instantly from the synthesised
     root while the real docs arrive by subscription, and every count taken before they land is a
     count of nothing (run 3's before=0). Same precondition queryDrawerDesk states. */
  await expect(page.locator(".qpn .tl-more").first()).toBeVisible({ timeout: 20_000 });
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
      /* pass 3 §1: a bar anchor sits ABOVE the card's reachable top now (the desk clears the app
         masthead), so the notch clamps to the nearest point on the card's edge — the button-centre
         equality holds only for anchors the card can reach (the rung case below). */
    }

    /* pass 3 §1 — the desk clears the app masthead. The brief's literal bound (drawer.top + 12)
       is a FALSE PREMISE: .qpn is a full-height takeover, its top is 0 (asserted here so the
       premise stays measured). The intent binds to the content window. */
    const clamp = await page.evaluate(() => {
      const qpn = [...document.querySelectorAll<HTMLElement>(".qpn")].find((e) => e.getBoundingClientRect().height > 0)!;
      const card = document.querySelector(".qcd-card")!.getBoundingClientRect();
      const win = document.querySelector<HTMLElement>(".ws-window")!.getBoundingClientRect();
      return { drawerTop: qpn.getBoundingClientRect().top, cardTop: card.top, winTop: win.top, cardBottom: card.bottom, vh: window.innerHeight };
    });
    out[`clamp-${width}`] = clamp;
    expect(clamp.drawerTop, "the drawer stopped being a full-height takeover — re-derive the bound").toBe(0);
    expect(clamp.cardTop, "the desk sits over the app masthead").toBeGreaterThanOrEqual(clamp.winTop + 12);
    expect(clamp.cardTop, "and trivially clears the drawer's own top").toBeGreaterThanOrEqual(clamp.drawerTop + 12);
    expect(clamp.cardBottom, "the desk runs past the drawer's foot").toBeLessThanOrEqual(clamp.vh - 12 + 1);

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

    /* pass 3 §2 — nothing wedges in above the quick filters while a query is open. The old close
       menu rendered IN FLOW there (its trigger retired with the browsing chrome, so its menuStyle
       was empty) and pushed the grid down. The composed claim: the quick row sits where it sits
       on a fresh page, and the desktop page body carries no "Close this query as…" block at all
       (the string survives only in the unmounted mobile sheet). */
    const openTop = await page.evaluate(() =>
      Math.round(document.querySelector(".qcc-quick")?.getBoundingClientRect().top ?? -1));
    const closeText = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("div,section")].some((e) =>
        e.getBoundingClientRect().height > 0 && (e.textContent ?? "").trim().startsWith("Close this query as")));
    expect(closeText, "an in-flow close block is on the page").toBe(false);
    out[`quickTop-${width}`] = openTop;
    expect(openTop, "the quick row is missing").toBeGreaterThan(0);
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
 * The save records a PARTIAL — the outcome that was blocked until correction pass 3's rules fix
 * (the nested allowlist gained materialsType/materialsQuantity/fullVersionSent/feedbackType,
 * deployed to dev and probed red→green field-by-field). It exercises the qty overlay end-to-end;
 * the run that found the gap substituted an R&R here, and this is the substitution repaid.
 */
test("post-save: one rung lands with the pulse, the toast's Undo takes it back — 1440", async ({ page }) => {
  mkdirSync(SHOTS, { recursive: true });
  await openDrawerOn(page, "cor-move-b", 1440);
  /* ⚠️ COUNT REAL RUNGS (their ⋯), NEVER `.tl-ev` — the waiting rung is a `.tl-ev` too, and it
     LEAVES as the real rung arrives, so the raw row count is flat across a successful save (the
     composed-count trap; it cost run 2 an un-pressed Undo). The ghost carries no ⋯ since
     f2c5eb55, so this counts exactly the recorded activities. */
  const reals = () => page.locator(".qpn .tl-more").count();
  const before = await reals();

  await page.locator(".qpn-act", { hasText: "Record response" }).first().click();
  await page.locator(".qrd-kind", { hasText: "Asked for a partial" }).click();
  await page.locator(".qrd-b--s", { hasText: "Record it" }).click();

  /* the receipt IS the undo — capture, press IMMEDIATELY, and only then assert. An assertion
     between the commit and the press is a changed account whenever it throws (run 2 proved it). */
  const undo = page.locator(".sa-toast-undo:visible, button:visible:has-text('Undo')").first();
  await expect(undo, "no receipt — the save may not have landed (the account has been changed)").toBeVisible({ timeout: 20_000 });
  const fresh = await page.evaluate(() => document.querySelectorAll(".tl-ev--fresh").length);
  const after = await reals();
  await page.screenshot({ path: `${SHOTS}/respond-post-save-1440.png` });
  await undo.click();

  /* ⚠️ POLL THE STATUS, NOT ONLY THE RUNG COUNT — the undo is delete + status revert + recompute,
     and the rung's disappearance is only its FIRST write landing. Ending the test there killed the
     revert in flight once: nested store clean, the query stuck at the saved status, and a feed
     orphan the reseed's same-id sweep could never find (cleaned by hand, 5 Sep). The card's
     accessible name carries the status, so "back to Queried" is the whole undo, observed. */
  await expect
    .poll(async () => reals(), { timeout: 15_000 })
    .toBe(before);
  await expect
    .poll(async () => (await page.locator('[data-qcc-id="cor-move-b"]').getAttribute("aria-label")) ?? "", { timeout: 15_000 })
    .toContain("Queried");
  out.postSave = { before, fresh, after };
  expect(after, "exactly one rung landed").toBe(before + 1);
  expect(fresh, "the fresh pulse resolved onto the new rung").toBe(1);
  writeFileSync("reports/query-respond-nudge.json", JSON.stringify(out, null, 2));
});

test("pass 3: Mark closed in the desk, and the Agent tab states the name once — 1440", async ({ page }) => {
  mkdirSync(SHOTS, { recursive: true });
  await openDrawerOn(page, "cor-move-b", 1440);

  /* §4 — the drawer states the agent's full name exactly once while the Agent tab is active */
  await page.locator(".qpn-tab", { hasText: "Agent" }).click();
  const nameCount = await page.evaluate(() => {
    const qpn = [...document.querySelectorAll<HTMLElement>(".qpn")].find((e) => e.getBoundingClientRect().height > 0)!;
    return (qpn.textContent ?? "").split("Priya Nair").length - 1;
  });
  out.agentTabNameCount = nameCount;
  expect(nameCount, "the tab repeats the identity row").toBe(1);
  await page.screenshot({ path: `${SHOTS}/agent-tab-1440.png` });

  /* §2 — the closed desk: reason cards, derived line, ghost; Cancel — nothing is written */
  await page.locator(".qpn-tab", { hasText: "Tracking" }).click();
  await page.locator(".qpn-act", { hasText: "Mark closed" }).first().click();
  await expect(page.locator(".qcd-card .qrd-kinds--closed")).toBeVisible();
  const closed = await page.evaluate(() => ({
    reasons: [...document.querySelectorAll(".qrd-kinds--closed .qrd-kind u")].map((b) => b.textContent),
    derived: (document.querySelector(".qrd-derived") as HTMLElement | null)?.textContent ?? "",
    ghosts: document.querySelectorAll(".tl-ev--ghost").length,
  }));
  expect(closed.reasons).toEqual(["Rejected", "Withdrawn", "No Response"]);
  expect(closed.ghosts, "no ghost before a reason is chosen").toBe(0);
  await page.locator(".qrd-kinds--closed .qrd-kind", { hasText: "Withdrawn" }).click();
  const after = await page.evaluate(() => ({
    ghosts: document.querySelectorAll(".tl-ev--ghost").length,
    derived: (document.querySelector(".qrd-derived") as HTMLElement | null)?.textContent ?? "",
  }));
  out.closedDesk = after;
  expect(after.ghosts, "the closed proposal reaches the one ghost channel").toBe(1);
  expect(after.derived).toContain("Status becomes Closed — Withdrawn.");
  await page.screenshot({ path: `${SHOTS}/markclosed-desk-1440.png` });
  await page.keyboard.press("Escape");
  writeFileSync("reports/query-corrections-3.json", JSON.stringify(out, null, 2));
});
