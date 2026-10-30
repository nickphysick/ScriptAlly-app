/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The shared e2e account's fingerprint (phone fixes v1, Phase G): for every store under users/<uid>, the document
 * count and a hash of the sorted documents. Taken before and after the journeys, which never sign into this account;
 * two equal fingerprints are the proof it ended as it started.  PFJ_SNAPSHOT=<file> writes it.
 */
import { test } from "@playwright/test";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { devDb } from "./devWrite";

const STORES = ["activities", "agents", "attachments", "dismissedTasks", "journalEntries", "manuscripts", "notes", "packages", "queries", "taskFlags", "tasks", "versions"];
const stable = (v: unknown): unknown => Array.isArray(v) ? v.map(stable) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, stable((v as Record<string, unknown>)[k])])) : v;

test("shared account fingerprint", async () => {
  test.skip(!process.env.PFJ_SNAPSHOT, "PFJ_SNAPSHOT=<file>");
  test.setTimeout(300_000);
  const { db, uid } = await devDb();
  const out: Record<string, { n: number; sha: string }> = {};
  for (const s of STORES) {
    const docs = (await getDocs(collection(db, "users", uid, s))).docs.map((d) => [d.id, stable(d.data())]).sort((a, b) => String(a[0]).localeCompare(String(b[0])));
    out[s] = { n: docs.length, sha: createHash("sha256").update(JSON.stringify(docs)).digest("hex").slice(0, 16) };
  }
  const user = stable((await getDoc(doc(db, "users", uid))).data());
  out.user = { n: 1, sha: createHash("sha256").update(JSON.stringify(user)).digest("hex").slice(0, 16) };
  writeFileSync(process.env.PFJ_SNAPSHOT!, JSON.stringify(out, null, 1));
  /* the user document's fields themselves, beside the fingerprint, so a changed hash can be traced to its field */
  writeFileSync(process.env.PFJ_SNAPSHOT!.replace(/\.json$/, "-user.json"), JSON.stringify(user, null, 1));
});
