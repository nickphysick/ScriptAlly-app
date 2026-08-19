/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE CHASSIS, IN UNIT FORM — the parts of §2 that are facts about source rather than about pixels.
 *
 * ⚠️ THIS DOES NOT REPLACE THE MEASUREMENT. `tests/e2e/paneChassis.measure.ts` is what proves the
 * rim clips, the band fills it and the form is not 0px wide; a stylesheet lock proves a rule was
 * written, never that it reached an element. These are the claims measurement CANNOT make cheaply —
 * that a retired element stays retired, and that the presence table has one source.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { panePresence, bandDeed, bandSubline } from "./todoHandoff";
import { rowDeed } from "./todoBuckets";
import type { BoardCard } from "./todoBoard";

const here = join(__dirname, "..", "components", "todo");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const dockCss = strip(readFileSync(join(here, "todoDock.css"), "utf8"));
const dockTsx = strip(readFileSync(join(here, "TodoDock.tsx"), "utf8"));

const card = (over: Partial<BoardCard> = {}): BoardCard => ({
  key: "k", stream: "hk", title: "Log the close", who: "Elinor Hale", subtitle: "", due: "",
  warn: false, snoozes: 0, hk: true, initials: "EH", record: "Elinor Hale · Cavendish & Roe",
  committed: false, done: false, taskType: "no_response_close", ...over,
} as BoardCard);

