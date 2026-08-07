/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the rail (spec §6; P5). The expand/collapse MOTION is a browser check; what is
 * lockable here is the feed derivation, the structure, and the CSS mechanics the motion rests on.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryStatus, UserPlan } from "../../types";
import { feedRows, OneScreenRail } from "./OneScreenRail";

const css = readFileSync(resolve(__dirname, "./oneScreen.css"), "utf8");
const cssRules = css.replace(/\/\*[\s\S]*?\*\//g, "");

const NOW = new Date(2026, 7, 6, 15, 0, 0);
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86400000).toISOString();

const act = (over: Record<string, unknown>) => ({
  id: String(Math.random()), userId: "u", queryId: "q1", manuscriptId: "m1",
  activityType: "STATUS_CHANGE", description: "", date: daysAgo(1), details: "", ...over,
}) as any;

const queries = [{ id: "q1", agentId: "a1", status: QueryStatus.QUERIED }] as any[];
const agents = [{ id: "a1", name: "Sophie Dunn", agency: "Curtis Vane" }] as any[];
const manuscripts = [{ id: "m1", title: "Murphy's Day Out", genre: "Thriller", wordCount: 82400 }] as any[];

describe("§6 · the 30-day feed", () => {
  it("windows to 30 days, newest first, day-labelled", () => {
    const rows = feedRows([
      act({ id: "old", date: daysAgo(40) }),
      act({ id: "a", date: daysAgo(2), resultingStatus: QueryStatus.QUERIED }),
      act({ id: "b", date: daysAgo(1), resultingStatus: QueryStatus.FULL_REQUESTED }),
    ], queries, agents, manuscripts, NOW);
    expect(rows.map((r) => r.id)).toEqual(["b", "a"]);
    expect(rows[0].dayLabel).toMatch(/^\w{3} \d{1,2} \w{3}$/);
  });

  it("agent motion is sage; writer motion is pink; no resultingStatus reads Status changed", () => {
    const rows = feedRows([
      act({ id: "a", resultingStatus: QueryStatus.FULL_REQUESTED }),
      act({ id: "b", resultingStatus: QueryStatus.QUERIED, date: daysAgo(2) }),
      act({ id: "c", date: daysAgo(3) }),
    ], queries, agents, manuscripts, NOW);
    expect(rows[0]).toMatchObject({ pill: "Full requested", sage: true });
    expect(rows[1]).toMatchObject({ pill: "Query sent", sage: false });
    expect(rows[2]).toMatchObject({ pill: "Status changed", sage: false });
  });

  it("the caption is agency · manuscript, and who falls back honestly", () => {
    const rows = feedRows([act({})], queries, agents, manuscripts, NOW);
    expect(rows[0].who).toBe("Sophie Dunn");
    expect(rows[0].caption).toBe("Curtis Vane · Murphy's Day Out");
    const orphan = feedRows([act({ queryId: "missing" })], queries, agents, manuscripts, NOW);
    expect(orphan[0].who).toBe("—");
  });
});

describe("the rendered rail", () => {
  const html = renderToStaticMarkup(
    <OneScreenRail
      expanded={false} setExpanded={() => {}}
      loading={false} queries={[]} agents={[]} manuscripts={manuscripts} userTasks={[]}
      activities={[act({})]}
      currentUser={{ id: "u", name: "Nick Physick", plan: UserPlan.FREE, goalTarget: 25, goalPeriod: "quarter" } as any}
      activeManuscript={manuscripts[0]} onNavigate={() => {}}
      updateUserProfile={async () => {}} now={NOW}
    />,
  );

  it("the author tile: band, overlapping avatar with the + badge, shelf with the manuscript", () => {
    expect(html).toContain("os-aut-band");
    expect(html).toContain('aria-label="Add a photo"');
    expect(html).toContain("Murphy&#x27;s Day Out");
    expect(html).toContain("82,400 words");
  });

  it("goals: the sentence, 25 blocks, and 0/25 done derives from sends", () => {
    expect(html).toContain("Query 25 agents this quarter");
    expect(html).toContain("0/25");
    const blocks = html.slice(html.indexOf('class="os-blocks"'));
    const cells = (blocks.slice(0, blocks.indexOf("</div>")).match(/<i/g) ?? []).length;
    expect(cells).toBe(25);
  });

  it("activity: the expand button wires aria-expanded/aria-controls; the footer is caption ONLY", () => {
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls="os-actv-body"');
    expect(html).toContain("Last 30 days");
    // §6: no link in the footer — the arrows are the sole route into the expanded feed
    const foot = html.slice(html.indexOf("os-afoot"));
    expect(foot.slice(0, foot.indexOf("</div>"))).not.toContain("<a");
  });

  it("the Pro card is blue-detailed and quiet: no tagline, no gradient", () => {
    expect(html).toContain("ScriptAlly Pro");
    expect(html).toContain("See what&#x27;s included");
    expect(cssRules).not.toMatch(/os-promini[^}]*linear-gradient/);
  });

  it("no goal set → the ghost meter and Set a goal, never fake progress", () => {
    const bare = renderToStaticMarkup(
      <OneScreenRail
        expanded={false} setExpanded={() => {}}
        loading={false} queries={[]} agents={[]} manuscripts={[]} userTasks={[]} activities={[]}
        currentUser={{ id: "u", name: "N", plan: UserPlan.FREE } as any}
        activeManuscript={null} onNavigate={() => {}} updateUserProfile={async () => {}} now={NOW}
      />,
    );
    expect(bare).toContain("Set a target for the quarter");
    expect(bare).toContain("Set a goal");
    expect(bare).toContain("os-blocks ghost");
    expect(bare).toContain("+ Add your manuscript");
    expect(bare).toContain("The story starts with your first query.");
  });
});

describe("§6 · the collapse mechanics in CSS", () => {
  it("⚠️ the stowables collapse padding, borders AND the margin the rail spaces with", () => {
    const collapsed = cssRules.slice(cssRules.indexOf(".os-rail-expanded .stowable {"));
    const block = collapsed.slice(0, collapsed.indexOf("}"));
    for (const p of ["max-height: 0", "opacity: 0", "margin-bottom: 0", "padding-top: 0", "border-top-width: 0", "visibility: hidden"]) {
      expect(block, p).toContain(p);
    }
  });

  it("⚠️ the activity panel's own height is NEVER animated — flex does the work", () => {
    const actv = cssRules.slice(cssRules.indexOf(".os-actv {"), cssRules.indexOf(".os-ahead {"));
    expect(actv).toContain("flex: 1");
    expect(actv).not.toContain("transition: height");
    expect(actv).not.toContain("max-height");
  });

  it("the esc hint and the footer swap when expanded; the control hides at one column", () => {
    expect(cssRules).toContain(".os-rail-expanded .os-esc { display: block; }");
    expect(cssRules).toContain(".os-rail-expanded .os-afoot { display: none; }");
    const m = cssRules.slice(cssRules.indexOf("@media (max-width: 1024px) {", cssRules.indexOf(".os-exp")));
    expect(m).toContain(".os-exp { display: none; }");
  });

  /* the fill-in animates the BLOCKS, whose final frame equals their natural state — never the
     card, whose stowable opacity a pinned keyframe would fight (the §6 trap) */
  it("⚠️ the goal meter's fill-in animates the blocks, never the card", () => {
    expect(cssRules).toContain(".os-blocks i.f { background: #c9a293; animation: os-fillin");
    expect(cssRules).not.toMatch(/\.os-goal \{[^}]*animation/);
  });
});
