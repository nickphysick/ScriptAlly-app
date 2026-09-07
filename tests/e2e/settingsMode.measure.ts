/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Settings mode + the stacked-cards chassis — MEASURED, because every claim in this pack is a
 * layout claim and the unit suites prove only that the code was written.
 *
 * ⚠️ WHAT A SOURCE LOCK CANNOT SEE HERE, and why this file exists. The shell takeover is two layers
 * cross-fading in one 224px slot: a stylesheet can say `opacity: 0` and a component can render both,
 * and neither says which one a reader can see, whether the panel's WIDTH held, or whether the window
 * behind them actually dissolved. The 760px column and the 280px control column are resolved tracks,
 * not declarations. And "identity appears once" is a claim about the whole page, in every section —
 * exactly the composed-result shape a per-element probe is satisfied by.
 *
 *   npm run build:dev && npx vite preview --port 4199 --host 127.0.0.1 &
 *   SA_E2E_BASE_URL=http://127.0.0.1:4199 npx playwright test settingsMode
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { ACCOUNT_ROUTES } from "../../src/lib/accountRoutes";

/** A box plus the handful of computed values these claims turn on. */
const read = (page: import("@playwright/test").Page, sel: string) =>
  page.evaluate((s) => {
    const el = document.querySelector(s) as HTMLElement | null;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      w: Math.round(r.width), h: Math.round(r.height),
      x: Math.round(r.left), y: Math.round(r.top),
      opacity: Number(cs.opacity),
      visibility: cs.visibility,
      background: cs.backgroundColor,
      borderTopColor: cs.borderTopColor,
      borderTopWidth: cs.borderTopWidth,
      boxShadow: cs.boxShadow,
      display: cs.display,
    };
  }, sel);

/** ⚠️ VISIBLE means all three: rendered, not transparent, not `visibility: hidden`. Any one alone
 *  is satisfied by a layer that is faded out but still in the tree — which is precisely what the
 *  inactive layer IS, so a looser test would report both layers as present in both modes. */
const seen = (b: Awaited<ReturnType<typeof read>>) =>
  !!b && b.w > 0 && b.h > 0 && b.opacity > 0.01 && b.visibility !== "hidden";

test("⚠️ the panel shows ONE layer per mode — and the width never changes", async ({ page }) => {
  await openRoute(page, "/dashboard", { width: 1440, height: 900 });
  const appNavOff = await read(page, ".ws-pin");
  const railOff = await read(page, ".set-rail");
  const panelOff = await read(page, ".ws-panel");

  await openRoute(page, "/account/profile", { width: 1440, height: 900 });
  const appNavOn = await read(page, ".ws-pin");
  const railOn = await read(page, ".set-rail");
  const panelOn = await read(page, ".ws-panel");

  /* ⚠️ THE POPULATION FIRST. Both layers must EXIST in both modes, or the "one is hidden" half is
     satisfied by a layer that simply is not rendered — and the cross-fade would then only work in
     one direction, which is the fault this whole arrangement is built to avoid. */
  expect(appNavOff, ".ws-pin missing on the dashboard").not.toBeNull();
  expect(railOff, ".set-rail must be MOUNTED off-mode so it can fade out later").not.toBeNull();
  expect(appNavOn, ".ws-pin must stay mounted in settings so it can fade back").not.toBeNull();
  expect(railOn, ".set-rail missing in settings").not.toBeNull();

  expect(seen(appNavOff), "app nav should be visible on the dashboard").toBe(true);
  expect(seen(railOff), "the settings rail is visible on the dashboard").toBe(false);
  expect(seen(appNavOn), "the app nav is still visible inside settings").toBe(false);
  expect(seen(railOn), "the settings rail should be visible in settings").toBe(true);

  /* ⚠️ THE WHOLE POINT: not a relayout. If the panel's width moved, everything to its right
     reflowed and the "cross-fade in one slot" claim is false however good the fade looks. */
  expect(panelOn!.w, "the panel changed width between modes — this is a relayout").toBe(panelOff!.w);
  expect(panelOn!.x).toBe(panelOff!.x);
});

