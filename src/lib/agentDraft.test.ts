/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the buffered editing model: the clone's read-shims, validation as amended (response
 * weeks optional), and above all the DIFF — that untouched fields never enter the write, and that
 * clearing a stated value deletes the key rather than storing a 0 / false that would read as a
 * decision the writer never made.
 */
import { describe, it, expect } from "vitest";
import {
  draftFromAgent,
  blankDraft,
  legacySocials,
  validateDraft,
  diffDraft,
  isDiffEmpty,
  nrnState,
  nrnSubtitle,
} from "./agentDraft";
import { Agent, SubmissionMethod, SubmissionStatus } from "../types";

const mkAgent = (over: Partial<Agent>): Agent => ({
  id: "a1",
  userId: "u1",
  name: "Rosalind Achebe",
  agency: "Hartley & Co",
  email: "r@hartley.co.uk",
  website: "hartley.co.uk",
  genres: ["Literary"],
  mswlNotes: "",
  submissionStatus: SubmissionStatus.OPEN,
  submissionMethod: SubmissionMethod.EMAIL,
  materialsWanted: [],
  dateAdded: "2026-01-01T00:00:00.000Z",
  lastCheckedDate: "2026-01-01T00:00:00.000Z",
  notes: "",
  ...over,
});

describe("agentDraft · cloning + read-shims", () => {
  it("absent numerics stay absent — nothing is invented", () => {
    const d = draftFromAgent(mkAgent({}));
    expect(d.responseWeeks).toBe("");
    expect(d.starRating).toBeUndefined();
    expect(d.noResponseMeansNo).toBeUndefined();
  });

  it("UNKNOWN collapses to an open door", () => {
    expect(draftFromAgent(mkAgent({ submissionStatus: SubmissionStatus.UNKNOWN })).open).toBe(true);
    expect(draftFromAgent(mkAgent({ submissionStatus: SubmissionStatus.CLOSED })).open).toBe(false);
  });

  it("socials fall back to the legacy discrete fields when `socials` is absent", () => {
    const legacy = mkAgent({ twitter: "@ros", instagram: "ros.reads" });
    expect(legacySocials(legacy)).toEqual([
      { platform: "X (Twitter)", handle: "@ros" },
      { platform: "Instagram", handle: "ros.reads" },
    ]);
    // an explicit socials array wins
    expect(legacySocials(mkAgent({ twitter: "@ros", socials: [{ platform: "Bluesky", handle: "@r.bsky" }] })))
      .toEqual([{ platform: "Bluesky", handle: "@r.bsky" }]);
  });

  it("an unrecognised submissionMethod reads as Other, recovering its description", () => {
    const d = draftFromAgent(mkAgent({ submissionMethod: "QueryManager" as SubmissionMethod, agentNotes: "QueryManager" }));
    expect(d.submissionMethod).toBe("Other");
    expect(d.methodOther).toBe("QueryManager");
  });

  it("a new agent's draft omits all three absence-bearing fields", () => {
    const b = blankDraft("new-1");
    expect(b.starRating).toBeUndefined();
    expect(b.responseWeeks).toBe("");
    expect(b.noResponseMeansNo).toBeUndefined();
    expect(b.open).toBe(true);
    expect(b.submissionMethod).toBe(SubmissionMethod.EMAIL);
  });
});

describe("agentDraft · validation on Done", () => {
  const ok = draftFromAgent(mkAgent({}));

  it("name and agency are required, and route to the Contact tab", () => {
    // NAME **OR** AGENCY (the validation-trap fix): either alone is a complete record; only both
    // empty is blocked. Requiring both trapped an existing agency-only record — unsaveable and
    // unrevertable — even though the app renders exactly that state as valid.
    expect(validateDraft({ ...ok, name: "  " })).toBeNull(); // agency-only saves
    expect(validateDraft({ ...ok, agency: "" })).toBeNull(); // agent-name-only saves
    expect(validateDraft({ ...ok, name: " ", agency: "  " })).toEqual({ tab: "contact", msg: "Give this record an agent name or an agency." });
    // an EXISTING agency-only record opens and re-saves without touching a field
    expect(validateDraft({ ...ok, name: "", agency: "Penhallow Literary" })).toBeNull();
  });

  it("response weeks is validated ONLY when non-empty (amendment A)", () => {
    expect(validateDraft({ ...ok, responseWeeks: "" })).toBeNull();      // not stated is legitimate
    expect(validateDraft({ ...ok, responseWeeks: "8" })).toBeNull();
    expect(validateDraft({ ...ok, responseWeeks: "0" })?.tab).toBe("contact");
    expect(validateDraft({ ...ok, responseWeeks: "six" })?.tab).toBe("contact");
  });

  it("method Other needs its description", () => {
    expect(validateDraft({ ...ok, submissionMethod: "Other", methodOther: "" })?.msg).toMatch(/Other/);
    expect(validateDraft({ ...ok, submissionMethod: "Other", methodOther: "QueryManager" })).toBeNull();
  });
});

