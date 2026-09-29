/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v2 — one package card (ref design-refs/materials/packages-v2.html, `pkgCard`),
 * with Part B of "Packages through the journey" (ref design-refs/packages-journey/package-tracking-v1.html,
 * 28 Sep): the edition switch, the six results tiles and the queries behind them.
 *
 * ⚠️ A SENT PACKAGE IS EDITABLE NOW, AND THE EDIT STARTS ITS NEXT EDITION (§B1). The queries already
 * sent keep the edition they went with, so the record stays true; Duplicate makes a separate package.
 * Delete is offered on UNSENT packages only — a sent one is retired, never deleted (§B3).
 *
 * ⚠️ THE RESULTS ARE WORKED OUT, NEVER STORED (§C4): `results(edition)` reads the queries on every
 * render, so undo, corrections and late replies move the tiles by themselves.
 *
 * ⚠️ THE NOTE IS ALWAYS EDITABLE, LOCKED OR NOT — `note` is not in `LOCKED_PACKAGE_FIELDS`.
 */
import React, { useEffect, useRef, useState } from "react";
import { PackageEdition, SubmissionPackage } from "../../types";
import { StatusDot } from "../StatusDot";
import { STAGE_NAME } from "../../lib/qcSummary";
import { lockLine } from "../../lib/packagesPage";
import { editionNumber, ordinal } from "../../lib/packageEditions";
import { EditionResults, dayMonth, rateLine, rowWord, sentSpan } from "../../lib/packageResults";

export interface SlotView { name: string; words: number | null }

export interface PkgCardProps {
  pkg: SubmissionPackage;
  active: boolean;
  letter: SlotView | null;
  synopsis: SlotView | null;
  version: string | null;
  /** every edition, oldest first (`editionsOf`) */
  editions: PackageEdition[];
  /** the results for one edition, or null for all of them — worked out from the queries */
  results: (edition: number | null) => EditionResults;
  /** a query's agent, for the list */
  who: (queryId: string) => { name: string; initials: string };
  flash?: boolean;
  /** the empty state's example — no actions, no note controls */
  ghost?: boolean;
  onAct?: (act: PkgAct) => void;
  onOpenQuery?: (queryId: string) => void;
  onSaveNote?: (note: string) => void;
}

export type PkgAct = "log" | "use" | "edit" | "dup" | "retire" | "delete" | "restore";

/** How many rows the list shows before "Show all". */
const LIST_CAP = 5;

const num = (n: number) => n.toLocaleString("en-GB");

