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
import { BookVersion, BookVersionKind, ComponentType, ManuscriptVersion, SubmissionPackage } from "../../types";
import { BOOK_VERSION_KINDS, KIND_LABEL } from "../../lib/bookVersions";
import { ofType } from "../../lib/materialDraft";
import { UNFILLED_SLOT, isSlotFilled, OTHER_MAX, duplicateName } from "../../lib/packageMetrics";
import { TYPE_META } from "./typeMeta";
import "./packagesFlow.css";

/** The ref's own wording for a slot the writer has deliberately left out. */
export const NOT_INCLUDED = "Not included";

/** The version slot's own wording for "the writer has not said". Permanent, not transitional (D3). */
export const NOT_RECORDED = "Not recorded";
/** The foot of the version list. Full-width so it cannot be mistaken for a version called "New". */
export const NEW_VERSION = "＋ New version…";

export interface PackageDraftResult {
  name: string;
  letterId: string;
  /** `""` when no synopsis — the sentinel `isValidPackage` requires. */
  synopsisId: string;
  /**
   * ⚠️ CARRIED, NOT CHOSEN (D9). The builder no longer offers a sample slot; this is whatever the
   * package already held, passed straight back so an edit does not silently drop it. A sent
   * package's slots are frozen by the rules anyway, but an UNLOCKED one would otherwise lose its
   * sample the first time somebody renamed it — a data change nobody asked for, from a form that
   * no longer shows the field.
   */
  sampleId: string;
  /** A `BookVersion.id`, or `""` for `Not recorded` — which is permanent, not transitional (D3). */
  bookVersionId: string;
  /** Free text, or `""` to leave it unset. Never stored as `""` — `updatePackage` unsets it. */
  otherMaterials: string;
}

