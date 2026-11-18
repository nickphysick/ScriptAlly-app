/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comparable titles v32 (17 Nov; refs design-refs/comps-v32/), a restyle and re-layout of v30 (7 Nov). Route
 * /manuscripts/comps.
 *
 * Comps are TRACKED: a comp has a stable id, a query letter records the comps it mentions, and every query is traced
 * to its letter, so each comp knows which queries it went out with (lib/compUsage).
 * The page (v32): the shared navy header (the current letter's comps on its right), the striped band for a sent letter
 * whose comps were never chosen, "Your shelf" and the open comp side by side, the podium, and the Comp-pendium closed
 * by the Scout strip. With no comps: the navy header and the "How it works" card. A shelf row, a podium step or a
 * Comp-pendium row opens that comp in the card beside the shelf; adding and editing stay in the drawer; the band and
 * "Add to a letter" open the picker. v30's detail drawer, letter cards, Cards / List switch and Scout section are
 * retired (tests/e2e/RETIRED-comps-v32.md).
 *
 * ⚠️ STORE FACTS. The order is array position; every figure is derived at render. Every comp write
 * goes through `normalizeComp` and `withCompIds`, so optional fields stay omit-empty and every comp
 * the page writes carries a stable id.
 *
 * ⚠️ NO WRITE FAILS SILENTLY. Each comp write shows its change at once, awaits the store, and on a
 * refusal puts the list back and says so (`lib/compsWrite.ts`).
 *
 * ⚠️ SCOPE IS THE SIDEBAR SWITCHER'S, READ EVERY RENDER, never latched in state.
 * ⚠️ THE CURRENT LETTER IS `inUseLetter` (lib/queryLetters), the Letters page's "In use for new queries".
 */
import { SHORTCUTS, isEditableTarget, matchesShortcut } from "../../lib/shortcuts";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { deleteField } from "firebase/firestore";
import { useScriptAllyDb } from "../../lib/db";
import { CompTitle, ManuscriptVersion } from "../../types";
import { WorkspacePageGrid } from "../shell/WorkspacePageGrid";
import { AppFooter } from "../shell/AppFooter";
import { isShelvedPresentation } from "../../lib/manuscriptPage";
import { CompDraft, MAX_COMPS, manuscriptComps, normalizeComp, withCompAdded, withCompEdited, withCompRemoved } from "../../lib/comps";
import { currentYear } from "../../lib/compsPage";
import { SAVE_FAILED, runWrite } from "../../lib/compsWrite";
import { MAX_LETTER_COMPS, averageAsked, compKey, compsInLetter, letterRate, usageModel, withCompIds } from "../../lib/compUsage";
import { buildRows } from "../../lib/compsLibrary";
import {
  NO_FILTER, andList, filterShelf, noticeOf, pendiumNote, pendiumOrder, podiumOf, sortShelf, whereCounts,
  type ShelfFilter, type ShelfSort,
} from "../../lib/compsShelf";
import { inUseLetter } from "../../lib/queryLetters";
import { queriesForIds } from "../../lib/queriesFilterParam";
import { nextVersionName } from "../../lib/versionLock";
import { escapeDepth } from "../../lib/escapeStack";
import { useToast } from "../toast/ToastProvider";
import { useCompsHold } from "../../lib/compsLoadHold";
import { CompDrawer, DrawerState } from "./comps25/CompDrawer";
import { CompLetterPicker, PickerRequest } from "./comps25/CompLetterPicker";
import { CompsExplainDialog } from "./comps28/CompsExplainDialog";
import { openerOf, refocus } from "./comps28/refocus";
import { CompsHowPop30 } from "./comps30/CompsHow30";
import { CompsTop32, type TopState32 } from "./comps32/CompsTop32";
import { CompsBand32 } from "./comps32/CompsBand32";
import { CompsDeskSkeleton32, CompsOpen32, CompsShelf32, type OpenLetter, type OpenView } from "./comps32/CompsDesk32";
import { CompsPodium32 } from "./comps32/CompsPodium32";
import { CompsFirst32, CompsPendium32 } from "./comps32/CompsPendium32";
import "./compsV2.css";
import "./comps25/compsV25.css";
import "./comps28/comps28.css";
import "./comps30/comps30.css";
import "./comps32/comps32.css";

/** Shared with the sidebar's switcher and the packages page — the section's one active-manuscript key. */
const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";
export const COMPS_ROUTE = "/manuscripts/comps";

export const ComparableTitlesPage: React.FC<{
  onNavigate?: (tab: string, subPageName?: string, opts?: { manuscriptId?: string }) => void;
}> = ({ onNavigate }) => {
  const { currentUser, manuscripts, versions, packages, queries, activities, agents, updateManuscript, updateVersion, addVersion, deleteVersion, collectionsReady, updateUserPaths } = useScriptAllyDb();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const routeActive = location.pathname === COMPS_ROUTE;

  /* ⚠️ EVERY HOOK ABOVE THE FIRST EARLY RETURN. */
  const [filter, setFilter] = useState<ShelfFilter>(NO_FILTER);
  const [sort, setSort] = useState<ShelfSort>("own");
  /** v32: the comp open in the card beside the shelf (null: the first in the shown order) */
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [openView, setOpenView] = useState<OpenView>("letters");
  const [drawer, setDrawer] = useState<DrawerState | null>(null);
  const [picker, setPicker] = useState<PickerRequest | null>(null);
  /** the "How it works" pop-up, from the header */
  const [how, setHow] = useState(false);
  /** comps v28: the "What makes a good comp?" pop-up, from the empty header */
  const [explain, setExplain] = useState(false);
  /** the optimistic list while a write is in flight */
  const [pending, setPending] = useState<{ msId: string; comps: CompTitle[] } | null>(null);
  const seq = useRef(0);
  const compsRef = useRef<CompTitle[]>([]);
  const pageRef = useRef<HTMLDivElement | null>(null);
  const findRef = useRef<HTMLInputElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const primaryRef = useRef<HTMLButtonElement | null>(null);
  const busyRef = useRef(false);
  /** a row to focus once the page has repainted (a podium step or a Comp-pendium row opened it) */
  const focusRow = useRef<string | null>(null);

  /* a dev-only review aid, gated HERE on the build mode so production never carries the module */
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const held = import.meta.env.MODE !== "production" ? useCompsHold() : false;

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
  const view = useMemo(() => sortShelf(filterShelf(rows, filter), sort), [rows, filter, sort]);
  const counts = useMemo(() => whereCounts(rows), [rows]);
  const nowLetter = useMemo(() => inUseLetter(activeMs, versions, packages), [activeMs, versions, packages]);
  const currentKeys = useMemo(() => {
    const ids = new Set(compsInLetter(comps, nowLetter).map((c) => c.id));
    return new Set(comps.flatMap((c, i) => (c.id && ids.has(c.id) ? [compKey(c, i)] : [])));
  }, [comps, nowLetter]);
  const now = currentYear();
  const notice = noticeOf(model?.unrecorded ?? []);
  const places = useMemo(() => podiumOf(rows), [rows]);
  const book = useMemo(() => pendiumOrder(rows), [rows]);
  const note = useMemo(() => {
    if (!model || !activeMs) return null;
    return pendiumNote(letters, (id) => letterRate(model, id), averageAsked(activeMs, queries, activities).sent);
  }, [model, activeMs, letters, queries, activities]);
  /* the open comp: the one chosen, else the first in the shown order */
  const openRow = rows.find((r) => r.key === openKey) ?? rows.find((r) => r.key === view[0]?.key) ?? rows[0] ?? null;
  const editRow = drawer && drawer.mode === "edit" ? rows.find((r) => r.key === drawer.key) ?? null : null;

  const openAdd = useCallback(() => {
    if (compsRef.current.length >= MAX_COMPS) return;
    setPicker(null);
    setDrawer({ mode: "add" });
  }, []);
  /* ⚠️ FOCUS GOES BACK WHERE IT CAME FROM (comps v28 §E): the control focused when the FIRST layer opened takes focus
     again when the LAST one closes; a re-rendered opener is found by its `data-cx-key` (comps28/refocus). */
  const openerRef = useRef<HTMLElement | null>(null);
  const anyLayer = !!drawer || !!picker || how || explain;
  const hadLayer = useRef(false);
  useEffect(() => {
    if (anyLayer && !hadLayer.current) openerRef.current = openerOf();
    if (!anyLayer && hadLayer.current) { const el = openerRef.current; openerRef.current = null; refocus(el); }
    hadLayer.current = anyLayer;
  }, [anyLayer]);
  const openAddRef = useRef(openAdd);
  openAddRef.current = openAdd;
  const overlayRef = useRef(false);
  overlayRef.current = anyLayer;

  /* the page's keys: N adds, / finds. Never in a field, never over a layer, and only when THIS page is the
     one on screen (every workspace page stays mounted). */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const add = matchesShortcut(SHORTCUTS.compAdd, e), look = matchesShortcut(SHORTCUTS.compsFind, e);
      if (!add && !look) return;
      if (isEditableTarget(e.target) || overlayRef.current) return;
      if (!pageRef.current || pageRef.current.getBoundingClientRect().height === 0) return;
      if (escapeDepth() > 0) return;
      if (compsRef.current.length === 0) return;
      e.preventDefault();
      if (add) openAddRef.current();
      else findRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  /* a podium step or a Comp-pendium row opened a comp: its shelf row takes focus once it is painted */
  useEffect(() => {
    const k = focusRow.current;
    if (!k) return;
    focusRow.current = null;
    pageRef.current?.querySelector<HTMLElement>(`[data-cp="row"][data-key="${CSS.escape(k)}"]`)?.focus({ preventScroll: true });
  });

  if (!currentUser) return null;

  // ── writes ──
  /** Show `next` now, write it, and on a refusal put the list back and say so. Never rejects. */
  const commit = async (next: CompTitle[]): Promise<boolean> => {
    if (!activeMs) return false;
    const msId = activeMs.id;
    const mine = ++seq.current;
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

  /** `again` ("Add and add another") keeps the drawer open on a cleared form; a plain add closes it and opens the comp. */
  const add = (draft: CompDraft, o: { again: boolean } = { again: false }) => {
    const [comp] = withCompIds([normalizeComp({ ...draft, source: "user" })]);
    const next = withCompAdded(compsRef.current, comp);
    void commit(next);
    if (!o.again) { setDrawer(null); setFilter(NO_FILTER); setOpenKey(comp.id!); }
    showToast({
      message: `Added ${comp.title}.`,
      undo: async () => {
        const at = compsRef.current.findIndex((c) => c.id === comp.id);
        if (at >= 0) await commit(withCompRemoved(compsRef.current, at));
      },
    });
  };

  const save = (key: string, draft: CompDraft) => {
    const index = indexOfKey(key);
    if (index < 0) return;
    const before = compsRef.current[index];
    const next = withCompIds(withCompEdited(compsRef.current, index, draft));
    void commit(next);
    setDrawer(null);
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

  /** Give every comp an id before a letter records it; false when that write was refused. */
  const ensureIds = async (): Promise<CompTitle[] | null> => {
    const cur = compsRef.current;
    if (cur.every((c) => c.id)) return cur;
    const withIds = withCompIds(cur.map(normalizeComp));
    return (await commit(withIds)) ? withIds : null;
  };
  /** the page repaints with the new record BEFORE the picker closes, so the focus it gives back finds the opener */
  const twoFrames = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

  /** Write the ticked comps to ONE letter. A comp with no id yet is given one first. */
  const saveLetter = async (letterId: string, keys: string[]) => {
    if (busyRef.current) return;
    const letter = letters.find((l) => l.id === letterId);
    if (!letter) return;
    busyRef.current = true;
    try {
      const cur = compsRef.current;
      const at = keys.map((k) => cur.findIndex((c, i) => compKey(c, i) === k)).filter((i) => i >= 0);
      const withIds = await ensureIds();
      if (!withIds) return;
      const ids = at.map((i) => withIds[i].id!).filter(Boolean);
      const had = Array.isArray(letter.compIds) ? [...letter.compIds] : null;
      const sent = model?.sentByLetter.get(letterId) ?? 0;
      const err = await updateVersion(letterId, { compIds: ids });
      if (err) { showToast({ message: err }); return; }
      await twoFrames();
      setPicker(null);
      const titles = ids.map((id) => withIds.find((c) => c.id === id)?.title ?? "").filter(Boolean);
      showToast({
        message: had === null && sent > 0
          ? (ids.length ? `Saved. ${sent} ${sent === 1 ? "query" : "queries"} added to ${andList(titles)}.` : `Saved. ${letter.versionName} didn’t mention any comps.`)
          : `Saved ${letter.versionName}.`,
        /* the version document's record, put back exactly as it was: its list, or no list at all */
        undo: async () => { await updateVersion(letterId, { compIds: had ?? deleteField() }, { restoring: true }); },
      });
    } finally {
      busyRef.current = false;
    }
  };

  /** "Add to a letter": put ONE comp into, or take it out of, each unsent letter, as ticked. Sent letters never change. */
  const saveForComp = async (key: string, letterIds: string[]) => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const at = indexOfKey(key);
      const withIds = await ensureIds();
      if (!withIds || at < 0) return;
      const id = withIds[at].id!;
      const want = new Set(letterIds);
      const changes: { letterId: string; had: string[] | null; next: string[] }[] = [];
      for (const l of letters) {
        if ((model?.sentByLetter.get(l.id) ?? 0) > 0) continue;
        const had = Array.isArray(l.compIds) ? [...l.compIds] : null;
        const has = !!had?.includes(id);
        if (want.has(l.id) && !has && (had?.length ?? 0) < MAX_LETTER_COMPS) changes.push({ letterId: l.id, had, next: [...(had ?? []), id] });
        if (!want.has(l.id) && has) changes.push({ letterId: l.id, had, next: had!.filter((x) => x !== id) });
      }
      const done: typeof changes = [];
      for (const c of changes) {
        const err = await updateVersion(c.letterId, { compIds: c.next });
        if (err) { showToast({ message: err }); break; }
        done.push(c);
      }
      await twoFrames();
      setPicker(null);
      if (!done.length) return;
      showToast({
        message: "Saved.",
        undo: async () => { for (const c of done) await updateVersion(c.letterId, { compIds: c.had ?? deleteField() }, { restoring: true }); },
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
  /* ⚠️ THREE STATES, AND LOADING IS NEITHER OF THE OTHER TWO: an account with comps must never be shown the empty page
     first. The state is the comp count and nothing else, so the first save and the last remove switch it with no reload. */
  const isEmpty = comps.length === 0;
  const empty = !loading && !!activeMs && isEmpty;
  const listed = !loading && !!activeMs && !isEmpty;
  const openPicker = (letterId: string | null, forKey?: string) => { setDrawer(null); setHow(false); setPicker({ letterId, forKey }); };
  /** open a comp from the podium or the Comp-pendium: clear the shelf's filter, open it, bring the cards up */
  const openFromBelow = (key: string) => {
    setFilter(NO_FILTER);
    setOpenKey(key);
    focusRow.current = key;
    gridRef.current?.scrollIntoView({ behavior: "auto", block: "start" });
  };
  /* v30 §D, kept: one leaf, read back from the user document, so it survives a reload */
  const scoutAsked = !!currentUser.notifyPrefs?.comps;
  const toggleScout = () => {
    const was = scoutAsked;
    void updateUserPaths({ "notifyPrefs.comps": !was });
    showToast({
      message: was ? "Okay, we won’t let you know." : "We’ll let you know when the Scout is ready.",
      undo: async () => { await updateUserPaths({ "notifyPrefs.comps": was }); },
    });
  };
  const letterById = new Map(letters.map((l) => [l.id, l]));
  const openLetters: OpenLetter[] = openRow ? openRow.letters.map((l) => {
    const v = letterById.get(l.id);
    return {
      id: l.id, name: l.name, sent: l.sent,
      others: compsInLetter(comps, v).filter((c) => c.id !== openRow.comp.id).map((c) => c.title),
      rate: model ? letterRate(model, l.id) : { asked: 0, sent: 0, pct: null },
    };
  }) : [];
  const sentIn = (key: string): string => {
    const r = rows.find((x) => x.key === key);
    const s = r ? r.letters.filter((l) => l.sent) : [];
    return s.length === 1 ? `Sent in ${s[0].name}` : `Sent in ${s.length} letters`;
  };
  const top: TopState32 = loading ? { kind: "loading" }
    : !activeMs ? { kind: "nobook" }
      : isEmpty ? { kind: "empty", book: activeMs.title }
        : {
          kind: "listed", book: activeMs.title, total: comps.length, full,
          current: nowLetter ? {
            id: nowLetter.id, name: nowLetter.versionName, sent: model?.sentByLetter.get(nowLetter.id) ?? 0,
            titles: compsInLetter(comps, nowLetter).map((c) => c.title),
          } : null,
        };

  return (
    <WorkspacePageGrid scrollLabel="Comparable titles" masthead={null}>
      <div className="cpv-page cp30 cp32" data-cpv="page" data-cp="page" data-state={loading ? "loading" : empty ? "empty" : listed ? "listed" : "none"} ref={pageRef}>
        <CompsTop32 state={top} addRef={primaryRef}
          onAdd={activeMs ? openAdd : () => undefined} onHow={() => setHow(true)} onExplain={() => setExplain(true)}
          onSeeLetter={() => onNavigate?.("manuscripts", "Query letters")} />
        {loading ? <CompsDeskSkeleton32 /> : null}
        {empty ? <CompsFirst32 /> : null}
        {listed ? (
          <>
            {notice ? <CompsBand32 notice={notice} onChoose={(id) => openPicker(id)} /> : null}
            <div className="cp32-grid" data-cp="grid" ref={gridRef}>
              <CompsShelf32
                rows={rows} view={view} counts={counts} filter={filter} sort={sort} openKey={openRow?.key ?? null}
                currentKeys={currentKeys} canAdd={!full} findRef={findRef}
                onFilter={setFilter} onSort={setSort} onOpen={(k) => setOpenKey(k)} onAdd={openAdd}
              />
              {openRow ? (
                <CompsOpen32 row={openRow} letters={openLetters} view={openView} now={now}
                  letterNameOf={(id) => letterById.get(id)?.versionName ?? ""}
                  onView={setOpenView}
                  onEdit={(focusNote) => setDrawer({ mode: "edit", key: openRow.key, focusNote })}
                  onAddToLetter={() => openPicker(null, openRow.key)}
                  onAllQueries={() => navigate(queriesForIds(openRow.queries.map((q) => q.id), `Sent with ${openRow.comp.title}`))} />
              ) : null}
            </div>
            <CompsPodium32 places={places} sentIn={sentIn} onOpen={openFromBelow} />
            <CompsPendium32 rows={book} note={note} scoutAsked={scoutAsked} onOpen={openFromBelow} onScout={toggleScout} />
          </>
        ) : null}
        {empty || listed ? <AppFooter onNavigate={(t, sub) => onNavigate?.(t, sub)} /> : null}
      </div>

      {activeMs && (
        <>
          <CompDrawer
            state={routeActive ? drawer : null} row={editRow} comps={comps}
            removeBlocked={editRow && editRow.where === "sent" ? "You can’t remove this comp because a letter you’ve sent mentions it." : null}
            onClose={() => setDrawer(null)}
            onSave={(d) => { if (editRow) save(editRow.key, d); }}
            onAdd={add}
            onRemove={() => editRow && remove(editRow.key)}
            onShowExisting={(index) => { const c = comps[index]; if (c) { setDrawer(null); setFilter(NO_FILTER); setOpenKey(compKey(c, index)); } }}
          />
          <CompLetterPicker
            request={routeActive ? picker : null} letters={letters} currentLetterId={nowLetter?.id ?? null} comps={comps} rows={rows} now={now}
            sentByLetter={model?.sentByLetter ?? new Map()}
            onClose={() => setPicker(null)}
            onSave={(letterId, keys) => void saveLetter(letterId, keys)}
            onSaveForComp={(key, ids) => void saveForComp(key, ids)}
            onNewVersion={(letterId) => void newVersion(letterId)}
            onOpenPackages={() => { setPicker(null); onNavigate?.("manuscripts", "Submission packages"); }}
          />
          <CompsHowPop30 open={routeActive && how && listed} onClose={() => setHow(false)} />
        </>
      )}
      <CompsExplainDialog open={routeActive && explain} onClose={() => setExplain(false)} />
    </WorkspacePageGrid>
  );
};
