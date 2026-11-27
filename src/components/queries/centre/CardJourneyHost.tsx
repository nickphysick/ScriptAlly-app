/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Card journeys v1 — THE HOST of a card journey (QcCardJourney), the sibling of RespondStagesHost. It reads the query, its
 * book (sizes, named synopses, versions) and its log, and its `onSave` is the page's own batched writer: the journey's
 * plans (the existing writers, lib/qc152Write `planRecord`, lib/qc1522Write `planSigned` / `planUnpass`) committed in ONE
 * batch under ONE snapshot (`commitMany`), then each note as the Notes tab saves one. Undo restores the snapshot and
 * removes the notes.
 *
 * ⚠️ THE PREVIEW IS THE SAVE'S OWN PLAN: the card on the review is the Queries page's grid card for the query exactly as
 *    the plans leave it (`queryAfter`, the plans' own feed rows), never a mock-up.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useScriptAllyDb } from "../../../lib/db";
import { ComponentType, type Agent, type Query } from "../../../types";
import { buildQcRows } from "../../../lib/qcSummary";
import { quietWeeksOf, stampRows } from "../../../lib/queryState";
import { commitMany, readFeed, readLog, refusedMarks } from "../../../lib/qc152Write";
import { restoreSnapshot } from "../../../lib/queryActions/snapshot";
import { bookOf } from "../../../lib/queryActions/sample";
import { bookVersionsOf, latestVersion, readVersions } from "../../../lib/bookVersions";
import { isLive } from "../../queryActions/journeys/common";
import { cardJourneySaved, type CardJourneyKind } from "../../../lib/queryPanelStore";
import { useToast } from "../../toast/ToastProvider";
import { feedRowsOf, othersFor, queryAfter } from "../../../lib/queryActions/respondStages";
import { QcCardJourney, type CJCtx, type CJSaved, type CJSpec } from "./QcCardJourney";
import type { RawActivityDoc } from "../../../lib/recomputeFields";
import { CJ_SPECS } from "./cardJourneySpecs";

const isLiveVersion = (v: { status?: string; retiredAt?: unknown }) => (v.status ?? "Active") !== "Retired" && !v.retiredAt;
const firstOf = (a: Agent | null | undefined, fallback: string) => ((a?.name ?? "").trim().split(/\s+/)[0] || (a?.agency ?? "").trim() || fallback);

export const CardJourneyHost: React.FC<{
  queryId: string;
  kind: CardJourneyKind;
  fromCard: boolean;
  onClose: () => void;
  onHandOver: (reply: "passed" | null) => void;
  leaveRef?: React.MutableRefObject<(() => void) | null>;
  /** Phone query sheet v1 — the phone's presentation of the same journey and save (QcCardJourney `phone`) */
  phone?: boolean;
  verb?: string;
  onPhoneSaved?: (saved: CJSaved, head: [string, string]) => void;
}> = ({ queryId, kind, fromCard, onClose, onHandOver, leaveRef, phone, verb, onPhoneSaved }) => {
  const scriptDb = useScriptAllyDb();
  const { currentUser, queries, agents, manuscripts, activities, versions, addJournalEntry, deleteJournalEntry } = scriptDb;
  const { showToast } = useToast();
  const live = useRef(scriptDb);
  live.current = scriptDb;
  const nowMs = useMemo(() => Date.now(), []);
  const quietWeeks = quietWeeksOf(currentUser);
  const spec = CJ_SPECS[kind] as CJSpec<unknown> | undefined;

  /* the context is read once, as the journey opens: the journey answers about the query as it was then */
  const ctx = useMemo((): CJCtx | null => {
    const q = queries.find((x) => x.id === queryId) as Query | undefined;
    if (!q) return null;
    const ms = manuscripts.find((m) => m.id === q.manuscriptId) ?? null;
    const a = agents.find((x) => x.id === q.agentId) ?? null;
    const synopses = (versions ?? []).filter((v) => v.manuscriptId === q.manuscriptId && v.componentType === ComponentType.SYNOPSIS && isLiveVersion(v as never))
      .sort((x, y) => String(y.createdDate ?? "").localeCompare(String(x.createdDate ?? ""))).map((v) => ({ id: v.id, name: v.versionName || "Synopsis" }));
    const bvs = bookVersionsOf(ms);
    const cur = latestVersion(bvs)?.id ?? null;
    const nums = new Map(readVersions(ms).map((v) => [v.id, v.original ? "Original" : `V${v.num}`]));
    const vs = [...bvs].sort((x, y) => y.createdDate.localeCompare(x.createdDate)).map((b) => ({ id: b.id, name: b.name, current: b.id === cur, short: nums.get(b.id) }));
    const log = activities.filter((x) => x.queryId === q.id).sort((x, y) => String(x.date).localeCompare(String(y.date)));
    return {
      q, first: firstOf(a, "the agent"), nowMs, book: bookOf(ms?.wordCount), synopses, versions: vs,
      weeks: a?.responseTimeWeeks && a.responseTimeWeeks > 0 ? a.responseTimeWeeks : null,
      othersN: othersFor(q, queries as Query[], isLive).length, otherIds: othersFor(q, queries as Query[], isLive).map((o) => o.id), log,
      book_queries: (queries as Query[]).filter((x) => x.manuscriptId === q.manuscriptId),
    };
  }, [queryId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* the query's own log and feed, read once as the journey opens: the review previews from the same records the save will
     read (the page's feed rows can lack what the log has, e.g. an older close's resultingStatus) */
  const [logs, setLogs] = useState<{ existing: RawActivityDoc[]; feed: RawActivityDoc[] } | null>(null);
  useEffect(() => {
    const uid0 = currentUser?.id;
    if (!uid0) return undefined;
    let live0 = true;
    Promise.all([readLog(uid0, queryId), readFeed(uid0, queryId)]).then(([existing, feed]) => { if (live0) setLogs({ existing, feed }); }).catch(() => {});
    return () => { live0 = false; };
  }, [queryId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!currentUser || !ctx || !spec) return null;
  const uid = currentUser.id;
  const agentOf = (q: Query) => agents.find((x) => x.id === q.agentId) ?? null;
  const msOf = (q: Query) => manuscripts.find((m) => m.id === q.manuscriptId) ?? null;
  const localLog = (q: Query) => activities.filter((x) => x.queryId === q.id).map((x) => ({ id: x.id, data: { ...(x as unknown as Record<string, unknown>), createdAt: x.date } }));

  const previewOf = (s: unknown) => {
    const q = ctx.q;
    const log = localLog(q);
    let plans;
    try { plans = spec.write.plans({ uid, q, agent: agentOf(q), ms: msOf(q), existing: logs?.existing ?? log, feed: logs?.feed ?? log, nowMs: Date.now(), quietWeeks }, s, ctx); } catch { return null; }
    const after = queryAfter(q, plans);
    const gone = new Set(plans.flatMap((p) => p.del).filter((d) => d.startsWith("activities/")).map((d) => d.slice("activities/".length)));
    const acts = [...activities.filter((x) => x.queryId === q.id && !gone.has(x.id) && !plans.some((p) => p.del.includes(`queries/${q.id}/activity/${x.id}`))), ...feedRowsOf(plans)];
    const [row0] = buildQcRows([after], agents, acts, nowMs);
    if (!row0) return null;
    const [row] = stampRows([row0], agents, { quietWeeks, nowMs });
    return { row, packageName: (q as { sentPackageName?: string }).sentPackageName ?? null, counts: spec.write.counts(ctx, after, s) };
  };
  const rowOf = () => {
    const q = live.current.queries.find((x) => x.id === queryId) as Query | undefined;
    if (!q) return null;
    const [r0] = buildQcRows([q], live.current.agents, live.current.activities.filter((x) => x.queryId === q.id), nowMs);
    return r0 ? stampRows([r0], live.current.agents, { quietWeeks, nowMs })[0] ?? null : null;
  };

  const onSave = async (s: unknown, notes: string[]): Promise<CJSaved | null> => {
    const q = ctx.q;
    const pv = previewOf(s);
    let snap;
    let refused: string[] = [];
    try {
      const [existing, feed] = await Promise.all([readLog(uid, q.id), readFeed(uid, q.id)]);
      const pcNow = { uid, q, agent: agentOf(q), ms: msOf(q), existing, feed, nowMs: Date.now(), quietWeeks };
      const plans = spec.write.plans(pcNow, s, ctx);
      const extra = spec.write.extraIds?.(s, ctx) ?? [];
      try {
        snap = await commitMany(uid, plans, extra);
      } catch (e) {
        /* Record a response's own ruling (v152.1): a sibling at the rules' field ceiling refuses its mark and with it the
           batch. Probe each mark on its own (`refusedMarks`), save the step and every accepted sibling in one batch, and
           name the refused ones, never dropping them silently. */
        if (!extra.length || (e as { code?: string })?.code !== "permission-denied") throw e;
        refused = await refusedMarks(uid, plans[plans.length - 1]);
        if (!refused.length) throw e;
        const kept = { ...ctx, otherIds: (ctx.otherIds ?? []).filter((x) => !refused.includes(x)) };
        snap = await commitMany(uid, spec.write.plans(pcNow, s, kept), spec.write.extraIds?.(s, kept) ?? []);
      }
    } catch (e) {
      console.error(`[card journey · ${kind}] save failed`, e);
      showToast({ message: "Couldn't save that. Nothing was changed." });
      return null;
    }
    const before = new Set(live.current.journalEntries.filter((j) => j.queryId === q.id).map((j) => j.id));
    for (const t of notes) await addJournalEntry(q.id, t);
    if (refused.length) {
      const names = refused.map((rid) => { const x = queries.find((y) => y.id === rid); const ag = agents.find((y) => y.id === x?.agentId); return ag?.name || ag?.agency || "an agent"; });
      showToast({ message: `Logged. Couldn’t mark ${names.join(", ")} to tell.` });
    }
    cardJourneySaved(q.id);
    const undo = async () => {
      await restoreSnapshot(snap!);
      for (const j of live.current.journalEntries.filter((x) => x.queryId === q.id && !before.has(x.id))) await deleteJournalEntry(j.id);
    };
    return { undo, counts: pv?.counts ?? [] };
  };

  return <QcCardJourney spec={spec} ctx={ctx} previewOf={previewOf} onSave={onSave} rowOf={rowOf} onClose={onClose} onHandOver={onHandOver} fromCard={fromCard} leaveRef={leaveRef} phone={phone} verb={verb} onPhoneSaved={onPhoneSaved} />;
};