test("⚠️ the hidden layer is out of the tab order, not merely faded", async ({ page }) => {
  await openRoute(page, "/dashboard", { width: 1440, height: 900 });
  /* `visibility: hidden` is what removes a control from the tab order; `opacity` and
     `pointer-events` both leave it focusable. Without this a reader tabbing across the dashboard
     walks seven invisible settings items. */
  const railVis = await page.evaluate(() =>
    getComputedStyle(document.querySelector(".set-rail") as HTMLElement).visibility);
  expect(railVis).toBe("hidden");

  /* ⚠️ THE CLAIM IS "NOTHING IN HERE CAN TAKE FOCUS", AND IT IS TESTED BY TRYING. Counting
     `tabIndex >= 0` was the first form of this and it was wrong — it bounded the count at one,
     forgetting that "Back to app" is an ordinary button and focusable by default, so it reported 2
     against a page that was behaving perfectly. Counting the elements that LOOK focusable is a
     property of the markup; whether the browser will actually put focus in them is the property
     that matters, and `visibility: hidden` is what decides it. */
  const stole = await page.evaluate(() => {
    const rail = document.querySelector(".set-rail") as HTMLElement;
    const buttons = [...rail.querySelectorAll("button")] as HTMLButtonElement[];
    const before = document.activeElement;
    let taken = 0;
    for (const b of buttons) {
      b.focus();
      if (document.activeElement === b) taken += 1;
    }
    (before as HTMLElement | null)?.focus?.();
    return { buttons: buttons.length, taken };
  });
  /* Population first: a rail that rendered no buttons would take focus zero times and pass. */
  expect(stole.buttons, "the hidden rail rendered no buttons — nothing was measured").toBeGreaterThan(6);
  expect(stole.taken, "a hidden settings control accepted focus").toBe(0);
});

test("⚠️ the window's surface dissolves in settings, and is opaque everywhere else", async ({ page }) => {
  await openRoute(page, "/dashboard", { width: 1440, height: 900 });
  const off = await read(page, ".ws-window");
  await openRoute(page, "/account/profile", { width: 1440, height: 900 });
  const on = await read(page, ".ws-window");

  expect(off, ".ws-window missing").not.toBeNull();
  /* ⚠️ ASSERTED AS A CHANGE, NOT AS A PINNED COLOUR. A pinned value goes red on every legitimate
     retone and trains the next reader to rebaseline it without looking; "it was opaque and now it
     is not" is the claim, and it survives any palette. */
  expect(off!.background, "the window should be opaque off-mode").not.toMatch(/rgba\(0, 0, 0, 0\)/);
  expect(on!.background, "the window's fill did not dissolve in settings").toMatch(/rgba\(0, 0, 0, 0\)/);
  expect(on!.borderTopColor, "the window's border did not dissolve").toMatch(/rgba\(0, 0, 0, 0\)/);
  expect(on!.boxShadow, "the window kept its shadow in settings").toBe("none");

  /* ⚠️ THE ELEMENT STAYS. The surface goes; the box does not, because it is the scroller's clip. */
  expect(on!.w).toBeGreaterThan(0);
  expect(on!.h).toBeGreaterThan(0);
});

test("⚠️ the bar swaps its tools — Search and New leave, Feedback and help stay", async ({ page }) => {
  const tools = async () => page.evaluate(() => {
    const vis = (el: Element | null) => {
      if (!el) return false;
      const r = (el as HTMLElement).getBoundingClientRect();
      const cs = getComputedStyle(el as HTMLElement);
      return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && Number(cs.opacity) > 0.01;
    };
    return {
      search: vis(document.querySelector(".sp-search")),
      neu: vis(document.querySelector(".ws-nbtn")),
      help: vis(document.querySelector(".sp-help")),
      back: vis(document.querySelector(".ws-backapp")),
    };
  });

  await openRoute(page, "/dashboard", { width: 1440, height: 900 });
  const off = await tools();
  await openRoute(page, "/account/profile", { width: 1440, height: 900 });
  const on = await tools();

  expect(off.search, "search should be on the bar off-mode").toBe(true);
  expect(off.neu, "+ New should be on the bar off-mode").toBe(true);
  expect(off.back, "Back to app is visible outside settings").toBe(false);

  expect(on.search, "search stayed in settings mode").toBe(false);
  expect(on.neu, "+ New stayed in settings mode").toBe(false);
  expect(on.back, "Back to app did not arrive").toBe(true);
  /* ⚠️ THE ONE THAT MUST NOT CHANGE. Help is as useful in settings as anywhere; a swap that took
     it out would be the mode removing a control for no reason. */
  expect(on.help, "help left the bar in settings").toBe(true);
});

