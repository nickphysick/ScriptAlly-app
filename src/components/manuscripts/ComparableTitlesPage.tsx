/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comparable titles v2 (27 Sep; ref design-refs/materials/comps-v2.html). Route /manuscripts/comps.
 *
 * The page renders its OWN group, like the Contact list's `.clv-group`: the full `PageHeader` is row 1
 * across both tracks, and beneath its rule sit the main column and (from Phase 4) the rail.
 * `WorkspacePageGrid` is given `masthead={null}` — the header is the page's first row, not the
 * grid's slab.
 *
 * ⚠️ PHASE 2 OF 6: the frame, the header and the query line. The library (and with it the header's
 * "+ Add a comp", which opens its form) lands in Phase 3 — a primary with nothing to open would be a
 * dead control, so the header carries none until then.
 *
 * ⚠️ STORE FACTS AND ONE INTENT. `inQuery` is the only stored intent; the line, the counts and the
 * composition are derived at render (lib/compsPage.ts).
 *
 * ⚠️ SCOPE IS THE BAR SWITCHER'S, READ EVERY RENDER — never latched in state. The switcher writes
 * `scriptally_active_manuscript_id` and re-opens the route.
 */
import React, { useState } from "react";
import { useScriptAllyDb } from "../../lib/db";
import { PageHeader } from "../shell/PageHeader";
import { WorkspacePageGrid } from "../shell/WorkspacePageGrid";
import { isShelvedPresentation } from "../../lib/manuscriptPage";
import { manuscriptComps } from "../../lib/comps";
import { QueryFormat, compCounts } from "../../lib/compsPage";
import { CompsQueryLine } from "./CompsQueryLine";
import "./compsV2.css";

/** Shared with the bar's switcher and the packages page — the section's one active-manuscript key. */
const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";

export const ComparableTitlesPage: React.FC<{
  onNavigate?: (tab: string, subPageName?: string, opts?: { manuscriptId?: string }) => void;
}> = () => {
  const { currentUser, manuscripts } = useScriptAllyDb();
  /* ⚠️ EVERY HOOK ABOVE THE FIRST EARLY RETURN — the old page declared a `useRef` below
     `if (!currentUser) return null`, a hook whose presence depended on a branch. */
  const [format, setFormat] = useState<QueryFormat>("readers");

  if (!currentUser) return null;

  const selectedMsId = typeof window === "undefined" ? null : localStorage.getItem(ACTIVE_MS_KEY);
  const ordered = [...manuscripts].sort((a, b) => Number(isShelvedPresentation(a)) - Number(isShelvedPresentation(b)));
  const activeMs = manuscripts.find((m) => m.id === selectedMsId) ?? ordered[0] ?? null;
  const comps = activeMs ? manuscriptComps(activeMs) : [];
  const isEmpty = !!activeMs && comps.length === 0;
  const counts = compCounts(comps);
  const description = !activeMs
    ? "Add a manuscript to build its comp list."
    : isEmpty
      ? <>Books, films and shows like <span className="ph-ms">{activeMs.title}</span>, with a line on why each compares. The ones you switch on build your query line.</>
      : <>Books, films and shows like <span className="ph-ms">{activeMs.title}</span>, and why. <strong>{counts.total}</strong> on your list, <strong>{counts.inQuery}</strong> named in your query letter.</>;

  return (
    <WorkspacePageGrid scrollLabel="Comparable titles" masthead={null}>
      <div className="cpv-page" data-cpv="page">
        <div className="cpv-group">
          <div className="cpv-head">
            <PageHeader variant="full" title="Comparable titles" description={description} />
          </div>
          <div className="cpv-main" data-cpv="main">
            {!activeMs ? (
              <p className="cpv-hint">No manuscript to compare yet.</p>
            ) : (
              <CompsQueryLine comps={comps} msTitle={activeMs.title} format={format} onFormat={setFormat} />
            )}
          </div>
        </div>
      </div>
    </WorkspacePageGrid>
  );
};
