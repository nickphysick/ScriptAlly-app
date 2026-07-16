/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * HousekeepingBatch — the Phase 5 batch-fix drawer. Opens for ONE housekeeping rule (a group of
 * records sharing the same gap) and fixes them together: one homogeneous field per row, one "Save
 * all" that writes each record through the EXISTING path (updateAgent / updateQueryStatus) with
 * per-row error isolation — a partial failure is reported, never silently swallowed.
 *
 * Two mute scopes, matching the stores: per-row "mute this one" → a TaskFlag snoozed to MUTED_UNTIL;
 * footer "stop asking about all of these" → the rule key in User.mutedTaskRules (updateUserProfile).
 *
 * Pro-gated assisted fill ("Find these for me"): free → the upgrade affordance (→ /plans); Pro →
 * fetchAssistedFill, which pre-fills each row's value AND shows its provenance. The writer reviews
 * every value before Save — assisted fill proposes, it never saves. The live callable is undeployed
 * (ASSIST_LIVE OFF), so a real Pro click lands on a graceful "not switched on yet" until Nick deploys.
 *
 * Theme: F12 only (rendered inside the board). StatusDot not needed here.
 */
import React, { useMemo, useState } from "react";
import { useScriptAllyDb } from "../../lib/db";
import { HkGroup, HkMember } from "../../lib/todoHousekeeping";
import { isProUser, fetchAssistedFill, AssistFillError, AssistFound, AssistConfidence } from "../../lib/assistFill";
import { flagKeyForTask, MUTED_UNTIL } from "../../lib/taskFlags";
import { Agent, QueryStatus } from "../../types";

const MATERIAL_OPTS = ["Query Letter", "Synopsis", "Sample Pages", "Full Manuscript"];

const asSet = (v: string) => new Set(v.split(",").map((s) => s.trim()).filter(Boolean));
const confDot = (c?: AssistConfidence) => (c === "high" ? "●●●" : c === "medium" ? "●●" : "●");

export interface HousekeepingBatchProps {
  group: HkGroup;
  onClose: () => void;
  onToast: (msg: string) => void;
  onNavigate: (tab: string, subPageName?: string, opts?: { agentId?: string; manuscriptId?: string }) => void;
}

