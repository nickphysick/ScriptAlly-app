/**
 * §1 — the expected date's provenance, on the running page.
 *
 * ⚠️ IT READS THE MIGRATION'S OWN REPORT rather than counting from outside. The plan is logged
 * whether or not the writes land — until the rules carrying `writerExpectedDate` are deployed every
 * adopt is silently denied — so the console line is the only honest source for how many queries
 * took each branch, and a probe that recounted would be a second derivation of the same thing.
 *
 *   npx playwright test --project=measure qcProvenance
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

test("§1 — the migration reports what it did, and denials are visible", async ({ page }) => {
  const lines: string[] = [];
  const denied: string[] = [];
  page.on("console", (m) => {
    const t = m.text();
    if (t.includes("expected-date migration")) lines.push(t);
    if (/insufficient permissions/i.test(t) && /quer/i.test(t)) denied.push(t.slice(0, 120));
  });

  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.waitForTimeout(6000);

  lines.forEach((l) => console.log(`  ${l}`));
  console.log(`  ${denied.length} query writes denied${denied.length ? ` — e.g. ${denied[0]}` : ""}`);
  expect(lines.length, "the migration never reported — it did not run, or found nothing to do").toBeGreaterThan(0);

  /* ⚠️ THE COUNTS ARE REPORTED, NOT REQUIRED. How many queries are in each branch is data; what is
     asserted is that the line NAMES the unresolvable branch, because a migration that makes a
     knowingly-wrong attribution and does not say how often is the thing this clause guards. */
  expect(lines[0], "the migration does not count the unresolvable branch").toContain("unresolvable");
});

test("§1 — an agency clearing its window loses it everywhere, on the page", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  const rows = page.locator(".f12-row");
  await rows.first().click({ timeout: 8000 });
  await page.waitForTimeout(600);
  const qual = () => page.evaluate(() => {
    const wait = document.querySelector(".tl-waitmark")?.closest(".tl-ev") ?? null;
    return {
      qual: wait ? (wait.querySelector(".tl-qual")?.textContent || "").replace(/\s+/g, " ").trim() : "",
      body: (document.querySelector(".tl-wbody")?.textContent || "").replace(/\s+/g, " ").trim(),
      offer: !!document.querySelector(".tl-ask"),
    };
  });
  const name = await page.evaluate(() => (document.querySelector(".f12-row.f12-sel")?.textContent || "").replace(/\s+/g, " ").trim());
  const agent = (name.match(/[A-Z][a-z]+ [A-Z][a-z]+/) || [""])[0];
  const before = await qual();
  console.log(`  query with "${agent}" · qual "${before.qual}"`);
  expect(before.qual, "this query attributes no window to begin with").toContain("advise");

  /* ── clear that agency's stated weeks ──
     ⚠️ `.agl-done` RESOLVES TO TWO ELEMENTS — the flip card mounts both faces, so both Dones are in
     the document at the same coordinates with only `backface-visibility` between them. A `.first()`
     click lands on the wrong one and commits nothing, which is what made the last pack report this
     clear as broken. Scope to the card holding the open editor. */
  await openRoute(page, "/agents", { width: 1440, height: 900 });
  await page.waitForTimeout(1500);
  const card = page.locator(".agl-acard", { hasText: agent }).first();
  await card.locator(".agl-pencil").click({ timeout: 8000 });
  await page.waitForTimeout(900);
  const weeks = (await page.locator("#agl-weeks").inputValue()).trim();
  await page.locator("#agl-weeks").fill("");
  await page.locator(".agl-done").last().click({ timeout: 8000 });
  await page.waitForTimeout(2000);
  console.log(`  cleared "${agent}"'s stated ${weeks} weeks`);

  try {
    /* ⚠️ THE SAME QUERY, BY NAME. `rows.first()` after a round trip selected a DIFFERENT agency's
       query — the list reorders — and the probe read "Whitfield advised 8 weeks" as though the
       clear had failed. A row index is not an identity. */
    await openRoute(page, "/queries", { width: 1440, height: 900 });
    await page.locator(".f12-row", { hasText: agent }).first().click({ timeout: 8000 });
    await page.waitForTimeout(700);
    const after = await qual();
    console.log(`  after · qual "${after.qual}" · body "${after.body}" · offer ${after.offer}`);
    /* ⚠️ THE WINDOW LEAVES WITH THEM. Nothing stored survives, because nothing was stored. */
    expect(after.qual, "a window survived the agency clearing it").not.toMatch(/advises?|advised/);
    /* ⚠️ `do` OR `does` — the verb agrees with whoever is being chased, and an agency takes the
       plural. Asserting the singular form made a correct sentence look like a missing one. */
    expect(after.body, "the card does not say the agency states nothing").toMatch(/do(es)? not state a response time/);
    /* and §1's card 3 finally exists: the offer to set your own */
    expect(after.offer, "no offer to set a date where nobody has stated one").toBe(true);
  } finally {
    await openRoute(page, "/agents", { width: 1440, height: 900 });
    await page.waitForTimeout(1500);
    await page.locator(".agl-acard", { hasText: agent }).first().locator(".agl-pencil").click({ timeout: 8000 });
    await page.waitForTimeout(900);
    await page.locator("#agl-weeks").fill(weeks);
    await page.locator(".agl-done").last().click({ timeout: 8000 });
    await page.waitForTimeout(1500);
    console.log(`  restored "${agent}" to ${weeks} weeks`);
  }
});
