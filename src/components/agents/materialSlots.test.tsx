/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The material slots — three fixed, a fourth only when there is free text.
 *
 * ⚠️ EVERY FILTERING CASE ASSERTS ITS POPULATION FIRST. "Agents with an Other render four slots"
 * is trivially true of a fixture containing none, and the harness account contains none: measured
 * across its 22 agents, `materialsWanted` held three distinct strings and not one free-text entry.
 * A lock written there would have gone green over an empty set — which is why the counts below
 * are asserted before the claims that rest on them.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MaterialSlots } from "./MaterialSlots";
import { CONTACT_FIXTURE_AGENTS } from "./contactFixture";
import { SLOT_NAMES, materialRowsFromAgent, materialSlots, materialsWantedFromRows, slotTip } from "../../lib/agentMaterials";
import { materialLabel } from "../../lib/materials";

const A = CONTACT_FIXTURE_AGENTS;
const slotsOf = (id: string) => materialSlots(A.find((a) => a.id === id)!.materialsWanted);
const draw = (id: string) => renderToStaticMarkup(<MaterialSlots agent={A.find((a) => a.id === id)!} />);
const withOther = A.filter((a) => materialSlots(a.materialsWanted).some((s) => s.key === "other"));
const withoutOther = A.filter((a) => !materialSlots(a.materialsWanted).some((s) => s.key === "other"));

describe("the slot count — three fixed, a fourth on demand", () => {
  it("the fixture contains BOTH cases, so neither claim below is vacuous", () => {
    expect(withOther.length, "no agent carries free-text Other — the four-slot claim has no subject").toBeGreaterThan(0);
    expect(withoutOther.length, "every agent carries free-text Other — the three-slot claim has no subject").toBeGreaterThan(0);
  });

  it("an empty Other renders exactly three", () => {
    for (const a of withoutOther) expect(materialSlots(a.materialsWanted).length, a.name).toBe(3);
  });

  it("a non-empty Other renders exactly four, and it is last", () => {
    for (const a of withOther) {
      const s = materialSlots(a.materialsWanted);
      expect(s.length, a.name).toBe(4);
      expect(s[3].key).toBe("other");
    }
  });

  /* ⚠️ THE THREE ARE FIXED — they render whether or not they are asked for. A slot that vanished
     would state nothing, and would shift the footer's width from card to card. */
  it("the three fixed slots are always present, in order, however little is asked for", () => {
    for (const a of A) {
      const keys = materialSlots(a.materialsWanted).slice(0, 3).map((s) => s.key);
      expect(keys, a.name).toEqual(["queryLetter", "synopsis", "sample"]);
    }
  });

  it("an agent asked for nothing at all still shows three ghosts", () => {
    const s = materialSlots([]);
    expect(s.length).toBe(3);
    expect(s.every((x) => !x.asked), "a slot claims to be asked for on an agent who asked for nothing").toBe(true);
  });
});

