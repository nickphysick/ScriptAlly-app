/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v15 §4 — the next-step section's THREE states, each from a fixture through the real `nextStep`
 * derivation, render their title, copy, middle and side; LOCK 7: v14's fourth state (the agents with no genres)
 * renders by no path; and every Discover link follows `DISCOVER_LIVE`, both branches held (v14 ruling Q4).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
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
    step, hasBook: true, bookTitle: "Murphy's Day Out", genres: "thrillers",
    factsById: new Map(agents.map((a) => [a.id, agentFacts(a, [], null)])), qFor: () => null, genreHit: (g) => /thriller/i.test(g), todayIso: TODAY,
    reminded: () => false, discoverLive: false, discover: [], notifyDiscover: false, onNotifyDiscover: noop,
    onOpen: noop, onAct: noop, onAdd: noop, onSeeAll: noop, onNewAgent: noop, onDiscover: noop,
    onRemind: noop, onRemindAll: noop, onAddDiscover: noop, ...over,
  };
  return { step, html: renderToStaticMarkup(<ContactNextStep {...props} />) };
};
/** the markup's text, tags stripped and entities decoded — what a reader sees */
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;|&rsquo;|’/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ")
  /* a tag boundary is not a space a reader sees before punctuation ("<i>Book</i>." reads "Book.") */
  .replace(/\s+([.,])/g, "$1").trim();
/** from a part of the stage (`data-fs-part`) or a contact probe (`data-cl14`) to the end of the markup */
const slice = (html: string, cls: string) => {
  const i = Math.max(html.indexOf(`data-fs-part="${cls}"`), html.indexOf(`data-cl14="${cls}"`));
  expect(i, `the ${cls} part`).toBeGreaterThan(-1);
  return html.slice(i);
};

