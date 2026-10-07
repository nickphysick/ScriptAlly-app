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
  ACTION_GROUPS, type ContactFilters, NOT_RECORDED, STATUS_CHOICES, STATUS_GROUP_ORDER, type StatusKey, actionOf,
  agentFacts, contactFilterCount, contactGroups, emptyContactFilters, facetCounts, genreTallies,
  matchesContactFilters, rowDateLine, sortFacts, standingQuery,
} from "./contactList";
import { genreKey } from "./genreMatch";
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

describe("v14 §4 — the filters: each control on its own fact, AND across, counts faceted", () => {
  const f0 = emptyContactFilters();
  const count = (f: ContactFilters) => facts.filter((x) => matchesContactFilters(x, f)).length;
  it("Action required is the your-move union (ruling a) and nothing else", () => {
    expect(matchesContactFilters(factOf("fx-two"), { ...f0, action: true }), "past-the-date joins Your move").toBe(true);
    expect(matchesContactFilters(factOf("fx-long"), { ...f0, action: true })).toBe(false);
    expect(count({ ...f0, action: true })).toBe(facts.filter((x) => x.stand === "you").length);
  });
  it("Open for submissions: Unknown counts as open; open + closed is the whole list", () => {
    expect(count({ ...f0, open: "open" }) + count({ ...f0, open: "closed" })).toBe(facts.length);
    /* the cast states every door, so the Unknown case is made from a real fact */
    const unstated = { ...factOf("fx-long"), openKey: "unstated" as const };
    expect(matchesContactFilters(unstated, { ...f0, open: "open" })).toBe(true);
    expect(matchesContactFilters(unstated, { ...f0, open: "closed" })).toBe(false);
  });
  it("Queried or not partitions the list", () => {
    expect(count({ ...f0, queried: "yes" }) + count({ ...f0, queried: "no" })).toBe(facts.length);
    expect(count({ ...f0, queried: "no" }), "population").toBeGreaterThan(0);
  });
  it("Missing materials and Always responds read the record's own fields", () => {
    expect(count({ ...f0, mats: true })).toBe(facts.filter((x) => (x.agent.materialsWanted ?? []).length === 0).length);
    expect(count({ ...f0, always: true })).toBe(facts.filter((x) => x.agent.noResponseMeansNo === false).length);
  });
  it("Status: several ticked are alternatives; the eleven choices, in Nick's order", () => {
    expect(STATUS_CHOICES.map((c) => c.label)).toEqual([
      "Not queried", "Queried", "Partial requested", "Partial sent", "Full requested", "Full sent",
      "Revise & resubmit", "Resubmitted", "Offer", "Signed", "Closed",
    ]);
    const seen = [...new Set(facts.map((x) => x.status14))];
    expect(seen.length, "population: more than one status").toBeGreaterThan(2);
    expect(count({ ...f0, status: seen as StatusKey[] })).toBe(facts.length);
    for (const k of seen) expect(count({ ...f0, status: [k] })).toBe(facts.filter((x) => x.status14 === k).length);
  });
  it("Genres: any is OR, all is AND, on genre KEYS — a canonical id matches its label", () => {
    const withTwo = facts.find((x) => new Set(x.genres.map(genreKey)).size >= 2)!;
    expect(withTwo, "population: an agent with two genres").toBeTruthy();
    const [g1, g2] = [...new Set(withTwo.genres.map(genreKey))];
    const any = facts.filter((x) => matchesContactFilters(x, { ...f0, genres: [g1, g2], genreMode: "any" }));
    const all = facts.filter((x) => matchesContactFilters(x, { ...f0, genres: [g1, g2], genreMode: "all" }));
    expect(all.length).toBeLessThanOrEqual(any.length);
    expect(all.map((x) => x.agent.id)).toContain(withTwo.agent.id);
    for (const x of all) { const k = new Set(x.genres.map(genreKey)); expect(k.has(g1) && k.has(g2)).toBe(true); }
    for (const x of any) { const k = new Set(x.genres.map(genreKey)); expect(k.has(g1) || k.has(g2)).toBe(true); }
    const tallies = genreTallies(facts);
    expect(tallies.get(g1)).toBe(facts.filter((x) => x.genres.map(genreKey).includes(g1)).length);
  });
  it("Clear all shows from the first control on — the count is controls, not values", () => {
    expect(contactFilterCount(f0)).toBe(0);
    expect(contactFilterCount({ ...f0, status: ["queried", "pr"], genres: ["a", "b"], action: true })).toBe(3);
    expect(contactFilterCount({ ...f0, open: "open", queried: "no", mats: true, always: true })).toBe(4);
  });
  it("faceted counts: each control counted under every OTHER control (two derivations against each other)", () => {
    const f = { ...f0, queried: "no" as const, mats: true };
    const c = facetCounts(facts, f, () => true);
    const under = (k: Parameters<typeof matchesContactFilters>[2]) => facts.filter((x) => matchesContactFilters(x, f, k));
    expect(c.open.open).toBe(under("open").filter((x) => x.openKey !== "closed").length);
    expect(c.mats, "a control's own count ignores itself").toBe(under("mats").filter((x) => (x.agent.materialsWanted ?? []).length === 0).length);
    expect(c.queried.yes, "a queried count while 'not queried' is on").toBe(under("queried").filter((x) => x.standing.kind !== "none").length);
    for (const k of STATUS_CHOICES) expect(c.status[k.key]).toBe(under("status").filter((x) => x.status14 === k.key).length);
    expect(Object.values(c.status).some((n) => n === 0), "population: a zero status, shown greyed").toBe(true);
  });
});

