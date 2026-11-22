/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v5, Phase F — THE FOUR MATERIALS TABS (design-refs/phone-app-v5/phone-materials-v1.html P1, P3, P5, P6).
 * Below 768px only.
 *
 * ⚠️ NOTHING HERE COUNTS OR WRITES ON ITS OWN. The packages, letters, versions and comps are `usePk26Model`'s (the hook
 * the desktop packages page runs). A package's result is packageMetrics' (`pkgStats`); a letter's, synopsis's and
 * version's are the desktop's per-piece figures (lib/phoneV5 `materialFacts`). Every tap opens an existing page at
 * `/queries/packages?…` (a package, the builder, a letter, the editor, a version, the comps form) — the writes are
 * theirs. A comp is added and edited through Packages' own comps form (`CompForm`, the desktop's writer).
 */
import React, { useMemo, useState } from "react";
import type { SubmissionPackage } from "../../../types";
import type { Pk26Model } from "../../packages/v26/usePk26Model";
import { CompForm } from "../../packages/phone/PackagesPhone";
import { readVersions } from "../../../lib/bookVersions";
import { inUseId } from "../../../lib/versionsV2";
import { dayMonth } from "../../../lib/dates";
import type { RateStat } from "../../../lib/packageMetrics";
import {
  VERSIONS_LOCK, compsWords, firstLine, letterCompCount, lettersNaming, lettersWords, materialFacts, packagesWords, pieceChip,
  pieceResult, pkgPieces, pkgResult, versionTree, versionsLine,
} from "../../../lib/phoneV5";
import { MobileSheet } from "../../shell/MobileSheet";
import { Chev, Link4 } from "../v4/V4Parts";
import { Bundle, Paper, ResultBadge, Spine } from "./MatPartsV5";
import "./phoneV5.css";

export type MatOpen = (key: string, value: string) => void;

/* ═══ P1 — PACKAGES: each a bundle card, its pieces as chips, its result from packageMetrics ═══ */
export const PackagesTabV5: React.FC<{ model: Pk26Model; stats: Map<string, RateStat>; open: MatOpen }> = ({ model, stats, open }) => {
  const books = useMemo(() => readVersions(model.activeMs), [model.activeMs]);
  const versions = useMemo(() => [...model.lettersAll, ...model.synopsesAll].map((m) => ({ id: m.id, versionName: m.name })), [model.lettersAll, model.synopsesAll]);
  const list: SubmissionPackage[] = [...model.live, ...model.retired];
  return (
    <div className="pa5m-body" data-pa5="mat-packages">
      {list.length ? list.map((p) => {
        const s = stats.get(p.id) ?? { sent: 0, requests: 0, responses: 0, requestRate: null, responseRate: null };
        const r = pkgResult(s);
        const on = model.active?.id === p.id;
        const pieces = pkgPieces(p, versions, books);
        return (
          <button key={p.id} type="button" className="pa4-card pa5m-pk" data-pa5="pkg-card" data-id={p.id} data-sent={s.sent} data-requests={s.requests} data-active={on ? "1" : "0"}
            onClick={() => open("pkg", p.id)}>
            <ResultBadge r={r} />
            <span className="pa5m-pkh">
              <Bundle name="" mini />
              <span className="pa5m-pkn">
                <b className="pa5m-h">{p.packageName}</b>
                {on ? <span className="pa5m-tag use" data-pa5="pkg-going">Going out now</span>
                  : <span className="pa4-s">{p.status === "Retired" ? "Put away" : "Not in use"}</span>}
              </span>
            </span>
            <span className="pa5m-chips" data-pa5="pkg-pieces">
              {pieces.map((x) => <span key={x.k} className={`pa5m-tag${x.set ? "" : " unset"}`} data-pa5="pkg-piece" data-k={x.k} data-set={x.set ? "1" : "0"}>{pieceChip(x)}</span>)}
            </span>
          </button>
        );
      }) : (
        <div className="pa5m-empty" data-pa5="pkg-none">
          <b className="pa5m-h">No packages yet</b>
          <p className="pa4-s">A package is what you send an agent: a version of your book, a letter and a synopsis. Build one and new queries go out with it.</p>
        </div>
      )}
      <Link4 pa4="mat-new-pkg" data-pa5="pkg-new" className="pa5m-more" onClick={() => open("build", "new")}>New package</Link4>
    </div>
  );
};

