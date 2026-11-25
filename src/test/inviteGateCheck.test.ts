/**
 * App site v1.1 — the re-point cannot be forgotten. Every functions deploy ends with scripts/invite-gate-check.mjs
 * (firebase.json `functions.postdeploy`), which points the invite check's trigger at its run.app address, reads it
 * back, and on dev proves it end to end. Its rules are scripts/inviteGateCheckCore.mjs.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { triggerPlan, triggerVerified, probeVerdict, mayProbe, PROBE_PROJECTS, NOT_INVITED } from "../../scripts/inviteGateCheckCore.mjs";

const ROOT = process.cwd();
const read = (f: string) => readFileSync(join(ROOT, f), "utf8");
const RUN = "https://invitegate-abc123-nw.a.run.app";
const fn = (over: object = {}) => ({ state: "ACTIVE", serviceConfig: { uri: RUN }, ...over });
const cfg = (uri: string | null, subtype = "IDENTITY_PLATFORM") => ({ subtype, blockingFunctions: uri ? { triggers: { beforeCreate: { functionUri: uri } } } : {} });

describe("the trigger", () => {
  it("is re-pointed when the deploy left it on cloudfunctions.net, or unset", () => {
    expect(triggerPlan(fn(), cfg("https://europe-west2-p.cloudfunctions.net/inviteGate"))).toEqual({ kind: "repoint", runUri: RUN, from: "https://europe-west2-p.cloudfunctions.net/inviteGate" });
    expect(triggerPlan(fn(), cfg(null))).toEqual({ kind: "repoint", runUri: RUN, from: null });
  });
  it("is left alone when it is already right", () => {
    expect(triggerPlan(fn(), cfg(RUN))).toEqual({ kind: "ok", runUri: RUN });
  });
  it("is skipped where the check is not deployed (any other functions deploy)", () => {
    expect(triggerPlan(null, null).kind).toBe("skip");
  });
  it("fails loudly on a function that is not ACTIVE, has no run.app address, or on plain Firebase Auth", () => {
    expect(triggerPlan(fn({ state: "FAILED" }), cfg(RUN)).kind).toBe("fail");
    expect(triggerPlan(fn({ serviceConfig: { uri: "https://europe-west2-p.cloudfunctions.net/inviteGate" } }), cfg(RUN)).kind).toBe("fail");
    expect(triggerPlan(fn(), cfg(RUN, "FIREBASE_AUTH")).kind).toBe("fail");
  });
  it("is verified by reading it back", () => {
    expect(triggerVerified(cfg(RUN), RUN)).toBe(true);
    expect(triggerVerified(cfg("https://europe-west2-p.cloudfunctions.net/inviteGate"), RUN)).toBe(false);
  });
});

describe("the end-to-end probe", () => {
  it("passes only on the check's own refusal", () => {
    expect(probeVerdict({ error: { message: `BLOCKING_FUNCTION_ERROR_RESPONSE : {"error":{"message":"${NOT_INVITED}"}}` } }).pass).toBe(true);
    expect(probeVerdict({ error: { message: "Error code: 47" } }).pass).toBe(false);
    expect(probeVerdict({ error: { message: "ADMIN_ONLY_OPERATION" } }).pass).toBe(false);
  });
  it("names an account it made, so the script can delete it", () => {
    expect(probeVerdict({ localId: "abc" })).toMatchObject({ pass: false, created: "abc" });
  });
  it("runs on dev only, never on prod", () => {
    expect(PROBE_PROJECTS).toEqual(["scriptally-dev"]);
    expect(mayProbe("scriptally-dev")).toBe(true);
    expect(mayProbe("gen-lang-client-0801391782")).toBe(false);
  });
  it("the marker is the server's", () => {
    expect(read("functions/src/inviteGateCore.ts")).toContain(`export const NOT_INVITED = "${NOT_INVITED}";`);
  });
});

describe("no functions deploy can skip it", () => {
  it("firebase.json runs it after every functions deploy, from the project's own folder", () => {
    const f = JSON.parse(read("firebase.json")).functions;
    expect(f.postdeploy).toEqual(['node "$PROJECT_DIR/scripts/invite-gate-check.mjs"']);
    expect(f.predeploy).toEqual(["npm --prefix functions run build"]);
  });
  it("no other config deploys functions", () => {
    for (const c of ["firebase.dev.json", "firebase.app.json", "firebase.dev-landing.json", "firebase.holding.json"]) expect(JSON.parse(read(c)).functions).toBeUndefined();
  });
  it("the named command deploys the check and nothing else, and the hook does the rest", () => {
    expect(JSON.parse(read("package.json")).scripts["deploy:invite-gate"]).toBe("firebase deploy --only functions:inviteGate");
  });
  it("the script acts on every plan, fails with a non-zero exit, and never probes where it may not", () => {
    const s = read("scripts/invite-gate-check.mjs");
    for (const k of ['case "skip"', 'case "fail"', 'case "repoint"', 'case "ok"']) expect(s).toContain(k);
    expect(s).toContain("process.exit(1)");
    expect(s.indexOf("if (!mayProbe(project))")).toBeLessThan(s.indexOf("accounts:signUp"));
  });
});
