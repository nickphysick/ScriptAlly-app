/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v154 (design-refs/query-centre-v154.html, read from the rendered page at 1920) — THE CARD: one small
 * framed card per query in a 3-across grid. A band in the stage's colour (the navy seal, the name, the agency in
 * italic; the four-step track on the right, no status word on show), a wire paperclip over the top edge when there are
 * materials, and two fact boxes: Sent, and Next. On hover or focus-within the Next box becomes the slip's own action.
 *
 * ⚠️ IT IS THE SLIP'S SUCCESSOR, NOT A SECOND SLIP: the same row (`QcRow`), the same facts (lib/qc153), the same
 *    paperclip and pop-up (`MatTab1533`), the same track (`Track153`), the same action (`rowAct`) and the same id
 *    (`query-row-{id}`, where the query panel gives focus back). QcSlip153 stays on disk for its exports.
 * ⚠️ THE WHOLE CARD IS ONE CONTROL: a click anywhere or Enter opens the card (`onOpen`). The action is a mouse
 *    shortcut to a journey the card also offers, so it takes no tab stop; the paperclip is a real button, as on the slip.
 * ⚠️ THE STATUS WORD IS NEVER DRAWN AT REST, and never dropped: it names the card, it names the track (and its
 *    `title`), and it sits in a visually hidden span beside the track.
 */
import React, { useState } from "react";
import type { QcRow } from "../../../lib/qcSummary";
import type { RowAct } from "../../../lib/qc1512";
import type { DrawerMode } from "../../../lib/queryActions/drawerStore";
import { nextFact, queriedFact, slipTone, slipTrack, standWords } from "../../../lib/qc153";
import { materialGroups } from "../../../lib/qc1533";
import { MatTab1533, Track153 } from "./QcSlip153";
import "./qcv153.css";
import "./qcv1531.css";
import "./qcv154.css";

export interface QcCard154Props {
  row: QcRow;
  nowMs: number;
  selected: boolean;
  packageName: string | null;
  act: RowAct | null;
  onOpen: (id: string) => void;
  onAct: (id: string, mode?: DrawerMode) => void;
}

export const QcCard154: React.FC<QcCard154Props> = ({ row: r, nowMs, selected, packageName, act, onOpen, onAct }) => {
  const t = slipTrack(r);
  const word = standWords(r);
  const sent = queriedFact(r, nowMs);
  const nx = nextFact(r, nowMs);
  const mats = materialGroups(r.query, r.status, packageName, r.stageStartMs, nowMs);
  const [popOpen, setPopOpen] = useState(false);
  /* the slip's rule: a navy or nudge act is the button's words; anything else opens the card */
  const cta = act && act.tone !== "plain" ? act : null;
  const open = () => onOpen(r.id);
  return (
    <div className={`qc154-card${selected ? " is-sel" : ""}${popOpen ? " has-pop" : ""}`} id={`query-row-${r.id}`} data-qc154="card" data-qcv="row" data-id={r.id}
      data-tone={slipTone(r.status)} data-status={r.status} role="button" tabIndex={0}
      aria-label={`${r.agentName}, ${r.agency}, ${word}`} aria-pressed={selected}
      onClick={open}
      onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); open(); } }}>
      <div className="qc154-in">
        <div className="qc154-hd" data-qc154="band">
          <span className="qc153-seal qc154-seal" aria-hidden="true">{r.initials}</span>
          <span className="qc154-who">
            <b className="qc154-nm" data-qc154="name">{r.agentName}</b>
            <span className="qc154-ag" data-qc154="agency">{r.agency}</span>
          </span>
          <span className="qc154-trkw" data-qc154="track" role="img" tabIndex={0} aria-label={`Where it stands: ${word}`} title={word}>
            <Track153 t={t} label={word} />
          </span>
          <span className="qc154-sr" data-qc154="word">{word}</span>
        </div>
        <div className="qc154-fx" data-qc154="facts">
          <div className="qc154-f" data-qc154="fact" data-k="sent">
            <span className="qc154-fl">Sent</span>
            <b>{sent.value}</b>{sent.line ? <em>{sent.line}</em> : null}
          </div>
          <div className={`qc154-f qc154-nx${nx.hot ? " is-hot" : ""}`} data-qc154="fact" data-k="next" data-hot={nx.hot ? "" : undefined}>
            <span className="qc154-fl">Next</span>
            <b>{nx.value}</b>{nx.line ? <em>{nx.line}</em> : null}
            <span className="qc154-act" data-qc154="act-wrap" aria-hidden="true">
              {cta
                ? <button type="button" tabIndex={-1} className="qc154-actb" data-qc154="act" data-mode={cta.mode} onClick={(e) => { e.stopPropagation(); onAct(r.id, cta.mode); }}>{cta.label} →</button>
                : <button type="button" tabIndex={-1} className="qc154-actb" data-qc154="act" data-mode="open" onClick={(e) => { e.stopPropagation(); open(); }}>Open the card →</button>}
            </span>
          </div>
        </div>
      </div>
      {mats ? <span className="qc154-clipw" data-qc154="clip"><MatTab1533 id={r.id} g={mats} status={r.status} onOpen={setPopOpen} /></span> : null}
    </div>
  );
};
