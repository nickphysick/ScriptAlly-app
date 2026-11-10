/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v152.2 §3–§7 (design-refs/query-centre-v152-2/card-journeys.html, screens 10–76) — THE COMPOSER: every
 * footer action opens it at the foot of the card, like replying in a messaging app. The thread stays in view above it,
 * and what you're adding shows there as a dashed draft (`onDraft`). One tap saves (`onSave`); there is no "See what
 * changes" step for any journey.
 *
 * ⚠️ QUERYHAWK NEVER WRITES FOR THE WRITER: no email text, subject, template or suggested wording anywhere here. A
 *    `mailto:` carries the address only. Every textarea starts empty.
 * ⚠️ THE COMPOSER WRITES NOTHING ITSELF. It hands a payload to the page, which plans and commits it (lib/qc1522Write).
 * ⚠️ ESCAPE AND ✕ GO UP ONE LEVEL: an open popover first, then — with anything entered — the discard strip; with nothing
 *    entered, back to the card. "← Back" and Cancel follow the same rule.
 */
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { QueryStatus } from "../../../types";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { matLabel as matLabelOf, type StepMaterial } from "../../../lib/qc152Write";
import { MONTHS_SHORT } from "../../../lib/dates";
import type { ThreadStepIn } from "../../../lib/qcThread152";
import { CalendarField, MatChips, PopCtx, type MatEnv } from "./QcEdit152";
import { StepGlyph } from "./QcBubble152";
import "./qcv1522card.css";

const DAY = 86_400_000;
const sod = (ms: number) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
const dm = (ms: number) => { const d = new Date(ms); return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`; };
const dmy = (ms: number) => { const d = new Date(ms); return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`; };

export type Journey = "send" | "nudge" | "reply" | "close" | "reopen" | "unpass" | "offer" | "tell" | "accept" | "decline";
export type ReplyType = "req" | "passed" | "rr" | "offer" | "more";
export type Deadline = "none" | "2w" | "date";
export interface TellRow { id: string; name: string; initials: string; stage: string; group: "pages" | "query"; email: string; told: boolean }
export interface ComposerCtx {
  first: string;
  fullName: string;
  nowMs: number;
  /** the agent's email; "" when there is none */
  email: string;
  /** the latest dated step: no new step can go before it */
  floorMs: number | null;
  env: MatEnv;
  /** Pro or founding: versions and packages */
  pro: boolean;
  /* send */
  sendKind: "partial_sent" | "full_sent" | "resubmitted";
  sendMats: StepMaterial[];
  /* nudge */
  queriedVia: "Email" | "QueryManager" | "Other";
  /* close */
  nudgedMs: number | null;
  /* reply: only the query has gone (so the request is for the partial) */
  queryOnly: boolean;
  /** the request's own reminder, when no deadline is given: the existing send-by default, in days */
  remindDays: number;
  /* reopen */
  passMs: number | null;
  passedAfter: string;
  restartToMs: number;
  /* offer */
  offerFromMs: number | null;
  offerByMs: number | null;
  others: TellRow[];
  /** the other open queries accepting closes, and how many of them hold pages */
  openOthers: number;
  withPages: number;
  /* the query step's package (the step editor's Package row reads it, from the page) */
  packages: { id: string; name: string }[] | null;
  packageId: string | null;
}
export type ComposerSave =
  | { j: "send"; dayMs: number; mats: StepMaterial[] }
  | { j: "nudge"; dayMs: number; via: string }
  | { j: "close"; dayMs: number; as: "noresp" | "withdrawn" }
  | { j: "reply"; dayMs: number; rt: ReplyType; deadline: Deadline; deadlineMs: number | null; formNo: boolean; openToMore: boolean; wall: boolean; resubmitByMs: number | null; answerByMs: number | null; what: string; words: string }
  | { j: "unpass" }
  | { j: "tell"; told: Record<string, boolean>; later: boolean }
  | { j: "accept"; closeOthers: boolean; todo: boolean }
  | { j: "decline"; note: string };

