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
import { stripComments } from "./styleWiring";
import { FACETS } from "../components/agents/AgentToolbar";
import { facetOptions } from "./agentFilters";

const css = readFileSync(new URL("../components/agents/agentList.css", import.meta.url), "utf8");
const bar = readFileSync(new URL("../components/agents/AgentToolbar.tsx", import.meta.url), "utf8");
const page = readFileSync(new URL("../components/agents/AgentList.tsx", import.meta.url), "utf8");
const block = (selector: string): string => {
  const i = css.indexOf(selector + " {");
  if (i === -1) return "";
  return css.slice(i, css.indexOf("}", i));
};

/* ⚠️ THE FORBIDDEN NAME IS BOUNDED NOW, and Phase 6 is why: the new filter facets were briefly
   called `.agl-fchip` too, which is the RETIRED chip row's name — so this lock went red on a
   correct file, and a bare `toContain` would equally have missed a real return of the old markup
   wearing a longer name. The facets are `.agl-facetchip`; reusing a retired name defeats the lock
   that retired it and misleads anyone reading the history. */
describe("agent list · the five stacked bands are gone", () => {
  it("the chips row, its selects and the colour legend are deleted, not hidden", () => {
    expect(
      page,
      "the filter CHIP row came back — it is what encoded the peer-of-active bug, and the toolbar's Filter popover replaced it",
    ).not.toMatch(/["\s`]agl-fchip["\s`]/);
    expect(
      css,
      "the chip stylesheet survived the deletion — dead rules invite the markup back",
    ).not.toMatch(/(?:^|\n)\s*\.agl-fchip\s*[,{]/);
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

/**
 * ⚠️ REWRITTEN (Phase 6). THE CONTROLS ARE THE QUERY CENTRE'S NOW, so the cases that asserted this
 * page's OWN chip styling, its OWN popover, its OWN flip measurement and its OWN capture-phase
 * Escape are asserting an implementation that has gone — a private toolbar one click away from a
 * page with the same three controls. What survives, and is asserted below, is every LAW those
 * cases stood for: a control states its value without being opened; the door is its own facet and
 * never a kind of history; a zero-count option is visible and inert; the footer states the live
 * result rather than gating an Apply; the panel's flip is decided by measurement in a shared
 * place; and Escape dismisses without reaching the page.
 */
describe("the three controls are the Query Centre's, mounted", () => {
  it("mount the shared button, search and switch — not a second set", () => {
    expect(bar).toContain('from "../shared/ToolbarButton"');
    expect(bar).toContain("<ToolbarSearch");
    expect(bar).toContain("<QueryViewSwitch");
    expect(stripComments(bar), "a private control chip came back beside the shared one").not.toContain("agl-ctl");
  });

  /* a control holding ONE value states it; Filter holds many, so it counts and the tags spell them out */
  it("Group and Sort state their value; Filter carries a count", () => {
    expect(bar).toContain("value={GROUPINGS.find((g) => g.key === grouping)?.label}");
    expect(bar).toContain("value={spec.label}");
    expect(bar).toContain("count={nFilters}");
  });

  /* ⚠️ GROUP SAYS WHAT IT DOES. Grouping arranges the BOARD; in Grid and List it would have
     nothing to arrange, and a control that silently did nothing would be worse than one that
     explains itself. */
  it("Group stands down outside the board, and says why", () => {
    expect(bar).toContain("const groupLive = view === \"board\";");
    expect(bar).toContain("disabled={!groupLive}");
    expect(bar).toMatch(/title=\{groupLive \? undefined : "Grouping arranges the board/);
  });
});

describe("the desk popovers", () => {
  /* ⚠️ THE DESK IS THE SHARED ONE — sage band, radio rows with sub-captions, hairline footer. A
     second implementation of it is three chances to drift from a page one click away. */
  it("are F12Popover's mount chassis, with PRow's rows", () => {
    expect(bar).toContain('from "../shell/F12Shell"');
    expect(bar).toContain('chassis="mount"');
    expect(bar).toContain("<PRow");
    expect(stripComments(bar), "a private popover element came back").not.toMatch(/["\s`]agl-pop["\s`]/);
  });

  /* ⚠️ FOUR FACETS, AND THE DOOR IS ONE OF THEM RATHER THAN A KIND OF HISTORY. That separation is
     the precedence bug in UI form: an agency that shut its doors while holding your full must be
     reachable as "Closed to queries" AND "Active queries" at once. */
  it("carry the four facets, with the door as its own", () => {
    expect(FACETS.map((f) => f.key)).toEqual(["door", "genre", "history", "reply"]);
    expect(FACETS.map((f) => f.label)).toEqual(["Their door", "Genres sought", "Your history", "Response time"]);
    const hist = facetOptions([], [], "history").map((o) => o.value);
    expect(hist, "a door value is being offered inside 'Your history'").not.toContain("Closed to queries");
    expect(hist).toEqual(["Active queries", "Closed", "Never queried"]);
  });

  /* ⚠️ VISIBLE AND INERT AT ZERO, never hidden: the absence is information, and hiding rows makes
     the popover jump as the data changes. */
  it("a zero-count option stays visible and inert", () => {
    const opts = facetOptions([], [], "door");
    expect(opts.map((o) => o.value), "an empty facet hid its rows instead of showing them at zero").toEqual(["Open to queries", "Closed to queries"]);
    expect(opts.every((o) => o.n === 0)).toBe(true);
    expect(bar, "a tickable row that yields nothing is a dead end").toContain("disabled={o.n === 0 && !filters[f.key].includes(o.value)}");
  });

  /* ⚠️ THE FOOTER STATES THE LIVE RESULT AND IS NOT AN APPLY GATE, and Clear all calls the
     constructor rather than a hand-written facet list — a literal silently misses any facet added
     later, which is exactly what happened when the door axis arrived. */
  it("the filter footer states the live result and clears through the constructor", () => {
    expect(bar).toContain("{resultCount} of {total}");
    expect(bar).toContain("onFilters(emptyFilters())");
    expect(bar, "Clear all went back to a hand-written facet list").not.toMatch(/onFilters\(\{\s*door:\s*\[\]/);
  });

  /* ⚠️ THE FLIP IS DECIDED BY MEASUREMENT, IN A SHARED PLACE. Per-control and every popover added
     later starts overflowing again. */
  it("are anchored by the app's own utility, which measures the panel", () => {
    expect(bar).toContain("useFixedMenu");
    expect(bar).toContain("menuRef: panelRef");
    /* ⚠️ THE LAW IS THAT THE SIDE COMES FROM GEOMETRY, and the honest way to assert it is that
       EVERY control asks for `auto` — not a regex hunting for a control's name near the word
       "align", which matches the perfectly correct line that opens each control's own hook. It
       flagged this file's own `pop === "sort", { … align: "auto" }` on its first run. */
    const aligns = [...bar.matchAll(/align:\s*"(\w+)"/g)].map((m) => m[1]);
    expect(aligns.length, "no control asks for an alignment at all").toBe(3);
    expect(new Set(aligns), "a control was pinned to a side instead of measuring").toEqual(new Set(["auto"]));
  });

  /* ⚠️ ESCAPE DISMISSES AND GOES NO FURTHER — and it no longer needs a capture-phase listener to
     do it. The page's Escape handler is gated on there being a DRAFT, and a draft only exists
     while the drawer is open, which covers the toolbar entirely. The collision the capture phase
     defended against is now structurally impossible rather than defended against. */
  it("Escape cannot reach the page's draft, by construction", () => {
    const page = stripComments(readFileSync(new URL("../components/agents/AgentList.tsx", import.meta.url), "utf8"));
    expect(page, "the page's Escape handler stopped being gated on a live draft").toContain("if (!draft) return;");
  });

  /* ⚠️ BELOW md THE SAME CHILDREN PRESENT IN A SHEET. One set of options, two chassis — a
     mobile-only copy is how the two come to offer different filters. */
  it("present in MobileSheet below md, with the SAME children", () => {
    expect(bar).toContain("<MobileSheet");
    expect(bar).toContain("{children}{foot}");
    expect(bar, "the sheet renders its own option list rather than the popover's").not.toMatch(/isMobile \?[\s\S]{0,200}FACETS\.map/);
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
  /* ⚠️ SWEEPS OVER THIS FILE READ DECLARATIONS, NOT PROSE. A lock that forbids a token over RAW
     source finds it in the comment explaining why it was removed — and this repo's comments are
     unusually rich in exactly those words, because every retirement here is documented by quoting
     what it retired. The attention sweep below went red on a correct card whose header explains
     that attention belongs to the To-do board: a correct rule pointed at the wrong artefact. The
     looseness runs both ways, and the false GREEN is the half worth fearing.
     ⚠️ AND THE CLASS CHECK IS BOUNDED, not a substring — `agl-meta` is a PREFIX of the live
     `agl-metaline`, so a bare `toContain` would forbid the very element this case requires. */

  it("THE FLAG IS FLAT — a border, ring or shadow at 14×10 reads as a bevelled button", () => {
    const fl = block(".aglist .agl-loc .fl");
    expect(fl, "the flag lost its 14px width — the line's rhythm is built on the flag being smaller than the text beside it").toContain("width: 14px");
    expect(fl, "the flag lost its 10px height").toContain("height: 10px");
    expect(fl, "the flag radius drifted off 1.5px — sharper reads as a sticker, rounder as a chip").toContain("border-radius: 1.5px");
    expect(fl, "the flag lost overflow:hidden, so the artwork will square off its own corners and the radius does nothing").toContain("overflow: hidden");
    expect(fl, "a BORDER reached the flag — at this size a hairline reads as a bevel and turns a national flag into a button (the exact look this rule exists to prevent)").not.toMatch(/border:/);
    expect(fl, "a SHADOW reached the flag — same objection: it bevels").not.toMatch(/box-shadow/);
  });

  /* ⚠️ RETARGETED (contact-list v5), AND THE TWO CASES BECOME ONE BECAUSE THE TWO LINES DID.
     These asserted that the location sat between the agency and a SEPARATE mono meta line, and
     that the city fell back to the country name. The v5 card merges the two into one mono line,
     and the fallback moved into `contactMetaLine` — where `agentList.test.ts` now asserts it
     against the function rather than against a spelling in a component. What survives here, and
     is what the ordering was always standing in for: the location reads as part of the IDENTITY
     block, under the name and the agency, from ONE derivation. */
  it("is ONE line under the identity — flag, then place and pace together", () => {
    const agency = card.indexOf('className="agl-agency"');
    const loc = card.indexOf('className="agl-loc"');
    expect(agency, "the agency line is gone").toBeGreaterThan(-1);
    expect(loc > agency, "the location line moved above the agency — it belongs under the name block, not between name and agency").toBe(true);
    expect(card, "the line stopped reading the one derivation, so the flag and the words can now disagree about who they describe").toContain("contactMetaLine(agent)");
    expect(card, "the mono line left the location row").toContain('className="agl-metaline"');
    expect(
      stripComments(card),
      "the SEPARATE mono meta line came back — the v5 card states place and pace together, and two lines would draw the same identity block twice",
    ).not.toMatch(/["\s`]agl-meta["\s`]/);
  });

  it("NO attention markers on this page — the mockup's 'Your move' pill is deliberately unbuilt", () => {
    expect(
      card,
      "a 'Your move' pill appeared on the card — this page is REFERENCE DATA; attention and urgency belong to the To-do board alone, and duplicating them gives the same fact two homes that will disagree",
    ).not.toMatch(/Your move/);
    expect(stripComments(card), "an urgency/attention marker crept onto the card face").not.toMatch(/urgent|overdue|attention/i);
  });
});

describe("agent list · applied tags keep the popover honest", () => {
  it("the tags render OUTSIDE the popover, one per applied value, each removable", () => {
    expect(page, "the applied-tag row left the page — closing the popover would then hide what is filtering the list").toContain("<AgentAppliedTags");
    /* ⚠️ THE TAGS ARE BUILT FROM THE SAME SET THE POPOVER READS (Phase 6). They used to be worded
       from per-axis label maps, which is one place for the two to disagree; the facet values ARE
       the words now, so a tag cannot say something the popover does not offer. */
    expect(bar, "the tags stopped being built from the filter set itself").toContain("export function appliedTags(filters: AgentFilters");
    expect(bar, "a tag went back to a per-axis label map, which the popover would then have to keep in step").not.toContain("STANDING_LABEL");
    expect(bar, "a tag lost its remove affordance").toContain("onClick={t.onRemove}");
    /* every facet is walked, so a facet added later cannot go untagged — the fault that arrived
       once already when the door axis was added to a hand-written list */
    expect(bar, "the tag builder went back to naming its facets by hand").toContain("for (const f of FACETS)");
  });
});
