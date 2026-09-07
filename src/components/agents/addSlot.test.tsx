/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The dashed add slot — what an empty list cell is, and what it is no longer.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { AgentListView } from "./AgentListView";
import { AgentCard } from "./AgentCard";
import { AddSlot, SLOT_LABEL, SLOT_TAB } from "./AddSlot";
import { CONTACT_FIXTURE_AGENTS, CONTACT_FIXTURE_QUERIES, FIXTURE_GENRE } from "./contactFixture";
import { matchGenre } from "../../lib/genreMatch";
import { stripComments } from "../../lib/styleWiring";

const A = CONTACT_FIXTURE_AGENTS;
const Q = CONTACT_FIXTURE_QUERIES;
const css = stripComments(readFileSync(new URL("./agentList.css", import.meta.url), "utf8"));
const rule = (sel: string) => {
  const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|\\n)\\s*${esc}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? "";
};
const list = (slotsInert = false) => renderToStaticMarkup(
  <AgentListView
    agents={A} queries={Q} matchGenre={matchGenre(FIXTURE_GENRE)}
    onOpen={() => {}} onEdit={() => {}} onPeek={() => {}} peekId={null}
    onAdd={() => {}} slotsInert={slotsInert}
  />,
);

describe("every empty list cell offers a slot", () => {
  /* ⚠️ THE POPULATION FIRST. Every claim below is about EMPTY cells, and a cast with none would
     satisfy all of them by having nothing to check. */
  it("the fixture has empty cells in all four fields", () => {
    expect(A.filter((a) => !a.email.trim()).length, "no empty email").toBeGreaterThan(0);
    expect(A.filter((a) => !a.website.trim()).length, "no empty submissions page").toBeGreaterThan(0);
    expect(A.filter((a) => !(a.city ?? "").trim() && !(a.country ?? "").trim()).length, "no empty location").toBeGreaterThan(0);
    expect(A.filter((a) => a.genres.length === 0).length, "no empty genres").toBeGreaterThan(0);
  });

  it("draws one slot per empty cell, and none where there is a value", () => {
    const html = list();
    const slots = (f: string) => (html.match(new RegExp(`data-add-slot="${f}"`, "g")) ?? []).length;
    expect(slots("email")).toBe(A.filter((a) => !a.email.trim()).length);
    expect(slots("website")).toBe(A.filter((a) => !a.website.trim()).length);
    expect(slots("location")).toBe(A.filter((a) => !(a.city ?? "").trim() && !(a.country ?? "").trim()).length);
    expect(slots("genres")).toBe(A.filter((a) => a.genres.length === 0).length);
    /* and each of those is fewer than every row, so the "none where there is a value" half holds */
    expect(slots("email")).toBeLessThan(A.length);
    expect(slots("genres")).toBeLessThan(A.length);
  });

  /* ⚠️ A REAL BUTTON WITH A NAME THAT SAYS WHAT IT WOULD FILL. A decorative span with a plus in it
     is invisible to a screen reader and unreachable by keyboard, and this is the list's only route
     to those fields. */
  it("each is a button named for its field, not a decorative span", () => {
    const html = list();
    for (const [field, label] of Object.entries(SLOT_LABEL)) {
      if (!html.includes(`data-add-slot="${field}"`)) continue;
      const tag = new RegExp(`<(\\w+)[^>]*data-add-slot="${field}"`).exec(html)?.[1];
      expect(tag, `the ${field} slot is a <${tag}>, not a button`).toBe("button");
      expect(html, `the ${field} slot has no accessible name`).toContain(`aria-label="${label}"`);
    }
  });

  /* the copy is fixed — sentence case, no full stops */
  it("the labels are the pack's, exactly", () => {
    expect(SLOT_LABEL.email).toBe("Add email");
    expect(SLOT_LABEL.website).toBe("Add submissions page");
    expect(SLOT_LABEL.location).toBe("Add location");
    expect(SLOT_LABEL.genres).toBe("Add genres");
    for (const v of Object.values(SLOT_LABEL)) {
      expect(v, `"${v}" ends with a full stop`).not.toMatch(/\.$/);
      expect(v, `"${v}" is not sentence case`).toMatch(/^Add [a-z]/);
    }
  });

  /* ⚠️ IT DOES SOMETHING FROM THE MOMENT IT EXISTS. Every field escalates to the tab that owns it;
     Phase 4 swaps four of them for a popover and the other two keep this permanently. */
  it("every field knows the tab it would escalate to", () => {
    expect(SLOT_TAB.email).toBe("contact");
    expect(SLOT_TAB.website).toBe("contact");
    expect(SLOT_TAB.location).toBe("contact");
    expect(SLOT_TAB.genres).toBe("wishlist");
    expect(SLOT_TAB.wishlist).toBe("wishlist");
    expect(SLOT_TAB.materials).toBe("materials");
    expect(Object.keys(SLOT_TAB).sort(), "a field has a label and no tab, or the reverse").toEqual(Object.keys(SLOT_LABEL).sort());
  });

  /* ⚠️ INERT, NOT HIDDEN, while the drawer edits — the gap is still a fact about the record. */
  it("stands down while the drawer is editing", () => {
    const html = list(true);
    const buttons = html.match(/<button[^>]*data-add-slot="[^"]*"[^>]*>/g) ?? [];
    expect(buttons.length, "no slots rendered — this claim has no subject").toBeGreaterThan(0);
    for (const b of buttons) expect(b, "a slot stayed live while the drawer was editing").toContain("disabled");
    /* …and they are still THERE */
    expect(list(true)).toContain('data-add-slot="email"');
  });
});

