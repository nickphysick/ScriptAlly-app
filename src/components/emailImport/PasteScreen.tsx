/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Paste screen — PURE presentational card (state lifted to PasteEmailFlow). MountPanel + the
 * uniform band header, a textarea, the Received/Sent SegmentedToggle, the manuscript BrandDropdown
 * (its menu is position:fixed via useFixedMenu, so it escapes the card's clip), a privacy line, and
 * the primary "Read this email" button. Reused form components only — no native select/textarea idiom.
 */
import React from "react";
import { Mail, ArrowRight, ShieldCheck } from "lucide-react";
import { MountPanel } from "../MountPanel";
import { BrandDropdown, SegmentedToggle } from "../forms";
import { EmailBandHeader } from "./parts";
import type { EmailDirection } from "../../lib/emailImport";
import {
  burgundy,
  bodyInk,
  sageText,
  buttonPinkBg,
  buttonPinkBorder,
  FONT_SANS,
  FONT_MONO,
} from "../../lib/designTokens";

const fieldLabel: React.CSSProperties = {
  fontFamily: FONT_MONO,
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: "0.07em",
  color: "#9c8878",
  marginBottom: 6,
  display: "block",
};

export interface PasteScreenProps {
  manuscripts: { id: string; title: string }[];
  manuscriptId: string;
  onManuscriptChange: (id: string) => void;
  direction: EmailDirection;
  onDirectionChange: (d: EmailDirection) => void;
  emailText: string;
  onEmailTextChange: (t: string) => void;
  busy?: boolean;
  error?: string | null;
  onSubmit: () => void;
  onClose?: () => void;
}

export const PasteScreen: React.FC<PasteScreenProps> = ({
  manuscripts,
  manuscriptId,
  onManuscriptChange,
  direction,
  onDirectionChange,
  emailText,
  onEmailTextChange,
  busy,
  error,
  onSubmit,
  onClose,
}) => {
  const manuscriptOptions = manuscripts.map((m) => ({ value: m.id, label: m.title }));

  return (
    <MountPanel style={{ width: "100%" }}>
      <EmailBandHeader title="Import from email" meta="Drop in an email — I'll work out what to log" Emblem={Mail} pro />
      <div style={{ padding: "18px 18px 18px" }}>
        <label style={fieldLabel}>The email</label>
        <textarea
          value={emailText}
          spellCheck={false}
          onChange={(e) => onEmailTextChange(e.target.value)}
          placeholder="Paste the agent's email here…"
          style={{
            width: "100%",
            minHeight: 168,
            background: "#ffffff",
            border: "0.5px solid #e0d5c8",
            borderRadius: 10,
            padding: "13px 15px",
            fontFamily: FONT_SANS,
            fontSize: 13,
            lineHeight: 1.55,
            color: bodyInk,
            outline: "none",
            resize: "vertical",
            boxShadow: "inset 0 1px 2px rgba(58,28,20,0.03)",
          }}
        />

        <div style={{ marginTop: 16 }}>
          <label style={fieldLabel}>This email was</label>
          <SegmentedToggle<EmailDirection>
            value={direction}
            onChange={onDirectionChange}
            ariaLabel="Did you receive or send this email?"
            options={[
              { value: "received", label: "Received" },
              { value: "sent", label: "Sent" },
            ]}
          />
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={fieldLabel}>About this manuscript</label>
          <BrandDropdown
            value={manuscriptId}
            options={manuscriptOptions}
            onChange={onManuscriptChange}
            placeholder="Select a manuscript"
          />
        </div>

        {/* honest, one-line privacy note */}
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", margin: "16px 0 4px", padding: "10px 12px", background: "#eef1ea", borderRadius: 9, border: "0.5px solid #d8dfd2" }}>
          <ShieldCheck size={15} strokeWidth={1.8} style={{ color: sageText, flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
          <span style={{ fontFamily: FONT_SANS, fontSize: 11.5, lineHeight: 1.5, color: sageText }}>
            Read once to pull out records, never stored. Nothing is saved until you approve it on the next screen.
          </span>
        </div>

        {error && (
          <div style={{ fontFamily: FONT_SANS, fontSize: 12.5, color: "#a14434", margin: "10px 2px 0" }}>{error}</div>
        )}

        <button
          type="button"
          onClick={onSubmit}
          disabled={busy}
          className="cursor-pointer"
          style={{
            marginTop: 16,
            width: "100%",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            fontFamily: FONT_MONO,
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            color: burgundy,
            background: buttonPinkBg,
            border: `0.5px solid ${buttonPinkBorder}`,
            borderRadius: 10,
            padding: "12px 0",
            opacity: busy ? 0.6 : 1,
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          {busy ? "Reading…" : "Read this email"}
          {!busy && <ArrowRight size={14} strokeWidth={2.2} aria-hidden="true" />}
        </button>

        {onClose && (
          <div style={{ textAlign: "center", marginTop: 10 }}>
            <button type="button" onClick={onClose} className="cursor-pointer" style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.06em", color: "#a07868", background: "transparent", border: "none" }}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </MountPanel>
  );
};
