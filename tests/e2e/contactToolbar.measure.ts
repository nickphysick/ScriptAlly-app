/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE TOOLBAR, on a rendered page.
 *
 * ⚠️ "FILTER AND SORT APPLY TO ALL THREE VIEWS" IS A CLAIM ABOUT COMPOSITION, and a source lock
 * cannot make it: each view reading the same array is a property of the PARTS, and what matters
 * is that the same narrowing reaches the whole of each rendered result. So the filter is applied
 * once and the surviving set is read from all three renderers and required to be identical.
 */
import { expect, test } from "@playwright/test";
import { assertLocalBundleIsDev } from "./bundleGuard";

const KILL_MOTION = `*, *::before, *::after { transition: none !important; animation: none !important; }`;

async function openCast(page: import("@playwright/test").Page, width = 1440) {
  await assertLocalBundleIsDev();
  await page.setViewportSize({ width, height: 900 });
  await page.goto("/#/contact-lab");
  await page.locator('[data-lab-view="cast"]').click();
  await page.addStyleTag({ content: KILL_MOTION });
  await expect(page.locator('[data-agent-card="fx-long"]')).toBeVisible({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

/* ⚠️ SETTLE AFTER A VIEW CHANGE. React swaps the renderer on the next commit, and reading in the
   same tick reports the OLD view's elements — which looks exactly like a filter that did not
   reach the new one. It cost two false failures here. */
const switchTo = async (page: import("@playwright/test").Page, label: string) => {
  await page.getByRole("button", { name: label, exact: true }).click();
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
};

/* ⚠️ FACET CLICKS ARE SCOPED TO THE POPOVER. The tile row states the same words — "Closed to
   queries" is both a tile and a facet chip — so an unscoped role query resolves to two controls
   with the same name and different jobs. That is the tiles doing their job (each one IS a filter
   the popover offers), and the measurement has to say which it means. */
const namesIn = (page: import("@playwright/test").Page, sel: string) =>
  page.evaluate((s) => [...document.querySelectorAll(s)].map((e) => (e.textContent ?? "").trim()), sel);

test.describe("filter and sort reach every view", () => {
  test("one narrowing, three identical results", async ({ page }) => {
    await openCast(page);

    await page.getByRole("button", { name: /^Filter/ }).click();
    await expect(page.locator(".agl-facetchip").first()).toBeVisible({ timeout: 4_000 });
    await page.locator(".f12-pop").getByRole("button", { name: /^Closed to queries/ }).click();

    const count = await page.locator("[data-agent-card]").count();
    // eslint-disable-next-line no-console
    console.log(`[filter] closed-to-queries → ${count} cards`);
    expect(count, "the filter narrowed to nothing or to everything").toBeGreaterThan(0);
    expect(count).toBeLessThan(7);

    /* the applied value is stated BENEATH the row, so closing the popover cannot hide it */
    await page.keyboard.press("Escape");
    await expect(page.locator(".agl-atag")).toContainText("Closed to queries");

    const grid = await namesIn(page, "[data-agent-card] .agl-name");
    await switchTo(page, "List");
    const list = await namesIn(page, ".agl-lrow .agl-lnmtx b");
    await switchTo(page, "Board");
    const board = await namesIn(page, ".agl-bcard b");

    // eslint-disable-next-line no-console
    console.log(`[reach] grid=${grid.length} list=${list.length} board=${board.length} → ${grid.join(", ")}`);
    expect(list.slice().sort(), "the List shows a different set from the Grid under one filter").toEqual(grid.slice().sort());
    expect(board.slice().sort(), "the Board shows a different set from the Grid under one filter").toEqual(grid.slice().sort());
  });

  test("the sort order reaches the list, and its words relabel per key", async ({ page }) => {
    await openCast(page);
    await switchTo(page, "List");

    const byName = await namesIn(page, ".agl-lrow .agl-lnmtx b");
    expect(byName.slice().sort((a, b) => a.localeCompare(b)), "the default order is not by name").toEqual(byName);

    await page.getByRole("button", { name: /^Sort/ }).click();
    await expect(page.getByRole("radio", { name: /Date added/ })).toBeVisible({ timeout: 4_000 });
    const nameWords = await page.evaluate(() => [...document.querySelectorAll(".agl-oseg button")].map((b) => b.textContent));
    await page.getByRole("radio", { name: /Date added/ }).click();
    const addedWords = await page.evaluate(() => [...document.querySelectorAll(".agl-oseg button")].map((b) => b.textContent));
    // eslint-disable-next-line no-console
    console.log(`[order words] name=${nameWords?.join("/")} added=${addedWords?.join("/")}`);

    expect(nameWords).toEqual(["A to Z", "Z to A"]);
    /* ⚠️ "A to Z" IS MEANINGLESS OVER A DATE — one pair for all six would be wrong for four. */
    expect(addedWords, "the order segment did not relabel for the new key").toEqual(["Oldest", "Newest"]);

    /* and choosing a key takes ITS most-useful-first direction, not the last key's */
    const on = await page.evaluate(() => document.querySelector(".agl-oseg button.on")?.textContent);
    expect(on, "date added opened oldest-first").toBe("Newest");

    await page.keyboard.press("Escape");
    const byAdded = await namesIn(page, ".agl-lrow .agl-lnmtx b");
    expect(byAdded, "the sort did not reach the rendered list").not.toEqual(byName);
  });
});

test.describe("the controls", () => {
  test("Group stands down outside the board and says why, and states its value on it", async ({ page }) => {
    await openCast(page);
    const group = page.getByRole("button", { name: /^Group/ });
    const off = await group.evaluate((el) => ({ disabled: (el as HTMLButtonElement).disabled, title: el.getAttribute("title") }));
    // eslint-disable-next-line no-console
    console.log(`[group in grid] disabled=${off.disabled} title="${off.title ?? ""}"`);
    expect(off.disabled, "Group is live in the Grid, where it has nothing to arrange").toBe(true);
    expect(off.title ?? "", "the disabled control does not explain itself").toContain("board");

    await switchTo(page, "Board");
    const on = await group.evaluate((el) => ({ disabled: (el as HTMLButtonElement).disabled, text: el.textContent }));
    // eslint-disable-next-line no-console
    console.log(`[group on board] disabled=${on.disabled} text="${on.text}"`);
    expect(on.disabled, "Group stayed dead on the board, where it is the whole point").toBe(false);
    expect(on.text, "the control does not state which grouping is chosen").toContain("Query status");
  });

  /* ⚠️ VISIBLE AND INERT AT ZERO, MEASURED — a disabled attribute in source is a declaration;
     that the row is still on screen and unclickable is the claim. */
  test("a zero-count facet option is drawn and cannot be ticked", async ({ page }) => {
    await openCast(page);
    await page.getByRole("button", { name: /^Filter/ }).click();
    await expect(page.locator(".agl-facetchip").first()).toBeVisible({ timeout: 4_000 });
    /* narrow first so some option genuinely reaches zero */
    await page.locator(".f12-pop").getByRole("button", { name: /^Never queried/ }).click();
    const zeros = await page.evaluate(() => [...document.querySelectorAll(".agl-facetchip")]
      .filter((b) => (b as HTMLButtonElement).disabled)
      .map((b) => ({ text: (b.textContent ?? "").trim(), visible: (b as HTMLElement).offsetParent !== null })));
    // eslint-disable-next-line no-console
    console.log(`[zero rows] ${zeros.length} disabled, all visible=${zeros.every((z) => z.visible)}`);
    expect(zeros.length, "no option reached zero — this measurement has no subject").toBeGreaterThan(0);
    expect(zeros.every((z) => z.visible), "a zero-count option was hidden rather than dimmed").toBe(true);
  });
});

/**
 * THE TILES — counted over the whole list, on a rendered page.
 *
 * ⚠️ "THE COUNTS ARE TOTALS" IS A CLAIM ABOUT WHAT HAPPENS WHEN YOU FILTER, and no source lock
 * can make it: the numbers are correct in the model either way, and what matters is that the row
 * on screen does not move when the list beneath it does.
 */
test.describe("the tiles", () => {
  test("count the whole list, and go on counting it after a filter", async ({ page }) => {
    await openCast(page);

    const read = async () => page.evaluate(() =>
      [...document.querySelectorAll(".qct-tile")].map((t) => ({
        label: (t.querySelector(".qct-k")?.textContent ?? "").trim(),
        n: (t.querySelector(".qct-n")?.textContent ?? "").trim(),
        on: t.className.includes("on") || t.getAttribute("aria-pressed") === "true",
      })));

    const before = await read();
    // eslint-disable-next-line no-console
    console.log(`[tiles] ${before.map((t) => `${t.label}=${t.n}`).join(" · ")}`);
    expect(before.length, "the tile row did not render").toBe(5);
    expect(before[0].label.toLowerCase()).toContain("all contacts");
    /* ⚠️ THE GENRE TILE IS NAMED FROM THE MANUSCRIPT, never hard-coded */
    expect(before[3].label.toLowerCase(), "the genre tile is not named from the manuscript in scope").toContain("seeking thriller");

    await page.getByRole("button", { name: /^Filter/ }).click();
    await expect(page.locator(".agl-facetchip").first()).toBeVisible({ timeout: 4_000 });
    await page.locator(".f12-pop").getByRole("button", { name: /^Closed to queries/ }).click();
    await page.keyboard.press("Escape");
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

    const after = await read();
    const cards = await page.locator("[data-agent-card]").count();
    // eslint-disable-next-line no-console
    console.log(`[tiles after filter] ${after.map((t) => `${t.label}=${t.n}`).join(" · ")} · cards=${cards}`);

    expect(cards, "the filter did not narrow the list, so this measurement has no subject").toBeLessThan(7);
    expect(after.map((t) => t.n), "the tile counts followed the filter — they are a census of the list, not a second statement of the filter").toEqual(before.map((t) => t.n));
    /* and the tile whose filter this IS lights up, derived rather than remembered */
    expect(after[2].on, "the Closed to queries tile did not light for its own filter").toBe(true);
    expect(after[0].on, "All contacts stayed lit under a narrowing filter").toBe(false);
  });
});
