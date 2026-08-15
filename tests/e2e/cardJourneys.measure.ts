/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PHASE 6 — THE FIVE JOURNEYS, OPENED AND MEASURED ON THE DEPLOYED PAGE.
 *
 * ⚠️ FIVE JOURNEYS WERE SPECIFIED THIS WEEK AND NOT ONE HAD BEEN RENDERED AND MEASURED. Everything
 * known about them came from unit locks reading source, which prove the code was written and say
 * nothing about what it does on a page. This reports what is actually there.
 *
 * ⚠️ MOTION SUPPRESSION IS LIFTED BEFORE ANY JOURNEY IS OPENED. `animation: none` does not fire
 * `animationend`, so a takeover whose exit is driven by that event arms its exit class and never
 * leaves — twice reported as a broken flow that was working. Suppress for static geometry; lift it
 * the moment the test changes state.
 *
 * ⚠️ IT NEVER PRESSES A COMMIT CONTROL. The route to the calendar runs through the journey's named
 * ADVANCE ("I've sent it — log it →" opens the step stack); the write lives at the far end of that
 * stack and is not touched. A measurement pass that records a send against the harness account's
 * real queries would be changing the data it is describing.
 *
 * ⚠️ ONE `openRoute` PER VIEWPORT, NOT PER JOURNEY. The first version re-opened the route ten
 * times and died on the file timeout with nothing reported — a measurement that does not finish
 * measures nothing.
 */
import { test } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const SHOTS = resolve(process.cwd(), "reports/card-conformance");

test.setTimeout(600_000);

/**
 * ⚠️ THE ROW IS FOUND BY ITS KIND TAG AND ITS OWN VERB, not by an index. Two of the five live under
 * the same `Decide` tag — an offer and an R&R are different journeys behind one bucket — so the
 * verb separates them, and it is the row's own words rather than a guess.
 */
const JOURNEYS = [
  { id: "offer", row: /^Decide.*Answer the offer/, why: "offer_received" },
  { id: "resubmit", row: /^Decide.*Send your revision/, why: "revise_resubmit" },
  { id: "send", row: /^Send/, why: "full_requested / partial_requested" },
  { id: "nudge", row: /^Chase/, why: "nudge_overdue" },
  { id: "stale", row: /^Close/, why: "no_response_close" },
] as const;

