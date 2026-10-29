/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v60 — the left column's new cards (ref design-refs/dashboard-v60/dashboard-v60.html).
 *
 * Once a query exists: the chart runs full width and two hoop cards sit beneath it — Closed and Agents on file.
 * (Before the first query the left column is the set-up card — first visit v1; v60's two doors are retired.)
 *
 * ⚠️ AGENTS ON FILE IS A COVERAGE SNAPSHOT, NEVER A LIST — a writer may have hundreds. Its figures are
 * `agentCoverage` (lib/dashFirstUse), which is the Contact list's own derivations. Its band is the
 * Contact list's slate (`--clv-slate`, `:root`), read, never restated.
 * ⚠️ CLOSED KEEPS ITS LOOK: the same Archivist and the same four buckets as v58's closed card, from the
 * same `closedTile`, with the same "See all" target. Only the hoop is new.
 */
import React, { useCallback, useMemo, useRef } from "react";
import type { ClosedTile } from "../../../lib/dashClosed";
import { type ClosedBucketKey, CLOSED_BUCKETS } from "../../../lib/dashClosed";
import type { AgentCoverage } from "../../../lib/dashFirstUse";
import { DASH_ART, artUrl } from "../../../lib/dashArt";
import { CountUp } from "../v59/CountUp";
import { Hoop, type HoopSeg } from "./Hoop";
import type { Agent, Query } from "../../../types";
import { agentCards, closedCards, type AgentCard, type AgentStackKey, type ClosedCard } from "../../../lib/dashHover";
import { HoverStack } from "../v116/HoverStack";
import { AgentMini, QueryMini, QueryNone } from "../v116/MiniCards";
import { announce, stackAnchor, useStackHover } from "../v116/useStackHover";

/** Closed's four stone shades, light to dark, in bucket order (literal: they also draw in, never via a `var()` keyframe). */
export const CLOSED_STONES: Record<string, string> = { quiet: "#b9b2a8", letter: "#8c8379", partial: "#6f6962", full: "#4a443f" };
/** Agents on file: querying (navy), closed (stone), not yet queried (the Contact list's pale slate, read) */
export const AGENT_SEG = { querying: "#2a3a52", closed: "#c9c2b8", none: "var(--clv-slate-pale)" } as const;

/* ⚠️ THE DOORS ARE RETIRED (Dashboard first visit v1, Part E): QueriesDoor, AgentsDoor and AgentsSnap drew the
   pre-query left column, which is now the set-up card and the Mentor's tip (fv1/). Recoverable at d6726195. */

/**
 * ⚠️ DASHBOARD v116: each slice of the ring and each row of the key shows THAT category's queries as a
 * stepped stack of mini query cards, just right of the key at the row's height (a slice: the first row's),
 * newest closed first. The cards are `closedTile.members` — the ring's own bucketing — read by
 * `closedCards` (lib/dashHover). The hovered slice swells. Clicking one opens the closed list.
 */
/**
 * ⚠️ FIRST VISIT v1 (Part D2): NOTHING CLOSED IS SAID IN WORDS, NEVER IN ZEROS. With nothing closed the band reads
 * "Closed" (no count, no See all), and the body is the Archivist in a faint dashed ring beside "Nothing closed
 * yet." — no zero rows and no hover piles. With some closed, only the buckets that hold any are listed.
 * `noneWhileLoading` is the page's memory of the last load (dashShape.closed), so the loading card is the shape
 * that is coming.
 */
export const CLOSED_NONE = { title: "Nothing closed yet.", line: "Passes and long silences gather here, so you can see who has answered." } as const;

export const ClosedHoop: React.FC<{ loading: boolean; tile: ClosedTile | null; play: boolean; onSeeAll: () => void; onOpen?: (key: ClosedBucketKey) => void; queries?: readonly Query[]; agents?: readonly Agent[]; manuscript?: string; noneWhileLoading?: boolean }> = ({ loading, tile, play, onSeeAll, onOpen, queries = [], agents = [], manuscript = "", noneWhileLoading = false }) => {
  const count = (k: string) => tile?.buckets.find((b) => b.key === k)?.count ?? 0;
  const segs: HoopSeg[] = CLOSED_BUCKETS.map((b) => ({ key: b.key, n: loading ? 0 : count(b.key), color: CLOSED_STONES[b.key] }));
  const total = loading ? 0 : tile?.total ?? 0;
  const keyRef = useRef<HTMLUListElement | null>(null);
  /* v118 Part A — at the pointer (18 right, 14 up), re-placed on every move; keyboard focus alone anchors to the element */
  const anchorFor = useCallback((_k: string, _from: "slice" | "row", el: Element, pointer: { x: number; y: number } | null) => stackAnchor(el, pointer), []);
  /* v118 Part B — a slice or row with any queries opens the Query Centre on exactly them; a 0 row does nothing */
  const open = (k: string): boolean => { if (loading || count(k) === 0 || !onOpen) return false; onOpen(k as ClosedBucketKey); return true; };
  const hv = useStackHover(anchorFor, true, open);
  /* the last category stays in hand while the stack fades out, so the exit never shows another one */
  const last = useRef<string | null>(null);
  if (hv.key) last.current = hv.key;
  const shownKey = hv.key ?? last.current;
  const cards: ClosedCard[] = useMemo(() => (tile && shownKey ? closedCards(tile, shownKey as never, queries, agents) : []), [tile, shownKey, queries, agents]);
  const label = CLOSED_BUCKETS.find((b) => b.key === shownKey)?.label ?? "";
  const live = hv.key ? announce(cards.length, ["query", "queries"], cards.map((c) => c.name), Math.min(5, cards.length)) : "";
  const none = loading ? noneWhileLoading : total === 0;
  return (
    <div className={`os-card d60-card d60-hoopcard d60-closed${loading ? " d58-skcard" : ""}`} data-none={none ? "1" : undefined} data-sk={loading ? "card" : undefined} data-d60="closed-hoop" role="group" aria-label="Closed queries" data-loading={loading ? "1" : "0"}
      data-counts={tile ? JSON.stringify(Object.fromEntries(tile.buckets.map((b) => [b.key, b.count]))) : undefined}>
      <div className="os-frame">
        <div className="os-band d60-band--stone">
          <div className="os-bandrow">
            {none
              ? <h3 className="os-cardttl" data-d60="closed-title">Closed</h3>
              : <h3 className={`os-cardttl${loading ? " d58-sk" : ""}`} data-d60="closed-title"><CountUp n={total} /> closed</h3>}
            {!none && <button type="button" className="d60-bl" data-d60="closed-see" disabled={loading} onClick={onSeeAll}>See all →</button>}
          </div>
        </div>
        {none ? (
          <div className="d60-hb fv1-none" data-fv1="closed-none">
            <div className="d60-hoop fv1-ringnone" aria-hidden="true">
              <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="none" stroke="#ece8e1" strokeWidth="9" strokeDasharray="3 4" /></svg>
              <div className="d60-hin"><img src={artUrl(DASH_ART.archivist)} width={DASH_ART.archivist.width} height={DASH_ART.archivist.height} alt="" decoding="async" /></div>
            </div>
            <div className="fv1-nonet">
              <p className="fv1-nonettl">{CLOSED_NONE.title}</p>
              <p className="fv1-nonep">{CLOSED_NONE.line}</p>
            </div>
          </div>
        ) : (
        <div className="d60-hb">
          <Hoop segs={segs} play={play} label={`${total} closed: ${CLOSED_BUCKETS.map((b) => `${count(b.key)} ${b.label.toLowerCase()}`).join(", ")}`}
            hit={loading ? undefined : { ...hv.slice, label: (k) => `${CLOSED_BUCKETS.find((b) => b.key === k)?.label}: ${count(k)}`, onClick: (k) => { open(k); } }}>
            <img src={artUrl(DASH_ART.archivist)} width={DASH_ART.archivist.width} height={DASH_ART.archivist.height} alt="" decoding="async" />
          </Hoop>
          <ul className="d60-hl" data-d60="closed-legend" ref={keyRef}>
            {/* only the buckets that hold any (D2) — while loading, all four, so the boxes are the loaded ones */}
            {CLOSED_BUCKETS.filter((b) => loading || count(b.key) > 0).map((b) => (
              <li key={b.key} className={[count(b.key) === 0 ? "is-zero" : "", hv.key === b.key ? "is-hover" : ""].filter(Boolean).join(" ") || undefined} data-d60="closed-row" data-bucket={b.key}
                {...(loading ? {} : { ...hv.row(b.key), className: [count(b.key) === 0 ? "is-zero" : "", hv.key === b.key ? "is-hover" : ""].filter(Boolean).join(" ") || undefined, "aria-label": `${b.label}: ${count(b.key)}`, "data-go": count(b.key) > 0 && onOpen ? "1" : undefined, onClick: () => { open(b.key); } })}>
                <i style={{ background: CLOSED_STONES[b.key] }} /><b className={loading ? "d58-sk" : undefined}><CountUp n={count(b.key)} /></b>{b.label}
              </li>
            ))}
          </ul>
          <span className="d116-live" aria-live="polite" data-d116="live">{live}</span>
        </div>
        )}
      </div>
      {!none && <HoverStack
        anchor={hv.anchor} kind="closed" stackKey={shownKey ?? ""} total={cards.length || 1}
        cards={cards.length ? cards.map((c) => <QueryMini key={c.id} c={c} manuscript={manuscript} />) : [<QueryNone key="none" label={label} />]}
      />}
    </div>
  );
};

const AGENT_LABEL: Record<AgentStackKey, string> = { querying: "Querying", closed: "Closed", none: "Not yet queried" };

/**
 * ⚠️ DASHBOARD v116: each slice of the ring and each row of the key shows THAT status's agents as a
 * stepped stack of mini agent cards that follows the pointer (18px right of it, 14px above), re-placed on
 * every move under the on-screen rule. The cards are `agentQueryStates` — the ring's own derivation — read
 * by `agentCards` (lib/dashHover). Clicking opens the Contact list.
 */
/**
 * ⚠️ FIRST VISIT v1 (Part D3): only the rows that hold any agents; "0 ready to query →" becomes "More in Discover →";
 * the ring's centre is "{queried} / OF {total}"; and with no agents at all (possible after the first query only if
 * every agent was deleted) the card says so in words, with the way to bring a list in.
 */
export const AGENTS_NONE = { title: "No agents yet.", line: "Add the agents you'd like to query, even before you send.", link: "Import a list" } as const;
export const MORE_IN_DISCOVER = "More in Discover";

export const AgentsHoop: React.FC<{ loading: boolean; cov: AgentCoverage; play: boolean; onReady: () => void; onOpen?: (key: AgentStackKey) => void; agents?: readonly Agent[]; queries?: readonly Query[]; msId?: string | null; onDiscover?: () => void; onImport?: () => void }> = ({ loading, cov, play, onReady, onOpen, agents = [], queries = [], msId = null, onDiscover, onImport }) => {
  const segs: HoopSeg[] = [
    { key: "querying", n: loading ? 0 : cov.querying, color: AGENT_SEG.querying },
    { key: "closed", n: loading ? 0 : cov.closed, color: AGENT_SEG.closed },
    { key: "none", n: loading ? 0 : cov.none, color: AGENT_SEG.none },
  ];
  const n = (k: string) => (k === "querying" ? cov.querying : k === "closed" ? cov.closed : cov.none);
  const anchorFor = useCallback((_k: string, _from: "slice" | "row", el: Element, pointer: { x: number; y: number } | null) => stackAnchor(el, pointer), []);
  /* v118 Part B — a slice or row with any agents opens the Contact list filtered to them; a 0 row does nothing */
  const open = (k: string): boolean => { if (loading || n(k) === 0 || !onOpen) return false; onOpen(k as AgentStackKey); return true; };
  const hv = useStackHover(anchorFor, true, open);
  const last = useRef<string | null>(null);
  if (hv.key) last.current = hv.key;
  const shownKey = (hv.key ?? last.current) as AgentStackKey | null;
  const cards: AgentCard[] = useMemo(() => (shownKey ? agentCards(agents, queries, msId, shownKey) : []), [agents, queries, msId, shownKey]);
  const live = hv.key ? announce(cards.length, ["agent", "agents"], cards.map((c) => c.name), Math.min(5, cards.length)) : "";
  const none = !loading && cov.total === 0;
  const shows = (k: AgentStackKey) => loading || n(k) > 0;
  const row = (k: AgentStackKey) => (loading ? {} : { ...hv.row(k), className: [n(k) === 0 ? "is-zero" : "", hv.key === k ? "is-hover" : ""].filter(Boolean).join(" ") || undefined, "aria-label": `${AGENT_LABEL[k]}: ${n(k)}`, "data-go": n(k) > 0 && onOpen ? "1" : undefined, onClick: () => { open(k); } });
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
        {none ? (
          <div className="d60-hb fv1-none" data-fv1="agents-none">
            <div className="d60-hoop fv1-ringnone" aria-hidden="true">
              <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="none" stroke="#ece8e1" strokeWidth="9" strokeDasharray="3 4" /></svg>
            </div>
            <div className="fv1-nonet">
              <p className="fv1-nonettl">{AGENTS_NONE.title}</p>
              <p className="fv1-nonep">{AGENTS_NONE.line}</p>
              <button type="button" className="d60-ready" data-fv1="agents-import" onClick={onImport}>{AGENTS_NONE.link} →</button>
            </div>
          </div>
        ) : (
        <div className="d60-hb">
          <Hoop segs={segs} play={play} label={`${cov.queried} of ${cov.total} queried: ${cov.querying} querying, ${cov.closed} closed, ${cov.none} not yet queried`}
            hit={loading ? undefined : { ...hv.slice, label: (k) => `${AGENT_LABEL[k as AgentStackKey]}: ${n(k)}`, onClick: (k) => { open(k); } }}>
            <b className={`d60-hn${loading ? " d58-sk" : ""}`} data-d60="hoop-queried"><CountUp n={cov.queried} /></b>
            <small data-d60="hoop-total">OF {cov.total.toLocaleString("en-GB")}</small>
          </Hoop>
          <ul className="d60-hl" data-d60="agents-legend">
            {shows("querying") && <li className={cov.querying === 0 ? "is-zero" : undefined} {...row("querying")}><i style={{ background: AGENT_SEG.querying }} /><b><CountUp n={cov.querying} /></b>Querying</li>}
            {shows("closed") && <li className={cov.closed === 0 ? "is-zero" : undefined} {...row("closed")}><i style={{ background: AGENT_SEG.closed }} /><b><CountUp n={cov.closed} /></b>Closed</li>}
            {shows("none") && <li className={cov.none === 0 ? "is-zero" : undefined} {...row("none")}><i style={{ background: AGENT_SEG.none }} /><b><CountUp n={cov.none} /></b>Not yet queried</li>}
            <li className="d60-go">{loading || cov.ready > 0
              ? <button type="button" className="d60-ready" data-d60="ready" disabled={loading} onClick={onReady}>{cov.ready} ready to query →</button>
              : <button type="button" className="d60-ready" data-d60="discover" onClick={onDiscover}>{MORE_IN_DISCOVER} →</button>}</li>
          </ul>
          <span className="d116-live" aria-live="polite" data-d116="live">{live}</span>
        </div>
        )}
      </div>
      {!none && <HoverStack
        anchor={hv.anchor} kind="agents" stackKey={shownKey ?? ""} total={cards.length || 1}
        cards={cards.length ? cards.map((a) => <AgentMini key={a.id} a={a} />) : [<QueryNone key="none" label={shownKey ? AGENT_LABEL[shownKey] : ""} />]}
      />}
    </div>
  );
};
