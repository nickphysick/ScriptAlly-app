/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v25.1 C4 — the log flow on the Contact list, hosted in the Contact list's panel.
 *
 * Log a query v1 — it is the staged journey's one host (`LogStagesHost`), the same component the Query Centre mounts,
 * so the two can no longer drift: they share the stages, the save and the celebration. "Open {First}'s card" closes
 * the panel and opens the query in the query panel, over the Contact list.
 *
 * ⚠️ THE BOOK is the one the request named, else the active manuscript, else the first that can be queried — the
 *    Query Centre host's own resolution (`resolveInitialManuscriptId` over `pickableManuscripts`).
 */
import React from "react";
import { useScriptAllyDb } from "../../../lib/db";
import { resolveInitialManuscriptId } from "../../../lib/logQuerySeed";
import { pickableManuscripts } from "../../../lib/lifecycle";
import { openQueryPanel } from "../../../lib/queryPanelStore";
import type { ContactLogSeed } from "../../../lib/contactLogStore";
import { LogStagesHost } from "../../queries/centre/LogStagesHost";

export const ContactLogFlow: React.FC<{ seed: ContactLogSeed; activeMsId: string | null; onClose: () => void }> = ({ seed, activeMsId, onClose }) => {
  const { currentUser, manuscripts } = useScriptAllyDb();
  if (!currentUser) return null;
  const msId = resolveInitialManuscriptId(seed.manuscriptId ?? activeMsId ?? (manuscripts.length === 1 ? manuscripts[0].id : undefined), pickableManuscripts(manuscripts));
  const ms = manuscripts.find((m) => m.id === msId) ?? null;
  if (!ms) return null;
  return (
    <LogStagesHost key={`${ms.id}:${seed.agentId ?? ""}`} ms={ms} seedAgentId={seed.agentId} onClose={onClose}
      onOpenCard={(id) => { onClose(); openQueryPanel(id, "other"); }} />
  );
};
