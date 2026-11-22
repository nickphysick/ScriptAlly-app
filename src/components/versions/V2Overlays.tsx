/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Versions v2 — the new / edit form (P9; Versions v6 renders it in the page's own card, `bare`), "Which version went?"
 * (P10), the explainer, and the modal shell (which also hosts v6's version map dialog). Each is the ref's own markup.
 * Versions v6 DELETED the version drawer (P8), its funnel, the drawer shell and the archive / delete confirm (S04, S05):
 * the open version is on the page, and archiving is the open card's inline confirm.
 *
 * ⚠️ THEY PORTAL TO <body>, INSIDE A `.vv2` LAYER, because the page's stylesheet is scoped to `.vv2` and the ref's
 *    drawer and modals are children of its <body>. The layer carries the page's state attributes too.
 * ⚠️ NOTHING HERE WRITES. Every save is the page's, through lib/bookVersions and db.writeVersionChange, so its Undo is
 *    one snapshot.
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Agent, Manuscript, Query } from "../../types";
import { useEscapeLayer, ESC_LEVEL } from "../../lib/escapeStack";
import {
  MAX_CHANGES, MAX_CHANGE_LEN, MAX_VERSION_NAME, changesProblem, cleanChanges, descendantsOf, nameProblem, type V2Version,
} from "../../lib/bookVersions";
import {
  VERSION_NOT_SURE, laterBy, pickerDefault, savedBy, type VersionFacts, type VersionsModel,
} from "../../lib/versionsV2";
import { DocMark, Chevron, Num, XMark, agentLine, commas, sentDay, shortDay, versionLabel } from "./v2Bits";

const SCROLLS = "/images/versions/versions-scrolls-hawk.webp";
const EXPLAINER = "/images/versions/explainer-hawk.webp";

/* ══ the layer and the two shells ══════════════════════════════════════════════════════════════════════════ */

export const Layer: React.FC<{ attrs: Record<string, string>; children: React.ReactNode }> = ({ attrs, children }) =>
  /* no document while server-rendering (the render smoke): nothing over the page is open then anyway */
  typeof document === "undefined" ? null : createPortal(<div className="vv2" data-vv2="layer" {...attrs}>{children}</div>, document.body);

/** Focus the first `[data-first]` (else the close button) once open; give focus back to the opener on close. */
function useFocusLoop(open: boolean, root: React.RefObject<HTMLElement | null>, key: unknown) {
  const opener = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (!open) return;
    opener.current = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => {
      const f = root.current?.querySelector<HTMLElement>("[data-first]") ?? root.current?.querySelector<HTMLElement>(".cx-x");
      f?.focus();
    }, 60);
    return () => { window.clearTimeout(t); const o = opener.current; if (o && document.contains(o)) requestAnimationFrame(() => o.focus()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, key]);
}

export const ModalShell: React.FC<{ open: boolean; kind: "m" | "p" | "map"; onClose: () => void; children: React.ReactNode; vv?: string; k?: unknown }> = ({ open, kind, onClose, children, vv, k }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEscapeLayer(open, onClose, ESC_LEVEL.pageModal);
  useFocusLoop(open, ref, k);
  return (
    <div className={`cx-mdim${open ? " on" : ""}${kind === "map" ? " v6-mapdim" : ""}`} id={kind === "m" ? "cxMdim" : kind === "map" ? "cxMapdim" : "cxPdim"} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} className={kind === "m" ? "cx-modal sm" : kind === "map" ? "v6-mapbox" : "cx-pk"} id={kind === "m" ? "cxModal" : kind === "map" ? "cxMap" : "cxPk"} role="dialog" aria-modal="true"
        aria-labelledby={kind === "p" ? "cxPkT" : kind === "map" ? "msTH" : undefined} data-vv2={vv}>
        {open ? children : null}
      </div>
    </div>
  );
};

/* ══ the lineage diagram (the ref's `lin`) ═════════════════════════════════════════════════════════════════ */

export const outcomeLine = (f: VersionFacts | null): string =>
  !f ? "" : f.n ? (f.early ? `${f.n} sent · too early to tell` : `${f.ratePct}% asked for more · ${f.n} sent`) : "Not sent yet";

