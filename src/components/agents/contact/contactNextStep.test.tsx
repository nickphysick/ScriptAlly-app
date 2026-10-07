/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * LOCK 4 (Contact list v14 §10.4) and ruling Q4 — the next-step section's four states, each from a fixture
 * through the real `nextStep` derivation, render their title, middle and side as §2 describes; and every
 * Discover link follows `DISCOVER_LIVE`, both branches held. The rendered page half is contactV14 CL14-3.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Agent, CommunityAgent, Query } from "../../../types";
import { QueryStatus, SubmissionStatus } from "../../../types";
import { agentFacts } from "../../../lib/contactList";
import { nextStep } from "../../../lib/contactNextStep";
import { ContactNextStep, type ContactNextStepProps } from "./ContactNextStep";

const ag = (id: string, p: Partial<Agent> = {}): Agent => ({
  id, name: `Agent ${id.toUpperCase()}`, agency: `${id.toUpperCase()} Agency`, city: "London", genres: ["thriller"],
  mswlNotes: "Twisty thrillers.", submissionStatus: SubmissionStatus.OPEN, ...p,
}) as unknown as Agent;
const q = (agentId: string, status: QueryStatus): Query =>
  ({ id: `q-${agentId}`, agentId, manuscriptId: "ms1", status, dateSent: "2026-09-01" }) as unknown as Query;
const TODAY = "2026-10-07";
const noop = () => {};

const render = (agents: Agent[], queries: Query[], over: Partial<ContactNextStepProps> = {}) => {
  const step = nextStep({ agents, queries, msId: "ms1", book: ["Thriller"], todayIso: TODAY });
  const props: ContactNextStepProps = {
    step, bookTitle: "Murphy's Day Out", genres: "thrillers",
    factsById: new Map(agents.map((a) => [a.id, agentFacts(a, [], null)])), qFor: () => null, genreHit: () => true, todayIso: TODAY,
    reminded: () => false, discoverLive: false, discover: [],
    onOpen: noop, onAct: noop, onAdd: noop, onSeeAll: noop, onOpenHk: noop, onNewAgent: noop, onDiscover: noop,
    onRemind: noop, onRemindAll: noop, onAddDiscover: noop, ...over,
  };
  return { step, html: renderToStaticMarkup(<ContactNextStep {...props} />) };
};
/** the markup's text, tags stripped and entities decoded — what a reader sees */
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;|&rsquo;|’/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ")
  /* a tag boundary is not a space a reader sees before punctuation ("<i>Book</i>." reads "Book.") */
  .replace(/\s+([.,])/g, "$1").trim();
const slice = (html: string, cls: string) => { const i = html.indexOf(`data-cl14="${cls}"`); expect(i, `the ${cls} part`).toBeGreaterThan(-1); return html.slice(i); };

describe("the four states (lock 4)", () => {
  it("ready: title, its copy, the agent card as First up, Next in line with three rows and 'and N more'", () => {
    const agents = ["a", "b", "c", "d", "e"].map((id, i) => ag(id, { starRating: (5 - i) as 1 | 2 | 3 | 4 | 5 }));
    const { html } = render(agents, []);
    const t = text(html);
    expect(html).toContain('data-state="ready"');
    expect(t).toContain("Ready to query");
    expect(t).toContain("5 agents on your list take thrillers, are open to submissions and haven't seen Murphy's Day Out yet.");
    expect(t).toContain("You've sent it to 0 of the 5 agents on your list who take thrillers.");
    expect(t).toContain("Your highest-rated agents come first. If two share a rating, the one who usually replies sooner goes first.");
    expect(t).toContain("See all 5 in the list");
    /* the middle is the agent card (the shared blocks' card), chip First up, first by rating */
    const card = slice(html, "card");
    expect(card).toContain('data-cl13="ccard"');
    expect(card).toContain('data-agent="a"');
    expect(text(card.slice(0, card.indexOf('data-cl14="side"')))).toContain("First up");
    const side = text(slice(html, "side"));
    expect(side).toContain("Next in line");
    expect(side).toContain("sorted by your rating, then reply time");
    expect((html.match(/data-cl14="nl-row"/g) ?? []).length).toBe(3);
    expect(side).toContain("and 1 more");
  });
  it("Ready never shows when no agent is ready (the not-queried condition holds)", () => {
    const agents = [ag("a"), ag("b")];
    const { html, step } = render(agents, [q("a", QueryStatus.QUERIED), q("b", QueryStatus.QUERIED)]);
    expect(step.state).not.toBe("ready");
    expect(text(html)).not.toContain("Ready to query");
  });
  it("reopening: title, copy, the soonest as the card (Reopens …, Remind me), Also reopening rows", () => {
    const agents = [
      ag("sent"),
      ag("soon", { submissionStatus: SubmissionStatus.CLOSED, reopensOn: "2026-11-01" }),
      ag("late", { submissionStatus: SubmissionStatus.CLOSED, reopensOn: "2026-11-15" }),
    ];
    const { html } = render(agents, [q("sent", QueryStatus.QUERIED)]);
    const t = text(html);
    expect(html).toContain('data-state="reopening"');
    expect(t).toContain("Reopening soon");
    expect(t).toContain("Every open agent who takes thrillers has seen Murphy's Day Out. 2 more open to submissions again soon.");
    expect(t).toContain("You've sent it to every agent on your list who takes thrillers and is open right now.");
    expect(t).toContain("Remind me about both");
    const card = slice(html, "card");
    expect(card).toContain('data-agent="soon"');
    expect(text(card.slice(0, card.indexOf('data-cl14="side"')))).toMatch(/Reopens 1 Nov.*Remind me/);
    const side = text(slice(html, "side"));
    expect(side).toContain("Also reopening");
    expect(side).toMatch(/Reopens in 39 days/);
  });
  it("gaps: title, copy, the first agent without genres as the card (Genres missing, Add genres), Also missing genres", () => {
    const agents = [ag("sent"), ag("bare1", { genres: [] }), ag("bare2", { genres: [] })];
    const { html } = render(agents, [q("sent", QueryStatus.QUERIED)]);
    const t = text(html);
    expect(html).toContain('data-state="gaps"');
    expect(t).toContain("A few more might fit");
    expect(t).toContain("You've sent Murphy's Day Out to every agent who takes thrillers. 2 agents on your list have no genres recorded, so we can't tell yet.");
    expect(t).toContain("Sent to all 1 agent on your list who takes thrillers.");
    expect(t).toContain("Open Housekeeping");
    const card = text(slice(html, "card").slice(0, slice(html, "card").indexOf('data-cl14="side"')));
    expect(card).toMatch(/Genres missing.*Add genres/);
    expect(text(slice(html, "side"))).toContain("Also missing genres");
  });
  it("done: title, copy with the three outcomes, the dashed Add an agent card", () => {
    const agents = [ag("r"), ag("m"), ag("p")];
    const { html } = render(agents, [q("r", QueryStatus.QUERIED), q("m", QueryStatus.FULL_REQUESTED), q("p", QueryStatus.REJECTED)]);
    const t = text(html);
    expect(html).toContain('data-state="done"');
    expect(t).toContain("Every agent queried");
    expect(t).toContain("Murphy's Day Out has gone to all 3 agents on your list who take thrillers.");
    expect(t).toContain("1 is still reading, 1 asked to see more and 1 passed.");
    expect(html).toContain('data-cl14="addcard"');
    const card = text(slice(html, "addcard"));
    expect(card).toContain("New agent");
    expect(card).toContain("Paste a link to their agency page and we'll fill in what we can, or add their details yourself.");
  });
});

