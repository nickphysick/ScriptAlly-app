/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v4 — the page's data and every write, in one place, so the page and the drawer read
 * the same derivations and call the same handlers.
 *
 * ⚠️ THE WRITES ARE TODAY'S, MOVED, NOT REWRITTEN (v3 "Do not touch"): addPackage / updatePackage and its
 *    edition path, revertPackageEdition for the undo of an edit that started an edition, retire / restore /
 *    delete, setActivePackage, addVersion + createPayload, updateVersion, archiveVersion / restoreVersion,
 *    deleteVersion, and appendBookVersion / renameBookVersion through updateManuscript. The toasts and their
 *    Undos are the page's own from before v4.
 * ⚠️ TWO MATERIAL SETS (the archive model): a card's slots resolve against EVERY material, so putting a
 *    letter away never makes a package look like it is missing one; the form offers only what is not put away.
 */
import { useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { deleteField } from "firebase/firestore";
import { useScriptAllyDb } from "../../../lib/db";
import { useToast } from "../../toast/ToastProvider";
import { ComponentType, type Manuscript, type SubmissionPackage } from "../../../types";
import { appendBookVersion, bookVersionsOf, newBookVersionId, renameBookVersion } from "../../../lib/bookVersions";
import { countWords, createPayload } from "../../../lib/materialDraft";
import { isVersionSent, nextVersionName } from "../../../lib/versionLock";
import { duplicateName, resolveActivePackage } from "../../../lib/packageMetrics";
import { isSent, materialsFor, offered, suggestPackageName, type MatKind, type MaterialItem } from "../../../lib/packagesPage";
import { buildRows } from "../../../lib/analytics";
import { editionNumber, editionWarning, ordinal } from "../../../lib/packageEditions";
import { packageSplit, materialSplit, type Split } from "../../../lib/packageReplies";
import { sentRecordOf } from "../../../lib/queryActions/sentRecord";

const KEY = "scriptally_active_manuscript_id";

/** A package being made or changed in the drawer. `synopsis: ""` is "No synopsis"; `version: ""` none chosen. */
export interface PkgDraft {
  editId?: string;
  /** the package a duplicate was copied from — nothing is written until Create (v3 D2) */
  dupFrom?: string;
  name: string;
  /** the writer has typed a name; the suggestion stops filling it */
  named: boolean;
  letter: string;
  synopsis: string;
  version: string;
  other: string;
}
export const EMPTY_PKG: PkgDraft = { name: "", named: false, letter: "", synopsis: "", version: "", other: "" };

export interface MatDraft {
  editId?: string;
  kind: MatKind;
  name: string;
  note: string;
  text: string;
  /** "New version of {name}": a sent letter or synopsis is never rewritten (v3 decision 6) */
  newFrom?: string;
}

export type MaterialWithNote = MaterialItem & { note: string; text: string | null; link: string | null };

export function usePackagesModel() {
  const db = useScriptAllyDb();
  const {
    manuscripts, versions, packages, queries, agents, activities, addPackage, updatePackage, retirePackage, restorePackage,
    deletePackage, setActivePackage, addVersion, deleteVersion, restoreVersion, updateManuscript, updateVersion, archiveVersion,
    revertPackageEdition, collectionsReady, currentUser,
  } = db;
  const { showToast } = useToast();
  const location = useLocation();

  /* ⚠️ KEYED ON location.key: the bar's switcher writes the key and re-opens the route (page header v2) */
  const activeMs: Manuscript | null = useMemo(() => {
    let id: string | null = null;
    try { id = localStorage.getItem(KEY); } catch { /* */ }
    return manuscripts.find((m) => m.id === id) ?? manuscripts[0] ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manuscripts, location.key]);
  const msId = activeMs?.id ?? "";
  const bookVersions = useMemo(() => bookVersionsOf(activeMs), [activeMs]);
  const allMats = useMemo(() => materialsFor(msId, versions, bookVersions), [msId, versions, bookVersions]);
  const mats = useMemo(() => offered(allMats), [allMats]);
  /** every material with its "line to tell it apart" and its text */
  const withNotes = useMemo(() => {
    const add = (m: MaterialItem): MaterialWithNote => {
      if (m.kind === "version") {
        const b = bookVersions.find((x) => x.id === m.id);
        return { ...m, note: b?.note ?? "", text: null, link: null };
      }
      const v = versions.find((x) => x.id === m.id);
      return { ...m, note: v?.notes ?? "", text: v?.contentDraft ?? null, link: v?.contentLink ?? null };
    };
    return { letter: allMats.letter.map(add), synopsis: allMats.synopsis.map(add), version: allMats.version.map(add) };
  }, [allMats, versions, bookVersions]);

  const msPkgs = useMemo(
    () => packages.filter((p) => p.manuscriptId === msId).sort((a, b) => (a.createdDate < b.createdDate ? 1 : a.createdDate > b.createdDate ? -1 : 0)),
    [packages, msId],
  );
  const active = useMemo(() => resolveActivePackage(activeMs, msPkgs), [activeMs, msPkgs]);
  const live = useMemo(() => msPkgs.filter((p) => p.status !== "Retired"), [msPkgs]);
  const retired = useMemo(() => msPkgs.filter((p) => p.status === "Retired"), [msPkgs]);

  /* every result is worked out from the queries through Analytics' own rows (§C4) */
  const msQueries = useMemo(() => queries.filter((q) => q.manuscriptId === msId), [queries, msId]);
  const rowsById = useMemo(
    () => new Map(buildRows(msQueries, activities, agents, Date.now()).map((r) => [r.id, r])),
    [msQueries, activities, agents],
  );

  const matById = useCallback((kind: MatKind, id: string | undefined | null): MaterialWithNote | null =>
    (id ? withNotes[kind].find((m) => m.id === id) ?? null : null), [withNotes]);

  /** the CURRENT edition's split — the card's foot and the drawer's cells (all editions is the table's) */
  const currentSplit = useCallback((p: SubmissionPackage): Split => packageSplit(p, msQueries, rowsById, editionNumber(p)), [msQueries, rowsById]);
  const allSplit = useCallback((p: SubmissionPackage): Split => packageSplit(p, msQueries, rowsById), [msQueries, rowsById]);
  const matSplit = useCallback((m: Pick<MaterialItem, "id" | "kind">): Split => materialSplit(m.id, m.kind, msPkgs, msQueries, rowsById), [msPkgs, msQueries, rowsById]);
  /** the packages (live and retired) whose CURRENT slots hold a material */
  const packagesWith = useCallback((m: Pick<MaterialItem, "id" | "kind">) => msPkgs.filter((p) =>
    m.kind === "letter" ? p.queryLetterVersionId === m.id : m.kind === "synopsis" ? p.synopsisVersionId === m.id : p.bookVersionId === m.id), [msPkgs]);
  /** credited queries of a package, all editions, newest first */
  const creditedQueries = useCallback((p: SubmissionPackage) => msQueries
    .filter((q) => { const r = sentRecordOf(q); return r.how === "package" && r.packageId === p.id; })
    .sort((a, b) => (rowsById.get(b.id)?.sentMs ?? 0) - (rowsById.get(a.id)?.sentMs ?? 0)), [msQueries, rowsById]);
  /** a package has gone out: its lock stamp, or any query credited to it (an older query predates the stamp) */
  const goneOut = useCallback((p: SubmissionPackage) => isSent(p) || packageSplit(p, msQueries, rowsById).sent > 0, [msQueries, rowsById]);
  const materialGoneOut = useCallback((id: string) => isVersionSent(id, queries, packages), [queries, packages]);

  /* ── package writes ── */
  const clearActive = () => setActivePackage(msId, "");

  /** Create or save. Returns the package's id on success, null on refusal (the toast says why). */
  const savePackage = async (d: PkgDraft): Promise<string | null> => {
    if (!activeMs || !d.letter) return null;
    const name = d.name.trim() || suggestPackageName(matById("letter", d.letter)?.name ?? null, matById("synopsis", d.synopsis)?.name ?? null);
    if (d.editId) {
      const prev = msPkgs.find((p) => p.id === d.editId);
      const starts = prev ? editionWarning(prev, { queryLetterVersionId: d.letter, synopsisVersionId: d.synopsis, bookVersionId: d.version, otherMaterials: d.other }) : null;
      /* ⚠️ THE VERSION KEY IS SENT ONLY WHEN IT SAYS SOMETHING. updatePackage's edition check reads the fields as strings
         (`contentsOf` trims them), so a `deleteField()` there throws on a STAMPED package and the save fails with no word
         to the writer — the v2 page did exactly that for every sent package without a version. Unset and unchanged →
         no key; a new version → the id; cleared on an unsent package → deleteField(). A sent package's version cannot be
         cleared (the form does not offer it): the rules refuse "" and the check cannot take the sentinel. */
      const bv = d.version
        ? { bookVersionId: d.version }
        : prev?.bookVersionId && !prev.firstSentAt ? { bookVersionId: deleteField() as unknown as string } : {};
      const err = await updatePackage(d.editId, {
        packageName: name, queryLetterVersionId: d.letter, synopsisVersionId: d.synopsis, ...bv, otherMaterials: d.other,
      });
      if (err) { showToast({ message: err }); return null; }
      /* ⚠️ AN EDIT THAT STARTED AN EDITION IS UNDONE EXACTLY (revertPackageEdition), never by writing the old
         slots back — that would be another contents change and start a third */
      if (starts && prev) {
        showToast({
          message: `Saved ${name}. Its ${ordinal(editionNumber(prev) + 1)} edition starts now.`,
          undo: async () => { const e = await revertPackageEdition(prev); if (e) showToast({ message: e }); },
        });
      } else {
        showToast({
          message: `Saved ${name}.`,
          undo: prev ? async () => { await updatePackage(prev.id, {
            packageName: prev.packageName, queryLetterVersionId: prev.queryLetterVersionId, synopsisVersionId: prev.synopsisVersionId,
            ...(prev.bookVersionId ? { bookVersionId: prev.bookVersionId } : prev.firstSentAt ? {} : { bookVersionId: deleteField() as unknown as string }),
            otherMaterials: prev.otherMaterials ?? "",
          }); } : undefined,
        });
      }
      return d.editId;
    }
    const res = await addPackage({
      manuscriptId: activeMs.id, packageName: name, queryLetterVersionId: d.letter, synopsisVersionId: d.synopsis,
      samplePagesVersionId: "", ...(d.version ? { bookVersionId: d.version } : {}), otherMaterials: d.other,
    });
    if (!res.success || !res.id) { showToast({ message: res.error ?? "That didn't save. Try again." }); return null; }
    const id = res.id;
    const becameActive = !active;
    if (becameActive) await setActivePackage(activeMs.id, id);
    showToast({ message: `Created ${name}.`, undo: async () => { if (becameActive) await clearActive(); await deletePackage(id); } });
    return id;
  };

  const usePkg = async (p: SubmissionPackage) => {
    const prevActive = activeMs?.activePackageId ?? "";
    await setActivePackage(msId, p.id);
    showToast({ message: `${p.packageName} will be filled in when you log a new query.`, undo: () => setActivePackage(msId, prevActive) });
  };
  const retirePkg = async (p: SubmissionPackage) => {
    const wasActive = active?.id === p.id;
    if (wasActive) await clearActive();
    await retirePackage(p.id);
    showToast({
      message: wasActive ? `Retired ${p.packageName}. Its history stays, and new queries no longer start from it.` : `Retired ${p.packageName}. Its history stays.`,
      undo: async () => { await restorePackage(p.id); if (wasActive) await setActivePackage(msId, p.id); },
    });
  };
  const restorePkg = async (p: SubmissionPackage) => {
    await restorePackage(p.id);
    showToast({ message: `Restored ${p.packageName}.`, undo: () => retirePackage(p.id) });
  };
  const deletePkg = async (p: SubmissionPackage): Promise<boolean> => {
    const wasActive = active?.id === p.id;
    if (wasActive) await clearActive();
    const ok = await deletePackage(p.id);
    if (!ok) { showToast({ message: `${p.packageName} couldn't be deleted.` }); return false; }
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
    return true;
  };
  /** the note saves on blur through today's path, which stamps `noteEditedAt` — on a sent package too */
  const saveNote = async (p: SubmissionPackage, note: string) => {
    if (note === (p.note ?? "")) return;
    const err = await updatePackage(p.id, { note, noteEditedAt: new Date().toISOString() });
    if (err) showToast({ message: err });
  };
  const dupDraft = (p: SubmissionPackage): PkgDraft => ({
    dupFrom: p.packageName, name: duplicateName(p.packageName, msPkgs.map((x) => x.packageName)), named: true,
    letter: p.queryLetterVersionId, synopsis: p.synopsisVersionId || "", version: p.bookVersionId || "", other: p.otherMaterials ?? "",
  });
  const editDraft = (p: SubmissionPackage): PkgDraft => ({
    editId: p.id, name: p.packageName, named: true, letter: p.queryLetterVersionId, synopsis: p.synopsisVersionId || "",
    version: p.bookVersionId || "", other: p.otherMaterials ?? "",
  });

  /* ── material writes ── */
  /** Add or save a material. Returns its id on success. */
  const saveMaterial = async (d: MatDraft): Promise<string | null> => {
    if (!activeMs || !d.name.trim()) return null;
    const name = d.name.trim();
    const note = d.note.trim();
    if (d.kind === "version") {
      if (d.editId) {
        const b = bookVersions.find((x) => x.id === d.editId);
        const old = { name: b?.name ?? name, note: b?.note ?? "" };
        try { await updateManuscript(activeMs.id, { bookVersions: renameBookVersion(bookVersions, d.editId, name, note) }); } catch { showToast({ message: "That didn't save. Try again." }); return null; }
        const id = d.editId;
        showToast({ message: `Saved ${name}.`, undo: () => updateManuscript(activeMs.id, { bookVersions: renameBookVersion(bookVersionsOf(activeMs), id, old.name, old.note) }) });
        return id;
      }
      const id = newBookVersionId();
      const next = appendBookVersion(bookVersions, {
        id, name, kind: bookVersions.length ? "revision" : "initial", createdDate: new Date().toISOString().slice(0, 10), ...(note ? { note } : {}),
      });
      try { await updateManuscript(activeMs.id, { bookVersions: next }); } catch { showToast({ message: "That didn't save. Try again." }); return null; }
      showToast({ message: `Added ${name}.`, undo: () => updateManuscript(activeMs.id, { bookVersions: bookVersionsOf(activeMs).filter((v) => v.id !== id) }) });
      return id;
    }
    const type = d.kind === "letter" ? ComponentType.QUERY_LETTER : ComponentType.SYNOPSIS;
    /* editing a letter or synopsis that has gone out is never an edit in place: the drawer offers "New version
       of", which arrives here as a new material (decision 6). An unsent one is edited in place. */
    if (d.editId && !isVersionSent(d.editId, queries, packages)) {
      const v = versions.find((x) => x.id === d.editId);
      const prev = { versionName: v?.versionName ?? name, contentDraft: v?.contentDraft ?? "", wordCount: v?.wordCount ?? countWords(v?.contentDraft ?? ""), notes: v?.notes ?? "" };
      const err = await updateVersion(d.editId, {
        versionName: name, contentDraft: d.text, wordCount: countWords(d.text), contentType: "text", fileName: deleteField(),
        notes: (note || deleteField()) as unknown as string,
      });
      if (err) { showToast({ message: err }); return null; }
      const id = d.editId;
      showToast({ message: `Saved ${name}.`, undo: async () => { await updateVersion(id, { ...prev, notes: (prev.notes || deleteField()) as unknown as string }); } });
      return id;
    }
    let id: string | null = null;
    try {
      id = await addVersion({ ...createPayload({ type, name, mode: "paste", text: d.text, refName: "" }, activeMs.id), ...(note ? { notes: note } : {}) } as Parameters<typeof addVersion>[0]);
    } catch { id = null; }
    if (!id) { showToast({ message: "That didn't save. Try again." }); return null; }
    const vid = id;
    showToast({ message: d.newFrom ? `Saved as ${name}. ${d.newFrom} stays as it went.` : `Added ${name}.`, undo: async () => { await deleteVersion(vid); } });
    return vid;
  };
  const newVersionDraft = (m: MaterialWithNote): MatDraft => ({
    kind: m.kind, newFrom: m.name, note: m.note, text: m.text ?? "",
    name: nextVersionName(m.name, versions.filter((x) => x.manuscriptId === msId).map((x) => x.versionName)),
  });
  const putAway = async (m: MaterialItem) => {
    if (m.kind === "version") return;
    await archiveVersion(m.id);
    showToast({ message: `Put away ${m.name}. Packages that use it keep it.`, undo: () => restoreVersion(m.id) });
  };
  const restoreMat = async (m: MaterialItem) => { await restoreVersion(m.id); showToast({ message: `Restored ${m.name}.` }); };
  const deleteMat = async (m: MaterialItem): Promise<boolean> => {
    if (m.kind === "version") return false;
    const ok = await deleteVersion(m.id);
    if (!ok) { showToast({ message: `${m.name} couldn't be deleted.` }); return false; }
    showToast({ message: `Deleted ${m.name}.` });
    return true;
  };

  return {
    activeMs, msId, bookVersions, allMats: withNotes, mats, msPkgs, live, retired, active, msQueries, rowsById, collectionsReady,
    currentUser, matById, goneOut, currentSplit, allSplit, matSplit, packagesWith, creditedQueries, materialGoneOut, isSent,
    savePackage, usePkg, retirePkg, restorePkg, deletePkg, saveNote, dupDraft, editDraft,
    saveMaterial, newVersionDraft, putAway, restoreMat, deleteMat, agents,
  };
}

export type PackagesModel = ReturnType<typeof usePackagesModel>;
