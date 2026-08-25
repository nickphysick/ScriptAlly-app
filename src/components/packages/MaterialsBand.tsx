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
import { TypeGlyph } from "./TypeGlyph";
import React from "react";
import { ComponentType, ManuscriptVersion, SubmissionPackage } from "../../types";
import type { BookVersion } from "../../types";
import { materialShelf, materialHolders } from "../../lib/packagesOverview";
import { BUILDER_TYPES } from "./typeMeta";
import { RemovePopover } from "./RemovePopover";
import "./packagesBroadsheet.css";

/** ⚠️ THE BAND CLASS PER TYPE (D4) — colour IS the type, which is what makes the shelf scannable
 *  without reading it. The four sets are page-local pending F-AK. */
const TYPE_BAND: Record<string, string> = {
  [ComponentType.QUERY_LETTER]: "pkgb-t-let",
  [ComponentType.SYNOPSIS]: "pkgb-t-syn",
  [ComponentType.SAMPLE_PAGES]: "pkgb-t-sam",
};

/* ⚠️ `TYPE_ICON` IS GONE (D4/D12) — it named the icons for a 34px dashed `IllustrationSlot`
   watermark, and the band head draws a solid `TypeGlyph` at 16px instead. The written brief it
   points at ("sealed envelope", "rolled synopsis, ribbon", "sample pages, paperclip") is the
   artist's commission and is unaffected: it lives in the slot inventory, not here. */

export interface MaterialsBandProps {
  versions: ManuscriptVersion[];
  packages: SubmissionPackage[];
  /**
   * The manuscript's BOOK versions (see `BookVersion` in types.ts — NOT `ManuscriptVersion` above,
   * which is a material). Only sample-pages sheets read it, and only above two versions.
   */
  bookVersions?: readonly BookVersion[];
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
  archived, showArchived, onToggleArchived, onRestore, bookVersions = [],
}) => {
  /**
   * ⚠️ ONE SHELF, NOT THREE COLUMNS (D-B2). The columns stated a heading, a `0 held` count and a
   * ghost for every type the writer had not used yet — three statements of absence to somebody who
   * had simply not got there. **An empty type does not appear at all**: a shelf shows what is on it.
   *
   * ⚠️ AND THE PER-TYPE `+ ADD` GOES WITH THEM. One add card at the end, because the type is a
   * question the material modal already asks; three adds meant choosing the type twice.
   */
  const sheets = materialShelf(versions, packages, bookVersions);

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
          <div key={sh.id} className={`pkgb-msheet ${TYPE_BAND[sh.type] ?? ""}`} data-material={sh.id} data-type={sh.type}>
            {/**
              * ⚠️ THE BAND HEAD CARRIES THE TYPE (D4/D5), so the body no longer repeats it. The card
              * used to say it three times over — a faint watermark, a mono eyebrow, and the colour
              * of nothing — and the eyebrow above the name is what pushed the Playfair line down to
              * second place on its own card. Head says the type; the name gets its line back.
              *
              * ⚠️ AND THE MARK IS SOLID (D12). It was a 34px `IllustrationSlot` — a dashed
              * commission plate on a user-facing card. At 16px in a band head it is an icon.
              */}
            <div className="pkgb-cardhead">
              <TypeGlyph type={sh.type} size={16} />
              <span className="pkgb-chlbl">{sh.typeLabel}</span>
            </div>
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
              {/**
                * ⚠️ THE VERSION CHIP JOINS THE USAGE LINE (D12), it does not get a row of its own.
                * "In 2 packages · § Prologue-first" is one fact about where these pages have been
                * and what they are; splitting it would imply two different kinds of claim.
                *
                * The name is already gated three ways in `materialColumns` — sample pages, a stored
                * reference, and two or more versions — so this renders whenever it is present and
                * re-tests nothing.
                */}
              {sh.bookVersionName && (
                <span className="pkgb-mver"><span aria-hidden="true">§</span>{sh.bookVersionName}</span>
              )}
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
