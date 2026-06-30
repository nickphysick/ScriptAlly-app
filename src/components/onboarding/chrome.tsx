/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared onboarding chrome for the branched flows (A/B/C). Two card skins, ported verbatim from
 * the approved sketches: the cream "Understood" transition and the Form 11 parchment skin used by
 * every form screen. Presentational only — Onboarding.tsx owns state and routing.
 */
import React from "react";

const FONT_SERIF = "'Playfair Display', Georgia, serif";
const FONT_SANS = "'Source Sans Pro', system-ui, sans-serif";
const FONT_MONO = "'JetBrains Mono', 'Fira Mono', monospace";

const PAPER_TEXTURE =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 300 300' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.04' numOctaves='5' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3CfeComponentTransfer%3E%3CfeFuncA type='linear' slope='0.03'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23p)'/%3E%3C/svg%3E\")";

/** The book-spine motif used in the band of every Form 11 onboarding screen. */
export const BookMotif: React.FC = () => (
  <svg
    style={{ position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)", color: "#3a1c14", opacity: 0.78, zIndex: 1 }}
    width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M12 6c-1.6-1-4.2-1.6-6.3-1.6-.9 0-1.7.1-1.7.1v13s.8-.1 1.7-.1c2.1 0 4.7.6 6.3 1.6 1.6-1 4.2-1.6 6.3-1.6.9 0 1.7.1 1.7.1v-13s-.8-.1-1.7-.1c-2.1 0-4.7.6-6.3 1.6z" />
    <path d="M12 6v13" />
  </svg>
);

/** Inbox/tray motif for the pipeline screens. */
export const InboxMotif: React.FC = () => (
  <svg
    style={{ position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)", color: "#3a1c14", opacity: 0.78, zIndex: 1 }}
    width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    <path d="M12 3v12M7 8l5-5 5 5" />
  </svg>
);

const DOT_TOTAL = 5;

/** The progress-dots row (active = elongated burgundy pill) + a Skip-setup link, above the card. */
export const OnbChrome: React.FC<{ dotIndex: number; onSkip: () => void; total?: number }> = ({
  dotIndex,
  onSkip,
  total = DOT_TOTAL,
}) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px" }}>
    <Dots dotIndex={dotIndex} total={total} />
    <button
      onClick={onSkip}
      style={{
        fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.04em", color: "#9c8878",
        background: "none", border: "none", cursor: "pointer", padding: 0, transition: "color 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = "#7c3a2a")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "#9c8878")}
    >
      Skip setup
    </button>
  </div>
);

const Dots: React.FC<{ dotIndex: number; total: number }> = ({ dotIndex, total }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
    {Array.from({ length: total }).map((_, i) => (
      <span
        key={i}
        style={{
          height: 6,
          width: i === dotIndex ? 22 : 6,
          borderRadius: i === dotIndex ? 3 : "50%",
          background: i === dotIndex ? "#7c3a2a" : "#d8cec4",
          transition: "all 0.25s",
        }}
      />
    ))}
  </div>
);

/** Cream-shell transition card — used only for the "Understood" beat. Caller controls timing. */
export const CreamUnderstood: React.FC<{ dotIndex?: number; eyebrow?: string; title?: string; sub?: string }> = ({
  dotIndex = 1,
  eyebrow = "Got it",
  title = "Understood.",
  sub = "Setting things up around where you are — one moment.",
}) => (
  <div
    style={{
      width: "100%", maxWidth: 560, background: "#FDF9F4", borderRadius: 24,
      boxShadow: "0 1px 2px rgba(58,28,20,0.05),0 18px 50px rgba(58,28,20,0.10)",
      position: "relative", overflow: "hidden",
    }}
  >
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 5, background: "linear-gradient(90deg,#d9b6ad,#c79a93)" }} />
    <div style={{ display: "flex", justifyContent: "flex-start", padding: "26px 34px 0" }}>
      <Dots dotIndex={dotIndex} total={DOT_TOTAL} />
    </div>
    <div style={{ textAlign: "center", padding: "50px 34px 56px" }}>
      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 24 }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 9, height: 9, borderRadius: "50%", background: "#7c3a2a",
              animation: `sa-ob-pulse 1.2s infinite ease-in-out`, animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
      <div style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "#C49A9A", marginBottom: 12 }}>
        {eyebrow}
      </div>
      <div style={{ fontFamily: FONT_SERIF, fontSize: 30, fontWeight: 500, color: "#3A2018", marginBottom: 8 }}>{title}</div>
      <p style={{ fontSize: 15, color: "#8C8079", lineHeight: 1.55 }}>{sub}</p>
    </div>
    <style>{`@keyframes sa-ob-pulse{0%,100%{opacity:0.25;transform:scale(0.85);}50%{opacity:1;transform:scale(1);}}`}</style>
  </div>
);

export interface Form11CardProps {
  dotIndex: number;
  onSkip: () => void;
  pre: string;
  name: string;
  sub: string;
  motif?: React.ReactNode;
  children: React.ReactNode;
  onBack?: () => void;
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  /** Use the filled burgundy button instead of the soft-pink one (import-confirm). */
  primaryFilled?: boolean;
}

