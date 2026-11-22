/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v54 — the batch's pure half (lib/todoBatch54).
 */
import { describe, expect, it } from "vitest";
import { answerFromAsks, answerToMaterials, asksOf, copyToGaps, emptyAnswer, fillFromAsksAgain, openingView, sameWhy, sampleMismatch, type BatchAnswer } from "./todoBatch54";
import type { Agent } from "../types";

const agent = (materialsWanted: string[]) => ({ id: "a", name: "Jo Bloggs", agency: "Bloggs", materialsWanted } as unknown as Agent);
const DAY = 86400000;

describe("v54 · housekeeping batches", () => {
  it("D9: under 8 opens one at a time, 8 or more the table; a saved choice wins", () => {
    expect(openingView(7, null)).toBe("one");
    expect(openingView(8, null)).toBe("table");
    expect(openingView(14, "one")).toBe("one");
    expect(openingView(3, "table")).toBe("table");
  });
  it("guidelines → asks, sample included; none saved → null", () => {
    const a = asksOf(agent(["Query letter", "Synopsis", "First 3 chapters"]))!;
    expect(a).toMatchObject({ ql: true, syn: true, asksSample: true, sample: { unit: "chapters", amt: 3, sect: false } });
    expect(answerFromAsks(a)).toMatchObject({ ql: true, syn: true, samp: true });
    expect(asksOf(agent([]))).toBeNull();
    expect(answerFromAsks(null)).toEqual(emptyAnswer());
    /* a sample asked for without an amount: asked, not sized */
    expect(asksOf(agent(["Query letter", "Sample pages"]))).toMatchObject({ asksSample: true, sample: null });
  });
  it("D5: 'the same' is within 3 days, or the same saved guidelines", () => {
    const g = asksOf(agent(["Query letter", "First 50 pages"]));
    const h = asksOf(agent(["Query letter"]));
    expect(sameWhy({ sentMs: 0, asks: h }, { sentMs: 3 * DAY, asks: g })).toBe("week");
    expect(sameWhy({ sentMs: 0, asks: g }, { sentMs: 10 * DAY, asks: asksOf(agent(["Query letter", "First 50 pages"])) })).toBe("asks");
    expect(sameWhy({ sentMs: 0, asks: g }, { sentMs: 10 * DAY, asks: h })).toBeNull();
    expect(sameWhy({ sentMs: 0, asks: null }, { sentMs: 10 * DAY, asks: null })).toBeNull();
  });
  it("D6: copying the first row fills empty rows only", () => {
    const full: BatchAnswer = { ...emptyAnswer(), ql: true, syn: true };
    const other: BatchAnswer = { ...emptyAnswer(), ql: true };
    const r = copyToGaps(["a", "b", "c"], { a: full, b: other, c: emptyAnswer() });
    expect(r.answers.b).toEqual(other);
    expect(r.answers.c).toMatchObject({ ql: true, syn: true });
    expect(r.filled).toBe(1);
  });
  it("D6: fill from asks again leaves rows with no guidelines as they were", () => {
    const g = asksOf(agent(["Query letter"]));
    const r = fillFromAsksAgain(["a", "b"], { a: g, b: null }, { a: emptyAnswer(), b: { ...emptyAnswer(), syn: true } });
    expect(r.answers.a.ql).toBe(true);
    expect(r.answers.b).toEqual({ ...emptyAnswer(), syn: true });
    expect(r.missing).toEqual(["b"]);
  });
  it("D8: a differing sample gets the note; a matching one does not", () => {
    const g = asksOf(agent(["Query letter", "First 3 chapters"]));
    const a = answerFromAsks(g);
    expect(sampleMismatch("Jo", g, a)).toBeNull();
    expect(sampleMismatch("Jo", g, { ...a, s: { ...a.s, amt: 5 } })).toBe("Jo’s guidelines ask for first 3 chapters");
  });
  it("the write is the log journey's shape", () => {
    expect(answerToMaterials({ ql: true, syn: false, samp: true, s: { unit: "pages", amt: 37, from: 40, sect: true, fu: "page" } }))
      .toEqual(["Query Letter", { material: "Sample Pages", type: "pages", quantity: 37, from: 40, fromUnit: "page" }]);
    expect(answerToMaterials({ ql: false, syn: true, samp: false, s: emptyAnswer().s })).toEqual(["Synopsis"]);
  });
});