const readFlow = (page: import("@playwright/test").Page) => page.evaluate(() => {
  const r = (n: number) => Math.round(n * 10) / 10;
  const vis = (el: Element) => el.getBoundingClientRect().height > 0;
  const one = (s: string) => ([...document.querySelectorAll(s)].find(vis) as HTMLElement | undefined) ?? null;
  const txt = (el: Element | null) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
  const box = (s: string) => {
    const el = one(s);
    if (!el) return null;
    const b = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return { w: r(b.width), h: r(b.height), top: r(b.top), overflowY: cs.overflowY };
  };
  const root = one(".tdb-ff");
  if (!root) return null;
  /* ⚠️ ZERO-HEIGHT BOXES ARE THE THING TO LOOK FOR. `flex: 1 1 0%` with `min-height: 0` under a
     content-sized parent computes to EXACTLY 0 with every child mounted and correct — which is how
     the Query Centre's whole journey body measured 0px while holding a 167px step stack. A source
     scan cannot find that; this can. */
  const zeroes = [...root.querySelectorAll("*")]
    .filter((el) => el.getBoundingClientRect().height === 0
      && el.children.length > 0
      && (el.textContent ?? "").trim().length > 0)
    .map((el) => `${el.tagName.toLowerCase()}.${(el.getAttribute("class") ?? "—").split(" ")[0]}`)
    .slice(0, 8);
  /* anything running off the right edge — the second thing only a real page knows */
  const vw = document.documentElement.clientWidth;
  const overflowing = [...root.querySelectorAll("*")]
    .filter((el) => el.getBoundingClientRect().right > vw + 1)
    .map((el) => `${(el.getAttribute("class") ?? "—").split(" ")[0]} →${Math.round(el.getBoundingClientRect().right)}`)
    .slice(0, 6);
  return {
    root: box(".tdb-ff"),
    sheet: box(".tdb-ffsheet"),
    body: box(".tdb-ffbody"),
    heading: txt(one(".tdb-ffwn") ?? one("h2") ?? one("h3")),
    who: txt(one(".tdb-ffwho")).slice(0, 80),
    buttons: [...root.querySelectorAll("button")].filter(vis)
      .map((b) => txt(b).slice(0, 34)).filter(Boolean).slice(0, 12),
    zeroHeightBoxes: zeroes,
    overflowing,
    pageScrollX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
});

async function openJourney(page: import("@playwright/test").Page, rowRe: RegExp): Promise<boolean> {
  const row = page.locator(".tdg-row").filter({ hasText: rowRe }).first();
  if ((await row.count()) === 0) return false;
  await row.click({ timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(350);
  const prim = page.locator(".tdw-cbprim").first();
  if ((await prim.count()) === 0) return false;
  await prim.click({ timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(900);
  return (await page.locator(".tdb-ff").count()) > 0;
}

async function closeJourney(page: import("@playwright/test").Page): Promise<"escape" | "reload"> {
  await page.keyboard.press("Escape");
  await page.waitForTimeout(700);
  if ((await page.locator(".tdb-ff").count()) === 0) return "escape";
  await page.reload();
  await page.waitForTimeout(2500);
  await liftMotionSuppression(page);
  return "reload";
}

test("Phase 6 — the five journeys, measured", async ({ page }) => {
  mkdirSync(SHOTS, { recursive: true });
  const log: string[] = [];
  /* ⚠️ REPORTED AS IT GOES. The first run buffered everything into one `console.log` at the end
     and threw before reaching it, so a 90-second run produced no reading at all. */
  const say = (line: string) => { log.push(line); console.log(line); };

  /* ── the Calendar sheet, MEASURED rather than assumed ────────────────────────────────────── */
  await openRoute(page, "/todo", { width: 1920, height: 1000 });
  await liftMotionSuppression(page);
  let calW = 0;
  if (await openJourney(page, /^Send/)) {
    /* the named advance into the step stack — never the commit at its end */
    await page.locator(".tdb-ff button").filter({ hasText: /log it/i }).first().click({ timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(900);
    await page.locator(".tdb-ff button").filter({ hasText: /Another date/i }).first().click({ timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(700);
    const m = await page.evaluate(() => {
      const el = [...document.querySelectorAll(".cal")].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement | undefined;
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { w: Math.round(b.width), h: Math.round(b.height) };
    });
    if (m) {
      calW = m.w;
      say(`CALENDAR SHEET (RecordingCalendar, .cal) measured: ${m.w} × ${m.h}px`);
      await page.locator(".cal").first().screenshot({ path: resolve(SHOTS, "journey-calendar.png") }).catch(() => {});
    } else {
      say("CALENDAR SHEET: not reached — the step stack did not present `Another date…` this run");
    }
  }
  await closeJourney(page);

  /* ⚠️ THE SECOND VIEWPORT IS THE MEASURED SHEET. Where the measurement failed the substitution is
     reported as one, never presented as the sheet's width. */
  const narrow = calW > 0 ? calW : 360;
  say(`SECOND VIEWPORT: ${narrow}px — ${calW > 0 ? "the measured Calendar sheet" : "FALLBACK, the calendar was not measurable this run"}`);

  for (const vp of [{ width: 1920, height: 1000 }, { width: narrow, height: 1000 }]) {
    say(`\n═══════════ ${vp.width} × ${vp.height} ═══════════`);
    /* ⚠️ A VIEWPORT THAT CANNOT BE OPENED IS REPORTED, NOT THROWN. The first run of this died on
       the narrow pass — `.ws-panel` is HIDDEN below 768px, where the shell becomes a sheet — and
       took the whole 1920 report down with it. "The narrow width could not be reached, and here is
       why" is a finding; an aborted run is nothing. */
    try {
      await openRoute(page, "/todo", vp);
      await liftMotionSuppression(page);
    } catch (e) {
      say(`  ⚠️ THE PAGE DID NOT REACH ITS WORKSPACE AT THIS WIDTH — ${(e as Error).message.split("\n")[0]}`);
      say("     Below 768px the shell's sidebar is a sheet and .ws-panel is hidden, so the");
      say("     desktop workspace this pass measures is not what the page renders here.");
      continue;
    }
    for (const j of JOURNEYS) {
      const opened = await openJourney(page, j.row);
      if (!opened) { say(`  ${j.id.padEnd(9)} — DID NOT OPEN  (${j.why})`); continue; }
      const r = await readFlow(page);
      await page.screenshot({ path: resolve(SHOTS, `journey-${j.id}-${vp.width}.png`) }).catch(() => {});
      if (!r) { say(`  ${j.id.padEnd(9)} — opened, but .tdb-ff did not measure`); continue; }
      say(
        `  ${j.id.padEnd(9)} takeover ${r.root ? `${r.root.w}×${r.root.h} top ${r.root.top}` : "—"}` +
        `  sheet ${r.sheet ? `${r.sheet.w}×${r.sheet.h}` : "—"}` +
        `  body ${r.body ? `${r.body.w}×${r.body.h} overflowY ${r.body.overflowY}` : "—"}\n` +
        `            who "${r.who}"   heading "${r.heading.slice(0, 60)}"\n` +
        `            buttons [${r.buttons.join(" | ")}]\n` +
        `            zero-height boxes holding content: ${r.zeroHeightBoxes.length ? r.zeroHeightBoxes.join(", ") : "none"}\n` +
        `            past the right edge: ${r.overflowing.length ? r.overflowing.join(", ") : "none"}   page scrollX ${r.pageScrollX}`,
      );
      const how = await closeJourney(page);
      if (how === "reload") say(`            ⚠️ Escape did not close it — reloaded`);
    }
  }

  console.log(`\nScreenshots → reports/card-conformance/journey-*.png`);
});
