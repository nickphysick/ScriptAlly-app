/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE GRID'S CARD — list round, Phase 4 (`design-refs/todo-list-and-card.html`, the `.card` block).
 *
 * ⚠️ THE CLAIM IS ABOUT THE WHOLE CARD, NOT ITS PARTS. "The agent is named once" cannot be asked of
 * any one element: it is a fact about the card's text, so it is counted over the rendered markup.
 * The composed-result rule — a measurement of the parts is not a measurement of the whole.
 */
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { readFileSync } from "node:fs";
import { TaskTicket } from "./TaskTicket";
import { ticketVerb, ticketFacts, OWN_NOTE_LINE } from "../../lib/ticketFacts";
import { BoardCard } from "../../lib/todoBoard";
import { QueryStatus } from "../../types";
import { sliceBetween } from "../../test/sliceBetween";
import { getStatusLabel } from "../StatusPill";

const AGENT = "Jonathan Marsh";
const card = (over: Partial<BoardCard> = {}): BoardCard => ({
  key: "k1", stream: "do", title: `Send your full to ${AGENT}`, who: AGENT,
  subtitle: "", due: "", warn: false, snoozes: 0, hk: false, initials: "JM",
  record: `${AGENT} · The Marsh Agency`, committed: false, done: false,
  status: QueryStatus.FULL_REQUESTED,
  taskType: "full_requested", relatedRecordId: "q1", agentId: "a1", ...over,
});
const facts = ticketFacts(card(), { days: 49, dateLabel: "2 April", elapsed: "7 weeks" });

const render = (c: BoardCard, over: Record<string, unknown> = {}) => renderToStaticMarkup(
  <TaskTicket
    card={c} facts={facts} edge="#f1dbd0" onOpen={() => {}}
    deed="Send your full manuscript" agency="The Marsh Agency" verb={ticketVerb(c)}
    {...over}
  />,
);

