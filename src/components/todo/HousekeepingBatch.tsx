/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * HousekeepingBatch — the batch-fix drawer for ONE data-quality rule (a group of agents sharing the
 * same gap). Stale queries (`no_response_close`) NEVER open this drawer — closing a query is a
 * one-off decision, handled individually via the card → TaskDetail three-way.
 *
 * Rapid rows: monogram · name · agency · (queried pip — queried agents sort first) · ONE field.
 * Chip pickers where the answer is a small set (reply window; materials ticks); text where it isn't
 * (wish list). Filled rows dim; a counter tracks progress; ✕ skips a row for the session; nothing is
 * required. Save writes ONLY filled rows through the existing `updateAgent`, per-row error
 * isolation, and offers a single "Undo all" (restores the captured previous values).
 *
 * Mute — two scopes, stated plainly (muting stops the reminder; the gap stays on the profile):
 * per-row "Mute" → a TaskFlag snoozed to MUTED_UNTIL (just this one); footer "Stop asking" → the
 * rule key in `User.mutedTaskRules` (all of them). After 2 snoozes a row proactively offers to stop
 * asking. Item-muted agents sit behind an "n muted — show" link, each with Unmute (clears the
 * snooze; the engine resurfaces them).
 *
 * Assisted fill — "Find these for me" — Pro-gated, LIVE: free users get the Pro-pill affordance
 * (routes to /plans; manual entry stays fully free); Pro users call the real `assistAgentData`
 * callable (timeout-raced — a hang never blocks the manual path). Found values pre-fill WITH
 * provenance ("Found · {source} · {date} — check before saving"); agents the look-up couldn't
 * source show "Not found — enter manually", never a fabrication. On save, a found value kept
 * UNEDITED persists its provenance to `Agent.fieldSources` (withProvenance) so a found fact is
 * never indistinguishable from a verified one. ⚠️ fieldSources rides a parked firestore.rules
 * edit — assisted saves are denied (reported as failed rows) until Nick deploys rules.
 *
 * Theme: F12 only (rendered inside the board).
 */
import React, { useMemo, useState } from "react";
import { useScriptAllyDb } from "../../lib/db";
import { HkGroup, HkMember, mutedMembersForRule } from "../../lib/todoHousekeeping";
import { isProUser, fetchAssistedFill, withProvenance, AssistFillError, AssistFound, AssistConfidence } from "../../lib/assistFill";
import { flagKeyForTask, MUTED_UNTIL } from "../../lib/taskFlags";
import { Agent } from "../../types";

const MATERIAL_OPTS = ["Query Letter", "Synopsis", "Sample Pages", "Full Manuscript"];
const WEEK_CHIPS = [4, 6, 8, 12, 16];

const asSet = (v: string) => new Set(v.split(",").map((s) => s.trim()).filter(Boolean));
const confDot = (c?: AssistConfidence) => (c === "high" ? "●●●" : c === "medium" ? "●●" : "●");
const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export interface HousekeepingBatchProps {
  group: HkGroup;
  onClose: () => void;
  onToast: (msg: string, action?: { label: string; fn: () => void }) => void;
  onNavigate: (tab: string, subPageName?: string, opts?: { agentId?: string; manuscriptId?: string }) => void;
}

