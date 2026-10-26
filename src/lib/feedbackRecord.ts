/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE FOUNDING WRITER'S RECORD (Dashboard v77): "what your feedback changed".
 *
 * A live read of the writer's OWN `betaFeedback` docs (`where uid == me`, the rules allow exactly that),
 * with NO orderBy — so no composite index is needed — sorted here instead.
 *
 * The fields Nick sets by hand in the console (the function writes none of them; `betaFeedbackCore.ts`
 * documents the contract):
 *   status    "read" | "planned" | "built" | "fixed"   absent = sent
 *   title     string ≤ 120, the short public title       absent = the message's first 60 characters, quoted
 *   statusAt  timestamp                                  absent = no result date in the tooltip
 *
 * Changed = built + fixed. Nothing here writes.
 */
import { useEffect, useState } from "react";
import { dayMonth } from "./dates";

export type FeedbackStatus = "sent" | "read" | "planned" | "built" | "fixed";
export const STATUS_LABEL: Record<FeedbackStatus, string> = { sent: "Sent", read: "Read", planned: "Planned", built: "Built", fixed: "Fixed" };

/** One `betaFeedback` doc as the card needs it. Times are epoch ms (or null when unknown). */
export interface FeedbackDoc {
  id: string;
  kind?: string;
  message?: string;
  title?: string;
  status?: string;
  statusAt?: number | null;
  createdAt?: number | null;
}

export interface FeedbackRow { id: string; title: string; status: FeedbackStatus; statusLabel: string; tooltip: string }

export interface FeedbackRecord { loading: boolean; error: boolean; sent: number; changed: number; rows: FeedbackRow[] }

const STATUSES: readonly FeedbackStatus[] = ["sent", "read", "planned", "built", "fixed"];
const statusOf = (s: unknown): FeedbackStatus => (STATUSES.includes(s as FeedbackStatus) ? (s as FeedbackStatus) : "sent");

/** "“A bulk nudge for everyone quiet…”": the first 60 characters, in curly quotes, an ellipsis if cut. */
export function titleOf(d: Pick<FeedbackDoc, "title" | "message">): string {
  const t = typeof d.title === "string" ? d.title.trim() : "";
  if (t) return t.slice(0, 120);
  const m = (d.message ?? "").replace(/\s+/g, " ").trim();
  const clip = m.length > 60 ? `${m.slice(0, 60).trimEnd()}…` : m;
  return `“${clip}”`;
}

const NOUN: Record<string, string> = { "An idea": "Your idea", "Something's broken": "Your report" };

/** "Your idea, 2 Oct → Shipped 20 Oct". */
export function tooltipOf(d: FeedbackDoc): string {
  const status = statusOf(d.status);
  const noun = (d.kind && NOUN[d.kind]) || "Your feedback";
  const when = d.createdAt != null ? `, ${dayMonth(d.createdAt)}` : "";
  const on = d.statusAt != null ? ` ${dayMonth(d.statusAt)}` : "";
  const result = status === "built" ? `Shipped${on}` : status === "fixed" ? `Fixed${on}` : status === "planned" ? "On the list" : status === "read" ? "Read by our founder" : "We read all feedback";
  return `${noun}${when} → ${result}`;
}

const RANK: Record<FeedbackStatus, number> = { built: 0, fixed: 0, planned: 1, read: 2, sent: 3 };

/** The record: built/fixed (newest statusAt first), then planned, then read, then sent (newest createdAt first). */
export function recordOf(docs: readonly FeedbackDoc[]): Omit<FeedbackRecord, "loading" | "error"> {
  const sorted = [...docs].sort((a, b) => {
    const sa = statusOf(a.status), sb = statusOf(b.status);
    if (RANK[sa] !== RANK[sb]) return RANK[sa] - RANK[sb];
    if (RANK[sa] === 0) return (b.statusAt ?? 0) - (a.statusAt ?? 0) || (b.createdAt ?? 0) - (a.createdAt ?? 0);
    return (b.createdAt ?? 0) - (a.createdAt ?? 0);
  });
  return {
    sent: docs.length,
    changed: docs.filter((d) => { const s = statusOf(d.status); return s === "built" || s === "fixed"; }).length,
    rows: sorted.map((d) => { const status = statusOf(d.status); return { id: d.id, title: titleOf(d), status, statusLabel: STATUS_LABEL[status], tooltip: tooltipOf(d) }; }),
  };
}

