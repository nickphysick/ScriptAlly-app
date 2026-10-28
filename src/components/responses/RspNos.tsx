/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Responses v5 Phase 7 (ref `wall`) — YOUR WALL OF NO: the blush banner, the hand-drawn tally and its caption, every pass
 * and no-reply close in a white sheet under the navy bar, then the share card.
 *
 * ⚠️ `gatePaths` AND `Gate` ARE v2's, BYTE FOR BYTE (the reference's `gate` and its seeded jitter); the ghost gates after
 *    the last are the reference's rule (enough to reach twenty marks, plus one, fading).
 * ⚠️ THE ROWS ARE `listNos` (lib/responses): the kind (shared with the glance cards), the search and the sort. Sorted by
 *    Answered (the default, newest first) they group under month headings; any other sort is one list. Sorting is on
 *    the column headings only. Six columns, and no package column (D1).
 * ⚠️ THE NAVY BAR AND THE HEADINGS PIN TOGETHER, decided from a zero-height sentinel above the sheet with v2's
 *    hysteresis (`nextPinned`), derived on every scroll and never from an observer; the month headings stick under the
 *    pinned stack (`--rs-stack`, measured).
 * ⚠️ A PAGE-LOCAL COPY of the Query Centre's navy list bar, headings and cream group heading (no shared component exists):
 *    a lift candidate.
 * ⚠️ THE SHARE CARD OPENS THE EXISTING BUILDER (`RspShare`), unchanged. The reference's "No agent names are ever shown" is
 *    left out: the builder has a switch that shows them.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { StatusDot } from "../StatusDot";
import { QueryStatus } from "../../types";
import {
  FAR_WORDS, hasNote, listNos, monthGroups, monthYear, nextPinned, plural, respDate,
  type NoKind, type NoSort, type RespItem,
} from "../../lib/responses";
import type { QcRow } from "../../lib/qcSummary";
import { SHORTCUTS, isEditableTarget, matchesShortcut } from "../../lib/shortcuts";
import { RspShare } from "./RspShare";

type Item = RespItem<QcRow>;
const reduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
/** the agent's own facts the wall reads: the reply time they give, and whether no reply means no */
export interface AgentFacts { weeks: number | null; nrmn: boolean }

/* ── the tally's gates: the reference's `gateSVG` and its seeded jitter, unchanged ── */
function seeded(n: number): () => number { let t = n; return () => { t = (t * 1103515245 + 12345) % 2147483648; return t / 2147483648; }; }
export function gatePaths(n: number, ghost: boolean, seed: number): { ink: string[]; ghost: string[] } {
  const r = seeded(seed), j = () => (r() - 0.5) * 2.2;
  const ink: string[] = [], gh: string[] = [];
  for (let k = 0; k < 4; k++) {
    const x = 6 + k * 9;
    const d = `M${x + j()} ${4 + j()} Q ${x + j() * 1.5} 22 ${x + j()} ${40 + j()}`;
    if (k < n) ink.push(d); else if (ghost) gh.push(d);
  }
  const cross = `M${-1 + j()} ${30 + j()} L ${40 + j()} ${10 + j()}`;
  if (n === 5) ink.push(cross); else if (ghost) gh.push(cross);
  return { ink, ghost: gh };
}
const Gate: React.FC<{ n: number; ghost: boolean; seed: number; fresh?: boolean; opacity?: number }> = ({ n, ghost, seed, fresh, opacity }) => {
  const p = gatePaths(n, ghost, seed);
  return (
    <svg width="54" height="57" viewBox="0 0 42 44" className={fresh ? "is-new" : undefined} aria-hidden="true" data-rsp="gate" data-n={n}
      style={opacity != null ? { opacity } : undefined}>
      {p.ghost.length ? <g fill="none" stroke="#1c130f" strokeWidth={1.6} strokeLinecap="round" strokeDasharray="2.5 3.5" opacity={0.34}>{p.ghost.map((d) => <path key={d} d={d} />)}</g> : null}
      {p.ink.length ? <g fill="none" stroke="#1c130f" strokeWidth={2.4} strokeLinecap="round" opacity={0.86} data-rsp="gate-ink">{p.ink.map((d) => <path key={d} d={d} />)}</g> : null}
    </svg>
  );
};

