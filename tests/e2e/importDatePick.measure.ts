/**
 * Smart Import v1.2 on the rendered lab, `#/onb-lab?s=review&fx=v12`.
 *
 * DP-R1 a single-date card's calendar floats: opening it (and typing) changes no box on the card
 * DP-R2 "early Oct" opens the calendar on October; a typed date is said back and saved
 * DP-R3 the Jonah pair is asked on the Duplicates step; Leo's card reads the name without its "?";
 *       Tom's ✗ card quotes the key with Passed chosen
 * DP-SHOTS (DP_SHOTS=1) the report's screenshots, 1440 × 900 and 390 × 844
 *
 * `DP_MUTATE=R1` (the calendar in the flow) applies its named break in the page.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { lab, settled, WIDE } from "./ob9Lib";
import { decideDuplicates, answerAgents, showCard } from "./reviewDrive";

const OUT = resolve("reports/smart-import-photos-v1-2");
const PHONE = { width: 390, height: 844 };
const MUTATE = process.env.DP_MUTATE ?? "";
const BREAKS: Record<string, string> = { R1: ".sf .o9-dpop { position: static !important; }" };
const shots = !!process.env.DP_SHOTS;
const snap = async (page: Page, n: string) => { if (!shots) return; mkdirSync(OUT, { recursive: true }); await page.screenshot({ path: resolve(OUT, `${n}.png`) }); };

const step = (page: Page) => page.locator('[data-im="review"]').getAttribute("data-step");
async function open(page: Page, vp = WIDE) {
  await lab(page, "s=review&fx=v12", vp, { motion: "reduce" });
  await page.waitForSelector('[data-im="review"]');
  if (BREAKS[MUTATE]) await page.addStyleTag({ content: BREAKS[MUTATE] });
}
async function next(page: Page) { await page.locator('[data-im="primary"]').first().click(); await settled(page, 400); }
async function toQueries(page: Page, vp = WIDE) {
  await open(page, vp);
  if ((await step(page)) === "duplicates") { await decideDuplicates(page); await next(page); }
  if ((await step(page)) === "agents") { await answerAgents(page); await next(page); }
  await page.waitForSelector('[data-im="review"][data-step="queries"]');
}
/** Rhea Oduya's card, "early Oct": on a phone behind "Answer this". */
async function rhea(page: Page) {
  const answer = page.getByRole("button", { name: /^Answer this$/ });
  if (await answer.count()) await answer.first().click();
  else await showCard(page, "q-q4");
  const c = page.locator('.o9-q[data-reason="no-date"]:visible').first();
  await c.waitFor();
  return c;
}

const boxes = (card: import("@playwright/test").Locator) => card.evaluate((c) => {
  const o = c.getBoundingClientRect(); const out: Record<string, number[]> = {};
  const r = (k: string, e: Element | null) => { if (!e) return; const b = e.getBoundingClientRect(); out[k] = [b.x - o.x, b.y - o.y, b.width, b.height].map((v) => Math.round(v * 10) / 10); };
  r("card", c); r("ask", c.querySelector(".o9-ask")); r("field", c.querySelector('[data-dpick="input"]'));
  c.querySelectorAll("button:not(.o9-day):not(.o9-calnav)").forEach((b, i) => r(`btn${i}:${b.textContent?.trim()}`, b));
  return out;
});

