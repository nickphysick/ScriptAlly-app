/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Record a response v2 — THE HOST of the response journey (QcRespondStages), the sibling of Log a query's LogStagesHost.
 * It reads every query that could have a reply (all books), the book's sizes, named synopses and versions, and its
 * `onSave` is the page's own batched writer: the answers become the existing plans (lib/queryActions/respondStages
 * `planOfResponse` over lib/qc152Write `planRecord` and lib/qc1522Write `planTell`), committed in ONE batch under ONE
 * snapshot (`commitMany`), then each note as the Notes tab saves one. Undo restores the snapshot and removes the notes.
 *
 * ⚠️ THE PREVIEW IS THE SAVE'S OWN PLAN: the card on the review is the Queries page's grid card for the query exactly as
 *    the plans leave it (`queryAfter`, the plans' own feed rows), never a mock-up.
 */
import React, { useMemo, useRef } from "react";
import { useScriptAllyDb } from "../../../lib/db";
import { ComponentType, QueryStatus, type Agent, type Query } from "../../../types";
import { buildQcRows } from "../../../lib/qcSummary";
import { stampRows } from "../../../lib/queryState";
import { commitMany, readLog, readFeed, refusedMarks } from "../../../lib/qc152Write";
import { restoreSnapshot } from "../../../lib/queryActions/snapshot";
import { bookOf } from "../../../lib/queryActions/sample";
import { bookVersionsOf, latestVersion, readVersions } from "../../../lib/bookVersions";
import { quietWeeksOf } from "../../../lib/queryState";
import { isLive } from "../../queryActions/journeys/common";
import { responseSaved } from "../../../lib/queryPanelStore";
import { useToast } from "../../toast/ToastProvider";
import { feedRowsOf, othersFor, planOfResponse, queryAfter, respCounts, type RKind, type RespAnswers } from "../../../lib/queryActions/respondStages";
import { QcRespondStages, type RespCtx, type RespQuery, type RespSaved } from "./QcRespondStages";

const isLiveVersion = (v: { status?: string; retiredAt?: unknown }) => (v.status ?? "Active") !== "Retired" && !v.retiredAt;
const firstOf = (a: Agent | null | undefined, fallback: string) => ((a?.name ?? "").trim().split(/\s+/)[0] || (a?.agency ?? "").trim() || fallback);

export const RespondStagesHost: React.FC<{
  seedQueryId: string | null;
  seedKind?: RKind | null;
  onClose: () => void;
  /** "Open {First}'s card": the query's card in the side panel, over the same page */
  onOpenCard: (queryId: string) => void;
  leaveRef?: React.MutableRefObject<(() => void) | null>;
}> = ({ seedQueryId, seedKind, onClose, onOpenCard, leaveRef }) => {
  const scriptDb = useScriptAllyDb();
  const { currentUser, queries, agents, manuscripts, activities, versions, addJournalEntry, deleteJournalEntry } = scriptDb;
  const { showToast } = useToast();
  const live = useRef(scriptDb);
  live.current = scriptDb;
  const nowMs = useMemo(() => Date.now(), []);
  const quietWeeks = quietWeeksOf(currentUser);

  /* every query that could have a reply, on every book: the Queries page's own rows (court, stage start) */
  const rows = useMemo(() => stampRows(buildQcRows(queries as Query[], agents, activities, nowMs), agents, { quietWeeks, nowMs }), [queries, agents, activities, nowMs, quietWeeks]);
  const list: RespQuery[] = useMemo(() => rows.map((r) => {
    const a = agents.find((x) => x.id === r.query.agentId) ?? null;
    return {
      id: r.id, name: r.agentName, first: firstOf(a, r.agentName.split(/\s+/)[0] || "the agent"), agency: r.agencyKey, status: r.status,
      sinceMs: r.stageStartMs ?? r.lastMs ?? r.sentMs ?? nowMs,
      group: r.court === "closed" ? "closed" as const : r.court === "agent" ? "wait" as const : "you" as const,
    };
  }), [rows, agents, nowMs]);

  const ctxOf = (id: string): RespCtx | null => {
    const q = queries.find((x) => x.id === id);
    if (!q) return null;
    const ms = manuscripts.find((m) => m.id === q.manuscriptId) ?? null;
    const a = agents.find((x) => x.id === q.agentId) ?? null;
    const synopses = (versions ?? []).filter((v) => v.manuscriptId === q.manuscriptId && v.componentType === ComponentType.SYNOPSIS && isLiveVersion(v as never))
      .sort((x, y) => String(y.createdDate ?? "").localeCompare(String(x.createdDate ?? ""))).map((v) => ({ id: v.id, name: v.versionName || "Synopsis" }));
    const bvs = bookVersionsOf(ms);
    const cur = latestVersion(bvs)?.id ?? null;
    const nums = new Map(readVersions(ms).map((v) => [v.id, v.original ? "Original" : `V${v.num}`]));
    const vs = [...bvs].sort((x, y) => y.createdDate.localeCompare(x.createdDate)).map((b) => ({ id: b.id, name: b.name, current: b.id === cur, short: nums.get(b.id) }));
    return { book: bookOf(ms?.wordCount), synopses, versions: vs, weeks: a?.responseTimeWeeks && a.responseTimeWeeks > 0 ? a.responseTimeWeeks : null, othersN: othersFor(q as Query, queries as Query[], isLive).length };
  };

  /* the plans, with the log as the page has it (the save reads the authoritative log again before it writes) */
  const planCtx = (q: Query, existing: { id: string; data: Record<string, unknown> }[], feed: { id: string; data: Record<string, unknown> }[]) => ({
    uid: currentUser?.id ?? "", q, agent: agents.find((x) => x.id === q.agentId) ?? null, ms: manuscripts.find((m) => m.id === q.manuscriptId) ?? null,
    existing, feed, nowMs: Date.now(), quietWeeks,
  });
  const localLog = (q: Query) => activities.filter((x) => x.queryId === q.id).map((x) => ({ id: x.id, data: { ...(x as unknown as Record<string, unknown>), createdAt: x.date } }));

  const previewOf = (id: string, a: RespAnswers) => {
    const q = queries.find((x) => x.id === id) as Query | undefined;
    if (!q) return null;
    const log = localLog(q);
    const others = othersFor(q, queries as Query[], isLive);
    let plans;
    try { plans = planOfResponse(planCtx(q, log, log), a, others); } catch { return null; }
    const after = queryAfter(q, plans);
    const acts = [...activities.filter((x) => x.queryId === q.id), ...feedRowsOf(plans)];
    const [row0] = buildQcRows([after], agents, acts, nowMs);
    if (!row0) return null;
    const [row] = stampRows([row0], agents, { quietWeeks, nowMs });
    const book = (queries as Query[]).filter((x) => x.manuscriptId === q.manuscriptId);
    return { row, packageName: (q as { sentPackageName?: string }).sentPackageName ?? null, counts: respCounts(book, q, after, a.kind) };
  };

  if (!currentUser) return null;

  const onSave = async (id: string, a: RespAnswers, notes: string[]): Promise<RespSaved | null> => {
    const uid = currentUser.id;
    const q = queries.find((x) => x.id === id) as Query | undefined;
    if (!q) return null;
    let snap;
    const pv = previewOf(id, a);
    let refused: string[] = [];
    try {
      const [existing, feed] = await Promise.all([readLog(uid, q.id), readFeed(uid, q.id)]);
      const others = othersFor(q, queries as Query[], isLive);
      const tell = a.kind === "of" && a.others === "task";
      const plans = planOfResponse(planCtx(q, existing, feed), a, others);
      try {
        snap = await commitMany(uid, plans, tell ? others.map((o) => o.id) : []);
      } catch (e) {
        /* the composer's own ruling (v152.1, Queries.tsx "tell"): a sibling at the rules' field ceiling refuses the marks
           and with them the batch. Probe each mark on its own (`refusedMarks`), save the reply and every accepted sibling
           in one batch, and name the refused ones, never dropping them silently. */
        if (!tell || (e as { code?: string })?.code !== "permission-denied") throw e;
        refused = await refusedMarks(uid, plans[plans.length - 1]);
        if (!refused.length) throw e;
        const kept = others.filter((o) => !refused.includes(o.id));
        snap = await commitMany(uid, planOfResponse(planCtx(q, existing, feed), a, kept), kept.map((o) => o.id));
      }
    } catch (e) {
      console.error("[record a response] save failed", e);
      showToast({ message: "Couldn't record the reply. Nothing was saved." });
      return null;
    }
    /* each note as the Notes tab saves one (a journal entry on the query, dated now), oldest first */
    const before = new Set(live.current.journalEntries.filter((j) => j.queryId === id).map((j) => j.id));
    for (const t of notes) await addJournalEntry(id, t);
    if (refused.length) {
      const names = refused.map((rid) => { const x = queries.find((y) => y.id === rid); const ag = agents.find((y) => y.id === x?.agentId); return ag?.name || ag?.agency || "an agent"; });
      showToast({ message: `Recorded. Couldn’t mark ${names.join(", ")} to tell.` });
    }
    /* the door that opened this response hears of it, once */
    responseSaved(id);
    const undo = async () => {
      await restoreSnapshot(snap!);
      for (const j of live.current.journalEntries.filter((x) => x.queryId === id && !before.has(x.id))) await deleteJournalEntry(j.id);
    };
    return { undo, openCard: () => onOpenCard(id), counts: pv?.counts ?? null };
  };

  return (
    <QcRespondStages nowMs={nowMs} queries={list} seedQueryId={seedQueryId && list.some((x) => x.id === seedQueryId) ? seedQueryId : null} seedKind={seedKind ?? null}
      ctxOf={ctxOf} previewOf={previewOf} onSave={onSave} onClose={onClose} leaveRef={leaveRef} />
  );
};

/** the To-do's and the card's preselected answer, in this journey's words */
export const kindOfReply = (r: "req" | "passed" | "rr" | "offer" | "more" | null | undefined, status: QueryStatus | string | null): RKind | null =>
  r === "req" ? (status === QueryStatus.PARTIAL_SENT || status === QueryStatus.FULL_SENT ? "fr" : "pr") : r === "passed" ? "no" : r === "rr" ? "rr" : r === "offer" ? "of" : null;

