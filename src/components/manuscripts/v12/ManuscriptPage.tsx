/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE MANUSCRIPTS PAGE (v29) — the book on the page ══
 *
 * Design authority: design-refs/manuscripts-v29/manuscripts-v29.html. Locks: tests/e2e/manuscriptsV29.measure.ts
 * (MSV29) and v29/msv29.test.tsx.
 *
 * THE NAVY HEADER (one button, "Edit details"; the book's vitals on the right) and THE DESK beneath it: "The pitch" on
 * the left; "Details" and "Your manuscripts" stacked on the right (v29/Msv29Parts). No footer. Every edit is the one
 * Edit details drawer (`v28/MsEditDrawer`, on the shared HalfDrawer), opened on a field; a save's toast carries Undo.
 * v29 retired the book view, "View summary", the logline strip and the coming-soon foot with its two tiles.
 *
 * ⚠️ NO PRO INFORMATION HERE. Versions moved to their own page (`/manuscripts/versions`, `v27/VersionsPage`); packages,
 *    materials, comps and activity are their own pages' business.
 * ⚠️ SINGLE-MANUSCRIPT BY DESIGN. The page shows the SCOPED manuscript — the shell's own
 *    `scriptally_active_manuscript_id` selection resolved through `scopedManuscript` — read on every arrival
 *    (`location.key`), because the switcher writes the key and re-opens the route.
 * ⚠️ THE EMPTY AND JUST-DELETED STATES ARE v21's, UNCHANGED.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useScriptAllyDb } from "../../../lib/db";
import { queryingSince, scopedManuscript } from "../../../lib/manuscriptSummary";
import { msGuideDone, statusWord, wordsOf, wordsText } from "../../../lib/manuscriptV27";
import { COPY_FAILED, PITCH, type PitchKey } from "../../../lib/manuscriptV29";
import { invokeCapture } from "../../shell/railNav";
import { ActivityType } from "../../../types";
import type { MsGuideKey } from "../../../lib/manuscriptV27";
import { MS_CHECKLIST, MS_GUIDE_HIDDEN_PATH, MS_GUIDE_SEEN_PATH, MS_GUIDE_UNHIDE_PATH, msGuideOf } from "../../../lib/pageChecklist";
import { WorkspacePageGrid } from "../../shell/WorkspacePageGrid";
import { AppFooter } from "../../shell/AppFooter";
import { PageChecklist, type FlowCard } from "../../shell/guide/PageChecklist";
import { useToast } from "../../toast/ToastProvider";
import { EmptyPreviews, MsBanner } from "./Msv21Parts";
import { Msv21AddManuscript } from "./Msv21Dialogs";
import { MsEditDrawer, type EditField } from "../v28/MsEditDrawer";
import { MsHeader } from "../v27/Msv27Parts";
import { DetailsFrame, MsVitals, PitchFrame, ShelfFrame, writeClipboard } from "../v29/Msv29Parts";
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
    currentUser, manuscripts, queries, activities, collectionsReady,
    updateManuscript, updateManuscriptQuiet, deleteActivity, addManuscript, updateUserPaths,
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

  /* ══ the edit drawer ═══════════════════════════════════════════════════════════════════════ */

  /** null closed · otherwise open, on the named section (or none) */
  const [edit, setEdit] = useState<{ field?: EditField } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [flowKey, setFlowKey] = useState<MsGuideKey | null>(null);
  const [nonce, setNonce] = useState(0);
  /** v29 Part F: the pitch rows a save changed, flashed once */
  const [flash, setFlash] = useState<PitchKey[]>([]);
  useEffect(() => {
    if (!flash.length) return undefined;
    const t = window.setTimeout(() => setFlash([]), 1200);
    return () => window.clearTimeout(t);
  }, [flash]);

  /* ⚠️ UNDO IS A GENUINE INVERSE (CLAUDE.md "Undo"). `updateManuscript` narrates every save into the feed
     ("You updated a manuscript's details"), so the undo neither goes back through it (a compensating entry) nor leaves
     that record: the feed rows for this book that were not there when the drawer opened are the ones the save made,
     and Undo deletes them. The fields go back through the quiet write; a status move's `statusChangedDate` is put back
     in a second quiet write, because the quiet write re-stamps it after the fields whenever the status moves. */
  const live = useRef({ activities, deleteActivity, updateManuscriptQuiet });
  live.current = { activities, deleteActivity, updateManuscriptQuiet };
  const feedBefore = useRef<Set<string>>(new Set());
  const feedOf = (id: string) => live.current.activities
    .filter((a) => a.activityType === ActivityType.MANUSCRIPT_UPDATED && a.manuscriptId === id).map((a) => a.id);

  const openEdit = useCallback((field?: EditField) => {
    if (ms) feedBefore.current = new Set(feedOf(ms.id));
    setEdit({ field });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ms]);
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
  /* every step opens Edit details on its own field */
  const startStep = useCallback((k: MsGuideKey) => {
    const card = MS_STEP_CARDS[k];
    openEdit(card.field);
    setFlowKey(k);
    return true;
  }, [openEdit]);
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
      <div className={`msv12-own msv12-root ms21${state === "filled" ? " ms27 ms29" : ""}`} data-msv12="page" data-ms21="page" data-ms27="page" data-state={state}>
        {children}
        {/* v27: the populated page has no footer; the empty and deleted states keep v21's */}
        {state === "empty" || state === "deleted" ? <AppFooter onNavigate={(t, sub) => onNavigate(t, sub)} /> : null}
      </div>
    </WorkspacePageGrid>
  );

  /* nothing is known yet: neither state is drawn, so the empty state never flashes before a book */
  if (!ms && !collectionsReady) return grid(<MsHeader kind="loading" />, "loading");

  if (!ms) {
    return grid(
      <>
        {/* Workspace headers v1: the navy header, with no book — its title and the one button (the sub line went with
            the old header: EMPTY_SUB / deletedSub are no longer drawn) */}
        <MsHeader kind="empty" title={deleted ? DELETED_TITLE : EMPTY_TITLE} onAdd={() => setAddOpen(true)} />
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
  const msId = ms.id;
  const undo = async (inverse: Record<string, unknown>) => {
    const { statusChangedDate, ...fields } = inverse;
    const made = feedOf(msId).filter((id) => !feedBefore.current.has(id));
    await live.current.updateManuscriptQuiet(msId, fields as never);
    if ("statusChangedDate" in inverse) await live.current.updateManuscriptQuiet(msId, { statusChangedDate } as never);
    for (const id of made) await live.current.deleteActivity(id);
  };
  const copy = async (k: PitchKey, text: string) => {
    const ok = await writeClipboard(text);
    showToast({ message: ok ? PITCH.find((p) => p.k === k)!.copied : COPY_FAILED });
    return ok;
  };

  return grid(
    <>
      <PageChecklist page="Manuscripts" items={MS_CHECKLIST} done={done} seen={guide.seen} hidden={guide.hidden}
        active={active} ready={collectionsReady} targetFor={targetFor} onSeen={markSeen} onHide={hideGuide}
        art={heroArt} onStart={startStep} flow={flow} openNonce={nonce}
        /* never over a task: the edit form open */
        quiet={!!edit} onUnhide={unhideGuide} pillClass="pck-pill--ms27" closeOnFocusOut
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
      <MsHeader kind="book" title={ms.title} byline={author} words={words} status={statusWord(ms)}
        vitals={<MsVitals ms={ms} since={since} onAddWords={() => openEdit("wordCount")} />}
        onEdit={() => openEdit("basics")} />
      <div className="ms29-desk" data-ms29="desk">
        <PitchFrame ms={ms} flash={flash} onEdit={(k) => openEdit(k)} onCopy={copy} />
        <div className="ms29-side" data-ms29="side">
          <DetailsFrame ms={ms} since={since} queries={msQueries.length} onEdit={() => openEdit("basics")}
            onSeeQueries={() => onNavigate("queries")} onLogQuery={() => invokeCapture("query", onNavigate)} />
          <ShelfFrame ms={ms} />
        </div>
      </div>

      {edit ? (
        <MsEditDrawer ms={ms} since={since} updateManuscript={updateManuscript} onClose={closeEdit} focus={edit.field}
          undo={undo} onChanged={setFlash} />
      ) : null}
    </>,
    "filled",
  );
};
