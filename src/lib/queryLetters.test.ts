/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query letters v1 — the one "in use" reader, the Original-rule credit (by derivation), the package-letter line and
 * the 15-sent threshold.
 */
import { describe, it, expect } from "vitest";
import { ComponentType, QueryStatus } from "../types";
import type { Manuscript, ManuscriptVersion, Query, SubmissionPackage } from "../types";
import {
  LETTER_MIN_SENT, changedLine, earlierUnrecorded, firstLetterNote, howSure, inUseLetter, letterFacts, lettersTitle, packageLetterDiffers, resolveLetters,
} from "./queryLetters";

const ms = (x: Partial<Manuscript> = {}) => ({ id: "m1", activePackageId: undefined, inUseLetterId: undefined, ...x }) as Manuscript;
const L = (id: string, created: string, x: Partial<ManuscriptVersion> = {}) =>
  ({ id, manuscriptId: "m1", userId: "u", componentType: ComponentType.QUERY_LETTER, versionName: id, fileAttached: false, createdDate: created, ...x }) as ManuscriptVersion;
const P = (id: string, ql: string) => ({ id, manuscriptId: "m1", userId: "u", packageName: id, queryLetterVersionId: ql, synopsisVersionId: "", samplePagesVersionId: "", createdDate: "2026-01-01" }) as SubmissionPackage;
const Q = (id: string, sent: string, x: Partial<Query> = {}) => ({ id, manuscriptId: "m1", userId: "u", agentId: "a", status: QueryStatus.QUERIED, dateSent: sent, ...x }) as Query;

describe("inUseLetter — stored, else the active package's, else the newest live", () => {
  const vs = [L("a", "2026-01-01"), L("b", "2026-02-01"), L("c", "2026-03-01", { status: "Retired" })];
  it("the stored letter while it is live", () => expect(inUseLetter(ms({ inUseLetterId: "a" }), vs, [])?.id).toBe("a"));
  it("a stored retired letter falls through", () => expect(inUseLetter(ms({ inUseLetterId: "c" }), vs, [])?.id).toBe("b"));
  it("the active package's letter when nothing is stored", () => expect(inUseLetter(ms({ activePackageId: "p" }), vs, [P("p", "a")])?.id).toBe("a"));
  it("else the newest live letter", () => expect(inUseLetter(ms(), vs, [])?.id).toBe("b"));
  it("none when there is no live letter", () => expect(inUseLetter(ms(), [vs[2]], [])).toBeNull());
});

describe("packageLetterDiffers — says so, changes nothing", () => {
  const vs = [L("a", "2026-01-01"), L("b", "2026-02-01")];
  it("the active package holds another letter", () => {
    const d = packageLetterDiffers(ms({ inUseLetterId: "a", activePackageId: "p" }), vs, [P("p", "b")]);
    expect(d?.pkg.id).toBe("p"); expect(d?.letter.id).toBe("b");
  });
  it("the same letter, or no package letter: nothing to say", () => {
    expect(packageLetterDiffers(ms({ inUseLetterId: "b", activePackageId: "p" }), vs, [P("p", "b")])).toBeNull();
    expect(packageLetterDiffers(ms({ inUseLetterId: "a", activePackageId: "p" }), vs, [P("p", "")])).toBeNull();
  });
});

describe("resolveLetters — the Original rule, by derivation", () => {
  const vs = [L("a", "2026-05-01T09:00:00.000Z"), L("b", "2026-08-01T09:00:00.000Z")];
  const qs = [
    Q("early", "2026-04-01T00:00:00.000Z"),
    Q("sameday", "2026-05-01T20:00:00.000Z"),
    Q("later", "2026-06-01T00:00:00.000Z"),
    Q("direct", "2026-09-01T00:00:00.000Z", { sentVersions: ["b"] }),
    Q("nolettersent", "2026-04-01T00:00:00.000Z", { sentVersions: ["syn-1"] }),
  ];
  const r = resolveLetters("m1", qs, vs, []);
  it("unrecorded queries sent on or before the first letter's save day count towards it, marked credited", () => {
    expect(r.get("early")).toEqual({ letterId: "a", credited: true });
    expect(r.get("sameday")).toEqual({ letterId: "a", credited: true });
  });
  it("an unrecorded query after that day counts towards nothing", () => expect(r.get("later")).toBeNull());
  it("a recorded send is its own letter, and a send recorded without a letter is never credited", () => {
    expect(r.get("direct")).toEqual({ letterId: "b", credited: false });
    expect(r.get("nolettersent")).toBeNull();
  });
  it("credit counts in the figures but does not lock the letter (direct)", () => {
    const f = letterFacts(vs[0], qs, r, new Map());
    expect(f.sent).toBe(2); expect(f.direct).toBe(false);
    expect(letterFacts(vs[1], qs, r, new Map()).direct).toBe(true);
  });
  it("the first save's count: unrecorded, not withdrawn", () => {
    expect(earlierUnrecorded("m1", [...qs, Q("w", "2026-04-01", { status: QueryStatus.WITHDRAWN })], [], [])).toBe(3);
  });
});

describe("words", () => {
  it("the title", () => { expect(lettersTitle(1)).toBe("1 query letter"); expect(lettersTitle(4)).toBe("4 query letters"); });
  it("how sure, at 15", () => {
    expect(LETTER_MIN_SENT).toBe(15);
    expect(howSure(14)).toBe("Early days: only 14 sent");
    expect(howSure(15)).toBe("Enough to go on");
  });
  it("what changed", () => {
    expect(changedLine({ changes: ["A", "B"] })).toBe("A; B");
    expect(changedLine({ notes: " note " })).toBe("note");
    expect(changedLine({}, true)).toBe("The first letter");
    expect(changedLine({})).toBe("");
  });
  it("the first letter's note", () => {
    expect(firstLetterNote(12)).toBe("You already have 12 queries out. We'll count them towards this letter. If that's not right, it's easy to change on each query.");
  });
});
