/**
 * AI spend guard v1 — the standing locks over every paid AI callable.
 *
 * 1. Every file in functions/src that builds an Anthropic client is one of the four known callables.
 * 2. Each of them sets `enforceAppCheck: true` on its onCall options.
 * 3. In each, the client is built only AFTER a server-side claim: the daily slot (aiRateLimit.ts) or,
 *    for Smart Import, the entitlement claim transaction.
 *
 * Source is read with comments stripped, so a sentence about a client cannot satisfy a lock.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const DIR = resolve(process.cwd(), "functions/src");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const read = (f: string) => strip(readFileSync(resolve(DIR, f), "utf8"));
const isTest = (f: string) => /\.(test|spec)\.ts$/.test(f);

const CALLABLES: Record<string, { claim: string }> = {
  "smartImport.ts": { claim: "smartImportPending: FieldValue.serverTimestamp()" },
  "emailImport.ts": { claim: 'claimDailySlot(db, uid, "extractFromEmail"' },
  "assistAgentData.ts": { claim: 'claimDailySlot(db, uid, "assistAgentData"' },
  "suggestComps.ts": { claim: 'claimDailySlot(db, uid, "scout"' },
};

describe("AI spend guard (locked)", () => {
  it("only the four known callables build an Anthropic client", () => {
    const builders = readdirSync(DIR)
      .filter((f) => f.endsWith(".ts") && !isTest(f))
      .filter((f) => /new Anthropic\(/.test(read(f)));
    expect(builders.sort()).toEqual(Object.keys(CALLABLES).sort());
  });
  for (const [file, { claim }] of Object.entries(CALLABLES)) {
    it(`${file}: enforces App Check`, () => {
      expect(read(file)).toMatch(/onCall\(\s*\{[^}]*enforceAppCheck:\s*true/);
    });
    it(`${file}: builds its client only after a server-side claim`, () => {
      const src = read(file);
      const at = src.indexOf(claim);
      const builds = [...src.matchAll(/new Anthropic\(/g)].map((m) => m.index ?? -1);
      expect(at, `the claim "${claim}" is missing`).toBeGreaterThan(-1);
      expect(builds.length).toBeGreaterThan(0);
      for (const b of builds) expect(b).toBeGreaterThan(at);
    });
  }
});
