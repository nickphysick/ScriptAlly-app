/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Housekeeping v2's gap model (Contact list v13 §6; HK v2 §1–§6), locked the fixture-derived way:
 * the live flag comes from `buildQcRows` over the cast's own queries, and per-branch populations are
 * asserted, because a sweep over a cast where every case is the same case proves nothing.
 */
import { describe, expect, it } from "vitest";
import { CONTACT_FIXTURE_AGENTS, CONTACT_FIXTURE_QUERIES, FIXTURE_GENRE } from "../components/agents/contactFixture";
import { buildQcRows } from "./qcSummary";
import { agentRows } from "./contactList";
import { fitsGenre } from "./contactStrip";
import {
  GAP_ORDER, GAP_TARGET, agentGaps, bestPlaceToStart, gapCopy, gapScore, genreChips, hasPassedOn, hkModel,
  reopenChips, savedLine, sessionLine, sessionMinutes, tabCounts, wishlistCheckin, type HkAgentCtx, type HkBook, type Run,
} from "./contactHousekeeping";
import { contactPrefsOf, type ContactPrefs } from "./contactPrefs";
import { QueryStatus, SubmissionStatus, type Agent, type Query } from "../types";

const NOW = new Date(2026, 9, 4, 12); // 4 Oct 2026, local
const A = CONTACT_FIXTURE_AGENTS;
const rows = buildQcRows(CONTACT_FIXTURE_QUERIES, A, [], NOW.getTime());
const by = (id: string) => A.find((a) => a.id === id)!;
const BOOK: HkBook = { title: "Murphy’s Day Out", genre: FIXTURE_GENRE, genres: [FIXTURE_GENRE] };
const ctxOf = (a: Agent, over: Partial<HkAgentCtx> = {}): HkAgentCtx => ({
  live: agentRows(rows, a.id, null).some((r) => r.court !== "closed"),
  fits: fitsGenre(a, [FIXTURE_GENRE]),
  queried: CONTACT_FIXTURE_QUERIES.some((q) => q.agentId === a.id),
  passedOn: hasPassedOn(a, CONTACT_FIXTURE_QUERIES, null),
  hasReopenTask: false,
  ...over,
});
const PREFS: ContactPrefs = contactPrefsOf(null, NOW);
const text = (runs: Run[]) => runs.map((r) => (typeof r === "string" ? r : "em" in r ? r.em : r.b)).join("");

describe("the gaps — reply · materials · genres · wishlist · reopen, and no recheck", () => {
  it("⚠️ DECISION 7 (supersedes ruling c): an ABSENT reply time is a gap, and so is the stub 0", () => {
    expect(by("fx-bare").responseTimeWeeks, "precondition: fx-bare states no window").toBeUndefined();
    expect(agentGaps(by("fx-bare"), ctxOf(by("fx-bare")), [])).toContain("reply");
    expect(agentGaps(by("fx-stub0"), ctxOf(by("fx-stub0")), [])).toContain("reply");
    expect(agentGaps(by("fx-long"), ctxOf(by("fx-long")), [])).not.toContain("reply");
  });
  it("“Say it's not stated” settles the reply gap — and only for that agent", () => {
    const settled = ["fx-bare:reply"];
    expect(agentGaps(by("fx-bare"), ctxOf(by("fx-bare")), settled)).not.toContain("reply");
    expect(agentGaps(by("fx-stub0"), ctxOf(by("fx-stub0")), settled)).toContain("reply");
  });
  it("recheck has left the feed — a 270-day-old stamp raises no gap", () => {
    expect(by("fx-stale").mswlCheckedAt, "precondition: a stamp from January").toMatch(/^2026-01/);
    const all = A.flatMap((a) => agentGaps(a, ctxOf(a), []));
    expect(all).not.toContain("recheck");
    expect(GAP_ORDER).toEqual(["reply", "materials", "genres", "wishlist", "reopen"]);
  });
  it("reopen: a closed door with no undone dated task (ruling b); the task closes it", () => {
    const shut = by("fx-reopen");
    expect(agentGaps(shut, ctxOf(shut), [])).toContain("reopen");
    expect(agentGaps(shut, ctxOf(shut, { hasReopenTask: true }), [])).not.toContain("reopen");
  });
  it("per-branch population: every gap is entered somewhere in the cast", () => {
    const all = new Set(A.flatMap((a) => agentGaps(a, ctxOf(a), [])));
    for (const g of GAP_ORDER) expect(all, g).toContain(g);
  });
  it("the card link lands where §1.5's table says", () => {
    expect(GAP_TARGET).toEqual({
      reply: { tab: "work", focus: "reply" }, materials: { tab: "want", focus: "materials" },
      genres: { tab: "want", focus: "genres" }, wishlist: { tab: "want", focus: "wishlist" },
      reopen: { tab: "work", focus: "reopen" },
    });
  });
});

