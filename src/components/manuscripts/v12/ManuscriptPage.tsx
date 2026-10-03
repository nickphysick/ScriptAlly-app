/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE MANUSCRIPTS PAGE (v13, the dashboard shelf) — one book, everything that goes out with it ══
 *
 * Design authority: design-refs/manuscripts/manuscripts-v13.html, rendered at its own default state
 * (Shelf · ink bands). Locks: tests/e2e/manuscriptsV13.measure.ts (M1–M8) + the msv12 unit locks.
 *
 * ⚠️ ONE COLUMN (F1). Under the hero's rule: the owed requests, the shelf (Comps · Materials ·
 * Packages), the Versions tiles and Recent activity, each a white card under the anthracite band.
 * The v12 rail and its four list sections are gone; the empty state is v12's, unchanged (F8).
 *
 * ⚠️ THE HERO IS v12's DESK HERO (F5): art · title block · cover. Two things moved — the facts read
 * as one row (Status · Current version · Setting · Series) and Edit details sits under them.
 *
 * ⚠️ SINGLE-MANUSCRIPT BY DESIGN (D1). The page shows the SCOPED manuscript — the shell's own
 * `scriptally_active_manuscript_id` selection resolved through `scopedManuscript` — read on every
 * arrival (`location.key`), because the bar's switcher writes the key and re-opens the route; a
 * mount-once read kept the first book on screen after a switch. The "More manuscripts: coming soon"
 * tag renders ONLY while the account holds at most one, because copy asserts what the code does today.
 *
 * ⚠️ NOTHING HERE CHANGES A QUERY INLINE (L4/D13). An owed row's button opens the query drawer's
 * "I've sent it" journey for that query, and only the drawer writes.
 *
 * ⚠️ EVERY STATUS GLYPH IS `StatusDot` (L5). The mock's `.dot` rings are stand-ins and none is
 * ported.
 */
import React, { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useScriptAllyDb } from "../../../lib/db";
import { packagesUnlocked } from "../../../lib/entitlements";
import { ComponentType, ManuscriptStatus, QueryStatus } from "../../../types";
import type { BookVersion, Query } from "../../../types";
import {
  bylineFor, compLetterTally, currentBookVersion, letterInUse, materialsOf, otherMaterialTiles,
  owedRequests, queryingSince, scopedManuscript,
} from "../../../lib/manuscriptSummary";
import {
  compRows, manuscriptActivity, materialChips, materialsFact, packageRows, packagesFact, versionTiles,
} from "../../../lib/manuscriptShelf";
import { bookVersionsOf, bookVersionById } from "../../../lib/bookVersions";
import { StatusDot } from "../../StatusDot";
import { WorkspacePageGrid } from "../../shell/WorkspacePageGrid";
import { OwedList, fmtDay } from "./Msv12Sections";
import { RecentActivity, ShelfComps, ShelfMaterials, ShelfPackages, VersionTiles } from "./Msv13Shelf";
import { Msv12EditDetails, Msv12NewVersion } from "./Msv12EditDetails";
import { Msv12Empty } from "./Msv12Empty";
import heroArt from "../../../assets/manuscripts/hero-archivist.png";
import "./msv12.css";
import { openQueryDrawer } from "../../../lib/queryActions/drawerStore";

/** The shell's shared scope key — the sidebar switcher writes it; this page only reads. */
const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";

/** The status fact's words — the enum, in the page's sentence case. */
const STATUS_WORDS: Record<ManuscriptStatus, string> = {
  [ManuscriptStatus.DRAFTING]: "Drafting",
  [ManuscriptStatus.REVISING]: "Revising",
  [ManuscriptStatus.READY_TO_QUERY]: "Ready to query",
  [ManuscriptStatus.QUERYING]: "Querying",
  [ManuscriptStatus.SHELVED]: "Shelved",
  [ManuscriptStatus.ON_SUBMISSION]: "On submission",
};

export interface ManuscriptPageProps {
  onNavigate: (tab: string, subPage?: string) => void;
  active?: boolean;
  openId?: string | null;
}

