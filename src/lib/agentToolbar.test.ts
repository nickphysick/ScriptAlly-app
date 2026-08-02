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
  it("carries all THREE axes with their hints, and the axes are labelled from ONE source", () => {
    expect(bar, "the 'where things stand' section lost its hint — the hint is what teaches that the axis is exclusive").toContain("One of these applies to each agent");
    expect(bar, "the 'whose turn' section lost its hint — without it the axis reads as a peer of standing, which is the bug the rebuild fixed").toContain("Applies within active queries");
    expect(bar, "the 'their door' section lost its hint — the hint is what stops a reader treating a closed door as a kind of history").toContain("Independent of your history with them");
    expect(bar, "the popover started wording the standings itself instead of reading STANDING_LABEL").toContain("STANDING_LABEL[k]");
    expect(bar, "the popover started wording the turn values itself instead of reading TURN_LABEL").toContain("TURN_LABEL[k]");
    expect(bar, "the popover started wording the door itself instead of reading DOOR_LABEL").toContain("DOOR_LABEL[k]");
  });

  it("THEIR DOOR is its own section, not a value inside 'where things stand'", () => {
    // search the RENDER body only — the file's own doc comment mentions these words too
    const body = bar.slice(bar.indexOf("export const AgentToolbar"));
    const stand = body.indexOf("Where things stand");
    const door = body.indexOf("Their door");
    const turn = body.indexOf("Whose turn");
    expect(door, "the 'Their door' section vanished — a closed door has been folded back into the standing list, which is the precedence bug in UI form").toBeGreaterThan(-1);
    expect(door > turn && turn > stand, "the popover's section order changed — history, then whose turn within it, then their door as a separate system").toBe(true);
    // the door values must NOT appear among the standing rows
    const standSection = body.slice(stand, turn);
    expect(standSection, "a door value is being rendered inside the 'where things stand' section").not.toMatch(/DOOR_LABEL|Closed for submissions/);
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
    expect(
      bar,
      "Clear all went back to a hand-written facet list — it then silently misses any facet added later, which is exactly what happened when the door axis arrived; it must call emptyFilterSet()",
    ).toContain("onFilters(emptyFilterSet())");
  });

  it("the popover FLIPS generically when it would overflow — no per-control special case", () => {
    expect(
      bar,
      "the flip decision left the shared Pop component — put back per-control and every popover added later starts overflowing again",
    ).toContain("popoverAlign({");
    expect(
      bar,
      "the flip stopped measuring against the content column (.agl-inner) — measuring the window instead lets the popover sit in the page's margin, outside what the reader perceives as the page",
    ).toContain('closest(".agl-inner")');
    expect(
      bar,
      "the measurement moved out of a LAYOUT effect — deciding after paint shows the popover in the wrong place for one frame",
    ).toContain("useLayoutEffect");
    expect(
      bar,
      "the flip is being hard-coded to a control (the pack forbids a per-Sort fix); it must come from the geometry alone",
    ).not.toMatch(/id === "sort".{0,40}(right|align)/);
    expect(
      block(".aglist .agl-pop.right"),
      "the right-anchored variant lost its `left: auto` — leaving left:0 in place means right:0 does nothing and the popover never actually flips",
    ).toContain("left: auto");
  });

  it("Escape closes the popover and goes NO further", () => {
    expect(
      bar,
      "the popover stopped consuming Escape on the capture phase — the key would fall through to the page handler and discard an open card's draft, so dismissing a dropdown would throw away edits",
    ).toContain("stopImmediatePropagation");
    expect(bar, "the capture-phase listener lost its `true` flag, so the page handler runs first").toContain('window.addEventListener("keydown", onKey, true)');
  });
});