/**
 * The card's just-sent notes, shown at once and dropped the moment the live snapshot carries them (the
 * same kind and the same message). A pending note is always "sent" and always newest.
 */
export function mergePending(docs: readonly FeedbackDoc[], pending: readonly FeedbackDoc[]): FeedbackDoc[] {
  const live = pending.filter((p) => !docs.some((d) => d.kind === p.kind && (d.message ?? "").trim() === (p.message ?? "").trim()));
  return [...docs, ...live];
}

/** Firestore Timestamp, Date, ISO string or ms → ms (or null). */
export function toMs(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") { const t = Date.parse(v); return Number.isNaN(t) ? null : t; }
  if (v instanceof Date) return v.getTime();
  const o = v as { toMillis?: () => number; seconds?: number };
  if (typeof o.toMillis === "function") return o.toMillis();
  if (typeof o.seconds === "number") return o.seconds * 1000;
  return null;
}

type Aid = { __SA_FEEDBACK_ROWS?: unknown };

/**
 * The live read. ⚠️ NO orderBy (no index); the rules allow only `where uid == me`.
 * ⚠️ DEV REVIEW AID: `window.__SA_FEEDBACK_ROWS = [...]` hands the hook fixture docs instead of the
 * snapshot, so a lock can see four rows on an account that has none (nothing a client can do creates a
 * `betaFeedback` doc). The branch is dead in a production build: `MODE` is replaced statically.
 */
export function useFeedbackRecord(uid: string | null | undefined): FeedbackRecord & { docs: FeedbackDoc[] } {
  const [state, setState] = useState<{ loading: boolean; error: boolean; docs: FeedbackDoc[] }>({ loading: true, error: false, docs: [] });
  useEffect(() => {
    if (import.meta.env.MODE !== "production" && typeof window !== "undefined" && Array.isArray((window as unknown as Aid).__SA_FEEDBACK_ROWS)) {
      const rows = (window as unknown as Aid).__SA_FEEDBACK_ROWS as FeedbackDoc[];
      setState({ loading: false, error: false, docs: rows.map((r) => ({ ...r, statusAt: toMs(r.statusAt), createdAt: toMs(r.createdAt) })) });
      return undefined;
    }
    if (!uid) { setState({ loading: false, error: false, docs: [] }); return undefined; }
    let off: (() => void) | undefined;
    let live = true;
    void (async () => {
      try {
        const [{ collection, onSnapshot, query, where }, { db }] = await Promise.all([import("firebase/firestore"), import("./firebase")]);
        if (!live) return;
        off = onSnapshot(query(collection(db, "betaFeedback"), where("uid", "==", uid)), (snap) => {
          const docs = snap.docs.map((d) => {
            const x = d.data({ serverTimestamps: "estimate" }) as Record<string, unknown>;
            return { id: d.id, kind: x.kind as string | undefined, message: x.message as string | undefined, title: x.title as string | undefined, status: x.status as string | undefined, statusAt: toMs(x.statusAt), createdAt: toMs(x.createdAt) };
          });
          setState({ loading: false, error: false, docs });
        }, () => setState((s) => ({ ...s, loading: false, error: true })));
      } catch {
        if (live) setState((s) => ({ ...s, loading: false, error: true }));
      }
    })();
    return () => { live = false; off?.(); };
  }, [uid]);
  const r = recordOf(state.docs);
  return { loading: state.loading, error: state.error, docs: state.docs, ...r };
}
