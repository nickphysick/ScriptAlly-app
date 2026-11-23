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
 * Query card v168 — EACH GROUP EDITS ITS OWN ITEMS, HERE: the pencil on a sent group's box opens it in place (each item
 * the app's own material chip with its ✕, then MatChips' own "+ Add" and its sample picker, as they stand), with the
 * cross and the tick in the group's heading where its date was. The tick saves through that step's own save, its date
 * unchanged (the page's `save`). A sent group's ghost row opens the same editor; a pending one keeps v167's door (the
 * send journey). "+ Add something you sent" and "Edit what went" are gone. ⚠️ THE TAB NEVER CHANGES: nothing here sends
 * you to Tracking (lock L6 routes it through the step editor and must go red).
 */
import React, { useState } from "react";
import { StatusDot } from "../../StatusDot";
import { stageOf, statusBand } from "../../../lib/stageColours";
import type { MatGroup } from "../../../lib/qcThread152";
import type { StepMaterial } from "../../../lib/qc152Write";
import { chipIcon } from "./QcBubble152";
import { sentenceCase } from "./QcAgent158";
import { Ghost, editable } from "./QcGhost167";
import { CrossTick, DiscardAsk, EditPen, useEdit168, useHold168 } from "./QcEdit168";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";

/** v168 — a group's own editor: what its step went with, and its one save (true when it landed) */
export interface MatEdit168 {
  /** the app's own material chips and "+ Add" (QcEdit152 MatChips, as they stand), drawn by the card */
  chips: (id: string, mats: StepMaterial[], onChange: (m: StepMaterial[]) => void, stepMs: number) => React.ReactNode;
  /** the step's materials as stored, and its day; null: this group is not edited here (pending, or an undated step) */
  of: (g: MatGroup) => { mats: StepMaterial[]; stepMs: number } | null;
  save: (g: MatGroup, mats: StepMaterial[]) => Promise<boolean>;
  busy: boolean;
}

export interface MaterialsTab158Props {
  groups: MatGroup[];
  /** the package's name on the query's group; null on the free plan or when none is set */
  packageName: string | null;
  /** v167 — a group's ghost row: add what went with it (null: the row is not a way in). v168: a pending group's only */
  onAddTo?: ((g: MatGroup) => void) | null;
  /** v168 — each group edits its own items here; absent (a preview), nothing is edited */
  edit?: MatEdit168 | null;
}

const same = (a: StepMaterial[], b: StepMaterial[]) => JSON.stringify(a) === JSON.stringify(b);

/** the open group: its items as the app's material chips, "+ Add", and the cross and the tick in its heading */
const GroupEditor: React.FC<{ g: MatGroup; base: { mats: StepMaterial[]; stepMs: number }; edit: MatEdit168; head: React.ReactNode; disc: React.ReactNode; onClose: () => void; onReopen: () => void }> = ({ g, base, edit, head, disc, onClose, onReopen }) => {
  const key = `grp:${g.key}`;
  const seed = useEdit168().seedOf(key) as StepMaterial[] | undefined;
  const [mats, setMats] = useState<StepMaterial[]>(seed ?? base.mats.map((m) => ({ ...m })));
  const dirty = !same(mats, base.mats);
  const ed = useHold168(key, dirty, mats, onClose, onReopen);
  const asking = ed.asking && ed.open === key;
  useEscapeLayer(true, () => { if (asking) ed.keep(); else ed.leave(); }, ESC_LEVEL.pageModal);
  const save = async () => { if (await edit.save(g, mats)) onClose(); };
  return (
    <div className={`nx-grp${g.pending ? " pend" : ""} has-open`} data-qc158="group" data-kind={g.kind} data-stage={stageOf(g.status)} data-qc168-open-grp={g.key}>
      {disc}
      <h4 data-qc158="heading">{head}<CrossTick dirty={dirty} busy={edit.busy} onCross={ed.cross} onTick={() => void save()} /></h4>
      <div className="nx-items qc168-open qc168-mats" data-qc168="group-edit">
        {edit.chips(`grp-${g.key}`, mats, setMats, base.stepMs)}
      </div>
      {asking ? <div className="qc168-gf"><DiscardAsk onKeep={ed.keep} onDiscard={ed.discard} /></div> : null}
    </div>
  );
};

export const MaterialsTab158: React.FC<MaterialsTab158Props> = (p) => {
  const [open, setOpen] = useState<string | null>(null);
  const ed = useEdit168();
  return (
  <div className="nx" data-qc152="materials-pane" data-qc158="materials">
    <div className="nx-rail">
      {p.groups.map((g) => {
        const disc = (
          <span className="nx-disc" data-qc158="disc" style={{ ["--d" as string]: statusBand(g.status) } as React.CSSProperties}>
            <StatusDot status={g.status} overrideSize={18} tone="ink" decorative />
          </span>
        );
        const name = <>{g.heading}{g.pkg && p.packageName ? <em data-qc158="package">{p.packageName}</em> : null}</>;
        const base = p.edit && !g.pending ? p.edit.of(g) : null;
        const go = () => ed.guard(() => setOpen(g.key));
        if (base && p.edit && open === g.key) {
          return <GroupEditor key={g.key} g={g} base={base} edit={p.edit} head={name} disc={disc} onClose={() => setOpen((k) => (k === g.key ? null : k))} onReopen={() => setOpen(g.key)} />;
        }
        /* a sent group's ghost row opens its editor; a pending one keeps v167's door (the send journey) */
        const ghostGo = base ? go : g.pending && p.onAddTo ? () => ed.guard(() => p.onAddTo!(g)) : null;
        return (
        <div key={g.key} className={`nx-grp${g.pending ? " pend" : ""}`} data-qc158="group" data-kind={g.kind} data-stage={stageOf(g.status)}
          data-pending={g.pending ? "" : undefined}>
          {disc}
          <h4 data-qc158="heading">{name}<span className="r" data-qc158="when">{g.when}</span></h4>
          <ul className="nx-items" data-qc168-host={base && g.items.length ? "" : undefined}>
            {g.items.length ? g.items.map((c, i) => (
              <li key={`${c.label}-${i}`} data-qc158="item">
                {chipIcon(c.icon, 20)}{sentenceCase(c.label)}
                {g.pending ? <span className="r">not sent yet</span> : c.detail ? <span className="r">{c.detail}</span> : null}
              </li>
            )) : (
              <li data-qc158="item" data-qc167="ghost-row" data-ghost="" className="qc167-grow"
                {...editable(`+ ${g.pending ? "Add what’s going" : "Add what went"}`, ghostGo)}>
                <Ghost w={34} words={ghostGo ? (g.pending ? "Add what’s going" : "Add what went") : null} />
                {g.pending ? <span className="r">not sent yet</span> : null}
              </li>
            )}
            {base && g.items.length ? <EditPen label={`what went: ${g.heading}`} onOpen={go} data={{ "data-qc168-k": `grp:${g.key}` }} /> : null}
          </ul>
        </div>
        );
      })}
    </div>
  </div>
  );
};
