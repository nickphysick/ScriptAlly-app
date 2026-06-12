/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useScriptAllyDb } from "../lib/db";
import { ManuscriptStatus, SubmissionStatus, SubmissionMethod } from "../types";
import { CreamUnderstood } from "./onboarding/chrome";
import { BranchA, BranchAResult } from "./onboarding/BranchA";
import { BranchB } from "./onboarding/BranchB";
import { ManuscriptFieldsState } from "./onboarding/ManuscriptFields";
import { buildManuscriptPayload, manuscriptLimitError } from "../lib/manuscripts";
import {
  BookOpen,
  Users,
  Send,
  Pencil,
  Table,
  LayoutGrid,
  UserPlus,
  ArrowRight,
  Check,
  ChevronLeft,
  Upload,
  Download,
} from "lucide-react";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:            "#F5F0EA",
  sageBg:        "#DCE0D9",
  card:          "#FFFDF9",
  card2:         "#fdf5f0",
  card3:         "#faf8f5",
  ink:           "#3a1c14",
  burgundy:      "#7c3a2a",
  burgundyDeep:  "#5a2a1e",
  dusty:         "#c9a89e",
  dustyBorder:   "#e0ccc0",
  sandy:         "#EBDCD3",
  sandyBg:       "#FAF1EF",
  sandyBorder2:  "#F2DDD5",
  muted:         "#a08070",
  mutedDark:     "#7a5848",
  amber:         "#c97c5a",
  green:         "#c0dd97",
  greenDark:     "#3B6D11",
  border:        "#EBDCD3",
};

const FONT_SERIF  = "'Playfair Display', Georgia, serif";
const FONT_SANS   = "'Inter', system-ui, sans-serif";
const FONT_MONO   = "'JetBrains Mono', 'Fira Mono', monospace";

const ACCENT_COLORS: Record<number, string> = {
  2: C.dusty,
  3: C.burgundy,
  4: C.burgundy,
  5: C.burgundy,
  6: C.green,
};

const TOTAL_MODAL_STEPS = 5; // steps 2–6

// ─── Types ────────────────────────────────────────────────────────────────────
interface OnboardingProps {
  onComplete: () => void;
}

type OnboardingPath = "guided" | "import" | "skip" | null;

interface ProgressData {
  step: number;
  manuscriptTitle: string;
  manuscriptGenre: string;
  agentName: string;
  agentAgency: string;
  selectedPath: OnboardingPath;
  queryingStage: QueryingStage | null;
}

// Where the writer is in their querying journey — captured on the welcome step (step 0).
// Persisted to the user profile; does not branch the flow (everyone continues the same steps).
type QueryingStage = "starting" | "early" | "deep" | "interest";

const STAGE_OPTIONS: { id: QueryingStage; title: string; descriptor: string }[] = [
  { id: "starting", title: "Just getting started", descriptor: "Haven't sent any queries yet" },
  { id: "early",    title: "A few queries out",    descriptor: "Early days, waiting to hear back" },
  { id: "deep",     title: "Deep in it",           descriptor: "Lots of queries in flight" },
  { id: "interest", title: "Had some interest",    descriptor: "Requests or an offer on the table" },
];

// Sub-line shown under the "Understood…" beat after Continue (matched to the chosen stage).
// Skip shows the heading only — no sub-line.
const STAGE_SUBLINE: Record<QueryingStage, string> = {
  starting: "We'll start you with a clean desk and walk you through logging your very first query.",
  early:    "We'll help you get those first few queries logged so nothing slips.",
  deep:     "We'll set you up to import what you've already sent and see it all in one place.",
  interest: "We'll make sure requests and offers stay front and centre.",
};

// The branch a chosen stage routes into after the "Understood" beat:
//   starting → Branch A (manuscript-led setup); early/deep/interest → Branch B (capture + import).
// "Skip setup" is the only route to Branch C (exploring) and is handled separately.
type Branch = "A" | "B";
const STAGE_TO_BRANCH: Record<QueryingStage, Branch> = {
  starting: "A",
  early: "B",
  deep: "B",
  interest: "B",
};
// The collapsed 3-way persisted to the profile (User.journeyStage) for later personalisation.
const STAGE_TO_JOURNEY: Record<QueryingStage, "starting" | "querying" | "exploring"> = {
  starting: "starting",
  early: "querying",
  deep: "querying",
  interest: "querying",
};
// Distinct ScreenTransition keys per flow phase. Deliberately one key per BRANCH, not per branch
// step — the key remounts ScreenTransition's child, so a per-step key would wipe the branch
// component's internal state on every internal navigation.
const FLOW_KEY: Record<"understood" | "A" | "B", number> = { understood: -2, A: 100, B: 200 };

// Centres a screen in the full-height onboarding overlay.
const CenterWrap: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", minHeight: "100%", padding: "32px 16px", boxSizing: "border-box" }}>
    {children}
  </div>
);

// ─── Sub-components ───────────────────────────────────────────────────────────

const Eyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{
    fontFamily: FONT_MONO,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: C.dusty,
    display: "block",
    marginBottom: 8,
  }}>
    {children}
  </span>
);

const ModalTitle: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <h2 style={{
    fontFamily: FONT_SERIF,
    fontSize: 26,
    fontWeight: 500,
    letterSpacing: "-0.02em",
    color: C.ink,
    margin: "0 0 8px",
    lineHeight: 1.25,
    ...style,
  }}>
    {children}
  </h2>
);

const Subtitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p style={{
    fontFamily: FONT_SANS,
    fontSize: 13,
    fontWeight: 300,
    color: C.muted,
    margin: "0 0 24px",
    lineHeight: 1.6,
  }}>
    {children}
  </p>
);

const SkipButton: React.FC<{ onSkip: () => void }> = ({ onSkip }) => (
  <button
    onClick={onSkip}
    style={{
      position: "absolute",
      top: 20,
      right: 20,
      fontFamily: FONT_MONO,
      fontSize: 10,
      letterSpacing: "0.06em",
      color: C.muted,
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: "4px 8px",
      borderRadius: 6,
      transition: "color 0.15s",
    }}
    onMouseEnter={e => (e.currentTarget.style.color = C.ink)}
    onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
  >
    Skip setup
  </button>
);

const ProgressDots: React.FC<{ currentStep: number }> = ({ currentStep }) => {
  const dotStep = currentStep - 1; // 1-indexed into 1..5
  return (
    <div style={{ display: "flex", gap: 5, marginBottom: 28 }}>
      {Array.from({ length: TOTAL_MODAL_STEPS }, (_, i) => {
        const idx = i + 1;
        const isActive = idx === dotStep;
        const isDone = idx < dotStep;
        return (
          <div key={i} style={{
            height: 5,
            width: isActive ? 16 : 5,
            borderRadius: 3,
            background: isDone ? C.dusty : isActive ? C.burgundy : C.border,
            transition: "width 0.3s ease, background 0.3s ease",
          }} />
        );
      })}
    </div>
  );
};

