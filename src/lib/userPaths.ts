/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * userPaths — write PART of a map on the user document without rewriting the map.
 *
 * ⚠️ WHY THIS EXISTS (Contact list v13, Phase 0). `todoPrefs` is one map shared by four owners:
 * the desk behaviours (staleMonths, rollForward, types), the To-do list view (`listView`), the
 * Noteboard (`noteboard`) and the Manuscripts tiles (`manuscripts`) — and Housekeeping's
 * `contacts` joins them. Settings saved a desk behaviour as `{ todoPrefs: { ...prefs, ...patch } }`,
 * where `prefs` is `todoPrefs()`'s TOTAL reader and therefore carries the three desk fields and
 * nothing else, so every desk save wiped the other owners' sub-maps.
 *
 * A dotted field path ("todoPrefs.types.send") is how Firestore updates one leaf and leaves its
 * siblings alone. `updateUserProfile` cannot carry one: it is typed `Partial<User>`, and its
 * optimistic spread would write a literal flat "todoPrefs.types.send" key into local state.
 * `applyUserPaths` is the local half — the same paths applied to a nested copy.
 */
import type { TaskTypeKey } from "./todoPrefs";

/** A desk-behaviour save: any of the three, and any subset of the type switches. */
export interface DeskPrefPatch {
  staleMonths?: number;
  rollForward?: boolean;
  types?: Partial<Record<TaskTypeKey, boolean>>;
}

/** Dotted field path → value. Every key is a path from the document root. */
export type UserPaths = Record<string, unknown>;

/** A copy of `obj` with each dotted path set, creating maps on the way. Never mutates. */
export function applyUserPaths<T extends object>(obj: T, paths: UserPaths): T {
  const root: Record<string, unknown> = { ...(obj as Record<string, unknown>) };
  for (const [path, value] of Object.entries(paths)) {
    const keys = path.split(".");
    let node = root;
    keys.forEach((k, i) => {
      if (i === keys.length - 1) { node[k] = value; return; }
      const next = node[k];
      const copy = next && typeof next === "object" && !Array.isArray(next)
        ? { ...(next as Record<string, unknown>) } : {};
      node[k] = copy;
      node = copy;
    });
  }
  return root as T;
}

/** The desk behaviours as leaf paths — `types` becomes one path per type, so saving one switch
 *  writes that switch and nothing else. */
export function deskPrefPaths(patch: DeskPrefPatch): UserPaths {
  const out: UserPaths = {};
  if (patch.staleMonths !== undefined) out["todoPrefs.staleMonths"] = patch.staleMonths;
  if (patch.rollForward !== undefined) out["todoPrefs.rollForward"] = patch.rollForward;
  for (const [k, v] of Object.entries(patch.types ?? {})) out[`todoPrefs.types.${k}`] = v;
  return out;
}
