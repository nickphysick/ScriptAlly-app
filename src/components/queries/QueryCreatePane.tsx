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
 * .f12-card / .f12-chh column chrome, and .f12-btn-pri for the soft-pink Save (the ref draws an
 * espresso dark pill; the app has no dark-pill CTA, so the live idiom wins).
 */
import React, { useMemo, useState } from "react";
import { Agent, Manuscript } from "../../types";
import { AgentSearchField } from "../AgentSearchField";
import { F12Menu } from "../shell/F12Shell";
import { useFixedMenu } from "../forms/useFixedMenu";
import { agentInitials, agentPrimary, agentAgencyLine } from "../../lib/agentDisplay";
import {
  SAMPLE_UNITS,
  UNIT_CFG,
  snapToUnit,
  stepAmount,
  parseAmount,
  type MaterialRow,
  type SampleUnit,
} from "../../lib/agentMaterials";
import {
  CREATE_SEND_METHODS,
  draftReady,
  materialRowsForDraft,
  reminderChipLabel,
  suggestedReminderDate,
  type QueryDraft,
} from "../../lib/queryDraft";

export interface QueryCreatePaneProps {
  draft: QueryDraft;
  onChange: (next: QueryDraft) => void;
  agents: Agent[];
  manuscripts: Manuscript[];
  /** The picker's inline quick-add — the same contract LogQueryFocusForm used. */
  onCreateAgent: (d: { name: string; agency: string; email: string; responseTimeWeeks?: number; starRating?: number }) => Promise<{ ok: boolean; error?: string; agent?: Agent }>;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
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
  draft, onChange, agents, manuscripts, onCreateAgent, onSave, onCancel, saving, error,
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
  const onlyManuscript = manuscripts.length === 1 ? manuscripts[0] : null;
  const chosenManuscript = manuscripts.find((m) => m.id === draft.manuscriptId) ?? null;

  const suggested = suggestedReminderDate(draft.dateSent, agent?.responseTimeWeeks);
  const ready = draftReady(draft);
  const sample = draft.materials.find((r) => r.key === "sample") as Extract<MaterialRow, { key: "sample" }> | undefined;
  const other = draft.materials.find((r) => r.key === "other") as Extract<MaterialRow, { key: "other" }> | undefined;

