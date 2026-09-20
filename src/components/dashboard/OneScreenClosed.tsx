/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OneScreenClosed — the closed-queries card (v33, 18 Sep; ref design-refs/dashboard-v33.html).
 *
 * A sentence for a title ("27 closed queries") on the stone band; a ring of four slices; the
 * Archivist, whose drawer tucks BEHIND the ring's sides while his head comes in FRONT of its top; and
 * a key of four rows that state their counts as tallies.
 *
 * ⚠️ THE ARCHIVIST IS DRAWN TWICE, IN THE SAME PLACE. A back copy under the ring, the ring, a front
 * copy over it — and the front copy is CLIPPED to a wedge fanning up from the ring's centre, so only
 * his head is in front. The wedge's two edges fall at 320° and 52°, in the clear gaps between the four
 * arcs where his outline crosses the ring (336–31° head · 74–131° drawer · 244–286° wing), so the
 * switch from "in front" to "behind" never lands where he touches the ring and there is no seam.
 * ⚠️ IF HIS SIZE OR POSITION CHANGES, THE WEDGE MUST BE RECOMPUTED — much above 136px wide the head
 * and wing arcs merge and there is nowhere clean to switch. The numbers live in the stylesheet beside
 * the size they belong to.
 *
 * ⚠️ HE LOOKS UP WHILE YOU ARE ON THE CARD — the second drawing fades IN over the first, which stays
 * fully opaque underneath, on BOTH layers (the front "looking" copy takes the same clip). His outline
 * barely changes between the drawings, so this is a plain fade; the Mentor's additive cross-dissolve
 * is for a silhouette that changes shape and would be wrong here.
 *
 * ⚠️ THE RING IS TURNED SO ITS LARGEST SLICE IS UNDER HIS HEAD (`dashClosed.donutRotation`), so the
 * ~65° he covers never hides a small slice.
 *
 * ⚠️ SLICES AND KEY ROWS ARE ONE CONTROL, TWICE. Hovering either grows that slice's stroke, drops the
 * other three to 38%, tints its row and shows the same popup; clicking either pins it.
 */
import React, { useEffect, useRef, useState } from "react";
import type { Agent, Query } from "../../types";
import {
  arcDash, CLOSED_BUCKETS, CLOSED_NOTE, DONUT, DONUT_C, closedDonut, donutRotation,
  type ClosedBucketKey, type ClosedTile,
} from "../../lib/dashClosed";
import { CLOSED_EMPTY_LINE, CLOSED_EMPTY_TITLE } from "../../lib/dashEmpty";
import { closedAt } from "../../lib/oneScreen";
import { DASH_ART, artUrl } from "../../lib/dashArt";
import { OneScreenPanel } from "./OneScreenPanel";
import { TallyMarks } from "./TallyMarks";
import { useDashPopup } from "./DashPopup";

/**
 * The chips' hand-drawn marks, VERBATIM from the ref — a small "zzz" stepping up to the right for
 * No reply, and a cross for each pass. ⚠️ THE THREE CROSSES ARE THREE DIFFERENT PATHS, so they look
 * drawn by hand rather than stamped; do not "tidy" them into one.
 */
