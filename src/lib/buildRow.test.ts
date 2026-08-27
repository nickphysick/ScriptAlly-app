import { describe, it, expect } from "vitest";
import { suggestedName, duplicateOf, blockedReason, type Slots } from "./buildRow";
import type { SubmissionPackage } from "../types";

const S = (over: Partial<Slots> = {}): Slots => ({ let: null, syn: null, ver: null, ...over });
const fill = (id: string, name: string) => ({ id, name });
const pkg = (id: string, l: string, sy: string, v?: string): SubmissionPackage =>
  ({ id, userId: "u", manuscriptId: "m1", packageName: id, queryLetterVersionId: l,
     synopsisVersionId: sy, samplePagesVersionId: "", createdDate: "",
     ...(v ? { bookVersionId: v } : {}) } as SubmissionPackage);

describe("suggestedName", () => {
  it("joins the filled slots in the rail's order", () => {
    expect(suggestedName(S({ let: fill("l", "Hook-first"), ver: fill("v", "Prologue-first") })))
      .toBe("Hook-first · Prologue-first");
  });
  it("⚠️ skips an empty slot rather than naming it", () => {
    const n = suggestedName(S({ let: fill("l", "Hook-first"), ver: fill("v", "Prologue-first") }));
    expect(n).not.toContain(" ·  · ");
  });
  it("is empty when nothing is filled", () => expect(suggestedName(S())).toBe(""));
});

describe("duplicateOf", () => {
  const PKGS = [pkg("p1", "l1", "s1", "v1"), pkg("p2", "l1", "", undefined)];

  it("finds the package holding the same three", () => {
    expect(duplicateOf(S({ let: fill("l1", "A"), syn: fill("s1", "B"), ver: fill("v1", "C") }), PKGS)?.id).toBe("p1");
  });

  it("⚠️ AN EMPTY SLOT IS PART OF THE COMBINATION, not a wildcard", () => {
    /* letter-only matches the letter-only package… */
    expect(duplicateOf(S({ let: fill("l1", "A") }), PKGS)?.id).toBe("p2");
    /* …and NOT the one that also has a synopsis */
    expect(duplicateOf(S({ let: fill("l1", "A") }), [PKGS[0]])).toBeNull();
  });

  it("a different version is a different combination", () => {
    expect(duplicateOf(S({ let: fill("l1", "A"), syn: fill("s1", "B"), ver: fill("v9", "Z") }), PKGS)).toBeNull();
  });

  it("nothing filled matches nothing — an empty build is not a duplicate of a letter-only package", () => {
    expect(duplicateOf(S(), PKGS)).toBeNull();
  });
});

describe("blockedReason", () => {
  it("⚠️ states the reason rather than returning a boolean (D17)", () => {
    expect(blockedReason(S())).toBe("Add a covering letter to continue");
    expect(blockedReason(S({ syn: fill("s", "One-page") }))).toBe("Add a covering letter to continue");
  });
  it("clears the moment a letter is present", () => {
    expect(blockedReason(S({ let: fill("l", "Hook-first") }))).toBeNull();
  });
});