interface CardSpec { v: Pick<V2Version, "original" | "num"> | null; name: string; sub: string; on?: boolean; child?: boolean; om?: boolean }
const LinCard: React.FC<CardSpec> = ({ v, name, sub, on, child, om }) => (
  <div className={`ln-v${child ? " ch" : ""}${om ? " om" : ""}`}>
    <div className="ln-vh"><span className={`vl-n${on ? " on" : ""}`}><Num v={v} /></span><b>{name}</b></div>
    <small>{sub}</small>
  </div>
);
export const Lineage: React.FC<{ parent: CardSpec; changes: readonly string[]; child: CardSpec }> = ({ parent, changes, child }) => (
  <div className="ln3">
    <div className="ln-col"><LinCard {...parent} /></div>
    <span className="ln-ar" aria-hidden="true" />
    <div className="ln-cs">
      {changes.length ? changes.map((c, i) => <div className="ln-c" key={i}><span>Change {i + 1}</span><p>{c}</p></div>)
        : <div className="ln-c e"><p>Add what changed and it shows here.</p></div>}
    </div>
    <span className="ln-ar" aria-hidden="true" />
    <div className="ln-col"><LinCard {...child} child /></div>
  </div>
);

/* ══ the form (P9; the ref's `vform`) ════════════════════════════════════════════════════════════════════ */

export interface FormSave { name: string; changes: string[]; wordCount: number | null; parentId: string | null }
export interface VersionFormProps {
  ms: Manuscript; m: VersionsModel; edit: V2Version | null; earlier: number;
  onClose: () => void; onSave: (s: FormSave) => void; onDetails: () => void;
  /** Versions v6 — rendered in the page's own card under its navy band: the drawer header is left out, nothing else */
  bare?: boolean;
}

