/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Record a response v1, Phase 3 (design-refs/record-a-response-v1/record-a-response-v1.html, the first state) —
 * "WHO REPLIED?", DRAWN FROM THE QUERY CARD'S OWN PARTS. The same frame the card uses (the panel's white rim and inner
 * border, then `.qc152` > `.qc152-in`: band, body, footer), so a pick turns it into that query's card in the same
 * panel: one object changing, never a second panel.
 *
 *   band     navy, "Record a response", ✕
 *   head     "Who replied?" and the search field ("Find the agent"), focused on open
 *   groups   Waiting to hear back · n (longest wait first), Already with you · n; closed queries ONLY while something
 *            is typed, under "Closed · a late reply reopens it"
 *   empty    no match: "No query with “…”." + Log a query to them; nothing live: the day-one state + Log a query
 *   keys     ↑ ↓ move the highlight, Enter picks, Escape clears the search first and closes second
 *
 * ⚠️ IT SAVES NOTHING. A pick hands the id to the page, which opens that query's card with its composer.
 * ⚠️ NO "Paste the email instead" here (Phase 3): RecordResponseModal stays in the app, unlinked from this list.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { StatusDot } from "../../StatusDot";
import type { QueryStatus } from "../../../types";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { STAGE_NAME } from "../../../lib/qcSummary";
import { STATUS_FILL, statusKind } from "../../../lib/qc1512";
import { BAND_NAVY } from "../../../lib/qcFoot1522";
import "./qcv152card.css";
import "./qcv1522card.css";
import "./qcWhoReplied.css";

const SEARCH = <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="#2a3a52" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><circle cx="8.6" cy="8.6" r="5.6" /><path d="M12.8 12.8l4 4" /></svg>;
const ARW = <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" /></svg>;

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export type WhoGroup = "wait" | "you" | "closed";
export interface WhoRow {
  id: string;
  initials: string;
  name: string;
  agency: string;
  status: QueryStatus;
  /** the row's second line after the agency: "{latest step} {date}", or "closed {date}" */
  step: string;
  group: WhoGroup;
  /** when it reached the stage it stands at: the waiting group reads longest wait first */
  sinceMs: number;
}

/** the three groups in their order, with what each is called; closed ones show only while something is typed */
export function whoGroups(rows: readonly WhoRow[], find: string): { g: WhoGroup; label: string; rows: WhoRow[] }[] {
  const q = norm(find.trim());
  const hit = (r: WhoRow) => !q || norm(`${r.name} ${r.agency}`).includes(q);
  const of = (g: WhoGroup) => rows.filter((r) => r.group === g && hit(r)).sort((a, b) => a.sinceMs - b.sinceMs || a.name.localeCompare(b.name));
  const wait = of("wait"), you = of("you"), closed = q ? of("closed") : [];
  return [
    { g: "wait" as const, label: `Waiting to hear back · ${wait.length}`, rows: wait },
    { g: "you" as const, label: `Already with you · ${you.length}`, rows: you },
    { g: "closed" as const, label: "Closed · a late reply reopens it", rows: closed },
  ].filter((x) => x.rows.length);
}

