/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v62 — the rendered page, measured on the emulator (`npm run e2e:emu -- tests/e2e/pk62.measure.ts`).
 * Read-only: nothing here writes, so nothing needs restoring. Screens go to reports/submission-packages-v62/shots/,
 * readings to reports/submission-packages-v62/readings.json.
 *
 * The harness's three manuscripts give the three states:
 *   seed-ms-1      everyday: sent packages (one retired), queries logged with them
 *   cv25-ms        nothing sent yet: four packages, no query logged with any
 *   cv25-ms-empty  day one: no package at all
 *
 *   P1  everyday, 1680: the header, the list (one aria-current), the open package, What came back with a StatusDot per
 *       query, the table; no "%" anywhere on the page; no green painted in the page
 *   P2  a retired package opened from the table: the retired list shows it, read-only, with the retired lock line
 *   P3  an unsent package (deep link): no What came back, its foot, dashes in its table row
 *   P4  day one: the storyboard card, no list, no table
 *   P5  How it works: opens with focus on Got it, Tab stays inside, Escape closes and focus goes back to the button
 *   P6  the New package drawer: the brief's words; Escape closes and focus goes back
 *   P7  an unsent package's piece list opens as a radio group under its row
 *   P8  nothing scrolls sideways at 1280, 900, 800 and 768 (below 768 the app shows the phone page instead)
 */
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

test.describe.configure({ mode: "serial" });
test.setTimeout(300_000);
const DIR = "reports/submission-packages-v62";
const SHOTS = `${DIR}/shots`;
mkdirSync(SHOTS, { recursive: true });
const READ: Record<string, unknown> = {};
test.afterAll(() => { writeFileSync(`${DIR}/readings.json`, JSON.stringify(READ, null, 1)); });

const ROUTE = "/queries/packages";
const ROOT = "[data-pk62='page']";
const withMs = async (page: Page, id: string) => {
  await page.addInitScript((m) => { try { localStorage.setItem("scriptally_active_manuscript_id", m); } catch { /* private */ } }, id);
};
const visible = (page: Page, sel: string) => page.locator(sel).locator("visible=true");
const go = async (page: Page, ms: string, vp = { width: 1680, height: 1050 }, search = "") => {
  await withMs(page, ms);
  await openRoute(page, `${ROUTE}${search}`, vp);
  await expect(visible(page, ROOT).first()).toBeVisible({ timeout: 30_000 });
};
const shot = async (page: Page, name: string, full = true) => { await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: full }); };

/** Every painted colour in the page, as [r, g, b]; a "green" is a colour whose green channel leads both others by 24+. */
const greens = (page: Page) => page.evaluate((root) => {
  const el = [...document.querySelectorAll<HTMLElement>(root)].find((x) => x.offsetParent !== null);
  if (!el) return ["no root"];
  const out: string[] = [];
  const parse = (c: string) => (c.match(/\d+(\.\d+)?/g) ?? []).map(Number);
  for (const n of [el, ...el.querySelectorAll<HTMLElement>("*")]) {
    const cs = getComputedStyle(n);
    for (const prop of ["color", "backgroundColor", "borderTopColor", "fill", "stroke"] as const) {
      const v = cs[prop];
      const [r, g, b, a = 1] = parse(v);
      if (a > 0.05 && g - r >= 24 && g - b >= 24) out.push(`${n.tagName}.${n.className} ${prop} ${v}`);
    }
  }
  return out.slice(0, 10);
}, ROOT);

const sideways = (page: Page) => page.evaluate(() => {
  const sc = document.querySelector<HTMLElement>(".wpg-scroll");
  return {
    doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    scroller: sc ? sc.scrollWidth - sc.clientWidth : null,
  };
});

