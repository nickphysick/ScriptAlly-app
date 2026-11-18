/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Versions v6 — the small parts (design-refs/versions-v6). The look is the Dashboard's; where the Dashboard's part is
 * page-local to another page it is COPIED here, beside this page, with its values, and listed in the report as a lift
 * candidate (this pack lifts nothing):
 *   · V6Frame     ← dashboard/v2/Frame.tsx + dash2Frame.css (`.os-card` › `.os-frame` › `.os-band`, tones sand / stone /
 *                   navy). NOT containers/FramedCard: that card's frame is rust and it has no sand tone.
 *   · V6Founding  ← packages/v41/Pk41Banner.tsx (the striped founding writer strip with "Tell us what you think"; the
 *                   Dashboard's Dash2Founding is the founding programme card and has no such button). Not dismissible:
 *                   the brief asks for the band, not Packages' dismissal leaf.
 *   · V6Notice    ← dashboard/fv2/ReminderAsk.tsx (bell, bold line, sentence, one navy button).
 *   · V6Seg       ← dashboard/v2/Dash2Active.tsx's inline Active / Sent switch (`.d22-tog`), on a light band.
 * The bands funnel draws lib/versionsV6's `funnelGeometry` (the ref's `fsvg`, style 2) in the page-local stage colours.
 */
import React from "react";
import { openFeedback } from "../../../lib/feedbackStore";
import { funnelGeometry, type FunnelCounts } from "../../../lib/versionsV6";
import type { V2Version } from "../../../lib/bookVersions";
import { Num } from "../v2Bits";

export type V6Tone = "sand" | "stone" | "navy";

export const V6Frame: React.FC<{
  tone: V6Tone; band: React.ReactNode; probe: string; label?: string; className?: string; bandClassName?: string;
  as?: "section" | "div" | "aside"; children?: React.ReactNode; id?: string;
}> = ({ tone, band, probe, label, className, bandClassName, as = "section", children, id }) => {
  const Tag = as;
  return (
    <Tag className={`v6-card${className ? ` ${className}` : ""}`} data-vv6={probe} aria-label={label} id={id}>
      <div className="v6-frame">
        <div className={`v6-band v6-tone--${tone}${bandClassName ? ` ${bandClassName}` : ""}`} data-vv6={`${probe}-band`}>{band}</div>
        {children}
      </div>
    </Tag>
  );
};

/** The founding writer band, with the brief's copy; "Tell us what you think" opens the FeedbackDock (no topic: the
 *  dock files it under the shell's page name for this route, as Packages' strip does). */
export const V6Founding: React.FC = () => (
  <aside className="v6-fb" aria-label="Founding writer note" data-vv6="founding">
    <div className="v6-fb-in">
      <span className="v6-fb-egg" aria-hidden="true"><img src="/images/founding/founding-fledgling.png" alt="" /></span>
      <span className="v6-fb-t">Founding writer</span>
      <i aria-hidden="true" />
      <p><b>Versions is a QueryHawk Pro feature.</b> You have full access as a founding writer. Use it and let us know what you think.</p>
      <button type="button" className="v6-fb-go" data-vv6="founding-ask" onClick={() => openFeedback()}>Tell us what you think</button>
    </div>
  </aside>
);

const Bell = () => (<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16V11a6 6 0 1112 0v5l2 2H4z" /><path d="M10 20a2 2 0 004 0" /></svg>);

export const V6Notice: React.FC<{ title: string; text: string; action: string; onAction: () => void; probe: string }> = ({ title, text, action, onAction, probe }) => (
  <section className="v6-notice" data-vv6={probe} aria-label={title}>
    <span className="v6-notice-bell"><Bell /></span>
    <div className="v6-notice-w"><b>{title}</b><p>{text}</p></div>
    <button type="button" className="v6-pill v6-pill--navy" data-vv6={`${probe}-go`} onClick={onAction}>{action}</button>
  </section>
);

export function V6Seg<K extends string>({ value, options, onChange, label, probe }: { value: K; options: readonly { key: K; label: string }[]; onChange: (k: K) => void; label: string; probe: string }) {
  return (
    <span className="v6-seg" role="group" aria-label={label} data-vv6={probe}>
      {options.map((o) => (
        <button key={o.key} type="button" aria-pressed={value === o.key} data-k={o.key} onClick={() => onChange(o.key)}>{o.label}</button>
      ))}
    </span>
  );
}

/** The bands funnel in a W × H viewBox, stretched to its box (the ref's preserveAspectRatio="none"); the gaps are
 *  drawn in the surface's colour (`gap`), non-scaling, 4 wide, as the ref's. */
export const BandsFunnel: React.FC<{ c: FunnelCounts; W: number; H: number; base?: number; gap: string; probe: string }> = ({ c, W, H, base, gap, probe }) => {
  const g = funnelGeometry(c, W, H, base);
  return (
    <svg className="v6-fun" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" data-vv6={probe} data-base={base ?? c.sent}
      data-counts={`${c.sent},${c.replied},${c.more},${c.full}`}
      aria-label={`Sent ${c.sent}, replied ${c.replied}, asked for more ${c.more}, asked for the full ${c.full}`}>
      {g.pieces.map((p, i) => <path key={i} d={p.d} className={`v6-fp v6-fp--${i}`} data-piece={i} data-h0={p.h0} data-h1={p.h1} />)}
      <path d={`M${g.gaps[0]} 0V${H}M${g.gaps[1]} 0V${H}`} stroke={gap} strokeWidth={4} vectorEffect="non-scaling-stroke" fill="none" />
    </svg>
  );
};

const BRANCH = (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true"><path d="M7 12h3c4 0 3-6 7-6M10 12c4 0 3 6 7 6" /><circle cx="5" cy="12" r="2" /><circle cx="19" cy="6" r="2" /><circle cx="19" cy="18" r="2" /></svg>);

/** The header's right block: one line, one button (the ref's `.vone`). */
export const MapBlock = React.forwardRef<HTMLButtonElement, { count: number; inUse: string | null; onOpen: () => void }>(({ count, inUse, onOpen }, ref) => (
  <button ref={ref} type="button" className="v6-vone" data-vv6="map-open" aria-haspopup="dialog" onClick={onOpen}>
    <span className="v6-vone-i">{BRANCH}</span>
    <span className="v6-vone-w">
      <b>Version map</b>
      <span>{count} {count === 1 ? "version" : "versions"}{inUse ? `, ${inUse} in use` : ""}</span>
      <u>Open</u>
    </span>
  </button>
));
MapBlock.displayName = "MapBlock";

/** A version's disc: the app's own numbering (v2Bits `Num`: Original's book, then the stored number), not the ref's
 *  invented 1-based one, so the page agrees with the form, the picker and every other surface that names a version. */
export const Disc: React.FC<{ v: Pick<V2Version, "original" | "num">; on?: boolean; big?: boolean }> = ({ v, on, big }) => (
  <span className={`v6-num${on ? " on" : ""}${big ? " big" : ""}`} aria-hidden="true"><Num v={v} /></span>
);

/** The "In use" tag (the ref's `.flag` / `.tag`). */
export const InUseTag: React.FC<{ stamp?: boolean }> = ({ stamp }) => <span className={`v6-flag${stamp ? " stamp" : ""}`} data-vv6="in-use-tag">In use</span>;
