/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Submission packages pane. Reference: design-refs/manuscripts-plate.html, `#pane-pkgs`.
 *
 * ⚠️ ONE PANE, NO PLAN FORK, NO CHIP. The ref draws a Free half — a centred stacked-pages pitch,
 * three bullet cards, `See how it works` and `Upgrade to Pro`. NONE of it is built. The package
 * builder has no Pro gate, so all of that would sell a page the user can already open from the
 * rail, which is precisely why a Pro-selling landing was retired from that route once already.
 * If a real gate ever lands, this pane becomes gated in ONE place — do not pre-build for it.
 *
 * ⚠️ AND NO DIMMED OR BLURRED PREVIEW, EVER. Where a free equivalent exists we ship the real thing;
 * this pane IS the real thing for everyone.
 *
 * ⚠️ THE FOUR ROWS ALWAYS RENDER. Absence is `—` against a named slot, not a missing row: a row
 * that vanishes states nothing, while `—` says "this slot is empty". That is also what earns the
 * Details tile the right to omit its absent materials — this pane is where absence is spelled out,
 * so the tile repeating it would be the same information twice.
 */
import React from "react";
import { ManuscriptVersion, SubmissionPackage } from "../../types";
import { materialsOnFile } from "../../lib/manuscriptPackages";
import "./manuscriptPlate.css";

export interface ManuscriptPackagesPaneProps {
  versions: ManuscriptVersion[];
  packages: SubmissionPackage[];
  onOpenBuilder?: () => void;
}

export const ManuscriptPackagesPane: React.FC<ManuscriptPackagesPaneProps> = ({
  versions,
  packages,
  onOpenBuilder,
}) => (
  <div className="msv-padbody">
    <div className="msv-btilelab">Materials on file</div>
    <div className="msv-frows">
      {materialsOnFile(versions, packages).map((row) => (
        <div key={row.label} className="msv-frow">
          <span>{row.label}</span>
          <span className={`msv-fcount${row.count ? "" : " none"}`}>{row.count ?? "—"}</span>
        </div>
      ))}
    </div>
    <div className="msv-frowfoot">
      <button type="button" className="msv-linkline" onClick={onOpenBuilder}>
        Open package builder →
      </button>
    </div>
  </div>
);
