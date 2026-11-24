/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Responses v6 Phases 5–6 (ref `band` + `showcase`, `timing`, `wall`) — WHAT YOUR ANSWERS TELL YOU, HOW LONG AGENTS TOOK
 * and THE WALL.
 *
 * ⚠️ THE TWO CARDS ARE THE DASHBOARD v2 CARD CONSTRUCTION (white rim, hairline frame, tinted head band), restated: `Frame`
 *    is scoped to `.d58.d2`. A navy band for the insights, oat for the timing. A LIFT CANDIDATE with Rsp6Head's cards.
 * ⚠️ THE WALL KEEPS v5's DERIVATIONS (`listNos`, `monthGroups`, the tally, `RspShare` unchanged). What changed is its
 *    dress: the Query Centre's segmented tabs above a "Showing x of n nos" row, and each month its own rounded sheet whose
 *    band (the Query Centre's Closed grey, `HEAD_FILL.faded`) holds the month, its count and the column headings,
 *    sticky within its sheet. The v5 navy bar, its pin and the flat sheet are gone (D7).
 */
import React, { useEffect, useRef, useState } from "react";
import { QueryStatus } from "../../types";
import { StatusDot } from "../StatusDot";
import {
  FAR_WORDS, hasNote, listNos, monthGroups, monthYear, pctOf, plural, respDate, speedByKind, typicalWait,
  type NoKind, type NoSort, type PageCounts, type RespItem,
} from "../../lib/responses";
import type { QcRow } from "../../lib/qcSummary";
import { HEAD_FILL } from "../../lib/qc1512";
import { SHORTCUTS, isEditableTarget, matchesShortcut } from "../../lib/shortcuts";
import { gatePaths, RspBanner, Tally, type AgentFacts } from "./RspNos";
import { Rsp5Showcase, type InsightGo } from "./Rsp5Insights";
import { RspShare } from "./RspShare";

type Item = RespItem<QcRow>;

/* ══ 5 · the insights card ══ */
export function insightTiles(c: PageCounts, items: readonly Item[]): { quick: string; more: string; wait: string } {
  const q = speedByKind(items).quickest;
  const w = typicalWait(items);
  const m = pctOf(c.more, c.sent);
  return { quick: q ? plural(q.first.days, "day", "days") : "–", more: m == null ? "–" : `${m}%`, wait: w == null ? "–" : plural(w, "day", "days") };
}

export const Rsp6Insights: React.FC<{ counts: PageCounts; items: readonly Item[]; few: boolean; nowMs: number; onGo: (to: InsightGo) => void }> = ({ counts: c, items, few, nowMs, onGo }) => {
  const t = insightTiles(c, items);
  return (
    <section className="rsp5-sec rsp6-card rsp6-card--navy" data-rsp6="insights" data-rsp5-sec="insights" aria-labelledby="rsp6-ins-h">
      <div className="rsp6-cin">
        <div className="rsp6-cbh">
          <h2 id="rsp6-ins-h">What your answers tell you</h2>
          <span className="rsp6-chip" data-rsp6="replied-chip">{c.replies} of {c.sent} replied</span>
        </div>
        <div className="rsp6-cbb">
          <p className="rsp6-lead">{few
            ? "These fill in as answers arrive. Each one shows what it will tell you, and how many answers it needs first."
            : "Patterns across every answer so far: when they come, how quickly requests arrive, and how far the passes read."}</p>
          <div className="rsp6-tiles">
            <div className="rsp6-tile" data-rsp6="tile" data-k="quick"><b>{t.quick}</b><span>to your quickest request</span></div>
            <div className="rsp6-tile" data-rsp6="tile" data-k="more"><b>{t.more}</b><span>asked to read more</span></div>
            <div className="rsp6-tile" data-rsp6="tile" data-k="wait"><b>{t.wait}</b><span>is your typical wait for a reply</span></div>
          </div>
          <div className="rsp6-showwrap">
            <Rsp5Showcase items={items} answered={c.answered} few={few} nowMs={nowMs} onGo={onGo} />
          </div>
        </div>
      </div>
    </section>
  );
};

/* ══ 6 · the wall ══ */
type Far = "query" | "partial" | "full";
type NoteF = "note" | "form";
const FAR_GLYPH: Record<Far, QueryStatus> = { query: QueryStatus.QUERIED, partial: QueryStatus.PARTIAL_SENT, full: QueryStatus.FULL_SENT };
const FAR_SHORT: Record<Far, string> = { query: "The query", partial: "A partial", full: "The full" };
const SEARCH = <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.6" /><path d="M10.5 10.5L14 14" /></svg>;
const FILTER = <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 4.5h11M4.5 8h7M6.5 11.5h3" /></svg>;
const FULL = <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M9.5 2.5h4v4M6.5 13.5h-4v-4M13.5 2.5L9 7M2.5 13.5L7 9" /></svg>;

const Hl: React.FC<{ text: string; find: string }> = ({ text, find }) => {
  const f = find.trim();
  const i = f ? text.toLowerCase().indexOf(f.toLowerCase()) : -1;
  if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<mark>{text.slice(i, i + f.length)}</mark>{text.slice(i + f.length)}</>;
};

const MiniGate: React.FC<{ n: number; seed: number }> = ({ n, seed }) => {
  const p = gatePaths(n, false, seed);
  return (
    <svg viewBox="-2 0 46 44" aria-hidden="true">
      <g fill="none" stroke="#f4eee5" strokeWidth={2.4} strokeLinecap="round" opacity={0.86}>{p.ink.map((d) => <path key={d} d={d} />)}</g>
    </svg>
  );
};

export const Rsp6Wall: React.FC<{
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
  const since = nos.reduce<number | null>((m, i) => (i.answerMs != null && (m == null || i.answerMs < m) ? i.answerMs : m), null);

  const [find, setFind] = useState("");
  const [sort, setSort] = useState<NoSort>("date");
  const [desc, setDesc] = useState(true);
  const [far, setFar] = useState<Far | null>(null);
  const [noteF, setNoteF] = useState<NoteF | null>(null);
  const [menu, setMenu] = useState(false);
  const [full, setFull] = useState(false);
  const [sharing, setSharing] = useState(false);
  const findRef = useRef<HTMLInputElement | null>(null);
  const list = listNos(items, { kind, find, sort, desc })
    .filter((i) => !far || i.furthest === far)
    .filter((i) => !noteF || (noteF === "note" ? hasNote(i) : !hasNote(i)));
  const visKey = list.map((i) => i.id).join("|");
  useEffect(() => { onVisible?.(list.map((i) => i.id)); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [visKey]);
  const nFilters = (far ? 1 : 0) + (noteF ? 1 : 0);
  const pressSort = (k: NoSort) => { if (sort === k) setDesc((d) => !d); else { setSort(k); setDesc(k !== "agent"); } };

  /* `/` focuses Find an agent (the registry's `respFind`), as v5's in-sheet search did */
  useEffect(() => {
    if (!active) return undefined;
    const key = (e: KeyboardEvent) => {
      if (!matchesShortcut(SHORTCUTS.respFind, e) || isEditableTarget(e.target)) return;
      if (!findRef.current || findRef.current.getClientRects().length === 0) return;
      e.preventDefault();
      findRef.current.focus();
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [active]);
  useEffect(() => {
    if (!full && !menu) return undefined;
    const key = (e: KeyboardEvent) => { if (e.key !== "Escape") return; if (menu) setMenu(false); else setFull(false); };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [full, menu]);

  if (!N) {
    return (
      <div className="rsp5-banner rsp6-banner" data-rsp5="banner" data-rsp5-sec="wall">
        Rejection is part of querying.
        <small>When a no arrives it goes on your wall here, as a mark of how far you&rsquo;ve come.</small>
      </div>
    );
  }

  const sortH = (k: NoSort, label: string) => {
    const on = sort === k;
    return (
      <button type="button" data-rsp6="sort" data-sort={k} data-on={on ? "" : undefined} aria-sort={on ? (desc ? "descending" : "ascending") : "none"} onClick={() => pressSort(k)}>
        {label}<span className="rsp6-ar" aria-hidden="true">{on ? (desc ? "↓" : "↑") : "↕"}</span>
      </button>
    );
  };
  const head = (title: React.ReactNode, n: number | null) => (
    <div className="rsp6-lhead" data-rsp6="group-head" style={{ background: HEAD_FILL.faded }}>
      <span className="rsp6-gt">{title}{n != null ? <small>{n}</small> : null}</span>
      <span>{sortH("queried", "Queried")}</span><span>{sortH("date", "Answered")}</span><span>{sortH("wait", "Took")}</span>
      <span>Got as far as</span><span>What they said</span>
    </div>
  );
  const row = (i: Item) => {
    const f = agentFacts(i);
    const took = i.waitDays;
    const said = f.weeks ? f.weeks * 7 : null;
    const scale = Math.max(took ?? 0, said ?? 0, 1) * 1.1;
    const note = hasNote(i);
    return (
      <button key={i.id} type="button" className="rsp6-lrow" data-rsp6="row" data-id={i.id} data-kind={i.group}
        aria-current={selectedId === i.id ? "true" : undefined} onClick={() => onOpen(i)}
        aria-label={`${i.row.agentName}, ${i.group === "passed" ? "passed" : "no reply"}${i.answerMs != null ? `, ${respDate(i.answerMs, nowMs)}` : ""}. Open.`}>
        <span className="rsp6-ag">
          <span className="rsp6-face" aria-hidden="true">{i.row.initials}</span>
          <span className="rsp6-agt"><b><Hl text={i.row.agentName} find={find} /></b><i><Hl text={i.row.agency} find={find} /></i></span>
        </span>
        <span className="rsp6-dt">{i.queriedMs != null ? respDate(i.queriedMs, nowMs) : ""}</span>
        <span className="rsp6-dt">{i.answerMs != null ? respDate(i.answerMs, nowMs) : ""}</span>
        <span className="rsp6-took">
          {took != null ? plural(took, "day", "days") : ""}
          <small>{f.weeks ? `they say ${plural(f.weeks, "week", "weeks")}` : "no time given"}</small>
          {took != null ? <span className="rsp6-vs" aria-hidden="true"><i style={{ width: `${Math.min(100, (took / scale) * 100)}%` }} />{said ? <em style={{ left: `${(said / scale) * 100}%` }} /> : null}</span> : null}
        </span>
        <span className="rsp6-far"><StatusDot status={FAR_GLYPH[i.furthest]} overrideSize={15} decorative />{FAR_SHORT[i.furthest]}</span>
        <span className="rsp6-said">
          {i.group === "noReply"
            ? <><span className="rsp6-tag" data-rsp6="tag"><i><StatusDot status={QueryStatus.NO_RESPONSE} overrideSize={12} decorative /></i>No reply</span><em>{took != null ? `Closed after ${plural(Math.round(took / 7), "week", "weeks")}${f.nrmn ? ", as their guidelines say" : ""}` : "Closed after the wait"}</em></>
            : note
              ? <><span className="rsp6-tag" data-rsp6="tag"><i>{"“"}</i>Passed, with a note</span><q>{i.note}</q></>
              : <><span className="rsp6-tag" data-rsp6="tag"><i><StatusDot status={QueryStatus.REJECTED} overrideSize={12} decorative /></i>Passed</span><em>Form reply</em></>}
        </span>
      </button>
    );
  };
  const tabs: [NoKind | null, string, number][] = [[null, "All", N], ["passed", "Passed", nPass], ["noReply", "No reply", nNr]];
  const gatesForMini = (() => { const g: number[] = []; for (let r = N; r > 0 && g.length < 3; r -= 5) g.push(Math.min(5, r)); return g; })();
  return (
    <>
      <RspBanner />
      <section className="rsp5-sec rsp6-wall" data-rsp6="wall" data-rsp5-sec="wall" data-full={full ? "" : undefined} aria-labelledby="rsp6-wall-h">
        <div className="rsp5-h2row">
          <div className="rsp5-h2">
            <div>
              <h2 id="rsp6-wall-h" className="rsp5-h2t">Your wall of no</h2>
              {since != null ? <p className="rsp5-sub">One mark for each no since {monthYear(since)}.</p> : null}
            </div>
          </div>
        </div>
        <Tally n={N} />
        <div className="rsp5-tcap" data-rsp5="tally-cap">{plural(nPass, "pass", "passes")}, {nNr} no reply<small>{nNote} came with a note</small></div>

        <div className="rsp6-trow">
          <div className="rsp6-ttabs" role="group" aria-label="Show" data-rsp6="tabs">
            {tabs.map(([k, l, c]) => (
              <button key={l} type="button" className="rsp6-tt" data-rsp6="tab" data-k={k ?? "all"} data-n={c} aria-pressed={kind === k} onClick={() => onKind(k)}>{l} <b>{c}</b></button>
            ))}
          </div>
        </div>
        <div className="rsp6-flt" data-rsp6="showing-row">
          <span className="rsp6-shw" data-rsp6="showing">Showing <b>{list.length}</b> of <b>{N}</b> nos</span>
          <span className="rsp6-sp" />
          <label className="rsp6-fnd" data-rsp6="search">{SEARCH}
            <input ref={findRef} value={find} placeholder="Find an agent" aria-label="Find an agent or agency" autoComplete="off"
              onChange={(e) => setFind(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape" && find) { e.preventDefault(); e.stopPropagation(); setFind(""); } }} />
          </label>
          <span className="rsp6-fwrap">
            <button type="button" className="rsp6-cb" data-rsp6="filters" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>{FILTER}Filters{nFilters ? <small>{nFilters}</small> : null}</button>
            {menu ? (
              <div className="rsp6-fmenu" role="dialog" aria-label="Filters" data-rsp6="filters-menu">
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
          <button type="button" className="rsp6-cb" data-rsp6="full" aria-pressed={full} onClick={() => setFull((x) => !x)}>{FULL}{full ? "Close full screen" : "Full screen"}</button>
        </div>
        <div className="rsp6-sheets" data-rsp6="sheets">
          {list.length === 0 ? (
            <div className="rsp6-lempty" data-rsp6="no-match">No agents match {find.trim() ? `“${find.trim()}”` : "these filters"}.</div>
          ) : sort === "date" ? (
            monthGroups(list).map((g) => (
              <div key={g.key} className="rsp6-gsh" data-rsp6="month" data-n={g.items.length}>{head(g.label, g.items.length)}{g.items.map(row)}</div>
            ))
          ) : (
            <div className="rsp6-gsh" data-rsp6="month" data-n={list.length}>{head(plural(list.length, "no", "nos"), null)}{list.map(row)}</div>
          )}
        </div>

        <section className="rsp6-endF" data-rsp6="end-card">
          <span className="rsp6-mini" aria-hidden="true">
            <span>{msTitle || "Your book"}</span>
            <span className="rsp6-mini-m">{gatesForMini.map((n, k) => <MiniGate key={k} n={n} seed={N * 31 + k} />)}</span>
          </span>
          <div>
            <h2>That&rsquo;s all {N}.</h2>
            <p>Make an image of your tally to share: your marks, your book&rsquo;s name and how long you&rsquo;ve been querying.</p>
          </div>
          <button type="button" className="rsp6-btn2" data-rsp5="share-open" aria-expanded={sharing} onClick={() => setSharing((x) => !x)}>
            {sharing ? "Close the share image" : "Make a share image"}
          </button>
        </section>
        {sharing ? <div className="rsp5-sharebuilder" data-rsp5="share-builder"><RspShare nos={nos} title={msTitle} /></div> : null}
      </section>
    </>
  );
};
