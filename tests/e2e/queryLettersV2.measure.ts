/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query letters v2 (12 Nov) — the letter desk, measured on the emulators. Ref: design-refs/query-letters-v2. Fixture:
 * tests/e2e/seedQueryLetters.mjs (Murphy's Day Out: cv25-let-1/2/3 and the draft ql1-draft; cv25-let-2 in use and sent).
 * QL2_SHOTS=<dir> writes the report's screenshots at 1440 and 1920.
 *
 *   npm run e2e:emu -- tests/e2e/queryLettersV2.measure.ts --project=measure --workers=1
 *
 * Locks (the brief's §5): QL2-1 header on the desk's grid · QL2-2 v1's surfaces gone · QL2-3 a row shows its letter ·
 * QL2-4 a sent letter cannot be written · QL2-5 edit, save, Undo · QL2-6 a new version of a sent letter · QL2-7 the
 * guard · QL2-8 the next-step card · QL2-9 square brackets · QL2-11 the phone redirect · QL2-12 contrast and sizes.
 * (QL2-10 is the `letterDiff` unit suite.) A lock that cannot find its subject FAILS: every population is counted first.
 * ⚠️ Writes are undone in the same run (the toast IS the undo, so nothing navigates between a write and its Undo).
 */
import { test, expect, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { openRoute } from "./measure";

const W1440 = { width: 1440, height: 900 };
const W1920 = { width: 1920, height: 1080 };
const SHOTS = process.env.QL2_SHOTS ?? "";
async function shot(page: Page, name: string) {
  if (!SHOTS) return;
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOTS}/${name}-${page.viewportSize()?.width}.png` });
}
async function openLetters(page: Page, msId: string, size = W1440) {
  await page.addInitScript((id) => { try { localStorage.setItem("scriptally_active_manuscript_id", id as string); } catch { /* */ } }, msId);
  await openRoute(page, "/materials/letters", size);
  await expect(page.locator('[data-ql="page"]')).toBeVisible({ timeout: 30_000 });
}
const P = (page: Page) => page.locator('[data-ql="page"]');
const row = (page: Page, id: string) => P(page).locator(`[data-ql="row"][data-id="${id}"]`);
const toast = (page: Page, text: string | RegExp) => page.locator(".sa-toast", { hasText: text });
const sheetText = (page: Page) => P(page).locator('[data-ql="sheet"]').innerText();
const leftOf = (page: Page, sel: string) => page.locator(sel).first().evaluate((e) => e.getBoundingClientRect().left);

test.describe.configure({ mode: "default" }); // independent: every lock reports its own red or green (one worker, in order; the seed is idempotent)
test.beforeAll(() => { execSync("node tests/e2e/seedQueryLetters.mjs", { stdio: "inherit" }); });

test("QL2-1 the header is the shared OpenHeader, its columns over the desk's", async ({ page }) => {
  for (const size of [W1440, W1920]) {
    await openLetters(page, "cv25-ms", size);
    const hd = P(page).locator('header.qc1531-hd[data-ql="header"]');
    await expect(hd).toHaveCount(1);
    await expect(hd.locator("h1.qc1531-t")).toHaveText(/^\d+ query letters?$/);
    await expect(P(page).locator('[data-ql="desk"]')).toBeVisible();
    const t = await leftOf(page, '[data-ql="page"] h1.qc1531-t');
    const mid = await leftOf(page, '[data-ql="page"] [data-ql="letter"]');
    /* v2.1: the third column holds the Top tip (it was v2's in-use block) */
    const use = await leftOf(page, '[data-ql="page"] [data-ql="tip-block"]');
    const rail = await leftOf(page, '[data-ql="page"] [data-ql="rail"]');
    const cols = await P(page).locator('[data-ql="desk"]').evaluate((e) => getComputedStyle(e).gridTemplateColumns);
    console.log(`[QL2-1] ${size.width}: title ${t} letter ${mid} in-use ${use} rail ${rail} desk "${cols}"`);
    expect(Math.abs(t - mid)).toBeLessThanOrEqual(1);
    expect(Math.abs(use - rail)).toBeLessThanOrEqual(1);
    await shot(page, "01-everyday");
  }
});

test("QL2-2 no chart or ring in the header, no card grid, no landing band", async ({ page }) => {
  await openLetters(page, "cv25-ms");
  /* the subject exists: the header's third column and the desk */
  await expect(P(page).locator('header[data-ql="header"] .qc1531-rc')).toHaveCount(1);
  await expect(P(page).locator('[data-ql="row"]').first()).toBeVisible();
  for (const probe of ['[data-ql="ring"]', '[data-ql="grid"]', '[data-ql="card"]', '#ql-landing', '[data-ql="landing"]', '[data-ql="jump"]', 'aside[data-hdr="letter"]']) {
    await expect(P(page).locator(probe), probe).toHaveCount(0);
  }
  expect(await P(page).locator('header[data-ql="header"] .qc1531-rc svg').count()).toBe(0);
});

test("QL2-3 selecting a row shows that letter in full with its own figures", async ({ page }) => {
  await openLetters(page, "cv25-ms");
  const n = await P(page).locator('[data-ql="row"]').count();
  expect(n).toBeGreaterThanOrEqual(4);
  /* the in-use letter is selected by default */
  /* v2.1: the in-use letter is the row with the flag (the header's in-use block is gone) */
  const useName = (await P(page).locator('[data-ql="row"]:has([data-ql="flag"]) .qlp-row-n').innerText()).trim();
  await expect(P(page).locator('[data-ql="row"][aria-current="true"]')).toContainText(useName);
  await row(page, "cv25-let-1").click();
  await expect(row(page, "cv25-let-1")).toHaveAttribute("aria-current", "true");
  await expect(P(page).locator('[data-ql="letter-name"]')).toHaveText(await row(page, "cv25-let-1").locator(".qlp-row-n").innerText());
  expect(await sheetText(page)).toContain("I am seeking representation for MURPHY'S DAY OUT");
  /* the row, the meta line and the cells read the same LetterFacts */
  const fig = (await row(page, "cv25-let-1").locator('[data-ql="row-figure"]').innerText()).trim();
  const meta = await P(page).locator('[data-ql="letter-meta"]').innerText();
  console.log(`[QL2-3] row "${fig}" meta "${meta}"`);
  const m = /(\d+) of (\d+) asked for more/.exec(fig);
  if (m) {
    await expect(P(page).locator('[data-ql="cell-sent"] b')).toHaveText(m[2]);
    await expect(P(page).locator('[data-ql="cell-more"] b')).toHaveText(m[1]);
    expect(meta).toContain(`sent with ${m[2]} quer`);
  } else {
    expect(fig).toBe("Not sent yet");
    expect(meta).toContain("not sent yet");
  }
});

test("QL2-4 a sent letter has no Edit and its text cannot be written", async ({ page }) => {
  await openLetters(page, "cv25-ms");
  await row(page, "cv25-let-2").click();
  await expect(P(page).locator('[data-ql="lock-line"]')).toBeVisible();
  await expect(P(page).locator('[data-ql="edit"]')).toHaveCount(0);
  await expect(P(page).locator('[data-ql="new-version"]')).toBeVisible();
  await expect(P(page).locator('[data-ql="letter"] textarea')).toHaveCount(0);
  const before = await sheetText(page);
  expect(before.length).toBeGreaterThan(50);
  expect(await P(page).locator('[data-ql="sheet"]').evaluate((e) => (e as HTMLElement).isContentEditable)).toBe(false);
  await P(page).locator('[data-ql="sheet"]').click();
  await page.keyboard.type(" WRITTEN");
  await page.keyboard.press("ControlOrMeta+s");
  await page.waitForTimeout(600);
  expect(await sheetText(page)).toBe(before);
  await shot(page, "02-sent");
  /* "Show what changed" on the sent letter, against its parent */
  const sw = P(page).locator('[data-ql="diff-switch"]');
  await expect(sw).toContainText("Show what changed from");
  await sw.click();
  await expect(sw).toHaveAttribute("aria-checked", "true");
  await expect(P(page).locator('[data-ql="diff-key"]')).toBeVisible();
  expect(await P(page).locator('[data-ql="sheet"] ins').count()).toBeGreaterThan(0);
  expect(await P(page).locator('[data-ql="sheet"] del').count()).toBeGreaterThan(0);
  await shot(page, "03-sent-diff");
});

test("QL2-5 edit a draft, save once with ⌘S, and Undo restores the snapshot", async ({ page }) => {
  await openLetters(page, "cv25-ms");
  await row(page, "ql1-draft").click();
  const before = await sheetText(page);
  await P(page).locator('[data-ql="edit"]').click();
  const ta = P(page).locator('[data-ql="ed-text"]');
  await expect(ta).toBeFocused();
  await expect(ta).toHaveAttribute("lang", "en-GB");
  await expect(P(page).locator('[data-ql="ed-status"]')).toContainText("No changes yet");
  await page.keyboard.type("\n\nA line written in the measurement.");
  await expect(P(page).locator('[data-ql="ed-status"]')).toContainText(/Unsaved changes · \d+ words · [\d,]+ characters/);
  await expect(P(page).locator('[data-ql="rail"]')).toContainText("While you write");
  await shot(page, "04-editor");
  await page.keyboard.press("ControlOrMeta+s");
  await expect(toast(page, "Saved Open on the harbour.")).toHaveCount(1);
  await expect(P(page).locator('[data-ql="ed-text"]')).toHaveCount(0);
  expect(await sheetText(page)).toContain("A line written in the measurement.");
  await expect(row(page, "ql1-draft")).toContainText("saved just now");
  await toast(page, "Saved Open on the harbour.").getByRole("button", { name: /undo/i }).click();
  await expect.poll(() => sheetText(page)).toBe(before);
});

test("QL2-7 unsaved changes + another row: the guard holds the selection until a choice is made", async ({ page }) => {
  await openLetters(page, "cv25-ms");
  await row(page, "ql1-draft").click();
  const draftBefore = await sheetText(page);
  await P(page).locator('[data-ql="edit"]').click();
  await expect(P(page).locator('[data-ql="ed-text"]')).toBeFocused();
  await page.keyboard.type(" Guarded.");
  await row(page, "cv25-let-1").click();
  const guard = P(page).locator('[data-ql="guard"]');
  await expect(guard).toBeVisible();
  await expect(guard).toContainText("You've changed this letter. Save it before you go?");
  await expect(P(page).locator('[data-ql="ed-text"]')).toBeVisible();
  await expect(row(page, "cv25-let-1")).toHaveAttribute("aria-current", "false");
  await expect(row(page, "ql1-draft")).toHaveAttribute("aria-current", "true");
  await expect(guard.locator('[data-ql="g-save"]')).toHaveClass(/qlp-b1/);
  await shot(page, "05-guard");
  /* Keep editing, then Esc raises it again, then Discard loses only the edit */
  await guard.locator('[data-ql="g-keep"]').click();
  await expect(guard).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(P(page).locator('[data-ql="guard"]')).toBeVisible();
  await P(page).locator('[data-ql="g-drop"]').click();
  await expect(P(page).locator('[data-ql="ed-text"]')).toHaveCount(0);
  expect(await sheetText(page)).toBe(draftBefore);
  /* Save then move */
  await P(page).locator('[data-ql="edit"]').click();
  await expect(P(page).locator('[data-ql="ed-text"]')).toBeFocused();
  await page.keyboard.type(" Saved by the guard.");
  await row(page, "cv25-let-1").click();
  await P(page).locator('[data-ql="g-save"]').click();
  await expect(row(page, "cv25-let-1")).toHaveAttribute("aria-current", "true");
  await toast(page, "Saved Open on the harbour.").getByRole("button", { name: /undo/i }).click();
  await row(page, "ql1-draft").click();
  await expect.poll(() => sheetText(page)).toBe(draftBefore);
});

test("QL2-9 square brackets: typing one adds it, removing it takes it off", async ({ page }) => {
  await openLetters(page, "cv25-ms");
  await row(page, "ql1-draft").click();
  await P(page).locator('[data-ql="edit"]').click();
  await expect(P(page).locator('[data-ql="ed-text"]')).toBeFocused();
  const gaps = P(page).locator('[data-ql="gaps"]');
  await expect(gaps.locator('[data-ql="gap"]')).toHaveText(["[Agent]"]);
  await page.keyboard.type(" [agent]");
  await expect(gaps.locator('[data-ql="gap"]')).toHaveText(["[Agent]", "[agent]"]);
  for (let i = 0; i < 8; i++) await page.keyboard.press("Backspace");
  await expect(gaps.locator('[data-ql="gap"]')).toHaveText(["[Agent]"]);
  await P(page).locator('[data-ql="ed-text"]').fill("Dear agent, nothing in brackets.");
  await expect(gaps).toContainText("Nothing left in square brackets.");
  await page.keyboard.press("Escape");
  await P(page).locator('[data-ql="g-drop"]').click();
  await expect(P(page).locator('[data-ql="ed-text"]')).toHaveCount(0);
});

test("QL2-6 + QL2-8 a new version of a sent letter, then the next-step card", async ({ page }) => {
  await openLetters(page, "cv25-ms");
  await row(page, "cv25-let-2").click();
  const parentText = await sheetText(page);
  const parentFig = await row(page, "cv25-let-2").locator('[data-ql="row-figure"]').innerText();
  const inUseName = () => P(page).locator('[data-ql="row"]:has([data-ql="flag"]) .qlp-row-n'); // v2.1: the flagged row
  const useBefore = (await inUseName().innerText()).trim();
  await P(page).locator('[data-ql="new-version"]').click();
  await expect(P(page).locator('[data-ql="row-new"]')).toContainText("Not saved yet · a copy of Query letter v2");
  await expect(P(page).locator('[data-ql="ed-status"]')).toContainText("Word for word the same as Query letter v2 so far");
  const name = (await P(page).locator('[data-ql="ed-name"]').inputValue()).trim();
  expect(name.length).toBeGreaterThan(0);
  await page.keyboard.type("\n\nA new closing line.");
  await P(page).locator('[data-ql="change-input"]').first().fill("A new closing line");
  await P(page).locator('[data-ql="save"]').click();
  const saved = toast(page, `Saved ${name} as a draft.`);
  await expect(saved).toHaveCount(1);
  const newRow = P(page).locator('[data-ql="row"]', { hasText: name });
  await expect(newRow).toHaveCount(1);
  await expect(newRow).toHaveAttribute("aria-current", "true");
  await expect(P(page).locator('[data-ql="letter-meta"]')).toContainText("not sent yet");
  await expect(P(page).locator('[data-ql="rail"] [data-ql="changes"]')).toContainText("A new closing line");
  await expect(P(page).locator('[data-ql="diff-switch"]')).toContainText("Show what changed from Query letter v2");
  /* QL2-8 the next-step card, only because the new letter is not in use */
  const card = P(page).locator('[data-ql="next-card"]');
  await expect(card).toContainText(`Saved as a draft.Send new queries with ${name} from now on? ${useBefore} keeps its results either way.`);
  await expect(P(page).locator('[data-ql="use"]')).toHaveCount(0);
  await shot(page, "06-next-step");
  await card.locator('[data-ql="next-use"]').click();
  await expect(inUseName()).toHaveText(name);
  await expect(card).toHaveCount(0);
  await toast(page, `New queries now go out with ${name}.`).getByRole("button", { name: /undo/i }).click();
  await expect(inUseName()).toHaveText(useBefore);
  /* the parent is unchanged */
  await row(page, "cv25-let-2").click();
  expect(await sheetText(page)).toBe(parentText);
  expect(await row(page, "cv25-let-2").locator('[data-ql="row-figure"]').innerText()).toBe(parentFig);
  /* and the new letter's own Undo removes it */
  const undo = saved.getByRole("button", { name: /undo/i });
  if (await undo.count()) await undo.click();
});

test("QL2-F day one", async ({ page }) => {
  for (const size of [W1440, W1920]) {
    await openLetters(page, "thin-ms", size);
    await expect(P(page).locator("h1.qc1531-t")).toHaveText("No query letters yet");
    await expect(P(page).locator('[data-ql="new"]')).toHaveCount(0);
    await expect(P(page).locator('[data-ql="first"]')).toContainText("Paste your letter, or upload it.");
    await expect(P(page).locator('[data-ql="first-save"]')).toBeVisible();
    await shot(page, "07-day-one");
  }
});

test("QL2-F3 loading: the skeleton at the columns' final sizes (render harness, the build's own CSS), no spinner", async ({ page }) => {
  /* the emulator cannot hold this state (holding Firestore holds the boot splash: sign-in waits on the user document),
     so the page's own loading markup is rendered by src/components/letters/qlRender.harness.test.tsx into a file that
     links every stylesheet the build emitted */
  const out = `${process.cwd()}/dist-emu/ql2-loading.html`;
  execSync("npx vitest run src/components/letters/qlRender.harness.test.tsx", { stdio: "inherit", env: { ...process.env, QL2_RENDER_OUT: out, QL2_RENDER_DIST: "dist-emu" } });
  for (const size of [W1440, W1920]) {
    await page.setViewportSize(size);
    await page.goto(`file://${out}`);
    const sk = page.locator('[data-ql="skeleton"]');
    await expect(sk).toBeVisible();
    const cols = await sk.evaluate((e) => getComputedStyle(e).gridTemplateColumns);
    const ground = await page.locator('[data-ql="page"]').evaluate((e) => getComputedStyle(e).backgroundImage);
    console.log(`[QL2-F3] ${size.width}: skeleton columns "${cols}"`);
    expect(cols.split(" ")[0]).toBe("280px");
    expect(cols.split(" ")[2]).toBe("380px");
    expect(ground).toContain("doodle-tile");
    await expect(page.locator('[role="progressbar"], .spinner, [class*="spin"]')).toHaveCount(0);
    await shot(page, "08-loading");
  }
});

