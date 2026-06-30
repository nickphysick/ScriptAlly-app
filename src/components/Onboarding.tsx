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
import { buildManuscriptPayload, manuscriptLimitError, ensureManuscriptOnce, ManuscriptIdCache } from "../lib/manuscripts";
import {
  Send,
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
const FONT_SANS   = "'Source Sans Pro', system-ui, sans-serif";
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

interface ProgressData {
  step: number;
  manuscriptTitle: string;
  manuscriptGenre: string;
  agentName: string;
  agentAgency: string;
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

  // Step 0 = the welcome / querying-stage step. Only the agents step (5) and completion (6)
  // survive from the legacy flow — a saved step pointing at a deleted screen (the old splash 1
  // or intro/path/manuscript 2–4, now covered by the branches) resumes at the welcome instead.
  const normalizeStep = (s: number | undefined): number => (s === 5 || s === 6 ? s : 0);
  const [step, setStep] = useState(normalizeStep(saved.step));
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
  // If the user entered a manuscript in Branch B then backed out here, honour it (create once) and
  // record them as querying rather than exploring.
  const handleStageSkip = async () => {
    if (b2DraftRef.current) {
      await ensureBranchBManuscript();
      await finishOnboarding({ journeyStage: "querying" });
      return;
    }
    await finishOnboarding({ journeyStage: "exploring" });
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

  // B2 (Branch B): the book the pipeline attaches to. To avoid tripping the Free-tier 1-manuscript
  // cap mid-flow, NOTHING is written here — the entered details are HELD in flow state and the
  // manuscript is created exactly once, later, at commit/finish (ensureBranchBManuscript). Held in a
  // ref alongside state so the deferred create + idempotency guard read the latest value synchronously.
  const [b2Draft, setB2Draft] = useState<ManuscriptFieldsState | null>(null);
  const b2DraftRef = useRef<ManuscriptFieldsState | null>(null);
  const b2IdCache = useRef<ManuscriptIdCache>({ id: null }); // caches the id once the single write lands

  // B2 Continue: hold the details only — no Firestore write, no cap check at this step. (The cap can
  // therefore never fire mid-flow: there are 0 manuscripts until the single commit/finish write.)
  const handleBranchBSaveBook = async (fields: ManuscriptFieldsState): Promise<boolean> => {
    setBranchError(null);
    setB2Draft(fields);
    b2DraftRef.current = fields;
    setManuscriptTitle(fields.title);
    saveProgress({ manuscriptTitle: fields.title, manuscriptGenre: fields.genre });
    return true; // advance to the pipeline step; the manuscript is created later, exactly once.
  };

  // Deferred single write: create the Branch-B manuscript from the held details exactly once.
  // Idempotent and retry-safe — once created, the id is cached, so a re-run after a partial failure
  // reuses it rather than creating a second (the cap can't be tripped by a retry, and every imported
  // query attaches to one manuscript). Returns the id, or null if there's no draft / the write failed.
  const ensureBranchBManuscript = (): Promise<string | null> =>
    ensureManuscriptOnce(b2IdCache.current, !!b2DraftRef.current, () =>
      saveBranchManuscript(b2DraftRef.current!, ManuscriptStatus.QUERYING));

  // Abandoning the manuscript path (switching the Stage-1 answer away from Branch B) forgets the held
  // draft, so a later Skip can't resurrect a manuscript the user has moved on from.
  const forgetB2Draft = () => { setB2Draft(null); b2DraftRef.current = null; b2IdCache.current = { id: null }; };

  // The single completion path: mark onboardingComplete (+ optional journeyStage) and exit to the
  // dashboard. Every "Skip setup" and every branch finish routes through here. Writes are
  // non-blocking (see persistProfile) so a denied field can never trap the exit.
  const finishOnboarding = async (extra?: { journeyStage?: "starting" | "querying" | "exploring" }) => {
    localStorage.removeItem(STORAGE_KEY);
    if (extra?.journeyStage) persistProfile({ journeyStage: extra.journeyStage });
    persistProfile({ onboardingComplete: true });
    onComplete();
  };

  // Skipping with manuscript details already entered honours them: create the manuscript once (0
  // exist mid-flow, so the cap can't fire), then finish. A skip before any details writes nothing.
  const handleSkip = async () => {
    if (b2DraftRef.current) await ensureBranchBManuscript();
    await finishOnboarding();
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
              initialBook={b2Draft}
              onEnsureManuscript={ensureBranchBManuscript}
              defaultImport={queryingStage === "early" ? "byhand" : "smart"}
              onAddByHand={async () => {
                // Manual-add finish: create the held manuscript once, then drop into the agents step.
                if (await ensureBranchBManuscript()) { setBranchError(null); setFlow(null); goTo(5); }
              }}
              onOpenImportDesk={async () => {
                // Escape hatch into the Import desk: create the manuscript first (best-effort), then finish.
                await ensureBranchBManuscript();
                sessionStorage.setItem("scriptally_post_onboarding_tab", "import");
                await finishOnboarding();
              }}
              onImportComplete={() => void finishOnboarding()}
              onUpgrade={() => {
                // Free import spent → leave onboarding into the Plans page via the existing
                // post-onboarding-tab hatch (App reads + clears it on completion).
                sessionStorage.setItem("scriptally_post_onboarding_tab", "plans");
                void finishOnboarding();
              }}
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
              onSelect={(s) => { setQueryingStage(s); saveProgress({ queryingStage: s }); if (STAGE_TO_BRANCH[s] !== "B") forgetB2Draft(); }}
              onContinue={handleStageContinue}
              onSkip={handleStageSkip}
            />
          </div>
        )}

        {/* Steps 5 (agents) and 6 (complete) are the only legacy steps left — the branches replaced
            the old intro/path/manuscript screens (2–4) and the old splash (1). */}
        {!flow && (step === 5 || step === 6) && (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            minHeight: "100%",
            padding: "32px 16px",
            boxSizing: "border-box",
          }}>
            {step === 5 && (
              <Screen5Agents
                onBack={() => goTo(0)}
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
