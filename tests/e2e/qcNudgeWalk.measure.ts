/**
 * §2 + §4d + §5 — the states no query in the dev account has yet, reached through the app's own
 * flows and then measured.
 *
 * ⚠️ IT CHANGES DEV DATA, AND THAT IS THE POINT. Chapters begin at the SECOND send and a nudge
 * record needs a nudge; with neither in the account, every assertion about them passes by being
 * skipped. This drives the real controls — Mark sent, Nudge — so what is measured afterwards is
 * what the app produced, not a fixture.
 *
 *   npx playwright test --project=measure qcNudgeWalk
 */
import { test, expect, Page } from "@playwright/test";
import { openRoute } from "./measure";

const statusOf = (page: Page) => page.evaluate(() => (document.querySelector(".qc-mstx")?.textContent || "").trim());

/** Select rows until one whose pane reports `want`. */
async function selectWithStatus(page: Page, want: RegExp): Promise<number> {
  for (let i = 0; i < 20; i++) {
    const row = page.locator(".f12-row").nth(i);
    if (!(await row.count())) break;
    await row.scrollIntoViewIfNeeded();
    await row.click({ timeout: 5000 });
    await page.waitForTimeout(250);
    if (want.test(await statusOf(page))) return i;
  }
  return -1;
}

test("walk — nudge a waiting query, then read what it left behind", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 1000 });

  /* a query past its window: the pack says a nudge there proceeds with no confirm */
  const row = await selectWithStatus(page, /Queried/);
  expect(row, "no queried query to nudge").toBeGreaterThanOrEqual(0);
  const already = await page.locator(".tl-ev--minor").count();
  console.log(`\nrow ${row} · ${await statusOf(page)} · ${already} minor events before`);

  const nudge = page.locator('.qc-phead button:has(span:text-is("Nudge")), .qc-phead button:has(span:text-is("Nudged"))').first();
  await nudge.click();
  await page.waitForTimeout(500);
  if (await page.locator(".qc-nask").count()) { await page.locator(".qc-nask-go").click(); await page.waitForTimeout(500); }

  /* the nudge flow's own confirm — the existing NudgeModal, unchanged by this pack */
  const send = page.locator('button:has-text("Log nudge"), button:has-text("Record nudge"), button:has-text("Save"), button:has-text("Confirm")').first();
  const label = (await send.count()) ? (await send.innerText()).trim() : "(none)";
  console.log(`  nudge flow's action: "${label}"`);
  expect(await send.count(), "the nudge flow did not open").toBeGreaterThan(0);
  await send.click();
  await page.waitForTimeout(1600);

  /* ── what it left behind ── */
  const after = await page.evaluate(() => {
    const minor = [...document.querySelectorAll<HTMLElement>(".tl-ev--minor")].map((m) => ({
      text: (m.textContent || "").replace(/\s+/g, " ").trim(),
      titles: m.querySelectorAll(".tl-evtitle").length,
      markW: Math.round(m.querySelector(".tl-evmark")!.getBoundingClientRect().width),
      centreX: (() => { const r = m.querySelector(".tl-evmark")!.getBoundingClientRect(); return Math.round(r.left + r.width / 2 - m.getBoundingClientRect().left); })(),
    }));
    const big = [...document.querySelectorAll<HTMLElement>(".tl-ev:not(.tl-ev--minor) .tl-evmark")].map((k) => {
      const r = k.getBoundingClientRect();
      return Math.round(r.left + r.width / 2 - (k.closest(".tl-ev") as HTMLElement).getBoundingClientRect().left);
    });
    const btn = [...document.querySelectorAll<HTMLElement>(".qc-phead button")].find((b) => /^Nudged?\b/.test((b.querySelector("span")?.textContent || "").trim()));
    const pads = [...document.querySelectorAll<HTMLElement>(".tl-ev")].slice(0, -1).map((e) => getComputedStyle(e).paddingBottom);
    return {
      minor, bigCentres: big,
      control: (btn?.textContent || "").replace(/\s+/g, " ").trim(),
      history: (document.querySelector(".tl-nhist")?.textContent || "").trim(),
      offer: document.querySelectorAll(".tl-offer").length,
      pads: [...new Set(pads)],
    };
  });

  console.log(`  minor events: ${JSON.stringify(after.minor)}`);
  console.log(`  substantive mark centres: ${after.bigCentres.join(", ")}`);
  console.log(`  control now reads: "${after.control}"`);
  console.log(`  history line: "${after.history}"`);
  console.log(`  closure offers on screen: ${after.offer}`);
  console.log(`  every event's gap: ${after.pads.join(" / ")}`);

  /* §5a — the outcome, not the act */
  expect(after.minor.length, "the nudge left no timeline event").toBeGreaterThan(already);
  const nudged = after.minor[after.minor.length - 1];
  expect(nudged.text, "the nudge event does not state its outcome").toContain("Nudged — no reply");
  /* §2 — minor treatment */
  expect(nudged.titles, "the nudge drew a title row").toBe(0);
  expect(nudged.markW, `the nudge's mark is ${nudged.markW}px`).toBeLessThanOrEqual(12);
  expect(new Set([...after.minor.map((m) => m.centreX), ...after.bigCentres]).size, "the rail bends at the minor event").toBe(1);
  expect(after.pads.length, `the gap is not one figure: ${after.pads.join(", ")}`).toBe(1);
  /* §4d */
  expect(after.control, "the control does not report that it has been used").toMatch(/^Nudged\b/);
  /* ⚠️ "today" OR "N ago" — a nudge sent moments ago is not "0 days ago", which is what the first
     run of this walk measured and what `nudgedAgoLabel` now prevents. */
  expect(after.control, `the nudged state states no time at all: "${after.control}"`).toMatch(/today|ago/);
  expect(after.control, "a nudge sent today counted a duration instead of naming the day").not.toContain("0 days");
  /* §5b — ⚠️ ASSERTED AGAINST THE ROWS, NOT AGAINST A LITERAL. "Nudged once" was right for the
     first run of this walk and wrong for the second, which is what a hand-written expectation about
     data the test itself creates always becomes. The line and the timeline must agree. */
  expect(after.history, "no nudge history line").toMatch(/^Nudged (once|twice|\d+ times|three times|four times)/);
  const said = { once: 1, twice: 2, "three times": 3, "four times": 4 }[after.history.split(" · ")[0].replace("Nudged ", "")] ?? 0;
  expect(said, `the history says "${after.history.split(" · ")[0]}" over ${after.minor.length} nudge events`).toBe(after.minor.length);
  expect(after.history.split(" · ")[1].split(", ").length, "the line lists fewer dates than nudges").toBe(after.minor.length);
  /* §5c — one nudge and a recent window is the ref's first card: no offer */
  expect(after.offer, "closure was offered on a query nudged moments ago").toBe(0);
});

