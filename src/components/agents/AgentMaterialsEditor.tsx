/**
 * AgentMaterialsEditor — the Contact List "Materials" card, made editable (interaction layer 6d).
 *
 * Reads/writes `agent.materialsWanted` (stored `string[]`) through the ONE canonical model,
 * `lib/agentMaterials` (parse → structured state → edit → build). The 6d vocabulary lives there:
 * Query letter / Author bio (binary), Synopsis (optional pages), Sample pages / chapters / words
 * (quantified), Full manuscript (binary), Other (free text). Legacy stored strings still parse.
 *
 * Interaction contract (matches AgentResponseGuidelines): a read-only summary with an Edit affordance
 * → an inline pill editor → one optimistic write per Save, with an undo toast that restores the exact
 * prior value (an empty selection clears the field via deleteField, per the absence=not-stated law).
 * Nothing auto-writes; Cancel discards.
 */
import React, { useState } from "react";
import { deleteField } from "firebase/firestore";
import { Agent } from "../../types";
import {
  AgentMaterialsState,
  MAT_OPTS,
  MAT_QTY,
  parseAgentMaterials,
  buildAgentMaterials,
  materialsCountErrors,
} from "../../lib/agentMaterials";

const sameList = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

export const AgentMaterialsEditor: React.FC<{
  agent: Agent;
  updateAgent: (id: string, fields: Partial<Agent>) => Promise<void>;
  showToast: (opts: { message: string; undo?: () => void }) => void;
}> = ({ agent, updateAgent, showToast }) => {
  const current = agent.materialsWanted ?? [];
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<AgentMaterialsState>(() => parseAgentMaterials(current));

  const bad = materialsCountErrors(draft);

  const openEditor = () => { setDraft(parseAgentMaterials(current)); setEditing(true); };
  const toggle = (opt: string) =>
    setDraft((d) => ({ ...d, selected: d.selected.includes(opt) ? d.selected.filter((o) => o !== opt) : [...d.selected, opt] }));
  const setCount = (opt: string, v: string) =>
    setDraft((d) => ({ ...d, counts: { ...d.counts, [opt]: v.replace(/\D/g, "") } }));

  const write = (fields: Partial<Agent>, message: string, prev: Partial<Agent>) =>
    void updateAgent(agent.id, fields).then(() => showToast({ message, undo: () => void updateAgent(agent.id, prev) }));

  const save = () => {
    if (bad.size > 0) return;
    setEditing(false);
    const built = buildAgentMaterials(draft);
    if (sameList(built, current)) return; // no change → no write, no toast
    const prev: Partial<Agent> = current.length
      ? { materialsWanted: current }
      : { materialsWanted: deleteField() as unknown as string[] };
    const fields: Partial<Agent> = built.length
      ? { materialsWanted: built }
      : { materialsWanted: deleteField() as unknown as string[] };
    write(fields, built.length ? "Materials updated" : "Materials cleared", prev);
  };

  const showRows = draft.selected.some((o) => MAT_QTY[o]) || draft.selected.includes("Other");

  if (!editing) {
    return (
      <div className="agm">
        {current.length ? (
          <div className="agm-current">{current.join(", ")}</div>
        ) : (
          <div className="agm-current unset">Not specified yet</div>
        )}
        <button type="button" className="agm-edit" onClick={openEditor}>
          {current.length ? "Edit materials" : "Add materials"}
        </button>
      </div>
    );
  }

  return (
    <div className="agm agm-editing">
      <div className="agm-pills">
        {MAT_OPTS.map((opt) => (
          <button
            key={opt}
            type="button"
            className={`agm-pill${draft.selected.includes(opt) ? " on" : ""}`}
            aria-pressed={draft.selected.includes(opt)}
            onClick={() => toggle(opt)}
          >
            {opt}
          </button>
        ))}
      </div>

      {showRows && (
        <div className="agm-rows">
          {MAT_OPTS.filter((o) => MAT_QTY[o] && draft.selected.includes(o)).map((opt) => {
            const q = MAT_QTY[opt];
            return (
              <label key={opt} className="agm-row">
                <span className="agm-row-lbl">{opt}</span>
                <input
                  className={bad.has(opt) ? "bad" : ""}
                  inputMode="numeric"
                  placeholder={q.placeholder}
                  value={draft.counts[opt] || ""}
                  onChange={(e) => setCount(opt, e.target.value)}
                />
                <span className="agm-row-unit">{q.unit}</span>
              </label>
            );
          })}
          {draft.selected.includes("Other") && (
            <label className="agm-row other">
              <input
                placeholder="Specify other materials…"
                value={draft.otherText}
                onChange={(e) => setDraft((d) => ({ ...d, otherText: e.target.value }))}
              />
            </label>
          )}
        </div>
      )}

      <div className="agm-actions">
        <button type="button" className="agm-save" disabled={bad.size > 0} onClick={save}>Save</button>
        <button type="button" className="agm-cancel" onClick={() => setEditing(false)}>Cancel</button>
      </div>
    </div>
  );
};
