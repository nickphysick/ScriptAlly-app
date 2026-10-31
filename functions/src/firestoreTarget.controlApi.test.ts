/**
 * The database guard stands down for `firebase deploy`'s analysis, and only for that.
 *
 * `firebase deploy` loads the functions on the deployer's machine to discover them, with the project
 * set (GCLOUD_PROJECT) and FUNCTIONS_CONTROL_API="true", but WITHOUT the user .env files. So
 * FIRESTORE_DATABASE_ID is unset there even when functions/.env.<projectId> sets it. The guard ran
 * at module load, saw the live project, which has no (default) database, and refused. It broke the
 * first live deploy since the guard existed (18 Oct). Dev never saw it, because dev's database IS
 * (default).
 *
 * No database is touched during analysis, so the guard has nothing to protect there. At runtime the
 * env file is loaded and the guard applies in full. Only the exact string "true" stands it down.
 */
import { describe, expect, it } from "vitest";
import { DATABASE_ID_ENV, FirestoreTargetError, resolveDatabaseId } from "./firestoreTarget";

const LIVE = "gen-lang-client-0801391782";

describe("the database guard and firebase deploy's analysis", () => {
  it("(a) control-API mode on the live project, no database id → loads without throwing", () => {
    expect(() => resolveDatabaseId({ GCLOUD_PROJECT: LIVE, FUNCTIONS_CONTROL_API: "true" })).not.toThrow();
  });

  it("(b) runtime on the live project, no database id → still refuses, whatever else the marker says", () => {
    for (const marker of [undefined, "", "false", "1", "TRUE", "yes", " true"]) {
      const env: NodeJS.ProcessEnv = { GCLOUD_PROJECT: LIVE };
      if (marker !== undefined) env.FUNCTIONS_CONTROL_API = marker;
      expect(() => resolveDatabaseId(env), `FUNCTIONS_CONTROL_API=${JSON.stringify(marker)}`).toThrow(FirestoreTargetError);
    }
  });

  it("(c) runtime on the live project with FIRESTORE_DATABASE_ID=(default) → still refuses", () => {
    expect(() => resolveDatabaseId({ GCLOUD_PROJECT: LIVE, [DATABASE_ID_ENV]: "(default)" })).toThrow(FirestoreTargetError);
  });

  it("and at runtime the named database still resolves", () => {
    expect(resolveDatabaseId({ GCLOUD_PROJECT: LIVE, [DATABASE_ID_ENV]: "ai-studio-ae82196c-c59e-40b9-b209-9fb02f67ade6" }))
      .toBe("ai-studio-ae82196c-c59e-40b9-b209-9fb02f67ade6");
  });
});