describe("agent list · group sections reuse the To-do board's pattern", () => {
  const todo = readFileSync(new URL("../components/todo/todo.css", import.meta.url), "utf8");

  it("heading, count and stub-rule match the board's grammar — not a second grouping style", () => {
    const sec = block(".aglist .agl-gsec h2");
    expect(sec, "the section heading left Playfair — the board's sections are typographic, and a bar/pill here would make two lists that group differently look like two products").toContain("'Playfair Display'");
    expect(sec, "the section heading weight drifted off the board's 500").toContain("font-weight: 500");
    expect(block(".aglist .agl-gsec .cn"), "the section count left the mono face it shares with the board").toContain("'JetBrains Mono'");
    expect(block(".aglist .agl-grule"), "the section rule left 2px — the board's rule is a 2px hairline, not a border").toContain("height: 2px");
    // The board's OWN sections moved on (the tightening: one line, label · count · an inline
    // hairline filling the width) — the agent list KEEPS the stub grammar it borrowed, so the
    // shared-idea assertion is now historical. What still holds: the board draws a rule INSIDE
    // its section line rather than a second grouping style.
    expect(todo).toContain(".tdb-secrule { flex: 1; height: 1px;");
  });

  it("the 88px stub carries the section's identity colour, and the palette is NAMED", () => {
    expect(page, "the stub stopped being drawn as a gradient stop — the rule must read as one line whose head is coloured, not two rules").toContain("0 88px, var(--agl-linesoft) 88px");
    expect(page, "the stub colour stopped coming from the section, so every group would draw the same rule").toContain("${sec.stub}");
  });
});

/**
 * THE CARD'S LOCATION LINE (phase 5) — and the one thing the mockup draws that we deliberately
 * do NOT build.
 */
describe("agent list · the location line", () => {
  const card = readFileSync(new URL("../components/agents/AgentCard.tsx", import.meta.url), "utf8");

  it("THE FLAG IS FLAT — a border, ring or shadow at 14×10 reads as a bevelled button", () => {
    const fl = block(".aglist .agl-loc .fl");
    expect(fl, "the flag lost its 14px width — the line's rhythm is built on the flag being smaller than the text beside it").toContain("width: 14px");
    expect(fl, "the flag lost its 10px height").toContain("height: 10px");
    expect(fl, "the flag radius drifted off 1.5px — sharper reads as a sticker, rounder as a chip").toContain("border-radius: 1.5px");
    expect(fl, "the flag lost overflow:hidden, so the artwork will square off its own corners and the radius does nothing").toContain("overflow: hidden");
    expect(fl, "a BORDER reached the flag — at this size a hairline reads as a bevel and turns a national flag into a button (the exact look this rule exists to prevent)").not.toMatch(/border:/);
    expect(fl, "a SHADOW reached the flag — same objection: it bevels").not.toMatch(/box-shadow/);
  });

  it("sits between the agency and the mono meta, and only when there is a location to state", () => {
    const i = card.indexOf('className="agl-agency"');
    const loc = card.indexOf('className="agl-loc"');
    const meta = card.indexOf('className="agl-meta"');
    expect(loc > i, "the location line moved above the agency — it belongs under the name block, not between name and agency").toBe(true);
    expect(loc < meta, "the location line fell below the mono meta line — it reads as part of the identity, above the response/method tokens").toBe(true);
    expect(card, "the location line renders unconditionally — an agent with no country and no city would get an empty row, which reads as missing data rather than as nothing to say").toContain("{locationText && (");
  });

  it("the city is the useful half; the country name only stands in when no city is recorded", () => {
    expect(card, "the fallback chain changed — the city is what a writer recognises, and the country name is the stand-in, not the other way round").toContain('(agent.city || "").trim() || countryName(agent.country)');
  });

  it("NO attention markers on this page — the mockup's 'Your move' pill is deliberately unbuilt", () => {
    expect(
      card,
      "a 'Your move' pill appeared on the card — this page is REFERENCE DATA; attention and urgency belong to the To-do board alone, and duplicating them gives the same fact two homes that will disagree",
    ).not.toMatch(/Your move/);
    expect(card, "an urgency/attention marker crept onto the card face").not.toMatch(/urgent|overdue|attention/i);
  });
});

describe("agent list · applied tags keep the popover honest", () => {
  it("the tags render OUTSIDE the popover, one per applied value, each removable", () => {
    expect(page, "the applied-tag row left the page — closing the popover would then hide what is filtering the list").toContain("<AgentAppliedTags");
    expect(page, "the tags stopped reading the same label maps the popover uses, so the two can now disagree").toContain("STANDING_LABEL[k as AgentStanding]");
    expect(bar, "a tag lost its remove affordance").toContain("onClick={t.onRemove}");
  });
});
