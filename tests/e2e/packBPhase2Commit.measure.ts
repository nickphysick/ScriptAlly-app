/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ PACK B PHASE 2 — THE PRIMARY STILL WRITES, AND THE CURSOR STILL LANDS ════════════════════
 *
 * ⚠️ THIS ONE WRITES TO THE DEV DATABASE, deliberately. Committing a primary is the whole claim:
 * the session assembles the writer's answers and hands them to the page's committer, which is the
 * seam the move cut through. Nothing short of pressing it proves the two halves still meet.
 *
 * ⚠️ SO IT CONSUMES A FIXTURE CARD EVERY RUN, AND IT IS NOT A REPEATABLE CHECK. Each pass advances
 * one query from *Requested to *Sent, which is one fewer Send card on the account. Three runs
 * during the Phase 2 verification exhausted them, and `node tests/e2e/seed.mjs` — the canonical
 * restore — is itself denied at its FIRST write at the time of writing (rules probe says the
 * deployed dev rules are current, so the seeder and the deployed ruleset have diverged; reported,
 * not fixed, because it is shared harness infrastructure). **Re-seed before running this, and run
 * it once.** The precondition below fails loudly rather than passing on an empty board.
 *
 * ⚠️ AND IT IS THE ONLY PLACE THE CURSOR CLAIM CAN BE MADE. "The next card is read off the board as
 * it WAS" was statement order before the move and is closure capture after it — `paneHost.advance`
 * reads the `dockable` of the render in which the primary was pressed. Source cannot tell those
 * apart; a commit that lands on the right card can.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

