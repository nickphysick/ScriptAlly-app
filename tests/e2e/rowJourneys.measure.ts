/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The to-do row's four completion journeys, driven on the rendered page (to-do row round, 20 Sep;
 * refs `todo-journeys.html`, `todo-row-narrow.html`).
 *
 * ⚠️ EVERY CASE HERE COMMITS, SO EVERY CASE RESTORES IN A `finally`. The harness account is the
 * fixture, and a run that writes and dies leaves the next run measuring a board it changed — which
 * has already happened once in this round: three probes committed nudges, died before their undo,
 * and the "Worth a nudge" group was empty for the rest of the session. The account had to be
 * re-seeded. So the undo is not the last assertion, it is the `finally`.
 *
 * ⚠️ AND THE FIXTURE IS `seedRowJourneys.mjs`, NOT THE SHARED ONE. A send journey needs a query with
 * no send logged, and the moment anything ticks it there is one — so the shared board provides that
 * state exactly once. `rj-send` and `rj-dupe` are written fresh and removed by `--clean`.
 *
 * ⚠️ THE NARROW VARIANT IS WHAT THE DASHBOARD RENDERS. The card is ~460px, so the row's container
 * query is under its 560px threshold on every window: `.os-tdav` is absent and the manuscript is on
 * its own line. The full row is the To-do page's, and the two are measured as different claims.
 */
import { expect, test, type Page } from "@playwright/test";
import { openRoute } from "./measure";

const ROW = "[data-probe='todo-row']";
async function openDash(page: Page, width = 1440) {
  await openRoute(page, "/dashboard", { width, height: 900 });
  await page.locator("[data-probe='todo-card']").first().waitFor({ state: "visible" });
  /* the board derives from three listeners; a row count that has stopped changing is settled */
  await expect.poll(async () => page.locator(ROW).count(), { timeout: 15000 }).toBeGreaterThan(0);
}

/** the row whose sentence names this agent — the ids are not in the DOM, the names are */
const rowFor = (page: Page, who: string) => page.locator(ROW).filter({ hasText: who }).first();

/**
 * Tick a row and wait for its strip.
 *
 * ⚠️ THE TICK IS OPTIMISTIC AND THE WRITE IS NOT, so "the strip appeared" is the only honest signal
 * that the commit resolved. Asserting on the checkbox alone passes before anything has been written.
 */
async function tick(row: ReturnType<typeof rowFor>) {
  await row.locator("[data-probe='todo-tick']").click();
  await row.locator("[data-probe='todo-strip']").waitFor({ state: "visible", timeout: 15000 });
  return (await row.locator("[data-probe='todo-strip']").innerText()).replace(/\s+/g, " ").trim();
}

/** press the strip's Undo and wait for the row to come back ticked-off */
async function undo(row: ReturnType<typeof rowFor>) {
  const button = row.locator("[data-probe='todo-undo']");
  if (!(await button.count())) return false;
  await button.click();
  await row.locator("[data-probe='todo-strip']").waitFor({ state: "detached", timeout: 15000 }).catch(() => {});
  return true;
}