describe("v14 §4 — grouping partitions the ordered list; sorting orders within", () => {
  const extra = [
    { ...QUERIES[0], id: "fq-rr", agentId: "fx-fresh", status: QueryStatus.REVISE_RESUBMIT },
  ];
  const xRows = buildQcRows([...QUERIES, ...extra], CONTACT_FIXTURE_AGENTS, [], NOW);
  const xFacts = CONTACT_FIXTURE_AGENTS.map((a) => agentFacts(a, xRows, MS.id));
  it("the four groupings, Letter first", () => {
    expect(GROUP_OPTIONS.map((g) => g.label)).toEqual(["Letter", "Status", "Action required", "Country"]);
  });
  it("Status: furthest along first, Not queried then Closed last — ruling Q6's order, from the produced groups", () => {
    const g = contactGroups("status", sortFacts(xFacts, "surname"));
    const keys = g.map((x) => x.key as StatusKey);
    expect(keys).toEqual(STATUS_GROUP_ORDER.filter((k) => keys.includes(k)));
    expect(keys.length, "population: several status groups").toBeGreaterThan(3);
    expect(keys).toContain("rr");
    if (keys.includes("closed")) expect(keys[keys.length - 1]).toBe("closed");
    expect(g.reduce((n, x) => n + x.ids.length, 0), "a partition loses nobody").toBe(xFacts.length);
  });
  it("Action required: R&R is 'Send the revision'; groups in the table's order", () => {
    const takes = (x: { genres: string[] }) => x.genres.length > 0;
    const g = contactGroups("action", sortFacts(xFacts, "surname"), { takes });
    const labels = g.map((x) => x.label);
    expect(labels).toEqual(ACTION_GROUPS.map((a) => a.label).filter((l) => labels.includes(l)));
    expect(actionOf(xFacts.find((x) => x.agent.id === "fx-fresh")!, takes)).toBe("revision");
    expect(labels).toContain("Send the revision");
    expect(g.reduce((n, x) => n + x.ids.length, 0)).toBe(xFacts.length);
  });
  it("Action required for the three statuses ruling Q6 names", () => {
    const base = factOf("fx-long");
    const as = (status14: StatusKey) => actionOf({ ...base, status14, pastExpected: false }, () => true);
    expect(as("rr")).toBe("revision");
    expect(as("resub")).toBe("waiting");
    expect(as("signed")).toBe("nothing");
  });
  it("Country: by name, Not recorded last, never a guessed nation", () => {
    const g = contactGroups("country", sortFacts(facts, "surname"));
    const labels = g.map((x) => x.label);
    expect(labels.length, "population").toBeGreaterThan(1);
    const named = labels.filter((l) => l !== NOT_RECORDED);
    expect(named).toEqual([...named].sort((a, b) => a.localeCompare(b)));
    if (labels.includes(NOT_RECORDED)) expect(labels[labels.length - 1]).toBe(NOT_RECORDED);
    expect(labels.some((l) => /England|Scotland|Wales/.test(l))).toBe(false);
  });
  it("the five sorts, each with its direction words", () => {
    expect(SORT_OPTIONS_V12.map((o) => o.label)).toEqual(["Surname", "Agency", "Response time", "Recent activity", "Status"]);
    expect(SORT_OPTIONS_V12[0].dir).toEqual(["A to Z", "Z to A"]);
  });
  it("agency ignores a leading The", () => {
    const by = sortFacts(facts, "agency").map((x) => x.agent.agency);
    const lantern = by.indexOf("The Lantern Agency");
    expect(lantern, "population").toBeGreaterThanOrEqual(0);
    expect(lantern).toBeGreaterThan(by.indexOf("Halcyon Literary"));
    expect(lantern).toBeLessThan(by.indexOf("Rookery & Vale"));
  });
  const stated = (x: { agent: { responseTimeWeeks?: number } }) => typeof x.agent.responseTimeWeeks === "number" && x.agent.responseTimeWeeks > 0;
  it("Response time puts absence last — the stub 0 counts as absent — and reversed keeps it last", () => {
    const fwd = sortFacts(facts, "reply");
    expect(facts.some((x) => x.agent.responseTimeWeeks === 0), "population: a stub 0 exists").toBe(true);
    const noWindow = fwd.findIndex((x) => !stated(x));
    expect(noWindow).toBeGreaterThan(0);
    for (const x of fwd.slice(noWindow)) expect(stated(x)).toBe(false);
    const rev = sortFacts(facts, "reply", true);
    const has = (xs: typeof fwd) => xs.filter(stated).map((x) => x.agent.id);
    expect(has(rev)).toEqual([...has(fwd)].reverse());
    for (const x of rev.slice(rev.findIndex((y) => !stated(y)))) expect(stated(x)).toBe(false);
    expect(sortFacts(facts, "surname", true).map((x) => x.agent.id)).toEqual(sortFacts(facts, "surname").map((x) => x.agent.id).reverse());
  });
  it("Status sort: furthest along first, by the grouping's own order", () => {
    const by = sortFacts(xFacts, "status").map((x) => STATUS_GROUP_ORDER.indexOf(x.status14));
    for (let i = 1; i < by.length; i += 1) expect(by[i - 1]).toBeLessThanOrEqual(by[i]);
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
    const ordered = sortFacts(facts, "surname");
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
    const ordered = sortFacts(facts, "surname");
    const expected = [...facts].sort((a, b) =>
      surnameOf(a.agent).localeCompare(surnameOf(b.agent))
      || (a.agent.name.trim() || a.agent.agency).toLowerCase().localeCompare((b.agent.name.trim() || b.agent.agency).toLowerCase()));
    expect(ordered.map((x) => x.agent.id)).toEqual(expected.map((x) => x.agent.id));
    expect(A.length, "population").toBeGreaterThan(10);
  });
});

describe("openKey — the record's own word", () => {
  it("Open, Closed, or Not stated", () => {
    expect(openKeyOf({ submissionStatus: "Open" } as never)).toBe("open");
    expect(openKeyOf({ submissionStatus: "Closed" } as never)).toBe("closed");
    expect(openKeyOf({ submissionStatus: "Unknown" } as never)).toBe("unstated");
    expect(openKeyOf({} as never)).toBe("unstated");
    expect(new Set(facts.map((x) => x.openKey)).size, "population: the cast has more than one door").toBeGreaterThan(1);
  });
});
