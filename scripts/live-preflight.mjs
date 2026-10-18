#!/usr/bin/env node
/**
 * live-preflight — run BEFORE any live deploy. Reads only; writes nothing anywhere.
 *
 *   node scripts/live-preflight.mjs          the go-live set (no AI functions)
 *   node scripts/live-preflight.mjs --ai     also require ANTHROPIC_API_KEY on live
 *
 * One line per check, then a verdict. Exits 1 if any check fails.
 *
 * ⚠️ IT PRINTS KEY NAMES, NEVER VALUES. The repository is public, and so is anything pasted from
 * this output into a report.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = process.cwd();
const PROJECT = "prod"; // .firebaserc alias for gen-lang-client-0801391782
const PROD_ENV_FILE = "functions/.env.gen-lang-client-0801391782";
const BRANCH = "release/live-1";
const LIVE_TITLE = "QueryHawk: Query With Confidence";
/** Every lab hash App.tsx routes; `#/plans` is the DEV hash, not the `/plans` path. Kept equal to
 *  `LAB_HASHES` in src/lib/prodBuild.test.ts (that file's P1 is the same claim, at build time). */
const LAB_HASHES = ["#/status-dots", "#/plans", "#/contact-lab", "#/onb-lab", "#/notes-lab",
  "#/diary-lab", "#/drawer-lab", "#/reading-pane-lab", "#/shell-lab"];
/** Secrets each function in the go-live deploy declares (functions/src, `defineSecret`). */
const SECRETS = { waitlist: ["WAITLIST_IP_SALT", "RESEND_API_KEY"] };
const AI_SECRETS = ["ANTHROPIC_API_KEY"];

