/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smart email drop on a phone (phone last screens v1, 7B and 8B; mocks `mailB1`, `mailB2`).
 *
 * Presentational: `PasteEmailFlow` owns the state and the calls (`runEmailImport`, then
 * `commitEmailImport` with ONLY the ticked records) and renders this below 768px instead of the
 * desktop `EmailOverlay`. Errors and the upsell use the existing words (`UpsellExplainer`).
 *
 * ⚠️ BEHIND A FLAG, OFF (`emailDropPhoneLive`). Whether Smart email drop's phone flow goes live is
 * Nick's call; until he says, a phone keeps today's overlay. Dev builds can switch it on per device
 * for the lab and the locks (localStorage `sa.lab.emailDropPhone` = "1"); production never reads it.
 *
 * ⚠️ NO MONTHLY ALLOWANCE IS STATED. The mock says "Pro. 30 emails a month." — no allowance exists
 * in the entitlement model, so the line says only what is true.
 */
import React, { useMemo, useState } from "react";
import type { EmailProposal, ProposalRecord } from "../../lib/emailImport";
import { QueryStatus } from "../../types";
import { STAGE_NAME, tileCourt } from "../../lib/qcSummary";
import { PhoneDisc } from "../phone/PhoneDisc";
import { dayMonth } from "../../lib/dates";
import "./emailDropPhone.css";

export function emailDropPhoneLive(): boolean {
  if (import.meta.env.MODE === "production") return false;
  try { return typeof window !== "undefined" && window.localStorage.getItem("sa.lab.emailDropPhone") === "1"; } catch { return false; }
}

export const EMAIL_DROP_LEDE = "Paste an email you sent or got from an agent. QueryHawk suggests the updates; nothing changes until you say so.";
export const EMAIL_DROP_ALLOWANCE = "Included with Pro.";

const fmt = (iso: string | null) => (iso ? dayMonth(iso) : null);

export const EmailPastePhone: React.FC<{
  emailText: string; onEmailText: (t: string) => void; busy: boolean; error: string | null; onRead: () => void; onBack: () => void;
}> = ({ emailText, onEmailText, busy, error, onRead, onBack }) => {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const fromClipboard = async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (t) { onEmailText(t); return; }
    } catch { /* refused: fall through and let the keyboard's paste do it */ }
    ref.current?.focus();
  };
  return (
    <div className="edp" data-edp="paste">
      <div className="edp-top">
        <button type="button" className="edp-back" onClick={onBack} data-edp="back">‹ Back</button>
        <h1 className="edp-h">Paste an email</h1>
      </div>
      <div className="edp-sheet">
        <p className="edp-sub">{EMAIL_DROP_LEDE}</p>
        <textarea ref={ref} className="edp-paste" placeholder="Paste the email here…" value={emailText}
          onChange={(e) => onEmailText(e.target.value)} aria-label="The email" data-edp="text" />
        <div className="edp-chips"><button type="button" className="edp-chip on" onClick={fromClipboard} data-edp="clipboard">Paste from clipboard</button></div>
        {error && <p className="edp-err" role="alert">{error}</p>}
        <p className="edp-sub edp-small" data-edp="allowance">{EMAIL_DROP_ALLOWANCE}</p>
      </div>
      <div className="edp-pin">
        <button type="button" className="edp-btn" disabled={busy || !emailText.trim()} onClick={onRead} data-edp="read">{busy ? "Reading…" : "Read this email"}</button>
      </div>
    </div>
  );
};

export const EmailUpdatesPhone: React.FC<{
  proposal: EmailProposal; dayN: number | null; busy: boolean; error: string | null;
  onSave: (accepted: ProposalRecord[]) => void; onSkipAll: () => void; onBack: () => void;
}> = ({ proposal, dayN, busy, error, onSave, onSkipAll, onBack }) => {
  const recs = proposal.records;
  const [ticked, setTicked] = useState<boolean[]>(() => recs.map(() => true));
  const k = ticked.filter(Boolean).length;
  const who = [proposal.subject.agentName?.trim(), proposal.subject.agency].filter(Boolean).join(" · ");
  const from = proposal.subject.agentName?.trim() || proposal.subject.agency;
  const latest = useMemo(() => recs.map((r) => r.date).filter(Boolean).sort().pop() ?? null, [recs]);
  return (
    <div className="edp" data-edp="updates">
      <div className="edp-top">
        <button type="button" className="edp-back" onClick={onBack} data-edp="back">‹ Back</button>
        <h1 className="edp-h" data-edp="count">{recs.length} {recs.length === 1 ? "update" : "updates"} found</h1>
      </div>
      <div className="edp-sheet">
        <p className="edp-sub">From {from}{latest ? `, ${fmt(latest)}` : ""}. Tick what to save.</p>
        {recs.map((r, i) => {
          const status = r.resultingStatus as QueryStatus;
          const court = tileCourt(status);
          return (
            <div key={i} className={`edp-card court-${court ?? "none"}`} data-edp="proposal" data-ticked={ticked[i] ? "1" : "0"}>
              <div className="edp-band"><span>{who}</span><span>{dayN !== null ? `Day ${dayN}` : ""}</span></div>
              <label className="edp-row">
                <PhoneDisc status={status} size={40} />
                <span className="edp-what"><b>{STAGE_NAME[status] ?? r.resultingStatus}</b>
                  {r.sourceQuote ? <small>“{r.sourceQuote}”</small> : null}
                  {r.date ? <small className="edp-date">{fmt(r.date)}</small> : null}</span>
                <input type="checkbox" className="edp-tk" checked={ticked[i]} data-edp="tick"
                  onChange={() => setTicked((t) => t.map((v, j) => (j === i ? !v : v)))} aria-label={`Save ${STAGE_NAME[status] ?? r.resultingStatus}`} />
              </label>
            </div>
          );
        })}
        {error && <p className="edp-err" role="alert">{error}</p>}
      </div>
      <div className="edp-pin">
        <button type="button" className="edp-skip" onClick={onSkipAll} data-edp="skip">Skip all</button>
        <button type="button" className="edp-btn" disabled={busy || k === 0} data-edp="save"
          onClick={() => onSave(recs.filter((_, i) => ticked[i]))}>{busy ? "Saving…" : `Save ${k} ${k === 1 ? "update" : "updates"}`}</button>
      </div>
    </div>
  );
};
