/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v40 — Tracking & performance on the Packages tab (ref `section.tp`, F): one band ("Which package
 * gets agents asking for more?") over three views — Head to head, Scoreboard and Tests — or, before anything has gone
 * out, Warming up. Markup is the ref's `tpRender`, with the `p6-` prefix.
 *
 * ⚠️ EVERY FIGURE IS versionsV2's (H): sent excludes withdrawn, "asked for more" is Analytics' reachedRequest, a share
 *    shows from MIN_SENT_FOR_RATE sent, replies' days come from the log. A package counts every query credited to it;
 *    a piece (the scoreboard's other three columns) counts every query that recorded it, whichever package it was in.
 * ⚠️ "LIVE" IS READY AND OUT (the mock's `live`): a draft has nothing to compare and a retired package has left the
 *    page's choices. The summary's "of N packages" counts that set.
 */
import React, { useMemo, useState } from "react";
import type { SubmissionPackage } from "../../../types";
import { iconOf } from "../../../lib/packagesV26";
import {
  headToHeadDefaults, headToHeadVerdict, matLeader, matVerdict, MIN_SENT_FOR_RATE, orderMatCards, packageStage, piecesDiffer, PIECES,
  rankColumn, testFooter, testState, type Facts, type MatCard,
} from "../../../lib/packagesV40";
import { Mark, Pic } from "./icons";
import type { Pk26Model } from "./usePk26Model";

export type TrackView = "a" | "b" | "c";
type View = TrackView;
const MIN = MIN_SENT_FOR_RATE;

/** The four-row funnel under a card's big figure (ref `tfun`). */
export const Funnel: React.FC<{ f: Facts }> = ({ f }) => (
  <div className="p6-tp-fn">
    {([["Sent", f.n], ["Replied", f.replied], ["Asked for more", f.more], ["Full request", f.full]] as const).map(([l, v]) => (
      <div className="p6-tp-fr" key={l}><span>{l}</span><span className="p6-tp-fb"><i style={{ width: `${f.n ? (v / f.n) * 100 : 0}%` }} /></span><b>{v}</b></div>
    ))}
  </div>
);
/** "Replies take N days on average" / "No replies yet" — and nothing when replies came but none is dated. */
export const ReplyDays: React.FC<{ f: Facts }> = ({ f }) => (f.days != null
  ? <p className="p6-tp-d">Replies take {f.days} days on average</p>
  : f.replied ? null : <p className="p6-tp-d">No replies yet</p>);

export const Pk40Tracking: React.FC<{ model: Pk26Model; view: View; onView: (v: View) => void; onDuplicate: (p: SubmissionPackage) => void }> = ({ model, view, onView: setView, onDuplicate }) => {
  const { msPkgs, active, letters, synopses, versionRows, matName } = model;
  const live = useMemo(() => msPkgs.filter((p) => { const s = packageStage(p); return s === "ready" || s === "out"; }), [msPkgs]);
  const factsById = useMemo(() => new Map(msPkgs.map((p) => [p.id, model.facts(p)])), [msPkgs, model]);
  const fx = (p: SubmissionPackage) => factsById.get(p.id)!;
  const sent = live.filter((p) => fx(p).n > 0);
  const tot = sent.reduce((a, p) => a + fx(p).n, 0), totq = sent.reduce((a, p) => a + fx(p).more, 0);
  const ready = sent.filter((p) => fx(p).n >= MIN);

  const defaults = useMemo(() => headToHeadDefaults(live, active?.id, (p) => fx(p).n), [live, active]); // eslint-disable-line react-hooks/exhaustive-deps
  const [ha, setHa] = useState<string | null>(null);
  const [hb, setHb] = useState<string | null>(null);
  const A = live.find((p) => p.id === ha) ?? defaults.a;
  const B = live.find((p) => p.id === hb) ?? defaults.b;
  const nm = (k: "let" | "syn" | "ver", id: string | undefined) => (id ? matName(k, id) ?? "–" : "None");

  let body: React.ReactNode;
  if (!tot) {
    body = (
      <div className="p6-tp-wait">
        <div className="p6-tp-art" data-art="tp"><span>Illustration<small>A hawk with a stopwatch</small></span></div>
        <div>
          <h3>Your first comparison shows once two packages have each gone out with {MIN} queries.</h3>
          <p>Then you’ll see which package gets agents asking for more, and which piece made the difference.</p>
        </div>
      </div>
    );
  } else if (view === "a" && A && B) {
    const fa = fx(A), fb = fx(B);
    const diff = piecesDiffer(A, B);
    const vd = headToHeadVerdict(A.packageName, B.packageName, diff, fa, fb);
    const card = (P: SubmissionPackage, f: Facts, side: "a" | "b") => (
      <div className="p6-tp-c">
        <div className="p6-tp-ch">
          <span className="p6-tp-ci"><Pic ic={iconOf(P)} /></span>
          <select value={P.id} aria-label={side === "a" ? "First package" : "Second package"} onChange={(e) => (side === "a" ? setHa : setHb)(e.target.value)}>
            {live.map((p) => <option key={p.id} value={p.id}>{p.packageName}</option>)}
          </select>
        </div>
        <div className="p6-tp-big">
          {f.pct != null
            ? <><b>{f.pct}<small>%</small></b><span>asked for more<em>{f.more} of {f.n} sent</em></span></>
            : <><b className="p6-e">{f.n ? `${f.more} of ${f.n}` : "–"}</b><span>asked for more<em>{f.n ? "Too early for a %" : "Not sent yet"}</em></span></>}
        </div>
        <Funnel f={f} />
        <ReplyDays f={f} />
      </div>
    );
    body = (
      <div className="p6-tp-hh">
        <div className="p6-tp-diff">
          <span className="p6-tp-dk">What’s different</span>
          {PIECES.map(([k, f, l]) => {
            const on = diff.some((d) => d[0] === k);
            return (
              <span key={k} className={`p6-tp-dp${on ? " p6-on" : ""}`}>
                <small>{l}</small>{on ? <>{nm(k, A[f])} <i>→</i> {nm(k, B[f])}</> : <><i>Same:</i> {nm(k, A[f])}</>}
              </span>
            );
          })}
        </div>
        <div className="p6-tp-2">{card(A, fa, "a")}<div className="p6-tp-vs">vs</div>{card(B, fb, "b")}</div>
        <p className="p6-tp-vd"><b>{vd.lead}</b> {vd.rest}</p>
      </div>
    );
  } else if (view === "b") {
    type Row = { id: string; name: string; f: Facts };
    const col = (label: string, items: Row[]) => {
      const L = rankColumn(items);
      const best = L.find((o) => !o.f.early);
      return (
        <div className="p6-tp-col" key={label}>
          <p className="p6-tp-ck">{label}</p>
          {L.length ? L.map((o, i) => (
            <div key={o.id} className={`p6-tp-row${o === best ? " p6-top" : ""}`}>
              <span className="p6-tp-rn">{o.f.early ? "·" : i + 1}</span>
              <span className="p6-tp-rt"><b>{o.name}</b><small>{o.f.n} sent</small></span>
              <span className="p6-tp-rv">{o.f.early ? <em>early</em> : `${o.f.raw}%`}</span>
              <span className="p6-tp-rb"><i style={{ width: `${o.f.early ? 0 : Math.min(100, o.f.raw * 2)}%` }} /></span>
            </div>
          )) : <p className="p6-tp-none">Nothing sent yet</p>}
        </div>
      );
    };
    body = (
      <>
        <div className="p6-tp-sum">
          <div><b>{tot}</b><span>queries sent with a package</span></div>
          <div><b>{Math.round((totq / tot) * 100)}<small>%</small></b><span>asked for more, across all of them</span></div>
          <div><b>{ready.length}</b><span>of {live.length} packages with enough to compare</span></div>
        </div>
        <div className="p6-tp-cols">
          {col("Packages", live.map((p) => ({ id: p.id, name: p.packageName, f: fx(p) })))}
          {col("Query letters", letters.map((m) => ({ id: m.id, name: m.name, f: model.pieceFacts("let", m.id) })))}
          {col("Synopses", synopses.map((m) => ({ id: m.id, name: m.name, f: model.pieceFacts("syn", m.id) })))}
          {col("Pages from", versionRows.map((v) => ({ id: v.id, name: v.name, f: model.pieceFacts("ver", v.id) })))}
        </div>
        <p className="p6-tp-foot">Ranked by the share of agents who asked for more. Anything sent fewer than {MIN} times shows, but isn’t ranked.</p>
      </>
    );
  } else {
    const pairs = live.filter((p) => p.copiedFromId && msPkgs.some((x) => x.id === p.copiedFromId));
    const starter = live.find((p) => p.id === active?.id && packageStage(p) === "out") ?? live.find((p) => packageStage(p) === "out") ?? null;
    const side = (P: SubmissionPackage, f: Facts) => (
      <div className="p6-tp-ts">
        <span className="p6-tp-ci"><Pic ic={iconOf(P)} /></span>
        <span><b>{P.packageName}</b><small>{f.n} sent</small></span>
        <span className="p6-tp-tv">{f.pct != null ? `${f.pct}%` : <em>{f.more} of {f.n}</em>}</span>
      </div>
    );
    body = (
      <>
        <p className="p6-tp-intro">A test starts whenever you make a new package from one that’s out and change one piece. Send both, and this shows which does better.</p>
        <div className="p6-tp-ts-grid">
          {pairs.map((b) => {
            const a = msPkgs.find((x) => x.id === b.copiedFromId)!;
            const fa = fx(a), fb = fx(b);
            const d = piecesDiffer(a, b);
            const st = testState({ name: a.packageName, f: fa }, { name: b.packageName, f: fb });
            return (
              <article key={b.id} className="p6-tp-t" data-pkid={b.id}>
                <header>
                  <span className={`p6-tp-st p6-${st.k}`}>{st.label}</span>
                  <b>{d.length === 1 ? `Testing the ${d[0][2].toLowerCase()}` : `Testing ${d.length} changes`}</b>
                  <small>{d.map(([k, f, l]) => `${l}: ${nm(k, a[f])} → ${nm(k, b[f])}`).join(" · ")}</small>
                </header>
                <div className="p6-tp-tb">{side(a, fa)}<span className="p6-tp-arr">→</span>{side(b, fb)}</div>
                <footer>{testFooter(fa, fb)}</footer>
              </article>
            );
          })}
          {starter ? (
            <button type="button" className="p6-tp-new" onClick={() => onDuplicate(starter)}>
              <span>+</span>Start a test<small>New package from {starter.packageName}, then change one piece</small>
            </button>
          ) : null}
        </div>
      </>
    );
  }

  return (
    <section className="p6-tp" data-pk40="tp" data-pk26="results" aria-labelledby="p6-tpT">
      <div className="p6-tp-band">
        <h2 id="p6-tpT">Which package gets agents asking for more?</h2>
        <p>Every query sent with a package counts here, and so does every piece inside it.</p>
        <span className="p6-tp-arw" aria-hidden="true">↓</span>
      </div>
      <div className="p6-tp-body">
        <div className="p6-tp-sw" role="tablist" aria-label="Compare">
          {([["a", "Head to head"], ["b", "Scoreboard"], ["c", "Tests"]] as const).map(([k, l]) => (
            <button type="button" key={k} role="tab" data-tpv={k} aria-selected={view === k} onClick={() => setView(k)}>{l}</button>
          ))}
        </div>
        {body}
      </div>
    </section>
  );
};

/* ══ G · Tracking & performance on the Query letters and Synopses tabs (ref `#tpm`, `tmRender`) ══════════════════ */

type Card = MatCard & { pk: SubmissionPackage[] };

/**
 * One card per letter (or synopsis), and for synopses a "No synopsis" card counting the queries that went out with the
 * synopsis slot empty (H3: credited from what each query recorded). Cards that have reached MIN_SENT_FOR_RATE come
 * first; the leader is 10 points clear of the next, both at the threshold.
 */
export const Pk40MatTracking: React.FC<{ model: Pk26Model; kind: "let" | "syn"; onSeeTests: () => void }> = ({ model, kind, onSeeTests }) => {
  const L = kind === "let";
  const noun = L ? "letter" : "synopsis", nouns = L ? "letters" : "synopses";
  const field = L ? "queryLetterVersionId" : "synopsisVersionId";
  const { msPkgs } = model;
  const cards = useMemo<Card[]>(() => {
    const list: Card[] = (L ? model.letters : model.synopses).map((m) => ({ id: m.id, name: m.name, f: model.pieceFacts(kind, m.id), pk: msPkgs.filter((p) => p[field] === m.id) }));
    if (!L) list.push({ id: "none", name: "No synopsis", none: true, f: model.pieceFacts("syn", "none"), pk: msPkgs.filter((p) => !(p.synopsisVersionId ?? "").trim()) });
    return orderMatCards(list);
  }, [L, kind, field, model, msPkgs]);
  const tot = cards.reduce((a, c) => a + c.f.n, 0);
  const lead = matLeader(cards);
  const vd = matVerdict(cards, kind);

  return (
    <section className="p6-tp p6-tpm" data-pk40="tpm" aria-labelledby="p6-tpmT">
      <div className="p6-tp-band">
        <h2 id="p6-tpmT">Which {noun} gets agents asking for more?</h2>
        <p>{L ? "Every query that went out with a letter counts here, whichever package it was in." : "Every query that went out with a synopsis counts here, and so do the ones that went without."}</p>
        <span className="p6-tp-arw" aria-hidden="true">↓</span>
      </div>
      <div className="p6-tp-body">
        {!tot ? (
          <div className="p6-tp-wait">
            <div className="p6-tp-art" data-art="tpm"><span>Illustration<small>A hawk with a stopwatch</small></span></div>
            <div>
              <h3>This fills in once two {nouns} have each gone out with {MIN} queries.</h3>
              <p>Then you’ll see which {noun} gets agents asking for more, how many replied, and how long they took.</p>
            </div>
          </div>
        ) : (
          <div className="p6-tp-hh">
            <p className="p6-tp-vd p6-tm-vd"><b>{vd.lead}</b> {vd.rest}</p>
            <div className="p6-tm-g">
              {cards.map((c) => {
                const f = c.f, on = c === lead;
                return (
                  <article key={c.id} className={`p6-tm-c${on ? " p6-lead" : ""}${c.none ? " p6-none" : ""}`} data-mat={c.id}>
                    <header>
                      <span className="p6-tm-ic">{c.none ? <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" /></svg> : <Mark k={kind} />}</span>
                      <span className="p6-tm-n"><b>{c.name}</b><small>{c.pk.length ? `In ${c.pk.map((p) => p.packageName).join(", ")}` : "Not in a package yet"}</small></span>
                      {on ? <em>Ahead</em> : null}
                    </header>
                    <div className="p6-tp-big">
                      {f.pct != null
                        ? <><b>{f.pct}<small>%</small></b><span>asked for more<em>{f.more} of {f.n} sent</em></span></>
                        : <><b className="p6-e">{f.n ? `${f.more} of ${f.n}` : "–"}</b><span>asked for more<em>{f.n ? `Too early for a %: ${MIN - f.n} more to go` : "Not sent yet"}</em></span></>}
                    </div>
                    <Funnel f={f} />
                    <ReplyDays f={f} />
                  </article>
                );
              })}
            </div>
            <p className="p6-tm-foot">A {noun}’s results include whatever else went out with it. For a fair test, make a new package from one that’s out and change only the {noun}. <button type="button" onClick={onSeeTests}>See your tests</button></p>
          </div>
        )}
      </div>
    </section>
  );
};