describe("the italic sentences are gone from the list, and stay on the card", () => {
  /* ⚠️ DOWN A COLUMN OF TWENTY-TWO ROWS the same sentence twenty-two times is a wall of prose
     saying nothing, and it cannot be acted on. */
  it("no list cell renders an italic empty sentence", () => {
    const html = list();
    for (const gone of ["Not recorded", "No page", "agl-pnone"]) {
      expect(html, `"${gone}" survives in a list cell`).not.toContain(gone);
    }
  });

  /* ⚠️ THE CARD IS UNTOUCHED. A card has room for a sentence and a reader arrives at it slowly. */
  it("the card still says it in its own voice", () => {
    const html = renderToStaticMarkup(
      <AgentCard
        agent={A.find((a) => a.id === "fx-sparse")!} queries={Q} matchGenre={null}
        onOpen={() => {}} onEdit={() => {}} onPeek={() => {}} onLogQuery={() => {}}
      />,
    );
    expect(html, "the card lost its italic empty wishlist").toContain("Nothing recorded — check their site.");
    expect(html, "the card lost its italic empty genres").toContain("No genres recorded.");
    expect(html, "the card grew a dashed slot — the slot is the LIST's idiom").not.toContain("data-add-slot");
  });
});

describe("the slot is the material slot's shape", () => {
  /* ⚠️ ONE SHAPE, THREE DEGREES OF PRESENCE. Asserted against the material slot's own rule rather
     than against a literal on both sides, so the two cannot drift apart at a later retune. */
  it("same box and radius as the ghosted material slot", () => {
    const gap = rule(".aglist .agl-gap");
    const mslot = rule(".aglist .agl-mslot");
    expect(gap, "the slot rule is gone").not.toBe("");
    expect(mslot, "the material slot rule is gone").not.toBe("");
    for (const prop of ["width", "height", "border-radius"]) {
      const g = new RegExp(`${prop}:\\s*([^;]+)`).exec(gap)?.[1]?.trim();
      const m = new RegExp(`${prop}:\\s*([^;]+)`).exec(mslot)?.[1]?.trim();
      expect(g, `the slot states no ${prop}`).toBeTruthy();
      expect(g, `the slot's ${prop} (${g}) differs from the material slot's (${m})`).toBe(m);
    }
    expect(gap, "the slot is not dashed — a solid rim reads as a thing they asked for").toContain("dashed");
  });

  it("carries the ref's four states", () => {
    expect(rule(".aglist .agl-lrow:hover .agl-gap:not(:hover)"), "the row's hover no longer lifts its slots").not.toBe("");
    expect(rule(".aglist .agl-gap:hover"), "the slot has no hover").toContain("solid");
    expect(rule(".aglist .agl-gap:focus-visible"), "the slot has no focus ring — it is keyboard-reachable and must show it").toContain("outline");
    expect(rule(".aglist .agl-gap-on"), "the slot has no open state").toContain("solid");
  });

  /* ⚠️ THE ROW'S HOVER AND THE SLOT'S ARE DISJOINT SETS, and that is the claim rather than an
     ordering. Hovering a slot also hovers its row, so both rules match at once — and the row's has
     one more component than the slot's, so it WINS: the pointer lands on a slot and it takes the
     muted rim instead of going solid ink. Measured, before the fix, as rgb(202,187,172) where the
     ink belonged, from two declarations that each read perfectly correctly. `:not(:hover)` makes
     the two sets disjoint, so there is no contest to win at any specificity or in any order —
     which is why the fix is stated here rather than a heavier selector being asserted. */
  it("the row's hover EXCLUDES the slot under the pointer", () => {
    expect(css, "the row's hover stopped excluding the hovered slot — it will out-specify the slot's own hover").toContain(".agl-lrow:hover .agl-gap:not(:hover)");
    expect(css, "a bare row-hover rule came back beside it").not.toMatch(/\.agl-lrow:hover \.agl-gap\s*\{/);
  });
});
