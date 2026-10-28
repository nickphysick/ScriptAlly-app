/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v60 — the left column's new cards (ref design-refs/dashboard-v60/dashboard-v60.html).
 *
 * Before the first query: two doors — "No queries yet" (the Courier, the column's ONE drawing) and
 * "Agents on file" (a slate glyph disc, or the coverage snapshot once agents exist). Once a query
 * exists: the chart runs full width and two hoop cards sit beneath it — Closed and Agents on file.
 *
 * ⚠️ AGENTS ON FILE IS A COVERAGE SNAPSHOT, NEVER A LIST — a writer may have hundreds. Its figures are
 * `agentCoverage` (lib/dashFirstUse), which is the Contact list's own derivations. Its band is the
 * Contact list's slate (`--clv-slate`, `:root`), read, never restated.
 * ⚠️ CLOSED KEEPS ITS LOOK: the same Archivist and the same four buckets as v58's closed card, from the
 * same `closedTile`, with the same "See all" target. Only the hoop is new.
 * ⚠️ "Log a query" and "Add an agent" live HERE, on the doors; the right column never repeats them.
 */
import React, { useCallback, useMemo, useRef } from "react";
import type { ClosedTile } from "../../../lib/dashClosed";
import { CLOSED_BUCKETS } from "../../../lib/dashClosed";
import type { AgentCoverage } from "../../../lib/dashFirstUse";
import { DASH_ART, artUrl } from "../../../lib/dashArt";
import { CountUp } from "../v59/CountUp";
import { Hoop, type HoopSeg } from "./Hoop";
import type { Agent, Query } from "../../../types";
import { closedCards, type ClosedCard } from "../../../lib/dashHover";
import { HoverStack } from "../v116/HoverStack";
import { QueryMini, QueryNone } from "../v116/MiniCards";
import { announce, useStackHover } from "../v116/useStackHover";
import { StartTag, useSpot } from "./WhereStart";

/** Closed's four stone shades, light to dark, in bucket order (literal: they also draw in, never via a `var()` keyframe). */
export const CLOSED_STONES: Record<string, string> = { quiet: "#b9b2a8", letter: "#8c8379", partial: "#6f6962", full: "#4a443f" };
/** Agents on file: querying (navy), closed (stone), not yet queried (the Contact list's pale slate, read) */
export const AGENT_SEG = { querying: "#2a3a52", closed: "#c9c2b8", none: "var(--clv-slate-pale)" } as const;

const PersonGlyph = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="7" r="3.2" /><path d="M3.5 17c.8-3.4 3.4-5 6.5-5s5.7 1.6 6.5 5" /></svg>
);
const LogGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M3 13 12.5 3.5M9 3.5h3.5V7" /></svg>
);

/* ── before the first query ─────────────────────────────────────────────────────────────────── */

