/**
 * IT1 · A2 — an agent whose status is Unknown reads "Not known", is never counted as open, and
 * never reads "Open"; an agent with no rating never reads as a 3.
 *
 * Red on the baseline: `isDoorOpen` was `status !== Closed`, so an Unknown agent's row and card
 * read "Open to queries", the open filter and count held it, it was offered as ready to query,
 * and the editor opened it with Open already chosen.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Agent, SubmissionMethod, SubmissionStatus } from "../types";
import { importedAgentDoc } from "./importedAgent";
import { doorOf, isDoorOpen } from "./agentList";
import { agentFacts, facetCounts, emptyContactFilters, matchesContactFilters, actionOf, contactCensus, sortFacts } from "./contactList";
import { nextStep, isReady, readyOrder } from "./contactNextStep";
import { agentGaps } from "./contactHousekeeping";
import { draftOf, cardPatch } from "./cardDraft";
import { ContactRows } from "../components/agents/contact/ContactRows";
import { AgentCarouselCard } from "../components/agents/card/AgentCarouselCard";
import { QueryAgentTab } from "../components/queries/QueryAgentTab";

const src = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

/** As the import writes it: the builder's own output, so the test cannot drift from the writer. */
const imported = (id: string, name: string, over: Partial<Agent> = {}): Agent => ({
  ...importedAgentDoc({ name, agency: "Pemberton Literary", genres: ["Thriller"] }),
  id, userId: "u1", dateAdded: "2026-01-01T00:00:00.000Z", lastCheckedDate: "2026-01-01T00:00:00.000Z", ...over,
} as Agent);
const unknown = imported("a-unknown", "Clara Voss");
const open = imported("a-open", "Owen Hale", { submissionStatus: SubmissionStatus.OPEN, starRating: 4 });
const shut = imported("a-shut", "Tomas Vidal", { submissionStatus: SubmissionStatus.CLOSED, starRating: 2 });
const all = [unknown, open, shut];
const facts = all.map((a) => agentFacts(a, [], null));
const fUnknown = facts[0];

describe("A2 · the precondition: the agent is what an import writes", () => {
  it("status Unknown, no rating", () => {
    expect(unknown.submissionStatus).toBe(SubmissionStatus.UNKNOWN);
    expect("starRating" in unknown).toBe(false);
    expect(unknown.submissionMethod).toBe(SubmissionMethod.EMAIL);
  });
});

describe("A2 · what it reads", () => {
  const row = renderToStaticMarkup(React.createElement(ContactRows, {
    groups: [{ label: "V", ids: [unknown.id] }] as never, byId: new Map([[unknown.id, fUnknown]]), nowMs: 0, genreHit: () => false,
    openId: null, onOpen: () => {}, onAddGenres: () => {}, onAddWishlist: () => {}, onAct: () => {},
    trayFor: () => ({ label: "Log a query", act: "log" as const }),
  }));
  const card = renderToStaticMarkup(
    <AgentCarouselCard agent={unknown} facts={fUnknown} q={null} genreHit={() => false} fitWord="" fits={false} onOpen={() => {}} onAdd={() => {}} onAct={() => {}} />,
  );
  const text = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

  it("the Contact list row reads Not known, and neither Open nor Closed", () => {
    expect(row).toMatch(/data-clv="door-unknown"[^>]*>Not known</);
    expect(text(row)).not.toMatch(/Open to queries|Closed to queries|Closed till/);
    expect(row).toContain('data-door="unknown"');
  });
  it("the row is not drawn as a closed agent", () => {
    const closedRow = renderToStaticMarkup(React.createElement(ContactRows, {
      groups: [{ label: "V", ids: [shut.id] }] as never, byId: new Map([[shut.id, facts[2]]]), nowMs: 0, genreHit: () => false,
      openId: null, onOpen: () => {}, onAddGenres: () => {}, onAddWishlist: () => {}, onAct: () => {}, trayFor: () => ({ label: "Remind me when they reopen", act: "remind" as const }),
    } as never));
    expect(closedRow, "a closed agent carries the mark").toContain("data-shut");
    expect(row).not.toContain("data-shut");
  });
  it("the card's foot reads Not known, and the card never reads Open", () => {
    expect(text(card)).toContain("Not known");
    expect(text(card)).not.toMatch(/\bOpen\b/);
  });
  it("no rating reads as no rating: the card says Not rated and shows no filled star", () => {
    expect(card).toContain('aria-label="Not rated"');
    expect(card).not.toMatch(/Rated \d of 5/);
    expect(fUnknown.rating).toBeNull();
    const rated = renderToStaticMarkup(
      <AgentCarouselCard agent={open} facts={facts[1]} q={null} genreHit={() => false} fitWord="" fits={false} onOpen={() => {}} onAdd={() => {}} onAct={() => {}} />,
    );
    expect(rated, "a rated agent states its rating").toContain('aria-label="Rated 4 of 5"');
  });
  it("the Query Centre's agent tab reads Not known", () => {
    const tab = text(renderToStaticMarkup(<QueryAgentTab agent={unknown} history={[]} />));
    expect(tab).toContain("Not known");
    expect(tab).not.toMatch(/Open to submissions|Closed for submissions/);
    expect(src("src/components/queries/QueryLogSheet.tsx")).toMatch(/"Closed for submissions" : "Not known"/);
  });
});

