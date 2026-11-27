/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v153 (design-refs/query-centre-v153.html) — THE SLIP: one framed card per query. A header band in the
 * stage's colour (the navy seal, the name, the agency in italic; the status word over the four-step track, an arrow
 * badge on the current step), the hover CTA beside it, and four fact boxes below.
 *
 * v153.1 (design-refs/query-centre-v153-1.html): the header is compact (a 40px seal, a 34px current step), the
 * fourth fact is the agent's reply policy (Sent with is gone).
 *
 * v153.3 (design-refs/query-centre-v153-3.html): the materials strip is gone; a paperclip tab beside the name and
 * agency counts the materials, tinted to the slip's stage, and its pop-up groups them by when they went (lib/qc1533).
 * The tab is a real button: it takes focus, Enter or Space opens it, and a click on it never opens the card. While
 * its pop-up is open the slip is raised above its neighbours, and the pop-up opens upwards with under 200px below.
 *
 * ⚠️ THE WHOLE SLIP IS ONE CONTROL: a click anywhere, Enter or Space opens the card (`onOpen`). Its id is
 *    `query-row-{id}`, the element the query panel gives focus back to when it closes. The CTA is a mouse shortcut to
 *    the same journeys the card offers, so it takes no tab stop of its own (a button inside a button is two controls
 *    claiming one place); a keyboard reader opens the card and acts there.
 * ⚠️ NO RED: the late Next box is a fill and a navy dot, its words stay ink.
 */
import React, { useEffect, useRef, useState } from "react";
import type { QcRow } from "../../../lib/qcSummary";
import type { RowAct } from "../../../lib/qc1512";
import type { DrawerMode } from "../../../lib/queryActions/drawerStore";
import { heardFact, nextFact, queriedFact, slipTone, slipTrack, standWords, type SlipTrack } from "../../../lib/qc153";
import { statusBand } from "../../../lib/stageColours";
import { policyWords } from "../../../lib/qc1531";
import { materialGroups, materialsName, tabAccent157, type MatGroups, type TabAccent } from "../../../lib/qc1533";
import { MaterialIcon } from "../../shared/MaterialIcon";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import type { Agent } from "../../../types";
import { StatusDot } from "../../StatusDot";
import { QueryStatus } from "../../../types";
import "../../containers/framedSlip.css";
import "./qcv153.css";
import "./qcv1531.css";

export const A_IN = <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.5 3.5 4 12M4 5.5V12h6.5" /></svg>;
export const A_OUT = <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 12.5 12 4M5.5 4H12v6.5" /></svg>;
/* v172 — a quiet card's badge: a sleeping z z z, each z a little larger and higher (qcv169.css `.qr170-zz`); it
   replaces v157's three dots */
export const ZZZ153 = <span className="qr170-zz"><i>z</i><i>z</i><i>z</i></span>;
export const A_END = <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 8h8" /></svg>;

export const FACT_ICON = {
  queried: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"><path d="M14 2 1.8 7.2l5 2 2 5z" /><path d="M14 2 6.8 9.2" /></svg>,
  heard: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"><path d="M2 3h12v8H8.5L5 13.8V11H2z" /></svg>,
  next: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="6.2" /><path d="M8 4.6V8l2.4 1.6" /></svg>,
  /* v153.1 — their policy: a ruled page */
  policy: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"><path d="M3.5 2h9v12h-9z" /><path d="M6 5.5h4M6 8h4M6 10.5h2.5" /></svg>,
} as const;

/* status marks v3 — each step is drawn by StatusDot: the status that step stands for, and a closed query's current
   step its closed status (the three endings share one mark; the word and the tooltip tell them apart) */
const STEP_STATUS: readonly QueryStatus[] = [QueryStatus.QUERIED, QueryStatus.PARTIAL_SENT, QueryStatus.FULL_SENT, QueryStatus.OFFER];
const END_STATUS: Record<NonNullable<SlipTrack["end"]>, QueryStatus> = { rj: QueryStatus.REJECTED, nr: QueryStatus.NO_RESPONSE, wd: QueryStatus.WITHDRAWN };
const NODE_TITLE = ["Queried", "Partial", "Full", "Offer"] as const;
/* ⚠️ THE WRAPPER'S SIZE, NOT THE DRAWING'S. The track's CSS sizes the svg (`.qc153-nd svg`, 17 to 24px by context);
   StatusDot's wrapper span is a layout box only, kept at the minimum so it never outgrows the smallest node (21px)
   and pushes the svg off centre. */
