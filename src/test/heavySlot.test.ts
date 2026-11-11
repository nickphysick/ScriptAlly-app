/**
 * The test slot (scripts/heavy-slot.mjs): one heavy job at a time on this Mac. These locks fail when a
 * door into the emulators or Playwright stops going through it.
 */
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("the test slot", () => {
  it("emu-guard takes the slot before it spawns anything, and runs the job niced and capped", () => {
    const src = stripComments(read("scripts/emu-guard.mjs"));
    const take = src.indexOf("await acquire(");
    const spawnAt = src.indexOf("spawn(\"nice\"");
    expect(take).toBeGreaterThan(-1);
    expect(spawnAt).toBeGreaterThan(-1);
    expect(take).toBeLessThan(spawnAt);
    expect(src).toContain('"-n", "10"');
    expect(src).toContain("-Xmx1536m -XX:ActiveProcessorCount=2");
    expect(src).toContain("slot.release()");
  });

  it("emu.mjs takes the slot before the e2e build", () => {
    const src = stripComments(read("scripts/emu.mjs"));
    const take = src.indexOf("await acquire(");
    const build = src.indexOf('"vite", "build"');
    expect(take).toBeGreaterThan(-1);
    expect(build).toBeGreaterThan(take);
  });

  it("npm run e2e goes through the guard", () => {
    const scripts = JSON.parse(read("package.json")).scripts as Record<string, string>;
    expect(scripts.e2e).toMatch(/^node scripts\/emu-guard\.mjs npx playwright test$/);
    expect(scripts["hooks:install"]).toBe("node scripts/hooks/install.mjs");
  });

  it("every tracked .sh runner re-runs itself inside the slot on its second line", () => {
    const files = execFileSync("git", ["ls-files", "*.sh"], { cwd: ROOT, encoding: "utf8" }).split("\n").filter(Boolean);
    const runners = files.filter((f) => /playwright|emu-guard|emulators:/.test(read(f)));
    expect(runners.length).toBeGreaterThan(10); // the population is not empty
    for (const f of runners) {
      const second = read(f).split("\n")[1];
      expect(second, f).toMatch(/^\[ -n "\$\{HEAVY_SLOT_TOKEN:-\}" \] \|\| exec node .*scripts\/heavy-slot\.mjs" run -- (bash|zsh) "\$0" "\$@"/);
    }
  });

  it("Playwright workers default to 1 and can never exceed 2", () => {
    expect(read("playwright.config.ts")).toContain("workers: Math.min(2, Math.max(1, Number(process.env.PW_WORKERS) || 1)),");
  });
});
