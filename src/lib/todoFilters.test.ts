/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from "vitest";
import { BoardCard } from "./todoBoard";
import { HkGroup } from "./todoHousekeeping";
import { DEFAULT_FILTERS, TodoFilterState, filtersActive, matchesSearch, groupMatchesSearch, visibleDoCard, visibleStaleCard, visibleNoteCard, visibleGroup, filterCounts, cardText, togglePill, soloFamily, isSoloed, isResting, ALL_TYPES, FAMILY_TYPES } from "./todoFilters";
import { Agent, Manuscript, Query, QueryStatus } from "../types";

const TODAY = "2026-07-18";
const card = (key: string, over: Partial<BoardCard> = {}): BoardCard =>
  ({ key, stream: "do", title: "T", who: "", subtitle: "", due: "", warn: false, snoozes: 0, hk: false, initials: "", record: "", committed: false, done: false, ...over } as BoardCard);
const f = (over: Partial<TodoFilterState> = {}): TodoFilterState => ({ ...DEFAULT_FILTERS, ...over });
const group = (rule: HkGroup["rule"], members = 3): HkGroup =>
  ({ rule, meta: { rule, label: rule === "dq_materials" ? "Materials" : rule === "dq_mswl" ? "Wish lists" : "Reply windows", taskType: "data_quality_poor", title: (n: number) => `${n}`, assistable: true }, members: Array.from({ length: members }, (_, i) => ({ card: card(`m${i}`), agentName: `Agent ${i}`, agency: "Inkwell & Stone", agentId: `a${i}`, queried: true })) } as HkGroup);

describe("defaults + activity", () => {
  it("all-visible defaults (Snoozed CHECKED — hiding is the writer's act, deviation from the static mock); todayOnly off", () => {
    expect(DEFAULT_FILTERS).toEqual({ offers: true, overToYou: true, materials: true, mswl: true, stale: true, snoozed: true, notes: true, todayOnly: false });
  });
  it("filtersActive: default + empty search = inactive; any change or query = active", () => {
    expect(filtersActive(f(), "")).toBe(false);
    expect(filtersActive(f(), "  ")).toBe(false);
    expect(filtersActive(f({ stale: false }), "")).toBe(true);
    expect(filtersActive(f(), "marsh")).toBe(true);
  });
});

describe("the composition matrix — type boxes × the snoozed axis × todayOnly", () => {
  const offer = card("o", { taskType: "offer_received" });
  const send = card("s", { taskType: "full_requested" });
  const snoozedSend = card("z", { taskType: "full_requested", snoozes: 2 });
  const committedSend = card("c", { taskType: "full_requested", committedDate: TODAY });
  it("Urgent: Offers and Agent waiting split the lane", () => {
    expect(visibleDoCard(offer, f(), TODAY)).toBe(true);
    expect(visibleDoCard(offer, f({ offers: false }), TODAY)).toBe(false);
    expect(visibleDoCard(send, f({ offers: false }), TODAY)).toBe(true);
    expect(visibleDoCard(send, f({ overToYou: false }), TODAY)).toBe(false);
  });
  it("Snoozed is an AXIS on top of the type boxes — a snoozed card still needs its type checked", () => {
    expect(visibleDoCard(snoozedSend, f(), TODAY)).toBe(true);
    expect(visibleDoCard(snoozedSend, f({ snoozed: false }), TODAY)).toBe(false);
    expect(visibleDoCard(snoozedSend, f({ overToYou: false }), TODAY)).toBe(false); // type box wins too
  });
  it("todayOnly composes over everything; groups never survive it (not committable)", () => {
    expect(visibleDoCard(send, f({ todayOnly: true }), TODAY)).toBe(false);
    expect(visibleDoCard(committedSend, f({ todayOnly: true }), TODAY)).toBe(true);
    expect(visibleGroup(group("dq_materials"), f({ todayOnly: true }))).toBe(false);
  });
  it("stale + notes: their box / the axes", () => {
    const stale = card("st", { taskType: "no_response_close", stream: "hk" });
    expect(visibleStaleCard(stale, f(), TODAY)).toBe(true);
    expect(visibleStaleCard(stale, f({ stale: false }), TODAY)).toBe(false);
    const note = card("n", { stream: "nt", userTaskId: "u1" });
    expect(visibleNoteCard(note, f(), TODAY)).toBe(true);
    expect(visibleNoteCard(note, f({ todayOnly: true }), TODAY)).toBe(false);
  });
  it("groups: materials/mswl boxes; reply-window groups have NO box and always pass (ref list omits them)", () => {
    expect(visibleGroup(group("dq_materials"), f({ materials: false }))).toBe(false);
    expect(visibleGroup(group("dq_mswl"), f({ mswl: false }))).toBe(false);
    expect(visibleGroup(group("dq_responseTime"), f({ materials: false, mswl: false }))).toBe(true);
  });
});