describe("the header leads with the deed", () => {
  it("⚠️ the deed is `rowDeed`'s — the list's own words, not a second wording", () => {
    const c = card();
    expect(bandDeed(c)).toBe(rowDeed(c));
    expect(bandDeed(c)).toBe("Log the close");
    /* and it is NOT the card's long title, which is what my first version returned */
    expect(bandDeed(card({ title: "No response from Elinor Hale for 4 months" })))
      .toBe("Log the close");
  });

  it("the sub-line carries the agent and agency as a sentence, each part omitting itself", () => {
    expect(bandSubline(card(), "Closing your query to")).toBe("Closing your query to Elinor Hale · Cavendish & Roe");
    expect(bandSubline(card({ record: "Elinor Hale" }), "Closing your query to")).toBe("Closing your query to Elinor Hale");
    expect(bandSubline(card({ who: "", record: "" }), "Your note")).toBe("Your note");
  });

  it("⚠️ THE MONOGRAM STAYS RETIRED — element and rule both", () => {
    expect(dockTsx, "the monogram element is back").not.toMatch(/["\s`]tdk-av["\s`]/);
    expect(dockCss, "the monogram rule is back").not.toContain(".tdk-av {");
  });
});

describe("§2's presence table has ONE source", () => {
  const notePresence = panePresence(card({ userTaskId: "u1" }));
  const bulk = panePresence(card({ taskType: "materials_unrecorded_bulk" }));
  const single = panePresence(card({ taskType: "materials_unrecorded" }));
  const send = panePresence(card({ taskType: "full_requested" }));

  it("⚠️ a note keeps its tiles and figure, and shows NO TIMELINE", () => {
    /* ⚠️ REVERSED DELIBERATELY (contract run, D6), on the owner's own correction: the brief that
       said "no figure and no tiles" was written after a mockup drawn WITH both, and never
       reconciled. A note has a real added-date and a real age; "Due · No date set" and
       "Attached to · Nothing" are the absent-data grammar working, not an empty frame. What it has
       no business drawing is a history it does not have. */
    expect(notePresence).toEqual({ tiles: true, figure: true, timeline: false });
  });

  it("⚠️ the two materials tasks differ on exactly ONE row — the single keeps its history", () => {
    expect(bulk).toEqual({ tiles: false, figure: false, timeline: false });
    expect(single).toEqual({ tiles: false, figure: false, timeline: true });
    expect(single.timeline).not.toBe(bulk.timeline);
    expect(single.tiles).toBe(bulk.tiles);
  });

  it("a send shows all three", () => {
    expect(send).toEqual({ tiles: true, figure: true, timeline: true });
  });

  it("⚠️ the pane reads the derivation, not a second rule", () => {
    expect(dockTsx).toContain("panePresence(card)");
    expect(dockTsx).toContain("presence.tiles");
    expect(dockTsx).toContain("presence.timeline");
  });
});

describe("the rim is a real clipping container", () => {
  it("declares overflow hidden and the burgundy hairline, and is not a pseudo-element", () => {
    const rim = dockCss.slice(dockCss.indexOf(".tdk-rim {"), dockCss.indexOf("}", dockCss.indexOf(".tdk-rim {")));
    expect(rim).toContain("overflow: hidden");
    /* ⚠️ THE COLOUR IS A TOKEN NOW, AND THE CLAIM IS THE SAME ONE IN TWO PARTS — the rim reads a
       name, and the name still carries the burgundy at that alpha. Asserting only the `var()`
       would pass over a token repointed to anything at all; asserting only the rgba would go red
       the moment the value moved to where every other colour in this sheet already lives. */
    expect(rim).toContain("var(--tdk-rim)");
    expect(dockCss).toContain("--tdk-rim: rgba(124, 58, 42, 0.28)");
    expect(rim).toContain("border-radius: 9px");
    expect(dockCss, "an overlay border is back — it spills the band's fill").not.toContain(".tdk-w::before");
    expect(dockCss).not.toContain(".tdk-rim::before");
  });

  it("⚠️ the CARD reveals it — and the card is `.tdk-fc` now, three of them", () => {
    /* ⚠️ RE-POINTED (contract run, D1): `.tdk-w` WAS the single card. The contract has three
       `.tdk-fc` cards in a column, each with its own rim; `.tdk-w` is the column's box and draws
       nothing. The claim is unchanged — the card reveals the rim with 6px and does not itself clip
       — it is simply asserted of the element that is now the card. */
    const fc = dockCss.slice(dockCss.indexOf(".tdk-fc {"), dockCss.indexOf("}", dockCss.indexOf(".tdk-fc {")));
    expect(fc).toContain("padding: 6px");
    expect(fc, "two clipping boxes would round the contents twice").not.toContain("overflow: hidden");
    const w = dockCss.slice(dockCss.indexOf(".tdk-w {"), dockCss.indexOf("}", dockCss.indexOf(".tdk-w {")));
    expect(w, "the pane is drawing a card again").not.toContain("border-radius");
  });
});

describe("the pane's cards share the Query Centre relationship", () => {
  /* ⚠️ THE BRIEF ASKED TO "UPDATE THE ASSERTION THAT PINS THE DIVERGENCE" — no such assertion
     existed. The last run's report called the divergence "a stated, asserted fact"; it was a CSS
     comment. This is the assertion it should have been, written for the MATCH the frame run chose:
     both cards read the tokens, and the sampled literal is extinct in this sheet. */
  it("the outer card and the story card both read --line, and #ece4d9 is extinct", () => {
    /* ⚠️ RE-POINTED: every card is `.tdk-fc` now, and the story sits INSIDE one rather than being
       a card itself — so the relationship is asserted once, where the card is drawn. */
    const fc = dockCss.slice(dockCss.indexOf(".tdk-fc {"), dockCss.indexOf("}", dockCss.indexOf(".tdk-fc {")));
    expect(fc).toContain("border: 1px solid var(--line)");
    expect(fc).toContain("border-radius: var(--r-lg)");
    expect(dockCss, "the mockup-sampled edge is back").not.toContain("#ece4d9");
  });
});

describe("the band's three group tints", () => {
  it("each group declares its own two stops, and none repeats another's", () => {
    const grab = (g: string) => {
      const i = dockCss.indexOf(`.tdk-band.g-${g} {`);
      expect(i, `${g} has no rule`).toBeGreaterThan(-1);
      return dockCss.slice(i, dockCss.indexOf("}", i));
    };
    const urgent = grab("urgent"), hk = grab("housekeeping"), yours = grab("yours");
    /* ⚠️ THE STOPS ARE TOKENS NOW (Query Centre match). The three literals asserted here were
       sampled off a mockup; the housekeeping pair in particular was a near-miss of `--sage-band`,
       which is the exact pair the Query Centre's own panel header paints. The claim is untouched —
       three groups, three distinct pairs, none borrowing another's — and it is a stronger claim
       over names, because two tokens that drift to the same value still read as two decisions. */
    expect(urgent).toContain("var(--pink)");
    expect(hk).toContain("var(--sage-band)");
    expect(yours).toContain("var(--gold-t)");
    expect(new Set([urgent, hk, yours]).size).toBe(3);
    for (const [name, r] of [["urgent", urgent], ["housekeeping", hk], ["yours", yours]] as const)
      expect(r, `${name} went back to a literal`).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });

  it("⚠️ ORDER IS THE MECHANISM — the groups sit after `.v-default`, the offer after them", () => {
    const def = dockCss.indexOf(".tdk-band.v-default {");
    const grp = dockCss.indexOf(".tdk-band.g-urgent {");
    const offer = dockCss.lastIndexOf(".tdk-band.v-offer {");
    expect(def, "v-default is gone").toBeGreaterThan(-1);
    expect(grp, "the groups must come after v-default or it wins on equal specificity").toBeGreaterThan(def);
    expect(offer, "the offer must come after the groups to keep its own paper").toBeGreaterThan(grp);
  });
});

describe("the journey's grid", () => {
  it("⚠️ FLEX-WRAP DECIDES STACKING — no query, no fixed width (contract run)", () => {
    /* ⚠️ RE-POINTED FROM `.tdk-jgrid`, a grid behind `@container (min-width: 786px)`. That
       threshold was carefully derived and was still a breakpoint: the layout jumped rather than
       flowed, and 1440 sat permanently on the wrong side of it. The contract's instruction is a
       wrapping flex row; this guards the absence of every gate that used to decide for it. */
    const i = dockCss.indexOf(".tdk-workrow {");
    expect(i, ".tdk-workrow has no rule").toBeGreaterThan(-1);
    const row = dockCss.slice(i, dockCss.indexOf("}", i));
    /* ⚠️ RE-POINTED AGAIN, TO A GRID (audit A2/A3), and the wrapping row it replaces is what this
       case was written to require. It had WRAPPED: `flex: 1 1 420px` + `flex: 0 1 300px` is 720px
       of basis in a 650px workrow, so the timeline dropped below the form — measured at 300x181
       under a 650x482 form, and 284px wide with a journey open. The entries wrapped because the
       card was starved, and the page was twice as tall as it needed to be. A lock requiring
       `flex-wrap: wrap` could only ever have been green while that was true.

       ⚠️ THE CLAIM IN THE TITLE SURVIVES: no query, no fixed width. The second track is a `clamp`,
       so it flows rather than jumping, and nothing here states a width the browser cannot argue
       with. */
    expect(row).toContain("grid-template-columns: minmax(0, 1fr) clamp(200px, 32%, 300px)");
    expect(row, "the wrapping row is back — the timeline will stack and starve").not.toContain("flex-wrap");
    expect(row).toContain("gap: 16px");
    expect(dockCss, "a flex basis is back on a grid item").not.toContain("flex: 0 1 300px");
    /* ⚠️ ASSERTED OVER `dockCss`, WHICH IS ALREADY COMMENT-STRIPPED — and it had to be. My own
       note above says the words "@container" and "tdk-jgrid" while explaining their removal, and
       an unstripped read matches the prose that documents the retirement. That is the source-lock
       fault this codebase has paid for seven times in one session. */
    expect(dockCss, "a container query is back in the pane").not.toContain("@container");
    /* ⚠️ AND NO CONTAINER CONTEXT EITHER. `@container` alone does not cover it: `.tdk-w` kept
       `container-type: inline-size` for a whole pass after the last query that read it was
       deleted, so the pane declared a containment context, and a containing block for fixed
       descendants, in service of nothing. A dead declaration that looks structural is the harder
       half of this to notice, because removing the queries reads as finishing the job. */
    expect(dockCss, "a container context is back in the pane").not.toContain("container-type");
    expect(dockCss, "the retired jgrid is back").not.toContain("tdk-jgrid");
  });
});
