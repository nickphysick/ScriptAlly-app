/**
 * The test-slot PreToolUse rule (scripts/hooks/pretool-core.mjs). `rootOf` is faked so each case names
 * the checkout it runs in: NEW (has the slot), OLD (a QueryHawk branch from before it), OTHER (not ours).
 */
import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { classify } from "../../scripts/hooks/pretool-core.mjs";

const mk = (slot: boolean, ours = true) => {
  const d = mkdtempSync(join(tmpdir(), "slot-hook-"));
  if (ours) writeFileSync(join(d, "firebase.dev.json"), "{}");
  if (slot) { mkdirSync(join(d, "scripts")); writeFileSync(join(d, "scripts", "heavy-slot.mjs"), ""); }
  return d;
};
const NEW = mk(true), OLD = mk(false), OTHER = mk(false, false);
const opts = { rootOf: (cwd: string) => cwd };
const verdict = (cmd: string, cwd = NEW) => classify(cmd, cwd, opts) as { block: boolean; reason?: string };

describe("the test-slot PreToolUse rule", () => {
  it.each([
    "npx playwright test tests/e2e/qcV141.measure.ts",
    "SA_E2E_BASE_URL=http://127.0.0.1:4321 npx playwright test -g foo",
    "cd /tmp && nice -n 5 playwright test",
    "npx firebase emulators:exec --only firestore 'npx vitest run'",
    "firebase emulators:start",
    "java -jar ~/.cache/firebase/emulators/cloud-firestore-emulator-v1.22.0.jar",
  ])("blocks a direct heavy start: %s", (cmd) => {
    const v = verdict(cmd.replace("cd /tmp && ", ""));
    expect(v.block).toBe(true);
  });

  it.each([
    "git status",
    "npm run e2e:emu -- tests/e2e/foo.measure.ts",
    "npm run test:rules",
    "SA_E2E_BASE_URL=http://127.0.0.1:4321 npx playwright test --list",
    'grep -rn "npx playwright test" tests/e2e',
    "node scripts/emu-guard.mjs firebase emulators:exec --only firestore 'x'",
    "npx tsc --noEmit && npx vite build && npx vitest run",
    "cat > /tmp/x.sh <<'EOF'\nnpx playwright test a\nnpx playwright test b\nEOF",
    "bash tests/e2e/qcV141Mutate.sh",
  ])("allows: %s", (cmd) => {
    expect(verdict(cmd).block).toBe(false);
  });

  it("blocks a heavy npm script or runner on a branch from before the slot", () => {
    for (const cmd of ["npm run e2e:emu", "npm run dev:emu", "npm run test:rules", "bash tests/e2e/qcV141Mutate.sh"]) {
      expect(verdict(cmd, OLD)).toEqual({ block: true, reason: "This branch predates the test slot — merge main first." });
    }
    expect(verdict("npm run build", OLD).block).toBe(false);
  });

  it("follows a cd into another checkout", () => {
    expect(verdict(`cd ${OLD} && npm run e2e:emu`, NEW).block).toBe(true);
    expect(verdict(`cd ${NEW} && npm run e2e:emu`, OLD).block).toBe(false);
  });

  it("blocks repeats: a loop, or the same test twice", () => {
    expect(verdict("for i in 1 2 3; do npm run test:rules; done").reason).toMatch(/^One run at a time/);
    expect(verdict("while true; do npx vitest run src/a.test.ts; done").block).toBe(true);
    expect(verdict("npm run test:rules && npm run test:rules").block).toBe(true);
    expect(verdict("npm run e2e:emu -- a.measure.ts; npm run e2e:emu -- b.measure.ts").block).toBe(true);
    expect(verdict("for f in *.md; do wc -l $f; done").block).toBe(false);
  });

  it("never blocks outside a QueryHawk checkout", () => {
    expect(verdict("npx playwright test", OTHER).block).toBe(false);
    expect(verdict("for i in 1 2; do npm run test:rules; done", OTHER).block).toBe(false);
  });
});
