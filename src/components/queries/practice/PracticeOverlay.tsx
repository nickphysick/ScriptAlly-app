/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v139 §B — THE ACTION DRAWER'S VIEW OF THE PRACTICE QUERY. While Pip exists, the drawer (and only the
 * drawer: App wraps nothing else in this) reads a copy of the database context with Pip and his agent at the head of
 * its lists, so the real response journey can open on him.
 *
 * ⚠️ EVERY WRITER IN THE COPY REFUSES PIP. A call naming his id (or his agent's) does nothing and says so on the
 *    console. The response journey's own write is swapped for `practiceRespond` before it gets here; this is the belt
 *    to that brace — any other path that reached a writer with Pip would otherwise write a document under his id.
 */
import React, { useContext, useMemo } from "react";
import { DbContext } from "../../../lib/db";
import { PIP_AGENT_ID, PIP_ID, usePractice } from "../../../lib/practiceQuery";

const namesPip = (args: unknown[]): boolean => args.some((a) => a === PIP_ID || a === PIP_AGENT_ID
  || (!!a && typeof a === "object" && ((a as { id?: unknown }).id === PIP_ID || (a as { queryId?: unknown }).queryId === PIP_ID)));

export function PracticeOverlay({ children }: { children: React.ReactNode }) {
  const db = useContext(DbContext);
  const p = usePractice();
  const value = useMemo(() => {
    if (!db || !p) return db;
    const out: Record<string, unknown> = { ...db, queries: [p.query, ...db.queries], agents: [p.agent, ...db.agents] };
    for (const [k, v] of Object.entries(db)) {
      if (typeof v !== "function") continue;
      const fn = v as (...a: unknown[]) => unknown;
      out[k] = (...args: unknown[]) => {
        if (namesPip(args)) { console.warn(`[practice] ${k} refused for the practice query`); return Promise.resolve(k.startsWith("read") ? [] : undefined); }
        return fn(...args);
      };
    }
    return out as unknown as typeof db;
  }, [db, p]);
  return <DbContext.Provider value={value}>{children}</DbContext.Provider>;
}
