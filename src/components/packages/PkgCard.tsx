/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v2 — one package card (ref design-refs/materials/packages-v2.html, `pkgCard`).
 *
 * ⚠️ THE ACTIONS FOLLOW THE STATE, AND "SENT" IS THE LOCK (D4). A sent package offers Duplicate &
 * edit, never Edit; Delete is offered on UNSENT packages only, because a sent one has queries
 * recording what went out and `deletePackage` refuses it anyway. Retired offers Restore and
 * Duplicate & edit.
 *
 * ⚠️ THE NOTE IS ALWAYS EDITABLE, LOCKED OR NOT — `note` is not in `LOCKED_PACKAGE_FIELDS`.
 */
import React, { useEffect, useRef, useState } from "react";
import { SubmissionPackage } from "../../types";
import { StatusDot } from "../StatusDot";
import { STAGE_NAME } from "../../lib/qcSummary";
import { CountEntry } from "../../lib/manuscriptSummary";
import { lockLine, shortDate } from "../../lib/packagesPage";

export interface SlotView { name: string; words: number | null }

export interface PkgCardProps {
  pkg: SubmissionPackage;
  active: boolean;
  letter: SlotView | null;
  synopsis: SlotView | null;
  version: string | null;
  counts: CountEntry[];
  agents: number;
  discs: string[];
  flash?: boolean;
  /** the empty state's example — no actions, no note controls */
  ghost?: boolean;
  onAct?: (act: "use" | "edit" | "dup" | "retire" | "delete" | "restore") => void;
  onSaveNote?: (note: string) => void;
}

const num = (n: number) => n.toLocaleString("en-GB");

export const PkgCard: React.FC<PkgCardProps> = ({ pkg, active, letter, synopsis, version, counts, agents, discs, flash, ghost, onAct, onSaveNote }) => {
  const sent = !!pkg.firstSentAt;
  const retired = pkg.status === "Retired";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(pkg.note ?? "");
  const edRef = useRef<HTMLTextAreaElement | null>(null);
  const noteBtnRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => { if (editing) edRef.current?.focus(); }, [editing]);

  const act = (a: Parameters<NonNullable<PkgCardProps["onAct"]>>[0], label: string, quiet = false) => (
    <button type="button" className={`ppv-txt${quiet ? " ppv-txt--quiet" : ""}`} data-act={a} onClick={() => onAct?.(a)}>{label}</button>
  );
  const acts = ghost ? null : retired ? (
    <>{act("restore", "Restore")}{act("dup", "Duplicate & edit")}</>
  ) : (
    <>
      {active ? null : act("use", "Use for new queries")}
      {sent ? act("dup", "Duplicate & edit") : act("edit", "Edit")}
      {act("retire", "Retire", true)}
      {sent ? null : act("delete", "Delete", true)}
    </>
  );

  const closeNote = () => { setEditing(false); requestAnimationFrame(() => noteBtnRef.current?.focus()); };
  const note = editing ? (
    <div className="ppv-pnote">
      <span className="ppv-lbl">Note</span>
      <textarea id="ppv-note-ed" ref={edRef} aria-label={`Note for ${pkg.packageName}`} maxLength={2000} value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closeNote(); } }} />
      <span className="btns">
        <button type="button" className="ppv-btn ppv-btn--dark" data-act="noteSave" onClick={() => { onSaveNote?.(draft.trim().slice(0, 2000)); closeNote(); }}>Save</button>
        <button type="button" className="ppv-btn" data-act="noteCancel" onClick={closeNote}>Cancel</button>
      </span>
    </div>
  ) : pkg.note ? (
    <div className="ppv-pnote">
      <span className="ppv-lbl">Note</span><span className="tx">{pkg.note}</span>
      {ghost ? null : <button type="button" ref={noteBtnRef} className="ppv-mini" data-act="note" onClick={() => { setDraft(pkg.note ?? ""); setEditing(true); }}>Edit</button>}
    </div>
  ) : ghost ? null : (
    <div className="ppv-pnote">
      <span className="ppv-lbl">Note</span>
      <button type="button" ref={noteBtnRef} className="ppv-mini" data-act="note" onClick={() => { setDraft(""); setEditing(true); }}>Add a note</button>
    </div>
  );

  return (
    <article className={`ppv-pkg${active ? " is-active" : ""}${retired ? " is-retired" : ""}${flash ? " flash" : ""}`}
      data-ppv="pkg" data-name={pkg.packageName} data-id={pkg.id}>
      <div className="ppv-pkh">
        <div className="ppv-pn">
          <i className="mk" aria-hidden="true" />
          <h3>{pkg.packageName}</h3>
          {active ? <span className="ppv-tag ppv-tag--och" data-tag="active">Used for new queries</span> : null}
          {sent ? null : <span className="ppv-tag ppv-tag--plain">Not sent</span>}
          {retired ? <span className="ppv-tag ppv-tag--plain">Retired</span> : null}
        </div>
        {acts ? <div className="ppv-pacts">{acts}</div> : null}
      </div>
      <dl className="ppv-slots">
        <dt>Query letter</dt>
        <dd className={letter ? "" : "none"}>{letter ? <>{letter.name}{letter.words != null ? <span className="m">{num(letter.words)} words</span> : null}</> : "Not chosen"}</dd>
        <dt>Synopsis</dt>
        <dd className={synopsis ? "" : "none"}>{synopsis ? <>{synopsis.name}{synopsis.words != null ? <span className="m">{num(synopsis.words)} words</span> : null}</> : "None"}</dd>
        <dt>Version</dt>
        <dd className={version ? "ver" : "none"}>{version ?? "Not recorded"}</dd>
        <dt>Other</dt>
        <dd className={pkg.otherMaterials ? "" : "none"}>{pkg.otherMaterials || "None"}</dd>
        {sent ? (
          <div className="ppv-lockline">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><rect x="2.5" y="6" width="9" height="6.5" rx="1.5" /><path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" /></svg>
            {lockLine(pkg.firstSentAt!)}
          </div>
        ) : null}
      </dl>
      {sent ? (
        <div className="ppv-pf">
          <div className="ppv-counts" aria-label="Queries by status">
            {counts.map((c) => {
              const label = c.closed ? "Closed" : STAGE_NAME[c.status];
              return <span key={`${c.status}${c.closed ? "c" : ""}`} title={label}><StatusDot status={c.status} overrideSize={12} decorative />{c.n}<span className="sr-only"> {label}</span></span>;
            })}
            <span className="ppv-sentline">Sent to {agents} agent{agents === 1 ? "" : "s"} since {shortDate(pkg.firstSentAt)}</span>
          </div>
          <div className="ppv-discs" aria-hidden="true">
            {discs.slice(0, 4).map((d, i) => <span className="ppv-disc" key={i}>{d}</span>)}
            {discs.length > 4 ? <span className="ppv-disc">+{discs.length - 4}</span> : null}
          </div>
        </div>
      ) : (
        <div className="ppv-pf"><span className="ppv-sentline">Not sent yet. Choose it when you log a query and it's recorded against that agent.</span></div>
      )}
      {note}
    </article>
  );
};
