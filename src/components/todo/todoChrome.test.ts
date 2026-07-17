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

describe("P2 — the done pill (the collision killed; badge = the band toggle)", () => {
  const css = readFileSync(join(here, "todo.css"), "utf8");
  const tour = readFileSync(join(here, "TodoTour.tsx"), "utf8");

  it("the .tdb-cd collision is resolved by renaming the TOUR side (Nick's call)", () => {
    expect(css).not.toMatch(/\.tdb-cd[\s.{]/); // no .tdb-cd rules survive anywhere
    expect(tour).toContain("tdb-coachdot");
    expect(css).toContain(".tdb-coachdot { width: 6px; height: 6px;");
  });

  it("the badge renders only when done > 0, carries aria-pressed, and gates the band", () => {
    expect(page).toContain('{doneN > 0 && <button type="button" className="tdb-cdone" aria-pressed={showDone}');
    expect(page).toContain("{doneN > 0 && showDone && (");
    expect(page).toContain("const [showDone, setShowDone] = useState(true);"); // pressed/shown default
  });

  it("the badge is the committed pill's grammar in the done-sage family; the header row never wraps", () => {
    const badge = css.match(/\.tdb-th \.tdb-cdone \{([^}]*)\}/)?.[1] ?? "";
    expect(badge).toContain("font-size: 10.5px");
    expect(badge).toContain("border: 1px solid var(--hk-spine)");
    expect(badge).toContain("color: var(--hk-ink)");
    expect(badge).toContain("white-space: nowrap");
    expect(css).toContain('.tdb-th .tdb-cdone[aria-pressed="true"] { background: var(--hk-sage); }');
    expect(css).toMatch(/\.tdb-th \{[^}]*flex-wrap: nowrap/);
  });
});

describe("P3 — journey exit chrome lives IN the sheet", () => {
  const flow = readFileSync(join(here, "FocusFlow.tsx"), "utf8");
  const css = readFileSync(join(here, "todo.css"), "utf8");

  it("the viewport-floating chrome row is gone; nothing renders outside the sheet but the scrim", () => {
    expect(flow).not.toContain("tdb-ffchrome");
    expect(css).not.toContain("tdb-ffchrome");
    // markup order: the stage's sheet CONTAINS the bar, which carries the exit
    const frame = flow.match(/className=\{`tdb-ffsheet[\s\S]*?tdb-ffbar[\s\S]*?tdb-ffexit/)?.[0] ?? "";
    expect(frame).not.toBe("");
  });

  it("the exit pill is labelled and rides the SAME dismiss guard on every step of every mode", () => {
    expect(flow).toContain("✕&nbsp;&nbsp;Back to my desk");
    expect(flow).toMatch(/tdb-ffexit" onClick=\{\(\) => requestExit\(\)\}/);
    expect(flow).toContain("if (staged.length && !window.confirm("); // clean = immediate, staged = confirm
  });

  it("dots + count render in multi-item modes only, inside the bar (the Sunday review feeds the SAME chrome its own steps)", () => {
    expect(flow).toContain(": items.length > 1 && (");
    expect(flow).toContain("{review ? (");
  });

  it("the staged chip sits in the sheet FOOTER, left of the Back button (sheet renders it before foot)", () => {
    const foot = flow.match(/className="tdb-fffoot">[\s\S]{0,220}/)?.[0] ?? "";
    expect(foot).toContain("tdb-ffpend");
    expect(foot.indexOf("tdb-ffpend")).toBeLessThan(foot.indexOf("{foot}"));
  });

  it("every in-step skip is KEPT (semantically distinct: skip advances, exit discards behind confirm)", () => {
    for (const skip of ["Leave it", "Not now — leave it", "Skip the rest", "Skip — I’ll send them now"]) {
      expect(flow).toContain(skip);
    }
  });
});
