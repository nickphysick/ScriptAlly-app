/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v38 — Results (ref `#bnr` and `renderAgg`): the full-width ink-navy band with its three totals,
 * then two rows of showcases ("Packages" and "The pieces inside them") and "How it's counted". Every showcase is one
 * anatomy: a slightly tilted card with a stats card overlapping its lower right, then a kicker, the name, one sentence
 * of figures and an action. Clicking a showcase opens that package's drawer or that material's drawer. Markup is the
 * ref's, with the `p8-` prefix (pk38.generated.css).
 *
 * ⚠️ FIGURES ARE packageReplies' (lib/packagesV38): first answers, materials edition-true, nothing ranked before
 *    MIN_SENDS_FOR_CLAIM answers. No package appears in two Packages slots, and an empty slot is left out (L4, L5).
 */
import React from "react";
import type { SubmissionPackage } from "../../../types";
import { iconOf } from "../../../lib/packagesV26";
import { bandTotals, bestPiece, MIN_SENDS_FOR_CLAIM, packageShowcases, thresholdWords, type Bar, type Fig } from "../../../lib/packagesV38";
import { Mark, Pic } from "./icons";
import type { MaterialRow, Pk26Model, VersionRow } from "./usePk26Model";

type PkItem = { id: string; name: string; retired?: boolean; f: Fig; ref: SubmissionPackage };

const Ov: React.FC<{ title: string; bars: Bar[] }> = ({ title, bars }) => (
  <div className="p8-ov">
    <p className="p8-ov-k">{title}</p>
    {bars.map((b) => (
      <div key={b.id} className={`p8-ov-b${b.on ? " p8-on" : ""}${b.w == null ? " p8-early" : ""}`}>
        <span>{b.name}</span><i><u style={{ width: `${b.w ?? 100}%` }} /></i><b>{b.v}</b>
      </div>
    ))}
  </div>
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

  const li = (k: "let" | "syn" | "ver", name: string | null, glyph: React.ReactNode, none: string) => (
    <li className={name ? "" : "p8-none"}><i className={`p8-tic p8-t-${k}`}>{glyph}</i>{name ?? none}</li>
  );
  const pkCard = (p: SubmissionPackage) => {
    const L = model.matName("let", p.queryLetterVersionId), Y = model.matName("syn", p.synopsisVersionId);
    const V = p.bookVersionId ? model.versionRows.find((v) => v.id === p.bookVersionId) ?? null : null;
    return (
      <div className="p8-ac-pk">
        <div className="p8-ac-h">
          <span className="p8-shc-ic"><Pic ic={iconOf(p)} cls="p8-pic" /></span><b>{p.packageName}</b>
          {p.status === "Retired" ? <em>Retired</em> : model.active?.id === p.id ? <em className="p8-a">Active</em> : null}
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
    <article className="p8-ag3" key={key} data-pk38="show" data-show={key}>
      <button type="button" className="p8-ag2-v" onClick={o.open}>{o.card}{o.ov}</button>
      <p className="p8-ag3-k">{o.k}</p>
      <h3>{o.t}</h3>
      <p className="p8-ag3-d">{o.d}</p>
      {o.act ? <button type="button" className="p8-ag3-a" onClick={o.onAct}>{o.act} →</button> : null}
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
        t: <>{p.packageName}{ret ? <> <i className="p8-o">(retired)</i></> : null}</>,
        d: `Out to ${f.sent} agent${f.sent === 1 ? "" : "s"}${f.ranked ? `, and ${f.pct}% asked for more` : ""}.${ret ? " Retired, so it’s here for the record." : ""}`,
        act: "Open its figures", onAct: open,
      });
    }
    const ready = !!p.queryLetterVersionId && !!p.bookVersionId;
    const left = s.need - s.got;
    return show(`prove:${p.id}`, {
      open, card: pkCard(p), k: "Still to prove", t: p.packageName,
      ov: (
        <div className="p8-ov">
          <p className="p8-ov-k">Answers so far</p>
          <div className="p8-ov-dots">{Array.from({ length: s.need }, (_, i) => <i key={i} className={i < s.got ? "p8-on" : ""} />)}</div>
          <p className="p8-ov-n">{f.sent ? <><b>{s.got} of {s.need}</b> answers needed to compare it</> : <b>Not sent yet</b>}</p>
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
        <article className="p8-ag3 p8-none" key={k} data-pk38="show" data-show={`none:${k}`}>
          <div className="p8-ag2-v"><div className="p8-ac-m p8-ghost" /></div>
          <p className="p8-ag3-k">{kk}</p>
          <h3><i className="p8-o">Too early</i></h3>
          <p className="p8-ag3-d">None has had {MIN_SENDS_FOR_CLAIM} answers yet.</p>
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
        <div className={`p8-ac-m p8-t-${k}`}>
          <div className="p8-am-h">{isVer ? <i className="p8-mi p8-v">{(m as VersionRow).original ? "O" : (m as VersionRow).num}</i> : <i className="p8-mi"><Mark k={k} /></i>}<span><small>{lab}</small><b>{m.name}</b></span></div>
          <div className="p8-am-b"><p>{sub}</p><span className="p8-pc-lines"><u /><u /><u className="p8-s" /></span></div>
        </div>
      ),
      ov: <Ov title="Asked for more" bars={w.bars} />, k: kk, t: m.name,
      d: `${f.pct}% of the ${f.sent} agent${f.sent === 1 ? "" : "s"} who got it asked for more${comps.length ? `. Names ${comps.join(" and ")}` : ""}.`,
    });
  });

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
      <section className="p8-agg3" aria-label="How your packages are doing" data-pk38="agg">
        <div className="p8-id-aggMain">
          {tot ? <>
            <div className="p8-ag3-row" data-pk38="row-pk">
              <header className="p8-ag3-h"><b>Packages</b><span>The whole bundle that went to each agent</span></header>
              <div className="p8-ag3-g">{pkShows}</div>
            </div>
            <div className="p8-ag3-row" data-pk38="row-pieces">
              <header className="p8-ag3-h"><b>The pieces inside them</b><span>Across every package they went out in</span></header>
              <div className="p8-ag3-g">{pieces}</div>
            </div>
            <footer className="p8-ag3-f">
              <p><b>How it’s counted.</b> “Asked for more” is a partial or full request. Something is only ranked once {thresholdWords()} agents have answered it, so one lucky reply can’t top the list. Queries already sent keep the package they went with.</p>
              <div>
                <button type="button" className="p8-cx-lnk" onClick={() => onSeeQueries([])}>See every query in the Query Centre</button>
                <button type="button" className="p8-cx-lnk" onClick={onAnalytics}>More in Analytics</button>
              </div>
            </footer>
          </> : (
            <div className="p8-rs-empty" data-pk38="empty"><b>Nothing to show yet.</b><span>Log a query with a package and its results start here.</span></div>
          )}
        </div>
      </section>
    </>
  );
};
