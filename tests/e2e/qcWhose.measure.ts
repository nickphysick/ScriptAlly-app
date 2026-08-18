/**
 * §1 — whose window is it, on the running page.
 *
 * ⚠️ THE FAULT WAS AN ATTRIBUTION, WHICH IS INVISIBLE TO EVERY OTHER KIND OF CHECK. Both sentences
 * on the card were true — a date, and a line saying the agency states none — and nothing in the
 * markup or the tokens was wrong. Only reading what the card SAYS, against what the record holds,
 * settles it. So this walks the queries and reports each one's attribution beside its body line.
 *
 *   npx playwright test --project=measure qcWhose
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

test("§1 — every window is attributed to whoever stated it, or to nobody", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  const rows = page.locator(".f12-row");
  await rows.first().click({ timeout: 8000 });
  await page.waitForTimeout(400);

  const seen: { i: number; qual: string; body: string; barEnd: string; chip: number }[] = [];
  const n = Math.min(await rows.count(), 10);
  for (let i = 0; i < n; i++) {
    if (i >= await rows.count()) break;
    await rows.nth(i).click({ timeout: 6000 });
    await page.waitForTimeout(350);
    const r = await page.evaluate(() => {
      const t = (s: string) => (document.querySelector(s)?.textContent || "").replace(/\s+/g, " ").trim();
      const wait = document.querySelector(".tl-waitmark")?.closest(".tl-ev") ?? null;
      const ends = wait ? [...wait.querySelectorAll(".tl-wbarf span")].map((e) => (e.textContent || "").trim()) : [];
      return {
        qual: wait ? (wait.querySelector(".tl-qual")?.textContent || "").replace(/\s+/g, " ").trim() : "",
        body: t(".tl-wbody"),
        barEnd: ends[1] || "",
        chip: document.querySelectorAll(".tl-said").length,
      };
    });
    seen.push({ i, ...r });
    console.log(`  ${String(i).padStart(2)} qual "${r.qual}" · bar-end "${r.barEnd}" · body "${r.body.slice(0, 46)}"`);
  }

  /* ⚠️ THE CHIP IS GONE EVERYWHERE, not just where the attribution replaced it. */
  for (const s of seen) expect(s.chip, `query ${s.i} still draws the claim chip`).toBe(0);

  const attributed = seen.filter((s) => s.qual);
  console.log(`\n  ${attributed.length} of ${seen.length} queries state whose window it is`);
  expect(attributed.length, "no query attributes its window — nothing was built").toBeGreaterThan(0);

  for (const s of attributed) {
    /* ⚠️ EVERY ATTRIBUTION NAMES A VOICE. The three permitted shapes are the agency's claim in
       either tense and the writer's own estimate; anything else is the app speaking unattributed,
       which is the fault. */
    expect(s.qual, `query ${s.i}'s qualifier names nobody: "${s.qual}"`).toMatch(/advises?|advised|you expect/);
    /* ⚠️ AND AN ATTRIBUTED WINDOW NEVER SITS BESIDE "does not state a response time" — the exact
       contradiction the section is named for. */
    if (/advises?|advised/.test(s.qual)) {
      expect(s.body, `query ${s.i} attributes a window to an agency it says states none`).not.toContain("does not state");
    }
    /* the writer's own estimate is never labelled as an expiry */
    if (/you expect/.test(s.qual)) {
      expect(s.barEnd, `query ${s.i} calls the writer's own date an expiry`).toContain("Your estimate");
    }
  }

  /* ⚠️ AND WHERE NOBODY STATED ANYTHING THERE IS NO QUALIFIER AT ALL — the house assumption gets no
     sentence. Reported rather than required: whether this account holds such a query is data. */
  const silent = seen.filter((s) => !s.qual && s.body);
  console.log(`  ${silent.length} queries where nobody stated a window${silent.length ? ` — e.g. "${silent[0].body.slice(0, 50)}"` : " (unexercised on this account)"}`);
  for (const s of silent) {
    expect(s.barEnd, `query ${s.i} draws a bar end for a window nobody stated`).toBe("");
  }
});