describe("the score and the order (HK v2 §3)", () => {
  it("live + reply/materials 30, fits-and-not-queried 20, then the gap's own weight", () => {
    expect(gapScore({ live: true, fits: false, queried: true }, "reply")).toBe(36);
    expect(gapScore({ live: true, fits: false, queried: true }, "genres")).toBe(4);
    expect(gapScore({ live: false, fits: true, queried: false }, "wishlist")).toBe(23);
    expect(gapScore({ live: false, fits: true, queried: true }, "wishlist")).toBe(3);
    expect(gapScore({ live: false, fits: false, queried: false }, "reopen")).toBe(1);
  });
  it("items run most useful first, then by name — and the first is a live reply when there is one", () => {
    const m = hkModel(A, (a) => ctxOf(a), PREFS);
    for (let i = 1; i < m.items.length; i += 1) expect(m.items[i - 1].score).toBeGreaterThanOrEqual(m.items[i].score);
    expect(m.items[0].gap).toBe("reply");
    expect(m.items[0].live).toBe(true);
  });
});

describe("Later hides an item for 30 days, and it comes back on its own", () => {
  it("hidden while the day is ahead; pruned on read once it has come", () => {
    const stored = { todoPrefs: { contacts: { later: { "fx-sparse:genres": "2026-11-03" } } } };
    const m = hkModel(A, (a) => ctxOf(a), contactPrefsOf(stored, NOW));
    expect(m.items.some((i) => i.key === "fx-sparse:genres")).toBe(false);
    expect(m.hidden.map((i) => i.key)).toEqual(["fx-sparse:genres"]);
    expect(m.laterUntil).toBe("2026-11-03");
    const back = hkModel(A, (a) => ctxOf(a), contactPrefsOf(stored, new Date(2026, 10, 4)));
    expect(back.items.some((i) => i.key === "fx-sparse:genres")).toBe(true);
    expect(back.hidden).toEqual([]);
  });
  it("a hidden gap is still a gap: the agent is not complete", () => {
    const sparse = by("fx-sparse");
    const keys = agentGaps(sparse, ctxOf(sparse), []).map((g) => `fx-sparse:${g}`);
    const later = Object.fromEntries(keys.map((k) => [k, "2026-11-03"]));
    const m = hkModel([sparse], (a) => ctxOf(a), contactPrefsOf({ todoPrefs: { contacts: { later } } }, NOW));
    expect(m.items).toEqual([]);
    expect(m.complete).toBe(0);
  });
});

