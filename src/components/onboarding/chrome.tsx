/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE onboarding card — one card for the whole journey (ref: design-refs/funnel/
 * onboarding-current-grammar-v1.html).
 *
 * ⚠️ FORM 11 IS RETIRED FROM THIS JOURNEY, AND THE RENAME IS THE POINT. This file used to export
 * `Form11Card`: a parchment surface with a paper-texture data-URI, a 6px inset burgundy rim and a
 * soft-pink primary. It made the screens that introduce the app look like a different product from
 * the app itself — and a writer met three card styles in four screens on the way in (the welcome's
 * own `ModalCard`, a cream transition card, then this). The internals are replaced rather than a
 * second component added alongside, because this was already the choke point every branch screen
 * rendered through; the name changed so nothing inherits the old one's assumptions.
 *
 * ⚠️ COLOURS COME FROM `designTokens`, NEVER FROM THE MOCKUP. The ref's hexes were sampled off a
 * screenshot and drift from the live values (it carries #f8f4ee where index.css defines
 * --ws-ground #f7f4ee). The card is the app's dashboard card: same surface, same hairline, same
 * radius, same shadow.
 *
 * ⚠️ THE BAND IS THE CARD'S OWN HEADER — a real element, not an overlay and not a `::before`. It
 * is clipped by the card's own `overflow: hidden`, which is the canonical header-fill structure
 * here, so no rim overlay is needed at all.
 */
import React from "react";
import "./onboarding.css";
import {
  sageBandGradient,
  sageBandRule,
  sageText,
  onbSurface,
  onbHairline,
  onbRadius,
  onbShadow,
  onbPrimaryBg,
  onbPrimaryBgHover,
  onbPrimaryInk,
  onbPrimaryDisabledBg,
  onbPrimaryDisabledInk,
  onbPlate,
  onbMuted,
  onbHeadingInk,
} from "../../lib/designTokens";

const FONT_SERIF = "'Playfair Display', Georgia, serif";
const FONT_SANS = "'Source Sans Pro', system-ui, sans-serif";
const FONT_MONO = "'JetBrains Mono', 'Fira Mono', monospace";

/**
 * ⚠️ THE MARKS ARE MONOLINE GLYPHS, AND THAT IS A RECORDED FALLBACK, NOT A CHOICE.
 *
 * The ref draws illustrated marks on the band's plate and says so in its own markup
 * ("placeholder for the illustrated compass/desk mark"). No illustrated asset for either screen
 * exists in this repo: `manuscriptMarks.tsx` holds five inline SVGs, none of which is a
 * book-setup or an inbox mark, and `src/assets/` carries the manuscript notebook and shell brand
 * art only. Shipping the ref's own placeholders would be shipping a placeholder as a design, and
 * inventing illustrations is not a build task — so the existing monoline glyphs carry the plate
 * until the real marks arrive. The run report names the two that are missing.
 */

export const InboxMotif: React.FC = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={sageText} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    <path d="M12 3v12M7 8l5-5 5 5" />
  </svg>
);

/**
 * The chrome row above the card: a Skip-setup link.
 *
 * ⚠️ THE PROGRESS DOTS ARE GONE, AND THE `dotIndex` PROP WITH THEM. Five dots were drawn on every
 * screen while Branch A only ever passed index 1 and Branch B 1 or 2 — so the row never advanced
 * for one branch, never got past the second dot for the other, and told every writer they were
 * two steps into a five-step flow that did not exist. Where a screen genuinely knows its position,
 * the card's band states it in words instead (`step`).
 */
/* ⚠️ `OnbChrome` IS RETIRED, AND ITS PROMINENCE WAS THE DEFECT. It drew "Skip setup" at 13.5px
   above the card as the ONLY thing on the screen besides the card itself — so the loudest element
   on a writer's first minute in the product was the way out of it. The exit now lives in the
   onboarding header's right-hand slot, quiet, in mono, beside the two things that ground you: the
   wordmark and the spine. One exit, and it is no longer the headline. */

