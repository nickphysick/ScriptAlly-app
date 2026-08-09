/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QueryCreatePane — inline query creation in the reading pane (ref design-refs/63-qc-create-stepper.html).
 * It REPLACES the Log-a-query popup: one flow column of four steps, beside the agent's record.
 *
 * ⚠️ ONE STACK, FOUR STEPS — THERE IS NO LONGER A STAGE BEFORE THE STEPS. Choosing the agent was
 * its own screen: a centred question with three ghost rows beneath it, swapped out wholesale the
 * moment you picked someone. Three things were wrong with that. The first thing you did was the
 * one thing the stack never showed you having done; changing your mind meant leaving the stack by
 * a separate "Change" button in a hero that existed only to hold it; and the layout the writer
 * learned in the first five seconds was replaced by a different one in the sixth.
 *
 * Agent is now step one of four. It collapses to a row like the others, states who you picked,
 * and reopens with EDIT. The hero went with it — the collapsed row carries the name and agency.
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
import { AgentSearchField } from "../AgentSearchField";
import {
  STEP_ORDER, STEP_SHORT, STEP_HINT, STEP_TITLE, STEP_OPTIONAL, STEP_LEDE,
  stepStates, stepIndex, advance, jumpTo, nextStep, prevStep, enterHint, type StepId,
} from "../../lib/createSteps";
import { stepSummaries, openQueriesWith, duplicateLine, shortDate } from "../../lib/createSummary";
import { AgentContextPanel } from "./AgentContextPanel";
import { ArtSlot } from "../todo/ArtSlot";
import { quickPicks } from "../../lib/quickPicks";
import { F12Menu } from "../shell/F12Shell";
import { useFixedMenu } from "../forms/useFixedMenu";
import { BrandDatePicker } from "../forms";
import { agentInitials, agentPrimary, agentAgencyLine } from "../../lib/agentDisplay";
import {
  SAMPLE_UNITS,
  snapToUnit,
  stepAmount,
  type MaterialRow,
} from "../../lib/agentMaterials";
import {
  CREATE_SEND_METHODS,
  materialRowsForDraft,
  reminderChipLabel,
  suggestedReminderDate,
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

  const suggested = suggestedReminderDate(draft.dateSent, agent?.responseTimeWeeks);
  const sample = draft.materials.find((r) => r.key === "sample") as Extract<MaterialRow, { key: "sample" }> | undefined;
  const other = draft.materials.find((r) => r.key === "other") as Extract<MaterialRow, { key: "other" }> | undefined;

  /* ── THE STACK'S POSITION. Local to the pane: it is presentation, not draft data — a
     half-walked stack must not make the draft dirty, and reopening create mode starts the walk
     again. `reached` never retreats (see createSteps). ── */
  /* ⚠️ THE STACK OPENS WHERE THE DRAFT ALREADY IS. `openCreate({ agentId })` is a live seam — the
     agent list's "Send query" and the reading pane both arrive with an agent already chosen — and
     under the old two-stage shape that simply meant stage 1 never rendered. As a step it does
     render, so without this the writer would be asked who they are querying while the answer sits
     in the draft. Lazy, and mount-only: the seed is a starting position, not a binding, so
     reopening the Agent step by hand must not be undone on the next render. */
  const [active, setActive] = useState<StepId>(() => (draft.agentId ? "when" : "agent"));
  const [reached, setReached] = useState<StepId>(() => (draft.agentId ? "when" : "agent"));
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
    set({ agentId: a.id, materials: materialRowsForDraft(a) });
  };

  const picks = quickPicks(agents, queries);

  const jump = (id: StepId) => { const n = jumpTo(id, reached); setActive(n.active); setReached(n.reached); };
  const step = () => { const n = advance(active, reached); setActive(n.active); setReached(n.reached); };

  /* ⚠️ ENTER ACCEPTS AND ADVANCES — except where Enter already means something. A textarea needs
     it for newlines (Notes), and an open menu needs it to choose the highlighted row (the
     manuscript picker, the unit menu), so those keep it and the stack does not steal it. On the
     LAST section there is nothing to advance to, so Enter falls through to the page's ⌘↵ save
     rather than being swallowed and looking broken. */
  const onStackKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter" || e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return;
    /* ⚠️ THE AGENT STEP KEEPS ITS OWN ENTER, ALWAYS. Inside the typeahead Enter means "take the
       highlighted agent", and the field only reports aria-expanded while its list is open — so
       the generic guard below would let Enter through on an empty field and walk the writer to
       step 2 with no agent chosen. The only way out of this step is to pick someone. */
    if (active === "agent") return;
    const el = e.target as HTMLElement;
    if (el.tagName === "TEXTAREA" || el.isContentEditable) return;
    if (el.getAttribute("aria-haspopup") || el.getAttribute("aria-expanded") === "true") return;
    if (!nextStep(active)) return;
    e.preventDefault();
    step();
  };

  /* ══ THE FOUR BODIES ═══════════════════════════════════════════════════════════════════════
     Keyed by step, and THUNKS rather than elements: only the active step's body is ever built,
     which is the same rule as "only the active body is mounted" enforced one layer earlier. */
  const BODIES: Record<StepId, () => React.ReactNode> = {

    /* 1 · AGENT — the picker and the quick picks, which used to be a stage of their own.
       ⚠️ The picker is REUSED, never rebuilt: AgentSearchField already owns the typeahead, the
       highlighted-Enter selection and the "Agent not listed? Add a new agent now" quick-add.
       Rebuilding any of that here would fork three behaviours at once. */
    agent: () => (
      <>
        {/* Bordered and lifted: it is the one thing this step asks, and the stack's focus effect
            puts the caret in it on arrival. */}
        <div className="qc-askfield">
          <AgentSearchField
            autoFocus
            agents={agents}
            value=""
            queriedAgentIds={new Set<string>()}
            onSelect={pickAgent}
            onCreateAgent={async (d) => {
              const res = await onCreateAgent(d);
              if (res.ok && res.agent) pickAgent(res.agent);
              return res;
            }}
          />
        </div>

        {/* ⚠️ NEVER AN EMPTY PANEL AND NEVER A "NO RESULTS" LINE. Both empty cases are ordinary —
            a new account, or a writer who has queried everyone — and one of them is an
            achievement. Art holds the block so the step does not collapse to a bare field. */}
        {picks.length > 0 ? (
          <div className="qc-qp qc-qp-in" aria-label="Quick picks from your contact list">
            <div className="qc-qph">
              <span className="qc-qpcap">From your contact list</span>
              <span className="qc-qpcap qc-qpnever">Never queried</span>
            </div>
            <div className="qc-qpb">
              {picks.map((a) => (
                <button type="button" className="qc-qrow" key={a.id} onClick={() => pickAgent(a)}>
                  <span className="qc-qmg" aria-hidden="true">{agentInitials(a)}</span>
                  <span className="qc-qwho">
                    <b>{agentPrimary(a)}</b>
                    <span className="qc-qag">{agentAgencyLine(a)}</span>
                  </span>
                  <span className="qc-qadded">Added {shortDate(a.dateAdded)}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="qc-qp qc-qp-in qc-qp-art">
            <div className="qc-qpb"><ArtSlot name="no-quick-picks" maxWidth={200} /></div>
          </div>
        )}
      </>
    ),

    /* 2 · WHEN YOU SENT IT — send facts only: date · method · nudge. The manuscript sits in
       "What you sent", with the materials it went out with. */
    when: () => (
      <>
            {/* Date + method share a row (ref): stacked, they pushed Nudge reminder below the fold
                at ordinary laptop heights, so the one field that needs a decision was the one you
                had to scroll to find. */}
            <div style={{ display: "flex", gap: 12, marginBottom: 15 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={LABEL}>Date sent</div>
              {/* The shared BrandDatePicker in its hub skin — never a native date input. `max`
                  keeps the "you can't have sent it tomorrow" rule the native input enforced. */}
              <BrandDatePicker
                value={draft.dateSent}
                onChange={(d) => set({ dateSent: d })}
                max={todayInputDate()}
                variant="hub"
                ariaLabel="Date sent"
                placeholder="Pick a date"
              />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={LABEL}>Sent by</div>
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
            </div>

            <div>
              <div style={LABEL}>Nudge reminder</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {suggested && (
                  <button type="button" className={`qc-chip${draft.reminder.kind === "suggested" ? " on" : ""}`} onClick={() => set({ reminder: { kind: "suggested" } })}>
                    {reminderChipLabel(suggested, draft.dateSent)}
                  </button>
                )}
                <button type="button" className={`qc-chip${draft.reminder.kind === "custom" ? " on" : ""}`} onClick={() => set({ reminder: { kind: "custom", date: draft.reminder.kind === "custom" ? draft.reminder.date : (suggested ?? draft.dateSent) } })}>
                  Pick a date
                </button>
                <button type="button" className={`qc-chip${draft.reminder.kind === "none" ? " on" : ""}`} onClick={() => set({ reminder: { kind: "none" } })}>
                  None
                </button>
              </div>
              {draft.reminder.kind === "custom" && (
                <div style={{ marginTop: 8 }}>
                  {/* `min` keeps the native input's rule: you can't be reminded before you sent it. */}
                  <BrandDatePicker
                    value={draft.reminder.date}
                    onChange={(d) => set({ reminder: { kind: "custom", date: d } })}
                    min={draft.dateSent || undefined}
                    variant="hub"
                    ariaLabel="Reminder date"
                    placeholder="Pick a date"
                  />
                </div>
              )}
              {draft.reminder.kind === "suggested" && (
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--faint)", marginTop: 7 }}>
                  {suggested
                    ? `Suggested from ${agentPrimary(agent).split(" ")[0] || "the agent"}'s typical reply time (~${agent?.responseTimeWeeks} weeks)`
                    : "No stated reply time — pick a date if you want a reminder"}
                </div>
              )}
            </div>
      </>
    ),

    /* 3 · WHAT YOU SENT — the checklist, pre-filled from the agent's materials-wanted */
    what: () => (
      <>
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
                  {row.name}
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
                      <button type="button" aria-label="Fewer" onClick={() => setRow("sample", { amount: stepAmount(sample.amount, sample.unit, -1) })}>−</button>
                      <input
                        value={sample.amount}
                        onChange={(e) => setRow("sample", { amount: e.target.value })}
                        aria-label={`Sample quantity in ${sample.unit.toLowerCase()}`}
                        inputMode="numeric"
                      />
                      <button type="button" aria-label="More" onClick={() => setRow("sample", { amount: stepAmount(sample.amount, sample.unit, 1) })}>+</button>
                    </span>
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
      </>
    ),

    /* 4 · JOURNAL — the optional first note */
    notes: () => (
      <>
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
      </>
    ),
  };

  /* ══ ONE BLOCK, FOUR TIMES ══════════════════════════════════════════════════════════════════
     Collapsed it is a row; open it is a card. The chrome is written ONCE — four copies of it is
     how the Notes head ends up a pixel out from the What head, and how a treatment added to
     three of them silently misses the fourth.

     ⚠️ THE COLLAPSED ROW STATES BOTH THE HINT AND THE VALUE (ref .srow). They were alternatives
     before — the hint until you answered, then the summary instead — so the moment a step was
     done it stopped saying what it was for, and a column of four bare values is unreadable at a
     glance. Hint left, value right. */
  const renderStep = (id: StepId) => {
    const st = states[id];
    const back = prevStep(id);
    const hint = enterHint(id);

    if (st !== "active") {
      return (
        <button type="button" className={`qc-srow qc-${st}`} onClick={() => jump(id)}>
          <i className={`qc-dot${st === "done" ? " qc-dot-done" : ""}`} aria-hidden="true" />
          <b>{STEP_SHORT[id]}</b>
          <span className="qc-shint">{STEP_HINT[id]}</span>
          <span className="qc-sval">{st === "done" ? summaries[id] : ""}</span>
          <span className="qc-sedit">EDIT</span>
          <span className="qc-schev" aria-hidden="true">›</span>
        </button>
      );
    }

    return (
      <div className={`qc-sopen${engaged ? "" : " qc-pulse"}`}>
        <div className="qc-soh">
          <i className="qc-dot qc-dot-now" aria-hidden="true" />
          <h3 id={`qc-h-${id}`}>
            {STEP_TITLE[id]}{STEP_OPTIONAL[id] && <span className="qc-opt"> · OPTIONAL</span>}
          </h3>
          <span className="qc-sof">Step {stepIndex(id) + 1} of {STEP_ORDER.length}</span>
        </div>
        <p className="qc-lede">{STEP_LEDE[id]}</p>
        <div className="qc-body">{BODIES[id]()}</div>
        {/* ⚠️ CONTINUE AND BACK ONLY — NEVER SAVE. Save, Cancel and the requirement line live in
            the page's command bar, and a Save here would give one action two homes. The agent
            step has no Continue either: picking someone IS the advance (see pickAgent), so a
            button that did the same thing a moment later would imply the choice had not landed. */}
        <div className="qc-sfoot">
          {nextStep(id) && id !== "agent" && (
            <button type="button" className="qc-cont" onClick={step}>Continue →</button>
          )}
          {back && <button type="button" className="qc-back" onClick={() => jump(back)}>← Back</button>}
          {hint && <span className="qc-enter">{hint}</span>}
        </div>
      </div>
    );
  };

  return (
    <div className="f12-detail" style={{ display: "flex", flexDirection: "column", minHeight: 0, gap: 12 }}>
      {/* ══ THE FLOW AND THE RECORD ════════════════════════════════════════════════════════
          Left: the four steps — everything you DO. Right: what is on file about the agent —
          everything you might need to KNOW while doing it. Both scroll independently so the
          page itself never does.

          ⚠️ THE PANEL IS NOT RENDERED UNTIL AN AGENT EXISTS, and the column closes up behind it
          (.qc-two-solo). An empty reference panel beside the picker would be a frame around
          nothing at the exact moment the writer has nothing to look up.

          ⚠️ AND IT IS NOT RENDERED BELOW 1100px (see .qc-two in f12.css). A squeezed context
          table is worse than none: the rows wrap to three lines each and the form loses the
          comfortable measure that is the whole reason for the 52%. ── */}
      <div className={`qc-two${agent ? "" : " qc-two-solo"}`}>
        <div className="qc-form f12-quiet-scroll">
          <div
            className="qc-stack"
            ref={stackRef}
            onKeyDown={onStackKeyDown}
            onFocusCapture={() => setEngaged(true)}
            onInput={() => setEngaged(true)}
          >
            {STEP_ORDER.map((id) => (
              <section key={id} className={`qc-sec qc-${states[id]}`} data-step={id}>
                {renderStep(id)}
                {/* ⚠️ THE DUPLICATE NOTICE BELONGS TO THE AGENT STEP, and it stays visible once
                    that step collapses — it is a fact about the choice, not about the moment of
                    choosing. A statement beside the agent, never a barrier in front of Save. */}
                {id === "agent" && dupe && agent && (
                  <p className="qc-dupe">
                    {duplicateLine(dupe, agentPrimary(agent))}
                    {onOpenQuery && (
                      <button type="button" className="qc-dupelink" onClick={() => onOpenQuery(dupe.latest.id)}>
                        {dupe.count === 1 ? "Open it" : "Open the most recent"}
                      </button>
                    )}
                  </p>
                )}
              </section>
            ))}
          </div>
          {whisperDate && (
            <p className="qc-whisper">We&rsquo;ll nudge you on {shortDate(whisperDate)} if it&rsquo;s gone quiet.</p>
          )}
        </div>
        {agent && <AgentContextPanel agent={agent} queries={queries} onOpenQuery={onOpenQuery} />}
      </div>
    </div>
  );
};
