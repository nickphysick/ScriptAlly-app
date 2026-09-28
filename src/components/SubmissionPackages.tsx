/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ Submission packages v2 (route /manuscripts/packages) — ONE PAGE (27 Sep) ══════════════════════
 * Ref: design-refs/materials/packages-v2.html. Replaces the Packages · Builder · Tracking tabs (D1).
 *
 * The page renders its OWN group, like the Contact list and Comparable titles: the FULL `PageHeader`
 * is row 1 across both tracks, the main column and the Materials rail are row 2 at the rule + 24.
 * `WorkspacePageGrid` is given `masthead={null}`.
 *
 * ⚠️ THE DEEP LINKS SURVIVE THE TABS (P7). `?tab=builder` opens the composer (App's "New package"
 * lands there), `?tab=tracking` scrolls to Side by side, `?tab=packages` is the top of the page.
 * They are read on every arrival (`location.key`), so a second "New package" while already here
 * still opens it.
 *
 * ⚠️ FACTS ONLY (D6). Side by side states what the log records per sent package, in the list's own
 * order; no row is marked, sorted by outcome or called best. `strongestPackage` / `rank*` are not
 * imported here.
 *
 * ⚠️ OPEN TO ALL (D7). Nothing on this page reads the plan; the one gate is `addPackage`'s, behind
 * `PACKAGES_OPEN_TO_ALL`.
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { deleteField } from "firebase/firestore";
import { useScriptAllyDb } from "../lib/db";
import { useToast } from "./toast/ToastProvider";
import { ComponentType, SubmissionPackage } from "../types";
import { WorkspacePageGrid } from "./shell/WorkspacePageGrid";
import { PageHeader } from "./shell/PageHeader";
import { PageRail } from "./containers/PageRail";
import { appendBookVersion, bookVersionsOf, newBookVersionId, renameBookVersion } from "../lib/bookVersions";
import { countWords, createPayload } from "../lib/materialDraft";
import { isVersionSent, lockedEditLine, nextVersionName } from "../lib/versionLock";
import { duplicateOf } from "../lib/buildRow";
import { duplicateName, resolveActivePackage } from "../lib/packageMetrics";
import { initialsOf } from "../lib/manuscriptSummary";
import {
  isSent, MATERIALS_PILE, MatKind, MaterialItem, materialMeta, materialsFor, offered, PACKAGES_HERO, sideBySide,
  suggestPackageName, usesOf,
} from "../lib/packagesPage";
import { PkgAct, PkgCard } from "./packages/PkgCard";
import { buildRows } from "../lib/analytics";
import { packageResults } from "../lib/packageResults";
import { editionNumber, editionWarning, editionsOf, ordinal, summaryFrom } from "../lib/packageEditions";
import { openQueryDrawer } from "../lib/queryActions/drawerStore";
import { CompState, EMPTY_COMP, PkgComposer } from "./packages/PkgComposer";
import { MatAct, PkgMaterialModal, PkgMaterials } from "./packages/PkgMaterials";
import { DrawerItem, PkgMaterialDrawer, PkgRenameModal } from "./packages/PkgMaterialDrawer";
import { PkgBand, PkgBandToggle } from "./packages/PkgBand";
import "./packages/packagesV2.css";

const KEY = "scriptally_active_manuscript_id";
/** The example card is never sent, so it draws no results; this satisfies the prop and nothing reads it. */
const EXAMPLE_RESULTS = () => packageResults("example", null, [], new Map());

/** The empty state's example card — a picture of a package, never a record (P8). */
const EXAMPLE: SubmissionPackage = {
  id: "example", userId: "", manuscriptId: "", packageName: "Autumn round", queryLetterVersionId: "x",
  synopsisVersionId: "x", samplePagesVersionId: "", status: "Active", createdDate: "",
  otherMaterials: "Author bio in the email body", note: "Sending in batches of five, Tuesdays.",
};

