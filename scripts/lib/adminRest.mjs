/**
 * Admin REST access for the founding-flag scripts (plan rules v1). It uses credentials minted from the Firebase CLI's own
 * login, the same way `tests/e2e/seedYourNotes.mjs` does, because this Mac has no application-default credentials and
 * the rules refuse every client write to `users/{uid}/private/*`, as they should.
 *
 * ⚠️ IT CREATES NO FIREBASE APP. It speaks REST to Identity Toolkit (accounts) and Firestore (one doc at a time), so
 *    `firestoreTarget.test.ts`'s app census does not apply. The live opt-in still does: `requireLiveOptIn` refuses any
 *    non-demo project without ALLOW_LIVE_FIRESTORE=1, and each script names its project by argument and its database
 *    from `DATABASES` (or `--database`).
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import { requireLiveOptIn } from "../../tests/e2e/fsTarget.mjs";

export const PROD_PROJECT = "gen-lang-client-0801391782";
/** Each project's ONE Firestore database (CLAUDE.md: prod has no `(default)`). */
export const DATABASES = {
  "scriptally-dev": "(default)",
  [PROD_PROJECT]: "ai-studio-ae82196c-c59e-40b9-b209-9fb02f67ade6",
};

export const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
export const flag = (name) => process.argv.includes(name);

/** The project and database a script runs against, refused without the live opt-in. */
export function target(usage) {
  const project = arg("--project");
  if (!project) { console.error(usage); process.exit(2); }
  const database = arg("--database") ?? DATABASES[project];
  if (!database) { console.error(`No known database for "${project}"; pass --database <id>.\n${usage}`); process.exit(2); }
  requireLiveOptIn(project);
  return { project, database, isProd: project === PROD_PROJECT };
}

async function token() {
  const req = createRequire(import.meta.url);
  const auth = req("/usr/local/lib/node_modules/firebase-tools/lib/auth.js");
  const cfg = JSON.parse(readFileSync(os.homedir() + "/.config/configstore/firebase-tools.json", "utf8"));
  const t = await auth.getAccessToken(cfg.tokens.refresh_token, ["https://www.googleapis.com/auth/cloud-platform"]);
  return typeof t === "string" ? t : t.access_token;
}

export async function client({ project, database }) {
  const H = { Authorization: `Bearer ${await token()}`, "Content-Type": "application/json", "x-goog-user-project": project };
  const DOCS = `projects/${project}/databases/${encodeURIComponent(database)}/documents`;
  const FS = `https://firestore.googleapis.com/v1/${DOCS}`;
  const call = async (url, init = {}) => {
    const r = await fetch(url, { ...init, headers: H });
    const body = await r.json().catch(() => ({}));
    if (!r.ok && r.status !== 404) throw new Error(`${init.method ?? "GET"} ${url} → ${r.status} ${JSON.stringify(body).slice(0, 300)}`);
    return r.status === 404 ? null : body;
  };

  /** Every sign-in account: uid, email, creation time (ms). */
  async function listAccounts() {
    const out = [];
    let pageToken;
    do {
      const q = new URLSearchParams({ maxResults: "500", ...(pageToken ? { nextPageToken: pageToken } : {}) });
      const b = await call(`https://identitytoolkit.googleapis.com/v1/projects/${project}/accounts:batchGet?${q}`);
      for (const u of b?.users ?? []) out.push({ uid: u.localId, email: u.email ?? null, createdMs: u.createdAt ? Number(u.createdAt) : null });
      pageToken = b?.nextPageToken;
    } while (pageToken);
    return out;
  }

  /** One account by email, or null. */
  async function lookupEmail(email) {
    const b = await call(`https://identitytoolkit.googleapis.com/v1/projects/${project}/accounts:lookup`, { method: "POST", body: JSON.stringify({ email: [email] }) });
    const u = b?.users?.[0];
    return u ? { uid: u.localId, email: u.email ?? null, createdMs: u.createdAt ? Number(u.createdAt) : null } : null;
  }

  /** The `private/entitlement` doc's founding fields, or nulls when absent. */
  async function readFounding(uid) {
    const d = await call(`${FS}/users/${uid}/private/entitlement`);
    const f = d?.fields ?? {};
    return {
      exists: !!d,
      founding: "founding" in f ? f.founding.booleanValue === true : null,
      foundingSince: f.foundingSince?.timestampValue ?? null,
      foundingSource: f.foundingSource?.stringValue ?? null,
    };
  }

  /**
   * Set or clear the flag, merging into the doc (the Smart Import fields are left as they are). Marking stamps
   * `foundingSince` with the server's time; unmarking writes `founding: false` and removes `foundingSince`, so the
   * nightly backstop (which only fills an ABSENT flag) never marks that account again.
   */
  async function writeFounding(uid, founding, source) {
    const name = `${DOCS}/users/${uid}/private/entitlement`;
    const fields = founding
      ? { founding: { booleanValue: true }, foundingSource: { stringValue: source } }
      : { founding: { booleanValue: false }, foundingSource: { stringValue: source } };
    const write = {
      update: { name, fields },
      updateMask: { fieldPaths: founding ? ["founding", "foundingSource"] : ["founding", "foundingSource", "foundingSince"] },
      ...(founding ? { updateTransforms: [{ fieldPath: "foundingSince", setToServerValue: "REQUEST_TIME" }] } : {}),
    };
    await call(`https://firestore.googleapis.com/v1/${DOCS}:commit`, { method: "POST", body: JSON.stringify({ writes: [write] }) });
  }

  /** The waitlist counter's cap, or null when the doc or field is absent. */
  async function readCap() {
    const d = await call(`${FS}/counters/waitlist`);
    const v = d?.fields?.cap?.integerValue;
    return v != null ? Number(v) : null;
  }

  /** One document's fields as plain values (strings, numbers, booleans, timestamps as ISO), or null when absent. */
  async function readDoc(path) {
    const d = await call(`${FS}/${path}`);
    if (!d) return null;
    const out = {};
    for (const [k, v] of Object.entries(d.fields ?? {})) {
      out[k] = v.stringValue ?? (v.integerValue != null ? Number(v.integerValue) : undefined) ?? v.doubleValue
        ?? v.booleanValue ?? v.timestampValue ?? null;
    }
    return out;
  }

  /**
   * Create one document, refusing if it already exists (the write carries `currentDocument.exists: false`, so a
   * second founder's code can never overwrite the first). `fields` are Firestore REST values. Non-workspace v1, 9d.
   */
  async function createDoc(path, fields) {
    const write = { update: { name: `${DOCS}/${path}`, fields }, currentDocument: { exists: false } };
    await call(`https://firestore.googleapis.com/v1/${DOCS}:commit`, { method: "POST", body: JSON.stringify({ writes: [write] }) });
  }

  return { listAccounts, lookupEmail, readFounding, writeFounding, readCap, readDoc, createDoc };
}
