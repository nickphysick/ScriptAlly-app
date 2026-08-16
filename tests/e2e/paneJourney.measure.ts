/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ITEM 9 PHASE 2 — the walk. Does the journey render IN the card, is it operable, is the seal gone.
 *
 * ⚠️ IT CLICKS FOR REAL AND STOPS BEFORE THE COMMIT. The whole point is that the controls are
 * reachable, so a forced click would defeat the test; and the write is the harness account's real
 * queries, so the primary is measured and not pressed.
 */
import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { resolve } from "node:path";

test.setTimeout(300_000);

test("phase 2 — the send journey, in the pane", async ({ page }) => {
  await openRoute(page, "/todo", { width: 1920, height: 1000 });
  await liftMotionSuppression(page);

  const send = page.locator(".tdg-row").filter({ hasText: /^Send/ }).first();
  const n = await send.count();
  console.log("send rows on dev:", n);
  if (!n) { console.log("NO SEND CARD ON DEV — cannot walk"); return; }
  await send.click();
  await page.waitForTimeout(500);

  const before = await page.evaluate(() => {
    const vis = (e: Element) => e.getBoundingClientRect().height > 0;
    const g = (s: string) => [...document.querySelectorAll(s)].find(vis) as HTMLElement | undefined;
    return { preline: (g(".tdk-pre")?.textContent ?? "").trim(), foot: !!g(".tdk-foot"), journey: !!g(".pj-foot") };
  });
  console.log("CARD:", JSON.stringify(before));

  /* a REAL click on the card's footer primary — no force */
  await page.locator(".tdk-prime").click({ timeout: 10_000 });
  await page.waitForTimeout(600);

  const inJourney = await page.evaluate(() => {
    const vis = (e: Element) => e.getBoundingClientRect().height > 0;
    const g = (s: string) => [...document.querySelectorAll(s)].find(vis) as HTMLElement | undefined;
    const prime = g(".pj-prime");
    const r = prime?.getBoundingClientRect();
    const vp = { w: window.innerWidth, h: window.innerHeight };
    const stack = r ? (document as unknown as { elementsFromPoint(x: number, y: number): Element[] })
      .elementsFromPoint(r.x + r.width / 2, r.y + r.height / 2)
      .map((e) => `${e.tagName.toLowerCase()}.${(e.getAttribute("class") ?? "—").split(" ")[0]}`) : [];
    return {
      preline: (g(".tdk-pre")?.textContent ?? "").trim(),
      name: (g(".tdk-name")?.textContent ?? "").trim(),
      back: !!g(".pj-back"),
      steps: [...document.querySelectorAll(".pj-n h4")].map((h) => (h.textContent ?? "").trim()),
      summary: (g(".pj-sum .t")?.textContent ?? "").trim(),
      primeLabel: (prime?.textContent ?? "").trim(),
      primeRect: r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } : null,
      viewport: vp,
      cardFootStillThere: !!g(".tdk-foot"),
      /* ⚠️ THE PRIZE: is anything inert, and does the primary own its own pixels */
      inertOnPage: [...document.querySelectorAll("[inert]")].map((e) => `${e.tagName.toLowerCase()}#${e.id || "—"}`),
      stackAtPrime: stack,
    };
  });
  console.log("JOURNEY:", JSON.stringify(inJourney, null, 1));
  await page.locator(".tdk-w").first().screenshot({ path: resolve(process.cwd(), "reports/pane/journey-send.png") });

  /* the controls answer a real pointer */
  await page.locator(".pj-seg button", { hasText: "Post" }).first().click();
  await page.locator(".pj-orow").first().click();
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => {
    const vis = (e: Element) => e.getBoundingClientRect().height > 0;
    const g = (s: string) => [...document.querySelectorAll(s)].find(vis) as HTMLElement | undefined;
    return {
      summary: (g(".pj-sum .t")?.textContent ?? "").trim(),
      tickedRows: [...document.querySelectorAll(".pj-orow.on")].length,
    };
  });
  console.log("AFTER TWO REAL CLICKS:", JSON.stringify(after));

  /* Escape leaves the journey and NOT the pane */
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  const escaped = await page.evaluate(() => {
    const vis = (e: Element) => e.getBoundingClientRect().height > 0;
    const g = (s: string) => [...document.querySelectorAll(s)].find(vis) as HTMLElement | undefined;
    return { journeyGone: !g(".pj-foot"), cardStillThere: !!g(".tdk-w"), foot: !!g(".tdk-foot") };
  });
  console.log("AFTER ESCAPE:", JSON.stringify(escaped));

  expect(inJourney.inertOnPage, "something is still inert — the seal is not gone").toEqual([]);
  /* ⚠️ THE COMMIT MUST BE ON SCREEN, and this assertion is here because the first build failed it:
     with the footer inside the scroller the button sat at y 1271 in a 1000px viewport. An empty
     `elementsFromPoint` is what an off-screen point returns, so asserting only "not body" passed
     vacuously — the rect is checked first. */
  expect(inJourney.primeRect, "the commit did not render").not.toBeNull();
  expect(inJourney.primeRect!.y + inJourney.primeRect!.h,
    `the commit is below the fold at y ${inJourney.primeRect!.y} — the footer is not pinned`)
    .toBeLessThanOrEqual(inJourney.viewport.h);
  expect(inJourney.stackAtPrime[0], "the commit does not own its own pixels").not.toBe("body");
  expect(escaped.journeyGone && escaped.cardStillThere, "Escape did not cascade correctly").toBe(true);
});
