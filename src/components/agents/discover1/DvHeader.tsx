/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Discover v1 — the two-state header (ref design-refs/discover-v1/discover-v1.html).
 *
 *   · POPULATED (the Scout is live): the light header — eyebrow "— DISCOVER — PRO", the title, "for {book}", Tune the
 *     Scout · Share my agents, "How the Scout finds agents", and the white card on the right: three rows (To review ·
 *     Added to your list · Not for you) over a bar, and the "Picks reviewed" ring.
 *   · EMPTY (coming soon): the navy panel — "The Scout is out looking", the paragraph, Tell me when it's ready · How
 *     the Scout works, and the binoculars bird on its disc.
 *
 * ⚠️ PAGE-LOCAL. The shared LightHeader / EmptyPanel live on the Comparable titles v28 branch, not on main; these are
 *    copies under `dv1-` (lift candidates once that branch lands), and nothing here edits a shared rule.
 * ⚠️ THE RING'S FIGURES ARE THE QUEUE'S OWN (`scoutTally`). With nothing decided there is NO arc element at all — a
 *    zero-length arc with a round cap paints a dot. With nothing at all the centre reads "—".
 * ⚠️ THE TITLE KEEPS `data-page-title` (the hook the shell reads for "has the title scrolled past?").
 */
import React from "react";
import "../../shell/pageHeroFrame.css";
import type { ScoutTally } from "../../../lib/scout";
import { considerWords } from "../../../lib/scout";

export const DV_EYEBROW = "— Discover —";
export const DV_ART = { src: "/images/contact/discover-binoculars-bird.png", version: 1 };
export const DV_FACE = { src: "/images/discover/scout-face.webp", version: 1 };

/** the ring: an 84 viewBox, r 36, stroke 8, round caps (the mock's) */
export const DRING = { box: 84, r: 36, w: 8 } as const;
export const DRING_C = 2 * Math.PI * DRING.r;

export const ProTag: React.FC = () => <span className="dv1-pro" data-dv1="pro">PRO</span>;

export const ReviewRing: React.FC<{ tally: ScoutTally | null }> = ({ tally }) => {
  const c = DRING.box / 2;
  const pct = tally?.pct ?? null;
  const decided = tally?.decided ?? 0;
  const arc = pct == null ? 0 : (DRING_C * pct) / 100;
  return (
    <span className="dv1-rg" data-dv1="ring">
      <svg viewBox={`0 0 ${DRING.box} ${DRING.box}`} aria-hidden="true">
        <circle data-dv1="ring-track" cx={c} cy={c} r={DRING.r} fill="none" stroke="#e9e2d8" strokeWidth={DRING.w} />
        {decided > 0 && arc > 0 ? (
          <circle data-dv1="ring-arc" cx={c} cy={c} r={DRING.r} fill="none" stroke="#2a3a52" strokeWidth={DRING.w} strokeLinecap="round"
            strokeDasharray={`${arc.toFixed(2)} ${DRING_C.toFixed(2)}`} transform={`rotate(-90 ${c} ${c})`} />
        ) : null}
      </svg>
      <b className="dv1-rp" data-dv1="ring-pct">{tally == null ? "" : pct == null ? "—" : <span>{pct}<small>%</small></span>}</b>
    </span>
  );
};

export const DvSummaryCard: React.FC<{
  tally: ScoutTally | null;
  onPassed: () => void;
}> = ({ tally, onPassed }) => {
  const loading = tally == null;
  const t = tally ?? { toReview: 0, added: 0, passed: 0, decided: 0, total: 0, pct: null };
  /* ⚠️ LOADING DRAWS PLACEHOLDER FIGURES IN TRANSPARENT INK — the real figures' own boxes, so nothing moves when they land */
  const sub = loading ? "0 of 0 decided" : t.total === 0 ? "nothing to decide yet" : `${t.decided} of ${t.total} decided`;
  return (
    <div className="dv1-card" data-dv1="card" data-loading={loading ? "" : undefined}>
      <div className="dv1-c1" role="group" aria-label="Where the Scout's picks stand">
        <div className="dv1-bar" aria-hidden="true" data-dv1="bar">
          <i className="dv1-sg dv1-sg--rv" style={{ flex: `${loading ? 1 : t.toReview} 1 0` }} />
          <i className="dv1-sg dv1-sg--ad" style={{ flex: `${loading ? 1 : t.added} 1 0` }} />
          <i className="dv1-sg dv1-sg--pa" style={{ flex: `${loading ? 1 : t.passed} 1 0` }} />
        </div>
        <ul>
          <li data-dv1="row" data-k="review"><span className="dv1-sq dv1-sg--rv" /><b data-dv1="n">{loading ? "0" : t.toReview}</b>To review</li>
          <li data-dv1="row" data-k="added"><span className="dv1-sq dv1-sg--ad" /><b data-dv1="n">{loading ? "0" : t.added}</b>Added to your list</li>
          <li data-dv1="row" data-k="passed">
            <button type="button" className="dv1-pf" data-dv1="passed-row" disabled={loading || t.passed === 0} onClick={onPassed}
              aria-label={loading ? "Not for you" : `${t.passed} not for you. See the agents you passed on`}>
              <span className="dv1-sq dv1-sg--pa" /><b data-dv1="n">{loading ? "0" : t.passed}</b>Not for you
            </button>
          </li>
        </ul>
      </div>
      <div className="dv1-c2">
        <ReviewRing tally={tally} />
        <p className="dv1-rl">Picks reviewed</p>
        <p className="dv1-rs" data-dv1="ring-sub">{sub}</p>
      </div>
    </div>
  );
};

