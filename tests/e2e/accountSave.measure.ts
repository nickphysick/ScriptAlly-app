/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The hybrid save model — MEASURED, because the claim spans three components.
 *
 * ⚠️ THE UNIT SUITE PROVES `saveSignal` COUNTS AND THAT `saveWhisper` HAS THREE STRINGS. It
 * cannot prove that typing in this input reaches that counter, or that the words come out on the
 * top bar — that runs through `useDirtyField`, a `useSyncExternalStore` subscription and a shell
 * component none of these files import. Landed in code is not landed on the page.
 *
 *   npm run build:dev && npx vite preview --port 4173 &
 *   SA_E2E_BASE_URL=http://localhost:4173 npx playwright test accountSave
 *
 * ⚠️ IT WRITES TO THE HARNESS ACCOUNT and puts the display name back at the end.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const NAME = "#account-name";
/* ⚠️ SCOPED TO `#acct-panel`. Workspace pages stay MOUNTED across navigation (display toggling),
   so a bare `button:has-text("Save")` also matches Query Centre's composer button sitting hidden
   in the same document — strict mode caught it, but a `.first()` would have clicked the wrong
   page's control and reported success. */
const SAVE = '#acct-panel button:has-text("Save")';
const DISCARD = '#acct-panel button:has-text("Discard")';

/** The top bar's status whisper, wherever it sits. */
const whisper = (page: import("@playwright/test").Page) =>
  page.evaluate(() => {
    const el = [...document.querySelectorAll("span,div,p")].find(
      (e) => /^(All changes saved|Unsaved changes|Saving…)$/i.test((e.textContent ?? "").trim()),
    );
    return el ? (el.textContent ?? "").trim() : null;
  });

test("the Save/Discard row is ABSENT until the field diverges, and Discard restores", async ({ page }) => {
  await openRoute(page, "/account/profile", { width: 1440, height: 900 });
  const saved = await page.inputValue(NAME);

  expect(await page.locator(SAVE).count(), "no Save button at rest").toBe(0);
  expect(await page.locator(DISCARD).count(), "no Discard button at rest").toBe(0);
  expect((await whisper(page))?.toLowerCase()).toBe("all changes saved");

  await page.fill(NAME, saved + " EDITED");
  await page.waitForTimeout(300);
  expect(await page.locator(SAVE).count(), "Save arrives with the divergence").toBe(1);
  expect(await page.locator(DISCARD).count()).toBe(1);
  console.log("whisper while dirty:", await whisper(page));
  expect((await whisper(page))?.toLowerCase()).toBe("unsaved changes");

  /* ⚠️ TYPING BACK TO THE STORED VALUE IS NOT AN EDIT. The row must retreat on equality, not on
     "the field was touched" — the latter leaves a Save button offering to write what is already
     there. */
  await page.fill(NAME, saved);
  await page.waitForTimeout(300);
  expect(await page.locator(SAVE).count(), "typing back to the stored value clears it").toBe(0);
  expect((await whisper(page))?.toLowerCase()).toBe("all changes saved");

  await page.fill(NAME, saved + " EDITED");
  await page.waitForTimeout(300);
  await page.locator(DISCARD).click();
  await page.waitForTimeout(400);
  expect(await page.inputValue(NAME), "Discard restores the stored value").toBe(saved);
  expect(await page.locator(SAVE).count()).toBe(0);
  expect((await whisper(page))?.toLowerCase()).toBe("all changes saved");
});

test("Save commits, re-baselines, and the bar goes clean", async ({ page }) => {
  await openRoute(page, "/account/profile", { width: 1440, height: 900 });
  const original = await page.inputValue(NAME);
  const edited = `${original} ✎`;

  await page.fill(NAME, edited);
  await page.waitForTimeout(250);
  await page.locator(SAVE).click();
  await page.waitForTimeout(2500);

  expect(await page.locator(SAVE).count(), "the row retreats after Save").toBe(0);
  expect((await whisper(page))?.toLowerCase()).toBe("all changes saved");

  /* It survives a reload — proof the write reached Firestore rather than only React state. */
  await page.reload();
  await page.waitForTimeout(3500);
  expect(await page.inputValue(NAME)).toBe(edited);

  // put it back
  await page.fill(NAME, original);
  await page.waitForTimeout(250);
  await page.locator(SAVE).click();
  await page.waitForTimeout(2500);
  expect(await page.inputValue(NAME)).toBe(original);
});

test("leaving a section with a dirty field warns and CONTINUES — never blocks, never discards", async ({ page }) => {
  await openRoute(page, "/account/profile", { width: 1440, height: 900 });
  const saved = await page.inputValue(NAME);
  await page.fill(NAME, saved + " UNSAVED");
  await page.waitForTimeout(250);

  await page.locator("#acct-tab-preferences").click();
  await page.waitForTimeout(700);

  const url = new URL(page.url()).pathname;
  /* ⚠️ READ THE TOAST'S OWN ELEMENT. Scanning every element's textContent matches <body> too,
     and slicing that gives the top of the PAGE — the probe reported the masthead and called it a
     missing toast. */
  const toast = await page.evaluate(() =>
    [...document.querySelectorAll(".sa-toast")].map((e) => (e.textContent ?? "").trim()));
  console.log("after leaving dirty →", url, "| toasts:", JSON.stringify(toast));

  expect(url, "navigation must go through").toBe("/account/preferences");
  expect(toast.join(" | "), "and it must say what was left behind").toContain("not saved yet");
  expect((await whisper(page))?.toLowerCase(), "the bar keeps telling the truth").toBe("unsaved changes");

  /* ⚠️ AND THE TEXT IS STILL THERE ON RETURN. "Warns and continues" is worthless if the value was
     dropped on the way out — that is the one outcome the writer cannot recover from. */
  await page.locator("#acct-tab-profile").click();
  await page.waitForTimeout(700);
  expect(await page.inputValue(NAME)).toBe(saved + " UNSAVED");

  await page.locator(DISCARD).click();
  await page.waitForTimeout(400);
  expect((await whisper(page))?.toLowerCase()).toBe("all changes saved");
});

test("the home-country dropdown is the app's own control, not a native select", async ({ page }) => {
  await openRoute(page, "/account/profile", { width: 1440, height: 900 });
  const shape = await page.evaluate(() => {
    const el = document.querySelector("#account-homecountry");
    return el ? { tag: el.tagName.toLowerCase(), role: el.getAttribute("role") } : null;
  });
  console.log("home country control:", JSON.stringify(shape));
  expect(shape, "#account-homecountry must exist").not.toBeNull();
  expect(shape!.tag, "a native <select> would take the OS menu into a Form 11 card").not.toBe("select");

  /* No Save button anywhere near it — an instant-commit control never grows one. */
  const country = await page.evaluate(() => {
    const el = document.querySelector("#account-homecountry")!;
    const row = el.closest("div")!.parentElement!;
    return row.textContent ?? "";
  });
  expect(country.toLowerCase()).not.toContain("save");
});
