/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the rail (spec §6; P5). The expand/collapse MOTION is a browser check; what is
 * lockable here is the feed derivation, the structure, and the CSS mechanics the motion rests on.
 */
import { describe, it, expect } from "vitest";
import { sliceBetween } from "../../test/sliceBetween";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { ActivityType, QueryStatus, UserPlan } from "../../types";
import { feedLabel, feedRows, OneScreenRail } from "./OneScreenRail";

const css = readFileSync(resolve(__dirname, "./oneScreen.css"), "utf8");
const cssRules = css.replace(/\/\*[\s\S]*?\*\//g, "");

const NOW = new Date(2026, 7, 6, 15, 0, 0);
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86400000).toISOString();

const act = (over: Record<string, unknown>) => ({
  id: String(Math.random()), userId: "u", queryId: "q1", manuscriptId: "m1",
  /* ⚠️ the real enum value. This fixture said "STATUS_CHANGE" — not an ActivityType at all — and
     nothing noticed, because the old feed never read the type. It does now. */
  activityType: ActivityType.STATUS_CHANGED, description: "", date: daysAgo(1), details: "", ...over,
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

  it("agent motion is sage; writer motion is pink; the status wins over the type", () => {
    const rows = feedRows([
      act({ id: "a", resultingStatus: QueryStatus.FULL_REQUESTED }),
      act({ id: "b", resultingStatus: QueryStatus.QUERIED, date: daysAgo(2) }),
      act({ id: "c", date: daysAgo(3) }),
    ], queries, agents, manuscripts, NOW);
    expect(rows[0]).toMatchObject({ pill: "Full requested", sage: true });
    expect(rows[1]).toMatchObject({ pill: "Query sent", sage: false });
    // no resultingStatus → the TYPE's own label, which for this one really is "Status changed"
    expect(rows[2]).toMatchObject({ pill: "Status changed", sage: false });
  });

  /* ⚠️ EVERY EVENT TYPE HAS ITS OWN LABEL. "Status changed" on an agent-added event was the
     generic fallback covering for a map that only knew query statuses. This enumerates the WHOLE
     enum, so adding a type without a label fails the suite instead of shipping a wrong pill. */
  it("⚠️ every ActivityType maps to a label — an unmapped one is a bug, not a fallback", () => {
    for (const t of Object.values(ActivityType)) {
      const got = feedLabel({ activityType: t as ActivityType, resultingStatus: undefined });
      expect(got, `no label for ${t}`).not.toBeNull();
      expect(got!.label).not.toBe("");
    }
    expect(feedLabel({ activityType: "Not A Real Type" as ActivityType, resultingStatus: undefined })).toBeNull();
  });

  /* ⚠️ THE SUBJECT IS FOUND PER TYPE. Agent and manuscript events are written with queryId: ""
     DELIBERATELY, so the old single query→agent path sent every one of them to an em dash. */
  it("⚠️ agent and manuscript events name their own subject, never an em dash", () => {
    const rows = feedRows([
      act({ id: "ag", activityType: ActivityType.AGENT_ADDED, queryId: "", resultingStatus: undefined,
        description: "Added Sophie Dunn at Curtis Vane" }),
      act({ id: "ms", activityType: ActivityType.MANUSCRIPT_ADDED, queryId: "", manuscriptId: "m1",
        resultingStatus: undefined, date: daysAgo(2) }),
    ], queries, agents, manuscripts, NOW);
    /* ⚠️ RETARGETED, NOT DELETED (polish P5). This asserted the SENTENCE grammar —
       who: "Added Sophie Dunn at Curtis Vane" — which is precisely what P5 replaces: the pill is
       the verb, the line is the SUBJECT, the caption is the context. The row still must never be
       an em dash, and that half of the lock is untouched. */
    expect(rows[0]).toMatchObject({ pill: "Agent added", who: "Sophie Dunn" });
    expect(rows[0].caption).toBe("Curtis Vane · added to your list");
    expect(rows[1]).toMatchObject({ pill: "Manuscript added", who: "Murphy's Day Out" });
    for (const r of rows) expect(r.who).not.toBe("—");
    /* ⚠️ NO ROW IS A SENTENCE ANY MORE — the fault subject grammar exists to remove. */
    for (const r of rows) expect(r.who).not.toMatch(/^(You |Added |Updated |Removed )/);
  });

  it("the caption is agency · manuscript for query events", () => {
    const rows = feedRows([act({})], queries, agents, manuscripts, NOW);
    expect(rows[0].who).toBe("Sophie Dunn");
    expect(rows[0].caption).toBe("Curtis Vane · Murphy's Day Out");
  });

  /* ⚠️ NO ROW MAY RENDER AN EM DASH WHERE A NAME BELONGS. A query event whose query is gone
     (deleted) cannot name anyone, so it is DROPPED rather than blanked. */
  it("⚠️ an unresolvable subject drops the row — it is never rendered blank", () => {
    expect(feedRows([act({ queryId: "missing" })], queries, agents, manuscripts, NOW)).toEqual([]);
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

  /* ⚠️ THE AUTHOR TILE LEFT THE RAIL (v16 §1) — it sits beside the chart in the main column's
     fixed 302px row now, and OneScreenAuthor owns it. This case pins the DEPARTURE so the tile
     cannot quietly return here and be rendered twice. */
  it("the author tile is NOT in the rail any more", () => {
    expect(html).not.toContain("os-aut-band");
    expect(html).not.toContain('aria-label="Add a photo"');
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

  /* ⚠️ THE PRO MINI LEFT THE RAIL (v16 §5) — it is the banner beneath tasks now. This pins the
     departure so a second upsell cannot reappear here and sell the same thing twice. */
  it("no Pro upsell in the rail any more — one per screen", () => {
    expect(html).not.toContain("ScriptAlly Pro");
    expect(html).not.toContain("os-promini");
    expect(cssRules).not.toContain(".os-promini");
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
    expect(bare).toContain("The story starts with your first query.");
  });
});

describe("the sage band and the timeline (app-shell-v2)", () => {
  /* ⚠️ SAGE HEADS A CONTAINER; pink is reserved for the surface that wants something (tasks). */
  it("⚠️ the activity header is a SAGE gradient band with its hairline", () => {
    const h = cssRules.slice(cssRules.indexOf(".os-ahead {"));
    const block = h.slice(0, h.indexOf("}"));
    expect(block).toContain("linear-gradient(180deg, #dde3da, #d6dcd3)");
    expect(block).toContain("border-bottom: 1px solid #cbd3c8");
    const t = cssRules.slice(cssRules.indexOf(".os-ahead h2 {"));
    expect(t.slice(0, t.indexOf("}"))).toContain("color: #2b3a29");
  });

  /* ⚠️ THE DOTS ARE THE LOCKED COMPONENT. The mockup draws simplified circles; those are a
     stand-in, and a local circle would lose the direction colouring the real dot carries.
     Asserted on the COMPONENT, never on a colour. */
  it("⚠️ the feed's dots are StatusDot instances at 9px, never local circles", () => {
    const src = readFileSync(resolve(__dirname, "./OneScreenRail.tsx"), "utf8");
    expect(src).toContain("<StatusDot status={r.dotStatus} overrideSize={9} decorative />");
    expect(src).toContain('import { StatusDot }');
  });

  it("the cardlet is parchment with a hairline and a 9px radius; the foot caption centres", () => {
    const c = cssRules.slice(cssRules.indexOf(".os-cardlet {"));
    const block = c.slice(0, c.indexOf("}"));
    expect(block).toContain("background: #fffdf9");
    expect(block).toContain("border-radius: 9px");
    const f = cssRules.slice(cssRules.indexOf(".os-afoot {"));
    expect(f.slice(0, f.indexOf("}"))).toContain("justify-content: center");
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
    const actv = sliceBetween(cssRules, ".os-actv {", ".os-ahead {");
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
