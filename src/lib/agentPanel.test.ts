/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v16 §F — the agent panel's derivations. Every fixture is built by the page's own `agentFacts` and
 * `cardQuery` over the Query Centre's own rows, so no case hands the panel a state its callers cannot produce.
 */
import { describe, expect, it } from "vitest";
import type { Agent, Query } from "../types";
import { QueryStatus, SubmissionMethod, SubmissionStatus } from "../types";
import { agentFacts } from "./contactList";
import { buildQcRows } from "./qcSummary";
import { cardQuery, cardRows } from "./agentCard";
import { DOOR_EDGE, discGrey, panelDoor, panelFoot, panelIndex, panelLinks, panelStand, type StandState } from "./agentPanel";

const NOW = Date.parse("2026-10-12T12:00:00Z");
const DAY = 86_400_000;
const iso = (d: number) => new Date(NOW - d * DAY).toISOString();
const mk = (id: string, over: Partial<Agent> = {}): Agent => ({
  id, name: "Clara Beaumont", agency: "Beaumont & Pryce", city: "Edinburgh", genres: ["Thriller"], submissionStatus: SubmissionStatus.OPEN,
  dateAdded: iso(300), responseTimeWeeks: 6, mswlNotes: "", materialsWanted: [], submissionMethod: SubmissionMethod.EMAIL, email: "", website: "", ...over,
} as unknown as Agent);
const qy = (agentId: string, status: QueryStatus, sent: number, over: Partial<Query> = {}): Query => ({
  id: `q-${agentId}`, agentId, manuscriptId: "ms1", status, dateSent: iso(sent), lastStatusChange: iso(sent), ...over,
} as unknown as Query);

/** the panel's view of one agent, through the page's own derivations */
function view(agent: Agent, queries: Query[], opts: { title?: string | null; fit?: string | null } = {}) {
  const rows = buildQcRows(queries, [agent], [], NOW);
  const facts = agentFacts(agent, rows, "ms1");
  const q = cardQuery(cardRows(rows, agent.id, "ms1"));
  const title = opts.title === undefined ? "Murphy’s Day Out" : opts.title;
  const stand = panelStand({ agent, facts, q, title, fitGenre: opts.fit === undefined ? null : opts.fit, nowMs: NOW });
  return { stand, foot: panelFoot(agent, facts, q, NOW), facts, q, text: stand.paragraph.map((p) => p.text).join("") };
}

describe("the door: three-way, and its colours", () => {
  it("open is sage, closed is grey, not known is #d8cfc2", () => {
    expect(panelDoor(mk("a"), NOW)).toMatchObject({ kind: "open", label: "Open to queries", edge: "#a9bf9f", dot: "#6f8f66" });
    expect(panelDoor(mk("a", { submissionStatus: SubmissionStatus.CLOSED }), NOW)).toMatchObject({ kind: "closed", label: "Closed to queries", edge: "#b5aca4", dot: "#8a827b" });
    expect(panelDoor(mk("a", { submissionStatus: SubmissionStatus.UNKNOWN }), NOW)).toMatchObject({ kind: "unknown", label: "Not known", edge: "#d8cfc2" });
    expect(Object.values(DOOR_EDGE)).toEqual(["#a9bf9f", "#b5aca4", "#d8cfc2"]);
  });
  it("an Unknown door never reads as open", () => {
    expect(panelDoor(mk("a", { submissionStatus: SubmissionStatus.UNKNOWN }), NOW).label).not.toMatch(/open/i);
  });
  it("\"Closed till\" only for a recorded date that has not gone by", () => {
    const shut = { submissionStatus: SubmissionStatus.CLOSED };
    expect(panelDoor(mk("a", { ...shut, reopensOn: new Date(NOW + 20 * DAY).toISOString() }), NOW).label).toBe("Closed till 1 Nov");
    expect(panelDoor(mk("a", { ...shut, reopensOn: iso(30) }), NOW).label).toBe("Closed to queries");
    expect(panelDoor(mk("a", { reopensOn: new Date(NOW + 20 * DAY).toISOString() }), NOW).label).toBe("Open to queries");
  });
  it("the disc is grey when every query is closed, or the door is", () => {
    expect(discGrey(view(mk("a"), []).facts)).toBe(false);
    expect(discGrey(view(mk("a"), [qy("a", QueryStatus.REJECTED, 40)]).facts)).toBe(true);
    expect(discGrey(view(mk("a", { submissionStatus: SubmissionStatus.CLOSED }), []).facts)).toBe(true);
    expect(discGrey(view(mk("a", { submissionStatus: SubmissionStatus.CLOSED }), [qy("a", QueryStatus.QUERIED, 5)]).facts)).toBe(true);
  });
});