test("P1 — everyday, 1680", async ({ page }) => {
  await go(page, "seed-ms-1");
  const root = visible(page, ROOT).first();
  const title = await visible(page, "[data-pk62='title']").first().innerText();
  const rows = await visible(page, "[data-pk62-row]").count();
  const current = await visible(page, "[data-pk62-row][aria-current='true']").count();
  const state = await root.getAttribute("data-pk62-state");
  const text = await root.innerText();
  const note = await visible(page, "[data-pk62='note']").count();
  const pro = await visible(page, "[data-pk62='pro-tag']").count();
  READ.P1 = { title, rows, current, state, note, pro, percent: /\d\s?%/.test(text), green: await greens(page) };
  expect(state).toBe("sent");
  expect(current).toBe(1);
  expect(rows).toBeGreaterThan(0);
  expect(/\d\s?%/.test(text), "no percentages on this page").toBe(false);
  expect(await greens(page), "no green painted on this page").toEqual([]);
  await shot(page, "01-everyday-full-page");
  await shot(page, "02-everyday-top", false);
  /* open a package that has gone out, so What came back shows */
  const sent = visible(page, "[data-pk62-tr]").first();
  await sent.click();
  await page.waitForTimeout(400);
  const back = visible(page, "[data-pk62='back']");
  const hasBack = await back.count();
  const dots = hasBack ? await back.locator("[data-pk62='who'] li svg").count() : 0;
  const whoRows = hasBack ? await back.locator("[data-pk62='who'] li").count() : 0;
  READ.P1b = { hasBack, whoRows, dots, verdict: hasBack ? await back.locator("[data-pk62='verdict']").innerText() : null };
  expect(hasBack).toBe(1);
  expect(dots, "one StatusDot per query").toBe(whoRows);
  await shot(page, "01b-everyday-what-came-back");
});

test("P2 — a retired package, opened from the table", async ({ page }) => {
  await go(page, "seed-ms-1");
  const row = visible(page, "[data-pk62-tr]").filter({ hasText: "Retired" }).first();
  expect(await row.count()).toBe(1);
  await row.focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  const pill = await visible(page, "[data-pk62='retired-pill']").count();
  const lock = await visible(page, "[data-pk62='lock-line']").first().innerText();
  const toggle = await visible(page, "[data-pk62='retired-toggle']").first().innerText();
  const steps = await visible(page, "[data-pk62='open'] [data-pk62-step]").count();
  READ.P2 = { pill, lock, toggle, steps };
  expect(pill).toBe(1);
  expect(lock).toContain("Retired, so it can’t be changed.");
  expect(toggle).toBe("Hide retired");
  expect(steps, "no controls on a retired package").toBe(0);
  await shot(page, "05-retired-package", false);
});

/* ⚠️ NO HARNESS MANUSCRIPT IS WHOLLY UNSENT (every one has a query logged with some package), so the page-wide "nothing
   sent yet" state is held by materialsPageSmoke; here, the one unsent package, opened by its deep link. */
test("P3 — an unsent package: no What came back, its foot, dashes in its table row", async ({ page }) => {
  await go(page, "cv25-ms", undefined, "?pkg=cv25-pkg-coast");
  const open = visible(page, "[data-pk62='open']").first();
  const id = await open.getAttribute("data-pk62-id");
  const back = await visible(page, "[data-pk62='back']").count();
  const foot = await visible(page, "[data-pk62='foot']").first().innerText();
  const dashes = await visible(page, "[data-pk62-tr='cv25-pkg-coast'] td").filter({ hasText: /^–$/ }).count();
  const row = await visible(page, "[data-pk62-row='cv25-pkg-coast'] [data-pk62='row-result']").first().innerText();
  READ.P3 = { id, back, foot, dashes, row };
  expect(id).toBe("cv25-pkg-coast");
  expect(back).toBe(0);
  expect(foot).toBe("A package needs a letter and a sample before it can go out.");
  expect(dashes).toBe(3);
  expect(row).toBe("Needs a manuscript version");
  await shot(page, "10-unsent-package", false);
});

test("P4 — day one", async ({ page }) => {
  await go(page, "cv25-ms-empty");
  const state = await visible(page, ROOT).first().getAttribute("data-pk62-state");
  const card = await visible(page, "[data-pk62='day-one']").count();
  const list = await visible(page, "[data-pk62='list']").count();
  const table = await visible(page, "[data-pk62='table']").count();
  const btn = await visible(page, "[data-pk62='new']").first().innerText();
  READ.P4 = { state, card, list, table, btn };
  expect(state).toBe("day-one");
  expect(card).toBe(1);
  expect(list + table).toBe(0);
  expect(btn).toBe("+ Make your first package");
  await shot(page, "11-day-one-full-page");
});

