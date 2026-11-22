/* Consolidate and finish v1, B3 — the rail badge shows two digits at most; its accessible name keeps the true count. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { railCount } from "./SidebarRail";

describe("the rail count badge", () => {
  it("shows the count up to 99, and 99 above it", () => {
    expect(railCount(9)).toBe("9");
    expect(railCount(16)).toBe("16");
    expect(railCount(99)).toBe("99");
    expect(railCount(105)).toBe("99");
  });
  it("keeps the true count in its aria-label and title", () => {
    const src = readFileSync(resolve(__dirname, "SidebarRail.tsx"), "utf8");
    expect(src).toMatch(/className="wsr-ct"[^>]*aria-label=\{`\$\{count\} need you now`\}[^>]*title=\{`\$\{count\} need you now`\}>\{railCount\(count\)\}/);
  });
  it("is the 12px badge, 18 high and at least 20 wide", () => {
    const css = readFileSync(resolve(__dirname, "sidebarRail.css"), "utf8");
    const rule = /\.wsr-ct \{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(rule).toMatch(/font: 600 12px\/18px/);
    expect(rule).toMatch(/min-width: 20px; height: 18px; padding: 0 5px; border-radius: 9px/);
    expect(rule).toMatch(/left: calc\(50% \+ 9px\); top: 1px/);
  });
});