const PrimaryButton: React.FC<{
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  fullWidth?: boolean;
}> = ({ onClick, children, disabled, fullWidth }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: FONT_MONO,
        fontSize: 11,
        letterSpacing: "0.06em",
        background: disabled ? C.dustyBorder : hovered ? C.burgundyDeep : C.burgundy,
        color: "#f5ede8",
        border: "none",
        borderRadius: 10,
        padding: "10px 20px",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 0.15s, transform 0.15s",
        transform: hovered && !disabled ? "translateY(-1px)" : "none",
        width: fullWidth ? "100%" : undefined,
      }}
    >
      {children}
    </button>
  );
};

const BackButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: FONT_MONO,
        fontSize: 11,
        letterSpacing: "0.06em",
        color: hovered ? C.ink : C.dusty,
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "10px 12px",
        display: "flex",
        alignItems: "center",
        gap: 4,
        transition: "color 0.15s",
      }}
    >
      <ChevronLeft size={13} />
      Back
    </button>
  );
};

const ModalFooter: React.FC<{
  onBack?: () => void;
  onContinue: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
}> = ({ onBack, onContinue, continueLabel = "Continue →", continueDisabled }) => (
  <div style={{
    background: C.card3,
    borderTop: `0.5px solid rgba(235,220,211,0.5)`,
    borderRadius: "0 0 20px 20px",
    padding: "16px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  }}>
    {onBack ? <BackButton onClick={onBack} /> : <div />}
    <PrimaryButton onClick={onContinue} disabled={continueDisabled}>
      {continueLabel}
    </PrimaryButton>
  </div>
);

interface SelectableCardProps {
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
  tag: string;
}

const SelectableCard: React.FC<SelectableCardProps> = ({ selected, onSelect, icon, title, description, tag }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        width: "100%",
        textAlign: "left",
        background: selected ? "#fff0eb" : hovered ? C.card2 : C.card,
        border: `${selected ? "1px" : "1px"} solid ${selected ? C.burgundy : hovered ? C.dusty : C.border}`,
        borderRadius: 14,
        padding: "13px 16px",
        cursor: "pointer",
        transition: "all 0.15s ease",
        marginBottom: 8,
      }}
    >
      <div style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        background: selected ? C.burgundy : C.card2,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        transition: "background 0.15s",
        color: selected ? "#f5ede8" : C.dusty,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <span style={{ fontFamily: FONT_SANS, fontSize: 13, fontWeight: 500, color: C.ink }}>
            {title}
          </span>
          <span style={{
            fontFamily: FONT_MONO,
            fontSize: 9,
            letterSpacing: "0.06em",
            background: C.sandyBg,
            border: `0.5px solid ${C.sandyBorder2}`,
            color: C.muted,
            borderRadius: 6,
            padding: "2px 6px",
            whiteSpace: "nowrap",
          }}>
            {tag}
          </span>
        </div>
        <p style={{ fontFamily: FONT_SANS, fontSize: 12, fontWeight: 300, color: C.muted, margin: 0, lineHeight: 1.5 }}>
          {description}
        </p>
      </div>
    </button>
  );
};

const FormField: React.FC<{
  label: string;
  required?: boolean;
  children: React.ReactNode;
}> = ({ label, required, children }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{
      fontFamily: FONT_MONO,
      fontSize: 9,
      textTransform: "uppercase",
      letterSpacing: "0.1em",
      color: C.muted,
      display: "block",
      marginBottom: 5,
    }}>
      {label}{required && <span style={{ color: C.burgundy, marginLeft: 3 }}>*</span>}
    </label>
    {children}
  </div>
);

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: C.card2,
  border: `0.5px solid ${C.dustyBorder}`,
  borderRadius: 10,
  padding: "11px 14px",
  fontFamily: FONT_SANS,
  fontSize: 13,
  color: C.ink,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s, box-shadow 0.15s",
};

const InputField: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      style={{
        ...inputStyle,
        border: `0.5px solid ${focused ? C.dusty : C.dustyBorder}`,
        boxShadow: focused ? "0 0 0 3px rgba(201,168,158,0.15)" : "none",
        ...props.style,
      }}
      onFocus={e => { setFocused(true); props.onFocus?.(e); }}
      onBlur={e => { setFocused(false); props.onBlur?.(e); }}
    />
  );
};

const SelectField: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => {
  const [focused, setFocused] = useState(false);
  return (
    <select
      {...props}
      style={{
        ...inputStyle,
        appearance: "none",
        WebkitAppearance: "none",
        cursor: "pointer",
        border: `0.5px solid ${focused ? C.dusty : C.dustyBorder}`,
        boxShadow: focused ? "0 0 0 3px rgba(201,168,158,0.15)" : "none",
        ...props.style,
      }}
      onFocus={e => { setFocused(true); props.onFocus?.(e); }}
      onBlur={e => { setFocused(false); props.onBlur?.(e); }}
    />
  );
};

// ─── Screen wrappers ──────────────────────────────────────────────────────────

// Keyed enter-only fade between screens. Deliberately NO framer-motion here: exit-completion
// callbacks don't reliably fire in this app (React 19 + motion), which either wedges the flow
// (mode="wait"), stacks invisible exited screens over the live one (default mode), or fails to
// swap the keyed child at all. A keyed plain div + CSS enter animation is fully robust.
const ScreenTransition: React.FC<{ stepKey: number; children: React.ReactNode }> = ({ stepKey, children }) => (
  <div key={stepKey} style={{ width: "100%", animation: "sa-screen-in 0.28s ease-out" }}>
    <style>{`@keyframes sa-screen-in { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: none; } }`}</style>
    {children}
  </div>
);

const ModalCard: React.FC<{ step: number; children: React.ReactNode }> = ({ step, children }) => (
  <div style={{
    background: C.card,
    border: `0.5px solid ${C.border}`,
    borderRadius: 20,
    width: "100%",
    maxWidth: 500,
    overflow: "hidden",
    boxShadow: "0 8px 40px rgba(58,28,20,0.12)",
  }}>
    {/* Accent bar */}
    <div style={{ height: 3, background: ACCENT_COLORS[step] || C.dusty }} />
    {children}
  </div>
);

// ─── Step 0: Welcome / querying-stage capture ─────────────────────────────────

