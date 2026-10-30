/**
 * FV2-I — Dashboard first visit v2, Part I: the event log's own rules. Each event is recorded in EXACTLY ONE place (a
 * source sweep over every logEvent call, comments stripped); the rules' list of names is the app's; and an event
 * carries no prop with no value. The writes through the rules are FV2 I1 (tests/rules/events.rules.test.ts).
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { EVENTS, EVENT_NAMES, buildEvent } from "./events";

const SRC = resolve(__dirname, "..");
const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f) ? [p] : [];
});
const decls = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

describe("FV2-I · each event in exactly one place", () => {
  const calls = new Map<string, string[]>();
  for (const f of files(SRC)) {
    const src = decls(readFileSync(f, "utf8"));
    for (const m of src.matchAll(/logEvent\([^,]+,\s*(?:how === "finished" \? "tour_finished" : "tour_skipped"|"([a-z_]+)")/g)) {
      const names = m[1] ? [m[1]] : ["tour_finished", "tour_skipped"];
      for (const n of names) calls.set(n, [...(calls.get(n) ?? []), f.replace(SRC, "src")]);
    }
  }
  it("every named event is recorded somewhere", () => {
    expect(EVENT_NAMES.filter((n) => !calls.has(n))).toEqual([]);
  });
  it("and in one place only (a file may hold its call more than once only where the one place has two branches)", () => {
    for (const n of EVENT_NAMES) expect(new Set(calls.get(n) ?? []).size, `${n}: ${JSON.stringify(calls.get(n))}`).toBe(1);
  });
  it("no logEvent names an event the list does not", () => {
    expect([...calls.keys()].filter((n) => !(n in EVENTS))).toEqual([]);
  });
});

describe("FV2-I · the rules and the app agree", () => {
  it("the rules' event names are exactly the app's", () => {
    const rules = readFileSync(resolve(SRC, "../firestore.rules"), "utf8");
    const block = rules.slice(rules.indexOf("function isValidEvent(e)"), rules.indexOf("function isValidEvent(e)") + 2500);
    const list = /e\.name in \[([^\]]+)\]/.exec(block)?.[1] ?? "";
    expect(list.split(",").map((x) => x.trim().replace(/'/g, "")).filter(Boolean).sort()).toEqual([...EVENT_NAMES].sort());
  });
});

describe("FV2-I · the document", () => {
  it("has five fields once the server stamps `at`, and drops a prop with no value", () => {
    const e = buildEvent("u1", "tour_skipped", "ready", { stop: 2, step: undefined });
    expect(e).toEqual({ uid: "u1", name: "tour_skipped", path: "ready", props: { stop: 2 } });
  });
});