describe("the copy is §4's, word for word", () => {
  const live = { agent: by("fx-long"), live: true, fits: true };
  const cold = { agent: by("fx-sparse"), live: false, fits: false };
  it("reply, live and not", () => {
    expect(gapCopy({ ...live, gap: "reply" }, BOOK).title).toBe("How long Aisha takes to reply");
    expect(text(gapCopy({ ...live, gap: "reply" }, BOOK).why)).toBe("You’ve queried Aisha. Add this and you’ll see the date their answer is due, and when it’s fair to follow up.");
    expect(text(gapCopy({ ...cold, gap: "reply" }, BOOK).why)).toBe("Add this and, once you query Ottoline, you’ll see when to expect an answer.");
    expect(gapCopy({ ...cold, gap: "reply" }, BOOK).where).toBe("Most agencies say on their submissions page, something like “we aim to reply within 8 weeks”.");
  });
  it("materials, live and not", () => {
    expect(gapCopy({ ...live, gap: "materials" }, BOOK).title).toBe("What Aisha wants you to send");
    expect(text(gapCopy({ ...live, gap: "materials" }, BOOK).why)).toBe("You’ve queried Aisha. Note what they ask for so you can check it matches what you sent.");
    expect(text(gapCopy({ ...cold, gap: "materials" }, BOOK).why)).toBe("Note what they ask for, and it’ll be listed for you when you’re ready to query Ottoline.");
  });
  it("genres names the book and its genre, the book in italic", () => {
    const c = gapCopy({ ...cold, gap: "genres" }, BOOK);
    expect(c.title).toBe("Which genres Ottoline takes");
    expect(text(c.why)).toBe("Add these so QueryHawk can tell you whether Ottoline is a fit for Murphy’s Day Out (Thriller).");
    expect(c.why).toContainEqual({ em: "Murphy’s Day Out" });
    expect(c.where).toBe("Listed on their agency profile, their MSWL page or the agency’s website.");
  });
  it("wishlist, when they take the genre and when not", () => {
    expect(text(gapCopy({ ...live, gap: "wishlist" }, BOOK).why)).toBe("Aisha takes thrillers. Their wishlist tells you whether a book like Murphy’s Day Out is what they want right now.");
    expect(text(gapCopy({ ...cold, gap: "wishlist" }, BOOK).why)).toBe("In their own words, what they’re looking for. It helps you judge whether to query them.");
  });
  it("reopen shows the bracket only with a reopening date", () => {
    const dated = gapCopy({ agent: by("fx-reopen"), live: false, fits: false, gap: "reopen" }, BOOK);
    expect(dated.title).toBe("When Tomas reopens to queries");
    expect(text(dated.why)).toBe("Tomas isn’t taking new queries at the moment (until around 1 Nov). Pick a date and we’ll put a reminder on your To-do list.");
    const undated = gapCopy({ agent: by("fx-shut"), live: false, fits: false, gap: "reopen" }, BOOK);
    expect(text(undated.why)).toBe("Marcus isn’t taking new queries at the moment. Pick a date and we’ll put a reminder on your To-do list.");
  });
});

describe("the head, the session and the tab", () => {
  it("Best place to start, in §2's order, and nothing when there are no gaps", () => {
    const m = hkModel(A, (a) => ctxOf(a), PREFS);
    expect(text(bestPlaceToStart(m.items, BOOK)!)).toMatch(/^You’ve queried \d+ agents? without knowing how long they take to reply\./);
    expect(bestPlaceToStart([], BOOK)).toBeNull();
    const mats = m.items.filter((i) => i.gap === "materials");
    expect(text(bestPlaceToStart(mats, BOOK)!)).toMatch(/no record of what they want you to send/);
  });
  it("about 0.4 of a minute an item, never under one", () => {
    expect(sessionMinutes(1)).toBe(1);
    expect(sessionMinutes(13)).toBe(5);
    expect(sessionLine(13)).toBe("13 to go · about 5 minutes · stop whenever you like");
  });
  it("the tab's counts", () => {
    expect(tabCounts({ items: new Array(14), complete: 31, total: 41 } as never)).toBe("14 gaps · 31 of 41 filled in");
  });
});

