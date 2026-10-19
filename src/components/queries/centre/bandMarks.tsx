/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v139 §C / v140 §A — A GROUP'S MARK, ONE DRAWER FOR THE BAND AND THE JUMP ROW. The band draws it in its
 * art slot; the toolbar's jump row draws the same mark small, so a jump button and the band it jumps to cannot show two
 * different marks (QC140 A2).
 *
 *   Who it's with  the talon (Your move), the hourglass (Waiting) — the art; the archive box (Closed) — an icon
 *   Status         the stage glyph (requested stages keep the dashed ring); closed ones grey
 *   Next action    the stage glyph and its badge (★ ↗ ! × clock …)
 *   Package        the package cube, lavender
 */
import React from "react";
import type { BandArt, BandBadge, BandTone } from "../../../lib/qcBandArt";
import { StageGlyph } from "./StageGlyph";

export const PKG_ICON = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d="M3 8l9-4 9 4-9 4z" /><path d="M3 8v8l9 4 9-4V8" /><path d="M12 12v8" /></svg>;

export const TONE_ICON: Record<BandTone, React.ReactNode> = {
  you: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.5 2.5l3 3-7.5 7.5H3v-3z" /><path d="M9 4l3 3" /></svg>,
  waiting: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2h8M4 14h8M5 2c0 4 6 4 6 6s-6 2-6 6M11 2c0 4-6 4-6 6s6 2 6 6" /></svg>,
  closed: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"><rect x="2" y="3" width="12" height="3" rx="1" /><path d="M3 6v7h10V6M6.5 9h3" /></svg>,
};
/**
 * v138.3 §F — the group art: the pointing talon for Your move, the hawk-and-hourglass for Waiting, breaking out of the
 * band. Served as WebP at 2× (the PNGs beside them are the source). Decorative: the band's title carries the meaning.
 */
export const TONE_ART: Partial<Record<BandTone, { src: string; w: number; h: number }>> = {
  you: { src: "/images/query-centre/your-move-talon.webp", w: 46, h: 64 },
  waiting: { src: "/images/query-centre/waiting-hourglass.webp", w: 54, h: 55.5 },
};

export const BADGE_ICON: Record<BandBadge, React.ReactNode> = {
  star: <svg viewBox="0 0 12 12"><path d="M6 1.4l1.35 2.9 3.1.35-2.3 2.1.65 3.1L6 8.3 3.2 9.85l.65-3.1-2.3-2.1 3.1-.35z" fill="currentColor" /></svg>,
  send: <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 8.5l5-5M4.5 3.5h4v4" /></svg>,
  bang: <svg viewBox="0 0 12 12" fill="currentColor"><rect x="5.15" y="2.2" width="1.7" height="5" rx=".85" /><circle cx="6" cy="9.3" r="1" /></svg>,
  x: <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M3.8 3.8l4.4 4.4M8.2 3.8l-4.4 4.4" /></svg>,
  clock: <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><circle cx="6" cy="6" r="3.8" /><path d="M6 3.9V6l1.4.9" /></svg>,
  dots: <svg viewBox="0 0 12 12" fill="currentColor"><circle cx="3.2" cy="6" r="1.05" /><circle cx="6" cy="6" r="1.05" /><circle cx="8.8" cy="6" r="1.05" /></svg>,
};

/** v139 §C — a band's own mark: the stage glyph in a white disc (a badge for a next action), or the package cube */
export const BandMark: React.FC<{ art: BandArt }> = ({ art }) => art.kind === "package" ? (
  <span className={`qc138-gart qc139-gart qc139-gart--pkg${art.none ? " none" : ""}`} data-qc139="band-art" data-kind="package" aria-hidden="true">{PKG_ICON}</span>
) : (
  <span className={`qc138-gart qc139-gart qc139-gart--glyph${art.grey ? " grey" : ""}`} data-qc139="band-art" data-kind="glyph" data-glyph={art.glyph} aria-hidden="true">
    <StageGlyph k={art.glyph} className="qc139-gsvg" />
    {art.badge ? <i className={`qc139-badge badge ${art.badgeTone ?? "navy"}`} data-qc139="badge" data-badge={art.badge}>{BADGE_ICON[art.badge]}</i> : null}
  </span>
);

/**
 * v140 §A — THE SAME MARK, SMALL, FOR THE JUMP ROW: the glyph (16 in a 17 box) with its badge (11 across, top right);
 * the package cube; under Who it's with the group's art in a 22px cream disc (the Closed box an icon). `data-glyph` and
 * `data-badge` are the band's own, so a lock can compare the two.
 */
export const JumpMark: React.FC<{ art: BandArt | null; tone: BandTone }> = ({ art, tone }) => {
  if (!art) {
    const a = TONE_ART[tone];
    return a ? (
      <span className="qc140-jg qc140-jg--art" data-qc140="jump-mark" data-kind="art" data-tone={tone} aria-hidden="true">
        <img src={a.src} alt="" draggable={false} />
      </span>
    ) : (
      <span className="qc140-jg qc140-jg--icon" data-qc140="jump-mark" data-kind="icon" data-tone={tone} aria-hidden="true">{TONE_ICON[tone]}</span>
    );
  }
  if (art.kind === "package") {
    return <span className={`qc140-jg qc140-jg--pkg${art.none ? " none" : ""}`} data-qc140="jump-mark" data-kind="package" aria-hidden="true">{PKG_ICON}</span>;
  }
  return (
    <span className={`qc140-jg qc140-jg--glyph${art.grey ? " grey" : ""}`} data-qc140="jump-mark" data-kind="glyph" data-glyph={art.glyph} data-badge={art.badge ?? undefined} aria-hidden="true">
      <StageGlyph k={art.glyph} className="qc140-jsvg" />
      {art.badge ? <i className={`qc140-jbd ${art.badgeTone ?? "navy"}`}>{BADGE_ICON[art.badge]}</i> : null}
    </span>
  );
};
