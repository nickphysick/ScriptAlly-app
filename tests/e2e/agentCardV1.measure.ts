/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Agent card v1 — the rendered locks, phase by phase (design authority:
 * design-refs/agent-card-housekeeping-v7.html, measured at 1440×900 and 1280×800).
 *
 * Phase 1: the card is APP-LEVEL — one host, opened through the store, over any route; a row
 * carries the list's own order; the card no longer closes when its agent leaves the filter; and
 * Escape goes through ONE stack, so a list open inside the card closes before the card hears it.
 *
 * ⚠️ EVERY /agents PROBE GOES THROUGH `visiblePage` — every workspace page stays mounted, and
 * `document.querySelector` answers about whichever copy is first in the DOM.
 */
import { expect, test, type Page } from "@playwright/test";
import { assertLocalBundleIsDev } from "./bundleGuard";
import { openRoute, visiblePage } from "./measure";

let asserts = 0;
let ran = 0;
const bump = (n = 1) => { asserts += n; };

test.beforeAll(async () => { await assertLocalBundleIsDev(); });
test.beforeEach(() => { ran += 1; });
test.afterAll(() => {
  // eslint-disable-next-line no-console
  console.log(`[agentCardV1] assertions run: ${asserts} across ${ran} tests (this worker)`);
  /* ⚠️ THE FLOOR — a suite that finds no subject fails in the language of a failure, never as a
     shorter green; it scales with the tests this worker ran (the per-worker counter). */
  if (asserts < ran * 2) throw new Error(`agentCardV1 ran only ${asserts} assertions across ${ran} tests — a subject went missing`);
});

type Req = { agentId: string | null; tab?: string; focus?: string; from?: string; sequence?: string[] } | null;
const handle = (page: Page) => ({
  open: (id: string, opts?: Record<string, unknown>) =>
    page.evaluate(([id, opts]) => (window as unknown as { __saAgentCard: { open: (i: string, o?: unknown) => void } }).__saAgentCard.open(id as string, opts), [id, opts ?? {}] as const),
  current: () => page.evaluate(() => (window as unknown as { __saAgentCard: { current: () => Req } }).__saAgentCard.current()),
  close: () => page.evaluate(() => (window as unknown as { __saAgentCard: { close: () => void } }).__saAgentCard.close()),
});

/** the rendered rows' ids, in order, on the VISIBLE Contact list */
const rowIds = (page: Page, scope: string) =>
  page.evaluate((scope) => Array.from(document.querySelectorAll<HTMLElement>(`${scope} [data-clv="row"][data-agent-card]`)).map((r) => r.dataset.agentCard!), scope);