export interface QcComposerProps {
  journey: Journey;
  ctx: ComposerCtx;
  /** the reply type to start on (Reopen's "got back in touch" opens on Revise & resubmit) */
  replyStart?: ReplyType | null;
  onDraft: (d: ThreadStepIn | null) => void;
  onSave: (p: ComposerSave) => Promise<boolean>;
  onClose: () => void;
  busy: boolean;
  /** the nudge with no address on file: open the Agent tab's contact field */
  onAddEmail: () => void;
  /** the offer summary's Edit: the offer bubble, edited in place (§2.4) */
  onEditOffer: () => void;
}

const ARW = <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" /></svg>;
const BULB = <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#7d6a4f" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="M7.5 14.5h5M8.3 17h3.4M10 3a5 5 0 0 0-3 9c.6.5 1 1.2 1 2h4c0-.8.4-1.5 1-2a5 5 0 0 0-3-9z" /></svg>;
const CLOCK = <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true"><circle cx="8" cy="8" r="6" /><path d="M8 4.6V8l2.3 1.4" /></svg>;
const PEN = <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.5 3.5l2 2L6 12H4v-2z" /></svg>;

/** the reply chips, in order; the first is the partial's request when only the query has gone */
const REPLIES: { k: ReplyType; label: (queryOnly: boolean) => string; status: QueryStatus }[] = [
  { k: "req", label: (q) => (q ? "Asked for the partial" : "Asked for the full"), status: QueryStatus.FULL_REQUESTED },
  { k: "passed", label: () => "Passed", status: QueryStatus.REJECTED },
  { k: "rr", label: () => "Revise & resubmit", status: QueryStatus.REVISE_RESUBMIT },
  { k: "offer", label: () => "Made an offer", status: QueryStatus.OFFER },
  { k: "more", label: () => "Something else", status: QueryStatus.PARTIAL_REQUESTED },
];

/** §3.1 the date pills: Today, Yesterday, Another date (the app's calendar; no future day) */
const When: React.FC<{ id: string; v: number; nowMs: number; floorMs: number | null; onPick: (ms: number) => void; future?: boolean }> = ({ id, v, nowMs, floorMs, onPick, future }) => {
  const today = sod(nowMs), yest = today - DAY;
  const other = sod(v) !== today && sod(v) !== yest;
  const blocked = (ms: number) => {
    if (!future && ms > today) return "In the future";
    if (floorMs != null && ms < sod(floorMs)) return `Before the latest step (${dm(floorMs)})`;
    return "";
  };
  const can = (ms: number) => !blocked(ms);
  return (
    <div className="qc1522-seg" data-qc1522="when">
      {!future ? <>
        <button type="button" className={sod(v) === today ? "on" : ""} disabled={!can(today)} data-v="today" onClick={() => onPick(today)}>Today</button>
        <button type="button" className={sod(v) === yest ? "on" : ""} disabled={!can(yest)} data-v="yesterday" onClick={() => onPick(yest)}>Yesterday</button>
      </> : null}
      <span className={`qc1522-dp${other || future ? " on" : ""}`} data-qc1522="another-date">
        <CalendarField id={id} valueMs={v} nowMs={nowMs} future={future} blocked={blocked} onChange={(ms) => onPick(sod(ms))}
          label={other || future ? dmy(v) : "Another date"} />
      </span>
    </div>
  );
};

const Seg: React.FC<{ opts: readonly (readonly [string, string])[]; v: string; on: (k: string) => void; data: string }> = ({ opts, v, on, data }) => (
  <div className="qc1522-seg" data-qc1522={data}>
    {opts.map(([k, l]) => <button key={k} type="button" className={v === k ? "on" : ""} data-v={k} onClick={() => on(k)}>{l}</button>)}
  </div>
);

