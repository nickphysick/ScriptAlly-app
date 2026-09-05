/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QueryAgentTab — the drawer's Agent tab (drawer cut 2, §4 · layout A).
 *
 * ⚠️ A VIEW OF THE AGENT DOCUMENT, NEVER AN EDITOR (decision 4). Editing stays on the Contact
 * list; the two links at the foot are the only way anything here changes.
 *
 * ⚠️ EVERY BLOCK OMITS ITSELF WHEN ITS DATA IS ABSENT — no "Not recorded" placeholders — EXCEPT
 * the four tiles, which state `—`: a tile grid with holes reads as broken where an absent chip
 * reads as absent. Two of the ref's facts have NO field in the model and therefore never render:
 * an agent's ROLE ("Senior agent, fiction") and a FOUNDING YEAR ("est. 2011"). Omitted-when-absent
 * covers a field the model cannot hold; inventing either would be the confident-wrong-value fault.
 *
 * ⚠️ SOCIAL CHIPS LINK ONLY WHEN THE STORED HANDLE IS ALREADY A URL. No derivation in this app
 * turns "@priyareads" into a profile address, and building one here would fabricate a fact from a
 * string a writer typed — the chip renders as text instead, which states exactly what is known.
 *
 * ⚠️ "NOT LOOKING FOR" NEVER RENDERS: the model has no anti-wishlist field. The grey `.achip.no`
 * treatment ships (grey #a09080, no strike-through — reporting, not appraising) so the day the
 * field exists the grammar is waiting, and a lock asserts no chip wears it today.
 */
import React from "react";
import { StatusDot } from "../StatusDot";
import { materialRowsFromAgent } from "../../lib/agentMaterials";
import { flagFor, countryName } from "../../lib/territory";
import type { Agent, Query } from "../../types";
import { stageFor } from "../../lib/queryCardFacts";

export interface AgentHistoryRow {
  queryId: string;
  manuscriptTitle: string;
  statusLine: string;
  /** mono right column — `this query`, or the row's own month · year */
  when: string;
  isThisQuery: boolean;
  status: Query["status"];
}

export interface QueryAgentTabProps {
  agent: Agent;
  /** Derived by the page: `queriesForAgent(agent.id, queries)` mapped to rows. */
  history: AgentHistoryRow[];
  onOpenContactList?: () => void;
  onEditAgent?: () => void;
}

const monogram = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");

export const QueryAgentTab: React.FC<QueryAgentTabProps> = ({ agent, history, onOpenContactList, onEditAgent }) => {
  const open = agent.submissionStatus === "Open";
  const flag = flagFor(agent.country);
  const place = agent.city || countryName(agent.country);
  /* the ONE stored-materials reader — the same rows the Contact list's editor round-trips.
     A row is a chip only when it is ON; the Other row's chip is the writer's own words. */
  const asks = materialRowsFromAgent(agent.materialsWanted)
    .filter((r) => r.on)
    .map((r) => {
      if (r.key === "synopsis" && r.pages.trim()) return `${r.name} · ${r.pages.trim()} page${r.pages.trim() === "1" ? "" : "s"}`;
      if (r.key === "sample" && r.amount.trim()) return `${r.amount.trim()} ${r.unit.toLowerCase()}`;
      if (r.key === "other") return r.text.trim() || r.name;
      return r.name;
    });
  const socials = (agent.socials ?? []).filter((s) => s.handle?.trim());
  const yourCount = history.length;

  return (
    <div className="qat">
      <div className="qat-hero">
        <span className="qat-av" aria-hidden="true">{monogram(agent.name || agent.agency)}</span>
        <div className="qat-herotx">
          <div className="qat-nm">{agent.name || agent.agency}</div>
          {agent.name && agent.agency && <div className="qat-ag">{agent.agency}</div>}
          {(place || flag) && (
            <div className="qat-loc">
              {flag && <span className={flag} aria-hidden="true" />}
              {place && <span>{place}</span>}
            </div>
          )}
        </div>
        {/* the door, in the two-systems vocabulary — never a bare "Closed" */}
        <span className="qat-open">{open ? "Open to submissions" : "Closed for submissions"}</span>
      </div>

      {(agent.email || agent.website || socials.length > 0) && (
        <div className="qat-acts">
          {agent.email && (
            <a className="qat-actb" href={`mailto:${agent.email}`}>✉ {agent.email}</a>
          )}
          {agent.website && (
            <a className="qat-actb" href={/^https?:\/\//.test(agent.website) ? agent.website : `https://${agent.website}`}
              target="_blank" rel="noopener noreferrer">⌂ {agent.website.replace(/^https?:\/\//, "")}</a>
          )}
          {socials.map((s, i) =>
            /^https?:\/\//.test(s.handle)
              ? <a key={i} className="qat-actb" href={s.handle} target="_blank" rel="noopener noreferrer">{s.handle.replace(/^https?:\/\//, "")}</a>
              : <span key={i} className="qat-actb qat-actb--plain">{s.handle}</span>)}
        </div>
      )}

      <div className="qat-tiles">
        <div className="qat-tile">
          <div className="qat-tv">{agent.responseTimeWeeks != null ? <>{agent.responseTimeWeeks}<span>wks</span></> : "—"}</div>
          <div className="qat-tk">window</div>
        </div>
        <div className="qat-tile">
          <div className="qat-tv">{agent.submissionMethod || "—"}</div>
          <div className="qat-tk">method</div>
        </div>
        <div className="qat-tile">
          {/* three states, and unstated is an ORIGIN state — never folded into either answer */}
          <div className="qat-tv">{agent.noResponseMeansNo === true ? "Means no" : agent.noResponseMeansNo === false ? "Not a no" : "—"}</div>
          <div className="qat-tk">silence</div>
        </div>
        <div className="qat-tile">
          <div className="qat-tv">{yourCount}</div>
          <div className="qat-tk">your queries</div>
        </div>
      </div>

      {agent.mswlNotes?.trim() && (
        <blockquote className="qat-quote">
          {agent.mswlNotes.trim()}
          <span className="qat-qk">Manuscript wishlist</span>
        </blockquote>
      )}

      {asks.length > 0 && (
        <div className="qat-asks">
          <span className="qat-ak">{(agent.name || agent.agency).split(/\s+/)[0]} asks for</span>
          {asks.map((a) => <span key={a} className="qat-achip">{a}</span>)}
        </div>
      )}

      {history.length > 0 && (
        <div className="qat-hist">
          <div className="qat-hk">Your history with {(agent.name || agent.agency).split(/\s+/)[0]}</div>
          {history.map((h) => (
            <div key={h.queryId} className="qat-hrow">
              {/* the swatch is the query's own band tint — the stage class resolves it */}
              <span className={`qat-sw qcc--s-${stageFor(h.status)}`} aria-hidden="true" />
              <span className="qat-hw">{h.manuscriptTitle}</span>
              <span className="qat-hs">{h.statusLine}</span>
              <span className="qat-hd">{h.when}</span>
            </div>
          ))}
        </div>
      )}

      <div className="qat-links">
        {onOpenContactList && <button type="button" className="qat-lnk" onClick={onOpenContactList}>Open in Contact list ›</button>}
        {onEditAgent && <button type="button" className="qat-lnk" onClick={onEditAgent}>Edit agent ›</button>}
      </div>
    </div>
  );
};
