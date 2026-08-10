/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QueryCreatePane — inline query creation in the reading pane (Queries Hub v4 P2; ref
 * design-refs/create-mode-ref.html). It REPLACES the Log-a-query popup: the same three columns
 * the reading pane already uses, filled with the fields you need to start a query.
 *
 * The draft is LOCAL STATE, owned by Queries.tsx (which also paints the pinned draft row in the
 * list). NOTHING here writes to Firestore — the parent's Save calls the existing `addQuery` path
 * with `draftToPayload`, so creation keeps one write path and one activity seed.
 *
 * Reused verbatim, never rebuilt: AgentSearchField (the typeahead AND its inline quick-add),
 * the agent list's MaterialRow model + unit physics (snapToUnit / stepAmount), the .f12-hero /
 * .f12-card / .f12-chh column chrome.
 *
 * The pane has NO footer: Save, Cancel and the requirement line live in the page's command bar,
 * which create mode takes over (ref qdb-focus-spotlight.html). Rendering them in both places
 * would give one action two homes — and the reclaimed ~95px is what lets the columns fit.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Agent, Manuscript, Query } from "../../types";
import {
  STEP_ORDER, STEP_SHORT, STEP_HINT, STEP_TITLE, STEP_OPTIONAL,
  stepStates, stepIndex, advance, jumpTo, nextStep, stackAvailable, type StepId,
} from "../../lib/createSteps";
import { stepSummaries, openQueriesWith, duplicateLine, shortDate } from "../../lib/createSummary";
import { AgentContextPanel } from "./AgentContextPanel";
import { AgentPicker } from "./AgentPicker";
import { queriedAgentIds } from "../../lib/agentPicker";
import { F12Menu } from "../shell/F12Shell";
import { useFixedMenu } from "../forms/useFixedMenu";
import { BrandDatePicker } from "../forms";
import { agentInitials, agentPrimary, agentAgencyLine } from "../../lib/agentDisplay";
import {
  SAMPLE_UNITS,
  snapToUnit,
  type MaterialRow,
} from "../../lib/agentMaterials";
import { canStep, formatQty, parseQty, stepLabel, stepQty } from "../../lib/createQty";
import {
  CREATE_SEND_METHODS,
  NUDGE_PRESETS,
  initialReminder,
  isoPlusDays,
  materialRowsForDraft,
  nudgeDerivedLine,
  todayInputDate,
  type QueryDraft, resolveReminder } from "../../lib/queryDraft";

export interface QueryCreatePaneProps {
  draft: QueryDraft;
  onChange: (next: QueryDraft) => void;
  agents: Agent[];
  manuscripts: Manuscript[];
  /** The picker's inline quick-add — the same contract LogQueryFocusForm used. */
  onCreateAgent: (d: { name: string; agency: string; email: string; responseTimeWeeks?: number; starRating?: number }) => Promise<{ ok: boolean; error?: string; agent?: Agent }>;
  /** Every query on file — for the duplicate notice. An in-memory filter; no new read. */
  queries?: Query[];
  /** Discard the draft (with the usual confirm if dirty) and open that query instead. */
  onOpenQuery?: (id: string) => void;
  /** Stage 1's "See all" / Discover routes. OMITTED rather than rendered dead when absent. */
  onSeeAllAgents?: () => void;
  onDiscover?: () => void;
  /** The last step's primary. Omitted → that step shows no save control (the header still has one). */
  /** Which steps the writer has opened — the header's chips gate their tick on this. */
  onStepsOpened?: (o: { when: boolean; what: boolean }) => void;
  onSave?: () => void;
  canSave?: boolean;
  saving?: boolean;
}

const LABEL: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace", fontSize: 8.5, letterSpacing: "0.11em",
  textTransform: "uppercase", color: "var(--faint)", marginBottom: 7,
};
const FIELD: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 8, width: "100%",
  border: "1px solid var(--line)", borderRadius: 11, padding: "10px 13px", minHeight: 42,
  background: "var(--panel)", fontSize: 13.5, color: "var(--ink)", fontFamily: "inherit",
};