export interface OnboardingCardProps {
  /* ⚠️ NO `onSkip`. The card no longer draws an exit — the header does. A prop kept "for the
     callers' sake" and never rendered is the shape that let a whole sign-out go unreachable. */
  /** Mono eyebrow in the band — the phase of setup, not a step count. */
  pre: string;
  /** The screen's heading, in the body. */
  name: string;
  /** Supporting line beneath the heading. */
  sub: string;
  /** The mark on the band's plate. */
  motif?: React.ReactNode;
  /** An honest step marker ("Step 1 of 2") — omitted when the screen does not know its position. */
  step?: string;
  children: React.ReactNode;
  onBack?: () => void;
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
}

/** A full onboarding screen: chrome row, card (band + body), footer. */
export const OnboardingCard: React.FC<OnboardingCardProps> = ({
  pre, name, sub, motif, step, children, onBack, primaryLabel, onPrimary, primaryDisabled,
}) => {
  const [hoverPrimary, setHoverPrimary] = React.useState(false);
  return (
    <div style={{ width: "100%", maxWidth: 588, display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        className="sa-onb-card"
        style={{
          background: onbSurface,
          border: `1px solid ${onbHairline}`,
          borderRadius: onbRadius,
          boxShadow: onbShadow,
          overflow: "hidden",
        }}
      >
        {/* Band — the card's own header, clipped to the card's top corners. */}
        <div
          className="sa-onb-band"
          style={{
            background: sageBandGradient,
            borderBottom: `1px solid ${sageBandRule}`,
            padding: "14px 22px",
            display: "flex",
            alignItems: "center",
            gap: 13,
          }}
        >
          <span
            className="sa-onb-plate"
            style={{
              width: 44, height: 44, borderRadius: 11, background: onbPlate, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 1px 2px rgba(58,28,20,0.06)",
            }}
          >
            {motif}
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: ".15em", textTransform: "uppercase", color: sageText, display: "block" }}>
              {pre}
            </span>
            {step && (
              <span style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: sageText, opacity: 0.75, display: "block", marginTop: 2 }}>
                {step}
              </span>
            )}
          </span>
        </div>

        {/* Body */}
        <div className="sa-onb-body" style={{ padding: "26px 30px 12px" }}>
          <h1 style={{ fontFamily: FONT_SERIF, fontSize: 29, fontWeight: 600, color: onbHeadingInk, margin: 0, lineHeight: 1.2, letterSpacing: "-0.01em" }}>
            {name}
          </h1>
          <p style={{ fontFamily: FONT_SANS, fontSize: 15.5, color: onbMuted, margin: "8px 0 22px", lineHeight: 1.55, maxWidth: "46ch" }}>
            {sub}
          </p>
          {children}
        </div>

        {/* Footer — ghost Back, spacer, near-black primary. Never pink, never burgundy. */}
        <div className="sa-onb-foot" style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 30px 22px", marginTop: 6 }}>
          {onBack ? (
            <button
              onClick={onBack}
              style={{
                background: "none", border: 0, color: onbMuted, fontFamily: FONT_MONO,
                fontSize: 10.5, letterSpacing: ".09em", textTransform: "uppercase", cursor: "pointer", padding: 0,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = onbHeadingInk)}
              onMouseLeave={(e) => (e.currentTarget.style.color = onbMuted)}
            >
              ‹ Back
            </button>
          ) : (
            <span />
          )}
          <span style={{ flex: 1 }} />
          <button
            onClick={onPrimary}
            disabled={primaryDisabled}
            onMouseEnter={() => setHoverPrimary(true)}
            onMouseLeave={() => setHoverPrimary(false)}
            style={{
              background: primaryDisabled ? onbPrimaryDisabledBg : hoverPrimary ? onbPrimaryBgHover : onbPrimaryBg,
              color: primaryDisabled ? onbPrimaryDisabledInk : onbPrimaryInk,
              border: 0, borderRadius: 11, padding: "12px 22px",
              cursor: primaryDisabled ? "not-allowed" : "pointer",
              fontFamily: FONT_MONO, fontSize: 10.5, letterSpacing: ".09em", textTransform: "uppercase",
              transition: "background .16s", whiteSpace: "nowrap",
            }}
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ⚠️ `SelectRow` AND `BookMotif` ARE DELETED (onboarding v5, part 1). Every option row in the
   journey is `OptionRow` (setupParts.tsx) now, and no set-up step draws a motif. What is left in
   this file — `OnboardingCard`, `InboxMotif` and the three faces — has exactly one reader, the
   handover screen, which part 2 restyles; they go with it. */

export { FONT_SERIF, FONT_SANS, FONT_MONO };
