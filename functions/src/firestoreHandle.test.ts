/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Two locks over the Firestore handle. They guard opposite halves of one fault.
 *
 * ⚠️ THE FAULT: `admin.firestore()` resolves to `(default)`, and prod HAS no `(default)` — its
 * only database is `ai-studio-ae82196c-…` (verified 26 Aug with `firebase firestore:databases:list`,
 * both projects). Eight functions called it. The two live on prod, extractFromEmail and
 * smartImportMap, had been failing since deploy.
 *
 * ⚠️ AND DEV CANNOT CATCH IT. Dev's database IS `(default)`, so a correct fix, a broken fix and no
 * fix at all are indistinguishable by observation there. Neither lock below can be satisfied by
 * dev happening to be right: the source lock never runs anything, and the resolution lock
 * configures a value that is NOT `(default)`.
 *
 * ⚠️ NEITHER LOCK IMPORTS `firebase-admin`. It is declared in functions/package.json only and is
 * NOT resolvable from the root `npm test` tree — a test importing it is red in CI, which is
 * exactly why CI was red when this was written. The source lock reads text; the resolution lock
 * imports `./firestoreTarget`, which imports nothing at all.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  DATABASE_ID_ENV, DEFAULT_DATABASE_ID, FirestoreTargetError,
  PROJECTS_WITHOUT_DEFAULT_DATABASE, isDefaultDatabase, resolveDatabaseId,
} from "./firestoreTarget";

/**
 * ⚠️ NOT `import.meta.url`, WHICH DOES NOT COMPILE HERE. functions/tsconfig.json is
 * `module: "commonjs"` and its `include: ["src"]` sweeps test files in, so `tsc -p functions`
 * — which is the PREDEPLOY step in firebase.json — fails with TS1343 on it. Vitest transpiles
 * as ESM and is perfectly happy, so the break is invisible until a deploy. Resolved by search
 * instead, from whichever directory the runner started in, and it fails LOUDLY naming every
 * candidate rather than silently scanning an empty directory.
 */
const HERE = (() => {
  const candidates = ["functions/src", "src", "."].map((c) => resolve(process.cwd(), c));
  const found = candidates.find(
    (c) => existsSync(join(c, "firestore.ts")) && existsSync(join(c, "index.ts")),
  );
  if (!found) throw new Error(`functions/src not found. Looked in: ${candidates.join(", ")}`);
  return found;
})();

/** The module that OWNS the handle. Not an exemption — it is the subject of the rule. */
const HANDLE_MODULE = "firestore.ts";

/**
 * ⚠️ EXEMPT, AND THE SET IS ASSERTED TO BE EXACTLY THIS ONE FILE. `waitlist.emulator.spec.ts` must
 * pin a demo projectId and talk to the Firestore emulator, and it imports no function module, so
 * routing it through the shared handle would buy nothing and couple a harness to production
 * config. Locking the SIZE of the set is the point: without it a second file joins quietly and
 * the rule erodes one exemption at a time.
 */
const EXEMPT = ["waitlist.emulator.spec.ts"];

/**
 * ⚠️ THE SCANNER DOES NOT SCAN ITSELF, AND THAT IS A DIFFERENT THING FROM AN EXEMPTION. This file
 * has to spell the forbidden calls out to search for them, and they sit in regex literals — code,
 * not comments — so stripComments cannot reach them. It flagged itself on the first run, which is
 * the cheapest possible evidence that the detection works. Kept separate from EXEMPT so the
 * "exactly one exemption" assertion below still means what it says.
 */
const SELF = "firestoreHandle.test.ts";

/** ⚠️ COMMENTS FIRST. This repo documents every retirement by quoting what it retired — both new
 *  modules' docblocks say `admin.firestore()` in prose, and so does the paragraph above. A lock
 *  that reads raw source finds the words explaining the ban and reports the ban as broken. */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