/** A full Form 11 onboarding screen: chrome row, parchment card (band + body), footer. */
export const Form11Card: React.FC<Form11CardProps> = ({
  dotIndex, onSkip, pre, name, sub, motif, children, onBack, primaryLabel, onPrimary, primaryDisabled, primaryFilled,
}) => (
  <div style={{ width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", gap: 12 }}>
    <OnbChrome dotIndex={dotIndex} onSkip={onSkip} />
    <div
      style={{
        borderRadius: 14, background: "#fdfaf5", backgroundImage: PAPER_TEXTURE, position: "relative",
        boxShadow: "0 1px 2px rgba(58,28,20,0.06),0 6px 24px rgba(58,28,20,0.1)",
      }}
    >
      <div style={{ position: "absolute", inset: 6, border: "1px solid rgba(124,58,42,0.28)", borderRadius: 10, pointerEvents: "none", zIndex: 3 }} />
      {/* sage band */}
      <div
        style={{
          background: "linear-gradient(135deg,#dce0d9 0%,#d0d6cc 100%)", padding: "18px 24px 16px",
          position: "relative", overflow: "hidden", borderRadius: "8px 8px 0 0", margin: "6px 6px 0", minHeight: 78,
        }}
      >
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1, background: "rgba(90,110,88,0.2)" }} />
        {motif}
        <div style={{ display: "flex", alignItems: "center", gap: 11, position: "relative", zIndex: 2 }}>
          <div
            style={{
              width: 38, height: 38, borderRadius: "50%", background: "#fdfaf5", border: "1px solid rgba(124,58,42,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center", color: "#7c3a2a", flexShrink: 0,
              boxShadow: "0 1px 2px rgba(58,28,20,0.05)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 19a9 9 0 0 1 9 0 9 9 0 0 1 9 0" /><path d="M3 6a9 9 0 0 1 9 0 9 9 0 0 1 9 0" /><path d="M3 6v13M21 6v13M12 6v13" />
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5a6e58", marginBottom: 1 }}>{pre}</div>
            <div style={{ fontFamily: FONT_SERIF, fontSize: 18, fontWeight: 500, color: "#2e3a2c", lineHeight: 1.1 }}>{name}</div>
            <div style={{ fontSize: 11, color: "#6a7e68", fontWeight: 300, marginTop: 1 }}>{sub}</div>
          </div>
        </div>
      </div>
      {/* body */}
      <div style={{ padding: "20px 22px 18px", margin: "0 6px", position: "relative" }}>{children}</div>
      {/* footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 6px 6px", padding: "15px 22px", borderTop: "0.5px solid #ece2d6" }}>
        {onBack ? (
          <button
            onClick={onBack}
            style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.04em", color: "#b0a294", background: "none", border: "none", cursor: "pointer", padding: 0 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#7c3a2a")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#b0a294")}
          >
            ‹ Back
          </button>
        ) : (
          <span />
        )}
        <button
          onClick={onPrimary}
          disabled={primaryDisabled}
          style={{
            fontFamily: FONT_MONO, fontSize: 11, fontWeight: 500, letterSpacing: "0.07em",
            background: primaryFilled ? "#7c3a2a" : "#f5e2da",
            color: primaryFilled ? "#f5e9e2" : "#7c3a2a",
            border: primaryFilled ? "none" : "0.5px solid #e8c8bc",
            borderRadius: 10, padding: "11px 22px", cursor: primaryDisabled ? "not-allowed" : "pointer",
            opacity: primaryDisabled ? 0.55 : 1, whiteSpace: "nowrap", transition: "all 0.2s",
          }}
        >
          {primaryLabel}
        </button>
      </div>
    </div>
  </div>
);

export interface SelectRowProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
  selected: boolean;
  onClick: () => void;
}

/** A selectable option row in the Form 11 onboarding body. */
export const SelectRow: React.FC<SelectRowProps> = ({ icon, title, desc, selected, onClick }) => (
  <div
    onClick={onClick}
    style={{
      display: "flex", alignItems: "flex-start", gap: 13, background: selected ? "#f8ece6" : "#ffffff",
      border: selected ? "1.5px solid #7c3a2a" : "0.5px solid #e0d5c8", borderRadius: 10, padding: "13px 15px",
      cursor: "pointer", marginBottom: 10, boxShadow: "inset 0 1px 2px rgba(58,28,20,0.02)", transition: "all 0.15s",
    }}
    onMouseEnter={(e) => { if (!selected) e.currentTarget.style.borderColor = "#c9a89e"; }}
    onMouseLeave={(e) => { if (!selected) e.currentTarget.style.borderColor = "#e0d5c8"; }}
  >
    <div style={{ width: 36, height: 36, borderRadius: 9, background: "#f5e2da", display: "flex", alignItems: "center", justifyContent: "center", color: "#7c3a2a", flexShrink: 0 }}>
      {icon}
    </div>
    <div>
      <div style={{ fontSize: 14, fontWeight: 500, color: "#3a1c14", marginBottom: 2 }}>{title}</div>
      <div style={{ fontSize: 12, color: "#9c8878", lineHeight: 1.45 }}>{desc}</div>
    </div>
  </div>
);

export { FONT_SERIF, FONT_SANS, FONT_MONO, PAPER_TEXTURE };
