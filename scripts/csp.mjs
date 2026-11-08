/**
 * csp.mjs — the security headers, written in ONE place (security headers v1, audit 2026-11-07,
 * High 3). Prod and dev differ only in the three values that name their Firebase project, read
 * from `.env.production` / `.env.development`; everything else is the same text, so the two
 * cannot drift. `src/test/securityHeaders.test.ts` fails if a hosting config stops matching.
 *
 *   node scripts/csp.mjs --write   rewrite the header blocks in the hosting configs
 *   node scripts/csp.mjs --check   exit 1 if any config differs from what this file would write
 *   node scripts/csp.mjs --print   print each config's headers
 *
 * ⚠️ EVERY ORIGIN BELOW WAS OBSERVED LOADING. The walk that observed it is tests/e2e/cspWalk.mjs
 * and its readings are in reports/security-headers-v1/. Do not add an origin "just in case": an
 * origin nobody loads is attack surface, and a missing one shows up as a report-only message first.
 *
 * ⚠️ NO 'unsafe-inline' OR 'unsafe-eval' FOR SCRIPTS. The app's index.html has no inline script
 * (Vite puts its preload helper in the entry chunk). The holding page has one, so its policy
 * carries that script's sha256, computed here from the file itself.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Each hosting config, the env file its project is read from, and whether its CSP enforces. */
export const CONFIGS = [
  { file: "firebase.dev.json", env: ".env.development", csp: "enforce", kind: "app" },
  /* Prod: report-only until Nick has watched it clean (reports/security-headers-v1/REPORT.md). */
  { file: "firebase.json", env: ".env.production", csp: "report-only", kind: "app" },
  /* The holding page, still deployed to prod's DEFAULT site (gen-lang-client-0801391782.web.app
     and .firebaseapp.com, which is also prod's auth domain — Firebase's own /__/auth/* pages do
     not receive these headers, checked on dev's default site). */
  { file: "firebase.holding.json", env: ".env.production", csp: "report-only", kind: "holding" },
];