const CHIP_MARK: Record<ClosedBucketKey, string> = {
  quiet: "M3.2 10.2h5.2l-5.3 5.2h5.5M9.6 6h3.5l-3.6 3.5h3.8M13.4 2.5h2.4l-2.5 2.4h2.6",
  letter: "M5 5.3c2.5 2.3 5.3 5 8.1 7.6M13.3 4.9c-2.9 2.6-5.7 5.5-8.4 8.3",
  partial: "M4.8 4.8c3 2.9 5.4 5.4 8.5 8.2M12.9 5.2c-2.4 2.5-5.2 5.1-7.8 8",
  full: "M5.3 4.9c2.3 2.8 5 5.3 7.7 8.3M13.2 5.4c-3 2.3-5.5 5.3-8.3 7.7",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const shortDate = (ms: number | null): string => { if (ms === null) return ""; const d = new Date(ms); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; };

/** "27 closed queries" · "1 closed query" · "No closed queries" */
export const closedTitle = (n: number | null): string =>
  n === null ? "Closed queries" : n === 0 ? "No closed queries" : `${n.toLocaleString("en-GB")} closed ${n === 1 ? "query" : "queries"}`;

const Archivist: React.FC<{ layer: "back" | "front" }> = ({ layer }) => (
  <>
    <img className={`os-arch os-arch--${layer}`} src={artUrl(DASH_ART.archivist)} width={DASH_ART.archivist.width} height={DASH_ART.archivist.height} alt="" decoding="sync" />
    <img className={`os-arch os-arch--${layer} os-arch--alt`} src={artUrl(DASH_ART.archivistLooking)} width={DASH_ART.archivistLooking.width} height={DASH_ART.archivistLooking.height} alt="" decoding="sync" />
  </>
);

export const OneScreenClosed: React.FC<{
  loading: boolean;
  /** null while the collections are still landing — no figure is stated */
  tile: ClosedTile | null;
  /** lookup sets for the popup's "three most recent" — unscoped, like every lookup on this page */
  queries?: Query[];
  agents?: Agent[];
  onSeeAll: () => void;
  onOpenQuery?: (queryId: string) => void;
}> = ({ loading, tile, queries = [], agents = [], onSeeAll, onOpenQuery }) => {
  const t = loading ? null : tile;
  const popup = useDashPopup();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [at, setAt] = useState<ClosedBucketKey | null>(null);
  useEffect(() => popup.onRelease("ring", () => setAt(null)), [popup]);

  const arcs = t ? closedDonut(t) : [];
  const c = DONUT.box / 2;
  const band = <div className="os-bandrow"><h3 className="os-cardttl" data-probe-text="closed-title">{closedTitle(t ? t.total : null)}</h3></div>;

  if (t && t.total === 0) {
    return (
      <OneScreenPanel variant="os-cl" probe="closed-tile" loading={loading} skel={["h", "grow", ""]} band={band} innerRef={cardRef}>
        <div className="os-hollow" data-probe="closed-empty">
          <span className="os-hollow-art os-hollow-art--archivist" aria-hidden="true"><Archivist layer="back" /></span>
          <p className="os-hollow-ttl">{CLOSED_EMPTY_TITLE}</p>
          <p className="os-hollow-line">{CLOSED_EMPTY_LINE}</p>
        </div>
      </OneScreenPanel>
    );
  }

  const content = (key: ClosedBucketKey): React.ReactNode => {
    if (!t) return null;
    const spec = CLOSED_BUCKETS.find((b) => b.key === key)!;
    const ids = t.members[key];
    const count = ids.length;
    const pct = t.total > 0 ? Math.round((count / t.total) * 100) : 0;
    const recent = ids.slice(0, 3).map((id) => {
      const q = queries.find((x) => x.id === id);
      const agent = q ? agents.find((a) => a.id === q.agentId) : undefined;
      const who = (agent?.name ?? "").trim() || (agent?.agency ?? "").trim() || "An agent";
      return { id, text: [who, q ? shortDate(closedAt(q)) : ""].filter(Boolean).join(" · ") };
    });
    const go = () => { popup.release(); if (count === 1) onOpenQuery?.(ids[0]); else onSeeAll(); };
    return (
      <>
        <p className="os-tip-ey">{count.toLocaleString("en-GB")} of {t.total.toLocaleString("en-GB")} · {pct}%</p>
        <p className="os-tip-big">{spec.label}</p>
        <p className="os-tip-sub">{CLOSED_NOTE[key]}</p>
        {recent.length > 0 && <ul className="os-tip-list os-tip-list--plain">{recent.map((r) => <li key={r.id}>{r.text}</li>)}</ul>}
        {count > 0 && (
          <button type="button" className="os-tip-link" onClick={go}>
            {count > 1 ? `See all ${count.toLocaleString("en-GB")} →` : "Open this query →"}
          </button>
        )}
      </>
    );
  };

  const hoverAt = (key: ClosedBucketKey, x: number, y: number) => {
    if (popup.locked()) return;
    if (at !== key) setAt(key);
    popup.show("ring", content(key), x, y, cardRef.current);
  };
  const leave = () => { if (popup.locked()) return; setAt(null); popup.hide("ring"); };
  const pinAt = (key: ClosedBucketKey, x: number, y: number) => { setAt(key); popup.pin("ring", content(key), x, y, cardRef.current); };
  const centreOf = (el: Element): [number, number] => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  /** one set of handlers, worn by a slice and by its row */
  const linked = (key: ClosedBucketKey, count: number) => (count > 0 ? {
    role: "button" as const,
    tabIndex: 0,
    onMouseMove: (ev: React.MouseEvent) => hoverAt(key, ev.clientX, ev.clientY),
    onMouseLeave: leave,
    onClick: (ev: React.MouseEvent) => pinAt(key, ev.clientX, ev.clientY),
    onFocus: (ev: React.FocusEvent) => hoverAt(key, ...centreOf(ev.currentTarget)),
    onBlur: leave,
    onKeyDown: (ev: React.KeyboardEvent) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); pinAt(key, ...centreOf(ev.currentTarget)); } },
  } : {});

  return (
    <OneScreenPanel variant="os-cl" probe="closed-tile" loading={loading} skel={["h", "grow", ""]} band={band} innerRef={cardRef}>
      <div className="os-clpie">
        <div className="os-ringbox" data-probe="ringbox">
          <Archivist layer="back" />
          <svg
            viewBox={`0 0 ${DONUT.box} ${DONUT.box}`}
            style={{ transform: `rotate(${(t ? donutRotation(t) : 0).toFixed(2)}deg)` }}
            data-probe="ring"
            role="group"
            aria-label={t ? closedTitle(t.total) : "Closed queries"}
          >
            <circle className="os-dntrack" cx={c} cy={c} r={DONUT.r} fill="none" strokeWidth={DONUT.stroke} />
            {arcs.map((a) => {
              const spec = CLOSED_BUCKETS.find((b) => b.key === a.key)!;
              const count = t?.buckets.find((x) => x.key === a.key)?.count ?? 0;
              return (
                <circle
                  key={a.key}
                  className={`os-dnarc os-dnarc--${a.key}${at ? (at === a.key ? " at" : " off") : ""}`}
                  data-probe="closed-arc"
                  data-bucket={a.key}
                  cx={c} cy={c} r={DONUT.r} fill="none"
                  strokeDasharray={`${arcDash(a).toFixed(2)} ${DONUT_C.toFixed(2)}`}
                  strokeDashoffset={a.offset.toFixed(2)}
                  transform={`rotate(-90 ${c} ${c})`}
                  aria-label={`${spec.label}: ${count}`}
                  {...linked(a.key, count)}
                />
              );
            })}
          </svg>
          <Archivist layer="front" />
        </div>
      </div>

      <div className="os-clkey">
        {CLOSED_BUCKETS.map((b, i) => {
          const count = t?.buckets.find((x) => x.key === b.key)?.count;
          return (
            <div
              className={`os-clrow${i === 0 ? " os-clrow--first" : ""}${count === 0 ? " z" : ""}${at === b.key ? " at" : ""}`}
              key={b.key}
              data-probe="closed-row"
              data-bucket={b.key}
              {...linked(b.key, count ?? 0)}
            >
              <i className={`os-dnsw os-dnsw--${b.key}`} aria-hidden="true">
                <svg viewBox="0 0 18 18" aria-hidden="true"><path d={CHIP_MARK[b.key]} /></svg>
              </i>
              <span className="os-clrowlab">{b.label}</span>
              {count === undefined ? <span className="os-tally" /> : <TallyMarks count={count} />}
            </div>
          );
        })}
      </div>
    </OneScreenPanel>
  );
};