// Single-select option card: title + descriptor + soft-burgundy selected state + tick.
// Mirrors SelectableCard's selection treatment using the shared C tokens (kept separate so the
// existing SelectableCard / Screen3Path is untouched).
const StageCard: React.FC<{
  selected: boolean;
  onSelect: () => void;
  title: string;
  descriptor: string;
}> = ({ selected, onSelect, title, descriptor }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "100%",
        textAlign: "left",
        background: selected ? "#fff0eb" : hovered ? C.card2 : C.card,
        border: `1px solid ${selected ? C.burgundy : hovered ? C.dusty : C.border}`,
        borderRadius: 14,
        padding: "13px 16px",
        cursor: "pointer",
        transition: "all 0.15s ease",
        marginBottom: 8,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: FONT_SANS, fontSize: 13, fontWeight: 500, color: C.ink, marginBottom: 2 }}>
          {title}
        </div>
        <p style={{ fontFamily: FONT_SANS, fontSize: 12, fontWeight: 300, color: C.muted, margin: 0, lineHeight: 1.5 }}>
          {descriptor}
        </p>
      </div>
      <div style={{
        width: 22,
        height: 22,
        borderRadius: "50%",
        flexShrink: 0,
        background: selected ? C.burgundy : "transparent",
        border: `1px solid ${selected ? C.burgundy : C.dustyBorder}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#f5ede8",
        transition: "all 0.15s",
      }}>
        {selected && <Check size={13} strokeWidth={2.5} />}
      </div>
    </button>
  );
};

const WelcomeStageScreen: React.FC<{
  selected: QueryingStage | null;
  onSelect: (s: QueryingStage) => void;
  onContinue: () => void;
  onSkip: () => void;
}> = ({ selected, onSelect, onContinue, onSkip }) => {
  const [skipHovered, setSkipHovered] = useState(false);
  return (
    <ModalCard step={1}>
      {/* Sage header band: brand mark · mono eyebrow · Playfair wordmark */}
      <div style={{
        background: "linear-gradient(135deg, #dce0d9 0%, #d0d6cc 100%)",
        borderBottom: "1px solid rgba(90,110,88,0.2)",
        padding: "18px 28px",
        display: "flex",
        alignItems: "center",
        gap: 11,
      }}>
        <div style={{
          width: 38,
          height: 38,
          background: C.burgundy,
          borderRadius: 9,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT_SERIF,
          fontWeight: 700,
          fontSize: 17,
          color: "#f5ede8",
          flexShrink: 0,
        }}>
          S
        </div>
        <div>
          <span style={{
            fontFamily: FONT_MONO,
            fontSize: 9,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "#5a6e58",
            display: "block",
            marginBottom: 1,
          }}>
            Welcome to
          </span>
          <span style={{ fontFamily: FONT_SERIF, fontSize: 19, fontWeight: 600, color: "#2e3a2c", letterSpacing: "-0.01em" }}>
            ScriptAlly
          </span>
        </div>
      </div>

      <div style={{ padding: "26px 28px 24px" }}>
        <ModalTitle>
          Let's set things up around your{" "}
          <em style={{ fontStyle: "italic", color: C.burgundy }}>journey.</em>
        </ModalTitle>
        <Subtitle>
          A calm home for every query, agent, and deadline. No wrong answer here — it just helps us
          shape what you see first.
        </Subtitle>

        <Eyebrow>Where are you in your querying journey?</Eyebrow>

        <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 20 }}>
          {STAGE_OPTIONS.map(opt => (
            <StageCard
              key={opt.id}
              selected={selected === opt.id}
              onSelect={() => onSelect(opt.id)}
              title={opt.title}
              descriptor={opt.descriptor}
            />
          ))}
        </div>

        <PrimaryButton onClick={onContinue} disabled={!selected} fullWidth>
          Continue →
        </PrimaryButton>

        <div style={{ textAlign: "center", marginTop: 12 }}>
          <button
            onClick={onSkip}
            onMouseEnter={() => setSkipHovered(true)}
            onMouseLeave={() => setSkipHovered(false)}
            style={{
              fontFamily: FONT_MONO,
              fontSize: 10,
              letterSpacing: "0.06em",
              color: skipHovered ? C.ink : C.muted,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px 8px",
              transition: "color 0.15s",
            }}
          >
            Skip this step
          </button>
        </div>
      </div>
    </ModalCard>
  );
};

// Brief confirmation beat shown after Continue / Skip, then auto-advances into the existing flow.
const ConfirmBeat: React.FC<{ subline: string | null }> = ({ subline }) => (
  <div style={{ width: "100%", maxWidth: 500, textAlign: "center", padding: "0 24px" }}>
    <ModalTitle style={{ fontSize: 28, margin: 0 }}>
      Understood. <em style={{ fontStyle: "italic", color: C.burgundy }}>Let's dive straight in…</em>
    </ModalTitle>
    {subline && (
      <p style={{
        fontFamily: FONT_SANS,
        fontSize: 14,
        fontWeight: 300,
        color: C.muted,
        margin: "14px auto 0",
        maxWidth: 420,
        lineHeight: 1.6,
      }}>
        {subline}
      </p>
    )}
  </div>
);

// ─── Screen 1: Welcome ────────────────────────────────────────────────────────

const Screen1Welcome: React.FC<{ onStart: () => void; onAlreadyHaveAccount: () => void }> = ({ onStart, onAlreadyHaveAccount }) => {
  const [startHovered, setStartHovered] = useState(false);
  const [acctHovered, setAcctHovered] = useState(false);

  const fakeQueries = [
    { status: "Queried",    agent: "Sarah Latham",    agency: "Curtis Brown" },
    { status: "Full Sent",  agent: "Marcus Osei",     agency: "Peters Fraser" },
    { status: "Rejected",   agent: "Julia Beckett",   agency: "Janklow Nesbit" },
  ];

  const statusDotColor: Record<string, string> = {
    "Queried":   "#7c9dbf",
    "Full Sent": "#7c3a2a",
    "Rejected":  "#c97c5a",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 70% 30%, #5a2a1e 0%, #3a1c14 70%)",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Main content */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 64,
          maxWidth: 960,
          width: "100%",
          alignItems: "center",
        }}>
          {/* Left: Copy */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {/* Logo mark */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
              <div style={{
                width: 36,
                height: 36,
                background: C.burgundy,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: FONT_SERIF,
                fontWeight: 700,
                fontSize: 18,
                color: "#f5ede8",
              }}>
                S
              </div>
              <span style={{ fontFamily: FONT_SERIF, fontSize: 20, fontWeight: 600, color: "#F8F5F0", letterSpacing: "-0.01em" }}>
                ScriptAlly
              </span>
            </div>

            <span style={{
              fontFamily: FONT_MONO,
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: C.dusty,
              display: "block",
              marginBottom: 16,
            }}>
              For fiction writers who query
            </span>

            <h1 style={{
              fontFamily: FONT_SERIF,
              fontSize: 38,
              fontWeight: 500,
              letterSpacing: "-0.02em",
              color: "#F5F0EA",
              margin: "0 0 20px",
              lineHeight: 1.2,
            }}>
              Query with{" "}
              <em style={{ fontStyle: "italic" }}>confidence</em>
              ,<br />not chaos.
            </h1>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 36 }}>
              {[
                "Every query in one place — agent, status, deadline, response.",
                "Never miss a deadline — response windows, nudge reminders, follow-ups.",
                "Agent intelligence — MSWL, preferences, and wishlist before you send.",
              ].map((text, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.dusty, marginTop: 5, flexShrink: 0 }} />
                  <span style={{ fontFamily: FONT_SANS, fontSize: 13, fontWeight: 300, color: "rgba(245,240,234,0.8)", lineHeight: 1.55 }}>
                    {text}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                onClick={onStart}
                onMouseEnter={() => setStartHovered(true)}
                onMouseLeave={() => setStartHovered(false)}
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 12,
                  letterSpacing: "0.06em",
                  background: startHovered ? C.burgundyDeep : C.burgundy,
                  color: "#f5ede8",
                  border: "none",
                  borderRadius: 10,
                  padding: "12px 24px",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  transform: startHovered ? "translateY(-1px)" : "none",
                  alignSelf: "flex-start",
                }}
              >
                Start for free →
              </button>
              <button
                onClick={onAlreadyHaveAccount}
                onMouseEnter={() => setAcctHovered(true)}
                onMouseLeave={() => setAcctHovered(false)}
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 11,
                  letterSpacing: "0.06em",
                  background: "none",
                  color: acctHovered ? "#F5F0EA" : "rgba(245,240,234,0.6)",
                  border: `0.5px solid ${acctHovered ? "rgba(245,240,234,0.5)" : "rgba(245,240,234,0.2)"}`,
                  borderRadius: 10,
                  padding: "10px 18px",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  alignSelf: "flex-start",
                }}
              >
                I already have an account
              </button>
            </div>
          </motion.div>

          {/* Right: Mini dashboard preview */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            <div style={{
              background: "rgba(255,253,249,0.07)",
              border: "0.5px solid rgba(255,255,255,0.1)",
              borderRadius: 16,
              padding: 20,
              backdropFilter: "blur(4px)",
            }}>
              {/* Stat row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
                {[
                  { label: "Queries sent", value: "24" },
                  { label: "Active", value: "8" },
                  { label: "Response rate", value: "38%" },
                ].map(s => (
                  <div key={s.label} style={{
                    background: "rgba(220,224,217,0.12)",
                    borderRadius: 10,
                    padding: "10px 12px",
                  }}>
                    <div style={{ fontFamily: FONT_SERIF, fontSize: 20, fontWeight: 500, color: "#F8F5F0" }}>{s.value}</div>
                    <div style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.06em", color: C.dusty, marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Fake query rows */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {fakeQueries.map((q, i) => (
                  <div key={i} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: "rgba(255,255,255,0.05)",
                    borderRadius: 8,
                    padding: "8px 10px",
                  }}>
                    <div style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: statusDotColor[q.status] || C.dusty,
                      flexShrink: 0,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: FONT_SANS, fontSize: 12, fontWeight: 500, color: "#F8F5F0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {q.agent}
                      </div>
                      <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: C.dusty }}>{q.agency}</div>
                    </div>
                    <span style={{
                      fontFamily: FONT_MONO,
                      fontSize: 9,
                      color: statusDotColor[q.status] || C.dusty,
                      background: "rgba(255,255,255,0.07)",
                      borderRadius: 5,
                      padding: "2px 6px",
                    }}>
                      {q.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Literary quote strip */}
      <div style={{
        borderTop: "0.5px solid rgba(255,255,255,0.08)",
        padding: "16px 40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <p style={{
          fontFamily: FONT_SERIF,
          fontStyle: "italic",
          fontSize: 12,
          color: "rgba(245,240,234,0.4)",
          margin: 0,
          textAlign: "center",
        }}>
          "There is no greater agony than bearing an untold story inside you." — Maya Angelou
        </p>
      </div>
    </div>
  );
};

// ─── Screen 2: Warm intro ─────────────────────────────────────────────────────

const Screen2Intro: React.FC<{ onBack: () => void; onContinue: () => void; onSkip: () => void }> = ({ onBack, onContinue, onSkip }) => (
  <ModalCard step={2}>
    <div style={{ padding: "28px 28px 0", position: "relative" }}>
      <SkipButton onSkip={onSkip} />
      <ProgressDots currentStep={2} />
      <Eyebrow>Welcome to ScriptAlly</Eyebrow>
      <ModalTitle>Here's what we'll do together.</ModalTitle>
      <Subtitle>Three things — takes about two minutes.</Subtitle>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        {[
          { Icon: BookOpen, title: "Tell us about your manuscript", desc: "Just the title and genre to start. Everything else can come later." },
          { Icon: Users,    title: "Add the agents you have in mind", desc: "One by one, or import your existing spreadsheet in one go." },
          { Icon: Send,     title: "Log your first query", desc: "From that point, ScriptAlly tracks everything — so you don't have to." },
        ].map(({ Icon, title, desc }, i) => (
          <div key={i} style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            background: C.card2,
            border: `0.5px solid ${C.border}`,
            borderRadius: 12,
            padding: "12px 14px",
          }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              background: C.card3,
              border: `0.5px solid ${C.dustyBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              color: C.dusty,
            }}>
              <Icon size={15} />
            </div>
            <div>
              <div style={{ fontFamily: FONT_SANS, fontSize: 13, fontWeight: 500, color: C.ink, marginBottom: 2 }}>{title}</div>
              <div style={{ fontFamily: FONT_SANS, fontSize: 12, fontWeight: 300, color: C.muted, lineHeight: 1.5 }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quote block */}
      <div style={{
        background: C.card2,
        borderLeft: `2px solid ${C.dusty}`,
        borderRadius: "0 10px 10px 0",
        padding: "12px 16px",
        marginBottom: 8,
      }}>
        <p style={{ fontFamily: FONT_SERIF, fontStyle: "italic", fontSize: 13, color: C.mutedDark, margin: 0, lineHeight: 1.6 }}>
          "Querying is hard enough without the admin. We built ScriptAlly so you can spend your energy on the writing."
        </p>
      </div>
    </div>
    <ModalFooter onBack={onBack} onContinue={onContinue} continueLabel="Let's go →" />
  </ModalCard>
);

