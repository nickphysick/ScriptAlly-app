/**
 * The invite check's after-deploy rules (App site v1.1). Pure: `scripts/invite-gate-check.mjs` reads the project and
 * acts on these answers; `src/test/inviteGateCheck.test.ts` locks them.
 *
 * ⚠️ WHY THIS EXISTS. functions/ is on firebase-functions 6.x, which accepts a blocking token only when it is addressed
 *    to a run.app URL. The CLI registers the `beforeCreate` trigger at the function's cloudfunctions.net URL, so
 *    after a deploy EVERY sign-up fails ("Error code: 47", dev, 25 Nov) until the trigger is pointed at run.app.
 *    The re-point runs as firebase.json's functions `postdeploy` hook, so no functions deploy can skip it.
 */

/** The project whose sign-ups the check may probe end to end: a refused probe creates nothing, and a probe that
 *  is NOT refused makes one throwaway account here, which the script deletes. Never prod. */
export const PROBE_PROJECTS = ["scriptally-dev"];

/** The marker the check refuses with (functions/src/inviteGateCore.ts NOT_INVITED). */
export const NOT_INVITED = "QH_NOT_INVITED";

/**
 * What to do with the trigger, given the function (or null when it is not deployed here) and the Auth config.
 * @returns {{ kind: "skip", why: string } | { kind: "fail", why: string } | { kind: "ok", runUri: string } | { kind: "repoint", runUri: string, from: string | null }}
 */
export function triggerPlan(fn, config) {
  if (!fn) return { kind: "skip", why: "inviteGate is not deployed on this project, so there is no trigger to point" };
  if (fn.state !== "ACTIVE") return { kind: "fail", why: `inviteGate is ${fn.state ?? "in no state"}, not ACTIVE` };
  const runUri = fn.serviceConfig?.uri ?? "";
  if (!/^https:\/\/[a-z0-9-]+\.a\.run\.app$/.test(runUri)) return { kind: "fail", why: `inviteGate has no run.app address (${runUri || "none"})` };
  if (config?.subtype !== "IDENTITY_PLATFORM") return { kind: "fail", why: `Auth is ${config?.subtype ?? "unknown"}: blocking functions need Identity Platform` };
  const now = config?.blockingFunctions?.triggers?.beforeCreate?.functionUri ?? null;
  return now === runUri ? { kind: "ok", runUri } : { kind: "repoint", runUri, from: now };
}

/** After a re-point (or none), is the trigger where it must be? */
export function triggerVerified(config, runUri) {
  return config?.blockingFunctions?.triggers?.beforeCreate?.functionUri === runUri;
}

/**
 * The end-to-end probe's verdict: an uninvited address tries to sign up through the app's own endpoint.
 * @param {{ error?: { message?: string }, localId?: string }} body the signUp response
 * @returns {{ pass: boolean, created: string | null, why: string }}
 */
export function probeVerdict(body) {
  if (body?.localId) return { pass: false, created: body.localId, why: "an UNINVITED address made an account: the check did not run" };
  const m = body?.error?.message ?? "";
  if (m.includes(NOT_INVITED)) return { pass: true, created: null, why: "refused by the check (QH_NOT_INVITED)" };
  if (m.includes("ADMIN_ONLY_OPERATION")) return { pass: false, created: null, why: "sign-up is switched off, so the probe never reached the check" };
  return { pass: false, created: null, why: `refused, but not by the check: ${m || "no message"}` };
}

/** Prod and every project not listed above: verify the configuration only, and say the probe is a manual line. */
export const mayProbe = (project) => PROBE_PROJECTS.includes(project);
