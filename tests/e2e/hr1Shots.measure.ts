/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Header rules v1.1 — the report's screenshots: each in-scope page at 1280 × 800 and 1512 × 900 with the rule lines
 * drawn over it, as in the compare screens. Pink: the eyebrow's top (H2), the stack's bottom, the content's top (H7).
 * Blue: the art's left 14 (H4), the 24 gutter (H1), the text column (H5), the right item's inset (H6). Each line is
 * placed from the RULE, not from the element, so a page off the rule shows the gap. Writes
 * reports/header-rules-v1/shots/. Asserts only that each hero was found. Puts the guide's state back.
 */
import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { openRoute } from "./measure";

const OUT = "reports/header-rules-v1/shots";
const flags = (a: string) => execSync(`node tests/e2e/guideFlags.mjs --page queries ${a}`, { encoding: "utf8" }).trim().split("\n").pop()!;
let original = "null";
test.beforeAll(() => { original = flags(""); });
test.afterAll(() => { flags(`--restore '${original}'`); });

const PAGES: [string, string, string, string?][] = [
  ["contacts", "/agents", "[data-cl17='header']"],
  ["queries", "/queries", "[data-qc138='header']"],
  ["analytics", "/queries/analytics", "[data-a21='header']"],
  ["responses", "/queries/responses", "[data-rsp='header']"],
  ["discover", "/agents/discover", "[data-dv1='header']", "live"],
  /* Submission packages left the shared hero with v26 (25 Oct); its own shots are pk26Shots.measure.ts */
  ["todo", "/todo", "[data-td5='header']"],
];
const RULES: Record<number, { textX: number; stackB: number; ri: number; content: number }> = {
  1280: { textX: 243, stackB: 215, ri: 64, content: 259 },
  1512: { textX: 243, stackB: 215, ri: 178, content: 259 },
};

test("header rules v1.1 shots", async ({ page }) => {
  test.setTimeout(900_000);
  mkdirSync(OUT, { recursive: true });
  flags(`--restore '${JSON.stringify({ seen: true, done: { log: true, find: true, open: true, pin: true, resp: true, birds: true } })}'`);
  for (const vp of [{ width: 1280, height: 800 }, { width: 1512, height: 900 }]) {
    for (const [key, route, header, init] of PAGES) {
      await page.addInitScript((init) => {
        try { for (const k of ["contacts", "queries", "manuscripts", "todo", "analytics", "responses", "discover", "packages"]) localStorage.setItem(`sa.guide.${k}`, "1"); for (const k of ["agents", "queries", "todo", "packages", "responses"]) localStorage.removeItem(`sa.pinList.${k}`); if (init === "live") (window as unknown as { __SA_DV_STATE?: string }).__SA_DV_STATE = "live"; } catch { /* */ }
      }, init ?? "");
      await openRoute(page, route, vp);
      await page.waitForTimeout(3500);
      await page.mouse.move(5, 5);
      expect(await page.locator(header).count(), `${key}: the hero`).toBeGreaterThan(0);
      const r = RULES[vp.width];
      await page.evaluate((r) => {
        const sh = [...document.querySelectorAll<HTMLElement>(".ws-window")].find((e) => e.getBoundingClientRect().width > 0)!.getBoundingClientRect();
        const host = document.createElement("div");
        host.setAttribute("data-hr1-overlay", "");
        host.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:2147483647";
        const line = (x: number | null, y: number | null, colour: string, label: string) => {
          const d = document.createElement("div");
          d.style.cssText = x !== null
            ? `position:absolute;left:${sh.left + x}px;top:${sh.top}px;height:${sh.height}px;border-left:1px dashed ${colour}`
            : `position:absolute;top:${sh.top + y!}px;left:${sh.left}px;width:${sh.width}px;border-top:1px dashed ${colour}`;
          const t = document.createElement("span");
          t.textContent = label;
          t.style.cssText = `position:absolute;${x !== null ? "top:6px;left:2px" : "right:4px;top:-9px"};font:600 10px/1 ui-monospace,monospace;color:#fff;background:${colour};padding:2px 4px;border-radius:3px;white-space:nowrap`;
          d.appendChild(t);
          host.appendChild(d);
        };
        const pink = "#d6336c", blue = "#1c7ed6";
        line(null, 36, pink, "36 eyebrow top");
        line(null, r.stackB, pink, "stack bottom (rule)");
        line(null, r.content, pink, "+44 content top (rule)");
        line(14, null, blue, "14 art");
        line(24, null, blue, "24 gutter");
        line(r.textX, null, blue, `${r.textX} text`);
        line(sh.width - r.ri, null, blue, `inset ${r.ri}`);
        document.body.appendChild(host);
      }, r);
      await page.screenshot({ path: `${OUT}/${key}-${vp.width}.png` });
      await page.evaluate(() => document.querySelector("[data-hr1-overlay]")?.remove());
    }
  }
});