export type HeaderTitle = { kind: "count"; n: number } | { kind: "done" } | { kind: "none" } | { kind: "loading" };

export const DvHeader: React.FC<{
  title: HeaderTitle;
  msTitle: string | null;
  tally: ScoutTally | null;
  onTune: () => void;
  onShare: () => void;
  onHow: () => void;
  onPassed: () => void;
}> = ({ title, msTitle, tally, onTune, onShare, onHow, onPassed }) => {
  const loading = title.kind === "loading";
  const label = title.kind === "count" ? `${title.n} ${considerWords(title.n)}` : title.kind === "done" ? "You’re up to date"
    : title.kind === "none" ? "Nothing to consider yet" : "Discover";
  return (
    <header className="dv1-hd phf" data-dv1="header" data-own-header="" data-loading={loading ? "" : undefined} aria-busy={loading || undefined}>
      <div className="dv1-hrow">
        <div className="dv1-ht" data-dv1="title-block">
          <p className="dv1-k" data-dv1="eyebrow">{DV_EYEBROW}<ProTag /></p>
          <h1 className="dv1-title" data-page-title="" data-dv1="title" tabIndex={-1} aria-label={label}>
            <span aria-hidden="true">
              {title.kind === "count" ? <><b data-dv1="title-n">{title.n}</b> {considerWords(title.n)}</>
                : title.kind === "loading" ? <span className="dv1-blank" data-dv1="title-blank">00 agents to consider</span>
                : label}
            </span>
          </h1>
          <p className="dv1-by" data-dv1="byline">
            <i aria-hidden="true" />
            {msTitle ? <><em>for</em> <span className="dv1-ms" data-dv1="ms">{msTitle}</span></> : <em>choose a manuscript in the sidebar</em>}
            <i aria-hidden="true" />
          </p>
          <div className="dv1-hb" data-dv1="acts">
            <button type="button" className="dv1-p1" data-dv1="tune" disabled={loading} onClick={onTune}>Tune the Scout</button>
            <button type="button" className="dv1-p2" data-dv1="share" disabled={loading} onClick={onShare}>Share my agents</button>
          </div>
          <button type="button" className="dv1-hwl" data-dv1="how" onClick={onHow}><i aria-hidden="true">?</i>How the Scout finds agents</button>
        </div>
        <DvSummaryCard tally={loading ? null : tally} onPassed={onPassed} />
      </div>
    </header>
  );
};

/** The EMPTY state's header: the navy panel. The rest of the coming-soon page renders as its children. */
export const DvEmptyHeader: React.FC<{
  msTitle: string | null;
  /** the books have not answered yet: the title's span is drawn blank, so it does not arrive late and move the panel */
  titleLoading?: boolean;
  notified: boolean;
  onNotify: () => void;
  onHow: () => void;
  children?: React.ReactNode;
}> = ({ msTitle, titleLoading = false, notified, onNotify, onHow, children }) => (
  <section className="dv1-ae" data-dv1="coming-soon" data-own-header="" aria-label="Discover, before the Scout is live">
    <div className="dv1-aep" data-dv1="panel">
      <div className="dv1-aet">
        <p className="dv1-aek" data-dv1="eyebrow">{DV_EYEBROW}<ProTag /></p>
        <h1 className="dv1-aeh" data-page-title="" data-dv1="title" tabIndex={-1}>The Scout is<br />out looking</h1>
        <p className="dv1-aepp" data-dv1="lede">
          As writers join, their agent lists build one shared catalogue. Every agent in it is checked by hand before the Scout
          brings you the ones who want a book like {titleLoading ? <span className="dv1-mono" data-blank="" aria-hidden="true">your manuscript</span> : msTitle ? <span className="dv1-mono" data-dv1="ms">{msTitle}</span> : "yours"} — with the reasons they fit.
          Nothing joins your contact list without you.
        </p>
        <div className="dv1-aeb">
          <button type="button" className={`dv1-b1${notified ? " is-done" : ""}`} data-dv1="notify" aria-pressed={notified} onClick={onNotify}>
            {notified ? <><svg className="dv1-tick" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5" /></svg>We’ll tell you</> : "Tell me when it’s ready"}
          </button>
          <button type="button" className="dv1-b2" data-dv1="how" onClick={onHow}>How the Scout works</button>
        </div>
      </div>
      <div className="dv1-aeart" aria-hidden="true">
        <div className="dv1-disc"><img alt="" src={`${DV_ART.src}?v=${DV_ART.version}`} /></div>
      </div>
    </div>
    {children}
  </section>
);
