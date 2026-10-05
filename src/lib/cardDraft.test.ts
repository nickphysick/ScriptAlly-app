/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The agent card's editor draft (Agent card v1 §4–5): read off a record, what counts as a change,
 * what is wrong, and the patch a save sends — ONLY what changed.
 */
import { describe, it, expect } from "vitest";
import { SubmissionMethod, SubmissionStatus, type Agent } from "../types";
import { CONTACT_FIXTURE_AGENTS as A } from "../components/agents/contactFixture";
import { buildAgentMaterials } from "./agentMaterials";
import { sanitizeAgentPatch } from "./saveAgentEdits";
import {
  agencyKey, agencyOptions, applyPatch, cardPatch, changedFields, changedTabs, cityOptions, colleagueWeeks, colleaguesOf,
  draftOf, emailOk, emptyCardDraft, encodeMats, genreOptions, hostOf, inversePatch, linkOk, matsOf, methodOf, problemsOf,
  socialsWithMswl, tabOf,
} from "./cardDraft";

const NOW = "2026-10-05T12:00:00.000Z";
const agent = (id: string) => A.find((a) => a.id === id)!;
const edit = (a: Agent, f: (d: ReturnType<typeof draftOf>) => void) => {
  const base = draftOf(a);
  const d = structuredClone(base);
  f(d);
  return { base, d, patch: cardPatch(a, base, d, NOW) };
};

describe("reading a record", () => {
  it("a record opens UNCHANGED — nothing to count, nothing to save", () => {
    for (const a of A) {
      const base = draftOf(a);
      expect(changedFields(base, structuredClone(base)), a.id).toEqual([]);
      expect(cardPatch(a, base, structuredClone(base), NOW), a.id).toEqual({});
    }
  });
  it("a stub 0 reads as Unknown, and absence as Not stated yet — both origins", () => {
    expect(draftOf(agent("fx-stub0")).weeks).toBeNull();
    expect(draftOf(agent("fx-sparse")).weeks).toBeNull();
    expect(draftOf(agent("fx-sparse")).nrn).toBeNull();
    expect(draftOf(agent("fx-long")).nrn).toBe(true);
  });
  it("stored genre ids read as their labels (ruling 1)", () => {
    const a = { ...agent("fx-long"), genres: ["literary-fiction", "Thriller"] } as Agent;
    expect(draftOf(a).genres).toEqual(["Literary fiction", "Thriller"]);
  });
  it("legacy method spellings read as the enum (ruling 2); Other reads as nothing chosen", () => {
    expect(methodOf("QueryManager")).toBe(SubmissionMethod.QUERY_MANAGER);
    expect(methodOf("Agency form")).toBe(SubmissionMethod.ONLINE_FORM);
    expect(methodOf("Online Form")).toBe(SubmissionMethod.ONLINE_FORM);
    expect(methodOf("Post")).toBe(SubmissionMethod.POST);
    expect(methodOf("Other")).toBeNull();
    expect(methodOf(undefined)).toBeNull();
  });
  it("a legacy full-name country reads as its ISO code", () => {
    expect(draftOf({ ...agent("fx-long"), country: "United Kingdom" } as Agent).country).toBe("GB");
  });
  it("the MSWL link is the socials entry", () => {
    const a = { ...agent("fx-long"), socials: [{ platform: "X / Twitter", handle: "@a" }, { platform: "MSWL", handle: "https://mswl.example/a" }] } as Agent;
    expect(draftOf(a).mswl).toBe("https://mswl.example/a");
  });
  it("materials round-trip through the one encoder", () => {
    const stored = buildAgentMaterials({ selected: ["Query letter", "Synopsis", "Sample pages", "Other"], counts: { Synopsis: "2", "Sample pages": "25" }, otherText: "Author photo" });
    const m = matsOf(stored);
    expect(m).toEqual({ ql: true, syn: { on: true, len: 2 }, smp: { on: true, unit: "Pages", qty: 25 }, oth: { on: true, text: "Author photo" } });
    expect(encodeMats(m)).toEqual(stored);
  });
});

