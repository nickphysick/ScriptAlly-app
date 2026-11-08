/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The in-memory Firestore of `fakeFirestore.ts`, with the reads and deletes an undo needs: `getDoc`,
 * `getDocs` over a collection or a `where(field, "in" | "==", …)` query, `deleteDoc`, `deleteField`,
 * and a batch that can delete. Same store, same `failWhen` (every write to a matching path rejects,
 * as a denied rule or a dropped connection would), same all-or-nothing batch.
 *
 * Install with `vi.mock("firebase/firestore", () => fakeFirestoreFull)`. `fakeStore.reads` counts
 * reads and `fakeStore.failReadsWhen` makes a matching read reject, for read-back checks.
 */
import { fakeStore, fakeFirestoreModule } from "./fakeFirestore";

type Ref = { path: string };
type Q = { coll: string; field?: string; op?: string; value?: unknown };
type Data = Record<string, unknown>;

const DELETE = Symbol("deleteField");
const readFail = { when: (_p: string) => false };
export const fakeReads = {
  failWhen(pred: (path: string) => boolean) { readFail.when = pred; },
  reset() { readFail.when = () => false; },
};
const readGuard = (path: string) => {
  if (readFail.when(path)) throw Object.assign(new Error(`UNAVAILABLE reading ${path}`), { code: "unavailable" });
};

/** a field patch, with `deleteField()` honoured */
const patch = (cur: Data | undefined, d: Data): Data => {
  const out: Data = { ...(cur ?? {}) };
  for (const [k, v] of Object.entries(d)) { if (v === DELETE) delete out[k]; else out[k] = v; }
  return out;
};
const children = (coll: string) => [...fakeStore.docs.entries()]
  .filter(([k]) => k.startsWith(coll + "/") && !k.slice(coll.length + 1).includes("/"));
const snapOf = (path: string) => {
  const data = fakeStore.docs.get(path);
  return { id: path.split("/").pop()!, ref: { path }, exists: () => data !== undefined, data: () => (data ? { ...data } : undefined) };
};

export const fakeFirestoreFull = {
  ...fakeFirestoreModule,
  deleteField: () => DELETE,
  collection: (_db: unknown, ...segments: string[]): Q => ({ coll: segments.join("/") }),
  where: (field: string, op: string, value: unknown) => ({ field, op, value }),
  query: (c: Q, w: { field: string; op: string; value: unknown }): Q => ({ ...c, ...w }),
  getDoc: async (ref: Ref) => { readGuard(ref.path); return snapOf(ref.path); },
  getDocs: async (q: Q) => {
    readGuard(q.coll);
    const rows = children(q.coll).filter(([, d]) => {
      if (!q.field) return true;
      const v = d[q.field];
      return q.op === "in" ? (q.value as unknown[]).includes(v) : v === q.value;
    }).map(([k]) => snapOf(k));
    return { docs: rows, forEach: (f: (s: ReturnType<typeof snapOf>) => void) => rows.forEach(f), empty: !rows.length, size: rows.length };
  },
  setDoc: async (ref: Ref, data: Data) => { fakeStore.writes.push(ref.path); if (fakeStore.failing(ref.path)) throw new Error(`PERMISSION_DENIED at ${ref.path}`); fakeStore.docs.set(ref.path, { ...data }); },
  updateDoc: async (ref: Ref, data: Data) => {
    fakeStore.writes.push(ref.path);
    if (fakeStore.failing(ref.path)) throw new Error(`PERMISSION_DENIED at ${ref.path}`);
    if (!fakeStore.docs.has(ref.path)) throw new Error(`NOT_FOUND ${ref.path}`);
    fakeStore.docs.set(ref.path, patch(fakeStore.docs.get(ref.path), data));
  },
  deleteDoc: async (ref: Ref) => { fakeStore.writes.push(ref.path); if (fakeStore.failing(ref.path)) throw new Error(`PERMISSION_DENIED at ${ref.path}`); fakeStore.docs.delete(ref.path); },
  writeBatch: () => {
    const ops: (() => void)[] = []; const paths: string[] = [];
    const b = {
      set: (ref: Ref, data: Data) => { paths.push(ref.path); ops.push(() => fakeStore.docs.set(ref.path, { ...data })); return b; },
      update: (ref: Ref, data: Data) => {
        paths.push(ref.path);
        ops.push(() => {
          if (!fakeStore.docs.has(ref.path)) throw new Error(`NOT_FOUND ${ref.path}`);
          fakeStore.docs.set(ref.path, patch(fakeStore.docs.get(ref.path), data));
        });
        return b;
      },
      delete: (ref: Ref) => { paths.push(ref.path); ops.push(() => fakeStore.docs.delete(ref.path)); return b; },
      /** how many operations the batch holds (for the 500 cap) */
      get size() { return paths.length; },
      commit: async () => {
        // every write is checked before any lands, so a refused write leaves the store untouched
        for (const p of paths) { fakeStore.writes.push(p); if (fakeStore.failing(p)) throw new Error(`PERMISSION_DENIED at ${p}`); }
        const before = new Map(fakeStore.docs);
        try { ops.forEach((op) => op()); } catch (e) { fakeStore.docs.clear(); before.forEach((v, k) => fakeStore.docs.set(k, v)); throw e; }
      },
    };
    return b;
  },
};

