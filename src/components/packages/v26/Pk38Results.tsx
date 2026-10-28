/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages — Results. v38 (ref `#bnr`): the full-width ink-navy band with its three totals, unchanged.
 * v39 Part H (design-refs/submission-packages-v39/, screens 06–11), the rows below it (ref `renderAgg`, `p9-` prefix,
 * pk39.generated.css):
 *   · each row opens on a heading — an 84 × 72 illustration placeholder, a 28px typewriter h2 with a 3px underline (pale
 *     Harbour for Packages, pale pink for the pieces) and one serif line. Nothing more: no kickers, no taglines;
 *   · the top three, as v38 (one anatomy: a tilted card with a stats card overlapping it, then a kicker, the name, one
 *     sentence of figures and an action), the package cards' headers in each package's colour;
 *   · the FULL LIST, 88px below the top three, as a panel of its own: words on the left, a white table on the right —
 *     Package (or Letter / Synopsis / Version), Sent, Answered, Asked for more, Rate. The pieces' list shows ONE type at
 *     a time, behind a tablist; switching keeps the scroll position;
 *   · the pieces row sits on a full-bleed #ebe5dc band across the sheet; "How it's counted" stays on the page ground.
 *
 * ⚠️ FIGURES ARE packageReplies' (lib/packagesV38): first answers, materials edition-true, nothing ranked before
 *    MIN_SENDS_FOR_CLAIM answers. The lists and the top three read the same Fig, so they agree for the same item; the
 *    order is lib/packagesV39 `fullListOrder` (sent, then ranked, then rate, then sent).
 */
import React, { useLayoutEffect, useRef, useState } from "react";
import type { SubmissionPackage } from "../../../types";
import { iconOf } from "../../../lib/packagesV26";
import { bandTotals, bestPiece, MIN_SENDS_FOR_CLAIM, packageShowcases, thresholdWords, type Bar, type Fig } from "../../../lib/packagesV38";
import { countCells, fullListOrder, pcStyle, rateCell } from "../../../lib/packagesV39";
import { Mark, Pic } from "./icons";
import type { MaterialRow, Pk26Model, VersionRow } from "./usePk26Model";

type PkItem = { id: string; name: string; retired?: boolean; f: Fig; ref: SubmissionPackage };
type PieceKind = "let" | "syn" | "ver";

export const PK_HEADING = { t: "Packages", l: "Each package as a whole, as it went to agents.", art: "a row of parcels on a post-office counter" };
export const PC_HEADING = { t: "Letters, synopses and openings", l: "Each one on its own, whichever package it went out in.", art: "a hawk laying out a letter, a synopsis and pages on a desk" };
export const PK_LIST = { t: "Every package", l: (n: number) => `All ${n}, best first. A package moves up once ${thresholdWords()} agents have answered it; until then it waits at the bottom as “Too early”.` };
export const PC_LIST = { t: "Every letter, synopsis and version", l: "Each counted across every package it went out in, by the edition the agent actually got." };
const PC_TABS: [PieceKind, string, string][] = [["let", "Query letters", "Letter"], ["syn", "Synopses", "Synopsis"], ["ver", "Versions", "Version"]];

const Ov: React.FC<{ title: string; bars: Bar[] }> = ({ title, bars }) => (
  <div className="p9-ov">
    <p className="p9-ov-k">{title}</p>
    {bars.map((b) => (
      <div key={b.id} className={`p9-ov-b${b.on ? " p9-on" : ""}${b.w == null ? " p9-early" : ""}`}>
        <span>{b.name}</span><i><u style={{ width: `${b.w ?? 100}%` }} /></i><b>{b.v}</b>
      </div>
    ))}
  </div>
);

/** One row of a full list (ref `rowOf`). */
const ListRow: React.FC<{ f: Fig; lead: React.ReactNode; name: string; sub: string; onOpen: () => void; data: Record<string, string> }> = ({ f, lead, name, sub, onOpen, data }) => {
  const [s, a, m] = countCells(f);
  const r = rateCell(f);
  return (
    <button type="button" className="p9-rl-r" onClick={onOpen} {...data} data-rate={r.k === "ranked" ? String(f.pct) : r.k}>
      <span className="p9-rl-n">{lead}<span><b title={name}>{name}</b><small title={sub}>{sub}</small></span></span>
      <span className="p9-rl-c">{s}</span><span className="p9-rl-c">{a}</span><span className="p9-rl-c">{m}</span>
      <span className={`p9-rl-v${r.k === "early" ? " p9-early" : r.k === "none" ? " p9-none" : ""}`}><i><u style={{ width: `${r.width}%` }} /></i><b>{r.label}</b></span>
    </button>
  );
};
const ListHead: React.FC<{ first: string }> = ({ first }) => (
  <div className="p9-rl-hd"><span>{first}</span><span>Sent</span><span>Answered</span><span>Asked for more</span><span>Rate</span></div>
);

