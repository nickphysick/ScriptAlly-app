/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE PACKAGE GROUP IN A SEND (refs 177 left panel, 178) ═══════════════════════════════════
 *
 * ⚠️ A GROUP AROUND ORDINARY PILLS, NOT A CONTAINER OF SPECIAL ONES. The children are built by the
 * page's own `attach()` helper and are identical to hand-attached materials — same markup, same
 * editor, same ×. The border says where they came from and nothing else; removing one does not
 * dissolve the group or "break" the package, because there is no package here to break. It means
 * the send no longer matches the template, which the meta line then says.
 *
 * ⚠️ BLUE MARKS THE PACKAGE, NEVER ITS CONTENTS (ref 178). The rim, the ground, the mark and the
 * meta line take pastille blue; the pills inside take nothing. Colouring them would say they are a
 * different class of material that behaves differently, which is exactly what they are not.
 */
import React from "react";
import { ArtSlot } from "../todo/ArtSlot";
import { PACKAGE_MARK_SLOT, type MaterialGroup } from "../../lib/packageAttach";
import type { SubmissionPackage } from "../../types";
import "./packageGroup.css";

export interface PackageGroupProps {
  group: MaterialGroup;
  /** The package as it stands TODAY, or null when it has been deleted. */
  live: SubmissionPackage | null;
  onView: () => void;
  children: React.ReactNode;
}

export const PackageGroup: React.FC<PackageGroupProps> = ({ group, live, onView, children }) => (
  <div className="qc-pkggrp">
    <div className="qc-pkggrp-head">
      {/* ⚠️ ONE MARK FOR EVERY PACKAGE — a package is a template the writer built, not a brand. */}
      <span className="qc-pkggrp-mark" aria-hidden="true">
        <ArtSlot name={PACKAGE_MARK_SLOT} maxWidth={28} />
      </span>
      <span className="qc-pkggrp-id">
        {/* ⚠️ THE NAME IS THE ONE STORED ON THE ITEMS, not looked up live — it is a record of what
            was sent, and it must outlive the package's deletion. */}
        <b className="qc-pkggrp-name">{group.packageName}</b>
        <span className="qc-pkggrp-meta">
          Submission package
          {live && (
            <>
              {" · "}
              <button type="button" className="qc-pkggrp-view" onClick={onView}>view</button>
            </>
          )}
        </span>
      </span>
    </div>
    <div className="qc-pkggrp-items">{children}</div>
  </div>
);
