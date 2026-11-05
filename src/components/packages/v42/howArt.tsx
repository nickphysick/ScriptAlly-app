/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v42 Part G — the four drawings of How it works (the ref's `IGB`, graphics style D): line-drawn
 * paper objects, ink strokes on cream, one soft accent each. PLACEHOLDERS: Nick may replace them with illustrator art,
 * so each is its own component and the dialog only places them. Every piece that settles in carries `p42-hp` and its
 * own `--d` (seconds after the dialog opens), so it settles after its station appears.
 */
import React from "react";

const Svg: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg className="p42-hw-svg" viewBox="0 0 170 130" width="170" height="130" fill="none" stroke="#1c130f" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
const P: React.FC<{ d: number; children: React.ReactNode }> = ({ d, children }) => <g className="p42-hp" style={{ ["--d" as string]: `${d}s` }}>{children}</g>;

/** 1 · Choose what goes in: pages being stacked (the version, the letter, a dashed synopsis). */
export const HowArtPages: React.FC = () => (
  <Svg>
    <P d={0.9}><g transform="rotate(-8 60 70)"><rect x="30" y="18" width="62" height="84" rx="3" fill="#fffaf3" /><path d="M40 40h40M40 50h40M40 60h34M40 70h40M40 80h28" /><circle cx="44" cy="28" r="7" fill="#2d3a50" stroke="#2d3a50" /><text className="p42-hw-tn" x="44" y="31.5" fontSize="9" fill="#fff" stroke="none" textAnchor="middle" fontWeight="600">1</text></g></P>
    <P d={1.6}><g transform="rotate(3 95 70)"><rect x="62" y="22" width="62" height="84" rx="3" fill="#fff" /><path d="M72 34h22M72 46h42M72 54h42M72 62h42M72 70h30" /><path d="M98 86l10 6 10-6" stroke="#9b4a57" /></g></P>
    <P d={2.3}><g transform="rotate(10 130 75)"><rect x="96" y="30" width="58" height="80" rx="3" fill="#fffaf3" strokeDasharray="4 4" /><path d="M106 48h36M106 58h36M106 68h24" strokeOpacity=".5" /></g></P>
  </Svg>
);

/** 2 · Give it a name: a parcel with its name tag ("US"). */
export const HowArtTag: React.FC = () => (
  <Svg>
    <P d={4.5}>
      <path d="M40 52l45-18 45 18v50l-45 18-45-18z" fill="#f0e2cf" /><path d="M40 52l45 18 45-18M85 70v50" /><path d="M62 43l45 18v14" stroke="#9b4a57" strokeWidth="2.2" />
      <path d="M108 75c8 4 14 10 16 18" stroke="#1c130f" strokeWidth="1.2" />
      <g transform="rotate(14 132 104)"><path d="M118 94h30l6 10-6 10h-30z" fill="#fff" /><circle cx="124" cy="104" r="2.2" /><text className="p42-hw-tx" x="138" y="107.5" fontSize="8.5" stroke="none" fill="#1c130f" textAnchor="middle">US</text></g>
    </P>
  </Svg>
);

/** 3 · Send it with a query: an envelope going out, then the lock that keeps what went. */
export const HowArtEnvelope: React.FC = () => (
  <Svg>
    <P d={7.1}><rect x="26" y="32" width="118" height="76" rx="5" fill="#fff" /><path d="M28 36l57 40 57-40" /><rect x="112" y="40" width="22" height="26" rx="2" fill="#f7e3e3" stroke="#9b4a57" /><path d="M117 47h12M117 53h12M117 59h8" stroke="#9b4a57" strokeWidth="1.2" /><path d="M40 96h40M40 88h30" strokeOpacity=".45" /></P>
    <P d={8.3}><circle cx="85" cy="78" r="12" fill="#2d3a50" stroke="#2d3a50" /><rect x="80" y="77" width="10" height="8" rx="1.5" stroke="#fff" strokeWidth="1.4" /><path d="M82 77v-3a3 3 0 0 1 6 0v3" stroke="#fff" strokeWidth="1.4" /></P>
  </Svg>
);

/** 4 · See what's working: a small bar chart rising, the first bar marked. */
export const HowArtChart: React.FC = () => (
  <Svg>
    <path d="M28 110h120" />
    <P d={10.5}><rect className="p42-hp-bar" x="42" y="50" width="24" height="60" rx="2" fill="#2d3a50" stroke="#2d3a50" /></P>
    <P d={10.8}><rect className="p42-hp-bar" x="76" y="74" width="24" height="36" rx="2" fill="#8592a8" stroke="#8592a8" /></P>
    <P d={11.1}><rect className="p42-hp-bar" x="110" y="96" width="24" height="14" rx="2" fill="#fff" strokeDasharray="3 3" /></P>
    <P d={11.6}><path d="M54 40l-8 0 8-14 8 14z" fill="#f0c7a6" stroke="none" /><text className="p42-hw-tx" x="54" y="22" fontSize="11" stroke="none" fill="#1c130f" textAnchor="middle">40%</text></P>
  </Svg>
);

export const HOW_ART: readonly React.FC[] = [HowArtPages, HowArtTag, HowArtEnvelope, HowArtChart];
