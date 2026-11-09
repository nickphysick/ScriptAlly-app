/**
 * Add agent v1 Phase 2 — the data: "Agency unknown", the Other method, the duplicate and same-agency skips, the
 * Housekeeping gap, and the rules that let the two new fields through. The rendered behaviour is AA2/AA5 (e2e).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SubmissionMethod, SubmissionStatus, type Agent } from "../types";
import { cardPatch, draftOf, emptyCardDraft, problemsOf } from "./cardDraft";
import { findDuplicateAgent } from "./contactList";
import { agentGaps, GAP_LABEL } from "./contactHousekeeping";
import { appliesTo } from "./listHealth";
import { sanitizeAgentPatch } from "./saveAgentEdits";
import { howTiles } from "./contactCard262";
import { queryViaOf } from "./queryVia";

const agent = (o: Partial<Agent>): Agent => ({
  id: "a1", userId: "u", name: "Sarah Jones", agency: "Harbour Lane", email: "", website: "", genres: [], mswlNotes: "",
  submissionStatus: SubmissionStatus.OPEN, submissionMethod: SubmissionMethod.EMAIL, materialsWanted: [], dateAdded: "2026-10-01",
  lastCheckedDate: "2026-10-01", notes: "", ...o,
} as Agent);

describe("Agency unknown", () => {
  it("is a problem until marked, only when there is a name", () => {
    const d = { ...emptyCardDraft(), name: "sarah jones" };
    expect(problemsOf(d).agency).toBe("Add Sarah’s agency, or mark it unknown");
    expect(problemsOf({ ...d, agencyUnknown: true }).agency).toBeUndefined();
    expect(problemsOf({ ...emptyCardDraft(), agency: "Harbour Lane" }).agency).toBeUndefined();
  });
  it("is written true on a named agent, and cleared when an agency is typed", () => {
    const a = agent({ agency: "" });
    const base = draftOf(a);
    expect(cardPatch(a, base, { ...base, agencyUnknown: true }, "now").agencyUnknown).toBe(true);
    const marked = agent({ agency: "", agencyUnknown: true });
    const b2 = draftOf(marked);
    expect(b2.agencyUnknown).toBe(true);
    const p = cardPatch(marked, b2, { ...b2, agency: "Fenwick", agencyUnknown: false }, "now");
    expect(p.agencyUnknown).toBeNull();
    expect(sanitizeAgentPatch(p).deletes).toContain("agencyUnknown");
  });
  it("is never matched as a duplicate", () => {
    const list = [agent({ id: "x", agency: "", agencyUnknown: true })];
    expect(findDuplicateAgent("Sarah Jones", list)).toBeNull();
    expect(findDuplicateAgent("Sarah Jones", [agent({ id: "y" })])?.id).toBe("y");
  });
  it("is a Housekeeping gap, and counts only for agents it applies to", () => {
    expect(agentGaps(agent({ agency: "", agencyUnknown: true }), { hasReopenTask: false }, [])).toContain("agency");
    expect(agentGaps(agent({}), { hasReopenTask: false }, [])).not.toContain("agency");
    expect(GAP_LABEL.agency).toBe("Agency not known");
    expect(appliesTo("agency", agent({}))).toBe(false);
    expect(appliesTo("agency", agent({ agency: "", agencyUnknown: true }))).toBe(true);
  });
});

describe("the Other method", () => {
  it("reads back as Other with its words, and writes both", () => {
    const a = agent({});
    const base = draftOf(a);
    const p = cardPatch(a, base, { ...base, method: SubmissionMethod.OTHER, methodOther: "Agency portal" }, "now");
    expect(p.submissionMethod).toBe("Other");
    expect(p.submissionMethodOther).toBe("Agency portal");
    const stored = agent({ submissionMethod: SubmissionMethod.OTHER, submissionMethodOther: "Agency portal" });
    expect(draftOf(stored).method).toBe(SubmissionMethod.OTHER);
    expect(draftOf(stored).methodOther).toBe("Agency portal");
    const back = cardPatch(stored, draftOf(stored), { ...draftOf(stored), method: SubmissionMethod.EMAIL }, "now");
    expect(back.submissionMethodOther).toBeNull();
  });
  it("reads 'via {text}' on the card's How tile, or 'via Other' with none", () => {
    const t = howTiles(agent({ submissionMethod: SubmissionMethod.OTHER, submissionMethodOther: "Agency portal" }), "open");
    expect(t.find((x) => x.k === "method")?.bold).toBe("via Agency portal");
    expect(howTiles(agent({ submissionMethod: SubmissionMethod.OTHER }), "open").find((x) => x.k === "method")?.bold).toBe("via Other");
  });
  it("never seeds a query's send method (the query rules' enum)", () => {
    expect(queryViaOf("Other")).toBeNull();
    expect(queryViaOf("Query Manager")).toBe(SubmissionMethod.QUERY_MANAGER);
  });
});

describe("the rules carry the two fields", () => {
  const rules = readFileSync("firestore.rules", "utf8");
  it("validates them and lets an update change them", () => {
    expect(rules).toContain("data.agencyUnknown == true");
    expect(rules).toContain("data.submissionMethodOther.size() <= 40");
    expect(rules).toMatch(/'notePreview', 'agencyUnknown', 'submissionMethodOther'/);
  });
});

describe("a new agent's draft pre-picks nothing it doesn't know", () => {
  it("starts with no door, no method, no rating and no policy", () => {
    const d = emptyCardDraft();
    expect([d.door, d.method, d.rating, d.nrn, d.weeks]).toEqual([null, null, null, null, null]);
    expect(d.social.handle).toBe("");
  });
});