/* ═══ P3 — LETTERS: query letters, then synopses, as sheets you can read the first line of ═══ */
export const LettersTabV5: React.FC<{ model: Pk26Model; open: MatOpen }> = ({ model, open }) => {
  const [adding, setAdding] = useState(false);
  const act = model.active;
  const facts = (kind: "let" | "syn", id: string) => pieceResult(materialFacts(kind, id, model.msQueries, model.pieceCtx, model.rowsById));
  const putAway = (kind: "let" | "syn") => (kind === "let" ? model.lettersAll : model.synopsesAll).filter((m) => m.retired).length;
  const shelf = (kind: "let" | "syn") => {
    const items = kind === "let" ? model.letters : model.synopses;
    const away = putAway(kind);
    return (
      <section data-pa5="mat-shelf" data-kind={kind}>
        <div className="pa5m-sh"><h2 className="pa5m-h">{kind === "let" ? "Query letters" : "Synopses"}</h2><span className="pa4-s" data-pa5="mat-shelf-n">{items.length}</span></div>
        {items.length ? (
          <div className="pa5m-shelf">
            {items.map((m) => {
              const n = letterCompCount(m);
              const r = facts(kind, m.id);
              const inAct = !!act && (kind === "let" ? act.queryLetterVersionId : act.synopsisVersionId) === m.id;
              return (
                <button key={m.id} type="button" className="pa5m-sheet" data-pa5={kind === "let" ? "letter-sheet" : "synopsis-sheet"} data-id={m.id}
                  data-comps={kind === "let" ? (n ?? "") : undefined} data-sent={r.sent} data-requests={r.more} onClick={() => open("mat", m.id)}>
                  <Paper first={firstLine(m.text, 70) ?? "No wording yet"} lines={[92, 100, 76, 88, 100, 60, 80]} />
                  <b className="pa5m-sn">{m.name}</b>
                  <span className="pa4-s">{r.words}</span>
                  <span className="pa4-s">{kind === "let" ? compsWords(n) : packagesWords(m.inPackages.length)}</span>
                  {inAct ? <span className="pa5m-tag use" data-pa5="sheet-in-active">In {act!.packageName}</span> : null}
                </button>
              );
            })}
          </div>
        ) : <p className="pa4-s pa5m-none">{kind === "let" ? "No query letters yet." : "No synopses yet."}</p>}
        {away ? <Link4 pa4="mat-put-away" className="pa5m-more" onClick={() => open("all", kind)}>{away} put away</Link4> : null}
      </section>
    );
  };
  return (
    <div className="pa5m-body" data-pa5="mat-letters">
      {shelf("let")}
      {shelf("syn")}
      <Link4 pa4="mat-add-letter" data-pa5="letter-add" className="pa5m-more" onClick={() => setAdding(true)}>Add a letter or synopsis</Link4>
      <MobileSheet open={adding} onClose={() => setAdding(false)} ariaLabel="Add a letter or synopsis" pa={{ height: "auto", white: true }}>
        <div className="pa4-layer pa5m-pick" data-pa5="letter-add-sheet">
          <h2 className="pa5m-h">Add a letter or synopsis</h2>
          <button type="button" className="pa4-tap" onClick={() => { setAdding(false); open("edit", "new-let"); }}><span className="pa4-x"><b>A query letter</b><span className="pa4-s">The letter agents read first</span></span><Chev /></button>
          <button type="button" className="pa4-tap" onClick={() => { setAdding(false); open("edit", "new-syn"); }}><span className="pa4-x"><b>A synopsis</b><span className="pa4-s">The whole story, start to end</span></span><Chev /></button>
        </div>
      </MobileSheet>
    </div>
  );
};

