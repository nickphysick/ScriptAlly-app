/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v4 — THE SYSTEM'S PIECES (design-refs/phone-app-v4/): the navy header with its cast member, the one filled
 * button, the text link, the seal, the stamp, the journey track and the ring. Every screen is built from these, so the
 * one-button rule and the type sizes live in one place (PA4-1, PA4-2).
 *
 * ⚠️ THE CAST HAVE FIXED JOBS (baked decision 4): the Mentor on Today, the Courier on Queries and the logged screen,
 *    the Scout on Agents and Discover, the Archivist on You and List health, the spectacled head on the Birds-eye view.
 *    No art on the query page.
 */
import React from "react";
import { V3Glyph } from "../v3/V3Parts";
import type { TrackCounts } from "../../../lib/phoneV4";
import "./phoneV4.css";

/** the app's own art files, by the names the boards were built from */
export const CAST = {
  mentor: "/images/dash/mentor-leaning.png",
  courier: "/images/active-query-hawk.png",
  scout: "/images/binocular-hawk.webp",
  archivist: "/images/contact-list-archivist.webp",
  shadow: "/images/hawk-shadow.png",
  beHead: "/images/qc/be-hawk-head.png",
} as const;
export const RANK_HEADS = ["fledgling", "archivist", "scout", "mentor", "queryhawk"].map((k) => `/images/founding/tiers/${k}-head.png`);

const PATHS = {
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14M16.5 16.5L21 21",
  chev: "M9 6l6 6-6 6",
  back: "M15 6l-6 6 6 6",
  x: "M6 6l12 12M18 6L6 18",
  plus: "M12 5v14M5 12h14",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 21a8 8 0 0 1 16 0",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 7v5l3 2",
  check: "M5 12.5l4.5 4.5L19 7.5",
  today: "M4 6l1.5 1.5L8 5M4 12l1.5 1.5L8 11M4 18l1.5 1.5L8 17M11.5 6H20M11.5 12H20M11.5 18H20",
  queries: "M21 3L3 10.5l7 2.5 2.5 7zM10 13L21 3",
  agents: "M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20M9.5 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M21 20v-1.5a4 4 0 0 0-3-3.85M15.5 3.65a3.5 3.5 0 0 1 0 6.7",
} as const;
export type V4IconName = keyof typeof PATHS;
export const I4: React.FC<{ n: V4IconName; className?: string; style?: React.CSSProperties }> = ({ n, className = "pa4-ic", style }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" aria-hidden="true"><path d={PATHS[n]} /></svg>
);
export const Chev: React.FC = () => <I4 n="chev" className="pa4-ic pa4-chev" />;
export const Check: React.FC = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d={PATHS.check} /></svg>;

/* ── the one filled button and the text link ── */
export const Cta: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { pa4?: string }> = ({ pa4, className, children, ...p }) => (
  <button type="button" className={`pa4-cta${className ? ` ${className}` : ""}`} data-pa4={pa4 ?? "cta"} data-cta="1" {...p}>{children}</button>
);
export const Link4: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { pa4?: string; sb?: boolean; rule?: boolean }> = ({ pa4, sb, rule, className, children, ...p }) => (
  <button type="button" className={`pa4-link${sb ? " sb" : ""}${rule ? " rule" : ""}${className ? ` ${className}` : ""}`} data-pa4={pa4 ?? "link"} {...p}>
    {sb ? <><span>{children}</span><Chev /></> : children}
  </button>
);
export const IconBtn: React.FC<{ label: string; n: V4IconName; onClick: () => void; pa4?: string }> = ({ label, n, onClick, pa4 }) => (
  <button type="button" className="pa4-ib" aria-label={label} data-pa4={pa4} onClick={onClick}><I4 n={n} /></button>
);

