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
 * ⚠️ THE BIN DOES NOT ALWAYS DELETE, AND THAT IS THE POINT (Ruling 2). A material nothing holds is
 * deleted; one a package holds is ARCHIVED — it leaves this band and stays readable by the packages
 * that use it. `RemovePopover` reads `removalChoice` and writes its own label from it, so the word
 * on the button and the act behind it are the same object. The ref's version refused instead, and
 * told the writer to dismantle a package first.
 */
import React from "react";
import { ComponentType, ManuscriptVersion, SubmissionPackage } from "../../types";
import { materialColumns, materialHolders } from "../../lib/packagesOverview";
import { IllustrationSlot } from "./IllustrationSlot";
import { RemovePopover } from "./RemovePopover";
import "./packagesBroadsheet.css";

/**
 * The mark per column, from the ref's `TYPE_ICON` (D4).
 *
 * ⚠️ THE WRITTEN BRIEF IS NOT HERE ANY MORE AND HAS NOT BEEN LOST. "sealed envelope", "rolled
 * synopsis, ribbon", "sample pages, paperclip" now live in the slot inventory table in
 * reports/submission-packages-recut.md, which is the artist's commission. On the page they were
 * handwriting inside a 44px circle — unreadable, and the reason this pass exists.
 */
const TYPE_ICON: Record<string, string> = {
  [ComponentType.QUERY_LETTER]: "envelope",
  [ComponentType.SYNOPSIS]: "scroll",
  [ComponentType.SAMPLE_PAGES]: "pages",
};

export interface MaterialsBandProps {
  versions: ManuscriptVersion[];
  packages: SubmissionPackage[];
  /** Opens the modal on a chosen type — the column's `+ ADD` and its ghost. */
  onAddMaterial: (type: ComponentType) => void;
  /** Opens the modal on an existing material. */
  onOpenMaterial: (id: string) => void;
  /**
   * ⚠️ TWO HANDLERS, BECAUSE THERE ARE TWO ACTS — and the band does not choose between them.
   * `removalChoice` reads the data inside the popover and calls whichever the data names, so this
   * component cannot offer "Archive" and perform a delete.
   */
  onDeleteMaterial: (id: string) => void | Promise<unknown>;
  onArchiveMaterial: (id: string) => void | Promise<unknown>;
}

export const MaterialsBand: React.FC<MaterialsBandProps> = ({
  versions, packages, onAddMaterial, onOpenMaterial, onDeleteMaterial, onArchiveMaterial,
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
          /* ⚠️ THREE GRID ROWS — head / stack / ghost. The heads share a top and the ghosts share a
             bottom BY CONSTRUCTION at any content length, rather than by the three columns happening
             to hold the same number of sheets. */
          <div className="pkgb-matcol" key={col.type}>
            <div className="pkgb-matcolhead">
              <IllustrationSlot
                id={`mat-${col.type}`}
                icon={TYPE_ICON[col.type]}
                px={40}
                shape="disc"
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

            <div className="pkgb-matstack">
              {col.sheets.length === 0 ? (
                /* ⚠️ A HOLD, NOT A COLLAPSE (D3). A type you own nothing of used to vanish, taking
                   the row's alignment with it and making an empty page read as a broken one. The
                   sentence states what is normal rather than urging — the same rule as every other
                   absence line here. */
                <div className="pkgb-colempty">None yet — most writers keep two or three versions.</div>
              ) : col.sheets.map((s) => (
                <div key={s.id} className="pkgb-sheet" data-material={s.id}>
                  <span className="pkgb-stype">{s.typeLabel}</span>
                  <button type="button" className="pkgb-sopen pkgb-sname" onClick={() => onOpenMaterial(s.id)}>
                    {s.name}
                  </button>
                  {/* ⚠️ ONE LINE, ONE ROW, WITH A REAL SEPARATOR. Two spans relying on `margin-top`
                      rendered as "TextIn 1 package" — vertical margin is inert on an inline box, and
                      every probe read both strings correctly because each one WAS correct. The fault
                      was the line they made together. */}
                  <span className="pkgb-smeta">
                    <span>{s.source}</span>
                    <span className="pkgb-sdot" aria-hidden="true" />
                    {/* ⚠️ THE NUMBER IS BOLD AND THE WORDS ARE NOT, but the WORDS are `usageLine`'s
                        — split here rather than restated. Rendering the sentence inline left the
                        lib's `usageLine` saying "Not in a package yet" with nobody reading it: two
                        wordings for one fact on a page that claims single-sourced figures. */}
                    <span className="pkgb-suse">
                      {s.usedIn > 0
                        ? <>In <b>{s.usedIn}</b> {s.usedIn === 1 ? "package" : "packages"}</>
                        : s.usage}
                    </span>
                  </span>
                  <RemovePopover
                    id={s.id}
                    name={s.name}
                    typeLabel={s.typeLabel}
                    subject="material"
                    holders={materialHolders(s.id, packages)}
                    onDelete={onDeleteMaterial}
                    onArchive={onArchiveMaterial}
                  />
                </div>
              ))}
            </div>

            {/* ⚠️ ROW 3, ALWAYS PRESENT. It is the column's second entry point, so a writer with four
                letters can add a fifth from the foot of the stack without going back up to `+ ADD` —
                and pinning it to the bottom row is what puts all three on one baseline. */}
            <button type="button" className="pkgb-ghost" onClick={() => onAddMaterial(col.type)}>
              <span className="pkgb-gt">{col.ghostLabel}</span>
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};
