/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v54, D4–D9 (design-refs/todo-list-v54/todo-batch-v3.html) — "FILL IN WHAT YOU SENT", A BATCH AT A TIME.
 *
 * The band (D4): housekeeping's pale blue, "Fill in what you sent", "{n} queries with nothing recorded", the view switch,
 * one segment per query and the "Now:" line. Then one of two views:
 *   - ONE AT A TIME (D5): "What went to {first}?", pre-filled from the agent's saved guidelines, then "Did the same go to
 *     anyone else?", where one press logs every ticked query.
 *   - ALL AT ONCE (D6): a row per query and a column per material, the sample cell opening the full picker under its row.
 *
 * ⚠️ EVERY WRITE IS THE ONE THE BATCH HAS ALWAYS MADE: `updateQuery(id, { materialsWanted })`, one per query, the value
 *    in `materialsToQuery`'s shape (lib/todoBatch54 `answerToMaterials`). Undo writes each query's value back as it was.
 * ⚠️ GUIDELINES ONLY PRE-FILL. A sample that differs from what the agent's guidelines ask for shows a navy note and is
 *    never changed (D8).
 * ⚠️ THE VIEW IS THE WRITER'S CHOICE ONCE THEY MAKE ONE (D9): `todoPrefs.batchView`, one leaf on the user doc (the map is
 *    unconstrained, so no rules change). With none, under 8 queries is one at a time and 8 or more is the table.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { deleteField } from "firebase/firestore";
import type { Agent, Query } from "../../../types";
import {
  BATCH_MATS, SAME_WHY_WORDS, andNames, answerFromAsks, answerToMaterials, answerWords, asksOf, copyToGaps,
  fillFromAsksAgain, hasAnswer, sameWhy, sampleMismatch, sentMsOf, type Asks, type BatchAnswer, type BatchMat, type BatchView,
} from "../../../lib/todoBatch54";
import { bookOf, sampleName } from "../../../lib/queryActions/sample";
import { openAgentCard } from "../../../lib/agentCardStore";
import { MON } from "../../../lib/queryActions/dates";
import { SentSamplePicker } from "../../materials/SentSamplePicker";
import { TICK } from "./WsControls";

