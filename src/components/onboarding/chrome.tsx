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
  onbOptionSelectedFill,
  onbOptionRest,
  onbOptionEdge,
  onbFaint,
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
export const BookMotif: React.FC = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={sageText} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 6c-1.6-1-4.2-1.6-6.3-1.6-.9 0-1.7.1-1.7.1v13s.8-.1 1.7-.1c2.1 0 4.7.6 6.3 1.6 1.6-1 4.2-1.6 6.3-1.6.9 0 1.7.1 1.7.1v-13s-.8-.1-1.7-.1c-2.1 0-4.7.6-6.3 1.6z" />
    <path d="M12 6v13" />
  </svg>
);

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
export const OnbChrome: React.FC<{ onSkip: () => void }> = ({ onSkip }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "0 4px" }}>
    <button
      onClick={onSkip}
      style={{
        fontFamily: FONT_SANS, fontSize: 13.5, color: onbFaint, background: "none", border: "none",
        cursor: "pointer", padding: 0, textDecoration: "underline", textUnderlineOffset: 3,
        transition: "color 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = onbMuted)}
      onMouseLeave={(e) => (e.currentTarget.style.color = onbFaint)}
    >
      Skip setup
    </button>
  </div>
);

export interface OnboardingCardProps {
  onSkip: () => void;
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
  onSkip, pre, name, sub, motif, step, children, onBack, primaryLabel, onPrimary, primaryDisabled,
}) => {
  const [hoverPrimary, setHoverPrimary] = React.useState(false);
  return (
    <div style={{ width: "100%", maxWidth: 588, display: "flex", flexDirection: "column", gap: 12 }}>
      <OnbChrome onSkip={onSkip} />
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

export interface SelectRowProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
  selected: boolean;
  onClick: () => void;
}

/**
 * A selectable option row.
 *
 * ⚠️ SELECTION IS SAGE, AND THE RING IS THE MARKER. The old row filled soft pink with a burgundy
 * border — the treatment the app reserves for a surface asking something of you, which is the
 * opposite of what a chosen option means.
 */
export const SelectRow: React.FC<SelectRowProps> = ({ icon, title, desc, selected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={selected}
    style={{
      display: "flex", gap: 13, alignItems: "flex-start", width: "100%", textAlign: "left",
      background: selected ? onbOptionSelectedFill : onbOptionRest,
      border: `1px solid ${selected ? sageText : onbOptionEdge}`,
      borderRadius: 12, padding: "14px 15px", cursor: "pointer", marginBottom: 9,
      transition: "border-color .16s, background .16s", fontFamily: FONT_SANS,
    }}
    onMouseEnter={(e) => { if (!selected) e.currentTarget.style.borderColor = "#d8cbbc"; }}
    onMouseLeave={(e) => { if (!selected) e.currentTarget.style.borderColor = onbOptionEdge; }}
  >
    <span
      style={{
        width: 17, height: 17, borderRadius: "50%", flex: "0 0 auto", marginTop: 3,
        border: `1.5px solid ${selected ? sageText : "#cabcae"}`,
        background: selected ? sageText : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      {selected && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      )}
    </span>
    <span style={{ minWidth: 0 }}>
      <span style={{ fontWeight: 600, display: "block", lineHeight: 1.3, fontSize: 14.5, color: onbHeadingInk }}>{title}</span>
      <span style={{ color: onbMuted, fontSize: 13.5, display: "block", marginTop: 1, lineHeight: 1.4 }}>{desc}</span>
    </span>
    <span style={{ flex: 1 }} />
    <span aria-hidden="true" style={{ flexShrink: 0, marginTop: 1, color: sageText, opacity: 0.85 }}>{icon}</span>
  </button>
);

export { FONT_SERIF, FONT_SANS, FONT_MONO };
