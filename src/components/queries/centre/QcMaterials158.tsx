/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query card v158 §4 (design-refs/query-card-v158/query-card-v158.html, "By what it went with") — the slide-out card's
 * Materials tab: one group per stage that has anything, in the order they happened (lib/qcThread152 materialGroups).
 * A group is a 34px disc in its stage's Band holding the stage's mark in ink, a typewriter heading with when it went
 * (and when it was asked for) to its right, and the items in a box. A request not yet answered is a white box outlined
 * in navy ("needs you"), each item "not sent yet".
 * ⚠️ THE DISC IS THE STATUS'S BAND (Plumage colours v1, lib/stageColours `statusBand`, set as --d); no outline on a disc;
 *    the mark is ink; navy is only the pending outline.
 * Query card v167 §A — a group with nothing recorded keeps its box and shows ONE ghost row (QcGhost167), never "Nothing
 * recorded"; "not sent yet" stays on a pending one. The row is the way in: what went (the send's step editor), or what
 * is going (the send journey).
 */
import React from "react";
import { StatusDot } from "../../StatusDot";
import { stageOf, statusBand } from "../../../lib/stageColours";
import type { MatGroup } from "../../../lib/qcThread152";
import { chipIcon } from "./QcBubble152";
import { sentenceCase } from "./QcAgent158";
import { Ghost, editable } from "./QcGhost167";

export interface MaterialsTab158Props {
  groups: MatGroup[];
  /** the package's name on the query's group; null on the free plan or when none is set */
  packageName: string | null;
  onAddSent: (() => void) | null;
  onEditWent: (() => void) | null;
  /** v167 — a group's ghost row: add what went with it (null: the row is not a way in) */
  onAddTo?: ((g: MatGroup) => void) | null;
}

export const MaterialsTab158: React.FC<MaterialsTab158Props> = (p) => (
  <div className="nx" data-qc152="materials-pane" data-qc158="materials">
    <div className="nx-rail">
      {p.groups.map((g) => (
        <div key={g.key} className={`nx-grp${g.pending ? " pend" : ""}`} data-qc158="group" data-kind={g.kind} data-stage={stageOf(g.status)}
          data-pending={g.pending ? "" : undefined}>
          <span className="nx-disc" data-qc158="disc" style={{ ["--d" as string]: statusBand(g.status) } as React.CSSProperties}>
            <StatusDot status={g.status} overrideSize={18} tone="ink" decorative />
          </span>
          <h4 data-qc158="heading">{g.heading}{g.pkg && p.packageName ? <em data-qc158="package">{p.packageName}</em> : null}<span className="r" data-qc158="when">{g.when}</span></h4>
          <ul className="nx-items">
            {g.items.length ? g.items.map((c, i) => (
              <li key={`${c.label}-${i}`} data-qc158="item">
                {chipIcon(c.icon, 20)}{sentenceCase(c.label)}
                {g.pending ? <span className="r">not sent yet</span> : c.detail ? <span className="r">{c.detail}</span> : null}
              </li>
            )) : (
              <li data-qc158="item" data-qc167="ghost-row" data-ghost="" className="qc167-grow"
                {...editable(`+ ${g.pending ? "Add what’s going" : "Add what went"}`, p.onAddTo ? () => p.onAddTo!(g) : null)}>
                <Ghost w={34} words={p.onAddTo ? (g.pending ? "Add what’s going" : "Add what went") : null} />
                {g.pending ? <span className="r">not sent yet</span> : null}
              </li>
            )}
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
