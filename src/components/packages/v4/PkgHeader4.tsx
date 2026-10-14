/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v4 Part A — THE CENTRED LIGHT HEADER, built exactly as the Contact list v17.1's: eyebrow,
 * "{live} packages in use", the byline, two buttons, the soft hawk shadow; and ONE white card on the right with
 * the counts (Sent · Not sent yet · Retired, which filter the packages) and the Reply rate ring.
 *
 * ⚠️ PAGE-LOCAL, NOT SHARED. The Contact list's header and card (`ContactLightHeader`, `ContactSummaryCard`) are
 *    built over its own glance model and its List health, and the Contact list is not this pack's to change, so
 *    this is a copy from the same values (`contactV17.css`) — a lift candidate, with the Query Centre's v138
 *    header the third of the family.
 * ⚠️ THE RING IS INK ONLY (decision 1). A reply rate is not a gap to fill, so unlike List health there is no rust
 *    circle under the arc: the track is the stone grey and the arc the ink, butt caps, from 12 o'clock.
 * ⚠️ THE TITLE KEEPS `data-page-title`.
 */
import React from "react";
import type { Split } from "../../../lib/packageReplies";
import "./packagesV4.css";

export const PK4_EYEBROW = "— SUBMISSION PACKAGES —";
export const PK4_SHADOW = { src: "/images/hawk-shadow.png", version: 1 };
/** "4 packages in use" / "1 package in use" */
export const inUseWords = (n: number): string => (n === 1 ? "package in use" : "packages in use");

export type StatusKey = "sent" | "new" | "ret";
export const STATUS_LABEL: Record<StatusKey, string> = { sent: "Sent", new: "Not sent yet", ret: "Retired" };
export const STATUS_ORDER: StatusKey[] = ["sent", "new", "ret"];

/** the ring's geometry: a 95 viewBox, r 42, stroke 9 (the Contact list's) */
export const RRING = { box: 95, r: 42, w: 9 } as const;
export const RRING_C = 2 * Math.PI * RRING.r;

export const ReplyRing: React.FC<{ rate: number | null }> = ({ rate }) => {
  const c = RRING.box / 2;
  const arc = rate == null ? 0 : Math.max(0, Math.min(1, rate)) * RRING_C;
  return (
    <span className="pk4-rg" data-pk4="ring">
      <svg viewBox={`0 0 ${RRING.box} ${RRING.box}`} aria-hidden="true">
        <circle data-pk4="ring-track" cx={c} cy={c} r={RRING.r} fill="none" stroke="#e5e0d8" strokeWidth={RRING.w} />
        {arc > 0 ? (
          <circle data-pk4="ring-arc" cx={c} cy={c} r={RRING.r} fill="none" stroke="#2a3a52" strokeWidth={RRING.w} strokeLinecap="butt"
            strokeDasharray={`${arc.toFixed(2)} ${RRING_C.toFixed(2)}`} transform={`rotate(-90 ${c} ${c})`} />
        ) : null}
      </svg>
      <span className="pk4-pc-fig" data-pk4="ring-pct" data-wide={rate != null && Math.round(rate * 100) >= 100 ? "" : undefined}>{rate == null ? "–" : <>{Math.round(rate * 100)}<i>%</i></>}</span>
    </span>
  );
};

