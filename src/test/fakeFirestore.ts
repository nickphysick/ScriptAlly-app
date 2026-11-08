/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * An in-memory stand-in for the parts of `firebase/firestore` the db.tsx write cores use, for unit
 * tests (node env, no emulator). Install with `vi.mock("firebase/firestore", () => fakeFirestoreModule)`.
 *
 * Documents live in `fakeStore.docs` keyed by their slash path. `fakeStore.failWhen(path => …)`
 * makes every write to a matching path reject, as a denied rule or a dropped connection would.
 * A batch is all-or-nothing: if any of its writes would fail, none of them lands.
 */
type Ref = { path: string };
export const fakeStore = {
  docs: new Map<string, Record<string, unknown>>(),
  failing: (_path: string) => false,
  writes: [] as string[],
  reset() { this.docs.clear(); this.failing = () => false; this.writes = []; },
  failWhen(pred: (path: string) => boolean) { this.failing = pred; },
  count(prefix: string) { return [...this.docs.keys()].filter((k) => k.startsWith(prefix) && !k.slice(prefix.length).includes("/")).length; },
};
const denied = (path: string) => Object.assign(new Error(`PERMISSION_DENIED at ${path}`), { code: "permission-denied" });
const guard = (path: string) => { fakeStore.writes.push(path); if (fakeStore.failing(path)) throw denied(path); };

export const fakeFirestoreModule = {
  doc: (_db: unknown, ...segments: string[]): Ref => ({ path: segments.join("/") }),
  setDoc: async (ref: Ref, data: Record<string, unknown>) => { guard(ref.path); fakeStore.docs.set(ref.path, { ...data }); },
  updateDoc: async (ref: Ref, data: Record<string, unknown>) => {
    guard(ref.path);
    if (!fakeStore.docs.has(ref.path)) throw new Error(`NOT_FOUND ${ref.path}`);
    fakeStore.docs.set(ref.path, { ...fakeStore.docs.get(ref.path), ...data });
  },
  writeBatch: () => {
    const ops: (() => void)[] = []; const paths: string[] = [];
    const b = {
      set: (ref: Ref, data: Record<string, unknown>) => { paths.push(ref.path); ops.push(() => fakeStore.docs.set(ref.path, { ...data })); return b; },
      update: (ref: Ref, data: Record<string, unknown>) => {
        paths.push(ref.path);
        ops.push(() => {
          if (!fakeStore.docs.has(ref.path)) throw new Error(`NOT_FOUND ${ref.path}`);
          fakeStore.docs.set(ref.path, { ...fakeStore.docs.get(ref.path), ...data });
        });
        return b;
      },
      commit: async () => {
        for (const p of paths) guard(p);
        for (const p of paths.filter((x) => !fakeStore.docs.has(x))) void p;
        // all-or-nothing: run against a copy, then swap in
        const before = new Map(fakeStore.docs);
        try { ops.forEach((op) => op()); } catch (e) { fakeStore.docs.clear(); before.forEach((v, k) => fakeStore.docs.set(k, v)); throw e; }
      },
    };
    return b;
  },
};
