/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ CHOOSING A SUBMISSION PACKAGE TO ATTACH (ref 173-package-attach.html) ════════════════════
 *
 * ⚠️ EVERY ROW STATES ITS CONTENTS BEFORE IT IS CHOSEN, and any overlap with what the send already
 * carries is declared on the row itself. The alternative is a picker that lists three names and
 * springs the collision afterwards — and the collision has no good silent answer: replacing loses
 * what the writer chose by hand, skipping loses what the package promised. So it is stated, both
 * copies land, and the writer removes whichever they meant to drop.
 *
 * ⚠️ NO SIZES ARE SHOWN, BECAUSE PACKAGES DO NOT STORE ANY. The ref draws `First 3 chapters`; a
 * `SubmissionPackage` holds three version ids and a `ManuscriptVersion` has no quantity and no
 * unit. Each item shows its type name and, when the version has one, its version name — which is
 * real data. See `packageAttach.ts`.
 */
import React from "react";
import type { ManuscriptVersion, QueryMaterial, SubmissionPackage } from "../../types";
import { packageItems, overlaps, overlapNote, type PackageItem } from "../../lib/packageAttach";

export interface PackagePickerProps {
  packages: SubmissionPackage[];
  versions: ManuscriptVersion[];
  /** What the send already carries — for the per-row overlap declarations. */
  existing: (string | QueryMaterial)[];
  style?: React.CSSProperties;
  panelRef?: React.RefObject<HTMLElement | null>;
  onPick: (pkg: SubmissionPackage, items: PackageItem[]) => void;
  onManage: () => void;
  onClose: () => void;
}

export const PackagePicker: React.FC<PackagePickerProps> = ({
  packages, versions, existing, style, panelRef, onPick, onManage, onClose,
}) => (
  <div
    ref={(el) => { if (panelRef) (panelRef as React.MutableRefObject<HTMLElement | null>).current = el; }}
    className="qc-pkgpick"
    /* ⚠️ FLEX COLUMN + `minHeight: 0` — the cap from `useFixedMenu` has to squeeze the LIST and
       leave the foot's `Manage packages…` reachable (§1). */
    style={{ ...style, zIndex: 60, display: "flex", flexDirection: "column", minHeight: 0 }}
    role="dialog"
    aria-label="Attach a submission package"
    onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); } }}
  >
    <div className="qc-pkgpick-head">Attach a submission package</div>

    <div className="qc-pkgpick-body">
      {packages.map((p) => {
        const items = packageItems(p, versions);
        const clash = overlaps(items, existing);
        return (
          <button key={p.id} type="button" className="qc-pkgrow" onClick={() => onPick(p, items)}>
            <span className="qc-pkgrow-top">
              <span className="qc-pkgname">{p.packageName}</span>
              <span className="qc-pkgcount">{items.length} {items.length === 1 ? "item" : "items"}</span>
            </span>
            {/* the contents, so what lands is visible before it lands */}
            <span className="qc-pkgitems">
              {items.map((i) => (
                <span key={i.versionId} className="qc-pkgitem">
                  {i.label}{i.versionName ? <em> · {i.versionName}</em> : null}
                </span>
              ))}
            </span>
            {/* ⚠️ DECLARED PER ROW, before choosing — never a warning after the fact. */}
            {clash.map((i) => (
              <span key={`o-${i.versionId}`} className="qc-pkgclash">{overlapNote(i)}</span>
            ))}
          </button>
        );
      })}
    </div>

    {/* ⚠️ LABELLED AS LEAVING THE PAGE. `Manage packages…` sits at the foot and the ellipsis says it
        goes somewhere; a bare `Manage packages` beside three choosable rows reads as a fourth. */}
    <button type="button" className="qc-pkgmanage" onClick={onManage}>
      Manage packages…<span className="qc-pkgmanage-note">opens the Packages page</span>
    </button>
  </div>
);
