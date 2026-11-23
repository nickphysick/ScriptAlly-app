/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query card v167 §C (design-refs/query-card-v167/query-card-v167.html, "Click a tile") — EDITING THE AGENT'S PROFILE
 * FROM THE QUERY CARD. A tile, or "What {first} asks for", opens the card's own drawer: the composer drawer's slot and
 * entrance (`.qc1522-cp`), with a profile band across the top that says plainly where the save goes.
 *
 * ⚠️ IT SAVES TO THE AGENT'S PROFILE, for every query with that agent, through the agent card's one save path
 *    (lib/agentCardSave `commitCardSave`, called by the page). The drawer writes nothing itself: it hands a patch over.
 * ⚠️ THE APP'S OWN PARTS: the reply time is `WeekSlider` as it stands (1–26, readout, "Unknown"); the methods are the
 *    agent card's `METHOD_PILLS`, in order, with their stored values and words; the sample is `SampleControl`.
 * ⚠️ THE AGENT IS ALWAYS NAMED, never "he", "she" or "they".
 * Query card v168 — LEAVING WITH A CHANGE ASKS: Cancel, ✕, Esc and "Back to …" with something changed show the one
 * question ("Discard your changes?" · Keep editing · Discard, QcEdit168 DiscardAsk) in the drawer's footer. The drawer
 * holds the card's one-open rule while it is open, so any other door on the card asks here too. Nothing else changes.
 */
import React, { useEffect, useRef, useState } from "react";
import { WeekSlider } from "../../forms/WeekSlider";
import { METHOD_PILLS } from "../../agents/card/agentPills";
import { SubmissionMethod } from "../../../types";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { ARROW, Seal } from "./QcGhost167";
import type { ProfileKey } from "./QcAgent158";
import { DiscardAsk, mut168, useHold168 } from "./QcEdit168";

/** the agent's profile, as stored, for the drawers */
export interface ProfileIn {
  agentId: string;
  first: string;
  initials: string;
  weeks: number | null;
  nrmn: boolean | null;
  /** the stored `submissionMethod` (types.ts SubmissionMethod), or null */
  method: string | null;
  /** the words behind a stored "Other" method */
  methodOther: string | null;
  materialsWanted: string[];
}
/** what a profile save changes: only the fields this drawer touched */
export interface ProfilePatch {
  weeks?: number | null;
  nrmn?: boolean;
  method?: string;
  materialsWanted?: string[];
}

export const PROFILE_TITLE = (k: ProfileKey, first: string): string =>
  k === "weeks" ? `How long does ${first} take to reply?` : k === "method" ? `How does ${first} take queries?` : `What does ${first} ask for?`;

/** "Saved for every query you send {first}", and, mid-journey, that the journey waits */
export const profileLine = (first: string, journey: string | null): string =>
  journey ? `Saved for every query you send ${first}. “${journey}” is waiting for you.` : `Saved for every query you send ${first}`;
export const cancelWords = (journey: string | null): string => (journey ? `Back to “${journey}”` : "Cancel");
/** the journey that waits, by the composer's own journey (its `data-j`): the short name the band and Back say */
export const JOURNEY_NAME: Record<string, string> = {
  send: "Mark sent", nudge: "Nudge", reply: "Record a response", close: "Close", reopen: "Reopen", unpass: "Take the pass off",
  offer: "Answer an offer", tell: "Tell the other agents", accept: "Accept the offer", decline: "Decline the offer",
};
export const journeyName167 = (j: string): string | null => JOURNEY_NAME[j] ?? (j ? "Your journey" : null);
export const savedToast = (first: string): string => `Saved to ${first}’s profile`;

export const TK = <svg viewBox="0 0 12 12" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3 6.2 2 2 4-4.4" /></svg>;

/** the band across the top of every profile drawer */
export const ProfileBand: React.FC<{ first: string; initials: string; journey: string | null }> = ({ first, initials, journey }) => (
  <div className="qc167-pf" data-qc167="profile-band">
    <Seal initials={initials} size="sm" />
    <span><b data-qc167="profile-title">{first}’s profile</b><i data-qc167="profile-line">{profileLine(first, journey)}</i></span>
  </div>
);

/** a choice tile: its words, a sub-line, and the round tick */
export const PickTile: React.FC<{ on: boolean; label: string; sub?: string | null; onPick: () => void; data?: Record<string, string> }> = ({ on, label, sub, onPick, data }) => (
  <button type="button" className={`qc167-pk${on ? " on" : ""}`} aria-pressed={on} onClick={onPick} {...data}>
    <span className="t"><b>{label}</b>{sub ? <i>{sub}</i> : null}</span><span className="k" aria-hidden="true">{TK}</span>
  </button>
);