export const SubmissionPackages: React.FC = () => {
  const {
    manuscripts, versions, packages, queries, agents, activities, addPackage, updatePackage, retirePackage,
    restorePackage, deletePackage, setActivePackage, addVersion, deleteVersion, restoreVersion, updateManuscript,
    updateVersion, archiveVersion, revertPackageEdition,
  } = useScriptAllyDb();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const location = useLocation();

  /* ⚠️ KEYED ON location.key: the bar's switcher writes the key and re-opens the route (page header v2) */
  const activeMs = useMemo(() => {
    let id: string | null = null;
    try { id = localStorage.getItem(KEY); } catch { /* */ }
    return manuscripts.find((m) => m.id === id) ?? manuscripts[0] ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manuscripts, location.key]);
  const msId = activeMs?.id ?? "";
  const bookVersions = useMemo(() => bookVersionsOf(activeMs), [activeMs]);
  /* ⚠️ TWO SETS, ON PURPOSE (the archive model): a card's slots resolve against EVERY material, so
     putting a letter away never makes a package look like it is missing one; the rail and the
     composer offer only what has not been put away. */
  const allMats = useMemo(() => materialsFor(msId, versions, bookVersions), [msId, versions, bookVersions]);
  const mats = useMemo(() => offered(allMats), [allMats]);
  const putAway = useMemo(() => [...allMats.letter, ...allMats.synopsis].filter((m) => m.retired), [allMats]);
  const msPkgs = useMemo(
    () => packages.filter((p) => p.manuscriptId === msId).sort((a, b) => (a.createdDate < b.createdDate ? 1 : a.createdDate > b.createdDate ? -1 : 0)),
    [packages, msId],
  );
  const active = useMemo(() => resolveActivePackage(activeMs, msPkgs), [activeMs, msPkgs]);
  const live = msPkgs.filter((p) => p.status !== "Retired");
  const retired = msPkgs.filter((p) => p.status === "Retired");
  const sent = msPkgs.filter(isSent);
  const empty = !!activeMs && msPkgs.length === 0;
  /* E4 · every package retired: behave like the empty state (composer open, the example, and the
     retired list open) — never a list with a hole in it */
  const noneLive = !!activeMs && msPkgs.length > 0 && live.length === 0;

  /* ── the composer: open when asked, or by default while there are no packages (P8) ── */
  const [comp, setComp] = useState<CompState | null>(null);
  const [emptyDismissed, setEmptyDismissed] = useState(false);
  const shown: CompState | null = comp ?? ((empty || noneLive) && !emptyDismissed ? EMPTY_COMP : null);
  const opener = useRef<HTMLElement | null>(null);
  const compRef = useRef<HTMLDivElement | null>(null);
  const [dragKind, setDragKind] = useState<MatKind | null>(null);
  /* ⚠️ THE DROP TEST READS A REF, NOT THE STATE: `dragover` can fire before the render that
     `setDragKind` schedules, and a stale closure would refuse a legal drop */
  const dragKindRef = useRef<MatKind | null>(null);
  const dragId = useRef<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [showRetired, setShowRetired] = useState(false);
  const [modal, setModal] = useState<{ kind: MatKind; opener: HTMLElement | null; edit?: MaterialItem } | null>(null);
  const sbsRef = useRef<HTMLDivElement | null>(null);
  const scrollerOf = () => (compRef.current ?? sbsRef.current)?.closest(".wpg-scroll") as HTMLElement | null;

  /* a different manuscript is a different page: close the composer — but only on a real CHANGE, never on
     the first arrival of data ("" → the id), which would swallow a `?tab=builder` opened on mount */
  const lastMs = useRef(msId);
  useEffect(() => {
    if (lastMs.current && lastMs.current !== msId) { setComp(null); setEmptyDismissed(false); }
    lastMs.current = msId;
  }, [msId]);
  useEffect(() => { if (!flash) return; const t = window.setTimeout(() => setFlash(null), 1300); return () => window.clearTimeout(t); }, [flash]);

  const openComp = useCallback((pre: Partial<CompState> = {}) => {
    opener.current = document.activeElement as HTMLElement | null;
    setComp({ ...EMPTY_COMP, ...pre });
    requestAnimationFrame(() => {
      compRef.current?.scrollIntoView({ block: "nearest" });
      compRef.current?.querySelector<HTMLElement>("select, [data-clear]")?.focus();
    });
  }, []);
  const cancelComp = () => {
    setComp(null);
    if (empty || noneLive) setEmptyDismissed(true);
    const o = opener.current; opener.current = null;
    requestAnimationFrame(() => { if (o && o.isConnected) o.focus(); });
  };
  const patch = (p: Partial<CompState>) => setComp((c) => ({ ...(c ?? EMPTY_COMP), ...p }));

  /* ── deep links, on every arrival ── */
  const tab = new URLSearchParams(location.search).get("tab");
  const [pendingTrack, setPendingTrack] = useState(false);
  useEffect(() => {
    if (tab === "builder") { if (!comp) openComp(); }
    else if (tab === "tracking") setPendingTrack(true);
    else if (tab === "packages") { const s = scrollerOf(); if (s) s.scrollTop = 0; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);
  useLayoutEffect(() => {
    if (!pendingTrack || !sbsRef.current) return;
    sbsRef.current.scrollIntoView({ block: "start" });
    setPendingTrack(false);
  }, [pendingTrack, sent.length]);

  /* ── derived per-card facts ── */
  const matName = (k: MatKind, id: string | undefined) => (id ? allMats[k].find((m) => m.id === id) ?? null : null);
  const metaOf = (m: MaterialItem) => materialMeta(m, usesOf(m, msPkgs));
  /* §C4 — every result is worked out from the queries through Analytics' own rows, so this page
     and Analytics cannot disagree about what a query's first answer was */
  const msQueries = useMemo(() => queries.filter((q) => q.manuscriptId === msId), [queries, msId]);
  const rowsById = useMemo(
    () => new Map(buildRows(msQueries, activities, agents, Date.now()).map((r) => [r.id, r])),
    [msQueries, activities, agents],
  );
  const summaryFor = useMemo(() => summaryFrom(versions, bookVersions), [versions, bookVersions]);
  const who = (queryId: string) => {
    const q = queries.find((x) => x.id === queryId);
    const row = rowsById.get(queryId);
    const name = row?.agentName ?? agents.find((a) => a.id === q?.agentId)?.name ?? "Unknown agent";
    return { name, initials: initialsOf(name) };
  };
  const cardProps = (p: SubmissionPackage) => {
    const l = matName("letter", p.queryLetterVersionId);
    const s = matName("synopsis", p.synopsisVersionId);
    return {
      letter: l ? { name: l.name, words: l.words } : null,
      synopsis: s ? { name: s.name, words: s.words } : null,
      version: matName("version", p.bookVersionId)?.name ?? null,
      editions: editionsOf(p, summaryFor),
      results: (ed: number | null) => packageResults(p.id, ed, msQueries, rowsById),
      who,
    };
  };

  const flashCard = (id: string) => {
    setFlash(id);
    requestAnimationFrame(() => document.querySelector(`[data-ppv="pkg"][data-id="${id}"]`)?.scrollIntoView({ block: "nearest" }));
  };

  /* ── writes ── */
  const clearActive = () => setActivePackage(msId, "");
  const create = async () => {
    if (!shown || !shown.letter || !activeMs) return;
    const c = shown;
    const name = c.name.trim() || suggestPackageName(matName("letter", c.letter)?.name ?? null, matName("synopsis", c.synopsis)?.name ?? null);
    /* ⚠️ THE COMPOSER CLOSES BEFORE THE WRITE, NOT AFTER IT: `await setDoc` waits for the SERVER,
       while the new card arrives from the local snapshot at once — closing afterwards leaves the
       composer open over a card that already exists. A refusal reopens it with the draft intact. */
    setComp(null);
    if (c.editId) {
      const prev = msPkgs.find((p) => p.id === c.editId);
      const starts = prev ? editionWarning(prev, { queryLetterVersionId: c.letter, synopsisVersionId: c.synopsis, bookVersionId: c.version, otherMaterials: c.other }) : null;
      const err = await updatePackage(c.editId, {
        packageName: name, queryLetterVersionId: c.letter, synopsisVersionId: c.synopsis,
        bookVersionId: (c.version || deleteField()) as unknown as string, otherMaterials: c.other, note: c.note,
        ...(c.note.trim() !== (prev?.note ?? "") ? { noteEditedAt: new Date().toISOString() } : {}),
      });
      if (err) { setComp(c); showToast({ message: err }); return; }
      flashCard(c.editId);
      /* ⚠️ AN EDIT THAT STARTED AN EDITION IS UNDONE EXACTLY, never by writing the old slots back —
         that would be another contents change and start a third (revertPackageEdition) */
      if (starts && prev) {
        showToast({
          message: `Saved ${name}. Its ${ordinal(editionNumber(prev) + 1)} edition starts now.`,
          undo: async () => { const e = await revertPackageEdition(prev); if (e) showToast({ message: e }); },
        });
        return;
      }
      showToast({
        message: `Saved ${name}.`,
        undo: prev ? async () => { await updatePackage(prev.id, {
          packageName: prev.packageName, queryLetterVersionId: prev.queryLetterVersionId, synopsisVersionId: prev.synopsisVersionId,
          bookVersionId: (prev.bookVersionId || deleteField()) as unknown as string, otherMaterials: prev.otherMaterials ?? "", note: prev.note ?? "",
        }); } : undefined,
      });
      return;
    }
    const note = c.note.trim();
    const res = await addPackage({
      manuscriptId: activeMs.id, packageName: name, queryLetterVersionId: c.letter, synopsisVersionId: c.synopsis,
      samplePagesVersionId: "", ...(c.version ? { bookVersionId: c.version } : {}), otherMaterials: c.other,
      ...(note ? { note, noteEditedAt: new Date().toISOString() } : {}),
    });
    if (!res.success || !res.id) { setComp(c); showToast({ message: res.error ?? "That didn't save. Try again." }); return; }
    const id = res.id;
    const becameActive = !active;
    setEmptyDismissed(false); flashCard(id);
    if (becameActive) await setActivePackage(activeMs.id, id);
    showToast({ message: `Created ${name}.`, undo: async () => { if (becameActive) await clearActive(); await deletePackage(id); } });
  };

  const onAct = (p: SubmissionPackage) => async (a: PkgAct) => {
    const wasActive = active?.id === p.id;
    const prevActive = activeMs?.activePackageId ?? "";
    switch (a) {
      case "log":
        /* §C5 — the drawer opens with this package attached (an explicit preset beats "used for new queries") */
        openQueryDrawer({ mode: "log", manuscriptId: p.manuscriptId, packageId: p.id });
        return;
      case "use":
        await setActivePackage(msId, p.id); flashCard(p.id);
        showToast({ message: `${p.packageName} will be filled in when you log a new query.`, undo: () => setActivePackage(msId, prevActive) });
        return;
      case "edit":
        openComp({ letter: p.queryLetterVersionId, synopsis: p.synopsisVersionId || "", version: p.bookVersionId || "", name: p.packageName, other: p.otherMaterials ?? "", note: p.note ?? "", editId: p.id });
        return;
      case "dup":
        openComp({ letter: p.queryLetterVersionId, synopsis: p.synopsisVersionId || "", version: p.bookVersionId || "", name: duplicateName(p.packageName, msPkgs.map((x) => x.packageName)), other: p.otherMaterials ?? "", note: "", dupFrom: p.packageName });
        return;
      case "retire":
        if (wasActive) await clearActive();
        await retirePackage(p.id);
        showToast({ message: wasActive ? `Retired ${p.packageName}. Its history stays, and new queries no longer start from it.` : `Retired ${p.packageName}. Its history stays.`, undo: async () => { await restorePackage(p.id); if (wasActive) await setActivePackage(msId, p.id); } });
        return;
      case "restore":
        /* an UNTOUCHED composer closes — restoring returns the page to the filled state (E4) */
        if (comp && !comp.letter && !comp.synopsis && !comp.version && !comp.editId) setComp(null);
        await restorePackage(p.id); flashCard(p.id);
        showToast({ message: `Restored ${p.packageName}.`, undo: () => retirePackage(p.id) });
        return;
      case "delete": {
        if (wasActive) await clearActive();
        const ok = await deletePackage(p.id);
        if (!ok) { showToast({ message: `${p.packageName} couldn't be deleted.` }); return; }
        showToast({
          message: `Deleted ${p.packageName}.`,
          undo: async () => {
            const r = await addPackage({
              manuscriptId: p.manuscriptId, packageName: p.packageName, queryLetterVersionId: p.queryLetterVersionId,
              synopsisVersionId: p.synopsisVersionId, samplePagesVersionId: "", ...(p.bookVersionId ? { bookVersionId: p.bookVersionId } : {}),
              otherMaterials: p.otherMaterials ?? "", ...(p.note ? { note: p.note, noteEditedAt: p.noteEditedAt ?? new Date().toISOString() } : {}),
            });
            if (r.id && wasActive) await setActivePackage(msId, r.id);
          },
        });
      }
    }
  };

  const saveNote = (p: SubmissionPackage) => async (note: string) => {
    const prev = p.note ?? "";
    if (note === prev) return;
    const err = await updatePackage(p.id, { note, noteEditedAt: new Date().toISOString() });
    if (err) showToast({ message: err });
    else flashCard(p.id);
  };

  /* ── the rail ── */
  const inPkg = (m: MaterialItem) => !!shown && shown[m.kind] === m.id;
  const onChip = (m: MaterialItem) => {
    if (!shown) { openComp({ [m.kind]: m.id } as Partial<CompState>); return; }
    patch({ [m.kind]: shown[m.kind] === m.id ? "" : m.id } as Partial<CompState>);
  };
  /**
   * EDITING A LETTER OR SYNOPSIS (Part B §B2). A version that has gone out — in any query's snapshot,
   * or the slots of a package an older query points at — is never rewritten: the edit is saved as the
   * NEXT version and the sent one stays byte-identical. An unsent version is edited in place.
   */
  const editState = (m: MaterialItem) => {
    const v = versions.find((x) => x.id === m.id);
    const locked = isVersionSent(m.id, queries, packages);
    const next = locked ? nextVersionName(m.name, versions.filter((x) => x.manuscriptId === msId).map((x) => x.versionName)) : m.name;
    return { from: m.name, name: next, text: v?.contentDraft ?? "", locked: locked ? lockedEditLine(m.name, next) : null };
  };
  const saveEdit = async (m: MaterialItem, d: { name: string; text: string }): Promise<boolean> => {
    if (!activeMs) return false;
    const type = m.kind === "letter" ? ComponentType.QUERY_LETTER : ComponentType.SYNOPSIS;
    if (isVersionSent(m.id, queries, packages)) {
      let id: string | null = null;
      try { id = await addVersion(createPayload({ type, name: d.name, mode: "paste", text: d.text, refName: "" }, activeMs.id) as Parameters<typeof addVersion>[0]); } catch { return false; }
      if (!id) return false;
      const vid = id;
      const o = modal?.opener; setModal(null); focusBack(o);
      showToast({ message: `Saved as ${d.name}. ${m.name} stays as it went.`, undo: async () => { await deleteVersion(vid); } });
      return true;
    }
    const v = versions.find((x) => x.id === m.id);
    const prev = { versionName: m.name, contentDraft: v?.contentDraft ?? "", wordCount: v?.wordCount ?? countWords(v?.contentDraft ?? "") };
    const err = await updateVersion(m.id, { versionName: d.name, contentDraft: d.text, wordCount: countWords(d.text), contentType: "text", fileName: deleteField() });
    if (err) { showToast({ message: err }); return false; }
    const o = modal?.opener; setModal(null); focusBack(o);
    showToast({ message: `Saved ${d.name}.`, undo: async () => { await updateVersion(m.id, prev); } });
    return true;
  };
  const saveMaterial = async (kind: MatKind, d: { name: string; text: string; note: string }): Promise<boolean> => {
    if (!activeMs) return false;
    let id: string | null = null;
    let undo: () => Promise<unknown>;
    if (kind === "version") {
      id = newBookVersionId();
      const next = appendBookVersion(bookVersions, {
        id, name: d.name, kind: bookVersions.length ? "revision" : "initial", createdDate: new Date().toISOString().slice(0, 10),
        ...(d.note ? { note: d.note } : {}),
      });
      try { await updateManuscript(activeMs.id, { bookVersions: next }); } catch { return false; }
      const vid = id;
      undo = () => updateManuscript(activeMs.id, { bookVersions: bookVersionsOf(activeMs).filter((v) => v.id !== vid) });
    } else {
      const type = kind === "letter" ? ComponentType.QUERY_LETTER : ComponentType.SYNOPSIS;
      try {
        id = await addVersion(createPayload({ type, name: d.name, mode: "paste", text: d.text, refName: "" }, activeMs.id) as Parameters<typeof addVersion>[0]);
      } catch { return false; }
      if (!id) return false;
      const vid = id;
      undo = () => deleteVersion(vid);
    }
    const o = modal?.opener; setModal(null);
    if (shown) patch({ [kind]: id } as Partial<CompState>);
    requestAnimationFrame(() => { if (o && o.isConnected) o.focus(); });
    showToast({ message: `Added ${d.name}.`, undo: async () => { await undo(); setComp((c) => (c && c[kind] === id ? { ...c, [kind]: "" } : c)); } });
    return true;
  };
  const closeModal = () => { const o = modal?.opener; setModal(null); requestAnimationFrame(() => { if (o && o.isConnected) o.focus(); }); };

  /* ── the material ⋯ menu (v2.1, E5): Open · Rename · Put away ── */
  const [drawer, setDrawer] = useState<{ item: DrawerItem; more: HTMLElement | null } | null>(null);
  const [renaming, setRenaming] = useState<{ m: MaterialItem; more: HTMLElement | null } | null>(null);
  const focusBack = (el: HTMLElement | null | undefined) => requestAnimationFrame(() => { if (el && el.isConnected) el.focus(); });
  const drawerItem = (m: MaterialItem): DrawerItem => {
    const refs = (p: SubmissionPackage) =>
      m.kind === "letter" ? p.queryLetterVersionId === m.id : m.kind === "synopsis" ? p.synopsisVersionId === m.id : p.bookVersionId === m.id;
    const v = m.kind === "version" ? null : versions.find((x) => x.id === m.id);
    return {
      id: m.id, kind: m.kind, name: m.name, meta: metaOf(m),
      text: v?.contentDraft ?? null, fileName: v?.fileName ?? null, link: v?.contentLink ?? null,
      note: m.kind === "version" ? bookVersions.find((b) => b.id === m.id)?.note ?? null : null,
      uses: msPkgs.filter(refs).map((p) => ({ name: p.packageName, retired: p.status === "Retired" })),
    };
  };
  const closeDrawer = useCallback(() => {
    setDrawer((d) => { if (d) focusBack(d.more); return null; });
  }, []);
  /* ⚠️ A RENAME IS A LABEL, NOT AN EDIT (Nick, 28 Sep): the same record keeps its id, no new version is
     made, and a sent package that holds it stays locked — so it is offered inside sent packages too */
  const renameMaterial = async (m: MaterialItem, name: string): Promise<boolean> => {
    if (!activeMs) return false;
    const old = m.name;
    try {
      if (m.kind === "version") {
        const note = bookVersions.find((b) => b.id === m.id)?.note ?? "";
        await updateManuscript(activeMs.id, { bookVersions: renameBookVersion(bookVersions, m.id, name, note) });
      } else {
        await updateVersion(m.id, { versionName: name });
      }
    } catch { return false; }
    const more = renaming?.more; setRenaming(null); focusBack(more);
    showToast({
      message: `Renamed to ${name}.`,
      undo: () => (m.kind === "version"
        ? updateManuscript(activeMs.id, { bookVersions: renameBookVersion(bookVersionsOf(activeMs), m.id, old, bookVersions.find((b) => b.id === m.id)?.note ?? "") })
        : updateVersion(m.id, { versionName: old }).then(() => undefined)),
    });
    return true;
  };
  /* letters and synopses only: book versions have no retired field (E5) */
  const putAwayMaterial = async (m: MaterialItem) => {
    if (m.kind === "version") return;
    if (shown && shown[m.kind] === m.id) patch({ [m.kind]: "" } as Partial<CompState>);
    await archiveVersion(m.id);
    showToast({ message: `Put away ${m.name}. Packages that use it keep it.`, undo: () => restoreVersion(m.id) });
  };
  const onMenu = (act: MatAct, m: MaterialItem, more: HTMLElement | null) => {
    if (act === "open") setDrawer({ item: drawerItem(m), more });
    else if (act === "edit") setModal({ kind: m.kind, opener: more, edit: m });
    else if (act === "rename") setRenaming({ m, more });
    else void putAwayMaterial(m);
  };

  /* ── header ── */
  const sentQueries = queries.filter((q) => msPkgs.some((p) => p.id === q.packageId)).length;
  const description = empty
    ? "Bundle a letter, synopsis and version for each round. Pick the package when you log a query, and you'll know what each agent received."
    : <>A letter, synopsis and version for each round of querying. <strong>{live.length}</strong> in use, <strong>{sentQueries}</strong> queries sent.</>;
  const editing = shown?.editId ?? null;
  const dupe = shown && shown.letter
    ? duplicateOf({
      let: { id: shown.letter, name: "" }, syn: shown.synopsis ? { id: shown.synopsis, name: "" } : null, ver: shown.version ? { id: shown.version, name: "" } : null,
    }, msPkgs.filter((p) => p.id !== editing))
    : null;
  const rows = sideBySide(sent, queries);
  const slotLine = (p: SubmissionPackage) =>
    [matName("letter", p.queryLetterVersionId)?.name, matName("synopsis", p.synopsisVersionId)?.name, matName("version", p.bookVersionId)?.name].filter(Boolean).join(" · ");

  const card = (p: SubmissionPackage) => (
    <PkgCard key={p.id} pkg={p} active={active?.id === p.id} flash={flash === p.id} {...cardProps(p)} onAct={onAct(p)} onSaveNote={saveNote(p)}
      onOpenQuery={(id) => navigate(`/queries?q=${encodeURIComponent(id)}`)} />
  );

  return (
    <WorkspacePageGrid scrollLabel="Submission packages" masthead={null}>
      <div className="ppv-page" data-ppv="page">
        <div className="ppv-group">
          <div className="ppv-head">
            <PageHeader
              variant="full"
              title="Submission packages"
              description={activeMs ? description : "No manuscript yet."}
              primary={activeMs && !empty && !noneLive ? { label: "+ New package", onClick: () => openComp() } : undefined}
              secondary={sent.length >= 2 && !noneLive ? { label: "Side by side", onClick: () => sbsRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }) } : undefined}
              art={<img src={`${PACKAGES_HERO.src}?v=${PACKAGES_HERO.version}`} width={PACKAGES_HERO.width} height={PACKAGES_HERO.height} alt={PACKAGES_HERO.alt} />}
            />
          </div>

          <div className="ppv-main" data-ppv="main">
            {noneLive ? (
              <section className="ppv-nonelive" data-ppv="none-live" aria-label="Nothing in use">
                <div>
                  <b>Nothing in use right now</b>
                  <p>{retired.length === 1 ? "Your one package is" : `All ${retired.length} of your packages are`} retired, with their history kept. Start a new package, or restore one below to use it again.</p>
                </div>
                {shown ? null : <button type="button" className="ppv-btn ppv-btn--dark" data-ppv="none-new" onClick={() => openComp()}>+ New package</button>}
              </section>
            ) : null}

            {shown ? (
              <div ref={compRef}>
                <PkgComposer comp={shown} mats={mats} metaOf={metaOf}
                  editName={editing ? msPkgs.find((p) => p.id === editing)?.packageName ?? null : null}
                  suggestion={suggestPackageName(matName("letter", shown.letter)?.name ?? null, matName("synopsis", shown.synopsis)?.name ?? null)}
                  dupe={dupe}
                  warning={(() => { const prev = editing ? msPkgs.find((p) => p.id === editing) : null; return prev ? editionWarning(prev, { queryLetterVersionId: shown.letter, synopsisVersionId: shown.synopsis, bookVersionId: shown.version, otherMaterials: shown.other }) : null; })()}
                  dragKind={dragKind} accepts={() => dragKindRef.current}
                  onChange={patch}
                  onDropMat={(k) => { const id = dragId.current; if (id) patch({ [k]: id } as Partial<CompState>); }}
                  onShowDup={flashCard} onCancel={cancelComp} onCreate={() => void create()} />
              </div>
            ) : null}

            {!activeMs ? null : empty || noneLive ? (
              <>
                <div className="ppv-exwrap" data-ppv="example" aria-hidden="true" inert>
                  <span className="ppv-ex" data-ppv="ex-tag">Example</span>
                  <div className="ppv-ghost">
                    <PkgCard pkg={EXAMPLE} active ghost letter={{ name: "Query letter v3", words: 310 }} synopsis={{ name: "Synopsis, 1 page", words: 480 }}
                      version="Fast-paced opening" editions={[]} results={EXAMPLE_RESULTS} who={() => ({ name: "", initials: "" })} />
                  </div>
                </div>
                {noneLive ? (
                  <>
                    <PkgBand band="retired" title="Retired" count={retired.length} hint="Restore one to use it again" />
                    <div className="ppv-list" data-ppv="retired">{retired.filter((p) => p.id !== editing).map(card)}</div>
                  </>
                ) : null}
              </>
            ) : (
              <>
                <section className="ppv-pksec">
                  <PkgBand band="packages" title="Your packages" count={live.length}
                    hint={active ? <><b>{active.packageName}</b> is used for new queries</> : "No package is used for new queries"} />
                  <div className="ppv-list" data-ppv="list">
                    {live.filter((p) => p.id !== editing).map(card)}
                  </div>
                </section>

                {sent.length >= 2 ? (
                  <>
                    <PkgBand band="sbs" title="Side by side" hint="Facts from your query log" ref={sbsRef} id="ppv-sbs" />
                    <div className="ppv-cmp">
                      <table data-ppv="sbs">
                        <thead><tr><th scope="col">Package</th><th scope="col">Queries</th><th scope="col">Requests</th><th scope="col">Replies</th><th scope="col">Typical reply</th></tr></thead>
                        <tbody>
                          {rows.map((r) => {
                            const p = sent.find((x) => x.id === r.id)!;
                            return (
                              <tr key={r.id} className={r.retired ? "is-retired" : undefined}>
                                <td>{p.packageName}<span className="m">{slotLine(p)}</span></td>
                                <td>{r.queries}</td>
                                <td>{r.requests} <span className="of">of {r.queries}</span></td>
                                <td>{r.replies} <span className="of">of {r.queries}</span></td>
                                <td>{r.typical}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <div className="foot">Requests count partials and fulls. Typical reply is the median time to any reply.</div>
                    </div>
                  </>
                ) : null}

                {retired.length ? (
                  <>
                    {/* focus stays on the band after a toggle: it is the same button, re-rendered in place */}
                    <PkgBandToggle band="retired" title="Retired" count={retired.length} hint={showRetired ? "Hide" : "Show"}
                      expanded={showRetired} onToggle={() => setShowRetired((v) => !v)} />
                    {showRetired ? <div className="ppv-list" data-ppv="retired">{retired.filter((p) => p.id !== editing).map(card)}</div> : null}
                  </>
                ) : null}
              </>
            )}
          </div>

          <PageRail
            label="Materials"
            className="ppv-rail"
            dataAttrs={{ "data-ppv": "rail" }}
            trayClassName="ppv-tray"
            tray={<>
              <h2>Materials</h2>
              {/* E2 · the talon and the pile; its leg runs off the top on purpose and the tray clips the pile */}
              <img className="ppv-pile" data-ppv="pile" src={`${MATERIALS_PILE.src}?v=${MATERIALS_PILE.version}`} width={MATERIALS_PILE.width} height={MATERIALS_PILE.height} alt="" aria-hidden="true" />
            </>}
          >
            {activeMs ? (
              <PkgMaterials mats={mats} metaOf={metaOf} composing={!!shown} inPkg={inPkg} onChip={onChip}
                onDragStart={(m) => { dragId.current = m.id; dragKindRef.current = m.kind; setDragKind(m.kind); }}
                onDragEnd={() => { dragId.current = null; dragKindRef.current = null; setDragKind(null); }}
                onAdd={(k, el) => setModal({ kind: k, opener: el })}
                onMenu={onMenu}
                putAway={putAway} onRestore={(m) => { void restoreVersion(m.id); showToast({ message: `Restored ${m.name}.` }); }} />
            ) : null}
          </PageRail>
        </div>
        {modal ? (
          <PkgMaterialModal key={`${modal.kind}${modal.edit?.id ?? ""}`} kind={modal.kind} onClose={closeModal}
            editing={modal.edit ? editState(modal.edit) : undefined}
            onSave={(d) => (modal.edit ? saveEdit(modal.edit, d) : saveMaterial(modal.kind, d))} />
        ) : null}
        <PkgMaterialDrawer item={drawer?.item ?? null} onClose={closeDrawer}
          onRename={(d) => {
            const m = [...allMats.letter, ...allMats.synopsis, ...allMats.version].find((x) => x.id === d.id);
            const more = drawer?.more ?? null;
            setDrawer(null);
            if (m) setRenaming({ m, more });
          }} />
        {renaming ? <PkgRenameModal key={renaming.m.id} kind={renaming.m.kind} name={renaming.m.name}
          onClose={() => { const more = renaming.more; setRenaming(null); focusBack(more); }}
          onSave={(name) => renameMaterial(renaming.m, name)} /> : null}
      </div>
    </WorkspacePageGrid>
  );
};

export default SubmissionPackages;