test("Pack B Phase 2 — a primary commits, and the dock lands on the pre-write successor", async ({ page }) => {
  const errs: string[] = [];
  const writes: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  page.on("pageerror", (e) => errs.push(String(e)));
  page.on("request", (r) => {
    const u = r.url();
    if (/firestore\.googleapis\.com/.test(u) && /Write|commit|Commit/.test(u + r.method())) {
      writes.push(`${r.method()} ${u.split("?")[0].split("/").slice(-1)[0]} ${(r.postData() ?? "").slice(0, 400)}`);
    }
  });

  await openRoute(page, "/todo", { width: 1440, height: 900 });

  /* ⚠️ THE BOARD AS IT WAS, CAPTURED BEFORE THE PRESS — this is the reference the cursor claim is
     made against, and it has to be taken now because the commit is what destroys it. */
  const before = await page.evaluate(() => Array.from(document.querySelectorAll(".row"))
    .filter((e) => (e as HTMLElement).getBoundingClientRect().height > 0)
    .map((e) => (e.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 56)));
  console.log(`dock order before the write (${before.length} rows):`);
  before.slice(0, 8).forEach((r, i) => console.log(`   ${i}: ${r}`));

  const target = before.findIndex((r) => /Send your (full|partial)/i.test(r));
  expect(target, "no Send card — nothing to commit").toBeGreaterThan(-1);
  const successor = before[target + 1] ?? before[target - 1];
  console.log(`\ncommitting row ${target}; its pre-write successor is: ${successor}`);

  const pt = await page.evaluate((i) => {
    const row = Array.from(document.querySelectorAll(".row"))
      .filter((e) => (e as HTMLElement).getBoundingClientRect().height > 0)[i] as HTMLElement;
    row.scrollIntoView({ block: "center" });
    const r = row.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  }, target);
  await page.waitForTimeout(250);
  await page.mouse.click(pt.x, pt.y);
  await page.waitForTimeout(500);

  /**
   * ⚠️ ONE ANSWER PER TICK, AND THIS COST A RUN. Every handler calls `onChange({ ...value, x })`,
   * so three clicks inside one `evaluate` all spread the SAME stale `value` and only the last
   * survives — the primary went from "3 to answer" to "2 to answer" on three clicks and the commit
   * was correctly withheld. React has to commit between them.
   */
  const pick = async (sel: string, label: string) => {
    const hit = await page.evaluate((s) => {
      const pane = Array.from(document.querySelectorAll(".tpn"))
        .filter((e) => (e as HTMLElement).getBoundingClientRect().height > 0)[0] as HTMLElement;
      const b = Array.from(pane.querySelectorAll<HTMLButtonElement>(`${s.split("|")[0]} button`))
        .find((x) => (x.textContent ?? "").trim().startsWith(s.split("|")[1]));
      b?.click(); return !!b;
    }, sel);
    await page.waitForTimeout(320);
    const left = await page.evaluate(() => (Array.from(document.querySelectorAll(".tpn"))
      .filter((e) => (e as HTMLElement).getBoundingClientRect().height > 0)[0] as HTMLElement)
      .querySelector("button.ab.go")?.textContent?.replace(/\s+/g, " ").trim());
    console.log(`   ${label}: ${hit ? "clicked" : "NOT FOUND"} → primary reads "${left}"`);
    return hit;
  };
  console.log("staging the gate's four answers, one per tick:");
  await pick("#s-unit|Pages", "unit");
  await pick("#s-when|Today", "when");
  await pick("#s-expect|6 weeks", "expect");
  await pick("#s-remind|No reminder", "remind");

  const staged = await page.evaluate(() => {
    const pane = Array.from(document.querySelectorAll(".tpn"))
      .filter((e) => (e as HTMLElement).getBoundingClientRect().height > 0)[0] as HTMLElement;
    return {
      deed: (pane.querySelector(".deed")?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 56),
      primary: (pane.querySelector("button.ab.go")?.textContent ?? "").replace(/\s+/g, " ").trim(),
      will: (pane.querySelector(".will")?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 140),
    };
  });
  console.log("staged pane:", JSON.stringify(staged));

  writes.length = 0;
  await page.evaluate(() => {
    const pane = Array.from(document.querySelectorAll(".tpn"))
      .filter((e) => (e as HTMLElement).getBoundingClientRect().height > 0)[0] as HTMLElement;
    (pane.querySelector("button.ab.go") as HTMLButtonElement).click();
  });
  await page.waitForTimeout(3500);

  const after = await page.evaluate(() => {
    const pane = Array.from(document.querySelectorAll(".tpn"))
      .filter((e) => (e as HTMLElement).getBoundingClientRect().height > 0)[0] as HTMLElement | undefined;
    return {
      deed: (pane?.querySelector(".deed")?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 140),
      band: (pane?.querySelector(".band")?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 140),
      toast: (document.querySelector(".sa-toast")?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 90),
      rows: Array.from(document.querySelectorAll(".row"))
        .filter((e) => (e as HTMLElement).getBoundingClientRect().height > 0)
        .map((e) => (e.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 56)),
    };
  });

  console.log(`\nfirestore writes observed: ${writes.length}`);
  writes.slice(0, 4).forEach((w) => console.log("   " + w.slice(0, 220)));
  console.log(`\ntoast: ${after.toast || "(none)"}`);
  console.log(`pane now on: ${after.deed}`);
  console.log(`the committed card is still listed: ${after.rows.some((r) => r.startsWith(staged.deed.slice(0, 30)))}`);
  console.log(`rows: ${before.length} → ${after.rows.length}`);
  console.log("console errors:", errs.length ? JSON.stringify(errs.slice(0, 4)) : "none");

  expect(writes.length, "pressing the primary produced no Firestore write — the seam is broken").toBeGreaterThan(0);
  expect(after.deed, "the pane stayed on the card it just committed — it did not advance").not.toBe(staged.deed);
  /**
   * ⚠️ THE CURSOR CLAIM: the successor is the one from the PRE-write board. Resolving against the
   * board as it BECOMES would land on whatever slid into that index instead.
   *
   * ⚠️ AND THE TWO SURFACES SPELL A CARD DIFFERENTLY, which cost a run. The row reads
   * "SendSend your partialMarcus Reed · Reed & Partners" — lane label, then deed, then agent —
   * while the pane's deed reads "Send your partial manuscript for The Smoke Test to Marcus Reed".
   * A prefix comparison between them fails on a page that is behaving perfectly. So the card is
   * identified by the two facts BOTH surfaces state: its parcel and its agent.
   */
  /**
   * ⚠️ THE AGENT IS THE ONE FACT BOTH SURFACES ALWAYS STATE, and narrowing to the parcel was wrong
   * twice over: `textContent` concatenates a row's spans with no separator (the string really is
   * "SendSend your partialPriya Nair", so `\bpartial\b` never matches), and the successor is not
   * always a Send — the third run's was an offer, which has no parcel at all. A card is identified
   * here by its agent, and the pane may state it in the deed or the band.
   */
  const who = (successor ?? "").match(/\b([A-Z][a-z]+ [A-Z][a-z]+)\b/)?.[1];
  expect(who, "could not identify the successor's agent — this check would assert nothing").toBeTruthy();
  console.log(`the pre-write successor is identified by its agent: ${who}`);
  expect(`${after.deed} ${after.band}`, "the dock did not land on the pre-write successor")
    .toContain(who!);
  expect(errs, "the commit threw").toEqual([]);
});