/** the reference's ghost rule: enough gates to reach twenty marks, plus one */
export const ghostCount = (n: number, gates: number): number => Math.max(0, Math.ceil(Math.max(n, 20) / 5) - gates + 1);
const gatesOf = (n: number): number[] => { const g: number[] = []; for (let r = n; r > 0; r -= 5) g.push(Math.min(5, r)); return g; };

export const Tally: React.FC<{ n: number; seed?: number; ghosts?: boolean; example?: boolean }> = ({ n, ghosts = true }) => {
  const gates = gatesOf(n);
  const gh = ghosts ? ghostCount(n, gates.length) : 0;
  return (
    <div className="rsp5-tally" role="img" aria-label={`${n} tally ${n === 1 ? "mark" : "marks"}, one for each no`} data-rsp5="marks">
      {gates.map((g, i) => <Gate key={`g${i}`} n={g} ghost={i === gates.length - 1} seed={n * 31 + i} />)}
      {Array.from({ length: gh }, (_, k) => (
        <span key={`h${k}`} data-rsp5="ghost-gate" style={{ opacity: Math.max(0.15, 1 - (k / gh) * 0.85) }}><Gate n={0} ghost seed={k * 17 + 5} /></span>
      ))}
    </div>
  );
};

/** v138.1's in-sheet search: `/` focuses it from anywhere outside a field (the registry's `respFind`); Escape clears it */
const SheetSearch: React.FC<{ value: string; onChange: (v: string) => void; active: boolean }> = ({ value, onChange, active }) => {
  const ref = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (!active) return undefined;
    const key = (e: KeyboardEvent) => {
      if (!matchesShortcut(SHORTCUTS.respFind, e) || isEditableTarget(e.target)) return;
      if (!ref.current || ref.current.getClientRects().length === 0) return;
      e.preventDefault();
      ref.current.focus();
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [active]);
  return (
    <label className="rsp5-lfind" data-rsp5="search">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      <input ref={ref} value={value} placeholder="Find an agent or agency" aria-label="Find an agent or agency" autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Escape" && value) { e.preventDefault(); e.stopPropagation(); onChange(""); } }} />
      <kbd aria-hidden="true">/</kbd>
    </label>
  );
};

const Hl: React.FC<{ text: string; find: string }> = ({ text, find }) => {
  const f = find.trim();
  const i = f ? text.toLowerCase().indexOf(f.toLowerCase()) : -1;
  if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<mark>{text.slice(i, i + f.length)}</mark>{text.slice(i + f.length)}</>;
};

type Far = "query" | "partial" | "full";
type NoteF = "note" | "form";
const FAR_GLYPH: Record<Far, QueryStatus> = { query: QueryStatus.QUERIED, partial: QueryStatus.PARTIAL_SENT, full: QueryStatus.FULL_SENT };
const FAR_SHORT: Record<Far, string> = { query: "The query", partial: "A partial", full: "The full" };

export const RspBanner: React.FC = () => (
  <div className="rsp5-banner" data-rsp5="banner">
    Rejection is part of querying. Every no below is one most published writers have had too.
    <small>Share your wall when you&rsquo;re ready. It may help a writer at the start of theirs.</small>
  </div>
);