test("P5 — How it works: focus in, Tab trapped, Escape out, focus back", async ({ page }) => {
  await go(page, "seed-ms-1");
  const how = visible(page, "[data-pk62='how']").first();
  await how.click();
  const dialog = page.locator("[data-pk62='how'][role='dialog']");
  await expect(dialog).toBeVisible();
  const focusOk = await page.evaluate(() => document.activeElement?.getAttribute("data-pk62"));
  for (let i = 0; i < 4; i++) await page.keyboard.press("Tab");
  const inside = await page.evaluate(() => !!document.activeElement?.closest("[data-pk62='how-layer']"));
  await shot(page, "08-how-it-works", false);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  const back = await page.evaluate(() => document.activeElement?.getAttribute("data-pk62"));
  READ.P5 = { focusOk, inside, back };
  expect(focusOk).toBe("how-ok");
  expect(inside).toBe(true);
  expect(back).toBe("how");
});

test("P6 — the New package drawer", async ({ page }) => {
  await go(page, "seed-ms-1");
  await visible(page, "[data-pk62='new']").first().click();
  const drawer = page.locator("[data-pk62='drawer']");
  await expect(drawer).toBeVisible();
  const words = await drawer.innerText();
  const focus = await page.evaluate(() => document.activeElement?.getAttribute("data-pk62"));
  await shot(page, "09-new-package-drawer", false);
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
  const back = await page.evaluate(() => document.activeElement?.getAttribute("data-pk62"));
  READ.P6 = { focus, back, hasWords: words.includes("Name it, then pick its pieces on the page.") && words.includes("Create package") };
  expect(focus).toBe("d-name");
  expect(back).toBe("new");
  expect(READ.P6).toMatchObject({ hasWords: true });
});

test("P7 — an unsent package's piece list", async ({ page }) => {
  await go(page, "cv25-ms", undefined, "?pkg=cv25-pkg-coast");
  const step = visible(page, "[data-pk62='open'] [data-pk62-step='let']").first();
  expect(await step.count()).toBe(1);
  await step.click();
  const group = visible(page, "[data-pk62-opts='let'] [role='radiogroup']");
  const radios = await group.locator("[role='radio']").count();
  const label = await step.innerText();
  READ.P7 = { radios, label, expanded: await step.getAttribute("aria-expanded") };
  expect(label).toBe("Close");
  await shot(page, "03-unsent-package-choosing-a-letter", false);
  await page.keyboard.press("Escape");
  await expect(visible(page, "[data-pk62-opts='let']")).toHaveCount(0);
  /* the Change picker */
  const change = visible(page, "[data-pk62='change']").first();
  if (await change.count()) {
    await change.click();
    await expect(visible(page, "[data-pk62='change-menu']")).toHaveCount(1);
    await shot(page, "07-change-package-for-new-queries", false);
    await page.keyboard.press("Escape");
  }
});

/* ⚠️ BELOW 768 THE APP SHOWS THE PHONE PAGE (phone/pages/PageRoutes: PackagesRoute → PackagesPhone), not this one; the
   desktop page's narrowest real width is 768. */
for (const w of [1280, 900, 800, 768]) {
  test(`P8 — nothing scrolls sideways at ${w}`, async ({ page }) => {
    /* openRoute waits for the desktop shell, which the phone layout hides: sign in at 1280, then narrow and reload */
    await go(page, "seed-ms-1", { width: 1280, height: 900 });
    if (w < 1280) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.reload();
      await expect(visible(page, ROOT).first()).toBeVisible({ timeout: 30_000 });
      await page.waitForTimeout(1500);
    }
    const s1 = await sideways(page);
    await visible(page, "[data-pk62-tr]").first().click();
    await page.waitForTimeout(300);
    const s2 = await sideways(page);
    READ[`P8_${w}`] = { s1, s2 };
    for (const s of [s1, s2]) {
      expect(s.doc, `the document at ${w}`).toBeLessThanOrEqual(0);
      if (s.scroller != null) expect(s.scroller, `the page scroller at ${w}`).toBeLessThanOrEqual(0);
    }
    if (w === 1280) await shot(page, "12-laptop-1280-full-page");
    if (w === 768) await shot(page, "13-narrowest-768-full-page");
  });
}
