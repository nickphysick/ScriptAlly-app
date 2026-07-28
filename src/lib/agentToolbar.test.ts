/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Agent list — TOOLBAR locks (rebuild v2, phase 3).
 *
 * The behavioural half of the toolbar (which agents survive which ticks) is locked in
 * agentList.test.ts against the pure filter set. What's left here is the part that only exists in
 * markup and stylesheet — and each of these encodes a decision that would quietly rot if it drifted:
 * the five stacked bands really are gone, the three controls really are identical at rest, a
 * zero-count option is disabled rather than hidden, and the applied tags live OUTSIDE the popover
 * so closing it can't hide what is filtering the list.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const css = readFileSync(new URL("../components/agents/agentList.css", import.meta.url), "utf8");
const bar = readFileSync(new URL("../components/agents/AgentToolbar.tsx", import.meta.url), "utf8");
const page = readFileSync(new URL("../components/agents/AgentList.tsx", import.meta.url), "utf8");
const block = (selector: string): string => {
  const i = css.indexOf(selector + " {");
  if (i === -1) return "";
  return css.slice(i, css.indexOf("}", i));
};

describe("agent list · the five stacked bands are gone", () => {
  it("the chips row, its selects and the colour legend are deleted, not hidden", () => {
    expect(
      page,
      "the filter CHIP row came back — it is what encoded the peer-of-active bug, and the toolbar's Filters popover replaced it",
    ).not.toContain("agl-fchip");
    expect(
      css,
      "the chip stylesheet survived the deletion — dead rules invite the markup back",
    ).not.toContain(".agl-fchip");
    expect(
      page,
      "the full-width location/sort SELECTS returned — location belongs in the Filters popover, sort in its own control",
    ).not.toContain("agl-select-sm");
    expect(
      page,
      "the colour LEGEND returned — it taught the same vocabulary the filter list carries, in a second grammar",
    ).not.toContain("agl-legend");
    expect(
      page,
      "the standalone count LINE returned — the count lives at the toolbar's right edge now",
    ).not.toContain("agl-countline");
  });
});

describe("agent list · the three controls are one instrument", () => {
  it("Filters, Group and Sort share ONE resting style and ONE active treatment", () => {
    const ctl = block(".aglist .agl-ctl");
    expect(ctl, "the control height left 36px — the three controls and the search field share that line").toContain("height: 36px");
    expect(ctl, "the control radius left 10px — it matches the search field, which is what makes the row read as one instrument").toContain("border-radius: 10px");
    expect(ctl, "the controls lost their hairline — at rest they should read as quiet card-surface chips, not filled buttons").toContain("border: 1px solid var(--agl-line)");
    const act = block(".aglist .agl-ctl.act");
    expect(act, "the shared ACTIVE treatment lost its pink fill — a control set away from its default must announce itself the same way whichever control it is").toContain("background: var(--agl-pink)");
    expect(act, "the active border drifted off the pink line token").toContain("border-color: var(--agl-pinkline)");
    expect(act, "the active label lost its burgundy — pink-on-ink reads as a disabled chip").toContain("color: var(--agl-burg)");
  });

  it("Group and Sort swap their LABEL to the chosen value; Filters shows a count badge instead", () => {
    // a control holding one value can state it; Filters holds many, so it counts and the tags spell them out
    expect(bar, "the Group control stopped swapping its label — the row should say what it is doing without being opened").toContain('label={group === "none" ? "Group" : groupLabel}');
    expect(bar, "the Sort control stopped swapping its label").toContain('label={sort === defaultSort ? "Sort" : sortLabel}');
    expect(bar, "the Filters badge stopped counting applied values").toContain("badge={nFilters}");
    expect(bar, "active-ness stopped being derived from 'set away from its default'").toContain("active={group !== \"none\"}");
    expect(bar, "Sort's active state stopped comparing against the stated default").toContain("active={sort !== defaultSort}");
  });

  it("the search field is a fill, not a bordered pill", () => {
    const s = block(".aglist .agl-search");
    expect(s, "the search field regained a border — the mockup's field is a bare fill, which is what keeps it subordinate to the three controls").toContain("border: none");
    expect(s, "the search fill token changed — #efe8df is the shared chrome fill").toContain("background: var(--agl-fill)");
    expect(s, "the search field lost its 300px ceiling and will swallow the row on a wide monitor").toContain("max-width: 300px");
  });
});

describe("agent list · the filters popover", () => {
  it("carries both axes with their hints, and the axes are labelled from ONE source", () => {
    expect(bar, "the 'where things stand' section lost its hint — the hint is what teaches that the axis is exclusive").toContain("One of these applies to each agent");
    expect(bar, "the 'whose turn' section lost its hint — without it the axis reads as a peer of standing, which is the bug this rebuild fixed").toContain("Applies within active queries");
    expect(bar, "the popover started wording the standings itself instead of reading STANDING_LABEL").toContain("STANDING_LABEL[k]");
    expect(bar, "the popover started wording the turn values itself instead of reading TURN_LABEL").toContain("TURN_LABEL[k]");
  });

  it("a ZERO-COUNT option stays visible and inert — never hidden", () => {
    expect(bar, "zero-count rows stopped being disabled — a tickable row that yields nothing is a dead end").toContain("disabled={count === 0}");
    expect(bar, "zero-count rows are being FILTERED OUT of the popover — their absence is information ('nobody is closed'), and hiding them makes the list jump as data changes").not.toMatch(/\.filter\([^)]*count\s*[>!]/);
    const off = block(".aglist .agl-orow.off, .aglist .agl-orow[disabled]");
    expect(off, "the zero-count rows lost their dimming, so they no longer read as unavailable").toContain("opacity: .4");
  });

  it("the footer states the LIVE result and offers a clear — it is not an Apply gate", () => {
    expect(bar, "the footer's primary stopped stating the live count — ticking a box should answer 'how many?' before you close the popover").toContain("Show {resultCount}");
    expect(bar, "the count stopped being singular-safe at one agent").toContain('resultCount === 1 ? "agent" : "agents"');
    expect(bar, "Clear all stopped emptying every facet").toContain("onFilters({ standing: [], turn: [], stars: [], loc: [] })");
  });

  it("Escape closes the popover and goes NO further", () => {
    expect(
      bar,
      "the popover stopped consuming Escape on the capture phase — the key would fall through to the page handler and discard an open card's draft, so dismissing a dropdown would throw away edits",
    ).toContain("stopImmediatePropagation");
    expect(bar, "the capture-phase listener lost its `true` flag, so the page handler runs first").toContain('window.addEventListener("keydown", onKey, true)');
  });
});

describe("agent list · applied tags keep the popover honest", () => {
  it("the tags render OUTSIDE the popover, one per applied value, each removable", () => {
    expect(page, "the applied-tag row left the page — closing the popover would then hide what is filtering the list").toContain("<AgentAppliedTags");
    expect(page, "the tags stopped reading the same label maps the popover uses, so the two can now disagree").toContain("STANDING_LABEL[k as AgentStanding]");
    expect(bar, "a tag lost its remove affordance").toContain("onClick={t.onRemove}");
  });
});