/* ═══ P5 — VERSIONS: the tree from the Original, each with what changed and its result; desktop's gate ═══ */
export const VersionsTabV5: React.FC<{ model: Pk26Model; locked: boolean; open: MatOpen; onPlans: () => void }> = ({ model, locked, open, onPlans }) => {
  const ms = model.activeMs;
  const nodes = useMemo(() => versionTree(readVersions(ms)), [ms]);
  const inUse = inUseId(ms, model.msPkgs);
  if (locked) {
    return (
      <div className="pa5m-body" data-pa5="versions-locked">
        <div className="pa4-card pa5m-lock">
          <div className="pa4-s pa5m-kick">{VERSIONS_LOCK.kicker}</div>
          <h2 className="pa5m-h">{VERSIONS_LOCK.head}</h2>
          <p className="pa4-b pa4-body">{VERSIONS_LOCK.body}</p>
          <ul>{VERSIONS_LOCK.bullets.map(([b, t], i) => <li key={i}><i>{i + 1}</i><span><b>{b}</b>{" " + t}</span></li>)}</ul>
          <button type="button" className="pa4-cta" data-pa5="versions-plans" onClick={onPlans}>{VERSIONS_LOCK.plans}</button>
          <p className="pa4-s pa5m-c">{VERSIONS_LOCK.small}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="pa5m-body" data-pa5="mat-versions">
      <p className="pa4-s pa5m-lede">{versionsLine(nodes.filter((n) => !n.v.archived).length)}</p>
      {nodes.length ? (
        <div className="pa5m-tree">
          {nodes.map(({ v, depth, parentId }, i) => {
            const r = pieceResult(materialFacts("ver", v.id, model.msQueries, model.pieceCtx, model.rowsById));
            const on = inUse === v.id;
            const sub = v.original
              ? ["Where you started", v.wordCount ? `${v.wordCount.toLocaleString("en-GB")} words` : null]
              : [v.createdDate ? `Saved ${dayMonth(v.createdDate)}` : null, v.wordCount ? `${v.wordCount.toLocaleString("en-GB")} words` : null];
            /* one spine, as the ref: a version sits right above the one it grew from, unless a sibling's branch is between */
            const parent = parentId ? nodes.find((n) => n.v.id === parentId)?.v ?? null : null;
            const from = parent && nodes[i + 1]?.v.id !== parent.id ? `Made from ${parent.name}` : null;
            return (
              <div key={v.id} className={`pa5m-node${on ? " use" : ""}`}>
                <button type="button" className="pa4-card pa5m-nodec" data-pa5="version-node" data-id={v.id} data-inuse={on ? "1" : "0"} data-parent={parentId ?? ""} data-depth={depth}
                  data-sent={r.sent} data-requests={r.more} onClick={() => open("ver", v.id)}>
                  <span className="pa5m-nodet">
                    <span className="pa5m-x"><b className="pa4-b" style={{ fontWeight: 600, display: "block" }}>{v.name}</b><span className="pa4-s" style={{ display: "block" }}>{sub.filter(Boolean).join(" · ")}</span>{from ? <span className="pa4-s" data-pa5="version-from">{from}</span> : null}</span>
                    {on ? <span className="pa5m-tag use">In use</span> : v.archived ? <span className="pa5m-tag">Archived</span> : null}
                  </span>
                  {v.changes.length ? <span className="pa5m-chg">{v.changes.map((c, i) => <span key={i}>{c}</span>)}</span> : null}
                  <span className="pa5m-res">{r.of ? <><b>{r.big} {r.of}</b> asked for more</> : r.words}</span>
                </button>
              </div>
            );
          })}
        </div>
      ) : null}
      <Link4 pa4="mat-new-ver" data-pa5="version-new" className="pa5m-more" onClick={() => open("ver", "new")}>Save a new version</Link4>
    </div>
  );
};

/* ═══ P6 — COMPS: the list letters pick from, each with how many letters mention it ═══ */
export const CompsTabV5: React.FC<{ model: Pk26Model }> = ({ model }) => {
  const [form, setForm] = useState<{ edit: number | null } | null>(null);
  return (
    <div className="pa5m-body" data-pa5="mat-comps">
      <p className="pa4-s pa5m-lede">Your comparable titles. Pick from these when you write a letter.</p>
      {model.comps.length ? (
        <div className="pa4-card pa5m-list">
          {model.comps.map((c, i) => {
            const n = lettersNaming(c, model.lettersAll);
            return (
              <button key={c.id ?? `idx_${i}`} type="button" className="pa4-tap pa5m-comp" data-pa5="comp-row" data-id={c.id ?? ""} data-letters={n} onClick={() => setForm({ edit: i })}>
                <Spine title={c.title} i={i} />
                <span className="pa4-x"><b>{c.title}</b>
                  {c.author || c.year ? <span className="pa4-s" style={{ display: "block" }}>{[c.author, c.year].filter(Boolean).join(" · ")}</span> : null}
                  <span className="pa4-s">{lettersWords(n)}</span></span>
                <Chev />
              </button>
            );
          })}
        </div>
      ) : <p className="pa4-s pa5m-none" data-pa5="comps-none">No comps yet.</p>}
      <Link4 pa4="mat-add-comp" data-pa5="comp-add" className="pa5m-more" onClick={() => setForm({ edit: null })}>Add a comp</Link4>
      <CompForm key={form ? `f${form.edit ?? "new"}` : "closed"} open={!!form} model={model} edit={form?.edit ?? null} onClose={() => setForm(null)} />
    </div>
  );
};