/**
 * ⚠️ THE SECOND HALF OF THIS WALK IS WITHDRAWN, AND WHY IS WORTH KEEPING. Marking a partial as sent
 * opens the RECORD-RESPONSE journey — a step stack with its own state, whose Save sits disabled
 * until the steps are answered. Driving it from here would be a second implementation of that
 * flow's rules inside a measurement, which is the harness fault in a new costume; and this pack
 * changes nothing in it.
 *
 * ⚠️ SO THE ≥2-CHAPTER RENDERING IS UNMEASURED ON THE PAGE, deliberately and reportedly. No query
 * in the dev account has TWO sends — chapters begin at the second one — so `qcChapters` skips that
 * half rather than passing vacuously, and will measure it the moment such a query exists.
 */

/**
 * ⚠️ THE WALK CLEANS UP AFTER ITSELF. Its nudges are real records on a real dev account; leaving
 * them would be this measurement editing Nick's data as a side effect. Deleting through the row's
 * own ⋯ is also the only exercise the correction menu gets on a MINOR event, which §2 changed.
 */
test("walk — remove the nudges the walk logged", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 1000 });
  await selectWithStatus(page, /Queried/);
  let removed = 0;
  for (let i = 0; i < 6; i++) {
    const minor = page.locator(".tl-ev--minor");
    if (!(await minor.count())) break;
    await minor.first().locator(".tl-more").click({ timeout: 4000 });
    await page.waitForTimeout(300);
    await page.locator('[role="menu"] button:has-text("Delete")').first().click();
    await page.waitForTimeout(400);
    const confirm = page.locator('button:has-text("Delete"), button:has-text("Confirm")').last();
    await confirm.click();
    await page.waitForTimeout(1400);
    removed++;
  }
  const left = await page.locator(".tl-ev--minor").count();
  console.log(`\nremoved ${removed} nudge${removed === 1 ? "" : "s"} · ${left} left on the query`);
  expect(left, "the walk left its own records behind").toBe(0);
});
