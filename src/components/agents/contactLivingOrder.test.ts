/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Living headers v3 (Contact list) — THE ORDER IS THE LOCK. The living memo reads the Housekeeping
 * model's gap count during render, so `hk` must be declared ABOVE it: a render-time read of a `const`
 * declared further down is a TDZ that tsc cannot see through a memo callback. Both halves asserted —
 * an ordering lock over a consumer that stopped reading its dependency passes forever.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const src = readFileSync(join(process.cwd(), "src/components/agents/AgentList.tsx"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

describe("the Contact list's living memo reads hk, below it", () => {
  it("declares hk before living, and living reads hk's gap count", () => {
    const hkAt = src.indexOf("const hk = useMemo");
    const livingAt = src.indexOf("const living = useMemo");
    expect(hkAt).toBeGreaterThan(-1);
    expect(livingAt).toBeGreaterThan(-1);
    expect(hkAt, "hk must be declared above the living memo that reads it").toBeLessThan(livingAt);
    expect(src.slice(livingAt, livingAt + 900)).toContain("hk.counts.gaps");
  });
});
