#!/usr/bin/env node
/**
 * invite-gate-check — runs after EVERY functions deploy (firebase.json `functions.postdeploy`), and by hand:
 *
 *   node scripts/invite-gate-check.mjs --project <projectId>        (the hook passes GCLOUD_PROJECT instead)
 *
 * 1. Points the `beforeCreate` blocking trigger at inviteGate's run.app address when it isn't (the rules and the
 *    reason are in scripts/inviteGateCheckCore.mjs). Skips quietly when inviteGate is not deployed on the project.
 * 2. Reads it back and checks it.
 * 3. On dev only, proves it end to end: an uninvited address tries to sign up through the app's own endpoint and
 *    must be refused with QH_NOT_INVITED. On prod it does NOT probe — a probe that got through would make a real
 *    account — and prints the manual line instead (runbook).
 * Any failure exits 1 with a banner, which fails the `firebase deploy` that ran it.
 *
 * It uses the firebase-tools login on this machine for the Google APIs and prints no secret.
 */
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { triggerPlan, triggerVerified, probeVerdict, mayProbe } from "./inviteGateCheckCore.mjs";

const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : undefined; };
const project = arg("--project") || process.env.GCLOUD_PROJECT;
const root = process.env.PROJECT_DIR || process.cwd();
const REGION = "europe-west2";

const fail = (why) => {
  console.error(`\n✖✖✖ INVITE CHECK NOT VERIFIED on ${project}: ${why}`);
  console.error("    Sign-ups on this project may be failing for everyone, or not checked at all. Fix this before anything else.\n");
  process.exit(1);
};
if (!project) { console.error("usage: node scripts/invite-gate-check.mjs --project <projectId>"); process.exit(2); }

const FT = join(execFileSync("npm", ["root", "-g"], { encoding: "utf8" }).trim(), "firebase-tools", "lib");
const req = createRequire(import.meta.url);
const { requireAuth } = req(join(FT, "requireAuth.js"));
const { Client } = req(join(FT, "apiv2.js"));
const acct = req(join(FT, "auth.js")).getGlobalDefaultAccount();
await requireAuth({ user: acct.user, tokens: acct.tokens });
const fns = new Client({ urlPrefix: "https://cloudfunctions.googleapis.com", apiVersion: "v2" });
const idt = new Client({ urlPrefix: "https://identitytoolkit.googleapis.com", apiVersion: "admin/v2" });
const idv1 = new Client({ urlPrefix: "https://identitytoolkit.googleapis.com", apiVersion: "v1" });

const fn = await fns.get(`/projects/${project}/locations/${REGION}/functions/inviteGate`).then((r) => r.body, (e) => {
  if (e.status === 404 || /404|not found/i.test(String(e.message))) return null;
  fail(`could not read inviteGate (${e.message})`);
});
const readConfig = () => idt.get(`/projects/${project}/config`).then((r) => r.body);
let config = fn ? await readConfig() : null;
const plan = triggerPlan(fn, config);

switch (plan.kind) {
  case "skip":
    console.log(`invite-gate-check: ${project}: ${plan.why}.`);
    process.exit(0);
  case "fail":
    fail(plan.why);
  case "repoint": {
    console.log(`invite-gate-check: ${project}: pointing beforeCreate at ${plan.runUri} (was ${plan.from ?? "unset"})`);
    const bf = config.blockingFunctions || {};
    await idt.patch(`/projects/${project}/config`, { blockingFunctions: { ...bf, triggers: { ...(bf.triggers || {}), beforeCreate: { functionUri: plan.runUri } } } },
      { queryParams: { updateMask: "blockingFunctions.triggers" } });
    config = await readConfig();
    break;
  }
  case "ok":
    break;
  default: {
    const unhandled = plan;
    fail(`unknown plan ${JSON.stringify(unhandled)}`);
  }
}
if (!triggerVerified(config, plan.runUri)) fail(`beforeCreate reads ${config?.blockingFunctions?.triggers?.beforeCreate?.functionUri ?? "unset"}, not ${plan.runUri}`);
console.log(`invite-gate-check: ${project}: beforeCreate → ${plan.runUri} ✓`);

if (!mayProbe(project)) {
  console.log(`invite-gate-check: ${project}: no end-to-end probe here (one that got through would make a real account).`);
  console.log("  MANUAL: once sign-up is on, run the runbook's signup-probe and expect QH_NOT_INVITED.");
  process.exit(0);
}

/* Dev: an uninvited address, through the endpoint the app's SDK calls. */
const env = readFileSync(join(root, ".env.development"), "utf8");
if (env.match(/^VITE_FIREBASE_PROJECT_ID=(.*)$/m)?.[1].trim() !== project) fail(".env.development does not name this project");
const key = env.match(/^VITE_FIREBASE_API_KEY=(.*)$/m)?.[1].trim();
const email = `invite-gate-probe-${randomBytes(4).toString("hex")}@example.com`;
let body;
for (let i = 0; i < 6; i++) { // a fresh revision can take a few seconds to answer
  body = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${key}`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: randomBytes(15).toString("base64url"), returnSecureToken: true }),
  }).then((r) => r.json());
  if (body?.localId || String(body?.error?.message).includes("QH_NOT_INVITED")) break;
  await new Promise((r) => setTimeout(r, 5000));
}
const v = probeVerdict(body);
if (v.created) {
  await idv1.post(`/projects/${project}/accounts:delete`, { localId: v.created }).catch(() => undefined);
  fail(`${v.why} (the probe account ${v.created} was deleted)`);
}
if (!v.pass) fail(v.why);
console.log(`invite-gate-check: ${project}: an uninvited sign-up was ${v.why} ✓`);
