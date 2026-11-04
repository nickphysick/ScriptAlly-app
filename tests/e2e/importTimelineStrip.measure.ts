/**
 * The import review's timeline strip (ref design-refs/import-timeline-strip-v1.html), on the rendered
 * lab: `#/onb-lab?s=review&fx=timeline`, Kirsten Vale's card first on the queries step.
 *
 * TS-R1 the pop-over is absolute, and opening it moves no other box (the strip, every tile, the button)
 * TS-R2 it flips above its tile when there is no room below
 * TS-R3 Esc, a click outside and Cancel close it without saving; Enter saves once a date is chosen
 * TS-R4 focus goes to the date field on open, and back to the tile on close
 * TS-R5 the ready row's Edit opens the same strip, with Done in place of Edit and "Don't import"
 * TS-SHOTS (TS_SHOTS=1) the report's screenshots, 1440×900 and 390×844
 *
 * `TS_MUTATE=R1` (the pop-over in the flow) or `R2` (no flip) applies that lock's named break in the
 * page; the source breaks for R3–R5 are in the report.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { lab, settled, WIDE } from "./ob9Lib";
import { answerAgents } from "./reviewDrive";

const OUT = resolve("reports/import-timeline-strip-v1");
const PHONE = { width: 390, height: 844 };
const MUTATE = process.env.TS_MUTATE ?? "";
const BREAKS: Record<string, string> = {
  R1: ".sf .o9-spop { position: static !important; }",
  R2: ".sf .o9-spop.is-up { top: calc(100% + 10px) !important; bottom: auto !important; }",
};
/* the strip card's question block: in the deck on a desk, in the answer sheet on a phone */
const card = (page: Page) => page.locator('.o9-q--strip:visible').first();

async function toQueries(page: Page, vp = WIDE) {
  await lab(page, "s=review&fx=timeline", vp, { motion: "reduce" });
  await page.waitForSelector('[data-im="review"]');
  if ((await page.locator('[data-im="review"]').getAttribute("data-step")) === "agents") {
    await answerAgents(page);
    await page.getByRole("button", { name: /^Continue/ }).click();
  }
  await page.waitForSelector('[data-im="review"][data-step="queries"]');
  /* a phone's deck asks one question at a time behind "Answer this" */
  const answer = page.getByRole("button", { name: /^Answer this$/ });
  if (await answer.count()) await answer.first().click();
  await card(page).waitFor();
  if (BREAKS[MUTATE]) await page.addStyleTag({ content: BREAKS[MUTATE] });
  await settled(page, 400);
}

/** Every box in the card except the pop-over's own, by a stable key (the card's own as its size). */
const boxes = (page: Page) => card(page).evaluate((c) => {
  /* relative to the card, so the scroll that brings a pop-over into view is not read as a move */
  const out: Record<string, number[]> = {};
  const o = c.getBoundingClientRect();
  const r = (k: string, e: Element | null) => { if (!e) return; const b = e.getBoundingClientRect(); out[k] = [b.x - o.x, b.y - o.y, b.width, b.height].map((v) => Math.round(v * 10) / 10); };
  r("card", c);
  r("strip", c.querySelector('[data-strip="strip"]'));
  r("stands", c.querySelector('[data-strip="stands"]'));
  r("confirm", c.querySelector('[data-strip="confirm"]'));
  c.querySelectorAll("[data-step]").forEach((t) => r("tile-" + t.getAttribute("data-step"), t));
  return out;
});

