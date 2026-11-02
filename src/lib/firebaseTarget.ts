/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Which backend a build talks to, decided in one pure function so a test can hold it.
 *
 * ⚠️ EMULATOR MODE MAY ONLY EVER NAME A `demo-` PROJECT. The Firebase emulators refuse to reach any
 * real project when the project id starts with `demo-`, so a demo id is what makes "local work costs
 * nothing" true by construction rather than by care. An emulator build that names a real project
 * would connect the emulator hosts while every SDK call that is NOT emulated (Functions, App Check,
 * anything added later) went to that real project. Refused at startup, before any SDK is created.
 */

/* ⚠️ THE e2e EMULATORS HAVE THEIR OWN PORTS (firebase.emulator.json), not firebase.json's 8080/9099/9199:
   those belong to `npm run test:rules` / `test:functions`, which other sessions run, and a long e2e run on
   the same ports would block them (or be blocked) for hours. */
export const EMULATOR_HOSTS = {
  firestore: { host: "127.0.0.1", port: 8085 },
  auth: "http://127.0.0.1:9095",
  storage: { host: "127.0.0.1", port: 9195 },
} as const;

export interface TargetEnv {
  VITE_USE_EMULATORS?: string;
  VITE_FIREBASE_PROJECT_ID?: string;
}

/** True when this build should connect to the local emulators. firebase.ts restates this test inline
 *  (`import.meta.env.VITE_USE_EMULATORS === "true"`) so Vite can fold it; keep the two identical. */
export function usesEmulators(env: TargetEnv): boolean {
  return env.VITE_USE_EMULATORS === "true";
}

/** A message when the build's target is unsafe, else null. */
export function emulatorTargetError(env: TargetEnv): string | null {
  if (!usesEmulators(env)) return null;
  const id = env.VITE_FIREBASE_PROJECT_ID ?? "";
  if (!id.startsWith("demo-")) {
    return `VITE_USE_EMULATORS is true but the project is "${id}". An emulator build must name a demo- project, or calls the emulators do not cover would reach a real one.`;
  }
  return null;
}
