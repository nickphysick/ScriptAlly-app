/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE FIRESTORE BILL'S LOCKS. October cost £38 of Firestore with no live users: our own tooling read
 * the dev database over the internet on every build day. These tests fail when that becomes possible
 * again by default.
 *
 * 1. An emulator build cannot name a real project (src/lib/firebaseTarget.ts, read by firebase.ts
 *    before any SDK is created).
 * 2. Every Node entry point that creates a Firebase app goes through tests/e2e/fsTarget.mjs, whose
 *    default is the emulator and whose live mode needs ALLOW_LIVE_FIRESTORE=1.
 * 3. The browser harness refuses a remote site or a non-emulator bundle without the same opt-in.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { emulatorTargetError, usesEmulators } from "../lib/firebaseTarget";

const ROOT = resolve(__dirname, "../..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");
const code = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");
const parseEnv = (src: string) =>
  Object.fromEntries(
    src.split("\n").map((l) => /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(l)).filter(Boolean).map((m) => [m![1], m![2]]),
  );

describe("the app's target", () => {
  it("refuses an emulator build that names a real project", () => {
    expect(emulatorTargetError({ VITE_USE_EMULATORS: "true", VITE_FIREBASE_PROJECT_ID: "scriptally-dev" })).toMatch(/demo-/);
    expect(emulatorTargetError({ VITE_USE_EMULATORS: "true", VITE_FIREBASE_PROJECT_ID: "gen-lang-client-0801391782" })).toMatch(/demo-/);
    expect(emulatorTargetError({ VITE_USE_EMULATORS: "true", VITE_FIREBASE_PROJECT_ID: undefined })).toMatch(/demo-/);
  });

  it("accepts a demo- project in emulator mode, and says nothing about normal builds", () => {
    expect(emulatorTargetError({ VITE_USE_EMULATORS: "true", VITE_FIREBASE_PROJECT_ID: "demo-scriptally" })).toBeNull();
    expect(emulatorTargetError({ VITE_FIREBASE_PROJECT_ID: "scriptally-dev" })).toBeNull();
    expect(usesEmulators({ VITE_USE_EMULATORS: "false" })).toBe(false);
  });

  it(".env.emulator turns the emulators on and names a demo- project", () => {
    const env = parseEnv(read(".env.emulator"));
    expect(env.VITE_USE_EMULATORS).toBe("true");
    expect(env.VITE_FIREBASE_PROJECT_ID).toMatch(/^demo-/);
    expect(emulatorTargetError(env)).toBeNull();
  });

  it("no other env file turns the emulators on", () => {
    for (const f of [".env.development", ".env.production", ".env.example"]) {
      expect(parseEnv(read(f)).VITE_USE_EMULATORS ?? "", f).not.toBe("true");
    }
  });

  it("firebase.ts checks the target BEFORE creating Firestore, and connects all three emulators", () => {
    const src = code(read("src/lib/firebase.ts"));
    const check = src.indexOf("emulatorTargetError(");
    const create = src.indexOf("initializeFirestore(");
    expect(check).toBeGreaterThan(-1);
    expect(create).toBeGreaterThan(-1);
    expect(check).toBeLessThan(create);
    expect(src).toContain('const emulated = import.meta.env.VITE_USE_EMULATORS === "true";');
    for (const fn of ["connectFirestoreEmulator(", "connectAuthEmulator(", "connectStorageEmulator("]) expect(src).toContain(fn);
  });

  it("firebase.ts uses the persistent cache wherever IndexedDB exists", () => {
    const src = code(read("src/lib/firebase.ts"));
    expect(src).toContain("persistentLocalCache(");
    expect(src).toContain("persistentMultipleTabManager()");
    expect(src).not.toMatch(/\bgetFirestore\(/);
  });

  it("the communityAgents read is keyed on the user's id, not the user object", () => {
    const src = code(read("src/lib/db.tsx"));
    const at = src.indexOf('collection(db, "communityAgents")');
    expect(at).toBeGreaterThan(-1);
    const deps = /\}, \[([^\]]*)\]\);/.exec(src.slice(at))![1];
    expect(deps.trim()).toBe("currentUser?.id");
  });
});

/* ── every Node entry point ─────────────────────────────────────────────────────────────── */