describe("the patch — only what changed", () => {
  it("reply time from Unknown to 6 writes the number, and nothing else", () => {
    const { patch } = edit(agent("fx-sparse"), (d) => { d.weeks = 6; });
    expect(patch).toEqual({ responseTimeWeeks: 6 });
  });
  it("⚠️ no road back to Unknown: a draft at the origin never writes absence", () => {
    const a = agent("fx-long");
    const base = draftOf(a);
    const d = { ...base, weeks: null, nrn: null };
    const patch = cardPatch(a, base, d, NOW);
    expect("responseTimeWeeks" in patch, "the patch wrote the origin back").toBe(false);
    expect("noResponseMeansNo" in patch).toBe(false);
  });
  it("a method is written only when one is chosen (ruling 2) — a stored legacy value survives other edits", () => {
    const legacy = { ...agent("fx-long"), submissionMethod: "Other" as SubmissionMethod };
    expect(edit(legacy, (d) => { d.city = "Leeds"; }).patch).toEqual({ city: "Leeds" });
    expect(edit(legacy, (d) => { d.method = SubmissionMethod.POST; }).patch).toEqual({ submissionMethod: SubmissionMethod.POST });
  });
  it("editing the wishlist stamps it checked — in the same write", () => {
    expect(edit(agent("fx-long"), (d) => { d.wishlist = "Gothic, mostly."; }).patch).toEqual({ mswlNotes: "Gothic, mostly.", mswlCheckedAt: NOW });
  });
  it("⚠️ the MSWL entry is rewritten alone — every other social stays, in its place", () => {
    const socials = [{ platform: "X / Twitter", handle: "@a" }, { platform: "Bluesky", handle: "a.bsky" }, { platform: "Instagram", handle: "@ig" }];
    const a = { ...agent("fx-long"), socials } as Agent;
    const { patch } = edit(a, (d) => { d.mswl = "manuscriptwishlist.com/mswl-post/a"; });
    expect(patch.socials).toEqual([...socials, { platform: "MSWL", handle: "https://manuscriptwishlist.com/mswl-post/a" }]);
    for (let i = 0; i < 3; i++) expect(patch.socials![i], "a social was rewritten").toBe(socials[i]);
    expect(socialsWithMswl([...socials, { platform: "MSWL", handle: "x" }], "")).toEqual(socials);
  });
  it("the location clears by deletion, never \"\" (the location law)", () => {
    const { patch } = edit(agent("fx-long"), (d) => { d.city = ""; d.country = ""; });
    expect(patch).toEqual({ city: null, country: null });
    expect(sanitizeAgentPatch(patch).deletes.sort()).toEqual(["city", "country"]);
  });
  it("choosing Open clears the reopening date; closing with a date writes it; Not announced is absence", () => {
    expect(edit(agent("fx-reopen"), (d) => { d.door = "open"; }).patch).toEqual({ submissionStatus: SubmissionStatus.OPEN, reopensOn: null });
    expect(edit(agent("fx-fresh"), (d) => { d.door = "closed"; d.reopens = "2026-12-01"; }).patch)
      .toEqual({ submissionStatus: SubmissionStatus.CLOSED, reopensOn: "2026-12-01" });
    expect(edit(agent("fx-reopen"), (d) => { d.reopens = ""; }).patch).toEqual({ reopensOn: null });
    expect(edit(agent("fx-fresh"), (d) => { d.door = "closed"; }).patch).toEqual({ submissionStatus: SubmissionStatus.CLOSED });
  });
  it("the website is stored through the scheme allowlist", () => {
    expect(edit(agent("fx-sparse"), (d) => { d.website = "agency.co.uk"; }).patch).toEqual({ website: "https://agency.co.uk" });
  });
  it("every patch the editor can build passes the sanitiser", () => {
    const { patch } = edit(agent("fx-long"), (d) => {
      d.name = "Aisha K"; d.city = ""; d.country = "IE"; d.weeks = 9; d.nrn = false; d.method = SubmissionMethod.ONLINE_FORM;
      d.genres = ["Crime"]; d.wishlist = "x"; d.mats = { ...d.mats, oth: { on: true, text: "Photo" } }; d.door = "closed"; d.reopens = "2027-01-04";
    });
    expect(sanitizeAgentPatch(patch).errors).toEqual([]);
  });
});

describe("what is wrong", () => {
  it("a name OR an agency is needed — either alone is enough", () => {
    expect(problemsOf(emptyCardDraft()).name).toBe("A name or an agency is needed");
    expect(problemsOf({ ...emptyCardDraft(), agency: "Rights & Co" }).name).toBeUndefined();
    expect(problemsOf({ ...emptyCardDraft(), name: "Ada" }).name).toBeUndefined();
  });
  it("links and email are checked as typed; blank is fine", () => {
    expect(linkOk("")).toBe(true);
    expect(linkOk("agency.co.uk")).toBe(true);
    expect(linkOk("https://www.agency.co.uk/subs")).toBe(true);
    expect(linkOk("hale and harrow"), "the mock's own bad link").toBe(false);
    expect(linkOk("agency")).toBe(false);
    expect(hostOf("https://www.agency.co.uk/subs")).toBe("agency.co.uk");
    expect(emailOk("")).toBe(true);
    expect(emailOk("ada@agency.co.uk")).toBe(true);
    expect(emailOk("ada@agency")).toBe(false);
  });
  it("Other ticked and empty waits", () => {
    const d = emptyCardDraft();
    d.name = "Ada";
    d.mats.oth = { on: true, text: "  " };
    expect(problemsOf(d).oth).toBe("Say what the other material is, or untick it");
  });
  it("each field belongs to its tab", () => {
    expect(tabOf("mswl")).toBe("who");
    expect(tabOf("mats")).toBe("want");
    expect(tabOf("reopens")).toBe("work");
  });
});

