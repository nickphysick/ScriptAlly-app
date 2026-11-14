/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Responses v5 Phase 2 (design-refs/responses-v5/responses-v5.html, `glance`) — AT A GLANCE; and the page's header
 * (Workspace headers v1).
 *
 * ⚠️ BOTH ARE THE SHARED COMPONENTS, NOT COPIES: the header is `shell/WorkspaceNavyHeader` (Workspace headers v1: the
 *    Query Centre's navy header; it replaced the title card) and the four cards are `shared/GlanceCards` (the Query
 *    Centre's v150.1 stat cards, lifted by Contact list v25). This file names the Responses page's own words and
 *    figures; the look of both lives with them, and responses5.css only sizes the cards to the reference.
 * ⚠️ THE HEAD'S SHORT FACT ("3 your move") RIDES IN THE CARD'S `doodle` SLOT, which takes any node: GlanceCards has no
 *    slot named for it, and editing a shared component is out of this pack's scope.
 * ⚠️ A CARD IS NAVIGATION, NOT A FILTER: every card is `pressable: false` (no `aria-pressed`). Passed and No reply also
 *    set the wall's kind, which the page owns.
 * ⚠️ THE FOUR COUNTS SUM TO answered + still waiting (`pageCounts`). Withdrawn and Signed are not on the page.
 */
import React, { useMemo } from "react";
import { WorkspaceNavyHeader, WsnhFigure, WsnhWords } from "../shell/WorkspaceNavyHeader";
import { GlanceCards, type GlanceItem } from "../shared/GlanceCards";
import type { PageCounts, RespRowInput } from "../../lib/responses";
import "../queries/centre/qcv150.css";

export type GlanceKey = "more" | "passed" | "noReply" | "waiting";
export const GLANCE_LABEL: Record<GlanceKey, string> = { more: "Asked for more", passed: "Passed", noReply: "No reply", waiting: "Still waiting" };
export const GLANCE_ORDER: readonly GlanceKey[] = ["more", "passed", "noReply", "waiting"];
export const FACE_CAP = 6;

export interface GlanceFacts {
  counts: PageCounts;
  /** the rows behind each card, newest first: their faces */
  rows: Record<GlanceKey, readonly RespRowInput[]>;
  yourMove: number;
  withNote: number;
  goneQuiet: number;
}

/** Workspace headers v1: "18 responses" — the agents who have answered (the glance line's "heard back from") */
export const responsesTitle = (n: number): string => `${n} ${n === 1 ? "response" : "responses"}`;
/** the empty page's headline (its own paragraph does not fit one line) */
export const RSP_EMPTY_TITLE = "No responses yet";

/* Workspace headers v1 (design-refs/workspace-headers-v1, "Responses") — the navy header: the count of agents who have
   answered, the book on the ruled line, Record and Share, and on the right the agents who asked for more and how many
   are waiting on you. Every figure is the page's own: `page.replies` and `page.more` (the glance line's), `yourMove`
   (the glance card's "your move"). Empty: the same header with "No responses yet" and that state's two buttons. */
export const RspHeader: React.FC<{
  msTitle: string | null;
  loading: boolean;
  empty: boolean;
  heard: number;
  more: number;
  yourMove: number;
  onRecord: () => void;
  onQueryCentre: () => void;
  onWall: () => void;
  onSeeThem: () => void;
}> = ({ msTitle, loading, empty, heard, more, yourMove, onRecord, onQueryCentre, onWall, onSeeThem }) => {
  const title = empty ? RSP_EMPTY_TITLE : responsesTitle(heard);
  return (
    <WorkspaceNavyHeader page="responses" art="responses-header" loading={loading}
      title={title}
      forLine={msTitle ? { lead: "for", text: msTitle } : null}
      actions={<>
        <button type="button" className="qc1531-b qc1531-b--n" data-rsp5="record" disabled={loading} onClick={onRecord}>+ Record a response</button>
        {empty
          ? <button type="button" className="qc1531-b qc1531-b--g" data-rsp5="to-qc" onClick={onQueryCentre}>Open the Query Centre</button>
          : <button type="button" className="qc1531-b qc1531-b--g" data-rsp5="to-wall" disabled={loading} onClick={onWall}>Share your wall of no</button>}
      </>}
      right={empty ? null : <>
        <WsnhFigure>{more}</WsnhFigure>
        <WsnhWords lead={more === 1 ? "agent" : "agents"} name="asked for more"
          sub={<><b data-rsp5="hd-move">{yourMove}</b> {yourMove === 1 ? "is" : "are"} waiting on you</>}>
          <button type="button" className="qc1531-b qc1531-b--g" data-rsp5="see-them" onClick={onSeeThem}>See them</button>
        </WsnhWords>
      </>}
      bar={{
        title,
        aside: empty ? null : <><b>{more} asked for more</b><em>{yourMove} waiting on you</em></>,
        button: { label: "+ Record a response", onClick: onRecord },
      }} />
  );
};

const factOf = (k: GlanceKey, f: GlanceFacts): string =>
  k === "more" ? `${f.yourMove} your move` : k === "passed" ? `${f.withNote} with a note` : k === "noReply" ? "after the wait" : `${f.goneQuiet} gone quiet`;

export const Rsp5Glance: React.FC<{
  facts: GlanceFacts | null;
  onCard: (k: GlanceKey) => void;
}> = ({ facts, onCard }) => {
  const items = useMemo<GlanceItem[]>(() => GLANCE_ORDER.map((k) => {
    const n = facts ? facts.counts[k] : 0;
    const rows = facts ? facts.rows[k] : [];
    return {
      key: k, label: GLANCE_LABEL[k], figure: n, total: n, tone: `rs-${k}`, pressable: false,
      faces: rows.slice(0, FACE_CAP).map((r) => ({ key: r.id, initials: r.initials, title: r.agentName })),
      swatch: `rsp5-gd rsp5-gd--${k}`,
      doodle: facts ? <small className="rsp5-gfact" data-rsp5="glance-fact" data-k={k}>{factOf(k, facts)}</small> : null,
      ariaLabel: `${GLANCE_LABEL[k]}: ${n}. ${k === "more" ? "Go to the requests" : k === "waiting" ? "Go to how long agents took" : "Go to your wall of no"}`,
    };
  }), [facts]);
  const c = facts?.counts;
  return (
    <div className="rsp5-glance" data-rsp5="glance-wrap">
      <GlanceCards items={items} pressed={null} onCard={(k) => onCard(k as GlanceKey)} ready={!!facts} loading={!facts}
        probe="rsp5" headingId="rsp5-gh" />
      {c ? (
        <p className="rsp5-gline" data-rsp5="glance-line">
          You&rsquo;ve heard back from <b>{c.replies} of {c.sent}</b> agents you&rsquo;ve queried, and <b>{c.more}</b> of them asked to read more.
        </p>
      ) : null}
    </div>
  );
};
