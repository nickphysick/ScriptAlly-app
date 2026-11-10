/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Log a query v1.1 Phase 3 — the edit layer's pure core: what counts as a change, and what Save hands the page.
 */
import { describe, expect, it } from "vitest";
import { changedKeys, changeWords, draftOf, editsOf, type AgentDetails, type CardEditData } from "./QcCardEdit152";

const DET: Record<string, AgentDetails> = {
  a1: { weeks: 8, nrmn: true, asks: ["Query letter", "Synopsis"], method: "Email", wishlist: "Sea stories", email: "a@x.com", website: "" },
  a2: { weeks: null, nrmn: null, asks: [], method: null, wishlist: "", email: "", website: "" },
};
const data: CardEditData = {
  agentId: "a1",
  agents: [{ id: "a1", name: "Marcus Reed", agency: "Hartley & Co" }, { id: "a2", name: "Rosalind Achebe", agency: null }],
  detailsOf: (id) => DET[id] ?? null,
  notes: [{ id: "n1", text: "Met at Bath", when: "12 Oct" }, { id: "n2", text: "Follow up", when: "2 Nov" }],
};

describe("the edit layer's draft", () => {
  it("starts with no changes", () => {
    const d = draftOf(data);
    expect(changedKeys(d, data)).toEqual([]);
    const e = editsOf(d, data);
    expect(e.agentId).toBeNull();
    expect(e.details).toEqual({});
    expect(e.notes).toEqual({ updated: [], deleted: [], added: [] });
  });
  it("counts each detail once, and hands back only what changed", () => {
    const d = draftOf(data);
    d.details = { ...d.details, weeks: 12, asks: ["Query letter"], wishlist: "Sea stories " };
    expect(changedKeys(d, data)).toEqual(["weeks", "asks"]);
    expect(editsOf(d, data).details).toEqual({ weeks: 12, asks: ["Query letter"] });
    expect(changeWords(2)).toBe("2 unsaved changes");
    expect(changeWords(1)).toBe("1 unsaved change");
  });
  it("a move to another agent is one change, and the details shown are that agent's", () => {
    const d = { ...draftOf(data), agentId: "a2", base: DET.a2, details: { ...DET.a2 } };
    expect(changedKeys(d, data)).toEqual(["agent"]);
    const e = editsOf(d, data);
    expect(e.agentId).toBe("a2");
    expect(e.detailsAgentId).toBe("a2");
  });
  it("notes: an edit, a deletion (by Delete or by emptying) and an addition; a blank new note is nothing", () => {
    const d = draftOf(data);
    d.notes = [{ id: "n1", text: "Met at Bath festival" }, { id: "n2", text: "  " }, { id: null, text: "New one" }, { id: null, text: "" }];
    expect(changedKeys(d, data)).toEqual(["notes"]);
    expect(editsOf(d, data).notes).toEqual({ updated: [{ id: "n1", text: "Met at Bath festival" }], deleted: ["n2"], added: ["New one"] });
    const g = draftOf(data);
    g.notes = [{ id: "n1", text: "Met at Bath", gone: true }, { id: "n2", text: "Follow up" }];
    expect(editsOf(g, data).notes.deleted).toEqual(["n1"]);
    const blank = draftOf(data);
    blank.notes = [...blank.notes, { id: null, text: "  " }];
    expect(changedKeys(blank, data)).toEqual([]);
  });
});
