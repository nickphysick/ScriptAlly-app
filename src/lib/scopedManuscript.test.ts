/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE SELECTED MANUSCRIPT (manuscript-scope B1) — the pack's ONE stored value.
 *
 * It is stored because it is a PREFERENCE: nothing in the data says which book you want to look
 * at. Everything derived FROM it stays derived; there are no per-manuscript counters.
 */
import { describe, it, expect } from "vitest";
import { mostRecentlyCreated, resolveScopedManuscript } from "./shellSidebar";

const m = (id: string, createdDate?: string) => ({ id, createdDate });

describe("resolveScopedManuscript", () => {
  const three = [m("a", "2026-01-01"), m("b", "2026-06-01"), m("c", "2026-03-01")];

  it("honours a stored id that still resolves", () => {
    expect(resolveScopedManuscript(three, "c")?.id).toBe("c");
  });

  it("⚠️ falls back when the stored id names a DELETED manuscript — never throws", () => {
    expect(resolveScopedManuscript(three, "gone")?.id).toBe("b"); // newest
  });

  it("falls back when nothing is stored", () => {
    expect(resolveScopedManuscript(three, null)?.id).toBe("b");
    expect(resolveScopedManuscript(three, undefined)?.id).toBe("b");
    expect(resolveScopedManuscript(three, "")?.id).toBe("b");
  });

  it("no manuscripts yields null rather than throwing", () => {
    expect(resolveScopedManuscript([], "a")).toBeNull();
    expect(resolveScopedManuscript([], null)).toBeNull();
  });

  it("⚠️ IDENTITY IS BY ID — a matching TITLE is not a match", () => {
    const byTitle = [{ id: "x1", title: "Tidewrack" }, { id: "x2", title: "Tidewrack" }];
    // two books may share a title; a stored title must never resolve either of them
    expect(resolveScopedManuscript(byTitle, "Tidewrack")?.id).toBe("x1"); // the fallback, not a match
  });
});

describe("mostRecentlyCreated — the default", () => {
  it("picks the newest by createdDate", () => {
    expect(mostRecentlyCreated([m("a", "2026-01-01"), m("b", "2026-06-01")])?.id).toBe("b");
  });

  it("⚠️ an UNDATED row never displaces a dated one — legacy rows lack createdDate", () => {
    expect(mostRecentlyCreated([m("old", "2026-01-01"), m("legacy")])?.id).toBe("old");
    expect(mostRecentlyCreated([m("legacy"), m("old", "2026-01-01")])?.id).toBe("old");
  });

  it("all undated falls back to the first, stably", () => {
    expect(mostRecentlyCreated([m("one"), m("two")])?.id).toBe("one");
  });

  it("an unparseable date is treated as undated, not as epoch zero", () => {
    expect(mostRecentlyCreated([m("junk", "not-a-date"), m("real", "2020-01-01")])?.id).toBe("real");
  });

  it("empty yields null", () => { expect(mostRecentlyCreated([])).toBeNull(); });
});