export const PkgSummaryCard: React.FC<{
  counts: Record<StatusKey, number>;
  active: Set<StatusKey>;
  onStatus: (k: StatusKey) => void;
  overall: Split | null;
  onRate: () => void;
  loading?: boolean;
}> = ({ counts, active, onStatus, overall, onRate, loading = false }) => {
  const on = active.size > 0;
  const r = overall;
  const answered = r?.answered ?? 0;
  return (
    <div className="pk4-card" data-pk4="card" data-on={on ? "" : undefined} data-loading={loading ? "" : undefined}>
      <div className="pk4-cnt" data-pk4="counts" role="group" aria-label="Where your packages stand">
        <div className="pk4-bar" data-pk4="card-bar" aria-hidden="true">
          {STATUS_ORDER.map((k) => (
            <i key={k} className={`pk4-sg pk4-sg--${k}`} data-pk4="card-seg" data-k={k} data-on={active.has(k) ? "" : undefined}
              style={{ flex: `${loading ? 1 : Math.max(counts[k], 0)} 1 0` }} onClick={loading ? undefined : () => onStatus(k)} />
          ))}
        </div>
        {STATUS_ORDER.map((k) => (
          <button key={k} type="button" className="pk4-row" data-pk4="card-row" data-k={k} aria-pressed={active.has(k)} disabled={loading} onClick={() => onStatus(k)}>
            <i className={`pk4-sw pk4-sg--${k}`} aria-hidden="true" />
            <b className="pk4-n" data-pk4="card-n">{loading ? "" : counts[k]}</b>
            <span className="pk4-lb" data-pk4="card-label">{STATUS_LABEL[k]}</span>
          </button>
        ))}
      </div>
      <button type="button" className="pk4-rate" data-pk4="rate" disabled={loading} onClick={onRate}
        aria-label={r && answered ? `Reply rate ${Math.round((r.rate ?? 0) * 100)}%. ${r.replies} repl${r.replies === 1 ? "y" : "ies"} from ${answered} answered quer${answered === 1 ? "y" : "ies"}. Go to What's getting replies` : "Reply rate. Nothing answered yet. Go to What's getting replies"}>
        <ReplyRing rate={loading ? null : r && answered ? r.rate : null} />
        <span className="pk4-rt">Reply rate</span>
        <span className={`pk4-rs${answered ? "" : " pk4-rs--none"}`} data-pk4="rate-sub">{loading ? "" : answered ? `${r!.replies} of ${answered} answered` : "Nothing answered yet"}</span>
      </button>
    </div>
  );
};

export const PkgHeader4: React.FC<{
  loading: boolean;
  live: number | null;
  msTitle: string | null;
  card: React.ReactNode;
  onNew: () => void;
  onAddMaterial: () => void;
  children?: React.ReactNode;
}> = ({ loading, live, msTitle, card, onNew, onAddMaterial, children }) => (
  <header className="pk4-hd" data-pk4="header" data-own-header="" data-loading={loading ? "" : undefined} aria-busy={loading || undefined}>
    <img className="pk4-shadow" data-pk4="shadow" alt="" aria-hidden="true" src={`${PK4_SHADOW.src}?v=${PK4_SHADOW.version}`} />
    <div className="pk4-tr" data-pk4="header-row">
      <div className="pk4-tb" data-pk4="title-block">
        <span className="pk4-ey" data-pk4="eyebrow">{PK4_EYEBROW}</span>
        <h1 className="pk4-title" data-page-title="" data-pk4="title" tabIndex={-1} aria-label={live === null ? "Packages in use" : `${live} ${inUseWords(live)}`}>
          <span aria-hidden="true">
            {live === null ? <span className="pk4-blank">00</span> : <span data-pk4="title-n">{live}</span>}
            {" "}{inUseWords(live ?? 0)}
          </span>
        </h1>
        <div className="pk4-by" data-pk4="byline">
          {msTitle ? <span className="pk4-byt">for <i className="pk4-ms" data-pk4="ms">{msTitle}</i></span> : <span className="pk4-byt">for your book</span>}
        </div>
      </div>
      <div className="pk4-acts" data-pk4="acts">
        <button type="button" className="pk4-b1" data-pk4="new" disabled={loading} onClick={onNew}>+ New package</button>
        <button type="button" className="pk4-b2" data-pk4="add-material" disabled={loading} onClick={onAddMaterial}>+ Add a material</button>
      </div>
      {card}
    </div>
    {children}
  </header>
);
