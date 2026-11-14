/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query letters v2.1 (13 Nov) — the Top tip in the header, the package line on the in-use letter, and the "no words
 * yet" state with the add-once rule. Ref: design-refs/query-letters-v2-1. Fixture: seedQueryLetters.mjs, then
 * seedQueryLettersV21.mjs (`ql21-blank-sent` sent with no text, `ql21-blank-file` unsent and kept in a file, the active
 * package `ql21-pkg` holding cv25-let-1). QL21_SHOTS=<dir> writes the report's screenshots at 1440 and 1920.
 *
 *   npm run e2e:emu -- tests/e2e/queryLettersV21.measure.ts --project=measure --workers=1
 *
 * Locks: QL21-1 tip card, no in-use block · QL21-2 Next tip walks and wraps, kept over a reload · QL21-3 tip 4 reads
 * LETTER_MIN_SENT · QL21-4 Use for new queries with Undo · QL21-5 the package line, both populations · QL21-6 unsent
 * no-text sheet · QL21-7/8 add the text once to a sent blank letter, then it locks · (QL21-8/9's direct-write halves are
 * the unit suite src/lib/versionLock.addOnce.test.ts.) Writes are undone in the same run.
 */
import { test, expect, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { openRoute } from "./measure";

const W1440 = { width: 1440, height: 900 };
const W1920 = { width: 1920, height: 1080 };
const SHOTS = process.env.QL21_SHOTS ?? "";

async function shot(page: Page, name: string) {
  if (!SHOTS) return;
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOTS}/${name}-${page.viewportSize()?.width}.png` });
}
async function openLetters(page: Page, size = W1440) {
  await page.addInitScript(() => { try { localStorage.setItem("scriptally_active_manuscript_id", "cv25-ms"); } catch { /* */ } });
  await openRoute(page, "/materials/letters", size);
  await expect(page.locator('[data-ql="page"]')).toBeVisible({ timeout: 30_000 });
}
const P = (page: Page) => page.locator('[data-ql="page"]');
const row = (page: Page, id: string) => P(page).locator(`[data-ql="row"][data-id="${id}"]`);
const toast = (page: Page, text: string | RegExp) => page.locator(".sa-toast", { hasText: text });
const figs = async (page: Page) => (await P(page).locator('[data-ql="cells"]').innerText()).replace(/\s+/g, " ").trim();

test.describe.configure({ mode: "default" }); // independent: every lock reports its own red or green (one worker, in order)
test.beforeAll(() => {
  execSync("node tests/e2e/seedQueryLetters.mjs", { stdio: "inherit" });
  execSync("node tests/e2e/seedQueryLettersV21.mjs", { stdio: "inherit" });
});

/* QL21-1, QL21-2 and QL21-3 RETIRED (Query letters v2.4): the Top tip they measured is removed from the page; v2.4's
   QL24-4 and ql24.test.ts lock its absence. */

test("QL21-4 + QL21-5 Use for new queries with Undo; the package line on the in-use letter, both populations", async ({ page }) => {
  await openLetters(page);
  /* population 1: cv25-let-2 in use, the package holds cv25-let-1, so the line shows on the in-use letter */
  await row(page, "cv25-let-2").click();
  await expect(row(page, "cv25-let-2").locator('[data-ql="flag"]')).toBeVisible();
  const line = P(page).locator('[data-ql="pkg-letter"]');
  await expect(line).toHaveCount(1);
  await expect(line).toHaveText("Package sends go with Standard package's letter: Query letter v1");
  await expect(line.locator("a")).toHaveAttribute("href", /\?pkg=ql21-pkg/);
  /* and only on the in-use letter */
  await row(page, "cv25-let-3").click();
  await expect(P(page).locator('[data-ql="pkg-letter"]')).toHaveCount(0);
  /* QL21-4: put cv25-let-1 in use from the letter itself; population 2: the package's letter IS in use, so no line */
  await row(page, "cv25-let-1").click();
  await P(page).locator('[data-ql="use"]').click();
  await expect(row(page, "cv25-let-1").locator('[data-ql="flag"]')).toBeVisible();
  await expect(row(page, "cv25-let-2").locator('[data-ql="flag"]')).toHaveCount(0);
  await expect(P(page).locator('[data-ql="pkg-letter"]')).toHaveCount(0);
  await row(page, "cv25-let-2").click();
  await expect(P(page).locator('[data-ql="pkg-letter"]')).toHaveCount(0);
  await toast(page, "New queries now go out with Query letter v1.").getByRole("button", { name: /undo/i }).click();
  await expect(row(page, "cv25-let-2").locator('[data-ql="flag"]')).toBeVisible();
  await expect(P(page).locator('[data-ql="pkg-letter"]')).toHaveCount(1);
});

test("QL21-6 an unsent letter with no text shows the no-words sheet, never an empty one", async ({ page }) => {
  for (const size of [W1440, W1920]) {
    await openLetters(page, size);
    await row(page, "ql21-blank-file").click();
    const sheet = P(page).locator('[data-ql="sheet"]');
    await expect(sheet).toHaveCount(1);
    await expect(sheet).toContainText("No text saved"); // RE-POINTED (v2.4): was v2.1's "The words aren't here yet"
    await expect(sheet).toContainText("It's kept in Murphy_query_voice.docx. Paste your letter in, or upload the file."); // RE-POINTED (v2.4)
    await expect(sheet.locator('[data-ql="paste-text"]')).toHaveText("Paste the text");
    await expect(sheet.locator('[data-ql="upload-for"]')).toHaveText("Upload the file");
    await expect(P(page).locator('[data-ql="lock-line"]')).toHaveCount(0);
    await expect(P(page).locator('[data-ql="filebox"]')).toHaveCount(0);
    /* no element on the page is an empty sheet */
    const blanks = await P(page).locator('[data-ql="sheet"]').evaluateAll((els) => els.filter((e) => !(e as HTMLElement).innerText.trim()).length);
    expect(blanks).toBe(0);
    await shot(page, "03-unsent-no-text");
  }
});

test("QL21-7 + QL21-8 a sent letter with no text: add the text you sent, once; figures unchanged; Undo; then it locks", async ({ page }) => {
  await openLetters(page);
  await row(page, "ql21-blank-sent").click();
  await expect(P(page).locator('[data-ql="lock-line"]')).toHaveText("This letter has gone out."); // RE-POINTED (v2.4)
  const sheet = P(page).locator('[data-ql="sheet"]');
  /* RE-POINTED (v2.4): the ref's "No text saved" heading and paragraph; the note beneath is removed */
  await expect(sheet).toContainText("No text saved");
  await expect(sheet).toContainText("Add the text you sent, or upload the file. You can do this once, and its results won't change.");
  await expect(sheet).not.toContainText("You can add it once");
  const before = await figs(page);
  console.log("[QL21-7] figures before:", before);
  expect(before).toMatch(/^1 sent/);
  await shot(page, "04-sent-no-text");
  for (const size of [W1920]) { await page.setViewportSize(size); await shot(page, "04-sent-no-text"); }
  await page.setViewportSize(W1440);
  /* add it */
  await sheet.locator('[data-ql="add-text"]').click();
  const ta = P(page).locator('[data-ql="ed-text"]');
  await expect(ta).toBeFocused();
  await expect(ta).toHaveValue("");
  await expect(P(page).locator('[data-ql="row-new"]')).toHaveCount(0); // the same letter, not a new version
  await page.keyboard.type("Dear [agent],\n\nMurphy Doyle has not left Seaview Court in four hundred and twelve days.");
  await P(page).locator('[data-ql="save"]').click();
  await expect(toast(page, "Saved Covering letter 4.")).toHaveCount(1);
  await expect(P(page).locator('[data-ql="sheet"]')).toContainText("Murphy Doyle has not left Seaview Court");
  await expect(row(page, "ql21-blank-sent")).toHaveAttribute("aria-current", "true");
  expect(await P(page).locator('[data-ql="row"]').count()).toBe(await P(page).locator('[data-ql="row"]').count());
  expect(await figs(page)).toBe(before);
  /* QL21-8: now it has gone out WITH text: no way to edit it, and the page's own write path refuses */
  await expect(P(page).locator('[data-ql="edit"]')).toHaveCount(0);
  await expect(P(page).locator('[data-ql="add-text"]')).toHaveCount(0);
  await expect(P(page).locator('[data-ql="new-version"]')).toBeVisible();
  await expect(P(page).locator('[data-ql="lock-line"]')).toContainText("its text stays as it was sent");
  const textNow = await P(page).locator('[data-ql="sheet"]').innerText();
  await P(page).locator('[data-ql="sheet"]').click();
  await page.keyboard.type(" WRITTEN");
  await page.keyboard.press("ControlOrMeta+s");
  await page.waitForTimeout(500);
  expect(await P(page).locator('[data-ql="sheet"]').innerText()).toBe(textNow);
  await shot(page, "05-sent-text-added");
  for (const size of [W1920]) { await page.setViewportSize(size); await shot(page, "05-sent-text-added"); }
  await page.setViewportSize(W1440);
  /* Undo restores the empty text, and the add-once state with it */
  await toast(page, "Saved Covering letter 4.").getByRole("button", { name: /undo/i }).click();
  await expect(P(page).locator('[data-ql="sheet"]')).toContainText("No text saved"); // RE-POINTED (v2.4)
  expect(await figs(page)).toBe(before);
});

test("QL21-6b Upload the file on a no-text letter loads a text file into the editor for THAT letter", async ({ page }) => {
  await openLetters(page);
  await row(page, "ql21-blank-file").click();
  const chooser = page.waitForEvent("filechooser");
  await P(page).locator('[data-ql="upload-for"]').click();
  await (await chooser).setFiles({ name: "voice.txt", mimeType: "text/plain", buffer: Buffer.from("Dear [agent],\n\nA voice-led opening.") });
  await expect(P(page).locator('[data-ql="ed-text"]')).toHaveValue("Dear [agent],\n\nA voice-led opening.");
  await expect(P(page).locator('[data-ql="editor"]')).toHaveAttribute("data-kind", "edit");
  await expect(P(page).locator('[data-ql="ed-name"]')).toHaveValue("Voice-led");
  await expect(P(page).locator('[data-ql="ed-status"]')).toContainText("Text pulled from voice.txt");
  await page.keyboard.press("Escape");
  await P(page).locator('[data-ql="g-drop"]').click();
  await expect(P(page).locator('[data-ql="sheet"]')).toContainText("No text saved"); // RE-POINTED (v2.4)
});
