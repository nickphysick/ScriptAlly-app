/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Responses v2 Part A — THE CENTRED LIGHT HEADER, built as Contact list v17.1's and packages v4's: the eyebrow, "{n}
 * answers from agents", the byline, two buttons, the soft hawk shadow, and NO illustration; and ONE white card on the
 * right: the answer counts and the Reply rate ring.
 *
 * ⚠️ PAGE-LOCAL, from the same values (`PkgHeader4` is itself a page-local copy of `ContactLightHeader`). A lift
 *    candidate with those two and the Query Centre's v138 header.
 * ⚠️ THE COUNTS ARE THE DATA LAYER'S (`respCounts`) AND SUM TO THE TITLE. Asked for more scrolls to its carousel;
 *    Passed and No reply filter the list of nos (one state with its segmented control) and never scroll.
 * ⚠️ THE RING IS INK ONLY AND NOT INTERACTIVE: a picture of the rate (`role="img"`), with no rust stroke.
 * ⚠️ THE TITLE KEEPS `data-page-title`.
 */
import React from "react";
import type { NoKind, RespCounts } from "../../lib/responses";
import { replyRate } from "../../lib/responses";

export const RSP_EYEBROW = "— RESPONSES —";
export const RSP_SHADOW = { src: "/images/hawk-shadow.png", version: 1 };
/** "10 answers from agents" / "1 answer from an agent" */
export const answersWords = (n: number): string => (n === 1 ? "answer from an agent" : "answers from agents");

export type CardKey = "more" | NoKind;
export const CARD_LABEL: Record<CardKey, string> = { more: "Asked for more", passed: "Passed", noReply: "No reply" };
const ORDER: CardKey[] = ["more", "passed", "noReply"];

/** the ring's geometry: a 95 viewBox, r 42, stroke 9 (the Contact list's and packages v4's) */
const RING = { box: 95, r: 42, w: 9 } as const;
export const RING_C = 2 * Math.PI * RING.r;

export const RspRing: React.FC<{ rate: number | null }> = ({ rate }) => {
  const c = RING.box / 2;
  const arc = rate == null ? 0 : Math.max(0, Math.min(1, rate)) * RING_C;
  const pct = rate == null ? null : Math.round(rate * 100);
  return (
    <span className="rsp-rg" data-rsp="ring">
      <svg viewBox={`0 0 ${RING.box} ${RING.box}`} aria-hidden="true">
        <circle data-rsp="ring-track" cx={c} cy={c} r={RING.r} fill="none" stroke="#e5e0d8" strokeWidth={RING.w} />
        {arc > 0 ? (
          <circle data-rsp="ring-arc" cx={c} cy={c} r={RING.r} fill="none" stroke="#2a3a52" strokeWidth={RING.w} strokeLinecap="butt"
            strokeDasharray={`${arc.toFixed(2)} ${RING_C.toFixed(2)}`} transform={`rotate(-90 ${c} ${c})`} />
        ) : null}
      </svg>
      <span className="rsp-fig" data-rsp="ring-pct" data-wide={pct != null && pct >= 100 ? "" : undefined}>{pct == null ? "–" : <>{pct}<i>%</i></>}</span>
    </span>
  );
};

export const RspSummaryCard: React.FC<{
  counts: RespCounts;
  kind: NoKind | null;
  onMore: () => void;
  onKind: (k: NoKind) => void;
  loading?: boolean;
}> = ({ counts, kind, onMore, onKind, loading = false }) => {
  const rate = replyRate(counts);
  const replies = counts.more + counts.passed;
  const n = (k: CardKey) => counts[k];
  return (
    <div className="rsp-card" data-rsp="card" data-on={kind ? "" : undefined}>
      <div className="rsp-cnt" data-rsp="counts" role="group" aria-label="How agents have answered">
        <div className="rsp-bar" data-rsp="card-bar" aria-hidden="true">
          {ORDER.filter((k) => loading || n(k) > 0).map((k) => (
            <i key={k} className={`rsp-sg rsp-sw--${k}`} data-rsp="card-seg" data-k={k} data-on={kind === k ? "" : undefined}
              style={{ flex: `${loading ? 1 : n(k)} 1 0` }} />
          ))}
        </div>
        {ORDER.map((k) => (
          <button key={k} type="button" className="rsp-row" data-rsp="card-row" data-k={k}
            aria-pressed={k === "more" ? undefined : kind === k}
            disabled={loading || n(k) === 0}
            onClick={() => (k === "more" ? onMore() : onKind(k))}>
            <i className={`rsp-sw rsp-sw--${k}`} aria-hidden="true" />
            <b className="rsp-n" data-rsp="card-n">{loading ? "" : n(k)}</b>
            <span className="rsp-lb" data-rsp="card-label">{CARD_LABEL[k]}</span>
          </button>
        ))}
      </div>
      <div className="rsp-rate" data-rsp="rate" role="img"
        aria-label={rate == null ? "Reply rate. Nothing answered yet." : `Reply rate ${Math.round(rate * 100)}%. ${replies} ${replies === 1 ? "reply" : "replies"} from ${counts.answered} ${counts.answered === 1 ? "query" : "queries"} no longer waiting.`}>
        <RspRing rate={loading ? null : rate} />
        <span className="rsp-rt">Reply rate</span>
        <span className="rsp-rs" data-rsp="rate-sub">{loading ? "" : counts.answered ? `${replies} of ${counts.answered} answered` : "Nothing answered yet"}</span>
      </div>
    </div>
  );
};

export const RspHeader: React.FC<{
  loading: boolean;
  answered: number | null;
  msTitle: string | null;
  hasNos: boolean;
  card: React.ReactNode;
  onRecord: () => void;
  onShare: () => void;
}> = ({ loading, answered, msTitle, hasNos, card, onRecord, onShare }) => (
  <header className="rsp-hd" data-rsp="header" data-own-header="" data-loading={loading ? "" : undefined} aria-busy={loading || undefined}>
    <img className="rsp-shadow" data-rsp="shadow" alt="" aria-hidden="true" src={`${RSP_SHADOW.src}?v=${RSP_SHADOW.version}`} />
    <div className="rsp-tr" data-rsp="header-row">
      <div className="rsp-left">
      <div className="rsp-tb" data-rsp="title-block">
        <span className="rsp-ey" data-rsp="eyebrow">{RSP_EYEBROW}</span>
        <h1 className="rsp-title" data-page-title="" data-rsp="title" tabIndex={-1}
          aria-label={answered === null ? "Answers from agents" : `${answered} ${answersWords(answered)}`}>
          <span aria-hidden="true">
            {answered === null ? <span className="rsp-blank">00</span> : <span data-rsp="title-n">{answered}</span>}
            {" "}{answersWords(answered ?? 0)}
          </span>
        </h1>
        <div className="rsp-by" data-rsp="byline">
          {msTitle ? <span className="rsp-byt">for <i className="rsp-ms" data-rsp="ms">{msTitle}</i></span> : <span className="rsp-byt">for your book</span>}
        </div>
      </div>
      <div className="rsp-acts" data-rsp="acts">
        <button type="button" className="rsp-btn rsp-btn--navy" data-rsp="record" disabled={loading} onClick={onRecord}>+ Record a response</button>
        {hasNos ? <button type="button" className="rsp-btn rsp-btn--wht" data-rsp="to-share" disabled={loading} onClick={onShare}>Share your wall of no</button> : null}
      </div>
      </div>
      {card}
    </div>
  </header>
);
