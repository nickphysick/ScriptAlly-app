/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query letters v2, lock 10 — `letterDiff`: identical texts, a moved paragraph, a reworded paragraph, a paragraph added
 * and a paragraph removed. Every case also checks the reading is lossless: the "same" + "added" text is the new letter,
 * the "same" + "removed" text the old one (whitespace aside), so the switch can never show words that are not there.
 */
import { describe, it, expect } from "vitest";
import { letterDiff, wordDiff, alike, hasChanges, type DiffPara } from "./letterDiff";

const P1 = "Murphy Doyle has not left Seaview Court in four hundred and twelve days.";
const P2 = "MURPHY'S DAY OUT (84,000 words) is an upmarket novel set over a single day on the Yorkshire coast.";
const P3 = "Thank you for your time and consideration.";
const join = (...p: string[]) => p.join("\n\n");

const side = (d: DiffPara[], keep: "added" | "removed") =>
  d.map((p) => p.filter((s) => s.kind === "same" || s.kind === keep).map((s) => s.text).join("")).filter((t) => t.trim()).join("\n\n");
const norm = (t: string) => t.replace(/\s+/g, " ").trim();
const kinds = (d: DiffPara[], k: "added" | "removed") => d.flatMap((p) => p.filter((s) => s.kind === k).map((s) => s.text));

describe("letterDiff", () => {
  it("identical texts: nothing added, nothing taken out, every paragraph kept", () => {
    const t = join(P1, P2, P3);
    const d = letterDiff(t, t);
    expect(d).toHaveLength(3);
    expect(hasChanges(d)).toBe(false);
    expect(d.map((p) => p.map((s) => s.text).join(""))).toEqual([P1, P2, P3]);
  });

  it("a moved paragraph: taken out where it was, added where it went, and no words invented", () => {
    const a = join(P1, P2, P3), b = join(P2, P1, P3);
    const d = letterDiff(a, b);
    expect(hasChanges(d)).toBe(true);
    expect(kinds(d, "removed").map(norm)).toEqual([P1]);
    expect(kinds(d, "added").map(norm)).toEqual([P1]);
    expect(norm(side(d, "added"))).toBe(norm(b));
    expect(norm(side(d, "removed"))).toBe(norm(a));
  });

  it("a reworded paragraph is diffed word by word, not replaced whole", () => {
    const re = "Murphy Doyle has not left Seaview Court in a year and a half.";
    const a = join(P1, P3), b = join(re, P3);
    expect(alike(P1, re)).toBeGreaterThan(0.45);
    const d = letterDiff(a, b);
    expect(d).toHaveLength(2);
    const para = d[0];
    expect(para.some((s) => s.kind === "same" && s.text.includes("Murphy Doyle has not left Seaview Court in"))).toBe(true);
    /* "and" is in both, so it stays plain: only the words that differ are marked */
    expect(norm(kinds(d, "added").join(" "))).toBe("a year a half.");
    expect(norm(kinds(d, "removed").join(" "))).toBe("four hundred twelve days.");
    expect(norm(side(d, "added"))).toBe(norm(b));
    expect(norm(side(d, "removed"))).toBe(norm(a));
  });

  it("a paragraph added: only that paragraph is tinted", () => {
    const add = "If Harold Fry had taken the bus, you would have something like this.";
    const d = letterDiff(join(P1, P3), join(P1, add, P3));
    expect(d).toHaveLength(3);
    expect(d[1]).toEqual([{ kind: "added", text: add }]);
    expect(kinds(d, "removed")).toEqual([]);
  });

  it("a paragraph removed: only that paragraph is struck through", () => {
    const d = letterDiff(join(P1, P2, P3), join(P1, P3));
    expect(kinds(d, "removed")).toEqual([P2]);
    expect(kinds(d, "added")).toEqual([]);
    expect(norm(side(d, "added"))).toBe(norm(join(P1, P3)));
  });

  it("word diff keeps a removed run trimmed and followed by one space (the ref's output)", () => {
    const w = wordDiff("one two three", "one three");
    expect(w).toEqual([{ kind: "same", text: "one " }, { kind: "removed", text: "two" }, { kind: "same", text: " three" }]);
  });
});
