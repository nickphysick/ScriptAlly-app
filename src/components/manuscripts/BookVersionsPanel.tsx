/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE VERSIONS PANEL — where the vocabulary is defined ══════════════════════════════════════
 *
 * Design authority: design-refs/manuscript-loop-design.html §2.
 *
 * ⚠️ ONE PLACE THE NAMES ARE TYPED, AND EVERYWHERE ELSE THEY ARE SELECTED. That is the panel's
 * whole job: a sample's "From version" is a dropdown, a send's is a dropdown, and neither offers a
 * text field — so the drift free text invites ("Prologue-first" against "prologue first") cannot
 * happen. Anything that lets a version name be typed on another surface breaks this.
 *
 * ⚠️ THE LIST APPEARS AT TWO VERSIONS (D8), AND THE GHOST APPEARS BEFORE IT — A DELIBERATE
 * DEVIATION, FLAGGED. The pack says the panel renders only when a second version exists, and the
 * fence says a writer with one version sees none of it. Both are honoured for the LIST. But this
 * panel is the only place a version can be created, so a gate at two with no door below it makes
 * the feature unreachable: nobody could ever reach a second version. The ghost row is therefore the
 * entry point at nought and one, and the list, the chips and the counts arrive at two. See F-AZ in
 * reports/manuscript-versions.md — moving the entry point elsewhere is a one-line change.
 *
 * ⚠️ NOTHING HERE RANKS. "Latest" is the newest by date and says nothing about which opening works;
 * there is no recommendation, no ordering by performance, and no verb anywhere on the panel telling
 * the writer what to do next. The counts are counts.
 */
import React, { useState } from "react";
import type { Activity, BookVersion, BookVersionKind, ManuscriptVersion, Query } from "../../types";
import {
  KIND_LABEL, BOOK_VERSION_KINDS, versionsActive, latestVersion, rrLink,
  appendBookVersion, newBookVersionId as newId, renameBookVersion, samplesOfVersion, holdings, versionMeta,
} from "../../lib/bookVersions";
import "./bookVersions.css";

/**
 * `MAR 2026` — month and year, uppercase, from a date-only "YYYY-MM-DD".
 *
 * ⚠️ PARSED BY HAND, NOT THROUGH `new Date()`. A date-only string is parsed as UTC midnight, so a
 * browser west of Greenwich renders the PREVIOUS month for the first of any month. The app's other
 * day-granular fields avoid this the same way — a string compare, never a Date round-trip.
 */
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
export const monthYear = (iso: string): string => {
  const m = /^(\d{4})-(\d{2})/.exec(iso);
  if (!m) return "";
  return `${MONTHS[Number(m[2]) - 1] ?? ""} ${m[1]}`.trim();
};

/** A new id, on the app's existing shape for client-generated ids. */


export interface BookVersionsPanelProps {
  versions: readonly BookVersion[];
  /** Material versions — the sample-pages ones are what `N samples` counts. */
  materials: readonly ManuscriptVersion[];
  queries: readonly Query[];
  activities: readonly Activity[];
  /** Today, date-only, so a new version is stamped in the writer's own calendar. */
  today: string;
  onSave: (next: BookVersion[]) => void;
  /**
   * ⚠️ DROPS THE PANEL'S OWN BAND, for a host that already names it. The book profile's Versions
   * pane puts this inside a capped card whose cap reads `Versions · Pro · 3`; leaving the band on
   * would say "Versions" twice, three inches apart, with two counts to keep in step. Nothing else
   * changes — the list, the rename affordance and the create door are the same, because this is
   * still the only place a version name is typed.
   */
  hideBand?: boolean;
}

interface DraftState {
  /** The version being renamed, or null for a new one. */
  id: string | null;
  name: string;
  kind: BookVersionKind;
  note: string;
}

