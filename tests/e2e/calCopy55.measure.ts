import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { setRangeTo, RANGE_LABELS } from "./calControls";

/**
 * ⚠️ NO PASSED DATE IS PHRASED AS FUTURE (v55, Phase 4).
 *
 * The board carries four forms and each is derived. What this sweep asserts is the one thing that
 * cannot be checked form by form: that NO rendered row anywhere names a date in the future tense
 * when that date has gone. `Offer received · answer by 14 Apr` passed every per-branch check
 * because its branch returned before the derived copy could see it.
 *
 * ⚠️ THE DATE IS PARSED FROM THE RENDERED TEXT, so the claim is about what a reader sees rather
 * than about which function ran.
 */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];

test("no rendered row phrases a passed date as future", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1920, height: 900 });
  await page.addStyleTag({ content: ".tl-p, .tl-p.owed { animation: none !important; }" });
  await page.waitForTimeout(900);
  const offences: string[] = [];
  let checked = 0, futurePhrases = 0;
  for (let i = 0; i < RANGE_LABELS.length; i++) {
    await setRangeTo(page, i);
    const rows = await page.evaluate(() => {
      const vis = (e: Element) => (e as HTMLElement).getBoundingClientRect().width > 0;
      return ([...document.querySelectorAll(".tl-p")] as HTMLElement[]).filter(vis).map((c) => {
        const row = c.closest(".tl-rrow") as HTMLElement | null;
        return { name: (row?.querySelector(".tl-nm2")?.textContent || "").trim().slice(0, 18),
          text: (c.querySelector(".tl-content")?.textContent || "").trim(),
          owed: c.classList.contains("owed") || c.classList.contains("req") || c.classList.contains("decide") };
      });
    });
    for (const r of rows) {
      checked += 1;
      /* every "…by <date>" / "…expected <date>" phrasing, and whether that date has gone */
      /**
       * ⚠️ ONLY THE GENUINELY FUTURE PHRASINGS. `reply expected {date} · none yet` is the derived
       * form for an agency window that HAS passed — the date is named and the silence reported —
       * so matching "reply expected" would have flagged the correct copy as the fault. The two
       * phrasings that assert a date is still ahead are `answer by` and `send by`.
       */
      /**
       * ⚠️ NO LEADING `\b`, AND THE RED PROOF IS WHAT FOUND THAT. The content is a flex COLUMN, so
       * `textContent` concatenates its lines with no separator: the card reads
       * "Answer themOffer receivedanswer by 28 Aug". There is no word boundary between "received"
       * and "answer", so `\b(answer by)` matched nothing — the sweep reported zero phrases and
       * went green over the exact string it exists to forbid.
       */
      for (const m of r.text.matchAll(/(answer by|send by)\s+(\d{1,2})\s+([A-Z][a-z]{2,4})\b/gi)) {
        futurePhrases += 1;
        const day = Number(m[2]);
        const mon = MONTHS.findIndex((x) => x.toLowerCase() === m[3].toLowerCase());
        if (mon < 0) continue;
        const now = new Date();
        /* the nearest reading of that day/month — the board never states a year */
        let d = new Date(now.getFullYear(), mon, day);
        if (d.getTime() - now.getTime() > 200 * 864e5) d = new Date(now.getFullYear() - 1, mon, day);
        if (now.getTime() - d.getTime() > 200 * 864e5) d = new Date(now.getFullYear() + 1, mon, day);
        const daysAgo = Math.round((now.getTime() - d.getTime()) / 864e5);
        if (daysAgo > 1) {
          offences.push(`${RANGE_LABELS[i]} ${r.name}: "${m[0]}" — ${daysAgo} days ago | ${r.text.slice(0, 60)}`);
        }
      }
    }
  }
  console.log(`cards read ${checked} · future-tense date phrases ${futurePhrases}`);
  for (const o of offences.slice(0, 8)) console.log(`  ${o}`);
  /* ⚠️ POPULATION: the sweep must have found future phrasings to check, or "none of them has
     passed" is satisfied by a board that never phrases a date at all. */
  /* ⚠️ AND THE POPULATION IS REAL AFTER ALL — it read zero only because of the missing word
     boundary above. Three future phrasings survive on a correct board; a run finding none would be
     measuring a board that never states a date ahead, and the branch this was written for is
     exactly one card. */
  expect(futurePhrases, "no row phrases a date in the future tense, so nothing was checked")
    .toBeGreaterThan(0);

  expect(offences, "a row phrases a passed date as future").toEqual([]);
});

test("⚠️ AND THE OFFER'S OWN DATE TAKES THE OVERDUE FORM — the path that missed it", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1920, height: 900 });
  await page.addStyleTag({ content: ".tl-p, .tl-p.owed { animation: none !important; }" });
  await page.waitForTimeout(900);
  const offers = await page.evaluate(() => {
    const vis = (e: Element) => (e as HTMLElement).getBoundingClientRect().width > 0;
    return ([...document.querySelectorAll(".tl-p")] as HTMLElement[]).filter(vis)
      .filter((c) => /offer/i.test(c.querySelector(".tl-content")?.textContent || ""))
      .map((c) => ({ state: c.dataset.state || "",
        text: (c.querySelector(".tl-content")?.textContent || "").trim() }));
  });
  console.log(`offer cards: ${offers.length}`);
  for (const o of offers) console.log(`  [${o.state}] "${o.text}"`);
  expect(offers.length, "no offer on the board, so the branch is untested").toBeGreaterThan(0);
  /* an offer whose answer-by date has gone says so; one still ahead keeps the future phrasing */
  expect(offers.filter((o) => /answer by/i.test(o.text) && /overdue/i.test(o.text)),
    "an offer states both a future phrasing and an overdue one").toEqual([]);
});
