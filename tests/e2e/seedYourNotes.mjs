#!/usr/bin/env node
/**
 * Your notes v1 — seed (or remove) a set of founding-writer notes for the harness account on scriptally-DEV, so the
 * page and its panel can be measured with real documents: every status, a reply, a thread, a reopenable note.
 *
 *   node tests/e2e/seedYourNotes.mjs           write the `yn1-*` notes (and their threads)
 *   node tests/e2e/seedYourNotes.mjs --clean   delete every `yn1-*` note and its thread
 *
 * ⚠️ scriptally-dev ONLY, with ADMIN credentials minted from the Firebase CLI's own login (the rules refuse every client
 *    write to betaFeedback, as they should). The project id is a constant here, checked against .env.development.
 * ⚠️ IT WRITES ONLY `yn1-` IDS, AND --clean REMOVES ONLY THOSE. The foundingStats trigger recomputes the harness
 *    account's stats on each write and again on the clean.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";

const PROJECT = "scriptally-dev";
const EMAIL = "harness@scriptally.test";
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const devProject = readFileSync(".env.development", "utf8").split("\n").find((l) => l.startsWith("VITE_FIREBASE_PROJECT_ID="))?.split("=")[1]?.trim().replace(/^["']|["']$/g, "");
if (devProject !== PROJECT) throw new Error("seedYourNotes: dev only");

const req = createRequire(import.meta.url);
const auth = req("/usr/local/lib/node_modules/firebase-tools/lib/auth.js");
const cfg = JSON.parse(readFileSync(os.homedir() + "/.config/configstore/firebase-tools.json", "utf8"));
const t = await auth.getAccessToken(cfg.tokens.refresh_token, ["https://www.googleapis.com/auth/cloud-platform"]);
const TOKEN = typeof t === "string" ? t : t.access_token;
const H = { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" };

const look = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:lookup`, { method: "POST", headers: H, body: JSON.stringify({ email: [EMAIL] }) });
const uid = (await look.json()).users?.[0]?.localId;
if (!uid) throw new Error(`no account for ${EMAIL}`);

const enc = (v) => {
  if (v === null) return { nullValue: null };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === "string") return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) } };
};
const put = async (path, data) => {
  const r = await fetch(`${BASE}/${path}`, { method: "PATCH", headers: H, body: JSON.stringify({ fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, enc(v)])) }) });
  if (!r.ok) throw new Error(`${path}: ${r.status} ${await r.text()}`);
};
const del = async (path) => { const r = await fetch(`${BASE}/${path}`, { method: "DELETE", headers: H }); if (!r.ok && r.status !== 404) throw new Error(`${path}: ${r.status}`); };
const list = async (path) => { const r = await fetch(`${BASE}/${path}?pageSize=300`, { headers: H }); return ((await r.json()).documents ?? []).map((d) => d.name.split("/documents/")[1]); };

const ago = (days, h = 9, m = 0) => { const d = new Date(); d.setDate(d.getDate() - days); d.setHours(h, m, 0, 0); return d; };
const base = { uid, severity: "", wantsReply: true, route: "/", viewport: "1512 × 982", browser: "seed", browserName: "Chrome on a Mac", appVersion: "seed", screenshotPath: "", emailed: false };

const NOTES = [
  { id: "yn1-1", kind: "An idea", pageName: "Comparable titles", createdAt: ago(0, 9, 52), message: "Could a comp link to the book’s page on Bookshop.org, so I can check the blurb quickly?" },
  { id: "yn1-2", kind: "Something's broken", pageName: "Contact list", createdAt: ago(3, 21, 14), title: "Agency names missing after an import",
    message: "When I import my spreadsheet the agency names come in blank for about half the rows. The agents are there but no agency.",
    status: "fixed", statusAt: ago(2, 17, 30), statusLog: [{ status: "read", at: ago(2, 8, 2) }, { status: "fixed", at: ago(2, 17, 30), note: "Fixed in the latest update" }],
    reply: { text: "Thanks for sending this. Agency names written all in capitals were being skipped on import. That’s fixed in today’s update, and your agents have their agencies back. Shout if any still look wrong.", at: ago(2, 17, 32) } },
  { id: "yn1-3", kind: "An idea", pageName: "Query Centre", createdAt: ago(5, 19, 3), title: "Typical reply time next to each query",
    message: "Could I see how long an agent usually takes to reply, right next to my query with them?", status: "planned", statusAt: ago(4, 7, 55),
    reply: { text: "Lovely idea. We’d work it out from the replies writers record, so it gets better as more of you join. It’s planned for December.", at: ago(4, 7, 58) }, writerSeenAt: ago(4, 9, 0) },
  { id: "yn1-4", kind: "Something's confusing", pageName: "Responses", createdAt: ago(6, 12, 20), title: "What “Gone quiet” means",
    message: "I didn’t know whether \"Gone quiet\" means the agent has closed my query, or that I should send a nudge.", status: "built", statusAt: ago(3, 16, 0),
    statusLog: [{ status: "read", at: ago(6, 18, 10) }, { status: "planned", at: ago(5, 8, 30) }, { status: "built", at: ago(3, 16, 0), note: "In the latest update" }],
    reply: { text: "Good catch. Hover “Gone quiet” now and it explains: the agent’s response time has passed with no reply. It doesn’t mean the query is closed.", at: ago(3, 16, 5) }, writerSeenAt: ago(3, 20, 0),
    thread: [{ from: "writer", text: "That’s much clearer, thank you!", at: ago(3, 20, 41) }] },
  { id: "yn1-5", kind: "Something I liked", pageName: "Dashboard", createdAt: ago(9, 22, 5), message: "The little faces for how my week went made me smile. Such a nice touch on a hard day.",
    status: "read", statusAt: ago(8, 7, 30), reply: { text: "That made our morning. Thank you.", at: ago(8, 7, 31) }, writerSeenAt: ago(8, 9, 0) },
  { id: "yn1-6", kind: "Something's broken", pageName: "To-do list", createdAt: ago(10, 8, 47), message: "Ticking a task on my phone doesn’t stick. When I refresh, it’s back again.",
    status: "planned", statusAt: ago(7, 9, 0), statusLog: [{ status: "read", at: ago(10, 12, 15) }, { status: "planned", at: ago(7, 9, 0), note: "Being worked on now" }] },
];

const existing = (await list("betaFeedback")).filter((p) => /^betaFeedback\/yn1-/.test(p));
for (const p of existing) { for (const m of await list(`${p}/thread`)) await del(m); await del(p); }
if (process.argv.includes("--clean")) { console.log(`removed ${existing.length} yn1- notes for ${uid}`); process.exit(0); }

for (const n of NOTES) {
  const { id, thread, ...rest } = n;
  await put(`betaFeedback/${id}`, { ...base, ...rest });
  for (const [i, m] of (thread ?? []).entries()) await put(`betaFeedback/${id}/thread/m${i + 1}`, m);
}
console.log(`seeded ${NOTES.length} yn1- notes for ${uid}`);
