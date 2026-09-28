/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v2 — the composer (ref `composerHTML` / `well`). Three wells — letter
 * (required), synopsis, version — each filled by a rail click, a drag onto the well, or its own
 * `<select>`: three equal ways in, one state.
 *
 * ⚠️ A WELL ACCEPTS ONLY ITS OWN KIND. `dragover` calls `preventDefault` — which is what makes a
 * drop legal at all — only when the dragged material's kind is the well's, so a synopsis dropped on
 * the letter well is refused by the browser rather than filtered afterwards.
 *
 * ⚠️ THE DUPLICATE ROW STATES, IT DOES NOT BLOCK (buildRow.duplicateOf): two packages with the same
 * contents are legitimate; only doing it by accident is the problem.
 */
import React from "react";
import { MatKind, MaterialItem } from "../../lib/packagesPage";
import { SubmissionPackage } from "../../types";

export interface CompState {
  letter: string; synopsis: string; version: string;
  name: string; other: string; note: string;
  editId: string | null; dupFrom: string | null;
}
export const EMPTY_COMP: CompState = { letter: "", synopsis: "", version: "", name: "", other: "", note: "", editId: null, dupFrom: null };

const LABEL: Record<MatKind, string> = { letter: "Query letter", synopsis: "Synopsis", version: "Version" };

export interface PkgComposerProps {
  comp: CompState;
  mats: Record<MatKind, MaterialItem[]>;
  metaOf: (m: MaterialItem) => string;
  editName: string | null;
  suggestion: string;
  dupe: SubmissionPackage | null;
  /** Editing a SENT package whose contents now differ: the edition it starts (§B1). */
  warning?: string | null;
  dragKind: MatKind | null;
  /** the kind being dragged NOW, read at the event — the prop above is only for the outline */
  accepts: () => MatKind | null;
  onChange: (patch: Partial<CompState>) => void;
  onDropMat: (kind: MatKind) => void;
  onShowDup: (id: string) => void;
  onCancel: () => void;
  onCreate: () => void;
}

export const PkgComposer: React.FC<PkgComposerProps> = ({ comp, mats, metaOf, editName, suggestion, dupe, warning, dragKind, accepts, onChange, onDropMat, onShowDup, onCancel, onCreate }) => {
  const [over, setOver] = React.useState<MatKind | null>(null);
  const blocked = !comp.letter;
  const title = comp.editId ? `Edit ${editName ?? ""}` : comp.dupFrom ? `New package from ${comp.dupFrom}` : "New package";

  const well = (k: MatKind) => {
    const id = comp[k];
    const m = id ? mats[k].find((x) => x.id === id) : undefined;
    const can = dragKind === k;
    return (
      <div key={k} className={`ppv-well${over === k ? " is-over" : can ? " is-can" : ""}`} data-well={k}
        onDragOver={(e) => { if (accepts() === k) { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; if (over !== k) setOver(k); } }}
        onDragLeave={() => setOver((o) => (o === k ? null : o))}
        onDrop={(e) => { e.preventDefault(); setOver(null); if (accepts() === k) onDropMat(k); }}>
        <div className="ppv-wl"><span className="ppv-lbl">{LABEL[k]}</span><span className="req">{k === "letter" ? "Required" : "Optional"}</span></div>
        {m ? (
          <div className="ppv-filled" data-ppv="filled" data-mat={m.id}>
            <div className="fx">
              <div className={`fn${k === "version" ? " ver" : ""}`}>{m.name}</div>
              <div className="fm">{metaOf(m)}</div>
            </div>
            <button type="button" data-clear={k} aria-label={`Remove ${m.name} from the package`} onClick={() => onChange({ [k]: "" } as Partial<CompState>)}>×</button>
          </div>
        ) : (
          <>
            <select aria-label={`Choose a ${LABEL[k].toLowerCase()}`} value="" onChange={(e) => onChange({ [k]: e.target.value } as Partial<CompState>)}>
              <option value="">Choose…</option>
              {mats[k].map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
            <span className="or">or click one in Materials</span>
          </>
        )}
      </div>
    );
  };

  return (
    <section className="ppv-composer" data-ppv="composer" aria-label={comp.editId ? "Edit package" : "New package"}
      onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); onCancel(); } }}>
      <div className="ppv-chh"><b>{title}</b><span>Pick from your materials on the right, or choose below.</span></div>
      <div className="ppv-wells">{well("letter")}{well("synopsis")}{well("version")}</div>
      <div className="ppv-crow">
        <div className="ppv-f">
          <label htmlFor="ppv-c-name">Package name</label>
          <input id="ppv-c-name" value={comp.name} placeholder={suggestion} maxLength={80} autoComplete="off" onChange={(e) => onChange({ name: e.target.value })} />
          <span className="hint">Leave it blank to use “{suggestion}”.</span>
        </div>
        <div className="ppv-f">
          <label htmlFor="ppv-c-other">Other materials</label>
          <input id="ppv-c-other" value={comp.other} maxLength={512} placeholder="e.g. Author bio in the email body" autoComplete="off" onChange={(e) => onChange({ other: e.target.value })} />
          <span className="hint">Anything else that goes with it, in your own words.</span>
        </div>
      </div>
      <div className="ppv-f">
        <label htmlFor="ppv-c-note">Note</label>
        <textarea id="ppv-c-note" rows={2} maxLength={2000} placeholder="Who it's for, or when you'll use it" value={comp.note} onChange={(e) => onChange({ note: e.target.value })} />
      </div>
      {dupe ? (
        <div className="ppv-dupe" data-ppv="dupe">
          <span>Same letter, synopsis and version as <b>{dupe.packageName}</b>.</span>
          <button type="button" className="ppv-mini" onClick={() => onShowDup(dupe.id)}>Show me</button>
        </div>
      ) : null}
      {warning ? (
        <div className="ppv-edwarn" data-ppv="edwarn" role="status">
          <span className="ni">New edition</span><span>{warning}</span>
        </div>
      ) : null}
      <div className="ppv-cfoot">
        <span className="why" data-ppv="why">{blocked ? "Add a query letter to continue." : " "}</span>
        <span className="btns">
          <button type="button" className="ppv-btn" data-ppv="cancel" onClick={onCancel}>Cancel</button>
          <button type="button" className="ppv-btn ppv-btn--dark" data-ppv="create" disabled={blocked} onClick={onCreate}>{comp.editId ? "Save package" : "Create package"}</button>
        </span>
      </div>
    </section>
  );
};