// ─── Screen 3: Path chooser ───────────────────────────────────────────────────

const Screen3Path: React.FC<{
  onBack: () => void;
  onContinue: () => void;
  onSkip: () => void;
  selectedPath: OnboardingPath;
  onSelectPath: (p: OnboardingPath) => void;
}> = ({ onBack, onContinue, onSkip, selectedPath, onSelectPath }) => (
  <ModalCard step={3}>
    <div style={{ padding: "28px 28px 0", position: "relative" }}>
      <SkipButton onSkip={onSkip} />
      <ProgressDots currentStep={3} />
      <Eyebrow>One quick question</Eyebrow>
      <ModalTitle>Where are you in your querying journey?</ModalTitle>
      <Subtitle>This shapes how we set things up for you.</Subtitle>

      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        <SelectableCard
          selected={selectedPath === "guided"}
          onSelect={() => onSelectPath("guided")}
          icon={<Pencil size={16} />}
          title="I'm just starting out"
          description="I haven't sent any queries yet. I want to set up properly before I begin."
          tag="Guided setup"
        />
        <SelectableCard
          selected={selectedPath === "import"}
          onSelect={() => onSelectPath("import")}
          icon={<Table size={16} />}
          title="I'm already querying"
          description="I have agents and queries in a spreadsheet. I want to bring them across."
          tag="Import from spreadsheet"
        />
        <SelectableCard
          selected={selectedPath === "skip"}
          onSelect={() => onSelectPath("skip")}
          icon={<LayoutGrid size={16} />}
          title="I'll figure it out as I go"
          description="Take me to the dashboard — I'll add things when I need to."
          tag="Skip setup"
        />
      </div>
    </div>
    <ModalFooter onBack={onBack} onContinue={onContinue} continueDisabled={!selectedPath} />
  </ModalCard>
);