test.describe("import timeline strip", () => {
  /* the lab needs no sign-in */
  test.use({ storageState: { cookies: [], origins: [] } });
  test("TS-R1 the pop-over is absolute and opening it moves no other box", async ({ page }) => {
    await toQueries(page);
    const before = await boxes(page);
    expect(Object.keys(before).length, "the card's boxes were read").toBeGreaterThan(5);
    await card(page).locator('[data-step="sent"]').click();
    const pop = card(page).locator('[data-strip="pop"]');
    await expect(pop).toBeVisible();
    expect(["absolute", "fixed"]).toContain(await pop.evaluate((e) => getComputedStyle(e).position));
    expect(await boxes(page), "opening the pop-over moves nothing else").toEqual(before);
    await pop.locator('[data-strip="date"]').fill("30/8");
    expect(await boxes(page), "typing in it moves nothing else").toEqual(before);
  });

  test("TS-R2 it flips above its tile near the bottom of the window", async ({ page }) => {
    await toQueries(page);
    const tile = card(page).locator('[data-step="new"]');
    /* bring the tile near the window's foot: the scroller moves the card down by padding the top */
    await tile.evaluate((t) => {
      const sc = (() => { for (let e: HTMLElement | null = t.parentElement; e; e = e.parentElement) if (e.scrollHeight > e.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(e).overflowY)) return e; return document.scrollingElement as HTMLElement; })();
      const want = window.innerHeight - 90, at = t.getBoundingClientRect().top;
      const pad = document.createElement("div"); pad.style.height = `${Math.max(0, want - at + sc.scrollTop)}px`; pad.dataset.tsPad = "1";
      t.closest('[data-im="deck"]')?.before(pad);
      sc.scrollTop = 0;
    });
    const top = (await tile.boundingBox())!.y;
    expect(top, "the tile is near the window's foot").toBeGreaterThan(WIDE.height - 160);
    await tile.click();
    const pop = card(page).locator('[data-strip="pop"]');
    await expect(pop).toBeVisible();
    await expect(pop).toHaveClass(/is-up/);
    const pb = (await pop.boundingBox())!, tb = (await tile.boundingBox())!;
    expect(pb.y + pb.height, "the pop-over ends above its tile").toBeLessThanOrEqual(tb.y);
    /* inside the scroll area it sits in, not just the window: the set-up sheet starts below the bar */
    const portTop = await pop.evaluate((p) => { for (let e = p.parentElement; e; e = e.parentElement) if (/auto|scroll/.test(getComputedStyle(e).overflowY)) return Math.max(0, e.getBoundingClientRect().top); return 0; });
    expect(pb.y, "and starts inside the scroll area").toBeGreaterThanOrEqual(portTop);
  });

  test("TS-R3 Esc, outside click and Cancel do not save; Enter saves", async ({ page }) => {
    await toQueries(page);
    const sent = card(page).locator('[data-step="sent"]');
    const pop = card(page).locator('[data-strip="pop"]');
    const sentText = () => sent.textContent();
    const was = await sentText();
    // Esc
    await sent.click(); await pop.locator('[data-strip="date"]').fill("30/8");
    await page.keyboard.press("Escape");
    await expect(pop).toHaveCount(0);
    expect(await sentText(), "Esc saved nothing").toBe(was);
    expect(await page.locator('[data-im="deck-card"]').count(), "Esc closed only the pop-over").toBeGreaterThan(0);
    // outside
    await sent.click(); await pop.locator('[data-strip="date"]').fill("30/8");
    await card(page).locator(".o9-ask").first().click();
    await expect(pop).toHaveCount(0);
    expect(await sentText(), "a click outside saved nothing").toBe(was);
    // pressing the tile again
    await sent.click(); await pop.locator('[data-strip="date"]').fill("30/8");
    await sent.click();
    await expect(pop).toHaveCount(0);
    expect(await sentText(), "pressing the tile again saved nothing").toBe(was);
    // Cancel
    await sent.click(); await pop.locator('[data-strip="date"]').fill("30/8");
    await pop.locator('[data-strip="cancel"]').click();
    await expect(pop).toHaveCount(0);
    expect(await sentText()).toBe(was);
    // Enter with nothing chosen does nothing
    await sent.click(); await pop.locator('[data-strip="date"]').fill("nonsense");
    await expect(pop.locator('[data-strip="readback"]')).toHaveText("Try 22/9 or 22 Sep.");
    await expect(pop.locator('[data-strip="save"]')).toBeDisabled();
    await page.keyboard.press("Enter");
    await expect(pop).toBeVisible();
    // Enter saves
    await pop.locator('[data-strip="date"]').fill("30/8");
    await expect(pop.locator('[data-strip="readback"]')).toContainText("30 August 2026");
    await page.keyboard.press("Enter");
    await expect(pop).toHaveCount(0);
    await expect(sent).toContainText("30 Aug");
    await expect(card(page).locator('[data-strip="confirm"]')).toHaveText("Yes, that's right");
  });

  test("TS-R4 focus: the date field on open, the tile on close", async ({ page }) => {
    await toQueries(page);
    const tile = card(page).locator('[data-step="e0"]');
    await tile.click();
    const pop = card(page).locator('[data-strip="pop"]');
    await expect(pop).toHaveAttribute("role", "dialog");
    const label = await pop.getAttribute("aria-labelledby");
    expect(await page.locator(`[id="${label}"]`).textContent()).toBe("What happened, and when?");
    expect(await page.evaluate(() => document.activeElement?.getAttribute("data-strip"))).toBe("date");
    await page.keyboard.press("Escape");
    await expect(pop).toHaveCount(0);
    await page.waitForTimeout(100);
    expect(await page.evaluate(() => document.activeElement?.getAttribute("data-step")), "focus is back on the tile").toBe("e0");
    // the add tile: its note, word for word, and the type pre-chosen as the next step
    await card(page).locator('[data-step="new"]').click();
    await expect(pop.locator('[data-strip="note"]')).toHaveText("It'll slot in where it belongs on the timeline, based on the date you give it.");
    await expect(pop.locator('[data-strip="save"]')).toBeDisabled();
    expect(await page.evaluate(() => document.activeElement?.getAttribute("data-strip"))).toBe("date");
  });

  test("TS-R5 the ready row's Edit opens the strip", async ({ page }) => {
    await toQueries(page);
    const row = page.locator('[data-im="ready"] [data-row="query"]').first();
    await row.locator('[data-im="row-action"]').click();
    await expect(row.locator('[data-strip="strip"]')).toBeVisible();
    await expect(row.locator('[data-im="row-action"]')).toHaveText("Done");
    await expect(row.getByText("Don't import")).toHaveCount(0);
    await row.locator('[data-step="sent"]').click();
    await expect(row.locator('[data-strip="pop"]')).toBeVisible();
    await page.keyboard.press("Escape");
    await row.locator('[data-im="row-action"]').click();
    await expect(row.locator('[data-strip="strip"]')).toHaveCount(0);
    await expect(row.getByText("Don't import")).toHaveCount(1);
  });

  test("TS-SHOTS the report's screenshots", async ({ page }) => {
    test.skip(!process.env.TS_SHOTS, "set TS_SHOTS=1");
    mkdirSync(OUT, { recursive: true });
    const snap = (n: string) => page.screenshot({ path: resolve(OUT, `${n}.png`) });
    await toQueries(page);
    await card(page).scrollIntoViewIfNeeded();
    await snap("1440-card-arrival");
    await card(page).locator('[data-step="sent"]').click();
    await card(page).locator('[data-strip="date"]').fill("30/8");
    await snap("1440-pop-sent-30-8");
    await page.keyboard.press("Enter");
    await card(page).locator('[data-step="new"]').click();
    await card(page).locator('[data-strip="date"]').fill("22/9");
    await snap("1440-pop-add-22-9");
    await card(page).locator('[data-strip="cancel"]').click();
    await snap("1440-strip-finished");
    const row = page.locator('[data-im="ready"] [data-row="query"]').first();
    await row.locator('[data-im="row-action"]').click();
    await row.locator('[data-step="sent"]').click();
    await row.scrollIntoViewIfNeeded();
    await snap("1440-ready-row-open");
    await toQueries(page, PHONE);
    await snap("390-card");
    await card(page).locator('[data-step="sent"]').click();
    await card(page).locator('[data-strip="date"]').fill("30/8");
    await snap("390-pop-open");
  });
});