export const BookVersionsPanel: React.FC<BookVersionsPanelProps> = ({
  versions, materials, queries, activities, today, onSave, hideBand = false,
}) => {
  const [draft, setDraft] = useState<DraftState | null>(null);
  const showList = versionsActive({ bookVersions: versions as BookVersion[] });
  const latest = latestVersion(versions);
  const held = holdings(queries, activities);

  const commit = () => {
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) return;
    onSave(
      draft.id
        ? renameBookVersion(versions, draft.id, name, draft.note)
        : appendBookVersion(versions, {
            id: newId(), name, kind: draft.kind, createdDate: today,
            ...(draft.note.trim() ? { note: draft.note.trim() } : {}),
          }),
    );
    setDraft(null);
  };

  const form = (
    <div className="bv-form">
      <label className="bv-fld">
        <span>Name</span>
        <input
          type="text" value={draft?.name ?? ""} autoFocus
          placeholder="Prologue-first"
          onChange={(e) => setDraft((d) => (d ? { ...d, name: e.target.value } : d))}
        />
      </label>
      {/* ⚠️ KIND IS SET ONCE, AT CREATION. It is a fact about what this version IS, and a rename is
          a change to its label — see `renameBookVersion`, which touches neither kind nor date. */}
      {draft?.id === null && (
        <label className="bv-fld">
          <span>Kind</span>
          <select
            value={draft.kind}
            onChange={(e) => setDraft((d) => (d ? { ...d, kind: e.target.value as BookVersionKind } : d))}
          >
            {BOOK_VERSION_KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
          </select>
        </label>
      )}
      <label className="bv-fld">
        <span>Note<em>Optional</em></span>
        <textarea
          rows={2} value={draft?.note ?? ""}
          placeholder="What changed, in your own words."
          onChange={(e) => setDraft((d) => (d ? { ...d, note: e.target.value } : d))}
        />
      </label>
      <div className="bv-formacts">
        <button type="button" className="bv-cancel" onClick={() => setDraft(null)}>Cancel</button>
        <button type="button" className="bv-save" onClick={commit} disabled={!draft?.name.trim()}>
          {draft?.id ? "Save" : "Add version"}
        </button>
      </div>
    </div>
  );

  const ghost = (
    <button type="button" className="bv-ghost"
            onClick={() => setDraft({ id: null, name: "", kind: versions.length === 0 ? "initial" : "reordering", note: "" })}>
      <span className="bv-ghost-t">Add a version</span>
    </button>
  );

  /* ⚠️ BELOW TWO, THE GHOST IS THE WHOLE PANEL — no band, no list, no count. See the note at the
     top of this file: the door has to exist below the gate or nothing can pass it. */
  if (!showList) {
    return <section className="bv-panel bv-panel--bare">{draft ? form : ghost}</section>;
  }

  return (
    <section className={`bv-panel${hideBand ? " bv-panel--hosted" : ""}`}>
      {!hideBand && (
        <div className="bv-band">
          <span className="bv-eyebrow">Versions</span>
          <span className="bv-count">{versions.length}</span>
        </div>
      )}
      <div className="bv-body">
        {versions.map((v) => {
          const rr = rrLink(v, activities);
          const meta = versionMeta(
            samplesOfVersion(v.id, materials).length,
            held.filter((h) => h.versionId === v.id).length,
          );
          return (
            <div className="bv-row" key={v.id}>
              {/* The name is the rename affordance — the only edit this model has (D9). */}
              <button type="button" className="bv-name"
                      title={`Rename ${v.name}`}
                      onClick={() => setDraft({ id: v.id, name: v.name, kind: v.kind, note: v.note ?? "" })}>
                {v.name}
              </button>
              {/**
                * ⚠️ THE R&R CHIP STANDS IN PLACE OF THE KIND CHIP, per the ref — "From R&R" already
                * says it is a revision, and two chips saying one thing is noise. It renders only
                * while the activity is still there; a link to a deleted or re-filed event shows
                * nothing rather than a dead chip.
                */}
              {rr
                ? <span className="bv-chip bv-chip--rr"><span aria-hidden="true">§</span>From R&amp;R</span>
                : <span className="bv-chip bv-chip--kind">{KIND_LABEL[v.kind]}</span>}
              {/* ⚠️ A DATE FACT, NOT A VERDICT (D10). It says which one you made most recently. */}
              {latest?.id === v.id && <span className="bv-chip bv-chip--latest">Latest</span>}
              <span className="bv-meta">
                <span>{monthYear(v.createdDate)}</span>
                {meta.map((m) => <span key={m}>{m}</span>)}
              </span>
              {v.note && <span className="bv-note">{v.note}</span>}
            </div>
          );
        })}
        {draft ? form : ghost}
      </div>
    </section>
  );
};
