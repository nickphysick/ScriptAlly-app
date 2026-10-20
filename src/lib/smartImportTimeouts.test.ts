import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SMART_IMPORT_CALL_TIMEOUT_MS } from "./smartImport";

const code = (p: string) => readFileSync(join(...p.split("/")), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

// Three clocks govern one Smart Import, and the order is the point: the SERVER gives up first, so
// the writer is shown the server's error; the browser's callable gives up a little later; the
// reading screen's loader last of all. When the loader was 30s and the server 90s, a 40s import
// was shown "couldn't read your file" while the server went on to finish and spend the import.
describe("Smart Import's timeouts run server < callable < loader", () => {
  const server = Number(code("functions/src/smartImport.ts").match(/timeoutSeconds:\s*(\d+)/)![1]) * 1000;
  const loader = Number(code("src/components/onboarding/ScatterSettleLoader.tsx").match(/const TIMEOUT_MS = (\d+)/)![1]);

  it("reads all three", () => {
    expect([server, SMART_IMPORT_CALL_TIMEOUT_MS, loader]).toEqual([300_000, 310_000, 315_000]);
  });
  it("keeps them in that order", () => {
    expect(server).toBeLessThan(SMART_IMPORT_CALL_TIMEOUT_MS);
    expect(SMART_IMPORT_CALL_TIMEOUT_MS).toBeLessThan(loader);
  });
  it("hands the callable its timeout", () => {
    expect(code("src/lib/smartImport.ts")).toMatch(/httpsCallable\([^;]*"smartImportMap",\s*\{\s*timeout:\s*SMART_IMPORT_CALL_TIMEOUT_MS\s*\}\)/);
  });
});
