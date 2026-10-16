/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Analytics v21 §A — THE LIGHT HEADER (design-refs/analytics-v21/analytics-v21.html, `.lh`): on the page colour,
 * the Contact list v17.1 header's construction — the eyebrow, "{sent} queries, {replies} replies", the byline and
 * two buttons, a soft hawk shadow behind the title, and ONE white card on the right. NO ILLUSTRATION: the
 * Archivist appears only on the empty page.
 *
 * ⚠️ PAGE-LOCAL, BUILT FROM THE SAME VALUES. Contact list's `ContactLightHeader` is page-local too and its card
 *    FILTERS (it is the list's own group filter); this card is INERT — the page has no list for it to filter. A
 *    lift candidate, with the Contact list's, into `shell/`.
 * ⚠️ THE CARD'S ROWS ARE `standing` (lib/analyticsV21), THE ONE PARTITION — the How things stand chips read the
 *    same derivation, so the two cannot disagree. Its swatches and bar are the LOCKED STATUS FILLS; a zero row is
 *    hidden and its segment left out. The ring is ink only: no rust in it.
 * ⚠️ DESKTOP ONLY. The phone (≤ 760) keeps v17's band, which the page mounts instead (decision 5).
 */
import React from "react";
import { STANDING_FILL, type StandingRow, type V21 } from "../../lib/analyticsV21";

export const AN_EYEBROW = "— ANALYTICS —";
export const AN_SHADOW = { src: "/images/hawk-shadow.png", version: 1 };
const RING_R = 34, RING_C = 2 * Math.PI * RING_R;

/** "27 queries, 10 replies" — singulars, and a zero in words. */
export function headTitle(sent: number, replies: number): { sent: string; sentWord: string; replies: string; repliesWord: string } {
  return {
    sent: String(sent),
    sentWord: sent === 1 ? "query" : "queries",
    replies: replies === 0 ? "no" : String(replies),
    repliesWord: replies === 1 ? "reply" : "replies",
  };
}

export const InsideRing: React.FC<{ inside: V21["inside"] | null }> = ({ inside }) => {
  const pct = inside?.pct ?? null;
  const arc = pct === null ? 0 : (inside as V21["inside"]).share * RING_C;
  return (
    <span className="a21-ring" data-a21="ring">
      <svg viewBox="0 0 84 84" aria-hidden="true">
        <circle cx="42" cy="42" r={RING_R} fill="none" stroke="#e5ded3" strokeWidth="9" data-a21="ring-track" />
        {pct !== null && arc > 0 ? (
          <circle cx="42" cy="42" r={RING_R} fill="none" stroke="#2a3a52" strokeWidth="9" data-a21="ring-arc"
            strokeDasharray={`${arc.toFixed(2)} ${(RING_C).toFixed(2)}`} transform="rotate(-90 42 42)" />
        ) : null}
      </svg>
      <b data-a21="ring-pct" className={pct === 100 ? "a21-full" : undefined}>{pct === null ? "–" : <>{pct}<small>%</small></>}</b>
    </span>
  );
};

export const A21Card: React.FC<{ rows: StandingRow[] | null; inside: V21["inside"] | null; onRing: () => void; loading: boolean }> = ({ rows, inside, onRing, loading }) => {
  const shown = (rows ?? []).filter((r) => r.count > 0);
  return (
    <div className="a21-card" data-a21="card" data-loading={loading ? "" : undefined}>
      <div className="a21-c1" data-a21="counts" role="group" aria-label="Where the queries stand">
        <div className="a21-bar" data-a21="card-bar" aria-hidden="true">
          {loading
            ? <i style={{ flex: "1 1 0", background: "rgba(28, 19, 15, 0.07)" }} />
            : shown.map((r) => <i key={r.key} data-a21="card-seg" data-k={r.key} style={{ flex: `${r.count} 1 0`, background: STANDING_FILL[r.key] }} />)}
        </div>
        <ul>
          {(loading ? [] : shown).map((r) => (
            <li key={r.key} data-a21="card-row" data-k={r.key}>
              <span className="a21-sq" data-a21="card-sw" style={{ background: STANDING_FILL[r.key] }} aria-hidden="true" />
              <b data-a21="card-n">{r.count}</b>
              <span data-a21="card-label">{r.label}</span>
            </li>
          ))}
        </ul>
      </div>
      <button type="button" className="a21-c2" data-a21="ring-panel" onClick={onRing} disabled={loading}
        aria-label={inside && inside.pct !== null ? `Inside the window: ${inside.inside} of ${inside.dated} dated replies` : "Inside the window: no dated replies yet"}>
        <InsideRing inside={loading ? null : inside} />
        <span className="a21-rl">Inside the window</span>
        <span className="a21-rs" data-a21="ring-sub">
          {loading ? "" : inside && inside.pct !== null ? `${inside.inside} of ${inside.dated} dated ${inside.dated === 1 ? "reply" : "replies"}` : "No dated replies yet"}
        </span>
      </button>
    </div>
  );
};

export const A21Header: React.FC<{
  loading: boolean;
  sent: number;
  replies: number;
  msTitle: string | null;
  rows: StandingRow[] | null;
  inside: V21["inside"] | null;
  onRecord: () => void;
  onRead: () => void;
  onRing: () => void;
}> = ({ loading, sent, replies, msTitle, rows, inside, onRecord, onRead, onRing }) => {
  const t = headTitle(sent, replies);
  return (
    <header className="a21-lh" data-a21="header" data-own-header="" data-loading={loading ? "" : undefined} aria-busy={loading || undefined}>
      <img className="a21-shadow" data-a21="shadow" alt="" aria-hidden="true" src={`${AN_SHADOW.src}?v=${AN_SHADOW.version}`} />
      <div className="a21-row" data-a21="header-row">
        <div className="a21-tb" data-a21="title-block">
          <p className="a21-k" data-a21="eyebrow">{AN_EYEBROW}</p>
          <h1 className="a21-h1" data-page-title="" data-a21="title" tabIndex={-1}
            aria-label={loading ? "Analytics" : `${t.sent} ${t.sentWord}, ${t.replies} ${t.repliesWord}`}>
            {loading
              ? <span aria-hidden="true"><span className="a21-blank">00</span> queries, <span className="a21-blank">00</span> replies</span>
              : <span aria-hidden="true"><b>{t.sent}</b> {t.sentWord}, <b>{t.replies}</b> {t.repliesWord}</span>}
          </h1>
          <p className="a21-by" data-a21="byline"><i aria-hidden="true" /><em>for</em> {msTitle ?? "your book"}<i aria-hidden="true" /></p>
          <div className="a21-b" data-a21="acts">
            <button type="button" className="a21-p1" data-a21="record-response" onClick={onRecord}>+ Record a response</button>
            <button type="button" className="a21-p2" data-a21="read" onClick={onRead} disabled={loading}>Read the numbers {"↓"}</button>
          </div>
        </div>
        <A21Card rows={rows} inside={inside} onRing={onRing} loading={loading} />
      </div>
    </header>
  );
};

/** True at the phone's width (≤ 760), where v17's band stands in for the light header. Live on resize. */
export const PHONE_QUERY = "(max-width: 760px)";
export function usePhone(): boolean {
  const [phone, setPhone] = React.useState<boolean>(() => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(PHONE_QUERY).matches);
  React.useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const mql = window.matchMedia(PHONE_QUERY);
    const on = () => setPhone(mql.matches);
    on();
    mql.addEventListener("change", on);
    return () => mql.removeEventListener("change", on);
  }, []);
  return phone;
}