const ai = process.argv.includes("--ai");
let failed = 0;
const line = (ok, name, detail) => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};
const sh = (cmd, args) => execFileSync(cmd, args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

/** The same parse firebase-tools applies: KEY=value, optional quotes, `#` comments. */
const parseEnv = (text) => {
  const out = {};
  for (const raw of text.split(/\r?\n/)) {
    const m = raw.match(/^\s*(?:export\s+)?([\w./]+)\s*=\s*(.*?)\s*$/);
    if (!m || raw.trim().startsWith("#")) continue;
    let v = m[2];
    const q = v.match(/^(["'])(.*)\1$/);
    v = q ? q[2] : v.replace(/\s+#.*$/, "");
    out[m[1]] = v;
  }
  return out;
};
const readEnv = (f) => (existsSync(join(ROOT, f)) ? parseEnv(readFileSync(join(ROOT, f), "utf8")) : null);

/* ── 0 · landing-only ── */
const clientEnv = readEnv(".env.production") ?? {};
line(clientEnv.VITE_LANDING_ONLY === "true", "0 · VITE_LANDING_ONLY=true in .env.production",
  "queryhawk.net serves the public site and the waitlist only");

/* ── 1 · the functions' environment for live ── */
const prodEnv = readEnv(PROD_ENV_FILE);
const bareEnv = readEnv("functions/.env") ?? {};
const clientDb = readEnv(".env.production")?.VITE_FIREBASE_DATABASE_ID;
if (!prodEnv) {
  line(false, `1 · ${PROD_ENV_FILE}`, "missing — Nick creates it (runbook step 0)");
} else {
  line(prodEnv.FIRESTORE_DATABASE_ID === clientDb && !!clientDb, "1a · FIRESTORE_DATABASE_ID",
    "equals .env.production's VITE_FIREBASE_DATABASE_ID");
  line(/@queryhawk\.net>$/.test(prodEnv.WAITLIST_FROM ?? ""), "1b · WAITLIST_FROM", "ends @queryhawk.net>");
  line(prodEnv.WAITLIST_CONTACT_EMAIL === "hello@queryhawk.net", "1c · WAITLIST_CONTACT_EMAIL", "is hello@queryhawk.net");
  line(prodEnv.WAITLIST_PUBLIC_URL === "https://queryhawk.net", "1d · WAITLIST_PUBLIC_URL", "is https://queryhawk.net");
  const where = prodEnv.WAITLIST_REPLY_TO ? PROD_ENV_FILE : bareEnv.WAITLIST_REPLY_TO ? "functions/.env" : null;
  line(!!where, "1e · WAITLIST_REPLY_TO", where ? `set in ${where}` : "set in neither file");
  const scriptally = Object.entries(prodEnv).filter(([, v]) => /scriptally\.ink/i.test(v)).map(([k]) => k);
  line(scriptally.length === 0, "1f · no scriptally.ink value", scriptally.length ? `in ${scriptally.join(", ")}` : "");
}

/* ── 2 · the secrets the deploy needs exist on live (names only; never a value) ── */
const needed = [...new Set([...Object.values(SECRETS).flat(), ...(ai ? AI_SECRETS : [])])];
for (const name of needed) {
  let ok = false;
  try {
    /* `functions:secrets:get` prints the secret's VERSIONS (number, state), never its value. */
    const out = sh("firebase", ["functions:secrets:get", name, "--project", PROJECT]);
    ok = /ENABLED/.test(out);
  } catch { ok = false; }
  line(ok, `2 · secret ${name}`, ok ? "exists with an enabled version" : "absent on live — runbook step 1");
}

/* ── 3 · dist/ is the production build of this tree ── */
const walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
const distDir = join(ROOT, "dist");
if (!existsSync(join(distDir, "index.html"))) {
  line(false, "3 · dist/", "no build — run `npm run build`");
} else {
  const files = walk(distDir).filter((f) => /\.(js|css|html|json|txt|svg)$/.test(f));
  const text = files.map((f) => [f.slice(distDir.length + 1), readFileSync(f, "utf8")]);
  const labs = text.flatMap(([n, s]) => LAB_HASHES.filter((h) => s.includes(h)).map((h) => `${h} in ${n}`));
  line(labs.length === 0, "3a · no lab hash in dist/", labs.length ? `${labs.join(", ")} (a dev build?)` : "");
  const title = readFileSync(join(distDir, "index.html"), "utf8").match(/<title>([^<]*)<\/title>/)?.[1];
  line(title === LIVE_TITLE, "3b · <title>", title ?? "none");
  const ink = text.filter(([, s]) => /scriptally\.ink/i.test(s)).map(([n]) => n);
  line(ink.length === 0, "3c · no scriptally.ink in dist/", ink.join(", "));
  /* A landing-only build drops the sign-in screen and the nav's app links at build time. */
  const doors = ["Log in", "Open dashboard", "Open QueryHawk", "Create account", "Sign up with Google"]
    .filter((d) => text.some(([, s]) => s.includes(d)));
  line(doors.length === 0, "3e · dist/ has no way into the app (landing-only)", doors.join(", "));
  /* ⚠️ "BUILT FROM THIS TREE" IS PROVED BY BUILDING IT AGAIN. The build is deterministic, so a
     fresh production build of the working tree must name the same entry assets. A stale dist/
     (an older commit, or a dev build) names different ones. */
  const tmp = mkdtempSync(join(tmpdir(), "qh-preflight-"));
  try {
    execFileSync("npx", ["vite", "build", "--outDir", tmp, "--logLevel", "error"], {
      cwd: ROOT, stdio: ["ignore", "ignore", "pipe"], env: { ...process.env, NODE_ENV: "production" },
    });
    const entries = (d) => readdirSync(join(d, "assets")).filter((n) => /^index-.+\.(js|css)$/.test(n)).sort().join(" ");
    const want = entries(tmp), have = entries(distDir);
    line(want === have, "3d · dist/ matches a fresh production build", want === have ? have : `dist has ${have || "none"}, this tree builds ${want}`);
  } catch (e) {
    line(false, "3d · fresh production build", `failed: ${String(e.stderr ?? e.message).split("\n")[0]}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

/* ── 4 · nothing pending ── */
const diff = sh("git", ["diff", "--name-only", "HEAD"]).trim();
line(diff === "", "4a · no uncommitted change to a tracked file", diff ? diff.split("\n").join(", ") : "");
const branch = sh("git", ["rev-parse", "--abbrev-ref", "HEAD"]).trim();
line(branch === BRANCH, "4b · HEAD is " + BRANCH, branch === BRANCH ? sh("git", ["rev-parse", "--short", "HEAD"]).trim() : `on ${branch}`);

console.log(failed ? `\nPREFLIGHT FAILED — ${failed} check(s). Do not deploy.` : "\nPREFLIGHT PASSED.");
process.exit(failed ? 1 : 0);
