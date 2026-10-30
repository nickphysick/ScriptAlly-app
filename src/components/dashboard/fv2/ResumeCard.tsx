/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD FIRST VISIT v2, Part F — "PICK UP WHERE YOU LEFT OFF" (ref design-refs/dashboard-first-visit-v2/, screen 08).
 *
 * When a Smart Import review was left halfway, this card takes the set-up card's place: the file, when it was started,
 * how far the agents and the queries got, how long it is kept, "Carry on checking →" and "Start again with a different
 * file" (which asks first, then deletes the draft and opens Smart Import's upload).
 *
 * ⚠️ IT READS THE DRAFT'S META AND NOTHING ELSE (`lib/importDraft`). Carry on reopens the review on the Import page.
 */
import React, { useState } from "react";
import { RESUME, keptUntil, startedWhen } from "../../../lib/importDraftModel";
import type { DraftMeta } from "../../../lib/importDraft";

const Doc = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h4" /></svg>
);

const Tile: React.FC<{ label: string; n: number; m: number; started: boolean; probe: string }> = ({ label, n, m, started, probe }) => (
  <div className="fv2-rtile" data-fv2={probe} data-n={started ? n : ""} data-m={m}>
    <b>{label}</b>
    <span>{started ? RESUME.checked(n, m) : RESUME.notStarted}</span>
    <i className="fv2-rbar" aria-hidden="true"><i style={{ width: `${started && m > 0 ? Math.round((n / m) * 100) : 0}%` }} /></i>
  </div>
);

export const ResumeCard: React.FC<{
  meta: DraftMeta;
  now: Date;
  onCarryOn: () => void;
  onStartAgain: () => void;
}> = ({ meta, now, onCarryOn, onStartAgain }) => {
  const [asking, setAsking] = useState(false);
  const until = keptUntil(meta.updatedMs ?? now.getTime());
  return (
    <section className="os-card fv1-setup fv2-resume" data-fv2="start-card" data-fv2-card="resume" aria-label={RESUME.title}>
      <div className="os-frame">
        <div className="os-band">
          <div className="os-bandrow"><h3 className="os-cardttl" data-fv2="resume-title">{RESUME.title}</h3></div>
        </div>
        <div className="fv2-rbody">
          <div className="fv2-rfile">
            <span className="fv2-rdoc"><Doc /></span>
            <span className="fv2-rfw"><b data-fv2="resume-file">{meta.fileName}</b><small data-fv2="resume-when">{RESUME.source(startedWhen(meta.startedAt, now))}</small></span>
          </div>
          <div className="fv2-rtiles">
            <Tile label={RESUME.agents} n={meta.agentsChecked} m={meta.agentsTotal} started probe="resume-agents" />
            <Tile label={RESUME.queries} n={meta.queriesChecked} m={meta.queriesTotal} started={meta.queriesStarted} probe="resume-queries" />
          </div>
          <p className="fv2-rtext">{RESUME.text(until)}</p>
          {asking ? (
            <div className="fv2-rask" role="group" aria-label={RESUME.confirmYes} data-fv2="resume-confirm">
              <p>{RESUME.confirm(meta.fileName)}</p>
              <div className="fv1-row">
                <button type="button" className="fv1-btn" data-fv2="resume-again-yes" onClick={onStartAgain}>{RESUME.confirmYes}</button>
                <button type="button" className="fv1-lnk" data-fv2="resume-again-no" onClick={() => setAsking(false)}>{RESUME.confirmNo}</button>
              </div>
            </div>
          ) : (
            <div className="fv1-row">
              <button type="button" className="fv1-btn" data-fv2="resume-carry-on" onClick={onCarryOn}>{RESUME.carryOn}<span aria-hidden="true">{" →"}</span></button>
              <button type="button" className="fv1-lnk" data-fv2="resume-again" onClick={() => setAsking(true)}>{RESUME.startAgain}</button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
