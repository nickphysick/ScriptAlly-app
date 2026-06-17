/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Email-import REVIEW — a pure component that renders an EmailProposal. No db, no callable, no
 * writes: it shows the subject, the proposed records (each with the real StatusDot, the date or an
 * amber provisional chip, the Caveat source quote, and an Add/Skip toggle), and an honest "didn't
 * place" section. The footer's "Add N records" CTA is PRESENT BUT DISABLED — the commit/write step
 * is the next prompt. Accept/skip state is local; `N` counts the accepted (non-skipped) records.
 */
import React, { useState } from "react";
import { ShieldCheck, Check, CalendarClock, Plus } from "lucide-react";
import { MountPanel } from "../MountPanel";
import { StatusDot } from "../StatusDot";
import { EmailBandHeader } from "./parts";
import type { EmailProposal } from "../../lib/emailImport";
import {
  burgundy,
  headingInk,
  bodyInk,
  mutedInk,
  sageText,
  buttonPinkBg,
  buttonPinkBorder,
  FONT_SERIF,
  FONT_SANS,
  FONT_MONO,
} from "../../lib/designTokens";

const initialsFrom = (s: string): string =>
  s.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";

/** ISO YYYY-MM-DD → "15 Jun 2026", parsed as a LOCAL date (no UTC off-by-one). */
const formatDate = (iso: string): string => {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

export interface EmailImportReviewProps {
  proposal: EmailProposal;
  /** Resolved title for proposal.subject.manuscriptId (the proposal carries only the id). */
  manuscriptTitle?: string;
  onDiscard?: () => void;
}

export const EmailImportReview: React.FC<EmailImportReviewProps> = ({ proposal, manuscriptTitle, onDiscard }) => {
  const { subject, records, unplaced } = proposal;
  const isNew = subject.kind === "new_agent";

  // Accept/skip — every record starts accepted; skipping fades + strikes it and drops it from N.
  const [skipped, setSkipped] = useState<Set<number>>(() => new Set());
  const toggle = (i: number) =>
    setSkipped((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  const acceptedCount = records.length - skipped.size;

  const displayName = subject.agentName || subject.agency;
  const subLine = [
    subject.agentName ? subject.agency : null, // when a name heads the row, show the agency beneath
    manuscriptTitle ? (isNew ? `New query: ${manuscriptTitle}` : manuscriptTitle) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <MountPanel style={{ width: "100%" }}>
      <EmailBandHeader
        title="Here's what I found"
        meta={isNew ? "This agent isn't in your database yet" : "Matched to a query you already have"}
        Emblem={ShieldCheck}
      />
      <div style={{ padding: "18px 18px 18px" }}>
        {/* ── Subject ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "13px 14px",
            borderRadius: 11,
            background: isNew ? "#f6efe6" : "#f4f1ea",
            border: isNew ? "1px dashed #d8b48a" : "0.5px solid #e3ddcf",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "#fdfaf5",
              border: isNew ? "1px dashed rgba(160,122,58,0.8)" : "1px solid rgba(124,58,42,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: FONT_SERIF,
              fontSize: 15,
              fontWeight: 500,
              color: isNew ? "#a07a3a" : burgundy,
              flexShrink: 0,
            }}
          >
            {initialsFrom(displayName)}
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: isNew ? "#a07a3a" : sageText, marginBottom: 2, display: "flex", alignItems: "center", gap: 6 }}>
              {isNew ? "New agent · new query" : "Matched to your query"}
              {isNew && (
                <span style={{ background: "#f3e3c8", border: "0.5px solid #e2c98f", borderRadius: 4, color: "#8a5a1e", padding: "1px 5px", letterSpacing: "0.06em" }}>AGENCY CONFIRMED</span>
              )}
            </div>
            <div style={{ fontFamily: FONT_SERIF, fontSize: 17, fontWeight: 500, color: headingInk, lineHeight: 1.1 }}>{displayName}</div>
            {subLine && <div style={{ fontFamily: FONT_SANS, fontSize: 11.5, color: "#6a7e68", marginTop: 2 }}>{subLine}</div>}
          </div>
        </div>

        {/* ── Records ── */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9c8878", margin: "18px 2px 9px" }}>
          Records to add
        </div>
        {records.map((r, i) => {
          const isSkipped = skipped.has(i);
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: "13px 13px",
                borderRadius: 11,
                border: "0.5px solid #e6ddd0",
                background: isSkipped ? "#f6f3ee" : "#fff",
                marginBottom: 9,
                opacity: isSkipped ? 0.55 : 1,
                transition: "opacity .15s, background .15s",
              }}
            >
              <span style={{ flexShrink: 0, marginTop: 1 }}>
                <StatusDot status={r.resultingStatus} size={22} ghost={isSkipped} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: FONT_SERIF, fontSize: 15.5, fontWeight: 500, color: headingInk, textDecoration: isSkipped ? "line-through" : "none", textDecorationColor: "rgba(58,28,20,0.4)" }}>
                    {r.resultingStatus}
                  </span>
                  {r.dateProvisional ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: FONT_MONO, fontSize: 9.5, letterSpacing: "0.05em", color: "#8a5a1e", background: "#f7eddb", border: "0.5px solid #e2c98f", borderRadius: 5, padding: "2px 7px" }}>
                      <CalendarClock size={11} strokeWidth={2} aria-hidden="true" /> date provisional · confirm
                    </span>
                  ) : (
                    r.date && (
                      <span style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.04em", color: "#7a6a5a", background: "#f1ece4", borderRadius: 5, padding: "2px 7px", textDecoration: isSkipped ? "line-through" : "none" }}>
                        {formatDate(r.date)}
                      </span>
                    )
                  )}
                </div>
                {r.note && <div style={{ fontFamily: FONT_SANS, fontSize: 12, color: sageText, marginTop: 4, lineHeight: 1.45 }}>{r.note}</div>}
                {r.sourceQuote && <div style={{ fontFamily: "'Caveat', cursive", fontSize: 15, color: mutedInk, marginTop: 5, lineHeight: 1.2 }}>“{r.sourceQuote}”</div>}
              </div>
              <button
                type="button"
                onClick={() => toggle(i)}
                className="cursor-pointer"
                style={{
                  flexShrink: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontFamily: FONT_MONO,
                  fontSize: 9.5,
                  fontWeight: 500,
                  letterSpacing: "0.06em",
                  borderRadius: 8,
                  padding: "6px 11px",
                  border: "0.5px solid",
                  background: isSkipped ? "#fff" : "#e9ede6",
                  borderColor: isSkipped ? "#e0d5c8" : "#b8c8b0",
                  color: isSkipped ? "#a89888" : sageText,
                }}
              >
                {isSkipped ? "Skip" : (<><Check size={11} strokeWidth={2.6} aria-hidden="true" /> Add</>)}
              </button>
            </div>
          );
        })}

        {/* ── Unplaced (honest: nothing silently dropped) ── */}
        {unplaced.length > 0 && (
          <div style={{ marginTop: 14, padding: "11px 13px", borderRadius: 10, background: "#eef1ea", border: "0.5px solid #d8dfd2" }}>
            <div style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: sageText, marginBottom: 8 }}>
              Didn't place — left for you
            </div>
            {unplaced.map((u, i) => (
              <div key={i} style={{ fontFamily: FONT_SANS, fontSize: 12, color: "#5a6e58", lineHeight: 1.45, marginBottom: i === unplaced.length - 1 ? 0 : 6 }}>
                <span style={{ fontStyle: "italic", color: bodyInk }}>“{u.text}”</span>
                {u.reason && <span style={{ color: mutedInk }}> — {u.reason}</span>}
              </div>
            ))}
          </div>
        )}

        {/* ── Footer ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 20, paddingTop: 16, borderTop: "1px solid #ece3d6" }}>
          <button type="button" onClick={onDiscard} className="cursor-pointer" style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.06em", color: "#a07868", background: "transparent", border: "none" }}>
            Discard
          </button>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <button
              type="button"
              disabled
              title="Saving is wired in the next step"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                fontFamily: FONT_MONO,
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: burgundy,
                background: buttonPinkBg,
                border: `0.5px solid ${buttonPinkBorder}`,
                borderRadius: 10,
                padding: "11px 20px",
                opacity: 0.55,
                cursor: "not-allowed",
              }}
            >
              <Plus size={14} strokeWidth={2.2} aria-hidden="true" />
              {acceptedCount === 0 ? "Nothing selected" : `Add ${acceptedCount} record${acceptedCount === 1 ? "" : "s"}`}
            </button>
            <span style={{ fontFamily: FONT_MONO, fontSize: 8.5, letterSpacing: "0.06em", color: "#b3a99a" }}>saving comes next</span>
          </div>
        </div>
      </div>
    </MountPanel>
  );
};
