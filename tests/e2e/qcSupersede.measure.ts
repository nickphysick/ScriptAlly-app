/**
 * §3 — one suggestion at a time, on the running page.
 *
 * ⚠️ THE CLAIM IS THAT TWO THINGS NEVER APPEAR TOGETHER, and an absence measured on one query says
 * nothing: the query might simply not be a close candidate. So the probe finds a query that IS
 * offering closure, sets a reminder on it, and re-reads — the same query, both states.
 *
 *   npx playwright test --project=measure qcSupersede
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const read = (page: import("@playwright/test").Page) => page.evaluate(() => {
  const txt = (s: string) => (document.querySelector(s)?.textContent || "").replace(/\s+/g, " ").trim();
  return {
    offer: txt(".tl-offer-f"),
    offerActions: [...document.querySelectorAll(".tl-offer-a button")].map((b) => (b.textContent || "").trim()),
    ghost: txt(".tl-ev--ghost"),
    /* the bar's tasks control states its own count when there is one */
    tasks: txt(".qc-phead .qc-btn-fwd + * , .qc-phead"),
  };
});

test("§3 — a scheduled nudge supersedes the close, everywhere", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  const rows = page.locator(".f12-row");
  await rows.first().click({ timeout: 8000 });
  await page.waitForTimeout(400);

  /**
   * ⚠️ THE WHOLE ACCOUNT, NOT ONE QUERY. The claim is that two things never appear together, and an
   * absence read off a single query settles nothing — it might simply not be a close candidate. So
   * every query is classified, and BOTH populations have to be present for the pass to mean
   * anything: one with a booked chase, one being offered closure.
   */
  const seen: { i: number; ghost: boolean; acts: string[]; offer: string }[] = [];
  const n = Math.min(await rows.count(), 12);
  for (let i = 0; i < n; i++) {
    if (i >= await rows.count()) break;
    await rows.nth(i).click({ timeout: 6000 });
    await page.waitForTimeout(350);
    const r = await read(page);
    seen.push({ i, ghost: r.ghost.includes("Nudge reminder set"), acts: r.offerActions, offer: r.offer });
    console.log(`  ${String(i).padStart(2)} ghost ${r.ghost.includes("Nudge reminder set") ? "yes" : "no "} · offer ${r.offerActions.join(", ") || "(none)"}`);
  }

  /* if nothing on the account has a reminder, make one so the positive case is real */
  if (!seen.some((s) => s.ghost)) {
    const target = seen.find((s) => s.acts.includes("Remind me later"));
    expect(target, "no query has a reminder and none offers a way to set one").toBeTruthy();
    await rows.nth(target!.i).click({ timeout: 6000 });
    await page.waitForTimeout(350);
    await page.locator(".tl-offer-keep", { hasText: "Remind me later" }).first().click();
    await page.waitForTimeout(2000);
    const r = await read(page);
    console.log(`  set a reminder on ${target!.i} → ghost ${r.ghost.includes("Nudge reminder set")} · offer ${r.offerActions.join(", ") || "(none)"}`);
    seen[seen.findIndex((s) => s.i === target!.i)] = { i: target!.i, ghost: r.ghost.includes("Nudge reminder set"), acts: r.offerActions, offer: r.offer };
  }

  const booked = seen.filter((s) => s.ghost);
  const offered = seen.filter((s) => s.acts.includes("Mark closed"));
  console.log(`\n  ${booked.length} queries with a booked chase · ${offered.length} being offered closure`);
  expect(booked.length, "no query has a scheduled nudge — the positive case is unexercised").toBeGreaterThan(0);
  expect(offered.length, "no query is being offered closure — the negative case is unexercised").toBeGreaterThan(0);

  /* ⚠️ THE INVARIANT: NEVER BOTH, ON ANY QUERY. */
  for (const s of booked) {
    expect(s.acts, `query ${s.i} offers closure beside a booked chase`).not.toContain("Mark closed");
    expect(s.offer, `query ${s.i} states an offer beside a booked chase`).toBe("");
  }

  /* ⚠️ AND NOT ON THE TO-DO PAGE EITHER — the same suppression, one surface along. The wording is
     checked while we are there, since the board renders its own copy for this task rather than the
     feed's title, which is how the two came to say different things about one card. */
  await openRoute(page, "/todo", { width: 1440, height: 900 });
  await page.waitForTimeout(1500);
  const todo = await page.evaluate(() => {
    const text = document.body.innerText;
    const rows = [...document.querySelectorAll<HTMLElement>(".tdg-row")].map((r) => (r.textContent || "").replace(/\s+/g, " ").trim());
    return {
      jargon: text.includes("No response limit hit"),
      rawDays: /silent for \d+ days/i.test(text),
      closes: rows.filter((r) => /^Close/.test(r)),
      rows: rows.length,
    };
  });
  console.log(`  to-do: ${todo.rows} rows · jargon ${todo.jargon} · raw day counts ${todo.rawDays}`);
  todo.closes.forEach((c) => console.log(`    close row: "${c.slice(0, 80)}"`));
  expect(todo.jargon, "the system jargon is on the to-do page").toBe(false);
  expect(todo.rawDays, "a stale card still counts raw days in its title").toBe(false);

  /**
   * ⚠️ THE TWO SURFACES RECONCILED AGAINST EACH OTHER, not against a number. The tracker offers
   * closure on N queries; the to-do page must carry exactly N close rows. A `toBe(2)` on both sides
   * would go green the day the suppression broke in the same direction on both — which is the whole
   * failure mode of putting one rule in two places, and the reason §3 put it in one.
   *
   * ⚠️ AND THE `Close` ROWS ARE THE PROOF OF THE SUPPRESSION, not the wording: the grouped list
   * renders a per-KIND deed ("Log the close"), never `card.title`, so the reworded sentence does not
   * surface here at all — it surfaces wherever `card.title` is drawn, and the jargon was never here
   * either. Stated so a green is not read as proof the new wording was seen on this page.
   */
  expect(todo.closes.length, `the tracker offers closure on ${offered.length} queries and the board carries ${todo.closes.length} close rows`)
    .toBe(offered.length);

});
