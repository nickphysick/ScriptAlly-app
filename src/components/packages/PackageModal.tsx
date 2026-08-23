/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The package builder — pick from the materials you've saved and name the combination.
 * Design authority: design-refs/submission-packages-flow.html, amended by
 * design-refs/package-shapes-amendment.html.
 *
 * ⚠️ IT CREATES NOTHING NEW (D5). Every dropdown lists materials the writer has already saved; there
 * is no "+ new material" shortcut inside it, and the opening hint says so in as many words. A
 * builder that could also author its contents would give materials two creation paths whose drafts
 * could diverge — and the modal that owns authoring is one Escape away.
 *
 * ⚠️ ONLY THE COVERING LETTER IS REQUIRED (D-B1). Letter-only and letter-plus-synopsis are real
 * submission shapes, so synopsis and sample both offer a stated `Not included` rather than being
 * assumed. Before this, sample had that option and synopsis did not — so a synopsis could only
 * become empty BY ACCIDENT (the writer had saved none and `synopses[0]?.id` fell through to `""`)
 * and never by choice. A slot that is empty because nobody could say otherwise is not the same fact
 * as a slot the writer left out, and the card cannot tell them apart afterwards.
 *
 * ⚠️ THE EMPTY VALUE IS `""`, NOT AN ABSENT KEY. `isValidPackage` requires all three slot keys to be
 * present, so an omitted slot must send `UNFILLED_SLOT` — omitting the key fails the rule outright.
 * That is the one place on this page where `deleteField()` would be wrong, and it is why the
 * brief's "never a placeholder" rule is read as being about MATERIALS' optional fields rather than
 * package slots. `otherMaterials` is the exception that proves it: free text, genuinely absent when
 * blank, and unset by `updatePackage` rather than stored as `""`.
 *
 * ⚠️ "OTHER" IS NOT A FOURTH SLOT (D-B2/D-B3). It is free text, not a reference to a saved version,
 * so it cannot be compared between packages or counted in "Requests by material" — see the note on
 * `SubmissionPackage.otherMaterials`. It is offered last, styled as a note, and nothing aggregates
 * it.
 */
import React, { useMemo, useState } from "react";
import { ComponentType, ManuscriptVersion, SubmissionPackage } from "../../types";
import { ofType } from "../../lib/materialDraft";
import { UNFILLED_SLOT, isSlotFilled, OTHER_MAX } from "../../lib/packageMetrics";
import { TYPE_META } from "./typeMeta";
import "./packagesFlow.css";

/** The ref's own wording for a slot the writer has deliberately left out. */
export const NOT_INCLUDED = "Not included";

export interface PackageDraftResult {
  name: string;
  letterId: string;
  /** `""` when no synopsis — the sentinel `isValidPackage` requires. */
  synopsisId: string;
  /** `""` when no sample — the sentinel `isValidPackage` requires. */
  sampleId: string;
  /** Free text, or `""` to leave it unset. Never stored as `""` — `updatePackage` unsets it. */
  otherMaterials: string;
}

export interface PackageModalProps {
  /** The package being edited, or null to build a new one. */
  editing: SubmissionPackage | null;
  versions: ManuscriptVersion[];
  /** How many packages already exist — drives the suggested name. */
  packageCount: number;
  onClose: () => void;
  /**
   * ⚠️ RETURNS AN ERROR STRING RATHER THAN `void`, AND THAT IS THE POINT. `addPackage` refuses on a
   * FREE plan and returns `{ success: false, error }` — a refusal the pre-existing Workshop composer
   * throws away (`return res.success ? res.id : undefined`), so a free user fills the form, presses
   * Save, and watches nothing happen. A modal that closes on a write it did not make is the same
   * silent-denial family as the F7 rules bug, one layer up. Null means saved; a string is shown and
   * the modal stays open with the draft intact.
   */
  onSave: (draft: PackageDraftResult) => Promise<string | null>;
}

