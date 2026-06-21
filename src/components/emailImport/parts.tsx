/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Email-import — shared PURE view pieces (no db, no callable): the Pro chip, the uniform band
 * header (rule + title + emblem, the same band PlansPage/SubmissionPackages use via MountPanel),
 * the reusable entry-button visual, and the non-Pro upsell explainer. All presentational so they
 * render in a throwaway harness and in the dev preview without a DbProvider.
 */
import React from "react";
import { Mail, Lock, ArrowRight, Sparkles } from "lucide-react";
import { MountPanel } from "../MountPanel";
import {
  burgundy,
  headingInk,
  mutedInk,
  sageText,
  bodyInk,
  sageBandGradient,
  sageBandRule,
  buttonPinkBg,
  buttonPinkBorder,
  FONT_SERIF,
  FONT_SANS,
  FONT_MONO,
} from "../../lib/designTokens";

/* Amber "PRO" chip — mirrors the mockup's .pro-chip. */
export const ProChip: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <span
    style={{
      fontFamily: FONT_MONO,
      fontSize: 9,
      fontWeight: 500,
      letterSpacing: "0.12em",
      color: "#8a5a1e",
      background: "#f3e3c8",
      border: "0.5px solid #e2c98f",
      borderRadius: 5,
      padding: "2px 7px",
      ...style,
    }}
  >
    PRO
  </span>
);

/* Uniform panel header band: burgundy rule + Playfair title (+ optional Pro chip) + mono meta +
 * far-right emblem. Lives inside a MountPanel frame so its fill clips to the inset corners. */
export const EmailBandHeader: React.FC<{
  title: string;
  meta?: string;
  Emblem: React.ComponentType<any>;
  pro?: boolean;
}> = ({ title, meta, Emblem, pro }) => (
  <div
    style={{
      padding: "14px 18px",
      background: sageBandGradient,
      borderBottom: `1px solid ${sageBandRule}`,
      display: "flex",
      alignItems: "center",
      gap: 13,
    }}
  >
    <span aria-hidden="true" style={{ width: 3, alignSelf: "stretch", minHeight: 34, background: burgundy, borderRadius: 2, flexShrink: 0, display: "inline-block" }} />
    <span style={{ flex: 1, minWidth: 0 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
        <span style={{ fontFamily: FONT_SERIF, fontSize: 18, fontWeight: 500, color: headingInk, lineHeight: 1.15 }}>{title}</span>
        {pro && <ProChip />}
      </span>
      {meta && (
        <span style={{ display: "block", fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.06em", color: sageText, marginTop: 3 }}>{meta}</span>
      )}
    </span>
    <Emblem style={{ width: 22, height: 22, color: burgundy, opacity: 0.85, flexShrink: 0 }} strokeWidth={1.7} aria-hidden="true" />
  </div>
);

/* ── Reusable entry-button VISUAL (pure). `locked` (non-Pro) adds a small lock; the click handler
 *    decides what happens (open the flow, or the upsell) — the visual is the same Pro-badged button. ── */
export const EntryButtonView: React.FC<{ locked?: boolean; onClick?: () => void; style?: React.CSSProperties }> = ({
  locked,
  onClick,
  style,
}) => (
  <button
    type="button"
    onClick={onClick}
    className="cursor-pointer"
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 9,
      fontFamily: FONT_MONO,
      fontSize: 11,
      fontWeight: 500,
      letterSpacing: "0.07em",
      textTransform: "uppercase",
      color: burgundy,
      background: buttonPinkBg,
      border: `0.5px solid ${buttonPinkBorder}`,
      borderRadius: 10,
      padding: "11px 18px",
      transition: "background .15s, border-color .15s",
      ...style,
    }}
    onMouseEnter={(e) => { e.currentTarget.style.background = "#efd5ca"; e.currentTarget.style.borderColor = "#d8a89a"; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = buttonPinkBg; e.currentTarget.style.borderColor = buttonPinkBorder; }}
  >
    {locked ? <Lock size={14} strokeWidth={2} aria-hidden="true" /> : <Mail size={15} strokeWidth={1.9} aria-hidden="true" />}
    Paste email
    <ProChip style={{ marginLeft: 2 }} />
  </button>
);

/* ── Non-Pro upsell explainer (pure). Sells by showing value + a picture-in-spirit of the review;
 *    two soft actions. It NEVER calls the function. ── */
export const UpsellExplainer: React.FC<{ onSeeHow?: () => void; onUpgrade?: () => void }> = ({ onSeeHow, onUpgrade }) => (
  <MountPanel style={{ width: "100%" }}>
    <EmailBandHeader title="Import from email" meta="A faster way to log — on Pro" Emblem={Mail} pro />
    <div style={{ padding: "18px 20px 20px" }}>
      <p style={{ fontFamily: FONT_SANS, fontSize: 13.5, color: bodyInk, lineHeight: 1.55, margin: 0 }}>
        Paste an agent's email and ScriptAlly reads it into your log for you — matched to the right
        agent, with the request and its date already filled in. You just glance over it and confirm.
      </p>

      {/* picture-in-spirit: a calm mini-preview of what the review produces */}
      <div style={{ marginTop: 14, padding: "12px 14px", borderRadius: 11, background: "#f4f1ea", border: "0.5px solid #e3ddcf" }}>
        <div style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: sageText, marginBottom: 7 }}>
          What you'd see
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#8a9e88", flexShrink: 0 }} aria-hidden="true" />
          <span style={{ fontFamily: FONT_SERIF, fontSize: 14.5, color: headingInk }}>Full Requested</span>
          <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: "#7a6a5a", background: "#f1ece4", borderRadius: 5, padding: "2px 7px" }}>15 Jun 2026</span>
        </div>
        <div style={{ fontFamily: "'Caveat', cursive", fontSize: 15, color: mutedInk, marginTop: 5 }}>
          “I'd be delighted to see the full manuscript”
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18 }}>
        <button
          type="button"
          onClick={onUpgrade}
          className="cursor-pointer"
          style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: FONT_MONO, fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: burgundy, background: buttonPinkBg, border: `0.5px solid ${buttonPinkBorder}`, borderRadius: 10, padding: "11px 18px" }}
        >
          <Sparkles size={14} strokeWidth={2} aria-hidden="true" /> Upgrade
        </button>
        <button
          type="button"
          onClick={onSeeHow}
          className="cursor-pointer"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.06em", color: sageText, background: "transparent", border: "none", padding: "6px 4px" }}
        >
          See how it works <ArrowRight size={13} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
    </div>
  </MountPanel>
);
