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
import React, { useMemo, useState } from "react";
import { Agent, Manuscript, Query } from "../../types";
import { AgentSearchField } from "../AgentSearchField";
import {
  STEP_ORDER, STEP_SHORT, STEP_HINT, STEP_TITLE, STEP_OPTIONAL,
  stepStates, stepIndex, advance, jumpTo, nextStep, enterHint, type StepId,
} from "../../lib/createSteps";
import { stepSummaries, openQueriesWith, duplicateLine, shortDate } from "../../lib/createSummary";
import { AgentContextPanel } from "./AgentContextPanel";
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
      {!agent ? (
        <>
          <div className="qc-ask">
            <span className="qc-askav" aria-hidden="true" />
            <h2 className="qc-askq">Who are you querying?</h2>
            <div className="qc-askfield">
              <AgentSearchField
                agents={agents}
                value=""
                queriedAgentIds={new Set<string>()}
                onSelect={(a) => { setActive("when"); setReached("when"); set({ agentId: a.id, materials: materialRowsForDraft(a) }); }}
                onCreateAgent={async (d) => {
                  const res = await onCreateAgent(d);
                  if (res.ok && res.agent) set({ agentId: res.agent.id, materials: materialRowsForDraft(res.agent) });
                  return res;
                }}
              />
            </div>
          </div>
          <div className="qc-stack" aria-hidden="true">
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
        </>
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
      <div className="qc-stack" onKeyDown={onStackKeyDown}>

        {/* 1 · WHEN YOU SENT IT — send facts only: date · method · nudge. The manuscript moved
            to "What you sent", where it sits with the materials it went out with. */}
        <section className={`qc-sec qc-${states.when}`} aria-labelledby="qc-h-when">
          {states.when !== "active" && (
            <button type="button" className="qc-sum" onClick={() => jump("when")}>
              <span className="qc-tick" aria-hidden="true">{states.when === "done" ? "✓" : ""}</span>
              <b>{STEP_SHORT.when}</b>
              <span className="qc-stxt">{states.when === "done" ? summaries.when : STEP_HINT.when}</span>
              {states.when === "done" && <span className="qc-ed">Change</span>}
            </button>
          )}
          {states.when === "active" && (
            <>
              <div className="qc-shead">
                <span className="qc-n" aria-hidden="true">{stepIndex("when") + 1}</span>
                <h3 id="qc-h-when">{STEP_TITLE.when}{STEP_OPTIONAL.when && <span className="qc-opt"> · OPTIONAL</span>}</h3>
                <span className="qc-enter">{enterHint("when")}</span>
              </div>
              <div className="qc-body">
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
          </div>
            </>
          )}
        </section>

        {/* 2 · WHAT YOU SENT — the checklist, pre-filled from the agent's materials-wanted */}
        <section className={`qc-sec qc-${states.what}`} aria-labelledby="qc-h-what">
          {states.what !== "active" && (
            <button type="button" className="qc-sum" onClick={() => jump("what")}>
              <span className="qc-tick" aria-hidden="true">{states.what === "done" ? "✓" : ""}</span>
              <b>{STEP_SHORT.what}</b>
              <span className="qc-stxt">{states.what === "done" ? summaries.what : STEP_HINT.what}</span>
              {states.what === "done" && <span className="qc-ed">Change</span>}
            </button>
          )}
          {states.what === "active" && (
            <>
              <div className="qc-shead">
                <span className="qc-n" aria-hidden="true">{stepIndex("what") + 1}</span>
                <h3 id="qc-h-what">{STEP_TITLE.what}{STEP_OPTIONAL.what && <span className="qc-opt"> · OPTIONAL</span>}</h3>
                <span className="qc-enter">{enterHint("what")}</span>
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
          </div>
            </>
          )}
        </section>

        {/* 3 · JOURNAL — the optional first note */}
        <section className={`qc-sec qc-${states.notes}`} aria-labelledby="qc-h-notes">
          {states.notes !== "active" && (
            <button type="button" className="qc-sum" onClick={() => jump("notes")}>
              <span className="qc-tick" aria-hidden="true">{states.notes === "done" ? "✓" : ""}</span>
              <b>{STEP_SHORT.notes}</b>
              <span className="qc-stxt">{states.notes === "done" ? summaries.notes : STEP_HINT.notes}</span>
              {states.notes === "done" && <span className="qc-ed">Change</span>}
            </button>
          )}
          {states.notes === "active" && (
            <>
              <div className="qc-shead">
                <span className="qc-n" aria-hidden="true">{stepIndex("notes") + 1}</span>
                <h3 id="qc-h-notes">{STEP_TITLE.notes}{STEP_OPTIONAL.notes && <span className="qc-opt"> · OPTIONAL</span>}</h3>
                <span className="qc-enter">{enterHint("notes")}</span>
              </div>
              <div className="qc-body">
            <textarea
              value={draft.journal}
              onChange={(e) => set({ journal: e.target.value })}
              placeholder="First impressions, personalisation notes, anything worth remembering… (optional)"
              aria-label="First journal note"
              style={{
                flex: 1, minHeight: 90, resize: "none", border: "1px solid var(--line)", borderRadius: 12,
                padding: 13, fontFamily: "inherit", fontSize: 13, color: "var(--ink)",
                background: "var(--panel)", outline: "none",
              }}
            />
          </div>
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