// ─── Screen 4: Manuscript ─────────────────────────────────────────────────────

const GENRES = [
  "Literary Fiction", "Historical Fiction", "Fantasy", "Science Fiction",
  "Romance", "Thriller / Mystery", "Young Adult", "Middle Grade",
  "Upmarket Fiction", "Other",
];

const Screen4Manuscript: React.FC<{
  onBack: () => void;
  onContinue: (title: string, genre: string, wordCount: string, logline: string) => void;
  onSkip: () => void;
  initialTitle?: string;
  initialGenre?: string;
}> = ({ onBack, onContinue, onSkip, initialTitle = "", initialGenre = "" }) => {
  const [title, setTitle] = useState(initialTitle);
  const [genre, setGenre] = useState(initialGenre);
  const [wordCount, setWordCount] = useState("");
  const [logline, setLogline] = useState("");
  const [fieldError, setFieldError] = useState(false);

  const handleContinue = () => {
    if (!title.trim() || !genre) {
      setFieldError(true);
      return;
    }
    setFieldError(false);
    onContinue(title.trim(), genre, wordCount, logline);
  };

  return (
    <ModalCard step={4}>
      <div style={{ padding: "28px 28px 0", position: "relative" }}>
        <SkipButton onSkip={onSkip} />
        <ProgressDots currentStep={4} />
        <Eyebrow>Step 1 of 2</Eyebrow>
        <ModalTitle>Tell us about your manuscript.</ModalTitle>
        <Subtitle>Just the basics — you can add more detail any time.</Subtitle>

        <FormField label="Title" required>
          <InputField
            type="text"
            value={title}
            onChange={e => { setTitle(e.target.value); setFieldError(false); }}
            placeholder="e.g. The Book of Lost Clockworks"
          />
        </FormField>

        <FormField label="Genre" required>
          <SelectField value={genre} onChange={e => { setGenre(e.target.value); setFieldError(false); }}>
            <option value="">Select a genre…</option>
            {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
          </SelectField>
        </FormField>

        <FormField label="Word count (optional)">
          <InputField
            type="text"
            value={wordCount}
            onChange={e => setWordCount(e.target.value)}
            placeholder="e.g. 92,000"
          />
        </FormField>

        <FormField label="One-line summary (optional)">
          <InputField
            type="text"
            value={logline}
            onChange={e => setLogline(e.target.value)}
            placeholder="e.g. A Victorian clockmaker discovers her inventions are being used against her…"
          />
        </FormField>

        {fieldError && (
          <p style={{
            fontFamily: FONT_SANS,
            fontSize: 12,
            color: C.amber,
            marginBottom: 12,
            fontStyle: "italic",
          }}>
            Just a title and genre is all we need — takes 10 seconds.
          </p>
        )}

        <p style={{
          fontFamily: FONT_SANS,
          fontSize: 11,
          fontStyle: "italic",
          color: C.dusty,
          textAlign: "center",
          marginBottom: 4,
          fontWeight: 300,
        }}>
          That's all we need to get started. Everything else can come later.
        </p>
      </div>
      <ModalFooter onBack={onBack} onContinue={handleContinue} />
    </ModalCard>
  );
};

// ─── Screen 5: Agents ─────────────────────────────────────────────────────────

type AgentOption = "add" | "import" | "skip" | null;

const Screen5Agents: React.FC<{
  onBack: () => void;
  onContinue: (agentName: string, agentAgency: string, option: AgentOption) => void;
  onSkip: () => void;
  initialAgentName?: string;
  initialAgentAgency?: string;
}> = ({ onBack, onContinue, onSkip, initialAgentName = "", initialAgentAgency = "" }) => {
  const [option, setOption] = useState<AgentOption>(null);
  const [agentName, setAgentName] = useState(initialAgentName);
  const [agentAgency, setAgentAgency] = useState(initialAgentAgency);
  const [agentEmail, setAgentEmail] = useState("");
  const [agentGenres, setAgentGenres] = useState("");

  const handleContinue = () => {
    onContinue(agentName, agentAgency, option);
  };

  return (
    <ModalCard step={5}>
      <div style={{ padding: "28px 28px 0", position: "relative" }}>
        <SkipButton onSkip={onSkip} />
        <ProgressDots currentStep={5} />
        <Eyebrow>Step 2 of 2</Eyebrow>
        <ModalTitle>Now let's add your agents.</ModalTitle>
        <Subtitle>Choose whichever works best for you.</Subtitle>

        <SelectableCard
          selected={option === "add"}
          onSelect={() => setOption("add")}
          icon={<UserPlus size={16} />}
          title="Add an agent now"
          description="Enter one or two agents you have in mind — takes 60 seconds each."
          tag="Guided form"
        />

        {/* Reveal: agent add form */}
        <motion.div
          initial={false}
          animate={{ maxHeight: option === "add" ? 300 : 0, opacity: option === "add" ? 1 : 0 }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
          style={{ overflow: "hidden" }}
        >
          <div style={{ padding: "12px 4px 4px" }}>
            <FormField label="Agent name">
              <InputField
                type="text"
                value={agentName}
                onChange={e => setAgentName(e.target.value)}
                placeholder="e.g. Sarah Latham"
              />
            </FormField>
            <FormField label="Agency">
              <InputField
                type="text"
                value={agentAgency}
                onChange={e => setAgentAgency(e.target.value)}
                placeholder="e.g. Curtis Brown"
              />
            </FormField>
            <FormField label="Email (optional)">
              <InputField
                type="email"
                value={agentEmail}
                onChange={e => setAgentEmail(e.target.value)}
                placeholder="e.g. sarah@curtisbrown.co.uk"
              />
            </FormField>
            <FormField label="Genres (optional)">
              <InputField
                type="text"
                value={agentGenres}
                onChange={e => setAgentGenres(e.target.value)}
                placeholder="e.g. Literary Fiction, Historical Fiction"
              />
            </FormField>
          </div>
        </motion.div>

        <SelectableCard
          selected={option === "import"}
          onSelect={() => setOption("import")}
          icon={<Upload size={16} />}
          title="Bring my existing list"
          description="I have agents in a spreadsheet. Download our template, fill it in, upload it."
          tag="CSV import · recommended for migrators"
        />

        {/* Reveal: CSV import box */}
        <motion.div
          initial={false}
          animate={{ maxHeight: option === "import" ? 160 : 0, opacity: option === "import" ? 1 : 0 }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
          style={{ overflow: "hidden" }}
        >
          <div style={{
            border: `1.5px dashed ${C.dustyBorder}`,
            borderRadius: 12,
            padding: "16px",
            margin: "8px 4px 4px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            alignItems: "center",
          }}>
            <p style={{ fontFamily: FONT_SANS, fontSize: 12, fontWeight: 300, color: C.muted, margin: 0, textAlign: "center" }}>
              Download our CSV template, fill it in with your agents, then upload it to import everything at once.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={onSkip} style={{
                fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.06em",
                background: "none", border: `0.5px solid ${C.dustyBorder}`, color: C.muted,
                borderRadius: 8, padding: "7px 14px", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 5,
              }}>
                <Download size={12} /> Download template
              </button>
              <button onClick={onSkip} style={{
                fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.06em",
                background: C.burgundy, border: "none", color: "#f5ede8",
                borderRadius: 8, padding: "7px 14px", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 5,
              }}>
                <Upload size={12} /> Upload my spreadsheet
              </button>
            </div>
          </div>
        </motion.div>

        <SelectableCard
          selected={option === "skip"}
          onSelect={() => setOption("skip")}
          icon={<ArrowRight size={16} />}
          title="I'll add agents as I go"
          description="Take me to the dashboard — I'll add them when I'm ready to send a query."
          tag="Skip this step"
        />
      </div>
      <ModalFooter
        onBack={onBack}
        onContinue={handleContinue}
        continueLabel="Go to my dashboard →"
        continueDisabled={!option}
      />
    </ModalCard>
  );
};

// ─── Screen 6: Complete ───────────────────────────────────────────────────────

const Screen6Complete: React.FC<{
  manuscriptTitle: string;
  agentCount: number;
  onDone: () => void;
}> = ({ manuscriptTitle, agentCount, onDone }) => {
  const [hovered, setHovered] = useState(false);

  const summaryRows = [
    { label: "Manuscript", value: manuscriptTitle || undefined },
    { label: "Agents added", value: agentCount > 0 ? String(agentCount) : undefined },
    { label: "First query", value: undefined, placeholder: "Waiting for you →" },
  ];

  const nextSteps = [
    "Send your first query from the dashboard",
    "Explore the agent database and add MSWL",
    "Set response windows so you never miss a deadline",
  ];

  return (
    <ModalCard step={6}>
      {/* Accent bar already rendered in ModalCard — override top bar to green */}
      <div style={{ padding: "32px 28px 0", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        {/* Check circle */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.15 }}
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: C.card2,
            border: `1px solid ${C.dustyBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <Check size={26} color={C.greenDark} strokeWidth={2.5} />
        </motion.div>

        <Eyebrow>Setup complete</Eyebrow>
        <ModalTitle style={{ textAlign: "center" }}>You're all set, let's do this.</ModalTitle>
        <p style={{ fontFamily: FONT_SANS, fontSize: 13, fontWeight: 300, color: C.muted, lineHeight: 1.6, marginBottom: 8 }}>
          Your manuscript is ready and your agents are on file.<br />
          <em style={{ fontFamily: FONT_SERIF, fontStyle: "italic", color: C.mutedDark }}>One step closer to yes.</em>
        </p>

        {/* Summary block */}
        <div style={{
          background: C.card2,
          border: `0.5px solid ${C.border}`,
          borderRadius: 12,
          padding: "14px 16px",
          width: "100%",
          marginBottom: 20,
          textAlign: "left",
        }}>
          {summaryRows.map((row, i) => (
            <div key={i} style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingTop: i > 0 ? 10 : 0,
              paddingBottom: i < summaryRows.length - 1 ? 10 : 0,
              borderBottom: i < summaryRows.length - 1 ? `0.5px solid ${C.border}` : "none",
            }}>
              <span style={{ fontFamily: FONT_MONO, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", color: C.muted }}>
                {row.label}
              </span>
              {row.value ? (
                <span style={{ fontFamily: FONT_SANS, fontSize: 12, fontWeight: 500, color: C.ink }}>{row.value}</span>
              ) : (
                <span style={{ fontFamily: FONT_SERIF, fontSize: 12, fontStyle: "italic", color: C.dusty }}>
                  {row.placeholder || "Not added"}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Next steps */}
        <div style={{ width: "100%", marginBottom: 8 }}>
          {nextSteps.map((step, i) => (
            <div key={i} style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: C.card,
              border: `0.5px solid ${C.border}`,
              borderRadius: 10,
              padding: "10px 14px",
              marginBottom: 6,
            }}>
              <span style={{
                fontFamily: FONT_MONO,
                fontSize: 9,
                color: C.dusty,
                background: C.card2,
                borderRadius: 6,
                padding: "3px 7px",
                flexShrink: 0,
              }}>
                {i + 1}
              </span>
              <span style={{ fontFamily: FONT_SANS, fontSize: 12, fontWeight: 300, color: C.mutedDark, flex: 1, lineHeight: 1.4 }}>
                {step}
              </span>
              <ArrowRight size={12} color={C.dusty} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "16px 28px 28px" }}>
        <button
          onClick={onDone}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            width: "100%",
            fontFamily: FONT_MONO,
            fontSize: 12,
            letterSpacing: "0.06em",
            background: hovered ? C.burgundyDeep : C.burgundy,
            color: "#f5ede8",
            border: "none",
            borderRadius: 10,
            padding: "13px",
            cursor: "pointer",
            transition: "all 0.15s",
            transform: hovered ? "translateY(-1px)" : "none",
          }}
        >
          Open my dashboard →
        </button>
      </div>
    </ModalCard>
  );
};

// ─── Main Onboarding component ────────────────────────────────────────────────

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const { currentUser, manuscripts, addManuscript, addAgent, updateUserProfile } = useScriptAllyDb();

  const STORAGE_KEY = `scriptally_onboarding_progress_${currentUser?.id || "anon"}`;

  // Restore saved progress
  const loadProgress = (): Partial<ProgressData> => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return {};
  };

  const saved = loadProgress();

  // Step 0 = the new welcome / querying-stage step (the entry for a fresh signup). Existing
  // in-progress sessions resume at their saved step, so the splash (step 1) and steps 2–6 are
  // untouched.
  const [step, setStep] = useState(saved.step ?? 0);
  const [selectedPath, setSelectedPath] = useState<OnboardingPath>(saved.selectedPath ?? null);
  const [queryingStage, setQueryingStage] = useState<QueryingStage | null>(saved.queryingStage ?? null);
  // The post-welcome flow: null = on the welcome step (or the legacy resume), "understood" = the
  // cream transition beat, "A"/"B" = inside a branch. Branch C (exploring) exits immediately.
  const [flow, setFlow] = useState<"understood" | Branch | null>(null);
  const [manuscriptTitle, setManuscriptTitle] = useState(saved.manuscriptTitle ?? "");
  const [manuscriptGenre, setManuscriptGenre] = useState(saved.manuscriptGenre ?? "");
  const [agentName, setAgentName] = useState(saved.agentName ?? "");
  const [agentAgency, setAgentAgency] = useState(saved.agentAgency ?? "");
  const [agentCount, setAgentCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const saveProgress = (updates: Partial<ProgressData>) => {
    const current: ProgressData = {
      step,
      selectedPath,
      queryingStage,
      manuscriptTitle,
      manuscriptGenre,
      agentName,
      agentAgency,
      ...updates,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  };

  const goTo = (s: number) => {
    setStep(s);
    saveProgress({ step: s });
  };

  // Fire-and-forget profile write. Onboarding must never await Firestore: a field missing from
  // the rules' update allowlist is silently denied WITHOUT rejecting (see the affectedKeys
  // gotcha), so an awaited write can hang the flow forever. Each field goes in its own write so
  // one denied field can't take an allowed one down with it.
  const persistProfile = (fields: Partial<Parameters<typeof updateUserProfile>[0]>) => {
    Promise.resolve(updateUserProfile(fields)).catch((e) =>
      console.error("Onboarding profile write failed:", fields, e)
    );
  };

  // Welcome step → cream "Understood" beat → the branch the chosen stage maps to. Continue
  // persists the granular stage and the collapsed journeyStage (separate writes, non-blocking).
  const handleStageContinue = () => {
    if (!queryingStage) return;
    saveProgress({ queryingStage });
    persistProfile({ queryingStage });
    persistProfile({ journeyStage: STAGE_TO_JOURNEY[queryingStage] });
    setFlow("understood");
  };

  // "Skip setup" from the welcome step → Branch C (exploring): mark complete and go to the dashboard.
  const handleStageSkip = () => {
    void finishOnboarding({ journeyStage: "exploring" });
  };

  // After the cream beat shows (~1.2s), enter the branch the chosen stage maps to.
  useEffect(() => {
    if (flow !== "understood" || !queryingStage) return;
    const t = setTimeout(() => setFlow(STAGE_TO_BRANCH[queryingStage]), 1200);
    return () => clearTimeout(t);
  }, [flow, queryingStage]);

  // Save/limit error surfaced inside the active branch screen.
  const [branchError, setBranchError] = useState<string | null>(null);

  // The one manuscript writer for every onboarding branch (A3a, A3b, B2): shared payload shape +
  // shared Free-tier limit check, then the same addManuscript the rest of the app uses.
  // Returns the new manuscript id, or null when the save didn't land.
  const saveBranchManuscript = async (fields: ManuscriptFieldsState, status: ManuscriptStatus): Promise<string | null> => {
    const limitErr = manuscriptLimitError(currentUser?.plan, manuscripts.length);
    if (limitErr) {
      setBranchError(limitErr);
      return null;
    }
    setIsSubmitting(true);
    try {
      const res = await addManuscript(
        buildManuscriptPayload({
          title: fields.title.trim() || "Untitled manuscript",
          genre: fields.genre,
          subGenres: fields.subGenres,
          ageCategory: fields.ageCategory,
          wordCount: parseInt(fields.wordCount.replace(/\D/g, ""), 10) || 0,
          logline: fields.strapline, // the strapline IS the logline
          status,
        })
      );
      if (!res.success || !res.id) {
        setBranchError(res.error || "Couldn't save the manuscript — try again.");
        return null;
      }
      setBranchError(null);
      setManuscriptTitle(fields.title);
      saveProgress({ manuscriptTitle: fields.title, manuscriptGenre: fields.genre });
      return res.id;
    } catch (e) {
      console.error("Onboarding manuscript save failed:", e);
      setBranchError("Couldn't save the manuscript — try again.");
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  // A3a (Ready to Query / Revising): save, then continue to the existing agents step.
  const handleBranchASaveReady = async (r: BranchAResult) => {
    if (await saveBranchManuscript(r.fields, r.status)) {
      setFlow(null);
      goTo(5);
    }
  };

  // A3b (Still writing): save as Drafting, then finish onboarding straight into the agent
  // database — research-first, no query pipeline yet.
  const handleBranchAStillWriting = async (r: BranchAResult) => {
    if (await saveBranchManuscript(r.fields, r.status)) {
      sessionStorage.setItem("scriptally_post_onboarding_tab", "agents");
      await finishOnboarding();
    }
  };

  // B2: the book the pipeline attaches to — saved as Querying (no readiness question). The id is
  // kept so B3's import can attach every query to it.
  const [b2ManuscriptId, setB2ManuscriptId] = useState<string | null>(null);
  const handleBranchBSaveBook = async (fields: ManuscriptFieldsState): Promise<boolean> => {
    const id = await saveBranchManuscript(fields, ManuscriptStatus.QUERYING);
    if (id) setB2ManuscriptId(id);
    return !!id;
  };

  // The single completion path: mark onboardingComplete (+ optional journeyStage) and exit to the
  // dashboard. Every "Skip setup" and every branch finish routes through here. Writes are
  // non-blocking (see persistProfile) so a denied field can never trap the exit.
  const finishOnboarding = async (extra?: { journeyStage?: "starting" | "querying" | "exploring" }) => {
    localStorage.removeItem(STORAGE_KEY);
    if (extra?.journeyStage) persistProfile({ journeyStage: extra.journeyStage });
    persistProfile({ onboardingComplete: true });
    onComplete();
  };

  const handleSkip = () => { void finishOnboarding(); };

  const handleScreen2Continue = () => goTo(3);

  const handleScreen3Continue = () => {
    if (selectedPath === "skip") {
      handleSkip();
    } else if (selectedPath === "import") {
      handleSkip(); // send to dashboard; they'll use import nav
    } else {
      goTo(4);
    }
  };

  const handleScreen4Continue = async (title: string, genre: string, wordCount: string, logline: string) => {
    setManuscriptTitle(title);
    setManuscriptGenre(genre);
    saveProgress({ manuscriptTitle: title, manuscriptGenre: genre, step: 5 });

    if (title && genre) {
      setIsSubmitting(true);
      try {
        const wc = parseInt(wordCount.replace(/\D/g, "")) || 0;
        await addManuscript({
          title,
          genre,
          ageCategory: "Adult",
          wordCount: wc,
          logline,
          comparableTitles: "",
          status: ManuscriptStatus.READY_TO_QUERY,
        });
      } catch (e) {
        console.error("Onboarding addManuscript error:", e);
      } finally {
        setIsSubmitting(false);
      }
    }
    goTo(5);
  };

  const handleScreen5Continue = async (name: string, agency: string, agentOption: AgentOption) => {
    setAgentName(name);
    setAgentAgency(agency);
    saveProgress({ agentName: name, agentAgency: agency });

    let addedCount = 0;
    if (agentOption === "add" && name.trim()) {
      setIsSubmitting(true);
      try {
        await addAgent({
          name: name.trim(),
          agency: agency.trim(),
          email: "",
          website: "",
          genres: [],
          mswlNotes: "",
          starRating: 3,
          submissionStatus: SubmissionStatus.OPEN,
          responseTimeWeeks: 12,
          noResponseMeansNo: false,
          submissionMethod: SubmissionMethod.EMAIL,
          materialsWanted: ["Query Letter"],
          notes: "",
        });
        addedCount = 1;
      } catch (e) {
        console.error("Onboarding addAgent error:", e);
      } finally {
        setIsSubmitting(false);
      }
    }
    setAgentCount(addedCount);
    localStorage.removeItem(STORAGE_KEY);
    goTo(6);
  };

  // Overlay wrapper
  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: C.bg,
      zIndex: 9999,
      display: "flex",
      alignItems: step === 1 ? "stretch" : "center",
      justifyContent: "center",
      overflowY: "auto",
    }}>
      <ScreenTransition stepKey={flow ? FLOW_KEY[flow] : step}>
        {flow === "understood" && (
          <CenterWrap><CreamUnderstood /></CenterWrap>
        )}

        {/* Branch A — manuscript-led setup: A2 readiness → A3a details / A3b still-writing. */}
        {flow === "A" && (
          <CenterWrap>
            <BranchA
              onSkip={handleSkip}
              onExit={() => { setBranchError(null); setFlow(null); }}
              onSaveReady={(r) => void handleBranchASaveReady(r)}
              onSaveStillWriting={(r) => void handleBranchAStillWriting(r)}
              error={branchError}
            />
          </CenterWrap>
        )}

        {/* Branch B — capture the book (B2), then bring the pipeline across (B3). */}
        {flow === "B" && (
          <CenterWrap>
            <BranchB
              onSkip={handleSkip}
              onExit={() => { setBranchError(null); setFlow(null); }}
              onSaveBook={handleBranchBSaveBook}
              error={branchError}
            />
          </CenterWrap>
        )}

        {!flow && step === 0 && (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            minHeight: "100%",
            padding: "32px 16px",
            boxSizing: "border-box",
          }}>
            <WelcomeStageScreen
              selected={queryingStage}
              onSelect={(s) => { setQueryingStage(s); saveProgress({ queryingStage: s }); }}
              onContinue={handleStageContinue}
              onSkip={handleStageSkip}
            />
          </div>
        )}

        {!flow && step === 1 && (
          <Screen1Welcome
            onStart={() => goTo(2)}
            onAlreadyHaveAccount={handleSkip}
          />
        )}

        {!flow && step >= 2 && step <= 6 && (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            minHeight: "100%",
            padding: "32px 16px",
            boxSizing: "border-box",
          }}>
            {step === 2 && (
              <Screen2Intro
                onBack={() => goTo(0)}
                onContinue={handleScreen2Continue}
                onSkip={handleSkip}
              />
            )}
            {step === 3 && (
              <Screen3Path
                onBack={() => goTo(2)}
                onContinue={handleScreen3Continue}
                onSkip={handleSkip}
                selectedPath={selectedPath}
                onSelectPath={(p) => { setSelectedPath(p); saveProgress({ selectedPath: p }); }}
              />
            )}
            {step === 4 && (
              <Screen4Manuscript
                onBack={() => goTo(3)}
                onContinue={handleScreen4Continue}
                onSkip={() => { goTo(5); }}
                initialTitle={manuscriptTitle}
                initialGenre={manuscriptGenre}
              />
            )}
            {step === 5 && (
              <Screen5Agents
                onBack={() => goTo(4)}
                onContinue={handleScreen5Continue}
                onSkip={handleSkip}
                initialAgentName={agentName}
                initialAgentAgency={agentAgency}
              />
            )}
            {step === 6 && (
              <Screen6Complete
                manuscriptTitle={manuscriptTitle}
                agentCount={agentCount}
                onDone={handleSkip}
              />
            )}
          </div>
        )}
      </ScreenTransition>

      {/* Submitting overlay */}
      {isSubmitting && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(245,240,234,0.6)",
          zIndex: 10000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.muted, letterSpacing: "0.08em" }}>
            Saving…
          </span>
        </div>
      )}
    </div>
  );
};