const MENTOR = "/images/todo/mentor.webp";
const DOC = <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 3.5h5.5L14.5 6.5V16.5H6z" /><path d="M11.5 3.5v3h3" /></svg>;
const firstOf = (a: Agent | undefined): string => (a?.name ?? "").trim().split(/\s+/)[0] || (a?.agency ?? "").trim() || "the agent";
/** "3 Mar 2024" */
const dayOf = (ms: number | null): string => { if (ms == null) return "no date"; const d = new Date(ms); return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`; };

export interface BatchRow { id: string; q: Query | undefined; agent: Agent | undefined; first: string; name: string; agency: string; sentMs: number | null; asks: Asks | null }

export interface WsBatch54Props {
  /** the batch's queries, oldest first (the board's own order) */
  queue: readonly { queryId: string; agentId: string }[];
  queries: readonly Query[];
  agents: readonly Agent[];
  /** a word count for the picker's ceilings (the batch's book, where there is one) */
  wordCount: number | null;
  /** the view this batch opened in (the page decides: Quick fill, a saved choice, or the batch's size) */
  view: BatchView;
  onView: (v: BatchView) => void;
  updateQuery: (id: string, patch: Partial<Query>) => Promise<void>;
  flash: (msg: string, undo?: () => Promise<void>, sub?: string) => void;
  /** the query whose card the side shows */
  onFocus: (queryId: string | null) => void;
  /** the card column (the page's preview of `focus`) */
  card: React.ReactNode;
  /** Snooze and Dismiss, the page's own controls */
  footLeft: React.ReactNode;
}

export const WsBatch54: React.FC<WsBatch54Props> = ({ queue, queries, agents, wordCount, view, onView, updateQuery, flash, onFocus, card, footLeft }) => {
  /* the batch as opened: logged rows leave the board a moment after the write, so they are held here until then */
  const [logged, setLogged] = useState<ReadonlySet<string>>(() => new Set());
  const [opened] = useState<string[]>(() => queue.map((m) => m.queryId));
  const rows: BatchRow[] = useMemo(() => {
    const live = new Set(queue.map((m) => m.queryId));
    const ids = [...opened.filter((id) => live.has(id) || logged.has(id)), ...queue.map((m) => m.queryId).filter((id) => !opened.includes(id))];
    return ids.map((id) => {
      const q = queries.find((x) => x.id === id);
      const agentId = queue.find((m) => m.queryId === id)?.agentId ?? q?.agentId;
      const agent = agents.find((a) => a.id === agentId);
      return { id, q, agent, first: firstOf(agent), name: (agent?.name ?? "").trim() || (agent?.agency ?? "").trim() || "The agent", agency: (agent?.agency ?? "").trim(), sentMs: sentMsOf(q), asks: asksOf(agent) };
    });
  }, [queue, queries, agents, opened, logged]);
  const asksById = useMemo(() => Object.fromEntries(rows.map((r) => [r.id, r.asks])), [rows]);
  /* D5/D6: every row opens pre-filled from its agent's guidelines, where they're saved.
     ⚠️ ONLY WHAT THE WRITER HAS CHANGED IS HELD; AN UNTOUCHED ROW IS DERIVED FROM THE GUIDELINES AS THEY ARE NOW. The
        page's first render can come from Firestore's local cache, and an answer seeded once at mount kept the agent's
        OLD guidelines for the life of the batch (TD54 L7 caught it). */
  const [touched, setAns] = useState<Record<string, BatchAnswer>>({});
  const get = (id: string): BatchAnswer => touched[id] ?? answerFromAsks(asksById[id] ?? null);
  const put = (id: string, a: BatchAnswer) => setAns((x) => ({ ...x, [id]: a }));
  /** every pending row's answer, held or derived (for the table's two tools) */
  const answersNow = (): Record<string, BatchAnswer> => Object.fromEntries(rows.map((r) => [r.id, get(r.id)]));
  const book = useMemo(() => bookOf(wordCount), [wordCount]);
  const pending = rows.filter((r) => !logged.has(r.id));

  /* ── one at a time ── */
  const [skip, setSkip] = useState<ReadonlySet<string>>(() => new Set());
  const [step, setStep] = useState<0 | 1>(0);
  const [same, setSame] = useState<ReadonlySet<string>>(() => new Set());
  const [lastLogged, setLastLogged] = useState<string | null>(null);
  const cur = pending.find((r) => !skip.has(r.id)) ?? pending[0] ?? null;
  const others = cur ? pending.filter((r) => r.id !== cur.id) : [];

  /* ── all at once ── */
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [tmsg, setTmsg] = useState("");
  const [focusRow, setFocusRow] = useState<string | null>(null);

  const focus = view === "table" ? (openRow ?? focusRow ?? pending[0]?.id ?? null) : cur?.id ?? null;
  const focusRef = useRef<string | null>(null);
  useEffect(() => { if (focusRef.current !== focus) { focusRef.current = focus; onFocus(focus); } }, [focus, onFocus]);

  const total = rows.length;
  const filled = pending.filter((r) => hasAnswer(get(r.id))).length;

  /* ── the writes ── */
  const [busy, setBusy] = useState(false);
  const logMany = async (ids: string[], copyFrom: BatchAnswer | null) => {
    if (busy || !ids.length) return;
    setBusy(true);
    /* ⚠️ UNDO PUTS EACH QUERY BACK EXACTLY: a query with no `materialsWanted` gets the field removed, never `[]` */
    const before = new Map(ids.map((id) => [id, queries.find((q) => q.id === id)?.materialsWanted]));
    const done: string[] = [];
    try {
      for (const id of ids) {
        const a = copyFrom ?? get(id);
        await updateQuery(id, { materialsWanted: answerToMaterials(a) } as Partial<Query>);
        done.push(id);
      }
      if (copyFrom) setAns((x) => { const n = { ...x }; for (const id of ids) n[id] = { ...copyFrom, s: { ...copyFrom.s } }; return n; });
      setLogged((x) => new Set([...x, ...done]));
      setLastLogged(ids[0]);
      setStep(0); setSame(new Set()); setOpenRow(null); setTmsg("");
      const n = done.length;
      flash(`Logged for ${n} ${n === 1 ? "query" : "queries"}`, async () => {
        await Promise.all(done.map((id) => { const b = before.get(id); return updateQuery(id, { materialsWanted: b ?? deleteField() } as unknown as Partial<Query>); }));
        setLogged((x) => { const s = new Set(x); for (const id of done) s.delete(id); return s; });
      }, "what you sent is on each query");
    } catch (e) {
      console.error("[to-do] the batch save failed", e);
      flash(done.length ? `Logged ${done.length}, then a save failed. The rest weren’t changed.` : "Couldn’t save that. Nothing was changed.");
      if (done.length) setLogged((x) => new Set([...x, ...done]));
    } finally { setBusy(false); }
  };

  /* ── the band (D4) ── */
  const segs = rows.map((r) => {
    const st = view === "table" ? (logged.has(r.id) || hasAnswer(get(r.id)) ? "done" : "") : logged.has(r.id) ? "done" : cur && r.id === cur.id ? "cur" : "";
    return <span key={r.id} data-st={st || undefined} data-tws54-seg={r.id} />;
  });
  const band = (
    <div className="tws-wh tws54-band" data-band="batch" data-tws54="band">
      <div className="tws54-bt">
        <h2 data-tws="desk-title">Fill in what you sent</h2>
        <span className="tws-m" data-tws54="band-sub">{pending.length} {pending.length === 1 ? "query" : "queries"} with nothing recorded</span>
        <span className="tws-sp" />
        <div className="tws54-vsw" role="radiogroup" aria-label="How to fill them in" data-tws54="view-switch">
          <button type="button" role="radio" aria-checked={view === "one"} data-v="one" onClick={() => { if (view !== "one") { setOpenRow(null); onView("one"); } }}>One at a time</button>
          <button type="button" role="radio" aria-checked={view === "table"} data-v="table" onClick={() => { if (view !== "table") { setStep(0); onView("table"); } }}>All at once</button>
        </div>
      </div>
      <div className="tws54-prog" data-tws54="progress" aria-hidden="true">{segs}</div>
      <p className="tws54-now" data-tws54="now">
        {view === "table" ? <><b>{filled}</b> of {pending.length} filled in, ready to log</>
          : cur ? <>Now: <b>{cur.name}</b> · {cur.agency || "No agency"} · queried {dayOf(cur.sentMs)}</> : <>Nothing left to fill in.</>}
      </p>
    </div>
  );

  /* ── the tiles (D5) ── */
  const tiles = (r: BatchRow) => {
    const a = get(r.id);
    const on = (k: BatchMat) => (k === "ql" ? a.ql : k === "syn" ? a.syn : a.samp);
    return (
      <>
        <div className="tws-tiles" role="group" aria-label={`What went to ${r.first}`} data-desk="">
          {BATCH_MATS.map((m) => (
            <button key={m.k} type="button" className="tws-tile" data-tws-opt={m.k} aria-pressed={on(m.k)}
              onClick={() => put(r.id, { ...a, [m.k]: !on(m.k) } as BatchAnswer)}>
              <span className="tws-ti2" aria-hidden="true">{on(m.k) ? TICK : DOC}</span>
              <span className="tws-tn">{m.label}{m.k === "samp" && a.samp ? <small data-tws54="tile-note">{sampleName(a.s)}</small> : null}</span>
            </button>
          ))}
        </div>
        {a.samp ? <SentSamplePicker sample={a.s} book={book} idPrefix={`one-${r.id}`} onChange={(s) => put(r.id, { ...a, s })}
          mismatch={sampleMismatch(r.first, r.asks, a)} /> : null}
      </>
    );
  };

  /* ── one at a time: the body ── */
  let body: React.ReactNode = null;
  let foot: React.ReactNode = null;
  if (view === "one") {
    if (!cur) {
      body = <div className="tws-mnote" data-tws="hawk"><img src={MENTOR} alt="" /><p>Every query in this batch has a record of what went.</p></div>;
    } else if (step === 0) {
      const last = lastLogged ? rows.find((r) => r.id === lastLogged) : null;
      body = (
        <div data-tws54="step" data-step="what" data-tws54-cur={cur.id} data-tws54-agent={cur.agent?.id} data-tws54-sent={cur.sentMs ?? undefined}>
          {cur.asks ? (
            <>
              <div className="tws-mnote" data-tws="hawk"><img src={MENTOR} alt="" /><p>I’ve filled this in from what {cur.first} asks for. If that’s what went, carry on. If not, change it first.</p></div>
              <div className="tws54-asks" data-tws54="asks">From <b>{cur.agency || cur.name}’s</b> guidelines{cur.asks.asksSample && !cur.asks.sample ? ", which don’t say how much of a sample" : ""}</div>
            </>
          ) : (
            <>
              <div className="tws-mnote" data-tws="hawk"><img src={MENTOR} alt="" /><p>{cur.agency || cur.name}’s guidelines aren’t saved, so I can’t fill this in for you.</p></div>
              <div className="tws54-asks" data-noask="" data-tws54="no-asks">
                <span>No guidelines saved for <b>{cur.agency || cur.name}</b>.</span>
                {last ? <button type="button" data-tws54="start-from" onClick={() => { const src = get(last.id); put(cur.id, { ...src, s: { ...src.s } }); }}>Start from what went to {last.first}</button> : null}
                {cur.agent ? <button type="button" className="tws54-lnk" data-tws54="add-asks" onClick={() => openAgentCard(cur.agent!.id, { tab: "work", focus: "materials", from: "task" })}>Add their guidelines</button> : null}
              </div>
            </>
          )}
          <h3 className="tws-qh tws54-h3">What went to {cur.first}?</h3>
          <span className="tws54-hint">{cur.asks ? "Check it against what you actually sent." : "Tick everything that went with this query."}</span>
          <div className="tws54-q" data-tws54="tiles">{tiles(cur)}</div>
        </div>
      );
      foot = (
        <>
          {footLeft}
          {pending.length > 1 ? <button type="button" className="tws-lnk" data-tws="skip" onClick={() => setSkip((x) => { const rest = pending.filter((r) => r.id !== cur.id && !x.has(r.id)); return rest.length ? new Set([...x, cur.id]) : new Set(); })}>Skip this one</button> : null}
          <span className="tws-sp" />
          <em className="tws-prog" data-tws="progress">1 of 2</em>
          <button type="button" className="tws-go" data-tws="primary" data-next="" disabled={!hasAnswer(get(cur.id))}
            onClick={() => {
              const me = { sentMs: cur.sentMs, asks: cur.asks };
              setSame(new Set(others.filter((r) => sameWhy(me, { sentMs: r.sentMs, asks: r.asks })).map((r) => r.id)));
              setStep(1);
            }}>Next →</button>
        </>
      );
    } else {
      const a = get(cur.id);
      const me = { sentMs: cur.sentMs, asks: cur.asks };
      body = (
        <div data-tws54="step" data-step="same" data-tws54-cur={cur.id} data-tws54-agent={cur.agent?.id} data-tws54-sent={cur.sentMs ?? undefined}>
          <h3 className="tws-qh tws54-h3">Did the same go to anyone else?</h3>
          <span className="tws54-hint">{cur.first} got your {answerWords(a)}. Tick anyone who got exactly the same.</span>
          {others.length ? (
            <div className="tws54-same" data-tws54="same">
              <div className="tws54-sameh"><b>{others.length} more with nothing recorded</b><p>Ticked where it’s likely. Untick anyone it doesn’t fit.</p></div>
              {others.map((r) => {
                const why = sameWhy(me, { sentMs: r.sentMs, asks: r.asks });
                const on = same.has(r.id);
                const clash = sampleMismatch(r.first, r.asks, a);
                return (
                  <button key={r.id} type="button" className="tws54-sr" aria-pressed={on} data-tws54-same={r.id} data-tws54-agent={r.agent?.id} data-tws54-sent={r.sentMs ?? undefined} data-why={why ?? undefined}
                    onClick={() => setSame((x) => { const n = new Set(x); if (n.has(r.id)) n.delete(r.id); else n.add(r.id); return n; })}>
                    <span className="tws54-bx" aria-hidden="true">{on ? TICK : null}</span>
                    <span className="tws54-srt">{r.name} <i>· {r.agency || "No agency"} · {dayOf(r.sentMs)}</i>{clash ? <span className="tws54-mmi" data-tws54="mismatch">{clash}</span> : null}</span>
                    <em data-why={why ?? undefined}>{why ? SAME_WHY_WORDS[why] : ""}</em>
                  </button>
                );
              })}
              <div className="tws54-sel2">
                <button type="button" className="tws54-lnk" data-tws54="tick-all" onClick={() => setSame(new Set(others.map((r) => r.id)))}>Tick all</button>
                <button type="button" className="tws54-lnk" data-tws54="untick-all" onClick={() => setSame(new Set())}>Untick all</button>
              </div>
            </div>
          ) : <p className="tws54-none">Nobody else is left in this batch.</p>}
        </div>
      );
      const n = same.size + 1;
      foot = (
        <>
          <button type="button" className="tws-sb tws-back" data-tws="back" onClick={() => setStep(0)}>← Back</button>
          <span className="tws-sp" />
          <em className="tws-prog" data-tws="progress">2 of 2</em>
          <button type="button" className="tws-go" data-tws="primary" data-log="" disabled={busy}
            onClick={() => void logMany([cur.id, ...others.filter((r) => same.has(r.id)).map((r) => r.id)], a)}>Log it for {n} {n === 1 ? "query" : "queries"}</button>
        </>
      );
    }
  } else {
    /* ── all at once (D6) ── */
    /* first names, unless two share one (then the full names, so the line names two people) */
    const label = (r: BatchRow) => (pending.filter((x) => x.first === r.first).length > 1 ? r.name : r.first);
    const missing = pending.filter((r) => !r.asks).map(label);
    const msg = tmsg || (missing.length ? `Rows with guidelines are filled in from them. No guidelines saved for ${andNames(missing)}.` : "Every row is filled in from their guidelines.");
    body = (
      <div data-tws54="table-view">
        <div className="tws54-tools">
          <button type="button" data-tws54="fill-asks" onClick={() => {
            const ids = pending.map((r) => r.id);
            const f = fillFromAsksAgain(ids, asksById, answersNow());
            setAns(f.answers);
            const miss = f.missing.map((id) => label(rows.find((r) => r.id === id)!));
            setTmsg(miss.length ? `Filled ${f.filled}. No guidelines saved for ${andNames(miss)}, so ${miss.length === 1 ? "that row is" : "those rows are"} left as they were.` : "Filled every row from their guidelines.");
          }}>Fill from their asks again</button>
          <button type="button" data-tws54="copy-gaps" onClick={() => {
            const ids = pending.map((r) => r.id);
            const c = copyToGaps(ids, answersNow());
            setAns(c.answers);
            const f0 = rows.find((r) => r.id === ids[0]);
            setTmsg(hasAnswer(get(ids[0])) ? `Copied ${f0?.first ?? "the first"}’s row to ${c.filled} empty ${c.filled === 1 ? "row" : "rows"}.` : "The first row is empty, so there’s nothing to copy.");
          }}>Copy the first row to the gaps</button>
          <span className="tws54-tmsg" data-tws54="table-msg">{msg}</span>
        </div>
        <table className="tws54-tbl" data-tws54="table">
          <thead>
            <tr><th scope="col">Query</th>{BATCH_MATS.map((m) => <th key={m.k} scope="col" className={m.k === "samp" ? "sc" : "c"}>{m.k === "samp" ? "Sample" : m.label}</th>)}</tr>
          </thead>
          <tbody>
            {pending.map((r) => {
              const a = get(r.id);
              const clash = sampleMismatch(r.first, r.asks, a);
              const isOpen = openRow === r.id;
              return (
                <React.Fragment key={r.id}>
                  <tr data-tws54-row={r.id} data-tws54-agent={r.agent?.id} data-tws54-sent={r.sentMs ?? undefined} data-open={isOpen ? "" : undefined} onFocusCapture={() => setFocusRow(r.id)} onPointerDown={() => setFocusRow(r.id)}>
                    <td>{r.name}<i>{r.agency || "No agency"} · {dayOf(r.sentMs)}{r.asks ? null : <> · <span className="tws54-na">no guidelines saved</span></>}</i>
                      {clash ? <span className="tws54-mmi" data-tws54="mismatch">{clash}</span> : null}</td>
                    {BATCH_MATS.map((m) => m.k === "samp" ? (
                      <td key={m.k} className="sc">
                        <button type="button" className="tws54-scell" data-on={a.samp ? "" : undefined} data-tws54="sample-cell" aria-expanded={isOpen}
                          onClick={() => { if (isOpen) { setOpenRow(null); return; } setOpenRow(r.id); if (!a.samp) put(r.id, { ...a, samp: true }); }}>
                          {a.samp ? sampleName(a.s) : "None"}<span aria-hidden="true">▾</span>
                        </button>
                      </td>
                    ) : (
                      <td key={m.k} className="c">
                        <button type="button" className="tws54-tk" aria-pressed={m.k === "ql" ? a.ql : a.syn} aria-label={`${m.label} went to ${r.first}`} data-tws54-tick={m.k}
                          onClick={() => put(r.id, { ...a, [m.k]: !(m.k === "ql" ? a.ql : a.syn) } as BatchAnswer)}>{(m.k === "ql" ? a.ql : a.syn) ? TICK : null}</button>
                      </td>
                    ))}
                  </tr>
                  {isOpen ? (
                    <tr className="tws54-exp" data-tws54="sample-panel">
                      <td colSpan={BATCH_MATS.length + 1}>
                        <div className="tws54-exph">
                          <label><input type="checkbox" checked={a.samp} onChange={() => put(r.id, { ...a, samp: !a.samp })} /> An opening sample went to {r.first}</label>
                          <button type="button" className="tws54-lnk" data-tws54="sample-done" onClick={() => setOpenRow(null)}>Done</button>
                        </div>
                        {a.samp ? <SentSamplePicker sample={a.s} book={book} idPrefix={`tbl-${r.id}`} onChange={(s) => put(r.id, { ...a, s })} /> : null}
                      </td>
                    </tr>
                  ) : null}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    );
    foot = (
      <>
        {footLeft}
        <span className="tws-sp" />
        <em className="tws-prog" data-tws="progress">{filled} of {pending.length} filled in</em>
        <button type="button" className="tws-go" data-tws="primary" data-log="" disabled={!filled || busy}
          onClick={() => void logMany(pending.filter((r) => hasAnswer(get(r.id))).map((r) => r.id), null)}>Log {filled} {filled === 1 ? "query" : "queries"}</button>
      </>
    );
  }

  const fa = focus ? get(focus) : null;
  return (
    <>
      {band}
      <div className="tws-wbody">
        <div className="tws-wcol" data-tws="qcol">
          <div className="tws-wq" data-tws="questions" data-tws54-view={view}>{body}</div>
          <div className="tws-wf" data-tws="footer">{foot}</div>
        </div>
        <div className="tws-wp" data-tws="side">
          {card}
          {fa && hasAnswer(fa) ? <p className="tws54-clipline" data-tws54="clip-line">📎 {answerWords(fa)}</p> : null}
        </div>
      </div>
    </>
  );
};