describe("every Discover link follows DISCOVER_LIVE (ruling Q4), both branches", () => {
  const ca = (id: string): CommunityAgent => ({ id, name: `Disc ${id}`, agency: "Lumen", city: "London", genres: ["Thriller"], responseTimeWeeks: 5, submissionStatus: SubmissionStatus.OPEN }) as unknown as CommunityAgent;
  const doneAgents = [ag("r")], doneQ = [q("r", QueryStatus.QUERIED)];
  it("off: the done state offers Add an agent, says 'add agents you've found elsewhere.', and has no side list", () => {
    const { html } = render(doneAgents, doneQ, { discoverLive: false, discover: [ca("1"), ca("2")] });
    const t = text(html);
    expect(html).toContain('data-cl14="add-agent"');
    expect(html).not.toContain('data-cl14="discover-more"');
    expect(t).toContain("To keep it moving, add agents you've found elsewhere.");
    expect(t).not.toMatch(/Discover/);
    expect(html).not.toContain('data-cl14="nl"');
  });
  it("off: the reopening and gaps feet are hidden", () => {
    const reopen = render([ag("s"), ag("c", { submissionStatus: SubmissionStatus.CLOSED, reopensOn: "2026-12-01" })], [q("s", QueryStatus.QUERIED)], { discoverLive: false });
    const gaps = render([ag("s"), ag("b", { genres: [] })], [q("s", QueryStatus.QUERIED)], { discoverLive: false });
    for (const { html } of [reopen, gaps]) {
      expect(html).not.toContain('data-cl14="discover-foot"');
      expect(text(html)).not.toMatch(/Discover/);
    }
  });
  it("on: the prompt's version returns — Discover more agents, the browse note, In Discover with 'and N more'", () => {
    const { html } = render(doneAgents, doneQ, { discoverLive: true, discover: [ca("1"), ca("2"), ca("3"), ca("4")] });
    const t = text(html);
    expect(html).toContain('data-cl14="discover-more"');
    expect(t).toContain("To keep it moving, add agents you've found elsewhere, or browse Discover for agents who take thrillers.");
    expect(t).toContain("In Discover");
    expect((html.match(/data-cl14="discover-add"/g) ?? []).length).toBe(3);
    expect(t).toContain("and 1 more in Discover");
  });
  it("on: the reopening foot and the gaps foot return", () => {
    const reopen = render([ag("s"), ag("c", { submissionStatus: SubmissionStatus.CLOSED, reopensOn: "2026-12-01" })], [q("s", QueryStatus.QUERIED)], { discoverLive: true });
    const gaps = render([ag("s"), ag("b", { genres: [] })], [q("s", QueryStatus.QUERIED)], { discoverLive: true });
    expect(text(reopen.html)).toContain("Don't want to wait? Find more agents in Discover");
    expect(text(gaps.html)).toContain("Or find more agents in Discover");
  });
});