test("the page column caps at 760 and the control column resolves to 280", async ({ page }) => {
  await openRoute(page, "/account/preferences", { width: 1440, height: 900 });

  const work = await read(page, ".acct-work");
  expect(work, ".acct-work missing").not.toBeNull();
  expect(work!.w, "the page column is not the 760 cap").toBe(760);

  /* ⚠️ THE RESOLVED TRACK, NOT THE DECLARATION. `grid-template-columns: 1fr 280px` is a template;
     what the browser makes of it inside a 760px card is the only number worth reporting. */
  const ctl = await page.evaluate(() => {
    const rows = [...document.querySelectorAll(".sc-row:not(.sc-row--full)")] as HTMLElement[];
    return rows.map((r) => Math.round((r.querySelector(".sc-ctl") as HTMLElement).getBoundingClientRect().width));
  });
  expect(ctl.length, "no two-column rows found — the sweep measured nothing").toBeGreaterThan(1);
  /* ⚠️ EVERY row, not the first. One correct row beside four ragged ones is the state a
     first-match probe reports as clean. */
  expect([...new Set(ctl)], "the control column is not one width").toEqual([280]);
});

test("⚠️ identity appears ONCE in the whole of settings — swept over all seven sections", async ({ page }) => {
  const counts: Record<string, number> = {};
  for (const r of ACCOUNT_ROUTES) {
    await openRoute(page, r.path, { width: 1440, height: 900 });
    counts[r.id] = await page.evaluate(() => document.querySelectorAll(".sc-id").length);
  }
  /* ⚠️ THE POPULATION IS ASSERTED FIRST. A sweep that opened seven pages and found zero identity
     rows would satisfy "never more than one" perfectly. */
  expect(Object.keys(counts).length).toBe(7);
  expect(counts.profile, "Profile should carry the one identity row").toBe(1);
  const elsewhere = ACCOUNT_ROUTES.filter((r) => r.id !== "profile").map((r) => counts[r.id]);
  expect([...new Set(elsewhere)], `identity leaked: ${JSON.stringify(counts)}`).toEqual([0]);
});

test("⚠️ no illustration and no card shadow anywhere in the settings scope", async ({ page }) => {
  let cards = 0;
  for (const r of ACCOUNT_ROUTES) {
    await openRoute(page, r.path, { width: 1440, height: 900 });
    const found = await page.evaluate(() => {
      const scope = document.querySelector(".acct-page") as HTMLElement | null;
      if (!scope) return null;
      const cardEls = [...scope.querySelectorAll(".sc-card")] as HTMLElement[];
      return {
        cards: cardEls.length,
        /* The chassis ships with no illustrations — `SettingsIllo` is deleted, and an `<img>` or an
           `.acct-illo` reappearing here means one came back without the decision being revisited. */
        illos: scope.querySelectorAll("img, .acct-illo, [class*='illo']").length,
        shadowed: cardEls.filter((c) => getComputedStyle(c).boxShadow !== "none").length,
      };
    });
    expect(found, `.acct-page missing on ${r.path}`).not.toBeNull();
    expect(found!.illos, `an illustration reappeared on ${r.path}`).toBe(0);
    expect(found!.shadowed, `a card grew a shadow on ${r.path}`).toBe(0);
    cards += found!.cards;
  }
  /* Every section renders at least one card; the total is reported so a section quietly emptying
     out is visible rather than silently passing every claim above. */
  expect(cards, "the sweep found almost no cards — it is measuring nothing").toBeGreaterThan(9);
});

test("the plan card states the Smart Import allowance", async ({ page }) => {
  await openRoute(page, "/account/plan", { width: 1440, height: 900 });
  const text = await page.evaluate(() => (document.querySelector(".acct-work") as HTMLElement)?.innerText ?? "");
  expect(text).toContain("Smart Import");
  /* ⚠️ THE STATE, NOT ONLY THE LABEL. "Smart Import" also appears in the plan comparison table, so
     a label check alone passes on a page that never gained the row. */
  expect(text).toMatch(/1 available|Used/);
});

test("⚠️ the deletion banner is absent when nothing is scheduled", async ({ page }) => {
  await openRoute(page, "/dashboard", { width: 1440, height: 900 });
  /* The harness account has no scheduled deletion, so the banner must render NOTHING — a strip
     that appeared here would be on every page of every account for ever. Its populated state needs
     a write and an undo, which belongs to a seeded run rather than this one. */
  expect(await page.evaluate(() => document.querySelectorAll(".del-banner").length)).toBe(0);
});