const STEP_WRAP = 12;
/* status marks v3.1 — A REVISE & RESUBMIT QUERY'S CURRENT STEP IS ITS OWN MARK, the arrows, not the Full step's. Only R&R:
   Resubmitted keeps Full Sent's mark, and a requested status keeps its step's solid mark (the arrow badge says whose
   move it is). ⚠️ StatusDot switches R&R's form on the size it is given, so this one wrapper states the smallest size
   the current step's svg renders at — 17px (a card under 380px; 20 on the grid, 24 in the log-a-query slip) — which
   draws the ring and fits inside the smallest current node (28px). */
const RR_CUR_WRAP = 17;

/** the four-step track: ink to the current step, faded future, a dotted line into a skipped step. (v154's hover label
 *  under the current step is retired: Plumage colours v2 names the status on the grid card's band label.)
 *  v157: `quiet` (the grid card's gone quiet) draws three dots in the current step's badge in place of the arrow. */
export const Track153: React.FC<{ t: SlipTrack; status?: string; quiet?: boolean }> = ({ t, status, quiet }) => (
  <span className={`qc153-trk${t.ended ? " is-ended" : ""}`} data-qc153="track" data-dir={t.dir}>
    {t.nodes.map((n, i) => {
      const rr = n === "cur" && status === QueryStatus.REVISE_RESUBMIT;
      const st = n === "cur" && t.end ? END_STATUS[t.end] : rr ? QueryStatus.REVISE_RESUBMIT : STEP_STATUS[i];
      /* the Offer step is the outline seal until the query is at it (Offer or Signed) */
      const reached = i === 3 ? n === "cur" : true;
      return (
        <React.Fragment key={i}>
          {i ? <i className={`qc153-ln qc153-ln--${t.links[i - 1]}`} data-qc153="link" data-state={t.links[i - 1]} aria-hidden="true" /> : null}
          <span className={`qc153-nd qc153-nd--${n}`} data-qc153="node" data-state={n} title={NODE_TITLE[i]}>
            <StatusDot status={st} overrideSize={rr ? RR_CUR_WRAP : STEP_WRAP} tone="inherit" reached={reached} decorative />
            {n === "cur" ? <b className={`qc153-arw qc153-arw--${t.dir}${quiet ? " qc153-arw--quiet" : ""}`} data-qc153="arrow" data-dir={t.dir} data-quiet={quiet ? "" : undefined} aria-hidden="true">{quiet ? ZZZ153 : t.dir === "in" ? A_IN : t.dir === "out" ? A_OUT : A_END}</b> : null}
          </span>
        </React.Fragment>
      );
    })}
  </span>
);

/** the paperclip glyph (Plumage colours v3: the grid card's materials tile draws it too, QcMatTile) */
export const CLIP = <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="M10.5 4.5 5.8 9.2a1.6 1.6 0 0 0 2.3 2.3l5-5a2.9 2.9 0 0 0-4.1-4.1l-5.2 5.2a4.2 4.2 0 0 0 5.9 5.9l4.3-4.3" /></svg>;
/** under this much room below the tab, the pop-up opens upwards */
export const POP_FLIP_BELOW = 200;