export const VersionForm: React.FC<VersionFormProps> = ({ ms, m, edit, earlier, onClose, onSave, onDetails, bare = false }) => {
  const v = edit;
  const first = !v && !m.versions.length;
  const root = !!v && (v.original || !v.parentId);
  const sent = !!v && (m.facts.get(v.id)?.all.length ?? 0) > 0;
  const nSent = v ? m.facts.get(v.id)?.n ?? 0 : 0;
  const desc = useMemo(() => (v ? descendantsOf(m.versions, v.id) : new Set<string>()), [v, m.versions]);
  const opts = m.live.filter((x) => (!v || x.id !== v.id) && !desc.has(x.id));
  const [from, setFrom] = useState<string | null>(v ? v.parentId : first ? null : m.inUse ?? m.live[m.live.length - 1]?.id ?? null);
  const [name, setName] = useState(v ? v.name : "");
  const [list, setList] = useState<string[]>(v ? [...v.changes] : []);
  const [draft, setDraft] = useState("");
  const [words, setWords] = useState(v && !v.original && v.wordCount ? commas(v.wordCount) : "");
  const inp = useRef<HTMLInputElement>(null);
  const nm = name.trim();
  const dup = !root && !!nm && nameProblem(nm, m.versions, v?.id ?? null) === "taken";
  const full = list.length >= MAX_CHANGES;
  const ok = !!nm && !dup && (root || !changesProblem(list));
  const ready = dup ? "Choose a different name." : !nm ? "Give it a name." : !root && !list.length ? "Add at least one change." : first ? (earlier ? `Ready. Original is saved too, with your ${earlier} ${earlier === 1 ? "query" : "queries"}.` : "Ready. Original is saved too.") : "Ready to save.";
  const add = () => { const t = draft.trim(); if (!t || list.length >= MAX_CHANGES) return; setList([...list, t.slice(0, MAX_CHANGE_LEN)]); setDraft(""); inp.current?.focus(); };
  const p = first ? null : from ? m.versions.find((x) => x.id === from) ?? null : null;
  const pf = p ? m.facts.get(p.id) ?? null : null;
  const nextNum = v ? v.num : first ? 1 : Math.max(0, ...m.versions.map((x) => x.num)) + 1;
  const save = () => {
    if (!ok) return;
    const n = parseInt(words.replace(/\D/g, ""), 10);
    onSave({ name: nm, changes: cleanChanges(list), wordCount: Number.isFinite(n) && n > 0 ? n : null, parentId: first ? null : from });
  };
  return (
    <>
      {bare ? null : (
        <div className="dh vdh">
          <img className="vdh-art" src={SCROLLS} alt="" aria-hidden="true" />
          <div className="tx"><h3 id="cxDrwT">{v ? `Edit ${v.name}` : "Save a new version"}</h3><small>{ms.title}</small></div>
          <button type="button" className="cx-x" aria-label="Close" onClick={onClose}><XMark /></button>
        </div>
      )}
      <div className="db" data-vv2="form">
        {v && root
          ? <div className="fv-note"><span className="ic">i</span><p><b>Original is your manuscript as you first sent it.</b> Its name stays Original, and its word count comes from your <button type="button" className="cx-lnk" onClick={onDetails}>manuscript details</button>.</p></div>
          : sent ? <div className="fv-note"><span className="ic">i</span><p><b>Sent with {nSent} {nSent === 1 ? "query" : "queries"}.</b> Edits update its record here, not what agents received.</p></div> : null}
        {/* v2.2 C4 — the first save, with or without earlier queries (S27, S37) */}
        {first && earlier ? <div className="fv-note" data-vv2="first-note"><span className="ic">i</span><p>You already have <b>{earlier} {earlier === 1 ? "query" : "queries"}</b> out. We’ll assume the materials that went with them were part of your <em>original manuscript</em>. Don’t worry: if that’s not the case, it’s easy to update.</p></div> : null}
        {first && !earlier ? <div className="fv-note" data-vv2="first-note"><span className="ic">i</span><p>We’ll save your <em>original manuscript</em> as <b>Original</b> too, so this version has somewhere to start from.</p></div> : null}
        {root ? null : (
          <div className="cx-sect"><h4><span className="n">1</span>Starts from</h4>
            {first
              ? <div className="vfrom"><button type="button" role="radio" aria-checked="true" disabled><i className="rd" /><b>Original</b><small>Your original manuscript</small></button></div>
              : <div className="vfrom" role="radiogroup" data-vv2="from">
                  {opts.map((x) => (
                    <button type="button" key={x.id} role="radio" aria-checked={from === x.id} disabled={sent} onClick={() => setFrom(x.id)}>
                      <i className="rd" /><b>{x.name}</b><small>{versionLabel(x)}{x.id === m.inUse ? " · in use" : ""}</small>
                    </button>
                  ))}
                </div>}
            <p className="fv-h">{first ? "Your new version is a change to it." : sent ? "This version has gone out, so where it started is fixed." : "Usually the one you’re sending now. Pick another to try a different direction from it."}</p>
          </div>
        )}
        <div className="cx-sect"><h4><span className="n">{root ? 1 : 2}</span>Name it</h4>
          <label className="cx-fld"><span>Version name <i className="req">*</i></span>
            <input className={`big${dup ? " bad" : ""}`} id="vName" data-first value={name} placeholder="e.g. Prologue cut" autoComplete="off" maxLength={MAX_VERSION_NAME} disabled={root} onChange={(e) => setName(e.target.value)} data-vv2="name" />
            <small className="fv-err" id="vErr" hidden={!dup}>{dup ? "You already have a version called this." : ""}</small>
          </label>
        </div>
        {root ? null : (
          <div className="cx-sect"><h4><span className="n">3</span>What changed?</h4>
            <p className="fv-h" style={{ marginTop: 0 }}>One change at a time, up to 8.</p>
            <div className="cg-in">
              <input id="cgIn" ref={inp} value={draft} placeholder={full ? "That’s the most one version can hold" : "e.g. Added a prologue"} autoComplete="off" maxLength={MAX_CHANGE_LEN} disabled={full}
                onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} data-vv2="change-in" />
              <button className="cx-b g" id="cgAdd" type="button" disabled={full} onClick={add}>Add</button>
            </div>
            <div className="cg-l" id="cgL">
              {list.map((c, i) => <span className="cg-c" key={i}><i>{i + 1}</i>{c}<button type="button" aria-label={`Remove ${c}`} onClick={() => setList(list.filter((_, k) => k !== i))}><XMark /></button></span>)}
            </div>
          </div>
        )}
        <div className="cx-sect">
          <label className="cx-fld" style={{ maxWidth: 220 }}><span>Word count<em style={{ fontStyle: "normal", color: "var(--cx-i45)" }}> · {root ? "from manuscript details" : "optional"}</em></span>
            <input id="vWords" inputMode="numeric" value={root ? (ms.wordCount ? commas(ms.wordCount) : "") : words} placeholder={ms.wordCount ? commas(ms.wordCount) : ""} disabled={root} onChange={(e) => setWords(e.target.value)} />
          </label>
        </div>
        {root ? null : (
          <>
            <h5>How it will look</h5>
            <div id="cgPv">
              <Lineage
                parent={first ? { v: { original: true, num: 0 }, name: "Original", sub: earlier ? `Your original manuscript · ${earlier} ${earlier === 1 ? "query" : "queries"}` : "Your original manuscript", om: true }
                  : { v: p, name: p ? p.name : "", sub: outcomeLine(pf), on: !!p && p.id === m.inUse, om: !!p?.original }}
                changes={list}
                child={{ v: { original: false, num: nextNum }, name: nm || "Your new version", sub: v ? outcomeLine(m.facts.get(v.id) ?? null) : "Used for new queries once it’s in a package" }} />
            </div>
          </>
        )}
      </div>
      <div className="df">
        <span id="vReady">{ready}</span>
        <div className="bt">
          <button type="button" className="cx-b g" onClick={onClose}>Cancel</button>
          <button type="button" className="cx-b p" id="vSave" disabled={!ok} onClick={save} data-vv2="save">{v ? "Save changes" : "Save version"}</button>
        </div>
      </div>
    </>
  );
};

