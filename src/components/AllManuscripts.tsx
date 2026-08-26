/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manuscripts — the LIBRARY, and the dossier one book opens into. References:
 * design-refs/manuscript-library.html (grid + dossier) and design-refs/manuscript-plate-inputs.html
 * (the white plateband, variant D plain). Run report in reports/manuscripts-reframe.md.
 *
 * This page is two views and `openId` is the only thing that says which: null renders the library
 * grid, an id renders that manuscript's dossier. The dossier itself is `ManuscriptDossier` — this
 * file owns selection, lifecycle and the edit modal, and hands the rest across as props.
 *
 * ⚠️ THE SHELF SWITCHER IS GONE, not hidden. It existed to pick the one card's subject and the
 * library does that by being a library; keeping both gave the page two controls for one job.
 *
 * ⚠️ EVERYTHING ABOVE THE GRID BELONGS TO THE HEADER STREAM. `PageHeader` and `.msv1` are theirs
 * (a7b5d54); this file's business starts inside `.msv-wrap`.
 *
 * ⚠️ SELECTION AND TAB STATE LIVE HERE, ABOVE THE DOSSIER, so switching manuscripts swaps the plate
 * and panes without remounting the card — which is what lets the chosen tab survive the switch. Tab
 * state is LOCAL: no route, no URL param, no persistence.
 *
 * The lifecycle flows (reversible shelve with undo, guarded delete via the cascade manifest) and the
 * edit modal carry over unchanged; comps are deliberately absent from the modal.
 */
import React, { useEffect, useState } from "react";
import { deleteField } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useScriptAllyDb } from "../lib/db";
import { destroyManifest } from "../lib/cascade";
import { ConfirmDestroy } from "./ConfirmDestroy";
import { Manuscript, ManuscriptStatus } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { PageHeader } from "./shell/PageHeader";
import { WorkspacePageGrid } from "./shell/WorkspacePageGrid";
import { Plus, X, Check } from "lucide-react";
import { isShelvedPresentation } from "../lib/manuscriptPage";
import { manuscriptComps, withCompRemoved, pitchLine, pitchLineText } from "../lib/comps";
import { isProUser, scoutLive } from "../lib/suggestComps";
import { plateStats, formatPlateDate } from "../lib/manuscriptPlate";
import { DEFAULT_MANUSCRIPT_TAB, ManuscriptTabKey } from "./manuscripts/ManuscriptTabs";
import { ManuscriptDossier } from "./manuscripts/ManuscriptDossier";
import { ManuscriptLibraryCard, ManuscriptAddTile } from "./manuscripts/ManuscriptLibraryCard";
import { pitchAssets, pitchMeter, PitchAssetKey, synopsisVersions } from "../lib/manuscriptPitch";
import { genreDisplay } from "../lib/genres";
import { agentPrimary, AGENT_NOT_RECORDED } from "../lib/agentDisplay";
import { manuscriptNotes } from "../lib/manuscriptProfile";
import { londonDay } from "../lib/queryingGoals";
import type { BookVersion } from "../types";
import { genreList, splitGenres } from "./manuscripts/plateEdit";
import { SectionHeader } from "./containers/SectionHeader";
import { shelfMeta } from "../lib/manuscriptProfile";
import "./manuscripts/manuscripts.css";

/** Shared with the comps + packages sub-pages — the section's single active-manuscript pointer. */
const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";

interface AllManuscriptsProps {
  searchQuery?: string;
  /** App's handleNavigate bridge — opts.manuscriptId preselects the Log-a-Query manuscript (additive). */
  onNavigate?: (tab: string, subPageName?: string, opts?: { manuscriptId?: string }) => void;
  /**
   * ⚠️ TRUE WHILE `/manuscripts` IS THE VISIBLE ROUTE, and it is load-bearing rather than
   * informational (workspace round, Phase 5). `StagePage` toggles DISPLAY and keeps every workspace
   * page mounted, so "the page arrived" is not an event this component can otherwise observe — and
   * the one-shot reveal below needs exactly that moment. `Agents` has carried the same prop unused
   * for the same reason its own reveal has been silently dead; see the run report.
   */
  active?: boolean;
}

