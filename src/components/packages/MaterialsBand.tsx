/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The materials band — three type columns of sheets.
 * Design authority: design-refs/submission-packages-broadsheet.html (`.band` / `.mat-cols`).
 *
 * ⚠️ THIS REPLACES THE RAIL'S MATERIALS PANEL, IT DOES NOT SIT BESIDE IT (D1). A register in a rail
 * and a band on the stage listing the same materials are two indexes of one thing, and the day they
 * disagree — a filter here, a sort there — nothing in the app says which one is the answer. The rail
 * panel is deleted in the same commit that mounts this.
 *
 * ⚠️ EVERY LINE ON A SHEET IS DERIVED (`materialColumns` in lib/packagesOverview.ts). The type label,
 * the source line and the usage line are computed from the version and the packages; nothing here is
 * stored, and the usage line reads the SAME number the archive guard will read in Phase 3, so a sheet
 * can never say a material is free while the guard says it is held.
 *
 * ⚠️ NO DELETE CONTROL YET, DELIBERATELY. The ref draws a hover-revealed bin on every sheet; that
 * affordance arrives with the archive model (Phase 3), because a bin wired to a hard delete is the
 * thing Nick's Ruling 2 struck. An absent control is honest; a bin that refuses is not.
 */
import React from "react";
import { ComponentType, ManuscriptVersion, SubmissionPackage } from "../../types";
import { materialColumns } from "../../lib/packagesOverview";
import { IllustrationSlot } from "./IllustrationSlot";
import "./packagesBroadsheet.css";

/**
 * The artist's brief per column, verbatim from the ref's `TYPE_BRIEF` (D7).
 *
 * ⚠️ THE 44px DISC DROPS THE "ILLUSTRATION" LABEL — a deviation, and the ref's own stylesheet is the
 * authority for it. It defines `.plate.tiny` to hide the label and shrink the brief for exactly this
 * case, then never applies the class; at 44px with a 7px label above a 14px Caveat brief the words
 * spill straight out of the circle. The slot is still inventoried by its `data-slot` id.
 */
const TYPE_BRIEF: Record<string, string> = {
  [ComponentType.QUERY_LETTER]: "sealed\nenvelope",
  [ComponentType.SYNOPSIS]: "rolled synopsis,\nribbon",
  [ComponentType.SAMPLE_PAGES]: "sample pages,\npaperclip",
};

export interface MaterialsBandProps {
  versions: ManuscriptVersion[];
  packages: SubmissionPackage[];
  /** Opens the modal on a chosen type — the column's `+ ADD` and its ghost. */
  onAddMaterial: (type: ComponentType) => void;
  /** Opens the modal on an existing material. */
  onOpenMaterial: (id: string) => void;
}

export const MaterialsBand: React.FC<MaterialsBandProps> = ({
  versions, packages, onAddMaterial, onOpenMaterial,
}) => {
  const cols = materialColumns(versions, packages);

  return (
    <section className="pkgb-band" aria-labelledby="pkgb-mat-h">
      <div className="pkgb-bandhead">
        <h2 id="pkgb-mat-h">Your materials</h2>
        {/* ⚠️ `0 held` IS TRUE AND STAYS. A count of things you have is a count; the sentence-not-a-
            count rule applies to the usage line, where "In 0 packages" reads as a malfunction. */}
        <span className="pkgb-tag">{versions.length} held</span>
      </div>

      <div className="pkgb-matcols">
        {cols.map((col) => (
          <div className="pkgb-matcol" key={col.type}>
            <div className="pkgb-matcolhead">
              <IllustrationSlot
                id={`mat-${col.type}`}
                brief={TYPE_BRIEF[col.type]}
                shape="disc"
                tiny
                width={44}
                height={44}
              />
              <span className="pkgb-mchtext">
                <span className="pkgb-eyebrow">{col.heading}</span>
                <span className="pkgb-statline">{col.held} held</span>
              </span>
              <button
                type="button"
                className="pkgb-add"
                onClick={() => onAddMaterial(col.type)}
                /* The column already names the type; the button alone would read "+ ADD" to a
                   screen reader three times over. */
                aria-label={`Add to ${col.heading}`}
              >
                + ADD
              </button>
            </div>

            {col.sheets.map((s) => (
              <button
                key={s.id}
                type="button"
                className="pkgb-sheet"
                onClick={() => onOpenMaterial(s.id)}
                data-material={s.id}
              >
                <span className="pkgb-stype">{s.typeLabel}</span>
                <span className="pkgb-sname">{s.name}</span>
                <span className="pkgb-ssrc">{s.source}</span>
                {/* The usage line's number is bold and its words are not — `In **2** packages`. */}
                <span className="pkgb-suse">
                  {s.usedIn > 0
                    ? <>In <b>{s.usedIn}</b> {s.usedIn === 1 ? "package" : "packages"}</>
                    : s.usage}
                </span>
              </button>
            ))}

            {/* ⚠️ THE GHOST IS PER COLUMN AND ALWAYS PRESENT, not an empty state. It is the column's
                second entry point, so a writer with four letters can still add a fifth from the foot
                of the stack without going back up to `+ ADD`. */}
            <button type="button" className="pkgb-ghost" onClick={() => onAddMaterial(col.type)}>
              <span className="pkgb-gt">{col.ghostLabel}</span>
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};