const FORBIDDEN: ReadonlyArray<{ what: string; re: RegExp }> = [
  { what: "admin.firestore()", re: /\badmin\s*\.\s*firestore\s*\(\s*\)/ },
  { what: "getFirestore(", re: /\bgetFirestore\s*\(/ },
];

const tsFiles = () => readdirSync(HERE).filter((f) => f.endsWith(".ts"));
const read = (f: string) => readFileSync(join(HERE, f), "utf8");

describe("the Firestore handle has exactly one home", () => {
  it("no file under functions/src builds its own handle", () => {
    const files = tsFiles();
    /* ⚠️ POPULATION FIRST — a negative check over an empty set passes having measured nothing. */
    expect(files.length, "functions/src has .ts files to scan").toBeGreaterThan(10);

    const offenders: string[] = [];
    for (const f of files) {
      if (f === HANDLE_MODULE || f === SELF || EXEMPT.includes(f)) continue;
      const code = stripComments(read(f));
      for (const { what, re } of FORBIDDEN) {
        if (re.test(code)) offenders.push(`${f} calls ${what}`);
      }
    }
    expect(offenders, "import { db } from './firestore' instead").toEqual([]);
  });

  it("the handle module really does build one — the rule is not vacuous", () => {
    const code = stripComments(read(HANDLE_MODULE));
    expect(code).toMatch(/\bgetFirestore\s*\(/);
    /* and it asks the resolver rather than restating a database id of its own */
    expect(code).toContain("resolveDatabaseId");
    expect(code).not.toMatch(/["'`]ai-studio-/);
  });

  it("every function imports the shared handle", () => {
    const consumers = [
      "smartImport.ts", "suggestComps.ts", "assistAgentData.ts", "waitlist.ts",
      "betaFeedback.ts", "contactMessage.ts", "inviteCode.ts", "emailImport.ts",
    ];
    /* ⚠️ RECONCILED AGAINST index.ts RATHER THAN TRUSTED AS A HAND-WRITTEN LIST — a literal here
     * goes stale the day a ninth function is exported, and goes stale silently. */
    const index = stripComments(read("index.ts"));
    const exported = [...index.matchAll(/from\s+"\.\/([A-Za-z0-9_]+)"/g)].map((m) => `${m[1]}.ts`);
    expect(new Set(exported)).toEqual(new Set(consumers));

    for (const f of consumers) {
      expect(stripComments(read(f)), `${f} imports the shared handle`)
        .toMatch(/import\s*\{[^}]*\bdb\b[^}]*\}\s*from\s*"\.\/firestore"/);
    }
  });

  it("the exempt set is exactly one file, and that file still exists", () => {
    expect(EXEMPT).toHaveLength(1);
    expect(tsFiles()).toContain(EXEMPT[0]);
    /* the scanner's self-exclusion is one file too — it is not a second exemption in disguise */
    expect(tsFiles()).toContain(SELF);
    expect(EXEMPT).not.toContain(SELF);
  });
});

describe("the database id is resolved, never assumed", () => {
  const PROD = PROJECTS_WITHOUT_DEFAULT_DATABASE[0];
  const NAMED = "ai-studio-ae82196c-c59e-40b9-b209-9fb02f67ade6";

  it("resolves to the configured value — and the value is not (default)", () => {
    /* ⚠️ THE WHOLE POINT. Dev's database IS "(default)", so a fix that silently kept returning it
     * would pass every observation made on dev. This asserts the resolved id equals a configured
     * value that "(default)" cannot satisfy. */
    expect(NAMED).not.toBe(DEFAULT_DATABASE_ID);
    const resolved = resolveDatabaseId({ [DATABASE_ID_ENV]: NAMED, GCLOUD_PROJECT: PROD });
    expect(resolved).toBe(NAMED);
    expect(isDefaultDatabase(resolved)).toBe(false);
  });

  it("throws when unset in a prod-like environment", () => {
    expect(() => resolveDatabaseId({ GCLOUD_PROJECT: PROD })).toThrow(FirestoreTargetError);
    /* the message has to be actionable from a Cloud Logging stack trace and nothing else */
    expect(() => resolveDatabaseId({ GCLOUD_PROJECT: PROD })).toThrow(DATABASE_ID_ENV);
    expect(() => resolveDatabaseId({ GCLOUD_PROJECT: PROD })).toThrow(PROD);
  });

  it("throws when set to (default) in a prod-like environment", () => {
    /* ⚠️ NOT HYPOTHETICAL: .env.development legitimately reads "(default)", and copying that line
     * into prod's slot reproduces the original bug exactly, with the variable dutifully set. The
     * rule is stated over the RESULT, so both routes in are closed by one clause. */
    expect(() =>
      resolveDatabaseId({ [DATABASE_ID_ENV]: DEFAULT_DATABASE_ID, GCLOUD_PROJECT: PROD }),
    ).toThrow(FirestoreTargetError);
  });

  it("GOOGLE_CLOUD_PROJECT is honoured as well as GCLOUD_PROJECT", () => {
    expect(() => resolveDatabaseId({ GOOGLE_CLOUD_PROJECT: PROD })).toThrow(FirestoreTargetError);
  });

  it("leaves every other project alone — the guard is a list, not a blanket", () => {
    expect(resolveDatabaseId({ GCLOUD_PROJECT: "scriptally-dev" })).toBe(DEFAULT_DATABASE_ID);
    expect(resolveDatabaseId({ GCLOUD_PROJECT: "demo-scriptally-test" })).toBe(DEFAULT_DATABASE_ID);
    /* no project at all — the emulator, a unit run, a local script */
    expect(resolveDatabaseId({})).toBe(DEFAULT_DATABASE_ID);
  });

  it("an explicit id wins on any project, prod included", () => {
    expect(resolveDatabaseId({ [DATABASE_ID_ENV]: "other-db", GCLOUD_PROJECT: "scriptally-dev" }))
      .toBe("other-db");
    expect(resolveDatabaseId({ [DATABASE_ID_ENV]: "  padded  ", GCLOUD_PROJECT: PROD }))
      .toBe("padded");
  });

  it("an empty or blank value is treated as unset, not as a database named ''", () => {
    expect(resolveDatabaseId({ [DATABASE_ID_ENV]: "", GCLOUD_PROJECT: "scriptally-dev" }))
      .toBe(DEFAULT_DATABASE_ID);
    expect(() => resolveDatabaseId({ [DATABASE_ID_ENV]: "   ", GCLOUD_PROJECT: PROD }))
      .toThrow(FirestoreTargetError);
  });
});