describe("search — title, agent, agency, manuscript (case-insensitive; groups match members)", () => {
  const ctx = {
    queries: [{ id: "q1", agentId: "a1", manuscriptId: "m1", status: QueryStatus.QUERIED } as Query],
    agents: [{ id: "a1", name: "Jonathan Marsh", agency: "The Marsh Agency" } as Agent],
    manuscripts: [{ id: "m1", title: "Murphy’s Day Out" } as Manuscript],
  };
  const c = card("k", { title: "Send your full to Jonathan Marsh", who: "Jonathan Marsh", record: "Jonathan Marsh · The Marsh Agency", relatedRecordId: "q1" });
  it("matches each field; empty query matches everything", () => {
    expect(matchesSearch(c, "", ctx)).toBe(true);
    expect(matchesSearch(c, "full", ctx)).toBe(true); // title
    expect(matchesSearch(c, "jonathan", ctx)).toBe(true); // agent
    expect(matchesSearch(c, "marsh agency", ctx)).toBe(true); // agency
    expect(matchesSearch(c, "murphy", ctx)).toBe(true); // manuscript
    expect(matchesSearch(c, "zebra", ctx)).toBe(false);
    expect(cardText(c, ctx)).toContain("murphy’s day out");
  });
  it("groups match on label or member name/agency", () => {
    expect(groupMatchesSearch(group("dq_mswl"), "wish")).toBe(true);
    expect(groupMatchesSearch(group("dq_mswl"), "agent 2")).toBe(true);
    expect(groupMatchesSearch(group("dq_mswl"), "inkwell")).toBe(true);
    expect(groupMatchesSearch(group("dq_mswl"), "zebra")).toBe(false);
  });
});

describe("filterCounts — derived from the live board sets", () => {
  it("counts per checkbox; snoozed spans lanes; the review card never counts", () => {
    const doCards = [card("o", { taskType: "offer_received" }), card("s1", { taskType: "full_requested", snoozes: 1 }), card("w", { taskType: "weekly_review" })];
    const stale = [card("st", { taskType: "no_response_close", snoozes: 2 })];
    const nt = [card("n", { userTaskId: "u" })];
    const c = filterCounts({ doCards, hkGroups: [group("dq_materials", 4), group("dq_mswl", 2)], staleCards: stale, ntCards: nt, committedCount: 3 });
    expect(c).toEqual({ offers: 1, overToYou: 1, materials: 4, mswl: 2, stale: 1, snoozed: 2, notes: 1, today: 3 });
  });
});

describe("Deck v2 — the quiet-pill reducer + the post-it family solos", () => {
  it("resting = every type on; the lens is separate", () => {
    expect(isResting(DEFAULT_FILTERS)).toBe(true);
    expect(isResting({ ...DEFAULT_FILTERS, todayOnly: true })).toBe(true);
    expect(isResting({ ...DEFAULT_FILTERS, stale: false })).toBe(false);
  });
  it("first toggle SOLOS the type; further toggles edit membership; emptying returns to rest", () => {
    const solo = togglePill(DEFAULT_FILTERS, "materials");
    expect(solo.materials).toBe(true);
    expect(ALL_TYPES.filter((t) => solo[t])).toEqual(["materials"]);
    const two = togglePill(solo, "mswl");
    expect(ALL_TYPES.filter((t) => two[t]).sort()).toEqual(["materials", "mswl"]);
    const back = togglePill(togglePill(two, "mswl"), "materials"); // remove both → rest
    expect(isResting(back)).toBe(true);
  });
  it("the post-it solo: exactly the family's set; pressed = soloed; clicking again rests", () => {
    const f = soloFamily(DEFAULT_FILTERS, "pink");
    expect(ALL_TYPES.filter((t) => f[t]).sort()).toEqual([...FAMILY_TYPES.pink].sort());
    expect(isSoloed(f, "pink")).toBe(true);
    expect(isSoloed(f, "latte")).toBe(false);
    expect(isResting(soloFamily(f, "pink"))).toBe(true); // toggle off
    const y = soloFamily(f, "yellow"); // switching family re-solos
    expect(ALL_TYPES.filter((t) => y[t])).toEqual(["notes"]);
  });
  it("the notes gate: narrowing elsewhere hides notes", () => {
    const f = togglePill(DEFAULT_FILTERS, "offers");
    expect(f.notes).toBe(false);
  });
});