export const HousekeepingBatch: React.FC<HousekeepingBatchProps> = ({ group, onClose, onToast, onNavigate }) => {
  const { currentUser, updateAgent, updateQueryStatus, upsertTaskFlag, updateUserProfile } = useScriptAllyDb();
  const { rule, meta, members } = group;
  const pro = isProUser(currentUser);
  const isClose = rule === "no_response_close";

  const [draft, setDraft] = useState<Record<string, string>>({}); // dq rows, keyed by agentId
  const [toClose, setToClose] = useState<Record<string, boolean>>({}); // no_response rows, keyed by queryId
  const [found, setFound] = useState<Record<string, AssistFound>>({});
  const [muted, setMuted] = useState<Set<string>>(new Set()); // member keys hidden after a per-row mute
  const [assisting, setAssisting] = useState(false);
  const [assistMsg, setAssistMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const live = members.filter((m) => !muted.has(m.card.key));
  const memberKey = (m: HkMember) => m.card.key;

  const fieldPatch = (v: string): Partial<Agent> => {
    if (rule === "dq_responseTime") return { responseTimeWeeks: Number(v) };
    if (rule === "dq_materials") return { materialsWanted: v.split(",").map((s) => s.trim()).filter(Boolean) };
    return { mswlNotes: v };
  };

  const pending = useMemo(() => {
    if (isClose) return live.filter((m) => toClose[m.queryId ?? ""]).length;
    return live.filter((m) => (draft[m.agentId ?? ""] ?? "").trim()).length;
  }, [isClose, live, toClose, draft]);

  async function runAssist() {
    if (!meta.assistable) return;
    if (!pro) { onNavigate("plans"); return; }
    setAssisting(true);
    setAssistMsg(null);
    try {
      const rows = await fetchAssistedFill({
        rule: rule as "dq_responseTime" | "dq_materials" | "dq_mswl",
        agents: live.filter((m) => m.agentId).map((m) => ({ agentId: m.agentId!, name: m.agentName })),
      });
      const byId: Record<string, AssistFound> = {};
      const nextDraft = { ...draft };
      for (const r of rows) { byId[r.agentId] = r; nextDraft[r.agentId] = r.value; }
      setFound((f) => ({ ...f, ...byId }));
      setDraft(nextDraft);
      setAssistMsg(rows.length ? `Found ${rows.length} — review each before saving.` : "Couldn’t find any this time.");
    } catch (e) {
      setAssistMsg(e instanceof AssistFillError ? "Assisted fill isn’t switched on yet." : "Couldn’t run assisted fill.");
    } finally {
      setAssisting(false);
    }
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    const ok: string[] = [];
    const failed: string[] = [];
    for (const m of live) {
      try {
        if (isClose) {
          if (!toClose[m.queryId ?? ""]) continue;
          await updateQueryStatus(m.queryId!, QueryStatus.NO_RESPONSE, "Marked as no response from the To-do board");
        } else {
          const v = (draft[m.agentId ?? ""] ?? "").trim();
          if (!v) continue;
          await updateAgent(m.agentId!, fieldPatch(v));
        }
        ok.push(memberKey(m));
      } catch {
        failed.push(memberKey(m));
      }
    }
    setSaving(false);
    onToast(failed.length ? `Saved ${ok.length}; ${failed.length} failed — check those rows.` : ok.length ? `Saved ${ok.length}.` : "Nothing to save.");
    onClose();
  }

  function muteOne(m: HkMember) {
    if (m.agentId) upsertTaskFlag(flagKeyForTask("data_quality_poor", m.agentId), { snoozedUntil: MUTED_UNTIL });
    else if (m.queryId) upsertTaskFlag(flagKeyForTask("no_response_close", m.queryId), { snoozedUntil: MUTED_UNTIL });
    setMuted((s) => new Set(s).add(m.card.key));
    onToast("Muted this one.");
  }
  function muteRule() {
    const next = Array.from(new Set([...(currentUser?.mutedTaskRules ?? []), rule]));
    updateUserProfile({ mutedTaskRules: next });
    onToast(`Stopped asking about ${meta.label.toLowerCase()}.`);
    onClose();
  }

  return (
    <div className="tdb-scrim" onClick={onClose}>
      <div className="tdb-batch" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="tdb-batch-h">
          <div>
            <div className="tdb-batch-eyebrow">Housekeeping · {meta.label}</div>
            <div className="tdb-batch-title">{meta.title(live.length)}</div>
          </div>
          <button type="button" className="tdb-drawer-x" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="tdb-batch-body">
          {live.length === 0 ? (
            <p className="tdb-why">All sorted — nothing left in this pile.</p>
          ) : (
            live.map((m) => {
              const id = m.agentId ?? m.queryId ?? m.card.key;
              const prov = m.agentId ? found[m.agentId] : undefined;
              return (
                <div key={m.card.key} className="tdb-batch-row">
                  <div className="tdb-batch-who">
                    <span className="tdb-miniav hk">{m.card.initials}</span>
                    <span className="tdb-batch-name">{m.agentName}</span>
                    <button type="button" className="tdb-batch-mute" title="Mute just this one" onClick={() => muteOne(m)}>Mute</button>
                  </div>

                  {isClose ? (
                    <label className="tdb-tick"><input type="checkbox" checked={!!toClose[m.queryId ?? ""]} onChange={(e) => setToClose((p) => ({ ...p, [m.queryId!]: e.target.checked }))} />Close as no response</label>
                  ) : rule === "dq_responseTime" ? (
                    <div className="tdb-batch-field"><input type="number" min={1} placeholder="weeks" value={draft[id] ?? ""} onChange={(e) => setDraft((p) => ({ ...p, [id]: e.target.value }))} /><span className="tdb-batch-unit">weeks</span></div>
                  ) : rule === "dq_materials" ? (
                    <div className="tdb-ticks">{MATERIAL_OPTS.map((mat) => {
                      const set = asSet(draft[id] ?? "");
                      return <label key={mat} className="tdb-tick"><input type="checkbox" checked={set.has(mat)} onChange={() => { set.has(mat) ? set.delete(mat) : set.add(mat); setDraft((p) => ({ ...p, [id]: Array.from(set).join(", ") })); }} />{mat}</label>;
                    })}</div>
                  ) : (
                    <textarea className="tdb-batch-textarea" placeholder="What are they looking for?" value={draft[id] ?? ""} onChange={(e) => setDraft((p) => ({ ...p, [id]: e.target.value }))} />
                  )}

                  {prov && <div className="tdb-batch-prov" title={prov.source}>✨ via web · {prov.source}<span className="tdb-batch-conf" aria-hidden>{confDot(prov.confidence)}</span></div>}
                </div>
              );
            })
          )}
        </div>

        <div className="tdb-batch-f">
          {meta.assistable && (
            <button type="button" className="tdb-btn-sec tdb-assist" disabled={assisting || live.length === 0} onClick={runAssist}>
              {assisting ? "Searching…" : pro ? "✨ Find these for me" : "✨ Find these for me (Pro)"}
            </button>
          )}
          {assistMsg && <span className="tdb-assist-msg">{assistMsg}</span>}
          <span className="tdb-sp" />
          <button type="button" className="tdb-batch-stop" onClick={muteRule}>Stop asking</button>
          <button type="button" className="tdb-btn-pri" disabled={saving || pending === 0} onClick={save}>{isClose ? `Close ${pending || ""}`.trim() : `Save ${pending || ""}`.trim()}</button>
        </div>
      </div>
    </div>
  );
};

export default HousekeepingBatch;
