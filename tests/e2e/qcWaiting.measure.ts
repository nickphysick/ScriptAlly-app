/**
 * §5 — the waiting state's three situations, on the running page.
 *
 * ⚠️ THE CLAIM IS "ONE SHAPE, THREE SITUATIONS", so this walks every query and records which shape
 * each one drew. A single sampled query cannot tell a rule from a coincidence.
 *
 *   npx playwright test --project=measure qcWaiting
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

test("§5 — title, chip, bar and marker agree about what is true", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 1000 });

  const seen: any[] = [];
  for (let i = 0; i < 24; i++) {
    const row = page.locator(".f12-row").nth(i);
    if (!(await row.count())) break;
    await row.scrollIntoViewIfNeeded();
    await row.click({ timeout: 5000 });
    await page.waitForTimeout(280);
    const read = await page.evaluate((n) => {
      const mark = document.querySelector<HTMLElement>(".tl-waitmark");
      if (!mark) return null;
      const ev = mark.closest(".tl-ev") as HTMLElement;
      const title = (ev.querySelector(".tl-evtitle span")?.textContent || "").trim();
      const said = ev.querySelector<HTMLElement>(".tl-said");
      const bar = ev.querySelector<HTMLElement>(".tl-wbar");
      const fill = bar?.querySelector<HTMLElement>("i");
      const cs = getComputedStyle(mark);
      return {
        row: n, title,
        tone: mark.className.includes("--sage") ? "sage" : "oat",
        ring: cs.borderTopColor,
        chip: said ? (said.textContent || "").replace(/\s+/g, " ").trim() : null,
        bar: bar ? { past: bar.className.includes("--past"), pct: fill ? Math.round((fill.getBoundingClientRect().width / bar.getBoundingClientRect().width) * 100) : 0 } : null,
        ends: (ev.querySelector(".tl-wbarf")?.textContent || "").replace(/\s+/g, " ").trim(),
        body: (ev.querySelector(".tl-wbody")?.textContent || "").trim(),
        ask: (ev.querySelector(".tl-ask")?.textContent || "").replace(/\s+/g, " ").trim(),
        conv: (ev.querySelector(".tl-conv")?.textContent || "").trim(),
        /* the retired fourth shape, and the retired copy */
        grace: document.querySelectorAll(".tl-gracebar").length,
        oldCopy: (ev.textContent || "").includes("no expected date set"),
      };
    }, i);
    if (read) seen.push(read);
  }

  for (const s of seen) {
    console.log(`  row ${String(s.row).padStart(2)} · ${s.tone.padEnd(4)} · "${s.title}"`);
    if (s.chip) console.log(`         chip  "${s.chip}"`);
    if (s.bar) console.log(`         bar   ${s.bar.pct}%${s.bar.past ? " spent" : ""} · ${s.ends}`);
    if (s.body) console.log(`         body  "${s.body}"`);
    if (s.ask) console.log(`         ask   "${s.ask}"`);
    if (s.conv) console.log(`         conv  "${s.conv}"`);
  }
  expect(seen.length, "no waiting query on the page").toBeGreaterThan(0);

  const kinds = new Set<string>();
  for (const s of seen) {
    expect(s.grace, "the retired grace box is still rendered").toBe(0);
    /* ⚠️ THE COPY IS THE AGENCY'S ABSENCE, NOT THE WRITER'S OVERSIGHT. */
    expect(s.oldCopy, `row ${s.row} still says "no expected date set"`).toBe(false);

    if (s.bar) {
      /* a bar means a window: it must have both end labels, and the title/tone must agree */
      expect(s.ends, `row ${s.row}: a bar with no end labels`).toMatch(/Sent /);
      if (s.bar.past) {
        kinds.add("past");
        expect(s.title, `row ${s.row}: past the window and still titled "${s.title}"`).toBe("No reply");
        expect(s.tone, `row ${s.row}: past the window with a sage ring`).toBe("oat");
        expect(s.ends, `row ${s.row}: a spent bar without its closing date`).toContain("Window closed");
        expect(s.conv, `row ${s.row}: no convention line past the window`).toContain("silence as a pass");
      } else {
        kinds.add("inside");
        expect(s.title, `row ${s.row}: inside the window and titled "${s.title}"`).toBe("Waiting to hear back");
        expect(s.tone, `row ${s.row}: inside the window with an oat ring`).toBe("sage");
        expect(s.ends, `row ${s.row}: an open bar without its expected date`).toContain("Expected by");
        expect(s.conv, `row ${s.row}: the convention line on a query still inside its window`).toBe("");
      }
    } else if (s.chip) {
      /* ⚠️ §3 · A STATED WINDOW WITH NO SEND DATE — the case that used to contradict itself, and
         the reason this branch exists at all: the chip quoted the weeks the agency stated while the
         line beneath said they stated nothing. It is neither of the other two. */
      kinds.add("stated-undated");
      expect(s.title, `row ${s.row}: a stated window titled "${s.title}"`).toBe("Waiting to hear back");
      expect(s.body, `row ${s.row}: a chip and a "states nothing" line on one card`).not.toMatch(/not state a response time/);
      expect(s.ends, `row ${s.row}: end labels with no bar to anchor them`).toBe("");
    } else {
      /* ⚠️ NO WINDOW: NO BAR AND NO END LABELS — nothing to measure against. */
      kinds.add("unstated");
      expect(s.title, `row ${s.row}: no window and titled "${s.title}"`).toBe("Waiting to hear back");
      expect(s.tone, `row ${s.row}: no window with a sage ring`).toBe("oat");
      expect(s.ends, `row ${s.row}: end labels with no bar to anchor them`).toBe("");
      expect(s.body, `row ${s.row}: no window and no sentence saying so`).toMatch(/do(es)? not state a response time/);
      expect(s.chip, `row ${s.row}: a claim chip for an agency that stated nothing`).toBeNull();
    }
  }
  console.log(`\nsituations rendered: ${[...kinds].join(", ")} (of inside, past, unstated, stated-undated)`);
  /* ⚠️ THE CONTRADICTION, ASSERTED ACROSS THE WHOLE LIST rather than on one card: no query anywhere
     may quote an agency's weeks and deny they stated any. */
  const both = seen.filter((s: any) => s.chip && /not state a response time/.test(s.body));
  expect(both.length, `${both.length} card(s) both quote a window and deny one`).toBe(0);
});
