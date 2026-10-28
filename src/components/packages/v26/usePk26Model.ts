/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v26 — the page's data and writes. It WRAPS the v4 model (usePackagesModel), so the
 * manuscript, the material sets, the active package, the analytics rows and every split come from one place,
 * and adds v26's writes: an empty package, icons and notes, pieces dropped into a package, named extras (with
 * the otherMaterials migration), the fix-or-new save of a letter or synopsis, and a new version offered to the
 * packages that use its parent.
 *
 * ⚠️ SUBMISSION PACKAGES v40: A PACKAGE THAT HAS GONE OUT IS LOCKED (lib/packagesV40). Nothing here starts an
 *    edition any more: a contents change to a locked package is refused, and the way on is "New package from
 *    this" (`duplicate`), which records `copiedFromId` and leaves the original untouched. Make active, Retire and
 *    Delete follow the stage (canMakeActive / canRetire / canDelete).
 */
import { useCallback, useEffect, useMemo, useRef } from "react";
import { deleteField } from "firebase/firestore";
import { useScriptAllyDb } from "../../../lib/db";
import { useToast } from "../../toast/ToastProvider";
import { ComponentType, type CompTitle, type PackageColour, type PackageExtra, type PackageIcon, type SubmissionPackage } from "../../../types";
import { createPayload, countWords } from "../../../lib/materialDraft";
import { isVersionSent } from "../../../lib/versionLock";
import { materialQueries, materialSplit, overall, packageSplit, type Split } from "../../../lib/packageReplies";
import { newCompId, withCompIds } from "../../../lib/compUsage";
import { newBookVersionId, readVersions, saveNewVersion } from "../../../lib/bookVersions";
import {
  copyName, extraNamed, extrasLine, extrasOf, iconOf, otherMaterialsMigration, sendSplit, type ResultsKind,
} from "../../../lib/packagesV26";
import { usePackagesModel } from "../v4/usePackagesModel";
import { figOf, type Fig, type Item as V38Item } from "../../../lib/packagesV38";
import { canDelete, canMakeActive, canRetire, copyFields, copyToast, dayMonth, factsOf, isLocked, packageQueries, queriesWithPiece, type Facts, type PieceContext, type PieceKind as V40Kind } from "../../../lib/packagesV40";
import { LOCKED_NOTE, LOCKED_WHY } from "../../../lib/packageMetrics";

export type PieceKind = "let" | "syn" | "ver";
const FIELD: Record<PieceKind, "queryLetterVersionId" | "synopsisVersionId" | "bookVersionId"> = {
  let: "queryLetterVersionId", syn: "synopsisVersionId", ver: "bookVersionId",
};

export interface MaterialRow {
  id: string;
  kind: "let" | "syn";
  name: string;
  summary: string;
  text: string;
  compIds: string[] | null;
  words: number | null;
  createdDate: string;
  sent: number;
  inPackages: SubmissionPackage[];
  /** the newest material of its kind is the one "In use" */
  inUse: boolean;
  retired: boolean;
}

export interface VersionRow {
  id: string;
  num: number;
  original: boolean;
  name: string;
  summary: string;
  sent: number;
  inPackages: SubmissionPackage[];
  inUse: boolean;
}

