/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE ADVISORIES THE CI AUDIT GATE ACCEPTS, ONE BY ONE (dependency audit fix v1, 8 Nov 2026).
 *
 * `scripts/audit-gate.mjs` fails CI on any critical or high advisory in the root or in
 * functions/ that is not listed here. Every entry names ONE advisory, in ONE install, for ONE
 * package, with the reason it is accepted and the date it was accepted. There is no wildcard and
 * no severity-wide ignore: a new advisory, even on a listed package, fails the gate.
 *
 * Remove an entry the day its fix lands. The gate prints any entry that no longer matches
 * anything, so a stale one is visible rather than silently widening what is accepted.
 */
export const AUDIT_ALLOWLIST = [
  {
    // vitest 3 pins tinypool ^1.1.1; the fixed tinypool is 2.x, which only vitest 5 uses.
    // Dev only: the test runner, never in the browser bundle or in functions. vitest 5 accepts
    // vite ^6.4, so the upgrade does not need a Vite major; it is deferred to its own pass
    // because it is a major of the test runner across ~680 suites.
    id: "GHSA-5gmw-xhrv-c9v3",
    scope: "root",
    package: "tinypool",
    reason: "Dev-only test runner; fix needs vitest 5 (major), deferred.",
    added: "2026-11-08",
  },
  {
    id: "GHSA-85c8-ppgw-ccpr",
    scope: "root",
    package: "tinypool",
    reason: "Dev-only test runner; fix needs vitest 5 (major), deferred.",
    added: "2026-11-08",
  },
  {
    // @firebase/firestore (12.19.0, the latest firebase 12) pins @grpc/grpc-js ~1.9.0; the fix is
    // 1.13.6+. npm audit's only offered "fix" is a DOWNGRADE to firebase 9.14.0, which is not a
    // fix. grpc-js is Firestore's Node transport: the browser build uses WebChannel, and the app
    // bundle contains no grpc-js. In Node it is reached only by tests and scripts. The advisory
    // concerns a server's getAuthContext, which nothing here calls. Re-check on each firebase bump.
    id: "GHSA-m9gg-hp2v-232j",
    scope: "root",
    package: "@grpc/grpc-js",
    reason: "Pinned ~1.9 by @firebase/firestore; no non-downgrade fix; Node-only, not in the app bundle.",
    added: "2026-11-08",
  },
];
