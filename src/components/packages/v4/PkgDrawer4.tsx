/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v3 Part D (kept by v4): ONE DRAWER FOR EVERYTHING — reading a package (two tabs),
 * reading a material, and every form (new / edit / duplicate package, new / edit material).
 *
 * ⚠️ VIEWING DOESN'T DIM; FORMS DO (decision 2). A package or material being read has no scrim and is not
 *    `aria-modal`, so the page stays live: pressing another card switches the drawer. A form dims the page and
 *    is modal. `HalfDrawer` always dims and is always modal, and the shell is this pack's to leave alone, so
 *    this is a page-local host built from HalfDrawer's own sheet (`halfDrawer.css`: `.hdr`, floating inset 8,
 *    radius 12) and the same escape layer (`ESC_LEVEL.pageDrawer`). A lift candidate: `HalfDrawer` + a `modal`
 *    switch would serve both.
 * ⚠️ THE DRAWER PORTALS TO `document.body`, so it carries `pk4-layer`, which declares the page's tokens (the
 *    portal-scope law).
 * ⚠️ PARKING (v3 D2): "+ Add a new …" in the package form keeps the package draft and swaps to the material
 *    form; saving there returns with the new material chosen, and Escape there returns to the package form.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import type { SubmissionPackage } from "../../../types";
import { QueryStatus } from "../../../types";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { editionNumber, editionsOf, ordinal } from "../../../lib/packageEditions";
import { OTHER_MAX } from "../../../lib/packageMetrics";
import { suggestPackageName, type MatKind } from "../../../lib/packagesPage";
import { qualifies, pct, MIN_SENDS_FOR_CLAIM, ranked, type Split } from "../../../lib/packageReplies";
import { STAGE_NAME } from "../../../lib/qcSummary";
import { initialsOf } from "../../../lib/manuscriptSummary";
import { sentRecordOf } from "../../../lib/queryActions/sentRecord";
import { dayMonth } from "../../../lib/packageResults";
import { countWords } from "../../../lib/materialDraft";
import { openQueryDrawer } from "../../../lib/queryActions/drawerStore";
import { AgentDisc } from "../../shared/AgentDisc";
import { ICON, KIND_ICON, KIND_ONE, PkgCard4, SplitBar, SplitKey, pkgs, qs } from "./parts";
import { EMPTY_PKG, type MatDraft, type MaterialWithNote, type PackagesModel, type PkgDraft } from "./usePackagesModel";
import "../../shell/halfDrawer.css";

export type DrawerView =
  | { m: "pkg"; id: string; tab: "inside" | "replies" }
  | { m: "mat"; kind: MatKind; id: string }
  | { m: "pkgform"; d: PkgDraft }
  | { m: "matform"; d: MatDraft; parked?: PkgDraft };

const ADD_WORD: Record<MatKind, string> = { letter: "query letter", synopsis: "synopsis", version: "manuscript version" };
const SEG_WORD: Record<MatKind, string> = { letter: "Query letter", synopsis: "Synopsis", version: "Version" };

/* ── the host ── */
/** true once the drawer is on screen: a switch between its views does not slide it in again */
const OpenCtx = React.createContext(false);

const Shell: React.FC<{ modal: boolean; label: string; onClose: () => void; head: React.ReactNode; foot: React.ReactNode; children: React.ReactNode; bodyKey: string }> = ({ modal, label, onClose, head, foot, children, bodyKey }) => {
  const already = React.useContext(OpenCtx);
  const [shown, setShown] = useState(already);
  useEffect(() => { if (already) return undefined; const id = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(id); }, [already]);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  /* a new subject starts at the top of the body */
  useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = 0; }, [bodyKey]);
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="pk4-layer">
      {modal ? <div className={`hdr-dim${shown ? " is-in" : ""}`} data-hdr="dim" data-hdr-of="pk4" data-pk4="scrim" onClick={onClose} aria-hidden="true" /> : null}
      <aside className={`hdr pk4-drw${shown ? " is-in" : ""}`} data-hdr="pk4" data-pk4="drawer" data-modal={modal ? "" : undefined}
        role="dialog" aria-modal={modal ? "true" : "false"} aria-label={label}>
        <header className="hdr-head" data-hdr="head">{head}</header>
        <div className="hdr-body pk4-dbody" data-hdr="body" ref={bodyRef}>{children}</div>
        <footer className="hdr-foot pk4-dfoot" data-hdr="foot">{foot}</footer>
      </aside>
    </div>,
    document.body,
  );
};

const Head: React.FC<{ icon: React.ReactNode; title: string; sub: React.ReactNode; ring?: boolean; onClose: () => void; children?: React.ReactNode }> = ({ icon, title, sub, ring, onClose, children }) => (
  <div className="pk4-dhead-w">
    <div className="pk4-dhead">
      <span className={`pk4-d52${ring ? " pk4-d52--ring" : ""}`}>{icon}</span>
      <div className="pk4-dht">
        <h2 className="pk4-dh2" id="pk4-dt" data-pk4="drawer-title">{title}</h2>
        <p className="pk4-dsub" data-pk4="drawer-sub">{sub}</p>
      </div>
      <button type="button" className="pk4-x" aria-label="Close" data-pk4="close" onClick={onClose}>✕</button>
    </div>
    {children}
  </div>
);

