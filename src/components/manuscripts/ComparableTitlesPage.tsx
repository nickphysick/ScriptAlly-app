/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comparable titles v25 (12 Oct; refs design-refs/materials/comps-v25.html and
 * design-refs/comps-v25/*.png). Route /manuscripts/comps.
 *
 * Comps are TRACKED: a comp has a stable id, a query letter records the comps it mentions, and every
 * query is traced to its letter, so each comp knows which queries it went out with (lib/compUsage).
 * The page is the Query Centre v137 dress: the navy title panel, an "At a glance" strip that filters
 * the list, the how-it-works band, then the library (a heading and the list). A row opens a
 * right-hand drawer; "Log comps in a letter" opens the picker; the list can go full screen.
 *
 * ⚠️ STORE FACTS. The order is array position; every figure is derived at render. Every comp write
 * goes through `normalizeComp` and `withCompIds`, so optional fields stay omit-empty and every comp
 * the page writes carries a stable id.
 *
 * ⚠️ NO WRITE FAILS SILENTLY. Each comp write shows its change at once, awaits the store, and on a
 * refusal puts the list back and says so (`lib/compsWrite.ts`).
 *
 * ⚠️ SCOPE IS THE SIDEBAR SWITCHER'S, READ EVERY RENDER, never latched in state.
 */
import { SHORTCUTS, isEditableTarget, matchesShortcut } from "../../lib/shortcuts";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { deleteField } from "firebase/firestore";
import { useScriptAllyDb } from "../../lib/db";
import { CompTitle, ManuscriptVersion } from "../../types";
import { PanelHeader } from "../shell/PanelHeader";
import { WorkspacePageGrid } from "../shell/WorkspacePageGrid";
import { AppFooter } from "../shell/AppFooter";
import { useFullScreenList } from "../shell/useFullScreenList";
import { isShelvedPresentation } from "../../lib/manuscriptPage";
import { CompDraft, MAX_COMPS, manuscriptComps, normalizeComp, withCompAdded, withCompEdited, withCompRemoved } from "../../lib/comps";
import { currentYear } from "../../lib/compsPage";
import { SAVE_FAILED, runWrite } from "../../lib/compsWrite";
import { compKey, currentLetter, ready, usageModel, withCompIds } from "../../lib/compUsage";
import {
  CompFilter, GroupBy, SortKey, SortState, buildRows, filterCounts, glance, groupRows, letterShort, libraryPills, nextSort, sortRows, visibleRows,
} from "../../lib/compsLibrary";
import { nextVersionName } from "../../lib/versionLock";
import { escapeDepth } from "../../lib/escapeStack";
import { useToast } from "../toast/ToastProvider";
import { useCompsHold } from "../../lib/compsLoadHold";
import { CompsExhibit } from "./CompsEmpty";
import { CompsStrip } from "./comps25/CompsStrip";
import { CompsHow } from "./comps25/CompsHow";
import { CompsLibrary } from "./comps25/CompsLibrary";
import { CompDrawer, DrawerState } from "./comps25/CompDrawer";
import { CompLetterPicker, PickerRequest } from "./comps25/CompLetterPicker";
import { CompsScout } from "./comps25/CompsScout";
import "./compsV2.css";
import "./comps25/compsV25.css";

/** Shared with the sidebar's switcher and the packages page — the section's one active-manuscript key. */
const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";
export const COMPS_ROUTE = "/manuscripts/comps";
/** The device remembers a full-screen list (Part F). */
export const COMPS_FULL_KEY = "sa.compsFull";
/** The empty state's heading. */
export const COMPS_EMPTY_HEADING = "No comp titles yet";
export const COMPS_TITLE = "Every comp, and where it went";
/** The header's drawing: the file is the disc (520×470), so it takes no white disc of its own. */
export const COMPS_HEADER_ART = { src: "/images/comps/comps-header-disc.webp", version: "1fa669c9", width: 520, height: 470 } as const;

/** Not letter-ready: a book with no publisher, or anything with no year. */
export const compMissingDetails = (c: CompTitle): boolean => !ready(c);

export const ComparableTitlesPage: React.FC<{
  onNavigate?: (tab: string, subPageName?: string, opts?: { manuscriptId?: string }) => void;
}> = ({ onNavigate }) => {
  const { currentUser, manuscripts, versions, packages, queries, activities, agents, updateManuscript, updateVersion, addVersion, deleteVersion, collectionsReady } = useScriptAllyDb();
  const { showToast } = useToast();
  const location = useLocation();
  const routeActive = location.pathname === COMPS_ROUTE;

  /* ⚠️ EVERY HOOK ABOVE THE FIRST EARLY RETURN. */
  const [filter, setFilter] = useState<CompFilter | null>(null);
  const [find, setFind] = useState("");
  const [sort, setSort] = useState<SortState | null>(null);
  const [group, setGroup] = useState<GroupBy>("none");
  const [drawer, setDrawer] = useState<DrawerState | null>(null);
  const [picker, setPicker] = useState<PickerRequest | null>(null);
  /** the optimistic list while a write is in flight */
  const [pending, setPending] = useState<{ msId: string; comps: CompTitle[] } | null>(null);
  const seq = useRef(0);
  const compsRef = useRef<CompTitle[]>([]);
  const pageRef = useRef<HTMLDivElement | null>(null);
  const findRef = useRef<HTMLInputElement | null>(null);
  const libHeadRef = useRef<HTMLDivElement | null>(null);
  const primaryRef = useRef<HTMLButtonElement | null>(null);
  const busyRef = useRef(false);

  /* a dev-only review aid, gated HERE on the build mode so production never carries the module */
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const held = import.meta.env.MODE !== "production" ? useCompsHold() : false;

  const scroller = useCallback(() => pageRef.current?.closest<HTMLElement>(".wpg-scroll") ?? null, []);
  const fs = useFullScreenList({ storageKey: COMPS_FULL_KEY, routeActive, scroller });

  const selectedMsId = typeof window === "undefined" ? null : localStorage.getItem(ACTIVE_MS_KEY);
  const ordered = [...manuscripts].sort((a, b) => Number(isShelvedPresentation(a)) - Number(isShelvedPresentation(b)));
  const activeMs = manuscripts.find((m) => m.id === selectedMsId) ?? ordered[0] ?? null;
  const stored = activeMs ? manuscriptComps(activeMs) : [];
  const comps = pending && activeMs && pending.msId === activeMs.id ? pending.comps : stored;
  compsRef.current = comps;
  const full = comps.length >= MAX_COMPS;

  /* ── everything the page shows, derived ── */
  const shown = useMemo(() => (activeMs ? { ...activeMs, comps } : null), [activeMs, comps]);
  const model = useMemo(
    () => (shown ? usageModel(shown, versions, packages, queries, activities) : null),
    [shown, versions, packages, queries, activities],
  );
  const letters = useMemo(() => (model?.letters ?? []) as ManuscriptVersion[], [model]);
  const rows = useMemo(() => (model && shown ? buildRows({
    comps, usage: model.usage, letters, packages: packages.filter((p) => p.manuscriptId === shown.id),
    queries, agents, asked: model.asked, letterOfQuery: model.letterOfQuery,
  }) : []), [model, shown, comps, letters, packages, queries, agents]);
  const view = useMemo(() => sortRows(visibleRows(rows, filter, find), sort), [rows, filter, find, sort]);
  const bands = useMemo(() => groupRows(view, group, letters, model?.sentByLetter ?? new Map()), [view, group, letters, model]);
  const g = useMemo(() => glance(rows, model?.attachment ?? { sent: 0, logged: 0, rate: null, bars: [] }), [rows, model]);
  const counts = useMemo(() => filterCounts(rows), [rows]);
  const pills = libraryPills(rows, model?.unrecorded ?? []);
  const nowLetter = activeMs ? currentLetter(activeMs.id, versions) : null;
  const openRow = drawer && drawer.mode !== "add" ? rows.find((r) => r.key === drawer.key) ?? null : null;

  const openAdd = useCallback(() => {
    if (compsRef.current.length >= MAX_COMPS) return;
    setPicker(null);
    setDrawer({ mode: "add" });
  }, []);
  const openAddRef = useRef(openAdd);
  openAddRef.current = openAdd;
  const fsRef = useRef(fs);
  fsRef.current = fs;
  const overlayRef = useRef(false);
  overlayRef.current = !!drawer || !!picker;

  /* the page's keys: N adds, / finds, F is full screen. Never in a field, never over the drawer or
     the picker, and only when THIS page is the one on screen (every workspace page stays mounted). */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const add = matchesShortcut(SHORTCUTS.compAdd, e), look = matchesShortcut(SHORTCUTS.compsFind, e), big = matchesShortcut(SHORTCUTS.compsFull, e);
      if (!add && !look && !big) return;
      if (isEditableTarget(e.target) || overlayRef.current) return;
      if (!pageRef.current || pageRef.current.getBoundingClientRect().height === 0) return;
      /* anything else open over the page (a menu, another surface's drawer) keeps the key */
      if (escapeDepth() > (fsRef.current.full ? 1 : 0)) return;
      e.preventDefault();
      if (add) openAddRef.current();
      else if (look) findRef.current?.focus();
      else fsRef.current.toggle();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  if (!currentUser) return null;

  // ── writes ──
  /** Show `next` now, write it, and on a refusal put the list back and say so. Never rejects. */
  const commit = async (next: CompTitle[]): Promise<boolean> => {
    if (!activeMs) return false;
    const msId = activeMs.id;
    const mine = ++seq.current;
    /* every comp the page writes carries a stable id; one that has an id keeps it (CV25 A1) */
    const clean = withCompIds(next.map(normalizeComp));
    setPending({ msId, comps: clean });
    compsRef.current = clean;
    const ok = await runWrite(
      () => updateManuscript(msId, { comps: clean }),
      () => showToast({ message: SAVE_FAILED }),
    );
    if (seq.current === mine) setPending(null);
    return ok;
  };

  const indexOfKey = (key: string): number => compsRef.current.findIndex((c, i) => compKey(c, i) === key);

  /** `again` ("Add and add another") keeps the drawer open on a cleared form; a plain add closes it. */
  const add = (draft: CompDraft, o: { again: boolean } = { again: false }) => {
    const [comp] = withCompIds([normalizeComp({ ...draft, source: "user" })]);
    const next = withCompAdded(compsRef.current, comp);
    void commit(next);
    if (!o.again) setDrawer(null);
    showToast({
      message: `Added ${comp.title} to your library.`,
      undo: async () => {
        const at = compsRef.current.findIndex((c) => c.id === comp.id);
        if (at >= 0) { setDrawer((d) => (d && d.mode !== "add" && d.key === comp.id ? null : d)); await commit(withCompRemoved(compsRef.current, at)); }
      },
    });
  };

  const save = (key: string, draft: CompDraft) => {
    const index = indexOfKey(key);
    if (index < 0) return;
    const before = compsRef.current[index];
    const next = withCompIds(withCompEdited(compsRef.current, index, draft));
    void commit(next);
    setDrawer({ mode: "view", key: next[index].id! });
    showToast({
      message: `Saved ${draft.title}.`,
      undo: async () => { await commit(compsRef.current.map((c, i) => (i === index ? { ...before, id: next[index].id } : c))); },
    });
  };

  const remove = (key: string) => {
    const index = indexOfKey(key);
    if (index < 0) return;
    const gone = compsRef.current[index];
    setDrawer(null);
    void commit(withCompRemoved(compsRef.current, index));
    showToast({
      message: `Removed ${gone.title}.`,
      /* ⚠️ RESTORED AT ITS ORIGINAL INDEX, never appended: position is the writer's own order */
      undo: async () => {
        const back = [...compsRef.current];
        back.splice(Math.min(index, back.length), 0, gone);
        await commit(back);
      },
    });
  };

  /** Write the ticked comps to ONE letter. A comp with no id yet is given one first. */
  const saveLetter = async (letterId: string, keys: string[]) => {
    if (busyRef.current) return;
    const letter = letters.find((l) => l.id === letterId);
    if (!letter) return;
    busyRef.current = true;
    try {
      const cur = compsRef.current;
      const at = keys.map((k) => cur.findIndex((c, i) => compKey(c, i) === k)).filter((i) => i >= 0);
      let withIds = cur;
      if (at.some((i) => !cur[i].id)) {
        withIds = withCompIds(cur.map(normalizeComp));
        if (!(await commit(withIds))) return;
      }
      const ids = at.map((i) => withIds[i].id!).filter(Boolean);
      const had = Array.isArray(letter.compIds) ? [...letter.compIds] : null;
      const err = await updateVersion(letterId, { compIds: ids });
      if (err) { showToast({ message: err }); return; }
      setPicker(null);
      showToast({
        message: `Logged ${ids.length} ${ids.length === 1 ? "comp" : "comps"} for ${letterShort(letter.versionName)}.`,
        /* the version document's record, put back exactly as it was: its list, or no list at all */
        undo: async () => { await updateVersion(letterId, { compIds: had ?? deleteField() }, { restoring: true }); },
      });
    } finally {
      busyRef.current = false;
    }
  };

  /** A fixed letter cannot change; this makes its next version, with the same comps, through the app's own create path. */
  const newVersion = async (letterId: string) => {
    if (busyRef.current || !activeMs) return;
    const src = versions.find((v) => v.id === letterId);
    if (!src) return;
    busyRef.current = true;
    try {
      const name = nextVersionName(src.versionName, letters.map((l) => l.versionName));
      const copy: Record<string, unknown> = {
        manuscriptId: src.manuscriptId, componentType: src.componentType, versionName: name, fileAttached: false,
        compIds: [...(src.compIds ?? [])],
      };
      for (const k of ["contentType", "contentDraft", "contentLink", "fileName", "wordCount", "notes", "bookVersionId"] as const) {
        if (src[k] !== undefined && src[k] !== null && src[k] !== "") copy[k] = src[k];
      }
      const id = await addVersion(copy as Parameters<typeof addVersion>[0]);
      if (!id) { showToast({ message: SAVE_FAILED }); return; }
      setPicker({ letterId: id });
      showToast({ message: `Made ${name}.`, undo: async () => { setPicker(null); await deleteVersion(id); } });
    } finally {
      busyRef.current = false;
    }
  };

  // ── render ──
  const loading = !collectionsReady || held;
  const now = currentYear();
  /* the empty state: a manuscript, loaded, with no comps */
  const exhibit = !loading && !!activeMs && comps.length === 0;
  const listed = loading || (!!activeMs && comps.length > 0);
  const pickFilter = (f: CompFilter | null) => { setFilter(f); if (f === null) setFind(""); };
  const seeAll = () => libHeadRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const header = (
    <PanelHeader
      kind="title" className="cv-panel" attrs={{ "data-cv": "panel", "data-own-header": "" }}
      title={<span aria-label={COMPS_TITLE}><span aria-hidden="true">Every comp,<br />and where it went</span></span>}
      sub={activeMs || loading
        ? <span data-cv="panel-sub">Log the comps each letter names, and see which agents saw them{activeMs ? <>, for <i className="cv-ms" data-cv="panel-ms">{activeMs.title}</i></> : null}.</span>
        : <span data-cv="panel-sub">Add a manuscript to build its comp list.</span>}
      loading={loading}
      primary={activeMs || loading ? { label: full ? "This list is full" : "+ Add a comp", onClick: openAdd, disabled: full || loading, btnRef: primaryRef, attrs: { "data-cv": "add" } } : undefined}
      secondary={listed ? { label: "See all comps", onClick: seeAll, attrs: { "data-cv": "see-all" } } : undefined}
      art={<img data-cv="panel-art" alt="" src={`${COMPS_HEADER_ART.src}?v=${COMPS_HEADER_ART.version}`} width={COMPS_HEADER_ART.width} height={COMPS_HEADER_ART.height} />}
    />
  );

  return (
    <WorkspacePageGrid scrollLabel="Comparable titles" masthead={null}>
      <div className={`cpv-page cv-page${fs.full && listed ? " is-full" : ""}`} data-cpv="page" data-cv="page" data-full={fs.full && listed ? "true" : "false"} ref={pageRef}>
        <div className="cv-group" data-cv="group">
          {header}
          {listed ? (
            <>
              <CompsStrip g={g} rows={rows} filter={filter} loading={loading} onFilter={pickFilter} />
              <CompsHow onPick={() => setPicker({ letterId: null })} />
              <CompsLibrary
                loading={loading} total={rows.length} rows={view} bands={bands} counts={counts}
                filter={filter} find={find} sort={sort} group={group} full={fs.full}
                rate={model?.attachment.rate ?? null} unrecorded={model?.unrecorded ?? []} needs={pills.needs}
                openKey={drawer && drawer.mode !== "add" ? drawer.key : null}
                findRef={findRef} headRef={libHeadRef}
                onFilter={pickFilter} onFind={setFind} onClear={() => { setFilter(null); setFind(""); }}
                onSort={(k: SortKey) => setSort((s) => nextSort(s, k))} onGroup={setGroup} onFull={fs.toggle}
                onOpen={(key) => setDrawer({ mode: "view", key })}
                onEdit={(key) => setDrawer({ mode: "edit", key })}
                onPick={(letterId, forKey) => { setDrawer(null); setPicker({ letterId, forKey }); }}
              />
              <AppFooter onNavigate={(t, sub) => onNavigate?.(t, sub)} />
            </>
          ) : exhibit ? (
            <div className="cv-empty" data-cv="empty">
              <p className="cv-emptyh" data-cv="empty-heading">{COMPS_EMPTY_HEADING}</p>
              <CompsExhibit msTitle={activeMs!.title} now={now} />
            </div>
          ) : (
            <p className="cv-hintline" data-cv="no-ms">No manuscript to compare yet.</p>
          )}
        </div>
      </div>

      {activeMs && (
        <>
          <CompDrawer
            state={routeActive ? drawer : null} row={openRow} comps={comps}
            removeBlocked={openRow && openRow.where === "sent" ? "It went out in a letter, so it stays on your shelf." : null}
            letterShortOf={(id) => { const l = letters.find((x) => x.id === id); return l ? letterShort(l.versionName) : ""; }}
            onClose={() => setDrawer(null)}
            onEdit={(focusNote) => openRow && setDrawer({ mode: "edit", key: openRow.key, focusNote })}
            onBackToView={() => openRow && setDrawer({ mode: "view", key: openRow.key })}
            onPick={() => { if (openRow) { const key = openRow.key; setDrawer(null); setPicker({ letterId: null, forKey: key }); } }}
            onSave={(d) => openRow && save(openRow.key, d)}
            onAdd={add}
            onRemove={() => openRow && remove(openRow.key)}
            onShowExisting={(index) => { const c = comps[index]; if (c) setDrawer({ mode: "view", key: compKey(c, index) }); }}
          />
          <CompLetterPicker
            request={routeActive ? picker : null} letters={letters} currentLetterId={nowLetter?.id ?? null} comps={comps}
            sentByLetter={model?.sentByLetter ?? new Map()}
            onClose={() => setPicker(null)}
            onSave={(letterId, keys) => void saveLetter(letterId, keys)}
            onNewVersion={(letterId) => void newVersion(letterId)}
            onOpenPackages={() => { setPicker(null); onNavigate?.("manuscripts", "Submission packages"); }}
          />
          <CompsScout msTitle={activeMs.title} routeActive={routeActive} hidden={!!drawer || !!picker || fs.full} />
        </>
      )}
    </WorkspacePageGrid>
  );
};