export const Rsp5Wall: React.FC<{
  items: Item[];
  nowMs: number;
  msTitle: string | null;
  kind: NoKind | null;
  onKind: (k: NoKind | null) => void;
  selectedId: string | null;
  onOpen: (i: Item) => void;
  active: boolean;
  agentFacts: (i: Item) => AgentFacts;
  onVisible?: (ids: string[]) => void;
}> = ({ items, nowMs, msTitle, kind, onKind, selectedId, onOpen, active, agentFacts, onVisible }) => {
  const nos = items.filter((i) => i.group !== "more");
  const N = nos.length;
  const nPass = nos.filter((i) => i.group === "passed").length;
  const nNr = N - nPass;
  const nNote = nos.filter(hasNote).length;
  /* "since": the date of the first no (the reference's), not the first query */
  const since = nos.reduce<number | null>((m, i) => (i.answerMs != null && (m == null || i.answerMs < m) ? i.answerMs : m), null);

  const [find, setFind] = useState("");
  const [sort, setSort] = useState<NoSort>("date");
  const [desc, setDesc] = useState(true);
  const [far, setFar] = useState<Far | null>(null);
  const [noteF, setNoteF] = useState<NoteF | null>(null);
  const [menu, setMenu] = useState(false);
  const [full, setFull] = useState(false);
  const [sharing, setSharing] = useState(false);
  const list = listNos(items, { kind, find, sort, desc })
    .filter((i) => !far || i.furthest === far)
    .filter((i) => !noteF || (noteF === "note" ? hasNote(i) : !hasNote(i)));
  const visKey = list.map((i) => i.id).join("|");
  useEffect(() => { onVisible?.(list.map((i) => i.id)); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [visKey]);
  const nFilters = (far ? 1 : 0) + (noteF ? 1 : 0);

  const pressSort = (k: NoSort) => {
    if (sort === k) setDesc((d) => !d);
    else { setSort(k); setDesc(k !== "agent"); }
  };

  /* full screen: Escape leaves it (a field's own Escape clears the search first) */
  useEffect(() => {
    if (!full && !menu) return undefined;
    const key = (e: KeyboardEvent) => { if (e.key !== "Escape") return; if (menu) setMenu(false); else setFull(false); };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [full, menu]);

  /* ── the pin: a sentinel above the sheet, read on every scroll of the page's scroller (v2's) ── */
  const sheet = useRef<HTMLElement | null>(null);
  const sentinel = useRef<HTMLElement | null>(null);
  const pinwrap = useRef<HTMLDivElement | null>(null);
  const [pinned, setPinned] = useState(false);
  useLayoutEffect(() => {
    const el = sheet.current, sn = sentinel.current, pw = pinwrap.current;
    const sc = el?.closest<HTMLElement>(".wpg-scroll");
    if (!el || !sn || !pw || !sc) return undefined;
    let was = false;
    const measure = () => {
      const h = pw.offsetHeight;
      el.style.setProperty("--rs-stack", `${12 + h}px`);
      sc.style.setProperty("--wpg-scroll-pad", `${12 + h + 8}px`);
    };
    const read = () => {
      const top = sc.getBoundingClientRect().top;
      const next = nextPinned(was, sn.getBoundingClientRect().top - top, el.getBoundingClientRect().bottom - top);
      if (next !== was) { was = next; setPinned(next); }
    };
    measure();
    read();
    sc.addEventListener("scroll", read, { passive: true });
    window.addEventListener("resize", read);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(pw);
    return () => { sc.removeEventListener("scroll", read); window.removeEventListener("resize", read); ro?.disconnect(); sc.style.removeProperty("--wpg-scroll-pad"); };
  }, [N > 0]);

  const head = (k: NoSort | null, label: string) => {
    if (!k) return <span className="rsp5-hc">{label}</span>;
    const on = sort === k;
    return (
      <button type="button" className="rsp5-hc" data-rsp5="sort" data-sort={k} data-on={on ? "" : undefined}
        aria-sort={on ? (desc ? "descending" : "ascending") : "none"} onClick={() => pressSort(k)}>
        {label}{on ? <i aria-hidden="true">{desc ? " ↓" : " ↑"}</i> : null}
      </button>
    );
  };
  const row = (i: Item) => {
    const f = agentFacts(i);
    const took = i.waitDays;
    const said = f.weeks ? f.weeks * 7 : null;
    const scale = Math.max(took ?? 0, said ?? 0, 1) * 1.1;
    const note = hasNote(i);
    return (
      <button key={i.id} type="button" className="rsp5-lrow" data-rsp5="row" data-id={i.id} data-kind={i.group}
        data-ans={i.answerMs ?? undefined} data-q={i.queriedMs ?? undefined} data-wait={took ?? undefined}
        data-surname={i.row.agentName.trim().split(/\s+/).pop()?.toLowerCase()}
        aria-current={selectedId === i.id ? "true" : undefined} onClick={() => onOpen(i)}
        aria-label={`${i.row.agentName}, ${i.group === "passed" ? "passed" : "no reply"}${i.answerMs != null ? `, ${respDate(i.answerMs, nowMs)}` : ""}. Open.`}>
        <span className="rsp5-ag">
          <span className={`rsp5-face${i.group === "noReply" ? " is-nr" : ""}`} aria-hidden="true">{i.row.initials}</span>
          <span className="rsp5-agt"><b><Hl text={i.row.agentName} find={find} /></b><i><Hl text={i.row.agency} find={find} /></i></span>
        </span>
        <span className="rsp5-dt" data-col="queried">{i.queriedMs != null ? respDate(i.queriedMs, nowMs) : ""}</span>
        <span className="rsp5-dt" data-col="answered">{i.answerMs != null ? respDate(i.answerMs, nowMs) : ""}</span>
        <span className="rsp5-took" data-col="took">
          {took != null ? plural(took, "day", "days") : ""}
          <small>{f.weeks ? `they say ${plural(f.weeks, "week", "weeks")}` : "no time given"}</small>
          {took != null ? (
            <span className="rsp5-vs" aria-hidden="true"><i style={{ width: `${Math.min(100, (took / scale) * 100)}%` }} />{said ? <em style={{ left: `${(said / scale) * 100}%` }} /> : null}</span>
          ) : null}
        </span>
        <span className="rsp5-far" data-col="far"><StatusDot status={FAR_GLYPH[i.furthest]} overrideSize={15} decorative />{FAR_SHORT[i.furthest]}</span>
        <span className="rsp5-said" data-col="said">
          {i.group === "noReply"
            ? <><span className="rsp5-tag is-nr" data-rsp5="tag">No reply</span><em>{took != null ? `Closed after ${plural(Math.round(took / 7), "week", "weeks")}${f.nrmn ? ", as their guidelines say" : ""}` : "Closed after the wait"}</em></>
            : note
              ? <><span className="rsp5-tag is-note" data-rsp5="tag">Passed, with a note</span><q>{i.note}</q></>
              : <><span className="rsp5-tag" data-rsp5="tag">Passed</span><em>Form reply</em></>}
        </span>
      </button>
    );
  };

  if (!N) {
    return (
      <div className="rsp5-banner" data-rsp5="banner" data-rsp5-sec="wall">
        Rejection is part of querying.
        <small>When a no arrives it goes on your wall here, as a mark of how far you&rsquo;ve come.</small>
      </div>
    );
  }
  const sinceWords = since != null ? monthYear(since) : null;
  const segs: [NoKind | null, string, number][] = [[null, "All", N], ["passed", "Passed", nPass], ["noReply", "No reply", nNr]];
  return (
    <>
      <RspBanner />
      <section className="rsp5-sec rsp5-wall" data-rsp5="wall" data-rsp5-sec="wall" aria-labelledby="rsp5-wall-h">
        <div className="rsp5-h2row">
          <div className="rsp5-h2">
            <span className="rsp5-art rsp5-art--sm" aria-hidden="true">Art: the wall hawk</span>
            <div>
              <h2 id="rsp5-wall-h" className="rsp5-h2t">Your wall of no</h2>
              {sinceWords ? <p className="rsp5-sub" data-rsp5="wall-since">One mark for each no since {sinceWords}.</p> : null}
            </div>
          </div>
        </div>
        <Tally n={N} />
        <div className="rsp5-tcap" data-rsp5="tally-cap">{plural(nPass, "pass", "passes")}, {nNr} no reply<small>{nNote} came with a note</small></div>

        <i className="rsp5-sentinel" ref={sentinel as React.Ref<HTMLElement>} aria-hidden="true" data-rsp5="pin-sentinel" />
        <section className="rsp5-lsheet" ref={sheet} data-rsp5="list" aria-label="Every no" data-pinned={pinned ? "true" : undefined} data-full={full ? "" : undefined}>
          <div className="rsp5-pinwrap" ref={pinwrap} data-rsp5="pinwrap">
            <div className="rsp5-lbar" data-rsp5="list-bar">
              <SheetSearch value={find} onChange={setFind} active={active} />
              <div className="rsp5-lseg" role="group" aria-label="Show" data-rsp5="seg">
                {segs.map(([k, l, c]) => (
                  <button key={l} type="button" data-rsp5="seg-btn" data-k={k ?? "all"} aria-pressed={kind === k} onClick={() => onKind(k)}>{l}<small>{c}</small></button>
                ))}
              </div>
              <span className="rsp5-sp" />
              <span className="rsp5-fwrap">
                <button type="button" className="rsp5-wb" data-rsp5="filters" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
                  {"≡"} Filters{nFilters ? <small>{nFilters}</small> : null}
                </button>
                {menu ? (
                  <div className="rsp5-fmenu" role="dialog" aria-label="Filters" data-rsp5="filters-menu">
                    <b>Got as far as</b>
                    {([null, "query", "partial", "full"] as (Far | null)[]).map((v) => (
                      <button key={v ?? "any"} type="button" aria-pressed={far === v} onClick={() => setFar(v)}>{v ? FAR_WORDS[v] : "Any"}</button>
                    ))}
                    <b>What they said</b>
                    {([null, "note", "form"] as (NoteF | null)[]).map((v) => (
                      <button key={v ?? "any"} type="button" aria-pressed={noteF === v} onClick={() => setNoteF(v)}>{v === "note" ? "With a note" : v === "form" ? "No note" : "Any"}</button>
                    ))}
                  </div>
                ) : null}
              </span>
              <button type="button" className="rsp5-wb rsp5-wb--o" data-rsp5="full" aria-pressed={full} onClick={() => setFull((x) => !x)}>
                {full ? "Close full screen" : "⤢ Full screen"}
              </button>
            </div>
            <div className="rsp5-lhead rsp5-lgr" data-rsp5="heads">
              {head("agent", "AGENT")}{head("queried", "QUERIED")}{head("date", "ANSWERED")}{head("wait", "TOOK")}{head(null, "GOT AS FAR AS")}{head(null, "WHAT THEY SAID")}
            </div>
          </div>
          <div className="rsp5-lbody" data-rsp5="list-body">
            {list.length === 0 ? (
              <div className="rsp5-lempty" data-rsp5="no-match">No agents match {find.trim() ? `“${find.trim()}”` : "these filters"}.</div>
            ) : sort === "date" ? (
              monthGroups(list).map((g) => (
                <div key={g.key} className="rsp5-grp" data-rsp5="month">
                  <div className="rsp5-lgrp" data-rsp5="month-band">{g.label}<small>{plural(g.items.length, "NO", "NOS")}</small></div>
                  {g.items.map(row)}
                </div>
              ))
            ) : list.map(row)}
          </div>
        </section>

        <div className="rsp5-share" data-rsp5="share-card">
          <div>
            <h3>Share your wall of no</h3>
            <p>Make an image of your tally for social media: your marks, your book&rsquo;s name and how long you&rsquo;ve been querying.</p>
            <button type="button" className="rsp5-b1" data-rsp5="share-open" aria-expanded={sharing} onClick={() => setSharing((x) => !x)}>
              {sharing ? "Close the share image" : "Make a share image"}
            </button>
          </div>
          <div className="rsp5-simg" aria-hidden="true">
            <span className="rsp5-st1">{msTitle || "Your book"}</span>
            <span className="rsp5-sm"><Tally n={N} ghosts={false} /></span>
            <small>{plural(N, "no", "nos")}{sinceWords ? ` since ${sinceWords.split(" ")[0]}` : ""} · queryhawk.net</small>
          </div>
        </div>
        {sharing ? <div className="rsp5-sharebuilder" data-rsp5="share-builder"><RspShare nos={nos} title={msTitle} /></div> : null}
      </section>
    </>
  );
};
