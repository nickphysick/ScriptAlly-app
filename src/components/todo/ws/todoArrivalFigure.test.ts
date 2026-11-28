/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do arrival v1 · Phase 5 — THE LIST'S FIGURE, TUCKED, AT EVERY WIDTH. Every approved wording splits into "{n} days"
 * and the rest, unchanged; the row draws the two lines; the 360px threshold is gone. (Measured on the page in Phase 6.)
 */
import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

vi.mock("../../../lib/firebase", () => ({ db: {}, auth: {}, OperationType: { GET: "GET", WRITE: "WRITE", DELETE: "DELETE" }, handleFirestoreError: () => {} }));
vi.mock("firebase/firestore", () => ({
  collection: () => ({}), onSnapshot: () => () => {}, orderBy: () => ({}), query: () => ({}), doc: () => ({}), setDoc: async () => undefined,
  deleteField: () => ({}), getDocs: async () => ({ docs: [] }), where: () => ({}), deleteDoc: async () => undefined, writeBatch: () => ({ set() {}, update() {}, delete() {}, commit: async () => undefined }),
}));
const { tuckFigure } = await import("../../../lib/todoArrival");

describe("the figure's words: only the leading days moves up", () => {
  it("every approved wording", () => {
    const cases: [string, string, string, string][] = [
      ["10", "days waiting", "days", "waiting"],
      ["1", "day waiting", "day", "waiting"],
      ["122", "days since your reminder", "days", "since your reminder"],
      ["3", "days since it came in", "days", "since it came in"],
      ["4", "days past its date", "days", "past its date"],
      ["180", "days past expected", "days", "past expected"],
      ["10", "days left", "days", "left"],
      ["40", "days quiet", "days", "quiet"],
    ];
    for (const [n, words, unit, rest] of cases) {
      expect(tuckFigure({ n, words })).toEqual({ n, unit, rest });
      expect(`${n} ${unit} ${rest}`, "the words read the same").toBe(`${n} ${words}`);
    }
    expect(tuckFigure({ n: "Today", words: "" })).toEqual({ n: "Today", unit: "", rest: "" });
  });
});

describe("the row and the sheet", () => {
  const strip = (x: string) => x.replace(/\/\*[\s\S]*?\*\//g, "");
  it("the row draws the number and its unit on one line, the rest under it", () => {
    const ws = readFileSync(join(__dirname, "TodoWorkspace.tsx"), "utf8");
    expect(ws).toContain('<span className="tws-du1"><b>{f.n}</b>{f.unit ? <> <span>{f.unit}</span></> : null}</span>{f.rest ? <small>{f.rest}</small> : null}');
  });
  it("no width threshold: tucked at every tray width, the rest italic at the secondary size", () => {
    const css = strip(readFileSync(join(__dirname, "todoWs58.css"), "utf8"));
    expect(css).not.toMatch(/@container tws581tray \(max-width: 360px\)/);
    expect(css).toContain(".tws .tws-ti .tws-du { flex-direction: column; align-items: flex-end; gap: 1px; }");
    expect(css).toContain(".tws .tws-ti .tws-du small { font: italic var(--sp-sec-size)/1.2 var(--tw-serif); color: var(--sp-quiet); }");
  });
});
