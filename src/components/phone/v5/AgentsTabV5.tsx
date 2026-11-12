/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v5, Phase C — TODAY'S AGENTS TAB (design-refs/phone-app-v5/phone-hub-v5.html `TABS.Agents`: `sumBar`,
 * `health2` in navy on blush, `bestFit`). Below 768px only. Exactly: Summary → List health → Next to query → See all →
 * Discover.
 *   - Summary: the Birds-eye block's bar-and-figures (the same `.pa5-be-sm` dress): to query · querying · closed, then
 *     "N agents on your list". ONE source splits the list (lib/phoneV5 `agentPartition` over AgentsV4 `queryByAgent`, the
 *     full list's own grouping), so the three always add up to N. A figure filters nothing here: it opens the full list
 *     on its group; a zero figure is greyed and cannot be tapped.
 *   - List health: the navy ring (HealthRingV5, the drawer's points share), "N gaps across N agents" (Housekeeping's
 *     gap count and its agents with a gap), Housekeeping's four groups (GROUP_ORDER, GROUP_COPY headings) with their gap
 *     counts — a group with none is left out — and "Fill in the gaps". Hidden at 100% with nothing to fill.
 *   - Next to query: v4's best-fit card (AgentsV4 `NextToQueryV4`, lib/phoneV4 `bestFit`), "See all N agents" (the full
 *     list, pushed) and the Discover row (always there; its line is Discover's own count, and absent at zero).
 */
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useV3Data } from "../v3/V3Provider";
import { openV3 } from "../v3/v3Store";
import { NextToQueryV4, queryByAgent } from "../v4/AgentsV4";
import { CAST, Chev, Link4 } from "../v4/V4Parts";
import { useDiscoverCount } from "../../agents/phone/AgentsPhone";
import { bestFit } from "../../../lib/phoneV4";
import { GROUP_COPY, GROUP_ORDER } from "../../../lib/contactHousekeeping";
import { AGENT_GROUPS, AGENT_GROUP_WORDS, agentPartition, gapGroupCounts, gapsAcross, healthShows, type AgentGroup } from "../../../lib/phoneV5";
import { HealthRingV5 } from "./HealthRingV5";
import { usePhoneHk } from "./usePhoneHk";
import "./phoneV5.css";

const GROUP_FILL: Record<AgentGroup, string> = { toquery: "var(--pa-blush)", querying: "var(--pa-ring-agent)", closed: "var(--pa-star-off)" };

/** a DEV-ONLY review aid shared with Today (`window.__SA_PA4_TODAY.healthPct`); the MODE test folds it away in production */
const aidPct = (): number | null => {
  if (import.meta.env.MODE === "production" || typeof window === "undefined") return null;
  const a = (window as unknown as { __SA_PA4_TODAY?: { healthPct?: number } }).__SA_PA4_TODAY;
  return typeof a?.healthPct === "number" ? a.healthPct : null;
};

export const AgentsTabV5: React.FC = () => {
  const v = useV3Data();
  const navigate = useNavigate();
  const { agents, queries } = v.core.db;
  const byAgent = useMemo(() => queryByAgent(v.qs), [v.qs]);
  const parts = useMemo(() => agentPartition(agents, byAgent), [agents, byAgent]);
  const fits = useMemo(() => bestFit(agents, queries), [agents, queries]);
  const discover = useDiscoverCount();
  const { model, health: h0 } = usePhoneHk();
  const aid = aidPct();
  const health = h0 && aid != null ? { ...h0, pct: aid } : h0;
  const groups = useMemo(() => gapGroupCounts(GROUP_ORDER, model.items).filter((g) => g.n > 0), [model.items]);
  const n = agents.length;

  return (
    <div className="pa5-ag" data-pa5="agents-tab">
      {/* ── the summary ── */}
      <div className="pa5-be pa5-ag-sum" data-pa5="agents-summary" data-n={n}>
        <div className="pa5-be-sm">
          <div className="pa5-be-sb" aria-hidden="true">
            {n > 0 ? AGENT_GROUPS.filter((k) => parts[k].length > 0).map((k) => <i key={k} data-k={k} style={{ flex: `${parts[k].length} 1 0`, background: GROUP_FILL[k] }} />) : null}
          </div>
          <div className="pa5-be-sn">
            {AGENT_GROUPS.map((k) => (
              <button key={k} type="button" disabled={parts[k].length === 0} data-pa5="ag-count" data-k={k} data-n={parts[k].length}
                aria-label={`${parts[k].length} ${AGENT_GROUP_WORDS[k]}: see them on your list`} onClick={() => openV3({ type: "agents-all", group: k })}>
                <b className="pa4-T">{parts[k].length}</b><span><i style={{ background: GROUP_FILL[k] }} aria-hidden="true" />{AGENT_GROUP_WORDS[k]}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="pa5-be-l"><span data-pa5="ag-total">{n === 0 ? "No agents on your list yet" : `${n} ${n === 1 ? "agent" : "agents"} on your list`}</span></div>
      </div>

      {/* ── List health ── */}
      {health && healthShows(health) ? (
        <div className="pa4-card pa5-hl" data-pa5="health" data-pa4="health" data-pct={health.pct} data-gaps={health.gaps} data-agents={model.gapAgents}>
          <div className="pa5-hl-t">
            <HealthRingV5 pct={health.pct} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 className="pa4-h">List health</h2>
              <div className="pa4-s" data-pa5="health-line">{health.gaps > 0 ? gapsAcross(health.gaps, model.gapAgents) : "Every gap is put off for later."}</div>
            </div>
          </div>
          {groups.map((g) => (
            <button key={g.group} type="button" className="pa4-tap pa5-hl-g" data-pa5="gap-group" data-group={g.group} data-n={g.n}
              onClick={() => openV3({ type: "gaps", group: g.group })}>
              <span className="pa4-x pa4-b">{GROUP_COPY[g.group].heading}</span>
              <span className="pa5-gapn pa4-T" aria-label={`${g.n} ${g.n === 1 ? "gap" : "gaps"}`}>{g.n}</span>
              <Chev />
            </button>
          ))}
          {health.gaps > 0 ? <Link4 rule pa4="fill-gaps" data-pa5="fill-gaps" onClick={() => openV3({ type: "gaps" })}>Fill in the gaps</Link4> : <div style={{ height: 16 }} />}
        </div>
      ) : null}

      {/* ── next to query ── */}
      <div className="pa4-card pa5-nq" data-pa5="best-fit" data-pa4={fits[0] ? "best-fit" : "all-queried"}>
        <NextToQueryV4 top={fits[0] ?? null} discover={discover} agentsN={n} kick="Next to query" />
        {n > 0 ? <Link4 rule pa4="see-all-agents" data-pa5="see-all-agents" onClick={() => openV3({ type: "agents-all" })}>See all {n} {n === 1 ? "agent" : "agents"}</Link4> : null}
      </div>
      <div className="pa4-card pa5-dr">
        <button type="button" className="pa4-tap" style={{ minHeight: 72 }} data-pa5="discover-row" data-pa4="discover" onClick={() => navigate("/agents/discover")}>
          <img src={CAST.scout} alt="" style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--pa-st-slate)", objectFit: "cover", objectPosition: "top" }} />
          <span className="pa4-x"><b>Discover</b>{discover > 0 ? <span className="pa4-s">{discover} {discover === 1 ? "agent" : "agents"} the Scout matched to your book</span> : null}</span><Chev />
        </button>
      </div>
      <div style={{ height: 24 }} />
    </div>
  );
};