export const HousekeepingBatch: React.FC<HousekeepingBatchProps> = ({ group, onClose, onToast, onNavigate }) => {
  const { currentUser, agents, taskFlags, updateAgent, upsertTaskFlag, updateUserProfile } = useScriptAllyDb();
  const { rule, meta } = group;
  const pro = isProUser(currentUser);

  const [draft, setDraft] = useState<Record<string, string>>({}); // keyed by agentId
  const [noMeansNo, setNoMeansNo] = useState<Record<string, boolean>>({});
  const [found, setFound] = useState<Record<string, AssistFound>>({});
  const [notFound, setNotFound] = useState<Set<string>>(new Set()); // asked, nothing sourced
  const [mutedLocal, setMutedLocal] = useState<Set<string>>(new Set()); // card keys hidden after a row mute
  const [skipped, setSkipped] = useState<Set<string>>(new Set()); // agentIds ✕-skipped this session
  const [showMuted, setShowMuted] = useState(false);
  const [assisting, setAssisting] = useState(false);
  const [assistAt, setAssistAt] = useState<string | null>(null); // when the look-up ran — the chip's date
  const [assistMsg, setAssistMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const live = group.members.filter((m) => !mutedLocal.has(m.card.key) && !skipped.has(m.agentId ?? ""));
  const mutedList = useMemo(() => mutedMembersForRule(rule, agents, taskFlags, Date.now()), [rule, agents, taskFlags]);

  const rowId = (m: HkMember) => m.agentId ?? m.card.key;
  const isFilled = (m: HkMember) => !!(draft[rowId(m)] ?? "").trim();
  const filledCount = live.filter(isFilled).length;

  const fieldPatch = (id: string, v: string): Partial<Agent> => {
    if (rule === "dq_responseTime") return { responseTimeWeeks: Number(v), noResponseMeansNo: !!noMeansNo[id] };
    if (rule === "dq_materials") return { materialsWanted: v.split(",").map((s) => s.trim()).filter(Boolean) };
    return { mswlNotes: v };
  };

  async function runAssist() {
    if (!meta.assistable) return;
    if (!pro) { onNavigate("plans"); return; } // the Pro affordance routes to upgrade — never a dead button
    setAssisting(true);
    setAssistMsg(null);
    const targets = live.filter((m) => m.agentId);
    try {
      const rows = await fetchAssistedFill({
        rule: rule as "dq_responseTime" | "dq_materials" | "dq_mswl",
        agents: targets.map((m) => ({ agentId: m.agentId!, name: m.agentName, ...(m.agency ? { agency: m.agency } : {}) })),
      });
      const byId: Record<string, AssistFound> = {};
      const nextDraft = { ...draft };
      for (const r of rows) { byId[r.agentId] = r; nextDraft[r.agentId] = r.value; }
      setFound((f) => ({ ...f, ...byId }));
      setDraft(nextDraft);
      setAssistAt(new Date().toISOString());
      // Honest empties: anyone asked-about with no sourced value is "not found", never fabricated.
      setNotFound(new Set(targets.map((m) => m.agentId!).filter((id) => !byId[id] && !(draft[id] ?? "").trim())));
      setAssistMsg(rows.length ? `Found ${rows.length} of ${targets.length} — check each before saving.` : "Nothing sourced this time — enter them manually.");
    } catch (e) {
      setAssistMsg(e instanceof AssistFillError && e.code === "deadline-exceeded"
        ? "Took too long — enter these manually."
        : "Couldn’t reach assisted fill — enter these manually.");
    } finally {
      setAssisting(false);
    }
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    const nowIso = new Date().toISOString();
    const ok: string[] = [];
    const failed: string[] = [];
    const prevs: { agentId: string; patch: Partial<Agent> }[] = [];
    for (const m of live) {
      const id = rowId(m);
      const v = (draft[id] ?? "").trim();
      if (!v || !m.agentId) continue; // Save writes ONLY filled rows
      const agent = agents.find((a) => a.id === m.agentId);
      try {
        let patch = fieldPatch(id, v);
        // Provenance persists ONLY when the found value is saved unedited — an edited value is the
        // writer's own, so it stays provenance-free.
        const f = found[id];
        if (f && v === f.value) patch = withProvenance(patch, meta.field!, f, agent?.fieldSources, nowIso);
        // Capture the previous values for the single "Undo all" (closest restorable values).
        if (agent) {
          const prev: Partial<Agent> = {};
          if (rule === "dq_responseTime") { prev.responseTimeWeeks = agent.responseTimeWeeks ?? 0; prev.noResponseMeansNo = agent.noResponseMeansNo ?? false; }
          else if (rule === "dq_materials") prev.materialsWanted = (agent.materialsWanted ?? []) as Agent["materialsWanted"];
          else prev.mswlNotes = agent.mswlNotes ?? "";
          if (patch.fieldSources) prev.fieldSources = agent.fieldSources ?? {};
          prevs.push({ agentId: m.agentId, patch: prev });
        }
        await updateAgent(m.agentId, patch);
        ok.push(id);
      } catch {
        failed.push(id);
      }
    }
    setSaving(false);
    const undo = prevs.length
      ? { label: "Undo all", fn: async () => { for (const u of prevs) { try { await updateAgent(u.agentId, u.patch); } catch { /* best effort */ } } } }
      : undefined;
    if (failed.length) onToast(`Saved ${ok.length}; ${failed.length} failed — check those rows.`, undo);
    else if (ok.length) onToast(`Saved ${ok.length}.`, undo);
    else onToast("Nothing to save.");
    onClose();
  }

  function muteOne(m: HkMember) {
    if (m.agentId) upsertTaskFlag(flagKeyForTask("data_quality_poor", m.agentId), { snoozedUntil: MUTED_UNTIL });
    setMutedLocal((s) => new Set(s).add(m.card.key));
    onToast("Muted this one — the gap stays on the profile.");
  }
  function unmuteOne(agentId: string) {
    upsertTaskFlag(flagKeyForTask("data_quality_poor", agentId), { snoozedUntil: null });
    onToast("Unmuted — it’ll come back to the board.");
  }
  function muteRule() {
    const next = Array.from(new Set([...(currentUser?.mutedTaskRules ?? []), rule]));
    updateUserProfile({ mutedTaskRules: next });
    onToast(`Stopped asking about ${meta.label.toLowerCase()} — the gaps stay on the profiles. Unmute from the lane header.`);
    onClose();
  }

  return (
    <div className="tdb-scrim" onClick={onClose}>
      <div className="tdb-batch" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="tdb-batch-h">
          <div>
            <div className="tdb-batch-eyebrow">Housekeeping · {meta.label}</div>
            <div className="tdb-batch-title">{meta.title(live.length)}</div>
            <div className="tdb-batch-note">
              Nothing here is required — fill what you know. Muting stops the reminder; the gap stays on the profile.
              {mutedList.length > 0 && (
                <button type="button" className="tdb-mutedlink" onClick={() => setShowMuted((s) => !s)}>
                  {mutedList.length} muted — {showMuted ? "hide" : "show"}
                </button>
              )}
            </div>
          </div>
          <span className="tdb-batch-count">{filledCount} of {live.length} filled</span>
          <button type="button" className="tdb-drawer-x" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="tdb-batch-body">
          {showMuted && mutedList.length > 0 && (
            <div className="tdb-muted-sec">
              {mutedList.map((mm) => (
                <div key={mm.agentId} className="tdb-muted-row">
                  <span className="tdb-muted-name">{mm.agentName}</span>
                  <button type="button" className="tdb-batch-mute" onClick={() => unmuteOne(mm.agentId)}>Unmute</button>
                </div>
              ))}
            </div>
          )}

          {live.length === 0 ? (
            <p className="tdb-why">All sorted — nothing left in this pile.</p>
          ) : (
            live.map((m) => {
              const id = rowId(m);
              const prov = m.agentId ? found[m.agentId] : undefined;
              const filled = isFilled(m);
              return (
                <div key={m.card.key} className={`tdb-batch-row${filled ? " filled" : ""}`}>
                  <div className="tdb-batch-who">
                    <span className="tdb-miniav hk">{m.card.initials}</span>
                    <div className="tdb-batch-id">
                      <span className="tdb-batch-name">
                        {m.agentName}
                        {m.queried && <span className="tdb-pip" title="You’ve queried this agent" />}
                      </span>
                      {m.agency && <span className="tdb-batch-agency">{m.agency}</span>}
                    </div>
                    <button type="button" className="tdb-batch-skip" title="Skip this row for now" onClick={() => setSkipped((s) => new Set(s).add(id))}>✕</button>
                    <button type="button" className="tdb-batch-mute" title="Stop asking about this one" onClick={() => muteOne(m)}>Mute</button>
                  </div>

                  {m.card.snoozes >= 2 && (
                    <div className="tdb-batch-snz">
                      Snoozed ×{m.card.snoozes} — stop asking about this one?
                      <button type="button" className="tdb-batch-mute" onClick={() => muteOne(m)}>Stop asking</button>
                    </div>
                  )}

                  {rule === "dq_responseTime" ? (
                    <div className="tdb-batch-field">
                      <span className="tdb-chips">
                        {WEEK_CHIPS.map((w) => (
                          <button key={w} type="button" className={`tdb-chip${draft[id] === String(w) ? " on" : ""}`} onClick={() => setDraft((p) => ({ ...p, [id]: String(w) }))}>{w}w</button>
                        ))}
                      </span>
                      <input type="number" min={1} placeholder="other" value={WEEK_CHIPS.includes(Number(draft[id])) ? "" : draft[id] ?? ""} onChange={(e) => setDraft((p) => ({ ...p, [id]: e.target.value }))} />
                      <label className="tdb-tick tdb-tick-inline"><input type="checkbox" checked={!!noMeansNo[id]} onChange={(e) => setNoMeansNo((p) => ({ ...p, [id]: e.target.checked }))} />No reply = no</label>
                    </div>
                  ) : rule === "dq_materials" ? (
                    <div className="tdb-ticks tdb-ticks-row">{MATERIAL_OPTS.map((mat) => {
                      const set = asSet(draft[id] ?? "");
                      return <label key={mat} className="tdb-tick"><input type="checkbox" checked={set.has(mat)} onChange={() => { set.has(mat) ? set.delete(mat) : set.add(mat); setDraft((p) => ({ ...p, [id]: Array.from(set).join(", ") })); }} />{mat}</label>;
                    })}</div>
                  ) : (
                    <textarea className="tdb-batch-textarea" placeholder="What are they looking for?" value={draft[id] ?? ""} onChange={(e) => setDraft((p) => ({ ...p, [id]: e.target.value }))} />
                  )}

                  {prov && <div className="tdb-batch-prov" title={prov.source}>✨ Found · {prov.source} · {shortDate(assistAt ?? new Date().toISOString())} — check before saving<span className="tdb-batch-conf" aria-hidden>{confDot(prov.confidence)}</span></div>}
                  {!prov && m.agentId && notFound.has(m.agentId) && !filled && <div className="tdb-batch-nf">Not found — enter manually</div>}
                </div>
              );
            })
          )}
        </div>

        <div className="tdb-batch-f">
          {meta.assistable && (
            <button type="button" className="tdb-btn-sec tdb-assist" disabled={assisting || live.length === 0} onClick={runAssist}>
              {assisting ? "Searching…" : <>✨ Find these for me{!pro && <span className="tdb-propill">Pro</span>}</>}
            </button>
          )}
          {assistMsg && <span className="tdb-assist-msg">{assistMsg}</span>}
          <span className="tdb-sp" />
          <button type="button" className="tdb-batch-stop" onClick={muteRule}>Stop asking</button>
          <button type="button" className="tdb-btn-pri" disabled={saving || filledCount === 0} onClick={save}>{`Save ${filledCount || ""}`.trim()}</button>
        </div>
      </div>
    </div>
  );
};

export default HousekeepingBatch;
