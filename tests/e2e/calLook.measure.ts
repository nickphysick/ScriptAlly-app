/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * calLook — a LOOK at the deployed Calendar, not a check of it.
 *
 * ⚠️ THE ACCEPTANCE RUN ASKS WHETHER THE THINGS I CHANGED ARE RIGHT. This one exists to catch what
 * I did not think to assert: the states a reviewer actually meets — a day whose record is open, the
 * layer switched off, the collapsed width, an empty day. Screenshots, no assertions.
 */
import { test } from "@playwright/test";
import { openRoute } from "./measure";

const ROUTE = "/todo/calendar";
const shot = (name: string) => `reports/calendar-fixes/look-${name}.png`;

test("calendar — a look at it", async ({ page }) => {
  /* 1 — the month, both widths */
  for (const width of [1440, 1920]) {
    await openRoute(page, ROUTE, { width, height: 900 });
    await page.screenshot({ path: shot(`month-${width}`) });
  }

  await openRoute(page, ROUTE, { width: 1440, height: 900 });

  /* 2 — a day that has record entries: 18 August carries the holding replies */
  const day18 = page.locator(".cal-cell", { has: page.locator(".cal-dn", { hasText: /^18$/ }) }).first();
  await day18.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: shot("day-with-record") });

  /* 3 — a record row expanded in place */
  const rec = page.locator(".cal-recmain").first();
  if (await rec.count()) {
    await rec.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: shot("record-expanded") });
  }

  /* 4 — an empty day: 26 August has nothing */
  const day26 = page.locator(".cal-cell", { has: page.locator(".cal-dn", { hasText: /^26$/ }) }).first();
  await day26.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: shot("empty-day") });

  /* 5 — `Upcoming only`: the record and the done cards both gone, grid starting at today's week.
     ⚠️ THE RECORD CHIP IT USED TO CLICK IS RETIRED (finishing pack, Phase 3) — the view segment
     replaced it, and `Upcoming only` is the state that used to be "record off" plus the done
     cards dropped. */
  await page.locator(".cal-segb", { hasText: /Upcoming only/i }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: shot("upcoming-only") });
  await page.locator(".cal-segb", { hasText: /Done & upcoming/i }).click();

  /* 6 — the collapsed width */
  await openRoute(page, ROUTE, { width: 1000, height: 900 });
  await page.screenshot({ path: shot("collapsed-1000"), fullPage: true });

  console.log("shots written to reports/calendar-fixes/look-*.png");
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   THE FINISHING PACK — Step 0's two measured questions, then Phase 7's acceptance.

   ⚠️ THIS FILE WAS "SCREENSHOTS, NO ASSERTIONS" AND NOW CARRIES BOTH. The finishing pack's
   territory names it as the calendar's harness file, so the acceptance lands here rather than in a
   new file outside the fence. The look test above is untouched and keeps its own purpose.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * Step 0 item 5 — FOOT-MARGIN PARITY.
 *
 * ⚠️ THE CHASSIS PACK FIXED THE 21px BUT ITS MARGIN-PARITY ADDENDUM WAS NEVER EVIDENCED. This
 * establishes the three numbers so the claim is a measurement rather than an assumption.
 *
 * ⚠️ ALL THREE PAGES FILL — NONE OF THEM SCROLLS — so the foot gap is simply where the ink stops.
 * Probed and confirmed: the only page-level scroller on any of the three is the sidebar `nav.ws-nav`;
 * everything else that scrolls is an inner pane. A first attempt scrolled `.wpg-scroll` to its
 * bottom first and changed nothing, because there is nothing there to scroll.
 *
 * ⚠️ AND IT COUNTS ONLY INK THAT LANDS INSIDE THE VIEWPORT. A naive "lowest box" walk descends into
 * those inner panes and reports their OVERFLOWED content: `/queries` read 1959px — a true number
 * about a pane's scroll extent, and nothing whatever to do with a foot margin. The bottom-most box
 * that is actually on screen is the gap a reader sees.
 *
 * ⚠️ AND IT WALKS FROM A VISIBLE `.ws-main`, NEVER `querySelector` BY CLASS. Every workspace page
 * stays mounted; a bare query can return a hidden page's zero-sized copy.
 */
test("finishing Step 0 — foot-margin parity across the three pages", async ({ page }) => {
  const ROUTES = ["/queries", "/todo", "/todo/calendar"];
  const rows: string[] = [];

  for (const route of ROUTES) {
    await openRoute(page, route, { width: 1440, height: 900 });
    const r = await page.evaluate(() => {
      const px = (n: number) => Math.round(n * 100) / 100;
      const vis = (sel: string) =>
        Array.from(document.querySelectorAll(sel))
          .find((e) => (e as HTMLElement).getBoundingClientRect().height > 0) as HTMLElement | undefined;

      const main = vis(".ws-main");
      if (!main) return null;
      const mb = main.getBoundingClientRect();
      const cs = getComputedStyle(main);
      const vh = window.innerHeight;

      /* the bottom-most painted box that is ON SCREEN — what the reader's eye stops at */
      let lowest = -Infinity, lowestTag = "";
      for (const el of Array.from(main.querySelectorAll("*")) as HTMLElement[]) {
        const b = el.getBoundingClientRect();
        if (b.height < 2 || b.width < 2) continue;
        if (b.bottom > vh + 0.5) continue;            // clipped away or below the fold
        const s2 = getComputedStyle(el);
        if (s2.visibility === "hidden" || s2.display === "none") continue;
        if (b.bottom > lowest) {
          lowest = b.bottom;
          lowestTag = `${el.tagName.toLowerCase()}.${(el.className || "").toString().split(/\s+/)[0]}`;
        }
      }
      const win = vis(".ws-window") ?? vis(".ws-winwrap");
      const wb = win?.getBoundingClientRect();
      return {
        winBottom: wb ? px(wb.bottom) : null,
        winGap: wb ? px(vh - wb.bottom) : null,
        winTag: win ? `${win.tagName.toLowerCase()}.${(win.className||"").toString().split(/\s+/)[0]}` : null,
        vh,
        pageScrolls: document.documentElement.scrollHeight > document.documentElement.clientHeight,
        mainBottom: px(mb.bottom),
        mainPadB: cs.paddingBottom,
        lowestInk: px(lowest), lowestTag,
        footGap: px(vh - lowest),
      };
    });
    if (!r) { rows.push(`  ${route.padEnd(16)}  no visible .ws-main`); continue; }
    rows.push(
      `  ${route.padEnd(16)} vh ${r.vh}  main-bottom ${String(r.mainBottom).padStart(6)} (pad-b ${r.mainPadB})  ` +
      `WINDOW ${r.winTag} ends ${String(r.winBottom).padStart(6)} -> CHASSIS FOOT ${String(r.winGap).padStart(5)}   ` +
      `| lowest ink ${String(r.lowestInk).padStart(7)} ${r.lowestTag.padEnd(16)} gap ${String(r.footGap).padStart(6)}`,
    );
  }
  console.log("\n──── foot-margin parity @1440×900 (all three FILL) ────\n" + rows.join("\n"));
});
