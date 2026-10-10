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
  /* The values on the baseline commit (5f5c503d), read off it before any edit. */
  it("the reading loader's spine", () => {
    expect(SCATTER_TIMINGS).toEqual({ INTRO_MS: 1200, FLOOR_MS: 2800, SLOW_AT_MS: 10000, TIMEOUT_MS: 30000, STATUS_INTERVAL_MS: 1300 });
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
    expect(code(src("BranchB.tsx"))).toContain("delay(5000)");
  });
});

describe("R3 — the reading loader ends on \"Ready\"", () => {
  it("the last status is exactly Ready", () => { expect(READY_TXT).toBe("Ready"); });
  it("no import screen's source says \"what we found\"", () => {
    for (const f of ["ScatterSettleLoader.tsx", "ImportingLoader.tsx"]) {
      expect(code(src(f)).toLowerCase(), f).not.toContain("what we found");
    }
  });
});

describe("the loaders sit in the frame's sheet", () => {
  it("the reading loader is not a fixed layer and mounts no old nav", () => {
    const s = code(src("ScatterSettleLoader.tsx"));
    expect(s).not.toMatch(/position:\s*"fixed"/);
    expect(s).not.toContain("OnbNav");
  });
});
