/**
 * Stage colours v1 — SC1-1 ONE SOURCE. No file in src/ outside lib/stageColours.ts, the tests, and the allow-list in
 * design-refs/stage-colours-v1/AUDIT.md (each path there with its reason: a colour that does not mean the stage, or an
 * unreachable surface) holds any of the pre-v1 stage hexes. Where a stylesheet must restate a table hex,
 * stageColours.test.ts asserts it equals the table.
 */
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const OLD = "f2ebe0 f3d3c6 d3dce7 cbd9be f7e2da e0e6ee f8e7e0 e7edf4 e5eddf efe8f3 ecd6d2 d9e1ea e7d6dc dfbcb3 c2d0e0 d6bcc7 f1e2bd e4d8ec 8ea7c6 ccd7e5 46668f 7391b5".split(" ");
const HIT = new RegExp(`#(${OLD.join("|")})(?![0-9a-f])`, "i");

const walk = (d: string): string[] => readdirSync(d).flatMap((f) => {
  const p = join(d, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

const allow = (): Set<string> => {
  const audit = readFileSync("design-refs/stage-colours-v1/AUDIT.md", "utf8");
  const block = audit.match(/```allow\n([\s\S]*?)```/)?.[1] ?? "";
  return new Set(block.split("\n").map((l) => l.trim().split(/\s+/)[0]).filter(Boolean));
};

describe("SC1-1 · one source for a stage's colours", () => {
  it("no file outside the table, its tests and the audit's allow-list holds a pre-v1 stage hex", () => {
    const files = walk("src").filter((p) => /\.(tsx?|css|json)$/.test(p) && !/\.test\.tsx?$/.test(p) && p !== "src/lib/stageColours.ts");
    expect(files.length, "files scanned").toBeGreaterThan(200);
    const ok = allow();
    expect(ok.size, "allow-list read from AUDIT.md").toBeGreaterThan(3);
    const hits = files.filter((p) => !ok.has(p)).flatMap((p) => {
      const lines = readFileSync(p, "utf8").split("\n");
      return lines.map((l, i) => (HIT.test(l) ? `${p}:${i + 1} ${l.match(HIT)![0]}` : null)).filter((x): x is string => !!x);
    });
    expect(hits).toEqual([]);
  });
  it("every allow-listed path exists and still holds an old hex (a stale entry is a hole)", () => {
    for (const p of allow()) expect([p, HIT.test(readFileSync(p, "utf8"))]).toEqual([p, true]);
  });
});
