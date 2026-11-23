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
import React, { useLayoutEffect, useRef, useState } from "react";
import type { QcRow } from "../../../lib/qcSummary";
import type { RowAct } from "../../../lib/qc1512";
import type { DrawerMode } from "../../../lib/queryActions/drawerStore";
import { queriedFact, slipTone, slipTrack, standWords } from "../../../lib/qc153";
import { NEXT_WAIT_LABEL, OVERDUE_LINE, OVERDUE_VALUE, QUIET_CHIP, QUIET_LABEL, QUIET_VALUE, chipPress, nextBox154, nudgeOnLine } from "../../../lib/qc154";
import { materialGroups, tabAccent157 } from "../../../lib/qc1533";
import { scheduledNudgeMs } from "../../../lib/qc153";
import { shortDate } from "../../../lib/qc151";
import { ESC_LEVEL } from "../../../lib/escapeStack";
import { MatTab1533, Track153 } from "./QcSlip153";
import "./qcv153.css";
import "./qcv1531.css";
import "./qcv154.css";
import "./qcv1561.css";
import "./qcv157.css";
import "./pc2card.css";
/* Query card v160, Phase 4 — the band eases to a new stage */
import { STAGE_COLOURS, bandBackground, stageOf, statusBand } from "../../../lib/stageColours";
import { gridBand, gridEase } from "./qcMotion160";

const BELL = <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M8 2.5a4 4 0 0 0-4 4v2.5L2.8 11h10.4L12 9V6.5a4 4 0 0 0-4-4zM6.5 13a1.5 1.5 0 0 0 3 0" /></svg>;

export interface QcCard154Props {
  row: QcRow;
  nowMs: number;
  selected: boolean;
  packageName: string | null;
  act: RowAct | null;
  onOpen: (id: string) => void;
  onAct: (id: string, mode?: DrawerMode) => void;
  /**
   * Log a query v2 — THE REVIEW'S PREVIEW of a query not yet saved (the row is the save's own record, lib/queryActions/
   * logStages `previewOf`): not a link (no open on click or Enter, no tab stop, no role), no hover action in the Next box,
   * no hover lift, kept out of the page's row probes (no `data-qcv`). The paperclip stays a real button, its Escape
   * above the drawer's. With no reply date the Next box reads "No date yet" and the reminder, if one is set.
   */
  preview?: boolean;
}