/* ══ "Which version went?" (P10; the ref's `vpRow`, `fill` and `moveQ`) ══════════════════════════════════════ */

const PickRow: React.FC<{ i: number; q: Query; m: VersionsModel; agents: Map<string, Agent>; cur: string | null; open: boolean; onToggle: () => void; onPick: (id: string | null) => void }> = ({ i, q, m, agents, cur, open, onToggle, onPick }) => {
  const v = cur ? m.versions.find((x) => x.id === cur) ?? null : null;
  const sd = sentDay(q);
  const a = agentLine(q, agents);
  const list = [...m.live].sort((x, y) => y.num - x.num);
  const arch = [...m.archived].sort((x, y) => y.num - x.num);
  const yes = list.filter((x) => savedBy(x, sd)), no = list.filter((x) => !savedBy(x, sd));
  const menu = useRef<HTMLDivElement>(null);
  useEffect(() => { if (open) (menu.current?.querySelector<HTMLElement>('[aria-selected="true"]') ?? menu.current?.querySelector<HTMLElement>(".vp-o"))?.focus(); }, [open]);
  const opt = (x: V2Version, ok: boolean) => (
    <button type="button" key={x.id} role="option" className="vp-o" aria-selected={x.id === cur} data-late={ok ? undefined : "1"} data-vv2="pick" onClick={() => onPick(x.id)}>
      <span className={`vl-n${x.id === m.inUse ? " on" : ""}`}><Num v={x} /></span>
      <span className="vp-ot"><b>{x.name}</b><small>{x.original ? "Your original manuscript" : `Saved ${shortDay(x.createdDate)}${ok || !sd ? "" : ` · ${laterBy(x.createdDate, sd)} later`}`}</small></span>
      {x.id === cur ? <i>✓</i> : null}
    </button>
  );
  return (
    <div className={`vp-row${open ? " open" : ""}`} data-vv2="pick-row">
      <span className="av">{a.initials}</span>
      <div className="vp-who"><b>{a.name}</b><small>{a.agency ? `${a.agency} · ` : ""}sent {shortDay(sd)}</small></div>
      <button type="button" className={`vp-b${v ? "" : " none"}`} data-vp={i} aria-haspopup="listbox" aria-expanded={open} onClick={onToggle} data-vv2="pick-trigger">
        {v ? <><span className={`vl-n${v.id === m.inUse ? " on" : ""}`}><Num v={v} /></span><span className="vp-t">{v.name}</span></> : <span className="vp-t">Not sure yet</span>}
        <Chevron />
      </button>
      {v && sd && !savedBy(v, sd) ? <p className="vp-w" role="status" data-vv2="late"><b>Are you sure?</b> {v.name} was saved {laterBy(v.createdDate, sd)} after you sent the query to {a.name}.</p> : null}
      {open ? (
        <div className="vp-m" role="listbox" aria-label={`Version sent to ${a.name}`} ref={menu}>
          {yes.map((x) => opt(x, true))}
          <button type="button" role="option" className="vp-o ns" aria-selected={!cur} onClick={() => onPick(null)}>
            <span className="vl-n">?</span><span className="vp-ot"><b>Not sure yet</b><small>Left out of the comparison for now</small></span>{!cur ? <i>✓</i> : null}
          </button>
          {no.length ? <><p className="vp-k">Saved after you sent this query</p>{no.map((x) => opt(x, false))}</> : null}
          {arch.length ? <><p className="vp-k">Archived</p>{arch.map((x) => opt(x, savedBy(x, sd)))}</> : null}
        </div>
      ) : null}
    </div>
  );
};

