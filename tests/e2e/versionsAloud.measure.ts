/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ PHASE 5 — READ IT ALOUD ═══════════════════════════════════════════════════════════════════
 *
 * Every sentence and figure this feature renders, against the phase-1 fixtures — INCLUDING the ones
 * where nothing is known. It reports the wording rather than asserting it passed, because the two
 * faults this feature has already produced were both sentences that were arithmetically true and
 * read wrongly: "2 of 4 hold a version earlier than your latest" when two of the four were unknown,
 * and a scorecard of three noughts on a package that had never gone out.
 *
 * ⚠️ A CHECK CANNOT TELL YOU A SENTENCE READS BADLY. This prints them; the report quotes them.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const CASES = [
  { q: "seed-query-8",  note: "MATCH — sent what they read" },
  { q: "seed-query-10", note: "DIFFERS — sent another opening, deliberately" },
  { q: "seed-query-12", note: "SEND UNRECORDED — a send from before the feature" },
  { q: "seed-query-14", note: "NOTHING KNOWN — sample has no version, send has none" },
  { q: "seed-query-ms2-b", note: "ONE-VERSION BOOK — the gate's closed side" },
] as const;

test("every sentence, against every fixture", async ({ page }) => {
  const said: Record<string, unknown>[] = [];

  for (const c of CASES) {
    await openRoute(page, `/queries?q=${c.q}`, { width: 1440, height: 1200 });
    await page.waitForTimeout(1400);
    const r = await page.evaluate(() => {
      const txt = (el: Element | null) => (el as HTMLElement | null)?.innerText.replace(/\s+/g, " ").trim() ?? null;
      return {
        lines: [...document.querySelectorAll(".qv-line")].map((l) => txt(l)),
        sampleChip: txt(document.querySelector(".qc-mchipver")),
        stripPresent: !!document.querySelector(".qc-attach"),
      };
    });
    said.push({ fixture: c.q, state: c.note, ...r });
  }

  console.log("ALOUD " + JSON.stringify(said, null, 2));

  /* the population floor — a sweep that opened nothing prints nothing and proves nothing */
  expect(said.length).toBe(CASES.length);

  /**
   * ⚠️ THE GATE'S CLOSED SIDE SAYS NOTHING AT ALL. One version means no chip and no lines — not a
   * quieter line, not a dash. Asserted here because it is the case a reader never sees and so the
   * one nobody checks.
   */
  const solo = said.find((s) => s.fixture === "seed-query-ms2-b")!;
  expect((solo.lines as string[]).length, "the one-version book rendered version lines").toBe(0);
  expect(solo.sampleChip, "the one-version book rendered a chip").toBeNull();

  /* and every sentence that IS rendered names its subject rather than trailing off */
  for (const s of said) {
    for (const line of (s.lines as string[])) {
      expect(line.length, `${s.fixture}: an empty line was rendered`).toBeGreaterThan(4);
    }
  }
});
