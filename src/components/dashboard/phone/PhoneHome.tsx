/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v2, Part 2 — HOME (ref design-refs/phone-app-v2/src/v2.js `heroBand`, `screenHome2` PICK hdr C · stats D ·
 * next B; `foundingCard`; app.css `.card` `.closedline` `.nextc` `.shd` `.feed`).
 *
 * The band carries the hero (`HomeHero`, put there through the band slot); the sheet carries Where they stand, Up next,
 * Activity (Phone round two v1, PhoneActivity — it replaced Latest) and the founding writer card, in that order. Every figure comes from a derivation the app already runs — see
 * `lib/phoneHome.ts` and DashPhone, which hands these the numbers.
 */
import React from "react";
import { PI } from "../../phone/phoneIcons";
import { PhoneArt } from "../../phone/PhoneArtSpot";
import { PHONE_ART } from "../../phone/phoneArt";
import { HERO_RANGES, HERO_SERIES, SERIES_LABEL, SERIES_NOUN, sparkPath, type Hero, type HeroRange, type HeroSeries } from "../../../lib/phoneHome";
import { StatusDot } from "../../StatusDot";
import { QueryStatus } from "../../../types";

/* ── the band's hero (PICK hdr C, the Strava-style switch) ──────────────────────────────────────────────────────── */

export const HomeHero: React.FC<{
  hero: Hero; series: HeroSeries; range: HeroRange;
  onSeries: (s: HeroSeries) => void; onRange: (r: HeroRange) => void; onOpen: () => void;
}> = ({ hero, series, range, onSeries, onRange, onOpen }) => {
  const { d, last } = sparkPath(hero.values, 320, 74, 6);
  return (
    <div className="pa-hero" data-pa="hero" data-series={series} data-range={range} data-values={hero.values.join(",")} data-change={hero.change}>
      <div className="pa-herochips" role="group" aria-label="Show">
        {HERO_SERIES.map((k) => (
          <button key={k} type="button" className="pa-herochip" aria-pressed={series === k} data-pa="hero-series" data-k={k} onClick={() => onSeries(k)}>{SERIES_LABEL[k]}</button>
        ))}
      </div>
      <button type="button" className="pa-heroopen" onClick={onOpen} data-pa="hero-open" aria-label={`${hero.value} ${SERIES_NOUN[series]}, open Queries`}>
        <span className="pa-herofig"><span className="pa-heronum" data-pa="hero-num">{hero.value}</span><span className="pa-heronoun">{SERIES_NOUN[series]}</span></span>
        <span className="pa-herochange" data-pa="hero-change">
          {hero.change > 0 ? (
            <><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#f3d2cc" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M6 10V2M2.5 5.5 6 2l3.5 3.5" /></svg><b>+{hero.change}</b></>
          ) : hero.change < 0 ? <b>−{Math.abs(hero.change)}</b> : <b>No change</b>}
          {" "}{hero.phrase}
        </span>
        {d ? (
          <svg className="pa-herospark" viewBox="0 0 320 74" preserveAspectRatio="none" aria-hidden="true" data-pa="hero-spark">
            <defs><linearGradient id="pa-hb" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".2" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient></defs>
            <path d={`${d} L320 74 L0 74Z`} fill="url(#pa-hb)" />
            <path d={d} fill="none" stroke="#fff" strokeWidth="2.2" />
            <circle cx={last[0] - 4} cy={last[1]} r="5" fill="#f3d2cc" stroke="#2a3a52" strokeWidth="2" />
          </svg>
        ) : null}
      </button>
      <div className="pa-heroranges" role="group" aria-label="Range">
        {HERO_RANGES.map((r) => (
          <button key={r} type="button" className="pa-herorange" aria-pressed={range === r} data-pa="hero-range" data-k={r} onClick={() => onRange(r)}>{r}</button>
        ))}
      </div>
    </div>
  );
};

/* ── Where they stand (PICK stats D) ────────────────────────────────────────────────────────────────────────────── */

export type StandKey = "you" | "agent" | "quiet";
const STAND: [StandKey, string, string][] = [["you", "With you", "var(--pa-blush)"], ["agent", "With the agent", "var(--pa-navy)"], ["quiet", "Gone quiet", "#c9c2b6"]];