export interface ProfileDrawerProps {
  k: ProfileKey;
  prof: ProfileIn;
  /** the journey that waits under this drawer, by name; null when none was open */
  journey: string | null;
  busy: boolean;
  /** Cancel, ✕, Esc, or "Back to …": nothing is saved */
  onBack: () => void;
  onSave: (patch: ProfilePatch) => void;
  /** the asks drawer's body (Phase 4): given the patch setter, it draws itself */
  asks?: (set: (p: ProfilePatch | null) => void) => React.ReactNode;
}

export const ProfileDrawer: React.FC<ProfileDrawerProps> = ({ k, prof, journey, busy, onBack, onSave, asks }) => {
  const [weeks, setWeeks] = useState<number | null>(prof.weeks);
  const [nrmn, setNrmn] = useState<boolean>(!!prof.nrmn);
  const [method, setMethod] = useState<string | null>(prof.method);
  const [askPatch, setAskPatch] = useState<ProfilePatch | null>(null);
  const first = useRef<HTMLDivElement>(null);
  useEffect(() => { first.current?.querySelector<HTMLElement>("input, button")?.focus({ preventScroll: true }); }, []);

  const patch: ProfilePatch | null = (() => {
    if (k === "weeks") {
      const p: ProfilePatch = {};
      if (weeks !== prof.weeks) p.weeks = weeks;
      /* "no reply means no" is written only when it changes (an unstated policy left off stays unstated) */
      if (nrmn !== !!prof.nrmn) p.nrmn = nrmn;
      return Object.keys(p).length ? p : null;
    }
    if (k === "method") return method && method !== prof.method ? { method } : null;
    return askPatch;
  })();
  /* v168 — the drawer holds the card while it is open; leaving with a change asks, in the footer */
  const ed = useHold168("prof", !!patch, null, onBack, () => {});
  const asking = ed.asking && ed.open === "prof";
  const back = () => { if (patch && !mut168("10")) ed.leave(); else onBack(); };
  /* one Escape handler: registered after any journey's, so it is the top one while this drawer is open */
  useEscapeLayer(true, () => { if (asking) ed.keep(); else back(); }, ESC_LEVEL.pageModal);

  const body = k === "weeks" ? (
    <div data-qc167="reply-time">
      <WeekSlider value={weeks} onChange={(w) => setWeeks(w)} onUnknown={() => setWeeks(null)} label="Replies in" />
      <button type="button" className={`qc167-rem${nrmn ? " on" : ""}`} role="switch" aria-checked={nrmn} data-qc167="nrmn" onClick={() => setNrmn((v) => !v)}>
        <span className="t"><b>No reply means no</b><i>{prof.first} doesn’t answer every query</i></span><span className="qc167-tog" aria-hidden="true" />
      </button>
    </div>
  ) : k === "method" ? (
    <div className="qc167-mt" data-qc167="methods">
      {METHOD_PILLS.map(([v, l]) => <PickTile key={v} on={method === v} label={l} onPick={() => setMethod(v)} data={{ "data-method": v }} />)}
      {/* a stored "Other" shows as a selected tile carrying its words; it is changed on the full card */}
      {prof.method === SubmissionMethod.OTHER ? (
        <PickTile on={method === SubmissionMethod.OTHER} label={prof.methodOther?.trim() || "Other"} sub="Changed on the full card"
          onPick={() => setMethod(SubmissionMethod.OTHER)} data={{ "data-method": SubmissionMethod.OTHER }} />
      ) : null}
    </div>
  ) : asks ? asks(setAskPatch) : null;

  return (
    <div className="qc1522-cp tall qc167-cp" role="group" aria-label={`${prof.first}’s profile`} data-qc167="profile" data-k={k} data-journey={journey ?? undefined}>
      <ProfileBand first={prof.first} initials={prof.initials} journey={journey} />
      <div className="qc1522-ch">
        <h3>{PROFILE_TITLE(k, prof.first)}</h3>
        <button type="button" className="qc1522-x" aria-label="Close" data-qc167="close" onClick={back}>✕</button>
      </div>
      <div ref={first} className={`qc1522-cb${k === "asks" ? " qc167-ak" : ""}`} data-qc167="profile-body">{body}</div>
      {asking ? <DiscardAsk className="bar" onKeep={ed.keep} onDiscard={ed.discard} /> : (
      <div className="qc1522-cf">
        <button type="button" className="qc1522-btn gh" data-qc167="cancel" onClick={back}>{cancelWords(journey)}</button>
        <span className="sp" />
        <button type="button" className="qc1522-btn nv" data-qc167="save" disabled={!patch || busy} onClick={() => { if (patch) onSave(patch); }}>
          {busy ? "Saving…" : "Save to profile"}{busy ? null : ARROW}
        </button>
      </div>
      )}
    </div>
  );
};
