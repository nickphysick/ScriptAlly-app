/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * App-level host for the Edit Query drawer — a sibling of EditAgentHost. The drawer is an OVERLAY:
 * opening it leaves the user exactly where they are (same page, same scroll). It's mounted once here,
 * driven by an `openEditQuery(queryId[, opts])` action exposed via context, so any surface — a query
 * row, the contextual query CTA, the agent drawer's query list, a to-do task — can open it without a
 * route or scroll change.
 *
 * The query is looked up live by id from the app-wide db context (so a save reseeds the drawer to the
 * recomputed values). `opts.fromTask` is reserved for the open-from-task in-focus journey (Prompt 5);
 * Phase 2 ignores it.
 */
import React, { createContext, useContext, useState } from "react";
import { useScriptAllyDb } from "../lib/db";
import { EditQueryDrawer } from "./EditQueryDrawer";

export type OpenEditQuery = (queryId: string, opts?: { fromTask?: boolean }) => void;
const OpenEditQueryContext = createContext<OpenEditQuery>(() => {});

/** Open the Edit Query drawer for a query id, from anywhere under <EditQueryHost>. */
export const useOpenEditQuery = () => useContext(OpenEditQueryContext);

export const EditQueryHost: React.FC<{
  children: React.ReactNode;
  onSavedToast?: (msg: string) => void;
}> = ({ children, onSavedToast }) => {
  const { queries } = useScriptAllyDb();
  const [open, setOpen] = useState<{ id: string; fromTask: boolean } | null>(null);
  // Looked up live by id, so a save reseeds the drawer to the recomputed values.
  const query = open ? queries.find((q) => q.id === open.id) ?? null : null;

  return (
    <OpenEditQueryContext.Provider value={(id, opts) => setOpen({ id, fromTask: !!opts?.fromTask })}>
      {children}
      {query && (
        <EditQueryDrawer
          query={query}
          isOpen
          lockScroll
          onClose={() => setOpen(null)}
          onSavedToast={onSavedToast}
        />
      )}
    </OpenEditQueryContext.Provider>
  );
};
