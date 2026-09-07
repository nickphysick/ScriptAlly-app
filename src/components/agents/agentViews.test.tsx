/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Three renderers, ONE set of agents — and the peek's fourth container.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { AgentListView } from "./AgentListView";
import { AgentBoardView } from "./AgentBoardView";
import { AGENT_VIEWS } from "./agentViews";
import { CONTACT_FIXTURE_AGENTS, CONTACT_FIXTURE_QUERIES, FIXTURE_GENRE } from "./contactFixture";
import { matchGenre } from "../../lib/genreMatch";
import { stripComments } from "../../lib/styleWiring";

const A = CONTACT_FIXTURE_AGENTS;
const Q = CONTACT_FIXTURE_QUERIES;
const tint = matchGenre(FIXTURE_GENRE);
const list = renderToStaticMarkup(
  <AgentListView agents={A} queries={Q} matchGenre={tint} onOpen={() => {}} onEdit={() => {}} onPeek={() => {}} peekId={null} onAdd={() => {}} slotsInert={false} quickAt={null} justSaved={null} />,
);
const board = renderToStaticMarkup(
  <AgentBoardView agents={A} queries={Q} grouping="status" matchGenre={tint} onOpen={() => {}} onPeek={() => {}} peekId={null} />,
);

describe("the three views", () => {
  it("are Grid, List and Board — the Query Centre's Calendar has no meaning here", () => {
    expect(AGENT_VIEWS.map((v) => v.key)).toEqual(["grid", "list", "board"]);
  });

  /* ⚠️ THE SWITCH IS THE QUERY CENTRE'S, MOUNTED — not a second one. It already took an additive
     `views` prop for the To-do page's two segments; a third caller is one array. */
  it("mount the shared switch rather than a local one", () => {
    const bar = readFileSync(new URL("./AgentToolbar.tsx", import.meta.url), "utf8");
    expect(bar).toContain("<QueryViewSwitch");
    expect(bar).toContain("views={AGENT_VIEWS}");
    expect(stripComments(bar), "a local switch was drawn beside the shared one").not.toMatch(/role="group" aria-label="View"/);
  });

  /* ⚠️ THE VIEW IS IN THE URL and is READ from it rather than mirrored into state — two copies of
     "which view" is one more than can be kept in step, and the back button would move only one. */
  it("the view lives in the URL, read not mirrored", () => {
    const page = stripComments(readFileSync(new URL("./AgentList.tsx", import.meta.url), "utf8"));
    expect(page).toContain("useSearchParams");
    expect(page, "the view was copied into state, so the URL and the page can disagree").not.toMatch(/useState<AgentView>/);
    expect(page, "an unknown view value should read as the grid rather than blanking the page").toContain('AGENT_VIEWS.some((v) => v.key === search$.get("view"))');
  });

  it("every view renders every agent it is given", () => {
    for (const a of A) {
      expect(list, `${a.name} is missing from the list`).toContain(a.name);
      expect(board, `${a.name} is missing from the board`).toContain(a.name);
    }
  });
});

describe("the list", () => {
  it("has no door column — a greyed row carries it", () => {
    const head = list.slice(list.indexOf('class="agl-lhead"'), list.indexOf('class="agl-lrow'));
    expect(head).toContain("Submissions page");
    expect(head).toContain("Materials required");
    expect(head, "a door column appeared — it would state one word repeated down the page").not.toMatch(/Open to queries|Their door|Status/);
  });

  /* the same predicate the card dims on, so the two views cannot disagree about the same agent */
  it("greys a closed row with nothing live, and never one holding a live query", () => {
    const row = (id: string) => {
      const i = list.indexOf(`Contact details for ${A.find((a) => a.id === id)!.name}`);
      return list.slice(list.lastIndexOf('class="agl-lrow', i), i);
    };
    expect(row("fx-shut"), "a closed agent with nothing live should grey").toContain("s-dim");
    expect(row("fx-shut-live"), "an agent holding a live full request was greyed because their door is shut").not.toContain("s-dim");
  });

  it("scrolls sideways rather than crushing its columns", () => {
    const css = stripComments(readFileSync(new URL("./agentList.css", import.meta.url), "utf8"));
    const wrap = /\.aglist \.agl-listwrap \{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(wrap).toContain("overflow-x: auto");
    expect(/\.aglist \.agl-list \{([^}]*)\}/.exec(css)?.[1] ?? "").toContain("min-width");
  });
});

describe("the board", () => {
  it("draws no column containers — a rule under a heading, on the page ground", () => {
    const css = stripComments(readFileSync(new URL("./agentList.css", import.meta.url), "utf8"));
    const col = /\.aglist \.agl-col \{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(col, "the column rule is gone").not.toBe("");
    expect(col, "the board's columns were boxed — they are grouped by position already").not.toMatch(/background|border(?!-)|box-shadow/);
    expect(/\.aglist \.agl-bhead \{([^}]*)\}/.exec(css)?.[1] ?? "").toContain("border-bottom: 2.5px");
  });

  /* ⚠️ NO DRAG, AND IT IS NOT AN OMISSION. A column is DERIVED, so dragging a card between them
     would be asking the app to change a query's status by moving a picture of it. */
  it("carries no drag affordance at all", () => {
    const src = stripComments(readFileSync(new URL("./AgentBoardView.tsx", import.meta.url), "utf8"));
    for (const dead of ["draggable", "onDragStart", "onDrop", "onDragOver"]) {
      expect(src, `${dead} reached the board — a column here is derived, not set`).not.toContain(dead);
    }
  });

  it("renders its empty columns so the ladder reads", () => {
    expect(board, "an empty column drew nothing at all").toContain("Nobody here.");
  });
});

/**
 * ⚠️ THE POPOVER IS THE PEEK'S FOURTH CONTAINER, NOT A FOURTH IMPLEMENTATION — and the lock that
 * forbids the peek's five labels in the drawer's source extends to the List's and the Board's.
 */
describe("the popover is a frame around ContactPeek", () => {
  const pop = readFileSync(new URL("./ContactPeekPopover.tsx", import.meta.url), "utf8");

  it("renders the peek and states none of its rows itself", () => {
    expect(pop).toContain("<ContactPeek");
    for (const owned of ["No email recorded", "No page recorded", "No social accounts recorded", '"Email"', '"Approach by"', '"Based in"']) {
      expect(pop, `the popover re-implements ${owned}`).not.toContain(owned);
    }
  });

  it("and so do the List and the Board — neither draws a contact row of its own", () => {
    for (const [name, src] of [
      ["List", readFileSync(new URL("./AgentListView.tsx", import.meta.url), "utf8")],
      ["Board", readFileSync(new URL("./AgentBoardView.tsx", import.meta.url), "utf8")],
    ] as const) {
      for (const owned of ["No email recorded", "No page recorded", "No social accounts recorded", '"Approach by"', '"Based in"']) {
        expect(stripComments(src), `the ${name} view re-implements ${owned}`).not.toContain(owned);
      }
    }
  });

  /* ⚠️ ANCHORED THROUGH `useFixedMenu`, whose flip is decided by MEASUREMENT — the half a
     hand-rolled `rect.bottom + 8` gets wrong at the bottom of a list. */
  it("is anchored by the app's own utility, and portalled out of the scroller", () => {
    const page = readFileSync(new URL("./AgentList.tsx", import.meta.url), "utf8");
    expect(page).toContain("useFixedMenu");
    expect(pop, "the popover measures for itself instead of taking the anchored style").toContain("style={style}");
    expect(pop, "it is not portalled — the List's horizontal scroller clips both axes").toContain("document.body");
  });
});