export type PickerMode = { kind: "assign" } | { kind: "change"; q: Query };
export const Picker: React.FC<{ mode: PickerMode; m: VersionsModel; agents: Map<string, Agent>; onClose: () => void; onSave: (picks: Map<string, string | null>) => void }> = ({ mode, m, agents, onClose, onSave }) => {
  const qs = mode.kind === "assign" ? m.unrecorded : [mode.q];
  const startOf = (q: Query) => (mode.kind === "change" ? m.resolved.get(q.id) ?? null : pickerDefault(q, m));
  const [ch, setCh] = useState<Map<string, string | null>>(() => new Map(qs.map((q) => [q.id, startOf(q)])));
  const [open, setOpen] = useState(mode.kind === "change" ? 0 : -1);
  if (mode.kind === "change") {
    const q = mode.q, was = m.resolved.get(q.id) ?? null, cur = ch.get(q.id) ?? null;
    const wasV = was ? m.versions.find((x) => x.id === was) : null;
    const who = agentLine(q, agents).name;
    const same = cur === was;
    return (
      <>
        <div className="cx-ph"><div className="tx"><h3 id="cxPkT">Which version went to {who}?</h3><small>Now counted under {wasV ? (wasV.original ? "the original" : wasV.name) : "no version"}</small></div><button type="button" className="cx-x" aria-label="Close" onClick={onClose}><XMark /></button></div>
        <div className="vp-list"><PickRow i={0} q={q} m={m} agents={agents} cur={cur} open={open === 0} onToggle={() => setOpen(open === 0 ? -1 : 0)} onPick={(id) => { setCh(new Map([[q.id, id]])); setOpen(-1); }} /></div>
        <div className="cx-pf">
          <span className="cx-nt" id="mvN">{same ? "Pick the version that went." : cur ? `Moves to ${m.versions.find((x) => x.id === cur)?.name}.` : "It will stay out of the comparison."}</span>
          <button type="button" className="cx-b g" onClick={onClose}>Cancel</button>
          <button type="button" className="cx-b p" id="mvS" disabled={same} onClick={() => onSave(ch)} data-vv2="pick-save">Save</button>
        </div>
      </>
    );
  }
  const n = [...ch.values()].filter(Boolean).length;
  return (
    <>
      <div className="cx-ph"><div className="tx"><h3 id="cxPkT">Which version went?</h3><small>{qs.length} {qs.length === 1 ? "query was" : "queries were"} sent without a version recorded.</small></div><button type="button" className="cx-x" aria-label="Close" onClick={onClose}><XMark /></button></div>
      <p className="cx-tip">Where only one version had been saved by the send date, we’ve picked it for you.</p>
      <div className="vp-list">
        {qs.map((q, i) => <PickRow key={q.id} i={i} q={q} m={m} agents={agents} cur={ch.get(q.id) ?? null} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)}
          onPick={(id) => { const next = new Map(ch); next.set(q.id, id); setCh(next); setOpen(-1); }} />)}
      </div>
      <div className="cx-pf">
        <span className="cx-nt" id="fiN">{n ? `${n} of ${qs.length} will be recorded` : "Nothing chosen yet"}</span>
        <button type="button" className="cx-b g" onClick={onClose}>Cancel</button>
        <button type="button" className="cx-b p" id="fiS" disabled={!n} onClick={() => onSave(new Map([...ch].filter(([, v]) => !!v)))} data-vv2="pick-save">Save</button>
      </div>
    </>
  );
};
export { VERSION_NOT_SURE };

/* ══ the explainer (the ref's `how`) ═══════════════════════════════════════════════════════════════════════ */

export const Explainer: React.FC<{ onClose: () => void; onNew: () => void }> = ({ onClose, onNew }) => (
  <>
    <button type="button" className="cx-x lt" aria-label="Close" onClick={onClose}><XMark /></button>
    <div className="cx-explain">
      <div className="cx-xart"><img alt="" src={EXPLAINER} /></div>
      <div>
        <h4>How version tracking works</h4>
        <p>Prologue first? Fast-paced opening? A version is the same story told a different way. Save one each time the opening changes, and QueryHawk tracks which one goes out with each query.</p>
        <ul>
          <li><i>1</i><span><b>Save a version</b> when you cut a prologue, reorder chapters or rewrite pages.</span></li>
          <li><i>2</i><span><b>Put it in a package</b> on Submission packages. New queries send what that package holds.</span></li>
          <li><i>3</i><span><b>See what’s landing.</b> Each version shows how often agents asked to read more.</span></li>
        </ul>
      </div>
      <div className="cx-xf">Once a version has gone out, its record is fixed. You can still rename it.<button type="button" className="cx-lnk" onClick={onNew}>Save a version</button></div>
    </div>
  </>
);

export { DocMark };
