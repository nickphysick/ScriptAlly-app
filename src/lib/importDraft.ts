/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD FIRST VISIT v2, Part F — A SMART IMPORT REVIEW, KEPT: the Firestore half. `importDrafts/{uid}` holds the
 * meta (what the dashboard's resume card reads); `importDrafts/{uid}/parts/{n}` hold the JSON payload in order.
 *
 * ⚠️ ONLY THE OWNER READS OR WRITES IT (firestore.rules), `updatedAt` is the server's time, and the daily clean-up
 * (functions/src/importDrafts.ts) deletes a draft 7 days after its last change. Finishing the import deletes it.
 * ⚠️ A SAVE NEVER BLOCKS THE REVIEW: a failed write is logged and the review carries on.
 */
import { collection, doc, getDoc, getDocs, onSnapshot, serverTimestamp, writeBatch, type Timestamp } from "firebase/firestore";
import { db } from "./firebase";
import { draftCounts, joinParts, splitParts, type DraftCounts, type DraftPayload, type ReviewStep } from "./importDraftModel";

export interface DraftMeta extends DraftCounts {
  uid: string;
  fileName: string;
  source: "smart" | "template";
  manuscriptId: string | null;
  step: ReviewStep;
  parts: number;
  startedAt: string;
  /** ms since the epoch (the server's `updatedAt`), or null while the write is pending */
  updatedMs: number | null;
}

const metaRef = (uid: string) => doc(db, "importDrafts", uid);
const partsCol = (uid: string) => collection(db, "importDrafts", uid, "parts");

export interface SaveDraftInput { uid: string; fileName: string; source: "smart" | "template"; manuscriptId: string | null; startedAt: string; payload: DraftPayload }

/** Write the draft: the parts first, then the meta (so a meta never names parts that are not there yet). */
export async function saveDraft(i: SaveDraftInput): Promise<void> {
  const parts = splitParts(JSON.stringify(i.payload));
  const before = await getDoc(metaRef(i.uid));
  const had = (before.data()?.parts as number | undefined) ?? 0;
  const batch = writeBatch(db);
  parts.forEach((data, n) => batch.set(doc(partsCol(i.uid), String(n)), { i: n, data }));
  for (let n = parts.length; n < had; n += 1) batch.delete(doc(partsCol(i.uid), String(n)));
  const c = draftCounts(i.payload.review);
  batch.set(metaRef(i.uid), {
    uid: i.uid, fileName: i.fileName, source: i.source, manuscriptId: i.manuscriptId, step: i.payload.review.screen,
    ...c, parts: parts.length, startedAt: i.startedAt, updatedAt: serverTimestamp(), version: 1,
  });
  await batch.commit();
}

export async function loadDraft(uid: string): Promise<{ meta: DraftMeta; payload: DraftPayload } | null> {
  const m = await getDoc(metaRef(uid));
  if (!m.exists()) return null;
  const meta = toMeta(m.data());
  const ps = await getDocs(partsCol(uid));
  const parts = ps.docs.map((d) => d.data() as { i: number; data: string }).filter((p) => p.i < meta.parts);
  if (parts.length !== meta.parts) return null;
  try { return { meta, payload: JSON.parse(joinParts(parts)) as DraftPayload }; } catch { return null; }
}

/** Delete the draft and every part. */
export async function deleteDraft(uid: string): Promise<void> {
  const ps = await getDocs(partsCol(uid));
  const batch = writeBatch(db);
  for (const d of ps.docs) batch.delete(d.ref);
  batch.delete(metaRef(uid));
  await batch.commit();
}

const toMeta = (d: Record<string, unknown>): DraftMeta => ({
  uid: String(d.uid ?? ""), fileName: String(d.fileName ?? ""), source: d.source === "template" ? "template" : "smart",
  manuscriptId: typeof d.manuscriptId === "string" ? d.manuscriptId : null,
  step: (d.step as ReviewStep) ?? "agents",
  agentsChecked: Number(d.agentsChecked ?? 0), agentsTotal: Number(d.agentsTotal ?? 0),
  queriesChecked: Number(d.queriesChecked ?? 0), queriesTotal: Number(d.queriesTotal ?? 0), queriesStarted: d.queriesStarted === true,
  parts: Number(d.parts ?? 0), startedAt: String(d.startedAt ?? ""),
  updatedMs: (d.updatedAt as Timestamp | null | undefined)?.toMillis?.() ?? null,
});

/** The dashboard's read: the meta only, live. `null` when there is no draft. */
export function subscribeDraftMeta(uid: string, cb: (m: DraftMeta | null) => void): () => void {
  return onSnapshot(metaRef(uid), (s) => cb(s.exists() ? toMeta(s.data()) : null), () => cb(null));
}

/** For a lab or a test: the meta document's path. */
export const draftPath = (uid: string) => `importDrafts/${uid}`;