describe("the links: only what is on record", () => {
  it("nothing on record, nothing drawn; and there is never a submission-form link", () => {
    expect(panelLinks(mk("a"))).toEqual([]);
    const all = panelLinks(mk("a", { website: "beaumontpryce.co.uk", email: "clara@bp.co.uk", socials: [{ platform: "MSWL", handle: "manuscriptwishlist.com/clara" }] } as Partial<Agent>));
    expect(all.map((l) => l.key)).toEqual(["website", "email", "mswl"]);
    expect(all.map((l) => l.label)).toEqual(["Website ↗", "Copy email", "MSWL ↗"]);
    expect(JSON.stringify(all)).not.toMatch(/submission/i);
  });
});

describe("where you stand: the eight states", () => {
  const seen = new Set<StandState>();
  const see = (v: ReturnType<typeof view>) => { seen.add(v.stand.state); return v; };
  it("a request to send: the heading, days left or over, and the two dates", () => {
    const due = new Date(NOW + 5 * DAY).toISOString();
    const v = see(view(mk("a"), [qy("a", QueryStatus.PARTIAL_REQUESTED, 30, { partialRequestedDate: iso(3), lastStatusChange: iso(3), expectedSendDate: due })]));
    expect(v.stand).toMatchObject({ state: "send", tone: "you", heading: "Send Clara the partial", figure: "5 days left", past: false });
    expect(v.text).toMatch(/^Clara asked for the partial of Murphy’s Day Out on 9 Oct\. They’re expecting it by 17 Oct\.$/);
    expect(v.foot.primary).toEqual({ label: "Mark partial sent", act: { kind: "journey", mode: "sent" } });
    const over = view(mk("a"), [qy("a", QueryStatus.FULL_REQUESTED, 30, { fullRequestedDate: iso(9), lastStatusChange: iso(9), expectedSendDate: iso(2) })]);
    expect(over.stand).toMatchObject({ heading: "Send Clara the full", figure: "2 days over", past: true });
    expect(over.foot.primary.label).toBe("Mark full sent");
  });
  it("a request with no send-by date says nothing about one", () => {
    const v = view(mk("a"), [qy("a", QueryStatus.FULL_REQUESTED, 30, { fullRequestedDate: iso(9), lastStatusChange: iso(9) })]);
    expect(v.stand.figure).toBeNull();
    expect(v.text).not.toMatch(/expecting/);
  });
  it("an offer: answer it, in rust", () => {
    const v = see(view(mk("a"), [qy("a", QueryStatus.OFFER, 60, { lastStatusChange: iso(2), offerResponseDeadline: new Date(NOW + 12 * DAY).toISOString() })]));
    expect(v.stand).toMatchObject({ state: "offer", tone: "you", heading: "Answer Clara’s offer", figure: "12 days left", past: true });
    expect(v.text).toMatch(/^Clara offered to represent Murphy’s Day Out/);
    expect(v.foot.primary).toEqual({ label: "Record your answer", act: { kind: "journey", mode: "offer" } });
  });
  it("with the agent, inside the window", () => {
    const v = see(view(mk("a"), [qy("a", QueryStatus.QUERIED, 10)]));
    expect(v.stand).toMatchObject({ state: "waiting", tone: "agent", heading: "Waiting on Clara", figure: "32 days to go", past: false });
    expect(v.text).toMatch(/^You queried Clara with Murphy’s Day Out on 2 Oct\. You expect a reply by 13 Nov\.$/);
    expect(v.foot).toMatchObject({ status: "Queried", hot: false, primary: { label: "Record a response", act: { kind: "journey", mode: "resp" } }, editSecondary: true });
  });
  it("with the agent, past the reply date", () => {
    const v = see(view(mk("a"), [qy("a", QueryStatus.QUERIED, 60)]));
    expect(v.stand).toMatchObject({ state: "late", tone: "agent", heading: "Clara is late", figure: "18 days over", past: true });
    expect(v.text).toBe("You expected a reply by 24 Sep.");
    expect(v.foot.hot).toBe(true);
  });
  it("with the agent and no reply window stated: no figure and no reply date", () => {
    const v = view(mk("a", { responseTimeWeeks: undefined }), [qy("a", QueryStatus.QUERIED, 10)]);
    expect(v.stand).toMatchObject({ state: "waiting", figure: null });
    expect(v.text).not.toMatch(/expect a reply/);
  });
  it("closed: passed, or closed with no reply", () => {
    const v = see(view(mk("a"), [qy("a", QueryStatus.REJECTED, 40)]));
    expect(v.stand).toMatchObject({ state: "closed", tone: "closed", heading: "Clara passed", figure: "2 Sep" });
    expect(v.text).toBe("Your query for Murphy’s Day Out is closed. You can query Clara again with your next book.");
    expect(v.foot.primary).toEqual({ label: "Edit profile", act: { kind: "edit" } });
    expect(v.foot.editSecondary).toBe(false);
    expect(view(mk("a"), [qy("a", QueryStatus.NO_RESPONSE, 90)]).stand.heading).toBe("Closed, no reply");
  });
  it("not queried, a fit: the genre is named, and \"open to queries\" only when the door is", () => {
    const v = see(view(mk("a"), [], { fit: "Thriller" }));
    expect(v.stand).toMatchObject({ state: "fit", tone: "plain", heading: "A fit for Murphy’s Day Out", figure: "Not queried" });
    expect(v.text).toBe("Clara takes thrillers and is open to queries. You haven’t queried them with Murphy’s Day Out yet.");
    const unknown = view(mk("a", { submissionStatus: SubmissionStatus.UNKNOWN }), [], { fit: "Thriller" });
    expect(unknown.text).toBe("Clara takes thrillers. You haven’t queried them with Murphy’s Day Out yet.");
    expect(v.foot).toMatchObject({ status: "Not queried yet", detail: "Ready when you are", primary: { label: "Log a query" } });
    expect(unknown.foot.primary.label).toBe("Log a query");
  });
  it("not queried, not a fit or not known", () => {
    const v = see(view(mk("a"), []));
    expect(v.stand).toMatchObject({ state: "none", tone: "plain", heading: "Not queried yet", figure: null });
    expect(v.text).toBe("You haven’t queried Clara with Murphy’s Day Out yet.");
  });
  it("closed to queries, and not queried", () => {
    const v = see(view(mk("a", { submissionStatus: SubmissionStatus.CLOSED, reopensOn: new Date(NOW + 20 * DAY).toISOString() }), [], { fit: "Thriller" }));
    expect(v.stand).toMatchObject({ state: "shut", tone: "plain", heading: "Closed to queries", figure: "till 1 Nov" });
    expect(v.text).toBe("Clara isn’t taking queries right now.");
    expect(v.foot).toMatchObject({ status: "Closed to queries", detail: "Reopens 1 Nov", primary: { label: "Edit profile" }, editSecondary: false });
  });
  it("a live query outranks a shut door: the card says where the query stands", () => {
    expect(view(mk("a", { submissionStatus: SubmissionStatus.CLOSED }), [qy("a", QueryStatus.QUERIED, 10)]).stand.state).toBe("waiting");
  });
  it("with no book in scope, nothing names one", () => {
    const v = view(mk("a"), [qy("a", QueryStatus.QUERIED, 10)], { title: null });
    expect(v.text).toMatch(/^You queried Clara on 2 Oct\./);
  });
  it("every one of the eight states was entered", () => {
    expect([...seen].sort()).toEqual(["closed", "fit", "late", "none", "offer", "send", "shut", "waiting"]);
  });
  it("no gendered pronoun in any state", () => {
    for (const queries of [[], [qy("a", QueryStatus.QUERIED, 10)], [qy("a", QueryStatus.QUERIED, 60)], [qy("a", QueryStatus.REJECTED, 40)], [qy("a", QueryStatus.FULL_REQUESTED, 9)]]) {
      const v = view(mk("a"), queries, { fit: "Thriller" });
      expect(`${v.stand.heading} ${v.text}`).not.toMatch(/\b(he|she|his|her|hers|him)\b/i);
    }
  });
});