export const AllManuscripts: React.FC<AllManuscriptsProps> = ({ onNavigate, active = true }) => {
  const { currentUser, manuscripts, queries, packages, versions, activities, agents, userTasks, addUserTask, taskFlags, updateManuscript, updateManuscriptQuiet, deleteManuscript, setManuscriptShelved, addPersonalGenre } =
    useScriptAllyDb();

  /**
   * ⚠️ THE PAGE IS TWO VIEWS AND `openId` IS THE ONLY THING THAT SAYS WHICH. Null renders the
   * library grid; an id renders that manuscript's dossier. It does NOT seed from the stored pointer:
   * the page opens on the shelf, because arriving inside one book is a claim about which book you
   * wanted, and the grid is the whole point of the reframe.
   *
   * ⚠️ THE MECHANISM IS THESE THREE LINES AND NOTHING ELSE (openDossier / closeDossier / dossier),
   * so replacing local state with a `?m=<id>` param or a nested route is one edit here and no edit
   * anywhere else. Routing is Nick's call and is deliberately not taken by this phase.
   *
   * ⚠️ TAB STATE LIVES ABOVE THE CARD so the chosen tab survives a manuscript switch. It is LOCAL:
   * no route, no URL param, no persistence.
   */
  const navigate = useNavigate();
  const [openId, setOpenId] = useState<string | null>(null);
  const [tab, setTab] = useState<ManuscriptTabKey>(DEFAULT_MANUSCRIPT_TAB);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [deleteModalMs, setDeleteModalMs] = useState<Manuscript | null>(null);
  const [undoToast, setUndoToast] = useState<{ msg: string; undo: () => void } | null>(null);
  const [editingMs, setEditingMs] = useState<Manuscript | null>(null);

  // Plates: active books first, shelved sink to the end.
  const ordered = [...manuscripts]
    .sort((a, b) => Number(isShelvedPresentation(a)) - Number(isShelvedPresentation(b)));

  /**
   * ⚠️ THE ONE-SHOT REVEAL — the sibling of the agent list's `sa.agentReveal`, and deliberately the
   * same idiom rather than a second mechanism (workspace round, Phase 5). The task pane's deed
   * links a manuscript by name; landing on the shelf instead of on the book would make the link a
   * navigation rather than a destination.
   *
   * sessionStorage rather than a route param, for the reasons the agent list already states: a
   * reveal is a GESTURE, not an address — it must not survive the tab, must not enter history, and
   * must fire exactly once. Held until the manuscripts arrive so a slow snapshot does not eat it;
   * a stale id is consumed and does nothing, which returns the reader to the shelf rather than to
   * some other book.
   *
   * ⚠️ ABOVE THE `currentUser` GUARD, because a hook after a conditional return is a hook that
   * sometimes does not run — the rule React states and this file's early return makes easy to
   * break.
   *
   * ⚠️ AND IT KEYS ON `active`, BECAUSE THIS PAGE IS ALWAYS MOUNTED. Found by measurement, not by
   * reading: `StagePage` toggles DISPLAY and keeps every workspace page in the document, so by the
   * time anyone sets the key this component has long since mounted and `manuscripts.length` has
   * long since settled. An effect keyed on the count alone therefore fires ONCE, early, with no key
   * to read — and never again. Measured: the deed's manuscript link set
   * `sa.manuscriptReveal=seed-ms-1`, navigated to `/manuscripts`, and landed on the SHELF with the
   * key still sitting in sessionStorage. `active` is what changes on arrival.
   */
  useEffect(() => {
    if (!active) return;
    let id: string | null = null;
    try { id = sessionStorage.getItem("sa.manuscriptReveal"); } catch { /* private mode */ }
    if (!id || manuscripts.length === 0) return;
    try { sessionStorage.removeItem("sa.manuscriptReveal"); } catch { /* private mode */ }
    if (!manuscripts.some((m) => m.id === id)) return;   // stale id — consumed, nothing to show
    try { localStorage.setItem(ACTIVE_MS_KEY, id); } catch { /* private mode */ }
    setOpenId(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, manuscripts.length]);

  if (!currentUser) return null;

  /**
   * The dossier's subject, or null for the library grid. A stale id (the manuscript was deleted
   * under us) resolves to null and returns to the shelf rather than to some other writer's book.
   */
  const selected = openId ? ordered.find((m) => m.id === openId) ?? null : null;

  /** Writes the pointer the comps and packages sub-pages read. Not view state — a section-wide seat. */
  const selectMs = (id: string) => {
    try { localStorage.setItem(ACTIVE_MS_KEY, id); } catch { /* private mode — selection is session-only */ }
  };
  const openDossier = (id: string) => { selectMs(id); setOpenId(id); };
  const closeDossier = () => setOpenId(null);

  /**
   * ⚠️ RESOLVED THROUGH `genreDisplay`, ONCE, FOR BOTH SURFACES. `GenrePicker` stores canonical IDS
   * (`literary-fiction`), so a surface that renders the stored value shows the writer the id — which
   * the plateband did until this phase. Personal genres only resolve against the user's own list,
   * so this needs `currentUser` and belongs here rather than inside either component.
   */
  const msGenres = (m: Manuscript): string[] =>
    [m.ageCategory, m.genre ? genreDisplay(m.genre, currentUser.personalGenres ?? []) : ""].filter(Boolean);

  /**
   * Save one pitch piece.
   *
   * ⚠️ THE QUIET WRITER, DELIBERATELY. Polishing a blurb three times is not three events in the
   * query journey; `updateManuscript` would put three identical "You updated a manuscript's
   * details" entries in the global feed. See `updateManuscriptQuiet`'s note in db.tsx.
   *
   * ⚠️ AND THE TWO EMPTINESSES ARE NOT THE SAME SHAPE. `logline` is REQUIRED by `isValidManuscript`
   * (`data.logline is string`), so clearing it writes `""`; the two new fields are optional and are
   * cleared by DELETING the key, because a stored `""` is a value claiming the piece exists. One
   * place knows the difference so no caller has to.
   *
   * ⚠️ NEITHER NEW KEY IS IN THE FIRESTORE UPDATE ALLOWLIST YET, so an elevator-pitch or blurb save
   * is SILENTLY DENIED until the rules deploy. The logline saves today. Draft rule at the top of
   * reports/manuscripts-reframe.md's Phase 3 section.
   */
  const savePitch = (key: PitchAssetKey, text: string) => {
    if (!selected) return;
    const value = text.trim();
    if (key === "logline") { void updateManuscriptQuiet(selected.id, { logline: value }); return; }
    const field = key === "elevator" ? "elevatorPitch" : "backCoverBlurb";
    void updateManuscriptQuiet(selected.id, { [field]: value ? value : deleteField() } as any);
  };

  // ── lifecycle (carried over: reversible shelve flag-flip with Undo; deferred delete) ──
  const toggleShelved = async (ms: Manuscript) => {
    const next = !ms.shelved;
    await setManuscriptShelved(ms.id, next);
    if (next) {
      setUndoToast({
        msg: `“${ms.title}” shelved — kept, just not suggested`,
        undo: () => { void setManuscriptShelved(ms.id, false); setUndoToast(null); },
      });
      setTimeout(() => setUndoToast((t) => (t && t.msg.startsWith(`“${ms.title}”`) ? null : t)), 6000);
    } else {
      setToastMessage(`“${ms.title}” back in play`);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // 6A: type-to-confirm IS the safety — the delete runs immediately on confirm; no undo window
  // (the guard's dialog says so). The cascade + durable log live in db.deleteManuscript.
  const confirmDestroyMs = async (ms: Manuscript) => {
    await deleteManuscript(ms.id);
    setDeleteModalMs(null);
    setToastMessage(`“${ms.title}” deleted`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ── edit modal (carried over; comps deliberately absent — the shelf sub-page is the single home) ──
  const startEditMs = (m: Manuscript) => setEditingMs({ ...m });

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMs) return;
    try {
      await updateManuscript(editingMs.id, {
        title: editingMs.title,
        genre: editingMs.genre,
        ageCategory: editingMs.ageCategory,
        wordCount: editingMs.wordCount,
        logline: editingMs.logline,
        status: editingMs.status,
        shelvedReason: editingMs.shelvedReason || "",
        notes: editingMs.notes || "",
      });
      setToastMessage("Manuscript details updated.");
      setTimeout(() => setToastMessage(null), 3000);
      setEditingMs(null);
    } catch (err: any) {
      alert("Error updating manuscript: " + err?.message);
    }
  };

  /* Everything the card states is DERIVED here, per render, from the selected manuscript's own
     records. No counter is stored and none is written. */
  const msQueries = selected ? queries.filter((q) => q.manuscriptId === selected.id) : [];
  const msVersions = selected ? versions.filter((v) => v.manuscriptId === selected.id) : [];

  /**
   * Append or rename a book version.
   *
   * ⚠️ THE QUIET WRITER, DELIBERATELY. `updateManuscript` appends a `Manuscript Updated` activity;
   * naming an ordering of your own book is not an event on a query's timeline, and every query for
   * this manuscript would have carried one. Same reasoning as the plate's in-place edits above.
   *
   * ⚠️ AND THE NEXT LIST COMES FROM `lib/bookVersions`, WHICH IS THE SINGLE WRITER OF THE SHAPE.
   * This function stores what it is handed and computes nothing.
   */
  const saveBookVersions = (next: BookVersion[]) => {
    if (!selected) return;
    void updateManuscriptQuiet(selected.id, { bookVersions: next });
  };
  const msPackages = selected
    ? packages.filter((p) => p.manuscriptId === selected.id && p.status !== "Retired")
    : [];
  const msComps = selected ? manuscriptComps(selected) : [];
  /* The pitch shelf's four pieces + the version facts its synopsis card states. All derived. */
  const msPitch = selected ? pitchAssets(selected, msVersions) : [];
  const msSynVersions = synopsisVersions(msVersions);
  const msSynDate = msSynVersions.find((v) => v.contentDraft?.trim())?.createdDate ?? null;

  return (
    <div className="msv1">
      {/* ⚠️ THE HEADER IS INSIDE `.msv-wrap`, the capped content column — a PLATE's edges must meet
          the first and last plate below it, and past the cap the column centres, so that is the only
          place they agree. (It sat outside while it was a window-spanning band.) */}
      {/* ⚠️ THE CHROME IS OUT OF THE SCROLLER (amendment 9). Plate and toolbar are rows 1 and 2 of
          a grid whose row 3 is the only thing that scrolls — pinned by construction, so there is no
          `top` to compute and none to get wrong.
          ⚠️ THE MODALS STAY OUTSIDE THE GRID, below it in `.msv1`. They are fixed-position overlays;
          inside the scroller they would be children of a scrollport they are meant to cover. */}
      <WorkspacePageGrid
        className="msv-wpg"
        scrollLabel="Manuscripts"
        /* ⚠️ OPT-IN, AND IT IS WHAT MAKES THE DOSSIER'S HEIGHT CHAIN REAL. `.wpg-scroll` is a BLOCK
           by default, so `flex: 1; min-height: 0` inside it applies to nothing — and `flex: 1 1 0%`
           under a content-sized parent computes to EXACTLY 0, with every child mounted and correct.
           Measured twice in this repo. `fill` makes the scroll row a flex column; the library grid
           opts back out with `flex: 0 0 auto` so a growing shelf still scrolls the page. */
        fill
        /**
         * ⚠️ `condensed={!!selected}` IS DELETED (masthead rethink, step 4). Opening a dossier used
         * to fold the masthead: the page becomes a workspace whose panes scroll internally, so the
         * header was spending height on chrome nobody was choosing from.
         *
         * The reasoning was sound and the MECHANISM was the problem — it inferred that the writer
         * had started working, which is the same guess the click-anywhere vanish made. The fold is
         * an explicit Hide now, on this page as on every other fill page, and opening a dossier
         * leaves the masthead exactly as the writer left it.
         */
        masthead={
          <PageHeader
            variant="workspace"
          mark="manuscripts"
          /* ⚠️ NO COUNT ON THE PLATE — the slot is gone from the variant, and the figure did NOT go
             with it. THE RULE IS: the plate carries IDENTITY, the toolbar carries TALLIES and view
             state. So "N MANUSCRIPTS · M IN SUBMISSION" moved down to the tally row below, which is
             where the Contact list has always kept its own "16 OF 16". This figure had already been
             dropped once (with the grand slab) and would have gone a second time for want of a home;
             the home existed on a sibling page all along. */
          title="Manuscripts"
          description="Every manuscript on your shelf, and what each one is out doing." /* PROVISIONAL copy (flyouts P3) — listed for Nick's review */
          /**
           * ⚠️ `Add manuscript` IS DROPPED, NOT REHOMED — and this is the one masthead action that
           * did not need a control row built for it, because the page already offers it TWICE.
           * `ManuscriptAddTile` renders in the library grid at every count including one (its own
           * note argues for exactly that), and the zero-manuscript panel carries its own button. A
           * third copy in the masthead was the surplus.
           *
           * ⚠️ THE DOSSIER HAS NO ADD AFFORDANCE AND THAT IS CORRECT. The grid — and its tile —
           * render only while nothing is selected; with a manuscript open you are reading one, not
           * making another, and the library is one click away.
           */
          />
        }
        /* ⚠️ NO TOOLBAR AT ALL. The `{n} MANUSCRIPTS · {m} IN SUBMISSION` tally is DELETED, not
           rehomed again. It was rescued from the grand slab into the count slot, then into this
           row, and at every stop it read as a stray caption for the same reason: it was the only
           thing in its row, so `margin-left: auto` pushed it away from nothing. The figures are on
           the plate beneath it in any case.
           ⚠️ AND WITH IT GOES THE SECOND HAIRLINE. Row 2 drew its own rule under the tally, so
           Manuscripts showed two lines 20px apart in the working state. No toolbar → no row 2, and
           the gap comes from the masthead's own `margin-bottom` instead — one element states the
           whole rhythm now, so there is nothing left to arbitrate (`.wpg--tools` is retired). */
      >
      {/* ⚠️ THE WRAPPER JOINS THE HEIGHT CHAIN ONLY FOR THE DOSSIER. It sits between the grid's
          scroll row and the card, so without the modifier `.msv-doss`'s `flex: 1` has no flex
          parent and the row scrolls instead of the pane. The library keeps flowing. */}
      <div className={`msv-wrap${selected ? " msv-wrap--doss" : ""}`}>
        {ordered.length === 0 ? (
          /* ── zero-manuscript state: minimal, in the plate grammar ── */
          <div className="msv-panel">
            <div className="msv-empty">
              <div className="msv-qm">Your library is empty.</div>
              <span className="msv-lab">NO MANUSCRIPTS YET</span>
              <div>
                <button
                  type="button"
                  className="msv-btn"
                  onClick={() => onNavigate?.("manuscripts", "Add a manuscript")}
                >
                  <Plus />
                  Add manuscript
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/**
              * ⚠️ ONE SECTION HEADER, AND IT IS TRUE IN BOTH STATES. "Your shelf" introduces the
              * library whether you are browsing it or reading one book off it, so it renders above
              * the grid and above an open profile alike — the alternative was two headers saying
              * the same thing in two places, which is how they come to disagree.
              *
              * ⚠️ NO ACCENT UNDERLINE. Packages puts a burgundy tick on its band heads; this page
              * does not, by ruling — which is why `SectionHeader` takes the tick as a prop instead
              * of defaulting to one.
              *
              * ⚠️ AND `How it works` IS NOT RENDERED. The ref draws one beside the CTA; this page
              * has no explainer surface for it to open, and the house rule is that the shell
              * renders what EXISTS. A control that goes nowhere teaches the wrong shape of the app.
              */}
            <SectionHeader
              title="Your shelf"
              meta={shelfMeta(ordered.length, queries.length)}
              actions={
                <button
                  type="button"
                  className="msv-btn sm"
                  onClick={() => onNavigate?.("manuscripts", "Add a manuscript")}
                >
                  <Plus />
                  Add a manuscript
                </button>
              }
            />
            {/*
              ⚠️ THE GRID IS THE SWITCHER NOW. The shelf switcher that used to sit here is DELETED,
              not hidden: it existed to pick the one card's subject, and the library does that by
              being a library. Keeping both would have given the page two controls for one job.

              ⚠️ AND THE ADD TILE RENDERS AT EVERY COUNT, INCLUDING ONE. One card beside one dashed
              tile is the intended appearance — the old switcher's "absent below two manuscripts"
              rule was about a control that taught nothing at one, which is not true of a shelf.
            */}
            {!selected && (
              <div className="mlib-grid">
                {ordered.map((m) => {
                  const mq = queries.filter((q) => q.manuscriptId === m.id);
                  const mv = versions.filter((v) => v.manuscriptId === m.id);
                  return (
                    <ManuscriptLibraryCard
                      key={m.id}
                      title={m.title}
                      status={isShelvedPresentation(m) ? "Shelved" : m.status}
                      shelved={isShelvedPresentation(m)}
                      genres={msGenres(m)}
                      wordCount={m.wordCount}
                      logline={m.logline}
                      stats={plateStats(mq)}
                      meter={pitchMeter(pitchAssets(m, mv))}
                      onOpen={() => openDossier(m.id)}
                    />
                  );
                })}
                <ManuscriptAddTile onAdd={() => onNavigate?.("manuscripts", "Add a manuscript")} />
              </div>
            )}
          {selected ? (
            <ManuscriptDossier
              manuscript={selected}
              genres={msGenres(selected)}
              queries={msQueries}
              versions={msVersions}
              packages={msPackages}
              comps={msComps}
              /* The versions panel reads the log for its R&R links and its holder counts. */
              activities={activities}
              today={londonDay(new Date())}
              onSaveBookVersions={saveBookVersions}
              isPro={isProUser(currentUser)}
              scoutAvailable={scoutLive()}
              pitchAssets={msPitch}
              pitch={pitchLine(msComps)}
              pitchText={pitchLineText(msComps)}
              /* ⚠️ THE STORED FIELD, NOT THE SHELF'S DERIVED ASSET. `pitchAssets` resolves an
                 unwritten pitch to `null` through one `has()`; reading `elevatorPitch` straight
                 would treat `""` and an absent key as different things, which they are in the
                 model and are not to a reader. */
              elevatorPitch={msPitch.find((a) => a.key === "elevator")?.text ?? null}
              /* One naming helper, app-wide — a local format here would eventually disagree with
                 the Contact list about what an agent is called. */
              agentName={(id) => {
                const a = agents.find((x) => x.id === id);
                return a ? agentPrimary(a) : AGENT_NOT_RECORDED;
              }}
              synopsisVersionCount={msSynVersions.length}
              synopsisDate={msSynDate ? formatPlateDate(Date.parse(msSynDate)) : null}
              onSavePitch={savePitch}
              /*
               * ⚠️ EVERY INLINE PLATE EDIT IS QUIET, INCLUDING THE TITLE. The activity feed records
               * the query journey, not field maintenance — a writer correcting a typo in their own
               * title has not done something the feed should narrate.
               */
              plateEdit={{
                onTitle: (t) => void updateManuscriptQuiet(selected.id, { title: t }),
                onWordCount: (n) => void updateManuscriptQuiet(selected.id, { wordCount: n }),
                genre: {
                  ageCategory: selected.ageCategory,
                  ids: genreList(selected.genre, selected.subGenres),
                  personal: currentUser.personalGenres ?? [],
                  onCreatePersonal: addPersonalGenre,
                  onSave: (next) =>
                    void updateManuscriptQuiet(selected.id, {
                      ageCategory: next.ageCategory,
                      ...splitGenres(next.ids),
                    }),
                },
              }}
              now={Date.now()}
              currentYear={new Date().getFullYear()}
              tab={tab}
              onTabChange={setTab}
              onBack={closeDossier}
              onSendQuery={() => onNavigate?.("queries", "Send a query", { manuscriptId: selected.id })}
              onEditDetails={() => startEditMs(selected)}
              onShelveToggle={() => void toggleShelved(selected)}
              onDelete={() => setDeleteModalMs(selected)}
              /* Removal is the shared pure helper + the single writer; adding needs the form the
                 sub-page owns, so it goes there until the comps retirement moves it across. */
              onRemoveComp={(i) => { void updateManuscript(selected.id, { comps: withCompRemoved(msComps, i) }); }}
              onAddComp={() => {
                selectMs(selected.id);
                onNavigate?.("manuscripts", "Comparable titles");
              }}
              onCopyPitch={(text) => { void navigator.clipboard?.writeText(text); }}
              onOpenPlans={() => onNavigate?.("plans")}
              onOpenQueriesHub={() => onNavigate?.("queries")}
              /* ⚠️ NOTES, NOT TASKS, AND SCOPED EXACTLY. `manuscriptNotes` takes only the dateless
                 items whose `manuscriptId` IS this one — an unattached note is not a note about
                 this book, and a dated one is a task that belongs on the To-do list. */
              notes={manuscriptNotes(userTasks, selected.id)}
              /**
               * ⚠️ THE FIRST WRITER OF `manuscriptId` ON A DATELESS NOTE — not the first in the app.
               * The Query Centre's `Remind me later` already sets it (Queries.tsx), and it ALWAYS
               * sets `dueDate` alongside, so what it makes is a TASK. That is precisely why
               * `manuscriptNotes` filters on datelessness rather than on scope alone: without it,
               * every two-week nudge reminder a writer has ever set would appear on their
               * manuscript's Notes tab as though they had written it there.
               *
               * ⚠️ AND THE KEY IS ALLOWLISTED, CHECKED BEFORE WIRING. A field outside
               * firestore.rules' `hasOnly` list is denied in SILENCE — the affectedKeys gotcha.
               */
              onWriteNote={(text, detail) =>
                void addUserTask({ text, ...(detail ? { detail } : {}), manuscriptId: selected.id })}
              onOpenNoteboard={() => navigate("/todo/noteboard")}
              onOpenPackageBuilder={() => {
                selectMs(selected.id);
                onNavigate?.("manuscripts", "Submission packages");
              }}
            />
          ) : null}
          </>
        )}
      </div>
      </WorkspacePageGrid>


      {/* ── edit modal (comps field deliberately absent — managed on the shelf sub-page) ── */}
      <AnimatePresence>
        {editingMs && (
          <div className="fixed inset-0 bg-[#3a1c14]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-[#e8d5cc] rounded-2xl w-full max-w-[550px] p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <button
                type="button"
                onClick={() => setEditingMs(null)}
                className="absolute top-4 right-4 p-1 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-50 cursor-pointer transition-all border-0"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="border-b border-stone-100 pb-2 mb-4">
                <h3 className="font-serif text-lg font-bold text-[#3a1c14] text-left leading-none">Edit manuscript details</h3>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4 text-left">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1">Title</label>
                    <input
                      required
                      type="text"
                      value={editingMs.title}
                      onChange={(e) => setEditingMs({ ...editingMs, title: e.target.value })}
                      className="w-full text-xs p-2 bg-white rounded border border-[#e8d5cc] focus:ring-1 focus:ring-[#7c3a2a] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1">Genre</label>
                    <input
                      required
                      type="text"
                      value={editingMs.genre}
                      onChange={(e) => setEditingMs({ ...editingMs, genre: e.target.value })}
                      className="w-full text-xs p-2 bg-white rounded border border-[#e8d5cc] focus:ring-1 focus:ring-[#7c3a2a] outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1">Age Category</label>
                    <select
                      value={editingMs.ageCategory}
                      onChange={(e) => setEditingMs({ ...editingMs, ageCategory: e.target.value })}
                      className="w-full text-xs p-2 bg-white rounded border border-[#e8d5cc] outline-none focus:ring-1 focus:ring-[#7c3a2a]"
                    >
                      <option value="Adult">Adult</option>
                      <option value="Young Adult">Young Adult</option>
                      <option value="Middle Grade">Middle Grade</option>
                      <option value="New Adult">New Adult</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1">Word Count</label>
                    <input
                      type="number"
                      required
                      value={editingMs.wordCount}
                      onChange={(e) => setEditingMs({ ...editingMs, wordCount: Math.max(0, parseInt(e.target.value) || 0) })}
                      className="w-full text-xs p-2 bg-white rounded border border-[#e8d5cc] outline-none focus:ring-1 focus:ring-[#7c3a2a]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1">Status</label>
                    <select
                      value={editingMs.status}
                      onChange={(e) => setEditingMs({ ...editingMs, status: e.target.value as ManuscriptStatus })}
                      className="w-full text-xs p-2 bg-white rounded border border-[#e8d5cc] outline-none focus:ring-1 focus:ring-[#7c3a2a]"
                    >
                      <option value={ManuscriptStatus.DRAFTING}>Drafting</option>
                      <option value={ManuscriptStatus.REVISING}>Revising</option>
                      <option value={ManuscriptStatus.READY_TO_QUERY}>Ready to Query</option>
                      <option value={ManuscriptStatus.QUERYING}>Querying</option>
                      <option value={ManuscriptStatus.ON_SUBMISSION}>On Submission</option>
                      <option value={ManuscriptStatus.SHELVED}>Shelved</option>
                    </select>
                  </div>
                </div>

                {editingMs.status === ManuscriptStatus.SHELVED && (
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1">Shelved Reason</label>
                    <input
                      type="text"
                      value={editingMs.shelvedReason || ""}
                      onChange={(e) => setEditingMs({ ...editingMs, shelvedReason: e.target.value })}
                      placeholder="e.g. Resting until autumn while the voice sharpens..."
                      className="w-full text-xs p-2 bg-white rounded border border-[#e8d5cc] outline-none focus:ring-1 focus:ring-[#7c3a2a]"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1">Logline / Hook</label>
                  <textarea
                    required
                    value={editingMs.logline || ""}
                    onChange={(e) => setEditingMs({ ...editingMs, logline: e.target.value })}
                    placeholder="One or two sentences — the core hook."
                    className="w-full text-xs p-2 bg-white rounded border border-[#e8d5cc] outline-none focus:ring-1 focus:ring-[#7c3a2a] min-h-[60px]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1">Notes</label>
                  <textarea
                    value={editingMs.notes || ""}
                    onChange={(e) => setEditingMs({ ...editingMs, notes: e.target.value })}
                    placeholder="Premise, structure, anything worth keeping to hand..."
                    className="w-full text-xs p-2 bg-white rounded border border-[#e8d5cc] outline-none focus:ring-1 focus:ring-[#7c3a2a] min-h-[85px]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-stone-50">
                  <button
                    type="button"
                    onClick={() => setEditingMs(null)}
                    className="px-4 py-2 rounded-lg text-xs font-bold text-stone-500 hover:bg-stone-50 cursor-pointer bg-white border border-[#e8d5cc]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-[#7c3a2a] hover:bg-[#6c3224] transition-colors cursor-pointer border-0"
                  >
                    Save changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* success toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-55 bg-stone-900 border border-stone-800 text-[#F8F5F0] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.15)] p-4 flex items-center gap-3 select-none"
          >
            <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-white shrink-0">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
            <p className="text-xs font-bold leading-none">{toastMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* undo toast (shelve / reactivate) */}
      <AnimatePresence>
        {undoToast && (
          <motion.div
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[56] bg-stone-900 text-white rounded-lg py-3 px-5 text-xs font-medium shadow-lg flex items-center gap-3"
          >
            <span>{undoToast.msg}</span>
            <button onClick={undoToast.undo} className="text-[#e8c89a] underline font-mono text-[11px] cursor-pointer">Undo</button>
            <button onClick={() => setUndoToast(null)} title="Dismiss" aria-label="Dismiss" className="text-stone-400 hover:text-white cursor-pointer shrink-0"><X className="w-3.5 h-3.5" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6A hard-delete guard — type-to-confirm + the "Goes with it" manifest (cascade.ts, one
          source with the delete plan). Light mode when nothing depends on the manuscript. */}
      {deleteModalMs && (() => {
        const m = deleteModalMs;
        const manifest = destroyManifest("manuscript", m.id, { queries, activities, taskFlags, versions, packages });
        const light = manifest.queries === 0 && manifest.packages === 0 && manifest.versions === 0 && manifest.activityRecords === 0;
        return (
          <ConfirmDestroy
            kind="manuscript"
            name={m.title}
            manifest={manifest}
            light={light}
            onConfirm={() => confirmDestroyMs(m)}
            onCancel={() => setDeleteModalMs(null)}
          />
        );
      })()}
    </div>
  );
};