describe("the lists the inputs offer", () => {
  const agents = [
    { id: "1", agency: "The Lantern Agency", city: "London", responseTimeWeeks: 6 },
    { id: "2", agency: "lantern agency", city: "London", responseTimeWeeks: 9 },
    { id: "3", agency: "Curtis Vane", city: "Bath", responseTimeWeeks: 0 },
    { id: "4", agency: "", city: "" },
  ] as unknown as Agent[];
  it("colleagues: trimmed, case-folded, a leading 'The' ignored (§10)", () => {
    expect(agencyKey(" The Lantern  Agency ")).toBe("lantern agency");
    expect(colleaguesOf("Lantern Agency", agents, "1").map((a) => a.id)).toEqual(["2"]);
    expect(colleaguesOf("", agents, null)).toEqual([]);
  });
  it("their reply time is the rounded mean of STATED windows — a stub 0 is not a window", () => {
    expect(colleagueWeeks(colleaguesOf("lantern agency", agents, null))).toBe(8);
    expect(colleagueWeeks(colleaguesOf("Curtis Vane", agents, null))).toBeNull();
  });
  it("agencies with counts, the busiest first; cities by use", () => {
    expect(agencyOptions(agents)).toEqual([{ name: "The Lantern Agency", count: 2 }, { name: "Curtis Vane", count: 1 }]);
    expect(cityOptions(agents)).toEqual(["London", "Bath"]);
  });
  it("genres: the manuscript's first, then the list's, the writer's own, then the app's — each once", () => {
    expect(genreOptions("Thriller", ["Crime", "thriller"], ["Northern gothic"], ["Crime", "Fantasy"]))
      .toEqual(["Thriller", "Crime", "Northern gothic", "Fantasy"]);
  });
});

describe("the lab's Undo — the inverse of a save puts the record back exactly", () => {
  /* change everything the editor can change, on every fixture agent */
  const everything = (d: ReturnType<typeof draftOf>) => {
    d.name = `${d.name} X`; d.agency = `${d.agency} X`; d.city = d.city ? "" : "Leeds"; d.country = d.country === "IE" ? "" : "IE";
    d.email = "x@y.co"; d.website = "z.co"; d.mswl = d.mswl ? "" : "manuscriptwishlist.com/x"; d.genres = ["Crime"];
    d.wishlist = "W"; d.mats = { ...d.mats, oth: { on: true, text: "Photo" } }; d.weeks = (d.weeks ?? 0) + 3;
    d.nrn = !(d.nrn ?? false); d.method = SubmissionMethod.POST;
    d.door = d.door === "open" ? "closed" : "open"; d.reopens = d.door === "closed" ? "2027-01-04" : "";
  };
  it("every key returns to its earlier value, and a key the record lacked is removed again", () => {
    for (const a of A) {
      const { patch } = edit(a, everything);
      const after = applyPatch(a, patch);
      expect(applyPatch(after, inversePatch(a, patch)), `${a.id}: the undo did not put the record back`).toEqual(a);
    }
  });
  it("every inverse passes the real sanitiser — an Undo the writer cannot store is no Undo", () => {
    for (const a of A) {
      const { patch } = edit(a, everything);
      expect(sanitizeAgentPatch(inversePatch(a, patch)).errors, a.id).toEqual([]);
    }
  });
  it("a field the save added goes by deletion, never as an empty value", () => {
    const a = agent("fx-sparse");
    const { patch } = edit(a, (d) => { d.weeks = 6; d.nrn = true; });
    expect(inversePatch(a, patch)).toEqual({ responseTimeWeeks: null, noResponseMeansNo: null });
  });
  it("the tabs a save changed — what pulses after it", () => {
    const a = agent("fx-long");
    const base = draftOf(a);
    expect(changedTabs(base, { ...base, city: "Leeds", weeks: 9 })).toEqual(["who", "work"]);
    expect(changedTabs(base, { ...base, genres: ["Crime"] })).toEqual(["want"]);
    expect(changedTabs(base, structuredClone(base))).toEqual([]);
  });
});
