/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE SENT STRIP — a packaged send is a contained object ════════════════════════════════════
 *
 * Design authority: design-refs/query-sent-strip-v2.html §1. **Supersedes refs 177/178's block
 * shape** — head row over items row — with the ref's single row: `slot · seal · chips`. The
 * behaviour underneath (drift states, the link, the pills being ordinary pills) is unchanged.
 *
 * ⚠️ THE DISTINCTION IS STRUCTURAL, SO THE EYE READS IT BEFORE THE WORDS. A package is CONTAINED —
 * a bordered, blue-filled strip with a parcel in the leading slot and the name on a seal. Loose
 * materials get no container at all (see `LooseMaterials`): sheets and chips directly on the pane.
 * That is the whole design. Making the loose case a lighter *box* would say "a weaker package",
 * which is the one thing it must not say — a package is a convenience, not a status.
 *
 * ⚠️ A GROUP AROUND ORDINARY PILLS, NOT A CONTAINER OF SPECIAL ONES. The children are built by the
 * page's own `attach()` helper and are identical to hand-attached materials — same markup, same
 * editor, same ×. The border says where they came from and nothing else; removing one does not
 * dissolve the group or "break" the package, because there is no package here to break. It means
 * the send no longer matches the template, which the meta line then says.
 *
 * ⚠️ BLUE MARKS THE PACKAGE, NEVER ITS CONTENTS. The rim, the seal, the slot's ground and the mark
 * take pastille blue; the pills inside take nothing. Colouring them would say they are a different
 * class of material that behaves differently, which is exactly what they are not.
 *
 * ⚠️ DISPLAY ONLY (D-C6). The strip adds no edit affordance, no menu and no click target beyond the
 * package NAME, which links to the package. Correction UI owns editing these rows; a second route
 * into the same edit would be a second place for the two to disagree. The separate `view` button
 * the block shape carried is retired into the name for that reason — one control, not two.
 */
import React from "react";
import { IllustrationSlot } from "../packages/IllustrationSlot";
import { packageDrift, driftNote, asSentLabel, type MaterialGroup } from "../../lib/packageAttach";
import type { QueryMaterial, SubmissionPackage } from "../../types";
import "./packageGroup.css";

/** Slot A — the parcel, on pastille blue. Shared library, shared plate, one stroke rule. */
export const PARCEL_SLOT = "parcel";
/** Slot B — loose sheets, on the bare pane. */
export const SHEETS_SLOT = "sheets";
/** Both marks render at 22px inside a 38px plate. The ref's constraint, and the artist's. */
export const STRIP_MARK_PX = 22;
export const STRIP_PLATE_PX = 38;

export interface PackageGroupProps {
  group: MaterialGroup;
  /** The package as it stands TODAY, or null when it has been deleted. */
  live: SubmissionPackage | null;
  /** The send's whole materials list — the drift is compared against what this package brought. */
  sent: readonly (string | QueryMaterial)[];
  /** The send's own date, for `As sent, 12 Aug`. */
  sentDate?: string;
  onView: () => void;
  children: React.ReactNode;
}

export const PackageGroup: React.FC<PackageGroupProps> = ({ group, live, sent, sentDate, onView, children }) => {
  /**
   * ⚠️ EACH STATE APPEARS ONLY WHEN TRUE, AND THERE IS NO "MATCHES" STATE. A group that still
   * matches its package says nothing at all — a marker confirming that nothing has happened is
   * noise on every send that is behaving normally, and it would train the eye to skip the line
   * that matters. `unknown` renders nothing for the same reason from the other direction: a send
   * with no version ids cannot be compared, and a guess would be a false alarm.
   */
  const { state, differing } = packageDrift(group, live, sent);

  /**
   * ⚠️ THE NAME IS THE ONE STORED ON THE ITEMS, not looked up live — it is a record of what was
   * sent, and it must outlive the package's deletion. A deleted package keeps its name and loses
   * only its link, because the name is the record and the link is the only part with nowhere to go.
   */
  const name = <span className="qc-strip-name">{group.packageName}</span>;

  return (
    <div className="qc-strip qc-strip--packed">
      <span className="qc-strip-slot">
        <IllustrationSlot
          icon={PARCEL_SLOT} px={STRIP_MARK_PX} shape="chip"
          width={STRIP_PLATE_PX} height={STRIP_PLATE_PX} id="strip-parcel"
        />
      </span>

      {/* ⚠️ THE LABEL SITS ABOVE THE NAME, mono over Playfair. It names the KIND of thing before the
          instance — which is what lets the strip be recognised at a glance without reading it. */}
      <span className="qc-strip-seal">
        <span className="qc-strip-lbl">Package</span>
        {live ? (
          <button type="button" className="qc-strip-open" onClick={onView}
                  title={`Open ${group.packageName}`}>
            {name}
          </button>
        ) : name}
        {/* Drift, and only when there is any. */}
        {state === "deleted" && <span className="qc-strip-state">Package no longer exists</span>}
        {state === "changed" && <span className="qc-strip-state">{asSentLabel(sentDate)}</span>}
      </span>

      <span className="qc-strip-items">{children}</span>

      {/* ⚠️ THE NOTE REPORTS; IT DOES NOT WARN. No blush, no icon, no amber — a package moving on is
          an ordinary thing that happens to templates, and the send is not damaged by it. */}
      {state === "changed" && differing.length > 0 && (
        <p className="qc-strip-note">{driftNote(differing)}</p>
      )}
    </div>
  );
};

export interface LooseMaterialsProps {
  /** The pills that came with the send but not from a package. */
  children: React.ReactNode;
  /**
   * Offered once, at the end of the row. Omitted entirely when there is nothing to promote or no
   * destination — never rendered inert.
   */
  onSaveAsPackage?: () => void;
}

/**
 * ══ LOOSE MATERIALS — no container at all (ref §2) ════════════════════════════════════════════
 *
 * ⚠️ NO STRIP, NO BORDER, NO FILL, NO "SENT" SLUG. Chips and a sheets plate float directly on the
 * pane. **Lighter than the packaged row, not lesser than it** — and the ref's own CSS is instructive
 * here: it defines a `.mslug` wrapper label and then never renders one, because a label would start
 * turning the floating row back into a box.
 *
 * ⚠️ THIS IS THE COMMON CASE, NOT THE EDGE CASE. A partial send is loose by nature — the agent
 * named what they wanted — so further down a query this is the shape most sends take.
 */
export const LooseMaterials: React.FC<LooseMaterialsProps> = ({ children, onSaveAsPackage }) => (
  <div className="qc-loose">
    <span className="qc-loose-slot">
      <IllustrationSlot
        icon={SHEETS_SLOT} px={STRIP_MARK_PX} shape="chip"
        width={STRIP_PLATE_PX} height={STRIP_PLATE_PX} id="strip-sheets"
      />
    </span>
    {children}
    {/* ⚠️ OFFERED ONCE, NEVER INSISTED ON (D-C4). No colour weight, no repetition, and no dismissal
        state stored — a thing you can ignore forever does not need somewhere to remember that you
        did. It sits at the END of the row, after the materials, where it can be passed over. */}
    {onSaveAsPackage && (
      <button type="button" className="qc-loose-promote" onClick={onSaveAsPackage}
              title="Open Submission packages to build one from these">
        Save as package ›
      </button>
    )}
  </div>
);
