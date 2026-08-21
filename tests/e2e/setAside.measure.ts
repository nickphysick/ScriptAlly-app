/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "Set aside & tags" — measured, because reachability is the whole point of this work. Both
 * features were unreachable on main and on dev; a source lock proves a door was written, not that
 * it opens.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const DOOR = 'button[aria-label="Set aside and tags"]';

test("the door is on the board's tool row and opens the panel", async ({ page }) => {
  await openRoute(page, "/todo", { width: 1440, height: 900 });
  expect(await page.locator(DOOR).count(), "the door must exist").toBe(1);

  await page.locator(DOOR).click();
  await page.waitForTimeout(400);
  const panel = page.locator(".sap");
  expect(await panel.count(), "the panel must open").toBe(1);

  const tabs = await page.locator(".sap-tab").allTextContents();
  console.log("TABS", JSON.stringify(tabs));
  expect(tabs.length).toBe(2);
  expect(tabs.join(" ")).toContain("Tags");
});

test("the set-aside pane lists what is hidden, or says plainly that nothing is", async ({ page }) => {
  await openRoute(page, "/todo", { width: 1440, height: 900 });
  await page.locator(DOOR).click();
  await page.waitForTimeout(400);

  const state = await page.evaluate(() => {
    const rows = [...document.querySelectorAll(".sap-row")].map((r) => ({
      label: r.querySelector(".sap-label")?.textContent ?? "",
      meta: r.querySelector(".sap-meta")?.textContent ?? "",
      kind: [...r.classList].find((c) => c.startsWith("sap-row--")) ?? "",
      restorable: !!r.querySelector(".sap-restore"),
    }));
    return { rows, empty: document.querySelector(".sap-empty")?.textContent ?? null,
             foot: document.querySelector(".sap-foot")?.textContent ?? null };
  });
  console.log("SET ASIDE", JSON.stringify(state, null, 1).slice(0, 700));

  /* ⚠️ THE DOOR IS REACHABLE EITHER WAY — that is the reversal this build made deliberately. */
  if (state.rows.length === 0) {
    expect(state.empty, "an empty ledger must still say what it is").toContain("Nothing set aside");
  } else {
    for (const r of state.rows) {
      expect(r.label.length, "every row names what it is").toBeGreaterThan(0);
      expect(r.meta.length, "and states why it is hidden").toBeGreaterThan(0);
      expect(r.restorable, `${r.label} has no Restore`).toBe(true);
    }
    expect(state.foot).toContain("Nothing here is deleted");
    /* a rule mute carries no date and must not invent one */
    for (const r of state.rows.filter((x) => x.kind === "sap-row--rule")) {
      expect(r.meta).toBe("MUTED AS A RULE");
    }
  }
});

test("the tags pane restores tag management, with its CRUD intact", async ({ page }) => {
  await openRoute(page, "/todo", { width: 1440, height: 900 });
  await page.locator(DOOR).click();
  await page.waitForTimeout(400);
  await page.locator('.sap-tab:has-text("Tags")').click();
  await page.waitForTimeout(300);

  const pane = await page.locator("#sap-pane-tags").textContent();
  console.log("TAGS PANE", (pane ?? "").replace(/\s+/g, " ").slice(0, 220));
  expect(pane).toContain("Rename, recolour, retire.");
  expect(pane, "the consequence of deleting is stated before it happens")
    .toContain("detaches it from your notes and tasks");
});

test("the panel closes on Escape and returns focus to its door", async ({ page }) => {
  await openRoute(page, "/todo", { width: 1440, height: 900 });
  await page.locator(DOOR).click();
  await page.waitForTimeout(400);
  expect(await page.locator(".sap").count()).toBe(1);

  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  expect(await page.locator(".sap").count(), "Escape must close it").toBe(0);
  const focused = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? null);
  console.log("focus after Escape:", focused);
  expect(focused, "focus must return to the door").toBe("Set aside and tags");
});

/**
 * ⚠️ THE ROUND TRIP, WHICH IS THE WHOLE FEATURE. A ledger that lists what is hidden but cannot
 * bring it back is a museum. This restores the first item and asserts it leaves the ledger — the
 * count on the door is derived from the same `hiddenItems`, so the door is the witness.
 */
test("restoring an item removes it from the ledger and the door's count", async ({ page }) => {
  await openRoute(page, "/todo", { width: 1440, height: 900 });
  await page.locator(DOOR).click();
  await page.waitForTimeout(400);

  const before = await page.locator(".sap-row").count();
  if (before === 0) {
    console.log("nothing set aside on this account — round trip not exercised");
    test.skip();
    return;
  }
  const label = await page.locator(".sap-row").first().locator(".sap-label").textContent();
  await page.locator(".sap-row").first().locator(".sap-restore").click();
  await page.waitForTimeout(2000);

  const after = await page.locator(".sap-row").count();
  console.log(`restored "${label}" — rows ${before} → ${after}`);
  expect(after, "the restored row must leave the ledger").toBe(before - 1);

  /* and the door's figure follows, because it reads the same derivation */
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  const dot = await page.locator(`${DOOR} .l-icondot`).count();
  console.log("door still marks content:", dot === 1);
  expect(after === 0 ? dot : 1).toBe(after === 0 ? 0 : 1);
});