describe("the fixes' facts", () => {
  it("⚠️ on 4 Oct 2026 the reopen chips are 1 Nov · 1 Dec · 4 Jan · In a month", () => {
    const c = reopenChips(NOW);
    expect(c.map((x) => x.label)).toEqual(["1 Nov", "1 Dec", "4 Jan", "In a month"]);
    expect(c.map((x) => x.value)).toEqual(["2026-11-01", "2026-12-01", "2027-01-04", "2026-11-04"]);
  });
  it("genre chips: the book's first, then the writer's own list most used first, capped at eight", () => {
    const g = genreChips("Thriller", ["Crime", "Crime", "Literary", "Thriller", "Horror", "A", "B", "C", "D", "E"]);
    expect(g[0]).toBe("Thriller");
    expect(g[1]).toBe("Crime");
    expect(g).toHaveLength(8);
  });
  it("the saved lines", () => {
    expect(savedLine({ agent: by("fx-long"), gap: "reply", live: true }, { weeks: 8 })).toBe("Aisha Kapoor replies in about 8 weeks. Your reply-due date is set.");
    expect(savedLine({ agent: by("fx-sparse"), gap: "reply", live: false }, { settled: true })).toBe("Ottoline Frayn: reply time not stated. We won’t ask again.");
    expect(savedLine({ agent: by("fx-reopen"), gap: "reopen", live: false }, { remindOn: "2026-12-01" })).toBe("Reminder on your To-do list for 1 Dec.");
  });
});

describe("ruling Q6 and the wishlist check-in", () => {
  const agent = (over: Partial<Agent>): Agent => ({ ...by("fx-stale"), ...over } as Agent);
  const qs = (status: QueryStatus, agentId = "fx-stale"): Query[] => [{ id: "q", agentId, manuscriptId: "ms", status } as Query];
  it("passed = Rejected, or No Response where no response means no; Withdrawn never", () => {
    expect(hasPassedOn(agent({}), qs(QueryStatus.REJECTED), "ms")).toBe(true);
    expect(hasPassedOn(agent({ noResponseMeansNo: true }), qs(QueryStatus.NO_RESPONSE), "ms")).toBe(true);
    expect(hasPassedOn(agent({ noResponseMeansNo: false }), qs(QueryStatus.NO_RESPONSE), "ms")).toBe(false);
    expect(hasPassedOn(agent({}), qs(QueryStatus.WITHDRAWN), "ms")).toBe(false);
    expect(hasPassedOn(agent({}), qs(QueryStatus.REJECTED), "other-ms"), "another manuscript's pass does not count").toBe(false);
  });
  it("due: a stamped wishlist older than the interval, an open door, not passed — a null stamp never", () => {
    const stale = agent({});
    const nullStamp = agent({ id: "n", mswlCheckedAt: undefined });
    const shut = agent({ id: "s", submissionStatus: SubmissionStatus.CLOSED });
    const passed = agent({ id: "p" });
    const ctx = (a: Agent) => ctxOf(a, { passedOn: a.id === "p" });
    const c = wishlistCheckin([stale, nullStamp, shut, passed], ctx, PREFS, NOW);
    expect(c.due.map((a) => a.id)).toEqual(["fx-stale"]);
    expect(c.show).toBe(true);
    /* the "null → epoch" mutation must go red: an epoch stamp IS due, a null one is not */
    expect(wishlistCheckin([agent({ id: "e", mswlCheckedAt: new Date(0).toISOString() })], ctx, PREFS, NOW).due).toHaveLength(1);
  });
  it("Next time hides the card until the next check-in, and the quiet line names the day", () => {
    const prefs = contactPrefsOf({ todoPrefs: { contacts: { wishlistNextOn: "2027-04-04" } } }, NOW);
    const c = wishlistCheckin([agent({})], (a) => ctxOf(a), prefs, NOW);
    expect(c.show).toBe(false);
    expect(c.nextOn).toBe("2027-04-04");
  });
  it("the interval decides what is due: 12 months lets a 9-month-old stamp wait", () => {
    const twelve = contactPrefsOf({ todoPrefs: { contacts: { wishlistEvery: 12 } } }, NOW);
    expect(wishlistCheckin([agent({})], (a) => ctxOf(a), twelve, NOW).due).toHaveLength(0);
  });
});
