/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query card v158 §4 (design-refs/query-card-v158/query-card-v158.html, "By what it went with") — the slide-out card's
 * Materials tab: one group per stage that has anything, in the order they happened (lib/qcThread152 materialGroups).
 * A group is a 34px disc in its stage's Band holding the stage's mark in ink, a typewriter heading with when it went
 * (and when it was asked for) to its right, and the items in a box. A request not yet answered is a white box outlined
 * in navy ("needs you"), each item "not sent yet".
 * ⚠️ COLOUR IS THE STAGE (lib/stageColours, set as --d on the disc); the mark is ink; navy is only the pending outline.
 */
import React from "react";
import { StatusDot } from "../../StatusDot";
import { STAGE_COLOURS, stageOf } from "../../../lib/stageColours";
import type { MatGroup } from "../../../lib/qcThread152";
import { chipIcon } from "./QcBubble152";
import { sentenceCase } from "./QcAgent158";

export interface MaterialsTab158Props {
  groups: MatGroup[];
  /** the package's name on the query's group; null on the free plan or when none is set */
  packageName: string | null;
  onAddSent: (() => void) | null;
  onEditWent: (() => void) | null;
}

export const MaterialsTab158: React.FC<MaterialsTab158Props> = (p) => (
  <div className="nx" data-qc152="materials-pane" data-qc158="materials">
    <div className="nx-rail">
      {p.groups.map((g) => (
        <div key={g.key} className={`nx-grp${g.pending ? " pend" : ""}`} data-qc158="group" data-kind={g.kind} data-stage={stageOf(g.status)}
          data-pending={g.pending ? "" : undefined}>
          <span className="nx-disc" data-qc158="disc" style={{ ["--d" as string]: STAGE_COLOURS[stageOf(g.status)].band } as React.CSSProperties}>
            <StatusDot status={g.status} overrideSize={18} tone="ink" decorative />
          </span>
          <h4 data-qc158="heading">{g.heading}{g.pkg && p.packageName ? <em data-qc158="package">{p.packageName}</em> : null}<span className="r" data-qc158="when">{g.when}</span></h4>
          <ul className="nx-items">
            {g.items.length ? g.items.map((c, i) => (
              <li key={`${c.label}-${i}`} data-qc158="item">
                {chipIcon(c.label)}{sentenceCase(c.label)}
                {g.pending ? <span className="r">not sent yet</span> : c.detail ? <span className="r">{c.detail}</span> : null}
              </li>
            )) : <li data-qc158="item" className="none"><em>Nothing recorded</em>{g.pending ? <span className="r">not sent yet</span> : null}</li>}
          </ul>
        </div>
      ))}
    </div>
    {p.onAddSent || p.onEditWent ? (
      <div className="nx-foot">
        {p.onAddSent ? <button type="button" className="nx-lk" data-qc1522="add-sent" onClick={p.onAddSent}>+ Add something you sent</button> : <span />}
        {p.onEditWent ? <button type="button" className="nx-lk" data-qc158="edit-went" onClick={p.onEditWent}>Edit what went</button> : null}
      </div>
    ) : null}
  </div>
);
