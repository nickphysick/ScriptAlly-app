/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The package builder — pick one of each saved material and name the combination.
 * Design authority: design-refs/submission-packages-flow.html.
 *
 * ⚠️ IT CREATES NOTHING NEW (D5). Every dropdown lists materials the writer has already saved; there
 * is no "+ new material" shortcut inside it, and the opening hint says so in as many words. A
 * builder that could also author its contents would give materials two creation paths whose drafts
 * could diverge — and the modal that owns authoring is one Escape away.
 *
 * ⚠️ THE SAMPLE SLOT IS OPTIONAL AND ITS EMPTY VALUE IS `""`, NOT AN ABSENT KEY. `isValidPackage`
 * REQUIRES all three slot keys to be present, so a package with no sample must send the
 * `UNFILLED_SLOT` sentinel — omitting the key fails the rule outright. That is the one place on this
 * page where `deleteField()` would be wrong, and it is why the brief's "never a placeholder" rule is
 * read as being about MATERIALS' optional fields rather than package slots.
 */
import React, { useMemo, useState } from "react";
import { ComponentType, ManuscriptVersion, SubmissionPackage } from "../../types";
import { ofType } from "../../lib/materialDraft";
import { UNFILLED_SLOT, isSlotFilled } from "../../lib/packageMetrics";
import { TYPE_META } from "./typeMeta";
import "./packagesFlow.css";

export interface PackageDraftResult {
  name: string;
  letterId: string;
  synopsisId: string;
  /** `""` when no sample — the sentinel `isValidPackage` requires. */
  sampleId: string;
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
  const [synopsisId, setSynopsisId] = useState(editing?.synopsisVersionId || synopses[0]?.id || "");
  const [sampleId, setSampleId] = useState(
    editing ? (isSlotFilled(editing.samplePagesVersionId) ? editing.samplePagesVersionId : "") : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const nameOf = (id: string) => versions.find((v) => v.id === id)?.versionName ?? "—";
  const title = editing ? "Edit package" : "Build a package";

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
              Choose one of each from the materials you've saved. Nothing new is created here.
            </div>

            <div className="pkgf-fld">
              <label htmlFor="pkgf-pkg-name">Package name</label>
              <input id="pkgf-pkg-name" type="text" autoComplete="off"
                     value={name} onChange={(e) => setName(e.target.value)} />
              <div className="pkgf-sub">e.g. Standard UK, Comps-led variant, US agencies.</div>
            </div>

            <div className="pkgf-fld">
              <label htmlFor="pkgf-pkg-letter">{TYPE_META[ComponentType.QUERY_LETTER].label}</label>
              <select id="pkgf-pkg-letter" value={letterId} onChange={(e) => setLetterId(e.target.value)}>
                {letters.map((v) => <option key={v.id} value={v.id}>{v.versionName}</option>)}
              </select>
            </div>

            <div className="pkgf-fld">
              <label htmlFor="pkgf-pkg-synopsis">{TYPE_META[ComponentType.SYNOPSIS].label}</label>
              <select id="pkgf-pkg-synopsis" value={synopsisId} onChange={(e) => setSynopsisId(e.target.value)}>
                {synopses.map((v) => <option key={v.id} value={v.id}>{v.versionName}</option>)}
              </select>
            </div>

            <div className="pkgf-fld">
              <label htmlFor="pkgf-pkg-sample">{TYPE_META[ComponentType.SAMPLE_PAGES].label}</label>
              <select id="pkgf-pkg-sample" value={sampleId} onChange={(e) => setSampleId(e.target.value)}>
                {/* the ref's own wording for the empty slot — a stated choice, not a blank */}
                <option value="">Not included</option>
                {samples.map((v) => <option key={v.id} value={v.id}>{v.versionName}</option>)}
              </select>
              <div className="pkgf-sub">
                Optional — some agents ask for the letter alone or letter and synopsis.
              </div>
            </div>

            {/* Live composition line — what this package actually sends. */}
            <div className="pkgf-comp">
              THIS PACKAGE SENDS &nbsp;→&nbsp; <b>{nameOf(letterId)}</b> · <b>{nameOf(synopsisId)}</b>
              {sampleId ? <> · <b>{nameOf(sampleId)}</b></> : null}
            </div>

            {/* A refusal is SHOWN, and the draft survives it. */}
            {error && <div className="pkgf-error" role="alert">{error}</div>}

            <div className="pkgf-actions">
              <button type="button" className="pkgf-btn" onClick={onClose}>Cancel</button>
              <button
                type="button" className="pkgf-btn pkgf-btn--primary" disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  setError(null);
                  const err = await onSave({
                    name, letterId, synopsisId,
                    /* `""` rather than an absent key — isValidPackage requires all three */
                    sampleId: sampleId || UNFILLED_SLOT,
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
