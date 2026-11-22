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
import { cardWeeks, cardWeeksToSave, firstName, planOf, stageAgents, type BookChoice, type Choice, type LogAnswers, type PlanContext, type StagePackage } from "../../../lib/queryActions/logStages";
import { bookVersionsOf, latestVersion, readVersions } from "../../../lib/bookVersions";
import { bookOf } from "../../../lib/queryActions/sample";
import { previousQueryFor } from "../../../lib/requery";
import { quietWeeksOf } from "../../../lib/queryState";
import { openNewAgentCard } from "../../../lib/agentCardStore";
import { isLive as qaIsLive } from "../../queryActions/journeys/common";
import { useToast } from "../../toast/ToastProvider";
import { QcLogStages, type Logged } from "./QcLogStages";
import type { LogAgain } from "../../../lib/queryActions/drawerStore";
import { useAgentSave } from "../../agents/card/useAgentSave";
import { draftOf } from "../../../lib/cardDraft";
import { agentPrimary } from "../../../lib/agentDisplay";

const isLiveVersion = (v: { status?: string; retiredAt?: unknown }) => (v.status ?? "Active") !== "Retired" && !v.retiredAt;

export const LogStagesHost: React.FC<{
  ms: Manuscript;
  seedAgentId: string | null;
  onClose: () => void;
  /** "Open {First}'s card": the site's own open-query door */
  onOpenCard: (queryId: string) => void;
  /** v1.2 — the package a door named (a package's builder), preselected on Materials */
  seedPackageId?: string | null;
  /** v1.2 — the old drawer's "Log another": the date and materials carry over */
  again?: LogAgain | null;
  /** v1.2 — set to the journey's leave check, for the host's dimmed page */
  leaveRef?: React.MutableRefObject<(() => void) | null>;
  /** v1.2 — told after a save, with the new query's id and its undo (a door's `onSaved`) */
  onLogged?: (queryId: string, undo: () => Promise<void>) => void;
}> = ({ ms, seedAgentId, onClose, onOpenCard, seedPackageId, again, leaveRef, onLogged }) => {
  const scriptDb = useScriptAllyDb();
  const { currentUser, agents, queries, packages, versions, addJournalEntry, deleteJournalEntry } = scriptDb;
  const { showToast } = useToast();
  /* Undo runs later than the save: it reads the journal as it is then, not as it was when the save began */
  const live = useRef(scriptDb);
  live.current = scriptDb;
  const nowMs = useMemo(() => Date.now(), []);
  /* v1.3 — "Save {n} weeks to {First}'s card" goes through the card's own save, quietly (no notice, no consequences
     offer: the toast and the celebration are this journey's) */
  const { saveDraft } = useAgentSave({ editCtx: { queries, agents, msGenre: ms.genre ?? null, msTitle: ms.title ?? null, nowMs } });
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
    const nums = new Map(readVersions(ms).map((v) => [v.id, v.original ? "Original" : `V${v.num}`]));
    const bookVersions: BookChoice[] = [...bvs].sort((a, b) => b.createdDate.localeCompare(a.createdDate)).map((b) => ({ id: b.id, name: b.name, current: b.id === cur, short: nums.get(b.id) }));
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
    /* v1.3 — the card's response time, only when ticked and only now the query is logged (Cancel saves nothing). A card
       save that fails leaves the query logged with its own reply date, and says so. */
    let undoCard: (() => Promise<boolean>) | undefined;
    const wk = a.reply ? cardWeeksToSave(a.reply, cardWeeks(plan.agent)) : null;
    if (wk != null) {
      const base = draftOf(plan.agent);
      const r = await saveDraft(plan.agent, base, { ...base, weeks: wk }, { emit: false });
      if ("error" in r) showToast({ message: `Logged, but ${firstName(agentPrimary(plan.agent))}'s card wasn't updated.` });
      else undoCard = r.undo;
    }
    const s0 = snap;
    /* the card first: its snapshot holds the new query, so the log's own undo must run after it */
    const undo = async () => {
      if (undoCard) await undoCard();
      await restoreSnapshot(s0);
      for (const j of live.current.journalEntries.filter((x) => x.queryId === id)) await deleteJournalEntry(j.id);
    };
    onLogged?.(id, undo);
    /* the note is the one thing the snapshot does not hold: it lives in journalEntries, keyed by the query */
    return { id, undo, openCard: () => onOpenCard(id) };
  };

  return (
    <QcLogStages nowMs={nowMs} agents={model.stAgents} seedAgentId={seedAgentId} bookTitle={ms.title || "Untitled manuscript"}
      packages={model.stPackages} activePackageId={model.active} letters={model.ctx.letters} synopses={model.ctx.synopses} bookVersions={model.ctx.bookVersions}
      count={forBook.length} quietWeeks={quietWeeksOf(currentUser)} ctx={model.ctx} book={bookOf(ms.wordCount)} onClose={onClose}
      onAddAgent={(name, done) => openNewAgentCard({ from: "button", host: "panel", ...(name ? { prefill: { name } } : {}), onCreated: done })}
      onSave={onSave} seedPackageId={seedPackageId} again={again} leaveRef={leaveRef} />
  );
};