const QcCard154Inner: React.FC<QcCard154Props> = ({ row: r, nowMs, selected, packageName, act, onOpen, onAct, preview }) => {
  /* v161 Phase 2 — a render count per query, for the e2e lock only (no production build carries it) */
  if (import.meta.env.MODE !== "production" && typeof window !== "undefined") {
    const w = window as unknown as { __qc154r?: Record<string, number> };
    (w.__qc154r ??= {})[r.id] = (w.__qc154r[r.id] ?? 0) + 1;
  }
  const t = slipTrack(r);
  const word = standWords(r);
  const sent = queriedFact(r, nowMs);
  const nx = nextBox154(r, nowMs);
  /* v157 — gone quiet (lib/qc154 `isQuietCard`, through the Next box): the fading band, navy dots on the current step,
     z's on hover, "Gone quiet · Nudge or close" in a hot box, and a chip that opens the card */
  const quiet = nx.kind === "quiet";
  const hot = (nx.kind === "other" && nx.hot) || quiet;
  const mats = materialGroups(r.query, r.status, packageName, r.stageStartMs, nowMs);
  const [popOpen, setPopOpen] = useState(false);
  /* v160 Phase 4 — the band's colour eases over 500ms when the stage changes; a gradient band (the offer's sheen, gone
     quiet's fade) at either end changes at once. Web Animations from the committed change, so it runs in the frame the
     new colour is drawn in (a CSS transition, measured, did not start behind the open card). */
  /* Plumage colours v1 — the band is the status's shade (requested lighter than sent). Plumage colours v2: no outline;
     an offer's band is the soft stripes (lib/stageColours bandBackground), inline on the band, so it eases at once */
  const band = statusBand(r.status);
  const bandBg = quiet ? null : bandBackground(r.status);
  const striped = bandBg !== null && bandBg !== band;
  const bandNow = { band, grad: quiet || striped };
  const bandWas = useRef(bandNow);
  const hdRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const e = gridEase(bandWas.current, bandNow);
    bandWas.current = bandNow;
    if (e) gridBand(hdRef.current, e);
  }, [bandNow.band, bandNow.grad]); // eslint-disable-line react-hooks/exhaustive-deps
  /* the slip's rule: a navy or nudge act is the button's words; anything else opens the card */
  const cta = act && act.tone !== "plain" ? act : null;
  const open = () => onOpen(r.id);
  const actLabel = quiet ? QUIET_CHIP : cta ? cta.label : "Open the card";
  const press = chipPress(quiet, cta);
  /* v2 preview — no reply date yet (Unknown on the Nudge step): the box says so, and names the reminder if there is one */
  const noDate = !!preview && r.court === "agent" && r.expectedMs == null && !r.pastExpected && nx.kind === "other";
  const pvNudge = noDate ? scheduledNudgeMs(r, nowMs) : null;
  const ctl = preview ? { role: "group" as const } : {
    role: "button" as const, tabIndex: 0, "aria-pressed": selected, "data-qcv": "row",
    onClick: open,
    onKeyDown: (e: React.KeyboardEvent) => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); open(); } },
  };
  return (
    <div className={`qc154-card${selected ? " is-sel" : ""}${popOpen ? " has-pop" : ""}`} id={`query-row-${r.id}`} data-qc154="card" data-id={r.id}
      data-tone={slipTone(r.status)} data-status={r.status} data-quiet={quiet ? "" : undefined} data-preview={preview ? "" : undefined}
      style={{ "--tone": band } as React.CSSProperties}
      aria-label={`${r.agentName}, ${r.agency}, ${word}`} {...ctl}>
      <div className="qc154-in">
        <div ref={hdRef} className="qc154-hd" data-qc154="band" style={striped ? { background: bandBg! } : undefined}>
          <span className="qc153-seal qc154-seal" aria-hidden="true">{r.initials}</span>
          <span className="qc154-who">
            <b className="qc154-nm" data-qc154="name">{r.agentName}</b>
            <span className="qc154-ag" data-qc154="agency">{r.agency}</span>
          </span>
          <span className="qc154-trkw" data-qc154="track" role="img" tabIndex={0} aria-label={`Where it stands: ${word}`} title={word}>
            <Track153 t={t} status={r.status} quiet={quiet} />
          </span>
          <span className="qc154-sr" data-qc154="word">{word}</span>
          {/* Plumage colours v2 — the status's name on a label across the band's bottom edge (pc2card.css); it replaces the
              hover label under the track */}
          <span className="pc2-lbl" data-pc2="label" aria-hidden="true" style={{ ["--pc2-edge" as string]: STAGE_COLOURS[stageOf(r.status)].edge } as React.CSSProperties}>{word}</span>
        </div>
        <div className="qc154-fx" data-qc154="facts">
          <div className="qc154-f" data-qc154="fact" data-k="sent">
            <span className="qc154-fl">Sent</span>
            <b>{sent.value}</b>{sent.line ? <em>{sent.line}</em> : null}
          </div>
          {/* v154 §3 — the Next box by state: waiting (the date, the window bar, the planned nudge if any), overdue (words
              only; the nudge is the hover's), or the slip's own Next copy */}
          <div className={`qc154-f qc154-nx${hot ? " is-hot" : ""}`} data-qc154="fact" data-k="next" data-state={nx.kind} data-hot={hot ? "" : undefined}>
            {noDate ? <>
              <span className="qc154-fl">{NEXT_WAIT_LABEL}</span>
              <b data-qc154="no-date">No date yet</b>
              {pvNudge != null ? <em className="qc154-nl" data-qc154="nudge-on">{BELL}{nudgeOnLine(shortDate(pvNudge, nowMs))}</em> : <em>No reminder set</em>}
            </> : nx.kind === "wait" ? <>
              <span className="qc154-fl">{NEXT_WAIT_LABEL}</span>
              <b>{nx.due}</b>
              <u className="qc154-bar" data-qc154="window" aria-hidden="true"><i style={{ width: `${Math.round(nx.bar * 100)}%` }} /></u>
              {nx.nudgeOn ? <em className="qc154-nl" data-qc154="nudge-on">{BELL}{nudgeOnLine(nx.nudgeOn)}</em> : null}
            </> : nx.kind === "quiet" ? <>
              <span className="qc154-fl">{QUIET_LABEL}</span>
              <b>{QUIET_VALUE}</b>{nx.line ? <em data-qc157="quiet-line">{nx.line}</em> : null}
            </> : nx.kind === "over" ? <>
              <span className="qc154-fl">Next</span>
              <b>{OVERDUE_VALUE}</b><em>{OVERDUE_LINE}</em>
            </> : <>
              <span className="qc154-fl">Next</span>
              <b>{nx.value}</b>{nx.line ? <em>{nx.line}</em> : null}
            </>}
            {/* v156.1 §3 — the action is a 32px arrow chip in the box's corner, a real button named by the action's label (the
                label also its tooltip); its click runs the action and stops there, so the card's own click (the slide-out)
                does not run as well. The box keeps its content and colour. */}
            {preview ? null : <button type="button" className="qc1561-chip" data-qc154="act" data-mode={press.kind === "act" ? press.mode : "open"} aria-label={actLabel}
              onClick={(e) => { e.stopPropagation(); if (press.kind === "act") onAct(r.id, press.mode); else open(); }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") e.stopPropagation(); }}>
              <span className="qc1561-arr" aria-hidden="true">→</span>
              <span className="qc1561-tip" aria-hidden="true">{actLabel}</span>
            </button>}
          </div>
        </div>
      </div>
      {/* v157 — the z's: over the band, crossing the card's top edge, outside the inner card (which clips) */}
      {quiet ? <span className="qc157-zz" data-qc157="zz" aria-hidden="true"><b>z</b><b>z</b><b>z</b></span> : null}
      {mats ? <span className="qc154-clipw" data-qc154="clip"><MatTab1533 id={r.id} g={mats} status={r.status} accent={tabAccent157(r.status)} onOpen={setPopOpen} escLevel={preview ? ESC_LEVEL.drawerPopup : undefined} /></span> : null}
    </div>
  );
};

/* ══ Query card v161, Phase 2 — A CARD WHOSE QUERY DID NOT CHANGE DOES NOT RE-RENDER ══════════════════════════════
   A save re-derived every row, so every grid card re-rendered inside the save's long task. The card is drawn from its
   row, the hour, whether it is selected, its package's name and its action: when none of those changed it is skipped.
   ⚠️ Its callbacks are compared by NOTHING: the callers pass stable ones (lib/useStableFn) that call the latest. */
const rowSigs = new WeakMap<object, string>();
const sigOf = (o: unknown): string => {
  if (o == null || typeof o !== "object") return JSON.stringify(o ?? null);
  let s = rowSigs.get(o);
  if (s == null) { s = JSON.stringify(o); rowSigs.set(o, s); }
  return s;
};
export const sameCard154 = (a: QcCard154Props, b: QcCard154Props): boolean =>
  a.selected === b.selected && a.packageName === b.packageName && a.preview === b.preview && Math.floor(a.nowMs / 3_600_000) === Math.floor(b.nowMs / 3_600_000)
  && (a.row === b.row || sigOf(a.row) === sigOf(b.row)) && sigOf(a.act) === sigOf(b.act);
export const QcCard154 = React.memo(QcCard154Inner, sameCard154);