const Heading: React.FC<{ k: "pk" | "pc"; h: { t: string; l: string; art: string } }> = ({ k, h }) => (
  <header className={`p9-sh2 p9-sh2-${k}`} data-pk39={`heading-${k}`}>
    <span className="p9-ill p9-ill-m" title={`Illustration: ${h.art}`} aria-hidden="true"><i>Art</i></span>
    <div><h2>{h.t}</h2><p className="p9-sh2-l">{h.l}</p></div>
  </header>
);

export const Pk38Results: React.FC<{
  model: Pk26Model;
  onOpenPkg: (p: SubmissionPackage) => void;
  onOpenMaterial: (kind: "let" | "syn", id: string) => void;
  onOpenVersions: () => void;
  onSeeQueries: (ids: string[]) => void;
  onAnalytics: () => void;
}> = ({ model, onOpenPkg, onOpenMaterial, onOpenVersions, onSeeQueries, onAnalytics }) => {
  const tot = bandTotals(model.overallSplit);
  const avg = model.figAll.pct ?? 0;
  const pkgs = model.figItems("pk") as PkItem[];
  const [rlk, setRlk] = useState<PieceKind>("let");
  const tabsRef = useRef<HTMLDivElement | null>(null);
  /* ⚠️ SWITCHING A TAB NEVER MOVES THE PAGE: the table's height changes, so the scroller's position is read before the
     switch and put back after it (the ref's own `scrollTop` restore), before paint. */
  const keep = useRef<{ el: HTMLElement; top: number } | null>(null);
  useLayoutEffect(() => { const k = keep.current; if (k) { k.el.scrollTop = k.top; keep.current = null; } }, [rlk]);
  const pickTab = (k: PieceKind, focus = false) => {
    const el = tabsRef.current?.closest(".wpg-scroll") as HTMLElement | null;
    if (el) keep.current = { el, top: el.scrollTop };
    setRlk(k);
    if (focus) requestAnimationFrame(() => tabsRef.current?.querySelector<HTMLButtonElement>(`[data-rlk="${k}"]`)?.focus({ preventScroll: true }));
  };

  const li = (k: PieceKind, name: string | null, glyph: React.ReactNode, none: string) => (
    <li className={name ? "" : "p9-none"}><i className={`p9-tic p9-t-${k}`}>{glyph}</i>{name ?? none}</li>
  );
  const pkCard = (p: SubmissionPackage) => {
    const L = model.matName("let", p.queryLetterVersionId), Y = model.matName("syn", p.synopsisVersionId);
    const V = p.bookVersionId ? model.versionRows.find((v) => v.id === p.bookVersionId) ?? null : null;
    return (
      <div className="p9-ac-pk" style={pcStyle(p)}>
        <div className="p9-ac-h">
          <span className="p9-shc-ic"><Pic ic={iconOf(p)} cls="p9-pic" /></span><b>{p.packageName}</b>
          {p.status === "Retired" ? <em>Retired</em> : model.active?.id === p.id ? <em className="p9-a">Active</em> : null}
        </div>
        <ul>
          {li("let", L ?? null, <Mark k="let" />, "No letter")}
          {li("syn", Y ?? null, <Mark k="syn" />, "No synopsis")}
          {li("ver", V?.name ?? null, V ? (V.original ? "O" : String(V.num)) : "–", "No pages")}
        </ul>
      </div>
    );
  };

  const show = (key: string, o: { open: () => void; card: React.ReactNode; ov: React.ReactNode; k: string; t: React.ReactNode; d: string; act?: string; onAct?: () => void }) => (
    <article className="p9-ag3" key={key} data-pk38="show" data-show={key}>
      <button type="button" className="p9-ag2-v" onClick={o.open}>{o.card}{o.ov}</button>
      <p className="p9-ag3-k">{o.k}</p>
      <h3>{o.t}</h3>
      <p className="p9-ag3-d">{o.d}</p>
      {o.act ? <button type="button" className="p9-ag3-a" onClick={o.onAct}>{o.act} →</button> : null}
    </article>
  );

  const pkShows = packageShowcases(pkgs).map((s) => {
    const p = s.item.ref, f = s.item.f, ret = p.status === "Retired";
    const open = () => onOpenPkg(p);
    if (s.k === "best") {
      const use = model.active?.id === p.id;
      return show(`best:${p.id}`, {
        open, card: pkCard(p), ov: <Ov title="Asked for more" bars={s.bars} />, k: "Doing best", t: p.packageName,
        d: `${f.pct}% of agents asked for more: ${f.more} of ${f.sent}, against your ${avg}% average.`,
        ...(ret ? { act: "Open its figures", onAct: open }
          : use ? { act: "See its queries", onAct: () => onSeeQueries(model.creditedQueries(p).map((q) => q.id)) }
            : { act: "Make it your active package", onAct: () => void model.makeActive(p) }),
      });
    }
    if (s.k === "most") {
      return show(`most:${p.id}`, {
        open, card: pkCard(p), ov: <Ov title="Queries sent" bars={s.bars} />, k: "Sent the most",
        t: <>{p.packageName}{ret ? <> <i className="p9-o">(retired)</i></> : null}</>,
        d: `Out to ${f.sent} agent${f.sent === 1 ? "" : "s"}${f.ranked ? `, and ${f.pct}% asked for more` : ""}.${ret ? " Retired, so it’s here for the record." : ""}`,
        act: "Open its figures", onAct: open,
      });
    }
    const ready = !!p.queryLetterVersionId && !!p.bookVersionId;
    const left = s.need - s.got;
    return show(`prove:${p.id}`, {
      open, card: pkCard(p), k: "Still to prove", t: p.packageName,
      ov: (
        <div className="p9-ov">
          <p className="p9-ov-k">Answers so far</p>
          <div className="p9-ov-dots">{Array.from({ length: s.need }, (_, i) => <i key={i} className={i < s.got ? "p9-on" : ""} />)}</div>
          <p className="p9-ov-n">{f.sent ? <><b>{s.got} of {s.need}</b> answers needed to compare it</> : <b>Not sent yet</b>}</p>
        </div>
      ),
      d: f.sent ? `Sent to ${f.sent}, but only ${f.answered} ${f.answered === 1 ? "has" : "have"} answered. ${left} more and it’s ranked with the others.`
        : ready ? "Ready, but not sent yet. Pick it next time you log a query." : "Not sent yet. It needs a letter and pages before it can go.",
      act: "Open its figures", onAct: open,
    });
  });

  const compNames = (m: MaterialRow) => (m.compIds ?? []).map((id) => model.comps.find((c) => c.id === id)?.title ?? "").filter(Boolean);
  const pieces = ([["let", "Query letter", "Best letter"], ["syn", "Synopsis", "Best synopsis"], ["ver", "Pages from", "Best opening"]] as const).map(([k, lab, kk]) => {
    const items = model.figItems(k);
    const w = bestPiece(items);
    if (!w) {
      return (
        <article className="p9-ag3 p9-none" key={k} data-pk38="show" data-show={`none:${k}`}>
          <div className="p9-ag2-v"><div className="p9-ac-m p9-ghost" /></div>
          <p className="p9-ag3-k">{kk}</p>
          <h3><i className="p9-o">Too early</i></h3>
          <p className="p9-ag3-d">None has had {MIN_SENDS_FOR_CLAIM} answers yet.</p>
        </article>
      );
    }
    const m = w.item.ref as MaterialRow | VersionRow, f = w.item.f;
    const isVer = k === "ver";
    const sub = m.summary;
    const comps = k === "let" ? compNames(m as MaterialRow) : [];
    return show(`${k}:${m.id}`, {
      open: () => (isVer ? onOpenVersions() : onOpenMaterial(k, m.id)),
      card: (
        <div className={`p9-ac-m p9-t-${k}`}>
          <div className="p9-am-h">{isVer ? <i className="p9-mi p9-v">{(m as VersionRow).original ? "O" : (m as VersionRow).num}</i> : <i className="p9-mi"><Mark k={k} /></i>}<span><small>{lab}</small><b>{m.name}</b></span></div>
          <div className="p9-am-b"><p>{sub}</p><span className="p9-pc-lines"><u /><u /><u className="p9-s" /></span></div>
        </div>
      ),
      ov: <Ov title="Asked for more" bars={w.bars} />, k: kk, t: m.name,
      d: `${f.pct}% of the ${f.sent} agent${f.sent === 1 ? "" : "s"} who got it asked for more${comps.length ? `. Names ${comps.join(" and ")}` : ""}.`,
    });
  });

  /* ── the full lists ── */
  const pkList = (
    <div className="p9-rlw" data-pk39="list-pk">
      <div className="p9-rl-side"><h4>{PK_LIST.t}</h4><p>{PK_LIST.l(pkgs.length)}</p></div>
      <div className="p9-rl">
        <ListHead first="Package" />
        {fullListOrder(pkgs).map((it) => {
          const p = it.ref;
          const sub = [model.active?.id === p.id && p.status !== "Retired" ? "Active" : "", p.status === "Retired" ? "Retired" : "", p.note ?? ""].filter(Boolean).join(" · ");
          return <ListRow key={p.id} f={it.f} name={p.packageName} sub={sub} onOpen={() => onOpenPkg(p)} data={{ "data-row": `pk:${p.id}` }}
            lead={<span className="p9-rl-ic" style={pcStyle(p)} data-pk39="list-tile"><Pic ic={iconOf(p)} cls="p9-pic" /></span>} />;
        })}
      </div>
    </div>
  );
  const pcItems = model.figItems(rlk);
  const pcList = (
    <div className="p9-rlw" data-pk39="list-pc">
      <div className="p9-rl-side"><h4>{PC_LIST.t}</h4><p>{PC_LIST.l}</p></div>
      <div className="p9-rl">
        <div className="p9-rl-tabs" role="tablist" aria-label="Show" ref={tabsRef}
          onKeyDown={(e) => {
            const i = PC_TABS.findIndex(([k]) => k === rlk);
            const j = e.key === "ArrowRight" ? (i + 1) % 3 : e.key === "ArrowLeft" ? (i + 2) % 3 : e.key === "Home" ? 0 : e.key === "End" ? 2 : -1;
            if (j < 0) return;
            e.preventDefault(); pickTab(PC_TABS[j][0], true);
          }}>
          {PC_TABS.map(([k, lab]) => (
            <button type="button" key={k} role="tab" id={`p9-rlt-${k}`} aria-controls="p9-rl-panel" aria-selected={rlk === k} tabIndex={rlk === k ? 0 : -1}
              className={`p9-t-${k}`} data-rlk={k} onClick={() => pickTab(k)}>{lab}<em>{model.figItems(k).length}</em></button>
          ))}
        </div>
        <div role="tabpanel" id="p9-rl-panel" aria-labelledby={`p9-rlt-${rlk}`} className="p9-rl-panel" data-kind={rlk}>
          <ListHead first={PC_TABS.find(([k]) => k === rlk)![2]} />
          {fullListOrder(pcItems).map((it) => {
            const m = it.ref as MaterialRow | VersionRow;
            const lead = <i className={`p9-tic p9-t-${rlk}`}>{rlk === "ver" ? ((m as VersionRow).original ? "O" : String((m as VersionRow).num)) : <Mark k={rlk} />}</i>;
            return <ListRow key={m.id} f={it.f} name={m.name} sub={m.summary ?? ""} lead={lead} data={{ "data-row": `${rlk}:${m.id}` }}
              onOpen={() => (rlk === "ver" ? onOpenVersions() : onOpenMaterial(rlk, m.id))} />;
          })}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="p8-bnr" data-pk38="band" data-pk26="results">
        <div className="p8-bnr-in">
          <div className="p8-bnr-art" aria-hidden="true" data-art="bnr"><span>Art<small>Hawk reading letters at a desk, a stack of replies beside it</small></span></div>
          <div className="p8-bnr-tx">
            <p className="p8-bnr-k">Results</p>
            <h2 className="p8-id-agT">How your packages are doing</h2>
            <p className="p8-bnr-l">{tot ? "What’s getting agents to ask for more: which package, and which letter, synopsis and opening inside it." : "Once you’ve logged queries with a package, this shows what’s working."}</p>
          </div>
          <div className="p8-bnr-n" data-pk38="totals">
            {tot ? <>
              <div><b>{tot.sent}</b><span>queries sent<br />with a package</span></div>
              <div><b>{tot.replied}%</b><span>got a<br />reply</span></div>
              <div><b>{tot.more}%</b><span>asked for<br />more</span></div>
            </> : null}
          </div>
        </div>
      </div>
      <section className="p9-agg3" aria-label="How your packages are doing" data-pk38="agg">
        <div className="p9-id-aggMain">
          {tot ? <>
            <div className="p9-ag3-row" data-pk38="row-pk">
              <Heading k="pk" h={PK_HEADING} />
              <div className="p9-ag3-g">{pkShows}</div>
              {pkList}
            </div>
            <div className="p9-ag3-row" data-pk38="row-pieces" data-pk39="pieces-band">
              <Heading k="pc" h={PC_HEADING} />
              <div className="p9-ag3-g">{pieces}</div>
              {pcList}
            </div>
            <footer className="p9-ag3-f">
              <p><b>How it’s counted.</b> “Asked for more” is a partial or full request. Something is only ranked once {thresholdWords()} agents have answered it, so one lucky reply can’t top the list. Queries already sent keep the package they went with.</p>
              <div>
                <button type="button" className="p9-cx-lnk" onClick={() => onSeeQueries([])}>See every query in the Query Centre</button>
                <button type="button" className="p9-cx-lnk" onClick={onAnalytics}>More in Analytics</button>
              </div>
            </footer>
          </> : (
            <div className="p9-rs-empty" data-pk38="empty"><b>Nothing to show yet.</b><span>Log a query with a package and its results start here.</span></div>
          )}
        </div>
      </section>
    </>
  );
};
