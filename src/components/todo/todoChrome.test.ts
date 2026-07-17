/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Chrome-fixes pack locks (pop-up click-away · done pill · journey exit). The repo's testing
 * policy is logic-only (no component mounts), so the pack's behavioural tests are pinned at the
 * source/rule-text layer; feel checks are Nick's in-browser list.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const here = dirname(fileURLToPath(import.meta.url));
const page = readFileSync(join(here, "ToDoPage.tsx"), "utf8");

describe("P1 — pop-up click-away collapse", () => {
  it("ONE close path: the ✕, click-away and Esc all call closeToday (no parallel close logic)", () => {
    expect(page).toContain("const closeToday = () => setTodayOpen(false);");
    expect(page).toContain('onClick={closeToday} aria-label="Close"');
    // exactly one other setTodayOpen call — the FAB's open
    const calls = page.match(/setTodayOpen\((?:true|false)\)/g) ?? [];
    expect(calls.filter((c) => c === "setTodayOpen(false)").length).toBe(1); // inside closeToday only
    expect(calls.filter((c) => c === "setTodayOpen(true)").length).toBe(1); // the FAB
  });

  it("the listener is document-level pointerdown, attached only while expanded, cleaned up", () => {
    expect(page).toContain("if (!todayOpen) return;");
    expect(page).toContain('document.addEventListener("pointerdown", onDown);');
    expect(page).toContain('document.removeEventListener("pointerdown", onDown);');
  });

  it("inside-pop clicks and the add-to-list pills are exempt; everything is inert while a journey is open", () => {
    expect(page).toContain('t.closest(".tdb-pop")');
    expect(page).toContain('t.closest(".tdb-pill.today-p")');
    expect(page).toContain('e.key === "Escape" && !flow');
    // the exemption selector matches the real add control
    expect(page).toContain("className={`tdb-pill today-p${committed ?");
  });
});
