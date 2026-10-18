/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Discover v1 — the page's overlays: the Tune drawer (the shared HalfDrawer), the passed-on modal, the how-it-works
 * modal (and the steps card it shares with the coming-soon page), and the page's own toast.
 *
 * ⚠️ EVERYTHING HERE PORTALS TO `document.body`, OUTSIDE `.dv1-page` — so the palette these read is declared at
 *    `:root` (discover1.css), never on the page root, or every colour resolves to nothing.
 * ⚠️ MODALS ARE A LAYER ON THE ONE ESCAPE STACK (`ESC_LEVEL.pageModal`); focus goes to ✕ on open and back to the
 *    control that opened it on close.
 * ⚠️ THE TOAST CARRIES TWO ACTIONS THE SHARED ONE CANNOT (it has Undo only): "Log a query →" and Undo. It centres on
 *    the sheet by left/right + auto margins (the shell's published geometry), never `translateX`.
 */
import React, { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import type { DiscoverLens } from "../../../lib/discoverAgents";
import { LENS_LABEL, LENS_NOTE, type DiscoverPrefs, type PassedRow } from "../../../lib/scout";
import { agentInitials } from "../../../lib/agentDisplay";
import { HalfDrawer } from "../../shell/HalfDrawer";
import { DV_FACE } from "./DvHeader";
import { AgentDisc } from "../../shared/AgentDisc";

const X = <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true"><path d="M2 2l10 10M12 2 2 12" /></svg>;

/* ── the modal shell ─────────────────────────────────────────────────────── */

const DvModal: React.FC<{ open: boolean; onClose: () => void; label: string; small?: boolean; probe: string; children: React.ReactNode }> = ({ open, onClose, label, small, probe, children }) => {
  const xRef = useRef<HTMLButtonElement>(null);
  const opener = useRef<Element | null>(null);
  useEscapeLayer(open, onClose, ESC_LEVEL.pageModal);
  useLayoutEffect(() => {
    if (!open) return;
    opener.current = document.activeElement;
    const t = setTimeout(() => xRef.current?.focus({ preventScroll: true }), 30);
    return () => {
      clearTimeout(t);
      const o = opener.current as HTMLElement | null;
      if (o && typeof o.focus === "function") try { o.focus({ preventScroll: true }); } catch { /* the opener left */ }
    };
  }, [open]);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="dv1-layer dv1-mdim" data-dv1="modal-dim" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`dv1-modal${small ? " sm" : ""}`} role="dialog" aria-modal="true" aria-label={label} data-dv1={probe}>
        <button type="button" ref={xRef} className="dv1-x lt" data-dv1="modal-close" aria-label="Close" onClick={onClose}>{X}</button>
        {children}
      </div>
    </div>,
    document.body,
  );
};

/* ── how it works: the shared steps card ─────────────────────────────────── */

export const STEPS = [
  { h: "Writers add the agents they’re querying.", p: "Every contact list on QueryHawk feeds one shared catalogue. Yours already has — nothing more to do.", fig: "a writer adding an agent card to a growing pile" },
  { h: "Each agent is checked by hand.", p: "A real agency, open to queries, never a reading fee. An agent only reaches the Scout once it’s been verified.", fig: "the Archivist with a stamp, checking a card" },
  { h: "The Scout brings you the ones that fit.", p: "A few at a time, matched to your manuscript’s genre and the agent’s wish list, each with the reason. You decide who joins your list.", fig: "the Scout with binoculars, holding out a card" },
] as const;
export const STEPS_FOOT = "The Scout never writes to an agent for you. It finds them; querying is still yours.";

export const DvSteps: React.FC<{ headingId: string; focusStep?: number }> = ({ headingId, focusStep }) => (
  <div className="dv1-hwc">
  <section className="dv1-hw" aria-labelledby={headingId} data-dv1="steps">
    <h2 id={headingId}>How it works.</h2>
    <ol className="dv1-steps">
      {STEPS.map((s, i) => (
        <li key={s.h} data-dv1="step" data-on={focusStep === i ? "" : undefined}>
          <div className="dv1-sfig"><div className="dv1-ph"><span>Illustration</span><em>{s.fig}</em></div></div>
          <i>{i + 1}</i>
          <h3>{s.h}</h3>
          <p>{s.p}</p>
        </li>
      ))}
    </ol>
    <p className="dv1-hwn">{STEPS_FOOT}</p>
  </section>
  </div>
);

export const DvHowModal: React.FC<{ open: boolean; step?: number; onClose: () => void }> = ({ open, step, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open || step == null) return;
    const t = setTimeout(() => ref.current?.querySelector(`[data-dv1="step"]:nth-child(${step + 1})`)?.scrollIntoView({ block: "nearest" }), 60);
    return () => clearTimeout(t);
  }, [open, step]);
  return (
    <DvModal open={open} onClose={onClose} label="How the Scout finds agents" probe="how-modal">
      <div ref={ref}><DvSteps headingId="dv1HowH" focusStep={step} /></div>
    </DvModal>
  );
};

/* ── the passed-on list ──────────────────────────────────────────────────── */

