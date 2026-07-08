/**
 * Locks for the full-bleed crumb + floating masthead (ref crumb-fullwidth-v1.html, variant A).
 * Artefact-level — jsdom can't lay out — so these assert the structural contract: the crumb strip
 * is a sibling OUTSIDE the capped column (spans full width), the masthead is a card INSIDE it, and
 * ChromeSlab no longer draws its own crumb.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const crumb = readFileSync(resolve(__dirname, "CrumbStrip.tsx"), "utf8");
const shell = readFileSync(resolve(__dirname, "AppShell.tsx"), "utf8");
const slab = readFileSync(resolve(__dirname, "ChromeSlab.tsx"), "utf8");
const css = readFileSync(resolve(__dirname, "../../index.css"), "utf8");

describe("full-bleed crumb strip (variant A)", () => {
  it("CrumbStrip is a self-contained full-bleed strip driven by crumbForPath", () => {
    expect(crumb).toContain("sa-crumbstrip");
    expect(crumb).toContain("crumbForPath");
    expect(crumb).toContain("--crumb-strip-bg");
  });

  it("StagePage renders the crumb OUTSIDE the capped column (sibling BEFORE .sa-content-col)", () => {
    const from = shell.indexOf("const body = contentVariant");
    const bodyBlock = shell.slice(from, shell.indexOf("return (", from));
    const crumbAt = bodyBlock.indexOf("<CrumbStrip");
    const capAt = bodyBlock.indexOf("sa-content-col");
    expect(crumbAt).toBeGreaterThan(-1);
    expect(capAt).toBeGreaterThan(crumbAt); // the crumb precedes (is outside) the capped column
  });
});

describe("floating masthead card", () => {
  it("ChromeSlab is a card — border + --hub-radius + --mast-sh, not a slab with a bottom rule", () => {
    expect(slab).toContain("var(--mast-sh");
    expect(slab).toContain("sa-mast-card");
    expect(slab).toContain('borderRadius: "var(--hub-radius');
    expect(slab).not.toContain("borderBottom");
  });

  it("ChromeSlab no longer draws its own crumb (lifted out) — crumbBar retired", () => {
    expect(slab).not.toContain("crumbBar");
    expect(slab).not.toContain("crumbForPath");
  });

  it("--mast-sh is defined per theme: Capp soft, Bold hard, Editorial soft", () => {
    expect(css).toContain("--mast-sh: 0 1px 3px rgba(58, 28, 20, 0.06)");
    expect(css).toContain("--mast-sh: 4px 4px 0 #1d1712");
    expect(css).toContain("--mast-sh: 0 8px 24px rgba(20, 20, 25, 0.07)");
  });
});