export function usePk26Model() {
  const base = usePackagesModel();
  const db = useScriptAllyDb();
  const { showToast } = useToast();
  const { activeMs, msId, msPkgs, live, active, msQueries, rowsById, collectionsReady } = base;
  const { versions, updatePackage, addPackage, setActivePackage, deletePackage, updateManuscript, updateVersion, addVersion,
    revertPackageEdition, writeVersionChange, agents } = db;

  const extras = useMemo(() => extrasOf(activeMs), [activeMs]);
  const comps: CompTitle[] = useMemo(() => (Array.isArray(activeMs?.comps) ? activeMs!.comps : []), [activeMs]);

  /* ── the materials, as the page lists them ──
     ⚠️ A PUT-AWAY MATERIAL STILL HAS A WAY BACK: the Query letters and Synopses tables list put-away ones last, and
     their drawer offers "Bring it back". Your materials (the builder) offers only the live ones. */
  const lettersAll = useMemo<MaterialRow[]>(() => rowsOf("let"), [versions, msId, msPkgs, msQueries, rowsById, active]); // eslint-disable-line react-hooks/exhaustive-deps
  const synopsesAll = useMemo<MaterialRow[]>(() => rowsOf("syn"), [versions, msId, msPkgs, msQueries, rowsById, active]); // eslint-disable-line react-hooks/exhaustive-deps
  const letters = useMemo(() => lettersAll.filter((m) => !m.retired), [lettersAll]);
  const synopses = useMemo(() => synopsesAll.filter((m) => !m.retired), [synopsesAll]);
  function rowsOf(kind: "let" | "syn"): MaterialRow[] {
    const type = kind === "let" ? ComponentType.QUERY_LETTER : ComponentType.SYNOPSIS;
    const field = FIELD[kind];
    const byNew = (a: { createdDate: string }, b: { createdDate: string }) => (a.createdDate < b.createdDate ? 1 : a.createdDate > b.createdDate ? -1 : 0);
    const mine = versions.filter((v) => v.manuscriptId === msId && v.componentType === type);
    const list = [...mine.filter((v) => v.status !== "Retired").sort(byNew), ...mine.filter((v) => v.status === "Retired").sort(byNew)];
    return list.map((v) => ({
      id: v.id, kind, name: v.versionName, summary: v.notes ?? "", text: v.contentDraft ?? "",
      compIds: Array.isArray(v.compIds) ? v.compIds : null, words: typeof v.wordCount === "number" ? v.wordCount : null,
      createdDate: v.createdDate,
      sent: materialSplit(v.id, kind === "let" ? "letter" : "synopsis", msPkgs, msQueries, rowsById).sent,
      inPackages: live.filter((p) => p[field] === v.id),
      /* "In use" = in the active package (the one new queries go out with), as in the ref */
      inUse: !!active && active[field] === v.id && v.status !== "Retired", retired: v.status === "Retired",
    }));
  }
  const bookVersions = useMemo(() => readVersions(activeMs).filter((v) => !v.archived), [activeMs]);
  const versionRows = useMemo<VersionRow[]>(() => bookVersions.map((v) => ({
    id: v.id, num: v.num, original: v.original, name: v.name, summary: v.changes[0] ?? (v.original ? "As you first sent it" : ""),
    sent: materialSplit(v.id, "version", msPkgs, msQueries, rowsById).sent,
    inPackages: live.filter((p) => p.bookVersionId === v.id),
    inUse: activeMs?.inUseBookVersionId === v.id,
  })).sort((a, b) => Number(b.inUse) - Number(a.inUse) || (a.original === b.original ? b.num - a.num : a.original ? 1 : -1)),
  [bookVersions, msPkgs, msQueries, rowsById, live, activeMs]);

  /* archived versions — only Results lists them (under the others, "Retired"); the builder never offers them */
  const archivedVersionRows = useMemo<VersionRow[]>(() => readVersions(activeMs).filter((v) => v.archived).map((v) => ({
    id: v.id, num: v.num, original: v.original, name: v.name, summary: v.changes[0] ?? "",
    sent: materialSplit(v.id, "version", msPkgs, msQueries, rowsById).sent, inPackages: [], inUse: false,
  })), [activeMs, msPkgs, msQueries, rowsById]);

  const matName = useCallback((kind: PieceKind, id: string | undefined | null): string | null => {
    if (!id) return null;
    if (kind === "ver") return bookVersions.find((v) => v.id === id)?.name ?? null;
    return versions.find((v) => v.id === id)?.versionName ?? null;
  }, [bookVersions, versions]);

  /* ── the open package's figures ── */
  const currentSplit = base.currentSplit;
  const splitOf = useCallback((p: SubmissionPackage) => sendSplit(p, msQueries), [msQueries]);

  /* ── the otherMaterials migration: once per manuscript, when the collections have answered ── */
  const migrated = useRef<string | null>(null);
  useEffect(() => {
    if (!activeMs || !collectionsReady || migrated.current === activeMs.id) return;
    migrated.current = activeMs.id;
    const plan = otherMaterialsMigration(activeMs, msPkgs);
    if (!plan.patches.length) return;
    void (async () => {
      try {
        if (plan.added) await updateManuscript(activeMs.id, { extras: plan.extras });
        for (const pt of plan.patches) await db.updatePackage(pt.id, { extraIds: pt.extraIds });
      } catch { /* a refused write leaves the text as it was: nothing is lost, and the next visit tries again */ migrated.current = null; }
    })();
  }, [activeMs, collectionsReady, msPkgs]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── package writes ── */
  /** Change a package's contents. A locked package (out with agents, or retired) never changes: refused, with why. */
  const changeContents = async (p: SubmissionPackage, fields: Parameters<typeof updatePackage>[1], message: string): Promise<boolean> => {
    if (isLocked(p)) { showToast({ message: `${LOCKED_NOTE}. ${LOCKED_WHY}` }); return false; }
    const err = await updatePackage(p.id, fields);
    if (err) { showToast({ message: err }); return false; }
    const prev = p;
    showToast({
      message,
      undo: async () => {
        const back: Parameters<typeof updatePackage>[1] = {};
        for (const k of Object.keys(fields) as (keyof typeof fields)[]) (back as Record<string, unknown>)[k] = (prev as unknown as Record<string, unknown>)[k] ?? (k === "otherMaterials" ? "" : k === "extraIds" ? [] : "");
        await updatePackage(prev.id, back);
      },
    });
    return true;
  };

  /** Put a piece into the open package (a drop, or Add). */
  const putPiece = async (p: SubmissionPackage, kind: PieceKind, id: string) => {
    const field = FIELD[kind];
    const prevName = matName(kind, p[field] as string | undefined);
    const name = matName(kind, id) ?? "That";
    if ((p[field] ?? "") === id) return;
    await changeContents(p, { [field]: id }, prevName ? `${name} replaces ${prevName} in ${p.packageName}.` : `${name} added to ${p.packageName}.`);
  };
  /** Take a piece out. A sent package's version cannot be cleared (the rules refuse ""), so it says so. */
  const removePiece = async (p: SubmissionPackage, kind: PieceKind) => {
    const field = FIELD[kind];
    const name = matName(kind, p[field] as string | undefined) ?? "That piece";
    if (kind === "ver" && p.firstSentAt) {
      showToast({ message: `${p.packageName} has gone out, so its pages stay recorded. Drag another version in to change them.` });
      return;
    }
    const value = "";
    if (kind === "ver") {
      await changeContents(p, { bookVersionId: deleteField() as unknown as string }, `${name} taken out of ${p.packageName}.`);
      return;
    }
    await changeContents(p, { [field]: value }, `${name} taken out of ${p.packageName}.`);
  };

  /** Tick or untick an extra on a package: the ids and the names mirror move together. */
  const toggleExtra = async (p: SubmissionPackage, extraId: string) => {
    const ids = new Set(p.extraIds ?? []);
    const on = ids.has(extraId);
    if (on) ids.delete(extraId); else ids.add(extraId);
    const next = extras.filter((e) => ids.has(e.id)).map((e) => e.id);
    const name = extras.find((e) => e.id === extraId)?.name ?? "That extra";
    await changeContents(p, { extraIds: next, otherMaterials: extrasLine(next, extras) },
      on ? `${name} taken out of ${p.packageName}.` : `${name} added to ${p.packageName}.`);
  };

  /** "+ Add": a new name joins the writer's extras for every package and is ticked on this one. */
  const addExtra = async (p: SubmissionPackage, name: string): Promise<PackageExtra | null> => {
    if (!activeMs || !name.trim()) return null;
    const { extra, created } = extraNamed(name, extras);
    let list = extras;
    if (created) {
      list = [...extras, extra];
      try { await updateManuscript(activeMs.id, { extras: list }); } catch { showToast({ message: "That didn't save. Try again." }); return null; }
    }
    const ids = Array.from(new Set([...(p.extraIds ?? []), extra.id]));
    const ok = await changeContents(p, { extraIds: ids, otherMaterials: extrasLine(ids, list) }, `${extra.name} added to ${p.packageName}.`);
    return ok ? extra : null;
  };

  /** Rename an extra. Unsent packages that tick it take the new name; a sent one keeps the name it went with. */
  const renameExtra = async (extraId: string, name: string): Promise<boolean> => {
    if (!activeMs || !name.trim()) return false;
    const list = extras.map((e) => (e.id === extraId ? { ...e, name: name.trim() } : e));
    try { await updateManuscript(activeMs.id, { extras: list }); } catch { showToast({ message: "That didn't save. Try again." }); return false; }
    for (const p of msPkgs) {
      if (!(p.extraIds ?? []).includes(extraId) || p.firstSentAt) continue;
      await updatePackage(p.id, { otherMaterials: extrasLine(p.extraIds ?? [], list) });
    }
    return true;
  };

  /** Name, note, icon and colour — never contents, so never an edition. */
  const saveDetails = async (p: SubmissionPackage, d: { name: string; note: string; icon: PackageIcon; colour?: PackageColour }): Promise<boolean> => {
    const prev = { packageName: p.packageName, note: p.note ?? "", icon: iconOf(p) };
    const err = await updatePackage(p.id, {
      packageName: d.name.trim(), icon: d.icon, ...(d.colour ? { colour: d.colour } : {}),
      ...(d.note.trim() !== (p.note ?? "") ? { note: d.note.trim(), noteEditedAt: new Date().toISOString() } : {}),
    });
    if (err) { showToast({ message: err }); return false; }
    showToast({ message: `Saved ${d.name.trim()}.`, undo: async () => { await updatePackage(p.id, { packageName: prev.packageName, note: prev.note, icon: prev.icon }); } });
    return true;
  };

  /**
   * v39 · the header's icon-and-colour picker and rename in place: one field, saved at once through the package
   * writer. Filing, never contents, so a package out with agents takes it too. Returns whether it saved.
   */
  const setLook = async (p: SubmissionPackage, d: { icon?: PackageIcon; colour?: PackageColour; name?: string }): Promise<boolean> => {
    const fields: Parameters<typeof updatePackage>[1] = {};
    if (d.icon && d.icon !== iconOf(p)) fields.icon = d.icon;
    if (d.colour && d.colour !== (p.colour ?? "harbour")) fields.colour = d.colour;
    if (d.name !== undefined) { const n = d.name.trim(); if (n && n !== p.packageName) fields.packageName = n; }
    if (!Object.keys(fields).length) return false;
    const err = await updatePackage(p.id, fields);
    if (err) { showToast({ message: err }); return false; }
    if (fields.packageName) {
      const prev = p.packageName;
      showToast({ message: `Renamed to ${fields.packageName}.`, undo: async () => { await updatePackage(p.id, { packageName: prev }); } });
    }
    return true;
  };

  /** A new package: empty, or a copy of the active one. The first package of a manuscript becomes active. */
  const createPackage = async (d: { name: string; note: string; icon: PackageIcon; colour?: PackageColour; from: string | null; piece?: { kind: PieceKind; id: string } }): Promise<string | null> => {
    if (!activeMs) return null;
    const src = d.from ? msPkgs.find((p) => p.id === d.from) ?? null : null;
    const pc = d.piece;
    const res = await addPackage({
      manuscriptId: activeMs.id, packageName: d.name.trim(),
      queryLetterVersionId: pc?.kind === "let" ? pc.id : src?.queryLetterVersionId ?? "", synopsisVersionId: pc?.kind === "syn" ? pc.id : src?.synopsisVersionId ?? "", samplePagesVersionId: "",
      ...(pc?.kind === "ver" ? { bookVersionId: pc.id } : {}),
      ...(pc?.kind === "ver" ? {} : src?.bookVersionId ? { bookVersionId: src.bookVersionId } : !src && activeMs.inUseBookVersionId ? { bookVersionId: activeMs.inUseBookVersionId } : {}),
      ...(src?.otherMaterials ? { otherMaterials: src.otherMaterials } : {}),
      extraIds: src ? [...(src.extraIds ?? [])] : [],
      /* v40: a package started from a copy is a copy (A4) — it records where it came from, so Tests can compare them */
      ...(src ? { copiedFromId: src.id } : {}),
      icon: d.icon, ...(d.colour ? { colour: d.colour } : {}),
      ...(d.note.trim() ? { note: d.note.trim(), noteEditedAt: new Date().toISOString() } : {}),
    });
    if (!res.success || !res.id) { showToast({ message: res.error ?? "That didn't save. Try again." }); return null; }
    const id = res.id;
    const becameActive = !active;
    if (becameActive) await setActivePackage(activeMs.id, id);
    showToast({
      message: src ? `${d.name.trim()} made from a copy of ${src.packageName}. Swap any piece.` : pc ? `${matName(pc.kind, pc.id) ?? "That"} added to ${d.name.trim()}.` : `${d.name.trim()} is ready. Drag a letter in from Your materials.`,
      undo: async () => { if (becameActive) await setActivePackage(activeMs.id, ""); await deletePackage(id); },
    });
    return id;
  };

  /** Delete (A7) — only a package that has never gone out; refused otherwise, with the reason. */
  const deletePkg = async (p: SubmissionPackage): Promise<boolean> => {
    const n = packageSplit(p, msQueries, rowsById).sent;
    if (!canDelete(p) || base.goneOut(p)) {
      showToast({ message: `${p.packageName} has gone out with ${n || "some"} quer${n === 1 ? "y" : "ies"}, so it's kept. Make another package active instead.` });
      return false;
    }
    return base.deletePkg(p);
  };

  /** Make active (A5) — a Ready package, or one out with agents that isn't active already. Exactly one is active. */
  const makeActive = async (p: SubmissionPackage) => {
    if (!canMakeActive(p, active?.id)) return;
    const prev = activeMs?.activePackageId ?? "";
    await setActivePackage(msId, p.id);
    showToast({ message: `New queries now go out with ${p.packageName}.`, undo: () => setActivePackage(msId, prev) });
  };

  /**
   * A4 — "New package from this": the same letter, synopsis, pages, extras, icon and note, named "{name} 2" (or the
   * next free number), nothing sent, `copiedFromId` the original's id. The original is not written to. Returns the
   * new package's id; the page opens it in the workbench and scrolls to it.
   */
  const duplicate = async (p: SubmissionPackage): Promise<string | null> => {
    const f = copyFields(p, msPkgs.map((x) => x.packageName));
    const res = await addPackage(f);
    if (!res.success || !res.id) { showToast({ message: res.error ?? "That didn't save. Try again." }); return null; }
    const id = res.id;
    showToast({ message: copyToast(f.packageName, p.packageName), undo: async () => { await deletePackage(id); } });
    return id;
  };

  /** A6 — Retire: a package that is out and not active ("Make another package active before retiring this one."). */
  const retire = async (p: SubmissionPackage): Promise<boolean> => {
    if (!canRetire(p, active?.id)) {
      showToast({ message: active?.id === p.id ? "Make another package active before retiring this one." : `${p.packageName} hasn't gone out, so it can be deleted instead.` });
      return false;
    }
    await base.retirePkg(p);
    return true;
  };

  /* ── material writes ── */
  /** Add a letter or synopsis (a new record). Returns its id. */
  const addMaterial = async (kind: "let" | "syn", d: { name: string; summary: string; text: string; compIds?: string[] }): Promise<string | null> => {
    if (!activeMs || !d.name.trim()) return null;
    const type = kind === "let" ? ComponentType.QUERY_LETTER : ComponentType.SYNOPSIS;
    let id: string | null = null;
    try {
      id = await addVersion({
        ...createPayload({ type, name: d.name.trim(), mode: "paste", text: d.text, refName: "" }, activeMs.id),
        ...(d.summary.trim() ? { notes: d.summary.trim() } : {}),
        ...(kind === "let" && d.compIds ? { compIds: d.compIds } : {}),
      } as Parameters<typeof addVersion>[0]);
    } catch { id = null; }
    if (!id) { showToast({ message: "That didn't save. Try again." }); return null; }
    return id;
  };

  /**
   * Save a letter or synopsis. `mode`: "fix" changes it in place (for the queries it went with too); "new" saves
   * the change as "{name} (2)" and leaves the sent one as it went. The caller decides whether to ask (a sent
   * material whose text or comps changed), so a name, summary or files change is always a fix.
   */
  const saveMaterial = async (m: MaterialRow, d: { name: string; summary: string; text: string; compIds: string[] | null }, mode: "fix" | "new"): Promise<boolean> => {
    if (mode === "new") {
      const taken = versions.filter((v) => v.manuscriptId === msId).map((v) => v.versionName);
      const name = copyName(m.name, taken);
      const id = await addMaterial(m.kind, { name, summary: d.summary, text: d.text, compIds: d.compIds ?? undefined });
      if (!id) return false;
      const inPk = m.inPackages[0];
      showToast({
        message: `Saved as “${name}”.${inPk ? ` ${inPk.packageName} still uses ${m.name} — change it there if you want to.` : ""}`,
        undo: async () => { await db.deleteVersion(id); },
      });
      return true;
    }
    const prev = { versionName: m.name, notes: m.summary, contentDraft: m.text, compIds: m.compIds };
    const err = await updateVersion(m.id, {
      versionName: d.name.trim() || m.name,
      notes: d.summary.trim() ? d.summary.trim() : deleteField(),
      ...(d.text !== m.text ? { contentDraft: d.text, wordCount: countWords(d.text), contentType: "text" } : {}),
      ...(m.kind === "let" && d.compIds ? { compIds: d.compIds } : {}),
    });
    if (err) { showToast({ message: err }); return false; }
    showToast({
      message: m.sent ? "Saved as a fix. The queries it went with keep it." : `${m.kind === "let" ? "Query letter" : "Synopsis"} saved.`,
      undo: async () => { await updateVersion(m.id, { versionName: prev.versionName, notes: prev.notes || deleteField(), contentDraft: prev.contentDraft, ...(prev.compIds ? { compIds: prev.compIds } : {}) }); },
    });
    return true;
  };
  /** Put a letter or synopsis away, and bring it back — v4's own writes (packages that use it keep it). */
  const putAwayMat = async (m: MaterialRow) => { await base.putAway({ id: m.id, kind: m.kind === "let" ? "letter" : "synopsis", name: m.name } as Parameters<typeof base.putAway>[0]); };
  const bringBack = async (m: MaterialRow) => { await base.restoreMat({ id: m.id, kind: m.kind === "let" ? "letter" : "synopsis", name: m.name } as Parameters<typeof base.restoreMat>[0]); };
  const materialSent = useCallback((id: string) => isVersionSent(id, db.queries, db.packages), [db.queries, db.packages]);

  /** A title typed into the comps picker that is not in the library yet is added to it. Returns its id. */
  const addComp = async (title: string): Promise<string | null> => {
    if (!activeMs) return null;
    const t = title.trim();
    const hit = comps.find((c) => c.title.trim().toLowerCase() === t.toLowerCase());
    if (hit?.id) return hit.id;
    const c: CompTitle = { id: newCompId(), title: t, source: "user" } as CompTitle;
    try { await updateManuscript(activeMs.id, { comps: withCompIds([...comps, c]) }); } catch { showToast({ message: "That didn't save. Try again." }); return null; }
    showToast({ message: `“${t}” added to your comparable titles library.` });
    return c.id!;
  };

  /** Save a new version of the book (Versions v2's own write), then offer it to packages that use its parent. */
  const saveVersion = async (d: { name: string; change: string; parentId: string | null }): Promise<string | null> => {
    if (!activeMs) return null;
    const id = newBookVersionId();
    const fields = saveNewVersion(activeMs, { name: d.name, changes: d.change.trim() ? [d.change.trim()] : [], parentId: d.parentId }, new Date().toISOString().slice(0, 10), { version: id, original: newBookVersionId() });
    if (typeof fields === "string") {
      showToast({ message: fields === "name" ? "That name is empty or already used by another version." : fields === "changes" ? "Say what changed in a few words." : "That version couldn't be saved." });
      return null;
    }
    const ok = await writeVersionChange(activeMs.id, fields);
    if (!ok) { showToast({ message: "That didn't save. Try again." }); return null; }
    return id;
  };
  /** Point the ticked packages at a version; a sent one starts its next edition. */
  const useVersionIn = async (ids: string[], versionId: string) => {
    let n = 0;
    for (const id of ids) {
      const p = msPkgs.find((x) => x.id === id);
      /* v40: a locked package keeps the pages it went out with */
      if (!p || isLocked(p)) continue;
      const err = await updatePackage(p.id, { bookVersionId: versionId });
      if (!err) n++;
    }
    const name = matName("ver", versionId) ?? "the new version";
    showToast({ message: n ? `${n} package${n === 1 ? "" : "s"} now send pages from ${name}. Queries already sent keep the version they went with.` : "No package was changed." });
  };

  /* ── Results ── */
  const overallSplit = useMemo(() => overall(msPkgs, msQueries, rowsById), [msPkgs, msQueries, rowsById]);
  /* ⚠️ v26.1: RESULTS LISTS THE BUILDER'S SET. msPkgs is this manuscript's packages only (a deleted package is not
     in the collection at all); a RETIRED one is listed under the others, "Retired", and never ranked. The same rule
     for put-away letters and synopses and archived versions. It was `msPkgs` with no flag, so a retired package
     ranked beside the live ones while the builder did not show it. */
  type Item = { id: string; name: string; s: Split; retired?: boolean; ref: SubmissionPackage | MaterialRow | VersionRow | null };
  const resultItems = useCallback((kind: ResultsKind): Item[] => {
    if (kind === "pk") return msPkgs.map((p) => ({ id: p.id, name: p.packageName, s: base.allSplit(p), retired: p.status === "Retired", ref: p }));
    if (kind === "ver") {
      const vs = (v: VersionRow) => materialSplit(v.id, "version", msPkgs, msQueries, rowsById);
      const out: Item[] = versionRows.map((v) => ({ id: v.id, name: v.name, s: vs(v), ref: v }));
      const nr = materialSplit(null, "version", msPkgs, msQueries, rowsById);
      if (nr.sent) out.push({ id: "__none", name: "Not recorded", s: nr, ref: null });
      for (const v of archivedVersionRows) out.push({ id: v.id, name: v.name, s: vs(v), retired: true, ref: v });
      return out;
    }
    const list = kind === "let" ? lettersAll : synopsesAll;
    return list.map((m) => ({ id: m.id, name: m.name, s: materialSplit(m.id, kind === "let" ? "letter" : "synopsis", msPkgs, msQueries, rowsById), retired: m.retired, ref: m }));
  }, [msPkgs, msQueries, rowsById, versionRows, archivedVersionRows, lettersAll, synopsesAll, base]);
  /** The queries behind a Results row (for the detail card and the Query Centre link). */
  const resultQueries = useCallback((kind: ResultsKind, id: string) => {
    if (kind === "pk") return base.creditedQueries(msPkgs.find((p) => p.id === id)!);
    const k = kind === "let" ? "letter" : kind === "syn" ? "synopsis" : "version";
    return materialQueries(id === "__none" ? null : id, k, msPkgs, msQueries);
  }, [base, msPkgs, msQueries]);

  /* ── v40 figures (H): every count is versionsV2's — sent excludes withdrawn, "asked for more" is Analytics'
     reachedRequest, a share shows from MIN_SENT_FOR_RATE sent. A package counts every query credited to it; a piece
     counts every query that recorded it, whichever package it was in (H3). ── */
  const pieceCtx = useMemo<PieceContext>(() => ({
    packages: msPkgs, materials: versions.filter((v) => v.manuscriptId === msId), versions: readVersions(activeMs),
  }), [msPkgs, versions, msId, activeMs]);
  const facts = useCallback((p: Pick<SubmissionPackage, "id">): Facts => factsOf(packageQueries(p, msQueries), rowsById), [msQueries, rowsById]);
  const pieceFacts = useCallback((kind: V40Kind, id: string): Facts => factsOf(queriesWithPiece(msQueries, kind, id, pieceCtx), rowsById), [msQueries, pieceCtx, rowsById]);
  /** Who got a package (the shelf drawer's list): in the order they went, as the ref lists them. */
  const whoGot = useCallback((p: Pick<SubmissionPackage, "id">) => packageQueries(p, msQueries)
    .filter((q) => q.status !== "Withdrawn")
    .sort((a, b) => (rowsById.get(a.id)?.sentMs ?? 0) - (rowsById.get(b.id)?.sentMs ?? 0))
    .map((q) => {
      const a = agents.find((x) => x.id === q.agentId);
      const name = a?.name ?? "An agent no longer on file";
      const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
      const ms = rowsById.get(q.id)?.sentMs ?? null;
      const date = dayMonth(ms);
      const st = String(q.status);
      return { id: q.id, initials, name, agency: a?.agency ?? "", date, status: st.charAt(0) + st.slice(1).toLowerCase() };
    }), [msQueries, rowsById, agents]);

  /** Who a material went to — agent names, newest first. */
  const wentTo = useCallback((kind: "let" | "syn" | "ext", id: string): { names: string[]; ids: string[] } => {
    let qs = kind === "ext"
      ? msQueries.filter((q) => { const p = msPkgs.find((x) => x.id === (q.sentPackageId || q.packageId)); return !!p && (p.extraIds ?? []).includes(id); })
      : materialQueries(id, kind === "let" ? "letter" : "synopsis", msPkgs, msQueries);
    qs = [...qs].sort((a, b) => (rowsById.get(b.id)?.sentMs ?? 0) - (rowsById.get(a.id)?.sentMs ?? 0));
    return { names: qs.map((q) => agents.find((a) => a.id === q.agentId)?.name ?? "").filter(Boolean), ids: qs.map((q) => q.id) };
  }, [msQueries, msPkgs, rowsById, agents]);

  /* ── v38 figures: every count is packageReplies' (first answer; materials edition-true; ranked from
     MIN_SENDS_FOR_CLAIM answered). The labels, the package drawer and Results read only these. ── */
  const figPk = useCallback((p: SubmissionPackage): Fig => figOf(base.allSplit(p), base.creditedQueries(p), rowsById), [base, rowsById]);
  const figItems = useCallback((kind: ResultsKind): (V38Item & { ref: SubmissionPackage | MaterialRow | VersionRow })[] =>
    resultItems(kind).filter((i) => i.ref).map((i) => ({ id: i.id, name: i.name, retired: !!i.retired, ref: i.ref!, f: figOf(i.s, resultQueries(kind, i.id), rowsById) })),
  [resultItems, resultQueries, rowsById]);
  const figAll = useMemo(() => figOf(overallSplit, msPkgs.flatMap((p) => base.creditedQueries(p)), rowsById), [overallSplit, msPkgs, base, rowsById]);

  return {
    ...base,
    figPk, figItems, figAll,
    extras, comps, letters, synopses, lettersAll, synopsesAll, versionRows, matName, splitOf, currentSplit, overallSplit,
    putPiece, removePiece, toggleExtra, addExtra, renameExtra, saveDetails, setLook, createPackage, deletePkg, makeActive, duplicate, retire,
    addMaterial, saveMaterial, materialSent, putAwayMat, bringBack, addComp, saveVersion, useVersionIn, resultItems, resultQueries, wentTo,
    facts, pieceFacts, pieceCtx, whoGot,
  };
}

export type Pk26Model = ReturnType<typeof usePk26Model>;
