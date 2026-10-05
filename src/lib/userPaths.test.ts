/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 0 of Contact list v13 — a desk-behaviour save must leave every other owner of `todoPrefs`
 * byte-identical. The server half is tests/e2e/rulesProbe.mjs ("desk save by leaf"); this is the
 * local half (the optimistic copy) and the wiring.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { applyUserPaths, deskPrefPaths } from "./userPaths";
import { sliceBetween } from "../test/sliceBetween";

const OTHERS = {
  listView: { view: "board", groupBy: "agent" },
  noteboard: { dismissedExamples: ["x"], order: ["n2", "n1"] },
  manuscripts: { dismissedTiles: ["wordcount"] },
  contacts: { later: { "a1:reply": "2026-11-04" } },
};
const user = {
  id: "u1",
  name: "Writer",
  todoPrefs: { staleMonths: 12, rollForward: true, types: { send: true, decide: true, chase: true, close: true, fix: true }, ...OTHERS },
};
const others = (u: { todoPrefs: Record<string, unknown> }) =>
  JSON.stringify(Object.fromEntries(Object.keys(OTHERS).map((k) => [k, u.todoPrefs[k]])));

describe("applyUserPaths", () => {
  it("sets a leaf, keeps its siblings, and never mutates the input", () => {
    const before = JSON.stringify(user);
    const out = applyUserPaths(user, { "todoPrefs.types.chase": false });
    expect(JSON.stringify(user)).toBe(before);
    expect(out.todoPrefs.types).toEqual({ send: true, decide: true, chase: false, close: true, fix: true });
    expect(out.todoPrefs.staleMonths).toBe(12);
    expect(out.todoPrefs).not.toBe(user.todoPrefs);
  });

  it("creates the maps on the way when they are absent", () => {
    const out = applyUserPaths({ id: "u2" } as Record<string, unknown>, { "todoPrefs.contacts.wishlistEvery": 6 });
    expect(out).toEqual({ id: "u2", todoPrefs: { contacts: { wishlistEvery: 6 } } });
  });

  it("never writes a literal dotted key into the copy", () => {
    const out = applyUserPaths(user, { "todoPrefs.rollForward": false });
    expect(Object.keys(out)).not.toContain("todoPrefs.rollForward");
  });
});

describe("deskPrefPaths — one leaf per control", () => {
  it("maps each field to its own path; a type switch is one path", () => {
    expect(deskPrefPaths({ staleMonths: 6 })).toEqual({ "todoPrefs.staleMonths": 6 });
    expect(deskPrefPaths({ rollForward: false })).toEqual({ "todoPrefs.rollForward": false });
    expect(deskPrefPaths({ types: { chase: false } })).toEqual({ "todoPrefs.types.chase": false });
  });

  it("never names the whole map", () => {
    for (const p of [{ staleMonths: 3 }, { rollForward: true }, { types: { send: false, fix: false } }]) {
      expect(Object.keys(deskPrefPaths(p))).not.toContain("todoPrefs");
    }
  });

  it("a desk save, applied as the app applies it, leaves the other owners byte-identical", () => {
    const patches = [{ staleMonths: 18 }, { rollForward: false }, { types: { close: false } }];
    for (const p of patches) {
      const out = applyUserPaths(user, deskPrefPaths(p));
      expect(others(out), JSON.stringify(p)).toBe(others(user));
    }
  });
});

describe("the settings page saves by leaf", () => {
  const code = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  const src = code(readFileSync(resolve(process.cwd(), "src/components/AccountSettings.tsx"), "utf8"));
  const save = sliceBetween(src, "const saveTodoPref", "savedReceipt(what)", "saveTodoPref's body");

  it("through updateUserPaths(deskPrefPaths(…)), never a todoPrefs map", () => {
    expect(save).toMatch(/updateUserPaths\(deskPrefPaths\(patch\)\)/);
    expect(save).not.toMatch(/todoPrefs\s*:/);
    expect(save).not.toMatch(/updateUserProfile/);
  });

  it("a type switch sends only its own key", () => {
    expect(src).toMatch(/saveTodoPref\(\{ types: \{ \[t\.key\]: v \} \}/);
    expect(src).not.toMatch(/types: \{ \.\.\.prefs\.types/);
  });
});
