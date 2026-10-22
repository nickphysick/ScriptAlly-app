/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manuscripts v27 Part E — THE INTERIM VERSIONS PAGE (`/manuscripts/versions`). The versions UI that left the
 * Manuscripts page, UNCHANGED — the banner, the copy, the stacked deck and its list, New version and Edit version — under
 * the header-rules header ("— Versions —", the manuscript's title, "+ New version", "How version tracking works").
 * Its own redesign (versions-v1) is a later prompt.
 *
 * ⚠️ THE SAME SCOPED MANUSCRIPT AS THE MANUSCRIPTS PAGE: the shell's `scriptally_active_manuscript_id`, read on every
 *    arrival (`location.key`).
 */
import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useScriptAllyDb } from "../../../lib/db";
import type { BookVersion } from "../../../types";
import { currentBookVersion, scopedManuscript } from "../../../lib/manuscriptSummary";
import { versionTiles } from "../../../lib/manuscriptShelf";
import { bookVersionsOf } from "../../../lib/bookVersions";
import { versionCards, versionsLede } from "../../../lib/manuscriptV21";
import { articleHref } from "../../../lib/helpArticles";
import { WorkspacePageGrid } from "../../shell/WorkspacePageGrid";
import { MsBanner, VersionsSection } from "../v12/Msv21Parts";
import { Msv21Version } from "../v12/Msv21Dialogs";
import { V27Hero } from "./Msv27Parts";
import "../v12/msv12.css";
import "../v12/msv21.css";
import "./msv27.css";

const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";

export const VERSIONS_HOW_HREF = articleHref("save-a-version");

export const VersionsPage: React.FC<{ onNavigate: (tab: string, subPage?: string) => void }> = ({ onNavigate }) => {
  const { manuscripts, packages, queries, updateManuscript, collectionsReady } = useScriptAllyDb();
  const location = useLocation();
  const navigate = useNavigate();
  const stored = useMemo(() => {
    try { return localStorage.getItem(ACTIVE_MS_KEY); } catch { return null; }
  }, [location.key]);
  const ms = useMemo(() => scopedManuscript(manuscripts, stored), [manuscripts, stored]);
  const msQueries = useMemo(() => (ms ? queries.filter((q) => q.manuscriptId === ms.id) : []), [ms, queries]);
  const msPackages = useMemo(() => (ms ? packages.filter((p) => p.manuscriptId === ms.id && p.status !== "Retired") : []), [ms, packages]);
  const bookVersions = useMemo(() => bookVersionsOf(ms), [ms]);
  const current = useMemo(() => currentBookVersion(ms), [ms]);
  const cards = useMemo(
    () => versionCards(versionTiles(bookVersions, current?.id ?? null, msPackages, msQueries)),
    [bookVersions, current, msPackages, msQueries],
  );
  const lede = useMemo(() => versionsLede(cards, ms?.title ?? ""), [cards, ms]);
  const [dlg, setDlg] = useState<"new" | BookVersion | null>(null);

  return (
    <WorkspacePageGrid className="msv12-wpg" masthead={null} scrollLabel="Versions">
      <div className="msv12-own msv12-root ms21 ms27" data-ms27="versions-page" data-state={ms ? "filled" : collectionsReady ? "empty" : "loading"}>
        {!ms && !collectionsReady ? null : (
          <V27Hero
            className="ms27-mh--page" probe="versions-header"
            eyebrow="— Versions —" title={ms?.title ?? "Versions"} byline={null}
            acts={ms ? (
              <>
                <button type="button" className="ms27-p1" data-ms27="new-version" onClick={() => setDlg("new")}>+ New version</button>
                <button type="button" className="ms27-hw" data-ms27="how-versions" onClick={() => navigate(VERSIONS_HOW_HREF)}>How version tracking works</button>
              </>
            ) : (
              <button type="button" className="ms27-p1" data-ms27="add-first" onClick={() => onNavigate("manuscripts")}>Add your manuscript first</button>
            )}
          />
        )}
        {ms ? (
          <>
            <MsBanner>
              Prologue first? Fast-paced opening? Leading with a passage of world-building? Track <b>versions</b> of a manuscript to see what's landing best.
            </MsBanner>
            <VersionsSection
              title={ms.title} cards={cards} lede={lede}
              onNew={() => setDlg("new")} onOpen={(c) => setDlg(c.v)}
            />
            {dlg ? (
              <Msv21Version ms={ms} editing={dlg === "new" ? null : dlg} updateManuscript={updateManuscript} onClose={() => setDlg(null)} />
            ) : null}
          </>
        ) : null}
      </div>
    </WorkspacePageGrid>
  );
};
