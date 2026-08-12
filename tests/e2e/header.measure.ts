/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The four pages Nick measured by hand, measured the same way through the real browser.
 *
 * ⚠️ THIS IS NOT A PASS/FAIL SUITE. It reports numbers. The acceptance criterion is that they
 * MATCH what the console snippet reported on the running app — if they disagree, this tool is
 * wrong, because the running app is the authority and not the thing measuring it.
 */
import { test } from "@playwright/test";
import { openRoute, readHeader, readScroll, scrollbarWidth, format } from "./measure";

const PAGES: [string, string][] = [
  ["Contact list", "/agents"],
  ["Submission packages", "/manuscripts/packages"],
  ["Manuscripts", "/manuscripts"],
  ["To-do", "/todo"],
];

for (const [label, route] of PAGES) {
  test(`measure · ${label}`, async ({ page }) => {
    await openRoute(page, route);
    const sbw = await scrollbarWidth(page);
    const rest = await readHeader(page, label, "REST");
    const work = await readHeader(page, label, "WORKING");
    const scroll = await readScroll(page);

    const lines = [`\n══ ${label}  (${route})  scrollbar ${sbw}px — ${sbw >= 10 ? "CLASSIC" : "OVERLAY ⚠️ measurements unreliable"}`];
    if (!rest) {
      lines.push("  NO .wpg — this page is not on the grid");
    } else {
      lines.push(format(rest), format(work!));
    }
    lines.push(
      `  SCROLL  .wpg-scroll ${JSON.stringify(scroll.wpgScroll)}`,
      `          .tpl-zone   ${JSON.stringify(scroll.tplZone)}`,
      `          reclaim ${scroll.reclaim}  safeToStrip ${scroll.safeToStrip}  toolbarRendered ${scroll.toolbarRendered}`,
      `          --content-gutter ${scroll.contentGutter}  --header-inset ${scroll.headerInset}`,
    );
    console.log(lines.join("\n"));
  });
}
