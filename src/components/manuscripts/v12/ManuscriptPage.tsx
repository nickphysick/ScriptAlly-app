/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE MANUSCRIPTS PAGE (v27) — one neat page for the book, a book that opens, and a guide ══
 *
 * Design authority: design-refs/manuscripts-v27/manuscripts-v27.html. Locks: tests/e2e/manuscriptsV27.measure.ts (MSV27)
 * and the unit locks beside this file.
 *
 * TWO CONTAINERS AND NOTHING ELSE: the book (the header-rules header inside a white card, the details card on its
 * right, the logline at its foot) and the coming-soon strip. No footer. The book's details open in the book view
 * (`v27/BookView`), and every edit is the one Edit details drawer (`v28/MsEditDrawer`, on the shared HalfDrawer),
 * which can open on a field. v28: never a centred modal.
 *
 * ⚠️ NO PRO INFORMATION HERE. Versions moved to their own page (`/manuscripts/versions`, `v27/VersionsPage`); packages,
 *    materials, comps and activity are their own pages' business.
 * ⚠️ SINGLE-MANUSCRIPT BY DESIGN. The page shows the SCOPED manuscript — the shell's own
 *    `scriptally_active_manuscript_id` selection resolved through `scopedManuscript` — read on every arrival
 *    (`location.key`), because the switcher writes the key and re-opens the route.
 * ⚠️ THE EMPTY AND JUST-DELETED STATES ARE v21's, UNCHANGED.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useScriptAllyDb } from "../../../lib/db";
import { queryingSince, scopedManuscript } from "../../../lib/manuscriptSummary";
import { bookRows, cardRows, coverKicker, msGuideDone, whereItsBeen, wordsOf, wordsText } from "../../../lib/manuscriptV27";
import type { MsGuideKey } from "../../../lib/manuscriptV27";
import { MS_CHECKLIST, MS_GUIDE_HIDDEN_PATH, MS_GUIDE_SEEN_PATH, MS_GUIDE_UNHIDE_PATH, msGuideOf } from "../../../lib/pageChecklist";
import { WorkspacePageGrid } from "../../shell/WorkspacePageGrid";
import { AppFooter } from "../../shell/AppFooter";
import { PageChecklist, type FlowCard } from "../../shell/guide/PageChecklist";
import { useToast } from "../../toast/ToastProvider";
import { EmptyPreviews, MsBanner, MsOpenHeader } from "./Msv21Parts";
import { Msv21AddManuscript } from "./Msv21Dialogs";
import { MsEditDrawer, type EditField } from "../v28/MsEditDrawer";
import { BookContainer } from "../v27/Msv27Parts";
import { MsFoot } from "../v28/MsFoot";
import { BookView, type BookField } from "../v27/BookView";
import heroArt from "../../../assets/manuscripts/hero-archivist.png";
import "./msv12.css";
import "./msv21.css";
import "../v27/msv27.css";

/** The shell's shared scope key — the sidebar switcher writes it; this page only reads. */
const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";

export const EMPTY_TITLE = "Let's add your book";
export const EMPTY_SUB = "Title, word count, genre and a line about it. It takes a minute, and everything else in QueryHawk hangs off it.";
export const DELETED_TITLE = "Add your book again";
export const deletedSub = (title: string): string =>
  `${title} has been deleted, along with its queries and materials. Add a manuscript to start again.`;

