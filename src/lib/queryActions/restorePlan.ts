/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The pure half of undo-by-snapshot (see snapshot.ts): given what was read before a save and what
 * is there now, what undo must delete and what it must write back. Its own module so it is testable
 * without a Firebase app.
 */
import type { DocumentData } from "firebase/firestore";

export interface DocSnap { path: string; data: DocumentData | null }

/** Stable comparison of two document bodies — key order never makes two equal documents differ. */
function canon(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  const o = v as Record<string, unknown>;
  if (typeof (o as { toMillis?: unknown }).toMillis === "function") return `ts:${(o as { toMillis: () => number }).toMillis()}`;
  if (Array.isArray(v)) return `[${v.map(canon).join(",")}]`;
  return `{${Object.keys(o).sort().map((k) => `${k}:${canon(o[k])}`).join(",")}}`;
}

export interface RestorePlan { remove: string[]; write: DocSnap[] }

/** The pure half: what undo must delete and what it must write back. */
export function planRestore(before: Map<string, DocumentData>, now: Map<string, DocumentData>): RestorePlan {
  const remove: string[] = [];
  const write: DocSnap[] = [];
  for (const [path, data] of now) if (!before.has(path)) remove.push(path);
  for (const [path, data] of before) {
    const cur = now.get(path);
    if (!cur || canon(cur) !== canon(data)) write.push({ path, data });
  }
  return { remove, write };
}

