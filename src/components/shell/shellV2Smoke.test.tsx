/**
 * jsdom/static smoke render for the v2 shell chrome — structure and classes only (layout is a
 * browser check, per the pack's jsdom limits). The point: the chrome is auth-gated in the app,
 * so a runtime crash in these components would otherwise hide until Nick signs in. The db hook
 * is mocked with an empty-but-complete state; effects don't run under renderToStaticMarkup, so
 * this exercises the pure render paths (hooks, derivations, mapping) end to end.
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { UserPlan } from "../../types";

vi.mock("../../lib/db", () => ({
  useScriptAllyDb: () => ({
    tasks: [],
    userTasks: [],
    queries: [],
    agents: [],
    manuscripts: [],
    packages: [],
    versions: [],
    activities: [],
    taskFlags: [],
    notes: [],
    currentUser: { id: "u1", name: "Nick Physick", plan: UserPlan.FREE },
  }),
}));

import { ShellRail, ShellSide, ShellTopBar } from "./ShellV2";
import { ShellSidebarBody } from "./ShellSidebar";

const at = (path: string, node: React.ReactNode) =>
  renderToStaticMarkup(<MemoryRouter initialEntries={[path]}>{node}</MemoryRouter>);

describe("v2 shell — smoke renders", () => {
  it("rail: four sections + Setup, tab tongue on the active section", () => {
    const html = at("/queries", <ShellRail onNavigatePath={() => {}} />);
    expect(html).toContain("sv2-rail");
    for (const caption of ["Desk", "Queries", "Agents", "Shelf", "Setup"]) expect(html).toContain(caption);
    expect(html).toContain("sv2-railbtn on");
  });

  it("sidebar frame: masthead with the real wordmark artwork + the section kicker + the account-level week", () => {
    const html = at("/todo", <ShellSide tucked={false} onToggleTuck={() => {}} />);
    expect(html).toContain("sv2-mhname");
    expect(html).toContain("scriptally-title-v2.png"); // the brand asset, not Playfair text (follow-up P4)
    expect(html).toContain('alt="ScriptAlly"');
    expect(html).toContain("Querying"); // the /todo section name
    expect(html).toContain("week one"); // weekOfQuerying's empty-desk floor — never an invented value
    expect(html).toContain("sv2-mhrule");
  });

  it("sidebar contents: nav, ledger empty note, action tiles, Pro line, user block", () => {
    const html = at("/queries", <ShellSidebarBody onNavigate={() => {}} onNavigatePath={() => {}} />);
    expect(html).toContain("Pages");
    expect(html).toContain("Queries Hub");
    expect(html).toContain("To-do");
    expect(html).toContain("Packages");
    // all-zero board → rows hidden, the quiet note showing, no total
    expect(html).toContain("Tasks &amp; reminders");
    expect(html).toContain("nothing to show right now");
    // the four capture tiles
    for (const lb of ["Log query", "Record response", "Add agent", "Add manuscript"]) expect(html).toContain(lb);
    // Free plan → the Pro line with the baked copy; the user block beneath
    expect(html).toContain("Unlock your full query log");
    expect(html).toContain("Nick Physick");
    expect(html).toContain("Free plan");
    // the nav active state carries the parchment-highlight class only — no burgundy fill class exists
    expect(html).toContain("sv2-navbtn on");
  });

  it("top bar: crumb + save-state chip + the shared NavSearch", () => {
    const html = at("/manuscripts", <ShellTopBar routeKey="manuscripts" searchQuery="" setSearchQuery={() => {}} onNavigate={() => {}} />);
    expect(html).toContain("sv2-topbar");
    expect(html).toContain("Manuscripts"); // crumb section
    expect(html).toContain("Your manuscripts"); // crumb page (bold current)
    expect(html).toContain("All changes saved");
    expect(html).toContain("nav-search-field"); // the real NavSearch, not a fork
  });
});
