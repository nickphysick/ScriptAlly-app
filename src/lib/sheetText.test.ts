import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { bufferToCsv } from "./sheetText";
import { bufferToCsv as viaSmartImport } from "./smartImport";

const src = readFileSync(join("src", "lib", "sheetText.ts"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

describe("sheetText — the Firebase-free conversion", () => {
  it("imports only SheetJS and the shared cell reader", () => {
    const froms = [...src.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]).sort();
    expect(froms).toEqual(["./sheetCells", "xlsx"]);
    expect(src).not.toMatch(/firebase/i);
  });
  it("is the very function smartImport re-exports, so the harness converts as the app does", () => {
    expect(viaSmartImport).toBe(bufferToCsv);
  });
});
