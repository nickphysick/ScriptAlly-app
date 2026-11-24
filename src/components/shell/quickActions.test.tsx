/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Add an agent v2, Part A — "Quick actions" (design-refs/add-agent-v2, screen 01). The source and static halves; the
 * rendered geometry is tests/e2e/quickActions.measure.ts.
 */
import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { QUICK_ROWS, QuickActions, MENTOR_HEAD, ARCHIVIST_HEAD, SCOUT_HEAD } from "./QuickActions";
import { RAIL_CAPTURES } from "./railNav";

const read = (p: string) => readFileSync(resolve(__dirname, p), "utf8");

describe("Quick actions", () => {
  it("QA-U1 · three rows, in order, each with its one line", () => {
    expect(QUICK_ROWS.map((r) => [r.title, r.line])).toEqual([
      ["Log a query", "You’ve sent one. Get it on the record."],
      ["Record a response", "An agent has replied."],
      ["Add an agent", "Someone new for your list."],
    ]);
  });

  it("QA-U2 · each row opens an existing door, through the shell's bridge", () => {
    expect(QUICK_ROWS.map((r) => r.id)).toEqual(["query", "record", "agent"]);
    for (const r of QUICK_ROWS) expect(RAIL_CAPTURES[r.id]).toBeTruthy();
    expect(read("QuickActions.tsx")).toMatch(/invokeCapture\(id, onNavigate\)/);
  });

  it("QA-U3 · the heads are the files the journeys' own headers draw", () => {
    expect(read("../queries/centre/QcLogStages.tsx")).toContain(`src="${MENTOR_HEAD}"`);
    expect(read("../queries/centre/QcRespondStages.tsx")).toContain(`"${ARCHIVIST_HEAD}"`);
    expect(read("../queries/centre/QcAddAgent.tsx")).toContain(`"${SCOUT_HEAD}"`);
  });

  it("QA-U4 · the button reads Quick actions; the menu has no heading, and Add a manuscript is not a row and has no badge", () => {
    const html = renderToStaticMarkup(<QuickActions onNavigate={() => {}} />);
    expect(html).toContain(">Quick actions</button>");
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).not.toMatch(/Add something|ADD SOMETHING|SOON/);
    const src = read("QuickActions.tsx").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(src).toMatch(/className="mn-soon"[^>]*>\{BOOKS\}Add a manuscript<i>coming soon<\/i><\/div>/);
    expect(src).not.toMatch(/role="menuitem"[^>]*data-quick="manuscript"/);
  });

  it("QA-U5 · the bar mounts Quick actions and no split button", () => {
    const shell = read("WorkspaceShell.tsx");
    expect(shell).toContain("<QuickActions onNavigate={onNavigate} />");
    expect(shell).not.toMatch(/SidebarCapture|ws-capr|ws-capl/);
  });
});
