/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Queries hub — the landing the global "Queries" nav item points to. A calm, three-choice
 * crossroads (browse the database · log a new query · update an existing one) rather than the
 * old data-dense overview. Renders inside the standard app shell/nav like other top-level pages;
 * it deliberately has no manuscript/filter/sort sidebar of its own.
 */
import React from "react";
import {
  burgundy, kraft, headingInk, mutedInk, labelColor,
  FONT_SERIF, FONT_MONO, FONT_SANS,
} from "../lib/designTokens";

interface QueriesHubProps {
  onNavigate: (tab: string, subPageName?: string) => void;
  /** Opens the Record-a-response flow for an existing query (card 3). */
  onUpdateExisting: () => void;
}

interface HubCard {
  key: string;
  title: string;
  body: string;
  affordance: string;
  illo: React.ReactNode;
  onOpen: () => void;
  ariaLabel: string;
}

// Inline line-illustrations from the mockup — burgundy stroke, blush disc behind.
const LedgerIllo = (
  <svg viewBox="0 0 48 48" fill="none" stroke={burgundy} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="8" y="9" width="32" height="30" rx="4" />
    <line x1="14" y1="17" x2="34" y2="17" />
    <line x1="14" y1="24" x2="30" y2="24" />
    <line x1="14" y1="31" x2="30" y2="31" />
  </svg>
);

const PlaneIllo = (
  <svg viewBox="0 0 48 48" fill="none" stroke={burgundy} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M40 8 L21 27" />
    <path d="M40 8 L30 40 L21 27 L8 20 Z" />
    <path d="M21 27 L29 22" />
    <line x1="11" y1="34" x2="15" y2="38" opacity="0.55" />
    <line x1="8" y1="40" x2="10" y2="42" opacity="0.4" />
  </svg>
);

const EnvelopeIllo = (
  <svg viewBox="0 0 48 48" fill="none" stroke={burgundy} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="8" y="13" width="32" height="23" rx="3.5" />
    <path d="M9 15 L24 27 L39 15" />
    <path d="M31 9 a8 8 0 1 1 -7 4" />
    <path d="M31 4 L31 10 L25 10" />
  </svg>
);

