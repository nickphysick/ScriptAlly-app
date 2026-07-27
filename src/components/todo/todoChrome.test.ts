/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Chrome-fixes pack locks (done pill · journey exit). The click-away describe retired with the
 * corner pop-up (workbench pack — the panel lives in the drawer, always open). The repo's testing
 * policy is logic-only (no component mounts), so the pack's behavioural tests are pinned at the
 * source/rule-text layer; feel checks are Nick's in-browser list.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const here = dirname(fileURLToPath(import.meta.url));
const page = readFileSync(join(here, "ToDoPage.tsx"), "utf8");

describe("P2 — the done pill (the collision killed; badge = the band toggle)", () => {
  const css = readFileSync(join(here, "todo.css"), "utf8");
  const tour = readFileSync(join(here, "TodoTour.tsx"), "utf8");

  it("the .tdb-cd collision is resolved by renaming the TOUR side (Nick's call)", () => {
    expect(css).not.toMatch(/\.tdb-cd[\s.{]/); // no .tdb-cd rules survive anywhere
    expect(tour).toContain("tdb-coachdot");
    expect(css).toContain(".tdb-coachdot { width: 6px; height: 6px;");
  });

  it("VI P1 superseded the badge: the ✓ DONE TODAY row is the toggle — collapsed by default, expands in place", () => {
    expect(page).toContain('className="tdb-donerow" aria-expanded={showDone} onClick={() => setShowDone((v) => !v)}');
    expect(page).toContain("✓ {doneN} DONE TODAY");
    expect(page).toContain("{showDone && (");
    expect(page).toContain("const [showDone, setShowDone] = useState(false);"); // collapsed default (session-only)
    expect(page).not.toContain("tdb-cdone"); // the header badge is extinct
  });

  it("the done row is the sage-family mono divider (border-top carries the old tdiv's job)", () => {
    const row = css.match(/\.tdb-donerow \{([^}]*)\}/)?.[1] ?? "";
    expect(row).toContain("font-family: var(--f12-mono)");
    expect(row).toContain("color: var(--hk-ink)");
    expect(row).toContain("border-top: 1px solid var(--hairline)");
    expect(css).not.toContain("tdb-cdone");
  });
});

describe("P3→C1 — the exit is the corner circle on the WRAPPER (the in-sheet bar is retired)", () => {
  const flow = readFileSync(join(here, "FocusFlow.tsx"), "utf8");
  const css = readFileSync(join(here, "todo.css"), "utf8");

  it("no bar, no exit pill — the wrapper carries the 44px corner exit OUTSIDE the sheet's clip", () => {
    expect(flow).not.toContain("tdb-ffbar");
    expect(flow).not.toContain("tdb-ffexit");
    expect(css).not.toContain("tdb-ffbar");
    expect(css).not.toContain("tdb-ffexit");
    const wrap = flow.match(/className="tdb-ffwrap">[\s\S]*?<\/button>\n        <\/div>/)?.[0] ?? "";
    expect(wrap).toContain("tdb-ffsheet");
    expect(wrap.indexOf("tdb-ffsheet")).toBeLessThan(wrap.indexOf("tdb-ffx")); // ✕ AFTER the sheet = trap's last stop
  });

  it("the corner exit rides the SAME dismiss guard on every step of every mode", () => {
    expect(flow).toContain('className="tdb-ffx" aria-label="Back to my desk" onClick={() => requestExit()}');
    expect(flow).toContain("if (staged.length && !(await confirmAsk("); // hero-pair P4: the styled ask // clean = immediate, staged = confirm
  });

  it("dots + count render in multi-item modes only, relocated to the sheet FOOT before the staged chip", () => {
    const foot = flow.match(/className="tdb-fffoot">[\s\S]{0,1700}/)?.[0] ?? "";
    expect(foot).toContain("tdb-fffprog");
    expect(foot).toContain(": items.length > 1 && (");
    expect(foot.indexOf("tdb-fffprog")).toBeLessThan(foot.indexOf("tdb-ffpend"));
  });

  it("every in-step skip is KEPT (semantically distinct: skip advances, exit discards behind confirm)", () => {
    for (const skip of ["Leave it", "Not now — leave it", "Skip the rest", "Skip — I’ll send them now"]) {
      expect(flow).toContain(skip);
    }
  });
});