const walk = (dir: string): string[] =>
  readdirSync(resolve(ROOT, dir)).flatMap((n) => {
    const p = join(dir, n);
    if (n === "node_modules" || n.startsWith(".")) return [];
    return statSync(resolve(ROOT, p)).isDirectory() ? walk(p) : [p];
  });
const ENTRY_DIRS = ["tests/e2e", "tests/emulator-seed", "scripts"];
const entries = ENTRY_DIRS.flatMap(walk).filter((f) => /\.(mjs|mts|ts|js|cjs)$/.test(f) && !f.endsWith("fsTarget.mjs"));

describe("every e2e and script entry point carries the live guard", () => {
  const creators = entries.filter((f) => /\binitializeApp\(/.test(code(read(f))));

  it("finds the population it is meant to cover", () => {
    /* ~75 today. A sweep that found none would pass vacuously. */
    expect(creators.length).toBeGreaterThan(60);
  });

  it("every file that creates a Firebase app goes through fsTarget, or only ever names a demo- project", () => {
    const unguarded = creators.filter((f) => {
      const src = code(read(f));
      const viaTarget = /from\s+["'][./]*(?:e2e\/|tests\/e2e\/)?fsTarget\.mjs["']/.test(src) &&
        /\b(targetEnv|requireLiveOptIn|assertTarget)\(/.test(src);
      const demoOnly = [...src.matchAll(/projectId:\s*["']([^"']+)["']/g)].map((m) => m[1]);
      const onlyDemo = demoOnly.length > 0 && demoOnly.every((id) => id.startsWith("demo-")) && !/projectId:\s*[^"'\s]/.test(src);
      return !(viaTarget || onlyDemo);
    });
    expect(unguarded).toEqual([]);
  });

  it("no file that creates an app reads .env.development itself — only fsTarget does, behind the opt-in", () => {
    const readers = creators.filter((f) => /["'`][^"'`]*\.env\.development["'`]/.test(code(read(f))));
    expect(readers).toEqual([]);
  });
});

describe("fsTarget's defaults", () => {
  const saved = process.env.ALLOW_LIVE_FIRESTORE;
  afterEach(() => {
    if (saved === undefined) delete process.env.ALLOW_LIVE_FIRESTORE;
    else process.env.ALLOW_LIVE_FIRESTORE = saved;
  });

  it("targets the emulator unless the opt-in is set, and refuses a real project without it", async () => {
    delete process.env.ALLOW_LIVE_FIRESTORE;
    const t = await import("../../tests/e2e/fsTarget.mjs");
    expect(t.targetEnv().VITE_FIREBASE_PROJECT_ID).toBe("demo-scriptally");
    expect(() => t.assertTarget("scriptally-dev")).toThrow(/ALLOW_LIVE_FIRESTORE=1/);
    expect(() => t.requireLiveOptIn("scriptally-dev")).toThrow(/ALLOW_LIVE_FIRESTORE=1/);
    expect(() => t.assertTarget("demo-scriptally")).not.toThrow();
  });

  it("refuses production even with the opt-in", async () => {
    process.env.ALLOW_LIVE_FIRESTORE = "1";
    const t = await import("../../tests/e2e/fsTarget.mjs");
    expect(() => t.assertTarget("gen-lang-client-0801391782")).toThrow(/production/);
    expect(() => t.assertTarget("scriptally-dev")).not.toThrow();
  });
});

describe("the browser harness", () => {
  it("playwright.config refuses a remote site without the opt-in", () => {
    const src = code(read("playwright.config.ts"));
    expect(src).toContain("(localhost|127");
    expect(src).toContain('process.env.ALLOW_LIVE_FIRESTORE !== "1"');
  });

  it("bundleGuard refuses a remote site and a non-emulator bundle without the opt-in", () => {
    const src = code(read("tests/e2e/bundleGuard.ts"));
    expect(src).toContain('process.env.ALLOW_LIVE_FIRESTORE === "1"');
    expect(src).toContain("bundle.includes(EMULATOR_PROJECT_ID)");
    expect(src).toContain('EMULATOR_PROJECT_ID = "demo-scriptally"');
  });

  it("auth.setup and ensureSignedIn both pass through bundleGuard", () => {
    expect(code(read("tests/e2e/auth.setup.ts"))).toContain("await assertLocalBundleIsDev()");
    expect(code(read("tests/e2e/measure.ts"))).toContain("await assertLocalBundleIsDev()");
  });
});