export const QueryCreatePane: React.FC<QueryCreatePaneProps> = ({
  draft, onChange, agents, manuscripts, onCreateAgent,
  queries = [],
  onOpenQuery,
  onSeeAllAgents,
  onDiscover,
  onStepsOpened,
  onSave,
  canSave = false,
  saving = false,
}) => {
  const agent = useMemo(() => agents.find((a) => a.id === draft.agentId) ?? null, [agents, draft.agentId]);
  const set = (patch: Partial<QueryDraft>) => onChange({ ...draft, ...patch });
  const setRow = (key: MaterialRow["key"], patch: Record<string, unknown>) =>
    set({ materials: draft.materials.map((r) => (r.key === key ? ({ ...r, ...patch } as MaterialRow) : r)) });

  /* The manuscript field has TWO states. With one book there is nothing to choose, so it is a
     locked read-out rather than a one-option dropdown. With several it is the app's own custom
     menu (F12Menu + useFixedMenu — the same pair the Filter/Sort popovers and the reading pane's
     click-to-pick use); a native <select> renders the macOS system popup, which is badly off-brand
     and was the bug being fixed. */
  const [msMenuOpen, setMsMenuOpen] = useState(false);
  const { triggerRef: msTrigRef, menuStyle: msMenuStyle } = useFixedMenu<HTMLButtonElement>(msMenuOpen);
  /* Same reasoning for the sample UNIT — it was the second native <select> on this pane. */
  const [unitMenuOpen, setUnitMenuOpen] = useState(false);
  const { triggerRef: unitTrigRef, menuStyle: unitMenuStyle } = useFixedMenu<HTMLButtonElement>(unitMenuOpen);
  const onlyManuscript = manuscripts.length === 1 ? manuscripts[0] : null;
  const chosenManuscript = manuscripts.find((m) => m.id === draft.manuscriptId) ?? null;

  const statedWeeks = typeof agent?.responseTimeWeeks === "number" && agent.responseTimeWeeks > 0
    ? agent.responseTimeWeeks : null;
  const derivedNudge = nudgeDerivedLine(draft, agent);
  /* ⚠️ ONE SELECTOR FOR "HAS THIS AGENT BEEN QUERIED". This used to be handed an EMPTY set, so the
     field's rows all read "Not queried" while the all-queried panel counted the same agents as
     queried — two components disagreeing about one fact because they read two sources. */
  const queriedIds = useMemo(() => queriedAgentIds(queries), [queries]);
  /* The stepper's field is raw while it holds the caret and formatted the rest of the time. */
  const [qtyFocused, setQtyFocused] = useState(false);
  /* ⚠️ WHAT THE AGENT ASKED FOR, READ FROM THE SEEDED ROWS — never a second parse of their record.
     `materialRowsForDraft` already turned their stated requirements into rows; asking the agent
     again here would give two answers to one question the moment either changed. */
  const asked = useMemo(() => materialRowsForDraft(agent), [agent]);
  const requested = (key: MaterialRow["key"]) => asked.some((r) => r.key === key && r.on);
  const askedFor = (key: MaterialRow["key"]): string => {
    const r = asked.find((x) => x.key === key && x.on);
    if (!r) return "";
    const who = agentPrimary(agent).split(" ")[0] || "They";
    if (r.kind === "qty") return `${who} asks for ${formatQty(r.amount)} ${String(r.unit).toLowerCase()}`;
    return `${who} asks for this`;
  };
  /* Both popovers anchor the choice: a calendar with no "you are here" makes the writer count. */
  const longDate = (iso: string) => (iso
    ? new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : "");
  const todayLong = longDate(todayInputDate());
  const sentLong = longDate(draft.dateSent);
  /* ⚠️ THE TWO PICKERS POINT IN OPPOSITE DIRECTIONS, AND SO MUST THEIR BOUNDS AND SHORTCUTS.
     A query cannot have been sent tomorrow; a nudge cannot be scheduled for a day that has already
     passed, nor for the sending day itself — a reminder to chase something you have just sent is
     not a reminder. The nudge floor is therefore the sent date PLUS ONE DAY, and its shortcuts
     count forward FROM THE SEND, not from today: "in eight weeks" on a query posted in June means
     eight weeks after June. */
  const nudgeFloor = draft.dateSent ? isoPlusDays(draft.dateSent, 1) : todayInputDate();
  const nudgeChips = useMemo(() => {
    const base = draft.dateSent || todayInputDate();
    return [4, 8, 12].map((w) => ({
      label: `In ${w} weeks`,
      date: new Date(isoPlusDays(base, w * 7) + "T00:00:00"),
    }));
  }, [draft.dateSent]);
  const sample = draft.materials.find((r) => r.key === "sample") as Extract<MaterialRow, { key: "sample" }> | undefined;
  const other = draft.materials.find((r) => r.key === "other") as Extract<MaterialRow, { key: "other" }> | undefined;

  /* ⚠️ DECLARED AFTER `sample`, AND THAT ORDER IS LOAD-BEARING. It reads `sample.unit`, so hoisting
     it up with the other derivations puts a const in its own temporal dead zone — which `tsc` does
     catch here, but only because the reference shares this scope. Read from a helper the render
     calls and the same mistake typechecks clean. */
  const askedSample = asked.find((r) => r.key === "sample" && r.on) as Extract<MaterialRow, { key: "sample" }> | undefined;
  const statedSample = askedSample && askedSample.unit === sample?.unit ? parseQty(askedSample.amount) : null;

  /* ── THE STACK'S POSITION. Local to the pane: it is presentation, not draft data — a
     half-walked stack must not make the draft dirty, and reopening create mode starts the walk
     again. `reached` never retreats (see createSteps). ── */
  const [active, setActive] = useState<StepId>("when");
  const [reached, setReached] = useState<StepId>("when");
  const states = stepStates(active, reached);
  const summaries = stepSummaries(draft, agent, manuscripts);

  /* Non-blocking by design — see openQueriesWith. */
  const dupe = openQueriesWith(draft.agentId, queries);
  /* The reminder whisper: presentational only. ⚠️ REMINDER PERSISTENCE IS STILL STUBBED — the
     nudge date is stored on the query, but nothing schedules a notification from it. The line
     says "we'll nudge you", and until that flag lands it is a promise the app keeps only by the
     writer opening it. Flagged, not hidden. */
  const whisperDate = resolveReminder(draft, agent);

  /* ── THE ACTIVE-STEP CUE (cue D, qc-focus.html) ────────────────────────────────────────
     ⚠️ THE PULSE IS AN INVITATION, NOT A STATUS. It says "act here"; the moment the writer does,
     it has been answered and stops — and it does not return for that step. A halo still
     breathing while you type reads as an unresolved alert about the thing you are already doing.
     CSS cannot know about engagement, so the class is REMOVED rather than overridden.

     ⚠️ AND THE REAL "YOU ARE HERE" IS DOM FOCUS. The focus ring and caret are a stronger signal
     than any animation, and they are what makes Enter-through work at all: without focus inside
     the section, Enter has nothing to accept from. The pulse is the decoration; this is the
     mechanism. It is also why reduced motion loses nothing that matters. */
  const [engaged, setEngaged] = useState(false);
  const stackRef = useRef<HTMLDivElement>(null);

  /* ⚠️ REPORTED UP, NOT DUPLICATED. `reached` is the pane's own state and the chips are the
     header's, so one of them has to tell the other; deriving "opened" a second time in Queries.tsx
     would give two answers to one question the moment the stack's rules changed. */
  useEffect(() => {
    const i = stepIndex(reached);
    onStepsOpened?.({ when: i >= stepIndex("when"), what: i >= stepIndex("what") });
  }, [reached, onStepsOpened]);

  useEffect(() => {
    setEngaged(false);
    const host = stackRef.current?.querySelector<HTMLElement>(`[data-step="${active}"] .qc-body`);
    /* The first thing a writer can actually type into or press. `disabled` and negative
       tabindex are excluded so focus never lands somewhere inert. */
    const first = host?.querySelector<HTMLElement>(
      'input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])',
    );
    first?.focus();
  }, [active]);

  /* ⚠️ ONE DOOR. Typing a name, creating one inline and clicking a quick pick must do exactly
     the same thing — seed the materials from that agent and start the walk at the top — or the
     three routes into stage 2 will drift apart. */
  const pickAgent = (a: Agent) => {
    setActive("when");
    setReached("when");
    /* Everything seeded from the agent is re-derived together — the materials checklist, the
       nudge interval and the send method. A custom nudge date is left alone: the writer chose an
       absolute day, and swapping agent is not a reason to overwrite it. */
    set({
      agentId: a.id,
      materials: materialRowsForDraft(a),
      sendMethod: a.submissionMethod ?? draft.sendMethod,
      reminder: draft.reminder.kind === "custom" ? draft.reminder : initialReminder(a),
    });
  };


  /* ⚠️ A BUTTON, NOT AN INSTRUCTION. Each step's head carried `ENTER TO ACCEPT ⏎` — a sentence
     standing in for a control, which asks the writer to know a keyboard convention before they can
     move, and offers a pointer user nothing at all. Enter still commits the step; it simply stops
     being advertised, because the button now says what it does.

     ⚠️ AND IT NAMES ITS DESTINATION. "Next: What" is worth more than "Next" — the stack is short
     enough that knowing where you are going is knowing how much is left. */
  const stepFoot = (id: StepId) => {
    const next = nextStep(id);
    const back = STEP_ORDER[stepIndex(id) - 1];
    return (
      <div className="qc-sfoot">
        {back && (
          <button type="button" className="qc-back" onClick={() => jump(back)}>← Back</button>
        )}
        {next ? (
          <button type="button" className="qc-next" onClick={step}>Next: {STEP_SHORT[next]}</button>
        ) : onSave ? (
          /* ⚠️ TWO PRIMARIES, DELIBERATELY, because they act at different scopes: this finishes the
             STACK, the header's finishes the PANE. The step's takes the softer treatment so the
             header's stays the louder of the two. */
          <button type="button" className="qc-next" disabled={!canSave || saving} onClick={onSave}>
            {saving ? "Saving…" : "Save query"}
          </button>
        ) : null}
      </div>
    );
  };

  const jump = (id: StepId) => { const n = jumpTo(id, reached); setActive(n.active); setReached(n.reached); };
  const step = () => { const n = advance(active, reached); setActive(n.active); setReached(n.reached); };

  /* ⚠️ ENTER ACCEPTS AND ADVANCES — except where Enter already means something. A textarea needs
     it for newlines (Notes), and an open menu needs it to choose the highlighted row (the
     manuscript picker, the unit menu), so those keep it and the stack does not steal it. On the
     LAST section there is nothing to advance to, so Enter falls through to the page's ⌘↵ save
     rather than being swallowed and looking broken. */
  const onStackKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter" || e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return;
    const el = e.target as HTMLElement;
    if (el.tagName === "TEXTAREA" || el.isContentEditable) return;
    if (el.getAttribute("aria-haspopup") || el.getAttribute("aria-expanded") === "true") return;
    if (!nextStep(active)) return;
    e.preventDefault();
    step();
  };

  return (
    <div className="f12-detail" style={{ display: "flex", flexDirection: "column", minHeight: 0, gap: 12 }}>
      {/* ══ STAGE 1 — ONE QUESTION (ref qc-create-steps.html) ══════════════════════════════
          Before an agent is chosen the pane asks exactly one thing, centred, with nothing
          competing for the answer. The three sections wait beneath as GHOST ROWS: their
          anatomy is visible — you can see what will be asked — but nothing is asked yet.

          ⚠️ The picker is REUSED, never rebuilt: AgentSearchField already owns the typeahead,
          the highlighted-Enter selection and the "Agent not listed? Add a new agent now"
          quick-add. Rebuilding any of that here would fork three behaviours at once. ── */}
      {/* ⚠️ THE FORK IS `stackAvailable`, NOT `!agent`. Choosing the agent is a STAGE, and the
          stack is unavailable until it is answered — the one exception to required ≠ sequential,
          argued where the rule lives (lib/createSteps). Spelling the condition out here instead
          would leave the app's only sequencing rule stated nowhere anybody would look for it. */}
      {!stackAvailable(agent) ? (
        /* ══ STAGE 1 — ONE QUESTION, ONE COLUMN (ref 63-qc-create-stepper.html, step 1) ══
           ⚠️ SINGLE COLUMN, AND NO REFERENCE PANEL. No agent is chosen, so the panel has nothing
           to describe — and the picker grid is what fills the width the panel would have taken.
           The old shape put a five-row quick-picks list in a right-hand column to keep stage 1
           and stage 2 the same geometry; the grid does that job better by being the whole width,
           and matching geometry was never worth a column of suggestions nobody had asked for. ── */
        <div className="qc-two qc-two-solo">
          <div className="qc-form qc-form-ask f12-quiet-scroll">
            <h2 className="qc-askq">Who are you querying?</h2>
            <AgentPicker
              agents={agents}
              queries={queries}
              manuscriptTitle={manuscripts.find((m) => m.id === draft.manuscriptId)?.title}
              onSelect={pickAgent}
              onCreateAgent={onCreateAgent}
              onSeeAll={onSeeAllAgents}
              onDiscover={onDiscover}
            />
            {/* ⚠️ THE LEGACY FIELD IS GONE, AND THE FORM IT TRAPPED IS NOW ITS OWN COMPONENT.
                Two earlier attempts to delete this field failed for the same structural reason:
                the quick-add form lived INSIDE `AgentSearchField`, so reaching it meant mounting a
                second "Search by name or agency…" whose popup opened on focus — which is why the
                panel's "Add a new agent" appeared to open a list of existing agents. Extracting
                the form (AgentQuickAdd) is what finally removed the blocker; the picker now owns
                both entry points and one open state. */}

            {/* Pushed to the FOOT of the column (margin-top:auto): anatomy you can see without
                being asked for it. They sit where the real stack will sit. */}
            <div className="qc-stack qc-ghosts" aria-hidden="true">
              {STEP_ORDER.map((id) => (
                <div key={id} className="qc-sec qc-up">
                  <div className="qc-sum">
                    <span className="qc-tick" />
                    <b>{STEP_SHORT[id]}</b>
                    <span className="qc-stxt">{STEP_HINT[id]}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
      {/* ══ STAGE 2 — TWO COLUMNS (ref qc-create-fullscreen.html) ═════════════════════════
          Left 52%: the agent, the stack, the whisper — everything you DO. Right: what is on
          file about the agent — everything you might need to KNOW while doing it. Both scroll
          independently so the page itself never does.

          ⚠️ THE RIGHT COLUMN IS NOT RENDERED BELOW 1100px (see .qc-two in f12.css). A squeezed
          context table is worse than none: the rows wrap to three lines each and the form loses
          the comfortable measure that is the whole reason for the 52%. Below the breakpoint the
          form simply has the width to itself. ── */}
      <div className="qc-two">
        <div className="qc-form f12-quiet-scroll">
      <div className="f12-hero qc-hero" style={{ flex: "none", alignItems: "center" }}>
        <span className="f12-bigav" aria-hidden="true">{agentInitials(agent)}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap" }}>
            <span className="f12-hn">{agentPrimary(agent)}</span>
            {/* Changing your mind is one click, and it re-derives everything seeded from the
                agent — the materials checklist and the nudge suggestion both follow the new
                pick rather than silently keeping the old one's. */}
            <button type="button" className="qc-change" onClick={() => set({ agentId: null, materials: materialRowsForDraft(null) })}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
              Change
            </button>
          </div>
          <div className="f12-ha">{agentAgencyLine(agent)}</div>
          {dupe && (
            <p className="qc-dupe">
              {duplicateLine(dupe, agentPrimary(agent))}
              {onOpenQuery && (
                <button type="button" className="qc-dupelink" onClick={() => onOpenQuery(dupe.latest.id)}>
                  {dupe.count === 1 ? "Open it" : "Open the most recent"}
                </button>
              )}
            </p>
          )}
        </div>
      </div>

      {/* ── The three columns, in the reading pane's own chrome (qc-cols stacks them <md —
          Mobile Pass 1) ── */}
      <div
        className="qc-stack"
        ref={stackRef}
        onKeyDown={onStackKeyDown}
        onFocusCapture={() => setEngaged(true)}
        onInput={() => setEngaged(true)}
      >

        {/* 1 · WHEN YOU SENT IT — send facts only: date · method · nudge. The manuscript moved
            to "What you sent", where it sits with the materials it went out with. */}
        <section className={`qc-sec qc-${states.when}${states.when === "active" && !engaged ? " qc-pulse" : ""}`} data-step="when" aria-labelledby="qc-h-when">
          {states.when !== "active" && (
            <button type="button" className="qc-sum" onClick={() => jump("when")}>
              <span className="qc-tick" aria-hidden="true">{states.when === "done" ? "✓" : ""}</span>
              <b>{STEP_SHORT.when}</b>
              {states.when !== "done" && <span className="qc-stxt">{STEP_HINT.when}</span>}
              {states.when === "done" && <span className="qc-sval">{summaries.when}</span>}
              {states.when === "done" && <span className="qc-sedit">EDIT</span>}
              <span className="qc-schev" aria-hidden="true">›</span>
            </button>
          )}
          {states.when === "active" && (
            <>
              <div className="qc-shead">
                <span className="qc-n" aria-hidden="true">{stepIndex("when") + 1}</span>
                <h3 id="qc-h-when">{STEP_TITLE.when}{STEP_OPTIONAL.when && <span className="qc-opt"> · OPTIONAL</span>}</h3>
              </div>
              <div className="qc-body">
            {/* Date + method share a row (ref): stacked, they pushed Nudge reminder below the fold
                at ordinary laptop heights, so the one field that needs a decision was the one you
                had to scroll to find. */}
            <div style={{ display: "flex", gap: 12, marginBottom: 15, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={LABEL}>Date sent</div>
              {/* The shared BrandDatePicker in its hub skin — never a native date input. `max`
                  keeps the "you can't have sent it tomorrow" rule the native input enforced. */}
              <BrandDatePicker
                value={draft.dateSent}
                /* ⚠️ MOVING THE SEND CAN INVALIDATE A NUDGE THE WRITER CHOSE. Keeping an
                   impossible date would leave a reminder scheduled before the query existed, and
                   silently correcting it would move a day they picked on purpose without telling
                   them. It falls back to the preset, and the derived line says what it now is. */
                onChange={(d) => set(
                  draft.reminder.kind === "custom" && d && draft.reminder.date <= d
                    ? { dateSent: d, reminder: initialReminder(agent) }
                    : { dateSent: d },
                )}
                /* No future dates: a query cannot have been sent tomorrow. */
                max={todayInputDate()}
                variant="hub"
                ariaLabel="Date sent"
                placeholder="Pick a date"
                footnote={`Today is ${todayLong}`}
              />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={LABEL}>How you sent it</div>
              {/* Inset track (.qc-seg): the segments are children of a recessed tan track, so the
                  active pill is raised OUT of the frame rather than ringed inside it — the ink-ring
                  version overflowed its container and pushed its own label off-centre. */}
              <div role="group" aria-label="Sent by" className="qc-seg">
                {CREATE_SEND_METHODS.map((m) => {
                  const on = draft.sendMethod === m.value;
                  return (
                    <button
                      key={m.value}
                      type="button"
                      aria-pressed={on}
                      className={on ? "on" : undefined}
                      onClick={() => set({ sendMethod: m.value })}
                    >{m.label}</button>
                  );
                })}
              </div>
            </div>

            {/* ⚠️ THREE COLUMNS, ONE ROW. Date and method shared a row with the nudge beneath, which
                pushed the one field that needs a decision below the fold at ordinary laptop
                heights — so the thing you had to think about was the thing you had to scroll to
                find. All three are send facts and they belong on one line. */}
            <div style={{ flex: 1.4, minWidth: 0 }}>
              <div style={LABEL}>Nudge me after</div>
              {/* the calendar sits AMONG the presets, not beneath them: beneath, it reads as an
                  escape hatch for when the presets failed you; among them it is a fifth answer to
                  the same question, which is what it is. */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {NUDGE_PRESETS.map((w) => (
                  <button
                    key={w}
                    type="button"
                    className={`qc-chip${draft.reminder.kind === "preset" && draft.reminder.weeks === w ? " on" : ""}`}
                    onClick={() => set({ reminder: { kind: "preset", weeks: w } })}
                  >{w} wks</button>
                ))}
                {/* an agent's own figure gets its own chip when it is not one of the three —
                    otherwise choosing "their turnaround" would mean picking the preset nearest to
                    it, which is a different interval wearing their name. */}
                {statedWeeks && !NUDGE_PRESETS.includes(statedWeeks) && (
                  <button
                    type="button"
                    className={`qc-chip${draft.reminder.kind === "preset" && draft.reminder.weeks === statedWeeks ? " on" : ""}`}
                    onClick={() => set({ reminder: { kind: "preset", weeks: statedWeeks } })}
                  >{statedWeeks} wks</button>
                )}
                <span className="qc-chipcal">
                  <BrandDatePicker
                    value={draft.reminder.kind === "custom" ? draft.reminder.date : ""}
                    onChange={(d) => set(d
                      ? { reminder: { kind: "custom", date: d } }
                      : { reminder: initialReminder(agent) })}
                    min={nudgeFloor}
                    quickChips={nudgeChips}
                    variant="hub"
                    ariaLabel="Pick a nudge date"
                    placeholder="Pick a date"
                    footnote={sentLong ? `Sent ${sentLong}` : undefined}
                  />
                </span>
                <button type="button" className={`qc-chip${draft.reminder.kind === "none" ? " on" : ""}`} onClick={() => set({ reminder: { kind: "none" } })}>
                  No nudge
                </button>
              </div>
              {derivedNudge && <div className="qc-derived">{derivedNudge}</div>}
            </div>
            </div>
          </div>
              {stepFoot("when")}
            </>
          )}
        </section>

        {/* 2 · WHAT YOU SENT — the checklist, pre-filled from the agent's materials-wanted */}
        <section className={`qc-sec qc-${states.what}${states.what === "active" && !engaged ? " qc-pulse" : ""}`} data-step="what" aria-labelledby="qc-h-what">
          {states.what !== "active" && (
            <button type="button" className="qc-sum" onClick={() => jump("what")}>
              <span className="qc-tick" aria-hidden="true">{states.what === "done" ? "✓" : ""}</span>
              <b>{STEP_SHORT.what}</b>
              {states.what !== "done" && <span className="qc-stxt">{STEP_HINT.what}</span>}
              {states.what === "done" && <span className="qc-sval">{summaries.what}</span>}
              {states.what === "done" && <span className="qc-sedit">EDIT</span>}
              <span className="qc-schev" aria-hidden="true">›</span>
            </button>
          )}
          {states.what === "active" && (
            <>
              <div className="qc-shead">
                <span className="qc-n" aria-hidden="true">{stepIndex("what") + 1}</span>
                <h3 id="qc-h-what">{STEP_TITLE.what}{STEP_OPTIONAL.what && <span className="qc-opt"> · OPTIONAL</span>}</h3>
              </div>
              <div className="qc-body">
            <div style={{ marginBottom: 0 }}>
              <div style={LABEL}>Manuscript</div>
              {onlyManuscript ? (
                <div style={{ ...FIELD, background: "var(--paper)", color: "var(--ink-2)" }} aria-label={`Manuscript: ${onlyManuscript.title}`}>
                  <span className="qc-bk" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M5 3h11l3 3v15H5zM9 3v6l2-1 2 1V3" /></svg>
                  </span>
                  <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{onlyManuscript.title}</span>
                  <span style={{ marginLeft: "auto", flex: "none", fontFamily: "'JetBrains Mono', monospace", fontSize: 8.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--faint)" }}>Only manuscript</span>
                </div>
              ) : (
                <span className="f12-popwrap" style={{ display: "block" }}>
                  <button
                    ref={msTrigRef}
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={msMenuOpen}
                    aria-label={`Manuscript: ${chosenManuscript?.title ?? "none chosen"}`}
                    onClick={() => setMsMenuOpen((o) => !o)}
                    style={{ ...FIELD, cursor: "pointer", textAlign: "left" }}
                  >
                    <span className="qc-bk" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M5 3h11l3 3v15H5zM9 3v6l2-1 2 1V3" /></svg>
                    </span>
                    <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{chosenManuscript?.title ?? manuscripts[0]?.title ?? ""}</span>
                    <span aria-hidden="true" style={{ marginLeft: "auto", flex: "none", fontSize: 10, color: "var(--faint)" }}>▾</span>
                  </button>
                  <F12Menu
                    open={msMenuOpen}
                    onClose={() => setMsMenuOpen(false)}
                    style={msMenuStyle}
                    ariaLabel="Choose a manuscript"
                    items={manuscripts.map((m) => ({
                      label: m.title,
                      icon: m.id === draft.manuscriptId ? <span aria-hidden="true">✓</span> : undefined,
                      onClick: () => { set({ manuscriptId: m.id }); setMsMenuOpen(false); },
                    }))}
                  />
                </span>
              )}
            </div>
            {/* the hairline that separates WHICH book from WHAT went with it */}
            <div style={{ height: 1, background: "var(--line)", margin: "15px 0" }} />
            {draft.materials.map((row) => {
              if (row.key === "sample") return null; // rendered below, with its quantity control
              if (row.key === "other") return null;
              return (
                <button key={row.key} type="button" className={`qc-mat${row.on ? " on" : ""}`} onClick={() => setRow(row.key, { on: !row.on })}>
                  <span className="qc-ck" aria-hidden="true">{row.on ? "✓" : ""}</span>
                  <span className="qc-matn">{row.name}</span>
                  {/* ⚠️ THE SUB-LABEL REPORTS, IT NEVER APPRAISES. It states what the agent asked
                      for and stops. Sending something different is the writer's business and gets
                      no warning, no colour and no "less than requested" — this record says what
                      you sent, not whether the app approves. */}
                  {askedFor(row.key) && <span className="qc-matsub">{askedFor(row.key)}</span>}
                  <span className={`qc-matreq${requested(row.key) ? " on" : ""}`}>
                    {requested(row.key) ? "Requested" : "Not requested"}
                  </span>
                </button>
              );
            })}

            {sample && (
              <div className={`qc-mat${sample.on ? " on" : ""}`} style={{ cursor: "default" }}>
                <button type="button" className="qc-ck" aria-pressed={sample.on} aria-label="Sample materials" onClick={() => setRow("sample", { on: !sample.on, amount: sample.amount || snapToUnit(sample.unit) })}>
                  {sample.on ? "✓" : ""}
                </button>
                <span style={{ cursor: "pointer" }} onClick={() => setRow("sample", { on: !sample.on, amount: sample.amount || snapToUnit(sample.unit) })}>Sample materials</span>
                {sample.on && (
                  /* The quantity control (ref qdb-create-fixes2 §3). The PHYSICS is not
                     re-implemented here: stepAmount / snapToUnit / UNIT_CFG come from
                     lib/agentMaterials, the same module the agent form's Materials tab runs on, so
                     the two can never disagree about what a sensible quantity is. Only the skin
                     differs — an editor row and a create field are allowed to look different.

                     The value is an INPUT, not a read-out: 5,000 words is typed, never stepped. */
                  <span className="qc-qty">
                    <span className="qc-stp">
                      <button
                        type="button"
                        aria-label="Fewer"
                        disabled={!canStep(sample.amount, sample.unit, -1, statedSample)}
                        onClick={() => setRow("sample", { amount: String(stepQty(sample.amount, sample.unit, -1, statedSample)) })}
                      >−</button>
                      <input
                        value={qtyFocused ? sample.amount : formatQty(sample.amount)}
                        /* ⚠️ TYPING ALWAYS OVERRIDES — no snapping, ever. The ladder is what the
                           ARROWS offer; a writer who types 37 sent 37, and a stepper that
                           "corrected" it would overwrite a fact with a convenience. */
                        onChange={(e) => setRow("sample", { amount: String(parseQty(e.target.value)) })}
                        onFocus={() => setQtyFocused(true)}
                        onBlur={() => setQtyFocused(false)}
                        onKeyDown={(e) => {
                          /* ↑/↓ do what the arrows do, so the keyboard is not a second-class way
                             to use this control. */
                          if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
                          e.preventDefault();
                          const dir = e.key === "ArrowUp" ? 1 : -1;
                          setRow("sample", { amount: String(stepQty(sample.amount, sample.unit, dir, statedSample)) });
                        }}
                        aria-label={`Sample quantity in ${sample.unit.toLowerCase()}`}
                        inputMode="numeric"
                      />
                      <button
                        type="button"
                        aria-label="More"
                        disabled={!canStep(sample.amount, sample.unit, 1, statedSample)}
                        onClick={() => setRow("sample", { amount: String(stepQty(sample.amount, sample.unit, 1, statedSample)) })}
                      >+</button>
                    </span>
                    <span className="qc-stpn" aria-hidden="true">{stepLabel(sample.unit)}</span>
                    <span className="f12-popwrap" style={{ display: "inline-flex" }}>
                      <button
                        ref={unitTrigRef}
                        type="button"
                        className="qc-unit"
                        aria-haspopup="menu"
                        aria-expanded={unitMenuOpen}
                        aria-label={`Sample unit: ${sample.unit}`}
                        onClick={() => setUnitMenuOpen((o) => !o)}
                      >
                        {sample.unit}
                        <span className="qc-cv" aria-hidden="true">▾</span>
                      </button>
                      <F12Menu
                        open={unitMenuOpen}
                        onClose={() => setUnitMenuOpen(false)}
                        style={unitMenuStyle}
                        ariaLabel="Sample unit"
                        items={SAMPLE_UNITS.map((u) => ({
                          label: u,
                          icon: u === sample.unit ? <span aria-hidden="true">✓</span> : undefined,
                          /* SNAP, never convert — 3 chapters must not become 3 words. */
                          onClick: () => { setRow("sample", { unit: u, amount: snapToUnit(u) }); setUnitMenuOpen(false); },
                        }))}
                      />
                    </span>
                  </span>
                )}
              </div>
            )}

            {other && (
              <div className={`qc-mat${other.on ? " on" : ""}`} style={{ cursor: "default" }}>
                <button type="button" className="qc-ck" aria-pressed={other.on} aria-label="Other materials" onClick={() => setRow("other", { on: !other.on })}>
                  {other.on ? "✓" : ""}
                </button>
                {other.on ? (
                  <input
                    autoFocus
                    value={other.text}
                    placeholder="What else did you send?"
                    onChange={(e) => setRow("other", { text: e.target.value })}
                    onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                    aria-label="Other materials"
                    style={{ flex: 1, minWidth: 0, border: "none", background: "transparent", fontFamily: "inherit", fontSize: 13.5, color: "var(--ink)", outline: "none" }}
                  />
                ) : (
                  <span style={{ cursor: "pointer" }} onClick={() => setRow("other", { on: true })}>Other…</span>
                )}
              </div>
            )}

            {!agent && (
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--faint)", marginTop: 12 }}>
                Pick an agent and this fills in from what they ask for
              </div>
            )}
          </div>
              {stepFoot("what")}
            </>
          )}
        </section>

        {/* 3 · JOURNAL — the optional first note */}
        <section className={`qc-sec qc-${states.notes}${states.notes === "active" && !engaged ? " qc-pulse" : ""}`} data-step="notes" aria-labelledby="qc-h-notes">
          {states.notes !== "active" && (
            <button type="button" className="qc-sum" onClick={() => jump("notes")}>
              <span className="qc-tick" aria-hidden="true">{states.notes === "done" ? "✓" : ""}</span>
              <b>{STEP_SHORT.notes}</b>
              {states.notes !== "done" && <span className="qc-stxt">{STEP_HINT.notes}</span>}
              {states.notes === "done" && <span className="qc-sval">{summaries.notes}</span>}
              {states.notes === "done" && <span className="qc-sedit">EDIT</span>}
              <span className="qc-schev" aria-hidden="true">›</span>
            </button>
          )}
          {states.notes === "active" && (
            <>
              <div className="qc-shead">
                <span className="qc-n" aria-hidden="true">{stepIndex("notes") + 1}</span>
                <h3 id="qc-h-notes">{STEP_TITLE.notes}{STEP_OPTIONAL.notes && <span className="qc-opt"> · OPTIONAL</span>}</h3>
              </div>
              <div className="qc-body">
            {/* ⚠️ THE NOTE FILLS ITS STEP (ref qc-stage1.html, variant A). It was a small inset
                box in a three-column layout — a field you could not think in. Full width of the
                body, 104px to start, and resizable DOWNWARD as well as up because a writer who
                wants two lines should be able to have two lines.
                No ruled lines and no caption bar above it: the head already says "Notes ·
                OPTIONAL", and a second label would be the third thing on screen saying the same. */}
            <textarea
              className="qc-note"
              value={draft.journal}
              onChange={(e) => set({ journal: e.target.value })}
              placeholder="First impressions, personalisation notes, anything worth remembering…"
              aria-label="First journal note"
            />
            {/* One line, beneath — what happens to it and who sees it. */}
            <p className="qc-notecap">Saved with this query · only you see it</p>
          </div>
              {stepFoot("notes")}
            </>
          )}
        </section>
      </div>
      {whisperDate && (
        <p className="qc-whisper">We&rsquo;ll nudge you on {shortDate(whisperDate)} if it&rsquo;s gone quiet.</p>
      )}
        </div>
        <AgentContextPanel agent={agent} queries={queries} onOpenQuery={onOpenQuery} />
      </div>
        </>
      )}
    </div>
  );
};
