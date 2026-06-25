/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * App-level host for the Edit Agent drawer (Prompt 6 #1). The drawer is an OVERLAY: opening it must
 * leave the user exactly where they are — same page, same scroll. So it's mounted once here, driven
 * by an `openEditAgent(agentId)` action exposed via context. Both call sites use it (the Agents
 * "Edit profile" button and the dashboard "Edit Agent" to-do) and NEITHER changes the route.
 *
 * The host fetches the agent by id from the app-wide db context, so opening doesn't depend on the
 * Agents page being mounted (it previously did — the drawer lived inside Agents and was reached via
 * an `edit-agent:<id>` deep-link that switched tabs and lost the dashboard scroll position).
 */
import React, { createContext, useContext, useState } from "react";
import { useScriptAllyDb } from "../lib/db";
import { EditAgentDrawer } from "./EditAgentDrawer";

const OpenEditAgentContext = createContext<(agentId: string) => void>(() => {});

/** Open the Edit Agent drawer for an agent id, from anywhere under <EditAgentHost>. */
export const useOpenEditAgent = () => useContext(OpenEditAgentContext);

export const EditAgentHost: React.FC<{
  children: React.ReactNode;
  /** A query row in the drawer links out to the queries view. */
  onOpenQuery: (queryId: string) => void;
  onSavedToast: (msg: string) => void;
}> = ({ children, onOpenQuery, onSavedToast }) => {
  const { agents } = useScriptAllyDb();
  const [openId, setOpenId] = useState<string | null>(null);
  // Looked up live by id, so a save reseeds the drawer to the saved values.
  const agent = openId ? agents.find((a) => a.id === openId) ?? null : null;

  return (
    <OpenEditAgentContext.Provider value={setOpenId}>
      {children}
      {agent && (
        <EditAgentDrawer
          agent={agent}
          isOpen
          lockScroll
          onClose={() => setOpenId(null)}
          onOpenQuery={(qid) => { setOpenId(null); onOpenQuery(qid); }}
          onSavedToast={onSavedToast}
        />
      )}
    </OpenEditAgentContext.Provider>
  );
};
