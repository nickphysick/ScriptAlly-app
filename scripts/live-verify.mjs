#!/usr/bin/env node
/**
 * live-verify <step> — check queryhawk.net after a runbook step. Reads only.
 *
 *   functions   the deployed set, from `firebase functions:list`
 *   rules       signed-out reads on the named database: a private path DENIED, the open
 *               health-check path ALLOWED (so a deny means the rules, not a broken probe)
 *   hosting     the page, its caching, the www redirect, the second domain, a deep link
 *   all         all of the above, plus the waitlist through the hosting rewrite (CORS, JSON)
 *
 * Exits 1 if any check fails. The reads are what any browser can do: public URLs, and the web API
 * key that already ships in the bundle.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const APEX = "https://queryhawk.net";
const WWW = "https://www.queryhawk.net";
const SITE = "https://scriptally-app.web.app";
const LIVE_TITLE = "QueryHawk: Query With Confidence";
const PROJECT_ID = "gen-lang-client-0801391782";
/** The go-live set (runbook step 2). The optional second line's functions are reported, not required. */
const REQUIRED_FUNCTIONS = ["waitlist", "waitlistRetention", "sendContactMessage", "sendBetaFeedback", "sendWeeklyPulse"];
const OPTIONAL_FUNCTIONS = ["smartImportMap", "extractFromEmail", "assistAgentData", "suggestComps", "redeemInviteCode"];

const env = Object.fromEntries(readFileSync(".env.production", "utf8").split("\n")
  .map((l) => l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/)).filter(Boolean).map((m) => [m[1], m[2]]));
const DB = env.VITE_FIREBASE_DATABASE_ID;
const KEY = env.VITE_FIREBASE_API_KEY;

let failed = 0;
const line = (ok, name, detail = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};
const info = (name, detail) => console.log(`INFO  ${name} — ${detail}`);
const get = (url, init = {}) => fetch(url, { redirect: "manual", ...init });
const titleOf = (html) => html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "none";

const hosting = async () => {
  const r = await get(`${APEX}/`);
  const html = await r.text();
  line(r.status === 200, "hosting · apex 200", String(r.status));
  line(titleOf(html) === LIVE_TITLE, "hosting · apex <title>", titleOf(html));
  line(/no-cache/.test(r.headers.get("cache-control") ?? ""), "hosting · apex cache-control has no-cache", r.headers.get("cache-control") ?? "none");
  const asset = html.match(/\/assets\/index-[\w-]+\.js/)?.[0];
  if (asset) {
    const a = await get(`${APEX}${asset}`);
    line(a.status === 200 && /immutable/.test(a.headers.get("cache-control") ?? ""), "hosting · asset is immutable", `${asset} ${a.status} ${a.headers.get("cache-control")}`);
  } else line(false, "hosting · asset is immutable", "no /assets/index-*.js in the page");
  const w = await get(`${WWW}/`);
  const loc = w.headers.get("location") ?? "";
  line([301, 302, 307, 308].includes(w.status) && loc.replace(/\/$/, "") === APEX, "hosting · www redirects to the apex", `${w.status} → ${loc || "none"}`);
  const s = await get(`${SITE}/`);
  line(titleOf(await s.text()) === LIVE_TITLE, "hosting · scriptally-app.web.app serves the same title");
  const d = await get(`${APEX}/pricing`);
  const dh = await d.text();
  line(d.status === 200 && titleOf(dh) === LIVE_TITLE && dh.includes('id="root"'), "hosting · deep link /pricing returns the app shell", String(d.status));
};

const functions = async () => {
  let out = "";
  try {
    out = execFileSync("firebase", ["functions:list", "--project", "prod"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    line(false, "functions · list", String(e.stderr ?? e.message).split("\n")[0]);
    return;
  }
  const deployed = new Set([...out.matchAll(/│\s*([A-Za-z]\w*)\s*│\s*v[12]/g)].map((m) => m[1]));
  for (const f of REQUIRED_FUNCTIONS) line(deployed.has(f), `functions · ${f} deployed`);
  info("functions · optional", OPTIONAL_FUNCTIONS.map((f) => `${f} ${deployed.has(f) ? "deployed" : "absent"}`).join(", "));
};

const waitlist = async () => {
  const pre = (origin) => get(`${APEX}/api/waitlist`, {
    method: "OPTIONS", headers: { Origin: origin, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type" },
  });
  const ok = await pre(APEX);
  line(ok.headers.get("access-control-allow-origin") === APEX, "waitlist · CORS allows https://queryhawk.net", `${ok.status} ${ok.headers.get("access-control-allow-origin") ?? "no allow-origin"}`);
  const bad = await pre("https://scriptally.ink");
  const badAllow = bad.headers.get("access-control-allow-origin");
  line(badAllow !== "https://scriptally.ink" && badAllow !== "*", "waitlist · CORS refuses https://scriptally.ink", `${bad.status} ${badAllow ?? "no allow-origin"}`);
  /* ⚠️ A 200 IS NOT EVIDENCE. Without the rewrite this path is the SPA, 200 text/html. */
  const g = await get(`${APEX}/api/waitlist`, { headers: { Origin: APEX } });
  const type = g.headers.get("content-type") ?? "";
  const body = await g.text();
  line(/application\/json/.test(type), "waitlist · GET answers JSON, not the SPA", `${g.status} ${type}`);
  if (/application\/json/.test(type)) info("waitlist · GET body", body.slice(0, 120));
};

const rules = async () => {
  const doc = (path) => get(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${encodeURIComponent(DB)}/documents/${path}?key=${KEY}`,
    { headers: { Referer: `${APEX}/` } });
  const priv = await doc("users/live-verify-probe");
  line(priv.status === 403, "rules · signed-out read of users/… is denied", String(priv.status));
  const open = await doc("test/connection");
  line(open.status === 200 || open.status === 404, "rules · signed-out read of test/connection is allowed (control)", String(open.status));
  info("rules · what this cannot show", "which ruleset is live: the July rules deny the first read too. The proof is the release time from the deploy run with --debug (runbook step 4).");
};

const step = process.argv[2];
const plan = { functions: [functions], rules: [rules], hosting: [hosting], all: [functions, rules, hosting, waitlist] }[step];
if (!plan) {
  console.log("usage: node scripts/live-verify.mjs functions|rules|hosting|all");
  process.exit(2);
}
for (const run of plan) await run();
console.log(failed ? `\nVERIFY ${step} FAILED — ${failed} check(s).` : `\nVERIFY ${step} PASSED.`);
process.exit(failed ? 1 : 0);