describe("agentDraft · the diff is the whole write", () => {
  it("an untouched draft writes nothing at all", () => {
    const a = mkAgent({ starRating: 4, responseTimeWeeks: 8, noResponseMeansNo: true });
    const diff = diffDraft(a, draftFromAgent(a));
    expect(diff.changed).toEqual({});
    expect(diff.deletes).toEqual([]);
    expect(isDiffEmpty(diff)).toBe(true);
  });

  it("only the touched field appears", () => {
    const a = mkAgent({});
    const diff = diffDraft(a, { ...draftFromAgent(a), name: "Rosalind Achebe-Hart" });
    expect(diff.changed).toEqual({ name: "Rosalind Achebe-Hart" });
  });

  it("never writes a value the writer didn't set — an unrated, unstated agent stays that way", () => {
    const a = mkAgent({});
    const diff = diffDraft(a, { ...draftFromAgent(a), email: "new@hartley.co.uk" });
    expect(diff.changed).not.toHaveProperty("starRating");
    expect(diff.changed).not.toHaveProperty("responseTimeWeeks");
    expect(diff.changed).not.toHaveProperty("noResponseMeansNo");
    expect(diff.deletes).toEqual([]);
  });

  it("clearing a stated value DELETES the key — never a 0 or a false", () => {
    const a = mkAgent({ responseTimeWeeks: 8, starRating: 4, noResponseMeansNo: true });
    const d = { ...draftFromAgent(a), responseWeeks: "", starRating: undefined, noResponseMeansNo: undefined };
    const diff = diffDraft(a, d);
    expect(diff.deletes.sort()).toEqual(["noResponseMeansNo", "responseTimeWeeks", "starRating"]);
    expect(diff.changed).not.toHaveProperty("responseTimeWeeks");
    expect(diff.changed).not.toHaveProperty("starRating");
  });

  it("setting them for the first time writes them", () => {
    const a = mkAgent({});
    const diff = diffDraft(a, { ...draftFromAgent(a), responseWeeks: "6", starRating: 5, noResponseMeansNo: false });
    expect(diff.changed).toMatchObject({ responseTimeWeeks: 6, starRating: 5, noResponseMeansNo: false });
    expect(diff.deletes).toEqual([]);
  });

  it("the door migrates off UNKNOWN on the first saved edit", () => {
    const a = mkAgent({ submissionStatus: SubmissionStatus.UNKNOWN });
    // merely opening and saving something else still normalises the door to Open
    expect(diffDraft(a, { ...draftFromAgent(a), name: "X" }).changed.submissionStatus).toBe(SubmissionStatus.OPEN);
    expect(diffDraft(a, { ...draftFromAgent(a), open: false }).changed.submissionStatus).toBe(SubmissionStatus.CLOSED);
  });

  it("method Other writes the label and the description together", () => {
    const a = mkAgent({});
    const diff = diffDraft(a, { ...draftFromAgent(a), submissionMethod: "Other", methodOther: "QueryManager" });
    expect(diff.changed.submissionMethod).toBe("QueryManager");
    expect(diff.changed.agentNotes).toBe("QueryManager");
  });

  it("genres and socials diff by content, not identity", () => {
    const a = mkAgent({ genres: ["Literary"], socials: [{ platform: "Bluesky", handle: "@r" }] });
    expect(isDiffEmpty(diffDraft(a, draftFromAgent(a)))).toBe(true);
    expect(diffDraft(a, { ...draftFromAgent(a), genres: ["Literary", "Crime"] }).changed.genres).toEqual(["Literary", "Crime"]);
    expect(diffDraft(a, { ...draftFromAgent(a), socials: [] }).changed.socials).toEqual([]);
  });

  it("country is diffed as a code, and clearing it writes an empty string (rules accept '')", () => {
    const a = mkAgent({ country: "GB" });
    expect(diffDraft(a, { ...draftFromAgent(a), country: "US" }).changed.country).toBe("US");
    expect(diffDraft(a, { ...draftFromAgent(a), country: "" }).changed.country).toBe("");
  });
});

describe("agentDraft · no-response-means-no tri-state (amendment A)", () => {
  it("unset is its own state — greyed label, never struck, and says so", () => {
    expect(nrnState(undefined)).toBe("unset");
    expect(nrnSubtitle(undefined)).toBe("Not stated.");
  });
  it("the strike grammar begins only once the writer sets false", () => {
    expect(nrnState(false)).toBe("off");
    expect(nrnSubtitle(false)).toBe("Worth chasing, even if the response window has elapsed.");
  });
  it("true reads as the pass", () => {
    expect(nrnState(true)).toBe("on");
    expect(nrnSubtitle(true)).toBe("Past the window, treat silence as a pass.");
  });
});
