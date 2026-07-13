/**
 * AgentResponseGuidelines — the Contact List "Response guidelines" card (interaction layer 6c).
 * Two editable facts + a static Pro strip:
 *   • Usual response time — a number (weeks) with a "Not stated" option. Absent = not stated (the
 *     `=== 0` convention is retired). Stored unit is weeks (a units picker is a follow-up).
 *   • If they don't reply — No response means no / They reply either way / Not stated. Backed by
 *     the now-optional `noResponseMeansNo` (true / false / absent).
 *
 * These feed the expected-by logic and the composer's [No response — close it] chip — but this card
 * only STORES the writer's input; it NEVER closes a query. (Proven in the Stage-10 sweep grep.)
 * The Pro "community average" strip is static copy — nothing is wired behind it.
 */
import React, { useState } from "react";
import { deleteField } from "firebase/firestore";
import { Agent } from "../../types";

const WEEKS_MIN = 1;
const WEEKS_MAX = 52;

export const AgentResponseGuidelines: React.FC<{
  agent: Agent;
  isPro: boolean;
  updateAgent: (id: string, fields: Partial<Agent>) => Promise<void>;
  showToast: (opts: { message: string; undo?: () => void }) => void;
}> = ({ agent, isPro, updateAgent, showToast }) => {
  const stated = (agent.responseTimeWeeks ?? 0) > 0;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(stated ? String(agent.responseTimeWeeks) : "");

  const n = Number(draft);
  const draftValid = Number.isInteger(n) && n >= WEEKS_MIN && n <= WEEKS_MAX;

  const write = (fields: Partial<Agent>, message: string, prev: Partial<Agent>) =>
    void updateAgent(agent.id, fields).then(() => showToast({ message, undo: () => void updateAgent(agent.id, prev) }));

  const prevTime = (): Partial<Agent> => (agent.responseTimeWeeks != null ? { responseTimeWeeks: agent.responseTimeWeeks } : { responseTimeWeeks: deleteField() as unknown as number });
  const prevPolicy = (): Partial<Agent> => (agent.noResponseMeansNo != null ? { noResponseMeansNo: agent.noResponseMeansNo } : { noResponseMeansNo: deleteField() as unknown as boolean });

  const saveTime = () => {
    if (!draftValid) return;
    setEditing(false);
    write({ responseTimeWeeks: n }, "Response time set", prevTime());
  };
  const clearTime = () => { setEditing(false); write({ responseTimeWeeks: deleteField() as unknown as number }, "Set to not stated", prevTime()); };

  const policy: "no" | "either" | "unstated" =
    agent.noResponseMeansNo === true ? "no" : agent.noResponseMeansNo === false ? "either" : "unstated";
  const setPolicy = (next: "no" | "either" | "unstated") => {
    if (next === policy) return;
    const fields: Partial<Agent> = next === "no" ? { noResponseMeansNo: true } : next === "either" ? { noResponseMeansNo: false } : { noResponseMeansNo: deleteField() as unknown as boolean };
    write(fields, "Reply policy updated", prevPolicy());
  };

  return (
    <div className="ag-rg">
      {/* Usual response time */}
      <div className="ag-rg-row">
        <span className="ag-rg-lbl">Usual response time</span>
        {editing ? (
          <span className="ag-rg-edit">
            <input type="number" min={WEEKS_MIN} max={WEEKS_MAX} value={draft} autoFocus placeholder="e.g. 8" onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveTime(); if (e.key === "Escape") setEditing(false); }} />
            <span className="ag-rg-unit">weeks</span>
            <button type="button" className="ag-rg-save" disabled={!draftValid} onClick={saveTime}>Save</button>
            <button type="button" className="ag-rg-ns" onClick={clearTime}>Not stated</button>
          </span>
        ) : (
          <button type="button" className={`ag-rg-val${stated ? "" : " unset"}`} onClick={() => { setDraft(stated ? String(agent.responseTimeWeeks) : ""); setEditing(true); }}>
            {stated ? `Within ${agent.responseTimeWeeks} weeks` : "Not stated"}
          </button>
        )}
      </div>

      {/* If they don't reply */}
      <div className="ag-rg-row">
        <span className="ag-rg-lbl">If they don’t reply</span>
        <span className="ag-rg-seg" role="radiogroup" aria-label="If they don't reply">
          <button type="button" role="radio" aria-checked={policy === "no"} className={policy === "no" ? "on" : ""} onClick={() => setPolicy("no")}>No response means no</button>
          <button type="button" role="radio" aria-checked={policy === "either"} className={policy === "either" ? "on" : ""} onClick={() => setPolicy("either")}>They reply either way</button>
          <button type="button" role="radio" aria-checked={policy === "unstated"} className={policy === "unstated" ? "on" : ""} onClick={() => setPolicy("unstated")}>Not stated</button>
        </span>
      </div>

      {/* Pro community-average strip — STATIC copy; nothing is wired behind it. */}
      <div className={`ag-rg-pro${isPro ? "" : " locked"}`}>
        <span className="ag-rg-pro-badge">PRO</span>
        Community average response times are coming to Pro — see how this agent compares with the wider field.
      </div>
    </div>
  );
};