  return (
    <div className="f12-detail" style={{ display: "flex", flexDirection: "column", minHeight: 0, gap: 16 }}>
      {/* ── HERO: the agent picker, resolving to the normal agent header once chosen ── */}
      <div className="f12-hero" style={{ flex: "none", alignItems: draft.agentId ? "center" : "flex-start" }}>
        {agent ? (
          <>
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
              <span className="f12-hs">New query</span>
            </div>
          </>
        ) : (
          <>
            <span
              aria-hidden="true"
              style={{
                flex: "none", width: 76, height: 76, borderRadius: "50%", background: "var(--pink-t)",
                border: "1.5px dashed var(--pink-b)", color: "var(--pink-i)", display: "flex",
                alignItems: "center", justifyContent: "center", fontSize: 26,
              }}
            >✎</span>
            <div className="qc-picker" style={{ flex: 1, minWidth: 0, maxWidth: 460 }}>
              <div style={LABEL}>Who are you querying?</div>
              <AgentSearchField
                agents={agents}
                value=""
                queriedAgentIds={new Set<string>()}
                onSelect={(a) => set({ agentId: a.id, materials: materialRowsForDraft(a) })}
                onCreateAgent={async (d) => {
                  const res = await onCreateAgent(d);
                  if (res.ok && res.agent) set({ agentId: res.agent.id, materials: materialRowsForDraft(res.agent) });
                  return res;
                }}
              />
            </div>
          </>
        )}
        <span
          style={{
            marginLeft: "auto", alignSelf: "flex-start", flex: "none",
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "0.1em",
            textTransform: "uppercase", color: "var(--faint)",
          }}
        >Esc to cancel</span>
      </div>

      {/* ── The three columns, in the reading pane's own chrome ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, flex: 1, minHeight: 0, alignItems: "stretch" }}>

        {/* 1 · THE SEND */}
        <div className="f12-card" style={{ minWidth: 0, minHeight: 0 }}>
          <div className="f12-chh">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h4l3 8 4-16 3 8h4" /></svg>
            <span>The send</span>
          </div>
          <div style={{ padding: "18px 16px", overflowY: "auto", flex: 1, minHeight: 0 }}>
            <div style={{ marginBottom: 15 }}>
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

            {/* Date + method share a row (ref): stacked, they pushed Nudge reminder below the fold
                at ordinary laptop heights, so the one field that needs a decision was the one you
                had to scroll to find. */}
            <div style={{ display: "flex", gap: 12, marginBottom: 15 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={LABEL}>Date sent</div>
              <input
                type="date"
                value={draft.dateSent}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => set({ dateSent: e.target.value })}
                aria-label="Date sent"
                style={{ ...FIELD, minHeight: 42 }}
              />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={LABEL}>Sent by</div>
              {/* Segmented: ONE container frame, equal segments, NO per-segment borders (they add
                  width and misalign the row); selection is an inset ink ring — the live idiom. */}
              <div role="group" aria-label="Sent by" style={{ display: "flex", minHeight: 42, border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>
                {CREATE_SEND_METHODS.map((m) => {
                  const on = draft.sendMethod === m.value;
                  return (
                    <button
                      key={m.value}
                      type="button"
                      aria-pressed={on}
                      onClick={() => set({ sendMethod: m.value })}
                      style={{
                        flex: 1, padding: "8px 0", border: "none", cursor: "pointer",
                        fontFamily: "inherit", fontSize: 12.5, background: "var(--panel)",
                        boxShadow: on ? "inset 0 0 0 1.5px var(--ink)" : "none",
                        color: on ? "var(--ink)" : "var(--muted)", fontWeight: on ? 600 : 400,
                      }}
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
                <input
                  type="date"
                  value={draft.reminder.date}
                  min={draft.dateSent || undefined}
                  onChange={(e) => set({ reminder: { kind: "custom", date: e.target.value } })}
                  aria-label="Reminder date"
                  style={{ ...FIELD, marginTop: 8 }}
                />
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
        </div>

        {/* 2 · WHAT YOU SENT — the checklist, pre-filled from the agent's materials-wanted */}
        <div className="f12-card" style={{ minWidth: 0, minHeight: 0 }}>
          <div className="f12-chh">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4Z" /></svg>
            <span>What you sent</span>
          </div>
          <div style={{ padding: "18px 16px", overflowY: "auto", flex: 1, minHeight: 0 }}>
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
                  <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5 }}>
                    <button type="button" className="qc-step" aria-label="Fewer" onClick={() => setRow("sample", { amount: stepAmount(sample.amount, sample.unit, -1) })}>−</button>
                    <input
                      value={sample.amount}
                      onChange={(e) => setRow("sample", { amount: e.target.value })}
                      aria-label="Sample quantity"
                      inputMode="numeric"
                      style={{ width: 46, textAlign: "center", border: "1px solid var(--line)", borderRadius: 8, padding: "5px 0", fontFamily: "inherit", fontSize: 12.5, background: "var(--panel)", color: "var(--ink)" }}
                    />
                    <button type="button" className="qc-step" aria-label="More" onClick={() => setRow("sample", { amount: stepAmount(sample.amount, sample.unit, 1) })}>+</button>
                    <select
                      value={sample.unit}
                      onChange={(e) => setRow("sample", { unit: e.target.value as SampleUnit, amount: snapToUnit(e.target.value as SampleUnit) })}
                      aria-label="Sample unit"
                      style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "5px 7px", fontFamily: "inherit", fontSize: 11.5, background: "var(--panel)", color: "var(--ink)", cursor: "pointer" }}
                    >
                      {SAMPLE_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
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
        </div>

        {/* 3 · JOURNAL — the optional first note */}
        <div className="f12-card" style={{ minWidth: 0, minHeight: 0 }}>
          <div className="f12-chh">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v13H8l-4 4z" /></svg>
            <span>Journal</span>
          </div>
          <div style={{ padding: "18px 16px", display: "flex", flex: 1, minHeight: 0 }}>
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
        </div>
      </div>

      {/* ── FOOTER: what's still needed, then Cancel / Save ── */}
      <div className="qc-foot">
        <span className="qc-req">
          {error
            ? <span style={{ color: "var(--pink-i)" }}>{error}</span>
            : "Needs an agent, a manuscript and a date — everything else can wait."}
        </span>
        <span style={{ flex: 1 }} />
        <button type="button" className="f12-btn-sec" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="button" className="f12-btn-pri" onClick={onSave} disabled={!ready || saving}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4Z" /></svg>
          {saving ? "Saving…" : "Save query"}
        </button>
      </div>
    </div>
  );
};