export const WhereTheyStand: React.FC<{
  counts: Record<StandKey | "closed", number>; passed: number; noReply: number;
  onChip: (k: StandKey | "closed") => void;
}> = ({ counts, passed, noReply, onChip }) => {
  const total = counts.you + counts.agent + counts.quiet;
  return (
    <section className="pa-card pa-stand" data-pa="stand" aria-labelledby="pa-stand-h">
      <div className="pa-standhead"><h2 id="pa-stand-h" className="pa-standt">Where they stand</h2><span className="pa-sub" data-pa="stand-total">{total} active</span></div>
      <div className="pa-standbar" aria-hidden="true">
        {STAND.map(([k, , col]) => counts[k] > 0 ? <i key={k} style={{ flex: counts[k], background: col }} data-k={k} /> : null)}
      </div>
      <div className="pa-standkeys">
        {STAND.map(([k, w, col]) => (
          <button key={k} type="button" className="pa-standkey" data-pa="stand-key" data-k={k} data-count={counts[k]} onClick={() => onChip(k)}>
            <span className="pa-standfig"><i style={{ background: col }} aria-hidden="true" /><span className="pa-num">{counts[k]}</span></span>
            <span className="pa-sub">{w}</span>
          </button>
        ))}
      </div>
      {counts.closed > 0 ? (
        <button type="button" className="pa-closedline" data-pa="closed-line" data-count={counts.closed} onClick={() => onChip("closed")}>
          <StatusDot status={QueryStatus.REJECTED} overrideSize={18} decorative />
          <span className="pa-cltx"><b>{counts.closed} closed</b> · {passed} passed, {noReply} no response</span>
          <span className="pa-chev">{PI.chev}</span>
        </button>
      ) : null}
    </section>
  );
};

/* ── Up next (PICK next B) ──────────────────────────────────────────────────────────────────────────────────────── */

export const UpNextCard: React.FC<{
  loading: boolean; total: number; title: React.ReactNode | null; line: string | null; caughtUp: string;
  onView: () => void; onSeeAll: () => void; dataKey?: string;
}> = ({ loading, total, title, line, caughtUp, onView, onSeeAll, dataKey }) => (
  <section className="pa-nextc" data-pa="upnext" data-key={dataKey ?? ""}>
    <div className="pa-nh">
      <h2 className="pa-nht">Up next</h2>
      {total > 0 ? <button type="button" className="pa-link" data-pa="see-all" onClick={onSeeAll}>See all {total}<span className="pa-chev">{PI.chev}</span></button> : null}
    </div>
    <div className="pa-nb">
      <div className="pa-nbtx">
        {loading ? <div className="pa-nbt">&nbsp;</div> : title ? (
          <>
            <div className="pa-nbt" data-pa="upnext-title">{title}</div>
            {line ? <div className="pa-sub pa-nbline" data-pa="upnext-line">{line}</div> : null}
            <button type="button" className="pa-btn pri sm" data-pa="view-task" onClick={onView}>View task</button>
          </>
        ) : <div className="pa-sub" data-pa="upnext-none">{caughtUp}</div>}
      </div>
      <PhoneArt art={PHONE_ART.upNext} size={64} className="pa-spot" />
    </div>
  </section>
);

/* ── the founding writer card (ref `foundingCard`) ──────────────────────────────────────────────────────────────── */

export const FoundingCard: React.FC<{
  name: string; rank: string; progress: string | null; pct: number; loading: boolean;
  onFeedback: () => void; onHow: () => void;
}> = ({ name, rank, progress, pct, loading, onFeedback, onHow }) => (
  <section className="pa-card pa-fcard" data-pa="founding">
    <div className="pa-fstripe">
      <div className="pa-fst"><div className="pa-fname">{name}</div><div className="pa-frole">Founding writer</div></div>
      <span className="pa-fspot"><img src="/images/tier-founding.png" alt="" draggable={false} /></span>
    </div>
    <div className="pa-fbody">
      <div className="pa-frank"><span className="pa-tag pa-tag--navy" data-pa="founding-rank">{rank}</span>{progress ? <span className="pa-sub" data-pa="founding-progress">{loading ? "" : progress}</span> : null}</div>
      <div className="pa-barh" aria-hidden="true"><i style={{ width: `${Math.round(pct * 100)}%` }} /></div>
      <p className="pa-fp">Your feedback shapes QueryHawk. Tell us what works, what doesn’t, and what you’d add.</p>
      <div className="pa-fbtns">
        <button type="button" className="pa-btn sec sm" aria-label="Something I like" data-pa="fb-like" onClick={onFeedback}>{PI.thumbUp}</button>
        <button type="button" className="pa-btn sec sm" aria-label="Something I don’t like" data-pa="fb-dislike" onClick={onFeedback}>{PI.thumbDown}</button>
        <button type="button" className="pa-btn sec sm" data-pa="fb-idea" onClick={onFeedback}>{PI.bulb}An idea</button>
        <button type="button" className="pa-link pa-fhow" data-pa="fb-how" onClick={onHow}>How it works</button>
      </div>
    </div>
  </section>
);