test.describe("import date pick (v1.2)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("DP-R1 the calendar floats: opening and typing move nothing on the card", async ({ page }) => {
    await toQueries(page);
    const c = await rhea(page);
    const before = await boxes(c);
    expect(Object.keys(before).length).toBeGreaterThan(3);
    await c.locator('[data-dpick="input"]').click();
    const pop = c.locator('[data-dpick="pop"]');
    await expect(pop).toBeVisible();
    expect(["absolute", "fixed"]).toContain(await pop.evaluate((e) => getComputedStyle(e).position));
    expect(await boxes(c), "opening the calendar moves nothing").toEqual(before);
    /* and every day can be pressed: nothing clips it (the deck clipped it before this fix) */
    const reach = await pop.evaluate((p) => [...p.querySelectorAll<HTMLElement>(".o9-day")].map((d) => {
      const b = d.getBoundingClientRect(); const hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
      return hit === d || d.contains(hit);
    }));
    expect(reach.length, "the month's days").toBe(31);
    expect(reach.every(Boolean), "every day of October can be pressed").toBe(true);
    await c.locator('[data-dpick="input"]').fill("4/10");
    expect(await boxes(c), "typing moves nothing").toEqual(before);
  });

  test("DP-R2 early Oct opens on October; a typed date is said back and saved", async ({ page }) => {
    await toQueries(page);
    const c = await rhea(page);
    await c.locator('[data-dpick="input"]').click();
    await expect(c.locator('[data-strip="cal-title"]')).toHaveText("October 2026");
    await expect(c.locator('[data-dpick="readback"]')).toHaveText("Type it, or pick it.");
    await c.locator('[data-dpick="input"]').fill("nonsense");
    await expect(c.locator('[data-dpick="readback"]')).toHaveText("Try 22/9 or 22 Sep.");
    await c.locator('[data-dpick="input"]').fill("4/10");
    await expect(c.locator('[data-dpick="readback"]')).toHaveText("Sunday, 4 October 2026");
    await page.keyboard.press("Escape");
    await expect(c.locator('[data-dpick="pop"]')).toHaveCount(0);
    await c.getByRole("button", { name: "Save date" }).click();
    await expect(page.locator('.o9-q[data-reason="no-date"]:visible')).toHaveCount(0);
  });

  test("DP-R3 the Jonah pair, Leo without his ?, and Tom's keyed ✗", async ({ page }) => {
    await open(page);
    expect(await step(page)).toBe("duplicates");
    const set = page.locator('[data-dup-state="open"]');
    await expect(set).toHaveCount(1);
    /* two rows that each hold one query read as one submission at two stages: "Two rows for Jonah P."
       (DUP-1 holds that both agents are in the set) */
    await expect(set).toContainText("Two rows for Jonah P.");
    await expect(set).toContainText("12 Aug 2026");
    await expect(set).toContainText("20 Aug 2026");
    await decideDuplicates(page); await next(page);
    expect(await step(page)).toBe("agents");
    const leo = page.locator('[data-reason="agent-reading"]:visible').first();
    await expect(leo).toContainText("We read this as “Leo Fairbairn” at “Lattice”. Is that right?");
    /* the quoted line keeps the writer's own "?"; the name and its one reading do not */
    await expect(leo.locator("[data-reading]")).toHaveText(["Leo Fairbairn, Lattice"]);
    await answerAgents(page); await next(page);
    await showCard(page, "q-q3");
    const tom = page.locator('.o9-q[data-reason="mark-unclear"]:visible').first();
    await expect(tom).toContainText("There's a “✗” after this line, and your key says ✗ means “pass”. Is that right?");
    await expect(tom.locator('[data-status="Rejected"]')).toHaveAttribute("aria-pressed", "true");
  });

  test("DP-SHOTS the report's screenshots", async ({ page }) => {
    test.skip(!shots, "set DP_SHOTS=1");
    await open(page);
    await snap(page, "1440-duplicates-jonah");
    await decideDuplicates(page); await next(page);
    await snap(page, "1440-agents-leo");
    await answerAgents(page); await next(page);
    await showCard(page, "q-q3"); await settled(page, 300);
    await snap(page, "1440-mark-keyed");
    const c = await rhea(page);
    await snap(page, "1440-date-card");
    await c.locator('[data-dpick="input"]').click(); await settled(page, 200);
    await snap(page, "1440-date-calendar-oct");
    await toQueries(page, PHONE);
    const p = await rhea(page);
    await snap(page, "390-date-card");
    await p.locator('[data-dpick="input"]').click(); await settled(page, 200);
    await snap(page, "390-date-calendar-oct");
  });
});
