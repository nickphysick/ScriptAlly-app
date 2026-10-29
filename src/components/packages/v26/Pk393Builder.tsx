/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v39.3 (design-refs/submission-packages-v39-3/, option B · Steps + preview) — the builder under
 * BUILD, VIEW AND EDIT: the Steps column on the left, the preview of what an agent receives on the right.
 *
 *   Phase 1 · the package header (the package's colour band: icon tile → the v39 icon-and-colour popover, the name
 *   renamed in place, the note, the Active tag or Make active, ONE status pill, Figures) and, on a sent package, the
 *   note between the header and the steps.
 *
 * ⚠️ UNTIL PHASE 4 retires the old package card, this header carries only `data-pk393` markers (the old card still
 *    carries the `data-pk39` / `data-pk38` ones the existing locks read; two of each would break them).
 * ⚠️ A SENT PACKAGE IS LOCKED, AS v40 RULED, AND THE NOTE SAYS SO (Nick, 29 Oct, over the pack's copy): the pack's note
 *    promised "a new edition from your next query", which nothing does — `changeContents` refuses every change to a
 *    package that is out with agents, and nothing starts an edition. So the note reads "What went stays as it went. To
 *    change anything, make a copy", with Make a copy (and Retire, which lived only in the old card's foot).
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { SubmissionPackage } from "../../../types";
import { iconOf } from "../../../lib/packagesV26";
import { canMakeActive, canRetire, isLocked, packageStage } from "../../../lib/packagesV40";
import { pcStyle } from "../../../lib/packagesV39";
import { Lock, Pic } from "./icons";
import { DRAFT_ID, LookPicker, NameInPlace } from "./Pk26Builder";
import type { Pk26Model } from "./usePk26Model";

/** The status pill's words: "{n} of 2 needed" while the version or the letter is missing, then ready, then out. */
export function stepStatus(p: Pick<SubmissionPackage, "bookVersionId" | "queryLetterVersionId">, sent: number, out: boolean): { text: string; green: boolean } {
  if (out) return { text: sent ? `Out with agents · ${sent} sent` : "Out with agents", green: true };
  const have = [p.bookVersionId, p.queryLetterVersionId].filter(Boolean).length;
  return have === 2 ? { text: "Ready to send", green: true } : { text: `${have} of 2 needed`, green: false };
}

/** The sent note's words (Nick's ruling): what is true of a locked package. */
export const sentNoteText = (n: number) => ({
  lead: `Out with ${n} ${n === 1 ? "agent" : "agents"}.`,
  rest: ` What went stays as it went. To change anything, make a copy. ${n === 1 ? "The one already sent keeps exactly what it got." : `The ${n} already sent keep exactly what they got.`}`,
});

export interface Pk393Props {
  model: Pk26Model;
  /** the open package, or the draft first package */
  p: SubmissionPackage;
  isActive: boolean;
  onFigures: (p: SubmissionPackage) => void;
  onEdit: (p: SubmissionPackage, focus?: "note") => void;
  onDuplicate: (p: SubmissionPackage) => void;
}

/** The package header: a rounded band in the package's colour. */
const Header: React.FC<Pk393Props & { locked: boolean; out: boolean; sent: number }> = ({ model, p, isActive, onFigures, onEdit, out, sent }) => {
  const draft = p.id === DRAFT_ID;
  const tile = useRef<HTMLButtonElement | null>(null);
  const [picker, setPicker] = useState(false);
  const closePicker = useMemo(() => () => { setPicker(false); tile.current?.focus(); }, []);
  useEffect(() => { setPicker(false); }, [p.id]);
  const st = stepStatus(p, sent, out);
  return (
    <div className="p93-bh" style={pcStyle(p)} data-pk393="head">
      <button ref={tile} type="button" className="p93-bh-ic" aria-label="Change icon and colour" title="Change icon and colour" aria-expanded={picker} aria-haspopup="dialog"
        disabled={draft} data-pk393="tile" onClick={() => setPicker((v) => !v)}>
        <Pic ic={iconOf(p)} cls="p9-pic" />
      </button>
      <div className="p93-bh-t">
        <h3>{draft ? <span className="p9-po-nm p9-locked">{p.packageName}</span> : <NameInPlace model={model} p={p} />}
          {isActive && !draft ? <em className="p9-po-act">Active</em> : null}
          {!draft && !isActive && canMakeActive(p, model.active?.id) ? <button type="button" className="p93-mk" onClick={() => void model.makeActive(p)}>Make active</button> : null}
        </h3>
        {p.note ? <small title={p.note}>{p.note}</small>
          : draft ? <small>{p.note}</small> : <small><button type="button" className="p93-addnote" onClick={() => onEdit(p, "note")}>Add a note: who is this for?</button></small>}
      </div>
      <span className={`p93-bh-s${st.green ? " p93-g" : ""}`} data-pk393="status"><i aria-hidden="true" />{st.text}</span>
      {draft ? <span /> : (
        <button type="button" className="p93-bh-f" title="Figures" aria-label="Figures" data-pk393="figures" onClick={() => onFigures(p)}>
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 16V9M10 16V4M16 16v-5" /></svg>
        </button>
      )}
      {picker && tile.current ? <LookPicker model={model} p={p} anchor={tile.current} onClose={closePicker} /> : null}
    </div>
  );
};

export const Pk393Builder: React.FC<Pk393Props> = (props) => {
  const { model, p, onDuplicate } = props;
  const draft = p.id === DRAFT_ID;
  const locked = !draft && isLocked(p);
  const st = draft ? "draft" : packageStage(p);
  const out = st === "out" || st === "retired";
  const sent = draft ? 0 : model.figPk(p).sent;
  const note = sentNoteText(sent);
  const from = p.copiedFromId ? model.msPkgs.find((x) => x.id === p.copiedFromId) ?? null : null;
  return (
    <div className="p93-b" data-pk393="builder" data-pkg={p.id}>
      <div className="p93-col" data-pk393="steps-col">
        <Header {...props} locked={locked} out={out} sent={sent} />
        {from ? <div className="p9-lc-from">Copied from <b>{from.packageName}</b>. Change one piece, and Results can tell you what that piece did.</div> : null}
        {locked ? (
          <div className="p93-lock" data-pk393="sent-note">
            <Lock />
            <span><b>{note.lead}</b>{note.rest}
              <span className="p93-lock-a">
                <button type="button" className="p93-lnk" data-pk393="copy-link" onClick={() => onDuplicate(p)}>Make a copy</button>
                {canRetire(p, model.active?.id) ? <button type="button" className="p93-lnk p93-q" onClick={() => void model.retire(p)}>Retire</button> : null}
              </span>
            </span>
          </div>
        ) : null}
      </div>
      <aside className="p93-pv" data-pk393="preview" />
    </div>
  );
};
