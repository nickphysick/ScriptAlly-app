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
 * ⚠️ ITS CONTENTS ARE DISPLAY ONLY; ITS POINTER IS NOT (Ruling 1, superseding D-C6's blanket form).
 * The strip offers no way to edit what is INSIDE the package — no `+ Attach`, no per-chip `×` —
 * because those contents are shared and, once sent, immutable. It does offer `Change package` and
 * `Remove`, because which package THIS query points at is this query's own field and can be
 * mistaken like any other.
 *
 * The earlier blanket "adds no edit affordance" is deleted rather than left standing: it described
 * a build where the pointer had no home, and a comment arguing the opposite of the code is how the
 * next person "restores" a bug.
 */
import React from "react";
import { IllustrationSlot } from "../packages/IllustrationSlot";
import { packageDrift, driftNote, asSentLabel, type MaterialGroup } from "../../lib/packageAttach";
import { LOCKED_NOTE } from "../../lib/packageMetrics";
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
  /**
   * ⚠️ POINTER CONTROLS, NOT CONTENT CONTROLS (Ruling 1). Which package this query points at is
   * THIS QUERY'S OWN FIELD and stays correctable like any other; the package's CONTENTS are shared
   * and, once sent, immutable. Both facts show at once — they are not alternatives, and the ref's
   * `foot-unsent` / `foot-sent` branch has no reachable state in this app because every query
   * record is a send.
   *
   * ⚠️ THEY JOIN A `title` GRAMMAR THAT IS ALREADY CONSISTENT AND A VISUAL ONE THAT IS NOT — measured,
   * not assumed. Every in-place control in the pane opens with "Change …", and these two follow it.
   * But the pane does NOT have one look to match: the two stat cells (`.qp-stat--edit`) are 13px ink
   * with no line, the send method (`.qp-inplace`) is 12.5px grey with a dashed line, and these take
   * the dashed line at the strip's own 7.5px mono in ink. **Three treatments, of which two predate
   * this pack.** An earlier draft of this comment claimed a single grammar and is deleted rather
   * than softened — it would have been quoted forward as though the set were already tidy.
   *
   * ⚠️ NOT RESTYLED HERE, DELIBERATELY (F-Y). Picking one of the three is a judgement about the whole
   * pane, not about this control, and making it silently inside a packages change is how a pane ends
   * up with a fourth treatment. Reported in reports/packages-two-state.md for Nick's ruling.
   */
  onChangePackage?: () => void;
  onRemovePackage?: () => void;
  /** Stamped sent — its contents are fixed. Shown, never used to hide the pointer controls. */
  locked?: boolean;
  children: React.ReactNode;
}

export const PackageGroup: React.FC<PackageGroupProps> = ({
  group, live, sent, sentDate, onView, onChangePackage, onRemovePackage, locked, children,
}) => {
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

      {/**
        * ⚠️ ONE FOOTER, BOTH FACTS (Ruling 1). The lock explains why the CONTENTS cannot change; the
        * pointer controls change which package this query used. A branch showing one or the other
        * would make correcting a mis-attached package impossible on exactly the sends that matter.
        */}
      {(locked || onChangePackage || onRemovePackage) && (
        <div className="qc-strip-foot">
          {locked && (
            <span className="qc-strip-lock">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
              {LOCKED_NOTE}
            </span>
          )}
          <span className="qc-strip-ptrs">
            {onChangePackage && (
              <button type="button" className="qp-inplace qc-strip-ptr" onClick={onChangePackage}
                      title="Change which package this query used">Change package</button>
            )}
            {onRemovePackage && (
              <button type="button" className="qp-inplace qc-strip-ptr" onClick={onRemovePackage}
                      title="Change this query to carry no package">Remove</button>
            )}
          </span>
        </div>
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
