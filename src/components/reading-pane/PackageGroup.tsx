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
import { packageDrift, driftNote, asSentLabel, type MaterialGroup } from "../../lib/packageAttach";
import PARCEL_MARK from "../../assets/packages/package-mark.png";
import type { QueryMaterial, SubmissionPackage } from "../../types";
import "./packageGroup.css";

/* ⚠️ `PARCEL_SLOT` IS GONE (D5) — it named a DASHED commission slot, and the band draws a solid
   15px glyph, which is an icon rather than an illustration. */
/* ⚠️ `SHEETS_SLOT` IS GONE (D8). It named the loose row's dashed plate, which rendered empty and
   is retired — loose materials are not an object needing an emblem. `PARCEL_SLOT` stays: the
   packaged strip IS one. */
/**
 * ⚠️ THE FIRST COMMISSIONED ASSET IN THE APP, and how it is added sets the pattern.
 *
 * It is IMPORTED from `src/assets/<area>/` rather than referenced from `public/` — the convention
 * every recent asset follows (shell, marketing, todo, journeys), which gives a hashed filename, a
 * build-time error if the file goes missing, and one folder per feature area. `public/` is the older
 * pile: brand one-offs referenced by URL, with spaces in their filenames. See F-BF in the report.
 */
export const PARCEL_PX = 24;

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
   * that matters. `unknown` renders nothing for the same reason from the other direction.
   */
  const { state, differing } = packageDrift(group, live, sent);

  return (
    /* ⚠️ THE WRAPPER IS THE HOVER/FOCUS TARGET (D6) — the actions live OUTSIDE the row and are
       revealed by this element, so they sit below it without being part of the object. */
    <div className="qc-attach">
      {/**
        * ⚠️ ONE ROW, TWO CELLS (Option A, D1). The blue cell leads with the parcel and the name;
        * the white cell holds the slots as `LABEL Value` pairs. `overflow: hidden` is what clips
        * the blue cell's square corners to the row's radius — the same construction the packages
        * page's banded cards use.
        */}
      <div className="qc-pstrip">
        <div className="qc-ps-nm">
          {/**
            * ⚠️ 24px, AND THAT IS A FLOOR RATHER THAN A STARTING POINT (D2). The drawing has string,
            * tape seams and a label: measured downscales put 16px at a brown blob with the string
            * and label gone, 20px at the floor, 24px reading as a parcel and 28px overpowering the
            * row. If a future row cannot accommodate 24, the row is the thing to change.
            *
            * ⚠️ AND THERE IS NO 2× FILE (D7). The source is 100×100 — better than 4× at this size,
            * so a second asset would be bytes for nothing.
            */}
          <img src={PARCEL_MARK} alt="" width={PARCEL_PX} height={PARCEL_PX} />
          {live ? (
            <button type="button" className="qc-ps-open" onClick={onView}
                    title={`Open ${group.packageName}`}>
              <b>{group.packageName}</b>
            </button>
          ) : <b>{group.packageName}</b>}
        </div>
        {/* ⚠️ THE SLOTS ARE THE HOST'S OWN CHILDREN, unchanged (D6) — including the sample's version
            chip. The strip owns their LAYOUT and strips the pill treatment; it does not rebuild
            them, which is what keeps the chip working without this file knowing about versions. */}
        <div className="qc-ps-sl">{children}</div>
      </div>

      {/**
        * ⚠️ DRIFT STAYS, AND MOVES BELOW THE ROW. It is a fact about this package rather than part
        * of the object, and Option A's row has no space that is not a cell. Each state appears only
        * when true.
        */}
      {state === "deleted" && <p className="qc-stat-note">Package no longer exists</p>}
      {state === "changed" && (
        <p className="qc-stat-note">
          {asSentLabel(sentDate)}
          {differing.length > 0 ? ` — ${driftNote(differing)}` : ""}
        </p>
      )}

      {/* ⚠️ OUTSIDE THE ROW (D6). Which package this query points at is the QUERY's field, not the
          package's — so the controls that change it sit beside the object rather than on it. */}
      {(onChangePackage || onRemovePackage) && (
        <div className="qc-stat-acts">
          {onChangePackage && (
            <button type="button" className="qc-stat-a" onClick={onChangePackage}
                    title="Change which package this query used">Change package</button>
          )}
          {onRemovePackage && (
            <button type="button" className="qc-stat-a qc-stat-a--warm" onClick={onRemovePackage}
                    title="Change this query to carry no package">Remove</button>
          )}
        </div>
      )}
    </div>
  );
};

export const LooseMaterials: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="qc-loose">{children}</div>
);

