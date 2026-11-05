/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v41 Part F (screens 05, 06) — Results as Dashboard v2 framed cards. REPLACES Pk38Results (v38's
 * navy band, v39's tilted showcase cards and their headings, and the pieces' own showcase row, all retired):
 *   · "How your packages are doing", with "What gets agents asking for more" in italic;
 *   · the totals card: a navy band "{n} queries sent with a package" · "{k} packages sent so far", and three tiles
 *     (got a reply, asked for more, partial or full requests);
 *   · three framed cards — Doing best (sand), Sent the most (sage), Still to prove (stone);
 *   · "Every package" and "Versions, letters and synopses" as framed cards with stone bands and hairline rows, the
 *     second card's tabs in its band;
 *   · "How it's counted", the beige note.
 *
 * ⚠️ EVERY FIGURE IS UNCHANGED: packageReplies' first answers, materials edition-true, nothing ranked before
 *    MIN_SENDS_FOR_CLAIM answers (lib/packagesV38 `bandTotals`, `packageShowcases`; lib/packagesV39 `fullListOrder`,
 *    `countCells`, `rateCell`). Only how they are drawn changed.
 */
import React, { useLayoutEffect, useRef, useState } from "react";
import type { SubmissionPackage } from "../../../types";
import { bandTotals, MIN_SENDS_FOR_CLAIM, packageShowcases, thresholdWords, type Bar, type Fig } from "../../../lib/packagesV38";
import { countCells, fullListOrder, rateCell } from "../../../lib/packagesV39";
import { Mark } from "../v26/icons";
import type { MaterialRow, Pk26Model, VersionRow } from "../v26/usePk26Model";
import { PkTile } from "../v42/PkTile";

type PkItem = { id: string; name: string; retired?: boolean; f: Fig; ref: SubmissionPackage };
type PieceKind = "let" | "syn" | "ver";

export const RES_TITLE = "How your packages are doing";
export const RES_SUB = "What gets agents asking for more";
/* Versions first, and the list opens on it (v39.2 C) */
const PC_TABS: [PieceKind, string, string][] = [["ver", "Versions", "Version"], ["let", "Query letters", "Letter"], ["syn", "Synopses", "Synopsis"]];

/** The shared frame (Dashboard v2's card): a 7px white rim, a 1px #e3d5c9 inner frame, a band. */
export const Frame: React.FC<{ tone: "nv" | "sd" | "sg" | "st"; title: React.ReactNode; meta?: React.ReactNode; data?: Record<string, string>; cls?: string; children: React.ReactNode; onClick?: () => void }> = ({ tone, title, meta, data, cls, children, onClick }) => (
  <div className={`p41-fr${cls ? ` ${cls}` : ""}`} {...data} onClick={onClick}>
    <div className="p41-fi">
      <div className={`p41-band p41-band-${tone}`} data-pk41-band={tone}><b>{title}</b>{meta != null ? <span>{meta}</span> : null}</div>
      {children}
    </div>
  </div>
);

const Bars: React.FC<{ bars: Bar[] }> = ({ bars }) => (
  <div className="p41-bars">
    {bars.map((b) => (
      <div key={b.id} className={`p41-bar${b.on ? " p41-on" : ""}${b.w == null ? " p41-early" : ""}`}>
        <span title={b.name}>{b.name}</span><i><u style={{ width: `${b.w ?? 100}%` }} /></i><b>{b.w == null ? "–" : b.v}</b>
      </div>
    ))}
  </div>
);

const ListHead: React.FC<{ first: string }> = ({ first }) => (
  <div className="p41-th"><span>{first}</span><span>Sent</span><span>Answered</span><span>Asked for more</span><span>Rate</span></div>
);
const ListRow: React.FC<{ f: Fig; lead: React.ReactNode; name: string; sub: string; onOpen: () => void; data: Record<string, string> }> = ({ f, lead, name, sub, onOpen, data }) => {
  const [s, a, m] = countCells(f);
  const r = rateCell(f);
  return (
    <button type="button" className="p41-tr" onClick={onOpen} {...data} data-rate={r.k === "ranked" ? String(f.pct) : r.k}>
      <span className="p41-tn">{lead}<span><b title={name}>{name}</b>{sub ? <small title={sub}>{sub}</small> : null}</span></span>
      <span className="p41-tc">{s}</span><span className="p41-tc">{a}</span><span className="p41-tc">{m}</span>
      <span className={`p41-tv${r.k === "early" ? " p41-early" : r.k === "none" ? " p41-none" : ""}`}><i><u style={{ width: `${r.width}%` }} /></i><b>{r.label}</b></span>
    </button>
  );
};

