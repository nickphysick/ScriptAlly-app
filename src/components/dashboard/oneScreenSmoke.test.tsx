/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the one-screen dashboard's scaffold (spec §1, §2, §8; P2).
 * Whole-string assertions; CSS asserted against RULES with comments stripped (the tombstone trap).
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryStatus, UserPlan } from "../../types";
import { OneScreenDashboard } from "./OneScreenDashboard";

const css = readFileSync(resolve(__dirname, "./oneScreen.css"), "utf8");
const cssRules = css.replace(/\/\*[\s\S]*?\*\//g, "");
const rule = (sel: string) => {
  const i = cssRules.indexOf(sel + " {");
  expect(i, `oneScreen.css must define ${sel}`).toBeGreaterThan(-1);
  return cssRules.slice(i, cssRules.indexOf("}", i));
};

const NOW = new Date(2026, 7, 6, 15, 0, 0);
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86400000).toISOString();

const q = (over: Record<string, unknown>) => ({ id: String(Math.random()), status: QueryStatus.QUERIED, ...over }) as any;

const base = {
  queries: [q({ dateSent: daysAgo(30) }), q({ dateSent: daysAgo(2) })],
  agents: [{ id: "a1", name: "Sophie Dunn", agency: "Curtis Vane" }] as any[],
  manuscripts: [{ id: "m1", title: "Murphy's Day Out", genre: "Thriller", wordCount: 82400 }] as any[],
  tasks: [], userTasks: [], activities: [],
  currentUser: { id: "u", name: "Nick Physick", plan: UserPlan.FREE } as any,
  activeManuscript: { id: "m1", title: "Murphy's Day Out" } as any,
  onNavigate: () => {}, onTaskAction: () => {},
  updateUserProfile: async () => {},
  now: NOW,
};

const render = (over: Partial<typeof base> & { loading?: boolean } = {}) =>
  renderToStaticMarkup(<OneScreenDashboard loading={false} {...base} {...over} />);

describe("§1 · the lock", () => {
  it("⚠️ min-height is FORBIDDEN on the lock elements", () => {
    expect(rule(".os-root")).not.toContain("min-height");
    // and no 100vh anywhere — the height is measured from the stage, never the viewport
    expect(cssRules).not.toContain("100vh");
  });

  it("both releases exist, and they outrank the inline height with !important", () => {
    expect(cssRules).toContain("@media (max-width: 1024px)");
    expect(cssRules).toContain("@media (max-height: 680px) and (min-width: 1025px)");
    const releases = cssRules.match(/height: auto !important/g) ?? [];
    expect(releases.length).toBeGreaterThanOrEqual(2);
  });

  it("the grid is the spec's: minmax(0,1fr) 308px, capped 1560 and centred", () => {
    const c = rule(".os-content");
    expect(c).toContain("grid-template-columns: minmax(0, 1fr) 308px");
    expect(c).toContain("max-width: 1560px");
    expect(c).toContain("margin: 0 auto");
  });

  it("⚠️ the rail spaces with MARGINS, not gap — a collapsing panel takes its spacing with it", () => {
    /* the shared `.os-colM, .os-colR` rule sits first, so the naive first-match lookup lands on
       it; assert the standalone declarations verbatim instead */
    expect(cssRules).toContain(".os-colR { gap: 0; }");
    expect(rule(".os-colR > *")).toContain("margin-bottom: 13px");
  });

  it("the vertical budget: the chart flexes, tasks are content-driven 118–318", () => {
    expect(rule(".os-colM .os-lead")).toContain("flex: 1 1 auto");
    const t = rule(".os-colM .os-tasks");
    expect(t).toContain("min-height: 118px");
    expect(t).toContain("max-height: 318px");
  });
});

describe("§2 · the greeting", () => {
  it("kicker reads WEEK … OF QUERYING · manuscript, and the name is plain ink", () => {
    const html = render();
    expect(html).toContain("of querying · Murphy&#x27;s Day Out");
    expect(html).toContain("Hello, Nick");
    // no italic-burgundy name: the h1 carries no <em>
    expect(html).not.toMatch(/<h1[^>]*>[^<]*<em/);
  });

  it("the three pills, in the spec's order — tenure · achievement · agents on file", () => {
    const html = render();
    const pills = html.indexOf("os-pills");
    const tenure = html.indexOf("Querying since", pills);
    const ach = html.indexOf("awaiting a reply", pills);
    const agents = html.indexOf("agents on file", pills);
    expect(tenure).toBeGreaterThan(-1);
    expect(ach).toBeGreaterThan(tenure);
    expect(agents).toBeGreaterThan(ach);
  });

  it('"on file", never "met"', () => {
    expect(render()).toContain("agents on file");
    expect(render()).not.toContain("agents met");
  });

  it("the ≤1200px rule drops the SECOND pill — the achievement slot", () => {
    expect(cssRules).toContain(".os-pills .os-pill:nth-child(2) { display: none; }");
  });
});

describe("§8 · skeletons", () => {
  it("loading renders per-card shimmers and hides content without unmounting it", () => {
    const html = render({ loading: true });
    expect(html).toContain("os-skel");
    expect(html).toContain("isload");
    // content is still IN the tree (opacity:0 via CSS) so layout cannot shift when data lands
    expect(html).toContain("Hello, Nick");
    expect(rule(".os-card.isload > *:not(.os-skel), .os-greet.isload > *:not(.os-skel)")).toContain("opacity: 0");
  });

  it("reduced motion stills the shimmer to a static tint", () => {
    expect(cssRules).toContain(".os-skel i { animation: none; background: #efe7db; }");
  });
});

describe("§6 trap · the entrance animation is scoped to .enter", () => {
  it("⚠️ no animation on the bare card classes — only on .enter, which JS removes", () => {
    expect(rule(".os-card")).not.toContain("animation");
    expect(cssRules).toContain(".os-card.enter, .os-greet.enter { animation: os-rise");
  });
});

describe("the sparse chart state and the tasks empty state (shells)", () => {
  it("under two ledger weeks the chart says how the line begins", () => {
    const html = render({ queries: [q({ dateSent: daysAgo(1) })] });
    expect(html).toContain("The line begins once you have queried in two separate weeks.");
  });

  it("no tasks → the italic empty line, and the header says Nothing needs you", () => {
    const html = render();
    expect(html).toContain("Nothing needs you");
    expect(html).toContain("Nothing needs you today.");
  });
});
