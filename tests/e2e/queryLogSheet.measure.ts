/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Log-sheet run · §5 — the form in the drawer, measured. 1440 and 1920: step 1 with the typeahead
 * OPEN (and unclipped — the claim a stylesheet cannot make), step 2 with the window pill, step 3
 * in Words, step 4, the ghost at index 0, and the post-save detail.
 *
 * ⚠️ THE SAVE CASE WRITES AND MUST RESTORE IN THE SAME RUN: the receipt's Undo is pressed
 * immediately after the assertions, nothing navigates in between, and a failure to find the
 * button is a loud red — the account has been changed (the standing measurement law).
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { mkdirSync, writeFileSync } from "node:fs";

const SHOTS = "reports/query-log-sheet-shots";
const out: Record<string, unknown> = {};

async function openForm(page: import("@playwright/test").Page, width: number) {
  await openRoute(page, "/queries", { width, height: 900 });
  await expect(page.locator(".qcc").first()).toBeVisible({ timeout: 30_000 });
  await page.locator(".wsh-cta, .qcc-hero-cta, button:has-text('Log new query')").first().click();
  await expect(page.locator(".qpn--form")).toBeVisible({ timeout: 10_000 });
}

for (const width of [1440, 1920] as const) {
  test(`the four steps and the ghost, at ${width}`, async ({ page }) => {
    mkdirSync(SHOTS, { recursive: true });
    await openForm(page, width);

    /* form mode: 660 wide, ghost at index 0, aria-hidden, never counted */
    const geo = await page.evaluate(() => {
      const p = document.querySelector(".qpn--form") as HTMLElement;
      const grid = Array.from(document.querySelectorAll<HTMLElement>(".qcc-grid"))
        .find((e) => e.getBoundingClientRect().height > 0);
      const first = grid?.querySelector(".qcc");
      const foot = Array.from(document.querySelectorAll<HTMLElement>(".qcc-foot, .qcc-count"))
        .map((e) => e.textContent ?? "").join(" ");
      return {
        width: Math.round(p.getBoundingClientRect().width),
        ghostFirst: first?.classList.contains("qcc--ghost") ?? false,
        ghostHidden: first?.getAttribute("aria-hidden") === "true",
        foot,
      };
    });
    out[`w${width}`] = geo;
    expect(geo.width, "form mode is not 660 wide").toBe(660);
    expect(geo.ghostFirst, "the ghost is not at index 0").toBe(true);
    expect(geo.ghostHidden, "the ghost is announced").toBe(true);

    /* step 1 — the typeahead, open and UNCLIPPED */
    await page.locator("#qls-agent").click();
    await expect(page.locator(".qls-list")).toBeVisible();
    const clip = await page.evaluate(() => {
      const list = document.querySelector(".qls-list") as HTMLElement;
      const r = list.getBoundingClientRect();
      let el: HTMLElement | null = list.parentElement;
      while (el) {
        const st = getComputedStyle(el);
        if (/(auto|scroll|hidden)/.test(st.overflow + st.overflowY + st.overflowX)) {
          const cr = el.getBoundingClientRect();
          if (r.bottom > cr.bottom + 1 || r.top < cr.top - 1) return { clippedBy: el.className };
        }
        el = el.parentElement;
      }
      return { clippedBy: null, bottom: r.bottom, vh: window.innerHeight };
    });
    expect(clip.clippedBy, `the typeahead is clipped by ${clip.clippedBy}`).toBeNull();
    await page.screenshot({ path: `${SHOTS}/step1-typeahead-${width}.png` });

    /* pick the first agent → step 2, the window pill leads when the agent states one */
    await page.locator(".qls-it").first().click();
    await expect(page.locator(".qls-agcard")).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/step2-when-${width}.png` });
    out[`w${width}-pill`] = await page.locator(".qls-chipb--win").count();

    /* step 3 in Words */
    await page.locator(".qls-fb--go", { hasText: "Next: What" }).click();
    await expect(page.locator(".qls-sec .qcd-mats")).toBeVisible();
    const wordsBtn = page.locator(".qcd-useg button", { hasText: "Words" }).first();
    if (await wordsBtn.count()) {
      /* the sample row must be ON for the control to show — tick it if not */
      const stepper = page.locator(".qcd-qty");
      if (!(await stepper.count())) await page.locator(".qcd-doc", { hasText: "Opening sample" }).locator(".qcd-cb").click();
      await page.locator(".qcd-useg button", { hasText: "Words" }).first().click();
      const snapped = await page.locator(".qcd-qty input").inputValue();
      expect(snapped, "Words did not snap to 5,000").toBe("5,000");
    }
    await page.screenshot({ path: `${SHOTS}/step3-what-${width}.png` });

    /* step 4 */
    await page.locator(".qls-fb--go", { hasText: "Next: Notes" }).click();
    await expect(page.locator(".qls-note")).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/step4-notes-${width}.png` });

    /* cancel — no write, ghost leaves */
    await page.keyboard.press("Escape");
    /* the materials tick made the draft dirty → the guard asks; keep-or-discard */
    const discard = page.locator("button", { hasText: "Discard" });
    if (await discard.count()) await discard.click();
    await expect(page.locator(".qpn--form")).toHaveCount(0);
    const ghostGone = await page.evaluate(() => document.querySelectorAll(".qcc--ghost").length);
    expect(ghostGone, "the ghost survived a cancel").toBe(0);
  });
}

