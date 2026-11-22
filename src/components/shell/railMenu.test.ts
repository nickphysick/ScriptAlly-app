/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shell rail menu v1 (14 Nov; ref design-refs/shell-rail-menu-v1.html) — the menu's rows are the section's own pages.
 * The behaviour and the geometry are measured in the browser: tests/e2e/shellRailMenu.measure.ts.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { workspaceSections } from "../../lib/workspaceNav";
import { railMenuPages, RAIL_MENU_CLOSE_MS, RAIL_MENU_GAP, RAIL_MENU_LIFT, RAIL_MENU_OPEN_MS } from "./RailMenu";

const sections = workspaceSections({ todo: 3 });
const byId = (id: string) => sections.find((s) => s.id === id)!;

describe("shell rail menu v1 — the rows", () => {
  it("SRM-U1 Queries, Agents, Materials and Tasks: the menu's rows are the section's pages' full labels, in nav order", () => {
    const expected: Record<string, string[]> = {
      queries: ["Query Centre", "Responses", "Analytics"],
      agents: ["Contact list", "Discover"],
      materials: ["Query letters", "Submission packages", "Comparable titles", "Versions", "Manuscripts"],
    };
    for (const id of ["queries", "agents", "materials", "tasks"]) {
      const sec = byId(id);
      const rows = railMenuPages(sec)?.map((p) => p.label);
      expect(rows, id).toEqual((sec.children ?? []).map((c) => c.label));
      if (expected[id]) expect(rows, id).toEqual(expected[id]);
      expect(rows!.length, id).toBeGreaterThan(1);
    }
  });

  it("SRM-U2 Dashboard yields no menu", () => {
    expect(railMenuPages(byId("workspace"))).toBeNull();
  });

  it("SRM-U3 the timings and offsets are the brief's", () => {
    expect([RAIL_MENU_OPEN_MS, RAIL_MENU_CLOSE_MS, RAIL_MENU_GAP, RAIL_MENU_LIFT]).toEqual([120, 220, 8, 8]);
  });

  it("SRM-U4 railMenu.css carries the ref's .rmenu / .rm-row values, every rule scoped to .rmenu", () => {
    const css = readFileSync(join(__dirname, "railMenu.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const rule = (sel: string) => {
      const m = css.match(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([^}]*)\\}"));
      return m ? m[1].replace(/\s+/g, " ") : "";
    };
    const menu = rule(".rmenu");
    for (const v of ["width: 224px", "padding: 8px", "border-radius: 14px", "background: #1f2a3b", "gap: 2px"]) expect(menu, v).toContain(v);
    /* an overflow on the menu clips its ::before bridge and opens a dead gap (SRM-E3 found it) */
    expect(menu).not.toMatch(/overflow/);
    expect(rule(".rmenu::before")).toContain("width: var(--rm-bridge");
    const row = rule(".rmenu .rm-row");
    for (const v of ["height: 36px", "padding: 0 12px", "border-radius: 8px", "font: 400 15px/1 var(--sp-serif)", "justify-content: space-between"]) expect(row, v).toContain(v);
    expect(rule(".rmenu .rm-row.cur")).toContain("background: rgba(var(--ink-terra-rgb), 0.2)");
    expect(rule(".rmenu.is-in")).toContain("0.16s ease-out");
    const selectors = [...css.matchAll(/(^|\})\s*([^{}@]+)\{/g)].map((m) => m[2].trim()).filter(Boolean);
    for (const s of selectors) for (const part of s.split(/,(?![^(]*\))/)) expect(part.trim(), part).toMatch(/^\.rmenu/);
  });
});