const readEnv = (file) => {
  const out = {};
  for (const line of readFileSync(join(ROOT, file), "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
};

/** The project-specific origins, from the env file the build of that site reads. */
export const projectOf = (envFile) => {
  const e = readEnv(envFile);
  const projectId = e.VITE_FIREBASE_PROJECT_ID;
  const authDomain = e.VITE_FIREBASE_AUTH_DOMAIN;
  if (!projectId || !authDomain) throw new Error(`${envFile}: no project id or auth domain`);
  return {
    projectId,
    authDomain: `https://${authDomain}`,
    /* Every callable here is `getFunctions(undefined, "europe-west2")`; the SDK calls
       https://<region>-<project>.cloudfunctions.net/<name> (observed: the feedback dock's sendBetaFeedback). */
    functions: `https://europe-west2-${projectId}.cloudfunctions.net`,
  };
};

/** The app's policy. Each origin carries the page or feature that loaded it. */
export const appPolicy = ({ authDomain, functions }) => [
  ["default-src", ["'self'"]],
  ["script-src", [
    "'self'",
    "https://apis.google.com",                 // sign-in page: the Google sign-in helper (gapi)
    "https://www.google.com",                  // waitlist: reCAPTCHA Enterprise (App Check)
    "https://www.gstatic.com",                 // waitlist: reCAPTCHA Enterprise's own script
    "https://static.cloudflareinsights.com",   // every public page on queryhawk.net: the Cloudflare beacon
  ]],
  ["style-src", ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"]], // Queries.tsx <style>, React style=, Google Fonts css
  ["font-src", ["'self'", "https://fonts.gstatic.com"]],                        // every page: Google Fonts files
  ["img-src", ["'self'", "data:", "blob:"]],                                     // blob: Smart Import photo previews; data: inline SVG/CSS images
  ["connect-src", [
    "'self'",                                   // /api/waitlist (hosting rewrite to the function)
    "https://firestore.googleapis.com",         // every page: Firestore
    "https://identitytoolkit.googleapis.com",   // sign-in and every signed-in page: Firebase Auth
    "https://securetoken.googleapis.com",       // signed-in pages: the hourly ID-token refresh
    "https://content-firebaseappcheck.googleapis.com", // waitlist: App Check token exchange
    "https://www.google.com",                   // waitlist: reCAPTCHA Enterprise's clr call (report-only walk)
    functions,                                  // feedback dock (sendBetaFeedback), Smart Import: callables
    "https://cloudflareinsights.com",           // the Cloudflare beacon's report
  ]],
  ["frame-src", [
    "https://www.google.com",                   // waitlist: reCAPTCHA Enterprise's frame
    authDomain,                                 // sign-in page: Firebase Auth's /__/auth/iframe
  ]],
  ["object-src", ["'none'"]],
  ["base-uri", ["'self'"]],
  ["form-action", ["'self'"]],
  ["frame-ancestors", ["'none'"]],
  ["upgrade-insecure-requests", []],
];

/** The holding page's inline <script>, as sha256 — the only inline script on any page we serve. */
export const holdingScriptHash = () => {
  const html = readFileSync(join(ROOT, "holding/index.html"), "utf8");
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  if (scripts.length !== 1) throw new Error(`holding/index.html: expected one inline script, found ${scripts.length}`);
  return `'sha256-${createHash("sha256").update(scripts[0], "utf8").digest("base64")}'`;
};

/** The holding page (holding/index.html): itself, Google Fonts, and one inline script. */
export const holdingPolicy = () => [
  ["default-src", ["'self'"]],
  ["script-src", ["'self'", holdingScriptHash()]],
  ["style-src", ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"]],
  ["font-src", ["'self'", "https://fonts.gstatic.com"]],
  ["img-src", ["'self'", "data:"]],
  ["connect-src", ["'self'"]],
  ["object-src", ["'none'"]],
  ["base-uri", ["'self'"]],
  ["form-action", ["'self'"]],
  ["frame-ancestors", ["'none'"]],
  ["upgrade-insecure-requests", []],
];

export const serialise = (policy) => policy.map(([k, v]) => (v.length ? `${k} ${v.join(" ")}` : k)).join("; ");

/** Permissions-Policy: everything off except clipboard-write (copy-email, copy-pitch buttons). */
export const PERMISSIONS_POLICY = [
  "accelerometer=()", "autoplay=()", "camera=()", "display-capture=()", "encrypted-media=()",
  "fullscreen=(self)", "geolocation=()", "gyroscope=()", "hid=()", "magnetometer=()", "microphone=()",
  "midi=()", "payment=()", "picture-in-picture=()", "publickey-credentials-get=()", "screen-wake-lock=()",
  "serial=()", "usb=()", "xr-spatial-tracking=()", "clipboard-read=()", "clipboard-write=(self)",
  "browsing-topics=()",
].join(", ");

export const headersFor = (cfg) => {
  const policy = cfg.kind === "holding" ? holdingPolicy() : appPolicy(projectOf(cfg.env));
  return [
    /* upgrade-insecure-requests does nothing in a report-only header, and Chrome says so in the
       console on every page — which would read as a violation to anyone checking prod's console.
       It is written only where the policy enforces. */
    { key: cfg.csp === "enforce" ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only",
      value: serialise(cfg.csp === "enforce" ? policy : policy.filter(([k]) => k !== "upgrade-insecure-requests")) },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: PERMISSIONS_POLICY },
  ];
};

const SECURITY_KEYS = new Set(["Content-Security-Policy", "Content-Security-Policy-Report-Only", "X-Frame-Options", "X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy"]);

/** The config with its "**" block's security headers replaced (Cache-Control and order kept). */
export const applied = (cfg, json) => {
  const out = structuredClone(json);
  out.hosting.headers ??= [];
  let all = out.hosting.headers.find((h) => h.source === "**");
  if (!all) { all = { source: "**", headers: [] }; out.hosting.headers.unshift(all); }
  all.headers = [...all.headers.filter((h) => !SECURITY_KEYS.has(h.key)), ...headersFor(cfg)];
  return out;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const mode = process.argv[2];
  let drift = 0;
  for (const cfg of CONFIGS) {
    const path = join(ROOT, cfg.file);
    const before = readFileSync(path, "utf8");
    const next = JSON.stringify(applied(cfg, JSON.parse(before)), null, 2) + "\n";
    if (mode === "--write") { if (next !== before) writeFileSync(path, next); console.log(`${cfg.file}: written`); }
    else if (mode === "--check") { if (next !== before) { drift++; console.error(`${cfg.file}: differs from scripts/csp.mjs`); } }
    else if (mode === "--print") console.log(cfg.file, JSON.stringify(headersFor(cfg), null, 2));
    else { console.error("usage: csp.mjs --write | --check | --print"); process.exit(2); }
  }
  if (drift) process.exit(1);
}
