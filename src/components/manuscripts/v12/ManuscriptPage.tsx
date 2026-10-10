/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE MANUSCRIPTS PAGE (v21) — the Contact list look, the book on one page ══
 *
 * Design authority: design-refs/manuscripts/manuscripts-v21.html. Locks:
 * tests/e2e/manuscriptsV21.measure.ts (MS21) and the unit locks beside this file.
 *
 * TOP TO BOTTOM: the open header (the book's title, one line, two buttons, the Archivist over the
 * hairline) · the book card beside Recent activity · the versions banner · Versions (the copy and a
 * stacked deck, with a list on demand) · Your materials (three doors on a full-width band) · the
 * app footer. With no manuscript the same header carries one action over three previews.
 *
 * ⚠️ SINGLE-MANUSCRIPT BY DESIGN. The page shows the SCOPED manuscript — the shell's own
 * `scriptally_active_manuscript_id` selection resolved through `scopedManuscript` — read on every
 * arrival (`location.key`), because the switcher writes the key and re-opens the route.
 *
 * ⚠️ NOTHING HERE CHANGES A QUERY INLINE. An activity row opens the query drawer — the "sent"
 * journey for an owed request — and only the drawer writes.
 *
 * ⚠️ THE JUST-DELETED STATE READS NOTHING THAT WAS DELETED. The page remembers the book it last
 * showed (id and title, in memory, for the session). When that book is gone and no other is left,
 * the empty state names it. Nothing on this page deletes a manuscript; whatever does, this notices.
 */
import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useScriptAllyDb } from "../../../lib/db";
import { ComponentType } from "../../../types";
import type { BookVersion } from "../../../types";
import {
  currentBookVersion, letterInUse, materialsOf, owedRequests, queryingSince, scopedManuscript,
} from "../../../lib/manuscriptSummary";
import { manuscriptActivity, packagesFact, versionTiles } from "../../../lib/manuscriptShelf";
import { bookVersionsOf } from "../../../lib/bookVersions";
import { queryLine } from "../../../lib/compsPage";
import {
  bookFacts, materialDoors, rowDoor, v21Activity, versionCards, versionsLede,
} from "../../../lib/manuscriptV21";
import type { Door, V21ActivityRow } from "../../../lib/manuscriptV21";
import { WorkspacePageGrid } from "../../shell/WorkspacePageGrid";
import { AppFooter } from "../../shell/AppFooter";
import { PageGuide } from "../../shell/PageGuide";
import type { GuideStep } from "../../shell/PageGuide";
import { useToast } from "../../toast/ToastProvider";
import {
  ActivityCard, BookCard, EmptyPreviews, MS_HEADER_SUB, MaterialDoors, MsBanner, MsOpenHeader, VersionsSection,
} from "./Msv21Parts";
import { Msv21AddManuscript, Msv21EditDetails, Msv21Version } from "./Msv21Dialogs";
import "./msv12.css";
import "./msv21.css";
import { openQueryDrawer } from "../../../lib/queryActions/drawerStore";

/** The shell's shared scope key — the sidebar switcher writes it; this page only reads. */
const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";

export const MS_GUIDE_PAGE = "manuscripts";
export const MS_GUIDE: readonly GuideStep[] = [
  {
    title: "Your book on one page",
    body: ["The details agents see first, every version you’ve saved, and what’s been happening with it."],
    subject: '[data-ms21="book"]',
  },
  {
    title: "Versions",
    body: ["Save each new opening or draft, and see which one gets requests."],
    subject: '[data-ms21="versions"]',
  },
  {
    title: "Your materials",
    body: ["Comps, letters and packages each have their own page."],
    subject: '[data-ms21="materials"]',
  },
];

export const EMPTY_TITLE = "Let's add your book";
export const EMPTY_SUB = "Title, word count, genre and a line about it. It takes a minute, and everything else in QueryHawk hangs off it.";
export const DELETED_TITLE = "Add your book again";
export const deletedSub = (title: string): string =>
  `${title} has been deleted, along with its queries and materials. Add a manuscript to start again.`;

/** The book this page last showed, for the session. Module scope: it must outlive the page's own
 *  state, and it holds nothing but an id and a title. */
let lastShown: { id: string; title: string } | null = null;
/** The deleted book the toast has already announced, so a re-render never repeats it. */
let announced: string | null = null;

export interface ManuscriptPageProps {
  onNavigate: (tab: string, subPage?: string) => void;
  active?: boolean;
  openId?: string | null;
}

