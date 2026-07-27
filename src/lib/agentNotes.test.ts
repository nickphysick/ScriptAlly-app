/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the notes model and — above all — the notePreview denormalisation's BLANKING GUARDS.
 * The failure this exists to prevent: the editor opens, the subcollection hasn't resolved, the
 * recompute sees [] and Done silently wipes a valid preview.
 */
import { describe, it, expect } from "vitest";
import {
  AgentNote,
  FLAT_NOTE_ID,
  computeNotePreview,
  effectiveNotes,
  emptyNotesDraft,
  committedNotes,
  notePreviewWrite,
  resolvePin,
} from "./agentNotes";

const n = (id: string, text: string, createdAt: string): AgentNote => ({ id, text, createdAt });
const older = n("n1", "oldest", "2026-01-01T00:00:00.000Z");
const newer = n("n2", "newest", "2026-03-01T00:00:00.000Z");

describe("agentNotes · computeNotePreview", () => {
  it("prefers the pinned note", () => {
    expect(computeNotePreview([older, newer], "n1")).toBe("oldest");
  });
  it("falls back to the latest when unpinned or the pin dangles", () => {
    expect(computeNotePreview([older, newer])).toBe("newest");
    expect(computeNotePreview([older, newer], "gone")).toBe("newest");
  });
  it("empty list → empty preview", () => {
    expect(computeNotePreview([])).toBe("");
  });
});

describe("agentNotes · notePreviewWrite — the blanking guards", () => {
  it("GUARD 1: an unresolved listener never touches the stored preview", () => {
    // the exact footgun: loaded=false looks identical to "no notes"
    expect(notePreviewWrite({ loaded: false, notes: [], stored: "a valid preview" })).toBeUndefined();
  });

  it("GUARD 2: no change stays out of the diff entirely", () => {
    expect(notePreviewWrite({ loaded: true, notes: [older, newer], stored: "newest" })).toBeUndefined();
  });

  it("GUARD 3: an empty computed preview cannot overwrite a stored one while notes exist", () => {
    // a pinned-but-blank note shouldn't wipe a good preview
    const blank = n("n3", "   ", "2026-04-01T00:00:00.000Z");
    expect(notePreviewWrite({ loaded: true, notes: [blank], pinnedNoteId: "n3", stored: "keep me" })).toBeUndefined();
  });

  it("deleting the LAST note genuinely clears it to \"\"", () => {
    expect(notePreviewWrite({ loaded: true, notes: [], stored: "was here" })).toBe("");
  });

  it("writes the new value when the truth actually changed", () => {
    expect(notePreviewWrite({ loaded: true, notes: [older, newer], stored: "stale" })).toBe("newest");
    expect(notePreviewWrite({ loaded: true, notes: [older, newer], pinnedNoteId: "n1", stored: "newest" })).toBe("oldest");
  });

  it("self-heals a legacy agent with no stored preview at all", () => {
    expect(notePreviewWrite({ loaded: true, notes: [newer], stored: undefined })).toBe("newest");
  });
});

describe("agentNotes · effectiveNotes (buffered adds, deletes and the flat-note migration)", () => {
  const draft = emptyNotesDraft();

  it("the legacy flat note is the OLDEST bubble, timestamped dateAdded", () => {
    const out = effectiveNotes([newer], draft, { flatNote: "from the old field", dateAdded: "2025-06-01T00:00:00.000Z" });
    expect(out.map((x) => x.text)).toEqual(["from the old field", "newest"]);
    expect(out[0].id).toBe(FLAT_NOTE_ID);
  });

  it("once migrated, the flat note is no longer synthesised", () => {
    const out = effectiveNotes([newer], { ...draft, migratedFlat: true }, { flatNote: "from the old field" });
    expect(out.map((x) => x.text)).toEqual(["newest"]);
  });

  it("buffered deletions are SHOWN struck (not removed) and additions land last, marked pending", () => {
    const out = effectiveNotes([older, newer], {
      added: [{ tempId: "t1", text: "just typed", createdAt: "2026-05-01T00:00:00.000Z" }],
      deletedIds: ["n1"],
      migratedFlat: false,
    });
    // the deleted bubble stays visible, struck — so Escape reads as a visible undo
    expect(out.map((x) => x.text)).toEqual(["oldest", "newest", "just typed"]);
    expect(out.find((x) => x.id === "n1")?.pendingDelete).toBe(true);
    expect(out.find((x) => x.id === "t1")?.pending).toBe(true);
  });

  it("committedNotes is what Done will actually leave behind", () => {
    const out = effectiveNotes([older, newer], {
      added: [{ tempId: "t1", text: "just typed", createdAt: "2026-05-01T00:00:00.000Z" }],
      deletedIds: ["n1"],
      migratedFlat: false,
    });
    const after = committedNotes(out);
    expect(after.map((x) => x.text)).toEqual(["newest", "just typed"]);
    expect(after.every((x) => x.pending === undefined && x.pendingDelete === undefined)).toBe(true);
  });

  it("stored notes sort oldest-first regardless of arrival order", () => {
    expect(effectiveNotes([newer, older], draft).map((x) => x.text)).toEqual(["oldest", "newest"]);
  });
});

describe("agentNotes · resolvePin", () => {
  it("keeps a live pin and clears a dangling one", () => {
    expect(resolvePin([older, newer], "n1")).toBe("n1");
    expect(resolvePin([newer], "n1")).toBeUndefined();
    expect(resolvePin([newer], undefined)).toBeUndefined();
  });
});
