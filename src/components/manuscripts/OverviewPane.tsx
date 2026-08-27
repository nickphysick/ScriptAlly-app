/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE BOOK PROFILE — Overview ═══════════════════════════════════════════════════════════════
 *
 * The pitch, the five figures, and who is holding something right now.
 * Reference: `design-refs/manuscripts-book-profile.html`, `#pane-overview`.
 *
 * ⚠️ EVERY FIGURE IS DERIVED AT READ TIME. Nothing here is stored, cached or written back, and
 * nothing on this page goes near `recomputeQuery`.
 *
 * ⚠️ THE PITCH IS EDITABLE NOW, AND IT TOOK A RULES LINE TO GET THERE. `Manuscript.elevatorPitch`
 * has existed on the type since the pitch shelf and was never in the manuscript-update allowlist, so
 * every write of it was denied in SILENCE (the affectedKeys gotcha). This pane held the card
 * read-only for exactly that reason, with a lock that read `firestore.rules`. The allowlist carries
 * it now — the lock is inverted rather than deleted, so it fails if the line is ever removed.
 *
 * ⚠️ NO CONTAINER ON THE PITCH. Two large Playfair quotation marks and the words between them; the
 * capped card is gone. It is the one thing on this page the writer composed rather than the app
 * derived, and a frame made it look like another panel of figures.
 *
 * ⚠️ AND `Who holds what` HAS LEFT THIS PANE ENTIRELY. It is "Out with agents now" on Journey, which
 * is the same table; keeping both would be one fact with two homes that disagree the moment either
 * moves. Overview is pitch → synopsis now.
 */
import React, { useState } from "react";
import { SectionHeader } from "../containers/SectionHeader";
import { InlineText } from "../containers/InlineText";
import { PITCH_PLACEHOLDER, SYNOPSIS_PLACEHOLDER, SYNOPSIS_NOTE, ATTACHMENTS_NOTE, ATTACHMENTS_EMPTY_META } from "../../lib/manuscriptProfile";
import "./bookProfile.css";

export interface OverviewPaneProps {
  /** The elevator pitch, or null when it has not been written. */
  pitch: string | null;
  /** `38 words`, or null where there is no pitch to measure. */
  pitchMeta: string | null;
  onSavePitch: (next: string) => void;
  /** The writer's working synopsis, or null. NOT the packages synopsis materials. */
  synopsis: string | null;
  synopsisMeta: string | null;
  onSaveSynopsis: (next: string) => void;
}