export const QueriesDoor: React.FC<{ loading: boolean; agents: number; onLog: () => void }> = ({ loading, agents, onLog }) => {
  const { spot, first } = useSpot("queries");
  return (
  <div className={`os-card d60-card d60-door${loading ? " d58-skcard" : ""}`} data-sk={loading ? "card" : undefined} data-d60="queries-door" data-spot={spot} role="group" aria-label="No queries yet">
    <StartTag show={first} />
    <div className="os-frame">
      <div className="os-band d60-band--navy"><div className="os-bandrow"><h3 className="os-cardttl">No queries yet</h3></div></div>
      <div className="d60-doorbody">
        <div className="d60-doorart" aria-hidden="true">
          <img data-d60="art" src={artUrl(DASH_ART.courier)} width={DASH_ART.courier.width} height={DASH_ART.courier.height} alt="" decoding="async" />
        </div>
        <div className="d60-doortext">
          <h3 className="d60-doorh">No queries out yet.</h3>
          <p className={`d60-doorp${loading ? " d58-sk" : ""}`} data-d60="queries-copy">
            {agents > 0
              ? `Log a query to one of your ${agents.toLocaleString("en-GB")} agents and it'll show up here.`
              : "Log a query you've sent and it'll show up here, with any date."}
          </p>
          <div className="d60-doorrow">
            <button type="button" className="d58-btn d58-btn--pri" data-d60="log" disabled={loading} onClick={onLog}><LogGlyph />Log a query</button>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};

export const AgentsDoor: React.FC<{ loading: boolean; onAdd: () => void; onImport: () => void }> = ({ loading, onAdd, onImport }) => {
  const { spot, first } = useSpot("agents");
  return (
  <div className={`os-card d60-card d60-agents${loading ? " d58-skcard" : ""}`} data-sk={loading ? "card" : undefined} data-d60="agents-door" data-spot={spot} role="group" aria-label="Agents on file">
    <StartTag show={first} />
    <div className="os-frame">
      <div className="os-band d60-band--slate"><div className="os-bandrow"><h3 className="os-cardttl">Agents on file</h3><span className="d60-meta" data-d60="agents-meta">0 ON FILE</span></div></div>
      <div className="d60-doorbody d60-doorbody--sm">
        <span className="d60-glyph" data-d60="glyph" aria-hidden="true"><PersonGlyph /></span>
        <div className="d60-doortext">
          <h3 className="d60-doorh d60-doorh--sm">No agents yet.</h3>
          <p className="d60-doorp">Add the agents you'd like to query. You can add them long before you send anything.</p>
          <div className="d60-doorrow">
            <button type="button" className="d58-btn d58-btn--pri" data-d60="add-agent" disabled={loading} onClick={onAdd}>+ Add an agent</button>
            <button type="button" className="d58-btn" data-d60="import-list" disabled={loading} onClick={onImport}>Import a list</button>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};

const Key: React.FC<{ cls: string; n: number; label: string }> = ({ cls, n, label }) => (
  <span className={`d60-key${n === 0 ? " is-zero" : ""}`} data-d60={`key-${cls}`}><i className={`d60-sw d60-sw--${cls}`} /><b>{n}</b> {label}</span>
);

/** Agents on file once there are agents but no query: the coverage snapshot as one row. */
export const AgentsSnap: React.FC<{ loading: boolean; cov: AgentCoverage; onReady: () => void }> = ({ loading, cov, onReady }) => {
  const { spot, first } = useSpot("agents");
  return (
  <div className={`os-card d60-card d60-agents${loading ? " d58-skcard" : ""}`} data-sk={loading ? "card" : undefined} data-d60="agents-snap" data-spot={spot} role="group" aria-label="Agents on file"
    data-cov={JSON.stringify({ querying: cov.querying, closed: cov.closed, none: cov.none, ready: cov.ready, total: cov.total })}>
    <StartTag show={first} />
    <div className="os-frame">
      <div className="os-band d60-band--slate">
        <div className="os-bandrow"><h3 className="os-cardttl">Agents on file</h3>
          {cov.addedThisWeek > 0 && <span className="d60-meta d60-week" data-d60="agents-week">+{cov.addedThisWeek} THIS WEEK</span>}
        </div>
      </div>
      <div className="d60-snap">
        <div className="d60-snaprow">
          <div className="d60-big"><b className={loading ? "d58-sk" : undefined} data-d60="snap-queried"><CountUp n={cov.queried} /></b><span>of {cov.total.toLocaleString("en-GB")} queried</span></div>
          <div className="d60-bar" aria-hidden="true">
            {cov.querying > 0 && <i className="d60-sw--querying" style={{ flex: cov.querying }} />}
            {cov.closed > 0 && <i className="d60-sw--closed" style={{ flex: cov.closed }} />}
            {cov.none > 0 && <i className="d60-sw--none" style={{ flex: cov.none }} />}
          </div>
          <div className="d60-pct">{cov.pct}%</div>
        </div>
        <div className="d60-keys">
          <Key cls="querying" n={cov.querying} label="querying" />
          <Key cls="closed" n={cov.closed} label="closed" />
          <Key cls="none" n={cov.none} label="not yet queried" />
          <button type="button" className="d60-ready" data-d60="ready" disabled={loading} onClick={onReady}>{cov.ready} ready to query →</button>
        </div>
      </div>
    </div>
  </div>
  );
};

/* ── once a query exists: the two hoops ─────────────────────────────────────────────────────── */

/**
 * ⚠️ DASHBOARD v116: each slice of the ring and each row of the key shows THAT category's queries as a
 * stepped stack of mini query cards, just right of the key at the row's height (a slice: the first row's),
 * newest closed first. The cards are `closedTile.members` — the ring's own bucketing — read by
 * `closedCards` (lib/dashHover). The hovered slice swells. Clicking one opens the closed list.
 */
export const ClosedHoop: React.FC<{ loading: boolean; tile: ClosedTile | null; play: boolean; onSeeAll: () => void; queries?: readonly Query[]; agents?: readonly Agent[]; manuscript?: string }> = ({ loading, tile, play, onSeeAll, queries = [], agents = [], manuscript = "" }) => {
  const count = (k: string) => tile?.buckets.find((b) => b.key === k)?.count ?? 0;
  const segs: HoopSeg[] = CLOSED_BUCKETS.map((b) => ({ key: b.key, n: loading ? 0 : count(b.key), color: CLOSED_STONES[b.key] }));
  const total = loading ? 0 : tile?.total ?? 0;
  const keyRef = useRef<HTMLUListElement | null>(null);
  /* just right of the key's longest line, at the row's height (a slice: the key's first row) */
  const anchorFor = useCallback((k: string, from: "slice" | "row") => {
    const ul = keyRef.current;
    const rows = ul ? [...ul.querySelectorAll<HTMLElement>("li")] : [];
    let right = 0;
    for (const li of rows) { const rg = document.createRange(); rg.selectNodeContents(li); right = Math.max(right, rg.getBoundingClientRect().right); }
    const row = from === "row" ? rows.find((li) => li.dataset.bucket === k) : rows[0];
    const top = row ? row.getBoundingClientRect().top - 6 : 0;
    return { x: Math.round(right + 16), y: Math.round(top) };
  }, []);
  const hv = useStackHover(anchorFor, false);
  /* the last category stays in hand while the stack fades out, so the exit never shows another one */
  const last = useRef<string | null>(null);
  if (hv.key) last.current = hv.key;
  const shownKey = hv.key ?? last.current;
  const cards: ClosedCard[] = useMemo(() => (tile && shownKey ? closedCards(tile, shownKey as never, queries, agents) : []), [tile, shownKey, queries, agents]);
  const label = CLOSED_BUCKETS.find((b) => b.key === shownKey)?.label ?? "";
  const live = hv.key ? announce(cards.length, ["query", "queries"], cards.map((c) => c.name), Math.min(5, cards.length)) : "";
  return (
    <div className={`os-card d60-card d60-hoopcard d60-closed${loading ? " d58-skcard" : ""}`} data-sk={loading ? "card" : undefined} data-d60="closed-hoop" role="group" aria-label="Closed queries" data-loading={loading ? "1" : "0"}
      data-counts={tile ? JSON.stringify(Object.fromEntries(tile.buckets.map((b) => [b.key, b.count]))) : undefined}>
      <div className="os-frame">
        <div className="os-band d60-band--stone">
          <div className="os-bandrow">
            <h3 className={`os-cardttl${loading ? " d58-sk" : ""}`} data-d60="closed-title"><CountUp n={total} /> closed</h3>
            <button type="button" className="d60-bl" data-d60="closed-see" disabled={loading} onClick={onSeeAll}>See all →</button>
          </div>
        </div>
        <div className="d60-hb">
          <Hoop segs={segs} play={play} label={`${total} closed: ${CLOSED_BUCKETS.map((b) => `${count(b.key)} ${b.label.toLowerCase()}`).join(", ")}`}
            hit={loading ? undefined : { ...hv.slice, label: (k) => `${CLOSED_BUCKETS.find((b) => b.key === k)?.label}: ${count(k)}`, onClick: () => onSeeAll() }}>
            <img src={artUrl(DASH_ART.archivist)} width={DASH_ART.archivist.width} height={DASH_ART.archivist.height} alt="" decoding="async" />
          </Hoop>
          <ul className="d60-hl" data-d60="closed-legend" ref={keyRef}>
            {CLOSED_BUCKETS.map((b) => (
              <li key={b.key} className={[count(b.key) === 0 ? "is-zero" : "", hv.key === b.key ? "is-hover" : ""].filter(Boolean).join(" ") || undefined} data-d60="closed-row" data-bucket={b.key}
                {...(loading ? {} : { ...hv.row(b.key), className: [count(b.key) === 0 ? "is-zero" : "", hv.key === b.key ? "is-hover" : ""].filter(Boolean).join(" ") || undefined, "aria-label": `${b.label}: ${count(b.key)}`, onClick: () => onSeeAll() })}>
                <i style={{ background: CLOSED_STONES[b.key] }} /><b className={loading ? "d58-sk" : undefined}><CountUp n={count(b.key)} /></b>{b.label}
              </li>
            ))}
          </ul>
          <span className="d116-live" aria-live="polite" data-d116="live">{live}</span>
        </div>
      </div>
      <HoverStack
        anchor={hv.anchor} kind="closed" stackKey={shownKey ?? ""} total={cards.length || 1}
        cards={cards.length ? cards.map((c) => <QueryMini key={c.id} c={c} manuscript={manuscript} />) : [<QueryNone key="none" label={label} />]}
      />
    </div>
  );
};

export const AgentsHoop: React.FC<{ loading: boolean; cov: AgentCoverage; play: boolean; onReady: () => void }> = ({ loading, cov, play, onReady }) => {
  const segs: HoopSeg[] = [
    { key: "querying", n: loading ? 0 : cov.querying, color: AGENT_SEG.querying },
    { key: "closed", n: loading ? 0 : cov.closed, color: AGENT_SEG.closed },
    { key: "none", n: loading ? 0 : cov.none, color: AGENT_SEG.none },
  ];
  return (
    <div className={`os-card d60-card d60-hoopcard d60-agents${loading ? " d58-skcard" : ""}`} data-sk={loading ? "card" : undefined} data-d60="agents-hoop" role="group" aria-label="Agents on file" data-loading={loading ? "1" : "0"}
      data-cov={JSON.stringify({ querying: cov.querying, closed: cov.closed, none: cov.none, ready: cov.ready, total: cov.total })}>
      <div className="os-frame">
        <div className="os-band d60-band--slate">
          <div className="os-bandrow">
            <h3 className="os-cardttl">Agents on file</h3>
            {cov.addedThisWeek > 0 && <span className="d60-bl d60-week" data-d60="agents-week">+{cov.addedThisWeek} this week</span>}
          </div>
        </div>
        <div className="d60-hb">
          <Hoop segs={segs} play={play} label={`${cov.queried} of ${cov.total} queried: ${cov.querying} querying, ${cov.closed} closed, ${cov.none} not yet queried`}>
            <b className={`d60-hn${loading ? " d58-sk" : ""}`} data-d60="hoop-queried"><CountUp n={cov.queried} /></b>
            <small>of {cov.total.toLocaleString("en-GB")}<br />queried</small>
          </Hoop>
          <ul className="d60-hl" data-d60="agents-legend">
            <li className={cov.querying === 0 ? "is-zero" : undefined}><i style={{ background: AGENT_SEG.querying }} /><b><CountUp n={cov.querying} /></b>Querying</li>
            <li className={cov.closed === 0 ? "is-zero" : undefined}><i style={{ background: AGENT_SEG.closed }} /><b><CountUp n={cov.closed} /></b>Closed</li>
            <li className={cov.none === 0 ? "is-zero" : undefined}><i style={{ background: AGENT_SEG.none }} /><b><CountUp n={cov.none} /></b>Not yet queried</li>
            <li className="d60-go"><button type="button" className="d60-ready" data-d60="ready" disabled={loading} onClick={onReady}>{cov.ready} ready to query →</button></li>
          </ul>
        </div>
      </div>
    </div>
  );
};