export const PkgCard: React.FC<PkgCardProps> = ({ pkg, active, letter, synopsis, version, editions, results, who, flash, ghost, onAct, onOpenQuery, onSaveNote }) => {
  const sent = !!pkg.firstSentAt;
  const retired = pkg.status === "Retired";
  const current = editionNumber(pkg);
  const [ed, setEd] = useState<number | null>(current);
  const [list, setList] = useState<"credited" | "changes">("credited");
  const [all, setAll] = useState(false);
  /* a new edition arriving (this card's own edit) moves the switch to it */
  useEffect(() => { setEd(current); setList("credited"); setAll(false); }, [current]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(pkg.note ?? "");
  const edRef = useRef<HTMLTextAreaElement | null>(null);
  const noteBtnRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => { if (editing) edRef.current?.focus(); }, [editing]);

  const act = (a: PkgAct, label: string, quiet = false) => (
    <button type="button" className={`ppv-txt${quiet ? " ppv-txt--quiet" : ""}`} data-act={a} onClick={() => onAct?.(a)}>{label}</button>
  );
  /* ⚠️ EDIT ON A SENT PACKAGE STARTS ITS NEXT EDITION; Delete only while unsent (§B1, §B3) */
  const acts = ghost ? null : retired ? (
    <>{act("dup", "Reuse as new")}{act("restore", "Restore", true)}{sent ? null : act("delete", "Delete", true)}</>
  ) : (
    <>
      {active ? null : act("use", "Use for new queries")}
      {act("edit", "Edit")}
      {act("dup", "Duplicate")}
      {act("retire", "Retire", true)}
      {sent ? null : act("delete", "Delete", true)}
      <button type="button" className="ppv-btn ppv-btn--pri" data-act="log" onClick={() => onAct?.("log")}>Log a query with this</button>
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

  /* ── the results (§B4) ── */
  const byN = new Map(editions.map((e) => [e.n, e]));
  const past = ed != null && ed !== current;
  const r = results(ed);
  const eAt = ed != null ? byN.get(ed) : undefined;
  const nextAt = ed != null ? byN.get(ed + 1)?.startedAt : undefined;
  const edLine = ed == null
    ? `All ${editions.length} editions together · for the big picture, not for comparing`
    : [`${ordinal(ed)} edition`, eAt?.summary, eAt?.startedAt ? (past && nextAt ? `${dayMonth(eAt.startedAt)} – ${dayMonth(nextAt)}` : `since ${dayMonth(eAt.startedAt)}`) : ""].filter(Boolean).join(" · ");
  const tile = (key: string, label: string, n: number, sub = "", hi = false) => (
    <div className={`ppv-st${hi ? " ppv-st--key" : ""}`} data-st={key}><small>{label}</small><b>{n}</b><span>{sub || "\u00a0"}</span></div>
  );
  const credited = r.rows;
  const rowsShown = list === "changes"
    ? r.withChanges.map((id) => ({ id, status: null as null | EditionResults["rows"][number]["status"], latestMs: null as number | null }))
    : credited;
  const cut = all ? rowsShown : rowsShown.slice(0, LIST_CAP);
  const results_block = (
    <div className="ppv-res" data-ppv="results">
      {editions.length > 1 ? (
        <div className="ppv-eds" role="group" aria-label={`Editions of ${pkg.packageName}`}>
          <button type="button" data-ed="all" aria-pressed={ed == null} className={ed == null ? "on" : ""} onClick={() => { setEd(null); setList("credited"); setAll(false); }}>All editions</button>
          {[...editions].reverse().map((e) => (
            <button type="button" key={e.n} data-ed={e.n} aria-pressed={ed === e.n} className={ed === e.n ? "on" : ""} onClick={() => { setEd(e.n); setList("credited"); setAll(false); }}>
              {ordinal(e.n)} edition{e.n === current ? " · current" : ""}
            </button>
          ))}
        </div>
      ) : null}
      <div className="ppv-edline" data-ppv="edline">{edLine}</div>
      {r.onlyMigrated ? <div className="ppv-edline ppv-edline--note" data-ppv="migrated">Results from queries logged before editions</div> : null}
      <div className="ppv-stats">
        {tile("sent", "Sent", r.sent, sentSpan(r, past))}
        {tile("out", "Still out", r.out)}
        {tile("requests", "Requests", r.requests, rateLine(r), true)}
        {tile("offers", "Offers", r.offers)}
        {tile("passes", "Passes", r.passes)}
        {tile("noreply", "No reply", r.noReply)}
      </div>
      {r.withChanges.length || r.withdrawnEarly ? (
        <div className="ppv-rfoot" data-ppv="rfoot">
          {r.withChanges.length ? (
            <span data-ppv="withchanges"><b>{r.withChanges.length}</b> sent with changes, based on {ed == null ? "this package" : "this edition"} ·{" "}
              <button type="button" className="ppv-link" aria-pressed={list === "changes"} onClick={() => { setList(list === "changes" ? "credited" : "changes"); setAll(false); }}>
                {list === "changes" ? "back to its results" : "see them"}
              </button>
            </span>
          ) : null}
          {r.withdrawnEarly ? <span data-ppv="withdrawn">{r.withdrawnEarly} withdrawn before any answer, not counted</span> : null}
        </div>
      ) : null}
      {cut.length ? (
        <ul className="ppv-rq" aria-label={list === "changes" ? "Sent with changes" : `Queries sent with ${pkg.packageName}`}>
          {cut.map((row) => {
            const w = who(row.id);
            return (
              <li key={row.id}>
                <button type="button" data-q={row.id} onClick={() => onOpenQuery?.(row.id)}>
                  <span className="a" aria-hidden="true">{w.initials}</span>
                  <span className="n">{w.name}</span>
                  {row.status ? <span className="s"><StatusDot status={row.status} overrideSize={12} decorative />{STAGE_NAME[row.status]}</span> : <span className="s">Based on it</span>}
                  <small>{row.status ? `${rowWord(row.status)} ${dayMonth(row.latestMs)}`.trim() : ""}</small>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      {rowsShown.length > LIST_CAP ? (
        <button type="button" className="ppv-link ppv-more" onClick={() => setAll(!all)}>{all ? "Show fewer" : `Show all ${rowsShown.length}`}</button>
      ) : null}
      {retired ? (
        <div className="ppv-retline" data-ppv="retline">Retired, not deleted: it's been sent, so its <b>{results(null).sent} {results(null).sent === 1 ? "query" : "queries"}</b> still point here.</div>
      ) : null}
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
          {retired ? <span className="ppv-tag ppv-tag--plain" data-tag="retired">{pkg.retiredAt ? `Retired ${dayMonth(pkg.retiredAt)}` : "Retired"}</span> : null}
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
      {sent && !ghost ? results_block : sent ? null : (
        <div className="ppv-pf"><span className="ppv-sentline">Not sent yet. Choose it when you log a query and it's recorded against that agent.</span></div>
      )}
      {note}
    </article>
  );
};
