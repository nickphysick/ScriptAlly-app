/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * A diagnostic (Nick, 6 Nov): what a page asks the Firestore emulator for — Listen stream opens (a POST to the Listen
 * channel with no SID), targets added and removed (each `addTarget` / `removeTarget` in a Listen body, by collection
 * path), long-poll reads (GET), and commits. Used by listenCount.measure.ts and, behind LISTEN_OUT, by qc1522.measure.ts.
 */
import type { Page, Request } from "@playwright/test";

/** "…/documents/users/{uid}/queries/{id}/activity" → "users/*\/queries/*\/activity" */
export const shape = (p: string) => p.replace(/^.*?\/documents\/?/, "").split("/").map((s, i) => (i % 2 === 1 ? "*" : s)).join("/");

export function targetsOf(body: string): { add: string[]; remove: number } {
  const add: string[] = []; let remove = 0;
  for (const [k, v] of new URLSearchParams(body)) {
    if (!/^req\d+___data__$/.test(k)) continue;
    let d: Record<string, unknown>;
    try { d = JSON.parse(v); } catch { continue; }
    const t = d.addTarget as { query?: { parent?: string; structuredQuery?: { from?: { collectionId?: string; allDescendants?: boolean }[] } }; documents?: { documents?: string[] } } | undefined;
    if (t?.query) {
      const from = t.query.structuredQuery?.from?.[0];
      add.push(`${shape(t.query.parent ?? "")}/${from?.collectionId ?? "?"}${from?.allDescendants ? " (group)" : ""}`.replace(/^\//, ""));
    } else if (t?.documents) for (const doc of t.documents.documents ?? []) add.push(`doc:${shape(doc)}`);
    if (d.removeTarget != null) remove++;
  }
  return { add, remove };
}

export interface Tally { t0: number; opens: number[]; gets: number; commits: number[]; removes: number; adds: { ms: number; path: string }[]; requests: Record<string, number> }

export function record(page: Page): Tally {
  const t: Tally = { t0: Date.now(), opens: [], gets: 0, commits: [], removes: 0, adds: [], requests: {} };
  page.on("request", (r: Request) => {
    const u = r.url(), ms = Date.now() - t.t0;
    if (/:8085\//.test(u)) { const k = `${r.method()} ${u.replace(/^https?:\/\/[^/]+/, "").replace(/\?.*$/, "").replace(/users\/[^/]+/, "users/*")}`; t.requests[k] = (t.requests[k] ?? 0) + 1; }
    if (/Firestore\/Listen\/channel/.test(u)) {
      if (r.method() === "GET") { t.gets++; return; }
      if (r.method() !== "POST") return;
      if (!/[?&]SID=/.test(u)) t.opens.push(ms);
      const { add, remove } = targetsOf(r.postData() ?? "");
      for (const path of add) t.adds.push({ ms, path });
      t.removes += remove;
    }
    if (/:commit\b|Firestore\/Write\/channel/.test(u) && r.method() === "POST") t.commits.push(ms);
  });
  return t;
}

export function byPath(t: Tally): [string, number][] {
  const m: Record<string, number> = {};
  for (const a of t.adds) m[a.path] = (m[a.path] ?? 0) + 1;
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
}