export const PackageModal: React.FC<PackageModalProps> = ({
  editing, versions, packageCount, onClose, onSave,
}) => {
  const letters = useMemo(() => ofType(versions, ComponentType.QUERY_LETTER), [versions]);
  const synopses = useMemo(() => ofType(versions, ComponentType.SYNOPSIS), [versions]);
  const samples = useMemo(() => ofType(versions, ComponentType.SAMPLE_PAGES), [versions]);

  const [name, setName] = useState(
    editing ? editing.packageName : packageCount === 0 ? "Standard UK" : `Variant ${packageCount + 1}`,
  );
  const [letterId, setLetterId] = useState(editing?.queryLetterVersionId || letters[0]?.id || "");
  /**
   * ⚠️ AN EXISTING PACKAGE'S EMPTY SLOT STAYS EMPTY. Seeding from `synopses[0]` on edit would
   * silently re-fill a slot the writer had chosen to leave out — the same fabricated-value fault as
   * a default branch that writes. Only a NEW package takes a first-listed default.
   */
  const [synopsisId, setSynopsisId] = useState(
    editing ? (isSlotFilled(editing.synopsisVersionId) ? editing.synopsisVersionId : "") : synopses[0]?.id || "",
  );
  const [sampleId, setSampleId] = useState(
    editing ? (isSlotFilled(editing.samplePagesVersionId) ? editing.samplePagesVersionId : "") : "",
  );
  const [other, setOther] = useState(editing?.otherMaterials ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const nameOf = (id: string) => versions.find((v) => v.id === id)?.versionName ?? "—";
  const title = editing ? "Edit package" : "Build a package";

  /**
   * ⚠️ THE ONE THING THAT CAN STOP A SAVE, AND IT STATES ITS REASON RATHER THAN GREYING OUT. With no
   * saved covering letter the select has no options at all, so `letterId` is `""` and the write
   * would be refused by `isValidPackage`'s create clause — as an opaque
   * "Database transaction error", three layers from the cause. A disabled button with no sentence
   * beside it teaches the same nothing. The refusal is named here, where the writer can act on it.
   */
  const noLetter = !isSlotFilled(letterId);

  /**
   * ⚠️ THE PREVIEW OMITS WHAT IS NOT THERE (D-B5). Printing "Not included" in a line whose job is to
   * say what the package SENDS would make an absence read as a payload — and the row above already
   * states the choice. An omitted slot simply is not in the list.
   *
   * ⚠️ AND `Other` IS NOT IN IT EITHER. The line lists saved materials; free text is a note about
   * the package, not one of its contents.
   */
  const sends = [letterId, synopsisId, sampleId].filter(isSlotFilled).map(nameOf);

  return (
    <div
      className="pkgf-backdrop"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog" aria-modal="true" aria-label={title}
    >
      <div className="pkgf-modal">
        <div className="pkgf-frame">
          <div className="pkgf-band">
            <span className="pkgf-title">{title}</span>
            <button type="button" className="pkgf-close" onClick={onClose} aria-label="Close">×</button>
          </div>
          <div className="pkgf-body">
            <div className="pkgf-hint pkgf-hint--lead">
              Choose from the materials you've saved. Nothing new is created here. Only the covering
              letter is required — send what each agency asks for.
            </div>

            <div className="pkgf-fld">
              <label htmlFor="pkgf-pkg-name">Package name</label>
              <input id="pkgf-pkg-name" type="text" autoComplete="off"
                     value={name} onChange={(e) => setName(e.target.value)} />
              <div className="pkgf-sub">e.g. Standard UK, Comps-led variant, US agencies.</div>
            </div>

            <div className="pkgf-fld">
              <label htmlFor="pkgf-pkg-letter">
                {TYPE_META[ComponentType.QUERY_LETTER].label}
                <span className="pkgf-opt">Required</span>
              </label>
              <select id="pkgf-pkg-letter" value={letterId} onChange={(e) => setLetterId(e.target.value)}>
                {/* ⚠️ NO `Not included` HERE — the letter is the one thing every package carries. */}
                {letters.map((v) => <option key={v.id} value={v.id}>{v.versionName}</option>)}
              </select>
              {noLetter && (
                <div className="pkgf-sub">
                  Save a covering letter first — every package needs one.
                </div>
              )}
            </div>

            <div className="pkgf-fld">
              <label htmlFor="pkgf-pkg-synopsis">
                {TYPE_META[ComponentType.SYNOPSIS].label}
                <span className="pkgf-opt">Optional</span>
              </label>
              <select id="pkgf-pkg-synopsis" value={synopsisId} onChange={(e) => setSynopsisId(e.target.value)}>
                {synopses.map((v) => <option key={v.id} value={v.id}>{v.versionName}</option>)}
                {/* ⚠️ LAST, NOT FIRST. A synopsis is the usual second material, so the stated
                    omission sits below the real choices rather than heading them. */}
                <option value="">{NOT_INCLUDED}</option>
              </select>
            </div>

            <div className="pkgf-fld">
              <label htmlFor="pkgf-pkg-sample">
                {TYPE_META[ComponentType.SAMPLE_PAGES].label}
                <span className="pkgf-opt">Optional</span>
              </label>
              <select id="pkgf-pkg-sample" value={sampleId} onChange={(e) => setSampleId(e.target.value)}>
                {/* the ref's own ordering for this slot — omission heads it, because a sample is the
                    material most often left out */}
                <option value="">{NOT_INCLUDED}</option>
                {samples.map((v) => <option key={v.id} value={v.id}>{v.versionName}</option>)}
              </select>
            </div>

            <div className="pkgf-fld">
              <label htmlFor="pkgf-pkg-other">
                Other
                <span className="pkgf-opt">Optional · free text</span>
              </label>
              <input id="pkgf-pkg-other" type="text" autoComplete="off" maxLength={OTHER_MAX}
                     placeholder="e.g. chapter outline, author bio, pitch document"
                     value={other} onChange={(e) => setOther(e.target.value)} />
              <div className="pkgf-sub">
                Anything an agency asks for that isn't one of the three above. Recorded with the
                package so replies still trace back to it.
              </div>
            </div>

            {/* Live composition line — what this package actually sends. */}
            <div className="pkgf-comp">
              THIS PACKAGE SENDS &nbsp;→&nbsp;{" "}
              {sends.length
                ? sends.map((n, i) => <React.Fragment key={i}>{i > 0 ? " · " : ""}<b>{n}</b></React.Fragment>)
                : <i>nothing yet</i>}
            </div>

            {/* A refusal is SHOWN, and the draft survives it. */}
            {error && <div className="pkgf-error" role="alert">{error}</div>}

            <div className="pkgf-actions">
              <button type="button" className="pkgf-btn" onClick={onClose}>Cancel</button>
              <button
                type="button" className="pkgf-btn pkgf-btn--primary" disabled={saving || noLetter}
                onClick={async () => {
                  setSaving(true);
                  setError(null);
                  const err = await onSave({
                    name, letterId,
                    /* `""` rather than an absent key — isValidPackage requires all three */
                    synopsisId: synopsisId || UNFILLED_SLOT,
                    sampleId: sampleId || UNFILLED_SLOT,
                    otherMaterials: other.trim(),
                  });
                  setSaving(false);
                  if (err) setError(err);
                }}
              >
                {saving ? "Saving…" : editing ? "Save changes" : "Save package"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