export const ManuscriptPage: React.FC<ManuscriptPageProps> = ({ onNavigate, openId = null }) => {
  const {
    currentUser, manuscripts, versions, packages, agents, queries, activities,
    updateManuscript, updateUserProfile,
  } = useScriptAllyDb();
  const location = useLocation();

  /* ⚠️ KEYED ON location.key: the bar's switcher writes the key and re-opens the route */
  const stored = useMemo(() => {
    try { return localStorage.getItem(ACTIVE_MS_KEY); } catch { return null; }
  }, [location.key]);
  const ms = useMemo(
    () => scopedManuscript(manuscripts, openId ?? stored),
    [manuscripts, openId, stored],
  );

  /* everything below is scoped to the one manuscript the page shows */
  const msQueries = useMemo(() => (ms ? queries.filter((q) => q.manuscriptId === ms.id) : []), [ms, queries]);
  const msPackages = useMemo(() => (ms ? packages.filter((p) => p.manuscriptId === ms.id && p.status !== "Retired") : []), [ms, packages]);
  const bookVersions = useMemo(() => bookVersionsOf(ms), [ms]);
  const current = useMemo(() => currentBookVersion(ms), [ms]);
  const letters = useMemo(() => (ms ? materialsOf(ms.id, ComponentType.QUERY_LETTER, versions) : []), [ms, versions]);
  const synopses = useMemo(() => (ms ? materialsOf(ms.id, ComponentType.SYNOPSIS, versions) : []), [ms, versions]);
  const inUseLetter = useMemo(() => letterInUse(msPackages, msQueries), [msPackages, msQueries]);
  const owed = useMemo(() => owedRequests(msQueries), [msQueries]);
  const since = useMemo(() => queryingSince(msQueries), [msQueries]);
  /* founding-member access — the packages lock reads the entitlement, not the plan (packages v2 D7) */
  const pro = packagesUnlocked(currentUser);

  /* ══ the shelf, the tiles, the activity — derived, lib/manuscriptShelf ═════════════════════ */

  const comps = useMemo(() => ms?.comps ?? [], [ms]);
  const tally = useMemo(() => compLetterTally(comps), [comps]);
  const rowsOfComps = useMemo(() => compRows(comps), [comps]);
  const letterName = useMemo(() => letters.find((l) => l.id === inUseLetter)?.versionName ?? null, [letters, inUseLetter]);
  const chips = useMemo(() => materialChips(letters, synopses, inUseLetter, msPackages), [letters, synopses, inUseLetter, msPackages]);
  const others = useMemo(() => otherMaterialTiles(msPackages, msQueries), [msPackages, msQueries]);
  const pkgRows = useMemo(() => packageRows(msPackages, msQueries, ms?.activePackageId || null), [msPackages, msQueries, ms]);
  const pkgFact = useMemo(() => packagesFact(msPackages, msQueries), [msPackages, msQueries]);
  const tiles = useMemo(
    () => versionTiles(bookVersions, current?.id ?? null, msPackages, msQueries),
    [bookVersions, current, msPackages, msQueries],
  );
  const activity = useMemo(
    () => (ms ? manuscriptActivity({ ms, activities, queries, agents, packages, bookVersions, now: new Date() }) : { rows: [], total: 0 }),
    [ms, activities, queries, agents, packages, bookVersions],
  );

  const agentName = (id: string) => agents.find((a) => a.id === id)?.name ?? "The agent";

  /**
   * "pins {version}" — only where the record genuinely carries one. A REQUEST records no version
   * (the ask is the agent's); the nearest true fact is the version the query's package states,
   * which is what a send from it would carry. Absent, the clause is omitted (run report).
   */
  const versionPin = (q: Query): string | null => {
    const p = msPackages.find((x) => x.id === q.packageId);
    return p?.bookVersionId ? bookVersionById(bookVersions, p.bookVersionId)?.name ?? null : null;
  };

  /* ══ the owed rows' door — the query drawer's "I've sent it" journey ══════════════════════ */

  /* Query actions v1 (K1) — "I've sent it" finishes in the query drawer. */
  const openSend = (row: { query: Query; kind: "partial" | "full" }) => {
    openQueryDrawer({ mode: "sent", queryId: row.query.id });
  };

  /* ══ the page's own dialogs ═════════════════════════════════════════════════════════════════ */

  const [editOpen, setEditOpen] = useState(false);
  /** `null` closed · `"new"` a new version · a version to rename (no per-version panel exists) */
  const [versionDlg, setVersionDlg] = useState<"new" | BookVersion | null>(null);

  /* ══ render ═════════════════════════════════════════════════════════════════════════════════ */

  const grid = (children: React.ReactNode) => (
    <WorkspacePageGrid className="msv12-wpg" masthead={null} scrollLabel="Manuscripts">
      <div className="msv12-own msv12-root" data-msv12="page">{children}</div>
    </WorkspacePageGrid>
  );

  if (!ms) {
    return grid(
      <Msv12Empty
        heroArt={heroArt}
        onCreate={() => onNavigate("manuscripts", "Add a manuscript")}
      />,
    );
  }

  const showSoonTag = manuscripts.length <= 1;
  const shelved = ms.status === ManuscriptStatus.SHELVED || ms.shelved === true;
  const querying = !shelved && ms.status === ManuscriptStatus.QUERYING;
  /* "Querying since" is the first send, a fact the queries carry; every other status dates from
     the moment it was set */
  const statusSince = querying ? (since ?? ms.statusChangedDate ?? null) : (ms.statusChangedDate ?? null);
  const statusWords = shelved ? STATUS_WORDS[ManuscriptStatus.SHELVED] : (STATUS_WORDS[ms.status] ?? ms.status);
  const toPackages = () => onNavigate("manuscripts", "Submission packages");

  return grid(
    <>
      <div className="msv13-pg" data-msv13="pg">
        {/* ── the hero ─────────────────────────────────────────────────────────────────────── */}
        <section className="msv12-hero msv13-hero" data-msv12="hero">
          <div className="msv12-heroart" data-msv12="hero-art">
            <img
              className="msv12-heroimg" data-msv12="hero-img" src={heroArt}
              alt="The Archivist writing in an open manuscript with a quill"
            />
          </div>
          <div data-msv12="hero-text">
            <div className="msv12-kick">
              <span className="msv12-lbl">Your manuscript</span>
              {showSoonTag ? <span className="msv12-soon">More manuscripts: coming soon</span> : null}
            </div>
            <h1 className="msv12-title">{ms.title}</h1>
            <div className="msv12-by" data-msv12="byline">{bylineFor(ms, currentUser?.name)}</div>
            {ms.logline ? <p className="msv12-log" data-msv12="logline">{ms.logline}</p> : null}
            <dl className="msv12-facts" data-msv12="facts">
              <div data-msv12="fact-status">
                <dt>Status</dt>
                <dd>
                  {querying ? (
                    <span className="msv12-sd" data-msv12-sd="">
                      <StatusDot status={QueryStatus.QUERIED} overrideSize={12} decorative />
                    </span>
                  ) : null}
                  {statusSince ? `${statusWords} since ${fmtDay(statusSince)}` : statusWords}
                </dd>
              </div>
              <div data-msv12="fact-current">
                <dt>Current version</dt>
                {current ? (
                  <dd className="msv12-rust">{current.name}</dd>
                ) : (
                  <dd className="msv12-miss">
                    Not recorded <button type="button" className="msv12-mini" onClick={() => setVersionDlg("new")}>Add</button>
                  </dd>
                )}
              </div>
              <div data-msv12="fact-setting">
                <dt>Setting</dt>
                {ms.setting ? (
                  <dd>{ms.setting}</dd>
                ) : (
                  <dd className="msv12-miss">
                    Not recorded <button type="button" className="msv12-mini" onClick={() => setEditOpen(true)}>Add</button>
                  </dd>
                )}
              </div>
              <div data-msv12="fact-series">
                <dt>Series</dt>
                {ms.series ? <dd>{ms.series}</dd> : <dd className="msv12-miss">Standalone</dd>}
              </div>
            </dl>
            <button
              type="button" className="msv12-btn msv12-btn--line msv13-edit" data-msv12="edit-details"
              onClick={() => setEditOpen(true)}
            >
              Edit details
            </button>
          </div>
          <div className="msv12-cover" data-msv12="cover">
            {/* ⚠️ NO UPLOAD IN THIS PASS (D9) — Storage is not provisioned. The button opens
                nothing and says so; wiring it later is one handler. */}
            <button
              type="button" className="msv12-coverph" aria-disabled="true"
              aria-label="Add your book cover" title="Cover upload is coming soon"
            >
              <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                <rect x="4" y="3" width="18" height="20" rx="2" /><circle cx="10" cy="9.5" r="2" />
                <path d="M4.5 19l5.5-5.5 4 4 3-3 4.5 4.5" />
              </svg>
              <span className="msv12-ct">Book cover</span>
              <span className="msv12-cadd">Add image</span>
            </button>
          </div>
        </section>

        <OwedList owed={owed} agentName={agentName} versionPin={versionPin} onSend={openSend} />

        {/* ── the shelf ────────────────────────────────────────────────────────────────────── */}
        <div className="msv13-shelfbox">
          <div className="msv13-shelf" data-msv13="shelf">
            <ShelfComps
              rows={rowsOfComps} total={tally.total} inLetter={tally.inLetter} letterName={letterName}
              onOpen={() => onNavigate("manuscripts", "Comparable titles")}
            />
            <ShelfMaterials
              {...materialsFact(letters.length, synopses.length)}
              chips={chips} others={others} onOpen={toPackages}
            />
            <ShelfPackages pro={pro} total={msPackages.length} fact={pkgFact} rows={pkgRows} onOpen={toPackages} />
          </div>
        </div>

        <VersionTiles tiles={tiles} onOpen={(v) => setVersionDlg(v)} onNew={() => setVersionDlg("new")} />

        <RecentActivity rows={activity.rows} total={activity.total} onOpen={() => onNavigate("queries")} />
      </div>

      {/* ── overlays ───────────────────────────────────────────────────────────────────────── */}
      {editOpen ? (
        <Msv12EditDetails
          ms={ms} authorName={currentUser?.name ?? ""}
          updateManuscript={updateManuscript} updateUserProfile={updateUserProfile}
          onClose={() => setEditOpen(false)}
        />
      ) : null}
      {versionDlg ? (
        <Msv12NewVersion
          ms={ms} editing={versionDlg === "new" ? null : versionDlg}
          updateManuscript={updateManuscript} onClose={() => setVersionDlg(null)}
        />
      ) : null}
    </>,
  );
};
