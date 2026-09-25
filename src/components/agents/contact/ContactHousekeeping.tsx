/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ContactHousekeeping — the rail's body (v11 §9.3): the two groupings, the gap sections, and
 * the three direct fixes. Everything ASKED here routes to the pop-up editor at the right
 * section (the Also-changes discipline is seen there); everything WRITTEN here is a fix whose
 * consequences the writer can already see — the inline window (stub-0 agents with NO live
 * query, ruling c: with a live query the reply note must be seen, so "Add" opens the editor),
 * the CHECKED stamp, and the reopen reminder (a dated UserTask, ruling b).
 *
 * ⚠️ THE WRITES GO THROUGH THE PAGE'S HANDLERS, WHICH GO THROUGH THE CONTEXT — `updateAgent` /
 * `addUserTask` — the hkSave discipline (lib/hkSave.ts): the same writer To-do's rail uses,
 * the dq task flag resolved when a fix was the agent's last data-quality gap, and the lab able
 * to stub the lot, which is what lets the fix choreography be measured over known content.
 */
import React, { useState } from "react";
import type { Agent } from "../../../types";
import { agentInitials, agentPrimary } from "../../../lib/agentDisplay";
import { GapKey, HkAgentRow, HkModel, gapChipLabel, remindLabel } from "../../../lib/contactHousekeeping";
import type { FormSection } from "./ContactAgentForm";

export type HkGrouping = "unlocks" | "agent";
const HK_GROUP_KEY = "sa.hkGrouping";

/** the editor section each gap's Add opens (§9.3's action column) */
const GAP_SECTION: Record<Exclude<GapKey, "reopen" | "recheck">, FormSection> = {
  reply: "who", genres: "genres", wishlist: "wishlist", materials: "materials",
};

export interface ContactHousekeepingProps {
  model: HkModel;
  onOpen: (agentId: string) => void;
  onEditAt: (agentId: string, section: FormSection) => void;
  onInlineSave: (agentId: string, weeks: number) => Promise<void>;
  onChecked: (agentId: string) => Promise<void>;
  onRemind: (agent: Agent) => void;
}

const readGrouping = (): HkGrouping => {
  try { return sessionStorage.getItem(HK_GROUP_KEY) === "agent" ? "agent" : "unlocks"; } catch { return "unlocks"; }
};

/** the inline "[__] wks · SAVE" — stub-0 agents with no live query only (ruling c) */
const InlineWeeks: React.FC<{ agentId: string; onSave: (id: string, weeks: number) => Promise<void> }> = ({ agentId, onSave }) => {
  const [v, setV] = useState("");
  const [busy, setBusy] = useState(false);
  const n = parseInt(v, 10);
  const ok = Number.isInteger(n) && n >= 1;
  return (
    <span className="clv-hkwk" data-clv="hk-inline">
      <input
        value={v}
        placeholder="__"
        inputMode="numeric"
        aria-label="Reply time in weeks"
        onChange={(e) => setV(e.target.value.replace(/[^\d]/g, ""))}
      />
      wks ·
      <button
        type="button" data-clv="hk-save" disabled={!ok || busy}
        onClick={async () => { setBusy(true); try { await onSave(agentId, n); } finally { setBusy(false); } }}
      >
        SAVE
      </button>
    </span>
  );
};

const RowWho: React.FC<{ r: HkAgentRow; onOpen: (id: string) => void }> = ({ r, onOpen }) => (
  <span className="clv-hkwho">
    <span className="clv-ini clv-hkini" aria-hidden="true">{agentInitials(r.agent)}</span>
    <span className="clv-hknm">
      <button type="button" className="clv-hkname" onClick={() => onOpen(r.agent.id)}>{agentPrimary(r.agent)}</button>
      <span className="clv-hkagy">
        {r.agent.agency.trim() && r.agent.name.trim() ? r.agent.agency : null}
        {r.band === "live" && <i className="clv-hklive"> · LIVE QUERY</i>}
      </span>
    </span>
  </span>
);

/** the by-agent ring: 30px, filled for the share of the six checks in place */
const Ring: React.FC<{ n: number }> = ({ n }) => {
  const r = 12;
  const c = 2 * Math.PI * r;
  return (
    <svg className="clv-hkring" width="30" height="30" viewBox="0 0 30 30" role="img" aria-label={`${n} of 6 checks in place`}>
      <circle cx="15" cy="15" r={r} fill="none" stroke="rgba(28,19,15,.14)" strokeWidth="3" />
      <circle
        cx="15" cy="15" r={r} fill="none" stroke="var(--clv-band-slate)" strokeWidth="3"
        strokeDasharray={`${(c * n) / 6} ${c}`} strokeLinecap="round" transform="rotate(-90 15 15)"
      />
    </svg>
  );
};

