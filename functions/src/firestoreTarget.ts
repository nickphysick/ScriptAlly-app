/**
 * firestoreTarget — WHICH Firestore database the Admin SDK should talk to.
 *
 * ⚠️ PURE ON PURPOSE, AND THE PURITY IS LOAD-BEARING. This file imports nothing — above all not
 * `firebase-admin`, which is declared in functions/package.json and is NOT resolvable from the
 * root `npm test` tree. A resolution test that imported the SDK would be red in CI for the exact
 * reason CI was already red when this was written. Same split as waitlistModel/waitlistStore:
 * the decision here, the handle in `firestore.ts`, the SDK only in the latter.
 *
 * ⚠️ THE BUG THIS EXISTS TO PREVENT. `admin.firestore()` resolves to `(default)`. Verified against
 * the API on 26 Aug, not inferred — `firebase firestore:databases:list`:
 *
 *   gen-lang-client-0801391782 (prod)  →  ai-studio-ae82196c-…  ONLY. There is no (default).
 *   scriptally-dev                     →  (default)  ONLY.
 *
 * So every deployed function was asking prod for a database that does not exist, while working
 * perfectly on dev. `extractFromEmail` and `smartImportMap` — the two functions live on prod —
 * both read `users/{uid}` as their first act and have been failing there since they were deployed.
 *
 * ⚠️ AND DEV CANNOT TELL YOU WHETHER THIS IS RIGHT. Dev's database IS `(default)`, so a correct
 * fix, a broken fix and no fix at all are indistinguishable by observation there. Everything here
 * is proven by assertion against a configured value that is NOT `(default)` — never by "it still
 * works on dev".
 */

/**
 * The environment variable naming the database. Mirrors the client's `VITE_FIREBASE_DATABASE_ID`
 * deliberately: two tiers, two mechanisms, both explicit, neither inferred from the other.
 *
 * ⚠️ IT CANNOT BE CALLED `FIREBASE_DATABASE_ID`. firebase-tools reserves the prefixes
 * `X_GOOGLE_`, `FIREBASE_` and `EXT_` and refuses to deploy a function whose .env declares one
 * (lib/functions/env.js, RESERVED_PREFIXES). The rejection is at deploy time, not here.
 */
export const DATABASE_ID_ENV = "FIRESTORE_DATABASE_ID";

/** Firestore's name for the unnamed database. The client uses the same sentinel. */
export const DEFAULT_DATABASE_ID = "(default)";

/**
 * Projects with NO `(default)` database, where resolving to it can only ever be a mistake.
 *
 * ⚠️ THE LIST IS THE POINT. A guard that fires everywhere would break the emulator, CI and any
 * future project; a guard that fires nowhere is the bug. This names the one project where the
 * absence is a verified fact rather than a guess. If prod ever gains a `(default)`, this goes
 * stale in the SAFE direction — a loud throw with instructions, not a silent write to nowhere.
 */
export const PROJECTS_WITHOUT_DEFAULT_DATABASE = ["gen-lang-client-0801391782"] as const;

/**
 * The runtime project id. Cloud Functions sets `GCLOUD_PROJECT` on every deployed function —
 * firebase-tools injects it alongside FIREBASE_CONFIG (lib/functions/env.js, loadFirebaseEnvs),
 * so it is present without anyone configuring it. `GOOGLE_CLOUD_PROJECT` is the Cloud Run name
 * for the same thing and is read as a fallback.
 */
export const projectIdFrom = (env: NodeJS.ProcessEnv): string | null =>
  env.GCLOUD_PROJECT?.trim() || env.GOOGLE_CLOUD_PROJECT?.trim() || null;

export class FirestoreTargetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FirestoreTargetError";
  }
}

/**
 * Resolve the database id, or throw.
 *
 * ⚠️ ONE RULE, TWO WAYS IN: on a project with no `(default)`, the resolved id may not BE
 * `(default)` — whether it got there by the variable being unset, or by the variable being set to
 * `(default)` explicitly. Stating it as a property of the RESULT rather than of the input closes
 * both. The second path is not hypothetical: `.env.development` legitimately says `(default)`, and
 * copying that line into prod's slot is a one-character-perfect mistake that would silently
 * reproduce exactly the bug this file exists to prevent.
 *
 * ⚠️ REFUSING TO START IS THE POINT. A function that throws on load is infinitely better than one
 * that deploys cleanly, answers, logs, and writes nowhere — which is what the two prod functions
 * have been doing. The message names the variable, the project and the value, because whoever
 * meets it will be reading a stack trace in Cloud Logging with no other context.
 */
export const resolveDatabaseId = (env: NodeJS.ProcessEnv): string => {
  const configured = env[DATABASE_ID_ENV]?.trim();
  const databaseId = configured || DEFAULT_DATABASE_ID;
  const projectId = projectIdFrom(env);

  if (
    databaseId === DEFAULT_DATABASE_ID &&
    projectId !== null &&
    (PROJECTS_WITHOUT_DEFAULT_DATABASE as readonly string[]).includes(projectId)
  ) {
    throw new FirestoreTargetError(
      `Project ${projectId} has no "${DEFAULT_DATABASE_ID}" Firestore database, and ` +
        (configured
          ? `${DATABASE_ID_ENV} is set to "${configured}".`
          : `${DATABASE_ID_ENV} is not set, so the Admin SDK would default to it.`) +
        ` Set ${DATABASE_ID_ENV} to the named database in functions/.env.${projectId} and` +
        " redeploy. Refusing to start rather than write to a database that does not exist.",
    );
  }

  return databaseId;
};

/** Whether the resolved id means "call getFirestore without an id". Mirrors src/lib/firebase.ts. */
export const isDefaultDatabase = (databaseId: string): boolean =>
  databaseId === DEFAULT_DATABASE_ID;
