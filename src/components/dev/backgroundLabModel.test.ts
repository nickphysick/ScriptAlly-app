/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit lock for the background-lab model (backgroundLab.ts). Locks the override CSS shape the
 * lab injects: desk overrides must set --desk AND --hub-desk together (the ultrawide cap relies
 * on the pair matching), and ground overrides must carry !important (they fight the shell
 * root's inline #F5F0EA).
 */
import { describe, expect, it } from "vitest";
import {
  EMPTY_LAB_STATE,
  LAB_SWATCHES,
  buildLabCss,
  clearOverride,
  labSummary,
  normalizeHex,
  parseLabState,
  resetAll,
  rgbToHex,
  serializeLabState,
  withOverride,
} from "./backgroundLabModel";

describe("normalizeHex", () => {
  it("accepts 6-digit, 3-digit, hash-optional, any case", () => {
    expect(normalizeHex("#E4D5BC")).toBe("#e4d5bc");
    expect(normalizeHex("e4d5bc")).toBe("#e4d5bc");
    expect(normalizeHex("#abc")).toBe("#aabbcc");
    expect(normalizeHex(" abc ")).toBe("#aabbcc");
  });
  it("rejects garbage", () => {
    expect(normalizeHex("")).toBeNull();
    expect(normalizeHex("#12345")).toBeNull();
    expect(normalizeHex("red")).toBeNull();
    expect(normalizeHex("#gggggg")).toBeNull();
  });
});

describe("rgbToHex", () => {
  it("converts computed rgb() strings (the shell root's kraft)", () => {
    expect(rgbToHex("rgb(245, 240, 234)")).toBe("#f5f0ea");
    expect(rgbToHex("rgba(232, 221, 208, 1)")).toBe("#e8ddd0");
  });
  it("passes hex through and rejects garbage", () => {
    expect(rgbToHex("#e8ddd0")).toBe("#e8ddd0");
    expect(rgbToHex("transparent")).toBeNull();
  });
});

describe("withOverride / clearOverride", () => {
  it("linked mode paints desk + ground together", () => {
    const s = withOverride(EMPTY_LAB_STATE, "cappuccino", "desk", "#E4D5BC");
    expect(s.overrides.cappuccino).toEqual({ desk: "#e4d5bc", ground: "#e4d5bc" });
  });
  it("unlinked mode moves one layer only", () => {
    const s = withOverride({ ...EMPTY_LAB_STATE, linked: false }, "bold", "ground", "#d9c7a8");
    expect(s.overrides.bold).toEqual({ ground: "#d9c7a8" });
    expect(s.overrides.bold?.desk).toBeUndefined();
  });
  it("invalid hex is a no-op", () => {
    expect(withOverride(EMPTY_LAB_STATE, "cappuccino", "desk", "nope")).toBe(EMPTY_LAB_STATE);
  });
  it("clear drops the layer (both when linked) and empties the theme entry", () => {
    const linked = withOverride(EMPTY_LAB_STATE, "cappuccino", "desk", "#e4d5bc");
    expect(clearOverride(linked, "cappuccino", "desk").overrides.cappuccino).toBeUndefined();

    const solo = withOverride({ ...EMPTY_LAB_STATE, linked: false }, "cappuccino", "desk", "#e4d5bc");
    const both = withOverride(solo, "cappuccino", "ground", "#f5f0ea");
    const cleared = clearOverride(both, "cappuccino", "desk");
    expect(cleared.overrides.cappuccino).toEqual({ ground: "#f5f0ea" });
  });
  it("resetAll clears every theme but keeps the link preference", () => {
    const s = withOverride(withOverride(EMPTY_LAB_STATE, "cappuccino", "desk", "#e4d5bc"), "bold", "desk", "#c2cfda");
    const r = resetAll(s);
    expect(r.overrides).toEqual({});
    expect(r.linked).toBe(true);
  });
});

describe("buildLabCss — the injected override shape", () => {
  it("is empty with no overrides (no <style> rendered)", () => {
    expect(buildLabCss(EMPTY_LAB_STATE)).toBe("");
  });
  it("desk overrides set --desk AND --hub-desk via the doubled theme class", () => {
    const css = buildLabCss({ overrides: { cappuccino: { desk: "#e4d5bc" } }, linked: false });
    expect(css).toContain(".t-capp.t-capp { --desk: #e4d5bc; --hub-desk: #e4d5bc; }");
  });
  it("ground overrides target [data-sa-ground] with !important (beats the inline kraft)", () => {
    const css = buildLabCss({ overrides: { bold: { ground: "#d9c7a8" } }, linked: false });
    expect(css).toContain(".t-bold[data-sa-ground] { background: #d9c7a8 !important; }");
  });
  it("covers every themed override at once", () => {
    const css = buildLabCss({
      overrides: {
        cappuccino: { desk: "#e4d5bc", ground: "#e4d5bc" },
        editorial: { desk: "#f4f4f3" },
      },
      linked: true,
    });
    expect(css).toContain(".t-capp.t-capp");
    expect(css).toContain(".t-capp[data-sa-ground]");
    expect(css).toContain(".t-edn.t-edn { --desk: #f4f4f3; --hub-desk: #f4f4f3; }");
    expect(css).not.toContain(".t-bold");
  });
});

describe("parse / serialize round-trip", () => {
  it("round-trips a real state", () => {
    const s = withOverride(EMPTY_LAB_STATE, "cappuccino", "desk", "#e4d5bc");
    expect(parseLabState(serializeLabState(s))).toEqual(s);
  });
  it("tolerates garbage and drops invalid hexes", () => {
    expect(parseLabState(null)).toEqual(EMPTY_LAB_STATE);
    expect(parseLabState("not json")).toEqual(EMPTY_LAB_STATE);
    const dirty = JSON.stringify({ overrides: { cappuccino: { desk: "red", ground: "#e4d5bc" } }, linked: false });
    expect(parseLabState(dirty)).toEqual({ overrides: { cappuccino: { ground: "#e4d5bc" } }, linked: false });
  });
});

describe("swatches + summary", () => {
  it("every swatch is a normalized hex (pickable as-is)", () => {
    for (const s of LAB_SWATCHES) expect(normalizeHex(s.hex)).toBe(s.hex);
  });
  it("summary names the exact edit sites", () => {
    const s = withOverride(EMPTY_LAB_STATE, "cappuccino", "desk", "#e4d5bc");
    const text = labSummary(s);
    expect(text).toContain("index.css .t-capp");
    expect(text).toContain("AppShell.tsx");
    expect(labSummary(EMPTY_LAB_STATE)).toContain("no overrides");
  });
});
