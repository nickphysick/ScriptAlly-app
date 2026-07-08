/**
 * Locks for the workspace breadcrumb (ref: design-refs/topstrip-breadcrumbs-v1.html,
 * variant A): the crumb string per route (pathname-only, so ?q= deep-selection never
 * changes it), link targets through the bridge, the dashboard exemption, and the
 * per-theme token values (rule-text lock against the real index.css artefact).
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { crumbForPath } from "./topCrumb";

const labels = (p: string) => crumbForPath(p)?.map((s) => s.label).join(" / ");

describe("crumbForPath — the route table", () => {
  it("renders the pack's crumb string per route", () => {
    expect(labels("/queries")).toBe("SCRIPTALLY / QUERYING / QUERIES HUB");
    expect(labels("/todo")).toBe("SCRIPTALLY / QUERYING / TO-DO");
    expect(labels("/agents")).toBe("SCRIPTALLY / AGENTS / DATABASE");
    expect(labels("/agents/discover")).toBe("SCRIPTALLY / AGENTS / DISCOVER");
    expect(labels("/manuscripts")).toBe("SCRIPTALLY / MANUSCRIPTS / YOUR MANUSCRIPTS");
    expect(labels("/manuscripts/comps")).toBe("SCRIPTALLY / MANUSCRIPTS / COMPARABLE TITLES");
    expect(labels("/manuscripts/packages")).toBe("SCRIPTALLY / MANUSCRIPTS / SUBMISSION PACKAGES");
    expect(labels("/import")).toBe("SCRIPTALLY / IMPORT");
  });

  it("is pathname-only (the ?q= deep-selection route keeps the QUERIES HUB crumb)", () => {
    // The router hands the strip location.pathname — /queries?q=abc has pathname /queries.
    expect(labels("/queries")).toBe("SCRIPTALLY / QUERYING / QUERIES HUB");
    expect(labels("/queries/")).toBe("SCRIPTALLY / QUERYING / QUERIES HUB");
  });

  it("dashboard is EXEMPT (its floating top bar owns that band) — and unknowns render nothing", () => {
    expect(crumbForPath("/dashboard")).toBeNull();
    expect(crumbForPath("/")).toBeNull();
    expect(crumbForPath("/account")).toBeNull();
    expect(crumbForPath("/plans")).toBeNull();
    expect(crumbForPath("/help")).toBeNull();
    expect(crumbForPath("/email-import-dev")).toBeNull();
    expect(crumbForPath("/nope")).toBeNull();
  });

  it("every segment except the last navigates; the last is inert; root goes to the desk", () => {
    for (const p of ["/queries", "/todo", "/agents", "/agents/discover", "/manuscripts", "/manuscripts/comps", "/manuscripts/packages", "/import"]) {
      const segs = crumbForPath(p)!;
      expect(segs[0]).toEqual({ label: "SCRIPTALLY", tab: "dashboard" });
      for (const seg of segs.slice(0, -1)) expect(seg.tab).toBeTruthy();
      expect(segs[segs.length - 1].tab).toBeUndefined();
    }
    // section segments target the section's primary page
    expect(crumbForPath("/todo")![1].tab).toBe("queries");
    expect(crumbForPath("/agents/discover")![1].tab).toBe("agents");
    expect(crumbForPath("/manuscripts/comps")![1].tab).toBe("manuscripts");
    expect(crumbForPath("/manuscripts/packages")![1].tab).toBe("manuscripts");
    expect(crumbForPath("/queries")![1].tab).toBe("queries");
  });
});

describe("crumb tokens — per-theme smoke (rule-text lock)", () => {
  const css = readFileSync(resolve(__dirname, "../../index.css"), "utf8");
  const themeBlock = (selector: string) => {
    const start = css.indexOf(`\n${selector} {`);
    expect(start).toBeGreaterThan(-1);
    return css.slice(start, css.indexOf("\n}", start));
  };

  it("Cappuccino", () => {
    const b = themeBlock(".t-capp");
    expect(b).toContain("--crumb-bg: rgba(255, 254, 251, 0.55)");
    expect(b).toContain("--crumb-hair: #e7ddd2");
    expect(b).toContain("--crumb-cur: #422701");
    expect(b).toContain("--crumb-sep: #c9bba9");
  });

  it("Bold Pastille", () => {
    const b = themeBlock(".t-bold");
    expect(b).toContain("--crumb-bg: rgba(255, 255, 255, 0.6)");
    expect(b).toContain("--crumb-hair: rgba(29, 23, 18, 0.18)");
    expect(b).toContain("--crumb-cur: #1d1712");
    expect(b).toContain("--crumb-sep: #9a948e");
  });

  it("Editorial", () => {
    const b = themeBlock(".t-edn");
    expect(b).toContain("--crumb-bg: rgba(255, 255, 255, 0.6)");
    expect(b).toContain("--crumb-hair: #ececeb");
    expect(b).toContain("--crumb-cur: #44484d");
    expect(b).toContain("--crumb-sep: #c4c6c8");
  });
});

describe("Queries Hub slab completion — artefact locks", () => {
  it("renders the ChromeSlab in BOTH branches (empty + populated) and the qhbar frame is gone", () => {
    const queries = readFileSync(resolve(__dirname, "../Queries.tsx"), "utf8");
    const slabMounts = queries.match(/<ChromeSlab/g) ?? [];
    expect(slabMounts.length).toBe(2);
    expect(queries.includes('className="qhbar"')).toBe(false);
  });

  it("TopCrumbStrip is retired (the slab is the sole crumb chrome)", () => {
    expect(existsSync(resolve(__dirname, "./TopCrumbStrip.tsx"))).toBe(false);
    const appShell = readFileSync(resolve(__dirname, "./AppShell.tsx"), "utf8");
    expect(appShell.includes("TopCrumbStrip")).toBe(false);
  });
});

describe("ChromeSlab tokens — Option A surfaces (ref header-ground-fullpage-v1.html)", () => {
  const css = readFileSync(resolve(__dirname, "../../index.css"), "utf8");
  const themeBlock = (selector: string) => {
    const start = css.indexOf(`\n${selector} {`);
    expect(start).toBeGreaterThan(-1);
    return css.slice(start, css.indexOf("\n}", start));
  };

  it("Cappuccino: card slab + hairline", () => {
    const b = themeBlock(".t-capp");
    expect(b).toContain("--slab-bg: #fffefb");
    expect(b).toContain("--slab-bd: #e7ddd2");
    expect(b).toContain("--slab-bdw: 1px");
    expect(b).toContain("--slab-shadow: none");
  });

  it("Bold Pastille: ink rule under the slab", () => {
    const b = themeBlock(".t-bold");
    expect(b).toContain("--slab-bg: #fffefb");
    expect(b).toContain("--slab-bd: #1d1712");
    expect(b).toContain("--slab-bdw: 1.5px");
  });

  it("Editorial: white slab + the SEPARATING SHADOW (its desk is near-white — deliberate)", () => {
    const b = themeBlock(".t-edn");
    expect(b).toContain("--slab-bg: #ffffff");
    expect(b).toContain("--slab-bd: #ececeb");
    expect(b).toContain("--slab-shadow: 0 3px 10px rgba(20, 20, 20, 0.04)");
  });
});