/** The guide's step cards (Part D): what each says, and which section of Edit details it lights. */
export const MS_STEP_CARDS: Record<MsGuideKey, { field: EditField; title: string; body: React.ReactNode }> = {
  details: { field: "basics", title: "Check the basics", body: <>Agents filter on <b>genre</b>, <b>age category</b> and <b>word count</b> first. Make sure they’re right, then press <b>Save details</b>.</> },
  logline: { field: "logline", title: "Your logline", body: <>One sentence that captures the hook: who it’s about, what they want and what stands in the way. It opens your query letter. Then press <b>Save details</b>.</> },
  pitch: { field: "elevatorPitch", title: "Your elevator pitch", body: <>Longer than your logline: the hook, then the stakes and what makes it yours. You never know when the right person might ask what your book’s all about, and it might be the moment that matters. Say it out loud: if it trips you up, trim it. Then press <b>Save details</b>.</> },
  synopsis: { field: "synopsis", title: "Your synopsis", body: <>The whole story in brief, ending included. Agents often ask for one alongside your opening pages. Then press <b>Save details</b>.</> },
};
export const MS_ALL_DONE = { title: "Your book's set up", line: "Everything an agent asks about the book, in one place. Next, try smart querying." };
export const MS_FINAL = { kicker: "Manuscripts · 4 of 4", title: "Your book’s set up.", line: "Everything an agent asks about the book, in one place. Now put it to work with smart querying." };
/** No help article covers a manuscript's details yet; Learn more goes to the Help Centre (its Materials area). */

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

