/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ITEM 4 — the group sweep, on the deployed page. Does a group row DOCK at all (it could not
 * before), and does the sweep render its cohort?
 *
 * ⚠️ IT STOPS BEFORE THE COMMIT. Pressing Record writes `updateAgent` against Nick's real agents,
 * so the primary is measured and never pressed. Chips ARE pressed — they mutate local state only.
 */
import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { resolve } from "node:path";

test.setTimeout(300_000);

test("item 4 — a group row opens the sweep", async ({ page }) => {
  await openRoute(page, "/todo", { width: 1920, height: 1000 });
  await liftMotionSuppression(page);

  const rows = page.locator(".tdg-row").filter({ hasText: /^Fix/ });
  const n = await rows.count();
  console.log("group rows on dev:", n);
  if (!n) { console.log("NO GROUP ROW — nothing to walk"); return; }

  /* item 3's line, on the row itself */
  console.log("ROW:", (await rows.first().innerText()).replace(/\s+/g, " ").trim());

  await rows.first().click();
  await page.waitForTimeout(450);

  /* ⚠️ DID THE PANE ACTUALLY MOVE? The whole point of this item is that it could not before, so
     the selection is checked before anything about the sweep is measured. */
  const sel = await page.evaluate(() => {
    const on = [...document.querySelectorAll(".tdg-row")].find((r) => r.className.includes("sel"));
    return { selected: (on?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 46) };
  });
  console.log("SELECTED:", JSON.stringify(sel));
  expect(sel.selected, "the group row still does not dock").toMatch(/^Fix/);

  const sweep = await page.evaluate(() => {
    const vis = (e: Element) => e.getBoundingClientRect().height > 0;
    const g = (s: string) => [...document.querySelectorAll(s)].find(vis) as HTMLElement | undefined;
    const rows = [...document.querySelectorAll(".psw-row")].filter(vis);
    const prime = g(".psw-prime") as HTMLButtonElement | undefined;
    return {
      pre: (g(".tdk-pre")?.textContent ?? "").trim(),
      subject: (g(".tdk-name")?.textContent ?? "").trim(),
      progress: (g(".psw-progv")?.textContent ?? "").trim(),
      lead: (g(".psw-lead")?.textContent ?? "").trim().slice(0, 80),
      rows: rows.length,
      firstRow: (rows[0]?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 90),
      chipsOn: document.querySelectorAll(".psw-chip.on").length,
      hint: (g(".psw-hint")?.textContent ?? "").trim(),
      primeLabel: (prime?.textContent ?? "").trim(),
      primeDisabled: !!prime?.disabled,
      /* the card's own footer must have stood down */
      cardPrime: !!g(".tdk-prime"),
    };
  });
  console.log("SWEEP:", JSON.stringify(sweep, null, 2));
  await page.screenshot({ path: resolve(process.cwd(), "reports/pane/group-sweep.png") });

  expect(sweep.rows, "the sweep rendered no agent rows").toBeGreaterThan(0);
  expect(sweep.chipsOn, "something was pre-selected").toBe(0);
  expect(sweep.primeDisabled, "the commit was live with nothing answered").toBe(true);
  expect(sweep.cardPrime, "two primaries on one card").toBe(false);

  /* answer one — local state only, nothing written */
  const firstAnswer = page.locator(".psw-chip, .psw-text input").first();
  if (await firstAnswer.evaluate((e) => e.tagName) === "INPUT") {
    await firstAnswer.fill("Upmarket crime with a strong voice");
  } else {
    await firstAnswer.click();
  }
  await page.waitForTimeout(300);

  const after = await page.evaluate(() => {
    const vis = (e: Element) => e.getBoundingClientRect().height > 0;
    const g = (s: string) => [...document.querySelectorAll(s)].find(vis) as HTMLElement | undefined;
    const prime = g(".psw-prime") as HTMLButtonElement | undefined;
    return {
      progress: (g(".psw-progv")?.textContent ?? "").trim(),
      bar: (() => {
        const b = document.querySelector(".psw-bar i") as HTMLElement | null;
        if (!b) return "NO BAR ELEMENT";
        const r = b.getBoundingClientRect();
        return `inline=${b.style.width} rendered=${Math.round(r.width)}x${Math.round(r.height)}`;
      })(),
      hint: (g(".psw-hint")?.textContent ?? "").trim(),
      primeLabel: (prime?.textContent ?? "").trim(),
      primeDisabled: !!prime?.disabled,
      answeredRows: document.querySelectorAll(".psw-row.done").length,
    };
  });
  console.log("AFTER ONE ANSWER:", JSON.stringify(after, null, 2));

  /* ⚠️ WHAT OWNS THE PROGRESS FIGURE'S PIXELS? The motif drew across it once. The rect is proved on
     screen before the point is asked about — an off-screen `elementsFromPoint` returns `[]`, and
     `stack[0] !== "motif"` is satisfied by `undefined`. */
  const clear = await page.evaluate(() => {
    const v = document.querySelector(".psw-progv") as HTMLElement | null;
    if (!v) return { ok: false, why: "no progress figure" };
    const r = v.getBoundingClientRect();
    if (r.width === 0 || r.bottom > innerHeight || r.right > innerWidth || r.top < 0) {
      return { ok: false, why: `off screen: ${JSON.stringify(r)}` };
    }
    const stack = [...document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2)]
      .slice(0, 3).map((e) => e.className?.toString?.() || e.tagName);
    return { ok: true, rect: `${Math.round(r.width)}x${Math.round(r.height)}`, stack };
  });
  console.log("PROGRESS FIGURE — what is on top:", JSON.stringify(clear));
  expect(clear.ok, `the progress figure could not be probed: ${(clear as { why?: string }).why}`).toBe(true);
  expect((clear as { stack: string[] }).stack[0], "the motif is drawing over the progress figure")
    .not.toMatch(/motif/i);
  await page.screenshot({ path: resolve(process.cwd(), "reports/pane/group-sweep-answered.png") });

  expect(after.primeDisabled, "the commit stayed closed after an answer").toBe(false);
  expect(after.answeredRows).toBe(1);
  console.log("STOPPING BEFORE THE COMMIT — pressing it writes updateAgent against real agents.");
});
