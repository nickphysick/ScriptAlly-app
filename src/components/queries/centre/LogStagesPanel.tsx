/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Log a query v1.2 — ONE JOURNEY EVERYWHERE (desktop). Every door that asks the query drawer for `mode: "log"` on a
 * desktop is handed here by `QueryDrawer`, and gets the staged journey (`LogStagesHost`) in the side panel, over a
 * dimmed page, on whatever page the door was pressed. The phone keeps the drawer's own journey (LogJourney) for now.
 *
 * The door's seeds are kept: the agent and the book, a package to preselect (a package's builder), the old receipt's
 * "Log another" (date and materials carry over), and a card's dock hooks (the agent card steps aside while the journey
 * is open, and pulses on its return after a save).
 *
 * ⚠️ THE BOOK is the door's, else the named package's, else "Log another"'s, else the sidebar's active manuscript, else
 *    the only one — then `resolveInitialManuscriptId` over the books that can be queried, the other two hosts' own rule.
 * ⚠️ NO RIGHT-PANEL CLAIM: the journey opens over an agent's or a query's panel (the agent card docks under it), so it
 *    must not close them. The dim covers them, and the panel sits above (z 68, qcLogStages.css).
 * ⚠️ ESCAPE closes, as before; a press on the dimmed page runs the journey's leave check (ask with answers).
 */
import React, { useRef } from "react";
import { useScriptAllyDb } from "../../../lib/db";
import { resolveInitialManuscriptId } from "../../../lib/logQuerySeed";
import { pickableManuscripts } from "../../../lib/lifecycle";
import { openQueryPanel } from "../../../lib/queryPanelStore";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import type { OpenRequest } from "../../../lib/queryActions/drawerStore";
import { SidePanel } from "../../shell/SidePanel";
import { LogStagesHost } from "./LogStagesHost";

const readActiveManuscript = (): string | null => {
  try { return localStorage.getItem("scriptally_active_manuscript_id"); } catch { return null; }
};

export const LogStagesPanel: React.FC<{ req: OpenRequest; onClose: () => void }> = ({ req, onClose }) => {
  const { currentUser, manuscripts, packages } = useScriptAllyDb();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const leaveRef = useRef<(() => void) | null>(null);
  useEscapeLayer(true, () => closeRef.current(), ESC_LEVEL.drawer);
  /* a card a door docked (`req.dock` / `onDock`) is stepped aside and brought back by QueryDrawer's own effects, which run
     before it hands the request here */

  if (!currentUser) return null;
  const pkgMs = req.packageId ? packages?.find((x) => x.id === req.packageId)?.manuscriptId : undefined;
  const want = req.manuscriptId ?? pkgMs ?? req.again?.manuscriptId ?? readActiveManuscript() ?? (manuscripts.length === 1 ? manuscripts[0].id : undefined);
  const msId = resolveInitialManuscriptId(want ?? undefined, pickableManuscripts(manuscripts));
  const ms = manuscripts.find((m) => m.id === msId) ?? null;
  if (!ms) return null;
  return (
    <SidePanel label="Log a query" dim className="qsp" attrs={{ "data-laq": "panel" }} onScrim={() => (leaveRef.current ? leaveRef.current() : closeRef.current())}>
      <LogStagesHost key={`${ms.id}:${req.agentId ?? ""}:${req.instance ?? 0}`} ms={ms} seedAgentId={req.agentId ?? null}
        seedPackageId={req.packageId ?? null} again={req.again ?? null} leaveRef={leaveRef} onClose={() => closeRef.current()}
        onLogged={(queryId, undo) => req.onSaved?.({ mode: "log", queryId, message: "Query logged", sub: "", undo })}
        onOpenCard={(id) => { closeRef.current(); openQueryPanel(id, "other"); }} />
    </SidePanel>
  );
};
