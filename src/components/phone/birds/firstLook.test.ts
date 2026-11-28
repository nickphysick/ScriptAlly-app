/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone Birds-eye first look v1 §A — the grow-in's timing, as numbers (the measured locks are BFL-1 to BFL-5).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { BW_E2E_NOLOOK_KEY, BW_LOOK_RETIRED_KEY, COUNT_MS, countAt, LOOK_MS, rowStart, rowStep, WIPE, wipeOf } from "./firstLook";

describe("the bars grow in (ref playLoad grow2)", () => {
  it("a row starts 260ms in, 28ms a row later, and 90ms later for each heading above it", () => {
    expect(rowStart(0, 1)).toBe(350);
    expect(rowStart(3, 1)).toBe(260 + 84 + 90);
    expect(rowStart(5, 2)).toBe(260 + 140 + 180);
  });
  it("28ms a row while the last still ends by 2s; a longer list is spaced closer so it does", () => {
    expect(rowStep(20, 3)).toBe(28);
    const s = rowStep(88, 3);
    expect(s).toBeLessThan(28);
    expect(rowStart(87, 3, s) + WIPE).toBeCloseTo(LOOK_MS, 6);
    expect(rowStep(1, 0)).toBe(28);
  });
  it("a row is one wipe: each piece starts as the one to its left ends, and the whole takes 560ms", () => {
    /* a row's pieces, left to right, touching or with the 2px stage gap; one very short */
    const pieces: [number, number][] = [[40, 60], [102, 1], [103, 30], [133, 2], [135, 95]];
    const L = 40, span = 135 + 95 - 40, d0 = 350;
    const t = pieces.map(([l, w]) => wipeOf(l, w, L, span, d0));
    for (let i = 1; i < t.length; i++) expect(t[i][0]).toBeGreaterThanOrEqual(t[i - 1][0] + t[i - 1][1] - 1e-9);
    const last = t[t.length - 1];
    expect(last[0] + last[1]).toBeCloseTo(d0 + WIPE, 6);
    expect(t[0][0]).toBe(d0);
  });
  it("the ref's 90ms floor is gone: a 1px piece no longer runs into the next", () => {
    const [d, dur] = wipeOf(102, 1, 40, 190, 0);
    const [next] = wipeOf(103, 30, 40, 190, 0);
    expect(d + dur).toBeLessThanOrEqual(next + 1e-9);
    expect(dur).toBeLessThan(90);
  });
  it("a heading's count ticks from 0 to its number over 700ms (smoothstep)", () => {
    expect(countAt(12, -50)).toBe(0);
    expect(countAt(12, 0)).toBe(0);
    expect(countAt(12, COUNT_MS / 2)).toBe(6);
    expect(countAt(12, COUNT_MS)).toBe(12);
    expect(countAt(12, 5000)).toBe(12);
  });
  it("the full look is about 2s; polish v1.1 retires the once-a-day memory and clears its key", () => {
    expect(LOOK_MS).toBe(2000);
    expect(BW_LOOK_RETIRED_KEY).toBe("bw1.firstLook.day");
    const src = readFileSync("src/components/phone/birds/BirdsWorld.tsx", "utf8");
    expect(src).toContain("window.localStorage.removeItem(BW_LOOK_RETIRED_KEY)");
    expect(src).not.toMatch(/firstTimeToday/);
  });
  it("polish v1: the marks on the bars pop with their rows, as the \"!\" does", () => {
    expect(readFileSync("src/components/phone/birds/firstLook.ts", "utf8")).toContain('const marks = q(".bw-ovd, .bw-evmk");');
    /* both carry their row's id, which the grow-in times them by */
    const dw = readFileSync("src/components/phone/birds/drawWorld.ts", "utf8");
    expect(dw).toMatch(/class="bw-evmk[^`]*data-row="\$\{esc\(r\.id\)\}"/);
    expect(dw).toMatch(/data-bw="mark" \$\{rowAttr\}/);
  });
  it("Birds-eye decides once per arrival (a mount): the grow-in, or with reduced motion the fade", () => {
    const src = readFileSync("src/components/phone/birds/BirdsWorld.tsx", "utf8");
    expect(src).toMatch(/if \(calm\(\) \|\| e2eNoLook\) \{ el\.dataset\.look = "fade"; fadeWorld\(box\); return; \}/);
    /* the measurements' switch is DEV-ONLY: the MODE test sits at the call site */
    expect(src).toContain(`const e2eNoLook = import.meta.env.MODE !== "production" && store.get(BW_E2E_NOLOOK_KEY) === "1";`);
    expect(BW_E2E_NOLOOK_KEY).toBe("sa.e2e.bw-nolook");
    expect(src).toMatch(/if \(lookDecided\.current \|\| demo\) return;/);
    /* a paint while the bars grow is held (the frame they grow on stays) */
    expect(src).toMatch(/if \(!w \|\| !el \|\| look\.current\) return;/);
    /* the look's ref is declared above paint, which reads it (CLAUDE.md: order, not hoisting) */
    expect(src.indexOf("const look = useRef<LookHandle | null>(null);")).toBeGreaterThan(-1);
    expect(src.indexOf("const look = useRef<LookHandle | null>(null);")).toBeLessThan(src.indexOf("const paint = useCallback("));
    /* a touch anywhere on Birds-eye finishes it */
    expect(src).toMatch(/onPointerDownCapture=\{finishLook\}/);
  });
});