describe("what each slot says", () => {
  it("a filled slot names the specific ask; a ghost says it is not asked for", () => {
    const s = slotsOf("fx-long");
    const syn = s.find((x) => x.key === "synopsis")!;
    expect(slotTip(syn), "the name is stated twice — the ref's own fixture does this and it is not a treatment to copy").toBe("Synopsis — 1 page");
    const sample = s.find((x) => x.key === "sample")!;
    expect(slotTip(sample)).toBe("Opening sample — 50 pages");
    const ghost = slotsOf("fx-shut").find((x) => x.key === "synopsis")!;
    expect(slotTip(ghost)).toBe("Synopsis — not asked for");
  });

  /* the free text is the writer's own words — never re-labelled, never truncated into a category */
  it("Other carries the writer's words verbatim under 'Also asked for'", () => {
    const other = slotsOf("fx-long").find((x) => x.key === "other")!;
    expect(other.name).toBe("Also asked for");
    expect(other.detail).toBe("Comparable titles");
    expect(slotTip(other)).toBe("Also asked for — Comparable titles");
  });

  /* ⚠️ "OPENING SAMPLE" IS A CORRECTNESS RULE. Three units all store as one ComponentType, so the
     artefact does not know which was asked in — a "Sample pages" label would assert a unit the
     data does not carry. It is the only name true of all three. */
  it("the sample slot is 'Opening sample', never a unit-specific name", () => {
    expect(SLOT_NAMES.sample).toBe("Opening sample");
    for (const a of A) {
      const s = materialSlots(a.materialsWanted).find((x) => x.key === "sample")!;
      expect(s.name, a.name).toBe("Opening sample");
    }
  });

  /* ⚠️ RETIRED PILLS ARE NOT SLOTS. They parse so legacy flags can decay; a legacy agent shows
     them as free text in their own words rather than sprouting a fifth icon. */
  it("Author bio and Full manuscript never become slots — they arrive as Other", () => {
    const s = materialSlots(["Query letter", "Author bio", "Full manuscript"]);
    expect(s.length, "a retired pill became a fourth slot of its own").toBe(3);
    expect(s.map((x) => x.key)).toEqual(["queryLetter", "synopsis", "sample"]);
  });

  /* several sample units can be set at once on legacy data — one slot, everything said */
  it("multiple stored sample units collapse into ONE slot without losing either", () => {
    const s = materialSlots(["First 3 chapters", "First 50 pages"]);
    const sample = s.find((x) => x.key === "sample")!;
    expect(sample.detail).toContain("3 chapters");
    expect(sample.detail).toContain("50 pages");
    expect(s.filter((x) => x.key === "sample").length, "two sample slots — the footer would then vary in width by data shape").toBe(1);
  });
});

/**
 * ⚠️ THE LETTER'S NAME COMES FROM THE APP'S DISPLAY MAP, NOT FROM THE REF — the one place the ref's
 * copy is overruled here, and deliberately. The ref labels it "Query letter"; `lib/materials`
 * maps that stored token to "Covering letter", because that is the UK term and because the map
 * exists so that no screen disagrees with another about what a material is called. A literal here
 * would make this page the one that disagrees, and it would drift silently the day the map moves.
 * The token is untouched: "Query letter" is what thousands of documents hold and what
 * `ComponentType.QUERY_LETTER` is.
 */
describe("the slot names come from the one display map", () => {
  it("reads the map rather than restating the ref's literal", () => {
    expect(SLOT_NAMES.queryLetter).toBe(materialLabel("Query letter"));
    expect(SLOT_NAMES.queryLetter, "the ref's US literal reached the card — the app calls this a covering letter").not.toBe("Query letter");
  });

  it("and the STORED token is untouched by any of it", () => {
    expect(materialsWantedFromRows(materialRowsFromAgent(["Query letter"])), "the display name reached storage — that is a data migration, not a label change").toEqual(["Query letter"]);
  });
});

describe("the rendered slots", () => {
  it("draw one element per slot, ghosting the ones not asked for", () => {
    const html = draw("fx-shut"); // query letter only
    /* ⚠️ BOUNDED, NOT A SUBSTRING. `agl-mslot` is a PREFIX of the container's own `agl-mslots`
       and of `agl-mslot-off`, so a bare count reads four where there are three. */
    expect((html.match(/class="agl-mslot(?: agl-mslot-off)?"/g) ?? []).length).toBe(3);
    expect((html.match(/agl-mslot-off/g) ?? []).length, "synopsis and sample should both be ghosted here").toBe(2);
  });

  /* ⚠️ THE NAME IS ON THE ELEMENT, NOT ONLY IN THE TIP. The tip appears on hover and focus; the
     accessible name has to be there without either, or a screen reader meets four unlabelled
     glyphs. `title` would not do it — it is absent on focus and on touch. */
  it("every slot carries its full sentence as an accessible name", () => {
    const html = draw("fx-long");
    expect(html).toContain(`aria-label="${SLOT_NAMES.queryLetter}"`);
    expect(html).toContain('aria-label="Opening sample — 50 pages"');
    expect(html).toContain('aria-label="Also asked for — Comparable titles"');
    expect(draw("fx-shut")).toContain('aria-label="Synopsis — not asked for"');
  });

  it("each slot is reachable by keyboard, so the tip is not hover-only", () => {
    expect((draw("fx-long").match(/tabindex="0"/g) ?? []).length).toBe(4);
  });
});