export const OverviewPane: React.FC<OverviewPaneProps> = ({
  pitch, pitchMeta, onSavePitch, synopsis, synopsisMeta, onSaveSynopsis,
}) => {
  /* Component state, deliberately: a clamp is a reading convenience, not a preference to persist. */
  const [synOpen, setSynOpen] = useState(false);
  /* ⚠️ NOT `0 files`. There is nothing to count yet — a count of nought here would state that the
     feature has run and found none, when it has not run at all. */
  const attachmentsMeta = ATTACHMENTS_EMPTY_META;
  return (
  <div className="msp-ovgrid">
    <div className="msp-ovmain">
    <div className="msp-blk">
      <SectionHeader title="The pitch" meta={pitchMeta ?? "Not written yet"} />
      {/* ⚠️ THE CLOSING MARK IS BOTTOM-ALIGNED, which is what makes the pair read as quotation rather
          than as two decorations — `align-self: flex-end` on it, `flex-start` on the row. */}
      <div className="msp-pitchwrap">
        <span className="msp-qmark" aria-hidden="true">&ldquo;</span>
        <InlineText
          className="msp-pitchtext"
          value={pitch}
          placeholder={PITCH_PLACEHOLDER}
          onCommit={onSavePitch}
          ariaLabel="Elevator pitch"
          rows={2}
        />
        <span className="msp-qmark close" aria-hidden="true">&rdquo;</span>
      </div>
    </div>

    <div className="msp-blk">
      <SectionHeader title="The synopsis" meta={synopsisMeta ?? "Not written yet"} />
      <div className="msp-synbox">
        {/* ⚠️ CLAMPED WITH A MASK, NOT A CROP — the fade says there is more rather than ending the
            text at an arbitrary line. Expanding is the writer's, and it is remembered nowhere:
            a clamp is a reading convenience, not a preference. */}
        <div className={`msp-synclamp${synOpen ? " open" : ""}`}>
          <InlineText
            className="msp-syntext"
            value={synopsis}
            placeholder={SYNOPSIS_PLACEHOLDER}
            onCommit={onSaveSynopsis}
            ariaLabel="Synopsis"
            rows={4}
          />
        </div>
        {synopsis && (
          <button type="button" className="msp-synmore" onClick={() => setSynOpen((o) => !o)}>
            {synOpen ? "Collapse" : "Expand"}
          </button>
        )}
      </div>
      <p className="msp-footnote">{SYNOPSIS_NOTE}</p>
    </div>
    </div>

    {/**
      * ⚠️ THE ATTACHMENTS PANEL RENDERS EMPTY, AND EMPTY IS THE HONEST STATE. Storage is not wired:
      * a bucket exists on dev, but there is no `storage.rules` in the repo, no `storage` block in
      * either firebase config, and no `firebase/storage` import anywhere in `src`. So the panel has
      * its cap, its footnote and a disabled add — and NO invented rows. A stubbed file list would be
      * a page stating that a writer has attachments they do not have.
      *
      * ⚠️ AND IT IS NOT `position: sticky` THIS PASS. A sticky offset here has to clear the pinned
      * masthead slab, and the grid no longer publishes its height — `--wpg-stuck-h` was measured,
      * found to have exactly one reader, and deleted with it. Restoring a shared-grid mechanism so
      * that an EMPTY panel can hold its place beside nothing is the wrong way round; it lands with
      * the rows, when there is something to stay alongside. `top: 0` was the alternative and is the
      * fault the brief names: the panel would slide under the slab.
      */}
    {/**
      * ⚠️ THE SAME GRAMMAR AS THE PITCH AND THE SYNOPSIS, WHICH IS A REMOVAL RATHER THAN A RESTYLE.
      * This was the only filled, capped, coloured element on a page of unboxed editorial content, so
      * it read as pasted in from somewhere else. It now uses `SectionHeader` — Playfair heading,
      * mono meta, full-width hairline — exactly as the two fields beside it do.
      *
      * ⚠️ AND IT STOPPED CALLING `CappedCard` RATHER THAN `CappedCard` BEING RESTYLED. That
      * component renders `CardBand`, which the packages page consumes in three places
      * (`PackagesBand`, `MaterialsBand`, `PackageDetailDrawer`); restyling either would have reached
      * a page this pass does not own. Removal reaches nothing, and the lock asserts both halves.
      *
      * ⚠️ ONE STEP SMALLER THAN THE FIELD HEADINGS, so it reads as subordinate rather than foreign.
      * The pitch and the synopsis are 23px; this is 19. Scoped `.sa-sechead.msp-attsec h2` at 0-2-1
      * so it wins on specificity rather than on stylesheet order — two single-class rules on one
      * element are decided by which sheet loaded last, which is how a value gets lost silently.
      */}
    <aside className="msp-ovside">
      <SectionHeader title="Attachments" meta={attachmentsMeta} className="msp-attsec" />

      {/* ⚠️ NO FABRICATED ROWS. Storage is unwired — no `storage.rules`, no `storage` block in
          either firebase config, no `firebase/storage` import in `src` — so a file row here would be
          the page stating that a writer has something they do not have. */}
      <p className="msp-empty">Nothing kept with this manuscript yet.</p>

      {/* Dashed means provisional, and disabled because there is nothing behind it yet. Rendered
          rather than hidden: the panel says what will live here and cannot pretend to act. */}
      <button type="button" className="msp-attadd" disabled>
        Add a file
      </button>

      <p className="msp-footnote">{ATTACHMENTS_NOTE}</p>
    </aside>
  </div>
  );
};
