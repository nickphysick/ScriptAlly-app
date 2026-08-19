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

  it("a note shows none of the three", () => {
    expect(notePresence).toEqual({ tiles: false, figure: false, timeline: false });
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
    expect(rim).toContain("rgba(124, 58, 42, 0.28)");
    expect(rim).toContain("border-radius: 9px");
    expect(dockCss, "an overlay border is back — it spills the band's fill").not.toContain(".tdk-w::before");
    expect(dockCss).not.toContain(".tdk-rim::before");
  });

  it("⚠️ the card reveals it — 6px of padding, and the card no longer clips", () => {
    const w = dockCss.slice(dockCss.indexOf(".tdk-w {"), dockCss.indexOf("}", dockCss.indexOf(".tdk-w {")));
    expect(w).toContain("padding: 6px");
    expect(w, "two clipping boxes would round the contents twice").not.toContain("overflow: hidden");
  });
});

describe("the pane's cards share the Query Centre relationship", () => {
  /* ⚠️ THE BRIEF ASKED TO "UPDATE THE ASSERTION THAT PINS THE DIVERGENCE" — no such assertion
     existed. The last run's report called the divergence "a stated, asserted fact"; it was a CSS
     comment. This is the assertion it should have been, written for the MATCH the frame run chose:
     both cards read the tokens, and the sampled literal is extinct in this sheet. */
  it("the outer card and the story card both read --line, and #ece4d9 is extinct", () => {
    const w = dockCss.slice(dockCss.indexOf(".tdk-w {"), dockCss.indexOf("}", dockCss.indexOf(".tdk-w {")));
    const story = dockCss.slice(dockCss.indexOf(".tdk-story--card {"), dockCss.indexOf("}", dockCss.indexOf(".tdk-story--card {")));
    expect(w).toContain("border: 1px solid var(--line)");
    expect(story).toContain("border: 1px solid var(--line)");
    expect(story).toContain("border-radius: var(--r-lg)");
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
    expect(urgent).toContain("#f3e0d6");
    expect(hk).toContain("#d7ddd5");
    expect(yours).toContain("#f7f0e2");
    expect(new Set([urgent, hk, yours]).size).toBe(3);
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
  it("⚠️ ONE COLUMN UNTIL THE CONTAINER CAN AFFORD TWO — a 300px sibling left the form at 0px", () => {
    const i = dockCss.indexOf(".tdk-jgrid {");
    const base = dockCss.slice(i, dockCss.indexOf("}", i));
    expect(base).toContain("grid-template-columns: minmax(0, 1fr)");
    expect(base, "the two-column form must be behind a query, not the default").not.toContain("300px");
    /* ⚠️ A CONTAINER QUERY, because the pane's width comes from the split, not the viewport */
    /* ⚠️ 680 → 786 (frame run): 680 was a guess; 786 is derived — grid loses 50 to rim borders and
       scroll padding, and side-by-side needs form 420 + gap 16 + timeline 300 = 736. Re-pointed,
       not deleted. */
    expect(dockCss).toContain("@container (min-width: 786px)");
    expect(dockCss, "a media query would go two-column on a wide screen with a 350px pane")
      .not.toMatch(/@media[^{]*\)\s*\{\s*\.tdk-jgrid/);
  });
});