test("save writes once, lands on detail, and Undo takes it back — 1440", async ({ page }) => {
  await openForm(page, 1440);
  await page.locator("#qls-agent").click();
  await page.locator(".qls-it").first().click();
  await expect(page.locator(".qls-agcard")).toBeVisible();

  const before = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".qcc:not(.qcc--ghost)")).length);

  await page.locator(".qpn-fb--go", { hasText: "Save query" }).click();

  /* ⚠️ THE UNDO IS PRESSED INSIDE THE TOAST'S LIFETIME — every assertion that can wait, waits
     until AFTER the press. The first two runs burned the ~6s on a slow detail wait and a
     screenshot, the toast expired, and the write stood (cleaned by script, twice). The receipt's
     arrival is itself the save's proof; the detail and the count are asserted from a snapshot
     taken in the same beat. */
  /* :visible — a hidden mounted copy of the toast chrome matched first and burned run 3 */
  const undo = page.locator(".sa-toast-undo:visible, button:visible:has-text('Undo')").first();
  await expect(undo, "no receipt — the save may not have landed").toBeVisible({ timeout: 20_000 });
  /* the detail lands on the SUBSCRIPTION echo, a beat after the receipt — poll for it briefly,
     bounded WELL inside the toast's lifetime, and press regardless when the bound expires: a slow
     round-trip must cost a red, never a changed account (the standing measurement law). */
  let snap = { cards: 0, detail: false, tracking: false };
  for (let i = 0; i < 10; i++) {
    snap = await page.evaluate(() => ({
      cards: document.querySelectorAll(".qcc:not(.qcc--ghost)").length,
      detail: !!document.querySelector(".qpn[data-qpn-mode='detail']"),
      tracking: !!document.querySelector(".qpn-tab--on"),
    }));
    /* BOTH facts ride the same subscription echo — break only when both have landed */
    if (snap.detail && snap.cards === before + 1) break;
    await page.waitForTimeout(450);
  }
  await page.screenshot({ path: "reports/query-log-sheet-shots/post-save-detail-1440.png" });
  await undo.click();

  /* now the leisurely half — the account is already restored */
  out.savedDelta = { before, after: snap.cards, detail: snap.detail };
  expect(snap.cards, "the saved card did not arrive (or more than one did)").toBe(before + 1);
  expect(snap.detail, "the drawer did not crossfade to detail").toBe(true);
  await expect
    .poll(async () => page.evaluate(() => document.querySelectorAll(".qcc:not(.qcc--ghost)").length), { timeout: 15_000 })
    .toBe(before);
  writeFileSync("reports/query-log-sheet.json", JSON.stringify(out, null, 2));
});
