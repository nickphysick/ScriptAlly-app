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
import { FEED_TABS, feedLabel, feedRows, feedTabOf, OneScreenRail } from "./OneScreenRail";
import { OneScreenGoals } from "./OneScreenGoals";
import { deriveGoalProgress } from "../../lib/queryingGoals";
import type { QueryingGoalEntry } from "../../types";
import { cssRule, cssRuleCount } from "../../test/cssRule";

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

/* ⚠️ THE GOAL ARRIVES DERIVED, and these fixtures build it with the REAL derivation rather than a
   hand-written object. A literal here would go green the day `deriveGoalProgress` changed shape —
   the "test the function with an input the system can actually produce" rule, applied to a prop. */
const goalFrom = (sent: string[], entries: QueryingGoalEntry[], now: Date = NOW) =>
  deriveGoalProgress(sent.map((d) => ({ dateSent: d })), entries, now);
const noGoal = goalFrom([], []);

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
      loading={false} queries={[]} agents={[]} manuscripts={manuscripts} userTasks={[]}
      activities={[act({})]}
      activeManuscript={manuscripts[0]} onNavigate={() => {}} now={NOW}
    />,
  );

  /* ⚠️ THE AUTHOR TILE LEFT THE RAIL (v16 §1) — it sits beside the chart in the main column's
     fixed 302px row now, and OneScreenAuthor owns it. This case pins the DEPARTURE so the tile
     cannot quietly return here and be rendered twice. */
  it("the author tile is NOT in the rail any more", () => {
    expect(html).not.toContain("os-aut-band");
    expect(html).not.toContain('aria-label="Add a photo"');
  });

  /* ⚠️ RETIRED WITH THE GOALS PACK. The old card carried an instruction ("Query 25 agents this
     quarter"), a `{done}/{target}` figure and a one-block-per-query meter. It reports a count now,
     against a target the writer set in a sheet. The retirement is asserted rather than deleted:
     each of those three is a thing that must not come back. */
  it("⚠️ the instruction, the ratio figure and the block meter are all gone", () => {
    expect(html).not.toContain("agents this quarter");
    expect(html).not.toMatch(/\d+\/\d+/);
    expect(html).not.toMatch(/["\s`]os-blocks["\s`]/);
    expect(html).not.toMatch(/["\s`]os-goal-num["\s`]/);
  });


  /* ⚠️ THE PRO MINI LEFT THE RAIL (v16 §5) — it is the banner beneath tasks now. This pins the
     departure so a second upsell cannot reappear here and sell the same thing twice. */
  it("no Pro upsell in the rail any more — one per screen", () => {
    expect(html).not.toContain("ScriptAlly Pro");
    expect(html).not.toContain("os-promini");
    expect(cssRules).not.toContain(".os-promini");
  });

  it("no goal set → the count for the month and the way to set one, never fake progress", () => {
    const bare = renderToStaticMarkup(
      /* the goals card left the rail with v16 — see `queryingGoalsCard.test.tsx` */
      <OneScreenGoals
        loading={false}
        currentUser={{ id: "u", name: "N", plan: UserPlan.FREE } as any}
        goal={noGoal} updateUserProfile={async () => {}} now={NOW}
      />,
    );
    /* ⚠️ HTML-ESCAPED — renderToStaticMarkup emits &#x27; for an apostrophe. */
    expect(bare).toContain("You&#x27;ve sent 0 queries this month.");
    expect(bare).toContain("Set a target");
    expect(bare).not.toMatch(/["\s`]os-blocks ghost["\s`]/);
  });

  /* ⚠️ THE FEED'S EMPTY LINE IS THE RAIL'S, AND IT WAS ASSERTED ON A RENDER THAT HELD BOTH CARDS.
     The two travelled together only because they shared a column; the goal's unset state and the
     feed's empty state are different claims about different cards and are asserted apart now. */
  it("an empty feed says where the story starts, rather than showing nothing", () => {
    const empty = renderToStaticMarkup(
      <OneScreenRail
        loading={false} queries={[]} agents={[]} manuscripts={[]} userTasks={[]} activities={[]}
        activeManuscript={null} onNavigate={() => {}} now={NOW}
      />,
    );
    expect(empty).toContain("The story starts with your first query.");
  });
});

describe("the sage band and the timeline (app-shell-v2)", () => {
  /* ⚠️ RETARGETED (dashboard redesign, Phase 2). The sage band is GONE — the header sits on the
     card's own paper, title and mark and controls against it. The band's INK survives, which is
     the half worth guarding: sage headed a container and pink the surface that wants something,
     and dropping the fill must not quietly drop the distinction with it.

     ⚠️ AND `background` MUST BE ABSENT, NOT `transparent`. The shorthand resets every background
     longhand, so a later edit adding an image here would take a colour with it; with nothing
     declared there is no shorthand to mistake. */
  it("⚠️ the activity header carries no fill and no hairline — but keeps its ink", () => {
    const block = cssRule(cssRules, ".os-ahead", "oneScreen.css");
    expect(block).not.toContain("linear-gradient");
    expect(block).not.toContain("border-bottom");
    expect(block).not.toContain("background");
    /* ⚠️ THE INK IS THE REF'S `--ink` NOW, AND IT IS ONE INK FOR EVERY CARD. Sage-for-a-container
       and pink-for-a-surface distinguished two BANDS, and the bands went in Phase 2; the ref gives
       every `.hd h3` the same serif 500/23 in `--ink`, so the distinction has nothing left to ride
       on and keeping two heading inks would be a grammar with no bands to explain it. */
    expect(cssRule(cssRules, ".os-ahead h2", "oneScreen.css")).toContain("color: #2a1f18");
  });

  /* ⚠️ RETARGETED (dashboard redesign, Phase 6). The dot is now the bubble's KNOT, hung off the
     outer edge, at 13px rather than 9 — but the law it guards is unchanged and is the one worth
     keeping: it is the locked COMPONENT, never a local circle, because a circle drawn here would
     lose the direction colouring the real dot carries.

     ⚠️ AND IT TAKES THE NORMALISED STATUS. `StatusDot`'s prop is `QueryStatus | string`, so the raw
     `resultingStatus` would go straight through it and draw whatever the fallback happens to be —
     a mark for a status the query does not have. `bubbleShape` returns an exact enum member or
     `null`, and `null` draws no knot at all. */
  it("⚠️ the feed's knot is a StatusDot instance, never a local circle, and never a raw string", () => {
    const src = readFileSync(resolve(__dirname, "./OneScreenRail.tsx"), "utf8");
    expect(src).toContain("<StatusDot status={r.status}");
    expect(src).toContain('import { StatusDot }');
    /* the raw field must not reach the component */
    expect(src).not.toContain("status={a.resultingStatus}");
    expect(src).not.toContain("status={r.dotStatus}");
  });

  /**
   * ⚠️ THE BODY CARRIES NO STATE COLOUR AT ALL NOW, AND THAT REVERSES THIS CASE'S PREMISE (ref v16,
   * Phase 7). It used to assert a neutral DEFAULT that a query bubble overrode with a v2 fill; the
   * fill was the whole bubble, so a feed of eight events was eight coloured rectangles and the
   * reader picked sentences out of four different papers. The colour is a STRIP across the top now
   * — one place, labelling the event — and the body is parchment for every bubble on the feed.
   *
   * ⚠️ SO THE CLAIM IS AN ABSENCE, WHICH IS THE HARDER HALF TO KEEP: the body must not gain a fill
   * by any route, and housekeeping's white is the one documented override.
   */
  it("the bubble BODY carries no state colour; the strip is the only place it appears", () => {
    const block = cssRule(cssRules, ".os-bubin", "oneScreen.css");
    expect(block).toContain("background: #fffdf9");   // ref `.cv .msg .b`
    expect(block).toContain("border: 1px solid");
    /* the strip exists, and it is what the inline fill lands on */
    const strip = cssRule(cssRules, ".os-bubstrip", "oneScreen.css");
    expect(strip).toContain("border-bottom: 1px solid");
    const rail = readFileSync(resolve(__dirname, "./OneScreenRail.tsx"), "utf8");
    expect(rail).toContain("className=\"os-bubstrip\"");
    expect(rail).toMatch(/os-bubstrip[\s\S]{0,400}background: STATE_TOKEN\[r\.state\]/);
    /* ⚠️ AND THERE IS EXACTLY ONE STATE FILL IN THE RENDER, ON THE STRIP. A proximity window is
       the wrong instrument here — the strip is a CHILD of the body, so "os-bubin near STATE_TOKEN"
       is true of the correct structure. The claim is the count and the owner. */
    expect(rail.match(/background: STATE_TOKEN\[r\.state\]/g) ?? []).toHaveLength(1);
    const upto = rail.slice(rail.indexOf('className="os-bubin"'), rail.indexOf("background: STATE_TOKEN[r.state]"));
    expect(upto, "the fill must sit on the strip, not on the body").toContain('className="os-bubstrip"');
    expect(cssRule(cssRules, ".os-bub.desk .os-bubin", "oneScreen.css")).toContain("#ffffff");
    for (const dead of ["os-cardlet", "os-tlev", "os-tlthread", "os-tldot", "os-r1", "os-st",
      "os-who", "os-cap", "os-tm", "os-tlday", "os-tlln", "os-r1l"]) {
      expect(cssRuleCount(cssRules, `.${dead}`), `.${dead} survived the timeline`).toBe(0);
    }
    /* ⚠️ THE FOOT IS `space-between` NOW, NOT CENTRED — ref `.foot`, the same element the to-do
       card's foot is. Centred, at 7px, in a paler ink, it read as a watermark rather than as the
       foot of a panel; it also stood 24.8px tall against the ref's 40.4, and the missing 15px went
       to the feed above it. With one child, `space-between` puts it left, which is where the ref
       puts it. */
    /* ⚠️ ANCHORED AT A LINE START, because it was not. `indexOf(".os-afoot {")` also matches the
       TAIL of `.os-actv .os-afoot {` — the hairline chrome's own override, which is declared first
       — so the slice read a two-property block about padding and reported that the foot had lost
       an alignment it declares perfectly well. Third time this pass that an unanchored selector in
       a source lock has read the wrong rule; a selector is anchored or it matches every rule that
       ends with it. */
    const foot = /(?:^|\n)\.os-afoot\s*\{([^}]*)\}/m.exec(cssRules);
    expect(foot, "the foot must have a base rule of its own").not.toBeNull();
    expect(foot![1]).toContain("justify-content: space-between");
  });
});

/* ══ §6 · THE FEED AS A CONVERSATION (dashboard redesign, Phase 6) ═══════════════════════════ */

describe("the feed is a conversation", () => {
  const railSrc = readFileSync(resolve(__dirname, "./OneScreenRail.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

  /* ⚠️ THE CLASSIFICATION IS `lib/feedConversation`'s, IMPORTED — not a second branch here. The
     rail resolves the SUBJECT (which lookup names who an event is about); what a bubble IS comes
     from one place, because `queryId` deciding it is the whole point. */
  it("⚠️ the shape comes from feedConversation, and the rail derives none of its own", () => {
    expect(railSrc).toContain('from "../../lib/feedConversation"');
    expect(railSrc).toContain("bubbleShape(a)");
    expect(railSrc).toContain("markSentOffered(a, queries)");
    expect(railSrc).toContain("tightRunHeads(");
  });

  /* ⚠️ NO HOUSEKEEPING BUBBLE CONTAINS A StatusDot — it has no query state to draw, which is a
     fact about the record rather than a style choice. Asserted at the guard that enforces it. */
  /* ⚠️ RETARGETED: THE KNOT IS GONE AND ITS LAW MOVED INTO THE STRIP (v22, Phase 7). The dot used
     to hang off the bubble's outer edge, which only reads as an edge while the bubble is indented;
     full-width messages have no margin for it to hang in. The LAW is unchanged and is the half
     worth keeping — a status dot is drawn only where there is a query status to draw, so a
     housekeeping event never gets one. Only its position moved. */
  it("⚠️ the status dot is drawn only where there is a query status, and now rides the strip", () => {
    expect(railSrc).toContain('className="os-bubsd"');
    expect(railSrc).toMatch(/os-bubstrip[\s\S]{0,600}os-bubsd/);
    expect(railSrc).toMatch(/\{r\.status && \([\s\S]{0,200}os-bubsd/);
    /* and the knot is not merely unrendered — its markup is gone */
    expect(railSrc.replace(/\{\/\*[\s\S]*?\*\/\}/g, "")).not.toMatch(/["\s`]os-knot["\s`]/);
    /* and every fill comes from the v2 table, never a local hex */
    expect(railSrc).toContain("STATE_TOKEN[r.state]");
    for (const hex of ["#f7efe3", "#e0e5dd", "#f5e6df", "#d7e0e8"]) {
      expect(railSrc, `${hex} is restated in the rail`).not.toContain(hex);
    }
  });

  /* ⚠️ ALIGNMENT CARRIES DIRECTION — so the legends that used to name it are forbidden, not merely
     absent. A legend for a thing the layout already says is the page explaining its own picture. */
  it("⚠️ there is no From-agents / From-you legend", () => {
    for (const gone of ["From agents", "From you", "From the agent"]) {
      expect(railSrc, `${gone} is back`).not.toContain(gone);
    }
    /* ⚠️ THE CLAIM IS THAT ALIGNMENT CARRIES DIRECTION, NOT THAT ONE DECLARATION IS SPELLED A
       CERTAIN WAY. It pinned the whole rule text and went red the day the ref's asymmetric padding
       arrived on the same selector — over a change that made the direction MORE legible. Two sides,
       each pushed off the far edge by a margin the other does not have. */
    const out = cssRule(cssRules, ".os-bub.out");
    expect(out).toContain("flex-direction: row-reverse");
    expect(out).toContain("padding-right: 26px");
    expect(out).toContain("padding-left: 76px");
    const inb = cssRule(cssRules, ".os-bub.in");
    expect(inb).toContain("padding-left: 26px");
    expect(inb).toContain("padding-right: 76px");
  });

  /* ⚠️ THE FOUR TABS SUM TO `all` BY CONSTRUCTION — `feedTabOf` gives each row exactly one tab and
     `all` is the length rather than a fourth sum. A tab counted separately is how a summary comes
     to disagree with the list beneath it. */
  it("⚠️ every row lands in exactly one tab, and the three sum to All", () => {
    expect(FEED_TABS.map((t) => t.key)).toEqual(["all", "in", "out", "desk"]);
    const rows = [
      { kind: "query" as const, side: "in" as const },
      { kind: "query" as const, side: "out" as const },
      { kind: "query" as const, side: "out" as const },
      { kind: "housekeeping" as const, side: "out" as const },
    ];
    const tabs = rows.map(feedTabOf);
    expect(tabs).toEqual(["in", "out", "out", "desk"]);
    const counts = { in: 0, out: 0, desk: 0 } as Record<string, number>;
    for (const t of tabs) counts[t]++;
    expect(counts.in + counts.out + counts.desk).toBe(rows.length);
    /* ⚠️ AND A HOUSEKEEPING ROW GOES TO Desk WHATEVER SIDE IT SITS ON — the tab follows `kind`
       first, or a desk event aligned right would be counted as the writer's query traffic. */
    expect(feedTabOf({ kind: "housekeeping", side: "out" })).toBe("desk");
  });

  /* ⚠️ FOUR THINGS WERE DESIGNED AND SET ASIDE, AND ARE ASSERTED ABSENT — thread highlighting, the
     chart link, the month rail and the since-last-visit rule. A designed-and-parked feature is one
     hover handler from arriving by accident. */
  it("⚠️ the four parked features are not built", () => {
    for (const parked of ["os-thread", "threadHighlight", "os-mrail", "monthRail", "sinceLastVisit", "os-since"]) {
      expect(railSrc, `${parked} was built`).not.toContain(parked);
      expect(cssRules, `${parked} has a rule`).not.toContain(parked);
    }
  });

  it("the day caption is centred and sticky; a tight run drops its furniture", () => {
    const day = cssRule(cssRules, ".os-aday", "oneScreen.css");
    expect(day).toContain("position: sticky");
    expect(day).toContain("text-align: center");
    expect(railSrc).toContain("const head = runHeads[i];");
    expect(railSrc).toContain("{head && (");
  });

  /* ⚠️ THE QUICK ACTION OPENS THE PANEL'S DRAWER, NOT ONE OF ITS OWN. A second pane in the rail
     would be a second answer to what finishing a send involves, three inches from the first. */
  it("⚠️ Mark sent hands a query id up rather than mounting a pane", () => {
    expect(railSrc).toContain("onOpenTask?.(r.queryId)");
    expect(railSrc, "the rail must not mount a pane of its own").not.toContain("<TaskPane");
    expect(railSrc).not.toContain("SlideOver");
    /* it is reachable from a keyboard, not only under a pointer */
    expect(cssRules).toContain(".os-bub:hover .os-bubact, .os-bub:focus-within .os-bubact");
  });
});

/* ══ §7 · THE GOALS CARD (dashboard redesign, Phase 7) ═══════════════════════════════════════ */

describe("the goal is a row of slots, and it survives being stowed", () => {
  /* ⚠️ THE METER IS RETIRED, RULE AND ELEMENT TOGETHER. A bar states a PROPORTION; a target is a
     plan, and a row of slots is what a plan looks like. */
  it("⚠️ no progress bar survives anywhere in the goals card", () => {
    const goals = readFileSync(resolve(__dirname, "./queryingGoals.css"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    expect(cssRuleCount(goals, ".os-goal-meter")).toBe(0);
    expect(cssRuleCount(goals, ".os-goal-meter i")).toBe(0);
    /* ⚠️ THE GOALS CARD IS ITS OWN FILE SINCE v16 — and BOTH files are checked for the retired
       meter, because a rule with no renderer is how a deleted control comes back and the rail is
       where it used to live. */
    const read = (f: string) => readFileSync(resolve(__dirname, f), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
    const card = read("./OneScreenGoals.tsx");
    for (const f of ["./OneScreenGoals.tsx", "./OneScreenRail.tsx"]) {
      expect(read(f), `the meter is still rendered in ${f}`).not.toMatch(/["\`\s]os-goal-meter["\`\s]/);
    }
    expect(card).toContain("goalRings(goal.count, goal.target)");
    expect(card).toContain("historyBars(goal.history)");
  });

});

describe("the community tile keeps its one state, and gains only chrome", () => {
  const comm = readFileSync(resolve(__dirname, "./OneScreenCommunity.tsx"), "utf8");

  /**
   * ⚠️ THE THREE-CELL EM-DASH STRIP WAS WITHDRAWN, AND THAT IS THE POINT OF THIS CASE. There is no
   * cohort, no aggregate collection and no cross-user data anywhere behind this tile, so a strip of
   * `Writers · Queries logged · Median wait` reading em-dashes would be a shape promising numbers
   * that do not exist — which is precisely the ghost-preview alternative this component's own
   * header records as REJECTED. Asserted absent so it cannot arrive as a "small addition".
   */
  it("⚠️ no ghost stat strip — the empty state does not mimic a populated one", () => {
    for (const gone of ["Median wait", "Queries logged", "os-commstats", "os-commcell"]) {
      expect(comm, `${gone} arrived`).not.toContain(gone);
      expect(cssRules, `${gone} has a rule`).not.toContain(gone);
    }
    expect(comm).toContain("COMMUNITY_EMPTY");
  });

  /* ⚠️ CHROME ONLY: the band's fill went with `.os-ahead`'s (Phase 2), and the Beta pill takes a
     solid step because a 62% white designed to read against a sage gradient is very nearly nothing
     on the card's own paper. Same meaning, same colours, one surface further out. */
  it("the Beta pill reads on the card rather than on a band", () => {
    const pill = cssRule(cssRules, ".os-commbeta", "oneScreen.css");
    expect(pill, "a translucent wash has nothing to sit against now").not.toContain("rgba(255, 255, 255");
    expect(pill).toContain("color: #5a6e58");
    expect(comm).toContain("os-commbeta");
  });
});

describe("§6 · the collapse mechanics in CSS", () => {
  /**
   * ⚠️ THE EXPANDER AND ITS WHOLE STATE ARE RETIRED (ref v16, Phase 3), AND THE MOVE RETIRED THEM.
   *
   * It existed to give the feed the goals card's height. v16 moves the goals card to the LEFT
   * column and Activity already occupies this one top to bottom, so expanding gained the feed
   * nothing: the state's remaining effects were a heavier shadow on the card, a hidden foot and an
   * Escape hint for a thing that had not opened. A control whose only observable result is its own
   * chrome is a control that lies about what it does.
   *
   * The four cases that guarded the button, the stow, the collapse mechanics and the hint swap are
   * gone with it. This one stands in their place so the retirement is a decision somebody reads
   * rather than four cases that quietly stopped existing — and it fails if any of it comes back
   * without a column to expand into.
   */
  it("⚠️ the expander is retired — no button, no expanded state, no stow", () => {
    const rail = readFileSync(resolve(__dirname, "./OneScreenRail.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
    expect(rail).not.toMatch(/["\s`]os-exp["\s`]/);
    /* ⚠️ `aria-expanded` IS NO LONGER FORBIDDEN, AND FORBIDDING IT WAS ALWAYS A PROXY. The claim is
       that the CORNER EXPANDER is retired — a control that made the feed taller. `aria-expanded` is
       the correct attribute for any disclosure, and v22's quiet header has one: the funnel, which
       opens the filter row. Keeping the ban would have meant either a funnel with no accessible
       state or a lock that fails on a control it was never about. The three names below are the
       expander itself and cannot be satisfied by anything else. */
    expect(rail).not.toContain("os-rail-expanded");
    expect(rail).not.toMatch(/["\s`]os-esc["\s`]/);
    expect(cssRuleCount(cssRules, ".os-rail-expanded .stowable")).toBe(0);
    expect(cssRuleCount(cssRules, ".os-esc")).toBe(0);
    /* ⚠️ AND THE ACTIVITY CARD STILL FILLS ITS COLUMN — the thing the expander was a workaround
       for is now the resting state, so losing it must not lose that. */
    expect(cssRule(cssRules, ".os-colR .os-actv", "oneScreen.css")).toContain("flex: 1 1 auto");
  });


  it("⚠️ the activity panel's own height is NEVER animated — flex does the work", () => {
    /* ⚠️ ANCHORED. `sliceBetween(css, ".os-actv {", ".os-ahead {")` matched inside
       `.os-colR .os-actv {` once the columns gained descendant rules, and swept 840 lines of other
       rules' declarations into the slice. See src/test/cssRule.ts. */
    const actv = cssRule(cssRules, ".os-actv", "oneScreen.css");
    expect(actv).toContain("flex: 1");
    expect(actv).not.toContain("transition: height");
    expect(actv).not.toContain("max-height");
  });


  /* the fill-in animates the BLOCKS, whose final frame equals their natural state — never the
     card, whose stowable opacity a pinned keyframe would fight (the §6 trap) */
  /* ⚠️ RETIRED WITH THE BLOCK METER. The case required `.os-blocks i.f`'s fill-in — there are no
     blocks now, and `os-fillin` is gone from the sheet. Its SECOND half is the durable half and is
     kept: whatever the meter is, the animation must never sit on the card, because an animation
     with a persistent fill-mode on a container pins its transform for the element's whole life. */
  it("⚠️ no animation on the goals CARD — the §6 fill-mode trap", () => {
    expect(cssRules).not.toMatch(/\.os-goal \{[^}]*animation/);
    expect(cssRules).not.toContain("os-fillin");
  });
});

describe("the hover action lives in the strip (v26, Phase 6)", () => {
  const css = readFileSync(resolve(__dirname, "./oneScreen.css"), "utf8");
  const rail = readFileSync(resolve(__dirname, "./OneScreenRail.tsx"), "utf8");
  const rule = (sel: string) => {
    const m = new RegExp(`(?:^|\\n)${sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`, "m").exec(css);
    return m ? m[1] : "";
  };

  /* ⚠️ NO BUBBLE MAY RESERVE VERTICAL SPACE FOR AN ACTION IT DOES NOT HAVE. The action used to sit
     in the BODY at `opacity: 0` with a 6px top margin — opacity hides ink and keeps the box, so
     every event in the feed carried a blank row of furniture for a control almost none of them
     offer. It shares the timestamp's grid cell now, so the slot is the taller of the two whether
     or not an action exists. */
  it("the action is in the strip, sharing one cell with the timestamp", () => {
    /* ⚠️ THE ORDER HERE IS A PROXY AND THE CSS BELOW IS THE REAL CLAIM. A source window only says
       the two names are near each other; what makes the action share the timestamp's cell is the
       grid, and that is asserted directly. The window is wide because the comment explaining the
       swap sits between them — which is itself the reason a source lock should not be carrying a
       structural claim on its own. */
    const stripAt = rail.indexOf('className="os-bubstrip"');
    const endAt = rail.indexOf('className="os-bubend"');
    const bodyAt = rail.indexOf('className="os-bubbody"');
    expect(stripAt, "the strip must exist").toBeGreaterThan(-1);
    expect(endAt, "the end slot must sit inside the strip, before the body").toBeGreaterThan(stripAt);
    expect(endAt, "the action must NOT have drifted back into the body").toBeLessThan(bodyAt);
    expect(rule(".os-bubend")).toContain("display: grid");
    expect(rule(".os-bubend > *")).toContain("grid-area: 1 / 1");
    /* and it is no longer a block with a margin in the body */
    expect(rule(".os-bubact")).not.toMatch(/margin-top/);
    expect(rule(".os-bubact")).not.toMatch(/display:\s*block/);
  });

  /* ⚠️ A FLOOR, so the feed's rhythm is not a function of the writer's outstanding requests. */
  it("the strip states a minimum height", () => {
    expect(rule(".os-bubstrip")).toMatch(/min-height:\s*26px/);
  });

  /* ⚠️ AND THE SWAP IS CONDITIONAL. Hiding the timestamp on hover unconditionally made every
     bubble's time vanish under the pointer, including the ones with nothing to swap to. */
  it("the timestamp gives way only where there is an action to replace it", () => {
    expect(css).toMatch(/:has\(\.os-bubact\)[\s\S]{0,160}opacity:\s*1/);
    expect(css).toMatch(/\.os-bub:hover \.os-bubtm[\s\S]{0,80}opacity:\s*0/);
  });

  /* the expander is formally cut: it was never built, and v26 settles that it never will be */
  it("no expander survives in the panel", () => {
    expect(rail.replace(/\{\/\*[\s\S]*?\*\/\}/g, "")).not.toMatch(/["\s`]os-exp["\s`]/);
  });
});
