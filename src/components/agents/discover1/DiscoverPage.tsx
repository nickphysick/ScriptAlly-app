/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Discover v1 — the Scout's page (`/agents/discover`). Ref: design-refs/discover-v1/discover-v1.html.
 *
 * Two faces, one route:
 *   · COMING SOON while `DISCOVER_LIVE` is false (prod): the navy panel, how it works, the catalogue so far.
 *   · LIVE: the light header, the share notice, the Scout's picks (live / done / none), the community catalogue.
 *
 * ⚠️ THE LIVE FACE NEVER MOUNTS WHILE THE FLAG IS OFF — except through the dev review aid, which is gated HERE on
 *    `import.meta.env.MODE !== "production"`, so a production build folds the branch away and the aid's module is
 *    absent from the bundle (lock E1 greps `dist/`).
 * ⚠️ PRO: the pill only. There is no Pro gate on this route today and none is invented here (the report says so).
 */
import React, { useMemo, useState } from "react";
import { useScriptAllyDb } from "../../../lib/db";
import { DISCOVER_LIVE } from "../../../lib/discoverShared";
import { notifyPrefs } from "../../../lib/accountPrefs";
import { memoryIO, reviewFixture, reviewHoldMs, reviewLive, reviewState, type ReviewState } from "../../../lib/discoverReviewAid";
import { resolveScopedManuscript } from "../../../lib/shellSidebar";
import { WorkspacePageGrid } from "../../shell/WorkspacePageGrid";
import { AppFooter } from "../../shell/AppFooter";
import { DvEmptyHeader, DvHeader, type HeaderTitle } from "./DvHeader";
import { useScout, type Fixture } from "./useScout";
import "./discover1.css";

type Nav = (tab: string, sub?: string, opts?: { agentId?: string; manuscriptId?: string }) => void;

/** What the page should be: the prod gate, unless a dev build's review aid says otherwise. */
function useFace(): { face: "soon" | "live"; fixtureState: ReviewState | null } {
  /* ⚠️ THE MODE CHECK IS AT THE CALL SITE so the bundler can drop the aid (see the file header) */
  const aidState = import.meta.env.MODE !== "production" ? reviewState() : null;
  const aidLive = import.meta.env.MODE !== "production" ? reviewLive() : false;
  if (aidState === "empty") return { face: "soon", fixtureState: null };
  if (aidState) return { face: "live", fixtureState: aidState };
  if (aidLive) return { face: "live", fixtureState: null };
  return { face: DISCOVER_LIVE ? "live" : "soon", fixtureState: null };
}

export const DiscoverPage: React.FC<{ onNavigate?: Nav }> = ({ onNavigate }) => {
  const { face, fixtureState } = useFace();
  const nav: Nav = onNavigate ?? (() => {});
  return (
    <WorkspacePageGrid className="dv1-wpg" scrollLabel="Discover" masthead={null}>
      <div className="dv1-page" data-dv1="page" data-face={face}>
        {face === "soon" ? <ComingSoon onNavigate={nav} /> : <LivePage fixtureState={fixtureState} onNavigate={nav} />}
        <AppFooter onNavigate={nav} />
      </div>
    </WorkspacePageGrid>
  );
};

/* ── COMING SOON ─────────────────────────────────────────────────────────── */

const ComingSoon: React.FC<{ onNavigate: Nav }> = () => {
  const db = useScriptAllyDb();
  const msTitle = useScoutBook();
  const notified = notifyPrefs(db.currentUser?.notifyPrefs).discover;
  /* ⚠️ ONE LEAF, `notifyPrefs.discover` — the whole map would drop Settings' other two keys */
  const toggle = () => { void db.updateUserPaths({ "notifyPrefs.discover": !notified }); };
  return <DvEmptyHeader msTitle={msTitle} notified={notified} onNotify={toggle} onHow={() => {}} />;
};

/** The sidebar's book title, for the coming-soon paragraph (the live page reads it through useScout). */
function useScoutBook(): string | null {
  const { manuscripts } = useScriptAllyDb();
  return useMemo(() => {
    let id: string | null = null;
    try { id = window.localStorage.getItem("scriptally_active_manuscript_id"); } catch { id = null; }
    return resolveScopedManuscript(manuscripts, id)?.title ?? null;
  }, [manuscripts]);
}

/* ── LIVE ────────────────────────────────────────────────────────────────── */

const LivePage: React.FC<{ fixtureState: ReviewState | null; onNavigate: Nav }> = ({ fixtureState }) => {
  /* the fixture and its in-memory store are made once per visit */
  const [aid] = useState(() => {
    /* ⚠️ THE MODE CHECK FIRST, so a production build folds the aid away */
    if (import.meta.env.MODE === "production") return { fixture: null as Fixture | null, memory: null, holdMs: 0 };
    const holdMs = reviewHoldMs();
    if (!fixtureState) return { fixture: null as Fixture | null, memory: null, holdMs };
    const fixture = reviewFixture(fixtureState);
    return { fixture, memory: memoryIO(fixture.decisions), holdMs };
  });
  const s = useScout(aid);
  const title: HeaderTitle = s.loading ? { kind: "loading" }
    : s.view === "live" ? { kind: "count", n: s.queue.length } : s.view === "done" ? { kind: "done" } : { kind: "none" };
  return (
    <DvHeader title={title} msTitle={s.manuscript?.title ?? null} tally={s.loading ? null : s.tally}
      onTune={() => {}} onShare={() => {}} onHow={() => {}} onPassed={() => {}} />
  );
};