describe("the card says the agent once", () => {
  it("the title is the ACT, and the person is the footer", () => {
    const html = render(card());
    expect(html.split(AGENT).length - 1, "the agent is named more than once on one card").toBe(1);
    const title = sliceBetween(html, 'class="ttl"', "</span>");
    expect(title, "the title names the agent").not.toContain(AGENT);
    expect(title).toContain("Send your full manuscript");
    const foot = sliceBetween(html, 'class="tfoot"', "</span></span>");
    expect(foot, "the foot is where the person is named").toContain(AGENT);
    expect(foot).toContain("<small>The Marsh Agency</small>");
  });

  it("the status is a dot AND its word, beside the tag on the top line", () => {
    const html = render(card());
    const top = sliceBetween(html, 'class="top"', 'class="ttl"');
    expect(top, "the tag").toContain("Agent request");
    expect(top, "and the dot with it").toContain("<svg");
    /* ⚠️ THE WORD IS ASKED OF THE TEXT, WITH EVERY TAG STRIPPED — AND THAT IS THE WHOLE ASSERTION.
       `StatusDot`'s own wrapper carries `aria-label` AND `title` holding the status name, so a card
       drawing the dot and NO word satisfies a plain `toContain`. Proved twice by aiming a mutation
       at it: once against the raw slice, and once against a slice with `<svg>…</svg>` removed, which
       still left the WRAPPING SPAN's two attributes behind. The claim is that a reader does not have
       to know the glyph vocabulary, which is a claim about text a person can read; an accessible
       name is not that. Dropping every tag is the only form of it that cannot be satisfied by an
       attribute. */
    const word = top.replace(/<[^>]*>/g, " ");
    /* the word is `getStatusLabel`'s — the same table the Query Centre's pill reads, never a
       literal here, so the two cannot come to call one status two things */
    expect(word, "the status word, beside the dot rather than inside it")
      .toContain(getStatusLabel(QueryStatus.FULL_REQUESTED));
    const foot = sliceBetween(html, 'class="tfoot"', "</span></span>");
    expect(foot, "the status stayed in the foot").not.toContain(getStatusLabel(QueryStatus.FULL_REQUESTED));
  });

  it("the verb is the category's word, and it is a label rather than a nested control", () => {
    const html = render(card());
    expect(html).toContain('<span class="go">Mark sent</span>');
    expect(html.match(/<button/g) ?? [], "a card is one button").toHaveLength(1);
  });

  it("a writer's own item wears the pencil and says what finishes it", () => {
    const own = card({ who: "", initials: "✓", userTaskId: "t1", nature: "task",
      title: "Update comp titles list", status: undefined, taskType: undefined, agentId: undefined });
    const html = renderToStaticMarkup(
      <TaskTicket card={own} facts={facts} edge="#efe7db" onOpen={() => {}}
        deed="Update comp titles list" verb={ticketVerb(own)} />,
    );
    expect(html).toContain('class="av yours"');
    expect(html).toContain(`Your own note<small>${OWN_NOTE_LINE}</small>`);
    expect(html).toContain('<span class="go">Tick it off</span>');
  });

  /**
   * ⚠️ THE VERB IS THE CONTRACT'S OWN WORD PER CATEGORY — asserted against the contract file, never a
   * table typed twice. Both of its Gone quiet cards read "Decide"; a bucket-keyed table would have
   * said "Close it" for one of them.
   */
  it("every verb it prints is a verb the contract prints", () => {
    const REF = readFileSync("design-refs/todo-list-and-card.html", "utf8");
    const kinds: [string, Partial<BoardCard>][] = [
      ["a request", { taskType: "full_requested" }],
      ["an offer", { taskType: "offer_received" }],
      ["a nudge", { taskType: "nudge_overdue", reason: "nudge-first" }],
      ["a silence", { taskType: "no_response_close", reason: "no-reply" }],
      ["a silence after a nudge", { taskType: "nudge_overdue", reason: "nudge-again" }],
      ["a record gap", { taskType: "materials_unrecorded" }],
      ["your own", { taskType: undefined, userTaskId: "t1", who: "" }],
    ];
    const said = new Map<string, string>();
    for (const [name, over] of kinds) {
      const v = ticketVerb(card(over));
      said.set(name, v);
      expect(REF, `"${v}" is not a verb the contract prints`).toContain(`>${v}</button>`);
    }
    expect(said.get("a silence"), "the contract's Gone quiet card").toBe("Decide");
    expect(said.get("a silence after a nudge")).toBe("Decide");
    expect(said.get("a request")).toBe("Mark sent");
    expect(said.get("a nudge")).toBe("Log a nudge");
    expect(said.get("your own")).toBe("Tick it off");
  });

  /**
   * ⚠️ THE DASHBOARD'S SNIPPED VARIANT IS UNTOUCHED, and that is the point of the `deed` prop being a
   * prop: its panel has no foot to name anybody, so the title is the only place a reader could learn
   * who the card is about — and there it keeps the card's own title.
   */
  it("snipped keeps the card's own title and draws no foot", () => {
    const html = render(card(), { snipped: true });
    expect(html).toContain(`Send your full to ${AGENT}`);
    expect(html).not.toContain("tfoot");
    expect(html).not.toContain("facts");
    expect(html, "the status belongs to the full card").not.toContain(getStatusLabel(QueryStatus.FULL_REQUESTED));
  });
});

describe("the card's stylesheet says what the contract says", () => {
  const css = readFileSync("src/components/todo/taskTicket.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const rule = (sel: string) => {
    const at = css.indexOf(sel + " {");
    expect(at, `${sel} has no rule`).toBeGreaterThan(-1);
    return css.slice(at, css.indexOf("}", at));
  };

  it("the verb is quiet at rest and takes the pink under the pointer", () => {
    expect(rule(".tkt .tfoot .go")).toContain("color: #b3a494");
    expect(rule(".tkt .tfoot .go")).toContain("background: #ffffff");
    expect(rule(".tkt:hover .tfoot .go")).toContain("var(--pink)");
    expect(rule(".tkt:hover .tfoot .go")).toContain("var(--burg)");
  });

  it("the status is on the top line, and its old foot rule went with it", () => {
    expect(rule(".tkt .top .qs")).toContain("margin-left: auto");
    expect(css, "the foot kept a status rule").not.toContain(".tkt .tfoot .qs");
  });
});
