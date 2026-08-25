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
import { MATERIAL_LABEL } from "../../lib/manuscriptPackages";
import { ArchivedToggle, ArchivedRow, ArchivedSection } from "./ArchivedRow";
import React from "react";
import { ComponentType, ManuscriptVersion, SubmissionPackage } from "../../types";
import { materialShelf, materialHolders } from "../../lib/packagesOverview";
import { BUILDER_TYPES } from "./typeMeta";
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
  /**
   * ⚠️ ARCHIVED ITEMS ARRIVE AS THEIR OWN LIST (F-H, D1/D3). They are never merged into the active
   * array, so the count above cannot see them whatever the toggle says.
   */
  archived: ManuscriptVersion[];
  showArchived: boolean;
  onToggleArchived: () => void;
  onRestore: (id: string) => void | Promise<unknown>;
  onArchiveMaterial: (id: string) => void | Promise<unknown>;
}

export const MaterialsBand: React.FC<MaterialsBandProps> = ({
  versions, packages, onAddMaterial, onOpenMaterial, onDeleteMaterial, onArchiveMaterial,
  archived, showArchived, onToggleArchived, onRestore,
}) => {
  /**
   * ⚠️ ONE SHELF, NOT THREE COLUMNS (D-B2). The columns stated a heading, a `0 held` count and a
   * ghost for every type the writer had not used yet — three statements of absence to somebody who
   * had simply not got there. **An empty type does not appear at all**: a shelf shows what is on it.
   *
   * ⚠️ AND THE PER-TYPE `+ ADD` GOES WITH THEM. One add card at the end, because the type is a
   * question the material modal already asks; three adds meant choosing the type twice.
   */
  const sheets = materialShelf(versions, packages);

  return (
    <section className="pkgb-band" aria-labelledby="pkgb-mat-h">
      <div className="pkgb-bandhead">
        <h2 id="pkgb-mat-h">Your materials</h2>
        {/* ⚠️ `0 held` IS TRUE AND STAYS. A count of things you have is a count; the sentence-not-a-
            count rule applies to the usage line, where "In 0 packages" reads as a malfunction. */}
        <span className="pkgb-tag">{sheets.length} held</span>
        <ArchivedToggle n={archived.length} on={showArchived} onClick={onToggleArchived} />
      </div>

      <div className="pkgb-shelf">
        {sheets.map((sh) => (
          /* ⚠️ THE WATERMARK IS THE TYPE, FAINT AND BEHIND THE WORDS. It repeats the eyebrow on
             purpose — the eyebrow is for reading, the mark is for scanning a shelf at a glance. */
          <div key={sh.id} className="pkgb-msheet" data-material={sh.id} data-type={sh.type}>
            <span className="pkgb-wm" aria-hidden="true">
              <IllustrationSlot id={`wm-${sh.id}`} icon={TYPE_ICON[sh.type]} px={34} shape="bare" />
            </span>
            <span className="pkgb-mtype">{sh.typeLabel}</span>
            <button type="button" className="pkgb-mname" onClick={() => onOpenMaterial(sh.id)}>
              {sh.name}
            </button>
            <div className="pkgb-mmeta">{sh.source}</div>
            {/* ⚠️ THE NUMBER IS BOLD AND IT IS `usedIn` — the SAME field the delete guard reads, so
                the sheet can never say a material is free while the guard refuses to remove it.
                `usage` carries the wording; `usedIn` carries the count, and both come from one
                derivation. */}
            <div className="pkgb-muse">
              {sh.usedIn > 0
                ? <>In <b>{sh.usedIn}</b> package{sh.usedIn === 1 ? "" : "s"}</>
                : sh.usage}
            </div>
            <RemovePopover
              id={sh.id}
              name={sh.name}
              typeLabel={sh.typeLabel}
              subject="material"
              holders={materialHolders(sh.id, packages)}
              onDelete={onDeleteMaterial}
              onArchive={onArchiveMaterial}
            />
          </div>
        ))}
        {/* ⚠️ ONE ADD CARD, AND IT NAMES THE THREE TYPES RATHER THAN ASKING FOR ONE. The modal owns
            the type step; a preselect here would be the page answering a question it is about to
            ask. */}
        <button type="button" className="pkgb-msheetadd" onClick={() => onAddMaterial(BUILDER_TYPES[0])}>
          <span className="pkgb-gt">Add a material</span>
          <span className="pkgb-gs">Letter, synopsis or sample</span>
        </button>
      </div>
      <ArchivedSection show={showArchived} n={archived.length}>
        {archived.map((v) => (
          <ArchivedRow key={v.id} name={v.versionName} meta={MATERIAL_LABEL[v.componentType]}
                       onRestore={() => void onRestore(v.id)} />
        ))}
      </ArchivedSection>
    </section>
  );
};