export const ManuscriptPage: React.FC<ManuscriptPageProps> = ({ onNavigate, active = true, openId = null }) => {
  const {
    currentUser, manuscripts, agents, queries, activities, collectionsReady,
    updateManuscript, addManuscript, updateUserPaths,
  } = useScriptAllyDb();
  const location = useLocation();
  const { showToast } = useToast();

  /* ⚠️ KEYED ON location.key: the switcher writes the key and re-opens the route */
  const stored = useMemo(() => {
    try { return localStorage.getItem(ACTIVE_MS_KEY); } catch { return null; }
  }, [location.key]);
  const ms = useMemo(() => scopedManuscript(manuscripts, openId ?? stored), [manuscripts, openId, stored]);

  const msQueries = useMemo(() => (ms ? queries.filter((q) => q.manuscriptId === ms.id) : []), [ms, queries]);
  const since = useMemo(() => queryingSince(msQueries), [msQueries]);
  const author = (currentUser?.name ?? "").trim() || null;

  /* ══ the book view and the edit form: one open at a time ═══════════════════════════════════ */

  const [bookOpen, setBookOpen] = useState(false);
  /** null closed · otherwise open, on the named section (or none) */
  const [edit, setEdit] = useState<{ field?: EditField } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [flowKey, setFlowKey] = useState<MsGuideKey | null>(null);
  const [nonce, setNonce] = useState(0);

  const openEdit = useCallback((field?: EditField) => { setBookOpen(false); setEdit({ field }); }, []);
  const closeEdit = useCallback(() => { setEdit(null); setFlowKey(null); }, []);

  /* ══ the just-deleted state ═════════════════════════════════════════════════════════════════ */

  if (ms) lastShown = { id: ms.id, title: ms.title };
  const deleted = !ms && collectionsReady && lastShown && !manuscripts.some((m) => m.id === lastShown!.id) ? lastShown : null;
  useEffect(() => {
    if (!deleted || announced === deleted.id) return;
    announced = deleted.id;
    showToast({ message: `${deleted.title} deleted.` });
  }, [deleted, showToast]);

  /* ══ the guide (Part D) ═════════════════════════════════════════════════════════════════════ */

  const guide = msGuideOf(currentUser);
  const done = useMemo(() => msGuideDone(ms), [ms]);
  const markSeen = useCallback(() => { if (!guide.seen) void updateUserPaths(MS_GUIDE_SEEN_PATH); }, [guide.seen, updateUserPaths]);
  const hideGuide = useCallback(() => { void updateUserPaths(MS_GUIDE_HIDDEN_PATH); }, [updateUserPaths]);
  const unhideGuide = useCallback(() => { void updateUserPaths(MS_GUIDE_UNHIDE_PATH); }, [updateUserPaths]);
  /* every step opens Edit details on its own field — never the book view (closed first if it is open) */
  const startStep = useCallback((k: MsGuideKey) => {
    const card = MS_STEP_CARDS[k];
    setBookOpen(false);
    setEdit({ field: card.field });
    setFlowKey(k);
    return true;
  }, []);
  const toVersions = useCallback(() => onNavigate("manuscripts", "Versions"), [onNavigate]);
  const toPackages = useCallback(() => onNavigate("manuscripts", "Submission packages"), [onNavigate]);
  const flow: FlowCard | null = useMemo(() => {
    if (!flowKey || !edit) return null;
    const card = MS_STEP_CARDS[flowKey];
    const n = MS_CHECKLIST.findIndex((i) => i.key === flowKey) + 1;
    return {
      id: `ms-${flowKey}`, kicker: `Manuscripts · Step ${n} of ${MS_CHECKLIST.length}`, title: card.title, body: card.body,
      target: () => document.querySelector<HTMLElement>(`[data-ms21-sect="${card.field}"]`),
      passThrough: true, follow: true, above: true,
      onBack: () => { setFlowKey(null); setNonce((x) => x + 1); },
      onEscape: () => setFlowKey(null),
    };
  }, [flowKey, edit]);
  const targetFor = useCallback(() => ({ el: null, text: "" }), []);

  /* ══ render ═════════════════════════════════════════════════════════════════════════════════ */

  const grid = (children: React.ReactNode, state: "filled" | "empty" | "deleted" | "loading") => (
    <WorkspacePageGrid className="msv12-wpg" masthead={null} scrollLabel="Manuscripts">
      <div className={`msv12-own msv12-root ms21${state === "filled" ? " ms27 ms28-fill" : ""}`} data-msv12="page" data-ms21="page" data-ms27="page" data-state={state}>
        {children}
        {/* v27: the populated page has no footer; the empty and deleted states keep v21's */}
        {state === "empty" || state === "deleted" ? <AppFooter onNavigate={(t, sub) => onNavigate(t, sub)} /> : null}
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

  const w = wordsOf(ms);
  const words = w > 0 ? wordsText(w) : null;
  const stats = whereItsBeen(msQueries, activities, agents, Date.now());

  return grid(
    <>
      <PageChecklist page="Manuscripts" items={MS_CHECKLIST} done={done} seen={guide.seen} hidden={guide.hidden}
        active={active} ready={collectionsReady} targetFor={targetFor} onSeen={markSeen} onHide={hideGuide}
        art={heroArt} onStart={startStep} flow={flow} openNonce={nonce}
        /* never over a task: the book view or the edit form open */
        quiet={bookOpen || !!edit} onUnhide={unhideGuide} pillClass="pck-pill--ms27"
        allDone={{
          ...MS_ALL_DONE,
          after: (
            <>
              <button type="button" className="ms27-gl" data-ms27="guide-versions" onClick={toVersions}>Save your first version</button>
              <button type="button" className="ms27-gl" data-ms27="guide-packages" onClick={toPackages}>Build a package</button>
            </>
          ),
        }}
        finalNote={{
          ...MS_FINAL,
          actions: [
            { label: "Save your first version", onClick: toVersions, attrs: { "data-ms27": "final-versions" } },
            { label: "Build a package", onClick: toPackages, attrs: { "data-ms27": "final-packages" } },
          ],
        }} />
      <div className="ms27-bkp" data-ms27="sections">
        <BookContainer
          title={ms.title} byline={author} rows={cardRows(ms, since)} words={words} logline={ms.logline ?? ""}
          onEdit={() => openEdit()} onView={() => setBookOpen(true)} onAddLogline={() => openEdit("logline")}
        />
        <MsFoot onVersions={toVersions} onPackages={toPackages} />
      </div>

      {bookOpen ? (
        <BookView
          title={ms.title} author={author} kicker={coverKicker(ms.genre)} words={words}
          rows={bookRows(ms, since)} stats={stats}
          logline={ms.logline ?? ""} pitch={ms.elevatorPitch ?? ""} synopsis={ms.synopsis ?? ""}
          onClosed={() => setBookOpen(false)}
          onEdit={(f?: BookField) => openEdit(f)}
          onQueryCentre={() => { setBookOpen(false); onNavigate("queries"); }}
        />
      ) : null}
      {edit ? <MsEditDrawer ms={ms} since={since} updateManuscript={updateManuscript} onClose={closeEdit} focus={edit.field} /> : null}
    </>,
    "filled",
  );
};