export const DvPassedModal: React.FC<{ open: boolean; rows: PassedRow[]; onBringBack: (id: string) => void; onClose: () => void }> = ({ open, rows, onBringBack, onClose }) => (
  <DvModal open={open} onClose={onClose} label={`The ${rows.length} you passed on`} small probe="passed-modal">
    <div className="dv1-passed">
      <h3>The {rows.length} you passed on</h3>
      <p>Agents stay here for a year, then the Scout stops offering them. Bring one back and it rejoins your picks.</p>
      {rows.map(({ agent }) => (
        <div key={agent.id} className="dv1-qrow" data-dv1="passed-row" data-id={agent.id}>
          <AgentDisc initials={agentInitials(agent)} standing="none" size={36} className="av" />
          <span className="who"><b>{agent.name || agent.agency}</b><small>{[agent.name ? agent.agency : null, agent.city].filter(Boolean).join(" · ")}</small></span>
          <button type="button" className="dv1-lnk" data-dv1="bring-back" onClick={() => onBringBack(agent.id)}>Bring back</button>
        </div>
      ))}
    </div>
  </DvModal>
);

/* ── Tune the Scout ──────────────────────────────────────────────────────── */

export const DvTune: React.FC<{
  open: boolean;
  onClose: () => void;
  prefs: DiscoverPrefs;
  lens: DiscoverLens;
  lenses: DiscoverLens[];
  hasLocations: boolean;
  homeName: string | null;
  genres: string[];
  ageCategory: string | null;
  msTitle: string | null;
  onLens: (l: DiscoverLens) => void;
  onSwitch: (k: "openOnly" | "notOnList" | "ukIreland", v: boolean) => void;
  onManuscripts: () => void;
}> = (t) => {
  const SW: { k: "openOnly" | "notOnList" | "ukIreland"; l: string; s: string }[] = [
    { k: "openOnly", l: "Open to queries", s: "Closed agencies wait until they reopen" },
    { k: "notOnList", l: "Not already on my contact list", s: "You’ve got those already" },
    ...(t.hasLocations ? [{ k: "ukIreland" as const, l: "In the UK and Ireland", s: "Off: the Scout looks everywhere" }] : []),
  ];
  return (
    <HalfDrawer probe="dv1-tune" open={t.open} onClose={t.onClose} label="Tune the Scout" width="min(640px, 54vw)"
      head={(
        <div className="dv1-layer dv1-dh">
          <span className="dv1-disc-sm"><img alt="" src={`${DV_FACE.src}?v=${DV_FACE.version}`} /></span>
          <div className="tx"><h3>Tune the Scout</h3><small>What it looks for, and the order it brings them</small></div>
          <button type="button" className="dv1-x" data-dv1="tune-close" aria-label="Close" onClick={t.onClose}>{X}</button>
        </div>
      )}
      foot={(
        <div className="dv1-layer dv1-df"><span>Nothing joins your contact list without you.</span><button type="button" className="dv1-b p" data-dv1="tune-done" onClick={t.onClose}>Done</button></div>
      )}>
      <div className="dv1-layer dv1-db">
        <h5 style={{ marginTop: 4 }}>Bring them to me ranked by</h5>
        <div role="radiogroup" aria-label="Rank the picks by">
          {t.lenses.map((l) => (
            <label key={l} className="dv1-opt" data-dv1="lens-opt" data-lens={l} aria-checked={t.lens === l}>
              <input type="radio" name="dv1-lens" value={l} checked={t.lens === l} onChange={() => t.onLens(l)} />
              <span><b>{LENS_LABEL[l]}</b><small>{LENS_NOTE[l]}{l === "local" && t.homeName ? ` — ${t.homeName}` : ""}</small></span>
            </label>
          ))}
        </div>
        <h5>Only bring me agents who are</h5>
        {SW.map((w) => (
          <button key={w.k} type="button" className="dv1-sw" role="switch" aria-checked={t.prefs[w.k]} data-dv1="switch" data-k={w.k}
            onClick={() => t.onSwitch(w.k, !t.prefs[w.k])}>
            <span><b>{w.l}</b><small>{w.s}</small></span><span className="t" aria-hidden="true" />
          </button>
        ))}
        <h5>Matching on</h5>
        <div className="dv1-gchips" data-dv1="matching">
          {t.genres.map((g) => <span key={g} className="m">{g}</span>)}
          {t.ageCategory ? <span>{t.ageCategory}</span> : null}
          {!t.genres.length ? <span className="none">No genre set</span> : null}
        </div>
        <p className="dv1-note">
          {t.msTitle ? <>From <i>{t.msTitle}</i>’s details. </> : null}Change its genres on the{" "}
          <button type="button" className="dv1-inl" onClick={t.onManuscripts}>Manuscripts page</button> and the Scout follows.
        </p>
      </div>
    </HalfDrawer>
  );
};

/* ── the toast ───────────────────────────────────────────────────────────── */

export interface ToastState { id: number; msg: React.ReactNode; action?: { label: string; run: () => void }; undo?: () => void }

export const DvToast: React.FC<{ toast: ToastState | null; onDone: () => void; ms: number }> = ({ toast, onDone, ms }) => {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDone, ms);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast?.id]);
  if (!toast || typeof document === "undefined") return null;
  return createPortal(
    <div className="dv1-layer dv1-toast" role="status" data-dv1="toast">
      <span data-dv1="toast-msg">{toast.msg}</span>
      {toast.action ? (
        <button type="button" className="dv1-tact" data-dv1="toast-action" onClick={toast.action.run}>
          {toast.action.label}<svg viewBox="0 0 14 10" aria-hidden="true"><path d="M1 5h11M8.5 1.5 12 5 8.5 8.5" /></svg>
        </button>
      ) : null}
      {toast.undo ? <button type="button" className="dv1-tundo" data-dv1="toast-undo" onClick={toast.undo}>Undo</button> : null}
    </div>,
    document.body,
  );
};