/** v153.3 — the paperclip tab and its pop-up: the materials, grouped by when they went */
/** v157: `accent`, when given, replaces the v153 tone's (the grid card passes its stage's, lib/qc1533 `tabAccent157`) */
export const MatTab1533: React.FC<{ id: string; g: MatGroups; status: string; accent?: TabAccent; onOpen: (open: boolean) => void;
  /** Log a query v2 — the Escape level when the tab sits inside a drawer (the journey's review card); the page's otherwise */
  escLevel?: number }> = ({ id, g, status, accent, onOpen, escLevel = ESC_LEVEL.page }) => {
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const wrap = useRef<HTMLSpanElement>(null);
  const show = () => {
    const r = btn.current?.getBoundingClientRect();
    setUp(!!r && window.innerHeight - r.bottom < POP_FLIP_BELOW);
    setOpen(true);
  };
  const hide = () => setOpen(false);
  useEffect(() => { onOpen(open); }, [open, onOpen]);
  useEscapeLayer(open, () => { hide(); btn.current?.focus(); }, escLevel);
  const a = accent ?? tabAccent157(status);
  const popId = `qc1533-pop-${id}`;
  return (
    <span className="qc1533-tw" ref={wrap} onPointerEnter={show} onPointerLeave={() => { if (!wrap.current?.contains(document.activeElement)) hide(); }}
      onClick={(e) => e.stopPropagation()}>
      <button ref={btn} type="button" className={`qc1533-clip${open ? " is-open" : ""}`} data-qc1533="tab" aria-label={materialsName(g.count)}
        aria-expanded={open} aria-controls={popId}
        style={{ "--acc": a.accent, "--acc-ink": a.ink, "--acc-rest": a.rest } as React.CSSProperties}
        onFocus={show} onBlur={(e) => { if (!wrap.current?.contains(e.relatedTarget as Node)) hide(); }}
        onClick={(e) => { e.stopPropagation(); if (!open) show(); }}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); if (open) hide(); else show(); } }}>
        {CLIP}<i>{g.count}</i>
      </button>
      {open ? (
        <span className={`qc1533-pop${up ? " is-up" : ""}`} id={popId} role="group" aria-label="Materials" data-qc1533="pop" data-up={up ? "" : undefined}>
          <b>Materials</b>
          {g.groups.map((x, i) => (
            <span key={i} className="qc1533-pg" data-qc1533="group" data-kind={x.kind}>
              <span className="qc1533-pgh">{x.label}</span>
              <span className="qc1533-mxr">
                {x.chips.map((c) => (
                  <span key={c.name} className={`qc1533-mc${c.asked ? " is-ask" : ""}`} data-qc1533="chip" data-asked={c.asked ? "" : undefined}>
                    {c.mark === "full" ? <i className="qc1533-sh" aria-hidden="true" /> : c.mark ? <MaterialIcon kind={c.mark} size={16} /> : null}{c.name}{c.asked ? " · asked" : null}
                  </span>
                ))}
                {x.pkg ? <span className="qc1533-mpk" data-qc1533="pkg">{x.pkg}</span> : null}
              </span>
            </span>
          ))}
        </span>
      ) : null}
    </span>
  );
};

export interface QcSlip153Props {
  row: QcRow;
  nowMs: number;
  selected: boolean;
  packageName: string | null;
  /** v153.1 — the query's agent, for their reply policy (null when the agent is not on file) */
  agent?: Pick<Agent, "noResponseMeansNo" | "responseTimeWeeks"> | null;
  act: RowAct | null;
  onOpen: (id: string) => void;
  onAct: (id: string, mode?: DrawerMode) => void;
  /**
   * Log a query v1 — the check stage's PREVIEW of an unsaved query: the slip is not a control (no click-to-open, no tab
   * stop, no hover CTA) and only its paperclip tab works. `policy` replaces that fact's words where the agent's card
   * states no reply window ("Not on their card"). v1.3: the Next fact takes no override; `nextFact` says it all.
   */
  preview?: { policy?: { value: string; line: string | null } };
}