export const QcComposer1522: React.FC<QcComposerProps> = ({ journey: j0, ctx, replyStart, onDraft, onSave, onClose, busy, onAddEmail, onEditOffer }) => {
  const c = ctx;
  const f = c.first;
  const today = sod(c.nowMs);
  const pop = useContext(PopCtx);
  const [j, setJ] = useState<Journey>(j0);
  const [dirty, setDirty] = useState(false);
  const [conf, setConf] = useState(false);
  const touch = () => setDirty(true);
  /* the fields, one set for whichever journey is open */
  const [day, setDay] = useState(today);
  const [mats, setMats] = useState<StepMaterial[]>(c.sendMats);
  const [via, setVia] = useState<string>(c.queriedVia);
  const [closeAs, setCloseAs] = useState<"noresp" | "withdrawn">("noresp");
  const [rt, setRt] = useState<ReplyType | null>(replyStart ?? null);
  const [dl, setDl] = useState<Deadline>("none");
  const [dlMs, setDlMs] = useState(today + 14 * DAY);
  const [formNo, setFormNo] = useState(true);
  const [openMore, setOpenMore] = useState(false);
  const [wall, setWall] = useState(true);
  const [rbMs, setRbMs] = useState<number | null>(null);
  const [abMs, setAbMs] = useState(today + 14 * DAY);
  const [what, setWhat] = useState("");
  const [words, setWords] = useState("");
  const [told, setTold] = useState<Record<string, boolean>>(() => Object.fromEntries(c.others.map((o) => [o.id, o.told])));
  const [closeOthers, setCloseOthers] = useState(true);
  const [todo, setTodo] = useState(true);
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const go = (n: Journey) => { setJ(n); setDirty(false); setConf(false); pop.setOpen(null); };
  const back: Journey | null = j === "unpass" ? "reopen" : j === "tell" || j === "accept" || j === "decline" ? "offer" : j === "reply" && j0 === "reopen" ? "reopen" : j === "nudge" && j0 === "close" ? "close" : null;
  const up = (to: () => void) => { if (dirty) { setConf(true); return; } to(); };
  const exit = () => up(onClose);
  useEscapeLayer(true, () => {
    if (pop.open) { pop.setOpen(null); return; }
    if (conf) { setConf(false); return; }
    exit();
  }, ESC_LEVEL.pageModal);

  /* §3.1 the draft: what you're about to add, as a dashed bubble at the end of the thread */
  const draft: ThreadStepIn | null = useMemo(() => {
    const base = { key: "__draft", ms: day, chips: [] as { label: string; detail: string }[] };
    const chips = (ms: StepMaterial[]) => ms.map((m) => ({ label: labelOf(m), detail: labelOf(m) }));
    switch (j) {
      case "send": return { ...base, status: c.sendKind === "partial_sent" ? QueryStatus.PARTIAL_SENT : c.sendKind === "resubmitted" ? QueryStatus.RESUBMITTED : QueryStatus.FULL_SENT, kind: null, chips: chips(mats) };
      case "nudge": return { ...base, status: null, kind: "nudge", via: `by ${via === "QueryManager" ? "QueryManager" : via.toLowerCase()}` };
      case "close": return { ...base, status: closeAs === "withdrawn" ? QueryStatus.WITHDRAWN : QueryStatus.NO_RESPONSE, kind: null };
      case "reply": {
        if (!rt) return null;
        const status = rt === "req" ? (c.queryOnly ? QueryStatus.PARTIAL_REQUESTED : QueryStatus.FULL_REQUESTED) : rt === "passed" ? QueryStatus.REJECTED
          : rt === "rr" ? QueryStatus.REVISE_RESUBMIT : rt === "offer" ? QueryStatus.OFFER : QueryStatus.PARTIAL_REQUESTED;
        const sub = rt === "req" ? (dl === "2w" ? `Send by ${dm(day + 14 * DAY)}` : dl === "date" ? `Send by ${dm(dlMs)}` : null)
          : rt === "rr" ? (rbMs != null ? `Resubmit by ${dm(rbMs)}` : null)
          : rt === "offer" ? `Answer by ${dm(abMs)}`
          : rt === "passed" ? `${formNo ? "Form" : "Personal"} rejection${openMore ? " · open to more work" : ""}` : null;
        return { ...base, status, kind: null, quote: words.trim() || null, sub, askedFor: rt === "more" ? (what.trim() || null) : null };
      }
      default: return null;
    }
  }, [j, day, mats, via, closeAs, rt, dl, dlMs, rbMs, abMs, formNo, openMore, words, what, c.sendKind, c.queryOnly]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { onDraft(draft); }, [draft]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => onDraft(null), []); // eslint-disable-line react-hooks/exhaustive-deps

  function labelOf(m: StepMaterial): string {
    const vName = (id: string) => c.env.versions.find((v) => v.id === id)?.name ?? null;
    const o = { free: c.env.free, versionName: vName, originalId: c.env.versions[0]?.id ?? null };
    /* the same words the thread's chips use */
    return matLabelOf(m, o);
  }

  const save = async (p: ComposerSave) => { if (busy) return; await onSave(p); };
  const copy = (email: string, key: string) => {
    void navigator.clipboard?.writeText(email).then(() => { setCopied(key); window.setTimeout(() => setCopied(null), 1400); }, () => {});
  };

  let title = "", tall = false, body: React.ReactNode = null, foot: React.ReactNode = null;
  const cancel = <button type="button" className="qc1522-btn gh" data-qc1522="cancel" onClick={exit}>Cancel</button>;
  const primary = (label: string, p: ComposerSave | null, data = "save", disabled = false) => (
    <button type="button" className="qc1522-btn nv" data-qc1522={data} disabled={disabled || busy || !p} onClick={() => p && void save(p)}>{label}{ARW}</button>
  );
  const fl = (label: string, field: React.ReactNode, key: string) => <React.Fragment key={key}><label>{label}</label><div>{field}</div></React.Fragment>;

  switch (j) {
    case "send": {
      title = c.sendKind === "partial_sent" ? "Mark the partial sent" : c.sendKind === "resubmitted" ? "Mark the revision sent" : "Mark the full sent";
      const verOf = mats.find((m) => (m.kind === "sample" || m.kind === "full") && m.versionId)?.versionId ?? null;
      const vName = verOf ? c.env.versions.find((v) => v.id === verOf)?.name ?? null : null;
      body = <div className="qc1522-fl">
        {fl("When", <When id="send" v={day} nowMs={c.nowMs} floorMs={c.floorMs} onPick={(v) => { setDay(v); touch(); }} />, "w")}
        {fl("What went", <>
          <MatChips id="send" mats={mats} onChange={(m) => { setMats(m); touch(); }} env={c.env} stepMs={day} request={false} addLabel="+ Add" />
          {c.pro && vName ? <div className="qc1522-hint" data-qc1522="from-version">From {vName.toLowerCase()} · <button type="button" className="qc1522-lk" onClick={() => pop.setOpen(`mat:send:${mats.findIndex((m) => m.versionId === verOf)}`)}>change</button></div> : null}
        </>, "m")}
      </div>;
      foot = <>{cancel}<span className="sp" />{primary("Mark sent", { j: "send", dayMs: day, mats })}</>;
      break;
    }
    case "nudge": {
      title = `Nudge ${f}`;
      body = <>
        {c.email ? <>
          <p className="qc1522-sub" data-qc1522="nudge-lead">Send {f} a nudge, then log it here. It goes to <b>{c.email}</b>.</p>
          <p className="qc1522-acts">
            <button type="button" className="qc1522-lk" data-qc1522="copy-address" onClick={() => copy(c.email, "me")}>{copied === "me" ? "Copied ✓" : "Copy address"}</button>
            <a className="qc1522-lk" data-qc1522="open-mail" href={`mailto:${c.email}`}>Open in mail</a>
          </p>
        </> : <>
          <p className="qc1522-sub" data-qc1522="nudge-lead">Send {f} a nudge, then log it here.</p>
          <p className="qc1522-acts"><button type="button" className="qc1522-lk" data-qc1522="add-email" onClick={onAddEmail}>Add {f}’s email</button></p>
        </>}
        <div className="qc1522-fl">
          {fl("Sent by", <Seg data="sent-by" v={via} on={(k) => { setVia(k); touch(); }} opts={[["Email", "Email"], ["QueryManager", "QueryManager"], ["Other", "Other"]]} />, "v")}
          {fl("When", <When id="nudge" v={day} nowMs={c.nowMs} floorMs={c.floorMs} onPick={(v) => { setDay(v); touch(); }} />, "w")}
        </div>
      </>;
      foot = <>{cancel}<span className="sp" />{primary("Log the nudge", { j: "nudge", dayMs: day, via })}</>;
      break;
    }
    case "close": {
      title = `Close ${f}’s query`;
      body = <>
        {c.nudgedMs != null
          ? <p className="qc1522-sub" data-qc1522="close-nudged">You nudged {f} on {dm(c.nudgedMs)}, and there’s been no reply since.</p>
          : c.queryOnly ? <div className="qc1522-tip" data-qc1522="close-tip">{BULB}<div>You haven’t nudged {f}. One polite follow-up often gets a reply. <button type="button" className="qc1522-lk" data-qc1522="nudge-instead" onClick={() => go("nudge")}>Nudge instead</button></div></div>
          : null}
        <div className="qc1522-fl">
          {fl("Close it as", <Seg data="close-as" v={closeAs} on={(k) => { setCloseAs(k as "noresp" | "withdrawn"); touch(); }} opts={[["noresp", "No response"], ["withdrawn", "I withdrew it"]]} />, "a")}
          {fl("When", <When id="close" v={day} nowMs={c.nowMs} floorMs={c.floorMs} onPick={(v) => { setDay(v); touch(); }} />, "w")}
        </div>
      </>;
      foot = <>{cancel}<span className="sp" />{primary("Close it", { j: "close", dayMs: day, as: closeAs })}</>;
      break;
    }
    case "reply": {
      title = `What did ${f} say?`; tall = true;
      const fields: React.ReactNode[] = [];
      if (rt) {
        fields.push(fl("When", <When id="reply" v={day} nowMs={c.nowMs} floorMs={c.floorMs} onPick={(v) => { setDay(v); touch(); }} />, "w"));
        if (rt === "req") fields.push(fl("Their deadline", <>
          <Seg data="deadline" v={dl} on={(k) => { setDl(k as Deadline); touch(); }} opts={[["none", "None given"], ["2w", "2 weeks"], ["date", "A date"]]} />
          {dl === "date" ? <div className="qc1522-mt"><When id="dl" v={dlMs} nowMs={c.nowMs} floorMs={day} future onPick={(v) => { setDlMs(v); touch(); }} /></div> : null}
          <div className="qc1522-hint" data-qc1522="deadline-hint">{dl === "none" ? `We’ll remind you after ${f}’s usual: about ${c.remindDays >= 7 ? `${Math.round(c.remindDays / 7)} week${Math.round(c.remindDays / 7) === 1 ? "" : "s"}` : `${c.remindDays} days`}.` : dl === "2w" ? `Due ${dm(day + 14 * DAY)}` : ""}</div>
        </>, "d"));
        if (rt === "passed") {
          fields.push(fl("What kind of no", <Seg data="pass-kind" v={formNo ? "form" : "personal"} on={(k) => { setFormNo(k === "form"); touch(); }} opts={[["form", "Form"], ["personal", "Personal"]]} />, "k"));
          fields.push(<React.Fragment key="c"><label /><div className="qc1522-chks">
            <label className="qc1522-chk"><input type="checkbox" data-qc1522="open-to-more" checked={openMore} onChange={(e) => { setOpenMore(e.target.checked); touch(); }} /> Open to seeing more work</label>
            <label className="qc1522-chk"><input type="checkbox" data-qc1522="wall" checked={wall} onChange={(e) => { setWall(e.target.checked); touch(); }} /> Add to my Wall of no</label>
          </div></React.Fragment>);
        }
        if (rt === "rr") fields.push(fl("Resubmit by", <>
          {rbMs != null ? <When id="rb" v={rbMs} nowMs={c.nowMs} floorMs={day} future onPick={(v) => { setRbMs(v); touch(); }} />
            : <button type="button" className="qc1522-pill" data-qc1522="resubmit-by" onClick={() => { setRbMs(today + 30 * DAY); touch(); }}>Pick a date</button>}
          <div className="qc1522-hint">Optional. Leave it empty if there’s no deadline.</div>
        </>, "rb"));
        if (rt === "offer") fields.push(fl("Answer by", <When id="ab" v={abMs} nowMs={c.nowMs} floorMs={day} future onPick={(v) => { setAbMs(v); touch(); }} />, "ab"));
        if (rt === "more") fields.push(fl("What they asked for", <input type="text" className="qc1522-in" data-qc1522="what" maxLength={80} value={what} placeholder="e.g. A synopsis, the next 50 pages, a call" onChange={(e) => { setWhat(e.target.value); touch(); }} />, "wh"));
        fields.push(fl("Their words", <textarea className="qc1522-ta" data-qc1522="their-words" maxLength={500} value={words} placeholder={`Paste ${f}’s reply, or the line that matters. Optional.`} onChange={(e) => { setWords(e.target.value); touch(); }} />, "q"));
      }
      body = <>
        <div className="qc1522-seg qc1522-rts" data-qc1522="reply-types">
          {REPLIES.map((r) => (
            <button key={r.k} type="button" className={rt === r.k ? "on" : ""} data-v={r.k} onClick={() => { setRt(r.k); touch(); }}>
              <span className="g" aria-hidden="true">{StepGlyph({ status: r.k === "req" && c.queryOnly ? QueryStatus.PARTIAL_REQUESTED : r.status, kind: null })}</span>{r.label(c.queryOnly)}
            </button>
          ))}
        </div>
        {rt ? <div className="qc1522-fl">{fields}</div> : null}
      </>;
      const label = rt === "passed" ? "Close as passed" : rt === "offer" ? "Add the offer" : `Add ${f}’s reply`;
      const p: ComposerSave | null = rt && !(rt === "more" && !what.trim())
        ? { j: "reply", dayMs: day, rt, deadline: dl, deadlineMs: dl === "2w" ? day + 14 * DAY : dl === "date" ? dlMs : null, formNo, openToMore: openMore, wall, resubmitByMs: rbMs, answerByMs: rt === "offer" ? abMs : null, what: what.trim(), words: words.trim() }
        : null;
      foot = <>{cancel}<span className="sp" />{primary(label, p)}</>;
      break;
    }
    case "reopen": {
      title = `Reopen ${f}’s query`;
      body = <>
        <p className="qc1522-sub">What happened?</p>
        <div className="qc1522-big" data-qc1522="reopen-why">
          <button type="button" data-v="mistake" onClick={() => go("unpass")}><span className="g">{PEN}</span><div><b>The pass was recorded by mistake</b><span>Takes it off. Nothing new goes on the thread.</span></div><span className="ar">→</span></button>
          <button type="button" data-v="back" onClick={() => { go("reply"); setRt("rr"); }}><span className="g">{StepGlyph({ status: QueryStatus.REVISE_RESUBMIT, kind: null })}</span><div><b>{f} got back in touch</b><span>Record what {f} said, dated today.</span></div><span className="ar">→</span></button>
        </div>
      </>;
      foot = cancel;
      break;
    }
    case "unpass": {
      title = "Take the pass off?";
      body = <p className="qc1522-sub ink" data-qc1522="unpass-text">The pass{c.passMs != null ? ` on ${dm(c.passMs)}` : ""} comes off. {f}’s card goes back to waiting on a reply to {c.passedAfter}, now expected by {dm(c.restartToMs)}.</p>;
      foot = <>{cancel}<span className="sp" />{primary("Take it off", { j: "unpass" })}</>;
      break;
    }
    case "offer": {
      title = `${f}’s offer`; tall = true;
      body = <>
        <div className="qc1522-sumo" data-qc1522="offer-summary">
          <span className="g">{StepGlyph({ status: QueryStatus.OFFER, kind: null })}</span>
          <div><b>Offer from {c.fullName}</b><span>{[c.offerFromMs != null ? dm(c.offerFromMs) : null, c.offerByMs != null ? `wants an answer by ${dm(c.offerByMs)}` : null].filter(Boolean).join(" · ")}</span></div>
          <button type="button" className="qc1522-lk" data-qc1522="offer-edit" onClick={onEditOffer}>Edit</button>
        </div>
        <p className="qc1522-sub">What are you doing?</p>
        <div className="qc1522-big" data-qc1522="offer-choices">
          <button type="button" data-v="time" onClick={() => go("tell")}><span className="g">{CLOCK}</span><div><b>Taking time to decide</b><span>Tell the other agents you have an offer{c.offerByMs != null ? `, and give them until ${dm(c.offerByMs)}` : ""}.</span></div><span className="ar">→</span></button>
          <button type="button" data-v="accept" onClick={() => go("accept")}><span className="g">{StepGlyph({ status: QueryStatus.SIGNED, kind: null })}</span><div><b>Accepting</b><span>Close everything else as withdrawn.</span></div><span className="ar">→</span></button>
          <button type="button" data-v="decline" onClick={() => go("decline")}><span className="g">{StepGlyph({ status: QueryStatus.REJECTED, kind: null })}</span><div><b>Declining</b><span>Close this one. Everything else carries on.</span></div><span className="ar">→</span></button>
        </div>
      </>;
      foot = cancel;
      break;
    }
    case "tell": {
      title = "Tell the other agents"; tall = true;
      const nt = c.others.filter((o) => told[o.id]).length;
      const groups = [["pages", "With your pages"], ["query", "Your query"]] as const;
      body = <>
        <p className="qc1522-sub" data-qc1522="tell-lead">Let each agent know you have an offer{c.offerByMs != null ? ` and need an answer by ${dm(c.offerByMs)}` : ""}. Tick them off as you go, or leave the rest for later.</p>
        <div className="qc1522-ag" data-qc1522="tell-list">
          {groups.map(([g, gl]) => {
            const rows = c.others.filter((o) => o.group === g);
            if (!rows.length) return null;
            return <React.Fragment key={g}>
              <div className="grp">{gl}</div>
              {rows.map((o) => (
                <div key={o.id} className="row" data-qc1522="tell-row" data-id={o.id}>
                  <span className="av" aria-hidden="true">{o.initials}</span>
                  <div className="nm"><b>{o.name}</b><span>{o.stage}</span></div>
                  {o.email ? <button type="button" className="qc1522-lk" data-qc1522="tell-copy" onClick={() => copy(o.email, o.id)}>{copied === o.id ? "Copied ✓" : "Copy address"}</button> : null}
                  <button type="button" className={`tk${told[o.id] ? " on" : ""}`} data-qc1522="told" aria-pressed={!!told[o.id]} onClick={() => { setTold((t) => ({ ...t, [o.id]: !t[o.id] })); touch(); }}>{told[o.id] ? "✓ Told" : "Told"}</button>
                </div>
              ))}
            </React.Fragment>;
          })}
        </div>
        {c.others.length ? <button type="button" className="qc1522-lk" data-qc1522="mark-all" onClick={() => { setTold(Object.fromEntries(c.others.map((o) => [o.id, true]))); touch(); }}>Mark all told</button> : null}
      </>;
      const newly = c.others.filter((o) => told[o.id] && !o.told).length;
      foot = <>
        <span className="qc1522-hint" data-qc1522="told-count">{nt} of {c.others.length} told</span><span className="sp" />
        <button type="button" className="qc1522-btn gh" data-qc1522="later" disabled={busy} onClick={() => void save({ j: "tell", told, later: true })}>{newly || nt ? "Do the rest later" : "Do it later"}</button>
        {primary("Done", { j: "tell", told, later: false }, "done", nt < c.others.length)}
      </>;
      break;
    }
    case "accept": {
      title = `Accept ${f}’s offer`;
      body = <>
        <p className="qc1522-sub ink" data-qc1522="accept-text">Congratulations. {c.openOthers} other {c.openOthers === 1 ? "query is" : "queries are"} still open, and accepting closes them as withdrawn.{c.withPages ? ` ${spell(c.withPages)} ${c.withPages === 1 ? "agent has" : "agents have"} your pages, so you’ll want to let them know.` : ""}</p>
        {c.openOthers ? <label className="qc1522-chk"><input type="checkbox" data-qc1522="close-others" checked={closeOthers} onChange={(e) => { setCloseOthers(e.target.checked); touch(); }} /> Close the {c.openOthers} others as withdrawn</label> : null}
        {c.withPages ? <label className="qc1522-chk"><input type="checkbox" data-qc1522="accept-todo" checked={todo} onChange={(e) => { setTodo(e.target.checked); touch(); }} /> Add a to-do: tell the {c.withPages} {c.withPages === 1 ? "agent" : "agents"} with your pages</label> : null}
      </>;
      foot = <>{cancel}<span className="sp" />{primary("Accept the offer", { j: "accept", closeOthers, todo })}</>;
      break;
    }
    case "decline": {
      title = `Decline ${f}’s offer`;
      body = <div className="qc1522-fl">{fl("A note for you", <textarea className="qc1522-ta" data-qc1522="decline-note" maxLength={500} value={note} placeholder="Only you see this." onChange={(e) => { setNote(e.target.value); touch(); }} />, "n")}</div>;
      foot = <>{cancel}<span className="sp" />{primary("Decline it", { j: "decline", note: note.trim() })}</>;
      break;
    }
  }

  return (
    <div className={`qc1522-cp${tall ? " tall" : ""}`} data-qc1522="composer" data-j={j} role="group" aria-label={title}>
      <div className="qc1522-ch">
        {back ? <button type="button" className="qc1522-bk" data-qc1522="back" onClick={() => up(() => go(back))}>← Back</button> : null}
        <h3 data-qc1522="composer-title">{title}</h3>
        <button type="button" className="qc1522-x" data-qc1522="composer-x" aria-label="Close" onClick={exit}>✕</button>
      </div>
      <div className="qc1522-cb">{body}</div>
      {conf ? (
        <div className="qc1522-conf" data-qc1522="discard-strip">
          <span>Discard what you’ve entered?</span><span className="sp" />
          <button type="button" className="qc1522-lk" data-qc1522="keep" onClick={() => setConf(false)}>Keep editing</button>
          <button type="button" className="qc1522-btn nv sm" data-qc1522="discard" onClick={() => { setConf(false); setDirty(false); onClose(); }}>Discard</button>
        </div>
      ) : <div className="qc1522-cf">{foot}</div>}
    </div>
  );
};

const SPELL = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
const spell = (n: number) => SPELL[n] ?? String(n);