test.describe("J · the row's completion journeys", () => {
  test("J1 · a send the writer has never logged commits on one tick, and Undo takes it back", async ({ page }) => {
    await openDash(page);
    const row = rowFor(page, "Imogen Vale");
    await expect(row).toBeVisible();

    /* the precondition: it is a send row, so the tick has one meaning and must not ask */
    const before = (await row.innerText()).replace(/\s+/g, " ").trim();
    expect(before).toContain("Send your full");

    let committed = false;
    try {
      const strip = await tick(row);
      committed = true;
      /* the strip states what was logged and the one date that follows from it */
      expect(strip).toMatch(/^Logged:/);
      expect(strip).toMatch(/Reply due/);
      /* ⚠️ AND NO MENU OPENED. One meaning commits; several ask. A `.os-tdmenu` here would mean
         `journeyFor` had classified a send as a choice, which is the fault that shipped once. */
      expect(await row.locator("[data-probe='todo-menu']").count()).toBe(0);
      expect(await row.locator("[data-probe='todo-change']").count()).toBe(1);
    } finally {
      if (committed) expect(await undo(row)).toBe(true);
    }

    /* the account is back where it started: the row is live again and says the same thing */
    await expect.poll(async () => (await row.innerText()).replace(/\s+/g, " ").trim(),
      { timeout: 15000 }).toContain("Send your full");
  });

  test("J2 · a second send of the same materials opens the editor rather than committing", async ({ page }) => {
    await openDash(page);
    const row = rowFor(page, "Tobias Hark");
    await expect(row).toBeVisible();

    await row.locator("[data-probe='todo-tick']").click();

    /* ⚠️ THE GUARD'S WHOLE POINT IS THAT NOTHING WAS WRITTEN. The editor opens pre-filled, the
       warning is above the fields, and Save reads `Log it anyway` — so the question has a home and
       the optimistic path only runs once it is answered. */
    const editor = row.locator("[data-probe='todo-edit']");
    await editor.waitFor({ state: "visible", timeout: 15000 });
    const warn = await row.locator("[data-probe='todo-warn']").innerText();
    expect(warn.toLowerCase()).toContain("logged a full");
    expect(await row.locator("[data-probe='todo-save']").innerText()).toBe("Log it anyway");
    /* no strip, because no commit */
    expect(await row.locator("[data-probe='todo-strip']").count()).toBe(0);

    /* Cancel is a real cancel — the record is untouched either way */
    await row.locator(".os-tdb--quiet").click();
    await editor.waitFor({ state: "detached", timeout: 10000 });
    await expect.poll(async () => (await row.innerText()).replace(/\s+/g, " ").trim(),
      { timeout: 15000 }).toContain("Send your full");
  });

  test("J3 · a snooze leaves a strip carrying an Undo, and Undo restores the row", async ({ page }) => {
    await openDash(page);
    const row = rowFor(page, "Imogen Vale");
    await row.hover();

    let moved = false;
    try {
      await row.locator("[data-probe='todo-snooze']").click();
      /* ⚠️ A RANGE AND A COMMIT, NOT A LIST OF STOPS. And the FIRST assertion is that the track
         exists at all: a ceiling of 0 replaces it with `This one cannot be put off`, which is how
         the fabricated `daysUntilDeadline` hid — the dial opened, looked deliberate, and refused
         every stop. A probe that clicked a stop would have timed out and read as a slow page. */
      const dial = page.locator(".snz-dial").first();
      await dial.waitFor({ state: "visible", timeout: 15000 });
      const text = (await dial.innerText()).replace(/\s+/g, " ");
      expect(text, "the dial offers stops rather than refusing").not.toContain("cannot be put off");
      const range = page.locator(".snz-range").first();
      await expect(range).toBeVisible();
      await range.focus();
      await range.press("ArrowRight");
      await page.locator(".snz-go").first().click();
      moved = true;

      /**
       * ⚠️ THE CLAIM IS THE STRIP, NOT A ROW COUNT — and the first version asserted the count and
       * therefore could not see the fault. A snooze that removed the row silently satisfies
       * `before - 1` perfectly; what it fails is §4, which says every one of these actions leaves a
       * way back. It did not, for one build, on the control sitting beside Dismiss, which does.
       */
      const strip = row.locator("[data-probe='todo-strip']");
      await strip.waitFor({ state: "visible", timeout: 15000 });
      expect((await strip.innerText()).replace(/\s+/g, " ")).toMatch(/Put off/);
      expect(await row.locator("[data-probe='todo-undo']").count(), "a snooze offers an Undo").toBe(1);
      /* and nothing to Change — a snooze recorded no fact about the query to correct */
      expect(await row.locator("[data-probe='todo-change']").count()).toBe(0);
    } finally {
      if (moved) expect(await undo(row)).toBe(true);
    }

    await expect.poll(async () => (await row.innerText()).replace(/\s+/g, " ").trim(),
      { timeout: 15000 }).toContain("Send your full");
  });

  test("J4 · dismiss is one click, and Undo restores the row", async ({ page }) => {
    await openDash(page);
    const row = rowFor(page, "Imogen Vale");
    await row.hover();

    let gone = false;
    try {
      await row.locator("[data-probe='todo-dismiss']").click();
      gone = true;
      /* ⚠️ ONE CLICK, NO CONFIRM. Dismissing is reversible from the strip, so a dialogue would be
         asking permission for something the next control already undoes.
         ⚠️ AND THE STRIP IS READ INSIDE THE ROW, never as the page's first. An unscoped
         `.first()` is satisfied by any strip anywhere, including one another case left behind. */
      const strip = row.locator("[data-probe='todo-strip']");
      await strip.waitFor({ state: "visible", timeout: 15000 });
      expect((await strip.innerText()).replace(/\s+/g, " ")).toContain("won’t be suggested again");
      expect(await row.locator("[data-probe='todo-undo']").count()).toBe(1);
    } finally {
      if (gone) expect(await undo(row)).toBe(true);
    }

    await expect.poll(async () => (await row.innerText()).replace(/\s+/g, " ").trim(),
      { timeout: 15000 }).toContain("Send your full");
  });

  test("J5 · the dashboard renders the narrow variant, at both widths", async ({ page }) => {
    for (const width of [1440, 1280]) {
      await openDash(page, width);
      const row = page.locator(ROW).first();
      const shape = await row.evaluate((el) => {
        const cs = getComputedStyle(el);
        const av = el.querySelector(".os-tdav") as HTMLElement | null;
        const ms = el.querySelector(".os-tdms") as HTMLElement | null;
        const l1 = el.querySelector(".os-tdl1") as HTMLElement | null;
        const fact = el.querySelector(".os-tdfact") as HTMLElement | null;
        return {
          cols: cs.gridTemplateColumns.split(" ").length,
          /* ⚠️ THE CLAIM IS THAT IT DOES NOT PAINT, NOT THAT IT IS ABSENT. The first version
             counted elements and went red on a correct page: the narrow rule is `display: none`,
             so the node is still in the DOM and `querySelectorAll` finds it either way. */
          avPaints: av ? getComputedStyle(av).display !== "none" && av.getBoundingClientRect().width > 0 : false,
          /* the manuscript on its OWN line — a block inside the sentence, not an inline run */
          msBlock: ms ? getComputedStyle(ms).display : null,
          msBelow: ms && l1 ? ms.getBoundingClientRect().top > l1.getBoundingClientRect().top : null,
          /* the fact truncates rather than the pill */
          factEllipsis: fact ? getComputedStyle(fact).textOverflow : null,
          cardW: Math.round((el.closest("[data-probe='todo-card']") as HTMLElement).getBoundingClientRect().width),
        };
      });
      expect(shape.avPaints, `avatar does not paint at ${width}`).toBe(false);
      expect(shape.cols, `four tracks at ${width}`).toBe(4);
      expect(shape.msBlock, `manuscript is its own line at ${width}`).toBe("block");
      expect(shape.msBelow, `manuscript below the task at ${width}`).toBe(true);
      expect(shape.factEllipsis, `fact ellipsises at ${width}`).toBe("ellipsis");
      /* the container query's precondition: the card really is under the 560px threshold */
      expect(shape.cardW, `card under the narrow threshold at ${width}`).toBeLessThan(560);
      /* ⚠️ CLIPPED TO THE CARD. A full-frame shot at 1440 spends nine tenths of itself on the rest
         of the dashboard and renders the rows about an inch tall in the corner — which is not
         evidence about a row. */
      const card = page.locator("[data-probe='todo-card']").first();
      await card.screenshot({ path: `run-artifacts/todo-row-narrow-${width}.png` });
    }
  });

  /**
   * ⚠️ THE FACT LINE, READ ACROSS EVERY ROW — because the fault it catches was invisible one row at
   * a time. `meta` fell back to `c.record`, which is the agent AND the agency, and the line already
   * opens with the agency: three of eight rows read
   * **"BRIGHT LITERARY · NOAH BRIGHT · BRIGHT LITERARY"** through a green unit lock that asserted
   * exactly that string on a single hand-built card.
   *
   * ⚠️ AND IT PRINTS THE SET IT SAW. A board that happens to hold only dated rows never enters the
   * undated branch at all, so a pass would mean "the one state present behaves" — the monoculture
   * this repo has three worked examples of. The tally names both branches and the case requires
   * each to have been entered.
   */
  test("J6 · no row's fact line says the same thing twice, in either branch", async ({ page }) => {
    await openDash(page);
    const facts: string[] = await page.locator(ROW).evaluateAll((els) =>
      els.map((el) => (el.querySelector(".os-tdfact") as HTMLElement | null)?.textContent?.trim() ?? ""));

    expect(facts.length, "rows to read").toBeGreaterThan(3);
    const dated = facts.filter((f) => /\d/.test(f));
    const undated = facts.filter((f) => f && !/\d/.test(f));
    // eslint-disable-next-line no-console
    console.log(`J6 · ${facts.length} rows — ${dated.length} dated, ${undated.length} undated`);
    expect(dated.length, "the dated branch was exercised").toBeGreaterThan(0);
    expect(undated.length, "the undated branch was exercised").toBeGreaterThan(0);

    for (const f of facts) {
      const runs = f.split("·").map((s) => s.trim()).filter(Boolean);
      expect(new Set(runs).size, `a fact line repeats itself: "${f}"`).toBe(runs.length);
    }
  });
});
