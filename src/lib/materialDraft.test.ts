/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The material modal's pure half.
 *
 * ⚠️ THE PAYLOAD CASES ARE THE POINT. A modal that writes the right fields and forgets to clear the
 * other mode's leaves a record that lies — "Text · 412 words" about a material whose content is now
 * a filename — and nothing errors, so only a test catches it.
 */
import { describe, it, expect } from "vitest";
import {
  MODE_TO_CONTENT_TYPE, modeOf, suggestName, countWords, sourceLabel,
  createPayload, updatePayload, canBuildPackage, typeTiles, ofType,
} from "./materialDraft";
import { ComponentType } from "../types";
import type { ManuscriptVersion } from "../types";

const v = (over: Partial<ManuscriptVersion> = {}): ManuscriptVersion => ({
  id: "v1", manuscriptId: "m1", userId: "u1",
  componentType: ComponentType.QUERY_LETTER, versionName: "Hook-first",
  fileAttached: false, createdDate: "2026-08-01T00:00:00.000Z",
  ...over,
});

describe("modes", () => {
  it("maps the three UI modes onto stored content types", () => {
    expect(MODE_TO_CONTENT_TYPE).toEqual({ paste: "text", file: "file", ref: "ref" });
  });

  it("reads a stored material back into its mode", () => {
    expect(modeOf(v({ contentType: "text" }))).toBe("paste");
    expect(modeOf(v({ contentType: "ref" }))).toBe("ref");
    expect(modeOf(v({ contentType: "file" }))).toBe("file");
  });

  /* ⚠️ A LEGACY `link` RECORD OPENS AS `ref` — the closest live mode — but nothing rewrites it
     unless the writer saves. `link` is not deleted from the model; it simply has no UI any more. */
  it("opens a legacy link record as ref without rewriting it", () => {
    expect(modeOf(v({ contentType: "link" }))).toBe("ref");
  });

  it("treats a pre-contentType attachment as file", () => {
    expect(modeOf(v({ fileAttached: true }))).toBe("file");
  });

  it("defaults to paste when nothing is recorded", () => {
    expect(modeOf(v())).toBe("paste");
  });
});

describe("suggestName", () => {
  it("offers the first unused suggestion for the type", () => {
    expect(suggestName(ComponentType.QUERY_LETTER, [])).toBe("Hook-first");
    expect(suggestName(ComponentType.QUERY_LETTER, [v({ versionName: "Hook-first" })])).toBe("Comps-forward");
  });

  it("falls back to a numbered name once the ladder is exhausted", () => {
    const used = ["One-page", "Two-page"].map((n) => v({ componentType: ComponentType.SYNOPSIS, versionName: n }));
    expect(suggestName(ComponentType.SYNOPSIS, used)).toBe("Synopsis 3");
  });

  /* ⚠️ IT COUNTS THIS TYPE'S OWN MATERIALS. "Synopsis 3" beside two synopses is right; beside two
     covering letters it would be a number out of nowhere. */
  it("counts only its own type", () => {
    const letters = [v({ versionName: "A" }), v({ versionName: "B" })];
    expect(suggestName(ComponentType.SYNOPSIS, letters)).toBe("One-page");
  });
});

describe("countWords", () => {
  it("counts whitespace-separated runs", () => {
    expect(countWords("one two three")).toBe(3);
    expect(countWords("  padded   out  ")).toBe(2);
    expect(countWords("line\nbreaks\tcount")).toBe(3);
  });

  it("is zero for empty and whitespace-only", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("   \n  ")).toBe(0);
  });
});

describe("sourceLabel — the register's detail line, per the ref", () => {
  it("reads a pasted material from its stored count", () => {
    expect(sourceLabel(v({ contentType: "text", wordCount: 412 }))).toBe("Text · 412 words");
  });

  it("agrees with its noun at one word", () => {
    expect(sourceLabel(v({ contentType: "text", wordCount: 1 }))).toBe("Text · 1 word");
  });

  /* ⚠️ A LEGACY RECORD HAS NO STORED COUNT AND MUST NOT READ AS EMPTY. Falling back to counting the
     draft is what stops a pre-Phase-1 material showing a bare "Text" as though it had no content. */
  it("falls back to counting the draft when no count is stored", () => {
    expect(sourceLabel(v({ contentType: "text", contentDraft: "four little words here" }))).toBe("Text · 4 words");
  });

  it("says Text alone when there is genuinely nothing", () => {
    expect(sourceLabel(v({ contentType: "text" }))).toBe("Text");
  });

  it("names the file for a ref material", () => {
    expect(sourceLabel(v({ contentType: "ref", fileName: "comps-forward-v1.docx" })))
      .toBe("Ref · comps-forward-v1.docx");
  });

  it("labels an attached file", () => {
    expect(sourceLabel(v({ contentType: "file", fileName: "murphy-ch1-3.docx" })))
      .toBe("murphy-ch1-3.docx · attached");
  });
});

