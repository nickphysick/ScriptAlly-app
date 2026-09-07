/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ ONE WAY TO OPEN A TASK, BECAUSE TWENTY-SIX SUITES HAD THEIR OWN.
 *
 * The To-do page has three views — Grid (the default), List and Board — and only List draws
 * `.tlc .row`. Twenty-six e2e suites open a task by clicking that row. When the QC-chassis round
 * made the ticket grid the default, none of them errored: they found no row, took no action, and
 * printed reports that read as passes. Three were caught only because a later phase happened to
 * re-run them.
 *
 * So the view is SELECTED, never assumed, and it is selected in one function. A future default
 * change breaks this file loudly rather than twenty-six files quietly — which is the whole of the
 * argument, and it is the same argument as `visiblePage` below.
 *
 * ⚠️ AND A SUBJECT THAT CANNOT BE FOUND THROWS. `openTaskInView` does not return a boolean for a
 * caller to ignore; every failure names what it looked for and how many it found. A probe that
 * finds nothing and says nothing is the fault this file exists to end.
 */
import type { Page } from "@playwright/test";
import { liftMotionSuppression, visiblePage } from "./measure";

export type TodoView = "grid" | "list" | "board";

/** what each view draws as its per-task target, keyed by the view that draws it */
const TARGET: Record<TodoView, string> = {
  grid: ".tkt",
  list: ".tlc .row",
  board: ".brd-card",
};

/**
 * ⚠️ THE ONE WAY IN. `page.goto("/todo")` lands on whatever view is DEFAULT, and the default moved
 * — so twenty-six suites went on clicking a list row that is no longer drawn, found nothing, and
 * printed reports that read as passes. Every one of them now arrives through here and names the
 * view it was written for.
 *
 * It is not a wrapper for tidiness: it is the single point a future default change breaks. The
 * suites keep their own waits and their own way of choosing a row; what they no longer each own is
 * the assumption about which body is on screen.
 */
export async function gotoTodo(page: Page, view: TodoView = "list"): Promise<string> {
  await page.goto("/todo");
  await page.waitForTimeout(3000);
  return selectTodoView(page, view);
}

/**
 * Put the visible To-do page in `view`, and return the scope prefix for it.
 *
 * ⚠️ IT THROWS WHERE IT CANNOT. A segment that is not on the switch, or a view that draws nothing,
 * is a suite that cannot find its subject — which has FAILED, not skipped.
 */
export async function selectTodoView(page: Page, view: TodoView): Promise<string> {
  const scope = await visiblePage(page, ".wpg");
  const picked = await page.evaluate((v: string) => {
    const root = document.querySelector('[data-sa-vis="1"]');
    if (!root) return "no visible page";
    const b = [...root.querySelectorAll(".qvs button")]
      .find((x) => (x.textContent || "").trim().toLowerCase() === v) as HTMLElement | undefined;
    if (!b) return "no such segment";
    b.click();
    return "";
  }, view);
  if (picked) {
    throw new Error(`selectTodoView("${view}"): ${picked}. The switch offers Grid, List and Board; ` +
      "a suite that cannot find its subject has FAILED, not skipped.");
  }
  await page.waitForTimeout(600);
  return scope;
}

/**
 * Put the page in `view` and open the task at `index`, returning the scope prefix for the visible
 * page (every probe downstream must be scoped — the workspace keeps every page mounted).
 *
 * ⚠️ IT NAVIGATES ONLY IF IT HAS TO. A caller already on `/todo` mid-run keeps its scroll and its
 * filters; a caller that has not arrived gets there. `goto` on every call would silently reset
 * state a suite had just set up.
 */
export async function openTaskInView(
  page: Page, view: TodoView, index = 0, opts: { navigate?: boolean } = {},
): Promise<string> {
  const navigate = opts.navigate ?? !page.url().includes("/todo");
  if (navigate) {
    await page.goto("/todo");
    await page.waitForTimeout(3000);
    await liftMotionSuppression(page);
  }

  const scope = await visiblePage(page, ".wpg");

  /* the view switch is the Query Centre's own `QueryViewSwitch`; its segments are buttons with
     the view's word as their accessible name */
  await selectTodoView(page, view);

  const targets = page.locator(`${scope}${TARGET[view]}`);
  const n = await targets.count();
  if (n <= index) {
    throw new Error(
      `openTaskInView: ${view} view draws ${n} of "${TARGET[view]}" and index ${index} was asked for. ` +
      "A suite that cannot find its subject has FAILED, not skipped — either the fixture is empty " +
      "or this view no longer draws that element.",
    );
  }
  await targets.nth(index).click();
  await page.waitForTimeout(900);

  /* ⚠️ THE PANE MUST BE ON SCREEN, AND "ON SCREEN" IS MEASURED. Opening a task and finding nothing
     is the fault, not a skip — and a bare `.tpn` count is not the test either, because the
     workspace keeps every page mounted and a hidden copy counts. A visible rect is the claim. */
  const pane = await page.evaluate(() => [...document.querySelectorAll(".tpn")]
    .filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0; }).length);
  if (!pane) throw new Error(`openTaskInView: clicked ${view} task ${index} and no visible ".tpn" pane appeared`);
  return scope;
}

/**
 * ⚠️ THE ARITHMETIC GUARD. A run whose assertion count falls below its own last recorded count is
 * red, whatever its individual cases say — because the failure this catches is a suite quietly
 * measuring half of itself, which no individual case can see.
 */
export function assertCount(actual: number, floor: number, suite: string): void {
  if (actual < floor) {
    throw new Error(
      `${suite}: ${actual} assertions ran, and the last recorded count was ${floor}. ` +
      "A run that measures less than it used to is red. Either restore the missing cases or " +
      "lower the floor DELIBERATELY, in the same commit that removes them.",
    );
  }
}