export interface PackageModalProps {
  /** The package being edited, or null to build a new one. */
  editing: SubmissionPackage | null;
  /**
   * ⚠️ DUPLICATE & EDIT — the way forward from a locked package (D-D2), and it ships WITH the lock
   * rather than after it. A rule that freezes a sent package and offers nothing in its place is not
   * a rule, it is a dead end: the writer wanted a different combination and the app simply refuses.
   *
   * ⚠️ IT IS A CREATE, NOT AN EDIT. The source package's slots seed the form and `editing` stays
   * null, so Save writes a NEW document and the sent one is untouched — which is the whole point.
   */
  duplicating?: SubmissionPackage | null;
  /** Existing names, so the duplicate can pick one that is free. */
  existingNames?: readonly string[];
  versions: ManuscriptVersion[];
  /** The manuscript's orderings — the third slot's options. */
  bookVersions: readonly BookVersion[];
  /**
   * ⚠️ `＋ New version…` CREATES ON THE MANUSCRIPT, not on the package — that is what the copy
   * promises ("Versions live on your manuscript — create one here and it's added there too") and it
   * is the only honest place for it, since two packages testing the same ordering must name the
   * same record. Resolves to the new id so the select can land on it; null means the write failed
   * and the select falls back, rather than pointing at an id that does not exist.
   */
  onCreateVersion: (name: string, kind: BookVersionKind) => Promise<string | null>;
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
  editing, duplicating, existingNames = [], versions, bookVersions, packageCount,
  onClose, onSave, onCreateVersion,
}) => {
  /* The record the form OPENS on — the one being edited, or the one being copied. */
  const seed = editing ?? duplicating ?? null;
  const letters = useMemo(() => ofType(versions, ComponentType.QUERY_LETTER), [versions]);
  const synopses = useMemo(() => ofType(versions, ComponentType.SYNOPSIS), [versions]);
  const samples = useMemo(() => ofType(versions, ComponentType.SAMPLE_PAGES), [versions]);

  const [name, setName] = useState(
    editing ? editing.packageName
      : duplicating ? duplicateName(duplicating.packageName, existingNames)
        : packageCount === 0 ? "Standard UK" : `Variant ${packageCount + 1}`,
  );
  const [letterId, setLetterId] = useState(seed?.queryLetterVersionId || letters[0]?.id || "");
  /**
   * ⚠️ NOT SEEDED FROM `bookVersions[0]` — absent means the writer has not said, and picking the
   * first one for them would state a shape the record does not carry. Same fabricated-value rule
   * the synopsis slot already follows one line down.
   */
  const [bookVersionId, setBookVersionId] = useState(seed?.bookVersionId ?? "");
  const [newVersionName, setNewVersionName] = useState("");
  /**
   * ⚠️ THE KIND IS ASKED FOR, NOT ASSUMED. `BookVersionKind` has no neutral member, so defaulting
   * it would write "this is a revision" about an ordering the writer never described that way —
   * the same fabricated-value fault the synopsis and version slots avoid by staying empty. The
   * panel's own ghost row asks; so does this.
   */
  const [newVersionKind, setNewVersionKind] = useState<BookVersionKind>(BOOK_VERSION_KINDS[0]);
  const [creatingVersion, setCreatingVersion] = useState(false);
  /**
   * ⚠️ AN EXISTING PACKAGE'S EMPTY SLOT STAYS EMPTY. Seeding from `synopses[0]` on edit would
   * silently re-fill a slot the writer had chosen to leave out — the same fabricated-value fault as
   * a default branch that writes. Only a NEW package takes a first-listed default.
   */
  const [synopsisId, setSynopsisId] = useState(
    seed ? (isSlotFilled(seed.synopsisVersionId) ? seed.synopsisVersionId : "") : synopses[0]?.id || "",
  );
  const [sampleId, setSampleId] = useState(
    seed ? (isSlotFilled(seed.samplePagesVersionId) ? seed.samplePagesVersionId : "") : "",
  );
  const [other, setOther] = useState(seed?.otherMaterials ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const nameOf = (id: string) => versions.find((v) => v.id === id)?.versionName ?? "—";
  const title = editing ? "Edit package" : duplicating ? "Duplicate package" : "Build a package";

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

            {/* ⚠️ THE THIRD SLOT IS THE VERSION, AND IT REPLACED THE SAMPLE RATHER THAN JOINING IT.
                A package is a covering letter, a synopsis and the shape of the book they are
                testing; the portion that went is the QUERY's fact and lives there (Part B). */}
            <div className="pkgf-fld">
              <label htmlFor="pkgf-pkg-version">
                Version
                <span className="pkgf-opt">Optional</span>
              </label>
              <select
                id="pkgf-pkg-version" value={creatingVersion ? NEW_VERSION : bookVersionId}
                onChange={(e) => {
                  if (e.target.value === NEW_VERSION) { setCreatingVersion(true); return; }
                  setCreatingVersion(false);
                  setBookVersionId(e.target.value);
                }}
              >
                {bookVersions.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                {/* ⚠️ `Not recorded` IS A STANDING OPTION, NOT A PLACEHOLDER. Every package written
                    before this field has none and a sent one can never gain one, so this is where
                    a great many packages stay for good. */}
                <option value="">{NOT_RECORDED}</option>
                <option value={NEW_VERSION}>{NEW_VERSION}</option>
              </select>
              {creatingVersion && (
                <div className="pkgf-newver">
                  <input
                    type="text" autoFocus autoComplete="off" maxLength={80}
                    placeholder="Prologue-first"
                    value={newVersionName}
                    onChange={(e) => setNewVersionName(e.target.value)}
                  />
                  <select
                    aria-label="Kind of version" value={newVersionKind}
                    onChange={(e) => setNewVersionKind(e.target.value as BookVersionKind)}
                  >
                    {BOOK_VERSION_KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
                  </select>
                  <button
                    type="button" className="pkgf-btn" disabled={!newVersionName.trim()}
                    onClick={async () => {
                      const id = await onCreateVersion(newVersionName.trim(), newVersionKind);
                      /* ⚠️ ONLY SELECT IT IF IT WAS ACTUALLY WRITTEN. A failed create that still
                         moved the select would point the package at an id the manuscript does not
                         have, and the ledger would render a version nobody could open. */
                      if (id) { setBookVersionId(id); setNewVersionName(""); setCreatingVersion(false); }
                    }}
                  >Add</button>
                  <button
                    type="button" className="pkgf-btn"
                    onClick={() => { setCreatingVersion(false); setNewVersionName(""); }}
                  >Cancel</button>
                </div>
              )}
              <div className="pkgf-sub">
                Which shape of the manuscript this package is testing. Versions live on your
                manuscript — create one here and it's added there too.
              </div>
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
                    /* carried, not chosen — see `sampleId` on PackageDraftResult */
                    sampleId: seed?.samplePagesVersionId || UNFILLED_SLOT,
                    bookVersionId,
                    otherMaterials: other.trim(),
                  });
                  setSaving(false);
                  if (err) setError(err);
                }}
              >
                {saving ? "Saving…" : editing ? "Save changes" : duplicating ? "Save as a new package" : "Save package"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