export const ContactHousekeeping: React.FC<ContactHousekeepingProps> = ({
  model, onOpen, onEditAt, onInlineSave, onChecked, onRemind,
}) => {
  const [grouping, setGrouping] = useState<HkGrouping>(readGrouping);
  const pick = (g: HkGrouping) => {
    setGrouping(g);
    try { sessionStorage.setItem(HK_GROUP_KEY, g); } catch { /* private mode */ }
  };

  const action = (key: GapKey, r: HkAgentRow) => {
    if (key === "reply") {
      return r.band === "live"
        ? <button type="button" className="clv-hkadd" data-clv="hk-add" onClick={() => onEditAt(r.agent.id, "who")}>Add</button>
        : <InlineWeeks agentId={r.agent.id} onSave={onInlineSave} />;
    }
    if (key === "recheck") {
      return <button type="button" className="clv-hkadd clv-hkadd--mono" data-clv="hk-checked" onClick={() => void onChecked(r.agent.id)}>CHECKED</button>;
    }
    if (key === "reopen") {
      return <button type="button" className="clv-hkadd clv-hkadd--mono" data-clv="hk-remind" onClick={() => onRemind(r.agent)}>{remindLabel(r.agent)}</button>;
    }
    return <button type="button" className="clv-hkadd" data-clv="hk-add" onClick={() => onEditAt(r.agent.id, GAP_SECTION[key])}>Add</button>;
  };

  return (
    <div className="clv-hk" data-clv="hk">
      <div className="clv-hktgl" role="group" aria-label="Group the gaps" data-clv="hk-toggle">
        <button type="button" aria-pressed={grouping === "unlocks"} onClick={() => pick("unlocks")}>By what it unlocks</button>
        <button type="button" aria-pressed={grouping === "agent"} onClick={() => pick("agent")}>By agent</button>
      </div>

      {model.counts.gaps === 0 ? (
        <p className="clv-hkempty" data-clv="hk-empty">Every profile has what QueryHawk needs. New gaps will show here.</p>
      ) : grouping === "unlocks" ? (
        model.sections.map((s) => (
          <section key={s.key} className="clv-hksec" data-clv="hk-sec" data-gap={s.key}>
            <h3 className="clv-hkh">
              {s.heading}
              <i className="clv-hkn">{s.members.length}</i>
            </h3>
            <p className="clv-hkwhy">{s.why}</p>
            <ul className="clv-hklist">
              {s.members.map((r) => (
                <li key={r.agent.id} className="clv-hkrow" data-clv="hk-row" data-agent={r.agent.id} data-live={r.band === "live" || undefined}>
                  <RowWho r={r} onOpen={onOpen} />
                  {action(s.key, r)}
                </li>
              ))}
            </ul>
          </section>
        ))
      ) : (
        <ul className="clv-hklist clv-hklist--byagent">
          {model.byAgent.map((r) => (
            <li key={r.agent.id} className="clv-hkrow clv-hkrow--agent" data-clv="hk-row" data-agent={r.agent.id} data-live={r.band === "live" || undefined}>
              <RowWho r={r} onOpen={onOpen} />
              <Ring n={r.ring} />
              <span className="clv-hkchips">
                {r.gaps.map((g) =>
                  g === "reply"
                    ? (r.band === "live"
                      ? <button key={g} type="button" className="clv-hkchip" data-clv="hk-chip" onClick={() => onEditAt(r.agent.id, "who")}>+ Reply time</button>
                      : <InlineWeeks key={g} agentId={r.agent.id} onSave={onInlineSave} />)
                    : g === "recheck"
                      ? <button key={g} type="button" className="clv-hkchip" data-clv="hk-chip" onClick={() => void onChecked(r.agent.id)}>{gapChipLabel[g]}</button>
                      : g === "reopen"
                        ? <button key={g} type="button" className="clv-hkchip" data-clv="hk-chip" onClick={() => onRemind(r.agent)}>{gapChipLabel[g]}</button>
                        : <button key={g} type="button" className="clv-hkchip" data-clv="hk-chip" onClick={() => onEditAt(r.agent.id, GAP_SECTION[g])}>{gapChipLabel[g]}</button>,
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