const SecHead: React.FC<{ n?: number; title: string; tag?: string }> = ({ n, title, tag }) => (
  <div className="pk4-sh">{n ? <span className="pk4-secn">{n}</span> : null}<h3>{title}</h3>{tag ? <span className="pk4-mono">{tag}</span> : null}</div>
);

const Cells: React.FC<{ cells: { label: string; fig: React.ReactNode; sub?: string; probe?: string }[] }> = ({ cells }) => (
  <div className="pk4-cells" data-pk4="cells">
    {cells.map((c) => (
      <div key={c.label} data-pk4={c.probe}>
        <span className="pk4-mono">{c.label}</span>
        <b>{c.fig}</b>
        {c.sub ? <small>{c.sub}</small> : null}
      </div>
    ))}
  </div>
);

/** A row in "Beside your other packages" / "Each part": icon, name, bar, replies with rate, requests. */
const SRow: React.FC<{ icon: React.ReactNode; name: string; s: Split; own?: boolean; muted?: boolean; onOpen?: () => void; sub?: string }> = ({ icon, name, s, own, muted, onOpen, sub }) => {
  const body = (
    <>
      <span className="pk4-ti">{icon}</span>
      <span className="pk4-srn"><strong>{name}</strong><span className="pk4-mono">{sub ?? `${qs(s.sent).toUpperCase()}${s.sent && !qualifies(s) ? " · FEWER THAN 4 ANSWERED" : ""}`}</span></span>
      <SplitBar s={s} />
      <span className="pk4-srnum"><b>{s.sent ? s.replies : "–"}</b><small>{s.answered ? pct(s.rate) : ""}</small></span>
      <span className="pk4-srnum"><b>{s.sent ? s.requests : "–"}</b></span>
    </>
  );
  const cls = `pk4-sr${own ? " pk4-sr--own" : ""}${muted ? " pk4-sr--mut" : ""}`;
  if (own || !onOpen) return <div className={cls} data-pk4="srow" data-own={own ? "" : undefined}>{body}</div>;
  return <button type="button" className={cls} data-pk4="srow" onClick={onOpen}>{body}</button>;
};
const SHead: React.FC = () => (
  <div className="pk4-sr pk4-sr--hd" aria-hidden="true"><span /><span className="pk4-mono">Name</span><span className="pk4-mono">Where they stand</span><span className="pk4-mono pk4-r">Replies</span><span className="pk4-mono pk4-r">Requests</span></div>
);