test.describe("phase 1 — the card is app-level", () => {
  test("opened through the store over the Query Centre, it renders that agent's card — and Escape closes it", async ({ page }) => {
    await openRoute(page, "/agents", { width: 1440, height: 900 });
    const scope = await visiblePage(page, ".agl-wpg");
    const first = await page.evaluate((scope) => {
      const r = document.querySelector<HTMLElement>(`${scope} [data-clv="row"][data-agent-card]`);
      return r ? { id: r.dataset.agentCard!, name: (r.querySelector(".clv-rwho b")?.textContent ?? "").trim() } : null;
    }, scope);
    expect(first, "no row on the Contact list to open").not.toBeNull();
    bump();
    if (!first) return;

    await openRoute(page, "/queries", { width: 1440, height: 900 });
    expect(await page.locator('[data-clv="profile"]').count(), "a card is open before anything asked for one").toBe(0);
    await handle(page).open(first.id);
    const card = page.locator('[data-clv="profile"]');
    await expect(card, "the store opened nothing over the Query Centre — the host is not app-level").toBeVisible({ timeout: 10_000 });
    /* the row and the card both name the agent through `agentPrimary` — so equality, not a likeness */
    expect(first.name.length, "the row named no agent").toBeGreaterThan(0);
    expect(await card.getAttribute("aria-label"), "the card over the Query Centre is not the agent the store was asked for").toBe(first.name);
    await page.keyboard.press("Escape");
    await expect(card, "Escape did not close the card").toHaveCount(0, { timeout: 5_000 });
    bump(4);
  });

  test("a row opens the card carrying the list's own order — and, under Find, the narrowed order", async ({ page }) => {
    await openRoute(page, "/agents", { width: 1440, height: 900 });
    const scope = await visiblePage(page, ".agl-wpg");
    const all = await rowIds(page, scope);
    expect(all.length, "too few rows to say anything about an order").toBeGreaterThan(3);
    await page.click(`${scope} [data-clv="row"][data-agent-card="${all[1]}"]`);
    await expect(page.locator('[data-clv="profile"]')).toBeVisible();
    const r1 = await handle(page).current();
    expect(r1?.agentId, "the row opened a different agent").toBe(all[1]);
    expect(r1?.from).toBe("row");
    expect(r1?.sequence, "the card was not handed the list's rendered order").toEqual(all);
    await handle(page).close();
    await expect(page.locator('[data-clv="profile"]')).toHaveCount(0);

    /* narrow: the first three letters of the first row's agency or name — a real subset */
    const term = await page.evaluate((scope) => {
      const r = document.querySelector<HTMLElement>(`${scope} [data-clv="row"]`);
      return (r?.innerText ?? "").trim().split(/\s+/)[0].slice(0, 4);
    }, scope);
    await page.fill(`${scope} [data-clv="find"] input`, term);
    await page.waitForTimeout(300);
    const narrowed = await rowIds(page, scope);
    expect(narrowed.length, `Find "${term}" did not narrow the list`).toBeLessThan(all.length);
    expect(narrowed.length).toBeGreaterThan(0);
    await page.click(`${scope} [data-clv="row"][data-agent-card="${narrowed[0]}"]`);
    await expect(page.locator('[data-clv="profile"]')).toBeVisible();
    const r2 = await handle(page).current();
    expect(r2?.sequence, "under Find the card must step through the NARROWED order").toEqual(narrowed);
    await handle(page).close();
    bump(8);
  });

  test("the card stays open when its agent is outside the list's filter", async ({ page }) => {
    await openRoute(page, "/agents", { width: 1440, height: 900 });
    const scope = await visiblePage(page, ".agl-wpg");
    const all = await rowIds(page, scope);
    const target = all[all.length - 1];
    /* a Find term that keeps the FIRST row and drops the last — then open the last one anyway,
       the way a Housekeeping row or a task can (they read every agent, not the filtered view) */
    const term = await page.evaluate(([scope, a, b]) => {
      const text = (id: string) => (document.querySelector<HTMLElement>(`${scope} [data-agent-card="${id}"]`)?.innerText ?? "").toLowerCase();
      const ta = text(a); const tb = text(b);
      const words = ta.split(/[^a-z']+/).filter((w) => w.length >= 4);
      return words.find((w) => !tb.includes(w)) ?? null;
    }, [scope, all[0], target] as const);
    expect(term, "could not find a Find term that separates two agents").not.toBeNull();
    if (!term) return;
    await page.fill(`${scope} [data-clv="find"] input`, term);
    await page.waitForTimeout(300);
    expect((await rowIds(page, scope)).includes(target), "the filter still shows the target — the case is vacuous").toBe(false);
    await handle(page).open(target, { from: "hk" });
    await page.waitForTimeout(800);
    await expect(page.locator('[data-clv="profile"]'), "the card closed itself because its agent is outside the filter").toBeVisible();
    await handle(page).close();
    bump(3);
  });

  test("one Escape stack: an open country list closes first, the editor second, the card third", async ({ page }) => {
    await openRoute(page, "/agents", { width: 1440, height: 900 });
    const scope = await visiblePage(page, ".agl-wpg");
    await page.click(`${scope} [data-clv="row"]`);
    await page.waitForSelector('[data-clv="profile"]');
    await page.click('[data-clv="edit"]');
    await page.waitForSelector('[data-clv="profile"].clv-pcard--edit');
    await page.click('[data-clv="profile"] .agl-cc-control');
    await expect(page.locator('[data-clv="profile"] .agl-cc-menu')).toBeVisible();
    await page.keyboard.press("Escape");
    const s1 = await page.evaluate(() => ({
      menu: !!document.querySelector('[data-clv="profile"] .agl-cc-menu'),
      editing: !!document.querySelector('[data-clv="profile"].clv-pcard--edit'),
    }));
    expect(s1.menu, "Escape left the country list open").toBe(false);
    expect(s1.editing, "Escape on an open list reached the CARD — the list is not above it on the stack").toBe(true);
    await page.keyboard.press("Escape");
    const s2 = await page.evaluate(() => ({
      open: !!document.querySelector('[data-clv="profile"]'),
      editing: !!document.querySelector('[data-clv="profile"].clv-pcard--edit'),
    }));
    expect(s2.open && !s2.editing, "the second Escape did not return the card to view").toBe(true);
    await page.keyboard.press("Escape");
    await expect(page.locator('[data-clv="profile"]'), "the third Escape did not close the card").toHaveCount(0, { timeout: 5_000 });
    bump(4);
  });

  test("the lab mounts the host too: a row in #/contact-lab opens the card over the cast", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/#/contact-lab");
    await page.waitForSelector('[data-lab-view="cast"]');
    await page.click('[data-lab-view="cast"]');
    const row = page.locator('[data-clv="row"]').first();
    await expect(row, "the lab rendered no rows over the cast").toBeVisible({ timeout: 10_000 });
    await row.click();
    await expect(page.locator('[data-clv="profile"]'), "the lab's rows open nothing — its host is missing").toBeVisible({ timeout: 5_000 });
    bump(2);
  });
});
