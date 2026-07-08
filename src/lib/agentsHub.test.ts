/**
 * Locks for the Agents hub migration onto the shared grammar (ref hub-token-sheet-v3.html):
 * the reading pane FILLS (desk-rule hug retired), a command bar anchors its base, and the
 * reference-paper surfaces read the --hub-* sheet. Artefact-level (jsdom can't compute layout).
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const tsx = readFileSync(resolve(__dirname, "../components/Agents.tsx"), "utf8");
const css = readFileSync(resolve(__dirname, "../components/agents/agentsV2.css"), "utf8");
const topbar = readFileSync(resolve(__dirname, "../components/agents/AgentsTopBar.tsx"), "utf8");
const paneRule = css.slice(css.indexOf(".agv2 .ag-pane {"), css.indexOf("}", css.indexOf(".agv2 .ag-pane {")));

describe("Agents pane — fills (hug retired)", () => {
  it("the pane stretches + fills its grid cell (no align-self:start, no floor min-height)", () => {
    expect(paneRule).toContain("align-self: stretch");
    expect(paneRule).toContain("height: 100%");
    expect(paneRule).not.toContain("align-self: start");
    expect(paneRule).not.toContain("min-height: var(--ag-pane-floor");
  });

  it("the EdgeFadeScroll frame now fills rather than hugs", () => {
    expect(css).toContain(".agv2 .ag-panewrap { flex: 1;");
  });
});

describe("Agents command bar — single home for the actions", () => {
  it("the pane carries the command bar (Send query + Edit profile + provenance + open chip)", () => {
    expect(tsx).toContain("ag-cmdbar");
    expect(tsx).toContain("ag-cmd-primary");
    expect(tsx).toContain("ag-cmd-secondary");
    expect(tsx).toContain("ag-cmd-prov");
    expect(tsx).toContain("ag-cmd-open");
  });

  it("provenance is the bar's centre (the standalone footer retired)", () => {
    expect(tsx).not.toContain('className="ag-panefoot"');
    // the provenance builder now lives inside the command bar
    const bar = tsx.slice(tsx.indexOf("ag-cmdbar"), tsx.indexOf("ag-cmd-open"));
    expect(bar).toContain("paneProvenance(a,");
  });

  it("Send query / Edit profile no longer sit in the control-row toolbar", () => {
    expect(tsx).not.toContain('className="ag-chipacts"');
  });

  it("the bar's open chip is a read-only mirror (no flip handler on it)", () => {
    const chip = tsx.slice(tsx.indexOf('className="ag-cmd-open"'), tsx.indexOf("</span>", tsx.indexOf('className="ag-cmd-open"') + 200));
    expect(chip).not.toContain("flipAvailability");
  });
});

describe("Agents grand masthead", () => {
  it("the top bar opts into the ChromeSlab grand variant with the pulse line", () => {
    expect(topbar).toContain("grand={grand}");
    expect(topbar).toContain("agentsPulse(count, idleCount)");
  });

  it("the page feeds the derived idle count (agentIdleCount over agents + queries)", () => {
    expect(tsx).toContain("idleCount={agentIdleCount(agents, queries)}");
    expect(tsx).toMatch(/<AgentsTopBar\s+grand/);
  });

  it("the masthead CTA is the hub primary (not the mocha ag-addbtn) when grand", () => {
    // The CTA style is single-sourced as MASTHEAD_CTA_STYLE in ChromeSlab (shared by all six
    // workspace mastheads); the grand branch spreads it. Verify the reference + the token.
    expect(topbar).toContain("MASTHEAD_CTA_STYLE");
    const slab = readFileSync(resolve(__dirname, "../components/shell/ChromeSlab.tsx"), "utf8");
    expect(slab).toContain("MASTHEAD_CTA_STYLE");
    expect(slab).toContain("var(--hub-primary");
  });
});

describe("Agents reference paper — consumes the hub sheet", () => {
  it("pane / band / row / monogram read --hub-* (per theme, aliased through --ag-*)", () => {
    expect(css).toContain("--ag-panebg: var(--hub-pane-reference");
    expect(css).toContain("--ag-bandflat: var(--hub-band-reference");
    expect(css).toContain("--ag-selbg: var(--hub-row-on");
    expect(css).toContain("--ag-av-bg: var(--hub-monogram");
  });

  it("the segmented filter toggles use the shared hub toggle tokens", () => {
    const seg = css.slice(css.indexOf(".agv2 .ag-seg button.on {"), css.indexOf("}", css.indexOf(".agv2 .ag-seg button.on {")));
    expect(seg).toContain("var(--hub-toggle-on");
    expect(seg).toContain("var(--hub-toggle-on-tx");
  });
});