export const ManuscriptPage: React.FC<ManuscriptPageProps> = ({ onNavigate, openId = null }) => {
  const {
    currentUser, manuscripts, versions, packages, agents, queries, activities, collectionsReady,
    updateManuscript, addManuscript,
  } = useScriptAllyDb();
  const location = useLocation();
  const { showToast } = useToast();

  /* ⚠️ KEYED ON location.key: the switcher writes the key and re-opens the route */
  const stored = useMemo(() => {
    try { return localStorage.getItem(ACTIVE_MS_KEY); } catch { return null; }
  }, [location.key]);
  const ms = useMemo(() => scopedManuscript(manuscripts, openId ?? stored), [manuscripts, openId, stored]);

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
  const comps = useMemo(() => ms?.comps ?? [], [ms]);

  const facts = useMemo(
    () => (ms ? bookFacts({ ms, authorName: currentUser?.name, since, current }) : []),
    [ms, currentUser, since, current],
  );
  /* the comps page keeps no saved format: it opens on "readers", and so does this line */
  const line = useMemo(() => queryLine([...comps], ms?.title ?? "", "readers"), [comps, ms]);
  const rows = useMemo(() => {
    if (!ms) return [];
    const now = new Date();
    const all = manuscriptActivity({ ms, activities, queries, agents, packages, bookVersions, now, max: Number.MAX_SAFE_INTEGER }).rows;
    return v21Activity({
      rows: all, owed, now,
      agentName: (id) => { const a = agents.find((x) => x.id === id); return (a?.name || a?.agency || "The agent").trim(); },
    });
  }, [ms, activities, queries, agents, packages, bookVersions, owed]);
  const cards = useMemo(
    () => versionCards(versionTiles(bookVersions, current?.id ?? null, msPackages, msQueries)),
    [bookVersions, current, msPackages, msQueries],
  );
  const lede = useMemo(() => versionsLede(cards, ms?.title ?? ""), [cards, ms]);
  const doors = useMemo(() => materialDoors({
    comps, letters: letters.length, synopses: synopses.length,
    letterName: letters.find((l) => l.id === inUseLetter)?.versionName ?? null,
    livePackages: msPackages.length, packageQueries: packagesFact(msPackages, msQueries).queries,
  }), [comps, letters, synopses, inUseLetter, msPackages, msQueries]);

  /* ══ the page's own dialogs ═════════════════════════════════════════════════════════════════ */

  const [editOpen, setEditOpen] = useState(false);
  /** `null` closed · `"new"` a new version · a version to rename (no per-version panel exists) */
  const [versionDlg, setVersionDlg] = useState<"new" | BookVersion | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  /* ══ the just-deleted state ═════════════════════════════════════════════════════════════════ */

  if (ms) lastShown = { id: ms.id, title: ms.title };
  const deleted = !ms && collectionsReady && lastShown && !manuscripts.some((m) => m.id === lastShown!.id) ? lastShown : null;
  useEffect(() => {
    if (!deleted || announced === deleted.id) return;
    announced = deleted.id;
    showToast({ message: `${deleted.title} deleted.` });
  }, [deleted, showToast]);

  /* ══ render ═════════════════════════════════════════════════════════════════════════════════ */

  const grid = (children: React.ReactNode, state: "filled" | "empty" | "deleted" | "loading") => (
    <WorkspacePageGrid className="msv12-wpg" masthead={null} scrollLabel="Manuscripts">
      {/* ⚠️ THE FOOTER IS INSIDE THE PAGE ROOT, as the Contact list's is inside its group: the shared
          column's gutter is `padding-inline` on the scroller's own children, and the footer's own
          `padding` shorthand would zero it there. */}
      <div className="msv12-own msv12-root ms21" data-msv12="page" data-ms21="page" data-state={state}>
        {children}
        {state === "loading" ? null : <AppFooter onNavigate={(t, sub) => onNavigate(t, sub)} />}
      </div>
    </WorkspacePageGrid>
  );

  /* nothing is known yet: neither state is drawn, so the empty state never flashes before a book */
  if (!ms && !collectionsReady) return grid(null, "loading");

  if (!ms) {
    return grid(
      <>
        <MsOpenHeader title={deleted ? DELETED_TITLE : EMPTY_TITLE} sub={deleted ? deletedSub(deleted.title) : EMPTY_SUB}>
          <button type="button" className="ms21-b1" data-ms21="add" onClick={() => setAddOpen(true)}>+ Add your manuscript</button>
        </MsOpenHeader>
        <div className="ms21-emptyb" data-ms21="empty">
          <MsBanner big>Here's what this page does once your book is in.</MsBanner>
          <EmptyPreviews />
        </div>
        {addOpen ? <Msv21AddManuscript addManuscript={addManuscript} onClose={() => setAddOpen(false)} /> : null}
      </>,
      deleted ? "deleted" : "empty",
    );
  }

  const onRow = (r: V21ActivityRow) => { const d = rowDoor(r); if (d) openQueryDrawer({ mode: d.mode, queryId: d.queryId }); };
  const onDoor = (d: Door) => onNavigate("manuscripts", d.key === "comps" ? "Comparable titles" : "Submission packages");

  return grid(
    <>
      <PageGuide page={MS_GUIDE_PAGE} steps={MS_GUIDE} />
      <MsOpenHeader v3 title={ms.title} sub={MS_HEADER_SUB} soon={manuscripts.length <= 1}>
        <button type="button" className="hp3-btn hpanel-b1" data-ms21="header-edit" onClick={() => setEditOpen(true)}>Edit details</button>
        <button type="button" className="hp3-btn hpanel-b2" data-ms21="header-new-version" onClick={() => setVersionDlg("new")}>+ New version</button>
      </MsOpenHeader>

      <div className="ms21-grid" data-ms21="row">
        <BookCard
          title={ms.title} authorName={(currentUser?.name ?? "").trim()} coverUrl={ms.coverUrl}
          logline={ms.logline ?? ""} facts={facts} line={line}
          onEdit={() => setEditOpen(true)} onComps={() => onNavigate("manuscripts", "Comparable titles")}
        />
        <ActivityCard rows={rows} onRow={onRow} onAll={() => onNavigate("queries")} />
      </div>

      <MsBanner>
        Prologue first? Fast-paced opening? Leading with a passage of world-building? Track <b>versions</b> of a manuscript to see what's landing best.
      </MsBanner>

      <VersionsSection
        title={ms.title} cards={cards} lede={lede}
        onNew={() => setVersionDlg("new")} onOpen={(c) => setVersionDlg(c.v)}
      />

      <MaterialDoors doors={doors} onOpen={onDoor} />

      {editOpen ? <Msv21EditDetails ms={ms} updateManuscript={updateManuscript} onClose={() => setEditOpen(false)} /> : null}
      {versionDlg ? (
        <Msv21Version
          ms={ms} editing={versionDlg === "new" ? null : versionDlg}
          updateManuscript={updateManuscript} onClose={() => setVersionDlg(null)}
        />
      ) : null}
    </>,
    "filled",
  );
};
