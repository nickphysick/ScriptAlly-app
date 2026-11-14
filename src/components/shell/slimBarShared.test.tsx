/**
 * To-do list v56 — the slim bar's frame lifted into `shell/SlimBar`. The Query Centre's bar (QcSlim156) renders through
 * it, and its markup is held byte-identical to the capture taken before the lift (slimBar.fixture.json, written once
 * by slimBarCapture.ts from the pre-lift QcSlim156). The To-do list's bar renders through the same frame.
 * (The frame's API is the one the Contact list's v1.1 session drew in parallel, adopted as-is so the two lines agree.)
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { captureQcSlimStates } from "./slimBarCapture";

const fixture = JSON.parse(readFileSync(resolve(__dirname, "slimBar.fixture.json"), "utf8")) as Record<string, string>;
const src = (f: string) => readFileSync(resolve(__dirname, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

describe("the slim bar's frame is shared", () => {
  it("the Query Centre's bar is byte-identical to its pre-lift capture, in every captured state", () => {
    const now = captureQcSlimStates();
    expect(Object.keys(now).sort()).toEqual(Object.keys(fixture).sort());
    expect(Object.keys(fixture).length).toBe(4);
    for (const k of Object.keys(fixture)) expect(now[k], k).toBe(fixture[k]);
  });
  it("both bars render through shell/SlimBar; neither keeps a reader or a ground measurement of its own", () => {
    for (const f of ["../queries/centre/QcSlim156.tsx", "../todo/ws/WsSlim56.tsx"]) {
      const s = src(f);
      expect(s, f).toMatch(/<SlimBar /);
      expect(s, f).not.toMatch(/useSlimReveal\(|--qc156-bl|ResizeObserver/);
    }
  });
});