export const QcSlip153: React.FC<QcSlip153Props> = ({ row: r, nowMs, selected, packageName, agent = null, act, onOpen, onAct, preview }) => {
  const t = slipTrack(r);
  const word = standWords(r);
  const qd = queriedFact(r, nowMs);
  const hd = heardFact(r, nowMs);
  const nx = nextFact(r, nowMs);
  const pol = preview?.policy ?? policyWords(agent);
  const mats = materialGroups(r.query, r.status, packageName, r.stageStartMs, nowMs);
  const [popOpen, setPopOpen] = useState(false);
  const cta = act && act.tone !== "plain" ? act : null;
  const open = () => onOpen(r.id);
  return (
    <div className={`sa-slip qc153-slip${selected ? " is-sel" : ""}${popOpen ? " has-pop" : ""}${preview ? " is-preview" : ""}`} id={preview ? undefined : `query-row-${r.id}`}
      data-qc153="slip" data-qcv={preview ? "preview" : "row"} data-id={r.id} data-tone={slipTone(r.status)} data-status={r.status}
      style={{ "--tone": statusBand(r.status) } as React.CSSProperties}
      {...(preview
        ? { role: "group", "aria-label": `Preview: ${r.agentName}, ${r.agency}, ${word}` }
        : { role: "button", tabIndex: 0, "aria-label": `${r.agentName}, ${r.agency}, ${word}`, "aria-pressed": selected, onClick: open,
            onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); open(); } } })}>
      <div className="sa-slip-in">
        <div className="qc153-top" data-qc153="head">
          <span className="qc153-seal" aria-hidden="true">{r.initials}</span>
          <span className="qc1533-wr">
            <span className="qc153-who">
              <b className="qc153-nm" data-qc153="name">{r.agentName}</b>
              <span className="qc153-ag" data-qc153="agency">{r.agency}</span>
            </span>
            {mats ? <MatTab1533 id={r.id} g={mats} status={r.status} onOpen={setPopOpen} /> : null}
          </span>
          <span className="qc153-rt">
            {preview ? null : <span className="qc153-cta" data-qc153="cta" aria-hidden="true">
              {cta
                ? <button type="button" tabIndex={-1} className="qc153-btn" data-qc153="cta-btn" data-mode={cta.mode} onClick={(e) => { e.stopPropagation(); onAct(r.id, cta.mode); }}>{cta.label} →</button>
                : <button type="button" tabIndex={-1} className="qc153-btn qc153-btn--ghost" data-qc153="cta-open" onClick={(e) => { e.stopPropagation(); open(); }}>Open the card →</button>}
            </span>}
            {/* v153.2 — the status word beside the track, to its right, on one line */}
            <span className="qc153-st">
              <Track153 t={t} status={r.status} />
              <span className="qc153-wd" data-qc153="word">{word}</span>
            </span>
          </span>
        </div>
        <div className="qc153-facts" data-qc153="facts">
          <div className="qc153-fact" data-qc153="fact" data-k="queried">
            <span className="qc153-fl"><i className="qc153-fi" aria-hidden="true">{FACT_ICON.queried}</i>Queried</span>
            <b>{qd.value}</b>{qd.line ? <em>{qd.line}</em> : null}
          </div>
          <div className={`qc153-fact${hd.soft ? " is-soft" : ""}`} data-qc153="fact" data-k="heard">
            <span className="qc153-fl"><i className="qc153-fi" aria-hidden="true">{FACT_ICON.heard}</i>Last heard</span>
            <b>{hd.value}</b>{hd.line ? <em>{hd.line}</em> : null}
          </div>
          <div className={`qc153-fact${nx.hot ? " is-hot" : ""}`} data-qc153="fact" data-k="next" data-hot={nx.hot ? "" : undefined}>
            <span className="qc153-fl"><i className="qc153-fi" aria-hidden="true">{FACT_ICON.next}</i>{nx.label}</span>
            <b>{nx.value}</b>{nx.line ? <em data-qc1532="next-line">{nx.line}</em> : null}
            {nx.bar != null ? <u className="qc153-win" data-qc153="window" aria-hidden="true"><i style={{ width: `${Math.round(nx.bar * 100)}%` }} /></u> : null}
          </div>
          <div className="qc153-fact qc1531-pol" data-qc153="fact" data-k="policy">
            <span className="qc153-fl"><i className="qc153-fi" aria-hidden="true">{FACT_ICON.policy}</i>Their policy</span>
            <b>{pol.value}</b>{pol.line ? <em>{pol.line}</em> : null}
          </div>
        </div>
      </div>
    </div>
  );
};
