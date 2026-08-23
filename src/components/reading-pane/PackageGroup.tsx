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
import { PACKAGE_MARK_SLOT, packageDrift, driftNote, asSentLabel, type MaterialGroup } from "../../lib/packageAttach";
import type { QueryMaterial, SubmissionPackage } from "../../types";
import "./packageGroup.css";

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

  return (
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
          {/* ⚠️ THE DELETED STATE KEEPS THE NAME AND DROPS THE LINK. The name is a record of what
              was sent and must outlive the package; the link is the only part that has nowhere to
              go. The send itself is never altered by a package's deletion. */}
          {state === "deleted" ? "Package no longer exists" : state === "changed" ? asSentLabel(sentDate) : "Submission package"}
          {live && (
            <>
              {" · "}
              <button type="button" className="qc-pkggrp-view" onClick={onView}>
                {state === "changed" ? "view current" : "view"}
              </button>
            </>
          )}
        </span>
      </span>
    </div>
    <div className="qc-pkggrp-items">{children}</div>
    {state === "changed" && <p className="qc-pkggrp-note">{driftNote(differing)}</p>}
  </div>
  );
};
