/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Onboarding v5 part 2 — the two loaders. Lock R1 (every timing is the baseline's) and the unit
 * half of R3 (the reading loader's last line is "Ready").
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { SCATTER_TIMINGS, READY_TXT } from "./ScatterSettleLoader";
import { IMPORTING_TIMINGS } from "./ImportingLoader";

const src = (f: string) => readFileSync(resolve(process.cwd(), "src/components/onboarding", f), "utf8");
const code = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

describe("R1 — both loaders keep every timing", () => {
  /* The values on the baseline commit (5f5c503d), read off it before any edit — except TIMEOUT_MS,
     raised from 30000 to 315000 on Nick's ruling (Smart Import quick fixes, 20 Oct): measured imports
     run 40–200s, and the 30s ceiling sent writers to "couldn't read" while the server finished and
     spent their import. It sits just above the callable's 310s (src/lib/smartImportTimeouts.test.ts).
     And SLOW_AT_MS (10000) and STATUS_INTERVAL_MS (1300) are gone, retired by Smart Import loader v2
     with the rotating status text and "Larger import — almost there…" they timed: the foot bar now
     states the row count and the time left. The ending's timings below are unchanged. */
  it("the reading loader's spine", () => {
    expect(SCATTER_TIMINGS).toEqual({ INTRO_MS: 1200, FLOOR_MS: 2800, TIMEOUT_MS: 315000 });
  });
  it("the importing loader's beats", () => {
    expect(IMPORTING_TIMINGS).toEqual({ MESSAGE_INTERVAL_MS: 950, LIFT_AT_MS: 600, PROCEED_AT_MS: 1300 });
  });
  it("the reveal choreography's offsets are the baseline's, in source", () => {
    const s = code(src("ScatterSettleLoader.tsx"));
    for (const beat of [
      "const CRYST_STAGGER = 150;",
      "Math.max(0, n - 1) * CRYST_STAGGER + 420",
      "setArranged(true), cryst + 220)",
      "const sq = cryst + 220 + 720;",
      "setTick(true), sq + 430)",
      "proceedRef.current(), sq + 430 + 1000)",
      "setSqueeze(true), 600)", "setTick(true), 1020)", "proceedRef.current(), 1970)",
      "const FORM_SPAWN = 720;", "const FORM_LIFE = 3000;",
    ]) expect(s, beat).toContain(beat);
  });
  it("the branch's commit floor is untouched", () => {
    /* 5000 is the floor; the lab's stand-in commit may shorten it and nothing else may. */
    expect(code(src("../import/ImportFlow.tsx"))).toContain("delay(lab?.floorMs ?? 5000)"); // moved with the commit in part 3
  });
});

describe("R3 — the reading loader ends on \"Ready\"", () => {
  it("the last status is exactly Ready", () => { expect(READY_TXT).toBe("Ready"); });
  it("no import screen's source says \"what we found\"", () => {
    for (const f of ["ScatterSettleLoader.tsx", "ImportingLoader.tsx", "ImportOverview.tsx", "BranchB.tsx", "../import/ImportFlow.tsx"]) {
      expect(code(src(f)).toLowerCase(), f).not.toContain("what we found");
    }
  });
});

describe("H1 — the import ends on the dashboard, with no closing page", () => {
  const branch = code(src("../import/ImportFlow.tsx")); // the import, since part 3
  it("the handover page and its lib are deleted", () => {
    const fs = require("fs") as typeof import("fs");
    expect(fs.existsSync(resolve(process.cwd(), "src/components/onboarding/HandoverScreen.tsx"))).toBe(false);
    expect(fs.existsSync(resolve(process.cwd(), "src/lib/onboardingHandover.ts"))).toBe(false);
    expect(fs.existsSync(resolve(process.cwd(), "src/components/onboarding/chrome.tsx"))).toBe(false);
    expect(branch).not.toContain("HandoverScreen");
    expect(branch).not.toContain("That's everything captured");
  });
  it("the loader's onProceed names the dashboard, and only the dashboard", () => {
    expect(branch).toContain('onImportComplete(outcome, "dashboard")');
    expect(branch).not.toContain('"queries"');
  });
  it("nothing imported still shows its own card", () => {
    expect(branch).toContain('if (committed.queriesImported === 0) { setScreen("done"); return; }');
    expect(branch).toContain("<NothingImported");
  });
});

describe("the loaders sit in the frame's sheet", () => {
  it("the importing loader is not a fixed layer, mounts no old nav and no drawn skeleton", () => {
    const s = code(src("ImportingLoader.tsx"));
    expect(s).not.toMatch(/position:\s*"fixed"/);
    expect(s).not.toContain("OnbNav");
    expect(s).not.toContain("DashboardSkeleton");
    expect(s).toContain("<DashGhost />");
  });
  it("the reading loader is not a fixed layer and mounts no old nav", () => {
    const s = code(src("ScatterSettleLoader.tsx"));
    expect(s).not.toMatch(/position:\s*"fixed"/);
    expect(s).not.toContain("OnbNav");
  });
});
