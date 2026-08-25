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
import type { QueryMaterial, SubmissionPackage } from "../../types";
import "./packageGroup.css";

/** Slot A — the parcel, on pastille blue. Shared library, shared plate, one stroke rule. */
export const PARCEL_SLOT = "parcel";
/* ⚠️ `SHEETS_SLOT` IS GONE (D8). It named the loose row's dashed plate, which rendered empty and
   is retired — loose materials are not an object needing an emblem. `PARCEL_SLOT` stays: the
   packaged strip IS one. */
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
  /* ⚠️ NO `locked` PROP. It drove the retired notice and nothing else (D11); leaving it accepted
     and unread is how a caller ends up passing state that silently goes nowhere. */
  children: React.ReactNode;
}

export const PackageGroup: React.FC<PackageGroupProps> = ({
  group, live, sent, sentDate, onView, onChangePackage, onRemovePackage, children,
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
      {/**
        * ⚠️ THE LOCK NOTICE IS GONE FROM HERE (D11), AND THE POINTER CONTROLS STAY (D12). It read
        * "Locked — this package has been sent" and explained a rule at the moment it is least
        * relevant: nobody edits a package's contents from a query's timeline, so the sentence
        * answered a question the writer was not asking.
        *
        * ⚠️ IT IS STILL EXPLAINED WHERE EDITING HAPPENS — verified before removing, not after: the
        * packages card renders `LOCKED_NOTE` + `LOCKED_WHY` (`PackagesBand`), and the drawer's
        * "Worth knowing" says a sent package's contents stop changing. Nothing was lost.
        */}
      {(onChangePackage || onRemovePackage) && (
        <div className="qc-strip-foot">
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

/**
 * ══ LOOSE MATERIALS — the pills, and nothing else (ref §2, stripped D7/D8) ═══════════════════
 *
 * ⚠️ NO ILLUSTRATION SLOT (D8). The row carried a dashed `sheets` plate that rendered EMPTY on the
 * live page, and loose materials are not an object needing an emblem. The packaged strip has a
 * parcel and a seal because it IS one — a named, contained thing — and the contrast between the two
 * rows is the design. Giving both an emblem erases the distinction the slot exists to draw.
 *
 * ⚠️ NO `Save as package ›` (D7). Building a package is packages-page work; offering it inside a
 * record of what was sent is a conversion nudge in a place reserved for facts. The Attach menu
 * already reaches the packages page for anyone who wants one.
 *
 * ⚠️ AND STILL NO BORDER, FILL OR RADIUS. Anything that boxes this row turns "different" into
 * "lesser", which is the one reading the design forbids: a package is a convenience, not a status.
 */
export const LooseMaterials: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="qc-loose">{children}</div>
);