describe("createPayload", () => {
  /* ⚠️ ABSENT KEYS ARE OMITTED, NEVER undefined — addVersion spreads straight into setDoc and
     Firestore rejects undefined inside a map, failing the WHOLE write. */
  it("omits the keys a ref material has no answer for", () => {
    const p = createPayload({ type: ComponentType.SYNOPSIS, name: "One-page", mode: "ref", text: "", refName: "syn.docx" }, "m1");
    expect(Object.keys(p)).not.toContain("wordCount");
    expect(Object.keys(p)).not.toContain("contentDraft");
    expect(p.fileName).toBe("syn.docx");
    expect(p.contentType).toBe("ref");
  });

  it("stores the body and its count for a pasted material", () => {
    const p = createPayload({ type: ComponentType.QUERY_LETTER, name: "Hook", mode: "paste", text: "a b c", refName: "" }, "m1");
    expect(p.contentDraft).toBe("a b c");
    expect(p.wordCount).toBe(3);
    expect(p.fileAttached).toBe(false);
  });

  it("falls back to the type label when the name is blank", () => {
    const p = createPayload({ type: ComponentType.SYNOPSIS, name: "   ", mode: "ref", text: "", refName: "x.docx" }, "m1");
    expect(p.versionName).toBe("Synopsis");
  });

  it("gives a ref material a filename rather than an empty string", () => {
    const p = createPayload({ type: ComponentType.SYNOPSIS, name: "S", mode: "ref", text: "", refName: "  " }, "m1");
    expect(p.fileName).toBe("untitled.docx");
  });

  it("carries the manuscript through", () => {
    expect(createPayload({ type: ComponentType.SYNOPSIS, name: "S", mode: "paste", text: "", refName: "" }, "ms-7").manuscriptId).toBe("ms-7");
  });
});

describe("updatePayload — a mode switch clears the other mode", () => {
  /* ⚠️ THE CASE THAT MATTERS. Without the unset, the register goes on reporting "Text · 412 words"
     about a material whose content is now a filename, and nothing errors. */
  it("clears the body and count when a pasted material becomes name-only", () => {
    const { set, unset } = updatePayload({ type: ComponentType.QUERY_LETTER, name: "Hook", mode: "ref", text: "old body", refName: "hook.docx" });
    expect(set.contentType).toBe("ref");
    expect(set.fileName).toBe("hook.docx");
    expect(unset).toContain("contentDraft");
    expect(unset).toContain("wordCount");
    expect(Object.keys(set)).not.toContain("contentDraft");
  });

  it("clears the filename when a name-only material becomes pasted", () => {
    const { set, unset } = updatePayload({ type: ComponentType.QUERY_LETTER, name: "Hook", mode: "paste", text: "one two", refName: "old.docx" });
    expect(set.contentDraft).toBe("one two");
    expect(set.wordCount).toBe(2);
    expect(unset).toContain("fileName");
  });

  it("recounts on every save, so an edited body cannot keep a stale count", () => {
    expect(updatePayload({ type: ComponentType.QUERY_LETTER, name: "H", mode: "paste", text: "a b c d", refName: "" }).set.wordCount).toBe(4);
  });

  it("never puts a key in both halves", () => {
    for (const mode of ["paste", "ref", "file"] as const) {
      const { set, unset } = updatePayload({ type: ComponentType.QUERY_LETTER, name: "H", mode, text: "x", refName: "y.docx" });
      for (const k of unset) expect(Object.keys(set), `${mode}: ${k} is both set and unset`).not.toContain(k);
    }
  });
});

describe("canBuildPackage — D4's gate, derived", () => {
  const letter = v({ componentType: ComponentType.QUERY_LETTER });
  const syn = v({ id: "v2", componentType: ComponentType.SYNOPSIS });
  const sample = v({ id: "v3", componentType: ComponentType.SAMPLE_PAGES });

  it("is closed with nothing", () => expect(canBuildPackage([])).toBe(false));
  it("is closed with only a letter", () => expect(canBuildPackage([letter])).toBe(false));
  it("is closed with only a synopsis", () => expect(canBuildPackage([syn])).toBe(false));
  it("opens with one of each", () => expect(canBuildPackage([letter, syn])).toBe(true));

  /* the sample is optional — it neither opens nor closes the gate */
  it("is not opened by a sample", () => expect(canBuildPackage([sample])).toBe(false));
  it("stays open with a sample as well", () => expect(canBuildPackage([letter, syn, sample])).toBe(true));

  /* ⚠️ DERIVED, NOT STORED: lose the last synopsis and the gate closes again, with nothing to clear. */
  it("closes again when the last synopsis goes", () => {
    expect(canBuildPackage([letter, syn])).toBe(true);
    expect(canBuildPackage([letter])).toBe(false);
  });
});

describe("typeTiles", () => {
  it("offers exactly the three builder types with their held counts", () => {
    const tiles = typeTiles([v(), v({ id: "v2" }), v({ id: "v3", componentType: ComponentType.SYNOPSIS })]);
    expect(tiles.map((t) => t.type)).toEqual([
      ComponentType.QUERY_LETTER, ComponentType.SYNOPSIS, ComponentType.SAMPLE_PAGES,
    ]);
    expect(tiles.map((t) => t.held)).toEqual([2, 1, 0]);
  });

  /* the standing law — a full manuscript is not a package material */
  it("never offers Full Manuscript", () => {
    expect(typeTiles([]).map((t) => t.type)).not.toContain(ComponentType.FULL_MANUSCRIPT);
  });

  it("labels from TYPE_META, so the UK display copy holds", () => {
    expect(typeTiles([])[0].label).toBe("Covering letter");
  });

  it("ofType filters to one type", () => {
    expect(ofType([v(), v({ id: "v2", componentType: ComponentType.SYNOPSIS })], ComponentType.SYNOPSIS)).toHaveLength(1);
  });
});
