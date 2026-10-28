/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Responses v5 Phase 2 (design-refs/responses-v5/responses-v5.html, `header` and `glance`) — THE TITLE CARD and AT A
 * GLANCE.
 *
 * ⚠️ BOTH ARE THE SHARED COMPONENTS, NOT COPIES: the title card is `shared/PageHeaderCard` (Versions' and the Query
 *    Centre's) and the four cards are `shared/GlanceCards` (the Query Centre's v150.1 stat cards, lifted by Contact list
 *    v25). This file names the Responses page's own words, tints and figures; the look of both lives with them, and
 *    responses5.css only sizes them to the reference.
 * ⚠️ THE HEAD'S SHORT FACT ("3 your move") RIDES IN THE CARD'S `doodle` SLOT, which takes any node: GlanceCards has no
 *    slot named for it, and editing a shared component is out of this pack's scope.
 * ⚠️ A CARD IS NAVIGATION, NOT A FILTER: every card is `pressable: false` (no `aria-pressed`). Passed and No reply also
 *    set the wall's kind, which the page owns.
 * ⚠️ THE FOUR COUNTS SUM TO answered + still waiting (`pageCounts`). Withdrawn and Signed are not on the page.
 */
import React, { useMemo } from "react";
import { PageHeaderCard } from "../shared/PageHeaderCard";
import { GlanceCards, type GlanceItem } from "../shared/GlanceCards";
import type { PageCounts, RespRowInput } from "../../lib/responses";
import "../queries/centre/qcv150.css";

export const RSP5_HAWK = { src: "/images/responses/responses-wall-hawk.webp", version: "e223df95" } as const;
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

export const Rsp5TitleCard: React.FC<{
  msTitle: string | null;
  empty: boolean;
  loading: boolean;
  onRecord: () => void;
  /** populated: scroll to the wall · empty: open the Query Centre */
  onSecond: () => void;
}> = ({ msTitle, empty, loading, onRecord, onSecond }) => {
  const book = <b data-rsp5="ms">{msTitle || "your book"}</b>;
  return (
    <PageHeaderCard className="rsp5-card" titleId="rsp5T" art={`${RSP5_HAWK.src}?v=${RSP5_HAWK.version}`}
      data={{ "data-rsp5": "title-card", "data-own-header": "" }} titleData={{ "data-page-title": "true", "data-rsp5": "title" }}
      title={<span className="hl">Responses</span>}
      body={empty
        ? <>Nothing back from agents on {book} yet. When the first answer arrives, record it here and this page starts to fill up.</>
        : <>Every answer from agents on {book}: who wants to read on, who passed, and what the answers have in common.</>}
      primary={{ label: "+ Record a response", onClick: onRecord, disabled: loading, data: { "data-rsp5": "record" } }}
      secondary={empty
        ? { label: "Open the Query Centre", onClick: onSecond, data: { "data-rsp5": "to-qc" } }
        : { label: "Share your wall of no", onClick: onSecond, disabled: loading, data: { "data-rsp5": "to-wall" } }} />
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