/* ── the header ── */
export interface HeroProps {
  /** the small page line above the headline */
  kick: React.ReactNode;
  /** the live sentence */
  head: React.ReactNode;
  sub?: React.ReactNode;
  /** the date row (Today) */
  top?: React.ReactNode;
  /** the round button at the top-right corner */
  corner?: React.ReactNode;
  cast?: { src: string; width: number; style?: React.CSSProperties };
  after?: React.ReactNode;
  /** the first card overlaps the header */
  lap?: boolean;
  pa4: string;
  minHead?: number;
}
export const Hero: React.FC<HeroProps> = ({ kick, head, sub, top, corner, cast, after, lap, pa4, minHead }) => (
  <header className={`pa4-hero${lap ? " lap" : ""}`} data-pa4={pa4}>
    <img className="pa4-shadow" src={CAST.shadow} alt="" />
    {top ? <div className="pa4-top">{top}</div> : null}
    <div className="pa4-head" style={minHead ? { minHeight: minHead } : undefined}>
      <div>
        <div className="pa4-s pa4-kick" data-pa4="kick">{kick}</div>
        <h1 className="pa4-d2 pa4-hl" data-pa4="headline">{head}</h1>
        {sub ? <div className="pa4-s pa4-sub">{sub}</div> : null}
      </div>
      {cast ? <img className="pa4-cast" data-pa4="cast" src={cast.src} alt="" style={{ width: cast.width, ...cast.style }} /> : null}
      {corner ? <div className="pa4-corner">{corner}</div> : null}
    </div>
    {after ? <div className="pa4-after">{after}</div> : null}
  </header>
);

/** the first card, overlapping the header */
export const LapCard: React.FC<{ pa4: string; children: React.ReactNode; style?: React.CSSProperties }> = ({ pa4, children, style }) => (
  <div className="pa4-inset"><div className="pa4-card pa4-lapcard" data-pa4={pa4} style={style}>{children}</div></div>
);

/* ── the seal: initials with the StatusDot badge ── */
export const initials = (n: string): string => {
  const w = (n || "").trim().split(/\s+/).filter(Boolean);
  return w.length ? w.slice(0, 2).map((x) => x[0]).join("").toUpperCase() : "?";
};
export const Seal: React.FC<{ name: string; size?: number; dark?: boolean; status?: string | null; children?: React.ReactNode }> = ({ name, size = 48, dark, status, children }) => (
  <span className={`pa4-seal${dark ? " dk" : ""}`} style={{ width: size, height: size }} aria-hidden="true">
    {children ?? initials(name)}
    {status ? <V3Glyph status={status} size={Math.round(size * 0.46)} label={false} /> : null}
  </span>
);

/* ── the postmark stamp ── */
export const Stamp: React.FC<{ word: string; date: string; style?: React.CSSProperties }> = ({ word, date, style }) => (
  <div className="pa4-stamp" data-pa4="stamp" role="img" aria-label={`${word} ${date}`} style={style}><b>{word}</b><span>{date}</span></div>
);

/* ── the four-stage journey track ── */
export const JourneyTrack: React.FC<{ c: TrackCounts; empty?: boolean }> = ({ c, empty }) => (
  <div data-pa4="track">
    <div className="pa4-jr" aria-hidden="true">
      {[0, 1, 2, 3].map((k) => (
        <React.Fragment key={k}>
          {k ? <u className={empty ? "e" : ""} /> : null}
          <i className={empty ? "e" : k === 3 ? "end" : ""} />
        </React.Fragment>
      ))}
    </div>
    <div className="pa4-jl">
      {([["queried", c.queried], ["asked for more", c.requested], ["full", c.full], ["offer", c.offer]] as const).map(([l, n]) => (
        <span key={l} data-pa4="track-n" data-k={l}><b>{n}</b>{l}</span>
      ))}
    </div>
  </div>
);

/* ── the ring: three arcs over the live queries ── */
export const Ring: React.FC<{ parts: { n: number; colour: string }[]; label: string; total: number }> = ({ parts, label, total }) => {
  const C = 2 * Math.PI * 32;
  const sum = parts.reduce((s, p) => s + p.n, 0) || 1;
  const gap = parts.filter((p) => p.n > 0).length > 1 ? 2.4 : 0;
  let at = 0;
  return (
    <span className="pa4-ringw" role="img" aria-label={label} data-pa4="ring">
      <svg className="r" viewBox="0 0 80 80" aria-hidden="true">
        <g transform="rotate(-90 40 40)" fill="none" strokeWidth="10">
          {parts.map((p, k) => {
            const len = (p.n / sum) * C;
            const el = p.n > 0 ? <circle key={k} className="arc" cx="40" cy="40" r="32" stroke={p.colour} strokeDasharray={`${Math.max(0, len - gap)} ${C}`} strokeDashoffset={-at} /> : null;
            at += len;
            return el;
          })}
        </g>
      </svg>
      {/* the figure is HTML over the ring, so its type is the system's (an SVG text size is not the page's) */}
      <span className="pa4-ringn" aria-hidden="true"><b>{total}</b><span>live</span></span>
    </span>
  );
};