export const Pk41Results: React.FC<{
  model: Pk26Model;
  onOpenPkg: (p: SubmissionPackage) => void;
  onOpenMaterial: (kind: "let" | "syn", id: string) => void;
  onOpenVersions: () => void;
  onSeeQueries: (ids: string[]) => void;
  onAnalytics: () => void;
}> = ({ model, onOpenPkg, onOpenMaterial, onOpenVersions, onSeeQueries, onAnalytics }) => {
  const tot = bandTotals(model.overallSplit);
  const pkgs = model.figItems("pk") as PkItem[];
  const sentPkgs = pkgs.filter((p) => p.f.sent > 0).length;
  const [rlk, setRlk] = useState<PieceKind>("ver");
  const tabsRef = useRef<HTMLDivElement | null>(null);
  /* ⚠️ SWITCHING A TAB NEVER MOVES THE PAGE (v39): the scroller's position is put back before paint */
  const keep = useRef<{ el: HTMLElement; top: number } | null>(null);
  useLayoutEffect(() => { const k = keep.current; if (k) { k.el.scrollTop = k.top; keep.current = null; } }, [rlk]);
  const pickTab = (k: PieceKind, focus = false) => {
    const el = tabsRef.current?.closest(".wpg-scroll") as HTMLElement | null;
    if (el) keep.current = { el, top: el.scrollTop };
    setRlk(k);
    if (focus) requestAnimationFrame(() => tabsRef.current?.querySelector<HTMLButtonElement>(`[data-rlk="${k}"]`)?.focus({ preventScroll: true }));
  };
  const pieceLine = (p: SubmissionPackage) => [
    p.bookVersionId ? model.versionRows.find((v) => v.id === p.bookVersionId)?.name : null, model.matName("let", p.queryLetterVersionId),
  ].filter(Boolean).join(" · ");

  if (!tot) {
    return (
      <section className="p41-res" aria-labelledby="p41-resT" data-pk26="results" data-pk41="results">
        <div className="p41-rh"><h2 id="p41-resT" className="p41-rh-h">{RES_TITLE}</h2><span>{RES_SUB}</span></div>
        <p className="p41-foot" data-pk38="empty"><b>Nothing to show yet.</b> Log a query with a package and its results start here.</p>
      </section>
    );
  }

  const cards = packageShowcases(pkgs).map((s) => {
    const p = s.item.ref, f = s.item.f, ret = p.status === "Retired";
    const head = <div className="p41-bc-n"><PkTile p={p} /><span><b>{p.packageName}</b>{pieceLine(p) ? <small>{pieceLine(p)}</small> : null}</span></div>;
    const open = () => onOpenPkg(p);
    const tone = s.k === "best" ? "sd" : s.k === "most" ? "sg" : "st";
    const title = s.k === "best" ? "Doing best" : s.k === "most" ? "Sent the most" : "Still to prove";
    let body: React.ReactNode;
    let act: React.ReactNode = null;
    if (s.k === "best") {
      const use = model.active?.id === p.id;
      body = <><div className="p41-bc-big">{f.pct}%</div><p>asked for more: {f.more} of {f.sent}</p><Bars bars={s.bars} /></>;
      if (!ret && !use) act = <button type="button" className="p41-lnk" onClick={(e) => { e.stopPropagation(); void model.makeActive(p); }}>Make it your active package</button>;
      else if (use) act = <button type="button" className="p41-lnk" onClick={(e) => { e.stopPropagation(); onSeeQueries(model.creditedQueries(p).map((q) => q.id)); }}>See its queries</button>;
    } else if (s.k === "most") {
      body = <><div className="p41-bc-big">{f.sent}</div><p>queries sent{f.ranked ? `, ${f.pct}% asked for more` : ""}</p><Bars bars={s.bars} /></>;
    } else {
      body = (
        <>
          <div className="p41-bc-big">{s.got} of {s.need}</div>
          <p>{f.sent ? "answers needed to compare it" : "Not sent yet"}</p>
          <div className="p41-dots" aria-hidden="true">{Array.from({ length: s.need }, (_, i) => <i key={i} className={i < s.got ? "p41-f" : ""} />)}</div>
        </>
      );
    }
    return (
      <Frame key={`${s.k}:${p.id}`} tone={tone} title={title} meta={ret ? "Retired" : null} cls="p41-bc" data={{ "data-pk38": "show", "data-show": `${s.k}:${p.id}`, "data-pk41": `best-${s.k}` }}>
        <button type="button" className="p41-bc-b" onClick={open} aria-label={`${title}: ${p.packageName}. Open its figures`}>{head}{body}</button>
        {act ? <div className="p41-bc-f">{act}</div> : null}
      </Frame>
    );
  });

  const pcItems = model.figItems(rlk);
  return (
    <section className="p41-res" aria-labelledby="p41-resT" data-pk26="results" data-pk41="results" data-pk38="agg">
      <div className="p41-rh"><h2 id="p41-resT" className="p41-rh-h">{RES_TITLE}</h2><span>{RES_SUB}</span></div>
      <Frame tone="nv" title={`${tot.sent} ${tot.sent === 1 ? "query" : "queries"} sent with a package`} meta={`${sentPkgs} ${sentPkgs === 1 ? "package" : "packages"} sent so far`} data={{ "data-pk41": "totals", "data-pk38": "totals" }}>
        <div className="p41-tiles">
          <div><b>{tot.replied}%</b><span>got a reply</span></div>
          <div><b>{tot.more}%</b><span>asked for more</span></div>
          <div><b>{model.overallSplit.requests}</b><span>partial or full requests</span></div>
        </div>
      </Frame>
      {cards.length ? <div className="p41-best" data-pk41="best">{cards}</div> : null}
      <Frame tone="st" title="Every package" meta={`Best first. Ranked once ${MIN_SENDS_FOR_CLAIM} agents have answered.`} data={{ "data-pk41": "table-pk", "data-pk39": "list-pk" }}>
        <div className="p41-tbl">
          <ListHead first="Package" />
          {fullListOrder(pkgs).map((it) => {
            const p = it.ref;
            const sub = [model.active?.id === p.id && p.status !== "Retired" ? "Active" : "", p.status === "Retired" ? "Retired" : "", p.note ?? ""].filter(Boolean).join(" · ");
            return <ListRow key={p.id} f={it.f} name={p.packageName} sub={sub} onOpen={() => onOpenPkg(p)} data={{ "data-row": `pk:${p.id}` }} lead={<PkTile p={p} cls="p41-ic-s" />} />;
          })}
        </div>
      </Frame>
      <Frame tone="st" data={{ "data-pk41": "table-pc", "data-pk39": "list-pc" }} title="Versions, letters and synopses"
        meta={(
          <span className="p41-seg" role="tablist" aria-label="Show" ref={tabsRef}
            onKeyDown={(e) => {
              const i = PC_TABS.findIndex(([k]) => k === rlk);
              const j = e.key === "ArrowRight" ? (i + 1) % 3 : e.key === "ArrowLeft" ? (i + 2) % 3 : e.key === "Home" ? 0 : e.key === "End" ? 2 : -1;
              if (j < 0) return;
              e.preventDefault(); pickTab(PC_TABS[j][0], true);
            }}>
            {PC_TABS.map(([k, lab]) => (
              <button type="button" key={k} role="tab" id={`p41-rlt-${k}`} aria-controls="p41-rl-panel" aria-selected={rlk === k} tabIndex={rlk === k ? 0 : -1}
                data-rlk={k} onClick={() => pickTab(k)}>{lab}<em>{model.figItems(k).length}</em></button>
            ))}
          </span>
        )}>
        <div className="p41-tbl" role="tabpanel" id="p41-rl-panel" aria-labelledby={`p41-rlt-${rlk}`} data-kind={rlk}>
          <ListHead first={PC_TABS.find(([k]) => k === rlk)![2]} />
          {fullListOrder(pcItems).map((it) => {
            const m = it.ref as MaterialRow | VersionRow;
            const lead = <i className={`p41-t p41-tl ${rlk === "ver" ? "p41-t-v" : "p41-t-m"}`}>{rlk === "ver" ? ((m as VersionRow).original ? "O" : String((m as VersionRow).num)) : <Mark k={rlk} />}</i>;
            return <ListRow key={m.id} f={it.f} name={m.name} sub={m.summary ?? ""} lead={lead} data={{ "data-row": `${rlk}:${m.id}` }}
              onOpen={() => (rlk === "ver" ? onOpenVersions() : onOpenMaterial(rlk, m.id))} />;
          })}
        </div>
      </Frame>
      <div className="p41-foot" data-pk41="counted">
        <p><b>How it’s counted.</b> “Asked for more” is a partial or full request. Something is only ranked once {thresholdWords()} agents have answered it, so one lucky reply can’t top the list. Queries already sent keep the package they went with.</p>
        <span>
          <button type="button" className="p41-lnk" onClick={() => onSeeQueries([])}>See every query in the Query Centre</button>
          <button type="button" className="p41-lnk" onClick={onAnalytics}>More in Analytics</button>
        </span>
      </div>
    </section>
  );
};
