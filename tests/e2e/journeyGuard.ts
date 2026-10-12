/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE LAST LINE OF RESTORE for a journey lock that writes to the shared harness account.
 *
 * A journey lock saves through the app and presses the app's own Undo. That Undo is the thing under test, so it
 * cannot also be the only way the account is put back: when the toast never arrives, a click is lost, or the
 * assertion before the press throws, the write stands. On 12 Oct seven queries were found carrying an offer's
 * "told" marks that way, and the next run of the same lock failed on them.
 *
 * So a lock takes `rawSet(ids)` before it saves and calls `restoreSet(before, ids)` in an `afterEach` or a
 * `finally`, pass or fail. It compares every document the save can touch with what was read, writes back any
 * that differ, and deletes any that were added. On a clean run it reads and writes nothing back.
 *
 * ⚠️ IT WRITES, to the dev harness account only (`harnessDb` refuses any other project). `harnessDocs.ts` is
 *    still read-only; this is the one file beside it that is not.
 * ⚠️ WHOLE DOCUMENTS, never a field patch: a document is put back exactly as it was read, so a field the save
 *    added goes too.
 */
import { collection, deleteDoc, doc, getDoc, getDocs, query as fsQuery, setDoc, where } from "firebase/firestore";
import { harnessDb } from "./harnessDocs";

export type Raw = Map<string, Record<string, unknown>>;

function canon(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  const o = v as Record<string, unknown>;
  if (typeof (o as { toMillis?: unknown }).toMillis === "function") return `ts:${(o as { toMillis: () => number }).toMillis()}`;
  if (Array.isArray(v)) return `[${v.map(canon).join(",")}]`;
  return `{${Object.keys(o).sort().map((k) => `${k}:${canon(o[k])}`).join(",")}}`;
}

/** Every document a query journey can touch for these queries: the query, its log, its feed rows, its flags and tasks. */
export async function rawSet(ids: readonly string[]): Promise<Raw> {
  const { db, uid } = await harnessDb();
  const out: Raw = new Map();
  for (const id of ids) {
    const q = await getDoc(doc(db, "users", uid, "queries", id));
    if (q.exists()) out.set(q.ref.path, q.data());
    (await getDocs(collection(db, "users", uid, "queries", id, "activity"))).forEach((d) => out.set(d.ref.path, d.data()));
    for (const c of ["activities", "taskFlags", "tasks"]) (await getDocs(fsQuery(collection(db, "users", uid, c), where("queryId", "==", id)))).forEach((d) => out.set(d.ref.path, d.data()));
  }
  return out;
}

/**
 * Put the account back to `before` for these queries. Returns what it had to repair (empty on a clean run).
 * `ids` may name queries the save CREATED: nothing of theirs is in `before`, so all of it is removed.
 */
export async function restoreSet(before: Raw, ids: readonly string[]): Promise<string[]> {
  const { db, uid } = await harnessDb();
  const root = `users/${uid}/queries/`;
  const known = [...before.keys()].filter((p) => p.startsWith(root) && p.split("/").length === 4).map((p) => p.split("/")[3]);
  const now = await rawSet([...new Set([...ids, ...known])]);
  const fixed: string[] = [];
  /* shortest path first: a deleted query is written back before the entries inside it */
  for (const [path, data] of [...before].sort((a, b) => a[0].length - b[0].length)) {
    const cur = now.get(path);
    if (cur && canon(cur) === canon(data)) continue;
    await setDoc(doc(db, path), data);
    fixed.push(`${cur ? "restored" : "re-created"} ${path}`);
  }
  for (const path of now.keys()) {
    if (before.has(path)) continue;
    await deleteDoc(doc(db, path));
    fixed.push(`removed ${path}`);
  }
  return fixed;
}