/* ── the More ⌄ menu, above its button ── */
const More: React.FC<{ items: { act: string; label: string; rust?: boolean; run: () => void }[] }> = ({ items }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return undefined;
    const down = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", down, true);
    return () => document.removeEventListener("pointerdown", down, true);
  }, [open]);
  /* Escape folds the menu before the drawer hears it */
  useEscapeLayer(open, () => setOpen(false), ESC_LEVEL.pageModal);
  if (!items.length) return null;
  return (
    <div className="pk4-more" ref={ref}>
      <button type="button" className="pk4-btn pk4-btn--ghost" aria-haspopup="menu" aria-expanded={open} data-pk4="more" onClick={() => setOpen((v) => !v)}>More ⌄</button>
      {open ? (
        <div className="pk4-menu" role="menu" data-pk4="menu">
          {items.map((i) => (
            <button key={i.act} type="button" role="menuitem" data-act={i.act} className={i.rust ? "pk4-rust" : undefined} onClick={() => { setOpen(false); i.run(); }}>{i.label}</button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

/* ═════════ D1 · a package ═════════ */
const PackageView: React.FC<{ model: PackagesModel; p: SubmissionPackage; tab: "inside" | "replies"; go: (v: DrawerView | null) => void; onClose: () => void }> = ({ model, p, tab, go, onClose }) => {
  const navigate = useNavigate();
  const sent = model.goneOut(p);
  const retired = p.status === "Retired";
  const cur = model.currentSplit(p);
  const all = model.allSplit(p);
  const credited = model.creditedQueries(p);
  const lastMs = credited.length ? model.rowsById.get(credited[0].id)?.sentMs ?? null : null;
  const ed = editionNumber(p);
  const L = model.matById("letter", p.queryLetterVersionId), S = model.matById("synopsis", p.synopsisVersionId), V = model.matById("version", p.bookVersionId);
  const [note, setNote] = useState(p.note ?? "");
  useEffect(() => { setNote(p.note ?? ""); }, [p.id, p.note]);
  const [confirmDel, setConfirmDel] = useState(false);
  useEffect(() => { setConfirmDel(false); }, [p.id]);
  const forNew = model.active?.id === p.id;
  const sub = `${retired ? "Retired · " : ""}${sent ? `${ordinal(ed)} edition · sent with ${qs(credited.length)}${lastMs != null ? `, last on ${dayMonth(lastMs)}` : ""}` : "Not sent yet"}`;
  const tabs = (
    <div className="pk4-dtabs" role="tablist" aria-label="Package" onKeyDown={(e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        const next = tab === "inside" ? "replies" : "inside";
        go({ m: "pkg", id: p.id, tab: next });
        requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-pk4="tab-${next}"]`)?.focus());
      }
    }}>
      <button type="button" role="tab" aria-selected={tab === "inside"} tabIndex={tab === "inside" ? 0 : -1} data-pk4="tab-inside" onClick={() => go({ m: "pkg", id: p.id, tab: "inside" })}>What's inside</button>
      <button type="button" role="tab" aria-selected={tab === "replies"} tabIndex={tab === "replies" ? 0 : -1} data-pk4="tab-replies" onClick={() => go({ m: "pkg", id: p.id, tab: "replies" })}>Replies and requests</button>
    </div>
  );
  const slotBtn = (k: MatKind, m: MaterialWithNote | null) => (
    <button key={k} type="button" className="pk4-slot pk4-slot--go" data-pk4="inside-slot" data-k={k} disabled={!m}
      onClick={() => m && go({ m: "mat", kind: k, id: m.id })}>
      <span className="pk4-ti">{KIND_ICON[k]}</span>
      <span className="pk4-sl"><span className="pk4-mono">{KIND_ONE[k]}</span>
        {m ? <strong>{m.name}</strong> : <em className="pk4-none">{k === "version" ? "Not recorded" : "No synopsis"}</em>}</span>
    </button>
  );
  const shownQ = credited.slice(0, 5);
  const inside = (
    <>
      <Cells cells={[
        { label: "Sent with", fig: cur.sent ? qs(cur.sent) : "–", probe: "cell-sent" },
        { label: "Replies", fig: cur.sent ? cur.replies : "–", probe: "cell-replies" },
        { label: "Requests", fig: cur.sent ? cur.requests : "–", probe: "cell-requests" },
      ]} />
      <section className="pk4-sec"><SecHead title="What's inside" tag="Choose one to read it" />
        <div className="pk4-box"><div className="pk4-slots">{slotBtn("letter", L)}{slotBtn("synopsis", S)}{slotBtn("version", V)}</div>
          {p.otherMaterials?.trim() ? <p className="pk4-also"><span className="pk4-mono">Also sends</span>{p.otherMaterials.trim()}</p> : null}</div>
      </section>
      <section className="pk4-sec"><SecHead title="Your note" tag="Only you see this" />
        <label className="pk4-vh" htmlFor="pk4-note">Your note</label>
        <textarea id="pk4-note" className="pk4-ta pk4-ta--note" data-pk4="note" value={note} placeholder="What you learned from sending it, who it suits…"
          onChange={(e) => setNote(e.target.value)} onBlur={() => void model.saveNote(p, note)} />
      </section>
      <section className="pk4-sec"><SecHead title={`Queries it went out with · ${credited.length}`} />
        <div className="pk4-box" data-pk4="queries">
          {shownQ.length ? shownQ.map((q) => {
            const r = model.rowsById.get(q.id);
            const name = r?.agentName ?? model.agents.find((a) => a.id === q.agentId)?.name ?? "Unknown agent";
            const closed = [QueryStatus.REJECTED, QueryStatus.NO_RESPONSE, QueryStatus.WITHDRAWN].includes(q.status as QueryStatus);
            return (
              <button key={q.id} type="button" className="pk4-qrow" data-pk4="qrow" onClick={() => { onClose(); navigate(`/queries?q=${encodeURIComponent(q.id)}`); }}>
                <AgentDisc initials={initialsOf(name)} standing={closed ? "closed" : "querying"} size={30} />
                <span className="pk4-qn">{name}<small>{r?.agentSub ?? ""}</small></span>
                <span className="pk4-qst">{STAGE_NAME[q.status as QueryStatus] ?? q.status}<small className="pk4-mono">{r?.sentMs != null ? dayMonth(r.sentMs) : ""}</small></span>
              </button>
            );
          }) : <div className="pk4-nonel">No query has gone out with this package yet. Choose it when you log a query.</div>}
          {credited.length > 5 ? (
            <button type="button" className="pk4-qrow pk4-qrow--all" data-pk4="qall" onClick={() => { onClose(); navigate("/queries"); }}>
              <span className="pk4-link">See all {credited.length} in the Query Centre</span>
            </button>
          ) : null}
        </div>
      </section>
    </>
  );
  /* "Beside your other packages": ALL editions (the table's figures); this package's own row is not a button */
  const sentPkgs = model.msPkgs.filter((x) => model.allSplit(x).sent > 0);
  const besides = ranked(sentPkgs.map((x) => ({ name: x.packageName, s: model.allSplit(x), p: x })));
  const eds = editionsOf(p);
  const earlier = credited.filter((q) => (sentRecordOf(q).edition ?? 1) !== ed).length;
  const replies = !cur.sent && !all.sent ? (
    <div className="pk4-nonel pk4-nonel--flat" data-pk4="replies-none">Nothing has gone out with this package yet. Once you log a query with it, its replies and requests are counted here.</div>
  ) : (
    <>
      <Cells cells={[
        { label: "Reply rate", fig: pct(cur.rate), sub: `${cur.replies} of ${cur.answered} no longer waiting`, probe: "cell-rate" },
        { label: "Requests", fig: cur.requests, sub: "partials and fulls", probe: "cell-requests" },
        { label: "Still waiting", fig: cur.out, sub: "no answer yet", probe: "cell-out" },
      ]} />
      {eds.length > 1 ? <div className="pk4-mono pk4-edline" data-pk4="edline">{ordinal(ed)} edition · {earlier} earlier {earlier === 1 ? "query is" : "queries are"} in {eds.length > 2 ? "earlier editions" : `the ${ordinal(ed - 1)}`}</div> : null}
      <section className="pk4-sec"><SecHead title="Where its queries stand" />
        <div className="pk4-box pk4-box--pad">
          <SplitBar s={cur} className="pk4-cb--big" />
          <div className="pk4-split">
            <span><b>{cur.requests}</b> requests</span><span><b>{cur.otherReplies}</b> other replies</span>
            <span><b>{cur.out}</b> still waiting</span><span><b>{cur.noReply}</b> no reply</span>
          </div>
          <div className="pk4-keyw"><SplitKey /></div>
        </div>
        {cur.answered < MIN_SENDS_FOR_CLAIM ? <div className="pk4-info" data-pk4="few">Only {cur.answered} answered so far. It joins the comparisons once 4 have been.</div> : null}
      </section>
      <section className="pk4-sec"><SecHead title="Beside your other packages" />
        <div className="pk4-box"><SHead />
          {besides.map((b) => <SRow key={b.p.id} icon={ICON.parcel} name={b.name} s={b.s} own={b.p.id === p.id} onOpen={() => go({ m: "pkg", id: b.p.id, tab: "replies" })} />)}
        </div>
      </section>
      <section className="pk4-sec"><SecHead title="Each part, across every package it's in" />
        <div className="pk4-box"><SHead />
          {L ? <SRow icon={ICON.letter} name={L.name} s={model.matSplit(L)} onOpen={() => go({ m: "mat", kind: "letter", id: L.id })} /> : null}
          {S ? <SRow icon={ICON.synopsis} name={S.name} s={model.matSplit(S)} onOpen={() => go({ m: "mat", kind: "synopsis", id: S.id })} /> : null}
          {V ? <SRow icon={ICON.version} name={V.name} s={model.matSplit(V)} onOpen={() => go({ m: "mat", kind: "version", id: V.id })} />
            : <SRow icon={ICON.version} name="Not recorded" s={model.matSplit({ id: null as unknown as string, kind: "version" })} />}
        </div>
      </section>
    </>
  );
  const moreItems = retired
    ? (!cur.sent && !all.sent ? [{ act: "delete", label: "Delete", rust: true, run: () => setConfirmDel(true) }] : [])
    : [
      ...(forNew ? [] : [{ act: "use", label: "Use for new queries", run: () => void model.usePkg(p) }]),
      { act: "dup", label: "Duplicate", run: () => go({ m: "pkgform", d: model.dupDraft(p) }) },
      { act: "retire", label: "Retire", run: () => void model.retirePkg(p) },
      ...(!sent && !all.sent ? [{ act: "delete", label: "Delete", rust: true, run: () => setConfirmDel(true) }] : []),
    ];
  const foot = confirmDel ? (
    <>
      <span className="pk4-note" data-pk4="confirm">Delete {p.packageName}? Nothing has gone out with it.</span>
      <button type="button" className="pk4-btn pk4-btn--ghost" onClick={() => setConfirmDel(false)}>Keep it</button>
      <button type="button" className="pk4-btn pk4-btn--rustfill" data-pk4="confirm-delete" onClick={async () => { if (await model.deletePkg(p)) go(null); }}>Delete</button>
    </>
  ) : (
    <>
      <span className="pk4-note" data-pk4="foot-note">{retired ? "Retired, with its history kept." : sent ? "Changing what's in it starts its next edition." : "Nothing has gone out with it yet."}</span>
      <More items={moreItems} />
      {retired ? <button type="button" className="pk4-btn pk4-btn--dark" data-pk4="restore" onClick={() => void model.restorePkg(p)}>Restore</button> : (
        <>
          <button type="button" className="pk4-btn pk4-btn--ghost" data-pk4="logq" onClick={() => { onClose(); openQueryDrawer({ mode: "log", manuscriptId: p.manuscriptId, packageId: p.id }); }}>Log a query with it</button>
          <button type="button" className="pk4-btn pk4-btn--dark" data-pk4="edit" onClick={() => go({ m: "pkgform", d: model.editDraft(p) })}>Edit</button>
        </>
      )}
    </>
  );
  return (
    <Shell modal={false} label={p.packageName} onClose={onClose} bodyKey={`${p.id}:${tab}`}
      head={<Head icon={ICON.parcel} title={p.packageName} sub={<>{sub}{forNew ? " · for new queries" : ""}</>} onClose={onClose}>{tabs}</Head>}
      foot={foot}>
      <div role="tabpanel" className="pk4-panel" data-pk4={`panel-${tab}`}>{tab === "inside" ? inside : replies}</div>
    </Shell>
  );
};

/* ═════════ D2 · the package form ═════════ */
const Opt: React.FC<{ on: boolean; name: string; note?: string; tag?: string; onPick: () => void; probe?: string }> = ({ on, name, note, tag, onPick, probe }) => (
  <button type="button" role="radio" aria-checked={on} className="pk4-opt" data-pk4={probe ?? "opt"} onClick={onPick}>
    <span className="pk4-rd" /><span className="pk4-optt"><strong>{name}</strong>{note ? <i>{note}</i> : null}</span>{tag ? <span className="pk4-mono">{tag}</span> : null}
  </button>
);

const PackageForm: React.FC<{ model: PackagesModel; d: PkgDraft; set: (d: PkgDraft) => void; go: (v: DrawerView | null) => void; onClose: () => void }> = ({ model, d, set, go, onClose }) => {
  const prev = d.editId ? model.msPkgs.find((p) => p.id === d.editId) ?? null : null;
  const prevSent = !!prev && model.goneOut(prev);
  /* ⚠️ THE EDITION NOTICE FOLLOWS THE LOCK STAMP, which is what updatePackage reads: a package whose queries predate
     the stamp is shown as sent, but changing it starts no edition, and the form must not say it will */
  const prevStamped = !!prev?.firstSentAt;
  /* required on a NEW package when the manuscript has a version; an existing package may stay without one */
  const versionRequired = !d.editId && model.allMats.version.length > 0;
  const valid = !!d.name.trim() && !!d.letter && (!versionRequired || !!d.version);
  const [busy, setBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => { requestAnimationFrame(() => nameRef.current?.focus()); }, []);
  const tag = (m: { id: string; kind: MatKind }) => { const n = model.packagesWith(m).filter((p) => p.id !== d.editId).length; return n ? `In ${pkgs(n)}` : "Unused"; };
  const pick = (k: "letter" | "synopsis" | "version", id: string) => {
    const next = { ...d, [k]: id };
    /* on a new package the name follows the chosen letter until the writer types one */
    if (!d.editId && !d.named && (k === "letter" || k === "synopsis")) {
      next.name = suggestPackageName(model.matById("letter", next.letter)?.name ?? null, model.matById("synopsis", next.synopsis)?.name ?? null);
    }
    set(next);
  };
  const save = async () => {
    if (!valid || busy) return;
    setBusy(true);
    const id = await model.savePackage(d);
    setBusy(false);
    if (id) go({ m: "pkg", id, tab: "inside" });
  };
  const park = (kind: MatKind) => go({ m: "matform", d: { kind, name: "", note: "", text: "" }, parked: d });
  const prevCount = prev ? model.creditedQueries(prev).length : 0;
  const title = d.editId ? `Edit ${prev?.packageName ?? "package"}` : model.msPkgs.length ? "New package" : "Build your first package";
  const onKey = (e: React.KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); void save(); } };
  /* the form offers what is not put away — plus the one this package holds now, if that one is put away (the
     archive model: a put-away letter stays chosen on the packages that hold it, and must show as chosen) */
  const withHeld = (k: MatKind, held: string) => {
    const offered = model.mats[k];
    const extra = held && !offered.some((m) => m.id === held) ? model.allMats[k].filter((m) => m.id === held) : [];
    return [...offered, ...extra];
  };
  const L = withHeld("letter", d.letter), S = withHeld("synopsis", d.synopsis), V = model.mats.version;
  return (
    <Shell modal label={title} onClose={onClose} bodyKey={`pkgform:${d.editId ?? "new"}`}
      head={<Head icon={ICON.parcel} title={title} sub="A query letter, a synopsis and a version of your manuscript." ring={!d.editId} onClose={onClose} />}
      foot={<>
        <span className="pk4-note" data-pk4="form-note">{!valid ? (versionRequired ? "Needs a name, a query letter and a version." : "Needs a name and a query letter.") : prevStamped ? "Renaming it keeps the same edition." : "You can change it freely until a query goes out with it."}</span>
        <button type="button" className="pk4-btn pk4-btn--ghost" data-pk4="cancel" onClick={onClose}>Cancel</button>
        <button type="button" className="pk4-btn pk4-btn--dark" data-pk4="save" disabled={!valid || busy} onClick={() => void save()}>{d.editId ? "Save changes" : "Create package"}</button>
      </>}>
      <div className="pk4-form" onKeyDown={onKey} data-pk4="pkgform">
        {d.dupFrom ? <div className="pk4-info pk4-info--fix" data-pk4="dup-notice">A copy of <b>{d.dupFrom}</b>. The original stays as it is.</div> : null}
        {prev && prevStamped ? (
          <div className="pk4-info pk4-info--fix" data-pk4="edition-notice">
            {prev.packageName} has gone out with {qs(prevCount)}. Changing what's in it starts its {ordinal(editionNumber(prev) + 1)} edition, and those {qs(prevCount)} stay with the {ordinal(editionNumber(prev))}. Renaming it doesn't.
          </div>
        ) : null}
        <section className="pk4-sec"><SecHead n={1} title="Name it" />
          <div className="pk4-fld">
            <label htmlFor="pk4-pname">Package name <b>*</b></label>
            <input id="pk4-pname" ref={nameRef} className="pk4-in pk4-in--big" data-pk4="pname" autoComplete="off" maxLength={120} value={d.name} placeholder="e.g. Standard UK"
              onChange={(e) => set({ ...d, name: e.target.value, named: true })}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void save(); } }} />
          </div>
        </section>
        <section className="pk4-sec"><SecHead n={2} title="What goes in it" tag="Choose one of each" />
          <span className="pk4-lab">Query letter <b>*</b></span>
          <div className="pk4-pick" role="radiogroup" aria-label="Query letter" data-pk4="pick-letter">
            {L.map((m) => <Opt key={m.id} on={d.letter === m.id} name={m.name} note={m.retired ? "Put away" : model.matById("letter", m.id)?.note} tag={tag(m)} onPick={() => pick("letter", m.id)} />)}
          </div>
          <button type="button" className="pk4-newm" data-pk4="park-letter" onClick={() => park("letter")}>+ Add a new query letter</button>
          <span className="pk4-lab">Synopsis</span>
          <div className="pk4-pick" role="radiogroup" aria-label="Synopsis" data-pk4="pick-synopsis">
            {S.map((m) => <Opt key={m.id} on={d.synopsis === m.id} name={m.name} note={m.retired ? "Put away" : model.matById("synopsis", m.id)?.note} tag={tag(m)} onPick={() => pick("synopsis", m.id)} />)}
            <Opt on={!d.synopsis} name="No synopsis" note="For agents who ask for a letter and pages only." onPick={() => pick("synopsis", "")} probe="opt-nosyn" />
          </div>
          <button type="button" className="pk4-newm" data-pk4="park-synopsis" onClick={() => park("synopsis")}>+ Add a new synopsis</button>
          <span className="pk4-lab">Manuscript version {versionRequired ? <b>*</b> : null}</span>
          <div className="pk4-pick" role="radiogroup" aria-label="Manuscript version" data-pk4="pick-version">
            {V.map((m) => <Opt key={m.id} on={d.version === m.id} name={m.name} note={model.matById("version", m.id)?.note} tag={tag(m)} onPick={() => pick("version", m.id)} />)}
            {/* clearing is offered only where it can be saved: never on a sent package (see savePackage) */}
            {!versionRequired && d.version && !prevStamped ? <Opt on={false} name="Not recorded" onPick={() => pick("version", "")} /> : null}
          </div>
          <button type="button" className="pk4-newm" data-pk4="park-version" onClick={() => park("version")}>+ Add a new version</button>
          <span className="pk4-lab">Anything else it sends</span>
          <div className="pk4-fld">
            <label className="pk4-vh" htmlFor="pk4-other">Anything else it sends</label>
            <input id="pk4-other" className="pk4-in" autoComplete="off" maxLength={OTHER_MAX} value={d.other} placeholder="e.g. Author bio in the email body" onChange={(e) => set({ ...d, other: e.target.value })} />
          </div>
          <div className="pk4-info">The pages you send each agent are recorded on the query itself.</div>
        </section>
        <section className="pk4-sec"><SecHead n={3} title="How it'll look on the page" />
          <div data-pk4="preview">
            <PkgCard4 preview pkg={{ id: d.editId ?? "draft", packageName: d.name, status: prev?.status ?? "Active", otherMaterials: d.other }} sent={prevSent}
              slots={{ letter: model.matById("letter", d.letter)?.name ?? null, synopsis: model.matById("synopsis", d.synopsis)?.name ?? null, version: model.matById("version", d.version)?.name ?? null }}
              split={prev ? model.currentSplit(prev) : null} forNew={!!prev && model.active?.id === prev.id} />
          </div>
        </section>
      </div>
    </Shell>
  );
};

/* ═════════ D3 · a material ═════════ */
const MaterialView: React.FC<{ model: PackagesModel; m: MaterialWithNote; go: (v: DrawerView | null) => void; onClose: () => void }> = ({ model, m, go, onClose }) => {
  const s = model.matSplit(m);
  const inPkgs = model.packagesWith(m);
  const gone = m.kind !== "version" && model.materialGoneOut(m.id);
  const [confirmDel, setConfirmDel] = useState(false);
  useEffect(() => { setConfirmDel(false); }, [m.id]);
  const editDraft: MatDraft = { editId: m.id, kind: m.kind, name: m.name, note: m.note, text: m.text ?? "" };
  const foot = confirmDel ? (
    <>
      <span className="pk4-note">Delete {m.name}? It isn't in a package.</span>
      <button type="button" className="pk4-btn pk4-btn--ghost" onClick={() => setConfirmDel(false)}>Keep it</button>
      <button type="button" className="pk4-btn pk4-btn--rustfill" data-pk4="confirm-delete" onClick={async () => { if (await model.deleteMat(m)) go(null); }}>Delete</button>
    </>
  ) : m.kind === "version" ? (
    <>
      <span className="pk4-note">Its name and description can change at any time.</span>
      <button type="button" className="pk4-btn pk4-btn--dark" data-pk4="edit" onClick={() => go({ m: "matform", d: editDraft })}>Edit</button>
    </>
  ) : m.retired ? (
    <>
      <span className="pk4-note">Put away. Packages that use it keep it.</span>
      <button type="button" className="pk4-btn pk4-btn--dark" data-pk4="restore" onClick={() => void model.restoreMat(m)}>Restore</button>
    </>
  ) : gone ? (
    <>
      <span className="pk4-note">It has gone out to agents, so its text is fixed.</span>
      <button type="button" className="pk4-btn pk4-btn--dark" data-pk4="newver" onClick={() => go({ m: "matform", d: model.newVersionDraft(m) })}>New version of {m.name}</button>
    </>
  ) : (
    <>
      <span className="pk4-note">Nothing has gone out with it, so you can still change it.</span>
      <More items={[
        { act: "away", label: "Put away", run: () => void model.putAway(m) },
        ...(inPkgs.length ? [] : [{ act: "delete", label: "Delete", rust: true, run: () => setConfirmDel(true) }]),
      ]} />
      <button type="button" className="pk4-btn pk4-btn--dark" data-pk4="edit" onClick={() => go({ m: "matform", d: editDraft })}>Edit</button>
    </>
  );
  return (
    <Shell modal={false} label={m.name} onClose={onClose} bodyKey={`mat:${m.id}`}
      head={<Head icon={KIND_ICON[m.kind]} title={m.name} sub={`${KIND_ONE[m.kind]}${m.note ? ` · ${m.note}` : ""}`} onClose={onClose} />}
      foot={foot}>
      <div className="pk4-panel" data-pk4="mat-view" data-k={m.kind}>
        <Cells cells={[
          { label: "In", fig: pkgs(inPkgs.length), probe: "cell-in" },
          { label: "Sent with", fig: s.sent ? qs(s.sent) : "–", probe: "cell-sent" },
          { label: "Requests", fig: s.sent ? s.requests : "–", probe: "cell-requests" },
        ]} />
        {m.kind === "version" ? null : (
          <section className="pk4-sec"><SecHead title="The text" tag="As you saved it" />
            <div className="pk4-box"><div className="pk4-excerpt" data-pk4="text">
              {m.text?.trim() ? m.text : m.link ? <a href={m.link} target="_blank" rel="noreferrer">{m.link}</a> : <i>No text saved.</i>}
            </div></div>
          </section>
        )}
        <section className="pk4-sec"><SecHead title="Packages it's in" />
          <div className="pk4-box">
            {inPkgs.length ? inPkgs.map((p) => {
              const ps = model.allSplit(p);
              const sent = model.goneOut(p);
              return (
                <button key={p.id} type="button" className="pk4-qrow" data-pk4="mat-pkg" onClick={() => go({ m: "pkg", id: p.id, tab: "inside" })}>
                  <span className="pk4-disc">{ICON.parcel}</span>
                  <span className="pk4-qn">{p.packageName}{p.status === "Retired" ? " (retired)" : ""}<small>{ps.sent ? `Sent with ${qs(ps.sent)}` : "Not sent yet"}</small></span>
                  <span className={`pk4-tag ${sent ? "pk4-tag--sent" : "pk4-tag--new"}`}>{sent ? <>{ICON.lock}Sent</> : "Not sent"}</span>
                </button>
              );
            }) : <div className="pk4-nonel">Not in a package yet.</div>}
          </div>
        </section>
      </div>
    </Shell>
  );
};

/* ═════════ D4 · the material form ═════════ */
const MaterialForm: React.FC<{ model: PackagesModel; d: MatDraft; parked?: PkgDraft; set: (d: MatDraft) => void; go: (v: DrawerView | null) => void; onClose: () => void }> = ({ model, d, parked, set, go, onClose }) => {
  const [busy, setBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => { requestAnimationFrame(() => nameRef.current?.focus()); }, []);
  const editing = d.editId ? model.matById(d.kind, d.editId) : null;
  const ok = !!d.name.trim();
  const words = useMemo(() => countWords(d.text), [d.text]);
  const back = () => (parked ? go({ m: "pkgform", d: parked }) : onClose());
  const save = async () => {
    if (!ok || busy) return;
    setBusy(true);
    const id = await model.saveMaterial(d);
    setBusy(false);
    if (!id) return;
    if (parked) go({ m: "pkgform", d: { ...parked, [d.kind]: id } });
    else go({ m: "mat", kind: d.kind, id });
  };
  const title = d.editId ? `Edit ${editing?.name ?? d.name}` : `Add a ${ADD_WORD[d.kind]}`;
  const sub = parked ? "You'll go straight back to your package." : d.kind === "version" ? "A shape of the book you can send, such as a new opening." : "Paste in what you wrote, so you always know what you sent.";
  return (
    <Shell modal label={title} onClose={back} bodyKey={`matform:${d.editId ?? d.kind}`}
      head={<Head icon={KIND_ICON[d.kind]} title={title} sub={sub} ring={!d.editId} onClose={onClose} />}
      foot={<>
        <span className="pk4-note">{ok ? "Fill in the rest any time." : "Only the name is needed now."}</span>
        <button type="button" className="pk4-btn pk4-btn--ghost" data-pk4={parked ? "unpark" : "cancel"} onClick={back}>{parked ? "Back to package" : "Cancel"}</button>
        <button type="button" className="pk4-btn pk4-btn--dark" data-pk4="save" disabled={!ok || busy} onClick={() => void save()}>{d.editId ? "Save changes" : parked ? "Add and use it" : "Add material"}</button>
      </>}>
      <div className="pk4-form" data-pk4="matform" data-k={d.kind} onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); void save(); } }}>
        {d.newFrom ? <div className="pk4-info pk4-info--fix" data-pk4="newfrom">A new version of <b>{d.newFrom}</b>. The original stays as it was sent.</div> : null}
        <section className="pk4-sec"><SecHead n={1} title="What is it?" />
          <div className="pk4-seg" role="radiogroup" aria-label="What is it?">
            {(["letter", "synopsis", "version"] as const).map((k) => (
              <button key={k} type="button" role="radio" aria-checked={d.kind === k} data-pk4={`kind-${k}`} disabled={!!d.editId || !!parked || !!d.newFrom}
                onClick={() => set({ ...d, kind: k })}>{KIND_ICON[k]}{SEG_WORD[k]}</button>
            ))}
          </div>
          <div className="pk4-fld">
            <label htmlFor="pk4-mname">Name <b>*</b></label>
            <input id="pk4-mname" ref={nameRef} className="pk4-in pk4-in--big" data-pk4="mname" autoComplete="off" maxLength={120} value={d.name}
              placeholder={d.kind === "letter" ? "e.g. Hook-first" : d.kind === "synopsis" ? "e.g. One-page" : "e.g. Fast-paced opening"}
              onChange={(e) => set({ ...d, name: e.target.value })}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void save(); } }} />
          </div>
          <div className="pk4-fld">
            <label htmlFor="pk4-mnote">A line to tell it apart</label>
            <input id="pk4-mnote" className="pk4-in" autoComplete="off" maxLength={300} value={d.note} placeholder="e.g. Leads with the comps" onChange={(e) => set({ ...d, note: e.target.value })} />
          </div>
        </section>
        {d.kind === "version" ? null : (
          <section className="pk4-sec"><SecHead n={2} title="The text" tag="Optional" />
            <div className="pk4-fld">
              <label htmlFor="pk4-mtext">Paste your {ADD_WORD[d.kind]}</label>
              <textarea id="pk4-mtext" className="pk4-ta" data-pk4="mtext" value={d.text} placeholder="Paste it here exactly as you'll send it." onChange={(e) => set({ ...d, text: e.target.value })} />
              <span className="pk4-hint" aria-live="polite">{words.toLocaleString("en-GB")} word{words === 1 ? "" : "s"}</span>
            </div>
          </section>
        )}
      </div>
    </Shell>
  );
};

/* ═════════ the drawer ═════════ */
export const PkgDrawer4: React.FC<{ model: PackagesModel; view: DrawerView | null; go: (v: DrawerView | null) => void }> = ({ model, view, go }) => {
  const close = () => go(null);
  /* Escape: a parked material form goes back to its package; everything else closes */
  const esc = () => {
    if (view?.m === "matform" && view.parked) go({ m: "pkgform", d: view.parked });
    else close();
  };
  useEscapeLayer(!!view, esc, ESC_LEVEL.pageDrawer);
  const wasOpen = useRef(false);
  const already = wasOpen.current;
  useEffect(() => { wasOpen.current = !!view; });
  if (!view) return null;
  return <OpenCtx.Provider value={already}>{body(view)}</OpenCtx.Provider>;
  function body(view: DrawerView) {
  if (view.m === "pkg") {
    const p = model.msPkgs.find((x) => x.id === view.id);
    return p ? <PackageView model={model} p={p} tab={view.tab} go={go} onClose={close} /> : null;
  }
  if (view.m === "mat") {
    const m = model.matById(view.kind, view.id);
    return m ? <MaterialView model={model} m={m} go={go} onClose={close} /> : null;
  }
  if (view.m === "pkgform") return <PackageForm key={`pf:${view.d.editId ?? view.d.dupFrom ?? "new"}`} model={model} d={view.d} set={(d) => go({ m: "pkgform", d })} go={go} onClose={close} />;
  return <MaterialForm key={`mf:${view.d.editId ?? view.d.kind}:${view.parked ? "p" : ""}`} model={model} d={view.d} parked={view.parked}
    set={(d) => go({ ...view, d })} go={go} onClose={close} />;
  }
};

export { EMPTY_PKG };
