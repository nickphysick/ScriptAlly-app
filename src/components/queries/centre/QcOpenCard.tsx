/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QcOpenCard — the open query, DOCKED to the right of every view (Query Centre v11).
 *
 * It is the app's existing query drawer, re-housed: the same data, the same three tabs (Tracking ·
 * Agent · Notes) whose bodies arrive as nodes built by the page, the same actions, the same
 * Correction UI (it lives inside the Tracking tab's timeline). What changes is where it lives — a
 * sticky card in the stage's right column, not a panel over the page — and how it looks. Under 900px
 * of main column the page mounts today's `QueryPanel` drawer instead; this component is never an
 * overlay and never draws a scrim.
 *
 * ⚠️ IT CAPS ITSELF TO THE SCROLLPORT, NEVER TO `100vh`. The scroller starts below the shell's bar,
 * so `100vh` over-claims by that offset; `WorkspacePageGrid` publishes `--wpg-port-h` for exactly
 * this reader. The body scrolls inside the frame and the footer is pinned.
 *
 * ⚠️ THE TAB BODIES SIT INSIDE `.qcv-legacy`, where the page's font reset stops: the timeline, the
 * notes thread and the agent tab were written against brand.tsx's defaults.
 */
import React, { useCallback, useRef, useState } from "react";
import { StatusDot } from "../../StatusDot";
import { FramedCard } from "../../containers/FramedCard";
import { queryVerbs } from "../../../lib/queryRowFacts";
import { turnFor } from "../../../lib/queryCardFacts";
import { COURT_LABEL, STAGE_NAME, factLine, primaryActionLabel, standLine, type QcRow } from "../../../lib/qcSummary";
import { TAB_KEY, readTab, type PanelTab } from "../QueryPanel";
import { QcMenu } from "./QcMenu";
import "./qcvPage.css";
import "./qcvOpen.css";

export type OpenAction = "nudge" | "snooze" | "closed";

export const QcOpenCard: React.FC<{
  row: QcRow;
  nowMs: number;
  manuscriptTitle: string | null;
  /** Audience, genre, word count — each omitted where the manuscript does not state it. */
  manuscriptTags: readonly string[];
  /** The handlers receive their BUTTON: the desks and popovers notch to the control that opened them. */
  onPrimary: (anchor: HTMLElement) => void;
  onAction: (action: OpenAction, anchor: HTMLElement) => void;
  liveAction?: "primary" | OpenAction | null;
  tracking: React.ReactNode;
  agentTab: React.ReactNode;
  notesTab: React.ReactNode;
  noteCount: number;
}> = ({ row, nowMs, manuscriptTitle, manuscriptTags, onPrimary, onAction, liveAction = null, tracking, agentTab, notesTab, noteCount }) => {
  const [tab, setTab] = useState<PanelTab>(readTab);
  const pickTab = (t: PanelTab) => { setTab(t); try { sessionStorage.setItem(TAB_KEY, t); } catch { /* the default is fine */ } };
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLButtonElement>(null);
  const closeMore = useCallback(() => setMoreOpen(false), []);

  /* ⚠️ ONE PREDICATE decides what a query offers — `queryVerbs`, the same one the drawer reads */
  const verbs = queryVerbs(turnFor(row.status));
  const action = primaryActionLabel(row.status);
  const more: { key: OpenAction; label: string }[] = [
    ...(verbs.nudge ? [{ key: "nudge" as const, label: "Nudge the agent" }, { key: "snooze" as const, label: "Snooze the nudge" }] : []),
    ...(verbs.markClosed ? [{ key: "closed" as const, label: "Mark closed" }] : []),
  ];

  return (
    <FramedCard as="aside" container={false} probe="open" className="qcv-open qcv-own" frameClassName="qcv-open-fr" bandClassName="qcv-open-bd"
      label={`${row.agentName}, ${row.agency}`} bandFill={`var(--state-${row.state})`}
      rest={{ "data-status": row.status, "data-id": row.id }}
      band={<>
        <b className={`qcv-open-crt${row.withYou ? " qcv-open-crt--you" : ""}`} data-qcv="open-court" data-you={row.withYou ? "true" : "false"}>{COURT_LABEL[row.court]}</b>
        {/* omitted, never "Day 0", where either end of it is undated */}
        {row.dayN != null && <b className="qcv-open-day">Day {row.dayN}</b>}
      </>}>
      <div className="qcv-open-body">
        <div className="qcv-open-who">
          <span className="qcv-open-ini" aria-hidden="true">{row.initials}</span>
          <div className="qcv-open-whotx">
            <h2 className="qcv-open-nm">{row.agentName}</h2>
            <span className="qcv-open-ag">{row.agency}</span>
          </div>
          <span className="qcv-open-pill"><StatusDot status={row.status} overrideSize={14} decorative />{STAGE_NAME[row.status]}</span>
        </div>

        {manuscriptTitle && (
          <div className="qcv-open-ms">
            <em>Querying</em>
            <b>{manuscriptTitle}</b>
            {manuscriptTags.length > 0 && <p>{manuscriptTags.map((t) => <span key={t}>{t}</span>)}</p>}
          </div>
        )}

        <div className="qcv-open-tabs" role="tablist" aria-label="Query detail">
          {(["tracking", "agent", "notes"] as const).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => pickTab(t)}>
              {t === "tracking" ? "Tracking" : t === "agent" ? "Agent" : "Notes"}
              {t === "notes" && noteCount > 0 && <i className="qcv-open-tabn">{noteCount}</i>}
            </button>
          ))}
        </div>

        <div className="qcv-open-tab qcv-legacy" role="tabpanel">
          {tab === "tracking" ? tracking : tab === "agent" ? agentTab : notesTab}
        </div>
      </div>

      <div className="qcv-open-ft" data-qcv="open-foot">
        <p className="qcv-open-stand">{standLine(row)}<br />{factLine(row, nowMs)}</p>
        {more.length > 0 && (
          <button ref={moreRef} type="button" className={`qcv-open-more${liveAction && liveAction !== "primary" ? " qcv-open-more--live" : ""}`} aria-haspopup="menu" aria-expanded={moreOpen}
            aria-label={`More actions for ${row.agentName}`} data-qcv="open-more" onClick={() => setMoreOpen((o) => !o)}>
            <i aria-hidden="true">···</i>
          </button>
        )}
        {action && (
          <button type="button" className={`qcv-open-act${liveAction === "primary" ? " qcv-open-act--live" : ""}`} data-qcv="open-action" onClick={(e) => onPrimary(e.currentTarget)}>{action}</button>
        )}
      </div>
      {moreOpen && (
        <QcMenu anchor={moreRef.current} label="More actions" onClose={closeMore} placement="up"
          groups={[{ kind: "action", current: "", items: more.map((m) => ({ key: m.key, label: m.label })), onPick: (k) => { if (moreRef.current) onAction(k as OpenAction, moreRef.current); } }]} />
      )}
    </FramedCard>
  );
};

