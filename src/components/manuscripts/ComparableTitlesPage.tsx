/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comparable titles v28 (17 Oct; refs design-refs/comps-v28/). Route /manuscripts/comps.
 *
 * Comps are TRACKED: a comp has a stable id, a query letter records the comps it mentions, and every
 * query is traced to its letter, so each comp knows which queries it went out with (lib/compUsage).
 * The page: the app's two-state header (the navy EmptyPanel with no comps, the LightHeader with them),
 * one notice for letters that went out before their comps were logged, "Your comp shelf" (a toolbar
 * over a grid of index cards), and "What's landing" (by comp and by letter). A card opens the comp
 * drawer; "Log comps in a letter" opens the picker. v25's list, grouping, full screen and "At a glance"
 * strip are retired.
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
import { WorkspacePageGrid } from "../shell/WorkspacePageGrid";
import { AppFooter } from "../shell/AppFooter";
import { isShelvedPresentation } from "../../lib/manuscriptPage";
import { CompDraft, MAX_COMPS, manuscriptComps, normalizeComp, withCompAdded, withCompEdited, withCompRemoved } from "../../lib/comps";
import { currentYear } from "../../lib/compsPage";
import { SAVE_FAILED, runWrite } from "../../lib/compsWrite";
import { averageAsked, compKey, currentLetter, letterRate, ready, usageModel, withCompIds } from "../../lib/compUsage";
import { buildRows, letterShort } from "../../lib/compsLibrary";
import {
  NO_FILTER, filterShelf, kindsPresent, landingRows, letterBlocks, noticeOf, restLine, sortShelf, whereCounts,
  type ShelfFilter, type ShelfSort, type ShelfWhere,
} from "../../lib/compsShelf";
import { nextVersionName } from "../../lib/versionLock";
import { escapeDepth } from "../../lib/escapeStack";
import { useToast } from "../toast/ToastProvider";
import { useCompsHold } from "../../lib/compsLoadHold";
import { CompsHowDialog } from "./comps25/CompsHowDialog";
import { CompsSteps } from "./comps25/CompsSteps";
import { CompDrawer, DrawerState } from "./comps25/CompDrawer";
import { CompLetterPicker, PickerRequest } from "./comps25/CompLetterPicker";
import { CompsScout } from "./comps25/CompsScout";
import { CompsStartPanel, CompsLightHeader } from "./comps28/CompsHeader";
import { CompsNotice, CompsShelf } from "./comps28/CompsShelf";
import { CompsLanding } from "./comps28/CompsLanding";
import { CompsExplainDialog } from "./comps28/CompsExplainDialog";
import { openerOf, refocus } from "./comps28/refocus";
import "./compsV2.css";
import "./comps25/compsV25.css";
import "./comps28/comps28.css";

