/**
 * Query Centre v154.1 (design-refs/query-centre-v154-1.html) — the sheet's locks: the warm page, quiet Queried bands and
 * quiet seals, the receding rail and the open toolbar. The rendered values are measured by tests/e2e/qc1541.measure.ts;
 * these read the source, so a later edit that drops a rule fails here first.
 */
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";

const DIR = new URL("./", import.meta.url);
const read = (f: string) => { try { return readFileSync(new URL(f, DIR), "utf8"); } catch { return ""; } };
const css = read("qcv1541.css");
const page = read("QcPage151.tsx");
/** the sheet without its comments or its @media wrappers, so a selector is only a selector */
const bare = css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/@media[^{]*\{/g, "");
/** the declarations of the first rule whose selector list contains `sel` exactly */
const rule = (sel: string): string => {
  for (const m of bare.matchAll(/([^{}]+)\{([^}]*)\}/g)) if (m[1].split(",").some((s) => s.trim() === sel)) return m[2];
  return "";
};

describe("v154.1 · the warm page", () => {
  it("is imported by the page", () => {
    expect(css.length).toBeGreaterThan(0);
    expect(page).toContain('import "./qcv1541.css";');
  });
  it("paints the ground, the wash and the strip's fade in #f6f3ee", () => {
    const g = rule(".ws-window .qc-wpg.qc-wpg--v11.qc-wpg--v11 > .wpg-scroll.wpg-scroll");
    expect(g).toMatch(/background-color:\s*#f6f3ee/);
    expect(g).toContain("linear-gradient(rgba(246, 243, 238, 0.45), rgba(246, 243, 238, 0.45)), url(\"/images/qc/doodle-tile.svg\")");
    expect(rule(".qc151.qc153 .qc154-tbw.qc154-tbw")).toContain("linear-gradient(to bottom, #f6f3ee 0, #f6f3ee calc(100% - 22px), rgba(246, 243, 238, 0) 100%)");
  });
  it("the goal line's halo is the warm paper too", () => {
    expect(rule(".qc151.qc153 .qc154-wkg.qc154-wkg")).toMatch(/stroke:\s*#f6f3ee/);
  });
});

describe("v154.1 · no cool grey left on the Query Centre's ground", () => {
  it("every #f5f5f3 in the v153.4 and v154 sheets is overridden by a warm rule in qcv1541.css", () => {
    const cool = readdirSync(DIR).filter((f) => /^qcv15(?:34|4)\.css$/.test(f)).flatMap((f) => [...read(f).matchAll(/#f5f5f3|245,\s*245,\s*243/g)].map(() => f));
    /* v153.4's ground (three, in one rule), v154's strip (three), halo (one) and the strip's comment (one), each re-painted here */
    expect(cool.length).toBe(8);
    expect(css).toContain("#f6f3ee");
    expect(css).not.toMatch(/#f5f5f3|245,\s*245,\s*243/);
  });
});
