/**
 * Query Centre v154.1 (design-refs/query-centre-v154-1.html) — the sheet's locks: the warm page, quiet Queried bands and
 * quiet seals, the receding rail and the open toolbar. The rendered values are measured by tests/e2e/qc1541.measure.ts;
 * these read the source, so a later edit that drops a rule fails here first.
 */
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { QueryStatus } from "../../../types";
import { card154, row154 } from "./qc154.fixture";

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

describe("v154.1 · quiet Queried bands and quiet seals", () => {
  it("a Queried card's band has no sand fill: white, a 3px sand edge and a hairline", () => {
    const b = rule('.qc151.qc153 .qc154-card[data-status="Queried"] .qc154-hd');
    expect(b).toMatch(/background:\s*#fff\b/);
    expect(b).toContain("box-shadow: inset 0 3px 0 #e9dfce, inset 0 -1px 0 #f0eae0");
  });
  it("a Partial card's band keeps its rose: the quiet rule names Queried only, and nothing else whitens a band", () => {
    for (const m of bare.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      if (!/\.qc154-hd\b/.test(m[1]) || !/background/.test(m[2])) continue;
      expect(m[1].trim()).toBe('.qc151.qc153 .qc154-card[data-status="Queried"] .qc154-hd');
    }
    const v154 = read("qcv154.css");
    expect(v154).toContain('.qc154-card[data-tone="rose"] { --tone: #ecd6d2;');
    const h = card154(row154(QueryStatus.PARTIAL_REQUESTED, "you"));
    expect(h).toContain('data-tone="rose"');
    expect(h).toContain('data-status="Partial Requested"');
    expect(card154(row154(QueryStatus.QUERIED, "agent"))).toContain('data-status="Queried"');
  });
  it("the seal: white, navy initials in the typewriter, one 1.5px ring", () => {
    const s = rule(".qc151.qc153 .qc154-card .qc154-seal.qc154-seal");
    expect(s).toMatch(/background:\s*#fff\b/);
    expect(s).toMatch(/color:\s*#2a3a52/);
    expect(s).toContain("box-shadow: inset 0 0 0 1.5px #c5ccd6");
    expect(s).not.toMatch(/font|width|height/);
  });
});

describe("v154.1 · the rail recedes, the toolbar opens up", () => {
  it("rail panels lose their fill, ring and side padding; a hairline under each section but the last", () => {
    const b = rule(".qc151.qc153 .qc153-rail .qc153-rsec .qc153-rbody");
    expect(b).toMatch(/background:\s*none/);
    expect(b).toMatch(/box-shadow:\s*none/);
    expect(b).toMatch(/padding-left:\s*0/);
    expect(b).toMatch(/padding-right:\s*0/);
    expect(rule(".qc151.qc153 .qc153-rail .qc153-rsec.qc153-rsec")).toMatch(/border-bottom:\s*1px solid #e4ded4;\s*padding-bottom:\s*6px/);
    expect(rule(".qc151.qc153 .qc153-rail .qc153-rsec.qc153-rsec:last-of-type")).toMatch(/border-bottom:\s*0/);
  });
  it("the toolbar has no container and no side padding; the search field is white with a fine ring", () => {
    const t = rule(".qc151.qc153 .qc154-tbw > .qc153-bar.qc153-bar");
    expect(t).toMatch(/background:\s*none/);
    expect(t).toMatch(/box-shadow:\s*none/);
    expect(t).toMatch(/backdrop-filter:\s*none/);
    expect(t).toMatch(/padding-left:\s*0/);
    expect(t).toMatch(/padding-right:\s*0/);
    expect(t).not.toMatch(/padding-(?:top|bottom)|height/);
    const f = rule(".qc151.qc153 .qc153-bar .qc153-find.qc153-find");
    expect(f).toMatch(/background:\s*#fff\b/);
    expect(f).toContain("box-shadow: inset 0 0 0 1px #e3ddd3");
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
