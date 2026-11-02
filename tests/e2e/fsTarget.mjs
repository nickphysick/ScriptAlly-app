/**
 * THE ONE PLACE A SCRIPT LEARNS WHICH FIRESTORE IT TALKS TO — and the default costs nothing.
 *
 * Every seed, audit, probe and migrate script under tests/e2e/ (and the Playwright harness through
 * bundleGuard) gets its Firebase config from `targetEnv()`. With no opt-in it answers the LOCAL
 * EMULATOR under the `demo-scriptally` project: `__FIREBASE_DEFAULTS__.emulatorHosts` is set before
 * the caller creates its app, and the web SDK's `getFirestore` / `getAuth` / `getStorage` connect to
 * those hosts by themselves. A `demo-` project id makes the emulator refuse to reach any real one.
 *
 * ⚠️ A LIVE RUN IS OPT-IN, NEVER A DEFAULT: `ALLOW_LIVE_FIRESTORE=1` returns `.env.development`
 * (scriptally-dev) instead. October's £38 of Firestore was this tooling reading the dev database
 * over the internet on every build day; a live run should be a decision someone typed.
 *
 * ⚠️ PROD IS REFUSED EVEN WITH THE OPT-IN. Nothing in tests/e2e has any business there.
 *
 * Usage, replacing the old `const dev = env(".env.development")`:
 *   import { targetEnv } from "./fsTarget.mjs";
 *   const dev = targetEnv();
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const EMULATOR_PROJECT = "demo-scriptally";
export const DEV_PROJECT = "scriptally-dev";
export const PROD_PROJECT = "gen-lang-client-0801391782";
export const EMULATOR_HOSTS = { firestore: "127.0.0.1:8085", auth: "127.0.0.1:9095", storage: "127.0.0.1:9195" }; // firebase.emulator.json

/** True only when someone asked, in this run, to touch real Firestore. */
export function liveAllowed() {
  return process.env.ALLOW_LIVE_FIRESTORE === "1";
}

function parseEnvFile(file) {
  return Object.fromEntries(
    readFileSync(file, "utf8")
      .split("\n")
      .map((l) => /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(l))
      .filter(Boolean)
      .map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")]),
  );
}

/**
 * Throws unless `projectId` is the emulator's, or the dev project with the opt-in set. Every entry
 * point that might name a project passes it through here.
 */
export function assertTarget(projectId) {
  if (projectId === PROD_PROJECT || /^gen-lang-client-/.test(projectId ?? "")) {
    throw new Error(`Refusing: "${projectId}" is production. Nothing under tests/ or scripts/ may touch it.`);
  }
  if ((projectId ?? "").startsWith("demo-")) return;
  if (!liveAllowed()) {
    throw new Error(
      `Refusing to touch real Firestore ("${projectId}"). The default target is the local emulator ` +
      `(npm run e2e:emu, npm run emu:seed). If you really mean the live dev database, say so: ` +
      `ALLOW_LIVE_FIRESTORE=1 <command>.`,
    );
  }
}

/**
 * For the few admin tools under scripts/ that exist to run against a REAL project (a prod backfill
 * Nick runs by hand): a real project still needs the explicit opt-in, but prod is not banned here.
 */
export function requireLiveOptIn(projectId) {
  if ((projectId ?? "").startsWith("demo-")) return;
  if (!liveAllowed()) {
    throw new Error(
      `Refusing to touch real Firestore ("${projectId}") without ALLOW_LIVE_FIRESTORE=1. ` +
      `Live runs are opt-in, never a default.`,
    );
  }
}

/**
 * The Firebase web config for this run. Emulator by default; `.env.development` only with the opt-in.
 * `VITE_FIREBASE_DATABASE_ID` is "" on the emulator so every script's `getFirestore(app)` branch (which
 * auto-connects) is the one taken.
 */
export function targetEnv() {
  if (liveAllowed()) {
    const dev = parseEnvFile(resolve(ROOT, ".env.development"));
    assertTarget(dev.VITE_FIREBASE_PROJECT_ID);
    return dev;
  }
  globalThis.__FIREBASE_DEFAULTS__ = {
    ...(globalThis.__FIREBASE_DEFAULTS__ ?? {}),
    emulatorHosts: { ...EMULATOR_HOSTS },
  };
  /* firebase-admin reads these instead — ASSIGNED, never `??=`: a value left by another spec in the same
     worker (or the shell) could point at a different emulator, someone else's. */
  process.env.FIRESTORE_EMULATOR_HOST = EMULATOR_HOSTS.firestore;
  process.env.FIREBASE_AUTH_EMULATOR_HOST = EMULATOR_HOSTS.auth;
  process.env.FIREBASE_STORAGE_EMULATOR_HOST = EMULATOR_HOSTS.storage;
  return {
    VITE_FIREBASE_API_KEY: "demo-key",
    VITE_FIREBASE_AUTH_DOMAIN: `${EMULATOR_PROJECT}.firebaseapp.com`,
    VITE_FIREBASE_PROJECT_ID: EMULATOR_PROJECT,
    VITE_FIREBASE_STORAGE_BUCKET: `${EMULATOR_PROJECT}.appspot.com`,
    VITE_FIREBASE_MESSAGING_SENDER_ID: "0",
    VITE_FIREBASE_APP_ID: "1:0:web:demo",
    VITE_FIREBASE_MEASUREMENT_ID: "",
    VITE_FIREBASE_DATABASE_ID: "",
  };
}

/** The project this run targets — what the scripts' "dev only" checks compare against. */
export const TARGET_PROJECT = liveAllowed() ? DEV_PROJECT : EMULATOR_PROJECT;

/** The harness password from the environment or .env.local; never printed. */
export function harnessPassword() {
  if (process.env.SA_E2E_PASSWORD) return process.env.SA_E2E_PASSWORD;
  const p = resolve(ROOT, ".env.local");
  return existsSync(p) ? parseEnvFile(p).SA_E2E_PASSWORD ?? null : null;
}