/** Shared with the sidebar's switcher and the packages page — the section's one active-manuscript key. */
const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";
export const COMPS_ROUTE = "/manuscripts/comps";
export { COMPS_HEADER_ART } from "./comps28/art";

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
  const [filter, setFilter] = useState<ShelfFilter>(NO_FILTER);
  const [sort, setSort] = useState<ShelfSort>("own");
  const [drawer, setDrawer] = useState<DrawerState | null>(null);
  const [picker, setPicker] = useState<PickerRequest | null>(null);
  /** the "How comp tracking works" pop-up (comps v27): the steps, one click from the header */
  const [how, setHow] = useState(false);
  /** comps v28: the "What makes a good comp?" pop-up, from the empty panel */
  const [explain, setExplain] = useState(false);
  /** the optimistic list while a write is in flight */
  const [pending, setPending] = useState<{ msId: string; comps: CompTitle[] } | null>(null);
  const seq = useRef(0);
  const compsRef = useRef<CompTitle[]>([]);
  const pageRef = useRef<HTMLDivElement | null>(null);
  const findRef = useRef<HTMLInputElement | null>(null);
  const shelfRef = useRef<HTMLElement | null>(null);
  const landRef = useRef<HTMLElement | null>(null);
  const primaryRef = useRef<HTMLButtonElement | null>(null);
  const busyRef = useRef(false);

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
  const kinds = useMemo(() => kindsPresent(rows), [rows]);
  /* a type toggle that has gone (its last comp of that type removed) no longer narrows the shelf */
  const shelfFilter = filter.kind && !(kinds.length >= 2 && kinds.includes(filter.kind)) ? { ...filter, kind: null } : filter;
  const view = useMemo(() => sortShelf(filterShelf(rows, shelfFilter), sort), [rows, shelfFilter, sort]);
  const counts = useMemo(() => whereCounts(rows), [rows]);
  const nowLetter = activeMs ? currentLetter(activeMs.id, versions) : null;
  const now = currentYear();
  const notice = noticeOf(model?.unrecorded ?? []);
  const average = useMemo(() => (activeMs ? averageAsked(activeMs, queries, activities) : { asked: 0, sent: 0, pct: null }), [activeMs, queries, activities]);
  const blocks = useMemo(() => (model ? letterBlocks(letters, comps, model.sentByLetter, nowLetter?.id ?? null, (id) => letterRate(model, id)) : []), [model, letters, comps, nowLetter]);
  const openRow = drawer && drawer.mode !== "add" ? rows.find((r) => r.key === drawer.key) ?? null : null;

  const openAdd = useCallback(() => {
    if (compsRef.current.length >= MAX_COMPS) return;
    setPicker(null);
    setDrawer({ mode: "add" });
  }, []);
  /* ⚠️ FOCUS GOES BACK WHERE IT CAME FROM (comps v28 §E): the control focused when the FIRST layer opened (a drawer,
     the picker, a pop-up) takes focus again when the LAST one closes. A hand-over (the drawer to the picker, the
     pop-up to the picker) keeps a layer open, so it never returns focus half-way. When the opener was re-rendered
     (a card, a link inside one), the element on screen with the same `data-cx-key` takes it (comps28/refocus). */
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
     one on screen (every workspace page stays mounted). v25's F (full screen) is retired with full screen. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const add = matchesShortcut(SHORTCUTS.compAdd, e), look = matchesShortcut(SHORTCUTS.compsFind, e);
      if (!add && !look) return;
      if (isEditableTarget(e.target) || overlayRef.current) return;
      if (!pageRef.current || pageRef.current.getBoundingClientRect().height === 0) return;
      /* anything else open over the page (a menu, another surface's drawer) keeps the key */
      if (escapeDepth() > 0) return;
      if (compsRef.current.length === 0) return;
      e.preventDefault();
      if (add) openAddRef.current();
      else findRef.current?.focus();
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

  const save = (key: string, draft: CompDraft, back: boolean) => {
    const index = indexOfKey(key);
    if (index < 0) return;
    const before = compsRef.current[index];
    const next = withCompIds(withCompEdited(compsRef.current, index, draft));
    void commit(next);
    /* comps v28 §E: an edit opened from the drawer returns to that comp's detail; one opened from a card's link closes */
    setDrawer(back ? { mode: "view", key: next[index].id! } : null);
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
      /* comps v28 §E: the page repaints with the new record BEFORE the picker closes, so the focus it gives back finds
         the opener as it now is (a card's "Log in a letter" is gone once a letter names that comp) */
      await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
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
  /* ⚠️ THREE STATES, AND LOADING IS NEITHER OF THE OTHER TWO (comps v27, kept in v28). While comps are loading the page
     is its header and nothing below: an account with comps must never be shown the empty page first. The state is
     the comp count and nothing else, so the first save and the last remove switch it with no reload. */
  const isEmpty = comps.length === 0;
  const empty = !loading && !!activeMs && isEmpty;
  const listed = !loading && !!activeMs && !isEmpty;
  const att = model?.attachment ?? null;
  const toShelf = () => shelfRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const toLanding = () => landRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  /** the header card's rows and the shelf's segmented control share one "where" */
  const pickWhere = (w: ShelfWhere) => { setFilter((f) => ({ ...f, where: f.where === w ? null : w })); toShelf(); };
  const openPicker = (letterId: string | null, forKey?: string) => { setDrawer(null); setHow(false); setPicker({ letterId, forKey }); };

  return (
    <WorkspacePageGrid scrollLabel="Comparable titles" masthead={null}>
      <div className="cpv-page cv-page cx-page" data-cpv="page" data-cv="page" data-cx="page" data-state={loading ? "loading" : empty ? "empty" : listed ? "listed" : "none"} ref={pageRef}>
        <div className="cv-group" data-cv="group">
          {empty || (!loading && !activeMs) ? (
            <section className="cx-empty" data-cx="empty" aria-label="Comparable titles, before any comps">
              <CompsStartPanel book={activeMs?.title ?? null} addRef={primaryRef} onAdd={activeMs ? openAdd : () => undefined} onExplain={() => setExplain(true)} />
              {activeMs
                ? <section className="cv-stepcard" data-cv="empty"><CompsSteps headingId="cv-hsteps-card-h" /></section>
                : <p className="cv-hintline" data-cv="no-ms">No manuscript to compare yet. Add one in Manuscripts, then build its comps here.</p>}
            </section>
          ) : (
            <CompsLightHeader
              loading={loading} count={comps.length} book={activeMs?.title ?? null}
              counts={listed ? counts : null} where={filter.where} attachment={att} full={full}
              addRef={primaryRef}
              onAdd={openAdd} onPick={() => openPicker(null)} onHow={() => setHow(true)}
              onWhere={pickWhere} onLanding={toLanding}
            />
          )}
          {listed ? (
            <>
              {notice ? <CompsNotice notice={notice} onLog={(id) => openPicker(id)} /> : null}
              <CompsShelf
                rows={rows} view={view} counts={counts} kinds={kinds} filter={shelfFilter} sort={sort} now={now}
                openKey={drawer && drawer.mode !== "add" ? drawer.key : null} canAdd={!full}
                findRef={findRef} headRef={shelfRef}
                onFilter={setFilter} onSort={setSort}
                onOpen={(key) => setDrawer({ mode: "view", key })}
                onEdit={(key) => setDrawer({ mode: "edit", key, back: false })}
                onPick={(key) => openPicker(null, key)}
                onAdd={openAdd}
              />
              <CompsLanding
                sent={att?.sent ?? 0} rows={landingRows(rows)} rest={restLine(rows)} average={average} letters={blocks}
                bandRef={landRef}
                onOpen={(key) => setDrawer({ mode: "view", key })}
                onLog={(id) => openPicker(id)}
              />
            </>
          ) : null}
          {empty || listed ? <AppFooter onNavigate={(t, sub) => onNavigate?.(t, sub)} /> : null}
        </div>
      </div>

      {activeMs && (
        <>
          <CompDrawer
            state={routeActive ? drawer : null} row={openRow} comps={comps}
            removeBlocked={openRow && openRow.where === "sent" ? "It went out in a letter, so it stays on your shelf." : null}
            letterShortOf={(id) => { const l = letters.find((x) => x.id === id); return l ? letterShort(l.versionName) : ""; }}
            onClose={() => setDrawer(null)}
            onBack={() => setDrawer((d) => (d && d.mode === "edit" && d.back ? { mode: "view", key: d.key } : null))}
            onEdit={(focusNote) => openRow && setDrawer({ mode: "edit", key: openRow.key, focusNote, back: true })}
            onPick={() => { if (openRow) openPicker(null, openRow.key); }}
            onSave={(d) => { if (openRow && drawer?.mode === "edit") save(openRow.key, d, !!drawer.back); }}
            onAdd={add}
            onRemove={() => openRow && remove(openRow.key)}
            onShowExisting={(index) => { const c = comps[index]; if (c) setDrawer({ mode: "view", key: compKey(c, index) }); }}
          />
          <CompLetterPicker
            request={routeActive ? picker : null} letters={letters} currentLetterId={nowLetter?.id ?? null} comps={comps} rows={rows} now={now}
            sentByLetter={model?.sentByLetter ?? new Map()}
            onClose={() => setPicker(null)}
            onSave={(letterId, keys) => void saveLetter(letterId, keys)}
            onNewVersion={(letterId) => void newVersion(letterId)}
            onOpenPackages={() => { setPicker(null); onNavigate?.("manuscripts", "Submission packages"); }}
          />
          <CompsHowDialog
            open={routeActive && how && listed}
            onClose={() => setHow(false)}
            onPick={() => openPicker(null)}
          />
          {listed && <CompsScout msTitle={activeMs.title} routeActive={routeActive} hidden={anyLayer} />}
        </>
      )}
      <CompsExplainDialog open={routeActive && explain} onClose={() => setExplain(false)} />
    </WorkspacePageGrid>
  );
};
