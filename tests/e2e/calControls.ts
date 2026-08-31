import type { Page } from "@playwright/test";
import { TIMELINE_RANGES } from "../../src/lib/timelineRanges";

/**
 * Driving the Calendar's board controls, from ONE place (v40, Phase 6).
 *
 * ⚠️ THE HELPER WAS COPY-PASTED INTO FIVE FILES AND ALL FIVE WENT RED TOGETHER. Each held its own
 * copy of "find the visible `input[type=range]` and set its value", so when v40 folded the range
 * into the `Display` popover and deleted the slider, five identical fixes were needed and nothing
 * connected them — the same shape this repo already records for a census list retyped by hand
 * rather than spliced from the lock that has it. One module now, imported.
 *
 * ⚠️ AND EVERY HELPER THROWS RATHER THAN GUARDS. A guard lets a case go on to assert about a board
 * it never switched, which is the shape that reports a real number about the wrong page.
 */

/** open the one `Display` popover, if it is not already open */
async function openDisplay(page: Page): Promise<void> {
  const already = await page.evaluate(`(() => !!document.querySelector(".tl-pop"))()`);
  if (already) return;
  await page.evaluate(`(() => {
    const b = [...document.querySelectorAll(".tl-menuwrap .tl-mbtn")]
      .filter((e) => e.getBoundingClientRect().width > 0)
      .find((e) => (e.textContent || "").trim().startsWith("Display"));
    if (!b) throw new Error("no Display control on the page");
    b.click();
  })()`);
  await page.waitForTimeout(180);
}

async function closeDisplay(page: Page): Promise<void> {
  await page.keyboard.press("Escape");
  await page.waitForTimeout(120);
}

/** pick one option inside a named row of the popover */
async function pick(page: Page, row: string, label: string): Promise<void> {
  await openDisplay(page);
  await page.evaluate(`(() => {
    const rows = [...document.querySelectorAll(".tl-poprow")];
    const r = rows.find((x) => (x.querySelector(".tl-popname")?.textContent || "").trim() === ${JSON.stringify(row)});
    if (!r) throw new Error("no Display row " + ${JSON.stringify(row)} + " — found " +
      rows.map((x) => (x.querySelector(".tl-popname")?.textContent || "").trim()).join("/"));
    const b = [...r.querySelectorAll(".tl-popopts button")]
      .find((e) => (e.textContent || "").trim() === ${JSON.stringify(label)});
    if (!b) throw new Error("no option " + ${JSON.stringify(label)} + " in " + ${JSON.stringify(row)});
    b.click();
  })()`);
  await page.waitForTimeout(600);
  await closeDisplay(page);
}

/** the three ranges, by index, in `TIMELINE_RANGES` order */
/**
 * ⚠️ SPLICED FROM THE APP'S OWN TABLE, NEVER RETYPED. This list was three hand-written strings and
 * it went stale twice: once when v35 deleted the 1-week and 2-week stops (four packs then drove
 * indices 3 and 4 against a three-stop control, where they clamp, so two of five iterations
 * silently measured the same board twice), and again when v54 renamed "1 month" to "Month". A
 * label that comes from the control it drives cannot go stale.
 */
export const RANGE_LABELS: readonly string[] = TIMELINE_RANGES.map((r) => r.label);

export async function setRangeTo(page: Page, i: number): Promise<void> {
  await pick(page, "Range", RANGE_LABELS[i]);
}

/**
 * Put the board into GROUPED, for the cases whose subject is the groups.
 *
 * ⚠️ SINCE v37 THE DEFAULT IS ONE LIST, so a case reading `.tl-gt` on the page as it opens is
 * reading a board that has no group headings by design — and it fails saying "groups without a
 * sentence", which reads like a copy bug rather than like a mode.
 */
export async function showGrouped(page: Page): Promise<void> {
  await pick(page, "Group", "Grouped");
}

export async function showOneList(page: Page): Promise<void> {
  await pick(page, "Group", "One list");
}

/** switch the board to one of the four views */
export async function showTab(page: Page, label: string): Promise<void> {
  await page.evaluate(`(() => {
    const b = [...document.querySelectorAll(".tl-tabs button")]
      .find((e) => (e.childNodes[0]?.textContent || "").trim() === ${JSON.stringify(label)});
    if (!b) throw new Error("no view tab " + ${JSON.stringify(label)});
    b.click();
  })()`);
  await page.waitForTimeout(450);
}
