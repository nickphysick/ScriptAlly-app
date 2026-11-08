/**
 * The four paid AI callables are built in one place, `aiCallable`, which initialises App Check first.
 * A second construction elsewhere would send its requests without a token, and the server, which
 * enforces App Check, would refuse them — so the lock is that there is no second one.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const SRC = resolve(process.cwd(), "src");
const files = (d: string): string[] =>
  readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f) ? [p] : [];
  });
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const NAMES = ["smartImportMap", "extractFromEmail", "assistAgentData", "suggestComps"];

describe("aiCallable is the one door (locked)", () => {
  it("no other file builds a callable for an AI function", () => {
    const offenders = files(SRC)
      .filter((p) => !p.endsWith(join("lib", "aiCallable.ts")))
      .filter((p) => {
        const s = strip(readFileSync(p, "utf8"));
        return /httpsCallable\s*[(<]/.test(s) && NAMES.some((n) => s.includes(`"${n}"`));
      });
    expect(offenders).toEqual([]);
  });
  it("it awaits App Check before building the callable", () => {
    const s = strip(readFileSync(join(SRC, "lib", "aiCallable.ts"), "utf8"));
    expect(s.indexOf("await ensureAppCheck()")).toBeGreaterThan(-1);
    expect(s.indexOf("await ensureAppCheck()")).toBeLessThan(s.indexOf("httpsCallable<"));
  });
  it("the debug provider is gated on a non-production build", () => {
    const s = strip(readFileSync(join(SRC, "marketing", "appCheck.ts"), "utf8"));
    expect(s).toMatch(/import\.meta\.env\.MODE !== "production"/);
  });
});