test("QL2-F2 a Free writer sees Query letters read-only (plan rules v1)", async ({ page }) => {
  await page.addInitScript(() => { (window as unknown as { __SA_NAV_FREE?: boolean }).__SA_NAV_FREE = true; });
  await openLetters(page, "cv25-ms");
  const line = page.locator('[data-mlk="letters"] [data-mlk="read-only"]');
  await expect(line).toContainText("Your query letters are kept and readable on Free.");
  await expect(line.locator('[data-mlk="plans"]')).toHaveText("See Pro plans");
  await expect(page.locator('[data-mlk="letters"] [data-mlk="lock"]')).toHaveCount(0);
  expect(await page.locator('[data-mlk="letters"] .mlk-page').getAttribute("inert")).not.toBeNull();
});

test("QL2-11 below 768px the route still redirects to Materials on the phone", async ({ page }) => {
  /* signed in on the desktop first (openRoute waits for the desktop shell, which a phone never shows), then the phone */
  await openLetters(page, "cv25-ms");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/materials/letters");
  await expect(page).toHaveURL(/\/manuscripts#materials/, { timeout: 20_000 });
  await expect(page.locator('[data-ql="desk"]:visible')).toHaveCount(0);
});

test("QL2-12 contrast at least 4.5:1, no text under 12px, controls at least 32px tall", async ({ page }) => {
  await openLetters(page, "cv25-ms");
  await row(page, "cv25-let-2").click();
  const r = await P(page).evaluate((root) => {
    const parse = (c: string) => { const m = c.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0, 0]; return { r: m[0], g: m[1], b: m[2], a: m[3] ?? 1 }; };
    const lum = ({ r, g, b }: { r: number; g: number; b: number }) => {
      const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const bgOf = (el: Element | null): { r: number; g: number; b: number } => {
      const stack: { r: number; g: number; b: number; a: number }[] = [];
      for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c.a > 0) { stack.push(c); if (c.a >= 1) break; } }
      let out = { r: 245, g: 245, b: 243 };
      for (const c of stack.reverse()) out = { r: c.r * c.a + out.r * (1 - c.a), g: c.g * c.a + out.g * (1 - c.a), b: c.b * c.a + out.b * (1 - c.a) };
      return out;
    };
    const texts: { t: string; px: number; ratio: number }[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement!;
      if (!n.textContent?.trim() || !el.getClientRects().length) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || el.closest("[aria-hidden='true']")) continue;
      const fg = parse(cs.color);
      const bg = bgOf(el);
      const mix = { r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a) };
      const [a, b] = [lum(mix), lum(bg)].sort((x, y) => y - x);
      texts.push({ t: n.textContent.trim().slice(0, 40), px: parseFloat(cs.fontSize), ratio: (a + 0.05) / (b + 0.05) });
    }
    const controls = [...root.querySelectorAll("button, a[href], input:not([type=file]), textarea, [role=switch]")]
      .filter((e) => (e as HTMLElement).getClientRects().length)
      .map((e) => ({ t: (e.textContent || e.getAttribute("aria-label") || e.tagName).trim().slice(0, 40), h: e.getBoundingClientRect().height }));
    return { texts, controls };
  });
  expect(r.texts.length).toBeGreaterThan(30);
  expect(r.controls.length).toBeGreaterThan(10);
  const small = r.texts.filter((x) => x.px < 12);
  const low = r.texts.filter((x) => x.ratio < 4.5);
  const short = r.controls.filter((x) => x.h < 32);
  console.log("[QL2-12] texts", r.texts.length, "controls", r.controls.length, "small", JSON.stringify(small), "low", JSON.stringify(low), "short", JSON.stringify(short));
  expect(small).toEqual([]);
  expect(low).toEqual([]);
  expect(short).toEqual([]);
});