describe("A2 · it is counted with neither Open nor Closed", () => {
  const f0 = emptyContactFilters();
  it("the door is not known, and not open", () => {
    expect(doorOf(unknown)).toBe("unknown");
    expect(isDoorOpen(unknown)).toBe(false);
    expect(fUnknown.door).toBe("unknown");
  });
  it("the Contact list's open filter and its counts", () => {
    const c = facetCounts(facts, f0, () => true).open;
    expect(c).toEqual({ open: 1, closed: 1, unknown: 1 });
    expect(matchesContactFilters(fUnknown, { ...f0, open: "open" })).toBe(false);
    expect(matchesContactFilters(fUnknown, { ...f0, open: "closed" })).toBe(false);
    expect(matchesContactFilters(fUnknown, { ...f0, open: "unknown" })).toBe(true);
  });
  it("the census's never-queried card: 1 open now, 1 closed", () => {
    const never = contactCensus(all, [], null).cards.find((c) => c.key === "never")!;
    expect(never.fact).toBe("1 open now · 1 closed");
  });
  it("it is not ready to query, and the next step counts it on its own", () => {
    expect(isReady(unknown, () => false, ["Thriller"])).toBe(false);
    expect(isReady(open, () => false, ["Thriller"])).toBe(true);
    const step = nextStep({ agents: all, queries: [], msId: null, book: ["Thriller"], todayIso: "2026-10-11" } as never);
    expect(step.ready.map((a) => a.id)).toEqual([open.id]);
    expect(step.doorUnknown).toBe(1);
    expect(step.closed).toBe(1);
    const lone = nextStep({ agents: [unknown], queries: [], msId: null, book: ["Thriller"], todayIso: "2026-10-11" } as never);
    expect(lone.state).toBe("done");
    expect(lone.queried + lone.mismatches + lone.closed + lone.doorUnknown, "every agent is accounted for").toBe(lone.total);
  });
  it("grouped by action it is neither ready nor closed", () => {
    expect(actionOf(fUnknown, () => true)).toBe("nothing");
    expect(actionOf(facts[1], () => true)).toBe("ready");
    expect(actionOf(facts[2], () => true)).toBe("shut");
  });
  it("Housekeeping asks for no reopening date", () => {
    expect(agentGaps(unknown, { hasReopenTask: false }, [])).not.toContain("reopen");
    expect(agentGaps(shut, { hasReopenTask: false }, [])).toContain("reopen");
  });
  it("the dream-agent suggestion needs a stated Open", () => {
    expect(src("src/lib/db.tsx")).toMatch(/a\.starRating === 5 && a\.submissionStatus === SubmissionStatus\.OPEN/);
  });
});

describe("A2 · sorts place it after the rated and the stated", () => {
  it("ready order: an unrated agent follows a rated one", () => {
    const unratedOpen = imported("a-unrated", "Zed Adams", { submissionStatus: SubmissionStatus.OPEN });
    const ordered = [unratedOpen, open].sort(readyOrder(["Thriller"]));
    expect(ordered.map((a) => a.id)).toEqual([open.id, unratedOpen.id]);
  });
  it("response time: no window sorts last in both directions", () => {
    const withWeeks = agentFacts(imported("a-w", "Ann Bell", { responseTimeWeeks: 4 }), [], null);
    expect(sortFacts([fUnknown, withWeeks], "reply").map((x) => x.agent.id)).toEqual(["a-w", unknown.id]);
    expect(sortFacts([fUnknown, withWeeks], "reply", true).map((x) => x.agent.id)).toEqual(["a-w", unknown.id]);
  });
});

describe("A2 · the editor still writes only Open or Closed", () => {
  it("an Unknown agent opens with neither chosen, and saving something else leaves the status alone", () => {
    const base = draftOf(unknown);
    expect(base.door).toBeNull();
    const patch = cardPatch(unknown, base, { ...base, city: "Leeds" }, "2026-10-11T00:00:00.000Z");
    expect("submissionStatus" in patch).toBe(false);
  });
  it("choosing Open writes Open; choosing Closed writes Closed", () => {
    const base = draftOf(unknown);
    expect(cardPatch(unknown, base, { ...base, door: "open" }, "2026-10-11T00:00:00.000Z").submissionStatus).toBe(SubmissionStatus.OPEN);
    expect(cardPatch(unknown, base, { ...base, door: "closed" }, "2026-10-11T00:00:00.000Z").submissionStatus).toBe(SubmissionStatus.CLOSED);
  });
  /* re-pointed (Contact list v25.2 C2): the edit mode draws "Not known" beside Open and Closed, as the pack asks — but
     only as the state an unknown agent is IN: it is disabled whenever a door is known, so the editor still WRITES only
     Open or Closed (the patch half is asserted above). */
  it("the edit mode's door control writes Open and Closed, and its Not known is never a choice once a door is known", () => {
    const em = src("src/components/agents/card/AgentEditMode.tsx");
    expect(em).toMatch(/\[\["open", "Open"\], \["closed", "Closed"\]\] as const/);
    expect(em).toMatch(/data-v="unknown" disabled=\{d\.door != null\}/);
  });
});
