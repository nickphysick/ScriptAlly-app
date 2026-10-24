/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v149 Part A (design-refs/query-centre-v149/, screens 01 and 03) — the header card and the "waiting on
 * you" banner, in the Versions page's style: both ARE the Versions page's components (shared/PageHeaderCard and
 * shared/PageAlertBanner, lifted in Phase 1 and held unchanged on Versions by QC149-L0). Then the quick-view row:
 * All · With you · With the agent · Gone quiet · Closed, and Find on the right.
 *
 * ⚠️ THE CHIPS ARE THE ONE "Where it stands" FILTER (`qcF138.where`) the Filters menu writes too, so a view and a
 *    Filters choice combine as they always did. Single-select: pressing the chosen chip goes back to All.
 * ⚠️ THE BANNER'S n IS THE WITH YOU CHIP'S COUNT (lib/qc149, both `whereItStands`). At 0 the banner is not drawn.
 * ⚠️ THE HEADER'S `h1` KEEPS `data-page-title` (the shell's folder tab and the guide read it).
 */
import React from "react";
import { WHERE_KEYS, WHERE_LABEL, type WhereKey } from "../../../lib/qcSummary";
import type { WaitingBanner } from "../../../lib/qc149";
import { PageHeaderCard } from "../../shared/PageHeaderCard";
import { PageAlertBanner } from "../../shared/PageAlertBanner";
import { QC_DESK_HAWK } from "./QcHeader138";
import "./qcv149.css";

const CLOCK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);

export const QcHeader149: React.FC<{
  loading: boolean;
  msTitle: string | null;
  banner: WaitingBanner | null;
  onLog: () => void;
  onRecord: () => void;
  onShowThem: () => void;
  logDisabled?: boolean;
  logRef?: React.Ref<HTMLButtonElement>;
  children?: React.ReactNode;
}> = ({ loading, msTitle, banner, onLog, onRecord, onShowThem, logDisabled = false, logRef, children }) => (
  <header className="qc149-hd" data-qc149="header" data-qcv="open-header" data-own-header="" data-loading={loading ? "" : undefined} aria-busy={loading || undefined}>
    <PageHeaderCard className="qc149-card" titleId="qc149T" data={{ "data-qc149": "card" }} titleData={{ "data-page-title": "true", "data-qc149": "title" }}
      title="Query Centre" art={`${QC_DESK_HAWK.src}?v=${QC_DESK_HAWK.version}`}
      body={<>{msTitle ? <>Every query for <b data-qc149="ms">{msTitle}</b>, wherever it stands.</> : "Every query you’ve sent, wherever it stands."} Log what you send, record what comes back, and QueryHawk keeps track of who you’re waiting on and when to nudge.</>}
      primary={{ label: "+ Log a query", onClick: onLog, disabled: loading || logDisabled, buttonRef: logRef, data: { "data-qcv": "oh-log", "data-qc149": "log" } }}
      secondary={{ label: "Record a response", onClick: onRecord, disabled: loading, data: { "data-qcv": "oh-record", "data-qc149": "record" } }} />
    <PageAlertBanner className="qc149-ban" hidden={!banner || banner.n === 0} icon={CLOCK} data={{ "data-qc149": "banner" }}
      headline={banner ? <b data-qc149="banner-n">{banner.n} {banner.noun} waiting on you.</b> : null}
      line={banner?.next ? `Next: ${banner.next}` : ""}
      faces={banner?.faces}
      action={{ label: "Show them", onClick: onShowThem, data: { "data-qc149": "show" } }} />
    {children}
  </header>
);

const SWATCH: Record<WhereKey, string> = { you: "you", agent: "agent", quiet: "quiet", closed: "closed" };

/** v149 A3 — the views (left) and Find (right): one row, 28 under the banner and 14 above the list */
export const QcViewRow149: React.FC<{
  counts: Record<WhereKey, number> | null;
  total: number;
  where: WhereKey | null;
  onView: (k: WhereKey | null) => void;
  find: string;
  onFind: (v: string) => void;
  findRef?: React.Ref<HTMLInputElement>;
  loading: boolean;
}> = ({ counts, total, where, onView, find, onFind, findRef, loading }) => (
  <div className="qc149-vr" data-qc149="views-row">
    <div className="qc149-vs" role="group" aria-label="Views" data-qc149="views">
      <button type="button" className="qc149-v" data-qc149="view" data-k="all" data-n={counts ? total : undefined} aria-pressed={where === null}
        disabled={loading} onClick={() => onView(null)}>
        <b>{counts ? total : ""}</b><span>All</span>
      </button>
      {WHERE_KEYS.map((k) => (
        <button key={k} type="button" className="qc149-v" data-qc149="view" data-k={k} data-n={counts ? counts[k] : undefined} aria-pressed={where === k}
          title={WHERE_LABEL[k].title} disabled={loading} onClick={() => onView(k)}>
          <i className={`qc149-sw qc149-sw--${SWATCH[k]}`} aria-hidden="true" />
          <b>{counts ? counts[k] : ""}</b><span>{WHERE_LABEL[k].label}</span>
        </button>
      ))}
    </div>
    <label className="qc149-find" data-qc149="find" data-qc140="find" data-qc138="search" data-qc144="find">
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></svg>
      <input ref={findRef} value={find} onChange={(e) => onFind(e.target.value)} placeholder="Find an agent or agency" aria-label="Find an agent or agency" autoComplete="off" disabled={loading} />
    </label>
  </div>
);
