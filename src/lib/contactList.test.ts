/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v11 — locks for the pure derivations (phase 1: the rail's height law).
 */
import { openKeyOf } from "./contactList";
import { joinGenres } from "./genreNoun";
import { bookGenres } from "./genreMatch";
import { describe, expect, it } from "vitest";
import {
  GROUP_OPTIONS, SORT_OPTIONS as SORT_OPTIONS_V12, RAIL_MAX, RAIL_MIN, RAIL_TOP_GAP, findDuplicateAgent,
  letterCounts, railHeight, surnameInitial, surnameOf,
} from "./contactList";

describe("railHeight — the rail derives its height from its own measured top", () => {
  it("at rest the rail runs from its top to 16px above the fold", () => {
    /* the mock at 1440×900, unscrolled: top 92 → 900 − 92 − 16 = 792 */
    expect(railHeight(92, 900)).toBe(792);
  });

  it("pinned, the cap binds — the mock's own render, not the brief's bracket", () => {
    /* scrolled: sticky pins at 16 → 900 − 16 − 16 = 868, capped at 860 (measured on the mock;
       the brief's "16 → 884" disagrees with its own clamp and the render wins) */
    expect(railHeight(16, 900)).toBe(RAIL_MAX);
  });

  it("a short window floors at 360 rather than collapsing", () => {
    expect(railHeight(92, 300)).toBe(RAIL_MIN);
  });

  it("a top above the gap is clamped to the gap before the subtraction", () => {
    /* top 4 reads as the pinned 16 — the rail can never claim room above its own gap */
    expect(railHeight(4, 900)).toBe(railHeight(RAIL_TOP_GAP, 900));
  });

  it("a reading that cannot be a layout is refused, never written", () => {
    /* the page before layout, or a container under a loading cover — the dashboard's −115
       clamp is the standing precedent for why a sentinel must not become a height */
    expect(railHeight(NaN, 900)).toBeNull();
    expect(railHeight(92, 0)).toBeNull();
    expect(railHeight(92, -1)).toBeNull();
  });
});

/* ══ phase 2 — standing, cards, facts and the hero's placement ══════════════════════════════ */
import { buildQcRows } from "./qcSummary";
import {
  agentRows, contactCensus, contactStanding, heroFacts,
  matchesCards, rowYourMove,
} from "./contactList";
import {
  CONTACT_FIXTURE_AGENTS, CONTACT_FIXTURE_MANUSCRIPTS, CONTACT_FIXTURE_QUERIES,
} from "../components/agents/contactFixture";

/* ⚠️ THE INPUTS ARE PRODUCED, NEVER TYPED — rows come from `buildQcRows` over the contact
   fixture, exactly as the page builds them, so a hand-written court cannot drift from the real
   derivation (the house rule: a test that hands a function an input its callers cannot produce
   is testing a function nobody runs). 1 Sep 2026 puts fq-2 (Full Sent, 2 May, 12-week window)
   PAST its expected date while fq-1 (Queried, 10 Aug, 6-week window) is still inside its own —
   both union branches exercised, and the tally below proves it. */
const NOW = Date.parse("2026-09-01T12:00:00.000Z");
/* fq-7's offer carries the deadline a real offer carries (the engine's own field) — without it
   the Answer-by branch is unreachable and the tally below says so */
const QUERIES = CONTACT_FIXTURE_QUERIES.map((q) =>
  q.id === "fq-7" ? ({ ...q, offerResponseDeadline: "2026-09-15T00:00:00.000Z" } as typeof q) : q);
const rows = buildQcRows(QUERIES, CONTACT_FIXTURE_AGENTS, [], NOW);
const MS = CONTACT_FIXTURE_MANUSCRIPTS[0];

describe("where you stand — the page-local union over the QC's own rows", () => {
  it("the union: with-you, offer, and agent-court-past-the-date; a waiting query is not yours", () => {
    const by = new Map(rows.map((r) => [r.id, r]));
    expect(rowYourMove(by.get("fq-4")!), "a partial request is the writer's move").toBe(true);
    expect(rowYourMove(by.get("fq-7")!), "an offer is the writer's decision").toBe(true);
    expect(by.get("fq-2")!.court, "precondition: Full Sent sits in the agent's court").toBe("agent");
    expect(by.get("fq-2")!.pastExpected, "precondition: fq-2 is past its window at NOW").toBe(true);
    expect(rowYourMove(by.get("fq-2")!), "past the expected date joins Your move (ruling a)").toBe(true);
    expect(by.get("fq-1")!.pastExpected, "precondition: fq-1 is still inside its window").toBe(false);
    expect(rowYourMove(by.get("fq-1")!), "a query inside its window stays the agent's").toBe(false);
  });

  it("standing: open beats closed, the latest close speaks, no rows means never", () => {
    expect(contactStanding(agentRows(rows, "fx-fresh", MS.id))).toEqual({ kind: "none" });
    expect(contactStanding(agentRows(rows, "fx-shut", MS.id))).toEqual({ kind: "closed", status: "Rejected" });
    /* fx-two holds a live Full Sent AND an old rejection — the live one wins the standing */
    expect(contactStanding(agentRows(rows, "fx-two", MS.id)).kind).toBe("open");
  });

  it("the census: counts sum to the list, the facts split their own populations", () => {
    const { cards, standing } = contactCensus(CONTACT_FIXTURE_AGENTS, rows, MS.id);
    const [active, never, closed] = cards;
    expect(active.count + never.count + closed.count, "the three cards partition the list").toBe(CONTACT_FIXTURE_AGENTS.length);
    expect(active.count, "open standings — incl. P6's live stub-0 row").toBe(6);
    expect(active.fact, "the new live query is fresh and agent-court, so not the writer's move").toBe("4 your move");
    expect(active.urgent).toBe(true);
    /* fresh + sparse, and P6's three housekeeping subjects (stub0, stale, reopen) — none queried */
    expect(never.count, "the five query-less rows").toBe(5);
    expect(never.fact, "reopen is the never-queried closed door").toBe("4 open now · 1 closed");
    expect(closed.count).toBe(1);
    expect(closed.fact).toBe("1 passed · 0 no reply");
    /* the selection is an OR; empty means everyone */
    const s = standing.get("fx-fresh")!;
    expect(matchesCards(new Set(), s)).toBe(true);
    expect(matchesCards(new Set(["never"]), s)).toBe(true);
    expect(matchesCards(new Set(["active", "closed"]), s)).toBe(false);
  });

  /* v14: the genre is the genre-noun join the strip says ("want thrillers or crime"), through the one helper */
  it("the facts sentence: totals, the genre as the lower-case plural, and the fresh tail", () => {
    const { standing } = contactCensus(CONTACT_FIXTURE_AGENTS, rows, MS.id);
    const f = heroFacts(CONTACT_FIXTURE_AGENTS, standing, MS);
    expect(f.total).toBe(CONTACT_FIXTURE_AGENTS.length);
    expect(f.msTitle).toBe(MS.title);
    expect(f.genre).toBe(joinGenres(bookGenres(MS)));
    expect(f.want, "genre matches over the whole list").toBeGreaterThan(0);
    expect(f.fresh, "the bold tail counts matches never queried").toBeLessThanOrEqual(f.want);
    /* no manuscript in scope → the sentence has no subject and no tail */
    const bare = heroFacts(CONTACT_FIXTURE_AGENTS, standing, null);
    expect(bare.msTitle).toBeNull();
    expect(bare.genre).toBeNull();
  });
});

/* ⚠️ RETIRED (page header v2 §4): "heroLayout — the mock's own chain, reproduced from the width".
   Its subject — the blank card's placement inside the Archivist's drawing — is deleted. */

/* ══ phase 3 — row facts, the date line, filters, groups and sorts ══════════════════════════ */
import {
  NOT_RECORDED, STAND_LABEL, STATUS_OPTIONS, agentFacts, compareDue, contactFilterCount,
  contactGroups, emptyContactFilters, facetOptions, matchesContactFilters, rowDateLine,
  sortFacts, standingQuery,
} from "./contactList";
import { QueryStatus } from "../types";

const facts = CONTACT_FIXTURE_AGENTS.map((a) => agentFacts(a, rows, MS.id));
const factOf = (id: string) => facts.find((x) => x.agent.id === id)!;

describe("the row's standing query and its date line", () => {
  it("the standing query: furthest live wins; a wholly-closed history speaks by its latest close", () => {
    expect(standingQuery(agentRows(rows, "fx-two", MS.id))!.id, "Full Sent outranks the old rejection").toBe("fq-2");
    expect(standingQuery(agentRows(rows, "fx-shut", MS.id))!.id).toBe("fq-5");
    expect(standingQuery(agentRows(rows, "fx-fresh", MS.id))).toBeNull();
  });

  it("the five shapes, each from a produced row — and the branch tally proves the spread", () => {
    const by = new Map(rows.map((r) => [r.id, r]));
    const lines = new Map([...by.entries()].map(([id, r]) => [id, rowDateLine(r, NOW)]));
    /* agent's court, past the date → the fact, in ink */
    expect(lines.get("fq-2")).toEqual({ text: expect.stringMatching(/^Expected \d+ \w+ · \d+d over$/), over: true });
    /* agent's court, inside the window → a reply coming */
    expect(lines.get("fq-1")).toEqual({ text: expect.stringMatching(/^Reply by \d+ \w+ · in \d+d$/), over: false });
    /* the writer's own send-by (partial requested carries the writer clock when one exists) —
       fq-4 has no writer date on this fixture, so its line is honestly ABSENT, not invented */
    expect(by.get("fq-4")!.court).toBe("you");
    expect(lines.get("fq-4"), "no date on the writer's side means no line, never a guess").toBeNull();
    /* closed without a request on record → plain Passed */
    expect(lines.get("fq-3")).toEqual({ text: expect.stringMatching(/^Passed · \d+ \w+$/), over: false });
    const tally = { over: 0, reply: 0, none: 0, closed: 0, offer: 0 };
    for (const l of lines.values()) {
      if (!l) tally.none += 1;
      else if (l.text.startsWith("Answer")) tally.offer += 1;
      else if (l.over) tally.over += 1;
      else if (l.text.startsWith("Reply")) tally.reply += 1;
      else tally.closed += 1;
    }
    for (const [k, n] of Object.entries(tally)) expect(n, `branch ${k} never ran on this fixture`).toBeGreaterThan(0);
  });

  it("a passed close names how far it got, from the log — produced, never typed", () => {
    const acts = [{ id: "a1", queryId: "fq-3", type: "STATUS_CHANGE", resultingStatus: "Partial Requested", date: "2026-03-10T00:00:00.000Z", description: "" }];
    const withReach = buildQcRows(QUERIES, CONTACT_FIXTURE_AGENTS, acts as never, NOW);
    const r = withReach.find((x) => x.id === "fq-3")!;
    expect(r.furthest).toBe("partial");
    expect(rowDateLine(r, NOW)!.text).toMatch(/^Passed on the partial · /);
  });
});

describe("the filter: OR within a section, AND across, counts faceted", () => {
  it("each section matches on its own fact, and Not recorded is a real option", () => {
    const f = emptyContactFilters();
    expect(matchesContactFilters(factOf("fx-fresh"), { ...f, stand: ["none"] })).toBe(true);
    expect(matchesContactFilters(factOf("fx-two"), { ...f, stand: ["you"] }), "past-the-date joins Your move (ruling a)").toBe(true);
    expect(matchesContactFilters(factOf("fx-long"), { ...f, stand: ["you"] })).toBe(false);
    expect(matchesContactFilters(factOf("fx-bare"), { ...f, status: ["Offer"] })).toBe(true);
    const noGenres = facts.find((x) => x.genres.length === 0)!;
    expect(matchesContactFilters(noGenres, { ...f, genres: [NOT_RECORDED] })).toBe(true);
    expect(contactFilterCount({ ...f, stand: ["you"], genres: ["Thriller", NOT_RECORDED] })).toBe(3);
  });

  it("faceted counts: every option counted under all the OTHER active narrowing (§11.4's law)", () => {
    const someGenre = facts.find((x) => x.genres.length > 0)!.genres[0];
    const f = { ...emptyContactFilters(), genres: [someGenre] };
    const opts = facetOptions(facts, f, () => true);
    /* v13: "Open to queries" (three-way, replacing the door's two) counts under the genre filter equal
       a direct count over the genre-filtered set */
    const pool = facts.filter((x) => matchesContactFilters(x, f, "open"));
    expect(opts.open.map((o) => o.value)).toEqual(["open", "closed", "unstated"]);
    for (const o of opts.open) {
      expect(o.n, `open ${o.value}`).toBe(pool.filter((x) => x.openKey === o.value).length);
    }
    /* the genre section counts under everything EXCEPT itself — here, no other filter, the list */
    const g = opts.genres.find((o) => o.value === someGenre)!;
    expect(g.n).toBe(facts.filter((x) => x.genres.includes(someGenre)).length);
    /* the seven status options are the brief's, verbatim — Full requested and R&R are absent */
    expect(opts.status.map((o) => o.value)).toEqual([...STATUS_OPTIONS]);
  });
});

describe("grouping partitions the ordered list; sorting orders within", () => {
  it("Where you stand: the four bands in order, the Your-move band carrying its right label", () => {
    const ordered = sortFacts(facts, "due", () => false, NOW);
    const g = contactGroups("stand", ordered);
    expect(g.map((x) => x.label)).toEqual(
      (Object.values(STAND_LABEL)).filter((l) => g.some((y) => y.label === l)));
    expect(g[0].label).toBe("Your move");
    expect(g[0].extra).toBe("Offers, requests and nudges");
    expect(g.reduce((n, x) => n + x.ids.length, 0), "a partition loses nobody").toBe(facts.length);
  });

  it("agency ignores a leading The; a live R&R gets the slot the journey gives it", () => {
    const byAgency = contactGroups("agency", sortFacts(facts, "agency", () => false, NOW));
    const labels = byAgency.map((x) => x.label);
    const lantern = labels.indexOf("The Lantern Agency");
    /* "The Lantern Agency" files under L: after Halcyon, before Rookery */
    expect(lantern).toBeGreaterThan(labels.indexOf("Halcyon Literary"));
    expect(lantern).toBeLessThan(labels.indexOf("Rookery & Vale"));
    const rr = [{ ...QUERIES[0], id: "fq-rr", agentId: "fx-fresh", status: QueryStatus.REVISE_RESUBMIT }];
    const rrRows = buildQcRows([...QUERIES, ...rr], CONTACT_FIXTURE_AGENTS, [], NOW);
    const rrFacts = CONTACT_FIXTURE_AGENTS.map((a) => agentFacts(a, rrRows, MS.id));
    const byStatus = contactGroups("status", sortFacts(rrFacts, "due", () => false, NOW));
    const sLabels = byStatus.map((x) => x.label);
    expect(sLabels).toContain("Revise & resubmit");
    expect(sLabels.indexOf("Revise & resubmit"), "between Offer's slot and Full sent's").toBeLessThan(sLabels.indexOf("Full sent"));
  });

  it("Next action due: past first, then soonest; the dateless after, open before closed", () => {
    const ordered = sortFacts(facts, "due", () => false, NOW);
    const dated = ordered.filter((x) => x.q && x.q.court !== "closed" && x.q.expectedMs != null);
    for (let i = 1; i < dated.length; i += 1) {
      expect(dated[i - 1].q!.expectedMs!).toBeLessThanOrEqual(dated[i].q!.expectedMs!);
    }
    const firstDateless = ordered.findIndex((x) => !(x.q && x.q.court !== "closed" && x.q.expectedMs != null));
    expect(firstDateless, "every dated row precedes every dateless one").toBe(dated.length);
    const tail = ordered.slice(firstDateless);
    const firstClosed = tail.findIndex((x) => x.standing.kind === "closed");
    if (firstClosed >= 0) for (const x of tail.slice(firstClosed)) expect(x.standing.kind).toBe("closed");
    void compareDue;
  });

  /* v13: "not stated" is the stub 0 as well as an absent value (the quick-add 0 is not "replies at once") */
  const stated = (x: { agent: { responseTimeWeeks?: number } }) => typeof x.agent.responseTimeWeeks === "number" && x.agent.responseTimeWeeks > 0;
  it("Replies fastest and Rating put absence last — the stub 0 counts as absent", () => {
    const byReply = sortFacts(facts, "reply", () => false, NOW);
    expect(facts.some((x) => x.agent.responseTimeWeeks === 0), "population: a stub 0 exists").toBe(true);
    const noWindow = byReply.findIndex((x) => !stated(x));
    expect(noWindow, "population: an unstated window exists").toBeGreaterThan(0);
    for (const x of byReply.slice(noWindow)) expect(stated(x)).toBe(false);
    const byRating = sortFacts(facts, "rating", () => false, NOW);
    const unrated = byRating.findIndex((x) => x.rating == null);
    if (unrated >= 0) for (const x of byRating.slice(unrated)) expect(x.rating == null).toBe(true);
  });
});

describe("the add card's duplicate check (§8.2)", () => {
  const A = CONTACT_FIXTURE_AGENTS;
  it("matches a NAME case-insensitively and trimmed, and empty matches nobody", () => {
    const someone = A.find((a) => (a.name ?? "").trim().length > 0)!;
    expect(findDuplicateAgent(`  ${someone.name.toUpperCase()}  `, A)?.id).toBe(someone.id);
    expect(findDuplicateAgent("", A)).toBeNull();
    expect(findDuplicateAgent("   ", A)).toBeNull();
  });
  it("does NOT match on agency — proposed in the report, deliberately unbuilt", () => {
    const agencyOnly = A.find((a) => (a.agency ?? "").trim().length > 0)!;
    expect(findDuplicateAgent(agencyOnly.agency, A.filter((x) => (x.name ?? "").trim().toLowerCase() !== agencyOnly.agency.trim().toLowerCase()))).toBeNull();
  });
});

describe("v12 · the surname, its initial, and the letter grouping", () => {
  const A = CONTACT_FIXTURE_AGENTS;
  it("the mock's rule: last word, O' folds to O (O'Brien files under O, never B), Mc stays Mc", () => {
    expect(surnameOf({ name: "Niamh O'Brien", agency: "" })).toBe("OBrien");
    expect(surnameInitial({ name: "Niamh O'Brien", agency: "" })).toBe("O");
    expect(surnameInitial({ name: "Rory McAllister", agency: "" })).toBe("M");
    /* agency stands in when the name is the agency (fx-bare's shape) */
    expect(surnameInitial({ name: "", agency: "Penhallow Literary" })).toBe("L");
    /* diacritics fold to the base letter */
    expect(surnameInitial({ name: "Luc Édouard", agency: "" })).toBe("E");
  });

  it("the letter grouping partitions the ordered list, labels A→Z, and the strip's counts are the groups' sizes", () => {
    const ordered = sortFacts(facts, "surname", () => false, NOW);
    const groups = contactGroups("letter", ordered);
    expect(groups.reduce((n, g) => n + g.ids.length, 0), "a partition").toBe(ordered.length);
    const labels = groups.map((g) => g.label);
    expect([...labels].sort((a, b) => a.localeCompare(b)), "dividers run A to Z").toEqual(labels);
    /* two derivations against each other — the strip can never disagree with the dividers */
    const counts = letterCounts(ordered);
    for (const g of groups) expect(counts.get(g.label), `the strip's ${g.label}`).toBe(g.ids.length);
    expect(counts.size).toBe(groups.length);
  });

  it("the default sort is the surname's own order, the oracle's localeCompare", () => {
    const ordered = sortFacts(facts, "surname", () => false, NOW);
    const expected = [...facts].sort((a, b) =>
      surnameOf(a.agent).localeCompare(surnameOf(b.agent))
      || (a.agent.name.trim() || a.agent.agency).toLowerCase().localeCompare((b.agent.name.trim() || b.agent.agency).toLowerCase()));
    expect(ordered.map((x) => x.agent.id)).toEqual(expected.map((x) => x.agent.id));
    expect(A.length, "population").toBeGreaterThan(10);
  });

  it("the tables carry v12's defaults: Letter leads the groupings, Surname leads the sorts", () => {
    /* v13 §5: the mock's labels, each sort with its italic line and its direction's two words */
    expect(GROUP_OPTIONS[0]).toEqual({ key: "letter", label: "Letter", line: "Surname initial, with the A\u2013Z strip" });
    expect(GROUP_OPTIONS.map((g) => g.label)).toEqual(["Letter", "Where you stand", "Agency", "Location", "Open to queries", "Fit for your book", "Query status", "No grouping"]);
    expect(SORT_OPTIONS_V12[0]).toEqual({ key: "surname", label: "Surname", line: "A to Z by family name", dir: ["A to Z", "Z to A"] });
    expect(SORT_OPTIONS_V12.map((o) => o.label)).toEqual(["Surname", "First name", "Agency", "Replies fastest", "Next date", "Your rating", "Latest activity"]);
    expect(SORT_OPTIONS_V12.find((o) => o.key === "reply")!.dir).toEqual(["Fastest first", "Slowest first"]);
    expect(SORT_OPTIONS_V12.find((o) => o.key === "due")!.dir).toEqual(["Soonest first", "Latest first"]);
  });
});


describe("v13 §5 — the new sections, the direction, and Open to queries", () => {
  const stated = (x: { agent: { responseTimeWeeks?: number } }) => typeof x.agent.responseTimeWeeks === "number" && x.agent.responseTimeWeeks > 0;
  const ctx = { fits: (x: { genres: string[] }) => x.genres.includes("Thriller"), gaps: (x: { agent: { mswlNotes?: string } }) => !(x.agent.mswlNotes ?? "").trim() };
  it("openKey is the record's own word: Open, Closed, or Not stated", () => {
    expect(openKeyOf({ submissionStatus: "Open" } as never)).toBe("open");
    expect(openKeyOf({ submissionStatus: "Closed" } as never)).toBe("closed");
    expect(openKeyOf({ submissionStatus: "Unknown" } as never)).toBe("unstated");
    expect(openKeyOf({} as never)).toBe("unstated");
    expect(new Set(facts.map((x) => x.openKey)).size, "population: the cast has more than one door").toBeGreaterThan(1);
  });
  it("Offer is its own option in Where you stand; Your move still counts it (the v12 union)", () => {
    const f = emptyContactFilters();
    const offers = facts.filter((x) => x.q?.court === "offer");
    expect(offers.length, "population: an offer exists").toBeGreaterThan(0);
    for (const x of offers) expect(matchesContactFilters(x, { ...f, stand: ["offer"] })).toBe(true);
    expect(facts.filter((x) => matchesContactFilters(x, { ...f, stand: ["offer"] })).length).toBe(offers.length);
  });
  it("Fit and Profile read the context; OR within a section, AND across", () => {
    const f = emptyContactFilters();
    const takes = facts.filter((x) => matchesContactFilters(x, { ...f, fit: ["takes"] }, undefined, ctx as never));
    const doesnt = facts.filter((x) => matchesContactFilters(x, { ...f, fit: ["doesnt"] }, undefined, ctx as never));
    expect(takes.length + doesnt.length).toBe(facts.length);
    expect(facts.filter((x) => matchesContactFilters(x, { ...f, fit: ["takes", "doesnt"] }, undefined, ctx as never)).length).toBe(facts.length);
    const both = facts.filter((x) => matchesContactFilters(x, { ...f, fit: ["takes"], profile: ["gaps"] }, undefined, ctx as never));
    expect(both.every((x) => ctx.fits(x) && ctx.gaps(x as never))).toBe(true);
    expect(contactFilterCount({ ...f, fit: ["takes"], profile: ["gaps"], open: ["unstated"] })).toBe(3);
  });
  it("reversed reverses — but the missing stay last", () => {
    const fwd = sortFacts(facts, "reply", () => false, NOW);
    const rev = sortFacts(facts, "reply", () => false, NOW, true);
    const has = (xs: typeof fwd) => xs.filter((x) => stated(x)).map((x) => x.agent.id);
    expect(has(rev)).toEqual([...has(fwd)].reverse());
    const firstMissing = rev.findIndex((x) => !stated(x));
    for (const x of rev.slice(firstMissing)) expect(stated(x)).toBe(false);
    /* names are never missing: A to Z simply turns round */
    expect(sortFacts(facts, "name", () => false, NOW, true).map((x) => x.agent.id)).toEqual(sortFacts(facts, "name", () => false, NOW).map((x) => x.agent.id).reverse());
  });
  it("grouping by Open to queries is three-way; by Fit, two named groups", () => {
    const byOpen = contactGroups("door", facts).map((g) => g.label);
    expect(byOpen.every((l) => ["Open now", "Closed to queries", "Not stated"].includes(l))).toBe(true);
    const byFit = contactGroups("fit", facts, { fits: ctx.fits, genreWord: "thrillers" }).map((g) => g.label);
    expect(byFit).toEqual(["Takes thrillers", "Doesn\u2019t list thrillers"]);
  });
});