export const QueriesHub: React.FC<QueriesHubProps> = ({ onNavigate, onUpdateExisting }) => {
  const prefersReduced = typeof window !== "undefined"
    && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const cards: HubCard[] = [
    {
      key: "database",
      title: "Query database",
      body: "Browse and track every query you've sent.",
      affordance: "Open",
      illo: LedgerIllo,
      ariaLabel: "Open the query database",
      onOpen: () => onNavigate("queries", "Query database"),
    },
    {
      key: "log",
      title: "Log a new query",
      body: "Record a query you've just sent to an agent.",
      affordance: "Start",
      illo: PlaneIllo,
      ariaLabel: "Log a new query",
      onOpen: () => onNavigate("queries", "Log a query"),
    },
    {
      key: "update",
      title: "Update an existing query",
      body: "Add a response, note, or status change.",
      affordance: "Update",
      illo: EnvelopeIllo,
      ariaLabel: "Update an existing query",
      onOpen: onUpdateExisting,
    },
  ];

  return (
    <div style={{ minHeight: "calc(100vh - 64px)", background: kraft, fontFamily: FONT_SANS, color: headingInk }}>
      <style>{`
        .qhub-card{
          opacity:0; transform:translateY(14px);
          animation:qhub-rise .6s cubic-bezier(.2,.7,.3,1) forwards;
          transition:transform .28s cubic-bezier(.2,.7,.3,1), box-shadow .28s ease, border-color .28s ease, background .28s ease;
        }
        .qhub-card:nth-child(1){animation-delay:.06s;}
        .qhub-card:nth-child(2){animation-delay:.15s;}
        .qhub-card:nth-child(3){animation-delay:.24s;}
        @keyframes qhub-rise{to{opacity:1;transform:translateY(0);}}
        .qhub-card:hover{
          transform:translateY(-5px);
          background:#fffdf8;
          border-color:rgba(124,58,42,.34);
          box-shadow:0 16px 34px -16px rgba(124,58,42,.30);
        }
        .qhub-card:focus-visible{ outline:2px solid ${burgundy}; outline-offset:3px; }
        .qhub-illo{ transition:transform .28s ease; }
        .qhub-card:hover .qhub-illo{ transform:scale(1.05); }
        .qhub-card:hover .qhub-title{ color:${burgundy}; }
        .qhub-card:hover .qhub-go{ opacity:1; }
        .qhub-arrow{ display:inline-block; transition:transform .25s ease; }
        .qhub-card:hover .qhub-arrow{ transform:translateX(4px); }
        @media (max-width:780px){ .qhub-cards{ grid-template-columns:1fr !important; } }
        @media (prefers-reduced-motion:reduce){
          .qhub-card{ animation:none; opacity:1; transform:none; }
          .qhub-card,.qhub-illo,.qhub-arrow{ transition:none; }
        }
      `}</style>

      <main style={{ maxWidth: 1040, margin: "0 auto", padding: "74px 32px 90px", textAlign: "center" }}>
        <p style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: labelColor, margin: "0 0 18px" }}>
          Queries
        </p>
        <h1 style={{ fontFamily: FONT_SERIF, fontWeight: 600, fontSize: "clamp(30px, 4.4vw, 46px)", lineHeight: 1.08, margin: "0 auto 16px", color: headingInk, maxWidth: "14ch" }}>
          What would you like to do?
        </h1>
        <p style={{ fontSize: 15, lineHeight: 1.6, color: mutedInk, margin: "0 auto", maxWidth: "46ch" }}>
          Jump into your tracker, log a query you've just sent, or record a response to one already out there.
        </p>

        <div className="qhub-cards" style={{ marginTop: 54, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 22 }}>
          {cards.map(card => (
            <a
              key={card.key}
              className="qhub-card"
              role="button"
              tabIndex={0}
              aria-label={card.ariaLabel}
              onClick={card.onOpen}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); card.onOpen(); } }}
              style={{
                position: "relative", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
                background: "#fdf9f2", border: "1px solid #e9ded0", borderRadius: 22,
                padding: "38px 26px 30px", textDecoration: "none", color: "inherit", cursor: "pointer",
                boxShadow: "0 1px 2px rgba(114,36,62,.04)",
                ...(prefersReduced ? { opacity: 1, transform: "none" } : {}),
              }}
            >
              <span
                className="qhub-illo"
                style={{
                  width: 96, height: 96, borderRadius: "50%",
                  background: "radial-gradient(circle at 50% 38%, #f8e8df, #f1d9cd)",
                  border: "1px solid rgba(124,58,42,.16)",
                  display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24,
                }}
              >
                <span style={{ width: 50, height: 50, display: "flex" }}>{card.illo}</span>
              </span>
              <h2 className="qhub-title" style={{ fontFamily: FONT_SERIF, fontWeight: 600, fontSize: 21, margin: "0 0 10px", color: headingInk, letterSpacing: "0.2px", transition: "color 0.2s ease" }}>
                {card.title}
              </h2>
              <p style={{ fontSize: 13.5, lineHeight: 1.55, color: mutedInk, margin: "0 0 22px", maxWidth: "24ch" }}>
                {card.body}
              </p>
              <span className="qhub-go" style={{ marginTop: "auto", fontFamily: FONT_MONO, fontSize: 10.5, letterSpacing: "0.18em", textTransform: "uppercase", color: burgundy, display: "inline-flex", alignItems: "center", gap: 7, opacity: 0.7, transition: "opacity 0.25s ease" }}>
                {card.affordance} <span className="qhub-arrow">→</span>
              </span>
            </a>
          ))}
        </div>

        <p style={{ marginTop: 46, fontFamily: FONT_SERIF, fontStyle: "italic", fontSize: 14.5, color: labelColor }}>
          Everything you send, in one quiet place.
        </p>
      </main>
    </div>
  );
};