/** The loading card: band, disc, two lines, pill, manuscript block, tab line, three timeline rows, footer. */
export const QcOpenCardSkeleton: React.FC = () => (
  <FramedCard as="aside" container={false} probe="open" className="qcv-open qcv-own" frameClassName="qcv-open-fr" bandClassName="qcv-open-bd" bandFill="#e9e4dc" band={<b className="qcv-open-crt">&nbsp;</b>} rest={{ "aria-hidden": "true" }}>
    <div className="qcv-open-body qcv-skw" style={{ paddingBottom: 18 }}>
      <div className="qcv-open-who"><span className="qcv-sk qcv-sk--r" style={{ width: 42, height: 42 }} /><div><span className="qcv-sk" style={{ width: "70%", height: 17 }} /><span className="qcv-sk qcv-sk--t" style={{ width: "45%", height: 9 }} /></div><span className="qcv-sk qcv-sk--p" style={{ width: 96, height: 24 }} /></div>
      <div className="qcv-open-ms"><span className="qcv-sk" style={{ width: 60, height: 8 }} /><span className="qcv-sk qcv-sk--t" style={{ width: "72%", height: 20 }} /><span className="qcv-sk qcv-sk--t" style={{ width: "55%", height: 16 }} /></div>
      <div className="qcv-open-tabs" style={{ paddingBottom: 9 }}><span className="qcv-sk" style={{ width: 180, height: 14 }} /></div>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "16px 1fr 44px", gap: 11, marginTop: 16 }}><span className="qcv-sk qcv-sk--r" style={{ width: 16, height: 16 }} /><span className="qcv-sk" style={{ width: "64%", height: 13 }} /><span className="qcv-sk" style={{ width: 44, height: 9 }} /></div>
      ))}
    </div>
    <div className="qcv-open-ft qcv-skw" data-qcv="open-foot"><span className="qcv-sk" style={{ width: "46%", height: 22 }} /><span className="qcv-sk qcv-sk--p" style={{ width: 150, height: 38, marginLeft: "auto" }} /></div>
  </FramedCard>
);