describe("the index card", () => {
  it("six rows, in order; a missing answer is null (the row shows its \"+ Add\")", () => {
    const rows = panelIndex({ agent: mk("a", { responseTimeWeeks: undefined, submissionMethod: undefined as never }), genres: [], queried: [], nowMs: NOW });
    expect(rows.map((r) => r.label)).toEqual(["Looking for", "Genres", "Takes queries", "Replies", "Send them", "Your queries"]);
    expect(rows.map((r) => r.answer)).toEqual([null, null, null, null, null, "None yet"]);
  });
  it("what is on record, in the card's words", () => {
    const a = mk("a", { mswlNotes: "Suspense with heart.", noResponseMeansNo: true, materialsWanted: ["Query letter", "Synopsis"] });
    const rows = panelIndex({ agent: a, genres: [{ label: "Thriller", hit: true }, { label: "Suspense", hit: false }], queried: ["Murphy’s Day Out"], nowMs: NOW });
    const by = Object.fromEntries(rows.map((r) => [r.key, r]));
    expect(by.wishlist.answer).toBe("“Suspense with heart.”");
    expect(by.genres.chips).toEqual([{ label: "Thriller", hit: true }, { label: "Suspense", hit: false }]);
    expect(by.method.answer).toBe("By email");
    expect(by.reply).toMatchObject({ answer: "In about 6 weeks", note: "No reply means no" });
    expect(by.materials.answer).toMatch(/ · Synopsis$/);
    expect(by.queries.answer).toBe("One, for Murphy’s Day Out");
  });
  it("two books are joined with \"and\"; a stub reply time of 0 is not an answer", () => {
    const rows = panelIndex({ agent: mk("a", { responseTimeWeeks: 0, noResponseMeansNo: false }), genres: [], queried: ["A", "B"], nowMs: NOW });
    const by = Object.fromEntries(rows.map((r) => [r.key, r]));
    expect(by.queries.answer).toBe("Two, for A and B");
    expect(by.reply.answer).toBeNull();
  });
});
