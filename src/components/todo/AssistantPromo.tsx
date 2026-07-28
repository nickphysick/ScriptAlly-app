/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AssistantPromo — THE COLOPHON (design-refs/todo-detail-a.html §3 + -b.html §2; the detail
 * pass superseded the colleague banner) + the "Meet the assistant" PREVIEW modal
 * (design-refs/todo-assistant-modal.html, unchanged).
 * A preview only: the theatre is CANNED content driven by the user's real task names — nothing
 * reads beyond the names passed in, and NOTHING writes to the user's data from this path. No
 * price appears anywhere (the footer reads "Part of ScriptAlly Pro").
 */
import React, { useEffect, useState } from "react";

/** One demo/theatre row derived from a REAL housekeeping task (names only). */
export interface AssistantTaskRow {
  /** e.g. "Wish list — Aisha Kapoor" (banner) / "Wish list — Aisha Kapoor, Kapoor Literary" (modal). */
  label: string;
  /** The agent's display name (the WHAT-IT-FOUND card personalises with the first row's). */
  agent: string;
}

/** The canned timing chips — scripted, not measured (the preview's honesty line covers this). */
const CANNED_TIMES = ["41S", "28S", "36S", "52S"];

/** THE ASSISTANT BAND (briefing-slot pack P2 — ref design-refs/briefing-slot.html option 4):
 *  the page's closing note, seated at the FOOT of the content area, full column width. Warm-white
 *  ground, a 1.5px ink border and a 4px offset block in pastille blue — THE APP'S ONLY BLUE
 *  STICKER (grep-locked). Left: the slate PRO pill, a Playfair title and the derived line;
 *  right, pinned to the band's end: the slate button opening the existing preview modal.
 *
 *  Gating is unchanged (non-Pro only) and there is NO dismiss control — a closing note is not
 *  something you clear. The numbers stay derived, never hardcoded.
 *
 *  SUPERSEDES the todo-rebuild foot strip's card surface ("no blue fill, no heavy shadow"): this
 *  pack restores the blue sticker treatment, wide, at the foot. */
export const AssistantBand: React.FC<{
  hkCount: number;
  totalCount: number;
  onPreview: () => void;
}> = ({ hkCount, totalCount, onPreview }) => (
  <div className="tdb-asst">
    <div className="tdb-asstmid">
      <span className="tdb-asstpill"><span aria-hidden>✦</span> SCRIPTALLY PRO</span>
      <div className="tdb-asstt">Hand over the housekeeping</div>
      <div className="tdb-asstd">
        {hkCount} of your {totalCount} tasks could run in the background whilst you write.
      </div>
    </div>
    <button type="button" className="tdb-asstbtn" onClick={onPreview}>Meet the assistant</button>
  </div>
);

export const AssistantModal: React.FC<{
  hkCount: number;
  totalCount: number;
  rows: AssistantTaskRow[];
  onClose: () => void;
  onUpgrade: () => void;
}> = ({ hkCount, totalCount, rows, onClose, onUpgrade }) => {
  const theatre = rows.slice(0, 4);
  // The scripted run: rows complete in sequence (~1.7s apart); the pass HOLDS one short of the
  // end so a working row is always on stage. Reduced motion: jump straight to the held frame.
  const [doneN, setDoneN] = useState(1);
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const cap = Math.max(1, theatre.length - 1);
    if (reduce) { setDoneN(cap); return; }
    if (doneN >= cap) return;
    const t = window.setTimeout(() => setDoneN((n) => n + 1), 1700);
    return () => window.clearTimeout(t);
  }, [doneN, theatre.length]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);
  const firstAgent = theatre[0]?.agent ?? "the agent";
  return (
    <div className="tdb-amwrap" role="dialog" aria-modal="true" aria-label="Meet the assistant">
      <div className="tdb-amscrim" onClick={onClose} />
      <div className="tdb-amodal">
        <button type="button" className="tdb-amx" aria-label="Close" onClick={onClose}>✕</button>
        <div className="tdb-amk">SCRIPTALLY PRO · A PREVIEW USING YOUR ACTUAL TASKS</div>
        <h2>Meet the assistant</h2>
        <p className="tdb-amsub">
          It researches your agents for you — reading agency pages, filling wish lists and
          materials, and flagging anything it isn’t sure of for your approval. Nothing is saved
          to your desk in this preview.
        </p>
        <div className="tdb-theatre">
          <div className="tdb-demok"><span className="tdb-amlive" aria-hidden />WATCHING THE ASSISTANT WORK — {Math.min(doneN, theatre.length)} OF {theatre.length}</div>
          {theatre.map((r, i) => {
            const state = i < doneN ? "done" : i === doneN ? "working" : "queued";
            return (
              <div key={r.label} className={`tdb-drow ${state}`}>
                <span className={`tdb-dtick${state === "working" ? " spin" : ""}`} aria-hidden>{state === "done" ? "✓" : ""}</span>
                {r.label}
                {state === "done" && <span className="tdb-dwho">FILLED · {CANNED_TIMES[i % CANNED_TIMES.length]}</span>}
                {state === "working" && <span className="tdb-dwho">READING AGENCY SITE…</span>}
              </div>
            );
          })}
          <div className="tdb-amfound">
            <b>WHAT IT JUST FOUND</b>
            “Seeking upmarket book-club fiction and voice-led literary debuts; no fantasy at
            present.” — added to {firstAgent}’s wish list, source linked.
          </div>
        </div>
        <div className="tdb-amhiw">
          <div><b>It researches</b>Agency sites, interviews and wish-list sources — the reading you’d do yourself.</div>
          <div><b>You approve</b>Uncertain findings arrive as suggestions, never silent edits.</div>
          <div><b>Your desk clears</b>{hkCount} of your {totalCount} housekeeping tasks, done in the background.</div>
        </div>
        <div className="tdb-amfoot">
          <span className="tdb-ampart">Part of ScriptAlly Pro</span>
          <button type="button" className="tdb-amlater" onClick={onClose}>Not now</button>
          <button type="button" className="tdb-amgo" onClick={onUpgrade}>Upgrade &amp; set it working →</button>
        </div>
      </div>
    </div>
  );
};
