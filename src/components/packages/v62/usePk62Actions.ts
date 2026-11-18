/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v62 — the page's writes, in the brief's words (§5.1, §5.9). Each one is the app's own store
 * writer (lib/db); only the snackbars and what Undo restores are this page's.
 *
 * ⚠️ UNDO RESTORES EVERYTHING THE ACTION CHANGED, and nothing navigates between a write and its Undo:
 *    - a delete is undone by re-adding the package with every stored field it had (pieces, extras, icon, colour, note,
 *      where it was copied from), and making it the package for new queries again if it was;
 *    - a save is undone by writing back the name, the note (absent when it had none) and the icon.
 * ⚠️ ONLY A FINISHED PACKAGE GOES OUT (§6.1). A new package is never made the one for new queries; when the piece that
 *    finishes a package lands and the manuscript has no package for new queries, that package becomes it.
 */
import { deleteField } from "firebase/firestore";
import { useScriptAllyDb } from "../../../lib/db";
import { useToast } from "../../toast/ToastProvider";
import { copyFields, canMakeActive } from "../../../lib/packagesV40";
import { copyNameOf, isFinished } from "../../../lib/packagesV62";
import type { PackageIcon, SubmissionPackage } from "../../../types";
import type { Pk26Model, PieceKind } from "../v26/usePk26Model";

type Fields = Omit<SubmissionPackage, "id" | "userId" | "status" | "createdDate">;

/** Every stored field a re-add can carry (the store sets id, user, status and date). */
function refill(p: SubmissionPackage): Fields {
  const { id: _i, userId: _u, status: _s, createdDate: _c, firstSentAt: _f, edition: _e, editions: _es, retiredAt: _r, ...rest } = p;
  return rest as Fields;
}

export function usePk62Actions(model: Pk26Model) {
  const db = useScriptAllyDb();
  const { showToast } = useToast();
  const { activeMs, msPkgs, active } = model;
  const msId = activeMs?.id ?? "";

  /** Make it the package for new queries (the Change picker, "Use for new queries"). */
  const useForNew = async (p: SubmissionPackage): Promise<boolean> => {
    if (!msId || !canMakeActive(p, active?.id) || !isFinished(p)) return false;
    const prev = activeMs?.activePackageId ?? "";
    await db.setActivePackage(msId, p.id);
    showToast({ message: `${p.packageName} now goes out with new queries.`, undo: () => db.setActivePackage(msId, prev) });
    return true;
  };

  /** New package: a name, a note, an icon, and no pieces. Returns its id. */
  const create = async (d: { name: string; note: string; icon: PackageIcon }): Promise<string | null> => {
    if (!msId) return null;
    const name = d.name.trim();
    const res = await db.addPackage({
      manuscriptId: msId, packageName: name, queryLetterVersionId: "", synopsisVersionId: "", samplePagesVersionId: "",
      extraIds: [], icon: d.icon, ...(d.note.trim() ? { note: d.note.trim(), noteEditedAt: new Date().toISOString() } : {}),
    });
    if (!res.success || !res.id) { showToast({ message: res.error ?? "That didn't save. Try again." }); return null; }
    const id = res.id;
    showToast({ message: `${name} created. Pick its pieces.`, undo: async () => { await db.deletePackage(id); } });
    return id;
  };

  /** Make a copy: "{name} copy", the same pieces, nothing sent, and where it came from. Returns its id. */
  const copy = async (p: SubmissionPackage): Promise<string | null> => {
    const taken = msPkgs.map((x) => x.packageName);
    const f = { ...copyFields(p, taken), packageName: copyNameOf(p.packageName, taken) };
    const res = await db.addPackage(f);
    if (!res.success || !res.id) { showToast({ message: res.error ?? "That didn't save. Try again." }); return null; }
    const id = res.id;
    showToast({ message: "Copied. Change a piece, then send it.", undo: async () => { await db.deletePackage(id); } });
    return id;
  };

  /** Edit: the name, the note ("Who is it for?") and the icon. Never the pieces. */
  const save = async (p: SubmissionPackage, d: { name: string; note: string; icon: PackageIcon }): Promise<boolean> => {
    const note = d.note.trim();
    const was = { packageName: p.packageName, note: p.note, noteEditedAt: p.noteEditedAt, icon: p.icon };
    const err = await db.updatePackage(p.id, {
      packageName: d.name.trim(), icon: d.icon,
      ...(note !== (p.note ?? "") ? (note ? { note, noteEditedAt: new Date().toISOString() } : { note: deleteField() as unknown as string, noteEditedAt: deleteField() as unknown as string }) : {}),
    });
    if (err) { showToast({ message: err }); return false; }
    showToast({
      message: "Saved.",
      undo: async () => {
        await db.updatePackage(p.id, {
          packageName: was.packageName,
          ...(was.icon ? { icon: was.icon } : {}),
          ...(was.note ? { note: was.note, noteEditedAt: was.noteEditedAt ?? new Date().toISOString() } : { note: deleteField() as unknown as string, noteEditedAt: deleteField() as unknown as string }),
        });
      },
    });
    return true;
  };

  /** Delete: only a package that has never been sent (the drawer offers it on no other). */
  const remove = async (p: SubmissionPackage, sent: boolean): Promise<boolean> => {
    if (sent || p.firstSentAt) return false;
    const wasActive = active?.id === p.id;
    if (wasActive) await db.setActivePackage(msId, "");
    const ok = await db.deletePackage(p.id);
    if (!ok) { showToast({ message: `${p.packageName} couldn't be deleted.` }); return false; }
    showToast({
      message: `${p.packageName} deleted.`,
      undo: async () => {
        const r = await db.addPackage(refill(p));
        if (r.id && wasActive) await db.setActivePackage(msId, r.id);
      },
    });
    return true;
  };

  /** Choose a piece. When it finishes the package and nothing goes out with new queries yet, this one does. */
  const put = async (p: SubmissionPackage, kind: PieceKind, id: string) => {
    await model.putPiece(p, kind, id);
    const after = { ...p, [kind === "let" ? "queryLetterVersionId" : kind === "ver" ? "bookVersionId" : "synopsisVersionId"]: id };
    if (!active && msId && isFinished(after)) await db.setActivePackage(msId, p.id);
  };

  return { useForNew, create, copy, save, remove, put, retire: model.retire, take: model.removePiece, toggleExtra: model.toggleExtra, addExtra: model.addExtra };
}