describe("the three states (v15 §4)", () => {
  it("ready: title, the v15 sentence, the agent card as First up, Next in line 'best fit first'", () => {
    const agents = ["a", "b", "c", "d", "e"].map((id, i) => ag(id, { starRating: (5 - i) as 1 | 2 | 3 | 4 | 5 }));
    const { html } = render(agents, []);
    const t = text(html);
    expect(html).toContain('data-state="ready"');
    expect(t).toContain("Ready to query");
    expect(t).toContain("5 agents are open and haven't seen Murphy's Day Out yet.");
    expect(t).not.toContain("no genres recorded");
    expect(t).toContain("See all 5 in the list");
    /* §5: "who take {genres}" appears nowhere but the mismatch note; no progress bar, no ordering note */
    expect(t).not.toMatch(/who takes?|take thrillers/);
    expect(html).not.toContain('data-cl14="prog"');
    expect(t).not.toContain("highest-rated");
    const card = slice(html, "card");
    expect(card).toContain('data-cl13="ccard"');
    expect(card).toContain('data-agent="a"');
    expect(text(card.slice(0, card.indexOf('data-fs-part="panel"')))).toContain("First up");
    const side = text(slice(html, "panel"));
    expect(side).toContain("Next in line");
    expect(side).toContain("best fit first");
  });
  it("ready, the list (§4a): the first five rows with the first picked, 'Genres not recorded' for an agent with none, 'and N more'", () => {
    const agents = [
      ...["a", "b", "c", "d"].map((id, i) => ag(id, { starRating: (5 - i) as 1 | 2 | 3 | 4 | 5, responseTimeWeeks: 6 })),
      ag("bare1", { genres: [] }), ag("bare2", { genres: [] }), ag("bare3", { genres: [] }),
    ];
    const { html, step } = render(agents, []);
    expect(step.ready).toHaveLength(7);
    const rows = [...html.matchAll(/data-fs-row="([^"]+)"/g)].map((m) => m[1]);
    expect(rows).toEqual(["a", "b", "c", "d", "bare1"]);
    /* exactly one row is the picked one, and it is the first: the card shows that agent as First up */
    expect([...html.matchAll(/class="fs-row is-on[^"]*" data-fs-row="([^"]+)"/g)].map((m) => m[1])).toEqual(["a"]);
    expect(html).toMatch(/data-fs-part="card" data-card-key="a"/);
    const panel = text(slice(html, "panel"));
    expect(panel).toContain("Agent A A Agency ~6 wks");
    expect(panel).toContain("Agent BARE1 Genres not recorded");
    expect(panel).toContain("and 2 more");
    /* the rows pick; they carry no action of their own (the card has the Log a query button) */
    expect(html).not.toContain('data-cl14="nl-log"');
  });
  it("ready with unknown genres: the sentence adds how many, and they come after the fits", () => {
    const { html, step } = render([ag("bare1", { genres: [] }), ag("fit"), ag("bare2", { genres: [] })], []);
    const t = text(html);
    expect(step.ready.map((a) => a.id)).toEqual(["fit", "bare1", "bare2"]);
    expect(t).toContain("3 agents are open and haven't seen Murphy's Day Out yet. 2 have no genres recorded.");
    expect(slice(html, "card")).toContain('data-agent="fit"');
  });
  it("ready, one agent, genres unknown: singular throughout, and the card offers v14's add-genres slip", () => {
    const { html } = render([ag("bare", { genres: [] })], []);
    const t = text(html);
    expect(t).toContain("1 agent is open and hasn't seen Murphy's Day Out yet. 1 has no genres recorded.");
    expect(t).toContain("See all 1 in the list");
    /* the card's own torn slip: "Not recorded", with its add door */
    expect(slice(html, "card")).toContain("torn-genres");
  });
  it("Ready never shows when no agent is ready (the not-queried condition holds)", () => {
    const { html, step } = render([ag("a"), ag("b")], [q("a", QueryStatus.QUERIED), q("b", QueryStatus.QUERIED)]);
    expect(step.state).not.toBe("ready");
    expect(text(html)).not.toContain("Ready to query");
  });
  it("reopening: title, the v15 sentence, the soonest as the card (Reopens …, Remind me), Also reopening rows", () => {
    const agents = [
      ag("sent"),
      ag("soon", { submissionStatus: SubmissionStatus.CLOSED, reopensOn: "2026-11-01" }),
      ag("late", { submissionStatus: SubmissionStatus.CLOSED, reopensOn: "2026-11-15" }),
    ];
    const { html } = render(agents, [q("sent", QueryStatus.QUERIED)]);
    const t = text(html);
    expect(html).toContain('data-state="reopening"');
    expect(t).toContain("Reopening soon");
    expect(t).toContain("Everyone open on your list has seen Murphy's Day Out. 2 more open to submissions again soon.");
    expect(t).toContain("Remind me about both");
    const card = slice(html, "card");
    expect(card).toContain('data-agent="soon"');
    expect(text(card.slice(0, card.indexOf('data-fs-part="panel"')))).toMatch(/Reopens 1 Nov.*Remind me/);
    const side = text(slice(html, "panel"));
    expect(side).toContain("Also reopening");
    expect(side).toMatch(/Reopens in 39 days/);
  });
  it("all queried, everyone queried: 'all N agents', the split line, no note, no button", () => {
    const agents = [ag("r"), ag("m"), ag("p")];
    const { html } = render(agents, [q("r", QueryStatus.QUERIED), q("m", QueryStatus.FULL_REQUESTED), q("p", QueryStatus.REJECTED)]);
    const t = text(html);
    expect(html).toContain('data-state="done"');
    expect(t).toContain("You've queried all your agents");
    expect(t).toContain("Murphy's Day Out has gone to all 3 agents on your list.");
    expect(t).toContain("1 reading · 1 asked for more · 1 passed");
    expect(t).not.toContain("withdrawn");
    expect(html).not.toContain('data-cl15="note"');
    expect(html).not.toMatch(/data-cl14="(see-all|add-agent|discover-more|prog)"/);
    expect(html).toContain('data-cl14="addcard"');
  });
  it("all queried with known mismatches, a closed agent and a withdrawn query: 'q of your N', the fourth part, both notes", () => {
    const agents = [
      ag("r"), ag("w"),
      ag("x1", { genres: ["romance"] }), ag("x2", { genres: ["horror"] }), ag("x3", { genres: ["romance"] }),
      ag("c", { submissionStatus: SubmissionStatus.CLOSED }),
    ];
    const { html, step } = render(agents, [q("r", QueryStatus.QUERIED), q("w", QueryStatus.WITHDRAWN)]);
    const t = text(html);
    expect(step.queried + step.mismatches + step.closed).toBe(step.total);
    expect(t).toContain("Murphy's Day Out has gone to 2 of your 6 agents.");
    expect(t).toContain("1 reading · 0 asked for more · 0 passed · 1 withdrawn");
    expect(html).toContain('data-cl15="note"');
    expect(t).toContain("The other 3 don't take thrillers. 1 is closed to submissions.");
  });
  it("no manuscript in scope: the section says what would help, and names no book", () => {
    const { html } = render([ag("a")], [], { hasBook: false, bookTitle: null, genres: "" });
    expect(html).toContain('data-state="nobook"');
    expect(text(html)).toContain("Choose a manuscript");
  });
  it("a book with no genre mismatches nobody: the one rule still runs", () => {
    const step = nextStep({ agents: [ag("a", { genres: ["romance"] })], queries: [], msId: "ms1", book: [], todayIso: TODAY });
    expect(step.state).toBe("ready");
  });
});

describe("LOCK 7 — the gaps state is gone: no code path renders it", () => {
  const src = readFileSync(new URL("./ContactNextStep.tsx", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const lib = readFileSync(new URL("../../../lib/contactNextStep.ts", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  it("the fixture that drew it (everyone who fits is queried; two agents have no genres) is Ready now", () => {
    const { html, step } = render([ag("sent"), ag("bare1", { genres: [] }), ag("bare2", { genres: [] })], [q("sent", QueryStatus.QUERIED)]);
    expect(step.state).toBe("ready");
    expect(html).toContain('data-state="ready"');
    const t = text(html);
    for (const gone of ["A few more might fit", "Genres missing", "Also missing genres", "Open Housekeeping", "so we can't tell yet"]) expect(t, gone).not.toContain(gone);
  });
  it("neither the lib nor the component names the state", () => {
    expect(lib).not.toMatch(/["'`]gaps["'`]/);
    expect(src).not.toMatch(/["'`]gaps["'`]/);
    expect(src).not.toMatch(/A few more might fit|Genres missing|Also missing genres/);
    expect(lib).toMatch(/export type NextState = "ready" \| "reopening" \| "done";/);
  });
});

describe("every Discover link follows DISCOVER_LIVE (v14 ruling Q4), both branches", () => {
  const ca = (id: string): CommunityAgent => ({ id, name: `Disc ${id}`, agency: "Lumen", city: "London", genres: ["Thriller"], responseTimeWeeks: 5, submissionStatus: SubmissionStatus.OPEN }) as unknown as CommunityAgent;
  const doneAgents = [ag("r")], doneQ = [q("r", QueryStatus.QUERIED)];
  const reopenFx = () => [[ag("s"), ag("c", { submissionStatus: SubmissionStatus.CLOSED, reopensOn: "2026-12-01" })], [q("s", QueryStatus.QUERIED)]] as const;
  it("off: the all-queried panel is the coming-soon panel — heading, pill, sentence, two nameless rows, the request button", () => {
    const done = render(doneAgents, doneQ, { discoverLive: false, discover: [ca("1"), ca("2")] });
    expect(done.html).not.toContain('data-cl14="discover-add"');
    expect(done.html).toContain('data-cl15="discover-soon"');
    const panel = slice(done.html, "panel");
    const t = text(panel);
    expect(t).toContain("Discover agents Coming soon");
    expect(t).toContain("Find agents by genre, see who's open, and add them to your list in one click.");
    expect(t).toContain("Tell me when it's ready");
    /* two placeholder rows, hidden from assistive tech, and no name in them: not a Discover agent's, not an invented one */
    const list = panel.slice(panel.indexOf('class="cl15-dt-l"'), panel.indexOf("</ol>"));
    expect(list).toContain('aria-hidden="true"');
    expect((list.match(/<li>/g) ?? []).length).toBe(2);
    expect(text(list).replace(/\+ Add/g, "").replace(/class="[^"]*"|aria-hidden="true">?/g, "").trim()).toBe("");
    expect(done.html).not.toContain("Disc 1");
  });
  it("off: the request button reads as set once asked for", () => {
    const { html } = render(doneAgents, doneQ, { notifyDiscover: true });
    expect(text(html)).toContain("✓ We'll let you know");
    expect(html).toMatch(/data-cl15="discover-notify" aria-pressed="true"/);
    expect(text(html)).not.toContain("Tell me when it's ready");
  });
  it("off: the reopening foot is hidden", () => {
    const [a, qs] = reopenFx();
    const reopen = render([...a], [...qs], { discoverLive: false });
    expect(reopen.html).not.toContain('data-cl14="discover-foot"');
    expect(text(reopen.html)).not.toMatch(/Discover/);
  });
  it("on: In Discover replaces the panel, with 'and N more'; the reopening foot returns", () => {
    const { html } = render(doneAgents, doneQ, { discoverLive: true, discover: [ca("1"), ca("2"), ca("3"), ca("4")] });
    const t = text(html);
    expect(html).not.toContain('data-cl15="discover-soon"');
    expect(t).toContain("In Discover");
    expect((html.match(/data-cl14="discover-add"/g) ?? []).length).toBe(3);
    expect(t).toContain("and 1 more in Discover");
    const [a, qs] = reopenFx();
    expect(text(render([...a], [...qs], { discoverLive: true }).html)).toContain("Don't want to wait? Find more agents in Discover");
  });
});