export const QcWhoReplied: React.FC<{
  rows: WhoRow[];
  onPick: (id: string) => void;
  onClose: () => void;
  /** the staged Log a query journey */
  onLog: () => void;
}> = ({ rows, onPick, onClose, onLog }) => {
  const [find, setFind] = useState("");
  const [hi, setHi] = useState(0);
  const inRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const liveNone = !rows.some((r) => r.group !== "closed");
  const groups = useMemo(() => whoGroups(rows, find), [rows, find]);
  const flat = groups.flatMap((g) => g.rows);
  const n = flat.length;
  useEffect(() => { if (hi >= n) setHi(Math.max(0, n - 1)); }, [n, hi]);
  useEffect(() => { inRef.current?.focus({ preventScroll: true }); }, []);
  /* Escape: the search first, then the panel */
  useEscapeLayer(true, () => { if (find) { setFind(""); setHi(0); } else onClose(); }, ESC_LEVEL.pageModal);

  const move = (d: number) => {
    if (!n) return;
    const next = (hi + d + n) % n;
    setHi(next);
    listRef.current?.querySelector<HTMLElement>(`[data-i="${next}"]`)?.scrollIntoView({ block: "nearest" });
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); move(e.key === "ArrowDown" ? 1 : -1); }
    else if (e.key === "Enter" && flat[hi]) { e.preventDefault(); onPick(flat[hi].id); }
  };

  let i = 0;
  const row = (r: WhoRow) => {
    const k = i++;
    return (
      <button key={r.id} type="button" role="option" id={`qcrr-opt-${r.id}`} aria-selected={k === hi} className={`qcrr-row${k === hi ? " hi" : ""}`}
        data-qcrr="row" data-id={r.id} data-group={r.group} data-i={k} onMouseMove={() => { if (hi !== k) setHi(k); }} onClick={() => onPick(r.id)}>
        <span className="qc152-disc" aria-hidden="true">{r.initials}</span>
        <span className="qcrr-nm"><b>{r.name}</b><span data-qcrr="line">{r.agency ? `${r.agency} · ` : ""}{r.step}</span></span>
        <span className="qc152-pill" data-qcrr="pill"><span className="qc152-cap" style={{ background: STATUS_FILL[statusKind(r.status)] }}><StatusDot status={r.status} overrideSize={15} decorative /></span><span>{STAGE_NAME[r.status]}</span></span>
      </button>
    );
  };

  return (
    <div className="qc149c qcv-legacy qc152 qcrr" data-qc152="card" data-qcrr="picker" data-lean="flat">
      <div className="qc152-in">
        <div className="qc152-band dk" data-qc152="band" style={{ background: BAND_NAVY, color: "#fff" }}>
          <span data-qc152="band-word">Record a response</span>
          <span className="qc152-day" />
          <button type="button" className="qc152-x" data-qcrr="close" aria-label="Close" title="Close" onClick={onClose}>✕</button>
        </div>
        <div className="qcrr-head" data-qcrr="head">
          <h3 data-qcrr="title">Who replied?</h3>
          {liveNone ? null : (
            <label className="qcrr-srch">{SEARCH}
              <input ref={inRef} type="text" value={find} placeholder="Find the agent" aria-label="Find the agent" autoComplete="off" data-qcrr="search"
                role="combobox" aria-expanded="true" aria-controls="qcrr-list" aria-activedescendant={flat[hi] ? `qcrr-opt-${flat[hi].id}` : undefined}
                onChange={(e) => { setFind(e.target.value); setHi(0); }} onKeyDown={onKey} />
            </label>
          )}
        </div>
        <div ref={listRef} id="qcrr-list" className="qc152-body qcrr-body" data-qc152="body" data-qcrr="list" role="listbox" aria-label="Your queries">
          {liveNone ? (
            <div className="qcrr-none" data-qcrr="none">
              <b>Nothing’s out with agents yet.</b>
              Once you’ve logged a query, this is where you’ll record what came back.
              <div><button type="button" className="qc1522-btn nv" data-qcrr="log" onClick={onLog}>Log a query{ARW}</button></div>
            </div>
          ) : !n ? (
            <div className="qcrr-none" data-qcrr="no-match">
              <b>No query with “{find.trim()}”.</b>
              You can only record a response to a query you’ve logged.
              <div><button type="button" className="qc1522-btn gh" data-qcrr="log" onClick={onLog}>Log a query to them</button></div>
            </div>
          ) : groups.map((g) => (
            <div key={g.g} role="group" aria-label={g.label} data-qcrr="group" data-group={g.g}>
              <div className="qcrr-grp" data-qcrr="group-label">{g.label}</div>
              {g.rows.map(row)}
            </div>
          ))}
        </div>
        <div className="qc152-rb qcrr-ft" data-qcrr="foot">
          {liveNone ? <span className="sp" /> : <span className="qcrr-kb" data-qcrr="keys"><kbd>↑</kbd> <kbd>↓</kbd> to move · <kbd>Enter</kbd> to choose</span>}
          <button type="button" className="qc1522-flink" data-qcrr="cancel" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};
