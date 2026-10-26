/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v25.1 C4 — the log flow on the Contact list: the Query Centre's own `QcLogFlow149` (its header, steps,
 * fields and buttons unchanged), hosted in the Contact list's panel, and saved through the SAME functions the Query
 * Centre's host calls (`saveLog`, `logDefaults`, `pieceVersions`, `packagesFor`, `previousQueryFor`, the snapshot and
 * the undo bar). Saving closes the panel and leaves the writer on the Contact list, where the row updates from the
 * listener.
 *
 * ⚠️ THE BOOK is the one the request named, else the active manuscript, else the first that can be queried — the
 *    Query Centre host's own resolution (`resolveInitialManuscriptId` over `pickableManuscripts`).
 * ⚠️ This mirrors the Query Centre host's onSaveLog (Queries.tsx) rather than sharing it: the pack confines Query
 *    Centre changes to the parts it names. A follow-up can lift both into one hook.
 */
import React from "react";
import { collection, doc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { useScriptAllyDb } from "../../../lib/db";
import { ComponentType, QueryStatus, type SubmissionMethod } from "../../../types";
import { QcLogFlow149, type FlowAgent, type LogAnswers } from "../../queries/centre/QcFlows149";
import { fieldDay } from "../../queries/centre/QcQueryCard149";
import { packagesFor, currentVersion } from "../../../lib/queryActions/packages";
import { logDefaults, pieceVersions, saveLog } from "../../../lib/queryActions/logSave";
import { blankSample } from "../../../lib/queryActions/sample";
import { restoreSnapshot, takeSnapshot } from "../../../lib/queryActions/snapshot";
import { showUndoBar } from "../../../lib/queryActions/drawerStore";
import { previousQueryFor } from "../../../lib/requery";
import { resolveInitialManuscriptId } from "../../../lib/logQuerySeed";
import { pickableManuscripts } from "../../../lib/lifecycle";
import { isLive as qaIsLive } from "../../queryActions/journeys/common";
import { agentAgencyLine, agentInitials, agentPrimary } from "../../../lib/agentDisplay";
import { useToast } from "../../toast/ToastProvider";
import type { ContactLogSeed } from "../../../lib/contactLogStore";

export const ContactLogFlow: React.FC<{ seed: ContactLogSeed; activeMsId: string | null; onClose: () => void }> = ({ seed, activeMsId, onClose }) => {
  const scriptDb = useScriptAllyDb();
  const { currentUser, agents, queries, manuscripts, packages, addJournalEntry } = scriptDb;
  const { showToast } = useToast();
  if (!currentUser) return null;
  const msId = resolveInitialManuscriptId(seed.manuscriptId ?? activeMsId ?? (manuscripts.length === 1 ? manuscripts[0].id : undefined), pickableManuscripts(manuscripts));
  const ms = manuscripts.find((m) => m.id === msId) ?? null;
  if (!ms) return null;
  const now = Date.now();
  const cards = packagesFor(ms.id, packages, scriptDb.versions, ms.bookVersions);
  const forBook = queries.filter((q) => q.manuscriptId === ms.id);
  const flowAgents: FlowAgent[] = agents.map((a) => ({
    id: a.id, name: agentPrimary(a), agency: agentAgencyLine(a), initials: agentInitials(a), querying: forBook.some((q) => q.agentId === a.id && qaIsLive(q)),
    via: (a.submissionMethod as SubmissionMethod) || null,
  }));
  const onSave = async (x: LogAnswers): Promise<boolean> => {
    const ag = agents.find((a) => a.id === x.agentId);
    if (!ag) return false;
    const uid = currentUser.id;
    const sent = new Date(x.sent);
    const pkCard = x.packageId ? cards.find((c) => c.id === x.packageId) ?? null : null;
    const mat = { ql: x.ql, syn: x.syn, s: x.sample ? blankSample() : { ...blankSample(), unit: "none" as const } };
    const qlV = currentVersion(ms.id, scriptDb.versions, ComponentType.QUERY_LETTER);
    const synV = currentVersion(ms.id, scriptDb.versions, ComponentType.SYNOPSIS);
    const id = doc(collection(db, "users", uid, "queries")).id;
    const prev = previousQueryFor({ id: "__new__", agentId: ag.id, manuscriptId: ms.id, status: QueryStatus.QUERIED, dateSent: "" }, forBook, sent.getTime());
    let snap;
    try {
      snap = await takeSnapshot(uid, [id]);
      await saveLog(scriptDb, { id, manuscriptId: ms.id, agent: ag, sent, via: x.via, pkCard, mat, pieceV: pieceVersions(pkCard, mat, qlV, synV), basedOn: null, ...logDefaults(ag, sent), requery: !!prev });
    } catch (e) {
      console.error("[contact list] log save failed", e);
      showToast({ message: "Couldn't log the query. Nothing was saved." });
      return false;
    }
    if (x.note) await addJournalEntry(id, x.note);
    const s0 = snap;
    const nm = (ag.name || ag.agency || "The agent").trim();
    onClose();
    showUndoBar({ message: `Logged. ${nm} is now in your Query Centre.`, sub: `SENT ${fieldDay(x.sent).toUpperCase()}`, undo: async () => { await restoreSnapshot(s0); } });
    return true;
  };
  return (
    <QcLogFlow149 nowMs={now} agents={flowAgents} seedAgentId={seed.agentId} bookTitle={ms.title || "Untitled manuscript"}
      packages={cards.map((c) => ({ id: c.id, name: c.name, ql: c.ql, syn: c.syn, sample: !!c.bookVersion }))}
      defaultPackageId={ms.activePackageId && cards.some((c) => c.id === ms.activePackageId) ? ms.activePackageId : null}
      onClose={onClose} onSave={onSave} />
  );
};
