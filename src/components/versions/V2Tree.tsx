/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Versions v2 — the family tree (P4; the ref's `tree()`), on its own warm-grey band: one column per generation,
 * connectors from each parent to its children, the route from Original to the in-use version picked out, compact
 * cards past 7 versions, sideways scrolling with edge fades.
 *
 * ⚠️ THE CONNECTORS ARE MEASURED FROM THE RENDERED CARDS, after layout and on every resize — a card's height depends on
 *    how many changes it lists, so no number written here could place them.
 * ⚠️ AN ARCHIVED VERSION WITH LIVE DESCENDANTS STAYS, faded and labelled ARCHIVED, so no live version loses its parent.
 */
import React, { useLayoutEffect, useRef, useState } from "react";
import type { Manuscript } from "../../types";
import type { V2Version } from "../../lib/bookVersions";
import { generationLabel, treeModel, type VersionsModel } from "../../lib/versionsV2";
import { BookMark } from "./v2Bits";

export const V2Tree: React.FC<{ ms: Manuscript; m: VersionsModel; onOpen: (id: string, from: HTMLElement | null) => void }> = ({ ms, m, onOpen }) => {
  const t = treeModel(m);
  const treeRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<{ w: number; h: number; d: string; hot: string }>({ w: 0, h: 0, d: "", hot: "" });
  const [edge, setEdge] = useState({ l: false, r: false });
  const scrolled = useRef(false);
  const byId = new Map(m.versions.map((v) => [v.id, v]));
  const sig = t.nodes.map((v) => `${v.id}:${v.parentId}:${v.changes.length}:${v.archived}`).join("|") + `|${m.inUse}|${t.compact}`;

  useLayoutEffect(() => {
    const el = treeRef.current;
    if (!el) return;
    const draw = () => {
      const R = el.getBoundingClientRect();
      let d = "", hot = "";
      for (const v of t.nodes) {
        if (!v.parentId || !t.nodes.some((x) => x.id === v.parentId)) continue;
        const a = el.querySelector(`#tn-${CSS.escape(v.parentId)}`)?.getBoundingClientRect();
        const b = el.querySelector(`#tn-${CSS.escape(v.id)}`)?.getBoundingClientRect();
        if (!a || !b) continue;
        const yo = t.compact ? 24 : 30;
        const x1 = a.right - R.left + el.scrollLeft, y1 = a.top + yo - R.top, x2 = b.left - R.left + el.scrollLeft, y2 = b.top + yo - R.top;
        const mx = x1 + (x2 - x1) / 2, r = y2 === y1 ? 0 : y2 > y1 ? 8 : -8;
        const seg = `<path d="M${x1} ${y1} H${mx - Math.abs(r)} Q${mx} ${y1} ${mx} ${y1 + r} V${y2 - r} Q${mx} ${y2} ${mx + Math.abs(r)} ${y2} H${x2 - 6}"/><path class="hd" d="M${x2 - 11} ${y2 - 5} L${x2 - 3} ${y2} L${x2 - 11} ${y2 + 5}"/>`;
        if (t.path.has(v.id)) hot += seg; else d += seg;
      }
      setSvg({ w: el.scrollWidth, h: el.scrollHeight, d, hot });
      setEdge({ r: el.scrollLeft + el.clientWidth < el.scrollWidth - 4, l: el.scrollLeft > 4 });
    };
    draw();
    if (t.compact && m.inUse && !scrolled.current) {
      scrolled.current = true;
      const u = el.querySelector<HTMLElement>(`#tn-${CSS.escape(m.inUse)}`);
      if (u) el.scrollLeft = Math.max(0, u.offsetLeft - el.clientWidth / 2 + u.offsetWidth / 2);
      draw();
    }
    const ro = new ResizeObserver(draw);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  if (t.nodes.length < 2) return null;

  const foot = (v: V2Version) => {
    const f = m.facts.get(v.id)!;
    return f.n ? (f.early
      ? <span className="tr-f ey"><span>Too early to tell</span><em>{f.n} sent</em></span>
      : <span className="tr-f"><b>{f.ratePct}%</b><span>asked for more</span><em>{f.n} sent</em></span>)
      : <span className="tr-f e"><span>Not sent yet</span></span>;
  };
  const node = (v: V2Version) => {
    const p = v.parentId ? byId.get(v.parentId) ?? null : null;
    const use = v.id === m.inUse;
    const on = (t.path.has(v.id) ? " onpath" : "") + (v.archived ? " arch" : "");
    const open = (e: React.MouseEvent<HTMLButtonElement>) => onOpen(v.id, e.currentTarget);
    if (!p) {
      return (
        <button type="button" key={v.id} className={`tr-n tr-root${use ? " use" : ""}${on}`} id={`tn-${v.id}`} data-vv2="tree-node" onClick={open}>
          <span className="tr-h"><span className="tr-bk"><BookMark /></span><span className="tr-rk">Original manuscript</span></span>
          <b className="tr-rt">{v.original ? ms.title : v.name}</b>
          {t.compact ? null : <span className="tr-st">As it went out before you started tracking versions.</span>}
          {foot(v)}
        </button>
      );
    }
    if (t.compact) {
      return (
        <button type="button" key={v.id} className={`tr-n tr-sm${use ? " use" : ""}${on}`} id={`tn-${v.id}`} data-vv2="tree-node" title={v.changes.join(" · ")} onClick={open}>
          <span className="tr-h"><span className={`vl-n${use ? " on" : ""}`}>{v.num}</span><b>{v.name}</b>{use ? <em className="tr-use">In use</em> : null}</span>
          <span className="tr-one">{v.changes[0] ?? ""}{v.changes.length > 1 ? <> <em>+{v.changes.length - 1}</em></> : null}</span>
          {foot(v)}
        </button>
      );
    }
    return (
      <button type="button" key={v.id} className={`tr-n${use ? " use" : ""}${on}`} id={`tn-${v.id}`} data-vv2="tree-node" onClick={open}>
        <span className="tr-h"><span className={`vl-n${use ? " on" : ""}`}>{v.num}</span><b>{v.name}</b>{use ? <em className="tr-use">In use</em> : null}</span>
        <span className="tr-k">From {p.original ? "the original" : p.name}{p.archived ? " (archived)" : ""}</span>
        {v.archived ? <span className="tr-ar">Archived</span> : null}
        <span className="tr-cl">{v.changes.map((c, i) => <span className="tr-c" key={i}>{c}</span>)}</span>
        {foot(v)}
      </button>
    );
  };

  return (
    <section className="cx-sec is-full trs" id="secTree" data-skin="e" data-vv2="tree" aria-labelledby="msTH">
      <div className="trs-hd">
        <div className="trs-tx">
          <p className="oh-k">Family tree</p>
          <h2 id="msTH">How your versions connect</h2>
          <p className="trs-s">Each version, what changed from the one before, and how it’s doing.</p>
          <p className="trs-n" id="trsN" hidden={!t.compact}>
            {t.compact ? `${t.nodes.length - 1} versions and the original, up to ${t.cols.length - 1} steps from it. The line to the version in use is picked out. Scroll the tree sideways to see it all.` : ""}
          </p>
        </div>
        <div className="trs-art" aria-hidden="true"><span>Illustration<small>A hawk pinning cards to a family tree</small></span></div>
      </div>
      <div className={`trw${edge.l ? " more-l" : ""}${edge.r ? " more-r" : ""}`} id="trw" ref={wrapRef}>
        <div className={`tree${t.compact ? " compact" : ""}`} id="tree" ref={treeRef}
          onScroll={(e) => { const el = e.currentTarget; setEdge({ r: el.scrollLeft + el.clientWidth < el.scrollWidth - 4, l: el.scrollLeft > 4 }); }}>
          <svg className="tr-svg" aria-hidden="true" viewBox={`0 0 ${svg.w || 1} ${svg.h || 1}`} style={{ width: svg.w ? `${svg.w}px` : undefined, height: svg.h ? `${svg.h}px` : undefined }}
            dangerouslySetInnerHTML={{ __html: `${svg.d}<g class="hot">${svg.hot}</g>` }} />
          {t.cols.map((c, g) => (
            <div className="tr-col" key={g}><span className="tr-gh">{generationLabel(g)}</span>{c.map(node)}</div>
          ))}
        </div>
      </div>
    </section>
  );
};
