/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Retire the add-agent pop-up — the admin half of locks ADD1-A2 and ADD1-A3.
 *
 * ⚠️ THE HARNESS ACCOUNT IS FREE AND OVER THE FIVE-AGENT CAP, SO THE APP REFUSES EVERY REAL ADD (src/lib/db.tsx). A2 and
 *    A3 need a save, so for the length of one test the harness user's `plan` is set to Pro with ADMIN credentials (the
 *    user rules refuse a client changing its own plan) and put back EXACTLY in `finally` — the field deleted if it was
 *    absent. The product is untouched.
 * ⚠️ scriptally-dev ONLY: the token is minted from the Firebase CLI's own login and the project id is a constant here,
 *    checked against .env.development before anything is written.
 * ⚠️ AGENTS THE LOCKS CREATE ARE NAMED `zzadd1-…`: `cleanAdd1` deletes each (with its notes) and every activity naming
 *    it, and `withPro` refuses to finish if any survive.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import { collection, deleteDoc, doc, getDocs } from "firebase/firestore";
import { harnessDb } from "./harnessDocs";

const PROJECT = "scriptally-dev";
export const ADD1_PREFIX = "zzadd1-";
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

const devProject = () => {
  const line = readFileSync(".env.development", "utf8").split("\n").find((l) => l.startsWith("VITE_FIREBASE_PROJECT_ID="));
  return line?.split("=")[1]?.trim().replace(/^["']|["']$/g, "");
};

async function adminToken(): Promise<string> {
  if (devProject() !== PROJECT) throw new Error("add1Admin: dev only");
  const req = createRequire(import.meta.url);
  const auth = req("/usr/local/lib/node_modules/firebase-tools/lib/auth.js");
  const cfg = JSON.parse(readFileSync(os.homedir() + "/.config/configstore/firebase-tools.json", "utf8"));
  const tok = await auth.getAccessToken(cfg.tokens.refresh_token, ["https://www.googleapis.com/auth/cloud-platform"]);
  return typeof tok === "string" ? tok : tok.access_token;
}

/** the harness user's stored `plan` as the REST API returns it: the string, or null when the field is absent */
export async function readPlan(): Promise<string | null> {
  const { uid } = await harnessDb();
  const r = await fetch(`${BASE}/users/${uid}?mask.fieldPaths=plan`, { headers: { Authorization: `Bearer ${await adminToken()}` } });
  if (!r.ok) throw new Error(`readPlan ${r.status} ${await r.text()}`);
  const j = await r.json();
  return j.fields?.plan?.stringValue ?? null;
}

/** write `plan` (a string) or delete it (null) — the mask names the field either way */
export async function writePlan(v: string | null): Promise<void> {
  const { uid } = await harnessDb();
  const body = v == null ? { fields: {} } : { fields: { plan: { stringValue: v } } };
  const r = await fetch(`${BASE}/users/${uid}?updateMask.fieldPaths=plan&currentDocument.exists=true`, {
    method: "PATCH", headers: { Authorization: `Bearer ${await adminToken()}`, "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`writePlan ${r.status} ${await r.text()}`);
}

/** every `zzadd1-` agent (by name), with its notes, and every activity naming it or its id; returns what it removed */
export async function cleanAdd1(): Promise<string[]> {
  const { db, uid } = await harnessDb();
  const gone: string[] = [];
  const ids: string[] = [];
  for (const a of (await getDocs(collection(db, "users", uid, "agents"))).docs) {
    const d = a.data() as { name?: string; agency?: string };
    if (!`${d.name ?? ""} ${d.agency ?? ""}`.includes(ADD1_PREFIX)) continue;
    ids.push(a.id);
    for (const n of (await getDocs(collection(db, "users", uid, "agents", a.id, "notes"))).docs) { await deleteDoc(n.ref); gone.push(`agents/${a.id}/notes/${n.id}`); }
    await deleteDoc(a.ref); gone.push(`agents/${a.id}`);
  }
  for (const c of ["activities", "tasks", "taskFlags"]) {
    for (const d of (await getDocs(collection(db, "users", uid, c))).docs) {
      const s = d.id + JSON.stringify(d.data());
      if (s.includes(ADD1_PREFIX) || ids.some((i) => s.includes(i))) { await deleteDoc(doc(db, "users", uid, c, d.id)); gone.push(`${c}/${d.id}`); }
    }
  }
  return gone;
}

export async function agentCount(): Promise<number> {
  const { db, uid } = await harnessDb();
  return (await getDocs(collection(db, "users", uid, "agents"))).size;
}

/** run `fn` with the harness on Pro; the plan, the zzadd1- agents and the agent count all come back exactly */
export async function withPro<T>(fn: () => Promise<T>): Promise<{ result: T; before: string | null; after: string | null; count0: number; count1: number; removed: string[] }> {
  await cleanAdd1();
  const before = await readPlan();
  const count0 = await agentCount();
  let result: T;
  let removed: string[] = [];
  try {
    await writePlan("Pro");
    result = await fn();
  } finally {
    await writePlan(before);
    removed = await cleanAdd1();
  }
  const after = await readPlan();
  const count1 = await agentCount();
  if (after !== before) throw new Error(`add1Admin: plan not restored (${before} → ${after})`);
  if (count1 !== count0) throw new Error(`add1Admin: agent count not restored (${count0} → ${count1})`);
  return { result: result!, before, after, count0, count1, removed };
}
