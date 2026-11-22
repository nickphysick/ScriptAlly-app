/**
 * To-do card thread v1 — the page's activity listener follows the query the open card describes. Measured in
 * tests/e2e/tct1.measure.ts; this holds the wiring and the declaration order a reading can miss.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const SRC = readFileSync(new URL("../Queries.tsx", import.meta.url), "utf8");
const listener = SRC.match(/useEffect\(\(\) => \{\n\s+setTrackingEvents\(\[\]\);[\s\S]*?\}, \[([^\]]*)\]\);/);

describe("To-do card thread v1", () => {
  it("there is one activity listener, and it is keyed on cardQueryId (not only the selected row)", () => {
    expect(SRC.match(/collection\(db, 'users', currentUser\.id, 'queries', \w+, 'activity'\)/g)).toEqual(["collection(db, 'users', currentUser.id, 'queries', cardQueryId, 'activity')"]);
    expect(listener?.[1]).toBe("cardQueryId, currentUser?.id");
  });
  it("it is declared after cardQueryId (both found), so its dependency read is not a TDZ crash", () => {
    const dep = SRC.indexOf("const cardQueryId = extPanel?.id ?? beCard ?? selectedQueryId;");
    const use = SRC.indexOf(listener?.[0] ?? "\u0000");
    expect(dep).toBeGreaterThan(0);
    expect(use).toBeGreaterThan(0);
    expect(dep).toBeLessThan(use);
  });
  it("a change of query empties the events first, so no frame draws one query's log on another's card", () => {
    expect(listener?.[0]).toMatch(/^useEffect\(\(\) => \{\n\s+setTrackingEvents\(\[\]\);\n\s+if \(!currentUser \|\| !cardQueryId\) return undefined;/);
  });
});
