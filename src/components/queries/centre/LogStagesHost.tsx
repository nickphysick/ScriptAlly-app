/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Log a query v1 — THE ONE HOST of the staged journey, rendered by both mount sites (the Query Centre's "+ Log a query"
 * and the Contact list's log flow). It reads the book's agents, packages, letters, synopses and book versions, and its
 * `onSave` is the log save the old form used: a snapshot first, `saveLog` with `logDefaults` and the piece versions the
 * answers name, then the note on the query's card. Undo is that snapshot, restored.
 *
 * ⚠️ The two sites differ only in what "Open {First}'s card" does, so that is the one prop they pass.
 * ⚠️ This replaces the two hand-mirrored `onSaveLog`s the old form had (Queries.tsx and ContactLogFlow.tsx).
 */
import React, { useMemo, useRef } from "react";
import { collection, doc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { useScriptAllyDb } from "../../../lib/db";
import { ComponentType, QueryStatus, type Manuscript } from "../../../types";
import { activePackageId, packagesFor } from "../../../lib/queryActions/packages";
import { saveLog } from "../../../lib/queryActions/logSave";
import { restoreSnapshot, takeSnapshot } from "../../../lib/queryActions/snapshot";
import { planOf, stageAgents, type BookChoice, type Choice, type LogAnswers, type PlanContext, type StagePackage } from "../../../lib/queryActions/logStages";
import { bookVersionsOf, latestVersion } from "../../../lib/bookVersions";
import { previousQueryFor } from "../../../lib/requery";
import { quietWeeksOf } from "../../../lib/queryState";
import { openNewAgentCard } from "../../../lib/agentCardStore";
import { isLive as qaIsLive } from "../../queryActions/journeys/common";
import { useToast } from "../../toast/ToastProvider";
import { QcLogStages, type Logged } from "./QcLogStages";

const isLiveVersion = (v: { status?: string; retiredAt?: unknown }) => (v.status ?? "Active") !== "Retired" && !v.retiredAt;

export const LogStagesHost: React.FC<{
  ms: Manuscript;
  seedAgentId: string | null;
  onClose: () => void;
  /** "Open {First}'s card": the site's own open-query door */
  onOpenCard: (queryId: string) => void;
}> = ({ ms, seedAgentId, onClose, onOpenCard }) => {
  const scriptDb = useScriptAllyDb();
  const { currentUser, agents, queries, packages, versions, addJournalEntry, deleteJournalEntry } = scriptDb;
  const { showToast } = useToast();
  /* Undo runs later than the save: it reads the journal as it is then, not as it was when the save began */
  const live = useRef(scriptDb);
  live.current = scriptDb;
  const nowMs = useMemo(() => Date.now(), []);
  const forBook = useMemo(() => queries.filter((q) => q.manuscriptId === ms.id), [queries, ms.id]);

  const model = useMemo(() => {
    const stAgents = stageAgents(agents, forBook.filter(qaIsLive), nowMs);
    const active = activePackageId(ms, packages);
    const stPackages: StagePackage[] = packagesFor(ms.id, packages, versions, ms.bookVersions).map((c) => ({
      id: c.id, name: c.name, active: c.id === active, card: c,
      pieces: [c.ql ? (c.qlVersion || "Query letter") : null, c.syn ? (c.synVersion || "Synopsis") : null, c.bookVersion ? `Opening from ${c.bookVersion}` : null, c.other]
        .filter((x): x is string => !!x),
    }));
    const of = (t: ComponentType): Choice[] => (versions ?? [])
      .filter((v) => v.manuscriptId === ms.id && v.componentType === t && isLiveVersion(v as never))
      .sort((a, b) => String(b.createdDate ?? "").localeCompare(String(a.createdDate ?? "")))
      .map((v) => ({ id: v.id, name: v.versionName || (t === ComponentType.QUERY_LETTER ? "Query letter" : "Synopsis") }));
    const bvs = bookVersionsOf(ms);
    const cur = latestVersion(bvs)?.id ?? null;
    const bookVersions: BookChoice[] = [...bvs].sort((a, b) => b.createdDate.localeCompare(a.createdDate)).map((b) => ({ id: b.id, name: b.name, current: b.id === cur }));
    const ctx: PlanContext = { manuscriptId: ms.id, agents, packages: stPackages, letters: of(ComponentType.QUERY_LETTER), synopses: of(ComponentType.SYNOPSIS), bookVersions };
    return { stAgents, stPackages, active, ctx };
  }, [agents, forBook, packages, versions, ms, nowMs]);

  if (!currentUser) return null;

  const onSave = async (a: LogAnswers): Promise<Logged | null> => {
    const uid = currentUser.id;
    const id = doc(collection(db, "users", uid, "queries")).id;
    const prev = previousQueryFor({ id: "__new__", agentId: a.agentId, manuscriptId: ms.id, status: QueryStatus.QUERIED, dateSent: "" }, forBook, a.sent);
    const plan = planOf(a, model.ctx, id, !!prev);
    if (!plan) return null;
    let snap;
    try {
      snap = await takeSnapshot(uid, [id]);
      await saveLog(scriptDb, plan);
    } catch (e) {
      console.error("[log a query] save failed", e);
      showToast({ message: "Couldn't log the query. Nothing was saved." });
      return null;
    }
    if (a.note) await addJournalEntry(id, a.note);
    const s0 = snap;
    return {
      id,
      undo: async () => {
        await restoreSnapshot(s0);
        /* the note is the one thing the snapshot does not hold: it lives in journalEntries, keyed by the query */
        for (const j of live.current.journalEntries.filter((x) => x.queryId === id)) await deleteJournalEntry(j.id);
      },
      openCard: () => onOpenCard(id),
    };
  };

  return (
    <QcLogStages nowMs={nowMs} agents={model.stAgents} seedAgentId={seedAgentId} bookTitle={ms.title || "Untitled manuscript"}
      packages={model.stPackages} activePackageId={model.active} letters={model.ctx.letters} synopses={model.ctx.synopses} bookVersions={model.ctx.bookVersions}
      count={forBook.length} quietWeeks={quietWeeksOf(currentUser)} ctx={model.ctx} onClose={onClose}
      onAddAgent={(name, done) => openNewAgentCard({ from: "button", host: "panel", ...(name ? { prefill: { name } } : {}), onCreated: done })}
      onSave={onSave} />
  );
};

