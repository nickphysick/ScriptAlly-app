/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * switcher v2 · S7 (the source half) — every registry entry is a real binding. Derived from the
 * registry, never from a list written here: each entry names the file that binds it, and that file
 * must read the entry. An entry added with no binding fails, which is the sheet's promise — it lists
 * only shortcuts that exist.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { SHORTCUTS, matchesShortcut, keycaps, shortcutGroups, type ShortcutId } from "./shortcuts";

const ROOT = resolve(__dirname, "../..");
const code = (p: string) => readFileSync(resolve(ROOT, p), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const ids = Object.keys(SHORTCUTS) as ShortcutId[];

describe("S7 · every registry entry is a real binding", () => {
  it("the registry is not empty, and every entry names a file that exists", () => {
    expect(ids.length).toBeGreaterThan(10);
    for (const id of ids) expect(existsSync(resolve(ROOT, SHORTCUTS[id].bound)), `${id}: ${SHORTCUTS[id].bound}`).toBe(true);
  });
  it("…and that file reads the entry, in code", () => {
    for (const id of ids) {
      const src = code(SHORTCUTS[id].bound);
      expect(src, `${id} is listed on the sheet but ${SHORTCUTS[id].bound} never reads SHORTCUTS.${id}`)
        .toMatch(new RegExp(`SHORTCUTS\\.${id}\\b`));
    }
  });
  it("⚠️ no binding file restates a key the registry owns (the literal comparisons are gone)", () => {
    const retired: [string, RegExp][] = [
      ["src/components/shell/usePalette.tsx", /e\.key\.toLowerCase\(\)\s*===\s*"k"/],
      ["src/components/queryActions/UndoBar.tsx", /e\.key\.toLowerCase\(\)\s*!==\s*"z"/],
      ["src/components/manuscripts/ComparableTitlesPage.tsx", /e\.key\.toLowerCase\(\)\s*!==\s*"n"/],
      ["src/components/todo/TaskPane.tsx", /\/\^\[1-9\]\$\/\.test\(e\.key\)/],
      ["src/lib/taskShortcuts.ts", /case\s+"j"/],
    ];
    for (const [f, re] of retired) expect(code(f), f).not.toMatch(re);
  });
  it("the sheet's groups cover every entry exactly once", () => {
    const listed = shortcutGroups().flatMap((g) => g.items.map((i) => i.id));
    expect([...listed].sort()).toEqual([...ids].sort());
  });
});

describe("matching and keycaps", () => {
  const ev = (key: string, mods: Partial<{ metaKey: boolean; ctrlKey: boolean; altKey: boolean; shiftKey: boolean }> = {}) => ({ key, metaKey: false, ctrlKey: false, altKey: false, ...mods });
  it("a plain chord refuses ⌘, Ctrl and Alt; letters match either case", () => {
    expect(matchesShortcut(SHORTCUTS.switchManuscript, ev("m"))).toBe(true);
    expect(matchesShortcut(SHORTCUTS.switchManuscript, ev("M", { shiftKey: true }))).toBe(true);
    expect(matchesShortcut(SHORTCUTS.switchManuscript, ev("m", { metaKey: true }))).toBe(false);
    expect(matchesShortcut(SHORTCUTS.shortcuts, ev("?", { shiftKey: true }))).toBe(true);
  });
  it("a mod chord needs ⌘ or Ctrl", () => {
    expect(matchesShortcut(SHORTCUTS.search, ev("k", { metaKey: true }))).toBe(true);
    expect(matchesShortcut(SHORTCUTS.search, ev("k", { ctrlKey: true }))).toBe(true);
    expect(matchesShortcut(SHORTCUTS.search, ev("k"))).toBe(false);
  });
  it("a task's choice is any digit 1 to 9", () => {
    expect(["1", "5", "9"].every((d) => matchesShortcut(SHORTCUTS.taskChoice, ev(d)))).toBe(true);
    expect(matchesShortcut(SHORTCUTS.taskChoice, ev("0"))).toBe(false);
  });
  it("keycaps name ⌘ on a Mac and Ctrl elsewhere", () => {
    expect(keycaps(SHORTCUTS.search.chords[0], true)).toEqual(["⌘", "K"]);
    expect(keycaps(SHORTCUTS.search.chords[0], false)).toEqual(["Ctrl", "K"]);
  });
});
